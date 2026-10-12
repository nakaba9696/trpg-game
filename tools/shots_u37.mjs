// U37：旅の出来事の区切りを撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u37.mjs → docs/shots/u37/<pc|phone>_<1|2|3|4>.jpg
// 1 一件目の出来事（道中の一行から）／2 選んだ結果（「先へ進む」を待つ）／3 二件目の出来事（本文の窓は書き直し）／4 着く前の区切り
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const out = new URL("../docs/shots/u37/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
let bad = 0;
for (const [vn, w, hh, sc] of [["pc", 1280, 800, 1], ["phone", 390, 844, 2]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: hh }, deviceScaleFactor: sc, reducedMotion: "reduce" })).newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.u37);
  await page.evaluate(() => {
    const D = G.data, stats = {}; D.STATS.forEach((k) => { stats[k] = 60; });
    let s = 37; G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    G.S.loc = "karna"; G.S.visited.karna = true; G.S.mode = "explore"; G.S.event = null; G.S.maxHp = G.S.hp = 999;
    G.w6.count = () => 2; G.w6.raidChance = () => 0;
    G.ui.render();
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  });
  const shot = async (name) => {
    await page.evaluate(() => { if (G.u28 && G.u28.skip) G.u28.skip(); document.querySelectorAll("#toast, #u8note, #u14card, #u14cut, .tip").forEach((x) => { x.style.display = "none"; }); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}${vn}_${name}.jpg`, type: "jpeg", quality: 72 });
    const vis = await page.evaluate(() => [...document.querySelectorAll("#log > *")].filter((x) => x.offsetParent).map((x) => x.textContent.slice(0, 40)));
    console.log(vn, name, JSON.stringify(vis));
    return vis;
  };
  // ボタンを押す（#panel の中で、文字が合うもの。無ければ最初のもの）
  const press = async (re) => {
    const ok = await page.evaluate((src) => {
      const re = src ? new RegExp(src) : null;
      const bs = [...document.querySelectorAll("#panel button")].filter((b) => !b.disabled && b.offsetParent);
      const b = (re && bs.find((x) => re.test(x.textContent))) || bs[0];
      if (!b) return false;
      b.click();
      return true;
    }, re ? re.source : null);
    if (!ok) { bad++; console.log("  NG", vn, "押せるボタンが無い", re); }
    await page.waitForTimeout(300);
  };
  await page.evaluate(() => { G.act("travel:zephara"); G.ui.render(); });
  const v1 = await shot("1");
  if (!v1.some((t) => /日目/.test(t))) { bad++; console.log("  NG", vn, "一件目の前に道中の一行が無い"); }
  await press(null);
  await shot("2");
  await press(/先へ進む/);
  const v3 = await shot("3");
  if (!/日目/.test(v3.join("")) || v3.length > v1.length + 8) { bad++; console.log("  NG", vn, "二件目が書き直されていない"); }
  // 二件目を終えて、着く前の区切り
  for (let i = 0; i < 6 && (await page.evaluate(() => G.S.mode === "event")); i++) await press(null);
  await press(/先へ進む/);
  const v4 = await shot("4");
  if (!v4.some((t) => /見えてきた/.test(t))) { bad++; console.log("  NG", vn, "着く前の区切りが無い"); }
  if (errs.length) { bad++; console.log("  NG", vn, errs.join("／")); }
  await page.context().close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
