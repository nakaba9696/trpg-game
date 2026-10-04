// W5：世界地図を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_w5.mjs
// docs/shots/w5/<pc|phone>_<light|dark>_<first|later>.jpg を書く
//   first：初めて遊ぶとき（出発の町だけ）　later：前の冒険で何か所か行き、今の冒険でも何か所か行ったあと
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/w5/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
for (const [vn, vp] of Object.entries(VIEWS)) {
  for (const theme of ["light", "dark"]) {
    for (const when of ["first", "later"]) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href);
      await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render && G.w5 && G.w5.ui);
      await page.evaluate(([theme, when]) => {
        G.theme && G.theme.set && G.theme.set(theme);
        const D = G.data, stats = {}, caps = {};
        D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
        G.P.codex = { items: {}, foes: {}, people: {}, places: {} };
        if (when === "later") ["nerva", "yakumo", "w1_holy", "ruins", "w3_frosleia", "onigashima"].forEach((id, i) => { G.P.codex.places[id] = { by: "傭兵 ハルト", date: "1127年 春", at: i }; });
        G.main.start({ cls: "fighter" in D.CLASSES ? "fighter" : Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "撮影", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
        const S = G.S;
        if (when === "later") { ["karna", "plains", "leavel", "w2_dranherz", "frost", "fort", "zephara"].forEach((id) => { S.visited[id] = true; }); S.loc = "fort"; G.w5.record(S); }
        G.ui.render();
        const t = document.querySelector("#toast"); if (t) t.style.display = "none";
        G.ui.openMap();
      }, [theme, when]);
      await page.waitForTimeout(600);
      const out = new URL(`../docs/shots/w5/${vn}_${theme}_${when}.jpg`, import.meta.url).pathname;
      await page.screenshot({ path: out, type: "jpeg", quality: 82 });
      console.log("wrote", out);
      await page.close();
    }
  }
}
await browser.close();
