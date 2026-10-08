// V3：死の場面。元の一行（engine/core.js の G.die「名前は倒れた。死因。」）の前に、溜めの段落を置く（engine/zzzzzzzzzz_v3_say.js）。
// 選び分けは日付と手番から（乱数は使わない）。死因の一行は元のまま最後に残す。レーン V（V3）
(function (G) {
  const D = (G.data = G.data || {});
  const P = (...ps) => ps.join("\n\n");
  const LEADS = [
    P("膝が地面についた。いつついたのか、分からなかった。",
      "音が遠くなっていく。自分の息の音だけが耳の内側で大きい。それもだんだん間遠になる。",
      "手を伸ばそうとした。何に向かって伸ばそうとしたのか、自分でも分からなかった。指が土を掻いた。"),
    P("寒い、と思った。さっきまであんなに熱かったのに。",
      "空が見えた。いつの間にか、仰向けになっていた。雲が一つ、ゆっくりと流れていく。こんなにゆっくり雲を見たのは、旅に出てから初めてだった。",
      "誰かの名前を呼ぼうとした。口は動いたが声にならなかった。"),
    P("世界が横に傾いた。傾いたのは自分のほうだと気づくまで、少しかかった。",
      "地面の匂いがした。土と草と鉄の匂い。故郷の裏庭もこんな匂いがした気がする。",
      "まぶたが重い。あと一息だけ、と思った。あと一息。"),
  ];
  D.V3_SAY = (D.V3_SAY || []).concat([
    { id: "death", peak: true, when: (S) => S.over === "dead",
      re: /^(.+)は倒れた。(.+)。$/,
      to: (m, S) => {
        // 迷宮の中・屋内では、空や草の出ない段落から（R7b。src/data/r7b_places.js・engine/r7b_indoor.js）
        const pool = G.r7b && G.r7b.indoor && G.r7b.indoor(S) && D.R7B_DEATH_IN ? D.R7B_DEATH_IN : LEADS;
        return P(pool[Math.abs(((S.day || 0) * 7 + (S.turn || 0)) | 0) % pool.length], m[0]);
      } },
  ]);
})(globalThis.G = globalThis.G || {});
