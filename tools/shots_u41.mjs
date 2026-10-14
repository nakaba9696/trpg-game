// U41：顔の窓（ADV の小さい四角い枠に表情の顔だけ出す）を撮って確かめる（Playwright）
// node tools/build.mjs && node tools/shots_u41.mjs [before] → docs/shots/u41/<before_|>…jpg
// 確かめること：全身の立ち絵が基本の絵（表情の鍵でない）・顔の窓が出る・顔の窓が本文の窓とコマンドの窓に重ならず画面の中・主人公の出来事では出ない
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
const out = (n) => new URL(`../docs/shots/u41/${tag}${n}.jpg`, import.meta.url).pathname;
mkdirSync(new URL("../docs/shots/u41/", import.meta.url), { recursive: true });
const VIEWS = { pc: [1280, 860, false], "390x844": [390, 844, true], "844x390": [844, 390, true] };
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
// 撮る場面：名のある人の出来事に表情を付ける
const SCENES = [["nora", "c2_nora_sniff", "anger"], ["nora_joy", "c2_nora_sniff", "joy"], ["plain", "c2_nora_sniff", null]];
for (const [vn, [w, h, mobile]] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, reducedMotion: "reduce", hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.v9);
  await page.evaluate(seed);
  const quiet = () => page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); document.querySelectorAll("#toast, #u8note, #u14card, #u14cut").forEach((x) => { x.style.display = "none"; }); });
  for (const [name, ev, mood] of SCENES) {
    await page.evaluate(([ev, mood]) => {
      if (G.u11 && G.u11.whoSpeaks) G.u11.whoSpeaks = () => true;
      G.S.mode = "event"; G.S.event = ev; G.S.mood = mood; G.main.save(); G.ui.render();
    }, [ev, mood]);
    await quiet();
    await page.waitForTimeout(1500);
    await page.evaluate(() => G.ui.render());
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const R = (el) => { if (!el) return null; const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null; };
      const keys = [...document.querySelectorAll("canvas.standFace, .v9fig.speaker canvas.v9face")].map((c) => c.dataset.v8key || "");
      const face = document.getElementById("u41face");
      return { keys, face: R(face), faceKey: face && face.dataset.key, img: face && face.querySelector(".u41img") && face.querySelector(".u41img").style.backgroundImage.slice(0, 60), tome: R(document.querySelector(".tome")), side: R(document.getElementById("u21side")), vw: innerWidth, vh: innerHeight };
    });
    console.log(vn, name, JSON.stringify(m));
    await page.screenshot({ path: out(`${vn}_${name}`), type: "jpeg", quality: 75 });
    if (!check) continue;
    if (m.keys.some((k) => /_[a-z]+$/.test(k) && k !== "nora")) ng(`${vn} ${name}：全身の立ち絵が表情の絵（${m.keys}）`);
    if (mood && !m.face) ng(`${vn} ${name}：顔の窓が出ない`);
    if (!mood && m.face) ng(`${vn} ${name}：表情の無い場面で顔の窓が出る`);
    if (m.face) {
      const f = m.face;
      if (f.x < -1 || f.y < -1 || f.r > m.vw + 1 || f.b > m.vh + 1) ng(`${vn} ${name}：顔の窓が画面からはみ出す`);
      const hit = (r) => r && f.r > r.x + 1 && f.x < r.r - 1 && f.b > r.y + 1 && f.y < r.b - 1;
      if (hit(m.tome)) ng(`${vn} ${name}：顔の窓が本文の窓に重なる`);
      if (hit(m.side)) ng(`${vn} ${name}：顔の窓がコマンドの窓に重なる`);
    }
  }
  if (errs.length) ng(`${vn}：ページのエラー ${errs.slice(0, 3).join(" / ")}`);
  await ctx.close();
}
await browser.close();
console.log(bad ? `NG ${bad} 件` : "OK");
process.exit(bad && check ? 1 : 0);
