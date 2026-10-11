// T3：トロフィーの四つ目の格「白金」の点（作成のボーナス点に数える。zz_u10_trophy_bonus.js の D.TROPHY_POINTS に足す）。
// 銅 1・銀 2・金 5・白金 10。格の名と順は src/data/trophies_t3.js の D.TROPHY_TIERS。古い記録はそのまま数える（表の今の格で数える）。
// あわせて、トロフィーを調べる間（G.checkTrophies。毎手番の終わり）の重い数え上げを使い回す（G.t3Once）。
//   図鑑の数（G.codexCount）は同じ冒険の同じ日・同じ時間帯なら前の数を使う（冒険をまたぐトロフィーが取れるのが、遅くとも次の時間帯になるだけ）。
//   覚え書きの表（G.l1.build）などデータだけで決まるものは、一度だけ作る。レーン T
(function (G) {
  const D = G.data;
  if (D.TROPHY_POINTS && D.TROPHY_POINTS.白金 == null) D.TROPHY_POINTS.白金 = 10;

  let memo = null;      // G.checkTrophies の間だけの使い回し
  const keep = {};      // データだけで決まるもの（冒険をまたいでも変わらない）
  G.t3Once = (key, fn, forever) => {
    if (forever) return key in keep ? keep[key] : (keep[key] = fn());
    if (!memo) return fn();
    return key in memo ? memo[key] : (memo[key] = fn());
  };
  const check0 = G.checkTrophies;
  if (check0) G.checkTrophies = (...a) => { memo = {}; try { return check0(...a); } finally { memo = null; } };

  const count0 = G.codexCount;
  if (count0) {
    let last = null;
    G.codexCount = (...a) => {
      if (!memo || a.length) return count0(...a);
      const S = G.S;
      const key = S ? `${S.id}:${S.day}:${S.phase}` : "";
      if (!last || last.key !== key || last.P !== G.P) last = { key, P: G.P, val: count0() };
      return last.val;
    };
  }
})(globalThis.G = globalThis.G || {});
