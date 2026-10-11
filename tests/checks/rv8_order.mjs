// 0.6.0 の再レビュー（docs/review/playreview_2026-10-08.md）の高 2・低 29・中 12：結果を、ダイスや本文より先に漏らさない
// - 高 2：判定で能力値が伸びて節目に届いたとき、節目の行はダイスの行のあと（core.js の G.check。伸びたときに出る行をダイスの行のあとに回す）
//         HP・所持金の札（#mbar）は、本文を順に出している間は押す前の値のまま。得たものの枠が出たとき（無ければ出しきったとき）に今の値へ（ui/zzzzzz_u28_beats.js）
// - 低 29：「勢いのまま、とどめを刺した。」はダメージの行のあと（combat.js の damageFoe が late の行を後ろに回す）
// - 中 12：「戦いのあと」の得た物は、戦いを片づけた所（落とし物を配る直前）から数える（戦闘の中で使った干し肉と、拾った干し肉が打ち消し合わない。ui/u13_battle.js）
import { readFileSync } from "node:fs";

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0("RV8 結果の順：" + m); };
  const read = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const D = G.data;
  const begin = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 15; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "", personality: "無口" } });
    return G.S;
  };

  // ---------------------------------------------------------------- 高 2：節目はダイスのあと
  {
    const S = begin(1);
    const tier = D.F3M.TIERS[0];
    S.stats["筋力"] = tier - 1;
    if (G.f3m && G.f3m.state) G.f3m.state(S);
    S.s5exp = S.s5exp || {};
    S.s5exp["筋力"] = G.s5Need(tier - 1, G.s5Apt("筋力", S)) - 0.01;
    const n = S.log.length;
    const r0 = G.rand;
    G.rand = () => 0.01; // 大成功（伸びる）
    let r;
    try { r = G.check("筋力", 0, "試し"); } finally { G.rand = r0; }
    // 大失敗で正気が削れたときの理由の一行（R11）は、ダイスの行のあとに出てよい
    const added = S.log.slice(n).filter((e) => !(e.k === "sys" && /^正気が削れた──/.test(e.text || "")));
    const di = added.findIndex((e) => e.k === "dice");
    const mi = added.findIndex((e) => /^節目「/.test(e.text || ""));
    if (!(r && r.growth)) fail("判定で能力値が伸びない（測れない）");
    else if (mi < 0) fail(`筋力が ${tier} に届いても節目の行が出ない`);
    else if (!(di >= 0 && di < mi)) fail(`節目の行がダイスの行より先に出る（${added.map((e) => e.k).join(",")}）`);
    if (di >= 0 && !(added[di].growth && added[di].growth[1] === tier)) fail("ダイスの行に伸び（growth）が載らない");
  }
  // 伸びないときは、ダイスの行だけ（ほかの行を動かさない）
  {
    const S = begin(2);
    S.log.push({ k: "sys", text: "前の行" });
    const n = S.log.length;
    const r0 = G.rand;
    G.rand = () => 0.99; // 大失敗（伸びない）
    try { G.check("筋力", 0, "試し"); } finally { G.rand = r0; }
    // 大失敗で正気が削れたときの理由の一行（R11）は、ダイスの行のあとに出てよい
    const added = S.log.slice(n).filter((e) => !(e.k === "sys" && /^正気が削れた──/.test(e.text || "")));
    if (S.log[n - 1].text !== "前の行" || added.length !== 1 || added[0].k !== "dice") fail(`伸びないときの記録が変わる（${added.map((e) => e.k)}）`);
  }

  // ---------------------------------------------------------------- 低 29：とどめはダメージの行のあと
  {
    let seen = 0;
    for (let seed = 10; seed < 60 && !seen; seed++) {
      const S = begin(seed);
      D.STATS.forEach((k) => { S.stats[k] = 40; });
      S.maxHp = S.hp = 999;
      G.startCombat(["goblin"], {});
      const f = S.combat.foes[0];
      f.max = 100; f.hp = 30;
      const n = S.log.length;
      const r0 = G.rand;
      G.rand = () => 0.3;
      try { G.combatAct("attack"); } finally { G.rand = r0; }
      // 大失敗で正気が削れたときの理由の一行（R11）は、ダイスの行のあとに出てよい
    const added = S.log.slice(n).filter((e) => !(e.k === "sys" && /^正気が削れた──/.test(e.text || "")));
      const fi = added.findIndex((e) => /勢いのまま、とどめを刺した/.test(e.text || ""));
      if (fi < 0) { if (S.combat) { S.combat = null; S.mode = "explore"; } continue; }
      seen++;
      const hi = added.findIndex((e) => e.fx === "hit");
      if (!(hi >= 0 && hi < fi)) fail(`「とどめを刺した」がダメージの行より先に出る（${added.map((e) => e.fx || e.k).join(",")}）`);
      const di = added.findIndex((e) => e.fx === "down");
      if (di >= 0 && di < fi) fail("「とどめを刺した」が「倒した」のあとに出る");
      if (added.some((e) => "late" in e)) fail("記録に late の印が残る");
      if (S.combat) { S.combat = null; S.mode = "explore"; }
    }
    if (!seen) fail("とどめの場面が作れない（測れない）");
  }

  // ---------------------------------------------------------------- 中 12・札（画面。DOM が要るので書き方を確かめる）
  {
    const ub = read("ui/u13_battle.js");
    if (!/lootBase = \{ S: G\.S, inv: \{ \.\.\.\(G\.S\.inv \|\| \{\}\) \}, gold: G\.S\.gold \}/.test(ub)) fail("戦いを片づけた所で、持ち物と所持金を覚えていない（得た物が戦闘の中で使った物と打ち消し合う）");
    if (!/u13\.result\(base, S, lastHow\)/.test(ub)) fail("得た物を、戦いを片づけた所から数えていない");
    const u28 = read("ui/zzzzzz_u28_beats.js");
    if (!/\$\("#mbar"\)/.test(u28) || !/releaseBar\(\)/.test(u28) || !/=== "gain"\) releaseBar\(\)/.test(u28)) fail("本文を出している間、HP・所持金の札が押す前の値のまま残らない（得たものの枠で今の値に）");
  }

  if (!bad) ok("RV8 結果の順（節目はダイスのあと・とどめはダメージのあと・得た物は片づけた所から・札は本文のあと）");
};
