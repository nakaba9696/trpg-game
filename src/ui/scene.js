// 背景の絵。画像ファイルは使わず、場所と時間帯ごとに canvas に描く。
// G.paintScene(canvas, { key, phase, seed, foes: [{ id, shape, eye, boss }], sky })
// sky（{ season: "春|夏|秋|冬", weather: "晴|雨|霧|雪" }）を省くと、今の場所の G.skyAt を使う
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

  // ---------------------------------------------------------------- 季節と天候（A1）
  // 今の場所の季節と天候は engine/weather.js の G.skyAt が決める。絵はそれを読むだけ。
  // ENV は1枚描くあいだだけ使う（木・屋根・山の雪などの小道具が読む）
  let ENV = { season: "", weather: "", night: false, key: "", snowCap: null };
  const SEASON_ART = { 春: "spring", 夏: "summer", 秋: "autumn", 冬: "winter" };
  const WEATHER_ART = { 雨: "rain", 霧: "fog", 雪: "snow" };
  // 霧の色は町ごとに違う（港は潮の白、沼は緑、魔法都市は紫、砦は煤、朧島は提灯の色、酸の谷は緑、湯の町は湯気、鍛冶の都は煙）
  const FOG = { port: "#c9d2dc", swamp: "#a8c29a", magic: "#c0b2e8", fort: "#a39888", w1_oboro: "#e8c4a4", w1_catacomb: "#b4c8be", bones: "#c8c4b4", forest: "#c4d0c4", w2_acid: "#b4d89a", w2_spa: "#eceef2", w2_forge: "#b0a8a0", w2_shadow: "#b8b4ac" };
  const fogColor = () => { const c = FOG[ENV.key] || "#d6dce4"; return ENV.night ? mix(c, "#1c2230", 0.6) : c; };
  function setEnv(key, sk, opt) {
    ENV = { season: "", weather: "", night: !!sk.night, key, snowCap: null };
    if (RED[key]) return;
    const at = opt.sky || (G.skyAt && G.S ? G.skyAt(G.S.loc) : null);
    if (!at || at.still) return;
    ENV.season = SEASON_ART[at.season] || "";
    ENV.weather = WEATHER_ART[at.weather] || "";
    if (ENV.season === "winter") ENV.snowCap = sk.night ? "rgba(196,208,228,.6)" : "rgba(242,246,252,.92)";
  }
  // 季節と天候で空の色を変える（遠景・近景の色もここから作られる）
  function skyFor(sk) {
    const o = Object.assign({}, sk), n = sk.night;
    if (ENV.season === "winter") { o.top = mix(o.top, "#8a98aa", n ? 0.1 : 0.25); o.bot = mix(o.bot, "#e4eaf2", n ? 0.1 : 0.3); }
    else if (ENV.season === "autumn") o.bot = mix(o.bot, "#f0a060", n ? 0.05 : 0.18);
    else if (ENV.season === "summer" && !n) o.top = mix(o.top, "#2f6fd0", 0.15);
    if (ENV.weather === "rain" || ENV.weather === "snow") {
      const c = ENV.weather === "snow" ? "#9aa4b2" : "#4a525c";
      o.top = mix(o.top, n ? "#101418" : c, 0.7); o.bot = mix(o.bot, n ? "#1a2028" : mix(c, "#ffffff", 0.3), 0.65);
      o.veil = "cloud"; o.sun = null;
    } else if (ENV.weather === "fog") {
      const c = fogColor();
      o.top = mix(o.top, c, n ? 0.2 : 0.4); o.bot = mix(o.bot, c, n ? 0.35 : 0.6);
      o.veil = "fog";
    }
    return o;
  }
  // 木の色。季節ごとに、針葉樹の色・広葉樹の色（秋の紅葉・春の花）・雪
  function foliage(color) {
    if (!/^#/.test(color)) return { needle: color };
    const k = ENV.night ? 0.22 : 0.55;
    const tint = (cs) => cs.map((c) => mix(color, c, k));
    const heavy = ENV.key === "yakumo" || ENV.key === "w1_oboro";
    switch (ENV.season) {
      case "summer": return { needle: mix(color, "#2f6a2a", k * 0.6) };
      case "spring": return { needle: mix(color, "#3f7a32", k * 0.5), broad: tint(heavy ? ["#f4c0cc", "#eaa8bc", "#f8d4dc"] : ["#8ab45a", "#f0c0cc", "#6a9a48"]) };
      case "autumn": return { needle: mix(color, "#3a4a28", k * 0.3), broad: tint(heavy ? ["#c8281a", "#e0401e", "#b01e14", "#e87a2a"] : ["#c8481e", "#e0802a", "#b8301a", "#d8a030"]) };
      case "winter": return { needle: color, snow: ENV.snowCap };
      default: return { needle: color };
    }
  }
  // 雨雲・雪雲
  function clouds(ctx, w, h, sk, R) {
    const c = sk.night ? "#0c1014" : mix(sk.top, "#2a3038", 0.35);
    for (let i = 0; i < 14; i++) {
      const x = R() * w, y = h * (0.02 + R() * 0.25), rx = w * (0.12 + R() * 0.15), ry = h * (0.04 + R() * 0.05);
      ctx.fillStyle = rgba(c, 0.35 + R() * 0.3);
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 地面に季節を足す（夏の草・春の花びら・秋の落ち葉・冬の積雪）
  function seasonPass(ctx, w, h, R) {
    const heavy = ENV.key === "yakumo" || ENV.key === "w1_oboro";
    const falling = (n, cols, s) => {
      for (let i = 0; i < n; i++) {
        const x = R() * w, y = R() * h, a = R() * Math.PI;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath(); ctx.ellipse(0, 0, s * (0.8 + R() * 0.6), s * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    };
    const dim = ENV.night ? 0.45 : 0.9;
    if (ENV.season === "summer") {
      ctx.strokeStyle = mix("#07080c", "#3d6b2a", ENV.night ? 0.18 : 0.45); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < w; x += 3 + R() * 4) { const l = 5 + R() * 9; ctx.moveTo(x, h); ctx.lineTo(x + (R() - 0.5) * 5, h - l); }
      ctx.stroke();
    } else if (ENV.season === "spring") {
      falling(heavy ? 90 : 24, [`rgba(250,200,215,${dim})`, `rgba(255,228,236,${dim})`], 2.4);
    } else if (ENV.season === "autumn") {
      const cols = heavy ? [`rgba(210,50,30,${dim})`, `rgba(235,95,35,${dim})`, `rgba(180,30,24,${dim})`] : [`rgba(205,90,35,${dim})`, `rgba(225,150,50,${dim})`, `rgba(170,60,30,${dim})`];
      falling(heavy ? 70 : 34, cols, 2.8);
      for (let i = 0; i < w / 5; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(R() * w, h * (0.955 + R() * 0.045), 3 + R() * 3, 1.5 + R()); }
    } else if (ENV.season === "winter" && ENV.snowCap) {
      ctx.fillStyle = ENV.snowCap;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, h * (0.955 + 0.012 * Math.sin(x * 0.05) + R() * 0.006));
      ctx.lineTo(w, h); ctx.fill();
    }
  }
  // 霧（敵より奥）
  function fogPass(ctx, w, h, R) {
    if (ENV.weather !== "fog") return;
    const c = fogColor(), a = ENV.night ? 0.3 : 0.42;
    ctx.fillStyle = rgba(c, a * 0.4); ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const y = h * (0.4 + i * 0.1) + (R() - 0.5) * h * 0.05, bh = h * (0.08 + R() * 0.08);
      const g = ctx.createLinearGradient(0, y - bh, 0, y + bh);
      g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.5, rgba(c, a * (0.6 + R() * 0.4))); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.fillRect(0, y - bh, w, bh * 2);
    }
  }
  // 雨と雪（敵より手前）。吹雪の場所は横殴り
  function fallPass(ctx, w, h, R) {
    if (ENV.weather === "rain") {
      ctx.fillStyle = "rgba(16,22,32,.18)"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = ENV.night ? "rgba(170,185,210,.28)" : "rgba(200,212,230,.42)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < w * 0.5; i++) { const x = R() * (w + 40), y = R() * h, l = 10 + R() * 14; ctx.moveTo(x, y); ctx.lineTo(x - l * 0.25, y + l); }
      ctx.stroke();
      ctx.strokeStyle = ENV.night ? "rgba(170,185,210,.25)" : "rgba(210,220,235,.4)";
      for (let i = 0; i < w / 14; i++) { const x = R() * w, y = h * (0.93 + R() * 0.06); ctx.beginPath(); ctx.ellipse(x, y, 4 + R() * 3, 1.2, 0, 0, Math.PI * 2); ctx.stroke(); }
    } else if (ENV.weather === "snow") {
      const storm = ENV.key === "snow" || ENV.key === "snowcity" || ENV.key === "mountain";
      if (storm) { ctx.fillStyle = ENV.night ? "rgba(160,170,190,.14)" : "rgba(232,238,246,.22)"; ctx.fillRect(0, 0, w, h); }
      ctx.fillStyle = ENV.night ? "rgba(220,228,240,.6)" : "rgba(255,255,255,.85)";
      for (let i = 0; i < w * (storm ? 0.7 : 0.35); i++) {
        const x = R() * w, y = R() * h, r = 0.8 + R() * 1.8;
        if (storm) { ctx.save(); ctx.translate(x, y); ctx.rotate(0.25); ctx.fillRect(0, 0, r * 3.5, r * 0.6); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }

  const SKIES = [
    { top: "#6f8fb8", bot: "#f0c79a", sun: "#fff1c9", night: false },  // 朝
    { top: "#4f7fbf", bot: "#bcd6ec", sun: "#fffbe8", night: false },  // 昼
    { top: "#2c2346", bot: "#e2764a", sun: "#ffc27a", night: false, dusk: true },  // 夕
    { top: "#070b18", bot: "#1f2a48", sun: null, night: true },        // 夜
  ];
  const RED_SKY = { top: "#140304", bot: "#7a1c12", sun: "#ff5a3a", night: true };
  // 使徒領の空（赤い空。季節も天候も無い）
  const RED = { realm: 1, majin: 1, e2_kitchen: 1 };

  function sky(ctx, w, h, sk, R, redMoon) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sk.top);
    g.addColorStop(1, sk.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (sk.night && !sk.veil) {
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.6})`;
        ctx.fillRect(R() * w, R() * h * 0.6, 1.2, 1.2);
      }
    }
    if (sk.veil === "cloud") clouds(ctx, w, h, sk, R);
    if ((sk.night && !sk.veil) || redMoon) {
      const mx = w * (0.15 + R() * 0.7), my = h * 0.18, mr = h * 0.07;
      ctx.fillStyle = redMoon ? "#e0442e" : "#f1ecd6";
      ctx.shadowColor = redMoon ? "#ff3b1f" : "#fff6d8";
      ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (sk.sun && sk.veil !== "cloud") {
      const sx = w * (0.2 + R() * 0.6), sy = h * (sk.dusk ? 0.55 : 0.2);
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
    if (ENV.season === "winter") snow = ENV.snowCap || "rgba(240,245,255,.7)";
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
    const leaf = foliage(color);
    for (let i = 0; i < n; i++) {
      const x = R() * w, s = size * (0.6 + R() * 0.7), y = base + R() * size * 0.3;
      ctx.fillStyle = color;
      ctx.fillRect(x - s * 0.06, y, s * 0.12, s * 0.3);
      // 秋と春は、針葉樹のあいだに葉の落ちる木が混じる（並びは季節で変えない）
      if (leaf.broad && (i * 7) % 10 < 5) {
        ctx.fillRect(x - s * 0.08, y - s * 0.9, s * 0.16, s * 0.9);
        ctx.fillStyle = leaf.broad[i % leaf.broad.length];
        ctx.beginPath(); ctx.arc(x, y - s * 1.2, s * 0.55, 0, Math.PI * 2); ctx.arc(x - s * 0.35, y - s * 0.85, s * 0.35, 0, Math.PI * 2); ctx.arc(x + s * 0.35, y - s * 0.9, s * 0.38, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.fillStyle = leaf.needle;
      ctx.beginPath(); ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x - s * 0.55, y); ctx.lineTo(x + s * 0.55, y); ctx.fill();
      if (leaf.snow) { ctx.fillStyle = leaf.snow; ctx.beginPath(); ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x - s * 0.22, y - s * 1.35); ctx.lineTo(x, y - s * 1.5); ctx.lineTo(x + s * 0.22, y - s * 1.35); ctx.fill(); }
    }
  }
  function buildings(ctx, w, base, hmax, color, lit, R, roofs) {
    let x = -10;
    while (x < w) {
      const bw = 20 + R() * 45, bh = hmax * (0.35 + R() * 0.65);
      ctx.fillStyle = color;
      ctx.fillRect(x, base - bh, bw, bh + 2);
      if (roofs) { ctx.beginPath(); ctx.moveTo(x - 3, base - bh); ctx.lineTo(x + bw / 2, base - bh - bw * 0.45); ctx.lineTo(x + bw + 3, base - bh); ctx.fill(); }
      if (ENV.snowCap) {
        ctx.fillStyle = ENV.snowCap;
        if (roofs) { ctx.beginPath(); ctx.moveTo(x - 3, base - bh); ctx.lineTo(x + bw / 2, base - bh - bw * 0.45); ctx.lineTo(x + bw + 3, base - bh); ctx.lineTo(x + bw / 2, base - bh - bw * 0.3); ctx.fill(); }
        else ctx.fillRect(x, base - bh - 2, bw, 3);
      }
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
    if (ENV.snowCap) { ctx.fillStyle = ENV.snowCap; ctx.beginPath(); ctx.moveTo(x, base - th - tw * 1.2); ctx.lineTo(x - tw * 0.35, base - th - tw * 0.6); ctx.lineTo(x + tw * 0.35, base - th - tw * 0.6); ctx.fill(); }
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
  // 腐れ庭園の花壇（畝ごとに、盛り土と色鮮やかな花。盛り土はどれも人ひとりぶんの長さ）
  function flowerBeds(ctx, w, h, y0, rows, soil, night, R) {
    const bright = ["#ff4a8a", "#ffd23a", "#ff7a2a", "#c04aff", "#4ad8ff", "#ff3a3a"];
    for (let row = 0; row < rows; row++) {
      const y = h * (y0 + row * 0.075), s = 0.7 + row * 0.25;
      for (let i = 0; i < 8; i++) {
        const x = w * (0.04 + i * 0.13) + (row % 2) * w * 0.065;
        ctx.fillStyle = mix(soil, "#4a3020", 0.45);
        ctx.beginPath(); ctx.ellipse(x, y, 22 * s, 6 * s, 0, Math.PI, 0); ctx.fill();
        for (let k = 0; k < 3; k++) {
          const fx = x + (k - 1) * 10 * s, fy = y - 8 * s - R() * 6 * s, c = bright[(i + k + row) % bright.length];
          ctx.strokeStyle = "#2a5a22"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx, y - 3 * s); ctx.lineTo(fx, fy); ctx.stroke();
          if (night) glow(ctx, fx, fy, 9 * s, c, 0.35);
          ctx.fillStyle = night ? mix(c, "#101418", 0.3) : c; ctx.beginPath(); ctx.arc(fx, fy, 3.2 * s, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
  // 空の色から遠景・中景・近景の色を作る
  const layers = (sk) => [mix(sk.bot, "#1a1e2a", 0.45), mix(sk.bot, "#10131b", 0.7), mix(sk.bot, "#07080c", 0.88)];

  // ---------------------------------------------------------------- 屋外の場面
  const OUT = {
    town(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.6, h * 0.08, 1, far, R);
      buildings(ctx, w, h * 0.78, h * 0.3, mid, sk.night || sk.dusk, R, true);
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
    // W1：聖都エルヴィナ（白い城壁と、光の輪を戴く大聖堂）
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
    // W1：エルヴィナの地下墓地の入口（墓標の丘と、骨の口を開けた霊廟）
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
    // W1：シェルアークの朧島（夜の明けない祭りの島。欠けた月には歯型）
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
    // W2：麦の都グランベール（麦畑と風車。左の若い森は去年の畑。花を撒く一本道だけ麦が生えていない）
    w2_farm(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.6, h * 0.04, 1, far, R);
      pines(ctx, w * 0.32, h * 0.66, h * 0.07, 16, mix(far, mid, 0.5), R);
      const crop = ENV.season === "winter" ? "#d8dce4" : ENV.season === "spring" ? "#6a9a48" : ENV.season === "summer" ? "#b8b048" : "#d8b050";
      for (let i = 0; i < 6; i++) {
        const y = h * (0.65 + i * 0.06);
        ctx.fillStyle = mix(mix(sk.bot, crop, sk.night ? 0.25 : 0.65), near, 0.1 + i * 0.12 + (i % 2) * 0.06);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y - h * 0.025); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      }
      ctx.fillStyle = mix(sk.bot, "#c8b890", sk.night ? 0.2 : 0.5);
      ctx.beginPath(); ctx.moveTo(0, h * 0.8); ctx.lineTo(w, h * 0.74); ctx.lineTo(w, h * 0.755); ctx.lineTo(0, h * 0.83); ctx.fill();
      const mill = (x, b, s) => {
        ctx.fillStyle = mid;
        ctx.beginPath(); ctx.moveTo(x - s * 0.22, b); ctx.lineTo(x - s * 0.13, b - s); ctx.lineTo(x + s * 0.13, b - s); ctx.lineTo(x + s * 0.22, b); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - s * 0.18, b - s); ctx.lineTo(x, b - s * 1.18); ctx.lineTo(x + s * 0.18, b - s); ctx.fill();
        if (ENV.snowCap) { ctx.fillStyle = ENV.snowCap; ctx.beginPath(); ctx.moveTo(x - s * 0.18, b - s); ctx.lineTo(x, b - s * 1.18); ctx.lineTo(x + s * 0.18, b - s); ctx.lineTo(x, b - s * 1.1); ctx.fill(); }
        const a0 = R() * Math.PI;
        ctx.fillStyle = mix(mid, "#8a7a60", 0.25);
        for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(x, b - s * 0.95); ctx.rotate(a0 + (k * Math.PI) / 2); ctx.fillRect(0, -s * 0.05, s * 0.7, s * 0.1); ctx.restore(); }
        if (sk.night || sk.dusk) { glow(ctx, x, b - s * 0.45, s * 0.3, "#ffb04a", 0.5); ctx.fillStyle = "#ffcf6e"; ctx.fillRect(x - 2, b - s * 0.48, 4, 6); }
      };
      mill(w * 0.66, h * 0.66, h * 0.24);
      mill(w * 0.86, h * 0.645, h * 0.14);
      buildings(ctx, w * 0.26, h * 0.69, h * 0.06, mid, sk.night || sk.dusk, R, true);
      ctx.fillStyle = near;
      for (let i = 0; i < 9; i++) { const x = w * (0.08 + i * 0.1) + R() * 8, y = h * (0.86 + R() * 0.06); ctx.fillRect(x, y - h * 0.08, 3, h * 0.08); }
      ctx.fillRect(0, h * 0.97, w, h);
    },
    // W2：鍛冶の都ドランヘルツ（山肌の煙突の町。どの家にも炉の火）
    w2_forge(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      peaks(ctx, w, h, h * 0.52, h * 0.34, 4, far, null, R);
      const slope = (x) => h * (0.5 + 0.34 * (x / w));
      ctx.fillStyle = mid;
      ctx.beginPath(); ctx.moveTo(0, slope(0)); ctx.lineTo(w, slope(w)); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      const smoke = sk.night ? "#40444c" : mix(sk.bot, "#6a6660", 0.6);
      const houses = [];
      for (let i = 0; i < 22; i++) houses.push([R() * w, 14 + R() * 18, R()]);
      houses.sort((a, b) => a[0] - b[0]).forEach(([x, s, r]) => {
        const b = slope(x) + s * 0.4;
        ctx.fillStyle = mix(mid, near, 0.5);
        ctx.fillRect(x - s * 0.6, b - s, s * 1.2, s);
        ctx.beginPath(); ctx.moveTo(x - s * 0.7, b - s); ctx.lineTo(x, b - s * 1.5); ctx.lineTo(x + s * 0.7, b - s); ctx.fill();
        if (ENV.snowCap) { ctx.fillStyle = ENV.snowCap; ctx.beginPath(); ctx.moveTo(x - s * 0.7, b - s); ctx.lineTo(x, b - s * 1.5); ctx.lineTo(x + s * 0.7, b - s); ctx.lineTo(x, b - s * 1.35); ctx.fill(); ctx.fillStyle = mix(mid, near, 0.5); }
        ctx.fillRect(x + s * 0.25, b - s * 1.7, s * 0.2, s * 0.6);
        for (let k = 0; k < 4; k++) { ctx.fillStyle = rgba(smoke, 0.35 - k * 0.07); ctx.beginPath(); ctx.arc(x + s * 0.35 + k * s * 0.35, b - s * 1.85 - k * s * 0.55, s * (0.2 + k * 0.12), 0, Math.PI * 2); ctx.fill(); }
        if (r < 0.6) { glow(ctx, x - s * 0.2, b - s * 0.3, s * 0.9, "#ff8a2a", sk.night ? 0.6 : 0.3); ctx.fillStyle = "#ffb04a"; ctx.fillRect(x - s * 0.3, b - s * 0.45, s * 0.22, s * 0.3); }
      });
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.93, w, h);
      particles(ctx, w, h * 0.7, sk.night ? 40 : 15, "rgba(255,170,80,.55)", 1.6, R);
    },
    // W2：闘技の都ザルグロス（雪の中のすり鉢形の大闘技場と、上の席の旗）
    w2_arena(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      peaks(ctx, w, h, h * 0.6, h * 0.2, 6, far, "rgba(240,245,255,.5)", R);
      ctx.fillStyle = mix(sk.bot, "#dfe6ef", sk.night ? 0.2 : 0.55); ctx.fillRect(0, h * 0.78, w, h);
      buildings(ctx, w, h * 0.8, h * 0.12, mix(mid, far, 0.3), sk.night || sk.dusk, R, false);
      const cx = w * 0.5, base = h * 0.86, rw = w * 0.34, top = base - h * 0.28, ry = h * 0.05;
      const stone = mix(mid, "#5a5048", 0.3);
      ctx.fillStyle = stone;
      ctx.beginPath(); ctx.ellipse(cx, top, rw, ry, 0, Math.PI, 0); ctx.lineTo(cx + rw, base); ctx.ellipse(cx, base, rw, ry, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
      if (ENV.snowCap) { ctx.fillStyle = ENV.snowCap; ctx.beginPath(); ctx.ellipse(cx, top, rw, ry, 0, Math.PI, 0); ctx.ellipse(cx, top + 3, rw, ry, 0, 0, Math.PI, true); ctx.fill(); }
      for (let row = 0; row < 2; row++) for (let i = 0; i < 12; i++) {
        const t = (i + 0.5) / 12, x = cx - rw * 0.95 + t * rw * 1.9, y = top + h * (0.07 + row * 0.1) + Math.sin(t * Math.PI) * ry * 0.8, aw = rw * 0.06, ah = h * 0.06;
        ctx.fillStyle = sk.night ? (R() < 0.4 ? "#ffb04a" : "#0a0808") : mix(stone, "#000000", 0.6);
        ctx.beginPath(); ctx.arc(x, y, aw, Math.PI, 0); ctx.fillRect(x - aw, y, aw * 2, ah); ctx.fill();
      }
      const flags = ["#b0342a", "#e8e3d0", "#2a4a9a", "#c8a040"];
      for (let i = 0; i < 7; i++) { const x = cx - rw * 0.9 + (i / 6) * rw * 1.8, y = top - ry * Math.sin(((i + 0.5) / 7) * Math.PI) * 0.6; ctx.fillStyle = stone; ctx.fillRect(x, y - 26, 2, 26); ctx.fillStyle = flags[i % 4]; ctx.fillRect(x + 2, y - 26, 12, 7); }
      ctx.fillStyle = near;
      for (let i = 0; i < 20; i++) { const x = R() * w, y = h * 0.95; ctx.beginPath(); ctx.arc(x, y - 11, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 4, y - 8, 8, 10); }
      ctx.fillRect(0, h * 0.95, w, h);
    },
    // W2：湯の町アミュレイン（湖のほとりの湯屋と、立ちのぼる湯気）
    w2_spa(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.58, h * 0.07, 1, far, R);
      pines(ctx, w, h * 0.64, h * 0.07, 24, mix(far, mid, 0.4), R);
      ctx.fillStyle = mix(sk.bot, "#1a3040", 0.55); ctx.fillRect(0, h * 0.66, w, h);
      for (let i = 0; i < 30; i++) { ctx.fillStyle = rgba(sk.sun || "#b8c7e6", 0.12 + R() * 0.15); ctx.fillRect(R() * w, h * (0.68 + R() * 0.12), 16 + R() * 36, 1.5); }
      const wood = mix(mid, "#5a3a22", 0.35);
      for (let i = 0; i < 4; i++) {
        const x = w * (0.1 + i * 0.24) + R() * 10, b = h * 0.86, bw = w * 0.14, bh = h * 0.1;
        ctx.fillStyle = mix(sk.bot, "#2a2a2a", 0.6); ctx.beginPath(); ctx.ellipse(x + bw * 0.5, b + h * 0.03, bw * 0.6, h * 0.02, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = wood; ctx.fillRect(x, b - bh, bw, bh);
        ctx.beginPath(); ctx.moveTo(x - 8, b - bh); ctx.quadraticCurveTo(x + bw / 2, b - bh - bw * 0.35, x + bw + 8, b - bh); ctx.fill();
        if (ENV.snowCap) { ctx.fillStyle = ENV.snowCap; ctx.beginPath(); ctx.moveTo(x - 8, b - bh); ctx.quadraticCurveTo(x + bw / 2, b - bh - bw * 0.35, x + bw + 8, b - bh); ctx.lineTo(x + bw, b - bh - 2); ctx.quadraticCurveTo(x + bw / 2, b - bh - bw * 0.28, x, b - bh - 2); ctx.fill(); }
        glow(ctx, x + bw * 0.5, b - bh * 0.4, bw * 0.6, "#ffb45a", sk.night ? 0.55 : 0.25);
        ctx.fillStyle = "#ffcf8a"; ctx.fillRect(x + bw * 0.4, b - bh * 0.6, bw * 0.2, bh * 0.35);
        for (let k = 0; k < 6; k++) { ctx.fillStyle = `rgba(245,245,250,${(sk.night ? 0.06 : 0.1) - k * 0.012})`; ctx.beginPath(); ctx.arc(x + bw * 0.5 + Math.sin(k * 1.3 + i) * 12, b - bh - bw * 0.3 - k * h * 0.06, 8 + k * 5, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.93, w, h);
    },
    // W2：狩り場の町ナグリス（大木の枝に架けた家々。東の空に、雲に届く大樹の影）
    w2_hunt(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      const tx = w * 0.84;
      ctx.fillStyle = rgba(mix(far, sk.top, 0.35), 0.8);
      ctx.fillRect(tx - w * 0.03, h * 0.12, w * 0.06, h * 0.6);
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(tx + (R() - 0.5) * w * 0.3, h * (0.02 + R() * 0.16), w * (0.08 + R() * 0.08), h * (0.04 + R() * 0.05), 0, 0, Math.PI * 2); ctx.fill(); }
      ridge(ctx, w, h, h * 0.66, h * 0.05, 1, far, R);
      pines(ctx, w, h * 0.72, h * 0.1, 30, mix(far, mid, 0.5), R);
      const leaf = foliage(mid);
      for (let i = 0; i < 4; i++) {
        const x = w * (0.1 + i * 0.22) + R() * 12, tw = 18 + R() * 10;
        ctx.fillStyle = near; ctx.fillRect(x - tw / 2, h * 0.2, tw, h * 0.8);
        ctx.fillStyle = (leaf.broad && leaf.broad[i % leaf.broad.length]) || leaf.needle;
        ctx.beginPath(); ctx.ellipse(x, h * 0.16, w * 0.1, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
        const hy = h * (0.35 + R() * 0.2);
        ctx.fillStyle = mix(near, "#5a3a22", 0.4); ctx.fillRect(x - 30, hy, 60, 5); ctx.fillRect(x - 24, hy - 22, 48, 22);
        ctx.beginPath(); ctx.moveTo(x - 30, hy - 22); ctx.lineTo(x, hy - 38); ctx.lineTo(x + 30, hy - 22); ctx.fill();
        if (sk.night || sk.dusk) { glow(ctx, x, hy - 12, 24, "#ffb04a", 0.55); ctx.fillStyle = "#ffcf6e"; ctx.fillRect(x - 3, hy - 16, 6, 7); }
        ctx.strokeStyle = mix(near, "#8a6a40", 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 20, hy + 5); ctx.lineTo(x + 20, h * 0.9); ctx.stroke();
      }
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.92, w, h);
      ctx.strokeStyle = near; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, h * 0.94); ctx.quadraticCurveTo(w * 0.3, h * 0.86, w * 0.55, h * 0.93); ctx.stroke();
    },
    // W2：懺悔の谷（切り立った雪の谷の底に埋もれた、屋根のない町）
    w2_echo(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = far;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.32, h * 0.7); ctx.lineTo(0, h); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w * 0.68, h * 0.7); ctx.lineTo(w, h); ctx.fill();
      ctx.fillStyle = mix(sk.bot, "#dfe6ef", sk.night ? 0.15 : 0.45); ctx.fillRect(0, h * 0.8, w, h);
      for (let i = 0; i < 10; i++) {
        const x = w * (0.2 + R() * 0.6), bw = 18 + R() * 26, bh = h * (0.06 + R() * 0.12), b = h * (0.8 + R() * 0.06);
        ctx.fillStyle = mid; ctx.fillRect(x, b - bh, bw, bh);
        ctx.fillStyle = mix(mid, "#000000", 0.5); ctx.fillRect(x + bw * 0.3, b - bh * 0.7, bw * 0.3, bh * 0.4);
        ctx.fillStyle = mid; ctx.beginPath(); ctx.moveTo(x, b - bh); ctx.lineTo(x + bw * 0.3, b - bh - 8 - R() * 10); ctx.lineTo(x + bw * 0.5, b - bh); ctx.fill();
      }
      ctx.fillStyle = near;
      ctx.fillRect(w * 0.12, h * 0.7, w * 0.05, h * 0.3); ctx.fillRect(w * 0.81, h * 0.66, w * 0.06, h * 0.34);
      for (let x = w * 0.12; x < w * 0.17; x += 7) ctx.fillRect(x, h * 0.7 - 5, 4, 5);
      ctx.fillRect(0, h * 0.95, w, h);
      ctx.fillStyle = mix(near, "#8a8478", 0.5); ctx.fillRect(w * 0.42, h * 0.86, 12, 26); ctx.beginPath(); ctx.arc(w * 0.42 + 6, h * 0.86, 6, Math.PI, 0); ctx.fill();
    },
    // W2：影の谷（崩れた壁と石畳に、人の影だけが焼き付いている）
    w2_shadow(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.62, h * 0.06, 1, far, R);
      const wall = mix(sk.bot, "#b8b0a0", sk.night ? 0.2 : 0.5);
      ctx.fillStyle = mix(wall, near, 0.4); ctx.fillRect(0, h * 0.84, w, h);
      for (let i = 0; i < 5; i++) {
        const x = w * (0.02 + i * 0.2), ww = w * 0.16, wh = h * (0.22 + R() * 0.14), b = h * 0.86;
        ctx.fillStyle = wall;
        ctx.beginPath(); ctx.moveTo(x, b); ctx.lineTo(x, b - wh); for (let k = 1; k <= 5; k++) ctx.lineTo(x + (ww * k) / 5, b - wh + (R() - 0.3) * h * 0.06); ctx.lineTo(x + ww, b); ctx.fill();
        // 焼き付いた影（人の形）
        const n = 1 + Math.floor(R() * 2);
        for (let k = 0; k < n; k++) {
          const px = x + ww * (0.25 + k * 0.4), s = h * (0.1 + R() * 0.03), py = b - h * 0.02;
          ctx.fillStyle = "rgba(12,10,10,.78)";
          ctx.beginPath(); ctx.arc(px, py - s * 0.88, s * 0.1, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(px - s * 0.16, py - s * 0.75); ctx.lineTo(px + s * 0.16, py - s * 0.75); ctx.lineTo(px + s * 0.12, py - s * 0.35); ctx.lineTo(px - s * 0.12, py - s * 0.35); ctx.fill();
          ctx.fillRect(px - s * 0.11, py - s * 0.36, s * 0.08, s * 0.36); ctx.fillRect(px + s * 0.03, py - s * 0.36, s * 0.08, s * 0.36);
          ctx.save(); ctx.translate(px + s * 0.15, py - s * 0.72); ctx.rotate(-0.9 - R() * 1.2); ctx.fillRect(0, 0, s * 0.06, s * 0.35); ctx.restore();
        }
      }
      ctx.fillStyle = "rgba(12,10,10,.5)";
      for (let i = 0; i < 4; i++) { const x = R() * w, y = h * (0.9 + R() * 0.06); ctx.beginPath(); ctx.ellipse(x, y, 14, 4, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(0, 0, w, h);
    },
    // W2：酸の谷（緑の湯気と、膝をついた鉄の巨人たち）
    w2_acid(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = "rgba(90,140,40,.18)"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = far;
      ctx.beginPath(); ctx.moveTo(0, h * 0.2); ctx.quadraticCurveTo(w * 0.2, h * 0.5, w * 0.3, h * 0.78); ctx.lineTo(0, h); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w, h * 0.25); ctx.quadraticCurveTo(w * 0.8, h * 0.5, w * 0.72, h * 0.78); ctx.lineTo(w, h); ctx.fill();
      ctx.fillStyle = mix(mid, "#2a3a1a", 0.4); ctx.fillRect(0, h * 0.78, w, h);
      for (let i = 0; i < 5; i++) { const x = w * (0.15 + R() * 0.7), y = h * (0.84 + R() * 0.1), rx = 30 + R() * 50; glow(ctx, x, y, rx * 1.4, "#9fff6a", 0.35); ctx.fillStyle = "rgba(150,230,90,.7)"; ctx.beginPath(); ctx.ellipse(x, y, rx, 5 + R() * 4, 0, 0, Math.PI * 2); ctx.fill(); }
      const giant = (x, b, s) => {
        ctx.fillStyle = mix(mid, "#6a5a48", 0.35);
        ctx.fillRect(x - s * 0.3, b - s * 0.18, s * 0.25, s * 0.18); ctx.fillRect(x + s * 0.05, b - s * 0.3, s * 0.22, s * 0.3);
        ctx.fillRect(x - s * 0.28, b - s * 0.75, s * 0.56, s * 0.5);
        ctx.fillRect(x - s * 0.14, b - s * 0.95, s * 0.28, s * 0.2);
        ctx.save(); ctx.translate(x - s * 0.28, b - s * 0.72); ctx.rotate(0.3); ctx.fillRect(-s * 0.12, 0, s * 0.12, s * 0.5); ctx.restore();
        ctx.fillRect(x + s * 0.28, b - s * 0.72, s * 0.12, s * 0.45);
        ctx.fillStyle = "rgba(150,230,90,.45)"; ctx.fillRect(x - s * 0.28, b - s * 0.4, s * 0.56, s * 0.06);
        ctx.fillStyle = sk.night ? "#9fff6a" : "#1a1a14"; ctx.fillRect(x - s * 0.08, b - s * 0.88, s * 0.16, s * 0.03);
      };
      giant(w * 0.3, h * 0.84, h * 0.4); giant(w * 0.62, h * 0.8, h * 0.3); giant(w * 0.82, h * 0.86, h * 0.22);
      for (let i = 0; i < 7; i++) { const g = ctx.createLinearGradient(0, h * (0.5 + i * 0.06), 0, h * (0.58 + i * 0.06)); g.addColorStop(0, "rgba(160,220,110,0)"); g.addColorStop(0.5, "rgba(160,220,110,.16)"); g.addColorStop(1, "rgba(160,220,110,0)"); ctx.fillStyle = g; ctx.fillRect(0, h * (0.5 + i * 0.06), w, h * 0.08); }
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.96, w, h);
    },
    // W4：鉱山の都カースヴェルグ（山肌の坑口と煙、坂を下る二本の鉄の道）
    w4_mine(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      peaks(ctx, w, h, h * 0.55, h * 0.3, 5, far, "rgba(240,245,255,.6)", R);
      ctx.fillStyle = mid; ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.quadraticCurveTo(w * 0.35, h * 0.42, w * 0.7, h * 0.62); ctx.lineTo(w, h * 0.7); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      for (let i = 0; i < 6; i++) {
        const x = w * (0.08 + i * 0.13), y = h * (0.5 + i * 0.025 + R() * 0.02);
        ctx.fillStyle = "#0a0806"; ctx.beginPath(); ctx.arc(x, y, h * 0.03, Math.PI, 0); ctx.fill(); ctx.fillRect(x - h * 0.03, y, h * 0.06, h * 0.02);
        if (sk.night) glow(ctx, x, y, h * 0.05, "#ffb04a", 0.35);
        ctx.fillStyle = "rgba(120,110,100,.25)"; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + k * 6, y - h * 0.06 - k * h * 0.04, 8 + k * 4, 0, Math.PI * 2); ctx.fill(); }
      }
      buildings(ctx, w, h * 0.86, h * 0.2, near, sk.night || sk.dusk, R, true);
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.85, w, h);
      ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 2;
      for (const off of [-0.04, 0.04]) { ctx.beginPath(); ctx.moveTo(w * (0.5 + off), h); ctx.lineTo(w * (0.6 + off * 0.4), h * 0.62); ctx.stroke(); }
      ctx.fillStyle = "#3a2e24"; ctx.fillRect(w * 0.55, h * 0.74, w * 0.06, h * 0.04);
      ctx.fillStyle = "#2a2018"; ctx.beginPath(); ctx.arc(w * 0.565, h * 0.785, 3, 0, Math.PI * 2); ctx.arc(w * 0.6, h * 0.785, 3, 0, Math.PI * 2); ctx.fill();
    },
    // W4：市の都ヴァルミリア（雪の広場に色とりどりの天幕、真ん中の石の柱）
    w4_market(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.58, h * 0.06, 1, far, R);
      buildings(ctx, w, h * 0.72, h * 0.22, mid, sk.night || sk.dusk, R, true);
      ctx.fillStyle = mix(sk.bot, "#e8eef4", sk.night ? 0.2 : 0.55); ctx.fillRect(0, h * 0.72, w, h);
      const cols = ["#a83a2a", "#2a5a8a", "#c8a03a", "#3a7a4a", "#6a3a7a", "#c86a2a"];
      for (let i = 0; i < 9; i++) {
        const x = w * (0.04 + i * 0.11 + R() * 0.03), b = h * (0.8 + (i % 2) * 0.08), s = h * (0.1 + R() * 0.04);
        ctx.fillStyle = sk.night ? mix(cols[i % cols.length], "#000000", 0.5) : cols[i % cols.length];
        ctx.beginPath(); ctx.moveTo(x - s, b); ctx.lineTo(x, b - s); ctx.lineTo(x + s, b); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(x - s * 0.15, b - s * 0.4, s * 0.3, s * 0.4);
        if (sk.night) glow(ctx, x, b - s * 0.2, s, "#ffcf6e", 0.25);
      }
      ctx.fillStyle = mix(mid, "#8a8478", 0.4); ctx.fillRect(w * 0.48, h * 0.5, w * 0.04, h * 0.32); ctx.fillRect(w * 0.465, h * 0.49, w * 0.07, h * 0.02);
    },
    // W4：古い鉄の道（山腹の坑口へ消える線路と、閉じた板の扉）
    w4_rail(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      peaks(ctx, w, h, h * 0.5, h * 0.3, 4, far, "rgba(240,245,255,.6)", R);
      ctx.fillStyle = mid; ctx.beginPath(); ctx.moveTo(0, h * 0.42); ctx.lineTo(w * 0.62, h * 0.38); ctx.lineTo(w, h * 0.55); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      const cx = w * 0.56, cy = h * 0.6;
      ctx.fillStyle = "#050404"; ctx.beginPath(); ctx.arc(cx, cy, h * 0.12, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - h * 0.12, cy, h * 0.24, h * 0.04);
      ctx.fillStyle = "#4a3a2a"; for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(cx - h * 0.11 + i * h * 0.07, cy - h * 0.1); ctx.rotate(0.15 - i * 0.08); ctx.fillRect(0, 0, h * 0.05, h * 0.14); ctx.restore(); }
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.86, w, h);
      ctx.strokeStyle = "#6a5a48"; ctx.lineWidth = 3;
      for (const off of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w * 0.5 + off * w * 0.16, h); ctx.lineTo(cx + off * h * 0.05, cy + h * 0.04); ctx.stroke(); }
      ctx.lineWidth = 2; for (let i = 0; i < 9; i++) { const t = i / 9, y = h - t * (h - cy - h * 0.04), half = w * 0.18 * (1 - t) + h * 0.06 * t; ctx.beginPath(); ctx.moveTo(w * 0.5 + (cx - w * 0.5) * t - half, y); ctx.lineTo(w * 0.5 + (cx - w * 0.5) * t + half, y); ctx.stroke(); }
      ctx.fillStyle = "#3a2a20"; ctx.fillRect(w * 0.16, h * 0.78, w * 0.1, h * 0.07);
      ctx.fillStyle = "#1a1410"; ctx.beginPath(); ctx.arc(w * 0.18, h * 0.86, 5, 0, Math.PI * 2); ctx.arc(w * 0.24, h * 0.86, 5, 0, Math.PI * 2); ctx.fill();
    },
    // W4：水の都トゥリエル（湖の上の板の道と家々、星見の塔、湖面に映る遠くの大樹）
    w4_water(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = far; ctx.beginPath(); ctx.ellipse(w * 0.82, h * 0.3, w * 0.12, h * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(w * 0.8, h * 0.3, w * 0.04, h * 0.32);
      ridge(ctx, w, h, h * 0.6, h * 0.04, 1, far, R);
      ctx.fillStyle = mix(sk.bot, "#1a3a4a", 0.5); ctx.fillRect(0, h * 0.62, w, h);
      ctx.fillStyle = rgba(far, 0.5); ctx.beginPath(); ctx.ellipse(w * 0.82, h * 0.94, w * 0.1, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 30; i++) { ctx.fillStyle = rgba(sk.sun || "#b8c7e6", 0.12 + R() * 0.15); ctx.fillRect(R() * w, h * (0.64 + R() * 0.34), 16 + R() * 30, 1.5); }
      for (let i = 0; i < 6; i++) {
        const x = w * (0.04 + i * 0.12), b = h * 0.7, bw = w * 0.07, bh = h * (0.08 + R() * 0.06);
        ctx.fillStyle = mid; ctx.fillRect(x, b - bh, bw, bh); ctx.beginPath(); ctx.moveTo(x - 3, b - bh); ctx.lineTo(x + bw / 2, b - bh - bw * 0.4); ctx.lineTo(x + bw + 3, b - bh); ctx.fill();
        for (let k = 0; k < 3; k++) ctx.fillRect(x + k * bw * 0.45, b, 2, h * 0.05);
        if (sk.night || sk.dusk) { ctx.fillStyle = "#ffcf6e"; ctx.fillRect(x + bw * 0.4, b - bh * 0.6, 4, 5); }
      }
      ctx.fillStyle = mid; ctx.fillRect(0, h * 0.7, w * 0.74, 3);
      tower(ctx, w * 0.62, h * 0.7, 16, h * 0.3, mid, mid, null);
      if (sk.night) glow(ctx, w * 0.62, h * 0.38, 40, "#cfe0ff", 0.4);
      ctx.fillStyle = near; ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.88); ctx.lineTo(w * 0.42, h * 0.88); ctx.lineTo(w * 0.4, h * 0.92); ctx.lineTo(w * 0.32, h * 0.92); ctx.fill();
    },
    // W4：沈黙の森（まっすぐな幹が並ぶ、白く褪せた札の森）
    w4_silent(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = "rgba(200,210,220,.08)"; ctx.fillRect(0, 0, w, h);
      for (let layer = 0; layer < 3; layer++) {
        const col = [far, mid, near][layer], n = 8 + layer * 3;
        for (let i = 0; i < n; i++) {
          const x = R() * w, tw = (4 + layer * 6) * (0.7 + R() * 0.6);
          ctx.fillStyle = col; ctx.fillRect(x, 0, tw, h);
          if (layer > 0 && R() < 0.5) { ctx.fillStyle = sk.night ? "rgba(200,200,190,.35)" : "rgba(235,232,220,.75)"; ctx.fillRect(x + tw * 0.15, h * (0.45 + R() * 0.3), tw * 0.7, tw * 1.1); }
        }
      }
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.92, w, h);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = "rgba(20,24,20,.6)"; ctx.beginPath(); ctx.arc(R() * w, h * 0.3 + R() * h * 0.3, 3, 0, Math.PI * 2); ctx.fill(); }
    },
    // W4：鐘の見張り塔（雪の尾根に一里おきに並ぶ石の塔。塔の上の鐘）
    w4_watch(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      peaks(ctx, w, h, h * 0.55, h * 0.35, 6, far, "rgba(240,245,255,.7)", R);
      ridge(ctx, w, h, h * 0.75, h * 0.08, 1, mid, R);
      const towers = [[0.14, 0.82, 1], [0.42, 0.7, 0.6], [0.64, 0.64, 0.4], [0.8, 0.6, 0.28]];
      for (const [tx, b, s] of towers) {
        const x = w * tx, th = h * 0.42 * s, tw = 30 * s + 6;
        ctx.fillStyle = s > 0.5 ? near : mid; ctx.fillRect(x - tw / 2, h * b - th, tw, th);
        ctx.fillRect(x - tw * 0.7, h * b - th - 4, tw * 1.4, 5);
        ctx.fillStyle = "#b08a3a"; ctx.beginPath(); ctx.arc(x, h * b - th - 10 * s - 4, 6 * s + 2, Math.PI, 0); ctx.fill();
        if (sk.night) glow(ctx, x, h * b - th * 0.7, 30 * s + 10, "#ffb04a", 0.4);
      }
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.9, w, h);
    },
    // W4：断界の古関（岩の裂け目を塞ぐ巨大な門と、背丈の刻み目）
    w4_pass(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = far;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.3, 0); ctx.lineTo(w * 0.36, h); ctx.lineTo(0, h); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w * 0.7, 0); ctx.lineTo(w * 0.64, h); ctx.lineTo(w, h); ctx.fill();
      const stone = mix(mid, "#8a8478", 0.35);
      ctx.fillStyle = stone; ctx.fillRect(w * 0.33, h * 0.18, w * 0.34, h * 0.72);
      ctx.fillStyle = "#08080a"; ctx.fillRect(w * 0.42, h * 0.36, w * 0.16, h * 0.54); ctx.beginPath(); ctx.arc(w * 0.5, h * 0.36, w * 0.08, Math.PI, 0); ctx.fill();
      ctx.fillStyle = mix(stone, "#000000", 0.4); for (let i = 0; i < 6; i++) ctx.fillRect(w * 0.6, h * (0.4 + i * 0.08), w * 0.03, 2);
      ctx.fillRect(w * 0.36, h * 0.22, w * 0.28, h * 0.03);
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.9, w, h);
      ridge(ctx, w, h, h * 0.94, h * 0.03, 3, near, R);
    },
    // W4：天蓋の原（空を映す白い塩の原と、滑っていく丸い影）
    w4_canopy(ctx, w, h, sk, R) {
      const salt = mix(sk.bot, "#f2f0ea", sk.night ? 0.15 : 0.6);
      ctx.fillStyle = salt; ctx.fillRect(0, h * 0.6, w, h);
      const g = ctx.createLinearGradient(0, h * 0.6, 0, h); g.addColorStop(0, rgba(sk.bot, 0.6)); g.addColorStop(1, rgba(sk.top || sk.bot, 0.5));
      ctx.fillStyle = g; ctx.fillRect(0, h * 0.6, w, h);
      ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) { const x = R() * w, y = h * (0.62 + R() * 0.36); ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x + 30, y + 4); ctx.stroke(); }
      ctx.fillStyle = "rgba(10,10,16,.55)"; ctx.beginPath(); ctx.ellipse(w * 0.62, h * 0.78, w * 0.3, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(sk.bot, 0.8); ctx.fillRect(0, h * 0.595, w, 2);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = "rgba(20,18,24,.7)"; const x = w * (0.15 + i * 0.12), b = h * 0.64; ctx.fillRect(x, b - 18, 3, 18); ctx.fillStyle = "rgba(20,18,24,.25)"; ctx.fillRect(x, b, 3, 18); }
    },
    // W3：港の商都カルメラント（港に、倉庫と帳場の屋根が重なる。戸口ごとの小さな鈴）
    w3_harbor(ctx, w, h, sk, R) {
      OUT.port(ctx, w, h, sk, R);
      const [, mid] = layers(sk);
      buildings(ctx, w * 0.45, h * 0.9, h * 0.22, mix(mid, "#3a2a1a", 0.3), sk.night || sk.dusk, R, true);
      for (let i = 0; i < 6; i++) { const x = w * (0.04 + i * 0.07), y = h * 0.8; ctx.fillStyle = "#c8a040"; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
    },
    // W3：森と湖の都リグノア（湖の上の砦と、上がった跳ね橋。湖を囲む森）
    w3_lake(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.58, h * 0.05, 1, far, R);
      pines(ctx, w, h * 0.66, h * 0.1, 40, mix(far, mid, 0.5), R);
      ctx.fillStyle = mix(sk.bot, "#2a4a62", 0.55); ctx.fillRect(0, h * 0.66, w, h * 0.22);
      for (let i = 0; i < 12; i++) { ctx.fillStyle = rgba("#ffffff", 0.08); ctx.fillRect(R() * w, h * (0.68 + R() * 0.18), 20 + R() * 40, 1.5); }
      buildings(ctx, w * 0.3, h * 0.7, h * 0.18, mid, sk.night || sk.dusk, R, true);
      ctx.save(); ctx.translate(w * 0.35, 0); tower(ctx, w * 0.05, h * 0.7, 16, h * 0.34, mid, mid, "#3a6a3a"); ctx.restore();
      ctx.fillStyle = mid; ctx.save(); ctx.translate(w * 0.62, h * 0.7); ctx.rotate(-1.1); ctx.fillRect(0, -3, h * 0.14, 6); ctx.restore();
      pines(ctx, w, h * 1.02, h * 0.26, 8, near, R);
    },
    // W7：辺境の都ザイグロス（丘の上の兵舎と、鐘のある見張り塔。遠くに帝国の雪の山）
    w7_frontier(ctx, w, h, sk, R) {
      OUT.fort(ctx, w, h, sk, R);
      const [, mid] = layers(sk);
      tower(ctx, w * 0.82, h * 0.72, 14, h * 0.3, mid, mid, "#c8a24c");
      ctx.fillStyle = "#c8a040"; ctx.beginPath(); ctx.arc(w * 0.82, h * 0.72 - h * 0.3 + 10, 5, 0, Math.PI * 2); ctx.fill();
      if (sk.night || sk.dusk) glow(ctx, w * 0.82, h * 0.44, h * 0.06, "#ffb04a", 0.4);
    },
    // W7：砦の都ブレイナーク（雪の中の三重の灰色の城壁。外の壁の高い所に、四本の爪の跡）
    w7_clawwall(ctx, w, h, sk, R) {
      OUT.fort(ctx, w, h, sk, R);
      ctx.fillStyle = rgba("#f4f6fa", 0.35); ctx.fillRect(0, h * 0.86, w, h * 0.14);
      ctx.strokeStyle = rgba("#1a1416", 0.75); ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(w * (0.18 + i * 0.03), h * 0.5); ctx.quadraticCurveTo(w * (0.2 + i * 0.03), h * 0.6, w * (0.17 + i * 0.03), h * 0.7); ctx.stroke(); }
      ctx.lineCap = "butt";
    },
    // W7：監獄の都グリスハイム（雪の野に、窓の小さな石の塔が何本も。足もとにしがみつく町）
    w7_prison(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.62, h * 0.03, 1, far, R);
      ctx.fillStyle = mix(near, "#e8ecf2", 0.45); ctx.fillRect(0, h * 0.7, w, h);
      for (let i = 0; i < 5; i++) {
        const x = w * (0.14 + i * 0.18), th = h * (0.32 + R() * 0.16);
        tower(ctx, x, h * 0.74, 22, th, mid, mix(mid, "#000000", 0.2));
        for (let k = 0; k < 4; k++) { ctx.fillStyle = sk.night || sk.dusk ? "#ffcc66" : "#151214"; ctx.fillRect(x - 2, h * 0.74 - th + 14 + k * th * 0.22, 4, 6); }
      }
      buildings(ctx, w, h * 0.86, h * 0.12, near, sk.night || sk.dusk, R, true);
    },
    // W7：北の港アイゼルヴァン（氷でふくらんだ杭と舫い、荒れた灰色の外海）
    w7_icehaven(ctx, w, h, sk, R) {
      OUT.port(ctx, w, h, sk, R);
      ctx.fillStyle = rgba("#eef4fa", 0.5);
      for (let i = 0; i < 9; i++) { const x = R() * w, y = h * (0.72 + R() * 0.2); ctx.beginPath(); ctx.ellipse(x, y, 14 + R() * 30, 3 + R() * 4, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = rgba("#ffffff", 0.18); ctx.fillRect(0, 0, w, h);
    },
    // W7：緑の都エルデンホルム（雪の谷の中の、湯気の立つ泉と森。弓の的）
    w7_greenvale(ctx, w, h, sk, R) {
      OUT.w3_lake(ctx, w, h, sk, R);
      for (let i = 0; i < 6; i++) glow(ctx, w * (0.2 + R() * 0.6), h * (0.62 + R() * 0.1), h * 0.08, "#ffffff", 0.18);
      for (const x of [0.12, 0.2]) { ctx.fillStyle = "#e8dcc0"; ctx.beginPath(); ctx.arc(w * x, h * 0.86, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#a83a2a"; ctx.beginPath(); ctx.arc(w * x, h * 0.86, 4, 0, Math.PI * 2); ctx.fill(); }
    },
    // W7：芸の町サリュエス（広場の芝居の板と、色とりどりの幕と壁の絵）
    w7_artstown(ctx, w, h, sk, R) {
      OUT.town(ctx, w, h, sk, R);
      const cols = ["#c84a3a", "#3a7ac8", "#d8b040", "#5aa04a", "#a04ac8"];
      ctx.fillStyle = "#6a4a30"; ctx.fillRect(w * 0.36, h * 0.8, w * 0.28, h * 0.04);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(w * (0.3 + i * 0.04), h * 0.62); ctx.lineTo(w * (0.32 + i * 0.04), h * 0.62); ctx.lineTo(w * (0.31 + i * 0.04), h * 0.66); ctx.fill(); }
      ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.62); ctx.lineTo(w * 0.7, h * 0.62); ctx.stroke();
    },
    // W7：隠れ里レヴァンデル（苔の屋根の家が森に溶ける。真ん中の大きな切り株）
    w7_mossvillage(ctx, w, h, sk, R) {
      OUT.w2_hunt(ctx, w, h, sk, R);
      ctx.fillStyle = rgba("#3a6a2a", 0.22); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#5a4030"; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.9, w * 0.08, h * 0.03, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(w * 0.42, h * 0.84, w * 0.16, h * 0.06);
      ctx.fillStyle = "#8a6a48"; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.84, w * 0.08, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
    },
    // W7：灯台の港ヴォルエラ（凪いだ湾の奥の、白い灯台）
    w7_lighthouse(ctx, w, h, sk, R) {
      OUT.port(ctx, w, h, sk, R);
      const x = w * 0.86, base = h * 0.7, th = h * 0.4;
      ctx.fillStyle = "#f2efe6"; ctx.beginPath(); ctx.moveTo(x - 14, base); ctx.lineTo(x - 8, base - th); ctx.lineTo(x + 8, base - th); ctx.lineTo(x + 14, base); ctx.fill();
      ctx.fillStyle = "#a83a2a"; ctx.fillRect(x - 10, base - th - 10, 20, 10);
      glow(ctx, x, base - th - 5, h * (sk.night || sk.dusk ? 0.14 : 0.05), "#fff0b0", sk.night || sk.dusk ? 0.6 : 0.3);
    },
    // W7b：渡しの町リュッセン（大きな川と渡し舟、岸の通行料の小屋）
    w7_ferry(ctx, w, h, sk, R) {
      OUT.town(ctx, w, h, sk, R);
      ctx.fillStyle = mix(sk.bot, "#2a4a62", 0.6); ctx.fillRect(0, h * 0.84, w, h * 0.16);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = rgba("#ffffff", 0.1); ctx.fillRect(R() * w, h * (0.86 + R() * 0.12), 20 + R() * 30, 1.5); }
      ctx.fillStyle = "#4a3424"; ctx.beginPath(); ctx.moveTo(w * 0.4, h * 0.9); ctx.lineTo(w * 0.6, h * 0.9); ctx.lineTo(w * 0.57, h * 0.94); ctx.lineTo(w * 0.43, h * 0.94); ctx.fill();
    },
    // W7b：傭兵の町グラッツ（柵で囲った練兵場と、札の貼られた大きな板）
    w7_mercs(ctx, w, h, sk, R) {
      OUT.town(ctx, w, h, sk, R);
      ctx.fillStyle = "#5a4430"; for (let i = 0; i < 16; i++) ctx.fillRect(w * (0.05 + i * 0.06), h * 0.82, 3, h * 0.08);
      ctx.fillRect(w * 0.05, h * 0.84, w * 0.9, 2);
      ctx.fillStyle = "#6a5034"; ctx.fillRect(w * 0.42, h * 0.62, w * 0.16, h * 0.12);
      for (let i = 0; i < 12; i++) { ctx.fillStyle = rgba("#f0e8d0", 0.9); ctx.fillRect(w * (0.43 + (i % 4) * 0.037), h * (0.63 + Math.floor(i / 4) * 0.035), w * 0.03, h * 0.028); }
    },
    // W7b：発掘人の町ドゥルム（天幕と石の家、遠くに崩れた柱）
    w7_diggers(ctx, w, h, sk, R) {
      OUT.town(ctx, w, h, sk, R);
      ctx.fillStyle = "#e8e0cc"; for (let i = 0; i < 5; i++) { const x = w * (0.1 + i * 0.2); ctx.fillRect(x, h * 0.5, 8, h * (0.1 + R() * 0.1)); }
      for (let i = 0; i < 4; i++) { const x = w * (0.15 + i * 0.22); ctx.fillStyle = ["#b8a07a", "#a88a5a", "#c8b48a"][i % 3]; ctx.beginPath(); ctx.moveTo(x - 24, h * 0.92); ctx.lineTo(x, h * 0.84); ctx.lineTo(x + 24, h * 0.92); ctx.fill(); }
    },
    // W7b：葡萄の町ヴィナレ（斜面の葡萄の棚と樽）
    w7_vineyard(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.55, h * 0.06, 1, far, R);
      ctx.fillStyle = mix(mid, "#6a8a3a", 0.4); ctx.beginPath(); ctx.moveTo(0, h * 0.62); ctx.quadraticCurveTo(w * 0.5, h * 0.52, w, h * 0.66); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      for (let r = 0; r < 7; r++) { ctx.strokeStyle = mix(near, "#3a5a1a", 0.5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, h * (0.66 + r * 0.045)); ctx.quadraticCurveTo(w * 0.5, h * (0.58 + r * 0.05), w, h * (0.7 + r * 0.045)); ctx.stroke(); }
      buildings(ctx, w * 0.35, h * 0.62, h * 0.12, mid, sk.night || sk.dusk, R, true);
      for (const x of [0.7, 0.75, 0.8]) { ctx.fillStyle = "#6a4024"; ctx.beginPath(); ctx.ellipse(w * x, h * 0.93, 14, 10, 0, 0, Math.PI * 2); ctx.fill(); }
    },
    // W7b：巡礼の宿場オルベ（軒に吊るした巡礼の杖の束、丘の向こうの尖塔）
    w7_pilgrim(ctx, w, h, sk, R) {
      OUT.town(ctx, w, h, sk, R);
      ctx.fillStyle = "#e8dcb0"; ctx.beginPath(); ctx.moveTo(w * 0.86, h * 0.36); ctx.lineTo(w * 0.875, h * 0.5); ctx.lineTo(w * 0.845, h * 0.5); ctx.fill();
      ctx.strokeStyle = "#7a5a34"; ctx.lineWidth = 2; for (let i = 0; i < 14; i++) { const x = w * (0.2 + i * 0.012); ctx.beginPath(); ctx.moveTo(x, h * 0.7); ctx.lineTo(x + (R() - 0.5) * 4, h * 0.8); ctx.stroke(); }
    },
    // W7b：写本の町メルヴィ（川べりの修道院、窓の並ぶ長い棟）
    w7_scriptorium(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.58, h * 0.04, 1, far, R);
      ctx.fillStyle = mid; ctx.fillRect(w * 0.2, h * 0.5, w * 0.6, h * 0.22);
      tower(ctx, w * 0.5, h * 0.5, 18, h * 0.16, mid, mix(mid, "#000000", 0.2));
      for (let i = 0; i < 10; i++) { ctx.fillStyle = sk.night || sk.dusk ? "#ffd08a" : "#2a2420"; ctx.fillRect(w * (0.23 + i * 0.056), h * 0.58, 6, 12); }
      ctx.fillStyle = mix(sk.bot, "#2a4a62", 0.55); ctx.fillRect(0, h * 0.78, w, h * 0.1);
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.88, w, h);
    },
    // W7b：蝋燭の町リュミエ（窓辺に簾のように吊るした白い蝋燭、夜も明るい通り）
    w7_candles(ctx, w, h, sk, R) {
      OUT.town(ctx, w, h, sk, R);
      for (let i = 0; i < 30; i++) { const x = w * (0.08 + (i % 15) * 0.06), y = h * (0.66 + Math.floor(i / 15) * 0.08); ctx.fillStyle = "#f4efe0"; ctx.fillRect(x, y, 2.5, h * 0.05); }
      for (let i = 0; i < 6; i++) glow(ctx, w * (0.1 + i * 0.16), h * 0.72, h * 0.08, "#ffd88a", sk.night || sk.dusk ? 0.45 : 0.15);
    },
    // W7b：泉の町セレナ（海を見下ろす崖の上の泉と小さな祠）
    w7_spring(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = mix(sk.bot, "#2a4a62", 0.5); ctx.fillRect(0, h * 0.55, w, h * 0.45);
      ctx.fillStyle = mid; ctx.beginPath(); ctx.moveTo(w * 0.35, h); ctx.lineTo(w * 0.42, h * 0.6); ctx.lineTo(w, h * 0.58); ctx.lineTo(w, h); ctx.fill();
      buildings(ctx, w * 0.5, h * 0.62, h * 0.1, mid, sk.night || sk.dusk, R, true);
      ctx.fillStyle = mix(sk.bot, "#4a8aa8", 0.5); ctx.beginPath(); ctx.ellipse(w * 0.7, h * 0.8, w * 0.08, h * 0.03, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = near; ctx.fillRect(w * 0.6, h * 0.84, w * 0.4, h);
    },
    // W7b：祈りの浜ノルヴェ（浜に引き上げた小舟、干した網、浜の小さな祠）
    w7_prayerbeach(ctx, w, h, sk, R) {
      OUT.port(ctx, w, h, sk, R);
      ctx.fillStyle = "#d8c8a0"; ctx.fillRect(0, h * 0.88, w, h * 0.12);
      for (const x of [0.2, 0.32, 0.6]) { ctx.fillStyle = "#4a3424"; ctx.beginPath(); ctx.ellipse(w * x, h * 0.92, 26, 6, 0.1, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = rgba("#3a3a3a", 0.6); ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(w * (0.72 + i * 0.02), h * 0.78); ctx.lineTo(w * (0.72 + i * 0.02), h * 0.88); ctx.stroke(); }
      ctx.fillStyle = "#8a3a2a"; ctx.fillRect(w * 0.9, h * 0.82, 14, 16); ctx.beginPath(); ctx.moveTo(w * 0.9 - 4, h * 0.82); ctx.lineTo(w * 0.9 + 7, h * 0.79); ctx.lineTo(w * 0.9 + 18, h * 0.82); ctx.fill();
    },
    // W7c：塩の島ソルネ（鏡のような四角い塩田）
    w7_saltpans(ctx, w, h, sk, R) {
      OUT.yakumo(ctx, w, h, sk, R);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = rgba("#f4f6f8", 0.75); ctx.fillRect(w * (0.05 + i * 0.15), h * 0.86, w * 0.12, h * 0.05); ctx.strokeStyle = "#8a7a5a"; ctx.strokeRect(w * (0.05 + i * 0.15), h * 0.86, w * 0.12, h * 0.05); }
    },
    // W7c：網の島カラヴ（浜から浜へ渡した綱に干した網）
    w7_netisle(ctx, w, h, sk, R) {
      OUT.yakumo(ctx, w, h, sk, R);
      ctx.strokeStyle = rgba("#3a3a3a", 0.55); ctx.lineWidth = 1;
      for (let i = 0; i < 18; i++) { const x = w * (0.04 + i * 0.053); ctx.beginPath(); ctx.moveTo(x, h * 0.62); ctx.lineTo(x + 6, h * 0.8); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, h * 0.62); ctx.lineTo(w, h * 0.62); ctx.stroke();
    },
    // W7c：霧鐘の島ミストラ（外海に向いた崖の上の大きな鐘）
    w7_bellisle(ctx, w, h, sk, R) {
      OUT.port(ctx, w, h, sk, R);
      ctx.fillStyle = "#3a3634"; ctx.beginPath(); ctx.moveTo(w * 0.62, h); ctx.lineTo(w * 0.7, h * 0.52); ctx.lineTo(w, h * 0.5); ctx.lineTo(w, h); ctx.fill();
      ctx.fillStyle = "#5a4a34"; ctx.fillRect(w * 0.8, h * 0.36, 4, h * 0.14); ctx.fillRect(w * 0.88, h * 0.36, 4, h * 0.14); ctx.fillRect(w * 0.8, h * 0.36, w * 0.08 + 4, 4);
      ctx.fillStyle = "#b08a3a"; ctx.beginPath(); ctx.moveTo(w * 0.83, h * 0.46); ctx.quadraticCurveTo(w * 0.842, h * 0.38, w * 0.854, h * 0.38); ctx.quadraticCurveTo(w * 0.866, h * 0.38, w * 0.878, h * 0.46); ctx.fill();
      ctx.fillStyle = rgba("#e8ecf0", 0.25); ctx.fillRect(0, h * 0.5, w, h * 0.5);
    },
    // W7c：真珠採りの島ヨナ（浅い入り江と小舟、殻で葺いた屋根）
    w7_pearls(ctx, w, h, sk, R) {
      OUT.yakumo(ctx, w, h, sk, R);
      ctx.fillStyle = rgba("#6ad0c8", 0.35); ctx.fillRect(0, h * 0.82, w, h * 0.08);
      for (let i = 0; i < 20; i++) { ctx.fillStyle = rgba("#f0ece4", 0.85); ctx.beginPath(); ctx.arc(w * (0.1 + R() * 0.8), h * (0.92 + R() * 0.06), 3, 0, Math.PI * 2); ctx.fill(); }
    },
    // W7c：井戸の砦町ケルン（深い井戸と、兵站の倉）
    w7_wellfort(ctx, w, h, sk, R) {
      OUT.fort(ctx, w, h, sk, R);
      ctx.fillStyle = "#5a5450"; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.9, w * 0.06, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4a3424"; ctx.fillRect(w * 0.46, h * 0.8, 4, h * 0.1); ctx.fillRect(w * 0.54 - 4, h * 0.8, 4, h * 0.1); ctx.fillRect(w * 0.46, h * 0.8, w * 0.08, 4);
    },
    // W7c：鐘待ちの村リーネ（畑と、畑より少し広い墓地）
    w7_widows(ctx, w, h, sk, R) {
      OUT.w2_farm(ctx, w, h, sk, R);
      ctx.fillStyle = "#6a6460"; for (let i = 0; i < 14; i++) { const x = w * (0.55 + (i % 7) * 0.06), y = h * (0.84 + Math.floor(i / 7) * 0.06); ctx.fillRect(x, y, 4, 10); ctx.fillRect(x - 3, y + 3, 10, 3); }
    },
    // W7c：北の烽火台ヴェルト（北の海を背にした三つの烽火台と煙）
    w7_beacon(ctx, w, h, sk, R) {
      OUT.fort(ctx, w, h, sk, R);
      for (const x of [0.2, 0.5, 0.8]) { ctx.fillStyle = "#4a4648"; ctx.fillRect(w * x - 8, h * 0.42, 16, h * 0.2); glow(ctx, w * x, h * 0.4, h * 0.05, "#ffa040", sk.night || sk.dusk ? 0.6 : 0.2); ctx.fillStyle = rgba("#9a9a9a", 0.35); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(w * x + k * 5, h * (0.36 - k * 0.05), 8 + k * 4, 0, Math.PI * 2); ctx.fill(); } }
    },
    // W7c：最後の村ハルト（山の肩の石の家、山に背を向けた小さな像）
    w7_lastvillage(ctx, w, h, sk, R) {
      OUT.mountain(ctx, w, h, sk, R);
      const [, mid] = layers(sk);
      buildings(ctx, w * 0.5, h * 0.86, h * 0.1, mix(mid, "#6a6460", 0.4), sk.night || sk.dusk, R, true);
      for (const x of [0.6, 0.66, 0.72]) { ctx.fillStyle = "#8a8480"; ctx.fillRect(w * x, h * 0.88, 5, 12); ctx.beginPath(); ctx.arc(w * x + 2.5, h * 0.875, 4, 0, Math.PI * 2); ctx.fill(); }
    },
    // W7c：峠の庵ザレム（霧の峠の、崩れかけた庵と祭壇）
    w7_hermitage(ctx, w, h, sk, R) {
      OUT.mountain(ctx, w, h, sk, R);
      const [, mid] = layers(sk);
      ctx.fillStyle = mix(mid, "#5a4a3a", 0.5); ctx.fillRect(w * 0.42, h * 0.74, w * 0.16, h * 0.12);
      ctx.beginPath(); ctx.moveTo(w * 0.4, h * 0.74); ctx.lineTo(w * 0.5, h * 0.66); ctx.lineTo(w * 0.6, h * 0.74); ctx.fill();
      glow(ctx, w * 0.5, h * 0.8, h * 0.05, "#ffd08a", sk.night || sk.dusk ? 0.5 : 0.15);
      ctx.fillStyle = rgba("#e8ecf0", 0.3); ctx.fillRect(0, h * 0.6, w, h * 0.4);
    },
    // W3：火山の都フロスレイア（煙を上げる火山の斜面に、白い家が段々に貼りつく）
    w3_volcano(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = far; ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.8); ctx.lineTo(w * 0.42, h * 0.22); ctx.lineTo(w * 0.52, h * 0.22); ctx.lineTo(w * 0.9, h * 0.8); ctx.fill();
      glow(ctx, w * 0.47, h * 0.22, 60, "#ff7a3a", 0.35);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = rgba("#5a5450", 0.3 - i * 0.04); ctx.beginPath(); ctx.ellipse(w * (0.47 + i * 0.04), h * (0.16 - i * 0.03), 30 + i * 14, 12 + i * 5, 0, 0, Math.PI * 2); ctx.fill(); }
      ridge(ctx, w, h, h * 0.8, h * 0.05, 1, mid, R);
      buildings(ctx, w, h * 0.86, h * 0.14, mix(mid, "#e8e4dc", sk.night ? 0.15 : 0.45), sk.night || sk.dusk, R, true);
      buildings(ctx, w, h * 0.98, h * 0.16, near, sk.night, R, true);
      particles(ctx, w, h, 30, "rgba(90,84,80,.5)", 1.5, R);
    },
    // W3：鐘撞きの丘（丘ごとに見張り塔と鐘）
    w3_bells(ctx, w, h, sk, R) {
      OUT.plains(ctx, w, h, sk, R);
      const [, mid] = layers(sk);
      for (const [x, y, s] of [[0.2, 0.7, 0.9], [0.55, 0.64, 0.6], [0.82, 0.76, 1.1]]) { tower(ctx, w * x, h * y, 12 * s, h * 0.22 * s, mid, mid, "#c8a040"); ctx.fillStyle = "#c8a040"; ctx.beginPath(); ctx.arc(w * x, h * y - h * 0.18 * s, 4 * s, Math.PI, 0); ctx.fill(); }
    },
    // W3：沈黙の修道院（糸杉の丘に、屋根の落ちた修道院）
    w3_abbey(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.62, h * 0.06, 1, far, R);
      for (let i = 0; i < 8; i++) { const x = w * (0.05 + i * 0.13), b = h * 0.78, s = h * (0.16 + R() * 0.08); ctx.fillStyle = mid; ctx.beginPath(); ctx.ellipse(x, b - s / 2, s * 0.12, s / 2, 0, 0, Math.PI * 2); ctx.fill(); }
      const stone = mix(mid, "#b8b0a0", sk.night ? 0.2 : 0.45);
      ctx.fillStyle = stone; ctx.fillRect(w * 0.32, h * 0.52, w * 0.36, h * 0.3);
      ctx.fillStyle = mix(stone, near, 0.6); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(w * (0.36 + i * 0.07), h * 0.66, w * 0.022, Math.PI, 0); ctx.lineTo(w * (0.36 + i * 0.07) + w * 0.022, h * 0.76); ctx.lineTo(w * (0.36 + i * 0.07) - w * 0.022, h * 0.76); ctx.fill(); }
      ctx.fillStyle = sk.bot; for (let i = 0; i < 6; i++) ctx.fillRect(w * (0.32 + R() * 0.32), h * 0.52, w * 0.04, h * (0.02 + R() * 0.06));
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.82, w, h);
    },
    // W3：数の合わない島（霧の海に、小島がいくつも浮かぶ）
    w3_isles(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = mix(sk.bot, "#2a4a62", 0.5); ctx.fillRect(0, h * 0.62, w, h);
      for (let i = 0; i < 9; i++) { const x = R() * w, y = h * (0.62 + R() * 0.2), s = 20 + R() * 60 * (y / h); ctx.fillStyle = mix(far, mid, y / h - 0.5); ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.3, 0, Math.PI, 0); ctx.fill(); }
      for (let i = 0; i < 5; i++) { const g = ctx.createLinearGradient(0, h * (0.6 + i * 0.06), 0, h * (0.66 + i * 0.06)); g.addColorStop(0, "rgba(220,228,232,0)"); g.addColorStop(0.5, "rgba(220,228,232,.18)"); g.addColorStop(1, "rgba(220,228,232,0)"); ctx.fillStyle = g; ctx.fillRect(0, h * (0.6 + i * 0.06), w, h * 0.06); }
      ctx.fillStyle = near; ctx.beginPath(); ctx.ellipse(w * 0.2, h * 1.02, w * 0.35, h * 0.12, 0, Math.PI, 0); ctx.fill();
    },
    // W3：灰の観測所（火山の中腹、灰に半分埋もれた丸屋根）
    w3_ashvault(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = far; ctx.beginPath(); ctx.moveTo(0, h * 0.7); ctx.lineTo(w * 0.7, h * 0.18); ctx.lineTo(w, h * 0.4); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      glow(ctx, w * 0.7, h * 0.18, 50, "#ff7a3a", 0.25);
      const ash = mix(sk.bot, "#5a5450", 0.6);
      ctx.fillStyle = ash; ctx.fillRect(0, h * 0.78, w, h);
      ctx.fillStyle = mix(mid, "#8a8478", 0.4); ctx.beginPath(); ctx.arc(w * 0.45, h * 0.8, h * 0.18, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#0a0806"; ctx.fillRect(w * 0.43, h * 0.7, w * 0.04, h * 0.1);
      ctx.fillStyle = ash; ctx.beginPath(); ctx.ellipse(w * 0.45, h * 0.82, h * 0.3, h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      particles(ctx, w, h, 40, "rgba(120,114,108,.5)", 1.5, R);
      ctx.fillStyle = near; ctx.fillRect(0, h * 0.96, w, h);
    },
    // W3：潮鳴りの洞（磯の崖に口を開ける海蝕洞）
    w3_seacave(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = mix(sk.bot, "#2a4a62", 0.5); ctx.fillRect(0, h * 0.64, w, h);
      ctx.fillStyle = mid; ctx.beginPath(); ctx.moveTo(w * 0.3, h); ctx.lineTo(w * 0.36, h * 0.3); ctx.lineTo(w * 0.7, h * 0.24); ctx.lineTo(w * 0.95, h * 0.4); ctx.lineTo(w, h); ctx.fill();
      ctx.fillStyle = "#050608"; ctx.beginPath(); ctx.ellipse(w * 0.6, h * 0.78, w * 0.1, h * 0.16, 0, Math.PI, 0); ctx.fill();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = rgba("#ffffff", 0.25); ctx.fillRect(w * (0.4 + R() * 0.4), h * (0.8 + R() * 0.12), 16 + R() * 30, 2); }
      ridge(ctx, w, h, h * 0.97, h * 0.04, 2, near, R);
    },
    forest(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.58, h * 0.06, 1, far, R);
      pines(ctx, w, h * 0.68, h * 0.12, 40, mix(far, mid, 0.5), R);
      pines(ctx, w, h * 0.82, h * 0.17, 22, mid, R);
      pines(ctx, w, h * 1.02, h * 0.28, 9, near, R);
      if (!sk.night && !sk.veil) for (let i = 0; i < 5; i++) { ctx.fillStyle = rgba(sk.sun || "#fff", 0.07); ctx.beginPath(); const x = R() * w; ctx.moveTo(x, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 110, h); ctx.lineTo(x + 60, h); ctx.fill(); }
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
    // E2：腐れ庭園（毒沼の奥の、ありえないほど色鮮やかな花畑。四角く刈り込んだ生け垣と、塔ほどもある植木鋏）
    e2_garden(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ridge(ctx, w, h, h * 0.56, h * 0.05, 2, far, R);
      ctx.fillStyle = mix(mid, "#1a2216", 0.4);
      for (let i = 0; i < 9; i++) { const x = R() * w, th = h * (0.12 + R() * 0.1); ctx.fillRect(x - 2, h * 0.62 - th, 4, th); ctx.fillRect(x - 10, h * 0.62 - th * 0.7, 10, 2); ctx.fillRect(x, h * 0.62 - th * 0.5, 9, 2); }
      ctx.fillStyle = mix(near, "#3a4a2a", 0.35); ctx.fillRect(0, h * 0.62, w, h);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = rgba("#9ac27a", 0.1); ctx.beginPath(); ctx.ellipse(R() * w, h * (0.64 + R() * 0.06), 20 + R() * 40, 3, 0, 0, Math.PI * 2); ctx.fill(); }
      // 生け垣（定規で測ったように四角い）
      const hedge = mix("#2e6a2a", sk.bot, sk.night ? 0.6 : 0.15);
      for (const [x0, x1] of [[0.02, 0.3], [0.72, 0.98]]) { ctx.fillStyle = hedge; ctx.fillRect(w * x0, h * 0.57, w * (x1 - x0), h * 0.1); ctx.fillStyle = rgba("#ffffff", 0.1); ctx.fillRect(w * x0, h * 0.57, w * (x1 - x0), 2); }
      // 植木鋏（地面に突き立ててある。刃の長さは家より長い）
      const px = w * 0.56, py = h * 0.2, steel = mix(mid, "#a8acb4", sk.night ? 0.25 : 0.5);
      for (const s of [-1, 1]) {
        ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + s * w * 0.05, h * 0.68); ctx.lineTo(px + s * w * 0.05 - s * 7, h * 0.68); ctx.lineTo(px + 3, py); ctx.fill();
        ctx.strokeStyle = mix(near, "#5a3a22", 0.4); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - s * w * 0.04, py - h * 0.1); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(px - s * w * 0.05, py - h * 0.13, 9, 6, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = "#1a1a1e"; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      flowerBeds(ctx, w, h, 0.7, 4, near, sk.night, R);
      // 花に埋もれた兜
      ctx.fillStyle = mix("#7a7a76", near, sk.night ? 0.5 : 0.1); ctx.beginPath(); ctx.arc(w * 0.28, h * 0.9, 9, Math.PI, 0); ctx.fill(); ctx.fillRect(w * 0.28 - 10, h * 0.9, 20, 2);
      glow(ctx, w * 0.5, h * 0.85, w * 0.5, "#ff9ac0", sk.night ? 0.08 : 0.14);
    },
    // E2：肉の谷の大厨房（城ほどもある厨房。煙突の湯気、地面に突き立った、塔より高い肉叉と包丁）
    e2_kitchen(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(RED_SKY);
      ridge(ctx, w, h, h * 0.52, h * 0.1, 1.4, mix(far, "#5a1a14", 0.35), R);
      ridge(ctx, w, h, h * 0.66, h * 0.05, 2.2, mix(mid, "#4a1410", 0.3), R);
      const bx = w * 0.26, bw = w * 0.48, top = h * 0.42, base = h * 0.84;
      for (let i = 0; i < 4; i++) {
        const x = bx + bw * (0.1 + i * 0.26), ch = h * (0.2 + (i % 2) * 0.1);
        ctx.fillStyle = mid; ctx.fillRect(x, top - ch, w * 0.035, ch + 4);
        for (let j = 0; j < 6; j++) { ctx.fillStyle = rgba("#e8dcd0", 0.1 + R() * 0.12); ctx.beginPath(); ctx.arc(x + w * 0.018 + (R() - 0.3) * j * 8, top - ch - j * h * 0.05, 8 + j * 5, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = mid; ctx.fillRect(bx, top, bw, base - top);
      ctx.beginPath(); ctx.moveTo(bx - 8, top); ctx.lineTo(bx + bw * 0.5, top - h * 0.1); ctx.lineTo(bx + bw + 8, top); ctx.fill();
      for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) if (R() < 0.7) { ctx.fillStyle = R() < 0.5 ? "#ff8a2a" : "#ffb04a"; ctx.fillRect(bx + bw * (0.05 + i * 0.105), top + (base - top) * (0.15 + r * 0.25), 6, 9); }
      // 人の背丈の勝手口（建物の大きさが分かるように）
      ctx.fillStyle = "#ffcf6e"; ctx.fillRect(bx + bw * 0.5 - 2, base - 7, 4, 7);
      glow(ctx, bx + bw * 0.5, base - 4, 16, "#ffb04a", 0.5);
      // 地面に突き立った肉叉と包丁
      const steel = mix(mid, "#b8b4b0", 0.35);
      ctx.fillStyle = steel;
      const fx = w * 0.11; ctx.fillRect(fx - 3, h * 0.28, 6, h * 0.6);
      ctx.fillRect(fx - 16, h * 0.28, 32, 5); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(fx - 15 + i * 10, h * 0.28); ctx.lineTo(fx - 13 + i * 10, h * 0.08); ctx.lineTo(fx - 11 + i * 10, h * 0.28); ctx.fill(); }
      const kx = w * 0.88; ctx.beginPath(); ctx.moveTo(kx - 8, h * 0.88); ctx.lineTo(kx - 8, h * 0.18); ctx.quadraticCurveTo(kx + 14, h * 0.26, kx + 14, h * 0.88); ctx.fill();
      ctx.fillStyle = mix(near, "#3a2014", 0.5); ctx.fillRect(kx - 10, h * 0.88, 26, 3);
      // 煮汁の川
      ctx.fillStyle = near; ctx.fillRect(0, base, w, h);
      ctx.fillStyle = rgba("#a0521e", 0.55); ctx.beginPath(); ctx.moveTo(0, h * 0.93); ctx.quadraticCurveTo(w * 0.5, h * 0.87, w, h * 0.95); ctx.lineTo(w, h * 0.98); ctx.quadraticCurveTo(w * 0.5, h * 0.91, 0, h * 0.97); ctx.fill();
      glow(ctx, w * 0.5, h * 0.9, w * 0.4, "#ff6a2a", 0.18);
      particles(ctx, w, h * 0.8, 70, "rgba(230,220,210,.25)", 2, R);
    },
    // 鬼ヶ島：荒れた海に突き出た岩の島。洞窟の口に鬼の顔のような岩、しめ縄、酒樽、宴の赤い灯
    onigashima(ctx, w, h, sk, R) {
      const [far, mid, near] = layers(sk);
      ctx.fillStyle = mix(sk.bot, "#1a2a3a", 0.55); ctx.fillRect(0, h * 0.6, w, h);
      ctx.strokeStyle = rgba("#ffffff", sk.night ? 0.12 : 0.28); ctx.lineWidth = 1.2;
      for (let i = 0; i < 26; i++) { const x = R() * w, y = h * (0.62 + R() * 0.36); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - 3, x + 16 + R() * 10, y); ctx.stroke(); }
      const cx = w * 0.52, base = h * 0.8;
      ctx.fillStyle = mid; ctx.beginPath(); ctx.moveTo(cx - w * 0.34, base);
      for (let i = 0; i <= 12; i++) { const t = i / 12; ctx.lineTo(cx - w * 0.34 + t * w * 0.68, base - h * (0.2 + Math.sin(t * Math.PI) * 0.42) + (R() - 0.5) * h * 0.05); }
      ctx.lineTo(cx + w * 0.34, base); ctx.fill();
      pines(ctx, w * 0.3, h * 0.36, h * 0.06, 3, mix(mid, "#1a2a1a", 0.3), R);
      // 角のような二本の岩
      ctx.fillStyle = mid; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * w * 0.1, h * 0.3); ctx.quadraticCurveTo(cx + s * w * 0.13, h * 0.12, cx + s * w * 0.18, h * 0.08); ctx.quadraticCurveTo(cx + s * w * 0.15, h * 0.2, cx + s * w * 0.16, h * 0.32); ctx.fill(); }
      // 洞窟の口（鬼の顔のような岩）と、奥の宴の灯
      ctx.fillStyle = "#07060a"; ctx.beginPath(); ctx.moveTo(cx - w * 0.08, base); ctx.quadraticCurveTo(cx - w * 0.08, base - h * 0.26, cx, base - h * 0.27); ctx.quadraticCurveTo(cx + w * 0.08, base - h * 0.26, cx + w * 0.08, base); ctx.fill();
      glow(ctx, cx, base - h * 0.08, h * 0.2, "#ff5a2a", 0.5);
      ctx.fillStyle = "#07060a"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * w * 0.05, base - h * 0.36, w * 0.022, h * 0.03, s * 0.4, 0, Math.PI * 2); ctx.fill(); }
      glow(ctx, cx - w * 0.05, base - h * 0.36, 12, "#ff3a2a", 0.6); glow(ctx, cx + w * 0.05, base - h * 0.36, 12, "#ff3a2a", 0.6);
      ctx.strokeStyle = "#d8c89a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - w * 0.09, base - h * 0.24); ctx.quadraticCurveTo(cx, base - h * 0.2, cx + w * 0.09, base - h * 0.24); ctx.stroke();
      ctx.fillStyle = "#f0ece0"; for (let i = 0; i < 4; i++) { const x = cx - w * 0.06 + i * w * 0.04; ctx.fillRect(x, base - h * 0.225, 4, 10); }
      // 転がった酒樽
      for (const [x, r] of [[0.38, 9], [0.64, 11], [0.68, 8]]) { ctx.fillStyle = mix("#7a4a2a", near, sk.night ? 0.5 : 0.2); ctx.beginPath(); ctx.ellipse(w * x, base - r * 0.8, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#2a1a10"; ctx.fillRect(w * x - r, base - r * 0.9, r * 2, 2); }
      ctx.fillStyle = near; ctx.fillRect(cx - w * 0.36, base, w * 0.72, h * 0.04);
      for (const x of [0.3, 0.74]) { ctx.fillStyle = mix("#b0342a", near, sk.night ? 0.2 : 0.4); ctx.beginPath(); ctx.arc(w * x, base - h * 0.12, 5, 0, Math.PI * 2); ctx.fill(); glow(ctx, w * x, base - h * 0.12, 18, "#ff8a3a", sk.night ? 0.6 : 0.25); ctx.fillStyle = near; ctx.fillRect(w * x - 1, base - h * 0.12, 2, h * 0.12); }
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
    // M1：エルメシアの学院（天井までの書架、浮かぶ灯り、床の魔法陣、結晶の窓）
    academy(ctx, w, h, R) {
      interior(ctx, w, h, "#3a3450", "#221e30", R);
      const cx = w * 0.5;
      ctx.fillStyle = "#12101c"; ctx.beginPath(); ctx.arc(cx, h * 0.3, h * 0.16, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - h * 0.16, h * 0.3, h * 0.32, h * 0.26);
      glow(ctx, cx, h * 0.34, h * 0.3, "#7fe3ff", 0.35);
      ctx.fillStyle = "#bff4ff"; ctx.beginPath(); ctx.moveTo(cx, h * 0.18); ctx.lineTo(cx + h * 0.05, h * 0.34); ctx.lineTo(cx, h * 0.5); ctx.lineTo(cx - h * 0.05, h * 0.34); ctx.fill();
      for (const side of [0, 1]) {
        const x0 = side ? w * 0.66 : w * 0.04, bw = w * 0.3;
        ctx.fillStyle = "#1a1424"; ctx.fillRect(x0, h * 0.06, bw, h * 0.66);
        for (let s = 0; s < 6; s++) {
          const y = h * (0.16 + s * 0.1);
          ctx.fillStyle = "#0e0a14"; ctx.fillRect(x0, y, bw, 4);
          for (let x = x0 + 3; x < x0 + bw - 6;) { const bk = 4 + R() * 6, bh = h * (0.05 + R() * 0.035); ctx.fillStyle = mix(["#6a2a3a", "#2a4a6a", "#5a4a2a", "#3a5a3a", "#4a3a6a"][Math.floor(R() * 5)], "#000000", 0.35); ctx.fillRect(x, y - bh, bk, bh); x += bk + 1; }
        }
      }
      for (let i = 0; i < 7; i++) { const x = w * (0.2 + R() * 0.6), y = h * (0.1 + R() * 0.35); glow(ctx, x, y, 26, i % 2 ? "#c0a0ff" : "#ffd88a", 0.55); ctx.fillStyle = "#fff4d8"; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = rgba("#9fd8ff", 0.55); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, h * 0.86, w * 0.22, h * 0.07, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, h * 0.86, w * 0.15, h * 0.045, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, b = ((i + 2) / 6) * Math.PI * 2; ctx.moveTo(cx + Math.cos(a) * w * 0.15, h * 0.86 + Math.sin(a) * h * 0.045); ctx.lineTo(cx + Math.cos(b) * w * 0.15, h * 0.86 + Math.sin(b) * h * 0.045); } ctx.stroke();
      glow(ctx, cx, h * 0.86, w * 0.2, "#7fc8ff", 0.2);
      ctx.fillStyle = "#1a1424"; ctx.fillRect(w * 0.36, h * 0.66, w * 0.28, 8); ctx.fillRect(w * 0.38, h * 0.67, 6, h * 0.1); ctx.fillRect(w * 0.6, h * 0.67, 6, h * 0.1);
      ctx.fillStyle = "#e8dcc0"; ctx.save(); ctx.translate(w * 0.47, h * 0.645); ctx.rotate(-0.06); ctx.fillRect(0, 0, w * 0.06, 6); ctx.restore();
    },
    // W2：新しい施設の中（鍛冶場・闘技場・湯治場。畑と狩り場は、町の昼の景色を使う）
    forge(ctx, w, h, R) {
      interior(ctx, w, h, "#3a2a22", "#241812", R);
      const cx = w * 0.5;
      ctx.fillStyle = "#1a120c"; ctx.fillRect(cx - w * 0.16, h * 0.28, w * 0.32, h * 0.44);
      ctx.beginPath(); ctx.moveTo(cx - w * 0.12, h * 0.28); ctx.lineTo(cx - w * 0.05, 0); ctx.lineTo(cx + w * 0.05, 0); ctx.lineTo(cx + w * 0.12, h * 0.28); ctx.fill();
      glow(ctx, cx, h * 0.55, h * 0.45, "#ff7a1a", 0.6);
      ctx.fillStyle = "#ffb04a"; ctx.beginPath(); ctx.arc(cx, h * 0.6, w * 0.08, Math.PI, 0); ctx.fillRect(cx - w * 0.08, h * 0.6, w * 0.16, h * 0.08); ctx.fill();
      ctx.fillStyle = "#0e0a08"; ctx.fillRect(w * 0.14, h * 0.72, w * 0.14, h * 0.05); ctx.fillRect(w * 0.18, h * 0.77, w * 0.06, h * 0.12); ctx.beginPath(); ctx.moveTo(w * 0.28, h * 0.72); ctx.lineTo(w * 0.33, h * 0.735); ctx.lineTo(w * 0.28, h * 0.75); ctx.fill();
      for (let i = 0; i < 9; i++) { const x = w * (0.66 + (i % 5) * 0.06), y = h * (0.14 + Math.floor(i / 5) * 0.26); ctx.fillStyle = "#8a8a90"; ctx.fillRect(x, y, 3, h * 0.2); ctx.fillStyle = "#5a3a22"; ctx.fillRect(x - 2, y, 7, h * 0.05); ctx.fillStyle = "#4a3a28"; ctx.fillRect(x - 1, y - 3, 5, 3); }
      particles(ctx, w, h * 0.7, 40, "rgba(255,180,80,.7)", 1.6, R);
    },
    // 闘技場の中（砂の上から見上げる高い壁。鉄格子の門、鎖、色あせた旗、壁際の武器。上の方は描かない）
    arena(ctx, w, h, R) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#8a98aa"); g.addColorStop(1, "#dfe6ef");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#4a423a"; ctx.fillRect(0, h * 0.08, w, h * 0.54);
      ctx.fillStyle = "#3a332c";
      for (let y = h * 0.08; y < h * 0.62; y += h * 0.07) { ctx.fillRect(0, y, w, 2); for (let x = (y / 7) % 40; x < w; x += 40 + R() * 20) ctx.fillRect(x, y, 2, h * 0.07); }
      ctx.fillStyle = "#2a241e"; ctx.fillRect(0, h * 0.06, w, h * 0.03);
      for (const gx of [0.22, 0.78]) {
        const x = w * gx, gw = w * 0.12, top = h * 0.3;
        ctx.fillStyle = "#0e0c0a"; ctx.beginPath(); ctx.moveTo(x - gw / 2, h * 0.62); ctx.lineTo(x - gw / 2, top + gw / 2); ctx.arc(x, top + gw / 2, gw / 2, Math.PI, 0); ctx.lineTo(x + gw / 2, h * 0.62); ctx.fill();
        ctx.fillStyle = "#5a5450"; for (let bx = x - gw / 2 + 4; bx < x + gw / 2; bx += 8) ctx.fillRect(bx, top + 4, 2, h * 0.62 - top - 4);
        ctx.fillRect(x - gw / 2, top + gw * 0.6, gw, 2); ctx.fillRect(x - gw / 2, h * 0.5, gw, 2);
      }
      const flags = ["#8a2a22", "#c8b88a", "#2a3a6a"];
      for (let i = 0; i < 3; i++) { const x = w * (0.4 + i * 0.1); ctx.fillStyle = mix(flags[i], "#4a423a", 0.35); ctx.beginPath(); ctx.moveTo(x - 12, h * 0.09); ctx.lineTo(x + 12, h * 0.09); ctx.lineTo(x + 12, h * 0.36); ctx.lineTo(x, h * 0.31); ctx.lineTo(x - 12, h * 0.36); ctx.fill(); }
      ctx.strokeStyle = "#2a2624"; ctx.lineWidth = 2;
      for (const cx of [0.08, 0.36, 0.64, 0.92]) { ctx.beginPath(); ctx.moveTo(w * cx - 18, h * 0.2); ctx.quadraticCurveTo(w * cx, h * 0.34, w * cx + 18, h * 0.2); ctx.stroke(); }
      ctx.fillStyle = "#c8b08a"; ctx.fillRect(0, h * 0.62, w, h);
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, h * 0.62, w, h * 0.04);
      ctx.fillStyle = "rgba(120,40,30,.35)"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(R() * w, h * (0.7 + R() * 0.25), 12 + R() * 18, 4, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#2a2018"; ctx.fillRect(w * 0.44, h * 0.56, w * 0.12, 4);
      for (let i = 0; i < 5; i++) { const x = w * (0.45 + i * 0.024); ctx.fillStyle = "#8a8a90"; ctx.fillRect(x, h * 0.36, 2, h * 0.2); ctx.fillStyle = "#4a3a28"; ctx.fillRect(x - 1, h * 0.52, 4, h * 0.05); }
      particles(ctx, w, h, 50, "rgba(230,210,170,.4)", 1.6, R);
    },
    bath(ctx, w, h, R) {
      interior(ctx, w, h, "#5a4a38", "#4a4a4a", R);
      glow(ctx, w * 0.5, h * 0.3, w * 0.5, "#fff0d0", 0.25);
      ctx.fillStyle = "#6a5a44"; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.8, w * 0.4, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6a9aa8"; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.8, w * 0.36, h * 0.11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.25)"; for (let i = 0; i < 14; i++) ctx.fillRect(w * (0.2 + R() * 0.6), h * (0.74 + R() * 0.1), 12 + R() * 20, 1.5);
      ctx.fillStyle = "#3a2a1c"; for (const x of [0.32, 0.55, 0.68]) { ctx.beginPath(); ctx.arc(w * x, h * 0.74, 9, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(w * 0.55 + 7, h * 0.73); ctx.lineTo(w * 0.55 + 12, h * 0.69); ctx.lineTo(w * 0.55 + 4, h * 0.71); ctx.fill();
      for (let i = 0; i < 16; i++) { ctx.fillStyle = `rgba(250,250,250,${0.03 + R() * 0.05})`; ctx.beginPath(); ctx.arc(w * (0.2 + R() * 0.6), h * (0.3 + R() * 0.45), 16 + R() * 30, 0, Math.PI * 2); ctx.fill(); }
    },
    field(ctx, w, h, R) { const sk = SKIES[1]; sky(ctx, w, h, sk, R); OUT.w2_farm(ctx, w, h, sk, R); },
    hunt(ctx, w, h, R) { const sk = SKIES[0]; sky(ctx, w, h, sk, R); OUT.w2_hunt(ctx, w, h, sk, R); },
    // 迷宮の中（場所ごと）。G.dungeonScene が「<場所の絵>_in」を探す。無い迷宮は下の dungeon（石の通路）
    // 鬼ヶ島の洞窟：岩の洞に、宴の赤い灯、転がる酒樽と大盃、骨
    // W4：古い鉄の道の中（坑道の枠と、奥へ続く線路）
    w4_rail_in(ctx, w, h, R) {
      ctx.fillStyle = "#0c0a08"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) {
        const k = 1 - i * 0.18, cx = w / 2, fw = w * 0.42 * k, fh = h * 0.7 * k, y = h * 0.5 - fh * 0.4;
        ctx.fillStyle = mix("#5a4430", "#0c0a08", i * 0.2);
        ctx.fillRect(cx - fw, y, 8 * k + 2, fh); ctx.fillRect(cx + fw - 8 * k - 2, y, 8 * k + 2, fh); ctx.fillRect(cx - fw, y, fw * 2, 7 * k + 2);
      }
      ctx.strokeStyle = "#6a5a48"; ctx.lineWidth = 3;
      for (const off of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w / 2 + off * w * 0.2, h); ctx.lineTo(w / 2 + off * w * 0.02, h * 0.55); ctx.stroke(); }
      glow(ctx, w * 0.3, h * 0.35, w * 0.2, "#ffb04a", 0.25);
      ctx.fillStyle = "#ffcf6e"; ctx.fillRect(w * 0.3 - 2, h * 0.33, 4, 8);
    },
    // W4：断界の古関の中（人には高すぎる段と、壁の背丈の刻み目）
    w4_pass_in(ctx, w, h, R) {
      ctx.fillStyle = "#14141a"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 7; i++) { ctx.fillStyle = mix("#5a5650", "#14141a", i * 0.12); ctx.fillRect(w * (0.2 + i * 0.03), h * (0.95 - i * 0.1), w * (0.6 - i * 0.06), h * 0.1); }
      ctx.fillStyle = "#3a3832"; ctx.fillRect(0, 0, w * 0.12, h); ctx.fillRect(w * 0.88, 0, w * 0.12, h);
      ctx.fillStyle = "#8a8478"; for (let i = 0; i < 8; i++) ctx.fillRect(w * 0.06, h * (0.15 + i * 0.09), w * 0.05, 2);
      glow(ctx, w * 0.5, h * 0.1, w * 0.3, "#9fd6ff", 0.15);
    },
    onigashima_in(ctx, w, h, R) {
      IN.cave(ctx, w, h, R);
      glow(ctx, w * 0.5, h * 0.55, w * 0.4, "#ff3a1a", 0.3);
      for (const x of [0.15, 0.85]) { ctx.fillStyle = "#b0342a"; ctx.beginPath(); ctx.ellipse(w * x, h * 0.3, 7, 10, 0, 0, Math.PI * 2); ctx.fill(); glow(ctx, w * x, h * 0.3, 30, "#ff8a3a", 0.55); }
      ctx.fillStyle = "#4a2a18";
      for (const [x, y, r] of [[0.22, 0.86, 16], [0.3, 0.9, 12], [0.74, 0.88, 18]]) { ctx.beginPath(); ctx.ellipse(w * x, h * y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#1a0e08"; ctx.fillRect(w * x - r, h * y - 2, r * 2, 2); ctx.fillStyle = "#4a2a18"; }
      ctx.fillStyle = "#8a1a1a"; ctx.beginPath(); ctx.ellipse(w * 0.55, h * 0.9, 34, 7, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#c8a040"; ctx.fillRect(w * 0.55 - 34, h * 0.9 - 1, 68, 2);
      ctx.fillStyle = "#d8d0bc"; for (let i = 0; i < 8; i++) { ctx.save(); ctx.translate(w * (0.35 + R() * 0.3), h * (0.93 + R() * 0.05)); ctx.rotate(R() * 3); ctx.fillRect(-8, -1.5, 16, 3); ctx.restore(); }
    },
    // エル・ナフ遺構：天井の崩れた大広間。折れた柱、壁一面の自慢の碑文、顔を削られた大きな像
    ruins_in(ctx, w, h, R) {
      interior(ctx, w, h, "#4a4640", "#2a2824", R);
      ctx.fillStyle = "rgba(20,18,16,.55)";
      for (let r = 0; r < 7; r++) for (let x = w * 0.26; x < w * 0.74; x += 7 + R() * 6) if (R() < 0.8) ctx.fillRect(x, h * (0.14 + r * 0.035), 3 + R() * 3, 5);
      const cx = w * 0.5;
      ctx.fillStyle = "#1e1c1a"; ctx.fillRect(cx - w * 0.07, h * 0.6, w * 0.14, h * 0.11);
      ctx.fillStyle = "#6a6458"; ctx.beginPath(); ctx.moveTo(cx - w * 0.08, h * 0.6); ctx.lineTo(cx - w * 0.05, h * 0.4); ctx.lineTo(cx + w * 0.05, h * 0.4); ctx.lineTo(cx + w * 0.08, h * 0.6); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, h * 0.34, h * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8a8474"; for (let i = 0; i < 14; i++) ctx.fillRect(cx - h * 0.045 + R() * h * 0.07, h * 0.3 + R() * h * 0.07, 3, 2);
      for (let i = 0; i < 5; i++) {
        const x = w * (0.08 + i * 0.21), ht = h * (0.25 + ((i * 37) % 10) / 20), top = h * 0.71 - ht;
        ctx.fillStyle = "#34302a"; ctx.fillRect(x - 11, top, 22, ht);
        ctx.beginPath(); ctx.moveTo(x - 11, top); for (let k = 0; k <= 5; k++) ctx.lineTo(x - 11 + k * 4.4, top - R() * 12); ctx.lineTo(x + 11, top); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x + 4, top, 7, ht);
      }
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(255,240,200,.4)"); g.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(w * 0.52, 0); ctx.lineTo(w * 0.64, 0); ctx.lineTo(w * 0.72, h); ctx.lineTo(w * 0.4, h); ctx.fill();
      ctx.fillStyle = "#1a1816"; for (let i = 0; i < 12; i++) { const x = R() * w, r = 4 + R() * 12; ctx.beginPath(); ctx.ellipse(x, h * (0.74 + R() * 0.2), r, r * 0.5, 0, Math.PI, 0); ctx.fill(); }
      particles(ctx, w, h, 60, "rgba(255,240,210,.45)", 1.4, R);
    },
    // 光の地下墓所：頭蓋骨を積んだ壁、蝋燭、奥の赤い灯り
    w1_catacomb_in(ctx, w, h, R) {
      ctx.fillStyle = "#0e0d0c"; ctx.fillRect(0, 0, w, h);
      const cx = w * 0.5;
      glow(ctx, cx, h * 0.5, h * 0.35, "#a02a1a", 0.35);
      ctx.fillStyle = "#050404"; ctx.beginPath(); ctx.moveTo(cx - w * 0.1, h * 0.8); ctx.lineTo(cx - w * 0.1, h * 0.35); ctx.arc(cx, h * 0.35, w * 0.1, Math.PI, 0); ctx.lineTo(cx + w * 0.1, h * 0.8); ctx.fill();
      const skull = (x, y, r, c) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - r * 0.55, y + r * 0.5, r * 1.1, r * 0.6);
        ctx.fillStyle = "#0e0d0c"; ctx.beginPath(); ctx.arc(x - r * 0.38, y + r * 0.1, r * 0.26, 0, Math.PI * 2); ctx.arc(x + r * 0.38, y + r * 0.1, r * 0.26, 0, Math.PI * 2); ctx.fill();
      };
      let row = 0;
      for (let y = h * 0.04; y < h * 0.84; y += 13, row++) for (let x = (row % 2) * 7; x < w; x += 14) {
        const d = Math.abs(x - cx) / (w * 0.5);
        if (d < 0.24) continue;
        skull(x, y, 5.5, mix("#0e0d0c", "#b8b0a0", Math.min(1, 0.25 + d * 0.6) * (0.75 + R() * 0.25)));
      }
      ctx.fillStyle = "#1a1612"; ctx.fillRect(0, h * 0.84, w, h);
      for (const x of [0.2, 0.33, 0.67, 0.8]) { glow(ctx, w * x, h * 0.6, 40, "#ffb04a", 0.5); ctx.fillStyle = "#e8dcc0"; ctx.fillRect(w * x - 2, h * 0.6, 4, 10); ctx.fillStyle = "#ffcf6e"; ctx.fillRect(w * x - 1, h * 0.58, 2, 3); }
      ctx.fillStyle = "rgba(140,20,20,.6)"; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(cx + (R() - 0.5) * w * 0.3, h * (0.86 + R() * 0.1), 3 + R() * 5, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
    },
    // 酸の谷の底：緑の雫が落ちる洞、酸の池、膝をついた鉄の巨人（胸の蓋が半分開いている）
    w2_acid_in(ctx, w, h, R) {
      ctx.fillStyle = "#0b100b"; ctx.fillRect(0, 0, w, h);
      glow(ctx, w * 0.45, h * 0.8, w * 0.6, "#6aff4a", 0.16);
      const gx = w * 0.7, gb = h * 0.84, iron = "#2a2e2a";
      ctx.fillStyle = iron;
      ctx.fillRect(gx - w * 0.1, gb - h * 0.5, w * 0.2, h * 0.34);
      ctx.beginPath(); ctx.arc(gx, gb - h * 0.56, w * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(gx - w * 0.14, gb - h * 0.48, w * 0.05, h * 0.3); ctx.fillRect(gx + w * 0.09, gb - h * 0.48, w * 0.05, h * 0.38);
      ctx.fillRect(gx - w * 0.09, gb - h * 0.16, w * 0.08, h * 0.16); ctx.fillRect(gx + w * 0.01, gb - h * 0.2, w * 0.14, h * 0.06);
      ctx.fillStyle = "#6aff4a"; ctx.fillRect(gx - w * 0.03, gb - h * 0.575, w * 0.06, 3);
      ctx.fillStyle = "#12160f"; ctx.fillRect(gx - w * 0.05, gb - h * 0.44, w * 0.1, h * 0.12);
      ctx.fillStyle = "#3a403a"; ctx.save(); ctx.translate(gx - w * 0.05, gb - h * 0.44); ctx.rotate(-0.5); ctx.fillRect(0, -h * 0.12, w * 0.1, h * 0.12); ctx.restore();
      ctx.fillStyle = "#4a524a"; for (let i = 0; i < 12; i++) ctx.fillRect(gx - w * 0.095 + (i % 6) * w * 0.037, gb - h * (0.49 - Math.floor(i / 6) * 0.3), 2, 2);
      ctx.fillStyle = "rgba(90,200,60,.25)"; ctx.fillRect(gx - w * 0.1, gb - h * 0.3, w * 0.2, 3);
      ctx.fillStyle = "#050805";
      for (let i = 0; i < 16; i++) { const x = R() * w, l = 16 + R() * h * 0.25; ctx.beginPath(); ctx.moveTo(x - 9, 0); ctx.lineTo(x, l); ctx.lineTo(x + 9, 0); ctx.fill(); ctx.fillStyle = "#8aff5a"; ctx.fillRect(x - 1, l + 3 + R() * 20, 2, 5); ctx.fillStyle = "#050805"; }
      ridge(ctx, w, h, h * 0.88, h * 0.04, 3, "#070a07", R);
      for (let i = 0; i < 4; i++) { const x = w * (0.1 + i * 0.13), y = h * (0.9 + (i % 2) * 0.04); ctx.fillStyle = "rgba(120,240,80,.55)"; ctx.beginPath(); ctx.ellipse(x, y, 26, 5, 0, 0, Math.PI * 2); ctx.fill(); glow(ctx, x, y, 34, "#8aff5a", 0.3); }
      particles(ctx, w, h, 40, "rgba(160,255,120,.5)", 1.5, R);
    },
    // 腐れ庭園の奥：蔓の天井の下の花壇、甘い霧、花壇の間の白い天幕
    e2_garden_in(ctx, w, h, R) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#10180e"); g.addColorStop(0.65, "#2a3a22"); g.addColorStop(1, "#1a1410");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const bright = ["#ff4a8a", "#ffd23a", "#c04aff", "#4ad8ff"];
      for (let i = 0; i < 4; i++) {
        const s = 1 - i * 0.2, aw = w * 0.9 * s, top = h * (0.08 + i * 0.06);
        ctx.strokeStyle = mix("#3a6a2a", "#10180e", i * 0.2); ctx.lineWidth = 10 * s;
        ctx.beginPath(); ctx.moveTo(w / 2 - aw / 2, h * 0.7); ctx.quadraticCurveTo(w / 2 - aw / 2, top, w / 2, top); ctx.quadraticCurveTo(w / 2 + aw / 2, top, w / 2 + aw / 2, h * 0.7); ctx.stroke();
        for (let k = 0; k < 10; k++) { const t = k / 9, x = w / 2 + (t - 0.5) * aw * 0.95, y = top + Math.pow(Math.abs(t - 0.5) * 2, 2) * (h * 0.7 - top) * 0.9; ctx.fillStyle = bright[(k + i) % 4]; ctx.beginPath(); ctx.arc(x, y, 3 * s + 1, 0, Math.PI * 2); ctx.fill(); }
      }
      const tx = w * 0.78, ty = h * 0.66;
      ctx.fillStyle = "#e8e4d8"; ctx.beginPath(); ctx.moveTo(tx - w * 0.07, ty); ctx.lineTo(tx, ty - h * 0.18); ctx.lineTo(tx + w * 0.07, ty); ctx.fill();
      ctx.fillStyle = "#1a1410"; ctx.beginPath(); ctx.moveTo(tx - w * 0.015, ty); ctx.lineTo(tx, ty - h * 0.1); ctx.lineTo(tx + w * 0.015, ty); ctx.fill();
      glow(ctx, tx, ty - h * 0.05, 30, "#ffe8a0", 0.45);
      ctx.fillStyle = "#2a2018"; ctx.fillRect(0, h * 0.66, w, h);
      flowerBeds(ctx, w, h, 0.72, 4, "#2a2018", true, R);
      glow(ctx, w * 0.5, h * 0.7, w * 0.6, "#ff9ac0", 0.16);
      particles(ctx, w, h, 90, "rgba(255,190,220,.45)", 1.5, R);
    },
    // 大厨房の中：家ほどの大鍋と火、天井から下がる鉤と肉、卓の端の巨大な包丁、小さな人間用の扉
    e2_kitchen_in(ctx, w, h, R) {
      interior(ctx, w, h, "#4a2a1e", "#2a1a12", R);
      const cx = w * 0.48;
      glow(ctx, cx, h * 0.85, h * 0.6, "#ff6a1a", 0.55);
      ctx.fillStyle = "#ff9a3a"; for (let i = 0; i < 9; i++) { const x = cx - w * 0.16 + i * w * 0.04; ctx.beginPath(); ctx.moveTo(x - 8, h * 0.9); ctx.lineTo(x, h * (0.74 + R() * 0.06)); ctx.lineTo(x + 8, h * 0.9); ctx.fill(); }
      ctx.fillStyle = "#15100c"; ctx.beginPath(); ctx.ellipse(cx, h * 0.52, w * 0.24, h * 0.24, 0, 0, Math.PI); ctx.fill();
      ctx.fillRect(cx - w * 0.25, h * 0.46, w * 0.5, h * 0.07);
      ctx.fillStyle = "#6a3a1a"; ctx.beginPath(); ctx.ellipse(cx, h * 0.465, w * 0.23, h * 0.035, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4a2410"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(cx + (R() - 0.5) * w * 0.36, h * 0.465, 4 + R() * 6, Math.PI, 0); ctx.fill(); }
      for (let j = 0; j < 10; j++) { ctx.fillStyle = `rgba(240,230,220,${0.06 + R() * 0.08})`; ctx.beginPath(); ctx.arc(cx + (R() - 0.5) * w * 0.4, h * (0.42 - R() * 0.35), 16 + R() * 26, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - w * 0.28, h * 0.72); ctx.lineTo(cx - w * 0.22, h * 0.44); ctx.moveTo(cx - w * 0.26, h * 0.72); ctx.lineTo(cx - w * 0.2, h * 0.44); ctx.stroke();
      ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const y = h * (0.47 + i * 0.045); ctx.beginPath(); ctx.moveTo(cx - w * 0.28 + (0.72 * h - y) * 0.22 * w / h, y); ctx.lineTo(cx - w * 0.26 + (0.72 * h - y) * 0.22 * w / h, y); ctx.stroke(); }
      for (const hx of [0.08, 0.16, 0.84, 0.92]) {
        const x = w * hx, l = h * (0.18 + ((hx * 100) % 7) / 40);
        ctx.strokeStyle = "#8a8a88"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, l); ctx.arc(x - 4, l, 4, 0, Math.PI); ctx.stroke();
        ctx.fillStyle = "#7a2a22"; ctx.beginPath(); ctx.ellipse(x - 4, l + h * 0.09, w * 0.022, h * 0.085, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#e8d8c8"; ctx.fillRect(x - 6, l + h * 0.16, 4, h * 0.03);
      }
      ctx.fillStyle = "#1a120c"; ctx.fillRect(w * 0.76, h * 0.62, w * 0.24, h * 0.06);
      ctx.fillStyle = "#9a9894"; ctx.fillRect(w * 0.8, h * 0.45, w * 0.16, h * 0.17); ctx.fillStyle = "#3a2418"; ctx.fillRect(w * 0.95, h * 0.5, w * 0.05, h * 0.05);
      ctx.fillStyle = "#1a0e08"; ctx.fillRect(w * 0.04, h * 0.64, 7, 12); glow(ctx, w * 0.04 + 3, h * 0.7, 10, "#ffcf6e", 0.4);
    },
    // 灰の観測所の中：灰の積もった書庫、帳面の山、灰に埋まった窓
    w3_ashvault_in(ctx, w, h, R) {
      interior(ctx, w, h, "#5a5450", "#3a3632", R);
      ctx.fillStyle = "#2a2622"; for (let i = 0; i < 5; i++) ctx.fillRect(w * (0.06 + i * 0.19), h * 0.2, w * 0.14, h * 0.45);
      ctx.fillStyle = "#c8c0b0"; for (let i = 0; i < 40; i++) ctx.fillRect(w * (0.07 + (i % 5) * 0.19) + (i % 3) * 8, h * (0.24 + Math.floor(i / 5) * 0.05), 6, h * 0.035);
      glow(ctx, w * 0.5, h * 0.7, 120, "#ffb03a", 0.3);
      particles(ctx, w, h, 60, "rgba(160,150,140,.5)", 1.5, R);
    },
    // 潮鳴りの洞の中：濡れた岩の洞、足もとの潮、奥の青い光
    w3_seacave_in(ctx, w, h, R) {
      ctx.fillStyle = "#06090c"; ctx.fillRect(0, 0, w, h);
      glow(ctx, w * 0.5, h * 0.5, w * 0.4, "#3ac8d0", 0.18);
      ctx.fillStyle = "#0e1418"; for (let i = 0; i < 14; i++) { const x = R() * w, l = 20 + R() * h * 0.25; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x, l); ctx.lineTo(x + 10, 0); ctx.fill(); }
      ctx.fillStyle = "rgba(60,140,160,.45)"; ctx.fillRect(0, h * 0.82, w, h);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = "rgba(200,240,240,.25)"; ctx.fillRect(R() * w, h * (0.84 + R() * 0.12), 20 + R() * 30, 2); }
      ridge(ctx, w, h, h * 0.86, h * 0.04, 3, "#080c10", R);
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
  // 迷宮の中の絵：「<場所の絵>_in」があればそれ、墓場・洞窟・使徒の城は外と同じ絵、ほかは石の通路（dungeon）
  // W8：町の特色の場所（G.data.W8S_SPOTS）は、データの scene に書いた近い室内の絵を借りる（画像は docs/art/scenes.json の in_w8s_*）
  Object.entries((G.data && G.data.W8S_SPOTS) || {}).forEach(([k, s]) => { if (s.scene && IN[s.scene] && !IN[k]) IN[k] = IN[s.scene]; });
  G.dungeonScene = (L) => (L && IN[L.scene + "_in"] ? L.scene + "_in" : L && ["bones", "cave", "majin"].includes(L.scene) ? L.scene : "dungeon");
  // 描ける絵の名前（tests/checks/a4_art.mjs が、汎用の絵に落ちている場所を探すのに使う）
  G.sceneNames = () => ({ out: Object.keys(OUT), inside: Object.keys(IN) });
  G.paintScene = (canvas, opt) => {
    const dpr = Math.min(2, (typeof devicePixelRatio === "number" && devicePixelRatio) || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(200, Math.round(rect.width)), h = Math.max(120, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const seed = String(opt.seed || opt.key);
    const R = rng(seed), RE = rng(seed + ":env");
    // 絵の決まっていない施設は、施設の名前の室内があればそれを使う（学院など）
    const key = opt.key || (G.S && G.S.mode === "fac" && IN[G.S.fac] ? G.S.fac : opt.key);
    if (IN[key]) { ENV = { season: "", weather: "", night: false, key, snowCap: null }; IN[key](ctx, w, h, R); }
    else {
      const sk0 = RED[key] ? RED_SKY : SKIES[opt.phase || 0];
      setEnv(key, sk0, opt);
      const sk = skyFor(sk0);
      sky(ctx, w, h, sk, rng(seed + ":sky"), opt.redMoon);
      (OUT[key] || OUT.plains)(ctx, w, h, sk, R);
      seasonPass(ctx, w, h, RE);
      fogPass(ctx, w, h, RE);
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
    fallPass(ctx, w, h, RE);
    vignette(ctx, w, h, 0.55);
  };
})(globalThis.G = globalThis.G || {});
