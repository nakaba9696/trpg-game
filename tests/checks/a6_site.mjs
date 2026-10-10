// A6：画像を HTML の外に出す形（dist/site/。tools/build.mjs・tools/assets.mjs・tools/site.mjs・docs/publish.md）
// - assets/ の画像が Artifact の決まりに収まる（index.html 16MB 未満・1 枚 15MB 未満・全体 256MB 未満・511 ファイルまで）。1 回の公開（250 ファイル・60MB の目安）を超えるなら分けて載せる案内を出す
// - 回ごとの分け方：どの回も目安に収まり、全部の画像がちょうど一度ずつ載る
// - 外のファイルの一覧：鍵 → 相対パス・バイト数。G.ASSET_MODE が "files"
// - 予備の埋め込み（--embed）：上限を超えるなら差分を省く（それでも超えるなら背景、大きい絵の順。A20）
// - 絵の部品：外のファイルの相対パスをそのまま読み、読めなければ絵を出さない（A10）。魔物の先読みは起動の後に回す
// - ビルドしてあれば（dist/site/）：index.html に画像が埋め込まれていない、files.json のファイルがすべてある、HTML の一覧と合う
import { readFileSync, existsSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import vm from "node:vm";
import path from "node:path";
import { siteAssets, collectAssets, assetsScript, isVariant } from "../../tools/assets.mjs";
import { planSite, SITE_LIMITS, MB } from "../../tools/site.mjs";

export default ({ G, fail, ok }) => {
  const root = new URL("../../", import.meta.url).pathname;
  const before = [];
  const F = (m) => { before.push(m); fail("A6 " + m); };

  // ---------------------------------------------------------------- 分け方（作った数字で）
  const mk = (n, bytes) => Array.from({ length: n }, (_, i) => ({ pub: `portraits/p${i}.webp`, local: `dist/site/portraits/p${i}.webp`, bytes }));
  const covers = (plan, list) => {
    const seen = plan.batches.flatMap((b) => Object.keys(b.files));
    return seen.length === list.length && new Set(seen).size === list.length && list.every((f) => seen.includes(f.pub));
  };
  {
    const list = mk(300, 30 * 1024);
    const p = planSite({ pageBytes: 3 * MB, files: list });
    if (p.errors.length) F("300 枚の小さな画像で止まった：" + p.errors.join("／"));
    if (p.batches.length !== 2) F(`301 ファイルを ${p.batches.length} 回に分けた（2 回のはず）`);
    if (p.batches.some((b) => b.count > SITE_LIMITS.batchFiles || b.bytes > SITE_LIMITS.batchBytes)) F("1 回の公開の目安を超える回がある");
    if (!covers(p, list)) F("分けた回に、載らない画像か二度載る画像がある");
  }
  {
    const list = mk(11, 25 * MB);
    const p = planSite({ pageBytes: 2 * MB, files: list });
    if (p.batches.length !== 6 || p.batches.some((b) => b.bytes > SITE_LIMITS.batchBytes)) F(`25MB の画像 11 枚の分け方が違う（${p.batches.map((b) => (b.bytes / MB).toFixed(0)).join("・")}MB）`);
    if (!p.errors.some((e) => e.includes("1 ファイル"))) F("15MB を超える画像で止まらない");
    if (!p.errors.some((e) => e.includes("合計"))) F("256MB を超えても止まらない");
  }
  if (!planSite({ pageBytes: 17 * MB, files: [] }).errors.length) F("index.html が 16MB を超えても止まらない");
  if (!planSite({ pageBytes: MB, files: mk(520, 1000) }).errors.some((e) => e.includes("511"))) F("511 ファイルを超えても止まらない");
  if (planSite({ pageBytes: MB, files: mk(10, 1000) }).batches.length !== 1) F("小さな一式を分けた");

  // ---------------------------------------------------------------- 外のファイルの一覧と、予備の埋め込みの縮め方（作ったフォルダで）
  const dir = mkdtempSync(path.join(tmpdir(), "a6-"));
  try {
    mkdirSync(path.join(dir, "portraits")); mkdirSync(path.join(dir, "monsters"));
    writeFileSync(path.join(dir, "portraits", "nora.webp"), Buffer.alloc(3000, 1));
    writeFileSync(path.join(dir, "portraits", "nora_joy.webp"), Buffer.alloc(3000, 2));
    writeFileSync(path.join(dir, "monsters", "goblin.webp"), Buffer.alloc(1000, 3));
    const s = siteAssets(dir);
    if (s.map["portraits/nora"] !== "portraits/nora.webp" || s.map["monsters/goblin"] !== "monsters/goblin.webp") F(`外のファイルのパスが違う：${JSON.stringify(s.map)}`);
    if (s.bytes["portraits/nora_joy"] !== 3000 || s.total !== 7000) F("外のファイルのバイト数が違う");
    const c = vm.createContext({});
    vm.runInContext(assetsScript(s), c);
    if (!c.G || c.G.ASSET_MODE !== "files" || c.G.ASSETS["portraits/nora"] !== "portraits/nora.webp" || c.G.ASSET_BYTES["monsters/goblin"] !== 1000) F("外のファイルの一覧を G から引けない");
    const e = collectAssets(dir);
    const c2 = vm.createContext({});
    vm.runInContext(assetsScript(e), c2);
    if (c2.G.ASSET_MODE !== "embed" || !String(c2.G.ASSETS["portraits/nora"]).startsWith("data:")) F("埋め込みの形の印か中身が違う");
    const small = collectAssets(dir, { limit: Math.ceil(e.total * 0.8), shrink: true });
    if (small.map["portraits/nora_joy"] || !small.map["portraits/nora"] || small.dropped.join() !== "portraits/nora_joy") F("埋め込みが上限を超えるとき、差分だけを省いていない");
    // A20：差分を省いても超えるなら、大きい絵から省く（予備の HTML ではその人・敵は絵なし）
    const tiny = collectAssets(dir, { limit: Math.ceil(e.total * 0.5), shrink: true });
    if (tiny.dropped.join() !== "portraits/nora_joy,portraits/nora" || !tiny.map["monsters/goblin"] || tiny.total > e.total * 0.5) F(`差分を省いても上限を超えるとき、大きい絵から省いていない（${tiny.dropped.join()}）`);
    let threw = false;
    try { collectAssets(dir, { limit: 100 }); } catch { threw = true; }
    if (!threw) F("縮めない埋め込みが上限を超えるのに止まらない");
    if (!isVariant("portraits/nora_sorrow") || isVariant("portraits/nora") || isVariant("monsters/x_joy")) F("差分の見分け方が違う");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------- 絵の部品：外のファイルを読む
  const loaded = [];
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.ls = {}; loaded.push(this); }
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    set src(v) { this._src = v; }
    get src() { return this._src; }
    fire(t) { if (t !== "error") { this.complete = true; this.naturalWidth = 512; this.naturalHeight = 640; } (this.ls[t || "load"] || []).forEach((f) => f()); }
  }
  const calls = [];
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? () => grad : (...a) => calls.push([k, a])), set: (t, k, v) => ((t[k] = v), true) });
  const timers = [];
  const g = { data: G.data, ASSET_MODE: "files", ASSETS: { "portraits/kind_priest_f": "portraits/kind_priest_f.webp", "portraits/kind_priest_f_joy": "portraits/kind_priest_f_joy.webp", "monsters/goblin": "monsters/goblin.webp" } };
  for (const k of ["eventWho", "companionWho", "heroWho", "facWho"]) if (G[k]) g[k] = G[k];
  const vmc = vm.createContext({ console, G: g, Image: FakeImage, setTimeout: (f) => timers.push(f) });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v6_monsters.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  if (loaded.some((i) => String(i.src).startsWith("monsters/"))) F("外のファイルの形で、魔物の絵を起動と同時に読み始めた（少し後に回す）");
  timers.splice(0).forEach((f) => f());
  if (!loaded.some((i) => i.src === "monsters/goblin.webp")) F("魔物の絵を後から先読みしていない");
  const who = { kind: "priest", sex: "女", age: 30, seed: "a6:test" };
  if (g.v4PortraitKey(who) !== "kind_priest_f") F(`外のファイルの形で型の鍵を選べない：${g.v4PortraitKey(who)}`);
  loaded.length = 0;
  g.v4Preload(who);
  const srcs = loaded.map((i) => i.src).sort().join();
  if (srcs !== "portraits/kind_priest_f.webp,portraits/kind_priest_f_joy.webp") F(`先読みが違う（その人の絵と差分）：${srcs}`);
  const face = () => ({ width: 96, height: 120, getBoundingClientRect: () => ({ width: 96, height: 120 }), getContext: () => ctx });
  // 読み込み中：枠を空けて待つ。読めたら画像
  calls.length = 0;
  const cv = face();
  g.drawPortrait(cv, who);
  if (calls.some(([k]) => k === "drawImage")) F("読み込みの前に画像を描いた");
  if (calls.some(([k]) => k === "fill" || k === "arc")) F("外のファイルを待つあいだに、canvas の絵を描いた");
  loaded[0].fire();
  if (!calls.some(([k]) => k === "drawImage")) F("外のファイルを読んだあと画像を描いていない");
  calls.length = 0;
  timers.splice(0).forEach((f) => f());
  if (calls.length) F("画像を描いたあとに、待ちの時間切れで何かを上に描いた");
  // 読めないファイル：絵を出さない（canvas の絵に戻らない。A10）
  g.ASSETS["portraits/kind_priest_m"] = "portraits/kind_priest_m.webp";
  loaded.length = 0; calls.length = 0;
  g.drawPortrait(face(), { kind: "priest", sex: "男", age: 30, seed: "a6:m" });
  const bad = loaded.find((i) => i.src === "portraits/kind_priest_m.webp");
  if (!bad) F("外のファイルの相対パスを読みに行っていない");
  else {
    bad.fire("error");
    if (calls.some(([k]) => k !== "clearRect" && k !== "setTransform")) F("読めない外のファイルのとき、canvas の絵を描いた（絵を出さないはず）");
  }

  // ---------------------------------------------------------------- 本物の assets/ の大きさ
  const real = siteAssets(path.join(root, "assets"));
  const page = path.join(root, "dist/site/index.html");
  const gameJs = path.join(root, "dist/site/game.js"); // コード（T）。最初の回にページと一緒に載るので、ページの分に足して見積もる
  // 10MB を超えると game-2.js… に分かれる（tools/build.mjs）。分かれた分は別ファイルとして一覧に入る
  const codeChunks = existsSync(path.join(root, "dist/site")) ? readdirSync(path.join(root, "dist/site")).filter((n) => /^game-\d+\.js$/.test(n)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5))) : [];
  const pageBytes = existsSync(page) ? statSync(page).size + (existsSync(gameJs) ? statSync(gameJs).size : 0) : 4 * MB; // ビルドしていなければ大きめに見積もる
  const list = codeChunks.map((n) => ({ pub: n, local: "dist/site/" + n, bytes: statSync(path.join(root, "dist/site", n)).size })).concat(real.files.map((f) => ({ pub: f.pub, local: "dist/site/" + f.pub, bytes: f.bytes })));
  const plan = planSite({ pageBytes, files: list });
  plan.errors.forEach((e) => F("Artifact に載らない：" + e));
  if (!covers(plan, list)) F("本物の画像の分け方に、載らない画像か二度載る画像がある");
  if (plan.count > SITE_LIMITS.versionFiles * 0.9) console.log(`NOTE A6：ページと画像で ${plan.count} ファイル（1 つの版の上限 ${SITE_LIMITS.versionFiles} に近い）`);

  // ---------------------------------------------------------------- ビルドしてあれば、その中身
  let built = "";
  if (existsSync(page)) {
    // コードは dist/site/game.js に分けてある（T。node tools/build.mjs --inline なら HTML の中）
    const html0 = readFileSync(page, "utf8");
    const tag = /<script src="game\.js(\?v=[0-9a-f]+)?"><\/script>/.exec(html0);
    const gjs = gameJs;
    if (tag && !existsSync(gjs)) F("index.html が game.js を読むのに、dist/site/game.js が無い");
    const html = tag && existsSync(gjs) ? [html0, readFileSync(gjs, "utf8"), ...codeChunks.map((n) => readFileSync(path.join(root, "dist/site", n), "utf8"))].join("\n") : html0;
    codeChunks.forEach((n) => { if (!new RegExp(`<script src="${n.replace(".", "\\.")}(\\?v=[0-9a-f]+)?"></script>`).test(html0)) F(`dist/site/${n} があるのに index.html が読んでいない`); });
    if (/data:image\/(webp|png|jpeg);base64/.test(html)) F("dist/site/index.html に画像が埋め込まれている（外のファイルにする）");
    const m = /G\.ASSETS = (\{[^\n]*\});/.exec(html);
    const map = m ? JSON.parse(m[1]) : {};
    if (real.files.length && !m) F("dist/site/index.html に画像の一覧が無い");
    const fj = path.join(root, "dist/site/files.json");
    const files = existsSync(fj) ? JSON.parse(readFileSync(fj, "utf8")) : null;
    if (!files) F("dist/site/files.json が無い");
    else {
      for (const [pub, local] of Object.entries(files)) {
        if (!existsSync(path.join(root, local))) F(`files.json の ${local} が無い`);
        if (local !== "dist/site/" + pub) F(`files.json の ${pub} のローカルパスが違う：${local}`);
      }
      if (tag && files["game.js"] !== "dist/site/game.js") F("files.json に game.js（コード）が無い");
      if (tag && plan.batches.length > 1 && existsSync(path.join(root, "dist/site/files-1.json")) && !JSON.parse(readFileSync(path.join(root, "dist/site/files-1.json"), "utf8"))["game.js"]) F("最初の回の公開（files-1.json）に game.js が無い（ページだけ載って動かない）");
      const want = [...new Set(Object.values(map).map((v) => v.replace(/#.*$/, "")))].sort().join(), have = Object.keys(files).filter((k) => !/^game(-\d+)?\.js$/.test(k)).sort().join(); // 差分はスプライトの「#xywh=」（A8）
      if (want !== have) F("files.json と HTML の画像の一覧が合わない（ビルドし直す）");
    }
    if (plan.batches.length > 1) for (let i = 1; i <= plan.batches.length; i++) if (!existsSync(path.join(root, `dist/site/files-${i}.json`))) F(`分けて載せる一覧 files-${i}.json が無い`);
    built = `・${tag ? "index.html＋game.js" : "index.html"} ${(pageBytes / MB).toFixed(1)}MB`;
  }
  if (!before.length) ok(`A6 外のファイルの形：画像 ${real.files.length} 枚 ${(real.total / MB).toFixed(1)}MB${built}・合計 ${plan.count} ファイル・${plan.batches.length} 回で載る${plan.batches.length > 1 ? "（dist/site/files-N.json を順に。docs/publish.md）" : ""}`);
};
