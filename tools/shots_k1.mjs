// K1・K2 のスクリーンショット：戦闘の「戦技」の組・ステータスの「戦技」と「スキル」の欄・技を覚えた一行・訓練場の「技の稽古」を、PC とスマホで撮る
// node tools/build.mjs && node tools/shots_k1.mjs [docs/shots/k1]（Playwright。CI では動かさない）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } }

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(here, "..", "dist", "site");
const out = process.argv[2] || path.join(here, "..", "docs", "shots", "k1");
mkdirSync(out, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".json": "application/json" };
const server = createServer((req, res) => {
  const p = path.join(site, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
  if (!p.startsWith(site) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await pw.chromium.launch();

const VIEWS = { pc: { width: 1280, height: 800 }, sp: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 } };
const errors = [];
for (const [vn, vp] of Object.entries(VIEWS)) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, reducedMotion: "reduce" });
  page.on("pageerror", (e) => errors.push(`${vn}: ${e.message}`));
  await page.goto(base);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
  const shot = async (name) => { await page.waitForTimeout(900); await page.screenshot({ path: path.join(out, `${vn}_${name}.jpg`), type: "jpeg", quality: 72 }); console.log(`${vn}_${name}.jpg`); };
  await page.evaluate(() => {
    const D = G.data, stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 20; caps[k] = 60; });
    G.main.start({ cls: "samurai", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "トウマ", sex: "男", age: 24, history: "確認用", personality: "無口" } });
    G.S.mode = "explore"; G.S.event = null; G.S.loc = "yakumo"; G.S.gold = 900;
    G.S.skills.push("k1_parry", "k1_read", "k1_guardform", "k1_aim", "k1_track", "k1_lockpick", "k2_keyfeel", "k2_steadymind", "k2_nighteye");
    G.k1.use("k1_drawcut", 20);
    G.ui.render();
  });
  // 訓練場の「技の稽古」
  await page.evaluate(() => { G.S.mode = "fac"; G.S.fac = "train"; G.ui.render(); });
  await shot("train");
  // 技を覚えた一行
  await page.evaluate(() => { G.S.mode = "explore"; G.S.fac = null; G.k1.learn("k1_twinfang", "train"); G.ui.render(); });
  await shot("learn");
  // 戦闘（技の組を開く）
  await page.evaluate(() => { G.startCombat(["blackknight"]); G.S.combat.foes[0].f1i = { k: "heavy" }; G.ui.render(); });
  await page.evaluate(() => { const b = [...document.querySelectorAll("#panel .u13drawer")].find((x) => /技/.test(x.textContent)); if (b) b.click(); });
  await shot("combat");
  // ステータスの「技」
  await page.evaluate(() => { G.S.combat = null; G.S.mode = "explore"; G.ui.render(); G.ui.setSheetOpen(true); });
  await page.evaluate(() => { const e = document.querySelector(".k1skills"); if (e) e.scrollIntoView(); });
  await shot("sheet");
  await page.close();
}
await browser.close();
server.close();
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
