// 持ち主が作った画像（assets/ の webp・png・jpg）を data URI にして、HTML に埋め込む（tools/build.mjs が呼ぶ）。
// Artifact は外から読み込めないので、画像は HTML の中に入れる。ゲームからは G.ASSETS["portraits/<id>"]・G.ASSETS["monsters/<id>"]（V6）で引く。
// 鍵は assets/ からの道筋から拡張子を除いたもの（assets/portraits/dil.webp → "portraits/dil"）。同じ鍵が二つあれば webp を使う。
// 何を描くかの一覧は docs/art/portraits.md（人物）・docs/art/monsters.md（魔物）。上限（LIMIT）は assets/ の下を全部合わせて数える。レーン A（絵）の V4・V6 が管理
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

export const TYPES = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
export const LIMIT = 12 * 1024 * 1024; // 埋め込みの合計（data URI の文字数）の上限。Artifact の 16MB に余裕を残す
export const FILE_SOFT = 80 * 1024; // 1枚の目安（超えても埋め込むが、知らせる）
const RANK = { ".webp": 0, ".png": 1, ".jpg": 2, ".jpeg": 2 };

// assets/ を読んで { map: { 鍵: data URI }, files: [{ key, file, bytes, size }], total（data URI の合計の文字数）, notes: [知らせ] } を返す
export function collectAssets(dir, { limit = LIMIT } = {}) {
  const out = { map: {}, files: [], total: 0, notes: [] };
  if (!existsSync(dir)) return out;
  const found = {};
  const walk = (d) => {
    for (const n of readdirSync(d).sort()) {
      const abs = path.join(d, n);
      if (statSync(abs).isDirectory()) { walk(abs); continue; }
      const ext = path.extname(n).toLowerCase();
      if (!TYPES[ext]) continue;
      const key = path.relative(dir, abs).split(path.sep).join("/").slice(0, -ext.length);
      const prev = found[key];
      if (prev) {
        out.notes.push(`${key} が二つある（${path.basename(prev.abs)}・${n}）。${RANK[ext] < RANK[prev.ext] ? n : path.basename(prev.abs)} を使う`);
        if (RANK[ext] >= RANK[prev.ext]) continue;
      }
      found[key] = { abs, ext };
    }
  };
  walk(dir);
  for (const key of Object.keys(found).sort()) {
    const { abs, ext } = found[key];
    const buf = readFileSync(abs);
    const uri = `data:${TYPES[ext]};base64,${buf.toString("base64")}`;
    out.map[key] = uri;
    out.files.push({ key, file: path.relative(dir, abs), bytes: buf.length, size: uri.length });
    out.total += uri.length;
    if (buf.length > FILE_SOFT) out.notes.push(`${key} が ${(buf.length / 1024).toFixed(0)}KB（目安は 80KB 以下）`);
  }
  if (out.total > limit) {
    const big = out.files.slice().sort((a, b) => b.size - a.size).slice(0, 5).map((f) => `${f.file} ${(f.bytes / 1024).toFixed(0)}KB`).join("、");
    throw new Error(`埋め込む画像の合計が ${(out.total / 1048576).toFixed(1)}MB で、上限の ${(limit / 1048576).toFixed(0)}MB を超える（大きいもの：${big}）`);
  }
  return out;
}

// バンドルに入れる JS（画像が無ければ空）
export function assetsScript(a) {
  if (!a.files.length) return "";
  return `// ==== assets（tools/assets.mjs が assets/ から作る）\n(globalThis.G = globalThis.G || {}).ASSETS = ${JSON.stringify(a.map)};\n`;
}
