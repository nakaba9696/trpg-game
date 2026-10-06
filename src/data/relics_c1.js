// C1：銃は失われた時代の遺物（オーパーツ）で、レア物（持ち主の決定 #50）。今の世で作られている武器ではない。機械（機械兵・大筒）も同じ。
// 店の品揃え（SHOP_BASE・場所の shop）には入れない。手に入るのは、迷宮の最奥の手前・野の使徒の骸・町の闇市・
// 帝国脱走兵の懐（弾だけ、ごく稀）。弾も貴重で、撃つたびに一つ減る。使徒の絶界には効かない。
// 銃は装備しない（type "gear"）。持っていれば戦闘に「撃つ」が出る（src/engine/relics_c1.js）。
// gun: { ammo: 弾のアイテム, dmg, stat, hit, burn: 暴発で自分が受ける傷, wet: 雨と雪の日の命中の補正 }
// 説明文は断片だけ（docs/lore/voice.md）。用語説明（S.lore）の「筒」は、手に入れた・闇市を見た・噂を聞いたときに一行ずつ開く。
// レーン C（C1）。id は c1_
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ITEMS, {
    c1_raizutsu: {
      name: "雷筒", type: "gear", price: 900, relic: true,
      gun: { ammo: "c1_raidama", dmg: [3, 6, 3], stat: "敏捷", hit: -10, burn: [1, 6, 0], wet: -20 },
      desc: "黒い鉄の筒。どこにも鍛冶の印が無い。雷玉を込めて撃つと雷のような音がする。銘を削った跡がある。削った者ももういない。",
    },
    c1_kouzutsu: {
      name: "光筒", type: "gear", price: 2000, relic: true,
      gun: { ammo: "c1_koushin", dmg: [4, 6, 6], stat: "敏捷", hit: 5, burn: [2, 6, 0] },
      desc: "乳白色の、継ぎ目のない筒。光の芯を込めると音もなく撃てる。撃ったあとしばらく指先が温かい。握りの形が人の手より少し大きい。",
    },
    c1_raidama: { name: "雷玉", type: "loot", price: 40, desc: "雷筒に込める、鉛と黒い粉の玉。同じものを作れる職人を誰も知らない。" },
    c1_koushin: { name: "光の芯", type: "loot", price: 120, desc: "指ほどの、ほのかに温かい硝子の芯。光筒に込める。冷めると二度と温まらない。" },
  });

  // 帝国脱走兵の懐に、ごく稀に雷玉（帝国が掘り出した筒を抱え込んでいる、という噂の手触り）
  if (D.ENEMIES.deserter) D.ENEMIES.deserter.loot = [...(D.ENEMIES.deserter.loot || []), ["c1_raidama", 0.04]];

  // 機械も同じく遺物（持ち主の追加の決定：遺跡から出たオーパーツで、一部の銃や機械が使える世界）。
  // 酸の谷の機械兵は、帝国が作ったものではなく、遺跡から掘り出して見張りに立てたもの（元の表は src/data/items_w2.js）
  if (D.ENEMIES.w2_ironwarden) D.ENEMIES.w2_ironwarden.desc = "帝国が遺跡から掘り出し、酸の谷の見張りに立てた鉄の巨人。作り方を知る者は帝国にもいない。半分溶けたまま、今も持ち場を離れない。中に人は乗っていない。";

  const deepest = (S) => { const L = D.LOCS[S.loc]; return !!L && L.type === "dungeon" && (S.depth || 0) >= Math.max(1, (L.floors || 1) - 1); };

  D.EVENTS.push(
    // 迷宮の最奥の手前の、封じられた部屋
    { id: "c1_vault", title: "封じられた部屋", where: ["dungeon"], w: 2,
      cond: (S) => deepest(S) && !S.flags.c1_vault,
      text: "崩れた壁の向こうに、扉のない小部屋がある。床の埃に足跡は無い。壁際に古い字の彫られた細長い箱が一つ。箱の上に、誰かの指の骨が一本だけ載っている。",
      choices: [
        { label: "箱をこじ開ける", stat: "筋力", diff: "難しい",
          ok: { text: "蓋が割れた。油を吸った布に包まれて、黒い鉄の筒と、鉛の玉がいくつか。布をほどくと、中の油はまだ乾いていなかった。", flag: "c1_vault", item: { c1_raizutsu: 1, c1_raidama: 4 }, lore: "tsutsu:found", chron: "迷宮の奥で、古い鉄の筒を見つける" },
          ng: { text: "蓋はびくともしない。指の骨がことりと床に落ちた。拾って戻すとなぜか少し安心した。", hp: -2 } },
        { label: "彫られた字をなぞる", stat: "知力", diff: "難しい",
          ok: { text: "字の並びを指で追うと、箱の留め金が自分から外れた。中には黒い鉄の筒と鉛の玉。蓋の裏に短い一行が彫ってある。読める字だが意味が分からない。「残りは東へ」", flag: "c1_vault", item: { c1_raizutsu: 1, c1_raidama: 3 }, lore: "tsutsu:found", memo: "迷宮の奥の箱の蓋の裏：「残りは東へ」", chron: "迷宮の奥で、古い鉄の筒を見つける" },
          ng: { text: "読めたのは最初の一文字だけだった。二文字目から先は目が滑る。" } },
        { label: "骨に手を合わせて立ち去る", ok: { text: "あなたは指の骨に手を合わせ、部屋を出た。振り返ると箱の上の骨が一本増えていた。", flag: "c1_vault" } },
      ] },
    // 野の使徒の骸
    { id: "c1_husk", title: "大きな骸", where: ["wild"], w: 1,
      cond: (S) => S.day >= 20 && !S.flags.c1_husk,
      text: "丘だと思っていたものは骸だった。肋が塔のように並び、苔と鳥の巣に覆われている。いつ死んだのか、誰が倒したのか、近くの村の者は知らない。「昔からあった」とだけ言う。肋の隙間の奥で何かが白く光っている。",
      choices: [
        { label: "肋の奥へ潜り込む", stat: "体力", diff: "難しい",
          ok: { text: "腐った臭いはしなかった。骨の奥に、古い鎧の切れ端と、乳白色の筒が一本、骨に半ば呑まれて埋まっている。引き抜くと筒はほんのり温かかった。そばに硝子の芯が二つ転がっていた。", flag: "c1_husk", item: { c1_kouzutsu: 1, c1_koushin: 2 }, lore: "tsutsu:husk", chron: "使徒の骸の中で白い筒を拾う" },
          ng: { text: "肋の隙間は思ったより狭い。肩が抜けなくなり、半刻もがいた。出てきたとき、光はもう見えなかった。", hp: -4, flag: "c1_husk" } },
        { label: "外から骨を叩き割る", stat: "筋力", diff: "普通",
          ok: { text: "骨は乾いた音を立てて割れた。中から転がり出たのは硝子の芯がひとつ。温かい。白い光はもっと奥にあるらしかった。", item: { c1_koushin: 1 } },
          ng: { text: "骨は石より硬い。手がしびれただけだった。" } },
        { label: "近寄らない", ok: { text: "あなたは骸を遠巻きにして通り過ぎた。丘の上で鳥が一斉に飛び立った。" } },
      ] },
    // 町の闇市（裏路地の奥。品は毎回あるとは限らない）
    { id: "c1_black", title: "布の上の品", where: ["town"], w: 1,
      who: { kind: "rogue", sex: "男", age: 45, look: { head: "hood", mouth: "smirk", marks: ["stubble", "gaunt"] } },
      cond: (S) => S.gold >= 200 && !S.flags.c1_black_gone,
      text: "裏路地の奥、樽の陰に布を広げた男がいる。並んでいるのは錆びた歯車、割れた灯りの石、そして布を何重にも巻いた細長い包み。「見るだけならタダだ。触ったら買え」。男の後ろで、見張りの子どもが表通りを睨んでいる。",
      choices: [
        { label: "包みを買う（900G）", cost: 900, cond: (S) => !G.has("c1_raizutsu"),
          ok: { text: "包みの中は黒い鉄の筒だった。男は弾を三つおまけに付けた。「帝国の蔵から出たって話だが、俺は知らねえ。次に会っても知らねえ」", item: { c1_raizutsu: 1, c1_raidama: 3 }, lore: ["tsutsu:rumor", "tsutsu:found"], chron: "闇市で古い鉄の筒を買う", flag: "c1_black_gone" } },
        { label: "鉛の玉を三つ買う（180G）", cost: 180, cond: (S) => G.has("c1_raizutsu"),
          ok: { text: "男は玉を一つずつ布で拭いてから渡した。「次はいつ入るか分からねえ。入らねえかもしれねえ」", item: { c1_raidama: 3 }, lore: "tsutsu:rumor" } },
        { label: "出どころを尋ねる", stat: "魅力", diff: "難しい",
          ok: { text: "「帝国の蔵には、こういうのがまだ何本か眠ってるそうだ。作れる奴は一人もいねえ。だから眠らせとく」男はそれ以上言わず、布を畳み始めた。", lore: "tsutsu:rumor", memo: "闇市の男：帝国の蔵には、作れない筒が眠っている" },
          ng: { text: "「買わねえなら帰んな」見張りの子どもがあなたの靴を踏んだ。" } },
        { label: "立ち去る", ok: { text: "振り返ると男も布ももう無かった。" } },
      ] },
  );

  // 人の姿が出ない出来事（tests/checks/a4_art.mjs）。光の壁に触れる場面（epilogue_m6.js）もここに
  D.EVENT_NOBODY = (D.EVENT_NOBODY || []).concat(["c1_vault", "c1_husk", "m6_wall_touch"]);

  D.RUMORS.push(
    "親父が若いころ、帝国の閲兵で、火を吐く筒を見たって言うんだ。雷みたいな音で、馬が三頭ひっくり返ったとさ。それきり、二度と見なかったって。",
    "遺跡掘りの爺さんが、鉄の筒を掘り当てたことがあるって自慢してた。次の日、帝国の役人が来て、爺さんごと持ってった。",
  );

  // 用語説明「筒」（物語で分かったことだけ）
  if (D.LORE && D.LORE_ON) {
    D.LORE.tsutsu = { sec: "遠い土地と古い時代", title: "火を吐く筒", lines: [
      ["rumor", "帝国の蔵には、遺跡から出た火を吐く筒が、何本か眠っているという。作れる者はいない。", { hint: ["火を吐く筒", "作れない筒"] }],
      ["found", "黒い鉄の筒を手にした。鍛冶の印がどこにも無い。"],
      ["husk", "大きな骸の中で白い筒を拾った。骨に半ば呑まれていた。"],
      ["shot", "撃つと手の中で雷が鳴る。弾は撃ったぶんだけ減る。"],
      ["wall", "使徒には届かなかった。見えない壁の手前で弾が止まった。"],
    ] };
    // 光の壁に触れて、旅を続けたとき（src/data/epilogue_m6.js の m6_wall_touch）
    if (D.LORE.clap) D.LORE.clap.lines.push(["wall", "東の果てで、壁に手のひらを当てたときに聞いた。"]);
    // 酸の谷の機械兵を止めたとき
    if (D.LORE.sannotani) D.LORE.sannotani.lines.push(["seat", "鉄の巨人の胸の席には、帝国の兵が座っていた跡があった。巨人を打った鍛冶の印は、どこにも無かった。"]);
    const on = D.LORE_ON;
    on.item = Object.assign(on.item || {}, { c1_raizutsu: "tsutsu:found", c1_kouzutsu: "tsutsu:husk" });
    on.flag = Object.assign(on.flag || {}, { w2_ironwarden: "sannotani:seat" });
  }
})(globalThis.G = globalThis.G || {});
