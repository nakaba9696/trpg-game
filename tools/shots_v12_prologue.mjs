// V12：キャラ作成のあとの導入（3 頁）を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_v12_prologue.mjs
// docs/shots/v12/prologue_<a|b>_<1|2|3>.jpg を書く（a：盗賊・港町の生まれ・王を目指す、b：破戒神官・辺境の村・使徒を討つ・生い立ちあり）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
mkdirSync(new URL("../docs/shots/v12/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
const CASES = {
  a: { cls: "thief", origin: "nerva", goal: "king", name: "ミア", age: "19", history: "" },
  b: { cls: "priest", origin: "village", goal: "majin", name: "ゲルト", age: "52", history: "村の教会の鐘を、一人で守ってきた" },
};
for (const [key, c] of Object.entries(CASES)) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.setup && G.cre);
  await page.click('[data-fid="t-start"]');
  await page.check(`input[name="cls"][value="${c.cls}"]`, { force: true });
  await page.check(`input[name="origin"][value="${c.origin}"]`, { force: true });
  await page.check(`input[name="goal"][value="${c.goal}"]`, { force: true });
  // 名前と歳は選ぶ形（U16）。名前は候補の先頭、歳は年頃を選んでからその幅の中で
  await page.check(`input[name="pname"] >> nth=0`, { force: true });
  await page.check(`input[name="age"][value="${Number(c.age) >= 40 ? "old" : Number(c.age) >= 23 ? "prime" : "young"}"]`, { force: true });
  await page.selectOption("#pf-age", c.age);
  await page.fill("#pf-history", c.history);
  await page.click('[data-fid="p-next"]');
  await page.click('[data-fid="s-next"]');
  await page.click('[data-fid="c-go"]');
  for (let n = 1; n <= 3; n++) {
    await page.waitForTimeout(500);
    const out = new URL(`../docs/shots/v12/prologue_${key}_${n}.jpg`, import.meta.url).pathname;
    await page.screenshot({ path: out, type: "jpeg", quality: 82 });
    console.log("wrote", out);
    if (n < 3) await page.click('[data-fid="b-next"]');
  }
  console.log(key, "errors:", errs.length ? errs : "none");
  await page.close();
}
await browser.close();
