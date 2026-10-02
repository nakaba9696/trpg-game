// V10：名のある人物の見た目を固定するタグ（docs/art/portraits.json の identity・tools/portraits.mjs の featureOf・tools/gen_portraits.mjs --variants）
// - キャラメモの人（group c2）と差分（variants）のある人は identity を持ち、髪の色・髪の長さか髪型・目の色が入っている。性的・構図の言葉が無い
// - identity と tags で同じタグを二度書いていない
// - 差分のプロンプトは identity と tags を一字一句そのまま含み、表情だけが違う。生成の道具がその組み立て（featureOf）を使い、denoising の既定が 0.35
import { readFileSync } from "node:fs";
import { JSON_PATH, MOODS, featureOf, joinTags } from "../../tools/portraits.mjs";

const COLOR = "black|jet black|blue-black|brown|dark brown|light brown|chestnut|honey brown|blonde|dark blonde|golden blonde|platinum blonde|pale blonde|dirty blonde|ash blonde|red|dark red|crimson|white|silver|silver-white|platinum silver|ash silver|grey|dark grey|ash grey|steel grey|silver grey|blue|light blue|green|pink|purple|orange";
const HAIR_COLOR = new RegExp(`(^|, )(${COLOR})( |-)?hair(,|$)|(^|, )bald(,|$)`);
const HAIR_STYLE = /\b(short|medium|long) hair\b|\bbald\b|\bbob cut\b|\bponytail\b|\bbraid\b|\bhair bun\b|\bslicked back\b/;
const EYE_COLOR = /\b(black|brown|dark brown|amber|golden|green|blue|light blue|dark blue|ice blue|grey|pale grey|violet|yellow|hazel|red|cyan)( left| right)? eyes?\b|\bheterochromia\b/;
const BAD = /masterpiece|best quality|anime|illustration|realistic|portrait|upper body|looking at viewer|nsfw|nude|naked|breast|cleavage|navel|thigh|sexy|lingerie|underwear|panties|loli|seductive|lewd/i;

export default ({ fail, ok }) => {
  const F = (m) => fail("V10：" + m);
  const list = JSON.parse(readFileSync(JSON_PATH, "utf8")).portraits || [];
  const named = list.filter((p) => p.group === "c2" || p.variants);
  if (named.length < 30) F(`identity を持つはずの人が少ない：${named.length}`);
  for (const p of named) {
    const t = p.identity;
    if (typeof t !== "string" || !t.trim()) { F(`${p.id} に見た目を固定するタグ（identity）が無い`); continue; }
    if (!HAIR_COLOR.test(t)) F(`${p.id} の identity に髪の色が無い`);
    if (!HAIR_STYLE.test(t)) F(`${p.id} の identity に髪の長さ・髪型が無い`);
    if (!EYE_COLOR.test(t)) F(`${p.id} の identity に目の色が無い`);
    if (BAD.test(t)) F(`${p.id} の identity に、構図・性的な言葉がある：${t.match(BAD)[0]}`);
    const a = t.split(",").map((s) => s.trim());
    const b = String(p.tags || "").split(",").map((s) => s.trim());
    const dup = [...new Set(a.filter((x, i) => a.indexOf(x) !== i).concat(a.filter((x) => b.includes(x))))];
    if (dup.length) F(`${p.id} の identity と tags で同じタグがある：${dup.join("、")}`);
    // 差分は identity と tags がそのまま、表情だけ違う
    const base = featureOf(p);
    const head = joinTags(p.identity, p.tags);
    if (!base.startsWith(head)) F(`${p.id} の基本のプロンプトが identity・tags で始まらない`);
    for (const m of MOODS) {
      if (!p.variants || !p.variants[m]) continue;
      const v = featureOf(p, p.variants[m]);
      if (v !== joinTags(head, p.variants[m])) F(`${p.id} の差分 ${m} のプロンプトが identity・tags・表情の形でない`);
      if (!v.includes(p.identity)) F(`${p.id} の差分 ${m} のプロンプトに identity が無い`);
    }
  }

  // 生成の道具がこの組み立てを使う（差分もポーズ・見た目は基本と同じ）。img2img の強さの既定は 0.35
  const gen = readFileSync(new URL("../../tools/gen_portraits.mjs", import.meta.url), "utf8");
  if (!/P\.featureOf\(p, face\)/.test(gen)) F("tools/gen_portraits.mjs のプロンプトが featureOf（identity ＋ tags ＋ 表情）で組まれていない");
  if (!/promptOf\(p, p\.variants\[m\]\)/.test(gen)) F("tools/gen_portraits.mjs の差分のプロンプトが promptOf（基本と同じ組み立て）でない");
  if (!/denoising: 0\.35/.test(gen)) F("tools/gen_portraits.mjs の差分の denoising の既定が 0.35 でない");
  const style = JSON.parse(readFileSync(new URL("../../docs/art/style.json", import.meta.url), "utf8"));
  const d = style.variants && style.variants.denoising;
  if (!(d >= 0.3 && d <= 0.55)) F(`style.json の variants.denoising が 0.3〜0.55 でない（0.35 では表情が変わらず、art-batch-e で 0.5 に）：${d}`);

  ok(`V10：名のある人物 ${named.length} 人に identity（髪の色・髪型・目の色）、差分は identity・tags のまま表情だけ替える`);
};
