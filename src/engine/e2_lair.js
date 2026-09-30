// 魔人の居城の迷宮（E2）。場所のデータに lair: { event } があれば、最奥に着いたとき、
// いきなり魔人と戦わせずに謁見の出来事を始める。挑むかどうかは出来事の選択肢で決める
// （絶界を破る剣が無ければ挑む選択肢は出ない。ボス戦は逃げられないので、剣の無い者が詰まないように）。
// 出来事の結果に toEntrance: true があれば、迷宮の入口まで放り出す。
// explore.js は書き換えず、G.exploreAct と G.apply を包む。レーン W（ワールド）が管理
(function (G) {
  const baseAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const L = G.loc();
    if (head === "deeper" && L.lair && S.depth + 1 >= L.floors && !S.flags[L.reward.flag]) {
      G.log("you", S.depth ? "奥へ進む" : "迷宮に入る");
      G.pass(1);
      S.depth = L.floors;
      G.log("title", `${L.name} 地下${S.depth}階`);
      G.startEvent(L.lair.event);
      return;
    }
    baseAct(head, arg, a);
  };

  // 絶界を破る剣を構えているか（出来事の選択肢の cond から使う）
  G.canPierce = () => !!(G.weapon() && G.weapon().pierce);

  const baseApply = G.apply;
  G.apply = (o) => {
    baseApply(o);
    const S = G.S;
    if (o && o.toEntrance && !S.over && G.loc().type === "dungeon") S.depth = 0;
  };
})(globalThis.G = globalThis.G || {});
