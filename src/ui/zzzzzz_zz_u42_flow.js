// U42：選択肢の出口と、本文の出し方の三つの直し（持ち主の報告）
//   1. 「〜を出る」がいつも見える：王都の王城で「謁見を願い出る」を選ぶと、右下のコマンドの窓に「王城を出る」が出ず、出られなくなった。
//      原因は、町で組の札の形（U21 の .u21acc：窓は流れず、開いた組の中だけ流れる）にした印が、施設に入って札の無い形になっても残り、
//      窓が流れないまま下の選択肢が切れていたこと（直しは zzzzz_u21_side.js の accordion で毎回印を外す）。
//      あわせて、施設の出口（id "back"）の組は窓の下に貼り付ける（窓がどれだけ低くても、選択肢がどれだけ多くても見える。見た目は .css）
//   2. 町に着いた見出し（U14 の #u14card）を出している間は、本文を一行ずつ出す流れ（U28）を止め、見出しが消えてから流しはじめる。
//      見出しが出たら場面（背景・場所の名前・BGM）は着いた町に替える。見出しの間の押す・キーは見出しを消すだけ（本文の早送りにしない）
//   3. 道中の出来事：道中の一行（U37 の印「二日目の昼。街道を進む……」）のあとに出来事の名前（見出し）が出たら、
//      それより前の行を本文の窓から隠し、出来事の名前から窓の頭に出す。隠すだけ（U19 と同じ "u19gone"）。記録（S.log）と右上の「ログ」の窓はそのまま
// ui.js・u14・u19・u28・u37 は書き換えず（u28 には待つ口 G.u28.wait だけ足した）、G.ui.render を包む。
// 名前の zzzzzz_zz_u42 は、U21・U28・U37・U39 より後、とどめの見せ方（F5 の zzzzzzz_f5_finish）より前。エンジンは読むだけ。レーン U（U42）
(function (G) {
  const U42 = (G.u42 = G.u42 || {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼ぶ）
  U42.EXIT = "back";
  // 出口の組の番号（G.actions() の組のうち、中身のある組だけを数える。ui.js が描く .agroup の並びと同じ）。無ければ -1
  U42.exitGroup = (groups) => (groups || []).filter((g) => g && g.list && g.list.length).findIndex((g) => g.list.some((a) => a && a.id === U42.EXIT));
  // 本文の窓をどこから見せるか。rows は窓に見えている行 [{ kind: "you"|"road"|"arrive"|"title"|"place"|"line", text, shown }]（上から）
  //   道中の一行（road）のあとに出た見出し（title。戦闘の見出しは除く）があれば、いちばん新しいその見出しの番号。無ければ -1
  //   まだ出していない（shown が false の）見出しは数えない（一行ずつ出す流れで、出た瞬間に頁を改める）
  U42.eventStart = (rows) => {
    rows = rows || [];
    let road = -1, at = -1;
    rows.forEach((r, i) => {
      if (r.kind === "road") road = i;
      else if (r.kind === "title" && road >= 0 && i > road && r.shown !== false && String(r.text || "").trim() !== "戦闘") at = i;
    });
    return at;
  };

  if (typeof document === "undefined" || typeof window === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);

  // ---------------------------------------------------------------- 1. 出口の組に印
  function markExit() {
    document.querySelectorAll("#panel .agroup.u42exit").forEach((g) => g.classList.remove("u42exit"));
    const b = $(`#panel button.act[data-act="${U42.EXIT}"]`);
    const g = b && b.closest(".agroup");
    if (g) g.classList.add("u42exit");
  }

  // ---------------------------------------------------------------- 2. 町の見出しの間は待つ
  const card = () => $("#u14card");
  const cardUp = () => { const c = card(); return !!(c && !c.hidden && !c.classList.contains("out")); };
  const U28 = G.u28;
  if (U28) U28.wait = cardUp;
  // 見出しの間の押す・キーは、見出しを消すだけ（U28 の早送りより先に受け取る）
  const dismiss = (ev) => {
    if (!cardUp() || !U28 || !U28.busy || !U28.busy()) return;
    if (ev.type === "keydown" && (ev.isComposing || ev.altKey || ev.ctrlKey || ev.metaKey)) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (G.u14 && G.u14.hideCard) G.u14.hideCard();
  };
  window.addEventListener("click", dismiss, true);
  window.addEventListener("keydown", dismiss, true);

  // ---------------------------------------------------------------- 3. 道中の出来事は、出来事の名前から
  const kindOf = (el) => el.classList.contains("l-you") ? "you"
    : el.classList.contains("l-u37-road") ? "road"
    : el.classList.contains("l-u37") ? "arrive"
    : el.classList.contains("u14place") ? "place"
    : el.classList.contains("l-title") ? "title" : "line";
  function eventPage() {
    const log = $("#log");
    if (!log || (G.u19 && G.u19.stack)) return;
    const rows = Array.from(log.children).filter((el) => !el.classList.contains("u19gone"));
    const at = U42.eventStart(rows.map((el) => ({ kind: kindOf(el), text: el.textContent, shown: !el.classList.contains("u28wait") })));
    if (at <= 0) return;
    rows.forEach((el, i) => { if (i < at) el.classList.add("u19gone"); });
    // 頁の頭の「▶ 何を選んだか」（U19）も、出来事の頁には出さない
    if (log.getAttribute("data-u19head")) log.setAttribute("data-u19head", "");
    log.scrollTop = 0;
  }
  // 一行ずつ出す流れ（U28）で、見出しが出た瞬間に頁を改める
  let watching = null;
  function watch() {
    const log = $("#log");
    if (!log || watching === log) return;
    watching = log;
    new MutationObserver(() => { try { eventPage(); } catch (e) { /* 止めない */ } }).observe(log, { attributes: true, attributeFilter: ["class"], subtree: true });
  }

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      markExit();
      // 着いた見出しが出たら、場面（背景・場所の名前・BGM）は着いた町に
      if (cardUp() && U28 && U28.busy && U28.busy() && U28.release) U28.release();
      watch();
      eventPage();
    } catch (e) { /* 書き足しに失敗しても画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
