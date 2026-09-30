// 魔人の居城の迷宮（E2）。場所のデータに lair: { event } があれば、最奥に着いたとき、
// いきなり魔人と戦わせずに謁見の出来事を始める。挑むかどうかは出来事の選択肢で決める
// （絶界を破る剣が無ければ挑む選択肢は出ない。ボス戦は逃げられないので、剣の無い者が詰まないように）。
// 出来事の結果に toEntrance: true があれば、迷宮の入口まで放り出す。
// 用語説明の書き足し（D.E2_LORE → D.LORE）と、主を倒したあとに M4 の襲来（飢え・疫病）が止まるのもここ。
// explore.js は書き換えず、G.exploreAct と G.apply を包む。レーン W（ワールド）が管理
(function (G) {
  const D = G.data;

  // 用語説明（data は名前順で読まれ、events_e2.js は lore_u3.js より先なので、engine で書き足す）
  Object.entries(D.E2_LORE || {}).forEach(([id, rows]) => {
    const e = D.LORE && D.LORE[id];
    if (e) rows.forEach((r) => { if (!e.lines.some((l) => l[0] === r[0])) e.lines.push(r); });
  });
  // 仕える者に会ったら「使徒」を開く
  if (D.LORE_ON && D.LORE_ON.foe) Object.assign(D.LORE_ON.foe, { e2_marmit: "shito", e2_berna: "shito" });

  // 主を倒したら、その主の襲来（world_events_m4.js の RAIDERS）は起きなくなる
  const STOP = { hunger: "e2_gormoa", rot: "e2_mordu" };
  const RAID = D.M4 && D.M4.RAIDERS;
  Object.entries(STOP).forEach(([k, flag]) => {
    const R = RAID && RAID[k];
    if (!R || typeof R.w !== "function") return;
    const w0 = R.w;
    R.w = (W, day) => (G.S && G.S.flags && G.S.flags[flag] ? 0 : w0(W, day));
  });

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
