// S2：ダイスを振る音（ui/sound.js）。DOM も AudioContext も無い所で確かめられる範囲を見る。
// ・効果音に roll（振る音）と rollShort（短い版）があること。はねる表（rollPlan）が毎回違い、長さが決まりの中にあること
// ・設定の既定値（ダイスの音・効果音・環境音はオン）。古い設定に項目が無くても既定値で動くこと
// ・判定の記録が来たら、結果の音より先に振る音が選ばれること。攻撃の判定は短い版。ダイスの音を切れば選ばれないこと
// 波形（無音・音割れ）は tools/sound_check.mjs で確かめる
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok }) => {
  const D = G.data;
  const code = readFileSync(new URL("../../src/ui/sound.js", import.meta.url), "utf8");
  // 古い設定（項目が足りない）が保存されている localStorage
  const store = { "morsveld-sound": JSON.stringify({ mute: false, sfx: 0.5, amb: 0.2 }) };
  const localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  vm.runInContext(code, vm.createContext({ console, G, localStorage }), { filename: "ui/sound.js" });
  const snd = G.sound;

  for (const n of ["roll", "rollShort"]) if (!snd.names.includes(n)) fail(`効果音 ${n} が無い`);
  if (typeof snd.rollPlan !== "function") fail("snd.rollPlan が無い");
  if (!snd.DEF || snd.DEF.dice !== true || snd.DEF.sfxOn !== true || snd.DEF.ambOn !== true || snd.DEF.mute !== false) fail(`設定の既定値がおかしい ${JSON.stringify(snd.DEF)}`);
  const st = snd.settings;
  if (st.dice !== true || st.sfxOn !== true || st.ambOn !== true || st.sfx !== 0.5) fail(`古い設定を読んだとき既定値で埋まらない ${JSON.stringify(st)}`);

  // はねる表
  const sig = new Set();
  for (let i = 0; i < 200; i++) {
    const p = snd.rollPlan(false);
    const bounces = p.hits.filter((h) => h.g >= p.hits[0].g * 0.2 && !h.last).length;
    if (p.end < 0.4 || p.end > 0.7) fail(`振る音の長さ ${p.end.toFixed(2)} 秒（0.4〜0.7 のはず）`);
    if (!p.hits[p.hits.length - 1].last) fail("振る音の最後が止まる音（コトン）でない");
    if (bounces < 2) fail(`振る音のはねが ${bounces} 回しかない`);
    for (let k = 1; k < p.hits.length; k++) if (p.hits[k].at < p.hits[k - 1].at) fail("振る音の打つ時刻が戻る");
    sig.add(p.hits.length + ":" + p.end.toFixed(3));
    const s = snd.rollPlan(true);
    const n = s.hits.filter((h) => !h.last).length;
    if (n < 1 || n > 2) fail(`短い版のはねが ${n} 回（1〜2 のはず）`);
    if (s.end > 0.35) fail(`短い版が長い ${s.end.toFixed(2)} 秒`);
  }
  if (sig.size < 50) fail(`振る音が毎回同じに近い（${sig.size} 通り）`);

  // 記録 → 音
  const loc = Object.keys(D.LOCS)[0];
  const cuesFor = (entries) => {
    const S = { loc, log: [{ k: "nar", text: "前" }], gold: 0, inv: {} };
    snd.forget(); snd.cues(S);
    S.log.push(...entries);
    return snd.cues(S);
  };
  const die = (reason, okv) => ({ k: "dice", text: "", reason, ok: okv, crit: false, fumble: false });
  let got = cuesFor([die("聞き耳", true)]);
  if (got.join() !== "roll,ok") fail(`判定の音が ${got.join()}（roll,ok のはず）`);
  got = cuesFor([die("聞き耳", false), die("回避", false)]);
  if (got.filter((c) => c === "roll").length !== 1) fail(`同じ手番の 2 回目の判定でも振る音が重なる ${got.join()}`);
  got = cuesFor([die("攻撃", true), { k: "sys", text: "オークに 5 のダメージ（残り 3/18）" }]);
  if (got[0] !== "rollShort" || got.includes("roll")) fail(`攻撃の判定が短い版にならない ${got.join()}`);
  snd.settings = { ...snd.settings, dice: false };
  got = cuesFor([die("聞き耳", true)]);
  if (got.includes("roll") || got.join() !== "ok") fail(`ダイスの音を切っても振る音が選ばれる ${got.join()}`);
  snd.settings = { ...snd.DEF };
  snd.forget();
  ok(`ダイスの音（振る音・短い版・${sig.size} 通りのはね方・設定の既定値）`);
};
