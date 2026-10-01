// D8 #136：世界観をスプレッドシート中心に整理した（docs/lore/sheet_audit.md）
// - src に外から混ぜた名前（八雲・侍の国・魔物界・古王国ロゥム・酒呑）が残っていない（古いセーブを移す d8_names.js だけは持ってよい）
// - 場所の id はそのままで、表に出る名前がシートの名になっている（シェルアーク・エル・ナフ遺構・使徒領）
// - 自由都市連合が「三国のどこにも属さない」ではなく、王国の中の自治の町として書かれている
// - 古いセーブの「八雲」「魔物界」の評判が新しい名前へ移る
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
const OLD = /八雲|魔物界|ロゥム|酒呑|侍と忍|十二単|三国のどこにも属さない/g;
const ALLOW = new Set(["engine/d8_names.js"]);
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

export default ({ fail, ok, loadEngine }) => {
  let failures = 0;
  const F = (m) => { failures++; fail(m); };

  for (const file of walk(SRC).filter((f) => /\.(js|json|html|css)$/.test(f))) {
    const rel = path.relative(SRC, file).split(path.sep).join("/");
    if (ALLOW.has(rel)) continue;
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      const m = line.match(OLD);
      if (m) F(`シートに無い名前「${[...new Set(m)].join("・")}」が残っている：src/${rel}:${i + 1}`);
    });
  }

  const G = loadEngine();
  const D = G.data;
  const want = { yakumo: "島の都シェルアーク", w1_oboro: "シェルアーク・朧島", ruins: "エル・ナフ遺構", wasteland: "使徒領・灰の荒野" };
  for (const [id, name] of Object.entries(want)) {
    if (!D.LOCS[id]) F(`場所の id ${id} が無い`);
    else if (D.LOCS[id].name !== name) F(`${id} の名前が「${D.LOCS[id].name}」（${name} のはず）`);
  }
  for (const id of ["yakumo", "onigashima", "w1_oboro"]) if (D.LOCS[id] && D.LOCS[id].region !== "シェルアーク") F(`${id} の地方が「${D.LOCS[id].region}」`);
  for (const id of ["wasteland", "majincastle"]) if (D.LOCS[id] && D.LOCS[id].region !== "使徒領") F(`${id} の地方が「${D.LOCS[id].region}」`);
  if (!D.LAWLESS || !D.LAWLESS.includes("使徒領")) F("使徒領に衛兵がいることになっている（D.LAWLESS）");
  if (!D.ENEMIES.shuten || !/ゴズ/.test(D.ENEMIES.shuten.name)) F("鬼の頭目の名前が変わっていない（id shuten はそのまま）");
  const free = D.WORLD.all.flatMap(([, r]) => r).find(([k]) => k === "自由都市連合");
  if (!free || !/王国/.test(free[1])) F("自由都市連合が王国の中の町として書かれていない");

  const S = { titleAt: "八雲", repute: { 八雲: { rep: 4, inf: 1, wanted: false }, シェルアーク: { rep: 1, inf: 0, wanted: true } } };
  G.fixOldNames(S);
  G.fixOldNames(S);
  if (S.titleAt !== "シェルアーク") F(`騎士の位の地方が移らない（${S.titleAt}）`);
  const r = S.repute["シェルアーク"];
  if (!r || r.rep !== 5 || r.inf !== 1 || !r.wanted || S.repute["八雲"]) F(`八雲の評判がシェルアークへまとまらない（${JSON.stringify(S.repute)}）`);

  if (!failures) ok("D8 シートが主（外から混ぜた名前が src に無い・id はそのまま・自由都市は王国の中・古いセーブの地方名を移す）");
};
