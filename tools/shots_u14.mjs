// U14：場面ごとの画面の見た目（街・荒野・迷宮・戦闘・出来事の語り・旅の道中・町に着いた見出し）を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u14.mjs [after|before]
// docs/shots/u14/<前置き>_<pc|phone>_<arrive|town|wild|dungeon|combat|event|road>.jpg を書く（前置きの既定は after）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const tag = process.argv[2] || "after";
const VIEWS = { pc: { width: 1440, height: 900, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/u14/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  // 動きを止めずに撮る（町の見出しは出ている間に撮る）
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, colorScheme: "dark" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name, wait = 1500, keepCard) => {
    await page.waitForTimeout(wait);
    await page.evaluate((keep) => {
      const t = document.querySelector("#toast"); if (t) t.style.display = "none";
      document.querySelectorAll("#u8note, .tip").forEach((x) => { x.style.display = "none"; });
      if (!keep) { const c = document.querySelector("#u14card"); if (c) c.click(); }
    }, keepCard);
    if (!keepCard) await page.waitForTimeout(700);
    const out = new URL(`../docs/shots/u14/${tag}_${vn}_${name}.jpg`, import.meta.url).pathname;
    await page.screenshot({ path: out, type: "jpeg", quality: 78 });
    console.log("wrote", out);
  };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui);
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 44; });
    G.rand = (() => { let s = 7; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })();
    G.main.start({ cls: "thief", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva", history: "", look: "" } });
    G.ui.render();
  });
  await page.waitForTimeout(800);
  // 荒野（森に着く）
  await page.evaluate(() => { const S = G.S; S.w6 = { dest: "forest", from: S.loc, sea: false, days: 2, danger: 1, left: 0, raid: false, seen: [] }; S.travel = "forest"; G.log("you", "迷いの森へ向かう"); G.arrive("forest"); G.ui.after(); });
  await shot("wild");
  // 旅の道中（見張りの夜）
  await page.evaluate(() => { const S = G.S; S.travel = "nerva"; S.w6 = { dest: "nerva", from: "forest", sea: false, days: 2, danger: 1, left: 0, raid: false, seen: ["w6c_watch"], tod: "夜" }; G.log("you", "港町ヴァレンツァへ向かう"); G.startEvent("w6c_watch"); G.ui.after(); });
  await shot("road");
  // 町に着く（見出しが出ている間と、消えたあと）
  await page.evaluate(() => { const S = G.S; S.mode = "explore"; S.event = null; S.visited.karna = false; S.w6 = { dest: "karna", from: "forest", sea: false, days: 1, danger: 1, left: 0, raid: false, seen: [] }; S.travel = "karna"; G.arrive("karna"); G.ui.after(); });
  await shot("arrive", 900, true);
  await shot("town", 300);
  // 船で着く（初めての町）
  await page.evaluate(() => { const S = G.S; S.loc = "nerva"; S.visited.yakumo = false; S.w6 = { dest: "yakumo", from: "nerva", sea: true, days: 5, danger: 0, left: 0, raid: false, seen: [] }; S.travel = "yakumo"; G.log("you", "船に乗る"); G.arrive("yakumo"); G.ui.after(); });
  await shot("arrive_sea", 900, true);
  await shot("town_sea", 300);
  // 迷宮（地下 2 階）
  await page.evaluate(() => { const S = G.S; S.w6 = { dest: "ruins", from: "nerva", sea: false, days: 2, danger: 2, left: 0, raid: false, seen: [] }; S.travel = "ruins"; G.arrive("ruins"); S.depth = 2; G.log("title", "エル・ナフ遺構 地下2階"); G.say("湿った石の匂い。どこかで水が滴っている。"); G.ui.after(); });
  await shot("dungeon");
  // 戦闘
  await page.evaluate(() => { G.startCombat(["goblin", "orc"], {}); G.ui.after(); });
  await shot("combat");
  // 出来事の語り（町の出来事）
  await page.evaluate(() => { const S = G.S; S.combat = null; S.mode = "explore"; S.loc = "karna"; S.depth = 0; const e = G.data.EVENTS.find((x) => x.who && (x.where || []).includes("town") && !x.w6); G.startEvent(e.id); G.ui.after(); });
  await shot("event");
  if (errs.length) console.log("page errors:", errs);
  await page.close(); await ctx.close();
}
await browser.close();
