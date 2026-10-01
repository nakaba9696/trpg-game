// 背景の絵（V2）：野外と迷宮の入口（森・丘陵・雪原・沼・山脈・遺跡・竜の墓場・使徒領ほか）。道具は scene_v2.js の G.SV2
(function (G) {
  const V = G.SV2;
  if (!V) return;
  const { mix, rgba, clamp, lerp, noise } = V;
  const OUT = V.OUT;

  // ---------------------------------------------------------------- 小道具
  // 岩（光の側の面を明るく）
  function rock(P, x, base, s, o) {
    const { ctx, R } = P;
    o = o || {};
    const d = o.d || 0, col = o.color || "#6a6460";
    const n = 7, pts = [];
    for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; const r = s * (0.75 + R() * 0.35); pts.push([x + Math.cos(a) * r * (o.wide || 1.2), base + Math.sin(a) * r * (o.tall || 0.8)]); }
    ctx.fillStyle = P.dark(col, d, 0.35);
    ctx.beginPath(); ctx.moveTo(pts[0][0], base); pts.forEach(([px, py]) => ctx.lineTo(px, py)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.lit(col, d, 0.3);
    ctx.beginPath(); const mid = Math.floor(n / 2);
    const side = P.ldir < 0 ? pts.slice(0, mid + 2) : pts.slice(mid - 1);
    ctx.moveTo(x + P.ldir * s * 0.1, base - s * 0.2); side.forEach(([px, py]) => ctx.lineTo(px, py - 0.5)); ctx.closePath(); ctx.fill();
    if (P.season === "winter" || o.snow) { ctx.fillStyle = P.lit("#f2f6fb", d, 0.2); ctx.beginPath(); ctx.moveTo(pts[1][0], pts[1][1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1] - 0.5); for (let i = n - 1; i >= 1; i--) ctx.lineTo(pts[i][0], pts[i][1] + s * 0.18); ctx.fill(); }
    ctx.fillStyle = rgba(P.shadowC, 0.3 * (1 - d)); ctx.beginPath(); ctx.ellipse(x - P.ldir * s * 0.3, base, s * 1.4, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 枯れ木（ねじれた枝）
  function deadTree(P, x, base, s, o) {
    const { ctx, R } = P;
    o = o || {};
    const col = P.dark(o.color || "#3a3028", o.d || 0, 0.3);
    ctx.strokeStyle = col; ctx.lineCap = "round";
    const branch = (bx, by, ang, len, wd, depth) => {
      if (depth > 4 || len < s * 0.04) return;
      const ex = bx + Math.cos(ang) * len, ey = by - Math.sin(ang) * len;
      ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.cos(ang + 0.4) * len * 0.5, by - Math.sin(ang + 0.4) * len * 0.5, ex, ey); ctx.stroke();
      const k = 2 + (R() < 0.4 ? 1 : 0);
      for (let i = 0; i < k; i++) branch(ex, ey, ang + (R() - 0.5) * 1.4, len * (0.55 + R() * 0.2), wd * 0.62, depth + 1);
    };
    branch(x, base, Math.PI / 2 + (R() - 0.5) * 0.3, s * 0.42, s * 0.07, 0);
  }
  // 古い柱（折れたもの・立ったもの）
  function column(P, x, base, cw, ch, o) {
    const { ctx, R } = P;
    o = o || {};
    const d = o.d || 0, col = o.color || "#d8d0bc";
    const g = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
    const L = P.lit(col, d, 0.35), M = P.c(col, d), Dk = P.dark(col, d, 0.5);
    if (P.ldir < 0) { g.addColorStop(0, M); g.addColorStop(0.3, L); g.addColorStop(1, Dk); } else { g.addColorStop(0, Dk); g.addColorStop(0.7, L); g.addColorStop(1, M); }
    ctx.fillStyle = g;
    const top = base - ch;
    ctx.beginPath(); ctx.moveTo(x - cw / 2, base); ctx.lineTo(x - cw / 2, top + (o.broken ? cw * 0.3 : 0));
    if (o.broken) { for (let i = 0; i <= 4; i++) ctx.lineTo(x - cw / 2 + (i / 4) * cw, top + (R() - 0.3) * cw * 0.6); }
    else ctx.lineTo(x + cw / 2, top);
    ctx.lineTo(x + cw / 2, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(P.dark(col, d, 0.6), 0.35); ctx.lineWidth = Math.max(0.6, cw * 0.04);
    for (let i = 1; i < 4; i++) { const xx = x - cw / 2 + (i / 4) * cw; ctx.beginPath(); ctx.moveTo(xx, top + cw * 0.5); ctx.lineTo(xx, base); ctx.stroke(); }
    if (!o.broken) { ctx.fillStyle = L; ctx.fillRect(x - cw * 0.7, top - cw * 0.3, cw * 1.4, cw * 0.32); ctx.fillStyle = Dk; ctx.fillRect(x - cw * 0.7, top - cw * 0.02, cw * 1.4, cw * 0.06); }
    ctx.fillStyle = M; ctx.fillRect(x - cw * 0.65, base - cw * 0.25, cw * 1.3, cw * 0.25);
    // 蔦
    if (o.ivy !== false) { ctx.strokeStyle = P.c(P.season === "autumn" ? "#a83a1c" : "#3a5a2a", d); ctx.lineWidth = Math.max(1, cw * 0.08); ctx.beginPath(); ctx.moveTo(x - cw * 0.3, base); for (let y = base; y > top + ch * 0.3; y -= cw * 0.6) ctx.lineTo(x + Math.sin(y * 0.3) * cw * 0.45, y); ctx.stroke(); }
  }
  // 巨大な肋骨（竜の墓場）
  function rib(P, x, base, s, lean, d) {
    const { ctx } = P;
    const col = "#e4dcc8";
    const g = ctx.createLinearGradient(x - s * 0.3, base - s, x + s * 0.3, base);
    g.addColorStop(0, P.lit(col, d, 0.3)); g.addColorStop(1, P.dark(col, d, 0.45));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - s * 0.05, base);
    ctx.quadraticCurveTo(x - s * 0.3 * lean, base - s * 0.8, x + s * 0.45 * lean, base - s * 1.15);
    ctx.quadraticCurveTo(x - s * 0.15 * lean, base - s * 0.75, x + s * 0.06, base); ctx.fill();
    ctx.fillStyle = rgba(P.shadowC, 0.25 * (1 - d)); ctx.beginPath(); ctx.ellipse(x, base, s * 0.12, s * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 葦
  function reeds(P, x, base, s, col) {
    const { ctx, R } = P;
    for (let i = 0; i < 9; i++) {
      const px = x + (R() - 0.5) * s, l = s * (0.8 + R() * 0.8);
      ctx.strokeStyle = P.dark(col || "#5a6a3a", 0, 0.3 + R() * 0.3); ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath(); ctx.moveTo(px, base); ctx.quadraticCurveTo(px + (R() - 0.5) * s * 0.3, base - l * 0.6, px + (R() - 0.5) * s * 0.4, base - l); ctx.stroke();
      if (R() < 0.4) { ctx.fillStyle = P.c("#5a3a24"); ctx.beginPath(); ctx.ellipse(px, base - l * 0.8, s * 0.04, s * 0.12, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // 霧の帯をいくつか
  function mist(P, y0, n, a, col) { for (let i = 0; i < n; i++) V.fogBand(P, y0 + i * P.u * 3, P.u * (3 + P.R() * 3), a * (1 - i * 0.15), col); }
  // 木漏れ日（斜めの光の筋）
  function shafts(P, n, a) {
    const { ctx, w, h, R } = P;
    if (P.night || P.overcast) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const x = R() * w * 1.2 - w * 0.1, wd = P.u * (1 + R() * 4), sk = P.u * 14 * P.ldir * -1;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, rgba(P.sun.col, a * (0.6 + R() * 0.6))); g.addColorStop(1, rgba(P.sun.col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + wd, 0); ctx.lineTo(x + wd * 2 + sk, h); ctx.lineTo(x + sk, h); ctx.fill();
    }
    ctx.restore();
  }
  // 墓標
  function grave(P, x, base, s, o) {
    const { ctx, R } = P;
    o = o || {};
    const d = o.d || 0, col = o.color || "#8a8680";
    const tilt = (R() - 0.5) * 0.25;
    ctx.save(); ctx.translate(x, base); ctx.rotate(tilt);
    const g = ctx.createLinearGradient(-s * 0.3, 0, s * 0.3, 0);
    g.addColorStop(P.ldir < 0 ? 0 : 1, P.lit(col, d, 0.3)); g.addColorStop(P.ldir < 0 ? 1 : 0, P.dark(col, d, 0.4));
    ctx.fillStyle = g;
    if (R() < 0.35) { ctx.fillRect(-s * 0.06, -s, s * 0.12, s); ctx.fillRect(-s * 0.28, -s * 0.75, s * 0.56, s * 0.12); }
    else { ctx.beginPath(); ctx.moveTo(-s * 0.25, 0); ctx.lineTo(-s * 0.25, -s * 0.6); ctx.arc(0, -s * 0.6, s * 0.25, Math.PI, 0); ctx.lineTo(s * 0.25, 0); ctx.fill(); ctx.fillStyle = rgba(P.dark(col, d, 0.6), 0.5); ctx.fillRect(-s * 0.12, -s * 0.55, s * 0.24, s * 0.04); ctx.fillRect(-s * 0.1, -s * 0.45, s * 0.2, s * 0.03); }
    ctx.restore();
    if (P.season === "winter") { ctx.fillStyle = P.lit("#f2f6fb", d, 0.2); ctx.beginPath(); ctx.ellipse(x, base, s * 0.4, s * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // 遠くを飛ぶ影（翼竜など）
  function flyer(P, x, y, s, col) {
    const { ctx } = P;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.4, x - s, y - s * 0.1); ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.1, x, y + s * 0.12); ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.1, x + s, y - s * 0.1); ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.4, x, y); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.1); ctx.lineTo(x - s * 0.06, y + s * 0.5); ctx.lineTo(x + s * 0.06, y + s * 0.5); ctx.fill();
  }
  // 地割れの溶岩（光る）
  function lavaCracks(P, y0, n, col) {
    const { ctx, w, h, R } = P;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      let x = R() * w, y = y0 + R() * (h - y0);
      const dd = P.depth(y);
      ctx.strokeStyle = rgba(col, 0.7); ctx.lineWidth = Math.max(1, P.u * (0.15 + dd * 0.5));
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (R() - 0.5) * P.u * (4 + dd * 14); y += (R() - 0.3) * P.u * (0.5 + dd * 2); ctx.lineTo(x, y); }
      ctx.stroke();
      V.light(P, x, y, P.u * (3 + dd * 8), col, 0.7, true);
    }
    ctx.restore();
  }
  Object.assign(V, { rock, deadTree, column, rib, reeds, mist, shafts, grave, flyer, lavaCracks });

  // ---------------------------------------------------------------- 迷いの森（幹の重なり、苔、木漏れ日、夜は蛍）
  OUT.forest = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    const trunkC = "#4a3a2c", canopy = (V.leafColors(P, "#2f5a2a") || ["#4a4a44", "#5a5a52", "#3a3a34", "#2a2a24"]);
    // 奥の霞んだ森
    V.forestBand(P, { base: hz - u * 2, size: u * 9, d: 0.75, kind: "mixed", fill: h });
    V.ground(P, { top: hz - u * 1, color: "#3a4a2a", tex: "grass" });
    // 幹の層（奥ほど細く霞む）
    for (const [d, n, wd] of [[0.62, 16, 1.2], [0.42, 11, 2.2], [0.22, 7, 3.6]]) {
      for (let i = 0; i < n; i++) {
        const x = (i + R() * 0.8) / n * w, tw = u * wd * (0.7 + R() * 0.6), base = hz + u * (1 - d) * 6 + R() * u;
        const g = ctx.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
        g.addColorStop(P.ldir < 0 ? 0 : 1, P.lit(trunkC, d, 0.3)); g.addColorStop(P.ldir < 0 ? 1 : 0, P.dark(trunkC, d, 0.5));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - tw * 0.7, base); ctx.lineTo(x - tw * 0.5, 0); ctx.lineTo(x + tw * 0.5, 0); ctx.lineTo(x + tw * 0.7, base); ctx.fill();
        ctx.fillStyle = rgba(P.c("#4a6a2a", d), 0.5); ctx.fillRect(x - tw * 0.5, base - tw * 1.5, tw * 0.35, tw * 1.5);
      }
      mist(P, hz - u * 2, 1, 0.18 * d, P.haze);
    }
    // 天蓋
    V.blurred(P, u * 0.5, () => { const c2 = P.ctx; for (let i = 0; i < 260; i++) { const x = R() * w, y = Math.pow(R(), 1.6) * hz * 0.55, r = u * (1.5 + R() * 3.5), c = canopy[Math.floor(R() * Math.min(3, canopy.length))]; c2.fillStyle = R() < 0.65 ? P.dark(c, 0.15, 0.5) : P.lit(c, 0.15, 0.2); c2.beginPath(); c2.ellipse(x, y, r * 1.3, r, R() * 3, 0, Math.PI * 2); c2.fill(); } });
    shafts(P, 9, 0.09);
    // 苔むした小道
    V.road(P, { top: hz + u * 2, x: cx + u * 3, x1: cx - u * 4, wt: u * 2, wb: w * 0.4, color: "#5a4a34" });
    // 茂み・羊歯・茸
    for (let i = 0; i < 26; i++) { const y = hz + (h - hz) * (0.25 + R() * 0.75), dd = P.depth(y), x = R() * w; if (Math.abs(x - cx) < w * 0.16) continue; const s = u * (1.5 + dd * 6); ctx.fillStyle = P.dark("#2a4a20", 0.2 * (1 - dd), 0.3); for (let k = 0; k < 7; k++) { const a = Math.PI + (k / 6) * Math.PI; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.35, s * 0.5, s * 0.12, a, 0, Math.PI * 2); ctx.fill(); } }
    for (let i = 0; i < 6; i++) { const y = hz + (h - hz) * (0.5 + R() * 0.5), x = R() * w, s = u * (0.6 + P.depth(y) * 1.5); ctx.fillStyle = P.c("#e8e0c8"); ctx.fillRect(x - s * 0.1, y - s * 0.6, s * 0.2, s * 0.6); ctx.fillStyle = P.c(i % 2 ? "#c83a2a" : "#c8a060"); ctx.beginPath(); ctx.ellipse(x, y - s * 0.6, s * 0.45, s * 0.3, 0, Math.PI, 0); ctx.fill(); }
    // 手前の太い幹（左右の端）
    for (const [x, tw] of [[u * 4, u * 9], [w - u * 6, u * 11]]) {
      const g = ctx.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
      g.addColorStop(P.ldir < 0 ? 0 : 1, P.lit(trunkC, 0, 0.25)); g.addColorStop(P.ldir < 0 ? 1 : 0, P.dark(trunkC, 0, 0.7));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - tw, h); ctx.quadraticCurveTo(x - tw * 0.5, h - u * 6, x - tw * 0.45, 0); ctx.lineTo(x + tw * 0.45, 0); ctx.quadraticCurveTo(x + tw * 0.5, h - u * 6, x + tw, h); ctx.fill();
      ctx.strokeStyle = rgba(P.dark("#1a1410", 0), 0.35); ctx.lineWidth = u * 0.3; for (let k = 0; k < 5; k++) { const xx = x + (k / 4 - 0.5) * tw * 0.8; ctx.beginPath(); ctx.moveTo(xx, 0); ctx.quadraticCurveTo(xx + (R() - 0.5) * u * 3, h * 0.5, xx + (R() - 0.5) * u * 2, h); ctx.stroke(); }
      ctx.fillStyle = rgba(P.c("#4a6a2a"), 0.55); ctx.beginPath(); ctx.ellipse(x - P.ldir * tw * 0.3, h * 0.75, tw * 0.25, h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    V.frame(P, { color: "#1a2a14", leaves: true });
    if (P.night) P.fireflies = "#c8ff6a";
  };

  // ---------------------------------------------------------------- 白銀の丘陵（白い穂草の波、遠い山、曲がる道、一本木）
  OUT.plains = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u * 2, height: u * 10, d: 0.82, color: "#7a88a0", snow: 0.3 });
    V.hills(P, { base: hz, amp: u * 6, d: 0.6, color: "#8a9a6a" });
    V.hills(P, { base: hz + u * 4, amp: u * 5, d: 0.35, color: "#9aa676" });
    V.ground(P, { top: hz + u * 3, color: "#a8b088", tex: "grass" });
    // 銀の穂草（風で同じ向きに）
    const silver = P.season === "winter" ? "#e8eef4" : "#e4e6d8";
    for (let i = 0; i < Math.min(2400, w * 1.6); i++) {
      const y = hz + u * 3 + Math.pow(R(), 0.6) * (h - hz - u * 3), dd = P.depth(y), x = R() * w, l = u * (0.4 + dd * 4) * (0.6 + R() * 0.8);
      ctx.strokeStyle = rgba(R() < 0.6 ? P.lit(silver, 0.3 * (1 - dd), 0.5) : P.c("#a4a888", 0.3 * (1 - dd)), 0.55); ctx.lineWidth = Math.max(0.6, dd * u * 0.18);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l * 0.2, y - l * 0.6, x + l * 0.5, y - l); ctx.stroke();
    }
    // 曲がりくねる道
    ctx.fillStyle = P.c("#a4947a", 0.2);
    ctx.beginPath(); ctx.moveTo(cx - u * 1, hz + u * 3); ctx.bezierCurveTo(cx + u * 14, hz + (h - hz) * 0.35, cx - u * 24, hz + (h - hz) * 0.6, cx - u * 8, h); ctx.lineTo(cx + u * 22, h); ctx.bezierCurveTo(cx + u * 2, hz + (h - hz) * 0.6, cx + u * 22, hz + (h - hz) * 0.35, cx + u * 1, hz + u * 3); ctx.fill();
    // 一本木と岩
    V.tree(P, cx + u * 30, hz + u * 6, u * 14, { d: 0.25 });
    rock(P, cx - u * 30, hz + u * 10, u * 3, { d: 0.2 });
    rock(P, cx + u * 40, h - u * 4, u * 5, {});
    // 遠くの羊飼いの小屋
    V.house(P, cx - u * 14, hz + u * 2, u * 3, u * 2, { wall: "#d8ccb4", roof: "#6a4a30", d: 0.5, chimney: true, windows: false });
    V.frame(P, { color: "#4a5034" });
  };

  // ---------------------------------------------------------------- 凍てつく街道（吹雪の雪原、凍えた木、道標、雪に埋もれた旅人）
  OUT.snow = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    P.season = "winter";
    V.mountains(P, { base: hz - u * 1, height: u * 16, d: 0.75, color: "#8a94a8", snow: 0.75 });
    V.forestBand(P, { base: hz + u * 1, size: u * 4, d: 0.6, kind: "pine" });
    V.ground(P, { top: hz, color: "#e8eef4", tex: "snow", noSnow: true });
    // 吹きだまり
    for (let i = 0; i < 6; i++) { const y = hz + (h - hz) * (0.2 + i * 0.15), A = u * (1 + i); V.hills(P, { base: y, amp: A, d: 0.4 * (1 - i / 6), color: "#e4eaf2", noSnow: true, bottom: y + A * 2 }); }
    V.road(P, { top: hz + u, wt: u * 2, wb: w * 0.5, color: "#c8d0dc" });
    for (let i = 0; i < 5; i++) V.pine(P, cx + (i % 2 ? 1 : -1) * u * (12 + i * 7), hz + u * (3 + i * 2.4), u * (6 + i * 2.5), { d: 0.4 - i * 0.07, snow: true });
    // 道標
    const sx = cx + u * 12, sy = hz + (h - hz) * 0.55;
    ctx.fillStyle = P.c("#4a3a2a"); ctx.fillRect(sx - u * 0.3, sy - u * 9, u * 0.6, u * 9);
    ctx.fillStyle = P.lit("#6a5038", 0, 0.2); ctx.beginPath(); ctx.moveTo(sx, sy - u * 8); ctx.lineTo(sx + u * 5, sy - u * 8); ctx.lineTo(sx + u * 6, sy - u * 7.2); ctx.lineTo(sx + u * 5, sy - u * 6.4); ctx.lineTo(sx, sy - u * 6.4); ctx.fill();
    ctx.fillStyle = P.lit("#f2f6fb", 0); ctx.fillRect(sx - u * 0.1, sy - u * 8.2, u * 5.2, u * 0.4);
    // 座りこんだまま凍えた旅人
    const tx = cx - u * 18, ty = hz + (h - hz) * 0.62;
    ctx.fillStyle = P.dark("#5a5048", 0, 0.2); ctx.beginPath(); ctx.ellipse(tx, ty - u * 2, u * 2.2, u * 2.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(tx + u * 0.5, ty - u * 4.6, u * 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.lit("#f4f7fb", 0, 0.2); ctx.beginPath(); ctx.ellipse(tx, ty - u * 3.4, u * 2, u * 1.2, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(tx + u * 0.5, ty - u * 5, u * 0.9, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(tx, ty, u * 3, u * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    V.frame(P, { color: "#3a4048" });
  };
  OUT.snow.storm = true;

  // ---------------------------------------------------------------- 毒沼の湿地（濁った水面、枯れ木、葦、緑の霧、遠い塔）
  OUT.swamp = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    // 遠くのエルメシアの塔（滓の出どころ）
    for (const [k, th] of [[-0.3, 14], [-0.24, 9], [0.28, 11]]) V.tower(P, cx + k * w, hz, u * 1.6, u * th, { wall: "#a8a4b8", roof: "#5a5a8a", d: 0.8, roofK: 2.5 });
    V.forestBand(P, { base: hz + u, size: u * 4, d: 0.6, kind: "broad", color: "#4a5a3a" });
    V.water(P, { top: hz + u, color: "#3a4a2a", reflect: 0.5 });
    // 浮き島と枯れ木
    for (let i = 0; i < 6; i++) {
      const t = i / 5, y = hz + u * 2 + (h - hz) * t * 0.8, x = (i % 2 ? 0.15 + R() * 0.2 : 0.65 + R() * 0.25) * w, s = u * (3 + t * 10);
      ctx.fillStyle = P.dark("#3a3a24", 0.4 * (1 - t), 0.3); ctx.beginPath(); ctx.ellipse(x, y, s * 1.6, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.lit("#5a6a34", 0.4 * (1 - t), 0.2); ctx.beginPath(); ctx.ellipse(x, y - s * 0.08, s * 1.4, s * 0.2, 0, Math.PI, 0); ctx.fill();
      if (i % 2 === 0 || t > 0.6) deadTree(P, x, y, s * 3, { d: 0.4 * (1 - t) });
      reeds(P, x + s, y, s * 0.9);
    }
    // 泡（毎コマ）
    const bubbles = Array.from({ length: 10 }, () => [R() * w, hz + u * 3 + R() * (h - hz - u * 3), R() * 6]);
    P.anim.push({ draw: (c, t) => { for (const [x, y, ph] of bubbles) { const k = (t * 0.5 + ph) % 1, s = P.u * (0.3 + P.depth(y) * 1.2) * k; c.strokeStyle = `rgba(190,220,140,${0.6 * (1 - k)})`; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, s * 2, s * 0.6, 0, 0, Math.PI * 2); c.stroke(); } } });
    mist(P, hz, 4, P.night ? 0.25 : 0.32, "#a8c29a");
    V.frame(P, { color: "#1a2014" });
  };

  // ---------------------------------------------------------------- 断界山脈（峰々、足もとの雲海、尾根の道、翼竜の影）
  OUT.mountain = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u * 4, height: u * 30, d: 0.7, color: "#6a7088", snow: 0.55, scale: 3 });
    // 雲海
    for (let i = 0; i < 14; i++) V.cloud(P, R() * w, hz - u * (3 - R() * 3), u * (20 + R() * 20), u * 5, { lit: P.night ? "#3a4460" : P.dusk ? "#ffc8a0" : "#ffffff", shade: P.night ? "#141a2c" : "#a8b4c8", a: 0.85 });
    V.mountains(P, { base: hz + u * 3, height: u * 14, d: 0.3, color: "#5a5a64", snow: 0.25, scale: 2 });
    V.ground(P, { top: hz + u * 4, color: "#5a5654", tex: "rock" });
    // 尾根の道（手前の岩稜）
    ctx.fillStyle = P.c("#4a4644"); ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, hz + u * 10); ctx.lineTo(w * 0.3, hz + u * 6); ctx.lineTo(w * 0.55, hz + u * 7); ctx.lineTo(w * 0.8, hz + u * 4); ctx.lineTo(w, hz + u * 8); ctx.lineTo(w, h); ctx.fill();
    ctx.fillStyle = P.lit("#6a6460", 0, 0.3); ctx.beginPath(); ctx.moveTo(0, hz + u * 10); ctx.lineTo(w * 0.3, hz + u * 6); ctx.lineTo(w * 0.55, hz + u * 7); ctx.lineTo(w * 0.8, hz + u * 4); ctx.lineTo(w, hz + u * 8); ctx.lineTo(w, hz + u * 10); ctx.lineTo(w * 0.8, hz + u * 7); ctx.lineTo(w * 0.55, hz + u * 10); ctx.lineTo(w * 0.3, hz + u * 9); ctx.lineTo(0, hz + u * 13); ctx.fill();
    for (let i = 0; i < 12; i++) rock(P, R() * w, hz + u * 10 + R() * (h - hz - u * 10), u * (1.5 + R() * 4), { color: "#5a5654" });
    // 翼竜の影と、ひとりで歩く黒い騎士
    flyer(P, w * 0.62, hz - u * 26, u * 5, rgba(P.night ? "#000000" : "#2a2a34", 0.75));
    flyer(P, w * 0.7, hz - u * 22, u * 2.5, rgba(P.night ? "#000000" : "#2a2a34", 0.5));
    const kx = w * 0.42, ky = hz + u * 6.6; ctx.fillStyle = P.c("#141418", 0.3); ctx.fillRect(kx - u * 0.35, ky - u * 2.2, u * 0.7, u * 2.2); ctx.beginPath(); ctx.arc(kx, ky - u * 2.5, u * 0.35, 0, Math.PI * 2); ctx.fill();
    V.frame(P, { color: "#24221e" });
  };
  OUT.mountain.storm = true;

  // ---------------------------------------------------------------- エル・ナフ遺構（草に並ぶ白い柱、崩れた神殿、石段）
  OUT.ruins = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.hills(P, { base: hz, amp: u * 5, d: 0.65, color: "#7a8a5a" });
    V.forestBand(P, { base: hz + u * 1, size: u * 5, d: 0.5, kind: "broad" });
    V.ground(P, { top: hz + u * 1, color: "#6a7a4a", tex: "grass" });
    // 神殿（破風が崩れて、柱が半分残る）
    const tb = hz + u * 5, tw = u * 36, stone = "#d8d0bc";
    for (let i = 0; i < 4; i++) { ctx.fillStyle = P.lit(stone, 0.3 + i * 0.02, 0.15 - i * 0.03); ctx.fillRect(cx - tw / 2 - u * (3 - i), tb - i * u * 0.8, tw + u * (6 - 2 * i), u * 0.8); }
    for (let i = 0; i < 8; i++) { const x = cx - tw / 2 + u * 2 + i * (tw - u * 4) / 7, broken = i === 2 || i === 5 || i === 7; column(P, x, tb - u * 3, u * 2.2, broken ? u * (4 + R() * 6) : u * 15, { d: 0.32, broken }); }
    ctx.fillStyle = P.lit(stone, 0.32, 0.2); ctx.beginPath(); ctx.moveTo(cx - tw / 2, tb - u * 18); ctx.lineTo(cx - u * 2, tb - u * 25); ctx.lineTo(cx + u * 2, tb - u * 23); ctx.lineTo(cx - u * 6, tb - u * 18); ctx.fill();
    ctx.fillRect(cx - tw / 2, tb - u * 18.5, tw * 0.45, u * 1.2);
    // 草の中の白い柱（肋骨のように並ぶ）と、転がった石
    for (let i = 0; i < 10; i++) { const t = R(), y = hz + u * 6 + (h - hz - u * 6) * t, x = (R() < 0.5 ? R() * 0.3 : 0.7 + R() * 0.3) * w, s = u * (1 + t * 3); column(P, x, y, s, s * (3 + R() * 4), { d: 0.25 * (1 - t), broken: true }); }
    for (let i = 0; i < 8; i++) { const t = R(), y = hz + u * 6 + (h - hz - u * 6) * t; rock(P, R() * w, y, u * (1 + t * 3), { color: stone, d: 0.2 * (1 - t), wide: 1.6, tall: 0.5 }); }
    V.road(P, { top: tb, wt: u * 10, wb: w * 0.5, color: "#b8b0a0", cobble: true });
    mist(P, hz + u * 2, 2, P.night ? 0.12 : 0.18, P.haze);
    V.frame(P, { color: "#2a3a1a" });
  };

  // ---------------------------------------------------------------- 竜の墓場（家ほどの肋骨の列、頭骨、骨の山）
  OUT.bones = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u * 1, height: u * 18, d: 0.72, color: "#8a8478", snow: 0.1, scale: 3 });
    V.ground(P, { top: hz, color: "#a49a86", tex: "sand" });
    // 肋骨の列（奥から手前へ二列）
    for (let i = 7; i >= 0; i--) { const t = i / 7, y = hz + u * (2 + (1 - t) * 14), s = u * (8 + (1 - t) * 18), d = 0.55 * t + 0.05; rib(P, cx - u * (6 + (1 - t) * 10), y, s, -1, d); rib(P, cx + u * (6 + (1 - t) * 10), y, s, 1, d); }
    // 背骨
    ctx.fillStyle = P.c("#d8d0bc", 0.4); for (let i = 0; i < 14; i++) { const t = i / 13, y = hz + u * (1 + (1 - t) * 1); ctx.beginPath(); ctx.ellipse(cx + (t - 0.5) * u * 4, y - u * 9 * (1 - t * 0.3), u * 0.8, u * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
    // 巨大な頭骨（左手前）
    const sx = w * 0.18, sy = h - u * 4, S = u * 12;
    const g = ctx.createLinearGradient(sx - S, sy - S, sx + S, sy);
    g.addColorStop(0, P.lit("#e8e0cc", 0, 0.3)); g.addColorStop(1, P.dark("#c8bca4", 0, 0.5));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - S, sy); ctx.quadraticCurveTo(sx - S * 1.1, sy - S * 0.9, sx - S * 0.2, sy - S * 0.95); ctx.quadraticCurveTo(sx + S * 0.6, sy - S * 0.9, sx + S * 1.3, sy - S * 0.35); ctx.lineTo(sx + S * 1.2, sy); ctx.fill();
    ctx.fillStyle = "#1a1612"; ctx.beginPath(); ctx.ellipse(sx - S * 0.2, sy - S * 0.55, S * 0.22, S * 0.17, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.lit("#ece4d0", 0, 0.2); for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(sx + S * (0.2 + i * 0.16), sy - S * 0.25); ctx.lineTo(sx + S * (0.26 + i * 0.16), sy + S * 0.05); ctx.lineTo(sx + S * (0.32 + i * 0.16), sy - S * 0.25); ctx.fill(); }
    ctx.fillStyle = P.dark("#a49a86", 0, 0.4); ctx.beginPath(); ctx.moveTo(sx - S * 0.5, sy - S * 0.9); ctx.quadraticCurveTo(sx - S * 0.9, sy - S * 1.6, sx - S * 0.3, sy - S * 2); ctx.quadraticCurveTo(sx - S * 0.6, sy - S * 1.4, sx - S * 0.2, sy - S * 0.93); ctx.fill();
    // 散らばる骨
    for (let i = 0; i < 30; i++) { const t = R(), y = hz + u * 3 + (h - hz - u * 3) * t, x = R() * w, s = u * (0.4 + t * 2); ctx.strokeStyle = P.c("#e0d8c4", 0.3 * (1 - t)); ctx.lineWidth = s * 0.3; ctx.lineCap = "round"; const a = R() * 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * s, y - Math.sin(a) * s * 0.3); ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s * 0.3); ctx.stroke(); }
    mist(P, hz + u, 3, 0.2, P.haze);
    V.frame(P, { color: "#3a3428" });
  };

  // ---------------------------------------------------------------- 使徒領・灰の荒野（赤い空、降る灰、黒い岩の牙、溶岩の割れ目）
  OUT.realm = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u, height: u * 20, d: 0.6, color: "#2a0e0c", scale: 5 });
    for (let i = 0; i < 9; i++) { const x = R() * w, s = u * (2 + R() * 3), th = u * (8 + R() * 18); ctx.fillStyle = P.c("#1a0808", 0.4); ctx.beginPath(); ctx.moveTo(x - s, hz + u * 2); ctx.quadraticCurveTo(x - s * 0.2, hz - th * 0.5, x + s * 0.6, hz - th); ctx.quadraticCurveTo(x + s * 0.3, hz - th * 0.4, x + s, hz + u * 2); ctx.fill(); }
    V.ground(P, { top: hz + u, color: "#3a2420", tex: "ash" });
    lavaCracks(P, hz + u * 3, 14, "#ff5a1a");
    // 遠くを行き交う魔物の群れ（小さな影）
    ctx.fillStyle = P.c("#0a0404", 0.5); for (let i = 0; i < 20; i++) { const x = w * (0.55 + R() * 0.35), y = hz + u * (1.5 + R()); ctx.fillRect(x, y - u * 0.8, u * 0.4, u * 0.8); }
    for (let i = 0; i < 6; i++) rock(P, R() * w, hz + u * 6 + R() * (h - hz - u * 6), u * (2 + R() * 4), { color: "#2a1614" });
    V.flyer(P, w * 0.3, hz - u * 20, u * 4, "rgba(10,2,2,.8)");
    P.ash = "#c8b8b0";
    V.frame(P, { color: "#100404" });
  };

  // ---------------------------------------------------------------- 腐れ庭園（ありえないほど色鮮やかな花壇、四角い生け垣、塔ほどの植木鋏、花に埋もれた兜）
  OUT.e2_garden = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.hills(P, { base: hz, amp: u * 3, d: 0.65, color: "#5a7a4a" });
    V.ground(P, { top: hz, color: "#4a6a2a", tex: "grass" });
    // 定規で測ったような四角い生け垣
    for (let i = 0; i < 6; i++) { const t = i / 5, y = hz + u * (2 + t * 3), s = u * (3 + t * 3); for (const sd of [-1, 1]) { const x = cx + sd * (u * 14 + t * u * 8 + i * u * 6); const g = ctx.createLinearGradient(0, y - s, 0, y); g.addColorStop(0, P.lit("#3a6a2a", 0.4 * (1 - t), 0.3)); g.addColorStop(1, P.dark("#2a4a1a", 0.4 * (1 - t), 0.3)); ctx.fillStyle = g; ctx.fillRect(x - s, y - s, s * 2, s); } }
    // 花壇（畝ごとに色鮮やかな花。盛り土はどれも人ひとりぶん）
    const bright = ["#ff4a8a", "#ffd23a", "#ff7a2a", "#c04aff", "#4ad8ff", "#ff3a3a"];
    for (let r = 0; r < 7; r++) {
      const t = r / 6, y = hz + u * 6 + (h - hz - u * 6) * Math.pow(t, 1.3), s = 0.4 + t * 1.6;
      for (let i = -6; i <= 6; i++) {
        const x = cx + i * u * 8 * s + (r % 2) * u * 4 * s;
        ctx.fillStyle = P.c("#5a3a24", 0.3 * (1 - t)); ctx.beginPath(); ctx.ellipse(x, y, u * 3.4 * s, u * 0.9 * s, 0, Math.PI, 0); ctx.fill();
        for (let k = 0; k < 10; k++) { ctx.fillStyle = P.c(bright[(i + k + r + 12) % bright.length], 0.2 * (1 - t)); ctx.beginPath(); ctx.arc(x + (R() - 0.5) * u * 6 * s, y - u * 0.6 * s - R() * u * 1.2 * s, u * 0.35 * s, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // 植木鋏（地面に突き立ててある。刃は家より長い）
    const sx = cx + u * 26, sb = hz + u * 10;
    ctx.save(); ctx.translate(sx, sb); ctx.rotate(0.12);
    const blade = (dir) => { const g = ctx.createLinearGradient(-u * 2, 0, u * 2, 0); g.addColorStop(0, P.lit("#c8ccd4", 0.15, 0.4)); g.addColorStop(1, P.dark("#6a6e78", 0.15, 0.3)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dir * u * 1.6, -u * 20); ctx.lineTo(dir * u * 0.2, -u * 22); ctx.lineTo(-dir * u * 0.3, -u * 1); ctx.fill(); };
    blade(-1); blade(1);
    ctx.fillStyle = P.c("#5a3a24", 0.15); ctx.fillRect(-u * 2.4, -u * 32, u * 1.4, u * 10); ctx.fillRect(u * 1, -u * 32, u * 1.4, u * 10);
    ctx.fillStyle = P.c("#3a3a40", 0.15); ctx.beginPath(); ctx.arc(0, -u * 21, u * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 花に埋もれた兜
    const hx = cx - u * 14, hy = h - u * 7;
    ctx.fillStyle = P.lit("#8a8a92", 0, 0.3); ctx.beginPath(); ctx.arc(hx, hy, u * 3, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#141418"; ctx.fillRect(hx - u * 2, hy - u * 1.4, u * 4, u * 0.6);
    for (let k = 0; k < 20; k++) { ctx.fillStyle = P.c(bright[k % bright.length]); ctx.beginPath(); ctx.arc(hx + (R() - 0.5) * u * 9, hy + R() * u * 1.5, u * 0.6, 0, Math.PI * 2); ctx.fill(); }
    mist(P, hz + u * 2, 3, 0.12, "#f0c8e0");
  };

  // ---------------------------------------------------------------- 肉の谷の大厨房（城ほどの厨房、煙突の湯気、突き立った肉叉と包丁、煮汁の川）
  OUT.e2_kitchen = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz, height: u * 14, d: 0.6, color: "#3a1210", scale: 3 });
    V.ground(P, { top: hz, color: "#4a2a20", tex: "dirt" });
    // 厨房（城のような大きな石の建物と煙突）
    const kb = hz + u * 4;
    V.house(P, cx - u * 22, kb, u * 44, u * 18, { wall: "#6a5048", roof: "#2a1a18", roofType: "eave", roofH: u * 5, d: 0.35, stone: true, side: 0, door: false, lit: 0.7 });
    for (const k of [-15, -4, 8, 17]) { ctx.fillStyle = P.c("#4a3430", 0.35); ctx.fillRect(cx + k * u, kb - u * 32, u * 3, u * 10); V.smoke(P, cx + k * u + u * 1.5, kb - u * 32, u * 4, 0.3, "#d8c8c0"); }
    // 人の背丈の勝手口（大きさが分かるように）
    ctx.fillStyle = "#ffb060"; ctx.fillRect(cx + u * 3, kb - u * 1.4, u * 0.7, u * 1.4); V.light(P, cx + u * 3.35, kb - u * 0.7, u * 3, "#ffb060", 0.8);
    // 煮汁の川
    ctx.fillStyle = P.c("#8a4a1a", 0.1); ctx.beginPath(); ctx.moveTo(cx + u * 6, kb); ctx.bezierCurveTo(cx + u * 30, hz + (h - hz) * 0.4, cx - u * 20, hz + (h - hz) * 0.7, cx + u * 2, h); ctx.lineTo(cx + u * 30, h); ctx.bezierCurveTo(cx + u * 5, hz + (h - hz) * 0.7, cx + u * 40, hz + (h - hz) * 0.4, cx + u * 9, kb); ctx.fill();
    for (let i = 0; i < 40; i++) { const t = R(), y = lerp(kb, h, t); ctx.fillStyle = rgba("#e8b060", 0.3); ctx.beginPath(); ctx.ellipse(lerp(cx + u * 8, cx + u * 16, R()) + Math.sin(t * 5) * u * 8, y, u * (0.3 + t), u * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
    // 突き立った肉叉と包丁
    const fork = (x, base, s) => { ctx.fillStyle = P.lit("#8a8a92", 0.1, 0.4); ctx.fillRect(x - s * 0.04, base - s, s * 0.08, s * 0.7); ctx.fillRect(x - s * 0.22, base - s * 0.32, s * 0.44, s * 0.06); for (const k of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(x + k * s - s * 0.025, base - s * 0.3); ctx.lineTo(x + k * s, base); ctx.lineTo(x + k * s + s * 0.025, base - s * 0.3); ctx.fill(); } };
    fork(w * 0.16, hz + (h - hz) * 0.55, u * 30);
    const kx = w * 0.84, kbase = hz + (h - hz) * 0.5;
    ctx.save(); ctx.translate(kx, kbase); ctx.rotate(-0.08);
    const g = ctx.createLinearGradient(-u * 3, 0, u * 3, 0); g.addColorStop(0, P.lit("#d0d4dc", 0.1, 0.4)); g.addColorStop(1, P.dark("#7a7e88", 0.1, 0.3));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-u * 3, 0); ctx.lineTo(-u * 3, -u * 26); ctx.lineTo(u * 3, -u * 22); ctx.lineTo(u * 3, 0); ctx.fill();
    ctx.fillStyle = P.c("#3a2418", 0.1); ctx.fillRect(-u * 1.6, -u * 34, u * 3.2, u * 9);
    ctx.restore();
    P.ash = "#a89088";
  };

  // ---------------------------------------------------------------- 鬼ヶ島（荒れた海の岩の島、角のような二本の岩、鬼の顔の洞窟、宴の灯）
  OUT.onigashima = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.water(P, { top: hz, color: "#1a2a3a", reflect: 0.3 });
    // 白波
    for (let i = 0; i < 60; i++) { const y = hz + Math.pow(R(), 0.7) * (h - hz), dd = P.depth(y); ctx.fillStyle = rgba("#e8eef4", 0.4 + R() * 0.3); ctx.beginPath(); ctx.ellipse(R() * w, y, u * (1 + dd * 6), u * (0.15 + dd * 0.5), 0, Math.PI, 0); ctx.fill(); }
    // 島
    const ib = hz + u * 6;
    const g = ctx.createLinearGradient(0, hz - u * 20, 0, ib);
    g.addColorStop(0, P.lit("#4a3a34", 0.2, 0.25)); g.addColorStop(1, P.dark("#2a201c", 0.2, 0.4));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - u * 34, ib); ctx.quadraticCurveTo(cx - u * 26, hz - u * 8, cx - u * 10, hz - u * 12); ctx.lineTo(cx + u * 12, hz - u * 13); ctx.quadraticCurveTo(cx + u * 28, hz - u * 8, cx + u * 36, ib); ctx.fill();
    // 角のような二本の岩
    for (const s of [-1, 1]) { ctx.fillStyle = P.lit("#5a4440", 0.2, 0.2); ctx.beginPath(); ctx.moveTo(cx + s * u * 14, hz - u * 11); ctx.quadraticCurveTo(cx + s * u * 22, hz - u * 22, cx + s * u * 16, hz - u * 32); ctx.quadraticCurveTo(cx + s * u * 18, hz - u * 20, cx + s * u * 8, hz - u * 12); ctx.fill(); }
    // 洞窟の口（鬼の顔の岩）と、奥の宴の赤い灯
    const mx = cx, my = hz + u * 2;
    ctx.fillStyle = "#0a0404"; ctx.beginPath(); ctx.moveTo(mx - u * 8, my + u * 3); ctx.quadraticCurveTo(mx - u * 9, my - u * 6, mx, my - u * 7); ctx.quadraticCurveTo(mx + u * 9, my - u * 6, mx + u * 8, my + u * 3); ctx.fill();
    const rg = ctx.createRadialGradient(mx, my, 0, mx, my, u * 7); rg.addColorStop(0, "rgba(255,90,40,.75)"); rg.addColorStop(1, "rgba(255,60,20,0)"); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(mx, my, u * 7, 0, Math.PI * 2); ctx.fill();
    V.light(P, mx, my, u * 18, "#ff5a2a", 1.2, true);
    ctx.fillStyle = P.lit("#e8e0cc", 0.2, 0.2); for (let i = 0; i < 7; i++) { const x = mx - u * 6 + i * u * 2; ctx.beginPath(); ctx.moveTo(x - u * 0.6, my - u * 5.5 + Math.abs(i - 3) * u * 0.6); ctx.lineTo(x, my - u * 3.5 + Math.abs(i - 3) * u * 0.6); ctx.lineTo(x + u * 0.6, my - u * 5.5 + Math.abs(i - 3) * u * 0.6); ctx.fill(); }
    for (const s of [-1, 1]) { ctx.fillStyle = "#ffcf40"; ctx.beginPath(); ctx.ellipse(mx + s * u * 6, my - u * 10, u * 1.4, u * 0.8, s * 0.3, 0, Math.PI * 2); ctx.fill(); V.light(P, mx + s * u * 6, my - u * 10, u * 5, "#ffc040", 0.9); }
    // しめ縄
    ctx.strokeStyle = P.c("#d8c8a0", 0.2); ctx.lineWidth = u * 0.8; ctx.beginPath(); ctx.moveTo(mx - u * 9, my - u * 4); ctx.quadraticCurveTo(mx, my - u * 1.5, mx + u * 9, my - u * 4); ctx.stroke();
    ctx.fillStyle = P.c("#f4f0e4", 0.2); for (let i = 0; i < 4; i++) { const x = mx - u * 5 + i * u * 3.4; ctx.fillRect(x, my - u * 2.6, u * 0.7, u * 2); }
    // 転がった酒樽
    V.barrel(P, cx - u * 18, ib - u * 0.5, u * 3.5); V.barrel(P, cx + u * 20, ib, u * 3);
    V.frame(P, { color: "#100c0c" });
  };

  // ---------------------------------------------------------------- 鏖殺の使徒の居城（骨と鉄で組まれた城、開いたままの門）
  OUT.majin = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz, height: u * 16, d: 0.6, color: "#200a0a", scale: 4 });
    V.ground(P, { top: hz, color: "#2a1614", tex: "ash" });
    const cb = hz + u * 4, iron = "#1e1a1c", bone = "#c8bca4";
    // 城の塔（鉄の尖塔に骨の飾り）
    for (const [k, th, tw] of [[-22, 22, 4], [-11, 30, 5], [0, 38, 7], [11, 30, 5], [22, 22, 4]]) {
      const x = cx + k * u;
      const g = ctx.createLinearGradient(x - tw * u / 2, 0, x + tw * u / 2, 0);
      g.addColorStop(0, P.dark(iron, 0.3, 0.3)); g.addColorStop(0.6, P.lit("#4a3a3a", 0.3, 0.3)); g.addColorStop(1, P.dark(iron, 0.3, 0.4));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - tw * u / 2, cb); ctx.lineTo(x - tw * u * 0.35, cb - th * u); ctx.lineTo(x, cb - th * u - tw * u * 1.6); ctx.lineTo(x + tw * u * 0.35, cb - th * u); ctx.lineTo(x + tw * u / 2, cb); ctx.fill();
      for (let i = 0; i < 4; i++) { const y = cb - th * u * (0.3 + i * 0.2); ctx.strokeStyle = P.c(bone, 0.3); ctx.lineWidth = u * 0.3; ctx.beginPath(); ctx.moveTo(x - tw * u * 0.45, y); ctx.quadraticCurveTo(x - tw * u * 0.9, y - u * 2, x - tw * u * 0.7, y - u * 4); ctx.moveTo(x + tw * u * 0.45, y); ctx.quadraticCurveTo(x + tw * u * 0.9, y - u * 2, x + tw * u * 0.7, y - u * 4); ctx.stroke(); }
      V.win(P, x - u * 0.4, cb - th * u * 0.7, u * 0.8, u * 1.6, { d: 0.3, lit: true, col: "#ff4a2a" });
    }
    V.wall(P, cx - u * 30, cx + u * 30, cb, u * 8, { color: "#2a2224", d: 0.3 });
    // 開いたままの門と、奥の灯
    ctx.fillStyle = "#050202"; ctx.beginPath(); ctx.moveTo(cx - u * 4, cb); ctx.lineTo(cx - u * 4, cb - u * 6); ctx.arc(cx, cb - u * 6, u * 4, Math.PI, 0); ctx.lineTo(cx + u * 4, cb); ctx.fill();
    V.light(P, cx, cb - u * 3, u * 10, "#ff3a1a", 1, true);
    // 骨の飾りの道
    for (let i = 0; i < 8; i++) { const t = i / 7, y = lerp(cb + u * 2, h - u * 2, t), s = u * (1 + t * 4); for (const sd of [-1, 1]) { const x = cx + sd * (u * 5 + t * w * 0.3); ctx.fillStyle = P.c("#2a1e1e", 0.2 * (1 - t)); ctx.fillRect(x - s * 0.1, y - s * 3, s * 0.2, s * 3); ctx.fillStyle = P.lit(bone, 0.2 * (1 - t), 0.2); ctx.beginPath(); ctx.arc(x, y - s * 3.2, s * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#100606"; ctx.fillRect(x - s * 0.25, y - s * 3.3, s * 0.18, s * 0.15); ctx.fillRect(x + s * 0.07, y - s * 3.3, s * 0.18, s * 0.15); } }
    lavaCracks(P, cb + u * 3, 8, "#ff4a1a");
    P.ash = "#b0a0a0";
  };

  // ---------------------------------------------------------------- エルヴィナの地下墓地の入口（墓標の丘、骨の口を開けた霊廟、糸杉）
  OUT.w1_catacomb = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.hills(P, { base: hz, amp: u * 6, d: 0.6, color: "#5a6a50" });
    // 糸杉
    for (let i = 0; i < 7; i++) { const x = w * (0.08 + i * 0.14) + (R() - 0.5) * u * 4, y = hz + u * (1 + R() * 2), s = u * (7 + R() * 5); ctx.fillStyle = P.dark("#2a3a2a", 0.45, 0.3); ctx.beginPath(); ctx.ellipse(x, y - s, s * 0.2, s, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = P.lit("#3a4a34", 0.45, 0.2); ctx.beginPath(); ctx.ellipse(x + P.ldir * s * 0.05, y - s * 1.05, s * 0.1, s * 0.85, 0, 0, Math.PI * 2); ctx.fill(); }
    V.ground(P, { top: hz + u * 1, color: "#5a6448", tex: "grass" });
    // 霊廟（骨の口）
    const mb = hz + u * 8, stone = "#a8a49a";
    V.house(P, cx - u * 10, mb, u * 20, u * 10, { wall: stone, roof: "#6a6660", roofType: "gable", roofH: u * 4, d: 0.25, stone: true, side: 0, door: false, windows: false });
    for (const k of [-7, -3.5, 3.5, 7]) column(P, cx + k * u, mb, u * 1.4, u * 9, { d: 0.22, color: "#c8c4b8", ivy: false });
    ctx.fillStyle = "#060504"; ctx.beginPath(); ctx.moveTo(cx - u * 2.6, mb); ctx.lineTo(cx - u * 2.6, mb - u * 4.5); ctx.arc(cx, mb - u * 4.5, u * 2.6, Math.PI, 0); ctx.lineTo(cx + u * 2.6, mb); ctx.fill();
    ctx.fillStyle = P.lit("#e8e0cc", 0.2, 0.2); ctx.beginPath(); ctx.arc(cx, mb - u * 8.6, u * 1.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#100c0a"; ctx.fillRect(cx - u * 0.8, mb - u * 9, u * 0.5, u * 0.5); ctx.fillRect(cx + u * 0.3, mb - u * 9, u * 0.5, u * 0.5);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = P.lit("#e8e0cc", 0.2, 0.2); ctx.beginPath(); ctx.moveTo(cx - u * 2.4 + i * u * 0.6, mb - u * 6.8); ctx.lineTo(cx - u * 2.1 + i * u * 0.6, mb - u * 5.6); ctx.lineTo(cx - u * 1.8 + i * u * 0.6, mb - u * 6.8); ctx.fill(); }
    V.light(P, cx, mb - u * 2, u * 6, "#c84a2a", 0.6, true);
    // 墓標の丘
    for (let i = 0; i < 28; i++) { const t = R(), y = hz + u * 3 + (h - hz - u * 3) * Math.pow(t, 0.8), x = R() * w; if (Math.abs(x - cx) < u * 10 && y < mb + u * 3) continue; grave(P, x, y, u * (1.2 + P.depth(y) * 6), { d: 0.3 * (1 - P.depth(y)) }); }
    for (let i = 0; i < 3; i++) V.candle(P, cx + (i - 1) * u * 4, mb + u * 1, u * 0.8);
    mist(P, hz + u * 4, 4, P.night ? 0.2 : 0.28, "#b4c8be");
    V.frame(P, { color: "#1a2018" });
  };

  // ---------------------------------------------------------------- 懺悔の谷（切り立った雪の谷の底に、屋根のない町が埋もれている）
  OUT.w2_echo = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    P.season = "winter";
    V.mountains(P, { base: hz, height: u * 12, d: 0.75, color: "#8a94a8", snow: 0.7 });
    // 谷の両側の崖
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 0 : w, edge = cx + s * u * 16;
      const g = ctx.createLinearGradient(x0, 0, edge, 0);
      g.addColorStop(0, P.dark("#4a505c", 0, 0.4)); g.addColorStop(1, s === P.ldir ? P.lit("#7a8090", 0.1, 0.3) : P.dark("#5a606c", 0.1, 0.4));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, h);
      const f = noise(R, 32);
      for (let k = 0; k <= 20; k++) { const t = k / 20, y = h - t * h; ctx.lineTo(lerp(edge + s * u * 4, edge - s * u * 6, Math.pow(t, 0.5)) + (f(k) - 0.5) * u * 6, y); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = P.lit("#f2f6fb", 0.1, 0.2);
      for (let k = 0; k < 14; k++) { const y = R() * h, x = lerp(x0, edge, 0.4 + R() * 0.6); ctx.beginPath(); ctx.ellipse(x, y, u * (2 + R() * 4), u * 0.5, 0, Math.PI, 0); ctx.fill(); }
    }
    V.ground(P, { top: hz + u * 2, color: "#e8eef4", tex: "snow", noSnow: true });
    // 屋根のない町（雪に半ば埋もれた壁）
    for (let i = 0; i < 9; i++) {
      const t = i / 8, y = hz + u * 3 + (h - hz - u * 6) * t * 0.7, bw = u * (3 + t * 8), x = cx + (i % 2 ? 1 : -1) * u * (3 + t * 10) - bw / 2, bh = bw * (0.6 + R() * 0.4);
      V.house(P, x, y, bw, bh, { wall: "#6a6460", roofType: "flat", d: 0.35 * (1 - t), stone: true, door: false, windows: true, lit: 0, side: 0.05 });
      ctx.fillStyle = P.lit("#f2f6fb", 0.3 * (1 - t), 0.2); ctx.beginPath(); ctx.ellipse(x + bw / 2, y, bw * 0.75, bh * 0.25, 0, Math.PI, 0); ctx.fill();
    }
    V.frame(P, { color: "#3a4048" });
  };

  // ---------------------------------------------------------------- 影の谷（崩れた壁と石畳に、人の影だけが焼き付いている）
  OUT.w2_shadow = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz, height: u * 12, d: 0.7, color: "#7a7468", snow: 0.1 });
    V.ground(P, { top: hz, color: "#8a8478", tex: "dirt" });
    V.road(P, { top: hz + u * 2, wt: u * 8, wb: w * 0.9, color: "#9a9488", cobble: true });
    // 崩れた壁（上の縁がぎざぎざ）
    const wallPiece = (x, base, ww, wh, d) => {
      const g = ctx.createLinearGradient(x, 0, x + ww, 0);
      g.addColorStop(0, P.lit("#b8b0a0", d, 0.3)); g.addColorStop(1, P.dark("#8a8478", d, 0.4));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - wh * (0.6 + R() * 0.4));
      for (let k = 1; k <= 6; k++) ctx.lineTo(x + (k / 6) * ww, base - wh * (0.3 + R() * 0.7));
      ctx.lineTo(x + ww, base); ctx.fill();
      // 焼き付いた人の影
      const sx = x + ww * (0.3 + R() * 0.4), s = wh * 0.55;
      ctx.fillStyle = rgba("#1a1814", 0.55 * (1 - d * 0.6));
      ctx.beginPath(); ctx.arc(sx, base - s * 0.92, s * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx - s * 0.14, base - s * 0.8); ctx.lineTo(sx + s * 0.14, base - s * 0.8); ctx.lineTo(sx + s * 0.12, base - s * 0.35); ctx.lineTo(sx + s * 0.16, base); ctx.lineTo(sx + s * 0.04, base); ctx.lineTo(sx, base - s * 0.3); ctx.lineTo(sx - s * 0.04, base); ctx.lineTo(sx - s * 0.16, base); ctx.lineTo(sx - s * 0.12, base - s * 0.35); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx + s * 0.12, base - s * 0.75); ctx.lineTo(sx + s * 0.4, base - s * 0.95); ctx.lineTo(sx + s * 0.42, base - s * 0.9); ctx.lineTo(sx + s * 0.14, base - s * 0.62); ctx.fill();
    };
    for (let i = 0; i < 8; i++) { const t = i / 7, y = hz + u * 3 + (h - hz - u * 3) * t * 0.85, ww = u * (5 + t * 16), x = (i % 2 ? cx + u * (4 + t * 16) : cx - u * (4 + t * 16) - ww); wallPiece(x, y, ww, ww * 0.7, 0.4 * (1 - t)); }
    // 石畳の上の影（倒れた人の形）
    for (let i = 0; i < 4; i++) { const t = 0.3 + i * 0.18, y = hz + (h - hz) * t, x = cx + (R() - 0.5) * w * 0.3, s = u * (2 + t * 6); ctx.fillStyle = rgba("#1a1814", 0.4); ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.18, R() - 0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x - s, y - s * 0.05, s * 0.18, 0, Math.PI * 2); ctx.fill(); }
    mist(P, hz + u * 2, 2, 0.15, "#b8b4ac");
    V.frame(P, { color: "#2a2620" });
  };

  // ---------------------------------------------------------------- 酸の谷（緑の湯気、光る酸の溜まり、膝をついた鉄の巨人たち）
  OUT.w2_acid = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz + u * 2, height: u * 22, d: 0.55, color: "#4a5048", snow: 0.05, scale: 2.5 });
    V.ground(P, { top: hz + u, color: "#4a4a3a", tex: "rock" });
    // 酸の溜まり
    for (let i = 0; i < 5; i++) { const t = R(), y = hz + u * 4 + (h - hz - u * 6) * t, x = R() * w, s = u * (3 + t * 10); const g = ctx.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, "rgba(180,255,90,.85)"); g.addColorStop(1, "rgba(60,140,30,.6)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.25, 0, 0, Math.PI * 2); ctx.fill(); V.light(P, x, y, s * 2, "#9aff4a", 0.7, true); }
    // 膝をついた鉄の巨人
    const giant = (x, base, s, d) => {
      const rust = "#6a4a34", iron = "#4a4a50";
      const C = (c) => P.c(c, d), L = (c) => P.lit(c, d, 0.3);
      ctx.fillStyle = C(iron); ctx.beginPath(); ctx.ellipse(x + s * 0.2, base - s * 0.1, s * 0.35, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C(rust); ctx.fillRect(x - s * 0.3, base - s * 0.45, s * 0.18, s * 0.45);
      ctx.fillStyle = L(iron); ctx.beginPath(); ctx.moveTo(x - s * 0.35, base - s * 0.4); ctx.lineTo(x + s * 0.35, base - s * 0.4); ctx.lineTo(x + s * 0.3, base - s * 1.05); ctx.lineTo(x - s * 0.3, base - s * 1.05); ctx.fill();
      ctx.fillStyle = C(rust); ctx.fillRect(x - s * 0.12, base - s * 0.9, s * 0.24, s * 0.3);
      ctx.fillStyle = "#9aff4a"; ctx.fillRect(x - s * 0.08, base - s * 0.86, s * 0.16, s * 0.04);
      ctx.fillStyle = L(iron); ctx.beginPath(); ctx.arc(x, base - s * 1.15, s * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C(iron); ctx.beginPath(); ctx.moveTo(x - s * 0.3, base - s * 1); ctx.lineTo(x - s * 0.55, base - s * 0.5); ctx.lineTo(x - s * 0.45, base - s * 0.1); ctx.lineTo(x - s * 0.38, base - s * 0.5); ctx.lineTo(x - s * 0.22, base - s * 0.9); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + s * 0.3, base - s * 1); ctx.lineTo(x + s * 0.5, base - s * 0.55); ctx.lineTo(x + s * 0.45, base - s * 0.15); ctx.lineTo(x + s * 0.36, base - s * 0.55); ctx.lineTo(x + s * 0.22, base - s * 0.9); ctx.fill();
      ctx.fillStyle = rgba("#6aa040", 0.25); ctx.fillRect(x - s * 0.3, base - s * 0.7, s * 0.6, s * 0.3);
    };
    giant(cx - u * 22, hz + u * 8, u * 16, 0.35); giant(cx + u * 24, hz + u * 6, u * 12, 0.45); giant(cx + u * 6, hz + u * 3, u * 8, 0.55);
    for (let i = 0; i < 5; i++) V.smoke(P, R() * w, hz + u * (4 + R() * 10), u * 5, 0.2, "#b4d89a");
    mist(P, hz, 4, 0.25, "#b4d89a");
    for (let i = 0; i < 8; i++) rock(P, R() * w, hz + u * 10 + R() * (h - hz - u * 10), u * (2 + R() * 3), { color: "#4a4a3a" });
    V.frame(P, { color: "#1a1e14" });
  };
})(globalThis.G = globalThis.G || {});
