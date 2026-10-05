// U13 の直し：戦闘の道具の一覧（品が 11 種・仲間が傷ついている）を開いたところと、使う相手を選ぶところを撮る（Playwright）
// node tools/build.mjs && node tools/shots_u13_items.mjs [after|before]
// docs/shots/u13/fix_<前置き>_<pc|pcsmall|phone>_<items|who>.jpg を書く（前置きの既定は after。before は相手を選ぶところを撮らない）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const tag = process.argv[2] || "after";
const VIEWS = { pc: { width: 1440, height: 900, scale: 1 }, pcsmall: { width: 1100, height: 720, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/u13/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const shot = async (name) => {
    await page.evaluate(() => { document.querySelectorAll("#toast, #u8note").forEach((x) => { x.style.display = "none"; }); });
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);
    const out = new URL(`../docs/shots/u13/fix_${tag}_${vn}_${name}.jpg`, import.meta.url).pathname;
    await page.screenshot({ path: out, type: "jpeg", quality: 80 });
    console.log("wrote", out);
  };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui);
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 60; });
    G.main.start({ cls: "priest", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    G.addCompanion({ name: "僧侶のカティア", cls: "僧侶", desc: "", power: 50, dmg: 2, hp: 19, maxHp: 19 });
    G.S.inv = { herb: 4, jerky: 3, ale: 1, potion: 2, manawater: 1, smoke: 1, m7_chipdie: 1, riceball: 2, w2_honeycake: 1, elixir: 1, holywater: 1 };
    G.S.companions.forEach((c) => { c.hp = 9; });
    G.startCombat(["goblin", "goblin"], {}); G.main.save(); G.ui.render();
  });
  await page.waitForTimeout(400);
  await page.locator('#panel .u13drawer[data-u13="d:道具"]').click();
  await shot("items");
  if (tag === "after") {
    await page.locator(".u13pop .u13hasWho").first().click();
    await shot("who");
  }
  await page.close(); await ctx.close();
}
await browser.close();
