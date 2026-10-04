// 音の波形を確かめる（耳の代わり）。Chromium の OfflineAudioContext で ui/sound.js の音を1つずつ書き出し、
// 無音・音割れ（クリップ）・長すぎが無いかを見る。CI では動かさない（Playwright と Chromium が要る）。
// node tools/sound_check.mjs
// node tools/sound_check.mjs --wav page docs/sound/page_after.wav [回数]  … その音を何回か（1.2 秒おきに）鳴らして WAV に書き出す（聞き比べ用）
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(process.execPath, "../../lib/node_modules/playwright")); }
const code = readFileSync(path.join(here, "..", "src", "ui", "sound.js"), "utf8");

const browser = await pw.chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.setContent("<!doctype html><title>音</title><div class='top'><div class='tools'></div></div>");
await page.addScriptTag({ content: "globalThis.G = { data: { LOCS: {}, ENEMIES: {} } };\n" + code });
// --wav：名前の音を何回か並べて鳴らし、16bit の WAV に書き出して、波形の数字を出す
const wi = process.argv.indexOf("--wav");
if (wi > 0) {
  const [name, file, times] = process.argv.slice(wi + 1);
  const n = +times || 5;
  const { data, rate, stat } = await page.evaluate(async ({ name, n }) => {
    const rate = 44100;
    const ctx = new OfflineAudioContext(1, Math.ceil(rate * (n * 1.2 + 0.6)), rate);
    G.sound._offline(ctx, Array(n).fill(name), false, Array.from({ length: n }, (_, i) => 0.2 + i * 1.2));
    const d = (await ctx.startRendering()).getChannelData(0);
    let peak = 0, sum = 0, clip = 0;
    for (const v of d) { const a = Math.abs(v); peak = Math.max(peak, a); if (a >= 0.999) clip++; sum += v * v; }
    return { data: Array.from(d, (v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767)), rate, stat: { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), clip } };
  }, { name, n });
  await browser.close();
  const buf = Buffer.alloc(44 + data.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + data.length * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) => buf.writeInt16LE(v, 44 + i * 2));
  mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  writeFileSync(file, buf);
  console.log(`${file}：${name} を ${n} 回（最大 ${stat.peak}・実効値 ${stat.rms}・クリップ ${stat.clip}）`);
  process.exit(0);
}
const res = await page.evaluate(async () => {
  const S = G.sound;
  const measure = (buf) => {
    let peak = 0, sum = 0, clip = 0, lastLoud = 0, n = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) {
        const a = Math.abs(d[i]);
        if (a > peak) peak = a;
        if (a >= 0.999) clip++;
        if (a > 0.001) lastLoud = Math.max(lastLoud, i);
        sum += d[i] * d[i]; n++;
      }
    }
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4), clip, len: +(lastLoud / buf.sampleRate).toFixed(2) };
  };
  const out = [];
  for (const name of S.names) {
    const ctx = new OfflineAudioContext(2, 44100 * 8, 44100);
    S._offline(ctx, name, false);
    out.push({ kind: "効果音", name, ...measure(await ctx.startRendering()) });
  }
  // S2：ダイスを振る音は毎回違うので、何度か鳴らして確かめる。振る音 → 結果の音（遅らせて重ねる）の組も見る
  for (let i = 0; i < 6; i++) for (const name of ["roll", "rollShort"]) {
    const ctx = new OfflineAudioContext(2, 44100 * 3, 44100);
    S._offline(ctx, name, false);
    out.push({ kind: "効果音", name: `${name}#${i + 1}`, ...measure(await ctx.startRendering()) });
  }
  for (const res of ["ok", "ng", "crit", "fumble"]) {
    const ctx = new OfflineAudioContext(2, 44100 * 5, 44100);
    S._offline(ctx, ["roll", res], false, [0, S.ROLL_LAG]);
    out.push({ kind: "効果音", name: `roll→${res}`, ...measure(await ctx.startRendering()) });
  }
  for (const name of S.ambNames) {
    const ctx = new OfflineAudioContext(2, 44100 * 8, 44100);
    S._offline(ctx, name, true);
    out.push({ kind: "環境音", name, ...measure(await ctx.startRendering()) });
  }
  return out;
});
await browser.close();

let bad = 0;
console.log("| 種類 | 名前 | 最大 | 実効値 | クリップ | 鳴っている長さ(秒) | 判定 |\n|---|---|---:|---:|---:|---:|---|");
for (const r of res) {
  const why = [];
  if (r.peak < 0.02) why.push("無音");
  if (r.clip) why.push("音割れ");
  if (r.kind === "効果音" && r.len > 6) why.push("長すぎ");
  if (r.kind === "環境音" && r.peak > 0.5) why.push("環境音が大きすぎ");
  if (why.length) bad++;
  console.log(`| ${r.kind} | ${r.name} | ${r.peak} | ${r.rms} | ${r.clip} | ${r.len} | ${why.join("・") || "OK"} |`);
}
console.log(bad ? `NG ${bad} 件` : "すべて OK");
process.exit(bad ? 1 : 0);
