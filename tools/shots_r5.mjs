// R5：立ち絵と背景が場面と合うか（シグルンの場面・森への道中の戦闘・酒場の中の会話）を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_r5.mjs [名前の頭（既定 after）] [dist/site のある場所（既定 このリポジトリ）]
// docs/shots/r5/<頭>_<pc|phone>_<sigrun|road|tavern>.jpg を書く（直す前の絵は、main を別の場所でビルドして、頭を before にして撮る）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const here = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tag = process.argv[2] || "after";
const site = path.join(process.argv[3] || here, "dist/site/index.html");
const outDir = path.join(here, "docs/shots/r5");
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(outDir, { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(site).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => { await page.waitForTimeout(1800); const out = path.join(outDir, `${tag}_${vn}_${name}.jpg`); await page.screenshot({ path: out, type: "jpeg", quality: 80 }); console.log("wrote", out); };
  const hideToast = () => page.evaluate(() => { const t = document.querySelector("#toast"); if (t) t.style.display = "none"; document.querySelectorAll("dialog[open]").forEach((d) => d.close()); });
  // 場面ごとに新しく始める（前の場面の戦闘の名残りを持ちこまない）
  const fresh = async () => {
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.goto(url);
    await page.waitForFunction(() => window.G && G.main && G.ui);
    await page.evaluate(() => {
      const D = G.data, stats = {};
      D.STATS.forEach((k) => { stats[k] = 14; });
      G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, history: "", personality: "無口" } });
      G.ui.render();
    });
  };
  // 1. 酒場の隅のシグルン（町の通りから出来事が始まる）
  await fresh();
  await page.evaluate(() => { const S = G.S; S.loc = "karna"; S.mode = "explore"; S.fac = null; G.startEvent("f2_majin_2"); G.ui.render(); });
  await hideToast();
  await shot("sigrun");
  // 2. カルナから森への道中の戦闘
  await fresh();
  await page.evaluate(() => {
    const S = G.S;
    S.loc = "karna"; S.mode = "explore";
    S.travel = "forest"; S.w6 = { dest: "forest", from: "karna", sea: false, days: 1, danger: 1, left: 0, raid: false, seen: [], tod: "昼" };
    G.say("森へ向かう街道の途中、何者かに襲われた。");
    G.startCombat(["wolf", "wolf"], { after: "arrive" });
    G.ui.render();
  });
  await hideToast();
  await shot("road");
  // 3. 酒場の中の会話（酒場の真ん中の卓のナタリア）
  await fresh();
  await page.evaluate(() => { const S = G.S; S.loc = "karna"; S.mode = "explore"; S.fac = null; G.startEvent("c2_natalia"); G.ui.render(); });
  await hideToast();
  await shot("tavern");
  console.log(vn, "errors:", errs.length ? errs : "none");
  await ctx.close();
}
await browser.close();
