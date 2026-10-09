// R3：初見の遊びやすさ
// - 各出発地で、着いてすぐ（数手番のうち）に「気になること」が出る。町ごとに三つから二つ、冒険ごとに組み合わせが変わる（一本道にしない）
// - 強制しない：ほかの行動（施設・旅立ち）はそのまま。どのきっかけにも、損をしない断り方がある。日がたてば消える
// - 続き（近場）が、その場所に出て、最後まで遊べる
// - 死んだら、墓碑に「倒れたわけ」と「次に試せそうなこと」が残る（数を書かない）。倒した敵の聞いた話に一つ足す
// - 古いセーブ（S.r3 が無い）でも動く
export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  const before = { n: 0 };
  const F = (m) => { before.n++; fail("R3: " + m); };
  const DIGIT = /[0-9０-９%％]/;
  const start = (G, cls, seed) => {
    const D = G.data;
    G.rand = seeded(seed);
    const stats = Object.fromEntries(D.STATS.map((k, i) => [k, 10 + ((seed * (i + 3)) % 7)]));
    G.newGame({ cls, stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 18 + (seed % 20), history: "", personality: "無口" } });
    return G.S;
  };
  const groupOf = (G) => G.actions().find((g) => g.title === "気になること");

  // ---- 1. 着いてすぐ見える・町ごとに二つ・組み合わせが変わる
  {
    const G = loadEngine();
    const D = G.data;
    for (const cls of Object.keys(D.CLASSES)) {
      const home = D.CLASSES[cls].start;
      const pool = (D.R3_HOOKS || {})[home] || [];
      if (pool.length < 3) { F(`${cls} の出発地 ${home} のきっかけが三つ無い`); continue; }
      const combos = new Set();
      for (let s = 1; s <= 12; s++) {
        const S = start(G, cls, s * 97 + cls.length);
        const g = groupOf(G);
        if (!g || g.list.length !== 2) { F(`${cls}: 着いた直後に「気になること」が二つ出ない`); break; }
        combos.add(g.list.map((x) => x.id).sort().join(","));
        const text = S.log.filter((x) => x.k === "nar").map((x) => x.text).join("");
        g.list.forEach((x) => { const hk = pool.find((p) => "r3:" + p.id === x.id); if (!hk || !text.includes(hk.see)) F(`${cls}: ${x.id} が着いた文の中で目に入らない`); });
        if (G.actions().length < 3 || !G.actions().some((gr) => gr.title === "旅立つ")) F(`${cls}: きっかけのせいで、ほかの行動が消えた`);
      }
      if (combos.size < 2) F(`${cls}: 冒険を変えても、きっかけの組み合わせが同じ（一本道）`);
    }
  }

  // ---- 2. 強制しない：断っても損をしない・日がたてば消える・古いセーブ
  {
    const G = loadEngine();
    const D = G.data;
    Object.values(D.R3_HOOKS).flat().forEach((hk) => {
      const e = D.EVENTS.find((x) => x.id === hk.ev);
      if (!e) { F(`${hk.id}: 出来事 ${hk.ev} が無い`); return; }
      const decline = e.choices.find((c) => !c.stat && !c.cost && !c.cond && !c.fight && c.ok && !c.ok.r3);
      if (!decline) F(`${hk.ev}: 断る選択肢が無い`);
      else if ((decline.ok.gold || 0) < 0 || (decline.ok.hp || 0) < 0 || decline.ok.fight || decline.ok.remove) F(`${hk.ev}: 断ると損をする`);
    });
    const S = start(G, "merc", 5);
    const g0 = groupOf(G).list.length;
    const gold = S.gold, hp = S.hp;
    G.act(groupOf(G).list[0].id);
    if (S.mode !== "event") F("きっかけを選んでも出来事が始まらない");
    const e = D.EVENTS.find((x) => x.id === S.event);
    const di = e.choices.findIndex((c) => !c.stat && !c.cost && !c.cond && !c.fight && c.ok && !c.ok.r3);
    G.act("ev:" + di);
    if (S.gold !== gold || S.hp !== hp) F("断ったら所持金か HP が減った");
    if ((groupOf(G) || { list: [] }).list.length !== g0 - 1) F("断ったきっかけが残っている／ほかのきっかけまで消えた");
    S.day = G.r3.DAYS + 1;
    if (groupOf(G)) F("日がたっても、出発地のきっかけが残っている");
    delete S.r3;
    try { G.actions(); if (groupOf(G)) F("古いセーブ（S.r3 無し）で、きっかけが出る"); } catch (err) { F("古いセーブ（S.r3 無し）で落ちる：" + err.message); }
  }

  // ---- 3. 続き（近場）を最後まで遊べる
  {
    let chains = 0;
    for (const [home, hooks] of Object.entries(loadEngine().data.R3_HOOKS)) {
      for (const hk of hooks) {
        const G = loadEngine();
        const D = G.data;
        const cls = Object.keys(D.CLASSES).find((c) => D.CLASSES[c].start === home);
        let S;
        for (let s = 1; s < 60; s++) { S = start(G, cls, s); if (S.r3.hooks.includes(hk.id)) break; }
        if (!S.r3.hooks.includes(hk.id)) { F(`${hk.id}: 選ばれる冒険が無い`); continue; }
        S.inv.herb = 3; S.inv.jerky = 2; S.gold = 200;
        G.rand = () => 0.01;   // 判定はすべて成功
        G.act("r3:" + hk.id);
        const pick = () => {
          const e = D.EVENTS.find((x) => x.id === S.event);
          const list = G.eventChoices();
          const go = list.find(({ c }) => c.ok && c.ok.r3 && c.ok.r3 !== (S.r3.cur || "_") && !c.fight) || list.find(({ c }) => c.stat && c.ok && !c.ok.fight) || list[0];
          G.act("ev:" + go.i);
          return e;
        };
        pick();
        let guard = 0;
        while (Object.keys(S.r3.follow).length && guard++ < 6) {
          const id = Object.keys(S.r3.follow)[0];
          const f = D.R3_FOLLOW[id];
          S.loc = f.loc; S.mode = "explore"; S.depth = f.depth || 0; S.visited[f.loc] = true;
          const a = (groupOf(G) || { list: [] }).list.find((x) => x.id === "r3:" + id);
          if (!a) { F(`${id}: ${f.loc} で続きが出ない`); break; }
          G.act(a.id);
          if (S.mode !== "event") { F(`${id}: 続きの出来事が始まらない`); break; }
          pick();
          if (S.mode === "combat") { F(`${id}: 判定に勝ったのに戦いになった`); break; }
          if (S.r3.follow[id] && S.r3.cur === id) { F(`${id}: 続きを終えたのに残っている`); break; }
          chains++;
        }
        if (Object.keys(S.r3.follow).length) F(`${hk.id}: 続きが終わらない`);
      }
    }
    // 戦いに入って逃げても、続きは残る（またその場所で選べる）
    {
      const G = loadEngine();
      const D = G.data;
      const S = start(G, "priest", 3);
      S.r3.follow.l_bread = 1;
      S.loc = "plains"; S.mode = "explore";
      G.act("r3:l_bread");
      const fi = D.EVENTS.find((x) => x.id === "r3_l_bread2").choices.findIndex((c) => c.fight);
      G.act("ev:" + fi);
      if (S.mode !== "combat") F("続きの戦いが始まらない");
      S.mode = "explore"; S.combat = null;
      if (!(groupOf(G) || { list: [] }).list.some((x) => x.id === "r3:l_bread")) F("戦いから逃げたら、続きが消えた");
    }
    if (!before.n) ok(`R3 最初の一歩（出発地 ${Object.keys(loadEngine().data.R3_HOOKS).length}・続き ${chains} 件を通しで）`);
  }

  // ---- 4. 死んだときの手がかり
  {
    const n0 = before.n;
    const G = loadEngine();
    const D = G.data;
    // 戦って死ぬ
    let S = start(G, "merc", 11);
    G.startCombat(["goblin", "goblin"], {});
    G.die("ゴブリンAに倒された");
    let g = G.P.graves[0];
    if (!g.r3 || !g.r3.what || !g.r3.hint) F("戦って死んでも、墓碑に倒れたわけが残らない");
    else {
      if (!g.r3.what.includes("ゴブリン")) F(`倒れたわけに相手の名が無い：${g.r3.what}`);
      if (DIGIT.test(g.r3.what + g.r3.hint)) F(`倒れたわけに数がある：${g.r3.what}${g.r3.hint}`);
    }
    if (G.r3Clue(g) !== g.r3) F("G.r3Clue が墓碑の手がかりを返さない");
    const heard = (((G.codex && G.codex()) || {}).heard || {})["foe:goblin"] || [];
    if (!heard.some((x) => /倒された者の話/.test(x.t))) F("倒した敵の「聞いた話」に一つ足されない");
    // 出来事で死ぬ
    S = start(G, "thief", 12);
    G.rand = () => 0.99;
    G.startEvent("trap");
    S.hp = 1; S.clungUsed = true;
    G.act("ev:1");
    g = G.P.graves[0];
    if (!S.over) F("罠の出来事で死ななかった（テストの前提）");
    else if (!g.r3 || !g.r3.what.includes("罠の通路") || !/切り抜ける|通り過ぎる|引き返して/.test(g.r3.hint)) F(`出来事で死んだときの手がかりがおかしい：${JSON.stringify(g.r3)}`);
    // 毒を抱えて
    S = start(G, "mage", 13);
    S.conds.push("毒");
    G.startCombat(["wolf"], {});
    S.combat.foes[0].hp = 5;
    G.die("飢えた野犬に倒された");
    if (!/毒/.test(G.P.graves[0].r3.hint)) F("毒が回って死んだのに、手がかりに毒の話が無い");
    // 引退には付けない
    S = start(G, "priest", 14);
    G.retire();
    if (G.P.graves[0].r3) F("引退したのに倒れたわけが付いた");
    // すべての敵：数を書かない・周回で同じ
    const G2 = loadEngine();
    for (const id of Object.keys(D.ENEMIES)) {
      const a = G.r3.foeTrait(id), b = G2.r3.foeTrait(id);
      if (a !== b) F(`${id}: 敵の様子の一行が周回でぶれる`);
      if (DIGIT.test(a)) F(`${id}: 敵の様子に数がある`);
      S = start(G, "merc", 20);
      G.startCombat([id], {});
      const c = G.r3.clue(S, `${D.ENEMIES[id].name}に倒された`);
      if (!c.what || !c.hint || DIGIT.test(c.what + c.hint)) F(`${id}: 倒れたわけが空か、数がある`);
      if (/弱点|弱い/.test(c.what + c.hint)) F(`${id}: 弱点をそのまま書いている`);
    }
    // 古い墓碑（r3 が無い）
    if (G.r3Clue({ name: "古い", end: "dead" }) !== null) F("古い墓碑で手がかりをでっち上げる");
    if (before.n === n0) ok("R3 死んだときの手がかり（墓碑・聞いた話・数なし）");
  }

  // ---- 5. 結果の文の直し（元の文が変わっていたら差し替えない。半分も当たらないなら、直しが古い）
  {
    const D = loadEngine().data;
    const all = D.R3_CLARITY || [];
    if (all.length < 30) F(`結果の文の直しが少ない（${all.length}）`);
    if ((D.R3_CLARITY_FIXED || 0) < all.length / 2) F(`結果の文の直しが ${D.R3_CLARITY_FIXED}/${all.length} しか当たらない（元の文が変わった）`);
    all.forEach(([id, i, k, from, to]) => { if (/！/.test(to)) F(`${id}[${i}].${k}: 直した文に「！」`); if (to.length <= from.length) F(`${id}[${i}].${k}: 直した文が短くなった`); });
    ok(`R3 結果の文の直し ${D.R3_CLARITY_FIXED}/${all.length}`);
  }

  // ---- 6. 目的への導線（ギルドの掲示の隅の頼みごと）：どの目的にも序盤の導線がある・誰にでも同じものが並ぶ・答えやメタな言葉が無い
  {
    const n0 = before.n;
    const D0 = loadEngine().data;
    const leads = D0.R3_LEADS || [];
    const homes = [...new Set(Object.values(D0.CLASSES).map((c) => c.start))];
    for (const goal of Object.keys(D0.GOALS)) {
      if (D0.GOALS[goal].text && !leads.some((l) => l.dir === goal)) F(`目的 ${goal} への導線になる依頼が無い`);
    }
    // 出発地のギルドに入ると並ぶ（目的によらず同じ）
    for (const home of homes) {
      const seen = new Set();
      for (const goal of Object.keys(D0.GOALS)) {
        const G = loadEngine();
        const cls = Object.keys(G.data.CLASSES).find((c) => G.data.CLASSES[c].start === home);
        G.rand = seeded(7);
        G.newGame({ cls, stats: Object.fromEntries(G.data.STATS.map((k) => [k, 14])), goal, goalText: goal === "custom" ? "海を見る" : undefined, profile: { name: "テスト", sex: "男", age: 30, history: "", personality: "" } });
        G.act("fac:guild");
        const g = G.actions().find((x) => x.title === "掲示の隅の頼みごと");
        const ids = g ? g.list.map((a) => a.id).sort().join(",") : "";
        if (!g) F(`${home}（${goal}）：ギルドに入っても掲示の隅の頼みごとが無い`);
        seen.add(ids);
        if (g && !G.actions().some((x) => x.list.some((a) => a.id === "back"))) F(`${home}：ギルドを出る行動が消えた`);
      }
      if (seen.size !== 1) F(`${home}：目的によって並ぶ頼みごとが変わる（誰でも受けられる形でない）`);
    }
    // 答え・目的の名前・メタな言葉を書かない
    const BAN = /伝説の剣|ヴォルグリム|白夜|竜の墓場|鬼ヶ島|王になる|国王に|大富豪|大金持ち|使徒を討|目的|宿願|あなたの望み|！/;
    const texts = [];
    const out = (w, o) => { if (!o) return; ["text", "memo", "chron"].forEach((k) => o[k] && texts.push([w, o[k]])); out(w + ".win", o.win); };
    leads.forEach((l) => texts.push([l.id, l.label + l.sub]));
    D0.EVENTS.filter((e) => /^r3_/.test(e.id)).forEach((e) => { texts.push([e.id, e.title + e.text]); e.choices.forEach((c, i) => { texts.push([e.id, c.label]); out(`${e.id}[${i}].ok`, c.ok); out(`${e.id}[${i}].ng`, c.ng); out(`${e.id}[${i}]`, { win: c.win }); }); });
    texts.forEach(([w, t]) => { if (BAN.test(t)) F(`${w}：答えか目的の名前・メタな言葉「${t.match(BAN)[0]}」`); if (DIGIT.test(t.replace(/[0-9]+G/g, ""))) F(`${w}：文に数がある`); });
    // 通しで：受けて、行き先に続きが出て、終わる
    let done = 0;
    for (const home of homes) for (const l of leads) {
      const G = loadEngine();
      const D = G.data;
      const cls = Object.keys(D.CLASSES).find((c) => D.CLASSES[c].start === home);
      const S = start(G, cls, 31);
      G.rand = () => 0.01;
      G.act("fac:guild");
      G.act("r3:" + l.id);
      if (S.event !== l.ev) { F(`${home} ${l.id}: 出来事が始まらない`); continue; }
      const acc = G.eventChoices().find(({ c }) => c.ok && c.ok.r3 && !c.stat) || G.eventChoices()[0];
      G.act("ev:" + acc.i);
      const fid = Object.keys(S.r3.follow)[0];
      if (!fid) { done++; continue; }
      const to = G.r3.followLoc(S.r3, fid);
      if (!D.LOCS[to]) { F(`${l.id}: 行き先 ${to} が無い`); continue; }
      if (to !== home && !(D.LOCS[home].links || {})[to]) F(`${home} ${l.id}: 行き先 ${to} が隣でない（近場でない）`);
      S.loc = to; S.mode = "explore"; S.fac = null; S.depth = 0;
      const a = (G.actions().find((x) => x.title === "気になること") || { list: [] }).list.find((x) => x.id === "r3:" + fid);
      if (!a) { F(`${home} ${l.id}: ${to} で続きが出ない`); continue; }
      G.act(a.id);
      G.act("ev:" + G.eventChoices().find(({ c }) => c.stat).i);
      if (S.r3.follow[fid]) F(`${home} ${l.id}: 続きが終わらない`); else done++;
    }
    if (before.n === n0) ok(`R3 目的への導線（${leads.map((l) => `${l.dir}:${l.id}`).join("・")}・通しで ${done} 件）`);
  }
};
