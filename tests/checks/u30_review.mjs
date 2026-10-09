// U30（R8 レビューの画面の指摘）。DOM なしなので、書き方を読む（動きは tools/shots_u30.mjs が画面で確かめる）
// - 高 1：Enter（本文の早送り・次へ）は選択肢を押さず、焦点も当てない（src/ui/v9_pc.js のキーの扱い）
// - 中 17：山場の幕の間の知らせを預かる包み（src/ui/zzzzzz_u30_hold.js）は、終わった戦いの包み（zzzzzzz_f5_finish.js）より内、f6 より外
// - 中 15：背景の魔物は、画面が渡す帯（G.foeBand）に収める（scene.js・scene_v2.js）
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ fail, ok }) => {
  let bad = 0;
  const f = (m) => { bad++; fail(m); };
  const dir = fileURLToPath(new URL("../../src/ui/", import.meta.url));
  const v9 = readFileSync(dir + "v9_pc.js", "utf8");
  const at = v9.indexOf('ev.key !== "Enter"');
  if (at < 0) f("U30: v9_pc.js の Enter の扱いが見つからない");
  else {
    const enter = v9.slice(at, v9.indexOf("});", at));
    if (/acts\(\)/.test(enter) || /\.focus\(/.test(enter)) f("U30: Enter で選択肢を押す・焦点を当てる書き方が残っている（早送りの連打で選ばれてしまう）");
  }
  const names = readdirSync(dir).filter((n) => n.endsWith(".js")).sort();
  const i = names.indexOf("zzzzzz_u30_hold.js");
  if (i < 0) f("U30: zzzzzz_u30_hold.js が無い");
  else if (!(names.indexOf("zzzzzz_f6_hold.js") < i && i < names.indexOf("zzzzzzz_f5_finish.js"))) f("U30: 知らせを預かる包みの読む順が f6 と f5 の間でない");
  for (const n of ["scene.js", "scene_v2.js"]) if (!/G\.foeBand/.test(readFileSync(dir + n, "utf8"))) f(`U30: ${n} が魔物の帯（G.foeBand）を見ていない`);
  if (!bad) ok("U30: Enter は選択肢を押さない・山場の知らせを預かる・魔物の帯");
};
