// S4：場面ごとの BGM（src/data/s4_tracks.js の作曲データと src/ui/sound_bgm.js）
// - どの場面にも曲があり、場面の表が知らない曲を指していない。どの曲もどこかの場面で鳴る
// - 曲のデータが壊れていない：一小節の刻みの数・和音・楽器・打楽器が読め、音域が楽器に収まり、一巡りが 30〜90 秒、音がループの外にはみ出さない
// - 音量の設定（bgm・bgmOn）が古い記録（項目が無い）でも既定値で動き、おかしな値は丸める
// - 場面の切り替え：タイトル・町の昼と夜・酒場・宿・街道・迷宮・深淵・戦闘・強敵・使徒・死・その後で曲が変わる。遊びながら出る場面はすべて曲がある
// - AudioContext も DOM も無い所で、例外を出さず何もしない
// - 曲のファイル（assets/music/）：ビルドが別ファイルで載せ、あればそれを鳴らす口がある
// 波形（音割れ・無音・重さ）は tools/bgm_render.mjs で確かめる（Chromium が要るので CI では動かさない）
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import vm from "node:vm";
import path from "node:path";
import { siteAssets } from "../../tools/assets.mjs";

export default ({ G, fail, ok, seeded }) => {
  const F = (m) => fail("S4 " + m);
  const D = G.data;
  const B = D.BGM;
  if (!B || !B.TRACKS || !B.SCENES) { F("曲の表（G.data.BGM）が無い"); return; }
  // 古い設定（S3 までの項目だけ）を localStorage に入れた状態で、効果音と BGM の画面側を読む
  const old = { mute: false, sfx: 0.5, amb: 0.2, sfxOn: true, ambOn: false, dice: true };
  const store = { "morsveld-sound": JSON.stringify(old) };
  const localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  const c = vm.createContext({ console, localStorage, G });
  vm.runInContext(readFileSync(new URL("../../src/ui/sound.js", import.meta.url), "utf8"), c, { filename: "ui/sound.js" });
  vm.runInContext(readFileSync(new URL("../../src/ui/sound_bgm.js", import.meta.url), "utf8"), c, { filename: "ui/sound_bgm.js" });
  const snd = G.sound;

  // ---------------------------------------------------------------- 場面と曲の表
  const want = ["title", "town", "town_night", "tavern", "inn", "road", "dungeon", "abyss", "battle", "boss", "apostle", "death", "epilogue"];
  for (const s of want) if (!snd.bgmScenes.includes(s)) F(`場面 ${s} が無い`);
  for (const s of snd.bgmScenes) {
    const list = B.SCENES[s] || [];
    if (!list.length) F(`場面 ${s} に曲が無い`);
    if (list.length > 2) F(`場面 ${s} の曲が ${list.length} 曲（1〜2 曲のはず）`);
    for (const id of list) if (!B.TRACKS[id]) F(`場面 ${s} が知らない曲 ${id} を指す`);
  }
  for (const s of Object.keys(B.SCENES)) if (!snd.bgmScenes.includes(s)) F(`曲の表に知らない場面 ${s}`);
  // S6：場面を細かく分けた表（ROUTES。町の時間帯・地方・ボスごと）で鳴る曲も、どこかで鳴る曲に数える
  const used = new Set([...Object.values(B.SCENES).flat(), ...Object.values(B.ROUTES || {}).flat()]);
  for (const id of Object.keys(B.TRACKS)) if (!used.has(id)) F(`曲 ${id} がどの場面でも鳴らない`);

  // ---------------------------------------------------------------- 曲のデータ
  // 楽器ごとの音域（MIDI 番号）。外れると聞こえない・耳に刺さる
  const RANGE = { bass: [26, 64], sub: [26, 64], tuba: [28, 64], cello: [28, 72], drone: [24, 60], organ: [28, 100], hammond: [36, 96], brass: [40, 96], guitar: [28, 96], lead: [45, 100], strings: [36, 100], violin: [55, 100], choir: [40, 88], bell: [36, 100], celesta: [55, 108], harp: [36, 100], lute: [40, 90], epiano: [40, 96], reed: [40, 92], clarinet: [50, 94], flute: [60, 100], pizz: [36, 90], mandolin: [52, 96], ocarina: [57, 96] };
  for (const n of snd.bgmInsts) if (!RANGE[n]) F(`楽器 ${n} の音域が決まっていない（このテストに足す）`);
  const drums = new Set(snd.bgmDrumNames);
  for (const d of Object.values(snd.BGM_DRUMS)) if (!drums.has(d)) F(`打楽器の記号が知らない音 ${d} を指す`);
  let total = 0, notes = 0;
  const rows = [];
  for (const [id, tr] of Object.entries(B.TRACKS)) {
    const said = new Set();
    const P = (m) => { if (!said.has(m)) { said.add(m); F(`曲 ${id}：${m}`); } };
    if (!tr.name || !tr.mood) P("名前か雰囲気の説明が無い");
    if (!snd.BGM_SCALES[tr.scale]) P(`音階 ${tr.scale} が無い`);
    if (!(tr.bpm >= 40 && tr.bpm <= 200)) P(`速さ ${tr.bpm}`);
    if (!(tr.gain === undefined || (tr.gain > 0.2 && tr.gain <= 2))) P(`大きさ ${tr.gain}`);
    for (const ch of tr.prog || []) if (!snd.bgmChord(ch, tr.scale)) P(`和音 ${ch} が読めない`);
    const C = snd.bgmCompile(tr);
    C.errors.forEach(P);
    if (C.steps !== tr.meter * tr.bars) P("刻みの数が小節と合わない");
    if (!(C.len >= 30 && C.len <= 90)) P(`一巡りが ${C.len.toFixed(1)} 秒（30〜90 秒のはず）`);
    total += C.len;
    const perPart = (tr.parts || []).map(() => 0);
    C.at.forEach((evs, step) => evs.forEach((e) => {
      perPart[e.part]++;
      if (e.drum) { if (!drums.has(e.drum)) P(`打楽器 ${e.drum} が無い`); return; }
      notes++;
      if (!snd.bgmInsts.includes(e.inst)) { P(`楽器 ${e.inst} が無い`); return; }
      const [lo, hi] = RANGE[e.inst];
      for (const m of e.notes) if (!(m >= lo && m <= hi)) P(`${e.inst} の音 ${m} が音域（${lo}〜${hi}）の外`);
      if (step + e.len > C.steps) P(`${e.inst} の音がループの終わりをはみ出す`);
      if (!(e.vel > 0 && e.vel <= 1)) P("音の強さがおかしい");
    }));
    perPart.forEach((n, i) => { if (!n) P(`${i} 番目のパート（${tr.parts[i].inst || "打楽器"}）が一度も鳴らない`); });
    // 旋律か和音が鳴っていない小節が続かない（無音の継ぎ目が無い）
    let empty = 0, maxEmpty = 0;
    for (let b = 0; b < tr.bars; b++) {
      let any = false;
      for (let i = 0; i < tr.meter && !any; i++) any = C.at[b * tr.meter + i].some((e) => !e.drum);
      empty = any ? 0 : empty + 1; maxEmpty = Math.max(maxEmpty, empty);
    }
    if (maxEmpty > 1) P(`音程のある音が ${maxEmpty} 小節続けて鳴らない`);
    rows.push(`${id} ${C.len.toFixed(0)}秒`);
  }
  // 決まった種の揺らぎ：同じ曲は何度作っても同じ表
  const t0 = Object.keys(B.TRACKS)[0];
  if (JSON.stringify(snd.bgmCompile(B.TRACKS[t0]).at) !== JSON.stringify(snd.bgmCompile(B.TRACKS[t0]).at)) F("同じ曲の表が作るたびに変わる");

  // ---------------------------------------------------------------- 音量の設定（古い記録でも動く）
  const st = snd.settings;
  if (st.bgm !== snd.BGM_DEF.bgm || st.bgmOn !== true) F(`古い設定を読むと BGM の音量が ${st.bgm}・${st.bgmOn}（既定値 ${snd.BGM_DEF.bgm}・true のはず）`);
  if (st.sfx !== 0.5 || st.ambOn !== false) F("BGM の既定値を足すときに、古い効果音の設定を消した");
  if (!(snd.BGM_DEF.bgm > 0 && snd.BGM_DEF.bgm <= 0.5)) F(`BGM の既定の音量 ${snd.BGM_DEF.bgm} が控えめでない`);
  const S1 = snd.bgmSettings({});
  if (S1.bgm !== snd.BGM_DEF.bgm || !S1.bgmOn || S1.mute) F("項目の無い設定で既定値にならない");
  if (snd.bgmSettings({ bgm: "x" }).bgm !== snd.BGM_DEF.bgm || snd.bgmSettings({ bgm: 7 }).bgm !== 1 || snd.bgmSettings({ bgm: -1 }).bgm !== 0) F("おかしな音量を丸めない");
  if (snd.bgmSettings({ bgmOn: false }).bgmOn !== false || snd.bgmSettings(null).bgmOn !== true) F("BGM のオンオフを読めない");
  if (snd.bgmSettings({ mute: true }).mute !== true) F("全体の消音を BGM が見ない");

  // ---------------------------------------------------------------- 場面の切り替え
  const L = D.LOCS, E = D.ENEMIES;
  const find = (f) => Object.keys(L).find((k) => f(L[k]));
  const town = find((l) => l.type === "town" && !["majin", "realm", "e2_kitchen"].includes(l.scene));
  const wild = find((l) => l.type === "wild" && !["majin", "realm", "e2_kitchen"].includes(l.scene));
  const dun = find((l) => l.type === "dungeon" && !["majin", "realm", "e2_kitchen"].includes(l.scene));
  const dread = find((l) => ["majin", "realm"].includes(l.scene));
  const foe = (f) => Object.keys(E).find((k) => f(E[k]));
  const weak = foe((d) => !d.boss && !d.majin && d.tier <= 2), boss = foe((d) => d.boss && !d.majin), majin = foe((d) => d.majin);
  const base = { loc: town, mode: "explore", phase: 0, log: [] };
  const cases = [
    ["タイトル", base, { title: true }, "title"],
    ["冒険が無い", null, {}, "title"],
    ["町の昼", base, {}, "town"],
    ["町の夜", { ...base, phase: 3 }, {}, "town_night"],
    ["酒場", { ...base, mode: "fac", fac: "tavern" }, {}, "tavern"],
    ["宿", { ...base, mode: "fac", fac: "inn" }, {}, "inn"],
    ["裏路地", { ...base, mode: "fac", fac: "alley" }, {}, "town_night"],
    ["街道", { ...base, loc: wild }, {}, "road"],
    ["迷宮", { ...base, loc: dun, depth: 1 }, {}, "dungeon"],
    ["深淵", { ...base, loc: dread }, {}, "abyss"],
    ["戦闘", { ...base, mode: "combat", combat: { foes: [{ id: weak }] } }, {}, "battle"],
    ["強敵", { ...base, mode: "combat", combat: { foes: [{ id: weak }, { id: boss }] } }, {}, "boss"],
    ["使徒", { ...base, mode: "combat", combat: { foes: [{ id: majin }] } }, {}, "apostle"],
    ["死", { ...base, over: "dead" }, {}, "death"],
    ["その後", { ...base, over: "end" }, {}, "epilogue"],
  ];
  for (const [what, S, view, scene] of cases) {
    if (what === "深淵" && !dread) continue;
    const got = snd.bgmScene(S, view);
    if (got !== scene) F(`${what}の場面が ${got}（${scene} のはず）`);
  }
  const tracks = new Set(cases.map(([, S, v]) => snd.bgmTrackFor(snd.bgmScene(S, v))));
  if (tracks.size < 10) F(`場面が変わっても曲があまり変わらない（${tracks.size} 曲）`);
  if (snd.bgmTrackFor("town") === snd.bgmTrackFor("battle") || snd.bgmTrackFor("title") === snd.bgmTrackFor("dungeon")) F("町と戦闘（タイトルと迷宮）が同じ曲");
  const two = Object.keys(B.SCENES).find((s) => B.SCENES[s].length === 2);
  if (two) { const a = snd.bgmTrackFor(two, true), b = snd.bgmTrackFor(two, true); if (a === b) F(`場面 ${two} の二曲が交互にならない`); }

  // 遊びながら出る場面（すべて曲がある）
  const seen = new Set();
  const cls = Object.keys(D.CLASSES);
  for (let g = 0; g < 8; g++) {
    G.rand = seeded(4400 + g);
    G.P = { trophies: {}, graves: [] };
    const k = cls[g % cls.length];
    const stats = {}, caps = {};
    D.STATS.forEach((s) => { stats[s] = D.CLASSES[k].base[s] + 5; caps[s] = stats[s] + 30; });
    G.newGame({ cls: k, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    for (let step = 0; step < 300; step++) {
      const sc = snd.bgmScene(G.S, {});
      seen.add(sc);
      if (!snd.bgmScenes.includes(sc) || !snd.bgmTrackFor(sc)) F(`遊んでいて曲の無い場面 ${sc}`);
      if (G.S.over) break;
      const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
    }
  }
  for (const s of ["town", "battle"]) if (!seen.has(s)) F(`遊んでいて場面 ${s} が一度も出ない`);

  // ---------------------------------------------------------------- 音の無い所では何もしない
  try { snd.bgm("battle"); snd.bgmUpdate(); snd.bgm(null); } catch (e) { F(`AudioContext の無い所で例外：${e.message}`); }
  if (typeof snd._bgmOffline !== "function") F("書き出し用の口（_bgmOffline）が無い");

  // ---------------------------------------------------------------- 曲のファイル
  const A = { "music/town": "music/town.ogg", "music/battle2": "music/battle2.mp3" };
  if (snd.musicKey("town", "town", A) !== "music/town") F("場面の名前のファイルを拾わない");
  if (snd.musicKey("battle", "battle2", A) !== "music/battle2") F("曲の id のファイルを拾わない");
  if (snd.musicKey("dungeon", "dungeon", A) !== null) F("無いファイルを拾った");
  const dir = mkdtempSync(path.join(tmpdir(), "s4-"));
  try {
    mkdirSync(path.join(dir, "music"));
    writeFileSync(path.join(dir, "music", "town.ogg"), Buffer.alloc(3000, 1));
    writeFileSync(path.join(dir, "music", "oops.webp"), Buffer.alloc(10, 2));
    const s = siteAssets(dir);
    if (s.map["music/town"] !== "music/town.ogg") F(`曲のファイルの公開パスが違う：${JSON.stringify(s.map)}`);
    if (s.map["music/oops"]) F("assets/music/ の画像を載せた");
  } finally { rmSync(dir, { recursive: true, force: true }); }

  ok(`S4 BGM（${Object.keys(B.TRACKS).length} 曲・${snd.bgmScenes.length} 場面・合わせて ${(total / 60).toFixed(1)} 分・音符 ${notes}・遊んで出た場面 ${[...seen].join(" ")}）`);
};
