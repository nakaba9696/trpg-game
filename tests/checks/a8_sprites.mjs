// A8：表情の差分を 1 人 1 枚のスプライトにまとめる（tools/assets.mjs の siteAssets・moodSprite、src/ui/v4_assets.js の切り出し。docs/publish.md）
// - 差分の見分け方（V11 の表情の表も。faint_smile のような名前も）
// - まとめ方：差分が 2 枚以上の人だけ portraits/<id>.moods.svg に。基本の絵は 1 枚のまま。元の画像の中身をそのまま入れる。大きさが揃わなければまとめない
// - 描き方：スプライトを一度だけ読み、その人の升目だけを切り出して描く
// - 数：dist/site/files.json（＋ページ）が 1 つの版の上限 511 の 9 割を超えたら NOTE、超えたら失敗。仲間 50 人・表情 700 枚・背景の一覧の全部（A11）の見込みでも収まる
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import vm from "node:vm";
import path from "node:path";
import { siteAssets, variantOf, isVariant, imageSize, MOODS, sceneChunks } from "../../tools/assets.mjs";
import { planSite, SITE_LIMITS } from "../../tools/site.mjs";

// 縦横だけを持つ webp（VP8）の頭。中身は読まないので、それらしい頭と埋め草でよい
const webp = (w, h, fill) => {
  const b = Buffer.alloc(400, fill);
  b.write("RIFF", 0, "ascii"); b.writeUInt32LE(b.length - 8, 4); b.write("WEBP", 8, "ascii"); b.write("VP8 ", 12, "ascii");
  b.writeUInt32LE(b.length - 20, 16); b[20] = 0x10; b[21] = 0; b[22] = 0; b[23] = 0x9d; b[24] = 0x01; b[25] = 0x2a;
  b.writeUInt16LE(w, 26); b.writeUInt16LE(h, 28);
  return b;
};

export default ({ G, fail, ok }) => {
  const root = new URL("../../", import.meta.url).pathname;
  const errs = [];
  const F = (m) => { errs.push(m); fail("A8 " + m); };

  // ---------------------------------------------------------------- 見分け方
  const v = variantOf("portraits/dil_joy");
  if (!v || v.base !== "portraits/dil" || v.mood !== "joy") F(`差分を見分けられない：${JSON.stringify(v)}`);
  if (variantOf("portraits/dil") || variantOf("monsters/goblin_joy") || variantOf("portraits/hero_merc_f_old") || variantOf("portraits/kind_merc_m_elf")) F("差分でない鍵を差分とみなした");
  for (const m of G.MOODS || []) if (!MOODS.includes(m)) F(`ゲームの表情 ${m} を tools/assets.mjs が知らない（docs/art/moods.json に足す）`);
  if (MOODS.includes("faint_smile")) {
    const f = variantOf("portraits/sera_faint_smile");
    if (!f || f.base !== "portraits/sera" || f.mood !== "faint_smile") F(`「_」を含む表情を見分けられない：${JSON.stringify(f)}`);
  }
  if (!isVariant("portraits/a_sorrow")) F("isVariant が差分を見分けない");
  const sz = imageSize(webp(512, 640, 1));
  if (!sz || sz.w !== 512 || sz.h !== 640) F(`webp の大きさを読めない：${JSON.stringify(sz)}`);

  // ---------------------------------------------------------------- まとめ方（作ったフォルダで）
  const dir = mkdtempSync(path.join(tmpdir(), "a8-"));
  try {
    mkdirSync(path.join(dir, "portraits")); mkdirSync(path.join(dir, "monsters"));
    const put = (n, b) => writeFileSync(path.join(dir, n), b);
    put("portraits/nora.webp", webp(512, 640, 1));
    ["joy", "anger", "sorrow", "fun"].forEach((m, i) => put(`portraits/nora_${m}.webp`, webp(512, 640, 10 + i)));
    put("portraits/sheila.webp", webp(512, 640, 2));
    put("portraits/sheila_joy.webp", webp(512, 640, 3)); // 1 枚だけ → まとめない
    put("portraits/odd_joy.webp", webp(512, 640, 4));
    put("portraits/odd_anger.webp", webp(256, 320, 5)); // 大きさが違う → まとめない
    put("monsters/goblin.webp", webp(300, 300, 6));
    const s = siteAssets(dir, { packs: false }); // 基本の絵と魔物の絵のまとめ方（A12）は tests/checks/a12_sprites.mjs
    const sp = s.files.find((f) => f.pub === "portraits/nora.moods.svg");
    if (!sp || !sp.data) F("差分 4 枚の人のスプライトができない");
    else {
      const svg = sp.data.toString();
      if (!/^<svg [^>]*width="1024" height="1280"/.test(svg)) F(`スプライトの大きさが違う（2×2 のはず）：${svg.slice(0, 120)}`);
      ["joy", "anger", "sorrow", "fun"].forEach((m) => { if (!svg.includes(readFileSync(path.join(dir, `portraits/nora_${m}.webp`)).toString("base64"))) F(`スプライトに nora_${m} の中身がそのまま入っていない`); });
      if (sp.bytes !== sp.data.length) F("スプライトのバイト数が違う");
    }
    const want = { "portraits/nora_joy": "0,0", "portraits/nora_anger": "512,0", "portraits/nora_sorrow": "0,640", "portraits/nora_fun": "512,640" };
    for (const [k, xy] of Object.entries(want)) if (s.map[k] !== `portraits/nora.moods.svg#xywh=${xy},512,640`) F(`${k} の切り出す場所が違う：${s.map[k]}`);
    if (s.map["portraits/nora"] !== "portraits/nora.webp") F("基本の絵をスプライトに入れた（1 枚のまま）");
    if (s.map["portraits/sheila_joy"] !== "portraits/sheila_joy.webp") F("差分 1 枚の人までまとめた");
    if (s.map["portraits/odd_joy"] !== "portraits/odd_joy.webp" || !s.notes.some((n) => n.includes("portraits/odd"))) F("大きさの揃わない差分をまとめた（か、知らせない）");
    if (s.files.some((f) => /nora_(joy|anger|sorrow|fun)\.webp$/.test(f.pub))) F("まとめた差分を 1 枚ずつのファイルとしても載せる");
    if (s.files.length !== 7 || s.sprites !== 1 || s.merged !== 4) F(`まとめたあとのファイルの数が違う：${s.files.length} 枚・${s.sprites} 人・${s.merged} 枚`);
    const plain = siteAssets(dir, { sprites: false });
    if (plain.files.length !== 10 || plain.map["portraits/nora_joy"] !== "portraits/nora_joy.webp") F("sprites: false で今まで通りにならない");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------- 描き方：スプライトを一度だけ読み、升目を切り出す
  const loaded = [];
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.ls = {}; loaded.push(this); }
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    set src(v) { this._src = v; }
    get src() { return this._src; }
    fire() { const sp = /\.svg$/.test(this._src); this.complete = true; this.naturalWidth = sp ? 1024 : 512; this.naturalHeight = sp ? 1280 : 640; (this.ls.load || []).forEach((f) => f()); }
  }
  const calls = [];
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? () => grad : (...a) => calls.push([k, a])), set: (t, k, val) => ((t[k] = val), true) });
  const sprite = "portraits/kind_priest_f.moods.svg";
  const g = { data: G.data, MOODS: G.MOODS, ASSET_MODE: "files", ASSETS: { "portraits/kind_priest_f": "portraits/kind_priest_f.webp", "portraits/kind_priest_f_joy": sprite + "#xywh=0,0,512,640", "portraits/kind_priest_f_anger": sprite + "#xywh=512,0,512,640", "portraits/kind_priest_f_fun": sprite + "#xywh=512,640,512,640" } };
  for (const k of ["eventWho", "companionWho", "heroWho", "facWho"]) if (G[k]) g[k] = G[k];
  const vmc = vm.createContext({ console, G: g, Image: FakeImage, setTimeout: () => {} });
  for (const f of ["art_people.js", "r1_race.js", "v4_assets.js", "v8_moods.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  const who = { kind: "priest", sex: "女", age: 30, seed: "a8:test" };
  g.v4Preload(who);
  const srcs = loaded.map((i) => i.src).sort().join();
  if (srcs !== [`portraits/kind_priest_f.webp`, sprite].sort().join()) F(`先読みが違う（基本の絵とスプライトを一度ずつ）：${srcs}`);
  if (g.v4Image("kind_priest_f_joy") !== g.v4Image("kind_priest_f_anger")) F("同じ人の差分で、スプライトを別々に読む");
  const w = g.v4Where("kind_priest_f_fun");
  if (!w || w.src !== sprite || w.rect.join() !== "512,640,512,640") F(`切り出す場所を読めない：${JSON.stringify(w)}`);
  if (g.v4Where("kind_priest_f").rect !== null) F("1 枚の絵に切り出す場所が付いている");
  loaded.forEach((i) => i.fire());
  const face = () => ({ width: 256, height: 320, getBoundingClientRect: () => ({ width: 256, height: 320 }), getContext: () => ctx });
  const drawn = (mood) => {
    calls.length = 0;
    g.drawPortrait(face(), Object.assign({}, who, { mood }));
    const d = calls.find(([k]) => k === "drawImage");
    return d ? { src: d[1][0].src, sx: d[1][1], sy: d[1][2], sw: d[1][3], sh: d[1][4] } : null;
  };
  const fun = drawn("fun");
  if (!fun || fun.src !== sprite || fun.sx !== 512 || fun.sy !== 640 || fun.sw !== 512 || fun.sh !== 640) F(`差分（楽）をスプライトの升目から切り出していない：${JSON.stringify(fun)}`);
  const anger = drawn("anger");
  if (!anger || anger.sx !== 512 || anger.sy !== 0) F(`差分（怒）の升目が違う：${JSON.stringify(anger)}`);
  const base = drawn(undefined);
  if (!base || base.src !== "portraits/kind_priest_f.webp" || base.sx !== 0 || base.sw !== 512) F(`基本の絵の描き方が変わった：${JSON.stringify(base)}`);
  const sorrow = drawn("sorrow"); // 差分が無い表情 → 基本の絵
  if (!sorrow || sorrow.src !== "portraits/kind_priest_f.webp") F(`差分の無い表情で基本の絵に戻らない：${JSON.stringify(sorrow)}`);

  // ---------------------------------------------------------------- 数（1 つの版は 511 ファイルまで）
  const limit = SITE_LIMITS.versionFiles;
  const fj = path.join(root, "dist/site/files.json");
  let now = "";
  if (existsSync(fj)) {
    const n = Object.keys(JSON.parse(readFileSync(fj, "utf8"))).length + 1; // ＋ページ（index.html）
    if (n > limit) F(`dist/site/ が ${n} ファイルで、1 つの版の上限 ${limit} を超える`);
    else if (n > limit * 0.9) console.log(`NOTE A8：dist/site/ が ${n} ファイル（1 つの版の上限 ${limit} の 9 割を超えた）`);
    now = `今 ${n} ファイル・`;
  }
  // 見込み：基本の立ち絵 250 枚（名のある人・型。主人公の絵は A10 で外し、名もない人の二枚目の型 kind_*_b に回した）、表情のある人 60 人で差分 700 枚、魔物 120 枚、背景（A11）を一覧の全部（組ごとのスプライト）
  const scenes = sceneChunks(JSON.parse(readFileSync(path.join(root, "docs/art/scenes.json"), "utf8")).scenes.map((x) => ({ key: "scenes/" + x.id })));
  const est = (sprites) => {
    const files = [];
    for (let i = 0; i < 250; i++) files.push({ pub: `portraits/p${i}.webp`, local: "", bytes: 40000 });
    if (sprites) for (let i = 0; i < 60; i++) files.push({ pub: `portraits/p${i}.moods.svg`, local: "", bytes: Math.round((700 / 60) * 40000 * 1.34) });
    else for (let i = 0; i < 700; i++) files.push({ pub: `portraits/v${i}.webp`, local: "", bytes: 40000 });
    for (let i = 0; i < 120; i++) files.push({ pub: `monsters/m${i}.webp`, local: "", bytes: 40000 });
    if (sprites) scenes.forEach((c) => files.push({ pub: `scenes/${c.name}.svg`, local: "", bytes: Math.round(c.list.length * 150000 * 1.34) }));
    else scenes.forEach((c) => c.list.forEach((x) => files.push({ pub: x.key + ".webp", local: "", bytes: 150000 })));
    return planSite({ pageBytes: 4e6, files });
  };
  const withS = est(true), without = est(false);
  if (withS.errors.length || withS.count > limit * 0.9) F(`見込み（差分 700 枚・背景 ${scenes.length} 組）でもスプライトにまとめれば収まるはずが、${withS.count} ファイル：${withS.errors.join("／")}`);
  if (!without.errors.length) F("見込み（差分 700 枚）をまとめないと上限を超えるはず");
  if (!errs.length) ok(`A8 差分のスプライト：${now}見込み（基本 250・差分 700 枚を 60 人・魔物 120・背景 ${scenes.reduce((n, c) => n + c.list.length, 0)} 枚を ${scenes.length} 組）でまとめて ${withS.count} ファイル（まとめないと ${without.count}）・上限 ${limit}`);
};
