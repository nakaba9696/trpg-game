// C17：持ち主の決定（2026-10-13）の仕組み。表と文は src/data/zzzzzzz_c17_decisions.js（D.C17）
//   結果の欄（G.apply を包む）：
//     c17lose: { 能力値: n } … 能力値を n 下げる（1 より下にはしない）。ドレイゼの担保だけ（i28。D.C17.LOSE_EVENTS）
//     c17beast: "sanity" | "hp" … 3〜4 段の獣の病を治し、正気か最大 HP を差し出す（i108）
//     c17forget: true … メモを一行消して、正気を戻す（t18。忘れ水に記憶を売る）
//     c17letter: "mason" | "hunter" | "north" … 預かった手紙を持ち物にする（t23。届けたものは二度と預からない）
//   着いたとき（G.arrive を包む。町に着いたときだけ）：手紙を渡す（t23）・砂塵のあとのボルグ（t07）・徴兵の名簿の呼び出し（t24）
//   討伐後は止める出来事（t08）：D.C17.STOP の出来事の cond を包む。忘れ水の眷属は出会いの表（D.E4.shape）から外す
//   結果の場面の立ち絵（i157）：出来事が結果で終わったら、次の行動まで「さっきの出来事の人」と結果の表情を残す。
//     G.c17Linger(S) が { ev, mood } を返す（画面は src/ui/zzzzzzzzz_c17_linger.js。G.moodOf もこの間は結果の表情を返す）。セーブには残さない
// セーブに足す項目：S.c17hp（体で払った最大 HP。無ければ 0）・S.c17（{ conscriptDay }。無ければ空）。古いセーブで無くても動く
// core.js・explore.js などは書き換えず、関数を包む。乱数は使わない。レーン C＋V（C17）
(function (G) {
  const D = G.data;
  const C17 = D.C17 || {};
  const flags = (S) => (S && S.flags) || {};
  const apFlag = (ap) => (D.E3 && D.E3.LIST && D.E3.LIST[ap] && D.E3.LIST[ap].flag) || "e3:" + ap;
  const down = (ap, S) => !!flags(S)[apFlag(ap)];

  // ================================================================ 最大 HP を差し出した分（体力が伸びて最大 HP を数え直しても戻らない）
  const hpOf0 = G.maxHpOf;
  G.maxHpOf = (st) => {
    const m = hpOf0(st);
    const S = G.S;
    const k = S && st === S.stats ? S.c17hp || 0 : 0;
    return k ? Math.max(8, m - k) : m;
  };

  // ================================================================ 結果の欄
  function lose(map) {
    const S = G.S;
    Object.entries(map || {}).forEach(([k, n]) => {
      if (!D.STATS.includes(k) || !(n > 0)) return;
      const a = S.stats[k], b = Math.max(1, a - n);
      if (b === a) return;
      S.stats[k] = b;
      if (k === "体力") { S.maxHp = G.maxHpOf(S.stats); S.hp = Math.min(S.hp, S.maxHp); }
      if (k === "魔力" && G.maxMpOf) { S.maxMp = G.maxMpOf(S.stats); S.mp = Math.min(S.mp, S.maxMp); }
      G.note(`${k}が下がった ${a}→${b}`);
    });
  }
  function beast(kind) {
    const S = G.S;
    const b = (S.beast) || 0;
    if (b < 3 || b >= 5) return;
    S.beast = 0;
    if (S.m5) S.m5.clock = 0;
    if (kind === "hp") {
      S.c17hp = (S.c17hp || 0) + (C17.BEAST_HP || 6);
      S.maxHp = G.maxHpOf(S.stats);
      S.hp = Math.min(S.hp, S.maxHp);
      G.note(`最大 HP -${C17.BEAST_HP || 6}`);
    }
    if (D.M5 && D.M5.BEAST_CURE) G.say(D.M5.BEAST_CURE);
    if (kind === "sanity" && G.addSanity) G.addSanity(-(C17.BEAST_SANITY || 25));
  }
  function forget() {
    const S = G.S;
    const list = S.memos || [];
    if (!list.length) return;
    // いちばん古いメモから一つ（どれを売ったかは本人にも分からない）
    list.shift();
    G.note("メモが一行、消えた。");
    if (G.addSanity) G.addSanity(C17.FORGET_SANITY || 20);
  }
  const L = () => C17.LETTERS || {};
  const delivered = (k, S) => !!flags(S)["c17:letter:" + k];
  function letter(k) {
    const S = G.S;
    const x = L()[k];
    if (!x || delivered(k, S) || G.count(x.item) > 0) return;
    if (G.give(x.item, 1)) G.note(`${G.itemInfo(x.item).name}を預かった。`);
  }

  const apply0 = G.apply;
  G.apply = (o) => {
    const r = apply0(o);
    const S = G.S;
    if (!o || !S || S.over) return r;
    if (o.c17lose) lose(o.c17lose);
    if (o.c17beast) beast(o.c17beast);
    if (o.c17forget) forget();
    if (o.c17letter) letter(o.c17letter);
    if (o.flag && C17.CONSCRIPT && o.flag === C17.CONSCRIPT.flag) { S.c17 = S.c17 || {}; if (S.c17.conscriptDay == null) S.c17.conscriptDay = S.day; }
    if (linging) last = o;
    return r;
  };

  // ================================================================ 着いたとき
  const forTown = (x, id) => {
    const Lc = D.LOCS[id] || {};
    if (Lc.type !== "town") return false;
    return (x.to || []).includes(id) || (!!x.region && Lc.region === x.region);
  };
  G.c17OnArrive = (dest) => {
    const S = G.S;
    if (!S || S.over || (D.LOCS[dest] || {}).type !== "town") return;
    // t23：手紙を渡す
    Object.entries(L()).forEach(([k, x]) => {
      if (S.over || G.count(x.item) <= 0 || !forTown(x, dest)) return;
      G.take(x.item);
      S.flags["c17:letter:" + k] = true;
      G.say(x.text);
      G.note(`${G.itemInfo(x.item).name}を渡した。`);
      if (x.chron) G.chron(x.chron);
      G.addFame(2);
    });
    // t07：砂塵を討ったら、借金は白紙。ボルグは一行で去る
    if (S.flags.v1_debt && down("zalve", S)) {
      delete S.flags.v1_debt;
      if (!S.flags["c17:borg"] && C17.BORG) { S.flags["c17:borg"] = true; G.say(C17.BORG.text); }
    }
    // t24：名簿に名を書いたあとに戦の知らせを聞いたら、呼び出しの一行
    const K = C17.CONSCRIPT;
    if (K && S.flags[K.flag] && !S.flags["c17:called"]) {
      const W = S.world, since = (S.c17 && S.c17.conscriptDay) || 0;
      const heard = W && (W.hist || []).some((h) => h.kind === "war" && h.heard && h.day >= since);
      if (heard || (W && W.war && W.war.since >= since)) {
        S.flags["c17:called"] = true;
        G.say(K.text);
        if (K.chron) G.chron(K.chron);
      }
    }
  };
  const arrive0 = G.arrive;
  G.arrive = (dest) => { const r = arrive0(dest); G.c17OnArrive(dest); return r; };

  // ================================================================ t08：討伐後は止める
  Object.entries(C17.STOP || {}).forEach(([ap, ids]) => {
    ids.forEach((id) => {
      const e = (D.EVENTS || []).find((x) => x.id === id);
      if (!e || e.c17stop) return;
      const c0 = e.cond;
      e.c17stop = ap;
      e.cond = (S) => !down(ap, S) && (!c0 || c0(S));
    });
  });
  // 討たれた使徒の眷属（出会いの表から引いたもの）は、その場の並の敵に替える。今は忘れ水だけ
  C17.KIN_STOP = ["levian"];
  const E4 = D.E4;
  if (E4 && E4.shape) {
    const shape0 = E4.shape;
    E4.shape = (ids) => {
      const out = shape0(ids);
      const S = G.S;
      if (!S || !Array.isArray(out)) return out;
      const E = D.ENEMIES;
      const gone = (id) => { const k = E[id] && E[id].kinOf; return !!k && C17.KIN_STOP.includes(k) && down(k, S); };
      if (!out.some(gone)) return out;
      const Lc = D.LOCS[S.loc] || {};
      const plain = (Lc.pool || []).filter((x) => E[x] && !E[x].boss && !E[x].kinOf && !/^e4k?_/.test(x));
      const r = out.map((id) => (gone(id) ? (plain.length ? G.pick(plain) : null) : id)).filter(Boolean);
      return r.length ? r : out;
    };
  }

  // ================================================================ i157：結果の場面の立ち絵
  let linger = null; // { S, ev, mood }
  let linging = false, last = null;
  G.c17Linger = (S) => (linger && S && linger.S === S && S.mode === "explore" && !S.combat && !S.over && !S.event ? { ev: linger.ev, mood: linger.mood } : null);
  const choose0 = G.chooseEvent;
  G.chooseEvent = (i) => {
    const S = G.S;
    const ev = S && S.mode === "event" ? S.event : null;
    const mood0 = S ? S.mood : null;
    linger = null; last = null; linging = !!ev;
    let r;
    try { r = choose0(i); } finally { linging = false; }
    if (ev && S === G.S && S.mode === "explore" && !S.combat && !S.over && !S.event) {
      const o = last || {};
      const ok = G.isMood || (() => false);
      const mood = ok(o.mood) ? o.mood : (G.guessMood && G.guessMood(o.text)) || (ok(mood0) ? mood0 : null);
      linger = { S, ev, mood };
    }
    last = null;
    return r;
  };
  const clear = () => { linger = null; };
  const act0 = G.act;
  G.act = (id) => { if (!/^ev:/.test(String(id))) clear(); return act0(id); };
  const start0 = G.startEvent;
  G.startEvent = (ev) => { clear(); return start0(ev); };
  const fight0 = G.startCombat;
  G.startCombat = (...a) => { clear(); return fight0(...a); };
  const arrive1 = G.arrive;
  G.arrive = (dest) => { clear(); return arrive1(dest); };
  const mood0 = G.moodOf;
  if (mood0) G.moodOf = (S) => mood0(S) || ((G.c17Linger(S) || {}).mood || null);
})(globalThis.G = globalThis.G || {});
