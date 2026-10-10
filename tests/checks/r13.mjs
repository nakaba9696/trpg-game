// R13（2026-10-11 のプレイレビュー）
// - 振り（src/engine/zzz_r13_fairroll.js）：職業の要の能力値の下支え・合計が低い振りの埋め合わせ（ボーナス点・所持金・薬草）・作成画面の一言・
//   振りの悪い主人公と良い主人公で、序盤の死に方（乱数で遊ぶ 150 回のテストと同じ遊び方）が大きく違わない（tests/r13_rolls.mjs）
// - やり残したこと（src/engine/zzzzzzzzzzzzzzzzzzzz_r13_unfinished.js）：七年目から宿屋と依頼の一覧に出る・「向かう」で旅に出る・
//   八年目から使徒が動き出して町で知らせる・討てば決着（名声・年表・トロフィー）・十年の「その後」に一行・古いセーブ（S.r13 無し）でも動く
import { runRolls, compare } from "../r13_rolls.mjs";

export default ({ fail, loadEngine, seeded }) => {
  let G = loadEngine();
  let D = G.data;
  const f = (m) => fail("R13: " + m);
  const R = D.R13_ROLL, T = D.R13_TODO;
  const cre = G.cre;

  // ---------------------------------------------------------------- 振りの下支え
  G.rand = seeded(1301);
  let lows = 0;
  for (const cls of Object.keys(D.CLASSES)) {
    for (let i = 0; i < 300; i++) {
      const dr = { cls, ageBand: "prime", profile: {}, bonus: {}, rolls: 0 };
      cre.roll(dr, G.rand);
      G.r13.keys(cls).forEach((k, j) => { if (dr.rolled[k] < R.FLOOR[j]) f(`${cls} の ${k} が下支え（${R.FLOOR[j]}）より低い：${dr.rolled[k]}`); });
      if (R.BODY && dr.rolled.体力 < R.BODY) f(`${cls} の体力が ${dr.rolled.体力}（${R.BODY} より下げない）`);
      if (dr.dice[G.r13.keys(cls)[0]] + cre.classMod(cls, G.r13.keys(cls)[0]) !== dr.rolled[G.r13.keys(cls)[0]]) f(`${cls}：ダイスの目と初期値が合わない`);
      const x = dr.r13;
      if (!x) { f(`${cls}：振りに r13 が無い`); break; }
      if (x.lv) {
        lows++;
        if (cre.bonusPoints(dr) < D.BONUS_POINTS + x.pts) f(`${cls}：埋め合わせのボーナス点が足されない`);
        const o = cre.options(Object.assign(dr, { goal: Object.keys(D.GOALS)[0], sex: "女", profile: { name: "テ", age: "20" } }), G.rand);
        if (!o.r13 || o.r13.gold !== x.gold || o.r13.herb !== x.herb) f(`${cls}：冒険に渡す形に埋め合わせが無い（${JSON.stringify(o.r13)}）`);
        const lines = G.r13.creLines(dr);
        if (!lines.some((l) => l.k === "low")) f(`${cls}：低い振りの一言が無い`);
        if (lines.some((l) => /\{|undefined|NaN/.test(l.text))) f(`作成画面の一言に置き換え漏れ：${lines.map((l) => l.text).join("／")}`);
      } else if (cre.r13Options(dr).r13) f(`${cls}：ふつうの振りに埋め合わせが付く`);
    }
  }
  if (lows < 20) f(`低い振りがほとんど出ない（${lows}）`);
  // 冒険を始めると、所持金と薬草が足される
  G.P = { trophies: {}, graves: [] };
  const base = { cls: "merc", stats: cre.quickStats("merc", G.rand).stats, caps: {}, goal: Object.keys(D.GOALS)[0], profile: { name: "テ", sex: "女", age: 20 } };
  G.newGame(Object.assign({}, base));
  const g0 = G.S.gold, h0 = (G.S.inv.herb || 0);
  G.newGame(Object.assign({}, base, { r13: { gold: 30, herb: 2, lv: 2 } }));
  if (G.S.gold !== g0 + 30 || (G.S.inv.herb || 0) !== h0 + 2) f(`埋め合わせが冒険の始めに足されない（金 ${g0}→${G.S.gold}・薬草 ${h0}→${G.S.inv.herb}）`);
  if (!G.S.log.some((l) => /なけなしの備え/.test(l.text || ""))) f("埋め合わせの一行が本文に出ない");

  // ---------------------------------------------------------------- 振りの悪い主人公と良い主人公の序盤
  {
    const H = loadEngine();
    const rows = runRolls(H, { n: 60, steps: 200, policy: "rand", seed0: 13100 });
    const c = compare(rows);
    if (c.lo.dead - c.hi.dead > 0.25) f(`振りの悪い主人公が序盤で死にすぎる（死んだ割合 低い振り ${c.lo.dead}・高い振り ${c.hi.dead}）`);
    if (c.lo.roundsPerFight > c.hi.roundsPerFight * 1.35) f(`振りの悪い主人公の戦いが長すぎる（一戦の手番 ${c.lo.roundsPerFight}・${c.hi.roundsPerFight}）`);
  }

  // ---------------------------------------------------------------- やり残したこと
  G = loadEngine(); D = G.data;
  const Y = G.YEAR_DAYS;
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats("merc", G.rand);
    G.newGame({ cls: "merc", stats, caps, goal: "king", profile: { name: "テスト", sex: "女", age: 24, history: "", personality: "無口" } });
    return G.S;
  };
  const ids = () => G.actions().flatMap((g) => g.list).map((a) => a.id);
  let S = start(1311);
  S.fac = "inn"; S.mode = "fac";
  if (ids().includes("r13list")) f("一年目から宿に「やり残したこと」が出る");
  if (G.q7.list(S).some((e) => e.key === "r13:todo")) f("一年目から依頼の一覧に「やり残したこと」が出る");
  S.day = (T.FROM_YEAR - 1) * Y + 3;
  S.visited.ruins = true;
  if (!ids().includes("r13list")) f("七年目に宿に「やり残したことを数える」が無い");
  const todo = G.r13.todo(S);
  if (!todo.some((t) => t.k === "depth" && t.to === "ruins")) f("入った迷宮の、降り切っていない深みが一覧に無い");
  if (!todo.some((t) => t.k === "region")) f("足を踏み入れていない地方が一覧に無い");
  if (!todo.some((t) => t.k === "trophy")) f("トロフィーの手がかりが一覧に無い");
  if (todo.some((t) => /\{|undefined|NaN/.test(t.text))) f(`一覧に置き換え漏れ：${todo.map((t) => t.text).join("／")}`);
  const q = G.q7.list(S).find((e) => e.key === "r13:todo");
  if (!q || !q.desc.length) f("七年目に依頼の一覧（手帳）に「やり残したこと」が無い");
  let n = S.log.length;
  G.act("r13list");
  if (!S.log.slice(n).some((l) => /^・/.test(l.text || ""))) f("「数える」で本文に一覧が出ない");
  const go = ids().find((id) => id.startsWith("r13go:"));
  if (!go) f("宿に「〇〇へ向かう」が無い");
  else {
    const loc0 = S.loc;
    G.act(go);
    if (S.mode === "fac" || (S.loc === loc0 && !S.travel && !S.event)) f(`「向かう」で旅に出ない（mode=${S.mode} loc=${S.loc}）`);
  }

  // 八年目：使徒が動き出し、町で知らせる。討てば決着
  S = start(1312);
  S.day = (T.STIR_YEAR - 1) * Y + T.STIR_FIRST + 1;
  S.mode = "explore"; S.event = null;
  n = S.log.length;
  G.r13.tick(S);
  const stirred = Object.keys((S.r13 || {}).stir || {});
  if (stirred.length !== 1) f(`八年目に使徒が動き出さない（${stirred.join("・")}）`);
  else {
    if (!S.log.slice(n).some((l) => l.text === T.STIR_HEAD)) f("町で「世の大事」の知らせが出ない");
    if (!S.chronicle.some((c) => c.kind === "world" && /動き出した/.test(c.text))) f("年表に使徒が動き出した行が無い");
    const a = G.e3List().find((x) => x.id === stirred[0]);
    if (G.r13.plan(a).how !== "passive") f(`設定に動く理由の無い使徒が動き出した（${a.id}）`);
    if (!G.r13.todo(S).some((t) => t.stir)) f("動き出した使徒が一覧の頭に無い");
    // 次は間をおいてから
    G.r13.tick(S);
    if (Object.keys(S.r13.stir).length !== 1) f("一日に二体動き出した");
    const fame0 = S.fame;
    S.flags[a.flag] = true;
    G.r13.tick(S);
    G.checkTrophies();
    if (S.r13.settled !== 1 || S.fame <= fame0) f("動き出した使徒を討っても決着にならない");
    if (!G.P.trophies[T.TROPHY_KEY]) f("トロフィー「決着」が付かない");
    if (!/決着/.test(G.r13.epilogueLine(S))) f(`決着の「その後」の一行が無い：${G.r13.epilogueLine(S)}`);
  }
  // 能動の使徒：勝手には動かない。場所を探り続けると、はじめて会う出来事に行き当たる
  {
    const passive = Object.entries(T.APOSTLES).filter(([, p]) => p.how === "passive");
    passive.forEach(([id, p]) => { if (!p.stir || !p.why) f(`受動の使徒 ${id} に知らせの文か根拠が無い`); });
    Object.entries(T.APOSTLES).forEach(([id]) => { if (!D.E3.LIST[id]) f(`使徒の表に無い id：${id}`); });
    S = start(1315);
    S.day = (T.STIR_YEAR - 1) * Y + 10 * T.STIR_GAP; S.mode = "explore";
    for (let i = 0; i < 12; i++) { G.r13.tick(S); S.day += T.STIR_GAP; }
    Object.keys(S.r13.stir).forEach((id) => { if ((T.APOSTLES[id] || {}).how !== "passive") f(`能動の使徒 ${id} が勝手に動き出した`); });
    S = start(1316);
    S.day = (T.FROM_YEAR - 1) * Y + 3; S.loc = "karna"; S.visited.karna = true; S.mode = "explore"; S.event = null;
    const zalve = G.e3List().find((a) => a.id === "zalve");
    if (!/あと\d+回/.test(G.r13.hint(S, zalve))) f(`能動の使徒の手がかりに「あと何回」が無い：${G.r13.hint(S, zalve)}`);
    for (let i = 0; i < (T.APOSTLES.zalve.seek || T.SEEK) && !S.event; i++) { S.event = null; G.r13.seekStep(S, "karna"); }
    const eid = typeof S.event === "string" ? S.event : S.event && S.event.id;
    if (eid !== "e3_meet_zalve") f(`帳場の奥を探り続けても使徒に行き当たらない（${eid}）`);
    S.event = null;
    const lev = G.e3List().find((a) => a.id === "levian");
    S.visited.ruins = true;
    if (!/地下\d+階/.test(G.r13.hint(S, lev))) f(`迷宮の奥の使徒の手がかりに階が無い：${G.r13.hint(S, lev)}`);
  }
  // 十年の引退の「その後」に一行
  S = start(1313);
  S.day = (T.STIR_YEAR - 1) * Y + T.STIR_FIRST + 1; S.mode = "explore";
  G.r13.tick(S);
  S.day = G.r11.endDay(S) + 1; S.mode = "explore"; S.event = null; S.combat = null;
  const act = G.actions().flatMap((g) => g.list).find((a) => !a.disabled && /^(rest|wait|camp|look|explore|fac:)/.test(a.id));
  G.act(act.id);
  const gr = G.P.graves[0];
  if (S.over !== "end" || !gr || !gr.story) f(`十年で引退しない（over=${S.over}）`);
  else if (!gr.story.after.some((p) => /討たれないまま/.test(p))) f("十年の「その後」に、動き出したまま残った使徒の一行が無い");
  // 古いセーブ：S.r13 が無くても
  S = start(1314);
  delete S.r13;
  S.day = (T.FROM_YEAR - 1) * Y + 3; S.fac = "inn"; S.mode = "fac";
  try { G.actions(); G.r13.todo(S); G.q7.list(S); G.r13.tick(S); } catch (e) { f("S.r13 の無い古いセーブで止まる：" + e.message); }
  try { JSON.parse(JSON.stringify(S)); } catch (e) { f("やり残したことのあとのセーブが JSON にできない"); }
};
