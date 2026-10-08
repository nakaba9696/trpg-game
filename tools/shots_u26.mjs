// U26：右の行動列のレビューの直しを撮る（町・ギルド・酒場・戦闘 × 1280×800・1366×768・1920×1080・スマホ）。Playwright
// node tools/build.mjs && node tools/shots_u26.mjs（TAG=before ROOT=<前の版の作業の木>/ で前の版も）→ docs/shots/u26/<TAG>_<大きさ>_<場面>.jpg
// 出すもの：開いている組（*）・選択肢の数・組の中で全部見えている数・所持金の出る数・ページの高さ
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const tag = process.env.TAG || "after";
const root = process.env.ROOT || new URL("../", import.meta.url).pathname;
const out = new URL("../docs/shots/u26/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const VIEWS = { "1280x800": [1280, 800, 1], "1366x768": [1366, 768, 1], "1920x1080": [1920, 1080, 1], phone: [390, 844, 2] };
const browser = await pw.chromium.launch();
const url = pathToFileURL(root + "dist/site/index.html").href;
for (const [vn, [w, hh, sc]] of Object.entries(VIEWS)) {
  if (process.env.ONLYV && !process.env.ONLYV.split(",").includes(vn)) continue;
  const page = await (await browser.newContext({ viewport: { width: w, height: hh }, deviceScaleFactor: sc, reducedMotion: "reduce" })).newPage();
  page.on("pageerror", (e) => console.log("ERR", e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui);
  await page.evaluate(() => {
    const D = G.data, stats = {}; D.STATS.forEach((k) => { stats[k] = 60; });
    let s = 104;
    G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    G.main.start({ cls: "priest", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    G.S.gold = 2000;
    const total = () => G.actions().reduce((a, g) => a + g.list.length, 0);
    for (let i = 0; i < 3000 && !G.S.over; i++) {
      if (G.S.mode === "explore" && G.loc().type === "town" && total() >= 15 && G.S.companions.length && i > 400) break;
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
    }
    G.S.hp = G.S.maxHp; G.main.save(); G.ui.render();
  });
  const hide = () => page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); document.querySelectorAll("#toast, #u8note, #u14card, #u14cut").forEach((x) => { x.style.display = "none"; }); });
  const info = () => page.evaluate(() => {
    const side = document.getElementById("u21side");
    const tabs = [...document.querySelectorAll("#panel .u13tab")].map((t) => (t.classList.contains("on") ? "*" : "") + t.textContent.replace(/\s+/g, ""));
    const vis = [...document.querySelectorAll("#panel .act")].filter((b) => { const r = b.getBoundingClientRect(); const box = b.closest("#u21open, #panel"); const br = box.getBoundingClientRect(); return r.height && r.top >= br.top - 1 && r.bottom <= br.bottom + 1; }).length;
    const gold = [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && /所持金/.test(e.textContent) && e.offsetParent).length;
    return JSON.stringify({ tabs, acts: document.querySelectorAll("#panel .act").length, fullyVisible: vis, gold, scroll: document.documentElement.scrollHeight + "/" + innerHeight });
  });
  const shot = async (n) => { await hide(); if (vn === "phone" && n === "town") await page.evaluate(() => window.scrollTo(0, 0)); await page.mouse.move(2, 2); await page.waitForTimeout(500); console.log(tag, vn, n, await info()); await page.screenshot({ path: `${out}${tag}_${vn}_${n}.jpg`, type: "jpeg", quality: 70 }); };
  await shot("town");
  await page.evaluate(() => { G.act("fac:guild"); G.ui.render(); }); await shot("guild");
  await page.evaluate(() => { G.act(G.actions().flatMap((g) => g.list).find((a) => /leave|出る/.test(a.id + a.label)).id); G.act("fac:tavern"); G.ui.render(); }); await shot("tavern");
  await page.evaluate(() => { G.S.mode = "explore"; G.S.fac = null; G.startCombat(["goblin", "goblin"], {}); G.main.save(); G.ui.render(); });
  await page.keyboard.press("Escape"); await shot("combat");
}
await browser.close();
