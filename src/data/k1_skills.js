// K1：スキル（技）。魔法とは別の、鍛えて覚える腕前。仕組みは src/engine/zzzzzzzzzzz_k1_skills.js、画面は src/ui/zk1_skills.js。
// 持ち主「魔法以外にスキルも実装してほしい。スキルは鍛錬したり、人から教えてもらったり、巻物を拾ったりなどで覚えることができる」
//
// D.SKILLS = { id: {
//   name, kind: "combat"（戦闘の技）| "field"（戦闘の外の技）| "both"（どちらでも使える）,
//   style: 使える武器の型（"剣" "刀" "短剣" "斧" "槌" "槍" "弓" "杖" "鞭" "投げ物" "拳" "盾" "二刀" "両手"。どれか一つを持てばよい。無ければどの武器でも）,
//   stat: 判定に使う能力値（"武器" は持っている武器の能力値）,
//   need: 覚えるのに要る能力値の目安（鍛錬・師・巻物のどれで覚えるときも見る）,
//   ki: 使うときの気力（戦闘の技。気力は体の張り。眠ると戻り、身を守る・読み勝つ・勝つと少し戻る）,
//   hint: 効き目（画面の案内。数を書いてよい）, fx: 効き目の中身（エンジンが読む）,
//   learn: 覚え方 { train: 訓練場で鍛える { gold, days, diff, towns（その町の訓練場だけ）, cls（その職業だけ）, mark: [能力値, 節目の段]（F3 の節目に届いていること） },
//                  camp: 野営で型を磨いて覚えられる（日数だけ・難しい）, teach: 教えてくれる人（D.K1_TEACHERS の鍵）, scroll: 技の巻物がある（D.ITEMS の k1s_<id>）, old: 巻物が古い字で書いてある }
//   say: 使ったときの地の文（{t} は狙いの名）, kw }
// 戦闘の技の fx.t：hit（打つ）・parry（受け流す）・counter（構えて返す）・stance（型。数手番）・wall（守りを固める）・read（見切る）・heal（手当て）・focus（気合）・feint（誘い）
//   hit の欄：mul 威力・hit 命中の補正（％）・times 回数・all 敵すべて・spread 回ごとに狙いを替える・cut 溜めと詠唱を潰す・nobrace 待ちの構えに阻まれない・brk 崩す気配
//            stun 崩す（強敵には効かない）・open 崩れた相手・気配を見せた相手への威力・pin 気配を潰す・bleed 血を流させる手番の数
// 覚えた技は S.skills（id の配列。古いセーブには無い）、熟練（使った数）は S.k1.use、気力は S.k1.ki。レーン C＋B（K1）
(function (G) {
  const D = G.data;

  const sk = (o) => Object.assign({ kind: "combat", style: null, stat: "武器", need: {}, ki: 1, fx: { t: "hit" }, learn: {} }, o);
  D.SKILLS = {
    // ---------------------------------------------------------------- 剣・刀
    k1_twinfang: sk({
      name: "返し刃", style: ["剣", "刀", "短剣"], need: { 敏捷: 10 }, ki: 2, hint: "二度斬りつける（一太刀ずつは浅い）",
      fx: { t: "hit", times: 2, mul: 0.7 }, learn: { train: { gold: 60, days: 2 }, teach: ["veteran", "comp:fighter"], scroll: true },
      say: "振り抜いた刃を、手首だけで返す。", kw: ["返し", "二度"],
    }),
    k1_helmsplit: sk({
      name: "兜割り", style: ["剣", "刀", "斧", "槌"], need: { 筋力: 14 }, ki: 2, hint: "重い一撃（1.6倍・当たりにくい）。待ちの構えを叩き崩す",
      fx: { t: "hit", mul: 1.6, hit: -10, brk: ["brace"] }, learn: { train: { gold: 80, days: 2 }, teach: ["veteran", "guardmaster"], scroll: true },
      say: "頭の上まで振りかぶり、体の重さごと叩きつける。", kw: ["兜割", "振りかぶ"],
    }),
    k1_drawcut: sk({
      name: "抜き打ち", style: ["刀", "剣"], need: { 敏捷: 14 }, ki: 2, hint: "溜めや詠唱に割り込んで技を潰す。割り込むより深く斬る",
      fx: { t: "hit", mul: 1, hit: 10, cut: true }, learn: { train: { gold: 90, days: 3, towns: ["yakumo"] }, teach: ["kensei"], scroll: true },
      say: "鞘走りの音が、相手の息より先に鳴った。", kw: ["抜き打", "居合", "抜刀"],
    }),
    k1_flurry: sk({
      name: "乱れ打ち", style: ["剣", "短剣", "拳"], need: { 敏捷: 18 }, ki: 3, hint: "浅い打ち込みを三度（当たりやすい）",
      fx: { t: "hit", times: 3, mul: 0.5, hit: 5 }, learn: { train: { gold: 150, days: 3, mark: ["敏捷", 0] }, teach: ["kensei"], scroll: true },
      say: "考えるより先に、腕が三度動いた。", kw: ["乱れ", "連撃"],
    }),
    k1_parry: sk({
      name: "受け流し", style: ["剣", "刀", "短剣", "槍", "盾"], stat: "敏捷", need: { 敏捷: 12 }, ki: 1, hint: "最初の一撃を受け流して斬り返す。大技なら相手が崩れる",
      fx: { t: "parry", mul: 0.8 }, learn: { train: { gold: 60, days: 2 }, teach: ["veteran", "comp:fighter", "guardmaster"], scroll: true },
      say: "刃を寝かせ、来る力の向きにだけ目を据える。", kw: ["受け流", "いなす", "流"],
    }),
    // ---------------------------------------------------------------- 槍・杖
    k1_sweepspear: sk({
      name: "石突き払い", style: ["槍", "杖"], need: { 筋力: 12 }, ki: 2, hint: "敵すべてを払う（一体ずつは浅い）",
      fx: { t: "hit", all: true, mul: 0.6 }, learn: { train: { gold: 70, days: 2 }, teach: ["veteran"], scroll: true },
      say: "柄の尻で、足もとを薙ぎ払う。", kw: ["払", "薙"],
    }),
    k1_spearwall: sk({
      name: "槍衾", style: ["槍"], stat: "体力", need: { 体力: 12 }, ki: 1, hint: "身を守りながら構え、打ちかかってきた敵に穂先で返す",
      fx: { t: "counter", mul: 0.8 }, learn: { train: { gold: 80, days: 2, towns: ["garmund", "fort", "w7_brenark", "w7_frostgate", "w7_glatz"] }, teach: ["guardmaster"], scroll: true },
      say: "穂先を低く据え、相手が飛び込んでくるのを待つ。", kw: ["槍衾", "構え"],
    }),
    k1_pierce: sk({
      name: "刺し貫く", style: ["槍", "短剣", "剣"], need: { 筋力: 10 }, ki: 1, hint: "待ちの構えの隙間を突く（1.3倍・当たりやすい）",
      fx: { t: "hit", mul: 1.3, hit: 10, nobrace: true }, learn: { train: { gold: 50, days: 2 }, teach: ["veteran"], scroll: true },
      say: "構えの隙間へ、まっすぐに突き入れる。", kw: ["貫", "突"],
    }),
    // ---------------------------------------------------------------- 弓・投げ物
    k1_aim: sk({
      name: "狙い撃ち", style: ["弓", "投げ物"], need: { 敏捷: 10 }, ki: 1, hint: "息を止めて狙う（1.5倍・当たりやすい）",
      fx: { t: "hit", mul: 1.5, hit: 20 }, learn: { train: { gold: 50, days: 2 }, camp: true, teach: ["hunter", "comp:scout"], scroll: true },
      say: "息を止め、風が凪ぐのを待つ。", kw: ["狙い", "射"],
    }),
    k1_twoarrows: sk({
      name: "二の矢", style: ["弓"], need: { 敏捷: 16 }, ki: 2, hint: "続けざまに二射。二体いれば別々に狙う",
      fx: { t: "hit", times: 2, mul: 0.8, spread: true }, learn: { train: { gold: 100, days: 3, mark: ["敏捷", 0] }, teach: ["hunter"], scroll: true },
      say: "一の矢が届く前に、二の矢をつがえていた。", kw: ["二の矢", "連射"],
    }),
    k1_pin: sk({
      name: "牽制の一射", style: ["弓", "投げ物"], need: { 敏捷: 12 }, ki: 1, hint: "相手の仕掛け（大技・連撃・詠唱・構え）を潰す。必殺は止まらない",
      fx: { t: "hit", mul: 0.5, hit: 10, pin: true }, learn: { train: { gold: 60, days: 2 }, teach: ["hunter", "comp:scout"], scroll: true },
      say: "相手の足もとへ、わざと外して射込む。", kw: ["牽制", "足止め"],
    }),
    // ---------------------------------------------------------------- 盾
    k1_shieldbash: sk({
      name: "盾打ち", style: ["盾"], stat: "筋力", need: { 筋力: 12 }, ki: 2, hint: "盾で殴る。何か仕掛けてくる相手を崩す",
      fx: { t: "hit", mul: 0.6, brk: ["heavy", "chant", "quick", "brace"] }, learn: { train: { gold: 70, days: 2 }, teach: ["guardmaster"], scroll: true },
      say: "盾の縁ごと、体当たりする。", kw: ["盾打", "体当たり"],
    }),
    k1_ironwall: sk({
      name: "鉄壁", style: ["盾"], stat: "体力", need: { 体力: 12 }, ki: 1, hint: "身を守る。この手番、鎧がさらに硬くなる",
      fx: { t: "wall", def: 4 }, learn: { train: { gold: 60, days: 2 }, teach: ["guardmaster"], scroll: true },
      say: "盾の陰に体を畳み、肩で支える。", kw: ["鉄壁", "盾"],
    }),
    // ---------------------------------------------------------------- 二刀
    k1_twinstorm: sk({
      name: "双つ嵐", style: ["二刀"], need: { 敏捷: 16 }, ki: 2, hint: "左右の刃で続けて斬る（当たりやすい）",
      fx: { t: "hit", times: 2, mul: 0.9, hit: 5 }, learn: { train: { gold: 120, days: 3, towns: ["w2_zalgros", "w7_glatz"] }, teach: ["kensei"], scroll: true },
      say: "右の刃が引くのと同じ速さで、左の刃が出る。", kw: ["双", "二刀"],
    }),
    k1_crossguard: sk({
      name: "十字受け", style: ["二刀"], stat: "敏捷", need: { 敏捷: 14 }, ki: 1, hint: "二本の刃を交えて受け、そのまま斬り返す",
      fx: { t: "parry", mul: 1 }, learn: { train: { gold: 90, days: 2, towns: ["w2_zalgros", "w7_glatz"] }, scroll: true },
      say: "二本の刃を交差させ、来る刃をその股で受ける。", kw: ["十字", "受け"],
    }),
    // ---------------------------------------------------------------- 拳・斧・短剣
    k1_bodyblow: sk({
      name: "当て身", style: ["拳"], need: { 筋力: 10 }, ki: 2, hint: "懐に入って急所を打ち、崩す（強敵は崩れない）",
      fx: { t: "hit", mul: 0.5, stun: true }, learn: { train: { gold: 40, days: 2 }, teach: ["veteran", "comp:fighter"], scroll: true },
      say: "懐に潜り込み、みぞおちに拳を沈める。", kw: ["当て身", "拳"],
    }),
    k1_cleave: sk({
      name: "薙ぎ倒し", style: ["斧", "両手"], stat: "筋力", need: { 筋力: 18 }, ki: 3, hint: "敵すべてをまとめて薙ぐ（当たりにくい）",
      fx: { t: "hit", all: true, mul: 0.8, hit: -10 }, learn: { train: { gold: 120, days: 3, mark: ["筋力", 0] }, teach: ["veteran"], scroll: true },
      say: "腰を落とし、刃を地面と平らに振り回す。", kw: ["薙ぎ", "回"],
    }),
    k1_shadowstab: sk({
      name: "影刺し", style: ["短剣"], need: { 敏捷: 12 }, ki: 1, hint: "崩れた相手か、何か仕掛けようとしている相手の死角を刺す（2.2倍。それ以外は1.2倍）",
      fx: { t: "hit", mul: 1.2, open: 2.2 }, learn: { teach: ["fence", "comp:rogue"], scroll: true },
      say: "相手の目が逸れた一瞬に、影のように背へ回る。", kw: ["影", "背後"],
    }),
    k1_venom: sk({
      name: "毒刃", style: ["短剣", "弓", "投げ物"], stat: "知力", need: { 知力: 10 }, ki: 1, hint: "浅い傷に毒を入れ、三手番のあいだ蝕む",
      fx: { t: "hit", mul: 0.8, bleed: 3 }, learn: { teach: ["fence"], scroll: true },
      say: "刃先に、懐の小瓶の中身を一滴落とす。", kw: ["毒"],
    }),
    // ---------------------------------------------------------------- どの武器でも
    k1_focus: sk({
      name: "気合", stat: "体力", need: { 体力: 8 }, ki: 0, hint: "息を整える。気力が一つ戻り、次の一撃が深く入る",
      fx: { t: "focus" }, learn: { train: { gold: 30, days: 1 }, camp: true, teach: ["veteran", "comp:fighter"], scroll: true },
      say: "腹の底から息を吐き、肩の力を抜く。", kw: ["気合", "息"],
    }),
    k1_guardform: sk({
      name: "守りの型", stat: "体力", need: { 体力: 12 }, ki: 2, hint: "三手番のあいだ、敵の攻撃が当たりにくくなる",
      fx: { t: "stance", k: "guard", n: 3 }, learn: { train: { gold: 60, days: 2 }, teach: ["guardmaster"], scroll: true },
      say: "重心を後ろに置き、守りの型に構え直す。", kw: ["守りの型", "型"],
    }),
    k1_furyform: sk({
      name: "攻めの型", stat: "筋力", need: { 筋力: 14 }, ki: 2, hint: "三手番のあいだ、刃が深く入る（1.3倍）が、こちらも当たりやすくなる",
      fx: { t: "stance", k: "fury", n: 3 }, learn: { train: { gold: 80, days: 2 }, teach: ["veteran", "kensei"], scroll: true },
      say: "重心を前に移し、守りを捨てた型に構える。", kw: ["攻めの型", "型"],
    }),
    k1_read: sk({
      name: "見切り", stat: "知力", need: { 知力: 12 }, ki: 1, hint: "この戦いのあいだ、敵の気配に合う手に◎が付く（倒したことが無い敵でも）",
      fx: { t: "read" }, learn: { train: { gold: 60, days: 2 }, teach: ["kensei", "comp:scout"], scroll: true },
      say: "相手の肩と足の運びを、黙って見る。", kw: ["見切", "読"],
    }),
    k1_feint: sk({
      name: "誘いの隙", stat: "敏捷", need: { 敏捷: 12 }, ki: 1, hint: "わざと隙を見せ、狙いに大技を誘う（強敵は乗らない）。受けるか躱せば崩せる",
      fx: { t: "feint" }, learn: { teach: ["kensei", "veteran"], scroll: true },
      say: "構えを下ろし、わざと胸を開けてみせる。", kw: ["誘い", "隙"],
    }),
    // ---------------------------------------------------------------- 戦闘でも外でも
    k1_firstaid: sk({
      name: "応急手当", kind: "both", stat: "知力", need: { 知力: 8 }, ki: 2, hint: "傷を縛って HP を少し戻す（戦闘の外では一日に一度、気力を使わない）",
      fx: { t: "heal", dice: [1, 6, 2] }, learn: { train: { gold: 40, days: 1 }, teach: ["sister", "comp:heal"], scroll: true },
      say: "布を裂き、傷口をきつく縛る。", kw: ["手当", "包帯"],
    }),

    // ---------------------------------------------------------------- 戦闘の外の技（効き目は出来事と施設の選択肢。src/data/k1_field.js）
    k1_lockpick: sk({ kind: "field", stat: "敏捷", name: "鍵開け", need: { 敏捷: 8 }, hint: "錠前・宝箱・閂を、壊さずに開ける", learn: { teach: ["fence", "comp:rogue"], scroll: true }, kw: ["鍵", "錠"] }),
    k1_trapsense: sk({ kind: "field", stat: "知力", name: "罠読み", need: { 知力: 10 }, hint: "罠と仕掛けに先に気づき、外す", learn: { camp: true, teach: ["fence", "hunter", "comp:rogue"], scroll: true }, kw: ["罠"] }),
    k1_track: sk({ kind: "field", stat: "知力", name: "追跡", need: { 知力: 8 }, hint: "足跡と痕跡を読む。荒野で獲物や隠れ家を探せる", learn: { camp: true, teach: ["hunter", "comp:scout"], scroll: true }, kw: ["足跡", "追"] }),
    k1_haggle: sk({ kind: "field", stat: "魅力", name: "値切り", need: { 魅力: 10 }, hint: "商いの場で値を下げさせ、払いを引き上げる", learn: { teach: ["comp:trade", "fence"], scroll: true }, kw: ["値切", "交渉"] }),
    k1_appraise: sk({ kind: "field", stat: "知力", name: "目利き", need: { 知力: 12 }, hint: "品の値打ちと出どころを見抜く。店で掘り出し物を探せる", learn: { teach: ["comp:trade"], scroll: true }, kw: ["目利き", "鑑定"] }),
    k1_camp: sk({ kind: "field", stat: "体力", name: "野営術", need: { 体力: 8 }, hint: "野営でよく休め、夜に襲われても先に目を覚ます", learn: { camp: true, teach: ["hunter", "comp:scout"], scroll: true }, kw: ["野営"] }),
    k1_stealth: sk({ kind: "field", stat: "敏捷", name: "隠密", need: { 敏捷: 10 }, hint: "物音を立てずに動き、見張りの目を抜ける", learn: { camp: true, teach: ["fence", "comp:rogue"], scroll: true }, kw: ["隠", "忍"] }),
    k1_climb: sk({ kind: "field", stat: "筋力", name: "登攀", need: { 筋力: 10 }, hint: "崖・壁・塀をよじ登る", learn: { train: { gold: 30, days: 1 }, camp: true, teach: ["hunter"], scroll: true }, kw: ["登"] }),
    k1_herb: sk({ kind: "field", stat: "知力", name: "薬草知識", need: { 知力: 8 }, hint: "効く草と毒の草を見分ける。荒野で薬草を摘める", learn: { teach: ["sister", "hunter", "comp:heal"], scroll: true }, kw: ["薬草", "草"] }),
    k1_letters: sk({ kind: "field", stat: "知力", name: "古文字読み", need: { 知力: 14 }, hint: "碑文・古い字・古い巻物を読む", learn: { teach: ["archivist", "comp:magic"], scroll: true, old: true }, kw: ["古文字", "碑文"] }),
    k1_etiquette: sk({ kind: "field", stat: "魅力", name: "礼法", need: { 魅力: 10 }, hint: "位ある者の前での作法。門と広間で話が通りやすい", learn: { teach: ["guardmaster", "sister"], scroll: true }, kw: ["礼", "作法"] }),
    k1_beast: sk({ kind: "field", stat: "魅力", name: "獣あしらい", need: { 魅力: 8 }, hint: "獣を落ち着かせ、追い払い、馬を扱う", learn: { camp: true, teach: ["hunter", "comp:scout"], scroll: true }, kw: ["獣"] }),
    k1_song: sk({ kind: "field", stat: "魅力", name: "弾き語り", need: { 魅力: 10 }, hint: "歌で場を和ませる。酒場で投げ銭を稼げる", learn: { teach: ["bard"], scroll: true }, kw: ["歌", "弾"] }),
  };
  Object.values(D.SKILLS).forEach((s) => { if (s.kind === "field") { s.ki = 0; s.fx = null; } });

  // 職業ごとに、はじめから覚えている技（M1 の D.SPELL_START と同じ考え）
  D.SKILL_START = { merc: ["k1_parry"], thief: ["k1_lockpick"], mage: ["k1_letters"], priest: ["k1_firstaid"], samurai: ["k1_drawcut"] };

  // 熟練：使った数で段が上がる（覚えたて・慣れた・熟達・極み）。段ごとに判定に +5％。極みは気力が一つ軽い
  D.K1_LV = [0, 6, 18, 40];
  D.K1_LV_NAMES = ["覚えたて", "慣れた", "熟達", "極み"];

  // ---------------------------------------------------------------- 教えてくれる人
  // fac：その施設にいる（町の施設の「教わる」）・ev：出来事で出会う・comp：その得意の仲間（好感度が「打ち解けている」から）
  // cond(S)：教えてくれる条件・lock：条件が足りないときの添え書き（数は書かない）・fee：教わる礼（技の鍛錬の値段に掛ける。0 なら礼は要らない）・days：かかる日数
  D.K1_TEACHERS = {
    veteran: { name: "片目の老傭兵", fac: "tavern", fee: 1, days: 2, lock: "名が知られていれば、話を聞いてくれそうだ",
      cond: (S) => (S.fame || 0) >= 60 || S.cls === "merc",
      line: "老傭兵は片方だけの目であなたの手を見て、樽の上の杯をどけた。「口で言っても分からん。立て」" },
    fence: { name: "裏路地の元締め", fac: "alley", fee: 0.8, days: 2, lock: "手を汚した者なら、声がかかりそうだ",
      cond: (S) => (S.sin || 0) >= 8 || S.cls === "thief",
      line: "元締めは帳場の奥から出てこずに、声だけで言った。「教えるのは一度だけだ。二度目は金を取る。三度目は指を取る」" },
    hunter: { name: "ギルドの古株の狩人", fac: "guild", fee: 0.5, days: 2, lock: "依頼を重ねて顔を覚えられれば、教えてもらえそうだ",
      cond: (S) => ((S.counters && S.counters.quests) || 0) >= 3,
      line: "古株の狩人は、あなたの片づけた依頼の札を指でなぞった。「礼の代わりだ。森の歩き方くらいは教えてやる」" },
    sister: { name: "施療院の修道女", fac: "church", fee: 0.5, days: 1, lock: "施しを重ねた者なら、手ほどきを受けられそうだ",
      cond: (S) => ((S.virtue || 0) >= 4 && (S.sin || 0) < 4) || S.cls === "priest",
      line: "修道女は袖をまくり、洗いたての布を山ほど抱えてきた。「祈るより先に、手を動かせる人が要るのです」" },
    guardmaster: { name: "近衛の師範", fac: "castle", fee: 1.5, days: 2, lock: "位を得るか、この国で慕われていれば、稽古をつけてもらえそうだ",
      cond: (S) => ["騎士", "領主", "国王"].includes(S.title) || (G.c10 && G.c10.trusted ? G.c10.trusted(S) : false),
      line: "近衛の師範は、木剣を二本持ってきて、一本をあなたに放った。「城の中では、刃より先に作法が要る。両方教える」" },
    bard: { name: "旅の吟遊詩人", fac: "tavern", fee: 1, days: 1, lock: "少し名が知られれば、詩人のほうから寄ってきそうだ",
      cond: (S) => (S.fame || 0) >= 20,
      line: "吟遊詩人はあなたの名を聞くと、弦を一本はじいた。「歌になる人には、歌を一つ持っていてほしいのさ」" },
    kensei: { name: "流れの剣客", ev: "k1_kensei", fee: 1.2, days: 2, lock: "",
      cond: (S) => Math.max((S.stats || {}).筋力 || 0, (S.stats || {}).敏捷 || 0) >= 16,
      line: "剣客は焚き火越しに、あなたの剣だこを見た。「その手なら、教え甲斐がある」" },
    archivist: { name: "古書庫の番人", ev: "k1_archive", fee: 1, days: 3, lock: "",
      cond: (S) => ((S.stats || {}).知力 || 0) >= 12,
      line: "番人は、埃の積もった書見台をあなたのために一つ空けた。「読めない字はない。読める人がいなくなった字があるだけだ」" },
    "comp:fighter": { name: "腕の立つ仲間", comp: "fighter", fee: 0, days: 1, lock: "腕の立つ仲間と打ち解ければ" },
    "comp:rogue": { name: "手癖の悪い仲間", comp: "rogue", fee: 0, days: 1, lock: "手癖の悪い仲間と打ち解ければ" },
    "comp:scout": { name: "目と鼻の利く仲間", comp: "scout", fee: 0, days: 1, lock: "目と鼻の利く仲間と打ち解ければ" },
    "comp:heal": { name: "手当てのできる仲間", comp: "heal", fee: 0, days: 1, lock: "手当てのできる仲間と打ち解ければ" },
    "comp:trade": { name: "商売の分かる仲間", comp: "trade", fee: 0, days: 1, lock: "商売の分かる仲間と打ち解ければ" },
    "comp:magic": { name: "術の使える仲間", comp: "magic", fee: 0, days: 1, lock: "術の使える仲間と打ち解ければ" },
  };
  D.K1_BOND = 55;   // 仲間が教えてくれる好感度（「打ち解けている」）

  // ---------------------------------------------------------------- 技の巻物（読むと覚える。覚えると巻物は崩れる）
  const KAN = { combat: "技の巻物", both: "技の巻物", field: "心得の巻物" };
  const DESC = {
    combat: ["汗の染みた紙に、足の運びが墨で描いてある。描いた者は、絵より剣のほうがうまかったらしい。", "道場の壁から剥がしたらしい。四隅に釘の穴がある。", "刃の角度を示す線が、何度も引き直されている。"],
    both: ["包帯の巻き方が順に描いてある。余白に、血の指の跡がある。"],
    field: ["細かい字でびっしりと書いてある。読む者が覚えたら燃やせ、と最後の行にある。", "誰かの覚え書きを、別の誰かが写したもの。写し間違いを直した跡が多い。"],
  };
  const TAIL = {
    combat: ["読んで分かる技ではない。読んでから、体で分かる技だ。", "持ち主は、この巻物を何度も開いては閉じたらしい。折り目が擦り切れている。", "最後の行だけ、別の者の筆で書き足してある。「自分より強い相手にだけ使え」"],
    both: ["教会の施療院で使われていたものらしい。端に、薬草の汁の染みがある。"],
    field: ["剣の技ではないから、と安く売られることが多い。命を拾うのは、たいていこちらのほうだ。", "書いた者の名は無い。名を残さないのが、この手の心得の作法らしい。"],
  };
  Object.entries(D.SKILLS).forEach(([id, s], i) => {
    if (!s.learn.scroll) return;
    const old = !!s.learn.old;
    const fee = (s.learn.train && s.learn.train.gold) || 60;
    D.ITEMS["k1s_" + id.slice(3)] = {
      name: `${old ? "古い" : ""}${KAN[s.kind]}『${s.name}』`, type: "k1scroll", skill: id, old, price: Math.round(fee * 2.5),
      desc: old ? "古い字で書かれた巻物。読める者は、今ではほとんどいない。" : DESC[s.kind][i % DESC[s.kind].length],
    };
    // 図鑑の説明（I2 のフレーバー。二文以上）
    D.ITEMS["k1s_" + id.slice(3)].flavor = `${D.ITEMS["k1s_" + id.slice(3)].desc}巻きの外に、細い字で「${s.name}」と題がある。${TAIL[s.kind][i % TAIL[s.kind].length]}`;
  });
  D.K1_SCROLL = (id) => "k1s_" + id.slice(3);

  // 町の店の掘り出し物（巻物）と、敵の落とし物。場所と敵のデータはこのあとにも足されるので、当てはめるのはエンジン（読み込みの最後）
  D.K1_SHOP = {
    karna: ["k1_twinfang", "k1_haggle"], nerva: ["k1_stealth", "k1_venom"], leavel: ["k1_guardform", "k1_etiquette"], garmund: ["k1_spearwall", "k1_helmsplit", "k1_sweepspear"],
    fort: ["k1_focus", "k1_pierce"], zephara: ["k1_read", "k1_letters"], yakumo: ["k1_drawcut"], w1_holy: ["k1_firstaid"], w2_zalgros: ["k1_twinstorm", "k1_furyform", "k1_flurry"],
    w2_nagris: ["k1_aim", "k1_track"], w2_dranherz: ["k1_appraise"], w3_lignoa: ["k1_herb", "k1_beast"], w4_valmiria: ["k1_haggle", "k1_pin"],
    w7_glatz: ["k1_cleave", "k1_crossguard"], w7_salyues: ["k1_song"], w7_melvi: ["k1_letters"], w7_frostgate: ["k1_camp", "k1_climb"],
  };
  D.K1_DROPS = {
    bandit: [["k1_lockpick", 0.04], ["k1_stealth", 0.03]], banditboss: [["k1_helmsplit", 0.08], ["k1_furyform", 0.05]],
    orc: [["k1_cleave", 0.03]], e4_hillorc: [["k1_cleave", 0.05]], deserter: [["k1_spearwall", 0.05], ["k1_guardform", 0.05]],
    ninja: [["k1_shadowstab", 0.08], ["k1_venom", 0.06], ["k1_stealth", 0.05]], blackknight: [["k1_shieldbash", 0.06], ["k1_ironwall", 0.06]],
    e4_brokenknight: [["k1_parry", 0.05], ["k1_etiquette", 0.04]], e4_poacher: [["k1_aim", 0.05], ["k1_track", 0.05]],
    e4_islepirate: [["k1_twinfang", 0.05]], w3_smuggler: [["k1_haggle", 0.05], ["k1_appraise", 0.04]], e4_relicthief: [["k1_trapsense", 0.06], ["k1_lockpick", 0.05]],
    c5_violaine: [["k1_drawcut", 0.2], ["k1_read", 0.15]], warlock: [["k1_letters", 0.05]], e4k_moonarcher: [["k1_twoarrows", 0.08], ["k1_pin", 0.06]],
    m3_hunter: [["k1_track", 0.06], ["k1_feint", 0.05]], e4k_bouncer: [["k1_bodyblow", 0.08]], w3_silentmonk: [["k1_herb", 0.06], ["k1_firstaid", 0.05]],
    e4_hollowknight: [["k1_crossguard", 0.06], ["k1_twinstorm", 0.05]],
  };
})(globalThis.G = globalThis.G || {});
