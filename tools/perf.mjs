// T：動作の重さを測る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの。重いので CI では回さない）
// node tools/build.mjs && node tools/perf.mjs [--slow] [--profile] [--turns 40] [--out 書き出すJSON]
//   dist/site/ をローカルサーバで開き（Artifact と同じく画像は別ファイルを相対パスで読む）、
//   起動 → 冒険を始める → 町で手番を重ねる → 戦闘 → 図鑑を開く → 場面を替える、を自動で操作して、
//   それぞれの時間（クリックから次の描画まで）・Long Tasks（50ms 以上）・JS のメモリ・DOM の数を出す。
//   --slow は CPU を 4 倍遅くする（スマホ相当）。--profile は CPU プロファイルを取り、ファイルごと・関数ごとの上位を出す。
//   乱数は Math.random を決まった種に替えるので、前後で同じ遊び方になる。
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
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const SLOW = flag("--slow") ? 4 : 1;
const PROFILE = flag("--profile");
const TURNS = +opt("--turns", 40);
const OUT = opt("--out", "");

const site = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "site");
if (!existsSync(path.join(site, "index.html"))) throw new Error("dist/site/index.html が無い（先に node tools/build.mjs）");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".ogg": "audio/ogg" };
const server = createServer((req, res) => {
  const p = path.join(site, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
  if (!p.startsWith(site) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

// 束ねた HTML の中の「// ==== ファイル名」から、行番号 → 元のファイルを引く（プロファイルをファイルごとにまとめるため）
const html = readFileSync(path.join(site, "index.html"), "utf8").split("\n");
const marks = [];
html.forEach((l, i) => { const m = /^\/\/ ==== (\S+)/.exec(l); if (m) marks.push([i, m[1]]); });
const fileOf = (line) => { let lo = 0, hi = marks.length - 1, f = "(html)"; while (lo <= hi) { const mid = (lo + hi) >> 1; if (marks[mid][0] <= line) { f = marks[mid][1]; lo = mid + 1; } else hi = mid - 1; } return f; };

const browser = await pw.chromium.launch({ args: ["--enable-precise-memory-info", "--js-flags=--expose-gc"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => {
  // 決まった乱数（遊び方を前後で揃える）
  let s = 12345;
  Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; };
  window.__lt = [];
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ type: "longtask", buffered: true }); } catch {}
  window.__frames = 0;
  const tick = () => { window.__frames++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
// Google Fonts（Artifact で読むのと同じ字形）。ブラウザから直接は外に出られない環境もあるので、curl で取って（キャッシュして）渡す。
// 字形が無いと日本語の代わりの字体を探すのに時間がかかり、配置の計算が実際より重く出る。--no-fonts で取らない
const fontDir = path.join(os.tmpdir(), "morsveld-perf-fonts");
const curl = (url, file) => { if (!existsSync(file)) { mkdirSync(fontDir, { recursive: true }); execSync(`curl -sS -f -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36" -o ${JSON.stringify(file)} ${JSON.stringify(url)}`, { stdio: "ignore", timeout: 20000 }); } return readFileSync(file); };
const fontKey = (u) => path.join(fontDir, createHash("sha1").update(u).digest("hex"));
let fontsOk = !flag("--no-fonts");
if (fontsOk) {
  await ctx.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (route) => {
    const u = route.request().url();
    try { const body = curl(u, fontKey(u)); await route.fulfill({ status: 200, body, headers: { "content-type": u.includes("googleapis") ? "text/css" : "font/woff2", "access-control-allow-origin": "*" } }); }
    catch { fontsOk = false; await route.abort(); }
  });
}
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
const cdp = await ctx.newCDPSession(page);
await cdp.send("Performance.enable");
if (SLOW > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: SLOW });
if (PROFILE) { await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 200 }); await cdp.send("Profiler.start"); }

const res = { slow: SLOW, steps: {} };
const ltSince = async (t) => page.evaluate((t) => window.__lt.filter(([s]) => s >= t), t);
const now = () => page.evaluate(() => performance.now());
const mem = async () => {
  const m = await cdp.send("Performance.getMetrics");
  const g = (n) => (m.metrics.find((x) => x.name === n) || {}).value || 0;
  return { heapMB: +(g("JSHeapUsedSize") / 1048576).toFixed(1), nodes: g("Nodes"), listeners: g("JSEventListeners") };
};
// 押してから、次の描画（rAF のあと）まで。同期の処理の時間も分けて取る
const timed = (fn) => page.evaluate(async (src) => {
  const f = new Function("return (" + src + ")")();
  const t0 = performance.now();
  await f();
  const t1 = performance.now();
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  return { sync: t1 - t0, paint: performance.now() - t0 };
}, fn.toString());
const stat = (xs) => { const s = [...xs].sort((a, b) => a - b); const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))] || 0; return { n: s.length, median: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +(s[s.length - 1] || 0).toFixed(1), total: +s.reduce((a, b) => a + b, 0).toFixed(0) }; };
const lt = (xs) => ({ count: xs.length, total: +xs.reduce((a, [, d]) => a + d, 0).toFixed(0), max: +Math.max(0, ...xs.map(([, d]) => d)).toFixed(0) });

// ---- 起動
const tGo = Date.now();
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render && document.querySelector("#t-load, #setup:not([hidden])"));
const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { domContentLoaded: n.domContentLoadedEventEnd, load: n.loadEventEnd, ready: performance.now() }; });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
res.steps.boot = { wallMs: Date.now() - tGo, ...Object.fromEntries(Object.entries(nav).map(([k, v]) => [k, +v.toFixed(0)])), longTasks: lt(await ltSince(0)), mem: await mem() };

// ---- 冒険を始める（作成画面は飛ばして、決まった人物で）
let t = await now();
const start = await timed(() => {
  const D = G.data, stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 55; caps[k] = 70; });
  G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "測る人", sex: "女", age: 24, history: "測るため", personality: "無口" } });
});
await page.waitForTimeout(800);
res.steps.start = { ...start, longTasks: lt(await ltSince(t)), mem: await mem() };

// ---- 手番を重ねる（押せる行動のボタンを決まった順で選ぶ。戦闘になれば戦い、終われば始め直す）
const pressOne = (i) => page.evaluate(async (i) => {
  if (G.S.over) { G.main.start({ cls: G.S.cls, stats: G.S.stats0 || G.S.stats, goal: Object.keys(G.data.GOALS)[0], profile: G.S.profile }); }
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  const bs = [...document.querySelectorAll("#panel button.act:not([disabled])")].filter((b) => !/引退|物語を終え|自害|新しい冒険/.test(b.textContent));
  if (!bs.length) return null;
  const b = bs[(i * 7919) % bs.length];
  const label = b.textContent.slice(0, 12);
  const t0 = performance.now();
  b.click();
  const t1 = performance.now();
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  return { sync: t1 - t0, paint: performance.now() - t0, label, combat: !!G.S.combat, log: document.querySelectorAll("#log > *").length };
}, i);
const turnsSync = [], turnsPaint = [];
t = await now();
let lastLog = 0;
for (let i = 0; i < TURNS; i++) {
  const r = await pressOne(i);
  if (!r) break;
  turnsSync.push(r.sync); turnsPaint.push(r.paint); lastLog = r.log;
  await page.waitForTimeout(60);
}
res.steps.turns = { sync: stat(turnsSync), paint: stat(turnsPaint), logNodes: lastLog, longTasks: lt(await ltSince(t)), mem: await mem(), saveKB: +(await page.evaluate(() => Object.keys(localStorage).reduce((a, k) => a + localStorage.getItem(k).length, 0) / 1024)).toFixed(0) };

// ---- 戦闘（ゴブリンと戦い、攻撃を押し続ける）
await page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); if (G.S.over) G.main.start({ cls: G.S.cls, stats: G.S.stats, goal: Object.keys(G.data.GOALS)[0], profile: G.S.profile }); G.S.mode = "explore"; G.S.combat = null; G.S.hp = G.S.hpMax || G.S.hp; });
t = await now();
const enter = await timed(() => { G.startCombat(["goblin", "goblin"], {}); G.ui.render(); });
await page.waitForTimeout(600);
const cSync = [], cPaint = [];
for (let i = 0; i < 12; i++) {
  const r = await page.evaluate(async () => {
    if (!G.S.combat) return null;
    const bs = [...document.querySelectorAll("#panel button.act:not([disabled])")];
    const b = bs.find((x) => /攻撃|斬/.test(x.textContent)) || bs[0];
    if (!b) return null;
    const t0 = performance.now(); b.click(); const t1 = performance.now();
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    return { sync: t1 - t0, paint: performance.now() - t0 };
  });
  if (!r) break;
  cSync.push(r.sync); cPaint.push(r.paint);
  await page.waitForTimeout(250);
}
res.steps.combat = { enter, sync: stat(cSync), paint: stat(cPaint), longTasks: lt(await ltSince(t)), mem: await mem() };

// ---- 図鑑を開く（2 回。2 回目は作り直しの分）
await page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); G.S.combat = null; G.S.mode = "explore"; G.ui.render(); });
t = await now();
const codex = [];
for (let i = 0; i < 2; i++) {
  codex.push(await timed(() => { G.f2.open(); }));
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  await page.waitForTimeout(300);
}
res.steps.codex = { first: codex[0], second: codex[1], longTasks: lt(await ltSince(t)) };

// ---- 図鑑がいっぱいの冒険（魔物・人物・品をすべて見たことにして）で、魔物・人物のタブを開く。2.5 秒のあいだの Long Tasks も
const full = await page.evaluate(async () => {
  const c = G.codex(), F2 = G.f2, at = { by: "測る", date: "-", at: "-" };
  F2.itemIds().forEach((id) => { c.items[id] = c.items[id] || { ...at }; });
  F2.foeIds().forEach((id) => { c.foes[id] = c.foes[id] || { ...at, kills: 1 }; });
  c.people = c.people || {};
  F2.peopleIds().forEach((id) => { c.people[id] = c.people[id] || { ...at, ev: 1, rels: {} }; });
  const out = {};
  for (const tab of ["foe", "person", "foe", "person"]) {
    const t0 = performance.now();
    const n0 = window.__lt.length;
    F2.open(tab);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    const shown = performance.now() - t0;
    await new Promise((r) => setTimeout(r, 2500));
    const lts = window.__lt.slice(n0).filter(([s]) => s >= t0);
    out[out[tab] ? tab + "2" : tab] = { shown: Math.round(shown), longTasks: lts.length, ltTotal: Math.round(lts.reduce((a, [, d]) => a + d, 0)), ltMax: Math.round(Math.max(0, ...lts.map(([, d]) => d))) };
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    await new Promise((r) => setTimeout(r, 300));
  }
  return out;
});
res.steps.codexFull = full;

// ---- 場面の切り替え（町を移る・施設に入る。背景の描き直し）
t = await now();
const sw = [];
const locs = await page.evaluate(() => Object.keys(G.data.LOCS).filter((k) => G.data.LOCS[k].type === "town").slice(0, 6));
for (const k of locs) {
  sw.push((await page.evaluate(async (k) => {
    G.S.loc = k; G.S.mode = "explore"; G.S.fac = null; G.S.depth = 0;
    const t0 = performance.now(); G.ui.render(); const t1 = performance.now();
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    return { sync: t1 - t0, paint: performance.now() - t0 };
  }, k)));
  await page.waitForTimeout(150);
}
res.steps.scenes = { sync: stat(sw.map((x) => x.sync)), paint: stat(sw.map((x) => x.paint)), longTasks: lt(await ltSince(t)) };

// ---- 何もしないで 5 秒（毎フレームの描画・音の合成がどれだけ走っているか）
t = await now();
const f0 = await page.evaluate(() => window.__frames);
const m0 = await cdp.send("Performance.getMetrics");
await page.waitForTimeout(5000);
const m1 = await cdp.send("Performance.getMetrics");
const g = (m, n) => (m.metrics.find((x) => x.name === n) || {}).value || 0;
res.steps.idle = { frames: (await page.evaluate(() => window.__frames)) - f0, scriptMs: +((g(m1, "ScriptDuration") - g(m0, "ScriptDuration")) * 1000).toFixed(0), taskMs: +((g(m1, "TaskDuration") - g(m0, "TaskDuration")) * 1000).toFixed(0), layoutMs: +((g(m1, "LayoutDuration") - g(m0, "LayoutDuration")) * 1000).toFixed(0), longTasks: lt(await ltSince(t)) };
res.steps.end = { mem: await mem() };
res.errors = errs.slice(0, 5);
res.fonts = fontsOk ? await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").length) : 0;

if (PROFILE) {
  const { profile } = await cdp.send("Profiler.stop");
  const dt = new Map();
  for (let i = 0; i < profile.samples.length; i++) dt.set(profile.samples[i], (dt.get(profile.samples[i]) || 0) + (profile.timeDeltas[i] || 0));
  const byFile = {}, byFn = {};
  for (const n of profile.nodes) {
    const ms = (dt.get(n.id) || 0) / 1000;
    if (!ms) continue;
    const cf = n.callFrame;
    const f = cf.url && cf.url.startsWith(base) ? fileOf(cf.lineNumber) : cf.url ? "(他)" : `(${cf.functionName || "native"})`;
    byFile[f] = (byFile[f] || 0) + ms;
    const k = `${cf.functionName || "(anon)"} @ ${f}:${cf.url.startsWith(base) ? cf.lineNumber - (marks.find(([, x]) => x === f) || [0])[0] : cf.lineNumber}`;
    byFn[k] = (byFn[k] || 0) + ms;
  }
  // 含む時間（その関数の下で呼んだものも足す）。同じ関数が積み重なっても一度だけ数える
  const parent = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.nodes.forEach((n) => (n.children || []).forEach((c) => parent.set(c, n.id)));
  const label = (n) => { const cf = n.callFrame; const f = cf.url && cf.url.startsWith(base) ? fileOf(cf.lineNumber) : null; return f ? `${cf.functionName || "(anon)"} @ ${f}:${cf.lineNumber - (marks.find(([, x]) => x === f) || [0])[0]}` : null; };
  const incl = {};
  for (const [id, us] of dt) {
    const seen = new Set();
    for (let x = id; x !== undefined; x = parent.get(x)) { const l = label(byId.get(x)); if (l && !seen.has(l)) { seen.add(l); incl[l] = (incl[l] || 0) + us / 1000; } }
  }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, +v.toFixed(0)]);
  res.profile = { byFile: top(byFile, 20), byFn: top(byFn, 30), inclusive: top(incl, 40) };
}

console.log(JSON.stringify(res, null, 1));
if (OUT) writeFileSync(OUT, JSON.stringify(res, null, 1));
await browser.close();
server.close();
