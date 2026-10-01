// V7：異形だけ別のモデル（docs/art/style_eldritch.json）、人の姿の使徒は特徴のタグで異質に
// - 魔物の一覧の style は monsters（既定・書かない）か eldritch。eldritch は全体の 2 割まで。人の姿の敵・same_as には付けない
// - style_eldritch.json は読めて、モデル・Lightning 向けの設定・露出を抑えるネガティブを持つ
// - 人物の一覧のタグに halo を書かない（設定の no halo と衝突する）
import { readFileSync } from "node:fs";
import { JSON_PATH } from "../../tools/monsters.mjs";

export default ({ fail, ok }) => {
  const list = JSON.parse(readFileSync(JSON_PATH, "utf8")).monsters || [];
  const eld = [];
  for (const m of list) {
    const st = m.style === undefined ? "monsters" : m.style;
    if (st !== "monsters" && st !== "eldritch") fail(`魔物の一覧の ${m.id} の style が monsters・eldritch のどちらでもない：${m.style}`);
    if (st === "eldritch") {
      eld.push(m.id);
      if (m.human) fail(`魔物の一覧の ${m.id} は人の姿（human: true）なのに eldritch`);
      if (m.same_as) fail(`魔物の一覧の ${m.id} は same_as（作らない）なのに eldritch`);
    }
  }
  if (eld.length > list.length * 0.2) fail(`eldritch が多すぎる（${eld.length} / ${list.length}。2 割まで）：${eld.join("、")}`);

  let st = null;
  try { st = JSON.parse(readFileSync(new URL("../../docs/art/style_eldritch.json", import.meta.url), "utf8")); } catch (e) { fail("docs/art/style_eldritch.json が読めない：" + e.message); }
  if (st) {
    const ck = st.override_settings && st.override_settings.sd_model_checkpoint;
    if (!/^dreamshaperXL_lightningDPMSDE\.safetensors( \[[0-9a-f]+\])?$/.test(ck || "")) fail(`style_eldritch.json のモデルが違う：${ck}`);
    if (typeof st.prefix !== "string" || typeof st.suffix !== "string" || typeof st.negative !== "string") fail("style_eldritch.json に prefix・suffix・negative が無い");
    else {
      if (!/no humans/.test(st.suffix) || !/white background/.test(st.suffix)) fail("style_eldritch.json の suffix に no humans・white background が無い");
      for (const w of ["nsfw", "nude", "multiple monsters", "anime", "chibi"]) if (!st.negative.includes(w)) fail(`style_eldritch.json の negative に ${w} が無い`);
    }
    if (!(st.steps >= 4 && st.steps <= 12) || !(st.cfg_scale > 0 && st.cfg_scale <= 3)) fail(`style_eldritch.json の steps・cfg が Lightning 向けでない：${st.steps}・${st.cfg_scale}`);
    if (st.width !== st.height) fail("style_eldritch.json の大きさが正方形でない");
  }

  const ps = JSON.parse(readFileSync(new URL("../../docs/art/portraits.json", import.meta.url), "utf8")).portraits;
  for (const p of ps) if (/(^|,)\s*halo\s*(,|$)/i.test(p.tags)) fail(`人物の一覧の ${p.id} のタグに halo がある（設定の no halo と衝突する）`);
  ok(`V7 異形：別モデルで作る魔物 ${eld.length} / ${list.length} 体（${eld.join("、")}）`);
};
