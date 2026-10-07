// U22：図鑑の窓を PC の一画面に収めたところを撮り、ページも窓もスクロールしないかを確かめる（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u22.mjs
// docs/shots/u22/<1280x720|1366x768|1920x1080|phone>_<item|foe|foe_p2|foe_more|person|lore|know|q5>.jpg を書く。
// 確かめること（PC）：ページ・窓・窓の中身（一覧・説明・覚え書き）がどれも流れない。見えている物はどれも枠の中。
// 一覧のページを全部めくると、その区分のマスがちょうど一度ずつ出る。新しく載った印（！）がタブ・区分の札・マスに出て、開くと消える。
// スマホ：今のまま（区分の札もページ送りも出さない）
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
const SHOTS = new Set(["1280x720", "1920x1080", "phone"]);
mkdirSync(new URL("../docs/shots/u22/", import.meta.url), { recursive: true });
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
  const shot = async (name) => {
    if (!SHOTS.has(vn)) return;
    await page.evaluate(() => document.querySelectorAll("#toast, #u8note").forEach((x) => { x.style.display = "none"; }));
    await page.mouse.move(2, 2);
    await page.waitForTimeout(250);
    await page.screenshot({ path: new URL(`../docs/shots/u22/${vn}_${name}.jpg`, import.meta.url).pathname, type: "jpeg", quality: 72 });
  };
  const settle = () => page.waitForTimeout(250);
  // 流れる物・はみ出す物
  const measure = () => page.evaluate(() => {
    window.scrollTo(0, 500);
    const sy = window.scrollY;
    window.scrollTo(0, 0);
    const d = document.getElementById("dlgCodex");
    d.scrollTop = 500;
    const dsy = d.scrollTop;
    d.scrollTop = 0;
    const shown = (el) => { for (let e = el; e && e !== d; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || e.hidden) return false; } return true; };
    const boxes = [d, ...d.querySelectorAll(".dbody, .f2list, .f2detail, .l1pane")].filter(shown);
    const over = [];
    boxes.forEach((b) => { if (b.scrollHeight > b.clientHeight + 2) over.push(`${b.id || b.className} ${b.scrollHeight}/${b.clientHeight}`); });
    const out = [];
    d.querySelectorAll(".f2cell, .f2rest, .f2detail > *, .l1pane li, .u22chip, .u22pager .btn").forEach((el) => {
      if (!shown(el)) return;
      const r = el.getBoundingClientRect();
      if (!r.height) return;
      const box = el.closest(".f2list, .f2detail, .l1pane") || d;
      const b = box.getBoundingClientRect();
      if (r.bottom > b.bottom + 1 || r.top < b.top - 1 || r.bottom > innerHeight) out.push((el.textContent || el.className).slice(0, 14) + " " + Math.round(r.bottom) + ">" + Math.round(b.bottom));
    });
    const dr = d.getBoundingClientRect();
    return { sy, dsy, over, out: out.slice(0, 5), nOut: out.length, dlg: [Math.round(dr.top), Math.round(dr.bottom)], vh: innerHeight, paged: !!d.querySelector(".u22paged"), chips: d.querySelectorAll(".u22chip").length };
  });
  const judge = (name, m) => {
    console.log(vn, name, JSON.stringify({ dlg: m.dlg, paged: m.paged, chips: m.chips, over: m.over, out: m.nOut }));
    if (!pc) { if (m.paged || m.chips) ng(`${vn} ${name}：スマホで区分の札・ページ送りが出ている`); return; }
    if (m.sy || m.dsy) ng(`${vn} ${name}：ページか窓が動く（${m.sy}・${m.dsy}）`);
    if (m.over.length) ng(`${vn} ${name}：流れる欄がある ${m.over.join("／")}`);
    if (m.nOut) ng(`${vn} ${name}：枠からはみ出す物がある ${m.out.join("／")}`);
    if (m.dlg[0] < 0 || m.dlg[1] > m.vh) ng(`${vn} ${name}：窓が画面からはみ出す`);
  };

  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.f2 && G.u22);
  // 決まった乱数で少し遊び、図鑑を半分ほど埋める（魔物・持ち物は一つおき。倒した数・弱点の行も出るように）
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 60; });
    let s = 22;
    G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    for (let i = 0; i < 300 && !G.S.over; i++) {
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
    }
    const c = G.codex();
    G.f2.foeIds().forEach((id, i) => { if (i % 2 === 0 && !c.foes[id]) c.foes[id] = { by: "傭兵 ユリア", date: "1127年 春 3日", kills: i % 4 ? 3 : 0, kby: "傭兵 ユリア", kdate: "1127年 春 9日" }; });
    G.f2.itemIds().forEach((id, i) => { if (i % 2 === 0 && !c.items[id]) c.items[id] = { by: "傭兵 ユリア", date: "1127年 春 3日" }; });
    // 新しく載った印（！）：レオネスト王国の外の魔物を一つ
    const far = G.f2.foeIds().find((id) => c.foes[id] && G.codexFoeRegion(id) !== G.f2.regions()[0]);
    c.fresh = c.fresh || {};
    c.fresh["foe:" + far] = 1;
    window.__far = far;
    G.S.hp = G.S.maxHp; G.main.save(); G.ui.render();
  });
  const open = async (tab) => { await page.evaluate((t) => G.f2.open(t), tab); await settle(); };
  const pick = async (sel) => { await page.evaluate((s) => { const b = [...document.querySelectorAll(s)].find((x) => getComputedStyle(x).display !== "none"); if (b) b.click(); }, sel); await settle(); };

  // 魔物：新しい印のある区分から開く・印はタブ・札・マスに
  await open("foe");
  const fresh = await page.evaluate(() => ({
    tab: !!document.querySelector('#dlgCodex .tabs [data-tab="foe"] .f2bang'),
    chip: !!document.querySelector("#dlgCodex .u22chip.on .u22bang"),
    cell: (() => { const c = document.querySelector(`#dlgCodex .f2cell.fresh[data-id="${window.__far}"]`); return !!c && getComputedStyle(c).display !== "none"; })(),
  }));
  if (pc && (!fresh.tab || !fresh.chip || !fresh.cell)) ng(`${vn} foe：新しく載った印が出ていない ${JSON.stringify(fresh)}`);
  if (!pc && !fresh.tab) ng(`${vn} foe：タブの印が出ていない`);
  await page.evaluate(() => document.querySelector(`#dlgCodex .f2cell[data-id="${window.__far}"]`).click());
  await settle();
  const gone = await page.evaluate(() => !G.codexIsFresh("foe", window.__far));
  if (!gone) ng(`${vn} foe：開いたのに新しい印が消えない`);
  judge("foe_fresh", await measure());
  // 最初の区分・ページを全部めくって、マスがちょうど一度ずつ出るか
  if (pc) {
    await pick("#dlgCodex .u22chip");
    await pick("#dlgCodex .f2cell:not(.unknown)");
    judge("foe", await measure());
    await shot("foe");
    const sweep = await page.evaluate(async () => {
      const d = document.getElementById("dlgCodex");
      const sec = [...d.querySelectorAll(".f2list section")].find((s) => !s.classList.contains("u22off"));
      const all = [...sec.querySelectorAll(".f2grid > *")];
      const seen = new Map();
      const vis = () => all.filter((x) => getComputedStyle(x).display !== "none");
      vis().forEach((x) => seen.set(x, (seen.get(x) || 0) + 1));
      let pages = 1;
      const next = d.querySelector(".f2list .u22next");
      while (next && !next.disabled && pages < 50) { next.click(); pages++; vis().forEach((x) => seen.set(x, (seen.get(x) || 0) + 1)); }
      return { all: all.length, seen: seen.size, twice: [...seen.values()].filter((n) => n > 1).length, pages };
    });
    console.log(vn, "sweep", JSON.stringify(sweep));
    if (sweep.seen !== sweep.all || sweep.twice) ng(`${vn} foe：ページをめくっても出ないマス・二度出るマスがある ${JSON.stringify(sweep)}`);
    if (sweep.pages > 1) { judge("foe_p2", await measure()); await shot("foe_p2"); }
    // 説明が長い魔物（倒した数・出現場所・聞いた話のある物）：入りきらなければ「続き」
    await page.evaluate(() => { const b = [...document.querySelectorAll("#dlgCodex .f2cell:not(.unknown)")].find((x) => getComputedStyle(x).display !== "none" && /体/.test(x.textContent)); if (b) b.click(); });
    await settle();
    judge("foe_more", await measure());
    await shot("foe_more");
    // すべて並べる
    await pick("#dlgCodex .f2view .btn:nth-child(2)");
    judge("foe_all", await measure());
    await pick("#dlgCodex .f2view .btn:nth-child(1)");
  } else await shot("foe");
  for (const tab of ["item", "person", "lore"]) {
    await open(tab);
    await pick("#dlgCodex .f2cell:not(.unknown)");
    judge(tab, await measure());
    await shot(tab);
  }
  // 用語を名前で探す
  await page.fill("#dlgCodex .f2findin", "ギルド");
  await settle();
  judge("lore_find", await measure());
  await page.fill("#dlgCodex .f2findin", "");
  // 覚え書き・依頼（ほかのファイルが足すタブ）
  for (const [tab, name] of [["know", "know"], ["q5", "q5"]]) {
    await pick(`#dlgCodex .tabs [data-tab="${tab}"]`);
    judge(name, await measure());
    await shot(name);
  }
  if (errs.length) ng(`${vn}：ページのエラー ${errs.join("／")}`);
  await ctx.close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
