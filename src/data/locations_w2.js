// 新しい町と野外（W2）。docs/lore/life.md 11. の「まだ無い町」から、遊びに効くものを選んだ。欄の意味は locations.js と同じ
// 聖王国：麦の都グランベール（畑仕事・通り道祭り）、鍛冶の都ドランヘルツ（鍛冶場で素材から武具を打たせる）
// 鉄血帝国：闘技の都ザルグロス（闘技場）、懺悔の谷・影の谷（野外）、酸の谷（迷宮）。三つの谷は帝国の中（docs/lore/strata.md 7.）
// ゼファラ共和国：湯の町アミュレイン（湯治場）、狩り場の町ナグリス（獣人の狩り）
// 新しい施設（field 畑 / forge 鍛冶場 / arena 闘技場 / bath 湯治場 / hunt 狩り場）の中身は src/engine/towns_w2.js
// 町の名前はスプレッドシートの都市名（#76 の推しの案）。今ある場所への道はこのファイルの末尾で足す。locations.js は書き換えない
// レーン W（ワールド）が管理
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.LOCS, {
    // ---------------------------------------------------------------- 聖王国リーヴェル
    w2_granbel: {
      name: "麦の都グランベール", region: "聖王国リーヴェル", type: "town", danger: 0, scene: "w2_farm", x: 16, y: 56,
      desc: "見渡すかぎりの麦畑と風車。畑の区切りが毎年少しずつ違う方角へずれていて、去年の畑のあった所には、もう若い森が立っている。農夫たちは気にせず鍬を振るっている。",
      fac: ["inn", "tavern", "shop", "church", "field"],
      shop: ["w2_whitebread", "w2_sausage", "jerky", "ale", "leather"],
      links: { leavel: 2, plains: 2 },
    },
    w2_dranherz: {
      name: "鍛冶の都ドランヘルツ", region: "聖王国リーヴェル", type: "town", danger: 0, scene: "w2_forge", x: 30, y: 30,
      desc: "山肌に張りついた煙突の町。どの家からも槌の音がする。夕べの鐘が鳴ると、鍛冶屋たちは打ちかけの鉄を布にくるみ、裏庭の土に埋めてから家に入る。",
      fac: ["inn", "tavern", "shop", "guild", "forge"],
      shop: ["axe", "longsword", "chain", "plate", "mace", "i1_potlid"],
      links: { plains: 2, frost: 2 },
    },

    // ---------------------------------------------------------------- 鉄血帝国ガルムント
    w2_zalgros: {
      name: "闘技の都ザルグロス", region: "鉄血帝国ガルムント", type: "town", danger: 0, scene: "w2_arena", x: 12, y: 18,
      desc: "雪の中に据えられた、すり鉢形の大闘技場の町。兵舎と賭け屋と包帯屋が、闘技場を囲んで並んでいる。歓声は吹雪より大きい。",
      fac: ["inn", "tavern", "shop", "train", "alley", "arena"],
      shop: ["w2_kilnpie", "w2_frostfire", "axe", "chain", "potion"],
      links: { garmund: 2, w2_echo: 2 },
    },
    w2_echo: {
      name: "懺悔の谷", region: "鉄血帝国ガルムント", type: "wild", danger: 3, scene: "w2_echo", x: 4, y: 28,
      desc: "崩れた城壁と屋根のない家々が、谷底に埋もれている。何か言えば、こだまが返ってくる。言っていないことも、返ってくる。",
      pool: ["deserter", "zombie", "werewolf", "e1_frostgrave"], links: { w2_zalgros: 2, leavel: 3 },
    },
    w2_shadow: {
      name: "影の谷", region: "鉄血帝国ガルムント", type: "wild", danger: 3, scene: "w2_shadow", x: 50, y: 8,
      desc: "町の跡とだけ地図にある。石畳にも壁にも、人の影だけが黒く焼き付いている。洗濯物を干す影、走る子どもの影、振り返る女の影。影の持ち主は、どこにもいない。",
      pool: ["zombie", "wolf", "warlock", "e1_ashhound"], links: { garmund: 3 },
    },
    w2_acid: {
      name: "酸の谷", region: "鉄血帝国ガルムント", type: "dungeon", danger: 3, scene: "w2_acid", x: 50, y: 38,
      desc: "谷がまだ溶けている。緑の湯気の底に、錆びた鉄の巨人たちが膝をついたまま並んでいる。谷の底のほうで、何かがゆっくり脈打つ音がする。",
      pool: ["slime", "e1_sweeper", "spider", "mimic", "e1_melted"], floors: 4, boss: "w2_ironwarden",
      reward: { flag: "w2_ironwarden", item: "w2_acidcore", fame: 45, chron: "酸の谷の底で、溶けかけた機械兵を止める。脈打つ緑の石を持ち帰る", text: "鉄の巨人が膝をつき、胸の蓋が外れた。中には誰も乗っていなかった。操る席の背もたれに、小刀で刻んだ字。「八六二年　交代はまだか」巨人の足元の酸の溜まりから、握りこぶしほどの緑の石を掬い上げた。温かい。手のひらの上で、脈を打っている。" },
      links: { frost: 2 },
    },

    // ---------------------------------------------------------------- ゼファラ共和国
    w2_amyrein: {
      name: "湯の町アミュレイン", region: "ゼファラ共和国", type: "town", danger: 0, scene: "w2_spa", x: 74, y: 64,
      desc: "湖のほとりの静かな湯の町。湯気の向こうで、包帯だらけの冒険者と、しっぽを湯に浸けた獣人の老人と、三百年この湯に通っているというエルフが、同じ湯船で黙っている。",
      fac: ["inn", "shop", "church", "bath"],
      shop: ["herb", "potion", "manawater", "elixir", "w2_honeycake"],
      links: { zephara: 2, swamp: 2, w2_nagris: 3 },
    },
    w2_nagris: {
      name: "狩り場の町ナグリス", region: "ゼファラ共和国", type: "town", danger: 0, scene: "w2_hunt", x: 84, y: 40,
      desc: "大木の枝の上に家を架けた獣人の町。東の空いっぱいに、雲に届く大樹の影がかかっている。子どもたちは、根の上で嘘をつかないことと、弓の弦の張り方を、同じ日に教わる。",
      fac: ["inn", "tavern", "shop", "guild", "hunt"],
      shop: ["jerky", "w2_honeycake", "dagger", "leather", "herb"],
      links: { zephara: 2, w2_amyrein: 3 },
    },
  });

  // 今ある場所からの道（両方向に書く決まり）
  const L = D.LOCS;
  const link = (a, b, days) => { if (L[a] && L[b]) { L[a].links[b] = days; L[b].links[a] = days; } };
  link("w2_granbel", "leavel", 2);
  link("w2_granbel", "plains", 2);
  link("w2_dranherz", "plains", 2);
  link("w2_dranherz", "frost", 2);
  link("w2_zalgros", "garmund", 2);
  link("w2_echo", "leavel", 3);
  link("w2_shadow", "garmund", 3);
  link("w2_acid", "frost", 2);
  link("w2_amyrein", "zephara", 2);
  link("w2_amyrein", "swamp", 2);
  link("w2_nagris", "zephara", 2);

  // 天候（engine/weather.js の D.CLIMATE。あとから読まれる weather.js は Object.assign で残す）
  D.CLIMATE = Object.assign(D.CLIMATE || {}, {
    w2_granbel: { rain: 0.2, fog: 0.1 },
    w2_dranherz: { rain: 0.15, fog: 0.3, cold: 1 },        // 煙突の煙で、晴れの日も霞む
    w2_zalgros: { rain: 0.35, fog: 0.1, cold: 2 },
    w2_echo: { rain: 0.3, fog: 0.3, cold: 1 },
    w2_shadow: { rain: 0.25, fog: 0.2, cold: 2 },
    w2_acid: { rain: 0.1, fog: 0.55, cold: 1 },            // 緑の湯気
    w2_amyrein: { rain: 0.15, fog: 0.4 },                  // 湯気
    w2_nagris: { rain: 0.25, fog: 0.2 },
  });
})(globalThis.G = globalThis.G || {});
