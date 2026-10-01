// 背景の絵（V2）：施設の中と迷宮の中。一点透視の部屋・石の通路・洞窟に、灯り（暖炉・蝋燭・松明）の光を重ねる。
// 道具は scene_v2.js の G.SV2。field（畑）と hunt（狩り場）は町の昼・朝の景色を使う
(function (G) {
  const V = G.SV2;
  if (!V) return;
  const { mix, rgba, clamp, lerp } = V;
  const IN = V.IN;

  // 下がった灯（鎖とランタン）
  function hangLamp(P, x, y, s, col) {
    const { ctx } = P;
    ctx.strokeStyle = "#1a120c"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - s); ctx.stroke();
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(x - s * 0.5, y - s, s, s * 0.2);
    ctx.fillStyle = mix(col || "#ffc070", "#fff4d0", 0.4); ctx.fillRect(x - s * 0.35, y - s * 0.8, s * 0.7, s * 0.8);
    V.light(P, x, y - s * 0.4, s * 12, col || "#ffc070", 1, true);
  }
  // 吊るした旗
  function banner(P, x, y, bw, bh, col, mark) {
    const { ctx } = P;
    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, mix(col, "#000", 0.45)); g.addColorStop(0.5, col); g.addColorStop(1, mix(col, "#000", 0.55));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw / 2, y + bh * 0.85); ctx.lineTo(x, y + bh); ctx.fill();
    ctx.fillStyle = "#1a120c"; ctx.fillRect(x - bw * 0.1, y - bw * 0.06, bw * 1.2, bw * 0.08);
    if (mark) { ctx.fillStyle = mark; ctx.beginPath(); ctx.arc(x + bw / 2, y + bh * 0.4, bw * 0.22, 0, Math.PI * 2); ctx.fill(); }
  }
  // 武器掛け
  function weaponRack(P, x, base, s) {
    const { ctx } = P;
    ctx.fillStyle = "#3a2614"; ctx.fillRect(x - s, base - s * 1.4, s * 2, s * 0.08); ctx.fillRect(x - s, base - s * 0.5, s * 2, s * 0.08);
    ctx.fillRect(x - s, base - s * 1.5, s * 0.08, s * 1.5); ctx.fillRect(x + s * 0.92, base - s * 1.5, s * 0.08, s * 1.5);
    for (let i = 0; i < 5; i++) { const wx = x - s * 0.7 + i * s * 0.35; ctx.fillStyle = "#a8acb4"; ctx.fillRect(wx - s * 0.02, base - s * 1.9, s * 0.04, s * 1.5); ctx.fillStyle = "#5a3a1e"; ctx.fillRect(wx - s * 0.03, base - s * 0.5, s * 0.06, s * 0.4); if (i % 2) { ctx.fillStyle = "#8a8e96"; ctx.beginPath(); ctx.moveTo(wx, base - s * 1.95); ctx.lineTo(wx + s * 0.15, base - s * 1.75); ctx.lineTo(wx, base - s * 1.6); ctx.fill(); } }
  }
  // 部屋の暗がり（灯りの外は暗い）
  function dim(P, a) { const { ctx, w, h } = P; const g = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.2, w / 2, h * 0.55, Math.max(w, h) * 0.8); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  Object.assign(V, { hangLamp, banner, weaponRack, dim });

  // ---------------------------------------------------------------- 宿屋（板張り、暖炉、階段、窓）
  IN.inn = (P) => {
    const { w, h, u, ctx } = P;
    const r = V.room(P, { wall: "#7a5434", floor: "#4a3018", tex: "plank", beams: "#3a2414" });
    V.hearth(P, r.x + r.w * 0.22, r.b, r.h * 0.32, { stone: "#6a5a4a" });
    V.roomWindow(P, r.x + r.w * 0.62, r.y + r.h * 0.18, r.w * 0.12, r.h * 0.34);
    // 階段（右奥へ上がる）
    for (let i = 0; i < 8; i++) { ctx.fillStyle = mix("#5a3a20", "#000", 0.2 + i * 0.05); ctx.fillRect(r.x + r.w * (0.78 + i * 0.025), r.b - i * r.h * 0.07, r.w * 0.2, r.h * 0.07); }
    V.table(P, P.cx - w * 0.18, h * 0.86, w * 0.16); V.table(P, P.cx + w * 0.2, h * 0.84, w * 0.15);
    V.candle(P, P.cx - w * 0.18, h * 0.86 - w * 0.016 - u * 2, u * 1.2); V.candle(P, P.cx + w * 0.2, h * 0.84 - w * 0.015 - u * 2, u * 1.2);
    V.barrel(P, r.x - w * 0.05, h * 0.82, u * 7);
    V.hangLamp(P, P.cx, h * 0.12, u * 2);
    dim(P, 0.55);
  };

  // ---------------------------------------------------------------- 酒場（長い勘定台、酒瓶の棚、樽、吊りランプ）
  IN.tavern = (P) => {
    const { w, h, u, ctx } = P;
    const r = V.room(P, { wall: "#6a4428", floor: "#3a2412", tex: "plank", beams: "#2e1c0e" });
    V.shelf(P, r.x + r.w * 0.08, r.y + r.h * 0.12, r.w * 0.84, r.h * 0.55, { rows: 3 });
    // 勘定台
    const cy = r.b + (h - r.b) * 0.25;
    const g = ctx.createLinearGradient(0, cy - h * 0.12, 0, cy);
    g.addColorStop(0, "#7a4a24"); g.addColorStop(1, "#3a2210");
    ctx.fillStyle = g; ctx.fillRect(r.x - w * 0.06, cy - h * 0.12, r.w + w * 0.12, h * 0.12);
    ctx.fillStyle = "#a06a3a"; ctx.fillRect(r.x - w * 0.08, cy - h * 0.13, r.w + w * 0.16, h * 0.02);
    for (let i = 0; i < 6; i++) { const x = r.x + r.w * (0.1 + i * 0.16); ctx.fillStyle = "rgba(230,200,140,.8)"; ctx.fillRect(x, cy - h * 0.16, u * 1.2, h * 0.03); ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(x, cy - h * 0.165, u * 1.2, h * 0.008); }
    for (const [x, s] of [[w * 0.06, u * 9], [w * 0.14, u * 7], [w * 0.92, u * 9]]) V.barrel(P, x, h * 0.98, s);
    V.hangLamp(P, P.cx - w * 0.22, h * 0.18, u * 2.2); V.hangLamp(P, P.cx + w * 0.22, h * 0.2, u * 2.2); V.hangLamp(P, P.cx, h * 0.1, u * 1.6);
    dim(P, 0.5);
  };

  // ---------------------------------------------------------------- 商店（品物の棚、吊るした品、天秤の勘定台）
  IN.shop = (P) => {
    const { w, h, u, ctx, R } = P;
    const r = V.room(P, { wall: "#8a6a48", floor: "#4a3420", tex: "plank", beams: "#3a2414" });
    V.shelf(P, r.x + r.w * 0.04, r.y + r.h * 0.08, r.w * 0.4, r.h * 0.8, { rows: 4, colors: ["#8a6a3a", "#6a4a2a", "#a07a4a", "#5a6a3a", "#7a3a2a"] });
    V.shelf(P, r.x + r.w * 0.56, r.y + r.h * 0.08, r.w * 0.4, r.h * 0.8, { rows: 4 });
    // 吊るした品（鍋・縄・ランタン・剣）
    for (let i = 0; i < 9; i++) { const x = w * (0.15 + i * 0.09), y = h * (0.08 + R() * 0.08); ctx.strokeStyle = "#1a120c"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = ["#5a5a62", "#8a6a3a", "#6a4a2a", "#a8acb4"][i % 4]; ctx.beginPath(); ctx.ellipse(x, y + u * 1.5, u * (1 + R()), u * 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
    // 勘定台と天秤
    const cy = h * 0.8;
    ctx.fillStyle = "#5a3a1e"; ctx.fillRect(P.cx - w * 0.3, cy, w * 0.6, h * 0.2); ctx.fillStyle = "#8a5a30"; ctx.fillRect(P.cx - w * 0.32, cy - h * 0.015, w * 0.64, h * 0.025);
    ctx.strokeStyle = "#c8a040"; ctx.lineWidth = u * 0.3; ctx.beginPath(); ctx.moveTo(P.cx + w * 0.15, cy); ctx.lineTo(P.cx + w * 0.15, cy - u * 8); ctx.moveTo(P.cx + w * 0.15 - u * 4, cy - u * 7); ctx.lineTo(P.cx + w * 0.15 + u * 4, cy - u * 7); ctx.stroke();
    for (const s of [-1, 1]) { ctx.fillStyle = "#c8a040"; ctx.beginPath(); ctx.ellipse(P.cx + w * 0.15 + s * u * 4, cy - u * 4, u * 1.6, u * 0.4, 0, 0, Math.PI); ctx.fill(); }
    V.candle(P, P.cx - w * 0.2, cy - u * 2.5, u * 1.4);
    V.roomWindow(P, r.x + r.w * 0.45, r.y + r.h * 0.12, r.w * 0.1, r.h * 0.3);
    V.hangLamp(P, P.cx, h * 0.14, u * 2);
    dim(P, 0.5);
  };

  // ---------------------------------------------------------------- 冒険者ギルド（依頼の貼り紙の掲示板、旗、長卓、大燭台）
  IN.guild = (P) => {
    const { w, h, u, ctx, R } = P;
    const r = V.room(P, { wall: "#6a5a48", floor: "#3a2c20", tex: "stone", floorTex: "plank", beams: "#2a1e14" });
    // 掲示板と貼り紙
    const bx = r.x + r.w * 0.22, by = r.y + r.h * 0.15, bw = r.w * 0.56, bh = r.h * 0.55;
    ctx.fillStyle = "#4a3018"; ctx.fillRect(bx - u, by - u, bw + u * 2, bh + u * 2); ctx.fillStyle = "#8a6a44"; ctx.fillRect(bx, by, bw, bh);
    for (let i = 0; i < 16; i++) { const x = bx + R() * bw * 0.85, y = by + R() * bh * 0.8, pw = bw * (0.08 + R() * 0.06); ctx.save(); ctx.translate(x + pw / 2, y); ctx.rotate((R() - 0.5) * 0.15); ctx.fillStyle = R() < 0.8 ? "#e8dcc0" : "#f0c8a0"; ctx.fillRect(-pw / 2, 0, pw, pw * 1.3); ctx.fillStyle = "rgba(40,30,20,.5)"; for (let k = 0; k < 4; k++) ctx.fillRect(-pw * 0.35, pw * (0.25 + k * 0.22), pw * 0.7, pw * 0.05); ctx.fillStyle = "#a02a1e"; ctx.beginPath(); ctx.arc(0, pw * 0.05, pw * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    banner(P, r.x + r.w * 0.04, r.y + r.h * 0.05, r.w * 0.1, r.h * 0.6, "#8a2a1e", "#e8c040");
    banner(P, r.x + r.w * 0.86, r.y + r.h * 0.05, r.w * 0.1, r.h * 0.6, "#2a4a7a", "#e8c040");
    V.table(P, P.cx - w * 0.22, h * 0.88, w * 0.22); V.table(P, P.cx + w * 0.24, h * 0.9, w * 0.2);
    V.candle(P, P.cx - w * 0.22, h * 0.88 - w * 0.022 - u * 2, u * 1.3);
    // 大燭台
    const cx = P.cx, cyy = h * 0.1;
    ctx.strokeStyle = "#2a1c10"; ctx.lineWidth = u * 0.3; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, cyy); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cyy, u * 8, u * 1.4, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; V.candle(P, cx + Math.cos(a) * u * 8, cyy + Math.sin(a) * u * 1.4 - u * 1.4, u * 1.2); }
    V.light(P, cx, cyy, u * 30, "#ffc070", 1);
    V.weaponRack(P, r.x + r.w * 0.5, r.b, u * 2.5);
    dim(P, 0.5);
  };

  // ---------------------------------------------------------------- 教会（柱の並ぶ身廊、色硝子の窓、祭壇の蝋燭）
  IN.church = (P) => {
    const { w, h, u, ctx } = P;
    const r = V.room(P, { wall: "#8a8478", floor: "#4a4440", tex: "stone", backW: Math.min(w * 0.36, h * 0.7), backH: h * 0.52, backY: h * 0.08 });
    // 色硝子の窓（奥）と、床に落ちる色の光
    const gx = P.cx - r.w * 0.18, gy = r.y + r.h * 0.08, gw = r.w * 0.36, gh = r.h * 0.6;
    const cols = ["#c83a3a", "#3a6ac8", "#e8c040", "#4aa060", "#8a4ac8"];
    ctx.fillStyle = "#1a1612"; ctx.beginPath(); ctx.moveTo(gx - u, gy + gh + u); ctx.lineTo(gx - u, gy + gw / 2); ctx.arc(gx + gw / 2, gy + gw / 2, gw / 2 + u, Math.PI, 0); ctx.lineTo(gx + gw + u, gy + gh + u); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx, gy + gw / 2); ctx.arc(gx + gw / 2, gy + gw / 2, gw / 2, Math.PI, 0); ctx.lineTo(gx + gw, gy + gh); ctx.clip();
    const n = 8; for (let i = 0; i < n * 2; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = mix(cols[(i + j * 3) % cols.length], "#ffffff", P.phase === 3 ? 0 : 0.25); ctx.globalAlpha = P.phase === 3 ? 0.45 : 0.9; ctx.fillRect(gx + j * gw / 4, gy + i * gh / (n * 2), gw / 4 - 1, gh / (n * 2) - 1); }
    ctx.restore(); ctx.globalAlpha = 1;
    if (P.phase !== 3) { ctx.save(); ctx.globalCompositeOperation = "lighter"; cols.forEach((c, i) => { ctx.fillStyle = rgba(c, 0.06); ctx.beginPath(); ctx.moveTo(gx + i * gw / 5, gy + gh); ctx.lineTo(gx + (i + 1) * gw / 5, gy + gh); ctx.lineTo(P.cx + (i - 2) * w * 0.12 + w * 0.06, h); ctx.lineTo(P.cx + (i - 2) * w * 0.12 - w * 0.02, h); ctx.fill(); }); ctx.restore(); }
    // 柱の列（左右に、奥へ小さく）
    for (let i = 0; i < 5; i++) { const t = Math.pow(i / 5, 0.8); for (const s of [-1, 1]) { const x = lerp(s < 0 ? w * 0.06 : w * 0.94, s < 0 ? r.x + r.w * 0.06 : r.x + r.w * 0.94, t), top = lerp(0, r.y, t), bot = lerp(h, r.b, t), cw = lerp(w * 0.07, r.w * 0.05, t); const g = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0); g.addColorStop(0, "#3a3632"); g.addColorStop(0.4, mix("#a8a296", "#000", t * 0.3)); g.addColorStop(1, "#2a2622"); ctx.fillStyle = g; ctx.fillRect(x - cw / 2, top, cw, bot - top); } }
    // 祭壇と蝋燭
    const ab = r.b;
    ctx.fillStyle = "#e8e0cc"; ctx.fillRect(P.cx - r.w * 0.16, ab - r.h * 0.12, r.w * 0.32, r.h * 0.12); ctx.fillStyle = "#c8a040"; ctx.fillRect(P.cx - r.w * 0.16, ab - r.h * 0.13, r.w * 0.32, r.h * 0.015);
    for (let i = 0; i < 7; i++) V.candle(P, P.cx - r.w * 0.13 + i * r.w * 0.043, ab - r.h * 0.13 - u * (1.4 + (i % 2) * 0.6), u * (1.2 + (i % 2) * 0.6));
    ctx.strokeStyle = "#e8c860"; ctx.lineWidth = u * 0.4; ctx.beginPath(); ctx.moveTo(P.cx, ab - r.h * 0.4); ctx.lineTo(P.cx, ab - r.h * 0.15); ctx.moveTo(P.cx - u * 2.2, ab - r.h * 0.33); ctx.lineTo(P.cx + u * 2.2, ab - r.h * 0.33); ctx.stroke();
    // 長椅子
    for (let i = 0; i < 4; i++) { const t = i / 4, y = lerp(h * 0.98, r.b + (h - r.b) * 0.2, Math.pow(t, 0.7)), ww = lerp(w * 0.3, r.w * 0.3, t); for (const s of [-1, 1]) { ctx.fillStyle = mix("#4a2e18", "#000", t * 0.4); ctx.fillRect(P.cx + s * (ww * 0.15) - (s < 0 ? ww : 0), y - h * 0.04 * (1 - t * 0.6), ww, h * 0.04 * (1 - t * 0.6)); } }
    dim(P, 0.45);
  };

  // ---------------------------------------------------------------- 訓練場（砂の床、藁人形、武器掛け、高い窓）
  IN.train = (P) => {
    const { w, h, u, ctx, R } = P;
    const r = V.room(P, { wall: "#7a6a54", floor: "#8a7454", tex: "stone", floorTex: "stone", beams: "#3a2a1a" });
    for (let i = 0; i < 300; i++) { ctx.fillStyle = rgba(R() < 0.5 ? "#b49a70" : "#5a4a34", 0.3); ctx.fillRect(R() * w, r.b + R() * (h - r.b), u * 0.4, u * 0.2); }
    V.roomWindow(P, r.x + r.w * 0.15, r.y + r.h * 0.05, r.w * 0.12, r.h * 0.25); V.roomWindow(P, r.x + r.w * 0.73, r.y + r.h * 0.05, r.w * 0.12, r.h * 0.25);
    V.weaponRack(P, r.x + r.w * 0.5, r.b, u * 4);
    // 藁人形
    const dummy = (x, base, s) => { ctx.fillStyle = "#4a3018"; ctx.fillRect(x - s * 0.04, base - s, s * 0.08, s); ctx.fillStyle = "#c8a860"; ctx.beginPath(); ctx.ellipse(x, base - s * 0.75, s * 0.18, s * 0.26, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x, base - s * 1.08, s * 0.1, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - s * 0.4, base - s * 0.9, s * 0.8, s * 0.07); ctx.strokeStyle = "#8a6a30"; ctx.lineWidth = 1; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x - s * 0.15, base - s * (0.6 + k * 0.05)); ctx.lineTo(x + s * 0.15, base - s * (0.62 + k * 0.05)); ctx.stroke(); } ctx.fillStyle = "#8a2a1e"; ctx.beginPath(); ctx.arc(x, base - s * 0.78, s * 0.06, 0, Math.PI * 2); ctx.fill(); };
    dummy(w * 0.12, h * 0.95, h * 0.5); dummy(w * 0.88, h * 0.93, h * 0.46); dummy(r.x + r.w * 0.2, r.b + (h - r.b) * 0.2, h * 0.22);
    V.torch(P, r.x, r.y + r.h * 0.45, u * 1.5); V.torch(P, r.x + r.w, r.y + r.h * 0.45, u * 1.5);
    dim(P, 0.45);
  };

  // ---------------------------------------------------------------- 裏路地（夜の細い路地。壁の灯、木箱、水たまり、洗濯物）
  IN.alley = (P) => {
    const { w, h, u, ctx, R } = P;
    const sk = { top: "#070b18", bot: "#1f2a48" };
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.5); g.addColorStop(0, sk.top); g.addColorStop(1, sk.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.5})`; ctx.fillRect(P.cx + (R() - 0.5) * w * 0.2, R() * h * 0.4, 1, 1); }
    // 両側の壁（奥へ狭まる）
    const vx = P.cx, vy = h * 0.5;
    for (const s of [-1, 1]) {
      const ex = s < 0 ? 0 : w, ix = vx + s * w * 0.07;
      const wg = ctx.createLinearGradient(ex, 0, ix, 0); wg.addColorStop(0, "#1a1410"); wg.addColorStop(1, "#3a3028");
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(ex, -h * 0.2); ctx.lineTo(ix, vy - h * 0.35); ctx.lineTo(ix, vy + h * 0.05); ctx.lineTo(ex, h); ctx.fill();
      ctx.strokeStyle = "rgba(10,8,6,.6)"; ctx.lineWidth = 1;
      for (let i = 1; i < 14; i++) { const t = i / 14; ctx.beginPath(); ctx.moveTo(ex, lerp(-h * 0.2, h, t)); ctx.lineTo(ix, lerp(vy - h * 0.35, vy + h * 0.05, t)); ctx.stroke(); }
      for (let i = 0; i < 3; i++) { const t = 0.2 + i * 0.25, x = lerp(ex, ix, t), y = lerp(h * 0.25, vy - h * 0.1, t), ww = lerp(w * 0.08, w * 0.01, t); const lit = (i + (s > 0 ? 1 : 0)) % 2 === 0; ctx.fillStyle = lit ? "#ffb050" : "#14100c"; ctx.fillRect(x - ww / 2, y, ww, ww * 1.3); if (lit) V.light(P, x, y + ww * 0.6, ww * 4, "#ffb050", 0.8, true); }
    }
    // 石畳と水たまり
    ctx.fillStyle = "#2a2622"; ctx.beginPath(); ctx.moveTo(vx - w * 0.07, vy + h * 0.05); ctx.lineTo(vx + w * 0.07, vy + h * 0.05); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    for (let i = 0; i < 6; i++) { const t = 0.3 + R() * 0.7, y = lerp(vy + h * 0.05, h, t), x = vx + (R() - 0.5) * w * 0.5 * t; ctx.fillStyle = "rgba(90,110,150,.3)"; ctx.beginPath(); ctx.ellipse(x, y, w * 0.06 * t, h * 0.01 * t + 1, 0, 0, Math.PI * 2); ctx.fill(); }
    // 洗濯物の綱
    for (let k = 0; k < 2; k++) { const y = h * (0.12 + k * 0.12), x0 = lerp(0, vx - w * 0.07, 0.3 + k * 0.3), x1 = lerp(w, vx + w * 0.07, 0.3 + k * 0.3); ctx.strokeStyle = "#0a0806"; ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(vx, y + h * 0.05, x1, y); ctx.stroke(); for (let i = 1; i < 6; i++) { const x = lerp(x0, x1, i / 6); ctx.fillStyle = ["#5a3a3a", "#3a4a5a", "#6a6050"][i % 3]; ctx.fillRect(x - u, y + h * 0.03 * Math.sin((i / 6) * Math.PI), u * 2, u * 3); } }
    V.lamp && V.lamp(P, w * 0.8, h * 0.95, u * 14, { on: true });
    for (const [x, s] of [[w * 0.1, u * 8], [w * 0.17, u * 6]]) { ctx.fillStyle = "#3a2a1a"; ctx.fillRect(x - s / 2, h * 0.97 - s, s, s); ctx.strokeStyle = "#1a120a"; ctx.lineWidth = s * 0.05; ctx.strokeRect(x - s / 2, h * 0.97 - s, s, s); }
    dim(P, 0.55);
  };

  // ---------------------------------------------------------------- 王城の玉座の間（赤い絨毯、柱、旗、高い窓、壇の上の玉座）
  IN.throne = (P) => {
    const { w, h, u, ctx } = P;
    const r = V.room(P, { wall: "#c8c0b0", floor: "#5a5048", tex: "stone", floorTex: "stone", backW: Math.min(w * 0.42, h * 0.8), backY: h * 0.06, backH: h * 0.56, amb: 0.7 });
    // 高い窓
    for (const k of [-0.32, 0.32]) V.roomWindow(P, P.cx + r.w * k - r.w * 0.06, r.y + r.h * 0.06, r.w * 0.12, r.h * 0.5, { arch: true });
    // 旗
    for (const k of [-0.14, 0.14]) banner(P, P.cx + r.w * k - r.w * 0.05, r.y + r.h * 0.04, r.w * 0.1, r.h * 0.5, "#9a1e1e", "#e8c040");
    // 赤い絨毯（奥へ細く）
    ctx.fillStyle = "#7a1414"; ctx.beginPath(); ctx.moveTo(P.cx - r.w * 0.08, r.b); ctx.lineTo(P.cx + r.w * 0.08, r.b); ctx.lineTo(P.cx + w * 0.16, h); ctx.lineTo(P.cx - w * 0.16, h); ctx.fill();
    ctx.strokeStyle = "#c8a040"; ctx.lineWidth = u * 0.3; ctx.beginPath(); ctx.moveTo(P.cx - r.w * 0.07, r.b); ctx.lineTo(P.cx - w * 0.14, h); ctx.moveTo(P.cx + r.w * 0.07, r.b); ctx.lineTo(P.cx + w * 0.14, h); ctx.stroke();
    // 壇と玉座
    const tb = r.b;
    for (let i = 0; i < 3; i++) { ctx.fillStyle = mix("#8a8070", "#000", i * 0.12); ctx.fillRect(P.cx - r.w * (0.22 - i * 0.04), tb - r.h * (0.03 + i * 0.03), r.w * (0.44 - i * 0.08), r.h * 0.035); }
    const ty = tb - r.h * 0.12;
    ctx.fillStyle = "#c8a040"; ctx.beginPath(); ctx.moveTo(P.cx - r.w * 0.06, ty); ctx.lineTo(P.cx - r.w * 0.06, ty - r.h * 0.32); ctx.lineTo(P.cx - r.w * 0.03, ty - r.h * 0.38); ctx.lineTo(P.cx, ty - r.h * 0.34); ctx.lineTo(P.cx + r.w * 0.03, ty - r.h * 0.38); ctx.lineTo(P.cx + r.w * 0.06, ty - r.h * 0.32); ctx.lineTo(P.cx + r.w * 0.06, ty); ctx.fill();
    ctx.fillStyle = "#8a1a1a"; ctx.fillRect(P.cx - r.w * 0.04, ty - r.h * 0.28, r.w * 0.08, r.h * 0.26);
    // 柱
    for (let i = 0; i < 4; i++) { const t = Math.pow(i / 4, 0.8); for (const s of [-1, 1]) { const x = lerp(s < 0 ? w * 0.05 : w * 0.95, s < 0 ? r.x + r.w * 0.04 : r.x + r.w * 0.96, t), top = lerp(0, r.y, t), bot = lerp(h, r.b, t), cw = lerp(w * 0.06, r.w * 0.04, t); const g = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0); g.addColorStop(0, "#5a5248"); g.addColorStop(0.4, "#e8e0d0"); g.addColorStop(1, "#4a443c"); ctx.fillStyle = g; ctx.fillRect(x - cw / 2, top, cw, bot - top); } }
    for (const k of [-0.4, 0.4]) V.torch(P, P.cx + r.w * k, r.y + r.h * 0.6, u * 1.6);
    dim(P, 0.4);
  };

  // ---------------------------------------------------------------- 学院（天井までの書架、浮かぶ灯り、床の魔法陣、結晶の窓）
  IN.academy = (P) => {
    const { w, h, u, ctx, R } = P;
    const r = V.room(P, { wall: "#4a3a5a", floor: "#2a2434", tex: "plank", floorTex: "stone", backY: h * 0.08, backH: h * 0.56 });
    // 書架（奥の壁と側の壁）
    V.shelf(P, r.x, r.y, r.w * 0.3, r.h, { rows: 6, colors: ["#6a2a2a", "#2a3a6a", "#3a5a2a", "#6a5a2a", "#4a2a5a"], wood: "#2a1a10" });
    V.shelf(P, r.x + r.w * 0.7, r.y, r.w * 0.3, r.h, { rows: 6, colors: ["#6a2a2a", "#2a3a6a", "#3a5a2a", "#6a5a2a", "#4a2a5a"], wood: "#2a1a10" });
    // 結晶の窓
    const gx = P.cx - r.w * 0.15, gy = r.y + r.h * 0.08, gw = r.w * 0.3, gh = r.h * 0.6;
    const g = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh); g.addColorStop(0, "#a0e8ff"); g.addColorStop(0.5, "#7a7aff"); g.addColorStop(1, "#c8a0ff");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(gx + gw / 2, gy); ctx.lineTo(gx + gw, gy + gh * 0.3); ctx.lineTo(gx + gw, gy + gh); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx, gy + gh * 0.3); ctx.fill();
    ctx.strokeStyle = "#1a1428"; ctx.lineWidth = u * 0.3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(gx + gw / 2, gy); ctx.lineTo(gx + (i / 5) * gw, gy + gh); ctx.stroke(); }
    V.light(P, gx + gw / 2, gy + gh / 2, gw * 2, "#9ab0ff", 1);
    // 床の魔法陣
    const my = r.b + (h - r.b) * 0.5;
    ctx.save(); ctx.translate(P.cx, my); ctx.scale(1, 0.3);
    ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(140,220,255,.6)"; ctx.lineWidth = u * 0.4;
    for (const rr of [w * 0.22, w * 0.18]) { ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); for (let i = 0; i <= 5; i++) { const a = (i * 2 / 5) * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * w * 0.18, y = Math.sin(a) * w * 0.18; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.restore();
    V.light(P, P.cx, my, w * 0.25, "#8ad8ff", 0.8, true);
    // 浮かぶ灯り（ゆっくり上下）
    const orbs = Array.from({ length: 10 }, () => [R() * w, h * (0.1 + R() * 0.5), R() * 6]);
    for (const [x, y] of orbs) V.light(P, x, y, u * 5, "#c8f0ff", 0.6);
    P.anim.push({ draw: (c, t) => { c.save(); c.globalCompositeOperation = "lighter"; for (const [x, y, ph] of orbs) { const yy = y + Math.sin(t * 0.8 + ph) * u * 1.5; const gg = c.createRadialGradient(x, yy, 0, x, yy, u * 2); gg.addColorStop(0, "rgba(230,250,255,.9)"); gg.addColorStop(1, "rgba(160,220,255,0)"); c.fillStyle = gg; c.fillRect(x - u * 2, yy - u * 2, u * 4, u * 4); } c.restore(); } });
    dim(P, 0.5);
  };

  // ---------------------------------------------------------------- 鍛冶場（炉の火、金床、吊るした道具、火の粉）
  IN.forge = (P) => {
    const { w, h, u, ctx } = P;
    const r = V.room(P, { wall: "#4a3a32", floor: "#2a2220", tex: "brick", floorTex: "stone", beams: "#1e1612" });
    // 炉
    const fx = P.cx + r.w * 0.2, fb = r.b;
    ctx.fillStyle = "#3a2a24"; ctx.beginPath(); ctx.moveTo(fx - r.w * 0.2, fb); ctx.lineTo(fx - r.w * 0.16, fb - r.h * 0.5); ctx.lineTo(fx - r.w * 0.06, r.y); ctx.lineTo(fx + r.w * 0.06, r.y); ctx.lineTo(fx + r.w * 0.16, fb - r.h * 0.5); ctx.lineTo(fx + r.w * 0.2, fb); ctx.fill();
    ctx.fillStyle = "#1a0804"; ctx.beginPath(); ctx.arc(fx, fb - r.h * 0.2, r.w * 0.1, Math.PI, 0); ctx.lineTo(fx + r.w * 0.1, fb - r.h * 0.05); ctx.lineTo(fx - r.w * 0.1, fb - r.h * 0.05); ctx.fill();
    const fg = ctx.createRadialGradient(fx, fb - r.h * 0.12, 0, fx, fb - r.h * 0.12, r.w * 0.12); fg.addColorStop(0, "#fff0a0"); fg.addColorStop(0.5, "#ff7a1a"); fg.addColorStop(1, "rgba(160,30,0,0)");
    ctx.fillStyle = fg; ctx.fillRect(fx - r.w * 0.12, fb - r.h * 0.3, r.w * 0.24, r.h * 0.3);
    V.light(P, fx, fb - r.h * 0.15, w * 0.6, "#ff7a2a", 1.5, true);
    P.anim.push({ type: "flame", x: fx, y: fb - r.h * 0.06, s: r.w * 0.08, col: "#ff8a2a" });
    P.embers = { x: fx, y: fb - r.h * 0.2, spread: r.w * 0.2, col: "#ffb050" };
    // 金床
    const ax = P.cx - w * 0.15, ay = h * 0.9, s = u * 6;
    ctx.fillStyle = "#2a2a30"; ctx.beginPath(); ctx.moveTo(ax - s * 1.4, ay - s); ctx.lineTo(ax + s * 1.8, ay - s); ctx.lineTo(ax + s, ay - s * 0.6); ctx.lineTo(ax + s * 0.5, ay - s * 0.6); ctx.lineTo(ax + s * 0.8, ay); ctx.lineTo(ax - s * 0.8, ay); ctx.lineTo(ax - s * 0.5, ay - s * 0.6); ctx.lineTo(ax - s, ay - s * 0.6); ctx.fill();
    ctx.fillStyle = "#c86a3a"; ctx.fillRect(ax - s * 1.4, ay - s * 1.05, s * 3.2, s * 0.1);
    ctx.fillStyle = "#ff8a3a"; ctx.fillRect(ax - s * 0.3, ay - s * 1.15, s * 1.2, s * 0.12);
    // 吊るした道具
    for (let i = 0; i < 6; i++) { const x = r.x + r.w * (0.04 + i * 0.06), y = r.y + r.h * 0.3; ctx.fillStyle = "#5a5a62"; ctx.fillRect(x - u * 0.2, y, u * 0.4, r.h * 0.25); ctx.fillRect(x - u * 0.8, y + r.h * 0.25, u * 1.6, u * 1); }
    V.barrel(P, w * 0.06, h * 0.98, u * 8, { color: "#3a2a1a" });
    dim(P, 0.55);
  };

  // ---------------------------------------------------------------- 闘技場の中（砂の上から見上げる高い壁、鉄格子の門、鎖、色あせた旗、壁際の武器）
  IN.arena = (P) => {
    const { w, h, u, ctx, R } = P;
    const sk = [["#6f8fb8", "#f0c79a"], ["#4f7fbf", "#bcd6ec"], ["#2c2346", "#e2764a"], ["#070b18", "#1f2a48"]][P.phase];
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.3); g.addColorStop(0, sk[0]); g.addColorStop(1, sk[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 弧を描く高い壁
    const wy = h * 0.22, wb = h * 0.66;
    const wg = ctx.createLinearGradient(0, wy, 0, wb); wg.addColorStop(0, "#8a7a6a"); wg.addColorStop(1, "#4a3e34");
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(0, wy - h * 0.12); ctx.quadraticCurveTo(P.cx, wy + h * 0.06, w, wy - h * 0.12); ctx.lineTo(w, wb + h * 0.1); ctx.quadraticCurveTo(P.cx, wb - h * 0.04, 0, wb + h * 0.1); ctx.fill();
    ctx.strokeStyle = "rgba(30,24,20,.5)"; ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) { const t = i / 10; ctx.beginPath(); ctx.moveTo(0, lerp(wy - h * 0.12, wb + h * 0.1, t)); ctx.quadraticCurveTo(P.cx, lerp(wy + h * 0.06, wb - h * 0.04, t), w, lerp(wy - h * 0.12, wb + h * 0.1, t)); ctx.stroke(); }
    // 色あせた旗
    for (let i = 0; i < 7; i++) { const x = w * (0.08 + i * 0.14), y = wy - h * 0.1 + Math.pow((x - P.cx) / w, 2) * h * 0.35; banner(P, x - u * 2, y, u * 4, h * 0.18, ["#7a3a2a", "#3a4a6a", "#7a6a3a"][i % 3], null); }
    // 鉄格子の門
    const gx = P.cx, gy = wb - h * 0.02;
    ctx.fillStyle = "#0a0806"; ctx.beginPath(); ctx.moveTo(gx - w * 0.08, gy); ctx.lineTo(gx - w * 0.08, gy - h * 0.18); ctx.arc(gx, gy - h * 0.18, w * 0.08, Math.PI, 0); ctx.lineTo(gx + w * 0.08, gy); ctx.fill();
    ctx.strokeStyle = "#4a4a50"; ctx.lineWidth = u * 0.5; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(gx + i * w * 0.022, gy); ctx.lineTo(gx + i * w * 0.022, gy - h * 0.24 + Math.abs(i) * h * 0.012); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(gx - w * 0.08, gy - h * 0.1); ctx.lineTo(gx + w * 0.08, gy - h * 0.1); ctx.stroke();
    // 鎖
    for (const x of [w * 0.25, w * 0.75]) { ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = u * 0.4; ctx.beginPath(); ctx.moveTo(x, wy); ctx.quadraticCurveTo(x + u * 3, wb - h * 0.2, x + u * 8, wb - h * 0.08); ctx.stroke(); }
    // 砂の床
    const sg = ctx.createLinearGradient(0, wb - h * 0.04, 0, h); sg.addColorStop(0, "#b49a70"); sg.addColorStop(1, "#6a5638");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, wb + h * 0.1); ctx.quadraticCurveTo(P.cx, wb - h * 0.04, w, wb + h * 0.1); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    for (let i = 0; i < 400; i++) { ctx.fillStyle = rgba(R() < 0.5 ? "#d4ba90" : "#5a4630", 0.35); ctx.fillRect(R() * w, wb + R() * (h - wb), u * 0.3, u * 0.15); }
    for (let i = 0; i < 4; i++) { ctx.fillStyle = "rgba(90,20,10,.35)"; ctx.beginPath(); ctx.ellipse(R() * w, wb + h * 0.05 + R() * (h - wb - h * 0.05), u * (2 + R() * 4), u * (0.5 + R()), 0, 0, Math.PI * 2); ctx.fill(); }
    V.weaponRack(P, w * 0.12, wb + h * 0.06, u * 4); V.weaponRack(P, w * 0.88, wb + h * 0.06, u * 4);
    if (P.phase >= 2) for (const x of [w * 0.3, w * 0.7]) V.torch(P, x, wb - h * 0.12, u * 1.6);
    dim(P, 0.35);
  };

  // ---------------------------------------------------------------- 湯治場（湯気、木の湯船、湯の照り返し）
  IN.bath = (P) => {
    const { w, h, u, ctx } = P;
    const r = V.room(P, { wall: "#8a7458", floor: "#4a4a48", tex: "plank", floorTex: "stone", beams: "#4a3420", amp: 0.7 });
    V.roomWindow(P, r.x + r.w * 0.36, r.y + r.h * 0.1, r.w * 0.28, r.h * 0.4);
    // 湯船
    const by = r.b + (h - r.b) * 0.35;
    ctx.fillStyle = "#6a4a2a"; ctx.beginPath(); ctx.ellipse(P.cx, by, w * 0.36, (h - r.b) * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    const wg = ctx.createRadialGradient(P.cx, by, 0, P.cx, by, w * 0.32); wg.addColorStop(0, "#a8d8d8"); wg.addColorStop(1, "#4a7a8a");
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(P.cx, by, w * 0.32, (h - r.b) * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(P.cx, by, w * (0.05 + i * 0.045), (h - r.b) * (0.04 + i * 0.036), 0, 0, Math.PI * 2); ctx.stroke(); }
    // 湯気（毎コマ立ちのぼる）
    P.anim.push({ draw: (c, t) => { for (let i = 0; i < 8; i++) { const ph = (t * 0.1 + i / 8) % 1, x = P.cx + (i - 3.5) * w * 0.07 + Math.sin(t * 0.7 + i) * u * 2, y = by - ph * h * 0.6, rr = u * (4 + ph * 12); const g = c.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, `rgba(240,242,246,${0.3 * (1 - ph)})`); g.addColorStop(1, "rgba(240,242,246,0)"); c.fillStyle = g; c.fillRect(x - rr, y - rr, rr * 2, rr * 2); } } });
    for (let i = 0; i < 5; i++) V.fogBand(P, h * (0.25 + i * 0.12), h * 0.08, 0.15, "#e8ecf0");
    V.hangLamp(P, P.cx - w * 0.3, h * 0.2, u * 2); V.hangLamp(P, P.cx + w * 0.3, h * 0.2, u * 2);
    dim(P, 0.4);
  };

  // ---------------------------------------------------------------- 畑と狩り場（施設だが屋外。町の昼・朝の景色を使う）
  IN.field = (P) => V.OUT.w2_farm(P);
  IN.field.outdoor = true; IN.field.phase = 1;
  IN.hunt = (P) => V.OUT.w2_hunt(P);
  IN.hunt.outdoor = true; IN.hunt.phase = 0;

  // ---------------------------------------------------------------- 迷宮の中
  // 石の通路（汎用）
  IN.dungeon = (P) => { V.corridor(P, { stone: "#5a544c" }); V.dim(P, 0.4); };
  // 洞窟（汎用）
  IN.cave = (P) => {
    const { w, h, u } = P;
    V.cavern(P, { rock: "#5a4a3c" });
    V.torch(P, w * 0.2, h * 0.55, u * 2); V.torch(P, w * 0.82, h * 0.5, u * 1.8);
    V.dim(P, 0.4);
  };
  // 鬼ヶ島の洞窟：宴の赤い灯、転がる酒樽と大盃、骨
  IN.onigashima_in = (P) => {
    const { w, h, u, ctx, R } = P;
    V.cavern(P, { rock: "#5a3a30", glow: "#ff5a2a" });
    for (let i = 0; i < 5; i++) V.lantern && V.lantern(P, w * (0.15 + i * 0.17), h * (0.18 + (i % 2) * 0.06), u * 2.2, { always: true });
    V.barrel(P, w * 0.14, h * 0.96, u * 9); V.barrel(P, w * 0.24, h * 0.94, u * 7); V.barrel(P, w * 0.86, h * 0.96, u * 9);
    // 大盃
    ctx.fillStyle = "#a01e14"; ctx.beginPath(); ctx.ellipse(w * 0.66, h * 0.88, u * 8, u * 2, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#c8a040"; ctx.beginPath(); ctx.ellipse(w * 0.66, h * 0.88, u * 8, u * 1.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e8d8a0"; ctx.beginPath(); ctx.ellipse(w * 0.66, h * 0.88, u * 7, u * 1, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 12; i++) { ctx.strokeStyle = "#d8ccb4"; ctx.lineWidth = u * 0.6; ctx.lineCap = "round"; const x = R() * w, y = h * (0.8 + R() * 0.18), a = R() * 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * u * 2, y); ctx.lineTo(x + Math.cos(a) * u * 2, y + Math.sin(a) * u * 0.5); ctx.stroke(); }
    V.torch(P, w * 0.4, h * 0.6, u * 1.8, { col: "#ff6a2a" });
    V.dim(P, 0.4);
  };
  // エル・ナフ遺構：天井の崩れた大広間（上から光）。折れた柱、壁の碑文、顔を削られた像
  IN.ruins_in = (P) => {
    const { w, h, u, ctx, R } = P;
    const r = V.room(P, { wall: "#8a8270", floor: "#5a5448", tex: "stone", floorTex: "stone", backY: h * 0.1, backH: h * 0.55, amb: 0.65 });
    // 天井の穴から差す光
    if (P.phase !== 3) { ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,240,200,.3)"); g.addColorStop(1, "rgba(255,240,200,.02)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(P.cx - w * 0.1, 0); ctx.lineTo(P.cx + w * 0.05, 0); ctx.lineTo(P.cx + w * 0.2, h); ctx.lineTo(P.cx - w * 0.12, h); ctx.fill(); ctx.restore(); }
    else V.light(P, P.cx, h * 0.1, w * 0.3, "#9ab0d8", 0.6);
    // 碑文
    ctx.fillStyle = "rgba(40,34,28,.45)"; for (let i = 0; i < 40; i++) ctx.fillRect(r.x + r.w * 0.06 + (i % 10) * r.w * 0.09, r.y + r.h * 0.12 + Math.floor(i / 10) * r.h * 0.08, r.w * 0.06, r.h * 0.025);
    // 顔を削られた像
    const sx = P.cx, sb = r.b;
    ctx.fillStyle = "#a8a090"; ctx.fillRect(sx - r.w * 0.08, sb - r.h * 0.12, r.w * 0.16, r.h * 0.12);
    ctx.beginPath(); ctx.moveTo(sx - r.w * 0.07, sb - r.h * 0.12); ctx.lineTo(sx - r.w * 0.05, sb - r.h * 0.6); ctx.lineTo(sx + r.w * 0.05, sb - r.h * 0.6); ctx.lineTo(sx + r.w * 0.07, sb - r.h * 0.12); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sb - r.h * 0.68, r.w * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6a6458"; ctx.beginPath(); ctx.ellipse(sx, sb - r.h * 0.68, r.w * 0.035, r.w * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    // 柱（折れたものも）
    for (let i = 0; i < 4; i++) { const t = Math.pow(i / 4, 0.8); for (const s of [-1, 1]) { const x = lerp(s < 0 ? w * 0.08 : w * 0.92, s < 0 ? r.x + r.w * 0.08 : r.x + r.w * 0.92, t), bot = lerp(h, r.b, t), top = (i + (s > 0 ? 1 : 0)) % 3 === 0 ? lerp(h * 0.5, r.b - r.h * 0.4, t) : lerp(0, r.y, t), cw = lerp(w * 0.06, r.w * 0.05, t); const g = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0); g.addColorStop(0, "#4a443a"); g.addColorStop(0.4, "#c8c0ac"); g.addColorStop(1, "#3a342c"); ctx.fillStyle = g; ctx.fillRect(x - cw / 2, top, cw, bot - top); } }
    for (let i = 0; i < 10; i++) { const x = R() * w, y = r.b + R() * (h - r.b), s = u * (1 + (y - r.b) / (h - r.b) * 4); ctx.fillStyle = "#7a7262"; ctx.beginPath(); ctx.ellipse(x, y, s * 1.4, s * 0.7, R(), 0, Math.PI * 2); ctx.fill(); }
    V.torch(P, r.x + r.w * 0.2, r.y + r.h * 0.5, u * 1.4);
    V.dim(P, 0.45);
  };
  // 光の地下墓所：頭蓋骨を積んだ壁、蝋燭、奥の赤い灯り
  IN.w1_catacomb_in = (P) => {
    const { w, h, u, ctx, R } = P;
    const c = V.corridor(P, { stone: "#6a6458", endGlow: "#c83a2a", torches: false, arches: true });
    // 頭蓋骨の壁（左右の手前の面）
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      const a = c.box(k), b = c.box(k + 1);
      for (let i = 0; i < 40; i++) { const tx = R(), ty = R(); const ax = s < 0 ? a.x0 : a.x1, bx = s < 0 ? b.x0 : b.x1; const x = lerp(ax, bx, tx), y = lerp(lerp(a.y0, a.y1, ty), lerp(b.y0, b.y1, ty), tx), sz = (a.y1 - a.y0) * 0.025 * (1 - tx * 0.3); ctx.fillStyle = mix("#d8ccb0", "#000", 0.2 + k * 0.2); ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#1a1410"; ctx.fillRect(x - sz * 0.5, y - sz * 0.1, sz * 0.35, sz * 0.35); ctx.fillRect(x + sz * 0.15, y - sz * 0.1, sz * 0.35, sz * 0.35); }
    }
    for (let i = 0; i < 6; i++) V.candle(P, w * (0.1 + i * 0.16), h * (0.92 + (i % 2) * 0.04), u * (1.2 + (i % 3) * 0.4));
    V.dim(P, 0.35);
  };
  // 酸の谷の底：緑の雫の洞、酸の溜まり、膝をついた鉄の巨人
  IN.w2_acid_in = (P) => {
    const { w, h, u, ctx } = P;
    V.cavern(P, { rock: "#3a4a34", glow: "#7ad83a" });
    const px = P.cx, py = h * 0.86;
    const g = ctx.createRadialGradient(px, py, 0, px, py, w * 0.3); g.addColorStop(0, "rgba(190,255,100,.85)"); g.addColorStop(1, "rgba(70,150,30,.5)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, w * 0.3, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    V.light(P, px, py, w * 0.4, "#9aff4a", 1, true);
    // 巨人（胸の蓋が半分開いている）
    const gx = w * 0.78, gb = h * 0.8, s = h * 0.55;
    ctx.fillStyle = "#3a3a40"; ctx.beginPath(); ctx.moveTo(gx - s * 0.3, gb); ctx.lineTo(gx - s * 0.28, gb - s * 0.6); ctx.lineTo(gx + s * 0.28, gb - s * 0.6); ctx.lineTo(gx + s * 0.3, gb); ctx.fill();
    ctx.beginPath(); ctx.arc(gx, gb - s * 0.72, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6a4a30"; ctx.fillRect(gx - s * 0.12, gb - s * 0.5, s * 0.24, s * 0.2);
    ctx.fillStyle = "#1a1a1a"; ctx.save(); ctx.translate(gx + s * 0.12, gb - s * 0.5); ctx.rotate(0.6); ctx.fillRect(0, 0, s * 0.03, s * 0.2); ctx.restore();
    ctx.fillStyle = "#9aff4a"; ctx.fillRect(gx - s * 0.08, gb - s * 0.76, s * 0.16, s * 0.03);
    // 雫（毎コマ落ちる）
    const drops = Array.from({ length: 10 }, (_, i) => [w * (0.1 + i * 0.09), (i * 0.37) % 1]);
    P.anim.push({ draw: (c, t) => { for (const [x, ph] of drops) { const k = (t * 0.5 + ph) % 1; c.fillStyle = `rgba(170,255,90,${0.9 - k * 0.5})`; c.beginPath(); c.ellipse(x, h * 0.1 + k * h * 0.75, 1.6, 3, 0, 0, Math.PI * 2); c.fill(); } } });
    V.dim(P, 0.35);
  };
  // 腐れ庭園の奥：蔓の天井の下の花壇、甘い霧、花壇の間の白い天幕
  IN.e2_garden_in = (P) => {
    const { w, h, u, ctx, R } = P;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#1a2a14"); g.addColorStop(0.5, "#4a6a3a"); g.addColorStop(1, "#2a3a1a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 蔓の天井
    for (let i = 0; i < 60; i++) { ctx.strokeStyle = rgba(R() < 0.5 ? "#2a4a1a" : "#3a5a24", 0.8); ctx.lineWidth = u * (0.3 + R() * 0.6); const x = R() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + (R() - 0.5) * u * 10, h * 0.15, x + (R() - 0.5) * u * 6, h * (0.1 + R() * 0.3)); ctx.stroke(); }
    for (let i = 0; i < 30; i++) { ctx.fillStyle = rgba(["#ff4a8a", "#ffd23a", "#c04aff"][i % 3], 0.8); ctx.beginPath(); ctx.arc(R() * w, R() * h * 0.3, u * 0.6, 0, Math.PI * 2); ctx.fill(); }
    // 花壇（奥へ）
    const bright = ["#ff4a8a", "#ffd23a", "#ff7a2a", "#c04aff", "#4ad8ff", "#ff3a3a"];
    for (let r = 0; r < 6; r++) { const t = r / 5, y = h * (0.55 + Math.pow(t, 1.3) * 0.42), s = 0.4 + t * 1.4; for (let i = -5; i <= 5; i++) { const x = P.cx + i * u * 9 * s + (r % 2) * u * 4.5 * s; ctx.fillStyle = mix("#4a3020", "#2a3a1a", 1 - t); ctx.beginPath(); ctx.ellipse(x, y, u * 3.6 * s, u * 0.9 * s, 0, Math.PI, 0); ctx.fill(); for (let k = 0; k < 8; k++) { ctx.fillStyle = bright[(i + k + r + 12) % bright.length]; ctx.beginPath(); ctx.arc(x + (R() - 0.5) * u * 6 * s, y - u * 0.6 * s - R() * u * s, u * 0.35 * s, 0, Math.PI * 2); ctx.fill(); } } }
    // 白い天幕
    for (const [x, s] of [[w * 0.25, u * 10], [w * 0.72, u * 13]]) { const y = h * 0.62; ctx.fillStyle = "#e8e4dc"; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y - s * 0.9); ctx.lineTo(x + s, y); ctx.fill(); ctx.fillStyle = "#b8b4ac"; ctx.beginPath(); ctx.moveTo(x, y - s * 0.9); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.2, y); ctx.fill(); ctx.fillStyle = "#2a2018"; ctx.beginPath(); ctx.moveTo(x - s * 0.2, y); ctx.lineTo(x, y - s * 0.5); ctx.lineTo(x + s * 0.2, y); ctx.fill(); }
    for (let i = 0; i < 4; i++) V.fogBand(P, h * (0.4 + i * 0.12), h * 0.07, 0.22, "#f0c8e0");
    V.dim(P, 0.4);
  };
  // 大厨房の中：家ほどの大鍋と火、天井から下がる鉤と肉、卓の端の巨大な包丁、小さな人間用の扉
  IN.e2_kitchen_in = (P) => {
    const { w, h, u, ctx } = P;
    const r = V.room(P, { wall: "#5a4038", floor: "#3a2a24", tex: "brick", floorTex: "stone", backY: h * 0.05, backH: h * 0.6, beams: "#2a1a14" });
    // 大鍋と火
    const px = P.cx - r.w * 0.05, pb = r.b + (h - r.b) * 0.1, pw = r.w * 0.5;
    ctx.fillStyle = "#1a0804"; ctx.fillRect(px - pw * 0.55, pb - r.h * 0.12, pw * 1.1, r.h * 0.12);
    V.light(P, px, pb - r.h * 0.06, w * 0.5, "#ff6a1a", 1.4, true);
    for (let i = 0; i < 5; i++) P.anim.push({ type: "flame", x: px - pw * 0.4 + i * pw * 0.2, y: pb, s: r.h * 0.08, col: "#ff7a2a" });
    const g = ctx.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0); g.addColorStop(0, "#1a1a1e"); g.addColorStop(0.35, "#5a5a62"); g.addColorStop(1, "#141418");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px - pw / 2, pb - r.h * 0.6); ctx.lineTo(px + pw / 2, pb - r.h * 0.6); ctx.quadraticCurveTo(px + pw * 0.55, pb - r.h * 0.1, px + pw * 0.3, pb - r.h * 0.12); ctx.lineTo(px - pw * 0.3, pb - r.h * 0.12); ctx.quadraticCurveTo(px - pw * 0.55, pb - r.h * 0.1, px - pw / 2, pb - r.h * 0.6); ctx.fill();
    ctx.fillStyle = "#8a4a1a"; ctx.beginPath(); ctx.ellipse(px, pb - r.h * 0.6, pw / 2, r.h * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    P.anim.push({ draw: (c, t) => { for (let i = 0; i < 6; i++) { const ph = (t * 0.12 + i / 6) % 1, x = px + (i - 2.5) * pw * 0.15, y = pb - r.h * 0.6 - ph * h * 0.4, rr = u * (4 + ph * 10); const gg = c.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, `rgba(230,220,210,${0.3 * (1 - ph)})`); gg.addColorStop(1, "rgba(230,220,210,0)"); c.fillStyle = gg; c.fillRect(x - rr, y - rr, rr * 2, rr * 2); } } });
    // 天井の鉤と肉
    for (let i = 0; i < 6; i++) { const x = w * (0.1 + i * 0.16), y = h * (0.15 + (i % 2) * 0.06); ctx.strokeStyle = "#2a2a2e"; ctx.lineWidth = u * 0.3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.arc(x - u, y, u, 0, Math.PI); ctx.stroke(); ctx.fillStyle = "#8a3a2a"; ctx.beginPath(); ctx.ellipse(x - u * 2, y + u * 5, u * 2.5, u * 5, 0.1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e8d0c0"; ctx.fillRect(x - u * 2.5, y + u * 9, u, u * 2); }
    // 巨大な包丁（卓の端）
    ctx.fillStyle = "#c8ccd4"; ctx.beginPath(); ctx.moveTo(w * 0.88, h * 0.5); ctx.lineTo(w, h * 0.42); ctx.lineTo(w, h * 0.62); ctx.lineTo(w * 0.88, h * 0.6); ctx.fill();
    ctx.fillStyle = "#4a3020"; ctx.fillRect(w * 0.8, h * 0.52, w * 0.08, h * 0.06);
    // 小さな人間用の扉
    ctx.fillStyle = "#ffb060"; ctx.fillRect(r.x + r.w * 0.85, r.b - r.h * 0.06, r.w * 0.025, r.h * 0.06);
    V.light(P, r.x + r.w * 0.86, r.b - r.h * 0.03, u * 3, "#ffb060", 0.8);
    V.dim(P, 0.4);
  };
})(globalThis.G = globalThis.G || {});
