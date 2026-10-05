// M12：世の大事の出来事に出てくる人物（who）。人の姿が出ない出来事は D.EVENT_NOBODY に。書き方は events_who_a4.js と同じ
// レーン C＋V＋W（M12）
(function (G) {
  const D = G.data;
  const WHO = {
    m12_apostle_vol: { kind: "soldier", sex: "男", age: 38, look: { brows: "worried", mouth: "flat", marks: ["stubble", "bags"] } },
    m12_apostle_flee: { kind: "elder", sex: "女", age: 76, look: { head: "kerchief", brows: "worried", mouth: "flat" } },
    m12_apostle_here: { kind: "soldier", sex: "男", age: 24, look: { brows: "worried", mouth: "open" } },
    w6_m12_apostle: { kind: "villager", sex: "男", age: 45, look: { head: "none", brows: "worried", mouth: "open", marks: ["stubble", "dirt"] } },
    m12_dragon_look: { kind: "merchant", sex: "男", age: 40, look: { mouth: "grin", marks: ["stubble"] } },
    m12_dragon_herd: { kind: "villager", sex: "男", age: 55, look: { head: "none", brows: "worried", mouth: "frown", marks: ["beard"] } },
    m12_dragon_hunt: { kind: "knight", sex: "女", age: 36, look: { mouth: "flat", marks: ["scar"] } },
    m12_dragon_here: { kind: "villager", sex: "女", age: 30, look: { brows: "worried", mouth: "open" } },
    m12_succ_a: { kind: "noble", sex: "男", age: 60, look: { mouth: "flat" } },
    m12_succ_b: { kind: "noble", sex: "男", age: 48, look: { mouth: "smirk" } },
    m12_succ_night: { kind: "knight", sex: "男", age: 22, look: { brows: "worried", mouth: "open" } },
    m12_forest_a: { kind: "soldier", sex: "男", age: 44, look: { mouth: "flat", marks: ["beard"] } },
    m12_forest_b: { kind: "mage", sex: "女", age: 120, look: { mouth: "flat" } },
    m12_forest_mend: { kind: "priest", sex: "女", age: 33, look: { brows: "worried", mouth: "flat" } },
    m12_inq_pyre: { kind: "priest", sex: "男", age: 50, look: { mouth: "flat" } },
    m12_inq_books: { kind: "mage", sex: "男", age: 17, look: { brows: "worried", mouth: "open", marks: ["glasses"] } },
    m12_inq_here: { kind: "priest", sex: "女", age: 41, look: { mouth: "flat" } },
    m12_cough_help: { kind: "mage", sex: "男", age: 58, look: { mouth: "flat", marks: ["bags"] } },
    m12_cough_here: { kind: "host", sex: "男", age: 52, look: { brows: "worried", mouth: "flat" } },
    w6_m12_cough: { kind: "guard", sex: "男", age: 35, look: { mouth: "flat" } },
    m12_locust_smoke: { kind: "villager", sex: "男", age: 47, look: { head: "none", mouth: "frown", marks: ["dirt"] } },
    m12_locust_soup: { kind: "priest", sex: "女", age: 28, look: { mouth: "smile" } },
    m12_pirates_dock: { kind: "sailor", sex: "男", age: 70, look: { mouth: "grin", marks: ["beard"] } },
    m12_pirates_crew: { kind: "sailor", sex: "男", age: 26, look: { brows: "worried", mouth: "flat" } },
    m12_pirates_here: { kind: "rogue", sex: "男", age: 39, look: { mouth: "smirk", marks: ["beard"] } },
    m12_mig_wall: { kind: "adventurer", sex: "男", age: 61, look: { mouth: "flat", marks: ["scar", "beard"] } },
    m12_dig_join: { kind: "adventurer", sex: "女", age: 45, look: { mouth: "smirk", marks: ["dirt"] } },
    m12_volcano_cart: { kind: "villager", sex: "男", age: 34, look: { brows: "worried", mouth: "open" } },
    m12_volcano_elder: { kind: "elder", sex: "男", age: 81, look: { mouth: "flat", marks: ["beard"] } },
    m12_volcano_here: { kind: "host", sex: "男", age: 50, look: { brows: "worried", mouth: "open" } },
    m12_winter_sled: { kind: "soldier", sex: "男", age: 29, look: { mouth: "flat" } },
    m12_winter_wolves: { kind: "guard", sex: "男", age: 46, look: { brows: "worried", mouth: "flat", marks: ["stubble"] } },
    m12_winter_here: { kind: "host", sex: "男", age: 63, look: { mouth: "grin", marks: ["beard"] } },
  };
  D.EVENTS.forEach((e) => { if (WHO[e.id] && !e.who) e.who = Object.assign({ seed: "ev:" + e.id }, WHO[e.id]); });
  // 人の姿が出ない（空の牧場・小鬼・扉・早すぎる雪）
  D.EVENT_NOBODY = (D.EVENT_NOBODY || []).concat(["w6_m12_dragon", "w6_m12_mig", "m12_dig_door", "w6_m12_winter"]);
})(globalThis.G = globalThis.G || {});
