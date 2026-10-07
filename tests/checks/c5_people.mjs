// C5：持ち主の好きな型から作った人物の続き（src/data/c5_people.js・events_c5.js・zc5_people.js・engine/zzzz_c5_people.js）
// - 20 人前後。仲間 6〜7（今までの仲間と型・種族・職業・性別がかぶらないよう男を多めに）・宿敵 2〜3・使徒の側 2〜3・ほかは町。
//   国と町に散っている（王国・帝国・共和国・王国の南〔ブランデール・ヴァレンツァ〕・島・聖都・遺構・使徒領の境）。男は ojisan が多い
// - どの人にも、混ぜた型（mix・二つ以上）・ギャップ・過去・好感度の始まり（−100〜+100）・会える場所・会話を書く子のためのメモ（口調・好き・嫌い・話題）
// - どの人にも、名前と役職の札（D.C3_NAMES）・人物図鑑の説明（D.F2_PEOPLE）・立ち絵のタグ（docs/art/portraits.json の identity。男は type。仲間は差分）
// - 出来事は 2〜4 個（ふつうに起きる出会いがある）。存在しない場所・人・続き・アイテム・トロフィー・用語の行を指していない
// - 仲間は出会いの流れで加わり、好感度の始まりが入る。仲間の会話（c2talk）はここでは書かない（K1 の仕組みの上で別に書く）
// - 使徒の側：山の館の伯爵さまは E3 の形（条件・会う出来事・倒したあと）。名乗る出来事のあとでだけ名が出る。
//   聖歌の眷属を退ける・香売りの頼みを果たすと、蝶の奥方・香の姐さんの条件がそろう
// - 見せる文に、書かない言葉（見世物まわり・今の人が知らないこと・性的な言葉）が無い。地の文が叫ばない
// - 作品名・キャラ名がリポジトリに無いことは tests/checks/c4_people.mjs がリポジトリ全体で確かめる（この人たちのファイルも入る）
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TAGS = new Set(["any", "town", "wild", "dungeon", "capital", "port", "snow", "realm"]);
const BANNED = /見世物|観客|客席|舞台|台本|神々|魔王|魔人|正体|もういない|胸|童貞|貧乳|巨乳|ナイスバディ|ロリ|体つき|裸|下着|情欲|色気/;
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };
// 散らす先（場所の id → 地方）
const REGION = {
  leavel: "王国", w2_granbel: "王国", karna: "王国の南", nerva: "王国の南", garmund: "帝国", w2_zalgros: "帝国", frost: "帝国",
  zephara: "共和国", w2_nagris: "共和国", w2_amyrein: "共和国", yakumo: "島", w1_oboro: "島", w1_holy: "聖都", ruins: "遺構",
  fort: "使徒領の境", mountains: "使徒領の境", wasteland: "使徒領の境", forest: "共和国",
};

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C5: " + m); };
  const D = G.data;
  const C5 = D.C5_PEOPLE || {};
  const P = D.C2_PEOPLE || {};
  const ids = Object.keys(C5);

  // ---------------------------------------------------------------- 顔ぶれ
  if (ids.length < 17 || ids.length > 23) F(`人物が 20 人前後でない：${ids.length}`);
  for (const id of ids) if ((D.C4_PEOPLE || {})[id]) F(`${id} が C4 の人と重なっている`);
  const side = (...s) => ids.filter((id) => s.includes(C5[id].side));
  const joiners = side("仲間");
  if (joiners.length < 6 || joiners.length > 7) F(`仲間になる人が 6〜7 人でない：${joiners.length}`);
  if (side("宿敵").length < 2 || side("宿敵").length > 3) F(`宿敵が 2〜3 人でない：${side("宿敵").length}`);
  if (side("使徒", "眷属").length < 2 || side("使徒", "眷属").length > 3) F(`使徒の側が 2〜3 人でない：${side("使徒", "眷属").length}`);
  if (side("使徒").length < 1) F("使徒そのものがいない");
  // 今までの仲間（キャラメモ 8 人・C4 の 4 人）と、型・種族・職業・性別がかぶらない
  const before = Object.keys(P).filter((id) => P[id].join && !C5[id]);
  const men = (list) => list.filter((id) => P[id] && P[id].sex === "男").length;
  if (men(joiners) * 2 < joiners.length) F(`新しい仲間に男が少ない（今までの仲間は女が多い）：${men(joiners)}/${joiners.length}`);
  for (const id of joiners) {
    const p = P[id];
    if (!p || !p.join) continue;
    for (const b of before) {
      const q = P[b];
      if (q.join.cls === p.join.cls) F(`${id} の肩書きが ${b} と同じ：${p.join.cls}`);
      if (q.sex === p.sex && q.join.trait === p.join.trait && (q.beast || q.race) === (p.beast || p.race)) F(`${id} が ${b} と性別・性格・種族まで同じ`);
    }
  }
  // 恋と結婚の相手（romance）：仲間全員に true/false。C5 の割り当ては 3 人で、みな 18 歳以上・子どもの姿でない
  for (const id of joiners) if (P[id] && typeof P[id].romance !== "boolean") F(`${id} に romance（true/false）が無い`);
  const lovers = joiners.filter((id) => P[id] && P[id].romance === true);
  if (lovers.length !== 3) F(`恋の相手になれる仲間が 3 人でない：${lovers.join("・")}`);
  for (const id of lovers) if (P[id].age < 18 || P[id].childLook || P[id].join.noLove) F(`${id} は恋の相手にできない（18 歳未満か子どもの姿）`);
  if (new Set(joiners.map((id) => P[id] && P[id].join && P[id].join.trait)).size !== joiners.length) F("新しい仲間どうしで性格がかぶっている");
  if (new Set(joiners.map((id) => P[id] && (P[id].beast || P[id].race))).size < 4) F("新しい仲間の種族がばらけていない");
  const regions = new Set(ids.flatMap((id) => (C5[id].meet || []).map((l) => REGION[l]).filter(Boolean)));
  for (const r of ["王国", "帝国", "共和国", "王国の南", "島", "聖都", "遺構", "使徒領の境"]) if (!regions.has(r)) F(`${r}で会える人がいない`);

  // ---------------------------------------------------------------- 一人ずつ
  const portraits = JSON.parse(readFileSync(path.join(ROOT, "docs/art/portraits.json"), "utf8")).portraits;
  const isMale = (p) => /(^|,\s*)(\d*boys?|male|male focus|old man|man|young man)(\s*,|$)/i.test([p.identity, p.tags].join(", "));
  const types = {};
  const evs = D.EVENTS.filter((e) => e.id.startsWith("c5_") || e.id === "e3_meet_yuzuel" || e.id === "e3_after_yuzuel");
  const inEv = (e) => (e.c2 ? (Array.isArray(e.c2) ? e.c2 : [e.c2]) : e.c2talk ? [e.c2talk] : []);
  const outs = (e) => e.choices.flatMap((c) => [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win]).filter(Boolean);
  const flagsSet = new Set(evs.flatMap((e) => outs(e).map((o) => o.flag)).filter(Boolean));
  for (const id of ids) {
    const c = C5[id], p = P[id], w = `${id}`;
    if (!p || !p.c4 || !p.c5) { F(`${w}: C2 の人物の表に無いか、c4・c5 の印が無い`); continue; }
    if (!(typeof c.aff0 === "number" && c.aff0 >= -100 && c.aff0 <= 100)) F(`${w}: 好感度の始まりが −100〜+100 でない`);
    if (!(c.mix && c.mix.length >= 2)) F(`${w}: 混ぜた型が二つ未満`);
    if (!c.gap || !c.past) F(`${w}: ギャップか過去が無い`);
    if (!(c.meet && c.meet.length)) F(`${w}: 会える場所が無い`);
    for (const l of c.meet || []) if (!D.LOCS[l] && !TAGS.has(l)) F(`${w}: 会える場所 ${l} が無い`);
    const v = c.voice;
    if (!v || !v.tone || !(v.likes || []).length || !(v.dislikes || []).length || !(v.topics || []).length) F(`${w}: 会話のためのメモ（口調・好き・嫌い・話題）が無い`);
    if (!p.who || p.who.seed !== "c2:" + id) F(`${w}: 絵（who）の seed が c2:${id} でない`);
    if (!D.RACES[p.race] || (p.race === "beast") !== !!D.BEASTS[p.beast]) F(`${w}: 種族が変 ${p.race} ${p.beast}`);
    if (p.sex === "男" && c.type) types[c.type] = (types[c.type] || 0) + 1;
    if (p.sex === "男" && !c.type) F(`${w}: 男なのに立ち絵の型（type）が控えに無い`);
    const t = (D.C3_NAMES || {})[id];
    if (!t || !t.name || !t.role) F(`${w}: 名前と役職の札（D.C3_NAMES）が無い`);
    else if (t.alias && !(t.reveal && flagsSet.has(t.reveal))) F(`${w}: 呼び名のある人なのに、名乗る出来事（${t.reveal}）が無い`);
    const q = (D.F2_PEOPLE || {})[id];
    if (!q || !q.title || q.face !== undefined || !q.lines || q.lines.length !== 2) F(`${w}: 人物図鑑の説明（title・二行）が無い`);
    const pt = portraits.find((x) => x.id === id);
    if (!pt) F(`${w}: 立ち絵の一覧（portraits.json）に無い`);
    else {
      if (pt.group !== "c2" || !pt.identity || !pt.tags || !pt.memo || !pt.face) F(`${w}: 立ち絵の group・identity・tags・face・memo のどれかが無い`);
      if (isMale(pt) !== (p.sex === "男")) F(`${w}: 立ち絵の性別がデータと違う`);
      if (p.sex === "男" && pt.type !== c.type) F(`${w}: 立ち絵の型（${pt.type}）が控えの型（${c.type}）と違う`);
      if (p.join && !(pt.variants && pt.variants.joy && pt.variants.anger && pt.variants.sorrow && pt.variants.fun)) F(`${w}: 仲間なのに表情の差分が無い`);
    }
    const own = evs.filter((e) => inEv(e).includes(id));
    if (own.length < 2 || own.length > 4) F(`${w}: 出てくる出来事が 2〜4 個でない：${own.length}`);
    if (!own.some((e) => e.w > 0 && e.id.startsWith("c5_") && e.cond && e.cond({ day: 20, flags: {}, c2: {}, companions: [] }))) F(`${w}: 二十日目に、ふつうに起きる出会いの出来事が無い`);
    if (evs.some((e) => e.c2talk === id)) F(`${w}: 仲間の会話（c2talk）は K1 の仕組みの上で書く`);
    if (p.join) {
      if (!own.some((e) => outs(e).some((o) => o.c2join === id || (Array.isArray(o.c2join) && o.c2join.includes(id))))) F(`${w}: 仲間に加わる出来事が無い`);
      const vo = D.C2_VOICE[id];
      if (!vo || vo.talk.length < 3 || !vo.betray || !vo.die) F(`${w}: ひとことが足りない`);
      if (!p.join.noLove) for (const k of ["spark", "confess", "propose", "part", "cold"]) if (!vo || !vo[k]) F(`${w}: 恋のひとこと ${k} が無い`);
      if (!(D.C2_INVITE[id] || []).length) F(`${w}: 誘ったときの一言が無い`);
      if (!D.M2_TRAITS[p.join.trait]) F(`${w}: 性格 ${p.join.trait} が M2 に無い`);
      for (const k of Object.keys(D.M2_LIFE)) if (!p.join.life[k]) F(`${w}: 暮らし ${k} が無い`);
      for (const l of p.join.home) if (!D.LOCS[l] || D.LOCS[l].type !== "town") F(`${w}: 誘える町 ${l} が町でない`);
      // 居場所×時期の予定（F4 docs/f4_schedule.md）。場所があり、出会いの出来事の場所の種類と合う時期がある
      const sch = p.schedule || p.join.schedule;
      if (!(Array.isArray(sch) && sch.length)) F(`${w}: 予定（schedule）が無い`);
      else {
        for (const x of sch) if (!D.LOCS[x.loc] || !x.note || x.from === undefined || x.to === undefined) F(`${w}: 予定の場所 ${x.loc} が無いか、note・from・to が無い`);
        const first = own.find((e) => e.w > 0 && e.id.startsWith("c5_") && inEv(e)[0] === id);
        const kind = (x) => (TAGS.has(x) ? x : D.LOCS[x] && D.LOCS[x].type);
        if (first && !sch.some((x) => first.where.some((wh) => wh === x.loc || kind(wh) === D.LOCS[x.loc].type))) F(`${w}: 出会いの出来事（${first.id}）の場所と、予定の居場所の種類が合う時期が無い`);
      }
    }
    // 子どもの姿・18 歳未満は恋の相手にしない（仲間にならない人も、印をそろえる）
    if ((p.childLook || p.age < 18) && p.join && !p.join.noLove) F(`${w}: 子どもの姿か 18 歳未満なのに恋の相手になる`);
  }
  const males = Object.values(types).reduce((a, b) => a + b, 0);
  if (!((types.ojisan || 0) * 2 >= males)) F(`男の立ち絵の型で ojisan が半分に満たない：${JSON.stringify(types)}`);
  for (const t of ["brute", "bishonen", "classic"]) if (!types[t]) F(`男の立ち絵の型に ${t} がいない`);

  // ---------------------------------------------------------------- 出来事の整い
  const evIds = new Set(D.EVENTS.map((e) => e.id));
  const loreOk = (s) => { const [k, line] = String(s).split(":"); const e = D.LORE[k]; return !!e && (!line || e.lines.some(([x]) => x === line)); };
  for (const e of evs) {
    for (const x of e.where) if (!TAGS.has(x) && !D.LOCS[x]) F(`出来事 ${e.id}: 場所 ${x} が無い`);
    for (const id of inEv(e)) if (!P[id]) F(`出来事 ${e.id}: 人物 ${id} が表に無い`);
    if (e.mood !== undefined && !["joy", "anger", "sorrow", "fun", "normal"].includes(e.mood)) F(`出来事 ${e.id}: mood が変 ${e.mood}`);
    if (e.lore && !loreOk(e.lore)) F(`出来事 ${e.id}: 用語の行 ${e.lore} が無い`);
    for (const c of e.choices) for (const f of [].concat(c.fight || [])) if (f !== "@pool" && !D.ENEMIES[f]) F(`出来事 ${e.id}: 敵 ${f} が無い`);
    for (const o of outs(e)) {
      if (o.next && !evIds.has(o.next)) F(`出来事 ${e.id}: 続き ${o.next} が無い`);
      for (const id of Object.keys(o.aff || {})) if (!P[id]) F(`出来事 ${e.id}: 好感度の人 ${id} が表に無い`);
      for (const id of [].concat(o.c2join || [])) if (!P[id] || !P[id].join) F(`出来事 ${e.id}: 仲間にできない ${id}`);
      if (o.item && !D.ITEMS[o.item]) F(`出来事 ${e.id}: アイテム ${o.item} が無い`);
      if (o.trophy && o.trophy !== "majin" && !D.TROPHIES.some((t) => t.key === o.trophy)) F(`出来事 ${e.id}: トロフィー ${o.trophy} が無い`);
      for (const l of [].concat(o.lore || [])) if (!loreOk(l)) F(`出来事 ${e.id}: 用語の行 ${l} が無い`);
    }
  }
  // 続きの出来事（w: 0）は、どれかの結果の next から入れる
  const nexts = new Set(evs.flatMap((e) => outs(e).map((o) => o.next)).filter(Boolean));
  for (const e of evs) if (e.w === 0 && !nexts.has(e.id)) F(`続きの出来事 ${e.id} に、どこからも入れない`);
  for (const k of ["c5_debate", "c5_choir", "c5_duel", "c5_chain", "c5_ledger"]) {
    if (!D.TROPHIES.some((t) => t.key === k)) F(`トロフィー ${k} が無い`);
    if (!evs.some((e) => outs(e).some((o) => o.trophy === k))) F(`トロフィー ${k} が、どの出来事でも付かない`);
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
  for (const k of ["c5_violaine", "c5_severin"]) {
    const e = D.ENEMIES[k];
    if (!e) F(`敵 ${k} の戦闘データが無い`);
    else texts.push(e.name, e.desc, ...Object.values(e.lines).flat());
  }
  for (const k of ["c5_debate", "c5_scale", "c5_ember", "e3_d_yuzuel"]) { const it = D.ITEMS[k]; if (it) texts.push(it.name, it.desc, it.flavor); }
  for (const [id, e] of Object.entries(D.LORE)) if (id.startsWith("c5_")) e.lines.forEach(([, t]) => texts.push(t));
  for (const t of texts) if (typeof t !== "string" || BANNED.test(t)) F(`見せる文に書かない言葉か、文でないものがある「${String(t).slice(0, 40)}」`);
  for (const t of texts) if (typeof t === "string" && /。[^「」]*！/.test(t.replace(/「[^」]*」/g, ""))) F(`地の文が叫んでいる「${t.slice(0, 40)}」`);
  // 使徒の名は、使徒自身が名乗る出来事の中だけ。眷属の名も、名乗る（呼ばれる）出来事より前に出さない
  const NAMEONLY = { ユズエル: ["c5_yuz_name"], セヴラン: ["c5_sev_fight"], ルフィナ: ["c5_ruf_home"] };
  for (const e of evs) for (const t of [e.text, ...e.choices.map((c) => c.label), ...outs(e).map((o) => o.text)]) for (const [nm, allow] of Object.entries(NAMEONLY)) if (t && t.includes(nm) && !allow.includes(e.id)) F(`${nm} の名が、名乗る前の文にある（${e.id}）`);

  // ---------------------------------------------------------------- 使徒の側（E3）
  const E3 = D.E3 || { LIST: {} };
  const yz = E3.LIST.yuzuel;
  if (!yz || yz.no !== 13 || yz.rank !== "B" || yz.calm !== "友好" || yz.home !== "mountains") F("伯爵さまが E3 の表（刻印の環の十三・B 級・友好・断界山脈）に無い");
  if (!evIds.has("e3_meet_yuzuel") || !evIds.has("e3_after_yuzuel")) F("伯爵さまに会う出来事か、倒したあとの出来事が無い");
  if (!(E3.LIST.aurelia && E3.LIST.aurelia.keys.some((k) => k.id === "c5_severin"))) F("聖歌の眷属を退けることが、蝶の奥方の条件に無い");
  if (!(E3.LIST.yoihime && E3.LIST.yoihime.keys.some((k) => k.id === "c5_rufina"))) F("古い香の燃えさしが、香の姐さんの条件に無い");
  for (const it of ["c5_debate", "c5_scale", "c5_ember", "e3_d_yuzuel"]) if (!D.ITEMS[it] || !D.ITEMS[it].flavor) F(`アイテム ${it} が無いか、説明（flavor）が無い`);
  if (!(D.BOSS_LINES && D.BOSS_LINES.c5_severin)) F("聖歌の眷属の前口上が無い");
  const people = JSON.parse(readFileSync(path.join(ROOT, "docs/art/monsters.json"), "utf8")).people || {};
  if (people.c5_violaine !== "violaine" || people.c5_severin !== "severin") F("人の姿の敵（c5_violaine・c5_severin）の絵が人物の側に無い");

  // ---------------------------------------------------------------- 決まった流れ
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  let g = null;
  const start = (loc) => {
    g = loadEngine();
    g.rand = seeded(55);
    g.P = { trophies: {}, graves: [] };
    g.newGame({ cls: "merc", stats, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
    g.S.maxHp = g.S.hp = 999;
    g.S.gold = 500;
    g.S.day = 20;
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
    bruno: ["nerva", "c5_bru_spider", ["蜘蛛をつまんで", "横に並んで", "連れていく"]],
    trude: ["garmund", "c5_tru_blast", ["何を作っていた", "連れていく"]],
    souhaku: ["yakumo", "c5_sou_pier", ["若い衆のわけ", "連れていく"]],
    adele: ["w2_granbel", "c5_ade_lecture", ["一緒に聞いて", "新米たちを下がらせる", "連れていく"]],
    celestin: ["forest", "c5_cel_tree", ["返事を待つ", "言われたほうへ", "連れていく"]],
    felix: ["w2_granbel", "c5_fel_count", ["一緒に拾う", "殿は", "連れていく"]],
  };
  for (const [id, [loc, ev, steps]] of Object.entries(FLOWS)) {
    start(loc);
    if (!begin(ev)) continue;
    steps.forEach(choose);
    const c = g.c2In(id, g.S);
    if (!c) { F(`${id} が出会いの流れで仲間にならない`); continue; }
    if (c.trait !== P[id].join.trait || c.sex !== P[id].sex || c.who.seed !== "c2:" + id) F(`${id} の仲間の欄が表のままでない`);
    if (!(typeof (g.S.aff || {})[id] === "number" && g.S.aff[id] >= C5[id].aff0)) F(`${id} の好感度が始まりから入っていない：${JSON.stringify(g.S.aff)}`);
  }
  if (Object.keys(FLOWS).length !== joiners.length) F("仲間になる人の流れの確かめが、仲間の数とそろっていない");
  // 好感度の始まり（F3 の初対面の値）。マイナスから始まる人がいる
  start("ruins");
  g.c2Meet("vittorio");
  if (g.S.aff.vittorio !== C5.vittorio.aff0) F(`会ったときの好感度が始まりの数でない：${g.S.aff.vittorio}`);
  g.c2Meet("vittorio");
  g.affMeet("vittorio");
  if (g.S.aff.vittorio !== C5.vittorio.aff0) F(`二度目に会うと好感度が始まりに戻るか動く：${g.S.aff.vittorio}`);
  if (!ids.some((id) => C5[id].aff0 < 0) || !ids.some((id) => C5[id].aff0 > 0)) F("好感度の始まりがマイナスの人とプラスの人の両方がいない");
  // 伯爵さま：問答に勝つ → 椅子に名を刻んで名乗る → 条件がそろう
  start("mountains");
  if (begin("c5_yuz_manor")) choose("問答に応じる");
  if (!g.S.inv.c5_debate) F("問答に勝っても、負けの印の札が手に入らない");
  g.S.day += 3;
  if (begin("c5_yuz_name")) choose("名を刻み");
  if (!g.S.flags.c5_yuz_name) F("伯爵さまが名乗らない");
  const yk = g.e3Keys("yuzuel");
  if (!yk.some((k) => k.id === "debate" && k.met)) F("負けの印の札が、伯爵さまの条件にならない");
  // 聖歌の眷属：歌を聴く → 審問官と会う → 夜の大聖堂で退ける → 蝶の奥方の条件・名が分かる
  start("w1_holy");
  if (begin("c5_sev_choir")) choose("歌い手に話しかける");
  if (begin("c5_amb_nap")) choose("嫌いだ");
  g.S.day += 15;
  if (begin("c5_sev_fight")) choose("扉を開けて");
  if (!g.S.inv.c5_scale) F("聖歌の眷属を退けても、金色の鱗粉の小瓶が手に入らない");
  if (!g.S.flags.c5_sev_name) F("聖歌の眷属を退けても、名が分からない");
  if (!g.e3Keys("aurelia").some((k) => k.id === "c5_severin" && k.met)) F("金色の鱗粉の小瓶が、蝶の奥方の条件にならない");
  // 香売り：屋台 → 鏡を伏せる → 船宿に香を届ける → 香の姐さんの条件
  start("yakumo");
  if (begin("c5_ruf_stall")) choose("香を一包み買う");
  g.S.day += 8;
  if (begin("c5_ruf_mirror")) choose("黙って");
  g.S.loc = "nerva";
  g.S.day += 10;
  if (begin("c5_ruf_home")) choose("香を一包み届ける");
  if (!g.S.inv.c5_ember || !g.S.flags.c5_ruf_home) F("香売りの頼みを果たしても、古い香の燃えさしが手に入らないか、名が分からない");
  if (!g.e3Keys("yoihime").some((k) => k.id === "c5_rufina" && k.met)) F("古い香の燃えさしが、香の姐さんの条件にならない");
  // ギルド本部の長：出会い → 帳面に載らない依頼 → 最後の帳場（報われない）
  start("karna");
  if (begin("c5_con_ledger")) choose("依頼を受けに来た");
  g.S.day += 8;
  if (begin("c5_con_job")) choose("引き受ける");
  g.S.day = 61;
  if (begin("c5_con_fall")) choose("帳面を持つ手");
  if (!g.S.flags.c5_con_fall || !g.P.trophies.c5_ledger) F("ギルド本部の長の最後の日が来ないか、トロフィーが付かない");
  // 黒衣の剣士：手袋 → 焼き菓子屋 → 御前試合
  start("leavel");
  if (begin("c5_vio_glove")) choose("手袋を拾って");
  if (begin("c5_gau_rolling")) choose("子どもたちと");
  g.S.day = 41;
  if (begin("c5_vio_trial")) choose("人垣を割って");
  if (!g.S.flags.c5_vio_trial) F("御前試合が終わらない");

  if (!n) ok(`C5：作った人物 ${ids.length} 人（仲間 ${joiners.length}・宿敵 ${side("宿敵").length}・使徒の側 ${side("使徒", "眷属").length}）・出来事 ${evs.length}・男の型 ${JSON.stringify(types)}・名前の札と図鑑と立ち絵`);
};
