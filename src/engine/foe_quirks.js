// 敵の台詞と逃げ方（E1）。敵のデータに lines / fleeAt があれば、戦闘に一言添えたり、途中で逃げ出させたりする。
// combat.js は書き換えず、G.startCombat と G.combatAct を包む。レーン E（敵）が管理
(function (G) {
  const D = G.data;

  const baseStart = G.startCombat;
  G.startCombat = (ids, opt) => {
    baseStart(ids, opt);
    const C = G.S.combat;
    if (!C) return;
    // 同じ種類が並んでも、出会いの台詞は種類ごとに一度だけ
    const seen = {};
    C.foes.forEach((f) => {
      const L = (D.ENEMIES[f.id] || {}).lines;
      if (seen[f.id] || !L || !(L.open || []).length) return;
      seen[f.id] = true;
      G.say(G.pick(L.open));
    });
  };

  const baseAct = G.combatAct;
  G.combatAct = (arg) => {
    baseAct(arg);
    const S = G.S;
    const C = S.combat;
    if (S.over || !C || S.mode !== "combat") return;
    // 深手を負った臆病者は逃げ出す。逃げた敵は倒したことにならず、金も落とし物も残さない
    G.alive().forEach((f) => {
      const e = D.ENEMIES[f.id];
      if (!e.fleeAt || e.boss || f.hp > f.max * e.fleeAt || G.rand() >= 0.6) return;
      G.say(e.lines && e.lines.flee ? e.lines.flee : `${f.name}は逃げていった。`);
      C.foes.splice(C.foes.indexOf(f), 1);
    });
    if (!G.alive().length) { G._endCombat("win"); return; }
    // ときどき一言
    const talkers = G.alive().filter((f) => ((D.ENEMIES[f.id].lines || {}).turn || []).length);
    if (talkers.length && G.rand() < 0.35) G.note(G.pick(D.ENEMIES[G.pick(talkers).id].lines.turn));
  };
})(globalThis.G = globalThis.G || {});
