// R11（文章の直し）：レビュー R10 の中 4・中 12・低 17 など。新しい直しはこのファイルに足す。
(function (G) {
  const D = G.data;
  // 中 12：苔むした石段・祠の出来事に「薬草知識」の選択肢が出ていた（「苔」だけで草の出来事と見なしていた）
  if (D.K1_CATS && D.K1_CATS.herb) D.K1_CATS.herb.not = /使徒|石段|祠|石像|墓/;

  // 低 17：煙玉の説明が一覧で切れる（先頭 16 字だけ出る）。短く言い切る
  if (D.ITEMS && D.ITEMS.smoke) D.ITEMS.smoke.desc = "強敵以外からは必ず逃げられる。";

  // 低 23：酸のスライムなど「膨れる」敵の気配の文が一種類で、防御のたびに同じ文が続いた
  if (D.F1_TELLS && D.F1_TELLS.heavy && D.F1_TELLS.heavy.blob) {
    D.F1_TELLS.heavy.blob.push(
      "{n}の表面が波打ち、中の泡が一か所に寄っていく。大きな一撃が来る。",
      "{n}がずるりと身を引き、反動をつけるようにたわんだ。",
      "{n}の体が一度ぎゅっと縮み、そこから勢いよく伸びようとしている。",
    );
  }

  // 低 22：石積みの目印が同じ丘で何度も同じ文で出る
  const cache = (D.EVENTS || []).find((e) => e.id === "w8x_cache");
  if (cache) cache.once = true;

  // 低 28：白金の手がかり（どれも「まだ誰も語っていない。」だった）。倒す相手・人物・場所の名は書かない
  D.R7_TROPHY_HINTS = Object.assign(D.R7_TROPHY_HINTS || {}, {
    t3_apostles: "刻まれた印の、その果てまで。",
    t3_codex_foes: "出会った相手を、残らず書き留めること。",
    t3_codex_items: "手に取った物を、残らず書き留めること。",
    t3_codex_people: "言葉を交わした人を、残らず書き留めること。",
    t3_all45: "どの力も、一つの節目を越えること。",
    t3_elders_all: "年を経た強い者は、思わぬ所に潜んでいる。",
    t3_spell3x3: "術は、広く、そして高く。",
    t3_legends_all: "語り継がれる品は、いくつもある。",
    t3_lairs_all: "暗がりの奥には、それぞれ主がいる。",
    t3_qkinds_all: "掲示板のどの紙にも、一度は手を伸ばすこと。",
    t3_q9_all: "頼みごとは、人の数だけある。",
    t3_lore_all: "言葉の意味を、集めきること。",
    t3_know_foe: "弱みを、残らず見抜くこと。",
    t3_i3_mats: "刃も鎧も、素材の違いを見ること。",
    t3_trade20000: "安く買い、高く売る日々を重ねる。",
  });
})(globalThis.G = globalThis.G || {});
