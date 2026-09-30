// M7：判定の振り直し。貴重な回数（S.rerolls、上限 G.REROLL_MAX）を使って、失敗した判定をもう一度だけ振る。
// しくみ：回数があるときは、行動の前の G.S を写しておき、行動中に使った乱数を記録する。
// 判定が失敗したら「振り直す」を出す。選ぶと G.S を行動の前に戻し、同じ乱数で同じ行動をやり直して、
// 失敗した判定の出目のところから新しい乱数にする（同じ場面で、賽の目だけが転がり直る）。二度目の結果は受け入れる。
// 写しと記録は画面を開いているあいだだけ（セーブには入れない）。古いセーブには S.rerolls が無い（0 として扱う）。
// core.js・combat.js・explore.js は書き換えず、ここで包む。レーン C（M7）
(function (G) {
  const D = G.data;
  G.REROLL_MAX = 3;
  // 職業ごとの持ち始め（無い職業は 1）。盗賊は博打に慣れている
  D.REROLL_START = Object.assign({ thief: 2 }, D.REROLL_START || {});

  G.rerolls = (S) => ((S || G.S) && (S || G.S).rerolls) || 0;

  // 振り直しの回数を増やす。上限を超えた分は消える。増えた数を返す
  G.gainReroll = (n, text) => {
    const S = G.S;
    if (!S || S.over) return 0;
    const have = G.rerolls(S);
    const add = Math.max(0, Math.min(n || 1, G.REROLL_MAX - have));
    if (text) G.say(text);
    if (!add) { G.note(`（振り直しは、もうこれ以上持てない。残り ${have}）`); return 0; }
    S.rerolls = have + add;
    S.counters.rerollGains = (S.counters.rerollGains || 0) + add;
    G.note(`振り直し +${add}（残り ${S.rerolls}）`);
    return add;
  };

  // ---------------------------------------------------------------- 行動を記録して、失敗した判定を覚えておく
  let recording = null; // 記録中の乱数の列
  let cand = null;      // この行動で最初に失敗した判定
  let pending = null;   // 振り直せる判定（次の行動をするまで）
  let replay = null;    // やり直し中 { k: 振り直す出目の位置, pos: 今の位置 }

  const check0 = G.check;
  G.check = (stat, diff, reason, extra) => {
    const at = recording ? recording.length : replay ? replay.pos : -1;
    const redo = !!replay && at === replay.k;
    if (redo) {
      const o = replay.old;
      G.say("賽の目が、一度だけ気まぐれに転がり直った。");
      G.log("sys", `（${o.reason}：出目 ${o.roll}・${o.label} を振り直す）`);
    }
    const r = check0(stat, diff, reason, extra);
    const S = G.S;
    if (redo) {
      const last = S.log[S.log.length - 1];
      if (last && last.k === "dice") last.rr = { roll: replay.old.roll, label: replay.old.label };
      if (r.ok) S.counters.rerollWins = (S.counters.rerollWins || 0) + 1;
      replay.done = true;
    }
    if (recording && !r.ok && !cand) cand = { k: at, roll: r.roll, label: r.label, reason: r.reason, stat: r.stat, entry: S.log[S.log.length - 1] };
    return r;
  };

  // 今、振り直せる判定（無ければ null）。行動のあとに何か起きたら（記録が増えたら）消える
  G.rerollPending = () => {
    const S = G.S;
    if (!pending || !S || S.over || pending.S !== S || pending.turn !== S.turn || G.rerolls(S) <= 0) return null;
    if (S.log[S.log.length - 1] !== pending.last) return null;
    return pending;
  };
  // 画面用：記録の中で、振り直せる判定の1件か
  G.rerollTarget = (e) => { const p = G.rerollPending(); return !!p && p.entry === e; };

  const act0 = G.act;
  G.act = (id) => {
    const S = G.S;
    if (id === "rr:go") { G.reroll(); return; }
    pending = null;
    if (!S || S.over || G.rerolls(S) <= 0 || recording || replay) { act0(id); return; }
    const snap = JSON.stringify(S);
    const base = G.rand;
    const tape = [];
    recording = tape;
    cand = null;
    G.rand = () => { const v = base(); tape.push(v); return v; };
    try { act0(id); } finally { G.rand = base; recording = null; }
    const c = cand;
    cand = null;
    if (c && !S.over && G.rerolls(S) > 0) pending = Object.assign({ S, turn: S.turn, last: S.log[S.log.length - 1], snap, tape, id }, c);
  };

  // 振り直す：行動の前に戻し、失敗した判定の出目から先だけ新しく振る
  G.reroll = () => {
    const p = G.rerollPending();
    pending = null;
    if (!p) return false;
    const S = G.S;
    const keep = Object.keys(S);
    const back = JSON.parse(p.snap);
    keep.forEach((k) => { if (!(k in back)) delete S[k]; });
    Object.assign(S, back);
    S.rerolls = G.rerolls(S) - 1;
    S.counters.rerolls = (S.counters.rerolls || 0) + 1;
    const base = G.rand;
    replay = { k: p.k, pos: 0, old: p };
    G.rand = () => { const i = replay.pos++; return i < p.k ? p.tape[i] : base(); };
    try { act0(p.id); } finally { G.rand = base; replay = null; }
    if (G.openLore) G.openLore("dice:m7_turned");
    return true;
  };

  // 「振り直す（残り n）」を行動の頭に出す
  const actions0 = G.actions;
  G.actions = () => {
    const list = actions0();
    const p = G.rerollPending();
    if (!p || !list.length) return list;
    return [{ title: "賽の目", list: [{ id: "rr:go", label: "振り直す", sub: `${p.reason}の出目 ${p.roll}・残り ${G.rerolls()}`, kw: ["振り直", "もう一度振"] }], }, ...list];
  };

  // ---------------------------------------------------------------- 増やし方
  // 冒険の始まり：職業ごとの持ち始め
  const newGame0 = G.newGame;
  G.newGame = (opt) => {
    const S = newGame0(opt);
    S.rerolls = Math.min(G.REROLL_MAX, D.REROLL_START[S.cls] !== undefined ? D.REROLL_START[S.cls] : 1);
    return S;
  };
  // 出来事の結果に reroll: n（増える）。diceNight: true は、その冬の賽の夜を済ませた印
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (o && o.diceNight && S) S.flags["m7_night" + G.yearOf(S.day)] = true;
    apply0(o);
    if (o && o.reroll && S && !S.over) G.gainReroll(o.reroll);
  };
  G.yearOf = (day) => Math.floor((day - 1) / 360);
  G.isWinter = (day) => (day - 1) % 360 >= 270;
  // 瀕死から立ち上がったとき
  const hurt0 = G.hurt;
  G.hurt = (n, cause) => {
    const S = G.S;
    const c = S ? S.counters.clung : 0;
    hurt0(n, cause);
    if (S && !S.over && S.counters.clung > c) G.gainReroll(1, "どこか高いところで、誰かが小さく手を打った。");
  };
  // 宿願を果たしたとき
  const endTurn0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    const was = !!(S && S.flags.goalAnnounced);
    endTurn0();
    if (S && !S.over && !was && S.flags.goalAnnounced) G.gainReroll(1);
  };
  // 物：reroll: n の品を使う（欠けた賽子）
  const useItem0 = G.useItem;
  G.useItem = (id) => {
    const S = G.S;
    const it = D.ITEMS[id];
    if (!it || !it.reroll) return useItem0(id);
    if (!S || S.over || S.mode === "combat" || !S.inv[id]) return false;
    if (G.rerolls(S) >= G.REROLL_MAX) { G.note(`振り直しは、もうこれ以上持てない（残り ${G.rerolls(S)}）。`); return false; }
    G.take(id);
    G.log("you", `${it.name}を使う`);
    if (it.useText) G.say(it.useText);
    G.gainReroll(it.reroll);
    return true;
  };
})(globalThis.G = globalThis.G || {});
