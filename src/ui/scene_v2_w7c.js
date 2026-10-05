// 背景の絵（V2）：W7c の町（src/data/locations_w7c.js）。近い絵に、その町だけの物を一つ重ねる（scene_v2_w7.js と同じやり方）
// 古い描き方（scene.js の OUT）にも同じ名前の絵がある。乱数は P.R（G.rand は使わない）。レーン A（絵）と W（場所）
(function (G) {
  const V = G.SV2;
  if (!V) return;
  const OUT = V.OUT;
  const glow = (P, x, y, r, col, a) => { const g = P.ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, V.rgba(col, a)); g.addColorStop(1, V.rgba(col, 0)); P.ctx.fillStyle = g; P.ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  const lit = (P) => P.night || P.dusk;
  const on = (base, extra) => (P) => { if (OUT[base]) OUT[base](P); extra(P); };

  // 塩の島ソルネ：手前の四角い塩田
  OUT.w7_saltpans = on("yakumo", (P) => {
    const { ctx, u, w, h } = P;
    for (let i = 0; i < 6; i++) { ctx.fillStyle = "rgba(244,246,248,.75)"; ctx.fillRect(w * (0.05 + i * 0.15), h - u * 6, w * 0.12, u * 3); }
  });
  // 網の島カラヴ：綱に干した網
  OUT.w7_netisle = on("yakumo", (P) => {
    const { ctx, u, w, hz } = P;
    ctx.strokeStyle = "rgba(58,58,58,.55)"; ctx.lineWidth = Math.max(1, u * 0.15);
    ctx.beginPath(); ctx.moveTo(0, hz + u * 2); ctx.lineTo(w, hz + u * 2); ctx.stroke();
    for (let i = 0; i < 20; i++) { const x = w * (0.03 + i * 0.05); ctx.beginPath(); ctx.moveTo(x, hz + u * 2); ctx.lineTo(x + u, hz + u * 9); ctx.stroke(); }
  });
  // 霧鐘の島ミストラ：崖の上の大きな鐘と霧
  OUT.w7_bellisle = on("port", (P) => {
    const { ctx, u, w, h, hz } = P;
    ctx.fillStyle = "#3a3634"; ctx.beginPath(); ctx.moveTo(w * 0.62, h); ctx.lineTo(w * 0.7, hz - u * 2); ctx.lineTo(w, hz - u * 3); ctx.lineTo(w, h); ctx.fill();
    ctx.fillStyle = "#b08a3a"; ctx.beginPath(); ctx.moveTo(w * 0.82, hz - u * 4); ctx.quadraticCurveTo(w * 0.84, hz - u * 9, w * 0.86, hz - u * 4); ctx.fill();
    ctx.fillStyle = "rgba(232,236,240,.25)"; ctx.fillRect(0, hz, w, h - hz);
  });
  // 真珠採りの島ヨナ：浅い入り江と浜の殻
  OUT.w7_pearls = on("yakumo", (P) => {
    const { ctx, u, w, h, R } = P;
    ctx.fillStyle = "rgba(106,208,200,.3)"; ctx.fillRect(0, h - u * 9, w, u * 4);
    for (let i = 0; i < 20; i++) { ctx.fillStyle = "rgba(240,236,228,.85)"; ctx.beginPath(); ctx.arc(w * (0.1 + R() * 0.8), h - u * (1 + R() * 3), u * 0.5, 0, Math.PI * 2); ctx.fill(); }
  });
  // 井戸の砦町ケルン：真ん中の深い井戸
  OUT.w7_wellfort = on("fort", (P) => {
    const { ctx, u, w, h } = P;
    ctx.fillStyle = "#5a5450"; ctx.beginPath(); ctx.ellipse(w * 0.5, h - u * 4, u * 5, u * 1.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4a3424"; ctx.fillRect(w * 0.5 - u * 4, h - u * 11, u * 0.6, u * 7); ctx.fillRect(w * 0.5 + u * 3.4, h - u * 11, u * 0.6, u * 7); ctx.fillRect(w * 0.5 - u * 4, h - u * 11, u * 8, u * 0.6);
  });
  // 鐘待ちの村リーネ：畑の端の墓地
  OUT.w7_widows = on("w2_farm", (P) => {
    const { ctx, u, w, h } = P;
    ctx.fillStyle = "#6a6460";
    for (let i = 0; i < 14; i++) { const x = w * (0.55 + (i % 7) * 0.06), y = h - u * (9 - Math.floor(i / 7) * 4); ctx.fillRect(x, y, u * 0.6, u * 2); ctx.fillRect(x - u * 0.5, y + u * 0.5, u * 1.6, u * 0.5); }
  });
  // 北の烽火台ヴェルト：三つの烽火と煙
  OUT.w7_beacon = on("fort", (P) => {
    const { ctx, u, w, hz } = P;
    for (const x of [0.2, 0.5, 0.8]) { ctx.fillStyle = "#4a4648"; ctx.fillRect(w * x - u, hz - u * 10, u * 2, u * 10); glow(P, w * x, hz - u * 11, u * 4, "#ffa040", lit(P) ? 0.6 : 0.2); ctx.fillStyle = "rgba(154,154,154,.3)"; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(w * x + k * u, hz - u * (13 + k * 3), u * (1.5 + k), 0, Math.PI * 2); ctx.fill(); } }
  });
  // 最後の村ハルト：山の肩の石の家と、山に背を向けた像
  OUT.w7_lastvillage = on("mountain", (P) => {
    const { ctx, u, w, h } = P;
    for (let i = 0; i < 5; i++) { const x = w * (0.3 + i * 0.09); ctx.fillStyle = "#6a6460"; ctx.fillRect(x, h - u * 10, u * 5, u * 4); ctx.fillStyle = "#3a3434"; ctx.beginPath(); ctx.moveTo(x - u * 0.5, h - u * 10); ctx.lineTo(x + u * 2.5, h - u * 12.5); ctx.lineTo(x + u * 5.5, h - u * 10); ctx.fill(); }
    for (const x of [0.78, 0.82]) { ctx.fillStyle = "#8a8480"; ctx.fillRect(w * x, h - u * 5, u * 0.8, u * 2); ctx.beginPath(); ctx.arc(w * x + u * 0.4, h - u * 5.4, u * 0.6, 0, Math.PI * 2); ctx.fill(); }
  });
  // 峠の庵ザレム：霧の峠の庵と灯り
  OUT.w7_hermitage = on("mountain", (P) => {
    const { ctx, u, w, h } = P;
    ctx.fillStyle = "#5a4a3a"; ctx.fillRect(w * 0.44, h - u * 10, w * 0.12, u * 5);
    ctx.beginPath(); ctx.moveTo(w * 0.42, h - u * 10); ctx.lineTo(w * 0.5, h - u * 14); ctx.lineTo(w * 0.58, h - u * 10); ctx.fill();
    glow(P, w * 0.5, h - u * 7, u * 4, "#ffd08a", lit(P) ? 0.5 : 0.15);
    ctx.fillStyle = "rgba(232,236,240,.28)"; ctx.fillRect(0, h * 0.55, w, h * 0.45);
  });
})(globalThis.G = globalThis.G || {});
