// 背景の絵（V2）：W3 の新しい場所（src/data/locations_w3.js）。道具は scene_v2.js の G.SV2
// 港の商都カルメラント（w3_harbor）・森と湖の都リグノア（w3_lake）・火山の都フロスレイア（w3_volcano）
// 鐘撞きの丘（w3_bells）・沈黙の修道院（w3_abbey）・数の合わない島（w3_isles）
// 灰の観測所（w3_ashvault・中は w3_ashvault_in）・潮鳴りの洞（w3_seacave・中は w3_seacave_in）
// scene_v2_towns.js・scene_v2_wild.js・scene_v2_inside.js より先に読まれることがあるので、そこで足される道具（V.ship・V.rock など）は描くときに V から引く
// レーン A（絵）・W（場所）が管理
(function (G) {
  const V = G.SV2;
  if (!V) return;
  const { mix, rgba, lerp } = V;
  const OUT = V.OUT, IN = V.IN;

  // 小さな鈴（戸口に下がる）
  function bell(P, x, y, s, d) {
    const { ctx } = P;
    ctx.strokeStyle = P.dark("#2a1e14", d, 0.2); ctx.lineWidth = Math.max(0.6, s * 0.08);
    ctx.beginPath(); ctx.moveTo(x, y - s * 1.2); ctx.lineTo(x, y - s * 0.6); ctx.stroke();
    ctx.fillStyle = P.lit("#c8a040", d, 0.35);
    ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.7, x, y - s * 0.7); ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.7, x + s * 0.5, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.dark("#6a4a1a", d, 0.3); ctx.beginPath(); ctx.arc(x, y + s * 0.08, s * 0.12, 0, Math.PI * 2); ctx.fill();
  }
  // 見張り塔（石の塔の上に、鐘を吊った屋根）
  function watchTower(P, x, base, s, d) {
    const { ctx } = P;
    V.tower(P, x, base, s * 0.32, s, { wall: "#b8ac98", roof: "#5a3a2a", d, roofK: 0, stone: true });
    const top = base - s;
    ctx.fillStyle = P.dark("#3a2a1e", d, 0.2);
    ctx.fillRect(x - s * 0.2, top - s * 0.2, s * 0.03, s * 0.2); ctx.fillRect(x + s * 0.17, top - s * 0.2, s * 0.03, s * 0.2);
    ctx.fillStyle = P.lit("#6a3a2a", d, 0.25);
    ctx.beginPath(); ctx.moveTo(x - s * 0.28, top - s * 0.2); ctx.lineTo(x, top - s * 0.38); ctx.lineTo(x + s * 0.28, top - s * 0.2); ctx.fill();
    bell(P, x, top - s * 0.05, s * 0.1, d);
  }
  // 糸杉
  function cypress(P, x, base, s, d) {
    const { ctx } = P;
    ctx.fillStyle = P.dark("#2a3a2a", d, 0.3); ctx.beginPath(); ctx.ellipse(x, base - s, s * 0.18, s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.lit("#3a4a34", d, 0.2); ctx.beginPath(); ctx.ellipse(x + P.ldir * s * 0.05, base - s * 1.05, s * 0.09, s * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 小島（岩と木を載せた、海の上のこぶ）
  function islet(P, x, y, s, d) {
    const { ctx, R } = P;
    const g = ctx.createLinearGradient(0, y - s * 0.5, 0, y);
    g.addColorStop(0, P.lit("#5a6a4a", d, 0.25)); g.addColorStop(1, P.dark("#3a4a3a", d, 0.4));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s, y);
    for (let k = 0; k <= 8; k++) { const t = k / 8; ctx.lineTo(x - s + t * s * 2, y - Math.sin(t * Math.PI) * s * (0.35 + R() * 0.15)); }
    ctx.closePath(); ctx.fill();
    for (let i = 0; i < 3; i++) V.pine(P, x + (R() - 0.5) * s, y - s * 0.3, s * (0.3 + R() * 0.2), { d });
    ctx.fillStyle = rgba(P.lit("#ffffff", d, 0.3), 0.35); ctx.fillRect(x - s * 1.05, y - 1, s * 2.1, Math.max(1, s * 0.03));
  }

  // ---------------------------------------------------------------- 港の商都カルメラント（入り江に倉庫と帳場、帆船、戸口の鈴）
  OUT.w3_harbor = (P) => {
    const { u, w, h, hz, cx, ctx } = P;
    V.hills(P, { base: hz - u, amp: u * 7, d: 0.75, color: "#5a6a5a", scale: 2 });
    // 対岸の町並み
    V.houseRow(P, { base: hz, size: 3.5, d: 0.6, walls: ["#c8b8a0", "#b8a488", "#d8ccb4"], roofs: ["#5a3a2a", "#6a4a3a", "#3a3a40"], roofType: ["gable"], chimney: 0.3 });
    V.water(P, { top: hz + u * 0.5, color: "#2a4458", reflect: 0.4 });
    P.reflectWater.x0 = w * 0.5;
    if (V.ship) { V.ship(P, w * 0.7, hz + u * 3, u * 9, { d: 0.45, masts: 2 }); V.ship(P, w * 0.88, hz + u * 1.6, u * 5, { d: 0.6, masts: 1, sail: "#c8b89a" }); }
    // 手前の左：帳場と倉庫の並ぶ岸。戸口ごとの鈴
    const qy = hz + (h - hz) * 0.5;
    ctx.fillStyle = P.c("#5a4a3a"); ctx.beginPath(); ctx.moveTo(0, qy); ctx.lineTo(w * 0.52, qy); ctx.lineTo(w * 0.6, h); ctx.lineTo(0, h); ctx.fill();
    V.houseRow(P, { base: qy, size: 12, d: 0.15, to: w * 0.5, walls: ["#b8a080", "#a88c6a", "#c8b494"], roofs: ["#4a3a30", "#6a3a2a"], roofType: ["gable", "eave"], chimney: 0.4, side: 0.08, signs: ["#3a6a8a", "#8a5a2a"] });
    for (let i = 0; i < 6; i++) bell(P, w * (0.04 + i * 0.08), qy - u * 4, u * 1, 0.1);
    // 樽と荷
    for (const [x, s] of [[w * 0.42, u * 3.2], [w * 0.46, u * 2.6], [w * 0.38, u * 2.8]]) V.barrel(P, x, lerp(qy, h, 0.4), s);
    if (V.lamp) { V.lamp(P, w * 0.5, lerp(qy, h, 0.2), u * 6); V.lamp(P, w * 0.24, lerp(qy, h, 0.75), u * 9); }
    for (let i = 0; i < 2; i++) V.fogBand(P, hz + u * (1 + i * 3), u * 3, P.weather === "fog" ? 0.45 : 0.18, P.night ? "#3a4450" : "#d0d8e0");
    V.frame(P, { color: "#1a2228" });
  };

  // ---------------------------------------------------------------- 森と湖の都リグノア（湖の上の砦、上がった跳ね橋、湖を囲む森）
  OUT.w3_lake = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.mountains(P, { base: hz - u * 2, height: u * 10, d: 0.82, color: "#6a7a8a", snow: 0.25, round: true });
    V.forestBand(P, { base: hz, size: u * 5, d: 0.6, kind: "pine" });
    V.water(P, { top: hz + u * 0.5, color: "#2a4a5a", reflect: 0.55 });
    // 砦（湖の真ん中の島）
    const fx = cx + u * 6, fb = hz + u * 3;
    ctx.fillStyle = P.dark("#4a5a3a", 0.35, 0.3); ctx.beginPath(); ctx.ellipse(fx, fb, u * 16, u * 2, 0, 0, Math.PI * 2); ctx.fill();
    V.wall(P, fx - u * 12, fx + u * 12, fb, u * 5, { color: "#b8b0a0", d: 0.35 });
    V.tower(P, fx - u * 11, fb, u * 4, u * 12, { wall: "#c8c0b0", roof: "#3a5a3a", d: 0.35, roofK: 1.6, flag: "#2a6a3a" });
    V.tower(P, fx + u * 4, fb, u * 5, u * 17, { wall: "#c8c0b0", roof: "#3a5a3a", d: 0.35, roofK: 1.8, flag: "#2a6a3a" });
    V.tower(P, fx + u * 12, fb, u * 3.5, u * 10, { wall: "#c8c0b0", roof: "#3a5a3a", d: 0.35, roofK: 1.5 });
    // 上がった跳ね橋（朝と夕方には下りている）
    const down = P.phase === 0 || P.phase === 2;
    ctx.save(); ctx.translate(fx - u * 12, fb - u * 0.5); ctx.rotate(down ? Math.PI * 0.98 : Math.PI * 0.62);
    ctx.fillStyle = P.dark("#5a3a24", 0.3, 0.2); ctx.fillRect(0, -u * 0.6, u * 14, u * 1.2); ctx.restore();
    // 飛び立つ鳥
    for (let i = 0; i < 9; i++) { const x = w * (0.1 + R() * 0.3), y = hz - u * (4 + R() * 8); ctx.strokeStyle = P.dark("#1a1a1a", 0.4, 0.2); ctx.lineWidth = Math.max(1, u * 0.15); ctx.beginPath(); ctx.moveTo(x - u * 0.6, y); ctx.quadraticCurveTo(x - u * 0.3, y - u * 0.4, x, y); ctx.quadraticCurveTo(x + u * 0.3, y - u * 0.4, x + u * 0.6, y); ctx.stroke(); }
    // 手前の岸の木と小舟
    for (let i = 0; i < 5; i++) V.pine(P, w * (0.02 + i * 0.06), h * (0.92 + (i % 2) * 0.06), u * (12 + R() * 6), { d: 0.05 });
    for (let i = 0; i < 3; i++) V.pine(P, w * (0.86 + i * 0.06), h * (0.94 + (i % 2) * 0.05), u * (11 + R() * 6), { d: 0.05 });
    ctx.fillStyle = P.c("#4a3022"); ctx.beginPath(); ctx.moveTo(cx - u * 10, h * 0.9); ctx.lineTo(cx + u * 2, h * 0.9); ctx.quadraticCurveTo(cx, h * 0.94, cx - u * 2, h * 0.94); ctx.lineTo(cx - u * 8, h * 0.94); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 3; i++) V.fogBand(P, hz + u * (1 + i * 2.5), u * 2.5, P.phase === 0 || P.weather === "fog" ? 0.4 : 0.12, P.night ? "#3a4450" : "#e0e6ea");
    V.frame(P, { color: "#1a2420" });
  };

  // ---------------------------------------------------------------- 火山の都フロスレイア（煙を吐く火山、灰の斜面の白い段々の町、屋根の灰掻き箒）
  OUT.w3_volcano = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    // 火山
    const px = cx - u * 4, top = hz - u * 26;
    const g = ctx.createLinearGradient(0, top, 0, hz);
    g.addColorStop(0, P.c("#3a3432", 0.5)); g.addColorStop(1, P.c("#5a504a", 0.5));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px - w * 0.6, hz + u * 2); ctx.lineTo(px - u * 5, top); ctx.lineTo(px + u * 5, top + u * 1); ctx.lineTo(px + w * 0.6, hz + u * 2); ctx.fill();
    V.light(P, px, top, u * 8, "#ff6a2a", 0.8, true);
    V.smoke(P, px, top - u * 2, u * 6, 0.5, P.night ? "#3a3634" : "#7a726c");
    // 灰の斜面と段々の町
    V.ground(P, { top: hz, color: "#4a4440", tex: "rock" });
    for (let r = 0; r < 4; r++) {
      const base = hz + u * (2 + r * 4.5), sz = 3 + r * 2.2, d = 0.55 - r * 0.13;
      V.houseRow(P, { base, size: sz, d, walls: ["#ece8e0", "#e0dcd2", "#f2eee6"], roofs: ["#5a5450", "#6a5a50", "#4a4440"], roofType: ["flat", "gable"], chimney: 0.2, gap: r > 1 ? [cx - u * (4 + r * 2), cx + u * (4 + r * 2)] : null });
    }
    // 研究所の丸屋根
    V.house(P, cx + u * 14, hz + u * 7, u * 12, u * 6, { wall: "#e8e4dc", roof: "#6a6a70", roofType: "flat", d: 0.3, stone: true, side: 0.05 });
    ctx.fillStyle = P.lit("#8a8a92", 0.3, 0.3); ctx.beginPath(); ctx.arc(cx + u * 20, hz + u * 1, u * 4, Math.PI, 0); ctx.fill();
    // 屋根の灰掻き箒（手前の家）
    V.house(P, -u * 4, h * 1.02, u * 20, u * 16, { wall: "#ece8e0", roof: "#5a5450", roofType: "flat", d: 0, stone: true, chimney: false, side: 0.1 });
    ctx.strokeStyle = P.dark("#5a3a24", 0, 0.2); ctx.lineWidth = u * 0.4; ctx.beginPath(); ctx.moveTo(u * 10, h * 1.02 - u * 16); ctx.lineTo(u * 13, h * 1.02 - u * 23); ctx.stroke();
    ctx.fillStyle = P.c("#b89a5a"); ctx.beginPath(); ctx.moveTo(u * 8.6, h * 1.02 - u * 16); ctx.lineTo(u * 11.4, h * 1.02 - u * 16); ctx.lineTo(u * 10.8, h * 1.02 - u * 18.5); ctx.lineTo(u * 9.6, h * 1.02 - u * 18.5); ctx.fill();
    // 降る灰
    for (let i = 0; i < 160; i++) { ctx.fillStyle = rgba(P.c("#8a8480"), 0.35); ctx.fillRect(R() * w, R() * h, u * 0.25, u * 0.25); }
    V.frame(P, { color: "#2a2422" });
  };

  // ---------------------------------------------------------------- 鐘撞きの丘（低い丘ごとに見張り塔と鐘）
  OUT.w3_bells = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.hills(P, { base: hz - u * 1, amp: u * 6, d: 0.7, color: "#7a9058", scale: 2.5 });
    watchTower(P, w * 0.18, hz - u * 3, u * 9, 0.6);
    watchTower(P, w * 0.62, hz - u * 2, u * 7, 0.65);
    V.hills(P, { base: hz + u * 2, amp: u * 5, d: 0.45, color: "#86a060", scale: 2 });
    watchTower(P, w * 0.4, hz + u * 0.5, u * 13, 0.4);
    V.ground(P, { top: hz + u * 3, color: "#7a9a50", tex: "grass" });
    V.road(P, { top: hz + u * 3, wt: u * 3, wb: w * 0.4, color: "#a08a68" });
    // 手前の塔（番人が鐘の綱を握って居眠り）
    const tx = w * 0.82, tb = h * 0.98;
    watchTower(P, tx, tb, u * 30, 0.05);
    ctx.strokeStyle = P.dark("#6a5a3a", 0, 0.2); ctx.lineWidth = u * 0.2; ctx.beginPath(); ctx.moveTo(tx, tb - u * 30); ctx.lineTo(tx - u * 6, tb - u * 3); ctx.stroke();
    for (let i = 0; i < 40; i++) { const x = R() * w, y = hz + u * 4 + R() * (h - hz - u * 4); ctx.fillStyle = P.c(["#f8d040", "#ffffff", "#c04ae0"][i % 3]); ctx.beginPath(); ctx.arc(x, y, u * (0.1 + P.depth(y) * 0.35), 0, Math.PI * 2); ctx.fill(); }
    V.frame(P, { color: "#24301c" });
  };

  // ---------------------------------------------------------------- 沈黙の修道院（糸杉の丘、屋根の落ちた修道院、中庭の井戸）
  OUT.w3_abbey = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.hills(P, { base: hz, amp: u * 7, d: 0.65, color: "#6a7a58", scale: 2 });
    for (let i = 0; i < 8; i++) cypress(P, w * (0.04 + i * 0.13) + (R() - 0.5) * u * 3, hz + u * (1 + R() * 2), u * (6 + R() * 4), 0.5);
    V.ground(P, { top: hz + u * 1, color: "#6a704a", tex: "grass" });
    // 修道院（屋根が落ちて、梁だけが残る）
    const ab = hz + u * 9, stone = "#c0b8a8";
    V.wall(P, cx - u * 22, cx + u * 22, ab, u * 10, { color: stone, d: 0.3, crenel: false });
    for (let i = 0; i < 7; i++) { const x = cx - u * 18 + i * u * 6; ctx.fillStyle = "#14100c"; ctx.beginPath(); ctx.moveTo(x - u * 1.4, ab - u * 2); ctx.lineTo(x - u * 1.4, ab - u * 6); ctx.arc(x, ab - u * 6, u * 1.4, Math.PI, 0); ctx.lineTo(x + u * 1.4, ab - u * 2); ctx.fill(); }
    // 鐘楼（鐘は無い）
    V.tower(P, cx + u * 16, ab, u * 5, u * 20, { wall: stone, roof: "#5a5048", d: 0.3, roofK: 0, stone: true });
    ctx.fillStyle = "#14100c"; ctx.fillRect(cx + u * 15, ab - u * 19, u * 2, u * 3);
    // 梁だけの屋根
    ctx.strokeStyle = P.dark("#4a3a2a", 0.3, 0.2); ctx.lineWidth = u * 0.5;
    for (let i = 0; i < 6; i++) { const x = cx - u * 20 + i * u * 7; ctx.beginPath(); ctx.moveTo(x, ab - u * 10); ctx.lineTo(x + u * 3.5, ab - u * 15); ctx.stroke(); }
    // 門の上の彫り込み
    ctx.fillStyle = P.dark(stone, 0.3, 0.5); for (let i = 0; i < 5; i++) ctx.fillRect(cx - u * 3 + i * u * 1.3, ab - u * 9, u * 0.8, u * 0.8);
    // 井戸と、縁のパン
    const wx = cx - u * 6, wb = h * 0.86;
    ctx.fillStyle = P.c("#8a8478"); ctx.beginPath(); ctx.ellipse(wx, wb, u * 6, u * 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.dark("#6a6458", 0, 0.3); ctx.fillRect(wx - u * 6, wb, u * 12, u * 4);
    ctx.fillStyle = "#0a0806"; ctx.beginPath(); ctx.ellipse(wx, wb, u * 4.6, u * 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.lit("#c88a48", 0, 0.3); ctx.beginPath(); ctx.ellipse(wx + u * 4.6, wb - u * 0.6, u * 1.2, u * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    if (V.mist) V.mist(P, hz + u * 3, 3, P.night ? 0.18 : 0.22, "#d8dcd4");
    V.frame(P, { color: "#1e2018" });
  };

  // ---------------------------------------------------------------- 数の合わない島（霧の海に、数の定まらない小島）
  OUT.w3_isles = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.water(P, { top: hz - u * 1, color: "#2a4a5a", reflect: 0.5 });
    // 小島（数は種で変わる）
    const n = 7 + Math.floor(R() * 5);
    const list = [];
    for (let i = 0; i < n; i++) { const t = Math.pow(R(), 1.4); list.push([R() * w, hz + u * (0.5 + t * 14), u * (3 + t * 12)]); }
    list.sort((a, b) => a[1] - b[1]).forEach(([x, y, s]) => islet(P, x, y, s, Math.max(0, 0.7 - P.depth(y))));
    // 手前の浜と小舟
    ctx.fillStyle = P.c("#c8b898"); ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * 0.88); ctx.quadraticCurveTo(w * 0.3, h * 0.84, w * 0.55, h); ctx.fill();
    ctx.fillStyle = P.c("#5a3a24"); ctx.beginPath(); ctx.moveTo(w * 0.12, h * 0.92); ctx.lineTo(w * 0.28, h * 0.92); ctx.quadraticCurveTo(w * 0.26, h * 0.96, w * 0.22, h * 0.96); ctx.lineTo(w * 0.15, h * 0.96); ctx.closePath(); ctx.fill();
    // 浜の足跡（途中で消える）
    for (let i = 0; i < 7; i++) { ctx.fillStyle = rgba(P.dark("#8a7a5a"), 0.5); ctx.beginPath(); ctx.ellipse(w * (0.34 + i * 0.025), h * (0.97 - i * 0.012), u * 0.5, u * 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 4; i++) V.fogBand(P, hz + u * (0.5 + i * 3), u * 3, P.weather === "fog" ? 0.55 : 0.28, P.night ? "#3a4450" : "#dce4e8");
    V.frame(P, { color: "#18242a" });
  };
  OUT.w3_isles.fogAlways = true;

  // ---------------------------------------------------------------- 灰の観測所（火山の中腹、灰に半分埋もれた丸屋根）
  OUT.w3_ashvault = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    const g = ctx.createLinearGradient(0, hz - u * 30, 0, hz);
    g.addColorStop(0, P.c("#3a3432", 0.4)); g.addColorStop(1, P.c("#5a504a", 0.4));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-u * 4, hz + u * 4); ctx.lineTo(w * 0.72, hz - u * 30); ctx.lineTo(w * 0.8, hz - u * 29); ctx.lineTo(w + u * 4, hz - u * 8); ctx.lineTo(w + u * 4, hz + u * 4); ctx.fill();
    V.light(P, w * 0.76, hz - u * 30, u * 6, "#ff6a2a", 0.7, true);
    V.smoke(P, w * 0.76, hz - u * 31, u * 5, 0.45, P.night ? "#3a3634" : "#7a726c");
    V.ground(P, { top: hz, color: "#5a5450", tex: "dirt" });
    if (V.lavaCracks && P.night) V.lavaCracks(P, hz + u * 6, 4, "#ff6a2a");
    // 丸屋根（灰に半分埋もれている）
    const dx = cx - u * 4, db = hz + u * 10, r = u * 13;
    const dg = ctx.createRadialGradient(dx - P.ldir * r * 0.3, db - r * 0.7, 0, dx, db - r * 0.3, r * 1.2);
    dg.addColorStop(0, P.lit("#a8a4a0", 0.2, 0.3)); dg.addColorStop(1, P.dark("#6a6460", 0.2, 0.4));
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(dx, db, r, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = rgba(P.dark("#4a4440", 0.2), 0.5); ctx.lineWidth = u * 0.2;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(dx - r + i * r / 3, db); ctx.quadraticCurveTo(dx - r + i * r / 3, db - r * 0.9, dx, db - r); ctx.stroke(); }
    // 割れ目（観測の窓）と、内側から板を打ちつけた扉
    ctx.fillStyle = "#0a0806"; ctx.fillRect(dx - u * 0.6, db - r, u * 1.2, r * 0.6);
    ctx.fillStyle = P.dark("#4a3424", 0.2, 0.2); ctx.fillRect(dx - u * 3, db - u * 6, u * 6, u * 6);
    ctx.strokeStyle = P.c("#2a1e14", 0.2); ctx.lineWidth = u * 0.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(dx - u * 3, db - u * (1.5 + i * 1.8)); ctx.lineTo(dx + u * 3, db - u * (2.2 + i * 1.8)); ctx.stroke(); }
    // 吹きだまりの灰
    ctx.fillStyle = P.c("#6a6460", 0.1); ctx.beginPath(); ctx.ellipse(dx, db + u * 1, r * 1.8, u * 3, 0, Math.PI, 0); ctx.fill();
    for (let i = 0; i < 5; i++) V.rock && V.rock(P, R() * w, hz + u * 6 + R() * (h - hz - u * 6), u * (1.5 + R() * 3), { color: "#3a3432" });
    for (let i = 0; i < 200; i++) { ctx.fillStyle = rgba(P.c("#9a948e"), 0.35); ctx.fillRect(R() * w, R() * h, u * 0.22, u * 0.22); }
    V.frame(P, { color: "#221e1c" });
  };

  // ---------------------------------------------------------------- 潮鳴りの洞（磯の崖に口を開ける海蝕洞、引き潮の岩場）
  OUT.w3_seacave = (P) => {
    const { u, w, h, hz, cx, ctx, R } = P;
    V.water(P, { top: hz, color: "#2a4a5a", reflect: 0.45 });
    // 崖
    const cg = ctx.createLinearGradient(w * 0.3, 0, w, 0);
    cg.addColorStop(0, P.lit("#6a6458", 0.15, 0.3)); cg.addColorStop(1, P.dark("#4a4440", 0.15, 0.4));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(w * 0.28, h); ctx.lineTo(w * 0.34, hz - u * 14);
    for (let k = 0; k <= 10; k++) ctx.lineTo(w * (0.34 + k * 0.066), hz - u * (14 + Math.sin(k * 1.3) * 3 + R() * 2));
    ctx.lineTo(w + u, h); ctx.fill();
    // 洞の口
    const mx = w * 0.62, mb = hz + u * 6;
    ctx.fillStyle = "#040608"; ctx.beginPath(); ctx.moveTo(mx - u * 9, mb); ctx.quadraticCurveTo(mx - u * 8, mb - u * 16, mx, mb - u * 17); ctx.quadraticCurveTo(mx + u * 8, mb - u * 16, mx + u * 9, mb); ctx.fill();
    V.light(P, mx, mb - u * 4, u * 8, "#3ac8d0", 0.4, false);
    // 引き潮の岩場と、打ち上げられた舟の名札
    V.ground(P, { top: mb, color: "#4a4a44", tex: "rock" });
    for (let i = 0; i < 8; i++) V.rock && V.rock(P, R() * w, mb + u * 2 + R() * (h - mb - u * 2), u * (1.5 + R() * 4), { color: "#3a3a36" });
    for (let i = 0; i < 3; i++) { const x = w * (0.2 + i * 0.25), y = h * (0.9 + (i % 2) * 0.04); ctx.save(); ctx.translate(x, y); ctx.rotate((R() - 0.5) * 0.6); ctx.fillStyle = P.c("#8a6a48"); ctx.fillRect(-u * 2, -u * 0.6, u * 4, u * 1.2); ctx.fillStyle = P.dark("#3a2a1a"); ctx.fillRect(-u * 1.4, -u * 0.2, u * 2.8, u * 0.3); ctx.restore(); }
    // 波頭
    P.anim.push({ draw: (c, t) => { c.fillStyle = "rgba(230,245,245,.5)"; for (let i = 0; i < 8; i++) { const x = ((i * 0.13 + t * 0.03) % 1) * w * 0.6, y = hz + u * (1 + (i % 4) * 1.5); c.fillRect(x, y, u * 3, Math.max(1, u * 0.2)); } } });
    V.frame(P, { color: "#141c22" });
  };

  // ---------------------------------------------------------------- 迷宮の中
  // 灰の観測所の中：灰の積もった書庫、帳面の山、机の灯り
  IN.w3_ashvault_in = (P) => {
    const { w, h, u, ctx, R } = P;
    const r = V.room(P, { wall: "#6a645c", floor: "#4a4440", tex: "stone", floorTex: "stone", backY: h * 0.12, backH: h * 0.55, amb: 0.5 });
    V.shelf(P, r.x + r.w * 0.04, r.y + r.h * 0.12, r.w * 0.38, r.h * 0.8, { wood: "#3a3028", colors: ["#a8a090", "#8a8478", "#b8b0a0", "#6a645c", "#9a8a70"] });
    V.shelf(P, r.x + r.w * 0.58, r.y + r.h * 0.12, r.w * 0.38, r.h * 0.8, { wood: "#3a3028", colors: ["#a8a090", "#8a8478", "#b8b0a0", "#6a645c", "#9a8a70"] });
    // 灰に埋まった丸窓
    ctx.fillStyle = "#5a5450"; ctx.beginPath(); ctx.arc(P.cx, r.y + r.h * 0.25, r.w * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7a746c"; ctx.beginPath(); ctx.arc(P.cx, r.y + r.h * 0.25, r.w * 0.06, 0, Math.PI); ctx.fill();
    // 机と帳面の山
    V.table(P, P.cx, h * 0.8, w * 0.24, { color: "#3a2a1e" });
    for (let i = 0; i < 6; i++) { ctx.fillStyle = mix("#d8d0c0", "#8a8478", i * 0.12); ctx.fillRect(P.cx - w * 0.1 + i * 2, h * 0.78 - i * u * 0.8, w * 0.08, u * 0.7); }
    V.candle(P, P.cx + w * 0.06, h * 0.78, u * 1.2);
    // 舞う灰
    P.anim.push({ draw: (c, t) => { c.fillStyle = "rgba(170,160,150,.5)"; for (let i = 0; i < 30; i++) { const x = (i * 0.137 * w + Math.sin(t * 0.3 + i) * u * 4) % w, y = ((i * 0.071 + t * 0.02) % 1) * h; c.fillRect(x, y, 1.5, 1.5); } } });
    V.dim(P, 0.4);
  };
  // 潮鳴りの洞の中：濡れた岩の洞、足もとの潮溜まり、奥の青い光、呑まれた物
  IN.w3_seacave_in = (P) => {
    const { w, h, u, ctx, R } = P;
    V.cavern(P, { rock: "#2a3a40", glow: "#3ac8d0" });
    const g = ctx.createLinearGradient(0, h * 0.82, 0, h);
    g.addColorStop(0, "rgba(40,120,140,.55)"); g.addColorStop(1, "rgba(20,60,80,.7)");
    ctx.fillStyle = g; ctx.fillRect(0, h * 0.82, w, h * 0.18);
    // 錨と草履
    ctx.strokeStyle = "#3a3a36"; ctx.lineWidth = u * 0.8; ctx.beginPath(); ctx.moveTo(w * 0.24, h * 0.62); ctx.lineTo(w * 0.24, h * 0.86); ctx.stroke();
    ctx.beginPath(); ctx.arc(w * 0.24, h * 0.8, u * 4, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = "#8a6a48"; ctx.beginPath(); ctx.ellipse(w * 0.7, h * 0.9, u * 2, u * 0.7, 0.3, 0, Math.PI * 2); ctx.fill();
    // 水面のゆらぎ
    P.anim.push({ draw: (c, t) => { c.fillStyle = "rgba(200,240,240,.35)"; for (let i = 0; i < 10; i++) { const x = ((i * 0.11 + Math.sin(t * 0.5 + i) * 0.02) % 1) * w, y = h * (0.84 + (i % 5) * 0.03); c.fillRect(x, y, u * 3, 1.5); } } });
    V.dim(P, 0.4);
  };
})(globalThis.G = globalThis.G || {});
