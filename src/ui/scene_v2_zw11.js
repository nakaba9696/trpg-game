// 背景の絵（W11）：大きな迷宮の部屋ごとの背景と、最奥の特別な一枚。由来は docs/lore/dungeons.md
// 持ち主「景色が見たいわけではなく、冒険した先で絶景を見たいだけ。苦労して着いた所には手をかけた特別な一枚を」
//   部屋の種類（罠・宝・休み場・巣・階段・かけら・隠し部屋）は、迷宮ごとの色と小物で描き分ける（w11_<迷宮>_<種類>_in）。
//   最奥（deep）は迷宮ごとに一枚ずつ描きこむ：竜の骨の大広間・骨の玉座の大広間・光の糸の大聖堂の根・外海へ開いた大洞。
// どの絵を出すかは G.w11.sceneKind（エンジン。部屋に入るとその部屋、最奥は deep、通路は今までの迷宮の中の絵）。
// 持ち主の画像（assets/scenes/in_w11_<迷宮>_<種類>.webp。docs/art/scenes.json）があれば、そちらが敷かれる（scene_v3_photo.js）。レーン A（絵）
(function (G) {
  const V = G.SV2;
  if (!V) return;
  const { mix, rgba, clamp, lerp } = V;
  const IN = V.IN;
  const TAU = Math.PI * 2;

  const PAL = {
    graveyard: { cave: true, rock: "#5e5648", bone: "#e6dcc2", glow: "#8affc0", warm: "#ffb070", deepGlow: "#7affb0" },
    majincastle: { cave: false, stone: "#34303a", bone: "#c8bca4", glow: "#ff4a2a", warm: "#ff8a4a", metal: "#5a5a66" },
    w1_catacomb: { cave: false, stone: "#6a6458", bone: "#d8ccb0", glow: "#ffe2a0", warm: "#ffc070" },
    onigashima: { cave: true, rock: "#5a3a30", bone: "#d8ccb4", glow: "#ff6a2a", warm: "#ff8a3a", sea: "#3a7aa0" },
  };
  const KINDS = ["trap", "chest", "rest", "lair", "stairs", "lore", "vault"];

  // ---------------------------------------------------------------- 小物
  function base(P, p, o) {
    o = o || {};
    if (p.cave) { const c = V.cavern(P, { rock: p.rock, glow: o.glow }); return { vy: c.vy, floor: P.h * 0.78 }; }
    const c = V.corridor(P, { stone: p.stone, torches: o.torches || false, endGlow: o.glow, arches: true, depth: o.depth || 6 });
    return { vy: c.vy, floor: P.h * 0.8, box: c.box };
  }
  function bone(P, x, y, l, a, col) {
    const { ctx, u } = P;
    const dx = Math.cos(a) * l / 2, dy = Math.sin(a) * l / 2;
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, l * 0.14); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    ctx.fillStyle = col;
    for (const s of [-1, 1]) for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * dx + k * Math.sin(a) * l * 0.06, y + s * dy - k * Math.cos(a) * l * 0.06, l * 0.09, 0, TAU); ctx.fill(); }
    void u;
  }
  function bones(P, n, y0, col) {
    const { w, h, R } = P;
    for (let i = 0; i < n; i++) { const y = lerp(y0, h, Math.pow(R(), 0.7)), d = (y - y0) / (h - y0); bone(P, R() * w, y, P.u * (1.5 + d * 4), R() * 3, mix(col, "#000", 0.5 - d * 0.35)); }
  }
  function skull(P, x, y, s, col) {
    const { ctx } = P;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, s, Math.PI, 0); ctx.lineTo(x + s * 0.7, y + s * 0.7); ctx.lineTo(x - s * 0.7, y + s * 0.7); ctx.fill();
    ctx.fillStyle = "#120c08"; for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + k * s * 0.38, y + s * 0.05, s * 0.24, s * 0.28, 0, 0, TAU); ctx.fill(); }
    ctx.fillRect(x - s * 0.08, y + s * 0.35, s * 0.16, s * 0.2);
  }
  function chest(P, x, y, s, o) {
    const { ctx } = P;
    o = o || {};
    const wood = o.wood || "#6a4020", band = o.band || "#2a2420";
    V.light(P, x, y - s * 0.4, s * 5, o.gold || "#ffd070", 0.9, false);
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.ellipse(x, y + s * 0.05, s * 1.1, s * 0.22, 0, 0, TAU); ctx.fill();
    let g = ctx.createLinearGradient(x - s, 0, x + s, 0); g.addColorStop(0, mix(wood, "#000", 0.5)); g.addColorStop(0.4, wood); g.addColorStop(1, mix(wood, "#000", 0.6));
    ctx.fillStyle = g; ctx.fillRect(x - s, y - s * 0.7, s * 2, s * 0.7);
    ctx.beginPath(); ctx.moveTo(x - s, y - s * 0.7); ctx.quadraticCurveTo(x, y - s * 1.25, x + s, y - s * 0.7); ctx.fill();
    ctx.fillStyle = band; for (const k of [-0.7, 0, 0.7]) ctx.fillRect(x + k * s - s * 0.06, y - s * 0.98 + Math.abs(k) * s * 0.25, s * 0.12, s * 0.98 - Math.abs(k) * s * 0.25);
    ctx.fillStyle = o.lock || "#c8a040"; ctx.fillRect(x - s * 0.12, y - s * 0.62, s * 0.24, s * 0.22);
    if (o.open) { ctx.save(); ctx.globalCompositeOperation = "lighter"; const gg = ctx.createRadialGradient(x, y - s * 0.75, 0, x, y - s * 0.75, s * 1.4); gg.addColorStop(0, "rgba(255,220,120,.7)"); gg.addColorStop(1, "rgba(255,200,80,0)"); ctx.fillStyle = gg; ctx.fillRect(x - s * 1.5, y - s * 2.2, s * 3, s * 2); ctx.restore(); }
  }
  function fire(P, x, y, s, col) {
    const { ctx } = P;
    ctx.fillStyle = "#1a120c"; ctx.beginPath(); ctx.ellipse(x, y, s * 1.4, s * 0.35, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; ctx.fillStyle = "#4a4440"; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * s * 1.2, y + Math.sin(a) * s * 0.3, s * 0.3, s * 0.18, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = "#3a2414"; ctx.lineWidth = s * 0.18; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - s * 0.7, y + s * 0.1); ctx.lineTo(x + s * 0.6, y - s * 0.2); ctx.moveTo(x + s * 0.7, y + s * 0.1); ctx.lineTo(x - s * 0.6, y - s * 0.2); ctx.stroke();
    V.light(P, x, y - s * 0.6, s * 14, col || "#ff9a3a", 1.4, true);
    P.anim.push({ type: "flame", x, y: y - s * 0.1, s: s * 1.3, col: col || "#ff9a3a" });
  }
  function eyes(P, n, x0, x1, y0, y1, col) {
    const { R, u } = P;
    const list = Array.from({ length: n }, () => [lerp(x0, x1, R()), lerp(y0, y1, R()), u * (0.25 + R() * 0.35), R()]);
    P.anim.push({ draw: (c, t) => { for (const [x, y, s, ph] of list) { const open = ((t * 0.25 + ph) % 1) < 0.94; if (!open) continue; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = s * 6; for (const k of [-1, 1]) { c.beginPath(); c.ellipse(x + k * s * 2.2, y, s, s * 0.6, 0, 0, TAU); c.fill(); } c.shadowBlur = 0; } } });
  }
  function stairs(P, x, y, s, col) {
    const { ctx } = P;
    // 床に開いた四角い穴と、下へ降りる段。下から冷たい光
    ctx.fillStyle = "#040406"; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.7, y - s * 0.35); ctx.lineTo(x - s * 0.7, y - s * 0.35); ctx.fill();
    for (let i = 0; i < 6; i++) { const t = i / 6, yy = lerp(y - s * 0.35, y, t), ww = lerp(s * 0.7, s, t); ctx.fillStyle = mix(col, "#000", 0.85 - t * 0.5); ctx.fillRect(x - ww * 0.8, yy, ww * 1.6, s * 0.04); }
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(0, y - s * 2, 0, y); g.addColorStop(0, "rgba(120,170,255,0)"); g.addColorStop(1, "rgba(120,170,255,.35)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * 0.7, y - s * 0.35); ctx.lineTo(x + s * 0.7, y - s * 0.35); ctx.lineTo(x + s * 0.4, y - s * 2.2); ctx.lineTo(x - s * 0.4, y - s * 2.2); ctx.fill(); ctx.restore();
    V.light(P, x, y - s * 0.3, s * 3, "#7aa8ff", 0.7, false);
  }
  function glyphs(P, x, y, ww, hh, col, rows) {
    const { ctx, R } = P;
    ctx.fillStyle = col;
    const n = rows || 6;
    for (let r = 0; r < n; r++) for (let k = 0; k < 12; k++) {
      if (R() < 0.15) continue;
      const gx = x + (k / 12) * ww, gy = y + (r / n) * hh, s = ww / 18;
      if (R() < 0.5) ctx.fillRect(gx, gy, s * 0.8, s * 0.18); else { ctx.fillRect(gx + s * 0.3, gy - s * 0.3, s * 0.16, s * 0.8); if (R() < 0.5) ctx.fillRect(gx, gy, s * 0.7, s * 0.14); }
    }
  }
  function dust(P, n, col) {
    const { w, h, R } = P;
    const ps = Array.from({ length: n }, () => [R() * w, R() * h, R(), 0.5 + R()]);
    P.anim.push({ draw: (c, t) => { for (const [x, y, ph, s] of ps) { const k = (t * 0.03 * s + ph) % 1; c.fillStyle = rgba(col, 0.5 * Math.sin(k * Math.PI)); c.beginPath(); c.arc(x + Math.sin((t + ph * 9) * 0.4) * 6, y - k * h * 0.15, s * 1.1, 0, TAU); c.fill(); } } });
  }
  function rays(P, x, top, w0, w1, col, a) {
    const { ctx, h } = P;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(0, top, 0, h); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0.02));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w0, top); ctx.lineTo(x + w0, top); ctx.lineTo(x + w1, h); ctx.lineTo(x - w1, h); ctx.fill(); ctx.restore();
  }

  // ---------------------------------------------------------------- 迷宮ごとの小物（種類ごと）
  const MOTIF = {
    graveyard: {
      trap: (P, p, b) => { // 裂け目に渡した肋骨の橋
        const { ctx, w, h } = P;
        ctx.fillStyle = "#020202"; ctx.beginPath(); ctx.moveTo(0, h * 0.82); ctx.lineTo(w, h * 0.78); ctx.lineTo(w, h * 0.9); ctx.lineTo(0, h * 0.95); ctx.fill();
        ctx.strokeStyle = p.bone; ctx.lineWidth = P.u * 1.6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(w * 0.2, h); ctx.quadraticCurveTo(w * 0.45, h * 0.78, w * 0.62, b.vy + h * 0.12); ctx.stroke();
        ctx.strokeStyle = "#1a1410"; ctx.lineWidth = P.u * 0.3; ctx.beginPath(); ctx.moveTo(w * 0.42, h * 0.84); ctx.lineTo(w * 0.45, h * 0.81); ctx.stroke();
        for (let i = 0; i < 5; i++) skull(P, w * (0.1 + i * 0.2), h * (0.08 + (i % 2) * 0.05), P.u * 1.2, mix(p.bone, "#000", 0.3));
      },
      chest: (P, p) => { dragon(P, P.w * 0.62, P.h * 0.86, P.h * 0.32, -1, mix(p.bone, "#000", 0.35)); bones(P, 10, P.h * 0.82, p.bone); },
      rest: (P, p) => { // 石の見張り小屋の壁
        const { ctx, w, h } = P;
        for (const [x0, x1] of [[0, w * 0.22], [w * 0.78, w]]) { ctx.fillStyle = mix("#7a7262", "#000", 0.45); ctx.fillRect(x0, h * 0.45, x1 - x0, h * 0.55); ctx.strokeStyle = "rgba(0,0,0,.5)"; for (let y = h * 0.5; y < h; y += h * 0.06) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); } }
        glyphs(P, w * 0.82, h * 0.52, w * 0.14, h * 0.2, "rgba(30,24,18,.6)", 4);
        void p;
      },
      lair: (P, p) => { dragon(P, P.cx, P.h * 0.84, P.h * 0.38, 1, mix(p.bone, "#000", 0.45)); bones(P, 12, P.h * 0.82, p.bone); },
      lore: (P, p) => { for (let i = 0; i < 7; i++) { const x = P.w * (0.12 + i * 0.13), s = P.h * (0.18 + (i % 3) * 0.05); P.ctx.fillStyle = mix(p.bone, "#000", 0.2 + (i % 2) * 0.15); P.ctx.fillRect(x - P.u * 0.6, P.h * 0.92 - s, P.u * 1.2, s); glyphs(P, x - P.u * 0.4, P.h * 0.92 - s * 0.9, P.u * 0.8, s * 0.7, "rgba(40,30,20,.7)", 6); } },
      vault: (P, p) => { const { ctx, w, h } = P; ctx.fillStyle = "#3a2a1a"; for (let r = 0; r < 2; r++) ctx.fillRect(w * 0.2, h * (0.34 + r * 0.16), w * 0.6, h * 0.015); for (let i = 0; i < 10; i++) { const x = w * (0.24 + (i % 5) * 0.12), y = h * (0.34 + Math.floor(i / 5) * 0.16); if (i % 3 === 0) skull(P, x, y - P.u * 1.6, P.u * 1.6, mix(p.bone, "#000", 0.25)); else bone(P, x, y - P.u * 0.8, P.u * 5, 0.05, mix(p.bone, "#000", 0.3)); } },
    },
    majincastle: {
      trap: (P) => { const { ctx, w, h } = P; for (let i = 0; i < 5; i++) { const x = w * (0.15 + i * 0.18), y = h * (0.05 + (i % 2) * 0.03); ctx.fillStyle = "#0a0808"; ctx.fillRect(x - w * 0.05, y, w * 0.1, h * 0.05); ctx.strokeStyle = "#5a5a66"; ctx.strokeRect(x - w * 0.05, y, w * 0.1, h * 0.05); } for (let i = 0; i < 9; i++) { const x = w * (0.1 + i * 0.1), y = h * (0.86 + (i % 2) * 0.04); ctx.fillStyle = "#9a9ca8"; ctx.beginPath(); ctx.moveTo(x - P.u * 0.4, y); ctx.lineTo(x, y - P.u * 4); ctx.lineTo(x + P.u * 0.4, y); ctx.fill(); } },
      chest: (P) => { const { ctx, w, h } = P; for (let i = 0; i < 4; i++) { ctx.fillStyle = "#e8e0cc"; ctx.fillRect(w * (0.2 + i * 0.18), h * 0.35, w * 0.06, h * 0.08); } V.banner(P, w * 0.08, h * 0.08, w * 0.07, h * 0.3, "#5a1010", "#1a0a0a"); V.banner(P, w * 0.85, h * 0.08, w * 0.07, h * 0.3, "#5a1010", "#1a0a0a"); },
      rest: (P) => { const { ctx, w, h } = P; ctx.fillStyle = "#4a3a2a"; ctx.fillRect(w * 0.6, h * 0.72, w * 0.28, h * 0.08); ctx.fillStyle = "#c8c0b0"; ctx.fillRect(w * 0.6, h * 0.7, w * 0.28, h * 0.03); V.table(P, w * 0.3, h * 0.84, w * 0.12); ctx.fillStyle = "#8a5a2a"; ctx.beginPath(); ctx.ellipse(w * 0.3, h * 0.8, w * 0.03, h * 0.015, 0, 0, TAU); ctx.fill(); V.barrel(P, w * 0.15, h * 0.92, P.u * 6); },
      lair: (P, p) => { const { w, h } = P; for (let i = 0; i < 7; i++) armor(P, w * (0.08 + i * 0.14), h * (0.9 + (i % 2) * 0.03), h * 0.32, p); },
      lore: (P) => { const { ctx, w, h } = P; ctx.save(); ctx.translate(w / 2, h * 0.16); ctx.scale(1, -1); for (let i = 0; i < 14; i++) { const x = (i - 7) * w * 0.06; ctx.fillStyle = "rgba(160,150,140,.5)"; ctx.beginPath(); ctx.arc(x, 0, w * 0.012, 0, TAU); ctx.fill(); ctx.fillRect(x - w * 0.012, w * 0.012, w * 0.024, w * 0.03); } ctx.fillStyle = "rgba(170,160,150,.55)"; ctx.fillRect(w * 0.36, -h * 0.02, w * 0.1, h * 0.12); ctx.fillStyle = "rgba(20,16,14,.8)"; ctx.beginPath(); ctx.arc(w * 0.41, h * 0.11, w * 0.025, 0, TAU); ctx.fill(); ctx.restore(); },
      vault: (P) => { V.weaponRack(P, P.w * 0.3, P.h * 0.82, P.u * 10); V.weaponRack(P, P.w * 0.7, P.h * 0.82, P.u * 10); },
    },
    w1_catacomb: {
      trap: (P) => { const { ctx, w, h } = P; for (let i = 0; i < 4; i++) { const x = w * (0.18 + i * 0.21), y = h * (0.22 + (i % 2) * 0.06); ctx.strokeStyle = "#2a2018"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = "#8a6a2a"; ctx.beginPath(); ctx.arc(x, y + P.u, P.u * 1.4, 0, TAU); ctx.fill(); V.light(P, x, y + P.u, P.u * 6, "#ffb060", 0.5, true); } for (let i = 0; i < 3; i++) V.fogBand(P, h * (0.78 + i * 0.07), h * 0.06, 0.3, "#c8bca8"); },
      chest: (P, p) => { const { ctx, w, h } = P; for (const x of [w * 0.12, w * 0.88]) { ctx.fillStyle = mix(p.stone, "#000", 0.3); ctx.fillRect(x - w * 0.08, h * 0.74, w * 0.16, h * 0.14); ctx.fillStyle = mix(p.stone, "#fff", 0.08); ctx.fillRect(x - w * 0.085, h * 0.72, w * 0.17, h * 0.03); } },
      rest: (P) => { const { ctx, w, h } = P; ctx.fillStyle = "#5a5248"; ctx.fillRect(w * 0.4, h * 0.66, w * 0.2, h * 0.14); ctx.fillStyle = "#e8e0d0"; ctx.fillRect(w * 0.39, h * 0.64, w * 0.22, h * 0.025); for (let i = 0; i < 3; i++) V.candle(P, w * (0.44 + i * 0.06), h * 0.6, P.u * 1.6); ctx.fillStyle = "#3a2a28"; ctx.beginPath(); ctx.ellipse(w * 0.72, h * 0.84, w * 0.05, h * 0.02, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#7a2a2a"; ctx.beginPath(); ctx.ellipse(w * 0.72, h * 0.835, w * 0.04, h * 0.012, 0, 0, TAU); ctx.fill(); },
      lair: (P, p) => { const { w, h } = P; for (let i = 0; i < 9; i++) kneel(P, w * (0.08 + i * 0.105), h * (0.88 + (i % 2) * 0.04), h * 0.12, p); threads(P, 9, w * 0.08, w * 0.105, h * 0.88 - h * 0.1); },
      lore: (P, p) => { const { w, h } = P; glyphs(P, w * 0.28, h * 0.3, w * 0.44, h * 0.3, "rgba(30,20,14,.65)", 7); for (let i = 0; i < 6; i++) skull(P, w * (0.1 + i * 0.16), h * 0.86, P.u * 1.8, mix(p.bone, "#000", 0.3)); },
      vault: (P, p) => { for (let i = 0; i < 8; i++) skull(P, P.w * (0.2 + (i % 4) * 0.2), P.h * (0.4 + Math.floor(i / 4) * 0.12), P.u * 2, mix(p.bone, "#000", 0.2)); },
    },
    onigashima: {
      trap: (P) => { const { ctx, w, h } = P; ctx.fillStyle = "#a08a50"; ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.95); ctx.lineTo(w * 0.7, h * 0.95); ctx.lineTo(w * 0.6, h * 0.78); ctx.lineTo(w * 0.4, h * 0.78); ctx.fill(); ctx.strokeStyle = "rgba(60,40,20,.5)"; for (let i = 0; i < 12; i++) { const t = i / 12; ctx.beginPath(); ctx.moveTo(lerp(w * 0.3, w * 0.7, t), h * 0.95); ctx.lineTo(lerp(w * 0.4, w * 0.6, t), h * 0.78); ctx.stroke(); } ctx.strokeStyle = "#6a5030"; ctx.lineWidth = P.u * 0.5; ctx.beginPath(); ctx.moveTo(w * 0.78, 0); ctx.lineTo(w * 0.78, h * 0.35); ctx.stroke(); ctx.fillStyle = "#2a2220"; ctx.fillRect(w * 0.76, h * 0.12, w * 0.04, h * 0.16); ctx.fillStyle = "#c8b48a"; ctx.fillRect(w * 0.18, h * 0.66, w * 0.05, h * 0.12); },
      chest: (P) => { V.barrel(P, P.w * 0.14, P.h * 0.94, P.u * 9); V.barrel(P, P.w * 0.86, P.h * 0.95, P.u * 9); V.barrel(P, P.w * 0.76, P.h * 0.97, P.u * 6); },
      rest: (P) => { const { ctx, w, h } = P; ctx.fillStyle = "#a01e14"; ctx.beginPath(); ctx.ellipse(w * 0.7, h * 0.88, P.u * 8, P.u * 2, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#c8a040"; ctx.beginPath(); ctx.ellipse(w * 0.7, h * 0.88, P.u * 8, P.u * 1.4, 0, 0, TAU); ctx.fill(); V.barrel(P, w * 0.2, h * 0.95, P.u * 8); },
      lair: (P, p) => { bones(P, 14, P.h * 0.8, p.bone); for (let i = 0; i < 3; i++) V.lantern && V.lantern(P, P.w * (0.25 + i * 0.25), P.h * 0.2, P.u * 2, { always: true }); },
      lore: (P) => { const { ctx, w, h } = P; ctx.fillStyle = mix("#5a3a30", "#000", 0.3); ctx.fillRect(w * 0.15, h * 0.22, w * 0.7, h * 0.48); glyphs(P, w * 0.2, h * 0.28, w * 0.6, h * 0.36, "rgba(230,200,160,.35)", 7); for (let i = 0; i < 7; i++) { ctx.strokeStyle = "#8a8a90"; ctx.lineWidth = P.u * 0.3; ctx.beginPath(); ctx.moveTo(w * (0.1 + i * 0.04), h); ctx.lineTo(w * (0.12 + i * 0.04), h * 0.76); ctx.stroke(); } },
      vault: (P) => { const { ctx, w, h } = P; ctx.fillStyle = "#6a6a70"; ctx.fillRect(w * 0.45, h * 0.66, w * 0.1, h * 0.012); ctx.fillStyle = "#2a1a10"; ctx.fillRect(w * 0.47, h * 0.672, w * 0.06, h * 0.03); },
    },
  };
  // 眠る竜の骨格（首を丸めて伏せた形）：背骨・肋骨・長い頭骨。dir は頭の向き
  function dragon(P, x, b, s, dir, col) {
    const { ctx } = P;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round";
    // 背骨（尾から首へ弧を描く）
    const pts = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([x - dir * s * (1.6 - t * 2.4), b - s * (0.15 + Math.sin(t * Math.PI) * 0.55) + (t > 0.8 ? (t - 0.8) * s * 1.5 : 0)]); }
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
    // 肋骨（胴のところだけ、背骨から地面へ）
    ctx.lineWidth = Math.max(1, s * 0.03);
    for (let i = 6; i <= 14; i++) { const [px, py] = pts[i], l = s * (0.55 - Math.abs(i - 10) * 0.04); for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + k * s * 0.22, py + l * 0.5, px + k * s * 0.08, b); ctx.stroke(); } }
    // 背の棘
    for (let i = 2; i < 18; i += 2) { const [px, py] = pts[i]; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - dir * s * 0.03, py - s * 0.09); ctx.stroke(); }
    // 頭骨（長い鼻先・眼窩・牙）
    const [hx, hy] = pts[20];
    ctx.save(); ctx.translate(hx, hy); ctx.scale(dir, 1);
    ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.12); ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s * 0.5, -s * 0.06); ctx.lineTo(s * 0.52, s * 0.02); ctx.lineTo(s * 0.05, s * 0.08); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.05, s * 0.1); ctx.lineTo(s * 0.46, s * 0.08); ctx.lineTo(s * 0.44, s * 0.13); ctx.lineTo(s * 0.06, s * 0.16); ctx.fill();
    ctx.fillStyle = "#0a0a0a"; ctx.beginPath(); ctx.ellipse(s * 0.12, -s * 0.07, s * 0.05, s * 0.035, -0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.42, -s * 0.03, s * 0.02, s * 0.012, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, s * 0.02); ctx.beginPath(); ctx.moveTo(-s * 0.02, -s * 0.12); ctx.quadraticCurveTo(-s * 0.2, -s * 0.3, -s * 0.12, -s * 0.38); ctx.stroke();
    ctx.fillStyle = col; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(s * (0.12 + k * 0.07), s * 0.03); ctx.lineTo(s * (0.14 + k * 0.07), s * 0.09); ctx.lineTo(s * (0.16 + k * 0.07), s * 0.03); ctx.fill(); }
    ctx.restore();
    // 翼の骨（畳んだ指の骨）
    const [wx, wy] = pts[9];
    ctx.lineWidth = Math.max(1, s * 0.025);
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx - dir * s * (0.3 + k * 0.15), wy - s * (0.35 - k * 0.05)); ctx.lineTo(wx - dir * s * (0.5 + k * 0.2), b - s * 0.02); ctx.stroke(); }
  }
  function armor(P, x, b, s, p) {
    const { ctx } = P;
    const m = p.metal || "#4a4a54";
    ctx.fillStyle = mix(m, "#000", 0.35); ctx.fillRect(x - s * 0.12, b - s * 0.45, s * 0.07, s * 0.45); ctx.fillRect(x + s * 0.05, b - s * 0.45, s * 0.07, s * 0.45);
    const g = ctx.createLinearGradient(x - s * 0.2, 0, x + s * 0.2, 0); g.addColorStop(0, mix(m, "#000", 0.5)); g.addColorStop(0.45, mix(m, "#fff", 0.15)); g.addColorStop(1, mix(m, "#000", 0.6));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * 0.2, b - s * 0.45); ctx.lineTo(x - s * 0.24, b - s * 0.85); ctx.lineTo(x + s * 0.24, b - s * 0.85); ctx.lineTo(x + s * 0.2, b - s * 0.45); ctx.fill();
    ctx.beginPath(); ctx.arc(x, b - s * 0.95, s * 0.11, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e8e0cc"; ctx.fillRect(x - s * 0.1, b - s * 0.72, s * 0.2, s * 0.03);
  }
  function kneel(P, x, b, s, p) {
    const { ctx } = P;
    ctx.fillStyle = mix(p.bone, "#000", 0.55);
    ctx.beginPath(); ctx.moveTo(x - s * 0.35, b); ctx.quadraticCurveTo(x - s * 0.4, b - s * 0.6, x - s * 0.05, b - s * 0.75); ctx.lineTo(x + s * 0.2, b - s * 0.6); ctx.quadraticCurveTo(x + s * 0.4, b - s * 0.2, x + s * 0.35, b); ctx.fill();
    ctx.beginPath(); ctx.arc(x, b - s * 0.88, s * 0.14, 0, TAU); ctx.fill();
  }
  // 光の糸（首筋から天井へ）
  function threads(P, n, x0, dx, y0) {
    const list = Array.from({ length: n }, (_, i) => [x0 + i * dx, y0, P.R()]);
    P.ctx.save(); P.ctx.globalCompositeOperation = "lighter";
    for (const [x, y] of list) { const g = P.ctx.createLinearGradient(0, y, 0, 0); g.addColorStop(0, "rgba(255,230,160,.6)"); g.addColorStop(1, "rgba(255,230,160,0)"); P.ctx.strokeStyle = g; P.ctx.lineWidth = 1.2; P.ctx.beginPath(); P.ctx.moveTo(x, y); P.ctx.quadraticCurveTo(x + P.u * 2, y * 0.5, x + P.u, 0); P.ctx.stroke(); }
    P.ctx.restore();
  }

  // ---------------------------------------------------------------- 種類ごとの絵（どの迷宮でも同じ組み立て。色と小物が迷宮ごと）
  const KIND = {
    trap: (P, p) => { const b = base(P, p, { torches: !p.cave }); MOTIF_of(P, p, "trap", b); V.dim(P, 0.55); },
    chest: (P, p) => { const b = base(P, p, {}); MOTIF_of(P, p, "chest", b); chest(P, P.cx, P.h * 0.86, P.u * 7, { wood: p.cave ? "#5a3a1e" : "#4a3020" }); V.torch(P, P.w * 0.18, P.h * 0.5, P.u * 1.8, { col: p.warm }); V.dim(P, 0.5); },
    rest: (P, p) => { const b = base(P, p, {}); MOTIF_of(P, p, "rest", b); fire(P, P.cx - P.w * 0.05, P.h * 0.88, P.u * 3.2, p.warm); dust(P, 20, "#ffd0a0"); V.dim(P, 0.4); },
    lair: (P, p) => { const b = base(P, p, { glow: p.cave ? mix(p.glow, "#000", 0.4) : null }); MOTIF_of(P, p, "lair", b); eyes(P, 10, P.w * 0.1, P.w * 0.9, b.vy - P.h * 0.08, b.vy + P.h * 0.18, p.cave ? "#ffd040" : "#ff5040"); V.dim(P, 0.6); },
    stairs: (P, p) => { const b = base(P, p, { torches: !p.cave }); stairs(P, P.cx, P.h * 0.92, P.w * 0.2, p.cave ? p.rock : p.stone); V.dim(P, 0.45); void b; },
    lore: (P, p) => { const b = base(P, p, {}); MOTIF_of(P, p, "lore", b); V.torch(P, P.w * 0.12, P.h * 0.48, P.u * 1.6, { col: p.warm }); V.light(P, P.cx, P.h * 0.45, P.w * 0.35, p.warm, 0.5, false); V.dim(P, 0.5); },
    vault: (P, p) => {
      const r = V.room(P, { wall: p.cave ? p.rock : p.stone, floor: mix(p.cave ? p.rock : p.stone, "#000", 0.3), tex: "stone", floorTex: "stone", backY: P.h * 0.14, backH: P.h * 0.56, amb: 0.4 });
      MOTIF_of(P, p, "vault", { vy: r.b, floor: r.b });
      chest(P, P.cx, P.h * 0.9, P.u * 8, { open: true, wood: "#5a3418", gold: "#ffe090" });
      for (let i = 0; i < 26; i++) { const x = P.cx + (P.R() - 0.5) * P.w * 0.4, y = P.h * (0.88 + P.R() * 0.1); P.ctx.fillStyle = ["#ffd860", "#e8c040", "#fff0a0"][i % 3]; P.ctx.beginPath(); P.ctx.ellipse(x, y, P.u * 0.7, P.u * 0.3, 0, 0, TAU); P.ctx.fill(); }
      rays(P, P.cx, 0, P.w * 0.03, P.w * 0.15, "#fff0c0", 0.25);
      dust(P, 30, "#fff0c0");
      V.dim(P, 0.45);
    },
  };
  function MOTIF_of(P, p, kind, b) { const f = MOTIF[p.id] && MOTIF[p.id][kind]; if (f) f(P, p, b); }

  // ---------------------------------------------------------------- 最奥の特別な一枚
  const DEEP = {
    // 竜の骨の大広間：丸く抉れた谷の底。眠る竜の骨格がいくつも輪になり、天井の裂け目から一筋の光、真ん中の緑の燐火
    graveyard: (P, p) => {
      const { ctx, w, h, R, u } = P;
      let g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#07090c"); g.addColorStop(0.5, "#182024"); g.addColorStop(1, "#0a0c0a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // 抉れた岩壁（奥ほど明るく霞む）
      for (let i = 0; i < 5; i++) {
        const t = i / 4, y0 = h * (0.2 + t * 0.12);
        ctx.fillStyle = mix("#2e3430", "#000", 0.1 + t * 0.55);
        ctx.beginPath(); ctx.moveTo(0, h);
        for (let k = 0; k <= 24; k++) { const x = (k / 24) * w, bowl = Math.pow(Math.abs(k / 24 - 0.5) * 2, 2); ctx.lineTo(x, y0 + (1 - bowl) * h * 0.18 + (R() - 0.5) * h * 0.03 - bowl * h * 0.15); }
        ctx.lineTo(w, h); ctx.fill();
      }
      // 天井の裂け目と一筋の光
      rays(P, w * 0.52, 0, w * 0.02, w * 0.13, "#d8e4ff", 0.34);
      ctx.fillStyle = "rgba(220,232,255,.9)"; ctx.beginPath(); ctx.moveTo(w * 0.49, 0); ctx.lineTo(w * 0.55, 0); ctx.lineTo(w * 0.525, h * 0.012); ctx.fill();
      // 眠る竜の骨格（奥から手前へ）
      const dragons = [[0.22, 0.6, 0.55, 1], [0.78, 0.6, 0.55, -1], [0.36, 0.66, 0.75, -1], [0.66, 0.67, 0.8, 1], [0.08, 0.8, 1.25, 1], [0.95, 0.82, 1.3, -1]];
      for (const [fx, fy, sc, dir] of dragons) dragon(P, w * fx, h * fy, h * 0.22 * sc, dir, mix(p.bone, "#10181a", clamp(1.05 - sc * 0.75, 0.1, 0.75)));
      // 真ん中の緑の燐火
      const fx = w / 2, fy = h * 0.76;
      ctx.fillStyle = "#101a14"; ctx.beginPath(); ctx.ellipse(fx, fy + u, w * 0.09, h * 0.022, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; bone(P, fx + Math.cos(a) * w * 0.07, fy + Math.sin(a) * h * 0.015, u * 2.4, a + 1.2, mix(p.bone, "#000", 0.35)); }
      V.light(P, fx, fy - u * 2, w * 0.38, p.deepGlow, 1.5, true);
      P.anim.push({ type: "flame", x: fx, y: fy, s: u * 4.5, col: p.deepGlow });
      for (let i = 0; i < 3; i++) V.fogBand(P, h * (0.7 + i * 0.09), h * 0.05, 0.16, "#8ab0a0");
      const sp = Array.from({ length: 50 }, () => [fx + (R() - 0.5) * w * 0.6, R(), 0.5 + R()]);
      P.anim.push({ draw: (c, t) => { for (const [x, ph, s] of sp) { const k = (t * 0.05 * s + ph) % 1; c.fillStyle = `rgba(140,255,190,${0.7 * Math.sin(k * Math.PI)})`; c.beginPath(); c.arc(x + Math.sin(t * 0.7 + ph * 10) * 8, fy - k * h * 0.65, s * 1.2, 0, TAU); c.fill(); } } });
      dust(P, 30, "#dfe8ff");
      V.dim(P, 0.35);
    },
    // 骨の玉座の大広間：骨の柱が天へ。壁の裂け目から使徒領の赤い空と山並み。大小二つの椅子
    majincastle: (P, p) => {
      const { ctx, w, h, u } = P;
      const r = V.room(P, { wall: "#2a2630", floor: "#1e1a20", tex: "stone", floorTex: "stone", backY: h * 0.04, backH: h * 0.62, amb: 0.35 });
      // 裂け目の向こうの赤い空と山
      const bx = P.cx - r.w * 0.22, bw = r.w * 0.44, by = r.y + r.h * 0.05, bh = r.h * 0.7;
      ctx.save(); ctx.beginPath(); ctx.moveTo(bx + bw * 0.3, by); ctx.lineTo(bx + bw * 0.62, by + bh * 0.02); ctx.lineTo(bx + bw, by + bh * 0.5); ctx.lineTo(bx + bw * 0.85, by + bh); ctx.lineTo(bx + bw * 0.1, by + bh); ctx.lineTo(bx, by + bh * 0.45); ctx.closePath(); ctx.clip();
      let g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, "#2a0806"); g.addColorStop(0.55, "#a02a14"); g.addColorStop(1, "#ff8a3a");
      ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = "#f8d8a0"; ctx.beginPath(); ctx.arc(bx + bw * 0.6, by + bh * 0.72, bw * 0.06, 0, TAU); ctx.fill();
      for (let k = 0; k < 3; k++) { ctx.fillStyle = mix("#3a0c0a", "#000", k * 0.3); ctx.beginPath(); ctx.moveTo(bx, by + bh); for (let i = 0; i <= 10; i++) ctx.lineTo(bx + bw * i / 10, by + bh * (0.62 + k * 0.1) - Math.abs(Math.sin(i * 1.7 + k)) * bh * 0.18); ctx.lineTo(bx + bw, by + bh); ctx.fill(); }
      ctx.restore();
      V.light(P, bx + bw * 0.5, by + bh * 0.8, w * 0.6, "#ff6a2a", 1.1, false);
      // 骨の柱
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
        const t = i / 4, x = lerp(s < 0 ? w * 0.06 : w * 0.94, s < 0 ? r.x + r.w * 0.06 : r.x + r.w * 0.94, t), cw = lerp(w * 0.07, r.w * 0.04, t);
        const gg = ctx.createLinearGradient(x - cw, 0, x + cw, 0); gg.addColorStop(0, mix(p.bone, "#000", 0.75)); gg.addColorStop(0.4, mix(p.bone, "#000", 0.3)); gg.addColorStop(1, mix(p.bone, "#000", 0.8));
        ctx.fillStyle = gg; ctx.fillRect(x - cw / 2, 0, cw, lerp(h, r.b, t));
        for (let k = 0; k < 8; k++) { ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(x - cw / 2, (k + 0.5) * lerp(h, r.b, t) / 8, cw, u * 0.4); }
      }
      // 赤い敷物（玉座へ）
      ctx.fillStyle = "rgba(110,16,12,.75)"; ctx.beginPath(); ctx.moveTo(P.cx - r.w * 0.06, r.b); ctx.lineTo(P.cx + r.w * 0.16, r.b); ctx.lineTo(P.cx + w * 0.16, h); ctx.lineTo(P.cx - w * 0.22, h); ctx.fill();
      // 骨のアーチ（天井）
      ctx.strokeStyle = mix(p.bone, "#000", 0.55); ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) { const t = i / 4, x0 = lerp(0, r.x, t), x1 = lerp(w, r.x + r.w, t), y = lerp(h * 0.02, r.y, t); ctx.lineWidth = lerp(u * 2, u * 0.7, t); ctx.beginPath(); ctx.moveTo(x0, y + h * 0.25 * (1 - t)); ctx.quadraticCurveTo((x0 + x1) / 2, y - h * 0.06, x1, y + h * 0.25 * (1 - t)); ctx.stroke(); for (let k = 1; k < 8; k++) { const xx = lerp(x0, x1, k / 8); ctx.lineWidth = lerp(u * 0.6, u * 0.25, t); ctx.beginPath(); ctx.moveTo(xx, y + h * 0.02); ctx.lineTo(xx, y + h * (0.06 - t * 0.03)); ctx.stroke(); } }
      // 大小二つの椅子（向かい合う）：裂け目の光を背にした骨の玉座と、手前の小さな椅子（背中が見える）
      const tb = r.b + (h - r.b) * 0.12, tw = r.w * 0.2, th = r.h * 0.8;
      ctx.fillStyle = "#0c080a";
      ctx.beginPath(); ctx.moveTo(P.cx - tw / 2, tb); ctx.lineTo(P.cx - tw / 2, tb - th * 0.35); ctx.lineTo(P.cx - tw * 0.38, tb - th * 0.35); ctx.lineTo(P.cx - tw * 0.36, tb - th);
      for (let k = 0; k <= 8; k++) { const x = lerp(P.cx - tw * 0.36, P.cx + tw * 0.36, k / 8); ctx.lineTo(x, tb - th - (k % 2 ? th * 0.04 : th * (0.12 + (4 - Math.abs(k - 4)) * 0.035))); }
      ctx.lineTo(P.cx + tw * 0.36, tb - th); ctx.lineTo(P.cx + tw * 0.38, tb - th * 0.35); ctx.lineTo(P.cx + tw / 2, tb - th * 0.35); ctx.lineTo(P.cx + tw / 2, tb); ctx.fill();
      ctx.fillStyle = "rgba(255,120,60,.35)"; ctx.fillRect(P.cx - tw / 2, tb - th * 0.36, tw, th * 0.015);
      for (const k of [-1, 1]) { ctx.fillStyle = mix(p.bone, "#000", 0.6); ctx.beginPath(); ctx.arc(P.cx + k * tw * 0.47, tb - th * 0.38, tw * 0.05, 0, TAU); ctx.fill(); }
      // 段
      for (let i = 0; i < 3; i++) { ctx.fillStyle = mix("#2a2228", "#000", 0.2 + i * 0.1); ctx.fillRect(P.cx - tw * (0.75 + i * 0.12), tb + i * r.h * 0.03, tw * (1.5 + i * 0.24), r.h * 0.03); }
      // 手前の小さな椅子
      const cb = h * 0.93, cw2 = w * 0.06, ch2 = h * 0.16;
      ctx.fillStyle = "#2a1a12"; ctx.fillRect(P.cx - cw2 / 2, cb - ch2, cw2 * 0.12, ch2); ctx.fillRect(P.cx + cw2 * 0.38, cb - ch2, cw2 * 0.12, ch2);
      ctx.fillRect(P.cx - cw2 / 2, cb - ch2, cw2, ch2 * 0.12); ctx.fillRect(P.cx - cw2 / 2, cb - ch2 * 0.6, cw2, ch2 * 0.08);
      ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(P.cx, cb, cw2 * 0.8, h * 0.012, 0, 0, TAU); ctx.fill();
      V.torch(P, r.x + r.w * 0.1, r.y + r.h * 0.5, u * 2, { col: "#ff5a2a" }); V.torch(P, r.x + r.w * 0.9, r.y + r.h * 0.5, u * 2, { col: "#ff5a2a" });
      dust(P, 30, "#ffb080");
      V.dim(P, 0.4);
    },
    // 光の糸の大聖堂の根：祭壇の真下の大空洞。跪く無数の骨、天井へ吸いこまれる光の糸が星空のよう
    w1_catacomb: (P, p) => {
      const { ctx, w, h, R, u } = P;
      let g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#06060c"); g.addColorStop(0.5, "#141420"); g.addColorStop(1, "#0a0806");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // 天井の星（糸の吸いこまれる所）
      const stars = Array.from({ length: 160 }, () => [R() * w, Math.pow(R(), 1.6) * h * 0.35, R(), 0.4 + R() * 1.2]);
      // 大聖堂の基礎（上に見える巨大な石の梁）
      ctx.fillStyle = "#1a1820"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h * 0.06); ctx.quadraticCurveTo(w / 2, h * 0.16, 0, h * 0.06); ctx.fill();
      // 跪く骨の列（奥へ）
      const rows = [];
      for (let r = 0; r < 8; r++) { const t = r / 7, y = lerp(h * 0.58, h * 0.98, Math.pow(t, 1.4)), s = lerp(u * 1.6, u * 9, Math.pow(t, 1.5)), n = Math.round(lerp(40, 9, t)); for (let i = 0; i < n; i++) rows.push([(i + 0.5 + (r % 2) * 0.5) / n * w + (R() - 0.5) * s, y, s, t]); }
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const [x, y, s] of rows) { const top = Math.pow(R(), 1.3) * h * 0.3, gg = ctx.createLinearGradient(0, y - s * 0.8, 0, top); gg.addColorStop(0, "rgba(255,226,150,.5)"); gg.addColorStop(1, "rgba(255,226,150,0.03)"); ctx.strokeStyle = gg; ctx.lineWidth = Math.max(0.6, s * 0.06); ctx.beginPath(); ctx.moveTo(x, y - s * 0.8); ctx.quadraticCurveTo(x + (R() - 0.5) * w * 0.1, (y + top) / 2, lerp(x, w / 2, 0.55 + R() * 0.3), top); ctx.stroke(); }
      ctx.restore();
      for (const [x, y, s, t] of rows) { ctx.fillStyle = mix(p.bone, "#000", 0.85 - t * 0.45); ctx.beginPath(); ctx.moveTo(x - s * 0.35, y); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.6, x - s * 0.05, y - s * 0.75); ctx.lineTo(x + s * 0.2, y - s * 0.6); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s * 0.35, y); ctx.fill(); ctx.beginPath(); ctx.arc(x, y - s * 0.88, s * 0.14, 0, TAU); ctx.fill(); }
      // 祭壇の底（糸の吸いこまれる先）
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const ag = ctx.createRadialGradient(w / 2, h * 0.1, 0, w / 2, h * 0.1, w * 0.22); ag.addColorStop(0, "rgba(255,240,200,.85)"); ag.addColorStop(0.3, "rgba(255,220,150,.35)"); ag.addColorStop(1, "rgba(255,220,150,0)"); ctx.fillStyle = ag; ctx.fillRect(0, 0, w, h * 0.45); ctx.restore();
      V.light(P, w / 2, h * 0.25, w * 0.6, "#ffe2a0", 0.9, false);
      P.anim.push({ draw: (c, t) => { for (const [x, y, ph, s] of stars) { const k = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 * s + ph * 9)); c.fillStyle = `rgba(255,236,190,${k})`; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); } } });
      for (let i = 0; i < 2; i++) V.fogBand(P, h * (0.6 + i * 0.12), h * 0.05, 0.12, "#e8d8b0");
      V.dim(P, 0.3);
    },
    // 外海へ開いた大洞：夜明けの光が水平線から洞の中まで。大盃と酒樽、水の底で白く光る鎖
    onigashima: (P, p) => {
      const { ctx, w, h, R, u } = P;
      const hz = h * 0.5;
      // 空（夜明け）
      let g = ctx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, "#1a2440"); g.addColorStop(0.55, "#7a5a7a"); g.addColorStop(0.85, "#ff9a6a"); g.addColorStop(1, "#ffe0a0");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz);
      ctx.fillStyle = "#fff4d0"; ctx.beginPath(); ctx.arc(w * 0.55, hz, h * 0.05, Math.PI, 0); ctx.fill();
      V.light(P, w * 0.55, hz, w * 0.7, "#ffc890", 1.2, false);
      // 海と光の道
      g = ctx.createLinearGradient(0, hz, 0, h); g.addColorStop(0, "#d8a080"); g.addColorStop(0.2, "#4a6a8a"); g.addColorStop(1, "#14243a");
      ctx.fillStyle = g; ctx.fillRect(0, hz, w, h - hz);
      for (let i = 0; i < 60; i++) { const t = Math.pow(R(), 1.6), y = hz + t * (h - hz) * 0.8, ww = u * (0.6 + t * 5); ctx.fillStyle = `rgba(255,230,180,${0.75 - t * 0.5})`; ctx.fillRect(w * 0.55 + (R() - 0.5) * (u * 2 + t * w * 0.25) - ww / 2, y, ww, Math.max(1, t * u * 0.4)); }
      P.anim.push({ draw: (c, tt) => { for (let i = 0; i < 18; i++) { const y = hz + ((i * 37) % 100) / 100 * (h - hz) * 0.7, x = (w * ((i * 53) % 100) / 100 + tt * 6 * (1 + i % 3)) % w; c.fillStyle = "rgba(255,240,210,.35)"; c.fillRect(x, y, u * (1 + (y - hz) / h * 6), 1); } } });
      // 洞の口（黒い岩の枠）
      ctx.fillStyle = "#120a08";
      ctx.beginPath(); ctx.rect(0, 0, w, h);
      ctx.moveTo(w * 0.1, h); ctx.quadraticCurveTo(w * 0.04, h * 0.3, w * 0.3, h * 0.12); ctx.quadraticCurveTo(w * 0.55, h * 0.02, w * 0.78, h * 0.14); ctx.quadraticCurveTo(w * 0.98, h * 0.35, w * 0.9, h); ctx.closePath();
      ctx.fill("evenodd");
      for (let i = 0; i < 12; i++) { const x = w * (0.2 + R() * 0.6), l = h * (0.04 + R() * 0.1); ctx.beginPath(); ctx.moveTo(x - u, h * 0.1); ctx.lineTo(x, h * 0.1 + l); ctx.lineTo(x + u, h * 0.1); ctx.fill(); }
      // 洞の床（岩棚と浅瀬）
      ctx.fillStyle = "#2a1a14"; ctx.beginPath(); ctx.moveTo(0, h * 0.82); ctx.quadraticCurveTo(w * 0.3, h * 0.76, w * 0.42, h * 0.84); ctx.lineTo(w * 0.42, h); ctx.lineTo(0, h); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w, h * 0.8); ctx.quadraticCurveTo(w * 0.78, h * 0.78, w * 0.7, h * 0.86); ctx.lineTo(w * 0.7, h); ctx.lineTo(w, h); ctx.fill();
      // 水の底の白い鎖
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 9; i++) { const x = w * (0.46 + i * 0.025), y = h * (0.93 + Math.sin(i) * 0.01); ctx.strokeStyle = "rgba(230,240,255,.55)"; ctx.lineWidth = u * 0.25; ctx.beginPath(); ctx.ellipse(x, y, u * 0.8, u * 0.4, i % 2 ? 0 : 0.6, 0, TAU); ctx.stroke(); }
      ctx.restore();
      V.light(P, w * 0.56, h * 0.93, w * 0.12, "#e0f0ff", 0.6, true);
      // 大盃と酒樽
      ctx.fillStyle = "#a01e14"; ctx.beginPath(); ctx.ellipse(w * 0.2, h * 0.86, u * 7, u * 1.8, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#c8a040"; ctx.beginPath(); ctx.ellipse(w * 0.2, h * 0.86, u * 7, u * 1.2, 0, 0, TAU); ctx.fill();
      V.barrel(P, w * 0.08, h * 0.98, u * 8); V.barrel(P, w * 0.84, h * 0.97, u * 8); V.barrel(P, w * 0.93, h * 0.95, u * 6);
      dust(P, 20, "#ffe0b0");
      V.dim(P, 0.25);
    },
  };

  // ---------------------------------------------------------------- 登録
  Object.entries(PAL).forEach(([id, p]) => {
    p.id = id;
    KINDS.forEach((k) => { IN[`w11_${id}_${k}_in`] = (P) => KIND[k](P, p); });
    IN[`w11_${id}_deep_in`] = (P) => DEEP[id](P, p);
  });
  // どの絵か：大きな迷宮の部屋・最奥ならその絵。ほかは今までの迷宮の中の絵
  const scene0 = G.dungeonScene;
  G.dungeonScene = (L) => {
    const S = G.S;
    const D = G.data || {};
    if (S && L && D.LOCS && D.LOCS[S.loc] === L && G.w11 && G.w11.sceneKind) {
      const k = G.w11.sceneKind(S);
      const key = k && `w11_${S.loc}_${k}_in`;
      if (key && IN[key]) return key;
    }
    return scene0 ? scene0(L) : "dungeon";
  };
  G.W11_SCENE_KINDS = [...KINDS, "deep"];
  void clamp;
})(globalThis.G = globalThis.G || {});
