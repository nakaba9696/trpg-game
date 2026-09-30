// 聖都の地下墓地と朧島の敵（W1）。欄の意味は enemies.js と enemies_2.js と同じ
// 使徒（ヴェスパ・グレゴル・コノハ）は倒せる。魔人（アウレリア・宵姫）は敵にしない。docs/lore/majin.md
// 説明文は匂わせにとどめる（魔人の名前や正体は書かない。docs/lore/reveal.md）
// W1 の場所（locations_w1.js）と出来事（events_w1.js）から使う
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ENEMIES, {
    // 段 2
    w1_candlemite: {
      name: "蝋燭かじり", tier: 2, hp: 14, dmg: [1, 4, 1], hit: 50, def: 5, agi: 35, will: 25, mres: 0, gold: [1, 8], loot: [["herb", 0.2]], shape: "small", eye: "#ffcf6e",
      desc: "地下墓地の蝋燭をかじって生きる、犬ほどの芋虫。灯りを食べては、暗くなったことに驚いて泣く。",
      look: { body: "blob", skin: "#e8dcb8", skin2: "#fff4d0", eyes: "googly", mouth: "o", pattern: "stripes", extra: ["sweat"] },
      fleeAt: 0.5,
      lines: {
        open: ["芋虫は燭台の蝋燭をひと口かじった。あたりが暗くなった。芋虫は泣き出した。"],
        turn: ["芋虫は壁の蝋燭をかじり、また暗くなって泣いた。学ばない。", "芋虫はあなたの松明を、じっと、物欲しそうに見ている。"],
        flee: "芋虫は最後の蝋燭をくわえて、闇の奥へ這っていった。遠くで、また泣き声がした。",
      },
    },

    // 段 3
    w1_husk: {
      name: "祈り殻", tier: 3, hp: 26, dmg: [1, 6, 2], hit: 50, def: 5, agi: 15, will: 999, mres: 10, undead: true, gold: [0, 15], loot: [["relic", 0.04]], shape: "humanoid", eye: "#fff1c9",
      desc: "干からびた巡礼者。死んだことに気づかず、まだ祈りの文句を唱えている。首筋に光の輪の痣。",
      look: { body: "biped", build: "lanky", skin: "#b8ac90", head: "hood", eyes: "hollow", mouth: "none", arms: "forward", outfit: "robe", cloth: "#d8d0bc", pattern: "ribs" },
      lines: {
        open: ["干からびた巡礼者が、祈りながらこちらへ歩いてくる。「聖女さま……聖女さま……もっと、お受け取りください……」"],
        turn: ["祈り殻の唇が、祈りの文句を間違えた。自分で言い直している。", "祈り殻の首筋の痣が、ぼうっと光った。どこか上の方へ、細い光の糸が伸びている。"],
      },
    },
    w1_choir: {
      name: "聖歌の髑髏", tier: 3, hp: 24, dmg: [2, 4, 1], hit: 60, def: 10, agi: 40, will: 999, mres: 30, undead: true, magic: true, gold: [0, 20], loot: [["holywater", 0.2]], shape: "swarm", eye: "#9fd6ff",
      desc: "首だけになった聖歌隊。宙に並んで、今も讃美歌を歌っている。音程を外した者を、声で砕く。",
      look: { body: "swarm", count: 5, build: "small", skin: "#e8e2cc", head: "plain", eyes: "hollow", mouth: "o", outfit: "none", extra: ["float"] },
      lines: {
        open: ["闇の奥から讃美歌。首だけの聖歌隊が、宙に浮いてこちらを向いた。あなたの足音が、拍子を外した。"],
        turn: ["一つの髑髏が高い音を外した。他の髑髏が一斉にそちらを睨み、そいつを噛み砕いた。", "髑髏たちは歌いながら、あなたの鼻歌の音程を直してくる。"],
      },
    },
    w1_beastpriest: {
      name: "獣憑きの司祭", tier: 3, hp: 32, dmg: [2, 6, 1], hit: 60, def: 10, agi: 50, will: 70, mres: 5, gold: [10, 40], loot: [["holysymbol", 0.15], ["potion", 0.3]], shape: "humanoid", eye: "#ff4d4d",
      desc: "法衣の下から毛が生え、口が裂けはじめた司祭。首から下げた聖印に、聖餐を受けた回数が刻んである。まだ説教をやめない。",
      look: { body: "biped", build: "brute", skin: "#5a4a3e", skin2: "#8a7a68", head: "wolf", eyes: "glow", mouth: "fangs", arms: "claws", outfit: "robe", cloth: "#e8e2d0", extra: ["blood"], mood: "fierce" },
      lines: {
        open: ["「迷える子羊よ、聖女さまの血を分けてあげよう……いや、あなたの血を、分けておくれ」司祭の口が、耳まで裂けた。"],
        turn: ["司祭は吠え、それから咳払いをして「失礼」と言った。", "「神は、見ておられる」獣の声で、司祭は正しいことを言った。"],
      },
    },
    w1_tanuki: {
      name: "祭りの化け狸", tier: 3, hp: 22, dmg: [1, 6, 2], hit: 55, def: 10, agi: 55, will: 30, mres: 20, gold: [10, 50], loot: [["ale", 0.6], ["riceball", 0.4]], shape: "small", eye: "#f09a3e", bribe: 15,
      desc: "朧島の祭りで屋台を出している狸。化けるのが下手で、いつも尻尾が出ている。売り物の半分は葉っぱ。",
      look: { body: "biped", build: "stubby", skin: "#8a6a4a", skin2: "#e0cca8", head: "plain", ears: "round", eyes: "googly", mouth: "grin", tail: "thin", weapon: "bottle", outfit: "none", extra: ["blush"], mood: "silly" },
      fleeAt: 0.4,
      lines: {
        open: ["「へい、らっしゃい！ ……おっと、お代がまだで？」狸は葉っぱの小判を握りしめ、腹鼓を打った。"],
        turn: ["狸はあなたに化けてみせた。尻尾が出ている。", "狸は腹鼓を打ちすぎて、自分でむせた。"],
        flee: "「覚えてやがれ、ポン！」狸は煙と葉っぱを残して消えた。",
      },
    },

    // 使徒（ボス）
    w1_vespa: {
      name: "異端審問官ヴェスパ", tier: 4, boss: true, hp: 90, dmg: [2, 8, 3], hit: 75, def: 25, agi: 55, will: 999, mres: 20, gold: [80, 160], loot: [["holywater", 1], ["potion", 1]], shape: "humanoid", eye: "#ff8a3a",
      desc: "鉄の仮面の異端審問官。聖女さまを疑う者を「異端」と呼び、火刑台へ連れていく。仮面の下を見た者はいない。",
      look: { body: "biped", build: "lanky", skin: "#8a8c94", head: "helm", eyes: "glow", mouth: "none", weapon: "spear", outfit: "armor", cloth: "#6a1a1a", extra: ["cape", "smoke"] },
      lines: {
        open: ["鉄の仮面の奥から、平らな声。「あなたは知りすぎました。火は、すべてを清めます」"],
        turn: ["「告白なさい。聖女さまは、あなたを許してくださいます。灰になったあとで」", "ヴェスパの槍の穂先が、赤く焼けている。"],
      },
    },
    w1_gregor: {
      name: "墓守グレゴル", tier: 4, boss: true, hp: 110, dmg: [2, 6, 3], hit: 70, def: 15, agi: 30, will: 999, mres: 30, magic: true, gold: [100, 200], loot: [["relic", 1], ["elixir", 1]], shape: "humanoid", eye: "#7dffb0",
      desc: "地下墓地の老司祭。死者にも祈りを続けさせるため、死体を歩かせている。自分が何年生きているかは、もう数えていない。",
      look: { body: "biped", build: "lanky", skin: "#c8c0a8", head: "human", hair: "#e8e4d8", eyes: "glow", mouth: "smirk", weapon: "staff", outfit: "robe", cloth: "#2a2a24", extra: ["beard", "runes"] },
      lines: {
        open: ["骨の祭壇の前で、老司祭が振り返った。「祈りが止むと、聖女さまがお腹を空かせる。あなたにも、祈っていただきましょう。永遠に」"],
        turn: ["グレゴルが杖を鳴らすと、壁の骨がかたかたと祈りはじめた。", "「わしも昔は、本物の神を信じておった。……何百年前だったかの」"],
      },
    },
    w1_konoha: {
      name: "狐の忍コノハ", tier: 4, boss: true, hp: 85, dmg: [2, 6, 4], hit: 80, def: 20, agi: 85, will: 999, mres: 20, gold: [100, 250], loot: [["smoke", 2], ["gem", 1]], shape: "humanoid", eye: "#ffd24a",
      desc: "朧島の賭場を仕切る、狐面の少女の忍。いかさまの名人。主の博打の腕前を、主以外の全員が知っている。",
      look: { body: "biped", build: "small", skin: "#f0d8c0", head: "mask", ears: "pointy", eyes: "slit", mouth: "none", tail: "thin", weapon: "katana", outfit: "garb", cloth: "#b8321f", extra: ["scarf"] },
      lines: {
        open: ["「あら、賭場で刀を抜くなんて、野暮なお方」狐面の少女は、袖から賽子と苦無を同時に出した。"],
        turn: ["コノハの姿が三つに分かれた。二つは葉っぱだった。", "「姫さまには内緒ですよ。わたしが負けたなんて」"],
      },
    },
  });
})(globalThis.G = globalThis.G || {});
