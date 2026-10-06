// W8：町の特色の場所（src/engine/w8s_spots.js・src/data/w8s_spots_*.js）
// - 担当の地方の町すべてに、宿・酒場・店・教会・ギルド・訓練・裏通り・王城のほかの施設が一つ以上ある（王都・帝都は王城の中の欄でもよい）
// - 場所の行いが 3〜6 つ。データの整合（能力値・難易度・状態・持ち物・敵・続きの出来事・罪の種類）
// - 稼ぎの場にしない：金か物が出る行いには once か cd（か一度きりの出来事）が付いている
// - どの行いも、その状態にして押せば動き、一度きりの行いは二度は押せない
// - 文の癖（……・少しだけ・どこか・気がする）が無い
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const W = G.w8s;
  if (!W) { fail("G.w8s が無い"); return; }
  const SP = D.W8S_SPOTS || {};
  const BASE = ["inn", "tavern", "shop", "guild", "church", "train", "alley", "castle"];
  // W8 の担当の地方（王国に統合中の自由都市連合を含む）
  const REGIONS = ["レオネスト王国", "自由都市連合", "ノルディア帝国", "人類の最前線", "人と魔の境"];
  const towns = Object.keys(D.LOCS).filter((id) => D.LOCS[id].type === "town" && REGIONS.includes(D.LOCS[id].region));
  if (towns.length < 10) fail(`担当の町が ${towns.length} しか見つからない`);
  for (const id of towns) {
    const L = D.LOCS[id];
    const special = (L.fac || []).filter((f) => !BASE.includes(f));
    const inner = Object.keys(SP).filter((k) => SP[k].inFac && SP[k].town === id);
    if (!special.length && !inner.length) fail(`${L.name}（${id}）に特色の場所が無い`);
    if (special.filter((f) => SP[f]).length > 2) fail(`${L.name} に W8 の場所が三つ以上ある（大きな都でも二つまで）`);
  }

  // ---------------------------------------------------------------- データの整合
  const evIds = new Set(D.EVENTS.map((e) => e.id));
  const STYLE = /……|少しだけ|どこか|気がする/;
  const outs = [];   // [where, o]
  const sample = (o) => {
    if (typeof o !== "function") return [o];
    const got = [];
    for (let s = 1; s <= 12; s++) { G.rand = seeded(s); got.push(o(G.S || {})); }
    return got;
  };
  const checkOut = (where, o) => {
    if (!o) return;
    if (o.text && STYLE.test(o.text)) fail(`${where}: 文に避けたい癖がある「${o.text.match(STYLE)[0]}」`);
    if (o.memo && STYLE.test(o.memo)) fail(`${where}: 覚え書きに避けたい癖がある`);
    const items = typeof o.item === "string" ? [o.item] : Object.keys(o.item || {});
    for (const it of items) if (!D.ITEMS[it]) fail(`${where}: アイテム ${it} が無い`);
    for (const k of Object.keys(o.grow || {})) if (!D.STATS.includes(k)) fail(`${where}: 能力値 ${k} が無い`);
    const foes = o.fight ? [].concat(o.fight) : [];
    for (const f of foes) if (!D.ENEMIES[f]) fail(`${where}: 敵 ${f} が無い`);
    if (o.next && !evIds.has(o.next)) fail(`${where}: 続きの出来事 ${o.next} が無い`);
    if (o.crime && !(D.CRIMES || {})[o.crime]) fail(`${where}: 罪の種類 ${o.crime} が無い`);
    outs.push([where, o]);
  };
  G.newGame({ cls: "merc", stats: Object.fromEntries(D.STATS.map((k) => [k, 50])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  let nActs = 0;
  for (const [key, s] of Object.entries(SP)) {
    const L = D.LOCS[s.town];
    if (!L || L.type !== "town") { fail(`${key}: 町 ${s.town} が無い`); continue; }
    if (s.inFac) { if (!(L.fac || []).includes(s.inFac)) fail(`${key}: ${L.name} に ${s.inFac} が無い`); }
    else {
      if (!(L.fac || []).includes(key)) fail(`${key}: ${L.name} の施設に入っていない`);
      if (G.FAC_NAMES[key] !== s.name) fail(`${key}: 施設の名前が出ない`);
      for (const t of [].concat(s.enter || [])) if (STYLE.test(t)) fail(`${key}: 入るときの文に避けたい癖がある`);
      if (!/[ぁ-んァ-ヶ一-龠]/.test(s.name)) fail(`${key}: 名前が日本語でない`);
    }
    if (s.acts.length < 3 || s.acts.length > 6) fail(`${key}: 行いが ${s.acts.length}（3〜6 のはず）`);
    const ids = new Set();
    for (const a of s.acts) {
      nActs++;
      const w = `${key}:${a.id}`;
      if (ids.has(a.id)) fail(`${w}: id が重複`);
      ids.add(a.id);
      if (a.stat && !D.STATS.includes(a.stat)) fail(`${w}: 能力値 ${a.stat} が無い`);
      if (a.diff && D.DIFF[a.diff] === undefined) fail(`${w}: 難易度 ${a.diff} が無い`);
      for (const on of [].concat(a.on || [])) if (!G.c10.state(on)) fail(`${w}: 状態 ${on} が無い`);
      if (a.need && !D.ITEMS[a.need]) fail(`${w}: 持ち物 ${a.need} が無い`);
      if (a.ev && !evIds.has(a.ev)) fail(`${w}: 出来事 ${a.ev} が無い`);
      if (a.ev && !D.EVENTS.find((e) => e.id === a.ev).once) fail(`${w}: 出来事 ${a.ev} が一度きりでない`);
      if (STYLE.test(a.label)) fail(`${w}: 選択肢の名に避けたい癖がある`);
      if (!a.ok) fail(`${w}: 結果が無い`);
      if (a.stat && !a.ng) fail(`${w}: 判定があるのに失敗の結果が無い`);
      const os = [...sample(a.ok), ...sample(a.ng)].filter(Boolean);
      os.forEach((o, i) => checkOut(`${w}[${i}]`, o));
      const gain = os.some((o) => (o.gold || 0) > 0 || o.item || o.grow || (o.fame || 0) > 0 || o.rep > 0);
      if (gain && !(a.once || a.cd || a.ev)) fail(`${w}: 金か物が出るのに、一度きりでも日数の間でもない（稼ぎの場になる）`);
    }
  }

  // ---------------------------------------------------------------- 動かす
  const COMP = {
    fighter: { name: "剣士のハンス", cls: "剣士", power: 50, dmg: 1, desc: "無口" },
    heal: { name: "僧侶のアン", cls: "僧侶", power: 40, dmg: 0, heal: true, desc: "穏やか" },
    magic: { name: "魔法使いのリタ", cls: "魔法使い", power: 40, dmg: 0, fire: true, desc: "早口" },
    rogue: { name: "ならず者のベン", cls: "ならず者", power: 40, dmg: 1, desc: "口が悪い" },
    trade: { name: "商人のゼノ", cls: "商人", power: 30, dmg: 0, desc: "がめつい" },
    scout: { name: "弓使いのイオ", cls: "弓使い", power: 45, dmg: 1, desc: "目がいい" },
  };
  const start = (cls, town, seed) => {
    G.rand = seeded(seed);
    G.newGame({ cls, stats: Object.fromEntries(D.STATS.map((k) => [k, 50])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.loc = town; S.mode = "explore"; S.fac = null; S.combat = null; S.event = null;
    S.fame = 40; S.gold = 500; S.sin = 0; S.virtue = 0; S.companions = []; S.title = ""; S.phase = 1;
    S.visited = S.visited || {}; S.visited[town] = true;
    return S;
  };
  const prepare = (S, on) => {
    for (const k of [].concat(on || []).slice(0, 1)) {
      const n = G.nationOf();
      if (k === "sinful") S.sin = 30;
      else if (k === "pure") { S.virtue = 10; S.sin = 0; }
      else if (k === "famous") S.fame = 200;
      else if (k === "hero") S.fame = 400;
      else if (k === "unknown") S.fame = 0;
      else if (k === "titled") S.title = "騎士";
      else if (k === "wanted" && n) S.repute = { [n]: { rep: 0, inf: 60, wanted: true } };
      else if (k === "trusted" && n) S.repute = { [n]: { rep: 80, inf: 0, wanted: false } };
      else if (k === "infamous" && n) S.repute = { [n]: { rep: 0, inf: 20, wanted: false } };
      else if (/^comp:/.test(k)) S.companions.push({ ...COMP[k.slice(5)] });
      else if (/^item:/.test(k)) G.give(k.slice(5), 1);
    }
  };
  const actsHere = () => G.actions().flatMap((g) => g.list);
  let ran = 0;
  for (const [key, s] of Object.entries(SP)) {
    s.acts.forEach((a, n) => {
      const cls = [].concat(a.on || []).map((k) => /^cls:(.+)$/.exec(k)).filter(Boolean).map((m) => m[1])[0] || "merc";
      const S = start(cls, s.town, 100 + n);
      prepare(S, a.on);
      if (a.need) G.give(a.need, 1);
      if (a.time) S.phase = a.time[0];
      const enter = "fac:" + (s.inFac || key);
      if (!actsHere().some((x) => x.id === enter)) { fail(`${key}: ${D.LOCS[s.town].name} の町で「${enter}」が出ない`); return; }
      G.act(enter);
      if (S.mode !== "fac" || S.fac !== (s.inFac || key)) { fail(`${key}: 入れない（mode=${S.mode} fac=${S.fac}）`); return; }
      const id = `w8s:${key}:${a.id}`;
      const btn = actsHere().find((x) => x.id === id);
      if (!btn) { fail(`${key}:${a.id}: その状態にしても選択肢が出ない`); return; }
      if (btn.disabled) { fail(`${key}:${a.id}: その状態にしても押せない（${btn.sub}）`); return; }
      const logs = S.log.length;
      try { G.act(id); } catch (e) { fail(`${key}:${a.id}: 押すと例外 ${e.message}`); return; }
      ran++;
      if (S.log.length === logs) fail(`${key}:${a.id}: 押しても何も起きない`);
      if (!["fac", "combat", "event", "over", "explore"].includes(S.mode)) fail(`${key}:${a.id}: mode が変 ${S.mode}`);
      if ((a.once || a.cd) && S.mode === "fac") {
        const again = actsHere().find((x) => x.id === id);
        if (again && !again.disabled) fail(`${key}:${a.id}: 一度きり・日数待ちなのに、すぐもう一度押せる`);
      }
    });
  }
  // 平らな状態では、状態の行いが出ない
  for (const [key, s] of Object.entries(SP)) {
    if (s.inFac) continue;
    start("merc", s.town, 1);
    G.act("fac:" + key);
    const shown = actsHere().filter((x) => x.id.startsWith(`w8s:${key}:`)).map((x) => x.id.split(":").pop());
    const bad = s.acts.filter((a) => a.on && [].concat(a.on).every((k) => k !== "cls:merc") && shown.includes(a.id));
    if (bad.length) fail(`${key}: 平らな状態なのに「${bad[0].label}」が出る`);
  }
  // 古いセーブ（S.w8s が無い）でも動く
  {
    const k = Object.keys(SP).find((x) => !SP[x].inFac);
    const S = start("merc", SP[k].town, 3);
    delete S.w8s;
    G.act("fac:" + k);
    if (!actsHere().length) fail("古いセーブで特色の場所が開けない");
  }
  ok(`W8 の特色の場所（場所 ${Object.keys(SP).length}・行い ${nActs}・動かした ${ran}・担当の町 ${towns.length}）`);
};
