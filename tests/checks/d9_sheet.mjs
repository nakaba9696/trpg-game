// D9 #143：シートとの食い違いの残り（docs/lore/sheet_audit.md）
// - 「内側の十三」の旧名・十三という括りが、src の文（コメントの行を除く）に残っていない
// - 会える使徒（D.MAJIN）の id はそのままで、一体ずつシートの使徒リストの名前と番号に重なっている
// - 帝国の皇帝の病・崩御・皇子の文が無い（皇帝グレイオルは健在、子は皇女だけ）
// - 古いセーブの皇子の名残（M4 の S.world.heir・W2 の騎士の後ろ盾）が新しい名前へ読み替わる
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
const OLD = /ミルザ|グラウ(?!ンド)|レヴィアン|ゴルモア|ザルヴェ|アウレリア|宵姫|モルドゥ|シェザール|ユラ|アズラグ|ルグゥ|ノタリ|内側の十三|十三魔人|十三の使徒|十三の影|狐面|狐の面|丁半/g;
const EMPEROR = /皇子|病床|皇帝(?:が|の)?(?:病|崩御|死)|皇帝が倒れ|新帝|新しい皇帝/g;
// 古いセーブを読み替える表と、その仕組みだけは古い言葉を持ってよい
const ALLOW = (rel, line) => rel === "engine/d9_sheet.js" || /OLD_HEIRS/.test(line);
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
// 使徒リストの番号と名前（スプレッドシート「使徒リスト」）
const SHEET = { 2: "ベルファス", 3: "ガルメド", 5: "ルアマリス", 7: "セグリトス", 18: "ベリエラ", 20: "テルグリス", 23: "ディエラン", 28: "カルマトス", 40: "ユヴァリエ", 44: "エンバルダ", 55: "オルネグス", 62: "ヴァルグレア", 64: "ドレイゼ" };
const IDS = ["mirza", "graw", "levian", "gormore", "zalve", "aurelia", "yoihime", "mordu", "chezar", "yura", "azlag", "lugu", "notari"];

export default ({ fail, ok, loadEngine }) => {
  let failures = 0;
  const F = (m) => { failures++; fail("D9: " + m); };

  for (const file of walk(SRC).filter((f) => /\.(js|json|html|css)$/.test(f))) {
    const rel = path.relative(SRC, file).split(path.sep).join("/");
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      if (/^\s*\/\//.test(line) || ALLOW(rel, line)) return;
      const body = line.replace(/\/\/.*$/, (c) => (/["`]/.test(c) ? c : "")); // 行末のコメントは見ない
      const m = body.match(OLD);
      if (m) F(`旧名か十三の括りが残っている「${[...new Set(m)].join("・")}」：src/${rel}:${i + 1}`);
      const e = body.match(EMPEROR);
      if (e) F(`皇帝の病・崩御か皇子の文が残っている「${[...new Set(e)].join("・")}」：src/${rel}:${i + 1}`);
    });
  }

  const G = loadEngine();
  const D = G.data;
  const keys = Object.keys(D.MAJIN || {});
  if (keys.join() !== IDS.join()) F(`会える使徒の id が変わった（${keys.join("・")}）`);
  const used = new Set();
  for (const id of IDS) {
    const m = D.MAJIN[id];
    if (!m) continue;
    if (SHEET[m.no] !== m.name) F(`${id} が使徒リストの ${m.no} 番（${SHEET[m.no] || "無し"}）に重なっていない（${m.name}）`);
    if (used.has(m.no)) F(`使徒リストの ${m.no} 番に二体が重なっている`);
    used.add(m.no);
  }
  for (const id of ["graw", "e2_gormoa", "e2_mordu", "w1_konoha", "kain", "rize"]) if (!D.ENEMIES[id]) F(`敵の id ${id} が無い`);
  if (D.ENEMIES.graw && !/エンバルダ/.test(D.ENEMIES.graw.name)) F(`graw の名前が「${D.ENEMIES.graw.name}」`);
  if (D.ENEMIES.e2_gormoa && !/テルグリス/.test(D.ENEMIES.e2_gormoa.name)) F(`e2_gormoa の名前が「${D.ENEMIES.e2_gormoa.name}」`);
  if (D.ENEMIES.e2_mordu && !/セグリトス/.test(D.ENEMIES.e2_mordu.name)) F(`e2_mordu の名前が「${D.ENEMIES.e2_mordu.name}」`);

  // 帝国：皇帝は死なない。M4 の筋の文に死・病が無く、婿取りになっている
  const news = ["emp_worse", "emp_rally", "emp_dead", "civil", "heir"].map((k) => D.M4.NEWS[k]);
  const newsText = JSON.stringify(news) + JSON.stringify(D.LORE.m4_emperor) + D.M4.HEIRS.join() + D.M4.MOURN_LINES.join() + D.M4.HEIR_LINES.join();
  if (/死んだ|崩御|病|喪|皇子|新帝/.test(newsText)) F("M4 の帝国の筋の文に、皇帝の死・病・皇子が残っている");
  if (!/婿/.test(JSON.stringify(D.M4.NEWS.heir))) F("M4 の heir が皇女の婿取りになっていない");
  const patrons = D.W2_PATRONS.garmund.map((p) => p.id + ":" + p.name);
  if (patrons.join() !== "first:四騎士ダリオに仕える,third:四騎士エルナに仕える,fifth:四騎士ヴァルグに仕える") F(`W2 の騎士の後ろ盾が四騎士になっていない（${patrons.join("・")}）`);
  const nordia = D.WORLD.all.flatMap(([, r]) => r).find(([k]) => k === "ノルディア帝国");
  if (!nordia || /病|皇子/.test(nordia[1])) F("手引きの帝国の説明に、皇帝の病か皇子が残っている");

  // 古いセーブ
  const S = {
    world: { emp: "new", heir: "北の賢人を連れた第三皇子", hist: [{ id: "m4h1", kind: "heir", heir: "北の賢人を連れた第三皇子", day: 300, loc: "garmund", heard: "rumor" }], towns: {} },
    w2_patron: { realm: "garmund", id: "first", name: "第一皇子に仕える", short: "第一皇子", day: 10 },
    repute: {},
  };
  G.fixOldNames(S);
  G.fixOldNames(S);
  if (/皇子/.test(S.world.heir) || !D.M4.HEIRS.includes(S.world.heir)) F(`古いセーブの新帝が婿に読み替わらない（${S.world.heir}）`);
  if (/皇子/.test(S.world.hist[0].heir)) F(`古いセーブの年表の新帝が読み替わらない（${S.world.hist[0].heir}）`);
  if (S.w2_patron.short !== "四騎士ダリオ" || S.w2_patron.name !== "四騎士ダリオに仕える" || S.w2_patron.id !== "first") F(`古いセーブの騎士の後ろ盾が読み替わらない（${JSON.stringify(S.w2_patron)}）`);
  const S2 = { world: { emp: "sick", heir: "", hist: [], towns: {} } };
  G.fixOldNames(S2);
  if (S2.world.heir !== "") F("婿の決まっていないセーブに婿が入った");

  if (!failures) ok("D9 シートの使徒と帝国（十三の旧名と皇子・皇帝の病が src に無い・会える使徒は id のまま使徒リストに重なる・古いセーブの皇子を読み替える）");
};
