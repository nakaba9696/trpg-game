// V17b（持ち主の決定 t15）：剣翼の鳥の縄張り（断界山脈）の眷属に、竜騎手カルラを一体足す。天の巣は場所にせず、対面（e3_meet_azlag）の場のまま。
// 欄は enemies_e4_kin.js と同じ。カルラは名のある一人なので、一度倒したら（E4 の手がかりの印 e4clue:e4k_karla）もう出ない。
// 出る・出ないの見張りと、竜の卵の出来事（v2_egg）を倒したあとに出さないのは engine/zzzzzzzzzzzzzzzzzzzzzzz_v17b.js。
// 絵は持ち主が描くまで、乗っている翼竜の絵を借りる（docs/art/monsters.json の same_as。src/ui/v6_monsters.js の SAME）。
// 人の言葉が少しおかしい（docs/lore/majin.md）。v2_egg の少女と同じ話し方。レーン V（V17b）
(function (G) {
  const D = (G.data = G.data || {});
  Object.assign(D.ENEMIES, {
    e4k_karla: {
      name: "竜騎手カルラ", tier: 4, hp: 50, dmg: [2, 6, 3], hit: 70, def: 20, agi: 65, will: 999, mres: 10, gold: [0, 20], loot: [["wyvernscale", 0.6]], shape: "humanoid", eye: "#ff7a4a",
      kinOf: "azlag", where: ["mountains"], acts: ["disarm"], weak: "ice",
      clue: { text: "少女は竜の背から落ち、それきり起きなかった。竜は少女の襟をくわえて、雲の中へ飛んでいった。岩の上に鞍が一つ残った。鞍の革には大きな爪の跡が何本も走っている。濡れたまま乾いた跡ほど、深かった。", memo: "竜騎手の鞍に、大きな爪の跡。濡れたまま乾いた跡ほど深い" },
      desc: "赤い鎧の少女。竜の背で槍を振るう。人の言葉が少しおかしい。",
      look: { body: "biped", build: "small", skin: "#e8c8a8", head: "helm", eyes: "slit", mouth: "frown", weapon: "spear", outfit: "armor", cloth: "#a83a2a", extra: ["plume"], mood: "fierce" },
      lines: { open: ["雲の中から竜が降りてきた。背に赤い鎧の少女。「オマエ、ここ、くる。だめ」"], turn: ["竜が羽ばたき、少女の槍が上から来る。", "「スベル。……ちがう。すべらない。あのひと、すべらない」"] },
    },
  });
  // E12 の効き目の表（鎧は板金。竜の背の上なので風に弱い）
  if (D.E12 && D.E12.FOES) D.E12.FOES.e4k_karla = "=plate wind+";
})(globalThis.G = globalThis.G || {});
