// A4：人物の絵が出ていなかった出来事に、出てくる人物（who）を付ける。書き方は events_who.js と同じ。
// あわせて「人の姿が出ない出来事」（声だけ・物だけ・見えない何か）を D.EVENT_NOBODY に並べる。
// tests/checks/a4_art.mjs は、どの出来事も who があるか EVENT_NOBODY にあるかを確かめる。
// 新しい出来事は、出来事のデータに who を書くか、人が出なければこの表の EVENT_NOBODY に id を足す。レーン A（絵）が管理
(function (G) {
  const D = G.data;
  // 同じ人が別の出来事にも出るときは seed をそろえて、同じ顔にする
  const captain = { kind: "sailor", sex: "男", age: 52, seed: "ev:m6_wall_captain", look: { head: "cap", mouth: "smirk", marks: ["eyepatch", "beard"] } };
  const WHO = {
    // I1（持ち物の出来事）
    i1_frog: { kind: "foe", foe: "slime", name: "蛙の王", look: { skin: "#6a9a3a", skin2: "#c8d88a", eyes: "googly", mouth: "grin", pattern: "spots", extra: ["crown", "blush"], mood: "silly" } },
    // M1（学院）
    m1_dropout: { kind: "mage", sex: "男", age: 31, look: { head: "none", gear: "none", chest: "none", cloth: "#3a3440", eyes: "sleepy", mouth: "smirk", marks: ["stubble", "bags"] } },
    // M6（東の果て）：同じ船長が最後まで
    m6_wall_log: { kind: "elder", sex: "女", age: 74, look: { head: "kerchief", eyes: "narrow", mouth: "grin" } },
    m6_wall_captain: captain,
    m6_wall_sea: captain,
    m6_wall: Object.assign({}, captain, { look: { head: "cap", mouth: "flat", brows: "worried", marks: ["eyepatch", "beard"] } }),
    // M3（足音）
    m3_steps2: { kind: "host", sex: "女", age: 48, look: { mouth: "flat", brows: "worried", head: "kerchief" } },
    // M4（世界の出来事）
    m4_here_hunger: { kind: "guard", sex: "男", age: 50, look: { head: "none", gear: "none", brows: "worried", mouth: "open", marks: ["stubble", "bags"] } },
    m4_ruin_board: { kind: "villager", sex: "男", age: 19, look: { head: "none", brows: "worried", mouth: "open", marks: ["glasses"] } },
    m4_ruin_looter: { kind: "child", sex: "女", age: 9, look: { mouth: "frown", brows: "angry", marks: ["dirt"] } },
    m4_famine_bread: { kind: "child", sex: "男", age: 7, look: { mouth: "open", brows: "worried", marks: ["dirt"] } },
    // 嘴の仮面の医者は、腐れ庭園の天幕の医者と同じ顔（言わないが、見れば分かる）
    m4_plague_mask: { kind: "mage", sex: "女", seed: "ev:e2_berna_clinic", look: { head: "hood", cloth: "#1a1a1a", gear: "none", chest: "none", marks: ["beak"] } },
    m4_conscript: { kind: "villager", sex: "男", age: 14, look: { head: "none", brows: "raised", mouth: "flat", marks: ["freckles"] } },
    m4_deserter: { kind: "soldier", sex: "男", age: 19, look: { head: "none", gear: "none", brows: "worried", mouth: "open", marks: ["dirt", "bags"] } },
    m4_mercs: { kind: "adventurer", sex: "男", age: 40, look: { head: "none", brows: "worried", mouth: "flat", marks: ["beard"] } },
    m4_warend_board: { kind: "elder", sex: "男", age: 70, look: { outfit: "apron", head: "none", gear: "none", brows: "worried", mouth: "flat", marks: ["wrinkles", "beard", "bags"] } },
    m4_mourning: { kind: "soldier", sex: "男", look: { head: "helmet", brows: "angry", mouth: "frown" } },
    m4_oldking: { kind: "noble", sex: "男", age: 71, look: { hair: "#b8b8bc", hairStyle: "messy", head: "none", eyes: "round", brows: "raised", mouth: "open", chest: "none", marks: ["wrinkles", "beard"] } },
    m4_refugees: { kind: "villager", sex: "男", age: 38, look: { head: "none", brows: "worried", mouth: "flat", marks: ["dirt", "stubble"] } },
    // M5（正気と獣の病）
    m5_bloodwine: { kind: "rogue", sex: "男", look: { head: "none", gear: "none", eyes: "narrow", mouth: "smirk", marks: ["bandage", "bags"] } },
    m5_inspect: { kind: "guard", sex: "男", look: { brows: "angry", mouth: "frown" } },
    m5_oldbeast: { kind: "foe", foe: "wolf", name: "首に布を巻いた獣" },
    m5_madman: { kind: "beggar", sex: "男", age: 55, look: { outfit: "robe", eyes: "round", mouth: "open", marks: ["glasses", "dirt", "bags"] } },
    m5_faces: { kind: "villager", sex: "女", age: 36, look: { head: "kerchief", eyes: "round", mouth: "open" } },
    m5_fools: { kind: "foe", foe: "goblin", look: { weapon: "none", eyes: "googly", mouth: "o", extra: ["nose", "blush"], mood: "silly" } },
    m5_pawn: { kind: "merchant", sex: "男", age: 60, look: { head: "none", eyes: "sleepy", mouth: "flat", marks: ["glasses", "bags"] } },
    // W1（聖都の地下）
    w1_bloodfont: { kind: "priest", sex: "男", age: 50, look: { eyes: "sleepy", mouth: "open", head: "none", gear: "none", marks: ["beard", "wrinkles", "bags"] } },
    // M7（賽の夜）
    m7_dicenight: { kind: "villager", look: { mouth: "grin", marks: ["foxmask"] } },
  };
  D.EVENT_WHO = Object.assign(D.EVENT_WHO || {}, WHO);

  // 人の姿が出ない出来事（物・場所・声だけ・見えない何か）。絵を出さないのが正しいもの
  D.EVENT_NOBODY = (D.EVENT_NOBODY || []).concat([
    "shrine", "spring", "goblinnest", "trap", "chest", "chest_open", "stele", "sleeper", "corpse", "redmoon",
    "i1_spoon", "i1_eyering", "i1_majincoat",
    "w1_tithe", "w1_gods", "w1_bonewall",
    "m1_blackpage", "e2_sweetsmell",
    "m3_steps",
    "m4_here_sky", "m4_here_rot", "m4_here_dance", "m4_here_passing", "m4_piece",
    "m5_bury", "m5_hunt", "m5_wallwords", "m5_footsteps", "m5_crown", "m5_shell",
    "u3_statue", "u3_lostbag", "u3_milestone", "u3_campsite", "u3_carved_tree", "u3_lastnote", "u3_boast", "u3_brokenidol",
    "w2_echo", "w2_echostone", "w2_shadowtalk", "w2_aciddrip", "w2_lunch",
    "v2_dice", "m7_shrine",
  ]);
})(globalThis.G = globalThis.G || {});
