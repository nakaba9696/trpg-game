// U36：左上の日付が一つだけ・一行で出て、何手進めても窓の高さが変わらないか。右上の「システム」の中身（セーブ・ロード・更新履歴・タイトルへ・データのリセット）が全部見えるか、ステータス・依頼が左から 1・2 番目かを Chromium で確かめて撮る
// node tools/build.mjs && node tools/shots_u36.mjs → docs/shots/u36/<pc|pc1100|phone>.jpg
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1440, height: 860, scale: 1 }, pc1100: { width: 1100, height: 760, scale: 1 }, phone: { width: 390, height: 844, scale: 2 }, narrow: { width: 360, height: 760, scale: 2 } };
mkdirSync(new URL("../docs/shots/u36/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
const WANT = ["セーブ", "ロード", "更新履歴", "タイトルへ", "データのリセット"];
let bad = 0;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.openSettings);
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 12; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    G.ui.render();
    document.querySelectorAll("#toast, .r11tip").forEach((t) => { t.style.display = "none"; });
  });
  await page.waitForTimeout(300);
  // 日付：一つだけ・一行・何日進めても帯（窓）の高さが変わらない
  const dateInfo = async () => page.evaluate(() => { const d = document.querySelectorAll("#u36date, .u36date"); const e = d[0]; const r = e && e.getBoundingClientRect(); const bar = document.querySelector("#mbar"); return { n: d.length, text: e ? e.textContent : "", lines: r && r.height ? Math.round(r.height / parseFloat(getComputedStyle(e).lineHeight || 16)) : 0, vis: !!(e && !e.hidden && e.textContent && r.height > 8 && getComputedStyle(e).display !== "none"), bar: Math.round(bar.getBoundingClientRect().height), over: bar.scrollWidth > bar.clientWidth + 1 }; });
  const d0 = await dateInfo();
  await page.evaluate(() => { for (let i = 0; i < 12; i++) { G.S.day += 7; G.ui.render(); } });
  await page.waitForTimeout(200);
  const d1 = await dateInfo();
  console.log(vn, "日付:", d0.text, "→", d1.text, "| 帯の高さ", d0.bar, "→", d1.bar);
  if (!d0.vis || d1.n !== 1 || d0.text === d1.text || d1.bar !== d0.bar || d1.lines > 1) { bad++; console.log("  ^ 日付が出ない・増える・進まない・帯の高さが変わる"); }
  if (d1.over) { bad++; console.log("  ^ 帯がはみ出す"); }
  await page.screenshot({ path: new URL(`../docs/shots/u36/${vn}_date.jpg`, import.meta.url).pathname, type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: Math.min(vp.width, 520), height: 130 } });
  const mobile = await page.isVisible(".u31menu");
  if (mobile) { await page.click(".u31menu"); await page.waitForTimeout(200); }
  else { await page.click("#q7System"); await page.waitForTimeout(200); }
  const info = await page.evaluate(() => {
    // 押せる所に見えているか（その点の一番上の要素が自分か）
    const shown = (b) => { const r = b.getBoundingClientRect(); if (!r.width || !r.height) return false; const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!(e && (e === b || b.contains(e))); };
    const order = [...document.querySelectorAll(".top .tools button")].filter(shown).map((b) => b.textContent.replace(/\s+/g, " ").trim());
    const sys = [...document.querySelectorAll("#q7SystemBox button")].filter(shown).map((b) => b.textContent.replace(/\s+/g, "").trim());
    return { order, sys };
  });
  console.log(vn, "並び:", info.order.join(" / "));
  console.log(vn, "システム:", info.sys.join(" / "));
  if (!/^ステータス/.test(info.order[0] || "") || !/^依頼/.test(info.order[1] || "")) { bad++; console.log("  ^ ステータス・依頼が左から 1・2 番目でない"); }
  if (WANT.some((w, i) => !(info.sys[i] || "").includes(w)) || info.sys.length !== WANT.length) { bad++; console.log("  ^ システムの中身が全部見えない"); }
  await page.screenshot({ path: new URL(`../docs/shots/u36/${vn}.jpg`, import.meta.url).pathname, type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, mobile ? 420 : 320) } });
  // データのリセットの窓が開くか
  await page.click("#u36SysReset");
  await page.waitForTimeout(200);
  if (!(await page.isVisible("dialog.u35dlg"))) { bad++; console.log("  ^ データのリセットの窓が開かない"); }
  if (errs.length) { bad++; console.log("errors:", errs); }
  await page.close();
}
await browser.close();
console.log(bad ? `NG ${bad}` : "OK");
process.exit(bad ? 1 : 0);
