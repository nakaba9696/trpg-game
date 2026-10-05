// R3：出発地に着いた直後（「気になること」）・ギルドの掲示の隅の頼みごと・死の画面（墓碑の「倒れたわけ」）を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_r3.mjs
// docs/shots/r3/<pc|phone>_<arrive|guild|grave>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/r3/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => { await page.waitForTimeout(600); const out = new URL(`../docs/shots/r3/${vn}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); console.log("wrote", out); };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui);
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 14; });
    G.main.start({ cls: "merc", stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "", personality: "無口" } });
    G.ui.render();
    const t = document.querySelector("#toast"); if (t) t.style.display = "none";
  });
  await shot("arrive");
  await page.evaluate(() => { G.act("fac:guild"); G.ui.render(); const g = [...document.querySelectorAll("h3,h4,.gtitle,div")].find((e) => e.textContent.trim() === "掲示の隅の頼みごと"); if (g) g.scrollIntoView({ block: "center" }); });
  await shot("guild");
  await page.evaluate(() => { G.act("back"); G.ui.render(); });
  await page.evaluate(() => {
    const S = G.S;
    S.loc = "forest"; S.visited.forest = true;
    G.startCombat(["goblin", "goblin"], {});
    S.combat.foes[0].hp = 2;
    S.hp = 1; S.clungUsed = true;
    G.die("ゴブリンAに倒された");
    G.ui.render();
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    G.ui.openChronicle(S, true);
    const c = document.querySelector("#epitaph"); if (c) c.scrollIntoView({ block: "center" });
  });
  await shot("grave");
  console.log(vn, "errors:", errs.length ? errs : "none");
  await ctx.close();
}
await browser.close();
