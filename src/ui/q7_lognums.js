// Q7：ログのダメージの数値を赤、回復の数値を緑にする（持ち主の声）。どこに色を付けるかはエンジン（engine/q7_lognums.js の G.q7.logNums）。
// ui.js は書き換えず、G.ui.render を包んで、描いたあとのログ（#log の一件ずつ）の数値だけを <span class="q7n q7n-dmg|hurt|heal"> で包む。
// ログの要素は S.log の後ろの件と同じ順に並ぶ（ui.js の renderLog）。並びが合わないときは文だけから拾う。見た目は ui/q7_lognums.css。レーン U
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render || !G.q7 || !G.q7.logNums) return;
  const ui = G.ui;
  const LABEL = { dmg: "与えたダメージ", hurt: "受けたダメージ", heal: "回復" };

  // 要素の文字の中から s を探し、その中の num の部分だけを包む（用語の印などで文字が分かれていても、一つの文字のまとまりの中を探す）
  const wrap = (el, x) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains("q7n")) continue;
      const i = node.data.indexOf(x.s);
      if (i < 0) continue;
      const j = i + x.s.indexOf(x.num);
      const mid = node.splitText(j);
      mid.splitText(x.num.length);
      const sp = document.createElement("span");
      sp.className = "q7n q7n-" + x.t;
      sp.title = LABEL[x.t] || "";
      mid.parentNode.replaceChild(sp, mid);
      sp.append(mid);
      return true;
    }
    return false;
  };
  const paint = (el, e) => {
    if (!el || el.dataset.q7n) return;
    el.dataset.q7n = "1";
    G.q7.logNums(e).forEach((x) => wrap(el, x));
  };

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      const S = G.S;
      const log = document.querySelector("#log");
      if (S && log && Array.isArray(S.log)) {
        const kids = Array.from(log.children);
        const shown = S.log.slice(-kids.length);
        const same = shown.length === kids.length;
        kids.forEach((el, i) => {
          if (el.tagName !== "P") return;
          // 並びが合えば S.log の件（fx・n も使える）、合わなければ文だけ
          const e = same ? shown[i] : { k: "sys", text: el.textContent.replace(/^▶ /, "") };
          paint(el, e);
        });
      }
    } catch { /* 色が付かなくても画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
