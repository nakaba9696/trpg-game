// S6：曲を増やして、場面を細かく分けて選ぶ（src/data/s6_tracks*.js・src/ui/sound_bgm_s6.js）
// - どの場面にも曲がある。細かく分けた表（ROUTES）は「元の場面@分け方」で、元の場面が実在し、知らない曲を指さない。どの曲もどこかで鳴る
// - 町・地方 → 分け方の表（S6）が、実在する場所・国・地方と、曲のある分け方を指す
// - 町の朝・夕、港・村・聖地・北の町、静かな夜、地方ごとの旅が、それぞれの曲になる（ほかの町・街道は元の曲のまま）。二曲ある分け方は交互に鳴る
// - 町・宿・酒場・夕暮れの落ち着く曲が 8 曲以上・地方の旅の曲が 4 曲以上あり、落ち着く曲はゆったりしている
// - 遊びながら出る場面には、すべて曲がある。曲のファイル（assets/music/）は元の場面の名前でも探す
// - 音はページの中の Web Audio だけ（持ち主の決まり）：音の係がパソコンの音量・出力先・マイク・ほかのアプリに触る口を使っていない
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok, seeded }) => {
  const F = (m) => fail("S6 " + m);
  const D = G.data;
  const B = D.BGM;
  if (!B || !B.ROUTES || !B.S6) { F("曲の分け方の表（G.data.BGM.ROUTES・S6）が無い"); return; }
  const store = {};
  const localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  const c = vm.createContext({ console, localStorage, G });
  for (const f of ["sound.js", "sound_bgm.js", "sound_bgm_s6.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), c, { filename: "ui/" + f });
  const snd = G.sound;
  if (!snd.bgmScene._s6 || !snd.bgmTrackFor._s6) F("場面の決め方を包んでいない");

  // ---------------------------------------------------------------- 表
  for (const s of snd.bgmScenes) if (!(B.SCENES[s] || []).some((id) => B.TRACKS[id])) F(`場面 ${s} に曲が無い`);
  for (const [k, list] of Object.entries(B.ROUTES)) {
    const [base, v] = k.split("@");
    if (!v || !snd.bgmScenes.includes(base)) F(`分け方 ${k} の元の場面が無い（「元の場面@分け方」で書く）`);
    if (!list.length) F(`分け方 ${k} に曲が無い`);
    for (const id of list) if (!B.TRACKS[id]) F(`分け方 ${k} が知らない曲 ${id} を指す`);
  }
  const used = new Set([...Object.values(B.SCENES).flat(), ...Object.values(B.ROUTES).flat()]);
  for (const id of Object.keys(B.TRACKS)) if (!used.has(id)) F(`曲 ${id} がどこでも鳴らない`);
  const L = D.LOCS;
  const regions = new Set(Object.values(L).map((l) => l.region));
  const T = B.S6;
  const tables = [["TOWN_REGION", "town", true], ["TOWN_LOC", "town", false], ["NIGHT_REGION", "town_night", true], ["NIGHT_LOC", "town_night", false], ["ROAD_REGION", "road", true], ["ROAD_LOC", "road", false]];
  for (const [name, base, byRegion] of tables) {
    for (const [k, v] of Object.entries(T[name] || {})) {
      if (byRegion ? !regions.has(k) : !L[k]) F(`${name} が知らない${byRegion ? "国・地方" : "場所"} ${k} を指す`);
      if (!byRegion && L[k] && L[k].type !== (base === "road" ? L[k].type : "town")) F(`${name} の ${k} が町でない`);
      if (!B.ROUTES[base + "@" + v]) F(`${name} の ${k} が曲の無い分け方 ${base}@${v} を指す`);
    }
  }

  // ---------------------------------------------------------------- 場面の分け方
  const find = (f) => Object.keys(L).find((k) => f(L[k]));
  const plain = ["majin", "realm", "e2_kitchen"];
  const at = (loc, more) => Object.assign({ loc, mode: "explore", phase: 1, log: [] }, more || {});
  const townIn = (region, f) => find((l) => l.type === "town" && l.region === region && !plain.includes(l.scene) && (!f || f(l)));
  const wildIn = (region) => find((l) => l.type === "wild" && l.region === region && !plain.includes(l.scene));
  const cases = [
    ["町の夕方", at("karna", { phase: 2 }), "town@dusk"],
    ["町の朝", at("karna", { phase: 0 }), "town@morning"],
    ["王国の町の昼", at("karna"), "town"],
    ["港町の昼", at("nerva"), "town@harbor"],
    ["麦の都の昼", at("w2_granbel"), "town@village"],
    ["北の町の昼", at("garmund"), "town@north"],
    ["聖都の昼", at("w1_holy"), "town@holy"],
    ["島の町の昼", at(townIn("シェルアーク")), "town@harbor"],
    ["王国の町の夜", at("karna", { phase: 3 }), "town_night"],
    ["村の夜", at("w2_granbel", { phase: 3 }), "town_night@quiet"],
    ["聖地の夜", at("w1_holy", { phase: 3 }), "town_night@quiet"],
    ["村の裏路地", at("w2_granbel", { mode: "fac", fac: "alley" }), "town_night"],
    ["夕方の酒場", at("karna", { phase: 2, mode: "fac", fac: "tavern" }), "tavern"],
    ["夕方の宿", at("karna", { phase: 2, mode: "fac", fac: "inn" }), "inn"],
    ["王国の街道", at("forest"), "road"],
    ["帝国の街道", at(wildIn("ノルディア帝国")), "road@north"],
    ["共和国の野", at(wildIn("エルメシア共和国")), "road@east"],
    ["島の野", at(wildIn("シェルアーク")), "road@isles"],
    ["教会領の野", at(wildIn("光天教会領")), "road@holy"],
    ["人と魔の境", at(wildIn("人と魔の境")), "road@border"],
    ["夕方の迷宮", at(find((l) => l.type === "dungeon" && !plain.includes(l.scene)), { phase: 2, depth: 1 }), "dungeon"],
    ["死", at("karna", { phase: 2, over: "dead" }), "death"],
  ];
  for (const [what, S, want] of cases) {
    if (!S.loc) { F(`${what}：確かめる場所が見つからない`); continue; }
    const got = snd.bgmScene(S, {});
    if (got !== want) F(`${what}（${S.loc}）の場面が ${got}（${want} のはず）`);
    const id = snd.bgmTrackFor(got);
    if (!id || !B.TRACKS[id]) F(`${what}の場面 ${got} に曲が無い`);
    if (want.includes("@") && !(B.ROUTES[want] || []).includes(id)) F(`${what}が分け方の曲を鳴らさない（${id}）`);
  }
  if (snd.bgmScene(null, { title: true }) !== "title") F("タイトルの場面が変わった");
  const a = snd.bgmTrackFor("town@dusk", true), b = snd.bgmTrackFor("town@dusk", true);
  if (a === b) F("夕方の二曲が交互にならない");
  if (snd.bgmTrackFor("road@どこにも無い") !== snd.bgmTrackFor("road")) F("曲の無い分け方が元の場面の曲に戻らない");
  const A = { "music/town": "music/town.ogg" };
  if (snd.musicKey("town@dusk", "s6_dusk_a", A) !== "music/town") F("分けた場面で、元の場面の名前の曲のファイルを探さない");
  if (snd.musicKey("town@dusk", "s6_dusk_a", { "music/s6_dusk_a": "x.ogg" }) !== "music/s6_dusk_a") F("分けた場面で、曲の id のファイルを探さない");

  // ---------------------------------------------------------------- 曲の数と性格
  const calmScenes = ["town", "tavern", "inn", "town_night"];
  const calm = new Set();
  for (const [k, list] of Object.entries(B.ROUTES)) if (calmScenes.includes(k.split("@")[0])) list.forEach((id) => calm.add(id));
  for (const s of ["town", "tavern", "inn"]) (B.SCENES[s] || []).filter((id) => id.startsWith("s6_")).forEach((id) => calm.add(id));
  if (calm.size < 8) F(`町・宿・酒場・夕暮れの落ち着く曲が ${calm.size} 曲（8 曲以上）`);
  for (const id of calm) {
    const tr = B.TRACKS[id];
    const drums = (tr.parts || []).some((p) => p.kind === "drum" && /[kKsSnN]/.test((p.pat || []).join("")));
    if (id !== "s6_tavern2" && (tr.bpm > 110 && tr.meter !== 12)) F(`落ち着く曲 ${id} が速い（${tr.bpm}）`);
    if (drums) F(`落ち着く曲 ${id} にバスドラ・スネアが入っている`);
  }
  const roads = new Set(Object.entries(B.ROUTES).filter(([k]) => k.startsWith("road@")).flatMap(([, l]) => l));
  if (roads.size < 4) F(`地方の旅の曲が ${roads.size} 曲（4 曲以上）`);
  if (!B.TRACKS.s6_dusk_a.parts.some((p) => p.inst === "reed") || !Object.values(B.TRACKS).some((t) => t.parts.some((p) => p.inst === "mandolin")) || !Object.values(B.TRACKS).some((t) => t.parts.some((p) => p.inst === "ocarina"))) F("蛇腹・マンドリン・オカリナの曲が無い");

  // ---------------------------------------------------------------- 遊びながら出る場面
  const seen = new Set();
  const cls = Object.keys(D.CLASSES);
  for (let g = 0; g < 6; g++) {
    G.rand = seeded(6600 + g);
    G.P = { trophies: {}, graves: [] };
    const k = cls[g % cls.length];
    const stats = {}, caps = {};
    D.STATS.forEach((s) => { stats[s] = D.CLASSES[k].base[s] + 5; caps[s] = stats[s] + 30; });
    G.newGame({ cls: k, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    for (let step = 0; step < 300; step++) {
      const sc = snd.bgmScene(G.S, {});
      seen.add(sc);
      const id = snd.bgmTrackFor(sc);
      if (!id || !B.TRACKS[id]) F(`遊んでいて曲の無い場面 ${sc}`);
      if (G.S.over) break;
      const acts = G.actions().flatMap((x) => x.list).filter((x) => !x.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
    }
  }
  if (![...seen].some((s) => s.includes("@"))) F("遊んでいて分けた場面が一度も出ない");

  // ---------------------------------------------------------------- 音はページの中だけ
  const bad = /setSinkId|getUserMedia|enumerateDevices|mediaSession|selectAudioOutput|navigator\.mediaDevices/;
  for (const f of readdirSync(new URL("../../src/ui/", import.meta.url)).filter((f) => /^sound.*\.js$/.test(f))) {
    if (bad.test(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"))) F(`${f} がページの外の音（出力先・マイク・OS の再生の表示）に触る`);
  }

  ok(`S6 曲（${Object.keys(B.TRACKS).length} 曲・分け方 ${Object.keys(B.ROUTES).length}・落ち着く曲 ${calm.size}・旅の曲 ${roads.size}・遊んで出た場面 ${[...seen].sort().join(" ")}）`);
};
