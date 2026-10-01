// U6：分かりやすさの残りを DOM なしで確かめる
// - 戦闘で狙う敵を選べる（G.setAim）。攻撃は選んだ敵に当たる。狙いが倒れたら生きている先頭へ。狙いを替えても手番は進まない。古いセーブ（aim 無し）でも先頭
// - 同じ項目の行が一度に二つ開いても「手引きに書き足された」は一行
// - トロフィー「旅立ち」は冒険を始めたときに取れる（最初の行動を待たない）
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  let bad = 0;
  const no = (m) => { bad++; fail(m); };
  G.P = { trophies: {}, graves: [] };
  G.rand = seeded(8800);
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 60])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  G.checkTrophies();
  if (!G.P.trophies.first_step) no("「旅立ち」が冒険を始めたときに取れない");
  const S = G.S;

  // 狙い
  G.startCombat(["goblin", "goblin", "goblin"]);
  const C = S.combat;
  if (G.target() !== C.foes[0]) no("狙いを選ぶ前（aim 無し）に先頭を狙っていない");
  const turn = S.turn;
  if (!G.setAim(2) || G.target() !== C.foes[2]) no("setAim で狙いが替わらない");
  if (S.turn !== turn) no("狙いを替えただけで手番が進んだ");
  if (!G.combatActions()[0].title.includes(C.foes[2].name)) no("攻撃の見出しの狙いが替わらない");
  S.hp = S.maxHp = 999;
  for (let i = 0; i < 40 && C.foes[2].hp > 0 && S.combat; i++) G.act("cb:attack");
  if (C.foes[2].hp > 0) no("選んだ敵に攻撃が当たらない");
  if (C.foes[0].hp !== C.foes[0].max || C.foes[1].hp !== C.foes[1].max) no("選んでいない敵に攻撃が当たった");
  if (S.combat) {
    if (G.target() !== C.foes[0]) no("狙いが倒れたあと、生きている先頭を狙わない");
    if (G.setAim(2)) no("倒れた敵を狙えてしまう");
    if (G.setAim(9)) no("いない敵を狙えてしまう");
  }

  // 書き足しの知らせは項目ごとに一行
  const two = Object.entries(D.LORE).find(([, e]) => e.lines.length >= 2);
  if (two) {
    const [id, e] = two;
    S.lore = {};
    G.log("you", "テスト");
    G.openLores([`${id}:${e.lines[0][0]}`, `${id}:${e.lines[1][0]}`]);
    const n = S.log.filter((x) => x.text === `手引きに書き足された：${e.title}`).length;
    if (n !== 1) no(`同じ項目の書き足しの知らせが ${n} 行出た`);
    if ((S.lore[id] || []).length !== 2) no("二つ目の行が開かない");
  } else no("行が二つ以上ある用語が無い");

  if (!bad) ok("U6：狙いを選ぶ・書き足しの知らせは一行・旅立ちは始めたときに");
};
