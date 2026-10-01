// 背景の絵（V2）：町。国ごとに見た目を変える（王国は白い城壁、帝国は雪と黒鉄、共和国は魔法の塔、
// ブランデールは市場、ヴァレンツァは港と霧、エルヴィナは聖堂、八雲は和風）。道具は scene_v2.js の G.SV2
(function (G) {
  const V = G.SV2;
  if (!V) return;
  const { mix, rgba, clamp, lerp } = V;
  const OUT = V.OUT;

  // ---------------------------------------------------------------- 町の小道具
  // 街灯（夕と夜は灯る）
  function lamp(P, x, base, s, o) {
    const { ctx } = P;
    o = o || {};
    const on = o.on != null ? o.on : P.night || P.dusk || P.overcast;
    ctx.fillStyle = P.dark("#1e1a18", 0, 0.2);
    ctx.fillRect(x - s * 0.03, base - s, s * 0.06, s);
    ctx.fillRect(x - s * 0.08, base - s * 0.04, s * 0.16, s * 0.04);
    ctx.fillRect(x - s * 0.08, base - s * 1.02, s * 0.16, s * 0.03);
    ctx.fillStyle = on ? mix(o.col || "#ffc66a", "#fff4d0", 0.3) : P.c("#5a6068");
    ctx.beginPath(); ctx.moveTo(x - s * 0.07, base - s * 1.18); ctx.lineTo(x + s * 0.07, base - s * 1.18); ctx.lineTo(x + s * 0.05, base - s * 1.02); ctx.lineTo(x - s * 0.05, base - s * 1.02); ctx.fill();
    ctx.fillStyle = P.dark("#1e1a18", 0, 0.2);
    ctx.beginPath(); ctx.moveTo(x - s * 0.1, base - s * 1.18); ctx.lineTo(x, base - s * 1.27); ctx.lineTo(x + s * 0.1, base - s * 1.18); ctx.fill();
    if (on) V.light(P, x, base - s * 1.1, s * 2.4, o.col || "#ffc66a", 1.1, true);
  }
  // 提灯（八雲。赤い紙に墨の字）
  function lantern(P, x, y, s, o) {
    const { ctx } = P;
    o = o || {};
    const on = o.on != null ? o.on : P.night || P.dusk || P.overcast || o.always;
    const col = o.col || "#d8402a";
    const g = ctx.createRadialGradient(x - s * 0.15, y - s * 0.1, 0, x, y, s * 0.6);
    g.addColorStop(0, on ? "#ffd8a0" : P.lit(col, 0, 0.3)); g.addColorStop(1, on ? col : P.dark(col, 0, 0.3));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s * 0.42, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1010"; ctx.fillRect(x - s * 0.3, y - s * 0.6, s * 0.6, s * 0.1); ctx.fillRect(x - s * 0.3, y + s * 0.5, s * 0.6, s * 0.1);
    ctx.strokeStyle = rgba("#2a1010", 0.35); ctx.lineWidth = 0.7;
    for (const k of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.moveTo(x - s * 0.4, y + k * s * 1.6); ctx.lineTo(x + s * 0.4, y + k * s * 1.6); ctx.stroke(); }
    if (on) V.light(P, x, y, s * 4, mix(col, "#ffb060", 0.5), 1, true);
  }
  // 市場の屋台（縞の日除け、木箱、果物）
  function stall(P, x, base, s, col, d) {
    const { ctx, R } = P;
    const c2 = "#f2ead8";
    ctx.fillStyle = P.dark("#4a3020", d, 0.3);
    ctx.fillRect(x - s * 0.5, base - s * 0.9, s * 0.04, s * 0.9); ctx.fillRect(x + s * 0.46, base - s * 0.9, s * 0.04, s * 0.9);
    // 台
    ctx.fillStyle = P.c("#6a4628", d); ctx.fillRect(x - s * 0.52, base - s * 0.38, s * 1.04, s * 0.38);
    ctx.fillStyle = P.lit("#8a6038", d); ctx.fillRect(x - s * 0.55, base - s * 0.42, s * 1.1, s * 0.06);
    // 品物
    const goods = ["#d8402a", "#e8a030", "#7aa040", "#a03a6a", "#e8d070"];
    for (let i = 0; i < 9; i++) { ctx.fillStyle = P.c(goods[Math.floor(R() * goods.length)], d); ctx.beginPath(); ctx.arc(x - s * 0.42 + i * s * 0.105, base - s * 0.46, s * 0.05, 0, Math.PI * 2); ctx.fill(); }
    // 日除け（縞）
    const n = 6, top = base - s * 1.05;
    for (let i = 0; i < n; i++) {
      const x0 = x - s * 0.62 + (i * s * 1.24) / n, x1 = x0 + s * 1.24 / n;
      ctx.fillStyle = i % 2 ? P.lit(c2, d, 0.2) : P.lit(col, d, 0.2);
      ctx.beginPath(); ctx.moveTo(x0 + s * 0.06, top - s * 0.18); ctx.lineTo(x1 + s * 0.06, top - s * 0.18); ctx.lineTo(x1, top + s * 0.08); ctx.lineTo(x0, top + s * 0.08); ctx.fill();
      ctx.fillStyle = i % 2 ? P.dark(c2, d, 0.3) : P.dark(col, d, 0.3);
      ctx.beginPath(); ctx.moveTo(x0, top + s * 0.08); ctx.lineTo(x1, top + s * 0.08); ctx.quadraticCurveTo((x0 + x1) / 2, top + s * 0.2, x0, top + s * 0.08); ctx.fill();
    }
    ctx.fillStyle = rgba(P.shadowC, 0.3 * (1 - d)); ctx.fillRect(x - s * 0.52, top + s * 0.08, s * 1.04, s * 0.12);
    if (P.night || P.dusk) { V.light(P, x, base - s * 0.6, s * 1.6, "#ffb050", 0.8, true); }
  }
  // 家と家のあいだに渡した小旗の綱
  function bunting(P, x0, y0, x1, y1, sag, cols) {
    const { ctx } = P;
    ctx.strokeStyle = P.dark("#2a2018", 0, 0.2); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
    const n = Math.max(4, Math.round(Math.abs(x1 - x0) / (P.u * 2)));
    for (let i = 1; i < n; i++) {
      const t = i / n, x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * (x0 + x1) / 2 + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * ((y0 + y1) / 2 + sag * 2) + t * t * y1;
      const s = P.u * 0.9 * (0.6 + Math.abs(y - P.hz) / P.h);
      ctx.fillStyle = P.lit(cols[i % cols.length], 0, 0.2);
      ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x + s * 0.5, y); ctx.lineTo(x, y + s * 1.1); ctx.fill();
    }
  }
  // 手前の大きな家（左右の端。中央は空ける）
  function nearHouses(P, o) {
    const { u, w, h, R } = P;
    const pick = (v) => (Array.isArray(v) ? v[Math.floor(R() * v.length)] : v);
    const s = o.size || 22;
    // 左
    const lw = u * s * 0.9, lh = u * s * (o.tall || 1.15);
    V.house(P, -u * s * 0.35, h * 1.02, lw, lh, Object.assign({}, o.house, { wall: pick(o.walls), roof: pick(o.roofs), roofType: o.roofType || "eave", sign: o.signs ? pick(o.signs) : null, chimney: true, side: 0.16 }));
    // 右
    const rw = u * s * 0.85, rh = u * s * (o.tall || 1.15) * 0.92;
    V.house(P, w - rw + u * s * 0.3, h * 1.02, rw, rh, Object.assign({}, o.house, { wall: pick(o.walls), roof: pick(o.roofs), roofType: o.roofType || "eave", sign: o.signs ? pick(o.signs) : null, chimney: true, side: 0.16 }));
    return { lx: -u * s * 0.35 + lw, rx: w - rw + u * s * 0.3 };
  }
  // 遠景（山か丘）・地面・道・中景の家並み・手前の家と街灯、の町の型
  function townScene(P, o) {
    const { u, w, h, hz, cx } = P;
    if (o.mountains !== false) V.mountains(P, Object.assign({ base: hz - u * 1, height: u * 13, d: 0.82, color: "#6a7890", snow: 0.3 }, o.mountains));
    if (o.hills !== false) V.hills(P, Object.assign({ base: hz + u * 0.5, amp: u * 4, d: 0.6, color: "#6a8650" }, o.hills));
    V.ground(P, Object.assign({ top: hz, color: "#7a7462", tex: "dirt" }, o.ground));
    if (o.back) o.back();
    // 遠い家並み
    V.houseRow(P, Object.assign({ base: hz + u * 0.8, size: 3.4, d: 0.55, chimney: 0.3 }, o.row, o.far));
    if (o.landmark) o.landmark();
    V.road(P, Object.assign({ top: hz + u * 2, wt: u * 6, wb: w * 0.75, cobble: true, color: "#8a8276" }, o.road));
    // 中景の家並み（道の両側）
    const gap = [cx - u * 6, cx + u * 6];
    V.houseRow(P, Object.assign({ base: hz + u * 4.5, size: 6.5, d: 0.28, gap, chimney: 0.4 }, o.row, o.mid));
    if (o.middle) o.middle();
    const near = nearHouses(P, Object.assign({}, o.row, o.near));
    // 街灯
    if (o.lamps !== false) {
      lamp(P, lerp(cx, near.lx, 0.55), hz + (h - hz) * 0.55, u * 9, o.lampOpt);
      lamp(P, lerp(cx, near.rx, 0.6), hz + (h - hz) * 0.62, u * 10, o.lampOpt);
      lamp(P, lerp(cx, near.lx, 0.3), hz + (h - hz) * 0.22, u * 5, o.lampOpt);
      lamp(P, lerp(cx, near.rx, 0.3), hz + (h - hz) * 0.25, u * 5.5, o.lampOpt);
    }
    if (o.front) o.front(near);
    return near;
  }
  // 植木鉢・花の箱（王都）
  function flowers(P, x, y, s, d) {
    const { ctx, R } = P;
    ctx.fillStyle = P.dark("#8a4a2a", d, 0.2); ctx.fillRect(x - s, y - s * 0.4, s * 2, s * 0.4);
    const cols = P.season === "winter" ? ["#e8eef4"] : ["#e83a5a", "#f8d040", "#f07ab0", "#ffffff", "#c04ae0"];
    for (let i = 0; i < 12; i++) { ctx.fillStyle = P.c(cols[Math.floor(R() * cols.length)], d); ctx.beginPath(); ctx.arc(x - s * 0.9 + R() * s * 1.8, y - s * 0.45 - R() * s * 0.5, s * 0.16, 0, Math.PI * 2); ctx.fill(); }
  }
  // 帆船
  function ship(P, x, base, s, o) {
    const { ctx, R } = P;
    o = o || {};
    const d = o.d || 0, hull = o.hull || "#4a3022", sail = o.sail || "#e8e0cc";
    // 帆柱と帆
    ctx.strokeStyle = P.dark("#2a1e14", d, 0.2); ctx.lineWidth = Math.max(1, s * 0.025);
    const masts = o.masts || 2;
    for (let m = 0; m < masts; m++) {
      const mx = x + (m - (masts - 1) / 2) * s * 0.45, mh = s * (1.25 - Math.abs(m - (masts - 1) / 2) * 0.25);
      ctx.beginPath(); ctx.moveTo(mx, base - s * 0.1); ctx.lineTo(mx, base - mh); ctx.stroke();
      for (let k = 0; k < 2; k++) {
        const sy = base - mh * (0.92 - k * 0.42), sw = s * (0.22 - k * 0.02), sh = mh * 0.34;
        const g = ctx.createLinearGradient(mx - sw, 0, mx + sw, 0);
        g.addColorStop(P.ldir < 0 ? 0 : 1, P.lit(sail, d, 0.3)); g.addColorStop(P.ldir < 0 ? 1 : 0, P.dark(sail, d, 0.3));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(mx - sw, sy); ctx.quadraticCurveTo(mx, sy - sh * 0.08, mx + sw, sy); ctx.quadraticCurveTo(mx + sw * 1.15, sy + sh * 0.5, mx + sw * 0.9, sy + sh); ctx.lineTo(mx - sw * 0.9, sy + sh); ctx.quadraticCurveTo(mx - sw * 1.15, sy + sh * 0.5, mx - sw, sy); ctx.fill();
      }
    }
    ctx.lineWidth = 0.6; ctx.strokeStyle = rgba(P.dark("#2a1e14", d), 0.6);
    ctx.beginPath(); ctx.moveTo(x - s * 0.7, base - s * 0.15); ctx.lineTo(x - s * 0.22, base - s * 1.2); ctx.lineTo(x + s * 0.7, base - s * 0.2); ctx.stroke();
    // 船体
    const g = ctx.createLinearGradient(0, base - s * 0.25, 0, base + s * 0.08);
    g.addColorStop(0, P.lit(hull, d, 0.25)); g.addColorStop(1, P.dark(hull, d, 0.5));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - s * 0.75, base - s * 0.28); ctx.lineTo(x + s * 0.7, base - s * 0.22); ctx.quadraticCurveTo(x + s * 0.6, base + s * 0.05, x + s * 0.4, base + s * 0.06); ctx.lineTo(x - s * 0.5, base + s * 0.06); ctx.quadraticCurveTo(x - s * 0.7, base, x - s * 0.75, base - s * 0.28); ctx.fill();
    ctx.fillStyle = P.lit("#c8a060", d, 0.2); ctx.fillRect(x - s * 0.7, base - s * 0.2, s * 1.35, s * 0.02);
    for (let i = 0; i < 5; i++) V.win(P, x - s * 0.45 + i * s * 0.2, base - s * 0.14, s * 0.05, s * 0.05, { d, p: 0.5 });
    if (P.night || P.dusk) { V.light(P, x + s * 0.65, base - s * 0.5, s * 1.2, "#ffc070", 0.9, true); }
  }
  // 鳥居
  function torii(P, x, base, s, d, col) {
    const { ctx } = P;
    col = col || "#c8321e";
    const L = P.lit(col, d, 0.25), Dk = P.dark(col, d, 0.4);
    const post = (px) => { const g = ctx.createLinearGradient(px - s * 0.05, 0, px + s * 0.05, 0); g.addColorStop(0, P.ldir < 0 ? L : Dk); g.addColorStop(1, P.ldir < 0 ? Dk : L); ctx.fillStyle = g; ctx.fillRect(px - s * 0.05, base - s, s * 0.1, s); ctx.fillStyle = P.dark("#1a1414", d, 0.2); ctx.fillRect(px - s * 0.06, base - s * 0.08, s * 0.12, s * 0.08); };
    post(x - s * 0.36); post(x + s * 0.36);
    ctx.fillStyle = L; ctx.fillRect(x - s * 0.48, base - s * 0.78, s * 0.96, s * 0.07);
    ctx.fillStyle = P.dark("#1a1414", d, 0.2);
    ctx.beginPath(); ctx.moveTo(x - s * 0.66, base - s * 0.98); ctx.quadraticCurveTo(x, base - s * 0.9, x + s * 0.66, base - s * 0.98); ctx.lineTo(x + s * 0.6, base - s * 1.06); ctx.quadraticCurveTo(x, base - s * 1.0, x - s * 0.6, base - s * 1.06); ctx.fill();
    ctx.fillStyle = L; ctx.beginPath(); ctx.moveTo(x - s * 0.6, base - s * 0.9); ctx.quadraticCurveTo(x, base - s * 0.84, x + s * 0.6, base - s * 0.9); ctx.lineTo(x + s * 0.58, base - s * 0.98); ctx.quadraticCurveTo(x, base - s * 0.92, x - s * 0.58, base - s * 0.98); ctx.fill();
    ctx.fillStyle = Dk; ctx.fillRect(x - s * 0.04, base - s * 0.9, s * 0.08, s * 0.13);
  }
  // 五重塔
  function pagoda(P, x, base, s, d) {
    const { ctx } = P;
    for (let i = 0; i < 5; i++) {
      const tw = s * (0.36 - i * 0.045), y = base - i * s * 0.26;
      ctx.fillStyle = P.dark("#8a2a1a", d, 0.2); ctx.fillRect(x - tw * 0.6, y - s * 0.18, tw * 1.2, s * 0.18);
      V.win(P, x - tw * 0.15, y - s * 0.14, tw * 0.3, s * 0.08, { d, p: 0.7, col: "#ffb060" });
      const ry = y - s * 0.17, rw = tw * 1.35;
      const g = ctx.createLinearGradient(x - rw, 0, x + rw, 0);
      g.addColorStop(P.ldir < 0 ? 0 : 1, P.lit("#3a3a40", d, 0.3)); g.addColorStop(P.ldir < 0 ? 1 : 0, P.dark("#3a3a40", d, 0.4));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - rw, ry + s * 0.02); ctx.quadraticCurveTo(x - rw * 0.6, ry - s * 0.02, x - tw * 0.55, ry - s * 0.1); ctx.lineTo(x + tw * 0.55, ry - s * 0.1); ctx.quadraticCurveTo(x + rw * 0.6, ry - s * 0.02, x + rw, ry + s * 0.02); ctx.closePath(); ctx.fill();
      if (P.season === "winter") { ctx.fillStyle = P.lit("#f2f6fb", d, 0.2); ctx.fillRect(x - tw * 0.55, ry - s * 0.11, tw * 1.1, s * 0.03); }
    }
    ctx.strokeStyle = P.dark("#c8a040", d, 0.1); ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath(); ctx.moveTo(x, base - s * 1.3); ctx.lineTo(x, base - s * 1.65); ctx.stroke();
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - s * 0.04, base - s * (1.35 + i * 0.05)); ctx.lineTo(x + s * 0.04, base - s * (1.35 + i * 0.05)); ctx.stroke(); }
  }
  // 桜（八雲。春は花、秋は紅葉）
  function sakura(P, x, base, s, d) {
    const cols = P.season === "spring" ? ["#f4c0cc", "#f8d8e0", "#ffeef2", "#d898a8"] : P.season === "autumn" ? ["#c8281a", "#e8502a", "#f08a3a", "#901a10"] : null;
    V.tree(P, x, base, s, { d, leaves: cols, wide: 0.5, trunk: "#3a2a24" });
  }
  // 浮かぶ結晶（共和国）
  function crystal(P, x, y, s, col, d) {
    const { ctx } = P;
    const g = ctx.createLinearGradient(x - s * 0.5, y - s, x + s * 0.5, y + s);
    g.addColorStop(0, mix(col, "#ffffff", 0.7)); g.addColorStop(0.5, col); g.addColorStop(1, mix(col, "#10183a", 0.6));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y - s * 1.5); ctx.lineTo(x + s * 0.55, y - s * 0.2); ctx.lineTo(x, y + s * 1.2); ctx.lineTo(x - s * 0.55, y - s * 0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba("#ffffff", 0.35); ctx.beginPath(); ctx.moveTo(x, y - s * 1.5); ctx.lineTo(x - s * 0.55, y - s * 0.2); ctx.lineTo(x - s * 0.1, y - s * 0.1); ctx.fill();
    V.light(P, x, y, s * 6, col, 0.9 * (1 - d * 0.5), true);
    P.anim.push({ draw: (c, t) => { const a = 0.2 + Math.sin(t * 1.7 + x) * 0.15; c.save(); c.globalCompositeOperation = "lighter"; const gg = c.createRadialGradient(x, y, 0, x, y, s * 2.5); gg.addColorStop(0, rgba(col, a)); gg.addColorStop(1, rgba(col, 0)); c.fillStyle = gg; c.fillRect(x - s * 2.5, y - s * 2.5, s * 5, s * 5); c.restore(); } });
  }
  // 風車（羽根は毎コマ回る）
  function windmill(P, x, base, s, d) {
    const { ctx } = P;
    const g = ctx.createLinearGradient(x - s * 0.2, 0, x + s * 0.2, 0);
    g.addColorStop(P.ldir < 0 ? 0 : 1, P.lit("#e8dcc4", d, 0.3)); g.addColorStop(P.ldir < 0 ? 1 : 0, P.dark("#c8b898", d, 0.4));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * 0.2, base); ctx.lineTo(x - s * 0.13, base - s * 0.8); ctx.lineTo(x + s * 0.13, base - s * 0.8); ctx.lineTo(x + s * 0.2, base); ctx.fill();
    ctx.fillStyle = P.dark("#6a3a28", d, 0.2); ctx.beginPath(); ctx.moveTo(x - s * 0.17, base - s * 0.8); ctx.lineTo(x, base - s * 1.0); ctx.lineTo(x + s * 0.17, base - s * 0.8); ctx.fill();
    V.win(P, x - s * 0.03, base - s * 0.55, s * 0.06, s * 0.09, { d, p: 0.6 });
    ctx.fillStyle = P.dark("#3a2a1e", d, 0.3); ctx.fillRect(x - s * 0.05, base - s * 0.14, s * 0.1, s * 0.14);
    const hx = x, hy = base - s * 0.86, sail = P.c("#e8e0cc", d), frame = P.dark("#4a3624", d, 0.2);
    P.anim.push({ draw: (c, t) => {
      const a0 = t * 0.6 + x;
      c.save(); c.translate(hx, hy);
      for (let i = 0; i < 4; i++) {
        c.rotate(Math.PI / 2 + (i === 0 ? a0 : 0));
        c.fillStyle = frame; c.fillRect(-s * 0.012, 0, s * 0.024, s * 0.62);
        c.fillStyle = sail; c.fillRect(s * 0.015, s * 0.12, s * 0.11, s * 0.48);
      }
      c.fillStyle = frame; c.beginPath(); c.arc(0, 0, s * 0.03, 0, Math.PI * 2); c.fill();
      c.restore();
    } });
  }
  Object.assign(V, { lamp, lantern, stall, bunting, nearHouses, townScene, flowers, ship, torii, pagoda, sakura, crystal, windmill });

  // ---------------------------------------------------------------- 王都レオネスト（白い城壁と青い屋根の王城。花で飾った大通り）
  OUT.castle = (P) => {
    const { u, w, h, hz, cx, R } = P;
    const white = "#eee8da", blue = "#3a5a9a";
    townScene(P, {
      mountains: { color: "#7888a4", height: u * 12, snow: 0.35 },
      hills: { color: "#6a9050", amp: u * 5 },
      ground: { color: "#8a8a6a", tex: "grass" },
      row: { walls: ["#f2ece0", "#e8dcc8", "#f6f2e8", "#e2d6c0"], roofs: ["#b4523a", "#c8683e", "#9a3e2c", "#d07a48"], house: { timber: null } },
      far: { size: 3, base: hz + u * 1.4 },
      road: { color: "#a49a88" },
      landmark: () => {
        const cb = hz - u * 0.5;
        // 外の城壁と塔
        V.wall(P, cx - u * 30, cx + u * 30, cb + u * 1.5, u * 6, { color: white, d: 0.42 });
        for (const k of [-30, -18, 18, 30]) V.tower(P, cx + k * u, cb + u * 1.5, u * 3.6, u * 9, { wall: white, roof: blue, d: 0.42, flag: k % 2 ? "#c83a2a" : "#e8c040" });
        // 本丸
        const kw = u * 18;
        V.house(P, cx - kw / 2, cb - u * 3.5, kw, u * 9, { wall: white, roof: blue, roofType: "steep", roofH: u * 3, d: 0.38, stone: true, side: 0, door: false, lit: 0.5 });
        V.tower(P, cx - kw / 2, cb - u * 3.5, u * 3, u * 13, { wall: white, roof: blue, d: 0.38, flag: "#c83a2a", roofK: 1.9 });
        V.tower(P, cx + kw / 2, cb - u * 3.5, u * 3, u * 13, { wall: white, roof: blue, d: 0.38, flag: "#c83a2a", roofK: 1.9 });
        V.tower(P, cx, cb - u * 8, u * 4.4, u * 14, { wall: white, roof: blue, d: 0.36, flag: "#e8c040", roofK: 2.2 });
        // 城門と、壁に垂らした王家の旗
        const { ctx } = P;
        ctx.fillStyle = P.dark("#2a2420", 0.4, 0.3); ctx.beginPath(); ctx.moveTo(cx - u * 2, cb + u * 1.5); ctx.lineTo(cx - u * 2, cb - u * 1.8); ctx.arc(cx, cb - u * 1.8, u * 2, Math.PI, 0); ctx.lineTo(cx + u * 2, cb + u * 1.5); ctx.fill();
        for (const k of [-11, -5, 5, 11]) { ctx.fillStyle = P.c("#b8302a", 0.4); ctx.beginPath(); ctx.moveTo(cx + k * u - u, cb - u * 4); ctx.lineTo(cx + k * u + u, cb - u * 4); ctx.lineTo(cx + k * u + u, cb); ctx.lineTo(cx + k * u, cb - u * 0.7); ctx.lineTo(cx + k * u - u, cb); ctx.fill(); ctx.fillStyle = P.c("#e8c040", 0.4); ctx.beginPath(); ctx.arc(cx + k * u, cb - u * 2.6, u * 0.4, 0, Math.PI * 2); ctx.fill(); }
      },
      front: (near) => {
        // 花の箱と、大通りに渡した花綱
        for (let i = 0; i < 4; i++) { const t = 0.3 + i * 0.2; flowers(P, lerp(cx, near.lx, 0.75) - i * u * 0.6, hz + (h - hz) * t, u * (0.8 + t * 2), 0); flowers(P, lerp(cx, near.rx, 0.75) + i * u * 0.6, hz + (h - hz) * t, u * (0.8 + t * 2), 0); }
        bunting(P, near.lx, h - u * 22, near.rx, h - u * 21, u * 3, ["#c83a2a", "#f2ece0", "#3a5a9a", "#e8c040"]);
      },
    });
    V.frame(P, { color: "#2a3a20" });
  };

  // ---------------------------------------------------------------- 帝都ノルディア（黒い石と鉄の軍都。いつも雪。煙はまっすぐ上る）
  OUT.snowcity = (P) => {
    const { u, w, h, hz, cx, ctx } = P;
    P.season = "winter"; P.wind = 0.15;
    const black = "#3a3a42", iron = "#22232a", red = "#9a1e1e";
    townScene(P, {
      mountains: { color: "#8a94a8", height: u * 17, snow: 0.7 },
      hills: { color: "#c8d0dc", amp: u * 3 },
      ground: { color: "#e8eef4", tex: "snow", noSnow: true },
      row: { walls: ["#4a4a52", "#3a3a42", "#55555c"], roofs: ["#2a2a30", "#33333a"], roofType: ["steep", "gable"], house: { stone: true }, chimney: 0.7 },
      road: { color: "#6a6a72" },
      landmark: () => {
        const cb = hz - u * 0.5;
        // 黒鉄の城（角ばった塔、尖った屋根、赤い帝国旗）
        V.wall(P, cx - u * 26, cx + u * 26, cb + u * 1.5, u * 7, { color: black, d: 0.45 });
        for (const k of [-26, -14, 14, 26]) V.tower(P, cx + k * u, cb + u * 1.5, u * 4, u * 11, { wall: black, roof: iron, d: 0.45, roofK: 2.4, flag: red });
        V.house(P, cx - u * 9, cb - u * 4, u * 18, u * 12, { wall: black, roof: iron, roofType: "steep", roofH: u * 4, d: 0.4, stone: true, side: 0, door: false, lit: 0.45 });
        V.tower(P, cx, cb - u * 10, u * 5, u * 15, { wall: iron, roof: iron, d: 0.38, roofK: 3, flag: red, winCol: "#ff8a40" });
        // 赤い垂れ幕（双頭の鷲の代わりに黒い菱）
        for (const k of [-6, 6]) { ctx.fillStyle = P.c(red, 0.4); ctx.fillRect(cx + k * u - u * 1.2, cb - u * 8, u * 2.4, u * 8); ctx.fillStyle = P.c("#1a1a1e", 0.4); ctx.beginPath(); ctx.moveTo(cx + k * u, cb - u * 6.5); ctx.lineTo(cx + k * u + u * 0.8, cb - u * 5); ctx.lineTo(cx + k * u, cb - u * 3.5); ctx.lineTo(cx + k * u - u * 0.8, cb - u * 5); ctx.fill(); }
        // 工房の炉の煙（黒い）
        for (const k of [-20, 20]) { ctx.fillStyle = P.c(iron, 0.45); ctx.fillRect(cx + k * u, cb - u * 9, u * 1.4, u * 10); V.smoke(P, cx + k * u + u * 0.7, cb - u * 9, u * 2.4, 0.45, "#3a3a40"); V.light(P, cx + k * u + u * 0.7, cb - u * 9, u * 4, "#ff7a30", 0.6); }
      },
      front: (near) => {
        // 鉄の柵と、雪に立つ見張りの篝火
        ctx.fillStyle = P.c(iron);
        for (let x = 0; x < near.lx + u * 6; x += u * 1.6) ctx.fillRect(x, h - u * 9 - (x % 3) * 0.3, u * 0.25, u * 9);
        V.torch(P, lerp(cx, near.rx, 0.7), hz + (h - hz) * 0.7, u * 2.4, { reach: 12 });
      },
      lampOpt: { col: "#ffb060" },
    });
    V.frame(P, { color: "#2a2a30" });
  };

  // ---------------------------------------------------------------- 首都エルメシア（浮かぶ水晶の塔、円屋根、魔法の灯）
  OUT.magic = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    const stone = "#d8d4e8", dome = "#5a6ab8", glow = "#7fe3ff";
    // 空に浮かぶ島
    const isle = (x, y, s, d) => {
      const g = ctx.createLinearGradient(0, y, 0, y + s * 1.2);
      g.addColorStop(0, P.lit("#7a6a80", d, 0.3)); g.addColorStop(1, P.dark("#3a2a40", d, 0.4));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 1.3); ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.6, x + s, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = P.lit("#6a9a5a", d, 0.3); ctx.fillRect(x - s, y - s * 0.08, s * 2, s * 0.1);
      V.tower(P, x, y - s * 0.05, s * 0.3, s * 1.1, { wall: stone, roof: dome, d, roofK: 2.4 });
      crystal(P, x, y - s * 2.2, s * 0.25, glow, d);
    };
    townScene(P, {
      mountains: { color: "#7a7aa8", height: u * 10, snow: 0.2 },
      hills: { color: "#6a8a70", amp: u * 3 },
      ground: { color: "#8a86a0", tex: "dirt" },
      row: { walls: ["#e4e0f0", "#d0cce4", "#ecebf4"], roofs: ["#4a5aa8", "#6a5aa8", "#3a7aa0"], roofType: ["dome", "gable", "steep"], lit: 0.8 },
      road: { color: "#9a96b0" },
      back: () => { isle(cx - u * 30, hz - u * 26, u * 4, 0.6); isle(cx + u * 34, hz - u * 30, u * 3, 0.65); },
      landmark: () => {
        const cb = hz + u * 0.5;
        // 中央の大塔と、まわりの細い尖塔
        for (const [k, th, s] of [[-16, 20, 2.4], [-9, 26, 2.8], [9, 24, 2.8], [17, 18, 2.2]]) { V.tower(P, cx + k * u, cb, u * s, u * th, { wall: stone, roof: dome, d: 0.45, roofK: 2.6, winCol: "#a0f0ff" }); crystal(P, cx + k * u, cb - u * th - u * s * 3.4, u * 0.7, glow, 0.4); }
        V.tower(P, cx, cb, u * 5, u * 30, { wall: "#ece8f6", roof: "#3a4a9a", d: 0.4, roofK: 2.2, winCol: "#a0f0ff" });
        crystal(P, cx, cb - u * 30 - u * 14, u * 2.2, glow, 0.35);
        // 塔を巡る光の輪
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = rgba(glow, 0.35); ctx.lineWidth = u * 0.3;
        for (const y of [cb - u * 12, cb - u * 22]) { ctx.beginPath(); ctx.ellipse(cx, y, u * 6, u * 1.2, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
      },
      middle: () => {
        // 宙に浮かぶ灯
        for (let i = 0; i < 9; i++) { const x = R() * w, y = hz - u * (4 + R() * 18); V.light(P, x, y, u * 3, R() < 0.5 ? glow : "#c8a0ff", 0.9, true); ctx.fillStyle = "#e8f8ff"; ctx.beginPath(); ctx.arc(x, y, u * 0.3, 0, Math.PI * 2); ctx.fill(); }
      },
      lampOpt: { col: "#9ae8ff", on: true },
    });
    V.frame(P, { color: "#2a2a40" });
  };

  // ---------------------------------------------------------------- 自由都市ブランデール（市場の広場。縞の日除け、両替商の看板、ギルドの時計塔）
  OUT.town = (P) => {
    const { u, w, h, hz, cx, ctx } = P;
    townScene(P, {
      mountains: false,
      hills: { color: "#7a9058", amp: u * 5 },
      ground: { color: "#8a7a62", tex: "dirt" },
      row: { walls: ["#d8c4a0", "#c8a87a", "#e4d4b4", "#b89a74"], roofs: ["#8a3a28", "#6a4a30", "#a85a30"], house: { timber: "#4a3020" }, signs: ["#c89a3a", "#8a5a2a", "#3a6a8a"], chimney: 0.5 },
      road: { color: "#9a8a72", wb: w * 1.1 },
      landmark: () => {
        // ギルド本部の時計塔
        const tb = hz + u * 1;
        V.house(P, cx - u * 7, tb, u * 14, u * 10, { wall: "#d4c0a0", roof: "#6a3a28", roofType: "eave", roofH: u * 3, d: 0.42, stone: true, side: 0, door: false, lit: 0.6 });
        V.tower(P, cx + u * 9, tb, u * 4, u * 22, { wall: "#cbb898", roof: "#5a3a2a", d: 0.4, roofK: 2, flag: "#e8c040", stone: true });
        ctx.fillStyle = P.lit("#f4ecd8", 0.4); ctx.beginPath(); ctx.arc(cx + u * 9, tb - u * 18, u * 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = P.c("#2a1e14", 0.4); ctx.lineWidth = u * 0.2; ctx.beginPath(); ctx.moveTo(cx + u * 9, tb - u * 18); ctx.lineTo(cx + u * 9, tb - u * 19); ctx.moveTo(cx + u * 9, tb - u * 18); ctx.lineTo(cx + u * 9.7, tb - u * 18); ctx.stroke();
      },
      middle: () => {
        // 広場の屋台
        const cols = ["#b83a2a", "#2a6a9a", "#d8a030", "#4a8a3a", "#8a3a8a"];
        const row = (t, n, sc) => { const y = hz + (h - hz) * t; for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, k = Math.floor(i / 2); const x = cx + side * (u * (5 + t * 14) + k * u * 9 * sc); stall(P, x, y, u * 6 * sc, cols[(i + n) % cols.length], 0.25 * (1 - t)); } };
        row(0.12, 6, 0.55); row(0.32, 4, 0.9);
      },
      near: { size: 24 },
      front: (near) => {
        bunting(P, near.lx, h - u * 24, near.rx, h - u * 25, u * 4, ["#c83a2a", "#e8c040", "#2a6a9a", "#f2ece0", "#4a8a3a"]);
        bunting(P, near.lx - u * 4, h - u * 15, near.rx + u * 3, h - u * 17, u * 3, ["#e8c040", "#c83a2a", "#f2ece0"]);
        // 手前の木箱と樽
        for (const [x, s] of [[near.lx + u * 3, u * 4], [near.lx + u * 7, u * 3], [near.rx - u * 4, u * 4.5]]) { ctx.fillStyle = P.c("#6a4a2a"); ctx.fillRect(x - s / 2, h - s * 1.1, s, s); ctx.strokeStyle = P.dark("#3a2614", 0, 0.3); ctx.lineWidth = s * 0.05; ctx.strokeRect(x - s / 2, h - s * 1.1, s, s); ctx.beginPath(); ctx.moveTo(x - s / 2, h - s * 1.1); ctx.lineTo(x + s / 2, h - s * 0.1); ctx.stroke(); }
      },
    });
    V.frame(P, { color: "#2a2a1c" });
  };

  // ---------------------------------------------------------------- 港町ヴァレンツァ（霧の港。濡れた帆の船、桟橋、灯台、倉庫）
  OUT.port = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    const sea = "#2a4a62";
    // 対岸の岬と灯台
    V.hills(P, { base: hz, amp: u * 6, d: 0.75, color: "#5a6a6a", scale: 2 });
    const lhx = w * 0.82, lhb = hz - u * 3;
    V.tower(P, lhx, lhb, u * 2.6, u * 12, { wall: "#e8e4dc", roof: "#8a2a24", d: 0.6, roofK: 0.9 });
    V.light(P, lhx, lhb - u * 13, u * 10, "#fff0c0", 1.2, true);
    P.anim.push({ draw: (c, t) => { const a = t * 0.8; c.save(); c.globalCompositeOperation = "lighter"; const x = lhx, y = lhb - u * 13, L = w * 0.6, dir = Math.cos(a); const g = c.createLinearGradient(x, y, x + dir * L, y); g.addColorStop(0, "rgba(255,240,200,.35)"); g.addColorStop(1, "rgba(255,240,200,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dir * L, y - u * 4 * Math.abs(dir) - u); c.lineTo(x + dir * L, y + u * 3 * Math.abs(dir) + u); c.fill(); c.restore(); } });
    // 海
    V.water(P, { top: hz, color: sea, reflect: 0.45 });
    P.reflectWater.x0 = w * 0.36; // 左は陸（町と倉庫）
    // 沖の船
    ship(P, w * 0.62, hz + u * 2.4, u * 7, { d: 0.55 });
    ship(P, w * 0.38, hz + u * 1.2, u * 4, { d: 0.7, masts: 1, sail: "#d8ccb4" });
    // 左の町（倉庫と家並み）と、海に出る桟橋
    V.houseRow(P, { base: hz + u * 3, size: 6, d: 0.35, to: w * 0.34, walls: ["#c8b8a0", "#a89480", "#d8ccb4"], roofs: ["#5a4a40", "#7a3a2a", "#4a4a50"], roofType: ["gable", "eave"], chimney: 0.5, side: 0.06 });
    const pierY = hz + (h - hz) * 0.42;
    ctx.fillStyle = P.c("#5a4030"); ctx.beginPath(); ctx.moveTo(w * 0.2, h); ctx.lineTo(w * 0.32, pierY); ctx.lineTo(w * 0.72, pierY); ctx.lineTo(w * 0.78, pierY + u * 1.2); ctx.lineTo(w * 0.38, pierY + u * 1.2); ctx.lineTo(w * 0.42, h); ctx.fill();
    ctx.strokeStyle = rgba(P.dark("#3a2a1e"), 0.6); ctx.lineWidth = 1;
    for (let t = 0; t < 1; t += 0.06) { const y = lerp(h, pierY, t); ctx.beginPath(); ctx.moveTo(lerp(w * 0.2, w * 0.32, t), y); ctx.lineTo(lerp(w * 0.42, w * 0.38, t) + (t > 0.98 ? w * 0.4 : 0), y); ctx.stroke(); }
    for (let i = 0; i < 9; i++) { const x = w * (0.34 + i * 0.05); ctx.fillStyle = P.dark("#3a2a1e", 0, 0.4); ctx.fillRect(x, pierY - u * 0.6, u * 0.5, u * 4); }
    ship(P, w * 0.6, pierY - u * 0.2, u * 12, { d: 0.1, masts: 3 });
    // 桟橋の灯と、積まれた樽
    lamp(P, w * 0.34, pierY, u * 5); lamp(P, w * 0.7, pierY, u * 5);
    for (const [x, s] of [[w * 0.29, u * 3], [w * 0.31, u * 2.4]]) V.barrel(P, x, lerp(h, pierY, 0.55), s);
    // 手前の倉庫
    V.house(P, -u * 8, h * 1.02, u * 22, u * 24, { wall: "#b4a088", roof: "#4a3a34", roofType: "gable", stone: true, chimney: true, sign: "#3a6a8a", side: 0.15 });
    // いつも少し霧（港の名物）
    for (let i = 0; i < 3; i++) V.fogBand(P, hz + u * (1 + i * 3), u * 4, P.weather === "fog" ? 0.5 : 0.22, P.night ? "#3a4450" : "#d0d8e0");
    V.frame(P, { color: "#1a2228" });
  };
  OUT.port.fogAlways = true;

  // ---------------------------------------------------------------- 聖都エルヴィナ（白い城壁と、光の輪を戴く大聖堂。参道の巡礼者）
  OUT.w1_holy = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    const white = "#f4f0e6", gold = "#e8c060";
    townScene(P, {
      mountains: { color: "#8a94b0", height: u * 10, snow: 0.4 },
      hills: { color: "#7a9a60", amp: u * 3 },
      ground: { color: "#c8bca4", tex: "dirt" },
      row: { walls: ["#f4f0e6", "#ece4d4", "#faf6ee"], roofs: ["#4a6aa0", "#6a7ab0", "#a85a3a"], roofType: ["gable", "steep"], lit: 0.7 },
      road: { color: "#d4ccb8" },
      landmark: () => {
        const cb = hz + u * 0.5, fw = u * 20;
        V.wall(P, cx - u * 32, cx + u * 32, cb + u * 1.2, u * 4.5, { color: white, d: 0.45 });
        // 大聖堂の正面：二本の尖塔、薔薇窓、尖った大扉
        V.house(P, cx - fw / 2, cb, fw, u * 16, { wall: white, roof: "#b8b0a0", roofType: "steep", roofH: u * 5, d: 0.38, stone: true, side: 0, door: false, windows: false });
        for (const k of [-1, 1]) {
          const tx = cx + k * fw * 0.5;
          V.house(P, tx - u * 2.6, cb, u * 5.2, u * 24, { wall: white, roof: "#5a6a90", roofType: "steep", roofH: u * 6, d: 0.38, stone: true, side: 0, door: false, windows: false });
          for (let y = cb - u * 21; y < cb - u * 4; y += u * 5) V.win(P, tx - u * 0.6, y, u * 1.2, u * 3, { d: 0.38, arch: true, p: 0.8, col: "#ffe0a0" });
          ctx.strokeStyle = P.c(gold, 0.38); ctx.lineWidth = u * 0.2; ctx.beginPath(); ctx.moveTo(tx, cb - u * 34); ctx.lineTo(tx, cb - u * 37); ctx.moveTo(tx - u * 0.8, cb - u * 36); ctx.lineTo(tx + u * 0.8, cb - u * 36); ctx.stroke();
        }
        // 薔薇窓
        const ry = cb - u * 11, rr = u * 3;
        const lit = P.night || P.dusk;
        const rg = ctx.createRadialGradient(cx, ry, 0, cx, ry, rr);
        rg.addColorStop(0, lit ? "#fff0b0" : P.c("#6a8ac0", 0.38)); rg.addColorStop(0.6, lit ? "#e87a5a" : P.c("#3a4a8a", 0.38)); rg.addColorStop(1, lit ? "#8a3aa0" : P.c("#2a2a4a", 0.38));
        ctx.fillStyle = P.c("#c8c0b0", 0.38); ctx.beginPath(); ctx.arc(cx, ry, rr * 1.18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, ry, rr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = P.c("#3a3030", 0.38); ctx.lineWidth = u * 0.15;
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, ry); ctx.lineTo(cx + Math.cos(a) * rr, ry + Math.sin(a) * rr); ctx.stroke(); }
        if (lit) V.light(P, cx, ry, rr * 5, "#ffd890", 1);
        // 大扉
        ctx.fillStyle = P.dark("#4a3020", 0.38, 0.3); ctx.beginPath(); ctx.moveTo(cx - u * 2.4, cb); ctx.lineTo(cx - u * 2.4, cb - u * 4); ctx.quadraticCurveTo(cx, cb - u * 7.5, cx + u * 2.4, cb - u * 4); ctx.lineTo(cx + u * 2.4, cb); ctx.fill();
        if (lit) { ctx.fillStyle = "rgba(255,200,110,.6)"; ctx.fillRect(cx - u * 0.3, cb - u * 5, u * 0.6, u * 5); V.light(P, cx, cb - u * 2, u * 8, "#ffc070", 0.8); }
        // 光の輪（聖女の印）
        const hy = cb - u * 31;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (const [lw, a] of [[u * 2.2, 0.12], [u * 1, 0.3], [u * 0.4, 0.7]]) { ctx.strokeStyle = rgba("#ffe8a0", a); ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(cx, hy, u * 7, u * 1.8, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
        V.light(P, cx, hy, u * 16, "#ffe8a0", P.night ? 1.2 : 2.5);
        P.anim.push({ draw: (c, t) => { c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = rgba("#fff4c8", 0.12 + Math.sin(t * 1.2) * 0.08); c.lineWidth = u * 0.8; c.beginPath(); c.ellipse(cx, hy, u * 7, u * 1.8, 0, 0, Math.PI * 2); c.stroke(); c.restore(); } });
      },
      middle: () => {
        // 参道の巡礼者の列（白い衣）
        for (let i = 0; i < 9; i++) {
          const t = 0.08 + i * 0.07, y = hz + u * 2 + (h - hz) * t * 0.9, s = u * (1 + t * 7), x = cx + (i % 2 ? 1 : -1) * s * 0.6 + (R() - 0.5) * s * 0.4;
          ctx.fillStyle = P.c(i % 3 ? "#e8e4dc" : "#c8bca8", 0.3 * (1 - t));
          ctx.beginPath(); ctx.moveTo(x - s * 0.18, y); ctx.lineTo(x - s * 0.12, y - s * 0.75); ctx.lineTo(x + s * 0.12, y - s * 0.75); ctx.lineTo(x + s * 0.18, y); ctx.fill();
          ctx.beginPath(); ctx.arc(x, y - s * 0.85, s * 0.12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = rgba(P.shadowC, 0.2); ctx.beginPath(); ctx.ellipse(x + P.ldir * -s * 0.2, y, s * 0.25, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
        }
      },
      lampOpt: { col: "#ffe0a0" },
    });
    V.frame(P, { color: "#2a3020" });
  };

  // ---------------------------------------------------------------- 八雲・鬼灯の港（朱い鳥居、五重塔、提灯の連なり、瓦屋根、桜）
  OUT.yakumo = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    // 遠くの富士のような山と海
    V.mountains(P, { base: hz - u * 1, height: u * 18, d: 0.8, color: "#6a7898", snow: 0.35, round: true, scale: 1.4 });
    V.water(P, { top: hz, bottom: hz + u * 4, color: "#2a4a6a", reflect: 0.4 });
    ship(P, w * 0.8, hz + u * 2.2, u * 4, { d: 0.6, masts: 1, sail: "#e8d8b8" });
    V.ground(P, { top: hz + u * 4, color: "#8a7a62", tex: "dirt" });
    // 奥の町並み（瓦屋根）と五重塔
    V.houseRow(P, { base: hz + u * 5, size: 4, d: 0.5, walls: ["#e8dcc4", "#d8c8a8", "#c8b494"], roofs: ["#3a3a44", "#4a4040"], roofType: "japan", chimney: 0, lit: 0.6 });
    pagoda(P, cx + u * 22, hz + u * 5, u * 18, 0.45);
    V.road(P, { top: hz + u * 6, wt: u * 5, wb: w * 0.6, color: "#a89880" });
    // 鳥居（参道の奥）
    torii(P, cx, hz + u * 8, u * 13, 0.3);
    V.houseRow(P, { base: hz + u * 10, size: 7, d: 0.25, gap: [cx - u * 8, cx + u * 8], walls: ["#ece0c8", "#dccca8", "#c8a888"], roofs: ["#33333a", "#3a3438"], roofType: "japan", chimney: 0, lit: 0.6, house: { timber: "#3a2a20" } });
    // 桜（季節で花と紅葉）
    sakura(P, cx - u * 24, hz + u * 14, u * 14, 0.15);
    sakura(P, cx + u * 30, hz + u * 16, u * 16, 0.1);
    // 手前の家（格子と暖簾）
    const near = nearHouses(P, { walls: ["#e4d4b4", "#d4c09c"], roofs: ["#2e2e34"], roofType: "japan", house: { timber: "#3a2618" }, size: 22 });
    for (const [x0, x1, y] of [[near.lx - u * 14, near.lx, h - u * 13], [near.rx, near.rx + u * 14, h - u * 12]]) { for (let x = x0; x < x1; x += u * 2.2) { ctx.fillStyle = P.c(x % 2 ? "#2a3a6a" : "#3a2a5a"); ctx.fillRect(x, y, u * 2, u * 4); } }
    // 提灯の連なり（参道に渡した綱）
    const string = (x0, y0, x1, y1, sag, n, s) => {
      ctx.strokeStyle = P.dark("#2a1e14", 0, 0.2); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
      for (let i = 1; i < n; i++) { const t = i / n, x = lerp(x0, x1, t), y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * ((y0 + y1) / 2 + sag * 2) + t * t * y1; lantern(P, x, y + s * 0.7, s, { col: i % 3 ? "#d8402a" : "#e8a030" }); }
    };
    string(near.lx, h - u * 26, near.rx, h - u * 25, u * 4, 9, u * 1.8);
    string(cx - u * 16, hz + u * 2, cx + u * 16, hz + u * 2.5, u * 1.2, 9, u * 0.8);
    V.frame(P, { color: "#2a2018" });
  };

  // ---------------------------------------------------------------- 八雲・朧島（夜の明けない祭りの島。歯型の欠けた月、海に立つ鳥居、無数の提灯）
  OUT.w1_oboro = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.moon(P, P.sun.x, P.sun.y, u * 4, "#f4e0c0", [[0.85, -0.2, 0.28], [0.95, 0.25, 0.22], [0.7, 0.55, 0.18]]);
    V.mountains(P, { base: hz, height: u * 9, d: 0.75, color: "#3a3048", round: true, scale: 2 });
    V.water(P, { top: hz, color: "#1a1a30", reflect: 0.55 });
    // 海に立つ大鳥居
    torii(P, cx - u * 20, hz + u * 7, u * 16, 0.35);
    // 島の祭りの町（斜面に重なる家と提灯）
    const isl = hz + u * 2;
    ctx.fillStyle = P.c("#2a2030", 0.4); ctx.beginPath(); ctx.moveTo(w * 0.45, hz + u * 1.5); ctx.quadraticCurveTo(w * 0.7, isl - u * 14, w + u * 2, isl - u * 10); ctx.lineTo(w + u * 2, hz + u * 2); ctx.fill();
    V.houseRow(P, { base: isl - u * 4, from: w * 0.62, size: 3.5, d: 0.45, walls: ["#5a4a48"], roofs: ["#2a2228"], roofType: "japan", lit: 0.95, chimney: 0 });
    V.houseRow(P, { base: isl, from: w * 0.5, size: 4.5, d: 0.35, walls: ["#6a5450"], roofs: ["#2a2228"], roofType: "japan", lit: 0.95, chimney: 0 });
    pagoda(P, w * 0.78, isl - u * 6, u * 14, 0.42);
    for (let i = 0; i < 24; i++) lantern(P, w * (0.5 + R() * 0.5), isl - u * (R() * 10), u * (0.5 + R() * 0.4), { always: true, col: R() < 0.7 ? "#e84a2a" : "#f0a040" });
    // 手前の桟橋と提灯
    V.ground(P, { top: h - u * 8, color: "#3a2a28", tex: "dirt" });
    for (let i = 0; i < 6; i++) lantern(P, w * (0.05 + i * 0.18), h - u * (14 + (i % 2) * 2), u * 2, { always: true });
    // 祭りの花火（毎コマ）
    const fx = w * 0.72, fy = hz - u * 22;
    P.anim.push({ draw: (c, t) => { const ph = (t * 0.4) % 1; c.save(); c.globalCompositeOperation = "lighter"; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = ph * u * 10; c.fillStyle = rgba(i % 2 ? "#ffb060" : "#ff6a8a", (1 - ph) * 0.8); c.fillRect(fx + Math.cos(a) * r, fy + Math.sin(a) * r + ph * ph * u * 3, 2, 2); } c.restore(); } });
    V.frame(P, { color: "#100a10" });
  };
  OUT.w1_oboro.phase = 3;
  OUT.w1_oboro.moon = true;

  // ---------------------------------------------------------------- 黒鉄の砦（山脈の道を塞ぐ黒い壁、壁の篝火、手前の墓地）
  OUT.fort = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u * 2, height: u * 26, d: 0.65, color: "#5a6070", snow: 0.5, scale: 4 });
    V.mountains(P, { base: hz + u * 2, height: u * 14, d: 0.4, color: "#4a4a50", snow: 0.2, scale: 3 });
    V.ground(P, { top: hz + u * 2, color: "#5a5048", tex: "rock" });
    // 黒い壁（画面の端から端まで）
    const wb = hz + u * 8, wh = u * 11, iron = "#2e2c2e";
    V.wall(P, -u * 2, w + u * 2, wb, wh, { color: "#3a3638", d: 0.2 });
    for (const k of [-0.36, 0.36]) V.tower(P, cx + k * w, wb, u * 6, wh + u * 6, { wall: "#3a3638", d: 0.18, crenel: true, flag: "#8a1e1e" });
    // 門楼
    V.house(P, cx - u * 8, wb, u * 16, wh + u * 9, { wall: iron, roof: "#1e1c1e", roofType: "flat", d: 0.18, stone: true, side: 0, door: false, lit: 0.6 });
    ctx.fillStyle = "#0e0c0c"; ctx.beginPath(); ctx.moveTo(cx - u * 3.2, wb); ctx.lineTo(cx - u * 3.2, wb - u * 6); ctx.arc(cx, wb - u * 6, u * 3.2, Math.PI, 0); ctx.lineTo(cx + u * 3.2, wb); ctx.fill();
    ctx.strokeStyle = P.c("#4a4448", 0.1); ctx.lineWidth = u * 0.3; for (let x = cx - u * 2.8; x < cx + u * 3; x += u * 1) { ctx.beginPath(); ctx.moveTo(x, wb - u * 8); ctx.lineTo(x, wb); ctx.stroke(); }
    // 壁の上の篝火
    for (let i = 0; i < 7; i++) V.torch(P, w * (0.07 + i * 0.143), wb - wh - u * 1.5, u * 1.3, { reach: 14, stick: false });
    // 手前の墓地（木の十字架と土饅頭）
    for (let i = 0; i < 16; i++) {
      const t = R(), y = wb + (h - wb) * (0.2 + t * 0.75), s = u * (1.5 + t * 5), x = R() < 0.5 ? R() * w * 0.32 : w - R() * w * 0.32;
      ctx.fillStyle = P.dark("#4a3a30", 0.2 * (1 - t), 0.3); ctx.beginPath(); ctx.ellipse(x, y, s * 0.7, s * 0.2, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = P.c("#4a3a2a", 0.2 * (1 - t)); ctx.fillRect(x - s * 0.05, y - s * 1.2, s * 0.1, s * 1.1); ctx.fillRect(x - s * 0.3, y - s * 0.95, s * 0.6, s * 0.09);
      if (P.season === "winter") { ctx.fillStyle = P.lit("#eef2f8", 0); ctx.fillRect(x - s * 0.3, y - s * 0.97, s * 0.6, s * 0.03); }
    }
    V.frame(P, { color: "#1a1816" });
  };

  // ---------------------------------------------------------------- 麦の都グランベール（金の麦畑、回る風車、花を撒いた一本道）
  OUT.w2_farm = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.hills(P, { base: hz - u * 1, amp: u * 7, d: 0.7, color: "#7a9a5a", scale: 2 });
    V.hills(P, { base: hz + u * 1, amp: u * 3, d: 0.5, color: "#8a9a50" });
    V.forestBand(P, { base: hz + u * 1.5, size: u * 4, d: 0.45, kind: "broad" });
    // 麦畑（季節で色が変わる）
    const wheat = P.season === "winter" ? "#d8dce4" : P.season === "spring" ? "#7aa048" : P.season === "summer" ? "#c8b048" : "#d8a840";
    V.ground(P, { top: hz + u * 1, color: wheat, tex: "field", noSnow: P.season !== "winter" });
    // 畝の筋（奥へ収束）
    ctx.strokeStyle = rgba(P.dark(wheat, 0, 0.5), 0.35); ctx.lineWidth = 1;
    for (let i = -20; i <= 20; i++) { ctx.beginPath(); ctx.moveTo(cx + i * u * 1.2, hz + u * 1); ctx.lineTo(cx + i * w * 0.12, h); ctx.stroke(); }
    // 穂の揺れ（明るい筋）
    for (let i = 0; i < 400; i++) { const y = hz + u + Math.pow(R(), 0.7) * (h - hz - u), dd = P.depth(y); ctx.fillStyle = rgba(P.lit(wheat, 0, 0.5), 0.5); ctx.fillRect(R() * w, y, u * (0.5 + dd * 3), Math.max(0.6, dd * u * 0.3)); }
    // 風車と農家
    windmill(P, cx + u * 24, hz + u * 3, u * 16, 0.35);
    windmill(P, cx - u * 34, hz + u * 2, u * 9, 0.5);
    V.house(P, cx + u * 6, hz + u * 3.5, u * 8, u * 5, { wall: "#e8dcc0", roof: "#9a5a30", roofType: "gable", d: 0.4, chimney: true, timber: "#5a3a24" });
    V.house(P, cx - u * 18, hz + u * 3, u * 7, u * 4.5, { wall: "#dccca8", roof: "#7a4a2a", roofType: "gable", d: 0.42, chimney: true });
    // 花を撒いた一本道（麦が生えていない）
    V.road(P, { top: hz + u * 2, wt: u * 1.4, wb: w * 0.28, color: "#a08a68" });
    for (let i = 0; i < 120; i++) { const t = Math.pow(R(), 0.8), y = lerp(hz + u * 2, h, t), x = cx + (R() - 0.5) * lerp(u * 1.4, w * 0.28, t); ctx.fillStyle = P.c(["#e83a5a", "#f8d040", "#ffffff", "#c04ae0"][i % 4]); ctx.beginPath(); ctx.arc(x, y, u * (0.1 + t * 0.4), 0, Math.PI * 2); ctx.fill(); }
    // 左の若い森（去年の畑）
    for (let i = 0; i < 6; i++) V.tree(P, u * (2 + i * 4.5), hz + u * (4 + (i % 2) * 2), u * (6 + R() * 3), { d: 0.25 });
    // 手前の麦（大きな穂）
    for (let i = 0; i < 90; i++) { const x = R() * w, l = u * (3 + R() * 6); if (Math.abs(x - cx) < w * 0.16) continue; ctx.strokeStyle = P.dark(wheat, 0, 0.3); ctx.lineWidth = u * 0.15; ctx.beginPath(); ctx.moveTo(x, h); ctx.quadraticCurveTo(x + u * 0.5, h - l * 0.5, x + u * (R() - 0.3), h - l); ctx.stroke(); ctx.fillStyle = P.lit(wheat, 0, 0.2); ctx.beginPath(); ctx.ellipse(x + u * 0.2, h - l, u * 0.25, u * 1, 0.2, 0, Math.PI * 2); ctx.fill(); }
  };

  // ---------------------------------------------------------------- 鍛冶の都ドランヘルツ（山肌の煙突の町。どの家にも炉の火、火の粉）
  OUT.w2_forge = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz + u * 4, height: u * 30, d: 0.45, color: "#5a5050", snow: 0.15, scale: 2.5 });
    V.ground(P, { top: hz + u * 2, color: "#5a4a40", tex: "rock" });
    // 山肌に段々に重なる家（炉の火の窓）。家の下は段の石垣と斜面
    const slope = ctx.createLinearGradient(0, hz - u * 16, 0, hz + u * 2);
    slope.addColorStop(0, P.c("#5a4e46", 0.45)); slope.addColorStop(1, P.dark("#4a4038", 0.2, 0.3));
    ctx.fillStyle = slope; ctx.beginPath(); ctx.moveTo(w * 0.05, hz + u * 2); ctx.quadraticCurveTo(w * 0.2, hz - u * 15, w * 0.5, hz - u * 16); ctx.quadraticCurveTo(w * 0.8, hz - u * 15, w * 0.95, hz + u * 2); ctx.fill();
    for (let r = 0; r < 4; r++) {
      const base = hz - u * (14 - r * 5), d = 0.42 - r * 0.07;
      ctx.fillStyle = P.dark("#5a5048", d, 0.3); ctx.fillRect(w * (0.15 + r * 0.03), base, w * (0.7 - r * 0.06), u * 1.2);
      V.houseRow(P, { base, size: 3.6 + r * 0.9, d, walls: ["#6a5a50", "#5a4a44", "#7a6458"], roofs: ["#3a302c", "#2e2826"], roofType: ["flat", "gable"], chimney: 0.9, lit: 0.8, house: { stone: true, chimneyC: "#3a2e28" }, from: w * (0.15 + r * 0.03), to: w * (0.85 - r * 0.03) });
    }
    // 大きな炉の塔と煙
    const tx = cx + u * 16, tb = hz + u * 2;
    ctx.fillStyle = P.c("#3a302a", 0.25); ctx.beginPath(); ctx.moveTo(tx - u * 3, tb); ctx.lineTo(tx - u * 1.6, tb - u * 24); ctx.lineTo(tx + u * 1.6, tb - u * 24); ctx.lineTo(tx + u * 3, tb); ctx.fill();
    V.smoke(P, tx, tb - u * 24, u * 6, 0.3, "#3a3434");
    V.light(P, tx, tb - u * 4, u * 12, "#ff7a2a", 1.4, true);
    ctx.fillStyle = "#ffb050"; ctx.fillRect(tx - u, tb - u * 5, u * 2, u * 3);
    P.embers = { x: tx, y: tb - u * 6, spread: u * 12, col: "#ffa040" };
    V.road(P, { top: hz + u * 3, wt: u * 4, wb: w * 0.6, color: "#6a5a4a", cobble: true });
    const near = nearHouses(P, { walls: ["#6a5a50", "#5a4a44"], roofs: ["#2e2826"], roofType: "gable", house: { stone: true, lit: 0.9 }, size: 22 });
    // 手前の金床と鉄の山
    const ax = near.lx + u * 4, ay = h - u * 3;
    ctx.fillStyle = P.c("#2a2a2e"); ctx.beginPath(); ctx.moveTo(ax - u * 3, ay - u * 2.5); ctx.lineTo(ax + u * 4, ay - u * 2.5); ctx.lineTo(ax + u * 2, ay - u * 1.5); ctx.lineTo(ax + u, ay - u * 1.5); ctx.lineTo(ax + u * 1.5, ay); ctx.lineTo(ax - u * 1.5, ay); ctx.lineTo(ax - u, ay - u * 1.5); ctx.lineTo(ax - u * 2, ay - u * 1.5); ctx.fill();
    ctx.fillStyle = P.lit("#6a6a74", 0, 0.4); ctx.fillRect(ax - u * 3, ay - u * 2.6, u * 7, u * 0.25);
    V.torch(P, near.rx - u * 3, h - u * 6, u * 2, { reach: 10 });
    V.frame(P, { color: "#1a1410" });
  };

  // ---------------------------------------------------------------- 闘技の都ザルグロス（雪の中のすり鉢形の大闘技場と、上の席の旗）
  OUT.w2_arena = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    P.season = P.season || "winter";
    V.mountains(P, { base: hz - u * 1, height: u * 16, d: 0.75, color: "#7a849a", snow: 0.6 });
    V.ground(P, { top: hz, color: "#e8eef4", tex: "snow", noSnow: true });
    // 大闘技場（楕円の外壁にアーチの列）
    const ab = hz + u * 5, aw = u * 46, ah = u * 16, stone = "#8a7a6a";
    const g = ctx.createLinearGradient(cx - aw / 2, 0, cx + aw / 2, 0);
    g.addColorStop(0, P.dark(stone, 0.35, 0.4)); g.addColorStop(P.ldir < 0 ? 0.3 : 0.7, P.lit(stone, 0.35, 0.3)); g.addColorStop(1, P.dark(stone, 0.35, 0.4));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - aw / 2, ab); ctx.lineTo(cx - aw / 2, ab - ah); ctx.quadraticCurveTo(cx, ab - ah - u * 4, cx + aw / 2, ab - ah); ctx.lineTo(cx + aw / 2, ab); ctx.quadraticCurveTo(cx, ab + u * 3, cx - aw / 2, ab); ctx.fill();
    for (let r = 0; r < 3; r++) for (let i = 0; i < 15; i++) {
      const t = (i + 0.5) / 15, x = cx - aw / 2 + t * aw, curve = Math.sin(t * Math.PI), y = ab - ah * (0.18 + r * 0.3) - curve * u * (1.5 + r * 0.8), aw2 = aw / 15 * 0.55 * (0.6 + curve * 0.4);
      ctx.fillStyle = P.dark("#2a2420", 0.35, 0.2); ctx.beginPath(); ctx.moveTo(x - aw2 / 2, y); ctx.lineTo(x - aw2 / 2, y - ah * 0.14); ctx.arc(x, y - ah * 0.14, aw2 / 2, Math.PI, 0); ctx.lineTo(x + aw2 / 2, y); ctx.fill();
      if ((P.night || P.dusk) && R() < 0.4) { ctx.fillStyle = "rgba(255,170,80,.7)"; ctx.fillRect(x - aw2 * 0.3, y - ah * 0.14, aw2 * 0.6, ah * 0.14); V.light(P, x, y - ah * 0.08, u * 2.5, "#ffb050", 0.6); }
    }
    ctx.fillStyle = P.lit("#f2f6fb", 0.3); ctx.beginPath(); ctx.moveTo(cx - aw / 2, ab - ah); ctx.quadraticCurveTo(cx, ab - ah - u * 4, cx + aw / 2, ab - ah); ctx.lineTo(cx + aw / 2, ab - ah + u * 0.8); ctx.quadraticCurveTo(cx, ab - ah - u * 3.2, cx - aw / 2, ab - ah + u * 0.8); ctx.fill();
    for (let i = 0; i < 9; i++) { const t = i / 8, x = cx - aw / 2 + t * aw; V.flag(P, x, ab - ah - Math.sin(t * Math.PI) * u * 3.6, u * 4, ["#a01e1e", "#e8c040", "#2a2a2a"][i % 3], 0.35); }
    // 町と手前
    V.houseRow(P, { base: hz + u * 8, size: 6, d: 0.25, gap: [cx - u * 9, cx + u * 9], walls: ["#5a5050", "#6a5e54"], roofs: ["#2a2626", "#3a3030"], roofType: ["steep", "gable"], chimney: 0.6, house: { stone: true } });
    V.road(P, { top: hz + u * 7, wt: u * 5, wb: w * 0.7, color: "#c8ccd4" });
    nearHouses(P, { walls: ["#5a5050"], roofs: ["#2a2626"], roofType: "steep", house: { stone: true }, size: 22 });
    V.frame(P, { color: "#2a2a30" });
  };

  // ---------------------------------------------------------------- 湯の町アミュレイン（湖のほとりの湯屋と、立ちのぼる湯気）
  OUT.w2_spa = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz, height: u * 14, d: 0.72, color: "#6a7a8a", snow: 0.3, round: true });
    V.forestBand(P, { base: hz, size: u * 3.5, d: 0.55, kind: "pine" });
    V.water(P, { top: hz, bottom: hz + (h - hz) * 0.55, color: "#3a5a6a", reflect: 0.55 });
    V.ground(P, { top: hz + (h - hz) * 0.55, color: "#6a7a58", tex: "grass" });
    // 湖岸の湯屋（木造、大きな屋根）
    const sb = hz + (h - hz) * 0.58;
    V.house(P, cx - u * 30, sb, u * 20, u * 10, { wall: "#c8a880", roof: "#4a3a30", roofType: "japan", roofH: u * 4, d: 0.15, timber: "#5a3a24", lit: 0.8 });
    V.house(P, cx + u * 12, sb + u * 1, u * 22, u * 12, { wall: "#d4b48c", roof: "#3a3030", roofType: "eave", roofH: u * 4, d: 0.12, timber: "#5a3a24", chimney: true, lit: 0.8 });
    // 岩風呂と湯気
    const px = cx - u * 2, py = h - u * 6;
    ctx.fillStyle = P.c("#6a6a6a"); ctx.beginPath(); ctx.ellipse(px, py, u * 18, u * 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.c(mix("#8ac0c8", P.sky.hor, 0.4)); ctx.beginPath(); ctx.ellipse(px, py, u * 15, u * 3, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ctx.fillStyle = P.lit("#7a7470", 0, 0.2 + R() * 0.2); ctx.beginPath(); ctx.ellipse(px + Math.cos(a) * u * 16.5, py + Math.sin(a) * u * 3.6, u * 2, u * 1.2, 0, 0, Math.PI * 2); ctx.fill(); }
    const steam = (x, y, s) => { V.smoke(P, x, y, s, 0, "#f0f2f4"); };
    steam(px - u * 6, py, u * 4); steam(px + u * 5, py, u * 5); steam(cx + u * 20, sb - u * 16, u * 3);
    P.anim.push({ draw: (c, t) => { for (let i = 0; i < 6; i++) { const ph = (t * 0.12 + i / 6) % 1, x = px + (i - 2.5) * u * 4 + Math.sin(t + i) * u, y = py - ph * u * 22, r = u * (2 + ph * 6); const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(240,242,246,${0.28 * (1 - ph)})`); g.addColorStop(1, "rgba(240,242,246,0)"); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); } } });
    lamp(P, cx - u * 8, sb + u * 4, u * 6); lamp(P, cx + u * 10, sb + u * 5, u * 6);
    V.frame(P, { color: "#1e2a1e" });
  };

  // ---------------------------------------------------------------- 狩り場の町ナグリス（大木の枝に架けた家々。東の空に雲に届く大樹の影）
  OUT.w2_hunt = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    // 東の空の大樹
    const bx = w * 0.82;
    ctx.fillStyle = P.c("#4a5a5a", 0.85); ctx.beginPath(); ctx.moveTo(bx - u * 5, hz); ctx.lineTo(bx - u * 3, hz - u * 30); ctx.lineTo(bx + u * 3, hz - u * 30); ctx.lineTo(bx + u * 5, hz); ctx.fill();
    for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 17) * Math.PI, r = u * (12 + R() * 6); ctx.fillStyle = P.c(i % 2 ? "#5a6a5a" : "#4a5a4c", 0.82); ctx.beginPath(); ctx.arc(bx + Math.cos(a) * r, hz - u * 34 + Math.sin(a) * r * 0.55, u * (5 + R() * 3), 0, Math.PI * 2); ctx.fill(); }
    V.hills(P, { base: hz, amp: u * 4, d: 0.6, color: "#4a6a40" });
    V.forestBand(P, { base: hz + u * 1, size: u * 5, d: 0.45, kind: "broad" });
    V.ground(P, { top: hz + u * 1, color: "#4a5a34", tex: "grass" });
    // 大木の幹と、枝に架けた家・吊り橋
    const trunk = (x, s, d) => {
      const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
      g.addColorStop(P.ldir < 0 ? 0 : 1, P.lit("#5a4030", d, 0.3)); g.addColorStop(P.ldir < 0 ? 1 : 0, P.dark("#3a2a20", d, 0.5));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * 1.4, h); ctx.quadraticCurveTo(x - s, hz, x - s * 0.8, -10); ctx.lineTo(x + s * 0.8, -10); ctx.quadraticCurveTo(x + s, hz, x + s * 1.4, h); ctx.fill();
      ctx.strokeStyle = rgba(P.dark("#2a1e14", d), 0.4); ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const xx = x + (i / 5 - 0.5) * s * 1.4; ctx.beginPath(); ctx.moveTo(xx, -10); ctx.lineTo(xx + (R() - 0.5) * s * 0.4, h); ctx.stroke(); }
    };
    trunk(cx - u * 26, u * 4, 0.3); trunk(cx + u * 20, u * 5, 0.25);
    const deck = (x, y, s, d) => { ctx.fillStyle = P.dark("#4a3020", d, 0.2); ctx.fillRect(x - s * 0.8, y, s * 1.6, s * 0.12); V.house(P, x - s * 0.5, y, s, s * 0.7, { wall: "#a0805a", roof: "#5a4a30", roofType: "gable", d, timber: "#4a3020", lit: 0.8, side: 0, chimney: R() < 0.5 }); };
    deck(cx - u * 26, hz - u * 14, u * 8, 0.3); deck(cx + u * 20, hz - u * 20, u * 9, 0.25); deck(cx + u * 20, hz - u * 4, u * 7, 0.25);
    ctx.strokeStyle = P.c("#5a4030", 0.3); ctx.lineWidth = u * 0.2;
    ctx.beginPath(); ctx.moveTo(cx - u * 20, hz - u * 13.5); ctx.quadraticCurveTo(cx, hz - u * 8, cx + u * 14, hz - u * 19.5); ctx.stroke();
    for (let t = 0.05; t < 1; t += 0.05) { const x = lerp(cx - u * 20, cx + u * 14, t), y = (1 - t) * (1 - t) * (hz - u * 13.5) + 2 * t * (1 - t) * (hz - u * 8) + t * t * (hz - u * 19.5); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - u * 1.5); ctx.stroke(); }
    // 葉の天蓋と木漏れ日
    for (let i = 0; i < 40; i++) { ctx.fillStyle = P.dark(R() < 0.5 ? "#2a4a24" : "#3a5a2a", 0, 0.4); ctx.beginPath(); ctx.arc(R() * w, R() * u * 8 - u * 2, u * (3 + R() * 5), 0, Math.PI * 2); ctx.fill(); }
    if (!P.night) { ctx.save(); ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 6; i++) { const x = R() * w; const g = ctx.createLinearGradient(x, 0, x + u * 10, h); g.addColorStop(0, rgba(P.sun.col, 0.12)); g.addColorStop(1, rgba(P.sun.col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + u * 2, 0); ctx.lineTo(x + u * 14, h); ctx.lineTo(x + u * 8, h); ctx.fill(); } ctx.restore(); }
    V.lamp(P, cx - u * 6, h - u * 6, u * 7, { col: "#ffc070" });
    // 吊るした獲物（毛皮）
    for (const x of [cx - u * 22, cx - u * 30]) { ctx.strokeStyle = P.c("#3a2a1e"); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, hz - u * 13); ctx.lineTo(x, hz - u * 9); ctx.stroke(); ctx.fillStyle = P.c("#7a5a3a", 0.2); ctx.beginPath(); ctx.ellipse(x, hz - u * 7.5, u * 1, u * 1.8, 0, 0, Math.PI * 2); ctx.fill(); }
    V.frame(P, { color: "#1a2614", leaves: true });
  };
})(globalThis.G = globalThis.G || {});
