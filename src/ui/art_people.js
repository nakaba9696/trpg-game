// 人物の絵（主人公・仲間・出来事の人物）。画像ファイルは使わず、部品（顔の形・髪・目・眉・口・肌・服・かぶり物・装備・傷や年齢の印）を
// 組み合わせて canvas に胸から上を描く。
// G.PEOPLE                     … 人物の種類の表（出来事の who に書ける名前。name / desc は一覧用）
// G.personLook(who)            … 見た目の指定を決める（DOM なし。テストからも呼べる）
// G.paintPerson(ctx, x, y, w, h, who) … 枠 (x, y, w, h) に描く
// G.drawPortrait(canvas, who)  … 画面から呼ぶ入口はここ1か所。将来、手元で作った画像に差し替えるならここを変える
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
  const hex = (c) => { const n = parseInt(String(c).slice(1, 7), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const x = hex(a), y = hex(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
  const pickR = (R, a) => a[Math.floor(R() * a.length)];
  const INK = "#1a1418";
  const TAU = Math.PI * 2;

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
    child: K({ name: "子ども", desc: "町の子ども・孤児・スリの子", age: [7, 12], outfit: ["tunic", "rags", "apron"], head: ["none", "none", "cap"], cloth: ["#7a5a3a", "#5a7a8a", "#8a4a3a", "#6a7a4a"], bg: "#8a9a7a", eyes: ["round", "normal"], mouth: ["open", "smile", "frown"], brows: ["worried", "raised", "calm"], hair: ["messy", "short", "bob", "ponytail"], marks: { freckles: 0.45, blush: 0.5, bandage: 0.25 } }),
    elder: K({ name: "老人", desc: "村の長老・隠者・占い婆", age: [66, 90], outfit: ["robe", "tunic", "cloak"], head: ["none", "none", "hood", "kerchief"], gear: ["none", "staff"], cloth: ["#5a5048", "#4a4a5a", "#6a5a3a"], bg: "#6a6258", eyes: ["narrow", "sleepy", "normal"], mouth: ["flat", "smile", "open"], brows: ["worried", "calm"], hair: ["bald", "receding", "long", "bun"], marks: { wrinkles: 1, beard: 0.45, bags: 0.6 } }),
    soldier: K({ name: "兵士", desc: "帝国兵・脱走兵・傭兵団の兵", age: [18, 45], female: 0.15, outfit: ["armor", "leather"], head: ["helmet", "none", "headband"], gear: ["sword", "spear"], cloth: ["#5a2a22", "#3a3a3a", "#4a4a2a"], bg: "#5a5048", eyes: ["sharp", "normal", "sleepy"], mouth: ["frown", "flat"], brows: ["angry", "worried"], hair: ["short", "messy", "spiky"], marks: { scar: 0.4, stubble: 0.5, bandage: 0.25 } }),
    knight: K({ name: "騎士", desc: "王国の騎士・近衛・聖騎士", age: [20, 50], female: 0.3, outfit: ["plate"], head: ["none", "none", "helmet"], gear: ["greatsword", "sword"], chest: ["crest"], cloth: ["#2a4a9a", "#8a2a2a", "#e0dcd0"], bg: "#4a5a7a", eyes: ["sharp", "normal"], mouth: ["flat", "smirk"], brows: ["angry", "calm", "raised"], hair: ["parted", "short", "long", "slick"], marks: { scar: 0.25, mustache: 0.15 } }),
    sailor: K({ name: "船乗り", desc: "水夫・船長・港の荒くれ・海賊", age: [18, 58], female: 0.25, outfit: ["sailor"], head: ["cap", "bandana", "none"], gear: ["none", "sword"], cloth: ["#2a3a6a", "#6a2a2a", "#2a2a2a"], bg: "#3a5a7a", eyes: ["normal", "narrow", "sharp"], mouth: ["grin", "open", "smirk"], brows: ["raised", "angry"], hair: ["messy", "short", "long"], marks: { beard: 0.35, earring: 0.5, tattoo: 0.25, scar: 0.25, eyepatch: 0.1 } }),
    mage: K({ name: "魔法使い", desc: "学院の魔法使い・魔女・呪い屋", age: [18, 70], outfit: ["robe"], head: ["wizard", "hood", "none", "circlet"], gear: ["staff"], chest: ["gem", "none"], cloth: ["#2a2a5a", "#4a1a4a", "#1a3a3a", "#5a1a1a"], trim: ["#c8a040", "#a8b0c8"], bg: "#3a3a6a", eyes: ["narrow", "normal", "sleepy"], mouth: ["smirk", "flat"], brows: ["raised", "calm"], hair: ["long", "parted", "messy", "bob"], marks: { glasses: 0.3, bags: 0.4, beard: 0.2, tattoo: 0.15 } }),
    ronin: K({ name: "八雲の人", desc: "侍・浪人・巫女・八雲の商人", age: [18, 60], female: 0.35, outfit: ["kimono"], head: ["none", "kasa", "headband", "none"], gear: ["katana", "none"], cloth: ["#2a2a3a", "#3a2a22", "#5a1a1a", "#2a3a4a"], bg: "#5a4a3a", eyes: ["narrow", "sharp", "normal"], mouth: ["flat", "smirk"], brows: ["angry", "calm"], hair: ["topknot", "ponytail", "long", "messy"], marks: { scar: 0.3, stubble: 0.3 } }),
    host: K({ name: "宿や酒場の主", desc: "宿の女将・酒場の親父・給仕", age: [25, 60], outfit: ["apron"], head: ["none", "kerchief", "none"], chest: ["none"], cloth: ["#6a4a2a", "#4a3a3a", "#5a5a3a"], bg: "#8a5a32", eyes: ["smile", "normal", "round"], mouth: ["smile", "grin", "open"], brows: ["raised", "calm"], hair: ["bun", "short", "bald", "ponytail"], marks: { mustache: 0.3, blush: 0.5, beard: 0.15 } }),
    beggar: K({ name: "物乞い・奴隷", desc: "路地の物乞い・奴隷・囚人・難民", age: [16, 70], outfit: ["rags"], head: ["none", "hood", "none"], chest: ["collar", "none"], cloth: ["#6a5e4e", "#5a5048", "#4a4a40"], bg: "#4a4640", eyes: ["sleepy", "round", "normal"], mouth: ["frown", "open", "flat"], brows: ["worried"], hair: ["messy", "long", "receding"], marks: { stubble: 0.5, bags: 0.6, bandage: 0.3, dirt: 0.8 } }),
    archer: K({ name: "弓使い", desc: "狩人・弓兵・森の民", age: [17, 45], outfit: ["leather", "cloak"], head: ["none", "hood", "none"], gear: ["bow"], cloth: ["#3a4a2a", "#4a3a22", "#2a3a3a"], bg: "#4a6a3a", eyes: ["sharp", "normal"], mouth: ["flat", "smirk", "smile"], brows: ["calm", "angry"], hair: ["ponytail", "long", "short", "messy"], marks: { freckles: 0.25, scar: 0.15 } }),
    adventurer: K({ name: "冒険者", desc: "旅の冒険者・剣士・同業者", age: [17, 45], outfit: ["leather", "tunic", "armor"], head: ["none", "none", "headband", "bandana"], gear: ["sword", "greatsword", "none"], cloth: ["#5a3a2a", "#3a4a5a", "#4a4a2a", "#5a2a2a"], bg: "#5a6a5a", eyes: ["normal", "sharp", "round"], mouth: ["smile", "smirk", "grin", "flat"], brows: ["calm", "raised", "angry"], hair: ["messy", "spiky", "short", "ponytail", "long"], marks: { scar: 0.3, stubble: 0.3, bandage: 0.2, freckles: 0.15 } }),
    majin: K({ name: "魔人（人の姿）", desc: "人に化けた魔人・使徒。格の違う、どこかまぬけな存在", age: [20, 40], outfit: ["coat"], head: ["none", "crown", "horns", "horns"], chest: ["gem"], cloth: ["#1a1422", "#2a0e14", "#101a22"], trim: ["#c8a040", "#b02a3a"], bg: "#2a1030", eyes: ["glow"], mouth: ["smirk", "grin"], brows: ["raised"], hair: ["long", "slick", "parted", "wild"], skin: ["#e6ddd8", "#d4d0e2", "#cfd8dc", "#e8d4d4", "#b8a8c8"], marks: { tattoo: 0.4, monocle: 0.3, blush: 0.2 } }),
  };
  // 主人公（職業ごと）
  const HERO = {
    merc: K({ name: "傭兵", outfit: ["leather", "armor"], head: ["none", "none", "headband", "bandana"], gear: ["sword", "greatsword"], cloth: ["#5a3a2a", "#6a2a22", "#3a3a3a", "#4a4a2a"], bg: "#6a4a3a", eyes: ["sharp", "normal"], mouth: ["flat", "smirk", "frown"], brows: ["angry", "calm"], hair: ["messy", "short", "spiky", "ponytail"], marks: { scar: 0.35, stubble: 0.45, bandage: 0.2 } }),
    thief: K({ name: "盗賊", outfit: ["cloak"], head: ["hood", "none", "bandana"], gear: ["daggers"], chest: ["none", "keys"], cloth: ["#2e3a2e", "#2a2a3a", "#3a2a3a", "#3a3430"], bg: "#3a4040", eyes: ["sharp", "narrow", "normal"], mouth: ["smirk", "grin"], brows: ["raised", "angry"], hair: ["messy", "short", "bob", "long"], marks: { earring: 0.4, freckles: 0.2, scar: 0.15 } }),
    mage: K({ name: "魔法使い", outfit: ["robe"], head: ["wizard", "none", "circlet", "wizard"], gear: ["staff"], chest: ["gem"], cloth: ["#2a2a5a", "#4a1a4a", "#5a1a1a", "#1a3a3a"], trim: ["#c8a040", "#a8b0c8"], bg: "#3a3a6a", eyes: ["normal", "narrow", "sleepy"], mouth: ["flat", "smirk", "smile"], brows: ["calm", "raised"], hair: ["long", "parted", "bob", "messy"], marks: { glasses: 0.25, bags: 0.3 } }),
    priest: K({ name: "破戒神官", outfit: ["vestment"], head: ["none", "none", "veil"], gear: ["mace"], chest: ["sun"], cloth: ["#ece6d6", "#d8d2c4"], trim: ["#8a2a2a", "#2e4d8f", "#b08a1e"], bg: "#9a8a5a", eyes: ["sleepy", "normal", "narrow"], mouth: ["smirk", "smile", "grin"], brows: ["raised", "calm"], hair: ["messy", "short", "long", "parted"], marks: { stubble: 0.45, bags: 0.4, blush: 0.35 } }),
    samurai: K({ name: "侍", outfit: ["kimono"], armor: true, head: ["none", "headband", "none"], gear: ["katana"], cloth: ["#2a2a3a", "#3a2a22", "#1a2a3a", "#4a1a1a"], bg: "#6a4a3a", eyes: ["sharp", "narrow", "normal"], mouth: ["flat", "frown", "smirk"], brows: ["angry", "calm"], hair: ["topknot", "ponytail", "messy", "long"], marks: { scar: 0.25, stubble: 0.25 } }),
  };
  const FEMALE_HAIR = ["long", "ponytail", "bob", "bun", "parted", "long"];
  const MALE_HAIR = ["short", "messy", "spiky", "parted", "slick", "short"];

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
  const COMP_KIND = { 傭兵: "adventurer", 弓使い: "archer", 僧侶: "priest", 魔法使い: "mage", ならず者: "rogue", 剣士: "adventurer", 槍兵: "soldier", 元帝国兵: "soldier", 侍: "ronin", 浪人: "ronin", 騎士: "knight", 神官: "priest", 盗賊: "rogue", 船乗り: "sailor", 商人: "merchant", 子ども: "child" };
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

  // 施設の人：王城では、玉座の主（聖王都は灰銀の髪の国王ヴァレオン、帝都は病床の皇帝に代わる宰相）。王位を奪ったあとは出さない
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

  // ---------------------------------------------------------------- 描く道具
  function ellipse(ctx, x, y, rx, ry, rot) { ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function paint(ctx, fill, lw, path) {
    ctx.beginPath(); path(); ctx.fillStyle = fill; ctx.fill();
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke(); }
  }
  function line(ctx, c, w, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
  }
  function vgrad(ctx, y0, y1, c) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, mix(c, "#ffffff", 0.18)); g.addColorStop(0.5, c); g.addColorStop(1, mix(c, "#000000", 0.35));
    return g;
  }
  function rgrad(ctx, x, y, r, c) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.25);
    g.addColorStop(0, mix(c, "#ffffff", 0.2)); g.addColorStop(0.65, c); g.addColorStop(1, mix(c, "#000000", 0.16));
    return g;
  }
  // 顔の輪郭（上は楕円、下はあごの角ばり jaw で変わる）
  function facePath(ctx, cx, cy, rx, ry, jaw) {
    ctx.moveTo(cx - rx, cy);
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, TAU);
    ctx.bezierCurveTo(cx + rx, cy + ry * 0.55, cx + rx * jaw, cy + ry * 0.92, cx, cy + ry);
    ctx.bezierCurveTo(cx - rx * jaw, cy + ry * 0.92, cx - rx, cy + ry * 0.55, cx - rx, cy);
  }
  const FACES = { oval: [1, 1, 0.62], round: [1.07, 0.95, 0.8], square: [1.04, 0.98, 0.9], long: [0.93, 1.08, 0.6], thin: [0.9, 1.02, 0.48] };

  // ---------------------------------------------------------------- 背景
  function backdrop(ctx, L, x, y, w, h) {
    const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.38, h * 0.05, x + w * 0.5, y + h * 0.5, h * 0.85);
    g.addColorStop(0, mix(L.bg, "#ffffff", 0.28)); g.addColorStop(0.55, L.bg); g.addColorStop(1, mix(L.bg, "#000000", 0.6));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (L.kind === "majin") {
      // 立ちのぼる黒い気
      const R = rng(L.seed + ":aura");
      for (let i = 0; i < 14; i++) {
        const px = x + R() * w, py = y + h * (0.5 + R() * 0.5), hh = h * (0.3 + R() * 0.4);
        ctx.fillStyle = rgba(i % 3 ? "#000000" : L.iris, 0.1 + R() * 0.1);
        ctx.beginPath(); ctx.moveTo(px - w * 0.04, py); ctx.quadraticCurveTo(px - w * 0.08, py - hh * 0.6, px + (R() - 0.5) * w * 0.1, py - hh); ctx.quadraticCurveTo(px + w * 0.06, py - hh * 0.5, px + w * 0.04, py); ctx.fill();
      }
    }
  }

  // ---------------------------------------------------------------- 背負った装備（体の後ろ）
  function gearBack(ctx, L, cx, y0, U, W) {
    const lw = U * 0.008;
    const metal = "#b8bcc4", wood = "#6a4a2a", grip = "#3a2a22";
    const g = L.gear;
    if (g === "sword" || g === "greatsword") {
      const big = g === "greatsword" ? 1.35 : 1;
      const side = g === "greatsword" ? -1 : 1;
      ctx.save(); ctx.translate(cx + side * W * 0.24, y0 - U * 0.04); ctx.rotate(side * 0.5);
      paint(ctx, metal, lw, () => ctx.rect(-U * 0.022 * big, 0, U * 0.044 * big, U * 0.4));
      paint(ctx, "#8a7a4a", lw, () => ctx.rect(-U * 0.075 * big, -U * 0.012, U * 0.15 * big, U * 0.026));
      paint(ctx, grip, lw, () => ctx.rect(-U * 0.016, -U * 0.1 * big, U * 0.032, U * 0.09 * big));
      paint(ctx, "#c8a040", lw, () => ellipse(ctx, 0, -U * 0.11 * big, U * 0.024, U * 0.024));
      ctx.restore();
    } else if (g === "katana") {
      ctx.save(); ctx.translate(cx - W * 0.26, y0 + U * 0.02); ctx.rotate(-0.75);
      paint(ctx, "#1a1a22", lw, () => ctx.rect(-U * 0.02, 0, U * 0.04, U * 0.4));
      paint(ctx, "#8a7a4a", lw, () => ellipse(ctx, 0, 0, U * 0.045, U * 0.014));
      paint(ctx, "#e8e2d4", lw, () => ctx.rect(-U * 0.017, -U * 0.14, U * 0.034, U * 0.14));
      ctx.strokeStyle = "#1a1a22"; ctx.lineWidth = lw * 1.2;
      for (let i = 0; i < 5; i++) { const t = -U * 0.13 + i * U * 0.026; ctx.beginPath(); ctx.moveTo(-U * 0.017, t); ctx.lineTo(U * 0.017, t + U * 0.02); ctx.moveTo(U * 0.017, t); ctx.lineTo(-U * 0.017, t + U * 0.02); ctx.stroke(); }
      ctx.restore();
    } else if (g === "daggers") {
      for (const a of [-0.55, 0.35]) {
        ctx.save(); ctx.translate(cx + W * 0.25, y0 - U * 0.0); ctx.rotate(a);
        paint(ctx, metal, lw, () => { ctx.moveTo(-U * 0.015, 0); ctx.lineTo(0, -U * 0.02); ctx.lineTo(U * 0.015, 0); ctx.lineTo(U * 0.012, U * 0.2); ctx.lineTo(-U * 0.012, U * 0.2); });
        paint(ctx, grip, lw, () => ctx.rect(-U * 0.013, -U * 0.08, U * 0.026, U * 0.07));
        paint(ctx, "#8a7a4a", lw, () => ctx.rect(-U * 0.035, -U * 0.015, U * 0.07, U * 0.016));
        ctx.restore();
      }
    } else if (g === "mace") {
      ctx.save(); ctx.translate(cx + W * 0.27, y0 - U * 0.02); ctx.rotate(0.35);
      paint(ctx, wood, lw, () => ctx.rect(-U * 0.012, -U * 0.06, U * 0.024, U * 0.4));
      paint(ctx, "#8a8e96", lw, () => { for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.moveTo(0, -U * 0.1); ctx.lineTo(Math.cos(a) * U * 0.055, -U * 0.1 + Math.sin(a) * U * 0.055); } ellipse(ctx, 0, -U * 0.1, U * 0.04, U * 0.04); });
      paint(ctx, "#8a8e96", lw, () => ellipse(ctx, 0, -U * 0.1, U * 0.042, U * 0.042));
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; paint(ctx, "#a8acb4", lw * 0.7, () => { ctx.moveTo(Math.cos(a - 0.3) * U * 0.035, -U * 0.1 + Math.sin(a - 0.3) * U * 0.035); ctx.lineTo(Math.cos(a) * U * 0.07, -U * 0.1 + Math.sin(a) * U * 0.07); ctx.lineTo(Math.cos(a + 0.3) * U * 0.035, -U * 0.1 + Math.sin(a + 0.3) * U * 0.035); }); }
      ctx.restore();
    } else if (g === "staff") {
      const sx = cx + W * 0.36;
      paint(ctx, wood, lw, () => { ctx.moveTo(sx - U * 0.014, U * 1.2); ctx.lineTo(sx - U * 0.012, y0 - U * 0.32); ctx.lineTo(sx + U * 0.012, y0 - U * 0.32); ctx.lineTo(sx + U * 0.014, U * 1.2); });
      ctx.strokeStyle = INK; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(sx, y0 - U * 0.3); ctx.bezierCurveTo(sx - U * 0.07, y0 - U * 0.36, sx - U * 0.05, y0 - U * 0.46, sx, y0 - U * 0.45); ctx.bezierCurveTo(sx + U * 0.05, y0 - U * 0.46, sx + U * 0.07, y0 - U * 0.36, sx, y0 - U * 0.3); ctx.fillStyle = wood; ctx.fill(); ctx.stroke();
      const gem = L.kind === "majin" ? L.iris : L.kind === "priest" ? "#ffe08a" : "#6ad0ff";
      ctx.shadowColor = gem; ctx.shadowBlur = U * 0.06;
      paint(ctx, gem, lw * 0.7, () => ellipse(ctx, sx, y0 - U * 0.38, U * 0.028, U * 0.034));
      ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
      ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ellipse(ctx, sx - U * 0.008, y0 - U * 0.39, U * 0.008, U * 0.01); ctx.fill();
    } else if (g === "spear") {
      const sx = cx + W * 0.37;
      paint(ctx, wood, lw, () => ctx.rect(sx - U * 0.012, y0 - U * 0.36, U * 0.024, U * 1.2));
      paint(ctx, metal, lw, () => { ctx.moveTo(sx, y0 - U * 0.56); ctx.quadraticCurveTo(sx + U * 0.04, y0 - U * 0.44, sx + U * 0.02, y0 - U * 0.36); ctx.lineTo(sx - U * 0.02, y0 - U * 0.36); ctx.quadraticCurveTo(sx - U * 0.04, y0 - U * 0.44, sx, y0 - U * 0.56); });
      paint(ctx, "#8a2a2a", 0, () => { ctx.moveTo(sx - U * 0.015, y0 - U * 0.35); ctx.lineTo(sx + U * 0.015, y0 - U * 0.35); ctx.lineTo(sx + U * 0.03, y0 - U * 0.27); ctx.lineTo(sx - U * 0.03, y0 - U * 0.27); });
    } else if (g === "bow") {
      const bx = cx - W * 0.2;
      ctx.lineCap = "round";
      ctx.strokeStyle = INK; ctx.lineWidth = U * 0.026; ctx.beginPath(); ctx.moveTo(bx - U * 0.2, y0 + U * 0.12); ctx.quadraticCurveTo(bx - U * 0.02, y0 - U * 0.36, bx + U * 0.22, y0 - U * 0.3); ctx.stroke();
      ctx.strokeStyle = wood; ctx.lineWidth = U * 0.014; ctx.stroke();
      line(ctx, "#e8e2d0", lw * 0.8, [bx - U * 0.2, y0 + U * 0.12, bx + U * 0.22, y0 - U * 0.3]);
      // 矢筒の矢羽
      for (let i = 0; i < 3; i++) paint(ctx, ["#b04a3a", "#e8e2d0", "#4a6a8a"][i], lw * 0.6, () => { const fx = cx + W * 0.2 + i * U * 0.03, fy = y0 - U * 0.06 - i * U * 0.01; ctx.moveTo(fx, fy); ctx.lineTo(fx + U * 0.02, fy - U * 0.06); ctx.lineTo(fx + U * 0.035, fy + U * 0.005); });
    }
  }

  // ---------------------------------------------------------------- 体と服
  function body(ctx, L, cx, y0, U, W, bottom, neckW, S) {
    const lw = U * 0.008;
    const sw = W * ({ broad: 0.47, slim: 0.37, normal: 0.42 }[L.build] || 0.42) * (L.band === "child" ? 0.78 : 1) * (L.sex === "女" ? 0.94 : 1);
    const drop = U * (L.hunch ? 0.1 : 0.075);
    const trunk = () => {
      ctx.moveTo(cx - neckW * 1.4, y0);
      ctx.quadraticCurveTo(cx - sw * 0.95, y0 + drop * 0.1, cx - sw, y0 + drop);
      ctx.quadraticCurveTo(cx - sw * 1.1, y0 + drop * 2, cx - sw * 1.08, bottom + 2);
      ctx.lineTo(cx + sw * 1.08, bottom + 2);
      ctx.quadraticCurveTo(cx + sw * 1.1, y0 + drop * 2, cx + sw, y0 + drop);
      ctx.quadraticCurveTo(cx + sw * 0.95, y0 + drop * 0.1, cx + neckW * 1.4, y0);
      ctx.closePath();
    };
    const o = L.outfit;
    const base = o === "armor" || o === "plate" ? "#9aa0aa" : L.cloth;
    paint(ctx, vgrad(ctx, y0, bottom, base), lw, trunk);
    // 服の上に重ねるものは胴の形で切り抜く
    ctx.save(); ctx.beginPath(); trunk(); ctx.clip();
    const midY = y0 + (bottom - y0) * 0.5;
    const neckline = (depth, c) => paint(ctx, c || S.skin, lw * 0.8, () => { ctx.moveTo(cx - neckW * 1.2, y0 - 1); ctx.quadraticCurveTo(cx, y0 + depth * 1.4, cx + neckW * 1.2, y0 - 1); });
    const vneck = (depth, c) => paint(ctx, c || S.skin, lw * 0.8, () => { ctx.moveTo(cx - neckW * 1.3, y0 - 1); ctx.lineTo(cx, y0 + depth); ctx.lineTo(cx + neckW * 1.3, y0 - 1); });
    const R = rng(L.seed + ":cloth");
    if (o === "tunic") {
      if (L.sex === "女") neckline(U * 0.06); else vneck(U * 0.07);
      line(ctx, mix(L.cloth, "#000000", 0.35), lw, [cx, y0 + U * 0.07, cx, bottom]);
      for (let i = 0; i < 3; i++) paint(ctx, mix(L.cloth, "#ffffff", 0.4), lw * 0.5, () => ellipse(ctx, cx + U * 0.015, y0 + U * (0.1 + i * 0.05), U * 0.008, U * 0.008));
    } else if (o === "apron") {
      paint(ctx, "#e8e0cc", 0, () => ctx.rect(cx - sw, y0, sw * 2, bottom - y0));
      paint(ctx, L.cloth, lw, () => { ctx.moveTo(cx - sw * 1.2, y0 - 2); ctx.lineTo(cx - sw * 0.55, y0 - 2); ctx.lineTo(cx - sw * 0.7, bottom + 2); ctx.lineTo(cx - sw * 1.2, bottom + 2); });
      paint(ctx, L.cloth, lw, () => { ctx.moveTo(cx + sw * 1.2, y0 - 2); ctx.lineTo(cx + sw * 0.55, y0 - 2); ctx.lineTo(cx + sw * 0.7, bottom + 2); ctx.lineTo(cx + sw * 1.2, bottom + 2); });
      neckline(U * 0.05, "#e8e0cc");
      neckline(U * 0.035);
      paint(ctx, mix("#e8e0cc", "#8a6a4a", 0.25), lw, () => ctx.rect(cx - sw * 0.5, y0 + U * 0.1, sw, bottom - y0));
      line(ctx, mix("#e8e0cc", "#8a6a4a", 0.45), lw * 1.5, [cx - sw * 0.5, y0 + U * 0.1, cx - sw * 0.62, y0, cx + sw * 0.62, y0, cx + sw * 0.5, y0 + U * 0.1]);
      if (R() < 0.5) paint(ctx, mix("#e8e0cc", "#6a4a2a", 0.4), 0, () => ellipse(ctx, cx + sw * 0.2, y0 + U * 0.18, U * 0.02, U * 0.015)); // 染み
    } else if (o === "vest") {
      paint(ctx, "#e4dccb", 0, () => ctx.rect(cx - sw * 0.35, y0, sw * 0.7, bottom - y0));
      vneck(U * 0.05, "#e4dccb"); neckline(U * 0.02);
      for (const s of [-1, 1]) paint(ctx, mix(L.cloth, "#000000", 0.15), lw, () => { ctx.moveTo(cx + s * sw * 0.2, y0 - 2); ctx.lineTo(cx + s * sw * 0.16, bottom + 2); ctx.lineTo(cx + s * sw * 1.2, bottom + 2); ctx.lineTo(cx + s * sw * 1.2, y0 - 2); });
      for (let i = 0; i < 3; i++) paint(ctx, "#c8a040", lw * 0.5, () => ellipse(ctx, cx - sw * 0.22, y0 + U * (0.1 + i * 0.06), U * 0.01, U * 0.01));
      // 首巻き
      paint(ctx, L.trim === "#8a8a8a" ? "#c8a040" : L.trim, lw, () => { ctx.moveTo(cx - neckW * 1.3, y0 - U * 0.01); ctx.quadraticCurveTo(cx, y0 + U * 0.06, cx + neckW * 1.3, y0 - U * 0.01); ctx.lineTo(cx + neckW * 0.6, y0 + U * 0.1); ctx.lineTo(cx + neckW * 0.1, y0 + U * 0.04); ctx.lineTo(cx - neckW * 0.4, y0 + U * 0.03); });
    } else if (o === "armor" || o === "plate") {
      const steel = o === "plate" ? "#c4c8d0" : "#8a9098";
      for (let i = 0; i < 5; i++) line(ctx, rgba(INK, 0.5), lw, [cx - sw * 1.1, y0 + U * (0.12 + i * 0.07), cx + sw * 1.1, y0 + U * (0.12 + i * 0.07)]);
      paint(ctx, vgrad(ctx, y0, bottom, steel), lw, () => { ctx.moveTo(cx - sw * 0.55, y0 + U * 0.04); ctx.quadraticCurveTo(cx, y0 + U * 0.02, cx + sw * 0.55, y0 + U * 0.04); ctx.lineTo(cx + sw * 0.6, bottom + 2); ctx.lineTo(cx - sw * 0.6, bottom + 2); });
      line(ctx, rgba("#ffffff", 0.4), lw * 2, [cx - sw * 0.3, y0 + U * 0.08, cx - sw * 0.35, bottom]);
      if (o === "plate") {
        paint(ctx, L.cloth, lw, () => { ctx.moveTo(cx - sw * 0.35, y0 + U * 0.12); ctx.lineTo(cx + sw * 0.35, y0 + U * 0.12); ctx.lineTo(cx + sw * 0.38, bottom + 2); ctx.lineTo(cx - sw * 0.38, bottom + 2); });
      }
      neckline(U * 0.03, mix(steel, "#000000", 0.2));
    } else if (o === "leather") {
      vneck(U * 0.06, mix(L.cloth, "#e8dcc8", 0.6));
      neckline(U * 0.025);
      paint(ctx, "#5a3a22", lw, () => { ctx.moveTo(cx - sw * 0.9, y0 + U * 0.02); ctx.lineTo(cx - sw * 0.7, y0 - U * 0.005); ctx.lineTo(cx + sw * 0.9, bottom - U * 0.04); ctx.lineTo(cx + sw * 0.7, bottom); });
      paint(ctx, "#c8a040", lw * 0.7, () => ctx.rect(cx - U * 0.02, midY - U * 0.02, U * 0.04, U * 0.04));
    } else if (o === "robe") {
      paint(ctx, L.trim, lw, () => ctx.rect(cx - U * 0.025, y0, U * 0.05, bottom - y0));
      for (let i = 0; i < 4; i++) paint(ctx, mix(L.trim, "#000000", 0.4), 0, () => { const ry = y0 + U * (0.1 + i * 0.07); ctx.moveTo(cx, ry - U * 0.018); ctx.lineTo(cx + U * 0.012, ry); ctx.lineTo(cx, ry + U * 0.018); ctx.lineTo(cx - U * 0.012, ry); });
      neckline(U * 0.02);
    } else if (o === "vestment") {
      neckline(U * 0.03, mix(L.cloth, "#000000", 0.08));
      for (const s of [-1, 1]) paint(ctx, L.trim, lw, () => { ctx.moveTo(cx + s * neckW * 1.1, y0 - 2); ctx.lineTo(cx + s * neckW * 2.2, y0 - 2); ctx.lineTo(cx + s * sw * 0.42, bottom + 2); ctx.lineTo(cx + s * sw * 0.2, bottom + 2); });
      for (const s of [-1, 1]) line(ctx, "#c8a040", lw * 1.4, [cx + s * sw * 0.34, y0 + U * 0.14, cx + s * sw * 0.36, y0 + U * 0.18]);
      if (L.kind === "hero") paint(ctx, mix(L.cloth, "#8a6a3a", 0.3), 0, () => ellipse(ctx, cx - sw * 0.6, bottom - U * 0.05, U * 0.03, U * 0.02)); // 酒の染み
    } else if (o === "noble") {
      paint(ctx, "#6a4a3a", 0, () => { ctx.moveTo(cx - sw * 1.2, y0); ctx.quadraticCurveTo(cx - sw * 0.6, y0 + U * 0.12, cx - sw * 0.45, bottom); ctx.lineTo(cx - sw * 1.2, bottom); });
      paint(ctx, "#6a4a3a", 0, () => { ctx.moveTo(cx + sw * 1.2, y0); ctx.quadraticCurveTo(cx + sw * 0.6, y0 + U * 0.12, cx + sw * 0.45, bottom); ctx.lineTo(cx + sw * 1.2, bottom); });
      // 毛皮の縁
      ctx.fillStyle = "#e8e0d4";
      for (let i = 0; i < 18; i++) { const t = i / 17; for (const s of [-1, 1]) { ctx.beginPath(); ellipse(ctx, cx + s * (sw * 0.46 + (1 - t) * sw * 0.5), y0 + t * (bottom - y0), U * 0.022, U * 0.02); ctx.fill(); } }
    } else if (o === "rags") {
      paint(ctx, S.skin, lw * 0.8, () => { ctx.moveTo(cx - neckW * 1.4, y0 - 1); ctx.lineTo(cx - neckW, y0 + U * 0.04); ctx.lineTo(cx - neckW * 0.4, y0 + U * 0.03); ctx.lineTo(cx, y0 + U * 0.07); ctx.lineTo(cx + neckW * 0.6, y0 + U * 0.04); ctx.lineTo(cx + neckW * 1.4, y0 - 1); });
      for (let i = 0; i < 3; i++) {
        const px = cx + (R() - 0.5) * sw * 1.4, py = y0 + U * (0.08 + R() * 0.15), s = U * (0.03 + R() * 0.02);
        paint(ctx, mix(L.cloth, pickR(R, ["#8a6a4a", "#4a4a5a", "#6a3a2a"]), 0.5), lw * 0.6, () => ctx.rect(px - s, py - s * 0.8, s * 2, s * 1.6));
        ctx.setLineDash([U * 0.006, U * 0.006]); line(ctx, "#d8d0c0", lw * 0.6, [px - s * 0.9, py - s * 0.7, px + s * 0.9, py - s * 0.7]); ctx.setLineDash([]);
      }
    } else if (o === "kimono") {
      const under = "#e8e2d4";
      paint(ctx, under, lw, () => { ctx.moveTo(cx - neckW * 1.4, y0 - 2); ctx.lineTo(cx + U * 0.02, y0 + U * 0.16); ctx.lineTo(cx + neckW * 1.4, y0 - 2); });
      neckline(U * 0.02);
      // 左前にならないよう、右の衿（見る側の左）が上
      paint(ctx, mix(L.cloth, "#000000", 0.15), lw, () => { ctx.moveTo(cx + neckW * 1.4, y0 - 2); ctx.lineTo(cx + neckW * 1.1, y0 - 2); ctx.lineTo(cx - U * 0.02, y0 + U * 0.19); ctx.lineTo(cx - sw * 0.3, bottom + 2); ctx.lineTo(cx + sw * 1.2, bottom + 2); ctx.lineTo(cx + sw * 1.2, y0 - 2); });
      line(ctx, under, lw * 2.5, [cx - neckW * 1.3, y0 - 1, cx + U * 0.015, y0 + U * 0.16]);
      if (L.armor) {
        // 胴丸：横板と肩の大袖
        const ar = "#3a2a2a";
        paint(ctx, ar, lw, () => ctx.rect(cx - sw * 1.1, y0 + U * 0.19, sw * 2.2, bottom - y0));
        for (let i = 0; i < 4; i++) line(ctx, "#c8a040", lw * 0.8, [cx - sw * 1.1, y0 + U * (0.22 + i * 0.045), cx + sw * 1.1, y0 + U * (0.22 + i * 0.045)]);
      } else paint(ctx, "#6a5a3a", lw, () => ctx.rect(cx - sw * 1.1, bottom - U * 0.06, sw * 2.2, U * 0.05));
    } else if (o === "sailor") {
      for (let i = 0; i < 7; i++) paint(ctx, "#e8e4dc", 0, () => ctx.rect(cx - sw * 1.2, y0 + U * (0.03 + i * 0.06), sw * 2.4, U * 0.03));
      vneck(U * 0.1);
      paint(ctx, L.cloth, lw, () => { ctx.moveTo(cx - neckW * 1.2, y0 + U * 0.02); ctx.lineTo(cx + neckW * 1.2, y0 + U * 0.02); ctx.lineTo(cx + U * 0.01, y0 + U * 0.12); ctx.lineTo(cx + U * 0.04, y0 + U * 0.2); ctx.lineTo(cx - U * 0.03, y0 + U * 0.16); });
    } else if (o === "tabard") {
      // 鎖かたびらの上に、色の上衣
      ctx.fillStyle = rgba("#ffffff", 0.18);
      for (let yy = y0; yy < bottom; yy += U * 0.02) for (let xx = cx - sw * 1.2; xx < cx + sw * 1.2; xx += U * 0.02) { ctx.beginPath(); ellipse(ctx, xx + ((yy / (U * 0.02)) % 2) * U * 0.01, yy, U * 0.005, U * 0.005); ctx.fill(); }
      paint(ctx, "#8a9098", lw * 0.6, () => { ctx.moveTo(cx - sw * 1.2, y0 - 2); ctx.lineTo(cx + sw * 1.2, y0 - 2); ctx.lineTo(cx + sw * 1.2, bottom + 2); ctx.lineTo(cx - sw * 1.2, bottom + 2); });
      paint(ctx, L.cloth, lw, () => ctx.rect(cx - sw * 0.6, y0 + U * 0.06, sw * 1.2, bottom - y0));
      paint(ctx, "#e8d890", lw * 0.7, () => { const ey = y0 + U * 0.18; ctx.moveTo(cx, ey - U * 0.05); ctx.lineTo(cx + U * 0.04, ey); ctx.lineTo(cx, ey + U * 0.05); ctx.lineTo(cx - U * 0.04, ey); });
      neckline(U * 0.03, "#8a9098");
    } else if (o === "cloak") {
      paint(ctx, mix(L.cloth, "#e8dcc8", 0.35), 0, () => ctx.rect(cx - sw * 0.3, y0, sw * 0.6, bottom - y0));
      for (const s of [-1, 1]) paint(ctx, L.cloth, lw, () => { ctx.moveTo(cx + s * neckW * 0.8, y0 - 2); ctx.quadraticCurveTo(cx + s * sw * 0.4, y0 + U * 0.14, cx + s * sw * 0.26, bottom + 2); ctx.lineTo(cx + s * sw * 1.3, bottom + 2); ctx.lineTo(cx + s * sw * 1.3, y0 - 2); });
      // 首元の布（口元まで上げていないとき）
      paint(ctx, mix(L.cloth, "#000000", 0.25), lw, () => { ctx.moveTo(cx - neckW * 1.5, y0 - U * 0.02); ctx.quadraticCurveTo(cx, y0 + U * 0.08, cx + neckW * 1.5, y0 - U * 0.02); ctx.quadraticCurveTo(cx, y0 + U * 0.03, cx - neckW * 1.5, y0 - U * 0.02); });
      paint(ctx, "#c8a040", lw * 0.7, () => ellipse(ctx, cx - neckW * 1.3, y0 + U * 0.04, U * 0.016, U * 0.016));
    } else if (o === "coat") {
      paint(ctx, mix(L.cloth, "#ffffff", 0.75), 0, () => { ctx.moveTo(cx - neckW, y0); ctx.lineTo(cx, y0 + U * 0.14); ctx.lineTo(cx + neckW, y0); });
      neckline(U * 0.02);
      for (const s of [-1, 1]) line(ctx, L.trim, lw * 2, [cx + s * neckW * 1.1, y0, cx + s * U * 0.01, y0 + U * 0.16, cx + s * U * 0.01, bottom]);
      for (let i = 0; i < 3; i++) paint(ctx, L.trim, lw * 0.5, () => ellipse(ctx, cx - U * 0.035, y0 + U * (0.2 + i * 0.05), U * 0.009, U * 0.009));
    }
    ctx.restore();
    // 肩の上に乗るもの
    if (o === "leather") paint(ctx, rgrad(ctx, cx - sw * 0.85, y0 + drop * 0.7, U * 0.08, "#6a4a2a"), lw, () => ellipse(ctx, cx - sw * 0.85, y0 + drop * 0.9, U * 0.085, U * 0.055, -0.3));
    if (o === "armor" || o === "plate") for (const s of [-1, 1]) {
      paint(ctx, rgrad(ctx, cx + s * sw * 0.86, y0 + drop * 0.7, U * 0.1, o === "plate" ? "#c8ccd4" : "#8a9098"), lw, () => ellipse(ctx, cx + s * sw * 0.86, y0 + drop * 0.95, U * 0.11, U * 0.07, s * 0.35));
      if (o === "plate") line(ctx, "#c8a040", lw * 1.5, [cx + s * sw * 0.72, y0 + drop * 1.5, cx + s * sw * 1.0, y0 + drop * 1.6]);
    }
    if (o === "kimono" && L.armor) for (const s of [-1, 1]) {
      paint(ctx, "#3a2a2a", lw, () => { ctx.moveTo(cx + s * sw * 0.7, y0 + drop * 0.6); ctx.lineTo(cx + s * sw * 1.15, y0 + drop * 0.9); ctx.lineTo(cx + s * sw * 1.2, y0 + drop * 3.2); ctx.lineTo(cx + s * sw * 0.8, y0 + drop * 3); });
      for (let i = 1; i < 4; i++) line(ctx, "#c8a040", lw * 0.8, [cx + s * sw * 0.72, y0 + drop * (0.6 + i * 0.65), cx + s * sw * 1.17, y0 + drop * (0.9 + i * 0.65)]);
    }
    if (o === "robe" || o === "coat") {
      // 立ち襟
      for (const s of [-1, 1]) paint(ctx, o === "coat" ? mix(L.cloth, "#000000", 0.2) : mix(L.cloth, "#ffffff", 0.08), lw, () => { ctx.moveTo(cx + s * neckW * 1.2, y0 + U * 0.02); ctx.lineTo(cx + s * neckW * 2.2, y0 - U * (o === "coat" ? 0.12 : 0.06)); ctx.lineTo(cx + s * neckW * 2.5, y0 + U * 0.02); ctx.lineTo(cx + s * neckW * 1.6, y0 + U * 0.08); });
      if (o === "coat") for (const s of [-1, 1]) line(ctx, L.trim, lw, [cx + s * neckW * 2.2, y0 - U * 0.12, cx + s * neckW * 2.5, y0 + U * 0.02]);
    }
    if (o === "noble" && L.sex !== "女" && L.kind === "noble") {
      // ひだ襟
      ctx.fillStyle = "#f4f0e8"; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.7;
      for (let i = 0; i < 11; i++) { const a = Math.PI * (0.05 + (i / 10) * 0.9); ctx.beginPath(); ellipse(ctx, cx - Math.cos(a) * neckW * 2, y0 + Math.sin(a) * U * 0.035, U * 0.03, U * 0.022); ctx.fill(); ctx.stroke(); }
    }
    return sw;
  }
  // 胸の飾り
  function chest(ctx, L, cx, y0, U) {
    const lw = U * 0.007;
    const c = L.chest;
    if (c === "sun") {
      line(ctx, "#c8a040", lw, [cx - U * 0.05, y0, cx, y0 + U * 0.1, cx + U * 0.05, y0]);
      const sy = y0 + U * 0.13;
      ctx.fillStyle = "#e8c050"; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.7;
      ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = i % 2 ? U * 0.022 : U * 0.04; ctx.lineTo(cx + Math.cos(a) * r, sy + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
      paint(ctx, "#fff0b0", 0, () => ellipse(ctx, cx, sy, U * 0.012, U * 0.012));
    } else if (c === "gem") {
      const gy = y0 + U * 0.07;
      paint(ctx, "#c8a040", lw, () => ellipse(ctx, cx, gy, U * 0.028, U * 0.028));
      ctx.shadowColor = L.kind === "majin" ? L.iris : "#6ad0ff"; ctx.shadowBlur = U * 0.03;
      paint(ctx, L.kind === "majin" ? L.iris : "#3a8aca", 0, () => ellipse(ctx, cx, gy, U * 0.018, U * 0.018));
      ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
    } else if (c === "chain") {
      ctx.strokeStyle = "#e0c060"; ctx.lineWidth = lw * 1.4;
      ctx.beginPath(); ctx.moveTo(cx - U * 0.14, y0 + U * 0.02); ctx.quadraticCurveTo(cx, y0 + U * 0.18, cx + U * 0.14, y0 + U * 0.02); ctx.stroke();
      paint(ctx, "#e0c060", lw, () => ellipse(ctx, cx, y0 + U * 0.11, U * 0.02, U * 0.024));
    } else if (c === "coins") {
      paint(ctx, "#8a6a3a", lw, () => ellipse(ctx, cx + U * 0.18, y0 + U * 0.2, U * 0.05, U * 0.055));
      line(ctx, "#4a3a22", lw * 1.5, [cx + U * 0.15, y0 + U * 0.155, cx + U * 0.21, y0 + U * 0.155]);
      paint(ctx, "#e8c050", lw * 0.6, () => ellipse(ctx, cx + U * 0.18, y0 + U * 0.2, U * 0.015, U * 0.015));
    } else if (c === "collar") {
      paint(ctx, "#5a5a5a", lw, () => ctx.rect(cx - U * 0.07, y0 - U * 0.035, U * 0.14, U * 0.03));
      line(ctx, "#7a7a7a", lw * 1.5, [cx, y0 - U * 0.005, cx + U * 0.02, y0 + U * 0.08, cx - U * 0.01, y0 + U * 0.16]);
    } else if (c === "crest") {
      const cy = y0 + U * 0.16;
      paint(ctx, "#e8d890", lw, () => { ctx.moveTo(cx - U * 0.05, cy - U * 0.05); ctx.lineTo(cx + U * 0.05, cy - U * 0.05); ctx.lineTo(cx + U * 0.05, cy + U * 0.01); ctx.quadraticCurveTo(cx, cy + U * 0.07, cx - U * 0.05, cy + U * 0.01); });
      line(ctx, "#8a2a2a", lw * 1.6, [cx, cy - U * 0.04, cx, cy + U * 0.04]); line(ctx, "#8a2a2a", lw * 1.6, [cx - U * 0.03, cy - U * 0.01, cx + U * 0.03, cy - U * 0.01]);
    } else if (c === "keys") {
      ctx.strokeStyle = "#c8a040"; ctx.lineWidth = lw * 1.2;
      ctx.beginPath(); ellipse(ctx, cx - U * 0.16, y0 + U * 0.22, U * 0.022, U * 0.022); ctx.stroke();
      line(ctx, "#c8a040", lw * 1.2, [cx - U * 0.16, y0 + U * 0.24, cx - U * 0.15, y0 + U * 0.3, cx - U * 0.13, y0 + U * 0.3]);
    }
  }

  // ---------------------------------------------------------------- 髪
  function hairColors(L) { return { base: L.hair, dark: mix(L.hair, "#000000", 0.4), light: mix(L.hair, "#ffffff", 0.35) }; }
  // 後ろ髪（顔と体より先）
  function hairBack(ctx, L, cx, cy, rx, ry, U) {
    const st = L.hairStyle, c = hairColors(L), lw = U * 0.008;
    if (st === "long" || st === "wild") {
      const len = st === "wild" ? 2.3 : 2.0;
      paint(ctx, vgrad(ctx, cy - ry, cy + ry * len, c.base), lw, () => {
        ctx.moveTo(cx - rx * 1.1, cy - ry * 0.2);
        ctx.ellipse(cx, cy - ry * 0.1, rx * 1.15, ry * 1.08, 0, Math.PI, TAU);
        ctx.quadraticCurveTo(cx + rx * 1.45, cy + ry * 0.8, cx + rx * (st === "wild" ? 1.7 : 1.35), cy + ry * len);
        if (st === "wild") for (let i = 0; i < 6; i++) ctx.lineTo(cx + rx * (1.5 - i * 0.6), cy + ry * (len - (i % 2) * 0.3));
        ctx.lineTo(cx - rx * (st === "wild" ? 1.7 : 1.35), cy + ry * len);
        ctx.quadraticCurveTo(cx - rx * 1.45, cy + ry * 0.8, cx - rx * 1.1, cy - ry * 0.2);
      });
    } else if (st === "bob") {
      paint(ctx, vgrad(ctx, cy - ry, cy + ry, c.base), lw, () => { ctx.moveTo(cx - rx * 1.2, cy + ry * 0.85); ctx.ellipse(cx, cy - ry * 0.05, rx * 1.22, ry * 1.12, 0, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(cx + rx * 1.2, cy + ry * 0.85); });
    } else if (st === "ponytail") {
      const R = rng(L.seed + ":tail"), s = R() < 0.5 ? -1 : 1;
      paint(ctx, vgrad(ctx, cy - ry, cy + ry * 1.8, c.base), lw, () => { ctx.moveTo(cx + s * rx * 0.6, cy - ry * 0.8); ctx.quadraticCurveTo(cx + s * rx * 1.9, cy - ry * 0.5, cx + s * rx * 1.5, cy + ry * 1.7); ctx.quadraticCurveTo(cx + s * rx * 1.25, cy + ry * 0.4, cx + s * rx * 0.7, cy - ry * 0.3); });
    }
  }
  // 前髪と頭の上
  function hairFront(ctx, L, cx, cy, rx, ry, U) {
    const st = L.hairStyle, c = hairColors(L), lw = U * 0.008;
    const R = rng(L.seed + ":hair");
    if (st === "bald") {
      if (L.band === "old" || R() < 0.5) for (const s of [-1, 1]) paint(ctx, c.base, lw * 0.6, () => ellipse(ctx, cx + s * rx * 0.98, cy - ry * 0.05, rx * 0.16, ry * 0.3));
      ctx.fillStyle = rgba("#ffffff", 0.25); ctx.beginPath(); ellipse(ctx, cx - rx * 0.3, cy - ry * 0.75, rx * 0.25, ry * 0.1, -0.3); ctx.fill();
      return;
    }
    const top = cy - ry * 1.02;
    const vol = st === "spiky" || st === "messy" || st === "wild" ? 1.14 : st === "slick" ? 1.02 : 1.08;
    const lx = cx - rx * 1.04, rxp = cx + rx * 1.04, ty = cy - ry * 0.05;
    // 前髪の線（右のこめかみ → 左のこめかみ）
    const fr = [];
    const hl = cy - ry * (st === "receding" ? 0.75 : st === "slick" ? 0.58 : 0.4);
    if (st === "spiky" || st === "messy" || st === "wild") {
      const n = st === "spiky" ? 5 : 6;
      for (let i = 0; i <= n; i++) { const t = i / n; const px = cx + rx * (0.9 - t * 1.8); fr.push(px, hl + (i % 2 ? ry * (0.22 + R() * 0.12) : -ry * 0.02)); }
    } else if (st === "parted" || st === "long" || st === "ponytail") {
      const part = R() < 0.5 ? -1 : 1;
      fr.push(cx + rx * 0.9, cy - ry * 0.25, cx + part * rx * 0.15, cy - ry * 0.72, cx - rx * 0.4, cy - ry * 0.35, cx - rx * 0.9, cy - ry * 0.2);
      if (part < 0) for (let i = 0; i < fr.length; i += 2) fr[i] = 2 * cx - fr[i];
      if (part < 0) { const p = []; for (let i = fr.length - 2; i >= 0; i -= 2) p.push(fr[i], fr[i + 1]); fr.length = 0; fr.push(...p); }
    } else if (st === "bob") {
      for (let i = 0; i <= 8; i++) fr.push(cx + rx * (0.9 - (i / 8) * 1.8), cy - ry * 0.22 + (i % 2 ? ry * 0.05 : 0));
    } else if (st === "receding") {
      fr.push(cx + rx * 0.95, cy - ry * 0.35, cx + rx * 0.5, cy - ry * 0.55, cx + rx * 0.25, cy - ry * 0.95, cx - rx * 0.25, cy - ry * 0.95, cx - rx * 0.5, cy - ry * 0.55, cx - rx * 0.95, cy - ry * 0.35);
    } else {
      // short / slick / bun / topknot
      const n = 5;
      for (let i = 0; i <= n; i++) fr.push(cx + rx * (0.92 - (i / n) * 1.84), hl + (st === "slick" || st === "topknot" || st === "bun" ? -Math.sin((i / n) * Math.PI) * ry * 0.08 : (i % 2 ? ry * 0.1 : 0)));
    }
    const cap = () => {
      ctx.moveTo(lx, ty);
      if (st === "receding") { ctx.lineTo(lx, cy - ry * 0.45); } else ctx.bezierCurveTo(lx - rx * (vol - 1), cy - ry * 0.8, cx - rx * 0.6, top - ry * (vol - 1) * 2, cx, top - ry * (vol - 1) * 1.6);
      if (st !== "receding") ctx.bezierCurveTo(cx + rx * 0.6, top - ry * (vol - 1) * 2, rxp + rx * (vol - 1), cy - ry * 0.8, rxp, ty);
      else { ctx.moveTo(rxp, cy - ry * 0.45); }
      ctx.lineTo(rxp, ty);
      ctx.lineTo(fr[0], fr[1]);
      for (let i = 2; i < fr.length; i += 2) ctx.lineTo(fr[i], fr[i + 1]);
      ctx.lineTo(lx, ty);
    };
    if (st === "receding") {
      // 横と後ろだけ残る
      for (const s of [-1, 1]) paint(ctx, c.base, lw, () => { ctx.moveTo(cx + s * rx * 1.04, cy + ry * 0.05); ctx.quadraticCurveTo(cx + s * rx * 1.12, cy - ry * 0.6, cx + s * rx * 0.5, cy - ry * 0.55); ctx.quadraticCurveTo(cx + s * rx * 0.9, cy - ry * 0.3, cx + s * rx * 0.9, cy + ry * 0.05); });
      ctx.fillStyle = rgba("#ffffff", 0.22); ctx.beginPath(); ellipse(ctx, cx - rx * 0.25, cy - ry * 0.78, rx * 0.25, ry * 0.08, -0.2); ctx.fill();
    } else {
      paint(ctx, vgrad(ctx, top, cy, c.base), lw, cap);
      // 毛の流れ
      ctx.save(); ctx.beginPath(); cap(); ctx.clip();
      for (let i = 0; i < 7; i++) { const px = cx + (R() - 0.5) * rx * 1.6; line(ctx, rgba(c.dark, 0.45), lw * 0.6, [px, top + ry * 0.2, px + (R() - 0.5) * rx * 0.3, cy - ry * 0.55]); }
      ctx.strokeStyle = rgba(c.light, 0.55); ctx.lineWidth = ry * 0.08; ctx.beginPath(); ctx.ellipse(cx, cy - ry * 0.1, rx * 0.8, ry * 0.72, 0, Math.PI * 1.2, Math.PI * 1.6); ctx.stroke();
      if (L.streak) for (let i = 0; i < 4; i++) { const px = cx + (R() - 0.5) * rx * 1.5; line(ctx, "#e8e4dc", lw * 1.5, [px, top, px + rx * 0.1, cy - ry * 0.4]); }
      ctx.restore();
      // とがった毛先を上に
      if (st === "spiky" || st === "wild") for (let i = 0; i < 4; i++) { const a = Math.PI * (1.2 + i * 0.2), bx = cx + Math.cos(a) * rx * 1.02, by = cy - ry * 0.1 + Math.sin(a) * ry * 1.02; paint(ctx, c.base, lw, () => { ctx.moveTo(bx - Math.sin(a) * rx * 0.16, by + Math.cos(a) * rx * 0.16); ctx.lineTo(bx + Math.cos(a) * rx * 0.24 + rx * 0.1, by + Math.sin(a) * ry * 0.22); ctx.lineTo(bx + Math.sin(a) * rx * 0.16, by - Math.cos(a) * rx * 0.16); }); }
    }
    // 横の毛（長い髪・おかっぱ）
    if (st === "long" || st === "bob" || st === "wild") {
      const len = st === "bob" ? 0.85 : 1.55;
      for (const s of [-1, 1]) paint(ctx, vgrad(ctx, cy - ry * 0.5, cy + ry * len, c.base), lw, () => { ctx.moveTo(cx + s * rx * 1.04, cy - ry * 0.2); ctx.quadraticCurveTo(cx + s * rx * 1.16, cy + ry * 0.5, cx + s * rx * 1.12, cy + ry * len); ctx.lineTo(cx + s * rx * 0.86, cy + ry * (len - 0.1)); ctx.quadraticCurveTo(cx + s * rx * 0.92, cy + ry * 0.3, cx + s * rx * 0.8, cy - ry * 0.25); });
    }
    // 結った髪
    if (st === "bun") paint(ctx, rgrad(ctx, cx, top - ry * 0.1, rx * 0.4, c.base), lw, () => ellipse(ctx, cx, top - ry * 0.08, rx * 0.4, ry * 0.26));
    if (st === "topknot") {
      paint(ctx, c.base, lw, () => { ctx.moveTo(cx - rx * 0.12, top + ry * 0.02); ctx.lineTo(cx - rx * 0.1, top - ry * 0.22); ctx.quadraticCurveTo(cx + rx * 0.3, top - ry * 0.38, cx + rx * 0.45, top - ry * 0.15); ctx.lineTo(cx + rx * 0.3, top - ry * 0.12); ctx.lineTo(cx + rx * 0.12, top + ry * 0.02); });
      paint(ctx, "#e8e2d4", lw * 0.6, () => ctx.rect(cx - rx * 0.13, top - ry * 0.12, rx * 0.26, ry * 0.07));
    }
    if (st === "ponytail") paint(ctx, L.cloth === "#8a2a2a" ? "#2a4a8a" : "#8a2a2a", lw * 0.6, () => ellipse(ctx, cx, top + ry * 0.02, rx * 0.12, ry * 0.05));
  }

  // ---------------------------------------------------------------- かぶり物
  function hoodBack(ctx, L, cx, cy, rx, ry, U) {
    if (L.head !== "hood") return;
    const c = L.kind === "hero" || L.outfit === "cloak" ? L.cloth : mix(L.cloth, "#000000", 0.1);
    paint(ctx, vgrad(ctx, cy - ry * 1.4, cy + ry * 2, c), U * 0.008, () => { ctx.moveTo(cx - rx * 1.7, cy + ry * 2); ctx.bezierCurveTo(cx - rx * 1.7, cy - ry * 0.6, cx - rx * 1.2, cy - ry * 1.5, cx, cy - ry * 1.42); ctx.bezierCurveTo(cx + rx * 1.2, cy - ry * 1.5, cx + rx * 1.7, cy - ry * 0.6, cx + rx * 1.7, cy + ry * 2); });
  }
  function headwear(ctx, L, cx, cy, rx, ry, U) {
    const hw = L.head, lw = U * 0.008;
    const top = cy - ry * 1.05;
    if (hw === "hood") {
      const c = L.kind === "hero" || L.outfit === "cloak" ? L.cloth : mix(L.cloth, "#000000", 0.1);
      paint(ctx, vgrad(ctx, cy - ry * 1.4, cy + ry, c), lw, () => {
        ctx.moveTo(cx - rx * 1.5, cy + ry * 1.2);
        ctx.bezierCurveTo(cx - rx * 1.55, cy - ry * 0.6, cx - rx * 1.1, cy - ry * 1.42, cx, cy - ry * 1.36);
        ctx.bezierCurveTo(cx + rx * 1.1, cy - ry * 1.42, cx + rx * 1.55, cy - ry * 0.6, cx + rx * 1.5, cy + ry * 1.2);
        ctx.lineTo(cx + rx * 1.12, cy + ry * 1.1);
        ctx.bezierCurveTo(cx + rx * 1.2, cy - ry * 0.2, cx + rx * 0.9, cy - ry * 1.02, cx, cy - ry * 1.02);
        ctx.bezierCurveTo(cx - rx * 0.9, cy - ry * 1.02, cx - rx * 1.2, cy - ry * 0.2, cx - rx * 1.12, cy + ry * 1.1);
        ctx.closePath();
      });
      // 顔に落ちる影
      const g = ctx.createLinearGradient(0, cy - ry, 0, cy - ry * 0.2);
      g.addColorStop(0, "rgba(0,0,0,.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ellipse(ctx, cx, cy - ry * 0.4, rx * 1.1, ry * 0.7); ctx.fill();
    } else if (hw === "helmet") {
      const steel = "#9aa0aa";
      paint(ctx, rgrad(ctx, cx, top + ry * 0.4, rx * 1.1, steel), lw, () => { ctx.moveTo(cx - rx * 1.14, cy - ry * 0.25); ctx.bezierCurveTo(cx - rx * 1.2, top - ry * 0.3, cx + rx * 1.2, top - ry * 0.3, cx + rx * 1.14, cy - ry * 0.25); ctx.closePath(); });
      paint(ctx, mix(steel, "#000000", 0.15), lw, () => { ctx.moveTo(cx - rx * 1.25, cy - ry * 0.18); ctx.quadraticCurveTo(cx, cy - ry * 0.42, cx + rx * 1.25, cy - ry * 0.18); ctx.lineTo(cx + rx * 1.2, cy - ry * 0.32); ctx.quadraticCurveTo(cx, cy - ry * 0.56, cx - rx * 1.2, cy - ry * 0.32); ctx.closePath(); });
      if (L.kind === "guard" || L.kind === "soldier") paint(ctx, steel, lw, () => ctx.rect(cx - rx * 0.07, cy - ry * 0.4, rx * 0.14, ry * 0.55));
      line(ctx, rgba("#ffffff", 0.5), lw * 1.5, [cx - rx * 0.5, top + ry * 0.2, cx - rx * 0.2, top + ry * 0.05]);
      if (L.kind === "knight") paint(ctx, L.cloth, lw, () => { ctx.moveTo(cx, top - ry * 0.05); ctx.quadraticCurveTo(cx + rx * 0.9, top - ry * 0.6, cx + rx * 1.4, top + ry * 0.3); ctx.quadraticCurveTo(cx + rx * 0.7, top - ry * 0.1, cx, top + ry * 0.1); });
    } else if (hw === "kerchief" || hw === "veil") {
      const c = hw === "veil" ? (L.kind === "hero" ? L.trim : "#2a2a3a") : pickR(rng(L.seed + ":kc"), ["#b04a3a", "#4a6a8a", "#c8a040", "#6a8a4a", "#e8e0cc"]);
      if (hw === "veil") paint(ctx, vgrad(ctx, top, cy + ry * 2, c), lw, () => { ctx.moveTo(cx - rx * 1.3, cy + ry * 1.8); ctx.quadraticCurveTo(cx - rx * 1.35, top - ry * 0.1, cx, top - ry * 0.12); ctx.quadraticCurveTo(cx + rx * 1.35, top - ry * 0.1, cx + rx * 1.3, cy + ry * 1.8); ctx.lineTo(cx + rx * 1.05, cy + ry * 1.6); ctx.quadraticCurveTo(cx + rx * 1.1, cy - ry * 0.3, cx + rx * 0.9, cy - ry * 0.55); ctx.quadraticCurveTo(cx, cy - ry * 0.75, cx - rx * 0.9, cy - ry * 0.55); ctx.quadraticCurveTo(cx - rx * 1.1, cy - ry * 0.3, cx - rx * 1.05, cy + ry * 1.6); ctx.closePath(); });
      else {
        paint(ctx, vgrad(ctx, top, cy, c), lw, () => { ctx.moveTo(cx - rx * 1.12, cy - ry * 0.25); ctx.bezierCurveTo(cx - rx * 1.2, top - ry * 0.2, cx + rx * 1.2, top - ry * 0.2, cx + rx * 1.12, cy - ry * 0.25); ctx.quadraticCurveTo(cx, cy - ry * 0.6, cx - rx * 1.12, cy - ry * 0.25); });
        paint(ctx, c, lw, () => { ctx.moveTo(cx + rx * 1.05, cy - ry * 0.3); ctx.lineTo(cx + rx * 1.5, cy - ry * 0.05); ctx.lineTo(cx + rx * 1.35, cy - ry * 0.45); });
        ctx.fillStyle = rgba("#ffffff", 0.5);
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ellipse(ctx, cx + rx * (-0.7 + i * 0.28), cy - ry * (0.7 + (i % 2) * 0.15), rx * 0.04, rx * 0.04); ctx.fill(); }
      }
    } else if (hw === "cap") {
      const c = L.kind === "sailor" ? "#3a3a4a" : pickR(rng(L.seed + ":cap"), ["#5a4a3a", "#4a5a6a", "#6a3a2a"]);
      paint(ctx, vgrad(ctx, top - ry * 0.2, cy, c), lw, () => { ctx.moveTo(cx - rx * 1.1, cy - ry * 0.4); ctx.bezierCurveTo(cx - rx * 1.15, top - ry * 0.3, cx + rx * 1.15, top - ry * 0.3, cx + rx * 1.1, cy - ry * 0.4); ctx.closePath(); });
      paint(ctx, mix(c, "#ffffff", 0.12), lw, () => { ctx.moveTo(cx - rx * 1.14, cy - ry * 0.32); ctx.quadraticCurveTo(cx, cy - ry * 0.5, cx + rx * 1.14, cy - ry * 0.32); ctx.lineTo(cx + rx * 1.12, cy - ry * 0.52); ctx.quadraticCurveTo(cx, cy - ry * 0.7, cx - rx * 1.12, cy - ry * 0.52); ctx.closePath(); });
    } else if (hw === "hat") {
      const c = pickR(rng(L.seed + ":hat"), ["#3a2a22", "#2a2a2a", "#4a3a5a", "#5a4a2a"]);
      paint(ctx, c, lw, () => ellipse(ctx, cx, cy - ry * 0.6, rx * 1.7, ry * 0.22));
      paint(ctx, vgrad(ctx, top - ry * 0.4, cy - ry * 0.6, c), lw, () => { ctx.moveTo(cx - rx * 0.9, cy - ry * 0.6); ctx.lineTo(cx - rx * 0.8, top - ry * 0.35); ctx.quadraticCurveTo(cx, top - ry * 0.5, cx + rx * 0.8, top - ry * 0.35); ctx.lineTo(cx + rx * 0.9, cy - ry * 0.6); ctx.quadraticCurveTo(cx, cy - ry * 0.5, cx - rx * 0.9, cy - ry * 0.6); });
      paint(ctx, L.trim === "#8a8a8a" ? "#8a2a2a" : L.trim, 0, () => { ctx.moveTo(cx - rx * 0.88, cy - ry * 0.62); ctx.quadraticCurveTo(cx, cy - ry * 0.52, cx + rx * 0.88, cy - ry * 0.62); ctx.lineTo(cx + rx * 0.86, cy - ry * 0.78); ctx.quadraticCurveTo(cx, cy - ry * 0.68, cx - rx * 0.86, cy - ry * 0.78); });
    } else if (hw === "wizard") {
      const c = mix(L.cloth, "#000000", 0.1);
      const R = rng(L.seed + ":wiz"), bend = R() < 0.5 ? -1 : 1;
      paint(ctx, vgrad(ctx, top - ry * 1.4, cy, c), lw, () => { ctx.moveTo(cx - rx * 0.95, cy - ry * 0.62); ctx.quadraticCurveTo(cx - rx * 0.4, top - ry * 0.6, cx + bend * rx * 0.2, top - ry * 1.15); ctx.quadraticCurveTo(cx + bend * rx * 1.0, top - ry * 1.05, cx + bend * rx * 1.25, top - ry * 0.7); ctx.quadraticCurveTo(cx + bend * rx * 0.7, top - ry * 0.85, cx + rx * 0.35, top - ry * 0.55); ctx.quadraticCurveTo(cx + rx * 0.7, top, cx + rx * 0.95, cy - ry * 0.62); });
      paint(ctx, c, lw, () => { ellipse(ctx, cx, cy - ry * 0.58, rx * 1.75, ry * 0.2); });
      paint(ctx, L.trim, lw * 0.6, () => { ctx.moveTo(cx - rx * 0.92, cy - ry * 0.66); ctx.quadraticCurveTo(cx, cy - ry * 0.55, cx + rx * 0.92, cy - ry * 0.66); ctx.lineTo(cx + rx * 0.85, cy - ry * 0.82); ctx.quadraticCurveTo(cx, cy - ry * 0.72, cx - rx * 0.85, cy - ry * 0.82); });
      // 星の飾り
      ctx.fillStyle = "#f0e0a0"; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, r = i % 2 ? rx * 0.05 : rx * 0.12; ctx.lineTo(cx - rx * 0.15 + Math.cos(a) * r, top - ry * 0.3 + Math.sin(a) * r); } ctx.fill();
    } else if (hw === "circlet") {
      ctx.strokeStyle = "#d8b850"; ctx.lineWidth = ry * 0.06;
      ctx.beginPath(); ctx.ellipse(cx, cy - ry * 0.15, rx * 1.02, ry * 0.5, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.shadowColor = "#6ad0ff"; ctx.shadowBlur = U * 0.02;
      paint(ctx, L.kind === "noble" ? "#b02a3a" : "#3a9ada", lw * 0.6, () => { ctx.moveTo(cx, cy - ry * 0.75); ctx.lineTo(cx + rx * 0.08, cy - ry * 0.65); ctx.lineTo(cx, cy - ry * 0.55); ctx.lineTo(cx - rx * 0.08, cy - ry * 0.65); });
      ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
    } else if (hw === "crown") {
      // 魔人の小さな冠は、少し傾いている
      ctx.save(); ctx.translate(cx + rx * 0.35, top + ry * 0.05); ctx.rotate(0.35);
      paint(ctx, "#d8b040", lw, () => { ctx.moveTo(-rx * 0.35, 0); ctx.lineTo(-rx * 0.38, -ry * 0.28); ctx.lineTo(-rx * 0.18, -ry * 0.12); ctx.lineTo(0, -ry * 0.36); ctx.lineTo(rx * 0.18, -ry * 0.12); ctx.lineTo(rx * 0.38, -ry * 0.28); ctx.lineTo(rx * 0.35, 0); ctx.closePath(); });
      paint(ctx, L.iris, 0, () => ellipse(ctx, 0, -ry * 0.07, rx * 0.05, rx * 0.05));
      ctx.restore();
    } else if (hw === "horns") {
      const R = rng(L.seed + ":horn"), long = R() < 0.5;
      for (const s of [-1, 1]) paint(ctx, rgrad(ctx, cx + s * rx * 0.6, top, rx * 0.4, "#2a2228"), lw, () => { ctx.moveTo(cx + s * rx * 0.45, top + ry * 0.18); ctx.quadraticCurveTo(cx + s * rx * (long ? 1.1 : 0.8), top - ry * (long ? 0.2 : 0.1), cx + s * rx * (long ? 1.2 : 0.75), top - ry * (long ? 0.65 : 0.35)); ctx.quadraticCurveTo(cx + s * rx * 0.75, top - ry * 0.05, cx + s * rx * 0.72, top + ry * 0.26); });
    } else if (hw === "bandana" || hw === "headband") {
      const c = hw === "headband" ? "#ece6d8" : pickR(rng(L.seed + ":band"), ["#8a2a2a", "#2a4a6a", "#4a4a2a", "#5a2a4a"]);
      paint(ctx, c, lw, () => { ctx.moveTo(cx - rx * 1.08, cy - ry * 0.28); ctx.quadraticCurveTo(cx, cy - ry * 0.6, cx + rx * 1.08, cy - ry * 0.28); ctx.lineTo(cx + rx * 1.06, cy - ry * 0.46); ctx.quadraticCurveTo(cx, cy - ry * 0.78, cx - rx * 1.06, cy - ry * 0.46); ctx.closePath(); });
      if (hw === "headband" && L.kind !== "hero") paint(ctx, "#b02a2a", 0, () => ellipse(ctx, cx, cy - ry * 0.52, rx * 0.1, ry * 0.07));
      for (const d of [0.2, -0.15]) paint(ctx, c, lw, () => { ctx.moveTo(cx - rx * 1.02, cy - ry * 0.4); ctx.quadraticCurveTo(cx - rx * 1.4, cy - ry * (0.3 - d), cx - rx * 1.65, cy + ry * (0.05 + d)); ctx.lineTo(cx - rx * 1.55, cy + ry * (0.12 + d)); ctx.quadraticCurveTo(cx - rx * 1.3, cy - ry * (0.15 - d), cx - rx * 1.02, cy - ry * 0.3); });
    } else if (hw === "mitre") {
      paint(ctx, vgrad(ctx, top - ry * 0.9, cy, "#ece6d6"), lw, () => { ctx.moveTo(cx - rx * 0.85, cy - ry * 0.55); ctx.quadraticCurveTo(cx - rx * 0.95, top - ry * 0.4, cx, top - ry * 0.95); ctx.quadraticCurveTo(cx + rx * 0.95, top - ry * 0.4, cx + rx * 0.85, cy - ry * 0.55); ctx.quadraticCurveTo(cx, cy - ry * 0.45, cx - rx * 0.85, cy - ry * 0.55); });
      line(ctx, L.trim, lw * 2.5, [cx, top - ry * 0.85, cx, cy - ry * 0.5]);
      line(ctx, L.trim, lw * 2.5, [cx - rx * 0.84, cy - ry * 0.62, cx + rx * 0.84, cy - ry * 0.62]);
      paint(ctx, "#e8c050", lw * 0.5, () => ellipse(ctx, cx, top - ry * 0.35, rx * 0.12, rx * 0.12));
    } else if (hw === "kasa") {
      const c = "#c8a870";
      paint(ctx, vgrad(ctx, top - ry * 0.5, cy - ry * 0.3, c), lw, () => { ctx.moveTo(cx - rx * 1.9, cy - ry * 0.3); ctx.quadraticCurveTo(cx - rx * 0.4, top - ry * 0.5, cx, top - ry * 0.55); ctx.quadraticCurveTo(cx + rx * 0.4, top - ry * 0.5, cx + rx * 1.9, cy - ry * 0.3); ctx.quadraticCurveTo(cx, cy - ry * 0.12, cx - rx * 1.9, cy - ry * 0.3); });
      for (let i = -4; i <= 4; i++) line(ctx, mix(c, "#000000", 0.3), lw * 0.6, [cx, top - ry * 0.5, cx + i * rx * 0.44, cy - ry * 0.25 + Math.abs(i) * ry * 0.01]);
      const g = ctx.createLinearGradient(0, cy - ry * 0.3, 0, cy + ry * 0.2);
      g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ellipse(ctx, cx, cy - ry * 0.1, rx * 1.1, ry * 0.4); ctx.fill();
    }
  }

  // ---------------------------------------------------------------- 顔
  function eyePair(ctx, L, cx, ey, sp, er, U) {
    const lw = U * 0.008;
    const female = L.sex === "女";
    [-1, 1].forEach((s) => {
      const ex = cx + s * sp;
      if (s === 1 && L.marks.includes("eyepatch")) return;
      const iris = s === 1 && L.iris2 ? L.iris2 : L.iris;
      const st = L.eyes;
      if (st === "smile") {
        line(ctx, INK, lw * 1.6, [ex - er * 1.1, ey + er * 0.2, ex - er * 0.5, ey - er * 0.45, ex + er * 0.5, ey - er * 0.45, ex + er * 1.1, ey + er * 0.2]);
        return;
      }
      if (st === "narrow") {
        line(ctx, INK, lw * 1.6, [ex - er * 1.2, ey - er * 0.05, ex + er * 1.2, ey - er * (0.05 + s * 0.12)]);
        ctx.fillStyle = iris === "#2a2a2a" ? "#1a1a1a" : mix(iris, "#000000", 0.4); ctx.beginPath(); ellipse(ctx, ex, ey + er * 0.12, er * 0.35, er * 0.22); ctx.fill();
        return;
      }
      if (st === "glow") {
        ctx.fillStyle = "#1a0e14"; ctx.beginPath(); ellipse(ctx, ex, ey, er * 1.25, er * 0.62, s * -0.18); ctx.fill();
        ctx.shadowColor = iris; ctx.shadowBlur = er * 4;
        ctx.fillStyle = iris; ctx.beginPath(); ellipse(ctx, ex, ey, er * 0.6, er * 0.55); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
        ctx.fillStyle = "#0a0406"; ctx.beginPath(); ellipse(ctx, ex, ey, er * 0.12, er * 0.5); ctx.fill();
        line(ctx, INK, lw * 1.8, [ex - s * er * 1.3, ey - er * (0.1 - 0.35), ex, ey - er * 0.7, ex + s * er * 1.35, ey - er * 0.65]);
        return;
      }
      const tall = st === "round" ? 1.05 : st === "sharp" ? 0.62 : 0.82;
      const wide = st === "round" ? 1.12 : 1.25;
      const tilt = st === "sharp" ? s * -0.18 : 0;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(tilt);
      ctx.beginPath(); ctx.moveTo(-er * wide, 0); ctx.quadraticCurveTo(0, -er * tall * 1.35, er * wide, 0); ctx.quadraticCurveTo(0, er * tall * 1.15, -er * wide, 0); ctx.fillStyle = "#f8f4ec"; ctx.fill();
      ctx.save(); ctx.clip();
      const ir = er * (st === "sharp" ? 0.55 : 0.68);
      const g = ctx.createRadialGradient(0, -ir * 0.3, ir * 0.1, 0, 0, ir);
      g.addColorStop(0, mix(iris, "#ffffff", 0.35)); g.addColorStop(1, mix(iris, "#000000", 0.3));
      ctx.fillStyle = g; ctx.beginPath(); ellipse(ctx, s * er * 0.08, er * 0.05, ir, ir); ctx.fill();
      ctx.fillStyle = "#0e0a0c"; ctx.beginPath(); ellipse(ctx, s * er * 0.08, er * 0.05, ir * 0.45, ir * 0.45); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ellipse(ctx, s * er * 0.08 - ir * 0.35, -ir * 0.3, ir * 0.25, ir * 0.25); ctx.fill();
      if (st === "sleepy") { ctx.fillStyle = mix(L.skin, "#000000", 0.08); ctx.fillRect(-er * 2, -er * 2, er * 4, er * 1.85); }
      ctx.restore();
      // まぶたの線
      const lidY = st === "sleepy" ? -er * 0.15 : 0;
      ctx.beginPath();
      if (st === "sleepy") { ctx.moveTo(-er * wide, 0); ctx.quadraticCurveTo(0, lidY - er * 0.2, er * wide, 0); }
      else { ctx.moveTo(-er * wide * 1.05, er * 0.05); ctx.quadraticCurveTo(0, -er * tall * 1.4, er * wide * 1.05, er * 0.05); }
      ctx.strokeStyle = INK; ctx.lineWidth = lw * (female ? 1.9 : 1.5); ctx.lineCap = "round"; ctx.stroke();
      if (female) line(ctx, INK, lw * 1.2, [s * er * wide * 0.95, -er * 0.1, s * er * wide * 1.3, -er * 0.45]);
      ctx.restore();
    });
  }
  function browPair(ctx, L, cx, ey, sp, er, U) {
    const w = U * (L.sex === "女" ? 0.009 : 0.014) * (L.band === "old" ? 1.2 : 1);
    const c = L.band === "old" ? mix(L.hair, "#ffffff", 0.2) : mix(L.hair, "#000000", 0.25);
    const by = ey - er * (L.eyes === "round" ? 2.0 : 1.75);
    const b = L.brows;
    [-1, 1].forEach((s) => {
      const ix = cx + s * sp * 0.45, ox = cx + s * sp * 1.45;
      const iy = by + (b === "angry" ? er * 0.55 : b === "worried" ? -er * 0.45 : b === "raised" ? -er * 0.3 : 0);
      const oy = by + (b === "worried" ? er * 0.25 : b === "raised" && s === 1 ? -er * 0.5 : 0);
      if (s === 1 && L.marks.includes("eyepatch")) return;
      line(ctx, c, w, [ix, iy, (ix + ox) / 2, Math.min(iy, oy) - er * 0.2, ox, oy]);
    });
  }
  function mouthDraw(ctx, L, cx, my, mw, U) {
    const lw = U * 0.009, m = L.mouth;
    const lip = L.sex === "女" ? mix(L.skin, "#b03a3a", 0.45) : mix(L.skin, "#6a2a2a", 0.45);
    if (m === "smile") line(ctx, lip, lw * 1.3, [cx - mw, my - mw * 0.15, cx - mw * 0.4, my + mw * 0.22, cx + mw * 0.4, my + mw * 0.22, cx + mw, my - mw * 0.15]);
    else if (m === "frown") line(ctx, lip, lw * 1.3, [cx - mw * 0.85, my + mw * 0.2, cx, my - mw * 0.05, cx + mw * 0.85, my + mw * 0.2]);
    else if (m === "smirk") line(ctx, lip, lw * 1.3, [cx - mw * 0.8, my + mw * 0.05, cx + mw * 0.3, my + mw * 0.08, cx + mw * 0.95, my - mw * 0.25]);
    else if (m === "grin" || m === "open") {
      paint(ctx, "#4a1a1e", lw * 0.8, () => { if (m === "grin") { ctx.moveTo(cx - mw, my - mw * 0.1); ctx.quadraticCurveTo(cx, my + mw * 0.9, cx + mw, my - mw * 0.1); ctx.quadraticCurveTo(cx, my + mw * 0.12, cx - mw, my - mw * 0.1); } else ellipse(ctx, cx, my + mw * 0.15, mw * 0.45, mw * 0.4); });
      if (m === "grin") paint(ctx, "#f4efe4", 0, () => { ctx.moveTo(cx - mw * 0.85, my); ctx.quadraticCurveTo(cx, my + mw * 0.25, cx + mw * 0.85, my); ctx.quadraticCurveTo(cx, my + mw * 0.4, cx - mw * 0.85, my); });
    } else line(ctx, lip, lw * 1.3, [cx - mw * 0.75, my + mw * 0.05, cx + mw * 0.75, my + mw * 0.05]);
    if (L.sex === "女" && m !== "grin" && m !== "open") { ctx.fillStyle = rgba(lip, 0.45); ctx.beginPath(); ellipse(ctx, cx, my + mw * 0.22, mw * 0.35, mw * 0.12); ctx.fill(); }
  }

  // ---------------------------------------------------------------- 印（傷・髭・皺など）
  function marksUnder(ctx, L, cx, cy, rx, ry, ey, sp, er, U, jaw) {
    const has = (m) => L.marks.includes(m);
    const lw = U * 0.008;
    if (has("stubble") || has("dirt")) {
      ctx.save(); ctx.beginPath(); facePath(ctx, cx, cy, rx, ry, jaw); ctx.clip();
      if (has("stubble")) { ctx.fillStyle = rgba(mix(L.hair, "#2a2a2a", 0.4), 0.17); ctx.beginPath(); ellipse(ctx, cx, cy + ry * 0.85, rx * 0.95, ry * 0.45); ctx.fill(); }
      if (has("dirt")) { const R = rng(L.seed + ":dirt"); ctx.fillStyle = rgba("#4a3a22", 0.25); for (let i = 0; i < 5; i++) { ctx.beginPath(); ellipse(ctx, cx + (R() - 0.5) * rx * 1.4, cy + (R() - 0.2) * ry * 0.9, rx * 0.15, ry * 0.08); ctx.fill(); } }
      ctx.restore();
    }
    if (has("gaunt")) for (const s of [-1, 1]) line(ctx, rgba(mix(L.skin, "#000000", 0.4), 0.6), lw, [cx + s * rx * 0.62, cy + ry * 0.3, cx + s * rx * 0.55, cy + ry * 0.62]);
    if (has("blush")) { ctx.fillStyle = rgba("#e05a5a", 0.25); for (const s of [-1, 1]) { ctx.beginPath(); ellipse(ctx, cx + s * sp * 1.1, ey + er * 1.9, er * 1.1, er * 0.55); ctx.fill(); } }
    if (has("freckles")) { const R = rng(L.seed + ":frk"); ctx.fillStyle = rgba(mix(L.skin, "#6a3a1a", 0.6), 0.75); for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { ctx.beginPath(); ellipse(ctx, cx + s * (sp * 0.6 + R() * sp * 0.8), ey + er * (1.6 + R() * 1.1), U * 0.0045, U * 0.0045); ctx.fill(); } }
    if (has("wrinkles")) {
      const c = rgba(mix(L.skin, "#000000", 0.45), 0.55);
      for (let i = 0; i < 2; i++) line(ctx, c, lw * 0.8, [cx - rx * 0.45, cy - ry * (0.48 - i * 0.1), cx, cy - ry * (0.52 - i * 0.1), cx + rx * 0.45, cy - ry * (0.48 - i * 0.1)]);
      for (const s of [-1, 1]) { line(ctx, c, lw * 0.8, [cx + s * rx * 0.3, cy + ry * 0.4, cx + s * rx * 0.42, cy + ry * 0.66]); line(ctx, c, lw * 0.7, [cx + s * (sp + er * 1.4), ey, cx + s * (sp + er * 1.9), ey - er * 0.3]); line(ctx, c, lw * 0.7, [cx + s * (sp + er * 1.4), ey + er * 0.3, cx + s * (sp + er * 1.9), ey + er * 0.6]); }
    }
    if (has("bags")) for (const s of [-1, 1]) line(ctx, rgba(mix(L.skin, "#4a2a4a", 0.5), 0.6), lw * 0.8, [cx + s * sp - er * 0.8, ey + er * 1.05, cx + s * sp, ey + er * 1.3, cx + s * sp + er * 0.8, ey + er * 1.05]);
    if (has("tattoo")) {
      const c = L.kind === "majin" ? rgba(L.iris, 0.75) : rgba("#2a3a6a", 0.7);
      line(ctx, c, lw * 1.3, [cx - sp - er * 0.3, ey + er * 1.4, cx - sp - er * 0.1, ey + er * 2.6]);
      line(ctx, c, lw * 1.3, [cx - sp + er * 0.4, ey + er * 1.5, cx - sp + er * 0.3, ey + er * 2.3]);
    }
  }
  function beard(ctx, L, cx, cy, rx, ry, U, jaw) {
    const c = L.hair, lw = U * 0.008;
    if (L.marks.includes("beard")) {
      paint(ctx, vgrad(ctx, cy + ry * 0.3, cy + ry * 1.5, c), lw, () => {
        ctx.moveTo(cx - rx * 0.98, cy + ry * 0.15);
        ctx.bezierCurveTo(cx - rx * 1.0, cy + ry * 0.9, cx - rx * 0.5, cy + ry * 1.45, cx, cy + ry * 1.5);
        ctx.bezierCurveTo(cx + rx * 0.5, cy + ry * 1.45, cx + rx * 1.0, cy + ry * 0.9, cx + rx * 0.98, cy + ry * 0.15);
        ctx.lineTo(cx + rx * 0.82, cy + ry * 0.2);
        ctx.quadraticCurveTo(cx + rx * 0.7, cy + ry * 0.62, cx + rx * 0.35, cy + ry * 0.55);
        ctx.quadraticCurveTo(cx, cy + ry * 0.48, cx - rx * 0.35, cy + ry * 0.55);
        ctx.quadraticCurveTo(cx - rx * 0.7, cy + ry * 0.62, cx - rx * 0.82, cy + ry * 0.2);
        ctx.closePath();
      });
    }
  }
  function marksOver(ctx, L, cx, cy, rx, ry, ey, sp, er, my, mw, U) {
    const has = (m) => L.marks.includes(m);
    const lw = U * 0.008;
    if (has("mustache") || (has("beard") && L.band !== "young")) {
      const c = L.hair;
      for (const s of [-1, 1]) paint(ctx, c, lw * 0.8, () => { ctx.moveTo(cx, my - mw * 0.45); ctx.quadraticCurveTo(cx + s * mw * 0.9, my - mw * 0.75, cx + s * mw * 1.45, my + mw * 0.05); ctx.quadraticCurveTo(cx + s * mw * 0.8, my - mw * 0.2, cx, my - mw * 0.2); });
    }
    if (has("scar")) {
      const R = rng(L.seed + ":scar"), s = R() < 0.5 ? -1 : 1;
      const x0 = cx + s * sp * 0.5, y0 = ey - er * 1.8, x1 = cx + s * sp * 1.5, y1 = ey + er * 3;
      line(ctx, rgba("#8a3a3a", 0.8), lw * 1.2, [x0, y0, x1, y1]);
      for (let i = 1; i < 4; i++) { const t = i / 4, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t; line(ctx, rgba("#8a3a3a", 0.7), lw * 0.8, [px - er * 0.35, py + er * 0.1, px + er * 0.35, py - er * 0.1]); }
    }
    if (has("bandage")) {
      const bx = cx - sp * 1.1, by = ey + er * 2.2;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.5);
      for (const r of [0, Math.PI / 2]) { ctx.save(); ctx.rotate(r); paint(ctx, "#f0e4cc", lw * 0.6, () => ctx.rect(-er * 1.1, -er * 0.35, er * 2.2, er * 0.7)); ctx.restore(); }
      ctx.restore();
    }
    if (has("eyepatch")) {
      const ex = cx + sp;
      line(ctx, "#1a1418", lw * 1.2, [cx - rx * 1.02, ey - er * 2.2, ex, ey - er * 0.2, cx + rx * 1.02, ey + er * 0.3]);
      paint(ctx, "#1a1418", lw * 0.5, () => ellipse(ctx, ex, ey + er * 0.1, er * 1.35, er * 1.1));
    }
    if (has("glasses")) {
      ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = lw * 1.1;
      for (const s of [-1, 1]) { ctx.beginPath(); ellipse(ctx, cx + s * sp, ey, er * 1.55, er * 1.3); ctx.stroke(); ctx.fillStyle = "rgba(200,230,255,.15)"; ctx.fill(); }
      line(ctx, "#3a2a1a", lw * 1.1, [cx - sp + er * 1.5, ey - er * 0.2, cx + sp - er * 1.5, ey - er * 0.2]);
    }
    if (has("beak")) {
      // 疫医の嘴の仮面
      const mc = "#3a2a22";
      paint(ctx, mc, lw, () => { ctx.moveTo(cx - rx * 0.95, ey - er * 1.6); ctx.quadraticCurveTo(cx, ey - er * 2.4, cx + rx * 0.95, ey - er * 1.6); ctx.lineTo(cx + rx * 0.9, ey + er * 1.7); ctx.lineTo(cx - rx * 0.9, ey + er * 1.7); ctx.closePath(); });
      paint(ctx, rgrad(ctx, cx, my, rx * 0.5, "#4a3a2a"), lw, () => { ctx.moveTo(cx - rx * 0.4, ey + er * 1.2); ctx.quadraticCurveTo(cx + rx * 0.1, ey + er * 1.0, cx + rx * 0.4, ey + er * 1.2); ctx.quadraticCurveTo(cx + rx * 0.45, cy + ry * 0.9, cx + rx * 0.55, cy + ry * 1.45); ctx.quadraticCurveTo(cx + rx * 0.1, cy + ry * 1.0, cx - rx * 0.4, ey + er * 1.2); });
      for (const s2 of [-1, 1]) { paint(ctx, "#8a7a3a", lw, () => ellipse(ctx, cx + s2 * sp, ey, er * 1.45, er * 1.45)); ctx.fillStyle = "rgba(255,240,180,.55)"; ctx.beginPath(); ellipse(ctx, cx + s2 * sp - er * 0.4, ey - er * 0.4, er * 0.35, er * 0.35); ctx.fill(); }
    }
    if (has("monocle")) {
      ctx.strokeStyle = "#d8b040"; ctx.lineWidth = lw * 1.3;
      ctx.beginPath(); ellipse(ctx, cx + sp, ey, er * 1.6, er * 1.6); ctx.stroke();
      line(ctx, "#d8b040", lw * 0.7, [cx + sp + er * 1.2, ey + er * 1.1, cx + sp + er * 1.6, ey + er * 5]);
    }
  }

  // 頭の横に掛けた狐の面
  function foxMask(ctx, x, y, r, U) {
    const lw = U * 0.007;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.45);
    paint(ctx, "#f4f0e6", lw, () => { ctx.moveTo(-r * 0.8, -r * 0.2); ctx.lineTo(-r * 0.75, -r * 1.2); ctx.lineTo(-r * 0.3, -r * 0.55); ctx.quadraticCurveTo(0, -r * 0.65, r * 0.3, -r * 0.55); ctx.lineTo(r * 0.75, -r * 1.2); ctx.lineTo(r * 0.8, -r * 0.2); ctx.quadraticCurveTo(r * 0.7, r * 0.5, 0, r * 1.05); ctx.quadraticCurveTo(-r * 0.7, r * 0.5, -r * 0.8, -r * 0.2); });
    for (const s of [-1, 1]) {
      paint(ctx, "#c8282a", 0, () => { ctx.moveTo(s * r * 0.62, -r * 0.35); ctx.lineTo(s * r * 0.66, -r * 0.95); ctx.lineTo(s * r * 0.42, -r * 0.55); });
      line(ctx, "#c8282a", lw * 1.6, [s * r * 0.15, -r * 0.05, s * r * 0.5, -r * 0.25]);
      line(ctx, "#1a1418", lw * 1.2, [s * r * 0.18, r * 0.12, s * r * 0.48, r * 0.02]);
    }
    paint(ctx, "#1a1418", 0, () => ellipse(ctx, 0, r * 0.82, r * 0.1, r * 0.07));
    ctx.restore();
  }

  // ---------------------------------------------------------------- 入口
  G.paintPerson = (ctx, x, y, w, h, who) => {
    const L = who && who.marks && who.band ? who : G.personLook(who);
    const U = h, W = w;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    backdrop(ctx, L, x, y, w, h);
    const child = L.band === "child";
    const fs = FACES[L.face] || FACES.oval;
    const hs = child ? 1.12 : 1;
    const rx = U * 0.162 * fs[0] * hs * (L.sex === "女" ? 0.96 : 1), ry = U * 0.196 * fs[1] * hs;
    const jaw = fs[2] * (L.sex === "女" ? 0.9 : 1);
    const cx = x + w * 0.5;
    const cy = y + h * (child ? 0.44 : 0.39) + (L.hunch ? h * 0.04 : 0);
    const bottom = y + h;
    const neckW = rx * (L.sex === "女" ? 0.42 : L.build === "broad" ? 0.58 : 0.5);
    const y0 = cy + ry * (child ? 1.08 : 1.18);
    const S = { skin: L.skin };
    // 影の地面
    gearBack(ctx, L, cx, y0, U, W);
    hoodBack(ctx, L, cx, cy, rx, ry, U);
    hairBack(ctx, L, cx, cy, rx, ry, U);
    // 首
    paint(ctx, mix(L.skin, "#000000", 0.12), U * 0.008, () => ctx.rect(cx - neckW, cy + ry * 0.5, neckW * 2, y0 - cy - ry * 0.5 + U * 0.03));
    body(ctx, L, cx, y0, U, W, bottom, neckW, S);
    chest(ctx, L, cx, y0, U);
    // 首の影
    ctx.fillStyle = rgba("#000000", 0.18); ctx.beginPath(); ellipse(ctx, cx, cy + ry * 0.95, neckW * 1.1, ry * 0.18); ctx.fill();
    // 耳
    const ey = cy + ry * (child ? 0.2 : 0.1);
    // 獣人は横の耳を描かず、頭の上の耳を描く（L.ears === "none"。src/ui/r1_race.js）
    if (L.ears !== "none") for (const s of [-1, 1]) paint(ctx, mix(L.skin, "#b05a4a", 0.12), U * 0.008, () => {
      if (L.ears === "pointy") { ctx.moveTo(cx + s * rx * 0.9, ey - ry * 0.12); ctx.lineTo(cx + s * rx * 1.5, ey - ry * 0.55); ctx.lineTo(cx + s * rx * 0.95, ey + ry * 0.28); }
      else ellipse(ctx, cx + s * rx * 0.98, ey + ry * 0.06, rx * 0.15, ry * 0.2);
    });
    // 顔
    paint(ctx, rgrad(ctx, cx, cy, rx, L.skin), U * 0.009, () => facePath(ctx, cx, cy, rx, ry, jaw));
    const sp = rx * 0.4, er = rx * (child ? 0.2 : 0.155) * (L.sex === "女" ? 1.06 : 1);
    const my = cy + ry * (child ? 0.62 : 0.66), mw = rx * (child ? 0.22 : 0.28);
    marksUnder(ctx, L, cx, cy, rx, ry, ey, sp, er, U, jaw);
    beard(ctx, L, cx, cy, rx, ry, U, jaw);
    eyePair(ctx, L, cx, ey, sp, er, U);
    browPair(ctx, L, cx, ey, sp, er, U);
    // 鼻
    const nose = mix(L.skin, "#5a2a1a", 0.45);
    line(ctx, nose, U * 0.007, [cx + rx * 0.03, ey + er * 0.8, cx + rx * 0.1, cy + ry * 0.42, cx - rx * 0.04, cy + ry * 0.46]);
    mouthDraw(ctx, L, cx, my, mw, U);
    marksOver(ctx, L, cx, cy, rx, ry, ey, sp, er, my, mw, U);
    if (L.marks.includes("earring")) { ctx.strokeStyle = "#e0c050"; ctx.lineWidth = U * 0.006; ctx.beginPath(); ellipse(ctx, cx - rx * 1.0, ey + ry * 0.28, rx * 0.06, rx * 0.08); ctx.stroke(); }
    hairFront(ctx, L, cx, cy, rx, ry, U);
    if (L.beast && G.r1PaintEars) G.r1PaintEars(ctx, L, cx, cy, rx, ry, U, { ey, mix, INK });
    headwear(ctx, L, cx, cy, rx, ry, U);
    if (L.marks.includes("foxmask")) foxMask(ctx, cx - rx * 0.78, cy - ry * 0.72, rx * 0.5, U);
    // 周りを暗く
    const v = ctx.createRadialGradient(cx, y + h * 0.45, h * 0.35, cx, y + h * 0.5, h * 0.8);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.35)");
    ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
    ctx.restore();
  };

  // 仲間になった魔物など、人でないもの（モンスターの絵を胸から上に切り取る）
  function paintFoe(ctx, x, y, w, h, who) {
    const L = { bg: "#5a6a4a", kind: "foe", iris: "#ff3a3a", seed: "foe" };
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    backdrop(ctx, L, x, y, w, h);
    // 四つ足は頭が左の前にあるので、頭が枠の真ん中に来るように右へずらす
    const e = G.data && G.data.ENEMIES && G.data.ENEMIES[who.foe];
    const quad = G.monsterLook && G.monsterLook(who.foe, Object.assign({}, e, who.look ? { look: Object.assign({}, e && e.look, who.look) } : {})).body === "quad";
    if (G.paintMonster) G.paintMonster(ctx, quad ? x + w * 0.5 + h * 0.5 : x + w / 2, quad ? y + h * 1.05 : y + h * 1.25, h * 1.25, { id: who.foe, look: who.look });
    ctx.restore();
  }

  // 画面から呼ぶ入口。canvas の見た目の大きさに合わせて描き直す
  G.drawPortrait = (cv, who) => {
    if (!cv || !who) return;
    const rect = cv.getBoundingClientRect();
    const dpr = Math.min(2, (typeof devicePixelRatio === "number" && devicePixelRatio) || 1);
    // 隠れていて大きさが測れないときは、canvas に付いている大きさのまま描く
    if (rect.width > 0 && rect.height > 0) {
      const w = Math.round(rect.width * dpr), hh = Math.round(rect.height * dpr);
      if (cv.width !== w) cv.width = w;
      if (cv.height !== hh) cv.height = hh;
    }
    const w = cv.width, hh = cv.height;
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    if (who.kind === "foe") paintFoe(ctx, 0, 0, w, hh, who); else G.paintPerson(ctx, 0, 0, w, hh, who);
  };
})(globalThis.G = globalThis.G || {});
