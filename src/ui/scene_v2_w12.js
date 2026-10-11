// 背景の絵（V2）：W12 の遺跡の「特別な一枚」。苦労して仕掛けを解いた先と、断片がそろって開く部屋で、その階にいるあいだだけ出る
// （エンジンの S.w12.view。engine/zzzzzzzzzzzzzzzzz_w12_view.js が R5 の背景の決め方に足す）。由来は docs/lore/ancient.md。
//   w12_hall_in    エル・ナフ遺構：光の回廊（鏡が昼の光を奥へ渡し、壁の「灯りの都」の絵を順に照らす）
//   w12_dome_in    灰の観測所：星図の天井（灰の一粒も無い円い部屋。天井いっぱいの星と、真ん中の赤い月。床は月の暦の盤）
//   w12_gate_in    断界の古関：取引の大広間（人の三倍の大扉の向こう、巨きな柱と秤、上へ続く階段に差す青い光）
//   w12_station_in 古い鉄の道：待合の間（白い金属の車が並ぶ地下の乗り場。天井の灯り石がまだ光る。座席に人の形の煤）
//   w12_vault_in   エル・ナフ遺構の祭壇の下：王の練習部屋の窓から、地の底に沈んだ都を見下ろす
// 画像（assets/scenes/in_w12_*.webp。docs/art/scenes.json）があればそちらが敷かれる（scene_v3_photo.js）。無いあいだはこの canvas の絵。
// 乱数は場所の名前からの決まった種（P.R。G.rand は使わない）。レーン A（絵）と W（W12）
(function (G) {
  const V = G.SV2;
  if (!V) return;
  const { mix, rgba, lerp } = V;
  const IN = V.IN;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const dim = (P, a) => { const { ctx, w, h } = P; const g = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.2, w / 2, h * 0.55, Math.max(w, h) * 0.8); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); };
  // 加算の光の帯（a→b の線に沿った柔らかい光）
  function beam(P, ax, ay, bx, by, wd, col, k) {
    const { ctx } = P;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [m, al] of [[3.2, 0.06], [1.8, 0.12], [0.8, 0.3], [0.25, 0.7]]) {
      ctx.strokeStyle = rgba(col, al * (k == null ? 1 : k)); ctx.lineWidth = Math.max(1, wd * m); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.restore();
  }
  // 塵（光の中を漂う粒）
  function motes(P, n, col, area) {
    const { w, h } = P;
    const seeds = []; for (let i = 0; i < n; i++) seeds.push([P.R(), P.R(), P.R()]);
    P.anim.push({ draw: (c, t) => {
      c.save(); c.globalCompositeOperation = "lighter";
      for (const [a, b, s] of seeds) {
        const x = (area ? area.x + a * area.w : a * w) + Math.sin(t * 0.4 + s * 9) * P.u * 1.5;
        const y = (area ? area.y + ((b + t * 0.006 * (0.5 + s)) % 1) * area.h : ((b + t * 0.006) % 1) * h);
        c.fillStyle = rgba(col, 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.3 + s * 20)));
        c.fillRect(x, y, 1.6, 1.6);
      }
      c.restore();
    } });
  }
  // 壁画の小さな人と竜（灯りの都の絵）
  function muralCity(P, x0, y0, x1, y1, k) {
    const { ctx, R } = P;
    const W = x1 - x0, H = y1 - y0;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, mix("#1c2440", "#000", 1 - k)); g.addColorStop(1, mix("#5a4a3a", "#000", 1 - k));
    ctx.fillStyle = g; ctx.fillRect(x0, y0, W, H);
    // 屋根の並びと灯り
    for (let i = 0; i < 14; i++) {
      const bw = W * (0.05 + R() * 0.07), bx = x0 + R() * W, bh = H * (0.15 + R() * 0.35);
      ctx.fillStyle = mix("#c8b48a", "#000", 1 - k * 0.8); ctx.fillRect(bx, y1 - bh, bw, bh);
      ctx.beginPath(); ctx.moveTo(bx - bw * 0.1, y1 - bh); ctx.lineTo(bx + bw / 2, y1 - bh - bw * 0.5); ctx.lineTo(bx + bw * 1.1, y1 - bh); ctx.fill();
      ctx.fillStyle = mix("#ffe8a0", "#000", 1 - k); for (let j = 0; j < 3; j++) ctx.fillRect(bx + bw * (0.2 + j * 0.25), y1 - bh * (0.4 + R() * 0.4), Math.max(1, bw * 0.12), Math.max(1, bw * 0.12));
    }
    // 竜（翼を広げた影）と浮かぶ船
    for (let i = 0; i < 3; i++) {
      const dx = x0 + W * (0.15 + i * 0.32 + R() * 0.08), dy = y0 + H * (0.18 + R() * 0.2), s = H * 0.12;
      ctx.fillStyle = mix("#8a3a2a", "#000", 1 - k);
      ctx.beginPath(); ctx.moveTo(dx - s * 1.6, dy - s * 0.2); ctx.quadraticCurveTo(dx - s * 0.6, dy - s * 0.9, dx, dy); ctx.quadraticCurveTo(dx + s * 0.6, dy - s * 0.9, dx + s * 1.6, dy - s * 0.2); ctx.quadraticCurveTo(dx + s * 0.4, dy - s * 0.1, dx + s * 0.9, dy + s * 0.25); ctx.lineTo(dx - s * 0.9, dy + s * 0.25); ctx.quadraticCurveTo(dx - s * 0.4, dy - s * 0.1, dx - s * 1.6, dy - s * 0.2); ctx.fill();
      ctx.fillStyle = mix("#d8c8a0", "#000", 1 - k); ctx.beginPath(); ctx.ellipse(x0 + W * (0.3 + i * 0.25), y0 + H * (0.45 + R() * 0.1), s * 0.7, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    }
    // 札を下げた人の列（隅）
    ctx.fillStyle = mix("#3a2a20", "#000", 1 - k);
    for (let i = 0; i < 9; i++) { const px = x0 + W * (0.72 + i * 0.026), py = y1 - H * 0.02; ctx.fillRect(px, py - H * 0.09, Math.max(1, W * 0.008), H * 0.09); ctx.beginPath(); ctx.arc(px + W * 0.004, py - H * 0.1, Math.max(1, W * 0.006), 0, Math.PI * 2); ctx.fill(); }
    // 経年の剥落
    for (let i = 0; i < 26; i++) { ctx.fillStyle = rgba("#000000", 0.25 + R() * 0.35); ctx.beginPath(); ctx.ellipse(x0 + R() * W, y0 + R() * H, W * (0.01 + R() * 0.04), H * (0.01 + R() * 0.05), R() * 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = mix("#c8a858", "#000", 1 - k * 0.9); ctx.lineWidth = Math.max(1, P.u * 0.25); ctx.strokeRect(x0, y0, W, H);
  }

  // ---------------------------------------------------------------- エル・ナフ遺構：光の回廊
  IN.w12_hall_in = (P) => {
    const { w, h, u, ctx } = P;
    const c = V.corridor(P, { stone: "#b0a488", torches: false, arches: true, depth: 8, endGlow: "#ffe2a0", moss: "#7a6a48" });
    // 両側の壁画：一枚の絵（灯りの都）を裏で描き、斜めの壁へ細い帯に分けて貼る
    const MW = 900, MH = 220;
    const off = typeof document !== "undefined" && typeof ctx.drawImage === "function" ? document.createElement("canvas") : null; // DOM の無いところ（テスト）では貼らない
    const octx = off && off.getContext ? off.getContext("2d") : null;
    if (octx) { off.width = MW; off.height = MH; muralCity(Object.assign({}, P, { ctx: octx }), 0, 0, MW, MH, 1); }
    for (const s of octx ? [0, 1] : []) {
      const a = c.box(0), b = c.box(4), t0 = 0.2, t1 = 0.6, N = 90;
      const ax = s ? a.x1 : a.x0, bx = s ? b.x1 : b.x0;
      for (let j = 0; j < N; j++) {
        const u0 = j / N, u1 = (j + 1) / N;
        // 奥ほど縮むので、壁の上の位置は 1/z で割り付ける
        const z0 = 1 / lerp(1, 1 / Math.pow(0.74, 4), u0), z1 = 1 / lerp(1, 1 / Math.pow(0.74, 4), u1);
        const f0 = (1 - z0) / (1 - Math.pow(0.74, 4)), f1 = (1 - z1) / (1 - Math.pow(0.74, 4));
        const xA = lerp(ax, bx, f0), xB = lerp(ax, bx, f1);
        const yA0 = lerp(lerp(a.y0, a.y1, t0), lerp(b.y0, b.y1, t0), f0), yA1 = lerp(lerp(a.y0, a.y1, t1), lerp(b.y0, b.y1, t1), f0);
        const sx = Math.floor((s ? 1 - u1 : u0) * MW * 0.999);
        ctx.globalAlpha = clamp(1 - u0 * 0.7, 0.25, 1);
        ctx.drawImage(off, sx, 0, Math.max(1, MW / N), MH, Math.min(xA, xB), yA0, Math.abs(xB - xA) + 0.8, yA1 - yA0);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba("#d8b060", 0.7); ctx.lineWidth = Math.max(1, u * 0.3);
      ctx.beginPath(); ctx.moveTo(ax, lerp(a.y0, a.y1, t0)); ctx.lineTo(bx, lerp(b.y0, b.y1, t0)); ctx.moveTo(ax, lerp(a.y0, a.y1, t1)); ctx.lineTo(bx, lerp(b.y0, b.y1, t1)); ctx.stroke();
    }
    // 鏡の板と、跳ね返る光の筋（手前の天井の隙間から、左右の壁の鏡を渡って奥の祭壇へ）
    const pts = [[w * 0.62, -h * 0.02]];
    for (let i = 0; i < 5; i++) { const a = c.box(i + 1); pts.push([i % 2 ? a.x1 - (a.x1 - a.x0) * 0.04 : a.x0 + (a.x1 - a.x0) * 0.04, lerp(a.y0, a.y1, 0.35 + i * 0.03)]); }
    pts.push([P.cx, c.vy + (c.box(7).y1 - c.vy) * 0.3]);
    for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i], s = (c.box(i).y1 - c.box(i).y0) * 0.05; ctx.fillStyle = "#e8e4d8"; ctx.fillRect(x - s * 0.3, y - s, s * 0.6, s * 2); ctx.strokeStyle = "#6a5a3a"; ctx.lineWidth = 1; ctx.strokeRect(x - s * 0.3, y - s, s * 0.6, s * 2); }
    for (let i = 0; i < pts.length - 1; i++) beam(P, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], u * (1.6 - i * 0.2), "#fff0c8", 1 - i * 0.08);
    for (let i = 1; i < pts.length; i++) V.light(P, pts[i][0], pts[i][1], u * (10 - i), "#ffe8b0", 0.9, false);
    // 祭壇の光の溜まり
    const e = c.box(7);
    V.light(P, P.cx, e.y1, (e.x1 - e.x0) * 3, "#ffd890", 1, false);
    ctx.fillStyle = "#e8dcc0"; ctx.fillRect(P.cx - (e.x1 - e.x0) * 0.25, e.y1 - (e.y1 - e.y0) * 0.25, (e.x1 - e.x0) * 0.5, (e.y1 - e.y0) * 0.25);
    motes(P, 70, "#fff0c8", { x: w * 0.2, y: 0, w: w * 0.6, h: h * 0.8 });
    dim(P, 0.35);
  };

  // ---------------------------------------------------------------- 灰の観測所：星図の天井
  IN.w12_dome_in = (P) => {
    const { w, h, u, ctx, R, cx } = P;
    // 円い部屋：上の大部分が丸天井（内側から見上げる）
    ctx.fillStyle = "#04060c"; ctx.fillRect(0, 0, w, h);
    const dcx = cx, dcy = h * 0.42, rx = w * 0.62, ry = h * 0.62;
    const sky = ctx.createRadialGradient(dcx, dcy, 0, dcx, dcy, Math.max(rx, ry));
    sky.addColorStop(0, "#1a2a5a"); sky.addColorStop(0.55, "#101a3c"); sky.addColorStop(0.9, "#070b1c"); sky.addColorStop(1, "#04060c");
    ctx.fillStyle = sky; ctx.beginPath(); ctx.ellipse(dcx, dcy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    // 天井の肋（放射）と同心の輪（月の巡り）
    ctx.strokeStyle = rgba("#c8a858", 0.35); ctx.lineWidth = Math.max(1, u * 0.2);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(dcx + Math.cos(a) * rx * 0.12, dcy + Math.sin(a) * ry * 0.12); ctx.lineTo(dcx + Math.cos(a) * rx, dcy + Math.sin(a) * ry); ctx.stroke(); }
    for (const k of [0.22, 0.42, 0.66, 0.9]) { ctx.beginPath(); ctx.ellipse(dcx, dcy, rx * k, ry * k, 0, 0, Math.PI * 2); ctx.stroke(); }
    // 輪の刻み（月の満ち欠け）
    ctx.fillStyle = rgba("#e8d8a8", 0.7);
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, r = 0.78; const x = dcx + Math.cos(a) * rx * r, y = dcy + Math.sin(a) * ry * r, s = u * 0.9; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#101a3c"; ctx.beginPath(); ctx.arc(x + s * Math.cos(i / 36 * Math.PI * 2) * 0.9, y, s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = rgba("#e8d8a8", 0.7); }
    // 星と星座の線
    const stars = [];
    for (let i = 0; i < 260; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.95; stars.push([dcx + Math.cos(a) * rx * r, dcy + Math.sin(a) * ry * r, R()]); }
    for (const [x, y, s] of stars) { ctx.fillStyle = rgba(s > 0.9 ? "#ffe8b0" : "#dfe6ff", 0.35 + s * 0.6); ctx.fillRect(x, y, s > 0.85 ? 2.2 : 1.2, s > 0.85 ? 2.2 : 1.2); }
    ctx.strokeStyle = rgba("#e0c070", 0.45); ctx.lineWidth = 1;
    // 星座：明るい星から、近い星を三つ四つ辿る
    const bright = stars.filter((x) => x[2] > 0.8);
    for (let k = 0; k < Math.min(9, bright.length); k++) {
      let cur = bright[k]; const used = new Set([cur]); ctx.beginPath(); ctx.moveTo(cur[0], cur[1]);
      for (let j = 0; j < 4; j++) {
        let best = null, bd = Infinity;
        for (const st of stars) { if (used.has(st)) continue; const d = Math.hypot(st[0] - cur[0], st[1] - cur[1]); if (d > u * 3 && d < bd) { bd = d; best = st; } }
        if (!best || bd > u * 14) break;
        used.add(best); ctx.lineTo(best[0], best[1]); cur = best;
      }
      ctx.stroke();
    }
    // 真ん中の赤い月
    const mr = Math.min(w, h) * 0.07;
    V.light(P, dcx, dcy, mr * 7, "#ff4a2a", 0.9, false);
    const mg = ctx.createRadialGradient(dcx - mr * 0.3, dcy - mr * 0.3, mr * 0.1, dcx, dcy, mr);
    mg.addColorStop(0, "#ff9a6a"); mg.addColorStop(0.6, "#c8301c"); mg.addColorStop(1, "#5a0c08");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(dcx, dcy, mr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba("#ffd0a0", 0.6); ctx.lineWidth = Math.max(1, u * 0.25); ctx.beginPath(); ctx.arc(dcx, dcy, mr * 1.35, 0, Math.PI * 2); ctx.stroke();
    // 下の壁：円い部屋の縁と、床の暦の盤
    const wy = h * 0.8;
    const wg = ctx.createLinearGradient(0, wy - h * 0.1, 0, h);
    wg.addColorStop(0, "#2a2620"); wg.addColorStop(1, "#0c0a08");
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, wy - h * 0.05); ctx.quadraticCurveTo(cx, wy + h * 0.06, w, wy - h * 0.05); ctx.lineTo(w, h); ctx.fill();
    ctx.strokeStyle = rgba("#8a7a58", 0.6); ctx.lineWidth = Math.max(1, u * 0.3);
    ctx.beginPath(); ctx.ellipse(cx, h * 1.02, w * 0.45, h * 0.14, 0, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, h * 1.02, w * 0.3, h * 0.09, 0, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "#c8301c"; ctx.beginPath(); ctx.ellipse(cx + w * 0.12, h * 0.9, u * 1.2, u * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // 壁ぎわの書見台と蝋燭
    V.candle && V.candle(P, w * 0.16, h * 0.9, u * 1.3);
    V.candle && V.candle(P, w * 0.84, h * 0.9, u * 1.1);
    // 星のまたたき
    const tw = stars.filter((s) => s[2] > 0.8).slice(0, 40);
    P.anim.push({ draw: (c, t) => { for (const [x, y, s] of tw) { const a = 0.5 + 0.5 * Math.sin(t * (1 + s * 2) + s * 40); c.fillStyle = rgba("#ffffff", 0.5 * a); c.fillRect(x - 1, y - 1, 3, 3); } } });
    dim(P, 0.3);
  };

  // ---------------------------------------------------------------- 断界の古関：取引の大広間
  IN.w12_gate_in = (P) => {
    const { w, h, u, ctx, R, cx } = P;
    // 奥の広間（天井が高い）
    const r = V.room(P, { wall: "#6a6660", floor: "#4a4640", ceil: "#2a2a30", tex: "stone", floorTex: "stone", backY: h * 0.04, backH: h * 0.66, backW: w * 0.5, amb: 0.45 });
    // 上へ続く巨きな階段（奥の壁の真ん中）
    const sx = cx, sb = r.b, sw = r.w * 0.36;
    for (let i = 0; i < 9; i++) { const t = i / 9; const y = lerp(sb, r.y + r.h * 0.25, t), ww = lerp(sw, sw * 0.55, t), hh = r.h * 0.075; ctx.fillStyle = mix("#8a8680", "#1a1a20", t * 0.6); ctx.fillRect(sx - ww / 2, y - hh, ww, hh); ctx.fillStyle = mix("#4a4640", "#0a0a0c", t * 0.6); ctx.fillRect(sx - ww / 2, y - hh * 0.15, ww, hh * 0.15); }
    // 上から差す青い光
    const top = r.y + r.h * 0.2;
    const lg = ctx.createLinearGradient(0, r.y - h * 0.1, 0, sb);
    lg.addColorStop(0, "rgba(160,210,255,.55)"); lg.addColorStop(1, "rgba(160,210,255,0)");
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(sx - sw * 0.2, r.y - h * 0.05); ctx.lineTo(sx + sw * 0.2, r.y - h * 0.05); ctx.lineTo(sx + sw * 0.6, sb); ctx.lineTo(sx - sw * 0.6, sb); ctx.fill(); ctx.restore();
    V.light(P, sx, top, r.w * 0.5, "#9fd6ff", 0.7, false);
    // 巨きな柱（手前から奥へ）
    for (let i = 0; i < 4; i++) {
      const t = Math.pow(i / 4, 0.75);
      for (const s of [-1, 1]) {
        const x = lerp(s < 0 ? w * 0.13 : w * 0.87, s < 0 ? r.x + r.w * 0.12 : r.x + r.w * 0.88, t), bot = lerp(h * 1.02, r.b, t), pw = lerp(w * 0.06, r.w * 0.04, t);
        const pg = ctx.createLinearGradient(x - pw, 0, x + pw, 0);
        pg.addColorStop(0, mix("#5a5650", "#000", 0.3 + t * 0.3)); pg.addColorStop(0.5, mix("#8a8680", "#000", t * 0.4)); pg.addColorStop(1, mix("#3a3630", "#000", 0.4 + t * 0.3));
        ctx.fillStyle = pg; ctx.fillRect(x - pw, 0, pw * 2, bot);
        // 背丈の刻み目（人の高さは下に一本だけ）
        ctx.fillStyle = rgba("#c8c0b0", 0.5 * (1 - t)); for (let k = 0; k < 4; k++) ctx.fillRect(x - pw * 0.9, bot - (bot - lerp(0, r.y, t)) * (0.12 + k * 0.22), pw * 1.8, Math.max(1, u * 0.25 * (1 - t)));
      }
    }
    // 秤（天井から吊った二つの皿。片方が少し沈んでいる）
    const bx = cx, by = r.y + r.h * 0.12, arm = r.w * 0.42;
    ctx.strokeStyle = "#2a2620"; ctx.lineWidth = Math.max(2, u * 0.6);
    ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, by); ctx.moveTo(bx - arm, by + u * 0.8); ctx.lineTo(bx + arm, by - u * 0.8); ctx.stroke();
    for (const [s, dy] of [[-1, 0.8], [1, -0.8]]) { const px = bx + s * arm, py = by + dy * u; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - u * 3, py + r.h * 0.22); ctx.moveTo(px, py); ctx.lineTo(px + u * 3, py + r.h * 0.22); ctx.stroke(); ctx.fillStyle = "#4a3e30"; ctx.beginPath(); ctx.ellipse(px, py + r.h * 0.22, u * 4, u * 1.1, 0, 0, Math.PI); ctx.fill(); }
    // 手前の開いた大扉（左右の扉の板が内へ開いて、絵の縁を作る）
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 0 : w, x1 = s < 0 ? w * 0.1 : w * 0.9;
      const dg = ctx.createLinearGradient(x0, 0, x1, 0);
      dg.addColorStop(0, "#1a1714"); dg.addColorStop(1, "#3a332a");
      ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(x0, -h * 0.05); ctx.lineTo(x1, h * 0.06); ctx.lineTo(x1, h * 0.96); ctx.lineTo(x0, h * 1.05); ctx.fill();
      ctx.strokeStyle = rgba("#7a6a50", 0.6); ctx.lineWidth = Math.max(1, u * 0.4);
      for (let k = 1; k < 6; k++) { const t = k / 6; ctx.beginPath(); ctx.moveTo(x0, lerp(-h * 0.05, h * 1.05, t)); ctx.lineTo(x1, lerp(h * 0.06, h * 0.96, t)); ctx.stroke(); }
    }
    // 人の背丈の目安（手前の床に、小さな松明が一本）
    V.torch(P, w * 0.24, h * 0.82, u * 1.6, { col: "#ffb060" });
    motes(P, 40, "#cfe8ff", { x: cx - r.w * 0.25, y: r.y, w: r.w * 0.5, h: r.h });
    dim(P, 0.35);
  };

  // ---------------------------------------------------------------- 古い鉄の道：待合の間
  IN.w12_station_in = (P) => {
    const { w, h, u, ctx, R, cx } = P;
    const c = V.corridor(P, { stone: "#5a5a58", torches: false, arches: true, depth: 8, vy: 0.44, endGlow: "#dfe8ff" });
    // 天井の灯り石（並んで奥へ）
    for (let i = 1; i < 8; i++) { const a = c.box(i); const y = a.y0 + (a.y1 - a.y0) * 0.04, s = (a.x1 - a.x0) * 0.025; ctx.fillStyle = "#f2f6ff"; ctx.beginPath(); ctx.ellipse(P.cx, y, s * 2, s * 0.6, 0, 0, Math.PI * 2); ctx.fill(); V.light(P, P.cx, y, s * 26, "#e6eeff", 0.85 - i * 0.07, false); }
    // 乗り場の縁（右）と線路（真ん中から左寄り）
    const f0 = c.box(0), fN = c.box(8);
    ctx.fillStyle = "#7a7874"; ctx.beginPath(); ctx.moveTo(cx + (f0.x1 - cx) * 0.25, h); ctx.lineTo(cx + (fN.x1 - cx) * 0.25, fN.y1); ctx.lineTo(fN.x1, fN.y1); ctx.lineTo(f0.x1, h); ctx.fill();
    ctx.fillStyle = "#e8e0c8"; ctx.beginPath(); ctx.moveTo(cx + (f0.x1 - cx) * 0.25, h); ctx.lineTo(cx + (fN.x1 - cx) * 0.25, fN.y1); ctx.lineTo(cx + (fN.x1 - cx) * 0.27, fN.y1); ctx.lineTo(cx + (f0.x1 - cx) * 0.29, h); ctx.fill();
    ctx.strokeStyle = "#a8a8b0"; ctx.lineWidth = Math.max(1, u * 0.35);
    for (const k of [-0.35, -0.05]) { ctx.beginPath(); ctx.moveTo(cx + (f0.x1 - cx) * k, h); ctx.lineTo(cx + (fN.x1 - cx) * k, fN.y1); ctx.stroke(); }
    // 白い金属の車（左の線路に一列に止まった長い車。手前から奥へ縮む。窓の中に人の形の煤）
    {
      const n0 = 0.35, n1 = 6.5, K = 0.62; // 車の左の端は壁から少し離す（K：壁と真ん中の間のどこか）
      const at = (i) => { const a = c.box(i); const x = lerp(a.x0, cx, 1 - K) , bot = a.y1 - (a.y1 - a.y0) * 0.03, hh = (a.y1 - a.y0) * 0.46; return { x, bot, top: bot - hh, hh }; };
      const p0 = at(n0), p1 = at(n1);
      // 車体の側面
      const bg = ctx.createLinearGradient(0, p0.top, 0, p0.bot);
      bg.addColorStop(0, "#e8e6de"); bg.addColorStop(0.55, "#c8c4b8"); bg.addColorStop(1, "#6a665e");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(p0.x, p0.bot); ctx.lineTo(p0.x, p0.top + p0.hh * 0.12); ctx.quadraticCurveTo(p0.x, p0.top, p0.x + (p1.x - p0.x) * 0.02, p0.top); ctx.lineTo(p1.x, p1.top); ctx.lineTo(p1.x, p1.bot); ctx.closePath(); ctx.fill();
      // 屋根の丸み（上の照り）
      ctx.strokeStyle = rgba("#ffffff", 0.5); ctx.lineWidth = Math.max(1, u * 0.3); ctx.beginPath(); ctx.moveTo(p0.x + u, p0.top + p0.hh * 0.05); ctx.lineTo(p1.x, p1.top + p1.hh * 0.05); ctx.stroke();
      // 継ぎ目と窓
      const M = 22;
      for (let k = 0; k < M; k++) {
        const i0 = lerp(n0, n1, Math.pow(k / M, 1.6)), i1 = lerp(n0, n1, Math.pow((k + 0.62) / M, 1.6));
        const q0 = at(i0), q1 = at(i1);
        if (k % 6 === 5) { ctx.strokeStyle = rgba("#3a3630", 0.7); ctx.lineWidth = Math.max(1, (q0.bot - q0.top) * 0.02); ctx.beginPath(); ctx.moveTo(q0.x, q0.top); ctx.lineTo(q0.x, q0.bot); ctx.stroke(); continue; }
        const wy0 = (q) => q.top + q.hh * 0.22, wy1 = (q) => q.top + q.hh * 0.55;
        const glass = ctx.createLinearGradient(0, wy0(q0), 0, wy1(q0));
        glass.addColorStop(0, "#9aaabb"); glass.addColorStop(1, "#4a5866");
        ctx.fillStyle = glass; ctx.beginPath(); ctx.moveTo(q0.x, wy0(q0)); ctx.lineTo(q1.x, wy0(q1)); ctx.lineTo(q1.x, wy1(q1)); ctx.lineTo(q0.x, wy1(q0)); ctx.fill();
        if ((k * 7) % 3 === 0) { // 座席の人の形の煤（頭と肩だけ。うっすら）
          const mx = lerp(q0.x, q1.x, 0.5), sh = (wy1(q0) - wy0(q0));
          ctx.fillStyle = rgba("#1a1612", 0.55); ctx.beginPath(); ctx.arc(mx, wy1(q0) - sh * 0.55, sh * 0.13, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(mx, wy1(q0), sh * 0.26, sh * 0.22, 0, Math.PI, 0); ctx.fill();
        }
      }
      // 腰の帯と車輪の影
      ctx.fillStyle = rgba("#2a2620", 0.6); ctx.beginPath(); ctx.moveTo(p0.x, p0.top + p0.hh * 0.7); ctx.lineTo(p1.x, p1.top + p1.hh * 0.7); ctx.lineTo(p1.x, p1.top + p1.hh * 0.74); ctx.lineTo(p0.x, p0.top + p0.hh * 0.74); ctx.fill();
      ctx.fillStyle = "#14120e"; ctx.beginPath(); ctx.moveTo(p0.x, p0.bot); ctx.lineTo(p1.x, p1.bot); ctx.lineTo(p1.x, p1.bot + (p1.bot - p1.top) * 0.06); ctx.lineTo(p0.x, p0.bot + (p0.bot - p0.top) * 0.06); ctx.fill();
      // 先頭の顔（手前の切り口：丸い鼻先）
      ctx.fillStyle = "#d8d4c8"; ctx.beginPath(); ctx.moveTo(p0.x, p0.bot); ctx.lineTo(p0.x, p0.top + p0.hh * 0.12); ctx.quadraticCurveTo(p0.x - u * 6, p0.top + p0.hh * 0.1, p0.x - u * 8, p0.top + p0.hh * 0.5); ctx.lineTo(p0.x - u * 8, p0.bot); ctx.fill();
      ctx.fillStyle = "#5a6876"; ctx.beginPath(); ctx.ellipse(p0.x - u * 4, p0.top + p0.hh * 0.35, u * 2.2, u * 1.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    // 右の壁の水の管と栓
    for (let i = 0; i < 3; i++) {
      const a = c.box(i), b = c.box(i + 1), ty = 0.3;
      ctx.strokeStyle = mix("#8a6a3a", "#000", i * 0.25); ctx.lineWidth = Math.max(1.5, (a.y1 - a.y0) * 0.018);
      ctx.beginPath(); ctx.moveTo(a.x1, lerp(a.y0, a.y1, ty)); ctx.lineTo(b.x1, lerp(b.y0, b.y1, ty)); ctx.stroke();
      for (let k = 0; k < 2; k++) { const t = 0.3 + k * 0.4; const x = lerp(a.x1, b.x1, t), y = lerp(lerp(a.y0, a.y1, ty), lerp(b.y0, b.y1, ty), t), s = (a.y1 - a.y0) * 0.02; ctx.fillStyle = mix("#c8a050", "#000", i * 0.25); ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); }
    }
    // 管からの雫
    const a1 = c.box(1);
    P.anim.push({ draw: (cc, t) => { const x = a1.x1 - (a1.x1 - a1.x0) * 0.02, y0 = lerp(a1.y0, a1.y1, 0.32), f = (t * 0.6) % 1; cc.fillStyle = rgba("#cfe0ff", 0.8 * (1 - f)); cc.fillRect(x, y0 + f * (a1.y1 - y0), 2, 4); } });
    dim(P, 0.3);
  };

  // ---------------------------------------------------------------- エル・ナフ遺構の祭壇の下：王の練習部屋の窓から、沈んだ都
  IN.w12_vault_in = (P) => {
    const { w, h, u, ctx, R, cx } = P;
    // 窓の外：土の中の大きな空洞と、沈んだ都
    ctx.fillStyle = "#040406"; ctx.fillRect(0, 0, w, h);
    const wx0 = w * 0.17, wx1 = w * 0.83, wy0 = h * 0.08, wy1 = h * 0.74;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(wx0, wy1); ctx.lineTo(wx0, wy0 + (wy1 - wy0) * 0.35); ctx.quadraticCurveTo(wx0, wy0, cx, wy0); ctx.quadraticCurveTo(wx1, wy0, wx1, wy0 + (wy1 - wy0) * 0.35); ctx.lineTo(wx1, wy1); ctx.closePath(); ctx.clip();
    const cg = ctx.createLinearGradient(0, wy0, 0, wy1);
    cg.addColorStop(0, "#0e0c0a"); cg.addColorStop(0.45, "#141a24"); cg.addColorStop(1, "#1c2838");
    ctx.fillStyle = cg; ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
    // 空洞の天井：土と根
    ctx.strokeStyle = rgba("#3a2e22", 0.9);
    for (let i = 0; i < 22; i++) { const x = wx0 + R() * (wx1 - wx0), l = (wy1 - wy0) * (0.05 + R() * 0.2); ctx.lineWidth = Math.max(1, u * (0.15 + R() * 0.4)); ctx.beginPath(); ctx.moveTo(x, wy0); ctx.quadraticCurveTo(x + (R() - 0.5) * u * 6, wy0 + l * 0.6, x + (R() - 0.5) * u * 4, wy0 + l); ctx.stroke(); }
    // 都（奥ほど小さく霞む。屋根・塔・通りの線）
    const hz = wy0 + (wy1 - wy0) * 0.5;
    for (let row = 0; row < 6; row++) {
      const t = row / 5, y = lerp(hz, wy1 + h * 0.02, t), s = lerp(u * 1.2, u * 5, t), fog = 1 - t;
      const col = mix("#7a8a9a", "#1c2838", fog * 0.75);
      for (let x = wx0 - s; x < wx1 + s; x += s * (1.4 + R() * 1.2)) {
        const bh = s * (1 + R() * 1.6), bw = s * (1 + R() * 0.8);
        ctx.fillStyle = mix(col, "#000", 0.25 + R() * 0.2); ctx.fillRect(x, y - bh, bw, bh);
        ctx.fillStyle = mix(col, "#000", 0.45); ctx.beginPath(); ctx.moveTo(x - bw * 0.1, y - bh); ctx.lineTo(x + bw / 2, y - bh - bw * 0.45); ctx.lineTo(x + bw * 1.1, y - bh); ctx.fill();
        if (R() < 0.12) { const th = bh * (2 + R() * 2); ctx.fillStyle = mix(col, "#000", 0.3); ctx.fillRect(x + bw * 0.3, y - th, bw * 0.4, th); ctx.beginPath(); ctx.moveTo(x + bw * 0.2, y - th); ctx.lineTo(x + bw * 0.5, y - th - bw * 0.8); ctx.lineTo(x + bw * 0.8, y - th); ctx.fill(); }
        if (R() < 0.05 && row > 1) { ctx.fillStyle = rgba("#bcd0e8", 0.5); ctx.fillRect(x + bw * 0.4, y - bh * 0.6, Math.max(1, bw * 0.15), Math.max(1, bw * 0.15)); }
      }
    }
    // 都の真ん中の神殿の屋根（いちばん大きい）
    ctx.fillStyle = "#4a5464"; ctx.beginPath(); ctx.moveTo(cx - w * 0.08, hz + h * 0.04); ctx.lineTo(cx, hz - h * 0.06); ctx.lineTo(cx + w * 0.08, hz + h * 0.04); ctx.fill();
    // 霧の帯
    for (let i = 0; i < 3; i++) { const g = ctx.createLinearGradient(0, hz + i * h * 0.06 - h * 0.03, 0, hz + i * h * 0.06 + h * 0.03); g.addColorStop(0, "rgba(120,140,170,0)"); g.addColorStop(0.5, "rgba(120,140,170,.18)"); g.addColorStop(1, "rgba(120,140,170,0)"); ctx.fillStyle = g; ctx.fillRect(wx0, hz + i * h * 0.06 - h * 0.03, wx1 - wx0, h * 0.06); }
    ctx.restore();
    // 落ちる砂
    P.anim.push({ draw: (c, t) => { c.fillStyle = "rgba(190,170,130,.45)"; for (let i = 0; i < 3; i++) { const x = wx0 + (wx1 - wx0) * (0.22 + i * 0.27), f = (t * (0.15 + i * 0.05) + i * 0.3) % 1; c.fillRect(x, wy0 + (wy1 - wy0) * f * 0.9, 1.2, (wy1 - wy0) * 0.1); } } });
    // 部屋の壁：窓の縁の外は、書き損じで埋まった石の壁
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, h);
    ctx.moveTo(wx0, wy1); ctx.lineTo(wx1, wy1); ctx.lineTo(wx1, wy0 + (wy1 - wy0) * 0.35); ctx.quadraticCurveTo(wx1, wy0, cx, wy0); ctx.quadraticCurveTo(wx0, wy0, wx0, wy0 + (wy1 - wy0) * 0.35); ctx.closePath();
    ctx.clip("evenodd");
    const wg = ctx.createLinearGradient(0, 0, w, 0);
    wg.addColorStop(0, "#2a241c"); wg.addColorStop(0.5, "#4a4032"); wg.addColorStop(1, "#2a241c");
    ctx.fillStyle = wg; ctx.fillRect(0, 0, w, h);
    // 書き損じの字（短い線の列。消した跡の横線）
    for (let y = h * 0.04; y < h * 0.95; y += u * 1.6) {
      for (let x = u; x < w - u; x += u * (1.1 + R() * 0.6)) {
        if (x > wx0 - u && x < wx1 + u && y > wy0 - u && y < wy1 + u) continue;
        ctx.fillStyle = rgba("#14100c", 0.35 + R() * 0.35); ctx.fillRect(x, y, u * (0.4 + R() * 0.5), Math.max(1, u * 0.18));
        if (R() < 0.08) { ctx.strokeStyle = rgba("#14100c", 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - u * 2, y + u * 0.1); ctx.lineTo(x + u * 3, y + u * 0.1); ctx.stroke(); }
      }
    }
    ctx.restore();
    // 窓の石の縁
    ctx.strokeStyle = "#7a6a52"; ctx.lineWidth = Math.max(2, u * 0.9);
    ctx.beginPath(); ctx.moveTo(wx0, wy1); ctx.lineTo(wx0, wy0 + (wy1 - wy0) * 0.35); ctx.quadraticCurveTo(wx0, wy0, cx, wy0); ctx.quadraticCurveTo(wx1, wy0, wx1, wy0 + (wy1 - wy0) * 0.35); ctx.lineTo(wx1, wy1); ctx.stroke();
    // 窓台と練習の机、灯り石
    ctx.fillStyle = "#5a4c3a"; ctx.fillRect(wx0 - u * 2, wy1, wx1 - wx0 + u * 4, h * 0.04);
    ctx.fillStyle = "#2a2018"; ctx.fillRect(w * 0.08, h * 0.84, w * 0.84, h * 0.05); ctx.fillRect(w * 0.12, h * 0.89, w * 0.03, h * 0.11); ctx.fillRect(w * 0.85, h * 0.89, w * 0.03, h * 0.11);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = mix("#d8ccb0", "#6a5e48", i * 0.15); ctx.fillRect(w * (0.2 + i * 0.02), h * 0.835 - i * u * 0.5, w * 0.12, u * 0.45); }
    const lx = w * 0.66, ly = h * 0.82;
    V.light(P, lx, ly, u * 26, "#f4f8ff", 1, false);
    const sg = ctx.createRadialGradient(lx, ly, 0, lx, ly, u * 1.6);
    sg.addColorStop(0, "#ffffff"); sg.addColorStop(1, "#b8c8e0");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(lx, ly, u * 1.6, u * 1.1, 0, 0, Math.PI * 2); ctx.fill();
    P.anim.push({ draw: (c, t) => { const a = 0.12 + 0.06 * Math.sin(t * 0.8); const g = c.createRadialGradient(lx, ly, 0, lx, ly, u * 18); g.addColorStop(0, `rgba(240,246,255,${a})`); g.addColorStop(1, "rgba(240,246,255,0)"); c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = g; c.fillRect(lx - u * 18, ly - u * 18, u * 36, u * 36); c.restore(); } });
    dim(P, 0.25);
  };
})(globalThis.G = globalThis.G || {});
