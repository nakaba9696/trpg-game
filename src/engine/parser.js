// 自由入力の読み取り。トークンを使わずに、書かれた文を今できる行動に結びつける。
// 読み取れなかったときだけ、画面が「GM に任せる」（Claude を使う）を出す。レーン C（コア）が管理
(function (G) {
  // 入力の揺れをそろえる（全角英数・カタカナ/ひらがなの違いは気にしない程度に）
  const norm = (s) => String(s).normalize("NFKC").toLowerCase().replace(/\s+/g, "");

  // 行動のキーワードと、ラベルに含まれる言葉で点数を付け、いちばん高いものを選ぶ
  G.parse = (text) => {
    const t = norm(text);
    if (!t) return null;
    let best = null;
    let bestScore = 0;
    G.actions().forEach((g) => g.list.forEach((a) => {
      if (a.disabled) return;
      let score = 0;
      (a.kw || []).forEach((k) => { if (k && t.includes(norm(k))) score += 2 + norm(k).length * 0.1; });
      const label = norm(a.label);
      if (t.includes(label)) score += 5;
      // ラベルの2文字の断片がいくつ含まれるか（「喧嘩を買う」→「殴り返す」は拾えないが、「殴り返」は拾える）
      for (let i = 0; i + 2 <= label.length; i++) if (t.includes(label.slice(i, i + 2))) score += 0.4;
      if (score > bestScore) { bestScore = score; best = a; }
    }));
    return bestScore >= 1.2 ? best : null;
  };
})(globalThis.G = globalThis.G || {});
