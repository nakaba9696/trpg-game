// U25：作成画面で性別を名前から分けた（性別 → 名前 → 年齢）。生まれは無くした（持ち主の決定。物語にほぼ効いていなかった）
// - 画面（DOM なしなので書き方を読む）：性別は見出しとおまかせを持つ独立した欄で、名前の欄の中に性別の選択が無い
// - 性別を選び直すと、名前の候補を引き直す（drawNames を呼ぶ）
// - 生まれの欄・表・補正・導入の文・ステータスの行が無い。古いセーブに origin があっても読まないだけ
// - 性別のおまかせ（cre.randomPart(dr, "sex")）は、男か女に決まり、名前もその性別の響きの表から作り直す
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ G, fail, ok, seeded }) => {
  const F = (m) => fail("U25: " + m);
  const D = G.data, cre = G.cre;
  const src = readFileSync(fileURLToPath(new URL("../../src/ui/setup.js", import.meta.url)), "utf8");
  const part = (a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)));
  const sexSec = part("const sSex", "now.append(sSex)");
  const nameSec = part("const s1 = ", "now.append(s1)");
  if (!sexSec) { F("性別の欄が無い"); return; }
  if (!/h\("h3", "", "性別"\)/.test(sexSec)) F("性別の欄に見出しが無い");
  if (!/randomPart\(draft, "sex"/.test(sexSec)) F("性別の欄におまかせが無い");
  if (!/setSex[^\n]*drawNames\(\)/.test(sexSec)) F("性別を選び直しても名前の候補を引き直さない");
  if (/name: "sex"|"性別"/.test(nameSec)) F("名前の欄の中に、まだ性別の選択がある");
  if (!/選び直すと候補も引き直される/.test(D.CRE_HINTS.name)) F("名前の説明に、性別で候補が引き直されることが書かれていない");
  // 生まれは無くした
  if (D.ORIGINS || D.CLASS_ORIGIN || D.CRE_HINTS.origin) F("生まれの表か説明が残っている");
  if (/生まれ/.test(src.replace(/\/\/[^\n]*/g, ""))) F("作成画面のどこかに「生まれ」が出る");
  if (/生まれ/.test(D.CRE_TEXT.now + D.CRE_TEXT.nowSub)) F("見出しに生まれが残っている");
  const ui = readFileSync(fileURLToPath(new URL("../../src/ui/ui.js", import.meta.url)), "utf8");
  if (/\["生まれ"/.test(ui)) F("ステータスの人物の欄に生まれが残っている");
  {
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 40]));
    const S = G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "古い人", sex: "女", age: 30, ageBand: "prime", origin: "karna" } });
    if (!S || S.profile.name !== "古い人") F("古いセーブの形（origin つき）で始められない");
    const t = cre.prologue({ cls: S.cls, goal: S.goal, profile: S.profile }).flat().join("");
    if (/生まれ|undefined/.test(t)) F(`古い origin つきの人物の導入に生まれが出る：${t}`);
  }

  // 性別のおまかせ
  const rnd = seeded(2525);
  const seen = new Set();
  for (let t = 0; t < 80; t++) {
    const dr = cre.fresh(rnd);
    cre.randomPart(dr, "sex", rnd);
    seen.add(dr.sex);
    if (!["男", "女"].includes(dr.sex)) { F(`おまかせの性別が ${dr.sex}`); break; }
    if (!cre.namePool(dr).includes(dr.profile.name)) { F(`おまかせの性別 ${dr.sex} に合わない名前 ${dr.profile.name}`); break; }
    if (!cre.nameOptions(dr, rnd).includes(dr.profile.name)) { F("おまかせのあと、今の名前が候補に並ばない"); break; }
  }
  if (seen.size < 2) F("性別のおまかせで男女の片方しか出ない");
  ok("U25: 性別は名前から分けた独立の欄（性別 → 名前 → 年齢）。生まれは無くした");
};
