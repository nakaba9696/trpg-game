// L1：覚え書きと記録（周回の知識）。死んで覚えるのはプレイヤー。ゲームは、見たこと・起きたことを冒険をまたいで記録し（G.P。死んでも消えない）、図鑑と墓碑で読めるようにする。
// 仕組みの上での引き継ぎ（能力・知識による補正）はしない。覚えていても成功率は変わらず、選択肢も増えない。そのかわり世界の決まりは周回でぶれない
//   （罠は毎回同じ階の同じ場所・同じ前触れ・同じ並びの選択肢。敵の強さと弱点はデータのまま。出来事の選択肢の結果もデータのまま）。
// DOM には触らない（画面は ui/zk_know_l1.js）。名前の頭の zzz は、zz_e3_apostles.js・zz_f2_codex.js（G.codexKill・G.codexFoeStats）より後に読ませて包むため。
//
// 覚え書きの表 D.KNOW = { id: { kind, title, text, ... } }（src/data/know_l1*.js）。text は手帳の書きつけ（答えをそのまま書かない）
//   foe     魔物の癖と弱点    foe 敵の id / aim その書きつけが言っている弱点（blade 刃・magic 術・talk 脅し・flee 足が遅い・habit 癖だけ）。
//                             効き目は無い。データと食い違わないことをテスト（tests/checks/l1_know.mjs）が確かめる
//   trap    迷宮の罠と隠し部屋 loc 迷宮 / floor 階 / sign 前触れ / safe 正しい手 / wrong 誘う手 / stat・diff 調べる判定 / dmg / spring かかった文 /
//                             dodge 調べて気づいた文 / avoid 正しい手の結果 / find 隠し部屋。その冒険で初めてその階に着くと、出来事（kn_trap_<loc>_<floor>）として起きる
//   apostle 使徒の守りの綻び  ap 使徒の id（D.E3.LIST）。戦ったときに見たことの書きつけ
//   fact    魔物について分かったこと  E4 が敵のデータに置く e.know = [{ id, text }]（データから分かる弱点・行動・出る時など）を fact_<敵>_<id> にする。
//                             その魔物を倒すたびに一つずつ（データの順に）分かる。死に際・噂・仲間の話でも分かる
//   敵のデータに know: { aim, text }（配列でなく一つ）を書くと foe_<敵の id> の癖の書きつけになる（docs/know.md）
// 覚え書きが残るきっかけ（how）：fail しくじった / seen 見た・戦い慣れた / death 死に際に / rumor 噂で / ally 仲間に聞いた
//   死んだときは、死に際に覚えたことを必ず一つ残す（その場の敵・使徒・罠 → その場所に関わること → まだ知らないどれか）。
//
// 記録（profile、冒険をまたぐ。古い profile には無い＝何も記録していない）：
//   G.P.know  = { id: { how, by, date, at } }                          覚え書き
//   G.P.kev   = { 出来事: { 選択肢の番号: { n, ok, ng, fight, dead } } }   出来事でどれを選んで何が起きたか（W4 などの新しい出来事も自動で載る）
//   G.P.kfoe  = { 敵: { a: { 手: [試した, 通った] }, wall, dealt, taken, slew } }  戦って分かったこと（効いた手・効かなかった手・あなたを倒した回数）
//   G.P.kshop = { 町: { items: { id: 値段 }, date } }                    店の品と値段
// 墓碑（G.P.graves）に足すもの：know [{ id, how, death }]・last 最期の様子 { cause, where, depth, event, foes [{ name, hp, max }], round, hp, maxHp, conds, lines [] }
// セーブ（G.S）に足すもの：S.kn = { learned [{ id, how, turn, death }], sprung { "迷宮:階": 1 }, rumor, allyDay, ev { id, i, turn, fight }, last }（無ければ作る）
// レーン C＋F（L1）
(function (G) {
  const D = G.data;
  const L1 = (G.l1 = G.l1 || {});
  D.KNOW = D.KNOW || {};

  L1.KINDS = [
    { key: "fact", name: "魔物について分かったこと" },
    { key: "foe", name: "魔物の癖と弱点" },
    { key: "trap", name: "迷宮の罠と隠し部屋" },
    { key: "apostle", name: "使徒の守りの綻び" },
  ];
  L1.HOW = { fail: "しくじって", seen: "見て", death: "死に際に", rumor: "噂で", ally: "仲間に聞いて" };
  L1.ACTS = { attack: "攻撃", vital: "急所", fire: "炎", ice: "氷", bolt: "雷", curse: "呪い", talk: "威圧", flee: "逃走", e3flee: "背を向けて逃げる" };

  // 文字列から決まる数（乱数を使わずに、周回で同じ並びにする）
  const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619) >>> 0; } return x; };

  // ---------------------------------------------------------------- 表を整える
  let built = false;
  L1.build = () => {
    if (built) return D.KNOW;
    built = true;
    Object.entries(D.ENEMIES || {}).forEach(([id, e]) => {
      if (!e || !e.know) return;
      // E4：データから分かること e.know = [{ id, text }] は、魔物ごとに一つずつ分かっていく（fact_<敵>_<id>）
      if (Array.isArray(e.know)) e.know.forEach((x, n) => {
        const k = `fact_${id}_${x.id}`;
        if (x && x.id && x.text && !D.KNOW[k]) D.KNOW[k] = { kind: "fact", foe: id, n, title: e.name, text: `${e.name}：${x.text}` };
      });
      else if (!D.KNOW["foe_" + id]) D.KNOW["foe_" + id] = Object.assign({ kind: "foe", foe: id, title: e.name }, e.know);
    });
    Object.values(D.KNOW).forEach((k) => {
      if (k.kind === "foe" && !k.title) k.title = ((D.ENEMIES || {})[k.foe] || {}).name || k.foe;
      if (k.kind === "trap" && !k.title) k.title = `${((D.LOCS || {})[k.loc] || {}).name || k.loc} 地下${k.floor}階`;
      if (k.kind === "apostle" && !k.title) k.title = "ある使徒";
    });
    return D.KNOW;
  };
  L1.ids = (kind) => Object.keys(L1.build()).filter((id) => !kind || D.KNOW[id].kind === kind);

  // ---------------------------------------------------------------- 迷宮の罠を出来事にする（読み込んだときに一度。データの整合も通る）
  L1.trapEventId = (id) => "kn_" + id;
  L1.trapAvg = (k) => { const d = k.dmg || [1, 6, 1]; return Math.round((d[0] * (d[1] + 1)) / 2 + (d[2] || 0)); };
  L1.makeTrapEvents = () => {
    L1.ids("trap").forEach((id) => {
      const k = D.KNOW[id];
      const evId = L1.trapEventId(id);
      if (!k.sign || (D.EVENTS || []).some((e) => e.id === evId)) return;
      const hurt = -L1.trapAvg(k);
      const choices = [
        { label: k.safe, ok: Object.assign({ text: k.avoid }, k.find || {}) },
        { label: "足元と壁を調べながら進む", stat: k.stat || "知力", diff: k.diff || "普通", ok: { text: k.dodge }, ng: { text: k.spring, hp: hurt } },
        { label: k.wrong, ok: { text: k.spring, hp: hurt } },
      ];
      // 並びは罠ごとに決まっている（毎回同じ。正しい手がいつも先頭、にはしない）
      const r = hash(id) % 3;
      const order = [...choices.slice(r), ...choices.slice(0, r)];
      (D.EVENTS = D.EVENTS || []).push({ id: evId, title: k.title.replace(/[『』]/g, ""), w: 0, where: [k.loc], text: k.sign, choices: order, l1trap: id });
      (D.EVENT_NOBODY = D.EVENT_NOBODY || []).push(evId); // 人の姿は出ない（罠と通路だけ。A4 の絵の表）
    });
  };
  L1.makeTrapEvents();

  // ---------------------------------------------------------------- 記録の入れ物
  const prof = () => { if (!G.P) G.P = { trophies: {}, graves: [] }; return G.P; };
  const box = (k) => prof()[k] || (prof()[k] = {});
  const kn = (S) => {
    S = S || G.S;
    if (!S) return null;
    const k = S.kn || (S.kn = {});
    if (!k.learned) k.learned = [];
    if (!k.sprung) k.sprung = {};
    return k;
  };
  L1.state = kn;
  const saved = () => { if (G.onProfile) try { G.onProfile(); } catch {} };
  G.onKnow = G.onKnow || null; // 画面への通知（新しく覚えた）：(id, how)

  // ---------------------------------------------------------------- 覚え書き
  G.knowHas = (id) => !!(id && prof().know && prof().know[id]);
  G.learn = (id, how, quiet) => {
    const k = L1.build()[id];
    if (!k || G.knowHas(id)) return false;
    const S = G.S;
    box("know")[id] = { how: how || "seen", by: S && S.profile ? `${S.clsName || ""} ${S.profile.name || ""}`.trim() : "", date: S && G.dateOf ? G.dateOf(S.day) : "", at: Date.now() };
    if (S) {
      kn(S).learned.push({ id, how: how || "seen", turn: S.turn });
      if (!quiet && S.log) G.log("sys", `覚え書き：${k.text}`, { know: id });
    }
    if (G.onKnow) try { G.onKnow(id, how); } catch {}
    saved();
    return true;
  };
  // 図鑑の数：{ all, known, kinds: { foe: { all, known } ... }, events: { all, known }, shops: { all, known } }
  G.knowCount = () => {
    const out = { all: 0, known: 0, kinds: {} };
    L1.KINDS.forEach(({ key }) => { out.kinds[key] = { all: 0, known: 0 }; });
    Object.entries(L1.build()).forEach(([id, k]) => {
      const c = out.kinds[k.kind] || (out.kinds[k.kind] = { all: 0, known: 0 });
      c.all++; out.all++;
      if (G.knowHas(id)) { c.known++; out.known++; }
    });
    const ev = L1.eventIds();
    out.events = { all: ev.length, known: ev.filter((id) => (prof().kev || {})[id]).length };
    const shops = L1.shopLocs();
    out.shops = { all: shops.length, known: shops.filter((l) => (prof().kshop || {})[l]).length };
    return out;
  };
  G.knowList = (kind) => L1.ids(kind).filter(G.knowHas).map((id) => Object.assign({ id }, D.KNOW[id], { rec: prof().know[id] }));

  // ---------------------------------------------------------------- 引く
  const idx = { foe: {}, ap: {}, trap: {}, fact: {} };
  let indexed = false;
  const index = () => {
    if (indexed) return;
    indexed = true;
    Object.entries(L1.build()).forEach(([id, k]) => {
      if (k.kind === "foe") idx.foe[k.foe] = id;
      else if (k.kind === "fact") (idx.fact[k.foe] = idx.fact[k.foe] || []).push(id);
      else if (k.kind === "apostle") idx.ap[k.ap] = id;
      else if (k.kind === "trap") idx.trap[k.loc + ":" + k.floor] = id;
    });
  };
  L1.foeKnowId = (foe) => { index(); return idx.foe[foe] || null; };
  // まだ分かっていない、その魔物の次のこと（データの順）
  L1.factIds = (foe) => { index(); return idx.fact[foe] || []; };
  L1.nextFact = (foe) => L1.factIds(foe).find((id) => !G.knowHas(id)) || null;
  L1.trapId = (loc, floor) => { index(); return idx.trap[loc + ":" + floor] || null; };
  L1.apKnowId = (foe) => { index(); const a = G.e3Of && G.e3Of(foe); return (a && idx.ap[a.id]) || null; };
  // 図鑑の出来事の頁の分母（ふだん起きるものと、罠）
  L1.eventIds = () => (D.EVENTS || []).filter((e) => e.w > 0 || e.l1trap).map((e) => e.id);
  L1.shopLocs = () => Object.keys(D.LOCS || {}).filter((l) => (D.LOCS[l].fac || []).includes("shop"));

  // ---------------------------------------------------------------- 出来事：どれを選んで、何が起きたか
  let lastCheck = null;
  const baseCheck = G.check;
  G.check = (...a) => { const r = baseCheck(...a); lastCheck = r; return r; };
  const evRec = (evId, i) => {
    const e = box("kev")[evId] || (box("kev")[evId] = {});
    return e[i] || (e[i] = { n: 0, ok: 0, ng: 0, fight: 0, dead: 0 });
  };
  L1.evRecord = (evId) => (prof().kev || {})[evId] || null;
  let trapNow = null; // 罠の出来事の最中（G.hurt の死因を罠の名にする）
  const baseChoose = G.chooseEvent;
  G.chooseEvent = (i) => {
    const S = G.S;
    const evId = S && S.event;
    const e = evId && (D.EVENTS || []).find((x) => x.id === evId);
    const c = e && e.choices[i];
    if (!c) return baseChoose(i);
    lastCheck = null;
    trapNow = e.l1trap || null;
    let r;
    try { r = baseChoose(i); } finally { trapNow = null; }
    if (G.S !== S || (S.mode === "event" && S.event === evId && c.cost)) return r; // 金が足りずに選べなかった
    const rec = evRec(evId, i);
    rec.n++;
    if (c.fight) rec.fight++;
    else if (c.stat && lastCheck) { if (lastCheck.ok) rec.ok++; else rec.ng++; }
    else rec.ok++;
    kn(S).ev = { id: evId, i, turn: S.turn, fight: !!c.fight };
    if (S.over === "dead" && !rec.dead) rec.dead++;
    // 罠：起きたことを覚え書きに残す
    if (e.l1trap && !S.over) {
      const hurt = c.stat ? !!(lastCheck && !lastCheck.ok) : !!(c.ok && c.ok.hp < 0);
      G.learn(e.l1trap, hurt ? "fail" : "seen");
    }
    lastCheck = null;
    saved();
    return r;
  };
  const baseHurt = G.hurt;
  G.hurt = (n, cause) => baseHurt(n, trapNow && cause === "傷がもとで力尽きた" ? `罠（${D.KNOW[trapNow].title.replace(/[『』]/g, "")}）にかかった` : cause);

  // ---------------------------------------------------------------- 戦闘：試した手・効かなかった手・あなたを倒した
  const foeRec = (id) => { const f = box("kfoe"); return f[id] || (f[id] = { a: {}, wall: 0, dealt: 0, taken: 0, slew: 0 }); };
  L1.foeRecord = (id) => (prof().kfoe || {})[id] || null;
  const baseAct = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const C = S && S.combat;
    const t = C && G.target && G.target();
    const kind = String(arg).split(":")[0];
    if (!t || !L1.ACTS[kind]) return baseAct(arg);
    const hp0 = t.hp, my0 = S.hp, logN = S.log.length;
    const r = baseAct(arg);
    const rec = foeRec(t.id);
    const a = rec.a[kind] || (rec.a[kind] = [0, 0]);
    const added = S.log.length >= logN ? S.log.slice(logN) : S.log.slice(-20);
    const first = added.find((x) => x.k === "dice"); // その手の判定（最初の判定）
    a[0]++;
    if (first && first.ok) a[1]++;
    if (added.some((x) => x.fx === "wall")) rec.wall++;
    if (t.hp < hp0) rec.dealt += hp0 - t.hp;
    if (S.hp < my0) rec.taken += my0 - S.hp;
    return r;
  };
  // 図鑑の魔物の頁に、戦って分かったことを足す（F2 の性能の表のあと）
  G.knowFoeRows = (id) => {
    const rec = L1.foeRecord(id);
    const out = [];
    if (rec) {
      const tried = Object.entries(rec.a).filter(([, v]) => v[0] > 0);
      if (tried.length) out.push(["試した手", tried.map(([k, v]) => `${L1.ACTS[k]} ${v[1]}/${v[0]}`).join("・")]);
      const nogood = tried.filter(([, v]) => v[0] >= 3 && v[1] === 0).map(([k]) => L1.ACTS[k]);
      if (rec.wall) nogood.unshift("見えない壁に止まった");
      if (nogood.length) out.push(["効かなかった手", nogood.join("・")]);
      if (rec.slew) out.push(["あなたを倒した", `${rec.slew}度`]);
    }
    const facts = L1.factIds(id).filter(G.knowHas);
    if (facts.length) out.push(["分かったこと", facts.map((f) => D.KNOW[f].text.replace(/^[^：]*：/, "")).join(" ")]);
    const rest = L1.factIds(id).length - facts.length;
    if (rest) out.push(["まだ分からないこと", `${rest} つ`]);
    const k = L1.foeKnowId(id) || L1.apKnowId(id);
    if (k && G.knowHas(k)) out.push(["覚え書き", D.KNOW[k].text]);
    return out;
  };
  const baseStats = G.codexFoeStats;
  if (baseStats) G.codexFoeStats = (id) => {
    const rows = baseStats(id);
    return rows.length ? [...rows, ...G.knowFoeRows(id)] : rows;
  };
  // 戦い慣れ：同じ敵を（冒険をまたいで）三度倒すと、癖が書きつけに残る
  const baseKill = G.codexKill;
  if (baseKill) G.codexKill = (id, quiet, n) => {
    const r = baseKill(id, quiet, n);
    // 倒すたびに、その魔物について一つ分かる
    const f = L1.nextFact(id);
    if (f && G.S && !G.S.over) G.learn(f, "seen");
    const k = L1.foeKnowId(id);
    const rec = G.codexFoe && G.codexFoe(id);
    if (k && rec && (rec.kills || 0) >= 3 && G.S && !G.S.over) G.learn(k, "seen");
    return r;
  };
  // 使徒と戦うと、見たことが残る
  const baseStart = G.startCombat;
  G.startCombat = (ids, opt) => {
    baseStart(ids, opt);
    const S = G.S;
    if (!S || !S.combat) return;
    S.combat.foes.forEach((f) => { const ap = L1.apKnowId(f.id); if (ap) G.learn(ap, "seen"); });
  };

  // ---------------------------------------------------------------- 迷宮の罠・店・噂・仲間の話
  const baseExplore = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const r = baseExplore(head, arg, a);
    if (!S || S.over || G.S !== S) return r;
    if (head === "deeper") trap(S);
    else if (head === "fac" && arg === "shop") shop(S);
    else if (head === "tavern" && arg === "rumor") rumor(S);
    else if ((head === "inn" && arg === "rest") || head === "camp") ally(S);
    return r;
  };

  // 罠は、その冒険で初めてその階に着いたときに起きる（ほかの出来事や戦いが起きた階なら、次に来たとき）
  function trap(S) {
    const L = G.loc();
    if (!L || L.type !== "dungeon" || S.mode !== "explore" || !S.depth || S.depth >= L.floors) return;
    const id = L1.trapId(S.loc, S.depth);
    const st = kn(S);
    const key = S.loc + ":" + S.depth;
    if (!id || st.sprung[key] || !D.KNOW[id].sign) return;
    st.sprung[key] = 1;
    G.startEvent(L1.trapEventId(id));
  }

  // 店の品と値段（入ったとき。画面に並ぶ「買う」の品と値段をそのまま写す。日替わりの品・相場の揺れ〔I3・M4〕もそのまま）
  function shop(S) {
    const rec = box("kshop")[S.loc] || (box("kshop")[S.loc] = { items: {} });
    G.actions().forEach((g) => g.list.forEach((a) => {
      const m = /^shop:buy:(.+)$/.exec(a.id);
      const p = /(\d+)G/.exec(a.sub || "");
      if (m && p && G.itemInfo(m[1])) rec.items[m[1]] = Number(p[1]);
    }));
    rec.date = G.dateOf ? G.dateOf(S.day) : "";
    saved();
  }

  // まだ知らない覚え書きを、近いものから選ぶ（乱数は使わない）
  L1.nearIds = (S, kinds) => {
    const L = G.loc(S.loc);
    const near = new Set([S.loc, ...Object.keys((L && L.links) || {}), ...Object.keys((L && L.sea) || {})]);
    const pools = new Set();
    near.forEach((l) => [...((D.LOCS[l] || {}).pool || []), ...((D.LOCS[l] || {}).e4pool || [])].forEach((f) => pools.add(f)));
    const score = (k) => (k.kind === "trap" ? (k.loc === S.loc ? 0 : near.has(k.loc) ? 1 : 4) : k.kind === "foe" || k.kind === "fact" ? (pools.has(k.foe) ? 1 : 3) : 5);
    return L1.ids().filter((id) => !G.knowHas(id) && (!kinds || kinds.includes(D.KNOW[id].kind)) && D.KNOW[id].rumor !== false)
      .map((id, n) => [id, score(D.KNOW[id]), n]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map((x) => x[0]);
  };
  // 噂：二度に一度、役に立つ話が混じる
  function rumor(S) {
    const st = kn(S);
    st.rumor = (st.rumor || 0) + 1;
    if (st.rumor % 2) return;
    const ids = L1.nearIds(S);
    if (!ids.length) return;
    G.say("隣の卓の男が、聞かれてもいないのに付け足した。「それとな……」");
    G.learn(ids[(S.turn || 0) % Math.min(3, ids.length)], "rumor");
  }
  // 仲間の話：仲間がいて、宿か野営で休んだとき（五日に一度まで）
  function ally(S) {
    if (S.over || S.mode === "combat" || !(S.companions || []).length) return;
    const st = kn(S);
    if (st.allyDay != null && S.day - st.allyDay < 5) return;
    const ids = L1.nearIds(S, ["fact", "foe", "trap"]);
    if (!ids.length) return;
    st.allyDay = S.day;
    const c = S.companions[(S.day || 0) % S.companions.length];
    const name = String(c.name || "仲間").replace(/\{.*?\}/g, "");
    G.say(`寝る前に、${name}が昔しくじった話をした。笑い話のつもりらしかったが、あなたは笑わずに聞いた。`);
    G.learn(ids[0], "ally");
  }

  // ---------------------------------------------------------------- 死：最期の様子と、死に際に覚えたこと（必ず一つ）
  L1.deathPick = (S) => {
    const out = [];
    const add = (id) => { if (id && !G.knowHas(id) && !out.includes(id)) out.push(id); };
    ((S.combat && S.combat.foes) || []).forEach((f) => { add(L1.nextFact(f.id)); add(L1.foeKnowId(f.id)); add(L1.apKnowId(f.id)); });
    if (S.depth) add(L1.trapId(S.loc, S.depth));
    if (out.length) return out[0];
    return L1.nearIds(S)[0] || L1.ids().find((id) => !G.knowHas(id)) || null;
  };
  const lineOf = (x) => {
    if (x.k === "dice") return `判定：${x.reason}（${x.stat} ${x.chance}%）→ ${x.label}`;
    if (x.k === "title") return `── ${x.text} ──`;
    return x.text || "";
  };
  L1.lastScene = (S, cause) => {
    const L = G.loc();
    const st = kn(S);
    const ev = st.ev && S.turn - st.ev.turn <= 3 ? (D.EVENTS || []).find((e) => e.id === st.ev.id) : null;
    return {
      cause: cause || "",
      where: L ? L.name : "",
      depth: L && L.type === "dungeon" ? S.depth || 0 : 0,
      event: ev ? { title: ev.title, choice: (ev.choices[st.ev.i] || {}).label || "" } : null,
      foes: ((S.combat && S.combat.foes) || []).map((f) => ({ name: f.name, hp: f.hp, max: f.max })),
      round: S.combat ? S.combat.round : 0,
      hp: S.hp, maxHp: S.maxHp, conds: [...(S.conds || [])],
      lines: (S.log || []).filter((x) => ["you", "nar", "sys", "dice", "title"].includes(x.k) && !x.know).slice(-10).map(lineOf).filter(Boolean),
    };
  };
  const baseDie = G.die;
  G.die = (cause) => {
    const S = G.S;
    if (S && !S.over) {
      const st = kn(S);
      st.last = L1.lastScene(S, cause);
      ((S.combat && S.combat.foes) || []).filter((f) => f.hp > 0).forEach((f) => { foeRec(f.id).slew++; });
      if (st.ev && S.turn - st.ev.turn <= 3) { const r = evRec(st.ev.id, st.ev.i); r.dead++; }
      if (!st.learned.some((x) => x.turn === S.turn)) {
        const id = L1.deathPick(S);
        if (id) { G.say("薄れていく意識の底で、ひとつだけ、はっきり分かったことがあった。"); G.learn(id, "death"); }
      }
      st.learned.filter((x) => x.turn === S.turn).forEach((x) => { x.death = true; });
    }
    return baseDie(cause);
  };
  const baseFinish = G.finishRun;
  G.finishRun = () => {
    const r = baseFinish();
    const S = G.S;
    const g = S && G.P && (G.P.graves || []).find((x) => x.id === S.id);
    if (g) {
      const st = kn(S);
      g.know = st.learned.map((x) => ({ id: x.id, how: x.how, death: !!x.death }));
      if (st.last) g.last = st.last;
    }
    return r;
  };
  // 年表・墓碑に出す行（run は G.S か墓碑）
  G.knowOfRun = (run) => {
    if (!run) return [];
    L1.build();
    return ((run.kn ? run.kn.learned : run.know) || []).filter((x) => D.KNOW[x.id]).map((x) => ({ id: x.id, title: D.KNOW[x.id].title, text: D.KNOW[x.id].text, kind: D.KNOW[x.id].kind, how: x.how, death: !!x.death }));
  };
  G.lastOfRun = (run) => (run ? (run.kn ? run.kn.last : run.last) || null : null);
})(globalThis.G = globalThis.G || {});
