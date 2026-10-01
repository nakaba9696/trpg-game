// 獣の病は、疫医ベルナだけが持つ病（M9 #103）。表と文は src/data/m9_plague.js、病の進み方・症状は src/engine/sanity_m5.js（M5）。
// G.m9Infect(how) … ベルナからうつる（how: "fight" 戦いで傷を負った / "event" 出来事で針を刺された）。どこでうつったかを S.m9 に残す
// 出来事の結果の plague（0〜1）を当てはめる。戦いの plague は sanity_m5.js の G.combatAct が見る
// 状態：S.m9 = { from, day }（古いセーブには無い。無くても動く。すでに病にかかっている古いセーブは、そのまま M5 の進み方で進む）
// core.js・explore.js は書き換えず、関数を包む。レーン C（M9）が管理
(function (G) {
  const D = G.data;
  const M = D.M9;

  G.m9Infect = (how) => {
    const S = G.S;
    if (!S || S.over || !G.infect) return;
    const first = !G.beastOf(S);
    const lines = M.INFECT[how] || M.INFECT.event;
    (how === "fight" ? G.note : G.say)(G.pick(lines));
    if (first) S.m9 = { from: how, day: S.day };
    G.infect();
    if (first && !S.over && G.openLore) G.openLore("beast:needle");
  };

  const baseApply = G.apply;
  G.apply = (o) => {
    baseApply(o);
    const S = G.S;
    if (!o || !o.plague || !S || S.over) return;
    if (o.plague >= 1 || G.rand() < o.plague) G.m9Infect("event");
  };
})(globalThis.G = globalThis.G || {});
