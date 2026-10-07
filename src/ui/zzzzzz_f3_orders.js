// F3：戦闘の一行の札（B5）から、仲間への指示を開く。札には、その手番の指示か作戦を小さく出す。
// 指示の組は「その他」の見出しの下の小見出し（F4・u13_menu.js）なので、札を押したら「その他」を開き、その仲間の小見出しまで送る。
// 名前の zzzzzz で、ui.render を包むほかのファイル（b5_party・u13・u19・u21）より後に読ませる。エンジンは読むだけ。レーン B＋U（F3）
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render || !G.f3) return;
  const D = () => G.data;
  function paint(S) {
    if (!S || !S.combat || S.over || !(S.companions || []).length) return;
    const tac = D().F3_TACTICS[G.f3.tactic(S)].name;
    // 札は S.companions の順に並ぶ（B5 の partyEl）。呼び名が重なることがあるので、順で結ぶ
    document.querySelectorAll("#panel .b5party .b5mem:not(.you)").forEach((card, i) => {
      const c = S.companions[i];
      const name = c ? G.f3.label(c, S) : "";
      if (!c || card.classList.contains("down")) return;
      const o = G.f3.orderOf(c);
      let line = card.querySelector(".f3now");
      if (!line) { line = document.createElement("span"); line.className = "f3now fine"; card.append(line); }
      line.textContent = o === "auto" ? `作戦：${tac}` : `指示：${D().F3_ORDERS[o].name}`;
      // 指示は「その他」の見出しの下の小見出し（F4）。見出しを開いて、その仲間の小見出しまで送る
      if (!G.u13 || !G.u13.openCombat) return;
      card.classList.add("f3pick");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `${name}に指示を出す`);
      card.title = "押すと、この仲間への指示を開く（手番は進まない）";
      const go = () => {
        G.u13.openCombat("misc");
        requestAnimationFrame(() => {
          const sub = Array.from(document.querySelectorAll("#panel .u13sub")).find((x) => ((x.querySelector(".u13subt") || {}).textContent || "").startsWith(name));
          if (sub) { sub.scrollIntoView({ block: "nearest" }); const b = sub.querySelector(".act"); if (b) b.focus({ preventScroll: true }); }
        });
      };
      card.onclick = (ev) => { ev.stopPropagation(); go(); }; // 開いた一覧の外を押したら閉じる（u13_menu）に届かないように
      card.onkeydown = (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(); } };
    });
  }
  const base = G.ui.render;
  G.ui.render = (...a) => {
    const r = base(...a);
    try { paint(G.S); } catch (e) { /* 札の飾りに失敗しても、画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
