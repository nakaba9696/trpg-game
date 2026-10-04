// Q7：オートセーブ（町に着いたとき）の枠（engine/q7_slots.js の G.townAutoSave。main.save が毎回呼ぶ）
// - 冒険の始め（はじめの町）と、ほかの町に着いたときにオートセーブの枠へ入る。同じ町にいるあいだは書き直さない。町でない場所では書かない
// - 着いた直後が戦闘・出来事の途中なら、終わってから書く。保存できる前に町を出たら書かない
// - 手動では書けない（writeSlot の枠ではない）。一覧の先頭に「town」として並ぶ（空でも）
// - 倒れてもオートセーブの枠は消えず、ロードでやり直せる。古いセーブ（印の無い冒険）でも動く
export default ({ G, fail, seeded }) => {
  const D = G.data;
  const F = (m) => fail("Q7 オートセーブ: " + m);
  const mem = () => { const m = {}; return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };
  const towns = Object.keys(D.LOCS).filter((k) => D.LOCS[k].type === "town");
  const wilds = Object.keys(D.LOCS).filter((k) => D.LOCS[k].type !== "town");
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "町の試し", sex: "女", age: 22, history: "テスト用", personality: "慎重" } });
    return G.S;
  };
  const town = (st) => G.readSlot ? (G.listSlots(st).find((e) => e.kind === "town") || {}) : {};

  let st = mem();
  let S = start(1);
  if (D.LOCS[S.loc].type !== "town") F(`はじめの場所が町でない（試しの前提）：${S.loc}`);
  // 一覧の先頭は、空のオートセーブの枠
  let first = G.listSlots(st)[0];
  if (!first || first.kind !== "town" || !first.empty) F("一覧の先頭が空のオートセーブの枠でない");
  // 冒険の始め
  if (!G.townAutoSave(st, S)) F("冒険の始め（はじめの町）でオートセーブされない");
  first = town(st);
  if (first.empty || !first.meta || first.meta.loc !== D.LOCS[S.loc].name || first.meta.name !== "町の試し" || !first.meta.at || !first.meta.date) F(`オートセーブの枠の見出しが足りない：${JSON.stringify(first.meta)}`);
  const at0 = first.meta && first.meta.at;
  // 同じ町では書き直さない
  if (G.townAutoSave(st, S)) F("同じ町にいるあいだに、もう一度オートセーブした");
  // 町でない場所
  S.loc = wilds[0];
  if (G.townAutoSave(st, S)) F("町でない場所でオートセーブした");
  // ほかの町に着く
  const t2 = towns.find((k) => k !== first.meta && k !== S.q7seen && D.LOCS[k].name !== (first.meta || {}).loc) || towns[1];
  S.loc = t2;
  if (!G.townAutoSave(st, S)) F("ほかの町に着いてもオートセーブされない");
  if (town(st).meta.loc !== D.LOCS[t2].name) F("オートセーブの枠の町が、着いた町でない");
  // 戻ってきた町（いちど離れたら、また着いたうちに数える）
  S.loc = wilds[1] || wilds[0]; G.townAutoSave(st, S);
  S.loc = towns[0];
  if (!G.townAutoSave(st, S)) F("いちど離れて戻った町でオートセーブされない");

  // 着いた直後が戦闘 → 終わってから
  S.loc = wilds[0]; G.townAutoSave(st, S);
  S.loc = t2;
  G.startCombat(["goblin"], {});
  const before = st.m[G.TOWN_SAVE_KEY];
  if (G.townAutoSave(st, S)) F("戦闘中にオートセーブした");
  if (st.m[G.TOWN_SAVE_KEY] !== before) F("戦闘中にオートセーブの枠が書き換わった");
  S.mode = "explore"; S.combat = null;
  if (!G.townAutoSave(st, S)) F("着いた直後の戦闘が終わってもオートセーブされない");
  // 出来事の途中に着いて、終わる前に町を出た → 書かない
  S.loc = wilds[0]; G.townAutoSave(st, S);
  S.loc = towns[0];
  G.startEvent(D.EVENTS[0].id);
  G.townAutoSave(st, S);
  S.mode = "explore"; S.event = null;
  S.loc = wilds[0];
  const b2 = st.m[G.TOWN_SAVE_KEY];
  if (G.townAutoSave(st, S) || st.m[G.TOWN_SAVE_KEY] !== b2) F("保存できる前に町を出たのに、オートセーブした");

  // 手動では書けない
  if (G.writeSlot(st, "town", S).ok || G.writeSlot(st, 0, S).ok) F("手動のセーブでオートセーブの枠に書ける");
  if (G.listSlots(st).filter((e) => e.kind === "slot").some((e) => !e.empty)) F("オートセーブで手動の枠が埋まった");

  // ロードで戻る・倒れても残る
  st = mem();
  S = start(2);
  G.townAutoSave(st, S);
  const saved = JSON.stringify({ loc: S.loc, hp: S.hp, gold: S.gold, turn: S.turn });
  S.gold += 999; S.turn += 5;
  G.die("試し");
  if (G.townAutoSave(st, S)) F("倒れた冒険をオートセーブした");
  const lb = G.loadEntry(st, "town");
  if (!lb) F("倒れたあと、オートセーブの枠から戻れない");
  else {
    if (JSON.stringify({ loc: lb.loc, hp: lb.hp, gold: lb.gold, turn: lb.turn }) !== saved) F("オートセーブの枠から戻った状態が、着いたときと違う");
    G.adoptLoaded(lb);
    if (G.townAutoSave(st, G.S)) F("オートセーブから戻った直後に、同じ町でまたオートセーブした");
    if (!G.canSave().ok) F("オートセーブから戻った冒険を保存できない");
  }
  // 壊れたオートセーブの枠でも止まらない
  st.setItem(G.TOWN_SAVE_KEY, "{壊れ");
  try { if (!G.listSlots(st)[0].broken || G.loadEntry(st, "town")) F("壊れたオートセーブの枠が壊れと出ない"); } catch (e) { F(`壊れたオートセーブの枠で止まる：${e.message}`); }
  // 古いセーブ（印が無い）・保存の場所が無い
  S = start(3);
  delete S.q7seen; delete S.q7tp;
  try { if (G.townAutoSave(null, S)) F("保存の場所が無いのに書けたことになる"); } catch (e) { F(`保存の場所が無いと止まる：${e.message}`); }
  if (!G.townAutoSave(mem(), S)) F("印の無い古いセーブで、いる町のオートセーブが後から入らない");

  // ランダムに遊ぶ：書いた枠は必ず町
  st = mem();
  S = start(4);
  let n = 0;
  for (let t = 0; t < 400 && !G.S.over; t++) {
    const list = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
    if (!list.length) break;
    const go = list.filter((a) => /^travel:|^go:|^sail:/.test(a.id));
    const pool = go.length && G.rand() < 0.4 ? go : list;
    G.act(pool[Math.floor(G.rand() * pool.length)].id);
    G.S.hp = Math.max(G.S.hp, 10);
    if (G.townAutoSave(st, G.S)) {
      n++;
      const e = town(st);
      if (!e.meta || !towns.some((k) => D.LOCS[k].name === e.meta.loc)) F(`町でない場所でオートセーブした：${e.meta && e.meta.loc}`);
    }
  }
  if (n < 1) F("遊んでいるあいだに一度もオートセーブされない");
};
