// W2 の新しい町を、キャラクター作成（U5）の「生まれ」に足す。書き方は src/data/u5_origins.js と同じ
// u5_origins.js のあとに読まれるように、名前を w2_ で始めている。どの生まれでも、出発地は職業のまま
// レーン W（ワールド）が管理
(function (G) {
  const D = (G.data = G.data || {});
  if (!D.ORIGINS) return;

  Object.assign(D.ORIGINS, {
    w2_granbel: {
      name: "麦の都グランベール", short: "グランベール", culture: "west",
      blurb: "見渡すかぎりの麦畑と風車。畑は毎年、少しずつ東へずれる。",
      mod: { 体力: 2, 魅力: 1 },
    },
    w2_dranherz: {
      name: "鍛冶の都ドランヘルツ", short: "ドランヘルツ", culture: "west",
      blurb: "山肌の煙突の町。夕べの鐘が鳴ると、みんな鉄を土に埋めてから眠る。",
      mod: { 筋力: 2, 知力: 1 },
    },
    w2_zalgros: {
      name: "闘技の都ザルグロス", short: "ザルグロス", culture: "west",
      blurb: "雪の中の大闘技場の町。歓声は吹雪より大きい。",
      mod: { 筋力: 1, 体力: 1, 敏捷: 1 },
    },
    w2_amyrein: {
      name: "湯の町アミュレイン", short: "アミュレイン", culture: "west",
      blurb: "湖のほとりの静かな湯の町。傷の数で、人の来し方が分かる。",
      mod: { 魔力: 2, 魅力: 1 },
    },
    w2_nagris: {
      name: "狩り場の町ナグリス", short: "ナグリス", culture: "west",
      blurb: "大木の枝に家を架けた獣人の町。人間は、少しだけ住んでいる。",
      mod: { 敏捷: 2, 体力: 1 },
    },
  });
})(globalThis.G = globalThis.G || {});
