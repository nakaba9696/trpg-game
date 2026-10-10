// R13：初回の遊び方の一行（.tip）が立ち絵の名札（.c3plate）に重ならないかを、PC・スマホ縦横で測って撮る（Playwright）
// node tools/build.mjs && node tools/shots_r13.mjs → docs/review/r13/*.jpg（重なったら終わりのコードが 1）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const dir = new URL("../docs/review/r13/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const VIEWS = { pc1600: { width: 1600, height: 900 }, pc1366: { width: 1366, height: 768 }, phone: { width: 390, height: 844, hasTouch: true }, phoneLand: { width: 844, height: 390, hasTouch: true } };
const browser = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let bad = 0;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const { hasTouch, ...viewport } = vp;
  const page = await browser.newPage({ viewport, hasTouch: !!hasTouch, isMobile: !!hasTouch, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion: "reduce" });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto(pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
  await page.evaluate(() => {
    const D = G.data, stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "撮影", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    ["sheila", "dil"].forEach((id) => G.c2Join && G.c2Join(id));
    G.P.tips = {};
  });
  // 話している仲間を立たせる（今の手番に、その仲間の話し手の印のある台詞を足す。U11）
  const speak = () => page.evaluate(() => { const c = G.S.companions[0]; if (c) G.S.log.push({ k: "say", text: "「……ねえ、聞いてる？」", speaker: "comp:" + c.id }); G.ui.render(); });
  await speak();
  for (let step = 0; step < 6; step++) {
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const box = (e) => { const b = e.getBoundingClientRect(); return b.width && getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).display !== "none" ? b : null; };
      const tips = [...document.querySelectorAll(".tip")].map(box).filter(Boolean);
      const plates = [...document.querySelectorAll(".c3plate, .v9name, .standName")].filter((e) => getComputedStyle(e).opacity !== "0").map(box).filter(Boolean);
      let hit = 0;
      tips.forEach((t) => plates.forEach((p) => { if (p.right > t.left + 1 && p.left < t.right - 1 && p.bottom > t.top + 1 && p.top < t.bottom - 1) hit++; }));
      return { tips: tips.length, plates: plates.length, hit, mode: G.S.mode };
    });
    console.log(vn, step, JSON.stringify(r));
    if (r.hit) bad++;
    if (step === 0 && r.tips && r.plates) await page.screenshot({ path: dir + `${vn}_${step}.jpg`, type: "jpeg", quality: 70 });
    // 次の場面へ（出来事なら一つ目の選択肢、そうでなければ探索）
    await page.evaluate(() => { const a = (G.actions ? G.actions(G.S) : []) ; const b = document.querySelector("#panel button:not([disabled])"); if (b) b.click(); });
    await speak();
  }
  await page.close();
}
await browser.close();
if (bad) { console.error("重なった回:", bad); process.exit(1); }
