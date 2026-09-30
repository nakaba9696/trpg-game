// S1: 音（ui/sound.js）。AudioContext も DOM も無い所で、例外を出さず何も鳴らさない。
// 遊びながら選ばれる音がすべて実在するか、M1 の術（氷・雷・呪い・加護）にそれぞれの音がつながるかを見る。
// 波形（無音・音割れ・長さ）は tools/sound_check.mjs で確かめる（Chromium が要るので CI では動かさない）
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  vm.runInContext(readFileSync(new URL("../../src/ui/sound.js", import.meta.url), "utf8"), vm.createContext({ console, G }), { filename: "ui/sound.js" });
  const snd = G.sound;
  const need = ["click", "page", "ok", "ng", "crit", "fumble", "slash", "blunt", "hurt", "kill", "death", "coin", "item", "levelup", "door", "sleep", "depart", "trophy", "majin", "fire", "ice", "thunder", "curse", "bless", "heal"];
  for (const n of need) if (!snd.names.includes(n)) fail(`効果音 ${n} が無い`);
  for (const id of Object.keys(D.LOCS)) {
    for (const depth of [0, 1]) {
      const a = snd.ambFor({ loc: id, mode: "explore", depth, log: [] });
      if (a !== null && !snd.ambNames.includes(a)) fail(`${id} の環境音 ${a} が無い`);
    }
  }
  if (snd.ambFor({ loc: Object.keys(D.LOCS)[0], mode: "explore", depth: 0, weather: "雨", log: [] }) !== "rain") fail("雨の環境音に切り替わらない");

  // M1 の術：行動の記録 → その系統の音
  const spell = (you, want) => {
    const S = { loc: Object.keys(D.LOCS)[0], log: [{ k: "nar", text: "前" }], gold: 0, inv: {} };
    snd.forget(); snd.cues(S);
    S.log.push({ k: "you", text: you }, { k: "dice", text: "", reason: "術", ok: true, crit: false, fumble: false }, { k: "sys", text: "オークに 5 のダメージ（残り 3/18）" });
    const got = snd.cues(S);
    if (got[0] !== want || (want !== "depart" && (got.includes("slash") || got.includes("ok")))) fail(`「${you}」の音が ${got.join(",")}（${want} のはず）`);
  };
  spell("オークに氷の魔法を放つ", "ice");
  spell("雷の魔法を呼ぶ", "thunder");
  spell("オークに呪いの言葉を吐く", "curse");
  spell("加護を祈る", "bless");
  spell("オークに炎の魔法を放つ", "fire");
  spell("凍てつく街道へ向かう", "depart");

  // 遊びながら音を選ばせる（鳴らすのは何もしない）
  const heard = new Set();
  const cls = Object.keys(D.CLASSES);
  for (let g = 0; g < 12; g++) {
    G.rand = seeded(7000 + g);
    G.P = { trophies: {}, graves: [] };
    const c = cls[g % cls.length];
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = D.CLASSES[c].base[k] + 5; caps[k] = stats[k] + 30; });
    G.newGame({ cls: c, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    snd.forget();
    snd.play("slash"); snd.react(G.S); snd.ambient("town");
    for (let step = 0; step < 300 && !G.S.over; step++) {
      const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
      for (const n of snd.cues(G.S)) { if (!snd.names.includes(n)) fail(`知らない音 ${n}`); heard.add(n); }
    }
  }
  for (const n of ["page", "ok", "ng", "battle", "hurt", "coin"]) if (!heard.has(n)) fail(`遊んでいて ${n} が一度も選ばれない`);
  ok(`音（効果音 ${snd.names.length} 種・環境音 ${snd.ambNames.length} 種・遊んで選ばれた音 ${heard.size} 種：${[...heard].join(" ")}）`);
};
