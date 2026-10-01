// 戦闘で狙う敵を選ぶ（U6）。S.combat.aim = 狙う敵の番号（C.foes の添字）。
// 狙いが倒れたか、選んでいなければ、生きている先頭を狙う（前と同じ）。狙いを替えても手番は進まない。
// combat.js は書き換えず、G.target を包む（成功率・行動・見出しはみな G.target を通る）。古いセーブで aim が無くても動く
(function (G) {
  G.target = () => {
    const C = G.S && G.S.combat;
    if (!C) return undefined;
    const f = C.foes[C.aim];
    return f && f.hp > 0 ? f : G.alive()[0];
  };
  // 狙いを替える。替えられたら true
  G.setAim = (i) => {
    const C = G.S && G.S.combat;
    if (!C || G.S.over) return false;
    const f = C.foes[i];
    if (!f || f.hp <= 0) return false;
    C.aim = i;
    return true;
  };
})(globalThis.G = globalThis.G || {});
