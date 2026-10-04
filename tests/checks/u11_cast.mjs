// U11：仲間の立ち絵は、その仲間が話しているときだけ（src/ui/zu11_cast.js が v9.castOf を包む。DOM なしで確かめる）
// - 台詞の無い手番（攻撃の記録だけ・何も言わない）では仲間は並ばない
// - 今の手番に、その仲間の名前と「」の入った行があれば並ぶ。話している相手がいなければ、その仲間が前（speaker）
// - 二人が話したら、最後に話した方が前。会話・掛け合いの最中は、その相手が並ぶ。次の手番で台詞が無ければ消える
// - 町の人など話している相手（speaker）は今まで通り。主人公は出さない
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const read = (p) => readFileSync(fileURLToPath(new URL("../../src/ui/" + p, import.meta.url)), "utf8");

export default ({ G, fail, ok, seeded }) => {
  let bad = 0;
  const no = (m) => { bad++; fail(m); };
  const D = G.data;
  const ctx = vm.createContext({ globalThis: { G } });
  ["art_people.js", "v5_stand.js", "v9_pc.js", "zu11_cast.js"].forEach((f) => vm.runInContext(read(f), ctx, { filename: "ui/" + f }));
  if (!G.v9 || !G.v9.castOf || !G.u11 || !G.u11.speakingComps) { fail("v9.castOf か u11.speakingComps が無い"); return; }
  G.portraitArt = () => ({}); // 画像がある人として並べる（画像の有り無しは v9 のテストが見る）

  G.P = { trophies: {}, graves: [] };
  G.rand = seeded(1212);
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 60])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  const S = G.S;
  ["natalia", "dil", "kaidel", "nora"].forEach((id) => { if (S.companions.length < 2 && G.c2Join) G.c2Join(id); });
  if (S.companions.length < 2) { fail("仲間を二人加えられない"); return; }
  const [a, b] = S.companions;
  S.mode = "explore"; S.event = null;
  const allies = () => G.v9.castOf(S).filter((c) => /^(ally|speaker)$/.test(c.role) && (c.ally || c.role === "ally"));
  const names = () => G.v9.castOf(S).map((c) => c.role + ":" + c.name).join("、");
  const turn = (...lines) => { G.log("you", "何かする"); lines.forEach(([k, t]) => G.log(k, t)); };

  turn(["nar", "風が吹いた。"]);
  if (allies().length) no(`誰も話していないのに仲間が並ぶ：${names()}`);
  turn(["sys", `${a.name}の攻撃は外れた。`]);
  if (allies().length) no(`攻撃の記録だけで仲間が並ぶ：${names()}`);

  turn(["nar", `「やるじゃない」${a.name}は笑った。`]);
  let list = G.v9.castOf(S);
  if (!list[0] || list[0].role !== "speaker" || !list[0].ally) no(`話した仲間が前に出ない：${names()}`);
  if (b && list.some((c) => c.name.includes(b.name))) no(`話していない仲間まで並ぶ：${names()}`);

  if (b) {
    turn(["nar", `「行くよ」${a.name}が言った。`], ["nar", `${b.name}は肩をすくめた。「はいはい」`]);
    list = G.v9.castOf(S);
    if (list.length !== 2) no(`掛け合いで二人とも並ばない：${names()}`);
    else if (!list[0].name.includes(b.name) || list[0].role !== "speaker") no(`最後に話した方が前に出ない：${names()}`);
    const spots = G.v9.placeCast(G.v9.layout(1280, 800, false), list);
    if (!(spots[1] && spots[1].dim > 0 && !spots[1].front)) no("話していない方が控えめ（後ろ・暗く）にならない");
  }

  // 次の手番で台詞が無ければ消える
  turn(["nar", "夜が明けた。"]);
  if (allies().length) no(`話し終えたのに仲間が残る：${names()}`);

  // 会話の出来事の最中は、その相手
  S.mode = "event"; S.event = "tk_topic"; S.tk = Object.assign(S.tk || {}, { cur: { cid: a.id } });
  turn(["nar", `「……なに」${a.name}は杯から目を上げなかった。`]);
  if (!G.u11.speakingComps(S).includes(a.id)) no("会話の台詞（「……なに」〇〇は…）で、その仲間が話していることにならない");
  turn(["nar", "（話題を選ぶ）"]);
  if (G.u11.speakingComps(S).includes(a.id)) no("会話の最中でも、台詞の無い手番に仲間が話していることになる");
  S.mode = "explore"; S.event = null; S.tk.cur = null;

  // 町の人（話している相手）は今まで通り。主人公は出さない
  if (G.stand) {
    const who0 = G.stand.whoOf;
    G.stand.whoOf = () => ({ kind: "merchant", seed: "u11:inn", name: "宿の主人" });
    turn(["nar", "「いらっしゃい」"]);
    list = G.v9.castOf(S);
    if (!list[0] || list[0].role !== "speaker" || list[0].ally) no(`話している町の人が前に出ない：${names()}`);
    if (list.some((c) => c.role === "ally")) no(`町の人が話しているだけで仲間が並ぶ：${names()}`);
    G.stand.whoOf = who0;
  }
  if (G.v9.castOf(S).some((c) => c.who && c.who.kind === "hero")) no("主人公が並ぶ");

  if (!bad) ok(`U11：仲間の立ち絵は話すときだけ（仲間 ${S.companions.length} 人・掛け合い・会話・町の人）`);
};
