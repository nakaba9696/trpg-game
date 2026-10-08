// src/ を HTML にまとめる。形は二つ（どちらもコードと CSS は 1 枚の HTML に入れる）：
//   node tools/build.mjs          … 既定。dist/site/index.html ＋ 画像の別ファイル（dist/site/portraits/<id>.webp・monsters/<id>.webp）。
//                                   表情の差分は 1 人 1 枚（dist/site/portraits/<id>.moods.svg）、背景は組ごとに 1 枚（dist/site/scenes/<組>.svg。A11）にまとめる（1 つの版は 511 ファイルまでのため）
//                                   HTML には画像の一覧（鍵 → 相対パス・バイト数）だけを入れ、無い画像は読みに行かない。
//                                   Artifact に載せるファイルの一覧（公開パス → ローカルパス）を dist/site/files.json に書く（載せ方は docs/publish.md）
//                                   コード（JS）は隣の dist/site/game.js に分けて、HTML から <script src="game.js?v=…"> で読む（T。10MB のコードを
//                                   ページの中に書くと、読み込みのあいだ画面が固まる。別のファイルならブラウザが裏で読み、2 回目からは覚えておいた結果を使う）
//   node tools/build.mjs --inline … 今まで通りコードも 1 枚の HTML に入れる（画像は別ファイルのまま）
//   node tools/build.mjs --embed  … 予備。今まで通り画像を埋め込んだ 1 枚の dist/morsveld.html（上限を超えるなら差分を省く）
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { listFiles } from "./files.mjs";
import { collectAssets, siteAssets, assetsScript } from "./assets.mjs";
import { planSite, SITE_LIMITS, MB } from "./site.mjs";
import { stripLineComments } from "./strip.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const src = path.join(root, "src");
const out = path.join(root, "dist");
const embed = process.argv.includes("--embed");
const inline = embed || process.argv.includes("--inline"); // コードを HTML に入れる（既定は dist/site/game.js に分ける。T）
const { engine, ui } = listFiles(src); // manifest の順 → 無いものを名前順で足す → main.js（tools/files.mjs）
const files = [...engine, ...ui];
const assetsDir = path.join(root, "assets"); // 持ち主が作った画像（tools/assets.mjs・docs/art/）
const assets = embed ? collectAssets(assetsDir, { shrink: true }) : siteAssets(assetsDir);
assets.notes.forEach((n) => console.warn("画像：" + n));
// 行まるごとのコメントは落とす（game.js が Artifact の 1 ファイルの上限 15MB に届いたため。tools/strip.mjs・tests/checks/t3_strip.mjs）
const js = assetsScript(assets) + files.map((f) => `// ==== ${f}\n` + stripLineComments(readFileSync(path.join(src, f), "utf8"))).join("\n");
if (/<\/script/i.test(js)) throw new Error("スクリプトの中に </script が含まれている");
new vm.Script(js, { filename: "bundle.js" }); // 構文だけ確かめる

// 見た目は style.css のあとに、src/ui/ の .css を名前順に足す（新しい画面の見た目は新しいファイルに書ける。例：ui/v9_pc.css）
const uiCss = readdirSync(path.join(src, "ui")).filter((n) => n.endsWith(".css")).sort();
const css = [readFileSync(path.join(src, "style.css"), "utf8"), ...uiCss.map((n) => `/* ==== ui/${n} */\n` + readFileSync(path.join(src, "ui", n), "utf8"))].join("\n");
let html = readFileSync(path.join(src, "index.html"), "utf8");
html = html.replace("/*@STYLE@*/", () => css);
// 分けるときは、版ごとに名前の後ろを変える（前の版の game.js を覚えたブラウザが、新しいページと古いコードを混ぜないように）
const jsTag = inline ? null : `<script src="game.js?v=${createHash("sha1").update(js).digest("hex").slice(0, 10)}"></script>`;
html = inline ? html.replace("/*@SCRIPTS@*/", () => js) : html.replace(/<script>\s*\/\*@SCRIPTS@\*\/\s*<\/script>/, () => jsTag);
if (!inline && !html.includes(jsTag)) throw new Error("src/index.html に <script>/*@SCRIPTS@*/</script> が無い");
const htmlBytes = Buffer.byteLength(html);
const kb = (n) => (n / 1024).toFixed(0) + " KB";

mkdirSync(out, { recursive: true });
if (embed) {
  if (htmlBytes >= SITE_LIMITS.page) throw new Error(`dist/morsveld.html が ${(htmlBytes / MB).toFixed(1)}MB で、Artifact の 1 ページの上限 ${SITE_LIMITS.page / MB}MB を超える`);
  writeFileSync(path.join(out, "morsveld.html"), html);
  console.log(`dist/morsveld.html ${kb(htmlBytes)}（${files.length} ファイル${assets.files.length ? `・画像 ${assets.files.length} 枚 ${kb(assets.total)}` : ""}${assets.dropped.length ? `・差分 ${assets.dropped.length} 枚を省いた` : ""}）`);
} else {
  const site = path.join(out, "site");
  rmSync(site, { recursive: true, force: true });
  mkdirSync(site, { recursive: true });
  writeFileSync(path.join(site, "index.html"), html);
  const rel = (abs) => path.relative(root, abs).split(path.sep).join("/");
  // コード（T）。最初の回の公開にページと一緒に載るよう、一覧の先頭に置く
  const code = [];
  if (!inline) {
    writeFileSync(path.join(site, "game.js"), js);
    code.push({ pub: "game.js", local: rel(path.join(site, "game.js")), bytes: Buffer.byteLength(js) });
  }
  const list = code.concat(assets.files.map((f) => {
    const dest = path.join(site, ...f.pub.split("/"));
    mkdirSync(path.dirname(dest), { recursive: true });
    if (f.data) writeFileSync(dest, f.data); // 差分をまとめたスプライト（tools/assets.mjs の siteAssets）
    else copyFileSync(f.abs, dest);
    return { pub: f.pub, local: rel(dest), bytes: f.bytes };
  }));
  const plan = planSite({ pageBytes: htmlBytes, files: list });
  if (plan.errors.length) throw new Error("Artifact に載らない：" + plan.errors.join("／"));
  // 載せるファイルの一覧（公開パス → リポジトリの根からのローカルパス）。1 回で載らないときは回ごとの一覧も書く
  writeFileSync(path.join(site, "files.json"), JSON.stringify(Object.fromEntries(list.map((f) => [f.pub, f.local])), null, 1) + "\n");
  if (plan.batches.length > 1) plan.batches.forEach((b, i) => writeFileSync(path.join(site, `files-${i + 1}.json`), JSON.stringify(b.files, null, 1) + "\n"));
  // A12 より前に載せた Artifact を新しくするとき、1 枚ずつ載せていた基本の立ち絵・魔物の絵を消す一覧（公開パス → null）。1 回 250 個までずつ（docs/publish.md）
  const gone = assets.gone || [];
  for (let i = 0; i * SITE_LIMITS.batchFiles < gone.length; i++) writeFileSync(path.join(site, `gone-${i + 1}.json`), JSON.stringify(Object.fromEntries(gone.slice(i * SITE_LIMITS.batchFiles, (i + 1) * SITE_LIMITS.batchFiles).map((p) => [p, null])), null, 1) + "\n");
  console.log(`dist/site/index.html ${kb(htmlBytes)}（${files.length} ファイル${inline ? "" : `・コードは game.js ${kb(code[0].bytes)}`}）＋ 画像 ${list.length - code.length} 枚 ${kb(assets.total)}（合計 ${(plan.total / MB).toFixed(1)}MB・${plan.count} ファイル／1 つの版の上限 ${SITE_LIMITS.versionFiles}）`);
  if (assets.sprites) console.log(`  表情の差分 ${assets.merged} 枚を ${assets.sprites} 人分のスプライト（portraits/<id>.moods.svg）にまとめた`);
  if (assets.artPacks) console.log(`  基本の立ち絵と魔物の絵 ${assets.artMerged} 枚を ${assets.artPacks} 枚のスプライト（portraits/packs/・monsters/packs/）にまとめた`);
  if (assets.scenePacks) console.log(`  背景 ${assets.sceneMerged} 枚を ${assets.scenePacks} 組のスプライト（scenes/<組>.svg）にまとめた`);
  if (gone.length) console.log(`  前に 1 枚ずつ載せた Artifact を新しくするなら、先に dist/site/gone-1.json 〜 gone-${Math.ceil(gone.length / SITE_LIMITS.batchFiles)}.json で ${gone.length} 個を消す（docs/publish.md）`);
  if (plan.batches.length > 1) console.log(`  1 回の公開（${SITE_LIMITS.batchFiles} ファイル・${SITE_LIMITS.batchBytes / MB}MB まで）に収まらないので ${plan.batches.length} 回に分けて載せる：dist/site/files-1.json 〜 files-${plan.batches.length}.json（docs/publish.md）`);
}
