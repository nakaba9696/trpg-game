// Q7：受けている依頼の一覧。ギルドの依頼（S.quests。Q5 の依頼と、それより古い形の依頼）と仲間の頼みごと（C9。S.q9）をまとめて、画面に出す形で返す。
// DOM には触らない（画面は src/ui/q7_quests.js）。G.q5・G.q9 は後で読まれるので、呼ばれたときに見る。
// - 出すのは依頼の名前・依頼主・受けた場所・状態・説明（依頼の説明文と、頼まれたときの言葉の範囲だけ）・報酬（金額は出す）・期限。
//   内部の数（名声・成功率・好感度）と、説明に無い行き先・手順は出さない
// - 報告はどのギルドでもできるので、達成した依頼には「冒険者ギルドへ」と、いちばん近いギルドの町を添える
// - 終わった依頼（この冒険の分）：Q5 の記録（S.q5.log）・古い形の依頼の報告（S.q7done。ここで足す）・仲間の頼みごとの結末
// セーブに足すもの：S.q7done = [{ day, title, r: "ok" }]（古い形の依頼を報告したとき。無くても動く）。レーン C＋U
(function (G) {
  const D = G.data;
  const Q7 = (G.q7 = G.q7 || {});
  Q7.SOON = 2; // 期限まであと何日で「期限が近い」にするか
  Q7.STATE = { active: "進行中", ready: "達成・報告待ち", soon: "期限が近い", late: "期限切れ" };
  Q7.FAILED = ["fail", "lost", "late"];

  const arr = (v) => (Array.isArray(v) ? v : []);
  const lines = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const dateOf = (day) => (G.dateOf ? G.dateOf(day) : `${day}日目`);
  const locName = (id) => (id && D.LOCS[id] ? D.LOCS[id].name : "");

  // 達成した依頼を報告できる、いちばん近いギルドの町（どの町でも報告できる）
  const nearestGuild = (S) => {
    try {
      if (!G.questWays) return "";
      const w = G.questWays(S).find((x) => x.q && x.q.done);
      return w ? locName(w.to) : "";
    } catch { return ""; }
  };

  // ギルドの依頼 1 件
  Q7.guildEntry = (q, S, near) => {
    S = S || G.S;
    const Q5 = G.q5 || {};
    const left = q.deadline != null && typeof S.day === "number" ? q.deadline - S.day : null;
    const state = q.done ? "ready" : left != null && left < 0 ? "late" : left != null && left <= Q7.SOON ? "soon" : "active";
    const type = q.q5 && Q5.type ? Q5.type(q.kind) : null;
    const client = q.client && q.client.name ? q.client.name : "冒険者ギルド";
    const desc = [];
    if (q.desc) desc.push(String(q.desc));
    if (q.tell && !q.done && !q.revealed) desc.push(String(q.tell));
    let progress = "";
    if (q.type === "hunt" && q.need) progress = `${Math.min(q.progress || 0, q.need)}／${q.need}体`;
    return {
      key: "g:" + q.id, src: "guild", kind: type ? type.name : "ギルドの依頼",
      title: String(q.title || "名の無い依頼"), client, from: locName(q.from),
      state, stateLabel: Q7.STATE[state], desc, progress,
      reward: q.reward ? `${q.reward}G${q.item ? "と品物" : ""}` : "",
      deadline: q.deadline != null ? { date: dateOf(q.deadline), left } : null,
      report: q.done ? { where: "冒険者ギルド（どの町でも）", near: near || "" } : null,
    };
  };

  // 仲間の頼みごと（今、頼まれていて、まだ済んでいない段）
  const heard = (S, tid) => !!(S.tk && S.tk.heard && S.tk.heard[tid]);
  const personName = (id, S) => {
    const c = arr(S.companions).find((x) => x && x.c2 === id);
    if (c) return (G.m2Short ? G.m2Short(c) : c.name) || c.name || id;
    const p = (D.C2_PEOPLE || {})[id] || {};
    return p.short || p.name || id;
  };
  const fill9 = (s, id, i, S) => (G.q9 && G.q9.fill ? G.q9.fill(s, id, i, S) : String(s).replace(/\{n\}/g, personName(id, S)).replace(/\{you\}/g, (S.profile && S.profile.name) || "あなた"));
  Q7.mateEntries = (S) => {
    S = S || G.S;
    const out = [];
    const Q9 = D.Q9 || {};
    const all = S.q9 && typeof S.q9 === "object" ? S.q9 : {};
    Object.keys(Q9).forEach((id) => {
      const q = Q9[id];
      if (!q || !arr(q.steps).length) return;
      const st = all[id] || {};
      const n = st.n || 0;
      if (st.end || n >= q.steps.length) return;
      const tid = G.q9 && G.q9.topicId ? G.q9.topicId(id, n) : `q9_${id}_${n + 1}`;
      if (!heard(S, tid)) return;
      const step = q.steps[n] || {};
      const ask = step.ask || {};
      const inParty = arr(S.companions).some((c) => c && c.c2 === id);
      const who = personName(id, S);
      out.push({
        key: "m:" + id, src: "mate", kind: "仲間の頼みごと",
        title: `${q.title}：${ask.title || step.title || ""}`.replace(/：$/, ""), client: who, from: "",
        state: "active", stateLabel: Q7.STATE.active,
        desc: lines(ask.text).map((s) => fill9(s, id, n, S)).concat(inParty ? [] : [`${who}は今、一行にいない。連れて行かないと先へ進まない。`]),
        progress: `${n + 1}／${q.steps.length}段目`, reward: "", deadline: null, report: null,
      });
    });
    return out;
  };

  // 受けている依頼の一覧（報告待ち → 期限が近い → 進行中 → 仲間の頼みごと）
  Q7.list = (S) => {
    S = S || G.S;
    if (!S) return [];
    const qs = arr(S.quests).filter((q) => q && typeof q === "object");
    const near = qs.some((q) => q.done) ? nearestGuild(S) : "";
    const order = { ready: 0, late: 1, soon: 2, active: 3 };
    const guild = qs.map((q) => Q7.guildEntry(q, S, near)).sort((a, b) => order[a.state] - order[b.state] || (a.deadline ? a.deadline.left : 1e9) - (b.deadline ? b.deadline.left : 1e9));
    let mates = [];
    try { mates = Q7.mateEntries(S); } catch { mates = []; }
    return guild.concat(mates);
  };

  // この冒険で終わった依頼（新しい順）。{ title, day, date, result, failed, src }
  Q7.finished = (S) => {
    S = S || G.S;
    if (!S) return [];
    const RES = (G.q5 && G.q5.RES) || { ok: "果たした" };
    const out = [];
    arr(S.q5 && S.q5.log).forEach((x) => { if (x && x.title) out.push({ src: "guild", title: String(x.title), day: x.day || 0, result: RES[x.r] || "終わった", failed: Q7.FAILED.includes(x.r) }); });
    arr(S.q7done).forEach((x) => { if (x && x.title) out.push({ src: "guild", title: String(x.title), day: x.day || 0, result: RES.ok || "果たした", failed: false }); });
    const Q9 = D.Q9 || {};
    Object.entries(S.q9 && typeof S.q9 === "object" ? S.q9 : {}).forEach(([id, st]) => {
      const q = Q9[id];
      if (!q || !st || !st.end) return;
      const e = (q.ends || {})[st.end] || {};
      out.push({ src: "mate", title: `${q.title}（${personName(id, S)}）`, day: st.day || 0, result: e.name ? `結末：${e.name}` : "済んだ", failed: false });
    });
    out.forEach((x) => { x.date = x.day ? dateOf(x.day) : ""; });
    return out.sort((a, b) => b.day - a.day);
  };

  // 報告待ちの数（ボタンの印）
  Q7.readyCount = (S) => arr((S || G.S || {}).quests).filter((q) => q && q.done).length;

  // 押したキーで何をするか（DOM なしでも呼べる）：typing＝文字を打っている所、openDlg＝開いている窓の id、playing＝冒険の画面か
  Q7.keyAction = (ev, typing, openDlg, playing) => {
    if (!ev || ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing || typing) return null;
    if (String(ev.key || "").toLowerCase() !== "q") return null;
    if (openDlg) return openDlg === "dlgQuests" ? "close" : null;
    return playing ? "open" : null;
  };

  // 古い形の依頼（Q5 でないもの）を報告したら、この冒険の「済み」に残す（Q5 の依頼は Q5.record が残す）
  const act0 = G.exploreAct;
  if (act0) {
    G.exploreAct = (head, arg, a) => {
      const S = G.S;
      let q = null;
      if (S && head === "guild" && String(arg).startsWith("report:")) q = arr(S.quests).find((x) => x.id === String(arg).slice(7) && x.done && !x.q5) || null;
      const r = act0(head, arg, a);
      if (q && !arr(S.quests).includes(q)) {
        if (!Array.isArray(S.q7done)) S.q7done = [];
        S.q7done.push({ day: S.day, title: q.title, r: "ok" });
        if (S.q7done.length > 30) S.q7done.shift();
      }
      return r;
    };
  }
})(globalThis.G = globalThis.G || {});
