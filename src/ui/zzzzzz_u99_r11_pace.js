// R11（時間の進み）の画面（R10 の報告書 高 3・低 24）。中身はエンジン（engine/zzzzzzzzzzzzzzzzzzz_r11_pace.js の G.r11）。ui.js は書き換えず、G.ui.render・G.ui.openQuests を包む
//   ・依頼の窓：ギルドの依頼の見出しに「あと n 日」の札。期限が近い（G.r11.SOON 日まで）ものは赤い字で（開かなくても見える）
//   ・旅立つ・冒険の札の印（◆）：期限が近い依頼への道なら赤い字で（エンジンが「急ぎ」と添える）
//   ・旅の途中で襲われた戦いに勝ったとき、「戦いのあと」を閉じるまで、場所の名前は「〇〇への道中」のまま（低 24。エンジンは戦いが終わった時に着いている）
// 見た目は ui/zzzzzz_u99_r11_pace.css。レーン U（R11）
(function (G) {
  const R11 = G.r11;
  if (typeof document === "undefined" || !R11 || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---------------------------------------------------------------- 依頼の窓
  function decorate() {
    const S = G.S, dlg = $("#dlgQuests");
    if (!S || !dlg || !G.q7 || !G.q7.list) return;
    let list = [];
    try { list = G.q7.list(S); } catch { return; }
    dlg.querySelectorAll("details.q7q[data-quest]").forEach((d) => {
      const e = list.find((x) => x.key === d.dataset.quest);
      let chip = d.querySelector(".r11left");
      const left = e && e.deadline && e.state !== "ready" ? e.deadline.left : null;
      if (left == null || left < 0) { if (chip) chip.remove(); return; }
      const top = d.querySelector(".q7qtop");
      if (!chip && top) { chip = h("span", "r11left num"); top.append(chip); }
      if (!chip) return;
      chip.textContent = left === 0 ? "今日まで" : `あと${left}日`;
      chip.classList.toggle("soon", left <= R11.SOON);
    });
  }
  if (ui.openQuests) {
    const open0 = ui.openQuests;
    ui.openQuests = (...a) => { const r = open0(...a); try { decorate(); } catch {} return r; };
  }

  // ---------------------------------------------------------------- 旅の途中の戦いの場所の名前
  let road = null; // { id 冒険, dest 行き先 }
  const ROAD_LABELS = ["#sceneTitle", "#u29where .u29wplace", "#v9place b"];
  function keepRoad(S) {
    if (!S || S.over) { road = null; return; }
    if (S.travel && S.combat) { road = { id: S.id, dest: S.travel }; return; }
    const holding = G.u13 && G.u13.holding ? G.u13.holding() : false;
    if (!road || road.id !== S.id || S.travel || S.loc !== road.dest || !holding) { road = null; return; }
    const T = G.data.LOCS[road.dest];
    if (!T) return;
    ROAD_LABELS.forEach((s) => { const el = $(s); if (el) el.textContent = `${T.name}への道中`; });
  }

  // ---------------------------------------------------------------- 印
  function marks() {
    document.querySelectorAll(".act em.mark").forEach((em) => em.classList.toggle("r11soon", /急ぎ/.test(em.textContent || "")));
  }

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      keepRoad(G.S);
      marks();
      const dlg = $("#dlgQuests");
      if (dlg && dlg.open) decorate();
    } catch { /* 飾りが付かなくても遊びは止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
