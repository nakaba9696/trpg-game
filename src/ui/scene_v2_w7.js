// 背景の絵（V2）：W7 の新しい町（src/data/locations_w7.js）。近い町の絵に、その町だけの物を一つ重ねる。道具は scene_v2.js の G.SV2
// 古い描き方（scene.js の OUT）にも同じ名前の絵がある。土台の絵（fort・port など）は scene_v2_towns.js・scene_v2_w3.js にあり、描くときに V.OUT から引く
// 乱数は場所の名前からの決まった種（P.R。G.rand は使わない）。レーン A（絵）と W（場所）
(function (G) {
  const V = G.SV2;
  if (!V) return;
  const OUT = V.OUT;
  const glow = (P, x, y, r, col, a) => { const g = P.ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, V.rgba(col, a)); g.addColorStop(1, V.rgba(col, 0)); P.ctx.fillStyle = g; P.ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  const lit = (P) => P.night || P.dusk;
  const on = (base, extra) => (P) => { if (OUT[base]) OUT[base](P); extra(P); };

  // 辺境の都ザイグロス：兵舎の塔の鐘
  OUT.w7_frontier = on("fort", (P) => {
    const { ctx, u, w, hz } = P;
    const x = w * 0.84, top = hz - u * 16;
    ctx.fillStyle = P.c("#6a6460", 0.3); ctx.fillRect(x - u * 1.6, top, u * 3.2, u * 16);
    ctx.fillStyle = P.c("#3a3434", 0.3); ctx.beginPath(); ctx.moveTo(x - u * 2.4, top); ctx.lineTo(x, top - u * 3.5); ctx.lineTo(x + u * 2.4, top); ctx.fill();
    ctx.fillStyle = "#c8a040"; ctx.beginPath(); ctx.arc(x, top + u * 1.6, u * 0.8, 0, Math.PI * 2); ctx.fill();
    if (lit(P)) glow(P, x, top + u * 2, u * 6, "#ffb04a", 0.4);
  });
  // 砦の都ブレイナーク：外の壁の高い所の四本の爪の跡
  OUT.w7_clawwall = on("fort", (P) => {
    const { ctx, u, w, hz } = P;
    ctx.strokeStyle = "rgba(20,16,18,.7)"; ctx.lineWidth = Math.max(1.5, u * 0.5); ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) { const x = w * 0.2 + i * u * 2.2; ctx.beginPath(); ctx.moveTo(x, hz - u * 9); ctx.quadraticCurveTo(x + u, hz - u * 5, x - u * 0.5, hz - u * 1); ctx.stroke(); }
    ctx.lineCap = "butt";
  });
  // 監獄の都グリスハイム：窓の小さな塔が何本も
  OUT.w7_prison = on("snowcity", (P) => {
    const { ctx, u, w, hz, R } = P;
    for (let i = 0; i < 4; i++) {
      const x = w * (0.08 + i * 0.27), th = u * (18 + R() * 8);
      ctx.fillStyle = P.c("#4a4a52", 0.5); ctx.fillRect(x - u * 1.8, hz - th, u * 3.6, th);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = lit(P) ? "#ffcc66" : "#141216"; ctx.fillRect(x - u * 0.3, hz - th + u * 2 + k * th * 0.2, u * 0.6, u * 0.9); }
    }
  });
  // 北の港アイゼルヴァン：氷の欠片の浮く灰色の海と、霜
  OUT.w7_icehaven = on("port", (P) => {
    const { ctx, u, w, h, hz, R } = P;
    ctx.fillStyle = "rgba(236,242,250,.55)";
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.ellipse(R() * w, hz + (h - hz) * (0.15 + R() * 0.5), u * (1.5 + R() * 3), u * (0.3 + R() * 0.4), 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(0, 0, w, h);
  });
  // 緑の都エルデンホルム：泉の湯気と弓の的
  OUT.w7_greenvale = on("w3_lake", (P) => {
    const { ctx, u, w, h, hz, R } = P;
    for (let i = 0; i < 6; i++) glow(P, w * (0.2 + R() * 0.6), hz + u * (1 + R() * 3), u * 6, "#ffffff", 0.2);
    for (const x of [0.1, 0.18]) { ctx.fillStyle = "#e8dcc0"; ctx.beginPath(); ctx.arc(w * x, h - u * 8, u * 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#a83a2a"; ctx.beginPath(); ctx.arc(w * x, h - u * 8, u * 0.9, 0, Math.PI * 2); ctx.fill(); }
  });
  // 芸の町サリュエス：広場に張った色とりどりの小旗
  OUT.w7_artstown = on("town", (P) => {
    const { ctx, u, w, hz } = P;
    const cols = ["#c84a3a", "#3a7ac8", "#d8b040", "#5aa04a", "#a04ac8"];
    const y = hz - u * 4;
    ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = Math.max(1, u * 0.15); ctx.beginPath(); ctx.moveTo(w * 0.2, y); ctx.quadraticCurveTo(w * 0.5, y + u * 3, w * 0.8, y); ctx.stroke();
    for (let i = 0; i < 14; i++) { const t = i / 13, x = w * (0.2 + 0.6 * t), yy = y + u * 3 * 4 * t * (1 - t) * 0.5; ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(x - u * 0.8, yy); ctx.lineTo(x + u * 0.8, yy); ctx.lineTo(x, yy + u * 1.8); ctx.fill(); }
  });
  // 隠れ里レヴァンデル：苔の緑と、里の真ん中の切り株
  OUT.w7_mossvillage = on("w2_hunt", (P) => {
    const { ctx, u, w, h } = P;
    ctx.fillStyle = "rgba(58,106,42,.2)"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#5a4030"; ctx.fillRect(w * 0.44, h - u * 9, w * 0.12, u * 5);
    ctx.fillStyle = "#8a6a48"; ctx.beginPath(); ctx.ellipse(w * 0.5, h - u * 9, w * 0.06, u * 1.2, 0, 0, Math.PI * 2); ctx.fill();
  });
  // 灯台の港ヴォルエラ：湾の奥の白い灯台
  OUT.w7_lighthouse = on("port", (P) => {
    const { ctx, u, w, hz } = P;
    const x = w * 0.86, base = hz + u * 2, th = u * 22;
    ctx.fillStyle = P.c("#f2efe6", 0.4); ctx.beginPath(); ctx.moveTo(x - u * 2.2, base); ctx.lineTo(x - u * 1.3, base - th); ctx.lineTo(x + u * 1.3, base - th); ctx.lineTo(x + u * 2.2, base); ctx.fill();
    ctx.fillStyle = "#a83a2a"; ctx.fillRect(x - u * 1.6, base - th - u * 1.6, u * 3.2, u * 1.6);
    glow(P, x, base - th - u, u * (lit(P) ? 14 : 5), "#fff0b0", lit(P) ? 0.6 : 0.3);
  });
})(globalThis.G = globalThis.G || {});
