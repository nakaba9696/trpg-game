// U9：通しで遊んで直した所を DOM なしで確かめる
// - 仲間の攻撃の記録が、主人公の攻撃と同じく「〇〇に N のダメージ（残り x/y）」になる
// - 押せない「〇〇と話す」の理由が「今日はもう話した」になる（src/ui/u9_play.js。DOM が無くても読める）
// - 図鑑の「主に会える場所」に、「町（誘える）」と「町」が二行で並ばない
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  let bad = 0;
  const no = (m) => { bad++; fail(m); };
  vm.runInContext(readFileSync(fileURLToPath(new URL("../../src/ui/u9_play.js", import.meta.url)), "utf8"), vm.createContext({ globalThis: { G } }));
  G.P = { trophies: {}, graves: [] };
  G.rand = seeded(9900);
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 60])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  const S = G.S;
  if (!G.c2Join("natalia")) no("ナタリアを仲間にできない");
  const c = S.companions[0];
  if (c) c.power = 200;
  S.hp = S.maxHp = 999;

  // 仲間の攻撃の記録
  const hits = [];
  for (let k = 0; k < 6 && !hits.length; k++) {
    G.startCombat(["goblin", "goblin", "goblin"]);
    const from = S.log.length;
    for (let i = 0; i < 30 && S.combat; i++) G.act("cb:guard");
    S.log.slice(from).forEach((e) => { if (c && String(e.text).startsWith(`${c.name}の攻撃が`)) hits.push(e.text); });
  }
  if (!hits.length) no("仲間の攻撃が一度も当たらない");
  hits.forEach((t) => { if (!/に \d+ のダメージ（残り \d+\/\d+）$/.test(t)) no(`仲間の攻撃の記録の形が違う：${t}`); });

  // 押せない「話す」の理由
  if (c) {
    c.talkDay = S.day;
    S.mode = "explore";
    const a = G.actions().flatMap((g) => g.list).find((x) => x.id === "m2talk:" + c.id);
    if (!a || !a.disabled) no("その日に話した仲間の「話す」が押せてしまう");
    else if (!/今日はもう話した/.test(G.lockReason(a, S))) no(`押せない「話す」の理由が違う：${G.lockReason(a, S)}`);
  }

  // 主に会える場所の重なり
  Object.keys(D.C2_PEOPLE || {}).forEach((id) => {
    const w = G.codexPersonWhere(id, 99);
    w.forEach((t) => { if (w.includes(`${t}（誘える）`)) no(`${id} の主に会える場所に「${t}」が二行ある`); });
  });

  if (!bad) ok(`U9：仲間の攻撃の記録（${hits.length} 回）・話す理由・会える場所の重なり`);
};
