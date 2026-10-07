// W9：町の特色の場所（大聖堂の奥・写字室・島の道場・真珠の入り江など）。宿・酒場・店のほかに、その町でしかできないことを一つ（大きな都は二つまで）。
// 担当：エルメシア共和国・光天教会領・シェルアークの町。中身は src/data/w9_spots_*.js の D.W9_SPOTS に書く。
// explore.js・explore_w2.js は書き換えず、G.exploreActions・G.exploreAct・G.facActions・G.facAct を包む（explore_w2.js と同じやり方）。
// 町の施設の一覧（L.fac）へは、ここで D.W9_SPOTS の town に足す。施設の名前は G.FAC_NAMES、背景の絵の名前は D.FAC_SCENE（src/ui/w9_spots.js が使う）
//
// D.W9_SPOTS = { 施設の id（w9_ で始める）: {
//   town 町の id, name 施設の名前（町の画面のボタン）, kw 言葉, scene 背景の絵（室内の絵の名前か、"@town" で町の外の景色）,
//   enter [入ったときの文（一つを選ぶ）], title 行いの組の見出し（無ければ name）, acts [行い] } }
// 行い（acts）：{ id, label, sub（添え書き）,
//   見せる条件：on（C10 の状態。"famous"・"cls:priest"・"comp:heal"・"item:lute" など。添え書きに状態の名が出る）, when(S), phase [時間帯 0朝 1昼 2夕 3夜],
//              after 先に済ませておく行いの id（一度きりの行いの続き）, need 持っていないと出ない物
//   押せる条件：cost 金（払う）, take 渡す物（{ id: 数 } か id）, every 何日に一度か（既定 1 ＝一日に一度）, once 一度きり（済んだら出ない）
//   かかる時間：time 時間帯の数（既定 1）・days 日数
//   結果：stat・diff・bonus の判定で ok / ng（無ければ ok）。crit 大成功のときの結果。結果は出来事の結果と同じ書き方（G.apply）。
//         配列なら一つを選ぶ。関数なら (S, r) で結果を返す。ほかに lore（用語を開く）・rep（この国の評判 ±）・mark（ほかの行いを済んだことにする） }
// 稼ぎの場にしない：金や物が手に入る行いは、once か every 5 日以上（tests/checks/w9_spots.mjs が確かめる）。買い物（buy: true）は値段が物の値の八割以上
// セーブに足すもの：S.w9 = { once: { "施設:行い": 日 }, last: { "施設:行い": 日 } }。古いセーブに無くても動く（W9.st が作る）
// 乱数は G.rand / G.pick だけ。レーン W＋F（W9）
(function (G) {
  const D = G.data;
  const W9 = (G.w9 = G.w9 || {});
  W9.BASE = ["inn", "tavern", "shop", "guild", "church", "train", "alley", "castle"];
  const spots = () => D.W9_SPOTS || {};
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const TIME = ["", "ひととき", "半日", "半日あまり", "一日"];

  W9.st = (S) => {
    S = S || G.S;
    const w = (S.w9 = S.w9 || {});
    w.once = w.once || {};
    w.last = w.last || {};
    return w;
  };
  W9.key = (f, a) => `${f}:${a.id}`;
  // 仲間の行い（on: "comp:*"）の "{n}" を、今いる仲間の呼び名に
  const fill = (s, on) => (G.c10 && G.c10.fillN ? G.c10.fillN(s, on) : s);

  // ---------------------------------------------------------------- 町に置く
  W9.install = () => {
    D.FAC_SCENE = D.FAC_SCENE || {};
    Object.entries(spots()).forEach(([id, sp]) => {
      const L = D.LOCS[sp.town];
      if (!L) return;
      G.FAC_NAMES[id] = sp.name;
      L.fac = L.fac || [];
      if (!L.fac.includes(id)) L.fac.push(id);
      D.FAC_SCENE[id] = sp.scene === "@town" ? L.scene : sp.scene || "church";
    });
  };
  W9.install();

  // ---------------------------------------------------------------- 行いの見え方
  const takeOf = (a) => (a.take == null ? {} : typeof a.take === "string" ? { [a.take]: 1 } : a.take);
  W9.shown = (f, a, S) => {
    S = S || G.S;
    const w = W9.st(S);
    if (a.once && w.once[W9.key(f, a)] != null) return false;
    if (a.after && w.once[`${f}:${a.after}`] == null) return false;
    if (a.on) { const s = G.c10 && G.c10.state(a.on); if (!s || !s.cond(S)) return false; }
    if (a.phase && !as(a.phase).includes(S.phase)) return false;
    if (a.need && !(S.inv[a.need] > 0)) return false;
    if (a.when && !a.when(S)) return false;
    return true;
  };
  W9.wait = (f, a, S) => {
    S = S || G.S;
    const last = W9.st(S).last[W9.key(f, a)];
    if (last == null) return 0;
    return Math.max(0, last + (a.every || 1) - S.day);
  };
  W9.blocked = (f, a, S) => {
    S = S || G.S;
    if (W9.wait(f, a, S) > 0) return true;
    if (a.cost && S.gold < a.cost) return true;
    return Object.entries(takeOf(a)).some(([id, n]) => (S.inv[id] || 0) < n);
  };
  function subOf(f, a) {
    const S = G.S;
    const out = [];
    if (a.on) { const s = G.c10 && G.c10.state(a.on); if (s) out.push(s.tag); }
    if (a.stat) out.push(`${a.stat} ${G.chance(a.stat, a.diff || "普通", a.bonus ? G.gearBonus(a.bonus) : 0)}%`);
    if (a.cost) out.push(`${a.cost}G`);
    Object.entries(takeOf(a)).forEach(([id, n]) => out.push(`${G.itemInfo ? G.itemInfo(id).name : D.ITEMS[id].name}${n > 1 ? "×" + n : ""}を渡す`));
    if (a.days) out.push(`${a.days}日`);
    else if ((a.time == null ? 1 : a.time) > 1) out.push(TIME[Math.min(4, a.time)]);
    if (a.sub) out.push(a.sub);
    const wt = W9.wait(f, a, S);
    if (wt > 0) out.push(wt === 1 && (a.every || 1) === 1 ? "今日はもうした" : `あと${wt}日`);
    return out.join("・");
  }

  // ---------------------------------------------------------------- 町の施設の一覧（名前と添え書き）
  const actions0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = actions0();
    groups.forEach((g) => (g.list || []).forEach((a) => {
      const f = a.id && a.id.startsWith("fac:") && a.id.slice(4);
      const sp = f && spots()[f];
      if (sp) { a.label = sp.name; a.kw = [sp.name, ...(sp.kw || [])]; a.sub = sp.sub || ""; a.w9 = true; }
    }));
    return groups;
  };

  // ---------------------------------------------------------------- 入る
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const sp = head === "fac" && spots()[arg];
    if (!sp) return act0(head, arg, a);
    const S = G.S;
    S.mode = "fac";
    S.fac = arg;
    G.log("you", `${sp.name}に入る`);
    const t = typeof sp.enter === "function" ? sp.enter(S) : G.pick(as(sp.enter));
    if (t) G.say(t);
    if (sp.lore && G.openLores) G.openLores(sp.lore, true);
  };

  // ---------------------------------------------------------------- 中の行い
  const facActions0 = G.facActions;
  G.facActions = () => {
    const S = G.S;
    const f = S.fac;
    const sp = spots()[f];
    if (!sp) return facActions0();
    const list = sp.acts.filter((a) => W9.shown(f, a, S)).map((a) => ({
      id: `w9:${f}:${a.id}`, label: fill(a.label, a.on), sub: subOf(f, a), disabled: W9.blocked(f, a, S),
      kw: [fill(a.label, a.on), ...(a.kw || [])], ...(a.on ? { c10: a.on } : {}),
    }));
    const back = { title: "", list: [{ id: "back", label: `${sp.name}を出る`, sub: "", kw: ["出る", "戻", "外"] }] };
    return list.length ? [{ title: sp.title || sp.name, list }, back] : [back];
  };

  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    if (head !== "w9") return facAct0(head, arg, a);
    const i = String(arg).indexOf(":");
    W9.run(arg.slice(0, i), arg.slice(i + 1));
  };

  W9.run = (f, id) => {
    const S = G.S;
    const sp = spots()[f];
    const a = sp && sp.acts.find((x) => x.id === id);
    if (!a || S.fac !== f || !W9.shown(f, a, S) || W9.blocked(f, a, S)) return;
    const w = W9.st(S);
    const key = W9.key(f, a);
    if (a.cost) { S.gold -= a.cost; G.note(`所持金 -${a.cost}G`); }
    Object.entries(takeOf(a)).forEach(([it, n]) => { G.take(it, n); G.note(`${G.itemInfo ? G.itemInfo(it).name : it}${n > 1 ? " ×" + n : ""}を渡した。`); });
    w.last[key] = S.day;
    if (a.once) w.once[key] = S.day;
    G.log("you", fill(a.label, a.on));
    if (a.days) G.passDays(a.days);
    else if ((a.time == null ? 1 : a.time) > 0) G.pass(a.time == null ? 1 : a.time);
    let r = null;
    let o = a.ok;
    if (a.stat) {
      r = G.check(a.stat, a.diff || "普通", a.label, a.bonus ? G.gearBonus(a.bonus) : 0);
      o = r.crit && a.crit ? a.crit : r.ok ? a.ok : a.ng;
    }
    if (typeof o === "function") o = o(S, r);
    if (Array.isArray(o)) o = G.pick(o);
    if (o && o.text && a.on) o = { ...o, text: fill(o.text, a.on) };
    W9.apply(o, f);
  };

  // 結果（G.apply に、用語・評判・ほかの行いの済みを足したもの）
  W9.apply = (o, f) => {
    const S = G.S;
    if (!o || S.over) return;
    const w = W9.st(S);
    as(o.mark).forEach((id) => { w.once[`${f}:${id}`] = S.day; });
    if (o.rep && G.nationOf && G.repOf) {
      const n = G.nationOf();
      if (n) { const r = G.repOf(n); r.rep = (r.rep || 0) + o.rep; G.note(`${n}での評判 ${G.sign(o.rep)}`); }
    }
    const fight = o.fight;
    G.apply(fight ? { ...o, fight: null } : o);
    if (S.over) return;
    if (o.lore && G.openLores) G.openLores(o.lore);
    if (fight) G.startCombat(G.resolveFoes(fight), { win: o.win });
  };
})(globalThis.G = globalThis.G || {});
