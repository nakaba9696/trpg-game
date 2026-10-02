// 音の波形を確かめる（耳の代わり）。Chromium の OfflineAudioContext で ui/sound.js の音を1つずつ書き出し、
// 無音・音割れ（クリップ）・長すぎが無いかを見る。CI では動かさない（Playwright と Chromium が要る）。
// node tools/sound_check.mjs
import { readFileSync } from "node:fs";
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
