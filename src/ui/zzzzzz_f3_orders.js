// F3：戦闘の一行の札（B5）に、その手番の指示か作戦を小さく出す。
// F8：仲間への指示は、手を決める段のその仲間の番に出す（札から開く指示はやめた）。今の番の札を光らせ、手の欄の上に「〇〇の手を選ぶ n/m」と「一つ前に戻る」。
// 宿の「一行の作戦」（F5）を選んでいる間は、その組を開いたままにする。
// 名前の zzzzzz で、ui.render を包むほかのファイル（b5_party・u13・u19・u21）より後に読ませる。エンジンは読むだけ。レーン B＋U（F3）
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render || !G.f3) return;
  const D = () => G.data;
  function paint(S) {
    if (!S || !S.combat || S.over || !(S.companions || []).length) return;
    // F8：手を決める段で、今は誰の番か（札を光らせ、手の欄の上に「〇〇の手を選ぶ」と戻るボタン）
    const F8 = G.f8;
    const who = F8 && F8.turn ? F8.turn(S) : null;
    const st = F8 && F8.state ? F8.state(S) : null;
    const q = F8 && F8.queue ? F8.queue(S) : [];
    const youCard = document.querySelector("#panel .b5party .b5mem.you");
    if (youCard) youCard.classList.toggle("f8turn", who === "you" && q.length > 0);
    // 札は S.companions の順に並ぶ（B5 の partyEl）。呼び名が重なることがあるので、順で結ぶ
    document.querySelectorAll("#panel .b5party .b5mem:not(.you)").forEach((card, i) => {
      const c = S.companions[i];
      if (!c || card.classList.contains("down")) return;
      card.classList.toggle("f8turn", who === c);
      const o = S.combat.f3ord && S.combat.f3ord[c.id];
      let line = card.querySelector(".f3now");
      if (!line) { line = document.createElement("span"); line.className = "f3now fine"; card.append(line); }
      const manual = q.includes(c);
      line.textContent = o ? `手：${D().F3_ORDERS[o].name}` : manual ? (who === c ? "手を選んでいる" : "手：これから") : `作戦：${D().F3_TACTICS[G.f3.tacticOf(c, S)].name}`;
    });
    // 手の欄の上：誰の番か・何人目か・一つ前に戻る
    const bar = document.querySelector("#panel .u13drawers");
    const old = document.querySelector("#panel .f8who");
    if (old) old.remove();
    if (!who || !q.length || !bar) return;
    const box = document.createElement("div");
    box.className = "f8who";
    const n = who === "you" ? 1 : q.indexOf(who) + 2;
    const name = who === "you" ? "あなた" : G.f3.label(who, S);
    const t = document.createElement("b");
    t.textContent = `${name}の手を選ぶ`;
    const k = document.createElement("span");
    k.className = "num fine";
    k.textContent = ` ${n}/${q.length + 1}`;
    box.append(t, k);
    if (st && st.you != null) {
      const back = document.createElement("button");
      back.type = "button";
      back.className = "btn small f8back";
      back.textContent = "↩ 一つ前に戻る";
      back.onclick = () => { G.act("f8:back"); G.ui.after(); };
      box.append(back);
    }
    const panel = document.getElementById("panel");
    const head = panel && panel.querySelector(".u13main");
    if (head) head.before(box); else bar.before(box);
  }
  const base = G.ui.render;
  let lastWho = null;
  G.ui.render = (...a) => {
    // F8：番が替わったら（あなた → 仲間 → 次の仲間 → あなた）、見出しは最初の使える所から開く
    try {
      const w = G.S && G.S.combat && G.f8 && G.f8.turn ? G.f8.turn(G.S) : null;
      const key = w === "you" ? "you" : w ? w.id : null;
      if (key !== lastWho) { lastWho = key; if (G.u13 && G.u13.resetCombat) G.u13.resetCombat(); }
    } catch (e) { /* 見出しを替えられなくても、選べる */ }
    // F5：宿で作戦を選んでいる間は、その組（「一行の作戦」）を開いたままに（選ぶ一覧に替わると、まとめ方が分類の札に変わることがある）
    try { if (G.S && G.S.f3pick && G.u13 && G.u13.setOpen) G.u13.setOpen({ place: "fac:" + G.S.fac }, "g:一行の作戦"); } catch (e) { /* 開けなくても選べる */ }
    const r = base(...a);
    try { paint(G.S); } catch (e) { /* 札の飾りに失敗しても、画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
