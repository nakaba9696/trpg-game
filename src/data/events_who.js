// 今ある出来事に、出てくる人物の種類（who）を付ける。人物の絵は src/ui/art_people.js が描く。
// who は "<種類>" か { kind, sex, age, look }。種類の一覧は art_people.js の G.PEOPLE。魔物なら { kind: "foe", foe: "<敵 id>" }。
// 新しい出来事は、この表ではなく出来事のデータに直接 who を書けばよい（表は、他のレーンのファイルを書き換えずに付けるためのもの）。レーン A（絵）が管理
(function (G) {
  const D = G.data;
  const WHO = {
    brawl: { kind: "villager", sex: "男", age: 35, look: { build: "broad", mouth: "frown", brows: "angry", marks: ["stubble", "blush"] } },
    pickpocket: { kind: "child", look: { marks: ["dirt"] } },
    carriage: { kind: "noble", sex: "男" },
    peddler: { kind: "merchant", sex: "男", look: { mouth: "grin", marks: ["gaunt"] } },
    heretic: { kind: "elder", sex: "男", look: { outfit: "rags", marks: ["wrinkles", "dirt", "beard"] } },
    donation: { kind: "priest", sex: "女", age: 24, look: { head: "veil" } },
    slaver: { kind: "rogue", sex: "男", age: 40, look: { chest: "coins", mouth: "grin" } },
    fortune: { kind: "elder", sex: "女", age: 78, look: { head: "hood", chest: "gem" } },
    duel: { kind: "knight", sex: "男", age: 20, look: { head: "none", mouth: "open", marks: ["blush"] } },
    toll: "rogue",
    fallen: { kind: "adventurer", look: { eyes: "sleepy", mouth: "open", brows: "worried", marks: ["bandage", "dirt"] } },
    caravan: { kind: "merchant", look: { brows: "worried", mouth: "open" } },
    barrelparty: { kind: "foe", foe: "barrelgob" },
    werevillage: { kind: "villager", look: { brows: "worried", mouth: "open" } },
    deserter_help: { kind: "soldier", sex: "男", look: { head: "none", brows: "worried", marks: ["stubble", "bags"] } },
    mirza: { kind: "majin", sex: "男", age: 22, look: { head: "none", hairStyle: "long", hair: "#e8e4ec", eyes: "smile", mouth: "smile", outfit: "noble", cloth: "#3a1a4a" } },
    frontline: { kind: "soldier", sex: "男", age: 46, look: { outfit: "armor", head: "helmet", marks: ["scar", "mustache"] } },
    tsujigiri: { kind: "ronin", sex: "男", look: { head: "kasa", gear: "katana" } },
    prince: { kind: "rogue", sex: "男", look: { head: "hood", outfit: "cloak", cloth: "#1a1a22", mouth: "flat" } },
    // V1（events_town2.js）
    v1_zalve: { kind: "merchant", sex: "男", look: { head: "none", mouth: "smirk", cloth: "#8a7a5a", marks: ["monocle", "gaunt"] } },
    v1_borg: { kind: "rogue", sex: "男", age: 40, look: { build: "broad", head: "none", mouth: "grin", marks: ["scar", "stubble"] } },
    v1_spatship: { kind: "sailor", sex: "男", age: 56, look: { brows: "worried", mouth: "open" } },
    v1_mermaid: { kind: "merchant", sex: "男", look: { eyes: "smile", mouth: "grin", head: "hat" } },
    v1_pilgrims: { kind: "priest", sex: "男", age: 50, look: { head: "mitre", mouth: "open" } },
    v1_taster: { kind: "host", sex: "男", age: 45, look: { brows: "worried", mouth: "frown" } },
    v1_boardgame: { kind: "elder", sex: "男", age: 72, look: { outfit: "noble", head: "none", gear: "none", hairStyle: "slick", mouth: "smirk", marks: ["wrinkles", "monocle", "mustache"] } },
    v1_conscript: { kind: "knight", sex: "男", look: { head: "helmet", cloth: "#1a1a22", mouth: "frown", brows: "angry" } },
    v1_skyshadow: { kind: "foe", foe: "wyvern" },
    v1_latrine: { kind: "foe", foe: "goblin" },
    v1_plague: { kind: "mage", sex: "男", look: { head: "hood", cloth: "#1a1a1a", gear: "none", chest: "none", marks: ["beak"] } },
    v1_golem: { kind: "foe", foe: "dogu" },
    v1_foxdice: { kind: "foe", foe: "w1_konoha" },
    v1_foxfest: { kind: "majin", sex: "女", age: 28, look: { head: "veil", hairStyle: "long", eyes: "narrow", mouth: "smile", brows: "calm", cloth: "#4a2a5a" } },
    v1_returned: { kind: "sailor", sex: "男", age: 24, look: { gear: "none", head: "none", brows: "worried", mouth: "open" } },
    v1_yuradream: { kind: "child", age: 6, look: { eyes: "sleepy", mouth: "flat", head: "none" } },
  };
  // 読み込む順番に関係なく使えるように、表として置く（G.eventWho が見る）。出来事のデータに who があればそちらが先
  D.EVENT_WHO = Object.assign(D.EVENT_WHO || {}, WHO);
})(globalThis.G = globalThis.G || {});
