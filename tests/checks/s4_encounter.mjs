// S4：戦闘開始の合図と敵の咆哮（src/ui/sound.js の roarOf・encounterOf・cues）と、画面の短い演出（src/ui/zs4_encounter.js）
// - 敵の分類（使徒・亡霊・竜・巨人・獣・翼・不定形・群れ・人の姿）で咆哮が変わり、どの敵にも鳴らせる咆哮がある
// - 戦闘が始まると、開始の合図（強敵・使徒・不意を突いたときは重い版）と咆哮を、その手番の音の先頭で鳴らす呼び出しがある
// - 演出の強さ（ふつう・不意を突いた・強敵・使徒）と見出しの言葉。揺れと光は prefers-reduced-motion で止める
// - AudioContext も DOM も無い所で、例外を出さず何もしない
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok, seeded }) => {
  const F = (m) => fail("S4 戦闘開始 " + m);
  const D = G.data, E = D.ENEMIES;
  const c = vm.createContext({ console, G });
  for (const f of ["sound.js", "zs4_encounter.js"]) vm.runInContext(readFileSync(new URL(`../../src/ui/${f}`, import.meta.url), "utf8"), c, { filename: "ui/" + f });
  const snd = G.sound;

  // ---------------------------------------------------------------- 分類 → 咆哮
  const find = (f) => Object.keys(E).find((k) => f(E[k]));
  const want = [
    ["使徒", find((d) => d.majin), "majin"],
    ["亡霊", find((d) => d.undead && !d.majin), "roarUndead"],
    ["竜", find((d) => d.shape === "dragon" && !d.undead && !d.majin), "roarDragon"],
    ["巨人", find((d) => d.shape === "giant" && !d.undead && !d.majin), "roarGiant"],
    ["獣", find((d) => d.shape === "beast" && !d.undead && !d.majin), "roarBeast"],
    ["翼", find((d) => d.shape === "winged" && !d.undead && !d.majin), "roarWing"],
    ["不定形", find((d) => d.shape === "blob" && !d.undead && !d.majin), "roarBlob"],
    ["群れ", find((d) => d.shape === "swarm" && !d.undead && !d.majin), "roarSwarm"],
    ["人の姿", find((d) => d.shape === "humanoid" && !d.undead && !d.majin), "roarHuman"],
  ];
  for (const [what, id, roar] of want) {
    if (!id) continue;
    const got = snd.roarOf(E[id]);
    if (got !== roar) F(`${what}（${id}）の咆哮が ${got}（${roar} のはず）`);
  }
  const roars = new Set();
  for (const [id, d] of Object.entries(E)) {
    const r = snd.roarOf(d);
    roars.add(r);
    if (!snd.names.includes(r)) F(`${id} の咆哮 ${r} が効果音に無い`);
  }
  if (roars.size < 7) F(`咆哮が ${roars.size} 種しかない`);
  for (const n of ["battle", "battleBig"]) if (!snd.names.includes(n)) F(`開始の合図 ${n} が無い`);

  // ---------------------------------------------------------------- 強さ
  const S0 = (ids, extra) => ({ combat: { foes: ids.map((id, i) => ({ id, name: E[id].name + i, hp: 1 })) }, log: [{ k: "title", text: "戦闘" }, ...(extra || [])] });
  const weak = find((d) => !d.boss && !d.majin && d.shape === "beast"), boss = find((d) => d.boss && !d.majin), majin = find((d) => d.majin);
  const lv = (S) => snd.encounterOf(S).level;
  if (lv(S0([weak])) !== "normal" || snd.encounterOf(S0([weak])).sting !== "battle") F("ふつうの戦闘が normal・battle でない");
  if (lv(S0([weak], [{ k: "note", text: "不意を突いた。敵は深手を負っている。" }])) !== "ambush") F("不意を突いた戦闘が ambush でない");
  if (lv(S0([weak, boss])) !== "boss" || snd.encounterOf(S0([weak, boss])).roar !== snd.roarOf(E[boss])) F("ボスがいる戦闘で、ボスが先頭に立って吠えない");
  if (lv(S0([boss, majin])) !== "majin" || snd.encounterOf(S0([majin])).roar !== "majin") F("使徒の戦闘が majin でない");
  if (snd.encounterOf(S0([boss])).sting !== "battleBig") F("強敵で重い合図にならない");
  // 前の戦闘の「不意を突いた」は次の戦闘に持ち越さない
  const old = S0([weak]); old.log = [{ k: "title", text: "戦闘" }, { k: "note", text: "不意を突いた。" }, { k: "title", text: "戦闘" }];
  if (lv(old) !== "normal") F("前の戦闘の不意打ちを持ち越した");

  // ---------------------------------------------------------------- 見出し
  const E1 = G.s4enc;
  if (!E1 || !E1.cardOf) { F("見出しの中身（G.s4enc.cardOf）が無い"); } else {
    const c1 = E1.cardOf(S0([weak, weak, weak, boss]));
    if (c1.level !== "boss" || !c1.title || !/ほか 2/.test(c1.names) || !(c1.ms > 1500)) F(`強敵の見出しがおかしい：${JSON.stringify(c1)}`);
    for (const l of ["normal", "ambush", "boss", "majin"]) if (!E1.TITLE[l]) F(`強さ ${l} の見出しの言葉が無い`);
    if (E1.cardOf({ combat: null }) !== null) F("戦闘でないのに見出しを作る");
  }
  const css = readFileSync(new URL("../../src/ui/zs4_encounter.css", import.meta.url), "utf8");
  if (!/prefers-reduced-motion: reduce[\s\S]*s4shake[\s\S]*animation: none/.test(css)) F("動きを減らす設定で揺れを止めていない");

  // ---------------------------------------------------------------- 遊びの中：戦闘が始まると合図と咆哮を先頭で鳴らす
  const cls = Object.keys(D.CLASSES);
  let starts = 0;
  const heard = new Set();
  for (let g = 0; g < 10 && starts < 12; g++) {
    G.rand = seeded(9100 + g);
    G.P = { trophies: {}, graves: [] };
    const k = cls[g % cls.length];
    const stats = {}, caps = {};
    D.STATS.forEach((s) => { stats[s] = D.CLASSES[k].base[s] + 5; caps[s] = stats[s] + 30; });
    G.newGame({ cls: k, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    snd.forget(); snd.cues(G.S);
    for (let step = 0; step < 250 && !G.S.over; step++) {
      const was = !!G.S.combat;
      const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
      const cues = snd.cues(G.S);
      if (G.S.combat && !was) {
        starts++;
        const en = snd.encounterOf(G.S);
        if (cues[0] !== en.sting || cues[1] !== en.roar) F(`戦闘が始まったのに先頭が ${cues.slice(0, 2).join(",")}（${en.sting},${en.roar} のはず）`);
        heard.add(en.roar);
      }
    }
  }
  if (!starts) F("遊んでいて戦闘が一度も始まらない");
  // ゲームの途中で戦闘を始める（engine の G.startCombat）
  G.rand = seeded(9300);
  G.newGame({ cls: cls[0], stats: Object.fromEntries(D.STATS.map((s) => [s, 10])), caps: Object.fromEntries(D.STATS.map((s) => [s, 40])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
  snd.forget(); snd.cues(G.S);
  G.startCombat([boss]);
  const c2 = snd.cues(G.S);
  if (c2[0] !== "battleBig" || c2[1] !== snd.roarOf(E[boss])) F(`ボス戦を始めた音が ${c2.join(",")}`);

  // ---------------------------------------------------------------- 音の無い所
  try { snd.play("roarDragon"); snd.play("battleBig"); } catch (e) { F(`AudioContext の無い所で例外：${e.message}`); }

  ok(`S4 戦闘開始の合図と咆哮（咆哮 ${roars.size} 種・遊んで始まった戦闘 ${starts} 回・聞こえた咆哮 ${[...heard].join(" ")}）`);
};
