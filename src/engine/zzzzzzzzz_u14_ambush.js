// U14：会話・出来事・旅のあとに戦闘が始まるときの境目。持ち主の声「道端で会話した後、急に戦闘が始まると、そいつが襲ってきたように見えるので、動作の切り替わりは分かるようにして」
// G.startCombat を一番外から包み（名前の z の数で、ほかの包みより後に読まれる）、戦闘の頭の記録を直す。DOM には触らない。
//   ・出来事・会話・旅の途中から戦闘になったら、「戦闘」の見出しの前に区切りの一行（u14cut。「――そのとき」「旅を続けるうちに」）を入れる
//   ・始まりの一行（D7 の「{foes}が、行く手を塞いだ」など）を、何が襲ってきたかを言う一文に替える（敵の名前を必ず入れる）
//   ・旅の「何者かに襲われた」は、敵の名前にする（「二日の旅の途中、街道の盗賊たちに襲われた。」）
//   ・画面（ui/zu14_scenes.js）のために S.combat.u14cut = { head, line } を残す（古いセーブに無くても動く）
// 乱数は使わない（言い回しは手番で選ぶ）。レーン U（U14）
(function (G) {
  const D = G.data;
  const U14 = (G.u14 = G.u14 || {});
  const pickBy = (list, k) => list[Math.abs(k | 0) % list.length];

  U14.HEAD = { event: "――そのとき", talk: "――そのとき", travel: "旅を続けるうちに" };
  // 敵の呼び名（同じ敵が二体以上なら「〜たち」）。記号付きの名前（ゴブリンA）は使わない
  U14.foeNames = (ids) => {
    const order = [], count = {};
    ids.forEach((id) => { if (!count[id]) order.push(id); count[id] = (count[id] || 0) + 1; });
    return order.map((id) => ((D.ENEMIES[id] || {}).name || id) + (count[id] > 1 ? "たち" : "")).join("と");
  };
  // 何が襲ってきたかの一文。who は出来事の相手（話していた人・魔物）
  U14.attackLine = (ids, who, k) => {
    const names = U14.foeNames(ids);
    if (who && who.kind === "foe" && ids.includes(who.foe)) return pickBy([`${names}が、こちらに向き直った。来る。`, `${names}が、牙をむいた。`], k);
    const human = ids.some((id) => (D.ENEMIES[id] || {}).shape === "humanoid");
    if (human) return pickBy([`${names}が、得物を抜いて向かってきた。`, `${names}が、刃を光らせて躍りかかってきた。`], k);
    return pickBy([`${names}が、襲いかかってきた。`, `${names}が飛び出してきた。まっすぐ、こちらへ。`], k);
  };

  // 出来事を選んでいる間は、その出来事を覚えておく（選んだ結果で戦闘が始まる）
  let ctx = null;
  const choose0 = G.chooseEvent;
  if (choose0) G.chooseEvent = (i) => {
    const S = G.S;
    const e = S && S.event ? D.EVENTS.find((x) => x.id === S.event) : null;
    const prev = ctx;
    ctx = { from: "event", who: e && e.who ? e.who : null };
    try { return choose0(i); } finally { ctx = prev; }
  };

  const start0 = G.startCombat;
  if (!start0) return;
  G.startCombat = (ids, opt) => {
    const S = G.S;
    if (!S) return start0(ids, opt);
    const c = ctx || (S.tk && S.tk.cur ? { from: "talk" } : S.travel ? { from: "travel" } : null);
    const mark = S.log.length ? S.log[S.log.length - 1] : null;
    const r = start0(ids, opt);
    if (c && S.combat && !S.over) { try { U14.cut(S, (S.combat.foes || []).map((f) => f.id), c, mark); } catch (e) { /* 記録の直しに失敗しても戦闘は止めない */ } }
    return r;
  };

  U14.cut = (S, ids, c, mark) => {
    const log = S.log;
    const start = mark ? log.lastIndexOf(mark) + 1 : 0;
    let ti = -1;
    for (let i = log.length - 1; i >= start; i--) if (log[i].k === "title" && log[i].text === "戦闘") { ti = i; break; }
    if (ti < 0) return;
    const k = (S.turn || 0) + ((S.counters && S.counters.kills) || 0);
    const names = U14.foeNames(ids);
    // 旅の「何者かに襲われた」→ 敵の名前
    let named = false, at = ti; // 区切りを入れる所（旅の襲撃なら、襲われた一文の前）
    for (let i = Math.max(0, start - 3); i < ti; i++) {
      const e = log[i];
      if (e.k === "nar" && /何者かに襲われた。$/.test(e.text)) { e.text = e.text.replace("何者か", names); named = true; at = i; }
    }
    const head = U14.HEAD[c.from] || U14.HEAD.event;
    const line = U14.attackLine(ids, c.who, k);
    // 始まりの一行（「戦闘」の見出しの後の、演出の付いていない最初の地の文）を、襲ってきたものを言う一文に
    let mi = -1;
    for (let i = ti + 1; i < log.length; i++) if (log[i].k === "nar" && !log[i].fx) { mi = i; break; }
    if (mi >= 0) log[mi] = { k: "nar", text: line };
    else log.splice(ti + 1, 0, { k: "nar", text: line });
    // 区切りの一行（「戦闘」の見出しの前。旅の襲撃なら、襲われた一文の前）
    log.splice(at, 0, { k: "nar", text: head, u14cut: 1 });
    if (log.length > 240) log.splice(0, log.length - 240);
    S.combat.u14cut = { head, line, from: c.from, named };
  };
})(globalThis.G = globalThis.G || {});
