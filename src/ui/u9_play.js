// U9：通しで遊んで見つけた分かりにくい所を、元のファイルを書き換えずに包んで直す。レーン U
// - 押せない「〇〇と話す」「尋ね人の貼り紙を見る」に、「今は選べない」ではなく理由（今日はもう済んだ・明日また）を出す
// - 図鑑の「主に会える場所」で、「王都（誘える）」と「王都」が二行になるのを一行にする
// - 旅の途中で襲われたとき、場所の名が出発した町のままなのを「〇〇への道中」にする（S.travel は行き先。戦いが終われば着く）
(function (G) {
  const why0 = G.lockReason;
  if (why0) G.lockReason = (a, S) => {
    const id = String((a && a.id) || "");
    if (a && a.disabled && S) {
      if (id.startsWith("m2talk:")) return "今日はもう話した。明日また話せる";
      if (id === "guild:f4ask") return "今日はもう見た。明日また貼り替わる";
    }
    return why0(a, S);
  };

  const where0 = G.codexPersonWhere;
  if (where0) G.codexPersonWhere = (id, max) => {
    const list = where0(id, 99);
    const out = list.filter((t) => !list.includes(`${t}（誘える）`));
    return out.slice(0, max || 3);
  };

  const ui = G.ui;
  if (ui && ui.render && typeof document !== "undefined") {
    const render0 = ui.render;
    ui.render = (...a) => {
      const r = render0(...a);
      const S = G.S, t = document.getElementById("sceneTitle");
      const T = S && S.travel && S.combat && G.data.LOCS[S.travel];
      if (t && T) t.textContent = `${T.name}への道中`;
      return r;
    };
  }
})(globalThis.G = globalThis.G || {});
