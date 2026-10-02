// 仲間との会話の二回目（K2）：C2 のカイデル・ルイ・エルネア・ナタリア、C4 のベルトラン・イルゼ・トゥーラ・ミルレーネ。
// 表の形・見せる文は tests/checks/talk.mjs が全員に確かめる。ここでは、この 8 人の量と、恋・信頼の分け方と、話してみて止まらないことを確かめる。
// - 量：話題 20 以上（身の上 5 段以上・場所 5・出来事 5・ほかの仲間 3・世間話と相談 2 以上ずつ・冷たい会話 2・夜 2）。声のかけ方 4 段。信頼（bond）がある
// - 恋：romance の人だけが恋の話題（love: true）を持つ。ルイ（9）・トゥーラ（14）には恋の話題が無い
// - 掛け合い：8 人のだれかが入るものが 20 以上。半分くらいは肩を持てる（side）
// - 遊ぶ：一人ずつ仲間にして、好感度を上げながら話題を全部聞き切る。例外が出ない・置き換えが残らない・身の上が最後の段まで開く
const PEOPLE = ["kaidel", "rui", "elnea", "natalia", "bertrand", "ilse", "tula", "mirlene"];

export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("会話K2: " + m); };
  const D0 = G0.data;
  const T = D0.TALK || {};
  const P = D0.C2_PEOPLE || {};

  // ---------------------------------------------------------------- 量
  const counts = [];
  for (const who of PEOPLE) {
    const p = T[who];
    if (!p) { F(`${who} の会話の表が無い`); continue; }
    const tp = p.topics || [];
    const c = (f) => tp.filter(f).length;
    const steps = new Set(tp.filter((t) => t.kind === "past").map((t) => t.step));
    const need = [["話題", tp.length, 20], ["身の上の段", steps.size, 5], ["場所", c((t) => t.kind === "place"), 5], ["出来事への反応", c((t) => t.kind === "event"), 5],
      ["ほかの仲間", c((t) => t.kind === "mate"), 3], ["世間話", c((t) => t.kind === "chat"), 2], ["相談", c((t) => t.kind === "ask" && !t.need), 2],
      ["冷たい会話", c((t) => t.kind === "cold"), 2], ["夜", c((t) => t.kind === "night"), 2], ["信頼", c((t) => t.kind === "bond"), 1]];
    for (const [k, v, m] of need) if (v < m) F(`${who}: ${k}が ${v}（${m} 以上）`);
    if (!p.greet || !["warm", "mid", "low", "cold"].every((k) => (p.greet[k] || []).length)) F(`${who}: 声のかけ方（warm・mid・low・cold）が足りない`);
    if (!(p.bye || []).length || !(p.empty || []).length) F(`${who}: 切り上げ・話すことが無いときの一言が無い`);
    if (!p.nightIntro || !(p.nightIntro.camp || []).length || !(p.nightIntro.inn || []).length) F(`${who}: 夜に話しかける一言（camp・inn）が無い`);
    if (!p.tones || Object.keys(p.tones).length < 6) F(`${who}: 返し方の好み（tones）が足りない`);
    // 好みの返しが少なくとも一つある話題（冷たい会話を除く）
    for (const t of tp) {
      if (t.kind === "cold") continue;
      const good = (t.replies || []).some((r) => (r.aff != null ? r.aff : (p.tones[r.tone] || 0) + (r.plus || 0)) > 0);
      if (!good) F(`${t.id}: 喜ぶ返しが一つも無い`);
    }
    // 恋と信頼
    const loves = tp.filter((t) => t.love || t.kind === "love");
    const adult = (P[who].age || 0) >= 18 && !P[who].childLook;
    if (loves.length && !(P[who].romance && adult)) F(`${who}: 恋の相手でない（romance が無い・18 歳未満・子どもの姿）のに恋の話題がある`);
    for (const t of loves) if (!t.love) F(`${t.id}: 恋の話題に love: true が無い`);
    if (P[who].romance && adult && !loves.length) F(`${who}: 恋の相手なのに恋の話題が無い`);
    counts.push(`${P[who].name} ${tp.length}`);
  }
  if (["rui", "tula"].some((w) => T[w] && T[w].topics.some((t) => t.love))) F("ルイ・トゥーラに恋の話題がある");

  // ---------------------------------------------------------------- 掛け合い
  const B = (D0.TALK_BANTER || []).filter((b) => PEOPLE.includes(b.a) || PEOPLE.includes(b.b));
  if (B.length < 20) F(`8 人の入る掛け合いが ${B.length}（20 以上）`);
  if (B.filter((b) => b.side).length < Math.floor(B.length / 3)) F("肩を持てる掛け合いが少ない");
  for (const b of B) for (const k of ["a", "b"]) if (!T[b[k]]) F(`掛け合い ${b.id}: ${b[k]} は会話の表のある人でない`);
  const pairs = new Set(B.map((b) => [b.a, b.b].sort().join("+")));
  for (const who of PEOPLE) if (!B.some((b) => b.a === who || b.b === who)) F(`${who} の入る掛け合いが無い`);

  // ---------------------------------------------------------------- 遊ぶ：一人ずつ、全部聞き切る
  let heard = 0, nights = 0;
  PEOPLE.forEach((who, i) => {
    if (!T[who]) return;
    const G = loadEngine();
    const D = G.data;
    G.rand = seeded(500 + i);
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: i % 2 ? "女" : "男", age: 24, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999;
    S.mode = "explore";
    const mates = [who, ...PEOPLE.filter((x) => x !== who).slice(0, 2)];
    try {
      mates.forEach((id) => G.c2Join(id));
      G.tkState(S);
      const c = S.companions.find((x) => x.c2 === who);
      if (!c) { F(`${who} が仲間にならない`); return; }
      const lastStep = Math.max(...T[who].topics.filter((t) => t.kind === "past").map((t) => t.step));
      // 場所を巡り、好感度を高くして話し続ける
      const locs = ["nerva", "karna", "leavel", "garmund", "zephara", "w2_dranherz", "forest", "ruins", "frost", "fort", "w2_amyrein", "plains"];
      for (let k = 0; k < 60; k++) {
        S.loc = locs[k % locs.length];
        S.visited[S.loc] = true;
        S.day += 1;
        G.affState(S)[who] = 75;
        c.talkDay = 0;
        G.m2Talk(c.id);
        for (let j = 0; j < 3 && S.event === "tk_menu"; j++) {
          const menu = S.tk.cur.menu;
          if (!menu.length) break;
          const pickT = menu.findIndex((id) => G.tk.topic(id) && G.tk.topic(id).kind !== "cold");
          G.act("ev:" + Math.max(0, pickT));
          if (S.event !== "tk_topic") break;
          const t = G.tk.topic(S.tk.cur.topic);
          // 喜ぶ返しを選ぶ（頼まれごとは受ける）
          const rs = t.replies;
          let best = 0;
          rs.forEach((r, ri) => { const v = r.aff != null ? r.aff : (T[who].tones[r.tone] || 0) + (r.plus || 0); const bv = rs[best].aff != null ? rs[best].aff : (T[who].tones[rs[best].tone] || 0) + (rs[best].plus || 0); if (v > bv) best = ri; });
          G.act("ev:" + best);
          heard++;
        }
        if (S.mode === "event") {
          const end = G.actions()[0].list.findIndex((a) => a.label === "話を切り上げる");
          if (end >= 0) G.act("ev:" + end);
        }
        if (S.mode === "event") { S.mode = "explore"; S.event = null; S.tk.cur = null; }
      }
      const got = T[who].topics.filter((t) => t.kind === "past" && t.step === lastStep && S.tk.heard[t.id]);
      if (!got.length) F(`${who}: 好感度を上げて話し続けても、身の上の最後の段（${lastStep}）まで開かない`);
      if (S.log.some((l) => /\{[a-z0-9_]+\}/.test(l.text || ""))) F(`${who}: 記録に {n} などが残る`);
      // 夜の会話（野営の夜に、信頼している仲間が話しかける。四割半なので何夜か試す）
      S.mode = "explore"; S.event = null; S.tk.cur = null;
      let night = false;
      for (let k = 0; k < 40 && !night; k++) {
        S.day += 1;
        G.affState(S)[who] = 75;
        S.tk.heard = Object.fromEntries(Object.entries(S.tk.heard).filter(([id]) => (G.tk.topic(id) || {}).kind !== "night"));
        if (G.tk.night("camp") && S.tk.cur && S.companions.find((x) => x.id === S.tk.cur.cid).c2 === who) night = true;
        if (S.mode === "event") { S.mode = "explore"; S.event = null; S.tk.cur = null; }
      }
      if (night) nights++;
    } catch (e) {
      F(`${who}: 話している途中で例外 ${e.stack || e}`);
    }
  });

  if (!n) ok(`会話K2（${counts.join("・")}。掛け合い ${B.length}（組 ${pairs.size}）。全部聞き切る遊びで ${heard} 話・夜 ${nights} 人）`);
};
