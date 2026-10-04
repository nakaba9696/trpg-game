// Q7：セーブ・ロードの枠を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_q7.mjs
// docs/shots/q7/<pc|phone>_<save|confirm|title|load|combat>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/q7/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => { await page.waitForTimeout(400); const out = new URL(`../docs/shots/q7/${vn}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); console.log("wrote", out); };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.openSlots);
  // 冒険を始めて、枠 1・2 に保存
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    G.writeSlot(localStorage, 1, G.S);
    G.S.day += 12; G.S.loc = Object.keys(D.LOCS).find((k) => k !== G.S.loc && D.LOCS[k].type !== "dungeon") || G.S.loc;
    G.writeSlot(localStorage, 2, G.S);
    G.main.save();
    G.ui.render();
    G.ui.setSheetOpen(true);
    const t = document.querySelector("#toast"); if (t) t.style.display = "none";
  });
  await shot("sheet");
  await page.click("#sheet .q7save");
  await shot("save");
  await page.click('#dlgSlots [data-slot="slot1"] .q7go');
  await shot("confirm");
  await page.click("#dlgSlots .q7yes");
  await page.evaluate(() => document.querySelector("#dlgSlots").close());
  // 戦闘中は押せない
  await page.evaluate(() => { G.startCombat(["goblin"], {}); G.ui.render(); });
  await page.evaluate(() => G.ui.openSlots("save"));
  await shot("combat");
  await page.evaluate(() => { document.querySelector("#dlgSlots").close(); G.S.mode = "explore"; G.S.combat = null; G.main.save(); });
  // タイトルとロード
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.ui && G.ui.openSlots && document.querySelector("#t-load"));
  await page.evaluate(() => { const t = document.querySelector("#toast"); if (t) t.style.display = "none"; });
  await shot("title");
  await page.click("#t-load");
  await shot("load");
  await page.click('#dlgSlots [data-slot="slot2"] .q7go');
  await shot("load_confirm");
  await page.click("#dlgSlots .q7yes");
  await page.waitForTimeout(300);
  const ok = await page.evaluate(() => !document.querySelector("#play").hidden && G.S && G.S.profile.name);
  console.log(vn, "loaded:", ok, "errors:", errs.length ? errs : "none");
  await ctx.close();
}
await browser.close();
