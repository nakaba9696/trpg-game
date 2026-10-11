// C6：レオネスト王国（王都・地方・商都ブランデール・港町ヴァレンツァ）の人物（src/data/c6_people.js・events_c6.js・zc6_people.js・engine/zzzz_c6_people.js）
// - 仲間になる人 10 人と、その周りの名のある人 4〜6 人。仲間は性別・年齢・種族・男の型が散っている。名前が他の人と被らない
// - 仲間の全員に romance（恋と結婚ができるか。R1 #182 の印）。true はちょうど 4 人で、みな 18 歳以上・子どもの姿でない。false の人は恋の相手にならない
// - どの人にも、混ぜた型（mix）・ギャップ・過去・好感度の始まり・名前と役職の札・人物図鑑の説明・立ち絵のタグ（男は type。仲間は差分）
// - 仲間には、会話を書く子のための控え（口調・一人称・好きなもの・嫌いなもの・話題・他の仲間との相性）
// - 出来事は 2〜4 個（ふつうに起きる出会いがある）。存在しない場所・人・続き・アイテムを指していない。仲間はその人だけの話が二つ以上
// - 仲間は出会いの流れで加わり、好感度の始まりが入る。見せる文に書かない言葉が無く、地の文が叫ばない
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TAGS = new Set(["any", "town", "wild", "dungeon", "capital", "port", "snow", "realm"]);
const BANNED = /見世物|観客|客席|舞台|台本|神々|魔王|魔人|正体|もういない|胸|童貞|貧乳|巨乳|ナイスバディ|ロリ|体つき|裸|下着|情欲|色気/;
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };
// 担当の地域（王都・地方・ブランデール・ヴァレンツァ・街道・森と、その隣）
const REGION = new Set(["leavel", "w2_granbel", "karna", "nerva", "plains", "forest"]);

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C6: " + m); };
  const D = G.data;
  const C6 = D.C6_PEOPLE || {};
  const P = D.C2_PEOPLE || {};
  const ids = Object.keys(C6);
  const comp = ids.filter((id) => C6[id].side === "仲間");
  const others = ids.filter((id) => C6[id].side !== "仲間");

  // ---------------------------------------------------------------- 顔ぶれ
  if (comp.length !== 10) F(`仲間になる人が 10 人でない：${comp.length}`);
  if (others.length < 4 || others.length > 6) F(`周りの名のある人が 4〜6 人でない：${others.length}`);
  const men = comp.filter((id) => P[id] && P[id].sex === "男"), women = comp.filter((id) => P[id] && P[id].sex === "女");
  if (men.length < 3 || women.length < 3) F(`仲間の男女が偏っている：男 ${men.length}・女 ${women.length}`);
  if (new Set(comp.map((id) => P[id] && (P[id].beast || P[id].race))).size < 3) F("仲間の種族がばらけていない");
  const ages = comp.map((id) => P[id] && P[id].age);
  if (!(Math.min(...ages) < 25 && Math.max(...ages) >= 60)) F(`仲間の年齢がばらけていない：${ages.join("・")}`);
  const types = men.map((id) => C6[id].type);
  if (types.filter((t) => t === "ojisan").length < 2 || new Set(types).size < 3) F(`男の型が渋いおっさん多めに散っていない：${types.join("・")}`);
  for (const id of others) if (!C6[id].rel) F(`${id}: 仲間との関わり（rel）が無い`);
  // 名前が他の人と被らない（C2・C4・ほかの子の人とも）
  const names = new Map();
  for (const [id, p] of Object.entries(P)) { const k = p.name; if (names.has(k)) F(`名前「${k}」が ${names.get(k)} と ${id} で被っている`); names.set(k, id); }

  // ---------------------------------------------------------------- 恋と結婚（romance）
  const roman = comp.filter((id) => P[id] && P[id].romance === true);
  if (roman.length !== 4) F(`恋と結婚ができる人が 4 人でない：${roman.join("・")}`);
  for (const id of comp) {
    const p = P[id];
    if (!p || typeof p.romance !== "boolean") { F(`${id}: 仲間なのに romance（true/false）が無い`); continue; }
    if (p.romance && (p.childLook || p.age < 18)) F(`${id}: 18 歳未満か子どもの姿なのに恋の相手`);
    if (p.join && p.join.noLove) F(`${id}: 恋の相手は R1 の romance で絞る（noLove は使わない）`);
    const c = { c2: id, age: p.age, who: p.who };
    if (G.m10Can && G.m10Can(c) !== p.romance) F(`${id}: 恋の相手かどうか（G.m10Can）が romance と違う`);
  }

  // ---------------------------------------------------------------- 一人ずつ
  const portraits = JSON.parse(readFileSync(path.join(ROOT, "docs/art/portraits.json"), "utf8")).portraits;
  const isMale = (p) => /(^|,\s*)(\d*boys?|male|male focus|old man|man|young man)(\s*,|$)/i.test([p.identity, p.tags].join(", "));
  const evs = D.EVENTS.filter((e) => e.id.startsWith("c6_"));
  const inEv = (e) => (e.c2 ? (Array.isArray(e.c2) ? e.c2 : [e.c2]) : e.c2talk ? [e.c2talk] : []);
  const outs = (e) => e.choices.flatMap((c) => [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win]).filter(Boolean);
  for (const id of ids) {
    const c = C6[id], p = P[id], w = `${id}`;
    if (!p || !p.c6) { F(`${w}: C2 の人物の表に無いか、c6 の印が無い`); continue; }
    if (p.c4) F(`${w}: C4 の印も付いている`);
    if (!(typeof c.aff0 === "number" && c.aff0 >= -100 && c.aff0 <= 100)) F(`${w}: 好感度の始まりが −100〜+100 でない`);
    if (!(c.mix && c.mix.length >= 2)) F(`${w}: 混ぜた型が二つ未満`);
    if (!c.gap || !c.past) F(`${w}: ギャップか過去が無い`);
    if (!p.who || p.who.seed !== "c2:" + id) F(`${w}: 絵（who）の seed が c2:${id} でない`);
    if (!D.RACES[p.race] || (p.race === "beast") !== !!D.BEASTS[p.beast]) F(`${w}: 種族が変 ${p.race} ${p.beast}`);
    if (p.race === "beast" && p.who.look.beast !== p.beast) F(`${w}: 獣人なのに絵に獣の耳が無い`);
    if (p.race === "elf" && p.who.look.ears !== "pointy") F(`${w}: エルフなのに絵の耳が尖っていない`);
    const t = (D.C3_NAMES || {})[id];
    if (!t || !t.name || !t.role) F(`${w}: 名前と役職の札（D.C3_NAMES）が無い`);
    const q = (D.F2_PEOPLE || {})[id];
    if (!q || !q.title || !q.lines || q.lines.length !== 2) F(`${w}: 人物図鑑の説明（title・二行）が無い`);
    const pt = portraits.find((x) => x.id === id);
    if (!pt) F(`${w}: 立ち絵の一覧（portraits.json）に無い`);
    else {
      if (pt.group !== "c2" || !pt.identity || !pt.tags || !pt.memo) F(`${w}: 立ち絵の group・identity・tags・memo のどれかが無い`);
      if (isMale(pt) !== (p.sex === "男")) F(`${w}: 立ち絵の性別がデータと違う`);
      if (isMale(pt) && pt.type !== c.type) F(`${w}: 男の型（type）が控えと立ち絵で違う`);
      if (p.join && !(pt.variants && pt.variants.joy && pt.variants.anger && pt.variants.sorrow && pt.variants.fun)) F(`${w}: 仲間なのに表情の差分が無い`);
    }
    for (const l of c.meet || []) if (!D.LOCS[l]) F(`${w}: 会える場所 ${l} が無い`);
    else if (!REGION.has(l)) F(`${w}: 会える場所 ${l} が担当の地域の外`);
    const own = evs.filter((e) => !e.c2talk && inEv(e).includes(id));
    if (own.length < 2 || own.length > 4) F(`${w}: 出てくる出来事が 2〜4 個でない：${own.length}`);
    if (!own.some((e) => e.w > 0)) F(`${w}: ふつうに起きる出来事が無い`);
    if (p.join) {
      if (c.side !== "仲間") F(`${w}: 仲間になるのに side が仲間でない`);
      const m = c.memo || {};
      for (const k of ["tone", "i", "likes", "hates", "topics", "pairs"]) if (!m[k] || (Array.isArray(m[k]) && !m[k].length)) F(`${w}: 会話の控え ${k} が無い`);
      for (const pid of Object.keys(m.pairs || {})) if (!P[pid] || !P[pid].join) F(`${w}: 相性の相手 ${pid} が仲間でない`);
      if (evs.filter((e) => e.c2talk === id).length < 2) F(`${w}: その人だけの話が二つ未満`);
      if (!own.some((e) => outs(e).some((o) => [].concat(o.c2join || []).includes(id)))) F(`${w}: 仲間に加わる出来事が無い`);
      const v = D.C2_VOICE[id];
      if (!v || v.talk.length < 3 || !v.betray || !v.die) F(`${w}: ひとことが足りない`);
      if (p.romance) for (const k of ["spark", "confess", "propose", "part", "cold"]) if (!v || !v[k]) F(`${w}: 恋のひとこと ${k} が無い`);
      if (!(D.C2_INVITE[id] || []).length) F(`${w}: 誘ったときの一言が無い`);
      if (!D.M2_TRAITS[p.join.trait]) F(`${w}: 性格 ${p.join.trait} が M2 に無い`);
      for (const k of Object.keys(D.M2_LIFE)) if (!p.join.life[k]) F(`${w}: 暮らし ${k} が無い`);
      for (const l of p.join.home) if (!D.LOCS[l] || D.LOCS[l].type !== "town") F(`${w}: 誘える町 ${l} が町でない`);
    } else if (c.side === "仲間") F(`${w}: side が仲間なのに join が無い`);
  }

  // ---------------------------------------------------------------- 出来事の整い
  const evIds = new Set(D.EVENTS.map((e) => e.id));
  for (const e of evs) {
    for (const x of e.where) if (!TAGS.has(x) && !D.LOCS[x]) F(`出来事 ${e.id}: 場所 ${x} が無い`);
    for (const id of inEv(e)) if (!P[id]) F(`出来事 ${e.id}: 人物 ${id} が表に無い`);
    for (const c of e.choices) if (c.stat && !D.STATS.includes(c.stat)) F(`出来事 ${e.id}: 能力値 ${c.stat} が無い`);
    for (const c of e.choices) for (const f of [].concat(c.fight || [])) if (f !== "@pool" && !D.ENEMIES[f]) F(`出来事 ${e.id}: 敵 ${f} が無い`);
    for (const o of outs(e)) {
      if (o.next && !evIds.has(o.next)) F(`出来事 ${e.id}: 続き ${o.next} が無い`);
      for (const id of Object.keys(o.aff || {})) if (!P[id]) F(`出来事 ${e.id}: 好感度の人 ${id} が表に無い`);
      for (const id of [].concat(o.c2join || [])) if (!P[id] || !P[id].join) F(`出来事 ${e.id}: 仲間にできない ${id}`);
      if (o.item && !D.ITEMS[o.item]) F(`出来事 ${e.id}: アイテム ${o.item} が無い`);
      if (o.trophy && !(D.TROPHIES || []).some((t) => t.key === o.trophy)) F(`出来事 ${e.id}: トロフィー ${o.trophy} が無い`);
    }
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
  for (const t of texts) if (typeof t !== "string" || BANNED.test(t)) F(`見せる文に書かない言葉か、文でないものがある「${String(t).slice(0, 40)}」`);
  for (const t of texts) if (typeof t === "string" && /。[^「」]*！/.test(t.replace(/「[^」]*」/g, ""))) F(`地の文が叫んでいる「${t.slice(0, 40)}」`);

  // ---------------------------------------------------------------- 決まった流れ：出会って、仲間に加わる
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  let g = null;
  const start = (loc) => {
    g = loadEngine();
    g.rand = seeded(66);
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
    lucien: ["leavel", "c6_luc_stone", ["石を拾う", "連れていく"]],
    barnabe: ["w2_granbel", "c6_bau_mill", ["向きが逆", "連れていく"]],
    selevan: ["nerva", "c6_sel_cart", ["値切りに割って入る", "連れていく"]],
    aubin: ["leavel", "c6_aub_stable", ["起こして", "連れていく"]],
    lazare: ["plains", "c6_laz_cart", ["加勢する", "旅に誘う"]],
    rodolphe: ["forest", "c6_rod_snare", ["正直に言う", "連れていく"]],
    margot: ["plains", "c6_mgt_toll", ["半値で通る", "連れていく"]],
    solenne: ["karna", "c6_vio_dogs", ["犬を止める", "連れていく"]],
    pipinelle: ["forest", "c6_pip_shrine", ["座る", "連れていく"]],
    lisette: ["forest", "c6_lis_lost", ["一緒に戦う", "連れていく"]],
  };
  for (const id of comp) if (!FLOWS[id]) F(`${id} の出会いの流れを確かめていない`);
  for (const [id, [loc, ev, steps]] of Object.entries(FLOWS)) {
    start(loc);
    if (!begin(ev)) continue;
    steps.forEach(choose);
    const c = g.c2In(id, g.S);
    if (!c) { F(`${id} が出会いの流れで仲間にならない`); continue; }
    if (c.trait !== P[id].join.trait || c.sex !== P[id].sex || c.who.seed !== "c2:" + id) F(`${id} の仲間の欄が表のままでない`);
    if (!(typeof (g.S.aff || {})[id] === "number" && g.S.aff[id] >= C6[id].aff0)) F(`${id} の好感度が始まりから入っていない：${JSON.stringify(g.S.aff)}`);
  }
  // 好感度の始まり（F3 の初対面の値）が一度だけ入る
  start("leavel");
  g.c2Meet("gramont");
  if (g.S.aff.gramont !== C6.gramont.aff0) F(`会ったときの好感度が始まりの数でない：${g.S.aff.gramont}`);
  g.c2Meet("gramont");
  if (g.S.aff.gramont !== C6.gramont.aff0) F(`二度目に会うと好感度が動く：${g.S.aff.gramont}`);
  // 周りの人：徴税吏と総監の帳面 → トロフィー
  start("leavel");
  if (begin("c6_luc_stone")) { choose("石を拾う"); choose("連れていく"); }
  if (begin("c6_luc_ledger")) choose("燃やせ");
  if (!g.S.flags.c6_ledger || !(g.P.trophies || {}).c6_ledger) F("総監の前で帳面を燃やしても、印かトロフィーが付かない");
  // 首席と次席：決闘のあとに、借金取りの帳場
  start("karna");
  if (begin("c6_vio_dogs")) { choose("犬を止める"); choose("連れていく"); }
  g.S.loc = "leavel";
  if (begin("c6_vio_rival")) choose("決闘を受けさせる");
  g.S.day = 30;
  if (begin("c6_ber_debt")) choose("黙っている");
  if (!(g.S.aff.berangere > C6.berangere.aff0)) F(`次席の騎士の好感度が上がらない：${g.S.aff.berangere}`);

  if (!n) ok(`C6：王国の人物 ${ids.length} 人（仲間 ${comp.length}・恋と結婚 ${roman.length}・周りの人 ${others.length}）・出来事 ${evs.length}・出会いから仲間になる流れ・好感度の始まり`);
};
