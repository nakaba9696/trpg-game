// U17：依頼が増えたときの印を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u17.mjs
// docs/shots/u17/<pc|phone>_<bang|list|rumors|marks|rumorline>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/u17/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => { await page.waitForTimeout(400); const out = new URL(`../docs/shots/u17/${vn}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); console.log("wrote", out); };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.openQuests && G.q17);
  const hideToast = () => page.evaluate(() => { const t = document.querySelector("#toast"); if (t) t.style.display = "none"; });
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
  });
  await page.evaluate(() => {
    const S = G.S;
    S.loc = "karna";
    const take = (kind) => {
      const q = G.q5.make(G.q5.type(kind), S, { i: 0 });
      S.board = { loc: S.loc, day: S.day, list: [q], q5: 1 };
      S.mode = "fac"; S.fac = "guild";
      G.act("guild:take:" + q.id);
      S.mode = "explore"; S.fac = null;
    };
    take("guard");
    G.q17.clear(S);
    take("hunt");
    G.heard("噂：竜の墓場の奥で、しゃべる剣が眠ってるって話だ。竜の腹の中にな。");
    G.heard("噂：赤い月の晩に生まれた子は、よく笑うか、まったく笑わないかのどっちかだとさ。");
    G.heard("噂：港町ヴァレンツァの裏通りで、本ばかり読んでる若いのが、妙に頭が回るんだと。");
    G.ui.render();
  });
  await hideToast();
  await shot("bang");
  await page.click("#q7Quests");
  await shot("list");
  await page.evaluate(() => { const r = document.querySelector("#dlgQuests .u17rum"); if (r) r.scrollIntoView(); });
  await shot("rumors");
  await page.evaluate(() => document.querySelector("#dlgQuests").close());
  await page.evaluate(() => { const t = document.querySelector('#panel .u13tab[data-u13="adv"]'); if (t) t.click(); });
  await page.evaluate(() => { const b = document.querySelector("#panel .act.marked"); if (b) b.scrollIntoView({ block: "center" }); });
  await shot("marks");
  // 酒場で噂を聞く（ボタンを押す。U19 の書き直す本文に「噂を書き留めた」の一行）
  await page.evaluate(() => { const S = G.S; S.mode = "fac"; S.fac = "tavern"; S.gold = 100; S.turn += 1; G.ui.render(); });
  await page.evaluate(() => { const b = [...document.querySelectorAll("#panel .act")].find((x) => /噂を聞く/.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(1500);
  await hideToast();
  await page.evaluate(() => { const l = document.querySelector("#log"); if (l) l.scrollIntoView(); });
  await shot("rumorline");
  console.log(vn, "errors:", errs.length ? errs : "none");
  await ctx.close();
}
await browser.close();
