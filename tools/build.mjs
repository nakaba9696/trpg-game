// src/ を1枚の HTML（dist/morsveld.html）にまとめる。Artifact として公開するのはこのファイル。
// node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { listFiles } from "./files.mjs";
import { collectAssets, assetsScript } from "./assets.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "src");
const out = path.join(here, "..", "dist");
const { engine, ui } = listFiles(src); // manifest の順 → 無いものを名前順で足す → main.js（tools/files.mjs）
const files = [...engine, ...ui];
const assets = collectAssets(path.join(here, "..", "assets")); // 持ち主が作った画像（tools/assets.mjs・docs/art/）
assets.notes.forEach((n) => console.warn("画像：" + n));
const js = assetsScript(assets) + files.map((f) => `// ==== ${f}\n` + readFileSync(path.join(src, f), "utf8")).join("\n");
if (/<\/script/i.test(js)) throw new Error("スクリプトの中に </script が含まれている");
new vm.Script(js, { filename: "bundle.js" }); // 構文だけ確かめる

// 見た目は style.css のあとに、src/ui/ の .css を名前順に足す（新しい画面の見た目は新しいファイルに書ける。例：ui/v9_pc.css）
const uiCss = readdirSync(path.join(src, "ui")).filter((n) => n.endsWith(".css")).sort();
const css = [readFileSync(path.join(src, "style.css"), "utf8"), ...uiCss.map((n) => `/* ==== ui/${n} */\n` + readFileSync(path.join(src, "ui", n), "utf8"))].join("\n");
let html = readFileSync(path.join(src, "index.html"), "utf8");
html = html.replace("/*@STYLE@*/", () => css).replace("/*@SCRIPTS@*/", () => js);

mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "morsveld.html"), html);
console.log(`dist/morsveld.html ${(html.length / 1024).toFixed(0)} KB（${files.length} ファイル${assets.files.length ? `・画像 ${assets.files.length} 枚 ${(assets.total / 1024).toFixed(0)} KB` : ""}）`);
