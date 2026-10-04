// 人物の「誰か」を決める表と入口（主人公・仲間・出来事の人物）。絵は描かない（A10：canvas の人物の絵はやめた。生成画像は v4_assets.js）
// G.PEOPLE                     … 人物の種類の表（出来事の who に書ける名前。name / desc は一覧用。生成画像の型 kind_<種類> に当たる）
// G.personLook(who)            … 見た目の指定を決める（DOM なし。性別・年頃・種族の耳を決めるのに使う）
// G.drawPortrait(canvas, who)  … 画面から呼ぶ入口はここ1か所。ここでは枠を空けるだけ（v4_assets.js が画像で包む）
// G.heroWho(profile, cls) / G.companionWho(c) / G.eventWho(e) … 主人公・仲間・出来事から who を作る
// who = { kind, seed, sex: "男"|"女", age: 数, cls（主人公の職業 id）, text（「銀髪、鋭い目つき」のような外見の文）, look: {部品の上書き} }
// 乱数は seed から作る（G.rand を使わない）ので、同じ人物はいつも同じ見た目になる。レーン A（絵）が管理
(function (G) {
  // ---------------------------------------------------------------- 小道具
  function rng(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
    return () => { s = (s + 0x6d2b79f5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const pickR = (R, a) => a[Math.floor(R() * a.length)];

  // ---------------------------------------------------------------- 部品の色
  const SKINS = ["#f4dcc6", "#eecaa8", "#e2b690", "#cf9d74", "#b07a52", "#8c5c3c"];
  const HAIRS = ["#1c1a1e", "#2e2420", "#4a3020", "#6a4a2a", "#9a3a22", "#b89a58", "#d8bc70", "#8a8a88", "#c8ccd4", "#1e2a40"];
  const IRIS = ["#4a3020", "#2a4a6a", "#3a6a4a", "#6a5a2a", "#5a4a6a", "#2a2a2a", "#7a4a2a"];
  // 外見の文から拾う言葉（setup の「外見」を手直ししても効く）
  const HAIR_WORDS = [
    [/白髪まじり/, "#7a7672", "streak"], [/白髪|はくはつ/, "#e2ded6"], [/銀/, "#c9ccd6"], [/青みがかった黒/, "#1e2a44"], [/くすんだ金/, "#ae9458"], [/金髪|金色の髪/, "#dcbc62"],
    [/赤毛|赤い髪|赤髪/, "#9a3a22"], [/灰色の髪|灰色/, "#8a8a88"], [/焦げ茶/, "#4a3020"], [/茶髪|栗色/, "#7a5230"], [/青い髪|青髪/, "#3a5a9a"], [/緑の髪|緑髪/, "#3a6a4a"],
    [/桃色|桃髪/, "#d88aa0"], [/紫の髪|紫髪/, "#6a4a8a"], [/黒髪/, "#1c1a1e"],
  ];

  // ---------------------------------------------------------------- 人物の種類
  // 欄：name（一覧の名前）desc、age [下, 上]、female（女の割合）、outfit / head / gear / chest（候補から種で選ぶ）、cloth（服の色）、bg（背景）、
  //     eyes / mouth / brows / hair（髪型）、marks {印: 出る割合}、skin（肌の候補。無ければ SKINS）
  const K = (o) => Object.assign({ age: [20, 50], female: 0.5, outfit: ["tunic"], head: ["none"], gear: ["none"], chest: ["none"], cloth: ["#6a5a4a"], bg: "#6a6e72", eyes: ["normal"], mouth: ["flat"], brows: ["calm"], hair: null, marks: {} }, o);
  G.PEOPLE = {
    villager: K({ name: "町の人", desc: "通りの人・農夫・職人・おかみさん", age: [18, 58], outfit: ["tunic", "apron", "tunic"], head: ["none", "none", "kerchief", "cap"], cloth: ["#7a6a4a", "#5a6a4a", "#8a5a3a", "#6a5a6a", "#4a5a6a"], bg: "#7d8a6a", eyes: ["normal", "round", "sleepy"], mouth: ["smile", "flat", "open"], brows: ["calm", "worried", "raised"], marks: { freckles: 0.25, stubble: 0.3, blush: 0.3, bandage: 0.12 } }),
    merchant: K({ name: "商人", desc: "行商人・店の主・金貸し", age: [28, 62], female: 0.35, outfit: ["vest"], head: ["hat", "none", "cap"], chest: ["coins", "none"], cloth: ["#6a2a2a", "#2a4a3a", "#5a4a1a", "#3a2a4a"], bg: "#8a7446", eyes: ["narrow", "normal", "smile"], mouth: ["grin", "smirk", "smile"], brows: ["raised", "calm"], hair: ["short", "slick", "receding", "bun"], marks: { mustache: 0.4, glasses: 0.25, earring: 0.2, blush: 0.2 } }),
    guard: K({ name: "衛兵", desc: "町の衛兵・門番・牢番", age: [20, 50], female: 0.2, outfit: ["tabard"], head: ["helmet"], gear: ["spear"], cloth: ["#3e5a8a", "#6a2a2a", "#3a5a3a"], bg: "#5a6478", eyes: ["normal", "sharp", "sleepy"], mouth: ["flat", "frown", "smirk"], brows: ["angry", "calm"], marks: { stubble: 0.4, scar: 0.2, mustache: 0.2 } }),
    priest: K({ name: "神官", desc: "光天教会の神官・修道女・巡礼", age: [22, 66], female: 0.45, outfit: ["vestment"], head: ["none", "mitre", "none", "veil"], gear: ["none", "none", "staff"], chest: ["sun"], cloth: ["#ece6d6"], trim: ["#b08a1e", "#8a2a2a", "#2e4d8f"], bg: "#b8a870", eyes: ["narrow", "normal", "smile"], mouth: ["smile", "flat", "smirk"], brows: ["raised", "calm"], hair: ["short", "slick", "receding", "long"], marks: { wrinkles: 0.3, blush: 0.2, glasses: 0.15 } }),
    noble: K({ name: "貴族", desc: "貴族・その奥方・廷臣", age: [20, 62], outfit: ["noble"], head: ["none", "circlet", "none"], chest: ["gem", "chain"], cloth: ["#5a1a3a", "#1a3a5a", "#2a4a2a", "#4a2a6a"], bg: "#6a4a6a", eyes: ["narrow", "sleepy", "normal"], mouth: ["smirk", "flat", "frown"], brows: ["raised"], hair: ["slick", "long", "bun", "parted"], marks: { mustache: 0.35, glasses: 0.15, blush: 0.25, earring: 0.3 } }),
    rogue: K({ name: "ならず者", desc: "盗賊・ごろつき・用心棒・奴隷商人", age: [18, 48], female: 0.3, outfit: ["leather", "rags", "cloak"], head: ["bandana", "none", "hood"], gear: ["daggers", "none", "sword"], cloth: ["#4a3a2a", "#2e3a2e", "#3a2a3a", "#5a3a2a"], bg: "#4a4038", eyes: ["sharp", "narrow", "normal"], mouth: ["grin", "smirk", "frown"], brows: ["angry", "raised"], hair: ["messy", "spiky", "short", "long"], marks: { scar: 0.45, stubble: 0.45, eyepatch: 0.15, earring: 0.3, tattoo: 0.2 } }),
    child: K({ name: "子ども", desc: "町の子ども・孤児・スリの子", age: [7, 12], outfit: ["tunic", "rags", "apron"], head: ["none", "none", "cap"], cloth: ["#7a5a3a", "#5a7a8a", "#8a4a3a", "#6a7a4a"], bg: "#8a9a7a", eyes: ["round", "normal"], mouth: ["open", "smile", "frown"], brows: ["worried", "raised", "calm"], hair: ["messy", "short", "bob", "ponytail", "twintail"], marks: { freckles: 0.45, blush: 0.5, bandage: 0.25 } }),
    elder: K({ name: "老人", desc: "村の長老・隠者・占い婆", age: [66, 90], outfit: ["robe", "tunic", "cloak"], head: ["none", "none", "hood", "kerchief"], gear: ["none", "staff"], cloth: ["#5a5048", "#4a4a5a", "#6a5a3a"], bg: "#6a6258", eyes: ["narrow", "sleepy", "normal"], mouth: ["flat", "smile", "open"], brows: ["worried", "calm"], hair: ["bald", "receding", "long", "bun"], marks: { wrinkles: 1, beard: 0.45, bags: 0.6 } }),
    soldier: K({ name: "兵士", desc: "帝国兵・脱走兵・傭兵団の兵", age: [18, 45], female: 0.15, outfit: ["armor", "leather"], head: ["helmet", "none", "headband"], gear: ["sword", "spear"], cloth: ["#5a2a22", "#3a3a3a", "#4a4a2a"], bg: "#5a5048", eyes: ["sharp", "normal", "sleepy"], mouth: ["frown", "flat"], brows: ["angry", "worried"], hair: ["short", "messy", "spiky"], marks: { scar: 0.4, stubble: 0.5, bandage: 0.25 } }),
    knight: K({ name: "騎士", desc: "王国の騎士・近衛・聖騎士", age: [20, 50], female: 0.3, outfit: ["plate"], head: ["none", "none", "helmet"], gear: ["greatsword", "sword"], chest: ["crest"], cloth: ["#2a4a9a", "#8a2a2a", "#e0dcd0"], bg: "#4a5a7a", eyes: ["sharp", "normal"], mouth: ["flat", "smirk"], brows: ["angry", "calm", "raised"], hair: ["parted", "short", "long", "slick"], marks: { scar: 0.25, mustache: 0.15 } }),
    sailor: K({ name: "船乗り", desc: "水夫・船長・港の荒くれ・海賊", age: [18, 58], female: 0.25, outfit: ["sailor"], head: ["cap", "bandana", "none"], gear: ["none", "sword"], cloth: ["#2a3a6a", "#6a2a2a", "#2a2a2a"], bg: "#3a5a7a", eyes: ["normal", "narrow", "sharp"], mouth: ["grin", "open", "smirk"], brows: ["raised", "angry"], hair: ["messy", "short", "long"], marks: { beard: 0.35, earring: 0.5, tattoo: 0.25, scar: 0.25, eyepatch: 0.1 } }),
    mage: K({ name: "魔法使い", desc: "学院の魔法使い・魔女・呪い屋", age: [18, 70], outfit: ["robe"], head: ["wizard", "hood", "none", "circlet"], gear: ["staff"], chest: ["gem", "none"], cloth: ["#2a2a5a", "#4a1a4a", "#1a3a3a", "#5a1a1a"], trim: ["#c8a040", "#a8b0c8"], bg: "#3a3a6a", eyes: ["narrow", "normal", "sleepy"], mouth: ["smirk", "flat"], brows: ["raised", "calm"], hair: ["long", "parted", "messy", "bob"], marks: { glasses: 0.3, bags: 0.4, beard: 0.2, tattoo: 0.15 } }),
    ronin: K({ name: "シェルアークの人", desc: "島の剣士・船乗り・島の商人", age: [18, 60], female: 0.35, outfit: ["kimono"], head: ["none", "kasa", "headband", "none"], gear: ["katana", "none"], cloth: ["#2a2a3a", "#3a2a22", "#5a1a1a", "#2a3a4a"], bg: "#5a4a3a", eyes: ["narrow", "sharp", "normal"], mouth: ["flat", "smirk"], brows: ["angry", "calm"], hair: ["topknot", "ponytail", "long", "messy"], marks: { scar: 0.3, stubble: 0.3 } }),
    host: K({ name: "宿や酒場の主", desc: "宿の女将・酒場の親父・給仕", age: [25, 60], outfit: ["apron"], head: ["none", "kerchief", "none"], chest: ["none"], cloth: ["#6a4a2a", "#4a3a3a", "#5a5a3a"], bg: "#8a5a32", eyes: ["smile", "normal", "round"], mouth: ["smile", "grin", "open"], brows: ["raised", "calm"], hair: ["bun", "short", "bald", "ponytail"], marks: { mustache: 0.3, blush: 0.5, beard: 0.15 } }),
    beggar: K({ name: "物乞い・奴隷", desc: "路地の物乞い・奴隷・囚人・難民", age: [16, 70], outfit: ["rags"], head: ["none", "hood", "none"], chest: ["collar", "none"], cloth: ["#6a5e4e", "#5a5048", "#4a4a40"], bg: "#4a4640", eyes: ["sleepy", "round", "normal"], mouth: ["frown", "open", "flat"], brows: ["worried"], hair: ["messy", "long", "receding"], marks: { stubble: 0.5, bags: 0.6, bandage: 0.3, dirt: 0.8 } }),
    archer: K({ name: "弓使い", desc: "狩人・弓兵・森の民", age: [17, 45], outfit: ["leather", "cloak"], head: ["none", "hood", "none"], gear: ["bow"], cloth: ["#3a4a2a", "#4a3a22", "#2a3a3a"], bg: "#4a6a3a", eyes: ["sharp", "normal"], mouth: ["flat", "smirk", "smile"], brows: ["calm", "angry"], hair: ["ponytail", "long", "short", "messy"], marks: { freckles: 0.25, scar: 0.15 } }),
    adventurer: K({ name: "冒険者", desc: "旅の冒険者・剣士・同業者", age: [17, 45], outfit: ["leather", "tunic", "armor"], head: ["none", "none", "headband", "bandana"], gear: ["sword", "greatsword", "none"], cloth: ["#5a3a2a", "#3a4a5a", "#4a4a2a", "#5a2a2a"], bg: "#5a6a5a", eyes: ["normal", "sharp", "round"], mouth: ["smile", "smirk", "grin", "flat"], brows: ["calm", "raised", "angry"], hair: ["messy", "spiky", "short", "ponytail", "long"], marks: { scar: 0.3, stubble: 0.3, bandage: 0.2, freckles: 0.15 } }),
    majin: K({ name: "使徒（人の姿）", desc: "人に化けた使徒・眷属。格の違う、どこかまぬけな存在", age: [20, 40], outfit: ["coat"], head: ["none", "crown", "horns", "horns"], chest: ["gem"], cloth: ["#1a1422", "#2a0e14", "#101a22"], trim: ["#c8a040", "#b02a3a"], bg: "#2a1030", eyes: ["glow"], mouth: ["smirk", "grin"], brows: ["raised"], hair: ["long", "slick", "parted", "wild"], skin: ["#e6ddd8", "#d4d0e2", "#cfd8dc", "#e8d4d4", "#b8a8c8"], marks: { tattoo: 0.4, monocle: 0.3, blush: 0.2 } }),
  };
  // 主人公（職業ごと）
  const HERO = {
    merc: K({ name: "傭兵", outfit: ["leather", "armor"], head: ["none", "none", "headband", "bandana"], gear: ["sword", "greatsword"], cloth: ["#5a3a2a", "#6a2a22", "#3a3a3a", "#4a4a2a"], bg: "#6a4a3a", eyes: ["sharp", "normal"], mouth: ["flat", "smirk", "frown"], brows: ["angry", "calm"], hair: ["messy", "short", "spiky", "ponytail"], marks: { scar: 0.35, stubble: 0.45, bandage: 0.2 } }),
    thief: K({ name: "盗賊", outfit: ["cloak"], head: ["hood", "none", "bandana"], gear: ["daggers"], chest: ["none", "keys"], cloth: ["#2e3a2e", "#2a2a3a", "#3a2a3a", "#3a3430"], bg: "#3a4040", eyes: ["sharp", "narrow", "normal"], mouth: ["smirk", "grin"], brows: ["raised", "angry"], hair: ["messy", "short", "bob", "long"], marks: { earring: 0.4, freckles: 0.2, scar: 0.15 } }),
    mage: K({ name: "魔法使い", outfit: ["robe"], head: ["wizard", "none", "circlet", "wizard"], gear: ["staff"], chest: ["gem"], cloth: ["#2a2a5a", "#4a1a4a", "#5a1a1a", "#1a3a3a"], trim: ["#c8a040", "#a8b0c8"], bg: "#3a3a6a", eyes: ["normal", "narrow", "sleepy"], mouth: ["flat", "smirk", "smile"], brows: ["calm", "raised"], hair: ["long", "parted", "bob", "messy"], marks: { glasses: 0.25, bags: 0.3 } }),
    priest: K({ name: "破戒神官", outfit: ["vestment"], head: ["none", "none", "veil"], gear: ["mace"], chest: ["sun"], cloth: ["#ece6d6", "#d8d2c4"], trim: ["#8a2a2a", "#2e4d8f", "#b08a1e"], bg: "#9a8a5a", eyes: ["sleepy", "normal", "narrow"], mouth: ["smirk", "smile", "grin"], brows: ["raised", "calm"], hair: ["messy", "short", "long", "parted"], marks: { stubble: 0.45, bags: 0.4, blush: 0.35 } }),
    samurai: K({ name: "侍", outfit: ["kimono"], armor: true, head: ["none", "headband", "none"], gear: ["katana"], cloth: ["#2a2a3a", "#3a2a22", "#1a2a3a", "#4a1a1a"], bg: "#6a4a3a", eyes: ["sharp", "narrow", "normal"], mouth: ["flat", "frown", "smirk"], brows: ["angry", "calm"], hair: ["topknot", "ponytail", "messy", "long"], marks: { scar: 0.25, stubble: 0.25 } }),
  };
  const FEMALE_HAIR = ["long", "ponytail", "bob", "bun", "parted", "long", "twintail", "braid"];
  const MALE_HAIR = ["short", "messy", "spiky", "parted", "slick", "short", "swept"];

  // ---------------------------------------------------------------- 見た目を決める（純粋な関数）
  G.personLook = (who) => {
    who = who || {};
    const hero = who.kind === "hero";
    const spec = hero ? HERO[who.cls] || G.PEOPLE.adventurer : G.PEOPLE[who.kind] || G.PEOPLE.villager;
    const seed = String(who.seed || who.kind || "someone");
    const R = rng("person:" + (who.kind || "") + ":" + seed);
    const sex = who.sex === "男" || who.sex === "女" ? who.sex : R() < spec.female ? "女" : "男";
    const female = sex === "女";
    const age = Number(who.age) > 0 ? Number(who.age) : Math.round(spec.age[0] + R() * (spec.age[1] - spec.age[0]));
    const band = age < 13 ? "child" : age >= 60 ? "old" : age >= 38 ? "mid" : "young";
    const L = {
      kind: who.kind || "villager", sex, age, band,
      skin: pickR(R, spec.skin || SKINS),
      hair: pickR(R, HAIRS), hairStyle: pickR(R, spec.hair || (female ? FEMALE_HAIR : MALE_HAIR)),
      iris: pickR(R, IRIS), iris2: null,
      face: pickR(R, female ? ["oval", "round", "long", "oval"] : ["oval", "square", "long", "round", "thin"]),
      eyes: pickR(R, spec.eyes), mouth: pickR(R, spec.mouth), brows: pickR(R, spec.brows),
      build: pickR(R, ["normal", "normal", "broad", "slim"]), hunch: false,
      outfit: pickR(R, spec.outfit), head: pickR(R, spec.head), gear: pickR(R, spec.gear), chest: pickR(R, spec.chest),
      cloth: pickR(R, spec.cloth), trim: pickR(R, spec.trim || ["#c8a040", "#8a8a8a", "#6a4a2a"]),
      armor: !!spec.armor, bg: spec.bg, marks: [],
    };
    // 性別・年齢で合わない部品を直す
    if (female && ["receding", "bald"].includes(L.hairStyle)) L.hairStyle = pickR(R, ["bun", "long"]);
    if (!female && L.head === "veil") L.head = "none";
    if (!female && L.hairStyle === "bob") L.hairStyle = "messy";
    if (!female && (L.hairStyle === "twintail" || L.hairStyle === "braid")) L.hairStyle = "ponytail";
    if (band === "old") { L.hair = pickR(R, ["#e2ded6", "#c8c4bc", "#9a9690", "#7a7672"]); }
    if (band === "mid" && R() < 0.4) L.streak = true;
    if (L.kind === "majin") { L.hair = pickR(R, ["#e8e4ec", "#1a1422", "#8a1a2a", "#4a2a6a", "#c8a040"]); L.iris = pickR(R, ["#ff3a3a", "#ffb02a", "#b04aff", "#3affc8"]); L.ears = "pointy"; }
    Object.entries(spec.marks).forEach(([m, p]) => { if (R() < p) L.marks.push(m); });
    // 印の組み合わせを整える
    const has = (m) => L.marks.includes(m);
    const drop = (m) => { L.marks = L.marks.filter((x) => x !== m); };
    if (female) ["stubble", "beard", "mustache"].forEach(drop);
    if (band === "child") ["stubble", "beard", "mustache", "wrinkles", "scar", "tattoo", "eyepatch"].forEach(drop);
    if (band === "old" && !has("wrinkles")) L.marks.push("wrinkles");
    if (has("beard")) drop("stubble");
    if (has("eyepatch")) { drop("glasses"); drop("monocle"); if (L.eyes === "smile") L.eyes = "normal"; }
    // 主人公：外見の文と職業から
    if (hero) applyText(L, who.text || "", R);
    if (who.look) Object.assign(L, who.look);
    L.marks = L.marks.slice();
    L.seed = "part:" + (who.kind || "") + ":" + seed;
    return L;
  };
  // 外見の文（「銀髪、鋭い目つき、大柄な体」など）を部品に移す
  function applyText(L, t, R) {
    const add = (m) => { if (!L.marks.includes(m)) L.marks.push(m); };
    for (const [re, c, extra] of HAIR_WORDS) if (re.test(t)) { L.hair = c; L.streak = extra === "streak"; break; }
    if (/鋭い/.test(t)) { L.eyes = "sharp"; L.brows = "angry"; }
    if (/眠たげ|眠そう/.test(t)) { L.eyes = "sleepy"; L.brows = "calm"; }
    if (/左右で色の違う|オッドアイ/.test(t)) { L.iris2 = pickR(R, ["#c8a040", "#3a8aca", "#6ab04a", "#b04a4a"].filter((c) => c !== L.iris)); if (L.eyes === "smile" || L.eyes === "narrow") L.eyes = "normal"; }
    if (/傷/.test(t)) add("scar");
    if (/そばかす/.test(t)) add("freckles");
    if (/人懐っこい|笑顔/.test(t)) { L.eyes = "smile"; L.mouth = "smile"; L.brows = "raised"; }
    if (/感情の読めない|無表情/.test(t)) { L.eyes = "narrow"; L.mouth = "flat"; L.brows = "calm"; }
    if (/眼帯/.test(t)) { add("eyepatch"); L.marks = L.marks.filter((x) => x !== "glasses"); }
    if (/眼鏡|めがね/.test(t)) add("glasses");
    if (/髭|ひげ/.test(t) && L.sex === "男") add("beard");
    if (/禿|坊主|スキンヘッド/.test(t)) L.hairStyle = "bald";
    if (/長い髪|長髪/.test(t)) L.hairStyle = "long";
    if (/短い髪|短髪/.test(t)) L.hairStyle = "short";
    if (/大柄|筋骨|たくましい/.test(t)) L.build = "broad";
    if (/小柄|痩せ|しなやか|華奢/.test(t)) L.build = "slim";
    if (/痩せぎす/.test(t)) add("gaunt");
    if (/猫背/.test(t)) L.hunch = true;
    if (/姿勢のいい/.test(t)) L.hunch = false;
  }

  // ---------------------------------------------------------------- 主人公・仲間・出来事から who を作る
  G.heroWho = (p, cls) => {
    p = p || {};
    return { kind: "hero", cls: cls || "merc", seed: `${cls}:${p.name || ""}`, sex: p.sex, age: parseInt(p.age, 10) || 24, text: [p.look, p.personality].filter(Boolean).join("、") };
  };
  // 仲間の職業の名前 → 人物の種類
  const COMP_KIND = { 傭兵: "adventurer", 弓使い: "archer", 僧侶: "priest", 魔法使い: "mage", ならず者: "rogue", 剣士: "adventurer", 槍兵: "soldier", 元帝国兵: "soldier", 侍: "ronin", 浪人: "ronin", 島の剣士: "ronin", 騎士: "knight", 神官: "priest", 盗賊: "rogue", 船乗り: "sailor", 商人: "merchant", 子ども: "child" };
  // 仲間になる魔物（名前に含まれる言葉 → 敵の id。モンスターの絵で描く）
  const COMP_FOE = [[/ゴブ/, "barrelgob"], [/スライム/, "slime"], [/狼/, "wolf"], [/土偶/, "dogu"]];
  // 出来事で仲間になる、名前の決まった人（名前に含まれる言葉 → who）。出来事の絵と同じ顔にする
  const COMP_NAMED = [
    [/鍋かぶりのゴブ/, { kind: "foe", foe: "goblin", look: { extra: ["nose", "pot"], weapon: "none", eyes: "googly", mouth: "grin", mood: "silly" } }],
    [/茹で騎士ガストン/, { kind: "knight", sex: "男", age: 34, look: { head: "none", brows: "worried", mouth: "open", marks: ["blush", "stubble"] } }],
    [/脱走兵ヨアヒム/, { kind: "soldier", sex: "男", look: { head: "none", brows: "worried", marks: ["stubble", "bags"] } }],
  ];
  G.companionWho = (c) => {
    c = c || {};
    const name = String(c.name || "");
    if (c.who) return typeof c.who === "string" ? { kind: c.who, seed: name } : Object.assign({ seed: name }, c.who);
    for (const [re, who] of COMP_NAMED) if (re.test(name)) return Object.assign({ seed: name }, who);
    for (const [re, id] of COMP_FOE) if (re.test(name) || re.test(c.cls || "")) return { kind: "foe", foe: id, seed: name };
    const P = G.data && G.data.PROFILE;
    let sex;
    if (P) for (const cul of Object.values(P.names)) for (const [sx, list] of Object.entries(cul)) if (list.some((n) => name.includes(n))) sex = sx;
    const kind = COMP_KIND[c.cls] || Object.keys(COMP_KIND).map((k) => (name.includes(k) ? COMP_KIND[k] : null)).find(Boolean) || "adventurer";
    return { kind, seed: name, sex };
  };
  // 出来事の who: "<種類>" か { kind, sex, age, look }。書いていなければ null（絵を出さない）
  // 出来事のデータに who が無ければ、src/data/events_who.js の表（G.data.EVENT_WHO）を見る
  G.eventWho = (e) => {
    const src = e && (e.who || (G.data && G.data.EVENT_WHO && G.data.EVENT_WHO[e.id]));
    if (!src) return null;
    const w = typeof src === "string" ? { kind: src } : Object.assign({}, src);
    w.seed = w.seed || `ev:${e.id}`;
    return w;
  };

  // 施設の人：王城では、玉座の主（王都は灰銀の髪の国王ヴァレオン、帝都は病床の皇帝に代わる宰相）。王位を奪ったあとは出さない
  const FAC_WHO = {
    castle: {
      leavel: { kind: "noble", sex: "男", age: 58, name: "国王ヴァレオン", seed: "c2:valeon", look: { hair: "#b8b8bc", hairStyle: "wild", eyes: "sharp", iris: "#c8902a", mouth: "grin", brows: "angry", outfit: "plate", head: "crown", gear: "greatsword", chest: "crest", cloth: "#5a1a1a", build: "broad", marks: ["beard", "scar"], bg: "#8a6a3a" } },
      garmund: { kind: "noble", sex: "男", age: 64, name: "宰相", seed: "fac:garmund:chancellor", look: { head: "none", eyes: "narrow", mouth: "flat", brows: "calm", hairStyle: "slick", cloth: "#1a1a22", chest: "chain", bg: "#3a3a44", marks: ["wrinkles", "bags"] } },
    },
  };
  G.facWho = (S) => {
    if (!S || S.mode !== "fac" || !FAC_WHO[S.fac]) return null;
    if (S.fac === "castle" && S.flags && S.flags.throne) return null;
    const w = FAC_WHO[S.fac][S.loc];
    return w ? Object.assign({}, w, { look: Object.assign({}, w.look) }) : null;
  };
  G.FAC_WHO = FAC_WHO;


  // ---------------------------------------------------------------- 入口（A10：canvas では描かない）
  // 持ち主の決定で、人を canvas で描くのはやめた（生成画像の人の中に古い絵柄が混ざらないように）。ここは「絵を出さない」だけ。
  // 生成画像のある人は v4_assets.js が包んで描く。無い人・読めない人は枠を空けて、canvas に noart の印を付ける（CSS で隠す）
  G.blankPortrait = (cv) => {
    if (!cv) return;
    const ctx = cv.getContext && cv.getContext("2d");
    if (ctx && ctx.clearRect) { if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width || 0, cv.height || 0); }
    if (cv.classList && cv.classList.add) cv.classList.add("noart");
  };
  G.drawPortrait = (cv, who) => { if (cv && who) G.blankPortrait(cv); };
})(globalThis.G = globalThis.G || {});
