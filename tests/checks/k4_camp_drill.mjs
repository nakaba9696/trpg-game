// K4：野営の稽古は、一人では伸びない（持ち主「野営の稽古は巻物を入手してたり、スキルを教えられるキャラと仲がよく同行している状態などの場合のみにして。一人で野営しても稼ぐのがいやなので」）
// - 一人の野営：稽古の行動は押せず、理由が一言で分かる。四十日野営しても何も伸びない
// - その技の巻物を持っていれば、その技だけ磨ける。教えられる仲間と打ち解けて同行していれば、その仲間が教えられる技だけ磨ける
// - 古いセーブ（S.k1 が無い）でも動く
export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const G = loadEngine();
  const D = G.data;
  const K = G.k1;
  if (!K || !K.drillGuide) { fail("G.k1.drillGuide が無い"); return; }
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  const wild = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "wild" && !(D.LOCS[id].pool || []).length) || Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "wild");
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats: st(30), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.companions = []; S.loc = wild; S.mode = "explore";
    S.skills = ["k1_parry", "k1_aim", "k1_lockpick"];
    return S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const camp = () => acts().filter((a) => /^k1camp:/.test(a.id));
  const drill = (S, id, days) => { for (let i = 0; i < days && !S.over; i++) { S.mode = "explore"; S.combat = null; S.event = null; S.loc = wild; const a = acts().find((x) => x.id === "k1camp:" + id && !x.disabled); if (a) G.act(a.id); } };
  const uses = (S) => Object.fromEntries(S.skills.map((id) => [id, K.uses(id, S)]));

  // 一人の野営
  {
    const S = start(11);
    const list = camp();
    if (list.some((a) => !a.disabled)) fail(`一人の野営で稽古が押せる（${list.filter((a) => !a.disabled).map((a) => a.label)}）`);
    const none = list.find((a) => a.id === "k1camp:none");
    if (!none || !/巻物|仲間/.test(none.sub || "")) fail(`一人で稽古できない理由が分からない（${none && none.sub}）`);
    const u0 = JSON.stringify(uses(S));
    for (const id of S.skills) drill(S, id, 15);
    G.act("k1camp:k1_parry");
    if (JSON.stringify(uses(S)) !== u0) fail(`一人で野営を重ねたら熟練が伸びた（${u0} → ${JSON.stringify(uses(S))}）`);
  }
  // 巻物：その技だけ
  {
    const S = start(21);
    G.give("k1s_parry");
    const ids = camp().filter((a) => !a.disabled).map((a) => a.id);
    if (ids.join() !== "k1camp:k1_parry") fail(`受け流しの巻物で、磨ける技が受け流しだけでない（${ids}）`);
    drill(S, "k1_parry", 10);
    if (!(K.uses("k1_parry", S) > 0)) fail("巻物を見ながら磨いても受け流しの熟練が上がらない");
    if (K.uses("k1_aim", S) || K.uses("k1_lockpick", S)) fail("巻物の無い技まで伸びた");
  }
  // 仲間：打ち解けて同行している仲間が教えられる技だけ
  {
    const S = start(31);
    S.companions = [{ id: "t1", name: "弓使いのイオ", cls: "弓使い", power: 45, dmg: 1, desc: "目がいい", bond: 30 }];
    if (camp().some((a) => !a.disabled)) fail("打ち解けていない仲間がいるだけで、稽古ができる");
    S.companions[0].bond = 80;
    const ids = camp().filter((a) => !a.disabled).map((a) => a.id);
    if (!ids.includes("k1camp:k1_aim")) fail(`打ち解けた弓使いがいるのに、狙い撃ちを磨けない（${ids}）`);
    if (ids.includes("k1camp:k1_parry") || ids.includes("k1camp:k1_lockpick")) fail(`弓使いが教えられない技まで磨ける（${ids}）`);
    drill(S, "k1_aim", 10);
    if (!(K.uses("k1_aim", S) > 0)) fail("仲間に見てもらっても狙い撃ちの熟練が上がらない");
    if (K.uses("k1_parry", S)) fail("仲間の教えられない技まで伸びた");
    S.companions = [];
    if (camp().some((a) => !a.disabled)) fail("仲間が去ったあとも稽古ができる");
  }
  // 古いセーブ
  {
    const S = start(41);
    delete S.k1;
    G.give("k1s_parry");
    try { camp(); drill(S, "k1_parry", 1); if (!(K.uses("k1_parry", S) > 0)) fail("古いセーブで巻物の稽古が効かない"); } catch (e) { fail(`古いセーブで例外 ${e.stack || e}`); }
  }
  if (!bad) ok("野営の稽古は一人では伸びない（巻物の技・打ち解けた仲間が教えられる技だけ）");
};
