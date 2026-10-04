// A10 のスクリーンショット：話す場面（名のない獣人の神官・名のある人）・戦闘（仲間つき）・シート・作成の画面を、PC とスマホで撮る
// node tools/build.mjs && node tools/shots_a10.mjs [docs/shots/a10]（Playwright。CI では動かさない）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } }

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(here, "..", "dist", "site");
const out = process.argv[2] || path.join(here, "..", "docs", "shots", "a10");
mkdirSync(out, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".json": "application/json" };
const server = createServer((req, res) => {
  const p = path.join(site, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
  if (!p.startsWith(site) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await pw.chromium.launch();

const VIEWS = { pc: { width: 1280, height: 800 }, sp: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 } };
const errors = [];
for (const [vn, vp] of Object.entries(VIEWS)) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, reducedMotion: "reduce" });
  page.on("pageerror", (e) => errors.push(`${vn}: ${e.message}`));
  await page.goto(base);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
  const shot = async (name) => { await page.waitForTimeout(900); await page.screenshot({ path: path.join(out, `${vn}_${name}.jpg`), type: "jpeg", quality: 72 }); console.log(`${vn}_${name}.jpg`); };
  // 作成の画面（主人公の絵なし）
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /はじめる/.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(400);
  await shot("create");
  // 冒険を始める：猫の獣人の傭兵・仲間 2 人
  await page.evaluate(() => {
    const D = G.data, stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
    G.main.start({ cls: "priest", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "ミケ", sex: "女", age: 24, race: "beast", beast: "cat", history: "確認用", personality: "無口" } });
    G.S.companions = [G.genCompanion(), G.genCompanion()];
    G.ui.render();
  });
  // 話す場面：名のない人（獣人の神官。型の絵 kind_priest_* に当てる）
  await page.evaluate(() => {
    const D = G.data;
    const e = { id: "a10_shot", where: ["town"], title: "獣人の神官", who: { kind: "priest", sex: "女", age: 30, look: { beast: "cat", ears: "none" } }, text: "猫の耳の神官が、施しの鉢を差し出してくる。「旅の方、光天のお恵みを」", choices: [{ label: "銀貨を一枚入れる", ok: { text: "神官は深く頭を下げた。" } }, { label: "黙って通り過ぎる", ok: { text: "神官は何も言わなかった。" } }] };
    if (!D.EVENTS.some((x) => x.id === e.id)) D.EVENTS.push(e);
    G.startEvent(e);
    G.ui.render();
  });
  await shot("talk_mob");
  // 話す場面：名のある人
  await page.evaluate(() => { G.S.mode = "explore"; G.S.event = null; G.startEvent(G.data.EVENTS.find((e) => e.id === "c2_nora")); G.S.mood = null; G.ui.render(); });
  await shot("talk_named");
  // 戦闘（主人公の立ち絵なし・仲間だけ）
  await page.evaluate(() => { G.S.mode = "explore"; G.S.event = null; G.startCombat(["goblin", "e2_berna"]); G.ui.render(); });
  await page.waitForTimeout(2200);
  await page.evaluate(() => G.ui.render());
  await shot("combat");
  // シート（主人公の顔なし。名前から人物を開く）
  await page.evaluate(() => { G.S.combat = null; G.S.mode = "explore"; G.ui.render(); G.ui.setSheetOpen(true); });
  await shot("sheet");
  const info = await page.evaluate(() => ({
    heroFaces: document.querySelectorAll("#mFace, #profFace, .sface, .eface, .gface, #heroFace, .miniFace, .csFace").length,
    visibleNoart: [...document.querySelectorAll("canvas.noart")].filter((c) => c.offsetParent).length,
    cast: G.v9 ? G.v9.castOf(G.S).map((c) => c.role) : [],
  }));
  console.log(vn, JSON.stringify(info));
  await page.close();
}
await browser.close();
server.close();
errors.forEach((e) => console.log("ERROR " + e));
process.exit(errors.length ? 1 : 0);
