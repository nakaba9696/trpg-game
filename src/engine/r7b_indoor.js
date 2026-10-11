// R7b：今いる所が屋内・地下か（空・鳥・風・草の文を出さないため）。0.6.0 の再レビュー 10・16
//   迷宮の中（地下 1 階から）・施設の中・室内の出来事（R5 の場面の背景の表 D.R5_EVENT_SCENE に載る出来事）を屋内とする
// 語りの一行（G.voiceLine。engine/d7_voice.js）は、屋内なら D.VOICE の「<種類>In」の表があればそちらから選ぶ（乱数は使わない）。
// 死の溜めの段落は src/data/zv3_say_death.js がこれを見る。DOM には触らない。レーン D（R7b）
(function (G) {
  const R7B = (G.r7b = G.r7b || {});
  R7B.indoor = (S) => {
    S = S || G.S;
    if (!S) return false;
    const D = G.data || {};
    const L = (D.LOCS || {})[S.loc];
    if (L && L.type === "dungeon" && (S.depth || 0) > 0) return true;
    if (S.mode === "fac" || S.fac) return true;
    return !!(S.event && (D.R5_EVENT_SCENE || {})[S.event]);
  };
  const line0 = G.voiceLine;
  if (line0) {
    G.voiceLine = (kind, vars, fallback) => {
      const V = (G.data && G.data.VOICE) || {};
      const k = kind + "In";
      return R7B.indoor() && V[k] && V[k].length ? line0(k, vars, fallback) : line0(kind, vars, fallback);
    };
  }
})(globalThis.G = globalThis.G || {});
