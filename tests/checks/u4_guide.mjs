// U4：画面の案内（engine/u4_guide.js）を DOM なしで確かめる
// - どの場所からどの場所へも道順が出る（陸路と船）。道順は隣どうしをたどる
// - 依頼の行き先：隣でない場所の依頼には、次に向かう場所の印が付く。果たした依頼は報告できるギルドへ
// - 押せないボタンの理由（MP・所持金）。遊び方の一行は場面ごとに一度で、世界のことを説明しない
// - 案内の関数は状態を書き換えない
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  let bad = 0;
  const no = (m) => { bad++; fail(m); };
  const ids = Object.keys(D.LOCS);
  const step = (a, b) => (D.LOCS[a].links || {})[b] != null || (D.LOCS[a].sea || {})[b] != null;
  for (const a of ids) for (const b of ids) {
    const p = G.routeTo(a, b);
    if (!p) { no(`道順が無い：${a} → ${b}`); continue; }
    if (p[0] !== a || p[p.length - 1] !== b) no(`道順の端が違う：${a} → ${b}`);
    for (let i = 1; i < p.length; i++) if (!step(p[i - 1], p[i])) no(`道順が隣どうしでない：${p[i - 1]} → ${p[i]}`);
  }

  G.rand = seeded(6100);
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 40])), caps: Object.fromEntries(D.STATS.map((k) => [k, 70])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  const S = G.S;
  // 隣でない場所の依頼と、果たした依頼
  const far = ids.find((b) => D.LOCS[b].type !== "town" && (G.routeTo(S.loc, b) || []).length > 2);
  if (far) {
    S.quests = [{ id: "t1", type: "hunt", loc: far, target: "goblin", need: 1, progress: 0, title: "テスト", done: false }];
    const before = JSON.stringify(S);
    const w = G.questWays(S)[0];
    const marks = G.travelMarks(S);
    if (!w || w.to !== far || !w.next || !step(S.loc, w.next)) no("隣でない依頼の場所に、次の一歩が出ない");
    else if (!marks[w.next] || !marks[w.next].includes(D.LOCS[far].name)) no("旅立つボタンの印に依頼の場所の名前が無い");
    if (JSON.stringify(S) !== before) no("案内の関数が状態を書き換えた");
    const acts = G.actions().flatMap((x) => x.list);
    if (!acts.some((a) => a.id === "travel:" + w.next || a.id === "sail:" + w.next)) no("印を付ける行き先が、旅立つボタンに無い");
  } else no("隣でない野外・迷宮が見つからない");
  S.quests = [{ id: "t2", type: "deliver", loc: S.loc, title: "テスト", done: true }];
  const back = G.questWays(S)[0];
  if (!back || !(D.LOCS[back.to].fac || []).includes("guild")) no("果たした依頼の行き先が、ギルドのある町でない");
  S.quests = [];

  // 押せない理由
  S.mp = 0; S.gold = 10;
  if (G.lockReason({ label: "炎の魔法", sub: "魔力 50%・MP3", disabled: true }, S) !== "MP が足りない") no("MP が足りない理由が出ない");
  if (G.lockReason({ label: "船でシェルアークへ", sub: "5日・40G", disabled: true }, S) !== "所持金が足りない") no("所持金が足りない理由が出ない");
  if (G.lockReason({ label: "魔力の水（1）", sub: "MP+6", disabled: false }, S) !== "") no("押せるボタンに理由が付いた");
  if (G.lockReason({ label: "逃げる", sub: "逃げられない", disabled: true }, S) !== "") no("理由が書いてあるボタンに、さらに理由が付いた");

  // HP が危ない
  S.hp = S.maxHp; if (G.hpDanger(S)) no("HP が満タンなのに危ないと出る");
  S.hp = 1; if (!G.hpDanger(S)) no("HP 1 なのに危ないと出ない");
  S.hp = S.maxHp;

  // 遊び方の一行：場面ごとに一度。見たら次へ。世界のことを書かない
  const P = { tips: {} };
  const t1 = G.playTip(S, P);
  if (!t1 || t1.key !== (D.LOCS[S.loc].type === "town" ? "town" : t1.key)) no("はじめの町で遊び方の一行が出ない");
  if (t1) { P.tips[t1.key] = 1; const t2 = G.playTip(S, P); if (t2 && t2.key === t1.key) no("見た遊び方の一行がまた出る"); }
  const BANNED = /見世物|観客|客席|舞台|台本|神々|使徒|魔王|あれ」/;
  Object.values(G.PLAY_TIPS).forEach((t) => { if (BANNED.test(t)) no(`遊び方の一行に世界の説明が入っている「${t}」`); });
  S.over = "dead"; if (G.playTip(S, P)) no("冒険が終わったのに遊び方の一行が出る");

  if (!bad) ok(`U4：道順（${ids.length}×${ids.length}）・依頼の印・押せない理由・遊び方の一行`);
};
