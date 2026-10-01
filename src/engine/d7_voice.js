// D7 #121：語りの一行を選ぶ（src/data/voice_d7.js の D.VOICE）。
// 乱数を使わない（手番と撃破数で選ぶ）ので、テストの乱数の並びを変えない。表が無ければ fallback を返す
(function (G) {
  G.voiceLine = (kind, vars, fallback) => {
    const lines = ((G.data && G.data.VOICE) || {})[kind];
    if (!lines || !lines.length) return fallback;
    const S = G.S || {};
    const n = (S.turn || 0) + ((S.counters && S.counters.kills) || 0);
    return lines[n % lines.length].replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
  };
})(globalThis.G = globalThis.G || {});
