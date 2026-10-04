// S4：BGM を書き出して確かめる（耳の代わり・聞き比べ用）。Chromium の OfflineAudioContext で src/ui/sound_bgm.js の曲を鳴らし、
// 音の大きさ（最大・実効値）・音割れ（クリップ）・無音を見る。CI では動かさない（Playwright と Chromium が要る）。
// node tools/bgm_render.mjs                 … すべての曲の数字を出す（一巡りの長さぶん鳴らす）
// node tools/bgm_render.mjs --out docs/sound/bgm [秒] [曲の id…]  … 曲の頭から［秒］（既定 24）を mp3（ffmpeg があれば。無ければ wav）に書き出す
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(process.execPath, "../../lib/node_modules/playwright")); }
const src = (f) => readFileSync(path.join(here, "..", "src", f), "utf8");

const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const outDir = oi >= 0 ? args[oi + 1] : null;
const rest = oi >= 0 ? args.slice(oi + 2) : args;
const sec = rest[0] && /^\d+(\.\d+)?$/.test(rest[0]) ? +rest.shift() : 24;
const only = rest;

const browser = await pw.chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.setContent("<!doctype html><title>BGM</title>");
await page.addScriptTag({ content: "globalThis.G = { data: { LOCS: {}, ENEMIES: {} } };\n" + src("data/s4_tracks.js") + "\n;delete globalThis.AudioContext;\n" });
// 鳴らす係の作りだけ使う（ブラウザの中の自動の再生は動かさない）
await page.addScriptTag({ content: src("ui/sound_bgm.js") });
const ids = await page.evaluate(() => Object.keys(G.data.BGM.TRACKS));
const rate = outDir ? 32000 : 22050;
const list = ids.filter((id) => !only.length || only.includes(id));
let bad = 0;
for (const id of list) {
  const r = await page.evaluate(async ({ id, sec, rate, full }) => {
    const tr = G.data.BGM.TRACKS[id];
    const C = G.sound.bgmCompile(tr);
    const len = full ? Math.min(C.len, 95) : sec;
    const ctx = new OfflineAudioContext(2, Math.ceil(rate * (len + (full ? 0 : 1.5))), rate);
    G.sound._bgmOffline(ctx, id, len);
    const t0 = performance.now();
    const buf = await ctx.startRendering();
    const ms = performance.now() - t0;
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0, sum = 0, clip = 0, quiet = 0, win = 0, wsum = 0;
    const W = Math.floor(rate * 0.5);
    for (let i = 0; i < L.length; i++) {
      const a = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      if (a > peak) peak = a;
      if (a >= 0.999) clip++;
      sum += L[i] * L[i] + R[i] * R[i];
      wsum += L[i] * L[i]; win++;
      if (win === W) { if (Math.sqrt(wsum / W) < 0.002) quiet++; win = 0; wsum = 0; }
    }
    const out = { len: +C.len.toFixed(1), peak: +peak.toFixed(3), rms: +Math.sqrt(sum / L.length / 2).toFixed(4), clip, quiet: +(quiet * 0.5).toFixed(1), errors: C.errors, speed: +(len * 1000 / ms).toFixed(1) };
    if (!full) { out.L = Array.from(L, (v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767)); out.R = Array.from(R, (v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767)); }
    return out;
  }, { id, sec, rate, full: !outDir });
  const warn = r.clip || r.peak < 0.05 || r.errors.length || r.quiet > 3;
  if (warn) bad++;
  console.log(`${warn ? "!!" : "  "} ${id.padEnd(14)} 一巡り ${String(r.len).padStart(5)} 秒  最大 ${r.peak}  実効値 ${r.rms}  クリップ ${r.clip}  無音 ${r.quiet} 秒  速さ ×${r.speed}${r.errors.length ? "  " + r.errors.slice(0, 3).join(" / ") : ""}`);
  if (outDir) {
    const n = r.L.length;
    const buf = Buffer.alloc(44 + n * 4);
    buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
    buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
    buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
    buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
    for (let i = 0; i < n; i++) { buf.writeInt16LE(r.L[i], 44 + i * 4); buf.writeInt16LE(r.R[i], 46 + i * 4); }
    mkdirSync(outDir, { recursive: true });
    const wav = path.join(outDir, id + ".wav");
    writeFileSync(wav, buf);
    try {
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-af", "afade=t=out:st=" + (sec - 1) + ":d=2.5", "-ac", "2", "-b:a", "80k", path.join(outDir, id + ".mp3")]);
      rmSync(wav);
    } catch { /* ffmpeg が無ければ wav のまま */ }
  }
}
await browser.close();
console.log(bad ? `気になる曲が ${bad} 曲` : `${list.length} 曲とも基準内`);
