// U19：作成画面の並び（名前と性別 → 年齢 → 生まれ → 職業 → 目的）と、生まれを先に選んだあとで職業を変えても生まれ・名前が動かないこと
// - 画面（DOM なしなので書き方を読む）：名前・年齢・生まれの欄が、職業・目的の欄より先に足される
// - 決まり（engine/zu19_creation.js）：選んだ生まれ・名前は職業を変えても残る。年齢・生まれの補正（cre.mod）はそのまま効く
// - おまかせの下書き（生まれをまだ選んでいない）なら、今までどおり職業に似合う生まれへ寄る
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data, cre = G.cre;
  let bad = 0;
  const no = (m) => { bad++; fail("U19: " + m); };

  // 画面の並び
  const src = readFileSync(fileURLToPath(new URL("../../src/ui/setup.js", import.meta.url)), "utf8");
  const order = ["now.append(s1)", "now.append(s0)", "now.append(s2)", "job.append(s3)", "job.append(s4)"].map((k) => src.indexOf(k));
  if (order.some((i) => i < 0)) no(`作成画面の欄が見つからない ${order}`);
  else if (order.some((i, j) => j && i < order[j - 1])) no("作成画面の並びが「名前・年齢・生まれ → 職業・目的」になっていない");
  if (!/TX\.job/.test(src)) no("職業と目的の見出しが無い");
  if (!D.CRE_TEXT.job || !D.CRE_TEXT.jobSub) no("職業と目的の見出しの文が無い");

  const rnd = seeded(1919);
  const clsIds = Object.keys(D.CLASSES), orgIds = Object.keys(D.ORIGINS);
  for (let t = 0; t < 60; t++) {
    const dr = cre.fresh(rnd);
    // 誰かを先に決める
    cre.setSex(dr, t % 2 ? "女" : "男", rnd);
    cre.setAge(dr, Object.keys(D.AGES)[t % 3], rnd);
    // わざと「いまの職業のはじめの生まれ」を選ぶ（前は職業を変えると動いた）
    const org = t % 3 ? D.CLASS_ORIGIN[dr.cls] : orgIds[t % orgIds.length];
    cre.setOrigin(dr, org, rnd);
    const name = cre.nameOptions(dr, rnd)[t % cre.nameOptions(dr, rnd).length];
    cre.setName(dr, name);
    const age = dr.profile.age, band = dr.ageBand;
    // あとから職業を変える
    for (const c of clsIds) {
      cre.setClass(dr, clsIds[(clsIds.indexOf(c) + t) % clsIds.length], rnd);
      if (dr.origin !== org) { no(`職業を変えたら、選んだ生まれ ${org} が ${dr.origin} に変わった`); break; }
      if (dr.profile.name !== name) { no(`職業を変えたら、選んだ名前 ${name} が ${dr.profile.name} に変わった`); break; }
      if (dr.profile.age !== age || dr.ageBand !== band) { no("職業を変えたら、選んだ歳が変わった"); break; }
    }
    // 補正はそのまま効く
    for (const k of D.STATS) {
      const want = ((D.AGES[band].mod || {})[k] || 0) + ((D.ORIGINS[org].mod || {})[k] || 0);
      if (cre.mod(dr, k) !== want) no(`${k} の年齢・生まれの補正が ${cre.mod(dr, k)}（${want} のはず）`);
    }
    const S = G.newGame(cre.options(dr, rnd));
    if (S.profile.name !== name || S.profile.origin !== org || String(S.profile.age) !== String(age)) no("選んだ名前・生まれ・歳が主人公に入らない");
  }

  // おまかせの下書き：職業に似合う生まれへ寄る（今までどおり）
  for (let t = 0; t < 30; t++) {
    const dr = cre.fresh(rnd);
    const from = dr.cls, to = clsIds[(clsIds.indexOf(from) + 1) % clsIds.length];
    dr.origin = D.CLASS_ORIGIN[from];
    cre.setClass(dr, to, rnd);
    if (dr.origin !== D.CLASS_ORIGIN[to]) no(`おまかせの下書きで職業を変えても、生まれが ${D.CLASS_ORIGIN[to]} へ寄らない`);
  }

  if (!bad) ok("U19: 作成は名前・年齢・生まれ → 職業・目的の順。選んだ生まれと名前は職業を変えても残る");
};
