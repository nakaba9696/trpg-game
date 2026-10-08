// C3：名のある人物の「名前」と「役職」（話す人の札・人物図鑑の見出し）。持ち主の声：「名前＋役職が表示されると良い。役職がないなら村人なり、傭兵なり、わかる記号を」
// 名前の頭の zc3 は、c2_people.js・f2_people.js・出来事のデータより後に読ませて上書きするため（前のファイルは書き換えない）。
//
// D.C3_NAMES[id]（id は D.F2_PEOPLE・D.C2_PEOPLE と同じ）
//   name 名前（札の大きい字）/ role 役職・立場の短い札（札の小さい字。図鑑の見出しの下）/ full 姓まで入れた名前（GM と確認用）
//   alias 名前を知るまでの呼び名（名乗るまで分からない人だけ。名乗ると name になる）/ was 前の呼び名（古いセーブの仲間の名前を読み替える）
//   reveal 名前を知る印（S.flags の鍵）。冒険をまたいで図鑑に残す（G.P.c3named）
// 使徒が人の姿でいるとき（日傘の銀髪の男・生き聖女 など）は、使徒の名が〔進〕なので alias だけで name を持たない（呼び名のまま）。
// 名前の響きは国に合わせた（docs/lore/world.md）：王国は南欧〜仏風（ヴァレオン・フェリダ＝シュテラ）、帝国は北の硬い響き（ダリオ・フロストヘルム）、
// ヴァレンツァの港は南の海の響き。実在の作品の名前は使っていない。
// 乱数で作られる町の人・旅の人（出来事の who の kind だけの人）は、D.C3_KIND_ROLE の札（村人・商人・衛兵 など）。出来事ごとに札を変えたいときは D.C3_EVENT_ROLE
// 仕組みは src/engine/zz_c3_names.js、画面の札は src/ui/c3_nameplate.js。レーン C＋U（C3）
(function (G) {
  const D = (G.data = G.data || {});

  D.C3_NAMES = {
    // ---------------------------------------------------------------- キャラメモ：仲間になる者（名前はシートのまま。役職を揃える）
    dil: { name: "ディル", role: "港町の若者" },
    kaidel: { name: "カイデル", role: "流れの傭兵" },
    nora: { name: "ノラミ", role: "森の獣人" },
    sheila: { name: "シェイラ", role: "田舎の城の主" },
    rui: { name: "ルイ", role: "遺跡の子" },
    zerina: { name: "ゼリナ", role: "商人の娘" },
    elnea: { name: "エルネア", role: "鍛冶ギルドの技師" },
    natalia: { name: "ナタリア", role: "王国十指・拳法家" },
    // ---------------------------------------------------------------- キャラメモ：レオネストの王家と王国の人
    valeon: { name: "ヴァレオン", role: "レオネスト王国の国王" },
    raios: { name: "ライオス", role: "第一王子" },
    serios: { name: "セリオス", role: "第二王子" },
    farina: { name: "ファリナ", role: "第三王子" },
    // 第四王子は、皇帝グレイオルと名が近すぎたので改めた（C19。前の名は was に残して古いセーブを読み替える）
    greol: { name: "アルマン", full: "アルマン・レオネスト", role: "第四王子", was: ["グレオル"] },
    neilas: { name: "ネイラス", role: "第五王子" },
    tiria: { name: "ティリア", role: "第六王子" },
    sixth: { name: "オルヴェイン", full: "オルヴェイン＝ザイフェルト", role: "第六騎士団の団長", was: ["第六騎士団の団長"] },
    angelica: { name: "アンジェリカ", role: "王国軍の女隊長" },
    captain: { name: "ロウェル", full: "ロウェル＝ハイデン", role: "王国軍の隊長", was: ["寡黙な隊長"] },
    doctor: { name: "モルヴァン", full: "ザカリア・モルヴァン", role: "王国に雇われた博士", was: ["博士"] },
    hermes: { name: "ヘルメス", full: "ヘルメス・ヴァンドール", role: "考古学者・通称ヘル爺", was: ["ヘル爺"] },
    yurina: { name: "ユリナ", role: "王国剣士団・特殊部隊" },
    ferida: { name: "フェリダ", role: "王国十指・槍騎兵団" },
    sig: { name: "シグ", role: "王国十指・重装戦斧兵団" },
    raisha: { name: "ライーシャ", role: "王国十指・剣士" },
    zork: { name: "ゾルク", role: "王国十指・賞金稼ぎ" },
    bride: { name: "マリエッタ", full: "マリエッタ＝ボルド", role: "流れの大槌使い", was: ["大槌の姉さん"] },
    // 名乗るのを忘れた娘（c2_boku）。二度目に会うと名乗る（src/data/events_c3.js の c3_boku_name）
    boku: { name: "テオ", full: "テオドラ・ピム", alias: "「ボク」の娘", role: "からくり好きの娘", reveal: "c3_boku_name", was: ["「ボク」の娘"] },
    // ---------------------------------------------------------------- キャラメモ：ノルディア帝国・エルメシア
    greiol: { name: "グレイオル", role: "ノルディア帝国の皇帝" },
    dario: { name: "ダリオ", role: "帝国四騎士・帝都防衛軍総帥" },
    erna: { name: "エルナ", role: "帝国四騎士・機動部隊" },
    valg: { name: "ヴァルグ", role: "帝国四騎士・斥候" },
    malvina: { name: "マルヴィナ", role: "帝国四騎士・軍師" },
    katia: { name: "カティア", role: "皇女" },
    alicia: { name: "アリシア", role: "エルメシア共和国の最高議長" },

    // ---------------------------------------------------------------- 出来事・施設で会う人
    chancellor: { name: "オスヴィン", full: "オスヴィン・グラーフェンベルク", role: "帝国の宰相", was: ["帝国の宰相", "宰相"] },
    gaston: { name: "ガストン", role: "茹で騎士", was: ["茹で騎士ガストン"] },
    joachim: { name: "ヨアヒム", role: "帝国の脱走兵", was: ["脱走兵ヨアヒム"] },
    borg: { name: "ボルグ", role: "金融商会の取り立て屋", was: ["取り立て屋ボルグ"] },
    konoha: { name: "シオン", role: "賭場の壺振り", was: ["香炉番のシオン"] },
    berna: { name: "ベルナ", role: "沼の小島の疫医", was: ["疫医ベルナ"] },
    hans: { name: "ハンス", role: "宿の主人", was: ["宿の主人ハンス"] },
    greta: { name: "グレタ", role: "宿の女将", was: ["宿の女将グレタ"] },
    gert: { name: "ゲルト", role: "パン屋の老人", was: ["パン屋の老人ゲルト"] },
    albert: { name: "アルベルト", role: "町の司祭", was: ["司祭アルベルト"] },
    dominik: { name: "ドミニク", role: "串焼き屋", was: ["串焼き屋のドミニク"] },
    neumann: { name: "ノイマン", role: "古道具屋", was: ["古道具屋のノイマン"] },
    // 片目の船長。ヴァレンツァの港で通り名の姓で呼ばれている
    captain_east: { name: "コルサーノ", full: "イーヴォ・コルサーノ", role: "東へ出る船の船長", was: ["東へ出る船の船長"] },
    // 灰色の外套の旅人。三度目に会ったとき、昔そう呼ばれた名を名乗る（何者かは書かない。world.md 6. の余白のまま）
    walker: { name: "ノエ", alias: "灰色の外套の旅人", role: "旅人", reveal: "c3_walker_name", was: ["灰色の外套の旅人"] },
    // 両替商は、商会の看板の名で呼ばれている
    zalve: { name: "ドレイゼ", role: "金融商会の両替商", was: ["ドレイゼ金融商会の両替商"] },
    // 人の姿の使徒：使徒の名は〔進〕なので、呼び名のまま
    mirza: { alias: "日傘の銀髪の男", role: "灰の荒野の貴人" },
    aurelia: { alias: "生き聖女", role: "聖都の大聖堂" },
    yoihime: { alias: "煙をまとった女", role: "朧島の賭場の客" },
    mordu: { alias: "花畑の庭師", role: "毒沼の庭師" },
    azlag: { alias: "片翼の大男", role: "断界山脈の大男" },
    chezar: { alias: "北の賢人", role: "宰相の客分の軍師" },
    yura: { alias: "逆さの夢の子", role: "夢の中の子ども" },
  };

  // 出来事の who の kind → 札。[男, 女]（一つなら両方）。町の外の villager は「村人」
  D.C3_KIND_ROLE = {
    villager: ["町の人"], merchant: ["商人"], guard: ["衛兵"], priest: ["神官", "修道女"], noble: ["貴族"], rogue: ["ならず者"],
    child: ["子ども"], elder: ["老人", "老婆"], soldier: ["兵士"], knight: ["騎士"], sailor: ["船乗り"], mage: ["魔法使い"],
    ronin: ["島の人"], host: ["宿の主人", "宿の女将"], beggar: ["物乞い"], archer: ["狩人"], adventurer: ["冒険者"],
    merc: ["傭兵"], majin: ["得体の知れない人"], foe: ["魔物"], hero: ["冒険者"],
  };
  D.C3_VILLAGE_ROLE = "村人";

  // 出来事ごとの札（型の札より分かりやすくしたい人だけ）
  D.C3_EVENT_ROLE = {
    brawl: "酔っぱらい", pickpocket: "スリの子", carriage: "馬車の貴族", peddler: "行商人", heretic: "異端の老人", donation: "修道女",
    slaver: "奴隷商人", fortune: "占い婆", duel: "若い騎士", toll: "関所のならず者", fallen: "倒れた冒険者", caravan: "隊商の商人",
    werevillage: "村人", deserter_help: "帝国の脱走兵", frontline: "前線の古参兵", tsujigiri: "辻斬り", prince: "フードの男",
    v1_spatship: "老いた船長", v1_mermaid: "見世物の呼び込み",
  };

  // 名前を付けた人は、データの呼び名も揃える（GM と確認用。札と図鑑は G.personTag を通す）
  const C2 = D.C2_PEOPLE || {}, F2 = D.F2_PEOPLE || {};
  Object.entries(D.C3_NAMES).forEach(([id, t]) => {
    if (C2[id] && t.name && !t.reveal) { C2[id].name = t.name; if (t.full && /名はシートに無い/.test(C2[id].full || "")) C2[id].full = t.full; }
    if (F2[id] && F2[id].name) F2[id].name = t.reveal || !t.name ? t.alias || F2[id].name : t.name;
  });
})(globalThis.G = globalThis.G || {});
