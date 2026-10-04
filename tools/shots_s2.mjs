// S2：作成画面の能力値（ふつうのとき・初期値が上振れ（20 以上）したとき）を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_s2.mjs
// docs/shots/s2/<normal|lucky|dark>.jpg・人物の画面 person.jpg・旅立つ前のシート sheet.jpg・導入 prologue.jpg・
// 長い外見と生い立ちが全部見える traits_pc.jpg・traits_phone.jpg・その人物のシート traits_sheet.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const browser = await pw.chromium.launch();
const out = (n) => new URL(`../docs/shots/s2/${n}.jpg`, import.meta.url).pathname;
for (const name of ["normal", "lucky", "dark"]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1, colorScheme: name === "dark" ? "dark" : "light", reducedMotion: "reduce" });
  await page.goto(pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href);
  await page.waitForFunction(() => window.G && G.setup && G.cre);
  await page.click('[data-fid="t-start"]');
  if (name === "normal") { await page.waitForTimeout(300); await page.screenshot({ path: out("person"), type: "jpeg", quality: 82, fullPage: true }); console.log("wrote", out("person")); }
  await page.click('[data-fid="p-next"]');
  await page.waitForSelector('[data-fid="s-roll"]');
  // 上振れ（20 以上）が出るまで振る（normal は 1 回目のまま）
  for (let i = 0; name === "lucky" && i < 3000; i++) {
    if (await page.locator(".creStats .srow.lucky").count()) break;
    await page.click('[data-fid="s-roll"]');
  }
  // 高い能力値の上から 3 つへ順に配る
  await page.evaluate(() => {
    const rows = () => [...document.querySelectorAll(".creStats .srow")];
    const top = rows().map((r, i) => [i, Number(r.querySelector(".v").textContent)]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => i);
    for (let n = 0; n < 80; n++) {
      const can = top.map((i) => rows()[i].querySelector('[data-fid^="p-"]')).filter((b) => b && !b.disabled);
      if (!can.length) { const any = rows().map((r) => r.querySelector('[data-fid^="p-"]')).find((b) => b && !b.disabled); if (!any) break; any.click(); continue; }
      can[n % can.length].click();
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out(name), type: "jpeg", quality: 82, fullPage: true });
  console.log("wrote", out(name));
  if (name === "lucky") {
    await page.click('[data-fid="s-next"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: out("sheet"), type: "jpeg", quality: 82, fullPage: true });
    console.log("wrote", out("sheet"));
    await page.click('[data-fid="c-go"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: out("prologue"), type: "jpeg", quality: 82 });
    console.log("wrote", out("prologue"));
  }
  await page.close();
}
// 長い外見（60 字）と生い立ち（160 字）を入れて、欄で切れずに全部見えるか（PC 配置とスマホ配置）
const LOOK = "灰色の髪を後ろで雑に束ね、左の頬に古い刀傷、笑うと八重歯がのぞく。背は高いが猫背で、いつも眠たげな目をしている。";
const HIST = "港町の網元の三男に生まれたが、十四の冬に兄と喧嘩して家を飛び出した。島の剣術道場で下働きをしながら刀を覚え、師が死んだ夜に形見の打刀だけを持って本土へ渡った。借金が少しと、誰にも言えない約束がひとつある。兄とはまだ口をきいていない。";
for (const [name, vp] of [["traits_pc", { width: 1280, height: 1000 }], ["traits_phone", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await page.goto(pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href);
  await page.waitForFunction(() => window.G && G.setup && G.cre);
  await page.click('[data-fid="t-start"]');
  await page.fill("#pf-look", LOOK.slice(0, 60));
  await page.fill("#pf-history", HIST.slice(0, 160));
  await page.waitForTimeout(300);
  const sec = page.locator("section.creSec", { has: page.locator("#pf-history") });
  await sec.scrollIntoViewIfNeeded();
  await sec.screenshot({ path: out(name), type: "jpeg", quality: 82 });
  console.log("wrote", out(name));
  if (name === "traits_pc") {
    await page.click('[data-fid="p-next"]');
    await page.click('[data-fid="s-next"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: out("traits_sheet"), type: "jpeg", quality: 82, fullPage: true });
    console.log("wrote", out("traits_sheet"));
  }
  await page.close();
}
await browser.close();
