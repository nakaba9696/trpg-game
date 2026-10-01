// D6：灰色の外套の旅人との出会いを数える（出来事は src/data/walker_d6.js）。
// 出会った回数は S.counters.d6_walker、最後に会った日は S.counters.d6_last（古いセーブで無くても動く）。
// 二度目からは、前にも会った気がする、と一行だけ添える。core.js は書き換えず、G.startEvent を包む。レーン D（D6 #106）が管理
(function (G) {
  const AGAIN = [
    "どこかで見た外套だ、とあなたは思った。どこでだったかは、思い出せない。",
    "前にも、別の町で、この人を見た気がする。向こうは、あなたを覚えていないようだった。",
    "また、この人だ。……本当に同じ人だろうか。顔を思い出そうとすると、外套の色しか浮かばない。",
  ];

  G.isWalkerEvent = (id) => /^d6_w_/.test(String(id || ""));

  const baseStart = G.startEvent;
  G.startEvent = (ev) => {
    const ok = baseStart(ev);
    const S = G.S;
    if (!ok || !S || !G.isWalkerEvent(S.event)) return ok;
    S.counters = S.counters || {};
    const n = S.counters.d6_walker || 0;
    if (n >= 1) G.say(AGAIN[Math.min(n - 1, AGAIN.length - 1)]);
    S.counters.d6_walker = n + 1;
    S.counters.d6_last = S.day;
    return ok;
  };
})(globalThis.G = globalThis.G || {});
