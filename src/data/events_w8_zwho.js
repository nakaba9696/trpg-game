// （名前の z は、ほかの events_w8_*.js より後に読ませるため）
// W8：進むときの出来事に出る人物の絵（who）と、人の出ない出来事（D.EVENT_NOBODY）。書き方は events_who.js と同じ
// 強敵の出会いは、その強敵の絵。前触れ・脇道・部屋・難所・天候・痕跡・夜（旅人のほか）は人が出ない
// レーン W＋V（W8）
(function (G) {
  const D = G.data;
  const WHO = {
    w8p_hunter: { kind: "archer", sex: "男", age: 46, look: { marks: ["stubble"] } },
    w8p_herbwife: { kind: "elder", sex: "女", age: 71, look: { head: "kerchief", mouth: "grin" } },
    w8p_deserter: { kind: "soldier", sex: "男", age: 19, look: { brows: "worried", marks: ["dirt", "gaunt"] } },
    w8p_deserter2: { kind: "villager", sex: "男", age: 20, seed: "ev:w8p_deserter", look: { mouth: "grin" } },
    w8p_lostchild: { kind: "child", sex: "女", age: 6, look: { marks: ["dirt"] } },
    w8p_rivals: { kind: "adventurer", sex: "男", age: 30, look: { mouth: "grin" } },
    w8p_conman: { kind: "rogue", sex: "男", age: 38, look: { mouth: "smirk" } },
    w8p_fugitive: { kind: "villager", sex: "男", age: 33, look: { brows: "worried" } },
    w8p_pilgrim: { kind: "priest", sex: "男", age: 68 },
    w8p_hermit: { kind: "elder", sex: "男", age: 60, look: { marks: ["beard"] } },
    w8p_sled: { kind: "villager", sex: "男", age: 40, look: { brows: "worried" } },
    w8p_beachkid: { kind: "child", sex: "男", age: 8 },
    w8p_survivor: { kind: "merchant", sex: "男", age: 45, look: { marks: ["gaunt", "dirt"] } },
    w8p_eelman: { kind: "villager", sex: "男", age: 50, look: { mouth: "grin" } },
    w8p_courier: { kind: "soldier", sex: "男", age: 17, look: { brows: "worried" } },
    w8d_party: { kind: "adventurer", sex: "男", age: 34 },
    w8d_peddler: { kind: "merchant", sex: "男", age: 55, look: { mouth: "smirk" } },
    w8d_novice: { kind: "adventurer", sex: "男", age: 16, look: { brows: "worried" } },
    w8n_visitor: { kind: "villager", sex: "男", age: 40 },
  };
  const nobody = [];
  D.EVENTS.forEach((e) => {
    if (!e.w8) return;
    if (WHO[e.id]) e.who = WHO[e.id];
    else if (e.w8.kind === "meet" && D.ENEMIES[e.w8.foe]) e.who = { kind: "foe", foe: e.w8.foe };
    else if (!e.who) nobody.push(e.id);
  });
  D.EVENT_NOBODY = (D.EVENT_NOBODY || []).concat(nobody);
})(globalThis.G = globalThis.G || {});
