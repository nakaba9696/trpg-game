// Q3: 読み込むファイルの自動追加（tools/files.mjs）
// - manifest に無い .js も data → engine → ui、名前順で読まれる。main.js は最後
// - manifest に書いたファイルは二重に読まない。manifest の順が先に効く
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { listFiles } from "../../tools/files.mjs";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default ({ fail }) => {
  // 仮の src で試す
  const dir = mkdtempSync(path.join(tmpdir(), "q3-"));
  try {
    for (const d of ["data", "engine", "ui"]) mkdirSync(path.join(dir, d));
    const put = (f) => writeFileSync(path.join(dir, f), "// " + f + "\n");
    ["data/a.js", "data/b.js", "data/z_new.js", "data/m_new.js", "engine/core.js", "engine/x_new.js",
      "ui/ui.js", "ui/n_new.js", "main.js"].forEach(put);
    writeFileSync(path.join(dir, "data", "notes.txt"), "js ではない");
    writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
      // 開いている PR が manifest に追記してきた形（z_new を書き足した・同じものを二度書いた・main.js の後ろに足した）
      engine: ["data/b.js", "data/a.js", "engine/core.js", "data/z_new.js", "data/a.js"],
      ui: ["ui/ui.js", "main.js", "ui/n_new.js"],
    }));
    const got = listFiles(dir);
    const wantEngine = ["data/b.js", "data/a.js", "engine/core.js", "data/z_new.js", "data/m_new.js", "engine/x_new.js"];
    const wantUi = ["ui/ui.js", "ui/n_new.js", "main.js"];
    if (!same(got.engine, wantEngine)) fail(`engine の順番が違う: ${got.engine.join(", ")}`);
    if (!same(got.ui, wantUi)) fail(`ui の順番が違う: ${got.ui.join(", ")}`);

    writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ engine: ["data/nothing.js"], ui: [] }));
    let threw = false;
    try { listFiles(dir); } catch { threw = true; }
    if (!threw) fail("manifest に存在しないファイルがあっても止まらない");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // 本物の src：重複なし、main.js が最後、engine に ui が混ざらない
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
  const real = listFiles(src);
  const all = [...real.engine, ...real.ui];
  if (new Set(all).size !== all.length) fail("同じファイルを二度読む");
  if (all[all.length - 1] !== "main.js") fail("main.js が最後でない");
  if (real.engine.some((f) => f.startsWith("ui/"))) fail("engine に ui/ のファイルが混ざる");
};
