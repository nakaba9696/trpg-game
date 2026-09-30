// src/ を1枚の HTML（dist/morsveld.html）にまとめる。Artifact として公開するのはこのファイル。
// node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { listFiles } from "./files.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "src");
const out = path.join(here, "..", "dist");
const { engine, ui } = listFiles(src); // manifest の順 → 無いものを名前順で足す → main.js（tools/files.mjs）
const files = [...engine, ...ui];
const js = files.map((f) => `// ==== ${f}\n` + readFileSync(path.join(src, f), "utf8")).join("\n");
if (/<\/script/i.test(js)) throw new Error("スクリプトの中に </script が含まれている");
new vm.Script(js, { filename: "bundle.js" }); // 構文だけ確かめる

const css = readFileSync(path.join(src, "style.css"), "utf8");
let html = readFileSync(path.join(src, "index.html"), "utf8");
html = html.replace("/*@STYLE@*/", () => css).replace("/*@SCRIPTS@*/", () => js);

mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "morsveld.html"), html);
console.log(`dist/morsveld.html ${(html.length / 1024).toFixed(0)} KB（${files.length} ファイル）`);
