// V12：図鑑の「聞いた話」（ゴブリンの項目）と「噂」のタブを撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_v12.mjs
// docs/shots/v12/<pc|phone>_<foe|heard>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/v12/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => { await page.waitForTimeout(500); const out = new URL(`../docs/shots/v12/${vn}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); console.log("wrote", out); };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.f2 && G.f2.open);
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    G.codexMeet("goblin", true);
    G.codexKill("goblin", true);
    [
      "噂：断界山脈の洞穴で、ゴブリンが酒を売ってる。値切ると、なぜか高くなる。",
      "噂：迷いの森の切り株に、紙の冠のゴブリンが座ってる。家来を募ってるらしい。",
      "噂：黒鉄の砦の見張りの坊や、ゴブリンにだけは矢が射てねえらしい。",
      "噂：ヴァレンツァの浜に、百年前に沈んだ船が打ち上がったらしい。",
      "噂：ブランデールの酒場の二階に、付けを三年溜めてる絵描きがいる。",
      "噂：ヴァレンツァの港のいちばんの力持ちはな、蜘蛛が出ると倉の梁に登って降りてこない。",
      "噂：隣町の粉屋の娘、縁談を三つ断ったらしい。誰を待ってるんだかな。",
    ].forEach((t) => G.heard(t));
    G.ui.render();
    const t = document.querySelector("#toast"); if (t) t.style.display = "none";
    G.f2.open("foe");
  });
  await page.click('#dlgCodex .f2cell[data-id="goblin"]');
  await page.evaluate(() => { const d = document.querySelector("#dlgCodex .f2heard"); if (d) d.scrollIntoView({ block: "center" }); });
  await shot("foe");
  await page.click('#dlgCodex [data-tab="heard"]');
  await page.click('#dlgCodex .f2cell[data-id="loc:nerva"]');
  await shot("heard");
  console.log(vn, "errors:", errs.length ? errs : "none");
  await ctx.close();
}
await browser.close();
