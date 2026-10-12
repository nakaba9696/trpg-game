// U36：今日の日付（暦の日付）を左上の状態の窓にいつも短く出す（持ち主の声「今何日かの表示は左上に出して」）。
// いる所・時刻・状態の一行（u21 の #u29where）は今のまま「📍」を押したときだけ（R12）。日付だけを名前の行（PC。名前と📍のあいだ）・上の帯（スマホ）に一つ置く。
// 要素は一つだけ（#u36date）を使い回し、描くたびに中身だけ書き替える（何手進めても行が増えない。R10 高 1 と同じ）。見た目は ui/zzzzzzzzz_u36_date.css。名前の zzzzzz_ は、とどめの見せ方（zzzzzzz_f5_finish.js）より内側で描き直しを包むため（tests/checks/f5_finish.mjs）。レーン U
(function (G) {
  const u36 = (G.u36 = G.u36 || {});
  // 短い日付（DOM なし）：PC「1127年 春 一の月1日」、スマホ「春一の月1日」（帯の中の今の書き方と同じ）
  u36.dateText = (day, short) => {
    if (!G.calYear || !G.SEASONS || !G.MONTHS) return G.dateOf ? G.dateOf(day) : "";
    const s = G.SEASONS[G.calSi(day)], m = G.MONTHS[G.calMi(day)], d = G.calMd(day);
    return short ? `${s}${m}${d}日` : `${G.calYear(day)}年 ${s} ${m}${d}日`;
  };
  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const el = document.createElement("span");
  el.className = "u36date num";
  el.id = "u36date";
  function paint() {
    const bar = document.getElementById("mbar");
    const S = G.S;
    if (!bar || !S || S.day == null) { el.hidden = true; return; }
    bar.querySelectorAll(".u36date").forEach((x) => { if (x !== el) x.remove(); }); // 写しが残っていたら消す
    const short = document.body.classList.contains("u31m");
    // PC は名前のすぐ後（📍の前）、スマホは名前を出さないので📍の後
    const pin = bar.querySelector(".r11wbtn"), name = bar.querySelector(".mname");
    const at = short ? pin || name : name || pin;
    if (at && el.previousElementSibling !== at) at.after(el);
    else if (!at && el.parentNode !== bar) bar.prepend(el);
    // スマホの帯に入りきらない（所持金や HP の桁が多い）ときは季節を外し、それでも無理なら日だけ。それでも無理なら CSS で切る（帯は一行のまま）
    const tries = short ? [u36.dateText(S.day, true), `${G.MONTHS[G.calMi(S.day)]}${G.calMd(S.day)}日`, `${G.calMd(S.day)}日`] : [u36.dateText(S.day, false)];
    for (const t of tries) {
      if (el.textContent !== t) el.textContent = t;
      if (!short || (el.scrollWidth <= el.clientWidth + 1 && bar.scrollWidth <= bar.clientWidth + 1)) break;
    }
    el.title = "今日の日付：" + u36.dateText(S.day, false);
    el.hidden = false;
  }
  u36.paintDate = paint;
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { paint(); } catch {}
    return r;
  };
})(globalThis.G = globalThis.G || {});
