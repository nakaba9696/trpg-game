// C10：入力欄の無い冒険画面と、状態で増えた選択肢を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_c10.mjs → docs/shots/c10/*.jpg
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const dir = new URL("../docs/shots/c10/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const browser = await pw.chromium.launch();
const shoot = async (vp, name, setup) => {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await page.goto(pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href);
  await page.waitForFunction(() => window.G && G.setup && G.cre);
  await page.click('[data-fid="t-start"]');
  await page.click('[data-fid="p-next"]');
  await page.click('[data-fid="s-next"]');
  await page.click('[data-fid="c-go"]');
  await page.waitForTimeout(300);
  for (let i = 0; i < 6 && (await page.locator("#play").isHidden()); i++) {
    const b = page.locator("main:not([hidden]) button.primary").last();
    if (await b.count()) await b.click(); else break;
    await page.waitForTimeout(300);
  }
  await page.evaluate(setup);
  await page.waitForTimeout(500);
  if (vp.width < 500) await page.evaluate(() => document.querySelector("#panel").scrollIntoView({ block: "end" }));   // スマホは選択肢の欄まで送る
  await page.waitForTimeout(200);
  await page.screenshot({ path: dir + name + ".jpg", type: "jpeg", quality: 82 });
  console.log("wrote", dir + name + ".jpg");
  await page.close();
};
const PC = { width: 1280, height: 900 }, PHONE = { width: 390, height: 844 };
// 町（入力欄が無い）
await shoot(PC, "explore", () => { G.ui.render(); });
await shoot(PHONE, "explore_phone", () => { G.ui.render(); });
// 同じ出来事（通行料）：平らな状態と、状態で増えたとき
const ev = (fn) => `(${fn})(); G.S.mode = "event"; G.S.event = "toll"; G.S.log.push({ k: "title", text: "通行料" }); G.say(G.data.EVENTS.find((e) => e.id === "toll").text); G.ui.render();`;
await shoot(PC, "toll_flat", new Function(ev(() => { G.S.fame = 40; G.S.sin = 0; G.S.virtue = 0; G.S.companions = []; })));
await shoot(PC, "toll_state", new Function(ev(() => { G.S.fame = 200; G.S.companions = [{ name: "剣士のハンス", cls: "剣士", power: 50, dmg: 1, desc: "無口" }]; })));
await shoot(PC, "toll_sinful", new Function(ev(() => { G.S.fame = 0; G.S.sin = 30; })));
// まだ選べない選択肢（うっすら・条件つき）：馬車の出来事を、位も名も仲間も無い者で
await shoot(PC, "carriage_locked", () => { G.S.fame = 40; G.S.sin = 0; G.S.virtue = 0; G.S.companions = []; G.S.title = ""; G.S.mode = "event"; G.S.event = "carriage"; G.say(G.data.EVENTS.find((e) => e.id === "carriage").text); G.ui.render(); });
await shoot(PHONE, "carriage_locked_phone", () => { G.S.fame = 40; G.S.sin = 0; G.S.virtue = 0; G.S.companions = []; G.S.title = ""; G.S.mode = "event"; G.S.event = "carriage"; G.say(G.data.EVENTS.find((e) => e.id === "carriage").text); G.ui.render(); });
// 奴隷商人：罪が濃く、位がある
await shoot(PC, "slaver_titled", new Function(`G.S.sin = 30; G.S.title = "騎士"; G.S.mode = "event"; G.S.event = "slaver"; G.say(G.data.EVENTS.find((e) => e.id === "slaver").text); G.ui.render();`));
// 酒場の「あなたなら」
await shoot(PC, "tavern", () => { G.S.sin = 30; G.S.fame = 200; G.S.companions = [{ name: "剣士のハンス", cls: "剣士", power: 50, dmg: 1, desc: "無口" }]; G.S.mode = "fac"; G.S.fac = "tavern"; G.ui.render(); });
// 設定の窓（Q7）の「選べない選択肢を見せる」
await shoot(PC, "settings", () => { const b = [...document.querySelectorAll(".top .tools button")].find((x) => /設定/.test(x.textContent)); if (b) b.click(); });
await browser.close();
