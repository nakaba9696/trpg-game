// C12（3 本目）：手薄な地域の、特色の場所（W9 の施設）の主。仲間にはならない名のある人（八人）。
//   エルメシア共和国：水門番のピエトロ（水の都トゥリエル）・座頭マルグリット（芸の町サリュエス）
//   光天教会領：修道院長ヒルデガルト（写本の町メルヴィ）・蝋燭屋のアガテ（蝋燭の町リュミエ）・泉守りのセラフィナ（泉の町セレナ）・杖番のトマス（巡礼の宿場オルベ）
//   シェルアーク諸島：塩の顔役ガンゾウ（塩の島ソルネ）・網元のヤエ（網の島カラヴ）
// 前からある特色の場所の文（src/data/w9_spots_*.js）の、名の無い主に名前と暮らしを付けた。前の文とは食い違わせない。
// 出来事は一人に一つか二つ（その場所へ行く理由になるもの）。仲間の頼みごと（quest_c9_c12*.js）にも顔を出す。
// レーン C（キャラクター）＋ V（出来事）の C12 が管理
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign((D.C12_PEOPLE = D.C12_PEOPLE || {}), {
    pietro: {
      side: "依頼人", type: "ojisan", region: "エルメシア共和国", spot: "w9_sluice", aff0: 5, meet: ["w4_tulier"],
      mix: ["現実主義・冷徹な帳面の男", "ふざけている人が急に真面目になる（水位の話のときだけ）"],
      gap: "水門の番小屋の帳面に、通った舟と乗っていた者の職を書く。職の欄は詩人・癒し手・星読みの三つだけ。ほかの職の者は「その他」にもしない。書かない。理由を聞くと、湖の水位の話を一時間する",
      past: "若いころ、町が二階になった年の大水で、帳面に書かなかった職の者たちの舟だけが戻らなかった。それから三つの職しか書かない。書かなければ、数えずに済む",
      fate: "使徒の長編で水の都が沈むことがある。そのときは帳面を抱えて最後まで番小屋にいる",
    },
    marguerite: {
      side: "家族", region: "エルメシア共和国", spot: "w9_theater", aff0: 10, meet: ["w7_salyues"],
      mix: ["おっとりしたお姉さん……ではなく、帳面で人の頭を叩く豪快な座頭", "強いのに妙に人に親身（拾った子を育てる）"],
      gap: "楽師と軽業師の喧嘩を、帳面で両方の頭を一度ずつ叩いて止める。不公平がないように。拾った猫の軽業師の頭だけは、ときどき叩かずに撫でる。本人は叩いたことにしている",
      past: "若いころは綱渡りの名手で、夫とふたり綱を渡った。夫が亡くなってから綱には立っていない。十六年前、広場に檻ごと置いていかれた猫の子の鍵を壊した",
      fate: "病で倒れることがある（猫の軽業師の裏切りのきっかけ）。死は扱わない",
    },
    hildegard: {
      side: "依頼人", region: "光天教会領", spot: "w9_scriptorium", aff0: -5, meet: ["w7_melvi"],
      mix: ["現実主義・冷徹・策士の長", "信念が一貫している（知らないことを知らないまま守る）"],
      gap: "写字室に入る者にはまず手を見せろと言い、爪が汚れている者を紙に触らせない。にこりともしない。書庫番のエルフの梯子を一段短くしたのも彼女。それでいて、書庫番が出ていってから、梯子を誰にも触らせていない",
      past: "前の院長も、その前の院長も、切られた頁のことを調べさせなかった。理由は誰も知らない。知らないまま守るのが修道院の仕事だと信じている〔進〕",
      fate: "使徒の長編で写本の町が焼かれることがある。そのときは書庫に残る",
    },
    agathe: {
      side: "依頼人", region: "光天教会領", spot: "w9_chandlery", aff0: 0, meet: ["w7_lumie"],
      mix: ["有能で自立した女親方。たくましい", "語らない・はぐらかす（『下ろす分』の話）"],
      gap: "工房の客に「見るだけなら外の窓から見な」と言う、ぶっきらぼうな蝋燭屋の親方。蜂に刺された客の腫れには、黙って蝋を塗ってやる。大聖堂の『下ろす分』の燃えさしのことを聞かれると、蜂の数を数えはじめる",
      past: "大聖堂の地下に下ろす蝋燭を、毎月決まった数だけ納めている。燃えさしは一度も返ってこない。夫は昔、その蝋燭を担いで地下へ下りて、戻らなかった〔進〕",
      fate: "死は扱わない",
    },
    seraphina: {
      side: "依頼人", region: "光天教会領", spot: "w9_spring", aff0: 10, meet: ["w7_serena"],
      mix: ["おっとりしたお姉さん。すぐ騙されるお人好し。覚悟を決めたときの芯が強い", "儚い・天然でクール"],
      gap: "泉の縁で、病の巡礼の手を一人ずつ水に沈めてやる若い修道女。唇の動きは祈りではなく数で、巡礼の脈を数えている。巡礼が銅貨を泉に投げると、夜のうちに全部さらって、町の貧しい家の戸口に置いて回る",
      past: "泉で病が治ったことは一度もない、と知っている。それでも手を沈めるのをやめない。治らない者の脈が、泉の水で一度だけ落ち着くのを知っているから",
      fate: "死は扱わない（疫病の年には泉に残る）",
    },
    tomas: {
      side: "依頼人", type: "elder", region: "光天教会領", spot: "w9_staffs", aff0: 5, meet: ["w7_orbe"],
      mix: ["伝説の人がいると周りが驚く（若いころ聖都まで七度歩いた巡礼）", "強いのに飄々とした師匠のおじさん"],
      gap: "杖の納め所の番の老人。杖の数を数えるのを三十年前にやめた。数えたら、帰った者の数が分かってしまうから。巡礼に聖都の歩き方を聞かれると、宿の値から施療院の場所まで正確に答える。自分は七度聖都へ歩いた",
      past: "七度目の巡礼で、聖都の拝謁の列に妻と並んだ。妻は列の先へ進んで、戻らなかった。杖は二本納めた。一本はまだ自分の小屋にある〔進〕",
      fate: "死は扱わない",
    },
    ganzou: {
      side: "敵", type: "brute", region: "シェルアーク諸島", spot: "w9_saltpan", aff0: -20, meet: ["w7_saltisle"],
      mix: ["欲望に忠実な小悪党だが性根は甘い（子どもには塩をただでやる）", "現実主義・味方とは思えない卑劣な手を平気で使う長"],
      gap: "塩田の顔役。秤の分銅を一つだけ毎日拭いて、客の前で使う。目方をごまかした男を塩田に立たせて見せしめにする。そのくせ、島の子どもが塩を舐めに来ると、目方を量らずに一握りずつ持たせて帰す",
      past: "若いころ、島の都の会所の顔役に塩の値を叩かれて、親父の塩田を失いかけた。それから、秤をごまかす側に回った。ごまかすのは陸の客だけだと決めている",
      fate: "使徒の長編で島が荒れると、塩を全部島の者に配って、自分だけ秤小屋に残る",
    },
    yae: {
      side: "師匠", region: "シェルアーク諸島", spot: "w9_netyard", aff0: 5, meet: ["w7_netisle"],
      mix: ["小さいのに母のよう（腰の曲がった網元の婆さま）", "語らない（網目に結んだ物の話）"],
      gap: "島じゅうの網を仕切る網元の婆さま。腰が曲がって、背は子どもくらい。網の結び目を一目見ただけで、誰が結んだか言い当てる。軒下の古い網の網目に、貝殻や髪の束を結んでいるのは自分だが、何のためかは誰にも言わない",
      past: "軒下の古い網の網目に結んであるのは、海から帰らなかった島の者の持ち物。一人に一つ。網目の数だけ、名前を覚えている",
      fate: "死は扱わない",
    },
  });

  const P = (o) => Object.assign({ c12: true }, o);
  Object.assign(D.C2_PEOPLE, {
    pietro: P({ name: "ピエトロ", full: "水門番のピエトロ", nation: "エルメシア", role: "エルメシア共和国の水の都トゥリエルの、水門の番小屋の番人。帳面に通った舟と乗っていた者の職を書く。職の欄は詩人・癒し手・星読みの三つだけで、ほかの職の者は書かない", sex: "男", age: 58, race: "human",
      who: { kind: "villager", sex: "男", age: 58, seed: "c2:pietro", look: { hair: "#6a4a2e", hairStyle: "receding", eyes: "narrow", iris: "#4a5a6a", mouth: "flat", brows: "calm", outfit: "coat", head: "cap", gear: "none", chest: "none", cloth: "#3a4a5a", build: "slim", marks: ["glasses", "wrinkles"], bg: "#4a5a6a" } } }),
    marguerite: P({ name: "マルグリット", full: "座頭マルグリット", nation: "エルメシア", role: "エルメシア共和国の芸の町サリュエスの芝居小屋の座頭。楽師と軽業師の喧嘩を、帳面で両方の頭を一度ずつ叩いて止める。昔は綱渡りの名手。十六年前、置いていかれた猫の子を拾った", sex: "女", age: 66, race: "human",
      who: { kind: "host", sex: "女", age: 66, seed: "c2:marguerite", look: { hair: "#c8c0b8", hairStyle: "bun", eyes: "sharp", iris: "#5a4a3a", mouth: "smirk", brows: "raised", outfit: "dress", head: "none", gear: "none", chest: "none", cloth: "#6a2a3a", build: "normal", marks: ["wrinkles", "earring"], bg: "#5a3a4a" } } }),
    hildegard: P({ name: "ヒルデガルト", full: "修道院長ヒルデガルト", nation: "光天教会領", role: "光天教会領の写本の町メルヴィの修道院長。写字室に入る者にまず手を見せろと言い、爪の汚れた者を紙に触らせない。切られた頁のことを、知らないまま守っている", sex: "女", age: 68, race: "human",
      who: { kind: "priest", sex: "女", age: 68, seed: "c2:hildegard", look: { hair: "#e8e4dc", hairStyle: "short", eyes: "narrow", iris: "#3a4a5a", mouth: "flat", brows: "calm", outfit: "vestment", head: "veil", gear: "none", chest: "sun", cloth: "#2a2a30", build: "slim", marks: ["wrinkles"], bg: "#3a3a40" } } }),
    agathe: P({ name: "アガテ", full: "蝋燭屋のアガテ", nation: "光天教会領", role: "光天教会領の蝋燭の町リュミエの、蝋燭工房の親方。ぶっきらぼうで、客には外の窓から見ろと言う。大聖堂の地下に下ろす蝋燭を毎月納めている", sex: "女", age: 52, race: "human",
      who: { kind: "merchant", sex: "女", age: 52, seed: "c2:agathe", look: { hair: "#4a3020", hairStyle: "bun", eyes: "sharp", iris: "#4a7a4a", mouth: "frown", brows: "angry", outfit: "apron", head: "kerchief", gear: "none", chest: "none", cloth: "#8a6a3a", build: "broad", marks: ["scar"], bg: "#6a5030" } } }),
    seraphina: P({ name: "セラフィナ", full: "泉守りのセラフィナ", nation: "光天教会領", role: "光天教会領の泉の町セレナの、泉の番の若い修道女。病の巡礼の手を一人ずつ水に沈めてやる。唇の動きは祈りではなく、巡礼の脈の数", sex: "女", age: 27, race: "human",
      who: { kind: "priest", sex: "女", age: 27, seed: "c2:seraphina", look: { hair: "#1a1a1e", hairStyle: "bob", eyes: "sleepy", iris: "#5a7a6a", mouth: "smile", brows: "calm", outfit: "vestment", head: "veil", gear: "none", chest: "sun", cloth: "#d8d4c8", build: "slim", marks: [], bg: "#6a7a7a" } } }),
    tomas: P({ name: "トマス", full: "杖番のトマス", nation: "光天教会領", role: "光天教会領の巡礼の宿場オルベの、杖の納め所の番の老人。杖の数を数えるのを三十年前にやめた。若いころ聖都へ七度歩いた巡礼", sex: "男", age: 81, race: "human",
      who: { kind: "elder", sex: "男", age: 81, seed: "c2:tomas", look: { hair: "#a8a4a0", hairStyle: "wild", eyes: "sleepy", iris: "#5a5a4a", mouth: "smile", brows: "calm", outfit: "robe", head: "none", gear: "staff", chest: "none", cloth: "#6a5a42", build: "slim", marks: ["beard", "wrinkles"], bg: "#6a5a48" } } }),
    ganzou: P({ name: "ガンゾウ", full: "塩の顔役ガンゾウ", nation: "シェルアーク", role: "シェルアーク諸島の塩の島ソルネの塩田の顔役。秤の分銅を一つだけ毎日拭いて客の前で使う。目方をごまかした男を塩田に立たせる。子どもには塩をただでやる", sex: "男", age: 50, race: "human",
      who: { kind: "merchant", sex: "男", age: 50, seed: "c2:ganzou", look: { skin: "#a87050", hair: "#d07030", hairStyle: "short", eyes: "round", iris: "#3a6a9a", mouth: "grin", brows: "angry", outfit: "kimono", head: "none", gear: "none", chest: "none", cloth: "#e8e4d8", build: "broad", marks: ["stubble"], bg: "#7a8a9a" } } }),
    yae: P({ name: "ヤエ", full: "網元のヤエ", nation: "シェルアーク", role: "シェルアーク諸島の網の島カラヴの網元の婆さま。腰が曲がって背は子どもくらい。結び目を一目見て、誰が結んだか言い当てる。軒下の古い網に、貝殻や髪の束を結んでいる", sex: "女", age: 79, race: "human",
      who: { kind: "elder", sex: "女", age: 79, seed: "c2:yae", look: { hair: "#d8d4cc", hairStyle: "bun", eyes: "narrow", iris: "#3a3a3a", mouth: "flat", brows: "calm", outfit: "kimono", head: "kerchief", gear: "none", chest: "none", cloth: "#2a3a4a", build: "slim", marks: ["wrinkles"], bg: "#4a5a6a" } } }),
  });

})(globalThis.G = globalThis.G || {});
