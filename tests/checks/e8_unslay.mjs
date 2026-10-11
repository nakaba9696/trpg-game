// E8：討伐できる使徒は S 2・A 6・B 8（持ち主の決定。E9 で海嘯を S から A に。src/data/e8_unslay.js・src/engine/zz_e8_unslay.js）
// - 倒せない使徒には勝つ道が無い：挑む結果（e3fight）も、直接の戦いも、戦いにならず一行が出る。会う出来事はそのまま残る
// - 「五体倒した」は討伐できる使徒だけで数える。古いセーブの倒した記録は残る（図鑑も壊れない）
const PROFILE = { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" };

export default ({ fail, loadEngine, seeded }) => {
  const G0 = loadEngine();
  const D0 = G0.data;
  const LIST = D0.E3.LIST;
  const U = (D0.E8 || {}).UNSLAY;
  if (!U || !G0.e3Slayable) return fail("倒せない使徒の表（D.E8.UNSLAY・G.e3Slayable）が無い");
  const slay = Object.values(LIST).filter((a) => G0.e3Slayable(a.id));
  const n = (r) => slay.filter((a) => a.rank === r).length;
  if (n("S") !== 2 || n("A") !== 6 || n("B") !== 8) fail(`討伐できる使徒の数が S2・A6・B8 でない（E9 で海嘯を A に）：S${n("S")}・A${n("A")}・B${n("B")}`);
  const WANT = ["kurobane", "tojizuki", "lugu", "graw", "mordu", "zalve", "chezar", "azlag", "gormore", "levian", "mirza", "aurelia", "notari", "tetsukui", "togaoi", "sanno"];
  for (const id of WANT) if (!LIST[id] || !G0.e3Slayable(id)) fail(`持ち主が選んだ討伐できる使徒 ${id} が倒せない`);
  for (const id of ["sekaiju", "yura", "midori", "yoihime", "yuzuel"]) if (!LIST[id] || G0.e3Slayable(id)) fail(`倒せない使徒 ${id} が倒せる`);
  for (const id of Object.keys(U)) {
    if (!LIST[id]) { fail(`倒せない使徒の表に、使徒でない ${id}`); continue; }
    if (!U[id] || U[id].length < 40) fail(`倒せない使徒 ${id} の一行が短い`);
    if (/魔王|見世物|観客|舞台|台本/.test(U[id])) fail(`倒せない使徒 ${id} の一行に使ってはいけない言葉`);
    if (!D0.EVENTS.find((e) => e.id === "e3_meet_" + id) && !D0.EVENTS.some((e) => e.choices.some((c) => c.ok && c.ok.e3fight === id))) fail(`倒せない使徒 ${id} に会う出来事が無い`);
  }

  const start = (G, seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    G.data.STATS.forEach((k) => { stats[k] = 99; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { ...PROFILE } });
    G.S.weapon = "volgrim";
  };
  // 勝つ道が無い：挑んでも、直接戦わせても、戦いにならない
  for (const id of Object.keys(U)) {
    const G = loadEngine();
    start(G, 3);
    const S = G.S;
    const a = G.data.E3.LIST[id];
    a.keys.forEach((k) => { k.test = () => true; });
    S.mode = "event";
    G.apply({ e3fight: id, text: "前の文" });
    if (S.combat || S.mode === "combat") fail(`倒せない使徒 ${id} に挑むと戦いになる`);
    if (!S.log.some((l) => l.text === U[id])) fail(`倒せない使徒 ${id} に挑んでも、一行が出ない`);
    if (!S.log.some((l) => /前の文/.test(l.text || ""))) fail(`倒せない使徒 ${id} に挑む結果の、ほかの文が消える`);
    G.startCombat([a.foe]);
    if (S.combat) fail(`倒せない使徒 ${id} と直接戦いになる`);
    if (S.flags[a.flag]) fail(`倒せない使徒 ${id} の倒した印が付く`);
  }
  // 討伐できる使徒は、これまでどおり戦いになる
  {
    const G = loadEngine();
    start(G, 4);
    G.S.mode = "event";
    G.apply({ e3fight: "levian" });
    if (!G.S.combat) fail("討伐できる使徒（忘れ水）に挑んでも戦いにならない");
  }
  // 古いセーブ：倒せない使徒を倒した記録があっても、図鑑は壊れず、記録は残る。「五体」は討伐できる使徒だけで数える
  {
    const G = loadEngine();
    start(G, 5);
    G.P.slain = Object.fromEntries(["e3_yura", "e3_sekaiju", "e3_midori", "e3_yoihime", "e3_levian"].map((f) => [f, { n: 1, at: 1, by: "昔の人", name: f }]));
    const cx = G.e3Codex("e3_yura");
    if (!cx || !cx.slain || !cx.noslay) fail("古いセーブの倒せない使徒の記録が図鑑で読めない");
    if (!G.e3EverSlain("e3_yura")) fail("古いセーブの倒した記録が消える");
    // 討伐できる使徒を一体倒す（記録の上で）→ 討伐できるのは 2 体なので「五体」は付かない
    G.S.mode = "event";
    G.data.E3.LIST.mirza.keys.forEach((k) => { k.test = () => true; });
    G.apply({ e3fight: "mirza" });
    let i = 0;
    while (G.S.mode === "combat" && !G.S.over && i++ < 300) G.act("cb:attack");
    if (G.S.flags[G.data.E3.LIST.mirza.flag] && G.P.trophies.e3_five) fail("倒せない使徒の古い記録まで「五体倒した」に数えている");
  }
};
