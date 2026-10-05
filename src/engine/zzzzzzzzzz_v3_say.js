// V3：エンジンの中に直に書かれた語り（王城の叙任・領地・玉座など）を、長い文に置き換える（D.V3_SAY。書くのは src/data/zv3_say*.js）。
//   D.V3_SAY = [{ id, re（元の文に当てる正規表現。文の頭から終わりまで）, to（置き換える文。関数なら当たった組 m と S を受け取る）, peak（山場か）, when(S)（このときだけ） }]
//   乱数は使わない（選び分けは日付などから。テストの乱数の流れを変えない）
//   当たったら、置き換えた文を段落ごとに記録する（engine/zzzzzzzzzz_v3_prose.js の段落分けに渡す）。山場なら段落に peak の印を付ける。
// 名前の zzzzzzzzzz_v3_say は v3_prose より後に読まれ、G.log の一番外で元の文を受け取る。レーン V（V3）
(function (G) {
  const D = G.data;
  const V3 = (G.v3prose = G.v3prose || {});
  const log0 = G.log;
  if (!log0 || log0.v3say) return;
  V3.sayFor = (text) => {
    for (const r of D.V3_SAY || []) {
      if (r.when && !r.when(G.S || {})) continue;
      const m = r.re.exec(text);
      if (m) return { r, text: typeof r.to === "function" ? r.to(m, G.S || {}) : r.to };
    }
    return null;
  };
  G.log = (k, text, extra) => {
    if (k === "nar" && typeof text === "string" && (D.V3_SAY || []).length) {
      const hit = V3.sayFor(text);
      if (hit) {
        if (hit.r.peak) V3.paras(hit.text).forEach((p) => V3.peakSet && V3.peakSet.add(p));
        return log0(k, hit.text, extra);
      }
    }
    return log0(k, text, extra);
  };
  G.log.v3say = true;
})(globalThis.G = globalThis.G || {});
