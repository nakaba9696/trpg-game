// 読み込むファイルの順番を決める（tools/build.mjs と tests/lib.mjs が使う）。
// 1. src/manifest.json に書いてあるファイルを、書いてある順に読む（同じファイルは一度だけ）。
// 2. src/data/・src/engine/・src/ui/ にあって manifest に無い .js を、data → engine → ui、名前順で後ろに足す。
// 3. main.js（起動）は必ず最後。
// 新しいファイルは置くだけで読まれる。読む順番を指定したいときだけ manifest に書く。
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const AUTO = { engine: ["data", "engine"], ui: ["ui"] };
const LAST = "main.js";

export function listFiles(srcDir) {
  const manifest = JSON.parse(readFileSync(path.join(srcDir, "manifest.json"), "utf8"));
  const seen = new Set();
  const take = (list, f) => {
    if (seen.has(f)) return;
    if (!existsSync(path.join(srcDir, f))) throw new Error(`manifest.json の ${f} が無い`);
    seen.add(f);
    list.push(f);
  };
  const out = {};
  for (const part of ["engine", "ui"]) {
    const list = (out[part] = []);
    for (const f of manifest[part] || []) if (f !== LAST) take(list, f);
    for (const dir of AUTO[part]) {
      const abs = path.join(srcDir, dir);
      if (!existsSync(abs)) continue;
      const names = readdirSync(abs).filter((n) => n.endsWith(".js")).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      for (const n of names) take(list, `${dir}/${n}`);
    }
  }
  if (existsSync(path.join(srcDir, LAST))) take(out.ui, LAST);
  return out;
}
