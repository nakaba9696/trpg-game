// A11（雪と湖）：雪の町と湖の町で「景色を眺める」（文は src/data/zz_a11_sights.js の D.A11_SIGHTS）。
// - D.A11_SIGHTS のある町だけ、町の行動の組に一つ出る。一日に一度。時が一つ進み、正気が少し戻る（稼ぎにはならない）
// - 文は天候（雪・霧・雨）→ 季節（冬。晴れの日だけ）→ 時間帯の順に選ぶ。はじめて眺めたときだけ、一度きりの小さな発見と手引きの一行
// - 状態 S.a11sight = { day }（古いセーブには無い。無ければ今日はまだ眺めていない）
// G.exploreActions・G.exploreAct を包む。DOM には触らない。レーン V＋W
(function (G) {
  const D = G.data;
  const A = (G.a11 = G.a11 || {});
  A.SANITY = 3;
  A.sight = (S) => (S && D.A11_SIGHTS && D.A11_SIGHTS[S.loc]) || null;
  A.seenToday = (S) => !!(S && S.a11sight && S.a11sight.day === S.day);
  // 今の空に合う文の候補
  A.lines = (sp, S) => {
    const sky = G.skyAt ? G.skyAt(S.loc, S.day) : { season: "", weather: "" };
    const w = sp.weather && sp.weather[sky.weather];
    if (w && w.length) return w;
    const s = sp.season && sp.season[sky.season];
    if (s && s.length && (sky.weather === "晴" || !sky.weather)) return s;
    return sp.phase[S.phase | 0] || sp.phase[1];
  };

  const actions0 = G.exploreActions;
  G.exploreActions = () => {
    const S = G.S;
    const groups = actions0();
    const sp = A.sight(S);
    if (!sp || S.travel || S.mode !== "explore" || !G.loc || G.loc().type !== "town") return groups;
    const g = groups.find((x) => (x.list || []).some((a) => a.id === "walk")) || groups.find((x) => x.title === G.loc().name);
    if (!g || !g.list) return groups;
    const seen = A.seenToday(S);
    g.list.push({ id: "a11sight", label: sp.label, sub: seen ? "今日はもう眺めた" : "気が晴れる", disabled: seen, kw: ["景色", "眺め", "湖", "雪"] });
    return groups;
  };

  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "a11sight") return act0(head, arg, a);
    const S = G.S;
    const sp = A.sight(S);
    if (!sp || A.seenToday(S)) return;
    S.a11sight = { day: S.day };
    G.log("you", sp.label);
    G.say(G.pick(A.lines(sp, S)));
    const f = sp.first;
    if (f && f.lore) {
      const [id, key] = f.lore.split(":");
      const had = ((G.loreOf ? G.loreOf(S) : S.lore || {})[id] || []).includes(key);
      if (!had) { G.say(f.text); if (G.openLore) G.openLore(f.lore); }
    }
    if (G.addSanity) G.addSanity(A.SANITY);
    G.pass(1);
  };
})(globalThis.G = globalThis.G || {});
