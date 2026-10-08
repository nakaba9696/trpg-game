// C13：図鑑の人物の欄に「受け取ったもの」（好感度の節目の褒美。冒険をまたいで残る）。描くだけ（中身は engine/zzzzzzzzzzzzzzz_c13_bond.js）。
// F4 の差し込み口 F2.personMore を包んで、そのあとに足す。見た目は F4 の節（f2where f4how）と同じ。レーン C＋U（C13）
(function (G) {
  if (typeof document === "undefined") return;
  const F2 = (G.f2 = G.f2 || {});
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const more0 = F2.personMore;
  F2.personMore = (detail, id) => {
    if (more0) more0(detail, id);
    const rec = G.codexPerson && G.codexPerson(id);
    const lines = (rec && rec.c13) || [];
    if (!lines.length) return;
    const s = h("div", "f2where f4how");
    s.append(h("h4", "", "受け取ったもの"));
    const ul = h("ul");
    lines.forEach((t) => ul.append(h("li", "", t)));
    s.append(ul);
    detail.append(s);
  };
})(globalThis.G = globalThis.G || {});
