// 使徒の居城の迷宮（E2）。欄の意味は locations.js と同じ。加えて：
//   lair: { event } … 最奥に着いたら、いきなり戦わせずにこの出来事（使徒との謁見）を始める（engine/e2_lair.js）
//   挑むかどうかは出来事の選択肢で決める。絶界を破る剣が無ければ、挑む選択肢は出ない。
// 道は両方向に書く決まりなので、既存の場所の links にもここから足す（locations.js は書き換えない）
// レーン W（ワールド）が管理
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.LOCS, {
    e2_kitchen: {
      name: "肉の谷の大厨房", region: "使徒領", type: "dungeon", danger: 5, scene: "e2_kitchen", x: 93, y: 63,
      desc: "灰の荒野の南、肉の谷の底に建つ城ほどもある厨房。煙突から昼も夜も湯気が上がり、谷じゅうに煮込みの匂いが立ちこめている。働いているのは料理人と、生きている食材だという。帰ってきた者の話は、口の数のところでいつも食い違う。",
      pool: ["e2_cookgob", "e2_meatling", "ogre", "oni", "general"], floors: 4, midboss: { 3: "e2_marmit" }, boss: "e2_gormoa",
      lair: { event: "e2_gormoa_table" },
      reward: { flag: "e2_gormoa", fame: 200, trophy: "majin", chron: "灼け口の使徒テルグリスを討ち果たす。大厨房の火が、千年ぶりに消えた", text: "四つ足の大きな体が、ゆっくりと食卓に崩れ落ちた。三つの口が、最後に同じことを言った。「……ああ、腹が……減った……」大きなものは、湯気のように消えた。卓の端の蜜菓子だけが、手つかずで残っていた。" },
      links: { wasteland: 2 },
    },
    e2_garden: {
      name: "腐れ庭園", region: "エルメシア共和国", type: "dungeon", danger: 2, scene: "e2_garden", x: 70, y: 88,
      desc: "毒沼の湿地の奥。あるはずのない、きれいな花畑が広がっている。甘い匂いがする。花壇の手入れは、いつも行き届いている。",
      pool: ["e2_planted", "e2_rotbloom", "slime"], floors: 4, midboss: { 3: "e2_berna" }, boss: "e2_mordu",
      lair: { event: "e2_mordu_garden" },
      reward: { flag: "e2_mordu", fame: 200, trophy: "majin", chron: "苔衣の使徒セグリトスを討ち果たす。腐れ庭園の花は、一晩で枯れた", text: "セグリトスは膝をつき、足元の花を一輪、そっと撫でた。「ああ……今年は、見に行けませんね……」泥と苔の体が崩れ、花壇の土に還った。植えられていた人々が、一斉に、静かになった。" },
      links: { swamp: 1 },
    },
  });

  // 既存の場所から道を足す
  if (D.LOCS.wasteland) D.LOCS.wasteland.links.e2_kitchen = 2;
  if (D.LOCS.swamp) D.LOCS.swamp.links.e2_garden = 1;
})(globalThis.G = globalThis.G || {});
