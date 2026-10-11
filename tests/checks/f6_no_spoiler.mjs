// F6：戦闘の手番の結果が、ダイスより先に漏れない（持ち主「選択肢選んだ瞬間 BGM が変わるから、ダイスの結果みなくてもわかる。……ダイス振る前から結果わかるようにしないで」）
// - BGM：場面は終わった戦い（u13.inGhost）を通して見る。とどめ・倒れる手番を順に見せている間は、戦闘の曲のまま（sound_bgm.js）
// - 効果音：順に出す行に結びつく音はその行が出る瞬間、結びつかない音（金・品・始まりの合図）は出し終えてから（u13.soundPlan）。倒れた手番は知らせの音を鳴らさない
// - 手の欄：とどめの手番を見せている間は、手を選ぶ前の手の欄の写しのまま（敵がいなくなって手が消えない。u13_menu も並べ替えない）
// - 知らせ（通知・図鑑に追加・覚え書き・用語集に追加・図鑑の「！」）は、見せ終えてから（ui/zzzzzz_f6_hold.js。u13_battle.js より後に読む）
// 画面での順（ヘッドレスのブラウザで記録した時刻）は docs/shots/f6/ にある
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { listFiles } from "../../tools/files.mjs";

export default ({ fail: fail0, ok, loadEngine }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0("F6 結果を先に漏らさない：" + m); };
  const src = new URL("../../src/", import.meta.url);
  const read = (f) => readFileSync(new URL(f, src), "utf8");

  // ---------------------------------------------------------------- 曲
  const bgm = read("ui/sound_bgm.js");
  if (!/snd\.bgmUpdate = [^\n]*u13\.inGhost/.test(bgm)) fail("BGM の場面が、終わった戦い（u13.inGhost）を通して決まらない（とどめの手番で、選んだ瞬間に曲が替わる）");

  // ---------------------------------------------------------------- 効果音の段取り（DOM なし）
  const G = loadEngine();
  const ctx = vm.createContext({ console, G, globalThis: { G } });
  vm.runInContext(read("ui/u13_battle.js"), ctx, { filename: "ui/u13_battle.js" });
  const u = G.u13;
  if (!u || !u.soundPlan) fail("u13.soundPlan が無い");
  else {
    const dice = { k: "dice" }, hit = { fx: "hit" }, down = { fx: "down" }, gold = { text: "2G を手に入れた。" };
    const plan = u.soundPlan([{ n: "rollShort", e: dice }, { n: "slash", e: hit }, { n: "pop", e: down }, { n: "coin", e: null }, { n: "item", e: { text: "よその行" } }], [dice, hit, down, gold]);
    if ((plan.at[0] || []).join() !== "rollShort" || (plan.at[1] || []).join() !== "slash" || (plan.at[2] || []).join() !== "pop") fail(`行に結びつく音が、その行の段に乗らない（${JSON.stringify(plan.at)}）`);
    if (plan.after.join() !== "coin,item") fail(`行に結びつかない音が、出し終えたあとに回らない（${plan.after}）`);
    if (!u.QUIET_ON_DEATH || !["trophy", "coin", "item"].every((n) => u.QUIET_ON_DEATH.includes(n))) fail("倒れた手番に鳴らさない知らせの音の表が無い");
  }
  const ub = read("ui/u13_battle.js");
  if (!/snd\.react = /.test(ub)) fail("効果音（sound.react）を預かっていない（選んだ瞬間に、倒した音・金の音が鳴る）");

  // ---------------------------------------------------------------- 知らせ
  {
    const ui = listFiles(new URL(".", src).pathname).ui.filter((f) => f !== "main.js");
    const me = ui.indexOf("ui/zzzzzz_f6_hold.js");
    if (me < 0) fail("ui/zzzzzz_f6_hold.js が読まれない");
    if (me >= 0 && me < ui.indexOf("ui/u13_battle.js")) fail("知らせを預かる包みが u13_battle.js より先に読まれる（順に見せるかが決まる前に出してしまう）");
    const hold = read("ui/zzzzzz_f6_hold.js");
    for (const k of ["ui.toast", "onCodex", "onCodexChange", "onKnow", "gloss.announce", "afterReveal"]) if (!hold.includes(k)) fail(`知らせを預かる所に ${k} が無い`);
    if (!/ghostPanel/.test(read("ui/u13_menu.js")) || !/restorePanel\(\)/.test(ub)) fail("とどめの手番で、手の欄が手を選ぶ前のまま残らない（敵がいなくなって手が消え、結果が分かる）");
    if (/if \(got\.length\) announce\(/.test(read("ui/u8_glossary.js"))) fail("「用語集に追加」が gl.announce を通らない（預かれない）");
  }

  if (!bad) ok("F6 結果を先に漏らさない（曲は終わった戦いを通して・効果音は行の段に・知らせは見せ終えてから）");
};
