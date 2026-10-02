// M6：物語の終わり方（src/engine/ending_m6.js・src/data/epilogue_m6.js）
// - 目的 5 つそれぞれに、終えられる節目がある。節目に着くと尋ねられ、終えると人生の物語とその後のダイジェストが出る
// - 死んでも物語が出る。段落は 4〜8（その後は 4〜6）。見せてはいけない言葉が無い。置き換え忘れが無い
// - 同じ人生でも言い回しが揺れる。短い人生は短い。古いセーブ・古い墓碑でも動く。光の壁で終わる
const BANNED = /見世物|観客|客席|舞台|台本|言霊|神々が.{0,6}眺め/;

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let failures = 0;
  const fail = (m) => { failures++; fail0(m); };
  const G = loadEngine();
  const D = G.data;
  const M6 = D.M6;
  const start = (goal, seed, cls) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: cls || Object.keys(D.CLASSES)[seed % 5], stats, caps, goal, goalText: goal === "custom" ? "海の見える町に住む" : undefined,
      profile: { name: "テスト", sex: "女", age: "22", history: "借金のかたに傭兵団へ売られ、腕一本で抜け出した", personality: "無口" } });
    G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  const texts = (st) => [...st.life, ...(st.after || []), st.epitaph];
  const checkStory = (where, st, dead) => {
    if (!st) { fail(`${where}: 人生の物語が無い`); return; }
    if (!(st.life.length >= 4 && st.life.length <= 8)) fail(`${where}: 人生の物語が ${st.life.length} 段落（4〜8）`);
    if (dead && st.after) fail(`${where}: 死んだのに「その後」がある`);
    if (!dead && !(st.after && st.after.length >= 4 && st.after.length <= 6)) fail(`${where}: その後のダイジェストが ${st.after ? st.after.length : 0} 段落（4〜6）`);
    if (!st.narrator) fail(`${where}: 語り手が無い`);
    if (!st.epitaph) fail(`${where}: 墓碑の一行が無い`);
    for (const t of texts(st)) {
      if (!t || !t.trim()) fail(`${where}: 空の段落`);
      else if (/[{}]|undefined|NaN|null/.test(t)) fail(`${where}: 置き換え忘れ「${t.slice(0, 50)}」`);
      else if (BANNED.test(t)) fail(`${where}: 見せない言葉「${t.match(BANNED)[0]}」`);
    }
  };

  // ---- データ：目的ごとの節目、表の欄
  {
    for (const g of Object.keys(D.GOALS)) if (!M6.MILESTONES.some((m) => m.goal === g)) fail(`目的 ${g} に節目が無い`);
    const ids = new Set();
    for (const m of M6.MILESTONES) {
      if (ids.has(m.id)) fail(`節目 ${m.id} が重複`);
      ids.add(m.id);
      if (!m.title || !m.end || !m.line || typeof m.test !== "function") fail(`節目 ${m.id}: 欄が足りない`);
      if (!m.special && !m.text) fail(`節目 ${m.id}: 場面の文が無い`);
      if (m.after !== "wall" && !M6.AFTER.soon[m.after]) fail(`節目 ${m.id}: その後の型 ${m.after} が無い`);
    }
    for (const [k, n] of Object.entries(M6.NARRATORS)) for (const f of ["open", "hear", "gap", "close"]) if (!(n[f] || []).length) fail(`語り手 ${k}: ${f} が無い`);
    for (const h of M6.HIGHLIGHTS) if (!(h.lines || []).length) fail(`出来事の型 ${h.key}: 文が無い`);
    for (const d of M6.AFTER.deaths) if (d.trophy && !D.TROPHIES.some((t) => t.key === d.trophy)) fail(`最期 ${d.key}: トロフィー ${d.trophy} が無い`);
    // 表の文すべてに、見せない言葉が無い
    const walk = (x, w) => {
      if (typeof x === "string") { if (BANNED.test(x)) fail(`M6 の文 ${w} に「${x.match(BANNED)[0]}」`); }
      else if (Array.isArray(x)) x.forEach((y, i) => walk(y, `${w}[${i}]`));
      else if (x && typeof x === "object") Object.entries(x).forEach(([k, y]) => walk(y, `${w}.${k}`));
    };
    walk(M6, "M6");
    walk(D.EVENTS.filter((e) => e.id.startsWith("m6_")).map((e) => ({ ...e, cond: null })), "出来事");
  }

  // ---- 目的ごとに、節目に着いて、終える
  const reach = {
    majin: (S) => { S.flags.graw = true; },
    king: (S) => { S.title = "国王"; },
    rich: (S) => { S.gold = 12000; },
    sword: (S) => { G.give("volgrim"); },
    custom: (S) => { S.day = 40; S.fame = 30; },
  };
  let seed = 100;
  for (const goal of Object.keys(D.GOALS)) {
    const S = start(goal, seed++);
    if (G.m6CanEnd()) fail(`${goal}: 旅立ったばかりで終えられる`);
    reach[goal](S);
    G.endTurn();
    const want = M6.MILESTONES.find((m) => m.goal === goal).id;
    if (S.m6?.pending !== want) { fail(`${goal}: 目的の節目 ${want} で尋ねられない（${S.m6?.pending}）`); continue; }
    if (!S.log.some((e) => e.k === "title" && /^節目：/.test(e.text))) fail(`${goal}: 節目の場面が記録に出ない`);
    if (!G.m6CanEnd()) fail(`${goal}: 節目に着いたのに終えられない`);
    G.endStory(S.m6.pending);
    if (S.over !== "end" || S.mode !== "over" || S.ending?.id !== want) fail(`${goal}: 終わらない（${S.over}・${S.ending?.id}）`);
    checkStory(`${goal} で終える`, S.story, false);
    const grave = G.P.graves[0];
    if (!grave || grave.id !== S.id || !grave.story || grave.epitaph !== S.story.epitaph || grave.ending !== want) fail(`${goal}: 墓碑に物語と一行が残らない`);
    if (!S.chronicle.some((c) => c.kind === "epilogue" && c.text === S.story.epitaph)) fail(`${goal}: 年表に最期の一行が残らない`);
    if (!G.P.trophies.m6_end) fail(`${goal}: 「物語を閉じる」のトロフィーが無い`);
    if (S.story.death?.trophy && !G.P.trophies[S.story.death.trophy]) fail(`${goal}: 最期のトロフィー ${S.story.death.trophy} が無い`);
  }

  // ---- 続けたら、尋ねるのは消えるが、あとで終えられる。一度に着いたら一番大きい節目だけ尋ねる
  {
    const S = start("rich", 201);
    S.title = "騎士"; S.gold = 3500;
    G.endTurn();
    if (S.m6.pending !== "knight") fail(`騎士と小金が同時：尋ねるのが ${S.m6.pending}（knight のはず）`);
    G.endTurn();
    if (S.m6.pending) fail("次の手番になっても、節目の問いが残る");
    G.endTurn();
    if (S.over) fail("続けたのに終わった");
    if (!G.m6CanEnd()) fail("続けたあと、終えられない");
    G.retire();
    if (S.over !== "end" || S.ending.id !== "knight") fail(`あとで終えると、節目 ${S.ending?.id} で終わる（knight のはず）`);
    checkStory("あとで終える", S.story, false);
    // 旅を続ける（画面のボタン）
    const S2 = start("king", 202);
    S2.title = "騎士";
    G.endTurn();
    G.m6GoOn();
    if (S2.m6.pending || S2.over) fail("「旅を続ける」で問いが消えない");
  }

  // ---- 死でも物語が出る。死因・場所。正気 0・獣（M5 の S.fate）
  {
    const S = start("majin", 301);
    G.die("オークに倒された");
    checkStory("死", S.story, true);
    if (!S.story.epitaph.includes("オークに倒された")) fail("死の墓碑に死因が無い");
    if (!G.P.graves[0].story) fail("死んだ墓碑に物語が無い");
    if (!G.P.trophies.m6_brief) fail("すぐ死んだのに「帳面の一行」が無い");
    for (const fate of ["mad", "beast"]) {
      const S2 = start("king", 302);
      S2.fate = fate;
      S2.chronicle.push({ date: G.date(), kind: fate === "mad" ? "sanity" : "beast", text: "テスト" });
      G.die("テスト");
      checkStory(`終わり方 ${fate}`, S2.story, true);
      if (S2.story.epitaph !== M6.EPITAPH[fate].replace("{place}", G.loc().name)) fail(`${fate}: 墓碑の一行が違う（${S2.story.epitaph}）`);
    }
  }

  // ---- 光の壁（港で日誌を拾い、船を出して、触れる）
  {
    const S = start("sword", 401);
    S.loc = "nerva"; S.gold = 2000;
    G.startEvent("m6_wall_log");
    G.chooseEvent(0);
    if (!S.flags.m6_wall_log) fail("光の壁：日誌を拾えない");
    if (!D.EVENTS.find((e) => e.id === "m6_wall_captain").cond(S)) fail("光の壁：日誌を拾っても船長が出ない");
    G.startEvent("m6_wall_captain");
    const gold = S.gold;
    G.chooseEvent(0);
    if (S.event !== "m6_wall_sea" || S.gold !== gold - 800) fail(`光の壁：船に乗れない（${S.event}・${S.gold}G）`);
    G.chooseEvent(0);
    if (S.event !== "m6_wall") fail("光の壁：壁に着かない");
    const day = S.day;
    G.chooseEvent(0);
    if (S.event !== "m6_wall_touch") fail("光の壁：触れたあと、終えるか続けるかを尋ねない");
    G.chooseEvent(0);
    if (S.over !== "end" || S.ending?.id !== "wall" || !(day >= 41)) fail(`光の壁：触れても終わらない（${S.over}・${S.ending?.id}）`);
    checkStory("光の壁", S.story, false);
    if (S.story.epitaph !== M6.EPITAPH.wall) fail("光の壁：墓碑の一行が違う");
    if (!G.P.trophies.m6_wall) fail("光の壁：トロフィーが無い");
    const S2 = start("sword", 402);
    G.startEvent("m6_wall");
    G.chooseEvent(1);
    if (S2.over || !S2.flags.m6_wall_seen) fail("光の壁：舵を返しても終わってしまう");
  }

  // ---- 古いセーブ（S.m6・S.story・S.ending が無い）と、古い墓碑（物語が無い）
  {
    const S = start("king", 501);
    delete S.m6; delete S.story; delete S.ending;
    try { G.endTurn(); G.m6CanEnd(); S.title = "国王"; G.endTurn(); if (S.m6.pending !== "king") fail("古いセーブで節目に着かない"); }
    catch (e) { fail(`古いセーブで例外 ${e.message}`); }
    const old = { id: "rold", name: "古い人", cls: "傭兵", goal: "魔人を討ち果たす", end: "dead", cause: "オーガに倒された", date: "ノクターラ暦1127年 春 9日",
      location: "迷いの森", turns: 40, fame: 12, title: "", stats: { 筋力: 50 }, chronicle: [{ date: "x", kind: "start", text: "始まり" }], at: 1 };
    const a = G.m6StoryOf(old), b = G.m6StoryOf(old);
    checkStory("古い墓碑", a, true);
    if (JSON.stringify(a) !== JSON.stringify(b)) fail("古い墓碑の物語が、読むたびに変わる");
    checkStory("古い墓碑（終えた）", G.m6StoryOf({ ...old, id: "rold2", end: "end" }), false);
    if (G.m6StoryOf({ ...old, end: "" })) fail("終わっていない冒険に物語が出る");
  }

  // ---- M2・M4 の欄があれば使う（無くても動く）
  {
    const S = start("rich", 601);
    S.m2 = { gone: [{ name: "槍兵のテス", how: "death" }, { name: "盗賊のロロ", how: "slain" }] };
    S.companions = [{ name: "僧侶のミナ", bond: 95 }];
    S.chronicle.push({ date: G.date(), kind: "world", text: "黒鉄の砦が空から焼かれたと聞く" });
    S.day = 200;
    let seen = false;
    for (let i = 0; i < 12; i++) {
      G.rand = seeded(610 + i);
      const st = G.m6Compose(S);
      checkStory("M2・M4 の欄", Object.assign(st, { epitaph: "x" }), true);
      if (st.life.join("").includes("槍兵のテス")) seen = true;
    }
    if (!seen) fail("亡くした仲間（M2 の gone）が物語に出てこない");
  }

  // ---- 言い回しの揺れ：同じ人生でも、乱数で文が変わる
  {
    const S = start("majin", 701);
    S.flags.graw = true; S.fame = 300; S.day = 120; S.counters.quests = 12;
    const seen = new Set();
    for (let i = 0; i < 6; i++) { G.rand = seeded(720 + i); seen.add(G.m6Compose(S).life.join("")); }
    if (seen.size < 4) fail(`同じ人生の物語が ${seen.size} 通りしかない（6 回）`);
  }

  // ---- ランダムに遊んで、いろいろな死に方・長さで物語が出る
  {
    let n = 0, ended = 0, short = 0, maxShort = 0, maxLong = 0;
    for (let g = 0; g < 60; g++) {
      const cls = Object.keys(D.CLASSES)[g % 5];
      const S = start(Object.keys(D.GOALS)[g % 5], 800 + g, cls);
      S.maxHp = S.hp = G.maxHpOf(S.stats);
      if (g % 3 === 0) { S.gold = 4000; S.fame = 200; }
      for (let step = 0; step < 600 && !S.over; step++) {
        const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
        if (!acts.length) break;
        G.act(acts[Math.floor(G.rand() * acts.length)].id);
        if (S.m6?.pending && g % 4 === 1) G.endStory(S.m6.pending);
      }
      if (!S.over) G.retire();
      n++;
      checkStory(`ランダム ${g}（${S.over}・${S.day}日）`, S.story, S.over === "dead");
      if (S.over === "end") ended++;
      if (S.over === "dead" && S.day <= 10) { short++; maxShort = Math.max(maxShort, S.story.life.length); }
      else maxLong = Math.max(maxLong, S.story.life.length);
      if (failures > 20) break;
    }
    if (short && maxShort > 5) fail(`短い人生の物語が ${maxShort} 段落（5 まで）`);
    if (!failures) ok(`終わり方（節目 ${M6.MILESTONES.length}・語り手 ${Object.keys(M6.NARRATORS).length}・ランダム ${n} 回で物語が出た。終えた ${ended}・すぐ死んだ ${short}（最長 ${maxShort} 段落）・ほか最長 ${maxLong} 段落）`);
  }
};
