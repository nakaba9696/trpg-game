// C17：本運びのヨルカ（src/data/cz_c17_people.js・events_cz_c17.js・zcz_c17_people.js・talk_yorka.js・talk_parts_c17.js・quest_c9_c17.js・c13_bond_c17.js・c15_talk_c17.js）
// - もとシェイラの絵（銀白の髪・眠たげな水色の目・水色の頭巾の外套・白い服・青い石の首飾り・紺のリボン・赤い本）の見た目のタグが、yorka の行に固定されている
// - シェイラとは別人で、王族ではない。15 歳・子どもの姿（childLook）で、恋と結婚の相手にならない（仲間にしても G.m10Can が false・恋の話題が無い）
// - 人物の表・図鑑・名前の札・用語説明・口調・会話の量・型の掛け合いの部品・頼みごと・段の深い話（0〜4）・節目の褒美（最後は効き目のない思い出の品）・予定がそろう
// - 出会いの流れ（長椅子 → 道を聞く → 連れていく）で仲間になり、好感度の始まりが入る。三つの町のどこでも出会える
// - 絵（assets/portraits/yorka.webp）がまだ無くても、出会い・会話・頼みごと・褒美が動く
import { existsSync, readFileSync } from "node:fs";

const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };
const ID = "yorka";

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C17: " + m); };
  const D = G.data;
  const P = D.C2_PEOPLE || {};
  const p = P[ID];
  if (!p) { F("ヨルカが人物の表（C2_PEOPLE）に無い"); return; }

  // ---------------------------------------------------------------- 表
  if (!p.c17 || !p.join) F("c17 の印か、仲間になる欄（join）が無い");
  if (p.name !== "ヨルカ" || P.sheila === p || /シェイラ|姫|王子|王族/.test(p.role + p.full)) F("シェイラと別人の、王族でない人になっていない");
  if (p.age >= 18 || !p.childLook || p.romance || !p.join.noLove) F("15 歳・子どもの姿・恋の相手でない、の印がそろっていない");
  if (!p.who || p.who.seed !== "c2:" + ID) F(`絵（who）の seed が c2:${ID} でない`);
  const c = (D.C17_PEOPLE || {})[ID];
  if (!c || !(c.mix && c.mix.length >= 2) || !c.gap || !c.past || !c.fate || typeof c.aff0 !== "number") F("作った人物の控え（C17_PEOPLE）が足りない");
  for (const l of (c && c.meet) || []) if (!D.LOCS[l]) F(`会う場所 ${l} が無い`);
  for (const s of p.schedule || []) if (!D.LOCS[s.loc]) F(`予定の場所 ${s.loc} が無い`);
  if (!(p.schedule || []).length) F("居場所の予定が無い");
  const q = (D.F2_PEOPLE || {})[ID];
  if (!q || !q.title || (q.lines || []).length !== 2) F("人物図鑑の説明（title・二行）が無い");
  if (!((D.C3_NAMES || {})[ID] || {}).role) F("名前と役職の札が無い");
  if (!((D.K10_VOICE || {})[ID] || {}).tail) F("口調の表（K10）に無い");
  if (!(D.LORE || {}).c17_carrier) F("用語説明「本運び」が無い");
  const loreKeys = new Set(((D.LORE.c17_carrier || {}).lines || []).map((l) => l[0]));
  const srcs = ["cz_c17_people.js", "events_cz_c17.js", "quest_c9_c17.js"].map((f) => readFileSync(new URL("../../src/data/" + f, import.meta.url), "utf8")).join("\n");
  for (const k of loreKeys) if (!srcs.includes(`"c17_carrier:${k}"`)) F(`用語説明「本運び」の ${k} を開く出来事が無い`);

  // ---------------------------------------------------------------- 絵：もとシェイラの絵の見た目を固定
  const pt = JSON.parse(readFileSync(new URL("../../docs/art/portraits.json", import.meta.url), "utf8")).portraits.find((x) => x.id === ID);
  if (!pt) F("立ち絵の一覧（portraits.json）に yorka が無い");
  else {
    if (pt.file !== `assets/portraits/${ID}.webp`) F(`立ち絵のファイル名が ${pt.file}`);
    for (const t of ["white hair", "sleepy eyes", "light blue eyes", "petite", "hooded cloak", "white dress", "blue gem pendant", "navy ribbon"]) if (!pt.identity.includes(t)) F(`見た目（固定）に ${t} が無い`);
    if (!/red/.test(pt.tags) || !/book/.test(pt.tags)) F("手に持つ物（赤い本）のタグが無い");
    if (/princess|adult|1[89] years/.test(pt.identity)) F("見た目に姫・大人のタグが残っている");
    if (Object.keys(pt.variants || {}).length < 4) F("表情の差分が四つ未満");
  }
  const md = readFileSync(new URL("../../docs/art/portraits.md", import.meta.url), "utf8");
  if (!md.includes(`assets/portraits/${ID}.webp`)) F("docs/art/portraits.md に yorka の行が無い（node tools/portraits.mjs）");
  const hasArt = existsSync(new URL(`../../assets/portraits/${ID}.webp`, import.meta.url));

  // ---------------------------------------------------------------- 会話・部品・頼みごと・深い話・褒美
  const T = (D.TALK || {})[ID];
  if (!T) F("会話の表が無い");
  else {
    const kinds = {};
    T.topics.forEach((x) => { kinds[x.kind] = (kinds[x.kind] || 0) + 1; });
    const need = { past: 5, place: 5, event: 5, mate: 3, chat: 2, ask: 2, cold: 2, night: 2, bond: 2 };
    if (T.topics.length < 20) F(`話題が 20 未満：${T.topics.length}`);
    for (const [k, m] of Object.entries(need)) if ((kinds[k] || 0) < m) F(`話題 ${k} が ${m} 未満：${kinds[k] || 0}`);
    if (kinds.love || T.topics.some((x) => x.love)) F("恋の話題がある");
  }
  if (!(D.TALK_PARTS || {})[ID] || D.TALK_PARTS[ID].drink) F("型の掛け合いの部品が無いか、酒を飲む");
  const Q = (D.Q9 || {})[ID];
  if (!Q || Q.steps.length < 3 || Object.keys(Q.ends || {}).length < 2) F("頼みごと（3 段以上・結末 2 つ以上）が無い");
  if (Q && /酒|恋|口づけ|嫁|婿/.test(JSON.stringify(Q))) F("頼みごとに酒か色恋の言葉がある");
  const C15 = (D.C15_TALK || {})[ID];
  for (let k = 0; k <= 4; k++) if (!(C15 && C15[k] && C15[k].title)) F(`段の深い話 ${k} が無い`);
  const B = (D.C13_BOND || {})[ID] || [];
  if (B.length !== 3) F(`節目の褒美が ${B.length} 段（3 段のはず）`);
  const last = B[B.length - 1];
  const keep = last && D.ITEMS[last.item];
  if (!last || last.kind !== "gift" || !keep) F("最後の段の褒美が品でない");
  else {
    if (keep.type !== "key" || !keep.c14keep || keep.price) F("最後の段の品が、効き目のない思い出の品（type key・c14keep・値なし）でない");
    for (const k of ["stats", "bonus", "magic", "def", "dmg", "hit", "hp", "mp"]) if (keep[k] !== undefined) F(`最後の段の品に効き目 ${k} がある`);
    if (!keep.flavor) F("最後の段の品に説明（flavor）が無い");
  }

  // ---------------------------------------------------------------- 遊ぶ：出会いの流れで加わる（絵が無くても動く）
  const st = {}, caps = {};
  D.STATS.forEach((k) => { st[k] = 60; caps[k] = 80; });
  let g = null;
  const start = (loc) => {
    g = loadEngine();
    g.rand = seeded(17);
    g.P = { trophies: {}, graves: [] };
    g.newGame({ cls: "merc", stats: st, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
    g.S.maxHp = g.S.hp = 999;
    g.S.gold = 500;
    g.S.day = 10;
    g.S.loc = loc; g.S.visited[loc] = true;
  };
  const lucky = (f) => { const r = g.rand; g.rand = () => 0.01; try { return f(); } finally { g.rand = r; } };
  const choose = (part) => {
    const S = g.S;
    if (S.mode !== "event") { F(`「${part}」を選ぶときに出来事の中にいない（${S.mode} ${S.event}）`); return; }
    const ch = g.eventChoices().find(({ c }) => g.m2Fill(c.label).includes(part));
    if (!ch) { F(`出来事 ${S.event} に「${part}」が無い`); return; }
    lucky(() => g.act("ev:" + ch.i));
  };
  for (const loc of ["karna", "w1_holy", "leavel"]) {
    start(loc);
    const e = g.data.EVENTS.find((x) => x.id === "c17_yor_bench");
    if (!e || !e.where.includes(loc) || !e.cond(g.S)) { F(`${loc} で出会いの出来事が起きない`); continue; }
    g.startEvent("c17_yor_bench");
    ["手首をつかむ", "旅の道を話して", "連れていく"].forEach(choose);
    const cp = g.c2In(ID, g.S);
    if (!cp) { F(`${loc}: 出会いの流れで仲間にならない`); continue; }
    if (cp.trait !== p.join.trait || cp.who.seed !== "c2:" + ID) F(`${loc}: 仲間の欄が表のままでない`);
    if (typeof (g.S.aff || {})[ID] !== "number") F(`${loc}: 好感度が入っていない`);
    if (g.m10Can && g.m10Can(cp)) F(`${loc}: 恋の相手になれてしまう`);
    if (!JSON.stringify(g.S.lore || {}).includes("c17_carrier")) F(`${loc}: 用語説明「本運び」が開かない`);
  }
  // 好感度の始まり
  start("karna");
  g.c2Meet(ID);
  if (g.S.aff[ID] !== c.aff0) F(`会ったときの好感度が始まりの数でない：${g.S.aff[ID]}`);
  // 会話：話すと一覧が出て、返すと好感度が動く
  start("karna");
  g.c2Join(ID);
  g.S.mode = "explore";
  const cp = g.c2In(ID, g.S);
  if (cp && g.tk && g.tk.open) {
    try {
      g.tk.open(cp);
      if (g.S.mode !== "event") F("話すと会話が始まらない");
    } catch (e) { F(`話すと例外：${e.message}`); }
  }

  ok(`C17：本運びのヨルカ（話題 ${T ? T.topics.length : 0}・頼みごと ${Q ? Q.steps.length : 0} 段 ${Q ? Object.keys(Q.ends).length : 0} 結末・褒美 ${B.length} 段・絵 ${hasArt ? "あり" : "まだ無い（絵なしで動く）"}）${n ? `（${n} 件）` : ""}`);
};
