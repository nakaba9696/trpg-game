// Q7：ログの数値の色分け。ログの一件（S.log の { k, text, fx, n }）から、色を付ける数値の部分を返す。DOM には触らない（色は ui/q7_lognums.js）。
//   dmg  … 敵に与えたダメージ（fx: "hit" の n）
//   hurt … あなたが受けたダメージ（fx: "hurt" の n・「HP -N」）
//   heal … 回復（「HP +N」「MP +N」・全快・宿の回復）
// 返すのは [{ t: 種類, s: 文の中のその部分, num: s のうち色を付ける所（数値。全快・回復はその語） }]。文の中に s が無ければ返さない。
// 文全体ではなく数値だけに色を付ける。品の説明の「HP+30」（空きの無い書き方）は回復の出来事ではないので拾わない。レーン C＋U
(function (G) {
  const Q7 = (G.q7 = G.q7 || {});
  const HEAL = [/(?:HP|MP) \+\d+/g, /(?:HP|MP) が全快/g, /HP が回復/g];
  const HURT = [/HP -\d+/g];
  const numOf = (s) => { const m = /[+-]?\d+|全快|回復/.exec(s); return m ? m[0] : s; };
  Q7.logNums = (e) => {
    if (!e || typeof e.text !== "string" || e.k === "dice") return [];
    const t = e.text;
    const out = [];
    const put = (kind, s) => { if (s && t.includes(s) && !out.some((x) => x.s === s)) out.push({ t: kind, s, num: numOf(s) }); };
    if ((e.fx === "hit" || e.fx === "hurt" || e.fx === "ally") && typeof e.n === "number") put(e.fx === "hit" ? "dmg" : "hurt", `${e.n} のダメージ`); // ally：仲間が受けた（B5）
    HURT.forEach((re) => (t.match(re) || []).forEach((s) => put("hurt", s)));
    HEAL.forEach((re) => (t.match(re) || []).forEach((s) => put("heal", s)));
    return out;
  };
})(globalThis.G = globalThis.G || {});
