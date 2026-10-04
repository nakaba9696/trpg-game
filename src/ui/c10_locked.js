// C10：まだ選べない選択肢をうっすら見せるか（既定は見せる）。このブラウザに覚える。
// 設定の窓（Q7 の G.ui.addSetting）があれば、そこに「選べない選択肢を見せる」を足す。レーン C（C10）が管理
(function (G) {
  if (!G.c10 || typeof document === "undefined") return;
  const KEY = "morsveld-c10-locked";
  try { if (localStorage.getItem(KEY) === "0") G.c10.showLocked = false; } catch {}
  const set = (on) => {
    G.c10.showLocked = !!on;
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
    if (G.ui && G.ui.render && G.S) G.ui.render();
  };
  G.c10.setShowLocked = set;
  if (G.ui && typeof G.ui.addSetting === "function") {
    try { G.ui.addSetting({ id: "c10locked", label: "選べない選択肢を見せる", get: () => G.c10.showLocked, set }); } catch {}
  }
})(globalThis.G = globalThis.G || {});
