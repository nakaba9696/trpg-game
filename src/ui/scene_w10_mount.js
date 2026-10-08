// 背景の絵（W10 の山）：眠り山ロウネ・鉄冠岳ドラウゼの麓と、登っている間の段の絵（山道・山小屋・尾根・山頂）。
// 麓は場所の絵（L.scene。古い描き方 scene.js の OUT にも同じ名前がある）。段の絵は場所の絵の名前を、登っている段で差し替える（G.paintScene を包む）：
//   1 峠 → w10_trail　2 山小屋 → w10_hut　3 尾根 → w10_ridge　4 山頂 → w10_peak_roune / w10_peak_drause
//   山ごとの色（草の山か、赤錆の雪山か）は、描くときの場所（P.seed の頭は場所の id）で変える
// 空の天候は、山の高さを足した空（G.w10.sky。尾根から上は雨が雪に）で描く。乱数は P.R（G.rand は使わない）。DOM は canvas だけ。レーン A（W10）
(function (G) {
  const V = G.SV2;
  if (!V || !V.OUT) return;
  const OUT = V.OUT;
  const TAU = Math.PI * 2;
  const isDrause = (P) => String(P.seed || "").indexOf("w10_drause") === 0;
  const pal = (P) => isDrause(P)
    ? { far: "#7a6a70", slope: "#7a4a3a", rock: "#4a2e26", ground: "#8a6a5a", tex: "snow", snow: 0.55, grass: "#6a5a4a", frame: "#2a1e1a" }
    : { far: "#6a7a8a", slope: "#5f7a46", rock: "#3a3432", ground: "#5a7040", tex: "grass", snow: 0, grass: "#5f7a46", frame: "#2c3a22" };
  const rgba = V.rgba;

  // 白い点の山羊（遠くの斜面）
  function goats(P, n, y0, y1) {
    const { ctx, w, R } = P;
    for (let i = 0; i < n; i++) {
      const x = w * (0.08 + R() * 0.84), y = y0 + R() * (y1 - y0), s = P.u * (0.5 + P.depth(y) * 0.9);
      ctx.fillStyle = P.lit("#f0ece0", 0.2, 0.3);
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.55, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.9, y - s * 0.35, s * 0.35, 0, TAU); ctx.fill();
      ctx.fillStyle = P.c("#3a3430"); ctx.fillRect(x - s * 0.6, y + s * 0.3, s * 0.18, s * 0.6); ctx.fillRect(x + s * 0.4, y + s * 0.3, s * 0.18, s * 0.6);
    }
  }
  // 道標の石積み
  function cairn(P, x, base, s) {
    const { ctx } = P;
    for (let i = 0; i < 5; i++) {
      const r = s * (1 - i * 0.16);
      ctx.fillStyle = i % 2 ? P.lit("#8a8478", 0.1, 0.3) : P.c("#6a6460");
      ctx.beginPath(); ctx.ellipse(x + (i % 2 ? r * 0.08 : -r * 0.06), base - s * 0.55 * i - r * 0.4, r, r * 0.45, 0, 0, TAU); ctx.fill();
    }
  }
  // つづら折りの踏み跡
  function switchback(P, x0, y0, x1, y1, n) {
    const { ctx } = P;
    ctx.strokeStyle = rgba(P.lit("#d8c8a8", 0.2, 0.3), 0.75); ctx.lineWidth = Math.max(1, P.u * 0.5); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 1; i <= n; i++) {
      const t = i / n, y = y0 + (y1 - y0) * t, x = (i % 2 ? x1 : x0) + (x1 - x0) * 0.1 * t;
      ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.lineCap = "butt";
  }
  // 雲海（足もとに広がる雲）
  function cloudSea(P, y, n) {
    const { w, R } = P;
    const col = P.night ? { lit: "#3a4460", shade: "#141a2c" } : P.dusk ? { lit: "#ffc8a0", shade: "#8a6a7a" } : P.dawn ? { lit: "#ffe0c8", shade: "#9a8a9a" } : { lit: "#ffffff", shade: "#a8b4c8" };
    for (let i = 0; i < n; i++) V.cloud(P, R() * w, y + P.u * (R() * 4 - 1), P.u * (18 + R() * 22), P.u * 5, { lit: col.lit, shade: col.shade, a: 0.85 });
  }
  // 冠の歯（尖った黒い岩）
  function tooth(P, x, base, tw, th, lean) {
    const { ctx } = P;
    const g = ctx.createLinearGradient(x - tw, 0, x + tw, 0);
    g.addColorStop(0, P.dark("#3a2620", 0, 0.5)); g.addColorStop(0.55, P.lit("#5a3a2e", 0, 0.35)); g.addColorStop(1, P.dark("#2a1a16", 0, 0.6));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - tw, base); ctx.lineTo(x - tw * 0.5 + lean, base - th * 0.6); ctx.lineTo(x + lean * 1.6, base - th); ctx.lineTo(x + tw * 0.55 + lean, base - th * 0.5); ctx.lineTo(x + tw, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(P.lit("#f2f5fa", 0, 0.3), 0.7);
    ctx.beginPath(); ctx.moveTo(x - tw * 0.5 + lean, base - th * 0.6); ctx.lineTo(x + lean * 1.6, base - th); ctx.lineTo(x - tw * 0.2 + lean, base - th * 0.62); ctx.closePath(); ctx.fill();
  }

  // ---------------------------------------------------------------- 麓：眠り山ロウネ（なだらかな草の山、頂の雲の帽子、山羊、羊飼いの小屋の煙）
  OUT.w10_roune = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    V.mountains(P, { base: hz - u * 2, height: u * 10, d: 0.75, color: "#6a7a8a", scale: 3, round: true });
    // 古い火山の円い裾と平らな頂
    const top = hz - u * 30, cx = w * 0.5;
    const g = ctx.createLinearGradient(0, top, 0, hz + u * 4);
    g.addColorStop(0, P.lit("#5a6a44", 0.35, 0.2)); g.addColorStop(1, P.c("#5f7a46", 0.1));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-u * 4, hz + u * 4); ctx.bezierCurveTo(w * 0.22, hz - u * 2, cx - u * 22, top + u * 4, cx - u * 10, top);
    ctx.lineTo(cx + u * 10, top); ctx.bezierCurveTo(cx + u * 22, top + u * 4, w * 0.78, hz - u * 2, w + u * 4, hz + u * 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.c("#2a2624", 0.3); ctx.fillRect(cx - u * 10, top, u * 20, u * 1.2); // 頂の黒い砂
    // 雲の帽子
    if (P.weather !== "fog") V.cloud(P, cx, top - u * 1.5, u * 30, u * 5, { lit: P.night ? "#3a4460" : "#ffffff", shade: P.night ? "#141a2c" : "#a8b4c8", a: 0.8 });
    switchback(P, cx - u * 4, hz + u * 2, cx + u * 6, top + u * 4, 9);
    V.ground(P, { top: hz + u * 3, color: "#5a7040", tex: "grass" });
    goats(P, 10, hz - u * 6, hz + u * 10);
    // 羊飼いの小屋と煙
    const hx = w * 0.72, hb = hz + u * 9;
    ctx.fillStyle = P.lit("#8a8274", 0.1, 0.25); ctx.fillRect(hx - u * 4, hb - u * 3.5, u * 8, u * 3.5);
    ctx.fillStyle = P.c("#4a3a2a"); ctx.beginPath(); ctx.moveTo(hx - u * 4.6, hb - u * 3.5); ctx.lineTo(hx, hb - u * 6); ctx.lineTo(hx + u * 4.6, hb - u * 3.5); ctx.fill();
    if (V.smoke) V.smoke(P, hx + u * 2, hb - u * 6, u * 2, 0.1);
    if (P.night || P.dusk) V.light(P, hx - u * 1.5, hb - u * 1.8, u * 4, "#ffb050", 0.8, true);
    cairn(P, w * 0.2, h - u * 6, u * 2.2);
    V.frame(P, { color: "#2c3a22" });
  };

  // ---------------------------------------------------------------- 麓：鉄冠岳ドラウゼ（赤錆色の山、頂の冠の歯、雪、坑夫の村跡、凍ったレール）
  OUT.w10_drause = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    V.mountains(P, { base: hz - u * 3, height: u * 14, d: 0.7, color: "#7a7a8a", snow: 0.5, scale: 3 });
    const top = hz - u * 34, cx = w * 0.52;
    const g = ctx.createLinearGradient(0, top, 0, hz + u * 4);
    g.addColorStop(0, P.lit("#6a3a2a", 0.3, 0.2)); g.addColorStop(1, P.c("#7a4a3a", 0.15));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-u * 4, hz + u * 4); ctx.lineTo(cx - u * 30, hz - u * 12); ctx.lineTo(cx - u * 9, top + u * 2); ctx.lineTo(cx + u * 9, top + u * 2); ctx.lineTo(cx + u * 34, hz - u * 10); ctx.lineTo(w + u * 4, hz + u * 4); ctx.closePath(); ctx.fill();
    // 雪の筋
    ctx.fillStyle = rgba(P.lit("#f2f5fa", 0.2, 0.3), 0.8);
    for (let i = 0; i < 9; i++) { const x = cx + (R() - 0.5) * u * 40, y = top + u * (6 + R() * 18); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + u * (1 + R() * 2), y + u * (4 + R() * 6)); ctx.lineTo(x - u * 0.5, y + u * (3 + R() * 4)); ctx.fill(); }
    for (let i = 0; i < 7; i++) tooth(P, cx - u * 9 + i * u * 3, top + u * 2.5, u * 1.6, u * (5 + (i % 3) * 2.5 + R() * 2), (R() - 0.5) * u);
    // 坑口
    for (const [x, y] of [[0.3, 0.86], [0.66, 0.9], [0.44, 0.78]]) { ctx.fillStyle = "#120c0a"; ctx.beginPath(); ctx.arc(w * x, hz - u * 12 * y + u * 4, u * 1.2, Math.PI, 0); ctx.fill(); }
    V.ground(P, { top: hz + u * 3, color: "#8a7a70", tex: "snow" });
    // 凍ったレール
    ctx.strokeStyle = P.c("#3a3030"); ctx.lineWidth = Math.max(1, u * 0.3);
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w * 0.5 + k * u * 3, h); ctx.lineTo(w * 0.5 + k * u * 0.6, hz + u * 4); ctx.stroke(); }
    // 屋根の落ちた家
    for (let i = 0; i < 4; i++) {
      const x = w * (0.12 + i * 0.07 + (i > 1 ? 0.5 : 0)), b = hz + u * (8 + (i % 2) * 3);
      ctx.fillStyle = P.c("#5a5048"); ctx.fillRect(x, b - u * 3, u * 5, u * 3);
      ctx.fillStyle = P.c("#2a2420"); ctx.beginPath(); ctx.moveTo(x - u * 0.4, b - u * 3); ctx.lineTo(x + u * 1.5, b - u * 4.6); ctx.lineTo(x + u * 2.6, b - u * 3.4); ctx.fill();
      ctx.fillStyle = rgba(P.lit("#f2f5fa", 0, 0.3), 0.85); ctx.fillRect(x - u * 0.2, b - u * 3.2, u * 5.4, u * 0.4);
    }
    if (P.night || P.dusk) V.light(P, w * 0.12 + u * 2.5, hz + u * 6.5, u * 3, "#ffb050", 0.7, true);
    V.frame(P, { color: "#2a1e1a" });
  };

  // ---------------------------------------------------------------- 段 1：峠への山道（斜面のつづら折り、石積み、遠くの麓）
  OUT.w10_trail = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    const c = pal(P);
    V.mountains(P, { base: hz - u * 6, height: u * 22, d: 0.65, color: c.far, snow: c.snow ? 0.6 : 0, scale: 3 });
    // 手前の大きな斜面（右上がり）
    const g = ctx.createLinearGradient(0, hz - u * 20, 0, h);
    g.addColorStop(0, P.lit(c.slope, 0.2, 0.2)); g.addColorStop(1, P.dark(c.slope, 0, 0.35));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, hz + u * 6); ctx.quadraticCurveTo(w * 0.5, hz - u * 4, w, hz - u * 22); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    if (c.snow) { ctx.save(); ctx.clip(); ctx.fillStyle = rgba(P.lit("#f2f5fa", 0.1, 0.3), 0.35); for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.ellipse(R() * w, hz - u * 10 + R() * u * 40, u * (4 + R() * 8), u * (0.4 + R() * 0.5), -0.35, 0, TAU); ctx.fill(); } ctx.restore(); }
    switchback(P, w * 0.3, h - u * 2, w * 0.85, hz - u * 14, 7);
    for (let i = 0; i < 10; i++) { const x = R() * w, y = hz + u * 4 + R() * (h - hz - u * 4), k = 0.5 + P.depth(y), rw = u * (0.8 + R() * 2) * k, rh = u * (0.6 + R() * 0.8) * k; ctx.fillStyle = P.c(c.rock, 0.1); ctx.beginPath(); ctx.moveTo(x - rw, y); ctx.lineTo(x - rw * 0.6, y - rh); ctx.lineTo(x + rw * 0.4, y - rh * 1.2); ctx.lineTo(x + rw, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = P.lit(c.rock, 0.1, 0.4); ctx.beginPath(); ctx.moveTo(x - rw * 0.6, y - rh); ctx.lineTo(x + rw * 0.4, y - rh * 1.2); ctx.lineTo(x + rw * 0.1, y - rh * 0.6); ctx.closePath(); ctx.fill(); }
    cairn(P, w * 0.78, hz - u * 8, u * 1.8);
    cairn(P, w * 0.16, h - u * 4, u * 2.6);
    V.frame(P, { color: c.frame });
  };

  // ---------------------------------------------------------------- 段 2：山小屋（斜面にしがみつく石積みの小屋、煙、角の飾り）
  OUT.w10_hut = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    const c = pal(P);
    V.mountains(P, { base: hz - u * 4, height: u * 26, d: 0.6, color: c.far, snow: c.snow ? 0.7 : 0.25, scale: 2.5 });
    V.ground(P, { top: hz, color: c.ground, tex: c.tex });
    // 小屋
    const x = w * 0.5, b = hz + u * 14, bw = u * 22, bh = u * 9;
    for (let i = 0; i < 26; i++) { const sx = x - bw / 2 + (i % 9) * (bw / 9), sy = b - bh + Math.floor(i / 9) * (bh / 3); ctx.fillStyle = (i * 7) % 3 ? P.c("#7a7468") : P.lit("#8a8478", 0.05, 0.25); ctx.fillRect(sx + 1, sy + 1, bw / 9 - 2, bh / 3 - 2); }
    ctx.fillStyle = P.c(c.snow ? "#e8ecf2" : "#4a3e30");
    ctx.beginPath(); ctx.moveTo(x - bw / 2 - u * 2, b - bh); ctx.lineTo(x, b - bh - u * 7); ctx.lineTo(x + bw / 2 + u * 2, b - bh); ctx.fill();
    ctx.fillStyle = "#1a1410"; ctx.fillRect(x - u * 2, b - u * 6, u * 4, u * 6); // 戸口
    ctx.strokeStyle = P.lit("#e8e0cc", 0, 0.3); ctx.lineWidth = Math.max(1, u * 0.35);
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, b - u * 7); ctx.quadraticCurveTo(x + k * u * 2.4, b - u * 9, x + k * u * 1.2, b - u * 10); ctx.stroke(); } // 山羊の角
    ctx.fillStyle = P.c("#5a5450"); ctx.fillRect(x + u * 6, b - bh - u * 6, u * 2, u * 4); // 煙突
    if (V.smoke) V.smoke(P, x + u * 7, b - bh - u * 6, u * 2.5, 0.05);
    const lit = P.night || P.dusk || P.overcast;
    ctx.fillStyle = lit ? "#ffb050" : P.c("#2a2622"); ctx.fillRect(x + u * 3.5, b - u * 6, u * 2.5, u * 2);
    if (lit) V.light(P, x + u * 4.7, b - u * 5, u * 6, "#ffb050", 0.9, true);
    // 積んだ薪
    for (let i = 0; i < 8; i++) { ctx.fillStyle = P.c(i % 2 ? "#6a4a2a" : "#7a5a36"); ctx.beginPath(); ctx.arc(x - bw / 2 + u * (1.5 + (i % 4) * 1.6), b - u * (0.8 + Math.floor(i / 4) * 1.5), u * 0.8, 0, TAU); ctx.fill(); }
    V.frame(P, { color: c.frame });
  };

  // ---------------------------------------------------------------- 段 3：尾根（馬の背の細い道、両側は雲海へ落ちる）
  OUT.w10_ridge = (P) => {
    const { ctx, u, w, h, hz } = P;
    const c = pal(P);
    V.mountains(P, { base: hz - u * 2, height: u * 20, d: 0.7, color: c.far, snow: c.snow ? 0.7 : 0.35, scale: 3 });
    cloudSea(P, hz, 16);
    // 尾根（手前から奥へ細くなる帯）
    const g = ctx.createLinearGradient(0, hz - u * 6, 0, h);
    g.addColorStop(0, P.lit(c.slope, 0.3, 0.25)); g.addColorStop(1, P.dark(c.rock, 0, 0.3));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(w * 0.05, h); ctx.quadraticCurveTo(w * 0.35, hz + u * 10, w * 0.56, hz - u * 6); ctx.lineTo(w * 0.6, hz - u * 6.5); ctx.quadraticCurveTo(w * 0.62, hz + u * 10, w * 0.95, h); ctx.closePath(); ctx.fill();
    // 尾根の上の踏み跡
    ctx.strokeStyle = rgba(P.lit(c.snow ? "#f2f5fa" : "#d8c8a8", 0.2, 0.3), 0.8); ctx.lineWidth = Math.max(1, u * 0.45);
    ctx.beginPath(); ctx.moveTo(w * 0.5, h); ctx.quadraticCurveTo(w * 0.52, hz + u * 8, w * 0.58, hz - u * 6); ctx.stroke();
    // 尾根の両側を這い上がる薄い霧（毎コマ少しずつ流れる）
    P.anim.push({ draw: (cx, t) => { for (let i = 0; i < 3; i++) { const x = (((t * 0.015 + i / 3) % 1) * 1.6 - 0.3) * w, y = hz + u * (3 + i * 3); const g2 = cx.createRadialGradient(x, y, 0, x, y, u * 14); g2.addColorStop(0, `rgba(240,244,250,${P.night ? 0.08 : 0.16})`); g2.addColorStop(1, "rgba(240,244,250,0)"); cx.fillStyle = g2; cx.fillRect(x - u * 14, y - u * 14, u * 28, u * 28); } } });
    V.frame(P, { color: c.frame });
  };

  // ---------------------------------------------------------------- 段 4：山頂（ロウネ：火口湖の縁。湖に空と雲が映り、南に火山の煙）
  OUT.w10_peak_roune = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    cloudSea(P, hz + u * 2, 12);
    // 遠くの火山と細い煙
    ctx.fillStyle = P.c("#5a5068", 0.6); ctx.beginPath(); ctx.moveTo(w * 0.72, hz); ctx.lineTo(w * 0.8, hz - u * 9); ctx.lineTo(w * 0.83, hz - u * 9); ctx.lineTo(w * 0.92, hz); ctx.fill();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = rgba(P.night ? "#3a3438" : "#8a8480", 0.35 - i * 0.05); ctx.beginPath(); ctx.ellipse(w * 0.815 + i * u * 0.6, hz - u * (11 + i * 3), u * (1 + i * 0.6), u * (1.4 + i * 0.4), 0, 0, TAU); ctx.fill(); }
    if (P.night || P.dusk) V.light(P, w * 0.815, hz - u * 9, u * 3, "#ff6a3a", 0.8, true);
    // 火口（すり鉢）と湖
    const lx = w * 0.5, ly = hz + u * 12, rx = w * 0.44, ry = u * 11;
    ctx.fillStyle = P.c("#3a3230", 0.2); ctx.beginPath(); ctx.ellipse(lx, ly - u, rx * 1.1, ry * 1.25, 0, 0, TAU); ctx.fill();
    const wg = ctx.createLinearGradient(0, ly - ry, 0, ly + ry);
    wg.addColorStop(0, P.lit(P.night ? "#1a2a40" : "#4a86b8", 0.1, 0.2)); wg.addColorStop(1, P.c(P.night ? "#0a1018" : "#1a4a7a"));
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(lx, ly + u * 2, rx, ry, 0, 0, TAU); ctx.fill();
    // 映る雲
    ctx.save(); ctx.beginPath(); ctx.ellipse(lx, ly + u * 2, rx, ry, 0, 0, TAU); ctx.clip();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = rgba(P.night ? "#9ab0d8" : "#ffffff", P.night ? 0.06 : 0.14); ctx.beginPath(); ctx.ellipse(lx + (R() - 0.5) * rx * 1.4, ly + u * 2 + (R() - 0.5) * ry, u * (6 + R() * 8), u * 0.5, 0, 0, TAU); ctx.fill(); }
    if (P.night) for (let i = 0; i < 30; i++) { ctx.fillStyle = "rgba(230,236,255,.7)"; ctx.fillRect(lx + (R() - 0.5) * rx * 1.8, ly + u * 2 + (R() - 0.5) * ry * 1.6, 1, 1); }
    ctx.restore();
    // 湯気（ゆっくり立つ）
    P.anim.push({ draw: (cx, t) => { for (let i = 0; i < 5; i++) { const k = (t * 0.05 + i / 5) % 1; cx.fillStyle = `rgba(240,240,240,${0.18 * (1 - k)})`; cx.beginPath(); cx.ellipse(lx + (i - 2) * u * 6, ly - k * u * 8, u * (2 + k * 4), u * (0.8 + k), 0, 0, TAU); cx.fill(); } } });
    // 手前の縁（黒い砂）と、岩の上の山羊
    ctx.fillStyle = P.c("#3a3432"); ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h - u * 10); ctx.quadraticCurveTo(w * 0.5, h - u * 3, w, h - u * 12); ctx.lineTo(w, h); ctx.fill();
    ctx.fillStyle = P.c("#2a2624"); ctx.beginPath(); ctx.moveTo(w * 0.78, h - u * 11); ctx.lineTo(w * 0.84, h - u * 17); ctx.lineTo(w * 0.92, h - u * 15); ctx.lineTo(w * 0.96, h - u * 11); ctx.fill();
    goats(P, 1, h - u * 18.5, h - u * 18.5);
    V.frame(P, { color: "#1a1816" });
  };

  // ---------------------------------------------------------------- 段 4：山頂（ドラウゼ：冠の歯のあいだから。北の凍った海、東の白い壁）
  OUT.w10_peak_drause = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    // 東の白い壁（断界山脈）。空の端から端まで。奥ほど高く、雪をかぶる
    V.mountains(P, { base: hz - u * 2, height: u * 34, d: 0.55, color: "#9aa4b8", snow: 0.85, scale: 5 });
    // 北の凍った海（左の低いところ）
    ctx.fillStyle = rgba(P.lit("#dce6f0", 0.5, 0.3), 0.7); ctx.fillRect(0, hz - u * 1.5, w * 0.4, u * 2.5);
    cloudSea(P, hz + u * 3, 10);
    // 冠の内側の雪の床
    ctx.fillStyle = P.lit("#e8eef4", 0.1, 0.25); ctx.beginPath(); ctx.ellipse(w * 0.5, h, w * 0.6, u * 16, 0, Math.PI, 0); ctx.fill();
    // 両側の大きな歯（手前）と奥の歯
    for (let i = 0; i < 5; i++) tooth(P, w * (0.2 + i * 0.15), hz + u * 8, u * 2, u * (8 + R() * 6), (R() - 0.5) * u);
    tooth(P, w * 0.06, h, u * 10, h * 0.9, u * 2);
    tooth(P, w * 0.95, h, u * 12, h * 0.85, -u * 2);
    // 歯の隙間を抜ける風（雪煙）
    P.anim.push({ draw: (cx, t) => { for (let i = 0; i < 8; i++) { const k = (t * 0.12 + i / 8) % 1; cx.fillStyle = `rgba(244,247,251,${0.35 * (1 - k)})`; cx.beginPath(); cx.ellipse(w * (0.15 + k * 0.7), hz + u * (4 + (i % 3) * 3), u * (3 + k * 5), u * 0.6, 0, 0, TAU); cx.fill(); } } });
    if (P.night) {
      // 北の空の緑の光の帯
      const ag = ctx.createLinearGradient(0, hz - u * 50, 0, hz - u * 20);
      ag.addColorStop(0, "rgba(120,255,180,0)"); ag.addColorStop(0.5, "rgba(120,255,180,.22)"); ag.addColorStop(1, "rgba(120,255,180,0)");
      ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(0, hz - u * 40); ctx.quadraticCurveTo(w * 0.3, hz - u * 52, w * 0.6, hz - u * 38); ctx.lineTo(w * 0.6, hz - u * 26); ctx.quadraticCurveTo(w * 0.3, hz - u * 36, 0, hz - u * 26); ctx.fill();
    }
  };
  OUT.w10_peak_drause.storm = true;

  // ---------------------------------------------------------------- 登っている段で絵を差し替える
  const STAGE_KEY = [null, "w10_trail", "w10_hut", "w10_ridge", null];
  const SKY_ART = { 晴: "晴", 雨: "雨", 霧: "霧", 雪: "雪" };
  const paint0 = G.paintScene;
  G.paintScene = (canvas, opt) => {
    const S = G.S, W = G.w10;
    opt = opt || {};
    const L = S && G.loc && G.loc();
    if (W && L && L.w10 && opt.key === L.scene && S.mode !== "fac") {
      const n = W.stage(S);
      if (n > 0) {
        const key = n >= W.TOP ? "w10_peak_" + S.loc.replace(/^w10_/, "") : STAGE_KEY[n];
        if (key && V.OUT[key]) {
          const sky = W.sky(S), base = G.skyAt ? G.skyAt(S.loc, S.day) : null;
          const at = base && !base.still ? Object.assign({}, base, { weather: SKY_ART[sky.weather] || base.weather }) : opt.sky;
          opt = Object.assign({}, opt, { key, seed: S.loc + ":w10:" + n + ":" + key, sky: at });
        }
      }
    }
    return paint0(canvas, opt);
  };
})(globalThis.G = globalThis.G || {});
