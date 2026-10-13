// V17a（t05）「暁鐘会（千回の鐘）」（src/data/v17a_bells.js）
// - 帝都で起きる一度きりの出来事。起きにくい。選択肢が三つ以上
// - どの選択肢でも（判定の成否どちらでも）戦いにならず、死なず、状態も付かず、出来事は終わる。千回目でも何も起きない
// - 裏で金を出す者（の名・ほのめかし）が出ない。魔王の名も出さない
// - 文に数字・「！」・見せない言葉が無い。文の癖（千字あたり）が多すぎない
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintFile } from "../../tools/prose_lint.mjs";

const PROFILE = { name: "テスト", sex: "男", age: 30, history: "", personality: "無口", origin: "village" };
const NARR = /[0-9０-９]|！|!/;
const BANNED = /見世物|観客|客席|舞台|台本|言霊/;
const HIDDEN = /ディエラン|百面|千面|仮面|魔王|ガイゼリク|夜哭|使徒|金を出/;

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("V17a 暁鐘会: " + m); };
  const G0 = loadEngine();
  const D0 = G0.data;
  const ids = ["v17a_bells", "v17a_bells_last"];
  const evs = ids.map((id) => D0.EVENTS.find((e) => e.id === id));
  if (!evs[0]) return F("出来事 v17a_bells が無い");
  const e0 = evs[0];
  if (!e0.where.includes("garmund")) F("帝都で起きない");
  if (!e0.once) F("一度きりでない");
  if (!(e0.w > 0 && e0.w <= 2)) F(`起きやすさが ${e0.w}（小さく）`);
  if (e0.choices.length < 3) F("選択肢が少ない");

  const outs = (c) => [c.ok, c.ng, c.win].filter(Boolean);
  let chars = 0;
  for (const e of evs.filter(Boolean)) {
    const texts = [e.title, e.text];
    for (const c of e.choices) {
      texts.push(c.label);
      if (c.fight) F(`${e.id}「${c.label}」: 戦いになる`);
      if (c.next && !ids.includes(c.next)) F(`${e.id}「${c.label}」: 鐘の出来事の外へ続く（${c.next}）`);
      for (const o of outs(c)) {
        texts.push(o.text, o.memo, o.chron);
        for (const k of ["fight", "e3fight", "cond", "sanity", "curse", "dropCompanion", "companion", "c2dead"]) if (o[k] != null) F(`${e.id}「${c.label}」: 結果に ${k}（何も起きないはず）`);
        if (o.next && !ids.includes(o.next)) F(`${e.id}「${c.label}」: 鐘の出来事の外へ続く（${o.next}）`);
        if (o.hp && o.hp < -2) F(`${e.id}「${c.label}」: 傷が重い`);
      }
    }
    for (const t of texts.filter(Boolean)) {
      chars += t.length;
      if (NARR.test(t)) F(`${e.id}: 文に数字か「！」：${t.slice(0, 30)}`);
      if (BANNED.test(t)) F(`${e.id}: 見せない言葉「${t.match(BANNED)[0]}」`);
      if (HIDDEN.test(t)) F(`${e.id}: 出さないもの「${t.match(HIDDEN)[0]}」`);
    }
  }
  const r = lintFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "data", "v17a_bells.js"));
  if (r.rate > 2.5) F(`文の癖が多い：千字あたり ${r.rate.toFixed(2)} ${JSON.stringify(r.counts)}`);
  if (r.dots > 2.0) F(`「……」が多い：千字あたり ${r.dots.toFixed(2)}`);

  // ---------------------------------------------------------------- 遊んで確かめる
  const GB = loadEngine();   // 冒険は毎回 newGame で作り直す（読み込みは一度）
  const start = (seed) => {
    const G = GB;
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats: Object.fromEntries(D.STATS.map((k) => [k, 40])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), goal: "rich", profile: { ...PROFILE } });
    const S = G.S;
    S.loc = "garmund"; S.visited.garmund = true; S.mode = "explore"; S.event = null; S.combat = null;
    return G;
  };
  const pool = (G) => { const S = G.S; const tags = G.eventTags(); return G.data.EVENTS.filter((e) => e.w > 0 && e.where.some((w) => tags.includes(w)) && !(e.once && S.flags["ev:" + e.id]) && (!e.cond || e.cond(S))).map((e) => e.id); };
  {
    const G = start(3);
    if (!pool(G).includes("v17a_bells")) F("帝都で起きうる出来事に入っていない");
    G.S.loc = "leavel";
    if (pool(G).includes("v17a_bells")) F("帝都の外で起きる");
  }
  let tried = 0, reachedLast = false;
  for (const e of evs.filter(Boolean)) {
    for (let i = 0; i < e.choices.length; i++) {
      for (const roll of [0.01, 0.99]) {
        const G = start(50 + tried++);
        const S = G.S;
        const conds0 = [...S.conds], comps0 = S.companions.length;
        try {
          G.startEvent(e.id);
          G.rand = () => roll;
          for (let g = 0; g < 4 && S.mode === "event"; g++) {
            const list = G.eventChoices();
            const p = (g === 0 && list.find((x) => x.i === i)) || list[0];
            if (S.event === "v17a_bells_last") reachedLast = true;
            G.act("ev:" + p.i);
            if (S.mode === "combat") { F(`${e.id}「${e.choices[i].label}」（${roll}）: 戦いになる`); break; }
          }
          if (S.over) F(`${e.id}「${e.choices[i].label}」（${roll}）: 死んだ`);
          if (S.mode === "event") F(`${e.id}「${e.choices[i].label}」（${roll}）: 出来事が終わらない`);
          if (S.conds.length !== conds0.length) F(`${e.id}「${e.choices[i].label}」（${roll}）: 状態が付いた`);
          if (S.companions.length !== comps0) F(`${e.id}「${e.choices[i].label}」（${roll}）: 仲間が増減した`);
          if (e.id === "v17a_bells" && pool(G).includes("v17a_bells")) F("一度起きたのに、また起きうる");
        } catch (err) { F(`${e.id}「${e.choices[i].label}」（${roll}）で落ちる：${err.message}`); }
      }
    }
  }
  if (!reachedLast) F("千回目（v17a_bells_last）にたどり着けない");
  if (!bad) ok(`V17a 暁鐘会（出来事 ${evs.length}・選び方 ${tried}・文 ${chars} 字・癖 ${r.rate.toFixed(2)}／千字）`);
};
