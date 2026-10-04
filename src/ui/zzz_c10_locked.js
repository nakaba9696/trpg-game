// C10：まだ選べない選択肢をうっすら見せるか（既定は見せる）。このブラウザに覚える。
// 設定の窓（Q7 の G.ui.addSetting。zz_q7_topbar.js）の「遊び」に「選べない選択肢を見せる」を足す（名前の頭の zzz は、それより後に読ませるため）。レーン C（C10）が管理
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
    try { G.ui.addSetting({ id: "c10locked", section: "遊び", label: "選べない選択肢を見せる", hint: "条件を満たしていない選択肢を、うっすら見せて条件を添える", get: () => G.c10.showLocked, set }); } catch {}
  }
})(globalThis.G = globalThis.G || {});
