// C16：暦を 1 季節 30 日・1 年 120 日に（長さは core.js の G.SEASON_DAYS・G.YEAR_DAYS）。ここは古いセーブ（1 季節 90 日・1 年 360 日のころ）の読み替え。
// セーブ（G.S）に足すもの：S.cal = { d: 季節の日数, old: 読み替えたときの日（古いセーブだけ） }。無ければ古いセーブ
//   S.day はそのまま読み、新しい暦で日付を出す（年と季節が変わって見えるのは許す）
//   年齢（墓碑・その後のダイジェスト）は、読み替えまでの日は 360 日で 1 年、そのあとは G.YEAR_DAYS 日で 1 年と数える（急に跳ねない）
//   協定の結び直し（S.world.plan.treaty。古い暦の 1081 日目〜）がまだなら、新しい暦の 1130 年の春へ移す（過ぎていれば次の日に一度だけ起きる）
//   仲間の予定の揺れ（S.f4.shift。古くは ±6 日）は、季節の長さに合わせて縮める
// レーン C（C16）
(function (G) {
  const OLD_YEAR = 360, OLD_SEASON = 90, OLD_TREATY = OLD_YEAR * 3 + 1;

  // 旅に出てからの年数（年齢に足す）
  G.calYearsLived = (days, old) => {
    days = Math.max(0, days || 0);
    if (!old) return Math.floor(days / G.YEAR_DAYS);
    return Math.floor(Math.min(days, old) / OLD_YEAR + Math.max(0, days - old) / G.YEAR_DAYS);
  };

  G.calFix = (S) => {
    if (!S || S.cal || typeof S.day !== "number") return S;
    S.cal = { d: G.SEASON_DAYS, old: S.day };
    const P = S.world && S.world.plan;
    if (P && !S.world.treaty && P.treaty >= OLD_TREATY) P.treaty = G.YEAR_DAYS * 3 + 1 + Math.floor((P.treaty - OLD_TREATY) * G.SEASON_DAYS / OLD_SEASON);
    const sh = S.f4 && S.f4.shift;
    if (sh) Object.keys(sh).forEach((id) => { sh[id] = Math.round((sh[id] || 0) * G.SEASON_DAYS / OLD_SEASON); });
    return S;
  };

  const fix0 = G.fixOldNames;
  G.fixOldNames = (S) => { const r = fix0 ? fix0(S) : undefined; try { G.calFix(S); } catch (e) { /* 直せなくても読み込みは続ける */ } return r; };

  const new0 = G.newGame;
  G.newGame = function () {
    const r = new0.apply(this, arguments);
    if (G.S && !G.S.cal) G.S.cal = { d: G.SEASON_DAYS };
    return r;
  };
})(globalThis.G = globalThis.G || {});
