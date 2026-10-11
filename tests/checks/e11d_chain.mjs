// E11 のあと（持ち主の決定 B）：明けの鎖（id byakuya）は敏捷で振る。鉤槍ヴォルグリム（volgrim）は筋力のまま
// - 鎖を持つと、敏捷の高い人ほど当たりやすい（筋力の高い人より）
// - 錆びた留め具の筋（F2）の文に、鍔・鞘が残っていない（小物だけ差し替えた。フラグ f2_sold_tsuba・echo f2_tsuba_* はそのまま）
const PROFILE = { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" };

export default ({ fail, loadEngine, seeded }) => {
  const G0 = loadEngine();
  const D0 = G0.data;
  if (D0.ITEMS.byakuya.stat !== "敏捷") fail(`明けの鎖が敏捷で振れない（${D0.ITEMS.byakuya.stat}）`);
  if (D0.ITEMS.volgrim.stat !== "筋力") fail(`鉤槍ヴォルグリムが筋力でない（${D0.ITEMS.volgrim.stat}）`);

  const hit = (high) => {
    const G = loadEngine();
    G.rand = seeded(7);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    G.data.STATS.forEach((k) => { stats[k] = 10; caps[k] = 99; });
    stats[high] = 45;
    G.newGame({ cls: "merc", stats, caps, goal: "sword", profile: { ...PROFILE } });
    G.give("byakuya"); G.equip("byakuya");
    G.S.mode = "event";
    G.startCombat(["shuten"], {});
    if (!G.S.combat) { fail("鎖の確認：戦いが始まらない"); return 0; }
    return G.cb.attack();
  };
  const agi = hit("敏捷"), str = hit("筋力");
  if (!(agi > str)) fail(`明けの鎖：敏捷の高い人（${agi}%）が筋力の高い人（${str}%）より当たりにくい`);

  // 錆びた留め具の筋
  const ids = ["f2_sword_1", "f2_sword_2", "f2_sword_3", "f2_sword_4", "f2_sword_5", "f2r_tsuba_left", "f2r_tsuba_kept", "f2r_tsuba_sold"];
  const evs = (D0.EVENTS || []).filter((e) => ids.includes(e.id));
  if (evs.length < 5) fail(`錆びた留め具の筋の出来事が見つからない（${evs.length}）`);
  const txt = JSON.stringify(evs) + JSON.stringify((D0.F2_THREADS || {}).sword || {});
  const m = txt.match(/鍔|鞘/);
  if (m) fail(`錆びた留め具の筋に「${m[0]}」が残っている`);
};
