// 評判と悪名（M3）を、探索・施設・戦闘につなぐ。explore.js・combat.js は書き換えず、関数を包む。
// 状態と計算は core.js の「国ごとの評判と悪名」、罪の表と出来事は src/data/events_m3.js
// レーン C（コア）が管理
(function (G) {
  const D = G.data;

  // 手配中の町に着いたときの一言（数字ではなく、町の様子で分かるように）
  const ARRIVE_HINTS = [
    "門の衛兵が、手元の紙とあなたの顔を二度見比べた。",
    "掲示板の前に人だかり。あなたが近づくと、なぜか人垣が割れた。",
    "宿の看板娘が、あなたを見るなり奥へ引っ込んだ。",
    "通りの子どもが、あなたを指さして何か叫び、母親に口をふさがれた。",
    "酒場の窓から、誰かがこちらを見て、すぐにカーテンを閉めた。",
  ];

  const baseArrive = G.arrive;
  G.arrive = (dest) => {
    baseArrive(dest);
    const S = G.S;
    if (!S.over && S.mode === "explore" && G.loc().type === "town" && G.wanted()) G.say(G.pick(ARRIVE_HINTS));
  };

  // 衛兵など、殺せば罪になる相手（D.LAWFUL: { 敵 id: 罪の種類 }）。王位を奪う一騎打ちは罪にしない
  const baseStart = G.startCombat;
  G.startCombat = (ids, opt) => {
    opt = opt || {};
    const kind = G.nationOf() && ids.map((id) => (D.LAWFUL || {})[id]).find(Boolean);
    if (kind && !(opt.win && opt.win.title)) opt = Object.assign({}, opt, { win: Object.assign({}, opt.win, { crime: kind }) });
    return baseStart(ids, opt);
  };

  // 裏路地の盗み・イカサマ、王城
  const baseAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "castle" && G.wanted() && arg !== "throne") {
      G.log("you", "王城の門をくぐる");
      S.fac = null;
      G.startEvent((D.M3_CASTLE || {})[S.loc] || "m3_castle");
      return;
    }
    const gold = S.gold;
    baseAct(head, arg, a);
    if (head === "alley" && arg === "steal" && S.gold > gold) G.crime("theft");
    if (head === "alley" && arg === "gamble" && S.gold > gold) G.crime("fraud");
    if (head === "castle" && arg === "knight" && S.title === "騎士") S.titleAt = G.nationOf();
  };

  // 悪名のある者は、城で位を願い出られない（王位を奪うのは力ずくなので別）
  const baseFac = G.facActions;
  G.facActions = () => {
    const g = baseFac();
    if (G.S.fac !== "castle") return g;
    const inf = G.infamyHere();
    const block = G.wanted() ? "手配中" : inf >= 15 ? `悪名 ${inf}。城の者が目を合わせない` : "";
    if (block) g.forEach((grp) => grp.list.forEach((x) => { if (x.id === "castle:knight" || x.id === "castle:lord") { x.disabled = true; x.sub = block; } }));
    return g;
  };
})(globalThis.G = globalThis.G || {});
