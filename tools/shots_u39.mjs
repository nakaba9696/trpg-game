// U39：画面の動きを撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）。動きは止めて、途中（mid）と終わり（end）を撮る
// node tools/build.mjs && node tools/shots_u39.mjs → docs/shots/u39/<pc|phone>_<場面>_<mid|end>.jpg
//   dice_crit・dice_fumble（さいころ）／hurt（揺れと数）／heal（回復の数）／gain（得たもの）／beat（旅の区切り）／dialog（窓）／stand（立ち絵）／still（動きを減らす）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const out = new URL("../docs/shots/u39/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
let bad = 0;
const ng = (...m) => { bad++; console.log("  NG", ...m); };
for (const [vn, w, hh, sc] of [["pc", 1280, 800, 1], ["phone", 390, 844, 2]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: hh }, deviceScaleFactor: sc })).newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.u39 && G.u37);
  await page.evaluate(() => {
    const D = G.data, stats = {}; D.STATS.forEach((k) => { stats[k] = 60; });
    let s = 39; G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    G.S.loc = "karna"; G.S.visited.karna = true; G.S.mode = "explore"; G.S.event = null; G.S.maxHp = G.S.hp = 60;
    G.w6.count = () => 2; G.w6.raidChance = () => 0;
    G.ui.render();
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    G.u39.finishAll();
  });
  await page.waitForTimeout(1500); // 場面の絵が出そろうまで
  const hide = () => page.evaluate(() => document.querySelectorAll("#toast, #u8note, #u14card, #u14cut, .tip").forEach((x) => { x.style.display = "none"; }));
  // 動きを ms の所で止めて撮る。end は全部終えてから
  const shot = async (name, ms, sel) => {
    await hide();
    // 動いている行が見える所まで記録の窓を送る（スマホは窓が低い）
    if (sel) await page.evaluate((sel) => { const el = [...document.querySelectorAll(sel)].pop(); if (el) el.scrollIntoView({ block: "center" }); }, sel);
    if (ms != null) await page.evaluate((ms) => G.u39.live().forEach((a) => { try { a.pause(); a.currentTime = ms; } catch {} }), ms);
    else { await page.evaluate(() => G.u39.finishAll()); await page.waitForTimeout(80); }
    await page.screenshot({ path: `${out}${vn}_${name}_${ms != null ? "mid" : "end"}.jpg`, type: "jpeg", quality: 72 });
  };
  const count = () => page.evaluate(() => G.u39.running());
  // さいころ（大成功・大失敗）
  for (const [k, r] of [["crit", 0.005], ["fumble", 0.999]]) {
    await page.evaluate((r) => { const R = G.rand; G.rand = () => r; try { G.check(G.data.STATS[0], 0, "崩れた石垣をよじ登る"); } finally { G.rand = R; } G.ui.render(); }, r);
    await page.waitForTimeout(40);
    if (!(await count())) ng(vn, k, "さいころが動いていない");
    await shot("dice_" + k, 140, "#log > .check");
    await page.evaluate(() => G.u39.live().forEach((a) => a.play()));
    await page.waitForTimeout(300); // 止まる動き（転がり終えてから始まる）
    await shot("dice_" + k + "land", 120, "#log > .check");
    await shot("dice_" + k, null, "#log > .check");
  }
  // ダメージ（揺れと数）・回復
  await page.evaluate(() => { G.S.log.push({ k: "sys", text: "崩れた石が肩を打った。", fx: "hurt", n: 9, heavy: true }); G.ui.render(); });
  await page.waitForTimeout(60);
  if (!(await count())) ng(vn, "揺れと数が動いていない");
  await shot("hurt", 120);
  await shot("hurt");
  await page.evaluate(() => { G.S.hp -= 12; G.ui.render(); });
  await page.waitForTimeout(40);
  await page.evaluate(() => { G.S.hp += 12; G.ui.render(); });
  await page.waitForTimeout(40);
  await shot("heal", 200);
  await shot("heal");
  // 得たもの
  await page.evaluate(() => {
    G.S.log.push({ k: "gain", text: "得たもの：金 +120・名声 +2・評判（ネルヴァ）+1・干し肉", gains: [
      { kind: "gold", tone: "good", text: "120 G" }, { kind: "fame", tone: "good", text: "名声 +2" }, { kind: "rep", tone: "good", text: "ネルヴァの評判 +1" }, { kind: "item", tone: "good", text: "干し肉" }, { kind: "hp", tone: "bad", text: "HP −3" }] });
    G.ui.render();
  });
  await page.waitForTimeout(40);
  await shot("gain", 160, "#log > .l-gain");
  await shot("gain", null, "#log > .l-gain");
  // 窓
  await page.evaluate(() => document.querySelector("#dlgSettings").showModal());
  await page.waitForTimeout(30);
  await shot("dialog", 70);
  await shot("dialog");
  await page.evaluate(() => document.querySelector("#dlgSettings").close());
  await page.waitForTimeout(30);
  if (!(await page.evaluate(() => document.querySelector("#dlgSettings").open))) ng(vn, "窓の閉じる動きが無い");
  await page.waitForFunction(() => !document.querySelector("#dlgSettings").open, null, { timeout: 3000 }).catch(() => {});
  if (await page.evaluate(() => document.querySelector("#dlgSettings").open)) ng(vn, "窓が閉じない", await page.evaluate(() => { const d = document.querySelector("#dlgSettings"); return JSON.stringify([d.getAnimations({subtree:false}).map((a) => [a.playState, a.currentTime, a.effect.pseudoElement]), !!d.u39done, document.timeline.currentTime]); }));
  // 旅の区切り
  const press = async (re) => {
    await page.evaluate((src) => {
      const re = src ? new RegExp(src) : null;
      const bs = [...document.querySelectorAll("#panel button")].filter((b) => !b.disabled && b.offsetParent);
      const b = (re && bs.find((x) => re.test(x.textContent))) || bs[0];
      if (b) b.click();
    }, re ? re.source : null);
  };
  // 町の文が流れて消え、道中の一行から書き直される
  await page.evaluate(() => { G.u39.finishAll(); G.act("travel:zephara"); G.ui.render(); });
  await page.waitForTimeout(30);
  if (!(await count())) ng(vn, "区切りで動いていない");
  await shot("beat", 150, "#log > :first-child");
  await shot("beat");
  // 立ち絵
  await page.evaluate(() => { const e = G.data.EVENTS.find((x) => x.id === "c2_nora"); if (e) G.startEvent(e); G.ui.render(); });
  await page.waitForTimeout(120);
  await shot("stand", 120);
  await shot("stand");
  await page.evaluate(() => { G.S.mode = "explore"; G.S.event = null; G.ui.render(); });
  void press;
  // 動きを減らす：設定を入れると、判定を振っても何も動かない
  await page.evaluate(() => { G.P.u39still = true; G.S.mode = "explore"; G.S.event = null; G.check(G.data.STATS[0], 0, "扉を押す"); G.S.log.push({ k: "sys", text: "肩を打った。", fx: "hurt", n: 3 }); G.ui.render(); });
  await page.waitForTimeout(60);
  const n = await count();
  if (n) ng(vn, "動きを減らしても動く", n);
  const mq = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (!mq) ng(vn, "動きを減らす設定が、ほかのファイルの問い合わせに伝わらない");
  await shot("still");
  if (errs.length) ng(vn, errs.join("／"));
  await page.context().close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
