// 仲間どうしの会話（K7）：顔ぶれで選ばれる・三人の場面・仲間どうしの間柄の動きと段・型の掛け合いが 48 人のどの組でも文になる・一日の上限・古いセーブ。
// 仕組みは src/engine/zzzzzz_banter2.js、書き方は docs/talk.md の「仲間どうし（K7）」。
const BANNED = /見世物|観客|客席|舞台|台本|言霊|神々|魔王|魔人|正体|もういない|胸|童貞|貧乳|巨乳|ナイスバディ|ロリコン|体つき/;
const ON = ["win", "boss", "near", "death", "arrive"];

export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("掛け合いK7: " + m); };
  const D0 = G0.data;
  const P = D0.C2_PEOPLE || {};
  const ids = Object.keys(P).filter((k) => P[k].join);
  const TK0 = G0.tk;
  if (!TK0 || !TK0.K7 || !TK0.typed) { F("仕組み（G.tk.K7・G.tk.typed）が無い"); return; }

  const game = (seed, join, loc) => {
    const G = loadEngine();
    const D = G.data;
    G.rand = seeded(seed);
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 24, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999;
    S.loc = loc || "nerva";
    S.mode = "explore";
    S.visited[S.loc] = true;
    (join || []).forEach((id) => G.c2Join(id));
    S.companions.forEach((c) => { c.m10 = Object.assign(c.m10 || {}, { cool: 99999 }); });
    G.tkState(S);
    return { G, D, S };
  };
  const leftover = (t) => /\{[a-z0-9_]+\}|undefined|null/.test(t);

  // ---------------------------------------------------------------- 部品：48 人全員・33 の鍵
  const PARTS = D0.TALK_PARTS || {};
  for (const id of ids) {
    const p = PARTS[id];
    if (!p) { F(`${id} の型の部品（D.TALK_PARTS）が無い`); continue; }
    if (!["kid", "young", "mid", "old"].includes(p.gen)) F(`${id}: gen が無い`);
    if (typeof p.drink !== "boolean") F(`${id}: drink が無い`);
    const minor = (P[id].age || 0) < 18 || P[id].childLook;
    if (minor && p.drink) F(`${id}: 18 歳未満・子どもの姿なのに酒好き`);
    for (const k of TK0.PART_KEYS) {
      const l = [].concat(p[k] || []);
      if (!l.length) F(`${id}.${k}: 部品が無い`);
      for (const s of l) {
        if (typeof s !== "string" || !s.trim()) { F(`${id}.${k}: 空`); continue; }
        if (BANNED.test(s)) F(`${id}.${k}: 書かない言葉「${s.match(BANNED)[0]}」：${s}`);
        if (/[「」]/.test(s)) F(`${id}.${k}: 「」は書かない：${s}`);
        for (const t of s.match(/\{[^}]*\}/g) || []) if (!["{o}", "{you}", "{foe}", "{dead}", "{place}"].includes(t)) F(`${id}.${k}: 知らない置き換え ${t}`);
      }
    }
    for (const k of ["habit", "keep"]) if (!((P[id].join.life || {})[k])) F(`${id}: 暮らしの ${k} が無い（型の地の文に要る）`);
  }

  // ---------------------------------------------------------------- 型の掛け合いが 48 人のどの組でも文になる（全組・全部の型を回す）
  {
    const { G, S } = game(901);
    const made = Object.fromEntries(ids.map((id) => [id, G.c2Make(id)]));
    let lines = 0, bad = 0;
    const types = G.tk.TYPES.concat(Object.values(G.tk.RX));
    for (const a of ids) for (const b of ids) {
      if (a === b || !PARTS[a] || !PARTS[b]) continue;
      S.companions = [made[a], made[b]];
      for (const tp of types) {
        const ln = G.tk.k7build(tp, a, b, `t:${a}|${b}`, { foe: "大きな熊", dead: "ハンス" });
        if (!ln) { if (bad++ < 5) F(`${a}→${b}: 型「${tp.title}」が組めない`); continue; }
        const obj = { id: "t", a, b, title: tp.title, lines: ln };
        for (const x of ln) {
          const t = G.tk.banterLine(obj, x, S);
          lines++;
          if (!t || leftover(t) || /「」/.test(t)) { if (bad++ < 5) F(`${a}→${b}「${tp.title}」：文にならない：${t}`); }
          if (x[0] === "" && /[！!]/.test(t)) { if (bad++ < 5) F(`${a}→${b}「${tp.title}」：地の文に「！」：${t}`); }
        }
      }
    }
    // 全部の部品の言い回し（配列のどれが選ばれても）
    for (const id of ids) for (const k of G.tk.PART_KEYS) for (const s of [].concat((PARTS[id] || {})[k] || [])) {
      S.companions = [made[id], made[ids.find((x) => x !== id)]];
      const t = G.tk.banterLine({ id: "v", a: id, b: S.companions[1].c2, lines: [] }, ["a", String(s).replace(/\{o\}/g, "{b}").replace(/\{dead\}/g, "ハンス").replace(/\{foe\}/g, "大熊")], S);
      if (leftover(t)) F(`${id}.${k}：置き換えが残る：${t}`);
    }
    if (!bad) ok(`型の掛け合い：48 人の ${ids.length * (ids.length - 1)} 組 × ${types.length} 型（${lines} 行）がすべて文になる`);
  }

  // ---------------------------------------------------------------- K7 の掛け合いのデータ
  {
    const B = D0.TALK_BANTER || [];
    const byId = new Set(B.map((b) => b.id));
    const trios = B.filter((b) => b.c);
    if (trios.length < 20) F(`三人の場面が ${trios.length}（20 以上）`);
    for (const b of trios) {
      if (!(P[b.c] || {}).join) F(`${b.id}: 三人目 ${b.c} が仲間になる人でない`);
      if (b.c === b.a || b.c === b.b) F(`${b.id}: 三人目が重なっている`);
      if (!b.lines.some((l) => Array.isArray(l) && (l[0] === "c" || /\{c\}/.test(l[1])))) F(`${b.id}: 三人目が出てこない（c が話すか、地の文に {c}）`);
      if (b.side) for (const s of ["a", "b", "none"]) if (b.side[s] && b.side[s].aff && b.side[s].aff.length > 3) F(`${b.id}: aff が長い`);
    }
    for (const b of B) {
      if (b.on && !ON.includes(b.on)) F(`${b.id}: on ${b.on} が無い`);
      if (b.on && b.side) F(`${b.id}: 反応に肩を持つ選択がある`);
      if (b.after && !byId.has(String(b.after).split("#")[0])) F(`${b.id}: 前の掛け合い ${b.after} が無い`);
      if (b.rel !== undefined && !(typeof b.rel === "number" || typeof b.rel === "string" || Array.isArray(b.rel))) F(`${b.id}: rel の形が違う`);
      for (const l of b.lines || []) if (Array.isArray(l) && !["", "a", "b", "c"].includes(l[0])) F(`${b.id}: 話し手 ${l[0]} が無い`);
      for (const l of b.lines || []) if (Array.isArray(l) && l[0] === "c" && !b.c) F(`${b.id}: c が無いのに c が話す`);
    }
    const reacts = B.filter((b) => b.on);
    const chains = B.filter((b) => b.rel !== undefined);
    if (reacts.length < 10) F(`手書きの反応が ${reacts.length}（10 以上）`);
    if (chains.length < 8) F(`間柄で出る掛け合いが ${chains.length}（8 以上）`);
    for (const [k, v] of Object.entries(D0.TALK_REL0 || {})) {
      const [a, b] = k.split("|");
      if ([a, b].sort().join("|") !== k || !(P[a] || {}).join || !(P[b] || {}).join) F(`D.TALK_REL0 の ${k} が仲間の組でない（名前順に並べる）`);
      if (typeof v !== "number" || v < -100 || v > 100) F(`D.TALK_REL0 の ${k} の値 ${v}`);
    }
    ok(`K7 の掛け合い：三人の場面 ${trios.length}・反応 ${reacts.length}・間柄で出る ${chains.length}・始まりの間柄 ${Object.keys(D0.TALK_REL0 || {}).length} 組`);
  }

  // ---------------------------------------------------------------- 間柄の値と段
  {
    const { G, S } = game(902, ["dil", "zerina"]);
    const TK = G.tk;
    const z0 = TK.rel("dil", "zerina", S);
    if (TK.rel("zerina", "dil", S) !== z0) F("間柄が組の順番で違う");
    const tiers = [[-100, "険悪"], [-40, "険悪"], [-39, "ぎこちない"], [-11, "ぎこちない"], [-10, "ふつう"], [19, "ふつう"], [20, "気安い"], [49, "気安い"], [50, "相棒"], [100, "相棒"]];
    for (const [v, t] of tiers) if (TK.relTier(v) !== t) F(`間柄 ${v} の段が ${TK.relTier(v)}（${t}）`);
    TK.relAdd("dil", "zerina", 500, S);
    if (TK.rel("dil", "zerina", S) !== 100) F("間柄が +100 を超える");
    TK.relAdd("dil", "zerina", -1000, S);
    if (TK.rel("dil", "zerina", S) !== -100) F("間柄が −100 を下回る");
    S.tk.rel = {};
    // 一緒に勝つと上がる（一日に一度）・大物は +3
    const r0 = TK.rel("dil", "zerina", S);
    TK.record("win", "狼"); TK.record("win", "狼");
    if (TK.rel("dil", "zerina", S) !== r0 + 1) F(`一緒に勝った日の間柄が +1 にならない（${r0}→${TK.rel("dil", "zerina", S)}）`);
    TK.record("boss", "大熊");
    if (TK.rel("dil", "zerina", S) !== r0 + 4) F("大物を一緒に倒して +3 にならない");
    // 掛け合いが起きると上がる・肩を持つと動く
    const b = D0.TALK_BANTER.find((x) => x.id === "bt_dz_debt");
    if (b) {
      const r1 = TK.rel("dil", "zerina", S);
      TK.banter(b);
      const r2 = TK.rel("dil", "zerina", S);
      if (r2 <= r1) F("掛け合いのあと間柄が上がらない");
      if (S.event === "tk_banter") { G.act("ev:0"); if (TK.rel("dil", "zerina", S) === r2) F("肩を持っても間柄が動かない"); }
    }
    // 段で出る掛け合いが変わる：rel のある掛け合いは、条件の外では出ない
    const relB = D0.TALK_BANTER.find((x) => x.rel !== undefined && !x.c && !x.on && !x.after && !x.min);
    if (relB) {
      const { G: G2, S: S2 } = game(903, [relB.a, relB.b]);
      const lo = G2.tk.relOk(relB.rel, -100) ? 100 : -100;
      S2.tk.rel[G2.tk.relKey(relB.a, relB.b)] = lo;
      const all = () => (relB.where ? [].concat(relB.where) : [null]).flatMap((w) => G2.tk.banters(S2, w));
      if (!G2.tk.relOk(relB.rel, lo) && all().some((x) => x.id === relB.id)) F(`${relB.id}: 間柄の条件の外でも出る`);
      const hi = [-100, -50, -20, 0, 30, 60, 100].find((v) => G2.tk.relOk(relB.rel, v));
      S2.tk.rel[G2.tk.relKey(relB.a, relB.b)] = hi;
      if (relB.where && [].concat(relB.where).every((w) => !G2.eventTags().includes(w) && !["road", "camp", "inn"].includes(w))) S2.loc = [].concat(relB.where).find((w) => G2.data.LOCS[w]) || S2.loc;
      if (!all().some((x) => x.id === relB.id)) F(`${relB.id}: 間柄の条件に合っても出ない`);
    }
    // 型の掛け合い：棘はぎこちない以下、軽口は気安い以上
    S.tk.rel = {}; S.tk.bant = {};
    S.tk.rel["dil|zerina"] = -30;
    let ty = TK.typed("dil", "zerina", S).map((x) => x.typed);
    if (!ty.includes("cold") || ty.includes("tease")) F("ぎこちない組に棘が出ない（か、軽口が出る）");
    S.tk.rel["dil|zerina"] = 40;
    ty = TK.typed("dil", "zerina", S).map((x) => x.typed);
    if (ty.includes("cold") || !ty.includes("tease")) F("気安い組に軽口が出ない（か、棘が出る）");
    // シートの札
    S.tk.rel["dil|zerina"] = 60;
    if (!/ゼリナと相棒/.test(G.tkRelLabel(S.companions.find((c) => c.c2 === "dil"), S))) F(`シートの札に間柄が出ない：${G.tkRelLabel(S.companions[0], S)}`);
    S.tk.rel["dil|zerina"] = 0;
    if (G.tkRelLabel(S.companions[0], S)) F("ふつうの間柄まで札に出る");
  }

  // ---------------------------------------------------------------- 顔ぶれで選ぶ・三人の場面・書いていない組
  {
    const trio = D0.TALK_BANTER.find((b) => b.c && !b.after && !b.min && !b.rel && !b.when && !b.on);
    if (trio) {
      const { G, S } = game(904, [trio.a, trio.b, trio.c]);
      G.tk.roll = () => 0;
      const w = trio.where ? [].concat(trio.where).find((x) => ["road", "camp", "inn"].includes(x) || G.eventTags().includes(x)) : null;
      if (trio.where && w === undefined) S.loc = [].concat(trio.where).find((x) => G.data.LOCS[x]) || S.loc;
      const got = G.tk.pick(S, w || ([].concat(trio.where || [])[0]));
      if (!got || !got.c) F(`三人そろっていて三人の場面（${trio.id}）があるのに選ばれない（${got && got.id}）`);
      else {
        G.tk.banter(got);
        const cName = G.m2Short(S.companions.find((c) => c.c2 === got.c));
        const speaks = got.lines.some((l) => l[0] === "c");
        if (speaks && !S.log.some((l) => (l.text || "").startsWith(cName + "「"))) F("三人の場面で三人目の台詞に名前が付かない");
        if (!speaks && !S.log.some((l) => (l.text || "").includes(cName))) F("三人の場面に三人目の名前が出ない");
        if (S.log.some((l) => leftover(l.text || ""))) F("三人の場面の記録に置き換えが残る");
        if (S.event === "tk_banter") { G.act("ev:0"); if (S.tk.cur || S.mode !== "explore") F("三人の場面の肩を持つ選択のあと、会話が終わらない"); }
      }
      // 三人目がいなければ出ない
      const { G: G2, S: S2 } = game(905, [trio.a, trio.b]);
      if (["road", "camp", "inn", null].some((x) => G2.tk.banters(S2, x).some((b) => b.c))) F("三人目がいないのに三人の場面が出る");
    } else F("条件の無い三人の場面が無い");
    // 書いていない組には型の掛け合い
    const hand = new Set(D0.TALK_BANTER.map((b) => [b.a, b.b].sort().join("|")));
    const pair = ids.flatMap((a) => ids.map((b) => [a, b])).find(([a, b]) => a < b && !hand.has(a + "|" + b) && (P[a].age || 0) >= 18 && (P[b].age || 0) >= 18);
    if (pair) {
      const { G, S } = game(906, pair);
      G.tk.roll = () => 0;
      const got = G.tk.pick(S, "road");
      if (!got || !/^ty:/.test(got.id)) F(`書いていない組（${pair.join("・")}）に型の掛け合いが出ない（${got && got.id}）`);
      else {
        G.tk.banter(got);
        if (S.log.some((l) => leftover(l.text || ""))) F("型の掛け合いの記録に置き換えが残る");
        if (!S.tk.bant[got.id]) F("型の掛け合いが覚えられない（同じ型が何度も出る）");
        if (G.tk.pick(S, "road") && G.tk.pick(S, "road").id === got.id) F("同じ型の掛け合いがまた選ばれる");
      }
    }
    // 手書きのある組では手書き優先
    {
      const { G, S } = game(907, ["dil", "zerina"]);
      G.tk.roll = () => 0;
      const got = G.tk.pick(S, "road");
      if (!got || /^ty:/.test(got.id)) F(`手書きのある組（ディルとゼリナ）で型の掛け合いが先に出る（${got && got.id}）`);
    }
    // 反応：大物を倒したあと、居合わせた二人の反応
    {
      const { G, S } = game(908, ["dil", "zerina"]);
      G.tk.roll = () => 0;
      G.tk.record("boss", "大熊");
      const got = G.tk.pickReact(S, { k: "boss", name: "大熊", with: ["dil", "zerina"] });
      if (!got) F("大物を倒したあとの反応が組めない");
      else {
        G.tk.banter(got);
        if (S.log.some((l) => leftover(l.text || ""))) F("反応の記録に置き換えが残る");
        if (got.rx && S.tk.bant[got.id]) F("型の反応が覚えられてしまう（二度と出ない）");
      }
    }
  }

  // ---------------------------------------------------------------- 一日の上限・間を空ける
  {
    const { G, S } = game(909, ["dil", "zerina", "nora"]);
    G.tk.roll = () => 0;
    S.loc = "karna"; S.visited.karna = true;
    const day = S.day;
    let fired = 0;
    for (let i = 0; i < 30; i++) {
      S.day = day; S.phase = 1;
      S.tk.lastLoc = i % 2 ? "nerva" : "karna"; // 毎手番、場所を移ったことにする
      const before = S.tk.k7.n;
      G.endTurn();
      if (S.tk.k7.day === day && S.tk.k7.n > before) fired++;
      while (S.mode === "event") G.act("ev:0");
    }
    if (fired > G.tk.K7.cap3) F(`一日に ${fired} 回も掛け合いが起きる（上限 ${G.tk.K7.cap3}）`);
    if (fired < 1) F("旅のあとに掛け合いが起きない");
    // 次の日には、また起きる
    S.day = day + 1;
    let next = 0;
    for (let i = 0; i < 6; i++) { S.tk.lastLoc = "x"; const b = S.tk.k7.n; G.endTurn(); if (S.tk.k7.day === S.day && S.tk.k7.n > b) next++; while (S.mode === "event") G.act("ev:0"); }
    if (!next) F("次の日に掛け合いが起きない");
    ok(`一日の上限：旅を三十回して、その日の掛け合い ${fired} 回（上限 ${G.tk.K7.cap3}・二人なら ${G.tk.K7.cap}・${G.tk.K7.gap} 手番空ける）`);
  }

  // ---------------------------------------------------------------- 古いセーブ（S.tk.rel・S.tk.k7 が無い／S.tk そのものが無い）
  {
    const { G, S } = game(910, ["dil", "zerina"]);
    delete S.tk.rel; delete S.tk.k7;
    try {
      if (G.tk.rel("dil", "zerina", S) !== ((D0.TALK_REL0 || {})["dil|zerina"] || 0)) F("古いセーブで間柄が始まりの値にならない");
      G.tk.record("win", "狼");
      S.tk.lastLoc = "x";
      G.endTurn();
      if (!S.tk.k7 || !S.tk.rel) F("古いセーブで K7 の状態が埋まらない");
      delete S.tk;
      G.endTurn();
      G.tkRelLabel(S.companions[0], S);
    } catch (e) { F("古いセーブで止まる：" + e.message); }
  }

  // ---------------------------------------------------------------- 遊ぶ：三人連れて旅を続ける（止まらない・置き換えが残らない・間柄が範囲に収まる）
  {
    const sets = [["dil", "zerina", "rui"], ["margot", "lucien", "solenne"], ["timo", "ingrid", "gigra"], ["bruno", "tsuyuha", "polf"], ["kaidel", "nora", "pipinelle"], ["selevan", "izra", "noeris"]];
    let typed = 0, trios = 0, rx = 0;
    sets.forEach((set, i) => {
      const { G, S } = game(920 + i, set, "nerva");
      try {
        for (let t = 0; t < 200 && !S.over; t++) {
          const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
          if (!acts.length) break;
          let a;
          if (S.mode === "explore") a = acts.find((x) => /^travel:/.test(x.id) && G.rand() < 0.5) || acts.find((x) => /^camp/.test(x.id) && G.rand() < 0.2) || acts[Math.floor(G.rand() * acts.length)];
          else a = acts[Math.floor(G.rand() * acts.length)];
          if (/^(retire|m6|end)/.test(a.id)) continue;
          G.act(a.id);
          S.hp = Math.max(S.hp, 50);
          if (S.companions.length < 2) set.forEach((id) => G.c2Join(id));
        }
      } catch (e) { F(`${set.join("・")} で遊ぶと止まる：${e.stack.split("\n").slice(0, 3).join(" ")}`); }
      const L = S.log.map((l) => l.text || "");
      L.forEach((x) => { if (leftover(x)) F(`${set.join("・")}：記録に置き換えが残る：${x}`); });
      for (const v of Object.values((S.tk || {}).rel || {})) if (v < -100 || v > 100) F("間柄が範囲の外");
      const titles = S.log.filter((l) => l.k === "title").map((l) => l.text);
      typed += Object.keys((S.tk || {}).bant || {}).filter((k) => k.startsWith("ty:")).length;
      trios += Object.keys((S.tk || {}).bant || {}).filter((k) => (D0.TALK_BANTER.find((b) => b.id === k) || {}).c).length;
      rx += titles.filter((x) => ["勝ったあと", "大物のあと", "手当て", "弔い", "着いた先"].includes(x)).length;
    });
    ok(`遊ぶ：三人連れて六回旅をして、型の掛け合い ${typed}・三人の場面 ${trios}・型の反応 ${rx}`);
  }
  if (!n) ok("掛け合いK7：顔ぶれ・三人・間柄・型・上限・古いセーブ");
};
