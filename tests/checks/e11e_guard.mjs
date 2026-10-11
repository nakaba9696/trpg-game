// E11 のあと（持ち主の決定 B）：絶界を持たない使徒の固有の守りの効き目（src/data/zz_e11b_guard.js・src/engine/zz_e3y_e11b_guard.js）
// - 絶界を持たない討伐できる使徒は、みな効き目を一つ持つ。絶界を持つ使徒は持たない
// - 正面（弱らせていない）では強さ 100%、弱点の品・条件と弱らせる出来事をすべてそろえると 0（効き目が消え、broken の一行）
// - 種類ごとに効く：evade は回避・hard は守り・keen は命中が上がる、regen は手番の終わりに HP が戻る、slow は最初の手番が無防備
const PROFILE = { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" };

export default ({ fail, loadEngine, seeded }) => {
  const G0 = loadEngine();
  const D0 = G0.data;
  const FX = D0.E11 && D0.E11.FX;
  if (!FX || !G0.e11Guard) return fail("使徒の守りの効き目（D.E11.FX・G.e11Guard）が無い");
  for (const a of Object.values(D0.E3.LIST).filter((x) => !x.noslay)) {
    const wall = G0.hasWall(a.id);
    if (wall && FX[a.id]) fail(`絶界を持つ ${a.id} に守りの効き目もある`);
    if (!wall && !FX[a.id]) fail(`絶界を持たない ${a.id} に守りの効き目が無い`);
    if (FX[a.id] && !["regen", "evade", "hard", "keen", "slow", "late"].includes(FX[a.id].kind)) fail(`${a.id} の守りの種類 ${FX[a.id].kind} が分からない`);
    if (FX[a.id] && !(FX[a.id].on && FX[a.id].broken)) fail(`${a.id} の守りの文（on・broken）が無い`);
  }

  const fight = (id, all, seed) => {
    const G = loadEngine();
    G.rand = seeded(seed || 1);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    G.data.STATS.forEach((k) => { stats[k] = 60; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { ...PROFILE } });
    G.S.weapon = "mithril";
    G.S.mode = "event";
    const keys0 = G.e3Keys;
    if (all) { if (G.e10Fill) G.e10Fill(G.S); G.e3Keys = (a, s) => keys0(a, s).map((k) => Object.assign(k, { met: true })); }
    else G.data.E3.LIST[id].keys.forEach((k) => { k.test = () => false; });
    G.apply({ e3fight: id });
    G.e3Keys = keys0;
    const f = G.S.combat && G.S.combat.foes.find((x) => G.e3Of(x.id));
    return { G, f };
  };
  const plain = (G, f) => { const g = G.e11Guard; G.e11Guard = () => null; const e = G.foeData(f); G.e11Guard = g; return e; };
  for (const id of Object.keys(FX)) {
    if (!D0.E3.LIST[id] || D0.E3.LIST[id].noslay) continue;
    const x = FX[id];
    // 正面：いっぱいに効く
    {
      const { G, f } = fight(id, false);
      if (!f) { fail(`${id} に挑んでも戦いにならない`); continue; }
      const g = G.e11Guard(f);
      if (!g || g.k !== 1) fail(`${id}: 正面で守りの強さが 100% でない（${g && g.k}）`);
      if (!G.S.log.some((l) => (l.text || "").startsWith(x.on))) fail(`${id}: 挑んだとき守りの一行が出ない`);
      const e = G.foeData(f), e0 = plain(G, f);
      if (x.kind === "evade" && !(e.agi > e0.agi)) fail(`${id}: 霧などの守りで回避が上がらない`);
      if (x.kind === "hard" && !(e.def > e0.def)) fail(`${id}: 砂などの守りで守りが上がらない`);
      if (x.kind === "keen" && !(e.hit > e0.hit)) fail(`${id}: 面などの守りで命中が上がらない`);
      if (x.kind === "slow" && !G.S.combat.exposed) fail(`${id}: 糸などの守りで最初の手番が無防備にならない`);
      if (x.kind === "regen") {
        f.hp = Math.max(1, Math.floor(f.max / 2));
        const hp = f.hp;
        G.S.hp = 9999;
        G.combatAct("guard");
        if (G.S.combat && !(f.hp > hp)) fail(`${id}: 手番の終わりに傷が塞がらない`);
      }
      if (x.kind === "late") {
        G.S.combat.round = x.n + 1;
        const e2 = G.foeData(f);
        if (!(e2.dmg[2] > e0.dmg[2])) fail(`${id}: 数え終わっても一撃が重くならない`);
      }
    }
    // 弱点＋出来事をすべて：効き目が消える
    {
      const { G, f } = fight(id, true);
      if (!f) continue;
      const g = G.e11Guard(f);
      if (!g || g.k !== 0) fail(`${id}: 弱点と出来事をすべてそろえても守りが残る（${g && g.k}）`);
      if (!G.S.log.some((l) => l.text === x.broken)) fail(`${id}: 守りが消えたときの一行が出ない`);
      const e = G.foeData(f), e0 = plain(G, f);
      if (e.agi !== e0.agi || e.def !== e0.def || e.hit !== e0.hit) fail(`${id}: 守りが消えても数値が上がったまま`);
    }
  }
};
