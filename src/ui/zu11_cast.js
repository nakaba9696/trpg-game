// U11：仲間の立ち絵は、その仲間が話しているときだけ出す（持ち主：「常に出てるとうるさいかも」）。レーン U（画面）
// （名前の頭の zu は v9_pc.js より後に読ませて、v9.castOf を包むため）
// - 話している：今の手番の記録（最後の「あなた」の行より後）に、その仲間の名前と台詞（「」）の入った行がある。
//   または、その仲間と話している（会話・掛け合いの出来事。S.tk.cur）。掛け合いでは、最後に話した方を前に、もう一人は後ろに控えめに
// - 話し終えたら（次の手番で台詞が無ければ）立ち絵は静かに消える（v9_pc.js の出入りのフェード）
// - 町の人・依頼主など話している相手（v9 の "speaker"）は今まで通り。主人公は出さない・画像の無い人は出さない、も v9 のまま
// - 仲間が誰かは、PC の左上の札（#mbar）の下に名前だけの小さな欄で分かる（話している仲間は明るく）。ステータスの仲間の欄・図鑑の人物では今まで通り絵を見られる
// 画素の処理（v4_assets・v6_monsters）には触らない。出す/出さないだけ。見た目は ui/zu11_cast.css
(function (G) {
  const u11 = (G.u11 = G.u11 || {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  // 仲間の呼び名の候補（「ナタリア」「ガルム・ハイド」なら「ガルム」も）
  u11.compNames = (c) => {
    const out = new Set();
    const add = (n) => { n = String(n || "").trim(); if (n.length >= 2) out.add(n); };
    add(c && c.name);
    add(c && c.name && String(c.name).split(/[・ 　（(]/)[0]);
    const tag = c && G.compTag ? G.compTag(c) : null;
    if (tag) add(tag.name);
    return [...out];
  };
  // 今の手番の記録（最後の「あなた」の行より後）
  u11.turnLines = (S) => {
    const log = (S && S.log) || [];
    let i = log.length - 1;
    while (i >= 0 && log[i].k !== "you") i--;
    return log.slice(i + 1);
  };
  // 話している仲間の id（最後に話した順。同じ人は一度だけ）
  u11.speakingComps = (S) => {
    const comps = (S && S.companions) || [];
    if (!comps.length) return [];
    const order = [];
    const push = (id) => { const k = order.indexOf(id); if (k >= 0) order.splice(k, 1); order.unshift(id); };
    // 会話・掛け合いの出来事の最中は、話している相手
    const cur = S.tk && S.tk.cur;
    if (cur && cur.cid && S.mode === "event" && String(S.event || "").startsWith("tk")) push(cur.cid);
    u11.turnLines(S).forEach((e) => {
      const t = String((e && e.text) || "");
      if (e.k === "you" || e.k === "sys" || !/[「『]/.test(t)) return; // 台詞の無い行（攻撃の記録など）は数えない
      comps.forEach((c) => { if (u11.compNames(c).some((n) => t.includes(n))) push(c.id); });
    });
    return order.filter((id) => comps.some((c) => c.id === id));
  };

  // v9 の立ち絵の並び（v9.castOf）を包む：仲間（"ally"）は話しているときだけ。話している相手がいなければ、話している仲間を前に
  const v9 = G.v9;
  if (v9 && v9.castOf && !v9.castOf.u11) {
    const base = v9.castOf;
    const st = () => G.stand || {};
    const keyOf = (who) => (st().sig && st().sig(who)) || JSON.stringify([who.seed || "", who.kind || "", who.name || ""]);
    v9.castOf = (S) => {
      const list = base(S);
      if (!S) return list;
      const talk = u11.speakingComps(S);
      const byKey = new Map();
      (S.companions || []).forEach((c) => { const who = G.companionWho ? G.companionWho(c) : null; if (who) byKey.set(keyOf(who), c.id); });
      const rank = (c) => talk.indexOf(byKey.get(c.key));
      // 仲間は話しているときだけ。会話の相手（"speaker"）が仲間自身のときも残る（v9 が同じ人を一度だけにしている）
      const out = list.filter((c) => c.role !== "ally" || rank(c) >= 0);
      // 会話の相手（"speaker"）がその仲間自身なら、仲間としては二人目を並べない（表情つきの絵と、ふだんの絵で鍵が違う）
      const sp = out.find((c) => c.role === "speaker");
      const same = (a, b) => !!(a && b && ((a.who.seed && a.who.seed === b.who.seed) || (a.who.name && a.who.name === b.who.name) || (a.tag && b.tag && a.tag.id && a.tag.id === b.tag.id)));
      if (sp) for (let i = out.length - 1; i >= 0; i--) if (out[i].role === "ally" && same(out[i], sp)) out.splice(i, 1);
      if (!out.some((c) => c.role === "speaker")) {
        out.sort((a, b) => rank(a) - rank(b));
        if (out[0] && out[0].role === "ally") out[0] = Object.assign({}, out[0], { role: "speaker", ally: true });
      }
      return out;
    };
    v9.castOf.u11 = true;
  }

  // ---------------------------------------------------------------- 画面：仲間の名前だけの小さな欄（PC の左上の札の中）
  if (typeof document === "undefined") return;
  const ui = G.ui;
  if (!ui || !ui.render) return;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const bar = document.getElementById("mbar");
  const party = h("div", "u11party");
  party.setAttribute("aria-label", "仲間");
  if (bar) {
    const q = bar.querySelector(".u11quick");
    if (q) q.before(party); else bar.append(party);
  }
  function paintParty() {
    const S = G.S;
    party.textContent = "";
    const comps = (S && !S.over && S.companions) || [];
    party.hidden = !comps.length;
    if (!comps.length) return;
    const talk = u11.speakingComps(S);
    party.append(h("span", "u11plab", "仲間"));
    comps.forEach((c) => {
      const tag = G.compTag ? G.compTag(c) : null;
      const chip = h("span", "u11pc" + (talk.includes(c.id) ? " talking" : ""), (tag && tag.name) || c.name);
      chip.title = (tag && tag.label) || `${c.name}（${c.cls || ""}）`;
      party.append(chip);
    });
  }
  const render0 = ui.render;
  ui.render = (...a) => { const r = render0(...a); try { paintParty(); } catch (e) { /* 欄が描けなくても画面は止めない */ } return r; };
})(globalThis.G = globalThis.G || {});
