// 背景の絵。画像ファイルは使わず、場所と時間帯ごとに canvas に描く。
// G.paintScene(canvas, { key, phase, seed, foes: [{ id, shape, eye, boss }] })
// 敵の絵は art_monsters.js の G.paintMonster が描く（無ければ下の影で代わりにする）
// key を足すときは SCENES に関数を1つ足す。レーン A（絵）が管理
(function (G) {
  // ---------------------------------------------------------------- 小道具
  function rng(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
    return () => { s = (s + 0x6d2b79f5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const x = hex(a), y = hex(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

  const SKIES = [
    { top: "#6f8fb8", bot: "#f0c79a", sun: "#fff1c9", night: false },  // 朝
    { top: "#4f7fbf", bot: "#bcd6ec", sun: "#fffbe8", night: false },  // 昼
    { top: "#2c2346", bot: "#e2764a", sun: "#ffc27a", night: false },  // 夕
    { top: "#070b18", bot: "#1f2a48", sun: null, night: true },        // 夜
  ];
  const RED_SKY = { top: "#140304", bot: "#7a1c12", sun: "#ff5a3a", night: true };

  function sky(ctx, w, h, sk, R, redMoon) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sk.top);
    g.addColorStop(1, sk.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (sk.night) {
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.6})`;
        ctx.fillRect(R() * w, R() * h * 0.6, 1.2, 1.2);
      }
    }
    if (sk.night || redMoon) {
      const mx = w * (0.15 + R() * 0.7), my = h * 0.18, mr = h * 0.07;
      ctx.fillStyle = redMoon ? "#e0442e" : "#f1ecd6";
      ctx.shadowColor = redMoon ? "#ff3b1f" : "#fff6d8";
      ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (sk.sun) {
      const sx = w * (0.2 + R() * 0.6), sy = h * (sk.bot === "#e2764a" ? 0.55 : 0.2);
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.35);
      sg.addColorStop(0, rgba(sk.sun, 0.9)); sg.addColorStop(0.15, rgba(sk.sun, 0.5)); sg.addColorStop(1, rgba(sk.sun, 0));
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
    }
  }

  // 山の稜線などの起伏
  function ridge(ctx, w, h, base, amp, rough, color, R) {
    const p = [R() * 9, R() * 9, R() * 9];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const t = x / w;
      const y = base - amp * (0.5 * Math.sin(t * 3 * rough + p[0]) + 0.3 * Math.sin(t * 7 * rough + p[1]) + 0.2 * Math.sin(t * 17 * rough + p[2]));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.fill();
  }
  function peaks(ctx, w, h, base, height, n, color, snow, R) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, base);
    const tops = [];
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * w;
      const top = base - height * (0.4 + R() * 0.6);
      ctx.lineTo(x - w / n / 2, base - R() * height * 0.2);
      ctx.lineTo(x, top);
      tops.push([x, top]);
    }
    ctx.lineTo(w, base);
    ctx.lineTo(w, h);
    ctx.fill();
    if (snow) {
      ctx.fillStyle = snow;
      tops.forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - height * 0.12, y + height * 0.18); ctx.lineTo(x + height * 0.12, y + height * 0.18); ctx.fill(); });
    }
  }
  function pines(ctx, w, base, size, n, color, R) {
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x = R() * w, s = size * (0.6 + R() * 0.7), y = base + R() * size * 0.3;
      ctx.beginPath(); ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x - s * 0.55, y); ctx.lineTo(x + s * 0.55, y); ctx.fill();
      ctx.fillRect(x - s * 0.06, y, s * 0.12, s * 0.3);
    }
  }
  function buildings(ctx, w, base, hmax, color, lit, R, roofs) {
    let x = -10;
    while (x < w) {
      const bw = 20 + R() * 45, bh = hmax * (0.35 + R() * 0.65);
      ctx.fillStyle = color;
      ctx.fillRect(x, base - bh, bw, bh + 2);
      if (roofs) { ctx.beginPath(); ctx.moveTo(x - 3, base - bh); ctx.lineTo(x + bw / 2, base - bh - bw * 0.45); ctx.lineTo(x + bw + 3, base - bh); ctx.fill(); }
      if (lit) {
        for (let wy = base - bh + 8; wy < base - 8; wy += 12) for (let wx = x + 5; wx < x + bw - 6; wx += 10) {
          if (R() < 0.35) { ctx.fillStyle = R() < 0.5 ? "#ffcf6e" : "#ffb04a"; ctx.fillRect(wx, wy, 4, 5); }
        }
      }
      x += bw + R() * 4;
    }
  }
  function tower(ctx, x, base, tw, th, color, roof, flag) {
    ctx.fillStyle = color;
    ctx.fillRect(x - tw / 2, base - th, tw, th);
    ctx.fillStyle = roof || color;
    ctx.beginPath(); ctx.moveTo(x - tw / 2 - 4, base - th); ctx.lineTo(x, base - th - tw * 1.2); ctx.lineTo(x + tw / 2 + 4, base - th); ctx.fill();
    if (flag) { ctx.fillStyle = flag; ctx.fillRect(x, base - th - tw * 1.2 - 14, 1.5, 14); ctx.fillRect(x + 1.5, base - th - tw * 1.2 - 14, 12, 7); }
  }
  function glow(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function particles(ctx, w, h, n, color, size, R) {
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) ctx.fillRect(R() * w, R() * h, size * (0.5 + R()), size * (0.5 + R()));
  }
  function vignette(ctx, w, h, a) {
    const g = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.3, w / 2, h * 0.55, w * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  // 空の色から遠景・中景・近景の色を作る
  const layers = (sk) => [mix(sk.bot, "#1a1e2a", 0.45), mix(sk.bot, "#10131b", 0.7), mix(sk.bot, "#07080c", 0.88)];

  // ---------------------------------------------------------------- 屋外の場面
  const OUT = {
    town(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.6, h * 0.08, 1, far, R);
      buildings(ctx, w, h * 0.78, h * 0.3, mid, sk.night || sk.top === "#2c2346", R, true);
      tower(ctx, w * 0.62, h * 0.78, 18, h * 0.42, mid, mid, "#b0342a");
      buildings(ctx, w, h * 0.93, h * 0.18, near, sk.night, R, true);
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.92, w, h);
    },
    port(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.58, h * 0.05, 1, far, R);
      ctx.fillStyle = mix(sk.bot, "#0d1a2a", 0.55); ctx.fillRect(0, h * 0.62, w, h);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba(sk.sun || "#b8c7e6", 0.15 + R() * 0.2); ctx.fillRect(R() * w, h * (0.64 + R() * 0.3), 20 + R() * 40, 1.5); }
      for (let i = 0; i < 3; i++) {
        const x = w * (0.45 + i * 0.18 + R() * 0.05), y = h * (0.7 + R() * 0.08);
        ctx.fillStyle = mid; ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.lineTo(x + 40, y); ctx.lineTo(x + 30, y + 12); ctx.lineTo(x - 30, y + 12); ctx.fill();
        ctx.fillRect(x - 1, y - 60, 2, 60); ctx.fillRect(x - 22, y - 50, 44, 1.5);
        ctx.beginPath(); ctx.moveTo(x + 2, y - 55); ctx.lineTo(x + 26, y - 20); ctx.lineTo(x + 2, y - 20); ctx.fill();
      }
      buildings(ctx, w * 0.4, h * 0.8, h * 0.28, near, sk.night, R, true);
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.8, w * 0.42, h);
      if (sk.night) glow(ctx, w * 0.3, h * 0.6, 120, "#dfe8ff", 0.12);
    },
    castle(ctx, w, h, sk, R, opt) {
      const [far, mid, near] = layers(sk);
      const stone = opt && opt.stone ? mix(opt.stone, mid, 0.5) : mid;
      ridge(ctx, w, h, h * 0.66, h * 0.1, 1, far, R);
      const cx = w * 0.5, base = h * 0.8;
      ctx.fillStyle = stone; ctx.fillRect(cx - w * 0.28, base - h * 0.2, w * 0.56, h * 0.2);
      for (let x = cx - w * 0.28; x < cx + w * 0.28; x += 12) ctx.fillRect(x, base - h * 0.2 - 6, 7, 6);
      tower(ctx, cx, base - h * 0.2, 44, h * 0.3, stone, stone, "#e8e3d0");
      tower(ctx, cx - w * 0.2, base - h * 0.2, 26, h * 0.16, stone, stone, "#b0342a");
      tower(ctx, cx + w * 0.2, base - h * 0.2, 26, h * 0.16, stone, stone, "#b0342a");
      if (sk.night) for (let i = 0; i < 12; i++) { ctx.fillStyle = "#ffcf6e"; ctx.fillRect(cx - w * 0.25 + R() * w * 0.5, base - h * 0.18 + R() * h * 0.1, 3, 5); }
      ridge(ctx, w, h, h * 0.93, h * 0.04, 1, near, R);
      if (opt && opt.snow) { ctx.fillStyle = "rgba(240,245,255,.85)"; ctx.fillRect(0, h * 0.9, w, h); particles(ctx, w, h, 160, "rgba(255,255,255,.7)", 2, R); }
    },
    snowcity(ctx, w, h, sk, R) { OUT.castle(ctx, w, h, sk, R, { snow: true, stone: "#232226" }); },
    fort(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      peaks(ctx, w, h, h * 0.62, h * 0.4, 5, far, rgba("#e9eef6", 0.35), R);
      const top = h * 0.52;
      ctx.fillStyle = mid; ctx.fillRect(0, top, w, h);
      for (let x = 0; x < w; x += 16) ctx.fillRect(x, top - 8, 9, 8);
      tower(ctx, w * 0.5, top, 60, h * 0.18, mid, mid);
      for (let i = 0; i < 6; i++) { const x = w * (0.1 + i * 0.16); glow(ctx, x, top + 16, 26, "#ff9a3a", 0.5); ctx.fillStyle = "#ffcf6e"; ctx.fillRect(x - 1, top + 12, 2, 5); }
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.9, w, h);
    },
    magic(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.68, h * 0.06, 1, far, R);
      for (let i = 0; i < 5; i++) { const x = w * (0.15 + i * 0.18), th = h * (0.3 + R() * 0.3); ctx.fillStyle = mid; ctx.fillRect(x - 7, h * 0.8 - th, 14, th); ctx.beginPath(); ctx.moveTo(x - 10, h * 0.8 - th); ctx.lineTo(x, h * 0.8 - th - 40); ctx.lineTo(x + 10, h * 0.8 - th); ctx.fill(); }
      for (let i = 0; i < 7; i++) {
        const x = w * (0.1 + R() * 0.8), y = h * (0.15 + R() * 0.35), s = 8 + R() * 14;
        glow(ctx, x, y, s * 4, "#7fe3ff", 0.35);
        ctx.fillStyle = "#bff4ff"; ctx.beginPath(); ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s * 0.7, y); ctx.lineTo(x, y + s * 1.6); ctx.lineTo(x - s * 0.7, y); ctx.fill();
      }
      buildings(ctx, w, h * 0.92, h * 0.14, near, true, R, false);
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.91, w, h);
    },
    yakumo(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.6, h * 0.1, 1, far, R);
      const px = w * 0.72, base = h * 0.82;
      for (let i = 0; i < 5; i++) {
        const tw = 70 - i * 11, y = base - i * 26;
        ctx.fillStyle = mid; ctx.fillRect(px - tw / 2 + 8, y - 20, tw - 16, 20);
        ctx.beginPath(); ctx.moveTo(px - tw / 2 - 8, y - 18); ctx.quadraticCurveTo(px, y - 34, px + tw / 2 + 8, y - 18); ctx.lineTo(px + tw / 2 - 4, y - 22); ctx.lineTo(px - tw / 2 + 4, y - 22); ctx.fill();
      }
      const tx = w * 0.3, ty = base;
      ctx.fillStyle = "#b8321f";
      ctx.fillRect(tx - 34, ty - 70, 6, 70); ctx.fillRect(tx + 28, ty - 70, 6, 70);
      ctx.fillRect(tx - 46, ty - 76, 92, 7); ctx.fillRect(tx - 38, ty - 60, 76, 5);
      for (let i = 0; i < 8; i++) { const x = w * (0.05 + i * 0.12), y = h * 0.75 + R() * 10; glow(ctx, x, y, 22, "#ff8a3a", 0.55); ctx.fillStyle = "#ff9b4a"; ctx.fillRect(x - 4, y - 6, 8, 11); }
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.9, w, h);
    },
    // W1：聖都サンクタ（白い城壁と、光の輪を戴く大聖堂）
    w1_holy(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      const stone = mix(sk.bot, "#e8e2d2", sk.night ? 0.25 : 0.55), gold = sk.night ? "#b89a4a" : "#e0c060";
      ridge(ctx, w, h, h * 0.64, h * 0.06, 1, far, R);
      buildings(ctx, w, h * 0.8, h * 0.22, mix(stone, mid, 0.45), sk.night, R, true);
      const cx = w * 0.5, base = h * 0.8;
      ctx.fillStyle = stone; ctx.fillRect(cx - w * 0.16, base - h * 0.3, w * 0.32, h * 0.3);
      ctx.beginPath(); ctx.moveTo(cx - w * 0.17, base - h * 0.3); ctx.lineTo(cx, base - h * 0.44); ctx.lineTo(cx + w * 0.17, base - h * 0.3); ctx.fill();
      for (const sx of [-1, 1]) tower(ctx, cx + sx * w * 0.13, base - h * 0.3, 16, h * 0.22, stone, gold);
      ctx.fillStyle = mix(stone, "#000000", 0.5); ctx.beginPath(); ctx.arc(cx, base - h * 0.12, h * 0.07, Math.PI, 0); ctx.fillRect(cx - h * 0.07, base - h * 0.12, h * 0.14, h * 0.12); ctx.fill();
      const rw = ["#c2412f", "#2f63c2", "#e0b43a"];
      for (let i = 0; i < 9; i++) { ctx.fillStyle = rgba(rw[i % 3], sk.night ? 0.9 : 0.7); const a = (i / 9) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, base - h * 0.23); ctx.arc(cx, base - h * 0.23, h * 0.045, a, a + Math.PI / 4.5); ctx.fill(); }
      // 大聖堂の上に浮かぶ光の輪（聖女の印）
      glow(ctx, cx, base - h * 0.5, h * 0.22, "#fff1c9", sk.night ? 0.5 : 0.35);
      ctx.strokeStyle = rgba("#fff6d8", 0.85); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, base - h * 0.5, h * 0.09, h * 0.025, 0, 0, Math.PI * 2); ctx.stroke();
      // 参道の巡礼者の列
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.9, w, h);
      for (let i = 0; i < 14; i++) { const x = w * (0.08 + i * 0.06) + R() * 6, y = h * 0.905; ctx.beginPath(); ctx.arc(x, y - 13, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - 11); ctx.lineTo(x + 5, y); ctx.fill(); }
    },
    // W1：サンクタの地下墓地の入口（墓標の丘と、骨の口を開けた霊廟）
    w1_catacomb(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = "rgba(10,12,18,.35)"; ctx.fillRect(0, 0, w, h);
      ridge(ctx, w, h, h * 0.6, h * 0.05, 1, far, R);
      tower(ctx, w * 0.82, h * 0.6, 14, h * 0.2, far, far); tower(ctx, w * 0.9, h * 0.6, 10, h * 0.14, far, far);
      ridge(ctx, w, h, h * 0.76, h * 0.05, 0.7, mid, R);
      ctx.fillStyle = mid;
      for (let i = 0; i < 26; i++) { const x = R() * w, y = h * (0.74 + R() * 0.14), s = 5 + R() * 7; ctx.fillRect(x - 1, y - s * 2, 2.5, s * 2); ctx.fillRect(x - s * 0.6, y - s * 1.5, s * 1.2 + 1, 2.5); }
      const cx = w * 0.4, base = h * 0.9;
      ctx.fillStyle = near; ctx.fillRect(cx - 70, base - 80, 140, 80);
      ctx.beginPath(); ctx.moveTo(cx - 80, base - 80); ctx.lineTo(cx, base - 125); ctx.lineTo(cx + 80, base - 80); ctx.fill();
      ctx.fillRect(cx - 3, base - 150, 6, 30); ctx.fillRect(cx - 12, base - 142, 24, 5);
      ctx.fillStyle = "#050406"; ctx.beginPath(); ctx.arc(cx, base - 40, 28, Math.PI, 0); ctx.fillRect(cx - 28, base - 40, 56, 40); ctx.fill();
      ctx.fillStyle = "#cfc6b0";
      for (let i = 0; i < 7; i++) { const a = Math.PI + (i + 0.5) * (Math.PI / 7); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 33, base - 40 + Math.sin(a) * 33, 4.5, 0, Math.PI * 2); ctx.fill(); }
      for (const sx of [-1, 1]) { const x = cx + sx * 50; glow(ctx, x, base - 30, 30, "#ffb04a", 0.6); ctx.fillStyle = "#ffe0a0"; ctx.fillRect(x - 2, base - 34, 4, 8); }
      glow(ctx, cx, base - 20, 40, "#7dffb0", 0.18);
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.9, w, h);
      particles(ctx, w, h * 0.9, 50, "rgba(200,210,220,.12)", 3, R);
    },
    // W1：八雲の朧島（夜の明けない祭りの島。欠けた月には歯型）
    w1_oboro(ctx, w, h, sk, R) {
      const night = SKIES[3];
      const sg = ctx.createLinearGradient(0, 0, 0, h);
      sg.addColorStop(0, night.top); sg.addColorStop(1, "#2a1e3a");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
      particles(ctx, w, h * 0.55, 90, "rgba(255,255,255,.55)", 1.2, R);
      const [far, mid, near] = layers(night);
      const mx = w * 0.78, my = h * 0.2, mr = h * 0.09;
      glow(ctx, mx, my, mr * 4, "#ffe8b0", 0.25);
      ctx.fillStyle = "#f6e6c0"; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = night.top; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(mx + mr * 0.9, my - mr * 0.5 + i * mr * 0.5, mr * 0.28, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = mix(night.bot, "#0d1a2a", 0.4); ctx.fillRect(0, h * 0.66, w, h);
      for (let i = 0; i < 30; i++) { ctx.fillStyle = rgba("#ffb46a", 0.1 + R() * 0.2); ctx.fillRect(R() * w, h * (0.68 + R() * 0.2), 14 + R() * 30, 1.5); }
      ctx.fillStyle = "#0c0f18"; ctx.beginPath(); ctx.moveTo(w * 0.02, h * 0.68); ctx.quadraticCurveTo(w * 0.32, h * 0.06, w * 0.6, h * 0.68); ctx.fill();
      ctx.fillStyle = mid; ctx.fillRect(w * 0.29, h * 0.39, 26, 12); ctx.beginPath(); ctx.moveTo(w * 0.29 - 8, h * 0.39); ctx.quadraticCurveTo(w * 0.29 + 13, h * 0.33, w * 0.29 + 34, h * 0.39); ctx.fill();
      for (let i = 0; i < 14; i++) { const t = i / 13, x = w * (0.1 + t * 0.2), y = h * (0.66 - t * 0.25); glow(ctx, x, y, 12, "#ff8a3a", 0.6); ctx.fillStyle = "#ff9b4a"; ctx.fillRect(x - 2, y - 3, 4, 6); }
      const yx = w * 0.62, yb = h * 0.86;
      ctx.strokeStyle = near; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(yx - 26, yb); ctx.lineTo(yx - 16, yb - 70); ctx.moveTo(yx + 26, yb); ctx.lineTo(yx + 16, yb - 70); ctx.moveTo(yx - 22, yb - 35); ctx.lineTo(yx + 22, yb - 35); ctx.stroke();
      ctx.fillStyle = near; ctx.fillRect(yx - 24, yb - 74, 48, 6); ctx.beginPath(); ctx.moveTo(yx - 30, yb - 74); ctx.lineTo(yx, yb - 92); ctx.lineTo(yx + 30, yb - 74); ctx.fill();
      for (let i = 0; i < 9; i++) { const x = yx - 150 + i * 38, y = yb - 78 + Math.abs(i - 4) * 9; glow(ctx, x, y, 16, "#ff6a3a", 0.55); ctx.fillStyle = i % 2 ? "#ff9b4a" : "#ffd36a"; ctx.fillRect(x - 3, y - 4, 6, 8); }
      const tx = w * 0.14, ty = h * 0.9;
      ctx.fillStyle = "#b8321f"; ctx.fillRect(tx - 24, ty - 52, 5, 52); ctx.fillRect(tx + 19, ty - 52, 5, 52); ctx.fillRect(tx - 32, ty - 57, 64, 6); ctx.fillRect(tx - 26, ty - 44, 52, 4);
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.9, w, h);
      for (let i = 0; i < 5; i++) { const x = w * (0.3 + R() * 0.5), y = h * 0.9; ctx.beginPath(); ctx.arc(x, y - 12, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - 10); ctx.lineTo(x + 5, y); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 3, y - 4); ctx.quadraticCurveTo(x + 14, y - 8, x + 10, y - 16); ctx.lineTo(x + 6, y - 5); ctx.fill(); }
    },
    forest(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.58, h * 0.06, 1, far, R);
      pines(ctx, w, h * 0.68, h * 0.12, 40, mix(far, mid, 0.5), R);
      pines(ctx, w, h * 0.82, h * 0.17, 22, mid, R);
      pines(ctx, w, h * 1.02, h * 0.28, 9, near, R);
      if (!sk.night) for (let i = 0; i < 5; i++) { ctx.fillStyle = rgba(sk.sun || "#fff", 0.07); ctx.beginPath(); const x = R() * w; ctx.moveTo(x, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 110, h); ctx.lineTo(x + 60, h); ctx.fill(); }
    },
    plains(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.62, h * 0.05, 1, far, R);
      ridge(ctx, w, h, h * 0.75, h * 0.07, 0.6, mix(sk.bot, "#2d3a24", 0.6), R);
      ctx.fillStyle = mix(sk.bot, "#b69d6c", 0.4);
      ctx.beginPath(); ctx.moveTo(w * 0.45, h * 0.72); ctx.quadraticCurveTo(w * 0.35, h * 0.85, w * 0.2, h); ctx.lineTo(w * 0.45, h); ctx.quadraticCurveTo(w * 0.5, h * 0.85, w * 0.48, h * 0.72); ctx.fill();
      pines(ctx, w, h * 0.8, h * 0.1, 5, mid, R);
      ridge(ctx, w, h, h * 0.95, h * 0.03, 1, near, R);
    },
    snow(ctx, w, h, sk, R) {
      const [far, mid] = layers(sk);
      peaks(ctx, w, h, h * 0.62, h * 0.3, 6, far, "rgba(240,245,255,.6)", R);
      ctx.fillStyle = "#dfe6ef"; ctx.fillRect(0, h * 0.7, w, h);
      pines(ctx, w, h * 0.8, h * 0.14, 16, mid, R);
      particles(ctx, w, h, 260, "rgba(255,255,255,.8)", 2.2, R);
      ctx.fillStyle = "rgba(220,230,245,.25)"; ctx.fillRect(0, 0, w, h);
    },
    swamp(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.62, h * 0.05, 1, far, R);
      ctx.fillStyle = mix(sk.bot, "#1d2a1a", 0.7); ctx.fillRect(0, h * 0.7, w, h);
      for (let i = 0; i < 30; i++) { ctx.fillStyle = "rgba(160,220,120,.12)"; ctx.fillRect(R() * w, h * (0.72 + R() * 0.25), 30 + R() * 50, 2); }
      ctx.strokeStyle = mid; ctx.lineWidth = 4;
      for (let i = 0; i < 6; i++) {
        const x = R() * w, y = h * 0.85; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5, y - h * 0.4);
        ctx.moveTo(x + 3, y - h * 0.25); ctx.lineTo(x + 30, y - h * 0.35); ctx.moveTo(x + 4, y - h * 0.3); ctx.lineTo(x - 22, y - h * 0.42); ctx.stroke();
      }
      ctx.fillStyle = "rgba(190,210,170,.18)"; for (let i = 0; i < 6; i++) ctx.fillRect(0, h * (0.6 + i * 0.05), w, h * 0.03);
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.95, w, h);
    },
    mountain(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      peaks(ctx, w, h, h * 0.55, h * 0.45, 4, far, "rgba(240,245,255,.7)", R);
      peaks(ctx, w, h, h * 0.78, h * 0.35, 6, mid, "rgba(230,238,250,.4)", R);
      ridge(ctx, w, h, h * 0.95, h * 0.05, 1.5, near, R);
      for (let i = 0; i < 3; i++) { const x = w * (0.2 + R() * 0.6), y = h * (0.15 + R() * 0.2); ctx.fillStyle = near; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 18, y - 6); ctx.lineTo(x - 6, y + 2); ctx.lineTo(x + 6, y + 2); ctx.lineTo(x + 18, y - 6); ctx.fill(); }
    },
    ruins(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.66, h * 0.06, 1, far, R);
      for (let i = 0; i < 7; i++) {
        const x = w * (0.08 + i * 0.14), ch = h * (0.15 + R() * 0.35);
        ctx.fillStyle = mid; ctx.fillRect(x - 9, h * 0.85 - ch, 18, ch); ctx.fillRect(x - 13, h * 0.85 - ch - 5, 26, 6);
      }
      ctx.strokeStyle = mid; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.62, h * 0.18, Math.PI, Math.PI * 1.65); ctx.stroke();
      ridge(ctx, w, h, h * 0.92, h * 0.03, 2, near, R);
    },
    bones(ctx, w, h, sk, R) {
      const [far, , near] = layers(sk);
      peaks(ctx, w, h, h * 0.6, h * 0.3, 5, far, null, R);
      ctx.strokeStyle = "#cfc6b0"; ctx.lineWidth = 7;
      for (let i = 0; i < 6; i++) { const x = w * 0.3 + i * 34; ctx.beginPath(); ctx.moveTo(x, h * 0.88); ctx.quadraticCurveTo(x + 40, h * 0.3, x + 90, h * 0.4); ctx.stroke(); }
      ctx.fillStyle = "#cfc6b0"; ctx.beginPath(); ctx.ellipse(w * 0.18, h * 0.8, 50, 26, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = near; ctx.beginPath(); ctx.arc(w * 0.16, h * 0.78, 7, 0, Math.PI * 2); ctx.fill();
      ridge(ctx, w, h, h * 0.94, h * 0.03, 2, near, R);
      ctx.fillStyle = "rgba(20,30,20,.25)"; ctx.fillRect(0, 0, w, h);
    },
    realm(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(RED_SKY);
      ridge(ctx, w, h, h * 0.66, h * 0.08, 1.2, far, R);
      ctx.fillStyle = mid;
      for (let i = 0; i < 9; i++) { const x = R() * w, sh = h * (0.2 + R() * 0.45); ctx.beginPath(); ctx.moveTo(x - 10, h * 0.85); ctx.lineTo(x + (R() - 0.5) * 30, h * 0.85 - sh); ctx.lineTo(x + 10, h * 0.85); ctx.fill(); }
      ridge(ctx, w, h, h * 0.9, h * 0.04, 2, near, R);
      particles(ctx, w, h, 220, "rgba(180,170,160,.55)", 2, R);
      glow(ctx, w * 0.5, h, h * 0.8, "#ff4a1f", 0.25);
    },
    majin(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(RED_SKY);
      ridge(ctx, w, h, h * 0.72, h * 0.06, 1, far, R);
      const cx = w * 0.5;
      ctx.fillStyle = near;
      ctx.fillRect(cx - 90, h * 0.35, 180, h * 0.6);
      for (let i = -3; i <= 3; i++) { const x = cx + i * 32, th = h * (0.45 + (3 - Math.abs(i)) * 0.08); ctx.beginPath(); ctx.moveTo(x - 12, h * 0.5); ctx.lineTo(x, h * 0.5 - th * 0.6); ctx.lineTo(x + 12, h * 0.5); ctx.fill(); }
      for (let i = 0; i < 10; i++) { ctx.fillStyle = "#ff3a1f"; ctx.fillRect(cx - 80 + R() * 160, h * 0.45 + R() * h * 0.35, 4, 7); }
      glow(ctx, cx, h * 0.6, h * 0.6, "#ff2a1a", 0.25);
      ctx.fillStyle = mid; ctx.fillRect(0, h * 0.92, w, h);
      particles(ctx, w, h, 160, "rgba(180,170,160,.5)", 2, R);
    },
  };

  // ---------------------------------------------------------------- 室内・迷宮の中
  function interior(ctx, w, h, wall, floor, R) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, mix(wall, "#000000", 0.35)); g.addColorStop(0.7, wall); g.addColorStop(0.71, floor); g.addColorStop(1, mix(floor, "#000000", 0.4));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = mix(wall, "#000000", 0.55);
    for (let x = 0; x < w; x += 90 + R() * 30) ctx.fillRect(x, 0, 10, h * 0.71);
    ctx.fillRect(0, h * 0.08, w, 10);
  }
  const IN = {
    inn(ctx, w, h, R) { interior(ctx, w, h, "#6b4a2e", "#3a2716", R); glow(ctx, w * 0.2, h * 0.35, 140, "#ffb45a", 0.45); ctx.fillStyle = "#26170c"; ctx.fillRect(w * 0.45, h * 0.52, w * 0.4, h * 0.2); ctx.fillRect(w * 0.1, h * 0.62, 70, 10); },
    tavern(ctx, w, h, R) {
      interior(ctx, w, h, "#5a3a22", "#2f1d10", R);
      for (let i = 0; i < 4; i++) glow(ctx, w * (0.15 + i * 0.25), h * 0.25, 110, "#ffae4a", 0.4);
      ctx.fillStyle = "#1e120a";
      for (let i = 0; i < 4; i++) { const x = w * (0.12 + i * 0.24); ctx.beginPath(); ctx.ellipse(x, h * 0.72, 48, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 4, h * 0.72, 8, h * 0.2); for (let j = 0; j < 3; j++) { ctx.fillRect(x - 30 + j * 22, h * 0.62, 10, 12); } }
      for (let i = 0; i < 6; i++) { const x = R() * w; ctx.beginPath(); ctx.arc(x, h * 0.55, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 15, h * 0.57, 30, h * 0.2); }
    },
    shop(ctx, w, h, R) {
      interior(ctx, w, h, "#4d4232", "#2a2319", R); glow(ctx, w * 0.5, h * 0.2, 180, "#ffcf7a", 0.35);
      ctx.fillStyle = "#1c160f";
      for (let s = 0; s < 3; s++) { const y = h * (0.22 + s * 0.16); ctx.fillRect(w * 0.05, y, w * 0.9, 5); for (let i = 0; i < 18; i++) { const x = w * 0.06 + i * (w * 0.05); const ih = 10 + R() * 22; ctx.fillRect(x, y - ih, 12 + R() * 10, ih); } }
      ctx.fillRect(w * 0.2, h * 0.7, w * 0.6, h * 0.08);
    },
    guild(ctx, w, h, R) {
      interior(ctx, w, h, "#3f4a52", "#232a2f", R); glow(ctx, w * 0.5, h * 0.3, 200, "#ffe2a0", 0.3);
      ctx.fillStyle = "#2a1c10"; ctx.fillRect(w * 0.18, h * 0.16, w * 0.64, h * 0.44);
      for (let i = 0; i < 16; i++) { ctx.fillStyle = mix("#e8dcc0", "#b8a888", R()); ctx.save(); ctx.translate(w * 0.22 + (i % 8) * w * 0.07, h * 0.2 + Math.floor(i / 8) * h * 0.2); ctx.rotate((R() - 0.5) * 0.2); ctx.fillRect(0, 0, w * 0.05, h * 0.14); ctx.restore(); }
      ctx.fillStyle = "#151a1e"; ctx.fillRect(0, h * 0.72, w, h * 0.06);
    },
    church(ctx, w, h, R) {
      interior(ctx, w, h, "#5c5a60", "#2c2b30", R);
      const cx = w * 0.5;
      ctx.fillStyle = "#15141a"; ctx.beginPath(); ctx.arc(cx, h * 0.34, h * 0.22, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - h * 0.22, h * 0.34, h * 0.44, h * 0.2);
      const cols = ["#c2412f", "#2f63c2", "#e0b43a", "#3a9a5a"];
      for (let i = 0; i < 12; i++) { ctx.fillStyle = rgba(cols[i % 4], 0.8); const a = Math.PI + (i / 12) * Math.PI; ctx.beginPath(); ctx.moveTo(cx, h * 0.34); ctx.arc(cx, h * 0.34, h * 0.2, a, a + Math.PI / 12); ctx.fill(); }
      glow(ctx, cx, h * 0.5, h * 0.8, "#ffeec2", 0.3);
      ctx.fillStyle = "#1a1714"; for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.1, h * (0.66 + i * 0.07), w * 0.8, 6);
    },
    train(ctx, w, h, R) {
      interior(ctx, w, h, "#5b4c38", "#6b5a3e", R); glow(ctx, w * 0.5, h * 0.1, 220, "#fff0c9", 0.4);
      ctx.fillStyle = "#2a2015";
      for (let i = 0; i < 4; i++) { const x = w * (0.15 + i * 0.23); ctx.fillRect(x - 3, h * 0.45, 6, h * 0.35); ctx.fillRect(x - 22, h * 0.52, 44, 6); ctx.beginPath(); ctx.arc(x, h * 0.42, 10, 0, Math.PI * 2); ctx.fill(); }
    },
    alley(ctx, w, h, R) {
      ctx.fillStyle = "#0b0d12"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#1b2029"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.38, h * 0.2); ctx.lineTo(w * 0.38, h * 0.8); ctx.lineTo(0, h); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w * 0.62, h * 0.2); ctx.lineTo(w * 0.62, h * 0.8); ctx.lineTo(w, h); ctx.fill();
      glow(ctx, w * 0.6, h * 0.35, 90, "#ffb04a", 0.55); ctx.fillStyle = "#ffcf6e"; ctx.fillRect(w * 0.6 - 3, h * 0.33, 6, 8);
      ctx.fillStyle = "#050608"; ctx.beginPath(); ctx.arc(w * 0.45, h * 0.55, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(w * 0.45 - 12, h * 0.57, 24, h * 0.25);
    },
    throne(ctx, w, h, R) {
      interior(ctx, w, h, "#d8d2c4", "#8a7f6a", R);
      ctx.fillStyle = "#8f2020"; ctx.beginPath(); ctx.moveTo(w * 0.45, h * 0.71); ctx.lineTo(w * 0.55, h * 0.71); ctx.lineTo(w * 0.7, h); ctx.lineTo(w * 0.3, h); ctx.fill();
      ctx.fillStyle = "#b39a52"; ctx.fillRect(w * 0.46, h * 0.38, w * 0.08, h * 0.33); ctx.beginPath(); ctx.arc(w * 0.5, h * 0.38, w * 0.04, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.25)"; for (let i = 0; i < 4; i++) { ctx.fillRect(w * (0.08 + i * 0.1), 0, 14, h * 0.71); ctx.fillRect(w * (0.62 + i * 0.1), 0, 14, h * 0.71); }
    },
    dungeon(ctx, w, h, R) {
      ctx.fillStyle = "#0c0b0d"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) {
        const s = 1 - i * 0.17, aw = w * 0.7 * s, ah = h * 0.9 * s;
        ctx.strokeStyle = mix("#4a4440", "#0c0b0d", i * 0.22); ctx.lineWidth = 16 * s;
        ctx.beginPath(); ctx.moveTo(w / 2 - aw / 2, h / 2 + ah / 2); ctx.lineTo(w / 2 - aw / 2, h / 2 - ah * 0.1); ctx.arc(w / 2, h / 2 - ah * 0.1, aw / 2, Math.PI, 0); ctx.lineTo(w / 2 + aw / 2, h / 2 + ah / 2); ctx.stroke();
      }
      glow(ctx, w * 0.2, h * 0.4, 70, "#ff9a3a", 0.6); glow(ctx, w * 0.8, h * 0.4, 70, "#ff9a3a", 0.6);
      ctx.fillStyle = "#ffcf6e"; ctx.fillRect(w * 0.2 - 2, h * 0.38, 4, 7); ctx.fillRect(w * 0.8 - 2, h * 0.38, 4, 7);
    },
    cave(ctx, w, h, R) {
      ctx.fillStyle = "#0d0c0b"; ctx.fillRect(0, 0, w, h);
      glow(ctx, w * 0.5, h * 0.6, w * 0.5, "#6a5a48", 0.5);
      ctx.fillStyle = "#050404";
      for (let i = 0; i < 18; i++) { const x = R() * w, l = 20 + R() * h * 0.3; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x, l); ctx.lineTo(x + 10, 0); ctx.fill(); }
      ridge(ctx, w, h, h * 0.9, h * 0.06, 3, "#050404", R);
      glow(ctx, w * 0.3, h * 0.55, 60, "#ff7a2a", 0.5);
    },
  };

  // ---------------------------------------------------------------- 敵の影
  function foe(ctx, x, base, s, shape, eye) {
    ctx.fillStyle = "#050507";
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 20;
    const eyes = (ex, ey, d) => { ctx.shadowBlur = 12; ctx.shadowColor = eye; ctx.fillStyle = eye; ctx.fillRect(ex - d - 2, ey, 4, 3); ctx.fillRect(ex + d - 2, ey, 4, 3); ctx.fillStyle = "#050507"; ctx.shadowBlur = 20; ctx.shadowColor = "rgba(0,0,0,.6)"; };
    if (shape === "small" || shape === "humanoid" || shape === "giant") {
      const k = shape === "small" ? 0.6 : shape === "giant" ? 1.5 : 1;
      const H = s * k;
      ctx.beginPath(); ctx.arc(x, base - H * 0.86, H * 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - H * 0.2, base - H * 0.74); ctx.lineTo(x + H * 0.2, base - H * 0.74); ctx.lineTo(x + H * 0.14, base - H * 0.35); ctx.lineTo(x - H * 0.14, base - H * 0.35); ctx.fill();
      ctx.fillRect(x - H * 0.13, base - H * 0.36, H * 0.1, H * 0.36); ctx.fillRect(x + H * 0.03, base - H * 0.36, H * 0.1, H * 0.36);
      ctx.save(); ctx.translate(x + H * 0.2, base - H * 0.72); ctx.rotate(0.5); ctx.fillRect(0, 0, H * 0.07, H * 0.4); ctx.restore();
      ctx.save(); ctx.translate(x - H * 0.2, base - H * 0.72); ctx.rotate(-0.5); ctx.fillRect(-H * 0.07, 0, H * 0.07, H * 0.4); ctx.restore();
      eyes(x, base - H * 0.88, H * 0.04);
    } else if (shape === "beast") {
      ctx.beginPath(); ctx.ellipse(x, base - s * 0.35, s * 0.45, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - s * 0.45, base - s * 0.45, s * 0.14, s * 0.1, -0.3, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 4; i++) ctx.fillRect(x - s * 0.35 + i * s * 0.22, base - s * 0.25, s * 0.06, s * 0.25);
      eyes(x - s * 0.5, base - s * 0.48, s * 0.03);
    } else if (shape === "blob") {
      ctx.beginPath(); ctx.ellipse(x, base - s * 0.25, s * 0.4, s * 0.28, 0, Math.PI, 0); ctx.lineTo(x + s * 0.4, base); ctx.lineTo(x - s * 0.4, base); ctx.fill();
      eyes(x, base - s * 0.32, s * 0.08);
    } else if (shape === "swarm") {
      for (let i = 0; i < 5; i++) { const px = x + (i - 2) * s * 0.28, h2 = s * (0.4 + (i % 2) * 0.15); ctx.beginPath(); ctx.arc(px, base - h2, s * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(px - s * 0.06, base - h2 + s * 0.05, s * 0.12, h2 - s * 0.05); eyes(px, base - h2 - 2, s * 0.02); }
    } else if (shape === "winged" || shape === "dragon") {
      const k = shape === "dragon" ? 1.6 : 1;
      const S = s * k;
      ctx.beginPath(); ctx.ellipse(x, base - S * 0.45, S * 0.3, S * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - S * 0.1, base - S * 0.5); ctx.lineTo(x - S * 0.8, base - S * 0.95); ctx.lineTo(x - S * 0.55, base - S * 0.5); ctx.lineTo(x - S * 0.7, base - S * 0.45); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + S * 0.1, base - S * 0.5); ctx.lineTo(x + S * 0.8, base - S * 0.95); ctx.lineTo(x + S * 0.55, base - S * 0.5); ctx.lineTo(x + S * 0.7, base - S * 0.45); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + S * 0.25, base - S * 0.5); ctx.quadraticCurveTo(x + S * 0.45, base - S * 0.75, x + S * 0.4, base - S * 0.8); ctx.lineTo(x + S * 0.5, base - S * 0.78); ctx.fill();
      eyes(x + S * 0.44, base - S * 0.8, S * 0.02);
    }
    ctx.shadowBlur = 0;
  }

  // ---------------------------------------------------------------- 入口
  G.paintScene = (canvas, opt) => {
    const dpr = Math.min(2, (typeof devicePixelRatio === "number" && devicePixelRatio) || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(200, Math.round(rect.width)), h = Math.max(120, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = rng(String(opt.seed || opt.key));
    const key = opt.key;
    if (IN[key]) IN[key](ctx, w, h, R);
    else {
      const sk = key === "realm" || key === "majin" ? RED_SKY : SKIES[opt.phase || 0];
      sky(ctx, w, h, sk, R, opt.redMoon);
      (OUT[key] || OUT.plains)(ctx, w, h, sk, R);
    }
    const foes = opt.foes || [];
    const n = foes.length;
    if (n) { ctx.fillStyle = "rgba(90,0,0,.18)"; ctx.fillRect(0, 0, w, h); }
    foes.forEach((f, i) => {
      const x = w * (n === 1 ? 0.5 : 0.22 + (0.56 * i) / Math.max(1, n - 1));
      const s = h * (f.boss ? 0.78 : 0.58) * (n > 2 ? 0.85 : 1);
      if (G.paintMonster) G.paintMonster(ctx, x, h * 0.97, s, f);
      else foe(ctx, x, h * 0.97, s, f.shape, f.eye || "#ff3a3a");
    });
    vignette(ctx, w, h, 0.55);
  };
})(globalThis.G = globalThis.G || {});
