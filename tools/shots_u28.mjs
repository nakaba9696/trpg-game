// U28：行動 → 記録 → 結果 → 得たもの → 選択肢 の順を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u28.mjs → docs/shots/u28/<pc|phone>_<fac|arrive>_<mid|end>.jpg
// 間を長くして（G.u28.BASE）途中を撮る。確かめること：押した直後は選択肢が薄く押せない・場所の名前は前のまま・まだ出していない行がある。
// 出しきると選択肢が押せ、場所の名前が新しくなっている。旅の終わり（町に着く）では、町の見出しの行が出るまで場所の名前が前のまま
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const out = new URL("../docs/shots/u28/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
let bad = 0;
const ng = (m) => { bad++; console.log("  NG", m); };
for (const [vn, w, hh, sc] of [["pc", 1280, 800, 1], ["phone", 390, 844, 2]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: hh }, deviceScaleFactor: sc })).newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.u28);
  await page.evaluate(() => {
    const D = G.data, stats = {}; D.STATS.forEach((k) => { stats[k] = 60; });
    let s = 9; G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    G.S.mode = "explore"; G.S.event = null; G.ui.render();
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    document.querySelectorAll(".tip .btn").forEach((b) => b.click());
  });
  await page.waitForTimeout(1200);
  const st = () => page.evaluate(() => ({
    busy: document.body.classList.contains("u28busy"), hold: document.body.classList.contains("u28hold"),
    wait: document.querySelectorAll("#log .u28wait").length,
    place: (document.querySelector("#u14sign .u14name") || {}).textContent || "",
    sign: (document.querySelector(".u28real .u14name") || document.querySelector("#u14sign .u14name") || {}).textContent || "",
    shownSign: ([...document.querySelectorAll(".u14name")].find((x) => x.offsetParent) || {}).textContent || "",
    loc: G.S.loc, panelPE: getComputedStyle(document.getElementById("panel")).pointerEvents,
  }));
  const shot = async (n) => { await page.evaluate(() => document.querySelectorAll("#toast, #u8note").forEach((x) => { x.style.display = "none"; })); await page.screenshot({ path: `${out}${vn}_${n}.jpg`, type: "jpeg", quality: 70 }); };
  const click = (pred) => page.evaluate((src) => {
    const f = eval(src);
    const tabs = [...document.querySelectorAll("#panel .u13tab")];
    let b = [...document.querySelectorAll("#panel button.act")].find((x) => !x.disabled && f(x));
    for (const t of tabs) { if (b) break; t.click(); b = [...document.querySelectorAll("#panel button.act")].find((x) => !x.disabled && f(x)); }
    if (!b) return null;
    const label = b.textContent; b.click(); return label;
  }, pred.toString());

  // 1. 施設に入る（ギルド）：途中と終わり
  await page.evaluate(() => { G.u28.BASE = 9000; G.u28.MAX = 9000; G.u28.GAIN = 3000; G.u28.TOTAL = 60000; });
  const before = (await st()).shownSign;
  const c1 = await click((b) => b.dataset.act === "fac:guild");
  await page.waitForTimeout(250);
  const m1 = await st();
  console.log(vn, "fac mid", c1, JSON.stringify(m1));
  if (!m1.busy || m1.panelPE !== "none" || !m1.wait) ng(`${vn} 施設：押した直後に選択肢が薄く押せない形になっていない・行が一度に出ている ${JSON.stringify(m1)}`);
  if (m1.hold && m1.shownSign !== before) ng(`${vn} 施設：着く前に看板が変わっている（${before} → ${m1.shownSign}）`);
  await shot("fac_mid");
  await page.keyboard.press("Enter"); // 早送り
  await page.waitForTimeout(500);
  const e1 = await st();
  console.log(vn, "fac end", JSON.stringify(e1));
  if (e1.busy || e1.wait || e1.panelPE === "none") ng(`${vn} 施設：早送りで出しきらない ${JSON.stringify(e1)}`);
  await shot("fac_end");
  await click((b) => /を出る$/.test(b.textContent.trim().replace(/^\d/, "")) || /leave/.test(b.dataset.act));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);

  // 2. 旅をして次の町に着く：着いた行が出るまで、看板は前のまま（旅は一手で着くことも、道中の出来事を挟むこともある）
  let arrived = false;
  for (let i = 0; i < 30 && !arrived; i++) {
    const loc0 = await page.evaluate(() => G.S.loc);
    const sign0 = (await st()).shownSign;
    await page.evaluate(() => { G.u28.BASE = 9000; G.u28.MAX = 9000; G.u28.GAIN = 3000; G.u28.TOTAL = 60000; });
    const lab = await click(i === 0 ? ((b) => /^travel:/.test(b.dataset.act)) : ((b) => !b.disabled && !/^(rr|fac):/.test(b.dataset.act) && !/^travel:/.test(b.dataset.act)));
    if (!lab) break;
    await page.waitForTimeout(250);
    const m = await st();
    if (m.loc !== loc0) {
      arrived = true;
      console.log(vn, "arrive mid", lab, JSON.stringify(m), "前の看板", sign0);
      if (m.hold && m.shownSign !== sign0) ng(`${vn} 到着：着いた行より前に看板が新しくなっている（${sign0} → ${m.shownSign}）`);
      await shot("arrive_mid");
      // 着いた見出しの行が出るまで待つ（場所の名前が新しくなる）→ 早送り
      for (let k = 0; k < 200 && (await st()).hold; k++) await page.waitForTimeout(250);
      const t = await st();
      console.log(vn, "arrive title", JSON.stringify(t));
      if (t.shownSign === sign0) ng(`${vn} 到着：着いた見出しの行が出ても看板が前のまま`);
      await shot("arrive_title");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      const e = await st();
      console.log(vn, "arrive end", JSON.stringify(e));
      if (e.busy || e.hold) ng(`${vn} 到着：出しきったのに待ったまま`);
      await shot("arrive_end");
    }
    await page.evaluate(() => { G.u28.BASE = 380; G.u28.MAX = 1500; G.u28.GAIN = 260; G.u28.TOTAL = 5200; });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
  }
  if (!arrived) console.log(vn, "（旅の終わりまで行けなかった）");
  if (errs.length) ng(`${vn}：ページのエラー ${errs.join("／")}`);
  await page.context().close();
}
await browser.close();
if (bad) { console.log("NG", bad); process.exit(1); }
console.log("ok");
