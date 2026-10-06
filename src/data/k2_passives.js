// K2：パッシブスキル（持っているだけで常に効く）。持ち主「パッシブスキルも欲しい。正気度が下がりにくいとか。取得方法はスキルと同じで。
//   例えばドアを解錠するときにファンブルが出たら、解錠時に＋補正がかかるスキルも手に入るとか。スキルと区別するために、スキルは『戦技』にしましょう」
// 仕組みは src/engine/zzzzzzzzzzzz_k2_passives.js。表は K1 の D.SKILLS に kind "passive" で足す（覚え方・巻物・師・稽古・図鑑は K1 と同じ口を使う）。
//   fx：効き目（どれか一つか二つ。強すぎないように補正は小さく）
//     check: { re, n }        … 判定の理由（選択肢の文・「逃走」「威圧」など）が re に合えば、判定に n（％で書く。G.s5Mod で点にする）
//     bonus: { kinds, n }     … G.gearBonus の種類（trap・steal・talk・heal・fire・ice・bolt・curse・ward・k1:<戦技>）に n
//     chance: { stat?, when, n } … その状況（night 夜・town 町の中・wild 荒野）の判定すべてに n（stat を書けばその能力値だけ）
//     sanity: 倍率 … 正気が減るときの減り方（0.7 なら三割軽い。M13 の正気の段には触らない）
//     beast: 見込み … 獣の病が進むとき、その見込みで踏みとどまる
//     poison: 見込み … 毒に冒されたとき、その見込みで振り払う
//     armorAgi: 倍率 … 鎧の身のこなしの重さ（負の agi）を軽くする
//     dual: { dmg, hit } … 二刀（左手にも武器）のときの上乗せ
//     kiMax: n … 気力の最大に足す
//     rest: 割合 … 宿・野営で眠ったとき、最大 HP のこの割合だけ余分に戻る
//   learn：K1 と同じ（train・camp・teach・scroll）に加えて
//     fumble: { why } … check.re に合う判定で大失敗したとき、低い見込みで身につく（同じ種類で失敗を重ねるほど見込みが上がる）。why は覚えたわけの一文
//     suffer: { kind, why } … その目に遭ったとき（sanity 正気が削れた・poison 毒・beast 獣の病が進んだ）、同じように低い見込みで身につく
// 物語の文に数は書かない（hint は画面の案内なので書いてよい）。レーン C（K2）
(function (G) {
  const D = G.data;
  const P = (o) => Object.assign({ kind: "passive", style: null, ki: 0, need: {}, fx: {}, learn: {} }, o);
  const LOCK = /錠|鍵|閂|金庫|宝箱|解錠|こじ開け/;
  const TRAP = /罠|仕掛け|落とし穴|仕掛け糸/;
  const STEAL = /盗|掏|スリ|くすね|イカサマ|抜き取/;

  const LIST = {
    // ---------------------------------------------------------------- 心
    k2_steadymind: P({ name: "据わった肝", stat: "体力", need: { 体力: 10 }, hint: "正気の減りが三割軽い",
      fx: { sanity: 0.7 }, learn: { teach: ["sister"], scroll: true, suffer: { kind: "sanity", why: "見てはいけないものを見るのにも、手順がある。目を逸らす場所を、体が先に覚えた。" } } }),
    k2_coldhead: P({ name: "冷えた頭", stat: "知力", need: { 知力: 10 }, hint: "恐れ・怯え・踏みとどまる判定に +10%",
      fx: { check: { re: /恐|怯|震え|踏みとどま|耐え|こらえ|正気/, n: 10 } },
      learn: { train: { gold: 60, days: 2 }, scroll: true, fumble: { why: "足がすくんだ自分を、あとで思い出して腹が立った。次は、腹が立つほうが先に来る。" } } }),
    k2_badluck: P({ name: "悪運", stat: "体力", need: { 体力: 8 }, hint: "瀕死で踏みとどまる判定に +15%",
      fx: { check: { re: /瀕死で踏みとどまる/, n: 15 } }, learn: { scroll: true, suffer: { kind: "brink", why: "死にかけたのは、これで何度目か。死に損ねるのにも、癖がつく。" } } }),
    // ---------------------------------------------------------------- 手先
    k2_keyfeel: P({ name: "鍵穴の勘", stat: "敏捷", need: { 敏捷: 8 }, hint: "錠・鍵・宝箱の判定に +10%",
      fx: { check: { re: LOCK, n: 10 }, bonus: { kinds: ["k1:k1_lockpick"], n: 10 } },
      learn: { teach: ["fence"], scroll: true, fumble: { why: "しくじった錠の手応えが、指先に残っている。次は、どこで引っかかるか分かる。" } } }),
    k2_trapnose: P({ name: "罠の匂い", stat: "知力", need: { 知力: 8 }, hint: "罠と仕掛けの判定に +10%",
      fx: { check: { re: TRAP, n: 10 }, bonus: { kinds: ["trap", "k1:k1_trapsense"], n: 5 } },
      learn: { teach: ["hunter"], scroll: true, camp: true, fumble: { why: "罠にかかった足首が、まだ疼く。あの糸の張り方は、もう二度と見逃さない。" } } }),
    k2_lightfingers: P({ name: "掏摸の指", stat: "敏捷", need: { 敏捷: 10 }, hint: "盗み・スリ・イカサマの判定に +10%",
      fx: { check: { re: STEAL, n: 10 }, bonus: { kinds: ["steal"], n: 5 } },
      learn: { teach: ["fence", "comp:rogue"], scroll: true, fumble: { why: "手首をつかまれた痛みで、指の抜き方が分かった。つかまれる前に抜けばいい。" } } }),
    k2_firstaidhand: P({ name: "血止めの手", stat: "知力", need: { 知力: 8 }, hint: "手当て・看病の判定に +10%",
      fx: { check: { re: /手当|看病|止血|応急|治療|縛/, n: 10 } },
      learn: { teach: ["sister", "comp:heal"], scroll: true, fumble: { why: "巻き損ねた包帯から血が滲むのを、黙って見ていた。結び目の位置を、指が覚え直した。" } } }),
    k2_gambler: P({ name: "博打の目", stat: "知力", need: { 知力: 10 }, hint: "博打・賭けの判定に +10%",
      fx: { check: { re: /博打|賭|骰子|札/, n: 10 } },
      learn: { scroll: true, fumble: { why: "すった銀貨の数だけ、相手の指の癖が見えるようになった。高い授業料だった。" } } }),
    // ---------------------------------------------------------------- 体
    k2_poisonblood: P({ name: "毒慣れ", stat: "体力", need: { 体力: 10 }, hint: "毒に冒されても、半分の見込みで振り払う",
      fx: { poison: 0.5 }, learn: { teach: ["hunter"], scroll: true, suffer: { kind: "poison", why: "何度も毒を食らううちに、腹のほうが慣れた。吐き気が来る前に、体が勝手に追い出す。" } } }),
    k2_beastward: P({ name: "獣の病への抗い", stat: "体力", need: { 体力: 12 }, hint: "獣の病が進むとき、三分の一ほどの見込みで踏みとどまる",
      fx: { beast: 0.35 }, learn: { scroll: true, suffer: { kind: "beast", why: "疼きが来る夜の数え方を覚えた。数えているあいだは、まだ人でいられる。" } } }),
    k2_heavyarmor: P({ name: "重鎧慣れ", stat: "筋力", need: { 筋力: 12 }, hint: "鎧の重さで身のこなしが落ちるのを半分にする",
      fx: { armorAgi: 0.5 }, learn: { train: { gold: 80, days: 3, towns: ["garmund", "fort", "leavel", "w7_brenark", "w7_glatz"] }, teach: ["guardmaster"], scroll: true } }),
    k2_twohands: P({ name: "二刀の扱い", stat: "敏捷", need: { 敏捷: 14 }, hint: "左手にも武器を持つとき、威力 +1・命中 +5%",
      fx: { dual: { dmg: 1, hit: 5 } }, learn: { train: { gold: 120, days: 3, towns: ["w2_zalgros", "w7_glatz"] }, teach: ["kensei"], scroll: true } }),
    k2_deepbreath: P({ name: "息の長さ", stat: "体力", need: { 体力: 12 }, hint: "気力の最大 +1",
      fx: { kiMax: 1 }, learn: { train: { gold: 100, days: 3 }, camp: true, scroll: true } }),
    k2_sleeper: P({ name: "寝つきの良さ", stat: "体力", need: { 体力: 6 }, hint: "宿や野営で眠ると、HP が一割余分に戻る",
      fx: { rest: 0.1 }, learn: { camp: true, teach: ["comp:scout"], scroll: true } }),
    k2_runner: P({ name: "逃げ足", stat: "敏捷", need: { 敏捷: 8 }, hint: "戦闘から逃げる判定に +15%",
      fx: { check: { re: /^逃走$|逃げる/, n: 15 } },
      learn: { train: { gold: 40, days: 1 }, scroll: true, fumble: { why: "回り込まれて背中を斬られかけた。あの時、右へ跳べばよかった。次は右へ跳ぶ。" } } }),
    // ---------------------------------------------------------------- 戦いの目
    k2_glare: P({ name: "睨み", stat: "魅力", need: { 魅力: 10 }, hint: "威圧の判定に +10%",
      fx: { check: { re: /^威圧$/, n: 10 } },
      learn: { teach: ["veteran"], scroll: true, fumble: { why: "鼻で笑われた顔を、あとで水桶に映してみた。眉の寄せ方が、半端だった。" } } }),
    k2_vitaleye: P({ name: "急所の目", stat: "敏捷", need: { 敏捷: 12 }, hint: "急所を狙う判定に +10%",
      fx: { check: { re: /^急所狙い$/, n: 10 } },
      learn: { train: { gold: 70, days: 2 }, teach: ["fence"], scroll: true, fumble: { why: "外した切っ先の行き先を、何度も思い返した。急所は、思っていたより指一本ぶん内側にあった。" } } }),
    k2_spellhand: P({ name: "術の手癖", stat: "魔力", need: { 魔力: 12 }, hint: "炎・氷・雷・呪いの術に +5%",
      fx: { check: { re: /^(炎の魔法|氷の魔法|雷の魔法|呪いの言葉)$/, n: 5 } },
      learn: { teach: ["comp:magic"], scroll: true, fumble: { why: "暴れた術の熱が、手のひらにまだ残っている。どこで力を入れすぎたのか、火傷の形が教えてくれた。" } } }),
    k2_pious: P({ name: "祈り慣れ", stat: "魔力", need: { 魔力: 8 }, hint: "祈り・癒し・加護に +5%",
      fx: { check: { re: /祈/, n: 10 }, bonus: { kinds: ["heal", "ward"], n: 5 } },
      learn: { teach: ["sister"], scroll: true, fumble: { why: "届かなかった祈りの言葉を、一つずつ言い直してみた。どこで息を継ぐかで、届き方が違う。" } } }),
    // ---------------------------------------------------------------- 野と道
    k2_nighteye: P({ name: "夜目", stat: "知力", need: { 知力: 8 }, hint: "夜の判定すべてに +5%",
      fx: { chance: { when: "night", n: 5 } }, learn: { camp: true, teach: ["hunter", "comp:scout"], scroll: true } }),
    k2_wildfoot: P({ name: "荒野の足", stat: "体力", need: { 体力: 10 }, hint: "荒野での体力・敏捷の判定に +5%",
      fx: { chance: { when: "wild", stats: ["体力", "敏捷"], n: 5 } }, learn: { camp: true, teach: ["hunter"], scroll: true } }),
    k2_climbhand: P({ name: "岩登りの手", stat: "筋力", need: { 筋力: 8 }, hint: "登る・よじ登る判定に +10%",
      fx: { check: { re: /登|よじ|崖|岩壁|塀を越/, n: 10 } },
      learn: { camp: true, scroll: true, fumble: { why: "滑り落ちた岩肌の、手をかけてはいけない色を覚えた。苔の緑は、乾いて見えても濡れている。" } } }),
    k2_swimmer: P({ name: "泳ぎ達者", stat: "体力", need: { 体力: 8 }, hint: "泳ぐ・水に入る判定に +10%",
      fx: { check: { re: /泳|川を渡|溺|潜って|水に飛び込|岸まで/, n: 10 } },
      learn: { scroll: true, fumble: { why: "水を飲みながら、手足の動かし方を覚えた。覚えるには、だいぶ飲んだ。" } } }),
    k2_footprints: P({ name: "足跡読み", stat: "知力", need: { 知力: 8 }, hint: "足跡・痕跡を追う判定に +10%",
      fx: { check: { re: /足跡|痕跡|追跡|追う|手がかり/, n: 10 }, bonus: { kinds: ["k1:k1_track"], n: 5 } },
      learn: { teach: ["hunter", "comp:scout"], scroll: true, fumble: { why: "見失った足跡の消えた所に、もう一度立った。消えたのではなく、跳んでいた。" } } }),
    k2_shadowmelt: P({ name: "影に溶ける", stat: "敏捷", need: { 敏捷: 10 }, hint: "隠れる・忍び込む判定に +10%",
      fx: { check: { re: /隠れ|忍び|潜り込|息を殺|物陰|こっそり|気づかれ/, n: 10 }, bonus: { kinds: ["k1:k1_stealth"], n: 5 } },
      learn: { teach: ["fence", "comp:rogue"], scroll: true, fumble: { why: "見つかった時に鳴った床板の場所を、今も足の裏が覚えている。" } } }),
    k2_beastfriend: P({ name: "獣好き", stat: "魅力", need: { 魅力: 8 }, hint: "獣・馬・犬に関わる判定に +10%",
      fx: { check: { re: /獣|馬|犬|狼|猪|熊|山羊|牛/, n: 10 }, bonus: { kinds: ["k1:k1_beast"], n: 5 } },
      learn: { camp: true, teach: ["hunter"], scroll: true, fumble: { why: "噛まれた腕の歯形を見ながら考えた。あの犬は、怒っていたのではなく怖がっていた。" } } }),
    // ---------------------------------------------------------------- 人と町
    k2_haggler: P({ name: "値切り上手", stat: "魅力", need: { 魅力: 10 }, hint: "値切り・交渉・商いの判定に +10%",
      fx: { check: { re: /値切|交渉|商い|値を|仕入/, n: 10 }, bonus: { kinds: ["k1:k1_haggle"], n: 5 } },
      learn: { teach: ["comp:trade"], scroll: true, fumble: { why: "言い値の倍で買わされた夜、帳面に商人の言い回しを書き写した。次は、あの言い回しを使う側に回る。" } } }),
    k2_silvertongue: P({ name: "口八丁", stat: "魅力", need: { 魅力: 12 }, hint: "説得・言いくるめの判定に +10%、話術に +5%",
      fx: { check: { re: /説得|言いくるめ|ごまか|丸め込|口車|嘘/, n: 10 }, bonus: { kinds: ["talk"], n: 5 } },
      learn: { teach: ["bard", "fence"], scroll: true, fumble: { why: "言い訳が途中で詰まった。詰まった所から先を、寝床で三通り考えた。" } } }),
    k2_townface: P({ name: "人あしらい", stat: "魅力", need: { 魅力: 8 }, hint: "町の中での魅力の判定に +5%",
      fx: { chance: { when: "town", stats: ["魅力"], n: 5 } }, learn: { teach: ["veteran", "bard"], scroll: true } }),
    k2_reader: P({ name: "読み癖", stat: "知力", need: { 知力: 10 }, hint: "読む・書く・古い字の判定に +10%",
      fx: { check: { re: /読|字|碑|書き|記す|写/, n: 10 } },
      learn: { teach: ["archivist", "comp:magic"], scroll: true, fumble: { why: "読み違えた一行を、ほかの頁と突き合わせて読み直した。癖のある字の書き手は、たいてい同じ所を間違える。" } } }),
    k2_etiquette2: P({ name: "場慣れ", stat: "魅力", need: { 魅力: 10 }, hint: "貴族・王城・儀礼の場の判定に +10%",
      fx: { check: { re: /貴族|謁見|王|領主|作法|礼|晩餐|侍従/, n: 10 } },
      learn: { teach: ["guardmaster"], scroll: true, fumble: { why: "広間で笑われた所作を、宿の鏡の前で十回やり直した。十一回目は、笑えなかった。" } } }),
    k2_drinker: P({ name: "酒に強い", stat: "体力", need: { 体力: 8 }, hint: "飲み交わす・酒の判定に +10%",
      fx: { check: { re: /飲み|酒|杯/, n: 10 } },
      learn: { teach: ["veteran"], scroll: true, fumble: { why: "床で目を覚ました朝、酒の飲み方を一から考え直した。考えたのは、主に水の飲み方だった。" } } }),
  };
  Object.assign(D.SKILLS, LIST);
  const base = Object.keys(D.SKILLS).length - Object.keys(LIST).length;
  Object.keys(LIST).forEach((id, i) => { if (LIST[id].learn.scroll) D.K1_MAKE_SCROLL(id, base + i); });

  // 巻物の店（K1 の D.K1_SHOP に足す。エンジンが読み込みの最後に並べる）と、敵の落とし物
  const add = (tbl, k, v) => { tbl[k] = (tbl[k] || []).concat(v); };
  Object.entries({
    karna: ["k2_haggler", "k2_gambler"], nerva: ["k2_lightfingers", "k2_swimmer"], leavel: ["k2_etiquette2", "k2_steadymind"], garmund: ["k2_heavyarmor", "k2_glare"],
    fort: ["k2_heavyarmor", "k2_deepbreath"], zephara: ["k2_reader", "k2_spellhand"], yakumo: ["k2_vitaleye"], w1_holy: ["k2_pious", "k2_firstaidhand", "k2_steadymind"],
    w2_zalgros: ["k2_twohands", "k2_runner"], w2_nagris: ["k2_footprints", "k2_beastfriend", "k2_nighteye"], w3_lignoa: ["k2_wildfoot", "k2_climbhand"],
    w4_valmiria: ["k2_silvertongue", "k2_townface"], w7_glatz: ["k2_drinker", "k2_coldhead"], w7_melvi: ["k2_reader"], w7_frostgate: ["k2_sleeper", "k2_poisonblood"],
    w4_kaesverg: ["k2_keyfeel", "k2_trapnose"], w3_carmeland: ["k2_shadowmelt", "k2_badluck"], w3_frosleia: ["k2_beastward"],
  }).forEach(([loc, ids]) => add(D.K1_SHOP, loc, ids));
  Object.entries({
    bandit: [["k2_keyfeel", 0.03]], e4_relicthief: [["k2_trapnose", 0.05]], ninja: [["k2_shadowmelt", 0.05]], w3_smuggler: [["k2_lightfingers", 0.05]],
    deserter: [["k2_runner", 0.05]], blackknight: [["k2_heavyarmor", 0.05]], warlock: [["k2_spellhand", 0.05], ["k2_steadymind", 0.03]], e4_poacher: [["k2_footprints", 0.05]],
    w1_beastpriest: [["k2_beastward", 0.08]], m5_feverfolk: [["k2_beastward", 0.04]], e4_bogwitch: [["k2_poisonblood", 0.06]], e4k_bouncer: [["k2_drinker", 0.06], ["k2_glare", 0.05]],
    e4_islepirate: [["k2_swimmer", 0.06]], e4_penitent: [["k2_pious", 0.05]], e4_hillorc: [["k2_climbhand", 0.04]], m3_hunter: [["k2_vitaleye", 0.04], ["k2_wildfoot", 0.04]],
    e4_brokenknight: [["k2_etiquette2", 0.04]], e4k_drowned: [["k2_reader", 0.05]], e4_shadewalker: [["k2_nighteye", 0.06]], c2_zork: [["k2_twohands", 0.1]],
    w3_silentmonk: [["k2_coldhead", 0.05]], e4k_cliffwatch: [["k2_deepbreath", 0.05]], e4_lampghost: [["k2_sleeper", 0.05]], e4_candlewidow: [["k2_townface", 0.04]],
    e4k_smiler: [["k2_silvertongue", 0.05]], e4k_puppet: [["k2_badluck", 0.05]], e4k_greenwatch: [["k2_beastfriend", 0.05]], w3_drowned: [["k2_gambler", 0.04], ["k2_haggler", 0.04]],
  }).forEach(([eid, list]) => add(D.K1_DROPS, eid, list));

  // 失敗から覚えるときの見込み：はじめの見込み・同じ種類で失敗を重ねるごとに足す分・上限
  D.K2_FUMBLE = { base: 0.12, step: 0.08, max: 0.5 };
  D.K2_SUFFER = { base: 0.08, step: 0.05, max: 0.35 };
})(globalThis.G = globalThis.G || {});
