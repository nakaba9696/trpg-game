// V12：噂のタブの印（会う前の魔物の噂 → 噂のタブに！／会ったあと → 噂のタブは空で印なし、魔物のタブに！）を撮る
// node tools/build.mjs && node tools/shots_v12_bang.mjs
// docs/shots/v12/bang_before.jpg・bang_after.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
mkdirSync(new URL("../docs/shots/v12/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
const shot = async (name) => { await page.waitForTimeout(500); const out = new URL(`../docs/shots/v12/${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); console.log("wrote", out); };
await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.goto(url);
await page.waitForFunction(() => window.G && G.main && G.ui && G.f2 && G.f2.open);
await page.evaluate(() => {
  const D = G.data, stats = {};
  D.STATS.forEach((k) => { stats[k] = 50; });
  G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
  // ほかの新しい印は見た扱いにして、噂の印だけを見る
  Object.keys(G.codex().fresh || {}).forEach((k) => delete G.codex().fresh[k]);
  G.heard("噂：街道のゴブリンは、火を焚くと寄ってこないんだと");
  G.ui.render();
  const t = document.querySelector("#toast"); if (t) t.style.display = "none";
  G.f2.open("heard");
});
await shot("bang_before");
await page.evaluate(() => { document.querySelector("#dlgCodex").close(); G.codexMeet("goblin", true); G.f2.open("heard"); });
await shot("bang_after");
console.log("errors:", errs.length ? errs : "none");
await browser.close();
