// U33：暗い画面の見え方を撮る（持ち主の知らせ：語りの場面の窓に出る「手引きに書き足された：✦…」の字が読めない）。
// node tools/build.mjs && node tools/shots_u33.mjs --out=docs/review/u33 --tag=after → <tag>_<pc|phone>_<dark|light>_<story|trophy|combat|title>.png
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3) || d;
const out = arg("out", "docs/review/u33"), tag = arg("tag", "after"), schemes = arg("schemes", "dark").split(",");
fs.mkdirSync(out, { recursive: true });
const root = process.env.SITE ? process.env.SITE.replace(/\/?$/, "/") : new URL("../dist/site/", import.meta.url).pathname;
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0])); if (p.endsWith("/")) p += "index.html";
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { "content-type": mime[path.extname(p)] || "application/octet-stream" }); res.end(b); } });
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/index.html`;
const browser = await pw.chromium.launch();
for (const [vn, w, h, sc] of [["pc", 1600, 900, 1], ["phone", 390, 844, 2]]) for (const scheme of schemes) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: sc, colorScheme: scheme, reducedMotion: "reduce" })).newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui, null, { timeout: 60000 });
  const settle = async () => { await page.evaluate(() => { try { G.u28 && G.u28.skip && G.u28.skip(); } catch (e) {} document.querySelectorAll("#s4enc,#u14card,#u14cut,#toast").forEach((x) => { x.style.display = "none"; }); document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }); const l = document.getElementById("log"); if (l) l.scrollTop = l.scrollHeight; }); await page.waitForTimeout(500); };
  const shot = async (name) => { await settle(); await page.screenshot({ path: `${out}/${tag}_${vn}_${scheme}_${name}.png` }); };
  await shot("title");
  await page.evaluate(() => {
    const D = G.data, stats = {}; D.STATS.forEach((k) => { stats[k] = 60; });
    let s = 33; G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    G.S.gold = 500; G.S.mode = "explore"; G.S.event = null; G.ui.render();
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  });
  // 語りの場面になるまで遊び、手引きに書き足された行を足す（持ち主の画像と同じ行）
  const kinds = {};
  for (let i = 0; i < 300; i++) {
    const k = await page.evaluate(() => {
      if (G.S.over) return "over";
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled); if (!acts.length) return "none";
      const a = G.S.combat ? acts[0] : acts[Math.floor(G.rand() * acts.length)];
      G.act(a.id); G.S.hp = Math.max(G.S.hp, Math.ceil(G.S.maxHp * .6)); G.ui.render();
      document.querySelectorAll("dialog[open]").forEach((d) => d.close());
      return document.body.dataset.u14 || "";
    });
    if (k === "over" || k === "none") break;
    if (k === "story" && !kinds.story) {
      kinds.story = 1;
      await page.evaluate(() => {
        G.note("手引きに書き足された：シェルアーク"); G.note("手引きに書き足された：レオネスト王国"); G.ui.render();
        // 遊んでいて新しく載った語は、ゲームが u8new を付けて強調する（✦ と金色）。同じ付け方をして見せる
        [...document.querySelectorAll("#log .u8term")].slice(-2).forEach((e) => e.classList.add("u8new"));
      });
      await shot("story");
    }
    if (k === "combat" && !kinds.combat) { kinds.combat = 1; await shot("combat"); }
    if (kinds.story && kinds.combat) break;
  }
  await page.evaluate(() => { document.getElementById("openTrophy") && document.getElementById("openTrophy").click(); });
  await page.waitForTimeout(300); await shot("trophy");
  console.log(vn, scheme, Object.keys(kinds).join(","));
  await page.context().close();
}
await browser.close(); server.close();
