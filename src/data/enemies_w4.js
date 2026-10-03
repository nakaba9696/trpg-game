// W4 の場所の敵。欄の意味は enemies.js と enemies_2.js と同じ
// 古い鉄の道（帝国の廃坑）：地喰い虫の子・腹ぺこ岩・地喰いの古殻（主）。地喰い虫は帝国が九五八年に討ったという（docs/lore/igyo.md 65）。討ったのは親だけ
// 沈黙の森：音を食われた狩人。天蓋の原：逆さ歩き。断界の古関：関守の石人（主）
// 説明文は匂わせにとどめる（使徒の名前や正体は書かない。docs/lore/reveal.md）。図鑑の説明は desc
// レーン E（敵）
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ENEMIES, {
    // 段 3
    w4_borer: {
      name: "地喰い虫の子", tier: 3, hp: 30, dmg: [1, 8, 2], hit: 55, def: 25, agi: 25, will: 60, mres: 5, gold: [0, 15], loot: [["fang", 0.4], ["gem", 0.06]], shape: "beast", eye: "#ffb03a",
      desc: "灰褐色の殻の、犬ほどの多脚の虫。背の突起は鉱石そっくりで、鉱夫が鶴嘴を当てて初めて気づく。線路の鉄を、端から少しずつ噛んでいる。",
      look: { body: "bug", skin: "#6a5a48", skin2: "#a89070", eyes: "glow", eyeN: 4, mouth: "fangs", pattern: "cracks", extra: ["bone"], mood: "fierce", mat: "chitin" },
      lines: {
        open: ["足もとの線路が、かり、かり、と鳴った。鉄を噛む音だ。暗がりから、殻の背中が三つ持ち上がった。"],
        turn: ["虫は戦いの最中にも、落ちた釘を拾って噛んでいる。", "殻の背中の突起が、松明の光を鉱石のように照り返した。"],
      },
    },
    w4_hungryrock: {
      name: "腹ぺこ岩", tier: 3, hp: 34, dmg: [2, 4, 2], hit: 55, def: 30, agi: 10, will: 30, mres: 10, gold: [10, 50], loot: [["gem", 0.25], ["q4_whetstone", 0.2]], shape: "blob", eye: "#ffe08a",
      desc: "坑道の曲がり角に置かれた、座るのにちょうどいい岩。腰を下ろした鉱夫の弁当がよく消える。弁当だけで済んだ話のほうが多い。",
      look: { body: "blob", skin: "#7a7068", skin2: "#a8a098", eyes: "googly", eyeN: 2, mouth: "grin", pattern: "cracks", extra: ["drool"], mood: "silly", mat: "stone" },
      fleeAt: 0.3,
      lines: {
        open: ["座ろうとした岩が、口を開けた。中に、誰かの弁当の包みが三つ見えた。"],
        turn: ["岩はあなたの荷物の匂いを嗅いで、よだれを垂らしている。", "岩は腹の音を鳴らした。坑道じゅうに響いた。"],
        flee: "岩は転がって逃げた。坂の下で何かにぶつかって、止まった。弁当の包みが一つ、ぽろりと落ちた。",
      },
    },
    w4_hushed: {
      name: "音を食われた狩人", tier: 3, hp: 24, dmg: [1, 6, 1], hit: 55, def: 10, agi: 45, will: 999, mres: 15, undead: true, gold: [0, 20], loot: [["pelt", 0.3], ["herb", 0.3]], shape: "humanoid", eye: "#c8d8e8",
      desc: "沈黙の森で迷った狩人の成れの果て。口を大きく開けているが、声は出ない。弓を引いても、弦は鳴らない。",
      look: { body: "biped", build: "lanky", skin: "#8a9890", head: "hood", eyes: "hollow", mouth: "o", weapon: "spear", outfit: "rags", cloth: "#3a4a3a", pattern: "ribs", mood: "fierce" },
      lines: {
        open: ["木の陰から、口を開けたままの狩人が出てきた。何か叫んでいる。何も聞こえない。"],
        turn: ["狩人の喉が震えている。声は、どこかへ行ってしまった。", "あなたの踏んだ枝が、音を立てずに折れた。"],
      },
    },

    // 段 5
    w4_saltwalker: {
      name: "逆さ歩き", tier: 5, hp: 60, dmg: [2, 8, 3], hit: 70, def: 20, agi: 55, will: 90, mres: 25, magic: true, gold: [30, 110], loot: [["manawater", 0.4], ["gem", 0.2]], shape: "humanoid", eye: "#e8f0ff",
      desc: "塩の原で、空に映った自分の影の側を歩いている人の形。足の裏が、こちらの足の裏とぴったり合う。目を離すと、上と下が入れ替わっている。",
      look: { body: "biped", build: "lanky", skin: "#d8dce8", skin2: "#ffffff", head: "plain", eyes: "hollow", eyeN: 1, mouth: "none", arms: "claws", outfit: "robe", cloth: "#e8e8f0", extra: ["float"], mood: "fierce" },
      lines: {
        open: ["地面に映った空の中を、誰かが歩いてくる。逆さまに。足の裏が、あなたの足の裏に合った。"],
        turn: ["一瞬、空が足もとに来た。踏ん張ると、元に戻った。", "逆さ歩きは、あなたの影を踏もうとしている。"],
      },
    },

    // 主
    w4_borermother: {
      name: "地喰いの古殻", tier: 4, boss: true, hp: 115, dmg: [2, 6, 4], hit: 70, def: 30, agi: 20, will: 999, mres: 20, gold: [80, 180], loot: [["gem", 1], ["relic", 0.5]], shape: "beast", eye: "#ff8a2a",
      desc: "古い鉄の道の奥で、親の抜け殻に入ったまま大きくなったもの。帝国が遺跡から掘り出した大筒の弾を三発、まだ背中に埋めている。",
      look: { body: "bug", skin: "#5a4a3a", skin2: "#c89a5a", eyes: "glow", eyeN: 6, mouth: "fangs", horns: "long", pattern: "cracks", extra: ["sword_in", "smoke"], mood: "fierce", mat: "chitin", size: 1.2 },
      lines: {
        open: ["坑道がまるごと動いた。壁だと思っていたのは、殻だった。背中に、錆びた大筒の弾が三つ埋まっている。"],
        turn: ["古殻が線路を一本、飴のように噛みちぎった。", "殻の継ぎ目から、子どもたちがわらわらと這い出しては、また潜り込む。"],
      },
    },
    w4_gatekeeper: {
      name: "関守の石人", tier: 5, boss: true, hp: 140, dmg: [2, 8, 3], hit: 70, def: 30, agi: 20, will: 999, mres: 30, gold: [150, 300], loot: [["gem", 1], ["relic", 0.5]], shape: "giant", eye: "#9fd6ff",
      desc: "断界の古関の最奥で、門の前に立ち続けている石の大男。通る者の背丈を測り、手形を求める。手形の出し方を知る者は、もういない。",
      look: { body: "biped", build: "giant", skin: "#8a8478", skin2: "#b8b0a0", head: "helm", eyes: "glow", eyeN: 1, mouth: "none", weapon: "spear", outfit: "armor", cloth: "#5a5448", pattern: "cracks", extra: ["runes"], mood: "fierce", mat: "stone" },
      lines: {
        open: ["石の大男が、槍の石突きで床を三度鳴らした。読めない言葉で何か問われた。手形を、と言われた気がした。"],
        turn: ["石人は、あなたの背丈を指で測り直している。", "石人の胸の刻み目が、一本ずつ光っては消える。"],
      },
    },
  });

  // ボスの前口上（src/data/boss_lines.js と同じ形。tests/checks/b1_fx.mjs）
  D.BOSS_LINES = Object.assign(D.BOSS_LINES || {}, {
    w4_borermother: { lines: [
      "殻の継ぎ目が、かり、かり、と鳴った。線路を噛む音と同じ拍子だった。",
      "背中の錆びた弾が、松明の光をひとつずつ照り返した。古殻は、まだ何かを噛んでいる。",
    ] },
    w4_gatekeeper: { lines: [
      "石の大男は、あなたの背丈を指で測った。測り直した。それから、槍を構えた。",
      "「……手形を」読めない言葉なのに、そう聞こえた。",
    ] },
  });
})(globalThis.G = globalThis.G || {});
