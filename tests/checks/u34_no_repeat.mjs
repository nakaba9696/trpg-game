// U34: 戦闘に「↻ 前と同じ」のボタンを出さない（PC・スマホ）。キーの近道は元から無い。エンジンの G.f4.lastAction は残す
// Chromium（Playwright）と dist/site/index.html があれば実際の画面でも確かめる
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export default async ({ fail: failTo, ok }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U34: " + m); };
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  for (const f of ["src/ui/u13_menu.js", "src/ui/u13_menu.css", "src/ui/zzzzzzzz_u31_mobile.css"])
    if (/u13again|前と同じ：/.test(readFileSync(path.join(root, f), "utf8"))) fail(`${f} に「前と同じ」のボタンが残っている`);

  const page0 = path.join(root, "dist", "site", "index.html");
  let pw = null;
  if (existsSync(page0)) {
    const require = createRequire(import.meta.url);
    try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() + "/playwright"); } catch { pw = null; } }
  }
  let browser = null;
  if (pw) { try { browser = await pw.chromium.launch(); } catch { browser = null; } }
  if (!browser) { if (!bad) ok("U34: 作り（Chromium が無いので、画面は確かめていない）"); return; }
  const url = pathToFileURL(page0).href;
  try {
    for (const [w, h, touch] of [[1600, 900], [390, 844, 1], [844, 390, 1]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce", hasTouch: !!touch, isMobile: !!touch });
      await page.goto(url);
      await page.evaluate(() => localStorage.clear());
      await page.goto(url);
      await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
      await page.evaluate(() => {
        const D = G.data, stats = {};
        D.STATS.forEach((k) => { stats[k] = 12; });
        G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "確かめ用", personality: "無口" } });
        G.S.mode = "explore"; G.S.event = null; G.startCombat(["goblin", "goblin"], {});
        G.S.combat.foes.forEach((f) => { f.hp = 99; });
        G.ui.render();
      });
      await page.waitForTimeout(300);
      // 一手すすめて、前の手がある状態でも出ない
      const guard = page.locator("#panel button:visible:not([disabled])", { hasText: "身を守る" }).first();
      if (await guard.count()) await guard.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(800);
      const st = await page.evaluate(() => ({ fight: !!G.S.combat, lastAct: !!(G.f4 && G.f4.lastAction && G.f4.lastAction(G.S)), n: document.querySelectorAll(".u13again").length, txt: /↻|前と同じ/.test(document.getElementById("panel").textContent) }));
      if (!st.fight) fail(`${w}×${h} 戦闘が続いていない（確かめにならない）`);
      if (st.n || st.txt) fail(`${w}×${h} 戦闘の画面に「前と同じ」のボタンが出ている`);
      await page.close();
    }
  } finally { await browser.close(); }
  if (!bad) ok("U34: 戦闘に「前と同じ」のボタンが出ない（PC・スマホ縦横）");
};
