// U17：依頼が増えたときの印を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u17.mjs
// docs/shots/u17/<pc|phone>_<bang|list>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/u17/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => { await page.waitForTimeout(400); const out = new URL(`../docs/shots/u17/${vn}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); console.log("wrote", out); };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.openQuests && G.q17);
  const hideToast = () => page.evaluate(() => { const t = document.querySelector("#toast"); if (t) t.style.display = "none"; });
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
  });
  await page.evaluate(() => {
    const S = G.S;
    S.loc = "karna";
    const take = (kind) => {
      const q = G.q5.make(G.q5.type(kind), S, { i: 0 });
      S.board = { loc: S.loc, day: S.day, list: [q], q5: 1 };
      S.mode = "fac"; S.fac = "guild";
      G.act("guild:take:" + q.id);
      S.mode = "explore"; S.fac = null;
    };
    take("guard");
    G.q17.clear(S);
    take("hunt");
    G.ui.render();
  });
  await hideToast();
  await shot("bang");
  await page.click("#q7Quests");
  await shot("list");
  console.log(vn, "errors:", errs.length ? errs : "none");
  await ctx.close();
}
await browser.close();
