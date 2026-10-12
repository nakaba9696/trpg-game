// U37：旅の出来事の区切り（画面の側）。エンジンは engine/zzzzzzzzzzzzzzzzzzzzz_u37_beats.js（記録に区切りの印 u37 を置き、出来事のあとは「先へ進む」を待つ）
//   ・印の行（「三日目の夕。影が長くなった道を進む……」）が新しく出たら、移動の音（効果音 "depart"。音量・消音の設定に従う）を鳴らす
//   ・本文の窓は、いちばん新しい印から書き直す（印より前の行は隠す。U19 と同じ "u19gone"。前の出来事の文は右上の「ログ」の窓で読める）
//     同じ頁で印より前の「あなた」の行（▶ 〇〇へ向かう・▶ 先へ進む）は残す。U19 の「本文を積み上げる（前の形）」を選んでいれば隠さない
//   ・印の行は道中の区切りとして、少し目立たせる（見た目は ui/zzzzzzzzzz_u37_beats.css）
// ui.js・sound.js・u19 は書き換えず、G.ui.render・G.ui.logEl・G.sound.cues を包む（名前の z の数で U19・U28・U31 より後）。レーン U（U37）
(function (G) {
  if (typeof document === "undefined" || !G.ui) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const isBeat = (e) => !!(e && e.u37);

  // 印の行の描き方
  const prevEl = ui.logEl;
  ui.logEl = (e) => {
    if (isBeat(e)) {
      const p = document.createElement("p");
      p.className = "l-nar l-u37 l-u37-" + (e.u37.kind || "road");
      p.textContent = e.text;
      return p;
    }
    return prevEl ? prevEl(e) : null;
  };

  // 移動の音：新しく出た記録に印があれば、先頭に "depart"
  const snd = G.sound;
  if (snd && typeof snd.cues === "function") {
    const cues0 = snd.cues;
    snd.cues = (S) => {
      const cues = cues0(S);
      try {
        const beat = (snd.cueNews || []).find(isBeat);
        if (beat && !cues.includes("depart")) {
          cues.unshift("depart");
          if (Array.isArray(snd.cueFrom)) snd.cueFrom.unshift(beat);
          if (cues.length > 6) { cues.length = 6; if (snd.cueFrom) snd.cueFrom.length = Math.min(6, snd.cueFrom.length); }
        }
      } catch {}
      return cues;
    };
  }

  // 本文の窓を、いちばん新しい印から
  function paint() {
    const S = G.S, log = $("#log");
    if (!S || !log || (G.u19 && G.u19.stack)) return;
    const kids = Array.from(log.children);
    const shown = S.log.slice(-kids.length);
    let at = -1;
    for (let i = shown.length - 1; i >= 0; i--) if (isBeat(shown[i])) { at = i; break; }
    if (at < 0) return;
    // U19 の頁の頭が印より後なら（着いたあとの行動など）、そのまま
    const first = kids.findIndex((el) => !el.classList.contains("u19gone"));
    if (first < 0 || first > at) return;
    // 同じ頁で印より前にある「あなた」の行（▶ 〇〇へ向かう・▶ 先へ進む）からは残す
    for (let i = at - 1; i >= first; i--) if (shown[i].k === "you") { at = i; break; }
    let hid = false;
    kids.forEach((el, i) => { if (i < at && !el.classList.contains("u19gone")) { el.classList.add("u19gone"); hid = true; } });
    if (hid) requestAnimationFrame(() => { log.scrollTop = 0; });
  }

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { paint(); } catch (e) { /* 書き直しに失敗しても画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
