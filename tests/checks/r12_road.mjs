// R12：旅の中身（src/engine/zzzzzzzzzzzzzzzzzzzz_r12_road.js・src/data/events_r12_road*.js）
// - 場面の形：会話は陸で 3 つ以上（どれも返し方 tone が違う選択肢、tone は R12.REACT にある）、一人旅は 10 以上。ふつうの抽選・W6 の抽選に出ない
// - どの仲間（名のある仲間・性格だけの仲間）にも、どの会話にも、好感度が下がらない返し方がある
// - 仲間を連れて旅をすると会話が起き、好感度が動く。同じ仲間の同じ会話は、全部を見るまで繰り返さない
// - 一人旅では一人旅の場面が起きる。仲間がいると一人旅の場面は出ない
// - 一つの旅で、戦いになる出来事は一つまで。襲撃のある旅では、戦いになる出来事を引かない
// - 古いセーブ（S.r12 が無い）でも動く
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail(m); };
  const G = loadEngine();
  const D = G.data, R12 = G.r12;
  if (!R12 || !R12.scenes) { F("G.r12 が無い"); return; }

  // ---------------------------------------------------------------- 1. 場面の形
  const talks = R12.scenes("talk"), solos = R12.scenes("solo");
  if (talks.filter((e) => (e.on || "land") !== "sea").length < 3) F(`陸の会話が 3 つ未満（${talks.length}）`);
  if (solos.length < 10) F(`一人旅の場面が 10 未満（${solos.length}）`);
  for (const e of [...talks, ...solos]) {
    const w = `場面 ${e.id}`;
    if (!/^r12/.test(e.id)) F(`${w}: id は r12 で始める`);
    if (e.w !== 0 || e.w6 || !(e.where || []).includes("r12")) F(`${w}: where: ["r12"]・w: 0・w6 なし`);
    if (R12.fights(e)) F(`${w}: 戦いにしない`);
    if (!["land", "sea", "any", undefined].includes(e.on)) F(`${w}: on ${e.on}`);
    if ((e.choices || []).length < 2) F(`${w}: 選択肢は 2 つ以上`);
    if (e.r12 === "talk") {
      const tones = e.choices.map((c) => c.ok && c.ok.tone);
      if (tones.some((t) => !R12.REACT[t])) F(`${w}: tone が R12.REACT に無い（${tones.join("・")}）`);
      if (new Set(tones).size !== tones.length) F(`${w}: 同じ返し方が二つある`);
      if (!e.m2) F(`${w}: m2 が無い（主役の仲間が決まらない）`);
    }
  }
  // どの仲間にも、好感度が下がらない返し方がある
  const people = [...Object.keys(D.TALK || {}).map((id) => ({ c2: id, trait: "soft", bond: 60, name: id })), ...Object.keys(R12.TRAIT_TONES).map((t) => ({ trait: t, bond: 60, name: t }))];
  if (Object.keys(D.TALK || {}).length < 10) F("名のある仲間の会話の表が読めていない");
  Object.keys(D.M2_TRAITS || {}).filter((t) => t !== "m2_traitor").forEach((t) => R12.TRAIT_TONES[t] || F(`性格 ${t} の返し方の好みが無い`));
  for (const c of people) for (const e of talks) {
    if (!e.choices.some((x) => R12.mood(c, x.ok.tone) !== "bad")) F(`${c.name}：${e.id} に好感度が下がらない返し方が無い`);
  }

  // ---------------------------------------------------------------- 2. 旅をする
  const fresh = (seed) => {
    const H = loadEngine();
    H.rand = seeded(seed);
    H.P = { trophies: {}, graves: [] };
    const HD = H.data;
    H.newGame({ cls: Object.keys(HD.CLASSES)[0], stats: Object.fromEntries(HD.STATS.map((k) => [k, 60])), caps: Object.fromEntries(HD.STATS.map((k) => [k, 80])), goal: Object.keys(HD.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    H.S.maxHp = H.S.hp = 9999;
    H.hurt = () => {};
    H.S.rerolls = 0;
    if (H.r11) H.r11.years = () => 999;
    return H;
  };
  // 一つの旅を最後まで。起きた出来事（id）と、戦いの数を返す
  const journey = (H, to) => {
    const S = H.S;
    const evs = [];
    let fights = 0, guard = 0, last = null, inCombat = false;
    H.act("travel:" + to);
    while (!S.over && guard++ < 300 && (S.travel || S.combat || S.mode === "event")) {
      if (S.mode === "event") {
        if (S.event !== last) evs.push(S.event);
        last = S.event;
        const list = H.actions()[0].list.filter((a) => !a.disabled);
        if (!list.length) { F(`${S.event}: 選べる選択肢が無い`); break; }
        H.act(H.pick(list).id);
        continue;
      }
      if (S.mode === "combat" || S.combat) {
        if (!inCombat) { fights++; inCombat = true; }
        const a = H.actions().flatMap((g) => g.list).find((x) => x.id === "cb:attack") || H.actions()[0].list[0];
        H.act(a.id);
        continue;
      }
      inCombat = false;
      H.act("w6go");
    }
    if (guard >= 300) F(`旅が終わらない（→${to}）`);
    return { evs, fights };
  };
  const reset = (S, from) => { S.loc = from; S.mode = "explore"; S.event = null; S.combat = null; S.travel = null; S.w6 = null; S.hp = S.maxHp; S.sanity = 100; S.gold = 500; };

  // 仲間と旅をする
  {
    const H = fresh(1201);
    const S = H.S;
    const pal = H.c2Make ? H.c2Make(Object.keys(H.data.TALK)[0]) : null;
    if (!pal) { F("仲間が作れない（G.c2Make）"); return; }
    H.addCompanion(pal);
    const c = S.companions[0];
    if (!c) { F("仲間が加わらない"); return; }
    let talks = 0, solo = 0, trips = 0, twoFights = 0, raidMix = 0;
    const order = [];
    const bonds = new Set();
    for (let i = 0; i < 60; i++) {
      reset(S, "karna");
      if (!S.companions.includes(c)) S.companions.push(c);
      c.bond = 60;
      const { evs } = journey(H, i % 2 ? "zephara" : "nerva");
      trips++;
      evs.forEach((id) => {
        const e = D.EVENTS.find((x) => x.id === id) || {};
        if (e.r12 === "talk") { talks++; order.push(id); }
        if (e.r12 === "solo") solo++;
      });
      bonds.add(c.bond);
    }
    if (talks < 10) F(`仲間がいるのに道中の会話が少ない（${trips} 回の旅で ${talks}）`);
    if (solo) F(`仲間がいるのに一人旅の場面が出た（${solo}）`);
    if (bonds.size < 2) F("会話で好感度が動かない");
    // 同じ会話は、陸の会話を一巡するまで繰り返さない
    const land = talks && R12.scenes("talk").filter((e) => (e.on || "land") === "land").map((e) => e.id);
    for (let i = 0; i + land.length <= order.length; i += land.length) {
      const chunk = order.slice(i, i + land.length);
      if (new Set(chunk).size !== chunk.length) { F(`同じ会話が一巡する前に繰り返された（${chunk.join("・")}）`); break; }
    }
    ok(`R12：仲間と ${trips} 回の旅で会話 ${talks} 件`);
  }

  // 一人旅・戦いの数・襲撃との重なり
  {
    const H = fresh(1202);
    const S = H.S;
    let solo = 0, over = 0, mixed = 0, trips = 0;
    const fightEv = (id) => R12.fights(D.EVENTS.find((x) => x.id === id));
    const startRaid = H.w6.start;
    let raid = false;
    H.w6.start = (...a) => { const r = startRaid(...a); raid = !!(S.w6 && S.w6.raid) || raid; return r; };
    for (let i = 0; i < 150; i++) {
      reset(S, i % 3 ? "mountains" : "karna");
      S.companions = [];
      raid = false;
      const to = i % 3 ? "wasteland" : "zephara";
      const { evs } = journey(H, to);
      trips++;
      const fe = evs.filter(fightEv).length;
      if (fe > 1) over++;
      if (fe && raid) mixed++;
      solo += evs.filter((id) => (D.EVENTS.find((x) => x.id === id) || {}).r12 === "solo").length;
      if (S.over) { F("一人旅で死んだ（HP 9999 のはず）"); break; }
    }
    if (over) F(`一つの旅で戦いになる出来事が二つ以上（${over} 回）`);
    if (mixed) F(`襲撃のある旅で戦いになる出来事を引いた（${mixed} 回）`);
    if (solo < 10) F(`一人旅の場面が少ない（${trips} 回の旅で ${solo}）`);
    ok(`R12：一人旅 ${trips} 回で一人旅の場面 ${solo} 件`);
  }

  // 古いセーブ：S.r12 が無い・形が違う
  {
    const H = fresh(1203);
    const S = H.S;
    S.r12 = "old";
    reset(S, "karna");
    journey(H, "zephara");
    if (!S.r12 || typeof S.r12 !== "object" || !Array.isArray(S.r12.solo)) F("古いセーブの S.r12 が直らない");
  }
  if (!bad) ok("R12：旅の中身（会話・一人旅・戦いの重なり）");
};
