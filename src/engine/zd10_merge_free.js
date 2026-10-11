// D10：「自由都市連合」を無くした。商都ブランデールと港町ヴァレンツァ（とそのまわり）は、レオネスト王国のふつうの町。
// 場所の id はそのまま。地方（region）は src/data の場所の表で「レオネスト王国」に直した。
// 古いセーブに国の名前として残る「自由都市連合」を、読み込むとき（G.fixOldNames）に王国へ寄せる：
//   S.repute（評判・悪名は足し合わせ、手配はどちらかが手配なら手配。d5_names.js の G.fixOldNames）・S.titleAt・
//   S.quests の nation（依頼を受けた国）・S.world.fx の nations（M12 の値上がり）
// 旅の出来事の地方 "free" は w6_travel.js が "leo" として読む。戦の "free"（どちらにも売る町）は world_m4.js の M.MARKET。DOM には触らない
(function (G) {
  const OLD = "自由都市連合", NOW = "レオネスト王国";
  G.OLD_NATION_NAMES = Object.assign(G.OLD_NATION_NAMES || {}, { [OLD]: NOW });

  G.fixD10 = (S) => {
    if (!S) return S;
    (Array.isArray(S.quests) ? S.quests : []).forEach((q) => { if (q && q.nation === OLD) q.nation = NOW; });
    const fx = S.world && Array.isArray(S.world.fx) ? S.world.fx : [];
    fx.forEach((f) => {
      if (!f || !Array.isArray(f.nations) || !f.nations.includes(OLD)) return;
      f.nations = f.nations.map((n) => (n === OLD ? NOW : n)).filter((n, i, a) => a.indexOf(n) === i);
    });
    return S;
  };

  // 古いセーブを読み込んだときに呼ばれる（q7_slots.js・main.js）。何度呼んでもよい
  const base = G.fixOldNames;
  G.fixOldNames = (S) => {
    if (base) base(S);
    return G.fixD10(S);
  };
})(globalThis.G = globalThis.G || {});
