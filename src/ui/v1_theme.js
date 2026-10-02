// 明暗の切り替え（V1）：明るい版（羊皮紙）と暗い版（墨色・夜）。
// はじめは端末の設定（prefers-color-scheme）に従う。上のボタン列の「明暗」で切り替え、選んだものを覚える。
// 色はすべて style.css の :root の変数。ここは <html data-theme="light|dark"> を付け外しするだけ。
// 覚える場所は localStorage（使えないときは覚えないだけで動く）。レーン U（画面）が管理
(function (G) {
  const theme = (G.theme = {});
  theme.KEY = "morsveld-theme";
  // 覚えた値を読む。"light" / "dark" 以外（無い・壊れている・読めない）は null（端末の設定に従う）
  theme.load = (storage) => {
    try { const v = storage && storage.getItem(theme.KEY); return v === "light" || v === "dark" ? v : null; } catch { return null; }
  };
  theme.save = (storage, v) => {
    try { if (storage) storage.setItem(theme.KEY, v); return true; } catch { return false; }
  };
  // 今の見た目：選んだものがあればそれ、無ければ端末の設定
  theme.current = (chosen, sysDark) => chosen || (sysDark ? "dark" : "light");
  theme.flip = (v) => (v === "dark" ? "light" : "dark");

  if (typeof document === "undefined" || typeof window === "undefined") return;
  const store = (() => { try { return window.localStorage; } catch { return null; } })();
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const sysDark = () => !!(mq && mq.matches);
  let chosen = theme.load(store);

  const btn = document.createElement("button");
  btn.className = "btn";
  btn.id = "themeBtn";
  btn.type = "button";
  btn.textContent = "明暗";
  function apply() {
    const now = theme.current(chosen, sysDark());
    if (chosen) document.documentElement.dataset.theme = chosen;
    else delete document.documentElement.dataset.theme;
    btn.setAttribute("aria-pressed", String(now === "dark"));
    btn.title = now === "dark" ? "明るい画面にする" : "暗い画面にする";
    btn.setAttribute("aria-label", btn.title);
  }
  btn.onclick = () => {
    chosen = theme.flip(theme.current(chosen, sysDark()));
    theme.save(store, chosen);
    apply();
  };
  if (mq && mq.addEventListener) mq.addEventListener("change", apply);
  theme.set = (v) => { chosen = v === "light" || v === "dark" ? v : null; theme.save(store, chosen || ""); apply(); };
  theme.now = () => theme.current(chosen, sysDark());
  apply();
  const tools = document.querySelector(".top .tools");
  if (tools) tools.prepend(btn);
})(globalThis.G = globalThis.G || {});
