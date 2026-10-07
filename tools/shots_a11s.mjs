// A11（雪と湖）のスクリーンショット：雪の町・湖の町の背景を、時間帯と天候を変えて撮る（画像の上に重ねた層・画像の無い canvas の絵）
// node tools/build.mjs && node tools/shots_a11s.mjs [docs/shots/a11s]（Playwright。CI では動かさない）
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
const out = process.argv[2] || path.join(here, "..", "docs", "shots", "a11s");
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
const SHOTS = (process.env.SHOTS || [
  "snowcity:1:冬:晴", "snowcity:3:冬:晴", "snowcity:2:冬:雪",
  "w7_icehaven:1:冬:晴", "w7_icehaven:3:冬:晴", "w7_icehaven:2:冬:雪",
  "snow:1:冬:晴", "snow:3:冬:晴",
  "w3_lake:1:夏:晴", "w3_lake:2:夏:晴", "w3_lake:3:夏:晴", "w3_lake:0:秋:霧",
  "w4_water:1:夏:晴", "w4_water:2:夏:晴", "w4_water:3:夏:晴", "w4_water:0:春:霧",
].join(",")).split(",");
const errors = [];
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base);
await page.waitForFunction(() => window.G && G.paintScene && G.SV2);
for (const s of SHOTS) {
  const [key, phase, season, weather] = s.split(":");
  await page.evaluate(([key, phase, season, weather]) => {
    let cv = document.getElementById("a11shot");
    if (cv) cv.remove();
    cv = document.createElement("canvas"); cv.id = "a11shot";
    cv.style.cssText = "position:fixed;left:0;top:0;width:960px;height:540px;z-index:99999";
    document.body.appendChild(cv);
    window.__a11opt = { key, phase: +phase, sky: { season, weather, still: false } };
    G.paintScene(cv, window.__a11opt);
  }, [key, phase, season, weather]);
  await page.waitForTimeout(1500);
  await page.evaluate(() => G.paintScene(document.getElementById("a11shot"), window.__a11opt));
  await page.waitForTimeout(1200);
  const name = `${key}_${phase}_${season}${weather}.jpg`;
  await page.locator("#a11shot").screenshot({ path: path.join(out, name), type: "jpeg", quality: 80 });
  console.log(name);
}
await browser.close();
server.close();
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
