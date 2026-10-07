// U23：立ち絵の大きさを、右の列（U21 #334）を入れる前・今の main・直したあとで比べて撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u23.mjs                         … 今の作業の木（after）
// git worktree add /tmp/old b25f098 && (cd /tmp/old && node tools/build.mjs) && ROOT=/tmp/old/ TAG=before node tools/shots_u23.mjs   … #334 より前
// docs/shots/u23/<TAG>_<1280x720|1366x768|1920x1080|phone>_<town|talk|event|combat|combat1>.jpg を書き、立ち絵（話している人）の大きさと場所を出す。
// 話している人は、話し手の印の有る無しに関わらず連れている仲間の一人に決めて出す（どの版でも同じ人・同じ場面で大きさを比べるため）
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const root = process.env.ROOT || new URL("../", import.meta.url).pathname;
const tag = process.env.TAG || "after";
const outDir = process.env.OUT || new URL("../docs/shots/u23/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
const VIEWS = { "1280x720": [1280, 720, 1], "1366x768": [1366, 768, 1], "1920x1080": [1920, 1080, 1], phone: [390, 844, 2] };
const browser = await pw.chromium.launch();
const url = pathToFileURL(root + "dist/site/index.html").href;
for (const [vn, [w, hh, sc]] of Object.entries(VIEWS)) {
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
    for (let i = 0; i < 2000 && !G.S.over; i++) {
      if (G.S.mode === "explore" && G.loc().type === "town" && total() >= 15 && G.S.companions.length) break;
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
    }
    G.S.hp = G.S.maxHp; G.main.save(); G.ui.render();
  });
  // 話している人を決めて出す（話し手の印の有る無しに関わらず、大きさを比べるため。前後の版で同じ人）
  await page.evaluate(() => {
    const comp = (G.S.companions || []).map((c) => G.companionWho ? G.companionWho(c) : null).find((w) => w && G.portraitArt && G.portraitArt(w));
    window.__who = comp;
    const base = G.v9.castOf;
    G.v9.castOf = (S) => {
      if (!window.__who || S.combat) return base(S);
      const tag = G.whoTag ? G.whoTag(window.__who, S) : null;
      return [{ who: window.__who, role: "speaker", key: "k:" + JSON.stringify(window.__who), big: !!(G.stand && G.stand.big && G.stand.big(window.__who)), name: tag ? tag.label : window.__who.name || "", tag }];
    };
    if (G.stand && G.stand.whoOf) { const w0 = G.stand.whoOf; G.stand.whoOf = (S) => (window.__who && !S.combat ? window.__who : w0(S)); }
    if (G.u11 && G.u11.whoSpeaks) { G.u11.whoSpeaks = () => true; }
    G.ui.render();
  });
  const hide = () => page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); document.querySelectorAll("#toast, #u8note, #u14card, #u14cut, .tip").forEach((x) => { x.style.display = "none"; }); });
  const meas = (name) => page.evaluate((name) => {
    const figs = [...document.querySelectorAll("#v9cast .v9fig.on, #stand .standFig.on, #who:not([hidden])")].filter((f) => getComputedStyle(f).display !== "none" && getComputedStyle(f).visibility !== "hidden").map((f) => { const r = f.getBoundingClientRect(); return (f.classList.contains("front") ? "F" : f.classList.contains("speaker") ? "S" : "") + Math.round(r.width) + "x" + Math.round(r.height) + "@" + Math.round(r.left) + "," + Math.round(r.top); });
    const fc = document.querySelector("#v9foes"); const sc = document.querySelector(".scene");
    const st = sc ? sc.getBoundingClientRect() : null;
    return name + " figs=" + figs.join(" ") + (G.S.combat ? " stage=" + (st ? Math.round(st.width) + "x" + Math.round(st.height) : "-") : "") + " scroll=" + document.documentElement.scrollHeight + "/" + innerHeight;
  }, name);
  const shot = async (name) => { await hide(); await page.mouse.move(2, 2); await page.waitForTimeout(900); console.log(tag, vn, await meas(name)); await page.screenshot({ path: `${outDir}${tag}_${vn}_${name}.jpg`, type: "jpeg", quality: 70 }); };
  await shot("town");
  // 会話（仲間と話す）
  await page.evaluate(() => { const a = G.actions().flatMap((g) => g.list).find((x) => /^m2talk:/.test(x.id) && !x.disabled); if (a) { G.act(a.id); G.ui.render(); } });
  await shot("talk");
  // 出来事（話す人のいる出来事）
  await page.evaluate(() => {
    G.S.tk = null; G.S.mode = "explore";
    const evs = G.data.EVENTS.filter((e) => e.who && e.choices);
    for (const e of evs) { G.S.mode = "event"; G.S.event = e.id; const w = G.stand && G.stand.whoOf && G.stand.whoOf(G.S); if (w && (!G.portraitArt || G.portraitArt(w))) break; }
    G.main.save(); G.ui.render();
  });
  await shot("event");
  await page.evaluate(() => { G.S.mode = "explore"; G.S.event = null; G.startCombat(["goblin", "goblin"], {}); G.main.save(); G.ui.render(); });
  await page.keyboard.press("Escape");
  await shot("combat");
  await page.evaluate(() => { G.S.combat = null; G.startCombat(["ogre"], {}); G.main.save(); G.ui.render(); });
  await page.keyboard.press("Escape");
  await shot("combat1");
}
await browser.close();
