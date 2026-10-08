// A6：外のファイルの形（dist/site/）で遊べるかを Playwright で確かめる（Chromium は PLAYWRIGHT_BROWSERS_PATH のもの。CI では動かさない）
// node tools/build.mjs && node tools/check_site.mjs [写真を書くフォルダ]（node tools/build.mjs --embed もしてあれば、1 枚の HTML の表情の入れ替えも見る）
// dist/site/ を簡単なローカルサーバで開き（と file:// でも）、立ち絵・差分・魔物の絵が画像で出るか、無い画像を読みに行かないか、読めない画像で絵を出さない（canvas の絵に戻らない。A10）かを見る
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, readdirSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }

const site = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "site");
if (!existsSync(path.join(site, "index.html"))) throw new Error("dist/site/index.html が無い（先に node tools/build.mjs）");
const shots = process.argv[2] || "";
if (shots) mkdirSync(shots, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json" };
const server = createServer((req, res) => {
  const p = path.join(site, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
  if (!p.startsWith(site) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

let failures = 0;
const fail = (m) => { failures++; console.log("FAIL " + m); };
const ok = (m) => console.log("OK   " + m);
const browser = await pw.chromium.launch();

async function play(url, label, { breakKey } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const bad = [], got = [];
  // 読み込みの失敗はページの外（Google Fonts など）もあるので、console では見ず、この一式のファイルだけ requestfailed で見る
  page.on("console", (m) => { if (m.type() === "error" && !/^Failed to load resource/.test(m.text())) bad.push("console: " + m.text()); });
  page.on("requestfailed", (r) => { const u = r.url(); if (u.startsWith(base) || u.startsWith("file:")) bad.push("読めない: " + u); });
  page.on("pageerror", (e) => bad.push("pageerror: " + e.message));
  page.on("response", (r) => { if (/\.(webp|png|jpe?g|svg)$/.test(r.url())) { got.push(r.url()); if (r.status() !== 200) bad.push(`${r.status()} ${r.url()}`); } });
  if (breakKey) await page.route("**/" + breakKey, (r) => r.abort());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
  const mode = await page.evaluate(() => G.ASSET_MODE);
  if (mode !== "files") fail(`${label}: G.ASSET_MODE が ${mode}`);
  await page.evaluate(() => {
    const D = G.data, stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "確かめ", sex: "女", age: 24, history: "確認用", personality: "無口" } });
    G.startEvent(G.data.EVENTS.find((e) => e.id === "c2_nora"));
    G.S.mood = null;
    G.ui.render();
  });
  // 立ち絵：画像が読めて、立ち絵の canvas に描かれている
  const standKey = () => page.evaluate(() => { const c = [...document.querySelectorAll("#stand canvas.standFace")].pop(); return c ? c.dataset.v8key : null; });
  const inked = () => page.evaluate(() => {
    const c = [...document.querySelectorAll("#stand canvas.standFace")].pop();
    if (!c) return -1;
    try { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 40) if (d[i] > 0) n++; return n / (d.length / 40); } catch (e) { return -2; }
  });
  try {
    await page.waitForFunction(() => G.v4Ready && G.v4Ready("nora"), null, { timeout: 5000 });
    await page.waitForTimeout(300);
    const k = await standKey(), ink = await inked();
    // A13：白い背景を消せた（cut の印）なら、背景の分だけ透明になる。http では消え、file:// では元の絵のまま
    const cut = await page.evaluate(() => { const c = [...document.querySelectorAll("#stand canvas.standFace")].pop(); return !!(c && c.classList.contains("cut")); });
    if (k !== "nora") fail(`${label}: 立ち絵の鍵が ${k}`);
    else if (ink !== -2 && ink < (cut ? 0.2 : 0.5)) fail(`${label}: 立ち絵の canvas がほとんど空（${ink}）`);
    else if (ink !== -2 && cut && ink > 0.9) fail(`${label}: 白い背景を消したはずが、canvas が埋まったまま（${ink}）`);
    else if (cut !== (ink !== -2)) fail(`${label}: 白い背景を消す（A13）が ${cut ? "画素を読めないのに効いた" : "画素を読めるのに効かない"}`);
    else ok(`${label}: 立ち絵（nora）を画像で描いた${ink === -2 ? "（file:// なので画素は読めない・背景は元の絵のまま）" : `（埋まり ${(ink * 100).toFixed(0)}%・白い背景を消した）`}`);
  } catch { fail(`${label}: 立ち絵 ${await page.evaluate(() => G.ASSETS["portraits/nora"])} が読めない`); }
  if (shots) await page.screenshot({ path: path.join(shots, `${label}_stand.jpg`), type: "jpeg", quality: 75 });
  // 差分：表情が変わると、読み終わってから顔が入れ替わる
  await page.evaluate(() => { G.S.mood = "joy"; G.ui.render(); });
  try {
    await page.waitForFunction(() => { const c = [...document.querySelectorAll("#stand canvas.standFace")].pop(); return c && c.dataset.v8key === "nora_joy" && G.v4Ready("nora_joy"); }, null, { timeout: 5000 });
    await page.waitForTimeout(500);
    const n = await page.evaluate(() => document.querySelectorAll("#stand canvas.standFace").length);
    if (n !== 1) fail(`${label}: 差分に入れ替えたあと、顔が ${n} 枚重なっている`);
    else ok(`${label}: 差分（nora_joy）に入れ替えた`);
  } catch { fail(`${label}: 差分 portraits/nora_joy.webp に入れ替わらない`); }
  if (shots) await page.screenshot({ path: path.join(shots, `${label}_joy.jpg`), type: "jpeg", quality: 75 });
  // 差分のスプライト（A8）：表情を順に替え、どれも 1 人 1 枚のスプライト（portraits/nora.moods.svg）から切り出して、違う顔を描く
  if (await page.evaluate(() => /#xywh=/.test(G.ASSETS["portraits/nora_joy"] || ""))) {
    const prints = {};
    for (const m of ["joy", "anger", "sorrow", "fun", null]) {
      await page.evaluate((m) => { G.S.mood = m; G.ui.render(); }, m);
      const want = m ? "nora_" + m : "nora";
      try {
        // V5 の立ち絵（狭い画面）と、PC の配置（V9）で話している人の顔の両方が、その表情になる
        await page.waitForFunction((k) => {
          const c = [...document.querySelectorAll("#stand canvas.standFace")], v9 = document.querySelector(".v9fig.speaker canvas.v9face");
          return c.length === 1 && c[0].dataset.v8key === k && (!v9 || v9.dataset.v8key === k) && G.v4Ready(k);
        }, want, { timeout: 5000 });
        await page.waitForTimeout(250);
        // 見えている顔の写し（file:// でも撮れる）。PC の配置なら V9 の顔、無ければ V5 の立ち絵
        const face = page.locator(".v9fig.speaker canvas.v9face, #stand canvas.standFace").filter({ visible: true }).first();
        prints[want] = createHash("sha1").update(await face.screenshot()).digest("hex");
      } catch { fail(`${label}: 表情 ${want} に入れ替わらない`); }
      if (shots && m) await page.screenshot({ path: path.join(shots, `${label}_${m}.jpg`), type: "jpeg", quality: 75 });
    }
    const vals = Object.values(prints);
    if (vals.length === 5 && new Set(vals).size !== 5) fail(`${label}: 表情を替えても同じ顔が描かれた（スプライトの切り出しが違う）`);
    if (!got.some((u) => /portraits\/nora\.moods\.svg$/.test(u))) fail(`${label}: スプライト portraits/nora.moods.svg を読みに行っていない`);
    else if (got.some((u) => /portraits\/nora_(joy|anger|sorrow|fun)\.webp$/.test(u))) fail(`${label}: スプライトにまとめた差分を 1 枚ずつ読みに行った`);
    else ok(`${label}: 喜怒哀楽と基本の絵を、スプライト（nora.moods.svg）から切り出して描き分けた`);
  }
  // 魔物：戦闘でゴブリンの絵を読む
  await page.evaluate(() => { G.S.mood = null; G.S.mode = "explore"; G.S.event = null; G.startCombat(["goblin"]); G.ui.render(); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => G.ui.render());
  await page.waitForTimeout(400);
  // 魔物の絵は 25 枚ずつのスプライト（monsters/packs/*.svg。A12）の升目のこともある
  const gob = await page.evaluate(() => String(G.ASSETS["monsters/goblin"] || "").replace(/#.*$/, ""));
  if (gob && got.some((u) => u.endsWith("/" + gob))) ok(`${label}: 魔物の絵（goblin）を読んだ（${gob}）`);
  else fail(`${label}: 魔物の絵 ${gob || "monsters/goblin"} を読みに行かない`);
  if (shots) await page.screenshot({ path: path.join(shots, `${label}_combat.jpg`), type: "jpeg", quality: 75 });
  // 無い画像を読みに行かない
  const listed = await page.evaluate(() => Object.values(G.ASSETS).map((v) => v.replace(/#.*$/, ""))); // 差分はスプライトの「#xywh=」
  const extra = got.filter((u) => !listed.some((p) => u.endsWith("/" + p)));
  if (extra.length) fail(`${label}: 一覧に無い画像を読みに行った：${extra.slice(0, 3).join(" ")}`);
  if (breakKey) bad.splice(0, bad.length, ...bad.filter((b) => !b.includes(breakKey)));
  bad.forEach((b) => fail(`${label}: ${b}`));
  await page.close();
  return { page, got };
}

await play(base, "http");
await play(pathToFileURL(path.join(site, "index.html")).href, "file");
// 予備の 1 枚の HTML（node tools/build.mjs --embed → dist/morsveld.html）があれば、そこでも表情が入れ替わる（差分は data URI のまま。スプライトにはしない）
const one = path.join(site, "..", "morsveld.html");
if (existsSync(one)) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const bad = [];
  page.on("pageerror", (e) => bad.push(e.message));
  await page.goto(pathToFileURL(one).href);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
  await page.evaluate(() => {
    const D = G.data, stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "確かめ", sex: "女", age: 24, history: "確認用", personality: "無口" } });
    G.startEvent(G.data.EVENTS.find((e) => e.id === "c2_nora")); G.S.mood = null; G.ui.render();
  });
  const mode = await page.evaluate(() => G.ASSET_MODE);
  const want = await page.evaluate(() => (G.ASSETS["portraits/nora_joy"] ? "nora_joy" : "nora"));
  await page.evaluate(() => { G.S.mood = "joy"; G.ui.render(); });
  try {
    await page.waitForFunction((k) => { const c = [...document.querySelectorAll("#stand canvas.standFace")]; return c.length === 1 && c[0].dataset.v8key === k && G.v4Ready(k); }, want, { timeout: 5000 });
    ok(`embed（${mode}）: 表情（${want}）に入れ替えた${want === "nora" ? "（差分は上限で省かれている）" : ""}`);
  } catch { fail(`embed: 表情 ${want} に入れ替わらない`); }
  if (shots) await page.screenshot({ path: path.join(shots, "embed_joy.jpg"), type: "jpeg", quality: 75 });
  bad.forEach((b) => fail("embed: " + b));
  await page.close();
}
// 読めない画像：絵を出さない（canvas の絵に戻らない。A10）。nora の基本の絵のファイル（スプライトなら、そのスプライト。A12）を読めなくする
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const html = readFileSync(path.join(site, "index.html"), "utf8") + readdirSync(site).filter((n) => /^game(-\d+)?\.js$/.test(n)).map((n) => readFileSync(path.join(site, n), "utf8")).join("\n"); // コードは game.js に分けてある（T）
  const noraFile = String((JSON.parse((/G\.ASSETS = (\{[^\n]*\});/.exec(html) || [, "{}"])[1])["portraits/nora"]) || "portraits/nora.webp").replace(/#.*$/, "");
  await page.route("**/" + noraFile, (r) => r.abort());
  await page.goto(base);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
  await page.evaluate(() => {
    const D = G.data, stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "確かめ", sex: "女", age: 24, history: "確認用", personality: "無口" } });
    G.startEvent(G.data.EVENTS.find((e) => e.id === "c2_nora")); G.S.mood = null; G.ui.render();
  });
  await page.waitForTimeout(800);
  const ink = await page.evaluate(() => {
    const cs = [...document.querySelectorAll("#stand canvas.standFace, .v9fig canvas.v9face")];
    let n = 0, all = 0;
    for (const c of cs) { if (c.classList.contains("noart")) continue; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 40) { all++; if (d[i] > 0) n++; } }
    return all ? n / all : 0;
  });
  if (ink < 0.01) ok("読めない画像：絵を出さない（canvas の絵に戻らない）");
  else fail(`読めない画像のとき、何かを描いた（${ink}）`);
  if (shots) await page.screenshot({ path: path.join(shots, `broken_stand.jpg`), type: "jpeg", quality: 75 });
  await page.close();
}
await browser.close();
server.close();
console.log(failures ? `FAILED ${failures}` : "DONE");
process.exit(failures ? 1 : 0);
