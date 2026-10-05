// U14：会話・出来事 → 戦闘の境目と、戦闘の結果 → 次の場面を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u14_cut.mjs
// docs/shots/u14/cut_<pc|phone>_<1talk|2cut|3combat|4result|5next|6raid>.jpg を書く
//   1talk 道中の会話（船尾の釣り。話し手の立ち絵）→ 2cut 境目の幕 → 3combat 戦闘（話し手は残らない）
//   4result 結果の場面（次の場面の文はまだ出ない）→ 5next 「先へ進む」のあと（区切りの幕）→ 6raid 旅の襲撃（敵の名前）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1440, height: 900, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/u14/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, colorScheme: "dark" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name, wait) => {
    await page.waitForTimeout(wait);
    await page.evaluate(() => { document.querySelectorAll("#toast, #u8note, .tip, .f2toast, [class*=toast]").forEach((x) => { x.style.display = "none"; }); });
    const out = new URL(`../docs/shots/u14/cut_${vn}_${name}.jpg`, import.meta.url).pathname;
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
    G.main.start({ cls: "fighter" in D.CLASSES ? "fighter" : Object.keys(D.CLASSES)[0], stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva", history: "", look: "" } });
    (G.P.tips = G.P.tips || {});
    const S = G.S;
    S.travel = "yakumo";
    S.w6 = { dest: "yakumo", from: "nerva", sea: true, days: 5, danger: 0, left: 0, raid: false, seen: ["w6s_fishing"], tod: "昼" };
    G.startEvent("w6s_fishing");
    G.ui.after();
  });
  await shot("1talk", 1600);
  // 糸を引いて判定に失敗 → 蟹が上がってくる
  await page.evaluate(() => { const r0 = Math.random; G.rand = () => 0.97; const b = [...document.querySelectorAll("#panel .act")].find((x) => /力で引き寄せる/.test(x.textContent)); b.click(); G.rand = r0; });
  await shot("2cut", 500);
  await shot("3combat", 2400);
  // 戦闘を終わらせる（勝つ）→ 結果の場面。旅は続き、次の出来事が始まっている
  await page.evaluate(() => {
    const S = G.S;
    S.w6.left = 1; S.w6.seen = ["w6s_fishing"];
    S.combat.foes.forEach((f) => { f.hp = 1; });
    G.rand = () => 0.01;
    const b = [...document.querySelectorAll("#panel .act")][0]; b.click();
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { const r = document.querySelector("#log"); if (r) r.scrollTop = r.scrollHeight; });
  await shot("4result", 300);
  await page.evaluate(() => { const g = document.querySelector(".u13go"); if (g) g.click(); });
  await shot("5next", 500);
  // 旅の襲撃（敵の名前）
  await page.evaluate(() => {
    G.u14.hideCut && G.u14.hideCut();
    const S = G.S;
    S.combat = null; S.mode = "explore"; S.event = null; S.travel = null; S.w6 = null; S.loc = "nerva";
    const c0 = G.w6.count, r0 = G.w6.raidChance;
    G.w6.count = () => 0; G.w6.raidChance = () => 1;
    G.rand = () => 0.3;
    try { G.act("travel:karna"); } finally { G.w6.count = c0; G.w6.raidChance = r0; }
    G.ui.after();
  });
  await shot("6raid", 900);
  if (errs.length) console.log("page errors:", errs);
  await page.close(); await ctx.close();
}
await browser.close();
