// 背景の絵（V2）：W4 の場所（src/data/locations_w4.js）。道具は scene_v2.js の G.SV2。古い描き方（scene.js の OUT・IN）にも同じ名前の絵がある
// 鉱山の都カースヴェルグ・市の都ヴァルミリア・古い鉄の道・水の都トゥリエル・沈黙の森・鐘の見張り塔・断界の古関・天蓋の原
// 乱数は場所の名前からの決まった種（G.rand は使わない）。レーン A（絵）と W（場所）
(function (G) {
  const V = G.SV2;
  if (!V) return;
  const { mix, rgba, lerp } = V;
  const OUT = V.OUT, IN = V.IN;

  // 二本の鉄の道（手前から消失点へ）
  function rails(P, x0, y0, x1, y1, wb, wt, d) {
    const { ctx } = P;
    ctx.strokeStyle = P.dark("#5a4a3a", d, 0.3); ctx.lineWidth = Math.max(1, P.u * 0.5);
    for (let t = 0; t <= 1.001; t += 0.08) { const x = lerp(x0, x1, t), y = lerp(y0, y1, t), half = lerp(wb, wt, t) * 0.62; ctx.beginPath(); ctx.moveTo(x - half, y); ctx.lineTo(x + half, y); ctx.stroke(); }
    ctx.strokeStyle = P.lit("#8a7a68", d, 0.3); ctx.lineWidth = Math.max(1, P.u * 0.35);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x0 + (s * wb) / 2, y0); ctx.lineTo(x1 + (s * wt) / 2, y1); ctx.stroke(); }
  }
  // 錆びた台車
  function cart(P, x, base, s, d) {
    const { ctx } = P;
    ctx.fillStyle = P.c("#5a3a28", d); ctx.beginPath(); ctx.moveTo(x - s, base - s * 0.9); ctx.lineTo(x + s, base - s * 0.9); ctx.lineTo(x + s * 0.8, base - s * 0.25); ctx.lineTo(x - s * 0.8, base - s * 0.25); ctx.fill();
    ctx.fillStyle = P.lit("#7a5038", d, 0.25); ctx.fillRect(x - s, base - s * 0.95, s * 2, s * 0.12);
    ctx.fillStyle = P.dark("#2a2018", d, 0.3); for (const k of [-0.5, 0.5]) { ctx.beginPath(); ctx.arc(x + k * s, base - s * 0.2, s * 0.22, 0, Math.PI * 2); ctx.fill(); }
    if (P.season === "winter") { ctx.fillStyle = P.lit("#f2f6fb", d, 0.2); ctx.beginPath(); ctx.ellipse(x, base - s * 0.95, s, s * 0.18, 0, Math.PI, 0); ctx.fill(); }
  }
  // 坑口（山肌の黒い口と木の枠）
  function adit(P, x, base, s, d) {
    const { ctx } = P;
    ctx.fillStyle = "#050404"; ctx.beginPath(); ctx.moveTo(x - s, base); ctx.lineTo(x - s, base - s * 1.1); ctx.quadraticCurveTo(x, base - s * 1.7, x + s, base - s * 1.1); ctx.lineTo(x + s, base); ctx.fill();
    ctx.fillStyle = P.c("#5a4430", d); ctx.fillRect(x - s * 1.1, base - s * 1.3, s * 0.2, s * 1.3); ctx.fillRect(x + s * 0.9, base - s * 1.3, s * 0.2, s * 1.3); ctx.fillRect(x - s * 1.2, base - s * 1.4, s * 2.4, s * 0.2);
  }

  // ---------------------------------------------------------------- 鉱山の都カースヴェルグ（山の腹の坑口と煙、坂を下る鉄の道と止まった台車）
  OUT.w4_mine = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u * 2, height: u * 26, d: 0.7, color: "#5a6070", snow: 0.55, scale: 2 });
    V.mountains(P, { base: hz + u * 2, height: u * 14, d: 0.45, color: "#5a5048", snow: 0.25 });
    for (let i = 0; i < 5; i++) { const x = w * (0.12 + i * 0.18) + (R() - 0.5) * u * 4, y = hz - u * (2 + R() * 6); adit(P, x, y, u * 1.6, 0.45); V.light(P, x, y - u, u * 4, "#ffb04a", 0.6, true); V.smoke(P, x + u, y - u * 3, u * 2.5, 0.4); }
    V.ground(P, { top: hz + u * 2, color: "#6a6058", tex: "rock" });
    V.houseRow(P, { base: hz + u * 6, d: 0.35, size: 6, walls: ["#6a6460", "#7a6a5a", "#5a5450"], roofs: ["#3a3434", "#4a3a30"], roofType: "gable", chimney: 0.8, house: { d: 0.35, lit: 0.7, stone: true } });
    rails(P, cx - u * 4, h + u * 2, cx + u * 14, hz + u * 7, u * 16, u * 2.5, 0.1);
    cart(P, cx + u * 6, hz + u * 16, u * 3.5, 0.2);
    for (let i = 0; i < 4; i++) V.smoke(P, w * (0.1 + R() * 0.8), hz + u * 2, u * 3, 0.35);
    V.lamp && V.lamp(P, cx - u * 22, h - u * 4, u * 8, { col: "#ffb04a" });
    V.frame(P, { color: "#2a2620" });
  };

  // ---------------------------------------------------------------- 市の都ヴァルミリア（雪の広場に部族ごとの色の天幕、真ん中の石の柱）
  OUT.w4_market = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u, height: u * 12, d: 0.8, color: "#6a7890", snow: 0.6 });
    V.ground(P, { top: hz, color: "#d8dee6", tex: "snow", noSnow: true });
    V.houseRow(P, { base: hz + u * 3, d: 0.4, size: 6, walls: ["#8a7a68", "#7a6a5a", "#9a8a74"], roofs: ["#3a3434", "#5a3a2a"], roofType: "gable", chimney: 0.6, house: { d: 0.4, lit: 0.8 } });
    const cols = ["#a83a2a", "#2a5a8a", "#c8a03a", "#3a7a4a", "#6a3a7a", "#c86a2a"];
    const tent = (x, base, s, col, d) => {
      const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
      g.addColorStop(P.ldir < 0 ? 0 : 1, P.lit(col, d, 0.3)); g.addColorStop(P.ldir < 0 ? 1 : 0, P.dark(col, d, 0.4));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s, base); ctx.quadraticCurveTo(x - s * 0.3, base - s * 0.7, x, base - s * 1.1); ctx.quadraticCurveTo(x + s * 0.3, base - s * 0.7, x + s, base); ctx.fill();
      ctx.fillStyle = "#120c0a"; ctx.beginPath(); ctx.moveTo(x - s * 0.18, base); ctx.lineTo(x, base - s * 0.5); ctx.lineTo(x + s * 0.18, base); ctx.fill();
      if (P.night || P.dusk) V.light(P, x, base - s * 0.2, s * 1.4, "#ffb050", 0.8, true);
      ctx.strokeStyle = P.dark("#3a2a20", d, 0.2); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, base - s * 1.1); ctx.lineTo(x, base - s * 1.4); ctx.stroke();
      ctx.fillStyle = P.c(col, d); ctx.fillRect(x, base - s * 1.4, s * 0.3, s * 0.15);
    };
    for (let i = 0; i < 12; i++) { const t = (i % 4) / 3, row = Math.floor(i / 4), y = hz + u * (5 + row * 7), x = w * (0.06 + t * 0.88) + (row % 2) * u * 6 + (R() - 0.5) * u * 3; if (Math.abs(x - cx) < u * 6) continue; tent(x, y, u * (3 + row * 2), cols[i % cols.length], 0.3 - row * 0.1); }
    // 石の柱
    const pg = ctx.createLinearGradient(cx - u * 2, 0, cx + u * 2, 0);
    pg.addColorStop(P.ldir < 0 ? 0 : 1, P.lit("#a8a090", 0.1, 0.3)); pg.addColorStop(P.ldir < 0 ? 1 : 0, P.dark("#8a8478", 0.1, 0.5));
    ctx.fillStyle = pg; ctx.fillRect(cx - u * 1.6, hz - u * 6, u * 3.2, u * 24);
    ctx.fillStyle = P.c("#7a7468", 0.1); ctx.fillRect(cx - u * 2.4, hz - u * 7, u * 4.8, u * 1.4); ctx.fillRect(cx - u * 2.6, hz + u * 17, u * 5.2, u * 1.6);
    V.bunting && V.bunting(P, 0, hz - u * 2, cx - u * 2, hz - u * 5, u * 2, cols);
    V.bunting && V.bunting(P, cx + u * 2, hz - u * 5, w, hz - u * 2, u * 2, cols);
    V.frame(P, { color: "#2a2a30" });
  };

  // ---------------------------------------------------------------- 古い鉄の道（山腹の坑口へ消える線路、内から叩かれた板の扉）
  OUT.w4_rail = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u * 4, height: u * 30, d: 0.6, color: "#4a505a", snow: 0.6, scale: 2.4 });
    V.ground(P, { top: hz, color: "#5a5450", tex: "rock" });
    const mx = cx + u * 10, my = hz - u * 2, s = u * 7;
    adit(P, mx, my, s, 0.2);
    // 打ちつけた板（内側から押されて浮いている）
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(mx - s * 0.9 + i * s * 0.42, my - s * 1.1); ctx.rotate(0.1 - (i % 2) * 0.18); ctx.fillStyle = P.c(i % 2 ? "#6a5038" : "#5a4430", 0.2); ctx.fillRect(0, 0, s * 0.3, s * 1.1); ctx.restore(); }
    rails(P, cx - u * 10, h + u * 2, mx, my, u * 20, u * 3, 0.1);
    cart(P, cx - u * 24, hz + u * 14, u * 4, 0.25);
    for (let i = 0; i < 6; i++) V.rock && V.rock(P, R() * w, hz + u * 6 + R() * (h - hz - u * 6), u * (1.5 + R() * 2.5), { color: "#5a5450" });
    V.frame(P, { color: "#1e1c1a" });
  };

  // ---------------------------------------------------------------- 水の都トゥリエル（湖の上の板の道と家、星見の塔、湖面に映る東の大樹）
  OUT.w4_water = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    const bx = w * 0.84;
    ctx.fillStyle = P.c("#4a5a5a", 0.85); ctx.beginPath(); ctx.moveTo(bx - u * 4, hz); ctx.lineTo(bx - u * 2.5, hz - u * 26); ctx.lineTo(bx + u * 2.5, hz - u * 26); ctx.lineTo(bx + u * 4, hz); ctx.fill();
    for (let i = 0; i < 16; i++) { const a = Math.PI + (i / 15) * Math.PI, r = u * (10 + R() * 5); ctx.fillStyle = P.c(i % 2 ? "#5a6a5a" : "#4a5a4c", 0.85); ctx.beginPath(); ctx.arc(bx + Math.cos(a) * r, hz - u * 30 + Math.sin(a) * r * 0.55, u * (4 + R() * 3), 0, Math.PI * 2); ctx.fill(); }
    V.hills(P, { base: hz, amp: u * 2, d: 0.65, color: "#4a6a50" });
    V.water(P, { top: hz, bottom: h, color: "#3a5a6a", reflect: 0.6 });
    // 板の道と高床の家
    const deckY = hz + u * 9;
    ctx.fillStyle = P.c("#5a4430", 0.2); ctx.fillRect(0, deckY, w * 0.78, u * 0.8);
    for (let x = u * 2; x < w * 0.78; x += u * 5) { ctx.fillStyle = P.dark("#3a2a1e", 0.2, 0.3); ctx.fillRect(x, deckY, u * 0.5, u * 4); }
    for (let i = 0; i < 6; i++) { const x = w * (0.02 + i * 0.12), bw = u * (6 + R() * 3), bh = u * (5 + R() * 3); V.house(P, x, deckY, bw, bh, { wall: R() < 0.5 ? "#d8ccb4" : "#b8c8c8", roof: R() < 0.5 ? "#3a5a6a" : "#5a4a3a", roofType: "gable", d: 0.25, lit: 0.8, side: 0.05 }); }
    V.tower(P, w * 0.62, deckY, u * 4, u * 22, { wall: "#d8d0c0", roof: "#2a4a6a", d: 0.2 });
    if (P.night) V.light(P, w * 0.62, deckY - u * 22, u * 10, "#cfe0ff", 0.8, false);
    // 舟
    const boat = (x, y, s) => { ctx.fillStyle = P.c("#4a3020", 0.1); ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x, y + s * 0.4, x + s, y); ctx.lineTo(x + s * 0.8, y + s * 0.1); ctx.lineTo(x - s * 0.8, y + s * 0.1); ctx.fill(); ctx.strokeStyle = P.c("#2a1e14"); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + s * 0.3, y); ctx.lineTo(x + s * 0.7, y - s * 0.9); ctx.stroke(); };
    boat(cx - u * 10, h - u * 10, u * 5); boat(cx + u * 18, h - u * 18, u * 3);
    V.fogBand(P, hz + u * 2, u * 3, P.night ? 0.12 : 0.22, "#d8e4ec");
  };

  // ---------------------------------------------------------------- 沈黙の森（まっすぐな幹が並び、白く褪せた札が貼られている）
  OUT.w4_silent = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.forestBand(P, { base: hz, size: u * 6, d: 0.6, kind: "pine" });
    V.ground(P, { top: hz, color: "#4a5040", tex: "grass" });
    const trunk = (x, s, d) => {
      const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
      g.addColorStop(P.ldir < 0 ? 0 : 1, P.lit("#6a6458", d, 0.3)); g.addColorStop(P.ldir < 0 ? 1 : 0, P.dark("#3a382e", d, 0.5));
      ctx.fillStyle = g; ctx.fillRect(x - s, -10, s * 2, h + 10);
      // 札（褪せたもの、新しいもの）
      const n = 1 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) { const y = hz - u * 6 + R() * u * 16, fresh = R() < 0.3; ctx.fillStyle = P.c(fresh ? "#f2ead0" : "#c8c4b4", d); ctx.fillRect(x - s * 0.5, y, s, s * 1.6); ctx.fillStyle = P.c(fresh ? "#8a2a1a" : "#8a8478", d); ctx.fillRect(x - s * 0.25, y + s * 0.3, s * 0.5, s * 0.08); ctx.fillRect(x - s * 0.25, y + s * 0.6, s * 0.5, s * 0.08); }
    };
    for (let i = 0; i < 14; i++) { const t = i / 13, d = 0.5 - t * 0.45, x = R() * w, s = u * (0.8 + t * 2.4); trunk(x, s, d); }
    V.mist && V.mist(P, hz, 4, P.night ? 0.15 : 0.25, "#c8d0c8");
    V.frame(P, { color: "#1c2018" });
  };

  // ---------------------------------------------------------------- 鐘の見張り塔（雪の尾根に一里おきに並ぶ石の塔、塔の上の鐘）
  OUT.w4_watch = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u * 2, height: u * 24, d: 0.72, color: "#5a6070", snow: 0.7, scale: 2 });
    V.hills(P, { base: hz + u, amp: u * 5, d: 0.5, color: "#6a7078" });
    V.ground(P, { top: hz + u * 2, color: "#d8dee6", tex: "snow", noSnow: true });
    const tw = (x, base, s, d, dead) => {
      const top = V.tower(P, x, base, s, s * 4.2, { wall: "#8a8478", d, crenel: true });
      ctx.fillStyle = P.c(dead ? "#4a4a44" : "#b08a3a", d); ctx.beginPath(); ctx.arc(x, top - s * 0.25, s * 0.28, Math.PI, 0); ctx.fill();
      if (!dead && (P.night || P.dusk)) V.light(P, x, top + s * 0.4, s * 3, "#ffb04a", 0.9, true);
    };
    tw(cx - u * 26, h - u * 4, u * 6, 0.1, false);
    tw(cx + u * 4, hz + u * 6, u * 3, 0.35, false);
    tw(cx + u * 22, hz + u * 2, u * 2, 0.5, true);
    tw(cx + u * 34, hz, u * 1.3, 0.62, false);
    V.frame(P, { color: "#2a2e34" });
  };

  // ---------------------------------------------------------------- 断界の古関（岩の裂け目を塞ぐ、人には大きすぎる門と背丈の刻み目）
  OUT.w4_pass = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u * 6, height: u * 30, d: 0.7, color: "#5a5e6a", snow: 0.7, scale: 2.5 });
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 0 : w, edge = cx + s * u * 14;
      ctx.fillStyle = s === P.ldir ? P.lit("#5a5650", 0.1, 0.25) : P.dark("#4a4640", 0.1, 0.45);
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(edge, 0); ctx.lineTo(edge + s * u * 3, h); ctx.lineTo(x0, h); ctx.fill();
    }
    V.ground(P, { top: hz + u * 3, color: "#6a6660", tex: "rock" });
    const gx = cx, gb = hz + u * 8, gw = u * 24, gh = u * 34;
    const g = ctx.createLinearGradient(gx - gw / 2, 0, gx + gw / 2, 0);
    g.addColorStop(P.ldir < 0 ? 0 : 1, P.lit("#9a948a", 0.15, 0.3)); g.addColorStop(P.ldir < 0 ? 1 : 0, P.dark("#7a7468", 0.15, 0.5));
    ctx.fillStyle = g; ctx.fillRect(gx - gw / 2, gb - gh, gw, gh);
    ctx.fillStyle = "#06060a"; ctx.beginPath(); ctx.moveTo(gx - gw * 0.22, gb); ctx.lineTo(gx - gw * 0.22, gb - gh * 0.55); ctx.arc(gx, gb - gh * 0.55, gw * 0.22, Math.PI, 0); ctx.lineTo(gx + gw * 0.22, gb); ctx.fill();
    // 背丈の刻み目と、読めない碑文の帯
    ctx.fillStyle = P.dark("#5a564e", 0.15, 0.4);
    for (let i = 0; i < 7; i++) ctx.fillRect(gx + gw * 0.3, gb - u * 2 - i * u * 4.2, gw * 0.12, u * 0.5);
    ctx.fillRect(gx - gw * 0.45, gb - gh + u * 2, gw * 0.9, u * 1.6);
    for (let i = 0; i < 18; i++) { ctx.fillStyle = P.lit("#c8c0b0", 0.15, 0.2); ctx.fillRect(gx - gw * 0.42 + i * gw * 0.047, gb - gh + u * 2.4, u * 0.6, u * 0.8); }
    V.light(P, gx, gb - gh * 0.3, u * 10, "#9fd6ff", 0.3, false);
    V.fogBand(P, hz, u * 4, 0.2, "#d8dce4");
    V.frame(P, { color: "#2a2a30" });
  };

  // ---------------------------------------------------------------- 天蓋の原（空を映す白い塩の原、滑っていく町ほどの丸い影）
  OUT.w4_canopy = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.water(P, { top: hz, bottom: h, color: "#d8d4cc", reflect: 0.85 });
    ctx.strokeStyle = rgba("#ffffff", 0.22); ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) { const y = hz + Math.pow(R(), 0.7) * (h - hz), x = R() * w, l = u * (2 + P.depth(y) * 12); ctx.beginPath(); ctx.moveTo(x - l, y); ctx.lineTo(x + l, y + u * 0.3); ctx.stroke(); }
    // 丸い影（地面の上を滑っていく）
    const sx = cx + u * 8, sy = hz + (h - hz) * 0.45;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, u * 36);
    sg.addColorStop(0, rgba("#0a0a12", 0.6)); sg.addColorStop(0.8, rgba("#0a0a12", 0.45)); sg.addColorStop(1, rgba("#0a0a12", 0));
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(sx, sy, u * 36, u * 8, 0, 0, Math.PI * 2); ctx.fill();
    // 遠くの人影と、地面に映る逆さの影
    for (let i = 0; i < 3; i++) { const x = w * (0.14 + i * 0.1), s = u * (2.2 - i * 0.4); ctx.fillStyle = P.c("#1a1820", 0.3); ctx.fillRect(x - s * 0.15, hz - s * 1.6, s * 0.3, s * 1.6); ctx.beginPath(); ctx.arc(x, hz - s * 1.8, s * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = rgba("#1a1820", 0.3); ctx.fillRect(x - s * 0.15, hz, s * 0.3, s * 1.6); }
    V.frame(P, { color: "#c8c4bc" });
  };

  // ---------------------------------------------------------------- 迷宮の中
  // 古い鉄の道の中：坑道の木枠と、奥へ続く線路
  IN.w4_rail_in = (P) => {
    const { w, h, u, ctx } = P;
    V.corridor(P, { stone: "#4a4038" });
    for (let i = 0; i < 6; i++) { const s = Math.pow(0.74, i), bw = w * 0.9 * s, bh = h * 1.1 * s, x0 = P.cx - bw / 2, y0 = h * 0.46 - bh * 0.55; ctx.fillStyle = mix("#6a5038", "#050404", Math.min(0.9, i * 0.16)); ctx.fillRect(x0, y0, bw * 0.05, bh); ctx.fillRect(x0 + bw * 0.95, y0, bw * 0.05, bh); ctx.fillRect(x0, y0, bw, bh * 0.05); }
    rails(P, P.cx, h + u * 2, P.cx, h * 0.5, w * 0.32, u, 0);
    V.light(P, w * 0.28, h * 0.32, u * 10, "#ffb04a", 0.9, true);
    V.dim(P, 0.35);
  };
  // 断界の古関の中：人には高すぎる段、壁の背丈の刻み目、上から差す青い光
  IN.w4_pass_in = (P) => {
    const { w, h, u, ctx } = P;
    V.corridor(P, { stone: "#5a5650" });
    for (let i = 0; i < 6; i++) { ctx.fillStyle = mix("#6a6660", "#0a0a0c", i * 0.14); ctx.fillRect(w * (0.24 + i * 0.03), h * (0.92 - i * 0.08), w * (0.52 - i * 0.06), h * 0.08); }
    ctx.fillStyle = "#9a948a"; for (let i = 0; i < 8; i++) ctx.fillRect(w * 0.06, h * (0.18 + i * 0.09), w * 0.05, Math.max(1, u * 0.4));
    V.light(P, P.cx, h * 0.1, u * 20, "#9fd6ff", 0.5, false);
    V.dim(P, 0.35);
  };
})(globalThis.G = globalThis.G || {});
