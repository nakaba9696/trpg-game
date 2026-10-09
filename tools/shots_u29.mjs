// U29：PC の四つの窓で、R8 レビュー（docs/review/playreview_2026-10-08.md）の画面の指摘が直ったかを撮って確かめる（Playwright）
// node tools/build.mjs && node tools/shots_u29.mjs → docs/shots/u29/r8_*.jpg
// 確かめること：仲間連れの戦闘で攻撃の手が全部見える（高 3）・仲間の番の「その他」に「一つ前に戻る」が二重に出ない（低 25）
// 「施設」が全部見える（表 4c）・旅の途中は左上が「〇〇への道中」（低 26）・序章の手がかりで組の札が窓の外に押し出されない
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
const out = (n) => new URL(`../docs/shots/u29/${n}.jpg`, import.meta.url).pathname;
mkdirSync(new URL("../docs/shots/u29/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
let bad = 0;
const ng = (m) => { bad++; console.log("  NG", m); };
const seed = () => {
  let s = 7;
  G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const stats = {}; G.data.STATS.forEach((k) => { stats[k] = 55; });
  G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "試し", sex: "男", age: 30, ageBand: "prime", origin: "karna" } });
};
// 開いた箱（box）の中で、窓（#u21side）の中に見えている選択肢の数
const visible = (sel) => {
  const side = document.getElementById("u21side").getBoundingClientRect();
  const box = document.querySelector(sel);
  if (!box) return { all: 0, vis: 0 };
  const bb = box.getBoundingClientRect();
  const acts = [...box.querySelectorAll(".act")];
  return { all: acts.length, vis: acts.filter((a) => { const r = a.getBoundingClientRect(); return r.top >= Math.max(bb.top, side.top) - 1 && r.bottom <= Math.min(bb.bottom, side.bottom) + 1; }).length };
};
for (const [w, h] of [[1280, 720], [1366, 768], [1920, 1080]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.u21);
  const quiet = () => page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); document.querySelectorAll("#toast, #u8note, #u14card, #u14cut").forEach((x) => { x.style.display = "none"; }); });
  const shot = async (n) => { await quiet(); await page.mouse.move(2, 2); await page.waitForTimeout(400); if (w === 1366 || (w === 1920 && n === "hint")) await page.screenshot({ path: out(`r8_${w}x${h}_${n}`), type: "jpeg", quality: 74 }); };
  // 町（はじめて）：序章の手がかりがあっても組の札が窓の中・「施設」を開くと全部見える
  await page.evaluate(seed);
  await page.evaluate(() => { G.S.mode = "explore"; G.ui.render(); });
  await quiet();
  const tabsIn = await page.evaluate(() => { const s = document.getElementById("u21side").getBoundingClientRect(); return [...document.querySelectorAll("#u21side .u13tab")].every((t) => { const r = t.getBoundingClientRect(); return r.top >= s.top && r.bottom <= s.bottom; }); });
  if (!tabsIn) ng(`${w}：町の組の札が窓の外に押し出される`);
  await shot("hint");
  await page.click('#u21side .u13tab[data-u13="t:fac"]');
  const fac = await page.evaluate(visible, "#u21open");
  console.log(w, "施設", JSON.stringify(fac));
  if (fac.vis < fac.all) ng(`${w}：施設が ${fac.vis}/${fac.all} しか見えない`);
  await shot("fac");
  // 旅の途中：左上は「〇〇への道中」
  await page.evaluate(() => { G.S.travel = "forest"; const e = G.data.EVENTS.find((x) => Array.isArray(x.choices) && x.choices.length >= 3); G.S.mode = "event"; G.S.event = e.id; G.ui.render(); });
  const where = await page.evaluate(() => document.querySelector("#u29where .u29wplace").textContent);
  if (!/への道中$/.test(where)) ng(`${w}：旅の途中の左上が「${where}」`);
  await shot("travel");
  // 仲間連れの戦闘：攻撃の手が全部見える
  await page.evaluate(() => {
    G.S.travel = null; G.S.mode = "explore"; G.S.event = null;
    G.addCompanion({ name: "ディル", cls: "剣士", desc: "", power: 50, dmg: 3, hp: 22, maxHp: 22 });
    G.addCompanion({ name: "カイデル", cls: "戦士", desc: "", power: 50, dmg: 3, hp: 38, maxHp: 38 });
    Object.assign(G.S.inv, { herb: 3, potion: 2 });
    G.startCombat(["orc", "goblin"], {}); G.main.save(); G.ui.render();
  });
  await page.keyboard.press("Escape");
  await quiet();
  const atk = await page.evaluate(visible, "#panel .u13main");
  console.log(w, "攻撃", JSON.stringify(atk));
  // F9 から「攻撃」「防御」は押すとすぐ決まる札になり、開いた見出し（戦技など）の手だけが一覧に出る。一覧の手が全部見えること
  if (!atk.all || atk.vis < atk.all) ng(`${w}：仲間連れの戦闘で攻撃の手が ${atk.vis}/${atk.all} しか見えない`);
  await shot("party");
  // 仲間の番の「その他」：「一つ前に戻る」は上の札だけ
  await page.evaluate(() => { G.act("cb:attack"); G.ui.render(); });
  await page.click('#panel .u13tab[data-u13="d:その他"]');
  const dup = await page.evaluate(() => [...document.querySelectorAll("#panel .act")].filter((a) => /一つ前に戻る/.test(a.textContent)).length);
  const top = await page.evaluate(() => !!document.querySelector(".f8who .f8back"));
  if (dup || !top) ng(`${w}：「一つ前に戻る」が二重（選択肢 ${dup}・上の札 ${top}）`);
  await shot("back");
  if (errs.length) ng(`${w}：ページのエラー ${errs.join("／")}`);
  await ctx.close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
