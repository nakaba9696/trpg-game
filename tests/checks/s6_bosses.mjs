// S6：強敵の曲と、使徒ごとの専用曲（src/data/s6_tracks_boss.js・src/ui/sound_bgm_s6.js）
// - 討てる使徒（S・A・B 級。D.E8.UNSLAY に無い使徒）は、どれも自分だけの曲を持つ（ほかの使徒と同じ曲を使わない）。長編の決戦（D.E7.SAGAS）も専用曲
// - 戦えば、その使徒の曲になる（使徒の戦闘データは戦いが始まると D.ENEMIES に入る）。長編の決戦は、同じ使徒でも決戦の曲
// - 強敵は性格（かっこいい・不気味・獣）で曲が変わり、かっこいい曲・不気味な曲がそれぞれ 2 曲以上。性格の表は実在する強敵を指す
// - 使徒の曲は、その使徒の名と性格を書いた説明を持つ
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok }) => {
  const F = (m) => fail("S6 ボス " + m);
  const D = G.data;
  const B = D.BGM;
  if (!B || !B.ROUTES || !B.S6) { F("曲の分け方の表が無い"); return; }
  const store = {};
  const localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  const c = vm.createContext({ console, localStorage, G });
  for (const f of ["sound.js", "sound_bgm.js", "sound_bgm_s6.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), c, { filename: "ui/" + f });
  const snd = G.sound;
  const E3 = D.E3, UN = (D.E8 && D.E8.UNSLAY) || {};

  // ---------------------------------------------------------------- 使徒ごとの曲
  const slay = Object.keys(E3.LIST).filter((id) => !UN[id]);
  const owner = {};
  const base = { loc: "wasteland", mode: "combat", phase: 1, log: [] };
  let n = 0;
  for (const id of slay) {
    const a = E3.LIST[id];
    const key = "apostle@" + id;
    const list = B.ROUTES[key] || [];
    if (!list.length) { F(`討てる使徒 ${id}（${a.rank} 級）に専用曲が無い`); continue; }
    for (const t of list) {
      if (!B.TRACKS[t]) F(`使徒 ${id} の曲 ${t} が無い`);
      if (owner[t] && owner[t] !== id) F(`使徒 ${id} と ${owner[t]} が同じ曲 ${t}`);
      owner[t] = id;
    }
    const foe = (E3.FOES || {})[a.foe] || D.ENEMIES[a.foe];
    if (!foe) { F(`使徒 ${id} の戦闘データ ${a.foe} が無い`); continue; }
    // 戦いが始まると D.ENEMIES に入る（G.e3Register と同じ）
    const had = D.ENEMIES[a.foe];
    D.ENEMIES[a.foe] = D.ENEMIES[a.foe] || foe;
    const sc = snd.bgmScene({ ...base, combat: { foes: [{ id: a.foe }] } }, {});
    if (sc !== key) F(`使徒 ${id} と戦う場面が ${sc}（${key} のはず）`);
    else if (!list.includes(snd.bgmTrackFor(sc))) F(`使徒 ${id} と戦って、専用曲が鳴らない`);
    if (!had) delete D.ENEMIES[a.foe];
    const tr = B.TRACKS[list[0]];
    if (tr && !(tr.mood && tr.mood.length >= 30)) F(`使徒 ${id} の曲の説明が短い`);
    n++;
  }
  // 長編の決戦
  const sagas = Object.keys((D.E7 && D.E7.SAGAS) || {});
  for (const id of sagas) {
    const sg = D.E7.SAGAS[id];
    const key = "apostle@saga_" + id;
    const list = B.ROUTES[key] || [];
    if (!list.length) { F(`長編 ${id} の決戦に専用曲が無い`); continue; }
    for (const t of list) { if (owner[t]) F(`長編 ${id} の決戦の曲 ${t} を使徒 ${owner[t]} も使う`); owner[t] = "saga_" + id; }
    const foe = sg.foe;
    const had = D.ENEMIES[foe];
    D.ENEMIES[foe] = D.ENEMIES[foe] || (E3.FOES || {})[foe];
    const fin = snd.bgmScene({ ...base, combat: { foes: [{ id: foe, e7: { id, kind: "final" } }] } }, {});
    if (fin !== key) F(`長編 ${id} の決戦の場面が ${fin}（${key} のはず）`);
    const toy = snd.bgmScene({ ...base, combat: { foes: [{ id: foe, e7: { id, kind: "toy" } }] } }, {});
    if (toy === key) F(`長編 ${id} の一度目の対面で決戦の曲が鳴る`);
    if (!had) delete D.ENEMIES[foe];
  }
  // 討てない使徒・知らない使徒は元の使徒の曲
  for (const k of Object.keys(B.ROUTES).filter((k) => k.startsWith("apostle@"))) {
    const v = k.slice(8);
    if (v.startsWith("saga_") ? !sagas.includes(v.slice(5)) : !slay.includes(v)) F(`分け方 ${k} が討てる使徒・長編を指していない`);
  }
  const graw = snd.bgmScene({ ...base, combat: { foes: [{ id: "graw" }] } }, {});
  if (graw !== "apostle@graw") F(`黒鎧の使徒エンバルダと戦う場面が ${graw}`);

  // ---------------------------------------------------------------- 強敵の性格
  for (const s of ["cool", "eerie", "beast"]) if (!(B.ROUTES["boss@" + s] || []).length) F(`強敵の ${s} の曲が無い`);
  if ((B.ROUTES["boss@cool"] || []).length < 2 || (B.ROUTES["boss@eerie"] || []).length < 2) F("強敵のかっこいい曲・不気味な曲がそれぞれ 2 曲以上ない");
  const E = D.ENEMIES;
  for (const [id, s] of Object.entries(B.S6.BOSS_STYLE || {})) {
    if (!E[id]) F(`強敵の性格の表が知らない敵 ${id} を指す`);
    else if (!E[id].boss && !(E[id].tier >= 5)) F(`強敵の性格の表の ${id} が強敵でない`);
    if (!B.ROUTES["boss@" + s]) F(`強敵 ${id} の性格 ${s} に曲が無い`);
  }
  const bosses = Object.keys(E).filter((k) => E[k].boss && !E[k].majin);
  const styles = {};
  for (const id of bosses) {
    const sc = snd.bgmScene({ ...base, loc: "karna", combat: { foes: [{ id }] } }, {});
    if (!sc.startsWith("boss@")) F(`強敵 ${id} と戦う場面が ${sc}`);
    styles[sc] = (styles[sc] || 0) + 1;
    if (!snd.bgmTrackFor(sc)) F(`強敵 ${id} の場面 ${sc} に曲が無い`);
  }
  if (Object.keys(styles).length < 3) F(`強敵の曲の性格が ${Object.keys(styles).join("・")} だけ`);
  const cool = snd.bgmScene({ ...base, loc: "karna", combat: { foes: [{ id: "kain" }] } }, {});
  const eerie = snd.bgmScene({ ...base, loc: "karna", combat: { foes: [{ id: "bonedragon" }] } }, {});
  if (cool !== "boss@cool" || eerie !== "boss@eerie") F(`眷属カインが ${cool}・屍竜が ${eerie}（かっこいい・不気味のはず）`);
  const weak = Object.keys(E).find((k) => !E[k].boss && !E[k].majin && E[k].tier <= 2);
  if (snd.bgmScene({ ...base, loc: "karna", combat: { foes: [{ id: weak }] } }, {}) !== "battle") F("ふつうの戦闘の場面が変わった");

  ok(`S6 ボス（討てる使徒 ${n} 体と長編 ${sagas.length} にそれぞれ専用曲・強敵 ${Object.entries(styles).map(([k, v]) => `${k.slice(5)} ${v}`).join("・")}）`);
};
