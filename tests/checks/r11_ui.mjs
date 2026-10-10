// R11（R10 のプレイレビュー 2026-10-10 の画面の指摘：高 1・高 2・中 6・中 13・低 25・26・27・31）
// 作りを読んで確かめる（DOM なし）。Chromium（Playwright）と dist/site/index.html があれば、実際の画面でも確かめる（CI には無いので、そのときは作りだけ）
// - 高 1：本文を順に出す仕組み（u28）が #mbar を丸ごと書き戻さない（HP・MP・所持金の中身だけ）。いる所の一行（.u29where）は描くたびに一つだけ。描画を十回しても #mbar .u29where が一つ
// - 高 2：初回の遊び方の一行（.tip）は右の窓の外に出し、PC（1600×900・1366×768）でもスマホ（縦・横）でも画面の中に収まる
// - 中 6：「戦いのあと」の行が多くても「先へ進む」が見えて押せる（窓の下に貼り付ける）
// - 中 13：スマホの施設の中は一覧（#u21open）に高さを渡す（商店の「買う」が 200px 以上）
// - 低 25：スマホでは「行動へ ↓」を出さない・横長の「敵が現れた」と図鑑・用語集の知らせは舞台の側に・上の帯のいる所ははみ出さない
// - 低 26：窓の見出しの帯（.dhead）は透けない色
// - 低 27：スマホの遊び方の一行に「数字キー」と出さない
// - 低 31：戦闘の始まりに出たトロフィーの行は、戦闘の間は本文に出さず、結果の場面の「トロフィー」に出る
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export default async ({ fail: failTo, ok }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("R11 画面: " + m); };
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const read = (f) => readFileSync(path.join(root, f), "utf8");
  const code = (t) => t.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");

  // ---------------------------------------------------------------- 作り
  const u28 = code(read("src/ui/zzzzzz_u28_beats.js"));
  if (/(\bb|\bbar)\.innerHTML\s*=/.test(u28)) fail("高 1：u28 が #mbar の中身を丸ごと書き戻している");
  for (const id of ["#mHp", "#mMp", "#mGold"]) if (!u28.includes(`"${id}"`)) fail(`高 1：u28 が ${id} の中身だけを戻していない`);
  const u21 = code(read("src/ui/zzzzz_u21_side.js"));
  if (!/querySelectorAll\("\.u29where"\)[^\n]*x !== where[^\n]*remove\(\)/.test(u21)) fail("高 1：paintWhere が写しの .u29where を消していない");
  const js = code(read("src/ui/zzzzzzzzz_r11_ui.js")), css = read("src/ui/zzzzzzzzz_r11_ui.css");
  if (!/play\.after\(tip\)/.test(js)) fail("高 2：遊び方の一行を右の窓の外へ出していない");
  if (!/body\.u21pc:not\(\.u31m\) \.r11tip \{ position: fixed;/.test(css) || !/body\.u31m \.r11tip \{ position: fixed;/.test(css)) fail("高 2：外へ出した遊び方の一行の置き場所が無い");
  if (!/\.u13result \.u13go, \.u13death \.u13go \{ position: sticky;/.test(css)) fail("中 6：「先へ進む」を窓の下に貼り付けていない");
  if (!/S\.mode === "fac"/.test(js) || !/body\.u31m\.r11fac #u21side \{/.test(css)) fail("中 13：スマホの施設の中で一覧に高さを渡していない");
  if (!/body\.u31m #toActs \{ display: none; \}/.test(css)) fail("低 25：スマホで「行動へ ↓」を出している");
  if (!/html\.u31land body\.u31m #s4enc/.test(css) || !/html\.u31land body\.u31m #u8note/.test(css)) fail("低 25：横長の知らせがログ・コマンドの窓に重なる");
  if (!/dialog \.dhead \{ background: var\(--win-solid/.test(css)) fail("低 26：窓の見出しの帯が透ける");
  if (!/数字キーでも選べる/.test(js)) fail("低 27：スマホの遊び方の一行から数字キーを外していない");
  if (!/u13\.afterGroups = /.test(js) || !/#log > \.r11later \{ display: none; \}/.test(css)) fail("低 31：戦闘の頭のトロフィーを戦いのあとへ回していない");

  // ---------------------------------------------------------------- 実際の画面（Chromium があるときだけ）
  const page0 = path.join(root, "dist", "site", "index.html");
  let pw = null;
  if (existsSync(page0)) {
    const require = createRequire(import.meta.url);
    try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() + "/playwright"); } catch { pw = null; } }
  }
  let browser = null;
  if (pw) { try { browser = await pw.chromium.launch(); } catch { browser = null; } }
  if (!browser) { if (!bad) ok("R11 画面: 作り（Chromium が無いので、画面は確かめていない）"); return; }
  const url = pathToFileURL(page0).href;
  try {
    const open = async (w, h, opt = {}) => {
      const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: opt.motion ? "no-preference" : "reduce", hasTouch: !!opt.touch, isMobile: !!opt.touch });
      const errs = [];
      page.on("pageerror", (e) => errs.push(e.message));
      await page.goto(url);
      await page.evaluate(() => localStorage.clear());
      await page.goto(url);
      await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
      await page.evaluate(() => {
        const D = G.data, stats = {};
        D.STATS.forEach((k) => { stats[k] = 12; });
        G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "確かめ用", personality: "無口" } });
      });
      await page.waitForTimeout(300);
      page.errs = errs;
      return page;
    };
    const inView = (r, w, h) => r && r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= w + 0.5 && r.y + r.h <= h + 0.5 && r.w > 0;
    const rect = (page, q) => page.evaluate((q) => { const x = document.querySelector(q); if (!x) return null; const b = x.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, text: x.textContent }; }, q);

    // 高 1：本文を順に出す（動きあり）まま、十回行動して描く
    {
      const page = await open(1600, 900, { motion: true });
      let worst = 0;
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          const a = G.actions().flatMap((g) => g.list).find((x) => !x.disabled && !/travel|sail|go:|leave|retire/.test(x.id));
          if (a) { G.act(a.id); G.ui.after ? G.ui.after() : G.ui.render(); }
          if (G.S.combat) { G.S.combat = null; G.S.mode = "explore"; G.ui.render(); }
        });
        await page.waitForTimeout(2600); // 出しきって HP・所持金を戻すまで
        worst = Math.max(worst, await page.evaluate(() => document.querySelectorAll("#mbar .u29where").length));
      }
      if (worst !== 1) fail(`高 1：十回描くと #mbar .u29where が ${worst} 個になる`);
      if (page.errs.length) fail("高 1：画面のエラー " + page.errs[0]);
      await page.close();
    }
    // 高 2・低 27：遊び方の一行が画面の中に
    for (const [w, h, touch] of [[1600, 900], [1366, 768], [390, 844, 1], [844, 390, 1]]) {
      const page = await open(w, h, { touch });
      const r = await rect(page, ".tip");
      if (!r) fail(`高 2：${w}×${h} で遊び方の一行が出ない`);
      else {
        if (!inView(r, w, h)) fail(`高 2：${w}×${h} で遊び方の一行が画面の外（${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}×${Math.round(r.h)}）`);
        if (touch && /数字キー/.test(r.text)) fail(`低 27：${w}×${h} の遊び方の一行に「数字キー」`);
      }
      if (w === 390) {
        // 中 13：商店の「買う」
        await page.evaluate(() => { G.S.mode = "explore"; G.S.event = null; const a = G.actions().flatMap((g) => g.list).find((x) => /商店/.test(x.label) && !x.disabled); if (a) { G.act(a.id); G.ui.render(); } });
        await page.waitForTimeout(300);
        const box = await rect(page, "#u21open");
        if (!box || box.h < 200) fail(`中 13：スマホの商店の一覧の枠が低い（${box ? Math.round(box.h) : "無い"}px）`);
        if (await page.evaluate(() => { const b = document.querySelector("#toActs"); return !!b && getComputedStyle(b).display !== "none"; })) fail("低 25：スマホで「行動へ ↓」が出ている");
      }
      await page.close();
    }
    // 中 6・低 31：戦闘の頭のトロフィー → 戦いのあと（行の多い結果の場面でも「先へ進む」が押せる）
    for (const [w, h] of [[1600, 900], [1366, 768]]) {
      const page = await open(w, h);
      await page.evaluate(() => {
        G.S.mode = "explore"; G.S.event = null; G.ui.render();
        G.log("trophy", "トロフィー『確かめの階』を獲得（確かめ）");
        G.startCombat(["goblin"], {});
        G.S.combat.foes.forEach((f) => { f.hp = 1; f.def = 0; });
        G.ui.render();
      });
      await page.waitForTimeout(200);
      const during = await page.evaluate(() => [...document.querySelectorAll("#log > .l-trophy")].filter((x) => /確かめの階/.test(x.textContent)).map((x) => getComputedStyle(x).display));
      if (!during.length || during.some((d) => d !== "none")) fail(`低 31：${w}×${h} 戦闘の頭のトロフィーの行が本文に出ている`);
      for (let i = 0; i < 20 && !(await page.evaluate(() => !!document.querySelector(".u13go"))); i++) {
        await page.evaluate(() => { const S = G.S; if (!S.combat) return; S.combat.foes.forEach((f) => { f.hp = 0; }); const a = G.actions().flatMap((g) => g.list).find((x) => !x.disabled && /attack/.test(x.id)) || G.actions().flatMap((g) => g.list).find((x) => !x.disabled); if (a) { G.act(a.id); G.ui.after ? G.ui.after() : G.ui.render(); } });
        await page.waitForTimeout(400);
      }
      const res = await rect(page, ".u13result");
      if (!res) { fail(`中 6：${w}×${h} 結果の場面が出ない`); await page.close(); continue; }
      if (!/確かめの階/.test(res.text)) fail(`低 31：${w}×${h} 結果の場面にトロフィーが無い`);
      await page.evaluate(() => { const dl = document.querySelector(".u13rrows"); for (let i = 0; i < 8; i++) { const dt = document.createElement("dt"); dt.textContent = "そのほか"; const dd = document.createElement("dd"); dd.textContent = "握りしめていた手をゆっくり開く。指の震えはしばらく止まらなかった。"; dl.append(dt, dd); } });
      const hit = await page.evaluate(() => { const g = document.querySelector(".u13go"); const r = g.getBoundingClientRect(); if (r.bottom > innerHeight || r.top < 0) return false; const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!t && (t === g || g.contains(t)); });
      if (!hit) fail(`中 6：${w}×${h} 行が多いと「先へ進む」が見えない・押せない`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  if (!bad) ok("R11 画面: 作りと Chromium の画面（高 1・高 2・中 6・中 13・低 25・26・27・31）");
};
