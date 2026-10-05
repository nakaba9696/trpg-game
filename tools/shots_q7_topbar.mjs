// Q7：右上の道具の列と設定の窓を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_q7_topbar.mjs
// docs/shots/q7_topbar/<pc|phone|narrow>_<title|play|more|settings>.jpg を書く。横のはみ出し・図鑑と地図のボタンの数も出す
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 }, narrow: { width: 360, height: 760, scale: 2 } };
mkdirSync(new URL("../docs/shots/q7_topbar/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
let bad = 0;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => { await page.waitForTimeout(350); const out = new URL(`../docs/shots/q7_topbar/${vn}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); };
  // 見えているボタンの字と、横のはみ出し
  const probe = (label) => page.evaluate(() => {
    const vis = (el) => !!(el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden");
    const btns = [...document.querySelectorAll("button")].filter(vis);
    const count = (re) => btns.filter((b) => re.test(b.textContent.trim())).length;
    const top = [...document.querySelectorAll(".top .tools > *")].filter(vis).map((e) => e.id || e.className).join(" | ");
    return { over: document.documentElement.scrollWidth > window.innerWidth + 1, codex: count(/^図鑑/), map: count(/^地図/), quest: count(/^依頼/), sheet: count(/^ステータス/), top };
  }).then((r) => { console.log(vn, label, JSON.stringify(r)); if (r.over || r.codex > 1 || r.map > 1 || r.quest > 1 || r.sheet > 1) { bad++; console.log("  ^ NG"); } return r; });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.openSettings);
  await probe("title");
  await shot("title");
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    G.ui.render();
    const t = document.querySelector("#toast"); if (t) t.style.display = "none";
  });
  const r = await probe("play");
  if (r.codex !== 1 || r.map !== 1 || r.quest !== 1 || r.sheet !== 1) { bad++; console.log("  ^ 図鑑・地図・依頼・ステータスが 1 つずつでない"); }
  await shot("play");
  if (await page.isVisible("#q7More")) { await page.click("#q7More"); await probe("more"); await shot("more"); await page.keyboard.press("Escape"); }
  // 設定の窓（U13 などが足す項目の口も試す）
  await page.evaluate(() => {
    let fast = false;
    G.ui.addSetting({ id: "demoSpeed", section: "遊び", label: "戦闘の表示の速さ", kind: "select", options: [["normal", "ふつう"], ["fast", "速い"]], get: () => (fast ? "fast" : "normal"), set: (v) => { fast = v === "fast"; }, hint: "（U13 が足す項目の見本）" });
    G.ui.openSettings();
  });
  await shot("settings");
  const s = await page.evaluate(() => ({ sections: [...document.querySelectorAll("#dlgSettings .q7setsec h3")].map((x) => x.textContent), sound: !!document.querySelector("#dlgSettings #sndMute"), bgm: !!document.querySelector("#dlgSettings #sndBgm"), demo: !!document.querySelector("#dlgSettings [data-setting=demoSpeed]"), soundOpen: !!(document.querySelector("#dlgSound") || {}).open }));
  console.log(vn, "settings", JSON.stringify(s));
  if (!s.sound || !s.demo || s.soundOpen) { bad++; console.log("  ^ 設定の窓の中身が足りない"); }
  // 音の消音を設定の窓で切り替えられる
  const muted = await page.evaluate(() => { const m = document.querySelector("#dlgSettings #sndMute"); m.checked = !m.checked; m.dispatchEvent(new Event("input")); return G.sound && G.sound.settings && G.sound.settings.mute; });
  console.log(vn, "mute toggled:", muted);
  await page.evaluate(() => document.querySelector("#dlgSettings").close());
  // タイトルへ：戦闘中に押す → 確かめ → タイトル。中断から戦闘に戻れる
  await page.evaluate(() => { G.startCombat(["goblin"], {}); G.ui.render(); });
  await page.click("#q7System"); // セーブ・ロード・タイトルへは「システム」の一覧の中
  await page.click("#q7ToTitle");
  await shot("totitle");
  await page.click("#q7ToTitleYes");
  const t = await page.evaluate(() => ({ title: !document.querySelector("#setup").hidden, cont: !!document.querySelector("[data-fid=t-cont]"), saved: (() => { try { const j = JSON.parse(localStorage.getItem(G.SAVE_KEYS.save)); return j && j.mode; } catch { return null; } })() }));
  await page.click("[data-fid=t-cont]");
  const back = await page.evaluate(() => ({ play: !document.querySelector("#play").hidden, mode: G.S && G.S.mode }));
  console.log(vn, "to title:", JSON.stringify(t), "back:", JSON.stringify(back));
  if (!t.title || !t.cont || t.saved !== "combat" || !back.play || back.mode !== "combat") { bad++; console.log("  ^ タイトルへ／中断から戻るがおかしい"); }
  console.log(vn, "errors:", errs.length ? errs : "none");
  if (errs.length) bad++;
  await ctx.close();
}
await browser.close();
console.log(bad ? `NG ${bad}` : "OK");
