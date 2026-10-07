// E10：使徒を弱らせる出来事（src/data/zz_e10_events.js・src/engine/zz_e3z_e10_events.js）
// - 討伐できる使徒すべてに弱らせる出来事がある：B 級は 1 つ以上、A 級は 2 つ以上（国を挙げる規模を一つ）、S 級は 3 つ以上
// - 出来事は D.EVENTS にあり、成功の結果で印 e10:<使徒>:<key> が付き、人生の物語に一行残る。断念する（判定なしの）選択肢もある
// - 出来事は、その使徒を知らないと起きない（cond）。手がかりの噂がある
// - 弱り方：弱点だけでは frac = KEY_W、出来事もすべてで frac = 1。挑んだときに出来事の一行が出る。図鑑の弱る条件に並ぶ
// - 地の文に使徒の名（刻印の読み）を出さない。使ってはいけない言葉を使わない
const PROFILE = { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" };

export default ({ fail, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const E10 = D.E10;
  if (!E10 || !G.e10Of) return fail("弱らせる出来事の表（D.E10・G.e10Of）が無い");
  const NEED = { B: 1, A: 2, S: 3 };
  for (const a of Object.values(D.E3.LIST).filter((x) => !x.noslay)) {
    const n = (E10.LIST[a.id] || []).length;
    if (n < NEED[a.rank]) fail(`${a.rank} 級の使徒 ${a.id} の弱らせる出来事が ${n} つ（${NEED[a.rank]} つ以上）`);
  }
  for (const a of Object.values(D.E3.LIST).filter((x) => x.noslay)) if (E10.LIST[a.id]) fail(`倒せない使徒 ${a.id} に弱らせる出来事がある`);
  // A 級・S 級は、国を挙げる規模の出来事を一つ含む（名声が要り、王命・宮廷・議会・軍・艦隊・三つの国のどれかの話）
  const BIG = /王命|宮廷|議会|軍|艦隊|三つの国|総出/;
  for (const a of Object.values(D.E3.LIST).filter((x) => !x.noslay && x.rank !== "B")) {
    const evs = (E10.LIST[a.id] || []).map((x) => D.EVENTS.find((e) => e.id === `e10_${a.id}_${x.key}`)).filter(Boolean);
    if (!evs.some((e) => BIG.test(e.text + e.choices.map((c) => (c.ok && c.ok.text) || "").join("")))) fail(`${a.rank} 級の使徒 ${a.id} に、国を挙げる規模の出来事が無い`);
  }
  const evById = Object.fromEntries(D.EVENTS.map((e) => [e.id, e]));
  const BAD = /見世物|観客|客席|舞台|台本|魔王/;
  const names = Object.values(D.E3.LIST).map((a) => (G.e3FoeData(a.id).name || "").replace(/^.*の使徒/, "")).filter((n) => n.length >= 3 && /^[ァ-ヴー]+$/.test(n));
  for (const [ap, L] of Object.entries(E10.LIST)) {
    if (!D.E3.LIST[ap]) { fail(`弱らせる出来事の表に、使徒でない ${ap}`); continue; }
    for (const x of L) {
      if (!x.label || !x.on) fail(`${ap}:${x.key} に label か on が無い`);
      if (x.test) continue; // 長編の備えなど、ほかの仕組みで数えるもの
      const e = evById[`e10_${ap}_${x.key}`];
      if (!e) { fail(`${ap}:${x.key} の出来事が D.EVENTS に無い`); continue; }
      const oks = e.choices.filter((c) => c.ok && c.ok.flag === `e10:${ap}:${x.key}`);
      if (!oks.length) fail(`${ap}:${x.key} の出来事に、印を付ける選択肢が無い`);
      if (oks.some((c) => !c.ok.chron)) fail(`${ap}:${x.key} の出来事に、人生の物語の一行が無い`);
      if (!e.choices.some((c) => !c.stat && c.ok && !c.ok.flag)) fail(`${ap}:${x.key} の出来事に、断念する選択肢が無い`);
      const texts = [e.text, x.on, ...e.choices.flatMap((c) => [c.ok && c.ok.text, c.ng && c.ng.text])].filter(Boolean);
      for (const t of texts) {
        if (BAD.test(t)) fail(`${ap}:${x.key} に使ってはいけない言葉：${t.match(BAD)[0]}`);
        for (const n of names) if (t.includes(n)) fail(`${ap}:${x.key} の地の文に使徒の名「${n}」`);
      }
      // 知らないと起きない
      G.rand = seeded(1);
      G.P = { trophies: {}, graves: [] };
      const stats = {}, caps = {};
      D.STATS.forEach((k) => { stats[k] = 40; caps[k] = 99; });
      G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { ...PROFILE } });
      G.S.lore = {};
      G.S.phase = 3;
      if (e.cond(G.S)) fail(`${ap}:${x.key} の出来事が、その使徒を知らないうちに起きる`);
    }
  }
  if ((E10.RUMORS || []).length < Object.keys(E10.LIST).length - 1) fail("弱らせる出来事の手がかりの噂が足りない");
  for (const r of E10.RUMORS) if (!D.RUMORS.includes(r)) fail("手がかりの噂が D.RUMORS に入っていない");

  // 弱り方・挑んだときの一行・図鑑
  {
    G.rand = seeded(2);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 40; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { ...PROFILE } });
    const S = G.S;
    const a = D.E3.LIST.levian;
    a.keys.forEach((k) => { k.test = () => true; });
    const m1 = G.e3Mods("levian", S);
    if (Math.abs(m1.frac - E10.KEY_W) > 1e-9) fail(`弱点だけで弱り方が ${m1.frac}（${E10.KEY_W} のはず）`);
    G.e10Fill(S);
    const m2 = G.e3Mods("levian", S);
    if (Math.abs(m2.frac - 1) > 1e-9) fail(`弱点と出来事がそろっても弱り方が ${m2.frac}`);
    if (!(m2.hp < m1.hp)) fail("出来事を起こしても弱らない");
    S.mode = "event";
    G.apply({ e3fight: "levian" });
    if (!S.log.some((l) => l.text === E10.LIST.levian[0].on)) fail("挑んだとき、起こした出来事の一行が出ない");
    G.P.slain = { e3_levian: { n: 1, at: 1, by: "テスト", name: "x" } };
    const cx = G.e3Codex("e3_levian");
    if (!cx || !cx.keys.includes(E10.LIST.levian[0].label)) fail("倒した使徒の図鑑に、出来事の短い言葉が並ばない");
    // 出来事の表が無い使徒は今までどおり
    D.E3.LIST.zalve.keys.forEach((k) => { k.test = () => true; });
    if (!G.e10Of("zalve") && G.e3Mods("zalve", S).frac !== 1) fail("出来事の表が無い使徒の弱り方が変わった");
  }
};
