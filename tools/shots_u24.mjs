// U24：図鑑の探す・絞る・並べる と読みやすい説明を撮り、動きを確かめる（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u24.mjs
// docs/shots/u24/<1280x720|1920x1080|phone>_<foe|foe_grade|foe_find|item|item_sort|lore|person|fresh|detail>.jpg を書く。
// 確かめること：絞り込み（名前・区分・格・倒した・！だけ）の件数が、条件に合う項目の数と同じ。条件を消すと、区分といつもの順が元どおり。
// 説明に要点の札と色分けした性能の表が出る。新しく載った印（！）が「！だけ」で絞れて、開くと消える。スマホは一覧 → 説明の切り替え
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { "1280x720": [1280, 720, 1], "1920x1080": [1920, 1080, 1], phone: [390, 844, 2] };
mkdirSync(new URL("../docs/shots/u24/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
let bad = 0;
const ng = (m) => { bad++; console.log("  NG", m); };
for (const [vn, [w, hh, sc]] of Object.entries(VIEWS)) {
  const phone = vn === "phone";
  const page = await (await browser.newContext({ viewport: { width: w, height: hh }, deviceScaleFactor: sc, reducedMotion: "reduce" })).newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name, el) => {
    await page.evaluate(() => document.querySelectorAll("#toast, #u8note").forEach((x) => { x.style.display = "none"; }));
    await page.mouse.move(2, 2);
    await page.waitForTimeout(300);
    await page.screenshot({ path: new URL(`../docs/shots/u24/${vn}_${name}.jpg`, import.meta.url).pathname, type: "jpeg", quality: 72 });
  };
  const settle = () => page.waitForTimeout(250);
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.f2 && G.u24);
  // 決まった乱数で少し遊び、図鑑を半分ほど埋める。倒した魔物は効き目も一部分かる
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 60; });
    let s = 24;
    G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    for (let i = 0; i < 200 && !G.S.over; i++) {
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
    }
    const c = G.codex();
    const t0 = Date.now() - 1e8;
    G.f2.foeIds().forEach((id, i) => { if (i % 2 === 0 && !c.foes[id]) c.foes[id] = { by: "傭兵 ユリア", date: "1127年 春 3日", at: t0 + i * 1000, kills: i % 4 ? 3 + (i % 5) : 0, kby: "傭兵 ユリア", kdate: "1127年 春 9日" }; });
    G.f2.itemIds().forEach((id, i) => { if (i % 2 === 0 && !c.items[id]) c.items[id] = { by: "傭兵 ユリア", date: "1127年 春 3日", at: t0 + i * 1000 }; });
    c.fresh = c.fresh || {};
    const far = G.f2.foeIds().filter((id) => c.foes[id]).slice(-3);
    far.forEach((id) => { c.fresh["foe:" + id] = 1; });
    window.__fresh = far;
    G.S.hp = G.S.maxHp; G.main.save(); G.ui.render();
  });
  const order = () => page.evaluate(() => [...document.querySelectorAll("#dlgCodex .f2list .f2cell")].filter((x) => x.offsetParent !== null).map((x) => x.dataset.id).join(","));
  const shown = () => page.evaluate(() => [...document.querySelectorAll("#dlgCodex .f2list .f2cell")].filter((x) => x.offsetParent !== null).length);
  const pick = (sel) => page.evaluate((s) => { const b = [...document.querySelectorAll(s)].find((x) => x.offsetParent !== null); if (b) b.click(); return !!b; }, sel);
  const setSel = async (cls, v) => { await page.selectOption(`#dlgCodex .u24bar ${cls}`, v); await settle(); };

  // 魔物：いつもの形
  await page.evaluate(() => G.f2.open("foe"));
  await settle();
  const base = await order();
  const bar = await page.evaluate(() => { const b = document.querySelector("#dlgCodex .u24bar"); return !!b && !b.hidden; });
  if (!bar) ng(`${vn}：探す帯が出ていない`);
  // ！だけ
  await page.click("#dlgCodex .u24fresh");
  await settle();
  const nf = await shown();
  const wantF = await page.evaluate(() => G.f2.foeIds().filter((id) => G.codex().foes[id] && G.codexIsFresh("foe", id)).length);
  if (nf !== wantF) ng(`${vn}：！だけで ${nf} 件（${wantF} 件のはず）`);
  await shot("fresh");
  await page.click("#dlgCodex .u24fresh");
  await settle();
  // 倒した魔物を選ぶ：要点の札と性能の表
  await pick("#dlgCodex .f2cell:not(.unknown)");
  await page.evaluate(() => { const b = [...document.querySelectorAll("#dlgCodex .f2cell:not(.unknown)")].find((x) => x.offsetParent !== null && /体/.test(x.textContent)); if (b) b.click(); });
  await settle();
  const det = await page.evaluate(() => ({ sum: !!document.querySelector("#dlgCodex .f2detail .u24sum"), tone: document.querySelectorAll("#dlgCodex .f2detail [data-u24]").length, vis: getComputedStyle(document.querySelector("#dlgCodex .f2detail")).display !== "none" }));
  if (!det.sum || !det.tone || !det.vis) ng(`${vn}：説明の要点の札・色分けが出ない ${JSON.stringify(det)}`);
  await shot(phone ? "detail" : "foe");
  if (phone) {
    const back = await pick("#dlgCodex .f2back");
    await settle();
    const listVis = await page.evaluate(() => getComputedStyle(document.querySelector("#dlgCodex .f2list")).display !== "none");
    if (!back || !listVis) ng(`${vn}：「一覧へ戻る」で一覧に戻らない`);
    await shot("foe");
  }
  // 格で絞る＋倒した
  await setSel(".u24sel:nth-of-type(2)", "C");
  const nc = await shown();
  const wantC = await page.evaluate(() => G.f2.foeIds().filter((id) => G.codex().foes[id] && G.gradeOf(id) === "C").length);
  if (nc !== wantC) ng(`${vn}：格 C で ${nc} 件（${wantC} 件のはず）`);
  await shot("foe_grade");
  // 名前で探す
  await page.click("#dlgCodex .u24clear");
  await settle();
  await page.fill("#dlgCodex .u24q", "ゴブリン");
  await page.waitForTimeout(400);
  const ng1 = await shown();
  const wantG = await page.evaluate(() => G.f2.foeIds().filter((id) => G.codex().foes[id] && G.f2.foe(id).name.includes("ゴブリン")).length);
  if (ng1 !== wantG) ng(`${vn}：「ゴブリン」で ${ng1} 件（${wantG} 件のはず）`);
  await shot("foe_find");
  // 条件を消すと元どおり
  await page.click("#dlgCodex .u24clear");
  await settle();
  if ((await order()) !== base) ng(`${vn}：条件を消しても、いつもの順に戻らない`);
  // アイテム：見つけた順
  await page.evaluate(() => G.f2.open("item"));
  await settle();
  await pick("#dlgCodex .f2cell:not(.unknown)");
  await settle();
  await shot("item");
  await setSel(".u24sel:last-of-type", "at");
  const at = await page.evaluate(() => [...document.querySelectorAll("#dlgCodex .u24flat .f2cell")].map((x) => (G.codex().items[x.dataset.id] || {}).at || 0));
  if (at.some((v, i) => i && v > at[i - 1])) ng(`${vn}：見つけた順（新しい順）に並ばない`);
  await shot("item_sort");
  await page.click("#dlgCodex .u24clear");
  await settle();
  for (const tab of ["person", "lore"]) {
    await page.evaluate((t) => G.f2.open(t), tab);
    await settle();
    await pick("#dlgCodex .f2cell:not(.unknown)");
    await settle();
    await shot(tab);
  }
  // 「！」：開くと消える
  await page.evaluate(() => G.f2.open("foe"));
  await settle();
  await page.evaluate(() => { const c = document.querySelector(`#dlgCodex .f2cell[data-id="${window.__fresh[0]}"]`); if (c) c.click(); });
  await settle();
  if (await page.evaluate(() => G.codexIsFresh("foe", window.__fresh[0]))) ng(`${vn}：開いたのに新しい印が消えない`);
  // 覚え書き・依頼のタブでは帯を出さない
  await pick('#dlgCodex .tabs [data-tab="know"]');
  await settle();
  if (await page.evaluate(() => !document.querySelector("#dlgCodex .u24bar").hidden)) ng(`${vn}：覚え書きのタブに探す帯が出ている`);
  if (errs.length) ng(`${vn}：ページのエラー ${errs.join("／")}`);
  console.log(vn, "ok", JSON.stringify({ fresh: nf, gradeC: nc, goblin: ng1 }));
  await page.context().close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
