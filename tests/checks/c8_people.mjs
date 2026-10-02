// C8：仲間にできる主要な人物（src/data/c8_people.js・events_c8.js・zc8_people.js・engine/zzzz_c8_people.js）
// - 仲間 10 人＋周りの名のある人 4〜6 人。仲間は男女・種族（人でない者が半分以上）・型が散っている。男の仲間は渋いおっさん（ojisan）がいちばん多い
// - 恋と結婚の相手（join.romance）は 3 人。18 歳以上で子どもの姿でない。人でない者を含む。romance が false の人は noLove も付いている
// - どの人にも、混ぜた型（mix）・ギャップ・過去・好感度の始まり・名前と役職の札・人物図鑑・立ち絵のタグ（男は type。仲間は差分）
// - 仲間には会話を書く子へのメモ（口調・一人称・好き・嫌い・話題・相性）がある。相性の相手は C8 の仲間
// - 出来事は 2〜4 個（ふつうに起きる出会いがある）。存在しない場所・人・続き・敵を指していない。仲間はその人だけの話が二つ以上
// - 仲間は出会いの流れで加わり、好感度の始まりが入る。猟兵頭は戦ったあと名前が分かる
// - 見せる文に、書かない言葉が無い。地の文が叫ばない
// - 名前が、ほかの名のある人と被らない
// （作品名・キャラ名がリポジトリに無いことは tests/checks/c4_people.mjs が確かめる）
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TAGS = new Set(["any", "town", "wild", "dungeon", "capital", "port", "snow", "realm"]);
const BANNED = /見世物|観客|客席|舞台|台本|神々|魔王|魔人|正体|もういない|胸|童貞|貧乳|巨乳|ナイスバディ|ロリ|体つき|裸|下着|情欲|色気/;
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C8: " + m); };
  const D = G.data;
  const C8 = D.C8_PEOPLE || {};
  const P = D.C2_PEOPLE || {};
  const ids = Object.keys(C8);
  const mates = ids.filter((id) => C8[id].side === "仲間");
  const others = ids.filter((id) => C8[id].side !== "仲間");

  // ---------------------------------------------------------------- 顔ぶれ
  if (mates.length !== 10) F(`仲間が 10 人でない：${mates.length}`);
  if (others.length < 4 || others.length > 6) F(`周りの名のある人が 4〜6 人でない：${others.length}`);
  const nonHuman = mates.filter((id) => P[id] && (P[id].race !== "human" || P[id].kin));
  if (nonHuman.length < 5) F(`人でない仲間が半分に満たない：${nonHuman.length}`);
  const males = mates.filter((id) => P[id] && P[id].sex === "男");
  if (males.length < 4 || mates.length - males.length < 3) F(`仲間の男女が偏っている：男 ${males.length}`);
  const types = {};
  males.forEach((id) => { types[C8[id].type] = (types[C8[id].type] || 0) + 1; });
  if (Object.keys(types).length < 3 || Object.entries(types).some(([t, k]) => t !== "ojisan" && k > (types.ojisan || 0))) F(`男の仲間の型が散っていないか、おっさんが多くない：${JSON.stringify(types)}`);
  if (new Set(mates.map((id) => P[id] && P[id].join && P[id].join.trait)).size < 8) F("仲間の性格（trait）が被りすぎ");
  // 今の仲間と名前が被らない
  const names = new Map();
  for (const [id, p] of Object.entries(P)) if (!C8[id]) names.set(p.name, id);
  for (const [id, t] of Object.entries(D.C3_NAMES || {})) if (!C8[id]) names.set(t.name, id);
  for (const id of ids) if (names.has(P[id] && P[id].name) || names.has(((D.C3_NAMES || {})[id] || {}).name)) F(`${id}: 名前がほかの人（${names.get(P[id].name) || names.get(D.C3_NAMES[id].name)}）と被る`);

  // ---------------------------------------------------------------- 恋と結婚
  const love = mates.filter((id) => P[id] && P[id].join && P[id].join.romance === true);
  if (love.length !== 3) F(`恋と結婚の相手が 3 人でない：${love.join("・")}`);
  if (!love.some((id) => nonHuman.includes(id))) F("恋の相手に人でない者がいない");
  for (const id of love) {
    const p = P[id];
    if (p.age < 18 || p.childLook || p.join.noLove) F(`${id}: 恋の相手なのに 18 歳未満か子どもの姿か noLove`);
    const v = D.C2_VOICE[id] || {};
    for (const k of ["spark", "confess", "propose", "part", "cold"]) if (!v[k]) F(`${id}: 恋のひとこと ${k} が無い`);
  }
  for (const id of mates) {
    const j = P[id] && P[id].join;
    if (!j || typeof j.romance !== "boolean") F(`${id}: join.romance が true/false でない`);
    else if (!j.romance && !j.noLove) F(`${id}: romance が false なのに noLove が無い`);
  }

  // ---------------------------------------------------------------- 一人ずつ
  const portraits = JSON.parse(readFileSync(path.join(ROOT, "docs/art/portraits.json"), "utf8")).portraits;
  const isMale = (p) => /(^|,\s*)(\d*boys?|male|male focus|old man|man|young man)(\s*,|$)/i.test([p.identity, p.tags].join(", "));
  const evs = D.EVENTS.filter((e) => e.id.startsWith("c8_"));
  const inEv = (e) => (e.c2 ? (Array.isArray(e.c2) ? e.c2 : [e.c2]) : []);
  const outs = (e) => e.choices.flatMap((c) => [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win]).filter(Boolean);
  const flagsSet = new Set(evs.flatMap((e) => outs(e).map((o) => o.flag)).filter(Boolean));
  for (const id of ids) {
    const c = C8[id], p = P[id], w = id;
    if (!p || !p.c8) { F(`${w}: C2 の人物の表に無いか、c8 の印が無い`); continue; }
    if (!(typeof c.aff0 === "number" && c.aff0 >= -100 && c.aff0 <= 100)) F(`${w}: 好感度の始まりが −100〜+100 でない`);
    if (!(c.mix && c.mix.length >= 2)) F(`${w}: 混ぜた型が二つ未満`);
    if (!c.gap || !c.past) F(`${w}: ギャップか過去が無い`);
    if (!p.who || p.who.seed !== "c2:" + id) F(`${w}: 絵（who）の seed が c2:${id} でない`);
    if (!D.RACES[p.race] || (p.race === "beast") !== !!D.BEASTS[p.beast]) F(`${w}: 種族が変 ${p.race} ${p.beast}`);
    if ((p.sex === "男") !== !!c.type) F(`${w}: 男なのに型が無いか、女なのに型がある`);
    const t = (D.C3_NAMES || {})[id];
    if (!t || !t.name || !t.role) F(`${w}: 名前と役職の札（D.C3_NAMES）が無い`);
    else if (t.alias && !(t.reveal && flagsSet.has(t.reveal))) F(`${w}: 呼び名のある人なのに、名が分かる出来事（${t.reveal}）が無い`);
    const q = (D.F2_PEOPLE || {})[id];
    if (!q || !q.title || !q.lines || q.lines.length !== 2) F(`${w}: 人物図鑑の説明（title・二行）が無い`);
    const pt = portraits.find((x) => x.id === id);
    if (!pt) F(`${w}: 立ち絵の一覧（portraits.json）に無い`);
    else {
      if (pt.group !== "c2" || !pt.identity || !pt.tags || !pt.memo) F(`${w}: 立ち絵の group・identity・tags・memo のどれかが無い`);
      if (isMale(pt) !== (p.sex === "男")) F(`${w}: 立ち絵の性別がデータと違う`);
      if (isMale(pt) && pt.type !== c.type) F(`${w}: 立ち絵の型（${pt.type}）がデータ（${c.type}）と違う`);
      if (p.join && !(pt.variants && pt.variants.joy && pt.variants.anger && pt.variants.sorrow && pt.variants.fun)) F(`${w}: 仲間なのに表情の差分が無い`);
    }
    const own = evs.filter((e) => !e.c2talk && inEv(e).includes(id));
    if (own.length < 2 || own.length > 4) F(`${w}: 出てくる出来事が 2〜4 個でない：${own.length}`);
    if (!own.some((e) => e.w > 0)) F(`${w}: ふつうに起きる出会いの出来事が無い`);
    for (const l of c.meet || []) if (!D.LOCS[l] && !TAGS.has(l)) F(`${w}: 会える場所 ${l} が無い`);
    if (!p.join) continue;
    // 仲間
    const k = c.talk || {};
    for (const key of ["tone", "i", "likes", "hates", "topics", "pals"]) if (!k[key] || (Array.isArray(k[key]) && !k[key].length)) F(`${w}: 会話のメモ ${key} が無い`);
    for (const pal of Object.keys(k.pals || {})) if (!mates.includes(pal) || pal === id) F(`${w}: 相性の相手 ${pal} が C8 の仲間でない`);
    if (evs.filter((e) => e.c2talk === id).length < 2) F(`${w}: その人だけの話が二つ未満`);
    if (!own.some((e) => outs(e).some((o) => [].concat(o.c2join || []).includes(id)))) F(`${w}: 仲間に加わる出来事が無い`);
    const v = D.C2_VOICE[id];
    if (!v || v.talk.length < 3 || !v.betray || !v.die) F(`${w}: ひとことが足りない`);
    if (!(D.C2_INVITE[id] || []).length) F(`${w}: 誘ったときの一言が無い`);
    const j = p.join;
    if (!D.M2_TRAITS[j.trait]) F(`${w}: 性格 ${j.trait} が M2 に無い`);
    for (const key of Object.keys(D.M2_LIFE)) if (!j.life[key]) F(`${w}: 暮らし ${key} が無い`);
    for (const key of D.TALENT_KEYS) if (!(j.t[key] >= 0 && j.t[key] <= 3)) F(`${w}: 才 ${key} が無い`);
    for (const key of Object.keys(j.f)) if (!D.FLAVORS[key]) F(`${w}: 暮らしの才 ${key} が無い`);
    for (const l of j.home) if (!D.LOCS[l] || D.LOCS[l].type !== "town") F(`${w}: 誘える町 ${l} が町でない`);
  }

  // ---------------------------------------------------------------- 出来事の整い
  const evIds = new Set(D.EVENTS.map((e) => e.id));
  const stats = new Set(D.STATS);
  for (const e of evs) {
    for (const x of e.where) if (!TAGS.has(x) && !D.LOCS[x]) F(`出来事 ${e.id}: 場所 ${x} が無い`);
    for (const id of inEv(e)) if (!P[id]) F(`出来事 ${e.id}: 人物 ${id} が表に無い`);
    for (const c of e.choices) {
      if (c.stat && !stats.has(c.stat)) F(`出来事 ${e.id}: 能力値 ${c.stat} が無い`);
      if (Array.isArray(c.fight)) for (const f of c.fight) if (!D.ENEMIES[f]) F(`出来事 ${e.id}: 敵 ${f} が無い`);
    }
    for (const o of outs(e)) {
      if (o.next && !evIds.has(o.next)) F(`出来事 ${e.id}: 続き ${o.next} が無い`);
      for (const id of Object.keys(o.aff || {})) if (!P[id]) F(`出来事 ${e.id}: 好感度の人 ${id} が表に無い`);
      for (const id of [].concat(o.c2join || [])) if (!P[id] || !P[id].join) F(`出来事 ${e.id}: 仲間にできない ${id}`);
      for (const s of Object.keys(o.grow || {})) if (!stats.has(s)) F(`出来事 ${e.id}: 伸ばす能力値 ${s} が無い`);
      if (o.trophy && !(D.TROPHIES || []).some((t) => t.key === o.trophy)) F(`出来事 ${e.id}: トロフィー ${o.trophy} が無い`);
      for (const l of [].concat(o.lore || [])) { const [k, line] = l.split(":"); if (!D.LORE[k] || (line && !D.LORE[k].lines.some(([x]) => x === line))) F(`出来事 ${e.id}: 用語 ${l} が無い`); }
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
  const gr = D.ENEMIES.c8_graul;
  if (!gr) F("鉄面の猟兵（c8_graul）の戦闘データが無い");
  else texts.push(gr.name, gr.desc, ...Object.values(gr.lines).flat());
  for (const [id, e] of Object.entries(D.LORE)) if (id.startsWith("c8_")) e.lines.forEach(([, t]) => texts.push(t));
  for (const t of texts) if (typeof t !== "string" || BANNED.test(t)) F(`見せる文に書かない言葉か、文でないものがある「${String(t).slice(0, 40)}」`);
  for (const t of texts) if (typeof t === "string" && /。[^「」]*！/.test(t.replace(/「[^」]*」/g, ""))) F(`地の文が叫んでいる「${t.slice(0, 40)}」`);
  // 猟兵頭の名は、名乗る（呼ばれる）出来事より前に出さない
  for (const e of evs) if (!["c8_izra_hunt", "c8_izra_hunt2"].includes(e.id)) for (const t of [e.text, ...outs(e).map((o) => o.text)]) if (t && /ゼルギス/.test(t)) F(`猟兵頭の名が、呼ばれる前の文にある（${e.id}）`);

  // ---------------------------------------------------------------- 決まった流れ
  const st = {}, caps = {};
  D.STATS.forEach((k) => { st[k] = 60; caps[k] = 80; });
  let g = null;
  const start = (loc) => {
    g = loadEngine();
    g.rand = seeded(88);
    g.P = { trophies: {}, graves: [] };
    g.newGame({ cls: "merc", stats: st, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
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
    gigra: ["mountains", "c8_gig_still", ["一杯買う", "連れていく"]],
    valdun: ["mountains", "c8_val_horn", ["羊を囲いに", "連れていく"]],
    gensai: ["yakumo", "c8_gen_fog", ["島の側", "連れていく"]],
    tsuyuha: ["yakumo", "c8_tsu_nap", ["茶碗", "連れていく"]],
    takimaru: ["yakumo", "c8_taki_brawl", ["若者の側", "連れていく"]],
    yurien: ["ruins", "c8_yur_dissect", ["肝を持つ", "連れていく"]],
    ingrid: ["fort", "c8_ing_lots", ["荷運び", "連れていく"]],
    izra: ["mountains", "c8_izra_duel", ["受けて立つ", "連れていく"]],
    anselmo: ["w1_holy", "c8_ans_dig", ["一つ買う", "連れていく"]],
    polf: ["fort", "c8_polf_bell", ["続きをせがむ", "連れていく"]],
  };
  for (const id of mates) if (!FLOWS[id]) F(`${id} の出会いの流れを確かめていない`);
  for (const [id, [loc, ev, steps]] of Object.entries(FLOWS)) {
    start(loc);
    if (!begin(ev)) continue;
    steps.forEach(choose);
    const c = g.c2In(id, g.S);
    if (!c) { F(`${id} が出会いの流れで仲間にならない`); continue; }
    if (c.trait !== P[id].join.trait || c.sex !== P[id].sex || c.who.seed !== "c2:" + id) F(`${id} の仲間の欄が表のままでない`);
    if (!(typeof (g.S.aff || {})[id] === "number" && g.S.aff[id] >= C8[id].aff0)) F(`${id} の好感度が始まりから入っていない：${JSON.stringify(g.S.aff)}`);
  }
  // 好感度の始まり（低い人から）
  start("mountains");
  g.c2Meet("gigra");
  if (g.S.aff.gigra !== C8.gigra.aff0) F(`会ったときの好感度が始まりの数でない：${g.S.aff.gigra}`);
  // 鷹と猟兵頭：加わる → 霧の峠で戦う → 名が分かる
  start("mountains");
  if (begin("c8_izra_duel")) { choose("受けて立つ"); choose("連れていく"); }
  g.S.day += 5;
  if (begin("c8_izra_hunt")) choose("並んで");
  if (!g.S.flags.c8_izra_hunt) F("猟兵頭と戦っても、印（c8_izra_hunt）が立たない");
  // 若い衆の頭：鬼ヶ島の七つの名前
  start("yakumo");
  if (begin("c8_taki_brawl")) { choose("若者の側"); choose("連れていく"); }
  g.S.loc = "onigashima";
  if (begin("c8_taki_oni")) choose("名前を呼ばせる");
  if (!g.S.flags.c8_taki_oni) F("鬼ヶ島の七つの名前の印が立たない");
  // 子どもの姿の婆さまは恋の相手にならない（年経た者でも）
  start("yakumo");
  if (begin("c8_tsu_nap")) { choose("茶碗"); choose("連れていく"); }
  const tsu = g.c2In("tsuyuha", g.S);
  if (!tsu || !g.m10Can) F("婆さまが加わらないか、G.m10Can が無い");
  else if (g.m10Can(tsu)) F("子どもの姿の婆さまが恋の相手になる");

  if (!n) ok(`C8：仲間 ${mates.length}（人でない ${nonHuman.length}・恋の相手 ${love.join("・")}）・周り ${others.length}・出来事 ${evs.length}・名前の札と図鑑と立ち絵`);
};
