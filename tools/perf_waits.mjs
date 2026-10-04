// T3：プレイヤーが「待たされる」所を測る（Playwright。重いので CI では回さない）
// node tools/build.mjs && node tools/perf_waits.mjs [--net fast|slow|none] [--slow] [--out 書き出すJSON]
//   dist/site/ をローカルサーバで開き、回線を絞って（CDP の Network.emulateNetworkConditions。初めて開いた人と同じく、覚えた物は無し）、
//   ・初回ロード：ページを開いてから、タイトルが動くまで／タイトルの背景の写真が出るまで
//   ・開始直後：冒険を始めてから、最初の町の背景の写真が出るまで
//   ・人物の絵：人の出てくる出来事を始めてから、その人の立ち絵（白い背景を消したもの）が出るまで
//   ・魔物の絵：最初の戦闘を始めてから、魔物の絵が出るまで（その場所に出る魔物で）
//   ・長く遊ぶ：手番を重ねたときの JS のメモリ・DOM の数・ログの行数・保存の大きさの増え方
//   を、それぞれ「何 ms 待ったか」と「そのあいだに何 KB 読んだか」で出す。--slow は CPU を 4 倍遅く（スマホ相当）。
//   回線：fast＝下り 10Mbps・往復 40ms（ふつうの光回線の Wi-Fi より遅めの 4G 相当）、slow＝下り 1.6Mbps・往復 150ms（遅い 4G／混んだ回線）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const NET = opt("--net", "fast");
const SLOW = args.includes("--slow") ? 4 : 1;
const OUT = opt("--out", "");
const TURNS = +opt("--turns", 150);
const NETS = { none: null, fast: { latency: 40, downloadThroughput: (10e6 / 8), uploadThroughput: (5e6 / 8) }, slow: { latency: 150, downloadThroughput: (1.6e6 / 8), uploadThroughput: (0.75e6 / 8) } };

const site = process.env.SITE || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "site");
if (!existsSync(path.join(site, "index.html"))) throw new Error("dist/site/index.html が無い（先に node tools/build.mjs）");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".ogg": "audio/ogg" };
const server = createServer((req, res) => {
  const p = path.join(site, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
  if (!p.startsWith(site) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream", "cache-control": "no-store" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
// Google Fonts（tools/perf.mjs と同じく curl で取って渡す。字形が無いと配置の計算が重く出る）
const fontDir = path.join(os.tmpdir(), "morsveld-perf-fonts");
await ctx.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (route) => {
  const u = route.request().url();
  const f = path.join(fontDir, createHash("sha1").update(u).digest("hex"));
  try {
    if (!existsSync(f)) { mkdirSync(fontDir, { recursive: true }); execSync(`curl -sS -f -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36" -o ${JSON.stringify(f)} ${JSON.stringify(u)}`, { stdio: "ignore", timeout: 20000 }); }
    await route.fulfill({ status: 200, body: readFileSync(f), headers: { "content-type": u.includes("googleapis") ? "text/css" : "font/woff2", "access-control-allow-origin": "*" } });
  } catch { await route.abort(); }
});
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
if (NETS[NET]) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...NETS[NET] });
if (SLOW > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: SLOW });
await page.addInitScript(() => {
  let s = 4242;
  Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; };
  window.__lt = [];
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ type: "longtask", buffered: true }); } catch {}
});

// 読んだ物（このサーバの物だけ）：[開始 ms, 終わり ms, KB, 名前]
const loads = [];
const t0 = Date.now();
cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) loads.push([r.at, Date.now() - t0, Math.round(e.encodedDataLength / 1024), r.url]); });
const reqs = new Map();
cdp.on("Network.requestWillBeSent", (e) => { if (e.request.url.startsWith(base)) reqs.set(e.requestId, { at: Date.now() - t0, url: e.request.url.slice(base.length).replace(/\?.*$/, "") }); });
const now = () => Date.now() - t0;
const kbBetween = (a, b) => loads.filter(([, end]) => end > a && end <= b).reduce((n, [, , kb]) => n + kb, 0);
const namesBetween = (a, b) => loads.filter(([, end]) => end > a && end <= b).map(([, , kb, u]) => `${u}(${kb}KB)`);
const waitFor = async (fn, arg, ms = 120000) => { const a = now(); try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 50 }); return now() - a; } catch { return -1; } };
const res = { net: NET, slow: SLOW, steps: {} };

// ---- 初回ロード
await page.goto(base, { waitUntil: "commit" });
const ready = await waitFor(() => window.G && G.main && G.ui && G.ui.render && document.querySelector("#t-load, #setup:not([hidden])"));
const tReady = now();
const titlePhoto = await waitFor(() => { const id = G.sceneImageId && G.sceneImageId("town"); const im = id && G.sceneImage(id); return !!(im && im.complete && im.naturalWidth); });
res.steps.firstLoad = { readyMs: tReady, titlePhotoMs: titlePhoto < 0 ? -1 : now(), kb: kbBetween(0, now()), files: namesBetween(0, now()) };

// ---- 開始直後（作成画面は飛ばして、すぐ始める）
await page.waitForTimeout(500);
let a = now();
await page.evaluate(() => {
  const D = G.data, stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 55; caps[k] = 70; });
  G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "待つ人", sex: "女", age: 24, history: "測るため", personality: "無口" } });
});
const startLoc = await page.evaluate(() => G.S.loc);
const townPhoto = await waitFor((loc) => { const key = G.data.LOCS[loc].scene; const id = G.sceneImageId(key); const im = id && G.sceneImage(id); return !id || !!(im && im.complete && im.naturalWidth); }, startLoc);
res.steps.start = { loc: startLoc, townPhotoMs: townPhoto, kb: kbBetween(a, now()), files: namesBetween(a, now()) };

// ---- 人物の絵（人の出てくる出来事。町に着いて 3 秒後＝ふつうに文章を読んでから）
await page.waitForTimeout(3000);
const ev = await page.evaluate(() => {
  const e = (G.data.EVENTS || []).find((x) => x.id === "c2_nora") || (G.data.EVENTS || []).find((x) => x.who && G.eventWho && G.portraitArt && G.portraitArt(G.eventWho(x)));
  return e ? e.id : null;
});
a = now();
await page.evaluate((id) => { G.startEvent(G.data.EVENTS.find((e) => e.id === id)); G.ui.render(); }, ev);
const personKey = await page.evaluate(() => { const who = G.stand && G.stand.whoOf ? G.stand.whoOf(G.S) : null; return who && G.v4PortraitKey ? G.v4PortraitKey(who) : null; });
const person = personKey ? await waitFor((k) => G.v4Ready(k) && (!G.a13 || !G.a13.has || G.a13.has(k)), personKey) : -1;
res.steps.person = { event: ev, key: personKey, ms: person, kb: kbBetween(a, now()), files: namesBetween(a, now()) };
await page.evaluate(() => { G.S.mode = "explore"; G.S.event = null; G.ui.render(); });

// ---- 魔物の絵（最初の戦闘。町を出てすぐの場所に出る魔物で。始めてから 8 秒後＝少し歩いてから）
await page.waitForTimeout(2000);
const foe = await page.evaluate(() => {
  const L = G.data.LOCS[G.S.loc];
  const near = Object.keys(L.links || {}).map((k) => G.data.LOCS[k]).find((x) => x && (x.pool || []).length);
  const pool = (near && near.pool) || (L.pool || []);
  return pool.find((id) => G.v6ArtKey && G.v6ArtKey(id)) || "goblin";
});
a = now();
await page.evaluate((id) => { G.startCombat([id], {}); G.ui.render(); }, foe);
const foeMs = await waitFor((id) => G.v6ArtReady ? G.v6ArtReady(id) : (G.v6Sprite && !!G.v6Sprite(id)), foe);
res.steps.monster = { foe, ms: foeMs, kb: kbBetween(a, now()), files: namesBetween(a, now()) };
await page.evaluate(() => { G.S.combat = null; G.S.mode = "explore"; G.ui.render(); });

// ---- 長く遊ぶ（手番を重ねて、メモリ・DOM・ログ・保存の増え方）
const snap = async (turn) => {
  const m = await cdp.send("Performance.getMetrics").catch(() => ({ metrics: [] }));
  const g = (n) => ((m.metrics || []).find((x) => x.name === n) || {}).value || 0;
  const p = await page.evaluate(() => ({ log: G.S.log.length, logDom: document.querySelectorAll("#log > *").length, save: Math.round((localStorage.getItem((G.SAVE_KEYS || {}).save) || "").length / 1024), all: Math.round(Object.keys(localStorage).reduce((n, k) => n + (localStorage.getItem(k) || "").length, 0) / 1024) }));
  return { turn, heapMB: +(g("JSHeapUsedSize") / 1048576).toFixed(1), nodes: g("Nodes"), listeners: g("JSEventListeners"), ...p };
};
await cdp.send("Performance.enable");
const growth = [await snap(0)];
for (let i = 0; i < TURNS; i++) {
  await page.evaluate(async (i) => {
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    if (G.S.over) { G.main.start({ cls: G.S.cls, stats: G.S.stats, goal: Object.keys(G.data.GOALS)[0], profile: G.S.profile }); return; }
    const bs = [...document.querySelectorAll("#panel button.act:not([disabled])")].filter((b) => !/引退|物語を終え/.test(b.textContent));
    if (bs.length) bs[(i * 7919) % bs.length].click();
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  }, i);
  if ((i + 1) % 50 === 0) { await page.evaluate(() => window.gc && window.gc()).catch(() => {}); growth.push(await snap(i + 1)); }
}
res.steps.longPlay = growth;
res.longTasks = await page.evaluate(() => ({ count: window.__lt.length, total: Math.round(window.__lt.reduce((n, [, d]) => n + d, 0)), max: Math.round(Math.max(0, ...window.__lt.map(([, d]) => d))) }));
res.totalKB = loads.reduce((n, [, , kb]) => n + kb, 0);
res.errors = errs.slice(0, 5);
console.log(JSON.stringify(res, null, 1));
if (OUT) writeFileSync(OUT, JSON.stringify(res, null, 1));
await browser.close();
server.close();
