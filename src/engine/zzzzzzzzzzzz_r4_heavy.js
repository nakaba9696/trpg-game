// R4：重い選択（命や仲間に関わる出来事）を見分ける。正気の入れ替わり（src/engine/sanity_m5.js）が、出来事の中ではこれを見て、重い出来事では起きない。
// 見分け方の表は src/data/r4_heavy.js（D.R4_HEAVY）。出来事ごとに一度だけ決めて覚える（データは遊ぶあいだ変わらない）。乱数なし・DOM なし。
// 名前の頭の z は、F4（_echoTag を付ける）より後に読むため。呼ばれるのは遊ぶとき。レーン C＋V（R4）
(function (G) {
  const D = G.data;
  const memo = new Map();
  const outs = (c) => [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win].filter((o) => o && typeof o === "object");
  const fights = (c) => [c.fight, c.ok && c.ok.fight, c.ng && c.ng.fight].flatMap((f) => (Array.isArray(f) ? f : f ? [f] : []));
  const judge = (e) => {
    const H = D.R4_HEAVY || {};
    if (e.heavy || (H.ids || []).includes(e.id)) return true;
    if (e.v3peak || e.e3 || e._echoTag || e.echo) return true;
    if (H.prefix && H.prefix.test(e.id)) return true;
    const ch = e.choices || [];
    if (e.q9 && ch.some((c) => outs(c).some((o) => o.end))) return true;
    return ch.some((c) => c.heavy || outs(c).some((o) => (H.out || []).some((k) => o[k])) || fights(c).some((id) => D.ENEMIES[id] && D.ENEMIES[id].majin));
  };
  // 出来事（id か出来事そのもの）が重いか
  G.heavyEvent = (ev) => {
    const e = typeof ev === "string" ? D.EVENTS.find((x) => x.id === ev) : ev;
    if (!e || !e.id) return false;
    if (!memo.has(e.id)) memo.set(e.id, !!judge(e));
    return memo.get(e.id);
  };
})(globalThis.G = globalThis.G || {});
