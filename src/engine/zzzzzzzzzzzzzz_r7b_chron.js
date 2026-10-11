// R7b：年表に同じ日の同じトロフィーを二度書かない（0.6.0 の再レビュー 28）。
// ふつうに遊ぶ分では二度書かれないことを確かめたが（tests/checks/r7b_review2.mjs）、読みこんだセーブでまとめて付いたときなどの守りに。
// 名前の頭の z は、G.chron を包むほかのファイル（companions_m2.js の名前の埋め込み）より外で見るため。DOM には触らない。レーン T（R7b）
(function (G) {
  const chron0 = G.chron;
  if (!chron0) return;
  G.chron = (text, kind) => {
    const S = G.S;
    if (kind === "trophy" && S && Array.isArray(S.chronicle)) {
      const date = G.date ? G.date() : "";
      const t = G.m2Fill ? G.m2Fill(text) : text;
      if (S.chronicle.some((c) => c && c.kind === "trophy" && c.date === date && c.text === t)) return;
    }
    return chron0(text, kind);
  };
})(globalThis.G = globalThis.G || {});
