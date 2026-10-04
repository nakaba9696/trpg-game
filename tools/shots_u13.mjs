// U13：町の行動の選択肢を分類（街で・冒険・仲間・その他）にまとめた画面を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u13.mjs [after|before]
// docs/shots/u13/<前置き>_<pc|phone>_<town|adv|party|shop|combat|combat_magic|combat_items|combat_reveal|result|levelup>.jpg を書く（前置きの既定は after）
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const tag = process.argv[2] || "after";
const VIEWS = { pc: { width: 1440, height: 900, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/u13/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => {
    await page.evaluate((phone) => {
      const t = document.querySelector("#toast"); if (t) t.style.display = "none";
      document.querySelectorAll("#u8note, .tip").forEach((x) => { x.style.display = "none"; });
      if (phone) { const p = document.querySelector("#panel"); if (p) window.scrollTo(0, Math.max(0, (p.querySelector(".u13tabs, .agroup") || p).getBoundingClientRect().top + window.scrollY - 330)); }
    }, vn === "phone");
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
    const out = new URL(`../docs/shots/u13/${tag}_${vn}_${name}.jpg`, import.meta.url).pathname;
    await page.screenshot({ path: out, type: "jpeg", quality: 80, fullPage: false });
    console.log("wrote", out);
  };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui);
  // 決まった乱数で遊び、仲間と依頼と道のそろった町（選択肢 15 以上）で止める
  const n = await page.evaluate(() => {
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
    return total();
  });
  console.log(vn, "items", n);
  await shot("town");
  if (tag === "after") {
    for (const k of ["adv", "party"]) {
      const b = page.locator(`#panel .u13tab[data-u13="${k}"]`);
      if (await b.count()) { await b.click(); await shot(k); }
    }
  }
  await page.evaluate(() => { G.S.gold = 2000; G.act("fac:shop"); G.main.save(); G.ui.render(); });
  await shot("shop");
  // 戦闘：道具と術を持たせて、ゴブリン 2 体
  await page.evaluate(() => {
    G.S.mode = "explore"; G.S.fac = null;
    Object.assign(G.S.inv, { herb: 3, potion: 2, jerky: 2, smoke: 1 });
    G.startCombat(["goblin", "goblin"], {}); G.main.save(); G.ui.render();
  });
  await shot("combat");
  if (tag === "after") {
    for (const [k, name] of [["d:魔法", "combat_magic"], ["d:道具", "combat_items"]]) {
      const b = page.locator(`#panel .u13drawer[data-u13="${k}"]`);
      if (await b.count()) { await b.click(); await shot(name); }
    }
    // 一手の記録を一行ずつ出している途中
    await page.keyboard.press("Escape");
    await page.locator("#panel .act").first().click();
    await page.waitForTimeout(900);
    await shot("combat_reveal");
    // 勝って、戦いの中で能力値が伸びた：結果の場面
    await page.evaluate(() => { G.ui.render(); G.S.combat.foes.forEach((f) => { f.hp = 1; }); G.S.stats["筋力"] += 4; G.ui.render(); });
    for (let i = 0; i < 6 && !(await page.locator("#panel .u13result").count()); i++) {
      await page.locator("#panel .act").first().click();
      await page.waitForTimeout(5000);
    }
    await shot("result");
    // 戦いの外で伸びた：その場の演出
    await page.locator("#panel .u13go").click();
    await page.evaluate(() => { G.S.stats["知力"] += 4; G.ui.render(); });
    await page.waitForTimeout(700);
    await shot("levelup");
  }
  if (errs.length) console.log("page errors:", errs);
  await page.close(); await ctx.close();
}
await browser.close();
