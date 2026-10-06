// U19：本文の欄が行動ごとに上から書き直されるところを撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u19.mjs
// docs/shots/u19/<pc|phone>_<town|act|combat1|combat2|log>.jpg を書き、本文の欄に見えている行の数と、ログの窓の行の数を出す
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1440, height: 900, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/u19/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
let bad = 0;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => {
    await page.evaluate(() => { const t = document.querySelector("#toast"); if (t) t.style.display = "none"; document.querySelectorAll("#u8note, .tip, #u14card, #u14cut").forEach((x) => { x.style.display = "none"; }); });
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
    const out = new URL(`../docs/shots/u19/${vn}_${name}.jpg`, import.meta.url).pathname;
    await page.screenshot({ path: out, type: "jpeg", quality: 78, fullPage: false });
  };
  const state = () => page.evaluate(() => {
    const log = document.querySelector("#log");
    const vis = Array.from(log.children).filter((el) => getComputedStyle(el).display !== "none");
    return { vis: vis.length, all: log.children.length, rec: G.S.log.length, head: log.getAttribute("data-u19head") || "", prev: log.getAttribute("data-u19prev") || "", top: log.scrollTop, first: vis[0] ? vis[0].textContent.slice(0, 30) : "" };
  });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.u19);
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 60; });
    let s = 7;
    G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    for (let i = 0; i < 60 && !G.S.over; i++) {
      if (G.S.mode === "explore" && G.loc().type === "town" && !G.S.combat && i > 10) break;
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
    }
    G.S.hp = G.S.maxHp; G.main.save(); G.ui.render();
  });
  await page.keyboard.press("Escape");
  await shot("town");
  // 選択肢を何度か押す：毎回、本文の欄は新しい文だけ
  for (let i = 0; i < 4; i++) {
    const b = page.locator("#panel button.act:not([disabled])").first();
    if (!(await b.count())) break;
    const before = (await state()).rec;
    await b.click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    const st = await state();
    console.log(vn, "act", i, JSON.stringify(st));
    if (st.rec > before && st.vis > st.rec - before + 1) { bad++; console.log("  ! 前の文が残っている"); }
    if (st.top !== 0 && vn === "pc") { bad++; console.log("  ! 先頭に戻っていない"); }
  }
  await shot("act");
  // 戦闘
  await page.evaluate(() => { G.S.mode = "explore"; G.S.fac = null; G.S.tk = null; G.startCombat(["ogre"], {}); G.main.save(); G.ui.render(); });
  await page.keyboard.press("Escape");
  for (let i = 0; i < 2; i++) {
    const b = page.locator("#panel button.act:not([disabled])").first();
    await b.click();
    await page.waitForTimeout(2500);
    console.log(vn, "combat", i, JSON.stringify(await state()));
    await shot("combat" + (i + 1));
  }
  // ログの窓
  const n = await page.evaluate(() => { G.v9.openLog(); return { rows: document.querySelectorAll("#dlgLog .v9logAll > *").length, rec: G.S.log.length }; });
  console.log(vn, "log window", JSON.stringify(n));
  if (n.rows < n.rec) { bad++; console.log("  ! ログの窓に全部が入っていない"); }
  await shot("log");
  if (errs.length) { bad++; console.log("errors", errs); }
  await ctx.close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
