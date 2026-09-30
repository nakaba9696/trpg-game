// 今ある出来事に、出てくる人物の種類（who）を付ける。人物の絵は src/ui/art_people.js が描く。
// who は "<種類>" か { kind, sex, age, look }。種類の一覧は art_people.js の G.PEOPLE。魔物なら { kind: "foe", foe: "<敵 id>" }。
// 新しい出来事は、この表ではなく出来事のデータに直接 who を書けばよい。レーン A（絵）が管理
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
    mirza: { kind: "majin", sex: "女", age: 16, look: { head: "crown", hairStyle: "long", mouth: "smirk" } },
    frontline: { kind: "soldier", sex: "男", age: 46, look: { outfit: "armor", head: "helmet", marks: ["scar", "mustache"] } },
    tsujigiri: { kind: "ronin", sex: "男", look: { head: "kasa", gear: "katana" } },
    prince: { kind: "rogue", sex: "男", look: { head: "hood", outfit: "cloak", cloth: "#1a1a22", mouth: "flat" } },
  };
  (D.EVENTS || []).forEach((e) => { if (!e.who && WHO[e.id]) e.who = WHO[e.id]; });
})(globalThis.G = globalThis.G || {});
