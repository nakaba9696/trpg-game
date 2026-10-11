// T3：トロフィーの画面に四つ目の格「白金」を足す。ui.js の G.ui.openTrophies は書き換えず包む。
// - 並びを 白金 → 金 → 銀 → 銅（取ったものが先）に直す（ui.js の並びは三つの格しか知らない）
// - 「獲得 n / m」の横に、格ごとの数（取った数 / 全部）を出す
// 格の名と順は D.TROPHY_TIERS（src/data/trophies_t3.js）。古い記録の格（表に無いトロフィー）もそのまま並ぶ。見た目は t3_trophy_tiers.css。レーン T＋U
(function (G) {
  const ui = G.ui;
  if (!ui || !ui.openTrophies || typeof document === "undefined") return;
  const D = G.data;
  const open0 = ui.openTrophies;
  ui.openTrophies = (...a) => {
    const r = open0(...a);
    try {
      const tiers = D.TROPHY_TIERS || ["白金", "金", "銀", "銅"];
      const rank = (t) => { const i = tiers.indexOf(t); return i < 0 ? tiers.length : i; };
      const list = document.getElementById("troList");
      if (list) {
        const rows = [...list.children].map((el, i) => {
          const m = el.querySelector(".medal");
          return { el, i, got: !el.classList.contains("locked"), tier: m ? m.textContent : "" };
        });
        rows.sort((a, b) => (b.got - a.got) || (rank(a.tier) - rank(b.tier)) || (a.i - b.i));
        rows.forEach(({ el }) => list.append(el));
      }
      const sum = document.getElementById("troSummary");
      if (sum && G.P) {
        const got = G.P.trophies || {};
        const box = document.createElement("span");
        box.className = "troTiers";
        tiers.forEach((t) => {
          const all = (D.TROPHIES || []).filter((x) => x.tier === t);
          if (!all.length) return;
          const b = document.createElement("b");
          b.className = t;
          b.textContent = `${t} ${all.filter((x) => got[x.key]).length}/${all.length}`;
          box.append(b);
        });
        sum.append(box);
      }
    } catch (e) { /* 並べ替えに失敗しても、ui.js の表はそのまま見える */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
