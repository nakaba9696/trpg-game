// U26：持ち主のレビューから、右の行動列の直し（レーン U）
//   1. 場所が変わったら（町に着いた・施設に入った）、前に開いていた組ではなく、その場所でいちばん使う組を開く。
//      報告できる依頼があれば、その組を開き、報告をその組の先頭に（ギルド）。次に◆（依頼・噂の続き）の付いた組（旅立つ・冒険は除く）。町なら「施設」。ほかは最初の組
//   2. 同じ名前の組（酒場の「教わる」が二つ、など）は一つにまとめる。中身の無い組は出さない（画面の中だけ。エンジンの G.actions は変えない）
//   3. 開いた組の中身が見える数を増やす・戦闘の手が見出しに隠れない・所持金は上の札の一か所に・スマホの上のボタン列は一段に（ui/zzzzzz_u26_review.css）
// u21（zzzzz_u21_side.js）・u13（u13_menu.js）は書き換えず、G.actions・G.u13.plan・G.ui.render を包む（名前の zzzzzz で u21 より後）
(function (G) {
  const U = (G.u26 = G.u26 || {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  U.isReport = (a) => /^guild:report:/.test(String((a && a.id) || "")) || /^報告[：:]/.test(String((a && a.label) || ""));
  // 同じ名前の組を一つに（最初に出た所へ、あとの組の中身を足す）。中身の無い組は落とす。報告は組の先頭へ
  U.tidy = (groups) => {
    const out = [];
    const byTitle = new Map();
    (groups || []).forEach((g) => {
      if (!g || !g.list || !g.list.length) return;
      const t = g.title || "";
      if (t && byTitle.has(t)) { const first = byTitle.get(t); first.list = first.list.concat(g.list); return; }
      const copy = Object.assign({}, g, { list: g.list.slice() });
      if (t) byTitle.set(t, copy);
      out.push(copy);
    });
    out.forEach((g) => { if (g.list.some(U.isReport)) g.list = [...g.list.filter(U.isReport), ...g.list.filter((a) => !U.isReport(a))]; });
    return out;
  };
  // 同じ名前の札（「教わる（片目の老傭兵）」と「教わる（旅の吟遊詩人）」は、どちらも札の名前が「教わる」）を一つの札に。中身の組は並べたまま
  U.mergeTabs = (plan) => {
    if (!plan || !plan.tabs || plan.kind === "combat") return plan;
    const tabs = [];
    plan.tabs.forEach((t) => {
      const same = tabs.find((x) => x.key === t.key || (x.label && x.label === t.label));
      if (same) { same.groups = same.groups.concat(t.groups); same.ids = same.ids.concat(t.ids); }
      else tabs.push(Object.assign({}, t, { groups: t.groups.slice(), ids: t.ids.slice() }));
    });
    return tabs.length === plan.tabs.length ? plan : Object.assign({}, plan, { tabs });
  };
  U.AWAY = ["t:travel", "adv"]; // よそへ行く組
  // 着いたときに開く組の key。plan は U13 の形（tabs[].ids）
  // marks：依頼・噂の続きに関係ある選択肢（◆。G.actMarks）の { id: 言葉 }
  U.preferred = (plan, groups, marks) => {
    if (!plan || !plan.tabs || !plan.tabs.length) return null;
    const acts = (groups || []).flatMap((g) => (g && g.list) || []);
    const rep = acts.filter(U.isReport).map((a) => a.id);
    if (rep.length) { const t = plan.tabs.find((x) => x.ids.some((id) => rep.includes(id))); if (t) return t.key; }
    // 序章の手がかり（f2o。PC では「手がかり」の組。ui/zzzzz_u21_side.js）があれば、それを開く
    { const t = plan.tabs.find((x) => x.key === "o:hint" && x.ids.some((id) => /^f2o:/.test(id))); if (t) return t.key; }
    // ◆は、着いた場所の中の組（報告・人に会う・施設…）だけで優先する。行き先に◆の付いた「旅立つ」「冒険」は開かない（着いたのに宿が見えない。R8 中 13）
    if (marks) { const t = plan.tabs.find((x) => !U.AWAY.includes(x.key) && x.ids.some((id) => marks[id])); if (t) return t.key; }
    const fac = plan.tabs.find((x) => x.key === "t:fac" || x.key === "here");
    return (fac || plan.tabs[0]).key;
  };
  // 場所の印（変わったら、開く組を選び直す）
  U.placeSig = (S) => (S ? [S.loc || "", S.mode === "fac" ? S.fac || "" : S.mode === "explore" ? "" : S.mode || "", S.depth || 0].join("|") : "");

  if (typeof G.actions === "function") {
    const actions0 = G.actions;
    U.actions0 = actions0;
    // 画面だけ（G.ui がある＝ブラウザ）で整える。テスト（DOM なし）では元のまま
    // 戦闘で仲間の手を選んでいる間の「一つ前に戻る」（f8:back）は、手の欄の上の「↩ 一つ前に戻る」だけに（「その他」の組と二重にしない。R8 低 25）
    U.dropBack = (gs) => (gs || []).map((g) => (g && g.list && g.list.some((x) => x.id === "f8:back") ? Object.assign({}, g, { list: g.list.filter((x) => x.id !== "f8:back") }) : g));
    G.actions = (...a) => { const gs = actions0(...a); return typeof document !== "undefined" && G.ui ? U.tidy(G.S && G.S.combat ? U.dropBack(gs) : gs) : gs; };
  }

  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const u13 = G.u13;

  // ---------------------------------------------------------------- 1. 着いたら、その場所でいちばん使う組を開く
  let lastSig = null, arrived = false;
  if (u13 && u13.plan && u13.setOpen) {
    const plan0 = u13.plan;
    u13.plan = (groups, S) => {
      const plan = U.mergeTabs(plan0(groups, S));
      if (arrived && plan && plan.tabs && plan.kind !== "combat") {
        let marks = null;
        try { marks = G.actMarks ? G.actMarks(S, groups) : null; } catch {}
        const key = U.preferred(plan, groups, marks);
        if (key) u13.setOpen(plan, key);
      }
      return plan;
    };
  }
  const base = ui.render;
  ui.render = (...a) => {
    const S = G.S;
    const sig = U.placeSig(S);
    arrived = !!S && sig !== lastSig;
    lastSig = sig;
    try { return base(...a); } finally {
      arrived = false;
      try {
        // 戦闘などで右の列を出していないときは、右の列の印を外す
        const p = document.getElementById("panel");
        if (p && !document.body.classList.contains("u21pc")) p.classList.remove("u21acc");
        // 一つの札にまとめた組（教わる相手が二人など）は、組ごとの見出し（誰に教わるか）を見せる
        if (p) p.querySelectorAll("#u21open, :scope").forEach((box) => {
          const gs = box.querySelectorAll(":scope > .agroup");
          if (box.id === "u21open" && gs.length > 1) gs.forEach((g) => { const t = g.querySelector("h3"); if (t) t.hidden = false; });
        });
      } catch {}
    }
  };
})(globalThis.G = globalThis.G || {});
