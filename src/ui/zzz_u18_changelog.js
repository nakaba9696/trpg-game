// U18：版の番号と更新履歴（持ち主の声「そろそろ更新履歴も作ってほしい。0.5.0 くらいで」）
// - タイトル画面の隅に小さく「v0.5.0・更新履歴」。押すと更新履歴の窓
// - 冒険中は右上の「システム」の一覧と、設定の窓（「そのほか」）からも開ける
// - まだ見ていない新しい版があれば、入口に赤い「！」（図鑑と同じ見た目）。見た版はプロフィール（G.P.changelogSeen）に覚える
// タイトルのメニュー（setup.js）・右上の並び（zz_q7_topbar.js）は書き換えず、後から足すだけ（名前の頭の zzz はそれより後に読ませるため）。見た目は ui/zzz_u18_changelog.css。レーン U
(function (G) {
  if (typeof document === "undefined" || !G.changelog) return;
  const D = G.data, CL = G.changelog;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ver = "v" + (D.VERSION || CL.latest());

  // ---------------------------------------------------------------- 窓
  const dlg = h("dialog", "u18log");
  dlg.id = "dlgChangelog";
  dlg.setAttribute("aria-labelledby", "u18logTitle");
  const head = h("div", "dhead");
  const title = h("h2", "", "更新履歴");
  title.id = "u18logTitle";
  const close = h("button", "btn", "閉じる");
  close.type = "button";
  close.onclick = () => dlg.close();
  head.append(title, close);
  const body = h("div", "dbody u18logbody");
  dlg.append(head, body);
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
  document.body.append(dlg);

  function paint() {
    body.textContent = "";
    body.append(h("p", "fine", `今の版：${ver}`));
    CL.published().forEach((e) => {
      const sec = h("section", "u18ver");
      const hd = h("h3", "");
      hd.append(h("span", "u18vno", "v" + e.ver));
      if (e.date) hd.append(h("span", "u18vdate num", e.date));
      const ul = h("ul", "u18items");
      (e.items || []).forEach((t) => ul.append(h("li", "", t)));
      sec.append(hd, ul);
      body.append(sec);
    });
  }
  const entries = []; // 「！」を付ける入口
  const mark = () => { const on = CL.unseen(G.P); entries.forEach((b) => b.classList.toggle("fresh", on)); };
  const open = () => {
    paint();
    if (CL.markSeen(G.P) && G.main && G.main.saveProfile) { try { G.main.saveProfile(); } catch {} }
    mark();
    if (!dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute("open", ""); } }
    body.scrollTop = 0;
  };
  G.ui = G.ui || {};
  G.ui.openChangelog = open;
  const entry = (cls, label, id) => {
    const b = h("button", "btn u18new " + cls, label);
    b.type = "button";
    if (id) b.id = id;
    b.title = "更新履歴";
    b.onclick = (ev) => { ev.stopPropagation(); open(); };
    entries.push(b);
    return b;
  };

  // ---------------------------------------------------------------- タイトル画面の隅
  const corner = entry("u18corner", `${ver}・更新履歴`, "u18TitleVer");
  corner.hidden = true;
  document.body.append(corner);
  const setupEl = $("#setup");
  const syncCorner = () => { corner.hidden = !(setupEl && !setupEl.hidden && setupEl.dataset.step === "title"); mark(); };
  if (setupEl) new MutationObserver(syncCorner).observe(setupEl, { attributes: true, attributeFilter: ["hidden", "data-step"] });

  // ---------------------------------------------------------------- 右上の「システム」の一覧（タイトルへの上）
  const sysBox = $("#q7SystemBox");
  if (sysBox) sysBox.append(entry("u18sys", "更新履歴", "u18SysLog"));
  // 「システム」のボタンにも「！」（一覧を開かなくても分かるように）
  const sysBtn = $("#q7System");
  if (sysBtn) entries.push(sysBtn);

  // ---------------------------------------------------------------- 設定の窓
  const setEntry = entry("u18set", "更新履歴を見る");
  if (G.ui.addSetting) G.ui.addSetting({
    id: "u18changelog", section: "そのほか", kind: "custom",
    render: (box) => { box.append(h("span", "q7setlab", `版 ${ver}`), setEntry); mark(); },
  });

  syncCorner();
})(globalThis.G = globalThis.G || {});
