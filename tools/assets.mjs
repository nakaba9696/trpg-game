// 持ち主が作った画像（assets/ の webp・png・jpg）をゲームに渡す（tools/build.mjs が呼ぶ）。形は二つ：
//   ・外のファイル（既定。siteAssets）：画像は dist/site/ に別ファイルとして置き、HTML には一覧（鍵 → 相対パス・バイト数）だけを入れる。
//     claude.ai の Artifact に「ページ＋別ファイル」で載せる（docs/publish.md）。
//   ・埋め込み（予備。node tools/build.mjs --embed。collectAssets）：data URI にして 1 枚の HTML に入れる。上限（LIMIT）を超えるなら、
//     差分（<id>_joy など）を省いて基本の絵だけにする。
// どちらでもゲームからは G.ASSETS["portraits/<id>"]・G.ASSETS["monsters/<id>"]（V6）で引け、値はそのまま Image の src に使える。
// 鍵は assets/ からの道筋から拡張子を除いたもの（assets/portraits/dil.webp → "portraits/dil"）。同じ鍵が二つあれば webp を使う。
// 何を描くかの一覧は docs/art/portraits.md（人物）・docs/art/monsters.md（魔物）。レーン A（絵）の V4・V6 が管理
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

export const TYPES = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
export const LIMIT = 12 * 1024 * 1024; // 埋め込み（--embed）の合計（data URI の文字数）の上限。Artifact の 1 ページ 16MB に余裕を残す
export const FILE_SOFT = 80 * 1024; // 1枚の目安（超えても埋め込むが、知らせる）
const RANK = { ".webp": 0, ".png": 1, ".jpg": 2, ".jpeg": 2 };
export const MOODS = ["joy", "anger", "sorrow", "fun"]; // 喜怒哀楽の差分（V8）。src/engine/v8_moods.js と同じ
export const isVariant = (key) => new RegExp(`^portraits/.+_(${MOODS.join("|")})$`).test(key);

// assets/ を読んで、鍵ごとに使うファイルを決める：{ files: [{ key, abs, file（assets/ からの道筋）, ext, bytes }], notes }
export function scanAssets(dir) {
  const out = { files: [], notes: [] };
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
    const bytes = statSync(abs).size;
    out.files.push({ key, abs, file: path.relative(dir, abs).split(path.sep).join("/"), ext, bytes });
    if (bytes > FILE_SOFT) out.notes.push(`${key} が ${(bytes / 1024).toFixed(0)}KB（目安は 80KB 以下）`);
  }
  return out;
}

// 外のファイルの形：{ map: { 鍵: 公開パス（ページからの相対パス） }, bytes: { 鍵: バイト数 }, files: [{ key, abs, file, ext, bytes, pub }], total（バイト数の合計）, notes }
// 公開パスは assets/ からの道筋のまま（assets/portraits/dil.webp → portraits/dil.webp）
export function siteAssets(dir) {
  const s = scanAssets(dir);
  const out = { map: {}, bytes: {}, files: [], total: 0, notes: s.notes };
  for (const f of s.files) {
    const pub = f.file;
    out.map[f.key] = pub;
    out.bytes[f.key] = f.bytes;
    out.files.push(Object.assign({ pub }, f));
    out.total += f.bytes;
  }
  return out;
}

// 埋め込みの形：assets/ を読んで { map: { 鍵: data URI }, files: [{ key, file, bytes, size }], total（data URI の合計の文字数）, notes: [知らせ], dropped: [省いた鍵] } を返す
// shrink：上限を超えるなら差分（V8）を省いて作り直す（--embed の予備のため）。それでも超えるなら止まる
export function collectAssets(dir, { limit = LIMIT, shrink = false } = {}) {
  const s = scanAssets(dir);
  const make = (list) => {
    const out = { map: {}, files: [], total: 0, notes: s.notes.slice(), dropped: [] };
    for (const f of list) {
      const uri = `data:${TYPES[f.ext]};base64,${readFileSync(f.abs).toString("base64")}`;
      out.map[f.key] = uri;
      out.files.push({ key: f.key, file: f.file, bytes: f.bytes, size: uri.length });
      out.total += uri.length;
    }
    return out;
  };
  let out = make(s.files);
  if (out.total > limit && shrink) {
    const keep = s.files.filter((f) => !isVariant(f.key));
    const dropped = s.files.filter((f) => isVariant(f.key)).map((f) => f.key);
    const was = out.total;
    out = make(keep);
    out.dropped = dropped;
    out.notes.push(`埋め込みが ${(was / 1048576).toFixed(1)}MB で上限の ${(limit / 1048576).toFixed(0)}MB を超えるので、差分 ${dropped.length} 枚を省いた（${(out.total / 1048576).toFixed(1)}MB）`);
  }
  if (out.total > limit) {
    const big = out.files.slice().sort((a, b) => b.size - a.size).slice(0, 5).map((f) => `${f.file} ${(f.bytes / 1024).toFixed(0)}KB`).join("、");
    throw new Error(`埋め込む画像の合計が ${(out.total / 1048576).toFixed(1)}MB で、上限の ${(limit / 1048576).toFixed(0)}MB を超える（大きいもの：${big}）`);
  }
  return out;
}

// バンドルに入れる JS（画像が無ければ空）。外のファイルの形では、バイト数の一覧（G.ASSET_BYTES）と形の印（G.ASSET_MODE）も入れる
export function assetsScript(a) {
  if (!a.files.length) return "";
  const site = !!a.bytes;
  return `// ==== assets（tools/assets.mjs が assets/ から作る）\n(function (G) {\n  G.ASSET_MODE = ${JSON.stringify(site ? "files" : "embed")};\n  G.ASSETS = ${JSON.stringify(a.map)};\n${site ? `  G.ASSET_BYTES = ${JSON.stringify(a.bytes)};\n` : ""}})(globalThis.G = globalThis.G || {});\n`;
}
