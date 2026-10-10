// R11（文章の直し）の画面側：低 28 トロフィーの格ごとの数に「取った数／全部」の見出しを付ける（銅 15/32・銀 7/128 が逆に見えた）。
(function (G) {
  const ui = G.ui;
  if (!ui || !ui.openTrophies || typeof document === "undefined") return;
  const open1 = ui.openTrophies;
  ui.openTrophies = (...a) => {
    const r = open1(...a);
    try {
      document.querySelectorAll("#troSummary .troTiers").forEach((box) => {
        if (box.querySelector(".r11head")) return;
        const head = document.createElement("i");
        head.className = "r11head";
        head.textContent = "格ごとに 取った／全部：";
        box.prepend(head);
        box.title = "格は難しさの印。数の多さではなく、取りにくさで分かれている";
      });
    } catch (e) { /* 見出しが付かなくても表は見える */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
