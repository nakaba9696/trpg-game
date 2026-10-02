// 仲間との会話（src/engine/zzzzz_talk.js・src/data/talk_*.js・docs/talk.md）
// - 表：会話の表がある人は一人あたり話題 20 以上（身の上 5 段以上・場所 5・出来事 5・ほかの仲間 3・世間話・相談 2・冷たい会話 2）。
//   id が重ならない。場所・人・物・続き（after）・出来事の種類が実在する。返しが 2〜3 個。掛け合いは 12 以上、2〜6 行、二人とも実在
// - 見せる文：禁じた言葉が無い。地の文に「！」が無い（台詞の中はよい）。置き換え（{n} など）が残らない
// - 「話す」：話題が 3〜5 個並ぶ。条件（好感度・場所・最近の出来事・仲間・続き・頼まれごと）どおりに出る。一度聞いた話題は出ない。続きが開く
// - 返し方で好感度が動き、その人の好みで違う。頼まれごとは物・金・場所がそろうと続きが出て、渡すと減る
// - 掛け合い：二人がそろうと起き、肩を持つと片方が上がり片方が下がる。一度きり
// - 夜の会話：好感度の高い仲間が、野営・宿の夜に話しかける。一夜に一度まで
// - 恋の話題：18 歳未満の主人公・18 歳未満や子どもの姿の相手には出ない
// - 古いセーブ（S.tk が無い）・会話の途中の保存と読み込みで動く。ランダムに遊んでも会話が止まらない
const BANNED = /見世物|観客|客席|舞台|台本|言霊|神々|魔王|魔人|正体|もういない|胸|童貞|貧乳|巨乳|ナイスバディ|ロリコン|体つき/;
const TAGS = new Set(["any", "town", "wild", "dungeon", "capital", "port", "snow", "realm", "camp", "inn", "road"]);
const KINDS = ["past", "place", "event", "mate", "chat", "ask", "love", "bond", "cold", "night"];
const FRESH = ["win", "boss", "near", "fled", "death", "left", "crime", "apostle", "quest", "arrive", "title"];
const TONES = ["earnest", "tease", "joke", "praise", "sweet", "scold", "cold", "quiet"];
const PEOPLE = ["dil", "sheila", "nora", "zerina"]; // このセッションで書いた四人（残りは後の子が足す）

export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("会話: " + m); };
  const D0 = G0.data;
  const T = D0.TALK || {};

  // ---------------------------------------------------------------- 表
  const ids = new Map();
  const all = [];
  for (const [who, p] of Object.entries(T)) {
    const P = (D0.C2_PEOPLE || {})[who];
    if (!P) F(`会話の表 ${who} の人が C2_PEOPLE に無い`);
    for (const tp of p.topics || []) {
      all.push([who, tp]);
      if (ids.has(tp.id)) F(`話題の id ${tp.id} が重なっている（${ids.get(tp.id)} と ${who}）`);
      ids.set(tp.id, who);
    }
  }
  for (const [who, tp] of all) {
    const w = `${who}.${tp.id}`;
    if (!KINDS.includes(tp.kind)) F(`${w}: 種類 ${tp.kind} が無い`);
    for (const a of [].concat(tp.at || [])) if (!TAGS.has(a) && !D0.LOCS[a]) F(`${w}: 場所 ${a} が無い`);
    if (tp.mate && !((D0.C2_PEOPLE || {})[tp.mate] || {}).join) F(`${w}: 仲間 ${tp.mate} が仲間になる人でない`);
    if (tp.mate === who) F(`${w}: 自分のことを「ほかの仲間」にしている`);
    if (tp.kind === "event" && !FRESH.includes(tp.fresh)) F(`${w}: 出来事の種類 ${tp.fresh} が無い`);
    if (tp.after && !ids.has(String(tp.after).split("#")[0])) F(`${w}: 続きの前の話題 ${tp.after} が無い`);
    if (tp.need) {
      if (tp.need.item && !D0.ITEMS[tp.need.item]) F(`${w}: 物 ${tp.need.item} が無い`);
      for (const l of [].concat(tp.need.loc || [])) if (!D0.LOCS[l]) F(`${w}: 場所 ${l} が無い`);
    }
    const r = tp.replies || [];
    if (r.length < 2 || r.length > 3) F(`${w}: 返しが ${r.length} 個（2〜3 個）`);
    r.forEach((x, i) => { if (!TONES.includes(x.tone)) F(`${w}[${i}]: 返し方 ${x.tone} が無い`); if (!x.label || !x.text) F(`${w}[${i}]: 返しの文が無い`); if (x.item && !D0.ITEMS[x.item]) F(`${w}[${i}]: 物 ${x.item} が無い`); });
    // 頼まれごとの続きは、受けた返しの key が前の話題にある
    if (tp.after && tp.after.includes("#")) {
      const [id, key] = tp.after.split("#");
      const prev = all.find(([, x]) => x.id === id);
      if (prev && !(prev[1].replies || []).some((x) => (x.key || x.tone) === key)) F(`${w}: 前の話題 ${id} に返し ${key} が無い`);
    }
  }
  const count = (who, f) => (T[who].topics || []).filter(f).length;
  for (const who of PEOPLE) {
    if (!T[who]) { F(`${who} の会話の表が無い`); continue; }
    const steps = new Set((T[who].topics || []).filter((t) => t.kind === "past").map((t) => t.step));
    const need = [["話題", (T[who].topics || []).length, 20], ["身の上の段", steps.size, 5], ["場所", count(who, (t) => t.kind === "place"), 5], ["出来事への反応", count(who, (t) => t.kind === "event"), 5],
      ["ほかの仲間", count(who, (t) => t.kind === "mate"), 3], ["世間話", count(who, (t) => t.kind === "chat"), 2], ["相談", count(who, (t) => t.kind === "ask" && !t.need), 2], ["冷たい会話", count(who, (t) => t.kind === "cold"), 2], ["夜", count(who, (t) => t.kind === "night"), 1]];
    for (const [k, v, m] of need) if (v < m) F(`${who}: ${k}が ${v}（${m} 以上）`);
    if (!T[who].greet || !["warm", "mid", "low", "cold"].every((k) => (T[who].greet[k] || []).length)) F(`${who}: 声のかけ方（warm・mid・low・cold）が足りない`);
  }
  const B = D0.TALK_BANTER || [];
  const bids = new Set();
  for (const b of B) {
    if (bids.has(b.id)) F(`掛け合い ${b.id} の id が重なっている`);
    bids.add(b.id);
    for (const k of ["a", "b"]) if (!((D0.C2_PEOPLE || {})[b[k]] || {}).join) F(`掛け合い ${b.id}: ${k} の ${b[k]} が仲間になる人でない`);
    if (b.a === b.b) F(`掛け合い ${b.id}: 一人で掛け合っている`);
    if (!b.lines || b.lines.length < 2 || b.lines.length > 6) F(`掛け合い ${b.id}: 行が ${b.lines && b.lines.length}（2〜6）`);
    for (const a of [].concat(b.where || [])) if (!TAGS.has(a) && !D0.LOCS[a]) F(`掛け合い ${b.id}: 場所 ${a} が無い`);
    if (b.after && !B.some((x) => x.id === b.after)) F(`掛け合い ${b.id}: 前の掛け合い ${b.after} が無い`);
    if (b.side && !(b.side.a && b.side.b)) F(`掛け合い ${b.id}: 肩を持つ選択が二人分ない`);
  }
  const mine = B.filter((b) => PEOPLE.includes(b.a) && PEOPLE.includes(b.b));
  if (mine.length < 12) F(`四人の掛け合いが ${mine.length}（12 以上）`);
  if (mine.filter((b) => b.side).length < 4) F("どちらの肩を持つかを選べる掛け合いが少ない");

  // ---------------------------------------------------------------- 見せる文
  const texts = [];
  const add = (w, t) => { if (Array.isArray(t)) t.forEach((x) => add(w, x)); else if (typeof t === "string") texts.push([w, t]); };
  for (const [who, p] of Object.entries(T)) {
    add(who + ".greet", Object.values(p.greet || {}));
    add(who + ".bye", p.bye); add(who + ".empty", p.empty); add(who + ".night", Object.values(p.nightIntro || {}));
    for (const tp of p.topics || []) { add(tp.id, tp.title); add(tp.id, tp.text); (tp.replies || []).forEach((r) => { add(tp.id, r.label); add(tp.id, r.text); add(tp.id, r.memo); }); }
  }
  const bline = (w, ln) => { if (Array.isArray(ln)) { if (ln[0]) texts.push([w, "「" + ln[1] + "」"]); else texts.push([w, ln[1]]); } else add(w, ln); };
  for (const b of B) {
    add(b.id, b.title);
    (b.lines || []).forEach((ln) => bline(b.id, ln));
    if (b.side) { add(b.id, b.side.q); ["a", "b", "none"].forEach((s) => { if (!b.side[s]) return; add(b.id, b.side[s].label); [].concat(b.side[s].text || []).forEach((ln) => bline(b.id, ln)); }); }
  }
  for (const [w, t] of texts) {
    if (BANNED.test(t)) F(`${w}: 書かない言葉「${t.match(BANNED)[0]}」：${t}`);
    // 地の文（「」の外）は叫ばない
    const out = t.replace(/「[^」]*」/g, "");
    if (/[！!]/.test(out)) F(`${w}: 地の文に「！」：${t}`);
    const tags = t.match(/\{([a-z0-9_]+)\}/g) || [];
    for (const x of tags) if (!["{n}", "{c}", "{m}", "{a}", "{b}", "{foe}", "{dead}", "{place}", "{you}", "{kin}", "{food}", "{home}", "{keep}", "{habit}"].includes(x)) F(`${w}: 知らない置き換え ${x}`);
  }

  // ---------------------------------------------------------------- 遊ぶ
  const game = (seed, opt) => {
    const G = loadEngine();
    const D = G.data;
    G.rand = seeded(seed);
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: (opt && opt.age) || 20, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999;
    S.loc = (opt && opt.loc) || "nerva";
    S.mode = "explore";
    S.visited[S.loc] = true;
    ((opt && opt.join) || ["dil"]).forEach((id) => G.c2Join(id));
    G.tkState(S);
    return { G, D, S };
  };
  const acts = (G) => G.actions().flatMap((g) => g.list);
  const comp = (S, id) => S.companions.find((c) => c.c2 === id);
  const leftover = (S) => S.log.some((l) => /\{[a-z0-9_]+\}/.test(l.text || ""));

  // 話題が並ぶ・既に聞いた・続き
  {
    const { G, S } = game(11, { join: ["dil", "zerina", "nora"] });
    const dil = comp(S, "dil");
    G.affState(S).dil = 20;
    const talk = acts(G).find((a) => a.id === "m2talk:" + dil.id);
    if (!talk || talk.disabled) F("「ディルと話す」が出ない");
    G.act("m2talk:" + dil.id);
    if (S.mode !== "event" || S.event !== "tk_menu") F(`話すと話題の一覧にならない（${S.mode} ${S.event}）`);
    const menu = S.tk.cur.menu;
    if (menu.length < 3 || menu.length > 5) F(`話題が ${menu.length} 個（3〜5）`);
    for (const id of menu) if (!G.tk.can(G.tk.topic(id), dil, S)) F(`条件を満たさない話題 ${id} が並んだ`);
    if (G.actions()[0].list.length !== menu.length + 1 + (S.tk.cur.scene ? 1 : 0)) F("一覧の選択肢の数が話題の数と合わない");
    // 身の上の一段目を聞く
    S.tk.cur.menu = ["dil_p1", ...menu.filter((x) => x !== "dil_p1")].slice(0, 4);
    G.act("ev:0");
    if (S.event !== "tk_topic" || S.tk.cur.topic !== "dil_p1") F("話題を選んでも話にならない");
    const before = G.affOf("dil", S);
    G.act("ev:1"); // からかう（ディルは +4）
    if (G.affOf("dil", S) !== before + 4) F(`ディルをからかって +4 にならない（${before} → ${G.affOf("dil", S)}）`);
    if (!S.tk.heard.dil_p1) F("聞いた話題が記録されない");
    if (G.tkTopics(dil, S).some((t) => t.id === "dil_p1")) F("一度聞いた話題がまた出る");
    if (!G.tkTopics(dil, S).some((t) => t.id === "dil_p2")) F("身の上の続き（二段目）が開かない");
    if (G.tkTopics(dil, S).some((t) => t.id === "dil_p3")) F("身の上の三段目が、二段目より先に開く");
    if (S.event !== "tk_menu") F(`返したあと一覧に戻らない（${S.event}）`);
    // 切り上げる
    const end = G.actions()[0].list.findIndex((a) => a.label === "話を切り上げる");
    G.act("ev:" + end);
    if (S.mode !== "explore" || S.event || S.tk.cur) F("話を切り上げても会話が終わらない");
    if (acts(G).find((a) => a.id === "m2talk:" + dil.id)?.disabled !== true) F("同じ日に何度も「話す」が開く");
    if (leftover(S)) F("記録に {n} などが残る");
    // 深い話は好感度が要る
    G.affState(S).dil = 20;
    S.tk.heard.dil_p2 = S.tk.heard.dil_p3 = S.tk.heard.dil_p4 = { day: 1, k: "earnest" };
    if (G.tkTopics(dil, S).some((t) => t.id === "dil_p5")) F("好感度 20 で身の上の五段目（45 以上）が出る");
    G.affState(S).dil = 50;
    if (!G.tkTopics(dil, S).some((t) => t.id === "dil_p5")) F("好感度 50 で身の上の五段目が出ない");
  }

  // 返し方の好みは人で違う
  {
    const { G, S } = game(12, { join: ["dil", "nora"] });
    const nora = comp(S, "nora"), dil = comp(S, "dil");
    const tryReply = (c, id, i) => { G.tkState(S).heard = {}; G.affState(S)[c.c2] = 20; c.talkDay = 0; G.m2Talk(c.id); S.tk.cur.menu = [id]; G.act("ev:0"); const a = G.affOf(c.c2, S); G.act("ev:" + i); return G.affOf(c.c2, S) - a; };
    const dn = tryReply(nora, "nora_p1", 1); // 褒める（ノラ +5）
    const dd = tryReply(dil, "dil_c_fish", 0); // 冗談（ディル +4）
    if (dn !== 5) F(`ノラを褒めて +5 にならない（${dn}）`);
    if (dd !== 4) F(`ディルに冗談で返して +4 にならない（${dd}）`);
    const cold = tryReply(nora, "nora_p4", 2); // 突き放す（−7）
    if (cold >= 0) F(`ノラを突き放しても好感度が下がらない（${cold}）`);
    if (T.nora.tones.praise === T.dil.tones.praise) F("褒め言葉の好みが、ノラとディルで同じ");
  }

  // 場所・最近の出来事・ほかの仲間・冷たい会話
  {
    const { G, S } = game(13, { join: ["dil", "zerina"] });
    const dil = comp(S, "dil");
    G.affState(S).dil = 20;
    const has = (id) => G.tkTopics(dil, S).some((t) => t.id === id);
    if (!has("dil_l_nerva")) F("港町でディルの港の話が出ない");
    S.loc = "karna";
    if (has("dil_l_nerva")) F("自由都市で港町の話が出る");
    if (!has("dil_l_karna")) F("自由都市で自由都市の話が出ない");
    if (has("dil_e_boss")) F("大物を倒していないのに、大物の話が出る");
    G.tk.record("boss", "大きな熊");
    if (!has("dil_e_boss")) F("大物を倒したあとに、大物の話が出ない");
    S.tk.heard.dil_e_boss = { day: S.day, k: "joke", seq: S.tk.seq };
    if (has("dil_e_boss")) F("同じ大物の話が二度出る");
    S.day += 10;
    G.tk.record("boss", "別の熊");
    if (!has("dil_e_boss")) F("次の大物のあとに、大物の話がまた出ない");
    S.day += 10;
    if (has("dil_e_boss")) F("十日前の大物の話が、まだ出る");
    // 一緒にいなかった出来事は話さない
    G.tk.record("death", "誰か");
    S.tk.recent[S.tk.recent.length - 1].with = [];
    if (has("dil_e_death")) F("居合わせなかった仲間の死を話題にする");
    if (!has("dil_m_zerina")) F("ゼリナがいるのに、ゼリナの話が出ない");
    if (has("dil_m_sheila")) F("シェイラがいないのに、シェイラの話が出る");
    // 冷たい
    G.affState(S).dil = -40;
    const cold = G.tkTopics(dil, S);
    if (!cold.length || cold.some((t) => t.kind !== "cold")) F(`好感度 −40 で、冷たい会話以外が出る（${cold.map((t) => t.id).join(",")}）`);
    dil.talkDay = 0;
    G.m2Talk(dil.id);
    if (!S.tk.cur || !S.tk.cur.menu.length || G.tk.topic(S.tk.cur.menu[0]).kind !== "cold") F("冷たいときの一覧の頭が、冷たい会話でない");
    G.tk.finish();
    G.affState(S).dil = 30;
    if (G.tkTopics(dil, S).some((t) => t.kind === "cold")) F("好感度 30 で冷たい会話が出る");
  }

  // 頼まれごと（受ける → 物・金・場所がそろうと続き → 渡すと減る）
  {
    const { G, S } = game(14, { join: ["dil", "nora"] });
    const dil = comp(S, "dil"), nora = comp(S, "nora");
    G.affState(S).dil = 20; G.affState(S).nora = 20;
    const can = (c, id) => G.tkTopics(c, S).some((t) => t.id === id);
    S.tk.heard.dil_a2 = { day: 1, k: "no" };
    if (can(dil, "dil_a2_done")) F("断った頼まれごとの続きが出る");
    S.tk.heard.dil_a2 = { day: 1, k: "yes" };
    S.inv = {};
    if (can(dil, "dil_a2_done")) F("薬草が無いのに、薬草を渡す話が出る");
    G.give("herb");
    if (!can(dil, "dil_a2_done")) F("薬草があるのに、薬草を渡す話が出ない");
    dil.talkDay = 0; G.m2Talk(dil.id);
    S.tk.cur.menu = ["dil_a2_done"]; G.act("ev:0");
    const a = G.affOf("dil", S);
    G.act("ev:0");
    if (S.inv.herb) F("薬草を渡しても、薬草が減らない");
    if (G.affOf("dil", S) - a !== 10) F(`薬草を渡して好感度 +10 にならない（${G.affOf("dil", S) - a}）`);
    // 場所と金
    S.tk.heard.dil_a1 = { day: 1, k: "yes" };
    S.loc = "nerva"; S.gold = 100;
    if (can(dil, "dil_a1_done")) F("港町で、自由都市の本屋の話が出る");
    S.loc = "karna"; S.gold = 5;
    if (can(dil, "dil_a1_done")) F("金が足りないのに、本を買う話が出る");
    S.gold = 100;
    if (!can(dil, "dil_a1_done")) F("自由都市で金があるのに、本を買う話が出ない");
    dil.talkDay = 0; G.m2Talk(dil.id);
    S.tk.cur.menu = ["dil_a1_done"]; G.act("ev:0"); G.act("ev:0");
    if (S.gold !== 80) F(`本の代金 20G が減らない（${S.gold}）`);
  }

  // 掛け合い
  {
    const { G, S } = game(15, { join: ["dil", "zerina"] });
    const list = G.tk.banters(S, "road");
    if (!list.some((b) => b.id === "bt_dz_debt")) F("ディルとゼリナがいるのに、旅の掛け合いが無い");
    if (G.tk.banters(S, "road").some((b) => b.a === "nora" || b.b === "nora")) F("ノラがいないのに、ノラの掛け合いが出る");
    const b = D0.TALK_BANTER.find((x) => x.id === "bt_dz_debt");
    const a0 = G.affOf("dil", S), z0 = G.affOf("zerina", S);
    G.tk.banter(b);
    if (S.event !== "tk_banter") F("問いのある掛け合いで、肩を持つ選択にならない");
    if (!S.log.some((l) => /^ディル「/.test(l.text || "")) || !S.log.some((l) => /^ゼリナ「/.test(l.text || ""))) F("掛け合いの台詞に、話す人の名前が付かない");
    G.act("ev:0"); // ディルの肩を持つ
    if (!(G.affOf("dil", S) > a0 && G.affOf("zerina", S) < z0)) F(`ディルの肩を持っても、ディルが上がってゼリナが下がらない（${a0}→${G.affOf("dil", S)}・${z0}→${G.affOf("zerina", S)}）`);
    if (S.mode !== "explore" || S.tk.cur) F("掛け合いのあと会話が終わらない");
    if (G.tk.banters(S, "road").some((x) => x.id === "bt_dz_debt")) F("同じ掛け合いが二度起きる");
    if (!G.tk.banters(S, "camp").some((x) => x.id === "bt_dz_book")) F("続きの掛け合い（after）が開かない");
    if (leftover(S)) F("掛け合いの記録に {a} などが残る");
    // 旅のあとに起きる
    const { G: G2, S: S2 } = game(16, { join: ["dil", "zerina", "nora"] });
    let seen = 0;
    for (let i = 0; i < 60 && !seen; i++) {
      S2.tk.banterDay = 0;
      G2.act(acts(G2).find((a) => /^travel:/.test(a.id)).id);
      while (S2.mode === "combat" || S2.mode === "event") { const x = acts(G2).find((a) => !a.disabled); if (!x) break; G2.act(x.id); }
      if (Object.keys(S2.tk.bant).length) seen++;
    }
    if (!seen) F("旅を六十回しても、掛け合いが一度も起きない");
  }

  // 夜の会話（一夜に一度まで）
  {
    const { G, S } = game(17, { join: ["dil", "nora"], loc: "forest" });
    const dil = comp(S, "dil"), nora = comp(S, "nora");
    G.affState(S).dil = 5; G.affState(S).nora = 5;
    // 夜の会話が起きるかどうかは会話の乱数（G.tk.roll。K4 から G.rand を使わない）。ここでは必ず起きるようにする
    const roll0 = G.tk.roll;
    G.rand = () => 0; G.tk.roll = () => 0;
    G.tk.night("camp");
    if (S.tk.cur) F("好感度が低いのに、夜に話しかけてくる");
    G.affState(S).nora = 40;
    if (!G.tk.night("camp")) F("好感度 40 のノラが、野営の夜に話しかけてこない");
    if (S.event !== "tk_topic" || G.tk.topic(S.tk.cur.topic).who !== "nora") F(`夜の会話がノラの話題にならない（${S.event}）`);
    G.rand = () => 0.99; G.tk.roll = roll0; // 恋の気配（M10）などの、手番の終わりの出来事を起こさない
    G.act("ev:0");
    if (S.mode !== "explore" || S.tk.cur) F("夜の会話が一つの話題で終わらない");
    if (G.tk.night("camp")) F("同じ夜に二度、話しかけてくる");
    // 宿：施設に戻る
    S.loc = "karna"; S.day++; S.mode = "fac"; S.fac = "inn"; S.gold = 100;
    G.affState(S).nora = 40;
    G.rand = () => 0; G.tk.roll = () => 0;
    G.act("inn:rest");
    G.rand = () => 0.99; G.tk.roll = roll0;
    if (S.event !== "tk_topic") F(`宿に泊まった夜に話しかけてこない（${S.mode} ${S.event}）`);
    else {
      G.act("ev:0");
      if (S.mode !== "fac" || S.fac !== "inn") F(`宿の夜の会話のあと、宿に戻らない（${S.mode} ${S.fac}）`);
    }
    const day = S.day;
    G.act("inn:rest");
    if (S.day === day + 1 && S.tk.night === S.day && S.mode === "event" && G.tk.topic(S.tk.cur.topic).kind !== "night" && G.tk.topic(S.tk.cur.topic).kind !== "past") F("夜の会話が夜の話題でも身の上でもない");
  }

  // 恋の話題：18 歳未満・子どもの姿には出ない
  {
    const { G, S } = game(18, { join: ["dil"] });
    const dil = comp(S, "dil");
    G.affState(S).dil = 80;
    if (!G.tkTopics(dil, S).some((t) => t.love)) F("好感度 80 の大人のディルに、恋の話題が出ない");
    S.profile.age = 16;
    if (G.tkTopics(dil, S).some((t) => t.love)) F("16 歳の主人公に、恋の話題が出る");
    S.profile.age = 20;
    const rui = G.c2Make("rui");
    S.companions.push(rui); G.m2Comp(rui, S);
    G.affState(S).rui = 80;
    if (G.tk.can({ id: "x", kind: "love", love: true, min: 0, title: "x", replies: [] }, rui, S)) F("子どもの姿のルイに、恋の話題が出る");
    for (const who of PEOPLE) for (const t of T[who].topics) if (t.kind === "love" && !t.love) F(`${t.id}: 恋の話題に love: true が無い`);
    // 恋の相手でない人（romance の印が無い）・18 歳未満の主人公には、恋の代わりに信頼の話題
    const { G: G2, S: S2 } = game(20, { join: ["sheila", "dil"] });
    const sh = comp(S2, "sheila"), dl = comp(S2, "dil");
    G2.affState(S2).sheila = 80; G2.affState(S2).dil = 80;
    const kinds = (c) => G2.tkTopics(c, S2).map((t) => t.kind);
    const romance = (id) => (D0.C2_PEOPLE[id] || {}).romance === true;
    if (!romance("sheila")) {
      if (kinds(sh).includes("love")) F("恋の相手でないシェイラに、恋の話題が出る");
      if (!kinds(sh).includes("bond")) F("恋の相手でないシェイラに、信頼の話題が出ない");
    }
    if (romance("dil")) {
      if (kinds(dl).includes("bond")) F("恋の相手になれるディルに、信頼の話題が出る（恋の話題のはず）");
      S2.profile.age = 16;
      if (kinds(dl).includes("love") || !kinds(dl).includes("bond")) F("16 歳の主人公に、ディルが恋の話題を出すか、信頼の話題を出さない");
    }
    for (const who of PEOPLE) if (!T[who].topics.some((t) => t.kind === "bond")) F(`${who}: 信頼の話題（恋の代わり）が無い`);
    // 夜の会話も印に合う：恋の相手でない人の夜に、恋の話題は出ない
    S2.profile.age = 20;
    if (G2.tkTopics(sh, S2, { night: true, where: "camp" }).some((t) => t.love)) F("恋の相手でないシェイラの夜の会話に、恋の話題が出る");
  }

  // 古いセーブと、会話の途中の保存
  {
    const { G, S } = game(19, { join: ["sheila", "zerina"] });
    delete S.tk;
    const sh = comp(S, "sheila");
    if (!acts(G).some((a) => a.id === "m2talk:" + sh.id)) F("古いセーブで「話す」が出ない");
    G.act("m2talk:" + sh.id);
    if (S.event !== "tk_menu") F("古いセーブで話題の一覧にならない");
    const saved = JSON.stringify(S);
    const G2 = loadEngine();
    G2.rand = seeded(1);
    G2.S = JSON.parse(saved);
    const l1 = G.actions()[0].list.map((a) => a.label).join("|"), l2 = G2.actions()[0].list.map((a) => a.label).join("|");
    if (l1 !== l2) F(`読み込むと話題の一覧が変わる（${l1} / ${l2}）`);
    G2.act("ev:0");
    if (G2.S.event !== "tk_topic") F("読み込んだあと話題を選べない");
    G2.act("ev:0");
    if (leftover(G2.S)) F("読み込んだあとの記録に {n} などが残る");
  }

  // ランダムに遊んでも、会話が止まらない・壊れない
  {
    let talks = 0, topics = 0, nights = 0, banters = 0;
    for (let seed = 30; seed < 36; seed++) {
      const { G, S } = game(seed, { join: ["dil", "sheila", "nora"] });
      S.companions.forEach((c) => (G.affState(S)[c.c2] = 30));
      const rnd = seeded(seed * 7);
      let stuck = 0;
      for (let i = 0; i < 400 && !S.over; i++) {
        const list = acts(G).filter((a) => !a.disabled);
        if (!list.length) break;
        const talk = list.find((a) => a.id.startsWith("m2talk:"));
        const pick = talk && rnd() < 0.3 ? talk : list[Math.floor(rnd() * list.length)];
        if (pick.id.startsWith("m2talk:")) talks++;
        try { G.act(pick.id); } catch (e) { F(`ランダムに遊んで例外：${e.message}（${pick.id}）`); break; }
        if (S.mode === "event" && /^tk_/.test(S.event || "")) { if (++stuck > 12) { F(`会話が終わらない（${S.event}）`); break; } }
        else stuck = 0;
      }
      topics += Object.keys(S.tk.heard).length;
      nights += S.tk.night ? 1 : 0;
      banters += Object.keys(S.tk.bant).filter((k) => !k.endsWith("#")).length;
      if (leftover(S)) F(`ランダムに遊んで、記録に置き換えが残る（種 ${seed}）`);
    }
    if (!topics) F("ランダムに遊んで、話題を一つも聞かない");
    if (n === 0) ok(`会話（話題 ${all.length}・掛け合い ${B.length}。六回ランダムに遊んで「話す」${talks} 回・聞いた話題 ${topics}・夜の会話のあった冒険 ${nights}・掛け合い ${banters}）`);
  }
};
