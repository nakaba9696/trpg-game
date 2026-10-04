// M3：国ごとの評判と悪名、賞金首、咎追い（core.js・engine/m3_repute.js・data/events_m3.js・data/m3_lore.js）
export default ({ G, fail: fail0, ok, loadEngine, seeded }) => {
  let failures = 0;
  const fail = (m) => { failures++; fail0(m); };
  G = loadEngine();
  G.data.Q8H.off = true; // 悪名がバレたときだけ上がる（Q8）は tests/checks/q8_hidden.mjs で確かめる。ここは悪名の仕組みだけ
  const D = G.data;
    // データ：罪の表・既存の出来事の悪行・倒すと罪になる相手・出来事の結果の罪
  const evById = Object.fromEntries(D.EVENTS.map((e) => [e.id, e]));
  for (const [k, d] of Object.entries(D.DEEDS)) {
    const [id, i] = k.split(":");
    if (!evById[id]?.choices[Number(i)]) fail(`D.DEEDS ${k}: 出来事か選択肢が無い`);
    if (!D.CRIMES[d.crime]) fail(`D.DEEDS ${k}: 罪 ${d.crime} が無い`);
    if (d.on && !["ok", "ng", "any"].includes(d.on)) fail(`D.DEEDS ${k}: on は ok / ng / any`);
  }
  for (const [id, c] of Object.entries(D.LAWFUL)) { if (!D.ENEMIES[id]) fail(`D.LAWFUL: 敵 ${id} が無い`); if (!D.CRIMES[c]) fail(`D.LAWFUL ${id}: 罪 ${c} が無い`); }
  const m3 = D.EVENTS.filter((e) => e.id.startsWith("m3_"));
  for (const e of m3) e.choices.forEach((c, i) => [c.ok, c.ng, c.win].forEach((o) => { if (o?.crime && !D.CRIMES[o.crime]) fail(`出来事 ${e.id}[${i}]: 罪 ${o.crime} が無い`); }));
  for (const L of Object.values(D.LOCS)) if (L.type === "town" && !L.nation && D.LAWLESS.includes(L.region)) fail(`${L.name}: 町なのに衛兵のいない地域`);

  G.rand = seeded(31);
  G.P = { trophies: {}, graves: [] };
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 90; caps[k] = 95; });
  const start = () => {
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.loc = "karna"; G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  // 古いセーブ（repute・sin・titleAt が無い）でも動く
  let S = start();
  delete S.repute; delete S.sin;
  try {
    G.actions(); G.reputeLabel(); G.endTurn();
    if (G.wanted() || G.infamyHere() !== 0 || G.wantedIn().length) fail("悪名: 古いセーブで手配されている");
    if (D.EVENTS.find((e) => e.id === "m3_poster").cond(S)) fail("悪名: 古いセーブで手配書の出来事が起きる");
    if (S.repute) fail("悪名: 読むだけで repute が作られた");
  } catch (e) { fail(`悪名: 古いセーブで例外 ${e.message}`); }
  // 盗みを重ねると、その国でだけ賞金首になる
  const nation = G.nationOf();
  if (nation !== "自由都市連合") fail(`悪名: ブランデールの国が ${nation}`);
  for (let i = 0; i < 4; i++) G.crime("theft");
  if (G.wanted()) fail("悪名: 盗み 4 回（24）で手配された");
  G.crime("theft");
  if (!G.wanted() || G.bounty(nation) !== 300) fail(`悪名: 盗み 5 回（30）で手配されない（悪名 ${G.infamyHere()}）`);
  if (!S.chronicle.some((c) => c.text.includes("賞金首"))) fail("悪名: 賞金首になったことが年表に無い");
  if (!G.reputeLabel().includes("手配中")) fail(`悪名: 見出しに出ない「${G.reputeLabel()}」`);
  if (G.wanted("レオネスト王国")) fail("悪名: よその国でも手配された");
  if (!D.EVENTS.find((e) => e.id === "m3_eyes").cond(S)) fail("悪名: 手配中なのに衛兵の出来事が起きない");
  S.loc = "plains";
  if (G.wanted()) fail("悪名: 国境を越えても手配されている");
  if (!D.EVENTS.find((e) => e.id === "m3_hunter").cond(S)) fail("悪名: よその国で賞金稼ぎが来ない");
  // 日が経つと薄れ、線より 10 下がると手配が解ける
  S.loc = "karna";
  S.day += 100; G.reputeTick();
  if (G.infamyHere() !== 20 || !G.wanted()) fail(`悪名: 100 日後の悪名 ${G.infamyHere()}（20・手配のまま のはず）`);
  S.day += 10; G.reputeTick();
  if (G.wanted()) fail("悪名: 線より 10 下がっても手配が解けない");
  // 評判（その国で稼いだ名声）が高いと、手配の線が上がる
  S = start();
  G.addFame(200);
  if (G.repOf("自由都市連合").rep !== 200 || G.bountyLine("自由都市連合") !== 50) fail(`悪名: 評判 ${G.repOf("自由都市連合").rep}・線 ${G.bountyLine("自由都市連合")}`);
  G.crime("murder"); G.crime("murder");
  if (G.wanted()) fail("悪名: 評判が高いのに悪名 40 で手配された");
  // 衛兵を倒すと人殺し。王位を奪う一騎打ちは罪にならない
  S = start();
  G.startCombat(["guard"], {});
  for (let i = 0; i < 30 && S.combat; i++) { S.combat.foes.forEach((f) => { f.hp = 1; }); G.combatAct("attack"); }
  if (G.infamyHere() !== D.CRIMES.murder.inf || S.sin !== D.CRIMES.murder.sin) fail(`悪名: 衛兵を倒しても人殺しにならない（悪名 ${G.infamyHere()}・罪 ${S.sin}）`);
  S = start();
  S.loc = "wasteland"; G.crime("murder");
  if (Object.keys(S.repute || {}).length || S.sin !== D.CRIMES.murder.sin) fail("悪名: 使徒領の罪が国の悪名になった／罪の匂いが残らない");
  // 手配された国の位は取り上げられ、城では位を願い出られない
  S = start();
  S.loc = "leavel"; S.gold = 5000; S.fame = 700; S.fac = "castle";
  G.exploreAct("castle", "knight");
  if (S.title !== "騎士" || S.titleAt !== "レオネスト王国") fail(`悪名: 騎士の位の国が残らない ${S.titleAt}`);
  G.crime("murder"); G.crime("murder");
  if (S.title) fail("悪名: 手配されても騎士の位が残る");
  const knight = G.facActions().flatMap((g) => g.list).find((x) => x.id === "castle:knight");
  if (!knight?.disabled) fail("悪名: 手配中なのに騎士の位を願い出られる");
  G.exploreAct("castle", "audience");
  if (S.mode !== "event" || S.event !== "m3_castle" || S.fac) fail(`悪名: 手配中に城へ入っても捕まらない（${S.mode} ${S.event}）`);
  // 王位を奪うとその国の悪名は消える
  S = start(); S.loc = "leavel"; G.crime("murder"); G.apply({ title: "国王" });
  if (G.infamyHere() || G.wanted()) fail("悪名: 国王になっても悪名が残る");
  // 既存の出来事の悪行（出来事ファイルは書き換えず D.DEEDS で）
  for (const [k, d] of Object.entries(D.DEEDS)) {
    const [id, i] = k.split(":");
    let got = false;
    for (let t = 0; t < 40 && !got; t++) {
      S = start();
      if (evById[id].where.some((w) => D.LOCS[w])) S.loc = evById[id].where.find((w) => D.LOCS[w]);
      if (!G.nationOf()) S.loc = "karna";
      S.gold = 9999; S.flags.v1_debt = true;
      G.startEvent(id);
      G.chooseEvent(Number(i));
      const inf = G.infamyHere();
      if (inf === D.CRIMES[d.crime].inf) got = true;
      else if (inf) { fail(`D.DEEDS ${k}: 悪名が ${inf}（${D.CRIMES[d.crime].inf} のはず）`); got = true; }
    }
    if (!got) fail(`D.DEEDS ${k}: 40 回試しても悪名が付かない`);
  }
  // 仲間を売ると裏切り、鈴の執行人が来る。首を差し出すと罪の匂いが消える
  S = start();
  G.addCompanion("random"); G.S.sin = 12;
  G.startEvent("m3_sellout"); G.chooseEvent(0);
  if (S.companions.length || S.sin !== 22 || G.infamyHere() !== D.CRIMES.betrayal.inf) fail(`悪名: 仲間を売っても裏切りにならない（仲間 ${S.companions.length}・罪 ${S.sin}）`);
  // 足音が二度混ざり、三度目で咎追いに追いつかれる
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  if (!ev("m3_steps").cond(S) || ev("m3_steps2").cond(S) || ev("m3_togaoi").cond(S)) fail("悪名: 罪の匂い 22 で、はじめの足音から始まらない");
  G.startEvent("m3_steps"); G.chooseEvent(1);
  if (!ev("m3_steps2").cond(S) || ev("m3_togaoi").cond(S)) fail("悪名: 二度目の足音にならない");
  G.startEvent("m3_steps2"); G.chooseEvent(1);
  if (!ev("m3_togaoi").cond(S)) fail("悪名: 三度目で咎追いが来ない");
  if (!(G.loreOf(S).togaoi || []).includes("record")) fail("悪名: 足跡の出来事で用語説明が開かない");
  const neck = ev("m3_togaoi").choices.length - 1;
  G.startEvent("m3_togaoi"); G.chooseEvent(neck);
  if (S.sin !== 0 || S.over) fail(`悪名: 首を差し出しても罪が消えない（${S.sin}）`);
  if (ev("m3_togaoi").cond(S)) fail("悪名: 罪が消えても咎追いが来る");
  // 酒場のある町でだけ、酒場に逃げ込める
  const tav = ev("m3_togaoi").choices.findIndex((c) => c.cond);
  S.loc = "karna"; if (!ev("m3_togaoi").choices[tav].cond(S)) fail("悪名: ブランデールで酒場に逃げ込めない");
  S.loc = "fort"; if (ev("m3_togaoi").choices[tav].cond(S)) fail("悪名: 酒場の無い砦で酒場に逃げ込める");
  S.loc = "karna";
  // 牢で刑期を務めると悪名が下がる
  S = start(); for (let i = 0; i < 5; i++) G.crime("theft");
  G.startEvent("m3_jail"); G.chooseEvent(3);
  if (G.wanted() || G.infamyHere()) fail(`悪名: 刑期を務めても悪名が残る ${G.infamyHere()}`);
  // m3_ の出来事のすべての選択肢を、手配中の状態で何度か通す（戦闘は決着まで）
  for (const e of m3) e.choices.forEach((c, i) => {
    for (let t = 0; t < 6; t++) {
      S = start(); S.gold = 999; S.sin = 25; S.flags.m3_steps1 = S.flags.m3_steps2 = true; G.addCompanion("random");
      for (let j = 0; j < 5; j++) G.crime("theft");
      try {
        G.startEvent(e.id); G.chooseEvent(i);
        for (let k = 0; k < 40 && !S.over && S.mode !== "explore"; k++) { const a = G.actions().flatMap((x) => x.list).find((x) => !x.disabled); if (!a) break; G.act(a.id); }
      } catch (err) { fail(`出来事 ${e.id}[${i}]: 例外 ${err.message}`); break; }
      if (S.gold < 0 || Object.values(S.repute || {}).some((r) => r.inf < 0)) fail(`出来事 ${e.id}[${i}]: 所持金か悪名が負`);
    }
  });
  // 帝都の城門は別の出来事
  S = start(); S.loc = "garmund"; G.crime("murder"); G.crime("murder"); S.fac = "castle";
  G.exploreAct("castle", "audience");
  if (S.event !== "m3_castle_g") fail(`悪名: 帝都の城門で ${S.event}`);
  for (const [loc, id] of Object.entries(D.M3_CASTLE)) { if (!D.LOCS[loc]) fail(`D.M3_CASTLE: 場所 ${loc} が無い`); if (!evById[id]) fail(`D.M3_CASTLE: 出来事 ${id} が無い`); }
  if (!D.LORE.togaoi) fail("悪名: 用語説明 togaoi が無い（lore_u3.js より後に読まれていない）");
  if (failures === 0) ok(`評判と悪名（罪 ${Object.keys(D.CRIMES).length} 種・既存の悪行 ${Object.keys(D.DEEDS).length} 件・出来事 ${m3.length} 件・古いセーブ・手配と解除・位の剥奪・咎追い）`);
};
