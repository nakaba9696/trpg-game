// U19：旅立ちの BGM。「この者で旅立つ」のあとの導入（あらすじ）は、作成画面（タイトル）の曲から旅立ちの曲に切り替わり、最初の町に着けば町の曲になる
// - 場面の表に旅立ち（depart）があり、曲がある。タイトルの曲とも町の曲とも違う
// - 旅立ちの曲は長調で前へ進む速さ、金管が主旋律を持つ（持ち主の注文：高揚感・前へ進むリズム・開けた和音・管の主旋律）
// - 場面の決め方：導入を出している間は depart、作成画面は title、冒険が始まれば町など
// - 画面：「この者で旅立つ」を押したらすぐ切り替える。導入の画面（#setup の data-step="prologue"）を見る
// - 導入（あらすじ）の締めは問いかけずに言い切る
// - 音はページの中の Web Audio だけ（外の音のファイルを読み込まない・音量ミキサーに触らない）は S4 の決まりのまま（sound_bgm.js）
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok }) => {
  const F = (m) => fail("U19 旅立ちの BGM: " + m);
  const D = G.data, B = D.BGM;
  const store = {};
  const localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  const c = vm.createContext({ console, localStorage, G });
  for (const f of ["sound.js", "sound_bgm.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), c, { filename: "ui/" + f });
  const snd = G.sound;

  if (!snd.bgmScenes.includes("depart")) F("場面に旅立ち（depart）が無い");
  const id = snd.bgmTrackFor("depart");
  const tr = id && B.TRACKS[id];
  if (!tr) { F("旅立ちの場面に曲が無い"); return; }
  if (id === snd.bgmTrackFor("title")) F("旅立ちの曲がタイトル（作成画面）の曲と同じ");
  if (id === snd.bgmTrackFor("town")) F("旅立ちの曲が町の曲と同じ");
  if (!["major", "mixo"].includes(tr.scale)) F(`旅立ちの曲が長調でない（${tr.scale}）`);
  if (!(tr.bpm >= 96)) F(`旅立ちの曲が遅い（${tr.bpm}）`);
  if (!tr.parts.some((p) => p.inst === "brass" && p.kind === "mel")) F("旅立ちの曲に金管の主旋律が無い");
  if (!tr.parts.some((p) => p.kind === "drum")) F("旅立ちの曲に前へ進む打楽器が無い");
  if (!((D.MIX.BGM || {})[id] > 0)) F("旅立ちの曲の大きさの倍率が無い（tools/loudness.mjs で測る）");

  // 場面の決め方
  const town = Object.keys(D.LOCS).find((k) => D.LOCS[k].type === "town" && !["majin", "realm", "e2_kitchen"].includes(D.LOCS[k].scene));
  const S = { loc: town, mode: "explore", phase: 0, log: [] };
  const cases = [
    ["作成画面", null, { title: true }, "title"],
    ["導入（冒険の前）", null, { title: true, depart: true }, "depart"],
    ["導入（前の冒険が残っている）", S, { title: true, depart: true }, "depart"],
    ["最初の町に着いた", S, {}, "town"],
  ];
  for (const [what, st, v, want] of cases) { const got = snd.bgmScene(st, v); if (got !== want) F(`${what}の場面が ${got}（${want} のはず）`); }

  // 画面の切り替え
  const bg = readFileSync(new URL("../../src/ui/sound_bgm.js", import.meta.url), "utf8");
  if (!/dataset\.step === "prologue"/.test(bg)) F("導入の画面を見て旅立ちの曲にしていない");
  const setup = readFileSync(new URL("../../src/ui/setup.js", import.meta.url), "utf8");
  const go = setup.slice(setup.indexOf('btn("この者で旅立つ"'), setup.indexOf('"c-go")'));
  if (!/bgmUpdate\(\)/.test(go)) F("「この者で旅立つ」を押してすぐ曲を切り替えていない");

  // 導入の締め：プレイヤーに「さて、どうする」と問いかけない。言い切って終える
  const close = D.PROLOGUE.close;
  if (/どうする|[？?]|……\s*$/.test(close)) F(`導入の締めが問いかけか「……」で終わる：${close}`);
  if (!/。$/.test(close)) F("導入の締めが言い切りで終わらない");

  ok(`U19 旅立ちの BGM（${tr.name}・${tr.bpm} BPM・${snd.bgmCompile(tr).len.toFixed(0)} 秒）`);
};
