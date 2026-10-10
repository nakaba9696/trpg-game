// U33：見えている字の色と実際の地の色のコントラスト比を測る（Playwright。暗い画面・明るい画面 × PC・スマホ）
// node tools/build.mjs && node tools/audit_u33_contrast.mjs [--shots=docs/review/u33 --tag=before]
// タイトル・作成・町・出来事・戦闘・戦いのあと・窓（ステータス・トロフィー・手引き・図鑑・依頼…）を開いて、字のある要素ごとに測る。
// 字の色は祖先の opacity を掛け、地は不透明な祖先まで重ねて求める（グラデーションは色の段の最悪値、絵の上の半透明の窓は紙の色の上に重ねた近似）。
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3) || d;
const STEPS = +arg("steps", 260);
const ALL = process.argv.includes("--all");
const shotDir = arg("shots", ""), tag = arg("tag", "now"), only = arg("only", "");
const root = process.env.SITE ? process.env.SITE.replace(/\/?$/, "/") : new URL("../dist/site/", import.meta.url).pathname;
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0])); if (p.endsWith("/")) p += "index.html";
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { "content-type": mime[path.extname(p)] || "application/octet-stream" }); res.end(b); } });
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/index.html`;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });

// ページの中で動く測定
const AUDIT = async ({ shotUrl, state, scope }) => {
  const CARD = '#s4enc, #u14cut, #u14card', NOTE = '#u8note, #toast', OVERLAY = CARD + ', ' + NOTE;
  const img = new Image(); img.src = shotUrl; await img.decode();
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const sc = img.width / innerWidth; const full = cx.getImageData(0, 0, img.width, img.height).data;
  const sample = (r) => { const x0 = Math.max(0, r.left), x1 = Math.min(innerWidth - 1, r.right), y0 = Math.max(0, r.top), y1 = Math.min(innerHeight - 1, r.bottom); if (x1 - x0 < 2 || y1 - y0 < 2) return null; const o = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const px = Math.round((x0 + (x1 - x0) * (i + .5) / 6) * sc), py = Math.round((y0 + (y1 - y0) * (j + .5) / 2) * sc), k = (py * img.width + px) * 4; o.push({ r: full[k], g: full[k + 1], b: full[k + 2], a: 1 }); } return o; };
  const parse = (s) => { const k = /color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)/.exec(s); if (k) return { r: k[1] * 255, g: k[2] * 255, b: k[3] * 255, a: k[4] === undefined ? 1 : +k[4] }; const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] === undefined ? 1 : v[3] }; };
  const over = (f, b) => { const a = f.a + b.a * (1 - f.a); return a === 0 ? { r: 0, g: 0, b: 0, a: 0 } : { r: (f.r * f.a + b.r * b.a * (1 - f.a)) / a, g: (f.g * f.a + b.g * b.a * (1 - f.a)) / a, b: (f.b * f.a + b.b * b.a * (1 - f.a)) / a, a }; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const paper = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  // 地の候補（グラデーションなら段ごと）。不透明になるまで祖先をたどる
  const bgs = (el) => {
    let layers = [{ r: 0, g: 0, b: 0, a: 0 }];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const bi = cs.backgroundImage; const own = parse(cs.backgroundColor);
      let cand = [];
      if (bi && bi !== "none" && /gradient/.test(bi)) {
        const cols = (bi.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
        cand = cols.map((c) => (own && own.a > 0 ? over(c, own) : c));
        if (cols.length && cols.every((c) => c.a >= .98)) { layers = layers.flatMap((l) => cand.map((c) => over(l, c))); break; }
        if (cand.length) layers = layers.flatMap((l) => cand.map((c) => over(l, c)));
      } else if (bi && bi !== "none" && /url\(/.test(bi) && e !== document.body) { return null; }
      if (own && own.a > 0) { layers = layers.map((l) => over(l, own)); if (own.a >= .98 && !(bi && /gradient/.test(bi))) break; }
      if (layers.every((l) => l.a >= .98)) break;
    }
    if (layers.some((l) => l.a < .98)) return null; // 絵の上：撮った画面の画素で測る
    return layers;
  };
  const out = [];
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; } return true; };
  const sig = (el) => { const p = []; for (let e = el, n = 0; e && e.nodeType === 1 && n < 3; e = e.parentElement, n++) p.unshift(e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + [...e.classList].slice(0, 2).map((c) => "." + c).join("")); return p.join(" > "); };
  for (const el of document.body.querySelectorAll("*")) {
    if (["SCRIPT", "STYLE", "CANVAS", "SVG", "OPTION"].includes(el.tagName.toUpperCase())) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join("");
    if (!own && !(el.tagName === "INPUT" && el.value)) continue;
    if (el.disabled || el.closest("[disabled], [aria-disabled='true']")) continue;
    if (!vis(el)) continue;
    if (el.tagName === "INPUT" && /^(checkbox|radio|range|color|file)$/.test(el.type)) continue;
    const dlg = el.closest("dialog"); if (dlg && !dlg.open) continue;
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.right < 0 || r.top > innerHeight * 3) continue;
    const cs = getComputedStyle(el);
    let fg = parse(cs.color); if (!fg) continue;
    let op = 1, opSrc = ''; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const o = +getComputedStyle(e).opacity; if (o < 1) opSrc += e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].map((c) => '.' + c).join('') + '=' + o + ' '; op *= o; }
    fg = { ...fg, a: fg.a * op };
    if (scope === 'card' && !el.closest(CARD)) continue;
    if (scope === 'note' && !el.closest(NOTE)) continue;
    if (scope === 'base' && el.closest(OVERLAY)) continue;
    if (el.closest('#panel.u13wait, .dying, .foe.down')) continue;
    if (el.closest('.c3plate')) { const tp = document.querySelector('.tip'); if (tp && getComputedStyle(tp).display !== 'none') { const a = tp.getBoundingClientRect(), b = el.getBoundingClientRect(); if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) continue; } } // 初回の「遊び方の一行」が名札に重なる配置は色ではなく重なりの問題（別に知らせる） // 手番待ち・倒れた敵は操作できない表示（WCAG の対象外）
    // 隠れている（ほかの物が上に重なる）・はみ出して見えない物は測らない：左・真ん中・右の 3 点で確かめる
    if (getComputedStyle(el).pointerEvents !== 'none') {
      const py = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const pts = [r.left + Math.min(6, r.width / 2), r.left + r.width / 2, r.right - Math.min(6, r.width / 2)].map((x) => Math.min(innerWidth - 1, Math.max(0, x)));
      if (!pts.every((x) => { const hit = document.elementFromPoint(x, py); return hit && el.contains(hit); })) continue;
    }
    { let cl = { l: 0, t: 0, r: innerWidth, b: innerHeight }, clipped = false;
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const ac = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(ac.overflowY + ac.overflowX)) { const q = a.getBoundingClientRect(); cl = { l: Math.max(cl.l, q.left), t: Math.max(cl.t, q.top), r: Math.min(cl.r, q.right), b: Math.min(cl.b, q.bottom) }; } }
      const iw = Math.max(0, Math.min(r.right, cl.r) - Math.max(r.left, cl.l)), ih = Math.max(0, Math.min(r.bottom, cl.b) - Math.max(r.top, cl.t));
      if (iw * ih < r.width * r.height * .9) clipped = true;
      if (clipped) continue; }
    const rects = []; for (const nd of el.childNodes) if (nd.nodeType === 3 && nd.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(nd); for (const q of rg.getClientRects()) if (q.width > 2 && q.height > 2) rects.push(q); }
    if (!rects.length) rects.push(r);
    // 地：不透明な背景を持つ祖先（札・印・ボタン・不透明な窓）があればその色。半透明の窓や絵の上は、撮った画面の画素で測る
    let bl = []; let via = 'px';
    for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const c2 = getComputedStyle(e); if (c2.backgroundImage !== 'none') break;
      const o = parse(c2.backgroundColor);
      if (o && o.a >= .95) { bl = [o]; via = 'css'; break; }
      if (o && o.a > .02) break;
    }
    if (!bl.length) { for (const q of rects.slice(0, 10)) bl = bl.concat(sample(q) || []); }
    if (!bl.length) continue;
    const rs = bl.map((b) => ({ rr: ratio(over(fg, b), b), b })).sort((p, q) => p.rr - q.rr);
    const pick = rs[Math.floor(rs.length * .12)]; const worst = pick.rr, wbg = pick.b;
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    if (worst < need || window.__all) out.push({ pass: worst >= need, via, op: opSrc, sig: sig(el), text: own.slice(0, 24), ratio: +worst.toFixed(2), need, fg: `rgb(${fg.r|0},${fg.g|0},${fg.b|0})`, bg: wbg ? `rgb(${wbg.r|0},${wbg.g|0},${wbg.b|0})` : "?", size });
  }
  return out;
};

const found = new Map();
const HIDE = "*, *::before, *::after { transition: none !important; } *, *::before, *::after { color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; border-color: transparent !important; -webkit-text-fill-color: transparent !important; caret-color: transparent !important; } *::placeholder { color: transparent !important; }";
const note = (ctx, state, list) => { for (const x of list) { const k = ctx + "|" + x.sig; const o = found.get(k); if (!o || x.ratio < o.ratio) found.set(k, { ctx, state, ...x }); } };
const browser = await pw.chromium.launch();
for (const [vn, w, h, sc] of [["pc", 1600, 900, 1], ["phone", 390, 844, 2]]) for (const scheme of ["dark", "light"]) {
  if (only && only !== `${vn}_${scheme}`) continue;
  const ctx = `${vn}/${scheme}`;
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: sc, colorScheme: scheme, reducedMotion: "reduce" })).newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url); await page.evaluate(() => { localStorage.clear(); }); await page.goto(url); await page.evaluate((a) => { window.__all = a; }, ALL);
  await page.waitForFunction(() => window.G && G.main && G.ui, null, { timeout: 60000 });
  let n = 0;
  const measure = async (state, scope = 'base') => {
    await page.evaluate(() => new Promise((res) => { let n = 0; const t = setInterval(() => { if (!document.body.classList.contains('u14swap') || ++n > 12) { clearInterval(t); res(); } }, 150); }));
    await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }));
    await page.evaluate(() => document.querySelectorAll("body *").forEach((e) => { const c = getComputedStyle(e); if (c.webkitBackgroundClip === "text" || c.backgroundClip === "text") e.classList.add("__clip"); }));
    const h = await page.addStyleTag({ content: ".__clip { background-image: none !important; } " + HIDE + (scope === "base" ? " #s4enc, #u14cut, #u14card, #u8note, #toast { visibility: hidden !important; }" : scope === "card" ? " #u8note, #toast { visibility: hidden !important; }" : " #s4enc, #u14cut, #u14card { visibility: hidden !important; }") });
    const buf = await page.screenshot({ type: "png" });
    if (process.env.DUMPHIDE) fs.writeFileSync(`${process.env.DUMPHIDE}/${vn}_${scheme}_${String(n).padStart(3, "0")}_${state.replace(/[^a-z0-9]/gi, "_")}.png`, buf);
    await h.evaluate((x) => x.remove());
    await page.evaluate(() => document.querySelectorAll(".__clip").forEach((e) => e.classList.remove("__clip")));
    await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }));
    note(ctx, state, await page.evaluate(AUDIT, { shotUrl: "data:image/png;base64," + buf.toString("base64"), state, scope }));
  };
  const check = async (state, shot) => {
    await page.evaluate(() => { try { G.u28 && G.u28.skip && G.u28.skip(); } catch (e) {} document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }); });
    await page.waitForTimeout(450);
    await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }));
    // 長い所は下（いまの場面）と上の両方で測る
    const scr = () => page.evaluate((to) => { const els = [document.getElementById("log"), ...document.querySelectorAll("dialog[open] .dbody")].filter((e) => e && e.scrollHeight > e.clientHeight + 4); els.forEach((e) => { e.scrollTop = to ? e.scrollHeight : 0; }); return els.length; }, true);
    const ovUp = () => page.evaluate(() => [...document.querySelectorAll("#s4enc, #u14cut, #u14card")].some((e) => { const c = getComputedStyle(e); return c.display !== "none" && c.visibility !== "hidden" && +c.opacity > .05; }));
    const tUp = await page.evaluate(() => [...document.querySelectorAll("#u8note, #toast")].some((e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed" && e.children.length));
    if (tUp && !(await ovUp())) await measure(state + "[note]", "note");
    if (await ovUp()) { for (let k = 0; k < 12 && !(await page.evaluate(() => [...document.querySelectorAll("#s4enc, #u14cut, #u14card")].every((e) => getComputedStyle(e).display === "none" || +getComputedStyle(e).opacity >= .98))); k++) await page.waitForTimeout(150); await measure(state + "[overlay]", "card"); if (tUp) await measure(state + "[note]", "note"); for (let k = 0; k < 40 && (await ovUp()); k++) await page.waitForTimeout(200); await page.evaluate(() => { try { G.u28 && G.u28.skip && G.u28.skip(); } catch (e) {} document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }); }); await page.waitForTimeout(300); }
    const nScroll = await scr();
    await measure(state);
    if (shotDir && shot) await page.screenshot({ path: `${shotDir}/${tag}_${vn}_${scheme}_${shot}.png` });
    if (nScroll) { await page.evaluate(() => { [document.getElementById("log"), ...document.querySelectorAll("dialog[open] .dbody")].forEach((e) => { if (e) e.scrollTop = 0; }); }); await measure(state + "(top)"); }
    n++;
  };
  const closeAll = () => page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); try { G.ui.setSheetOpen(false); } catch (e) {} });
  await check("title", "01_title");
  await page.evaluate(() => { try { const b = [...document.querySelectorAll("button")].find((x) => /はじめる/.test(x.textContent) && x.offsetParent); b && b.click(); } catch (e) {} });
  await page.waitForTimeout(300); await check("create", "02_create");
  await page.evaluate(() => {
    const D = G.data, stats = {}; D.STATS.forEach((k) => { stats[k] = 60; });
    let s = 33; G.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    G.main.start({ cls: "merc", stats, goal: "majin", profile: { name: "ユリア", sex: "女", age: 24, ageBand: "prime", origin: "nerva" } });
    G.S.gold = 500; G.S.mode = "explore"; G.S.event = null; G.ui.render();
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  });
  await check("town", "03_town");
  const openers = async (label, shotName) => {
    const ids = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => b.offsetParent && !b.disabled && /^(open|u\d+open)/i.test(b.id || "")).map((b) => b.id));
    for (const id of ids) {
      await page.evaluate((i) => document.getElementById(i).click(), id); await page.waitForTimeout(150);
      await check(`${label}:${id}`, shotName && id === "openSheet" ? shotName : null);
      // 窓の中の札（タブ）も開く
      const tabs = await page.evaluate(() => [...document.querySelectorAll("dialog[open] [role=tab], dialog[open] .tabs button")].map((_, i) => i));
      for (const t of tabs.slice(0, 12)) { await page.evaluate((i) => { const x = [...document.querySelectorAll("dialog[open] [role=tab], dialog[open] .tabs button")][i]; x && x.click(); }, t); await page.waitForTimeout(80); await check(`${label}:${id}:tab${t}`, null); }
      await closeAll();
    }
  };
  await openers("town", "04_sheet");
  // 右の窓の札（手引き・図鑑・依頼など）
  const tabsLoop = async (label) => {
    const k = await page.evaluate(() => document.querySelectorAll(".u13tab").length);
    for (let i = 0; i < k; i++) { await page.evaluate((j) => { const t = document.querySelectorAll(".u13tab")[j]; t && t.click(); }, i); await page.waitForTimeout(150); await check(`${label}:u13tab${i}`, null); }
  };
  await tabsLoop("town");
  // 決まった乱数で遊んで、場面ごとに測る（出来事・戦闘・戦いのあと・施設…）
  const seen = new Set();
  for (let i = 0; i < STEPS; i++) {
    const info = await page.evaluate(() => {
      if (G.S.over) return null;
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled); if (!acts.length) return null;
      const st = (G.S.combat ? "combat" : G.S.event ? "event" : G.S.mode) + ":" + (document.body.dataset.u14 || "");
      const a = G.S.combat ? acts[0] : acts[Math.floor(G.rand() * acts.length)];
      G.act(a.id); G.S.hp = Math.max(G.S.hp, Math.ceil(G.S.maxHp * .6)); G.ui.render();
      document.querySelectorAll("dialog[open]").forEach((d) => d.close()); try { G.ui.setSheetOpen(false); } catch (e) {}
      return st;
    });
    if (info === null) break;
    const st = await page.evaluate(() => (G.S.combat ? "combat" : G.S.event ? "event" : G.S.mode) + ":" + (document.body.dataset.u14 || "") + (G.S.combat ? "" : ":" + (G.S.log.slice(-1)[0] || {}).k));
    if (i % 2 === 0 || !seen.has(st)) { await check("play:" + st, !seen.has(st) && /combat|event|story/.test(st) && seen.size < 40 ? `10_${st.replace(/[^a-z0-9]/gi, "_")}` : null); seen.add(st); }
    if (i % 40 === 20) { await openers("play"); await tabsLoop("play"); }
  }
  if (errs.length) console.log("pageerror", ctx, errs.slice(0, 2).join("／"));
  console.log(ctx, "measured", n, "states", [...seen].length);
  await page.context().close();
}
await browser.close(); server.close();
const allRows = [...found.values()].sort((a, b) => a.ratio - b.ratio);
const rows = allRows.filter((r) => !r.pass);
if (ALL) fs.writeFileSync(arg("out", "/tmp/claude-0/x/contrast.json").replace(/\.json$/, ".all.json"), JSON.stringify(allRows, null, 1));
fs.writeFileSync(arg("out", "/tmp/claude-0/x/contrast.json"), JSON.stringify(rows, null, 1));
console.log("NG", rows.length);
for (const r of rows) console.log(`${r.ratio}/${r.need}\t${r.ctx}\t${r.state}\t${r.sig}\t「${r.text}」\t${r.fg} on ${r.bg}`);
process.exit(rows.length ? 1 : 0);
