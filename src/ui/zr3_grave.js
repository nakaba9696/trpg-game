// R3：墓碑と年表に「倒れたわけ」（何に・どんな様子で倒れたか）と「次に試せそうなこと」を、世界の言葉で短く出す。
// 中身はエンジン（engine/zzzzzzzz_r3_first.js の G.r3Clue）。名前の頭の zr3 は、zk_know_l1.js（最期の様子）より後に読ませるため。
// 墓碑の見出しのすぐ下に置く（数の並ぶ「最期の様子」より先に読めるように）。見た目は ui/zr3_grave.css。レーン V＋W（R3）
(function (G) {
  if (typeof document === "undefined") return;
  const ui = G.ui;
  if (!ui || !ui.openChronicle) return;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const base = ui.openChronicle;
  ui.openChronicle = (run, fromEnd) => {
    base(run, fromEnd);
    const old = $("#r3Clue");
    if (old) old.remove();
    const ep = $("#epitaph");
    const c = G.r3Clue && G.r3Clue(run);
    if (!ep || !c || (run.over || run.end) !== "dead") return;
    const box = h("section", "r3clue");
    box.id = "r3Clue";
    box.append(h("h3", "", "倒れたわけ"), h("p", "r3what", c.what));
    if (c.hint) box.append(h("p", "r3hint", c.hint));
    ep.after(box);
  };
})(globalThis.G = globalThis.G || {});
