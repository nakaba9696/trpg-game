// S4：BGM・環境音・効果音のつり合い（src/data/s4_mix.js と src/ui/sound.js・sound_bgm.js）
// - 狙いの並び：効果音（一瞬）＞ BGM ＞ 環境音。環境音は BGM の 6〜15 dB 下、効果音は BGM の 3〜10 dB 上
// - つり合いの倍率が、すべての曲・環境音・効果音にあり、知らない名前を指さず、おかしな値でない
// - 書いたときに測った大きさ（MEASURED）が狙い（TARGET＋OFFSET）から ±1.5 dB に収まる
// - 場面ごと（町・港・酒場・宿・街道・雨・迷宮・深淵…）に、鳴る BGM と環境音の差が 5〜15 dB（環境音が BGM をかき消さず、埋もれもしない）
// - 効果音の瞬間に BGM を下げる（ダッキング）の値がまとも
// - 音量は効果音・環境音・BGM の 3 つを別々に持ち、古い設定の値はそのまま活きる
// 大きさの測り直しは tools/loudness.mjs --write（Chromium が要るので CI では動かさない）
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok }) => {
  const F = (m) => fail("S4 つり合い " + m);
  const D = G.data;
  const M = D.MIX;
  if (!M) { F("表（G.data.MIX）が無い"); return; }
  const old = { mute: false, sfx: 0.45, amb: 0.15, sfxOn: true, ambOn: true, dice: false, bgm: 0.6 };
  const store = { "morsveld-sound": JSON.stringify(old) };
  const localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  const c = vm.createContext({ console, localStorage, G });
  vm.runInContext(readFileSync(new URL("../../src/ui/sound.js", import.meta.url), "utf8"), c, { filename: "ui/sound.js" });
  vm.runInContext(readFileSync(new URL("../../src/ui/sound_bgm.js", import.meta.url), "utf8"), c, { filename: "ui/sound_bgm.js" });
  const snd = G.sound;

  // ---------------------------------------------------------------- 狙いの並び
  const T = M.TARGET;
  if (!(T.sfx > T.bgm && T.bgm > T.amb)) F(`狙いの並びが 効果音 ${T.sfx} ＞ BGM ${T.bgm} ＞ 環境音 ${T.amb} でない`);
  if (!(T.bgm - T.amb >= 6 && T.bgm - T.amb <= 15)) F(`環境音が BGM の ${T.bgm - T.amb} dB 下（6〜15 のはず）`);
  if (!(T.sfx - T.bgm >= 3 && T.sfx - T.bgm <= 10)) F(`効果音が BGM の ${T.sfx - T.bgm} dB 上（3〜10 のはず）`);

  // ---------------------------------------------------------------- 倍率の表
  const names = { bgm: Object.keys(D.BGM.TRACKS), amb: snd.ambNames, sfx: snd.names };
  for (const kind of ["bgm", "amb", "sfx"]) {
    const K = kind.toUpperCase();
    const tab = M[K] || {}, off = M[K + "_OFFSET"] || {};
    for (const n of names[kind]) {
      const v = tab[n];
      if (!(v > 0.05 && v <= 8)) F(`${kind} ${n} の倍率が ${v}（測って書いていない？ tools/loudness.mjs --write）`);
      if (snd.mixGain(kind, n) !== (v || 1)) F(`${kind} ${n} の倍率を鳴らす側が読めない`);
    }
    for (const n of Object.keys(tab)) if (!names[kind].includes(n)) F(`${kind} の倍率が知らない名前 ${n} を指す`);
    for (const [n, d] of Object.entries(off)) {
      if (!names[kind].includes(n)) F(`${kind} のずらしが知らない名前 ${n} を指す`);
      if (!(Math.abs(d) <= 15)) F(`${kind} ${n} のずらし ${d} dB が大きすぎる`);
    }
    const meas = (M.MEASURED || {})[kind] || {};
    for (const n of names[kind]) {
      const w = T[kind] + (off[n] || 0), m = meas[n];
      if (!(Math.abs(m - w) <= 1.5)) F(`${kind} ${n} の測った大きさ ${m} が狙い ${w} から外れる`);
    }
  }
  if (snd.mixGain("sfx", "なにか") !== 1 || snd.mixGain("amb", "") !== 1) F("表に無い音の倍率が 1 にならない");

  // ---------------------------------------------------------------- 場面ごとの BGM と環境音の差
  const meas = M.MEASURED || { bgm: {}, amb: {} };
  const L = D.LOCS;
  const pairs = new Map();
  const states = [];
  for (const loc of Object.keys(L)) {
    for (const phase of [0, 3]) for (const depth of [0, 1]) states.push({ loc, mode: "explore", phase, depth, log: [] });
    if (L[loc].type === "town") for (const fac of ["inn", "tavern"]) states.push({ loc, mode: "fac", fac, phase: 0, log: [] });
    states.push({ loc, mode: "explore", phase: 0, depth: 0, weather: "雨", log: [] });
  }
  for (const S of states) {
    const amb = snd.ambFor(S);
    if (!amb) continue;
    for (const id of D.BGM.SCENES[snd.bgmScene(S, {})] || []) pairs.set(`${id}+${amb}`, [id, amb]);
  }
  const worst = [];
  for (const [key, [id, amb]] of pairs) {
    const d = meas.bgm[id] - meas.amb[amb];
    worst.push([d, key]);
    if (!(d >= 5 && d <= 15)) F(`BGM ${id} と環境音 ${amb} の差が ${d.toFixed(1)} dB（5〜15 のはず。かき消す／埋もれる）`);
  }
  worst.sort((a, b) => a[0] - b[0]);

  // ---------------------------------------------------------------- ダッキング
  const K = M.DUCK;
  if (!K || !(K.depth >= 0.3 && K.depth < 1) || !(K.release > 0 && K.release <= 2) || !(K.attack > 0 && K.attack <= 0.2)) F("ダッキングの値がおかしい");
  for (const n of (K && K.skip) || []) if (!snd.names.includes(n)) F(`ダッキングしない音に知らない名前 ${n}`);
  if (typeof snd.bgmLevel !== "function") F("BGM の音量の計算（bgmLevel）が無い");

  // ---------------------------------------------------------------- 音量は 3 つ別々・古い設定はそのまま
  const st = snd.settings;
  if (st.sfx !== 0.45 || st.amb !== 0.15 || st.bgm !== 0.6 || st.dice !== false) F(`古い設定の音量が変わった（効果音 ${st.sfx}・環境音 ${st.amb}・BGM ${st.bgm}）`);
  const DEF = snd.DEF;
  if (!(DEF.sfx > 0 && DEF.amb > 0 && DEF.bgm > 0)) F("効果音・環境音・BGM の既定の音量のどれかが無い");
  const src = readFileSync(new URL("../../src/ui/sound.js", import.meta.url), "utf8") + readFileSync(new URL("../../src/ui/sound_bgm.js", import.meta.url), "utf8");
  for (const id of ["sndSfx", "sndAmb", "sndBgm"]) if (!src.includes(`id="${id}"`)) F(`音量のつまみ ${id} が無い`);

  ok(`S4 音のつり合い（BGM ${T.bgm}・環境音 ${T.amb}・効果音 ${T.sfx} LUFS／場面の組 ${pairs.size}・BGM と環境音の差 ${worst[0][0].toFixed(1)}〜${worst[worst.length - 1][0].toFixed(1)} dB）`);
};
