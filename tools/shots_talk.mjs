// 仲間との会話の画面を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_talk.mjs
// docs/shots/talk/<pc|sp>_<場面>.jpg を書く（話題の一覧・話・掛け合いの問い・シートの「話す」）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const VIEWS = { pc: { width: 1280, height: 800 }, sp: { width: 390, height: 844 } };
const dir = new URL("../docs/shots/talk/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const browser = await pw.chromium.launch();
for (const [vn, vp] of Object.entries(VIEWS)) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion: "reduce" });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto(pathToFileURL(new URL("../dist/morsveld.html", import.meta.url).pathname).href);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
  await page.evaluate(() => {
    const D = G.data, stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "撮影", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    const S = G.S;
    S.loc = "nerva"; S.mode = "explore"; S.event = null;
    ["sheila", "dil", "zerina"].forEach((id) => G.c2Join(id));
    G.affState(S).sheila = 50;
    G.tkState(S).heard = { sheila_p1: { day: 1, k: "earnest" }, sheila_p2: { day: 1, k: "sea" }, sheila_p3: { day: 1, k: "joke" } };
    G.tk.record("boss", "大きな熊");
  });
  const hideToast = () => page.evaluate(() => { G.ui.render(); window.scrollTo(0, 0); const t = document.querySelector("#toast"); if (t) t.style.display = "none"; });
  const shot = async (name) => { await hideToast(); await page.waitForTimeout(1200); const out = dir + `${vn}_${name}.jpg`; await page.screenshot({ path: out, type: "jpeg", quality: 78 }); console.log("wrote", out); };
  // 話題の一覧
  await page.evaluate(() => { const c = G.S.companions.find((x) => x.c2 === "sheila"); G.act("m2talk:" + c.id); G.S.tk.cur.menu = ["sheila_e_boss", "sheila_p5", "sheila_l_wild", "sheila_m_dil", "sheila_c_umuri"].filter((id) => G.tk.topic(id)); });
  await shot("menu");
  // 話（身の上の五段目）
  await page.evaluate(() => { G.act("ev:1"); });
  await shot("topic");
  // 返したあと
  await page.evaluate(() => { G.act("ev:2"); });
  await shot("reply");
  // 掛け合いの問い
  await page.evaluate(() => { G.tk.finish(); G.tkState(G.S).banterDay = 0; G.tk.banter(G.data.TALK_BANTER.find((b) => b.id === "bt_dz_debt")); });
  await shot("banter");
  // シートの「話す」
  await page.evaluate(() => { G.tk.finish(); G.S.day++; G.ui.render(); G.ui.setSheetOpen(true); const sh = document.querySelector("#sheet .comps"); if (sh) sh.scrollIntoView({ block: "center" }); });
  await page.waitForTimeout(800);
  { const out = dir + `${vn}_sheet.jpg`; await page.screenshot({ path: out, type: "jpeg", quality: 78 }); console.log("wrote", out); }
  await page.close();
}
await browser.close();
