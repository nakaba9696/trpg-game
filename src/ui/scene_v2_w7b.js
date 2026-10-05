// 背景の絵（V2）：W7b の町（src/data/locations_w7b.js）。近い絵に、その町だけの物を一つ重ねる（scene_v2_w7.js と同じやり方）
// 古い描き方（scene.js の OUT）にも同じ名前の絵がある。乱数は P.R（G.rand は使わない）。レーン A（絵）と W（場所）
(function (G) {
  const V = G.SV2;
  if (!V) return;
  const OUT = V.OUT;
  const glow = (P, x, y, r, col, a) => { const g = P.ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, V.rgba(col, a)); g.addColorStop(1, V.rgba(col, 0)); P.ctx.fillStyle = g; P.ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  const lit = (P) => P.night || P.dusk;
  const on = (base, extra) => (P) => { if (OUT[base]) OUT[base](P); extra(P); };

  // 渡しの町リュッセン：手前の川と渡し舟
  OUT.w7_ferry = on("town", (P) => {
    const { ctx, u, w, h } = P;
    ctx.fillStyle = "rgba(42,74,98,.85)"; ctx.fillRect(0, h - u * 7, w, u * 7);
    ctx.fillStyle = "#4a3424"; ctx.beginPath(); ctx.moveTo(w * 0.38, h - u * 5); ctx.lineTo(w * 0.62, h - u * 5); ctx.lineTo(w * 0.58, h - u * 3); ctx.lineTo(w * 0.42, h - u * 3); ctx.fill();
  });
  // 傭兵の町グラッツ：練兵場の柵
  OUT.w7_mercs = on("town", (P) => {
    const { ctx, u, w, h } = P;
    ctx.fillStyle = "#5a4430"; for (let i = 0; i < 18; i++) ctx.fillRect(w * (0.04 + i * 0.054), h - u * 8, u * 0.6, u * 5);
    ctx.fillRect(w * 0.04, h - u * 7, w * 0.92, u * 0.5);
  });
  // 発掘人の町ドゥルム：天幕
  OUT.w7_diggers = on("town", (P) => {
    const { ctx, u, w, h } = P;
    ["#b8a07a", "#a88a5a", "#c8b48a", "#b09468"].forEach((c, i) => { const x = w * (0.12 + i * 0.24); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - u * 5, h - u * 2); ctx.lineTo(x, h - u * 7); ctx.lineTo(x + u * 5, h - u * 2); ctx.fill(); });
  });
  // 葡萄の町ヴィナレ：手前の葡萄の棚と樽
  OUT.w7_vineyard = on("w2_farm", (P) => {
    const { ctx, u, w, h } = P;
    ctx.strokeStyle = "rgba(58,90,26,.9)"; ctx.lineWidth = Math.max(2, u * 0.6);
    for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(0, h - u * (12 - r * 3)); ctx.lineTo(w, h - u * (10 - r * 3)); ctx.stroke(); }
    for (const x of [0.72, 0.78, 0.84]) { ctx.fillStyle = "#6a4024"; ctx.beginPath(); ctx.ellipse(w * x, h - u * 2, u * 2.4, u * 1.8, 0, 0, Math.PI * 2); ctx.fill(); }
  });
  // 巡礼の宿場オルベ：丘の向こうの尖塔
  OUT.w7_pilgrim = on("town", (P) => {
    const { ctx, u, w, hz } = P;
    ctx.fillStyle = "#e8dcb0"; ctx.beginPath(); ctx.moveTo(w * 0.86, hz - u * 12); ctx.lineTo(w * 0.875, hz); ctx.lineTo(w * 0.845, hz); ctx.fill();
  });
  // 写本の町メルヴィ：灯りの並ぶ修道院の窓
  OUT.w7_scriptorium = on("w1_holy", (P) => {
    const { ctx, u, w, hz } = P;
    for (let i = 0; i < 10; i++) { ctx.fillStyle = lit(P) ? "#ffd08a" : "#2a2420"; ctx.fillRect(w * (0.2 + i * 0.06), hz - u * 4, u * 0.8, u * 1.6); }
  });
  // 蝋燭の町リュミエ：窓辺の蝋燭の簾と、灯り
  OUT.w7_candles = on("town", (P) => {
    const { ctx, u, w, h } = P;
    for (let i = 0; i < 24; i++) { ctx.fillStyle = "#f4efe0"; ctx.fillRect(w * (0.06 + i * 0.038), h - u * 12, u * 0.4, u * 3); }
    for (let i = 0; i < 6; i++) glow(P, w * (0.1 + i * 0.16), h - u * 10, u * 8, "#ffd88a", lit(P) ? 0.45 : 0.15);
  });
  // 泉の町セレナ：崖の上の泉
  OUT.w7_spring = on("w3_abbey", (P) => {
    const { ctx, u, w, h } = P;
    ctx.fillStyle = "rgba(74,138,168,.8)"; ctx.beginPath(); ctx.ellipse(w * 0.7, h - u * 5, u * 7, u * 2, 0, 0, Math.PI * 2); ctx.fill();
  });
  // 祈りの浜ノルヴェ：浜の小舟と祠
  OUT.w7_prayerbeach = on("port", (P) => {
    const { ctx, u, w, h } = P;
    ctx.fillStyle = "#d8c8a0"; ctx.fillRect(0, h - u * 5, w, u * 5);
    for (const x of [0.2, 0.34, 0.6]) { ctx.fillStyle = "#4a3424"; ctx.beginPath(); ctx.ellipse(w * x, h - u * 3, u * 5, u * 1.2, 0.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#8a3a2a"; ctx.fillRect(w * 0.9, h - u * 7, u * 3, u * 3.5);
  });
})(globalThis.G = globalThis.G || {});
