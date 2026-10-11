// U31：スマホの画面（縦長 390×844・360×780・430×932、横長 844×390）を撮って確かめる（Playwright）
// node tools/build.mjs && node tools/shots_u31.mjs [before] → docs/shots/u31/<before_|>…jpg
// 確かめること：ページが動かない（スクロールはログを開いたときと組の中だけ）・舞台（背景と立ち絵・魔物）にログの窓が重ならない・
// 話している人の立ち絵がログの窓の上に収まる・戦闘の魔物の場所が舞台の中・押す所の高さ 44px 以上・知らせが立ち絵とコマンドに重ならない・PC の配置は変わらない
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const tag = process.argv[2] === "before" ? "before_" : "";
const check = !tag;
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
const out = (n) => new URL(`../docs/shots/u31/${tag}${n}.jpg`, import.meta.url).pathname;
mkdirSync(new URL("../docs/shots/u31/", import.meta.url), { recursive: true });
const VIEWS = { "390x844": [390, 844], "360x780": [360, 780], "430x932": [430, 932], "844x390": [844, 390] };
const browser = await pw.chromium.launch();
let bad = 0;
const ng = (m) => { bad++; console.log("  NG", m); };
const seed = () => {
  let s = 11;
  G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const stats = {}; G.data.STATS.forEach((k) => { stats[k] = 55; });
  G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "試し", sex: "男", age: 30, ageBand: "prime", origin: "karna" } });
  G.S.gold = 300;
};
for (const [vn, [w, h]] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: "reduce", hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.v9);
  const quiet = () => page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); document.querySelectorAll("#toast, #u8note, #u14card, #u14cut").forEach((x) => { x.style.display = "none"; }); });
  const shot = async (n, keepNotes) => { if (!keepNotes) await quiet(); await page.waitForTimeout(500); await page.screenshot({ path: out(`${vn}_${n}`), type: "jpeg", quality: 72 }); };
  const measure = () => page.evaluate(() => {
    const R = (el) => { if (!el) return null; const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null; };
    window.scrollTo(0, 300);
    const sy = window.scrollY;
    window.scrollTo(0, 0);
    const de = document.documentElement;
    const tome = R(document.querySelector(".tome")), side = R(document.getElementById("u21side")), top = R(document.getElementById("mbar"));
    const figs = [...document.querySelectorAll("#v9cast .v9fig.front")].map(R).filter(Boolean);
    const foes = R(document.getElementById("v9foes"));
    const small = [...document.querySelectorAll("#u21side .act, #u21side .u13tab, #u21side .u31bigbtn, .u31menu, .u31logbtn")].map((b) => [b, R(b)]).filter(([, r]) => r && r.h < 43.5).map(([b, r]) => (b.className.split(" ")[0]) + ":" + Math.round(r.h));
    return { sy, sh: de.scrollHeight, vh: innerHeight, sw: de.scrollWidth, vw: innerWidth, tome, side, top, figs, foes, small, mobile: document.body.classList.contains("u31m") };
  });
  const judge = (name, m, o = {}) => {
    console.log(vn, name, JSON.stringify({ page: `${m.sw}x${m.sh}`, sy: m.sy, tome: m.tome && [Math.round(m.tome.y), Math.round(m.tome.b)], side: m.side && [Math.round(m.side.y), Math.round(m.side.b)], figs: m.figs.map((f) => [Math.round(f.y), Math.round(f.b)]), small: m.small.slice(0, 6) }));
    if (!check) return;
    if (!m.mobile) ng(`${vn} ${name}：スマホの形になっていない`);
    if (m.sy || m.sh > m.vh + 1 || m.sw > m.vw + 1) ng(`${vn} ${name}：ページが動く（${m.sw}×${m.sh}）`);
    const inside = (r) => r && r.x >= -1 && r.y >= -1 && r.r <= m.vw + 1 && r.b <= m.vh + 1;
    if (!inside(m.tome)) ng(`${vn} ${name}：ログの窓が画面からはみ出す`);
    if (!inside(m.side)) ng(`${vn} ${name}：コマンドの窓が画面からはみ出す`);
    if (m.tome && m.side && m.tome.b > m.side.y + 1 && m.tome.r > m.side.x + 1) ng(`${vn} ${name}：ログとコマンドの窓が重なる`);
    if (o.fig) { if (!m.figs.length) ng(`${vn} ${name}：話している人の立ち絵が無い`); m.figs.forEach((f) => { if (m.tome && f.b > m.tome.y + 2 && f.r > m.tome.x && f.x < m.tome.r) ng(`${vn} ${name}：立ち絵がログの窓に隠れる（${Math.round(f.b)} > ${Math.round(m.tome.y)}）`); }); }
    if (o.foes) { if (!m.foes) ng(`${vn} ${name}：魔物の場所が無い`); else if (m.tome && m.foes.b > m.tome.y + 2 && m.foes.r > m.tome.x && m.foes.x < m.tome.r) ng(`${vn} ${name}：魔物の場所がログの窓に掛かる`); }
    if (m.small.length) ng(`${vn} ${name}：押す所が低い ${m.small.slice(0, 5).join("・")}`);
  };
  // 町
  await page.evaluate(seed);
  await page.evaluate(() => { G.S.mode = "explore"; G.main.save(); G.ui.render(); });
  await quiet();
  judge("town", await measure());
  await shot("town");
  // 施設の組を開く
  const fac = page.locator('#panel .u13tab[data-u13="t:fac"], #panel .u13tab[data-u13="here"]').first();
  if (await fac.count()) { await fac.click(); await page.waitForTimeout(200); judge("fac", await measure()); await shot("fac"); }
  // 出来事（話している人の立ち絵）
  const ev = await page.evaluate(() => {
    // 話し手の印（u11）が無くても話している人を出す（撮るため。U23 の撮影と同じ）
    if (G.u11 && G.u11.whoSpeaks) G.u11.whoSpeaks = () => true;
    G.S.mode = "event";
    const ok = (e) => { G.S.event = e.id; try { const w = G.stand && G.stand.whoOf ? G.stand.whoOf(G.S) : null; return !!(w && w.kind !== "hero" && (!G.portraitArt || G.portraitArt(w))); } catch (x) { return false; } };
    const e = G.data.EVENTS.find((x) => Array.isArray(x.choices) && x.choices.length >= 2 && !x.once && ok(x));
    if (!e) { G.S.mode = "explore"; G.S.event = null; return null; }
    G.S.event = e.id; G.main.save(); G.ui.render();
    return e.id;
  });
  console.log(vn, "event", ev);
  await page.waitForTimeout(900);
  await quiet();
  judge("event", await measure(), { fig: !!ev });
  await shot("event");
  // ログを全部開く
  await page.click(".tome", { position: { x: 60, y: 30 } }).catch(() => {});
  await page.waitForTimeout(300);
  const lo = await page.evaluate(() => document.body.classList.contains("u31logopen"));
  if (check && !lo) ng(`${vn}：ログの窓を押しても全文が開かない`);
  await shot("logopen");
  await page.click(".u31logbtn").catch(() => {});
  await page.waitForTimeout(200);
  if (check && (await page.evaluate(() => document.body.classList.contains("u31logopen")))) ng(`${vn}：「閉じる」でログが閉じない`);
  // メニュー
  await page.click(".u31menu").catch(() => {});
  await page.waitForTimeout(300);
  await shot("menu");
  await page.click(".u31menu").catch(() => {});
  // 戦闘：敵 1 体・3 体 × 仲間なし・あり（持ち主「敵が小さすぎ」）
  for (const [cn, foes, party] of [["combat1", ["orc"], 0], ["combat3", ["goblin", "orc", "goblin"], 0], ["combat1p", ["orc"], 2], ["combat3p", ["goblin", "orc", "goblin"], 2]]) {
    await page.evaluate(({ foes, party }) => {
      G.S.mode = "explore"; G.S.event = null; G.S.combat = null;
      G.S.companions = [];
      if (party) { G.addCompanion({ name: "ディル", cls: "剣士", desc: "", power: 50, dmg: 3, hp: 22, maxHp: 22 }); G.addCompanion({ name: "カイデル", cls: "戦士", desc: "", power: 50, dmg: 3, hp: 38, maxHp: 38 }); }
      Object.assign(G.S.inv, { herb: 3, potion: 2 });
      G.startCombat(foes, {}); G.main.save(); G.ui.render();
    }, { foes, party });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1200);
    await quiet();
    judge(cn, await measure(), { foes: true });
    if (check) {
      const r = await page.evaluate(() => {
        const st = document.getElementById("v9foes"), tome = document.querySelector(".tome");
        const s = st && st.getBoundingClientRect(), t = tome && tome.getBoundingClientRect();
        const cards = [...document.querySelectorAll("#panel .foes .foe")].map((c) => c.getBoundingClientRect());
        const side = document.getElementById("u21side").getBoundingClientRect();
        const tabsIn = [...document.querySelectorAll("#panel .u13drawers .u13tab")].every((b) => { const r = b.getBoundingClientRect(); return r.top >= side.top - 1 && r.bottom <= side.bottom + 1; });
        return { stageH: s ? s.height : 0, vh: innerHeight, vw: innerWidth, land: innerWidth > innerHeight, cardsInStage: cards.every((c) => s && c.top >= s.top - 1 && c.bottom <= s.bottom + 1), tomeTop: t ? t.top : 0, tabsIn };
      });
      if (!r.land && r.stageH < r.vh * 0.38) ng(`${vn} ${cn}：敵の絵の場所が低い（${Math.round(r.stageH)}px）`);
      if (!r.cardsInStage) ng(`${vn} ${cn}：敵の札が絵の上に重なっていない`);
      if (!r.tabsIn) ng(`${vn} ${cn}：戦闘の札（攻撃・防御・戦技…）がコマンドの窓からはみ出す`);
    }
    await shot(cn);
  }
  // 知らせ
  await page.evaluate(() => { document.querySelectorAll("#toast, #u8note").forEach((x) => { x.style.display = ""; }); G.ui.toast("トロフィー獲得『一流』銀"); try { G.gloss.announce("魔物"); } catch (e) { /* 無くても撮る */ } });
  await page.waitForTimeout(400);
  const note = await page.evaluate(() => {
    const R = (s) => { const e = document.querySelector(s); if (!e || getComputedStyle(e).display === "none" || e.hidden || !e.textContent.trim()) return null; const r = e.getBoundingClientRect(); return r.height ? r : null; };
    const side = R("#u21side"), notes = [R("#toast"), R("#u8note")].filter(Boolean);
    return notes.some((n) => side && n.bottom > side.top + 1);
  });
  if (check && note) ng(`${vn}：知らせがコマンドの窓に重なる`);
  await shot("notes", true);
  if (errs.length) ng(`${vn}：ページのエラー ${errs.join("／")}`);
  await ctx.close();
}
// PC の配置は変わらない（スマホの形にならない）
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(url); await page.waitForFunction(() => window.G && G.main && G.ui);
  await page.evaluate(seed);
  await page.evaluate(() => G.ui.render());
  const pc = await page.evaluate(() => [document.body.classList.contains("u21pc"), document.body.classList.contains("u31m")]);
  if (check && (!pc[0] || pc[1])) ng(`1366×768 が PC の配置でない ${pc}`);
  await ctx.close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
