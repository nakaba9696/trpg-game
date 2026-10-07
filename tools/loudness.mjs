// S4：BGM・環境音・効果音の聞こえる大きさ（ラウドネス）を測り、つり合いの表（src/data/s4_mix.js）を揃える。
// Chromium の OfflineAudioContext で、既定の音量（効果音 70・環境音 40・BGM 35 と、表の倍率）のまま鳴らして書き出し、
// K 特性（耳の感じ方に近い重み付け：低音を削り高音を少し持ち上げる）を掛けて、
//   BGM・環境音：400 ミリ秒ずつの区切りで、静かすぎる区切りを除いた平均（LUFS の積分ラウドネスと同じ考え）
//   効果音：400 ミリ秒の区切りの最大（一瞬の大きさ）
// を出す。CI では動かさない（Playwright と Chromium が要る）。
// node tools/loudness.mjs            … 今の表で測って、狙い（TARGET＋OFFSET）とのずれを出す
// node tools/loudness.mjs --write    … 測っては倍率を直すのを 3 回くり返し、表の BGM・AMB・SFX を書き換える（前と後の数字を出す）
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(process.execPath, "../../lib/node_modules/playwright")); }
const src = (f) => readFileSync(path.join(here, "..", "src", f), "utf8");
// 曲の表：S4 の曲と、S6 で足した曲（src/data/s6_tracks*.js）
const tracks = () => ["data/s4_tracks.js", ...readdirSync(path.join(here, "..", "src", "data")).filter((f) => /^s6_tracks.*\.js$/.test(f)).sort().map((f) => "data/" + f)].map(src).join("\n");
const MIXFILE = path.join(here, "..", "src", "data", "s4_mix.js");
const write = process.argv.includes("--write");

const browser = await pw.chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.setContent("<!doctype html><title>音の大きさ</title>");
await page.addScriptTag({ content: "globalThis.G = { data: { LOCS: {}, ENEMIES: {} } };\n" + tracks() + "\n" + src("data/s4_mix.js") });
await page.addScriptTag({ content: src("ui/sound.js") });
await page.addScriptTag({ content: src("ui/sound_bgm.js") });

// 一回ぶん測る：{ bgm: { id: LUFS }, amb: {...}, sfx: {...} }
const measure = () => page.evaluate(async () => {
  const S = G.sound, RATE = 32000;
  // K 特性を掛けて、400 ミリ秒の区切り（100 ミリ秒ずつずらす）ごとの大きさ（LUFS）を返す
  async function blocks(buf, skip) {
    const ctx = new OfflineAudioContext(2, buf.length, RATE);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const sh = ctx.createBiquadFilter(); sh.type = "highshelf"; sh.frequency.value = 1500; sh.gain.value = 4;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 38; hp.Q.value = 0.5;
    s.connect(sh); sh.connect(hp); hp.connect(ctx.destination); s.start();
    const k = await ctx.startRendering();
    const L = k.getChannelData(0), R = k.getChannelData(1);
    const W = Math.floor(RATE * 0.4), step = Math.floor(RATE * 0.1), out = [];
    for (let i = Math.floor(RATE * (skip || 0)); i + W <= L.length; i += step) {
      let e = 0; for (let j = i; j < i + W; j++) e += L[j] * L[j] + R[j] * R[j];
      out.push(-0.691 + 10 * Math.log10(e / W + 1e-12));
    }
    return out;
  }
  // 積分ラウドネス：-70 より静かな区切りを除き、その平均から 10 下より静かな区切りも除いた平均
  const integrated = (bl) => {
    const pow = (x) => Math.pow(10, (x + 0.691) / 10), lu = (p) => -0.691 + 10 * Math.log10(p);
    const a = bl.filter((x) => x > -70);
    if (!a.length) return -99;
    const g = lu(a.reduce((s, x) => s + pow(x), 0) / a.length) - 10;
    const b = a.filter((x) => x > g);
    return lu(b.reduce((s, x) => s + pow(x), 0) / b.length);
  };
  const r = (x) => Math.round(x * 10) / 10;
  const res = { bgm: {}, amb: {}, sfx: {} };
  for (const id of Object.keys(G.data.BGM.TRACKS)) {
    const ctx = new OfflineAudioContext(2, RATE * 22, RATE);
    S._bgmOffline(ctx, id, 22, true);
    res.bgm[id] = r(integrated(await blocks(await ctx.startRendering(), 2)));
  }
  for (const name of S.ambNames) {
    const ctx = new OfflineAudioContext(2, RATE * 14, RATE);
    S._offline(ctx, name, true, null, true);
    res.amb[name] = r(integrated(await blocks(await ctx.startRendering(), 3)));
  }
  for (const name of S.names) {
    // ダイスや足音のように毎回揺れる音は、4 回鳴らした最大の平均
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      const ctx = new OfflineAudioContext(2, RATE * 6, RATE);
      S._offline(ctx, name, false, null, true);
      sum += Math.max(...(await blocks(await ctx.startRendering(), 0)));
    }
    res.sfx[name] = r(sum / 4);
  }
  return res;
});
const getMix = () => page.evaluate(() => G.data.MIX);
const setMix = (m) => page.evaluate((m) => { G.data.MIX = m; }, m);
const want = (M, kind, name) => M.TARGET[kind] + ((M[kind.toUpperCase() + "_OFFSET"] || {})[name] || 0);

function table(before, after, M) {
  const rows = [];
  for (const kind of ["bgm", "amb", "sfx"]) {
    for (const name of Object.keys(before[kind])) {
      const w = want(M, kind, name);
      const b = before[kind][name], a = after ? after[kind][name] : null;
      rows.push(`| ${{ bgm: "BGM", amb: "環境音", sfx: "効果音" }[kind]} | ${name} | ${b.toFixed(1)} | ${a == null ? "" : a.toFixed(1)} | ${w.toFixed(0)} | ${(a ?? b) - w >= 0 ? "+" : ""}${((a ?? b) - w).toFixed(1)} |`);
    }
  }
  return `| 種類 | 名前 | 前（LUFS） | 後（LUFS） | 狙い | ずれ |\n|---|---|---:|---:|---:|---:|\n${rows.join("\n")}`;
}
// 場面ごとの BGM と環境音の差（BGM が何 dB 上か）
const PAIRS = [["町（昼）", "town", "town"], ["町（夜）", "town_night", "town"], ["港町", "town", "sea"], ["酒場", "tavern", "fire"], ["宿", "inn", "fire"], ["街道", "road", "wind"], ["雨の街道", "road", "rain"], ["迷宮", "dungeon", "cave"], ["迷宮（二曲目）", "dungeon2", "cave"], ["深淵", "abyss", "dread"]];
const pairs = (m) => PAIRS.map(([w, b, a]) => `${w} ${(m.bgm[b] - m.amb[a]).toFixed(1)}`).join("・");
const spread = (m, M, kind) => { const d = Object.keys(m[kind]).map((n) => m[kind][n] - want(M, kind, n)); return `${Math.min(...d).toFixed(1)}〜${Math.max(...d).toFixed(1)}`; };

let M = await getMix();
const first = await measure();
let last = first;
if (write) {
  for (let it = 0; it < 3; it++) {
    for (const kind of ["bgm", "amb", "sfx"]) {
      const K = kind.toUpperCase();
      for (const [name, lufs] of Object.entries(last[kind])) {
        if (lufs < -90) continue;
        const old = M[K][name] || 1;
        const next = old * Math.pow(10, (want(M, kind, name) - lufs) / 20);
        M[K][name] = Math.round(Math.max(0.05, Math.min(8, next)) * 1000) / 1000;
      }
    }
    await setMix(M);
    last = await measure();
  }
  const fmt = (o) => "{ " + Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(", ") + " }";
  let file = readFileSync(MIXFILE, "utf8");
  file = file.replace(/    BGM: \{[^\n]*\},\n    AMB: \{[^\n]*\},\n    SFX: \{[^\n]*\},\n/, `    BGM: ${fmt(M.BGM)},\n    AMB: ${fmt(M.AMB)},\n    SFX: ${fmt(M.SFX)},\n`);
  file = file.replace(/    MEASURED: \{[^\n]*\},\n/, `    MEASURED: { bgm: ${fmt(last.bgm)}, amb: ${fmt(last.amb)}, sfx: ${fmt(last.sfx)} },\n`);
  writeFileSync(MIXFILE, file);
}
await browser.close();
console.log(table(first, write ? last : null, M));
console.log(`\n狙いとのずれ（前）：BGM ${spread(first, M, "bgm")}・環境音 ${spread(first, M, "amb")}・効果音 ${spread(first, M, "sfx")} dB`);
if (write) console.log(`狙いとのずれ（後）：BGM ${spread(last, M, "bgm")}・環境音 ${spread(last, M, "amb")}・効果音 ${spread(last, M, "sfx")} dB`);
console.log(`場面ごとの BGM と環境音の差（前）：${pairs(first)}`);
if (write) console.log(`場面ごとの BGM と環境音の差（後）：${pairs(last)}`);
