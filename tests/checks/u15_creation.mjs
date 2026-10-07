// U15：作成画面の情報の整理と、「自分で決める」目的の扱い
// - 各項目の効き目の一行（D.CRE_HINTS）がそろっていて、数字の羅列や目的の行き先を書いていない
// - 「今決めること」の各項目に効き目の一行が出る（「あとでもよいこと」の欄は U17 で無くした）。初めての人にはおまかせを勧める
// - 初めての人（トロフィーも墓碑も無い）の判定と、「おまかせのまま旅立つ」でボーナス点を捨てない
// - タイトル画面に題名（D.CRE_TEXT.title）が出て、ページの <title> も同じ
// - 「自分で決める」目的：ゲームは中身を判定しない（宿願成就・物語の結末は付かない）。節目「区切り」とトロフィー「自分で決めた道」には着ける。画面の説明と合う
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ G, fail, seeded }) => {
  const D = G.data, cre = G.cre;
  const HN = D.CRE_HINTS, TX = D.CRE_TEXT;
  if (!HN || !TX) { fail("作成画面の説明の表（D.CRE_HINTS・D.CRE_TEXT）が無い"); return; }
  const WHERE = /竜の墓場|鬼ヶ島|最奥|エンバルダ|絶界|10000|ヴォルグリム|白夜/;
  // 生まれは U25 で無くした（説明の一行も無い）
  if (HN.origin) fail("無くした生まれの説明（D.CRE_HINTS.origin）が残っている");
  for (const k of ["cls", "goal", "name", "sex", "age"]) {
    const t = HN[k];
    if (!t) { fail(`作成画面の「${k}」に効き目の一行が無い`); continue; }
    if (/[0-9０-９]/.test(t)) fail(`作成画面の「${k}」の説明が数字を並べている（${t}）`);
    if (WHERE.test(t)) fail(`作成画面の「${k}」の説明に行き先が出ている（${t}）`);
    if (t.length > 60) fail(`作成画面の「${k}」の説明が一行に収まらない（${t.length} 字）`);
  }
  if (!/出発の町/.test(HN.cls)) fail("職業の説明に出発の町が無い");

  // 初めての人
  const P0 = G.P;
  G.P = { trophies: {}, graves: [] };
  if (!cre.firstTime()) fail("トロフィーも墓碑も無いのに、初めての人と見なさない");
  G.P = { trophies: { first_blood: { name: "x" } }, graves: [] };
  if (cre.firstTime()) fail("トロフィーがあるのに初めての人と見なす");
  G.P = { trophies: {}, graves: [{ id: 1 }] };
  if (cre.firstTime()) fail("墓碑があるのに初めての人と見なす");
  G.P = {};
  if (!cre.firstTime()) fail("記録の形が古くても（trophies・graves が無い）初めての人と見なせない");
  G.P = { trophies: {}, graves: [] };
  // おまかせのまま旅立つ：ボーナス点を使い切る
  const rnd = seeded(1515);
  for (let i = 0; i < 20; i++) {
    const dr = cre.fresh(rnd);
    cre.quickFinish(dr);
    if (cre.bonusLeft(dr) !== 0) fail(`おまかせのまま旅立つと、ボーナス点が ${cre.bonusLeft(dr)} 点残る`);
    const o = cre.options(dr, rnd);
    if (!o.profile.name || !o.profile.age || !D.GOALS[o.goal] || o.goal === "custom") fail("おまかせの人物が埋まっていない／自分で決める目的になっている");
  }

  // 「自分で決める」目的の扱い
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 48]));
  G.newGame({ cls: "merc", stats, caps: stats, goal: "custom", goalText: "妹を探す", profile: { name: "テスト", sex: "女", age: 20, origin: "karna", ageBand: "young" } });
  const S = G.S;
  if (!S.goal || S.goal.id !== "custom") fail("自分で決める目的で冒険が始まらない");
  else {
    // どれだけ実績を積んでも、ゲームは「果たした」と判定しない
    Object.assign(S, { day: 400, fame: 999, gold: 99999, title: "国王" });
    S.counters.quests = 50; S.counters.bosses = 10;
    S.flags.graw = true;
    if (G.goalDone(S)) fail("自分で決めた目的を、ゲームが果たしたと判定した（画面の説明と食い違う）");
    const tr = (k) => D.TROPHIES.find((t) => t.key === k);
    for (const k of ["goal", "retire"]) {
      const t = tr(k);
      if (!t) continue;
      if (!TX.custom.join("").includes(t.name)) fail(`自分で決める目的の説明が、付かないトロフィー「${t.name}」に触れていない`);
      if (t.test({ ...S, over: "end" })) fail(`自分で決めた目的で、判定できないはずのトロフィー「${t.name}」が付く`);
    }
    // 節目「区切り」と、トロフィー「自分で決めた道」には着ける（説明どおり、日数と実績が要る）
    const t2 = tr("t2_custom");
    const ms = ((D.M6 || {}).MILESTONES || []).find((m) => m.goal === "custom");
    for (const [what, x] of [["トロフィー", t2], ["節目", ms]]) {
      if (!x) { fail(`自分で決める目的の${what}が無い`); continue; }
      const name = x.name || x.title;
      if (!TX.custom.join("").includes(`「${name}」`)) fail(`自分で決める目的の説明に${what}「${name}」の名前が無い`);
      if (!x.test(S)) fail(`実績を積んでも、自分で決める目的の${what}「${name}」に着かない`);
      const early = { ...S, day: 1, fame: 0, counters: { ...S.counters, quests: 0, bosses: 0 } };
      if (x.test(early)) fail(`旅立ったばかりで、自分で決める目的の${what}「${name}」に着く（説明は日数と実績が要ると言う）`);
    }
    if (!/物語を終える/.test(TX.custom.join(""))) fail("自分で決める目的の説明に、自分で区切る入口（物語を終える）が無い");
    if (!/判定しない/.test(D.GOALS.custom.hint || "")) fail("目的「自分で決める」のカードに、判定しないことが書かれていない");
  }
  G.P = P0;

  // 画面（DOM なしなので、書き方を読む）
  const src = readFileSync(fileURLToPath(new URL("../../src/ui/setup.js", import.meta.url)), "utf8");
  // 「あとでもよいこと」（外見・生い立ち）の欄は無くした（U17）
  if (/creLater|TX\.later/.test(src)) fail("作成画面に、無くした「あとでもよいこと」の欄が残っている");
  if (!/TX\.now/.test(src)) fail("作成画面に「今決めること」の印が無い");
  for (const k of ["cls", "goal", "name"]) if (!new RegExp(`eff\\("${k}"\\)`).test(src)) fail(`作成画面に「${k}」の効き目の一行が出ない`);
  if (!/HN\.sex/.test(src) || !/HN\.age/.test(src)) fail("作成画面に性別・年齢の効き目の一行が出ない");
  if (!/cre\.firstTime\(\)/.test(src) || !/TX\.first\b/.test(src)) fail("作成画面に、初めての人へのおまかせの一言が無い");
  if (!/creCustomNote/.test(src) || !/TX\.custom\b/.test(src)) fail("作成画面に、自分で決める目的の扱いの説明が無い");
  // タイトル画面に題名だけを出し、ページの <title> も同じ題名にする
  const T = (TX.title || {}).name;
  if (!T) fail("タイトル画面の題名（D.CRE_TEXT.title）が無い");
  if (!/titleName/.test(src) || !/TT\.name/.test(src)) fail("タイトル画面に題名が出ない");
  const html = readFileSync(fileURLToPath(new URL("../../src/index.html", import.meta.url)), "utf8");
  if (T && !html.includes(`<title>${T}</title>`)) fail(`ページの <title> が題名（${T}）と違う`);
  if (/果たすとトロフィー「宿願成就」/.test(src)) fail("作成画面が、自分で決める目的でも「宿願成就」が付くように書いている（D.CRE_TEXT の goalFine・customFine で分ける）");
};
