// W8：町の特色の場所（王国・帝国・人類の最前線・人と魔の境の町）。酒場や店のほかに、その町でしかできないことを一つ（大きな都は二つまで）。
// 場所のデータは src/data/w8s_spots_*.js の D.W8S_SPOTS（施設の鍵 → 場所）。ここは、それを町の施設として出して動かす仕組みだけ。
// explore.js・explore_w2.js は書き換えず、G.exploreActions・G.exploreAct・G.facActions・G.facAct を包む（explore_w2.js と同じやり方）。
// 町の fac には、ここで鍵を足す（D.LOCS[town].fac.push）。状態で現れる選択肢は、行いの on（C10 の状態の種類）か、D.C10_FAC[鍵]（「あなたなら」の欄）で。
//
// 場所：{ town, name, kw, sub?, enter: [入ったときの文], acts: [行い] }
//   inFac: "castle" なら、新しい施設にはせず、その町のその施設（王城など）の中に「name」の欄として行いを足す（王都・帝都の王宮）
// 行い：{ id, label, sub?, on?（C10 の状態。満たさなければ出さない）, also?(S)（ほかの条件。満たさなければ出さない）, need?（持ち物）,
//        time?: [時間帯 0朝 1昼 2夕 3夜], once?（一度きり）, cd?（次にできるまでの日数）, ev?（一度きりの出来事 id。済んだら出さない）,
//        cost?, stat?, diff?, pass?（過ぎる時間帯。既定 1。0 で過ぎない）, days?（過ぎる日数）, ok, ng?（stat があるとき。無ければ ok だけ） }
//   ok / ng は出来事の結果と同じ書き方（G.apply）。関数なら S を受け取って結果を返す。足した項目：rep（その国の評判 +n）
// 稼ぎの場にしない：金や物が出る行いは once か cd か危険（戦い・悪名・判定の失敗）を必ず付ける（tests/checks/w8s_spots.mjs が確かめる）。
// セーブに足す項目（古いセーブで無くても動く）：S.w8s = { once: { 鍵:行い: 日 }, cd: { 鍵:行い: 次にできる日 } }
// レーン W（ワールド）と F（施設）が管理
(function (G) {
  const D = G.data;
  const SP = (D.W8S_SPOTS = D.W8S_SPOTS || {});
  const W = (G.w8s = G.w8s || {});
  const PHASE = ["朝", "昼", "夕方", "夜"];

  // ---------------------------------------------------------------- 町に足す（データのファイルはこのファイルより先に読まれる）
  W.install = () => {
    Object.entries(SP).forEach(([key, s]) => {
      if (s.inFac) return;
      G.FAC_NAMES[key] = s.name;
      const L = D.LOCS[s.town];
      if (L && L.fac && !L.fac.includes(key)) L.fac.push(key);
    });
  };
  W.install();

  W.st = (S) => {
    S = S || G.S;
    const w = (S.w8s = S.w8s || {});
    w.once = w.once || {};
    w.cd = w.cd || {};
    return w;
  };
  const C10 = () => G.c10 || null;
  const stateOk = (S, on) => {
    if (!on) return true;
    const c = C10();
    if (!c || !c.state) return false;
    const ons = Array.isArray(on) ? on : [on];
    return ons.some((k) => { const s = c.state(k); return s && s.cond(S); });
  };
  const tagOf = (on) => {
    const c = C10();
    const k = Array.isArray(on) ? on[0] : on;
    const s = c && c.state && c.state(k);
    return s ? s.tag : "";
  };
  const fillN = (s, on) => {
    const c = C10();
    const k = Array.isArray(on) ? on.find((x) => /^comp:/.test(x)) : on;
    return c && c.fillN ? c.fillN(s, k) : s;
  };

  // 今ここで見せる行いか（出すかどうか。押せるかどうかは別）
  W.visible = (key, a, S) => {
    S = S || G.S;
    const w = W.st(S);
    if (a.ev && S.flags && S.flags["ev:" + a.ev]) return false;
    if (a.once && a.hideDone && w.once[key + ":" + a.id] != null) return false;
    if (!stateOk(S, a.on)) return false;
    if (a.also && !a.also(S)) return false;
    if (a.need && !(C10() ? C10().item(S, a.need) : (S.inv || {})[a.need] > 0)) return false;
    return true;
  };
  // 押せない理由（無ければ ""）
  W.blocked = (key, a, S) => {
    S = S || G.S;
    const w = W.st(S);
    if (a.once && w.once[key + ":" + a.id] != null) return "もう済んだ";
    const next = w.cd[key + ":" + a.id];
    if (next != null && S.day < next) return next - S.day === 1 ? "明日になれば" : `あと${next - S.day}日`;
    if (a.time && !a.time.includes(S.phase)) return a.time.map((p) => PHASE[p]).join("か") + "に";
    if (a.cost && S.gold < a.cost) return `${a.cost}G 要る`;
    return "";
  };
  W.actsOf = (key, S) => {
    const s = SP[key];
    return s ? s.acts.filter((a) => W.visible(key, a, S)) : [];
  };

  // ---------------------------------------------------------------- 町の施設の一覧（名前の下の添え書きと、言葉の手がかり）
  const baseExploreActions = G.exploreActions;
  G.exploreActions = () => {
    const groups = baseExploreActions();
    groups.forEach((g) => (g.list || []).forEach((a) => {
      const k = typeof a.id === "string" && a.id.startsWith("fac:") && a.id.slice(4);
      const s = k && SP[k];
      if (!s) return;
      a.kw = s.kw || [s.name];
      a.sub = s.sub || "この町だけ";
      a.w8s = true;
    }));
    return groups;
  };

  // ---------------------------------------------------------------- 入る
  const baseExploreAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const s = head === "fac" && SP[arg];
    if (!s || s.inFac) return baseExploreAct(head, arg, a);
    const S = G.S;
    if (s.town !== S.loc) return;
    S.mode = "fac";
    S.fac = arg;
    G.log("you", `${s.name}へ行く`);
    const lines = typeof s.enter === "function" ? s.enter(S) : s.enter;
    G.say(Array.isArray(lines) ? G.pick(lines) : lines);
    if (s.lore && G.openLores) G.openLores(s.lore);
  };

  // ---------------------------------------------------------------- 中でできること
  const baseFacActions = G.facActions;
  W.listOf = (key, S) => W.actsOf(key, S).map((a) => {
      const why = W.blocked(key, a, S);
      const sub = [];
      if (a.on) sub.push(tagOf(a.on));
      if (a.sub) sub.push(a.sub);
      if (a.stat) sub.push(`${a.stat} ${G.chance(a.stat, a.diff || "普通")}%`);
      if (a.cost) sub.push(`${a.cost}G`);
      if (a.days) sub.push(`${a.days}日`);
      if (a.once && !why) sub.push("一度きり");
      if (why) sub.push(why);
      return { id: `w8s:${key}:${a.id}`, label: fillN(a.label, a.on), sub: sub.filter(Boolean).join("・"), disabled: !!why, kw: a.kw || [a.label.slice(0, 4)], c10: a.on ? [].concat(a.on)[0] : undefined };
  });
  // 施設の中に足す欄（inFac）
  W.extrasOf = (S) => Object.keys(SP).filter((k) => SP[k].inFac && SP[k].inFac === S.fac && SP[k].town === S.loc);
  G.facActions = () => {
    const S = G.S;
    const key = S.fac;
    const s = SP[key];
    if (!s || s.inFac) {
      const g = baseFacActions();
      W.extrasOf(S).forEach((k) => {
        const list = W.listOf(k, S);
        if (list.length) g.splice(Math.max(0, g.length - 1), 0, { title: SP[k].name, list });
      });
      return g;
    }
    const list = W.listOf(key, S);
    return [
      { title: s.name, list: list.length ? list : [{ id: "w8s:none", label: "今は何もない", sub: "", disabled: true }] },
      { title: "", list: [{ id: "back", label: `${s.name}を出る`, sub: "", kw: ["出る", "戻", "外"] }] },
    ];
  };

  const baseFacAct = G.facAct;
  G.facAct = (head, arg, x) => {
    if (head !== "w8s") return baseFacAct(head, arg, x);
    const S = G.S;
    const i = String(arg).lastIndexOf(":");
    const key = String(arg).slice(0, i), id = String(arg).slice(i + 1);
    const s = SP[key];
    const a = s && s.acts.find((y) => y.id === id);
    if (!a || S.fac !== (s && s.inFac ? s.inFac : key) || s.town !== S.loc || !W.visible(key, a, S) || W.blocked(key, a, S)) return;
    W.run(key, a);
  };

  W.run = (key, a) => {
    const S = G.S;
    const w = W.st(S);
    const k = key + ":" + a.id;
    if (a.cost) { S.gold -= a.cost; G.note(`所持金 -${a.cost}G`); }
    if (a.once) w.once[k] = S.day;
    if (a.cd) w.cd[k] = S.day + a.cd;
    G.log("you", fillN(a.label, a.on));
    let o = a.ok;
    if (a.stat) o = G.check(a.stat, a.diff || "普通", fillN(a.label, a.on)).ok ? a.ok : a.ng;
    if (typeof o === "function") o = o(S);
    if (o && o.text) o = { ...o, text: fillN(o.text, a.on) };
    if (a.days) G.passDays(a.days);
    else if (a.pass !== 0 && !(o && o.days)) G.pass(a.pass || 1);
    const rep = o && o.rep;
    G.apply(o);
    if (rep && !S.over) {
      const n = G.nationOf && G.nationOf();
      if (n) { const r = G.repOf(n); r.rep = Math.max(0, (r.rep || 0) + rep); G.note(`${n}での評判 ${G.sign(rep)}`); }
    }
  };
})(globalThis.G = globalThis.G || {});
