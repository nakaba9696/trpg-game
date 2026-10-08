// U30：R8 レビュー（docs/review/playreview_2026-10-08.md）の画面の指摘のうち、配置（U29）の外のものを撮って確かめる（Playwright）
// node tools/build.mjs && node tools/shots_u30.mjs → docs/shots/u30/*.jpg
// 確かめること：Enter の連打で選択肢が押されない（高 1）・山場の幕の間は知らせを待たせる（中 17）・「得たもの」の枠と同じ数だけの行は本文に出さない（低 18）
// スマホの戦闘で知らせが HP・MP の札に重ならない・魔物の絵が本文の枠の上の帯に収まる（中 15）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
const out = (n) => new URL(`../docs/shots/u30/${n}.jpg`, import.meta.url).pathname;
mkdirSync(new URL("../docs/shots/u30/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
let bad = 0;
const ng = (m) => { bad++; console.log("  NG", m); };
const start = () => {
  const stats = {}; G.data.STATS.forEach((k) => { stats[k] = 55; });
  G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "試し", sex: "男", age: 30, ageBand: "prime", origin: "karna" } });
};
const openPage = async (w, h, scale) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.u30);
  await page.evaluate(start);
  return { ctx, page, errs };
};
{
  const { ctx, page, errs } = await openPage(1366, 768, 1);
  // 高 1：出来事で Enter を連打しても、選択肢は押されず、焦点も当たらない
  await page.evaluate(() => { const e = G.data.EVENTS.find((x) => Array.isArray(x.choices) && x.choices.length >= 3); G.S.mode = "event"; G.S.event = e.id; G.ui.render(); });
  await page.keyboard.press("Escape");
  const b0 = await page.evaluate(() => [G.S.event, G.S.log.length].join());
  for (let i = 0; i < 8; i++) { await page.keyboard.press("Enter"); await page.waitForTimeout(100); }
  const b1 = await page.evaluate(() => [G.S.event, G.S.log.length].join());
  const foc = await page.evaluate(() => !!(document.activeElement && document.activeElement.closest && document.activeElement.closest("#panel .act")));
  if (b0 !== b1 || foc) ng(`Enter の連打で選択肢が押された・焦点が当たった（${b0} → ${b1}・焦点 ${foc}）`);
  await page.screenshot({ path: out("1366x768_enter"), type: "jpeg", quality: 74 });
  // 低 18：枠と同じ数だけの行は出さない（訳のある行は残す）
  await page.evaluate(() => { G.S.mode = "explore"; G.S.event = null; G.log("you", "荷車を押す"); G.say("荷車は動いた。親方が小銭を握らせ、あなたは指を挟んだ。"); G.note("所持金 +3G"); G.note("HP -1"); G.log("gain", "得たもの：+3G・HP −1", { gains: [{ kind: "gold", label: "所持金", delta: 3, tone: "good", text: "+3G" }, { kind: "hp", label: "HP", delta: -1, tone: "bad", text: "HP −1" }] }); G.ui.render(); });
  await page.waitForTimeout(1500);
  const dup = await page.evaluate(() => [...document.querySelectorAll("#log > p.l-sys")].filter((p) => /^(所持金 \+3G|HP -1)$/.test(p.textContent) && getComputedStyle(p).display !== "none").length);
  if (dup) ng(`「得たもの」の枠と同じ行が本文に ${dup} 行残る`);
  await page.screenshot({ path: out("1366x768_gains"), type: "jpeg", quality: 74 });
  // 中 17：山場の幕の間は知らせを出さない。幕が消えたら出す
  const h = await page.evaluate(async () => {
    G.act("u30:none");
    G.u14.showCut("――そのとき", "忘れ水の使徒ルアマリスが、得物を抜いて向かってきた。", "combat");
    G.ui.toast("トロフィー獲得『テスト』");
    G.ui.render();
    const t = document.getElementById("toast");
    const during = !!(t && !t.hidden && getComputedStyle(t).display !== "none" && t.textContent.includes("テスト"));
    return during;
  });
  await page.screenshot({ path: out("1366x768_cut"), type: "jpeg", quality: 74 });
  await page.waitForTimeout(2600);
  const later = await page.evaluate(() => (document.getElementById("toast") || {}).textContent || "");
  if (h || !later.includes("テスト")) ng(`山場の幕の間に知らせが出た・幕のあとに出ない（${h}・${later}）`);
  if (errs.length) ng("ページのエラー " + errs.join("／"));
  await ctx.close();
}
{
  // 中 15：スマホの戦闘
  const { ctx, page, errs } = await openPage(390, 844, 2);
  await page.evaluate(() => { G.S.mode = "explore"; G.startCombat(["orc", "goblin"], {}); G.main.save(); G.ui.render(); });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  await page.evaluate(() => { G.ui.toast("トロフィー獲得『一流』銀"); try { G.gloss.announce("魔物"); } catch (e) { /* 用語が無くても撮る */ } });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const R = (s) => { const e = document.querySelector(s); return e && getComputedStyle(e).display !== "none" && !e.hidden ? e.getBoundingClientRect() : null; };
    const bar = R("#mbar"), toast = R("#toast"), note = R("#u8note");
    const over = (a) => !!(a && bar && a.top < bar.bottom && a.bottom > bar.top);
    return { over: over(toast) || over(note), band: G.u30.band() };
  });
  if (r.over) ng("スマホの戦闘で知らせが HP・MP の札に重なる");
  if (!r.band) ng("スマホの戦闘で魔物を収める帯が無い");
  await page.screenshot({ path: out("phone_combat"), type: "jpeg", quality: 74 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(900);
  await page.screenshot({ path: out("phone_combat_top"), type: "jpeg", quality: 74 });
  if (errs.length) ng("ページのエラー " + errs.join("／"));
  await ctx.close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
