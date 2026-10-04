// C7：帝国と共和国の人物（src/data/c7_people.js・events_c7.js・zc7_people.js・engine/zzzz_c7_people.js）
// - 仲間になる人 10 人と、その周りの名のある人 4〜6 人。男女・種族・年齢・職業・性格がばらける。男は型（type）で、ojisan がいちばん多い
// - 恋と結婚の相手（romance: true）は仲間のうち 4 人で、みな 18 歳以上の大人の姿。仲間は全員 romance を持つ。false の人は恋の相手にならない
// - どの人にも、混ぜた型（mix 二つ以上）・ギャップ・過去・好感度の始まり（−100〜+100）・会える場所。仲間は会話を書く子のためのメモ（note）
// - どの人にも、名前と役職の札（D.C3_NAMES）・人物図鑑（D.F2_PEOPLE）・立ち絵のタグ（docs/art/portraits.json。仲間は喜怒哀楽の差分）
// - 出てくる出来事は 2〜4 個（ふつうに起きる出会いがある）。仲間は加わる出来事と、その人だけの話が二つ以上・ひとこと・誘う一言・恋の人は恋のひとこと
// - 名前が前からいる人と被らない。担当の土地（帝国・共和国・ドランヘルツ）で会う
// - 出会いの流れで仲間になり、好感度が始まりの数から入る
// - 見せる文に、書かない言葉（見世物まわり・今の人が知らないこと・性的な言葉）が無く、地の文が叫ばない
const TAGS = new Set(["any", "town", "wild", "dungeon", "capital", "port", "snow", "realm"]);
const BANNED = /見世物|観客|客席|舞台|台本|神々|魔王|魔人|正体|もういない|胸|童貞|貧乳|巨乳|ナイスバディ|ロリ|体つき|裸|下着|情欲|色気/;
const REGION = new Set(["ノルディア帝国", "エルメシア共和国", "人類の最前線"]);
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };
import { readFileSync } from "node:fs";

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C7: " + m); };
  const D = G.data;
  const C7 = D.C7_PEOPLE || {};
  const P = D.C2_PEOPLE || {};
  const ids = Object.keys(C7);
  const mates = ids.filter((id) => C7[id].side === "仲間");
  const others = ids.filter((id) => C7[id].side !== "仲間");

  // ---------------------------------------------------------------- 顔ぶれ
  if (mates.length !== 10) F(`仲間になる人が 10 人でない：${mates.length}`);
  if (others.length < 4 || others.length > 6) F(`周りの名のある人が 4〜6 人でない：${others.length}`);
  const ms = mates.map((id) => P[id] || {});
  const males = ms.filter((p) => p.sex === "男").length;
  if (males < 3 || males > 7) F(`仲間の男女が偏っている：男 ${males}`);
  if (new Set(ms.map((p) => p.beast || p.race)).size < 4) F("仲間の種族がばらけていない");
  if (new Set(ms.map((p) => p.join && p.join.trait)).size < 8) F("仲間の性格（trait）がばらけていない");
  if (new Set(ms.map((p) => p.join && p.join.cls)).size !== 10) F("仲間の職業が被っている");
  const ages = ms.map((p) => p.age);
  if (!(ages.some((a) => a < 25) && ages.some((a) => a >= 45))) F("仲間の歳がばらけていない");
  const love = mates.filter((id) => P[id] && P[id].romance === true);
  if (love.length !== 4) F(`恋と結婚の相手（romance: true）が 4 人でない：${love.length}`);
  if (new Set(love.map((id) => P[id].sex)).size < 2) F("恋の相手の男女が片方だけ");
  for (const id of mates) if (P[id] && typeof P[id].romance !== "boolean") F(`${id}: 仲間なのに romance が無い`);
  for (const id of love) if (P[id].childLook || P[id].age < 18 || (P[id].who && P[id].who.age < 18)) F(`${id}: 恋の相手が 18 歳未満か子どもの姿`);
  // 前からいる人と名前が被らない
  const before = Object.entries(P).filter(([id]) => !C7[id]).map(([, p]) => p.name);
  for (const id of ids) if (P[id] && before.includes(P[id].name)) F(`${id}: 名前 ${P[id].name} が前からいる人と被る`);

  // ---------------------------------------------------------------- 一人ずつ
  const portraits = JSON.parse(readFileSync(new URL("../../docs/art/portraits.json", import.meta.url), "utf8")).portraits;
  const isMale = (p) => /(^|,\s*)(\d*boys?|male|male focus|old man|man|young man)(\s*,|$)/i.test([p.identity, p.tags].join(", "));
  const evs = D.EVENTS.filter((e) => e.id.startsWith("c7_"));
  const inEv = (e) => (e.c2 ? (Array.isArray(e.c2) ? e.c2 : [e.c2]) : e.c2talk ? [e.c2talk] : []);
  const outs = (e) => e.choices.flatMap((c) => [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win]).filter(Boolean);
  const types = {};
  for (const id of ids) {
    const c = C7[id], p = P[id], w = id;
    if (!p || !p.c4 || !p.c7) { F(`${w}: C2 の人物の表に無いか、c4・c7 の印が無い`); continue; }
    if (!(typeof c.aff0 === "number" && c.aff0 >= -100 && c.aff0 <= 100)) F(`${w}: 好感度の始まりが −100〜+100 でない`);
    if (!(c.mix && c.mix.length >= 2)) F(`${w}: 混ぜた型が二つ未満`);
    if (!c.gap || !c.past) F(`${w}: ギャップか過去が無い`);
    if (!p.who || p.who.seed !== "c2:" + id) F(`${w}: 絵（who）の seed が c2:${id} でない`);
    if (!D.RACES[p.race] || (p.race === "beast") !== !!D.BEASTS[p.beast]) F(`${w}: 種族が変 ${p.race} ${p.beast}`);
    if (!["ノルディア", "エルメシア"].includes(p.nation)) F(`${w}: 担当の国（帝国・共和国）の人でない：${p.nation}`);
    for (const l of c.meet || []) {
      if (!D.LOCS[l] && !TAGS.has(l)) F(`${w}: 会える場所 ${l} が無い`);
      else if (D.LOCS[l] && !REGION.has(D.LOCS[l].region) && l !== "w2_dranherz") F(`${w}: 会える場所 ${l} が担当の土地でない`);
    }
    const t = (D.C3_NAMES || {})[id];
    if (!t || !t.name || !t.role) F(`${w}: 名前と役職の札（D.C3_NAMES）が無い`);
    const q = (D.F2_PEOPLE || {})[id];
    if (!q || !q.title || q.face !== undefined || !q.lines || q.lines.length !== 2) F(`${w}: 人物図鑑の説明（title・二行）が無い`);
    const pt = portraits.find((x) => x.id === id);
    if (!pt) F(`${w}: 立ち絵の一覧（portraits.json）に無い`);
    else {
      if (pt.group !== "c2" || !pt.identity || !pt.tags || !pt.memo) F(`${w}: 立ち絵の group・identity・tags・memo のどれかが無い`);
      if (isMale(pt) !== (p.sex === "男")) F(`${w}: 立ち絵の性別がデータと違う`);
      if (isMale(pt)) { if (!pt.type || pt.type !== c.type) F(`${w}: 男なのに型（type）が無いか、控えと違う`); else types[pt.type] = (types[pt.type] || 0) + 1; }
      if (p.join && !(pt.variants && pt.variants.joy && pt.variants.anger && pt.variants.sorrow && pt.variants.fun)) F(`${w}: 仲間なのに表情の差分が無い`);
    }
    const own = evs.filter((e) => !e.c2talk && inEv(e).includes(id));
    if (own.length < 2 || own.length > 4) F(`${w}: 出てくる出来事が 2〜4 個でない：${own.length}`);
    if (!own.some((e) => e.w > 0) && !own.some((e) => evs.some((x) => x.w > 0 && outs(x).some((o) => o.next === e.id)))) F(`${w}: ふつうに起きる出会いの出来事が無い`);
    if (c.side === "仲間") {
      if (!p.join) { F(`${w}: 仲間なのに join が無い`); continue; }
      const nt = c.note || {};
      for (const k of ["tone", "me", "likes", "dislikes", "topics", "pairs"]) if (!nt[k] || (Array.isArray(nt[k]) && !nt[k].length)) F(`${w}: 会話のメモ ${k} が無い`);
      for (const o of Object.keys(nt.pairs || {})) if (!P[o]) F(`${w}: 相性のメモの ${o} が人物の表に無い`);
      if (evs.filter((e) => e.c2talk === id).length < 2) F(`${w}: その人だけの話が二つ未満`);
      if (!own.some((e) => outs(e).some((o) => [].concat(o.c2join || []).includes(id)))) F(`${w}: 仲間に加わる出来事が無い`);
      const v = D.C2_VOICE[id];
      if (!v || v.talk.length < 3 || !v.betray || !v.die) F(`${w}: ひとことが足りない`);
      if (p.romance) for (const k of ["spark", "confess", "propose", "part", "cold"]) if (!v || !v[k]) F(`${w}: 恋のひとこと ${k} が無い`);
      if (!(D.C2_INVITE[id] || []).length) F(`${w}: 誘ったときの一言が無い`);
      if (!D.M2_TRAITS[p.join.trait]) F(`${w}: 性格 ${p.join.trait} が M2 に無い`);
      for (const k of Object.keys(D.M2_LIFE)) if (!p.join.life[k]) F(`${w}: 暮らし ${k} が無い`);
      for (const l of p.join.home) if (!D.LOCS[l] || D.LOCS[l].type !== "town") F(`${w}: 誘える町 ${l} が町でない`);
    }
  }
  const tv = Object.values(types);
  if (!types.ojisan || tv.some((k) => k > types.ojisan)) F(`男の型で ojisan がいちばん多くない：${JSON.stringify(types)}`);
  if (Object.keys(types).length < 4) F(`男の型がばらけていない：${JSON.stringify(types)}`);

  // ---------------------------------------------------------------- 出来事の整い
  const evIds = new Set(D.EVENTS.map((e) => e.id));
  for (const e of evs) {
    for (const x of e.where) if (!TAGS.has(x) && !D.LOCS[x]) F(`出来事 ${e.id}: 場所 ${x} が無い`);
    for (const id of inEv(e)) if (!P[id]) F(`出来事 ${e.id}: 人物 ${id} が表に無い`);
    for (const o of outs(e)) {
      if (o.next && !evIds.has(o.next)) F(`出来事 ${e.id}: 続き ${o.next} が無い`);
      for (const id of Object.keys(o.aff || {})) if (!P[id]) F(`出来事 ${e.id}: 好感度の人 ${id} が表に無い`);
      for (const id of [].concat(o.c2join || [])) if (!P[id] || !P[id].join) F(`出来事 ${e.id}: 仲間にできない ${id}`);
      for (const l of [].concat(o.lore || [])) { const [k, line] = l.split(":"); const L = D.LORE[k]; if (!L || (line && !L.lines.some(([x]) => x === line))) F(`出来事 ${e.id}: 用語 ${l} が無い`); }
    }
    for (const l of [].concat(e.lore || [])) { const [k, line] = l.split(":"); const L = D.LORE[k]; if (!L || (line && !L.lines.some(([x]) => x === line))) F(`出来事 ${e.id}: 用語 ${l} が無い`); }
  }

  // ---------------------------------------------------------------- 見せる文
  const texts = [];
  const addO = (o) => { if (!o) return; for (const k of ["text", "memo", "chron"]) if (o[k]) texts.push(o[k]); addO(o.win); };
  for (const e of evs) { texts.push(e.title, e.text); for (const c of e.choices) { texts.push(c.label); addO(c.ok); addO(c.ng); addO({ win: c.win }); } }
  for (const id of ids) {
    const v = D.C2_VOICE[id];
    if (v) texts.push(...Object.values(v).flat());
    texts.push(...(D.C2_INVITE[id] || []));
    const q = (D.F2_PEOPLE || {})[id];
    if (q) texts.push(q.title, ...q.lines);
    if (P[id] && P[id].join) texts.push(P[id].join.desc, ...Object.values(P[id].join.life));
  }
  for (const [id, e] of Object.entries(D.LORE)) if (id.startsWith("c7_")) e.lines.forEach(([, t]) => texts.push(t));
  for (const t of texts) if (typeof t !== "string" || BANNED.test(t)) F(`見せる文に書かない言葉か、文でないものがある「${String(t).slice(0, 40)}」`);
  for (const t of texts) if (typeof t === "string" && /！/.test(t.replace(/「[^」]*」/g, ""))) F(`地の文が叫んでいる「${t.slice(0, 40)}」`);

  // ---------------------------------------------------------------- 決まった流れ
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  let g = null;
  const start = (loc) => {
    g = loadEngine();
    g.rand = seeded(77);
    g.P = { trophies: {}, graves: [] };
    g.newGame({ cls: "merc", stats, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
    g.S.maxHp = g.S.hp = 999;
    g.S.gold = 500;
    g.S.day = 10;
    if (loc) { g.S.loc = loc; g.S.visited[loc] = true; }
    return g.S;
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
    wolfram: ["fort", "c7_wolf_pot", ["便所の場所", "隣に立つ", "連れていく"]],
    hartmut: ["garmund", "c7_hart_poem", ["最後まで聞く", "坑道へ入る", "連れていく"]],
    gustav: ["w2_zalgros", "c7_gus_sand", ["剣闘士に話しかけ", "卑怯に勝つ", "連れていく"]],
    timo: ["w2_nagris", "c7_timo_trap", ["罠の出来", "前に出る", "連れていく"]],
    noeris: ["w2_amyrein", "c7_noe_dice", ["見抜く", "連れていく"]],
    ingrid: ["garmund", "c7_ing_morgue", ["台を押す", "灯りを持ち", "連れていく"]],
    lumia: ["zephara", "c7_lum_nap", ["毛布", "連れていく"]],
    sieglinde: ["frost", "c7_sieg_horse", ["荷を半分", "横に立つ", "連れていく"]],
    annelise: ["w2_dranherz", "c7_anne_forge", ["見比べる", "足りない分", "連れていく"]],
    radmila: ["w2_shadow", "c7_rad_shadow", ["手当て", "受けて立つ", "連れていく"]],
  };
  for (const id of mates) if (!FLOWS[id]) F(`${id} の出会いの流れを確かめていない`);
  for (const [id, [loc, ev, steps]] of Object.entries(FLOWS)) {
    start(loc);
    if (!begin(ev)) continue;
    steps.forEach(choose);
    const c = g.c2In(id, g.S);
    if (!c) { F(`${id} が出会いの流れで仲間にならない`); continue; }
    if (c.trait !== P[id].join.trait || c.sex !== P[id].sex || c.who.seed !== "c2:" + id) F(`${id} の仲間の欄が表のままでない`);
    if (!(typeof (g.S.aff || {})[id] === "number" && g.S.aff[id] >= C7[id].aff0)) F(`${id} の好感度が始まりから入っていない：${JSON.stringify(g.S.aff)}`);
    // 恋の相手になれるか（romance のとおり）
    c.bond = 100;
    if (g.m10Can(c) !== !!P[id].romance) F(`${id} の恋の相手になれるかが romance（${P[id].romance}）と違う`);
  }
  // 好感度の始まり（F3 の初対面）・二重にならない
  start("garmund");
  g.c2Meet("dietrich");
  g.affMeet("dietrich");
  if (g.S.aff.dietrich !== C7.dietrich.aff0) F(`会ったときの好感度が始まりの数でない：${g.S.aff.dietrich}`);
  g.apply({ aff: { dietrich: 10 } });
  if (g.S.aff.dietrich !== C7.dietrich.aff0 + 10) F(`結果の aff が一度だけ足されない：${g.S.aff.dietrich}`);
  // 周りの人の出来事：仲間と一緒に起きる
  start("garmund");
  g.c2Join("hartmut"); g.c2Meet("liesel");
  if (begin("c7_liesel_pile")) choose("番号は誰の");
  if (!g.S.flags.c7_liesel_pile) F("坑夫酒場の娘の出来事が終わらない");
  start("garmund");
  g.c2Join("sieglinde"); g.c2Meet("dietrich");
  if (begin("c7_diet_paper")) choose("任せる");
  if (!g.S.flags.c7_diet_paper) F("参謀の出来事が終わらない");

  if (!n) ok(`C7：仲間 ${mates.length}（恋の相手 ${love.length}）・周りの人 ${others.length}・出来事 ${evs.length}・男の型 ${JSON.stringify(types)}`);
};
