// D5 #105：国名・都市名と呼び名を持ち主のスプレッドシートにそろえた（docs/lore/world.md 18.）
// - src に古い名前（聖王国リーヴェル・鉄血帝国ガルムント・ゼファラ・カルナ・ネルヴァ・サンクタ・魔人・異形）が残っていない
//   （古いセーブを移すための src/engine/d5_names.js だけは古い国名を持ってよい）
// - 場所・敵・アイテムの id は変わっていない（古いセーブ・出来事・テストが id を指している）
// - 表に出る名前が新しい名前になっている（国・町・目的・居城・眷属）
// - 古いセーブの国ごとの評判と騎士の位の国が、新しい国名へ移る
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
const OLD = /リーヴェル|ガルムント|ゼファラ|カルナ|ネルヴァ|サンクタ|聖王国|聖王都|鉄血帝国|魔人|異形/g;
const ALLOW = new Set(["engine/d5_names.js"]);

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

export default ({ fail, ok, loadEngine }) => {
  let failures = 0;
  const F = (m) => { failures++; fail(m); };

  // ---- 古い名前が残っていない
  for (const file of walk(SRC).filter((f) => /\.(js|json|html|css)$/.test(f))) {
    const rel = path.relative(SRC, file).split(path.sep).join("/");
    if (ALLOW.has(rel)) continue;
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      const m = line.match(OLD);
      if (m) F(`古い名前「${[...new Set(m)].join("・")}」が残っている：src/${rel}:${i + 1}`);
    });
  }

  const G = loadEngine();
  const D = G.data;

  // ---- id は変わっていない
  for (const id of ["leavel", "garmund", "zephara", "karna", "nerva", "w1_holy", "w1_catacomb", "majincastle", "w2_granbel", "w2_amyrein"]) if (!D.LOCS[id]) F(`場所の id ${id} が無い`);
  for (const id of ["graw", "kain", "rize", "kin", "e2_gormoa", "e2_mordu"]) if (!D.ENEMIES[id]) F(`敵の id ${id} が無い`);
  for (const id of ["apostleheart", "i1_majincoat", "i1_spoon", "volgrim", "byakuya"]) if (!D.ITEMS[id]) F(`アイテムの id ${id} が無い`);

  // ---- 表に出る名前
  const want = {
    leavel: "王都レオネスト", garmund: "帝都ノルディア", zephara: "首都エルメシア",
    karna: "自由都市ブランデール", nerva: "港町ヴァレンツァ", w1_holy: "聖都エルヴィナ", majincastle: "鏖殺の使徒の居城",
  };
  for (const [id, name] of Object.entries(want)) if (D.LOCS[id] && D.LOCS[id].name !== name) F(`${id} の名前が「${D.LOCS[id].name}」（${name} のはず）`);
  const regions = new Set(Object.values(D.LOCS).map((L) => L.region));
  for (const r of ["レオネスト王国", "ノルディア帝国", "エルメシア共和国"]) if (!regions.has(r)) F(`地方「${r}」が無い`);
  if (D.GOALS && D.GOALS.majin && D.GOALS.majin.name !== "使徒を討つ") F(`目的 majin の名前が「${D.GOALS.majin.name}」`);
  if (D.ENEMIES.kain && !/眷属/.test(D.ENEMIES.kain.name)) F(`カインが眷属と呼ばれていない（${D.ENEMIES.kain.name}）`);
  if (D.ENEMIES.graw && !/使徒/.test(D.ENEMIES.graw.name)) F(`グラウが使徒と呼ばれていない（${D.ENEMIES.graw.name}）`);
  if (!D.LORE || !D.LORE.shito || D.LORE.shito.title !== "眷属") F("用語説明 shito の題が「眷属」でない");
  if (!D.LORE || !D.LORE.majin || D.LORE.majin.title !== "使徒") F("用語説明 majin の題が「使徒」でない");

  // ---- 古いセーブの国名を移す
  if (typeof G.fixOldNames !== "function") F("G.fixOldNames が無い");
  else {
    const S = {
      titleAt: "聖王国リーヴェル",
      repute: {
        "鉄血帝国ガルムント": { rep: 5, inf: 31, wanted: true },
        "ゼファラ共和国": { rep: 3, inf: 2, wanted: false },
        "魔法国ゼファラ": { rep: 1, inf: 4, wanted: false },
        "自由都市連合": { rep: 7, inf: 0, wanted: false },
      },
    };
    G.fixOldNames(S);
    G.fixOldNames(S); // 二度呼んでも変わらない
    if (S.titleAt !== "レオネスト王国") F(`騎士の位の国が移らない（${S.titleAt}）`);
    const r = S.repute;
    if (!r["ノルディア帝国"] || r["ノルディア帝国"].inf !== 31 || !r["ノルディア帝国"].wanted) F("帝国の悪名と手配が移らない");
    if (!r["エルメシア共和国"] || r["エルメシア共和国"].rep !== 4 || r["エルメシア共和国"].inf !== 6) F(`共和国の二つの名の評判がまとまらない（${JSON.stringify(r["エルメシア共和国"])}）`);
    if (Object.keys(r).some((k) => G.OLD_NATION_NAMES[k])) F("古い国名の評判が残っている");
    if (!r["自由都市連合"] || r["自由都市連合"].rep !== 7) F("変わらない国の評判が消えた");
    if (G.fixOldNames(null) !== null) F("セーブが無いときに落ちる");
  }

  if (!failures) ok("D5 の名前（古い国名・町名・魔人・異形が src に無い・id はそのまま・古いセーブの国名を移す）");
};
