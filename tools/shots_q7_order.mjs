// Q7：右上の並び（冒険中）を撮る。直す前と後を比べるため、名前の頭を引数で渡す
// node tools/build.mjs && node tools/shots_q7_order.mjs before|after
// docs/shots/q7_order/<before|after>_<pc|pc1280|phone|narrow>.jpg（画面の上の帯のあたりだけ）と、「システム」の一覧を開いたところ（after のみ）を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const tag = process.argv[2] || "after";
const VIEWS = { pc: { width: 1440, height: 860, scale: 1 }, pc1280: { width: 1280, height: 860, scale: 1 }, pc1100: { width: 1100, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 }, narrow: { width: 360, height: 760, scale: 2 } };
mkdirSync(new URL("../docs/shots/q7_order/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
let bad = 0;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.openSettings);
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 12; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    G.ui.render();
    const t = document.querySelector("#toast"); if (t) t.style.display = "none";
  });
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el && el.offsetParent !== null);
    const order = [...document.querySelectorAll(".top .tools button")].filter(vis).map((b) => b.textContent.replace(/\s+/g, " ").trim());
    const top = document.querySelector(".top");
    const r = top.getBoundingClientRect();
    const t = document.querySelector(".top .tools"); // 右上の列の中で横に流れて隠れていないか
    return { order, over: document.documentElement.scrollWidth > window.innerWidth + 1 || t.scrollWidth > t.clientWidth + 1, h: Math.ceil(r.bottom) };
  });
  console.log(tag, vn, info.over ? "OVERFLOW" : "fits", "|", info.order.join(" / "));
  if (info.over) bad++;
  const out = (name) => new URL(`../docs/shots/q7_order/${tag}_${name}.jpg`, import.meta.url).pathname;
  await page.screenshot({ path: out(vn), type: "jpeg", quality: 85, clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, info.h + 8) } });
  if (tag === "after") {
    // 「システム」の一覧と「…」（あれば）
    if (await page.isVisible("#q7System")) {
      await page.click("#q7System");
      await page.waitForTimeout(200);
      const items = await page.evaluate(() => [...document.querySelectorAll("#q7SystemBox button")].filter((b) => b.offsetParent !== null).map((b) => b.textContent.replace(/\s+/g, " ").trim()));
      console.log(tag, vn, "システム:", items.join(" / "));
      if (!/セーブ/.test(items[0] || "") || !/ロード/.test(items[1] || "") || !/タイトルへ/.test(items[2] || "") || items.length !== 3) { bad++; console.log("  ^ システムの中身が違う"); }
      await page.screenshot({ path: out(vn + "_system"), type: "jpeg", quality: 85, clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, info.h + 200) } });
      await page.keyboard.press("Escape");
    } else { bad++; console.log("  ^ システムのボタンが見えない"); }
    if (await page.isVisible("#q7More")) {
      await page.click("#q7More");
      await page.waitForTimeout(200);
      const items = await page.evaluate(() => [...document.querySelectorAll("#q7MoreBox button")].filter((b) => b.offsetParent !== null).map((b) => b.textContent.replace(/\s+/g, " ").trim()));
      console.log(tag, vn, "…:", items.join(" / "));
      await page.screenshot({ path: out(vn + "_more"), type: "jpeg", quality: 85, clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, info.h + 160) } });
      await page.keyboard.press("Escape");
    }
  }
  if (errs.length) { bad++; console.log("errors:", errs); }
  await page.close();
}
await browser.close();
console.log(bad ? `NG ${bad}` : "OK");
