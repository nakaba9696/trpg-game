// F4：選んだことが、あとで返ってくる（src/engine/zzzzzzzzz_echo_f4.js・src/data/echo_f4_*.js）
// - 表がつながっている：印を付けた既存の出来事と選択肢があり、覚えの鍵ごとに返ってくる出来事がある。返ってくる出来事はふつうには起きない（w: 0）
// - 出来事の結果を覚え、日がたって別の場所に行くと返ってくる。起きた最初に「あのときの…」の一文（k: "echo"）が、場所の名と一緒に出る。一度返ったらもう起きない
// - 同じ場所・日が浅いうちは返ってこない。古いセーブ（S.echo が無い）でも動く
// - 町の空気：行いで慕われる／嫌われる。着いたときの一文・通行人のひとこと・施設の「あなたなら」・店の値段が変わる
// - 迷う選択：どの選択肢にも、得るもの（金・名声・持ち物・成長・回復）と、返ってくる覚えか失うものがある
// - 結果を当てはめても壊れない（返ってくる出来事のすべての選択肢を選んでみる）
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const X = G.echo;
  if (!X) { fail("G.echo が無い"); return; }
  const before = { n: 0 };
  const err = (m) => { before.n++; fail(m); };
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
  const start = (seed = 5, cls = "merc") => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls, stats: { ...stats }, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const ev = (id) => D.EVENTS.find((e) => e.id === id);

  // ---------------------------------------------------------------- 表のつながり
  const keys = Object.keys(D.ECHO_KEYS);
  const backs = D.EVENTS.filter((e) => e.echo);
  for (const [id, list] of Object.entries(D.ECHO_TAGS)) {
    const e = ev(id);
    if (!e) { err(`ECHO_TAGS: 出来事 ${id} が無い`); continue; }
    for (const t of list) {
      if (!D.ECHO_KEYS[t.key]) err(`ECHO_TAGS ${id}: 覚えの鍵 ${t.key} が無い`);
      if (!e.choices.some((c) => !c.c10 && t.pick.test(c.label))) err(`ECHO_TAGS ${id}: 選択肢 ${t.pick} が無い`);
    }
  }
  if (X.tagged < 15) err(`既存の出来事の結果に付いた印が少ない（${X.tagged}）`);
  const made = new Set();
  for (const e of D.EVENTS) for (const c of e.choices) for (const o of [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win]) { const k = X.keyOf(o); if (k) made.add(k); }
  for (const k of keys) {
    if (!made.has(k)) err(`覚えの鍵 ${k}: 覚える出来事の結果が無い`);
    if (!backs.some((e) => e.echo === k)) err(`覚えの鍵 ${k}: 返ってくる出来事が無い`);
  }
  for (const e of backs) {
    if (!D.ECHO_KEYS[e.echo]) err(`返ってくる出来事 ${e.id}: 覚えの鍵 ${e.echo} が無い`);
    if (e.w !== 0) err(`返ってくる出来事 ${e.id}: ふつうにも起きる（w: 0 のはず）`);
    if (!/あの/.test(e.recall || "") || !/\{at\}/.test(e.recall)) err(`返ってくる出来事 ${e.id}: 「あのときの…」の一文（{at} つき）が無い`);
  }
  if (backs.length < 25) err(`返ってくる出来事が少ない（${backs.length}）`);

  // ---------------------------------------------------------------- 覚えて、返ってくる
  {
    const S = start(11);
    delete S.echo; // 古いセーブ
    if (X.ready(S).length || X.mood(S) === undefined) err("古いセーブで覚えがあることになる");
    S.loc = "karna";
    S.gold = 100;
    G.startEvent("pickpocket");
    const i = ev("pickpocket").choices.findIndex((c) => /見逃して/.test(c.label));
    G.chooseEvent(i);
    const m = X.mark(S, "spared_thief");
    if (!m || m.loc !== "karna") err("スリを見逃したことを覚えていない");
    if (X.ripe(S, "spared_thief")) err("覚えたその日に返ってくる");
    S.day += 10;
    if (X.ripe(S, "spared_thief")) err("同じ町で返ってくる");
    S.loc = "nerva";
    if (!X.ripe(S, "spared_thief")) err("日がたって別の町にいるのに返ってこない");
    if (!X.ready(S).some((e) => e.id === "f4r_thief_spared")) err("返ってくる出来事が選べる中に無い");
    // 出来事を引けば、熟した覚えが返ってくる（G.rand を小さく固定）
    const r0 = G.rand;
    G.rand = () => 0.01;
    const e = G.randomEvent();
    G.rand = r0;
    if (!e || e.echo !== "spared_thief") err(`熟した覚えが返ってこない（${e && e.id}）`);
    const at = S.log.length;
    G.startEvent(e);
    const line = S.log.slice(at).find((l) => l.k === "echo");
    if (!line) err("「あのときの…」の一文が出ない");
    else {
      if (!line.text.includes(D.LOCS.karna.name)) err(`「あのときの…」に覚えた場所の名が無い：${line.text}`);
      if (/\{|\}|\d/.test(line.text)) err(`「あのときの…」に置き換え残りか数がある：${line.text}`);
      const ti = S.log.slice(at).findIndex((l) => l.k === "title");
      if (S.log[at + ti + 1] !== line) err("「あのときの…」が見出しのすぐ後ろに無い");
    }
    if (!m.done) err("返った覚えに印が付かない");
    if (X.ripe(S, "spared_thief")) err("一度返った覚えが、また返ってくる");
    G.chooseEvent(0);
    if (S.mode === "event") err("返ってきた出来事を終えられない");
  }

  // ---------------------------------------------------------------- 町の空気
  {
    const S = start(12);
    S.loc = "karna";
    if (X.mood(S) !== "plain") err(`はじめから町の空気が ${X.mood(S)}`);
    X.townAdd(S, X.LOVED);
    if (X.mood(S) !== "loved") err("行いを重ねても慕われない");
    if (!X.arriveLine(S)) err("慕われている町に着いたときの一文が無い");
    if (!G.ambientPool(S).some((a) => /^u3_f4_loved/.test(a.id))) err("慕われている町の通行人のひとことが無い");
    S.mode = "fac"; S.fac = "inn";
    const inn = G.actions().flatMap((g) => g.list).find((a) => a.c10 === "echo:loved");
    if (!inn) err("慕われている町の宿に「あなたなら」の行動が無い");
    S.fac = "shop";
    const buy = G.actions().flatMap((g) => g.list).find((a) => /^shop:buy:/.test(a.id));
    if (buy) {
      const it = D.ITEMS[buy.id.slice(9)];
      const p = +/^(\d+)G/.exec(buy.sub)[1];
      if (it.price >= 10 && !(p < it.price)) err(`慕われている町で値が下がらない（${it.price}→${p}）`);
      S.gold = 999;
      const g0 = S.gold;
      G.act(buy.id);
      if (g0 - S.gold !== p) err(`払った額が見せた値と違う（${p}・${g0 - S.gold}）`);
    }
    S.mode = "explore"; S.fac = null;
    X.townAdd(S, -9);
    if (X.mood(S) !== "hated") err("悪い行いを重ねても嫌われない");
    if (!G.ambientPool(S).some((a) => /^u3_f4_hated/.test(a.id))) err("嫌われている町の通行人のひとことが無い");
    S.mode = "fac"; S.fac = "shop";
    const buy2 = G.actions().flatMap((g) => g.list).find((a) => /^shop:buy:/.test(a.id));
    if (buy2) {
      const it = D.ITEMS[buy2.id.slice(9)];
      const p = +/^(\d+)G/.exec(buy2.sub)[1];
      if (it.price >= 5 && !(p > it.price)) err(`嫌われている町で値が上がらない（${it.price}→${p}）`);
      S.gold = 999;
      const g0 = S.gold;
      G.act(buy2.id);
      if (g0 - S.gold !== p) err(`払った額が見せた値と違う（${p}・${g0 - S.gold}）`);
    }
    S.mode = "fac"; S.fac = "church"; S.gold = 999;
    const fix = G.actions().flatMap((g) => g.list).find((a) => a.c10 === "echo:hated");
    if (!fix) err("嫌われている町の教会に、詫びる道が無い");
    else { const t0 = X.townScore(S); G.act(fix.id); if (!(X.townScore(S) > t0)) err("詫びても町の空気が戻らない"); }
    S.mode = "explore"; S.fac = null;
    // よその町はそのまま
    S.loc = "nerva";
    if (X.mood(S) !== "plain") err("行いがよその町の空気まで変える");
    // 名が知られていれば、はじめての町でも「誰も知らない」と言われない
    S.fame = 100;
    if (X.mood(S) !== "known") err("名が知られていても known にならない");
    if (G.u14 && /誰もあなたの顔を知らない/.test(G.u14.firstLine(1) + G.u14.firstLine(2))) err("名が知られているのに「誰もあなたの顔を知らない」と言う");
    // 見られた罪は、その町の空気を下げる
    S.fame = 0;
    S.loc = "leavel";
    const t0 = X.townScore(S);
    G.addInfamy(3);
    if (!(X.townScore(S) < t0)) err("見られた罪が町の空気に響かない");
  }

  // ---------------------------------------------------------------- 迷う選択：どの選択肢にも得と損
  {
    const gain = (o) => !!o && !!(o.gold > 0 || o.fame > 0 || o.item || o.grow || o.heal || o.hp > 0 || o.virtue > 0 || o.companion);
    const cost = (c, o) => !!(c.cost || (o && (o.echo || o.gold < 0 || o.hp < 0 || o.cond || o.sin)));
    const dil = D.EVENTS.filter((e) => /^f4d_/.test(e.id));
    if (dil.length < 5) err(`迷う選択が少ない（${dil.length}）`);
    for (const e of dil) {
      const base = e.choices.filter((c) => !c.c10);
      if (base.length < 3) err(`迷う選択 ${e.id}: 選択肢が少ない`);
      if (base.filter((c) => gain(c.ok)).length < 2) err(`迷う選択 ${e.id}: 得のある選択肢が二つ無い`);
      if (base.filter((c) => c.ok && c.ok.echo).length < 2) err(`迷う選択 ${e.id}: あとで返ってくる選択肢が二つ無い`);
      for (const c of base) if (!gain(c.ok) && !cost(c, c.ok) && !(c.ok && c.ok.memo)) err(`迷う選択 ${e.id}「${c.label}」: 得も損も無い`);
    }
  }

  // ---------------------------------------------------------------- 返ってくる出来事のすべての選択肢を選んでみる
  {
    let n = 0;
    for (const e of backs.concat(D.EVENTS.filter((x) => /^f4[dt]_/.test(x.id)))) {
      e.choices.forEach((c, i) => {
        if (c.c10) return;
        const S = start(100 + n++);
        S.loc = e.where.includes("wild") && !e.where.includes("town") ? (Object.keys(D.LOCS).find((k) => D.LOCS[k].type === "wild") || S.loc) : "karna";
        S.gold = 500;
        S.day = 40;
        if (e.echo) { X.st(S).marks.push({ k: e.echo, day: 1, loc: "leavel", n: 1 }); }
        try {
          G.startEvent(e);
          G.chooseEvent(i);
          for (let k = 0; k < 40 && S.mode === "combat" && !S.over; k++) G.act(G.actions().flatMap((g) => g.list).find((a) => !a.disabled).id);
        } catch (x) { err(`${e.id}[${i}] を選ぶと壊れる：${x.message}`); }
        for (const o of [c.ok, c.ng, c.win]) if (o && o.text && /\d/.test(o.text)) err(`${e.id}[${i}] の文に数字がある`);
      });
    }
  }

  if (!before.n) ok(`F4 因果（覚えの鍵 ${keys.length}・既存の出来事の印 ${X.tagged}・返ってくる出来事 ${backs.length}・迷う選択 ${D.EVENTS.filter((e) => /^f4d_/.test(e.id)).length}・町の空気）`);
};
