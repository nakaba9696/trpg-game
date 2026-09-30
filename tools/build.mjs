// src/ を1枚の HTML（dist/kotodama.html）にまとめる。Artifact として公開するのはこのファイル。
// node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "src");
const out = path.join(here, "..", "dist");
const manifest = JSON.parse(readFileSync(path.join(src, "manifest.json"), "utf8"));

const files = [...manifest.engine, ...manifest.ui];
const js = files.map((f) => `// ==== ${f}\n` + readFileSync(path.join(src, f), "utf8")).join("\n");
if (/<\/script/i.test(js)) throw new Error("スクリプトの中に </script が含まれている");
new vm.Script(js, { filename: "bundle.js" }); // 構文だけ確かめる

const css = readFileSync(path.join(src, "style.css"), "utf8");
let html = readFileSync(path.join(src, "index.html"), "utf8");
html = html.replace("/*@STYLE@*/", () => css).replace("/*@SCRIPTS@*/", () => js);

mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "kotodama.html"), html);
console.log(`dist/kotodama.html ${(html.length / 1024).toFixed(0)} KB（${files.length} ファイル）`);
