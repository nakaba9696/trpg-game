// R11：左上の札（#mbar の数字の並び）に、今の心の段（正気。中 18）と、引退までの残り（最後の二年だけ）を小さく出す。
// 正気が一度でも減ったら出す（澄んでいる → 揺らいでいる → 縁に立つ → 崩れかけ。言葉は G.m13.word）。戻し方は title に。
// スマホの狭い札では「心」の一字を段の色で出す（澄んでいるときは出さない）。
// 人物の表には、冒険の年の行（G.r11Rows）を足す。エンジンの値（G.sanityOf・G.r11.left）を読むだけ。レーン U
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const h = (tag, cls) => { const e = document.createElement(tag); e.className = cls; return e; };
  const mind = h("span", "r11mind");
  const years = h("span", "r11years num");
  function paint(S) {
    const bars = document.querySelector("#mbar .mbars");
    if (!bars) return;
    if (mind.parentNode !== bars) bars.append(mind, years);
    const live = S && !S.over && S.profile;
    const v = live && G.sanityOf ? G.sanityOf(S) : 100;
    const stage = G.sanityStage ? G.sanityStage(v) : 0;
    const word = live ? (G.m13 && G.m13.word ? G.m13.word(S) : "") : "";
    mind.hidden = !live || v >= 100 || !word;
    mind.textContent = "";
    mind.append(h("span", "r11k"), h("span", "r11w"));
    mind.firstChild.textContent = "心";
    mind.lastChild.textContent = `：${word}`;
    mind.dataset.stage = String(Math.min(3, stage));
    mind.title = `心：${word}。` + (stage >= 1 && G.r11m ? G.r11m.GUIDE : "正気が減った理由は記録に一行ずつ出る");
    const R = G.r11;
    const left = live && R && R.left ? R.left(S) : Infinity;
    years.hidden = !(left < 2 * (G.YEAR_DAYS || 360));
    years.textContent = years.hidden ? "" : `引退まで${R.leftText(S)}`;
    years.title = "旅に出て十年たつと、冒険者を引退する";
  }
  // 人物の表：正気の行のあとに「冒険の年」（エンジンの G.m5Rows は正気が減るまで空のまま。M5 の決まり）
  const rows0 = G.m5Rows;
  if (G.r11Rows) G.m5Rows = (S) => [...(rows0 ? rows0(S) : []), ...G.r11Rows(S)];
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { paint(G.S); } catch (e) { /* 札が描けなくても、画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
