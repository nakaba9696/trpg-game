// W12：遺跡らしさ。古王国ルヴェナールの遺跡（D.W12_RUINS。src/data/w12_ruins.js）の迷宮の階に、遺跡だけの行動の組を出す：
//   碑文を読む（知力。古文字読み k1_letters が無いと一行目しか読めない。技を覚えたら読み直せる）
//   仕掛けを解く（遺跡ごとの能力値。集めた手がかり〔今の冒険で見つけた断片〕が多いほど易しい。解けると隠し部屋の壁画）
//   古い遺物を調べる（知力。目利き k1_appraise があると易しい）
// 断片が全部そろうと、分かったこと（D.W12_SECRET。山場）・古い鍵・トロフィー。鍵でエル・ナフ遺構の隠し部屋（D.W12_VAULT）が開く。
// 設定は docs/lore/ancient.md。図鑑の頁「古い文明」（src/ui/zw12_ruins.js）は G.P.w12（冒険をまたいで残る）を読む。今の冒険の得（仕掛けの易しさ・褒美）は S.w12 だけで決める（L1：覚えていても得をしない）。
//
// explore.js は書き換えず、G.exploreActions・G.exploreAct を包む（w9_spots.js と同じやり方）。
// W11 の「部屋の表を外から足す口」が入ったら、同じ断片と仕掛けを部屋（碑文の間・仕掛けの間・壁画の回廊）として載せ替える。それまでは各階の行動で出す。
// 背景：仕掛けを解いた・隠し部屋を開けたら、その階にいるあいだ特別な一枚（S.w12.view。engine/zzzzzzzzzzzzzzzzz_w12_view.js が R5 の背景の決め方に足す。絵は ui/scene_v2_w12.js）。
// セーブに足すもの：S.w12 = { got: { 断片: 読めた行の数 }, tried: { "場所:階:種類": 日 }, done, vault, view: { key, loc, depth } }・G.P.w12 = { got: { 断片: { n, date, by } }, done }。
// 古いセーブに無くても動く（W12.st が作る）。DOM には触らない。乱数は G.rand / G.pick だけ。レーン W（W12）
(function (G) {
  const D = G.data;
  const W12 = (G.w12 = G.w12 || {});
  const ruins = () => D.W12_RUINS || {};
  const KIND = { script: "碑文", mural: "壁画", relic: "遺物" };
  W12.KIND = KIND;

  W12.st = (S) => {
    S = S || G.S;
    const w = (S.w12 = S.w12 || {});
    w.got = w.got || {};
    w.tried = w.tried || {};
    return w;
  };
  W12.prof = () => {
    if (!G.P) G.P = { trophies: {}, graves: [] };
    const p = (G.P.w12 = G.P.w12 || {});
    p.got = p.got || {};
    return p;
  };
  W12.all = () => Object.entries(ruins()).flatMap(([loc, R]) => R.frags.map((f) => ({ ...f, loc })));
  W12.frag = (id) => W12.all().find((f) => f.id === id);
  W12.count = (S) => { const w = W12.st(S); return W12.all().filter((f) => w.got[f.id]).length; };
  const letters = (S) => !!(G.k1 && G.k1.knows && G.k1.knows("k1_letters", S));
  const knows = (id, S) => !!(G.k1 && G.k1.knows && G.k1.knows(id, S));
  // 読める行の数（古文字読みがあれば全部、無ければ一行目だけ。壁画と遺物は見れば全部分かる）
  W12.readable = (f, S) => (f.kind !== "script" || letters(S) ? f.lines.length : 1);
  // 仕掛けの易しさ：今の冒険で見つけた断片一つにつき +4（上限 +28）
  W12.clue = (S) => Math.min(28, 4 * W12.count(S));

  // ---------------------------------------------------------------- その階でできること
  const here = (S) => {
    const R = ruins()[S.loc];
    const L = D.LOCS[S.loc];
    if (!R || !L || L.type !== "dungeon" || !(S.depth > 0)) return null;
    return R;
  };
  // 今いる階の、まだ手に入れていない断片（碑文は読み直せる行が残っていれば）
  W12.open = (S, kind) => {
    S = S || G.S;
    const R = here(S);
    if (!R) return [];
    const w = W12.st(S);
    return R.frags.filter((f) => f.kind === kind && f.floor === S.depth && (w.got[f.id] || 0) < W12.readable(f, S));
  };
  const tkey = (S, kind) => `${S.loc}:${S.depth}:${kind}`;
  W12.triedToday = (S, kind) => W12.st(S).tried[tkey(S, kind)] === S.day;

  W12.acts = (S) => {
    S = S || G.S;
    const R = here(S);
    if (!R) return [];
    const out = [];
    const busy = (k) => W12.triedToday(S, k);
    // W11 の大きな迷宮（エル・ナフ遺構）では、断片は「かけらの部屋」の出来事から（data/w12_ruins.js の w12_nf_room*）。ここでは隠し部屋の鍵だけ
    const rooms = !!(G.w11 && G.w11.large && G.w11.large(S.loc));
    const sc = rooms ? [] : W12.open(S, "script");
    if (sc.length) {
      const f = sc[0];
      const again = (W12.st(S).got[f.id] || 0) > 0;
      const bonus = letters(S) ? 15 : 0;
      const diff = letters(S) ? "普通" : "難しい";
      out.push({ id: "w12:script", label: again ? "古文字読みで、碑文の続きを読む" : "壁の碑文を読む",
        sub: busy("script") ? "今日はもう読んだ" : `知力 ${G.chance("知力", diff, bonus)}%${letters(S) ? "・古文字読み" : ""}`,
        disabled: busy("script"), kw: ["碑文", "読", "字"] });
    }
    const R2 = R.gear;
    const mur = rooms ? [] : W12.open(S, "mural");
    if (R2 && R2.floor === S.depth && mur.length) {
      const c = W12.clue(S);
      out.push({ id: "w12:gear", label: R2.label,
        sub: busy("gear") ? "今日はもう試した" : `${R2.stat} ${G.chance(R2.stat, R2.diff, c)}%${c ? "・手がかり " + W12.count(S) : ""}`,
        disabled: busy("gear"), kw: ["仕掛け", "解", "扉"] });
    }
    const rel = rooms ? [] : W12.open(S, "relic");
    if (rel.length) {
      const bonus = knows("k1_appraise", S) ? 15 : 0;
      out.push({ id: "w12:relic", label: "古い文明の遺物を調べる",
        sub: busy("relic") ? "今日はもう調べた" : `知力 ${G.chance("知力", "普通", bonus)}%${bonus ? "・目利き" : ""}`,
        disabled: busy("relic"), kw: ["遺物", "調べ"] });
    }
    const V = D.W12_VAULT;
    if (V && S.loc === V.loc && S.depth === V.floor && S.inv[V.key] > 0 && !W12.st(S).vault)
      out.push({ id: "w12:vault", label: V.label, sub: "", kw: ["鍵", "扉", "砂"] });
    return out;
  };

  const actions0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = actions0();
    const S = G.S;
    const list = W12.acts(S);
    if (list.length) groups.splice(1, 0, { title: ruins()[S.loc].group, list });
    return groups;
  };

  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head === "w12") return W12.run(arg);
    const S = G.S;
    const R = head === "deeper" && ruins()[S.loc];
    act0(head, arg, a);
    // 特別な一枚の背景は、その階を離れたら終わり
    const v = S.w12 && S.w12.view;
    if (v && (v.loc !== S.loc || v.depth !== S.depth)) delete S.w12.view;
    // 奥へ進んで何も起きなかったら、その遺跡の空気を一行
    // 乱数を使わず、日と階と手番で決める（遺跡の行動を選ばない遊び方では、乱数の並びが前と変わらないように）
    if (R && !S.over && S.mode === "explore" && S.depth > 0 && S.depth < (D.LOCS[S.loc].floors || 0) && (S.turn + S.depth) % 2 === 0)
      G.say(R.air[(S.day * 7 + S.depth * 3 + S.turn) % R.air.length]);
  };

  // 出来事の結果の w12: "script" | "gear" | "relic"（W11 のかけらの部屋の選択肢）を受け持つ
  const apply0 = G.apply;
  G.apply = (o) => {
    if (!o || !o.w12) return apply0(o);
    const { w12, ...rest } = o;
    apply0(rest);
    if (G.S && !G.S.over) W12.run(w12, true);
  };

  // ---------------------------------------------------------------- 行う
  // quiet：出来事の選択肢から呼ぶとき（選んだ行動の行は出来事がもう書いている）
  W12.run = (kind, quiet) => {
    const S = G.S;
    const R = here(S);
    if (!R) return;
    const w = W12.st(S);
    if (kind === "vault") return vault();
    if (W12.triedToday(S, kind)) return;
    w.tried[tkey(S, kind)] = S.day;
    W12.quiet = !!quiet;
    try {
      if (kind === "script") return readScript(R);
      if (kind === "gear") return solveGear(R);
      if (kind === "relic") return lookRelic(R);
    } finally { W12.quiet = false; }
  };

  function readScript(R) {
    const S = G.S;
    const f = W12.open(S, "script")[0];
    if (!f) return;
    const w = W12.st(S);
    const had = w.got[f.id] || 0;
    if (!W12.quiet) G.log("you", had ? "碑文の続きを読む" : "碑文を読む");
    G.pass(1);
    const L = letters(S);
    const r = G.check("知力", L ? "普通" : "難しい", "碑文を読む", L ? 15 : 0);
    if (!r.ok) {
      G.say(G.pick([
        "字の形は追えるが、どこで切れるのかが分からない。指でなぞるうちに、同じ所を三度読んでいた。",
        "苔と煤で字が半分埋まっている。削り落とすうちに、肝心の所まで削ってしまった気がする。",
        "読みかけたところで、灯りが揺れて字の影が動いた。もう一度見ると、さっきと違う字に見えた。",
      ]));
      return;
    }
    const n = W12.readable(f, S);
    const shown = f.lines.slice(had, n);
    G.say(had ? "古い字の続きが、今なら読める。" : "古い字を一字ずつ拾って、読み下した。");
    shown.forEach((t) => G.say(t));
    if (n < f.lines.length) G.note("続きの字は読めなかった。古い字を読む技があれば、読み直せそうだ。");
    found(f, n);
  }

  function solveGear(R) {
    const S = G.S;
    const g = R.gear;
    if (!W12.quiet) G.log("you", g.label);
    G.pass(1);
    const r = G.check(g.stat, g.diff, "仕掛けを解く", W12.clue(S));
    if (!r.ok) { G.apply(g.ng); return; }
    G.apply(g.ok);
    W12.st(S).view = { key: g.scene, loc: S.loc, depth: S.depth };
    const f = W12.open(S, "mural")[0];
    if (!f) return;
    f.lines.forEach((t) => G.say(t));
    found(f, f.lines.length);
    const gold = 15 + G.d(10) * 3;
    G.apply({ gold });
  }

  function lookRelic(R) {
    const S = G.S;
    const f = W12.open(S, "relic")[0];
    if (!f) return;
    if (!W12.quiet) G.log("you", "古い文明の遺物を調べる");
    G.pass(1);
    const r = G.check("知力", "普通", "遺物を調べる", knows("k1_appraise", S) ? 15 : 0);
    if (!r.ok) {
      G.apply(G.pick([
        { text: "触れた所が熱を持ち、指先に赤い筋が走った。慌てて手を離す。遺物はもとの場所で、何事もなかった顔をしている。", hp: -2 },
        { text: "ひっくり返し、叩き、匂いを嗅いだ。何も分からなかった。分からないことだけは、よく分かった。" },
      ]));
      return;
    }
    G.say("埃を払い、手に取って、明かりにかざした。");
    f.lines.forEach((t) => G.say(t));
    found(f, f.lines.length);
  }

  // 断片を手に入れる（n は読めた行の数）
  function found(f, n) {
    const S = G.S;
    const w = W12.st(S);
    const first = !w.got[f.id];
    w.got[f.id] = Math.max(w.got[f.id] || 0, n);
    const p = W12.prof();
    const was = p.got[f.id];
    p.got[f.id] = { n: Math.max((was && was.n) || 0, n), date: (was && was.date) || G.date(), by: (was && was.by) || `${S.clsName} ${S.profile.name}` };
    if (first) {
      G.note(`図鑑「古い文明」に${KIND[f.kind]}を書き留めた（${W12.count(S)}／${W12.all().length}）。`);
      if (G.onW12) G.onW12(f);
    }
    if (!w.done && W12.count(S) >= W12.all().length) complete();
  }

  function complete() {
    const S = G.S;
    const w = W12.st(S);
    w.done = S.day;
    W12.prof().done = true;
    const X = D.W12_SECRET;
    G.log("title", X.title, { peak: true });
    X.text.forEach((t) => G.log("nar", t, { peak: true }));
    G.give(D.W12_VAULT.key);
    G.note(`${G.itemInfo(D.W12_VAULT.key).name}を手に入れた。`);
    G.chron("四つの遺跡で、古い文明の断片をすべて集める");
    G.award("w12_ruvenal");
  }

  function vault() {
    const S = G.S;
    const V = D.W12_VAULT;
    const w = W12.st(S);
    if (w.vault || !(S.inv[V.key] > 0)) return;
    w.vault = S.day;
    w.view = { key: V.scene, loc: S.loc, depth: S.depth };
    G.log("you", V.label);
    G.pass(1);
    V.text.forEach((t) => G.log("nar", t, { peak: true }));
    G.take(V.key);
    G.apply({ gold: V.gold, item: V.item, chron: "エル・ナフ遺構の祭壇の下で、古い王の練習部屋を開ける" });
    G.award("w12_vault");
  }
})(globalThis.G = globalThis.G || {});
