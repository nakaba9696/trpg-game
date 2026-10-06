// 新しい地域（W1）：光天教会の聖都エルヴィナと、その地下墓地。シェルアークの離島・朧島。欄の意味は locations.js と同じ
// 聖都の大聖堂の奥には蝶翅のユヴァリエ、朧島の祠には香煙のベリエラがいる（docs/lore/majin.md）。どちらも倒せない相手として出来事で関わる
// 今ある場所への道（王都・港町・シェルアークからの行き来）は、このファイルの末尾で足す。locations.js は書き換えない
// レーン W（ワールド）が管理
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.LOCS, {
    w1_holy: {
      name: "聖都エルヴィナ", region: "光天教会領", type: "town", danger: 0, scene: "w1_holy", x: 5, y: 50,
      desc: "白い石畳と黄金の尖塔の都。大聖堂の鐘が一日じゅう鳴り、巡礼者たちが「聖女さま」と泣きながら行き交う。帰ってこない者のことは、誰も数えていない。",
      fac: ["inn", "tavern", "shop", "guild", "church", "train", "alley"],
      shop: ["mace", "chain", "holywater", "holysymbol", "elixir"],
      links: { leavel: 3, nerva: 3, w1_catacomb: 1 },
    },
    w1_catacomb: {
      name: "エルヴィナの地下墓地", region: "光天教会領", type: "dungeon", danger: 3, scene: "w1_catacomb", x: 10, y: 62,
      desc: "大聖堂の真下に掘られた、果てのない墓所。壁も天井も骨で組まれていて、どの手の骨も、祈る形に組み合わされている。奥からまだ誰かの祈る声がする。",
      pool: ["w1_husk", "w1_choir", "w1_beastpriest", "w1_candlemite", "zombie", "spider"], floors: 5, midboss: { 3: "w1_vespa" }, boss: "w1_gregor",
      reward: { flag: "w1_gregor", fame: 50, chron: "エルヴィナの地下墓地の最奥で、墓守グレゴルを討つ。骨の祭壇の下で古い帳面を見つける", text: "老司祭が崩れると、壁の骨たちがいっせいに祈りをやめた。静けさの中、骨の祭壇の下から古い帳面が出てきた。几帳面な字で何百年分の「献上した祈りの量」と、干からびた信者の名前。最後の頁に震える字で一行。「聖女さまはまだお腹を空かせておられる。わしは祈るのをやめられなかった」" },
      links: { w1_holy: 1 },
    },
    w1_oboro: {
      name: "シェルアーク・朧島", region: "シェルアーク", type: "town", danger: 0, scene: "w1_oboro", x: 2, y: 78,
      desc: "シェルアーク諸島の沖に浮かぶ、夜の明けない島。浜から岬の祠まで灯りが吊るされ、甘い香の煙が低く漂い、一年じゅう祭り囃子が鳴っている。屋台の売り子は、たいてい袖から煙が漏れている。",
      fac: ["inn", "tavern", "shop", "alley"],
      shop: ["riceball", "smoke", "katana", "domaru"],
      links: {}, sea: { yakumo: { days: 1, cost: 15 } },
    },
  });

  // 今ある場所からの道（両方向に書く決まり）
  const L = D.LOCS;
  if (L.leavel) L.leavel.links.w1_holy = 3;
  if (L.nerva) L.nerva.links.w1_holy = 3;
  if (L.yakumo) L.yakumo.sea = Object.assign({}, L.yakumo.sea, { w1_oboro: { days: 1, cost: 15 } });
})(globalThis.G = globalThis.G || {});
