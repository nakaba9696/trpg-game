// U27：行動ごとの「得たもの・失ったもの」の枠を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u27.mjs → docs/shots/u27/<pc|phone>_<buy|rest|event>.jpg
// 買う（品が増え・所持金が減る）／宿で休む（HP が戻り・所持金が減る）／名声か品の動いた行動（決まった乱数で遊んで最初に出たもの）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const out = new URL("../docs/shots/u27/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
let bad = 0;
for (const [vn, w, hh, sc] of [["pc", 1280, 800, 1], ["phone", 390, 844, 2]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: hh }, deviceScaleFactor: sc, reducedMotion: "reduce" })).newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.u27);
  await page.evaluate(() => {
    const D = G.data, stats = {}; D.STATS.forEach((k) => { stats[k] = 60; });
    let s = 27; G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    G.S.gold = 300; G.S.mode = "explore"; G.S.event = null; G.ui.render();
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  });
  const act = (pred) => page.evaluate((src) => { const f = eval(src); const a = G.actions().flatMap((g) => g.list).find((x) => !x.disabled && f(x)); if (!a) return null; G.act(a.id); G.ui.render(); return a.label; }, pred.toString());
  const shot = async (name) => {
    await page.evaluate(() => { document.querySelectorAll("#toast, #u8note, #u14card, #u14cut, .tip").forEach((x) => { x.style.display = "none"; }); const els = [...document.querySelectorAll("#log .l-gain")].filter((x) => x.offsetParent); const el = els[els.length - 1]; if (el) el.scrollIntoView({ block: "center" }); });
    await page.waitForTimeout(400);
    const n = await page.evaluate(() => [...document.querySelectorAll("#log .l-gain")].filter((x) => x.offsetParent).length);
    if (!n) { bad++; console.log("  NG", vn, name, "：得たものの枠が見えない"); }
    await page.screenshot({ path: `${out}${vn}_${name}.jpg`, type: "jpeg", quality: 72 });
    console.log(vn, name, await page.evaluate(() => (G.S.log.filter((e) => e.k === "gain").slice(-1)[0] || {}).text || ""));
  };
  await act((a) => a.id === "fac:shop");
  await act((a) => /buy/.test(a.id));
  await shot("buy");
  await act((a) => /を出る$/.test(a.label));
  await page.evaluate(() => { G.S.hp = Math.ceil(G.S.maxHp / 2); });
  await act((a) => a.id === "fac:inn");
  await act((a) => /泊まる|休む/.test(a.label));
  await shot("rest");
  await act((a) => /を出る$/.test(a.label));
  // 名声か品が動く行動が出るまで遊ぶ（戦闘は勝つまで攻撃）
  await page.evaluate(() => {
    for (let i = 0; i < 400 && !G.S.over; i++) {
      const before = G.S.log.length;
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      const a = G.S.combat ? acts[0] : acts[Math.floor(G.rand() * acts.length)];
      G.act(a.id);
      const g = G.S.log.slice(-6).filter((e) => e.k === "gain").pop();
      if (G.S.log.length > before && g && g.gains.some((x) => x.kind === "fame" || x.kind === "rep" || (x.kind === "item" && x.tone === "good")) && !G.S.combat) break;
    }
    G.S.hp = Math.max(G.S.hp, 1); G.ui.render();
  });
  await shot("event");
  if (errs.length) { bad++; console.log("  NG", vn, errs.join("／")); }
  await page.context().close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
