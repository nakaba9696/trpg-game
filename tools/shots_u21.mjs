// U21：PC の一画面の配置（右の列に行動の組）を撮り、スクロールせずに収まるかを確かめる（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u21.mjs
// docs/shots/u21/<1280x720|1366x768|1920x1080|phone>_<town|adv|shop|event|combat>.jpg を書く。
// 確かめること（PC の 3 つの大きさ）：ページが動かない（縦・横）・本文の欄と右の列が画面の中で重ならない・右の列の中の札と選択肢が右の列からはみ出さない
// （開いた組の中で流れるのはよい）・組の札を押すと、その組がすぐ下に開く・出来事の選択肢は組に隠さない・戦闘は下の帯のまま。スマホは今のまま（右の列を出さない）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = {
  "1280x720": { width: 1280, height: 720, scale: 1 },
  "1366x768": { width: 1366, height: 768, scale: 1 },
  "1920x1080": { width: 1920, height: 1080, scale: 1 },
  phone: { width: 390, height: 844, scale: 2 },
};
mkdirSync(new URL("../docs/shots/u21/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
let bad = 0;
const ng = (m) => { bad++; console.log("  NG", m); };
for (const [vn, vp] of Object.entries(VIEWS)) {
  const pc = vn !== "phone";
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const quiet = () => page.evaluate(() => {
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    document.querySelectorAll("#toast, #u8note, #u14card, #u14cut").forEach((x) => { x.style.display = "none"; });
  });
  const shot = async (name) => {
    await quiet();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
    const out = new URL(`../docs/shots/u21/${vn}_${name}.jpg`, import.meta.url).pathname;
    await page.screenshot({ path: out, type: "jpeg", quality: 72, fullPage: false });
  };
  // 画面に収まっているか
  const measure = () => page.evaluate(() => {
    window.scrollTo(0, 400);
    const sy = window.scrollY, sx = window.scrollX;
    window.scrollTo(0, 0);
    const de = document.documentElement;
    const R = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const side = document.getElementById("u21side"), tome = document.querySelector(".tome");
    const sideOn = !!side && getComputedStyle(side).display !== "none";
    const out = { sy, sx, sh: de.scrollHeight, sw: de.scrollWidth, vw: innerWidth, vh: innerHeight, sideOn, combat: document.body.classList.contains("v9combat") };
    out.tome = tome ? R(tome) : null;
    out.side = sideOn ? R(side) : null;
    // 右の列の中で、流れる箱（開いた組）の外にある物が右の列からはみ出していないか
    if (sideOn) {
      const s = out.side, over = [];
      side.querySelectorAll(".u13tab, #panel > .agroup, #panel > .tip, #panel > .u11purse, #u21open").forEach((el) => {
        const r = R(el);
        if (r.h && (r.b > s.b + 1 || r.y < s.y - 1)) over.push((el.className || el.id) + " " + Math.round(r.y) + "-" + Math.round(r.b));
      });
      out.over = over;
      out.tabs = Array.from(side.querySelectorAll(".u13tab")).map((t) => t.dataset.u13 + (t.classList.contains("on") ? "*" : ""));
      out.acts = side.querySelectorAll(".act").length;
    }
    return out;
  });
  const judge = (name, m, { wantSide }) => {
    console.log(vn, name, JSON.stringify({ page: `${m.sw}x${m.sh}/${m.vw}x${m.vh}`, scroll: [m.sx, m.sy], side: !!m.side, tabs: m.tabs, acts: m.acts }));
    if (!pc) { if (m.sideOn) ng(`${vn} ${name}：スマホで右の列が出ている`); return; }
    if (m.sy || m.sx || m.sh > m.vh + 1 || m.sw > m.vw + 1) ng(`${vn} ${name}：ページが動く（${m.sw}×${m.sh}）`);
    if (wantSide !== m.sideOn) ng(`${vn} ${name}：右の列が${wantSide ? "出ていない" : "出ている"}`);
    const inside = (r) => r && r.x >= -1 && r.y >= -1 && r.r <= m.vw + 1 && r.b <= m.vh + 1;
    if (!inside(m.tome)) ng(`${vn} ${name}：本文の欄が画面からはみ出す ${JSON.stringify(m.tome)}`);
    if (m.side) {
      if (!inside(m.side)) ng(`${vn} ${name}：右の列が画面からはみ出す`);
      if (m.tome.r > m.side.x - 4) ng(`${vn} ${name}：本文の欄と右の列が重なる`);
      if (m.over.length) ng(`${vn} ${name}：右の列からはみ出す物がある ${m.over.join("／")}`);
      if (!m.acts) ng(`${vn} ${name}：右の列に選択肢が無い`);
    }
  };

  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.u21);
  // 決まった乱数で遊び、仲間と道のそろった町（選択肢 15 以上）で止める（U13 の撮影と同じ）
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 60; });
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
  await quiet();
  judge("town", await measure(), { wantSide: true });
  await shot("town");
  // 冒険の組を開く：札のすぐ下に開き、ほかの札は残る
  const adv = page.locator('#u21side .u13tab[data-u13="adv"]');
  if (pc && (await adv.count())) {
    await adv.click();
    await page.waitForTimeout(200);
    const m = await measure();
    judge("adv", m, { wantSide: true });
    if (!m.tabs || !m.tabs.includes("adv*")) ng(`${vn} adv：押した組が開いていない ${JSON.stringify(m.tabs)}`);
    const next = await page.evaluate(() => { const t = document.querySelector('#u21side .u13tab[data-u13="adv"]'); const n = t && t.parentElement.nextElementSibling; return n ? n.id : ""; });
    if (next !== "u21open") ng(`${vn} adv：開いた組が札のすぐ下にない（${next}）`);
    await shot("adv");
  }
  // 店
  await page.evaluate(() => { G.S.gold = 2000; G.act("fac:shop"); G.main.save(); G.ui.render(); });
  await quiet();
  judge("shop", await measure(), { wantSide: true });
  await shot("shop");
  // 出来事：選択肢は組に隠さない
  await page.evaluate(() => {
    G.S.mode = "explore"; G.S.fac = null;
    const e = G.data.EVENTS.find((x) => x.id === "e_drunk") || G.data.EVENTS.find((x) => Array.isArray(x.choices) && x.choices.length >= 4);
    G.S.mode = "event"; G.S.event = e.id; G.main.save(); G.ui.render();
  });
  await quiet();
  const me = await measure();
  judge("event", me, { wantSide: true });
  if (pc && me.tabs && me.tabs.length) ng(`${vn} event：出来事の選択肢が組に隠れている`);
  await shot("event");
  // 戦闘：下の帯のまま（右の列は出さない）
  await page.evaluate(() => {
    G.S.mode = "explore"; G.S.event = null;
    Object.assign(G.S.inv, { herb: 3, potion: 2 });
    G.startCombat(["goblin", "goblin"], {}); G.main.save(); G.ui.render();
  });
  await page.keyboard.press("Escape");
  await quiet();
  judge("combat", await measure(), { wantSide: false });
  await shot("combat");
  if (errs.length) ng(`${vn}：ページのエラー ${errs.join("／")}`);
  await ctx.close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
