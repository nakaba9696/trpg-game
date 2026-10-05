// Q7：「保存済み」を毎回出さないことを Chromium で確かめる（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/check_q7_quietsave.mjs
// - ふつうの行動を何度しても、帯の右上の印（.u11saved）が出ない
// - 町に着くと「✓ オートセーブしました」、手動でセーブすると「✓ セーブしました」が出る
// - 保存の場所がいっぱいのとき、行動すると「保存できませんでした」と知らせる
// docs/shots/q7_quietsave/<名前>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
mkdirSync(new URL("../docs/shots/q7_quietsave/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
let bad = 0;
const ng = (m) => { bad++; console.log("NG", m); };
const shot = async (name) => { const out = new URL(`../docs/shots/q7_quietsave/${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); };
await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.goto(url);
await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.openSlots);
await page.evaluate(() => {
  const D = G.data, stats = {};
  D.STATS.forEach((k) => { stats[k] = 12; });
  G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "確かめ用", personality: "無口" } });
  // 印が出た回数と文を数える
  window.__marks = [];
  const el = document.querySelector(".u11saved");
  new MutationObserver(() => { if (el.classList.contains("on")) window.__marks.push(el.textContent); }).observe(el, { attributes: true, attributeFilter: ["class"] });
});
await page.waitForTimeout(300);
// ふつうの行動（町の中で、町を出ない行動）を何度か
const n = await page.evaluate(async () => {
  let k = 0;
  for (let i = 0; i < 8; i++) {
    const a = G.actions().flatMap((g) => g.list).find((x) => !x.disabled && /^(fac:|rest|wander|explore)/.test(x.id)) || G.actions().flatMap((g) => g.list).find((x) => !x.disabled && !/travel|sail|go:/.test(x.id));
    if (!a) break;
    G.act(a.id); G.ui.after(); k++;
    await new Promise((r) => requestAnimationFrame(r));
    if (G.S.mode === "fac") { G.S.mode = "explore"; G.S.fac = null; }
  }
  return k;
});
await page.waitForTimeout(400);
let marks = await page.evaluate(() => window.__marks.slice());
console.log("ふつうの行動", n, "回 → 印", JSON.stringify(marks));
if (marks.length) ng("ふつうの行動で保存の印が出た");
// 町に着く
await page.evaluate(() => {
  const D = G.data, S = G.S;
  const wild = Object.keys(D.LOCS).find((k) => D.LOCS[k].type !== "town");
  const town = Object.keys(D.LOCS).find((k) => D.LOCS[k].type === "town" && k !== S.loc);
  S.loc = wild; G.main.save();
  S.loc = town; G.main.save(); G.ui.render();
});
await page.waitForTimeout(150);
await shot("town");
marks = await page.evaluate(() => window.__marks.slice());
console.log("町に着く → 印", JSON.stringify(marks));
if (marks.join() !== "✓ オートセーブしました") ng("町に着いても「オートセーブしました」が出ない");
// 手動でセーブ
await page.evaluate(() => { window.__marks.length = 0; G.ui.openSlots("save"); });
await page.click('#dlgSlots [data-slot="slot1"] .q7go');
await page.evaluate(() => document.querySelector("#dlgSlots").close());
await page.waitForTimeout(150);
await shot("manual");
marks = await page.evaluate(() => window.__marks.slice());
console.log("手動でセーブ → 印", JSON.stringify(marks));
if (marks.join() !== "✓ セーブしました") ng("手動でセーブしても「セーブしました」が出ない");
// 保存の場所がいっぱい
const toast = await page.evaluate(() => {
  const real = Storage.prototype.setItem;
  Storage.prototype.setItem = function () { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; };
  G.main.save(); G.main.save();
  Storage.prototype.setItem = real;
  const t = document.querySelector("#toast");
  return t && !t.hidden ? t.textContent : "";
});
await shot("fail");
console.log("いっぱいのとき →", JSON.stringify(toast));
if (!/保存できませんでした/.test(toast) || (toast.match(/保存できませんでした/g) || []).length !== 1) ng("保存できなかったときの知らせが 1 回出ない");
console.log("errors:", errs.length ? errs : "none");
if (errs.length) bad++;
await browser.close();
console.log(bad ? `NG ${bad}` : "OK");
