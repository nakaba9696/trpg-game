// A12：基本の立ち絵と魔物の絵を 25 枚ずつのスプライトにまとめる（tools/assets.mjs の artChunks・siteAssets、src/ui/v4_assets.js・v6_monsters.js の切り出し。docs/publish.md）
// - 数：dist/site/ が 150 ファイルくらい（多すぎれば失敗）。1 回の公開に収まらなければ files-N.json に分けてある
// - すべての人物の絵・魔物の絵の鍵が、スプライトのどこかの升目に当たり、その升目が画像の中にあり、升目にその絵の中身がそのまま入っている
// - ゲームの敵（使徒も）と人物で、絵のある者はすべてスプライトの升目で引ける（G.v6ArtKey・G.v4Where）
// - 描き方：同じスプライトは一度だけ読み、升目を切り出して描く（戦闘の魔物・人の姿の敵・会話の立ち絵・出来事の魔物）。読めなければ絵を出さない（A10）
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import vm from "node:vm";
import path from "node:path";
import { siteAssets, artChunks, ART_PACK, ART_COLS, scanAssets } from "../../tools/assets.mjs";
import { planSite, SITE_LIMITS } from "../../tools/site.mjs";

const webp = (w, h, fill) => {
  const b = Buffer.alloc(400, fill);
  b.write("RIFF", 0, "ascii"); b.writeUInt32LE(b.length - 8, 4); b.write("WEBP", 8, "ascii"); b.write("VP8 ", 12, "ascii");
  b.writeUInt32LE(b.length - 20, 16); b[20] = 0x10; b[23] = 0x9d; b[24] = 0x01; b[25] = 0x2a;
  b.writeUInt16LE(w, 26); b.writeUInt16LE(h, 28);
  return b;
};
const SOFT = 150, HARD = 200; // 目安（超えたら NOTE）と、ここまで（超えたら失敗。絵を足す余裕を残す）
const XYWH = /^(.+)#xywh=(\d+),(\d+),(\d+),(\d+)$/;

export default ({ G, fail, ok }) => {
  const root = new URL("../../", import.meta.url).pathname;
  const errs = [];
  const F = (m) => { errs.push(m); fail("A12 " + m); };

  // ---------------------------------------------------------------- まとめ方（作ったフォルダで）
  const dir = mkdtempSync(path.join(tmpdir(), "a12-"));
  try {
    mkdirSync(path.join(dir, "portraits")); mkdirSync(path.join(dir, "monsters"));
    const put = (n, b) => writeFileSync(path.join(dir, n), b);
    for (let i = 0; i < ART_PACK + 3; i++) put(`monsters/m${String(i).padStart(2, "0")}.webp`, webp(512, 512, i));
    put("monsters/odd.webp", webp(300, 300, 99)); // 大きさが違う → 1 枚のまま
    put("portraits/nora.webp", webp(512, 640, 1));
    put("portraits/sheila.webp", webp(512, 640, 2));
    put("portraits/sheila_joy.webp", webp(512, 640, 3)); // 差分 1 枚（表情のスプライトにならない）→ 基本の絵の組に入る
    put("portraits/kind_guard_m.webp", webp(512, 640, 4));
    put("portraits/kind_guard_f.webp", webp(512, 640, 5));
    const s = siteAssets(dir);
    const pubs = s.files.map((f) => f.pub).sort();
    const want = ["monsters/odd.webp", "monsters/packs/monsters-1.svg", "monsters/packs/monsters-2.svg", "portraits/packs/kinds-1.svg", "portraits/packs/people-1.svg"];
    if (pubs.join() !== want.join()) F(`まとめたあとのファイルが違う：${pubs.join("、")}`);
    const m1 = s.files.find((f) => f.pub === "monsters/packs/monsters-1.svg");
    if (!m1 || !new RegExp(`^<svg [^>]*width="${ART_COLS * 512}" height="${ART_COLS * 512}"`).test(m1.data.toString())) F(`魔物のスプライト（5×5）の大きさが違う：${m1 ? m1.data.toString().slice(0, 100) : "無い"}`);
    if (s.map["monsters/m06"] !== "monsters/packs/monsters-1.svg#xywh=512,512,512,512") F(`魔物の切り出す場所が違う：${s.map["monsters/m06"]}`);
    if (s.map["monsters/m25"] !== "monsters/packs/monsters-2.svg#xywh=0,0,512,512") F(`26 枚目が次のスプライトに入らない：${s.map["monsters/m25"]}`);
    if (s.map["monsters/odd"] !== "monsters/odd.webp" || !s.notes.some((n) => n.includes("monsters/odd"))) F("大きさの違う魔物をまとめた（か、知らせない）");
    if (s.map["portraits/sheila_joy"] !== "portraits/packs/people-1.svg#xywh=1024,0,512,640") F(`まとめ残りの差分が基本の絵の後ろに並ばない：${s.map["portraits/sheila_joy"]}`);
    if (!/^portraits\/packs\/kinds-1\.svg#/.test(s.map["portraits/kind_guard_m"] || "")) F("型の絵が型の組に入らない");
    const plain = siteAssets(dir, { packs: false });
    if (plain.map["portraits/nora"] !== "portraits/nora.webp" || plain.map["monsters/m00"] !== "monsters/m00.webp") F("packs: false で A8 までの形にならない");
  } finally { rmSync(dir, { recursive: true, force: true }); }

  // ---------------------------------------------------------------- 本物の assets/：すべての絵がスプライトの升目に当たる
  const assetsDir = path.join(root, "assets");
  const scan = scanAssets(assetsDir).files.filter((f) => /^(portraits|monsters)\/[^/]+$/.test(f.key));
  const real = siteAssets(assetsDir);
  const svgs = {};
  for (const f of real.files) if (f.data) svgs[f.pub] = f.data.toString();
  const dims = (svg) => { const m = /^<svg [^>]*width="(\d+)" height="(\d+)"/.exec(svg || ""); return m ? [Number(m[1]), Number(m[2])] : null; };
  let packed = 0;
  for (const f of scan) {
    const v = real.map[f.key];
    const m = XYWH.exec(v || "");
    if (!m) { F(`${f.key} がスプライトに入っていない：${v}`); continue; }
    const [, pub, x, y, w, h] = m;
    const svg = svgs[pub];
    const d = dims(svg);
    if (!d) { F(`${f.key} のスプライト ${pub} が無い`); continue; }
    if (!(+x >= 0 && +y >= 0 && +w > 0 && +h > 0 && +x + +w <= d[0] && +y + +h <= d[1])) F(`${f.key} の升目 ${x},${y},${w},${h} が ${pub}（${d.join("×")}）の外`);
    const b64 = readFileSync(f.abs).toString("base64");
    if (!svg.includes(`<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/${f.ext.slice(1)};base64,${b64}"/>`)) F(`${pub} の升目 ${x},${y} に ${f.key} の中身がそのまま入っていない`);
    packed++;
  }
  const artN = scan.filter((f) => /^(portraits|monsters)\/packs\//.test(real.map[f.key] || "")).length;
  const packs = real.files.filter((f) => /^(portraits|monsters)\/packs\//.test(f.pub));
  if (packs.some((f) => f.cells > ART_PACK)) F(`${ART_PACK} 枚より多いスプライトがある`);
  for (const c of artChunks(scan)) if (c.list.length > ART_PACK) F(`${c.name} が ${c.list.length} 枚`);

  // ---------------------------------------------------------------- 数（dist/site/）
  const fj = path.join(root, "dist/site/files.json");
  let count = real.files.length + 1;
  if (existsSync(fj)) count = Object.keys(JSON.parse(readFileSync(fj, "utf8"))).length + 1;
  if (count > HARD) F(`dist/site/ が ${count} ファイル（${HARD} まで。絵を足す余裕を残す）`);
  else if (count > SOFT) console.log(`NOTE A12：dist/site/ が ${count} ファイル（目安 ${SOFT}）`);
  const plan = planSite({ pageBytes: 10e6, files: real.files.map((f) => ({ pub: f.pub, local: "dist/site/" + f.pub, bytes: f.bytes })) });
  plan.errors.forEach((e) => F("Artifact に載らない：" + e));
  if (plan.batches.length > 1) for (let i = 1; i <= plan.batches.length; i++) if (existsSync(fj) && !existsSync(path.join(root, `dist/site/files-${i}.json`))) F(`分けて載せる一覧 files-${i}.json が無い`);

  // A12 より前の Artifact から消す一覧（gone-N.json）：まとめた絵の元の公開パスがちょうど一度ずつ、どれも 1 回 250 個まで
  if (existsSync(fj)) {
    const gone = [];
    for (let i = 1; existsSync(path.join(root, `dist/site/gone-${i}.json`)); i++) {
      const j = JSON.parse(readFileSync(path.join(root, `dist/site/gone-${i}.json`), "utf8"));
      if (Object.keys(j).length > SITE_LIMITS.batchFiles) F(`gone-${i}.json が ${Object.keys(j).length} 個（1 回 ${SITE_LIMITS.batchFiles} まで）`);
      if (Object.values(j).some((v) => v !== null)) F(`gone-${i}.json に null でない値がある`);
      gone.push(...Object.keys(j));
    }
    const inPacks = scan.filter((f) => /^(portraits|monsters)\/packs\//.test(real.map[f.key] || ""));
    if (gone.slice().sort().join() !== inPacks.map((f) => f.file).sort().join()) F(`gone-N.json が、まとめた絵の元の公開パス（${inPacks.length} 個）と合わない（${gone.length} 個）`);
    const live = new Set(Object.keys(JSON.parse(readFileSync(fj, "utf8"))));
    if (gone.some((p) => live.has(p))) F("gone-N.json に、今も載せるファイルが入っている");
  }

  // ---------------------------------------------------------------- 描き方（DOM の代わりを作って、画面の部品を読む）
  const loaded = [];
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.ls = {}; loaded.push(this); }
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    set src(v) { this._src = v; }
    get src() { return this._src; }
    fire(t = "load") {
      const d = /\.svg$/.test(this._src) ? (dims(svgs[this._src]) || [2560, 2560]) : [512, 640];
      if (t === "load") { this.complete = true; this.naturalWidth = d[0]; this.naturalHeight = d[1]; } else this.complete = true;
      (this.ls[t] || []).forEach((f) => f());
    }
  }
  const calls = [];
  const grad = { addColorStop() {} };
  const mkCtx = (cv) => new Proxy({ canvas: cv }, { get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? () => grad : k === "getImageData" ? () => { throw new Error("読めない"); } : (...a) => calls.push([k, a, t.canvas])), set: (t, k, val) => ((t[k] = val), true) });
  const canvas = () => { const cv = { width: 0, height: 0, classList: { remove() {}, add() {} }, getBoundingClientRect: () => ({ width: 256, height: 320 }) }; const c = mkCtx(cv); cv.getContext = () => c; return cv; };
  const document = { createElement: () => canvas() };
  const g = { data: G.data, MOODS: G.MOODS, ASSET_MODE: "files", ASSETS: real.map };
  for (const k of ["eventWho", "companionWho", "heroWho", "facWho"]) if (G[k]) g[k] = G[k];
  const vmc = vm.createContext({ console, G: g, Image: FakeImage, document, setTimeout: () => 0 });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v6_monsters.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });

  // 敵（使徒も）：絵のある者はすべてスプライトの升目で引ける
  const foes = Object.assign({}, (G.data.E3 && G.data.E3.FOES) || {}, G.data.ENEMIES);
  let foeArt = 0;
  for (const id of Object.keys(foes)) {
    const k = g.v6ArtKey(id);
    if (!k) { if (real.map["monsters/" + id]) F(`敵 ${id} の絵があるのに G.v6ArtKey が引かない`); continue; }
    const w = g.v6Where(k);
    if (!w || !w.rect || !svgs[w.src]) F(`敵 ${id} の絵（${k}）がスプライトの升目でない：${JSON.stringify(w)}`);
    else foeArt++;
  }
  // 人に化ける使徒で本性の絵（monsters/<id>）があるものは、戦いでは本性を引く（A15）
  for (const [e, p] of Object.entries(Object.assign({}, g.V6_PEOPLE, g.V6_APOSTLE))) if (real.map["portraits/" + p] && !real.map["monsters/" + e] && g.v6ArtKey(e) !== "portraits/" + p) F(`人の姿の敵 ${e} の絵（portraits/${p}）を G.v6ArtKey が引かない（スプライトの升目でも引く）`);
  // 人物：絵のある人はすべてスプライトの升目で引ける
  const ids = scan.filter((f) => f.key.startsWith("portraits/")).map((f) => f.key.slice(10));
  for (const id of ids) { const w = g.v4Where(id); if (!w || !w.rect || !svgs[w.src]) F(`人物 ${id} の絵がスプライトの升目で引けない：${JSON.stringify(w)}`); }

  // 戦闘の魔物：同じスプライトの魔物は一つの Image を読み、その升目だけを切り出す
  const inPack = Object.keys(real.map).filter((k) => k.startsWith("monsters/")).map((k) => [k, XYWH.exec(real.map[k])]).filter(([, m]) => m);
  const byPack = {};
  for (const [k, m] of inPack) (byPack[m[1]] = byPack[m[1]] || []).push([k.slice(9), m]);
  const [two] = Object.values(byPack).filter((l) => l.length >= 2);
  if (two) {
    const [[a, ma], [b]] = two;
    const battle = { battle: true };
    const ctx = mkCtx(battle);
    loaded.length = 0; calls.length = 0;
    g.paintMonster(ctx, 200, 300, 160, { id: a });
    g.paintMonster(ctx, 200, 300, 160, { id: b });
    const srcs = [...new Set(loaded.map((i) => i.src))];
    if (loaded.length !== 1 || srcs[0] !== ma[1]) F(`同じスプライトの魔物 2 体で、スプライトを一度だけ読まない：${srcs.join("、")}（${loaded.length} 個）`);
    if (calls.some(([k]) => k === "drawImage")) F("読み込み前に魔物を描いた（読み終わるまで何も描かない）");
    loaded.forEach((i) => i.fire());
    calls.length = 0;
    g.paintMonster(ctx, 200, 300, 160, { id: a });
    const cut = calls.find(([k, args]) => k === "drawImage" && args.length === 9);
    const [x, y, w, h] = ma.slice(2, 6).map(Number);
    if (!cut || cut[1][0].src !== ma[1] || cut[1].slice(1, 5).join() !== [x, y, w, h].join()) F(`魔物 ${a} をスプライトの升目（${x},${y},${w},${h}）から切り出していない：${cut ? cut[1].slice(1, 5).join() : "描かない"}`);
    const put = calls.find(([k, args, cv]) => k === "drawImage" && args.length === 5 && cv === battle);
    if (!put || put[1][0].width !== w || put[1][0].height !== h) F(`切り出した魔物 ${a} を戦闘に描いていない（${w}×${h} の絵のはず）`);
  } else F("同じスプライトに入った魔物が 2 体ない");

  // 会話の立ち絵（基本の絵）：スプライトの升目を切り出して描く。読めなければ絵を出さない
  const named = ids.find((id) => !id.startsWith("kind_") && /^portraits\/packs\/people-/.test(real.map["portraits/" + id]));
  if (named) {
    const m = XYWH.exec(real.map["portraits/" + named]);
    const [x, y, w, h] = m.slice(2, 6).map(Number);
    const cv = canvas();
    loaded.length = 0; calls.length = 0;
    g.drawPortrait(cv, { kind: "villager", seed: "c2:" + named, name: named });
    const img = loaded.find((i) => i.src === m[1]);
    if (!img) F(`立ち絵 ${named} でスプライト ${m[1]} を読みに行かない：${loaded.map((i) => i.src).join("、")}`);
    else {
      img.fire();
      const d = calls.find(([k, args]) => k === "drawImage" && args[0] === img);
      if (!d) F(`立ち絵 ${named} を描かない`);
      else {
        const [sx, sy, sw, sh] = d[1].slice(1, 5);
        if (!(sx >= x && sy >= y && sx + sw <= x + w + 0.01 && sy + sh <= y + h + 0.01)) F(`立ち絵 ${named} を升目（${x},${y},${w},${h}）の外から切り出した：${[sx, sy, sw, sh].map((n) => n.toFixed(1)).join()}`);
      }
    }
    // 読めないスプライト：絵を出さない（canvas の人物の絵に戻らない。A10）
    const other = ids.find((id) => !id.startsWith("kind_") && (XYWH.exec(real.map["portraits/" + id]) || [])[1] && XYWH.exec(real.map["portraits/" + id])[1] !== m[1]);
    if (other) {
      loaded.length = 0; calls.length = 0;
      const cv2 = canvas();
      g.drawPortrait(cv2, { kind: "villager", seed: "c2:" + other, name: other });
      loaded.forEach((i) => i.fire("error"));
      if (calls.some(([k]) => k === "drawImage")) F("読めないスプライトのとき、立ち絵を描いた（絵を出さないはず）");
    }
  } else F("名のある人の基本の絵がスプライトに入っていない");

  // 出来事・仲間の胸から上の魔物（who.kind "foe"）：切り出した魔物の絵を描く
  if (two) {
    const [[a, ma]] = two;
    const cv = canvas();
    calls.length = 0;
    g.drawPortrait(cv, { kind: "foe", foe: a });
    const d = calls.find(([k, args]) => k === "drawImage" && args[0] && args[0].width === Number(ma[4]));
    if (!d) F(`出来事の魔物 ${a} を、切り出した絵で描かない`);
  }

  if (!errs.length) ok(`A12 立ち絵と魔物のスプライト：${artN} 枚を ${packs.length} ファイル（${ART_PACK} 枚ずつ）に・表情の差分も含めた ${packed} 枚がすべて升目に当たる・dist/site/ ${count} ファイル（目安 ${SOFT}・上限 ${SITE_LIMITS.versionFiles}）・${plan.batches.length} 回で載る・絵のある敵 ${foeArt}・人物 ${ids.length} がすべて升目に当たる`);
};
