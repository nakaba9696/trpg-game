// T3：トロフィーの格の見直しと、四つ目の格「白金」。測った表と理由は PR（t3-trophy-tiers）の本文。
// 格の決まり（T3 で決めた。tests/checks/t3_trophy_tiers.mjs が崩れていないか見る）：
//   銅   … ふつうに遊べば最初の冒険で取れる（作ったばかりの冒険では取れない。旅立ちだけは別）
//   銀   … 目的を持って遊ぶと取れる（筋のよい遊び方で数％〜七割ほど・一つの筋を最後まで追う）
//   金   … 大きな節目（使徒を討つ・伝説の武具・最後の段の絆・上級の術・一年・一万 G など）
//   白金 … 極めて大変なやりこみ（図鑑の分類を埋める・討てる使徒をすべて討つ・すべての場所・罠の覚え書きをすべて）
// 同じ筋の段（依頼 1 → 10 → 30 件、位 騎士 → 領主 → 国王 など）は、重い方の格を下げない。
// 能力値の条件は S5 の点（作成で 5〜18 ほど）で書く。作成直後に届く値にはしない。
// key は古い記録（G.P.trophies）に使われているので変えない。格は表の今の格で数える（zz_u10_trophy_bonus.js）。
// trophies.js・trophies_t2.js の格はその場で直した。ほかのレーンのファイルが足したトロフィーの格は、下の TIER で直す。レーン T
(function (G) {
  const D = (G.data = G.data || {});
  D.TROPHY_TIERS = ["白金", "金", "銀", "銅"]; // 高い順（画面の並び・格ごとの数）
  const P = () => G.P || {};
  const n = (o) => Object.keys(o || {}).length;

  // ---------------------------------------------------------------- ほかのレーンのトロフィーの格
  const TIER = {
    e3_kokunan: "金", // A 級の使徒。どの使徒でもよい「使徒殺し」が金なので、それより重い A 級を銀にしない
  };
  (D.TROPHIES || []).forEach((t) => { if (TIER[t.key]) t.tier = TIER[t.key]; });

  // ---------------------------------------------------------------- 新しい節目
  const share = (k) => { const c = G.codexCount ? G.codexCount() : null; return c && c[k + "All"] > 0 ? c[k] / c[k + "All"] : 0; };
  const slayable = () => Object.values((D.E3 && D.E3.LIST) || {}).filter((a) => a && a.foe && !a.noslay).map((a) => a.foe);
  (D.TROPHIES = D.TROPHIES || []).push(
    { key: "t3_skill", name: "手に馴染む", tier: "銀", desc: "技を一つ、極みまで使い込んだ",
      test: (S) => !!(G.k1 && G.k1.lv && D.K1_LV) && (S.skills || []).some((id) => G.k1.lv(id, S) >= D.K1_LV.length - 1) },
    { key: "t3_spell3", name: "上の段の言葉", tier: "金", desc: "上級の術を覚えた",
      test: (S) => Object.keys(D.SPELLS || {}).some((id) => (D.SPELLS[id].tier || 1) === 3 && !!G.knows && G.knows(id, S)) },
    { key: "t3_bond", name: "最後の段", tier: "金", desc: "仲間との絆の、最後の段の褒美を受け取った",
      test: (S) => Object.entries((S.c13 && S.c13.done) || {}).some(([id, d]) => { const t = (D.C13_BOND || {})[id]; return !!t && t.length > 0 && (d || []).includes(t.length - 1); }) },
    { key: "t3_apostles", name: "刻印の果て", tier: "白金", desc: "冒険をまたいで、討てる使徒をすべて討ったことがある",
      test: () => { const all = slayable(); const s = P().slain || {}; return all.length > 0 && all.every((f) => s[f]); } },
    { key: "t3_codex_foes", name: "魔物の博物誌・完", tier: "白金", desc: "冒険をまたいで、図鑑の魔物の頁を九割埋めた", test: () => share("foes") >= 0.9 },
    { key: "t3_codex_items", name: "品の目録", tier: "白金", desc: "冒険をまたいで、図鑑の品の頁を九割埋めた", test: () => share("items") >= 0.9 },
    { key: "t3_codex_people", name: "人の名簿・完", tier: "白金", desc: "冒険をまたいで、図鑑の人物の頁を九割埋めた", test: () => share("people") >= 0.9 },
  );
})(globalThis.G = globalThis.G || {});
