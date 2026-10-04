// U11：図鑑と地図をいちばん押しやすい所へ・自動で保存したことが分かる印。レーン U（画面）
// （名前の頭の zu は、f2_codex.js（図鑑）・w5_map.js（地図）・v9_pc.js より後に読ませるため）
// - 冒険中は、名前・HP・MP・所持金の帯（#mbar。スマホは上に張り付く帯、PC は左上の札）の下の段に [ステータス][図鑑][地図] を並べる。図鑑には新しい印の赤い「！」
// - 上の道具の列にも「地図」（図鑑の隣。タイトル画面からも開ける）。世界地図は図鑑の窓から外した（w5_map.js）
// - キーの近道：Z で図鑑、M で地図（文字を打っている所・ほかの窓が開いているときは効かない。同じキーで閉じる）
// - 保存は行動のたびに自動（G.main.save）。保存したら帯の右上に「✓ 保存済み」を一瞬出す（prefers-reduced-motion では動かさない）
// 見た目は ui/zu11_quick.css
(function (G) {
  const u11 = (G.u11 = G.u11 || {});
  u11.KEYS = { z: "codex", m: "map" };
  // 押したキーで何をするか（DOM なしでも呼べる。テストはこれを見る）：typing＝文字を打っている所、openDlg＝開いている窓の id
  u11.keyAction = (ev, typing, openDlg) => {
    if (!ev || ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing || typing) return null;
    const what = u11.KEYS[String(ev.key || "").toLowerCase()];
    if (!what) return null;
    const mine = what === "codex" ? "dlgCodex" : "dlgW5Map";
    if (openDlg && openDlg !== mine) return null; // ほかの窓の上では効かない
    return openDlg === mine ? "close" : what;
  };

  if (typeof document === "undefined") return;
  const ui = G.ui;
  if (!ui || !ui.render) return;
  const $ = (q) => document.querySelector(q);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const openCodex = () => { if (G.f2 && G.f2.open) G.f2.open(); };
  const openMap = () => { if (ui.openMap) ui.openMap(); };

  // ---------------------------------------------------------------- 上の道具の列：図鑑の隣に「地図」
  const top = h("button", "btn", "地図");
  top.id = "openMap";
  top.type = "button";
  top.title = "世界地図（M）";
  top.onclick = openMap;
  const cx = $("#openCodex");
  if (cx) { cx.after(top); cx.title = "図鑑（Z）"; } else { const t = $(".top .tools"); if (t) t.append(top); }

  // ---------------------------------------------------------------- 帯の下の段：[ステータス][図鑑][地図]
  const bar = $("#mbar");
  const row = h("div", "u11quick");
  const kbd = (k) => { const e = h("kbd", "u11key", k); e.setAttribute("aria-hidden", "true"); return e; };
  const qb = (id, label, key, fn) => {
    const b = h("button", "btn u11qb");
    b.id = id;
    b.type = "button";
    b.append(h("span", "u11ql", label), kbd(key));
    b.title = `${label}（${key}）`;
    b.onclick = fn;
    return b;
  };
  const codexBtn = qb("u11Codex", "図鑑", "Z", openCodex);
  codexBtn.dataset.codexOpen = ""; // 新しい印（f2_codex.js の F2.markBtn が付ける）
  codexBtn.classList.add("u11main");
  const mapBtn = qb("u11Map", "地図", "M", openMap);
  const saved = h("span", "u11saved", "✓ 保存済み");
  saved.setAttribute("aria-hidden", "true"); // 毎手番の保存を読み上げない（自動で保存されることはステータスの窓に書いてある）
  if (bar) {
    const sheetBtn = $("#openSheet");
    if (sheetBtn) { sheetBtn.classList.add("u11qb"); row.append(sheetBtn); }
    row.append(codexBtn, mapBtn);
    bar.append(row, saved);
    bar.classList.add("u11q");
  }
  if (G.f2 && G.f2.markBtn) G.f2.markBtn();

  // スマホで冒険しているあいだは、上の道具の列の図鑑・地図を隠す（帯の大きいボタンと重ねない）
  const play = $("#play");
  const syncPlay = () => document.body.classList.toggle("u11inplay", !!(play && !play.hidden));
  if (play) new MutationObserver(syncPlay).observe(play, { attributes: true, attributeFilter: ["hidden"] });
  syncPlay();

  // ---------------------------------------------------------------- キーの近道
  document.addEventListener("keydown", (ev) => {
    const t = ev.target;
    const typing = !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)));
    const open = document.querySelector("dialog[open]");
    const a = u11.keyAction(ev, typing, open ? open.id || "?" : null);
    if (!a) return;
    ev.preventDefault();
    if (a === "close") open.close();
    else if (a === "codex") openCodex();
    else openMap();
  });

  // ---------------------------------------------------------------- 保存の印
  let savedT = 0;
  const still = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  u11.showSaved = () => {
    if (!G.S || (play && play.hidden)) return;
    saved.classList.remove("on");
    clearTimeout(savedT);
    // 掛け直しは次のコマの頭で（保存のたびに配置の計算を走らせない。T）
    requestAnimationFrame(() => {
      void saved.offsetWidth;
      saved.classList.add("on");
      clearTimeout(savedT);
      savedT = setTimeout(() => saved.classList.remove("on"), still() ? 1600 : 1500);
    });
  };
  // G.main は main.js（いちばん最後）が作るので、はじめて描くときに包む
  const wrapSave = () => {
    const m = G.main;
    if (!m || !m.save || m.save.u11) return;
    const base = m.save;
    m.save = (...a) => { const r = base(...a); try { u11.showSaved(); } catch {} return r; };
    m.save.u11 = true;
  };
  const render0 = ui.render;
  ui.render = (...a) => { wrapSave(); return render0(...a); };
})(globalThis.G = globalThis.G || {});
