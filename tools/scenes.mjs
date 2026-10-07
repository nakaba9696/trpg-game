// docs/art/scenes.json（背景の絵の一覧。こちらが元。A11）から docs/art/scenes.md（読む用の表）を作る。
// node tools/scenes.mjs        … 場所の名前・地方・種類を場所のデータ（G.data.LOCS）から取り直して json に書き、md を書き直す
// tests/checks/a11_scenes.mjs が、md が json と合っているか・一覧がすべての場所と施設と迷宮の中を覆うかを見る
// 画像の名前（id）：場所は場所の id（karna など）。施設の中と迷宮の中は「in_」＋ 背景の絵の名前（末尾の _in は外す。in_inn・in_ruins）。
// ゲームが背景の絵の名前から画像を選ぶ決まりは src/ui/scene_v3_photo.js（同じ決まり）
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const JSON_PATH = path.join(here, "..", "docs", "art", "scenes.json");
export const MD_PATH = path.join(here, "..", "docs", "art", "scenes.md");
export const insideId = (key) => "in_" + String(key).replace(/_in$/, "");
// 施設 → 背景の絵の名前で、施設の名前と違うもの（src/ui/ui.js の FAC_SCENE。テストは ui.js から読む）
export const FAC_SCENE = { castle: "throne" };

const GROUPS = [
  ["place", "場所", "町・荒野・迷宮の外の景色（場所の id ごとに 1 枚）。屋外は昼・晴れで作り、時間帯・季節・天候はゲームが色味と雨・雪・霧の粒で重ねる。`sky` が night・red の場所は空が決まっている（朧島は夜、使徒領は赤い空）。"],
  ["facility", "施設の中", "町の施設（宿屋・酒場・商店・ギルド・教会・訓練場・裏路地・王城・学院と、町ごとの施設）。どの町でも同じ絵。"],
  ["dungeon", "迷宮の中", "迷宮に入ったあと（深さ 1 から）の絵。汎用の石の通路と洞窟、迷宮ごとの中。竜の墓場と黒鎧の使徒の居城は外と同じ絵を使う。"],
];
const cell = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");

// 場所の名前・地方・種類・背景の絵の名前をデータから取り直す（変わったものの id を返す）
export function refreshPlaces(data, LOCS) {
  const changed = [];
  for (const s of data.scenes) {
    if (s.kind !== "place") continue;
    const l = LOCS[s.id];
    if (!l) continue;
    for (const k of ["name", "region", "type", "scene"]) if (l[k] !== undefined && s[k] !== l[k]) { s[k] = l[k]; changed.push(s.id); }
  }
  return [...new Set(changed)];
}

// 覆っているか：すべての場所・施設・迷宮の中に絵があるか。足りない物の説明の配列を返す
// G：エンジン（G.data.LOCS）。facScene：施設 → 背景の絵の名前（ui.js の FAC_SCENE。無ければ施設の名前）。dungeonScene：G.dungeonScene（無ければ迷宮の中を見ない）
export function missingScenes(data, { LOCS, facScene = FAC_SCENE, dungeonScene = null, insideKeys = null }) {
  const ids = new Set(data.scenes.map((s) => s.id));
  const scenesOf = new Set(data.scenes.filter((s) => s.kind === "place").map((s) => s.scene));
  const miss = [];
  for (const [id, l] of Object.entries(LOCS)) {
    if (!ids.has(id)) miss.push(`場所 ${id}（${l.name}）`);
    // 町の外の景色を使う施設（W9 の特色の場所の一部）は、その景色の場所の絵でよい
    for (const f of l.fac || []) { const k = facScene[f] || f; if (!ids.has(insideId(k)) && !scenesOf.has(k)) miss.push(`施設 ${f}（${l.name}・絵 ${k}）→ ${insideId(k)}`); }
    if (dungeonScene && l.type === "dungeon") {
      const k = dungeonScene(l);
      if (!ids.has(insideId(k)) && !scenesOf.has(k)) miss.push(`迷宮の中 ${id}（${l.name}・絵 ${k}）→ ${insideId(k)}`);
    }
  }
  for (const k of insideKeys || []) if (!ids.has(insideId(k)) && !scenesOf.has(k)) miss.push(`室内の絵 ${k} → ${insideId(k)}`);
  return [...new Set(miss)];
}

export function renderScenesMd(data) {
  const out = [];
  const list = data.scenes;
  const sz = data.size || {};
  out.push("# 背景の絵の一覧（A11）", "");
  out.push("> このファイルは [scenes.json](scenes.json) から `node tools/scenes.mjs` で作る。直すときは json を直してから作り直す。");
  out.push(`> 作り方は [README.md](README.md) の「背景の絵（A11）」。設定は [style_scenes.json](style_scenes.json)。${sz.width || 1344}×${sz.height || 768} で作り、${(sz.save || {}).width || 1232}×${(sz.save || {}).height || 704} の webp に縮めて \`assets/scenes/<id>.webp\` に置く（1 枚 ${sz.maxKB || 150}KB 以下）。`, "");
  out.push(`全部で ${list.length} 枚（${GROUPS.map(([k, t]) => `${t} ${list.filter((s) => s.kind === k).length}`).join("・")}）。`, "");
  const trial = list.filter((s) => s.trial);
  out.push("## 試しの 5 枚", "", "まずこれだけを `node tools/gen_scenes.mjs --trial` で、設定の 2 案（絵師タグなし／立ち絵の絵師タグ）の両方で作り、持ち主が絵柄を見る。", "");
  out.push("| id | 名前 | 種類 |", "|---|---|---|");
  for (const s of trial) out.push(`| \`${s.id}\` | ${cell(s.name)} | ${GROUPS.find(([k]) => k === s.kind)[1]} |`);
  out.push("");
  for (const [k, title, note] of GROUPS) {
    const g = list.filter((s) => s.kind === k);
    if (!g.length) continue;
    out.push(`## ${title}（${g.length}）`, "", note, "");
    out.push("| id | 名前 | 絵 | まとめ | 特徴のタグ |", "|---|---|---|---|---|");
    for (const s of g) {
      const name = cell(s.name) + (k === "place" ? `（${cell(s.region)}・${s.type === "town" ? "町" : s.type === "dungeon" ? "迷宮" : "荒野"}）` : "") + (s.sky ? `・空 ${s.sky}` : "") + (s.trial ? "・**試し**" : "");
      out.push(`| \`${s.id}\` | ${name} | \`${s.scene}\` | ${s.pack} | ${cell(s.tags)} |`);
    }
    out.push("");
  }
  return out.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const { loadEngine } = await import("../tests/lib.mjs");
  const G = loadEngine();
  const changed = refreshPlaces(data, G.data.LOCS);
  // 町の特色の場所（W9）：専用の絵（D.W9_ART の w9s_*）があればそれ、無ければ借りる絵（D.FAC_SCENE）
  const miss = missingScenes(data, { LOCS: G.data.LOCS, facScene: { ...FAC_SCENE, ...(G.data.FAC_SCENE || {}), ...(G.data.W9_ART || {}) } });
  if (changed.length) { writeFileSync(JSON_PATH, JSON.stringify(data, null, 1) + "\n"); console.log(`場所のデータから取り直した：${changed.join("・")}`); }
  writeFileSync(MD_PATH, renderScenesMd(data) + "\n");
  console.log(`${path.relative(process.cwd(), MD_PATH)} を書き直した（${data.scenes.length} 枚）`);
  if (miss.length) console.log(`一覧に無い：${miss.join("、")}（scenes.json に足す）`);
}
