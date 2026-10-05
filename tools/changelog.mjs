// U18：CHANGELOG.md を src/data/changelog.js から作る（node tools/changelog.mjs）。画面の更新履歴と同じ中身。
// 「次の版」（next: true）は、項目があるときだけ「次の版（未公開）」として載せる。ずれは tests/checks/u18_changelog.mjs が見つける
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const changelogPath = path.join(root, "CHANGELOG.md");

export function readChangelog() {
  const ctx = vm.createContext({});
  for (const f of ["src/data/version.js", "src/data/changelog.js"]) vm.runInContext(readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  return { version: ctx.G.data.VERSION, entries: ctx.G.data.CHANGELOG };
}

export function renderChangelog({ entries } = readChangelog()) {
  const out = ["# 更新履歴", "", "ゲームの中の「更新履歴」と同じ中身です。このファイルは `src/data/changelog.js` から `node tools/changelog.mjs` で作ります（手で書き換えない）。", ""];
  for (const e of entries) {
    if (e.next && !(e.items || []).length) continue;
    out.push(e.next ? "## 次の版（未公開）" : `## v${e.ver}${e.date ? `（${e.date}）` : ""}`, "");
    for (const t of e.items || []) out.push(`- ${t}`);
    out.push("");
  }
  return out.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(changelogPath, renderChangelog());
  console.log("CHANGELOG.md を書いた");
}
