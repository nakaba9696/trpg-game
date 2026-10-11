// 獣の病にかかった者たちの敵（M5）。欄の意味は enemies.js と同じ。
// 病をうつすのは疫医ベルナだけ（M9 #103。src/data/m9_plague.js の plague）。ここの敵は、噛んでも病をうつさない
// 説明文は匂わせにとどめる（病の出どころや名前は書かない。docs/lore/curses.md 4.・docs/lore/voice.md）
// 出る場所は下で場所の pool に足す（locations.js は書き換えない）
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ENEMIES, {
    // 段 2：まだ人の言葉を話す。倒すと後味が悪い
    m5_feverfolk: {
      name: "熱に浮いた村人", tier: 2, hp: 16, dmg: [1, 6, 1], hit: 55, def: 5, agi: 45, will: 50, mres: 0,
      gold: [2, 12], loot: [["m5_bloodring", 0.06], ["herb", 0.2]], shape: "humanoid", eye: "#e8b24a",
      desc: "野良着の男。袖の下の腕が妙に毛深い。腕の内側に針の跡が七つ並んでいる。息が荒く、目だけが夜のように光っている。",
      look: { body: "biped", build: "normal", skin: "#c89a78", head: "human", hair: "#4a3a2a", eyes: "glow", mouth: "fangs", arms: "claws", outfit: "rags", cloth: "#6a5a3a", extra: ["stubble", "sweat"], mood: "fierce" },
      lines: {
        open: ["「来るな……頼む、来ないでくれ。腹が減ってるんだ。お前の匂いがうまそうで」"],
        turn: ["村人は自分の腕に噛みつき、どうにか踏みとどまった。", "「かあちゃんには言わないでくれ」村人は泣きながら爪を振り上げた。", "「先生の薬で村の咳は止まったんだ。止まったんだよ……」"],
      },
    },
    // 段 3：人だったころの服の切れ端だけが残っている。群れで来る
    m5_remnant: {
      name: "成れの果て", tier: 3, hp: 28, dmg: [2, 5, 1], hit: 60, def: 10, agi: 55, will: 999, mres: 5,
      gold: [0, 8], loot: [["pelt", 0.5], ["m5_bloodring", 0.05]], shape: "beast", eye: "#ff5a3a",
      desc: "四つ足の獣。首に、ほつれた前掛けの紐がまだ引っかかっている。",
      look: { body: "quad", head: "wolf", skin: "#4a3a34", skin2: "#8a6a58", eyes: "glow", mouth: "fangs", tail: "thin", pattern: "scars", extra: ["drool"], mood: "fierce" },
      lines: {
        turn: ["獣は一度だけ、人のように首をかしげた。", "獣の喉の奥で、誰かの名前のような音が鳴った。"],
      },
    },
    // 段 3：獣を狩っていた側。鉈と角灯
    m5_nightwatch: {
      name: "夜番崩れ", tier: 3, hp: 34, dmg: [1, 10, 2], hit: 60, def: 10, agi: 45, will: 70, mres: 5,
      gold: [10, 40], loot: [["m5_weepcleaver", 0.25], ["m5_morning", 0.3]], shape: "humanoid", eye: "#ffd27a",
      desc: "角灯を腰に下げた大男。鉈は刃こぼれだらけ。本人は、毛深いのは生まれつきだと言い張るだろう。",
      look: { body: "biped", build: "brute", skin: "#b08a6a", head: "human", hair: "#2a1e18", eyes: "glow", mouth: "frown", weapon: "axe", outfit: "armor", cloth: "#3a3024", extra: ["beard", "fur", "pouch"], mood: "fierce" },
      lines: {
        open: ["「夜番だ。袖をまくれ。……まくれと言ってる」男の袖口から灰色の毛がはみ出ている。"],
        turn: ["「俺は違う。俺は生まれつきだ」男は誰にともなく言った。", "角灯の火が揺れた。男の影だけが四つ足だった。"],
      },
    },
    // 前の冒険で獣になった者（名前は出来事で付く。src/engine/sanity_m5.js）
    m5_oldbeast: {
      name: "首に布を巻いた獣", tier: 3, hp: 40, dmg: [2, 6, 2], hit: 60, def: 10, agi: 55, will: 999, mres: 10,
      gold: [0, 0], loot: [["pelt", 1]], shape: "beast", eye: "#f2e14a",
      desc: "大きな獣。首に巻いた布切れに、人の名前が縫い取ってある。",
      look: { body: "quad", head: "wolf", skin: "#5a4838", skin2: "#9a8468", eyes: "glow", mouth: "fangs", tail: "thin", pattern: "ribs", extra: ["scarf"], mood: "fierce" },
    },
  });

  // 出る場所
  const addPool = (loc, ids) => { const L = D.LOCS && D.LOCS[loc]; if (L && L.pool) ids.forEach((id) => { if (!L.pool.includes(id)) L.pool.push(id); }); };
  addPool("plains", ["m5_feverfolk"]);
  addPool("frost", ["m5_feverfolk", "m5_remnant"]);
  addPool("swamp", ["m5_remnant"]);
  addPool("mountains", ["m5_nightwatch"]);
  addPool("graveyard", ["m5_nightwatch"]);
})(globalThis.G = globalThis.G || {});
