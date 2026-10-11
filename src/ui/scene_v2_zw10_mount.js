// 背景の絵（W10 の山）：眠り山ロウネ・鉄冠岳ドラウゼの麓と、登っている間の段の絵。設定は docs/lore/mountains.md
// 持ち主「景色が見たいわけではなく、冒険した先で絶景を見たいだけです。なので場所の背景は良いものを出してください」
//   麓 … 場所の絵（w10_roune・w10_drause。古い描き方 scene.js の OUT にも同じ名前がある）
//   1 峠 … w10_pass（鞍部の石積み〔ロウネ〕・鈴の道標〔ドラウゼ〕と、越えてきた下の世界）
//   2 山小屋 … w10_hut（黒い溶岩の石積みの小屋〔ロウネ〕・雪に埋めた雪室〔ドラウゼ〕）
//   3 尾根 … w10_ridge（細い尾根と、両側の雲海）
//   4 山頂 … w10_peak_roune（火口湖。空と雲を映す湖、南の怒る山の煙、石の輪）・w10_peak_drause（冠の歯、空いっぱいの断界山脈、北の凍った海、夜の光の帯）
// 山頂は時間帯（朝焼け・昼・夕焼け・夜）と天候（霧・雪・雨）で色と層が変わる。段の絵は、登っている段で場所の絵の名前を差し替えて出す（G.paintScene を包む）。
// 山ごとの色（草と黒い溶岩の山か、赤錆の雪山か）は描くときの場所（P.seed の頭は場所の id）で変える。空の天候は山の高さを足した空（G.w10.sky）。
// 乱数は P.R と V.rng（G.rand は使わない）。DOM は canvas だけ。レーン A（W10）
(function (G) {
  const V = G.SV2;
  if (!V || !V.OUT) return;
  const OUT = V.OUT;
  const TAU = Math.PI * 2;
  const { rgba, mix } = V;
  const isDrause = (P) => String(P.seed || "").indexOf("w10_drause") === 0;
  const pal = (P) => isDrause(P)
    ? { far: "#7c7c92", slope: "#7a4a3a", rock: "#4a2e26", ground: "#9a8a84", tex: "snow", snow: 0.6, frame: "#2a1e1a" }
    : { far: "#6c7c90", slope: "#5f7a46", rock: "#34302e", ground: "#5a7040", tex: "grass", snow: 0, frame: "#2c3a22" };
  // 今の光（朝焼け・夕焼け・昼）。雲海や雪の照り返しの色。曇り・霧・夜は無し
  const glowOf = (P) => P.overcast || P.weather === "fog" || P.night ? null : P.dawn ? "#ffb48a" : P.dusk ? "#ff8a5a" : "#fff4e0";
  const cloudCol = (P) => P.night ? { lit: "#3a4866", shade: "#121a2c" } : P.overcast ? { lit: "#c8ccd0", shade: "#7a8288" } : P.dusk ? { lit: "#ffb88a", shade: "#7a5a72" } : P.dawn ? { lit: "#ffd6b8", shade: "#8a7c98" } : { lit: "#ffffff", shade: "#a6b2c6" };

  // ---------------------------------------------------------------- 部品
  // 遠くの山並みを二重に（奥ほど淡く高い）
  function ranges(P, base, H, col, snow) {
    const { u } = P;
    V.mountains(P, { base: base - u * 2, height: H, d: 0.85, color: mix(col, "#c8d0dc", 0.25), snow: snow ? Math.min(0.9, snow + 0.2) : 0.15, scale: 4.5 });
    V.mountains(P, { base, height: H * 0.75, d: 0.7, color: col, snow: snow || 0, scale: 3.2 });
  }
  // 朝焼け・夕焼けの、地平の帯の光
  function horizonGlow(P, y, k) {
    const g0 = glowOf(P);
    if (!g0 || !(P.dawn || P.dusk)) return;
    const { ctx, w, u } = P;
    const g = ctx.createRadialGradient(P.sun.x, y, 0, P.sun.x, y, w * 0.7);
    g.addColorStop(0, rgba(g0, 0.45 * (k || 1))); g.addColorStop(0.4, rgba(g0, 0.15 * (k || 1))); g.addColorStop(1, rgba(g0, 0));
    ctx.fillStyle = g; ctx.fillRect(0, y - u * 30, w, u * 50);
  }
  // 雲海：遠くは平たく、手前は大きく盛り上がる。上側を今の光で照らす
  function cloudSea(P, y, rows) {
    const { ctx, w, u, R } = P;
    const c = cloudCol(P);
    const g = ctx.createLinearGradient(0, y - u * 2, 0, y + u * 14);
    g.addColorStop(0, rgba(c.lit, 0)); g.addColorStop(0.25, rgba(mix(c.lit, c.shade, 0.3), 0.85)); g.addColorStop(1, rgba(c.shade, 0.95));
    ctx.fillStyle = g; ctx.fillRect(0, y - u * 2, w, u * 16);
    for (let r = 0; r < (rows || 3); r++) {
      const yy = y + r * u * 3, n = 6 + r * 3;
      for (let i = 0; i < n; i++) V.cloud(P, (i + R() * 0.8) * (w / (n - 1)) - w * 0.05, yy + u * (R() * 2), u * (14 + r * 8 + R() * 10), u * (3 + r * 1.6), { lit: c.lit, shade: c.shade, a: 0.8 });
    }
    const g0 = glowOf(P);
    if (g0 && (P.dawn || P.dusk)) {
      const gg = ctx.createRadialGradient(P.sun.x, y + u * 2, 0, P.sun.x, y + u * 2, w * 0.35);
      gg.addColorStop(0, rgba(g0, 0.5)); gg.addColorStop(1, rgba(g0, 0));
      ctx.fillStyle = gg; ctx.fillRect(0, y - u * 6, w, u * 18);
    }
  }
  // ゆっくり流れる霧の塊（毎コマ）
  function driftMist(P, y0, n, a) {
    const { w, u } = P;
    P.anim.push({ draw: (c, t) => {
      for (let i = 0; i < n; i++) {
        const x = (((t * 0.012 + i / n) % 1) * 1.6 - 0.3) * w, y = y0 + u * (i % 3) * 3;
        const g = c.createRadialGradient(x, y, 0, x, y, u * 16);
        g.addColorStop(0, `rgba(238,242,248,${(P.night ? 0.5 : 1) * a})`); g.addColorStop(1, "rgba(238,242,248,0)");
        c.fillStyle = g; c.fillRect(x - u * 16, y - u * 16, u * 32, u * 32);
      }
    } });
  }
  function goat(P, x, y, s, sil) {
    const { ctx } = P;
    ctx.fillStyle = sil ? P.c("#1a1614") : P.lit("#f0ece0", 0.2, 0.3);
    ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.55, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + s * 0.95, y - s * 0.45, s * 0.35, s * 0.28, -0.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = sil ? P.c("#1a1614") : P.c("#3a3430"); ctx.lineWidth = Math.max(1, s * 0.18);
    ctx.beginPath(); ctx.moveTo(x + s * 1.05, y - s * 0.7); ctx.quadraticCurveTo(x + s * 0.8, y - s * 1.2, x + s * 0.55, y - s * 0.95); ctx.stroke();
    for (const lx of [-0.6, -0.3, 0.35, 0.6]) { ctx.beginPath(); ctx.moveTo(x + s * lx, y + s * 0.3); ctx.lineTo(x + s * lx, y + s * 0.95); ctx.stroke(); }
  }
  // 遠くの斜面の山羊
  function goats(P, n, y0, y1) {
    const { w, R } = P;
    for (let i = 0; i < n; i++) { const x = w * (0.08 + R() * 0.84), y = y0 + R() * (y1 - y0); goat(P, x, y, P.u * (0.5 + P.depth(y) * 0.9)); }
  }
  // 道標の石積み（ロウネ。504 年の避難の道の始まり）
  function cairn(P, x, base, s) {
    const { ctx } = P;
    for (let i = 0; i < 6; i++) {
      const r = s * (1 - i * 0.14);
      ctx.fillStyle = i % 2 ? P.lit("#6a6460", 0.05, 0.35) : P.c("#3e3a38");
      ctx.beginPath(); ctx.ellipse(x + (i % 2 ? r * 0.08 : -r * 0.06), base - s * 0.5 * i - r * 0.35, r, r * 0.42, 0, 0, TAU); ctx.fill();
    }
  }
  // 鈴の道標（ドラウゼ。帰らなかった坑夫の鈴）
  function bellPost(P, x, base, s) {
    const { ctx, u } = P;
    ctx.fillStyle = P.c("#3a2a22"); ctx.fillRect(x - s * 0.12, base - s * 4, s * 0.24, s * 4);
    ctx.fillRect(x - s * 1.4, base - s * 3.8, s * 2.8, s * 0.2);
    for (let i = 0; i < 7; i++) {
      const bx = x - s * 1.25 + i * s * 0.42, by = base - s * (3.2 - (i % 3) * 0.35);
      ctx.strokeStyle = P.c("#4a3a30"); ctx.lineWidth = Math.max(1, u * 0.1); ctx.beginPath(); ctx.moveTo(bx, base - s * 3.6); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = i % 2 ? P.lit("#8a4a2a", 0, 0.3) : P.c("#6a3a22");
      ctx.beginPath(); ctx.moveTo(bx - s * 0.16, by + s * 0.3); ctx.quadraticCurveTo(bx, by - s * 0.15, bx + s * 0.16, by + s * 0.3); ctx.fill();
    }
    ctx.fillStyle = rgba(P.lit("#f2f5fa", 0, 0.3), 0.85); ctx.fillRect(x - s * 1.45, base - s * 3.85, s * 2.9, s * 0.1);
  }
  // 冠の歯（尖った黒い岩。日の当たる面と雪の筋）
  function tooth(P, x, base, tw, th, lean) {
    const { ctx } = P;
    const lx = P.sun.x > x ? 1 : -1;
    const g = ctx.createLinearGradient(x - tw, 0, x + tw, 0);
    const lit = P.lit("#6a4434", 0, P.dawn || P.dusk ? 0.55 : 0.3), dark = P.dark("#24160f", 0, 0.5);
    g.addColorStop(0, lx < 0 ? lit : dark); g.addColorStop(0.5, P.c("#3a2620")); g.addColorStop(1, lx < 0 ? dark : lit);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - tw, base); ctx.lineTo(x - tw * 0.55 + lean, base - th * 0.55); ctx.lineTo(x - tw * 0.2 + lean * 1.3, base - th * 0.85); ctx.lineTo(x + lean * 1.6, base - th); ctx.lineTo(x + tw * 0.3 + lean * 1.2, base - th * 0.7); ctx.lineTo(x + tw * 0.6 + lean, base - th * 0.42); ctx.lineTo(x + tw, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(P.lit("#f2f5fa", 0, 0.35), 0.8);
    ctx.beginPath(); ctx.moveTo(x - tw * 0.2 + lean * 1.3, base - th * 0.85); ctx.lineTo(x + lean * 1.6, base - th); ctx.lineTo(x + tw * 0.05 + lean * 1.3, base - th * 0.8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - tw * 0.55 + lean, base - th * 0.55); ctx.lineTo(x - tw * 0.35 + lean, base - th * 0.58); ctx.lineTo(x - tw * 0.6 + lean, base - th * 0.3); ctx.closePath(); ctx.fill();
  }
  // つづら折りの踏み跡
  function switchback(P, x0, y0, x1, y1, n) {
    const { ctx } = P;
    ctx.strokeStyle = rgba(P.lit("#d8c8a8", 0.2, 0.3), 0.6); ctx.lineWidth = Math.max(1, P.u * 0.4); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 1; i <= n; i++) { const t = i / n; ctx.lineTo((i % 2 ? x1 : x0) + (x1 - x0) * 0.1 * t, y0 + (y1 - y0) * t); }
    ctx.stroke(); ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  }
  // 岩（日の当たる面つき）
  function rock(P, x, y, s, col) {
    const { ctx } = P;
    ctx.fillStyle = P.dark(col, 0, 0.3);
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x - s * 0.7, y - s * 0.6); ctx.lineTo(x - s * 0.1, y - s * 0.8); ctx.lineTo(x + s * 0.6, y - s * 0.5); ctx.lineTo(x + s, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.lit(col, 0, 0.45);
    ctx.beginPath(); ctx.moveTo(x - s * 0.7, y - s * 0.6); ctx.lineTo(x - s * 0.1, y - s * 0.8); ctx.lineTo(x + s * 0.1, y - s * 0.45); ctx.lineTo(x - s * 0.4, y - s * 0.35); ctx.closePath(); ctx.fill();
  }
  // 雪煙（風下へ流れる。毎コマ）
  function spindrift(P, y0, n) {
    const { w, u } = P;
    P.anim.push({ draw: (c, t) => {
      for (let i = 0; i < n; i++) {
        const k = (t * 0.1 + i / n) % 1, x = w * (0.1 + k * 0.85), y = y0 + u * ((i % 4) * 2.5 - k * 3);
        c.fillStyle = `rgba(244,247,251,${0.3 * Math.sin(k * Math.PI)})`;
        c.beginPath(); c.ellipse(x, y, u * (3 + k * 6), u * (0.4 + k * 0.4), -0.05, 0, TAU); c.fill();
      }
    } });
  }

  // ---------------------------------------------------------------- 麓：眠り山ロウネ（灰の上の草の裾、雲の帽子の平らな頂、山羊、羊飼いの小屋の煙）
  OUT.w10_roune = (P) => {
    const { ctx, u, w, h, hz } = P;
    ranges(P, hz - u * 2, u * 12, "#6a7a8a", 0);
    horizonGlow(P, hz - u * 2, 0.8);
    const top = hz - u * 30, cx = w * 0.5;
    const g = ctx.createLinearGradient(0, top, 0, hz + u * 4);
    g.addColorStop(0, P.lit("#4a5240", 0.3, 0.25)); g.addColorStop(0.35, P.lit("#5a6e44", 0.2, 0.2)); g.addColorStop(1, P.c("#5f7a46", 0.05));
    const cone = () => { ctx.beginPath(); ctx.moveTo(-u * 4, hz + u * 4); ctx.bezierCurveTo(w * 0.22, hz - u * 2, cx - u * 22, top + u * 4, cx - u * 10, top); ctx.lineTo(cx + u * 10, top); ctx.bezierCurveTo(cx + u * 22, top + u * 4, w * 0.78, hz - u * 2, w + u * 4, hz + u * 4); ctx.closePath(); };
    cone(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); cone(); ctx.clip();
    const sx = P.sun.x < cx ? -1 : 1, gl = glowOf(P);
    if (gl) { const sg = ctx.createLinearGradient(cx, 0, cx + sx * w * 0.4, 0); sg.addColorStop(0, rgba(gl, 0)); sg.addColorStop(1, rgba(gl, 0.18)); ctx.fillStyle = sg; ctx.fillRect(0, top, w, hz - top + u * 4); }
    for (let i = 0; i < 7; i++) { const x = cx + (i - 3) * u * 6; ctx.strokeStyle = rgba(P.dark("#3a4a30", 0.2, 0.4), 0.35); ctx.lineWidth = u * 0.8; ctx.beginPath(); ctx.moveTo(x, top + u * 2); ctx.quadraticCurveTo(x + (x - cx) * 0.6, hz - u * 8, x + (x - cx) * 1.6, hz + u * 4); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = P.c("#2a2624", 0.3); ctx.fillRect(cx - u * 10, top, u * 20, u * 1.2);
    if (P.weather !== "fog") { const c = cloudCol(P); V.cloud(P, cx, top - u * 1.5, u * 34, u * 6, { lit: c.lit, shade: c.shade, a: 0.85 }); }
    switchback(P, cx - u * 4, hz + u * 2, cx + u * 6, top + u * 4, 9);
    V.ground(P, { top: hz + u * 3, color: "#5a7040", tex: "grass" });
    goats(P, 12, hz - u * 6, hz + u * 10);
    const hx = w * 0.72, hb = hz + u * 9;
    ctx.fillStyle = P.lit("#4a4644", 0.1, 0.3); ctx.fillRect(hx - u * 4, hb - u * 3.5, u * 8, u * 3.5);
    ctx.fillStyle = P.c("#3a3028"); ctx.beginPath(); ctx.moveTo(hx - u * 4.6, hb - u * 3.5); ctx.lineTo(hx, hb - u * 6); ctx.lineTo(hx + u * 4.6, hb - u * 3.5); ctx.fill();
    if (V.smoke) V.smoke(P, hx + u * 2, hb - u * 6, u * 2, 0.1);
    if (P.night || P.dusk) V.light(P, hx - u * 1.5, hb - u * 1.8, u * 4, "#ffb050", 0.8, true);
    cairn(P, w * 0.2, h - u * 6, u * 2.2);
    V.frame(P, { color: "#2c3a22" });
  };

  // ---------------------------------------------------------------- 麓：鉄冠岳ドラウゼ（赤錆色の山、頂の冠の歯、雪、坑口、坑夫の村跡、凍ったレール、煙を上げる一軒）
  OUT.w10_drause = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    ranges(P, hz - u * 3, u * 16, "#7a7a8a", 0.5);
    horizonGlow(P, hz - u * 3, 0.8);
    const top = hz - u * 34, cx = w * 0.52;
    const g = ctx.createLinearGradient(0, top, 0, hz + u * 4);
    g.addColorStop(0, P.lit("#5a3226", 0.25, 0.3)); g.addColorStop(1, P.c("#7a4a3a", 0.15));
    const path = () => { ctx.beginPath(); ctx.moveTo(-u * 4, hz + u * 4); ctx.lineTo(cx - u * 30, hz - u * 12); ctx.lineTo(cx - u * 9, top + u * 2); ctx.lineTo(cx + u * 9, top + u * 2); ctx.lineTo(cx + u * 34, hz - u * 10); ctx.lineTo(w + u * 4, hz + u * 4); ctx.closePath(); };
    path(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); path(); ctx.clip();
    ctx.fillStyle = rgba(P.shadowC, 0.35);
    ctx.beginPath(); if (P.sun.x < cx) { ctx.moveTo(cx, top); ctx.lineTo(cx + u * 6, hz + u * 4); ctx.lineTo(w, hz + u * 4); ctx.lineTo(w, top); } else { ctx.moveTo(cx, top); ctx.lineTo(cx - u * 6, hz + u * 4); ctx.lineTo(0, hz + u * 4); ctx.lineTo(0, top); } ctx.fill();
    ctx.fillStyle = rgba(P.lit("#f2f5fa", 0.2, 0.35), 0.85);
    for (let i = 0; i < 14; i++) { const x = cx + (R() - 0.5) * u * 46, y = top + u * (4 + R() * 22); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + u * 1.2, y + u * 4, x + u * (0.5 + R()), y + u * (6 + R() * 6)); ctx.lineTo(x - u * 0.4, y + u * (4 + R() * 3)); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    for (let i = 0; i < 7; i++) tooth(P, cx - u * 9 + i * u * 3, top + u * 2.5, u * 1.6, u * (5 + (i % 3) * 2.5 + R() * 2), (R() - 0.5) * u);
    if (P.weather !== "fog") spindrift(P, top - u * 2, 5);
    for (const [x, y] of [[0.3, 0.86], [0.66, 0.9], [0.44, 0.78], [0.57, 0.7]]) { ctx.fillStyle = "#0e0a08"; ctx.beginPath(); ctx.arc(w * x, hz - u * 12 * y + u * 4, u * 1.1, Math.PI, 0); ctx.fill(); ctx.fillStyle = P.c("#5a3a2a"); ctx.fillRect(w * x - u * 1.4, hz - u * 12 * y + u * 4, u * 2.8, u * 0.4); }
    V.ground(P, { top: hz + u * 3, color: "#8a7a70", tex: "snow" });
    ctx.strokeStyle = P.c("#3a3030"); ctx.lineWidth = Math.max(1, u * 0.3);
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w * 0.5 + k * u * 3, h); ctx.lineTo(w * 0.5 + k * u * 0.6, hz + u * 4); ctx.stroke(); }
    for (let i = 0; i < 10; i++) { const y = hz + u * 4 + Math.pow(i / 10, 1.6) * (h - hz - u * 4), k = (y - hz) / (h - hz); ctx.fillStyle = P.c("#3a2a22"); ctx.fillRect(w * 0.5 - u * (0.8 + 2.6 * k), y, u * (1.6 + 5.2 * k), u * 0.25 * (0.5 + k)); }
    for (let i = 0; i < 5; i++) {
      const x = w * (0.08 + i * 0.07 + (i > 2 ? 0.5 : 0)), b = hz + u * (8 + (i % 2) * 3);
      ctx.fillStyle = P.c("#5a5048"); ctx.fillRect(x, b - u * 3, u * 5, u * 3);
      ctx.fillStyle = "#14100e"; ctx.fillRect(x + u * 1.8, b - u * 2, u * 1.2, u * 2);
      ctx.fillStyle = P.c("#2a2420"); ctx.beginPath(); ctx.moveTo(x - u * 0.4, b - u * 3); ctx.lineTo(x + u * 1.5, b - u * 4.6); ctx.lineTo(x + u * 2.6, b - u * 3.4); ctx.fill();
      ctx.fillStyle = rgba(P.lit("#f2f5fa", 0, 0.3), 0.85); ctx.fillRect(x - u * 0.2, b - u * 3.2, u * 5.4, u * 0.4);
    }
    if (V.smoke) V.smoke(P, w * 0.08 + u * 4, hz + u * 4, u * 1.5, 0.1);
    if (P.night || P.dusk || P.overcast) V.light(P, w * 0.08 + u * 2.4, hz + u * 6.5, u * 3, "#ffb050", 0.8, true);
    V.frame(P, { color: "#2a1e1a" });
  };

  // ---------------------------------------------------------------- 段 1：峠（鞍部の道標と、越えてきた下の世界）
  OUT.w10_pass = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    const c = pal(P), dr = isDrause(P);
    ranges(P, hz + u * 2, u * 8, c.far, dr ? 0.6 : 0);
    horizonGlow(P, hz, 1);
    // 下の世界（ロウネ：畑と川と西の海／ドラウゼ：雪原と、谷の鉱山の都の煙）
    const low = hz + u * 2;
    const lg = ctx.createLinearGradient(0, low, 0, low + u * 10);
    lg.addColorStop(0, P.c(dr ? "#c8ccd4" : "#8a9a6a", 0.7)); lg.addColorStop(1, P.c(dr ? "#a8aab4" : "#6a7a4a", 0.5));
    ctx.fillStyle = lg; ctx.fillRect(0, low, w, u * 10);
    if (!dr) {
      for (let i = 0; i < 26; i++) { ctx.fillStyle = rgba(P.c(["#a8a05a", "#7a8a4a", "#b89a5a", "#6a7a3a"][i % 4], 0.6), 0.6); ctx.fillRect(R() * w, low + u * (0.5 + R() * 7), u * (2 + R() * 4), u * (0.4 + R() * 0.6)); }
      ctx.strokeStyle = rgba(P.lit("#c8d8e8", 0.5, 0.5), 0.7); ctx.lineWidth = Math.max(1, u * 0.3);
      ctx.beginPath(); ctx.moveTo(w * 0.05, low + u * 7); ctx.bezierCurveTo(w * 0.3, low + u * 2, w * 0.45, low + u * 8, w * 0.7, low + u * 3); ctx.stroke();
      ctx.fillStyle = rgba(P.lit("#d8e4ec", 0.6, 0.5), 0.6); ctx.fillRect(0, low - u * 0.6, w * 0.25, u * 0.8);
    } else {
      for (const x of [0.62, 0.66, 0.7]) { ctx.fillStyle = P.c("#3a3434", 0.5); ctx.fillRect(w * x, low + u * 3, u * 1.2, u * 1.6); if (V.smoke) V.smoke(P, w * x + u * 0.6, low + u * 3, u * 0.8, 0.5); }
    }
    if (P.weather !== "rain") cloudSea(P, low + u * 6, 1);
    // 峠の両肩と鞍部
    const g = ctx.createLinearGradient(0, hz - u * 10, 0, h);
    g.addColorStop(0, P.lit(c.slope, 0.15, 0.3)); g.addColorStop(1, P.dark(c.slope, 0, 0.4));
    const sh = () => { ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, hz - u * 14); ctx.quadraticCurveTo(w * 0.22, hz - u * 12, w * 0.36, hz + u * 8); ctx.quadraticCurveTo(w * 0.5, hz + u * 11, w * 0.64, hz + u * 8); ctx.quadraticCurveTo(w * 0.78, hz - u * 14, w, hz - u * 18); ctx.lineTo(w, h); ctx.closePath(); };
    sh(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); sh(); ctx.clip();
    if (c.snow) { for (let i = 0; i < 16; i++) { const x = R() * w, y = hz - u * 6 + R() * u * 30, l = u * (6 + R() * 12); const sg = ctx.createLinearGradient(x - l, 0, x + l, 0); sg.addColorStop(0, rgba(P.lit("#f2f5fa", 0.05, 0.35), 0)); sg.addColorStop(0.5, rgba(P.lit("#f2f5fa", 0.05, 0.35), 0.45)); sg.addColorStop(1, rgba(P.lit("#f2f5fa", 0.05, 0.35), 0)); ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x, y, l, u * (0.25 + R() * 0.35), (R() - 0.5) * 0.3, 0, TAU); ctx.fill(); } }
    V.ground(P, { top: hz + u * 10, color: c.ground, tex: c.tex });
    ctx.restore();
    ctx.fillStyle = rgba(P.lit(dr ? "#e8ecf2" : "#c8b898", 0.1, 0.3), 0.75);
    ctx.beginPath(); ctx.moveTo(w * 0.47, hz + u * 10); ctx.lineTo(w * 0.53, hz + u * 10); ctx.lineTo(w * 0.62, h); ctx.lineTo(w * 0.38, h); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 8; i++) { const y = hz + u * 12 + R() * (h - hz - u * 12); rock(P, R() < 0.5 ? R() * w * 0.3 : w * 0.7 + R() * w * 0.3, y, u * (1 + P.depth(y) * 3), c.rock); }
    if (dr) bellPost(P, w * 0.56, hz + u * 11, u * 1.6); else cairn(P, w * 0.56, hz + u * 11, u * 1.4);
    // 峠を抜ける風（毎コマ）
    P.anim.push({ draw: (cx, t) => { for (let i = 0; i < 10; i++) { const k = (t * 0.25 + i / 10) % 1, y = hz + u * (8 + (i % 5) * 4); cx.strokeStyle = `rgba(240,240,236,${0.25 * Math.sin(k * Math.PI)})`; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(w * k, y); cx.lineTo(w * k + u * 6, y - u * 0.4); cx.stroke(); } } });
    V.frame(P, { color: c.frame });
  };

  // ---------------------------------------------------------------- 段 2：山小屋（ロウネ：黒い溶岩の石積み・山羊の角／ドラウゼ：屋根まで雪に埋めた雪室と坑夫の名の板）
  OUT.w10_hut = (P) => {
    const { ctx, u, w, h, hz } = P;
    const c = pal(P), dr = isDrause(P);
    ranges(P, hz - u * 4, u * 26, c.far, dr ? 0.7 : 0.3);
    horizonGlow(P, hz - u * 4, 1);
    V.ground(P, { top: hz, color: c.ground, tex: c.tex });
    const x = w * 0.5, b = hz + u * 14, bw = u * 22, bh = u * 9;
    const lit = P.night || P.dusk || P.overcast || P.weather === "fog";
    if (!dr) {
      const Rs = V.rng(P.seed + ":hut");
      for (let row = 0; row < 4; row++) for (let i = 0; i < 9; i++) {
        const sx = x - bw / 2 + i * (bw / 9) + (row % 2 ? bw / 18 : 0), sy = b - bh + row * (bh / 4);
        if (sx > x + bw / 2 - u) continue;
        ctx.fillStyle = Rs() < 0.5 ? P.c("#3a3634") : P.lit("#4a4440", 0.05, 0.3);
        ctx.beginPath(); ctx.ellipse(sx + bw / 18, sy + bh / 8, bw / 19, bh / 9, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = P.c("#3a3028"); ctx.beginPath(); ctx.moveTo(x - bw / 2 - u * 2, b - bh); ctx.lineTo(x, b - bh - u * 7); ctx.lineTo(x + bw / 2 + u * 2, b - bh); ctx.fill();
      ctx.strokeStyle = rgba(P.lit("#7a6a4a", 0, 0.3), 0.6); ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(x - bw / 2 - u * 2 + i * u * 2.2, b - bh); ctx.lineTo(x + (i - 6) * u * 0.4, b - bh - u * 6); ctx.stroke(); }
      ctx.fillStyle = "#120e0c"; ctx.fillRect(x - u * 2, b - u * 6, u * 4, u * 6);
      ctx.strokeStyle = P.lit("#e8e0cc", 0, 0.3); ctx.lineWidth = Math.max(1, u * 0.35);
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, b - u * 6.6); ctx.quadraticCurveTo(x + k * u * 2.4, b - u * 8.4, x + k * u * 1.2, b - u * 9.6); ctx.stroke(); }
      ctx.fillStyle = P.c("#3a3634"); ctx.fillRect(x + u * 6, b - bh - u * 6, u * 2, u * 4);
      if (V.smoke) V.smoke(P, x + u * 7, b - bh - u * 6, u * 2.5, 0.05);
      ctx.fillStyle = lit ? "#ffb050" : P.c("#1a1612"); ctx.fillRect(x + u * 4, b - u * 6, u * 2.4, u * 2);
      if (lit) V.light(P, x + u * 5.2, b - u * 5, u * 7, "#ffb050", 0.9, true);
      for (let i = 0; i < 10; i++) { const px = x - bw / 2 + u * (1.5 + (i % 5) * 1.5), py = b - u * (0.8 + Math.floor(i / 5) * 1.5); ctx.fillStyle = P.c(i % 2 ? "#6a4a2a" : "#7a5a36"); ctx.beginPath(); ctx.arc(px, py, u * 0.75, 0, TAU); ctx.fill(); ctx.fillStyle = P.c("#c8a878"); ctx.beginPath(); ctx.arc(px, py, u * 0.35, 0, TAU); ctx.fill(); }
      goat(P, w * 0.2, b - u * 1, u * 1.6);
    } else {
      const sg = ctx.createRadialGradient(x - u * 4, b - bh, 0, x, b - bh * 0.4, bw * 0.7);
      sg.addColorStop(0, P.lit("#ffffff", 0, 0.4)); sg.addColorStop(1, P.c("#b8c0cc"));
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x, b, bw * 0.62, bh * 1.25, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#0c0a0a"; ctx.beginPath(); ctx.moveTo(x - u * 2.4, b); ctx.lineTo(x - u * 2.4, b - u * 4); ctx.quadraticCurveTo(x, b - u * 6.5, x + u * 2.4, b - u * 4); ctx.lineTo(x + u * 2.4, b); ctx.fill();
      if (lit) { V.light(P, x, b - u * 2.5, u * 6, "#ffb050", 0.8, true); ctx.fillStyle = "rgba(255,176,80,.35)"; ctx.fillRect(x - u * 2, b - u * 4, u * 4, u * 4); }
      ctx.fillStyle = P.c("#4a3a2e"); ctx.fillRect(x + u * 9, b - u * 7, u * 5, u * 6); ctx.fillRect(x + u * 11.2, b - u * 1, u * 0.6, u * 1);
      ctx.strokeStyle = rgba(P.lit("#c8b8a0", 0, 0.2), 0.6); ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + u * 9.6, b - u * (6.4 - i * 0.9)); ctx.lineTo(x + u * (11 + (i * 37 % 3)), b - u * (6.4 - i * 0.9)); ctx.stroke(); }
      if (V.smoke) V.smoke(P, x + u * 3, b - bh * 1.2, u * 1.6, 0.05);
      spindrift(P, hz + u * 2, 4);
    }
    V.frame(P, { color: c.frame });
  };

  // ---------------------------------------------------------------- 段 3：尾根（馬の背の細い道。両側は雲海へ落ちる）
  OUT.w10_ridge = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    const c = pal(P), dr = isDrause(P);
    ranges(P, hz - u * 2, u * 22, c.far, dr ? 0.7 : 0.35);
    horizonGlow(P, hz, 1.2);
    cloudSea(P, hz + u * 1, 3);
    const g = ctx.createLinearGradient(0, hz - u * 6, 0, h);
    g.addColorStop(0, P.lit(c.slope, 0.3, 0.3)); g.addColorStop(1, P.dark(c.rock, 0, 0.35));
    const ridge = () => { ctx.beginPath(); ctx.moveTo(w * 0.02, h); ctx.quadraticCurveTo(w * 0.33, hz + u * 12, w * 0.555, hz - u * 6); ctx.lineTo(w * 0.585, hz - u * 6.5); ctx.quadraticCurveTo(w * 0.64, hz + u * 12, w * 0.98, h); ctx.closePath(); };
    ridge(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ridge(); ctx.clip();
    const lx = P.sun.x < w * 0.57 ? -1 : 1, gl = glowOf(P);
    ctx.fillStyle = rgba(gl || "#c8d0dc", gl ? 0.22 : 0.08);
    ctx.beginPath(); ctx.moveTo(w * 0.57, hz - u * 6); ctx.lineTo(w * (0.5 + lx * 0.48), h); ctx.lineTo(w * 0.5, h); ctx.closePath(); ctx.fill();
    if (c.snow) { ctx.fillStyle = rgba(P.lit("#f2f5fa", 0.05, 0.35), 0.35); for (let i = 0; i < 14; i++) { const y = hz + R() * (h - hz), d = P.depth(y); ctx.beginPath(); ctx.ellipse(w * 0.55 + (R() - 0.5) * w * 0.5 * (0.2 + d), y, u * (1.5 + d * 6), u * (0.15 + d * 0.4), 0, 0, TAU); ctx.fill(); } }
    for (let i = 0; i < 9; i++) { const y = hz + u * 3 + R() * (h - hz - u * 3), d = P.depth(y); rock(P, w * 0.57 + (R() - 0.5) * w * 0.6 * (0.1 + d), y, u * (0.6 + d * 3), c.rock); }
    ctx.restore();
    ctx.strokeStyle = rgba(P.lit(dr ? "#f2f5fa" : "#d8c8a8", 0.2, 0.3), 0.75); ctx.lineWidth = Math.max(1, u * 0.45);
    ctx.beginPath(); ctx.moveTo(w * 0.5, h); ctx.quadraticCurveTo(w * 0.53, hz + u * 8, w * 0.57, hz - u * 6); ctx.stroke();
    driftMist(P, hz + u * 3, 3, 0.16);
    if (dr) spindrift(P, hz - u * 4, 5);
    V.frame(P, { color: c.frame });
  };

  // ---------------------------------------------------------------- 段 4：山頂（ロウネ：火口湖の縁）
  OUT.w10_peak_roune = (P) => {
    const { ctx, u, w, h, hz } = P;
    ranges(P, hz - u * 1, u * 10, "#66768c", 0);
    horizonGlow(P, hz, 1.3);
    // 南の怒る山：細い煙を一本。夜と夕は頂が赤く息をする
    const vx = w * 0.8;
    const vg = ctx.createLinearGradient(0, hz - u * 12, 0, hz);
    vg.addColorStop(0, P.lit("#4a4050", 0.5, 0.3)); vg.addColorStop(1, P.c("#5a5068", 0.6));
    ctx.fillStyle = vg; ctx.beginPath(); ctx.moveTo(vx - u * 12, hz); ctx.lineTo(vx - u * 1.6, hz - u * 11); ctx.lineTo(vx + u * 1.6, hz - u * 11); ctx.lineTo(vx + u * 13, hz); ctx.fill();
    if (P.night || P.dusk) { V.light(P, vx, hz - u * 11, u * 4, "#ff5a2a", 0.9, true); ctx.fillStyle = "rgba(255,110,60,.6)"; ctx.fillRect(vx - u * 1.4, hz - u * 11.2, u * 2.8, u * 0.5); }
    P.anim.push({ draw: (c, t) => { for (let i = 0; i < 9; i++) { const k = (t * 0.03 + i / 9) % 1; c.fillStyle = `rgba(${P.night ? "70,60,64" : "150,140,136"},${0.3 * (1 - k)})`; c.beginPath(); c.ellipse(vx + k * u * 14, hz - u * (12 + k * 22), u * (1 + k * 5), u * (1.2 + k * 2.5), 0, 0, TAU); c.fill(); } } });
    cloudSea(P, hz + u * 2, 2);
    // 火口：内壁（向こう側は日が当たり、手前は影）と湖
    const lx = w * 0.46, ly = hz + u * 17, rx = w * 0.48, ry = u * 8;
    // 向こう側の内壁は、雲海の下に細い帯で見えるだけ（遠景を隠さない）
    const wall = ctx.createLinearGradient(0, hz + u * 5, 0, ly);
    wall.addColorStop(0, P.lit("#6a564a", 0.15, P.dawn || P.dusk ? 0.6 : 0.4)); wall.addColorStop(1, P.c("#3a302c"));
    ctx.fillStyle = wall; ctx.beginPath(); ctx.ellipse(lx, ly, rx * 1.06, ly - hz - u * 5, 0, Math.PI, 0); ctx.fill();
    // 湖：空を逆さに映す（上が地平の色、下が天頂の色）
    const sky = P.sky;
    const lake = ctx.createLinearGradient(0, ly - ry * 0.8, 0, ly + ry);
    lake.addColorStop(0, mix(P.c(sky.hor), "#2a6a9a", P.night ? 0.2 : 0.35)); lake.addColorStop(0.6, mix(P.c(sky.mid), "#1a4a7a", 0.4)); lake.addColorStop(1, mix(P.c(sky.top), "#0a2a4a", 0.4));
    const lakePath = () => { ctx.beginPath(); ctx.ellipse(lx, ly + u * 1.5, rx * 0.92, ry, 0, 0, TAU); };
    lakePath(); ctx.fillStyle = lake; ctx.fill();
    ctx.save(); lakePath(); ctx.clip();
    ctx.fillStyle = rgba(P.dark("#2a2220", 0, 0.4), 0.45); ctx.beginPath(); ctx.ellipse(lx, ly - ry * 0.85, rx * 0.95, u * 2, 0, 0, TAU); ctx.fill();
    const Rs = V.rng(P.seed + ":lake"), cc = cloudCol(P);
    if (!P.night) for (let i = 0; i < 6; i++) { ctx.fillStyle = rgba(cc.lit, P.overcast ? 0.12 : 0.22); ctx.beginPath(); ctx.ellipse(lx + (Rs() - 0.5) * rx * 1.5, ly + (Rs() - 0.3) * ry, u * (6 + Rs() * 9), u * (0.6 + Rs() * 0.5), 0, 0, TAU); ctx.fill(); }
    if (P.night && !P.overcast) for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(230,236,255,${0.3 + Rs() * 0.5})`; ctx.fillRect(lx + (Rs() - 0.5) * rx * 1.8, ly + (Rs() - 0.5) * ry * 1.8, 1, 1); }
    const g0 = glowOf(P);
    if (g0 && (P.dawn || P.dusk)) { const sg = ctx.createLinearGradient(P.sun.x - u * 4, 0, P.sun.x + u * 4, 0); sg.addColorStop(0, rgba(g0, 0)); sg.addColorStop(0.5, rgba(g0, 0.55)); sg.addColorStop(1, rgba(g0, 0)); ctx.fillStyle = sg; ctx.fillRect(P.sun.x - u * 4, ly - ry, u * 8, ry * 2.4); }
    ctx.restore();
    // 湖面のきらめきと湯気（毎コマ）
    const glints = Array.from({ length: 14 }, () => [lx + (Rs() - 0.5) * rx * 1.6, ly + (Rs() - 0.4) * ry * 1.4, Rs() * TAU]);
    P.anim.push({ draw: (c, t) => {
      if (!P.overcast && P.weather !== "fog") for (const [x, y, ph] of glints) { const a = Math.max(0, Math.sin(t * 1.4 + ph)) * (P.night ? 0.35 : 0.7); c.fillStyle = `rgba(255,250,236,${a})`; c.fillRect(x - u * 0.6, y, u * 1.2, 1); }
      for (let i = 0; i < 6; i++) { const k = (t * 0.04 + i / 6) % 1; c.fillStyle = `rgba(240,240,240,${0.16 * Math.sin(k * Math.PI)})`; c.beginPath(); c.ellipse(lx + (i - 2.5) * u * 7, ly - k * u * 9, u * (2 + k * 5), u * (0.8 + k), 0, 0, TAU); c.fill(); }
    } });
    // 手前の縁（黒い砂）と、名を刻んだ石の輪、岩の上の山羊
    const rim = ctx.createLinearGradient(0, h - u * 12, 0, h);
    rim.addColorStop(0, P.lit("#3a3432", 0, 0.35)); rim.addColorStop(1, P.dark("#1a1614", 0, 0.4));
    ctx.fillStyle = rim; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h - u * 9); ctx.quadraticCurveTo(w * 0.5, h - u * 2.5, w, h - u * 11); ctx.lineTo(w, h); ctx.fill();
    for (let i = 0; i < 160; i++) { const x = Rs() * w, y = h - Rs() * u * 8; ctx.fillStyle = rgba(Rs() < 0.5 ? "#000000" : "#8a8070", 0.25); ctx.fillRect(x, y, 1.5, 1.5); }
    for (let i = 0; i < 9; i++) { const x = w * (0.08 + i * 0.035), y = h - u * (7.2 - Math.sin(i / 8 * Math.PI) * 1.4); ctx.fillStyle = i === 8 ? P.lit("#c8c0b0", 0, 0.4) : P.lit("#6a625a", 0, 0.3); ctx.beginPath(); ctx.ellipse(x, y, u * 0.9, u * 0.45, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = P.c("#24201e"); ctx.beginPath(); ctx.moveTo(w * 0.78, h - u * 10); ctx.lineTo(w * 0.83, h - u * 16.5); ctx.lineTo(w * 0.88, h - u * 17); ctx.lineTo(w * 0.93, h - u * 14.5); ctx.lineTo(w * 0.97, h - u * 10); ctx.fill();
    goat(P, w * 0.865, h - u * 18, u * 1.3, P.dawn || P.dusk || P.night);
    if (P.weather === "fog") driftMist(P, hz + u * 8, 5, 0.35);
    V.frame(P, { color: "#161412" });
  };

  // ---------------------------------------------------------------- 段 4：山頂（ドラウゼ：冠の歯のあいだから）
  OUT.w10_peak_drause = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    // 夜の北の空の光の帯（ゆっくり揺れる）
    if (P.night && !P.overcast && P.weather !== "fog") {
      P.anim.push({ draw: (c, t) => {
        for (let b = 0; b < 3; b++) {
          const g = c.createLinearGradient(0, hz - u * 60, 0, hz - u * 18);
          const col = b === 1 ? "160,120,255" : "110,255,170";
          g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.55, `rgba(${col},${b === 1 ? 0.08 : 0.2})`); g.addColorStop(1, `rgba(${col},0)`);
          c.fillStyle = g; c.beginPath(); c.moveTo(0, hz - u * 30);
          for (let x = 0; x <= w; x += w / 24) c.lineTo(x, hz - u * (44 + b * 5) + Math.sin(x / w * 5 + t * 0.4 + b) * u * 5);
          for (let x = w; x >= 0; x -= w / 24) c.lineTo(x, hz - u * (26 + b * 4) + Math.sin(x / w * 5 + t * 0.4 + b + 0.6) * u * 4);
          c.closePath(); c.fill();
        }
      } });
    }
    // 東の白い壁（断界山脈）：空の端から端まで。朝と夕は頂から紅に染まる
    V.mountains(P, { base: hz - u * 4, height: u * 40, d: 0.6, color: "#a0a8bc", snow: 0.9, scale: 6 });
    if (glowOf(P) && (P.dawn || P.dusk)) { const col = P.dawn ? "#ff9ab0" : "#ff8a6a"; const g = ctx.createLinearGradient(0, hz - u * 44, 0, hz - u * 10); g.addColorStop(0, rgba(col, 0.4)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(0, hz - u * 44, w, u * 34); }
    V.mountains(P, { base: hz, height: u * 16, d: 0.45, color: "#6a6a80", snow: 0.75, scale: 4 });
    // 北の凍った海（左）と、氷の割れ目
    const sea = ctx.createLinearGradient(0, hz - u * 1, 0, hz + u * 3);
    sea.addColorStop(0, P.lit("#e6eef6", 0.5, 0.4)); sea.addColorStop(1, P.c("#b0bccc", 0.4));
    ctx.fillStyle = sea; ctx.beginPath(); ctx.moveTo(0, hz - u * 1.5); ctx.lineTo(w * 0.38, hz - u * 0.5); ctx.lineTo(w * 0.38, hz + u * 3); ctx.lineTo(0, hz + u * 3); ctx.fill();
    ctx.strokeStyle = rgba(P.dark("#5a6a7a", 0.4, 0.3), 0.5); ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) { const x = R() * w * 0.36; ctx.beginPath(); ctx.moveTo(x, hz - u * 1); ctx.lineTo(x + u * (2 + R() * 4), hz + u * 2.5); ctx.stroke(); }
    if (V.smoke) V.smoke(P, w * 0.12, hz - u * 1.5, u * 0.8, 0.7); // 帝都の煙
    cloudSea(P, hz + u * 3, 2);
    // 冠の内側の雪の床と、足跡
    const fl = ctx.createLinearGradient(0, hz + u * 10, 0, h);
    fl.addColorStop(0, P.lit("#f0f4f8", 0.1, 0.4)); fl.addColorStop(1, P.c("#a8b0c0"));
    ctx.fillStyle = fl; ctx.beginPath(); ctx.ellipse(w * 0.5, h + u * 2, w * 0.62, u * 18, 0, Math.PI, 0); ctx.fill();
    for (let i = 0; i < 8; i++) { ctx.fillStyle = rgba(P.dark("#8a94a6", 0, 0.3), 0.5); ctx.beginPath(); ctx.ellipse(w * (0.48 + (i % 2) * 0.025), h - u * (1 + i * 1.6), u * 0.5 * (1 - i * 0.07), u * 0.25, 0, 0, TAU); ctx.fill(); }
    for (let i = 0; i < 6; i++) tooth(P, w * (0.18 + i * 0.13), hz + u * 10, u * 2.2, u * (8 + R() * 7), (R() - 0.5) * u);
    tooth(P, w * 0.05, h, u * 11, h * 0.92, u * 2.4);
    tooth(P, w * 0.95, h, u * 13, h * 0.88, -u * 2.4);
    // 右の大きな歯の根もとの、凍った弁当箱
    ctx.fillStyle = P.c("#3a3a3e"); ctx.fillRect(w * 0.83, h - u * 3.4, u * 1.8, u * 1.1); ctx.fillStyle = P.lit("#e8eef4", 0, 0.3); ctx.fillRect(w * 0.83, h - u * 3.5, u * 1.8, u * 0.3);
    spindrift(P, hz + u * 6, 9);
    if (P.weather === "fog") driftMist(P, hz + u * 4, 5, 0.35);
  };
  OUT.w10_peak_drause.storm = true;

  // ---------------------------------------------------------------- 登っている段で絵を差し替える
  const STAGE_KEY = [null, "w10_pass", "w10_hut", "w10_ridge", null];
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
          const base = G.skyAt ? G.skyAt(S.loc, S.day) : null;
          const at = base && !base.still ? Object.assign({}, base, { weather: W.sky(S).weather || base.weather }) : opt.sky;
          opt = Object.assign({}, opt, { key, seed: S.loc + ":w10:" + n + ":" + key, sky: at });
        }
      }
    }
    return paint0(canvas, opt);
  };
})(globalThis.G = globalThis.G || {});
