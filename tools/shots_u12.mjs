// U12：冒険画面の選択肢（一行に一つ）と本文の見やすさを撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u12.mjs [after|before]
// docs/shots/u12/<前置き>_<pc|phone>_<town|event|many|combat>（many は商店）.jpg を書く（前置きの既定は after）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const tag = process.argv[2] || "after";
const VIEWS = { pc: { width: 1440, height: 900, scale: 1 }, pcsmall: { width: 1100, height: 720, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/u12/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) for (const theme of ["light", "dark"]) {
  if (theme === "dark" && vn !== "pc") continue;
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce", colorScheme: theme });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => {
    await page.evaluate((phone) => {
      const t = document.querySelector("#toast"); if (t) t.style.display = "none";
      document.querySelectorAll("#u8note, .tip").forEach((x) => { x.style.display = "none"; });
      // スマホは選択肢の欄まで下ろす（本文の終わりと選択肢が見えるように）
      if (phone) { const p = document.querySelector("#panel"); if (p) window.scrollTo(0, Math.max(0, p.getBoundingClientRect().top + window.scrollY - 360)); }
    }, vn === "phone" && name !== "town");
    await page.waitForTimeout(500);
    const out = new URL(`../docs/shots/u12/${tag}_${vn}${theme === "dark" ? "_dark" : ""}_${name}.jpg`, import.meta.url).pathname;
    await page.screenshot({ path: out, type: "jpeg", quality: 80 });
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
  await shot("town");
  if (theme === "dark") { await page.close(); await ctx.close(); continue; }
  // 出来事（選択肢が 6 つ、長い文の選択肢がある）
  await page.evaluate(() => { G.startEvent("m3_togaoi"); G.main.save(); G.ui.render(); });
  await shot("event");
  // 選択肢の多い場面（商店：買うだけで 11、補足も長い）
  await page.evaluate(() => { G.S.mode = "explore"; G.S.event = null; G.S.gold = 500; G.act("fac:shop"); G.main.save(); G.ui.render(); });
  await shot("many");
  await page.evaluate(() => { G.S.mode = "explore"; G.S.event = null; G.startCombat(["goblin", "goblin"], {}); G.ui.render(); });
  await shot("combat");
  if (errs.length) console.log("page errors:", errs);
  await page.close(); await ctx.close();
}
await browser.close();
