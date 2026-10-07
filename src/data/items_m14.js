// M14：初級の魔導書（炎・癒し・風・土）と、上級の術を伝える「伝承の書」（属性ごとに一冊）。
// 魔導書（type "tome"）は M1 と同じ：teach = 覚える術、learn = 読み解く難しさ（知力）。読むには術の才と、その段に届く属性が要る（src/engine/m14_magic.js）。
// 伝承の書は店に並ばない。迷宮の主・使徒の落とし物（src/engine/m14_magic.js が配る）と、深い迷宮の出来事（src/data/m14_events.js）で手に入る。
// レーン I＋B（M14）
(function (G) {
  const D = G.data;

  Object.assign(D.ITEMS, {
    // 初級
    m14_tome_fire: { name: "魔導書『火口の手習い』", type: "tome", teach: "fire", learn: "易しい", price: 120, desc: "焦げ跡だらけの手習い帳。最後の頁にだけ、焦げが一つも無い。" },
    m14_tome_heal: { name: "祈祷書『傷の数え方』", type: "tome", teach: "heal", learn: "易しい", price: 120, desc: "傷の深さを指の節で数える古い手引き。祈りの言葉は数行しかない。" },
    m14_tome_wind: { name: "写本『風見の覚え書き』", type: "tome", teach: "wind1", learn: "普通", price: 150, desc: "風見鶏の絵が何枚も描いてある。どの鶏も、絵の外を向いている。" },
    m14_tome_earth: { name: "石工の祈り書", type: "tome", teach: "earth1", learn: "普通", price: 150, desc: "石切り場で読まれてきた薄い本。表紙が石の粉でざらついている。" },
    // 上級（伝承の書）
    m14_lore_fire: { name: "伝承の書『灰の頌』", type: "tome", teach: "fire3", learn: "至難", price: 900, m14lore: true, desc: "灰で書かれた頌歌。読むたびに少しずつ字が減っていく。" },
    m14_lore_ice: { name: "伝承の書『冬の眠りの譜』", type: "tome", teach: "ice3", learn: "至難", price: 900, m14lore: true, desc: "譜面のような行が並ぶ。歌うと指先から冬が始まる、と余白に書いてある。" },
    m14_lore_bolt: { name: "伝承の書『天の鼓』", type: "tome", teach: "bolt3", learn: "至難", price: 900, m14lore: true, desc: "太鼓の打ち方の本に見える。数えると、拍が一つ多い。" },
    m14_lore_wind: { name: "伝承の書『名無しの嵐』", type: "tome", teach: "wind3", learn: "至難", price: 900, m14lore: true, desc: "頁の端がすべて同じ向きに反っている。閉じても風の音がやまない。" },
    m14_lore_earth: { name: "伝承の書『山の歯の記』", type: "tome", teach: "earth3", learn: "至難", price: 900, m14lore: true, desc: "石板を写した本。最後の石板だけ、写した者の手が震えている。" },
    m14_lore_light: { name: "伝承の書『白き昼の祷』", type: "tome", teach: "light3", learn: "至難", price: 900, m14lore: true, desc: "教会の目録に載っていない祈祷書。夜に開くと、頁が昼の明るさになる。" },
    m14_lore_dark: { name: "伝承の書『帳の裏の帳面』", type: "tome", teach: "dark3", learn: "至難", price: 900, m14lore: true, desc: "帳面の写し。貸した者と借りた者の名が並び、借りた側の名だけが黒く塗ってある。" },
  });

  // ---------------------------------------------------------------- 商店（初級の魔導書）
  const stock = { zephara: ["m14_tome_fire", "m14_tome_wind"], leavel: ["m14_tome_heal"], garmund: ["m14_tome_earth"], karna: ["m14_tome_fire"] };
  Object.entries(stock).forEach(([loc, ids]) => { const L = D.LOCS[loc]; if (L) L.shop = [...(L.shop || []), ...ids]; });
})(globalThis.G = globalThis.G || {});
