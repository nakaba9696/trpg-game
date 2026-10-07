// C12：手薄な地域（光天教会領・エルメシア共和国・シェルアーク諸島）の名のある人物（src/data/cz_c12_people.js・events_cz_c12.js・zcz_c12_people.js・zcz_c12_voice.js）
// - どの人も、手薄な地域のどれかにいる（会う場所・誘う町・予定の場所が、その地域の場所）。特色の場所（W9 の施設）か場所の主
// - 仲間は 2〜6 人。恋の筋（R2）の相手は 2〜3 人で、全員が 18 歳以上の人の姿（子どもの姿でない・Q8 の一覧にいる）。獣人かエルフを含む
// - 持ち主の指定の二人（沼の魔女・書庫番のエルフ）がいて、仲間・恋の相手
// - どの人にも、混ぜた型・ギャップ・過去・好感度の始まり・死や裏切りの扱い・名前と役職の札・人物図鑑・立ち絵のタグ
// - 仲間は会話の量（話題 20 以上・身の上 5 段以上・場所 5・出来事 5・仲間 2・恋 2・信頼 2・冷たい 2・夜 2）と、その人だけの話が二つ以上
// - 仲間は出会いの流れで加わる。好感度の始まりが入る
// （作品名・キャラ名がリポジトリに無いことは tests/checks/c4_people.mjs が確かめる）
const REGIONS = new Set(["光天教会領", "エルメシア共和国", "シェルアーク諸島"]);
const REGION_OF = { "光天教会領": ["光天教会領"], "エルメシア共和国": ["エルメシア共和国"], "シェルアーク諸島": ["シェルアーク"] }; // 場所のデータの region の書き方
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C12: " + m); };
  const D = G.data;
  const C = D.C12_PEOPLE || {};
  const P = D.C2_PEOPLE || {};
  const ids = Object.keys(C);
  const mates = ids.filter((id) => P[id] && P[id].join);
  const love = mates.filter((id) => P[id].romance === true);

  // ---------------------------------------------------------------- 顔ぶれ
  if (ids.length < 2) F(`人が少なすぎる：${ids.length}`);
  if (mates.length < 2 || mates.length > 6) F(`仲間が 2〜6 人でない：${mates.length}`);
  if (love.length < 2 || love.length > 3) F(`恋の筋の相手が 2〜3 人でない：${love.join("・")}`);
  if (!love.some((id) => ["elf", "beast"].includes(P[id].race))) F("恋の筋の相手に、エルフも獣人もいない");
  for (const id of ["ortensia", "ismene"]) if (!love.includes(id)) F(`持ち主の指定の人 ${id} が、仲間で恋の相手になっていない`);
  if (P.ortensia && !/魔女/.test(P.ortensia.role + P.ortensia.full)) F("沼の魔女が魔女でない");
  if (P.ismene && P.ismene.race !== "elf") F("書庫番がエルフでない");

  const regionOk = (loc, region) => { const L = D.LOCS[loc]; return !!L && (REGION_OF[region] || [region]).includes(L.region); };
  for (const id of ids) {
    const c = C[id], p = P[id];
    if (!p || !p.c12) { F(`${id}: C2 の人物の表に無いか、c12 の印が無い`); continue; }
    if (!REGIONS.has(c.region)) F(`${id}: 手薄な地域の人でない（${c.region}）`);
    const sp = (D.W9_SPOTS || {})[c.spot];
    if (!sp && !D.LOCS[c.spot]) F(`${id}: 主の場所 ${c.spot} が W9 の施設にも場所にも無い`);
    else if (!regionOk(sp ? sp.town : c.spot, c.region)) F(`${id}: 主の場所 ${c.spot} が ${c.region} に無い`);
    for (const l of c.meet || []) if (!regionOk(l, c.region)) F(`${id}: 会う場所 ${l} が ${c.region} に無い`);
    for (const s of p.schedule || []) if (![...REGIONS].some((r) => regionOk(s.loc, r))) F(`${id}: 予定の場所 ${s.loc} が手薄な地域に無い`);
    if (!(typeof c.aff0 === "number" && c.aff0 >= -100 && c.aff0 <= 100)) F(`${id}: 好感度の始まりが −100〜+100 でない`);
    if (!(c.mix && c.mix.length >= 2) || !c.gap || !c.past || !c.fate) F(`${id}: 混ぜた型・ギャップ・過去・死や裏切りの扱いのどれかが無い`);
    if (!p.who || p.who.seed !== "c2:" + id) F(`${id}: 絵（who）の seed が c2:${id} でない`);
    const t = (D.C3_NAMES || {})[id];
    if (!t || t.name !== p.name) F(`${id}: 名前と役職の札が無いか、名前が違う`);
    const q = (D.F2_PEOPLE || {})[id];
    if (!q || !q.title || !q.lines || q.lines.length !== 2) F(`${id}: 人物図鑑の説明（title・二行）が無い`);
  }

  // ---------------------------------------------------------------- 恋の相手は大人の人の姿
  for (const id of love) {
    const p = P[id];
    if (p.age < 18 || p.childLook || (p.who && p.who.age < 18) || (p.who && p.who.kind === "child")) F(`${id}: 恋の相手なのに 18 歳未満か子どもの姿`);
    if (!(D.Q8P.ALLOW || {})[id]) F(`${id}: 恋の相手なのに、人の姿の一覧（Q8P.ALLOW）に無い`);
    if (!(D.R2.ARCS || {})[id]) F(`${id}: 恋の筋（R2）が無い`);
    const v = D.C2_VOICE[id] || {};
    for (const k of ["spark", "confess", "propose", "part", "cold"]) if (!v[k]) F(`${id}: 恋のひとこと ${k} が無い`);
  }

  // ---------------------------------------------------------------- 仲間の厚み
  const evs = D.EVENTS.filter((e) => e.id.startsWith("c12_"));
  const inEv = (e) => (e.c2 ? [].concat(e.c2) : []);
  const outs = (e) => e.choices.flatMap((c) => [c.ok, c.ng, c.win, c.ok && c.ok.win]).filter(Boolean);
  for (const id of mates) {
    const T = (D.TALK || {})[id];
    if (!T) { F(`${id}: 会話の表が無い`); continue; }
    const kinds = {};
    T.topics.forEach((x) => { kinds[x.kind] = (kinds[x.kind] || 0) + 1; });
    const need = { past: 5, place: 5, event: 5, mate: 2, chat: 2, ask: 2, cold: 2, night: 2, bond: 2 };
    if (P[id].romance) need.love = 2;
    if (T.topics.length < 20) F(`${id}: 話題が 20 未満：${T.topics.length}`);
    for (const [k, m] of Object.entries(need)) if ((kinds[k] || 0) < m) F(`${id}: 話題 ${k} が ${m} 未満：${kinds[k] || 0}`);
    if (evs.filter((e) => e.c2talk === id).length < 2) F(`${id}: その人だけの話が二つ未満`);
    if (!evs.some((e) => e.w > 0 && !e.c2talk && inEv(e).includes(id))) F(`${id}: ふつうに起きる出会いの出来事が無い`);
    if (!evs.some((e) => inEv(e).includes(id) && outs(e).some((o) => [].concat(o.c2join || []).includes(id)))) F(`${id}: 仲間に加わる出来事が無い`);
    if (!(D.C2_INVITE[id] || []).length) F(`${id}: 誘ったときの一言が無い`);
    if (!(D.Q9 || {})[id]) F(`${id}: 頼みごとが無い`);
  }

  // ---------------------------------------------------------------- 出会いの流れで加わる
  const st = {}, caps = {};
  D.STATS.forEach((k) => { st[k] = 60; caps[k] = 80; });
  let g = null;
  const start = (loc) => {
    g = loadEngine();
    g.rand = seeded(12);
    g.P = { trophies: {}, graves: [] };
    g.newGame({ cls: "merc", stats: st, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
    g.S.maxHp = g.S.hp = 999;
    g.S.gold = 500;
    g.S.day = 10;
    g.S.loc = loc; g.S.visited[loc] = true;
  };
  const lucky = (f) => { const r = g.rand; g.rand = () => 0.01; try { return f(); } finally { g.rand = r; } };
  const begin = (ev) => {
    const e = g.data.EVENTS.find((x) => x.id === ev);
    if (!e) { F(`出来事 ${ev} が無い`); return false; }
    if (e.cond && !e.cond(g.S)) { F(`出来事 ${ev} の条件が、流れの中で満たされない`); return false; }
    g.startEvent(ev);
    return g.S.mode === "event";
  };
  const choose = (part) => {
    const S = g.S;
    if (S.mode !== "event") { F(`「${part}」を選ぶときに出来事の中にいない（${S.mode} ${S.event}）`); return; }
    const c = g.eventChoices().find(({ c }) => g.m2Fill(c.label).includes(part));
    if (!c) { F(`出来事 ${S.event} に「${part}」が無い`); return; }
    lucky(() => g.act("ev:" + c.i));
    for (let i = 0; i < 30 && S.mode === "combat"; i++) { S.combat.foes.forEach((f) => { if (f.hp > 0) f.hp = 1; }); lucky(() => g.act("cb:attack")); }
  };
  const FLOWS = {
    ortensia: ["swamp", [["c12_ort_doll", ["拾い上げて", "真ん中の茶碗"]], ["c12_ort_seven", ["答えずに", "連れていく"]]]],
    ismene: ["w7_melvi", [["c12_ism_ladder", ["梯子を押さえる", "旅の途中", "連れていく"]]]],
  };
  for (const id of mates) if (!FLOWS[id]) F(`${id} の出会いの流れを確かめていない`);
  for (const [id, [loc, parts]] of Object.entries(FLOWS)) {
    start(loc);
    for (const [ev, steps] of parts) { if (!begin(ev)) break; steps.forEach(choose); }
    const c = g.c2In(id, g.S);
    if (!c) { F(`${id} が出会いの流れで仲間にならない`); continue; }
    if (c.trait !== P[id].join.trait || c.who.seed !== "c2:" + id) F(`${id} の仲間の欄が表のままでない`);
    if (!(typeof (g.S.aff || {})[id] === "number")) F(`${id} の好感度が入っていない`);
    if (!g.m10Can || !g.m10Can(c)) F(`${id} が恋の相手になれない`);
  }
  // 好感度の始まり（魔女は −10 から）
  start("swamp");
  g.c2Meet("ortensia");
  if (g.S.aff.ortensia !== C.ortensia.aff0) F(`会ったときの好感度が始まりの数でない：${g.S.aff.ortensia}`);

  if (!n) ok(`C12：${ids.length} 人（仲間 ${mates.join("・")}／恋の筋 ${love.join("・")}）・出来事 ${evs.length}・すべて手薄な地域`);
};
