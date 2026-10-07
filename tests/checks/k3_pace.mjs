// K3：戦技とスキルを簡単に覚えすぎない（持ち主「野営の稽古でめっちゃスキルを覚えるけど、そんな簡単に覚えないで」）
// - 野営の稽古では新しく覚えない。覚えた戦技の型をなぞると、熟練が少しだけ上がる
// - 訓練場の教官は、名が知られているか依頼をこなした者にだけ稽古をつける（上の技ほど厳しい）。人に教わるのは一度に一つ（しばらく間を空ける）
// - 学院の講義（術）も一度に一つ（持ち主「魔法・スキル・戦技、どれも一緒」）
// - 強敵（ボス・使徒）を倒すと、手にした武器の型に合う戦技を身につけることがある。ギルドの依頼の礼に巻物が付くことがある
// - ランダムに遊んで、一冒険で覚える数が少ない（序盤〜中盤で数個）
export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const G = loadEngine();
  const D = G.data;
  const K = G.k1, X = G.k3;
  if (!K || !X) { fail("G.k1・G.k3 が無い"); return; }
  const SK = D.SKILLS;
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  const start = (cls = "merc", seed = 31, n = 16) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls, stats: st(n), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.gold = 3000; G.S.companions = []; G.S.fame = 0;
    return G.S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const wild = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "wild" && !(D.LOCS[id].pool || []).length) || Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "wild");
  const trainTown = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && (D.LOCS[id].fac || []).includes("train"));

  // ---------------------------------------------------------------- 野営の稽古
  {
    const S = start("merc", 41, 30);
    S.loc = wild; S.mode = "explore";
    const n0 = K.list(S).length;
    G.give("k1s_parry");   // K4：野営の稽古は、その技の巻物か仲間がいるときだけ
    if (acts().some((a) => /^k1camp:k\d_/.test(a.id) && !K.knows(a.id.slice(7)))) fail("野営の稽古に、新しく覚える行動が出る");
    for (let i = 0; i < 40 && !S.over; i++) { S.mode = "explore"; S.combat = null; S.loc = wild; const a = acts().find((x) => x.id === "k1camp:k1_parry"); if (a) G.act(a.id); }
    if (K.list(S).length !== n0) fail(`野営の稽古を重ねたら技が増えた（${n0} → ${K.list(S).length}）`);
    const u = K.uses("k1_parry", S);
    if (!(u >= 1)) fail("覚えた戦技の型をなぞっても熟練が上がらない");
    if (u > 40) fail(`野営の稽古で熟練が上がりすぎる（四十日で ${u}）`);
  }

  // ---------------------------------------------------------------- 訓練場の教官・一度に一つ
  {
    const S = start("merc", 51, 16);
    S.loc = trainTown; S.mode = "fac"; S.fac = "train";
    const row = () => acts().find((x) => x.id === "k1train:k1_twinfang");
    if (!row() || !row().disabled || !/教官/.test(row().sub)) fail(`名も依頼の礼も無いのに教官が稽古をつける（${row() && row().sub}）`);
    S.counters.quests = 2;
    if (!row() || row().disabled) fail(`依頼をこなしても教官が稽古をつけない（${row() && row().sub}）`);
    S.counters.quests = 0; S.fame = 40;
    if (!row() || row().disabled) fail(`名が知られても教官が稽古をつけない（${row() && row().sub}）`);
    const adv = Object.keys(SK).find((id) => SK[id].learn.train && K.advanced(id) && !SK[id].learn.train.towns && !SK[id].learn.train.mark && !K.needMiss(id, S).length);
    if (adv) { const r = acts().find((x) => x.id === "k1train:" + adv); if (!r || !r.disabled) fail(`上の技（${SK[adv].name}）を、駆け出しの名で稽古できる`); }
    let n = 0;
    while (!K.knows("k1_twinfang") && n++ < 12) { S.mode = "fac"; S.fac = "train"; G.act("k1train:k1_twinfang"); }
    if (!K.knows("k1_twinfang")) fail("条件を満たしても、稽古で返し刃を覚えない");
    // 一度に一つ：覚えたあと、しばらく次を教わらない（訓練場・師・仲間）
    S.mode = "fac"; S.fac = "train";
    const next = acts().find((x) => /^k1train:/.test(x.id) && x.id !== "k1train:k1_twinfang");
    if (next && (!next.disabled || !/体に入りきっていない/.test(next.sub))) fail(`覚えた直後に、次の稽古がつけてもらえる（${next.sub}）`);
    if (!(K.lessonWait(S) > 0)) fail("教わったあとの間が数えられていない");
    S.sin = 20;
    S.loc = Object.keys(D.LOCS).find((id) => (D.LOCS[id].fac || []).includes("alley")); S.fac = "alley";
    const t = acts().find((x) => x.id === "k1teach:fence:k1_lockpick" || /^k1teach:fence:/.test(x.id));
    if (t && !t.disabled) fail("覚えた直後に、元締めからも続けて教われる");
    S.day += K.PACE.lesson + 1;
    S.loc = trainTown; S.fac = "train";
    const later = acts().find((x) => /^k1train:/.test(x.id) && !x.disabled);
    if (!later) fail("間を空けても、次の稽古がつけてもらえない");
    // 仲間に習うのも一度に一つ（k2_ のスキルも習える）
    K.state(S).lesson = S.day;
    S.loc = wild; S.mode = "explore"; S.fac = null;
    S.companions = [{ id: "t1", name: "ならず者のベン", cls: "ならず者", power: 40, dmg: 1, desc: "口が悪い", bond: 80 }];
    const c = acts().filter((x) => /^k1comp:/.test(x.id));
    if (!c.length) fail("打ち解けた仲間の「習う」が出ない");
    else if (c.some((x) => !x.disabled)) fail("覚えた直後に、仲間からも続けて習える");
    S.day += K.PACE.lesson + 1;
    const k2 = acts().find((x) => /^k1comp:comp:rogue:k2_/.test(x.id) && !x.disabled);
    if (k2) { G.act(k2.id); const id = k2.id.split(":").pop(); if (!K.knows(id)) fail(`仲間からスキル（${id}）を習えない（id の読み違い）`); }
  }

  // ---------------------------------------------------------------- 学院の講義（術）も一度に一つ
  {
    const S = start("priest", 71, 40);
    S.loc = "zephara"; S.mode = "fac"; S.fac = "academy"; S.gold = 5000;
    const n0 = (S.spells || []).length;
    let n = 0;
    while ((S.spells || []).length === n0 && n++ < 30) {
      S.mode = "fac"; S.fac = "academy";
      const a = acts().find((x) => /^academy:/.test(x.id) && !x.disabled);
      if (!a) break;
      G.act(a.id);
    }
    if ((S.spells || []).length === n0) fail("学院の講義で術を一つも覚えない");
    else {
      S.mode = "fac"; S.fac = "academy";
      const next = acts().filter((x) => /^academy:/.test(x.id) && !/もう覚えて/.test(x.sub || ""));
      if (next.some((x) => !x.disabled)) fail("術を覚えた直後に、次の講義も受けられる");
      else if (next.length && !next.every((x) => /体に入りきっていない/.test(x.sub))) fail(`講義を受けられない理由の添え書きが無い（${next.map((x) => x.sub)}）`);
      S.day += K.PACE.lesson + 1;
      const later = acts().filter((x) => /^academy:/.test(x.id) && !x.disabled);
      if (next.length && !later.length) fail("間を空けても、次の講義を受けられない");
    }
  }

  // ---------------------------------------------------------------- 強敵を倒して身につける
  {
    const boss = Object.keys(D.ENEMIES).find((id) => D.ENEMIES[id].boss && !D.ENEMIES[id].majin);
    let learned = 0, tries = 0;
    for (let seed = 0; seed < 30; seed++) {
      const S = start("merc", 600 + seed, 30);
      S.weapon = "longsword";
      G.startCombat([boss]);
      const n0 = K.list(S).length;
      S.combat.foes.forEach((f) => { f.hp = 1; f.f1i = null; });
      for (let i = 0; i < 6 && S.combat && !S.over; i++) G.act("cb:attack");
      if (S.combat || S.over) continue;
      tries++;
      const got = K.list(S).filter((id) => !(D.SKILL_START.merc || []).includes(id));
      if (K.list(S).length > n0) {
        learned++;
        const id = got[got.length - 1];
        if (K.isArt(id) && !K.styleOk(id, S)) fail(`強敵を倒して、手にした武器に合わない戦技（${SK[id].name}）を覚えた`);
        const line = S.log.find((l) => l.k === "grow" && l.learn === "foe");
        if (!line) fail("強敵から覚えた一行が無い");
      }
    }
    if (tries < 10) fail(`強敵を倒す試しが少ない（${tries}）`);
    else if (!(learned >= tries * 0.2 && learned <= tries * 0.8)) fail(`強敵を倒して覚える見込みが極端（${learned}/${tries}）`);
    // 雑魚では覚えない
    const S = start("merc", 700, 30);
    const n0 = K.list(S).length;
    for (let i = 0; i < 20; i++) { G.startCombat(["goblin"]); S.combat.foes[0].hp = 1; G.act("cb:attack"); S.combat = null; S.mode = "explore"; }
    if (K.list(S).length !== n0) fail("雑魚を倒して技を覚えた");
  }

  // ---------------------------------------------------------------- ランダムに遊んで、覚える数
  {
    const GAMES = 40, STEPS = 500;
    let tot = 0, early = 0;
    for (let g = 0; g < GAMES; g++) {
      G.rand = seeded(1000 + g);
      G.P = { trophies: {}, graves: [], codex: {} };
      const cls = Object.keys(D.CLASSES)[g % 5];
      const stats = {};
      D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; });
      G.newGame({ cls, stats, goal: Object.keys(D.GOALS)[g % 4], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
      if (g % 3 === 0) { G.S.gold = 5000; G.S.fame = 700; }
      const base = (D.SKILL_START[cls] || []).length;
      try {
        for (let step = 0; step < STEPS && !G.S.over; step++) {
          const list = acts().filter((a) => !a.disabled);
          if (!list.length) break;
          G.act(list[Math.floor(G.rand() * list.length)].id);
          if (step === 150) early += K.list(G.S).length - base;
        }
      } catch (e) { fail(`ランダムに遊ぶと例外 ${e.stack || e}`); break; }
      tot += K.list(G.S).length - base;
    }
    const avg = tot / GAMES, avg150 = early / GAMES;
    console.log(`NOTE K3：ランダムに ${GAMES} 回遊んで、一冒険で覚えた戦技とスキル 平均 ${avg.toFixed(1)}（150 手番まで ${avg150.toFixed(1)}）`);
    if (avg > 7) fail(`一冒険で覚える数が多すぎる（平均 ${avg.toFixed(1)}）`);
    if (avg150 > 3) fail(`序盤で覚える数が多すぎる（150 手番まで平均 ${avg150.toFixed(1)}）`);
    if (avg < 0.5) fail(`ほとんど覚えない（平均 ${avg.toFixed(1)}）`);
  }

  if (!bad) ok("覚え方の釣り合い（野営の稽古では覚えない・教官の条件と一度に一つ・強敵から盗む・覚える数）");
};
