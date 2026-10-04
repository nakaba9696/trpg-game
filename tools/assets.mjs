// 持ち主が作った画像（assets/ の webp・png・jpg）をゲームに渡す（tools/build.mjs が呼ぶ）。形は二つ：
//   ・外のファイル（既定。siteAssets）：画像は dist/site/ に別ファイルとして置き、HTML には一覧（鍵 → 相対パス・バイト数）だけを入れる。
//     claude.ai の Artifact に「ページ＋別ファイル」で載せる（docs/publish.md）。
//   ・埋め込み（予備。node tools/build.mjs --embed。collectAssets）：data URI にして 1 枚の HTML に入れる。上限（LIMIT）を超えるなら、
//     差分（<id>_joy など）を省いて基本の絵だけにする。
// どちらでもゲームからは G.ASSETS["portraits/<id>"]・G.ASSETS["monsters/<id>"]（V6）で引け、値はそのまま Image の src に使える。
// ただし外のファイルの形では、差分（<id>_<表情>）は 1 人 1 枚のスプライト（portraits/<id>.moods.svg）にまとめ、値は「公開パス#xywh=x,y,w,h」（切り出す場所）になる。
// 基本の立ち絵・魔物の絵（A12）も 25 枚ずつのスプライト（portraits/packs/*.svg・monsters/packs/*.svg）にまとめ、値は同じく「公開パス#xywh=…」。
// 鍵は assets/ からの道筋から拡張子を除いたもの（assets/portraits/dil.webp → "portraits/dil"）。同じ鍵が二つあれば webp を使う。
// 背景の絵（A11。assets/scenes/<id>.webp）は、外のファイルの形では組ごとのスプライト（scenes/<組>.svg）にまとめ、値は同じく「公開パス#xywh=…」。
// 何を描くかの一覧は docs/art/portraits.md（人物）・docs/art/monsters.md（魔物）・docs/art/scenes.md（背景）。レーン A（絵）の V4・V6・A11 が管理
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

export const TYPES = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
// S3：録音した効果音（assets/sounds/<名前>.ogg・<名前>_<何か>.ogg。webm・mp3 も可）。画像と同じく別ファイルで載せ、鍵は "sounds/<名前>_<何か>"。
// 鳴らすのは src/ui/sound.js（あればそれを選んで鳴らし、無い・読めないときは合成）。assets/sounds/ の外の音のファイルは拾わない
// S4：曲のファイル（assets/music/<場面>.ogg・<曲の id>.ogg）も同じく別ファイルで載せ、鍵は "music/<場面>"。鳴らすのは src/ui/sound_bgm.js（無ければ合成の曲）
export const SOUND_TYPES = { ".ogg": "audio/ogg", ".webm": "audio/webm", ".mp3": "audio/mpeg" };
Object.assign(TYPES, SOUND_TYPES);
export const LIMIT = 12 * 1024 * 1024; // 埋め込み（--embed）の合計（data URI の文字数）の上限。Artifact の 1 ページ 16MB に余裕を残す
export const FILE_SOFT = 80 * 1024; // 1枚の目安（超えても埋め込むが、知らせる）
const RANK = { ".webp": 0, ".png": 1, ".jpg": 2, ".jpeg": 2, ".mp3": 0, ".ogg": 1, ".webm": 2 }; // 音は同じ名前なら mp3（どのブラウザでも読める）
// 表情の差分（V8 の喜怒哀楽。src/engine/v8_moods.js と同じ）。V11 の表情の表（docs/art/moods.json）があれば、その表情も足す
export const MOODS = ["joy", "anger", "sorrow", "fun"];
try {
  const j = JSON.parse(readFileSync(new URL("../docs/art/moods.json", import.meta.url), "utf8"));
  for (const m of Object.keys(j.moods || {})) if (/^[a-z_]+$/.test(m) && !MOODS.includes(m)) MOODS.push(m);
} catch { /* 表が無ければ喜怒哀楽だけ */ }
// 差分の鍵（portraits/<id>_<表情>）を { base: "portraits/<id>", mood } に分ける。差分でなければ null。長い表情の名前から当てる（faint_smile など）
export function variantOf(key) {
  if (!key.startsWith("portraits/")) return null;
  for (const m of MOODS.slice().sort((a, b) => b.length - a.length)) if (key.endsWith("_" + m) && key.length > 10 + m.length + 1) return { base: key.slice(0, -m.length - 1), mood: m };
  return null;
}
export const isVariant = (key) => !!variantOf(key);

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
      if (!!SOUND_TYPES[ext] !== (key.startsWith("sounds/") || key.startsWith("music/"))) { out.notes.push(`${key}${ext} は置き場所と種類が合わないので使わない（音は assets/sounds/・assets/music/ に ogg・webm・mp3 で）`); continue; }
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
    if (bytes > FILE_SOFT && !SOUND_TYPES[ext]) out.notes.push(`${key} が ${(bytes / 1024).toFixed(0)}KB（目安は 80KB 以下）`);
  }
  return out;
}

// 画像の縦横（webp・png。読めなければ null）。差分をまとめるとき、升目の大きさに使う
export function imageSize(buf) {
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const t = buf.toString("ascii", 12, 16);
    if (t === "VP8X") return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (t === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (t === "VP8L") { const v = buf.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  }
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  return null;
}

// 一人の差分をまとめた 1 枚の絵（スプライト）。中身は SVG で、元の webp・png を data URI のまま升目に並べる（描き直さないので画質は変わらない。
// Node だけで作れる）。cells：[{ key, ext, buf, w, h }]（同じ大きさ）→ { svg（Buffer）, rects: { 鍵: [x, y, w, h] } }
// 升目は正方形に近い格子（例：4 枚なら 2×2、22 枚なら 5×5）か、cols を渡せばその列の数（背景は 2 列）。並びは渡した順
export function moodSprite(cells, cols) {
  const { w, h } = cells[0];
  cols = Math.min(cells.length, cols || Math.ceil(Math.sqrt(cells.length)));
  const rows = Math.ceil(cells.length / cols);
  const rects = {};
  const body = cells.map((c, i) => {
    const x = (i % cols) * w, y = Math.floor(i / cols) * h;
    rects[c.key] = [x, y, w, h];
    return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:${TYPES[c.ext]};base64,${c.buf.toString("base64")}"/>`;
  }).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * w}" height="${rows * h}" viewBox="0 0 ${cols * w} ${rows * h}">\n${body}\n</svg>\n`;
  return { svg: Buffer.from(svg), rects };
}
export const SPRITE_MIN = 2; // 差分がこの枚数以上ある人だけまとめる（1 枚ならまとめても数は減らない）

// 背景の絵（A11。assets/scenes/<id>.webp）も、docs/art/scenes.json の pack（組）ごとに SCENE_PACK 枚までずつ 1 つのスプライト（scenes/<組>[-<番号>].svg）にまとめる。
// 1 枚 1232×704 なので 2 列（8 枚で 2464×2816。表情のスプライトの 5×5 と同じくらいの画素）。一覧に無い背景は組「misc」
export const SCENE_PACK = 8;
export const SCENE_COLS = 2;
export function scenePacks() {
  try {
    const j = JSON.parse(readFileSync(new URL("../docs/art/scenes.json", import.meta.url), "utf8"));
    return Object.fromEntries((j.scenes || []).map((s) => [s.id, s.pack || "misc"]));
  } catch { return {}; }
}
// 組ごとに SCENE_PACK 枚ずつに分ける：[{ name（公開パスの名前）, list }]。並びは組の名前 → 一覧（scenes.json）の順
export function sceneChunks(files, packs = scenePacks(), size = SCENE_PACK) {
  const order = Object.keys(packs);
  const by = {};
  for (const f of files) { const id = f.key.slice("scenes/".length), p = packs[id] || "misc"; (by[p] = by[p] || []).push(Object.assign({ id }, f)); }
  const out = [];
  for (const p of Object.keys(by).sort()) {
    const list = by[p].sort((a, b) => ((order.indexOf(a.id) + 1 || 1e9) - (order.indexOf(b.id) + 1 || 1e9)) || (a.id < b.id ? -1 : 1));
    const n = Math.ceil(list.length / size);
    for (let i = 0; i < n; i++) out.push({ name: n > 1 ? `${p}-${i + 1}` : p, list: list.slice(i * size, (i + 1) * size) });
  }
  return out;
}

// 基本の立ち絵（portraits/<id>）と魔物の絵（monsters/<id>）も、ART_PACK 枚までずつスプライトにまとめる（A12。1 つの版は 511 ファイルまでのため）。
// 升目は 5 列（512×640 が 25 枚で 2560×3200、512×512 が 25 枚で 2560×2560。表情のスプライトの 5×5 と同じくらい）。
// 公開パスは portraits/packs/people-<n>.svg（名のある人。docs/art/portraits.json の順＝同じ組の人が近く）・portraits/packs/kinds-<n>.svg（型 kind_*。名前順＝同じ種類が近く）・
// monsters/packs/monsters-<n>.svg（docs/art/monsters.json の順）。packs/ の下なので、人の id（<id>.moods.svg など）とぶつからない
export const ART_PACK = 25;
export const ART_COLS = 5;
export function artOrder() {
  const ids = (u, k) => { try { return (JSON.parse(readFileSync(new URL(u, import.meta.url), "utf8"))[k] || []).map((x) => x.id); } catch { return []; } };
  return { portraits: ids("../docs/art/portraits.json", "portraits"), monsters: ids("../docs/art/monsters.json", "monsters") };
}
// files：[{ key }]（portraits/<id>・monsters/<id>）→ [{ name（公開パス）, list }]。表情の差分（まとめ残り）は、その人の基本の絵のすぐ後ろに並べる
export function artChunks(files, order = artOrder(), size = ART_PACK) {
  const by = {};
  for (const f of files) {
    const [dir, id] = f.key.split("/");
    const v = variantOf(f.key);
    const base = v ? v.base.slice(dir.length + 1) : id;
    const group = dir === "monsters" ? "monsters/packs/monsters" : base.startsWith("kind_") ? "portraits/packs/kinds" : "portraits/packs/people";
    const idx = group === "portraits/packs/kinds" ? -1 : (order[dir] || []).indexOf(base);
    (by[group] = by[group] || []).push(Object.assign({ sort: [idx < 0 ? 1e9 : idx, base, v ? 1 : 0, id] }, f));
  }
  const cmp = (a, b) => { for (let i = 0; i < a.sort.length; i++) if (a.sort[i] !== b.sort[i]) return a.sort[i] < b.sort[i] ? -1 : 1; return 0; };
  const out = [];
  for (const g of Object.keys(by).sort()) {
    const list = by[g].sort(cmp);
    for (let i = 0; i * size < list.length; i++) out.push({ name: `${g}-${i + 1}.svg`, list: list.slice(i * size, (i + 1) * size) });
  }
  return out;
}

// 外のファイルの形：{ map: { 鍵: 公開パス（ページからの相対パス） }, bytes: { 鍵: バイト数 }, files: [{ key, abs, file, ext, bytes, pub, data? }], total（バイト数の合計）, notes, sprites（まとめた人の数）, merged（まとめた差分の枚数） }
// 公開パスは assets/ からの道筋のまま（assets/portraits/dil.webp → portraits/dil.webp）。
// 差分（<id>_<表情>）が SPRITE_MIN 枚以上ある人は、差分を 1 人 1 枚（portraits/<id>.moods.svg。data に中身）にまとめる（Artifact の 1 つの版は 511 ファイルまでのため）。
// そのときの差分の鍵の値は「スプライトの公開パス#xywh=x,y,w,h」（src/ui/v4_assets.js が切り出して描く）。
// 基本の立ち絵と魔物の絵も ART_PACK 枚までずつまとめる（A12。下の artChunks）。gone：まとめたので 1 枚ずつは載せなくなった公開パス（A12 より前の Artifact から消す。docs/publish.md）。
// sprites: false ならまとめない（今まで通り 1 枚 1 ファイル）。packs: false なら基本の立ち絵と魔物の絵だけまとめない（A8 までの形）
export function siteAssets(dir, { sprites = true, packs = true } = {}) {
  const s = scanAssets(dir);
  const out = { map: {}, bytes: {}, files: [], total: 0, notes: s.notes, sprites: 0, merged: 0, gone: [] };
  const groups = {};
  if (sprites) for (const f of s.files) {
    const v = variantOf(f.key);
    if (v && (f.ext === ".webp" || f.ext === ".png")) (groups[v.base] = groups[v.base] || []).push(Object.assign({ mood: v.mood }, f));
  }
  const inSprite = new Set();
  for (const [base, list] of Object.entries(groups)) {
    if (list.length < SPRITE_MIN) continue;
    list.sort((a, b) => MOODS.indexOf(a.mood) - MOODS.indexOf(b.mood));
    const cells = list.map((f) => { const buf = readFileSync(f.abs); return Object.assign({ buf }, f, imageSize(buf) || {}); });
    const { w, h } = cells[0];
    if (!w || cells.some((c) => c.w !== w || c.h !== h)) { out.notes.push(`${base} の差分は大きさが揃っていないので、まとめずに 1 枚ずつ載せる`); continue; }
    const sp = moodSprite(cells);
    const file = base.slice("portraits/".length);
    const pub = `portraits/${file}.moods.svg`;
    for (const c of cells) { out.map[c.key] = `${pub}#xywh=${sp.rects[c.key].join(",")}`; inSprite.add(c.key); }
    out.bytes[base + ".moods"] = sp.svg.length;
    out.files.push({ key: base + ".moods", abs: null, data: sp.svg, file: pub, ext: ".svg", bytes: sp.svg.length, pub, cells: cells.length });
    out.total += sp.svg.length;
    out.sprites++;
    out.merged += cells.length;
  }
  // 背景の絵（A11）：組ごとにまとめる。1 枚だけの組はそのまま
  const scenes = sprites ? s.files.filter((f) => /^scenes\/[^/]+$/.test(f.key) && (f.ext === ".webp" || f.ext === ".png")) : [];
  for (const { name, list } of sceneChunks(scenes)) {
    if (list.length < SPRITE_MIN) continue;
    const cells = list.map((f) => { const buf = readFileSync(f.abs); return Object.assign({ buf }, f, imageSize(buf) || {}); });
    const { w, h } = cells[0];
    if (!w || cells.some((c) => c.w !== w || c.h !== h)) { out.notes.push(`背景の組 ${name} は大きさが揃っていないので、まとめずに 1 枚ずつ載せる`); continue; }
    const sp = moodSprite(cells, SCENE_COLS);
    const pub = `scenes/${name}.svg`;
    for (const c of cells) { out.map[c.key] = `${pub}#xywh=${sp.rects[c.key].join(",")}`; inSprite.add(c.key); }
    out.bytes["scenes/" + name + ".pack"] = sp.svg.length;
    out.files.push({ key: "scenes/" + name + ".pack", abs: null, data: sp.svg, file: pub, ext: ".svg", bytes: sp.svg.length, pub, cells: cells.length });
    out.total += sp.svg.length;
    out.scenePacks = (out.scenePacks || 0) + 1;
    out.sceneMerged = (out.sceneMerged || 0) + cells.length;
  }
  // 基本の立ち絵・魔物の絵（A12）：ART_PACK 枚までずつまとめる。大きさがほかと違う絵（いちばん多い大きさと違う）は 1 枚のまま
  const arts = (sprites && packs) ? s.files.filter((f) => /^(portraits|monsters)\/[^/]+$/.test(f.key) && !inSprite.has(f.key) && (f.ext === ".webp" || f.ext === ".png")) : [];
  const read = arts.map((f) => { const buf = readFileSync(f.abs); return Object.assign({ buf }, f, imageSize(buf) || {}); });
  const common = {};
  for (const dir of ["portraits", "monsters"]) {
    const n = {};
    for (const c of read) if (c.key.startsWith(dir + "/") && c.w) n[c.w + "x" + c.h] = (n[c.w + "x" + c.h] || 0) + 1;
    common[dir] = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
  }
  const fits = read.filter((c) => c.w && common[c.key.split("/")[0]] === c.w + "x" + c.h);
  if (fits.length < read.length) out.notes.push(`大きさがほかと違う絵（${read.filter((c) => !fits.includes(c)).map((c) => c.key).join("、")}）は、まとめずに 1 枚ずつ載せる`);
  for (const { name, list } of artChunks(fits)) {
    if (list.length < SPRITE_MIN) continue;
    const sp = moodSprite(list, ART_COLS);
    for (const c of list) { out.map[c.key] = `${name}#xywh=${sp.rects[c.key].join(",")}`; inSprite.add(c.key); out.gone.push(c.file); }
    const key = name.replace(/\.svg$/, ".pack");
    out.bytes[key] = sp.svg.length;
    out.files.push({ key, abs: null, data: sp.svg, file: name, ext: ".svg", bytes: sp.svg.length, pub: name, cells: list.length });
    out.total += sp.svg.length;
    out.artPacks = (out.artPacks || 0) + 1;
    out.artMerged = (out.artMerged || 0) + list.length;
  }
  for (const f of s.files) {
    if (inSprite.has(f.key)) continue;
    const pub = f.file;
    out.map[f.key] = pub;
    out.bytes[f.key] = f.bytes;
    out.files.push(Object.assign({ pub }, f));
    out.total += f.bytes;
  }
  out.files.sort((a, b) => (a.pub < b.pub ? -1 : a.pub > b.pub ? 1 : 0));
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
  // 省く順：曲のファイル（S4。省いた場面は合成の曲になる） → 表情の差分 → 背景の絵（A11。省いた背景は canvas の絵になる）
  for (const [what, drop] of [["曲", (k) => k.startsWith("music/")], ["差分", isVariant], ["背景", (k) => k.startsWith("scenes/")]]) {
    if (!(out.total > limit && shrink)) break;
    const gone = new Set(out.dropped);
    const keep = s.files.filter((f) => !gone.has(f.key) && !drop(f.key));
    const dropped = s.files.filter((f) => !gone.has(f.key) && drop(f.key)).map((f) => f.key);
    if (!dropped.length) continue;
    const was = out.total;
    const notes = out.notes;
    out = make(keep);
    out.dropped = [...gone, ...dropped];
    out.notes = notes;
    out.notes.push(`埋め込みが ${(was / 1048576).toFixed(1)}MB で上限の ${(limit / 1048576).toFixed(0)}MB を超えるので、${what} ${dropped.length} 枚を省いた（${(out.total / 1048576).toFixed(1)}MB）`);
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
