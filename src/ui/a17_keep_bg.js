// A17：背景込みの一枚絵として出す魔物（持ち主の判断 10/8。docs/art/cutout_review/questions.json の answers）。
// 背景除去のモデルで切り抜かず（assets は元の絵のまま）、表示のときの白い背景消し（a13_cutout.js の keyOut）にも通さない。
// 縁と足元は、ほかの魔物と同じ仕上げ（v6_monsters.js の finish：丸いぼかし・足元を消す・色をくすませる）で戦闘の背景になじませる。レーン A（絵）
(function (G) {
  G.a17KeepBg = new Set([
    "monsters/e3_yuzuel", "monsters/e3_lugu", "monsters/e3_notari", "monsters/graw", "monsters/e3_tojizuki", "monsters/e3_levian",
    "monsters/e3_tetsukui", "monsters/e3_sekaiju", "monsters/e4_vulture", "monsters/e4_rockeater", "monsters/e4_rockeater_x", "monsters/e4_warcrow",
  ]);
})(globalThis.G = globalThis.G || {});
