// C2：持ち主のスプレッドシート「キャラメモ」の人物（持ち主のオリジナル）。名前・人柄・経歴・口癖はシートのまま使う。
// シートの「※〜をモチーフ」は持ち主のメモなので、元の作品の名前・台詞・設定は持ち込まない。シートの体つきの書き込みや性的な一言はゲームには書かない。
// 出来事は src/data/events_c2.js、仕組み（仲間になる・誘う・ひとこと・恋のひとこと）は src/engine/zz_c2_people.js。
//
// D.C2_PEOPLE[id]：シートの一人ずつ
//   name 呼び名 / short 仲間になってからの短い呼び名（無ければ name）/ full シートの名前 / nation シートの国（レオネスト・ノルディア・エルメシア。D5 #105 が国名をそろえる）/ role 役どころ（GM と確認用）
//   sex / age / race（R1 の種族の鍵：human・elf・beast）/ beast 獣人の元の獣（D.BEASTS の鍵）/ who 人物の絵（art_people.js。seed を固定して、出来事と仲間で同じ顔）
//   仲間になる者だけ join：{ cls 肩書き, desc 加わったときの一言, power, dmg, heal, fire, trait 性格（D.M2_TRAITS の鍵）, bond 好感度の始まり,
//     home 誘える町（場所の id）, life 暮らし（M2）, t 技能の才（M8）, f 暮らしの才（M8）, noLove 恋の相手にしない }
// D.C2_VOICE[id]：仲間のひとこと（M2 の talk / betray / die を差し替える）と、恋のひとこと（M10 の spark / confess / propose / part / cold）
// レーン C（キャラクター）＋ V（出来事）＋ A（絵）の C2 #119 が管理
(function (G) {
  const D = (G.data = G.data || {});

  const P = (o) => o;
  D.C2_PEOPLE = {
    // ---------------------------------------------------------------- 仲間になる者
    dil: P({
      name: "ディル", full: "ディル", nation: "レオネスト", role: "港町の、天涯孤独で本好きの青年。腕っぷしは弱いが頭が回り、卑怯な手も平気で使う", sex: "男", age: 24, race: "human",
      who: { kind: "adventurer", sex: "男", age: 24, seed: "c2:dil", look: { hair: "#4a3020", hairStyle: "messy", eyes: "narrow", mouth: "smirk", brows: "raised", outfit: "vest", head: "none", gear: "daggers", chest: "none", cloth: "#4a4a3a", build: "slim", marks: [], bg: "#4a5a6a" } },
      join: {
        cls: "港町の若者", desc: "本と悪知恵", power: 38, dmg: 0, trait: "lazy", bond: 58, home: ["nerva"],
        life: { home: "港の裏通り", kin: "古本屋の爺さん", food: "港の揚げ魚", habit: "読みかけの本の頁の角を、指で折っては伸ばしている", secret: "学校には一日も行ってない。字も勘定も、捨てられた本で覚えた", keep: "表紙の取れた本" },
        t: { sword: 0, spear: 0, bow: 1, magic: 0, pray: 0, stealth: 2, talk: 1, lore: 2, wild: 1 }, f: { dice: 2, letters: 1 },
      },
    }),
    kaidel: P({
      name: "カイデル", full: "カイデル", nation: "レオネスト", role: "傷だらけで流れてきた凄腕の傭兵。古武道の使い手。お気楽で後先を考えず、迷ったら殴る。親を殺した敵を追っている", sex: "男", age: 30, race: "human",
      who: { kind: "adventurer", sex: "男", age: 30, seed: "c2:kaidel", look: { hair: "#2e2420", hairStyle: "spiky", eyes: "smile", mouth: "grin", brows: "raised", outfit: "leather", head: "headband", gear: "none", cloth: "#6a2a22", build: "broad", marks: ["scar", "bandage", "stubble"], bg: "#6a4a3a" } },
      join: {
        cls: "傭兵", desc: "拳ひとつ。後先は考えない", power: 62, dmg: 2, trait: "soft", bond: 56, home: ["nerva", "karna"],
        life: { home: "山あいの、潰れた道場", kin: "死んだ親父", food: "猪の鍋", habit: "拳の皮の厚いところを、もう片方の手で揉んでいる", secret: "親を殺した奴の顔を、まだ一度も見ていない。見れば分かる、と思っている", keep: "親父の帯" },
        t: { sword: 2, spear: 1, bow: 0, magic: 0, pray: 0, stealth: 0, talk: 0, lore: 1, wild: 2 }, f: { sleep: 2, drink: 1 },
      },
    }),
    nora: P({
      name: "ノラミ", short: "ノラ", full: "ノラミ", nation: "レオネスト", role: "森に住む獣人の娘。化け物に村を潰され、犯人を探している。とにかく明るい愛すべきあほで、勘が鋭い。ときどき沈む。弓が下手で狩りの落ちこぼれだったが、肉弾戦は抜群", sex: "女", age: 18, race: "beast", beast: "wolf",
      who: { kind: "archer", sex: "女", age: 18, seed: "c2:nora", look: { hair: "#9a6a3a", hairStyle: "wild", eyes: "round", mouth: "grin", brows: "raised", outfit: "leather", head: "none", gear: "none", cloth: "#5a4a2a", build: "normal", ears: "none", beast: "wolf", marks: ["dirt"], bg: "#4a6a3a" } },
      join: {
        cls: "森の獣人", desc: "ノラと呼んで、と言った", power: 56, dmg: 2, trait: "loyal", bond: 54, home: ["karna"],
        life: { home: "森の奥の、無くなった村", kin: "村の長老", food: "焼いた木の実", habit: "耳をぴくりと動かして、風上の匂いを嗅いでいる", secret: "あの日、村にいなかったのは、狩りの追試を受けていたから。追試には、まだ受かっていない", keep: "長老にもらった、引けない弓" },
        t: { sword: 1, spear: 2, bow: 0, magic: 0, pray: 0, stealth: 1, talk: 0, lore: 0, wild: 2 }, f: { nose: 2, beasts: 1 },
      },
    }),
    sheila: P({
      name: "シェイラ", full: "シェイラ・レオネスト", nation: "レオネスト", role: "王国の第七王子（いちばん下の姫）。田舎の城の主。本が好きで、使徒の伝承に詳しい。大人しそうに見えてお転婆。傭兵を雇って国の犯罪の芽を独自に調べている。「うん、」から話す", sex: "女", age: 18, race: "human",
      who: { kind: "noble", sex: "女", age: 18, seed: "c2:sheila", look: { hair: "#d8bc70", hairStyle: "long", eyes: "sleepy", mouth: "flat", brows: "calm", outfit: "cloak", head: "none", gear: "none", chest: "gem", cloth: "#3a4a6a", build: "slim", marks: [], bg: "#6a5a7a" } },
      join: {
        cls: "田舎の城の主", desc: "本を一冊、抱えている", power: 40, dmg: 0, heal: true, trait: "just", bond: 56, home: ["leavel"],
        life: { home: "王都の外れの、田舎の城", kin: "兄さまと姉さまたち", food: "城の厨房の焼き林檎", habit: "読みかけの本に指を一本はさんだまま、歩いている", secret: "城の書庫のいちばん奥の棚には、鍵がかかっている。中の本は、もう全部読んだ", keep: "書き込みだらけの古い本" },
        t: { sword: 0, spear: 0, bow: 0, magic: 1, pray: 2, stealth: 1, talk: 1, lore: 3, wild: 0 }, f: { letters: 2, faces: 1 },
      },
    }),
    rui: P({
      name: "ルイ", full: "ルイ（アールリュミナ＝エン＝ルヴェナール）", nation: "レオネスト", role: "遺跡で眠っていた、青い髪の無口な女の子。なぜか術が使え、怪力。記憶が無い。〔進〕使徒が生まれる前の古い王国ルヴェナールの王女で、封印されて眠っていた。王族を守る刻印のせいで怪力", sex: "女", age: 9, race: "human",
      who: { kind: "child", sex: "女", age: 9, seed: "c2:rui", look: { hair: "#3a5a9a", hairStyle: "bob", eyes: "narrow", mouth: "flat", brows: "calm", outfit: "robe", head: "none", gear: "none", chest: "none", cloth: "#d8d4e0", build: "slim", marks: [], bg: "#3a4a6a" } },
      join: {
        cls: "遺跡の子", desc: "ひとことも喋らない", power: 66, dmg: 3, fire: true, trait: "loyal", bond: 60, home: ["nerva"], noLove: true,
        life: { home: "遺跡の奥の、石の部屋", kin: "顔を思い出せない誰か", food: "はじめて食べた白パン", habit: "あなたの外套の端を、指でつまんでいる", secret: "眠る前のことを、ひとつも覚えていない。覚えていないことを、怖がってもいない", keep: "石の部屋にあった、名前の彫られた銀の札" },
        t: { sword: 1, spear: 2, bow: 0, magic: 3, pray: 0, stealth: 0, talk: 0, lore: 1, wild: 1 }, f: { calm: 3 },
      },
    }),
    zerina: P({
      name: "ゼリナ", full: "ゼリナ・バルダロッサ", nation: "レオネスト", role: "関西言葉の商人の娘。誰にも物怖じしない。金が大好きで、儲かるなら何でも売る。小さい子が大好き。ルイを気に入って一行に絡む。ディルとはよく喧嘩する", sex: "女", age: 23, race: "human",
      who: { kind: "merchant", sex: "女", age: 23, seed: "c2:zerina", look: { hair: "#9a3a22", hairStyle: "ponytail", eyes: "smile", mouth: "grin", brows: "raised", outfit: "vest", head: "kerchief", gear: "none", chest: "coins", cloth: "#6a2a2a", build: "normal", marks: ["freckles"], bg: "#8a7446" } },
      join: {
        cls: "商人", desc: "がめつい。けど、気前もいい", power: 34, dmg: 0, trait: "greedy", bond: 50, home: ["karna", "nerva"],
        life: { home: "自由都市の市場の裏", kin: "商いを仕込んだおかん", food: "砂糖をまぶした揚げ菓子", habit: "銅貨を一枚、指の背の上で転がしている", secret: "最初の商いで騙されて、全部なくした。騙した相手の顔は、帳面の最後の頁に描いてある", keep: "角の擦り切れた帳面" },
        t: { sword: 0, spear: 0, bow: 0, magic: 0, pray: 0, stealth: 1, talk: 2, lore: 1, wild: 1 }, f: { kids: 2, faces: 1, luck: 1 },
      },
    }),
    elnea: P({
      name: "エルネア", full: "エルネア・クラウセ", nation: "エルメシア", role: "ドランヘルツの鍛冶ギルド・精晶設備管理課の技師。エルフの娘。鉱石おたくで、鉱石の話になると早口で早歩き。エルフの目では不器量らしく、容姿に自信がない。おどおどして語尾に「〜っす」", sex: "女", age: 19, race: "elf",
      who: { kind: "villager", sex: "女", age: 19, seed: "c2:elnea", look: { hair: "#7a5230", hairStyle: "bob", eyes: "round", mouth: "open", brows: "worried", outfit: "apron", head: "none", gear: "none", chest: "keys", cloth: "#5a4a3a", build: "normal", ears: "pointy", marks: ["dirt", "blush"], bg: "#7a5a3a" } },
      join: {
        cls: "鍛冶ギルドの技師", desc: "鉱石の話になると早口になる", power: 36, dmg: 1, trait: "coward", bond: 55, home: ["w2_dranherz"],
        life: { home: "共和国の森の、エルフの里", kin: "里の母さん", food: "炉の灰で焼いた芋", habit: "拾った石を光にかざして、口の中で何か数えている", secret: "里では、鏡を見るなと言われて育った。わけは、言われなかった", keep: "布に包んだ、透きとおった精晶のかけら" },
        t: { sword: 0, spear: 1, bow: 0, magic: 1, pray: 0, stealth: 0, talk: 0, lore: 2, wild: 1 }, f: { carve: 1, nose: 1 },
      },
    }),
    natalia: P({
      name: "ナタリア", full: "ナタリア＝アストレア", nation: "レオネスト", role: "王国十指の一人。黒髪三つ編みの格闘家。古武術の正統後継者。酒癖が悪いくせに酒が大好き。実力は本物", sex: "女", age: 24, race: "human",
      who: { kind: "adventurer", sex: "女", age: 24, seed: "c2:natalia", look: { hair: "#1c1a1e", hairStyle: "ponytail", eyes: "sleepy", mouth: "grin", brows: "raised", outfit: "kimono", head: "none", gear: "none", chest: "none", cloth: "#2a3a4a", build: "normal", marks: ["blush"], bg: "#5a4a3a" } },
      join: {
        cls: "拳法家", desc: "王国十指の一人。酒くさい", power: 68, dmg: 3, trait: "drunk", bond: 50, home: ["leavel"],
        life: { home: "王都の古い道場", kin: "道場を継がせた師匠", food: "塩のきつい干し肉", habit: "朝いちばんに、誰もいない方へ向かって型をひとつ打っている", secret: "十指に選ばれた日のことを、覚えていない。前の晩に飲みすぎたから", keep: "師匠の、擦り切れた手甲" },
        t: { sword: 2, spear: 1, bow: 0, magic: 0, pray: 0, stealth: 1, talk: 0, lore: 0, wild: 2 }, f: { dance: 1 },
      },
    }),

    // ---------------------------------------------------------------- 名のある人物（王国）
    valeon: P({ name: "ヴァレオン", full: "ヴァレオン・レオネスト", nation: "レオネスト", role: "レオネスト王国の国王。灰銀の髪と髭、鋼の体、燃える琥珀の目。五十八。筋金入りの好戦家で、使徒の気配があれば現場へ向かおうとし、側近が毎日止める。地方は子どもたちに任せ、最近ますます若返った。兄弟を使徒ゴルヴァンに殺され、自分の手で討つのが目標。使徒を討った者に興味を持つ", sex: "男", age: 58, race: "human",
      who: { kind: "noble", sex: "男", age: 58, seed: "c2:valeon", look: { hair: "#b8b8bc", hairStyle: "wild", eyes: "sharp", iris: "#c8902a", mouth: "grin", brows: "angry", outfit: "plate", head: "crown", gear: "greatsword", chest: "crest", cloth: "#5a1a1a", build: "broad", marks: ["beard", "scar"], bg: "#8a6a3a" } } }),
    raios: P({ name: "ライオス", full: "ライオス・レオネスト", nation: "レオネスト", role: "第一王子。三十二。濃い金髪を後ろで束ね、穏やかな青い目。大柄。誠実で包容力があり、武も知も人柄もそろった王位継承の筆頭。努力家で慢心がない。よく高笑いする。弟妹が大好き", sex: "男", age: 32, race: "human",
      who: { kind: "knight", sex: "男", age: 32, seed: "c2:raios", look: { hair: "#c8a040", hairStyle: "ponytail", eyes: "smile", iris: "#2a4a6a", mouth: "grin", brows: "raised", outfit: "plate", head: "none", gear: "greatsword", chest: "crest", cloth: "#2a4a9a", build: "broad", marks: [], bg: "#4a6a8a" } } }),
    serios: P({ name: "セリオス", full: "セリオス・レオネスト", nation: "レオネスト", role: "第二王子。三十。銀髪で端整な天才肌。芸術家気質で浮世離れしている。抽象的な物言いだが実績で一目置かれる。鍛冶の都ドランヘルツを治める。妹に過保護", sex: "男", age: 30, race: "human",
      who: { kind: "noble", sex: "男", age: 30, seed: "c2:serios", look: { hair: "#c8ccd4", hairStyle: "long", eyes: "sleepy", mouth: "flat", brows: "calm", outfit: "coat", head: "none", gear: "none", chest: "gem", cloth: "#3a3a4a", build: "slim", marks: ["dirt"], bg: "#5a5a6a" } } }),
    farina: P({ name: "ファリナ", full: "ファリナ・レオネスト", nation: "レオネスト", role: "第三王子（女）。二十八。長い黒髪を低めのポニーテールに、眼鏡と冷たい目。冷静・理性的・完璧主義。笑顔はめったに見せないが破壊力がある。優秀な政策家。妹が絡むと豹変する", sex: "女", age: 28, race: "human",
      who: { kind: "noble", sex: "女", age: 28, seed: "c2:farina", look: { hair: "#1c1a1e", hairStyle: "ponytail", eyes: "narrow", mouth: "flat", brows: "calm", outfit: "noble", head: "none", gear: "none", chest: "chain", cloth: "#1a3a5a", build: "slim", marks: ["glasses"], bg: "#4a4a5a" } } }),
    greol: P({ name: "グレオル", full: "グレオル・レオネスト", nation: "レオネスト", role: "第四王子。二十七。短い茶髪、頬の傷、くすんだ鎧。浅黒い。騎士の鑑のような武人で、生真面目で不器用だがまっすぐ。口下手。民や軍に慕われる。剣は王国でも指折り", sex: "男", age: 27, race: "human",
      who: { kind: "knight", sex: "男", age: 27, seed: "c2:greol", look: { hair: "#6a4a2a", hairStyle: "short", skin: "#b07a52", eyes: "normal", mouth: "frown", brows: "angry", outfit: "armor", head: "none", gear: "sword", chest: "none", cloth: "#4a4a40", build: "broad", marks: ["scar"], bg: "#5a5048" } } }),
    neilas: P({ name: "ネイラス", full: "ネイラス・レオネスト", nation: "レオネスト", role: "第五王子。二十四。ぼさぼさの黒髪にいつも研究衣。儚く中性的。寡黙で繊細な引きこもり。人と話すのが壊滅的に苦手で、きょうだいとだけ自然に話せる。古代文明の研究に貢献している。妹を愛している", sex: "男", age: 24, race: "human",
      who: { kind: "mage", sex: "男", age: 24, seed: "c2:neilas", look: { hair: "#1c1a1e", hairStyle: "messy", eyes: "sleepy", mouth: "flat", brows: "worried", outfit: "robe", head: "none", gear: "none", chest: "none", cloth: "#d8d4c8", build: "slim", marks: ["bags"], bg: "#4a4a5a" } } }),
    tiria: P({ name: "ティリア", full: "ティリア・レオネスト", nation: "レオネスト", role: "第六王子（女）。二十三。栗色の柔らかい髪を三つ編みに。いつもにこやかで、現場主義。ときどき天然。誰にでも分け隔てなく接する愛され姫。麦の都グランベールを治める。妹を溺愛し、妹に何かあると息が乱れる", sex: "女", age: 23, race: "human",
      who: { kind: "noble", sex: "女", age: 23, seed: "c2:tiria", look: { hair: "#7a5230", hairStyle: "ponytail", eyes: "smile", mouth: "smile", brows: "raised", outfit: "apron", head: "kerchief", gear: "none", chest: "none", cloth: "#6a7a4a", build: "normal", marks: ["dirt", "freckles"], bg: "#8a9a5a" } } }),
    sixth: P({ name: "第六騎士団の団長", full: "王国騎士団隊長（名はシートに無い）", nation: "レオネスト", role: "第六騎士団の団長。三十三。寡黙で何を考えているか分からないが、王国最強と言われる剣。第六王子ティリアの城に配属されている。何でも自分一人で片付けてしまうので、指揮は苦手", sex: "男", age: 33, race: "human",
      who: { kind: "knight", sex: "男", age: 33, seed: "c2:sixth", look: { hair: "#2a2a2a", hairStyle: "slick", eyes: "narrow", mouth: "flat", brows: "calm", outfit: "plate", head: "none", gear: "sword", chest: "crest", cloth: "#2a2a3a", build: "slim", marks: [], bg: "#3a3a4a" } } }),
    angelica: P({ name: "アンジェリカ", full: "アンジェリカ", nation: "レオネスト", role: "王国軍の女隊長。三十一。基地に忍び込んだ者を追って、事あるごとに一行に絡む。実力者で敵だが、ところどころ抜けていて人がいい。おばさんと言われると怒る。銃の名手（銃はオーパーツ）。学校の成績は一番だった。離島の故郷で祖母と二人暮らし", sex: "女", age: 31, race: "human",
      who: { kind: "soldier", sex: "女", age: 31, seed: "c2:angelica", look: { hair: "#b89a58", hairStyle: "bun", eyes: "sharp", mouth: "open", brows: "angry", outfit: "armor", head: "cap", gear: "none", chest: "crest", cloth: "#3e5a8a", build: "normal", marks: [], bg: "#5a6478" } } }),
    captain: P({ name: "寡黙な隊長", full: "軍の隊長（名はシートに無い）", nation: "レオネスト", role: "アンジェリカと組む王国軍の隊長。二十八。寡黙で任務に忠実、部下に慕われる。アンジェリカとは凸凹だが仲がいい。国のために尽くしてきたが、研究所で本当のことを知り、一行を逃がし、実験体として化け物にされる", sex: "男", age: 28, race: "human",
      who: { kind: "soldier", sex: "男", age: 28, seed: "c2:captain", look: { hair: "#3a2a1c", hairStyle: "short", eyes: "normal", mouth: "flat", brows: "calm", outfit: "armor", head: "none", gear: "spear", chest: "crest", cloth: "#3e5a8a", build: "broad", marks: ["stubble"], bg: "#5a6478" } } }),
    doctor: P({ name: "博士", full: "博士（名はシートに無い）", nation: "レオネスト", role: "王国に雇われた学者。使徒の力を研究している。知識欲がすさまじく、結果のためには倫理を気にせず非道な実験をする。今ではなく数十年先の人間のために研究している、らしい", sex: "男", age: 61, race: "human",
      who: { kind: "mage", sex: "男", age: 61, seed: "c2:doctor", look: { hair: "#e2ded6", hairStyle: "receding", eyes: "round", mouth: "smile", brows: "raised", outfit: "robe", head: "none", gear: "none", chest: "keys", cloth: "#e8e4dc", build: "slim", marks: ["monocle", "wrinkles"], bg: "#4a5a5a" } } }),
    hermes: P({ name: "ヘル爺", full: "ヘルメス・ヴァンドール", nation: "レオネスト", role: "使徒研究に没頭する考古学者。六十二。通称ヘル爺。古代都市や遺跡を調べるのが生きがい。年の割にとても元気。元・王国大学考古学部長で、今は後任に譲って趣味で調べている変わり者。王やネイラス王子とも知り合い", sex: "男", age: 62, race: "human",
      who: { kind: "elder", sex: "男", age: 62, seed: "c2:hermes", look: { hair: "#e2ded6", hairStyle: "wild", eyes: "round", mouth: "grin", brows: "raised", outfit: "coat", head: "hat", gear: "none", chest: "keys", cloth: "#6a5a3a", build: "slim", marks: ["beard", "wrinkles", "dirt"], bg: "#7a6a4a" } } }),
    yurina: P({ name: "ユリナ", full: "ユリナ・クラヴィス", nation: "レオネスト", role: "王国剣士団・直轄特殊部隊（第二王子付き）。二十七。赤いショートヘアに糸目、飄々とした笑み。物腰は柔らかいが戦うときは冷徹。王国十指に入る。第二王子の密命で炭鉱の秘密を探る。炭鉱で錆鎧（ゼブラン）の分かれ身を迎え撃って死ぬ", sex: "女", age: 27, race: "human",
      who: { kind: "adventurer", sex: "女", age: 27, seed: "c2:yurina", look: { hair: "#9a3a22", hairStyle: "bob", eyes: "smile", mouth: "smirk", brows: "calm", outfit: "leather", head: "none", gear: "sword", chest: "none", cloth: "#2a2a3a", build: "slim", marks: [], bg: "#4a3a3a" } } }),
    ferida: P({ name: "フェリダ", full: "フェリダ＝シュテラ", nation: "レオネスト", role: "王国十指の一人。二十六。槍騎兵団。《雷突の乙女》。高速の突進と精密な槍さばきで名を上げた、王国一の槍使い", sex: "女", age: 26, race: "human",
      who: { kind: "knight", sex: "女", age: 26, seed: "c2:ferida", look: { hair: "#d8bc70", hairStyle: "ponytail", eyes: "sharp", mouth: "smirk", brows: "raised", outfit: "plate", head: "none", gear: "spear", chest: "crest", cloth: "#e0dcd0", build: "slim", marks: [], bg: "#6a7a9a" } } }),
    sig: P({ name: "シグ", full: "シグ＝ドラガン", nation: "レオネスト", role: "王国十指の一人。三十八。重装戦斧兵団の隊長。《戦場の鉄塊》。人間離れした力と耐久で正面突破する、王国最強の盾", sex: "男", age: 38, race: "human",
      who: { kind: "soldier", sex: "男", age: 38, seed: "c2:sig", look: { hair: "#4a3020", hairStyle: "bald", eyes: "normal", mouth: "flat", brows: "angry", outfit: "plate", head: "none", gear: "greatsword", chest: "none", cloth: "#3a3a3a", build: "broad", marks: ["beard", "scar"], bg: "#5a5048" } } }),
    raisha: P({ name: "ライーシャ", full: "ライーシャ＝クローデル", nation: "レオネスト", role: "王国十指の一人。二十八。目つきが悪く、いつも気だるそうな天才剣士。静かに淡々と斬る", sex: "女", age: 28, race: "human",
      who: { kind: "adventurer", sex: "女", age: 28, seed: "c2:raisha", look: { hair: "#4a4a5a", hairStyle: "long", eyes: "sleepy", mouth: "flat", brows: "angry", outfit: "cloak", head: "none", gear: "sword", chest: "none", cloth: "#2a2a2a", build: "slim", marks: ["bags"], bg: "#3a3a44" } } }),
    zork: P({ name: "ゾルク", full: "ゾルク＝ブライアン", nation: "レオネスト", role: "王国十指の一人。四十三。無所属の賞金稼ぎ。《首狩りゾルク》。王国非公認だが実力は本物で、実績により渋々十指に認められた", sex: "男", age: 43, race: "human",
      who: { kind: "rogue", sex: "男", age: 43, seed: "c2:zork", look: { hair: "#5a5a58", hairStyle: "receding", eyes: "sharp", mouth: "smirk", brows: "angry", outfit: "coat", head: "hat", gear: "sword", chest: "chain", cloth: "#2a2420", build: "broad", marks: ["stubble", "scar", "eyepatch"], bg: "#4a3a2a" } } }),
    bride: P({ name: "大槌の姉さん", full: "（名はシートに無い）めちゃくちゃ強い、婚期を逃したお姉さん", nation: "", role: "めちゃくちゃ強い。婚期を逃したお姉さん", sex: "女", age: 34, race: "human",
      who: { kind: "adventurer", sex: "女", age: 34, seed: "c2:bride", look: { hair: "#c8a040", hairStyle: "bun", eyes: "smile", mouth: "grin", brows: "raised", outfit: "armor", head: "none", gear: "mace", chest: "none", cloth: "#6a3a5a", build: "broad", marks: ["blush"], bg: "#6a4a5a" } } }),
    boku: P({ name: "「ボク」の娘", full: "（名はシートに無い）ボーイッシュな、自分をボクと呼ぶおたくの娘", nation: "", role: "ボーイッシュで、自分をボクと呼ぶ。おたく", sex: "女", age: 17, race: "human",
      who: { kind: "mage", sex: "女", age: 17, seed: "c2:boku", look: { hair: "#4a3a2a", hairStyle: "bob", eyes: "round", mouth: "open", brows: "raised", outfit: "coat", head: "cap", gear: "none", chest: "none", cloth: "#3a5a4a", build: "slim", marks: ["glasses"], bg: "#3a5a5a" } } }),

    // ---------------------------------------------------------------- 名のある人物（帝国・共和国）
    greiol: P({ name: "グレイオル", full: "グレイオル・ノルディア", nation: "ノルディア", role: "ノルディア帝国の皇帝。四十二。漆黒の半軍装に白銀の毛皮の外套、常に剣を帯びる。百九十二の長身。寡黙で冷徹な現実主義者。判断が早く妥協しない。自ら戦場に立ち、体じゅうに傷。強者を尊び、弱者にも役割を与えて国を保つ。カリスマがある", sex: "男", age: 42, race: "human",
      who: { kind: "noble", sex: "男", age: 42, seed: "c2:greiol", look: { hair: "#1c1a1e", hairStyle: "slick", eyes: "sharp", mouth: "flat", brows: "angry", outfit: "coat", head: "none", gear: "sword", chest: "chain", cloth: "#14141a", build: "broad", marks: ["scar"], bg: "#3a3a44" } } }),
    dario: P({ name: "ダリオ", full: "ダリオ・フロストヘルム", nation: "ノルディア", role: "帝国四騎士の一人。帝都防衛軍総帥・北部使徒防衛線司令。五十九。巨漢の老騎士で、顔の半分が義眼と鋼の仮面。不動・実直・規律第一。民からは《氷壁の父》。負けない戦を徹底する。皇帝の少年時代の教育係", sex: "男", age: 59, race: "human",
      who: { kind: "knight", sex: "男", age: 59, seed: "c2:dario", look: { hair: "#e2ded6", hairStyle: "short", eyes: "normal", mouth: "frown", brows: "angry", outfit: "plate", head: "none", gear: "greatsword", chest: "crest", cloth: "#e0dcd0", build: "broad", marks: ["eyepatch", "wrinkles", "beard"], bg: "#5a6a7a" } } }),
    erna: P({ name: "エルナ", full: "エルナ・イゼルハウト", nation: "ノルディア", role: "帝国四騎士の一人。機動部隊を運用する。三十八。赤い短髪に軍帽、無表情、抑揚のない声。命令を「タスク」として処理する冷血と言われる。皇帝に忠誠。使徒に片足を奪われ、義足を武器にしている", sex: "女", age: 38, race: "human",
      who: { kind: "soldier", sex: "女", age: 38, seed: "c2:erna", look: { hair: "#9a3a22", hairStyle: "short", eyes: "narrow", mouth: "flat", brows: "calm", outfit: "coat", head: "cap", gear: "none", chest: "crest", cloth: "#2a2a2a", build: "slim", marks: [], bg: "#4a4a4a" } } }),
    valg: P({ name: "ヴァルグ", full: "ヴァルグ・ヴェルグリム", nation: "ノルディア", role: "帝国四騎士の一人。機動斥候・辺境対応。狼の獣人。三十三。元は辺境の野盗団の首領で、皇帝に一騎打ちで負けて心から従った。鼻と耳で地形・敵・罠を見分け、剣も超一流。荒々しいが頭がよく、軍略も使う。皇帝の右腕", sex: "男", age: 33, race: "beast", beast: "wolf",
      who: { kind: "soldier", sex: "男", age: 33, seed: "c2:valg", look: { hair: "#5a5a58", hairStyle: "wild", eyes: "sharp", iris: "#c8a040", mouth: "grin", brows: "angry", outfit: "leather", head: "none", gear: "sword", chest: "none", cloth: "#3a3a3a", build: "broad", ears: "none", beast: "wolf", marks: ["scar", "stubble"], bg: "#4a5a5a" } } }),
    malvina: P({ name: "マルヴィナ", full: "マルヴィナ・クレイモア", nation: "ノルディア", role: "帝国四騎士の一人。使徒対策の専門家。金髪に黒衣の女軍師、年は分からない（二十代後半に見える）。顔の下半分を黒い布で覆い、左目がいつも仄かに光る。使徒ラウゼアの災いで潰れた辺境の村のただ一人の生き残り。使徒由来の武具の部隊を率いる。皇帝に命を救われたことを密かに覚えている", sex: "女", age: 28, race: "human",
      who: { kind: "mage", sex: "女", age: 28, seed: "c2:malvina", look: { hair: "#dcbc62", hairStyle: "long", eyes: "glow", iris: "#7affd8", mouth: "flat", brows: "calm", outfit: "cloak", head: "none", gear: "staff", chest: "none", cloth: "#14141a", build: "slim", marks: ["bandage"], bg: "#2a2a3a" } } }),
    katia: P({ name: "カティア", full: "カティア・ノルディア", nation: "ノルディア", role: "皇帝の一人娘。十九。金髪碧眼。正義感が強く真面目でまっすぐな努力家。剣も一通り修めた。平民にも丁寧で、軍で慕われる。四騎士を押し切る胆力があるが、恋やおしゃれには疎い。父の冷たい判断に疑問を抱きつつ、尊敬と忠誠のあいだで揺れる", sex: "女", age: 19, race: "human",
      who: { kind: "knight", sex: "女", age: 19, seed: "c2:katia", look: { hair: "#dcbc62", hairStyle: "ponytail", eyes: "round", iris: "#2a4a6a", mouth: "flat", brows: "angry", outfit: "plate", head: "none", gear: "sword", chest: "crest", cloth: "#e0dcd0", build: "slim", marks: [], bg: "#5a6a7a" } } }),
    alicia: P({ name: "アリシア", full: "アリシア・セレイン＝ロスティア", nation: "エルメシア", role: "エルメシア共和国の最高議長。ハイエルフの女。見た目は二十代前半、三百歳を超える。人を射抜く目。冷静沈着で高圧的、すべてに女王のような圧がある。精霊契約の都レヴァンデルの生まれで、術も剣も一流。世界樹の根源に一度だけ触れたと言われる", sex: "女", age: 22, race: "elf",
      who: { kind: "noble", sex: "女", age: 22, seed: "c2:alicia", look: { hair: "#dcbc62", hairStyle: "long", eyes: "sharp", iris: "#3a8aca", mouth: "flat", brows: "calm", outfit: "noble", head: "circlet", gear: "sword", chest: "gem", cloth: "#e8e4ec", build: "slim", ears: "pointy", marks: [], bg: "#3a5a4a" } } }),
  };

  // ---------------------------------------------------------------- 仲間のひとこと（M2 の性格の文を、その人の言葉に差し替える）
  // 文の中の {home} {kin} {food} {keep} は、その人の暮らしに置き換わる。シェイラは「うん、」から話す。ゼリナは関西言葉。エルネアは「〜っす」。ルイはほとんど話さない
  D.C2_VOICE = {
    dil: {
      talk: [
        "まともにやって勝てない相手とは、まともにやらない。それだけの話だよ",
        "この本？ 船の積み荷の目録。面白いぞ。誰が何を隠して運んでるか、全部書いてある",
        "正義ってのは、腹がふくれてる奴の言葉だろ。……ふくれたら、考えてもいい",
        "{kin}がな、店じまいのときに売れ残りを一冊くれたんだ。毎晩一冊。それで字を覚えた",
      ],
      betray: "……悪い。こういうの、向いてないんだ。最初から分かってたけどな",
      die: "……ずるい手、まだ、三つ……残ってたのに……",
      spark: "……今、見てたの、気づいた？ 気づいてないことにしてくれ",
      confess: "計算すると、言わないほうが得なんだ。……なのに言う。好きだ。どうかしてるな、俺",
      propose: "一緒に住もう。本棚は半分ずつな。……いや、七三で。俺が七",
      part: "俺といても、得はない。……それくらい、計算しなくても分かる",
      cold: "飯、置いといた。……この頁を読み終わったら、食う",
    },
    kaidel: {
      talk: [
        "迷ったら殴る。殴ってから考える。考えてるうちに殴られるよりいいだろ",
        "家？ ああ、ちょっと壊した。ちょっとだよ。柱は三本残ってた",
        "仇の手がかり？ あるにはある。……七年前のだけどな",
        "{kin}の口癖でな、腹が減ったら負けだ、って。だから食う。お前の分も食う",
      ],
      betray: "仇の噂を聞いた。……悪い、行かなきゃならねえ。壊したもんの払いは、ツケといてくれ",
      die: "はは……殴り損ねた……まあ、いいや……あとは、頼む",
      spark: "なあ、さっきからお前のことばっか見てる気がする。……気のせいか？ 気のせいじゃねえな",
      confess: "回りくどいのは苦手だ。好きだ。……こういうの、慣れてねえんだよ。笑うな",
      propose: "仇を討ったら、とか言ってたら一生言えねえ。今言う。一緒になってくれ",
      part: "俺、たぶんお前の家も壊す。……壊す前に、出てく",
      cold: "腹減った。……いや、自分で作る。作れねえけど",
    },
    nora: {
      talk: [
        "ノラって呼んで！ ノラミって呼ぶの、怒ってるときの長老だけだったから",
        "弓？ 当たらないよ！ 三十本射て、一本も当たらなかった。木には当たった。後ろの木",
        "……ねえ。村、もう無いんだよ。……あ、ごめん、今の無し！ ごはんにしよ！",
        "あんたの匂い、覚えたよ。どこにいても、たぶん分かる。……たぶんね",
      ],
      betray: "あいつの匂いがした。村の、あの日の匂い。……ごめん、ひとりで行く",
      die: "えへへ……追試、また……落ちちゃった……",
      spark: "なんかね、あんたの匂い、好き。……あっ、変な意味じゃないよ！ たぶん！",
      confess: "あたし、頭よくないから、うまく言えない。好き。それだけ。……それだけじゃ、だめ？",
      propose: "ずっと一緒がいい。村みたいに、無くならない場所がいい。……あんたがいい",
      part: "あたし、またひとりになるんだね。……知ってた。なんとなく",
      cold: "……ねえ。最近、あたしの話、聞いてる？ ……聞いてないよね",
    },
    sheila: {
      talk: [
        "うん、この道、本で読んだのと同じ。橋が一本、足りないけど。……じろり",
        "うん、兄さまたちには内緒。言うと、六人そろって迎えに来るから。六人は、多い",
        "うん、本にはね、七十二って書いてあるの。誰が数えたのかは、書いてない。うむり",
        "うん、{food}が食べたい。城の厨房のおばさんの。……言っただけ。帰らないよ",
      ],
      betray: "うん、城に帰らなきゃ。調べてたことが、ひとつ、つながったの。……ありがとう",
      die: "うん……まだ、読んでない本が……あった、のに……",
      spark: "うん、あなたの横顔、本の挿し絵に似てる。……どの本かは、言わない。じろり",
      confess: "うん、好き。……本には、もっと上手な言い方が書いてあったんだけど。全部、忘れた",
      propose: "うん、一緒になって。兄さまたちには、わたしから言う。六人分、ちゃんと",
      part: "うん、わかった。……わかったって言ったの。二回言わせないで",
      cold: "うん、ご飯はあっち。……本、読んでるから",
    },
    rui: {
      talk: [
        "……ルイ。……なまえ。ルイ",
        "……（あなたの袖を引いた。指の先に、花が一本咲いている。それだけだった）",
        "……あったかい。……これ、なに。……パン。……パン",
        "……（遠くの山の形を、指でなぞっている。何度も、同じ形を）",
      ],
      betray: "……かえる。……ねむる、ところ",
      die: "……また……ねむる、だけ……",
    },
    zerina: {
      talk: [
        "儲かるもんは何でも売る。売れへんもんは、売れるまで言い方を変える。それが商いや",
        "金は嘘つかへん。嘘つくのは、金を持っとる人間のほうや",
        "見て、この帽子。ちっちゃい子にかぶせたら絶対かわいいねん。……あんたには売らへんで",
        "{kin}がな、値切られたら倍の顔で笑え、言うててん。笑うと、なんでか売れるんや",
      ],
      betray: "ちょっと借りてくで。利子つけて返す。……返せたらな",
      die: "あかん……帳面……つけといて……今日の、儲け……",
      spark: "あんたといると、損得の勘定がずれるねん。……どないしてくれんの",
      confess: "あんたのこと、好きや。……値札がつけられへんもん、はじめて見つけてしもた",
      propose: "財布、ひとつにせえへん？ ……あんたの借金ごと、引き取ったるわ",
      part: "割に合わへん。……ほんまは、合わへんのはうちのほうかもしれんけどな",
      cold: "今月の勘定、あんたの分も払うといた。……帳面には、つけとくで",
    },
    elnea: {
      talk: [
        "この石、見てくださいっす！ 光にかざすと、中で筋が三本、ほら……あっ、すいません、また早口っす",
        "里の人たちは、わたしを見ると目を逸らすっす。……人の町の人は、逸らさないっす。不思議っす",
        "精晶は嘘つかないっす。叩けば叩いたぶんの音がするっす。……人も、そうだったらいいっすね",
        "{kin}には、手紙を出してないっす。出しても、たぶん、返事は来ないっす",
      ],
      betray: "ご、ごめんなさいっす……ギルドの偉い人たちが、どうしても、って……",
      die: "まだ……見てない石が……いっぱい……あるっす……",
      spark: "あ、あの、今、目、合ったっすよね。……合ってないっすね。すいません",
      confess: "わ、わたしなんかが言うのは変っすけど……好きっす。……返事はゆっくりでいいっす。十年くらい",
      propose: "い、一緒になってほしいっす！ 指輪の石は、わたしが削るっす。いちばんいい石で",
      part: "……やっぱり、わたしじゃ、だめだったっすね。知ってたっす",
      cold: "炉の火、見てくるっす。……ずっと、見てるっす",
    },
    natalia: {
      talk: [
        "一杯だけ。一杯だけだから。……さっきのは数に入れないで",
        "型は嘘をつかない。嘘をつくのは、酔ったあたしの口だけ",
        "十指？ 席が十あって、あたしが座ってる。それだけよ。……一つ、空いてるけど",
        "{kin}がね、拳は酒で鈍る、って言ってた。じいさま、酒の席でそう言ってたの",
      ],
      betray: "財布、借りた。酒場の付けが、ちょっと、溜まってて……ちょっとよ",
      die: "あと……一杯……だけ……",
      spark: "あんた、素面のあたしを見たことある？ ……ないか。今のが、そう",
      confess: "素面で言うから、ちゃんと聞いて。……好き。……今のうちに返事して。酔う前に",
      propose: "一緒になろ。式のお酒は、あたし飲まない。……一杯しか",
      part: "飲んでも忘れられないのは、はじめて。……だから、やめとく",
      cold: "……今夜は、外で飲んでくる",
    },
  };

  // ---------------------------------------------------------------- 敵（出会いや続き物で戦う相手）
  Object.assign(D.ENEMIES, {
    c2_nora: {
      name: "獣人の娘", tier: 1, hp: 18, dmg: [1, 4, 1], hit: 55, def: 4, agi: 70, will: 60, mres: 0, gold: [0, 0], shape: "humanoid", eye: "#e8b24a",
      desc: "森の色の外套の娘。耳が逆立っている。弓を背負っているが、一度も構えない。拳で来る。",
      look: { body: "biped", build: "normal", skin: "#d8a878", head: "human", hair: "#9a6a3a", eyes: "glow", mouth: "fangs", weapon: "none", outfit: "rags", cloth: "#5a4a2a", extra: ["fur", "wildhair"], mood: "fierce" },
      lines: {
        open: ["「見つけた！ 村の、みんなの……！ 返せ！」"],
        turn: ["娘の拳が、あなたの盾の縁をへこませた。", "娘は一度だけ鼻をひくつかせ、首をかしげた。それから、また殴りかかってきた。", "「なんで……なんで、逃げないの……」"],
      },
    },
    c2_angelica: {
      name: "女隊長アンジェリカ", tier: 3, hp: 34, dmg: [2, 6, 2], hit: 70, def: 12, agi: 55, will: 70, mres: 5, gold: [10, 30], fleeAt: 0.45, shape: "humanoid", eye: "#d9d9d9",
      desc: "王国軍の女隊長。細長い筒を構えている。遺跡から出た、火を噴く筒だ。狙いは正確。足元は、ときどき不正確。",
      look: { body: "biped", build: "normal", skin: "#e8c4a0", head: "human", hair: "#b89a58", eyes: "dot", mouth: "frown", weapon: "staff", outfit: "armor", cloth: "#3e5a8a", extra: ["cap", "pouch"] },
      lines: {
        open: ["「王国軍第三隊、アンジェリカ！ 神妙にしなさい！ ……ちょっと、聞いてる？」"],
        turn: ["筒が火を噴いた。あなたの頬をかすめた弾が、後ろの木の枝を落とした。", "女隊長は弾を込め直そうとして、袋ごと地面にぶちまけた。", "「学校では一番だったんだから！ 本当に！」"],
        flee: "「きょ、今日のところは見逃してあげる！ 覚えてなさい！ ……名前、なんだっけ？」",
      },
    },
    c2_captainbeast: {
      name: "隊長だったもの", tier: 4, hp: 60, dmg: [2, 8, 3], hit: 66, def: 14, agi: 45, will: 999, mres: 10, gold: [0, 0], shape: "beast", eye: "#ff5a3a",
      desc: "大きな体。腕が三本ある。三本目の腕の付け根に、王国軍の徽章が縫い込まれたままの布が、ちぎれずに残っている。",
      look: { body: "biped", build: "giant", skin: "#7a5a5a", skin2: "#a87a6a", head: "plain", eyes: "glow", mouth: "fangs", weapon: "club", outfit: "rags", cloth: "#3e5a8a", pattern: "scars", extra: ["drool", "pauldron"], mood: "fierce" },
      lines: {
        open: ["それは、あなたを見て、一度だけ動きを止めた。それから、吠えた。"],
        turn: ["それは、あなたではなく、自分の腕に噛みついた。", "喉の奥で、「行け」と聞こえた気がした。", "それは、背後の扉をかばうように立っている。"],
      },
    },
    c2_rustspawn: {
      name: "錆鎧の分かれ身", tier: 4, hp: 70, dmg: [3, 6, 3], hit: 62, def: 22, agi: 30, will: 999, mres: 20, gold: [0, 0], shape: "humanoid", eye: "#c86a2a",
      desc: "錆びた鎧の、巨きな騎士。兜の中は空で、鎖がうごめいている。斬っても斬っても、錆の粉が寄り集まって、また形になる。",
      look: { body: "biped", build: "giant", skin: "#7a4a2a", head: "helm", eyes: "glow", mouth: "none", weapon: "greatsword", outfit: "armor", cloth: "#6a3a1a", extra: ["smoke", "pauldron"], mood: "fierce" },
      lines: {
        open: ["坑道の奥から、錆の匂いが押し寄せてきた。鎧の継ぎ目で、鎖が鳴る。"],
        turn: ["斬り落とした腕が、錆の粉になって、また肩に戻った。", "鎧の内側から、誰もいない鎧の内側から、鎖の擦れる音だけがする。"],
      },
    },
    c2_zork: {
      name: "首狩りゾルク", tier: 4, hp: 58, dmg: [2, 9, 2], hit: 72, def: 14, agi: 60, will: 80, mres: 5, gold: [40, 90], shape: "humanoid", eye: "#d9d9d9",
      desc: "鍔広の帽子の男。腰に、首を入れる袋を三つ下げている。二つは、もう膨らんでいる。",
      look: { body: "biped", build: "brute", skin: "#c89a78", head: "human", hair: "#5a5a58", eyes: "dot", mouth: "smirk", weapon: "sword", outfit: "armor", cloth: "#2a2420", extra: ["eyepatch", "stubble", "pouch", "cape"] },
      lines: {
        open: ["「悪く思うなよ。おれは張り紙の額しか見てない」"],
        turn: ["ゾルクは斬り合いの最中に、張り紙の似顔絵とあなたの顔を見比べた。「……似てねえな。まあいい」", "「首は軽いほうが運びやすい。暴れるなよ」"],
      },
    },
  });

  // ---------------------------------------------------------------- トロフィー
  if (Array.isArray(D.TROPHIES)) D.TROPHIES.push(
    { key: "c2_party", name: "見知った顔", tier: "銀", desc: "名のある仲間が三人そろった", test: (S) => (S.companions || []).filter((c) => c.c2).length >= 3 },
    { key: "c2_lab", name: "押さえられた扉", tier: "銅", desc: "王都の城の下の部屋から逃げのびた" },
  );

  // ---------------------------------------------------------------- GM（自由入力の「GM に任せる」）への説明。プレイヤーには見せない
  if (Array.isArray(D.LORE_GM)) D.LORE_GM.push(
    "キャラメモの人物（持ち主のオリジナル）が出る。仲間になる者：ディル（港町の本好きでずる賢い青年）・カイデル（迷ったら殴る傭兵。親の仇を追う）・ノラミ／ノラ（村を潰された森の獣人の娘。弓が下手で拳が強い）・シェイラ（王国の第七王子＝末の姫。本好きで使徒の伝承に詳しい。「うん、」から話す）・ルイ（遺跡で眠っていた無口な怪力の子。〔秘〕古い王国ルヴェナールの王女。プレイヤーに明かさない）・ゼリナ（関西言葉の商人）・エルネア（「〜っす」のエルフの鉱石技師）・ナタリア（酒好きの王国十指の格闘家）。",
    "レオネスト王国の国王はヴァレオン（灰銀の髪、好戦家、使徒ゴルヴァン＝黒曜の獣を自分の手で討ちたい）。子は七人：ライオス・セリオス・ファリナ・グレオル・ネイラス・ティリア・シェイラ（娘も「王子」と呼ばれる）。上の六人は末のシェイラを溺愛している。王国十指：フェリダ・ナタリア・シグ・ライーシャ・ゾルク ほか。空いた一席はユリナ（炭鉱で錆鎧ゼブランの分かれ身に殺された）。王国軍の女隊長アンジェリカ（銃の名手、おばさんと呼ぶと怒る）。王国に雇われた博士が王都の地下で人を化け物に変えている（〔進〕）。",
    "ノルディア帝国の皇帝はグレイオル。四騎士：ダリオ（氷壁の父）・エルナ（義足）・ヴァルグ（狼の獣人）・マルヴィナ（使徒対策の女軍師）。皇女カティア。エルメシア共和国（ゲームの共和国）の最高議長はハイエルフのアリシア。",
  );
})(globalThis.G = globalThis.G || {});
