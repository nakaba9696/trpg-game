// B5：一行の HP を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_b5.mjs
// docs/shots/b5/<pc|phone>_<combat|pick|sheet>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/b5/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => { await page.waitForTimeout(500); const out = new URL(`../docs/shots/b5/${vn}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); console.log("wrote", out); };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    G.addCompanion({ name: "剣士のカイ", cls: "剣士", power: 55, dmg: 1, desc: "冷酷で、どこまでも合理的" });
    G.addCompanion({ name: "弓使いのミラ", cls: "弓使い", power: 45, dmg: 1, desc: "よく分からない人" });
    G.addCompanion({ name: "僧侶のトマ", cls: "僧侶", power: 40, dmg: 0, heal: true, desc: "無口" });
    G.give("herb"); G.give("herb");
    G.startCombat(["orc", "goblin"], {});
    for (let i = 0; i < 3 && G.S.combat; i++) G.act("cb:guard");
    const [k, m, t] = G.S.companions; if (G.S.combat) { m.hp = 0; k.hp = Math.min(k.hp, 6); }
    G.main.save(); G.ui.render();
    const t2 = document.querySelector("#toast"); if (t2) t2.style.display = "none";
  });
  await shot("combat");
  await page.evaluate(() => { G.act("b5:pick:item:herb"); G.ui.render(); });
  await shot("pick");
  await page.evaluate(() => { G.act("b5:cancel"); if (G.S.combat) G._endCombat("fled"); G.S.mode = "explore"; G.ui.render(); G.ui.setSheetOpen(true); const c = document.querySelector("#sheet .comps"); if (c) c.scrollIntoView(); });
  await shot("sheet");
  if (errs.length) console.log("ERR", vn, errs);
  await ctx.close();
}
await browser.close();
