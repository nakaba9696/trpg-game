// U11：仲間の立ち絵は、その仲間が話しているときだけ出す（持ち主：「常に出てるとうるさいかも」）。レーン U（画面）
// （名前の頭の zu は v9_pc.js より後に読ませて、v9.castOf を包むため）
// - 話している：今の手番の記録（最後の「あなた」の行より後）に、その仲間の名前と台詞（「」）の入った行がある。
//   または、その仲間と話している（会話・掛け合いの出来事。S.tk.cur）。掛け合いでは、最後に話した方を前に、もう一人は後ろに控えめに
// - 話し終えたら（次の手番で台詞が無ければ）立ち絵は静かに消える（v9_pc.js の出入りのフェード）
// - 主人公は出さない・画像の無い人は出さない、は v9 のまま
// - 仲間が誰かは、PC の左上の札（#mbar）の下に名前だけの小さな欄で分かる（話している仲間は明るく）。ステータスの仲間の欄・図鑑の人物では今まで通り絵を見られる
// - 町の人・依頼主・名のある人（出来事の who・王城の主）も、その人の台詞が今の手番の記録にあるときだけ（G.u11.whoSpeaks。V5 の G.stand.whoOf と ui.js の小さな額を包む）
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
      comps.forEach((c) => { if (u11.compNames(c).some((n) => u11.outside(t).includes(n))) push(c.id); }); // 台詞の中で名前を呼ばれただけでは話していない
    });
    return order.filter((id) => comps.some((c) => c.id === id));
  };

  // ---------------------------------------------------------------- 町の人・依頼主・名のある人も、話しているときだけ（持ち主：「しゃべってないのにパン屋のグスタフが出てきた」）
  // 人の呼び名の候補：名前そのもの・「パン屋のグスタフ」の「グスタフ」・「国王ヴァレオン」の「ヴァレオン」・札の名前（C3）
  u11.whoNames = (who, S) => {
    const out = new Set();
    const add = (n) => { n = String(n || "").trim(); if (n.length >= 2) out.add(n); };
    if (!who) return [];
    const nm = String(who.name || "");
    add(nm);
    add(nm.split("の").pop());
    add(nm.split(/[・ 　（(]/)[0]);
    add(nm.replace(/^(国王|皇帝|宰相|女王|王女|王子|騎士|司祭|助祭|将軍|隊長)/, ""));
    const tag = G.whoTag ? (() => { try { return G.whoTag(who, S); } catch (e) { return null; } })() : null;
    if (tag) { add(tag.name); add(String(tag.name || "").split(/[・ 　]/)[0]); }
    return [...out];
  };
  // ほかの、名のある人の呼び名（名の無い人の台詞か、別の人の台詞かを見分ける）
  let knownNames = null;
  u11.knownNames = () => {
    if (knownNames) return knownNames;
    const D = G.data || {}, out = new Set();
    const add = (n) => { n = String(n || "").trim(); if (n.length >= 2) out.add(n); };
    Object.values(D.C2_PEOPLE || {}).forEach((p) => { add(p.name); add(String(p.full || "").split(/[・ 　]/)[0]); });
    Object.values(D.F2_PEOPLE || {}).forEach((p) => add(p.name));
    return (knownNames = [...out]);
  };
  const quoted = (e) => e && e.k !== "you" && e.k !== "sys" && /[「『]/.test(String(e.text || ""));
  // 「」『』の外（地の文。話し手が書かれる所）と中（台詞）
  u11.outside = (t) => String(t || "").replace(/「[^」]*」?|『[^』]*』?/g, "　");
  u11.inside = (t) => (String(t || "").match(/「[^」]*」?|『[^』]*』?/g) || []).join("　");
  // その人が今の手番に話したか（迷うなら話していない）
  //   ・台詞（「」）の行の地の文に、その人の名前がある（「……なに」ナタリアは杯から目を上げなかった）
  //   ・名前を書いていない人（出来事の who に name が無い。名前は C3 の札だけで、本文では「娘」などと呼ばれる）は、
  //     台詞の行の地の文に名のある人も仲間も出てこず、台詞の中でもその人の名前が呼ばれていなければ、その人の台詞とみなす
  //   ・名前の付いた人（依頼人「パン屋のグスタフ」・王城の主など）は、地の文に名前があるときだけ。台詞の中で名前を呼ばれただけ・
  //     名前が地の文に出ただけ（台詞の無い行）・依頼主として紐づいているだけ、では出さない
  u11.whoSpeaks = (who, S) => {
    if (!who || !S) return false;
    // 同じ手番に町の描写と出来事が続くときは、出来事の見出し（"title" の行）より後だけを、その人の場面とみなす
    let turn = u11.turnLines(S);
    const t0 = turn.map((e) => e.k).lastIndexOf("title");
    if (t0 >= 0) turn = turn.slice(t0 + 1);
    const lines = turn.filter(quoted).map((e) => String(e.text));
    if (!lines.length) return false;
    const names = u11.whoNames(who, S);
    if (lines.some((t) => names.some((n) => u11.outside(t).includes(n)))) return true;
    if (who.name) return false;
    const others = [...u11.knownNames(), ...((S.companions || []).flatMap((c) => u11.compNames(c)))];
    return lines.some((t) => !others.some((n) => u11.outside(t).includes(n)) && !names.some((n) => u11.inside(t).includes(n)));
  };
  // 話している相手を決める所（V5 の G.stand.whoOf。V5 の大きな立ち絵・V9 の並び・V4 の先読みが使う）を包む
  const st0 = G.stand;
  if (st0 && st0.whoOf && !st0.whoOf.u11) {
    const base = st0.whoOf;
    st0.whoOf = (S) => { const who = base(S); return who && u11.whoSpeaks(who, S) ? who : null; };
    st0.whoOf.u11 = true;
  }

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
      if (G.b5Chip) G.b5Chip(chip, c); // B5：細い HP の棒（ui/b5_party.js）
      party.append(chip);
    });
  }
  // 背景の右上の小さな額（ui.js の paintWho。出来事の人・王城の主）も、その人が話していなければ隠す
  function gateWho() {
    const box = document.getElementById("who");
    if (!box || box.hidden) return;
    const S = G.S;
    const D = G.data || {};
    const e = S && S.mode === "event" && S.event && G.eventWho && D.EVENTS ? D.EVENTS.find((x) => x.id === S.event) : null;
    const who = e ? G.eventWho(e) : S && S.mode === "fac" && !S.combat && G.facWho ? G.facWho(S) : null;
    if (!u11.whoSpeaks(who, S)) box.hidden = true;
  }
  const render0 = ui.render;
  ui.render = (...a) => { const r = render0(...a); try { paintParty(); gateWho(); } catch (e) { /* 欄が描けなくても画面は止めない */ } return r; };
  if (ui.repaint) { const rp0 = ui.repaint; ui.repaint = (...a) => { const r = rp0(...a); try { gateWho(); } catch (e) {} return r; }; }
  window.addEventListener("resize", () => { try { gateWho(); } catch (e) {} }); // ui.js の resize は包む前の repaint を呼ぶので、そのあとに隠し直す
})(globalThis.G = globalThis.G || {});
