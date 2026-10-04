// U11：仲間の立ち絵は、その仲間が話しているときだけ出す（持ち主：「常に出てるとうるさいかも」）。レーン U（画面）
// （名前の頭の zu は v9_pc.js より後に読ませて、v9.castOf を包むため）
// - 話している：今の手番の記録（最後の「あなた」の行より後）に、その仲間の話し手の印（e.speaker = "comp:<id>"。
//   エンジンの engine/zzzzzzz_u11_speaker.js が台詞に付ける）のある行がある。掛け合いでは、最後に話した方を前に、もう一人は後ろに控えめに
// - 話し終えたら（次の手番で台詞が無ければ）立ち絵は静かに消える（v9_pc.js の出入りのフェード）
// - 主人公は出さない・画像の無い人は出さない、は v9 のまま
// - 仲間が誰かは、PC の左上の札（#mbar）の下に名前だけの小さな欄で分かる（話している仲間は明るく）。ステータスの仲間の欄・図鑑の人物では今まで通り絵を見られる
// - 町の人・依頼主・名のある人（出来事の who・王城の主）も、その人の話し手の印のある台詞が今の手番にあるときだけ（G.u11.whoSpeaks。
//   V5 の G.stand.whoOf と ui.js の小さな額を包む）。名前の照合はしない（話し手を決めるのはエンジンの印だけ）
// 画素の処理（v4_assets・v6_monsters）には触らない。出す/出さないだけ。見た目は ui/zu11_cast.css
(function (G) {
  const u11 = (G.u11 = G.u11 || {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  // 今の手番の記録（最後の「あなた」の行より後）
  u11.turnLines = (S) => {
    const log = (S && S.log) || [];
    let i = log.length - 1;
    while (i >= 0 && log[i].k !== "you") i--;
    return log.slice(i + 1);
  };
  // 今の手番の台詞の話し手（エンジンが記録に付けた印。engine/zzzzzzz_u11_speaker.js）。古い順
  const SPK = (e) => (G.u11sp && G.u11sp.of ? G.u11sp.of(e) : e && e.speaker ? [e.speaker] : []);
  u11.turnSpeakers = (S) => u11.turnLines(S).flatMap(SPK);
  // 話している仲間の id（最後に話した順。同じ人は一度だけ）。印 "comp:<id>" のある台詞があるときだけ
  u11.speakingComps = (S) => {
    const comps = (S && S.companions) || [];
    if (!comps.length) return [];
    const order = [];
    u11.turnSpeakers(S).forEach((k) => {
      const id = /^comp:(.+)$/.exec(k);
      if (!id) return;
      const j = order.indexOf(id[1]);
      if (j >= 0) order.splice(j, 1);
      order.unshift(id[1]);
    });
    return order.filter((id) => comps.some((c) => c.id === id));
  };
  // 今の出来事の人・王城の主が、今の手番に話したか（印 "ev:<出来事>"・"fac:<施設>"、その人の "p:<id>" のある台詞があるときだけ。迷うなら出さない）
  u11.whoSpeaks = (who, S) => {
    if (!who || !S) return false;
    const keys = new Set();
    if (S.mode === "event" && S.event) keys.add("ev:" + S.event);
    if (S.mode === "fac" && S.fac) keys.add("fac:" + S.fac);
    const m = /^(?:c2|v4):(.+)$/.exec(String(who.seed || ""));
    if (m) keys.add("p:" + m[1]);
    return u11.turnSpeakers(S).some((k) => keys.has(k));
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
