// A9：絵師タグ（ikezawa shin）を戻すかわりに、髪と目の色を全員に書く（持ち主「髪色とか引っ張られるかもだから、キャラの個性としてちゃんと指定して。2人以上いる画像が出来たら作り直しで」）
// - 人物の一覧（docs/art/portraits.json）の全員（名のある人・使徒の人の姿・モブの型 kind_*・主人公の型 hero_*）の identity に、髪の色（か bald）・髪型（長さか形）・目の色（か閉じた目・覆われた目）がある
// - 人物の設定（style.json・style_male.json）の prefix に ikezawa shin があり、魔物の設定（style_monsters.json・style_eldritch.json）には無い
// - 複数人を避けるタグ（suffix の solo、ネガティブの multiple girls・2girls・multiple boys・group・crowd・background characters・other characters）と、露出を抑えるタグが残っている
// - 絵の版（style.json の art・art_drop、一覧の art）：基本の絵は今の版の prefix、差分は印の無い人（版 1）なら ikezawa shin を外した prefix、印のある人（版 2）なら入れた prefix で作る
// - 作り直しの印（redo）は決まった値で、README に「1枚ごとに見て 2人以上なら作り直す」がある
import { readFileSync } from "node:fs";
import { JSON_PATH, artPrefix, artNow, artOf } from "../../tools/portraits.mjs";

const COLOR = "black|brown|chestnut|auburn|blonde|red|crimson|scarlet|wine|white|silver|grey|gray|platinum|cream|snow|ash|blue|navy|teal|green|emerald|pink|purple|lilac|violet|lavender|orange|ginger|sandy|golden|honey|dark|light|pale|steel";
const HAIR_COLOR = new RegExp(`^((${COLOR})[ -])*(${COLOR})( |-)?hair$|^bald$|^shaved head$`);
const HAIR_STYLE = /^((very )?(short|medium|long) hair|bald|shaved head|bob cut|crew cut|hime cut|topknot|short topknot|ponytail|high ponytail|low ponytail|twintails|low twintails|hair bun|crown braid|updo)$|braid|slicked back|swept back|combed back/;
const EYE_COLOR = new RegExp(`^((${COLOR}|amber|hazel|yellow|gold|cyan|ice)[ -])*(${COLOR}|amber|hazel|yellow|gold|cyan|ice)( (left|right))? eyes?$|^heterochromia$`);
const EYE_HIDDEN = /^(closed eyes|eyes closed|blindfold|blindfolded|mask covering eyes)$/;
const SOLO_NEG = ["multiple girls", "2girls", "multiple boys", "2boys", "group", "crowd", "background characters", "other characters"];
const CLOTHED_NEG = ["nsfw", "nude", "topless"];
const IKEZAWA = "ikezawa shin";
const tagsOf = (s) => String(s || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
const read = (f) => JSON.parse(readFileSync(new URL("../../docs/art/" + f, import.meta.url), "utf8"));

export default ({ fail, ok }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("A9：" + m); };
  const list = JSON.parse(readFileSync(JSON_PATH, "utf8")).portraits || [];

  // ---------------------------------------------------------------- 髪と目
  let n = 0;
  for (const p of list) {
    const t = tagsOf(p.identity);
    if (!t.length) { F(`${p.id}（${p.name}）に identity（見た目）が無い`); continue; }
    if (!t.some((x) => HAIR_COLOR.test(x))) F(`${p.id} の identity に髪の色が無い（silver hair など。禿げ・剃髪なら bald）`);
    if (!t.some((x) => HAIR_STYLE.test(x))) F(`${p.id} の identity に髪型（長さか形）が無い`);
    if (!t.some((x) => EYE_COLOR.test(x) || EYE_HIDDEN.test(x))) F(`${p.id} の identity に目の色が無い（amber eyes など。閉じた目・目隠しならそれ）`);
    n++;
  }
  for (const g of ["hero", "people"]) if (!list.some((p) => p.group === g && p.identity)) F(`型（${g}）に identity が無い`);

  // ---------------------------------------------------------------- 絵師タグ・複数人・露出
  const style = read("style.json");
  const male = Object.assign({}, style, read("style_male.json"));
  for (const [name, st] of [["style.json", style], ["style_male.json", male]]) {
    if (!tagsOf(st.prefix).includes(IKEZAWA)) F(`${name} の prefix に ${IKEZAWA} が無い`);
    if (!tagsOf(st.suffix).includes("solo")) F(`${name} の suffix に solo が無い`);
    if (!tagsOf(st.suffix).includes("fully clothed")) F(`${name} の suffix に fully clothed が無い`);
    const neg = tagsOf(st.negative);
    for (const w of [...SOLO_NEG, ...CLOTHED_NEG]) if (!neg.includes(w)) F(`${name} のネガティブに ${w} が無い`);
  }
  for (const f of ["style_monsters.json", "style_eldritch.json"]) {
    const st = read(f);
    if (JSON.stringify(st).toLowerCase().includes(IKEZAWA)) F(`魔物の設定 ${f} に ${IKEZAWA} がある（人物だけに入れる）`);
  }

  // ---------------------------------------------------------------- 絵の版（差分のプロンプトに効くか）
  if (artNow(style) < 2) F(`style.json の art が 2 以上でない：${style.art}`);
  if (!tagsOf((style.art_drop || {})[1]?.join(",")).includes(IKEZAWA)) F(`style.json の art_drop["1"] に ${IKEZAWA} が無い（版 1 の絵の差分で外す）`);
  for (const [name, st] of [["style.json", style], ["style_male.json", male]]) {
    const old = { id: "x" }, now = { id: "y", art: artNow(st) };
    const has = (pre) => tagsOf(pre).includes(IKEZAWA);
    if (!has(artPrefix(st.prefix, st, old, false))) F(`${name}：基本の絵（txt2img）の prefix に ${IKEZAWA} が無い`);
    if (has(artPrefix(st.prefix, st, old, true))) F(`${name}：印の無い人（版 1）の差分の prefix に ${IKEZAWA} が残る`);
    if (!has(artPrefix(st.prefix, st, now, true))) F(`${name}：版 ${artNow(st)} の人の差分の prefix に ${IKEZAWA} が無い`);
    const rest = (pre) => tagsOf(pre).filter((t) => t !== IKEZAWA).join(",");
    if (rest(artPrefix(st.prefix, st, old, true)) !== rest(st.prefix)) F(`${name}：版 1 の差分の prefix で ${IKEZAWA} 以外の語が変わった`);
  }
  for (const p of list) if (p.art !== undefined && !(Number.isInteger(p.art) && p.art >= 1 && p.art <= artNow(style))) F(`${p.id} の art（絵の版）がおかしい：${p.art}`);
  const gen = readFileSync(new URL("../../tools/gen_portraits.mjs", import.meta.url), "utf8");
  if (!/P\.artPrefix\(/.test(gen)) F("tools/gen_portraits.mjs が絵の版（P.artPrefix）で prefix を組んでいない");
  if (!/p\.art = P\.artNow\(style\)/.test(gen)) F("tools/gen_portraits.mjs が基本の絵を作ったときに一覧の art を書いていない");
  if (!/"--redo"/.test(gen)) F("tools/gen_portraits.mjs に --redo（作り直しの印の人を作り直す）が無い");

  // ---------------------------------------------------------------- 作り直しの印・手順
  const REDO = new Set(["multi"]);
  const redo = list.filter((p) => p.redo !== undefined);
  for (const p of redo) if (!REDO.has(p.redo)) F(`${p.id} の redo（作り直しの印）が決まった値でない：${p.redo}（${[...REDO].join("・")}）`);
  const readme = readFileSync(new URL("../../docs/art/README.md", import.meta.url), "utf8");
  if (!/1枚ごとに見/.test(readme) || !/2人以上/.test(readme)) F("docs/art/README.md の画像生成の手順に「1枚ごとに見て、2人以上写っていたら作り直す」が無い");
  if (!/ikezawa shin/.test(readme) || !/art_drop/.test(readme)) F("docs/art/README.md に絵の版（ikezawa shin・art・art_drop）の説明が無い");

  if (!bad) ok(`A9：人物 ${n} 人に髪の色・髪型・目の色、人物の prefix に ${IKEZAWA}（魔物には無し）、solo と複数人のネガティブあり、差分は基本の絵の版にそろえる（版 ${artNow(style)}：${list.filter((p) => artOf(p) === artNow(style)).length} 人）、作り直しの印 ${redo.length} 人`);
};
