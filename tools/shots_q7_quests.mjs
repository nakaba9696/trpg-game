// Q7：受けている依頼の一覧を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_q7_quests.mjs
// docs/shots/q7_quests/<pc|phone>_<band|list|open|done|none>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/q7_quests/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => { await page.waitForTimeout(400); const out = new URL(`../docs/shots/q7_quests/${vn}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); console.log("wrote", out); };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.openQuests);
  const hideToast = () => page.evaluate(() => { const t = document.querySelector("#toast"); if (t) t.style.display = "none"; });
  // 0 件
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
  });
  await hideToast();
  await page.keyboard.press("q");
  await shot("none");
  await page.keyboard.press("q");
  // 依頼を受ける：報告待ち・期限が近い・進行中・仲間の頼みごと・済んだ依頼
  await page.evaluate(() => {
    const D = G.data, S = G.S;
    S.loc = "karna";
    const take = (kind) => {
      const q = G.q5.make(G.q5.type(kind), S, { i: 0 });
      S.board = { loc: S.loc, day: S.day, list: [q], q5: 1 };
      S.mode = "fac"; S.fac = "guild";
      G.act("guild:take:" + q.id);
      S.mode = "explore"; S.fac = null;
      return S.quests.find((x) => x.id === q.id);
    };
    const a = take("guard"), b = take("hunt") || take("guard"), c = take("collect") || take("guard");
    if (a) a.done = true;
    if (b) b.deadline = S.day + 1;
    G.q5State(S).log.push({ day: S.day, title: "ヴァレンツァの倉の見張り", kind: "guard", r: "ok" }, { day: S.day, title: "港の密輸の荷", kind: "smuggle", r: "late" });
    const id = Object.keys(D.Q9)[0];
    S.tk = S.tk || {}; S.tk.heard = Object.assign({}, S.tk.heard, { [G.q9.topicId(id, 0)]: true });
    G.main.save();
    G.ui.render();
  });
  await hideToast();
  await shot("band");
  await page.click("#q7Quests");
  await shot("list");
  await page.click("#dlgQuests details.q7q summary");
  await shot("open");
  await page.evaluate(() => { document.querySelectorAll("#dlgQuests details.q7q").forEach((d) => { d.open = false; }); const d = document.querySelector("#dlgQuests .q7qdone"); d.open = true; d.scrollIntoView(); });
  await shot("done");
  console.log(vn, "errors:", errs.length ? errs : "none");
  await ctx.close();
}
await browser.close();
