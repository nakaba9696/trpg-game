// V3：書き足した文（src/data/zv3_*.js）に、AI っぽい文の癖（docs/VISION.md の「避ける癖」）が多すぎない。
// 読点（一文あたり）にも上限をかける（V4）。数え方は tools/prose_lint.mjs。既存の全体は落とさない（node tools/prose_lint.mjs で見るだけ）。
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintFile } from "../../tools/prose_lint.mjs";

const RATE = 2.5;   // 癖の語、千字あたり（全体の今は約 9）
const DOTS = 2.0;   // 「……」、千字あたり
const COMMA = 0.6;  // 読点、一文あたり（V4。全体の今は約 0.7）
const MIN = 500;    // これより文の少ないファイルは率がぶれるので見ない

export default ({ fail, ok }) => {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "data");
  const files = readdirSync(dir).filter((f) => /^zv3_.*\.js$/.test(f));
  let n = 0;
  for (const f of files) {
    const r = lintFile(path.join(dir, f));
    if (r.chars < MIN) continue;
    n++;
    if (r.rate > RATE) fail(`文の癖が多い ${f}：千字あたり ${r.rate.toFixed(2)}（上限 ${RATE}）${JSON.stringify(r.counts)}`);
    if (r.perSent > COMMA) fail(`読点が多い ${f}：一文あたり ${r.perSent.toFixed(2)}（上限 ${COMMA}）`);
    if (r.dots > DOTS) fail(`「……」が多い ${f}：千字あたり ${r.dots.toFixed(2)}（上限 ${DOTS}）`);
  }
  if (!n) fail("V3 の文のファイルが見つからない");
  ok(`V3 の文の癖（${n} ファイル・千字あたり ${RATE} まで・「……」${DOTS} まで・読点は一文あたり ${COMMA} まで）`);
};
