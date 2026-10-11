// U19：作成画面の並び（誰か → 何をする者か）と、誰かを先に選んだあとで職業を変えても名前・歳が動かないこと
// - 画面（DOM なしなので書き方を読む）：性別・名前・年齢の欄が、職業・目的の欄より先に足される（U25 で性別を名前の前に。生まれは無くした）
// - 決まり：選んだ名前・性別・歳は職業を変えても残る。年齢の補正（cre.mod）はそのまま効く（生まれの補正は無い）
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data, cre = G.cre;
  let bad = 0;
  const no = (m) => { bad++; fail("U19: " + m); };

  // 画面の並び
  const src = readFileSync(fileURLToPath(new URL("../../src/ui/setup.js", import.meta.url)), "utf8");
  // U25 で並びを「性別 → 名前 → 年齢 → 職業 → 目的」に（名前の候補を決める性別を、名前より前に。生まれの欄は無くした）
  const order = ["now.append(sSex)", "now.append(s1)", "now.append(s0)", "job.append(s3)", "job.append(s4)"].map((k) => src.indexOf(k));
  if (order.some((i) => i < 0)) no(`作成画面の欄が見つからない ${order}`);
  else if (order.some((i, j) => j && i < order[j - 1])) no("作成画面の並びが「性別・名前・年齢 → 職業・目的」になっていない");
  if (/name = "origin"|D\.ORIGINS|setOrigin/.test(src)) no("作成画面に、無くした生まれの欄が残っている");
  if (!/TX\.job/.test(src)) no("職業と目的の見出しが無い");
  if (!D.CRE_TEXT.job || !D.CRE_TEXT.jobSub) no("職業と目的の見出しの文が無い");

  const rnd = seeded(1919);
  const clsIds = Object.keys(D.CLASSES);
  for (let t = 0; t < 60; t++) {
    const dr = cre.fresh(rnd);
    // 誰かを先に決める
    cre.setSex(dr, t % 2 ? "女" : "男", rnd);
    cre.setAge(dr, Object.keys(D.AGES)[t % 3], rnd);
    const opts = cre.nameOptions(dr, rnd);
    const name = opts[t % opts.length];
    cre.setName(dr, name);
    const age = dr.profile.age, band = dr.ageBand, sex = dr.sex;
    // あとから職業を変える
    for (const c of clsIds) {
      cre.setClass(dr, clsIds[(clsIds.indexOf(c) + t) % clsIds.length], rnd);
      if (dr.profile.name !== name) { no(`職業を変えたら、選んだ名前 ${name} が ${dr.profile.name} に変わった`); break; }
      if (dr.sex !== sex) { no("職業を変えたら、選んだ性別が変わった"); break; }
      if (dr.profile.age !== age || dr.ageBand !== band) { no("職業を変えたら、選んだ歳が変わった"); break; }
    }
    // 補正は年齢だけ（生まれは無くした）
    for (const k of D.STATS) {
      const want = (D.AGES[band].mod || {})[k] || 0;
      if (cre.mod(dr, k) !== want) no(`${k} の補正が ${cre.mod(dr, k)}（年齢の ${want} のはず）`);
    }
    // 古い下書きに生まれ（origin）が残っていても、補正に効かない
    dr.origin = "karna";
    for (const k of D.STATS) if (cre.mod(dr, k) !== ((D.AGES[band].mod || {})[k] || 0)) { no("古い下書きの生まれが補正に効いている"); break; }
    const S = G.newGame(cre.options(dr, rnd));
    if (S.profile.name !== name || String(S.profile.age) !== String(age) || "origin" in S.profile) no("選んだ名前・歳が主人公に入らないか、無くした生まれが入っている");
  }

  if (!bad) ok("U19: 作成は性別・名前・年齢 → 職業・目的の順。選んだ名前と歳は職業を変えても残る");
};
