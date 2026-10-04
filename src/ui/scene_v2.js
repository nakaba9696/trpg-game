// 背景の絵（V2）。遠景・中景・近景の層、空気遠近（遠いほど霞む）、光と影で描く絵画風の背景。
// 呼び方は scene.js と同じ：G.paintScene(canvas, { key, phase, seed, foes, sky, redMoon })（scene.js の G.paintScene を上書きする）
// - どんな縦横比でも描ける（幅と高さから地平線・主役の建物の位置を比率で決める）
// - 静止した部分は一度だけ別の canvas に描いて取っておき、雨・雪・霧・炎・灯りの揺れだけを毎コマ重ねる
// - 戦闘中（foes がある）と出来事中（G.S.mode === "event"）は、同じ絵を暗く・寄りにして使う。opt.focus で指定もできる
// - 敵の並べ方は scene.js と同じ（fx.js が同じ式で立ち位置を出すので変えない）
// 場所の絵は G.SV2.OUT[key]（屋外）と G.SV2.IN[key]（室内・迷宮の中）に関数を足す（scene_v2_towns.js・scene_v2_wild.js・scene_v2_inside.js）。
// 乱数は場所の名前からの決まった種（G.rand は使わない）。レーン A（絵）
(function (G) {
  const V = (G.SV2 = G.SV2 || {});
  V.OUT = V.OUT || {};
  V.IN = V.IN || {};

  // ---------------------------------------------------------------- 色と乱数
  function rng(seed) {
    let s = 0;
    seed = String(seed);
    for (let i = 0; i < seed.length; i++) s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
    return () => { s = (s + 0x6d2b79f5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const HEX = {};
  const hex = (c) => {
    if (HEX[c]) return HEX[c];
    let s = String(c).replace("#", "");
    if (s.length === 3) s = s.split("").map((x) => x + x).join("");
    const n = parseInt(s, 16) || 0;
    return (HEX[c] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  };
  const toHex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`; };
  const mul = (c, k) => toHex(hex(c).map((v, i) => v * k[i]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // なめらかな揺らぎ（1次元）。n 個の値を補間する
  function noise(R, n) {
    n = n || 64;
    const t = Array.from({ length: n + 1 }, R);
    t[n] = t[0];
    return (x) => { x = ((x % n) + n) % n; const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return t[i] + (t[i + 1] - t[i]) * s; };
  }
  function fbm(R, oct) {
    const ns = Array.from({ length: oct || 4 }, () => noise(R));
    return (x) => { let v = 0, a = 0.5, f = 1, tot = 0; for (const n of ns) { v += a * n(x * f); tot += a; a *= 0.5; f *= 2.03; } return v / tot; };
  }
  Object.assign(V, { rng, hex, mix, rgba, mul, clamp, lerp, noise, fbm });

  // ---------------------------------------------------------------- 空・季節・天候
  const SEASON_ART = { 春: "spring", 夏: "summer", 秋: "autumn", 冬: "winter" };
  const WEATHER_ART = { 雨: "rain", 霧: "fog", 雪: "snow" };
  const RED = { realm: 1, majin: 1, e2_kitchen: 1 };
  // 霧の色は町ごとに違う（scene.js と同じ）
  const FOG = { port: "#c9d2dc", swamp: "#a8c29a", magic: "#c0b2e8", fort: "#a39888", w1_oboro: "#e8c4a4", w1_catacomb: "#b4c8be", bones: "#c8c4b4", forest: "#c4d0c4", w2_acid: "#b4d89a", w2_spa: "#eceef2", w2_forge: "#b0a8a0", w2_shadow: "#b8b4ac" };
  // 時間帯ごとの空（天頂・中ほど・地平）と、光（太陽・月）の色、地上の明るさ（環境光）
  // 色調は「くすんだセピア・深い青緑・墨色」。派手な色は避け、仕上げ（painterly）でさらに褪せさせる
  const SKY = [
    { top: "#46586a", mid: "#8c8686", hor: "#d6bc94", sun: "#f0d6a4", amb: [0.92, 0.85, 0.74], shadow: "#2e2c38", lightK: 0.35, sx: 0.2, sy: -0.1 },   // 朝
    { top: "#4a6470", mid: "#8a9c9a", hor: "#cfc8b0", sun: "#f2e6c8", amb: [0.9, 0.9, 0.84], shadow: "#26302e", lightK: 0.12, sx: 0.68, sy: 0.14 }, // 昼
    { top: "#262430", mid: "#6a4844", hor: "#c48a58", sun: "#e8a464", amb: [0.84, 0.62, 0.52], shadow: "#2a1c20", lightK: 0.7, sx: 0.78, sy: -0.03 }, // 夕
    { top: "#04080b", mid: "#0e1a20", hor: "#203238", sun: "#e2dcc6", amb: [0.18, 0.24, 0.3], shadow: "#030608", lightK: 1, sx: 0.24, sy: 0.15, moon: true }, // 夜
  ];
  const RED_SKY = { top: "#120705", mid: "#381410", hor: "#8a3420", sun: "#d8583a", amb: [0.7, 0.38, 0.32], shadow: "#160404", lightK: 0.9, sx: 0.7, sy: 0.18, moon: true, red: true };

  // 1枚描くための道具箱 P を作る（幅・高さから地平線と単位 u を決める）
  function makeP(ctx, w, h, opt, key, inside) {
    const seed = String(opt.seed || key);
    const phase = clamp(opt.phase | 0, 0, 3);
    const red = !!RED[key];
    let season = "", weather = "";
    if (!red && !inside) {
      const at = opt.sky || (G.skyAt && G.S && G.S.loc ? G.skyAt(G.S.loc) : null);
      if (at && !at.still) { season = SEASON_ART[at.season] || ""; weather = WEATHER_ART[at.weather] || ""; }
    }
    const base = red ? RED_SKY : SKY[phase];
    const sk = { top: base.top, mid: base.mid, hor: base.hor };
    let amb = base.amb.slice(), sun = base.sun, shadow = base.shadow;
    const night = phase === 3 || red;
    if (season === "winter") { sk.top = mix(sk.top, "#8090a4", night ? 0.08 : 0.2); sk.hor = mix(sk.hor, "#e6ecf4", night ? 0.08 : 0.35); amb = amb.map((v, i) => v * [0.96, 0.98, 1.04][i]); }
    else if (season === "autumn") { sk.hor = mix(sk.hor, "#f2a868", night ? 0.04 : 0.18); amb = amb.map((v, i) => v * [1.03, 0.98, 0.9][i]); }
    else if (season === "summer" && !night) sk.top = mix(sk.top, "#2a64cc", 0.15);
    const fogC = FOG[key] || "#d6dce4";
    let overcast = false, hazeK = 0.82;
    if (weather === "rain" || weather === "snow") {
      overcast = true;
      const c = weather === "snow" ? "#a2abb8" : "#56606c";
      sk.top = mix(sk.top, night ? "#0c1015" : c, 0.75); sk.mid = mix(sk.mid, night ? "#141a22" : mix(c, "#ffffff", 0.18), 0.75); sk.hor = mix(sk.hor, night ? "#1c232c" : mix(c, "#ffffff", 0.35), 0.7);
      amb = amb.map((v, i) => v * (weather === "snow" ? [0.92, 0.95, 1.02] : [0.72, 0.76, 0.84])[i]);
      hazeK = 0.95;
    } else if (weather === "fog") {
      const c = night ? mix(fogC, "#1c2230", 0.6) : fogC;
      sk.top = mix(sk.top, c, night ? 0.2 : 0.45); sk.mid = mix(sk.mid, c, night ? 0.35 : 0.6); sk.hor = mix(sk.hor, c, night ? 0.5 : 0.8);
      hazeK = 1.2;
    }
    const a = w / h;
    const hz = Math.round(h * (a >= 1 ? 0.62 : 0.6));
    const u = Math.min(w * 1.25, h * 1.6) / 100;
    const P = {
      ctx, w, h, a, hz, u, cx: w / 2, key, seed, phase, night, red, dawn: phase === 0 && !red, dusk: phase === 2 && !red, inside: !!inside,
      R: rng(seed + ":" + key), season, weather, overcast, wet: weather === "rain", fogC,
      sky: sk, sun: { x: w * base.sx, y: base.sy < 0 ? hz + h * base.sy : h * base.sy, col: sun, moon: !!base.moon, show: !overcast && weather !== "fog" },
      amb, shadowC: shadow, lightK: base.lightK * (overcast ? 1.15 : 1), haze: sk.hor, hazeK,
      ldir: base.sx < 0.5 ? -1 : 1, lights: [], anim: [], fore: [], redMoon: !!opt.redMoon,
    };
    // 夜は月明かり、夕は太陽の側から照らす（ldir：光の来る向き -1 左 / 1 右）
    P.c = (col, d) => { const x = mul(col, P.amb); return d ? mix(x, P.haze, clamp(d * P.hazeK, 0, 1)) : x; };
    P.lit = (col, d, k) => mix(P.c(col, d), P.night ? "#9ab0d8" : P.sun.col, (k == null ? 0.28 : k) * (1 - (d || 0)) * (P.overcast ? 0.4 : 1));
    P.dark = (col, d, k) => mix(P.c(col, d), P.shadowC, (k == null ? 0.38 : k) * (1 - (d || 0) * 0.8));
    P.depth = (y) => clamp((y - P.hz) / (P.h - P.hz), 0, 1);
    return P;
  }
  V.makeP = makeP;

  // 雲：小さな塊を重ねて、日の当たる上側を明るく、下側を影にする
  function cloud(P, x, y, cw, ch, o) {
    const { ctx, R } = P;
    o = o || {};
    const lit = o.lit, shade = o.shade, a = o.a == null ? 0.9 : o.a;
    const n = 10 + Math.floor(R() * 8);
    const puffs = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const px = x + (t - 0.5) * cw + (R() - 0.5) * cw * 0.12;
      const hump = Math.sin(t * Math.PI);
      const r = ch * (0.35 + hump * 0.55) * (0.7 + R() * 0.5);
      puffs.push([px, y - hump * ch * 0.35 + (R() - 0.5) * ch * 0.2, r]);
    }
    const blob = (px, py, r, col, al) => {
      const g = ctx.createRadialGradient(px, py, r * 0.1, px, py, r);
      g.addColorStop(0, rgba(col, al)); g.addColorStop(0.6, rgba(col, al * 0.75)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    };
    for (const [px, py, r] of puffs) blob(px, py + r * 0.2, r * 1.05, shade, a * 0.8);
    const lx = clamp((P.sun.x - x) / P.w, -0.5, 0.5);
    for (const [px, py, r] of puffs) blob(px + lx * r * 0.35, py - r * 0.25, r * 0.66, lit, a * 0.75);
    for (const [px, py, r] of puffs) if (R() < 0.5) blob(px + lx * r * 0.5, py - r * 0.4, r * 0.32, mix(lit, "#ffffff", 0.3), a * 0.5);
  }
  function cloudColors(P) {
    if (P.red) return { lit: "#c0402a", shade: "#30080a" };
    if (P.overcast) return P.night ? { lit: "#1e2628", shade: "#0a0e10" } : P.weather === "snow" ? { lit: "#d4d6d4", shade: "#868e8e" } : { lit: "#848c8a", shade: "#424a4a" };
    return [{ lit: "#e8d2b4", shade: "#76707c" }, { lit: "#ece4d2", shade: "#8a9490" }, { lit: "#d8a476", shade: "#4a3436" }, { lit: "#2c383c", shade: "#0c1214" }][P.phase];
  }
  function paintSky(P) {
    const { ctx, w, h, hz, R, sky } = P;
    const g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, sky.top); g.addColorStop(0.55, sky.mid); g.addColorStop(1, sky.hor);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const Rs = rng(P.seed + ":sky");
    // 星と天の川
    if (P.night && !P.overcast && P.weather !== "fog") {
      const n = Math.min(520, Math.round((w * hz) / 1400));
      const band = (x) => hz * (0.15 + 0.6 * (x / w));
      for (let i = 0; i < 26; i++) {
        const x = Rs() * w, y = band(x) + (Rs() - 0.5) * hz * 0.18, r = hz * (0.06 + Rs() * 0.08);
        const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
        gg.addColorStop(0, P.red ? "rgba(255,90,60,.05)" : "rgba(190,200,255,.06)"); gg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < n; i++) {
        const x = Rs() * w, y = Rs() < 0.35 ? band(x) + (Rs() - 0.5) * hz * 0.2 : Rs() * hz * 0.92, b = Rs();
        const al = (0.25 + b * 0.75) * (1 - y / hz * 0.7);
        ctx.fillStyle = P.red ? `rgba(255,${150 + b * 80 | 0},120,${al * 0.6})` : `rgba(${220 + b * 35 | 0},${225 + b * 30 | 0},255,${al})`;
        const s = b > 0.96 ? 2 : b > 0.8 ? 1.4 : 1;
        ctx.fillRect(x, y, s, s);
        if (b > 0.985) { ctx.fillStyle = `rgba(230,236,255,${al * 0.35})`; ctx.fillRect(x - 3, y + 0.5, 7, 1); ctx.fillRect(x + 0.5, y - 3, 1, 7); }
      }
    }
    // 太陽と月
    const S = P.sun;
    if (S.show || P.redMoon) {
      const glowR = P.h * (S.moon ? 0.45 : P.dusk || P.dawn ? 0.9 : 0.6);
      const gg = ctx.createRadialGradient(S.x, S.y, 0, S.x, S.y, glowR);
      gg.addColorStop(0, rgba(S.col, S.moon ? 0.35 : 0.85)); gg.addColorStop(0.12, rgba(S.col, S.moon ? 0.12 : 0.4)); gg.addColorStop(1, rgba(S.col, 0));
      ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);
      if (S.moon || P.redMoon) { if (!(V.OUT[P.key] && V.OUT[P.key].moon)) moon(P, S.x, S.y, P.u * 3.2, P.redMoon || P.red ? "#e0442e" : S.col); }
      else if (P.phase !== 2 || S.y < hz) {
        const r = P.u * 2.2;
        const d = ctx.createRadialGradient(S.x, S.y, 0, S.x, S.y, r * 1.6);
        d.addColorStop(0, "rgba(255,255,250,1)"); d.addColorStop(0.55, rgba(S.col, 0.95)); d.addColorStop(1, rgba(S.col, 0));
        ctx.fillStyle = d; ctx.beginPath(); ctx.arc(S.x, S.y, r * 1.6, 0, Math.PI * 2); ctx.fill();
      }
      // 光の筋（朝と夕）
      if ((P.dawn || P.dusk) && S.show) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 7; i++) {
          const ang = Math.PI / 2 + (Rs() - 0.5) * 2.6, len = P.h * 1.2, sp = 0.03 + Rs() * 0.05;
          ctx.fillStyle = rgba(S.col, 0.018 + Rs() * 0.02);
          ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(S.x + Math.cos(ang - sp) * len, S.y - Math.sin(ang - sp) * len); ctx.lineTo(S.x + Math.cos(ang + sp) * len, S.y - Math.sin(ang + sp) * len); ctx.fill();
        }
        ctx.restore();
      }
    }
    // 雲
    const cc = cloudColors(P);
    const R2 = rng(P.seed + ":cloud");
    const cnt = P.overcast ? 9 + Math.round(w / 160) : P.night ? 3 : 3 + Math.round(R2() * 4);
    blurred(P, P.u * 0.5, () => { for (let i = 0; i < cnt; i++) {
      const y = hz * (P.overcast ? 0.05 + R2() * 0.55 : 0.1 + R2() * 0.5), cw = P.u * (P.overcast ? 30 + R2() * 40 : 14 + R2() * 26);
      cloud(P, R2() * w, y, cw, cw * (0.22 + R2() * 0.12), { lit: cc.lit, shade: cc.shade, a: P.overcast ? 0.75 : 0.7 + R2() * 0.25 });
    } });
    // 地平の帯雲と、地平の明るみ
    for (let i = 0; i < 5; i++) {
      const y = hz * (0.72 + R2() * 0.22), cw = w * (0.2 + R2() * 0.35), x = R2() * w;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, cw);
      gg.addColorStop(0, rgba(cc.lit, 0.22)); gg.addColorStop(1, rgba(cc.lit, 0));
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.06); ctx.translate(-x, -y);
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, cw, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const hg = ctx.createLinearGradient(0, hz - P.h * 0.12, 0, hz);
    hg.addColorStop(0, rgba(sky.hor, 0)); hg.addColorStop(1, rgba(mix(sky.hor, "#ffffff", 0.15), 0.5));
    ctx.fillStyle = hg; ctx.fillRect(0, hz - P.h * 0.12, w, P.h * 0.12);
  }
  // 月（模様と光の暈）
  function moon(P, x, y, r, col, bite) {
    const { ctx } = P;
    const halo = ctx.createRadialGradient(x, y, r, x, y, r * 4);
    halo.addColorStop(0, rgba(col, 0.25)); halo.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, mix(col, "#ffffff", 0.5)); g.addColorStop(1, mix(col, "#8a8070", 0.25));
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (bite) for (const [bx, by, br] of bite) { ctx.moveTo(x + bx * r + br * r, y + by * r); ctx.arc(x + bx * r, y + by * r, br * r, 0, Math.PI * 2, true); }
    ctx.fillStyle = g; ctx.fill("evenodd");
    ctx.clip("evenodd");
    const Rm = rng("moon");
    for (let i = 0; i < 7; i++) { ctx.fillStyle = rgba(mix(col, "#5a5040", 0.6), 0.18 + Rm() * 0.12); ctx.beginPath(); ctx.arc(x + (Rm() - 0.5) * r * 1.3, y + (Rm() - 0.5) * r * 1.3, r * (0.12 + Rm() * 0.25), 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  Object.assign(V, { paintSky, cloud, moon });

  // ---------------------------------------------------------------- 地形
  // ぼかした層：別の canvas に描いてから、一度だけぼかして重ねる（遠景・雲。形ごとにぼかすと重い）
  function blurred(P, px, fn) {
    if (!P.mk || !P.cv || !(px > 0.3)) return fn();
    const main = P.ctx, c = P.mk(P.cv.width, P.cv.height), lc = c.getContext("2d");
    lc.setTransform(P.dpr, 0, 0, P.dpr, 0, 0);
    P.ctx = lc;
    try { return fn(); } finally {
      P.ctx = main;
      main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.filter = `blur(${(px * P.dpr).toFixed(1)}px)`; main.drawImage(c, 0, 0); main.filter = "none"; main.restore();
    }
  }
  V.blurred = blurred;
  // 山並み：揺らぎで稜線を作り、光の反対側の斜面を影にする。雪線より上は雪
  function mountains(P, o) { return blurred(P, (o.d || 0) > 0.3 ? P.u * 0.3 * o.d : 0, () => mountains0(P, o)); }
  function mountains0(P, o) {
    const { ctx, w, R } = P;
    const base = o.base, H = o.height, d = o.d || 0, col = o.color || "#5a6478";
    const f = fbm(R, 3), f2 = fbm(R, 4), ph = R() * 50, sc = o.scale || 4;
    const step = Math.max(3, w / 240);
    const pts = [];
    for (let x = -step; x <= w + step; x += step) {
      const t = ph + (x / w) * sc;
      const broad = 0.5 + 0.5 * Math.tanh((f(t) - 0.5) * 4.5);
      const ridged = 1 - Math.abs((f2(t * 3.1) - 0.5) * 2.8);
      const n = o.round ? broad * 0.85 + 0.1 : broad * 0.75 + ridged * 0.3 - 0.05;
      pts.push([x, base - H * clamp(n, 0.04, 1.1)]);
    }
    const path = () => { ctx.beginPath(); ctx.moveTo(-step, P.h); for (const [x, y] of pts) ctx.lineTo(x, y); ctx.lineTo(w + step, P.h); ctx.closePath(); };
    const top = base - H * 1.1;
    const g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, P.lit(col, d, 0.18)); g.addColorStop(1, P.c(col, Math.min(1, d + 0.2)));
    path(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); path(); ctx.clip();
    // 雪
    const snow = o.snow || (P.season === "winter" ? 0.45 : 0);
    if (snow) {
      const fs = noise(R);
      ctx.fillStyle = P.lit("#f2f5fa", d, 0.3);
      ctx.beginPath(); ctx.moveTo(-step, top - 10);
      for (const [x] of pts) ctx.lineTo(x, base - H * (1 - snow) + (fs(x / 14) - 0.5) * H * 0.35 + Math.sin(x * 0.11) * H * 0.04);
      ctx.lineTo(w + step, top - 10); ctx.closePath(); ctx.fill();
    }
    // 斜面の影：峰から次の谷まで（光と反対の側）
    ctx.fillStyle = rgba(P.dark(col, d, 0.6), 0.55 * (1 - d * 0.6));
    for (let i = 1; i < pts.length - 1; i++) {
      if (!(pts[i][1] <= pts[i - 1][1] && pts[i][1] <= pts[i + 1][1])) continue;
      const dir = -P.ldir;
      let j = i;
      while (pts[j + dir] && pts[j + dir][1] >= pts[j][1]) j += dir;
      const [px, py] = pts[i];
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let k = i; k !== j; k += dir) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.lineTo(pts[j][0], pts[j][1]);
      ctx.lineTo(pts[j][0] - dir * H * 0.1, base + 4);
      ctx.lineTo(px + dir * H * 0.08, base + 4);
      ctx.closePath(); ctx.fill();
    }
    // 沢筋
    for (let i = 0; i < pts.length; i += 3 + Math.floor(R() * 5)) {
      const [x, y] = pts[i]; const l = (base - y) * (0.25 + R() * 0.45);
      ctx.strokeStyle = rgba(R() < 0.5 ? P.dark(col, d, 0.5) : P.lit(col, d, 0.4), 0.12 + R() * 0.1); ctx.lineWidth = Math.max(1, P.u * (0.1 + R() * 0.25));
      ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x + (R() - 0.5) * l * 0.5, y + l * 0.5, x + (R() - 0.5) * l * 0.4, y + l); ctx.stroke();
    }
    ctx.restore();
    // ふもとの霞
    const mg = ctx.createLinearGradient(0, base - H * 0.35, 0, base);
    mg.addColorStop(0, rgba(P.haze, 0)); mg.addColorStop(1, rgba(P.haze, 0.55 * Math.min(1, P.hazeK)));
    ctx.fillStyle = mg; ctx.fillRect(0, base - H * 0.35, w, H * 0.35 + 2);
    return pts;
  }
  // なだらかな丘（稜線に光の縁）
  function hills(P, o) {
    const { ctx, w, R } = P;
    const base = o.base, A = o.amp, d = o.d || 0, col = o.color || "#5f7a46";
    const f = fbm(R, 3), ph = R() * 50;
    const step = Math.max(3, w / 200), pts = [];
    for (let x = -step; x <= w + step; x += step) pts.push([x, base - A * f(ph + (x / w) * (o.scale || 3))]);
    const g = ctx.createLinearGradient(0, base - A, 0, o.bottom || P.h);
    g.addColorStop(0, P.lit(col, d, 0.22)); g.addColorStop(1, P.dark(col, d, 0.25));
    ctx.beginPath(); ctx.moveTo(-step, P.h); for (const [x, y] of pts) ctx.lineTo(x, y); ctx.lineTo(w + step, P.h); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    if (P.season === "winter" && !o.noSnow) { ctx.save(); ctx.clip(); ctx.fillStyle = rgba(P.lit("#eef2f8", d), 0.85); ctx.fillRect(0, base - A - 5, w, P.h); ctx.restore(); }
    ctx.strokeStyle = rgba(P.lit(col, d, 0.6), 0.35 * (1 - d)); ctx.lineWidth = Math.max(1, P.u * 0.18);
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1) : ctx.moveTo(x, y + 1))); ctx.stroke();
    return pts;
  }
  // 地面（遠くは霞み、手前は濃い。草・石畳・雪・砂の手触り）
  function ground(P, o) {
    const { ctx, w, h, hz, R } = P;
    o = o || {};
    const top = o.top == null ? hz : o.top, col = o.color || "#56703c";
    const g = ctx.createLinearGradient(0, top, 0, h);
    g.addColorStop(0, P.c(col, 0.55)); g.addColorStop(0.35, P.lit(col, 0.15, 0.15)); g.addColorStop(1, P.dark(col, 0, 0.45));
    ctx.fillStyle = g; ctx.fillRect(0, top, w, h - top);
    const tex = o.tex || "grass";
    const n = Math.min(2600, Math.round((w * (h - top)) / 260));
    if (tex === "grass" || tex === "field") {
      const gc = P.season === "autumn" ? "#8a7a3a" : P.season === "winter" ? "#8f9a8a" : P.season === "summer" ? "#3f7a2a" : col;
      for (let i = 0; i < n; i++) {
        const y = top + Math.pow(R(), 0.7) * (h - top), dd = (y - top) / (h - top), x = R() * w, l = P.u * (0.2 + dd * 1.6) * (0.6 + R());
        ctx.strokeStyle = rgba(R() < 0.5 ? P.lit(gc, 0.3 * (1 - dd), 0.4) : P.dark(gc, 0.3 * (1 - dd), 0.4), 0.55);
        ctx.lineWidth = Math.max(0.6, dd * P.u * 0.22);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * l * 0.6, y - l); ctx.stroke();
      }
    } else if (tex === "rock" || tex === "dirt" || tex === "sand" || tex === "ash" || tex === "snow") {
      const base = tex === "snow" ? "#f4f7fb" : col;
      for (let i = 0; i < n * 0.6; i++) {
        const y = top + Math.pow(R(), 0.8) * (h - top), dd = (y - top) / (h - top), x = R() * w, s = P.u * (0.1 + dd * 0.9) * (0.4 + R());
        ctx.fillStyle = rgba(R() < 0.45 ? P.lit(base, 0.3 * (1 - dd), 0.5) : P.dark(base, 0.3 * (1 - dd), tex === "snow" ? 0.2 : 0.5), tex === "snow" ? 0.35 : 0.5);
        ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (P.season === "winter" && tex !== "snow" && !o.noSnow) {
      const sg = ctx.createLinearGradient(0, top, 0, h);
      sg.addColorStop(0, rgba(P.c("#e8eef6", 0.3), 0.75)); sg.addColorStop(1, rgba(P.c("#f6f9fc"), 0.88));
      ctx.fillStyle = sg; ctx.fillRect(0, top, w, h - top);
      for (let i = 0; i < n * 0.25; i++) { const y = top + R() * (h - top), dd = (y - top) / (h - top); ctx.fillStyle = rgba(P.dark("#c8d4e6", 0, 0.3), 0.35); ctx.beginPath(); ctx.ellipse(R() * w, y, P.u * (0.5 + dd * 3), P.u * (0.1 + dd * 0.5), 0, 0, Math.PI * 2); ctx.fill(); }
    }
    if (P.wet) {
      // 水たまり（空を映す）
      for (let i = 0; i < 6 + w / 200; i++) {
        const y = top + (0.25 + R() * 0.75) * (h - top), dd = (y - top) / (h - top), x = R() * w, rw = P.u * (2 + dd * 9) * (0.6 + R());
        ctx.fillStyle = rgba(mix(P.sky.mid, "#ffffff", 0.15), 0.35);
        ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // 地平線から手前に向かって広がる道（石畳・土・雪）
  function road(P, o) {
    const { ctx, h, hz, R } = P;
    o = o || {};
    const x0 = o.x == null ? P.cx : o.x, x1 = o.x1 == null ? x0 : o.x1, top = o.top == null ? hz : o.top;
    const wt = o.wt || P.u * 2, wb = o.wb || P.w * 0.55, col = o.color || "#8a7c6a";
    const g = ctx.createLinearGradient(0, top, 0, h);
    g.addColorStop(0, P.c(col, 0.5)); g.addColorStop(1, P.dark(col, 0, 0.3));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0 - wt / 2, top); ctx.lineTo(x0 + wt / 2, top); ctx.lineTo(x1 + wb / 2, h); ctx.lineTo(x1 - wb / 2, h); ctx.fill();
    if (o.cobble) {
      ctx.save(); ctx.clip();
      for (let t = 0.02; t < 1; ) {
        const y = top + (h - top) * t, rw = lerp(wt, wb, t), cxr = lerp(x0, x1, t), sh = (h - top) * (0.012 + t * 0.05);
        const sw = rw / (13 + (1 - t) * 6) * (0.85 + R() * 0.3);
        for (let x = cxr - rw / 2 - (R() * sw); x < cxr + rw / 2; x += sw) {
          const sc = mix(col, R() < 0.5 ? "#a49888" : "#6a5e50", 0.15 + R() * 0.35);
          ctx.fillStyle = P.dark(sc, 0.4 * (1 - t), 0.35); ctx.beginPath(); ctx.ellipse(x + sw / 2, y + sh * 0.1, sw * 0.47, sh * 0.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = P.lit(sc, 0.4 * (1 - t), 0.12); ctx.beginPath(); ctx.ellipse(x + sw / 2 + P.ldir * sw * 0.04, y - sh * 0.04, sw * 0.4, sh * 0.38, 0, 0, Math.PI * 2); ctx.fill();
        }
        t += 0.008 + t * 0.034;
      }
      ctx.restore();
    } else {
      ctx.save(); ctx.clip();
      ctx.strokeStyle = rgba(P.dark(col, 0, 0.5), 0.3); ctx.lineWidth = Math.max(1, P.u * 0.3);
      for (let i = 0; i < 4; i++) { const k = (i + 0.5) / 4 - 0.5; ctx.beginPath(); ctx.moveTo(x0 + k * wt, top); ctx.lineTo(x1 + k * wb * 0.7, h); ctx.stroke(); }
      ctx.restore();
    }
    if (P.wet) {
      ctx.fillStyle = rgba(mix(P.sky.hor, "#ffffff", 0.2), 0.12);
      ctx.beginPath(); ctx.moveTo(x0 - wt / 2, top); ctx.lineTo(x0 + wt / 2, top); ctx.lineTo(x1 + wb / 2, h); ctx.lineTo(x1 - wb / 2, h); ctx.fill();
      P.wetRoad = { x0, x1, top, wt, wb };
    }
  }
  // 水面：上の景色を逆さに映し、さざ波と光の道を描く
  function water(P, o) {
    const { ctx, w, h, R } = P;
    o = o || {};
    const top = o.top, bot = o.bottom || h, col = o.color || "#2a4a62", x0 = o.x0 || 0, x1 = o.x1 == null ? w : o.x1;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, top, x1 - x0, bot - top); ctx.clip();
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, P.c(mix(col, P.sky.hor, 0.5), 0.2)); g.addColorStop(1, P.dark(col, 0, 0.35));
    ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, bot - top);
    if (P.cv && P.dpr && !o.noReflect) {
      ctx.globalAlpha = o.reflect || 0.5;
      ctx.translate(0, top * 2); ctx.scale(1, -1);
      const src = Math.max(1, Math.round(top * P.dpr));
      try { ctx.drawImage(P.cv, 0, 0, P.cv.width, src, 0, 0, w, top); } catch (e) { /* 描けない環境では映さない */ }
      ctx.setTransform(P.dpr, 0, 0, P.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.rect(x0, top, x1 - x0, bot - top); ctx.clip();
      const g2 = ctx.createLinearGradient(0, top, 0, bot);
      g2.addColorStop(0, rgba(P.c(col), 0.25)); g2.addColorStop(1, rgba(P.dark(col, 0, 0.4), 0.85));
      ctx.fillStyle = g2; ctx.fillRect(x0, top, x1 - x0, bot - top);
    }
    // さざ波
    const n = Math.round((x1 - x0) * (bot - top) / 500);
    for (let i = 0; i < n; i++) {
      const y = top + Math.pow(R(), 1.3) * (bot - top), dd = (y - top) / (bot - top), x = x0 + R() * (x1 - x0), l = P.u * (0.6 + dd * 6) * (0.5 + R());
      ctx.fillStyle = R() < 0.5 ? rgba(mix(P.sky.mid, "#ffffff", 0.3), 0.18 + R() * 0.15) : rgba(P.dark(col, 0, 0.6), 0.3);
      ctx.fillRect(x, y, l, Math.max(0.8, dd * P.u * 0.25));
    }
    // 光の道（太陽・月）
    if (P.sun.show && P.sun.x > x0 && P.sun.x < x1) {
      for (let i = 0; i < 90; i++) {
        const t = Math.pow(R(), 1.2), y = top + t * (bot - top), spread = P.u * (1 + t * 12);
        ctx.fillStyle = rgba(P.sun.col, (0.5 - t * 0.3) * (P.night ? 0.6 : 0.9));
        ctx.fillRect(P.sun.x + (R() - 0.5) * spread * 2, y, P.u * (0.5 + t * 3) * R(), Math.max(1, t * P.u * 0.3));
      }
    }
    ctx.restore();
    P.waterTop = top;
    if (o.lightsReflect !== false) P.reflectWater = { top, bot, x0, x1 };
  }
  Object.assign(V, { mountains, hills, ground, road, water });

  // ---------------------------------------------------------------- 木
  function leafColors(P, base) {
    const s = P.season;
    if (s === "autumn") return ["#a8381c", "#d0702a", "#e0a838", "#8a2a18"];
    if (s === "spring") return ["#5f8e3c", "#86b04e", "#f0c4cf", "#4f7a32"];
    if (s === "summer") return ["#2f5e24", "#3f7a2c", "#5a9636", "#244a1c"];
    if (s === "winter") return null;
    return [base || "#3f6a2e", mix(base || "#3f6a2e", "#9ac060", 0.35), mix(base || "#3f6a2e", "#1a2a10", 0.4)];
  }
  // 広葉樹：幹と枝、影の塊・日の当たる塊・明るい点の三段で葉を描く
  function tree(P, x, base, s, o) {
    const { ctx, R } = P;
    o = o || {};
    const d = o.d || 0, kind = o.kind || "broad";
    if (kind === "pine") return pine(P, x, base, s, o);
    const trunk = o.trunk || "#4a3626";
    const tg = ctx.createLinearGradient(x - s * 0.05, 0, x + s * 0.05, 0);
    tg.addColorStop(P.ldir < 0 ? 0 : 1, P.lit(trunk, d, 0.3)); tg.addColorStop(P.ldir < 0 ? 1 : 0, P.dark(trunk, d, 0.5));
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.moveTo(x - s * 0.06, base); ctx.quadraticCurveTo(x - s * 0.03, base - s * 0.4, x - s * 0.02, base - s * 0.7); ctx.lineTo(x + s * 0.02, base - s * 0.7); ctx.quadraticCurveTo(x + s * 0.03, base - s * 0.4, x + s * 0.06, base); ctx.fill();
    const cols = o.leaves || leafColors(P, o.color);
    ctx.strokeStyle = P.dark(trunk, d, 0.3); ctx.lineCap = "round";
    const branches = cols ? 4 : 9;
    for (let i = 0; i < branches; i++) {
      const by = base - s * (0.35 + R() * 0.4), side = R() < 0.5 ? -1 : 1, l = s * (0.18 + R() * 0.3);
      ctx.lineWidth = Math.max(1, s * 0.022);
      ctx.beginPath(); ctx.moveTo(x, by); ctx.quadraticCurveTo(x + side * l * 0.5, by - l * 0.3, x + side * l, by - l * (0.5 + R() * 0.4)); ctx.stroke();
      if (!cols && P.season === "winter") { ctx.strokeStyle = rgba(P.lit("#f4f7fb", d), 0.8); ctx.lineWidth = Math.max(1, s * 0.012); ctx.beginPath(); ctx.moveTo(x + side * l * 0.3, by - l * 0.18); ctx.lineTo(x + side * l * 0.8, by - l * 0.45); ctx.stroke(); ctx.strokeStyle = P.dark(trunk, d, 0.3); }
    }
    if (!cols) return;
    const cy = base - s * 0.78, rx = s * (o.wide || 0.36), ry = s * 0.34;
    const clumps = [];
    for (let i = 0; i < 11; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()); clumps.push([x + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r * 0.9, s * (0.13 + R() * 0.12)]); }
    clumps.sort((a, b) => a[1] - b[1]);
    const shade = P.dark(cols[3] || cols[2], d, 0.45), mid = P.c(cols[0], d), lit = P.lit(cols[1], d, 0.35);
    ctx.fillStyle = shade;
    for (const [cx2, cy2, r] of clumps) { ctx.beginPath(); ctx.arc(cx2, cy2 + r * 0.15, r * 1.08, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = mid;
    for (const [cx2, cy2, r] of clumps) { ctx.beginPath(); ctx.arc(cx2 + P.ldir * r * 0.15, cy2 - r * 0.12, r * 0.85, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = lit;
    for (const [cx2, cy2, r] of clumps) if ((cx2 - x) * P.ldir > -rx * 0.2) { ctx.beginPath(); ctx.arc(cx2 + P.ldir * r * 0.35, cy2 - r * 0.32, r * 0.5, 0, Math.PI * 2); ctx.fill(); }
    if (cols[2] && P.season === "spring") { ctx.fillStyle = P.c(cols[2], d); for (let i = 0; i < 26; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()); ctx.beginPath(); ctx.arc(x + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, s * 0.025, 0, Math.PI * 2); ctx.fill(); } }
    if (P.night && !d) { ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(x, base, s * 0.3, s * 0.05, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // 針葉樹：段ごとに、日の当たる半分を明るく。冬は段の上に雪
  function pine(P, x, base, s, o) {
    const { ctx, R } = P;
    const d = o.d || 0;
    const col = o.color || (P.season === "summer" ? "#244a26" : "#2a4632");
    ctx.fillStyle = P.dark("#3a2a1e", d, 0.4); ctx.fillRect(x - s * 0.03, base - s * 0.2, s * 0.06, s * 0.2);
    const tiers = o.tiers || 5;
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers, ty = base - s * (0.12 + t * 0.82), tw = s * (0.34 - t * 0.27), th = s * 0.32;
      const jag = (k) => (R() - 0.5) * tw * 0.12 * k;
      ctx.fillStyle = P.dark(col, d, 0.35);
      ctx.beginPath(); ctx.moveTo(x, ty - th); ctx.lineTo(x - tw + jag(1), ty + jag(0.5)); ctx.lineTo(x - tw * 0.5, ty - th * 0.08); ctx.lineTo(x, ty + th * 0.05); ctx.lineTo(x + tw * 0.5, ty - th * 0.08); ctx.lineTo(x + tw + jag(1), ty + jag(0.5)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = P.lit(col, d, 0.3);
      ctx.beginPath(); ctx.moveTo(x, ty - th); ctx.lineTo(x + P.ldir * tw * 0.95, ty - th * 0.04); ctx.lineTo(x + P.ldir * tw * 0.45, ty - th * 0.1); ctx.lineTo(x + P.ldir * tw * 0.1, ty - th * 0.02); ctx.closePath(); ctx.fill();
      if (P.season === "winter" || o.snow) {
        ctx.fillStyle = P.lit("#f2f6fb", d, 0.2);
        ctx.beginPath(); ctx.moveTo(x, ty - th); ctx.lineTo(x - tw * 0.7, ty - th * 0.25); ctx.quadraticCurveTo(x, ty - th * 0.4, x + tw * 0.7, ty - th * 0.25); ctx.closePath(); ctx.fill();
      }
    }
  }
  // 遠くの森の帯（木の頭を並べる。遠いほど霞む）
  function forestBand(P, o) { return blurred(P, (o.d || 0.5) > 0.3 ? P.u * 0.4 * (o.d || 0.5) : 0, () => forestBand0(P, o)); }
  function forestBand0(P, o) {
    const { ctx, w, R } = P;
    const base = o.base, s = o.size, d = o.d || 0.5, kind = o.kind || "mixed";
    const cols = leafColors(P, o.color) || ["#4a5448", "#6a7466", "#3a4438"];
    const col = kind === "pine" ? (o.color || "#2a4632") : cols[0];
    ctx.fillStyle = P.dark(col, d, 0.25);
    ctx.fillRect(0, base - s * 0.3, w, s * 0.3 + (o.fill || 2));
    for (let x = -s; x < w + s; x += s * (0.25 + R() * 0.3)) {
      const hh = s * (0.6 + R() * 0.6), pineHere = kind === "pine" || (kind === "mixed" && R() < 0.4);
      const c = pineHere ? col : cols[Math.floor(R() * Math.min(3, cols.length))];
      if (pineHere) {
        ctx.fillStyle = P.dark(c, d, 0.25); ctx.beginPath(); ctx.moveTo(x, base - hh * 1.4); ctx.lineTo(x - s * 0.2, base); ctx.lineTo(x + s * 0.2, base); ctx.fill();
        ctx.fillStyle = P.lit(c, d, 0.25); ctx.beginPath(); ctx.moveTo(x, base - hh * 1.4); ctx.lineTo(x + P.ldir * s * 0.2, base); ctx.lineTo(x + P.ldir * s * 0.04, base); ctx.fill();
        if (P.season === "winter") { ctx.fillStyle = P.lit("#eef2f8", d); ctx.beginPath(); ctx.moveTo(x, base - hh * 1.4); ctx.lineTo(x - s * 0.07, base - hh * 0.95); ctx.lineTo(x + s * 0.07, base - hh * 0.95); ctx.fill(); }
      } else {
        ctx.fillStyle = P.dark(c, d, 0.3); ctx.beginPath(); ctx.arc(x, base - hh * 0.55, s * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = P.lit(c, d, 0.3); ctx.beginPath(); ctx.arc(x + P.ldir * s * 0.08, base - hh * 0.62, s * 0.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // 手前の縁取り（左右の端に、暗い草や葉。中央は空けて敵の立つ場所にする）
  function frame(P, o) {
    const { ctx, w, h, R } = P;
    o = o || {};
    const col = P.dark(o.color || "#2c3a22", 0, 0.7);
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? 0 : w;
      ctx.fillStyle = col;
      for (let i = 0; i < 30; i++) {
        const x = x0 - side * R() * w * 0.16, l = h * (0.05 + R() * 0.18) * (1 - Math.abs(x - x0) / (w * 0.2));
        ctx.beginPath(); ctx.moveTo(x - P.u * 0.6, h); ctx.quadraticCurveTo(x + (R() - 0.5) * P.u * 4, h - l * 0.6, x + side * -1 * P.u * (R() * 3), h - l); ctx.lineTo(x + P.u * 0.6, h); ctx.fill();
      }
      if (o.leaves) for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.ellipse(x0 - side * R() * w * 0.08, R() * h * 0.35, P.u * (2 + R() * 3), P.u * (0.8 + R()), R() * 3, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  Object.assign(V, { tree, pine, forestBand, frame, leafColors });

  // ---------------------------------------------------------------- 建物
  // 灯り：絵の中の光源。静止の層で光の暈を描き、flick なら毎コマ揺らす
  function light(P, x, y, r, col, k, flick) { P.lights.push({ x, y, r, col: col || "#ffb050", k: k == null ? 1 : k, flick: !!flick }); }
  // 窓：昼は空を映し、夕と夜は灯る
  function win(P, x, y, ww, wh, o) {
    const { ctx, R } = P;
    o = o || {};
    const d = o.d || 0;
    const lit = o.lit != null ? o.lit : (P.night || P.dusk || P.inside) && R() < (o.p == null ? 0.55 : o.p);
    ctx.fillStyle = P.dark(o.frame || "#2a2018", d, 0.3);
    ctx.fillRect(x - ww * 0.12, y - wh * 0.08, ww * 1.24, wh * 1.16);
    if (lit) {
      const c = o.col || (R() < 0.5 ? "#ffcf72" : "#ffb04c");
      const g = ctx.createLinearGradient(0, y, 0, y + wh);
      g.addColorStop(0, mix(c, "#fff4d8", 0.4)); g.addColorStop(1, c);
      ctx.fillStyle = g; ctx.fillRect(x, y, ww, wh);
      light(P, x + ww / 2, y + wh / 2, Math.max(ww, wh) * 3.2, c, 0.55 * (1 - d * 0.5), R() < 0.3);
    } else {
      const g = ctx.createLinearGradient(x, y, x + ww, y + wh);
      g.addColorStop(0, P.c(mix(P.sky.mid, "#ffffff", 0.2), d)); g.addColorStop(1, P.dark("#202838", d, 0.4));
      ctx.fillStyle = g; ctx.fillRect(x, y, ww, wh);
    }
    if (ww > 4 && wh > 6) { ctx.fillStyle = P.dark(o.frame || "#2a2018", d, 0.3); ctx.fillRect(x + ww / 2 - 0.5, y, 1, wh); ctx.fillRect(x, y + wh * 0.45, ww, 1); }
    if (o.arch) { ctx.fillStyle = lit ? "#ffd890" : P.c(P.sky.mid, d); ctx.beginPath(); ctx.arc(x + ww / 2, y, ww / 2, Math.PI, 0); ctx.fill(); }
  }
  // 家：壁（光の側が明るい）、奥行きの側面、屋根（瓦や板の筋）、窓、扉、煙突、看板
  function house(P, x, base, bw, bh, o) {
    const { ctx, R } = P;
    o = o || {};
    const d = o.d || 0, wall = o.wall || "#c8b496", roof = o.roof || "#7a3a28";
    const vp = [P.cx, P.hz - P.h * 0.05];
    // 側面（中央を向いた側が見える）
    const mid = x + bw / 2, sideR = mid < P.cx, k = o.side == null ? 0.1 : o.side;
    if (k > 0) {
      const ex = sideR ? x + bw : x;
      const tx = ex + (vp[0] - ex) * k, tyT = (base - bh) + (vp[1] - (base - bh)) * k, tyB = base + (vp[1] - base) * k;
      const lit = (sideR ? 1 : -1) === P.ldir;
      ctx.fillStyle = lit ? P.lit(wall, d, 0.15) : P.dark(wall, d, 0.5);
      ctx.beginPath(); ctx.moveTo(ex, base); ctx.lineTo(ex, base - bh); ctx.lineTo(tx, tyT); ctx.lineTo(tx, tyB); ctx.fill();
      if (o.roofType !== "flat") { ctx.fillStyle = P.dark(roof, d, 0.35); ctx.beginPath(); ctx.moveTo(ex, base - bh); ctx.lineTo(ex + (sideR ? 1 : -1) * bw * 0.04, base - bh - bw * 0.02); ctx.lineTo(tx, tyT - bw * 0.06); ctx.lineTo(tx, tyT); ctx.fill(); }
    }
    // 壁
    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    const a0 = P.ldir < 0 ? P.lit(wall, d, 0.3) : P.dark(wall, d, 0.3), a1 = P.ldir < 0 ? P.dark(wall, d, 0.3) : P.lit(wall, d, 0.3);
    g.addColorStop(0, a0); g.addColorStop(1, a1);
    ctx.fillStyle = g; ctx.fillRect(x, base - bh, bw, bh);
    if (o.stone) {
      ctx.strokeStyle = rgba(P.dark(wall, d, 0.6), 0.35); ctx.lineWidth = 0.8;
      const rh = Math.max(3, bh / 9);
      for (let y = base - bh + rh, r = 0; y < base; y += rh, r++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bw, y); ctx.stroke(); for (let xx = x + ((r % 2) * rh); xx < x + bw; xx += rh * 2) { ctx.beginPath(); ctx.moveTo(xx, y - rh); ctx.lineTo(xx, y); ctx.stroke(); } }
    }
    if (o.timber) {
      ctx.fillStyle = P.dark(o.timber, d, 0.2);
      const t = Math.max(1, bw * 0.04);
      ctx.fillRect(x, base - bh, t, bh); ctx.fillRect(x + bw - t, base - bh, t, bh); ctx.fillRect(x, base - bh * 0.52, bw, t); ctx.fillRect(x, base - bh, bw, t);
      ctx.save(); ctx.lineWidth = t * 0.8; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(x, base - bh * 0.52); ctx.lineTo(x + bw * 0.3, base - bh); ctx.moveTo(x + bw, base - bh * 0.52); ctx.lineTo(x + bw * 0.7, base - bh); ctx.stroke(); ctx.restore();
    }
    // 窓
    const cols = Math.max(1, Math.round(bw / (bh > bw ? bw * 0.45 : Math.max(8, bh * 0.38)))), rows = Math.max(1, Math.round(bh / Math.max(9, bw * 0.45)) - (o.door === false ? 0 : 0));
    const ww = Math.min(bw / (cols * 2.2), bh * 0.18), wh = ww * 1.5;
    if (o.windows !== false && ww > 1.2) {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const wx = x + (c + 0.5) * (bw / cols) - ww / 2, wy = base - bh + (r + 0.35) * (bh / rows) - wh / 2;
        if (r === rows - 1 && c === Math.floor(cols / 2) && o.door !== false && rows > 1) continue;
        win(P, wx, wy, ww, wh, { d, p: o.lit, arch: o.arch });
      }
    }
    // 扉
    if (o.door !== false) {
      const dw = Math.min(bw * 0.24, bh * 0.22), dh = Math.min(bh * 0.4, dw * 1.9), dx = x + bw / 2 - dw / 2 + (cols % 2 ? 0 : bw * 0.15);
      ctx.fillStyle = P.dark(o.doorC || "#3a2618", d, 0.4); ctx.fillRect(dx, base - dh, dw, dh);
      ctx.beginPath(); ctx.arc(dx + dw / 2, base - dh, dw / 2, Math.PI, 0); ctx.fill();
      if ((P.night || P.dusk) && R() < 0.3) { ctx.fillStyle = "rgba(255,190,90,.75)"; ctx.fillRect(dx + dw * 0.15, base - dh * 0.95, dw * 0.7, dh * 0.95); light(P, dx + dw / 2, base - dh * 0.4, dh * 2.5, "#ffb050", 0.5); }
    }
    // 屋根
    const rt = o.roofType || "gable", rh = o.roofH == null ? bw * 0.42 : o.roofH, ov = bw * 0.06;
    const rg = ctx.createLinearGradient(x, base - bh - rh, x + bw, base - bh);
    rg.addColorStop(P.ldir < 0 ? 0 : 1, P.lit(roof, d, 0.3)); rg.addColorStop(P.ldir < 0 ? 1 : 0, P.dark(roof, d, 0.35));
    ctx.fillStyle = rg;
    const top = base - bh;
    ctx.beginPath();
    if (rt === "gable") { ctx.moveTo(x - ov, top); ctx.lineTo(x + bw / 2, top - rh); ctx.lineTo(x + bw + ov, top); }
    else if (rt === "eave") { ctx.moveTo(x - ov, top); ctx.lineTo(x + bw * 0.12, top - rh * 0.8); ctx.lineTo(x + bw * 0.88, top - rh * 0.8); ctx.lineTo(x + bw + ov, top); }
    else if (rt === "flat") { ctx.rect(x - ov * 0.4, top - bw * 0.05, bw + ov * 0.8, bw * 0.05); }
    else if (rt === "steep") { ctx.moveTo(x - ov, top); ctx.lineTo(x + bw / 2, top - rh * 1.7); ctx.lineTo(x + bw + ov, top); }
    else if (rt === "dome") { ctx.moveTo(x - ov * 0.3, top); ctx.quadraticCurveTo(x - ov * 0.3, top - rh * 1.3, x + bw / 2, top - rh * 1.3); ctx.quadraticCurveTo(x + bw + ov * 0.3, top - rh * 1.3, x + bw + ov * 0.3, top); }
    else if (rt === "japan") { ctx.moveTo(x - ov * 2.5, top + rh * 0.1); ctx.quadraticCurveTo(x + bw * 0.1, top - rh * 0.15, x + bw * 0.2, top - rh * 0.75); ctx.lineTo(x + bw * 0.8, top - rh * 0.75); ctx.quadraticCurveTo(x + bw * 0.9, top - rh * 0.15, x + bw + ov * 2.5, top + rh * 0.1); }
    ctx.closePath(); ctx.fill();
    // 瓦・板の筋
    if (rt !== "flat" && rh > 6) {
      ctx.save(); ctx.clip();
      ctx.strokeStyle = rgba(P.dark(roof, d, 0.6), 0.35); ctx.lineWidth = Math.max(0.6, rh * 0.03);
      const step = Math.max(2.5, rh / 7);
      for (let y = top - rh * 1.8; y < top; y += step) { ctx.beginPath(); ctx.moveTo(x - ov * 3, y); ctx.lineTo(x + bw + ov * 3, y); ctx.stroke(); }
      if (o.tiles !== false) for (let xx = x - ov * 2; xx < x + bw + ov * 2; xx += step * 1.2) { ctx.beginPath(); ctx.moveTo(xx, top - rh * 2); ctx.lineTo(xx, top); ctx.stroke(); }
      ctx.restore();
    }
    // 軒の影
    ctx.fillStyle = rgba(P.shadowC, 0.35 * (1 - d)); ctx.fillRect(x, top, bw, Math.max(1.5, bh * 0.06));
    // 雪
    if ((P.season === "winter" || o.snow) && rt !== "flat") {
      ctx.fillStyle = P.lit("#f2f6fb", d, 0.2);
      ctx.beginPath();
      if (rt === "gable" || rt === "steep") { const hh = rt === "steep" ? rh * 1.7 : rh; ctx.moveTo(x - ov, top); ctx.lineTo(x + bw / 2, top - hh); ctx.lineTo(x + bw + ov, top); ctx.lineTo(x + bw + ov, top + 2); ctx.lineTo(x + bw / 2, top - hh * 0.72); ctx.lineTo(x - ov, top + 2); }
      else { ctx.moveTo(x - ov, top); ctx.lineTo(x + bw * 0.12, top - rh * 0.8); ctx.lineTo(x + bw * 0.88, top - rh * 0.8); ctx.lineTo(x + bw + ov, top); ctx.lineTo(x + bw * 0.86, top - rh * 0.5); ctx.lineTo(x + bw * 0.14, top - rh * 0.5); }
      ctx.closePath(); ctx.fill();
    }
    // 煙突と煙
    if (o.chimney) {
      const chx = x + bw * (0.65 + R() * 0.15), chy = top - rh * 0.55;
      ctx.fillStyle = P.dark(o.chimneyC || "#5a4a40", d, 0.3); ctx.fillRect(chx, chy - rh * 0.5, bw * 0.09, rh * 0.6);
      if (o.smoke !== false) smoke(P, chx + bw * 0.045, chy - rh * 0.5, bw * 0.12, d);
    }
    // 看板
    if (o.sign) {
      const sx = x + (sideR ? bw : 0), sy = base - bh * 0.62, sw = Math.max(5, bw * 0.2);
      ctx.strokeStyle = P.dark("#2a1e14", d, 0.3); ctx.lineWidth = Math.max(1, sw * 0.08);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (sideR ? 1 : -1) * sw * 1.2, sy); ctx.stroke();
      ctx.fillStyle = P.lit(o.sign, d, 0.2); const sx2 = sx + (sideR ? sw * 0.2 : -sw * 1.1);
      ctx.fillRect(sx2, sy + sw * 0.1, sw * 0.9, sw * 0.65);
      ctx.fillStyle = P.dark("#2a1e14", d, 0.2); ctx.fillRect(sx2 + sw * 0.2, sy + sw * 0.3, sw * 0.5, sw * 0.12);
    }
    // 足元の陰
    const ao = ctx.createLinearGradient(0, base - bh * 0.25, 0, base);
    ao.addColorStop(0, rgba(P.shadowC, 0)); ao.addColorStop(1, rgba(P.shadowC, 0.35 * (1 - d)));
    ctx.fillStyle = ao; ctx.fillRect(x, base - bh * 0.25, bw, bh * 0.25);
  }
  // 家並み（左から右へ、幅と高さを揺らして並べる）
  function houseRow(P, o) { return blurred(P, (o.d || 0) >= 0.45 ? P.u * 0.15 : 0, () => houseRow0(P, o)); }
  function houseRow0(P, o) {
    const { R, w } = P;
    let x = (o.from == null ? -P.u * 4 : o.from);
    const to = o.to == null ? w + P.u * 4 : o.to;
    const out = [];
    while (x < to) {
      const bw = P.u * o.size * (0.7 + R() * 0.7), bh = P.u * o.size * (o.tall || 1) * (0.7 + R() * 0.8);
      const pick = (v) => (Array.isArray(v) ? v[Math.floor(R() * v.length)] : v);
      const skip = o.gap && x + bw / 2 > o.gap[0] && x + bw / 2 < o.gap[1];
      if (!skip) {
        house(P, x, o.base + (R() - 0.5) * P.u * (o.jitter || 0), bw, bh, Object.assign({}, o.house, { wall: pick(o.walls), roof: pick(o.roofs), roofType: pick(o.roofType || ["gable", "eave"]), chimney: R() < (o.chimney == null ? 0.35 : o.chimney), sign: o.signs && R() < 0.3 ? pick(o.signs) : null, d: o.d, side: o.side }));
        out.push([x, bw, bh]);
      }
      x += bw + P.u * (o.space == null ? 0.3 : o.space) * R();
    }
    return out;
  }
  // 丸い塔（円筒の陰影、円錐の屋根、旗）
  function tower(P, x, base, tw, th, o) {
    const { ctx } = P;
    o = o || {};
    const d = o.d || 0, wall = o.wall || "#d8d0c0", roof = o.roof || "#3a4a6a";
    const g = ctx.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
    const L = P.lit(wall, d, 0.35), M = P.c(wall, d), Dk = P.dark(wall, d, 0.55);
    if (P.ldir < 0) { g.addColorStop(0, M); g.addColorStop(0.3, L); g.addColorStop(1, Dk); } else { g.addColorStop(0, Dk); g.addColorStop(0.7, L); g.addColorStop(1, M); }
    ctx.fillStyle = g; ctx.fillRect(x - tw / 2, base - th, tw, th);
    if (o.stone !== false) {
      ctx.strokeStyle = rgba(P.dark(wall, d, 0.7), 0.25); ctx.lineWidth = 0.7;
      for (let y = base - th + tw * 0.25; y < base; y += Math.max(3, tw * 0.18)) { ctx.beginPath(); ctx.moveTo(x - tw / 2, y); ctx.quadraticCurveTo(x, y + tw * 0.05, x + tw / 2, y); ctx.stroke(); }
    }
    // 窓（細い縦長）
    for (let y = base - th + tw * 0.6; y < base - tw * 0.6; y += tw * 1.1) win(P, x - tw * 0.07, y, tw * 0.14, tw * 0.32, { d, p: 0.6, arch: true, col: o.winCol });
    const top = base - th;
    if (o.crenel) {
      ctx.fillStyle = P.c(wall, d);
      ctx.fillRect(x - tw * 0.58, top - tw * 0.1, tw * 1.16, tw * 0.14);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? P.dark(wall, d, 0.3) : P.lit(wall, d, 0.2); ctx.fillRect(x - tw * 0.58 + i * tw * 0.26, top - tw * 0.3, tw * 0.16, tw * 0.22); }
      if (o.flag) flag(P, x, top - tw * 0.3, tw * 0.9, o.flag, d);
      return top - tw * 0.3;
    }
    const rh = tw * (o.roofK || 1.5);
    const rg = ctx.createLinearGradient(x - tw * 0.6, 0, x + tw * 0.6, 0);
    rg.addColorStop(P.ldir < 0 ? 0 : 1, P.lit(roof, d, 0.35)); rg.addColorStop(P.ldir < 0 ? 1 : 0, P.dark(roof, d, 0.5));
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.moveTo(x - tw * 0.62, top); ctx.quadraticCurveTo(x - tw * 0.2, top - rh * 0.4, x, top - rh); ctx.quadraticCurveTo(x + tw * 0.2, top - rh * 0.4, x + tw * 0.62, top); ctx.closePath(); ctx.fill();
    if (P.season === "winter" || o.snow) { ctx.fillStyle = P.lit("#f2f6fb", d, 0.2); ctx.beginPath(); ctx.moveTo(x, top - rh); ctx.quadraticCurveTo(x - tw * 0.15, top - rh * 0.5, x - tw * 0.35, top - rh * 0.3); ctx.quadraticCurveTo(x, top - rh * 0.45, x + tw * 0.35, top - rh * 0.3); ctx.quadraticCurveTo(x + tw * 0.15, top - rh * 0.5, x, top - rh); ctx.fill(); }
    if (o.flag) flag(P, x, top - rh, tw * 0.9, o.flag, d);
    return top - rh;
  }
  // 旗（竿と、風にたなびく布）
  function flag(P, x, y, s, col, d) {
    const { ctx } = P;
    ctx.strokeStyle = P.dark("#3a3026", d, 0.3); ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s); ctx.stroke();
    const g = ctx.createLinearGradient(x, 0, x + s, 0);
    g.addColorStop(0, P.lit(col, d, 0.2)); g.addColorStop(1, P.dark(col, d, 0.3));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y - s);
    for (let t = 0; t <= 1; t += 0.1) ctx.lineTo(x + t * s * 0.9, y - s + Math.sin(t * 6) * s * 0.06 * t);
    for (let t = 1; t >= 0; t -= 0.1) ctx.lineTo(x + t * s * 0.9, y - s * 0.55 + Math.sin(t * 6) * s * 0.06 * t);
    ctx.closePath(); ctx.fill();
  }
  // 城壁（狭間つき。石積みの筋）
  function wall(P, x0, x1, base, wh, o) {
    const { ctx } = P;
    o = o || {};
    const d = o.d || 0, col = o.color || "#d4ccbc";
    const g = ctx.createLinearGradient(0, base - wh, 0, base);
    g.addColorStop(0, P.lit(col, d, 0.25)); g.addColorStop(1, P.dark(col, d, 0.35));
    ctx.fillStyle = g; ctx.fillRect(x0, base - wh, x1 - x0, wh);
    const m = Math.max(3, wh * 0.16);
    if (o.crenel !== false) for (let x = x0; x < x1 - m * 0.5; x += m * 1.8) { ctx.fillStyle = P.lit(col, d, 0.2); ctx.fillRect(x, base - wh - m, m, m + 1); ctx.fillStyle = rgba(P.shadowC, 0.25 * (1 - d)); ctx.fillRect(x + m * 0.75, base - wh - m, m * 0.25, m); }
    ctx.strokeStyle = rgba(P.dark(col, d, 0.6), 0.3); ctx.lineWidth = 0.8;
    const rh = Math.max(3, wh / 7);
    for (let y = base - wh + rh, r = 0; y < base; y += rh, r++) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); for (let x = x0 + (r % 2) * rh * 1.2; x < x1; x += rh * 2.4) { ctx.beginPath(); ctx.moveTo(x, y - rh); ctx.lineTo(x, y); ctx.stroke(); } }
    if (P.season === "winter" || o.snow) { ctx.fillStyle = P.lit("#f2f6fb", d, 0.2); ctx.fillRect(x0, base - wh - (o.crenel === false ? 0 : m) - 1.5, x1 - x0, 2.5); }
    const ao = ctx.createLinearGradient(0, base - wh * 0.3, 0, base);
    ao.addColorStop(0, rgba(P.shadowC, 0)); ao.addColorStop(1, rgba(P.shadowC, 0.3 * (1 - d)));
    ctx.fillStyle = ao; ctx.fillRect(x0, base - wh * 0.3, x1 - x0, wh * 0.3);
  }
  // 煙（ふわりと上って流れる）
  function smoke(P, x, y, s, d, col) {
    const { ctx, R } = P;
    const c = col || (P.night ? "#4a4e58" : "#b8b4b0");
    let px = x, py = y, r = s * 0.5;
    for (let i = 0; i < 9; i++) {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, rgba(P.c(c, d || 0), 0.32 * (1 - i / 10))); g.addColorStop(1, rgba(P.c(c, d || 0), 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      py -= r * 0.9; px += r * (0.35 + R() * 0.4) * (P.wind || 1); r *= 1.18;
    }
  }
  // 霧の帯
  function fogBand(P, y, hh, a, col) {
    const { ctx, w } = P;
    const c = col || P.haze;
    const g = ctx.createLinearGradient(0, y - hh, 0, y + hh);
    g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.5, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, y - hh, w, hh * 2);
  }
  // 松明・篝火（炎は毎コマ揺れる。静止の層には光の暈だけ）
  function torch(P, x, y, s, o) {
    o = o || {};
    if (o.stick !== false) { P.ctx.fillStyle = P.dark("#3a2a1e", o.d || 0, 0.4); P.ctx.fillRect(x - s * 0.08, y, s * 0.16, s * 1.1); }
    light(P, x, y - s * 0.3, s * (o.reach || 9), o.col || "#ff9a3a", o.k == null ? 1 : o.k, true);
    P.anim.push({ type: "flame", x, y, s, col: o.col || "#ff9a3a" });
  }
  Object.assign(V, { light, win, house, houseRow, tower, flag, wall, smoke, fogBand, torch });

  // ---------------------------------------------------------------- 室内
  // 一点透視の部屋：奥の壁・左右の壁・床・天井。返り値は奥の壁の四隅
  function room(P, o) {
    const { ctx, w, h, R } = P;
    o = o || {};
    const bw = o.backW || Math.min(w * 0.58, h * 1.15), bh = o.backH || h * 0.5;
    const bx = P.cx - bw / 2, by = o.backY || h * 0.16, bb = by + bh;
    const walls = o.wall || "#6b4a2e", floor = o.floor || "#3a2716", ceil = o.ceil || mix(walls, "#000000", 0.4);
    const amb = o.amb || 0.55;
    const dk = (c, k) => mix(c, "#000000", clamp(k, 0, 1));
    // 天井
    let g = ctx.createLinearGradient(0, 0, 0, by);
    g.addColorStop(0, dk(ceil, 0.75)); g.addColorStop(1, dk(ceil, 0.45));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(bx + bw, by); ctx.lineTo(bx, by); ctx.fill();
    // 左右の壁
    for (const s of [-1, 1]) {
      const ex = s < 0 ? 0 : w, ix = s < 0 ? bx : bx + bw;
      g = ctx.createLinearGradient(ex, 0, ix, 0);
      g.addColorStop(0, dk(walls, 0.75 - amb * 0.4)); g.addColorStop(1, dk(walls, 0.45 - amb * 0.3));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ex, 0); ctx.lineTo(ix, by); ctx.lineTo(ix, bb); ctx.lineTo(ex, h); ctx.fill();
    }
    // 奥の壁
    g = ctx.createLinearGradient(0, by, 0, bb);
    g.addColorStop(0, dk(walls, 0.45 - amb * 0.35)); g.addColorStop(1, dk(walls, 0.25 - amb * 0.2));
    ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
    // 床
    g = ctx.createLinearGradient(0, bb, 0, h);
    g.addColorStop(0, dk(floor, 0.35)); g.addColorStop(1, dk(floor, 0.7));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx, bb); ctx.lineTo(bx + bw, bb); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    const tex = o.tex || "plank";
    ctx.save();
    // 床の筋（板は奥へ収束、石は格子）
    ctx.beginPath(); ctx.moveTo(bx, bb); ctx.lineTo(bx + bw, bb); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.clip();
    ctx.strokeStyle = rgba(dk(floor, 0.85), 0.55); ctx.lineWidth = 1;
    const fl = o.floorTex || (tex === "stone" ? "stone" : "plank");
    const nn = fl === "plank" ? 14 : 9;
    for (let i = 0; i <= nn; i++) { const t = i / nn; ctx.beginPath(); ctx.moveTo(bx + bw * t, bb); ctx.lineTo(-w * 0.2 + w * 1.4 * t, h); ctx.stroke(); }
    for (let t = 0.04; t < 1; t += 0.03 + t * (fl === "plank" ? 0.12 : 0.22)) {
      const y = bb + (h - bb) * t;
      if (fl === "plank") { for (let i = 0; i < nn; i++) if (R() < 0.3) { const xa = lerp(bx + bw * i / nn, -w * 0.2 + w * 1.4 * i / nn, t), xb = lerp(bx + bw * (i + 1) / nn, -w * 0.2 + w * 1.4 * (i + 1) / nn, t); ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke(); } }
      else { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    }
    ctx.restore();
    // 壁の手触り
    const wallTex = (x0, y0, x1, y1) => {
      ctx.strokeStyle = rgba(dk(walls, 0.8), 0.45); ctx.lineWidth = 0.8;
      if (tex === "plank") for (let x = x0; x < x1; x += Math.max(5, (x1 - x0) / 18)) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
      else if (tex === "stone" || tex === "brick") { const rh = Math.max(5, (y1 - y0) / (tex === "brick" ? 16 : 9)); for (let y = y0 + rh, r = 0; y < y1; y += rh, r++) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); for (let x = x0 + (r % 2) * rh; x < x1; x += rh * (tex === "brick" ? 2 : 2.6) * (0.8 + R() * 0.4)) { ctx.beginPath(); ctx.moveTo(x, y - rh); ctx.lineTo(x, y); ctx.stroke(); } } }
      else for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba(dk(walls, 0.6), 0.12); ctx.beginPath(); ctx.ellipse(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), P.u * (1 + R() * 3), P.u * (0.5 + R()), 0, 0, Math.PI * 2); ctx.fill(); }
    };
    wallTex(bx, by, bx + bw, bb);
    // 側の壁の筋（奥へ向かう水平線）
    ctx.strokeStyle = rgba(dk(walls, 0.85), 0.4);
    for (const s of [-1, 1]) {
      const ex = s < 0 ? 0 : w, ix = s < 0 ? bx : bx + bw;
      const n = tex === "plank" ? 7 : 12;
      if (tex !== "plaster") for (let i = 1; i < n; i++) { const t = i / n; ctx.beginPath(); ctx.moveTo(ex, h * t); ctx.lineTo(ix, by + bh * t); ctx.stroke(); }
      if (tex === "plank" || tex === "stone") for (let i = 1; i < 6; i++) { const t = i / 6; const x = lerp(ex, ix, Math.pow(t, 0.6)); const yt = lerp(0, by, Math.pow(t, 0.6)), yb = lerp(h, bb, Math.pow(t, 0.6)); ctx.beginPath(); ctx.moveTo(x, yt); ctx.lineTo(x, yb); ctx.stroke(); }
    }
    // 梁
    if (o.beams) {
      for (let i = 0; i < 4; i++) {
        const t = Math.pow(i / 4, 0.7), y = lerp(0, by, t), x0 = lerp(0, bx, t), x1 = lerp(w, bx + bw, t), th = lerp(h * 0.06, h * 0.02, t);
        const bg = ctx.createLinearGradient(0, y, 0, y + th);
        bg.addColorStop(0, dk(o.beams, 0.5)); bg.addColorStop(1, dk(o.beams, 0.85));
        ctx.fillStyle = bg; ctx.fillRect(x0, y, x1 - x0, th);
      }
    }
    // 床と壁の境の陰
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(bx, bb - 2, bw, 4);
    return { x: bx, y: by, w: bw, h: bh, b: bb };
  }
  // 窓（室内から。外の空と、差し込む光の筋）
  function roomWindow(P, x, y, ww, wh, o) {
    const { ctx } = P;
    o = o || {};
    const sk = SKY[P.phase] || SKY[1];
    const g = ctx.createLinearGradient(0, y, 0, y + wh);
    g.addColorStop(0, sk.top); g.addColorStop(1, sk.hor);
    ctx.fillStyle = "#1a120c"; ctx.fillRect(x - ww * 0.08, y - wh * 0.06, ww * 1.16, wh * 1.12);
    ctx.fillStyle = o.glass || g; ctx.beginPath(); if (o.arch) { ctx.moveTo(x, y + wh); ctx.lineTo(x, y + ww / 2); ctx.arc(x + ww / 2, y + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(x + ww, y + wh); } else ctx.rect(x, y, ww, wh); ctx.fill();
    ctx.fillStyle = "#1a120c"; ctx.fillRect(x + ww / 2 - 1, y, 2, wh); ctx.fillRect(x, y + wh / 2 - 1, ww, 2);
    if (P.phase !== 3 && o.rays !== false) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const rg = ctx.createLinearGradient(x, y, x + ww * 2.2, y + wh * 3);
      rg.addColorStop(0, rgba(sk.sun, 0.18)); rg.addColorStop(1, rgba(sk.sun, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ww, y); ctx.lineTo(x + ww * 3.2, y + wh * 3.4); ctx.lineTo(x + ww * 1.2, y + wh * 3.6); ctx.fill();
      ctx.restore();
    } else if (P.phase === 3) { ctx.fillStyle = "rgba(240,236,214,.8)"; ctx.beginPath(); ctx.arc(x + ww * 0.7, y + wh * 0.25, ww * 0.12, 0, Math.PI * 2); ctx.fill(); }
  }
  // 暖炉（石の枠と炎）
  function hearth(P, x, base, s, o) {
    const { ctx } = P;
    o = o || {};
    const st = o.stone || "#5a5048";
    const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
    g.addColorStop(0, mix(st, "#000", 0.5)); g.addColorStop(0.5, st); g.addColorStop(1, mix(st, "#000", 0.6));
    ctx.fillStyle = g; ctx.fillRect(x - s, base - s * 1.3, s * 2, s * 1.3);
    ctx.fillRect(x - s * 1.15, base - s * 1.4, s * 2.3, s * 0.14);
    ctx.fillStyle = "#0a0604"; ctx.beginPath(); ctx.moveTo(x - s * 0.7, base); ctx.lineTo(x - s * 0.7, base - s * 0.7); ctx.arc(x, base - s * 0.7, s * 0.7, Math.PI, 0); ctx.lineTo(x + s * 0.7, base); ctx.fill();
    ctx.fillStyle = "#3a2214"; ctx.fillRect(x - s * 0.5, base - s * 0.12, s, s * 0.1);
    light(P, x, base - s * 0.3, s * 9, "#ff9440", 1.2, true);
    P.anim.push({ type: "flame", x, y: base - s * 0.08, s: s * 0.9, col: "#ff9440" });
  }
  // 棚と瓶
  function shelf(P, x, y, sw, sh, o) {
    const { ctx, R } = P;
    o = o || {};
    ctx.fillStyle = o.wood || "#2c1c10"; ctx.fillRect(x, y, sw, sh);
    const rows = o.rows || 4;
    for (let r = 0; r < rows; r++) {
      const ry = y + (r + 1) * sh / rows;
      ctx.fillStyle = mix(o.wood || "#2c1c10", "#8a6a48", 0.35); ctx.fillRect(x, ry - sh * 0.02, sw, sh * 0.03);
      for (let bx = x + sw * 0.04; bx < x + sw * 0.94; bx += sw * (0.04 + R() * 0.05)) {
        const bh = sh / rows * (0.4 + R() * 0.45), bw = sw * (0.025 + R() * 0.03);
        const c = (o.colors || ["#7a2a1e", "#2a4a6a", "#4a6a2a", "#8a6a2a", "#5a3a6a"])[Math.floor(R() * 5)];
        ctx.fillStyle = c; ctx.fillRect(bx, ry - sh * 0.02 - bh, bw, bh);
        ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(bx + bw * 0.15, ry - sh * 0.02 - bh * 0.9, bw * 0.2, bh * 0.6);
      }
    }
  }
  // 卓（奥行きのある天板と脚）
  function table(P, x, y, tw, o) {
    const { ctx } = P;
    o = o || {};
    const c = o.color || "#4a2e18";
    ctx.fillStyle = mix(c, "#000", 0.5);
    ctx.fillRect(x - tw * 0.42, y, tw * 0.05, tw * 0.32); ctx.fillRect(x + tw * 0.37, y, tw * 0.05, tw * 0.32);
    const g = ctx.createLinearGradient(0, y - tw * 0.1, 0, y);
    g.addColorStop(0, mix(c, "#c8955a", 0.3)); g.addColorStop(1, c);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - tw * 0.4, y - tw * 0.1); ctx.lineTo(x + tw * 0.4, y - tw * 0.1); ctx.lineTo(x + tw * 0.5, y); ctx.lineTo(x - tw * 0.5, y); ctx.fill();
    ctx.fillStyle = mix(c, "#000", 0.35); ctx.fillRect(x - tw * 0.5, y, tw, tw * 0.04);
  }
  function barrel(P, x, base, s, o) {
    const { ctx } = P;
    const c = (o && o.color) || "#5a3a1e";
    const g = ctx.createLinearGradient(x - s * 0.4, 0, x + s * 0.4, 0);
    g.addColorStop(0, mix(c, "#000", 0.6)); g.addColorStop(0.4, mix(c, "#c8955a", 0.25)); g.addColorStop(1, mix(c, "#000", 0.65));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * 0.34, base); ctx.quadraticCurveTo(x - s * 0.46, base - s * 0.5, x - s * 0.34, base - s); ctx.lineTo(x + s * 0.34, base - s); ctx.quadraticCurveTo(x + s * 0.46, base - s * 0.5, x + s * 0.34, base); ctx.fill();
    ctx.fillStyle = "rgba(20,14,10,.8)"; for (const t of [0.15, 0.5, 0.85]) ctx.fillRect(x - s * 0.43, base - s * t - s * 0.03, s * 0.86, s * 0.05);
    ctx.fillStyle = mix(c, "#2a1a0c", 0.4); ctx.beginPath(); ctx.ellipse(x, base - s, s * 0.34, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 蝋燭
  function candle(P, x, y, s) {
    P.ctx.fillStyle = "#e8dcc0"; P.ctx.fillRect(x - s * 0.12, y, s * 0.24, s);
    light(P, x, y - s * 0.2, s * 7, "#ffc070", 0.7, true);
    P.anim.push({ type: "flame", x, y, s: s * 0.5, col: "#ffc070" });
  }
  // 石の通路（迷宮）：奥へ続くアーチ、石積み、壁の松明、濡れた床
  function corridor(P, o) {
    const { ctx, w, h, R } = P;
    o = o || {};
    const stone = o.stone || "#4a4440", vy = h * (o.vy || 0.46);
    ctx.fillStyle = "#050404"; ctx.fillRect(0, 0, w, h);
    const n = o.depth || 7, k = 0.74;
    // 手前から奥へ、枠を一つずつ小さく
    const box = (i) => { const s = Math.pow(k, i); const bw = w * 1.15 * s, bh = h * 1.2 * s; return { x0: P.cx - bw / 2, x1: P.cx + bw / 2, y0: vy - bh * 0.55, y1: vy + bh * 0.45 }; };
    for (let i = n; i >= 0; i--) {
      const a = box(i), b = box(i + 1), dark = clamp(0.25 + i * 0.12, 0, 0.95);
      const c = mix(stone, "#000000", dark);
      // 床
      let g = ctx.createLinearGradient(0, b.y1, 0, a.y1);
      g.addColorStop(0, mix(c, "#000", 0.2)); g.addColorStop(1, c);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(a.x0, a.y1); ctx.lineTo(b.x0, b.y1); ctx.lineTo(b.x1, b.y1); ctx.lineTo(a.x1, a.y1); ctx.fill();
      // 天井
      ctx.fillStyle = mix(c, "#000", 0.4); ctx.beginPath(); ctx.moveTo(a.x0, a.y0); ctx.lineTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y0); ctx.lineTo(a.x1, a.y0); ctx.fill();
      // 壁
      for (const s of [0, 1]) {
        const ax = s ? a.x1 : a.x0, bx = s ? b.x1 : b.x0;
        g = ctx.createLinearGradient(ax, 0, bx, 0);
        g.addColorStop(0, mix(c, "#000", 0.1)); g.addColorStop(1, mix(c, "#000", 0.35));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ax, a.y0); ctx.lineTo(bx, b.y0); ctx.lineTo(bx, b.y1); ctx.lineTo(ax, a.y1); ctx.fill();
        // 石積み
        ctx.strokeStyle = rgba(mix(c, "#000", 0.6), 0.7); ctx.lineWidth = Math.max(0.6, 1.4 * Math.pow(k, i));
        const rows = 7;
        for (let r = 1; r < rows; r++) { const t = r / rows; ctx.beginPath(); ctx.moveTo(ax, lerp(a.y0, a.y1, t)); ctx.lineTo(bx, lerp(b.y0, b.y1, t)); ctx.stroke(); }
        for (let r = 0; r < rows; r++) for (let q = 0; q < 3; q++) { const tx = (q + (r % 2) * 0.5) / 3; const x = lerp(ax, bx, tx); const t0 = r / rows, t1 = (r + 1) / rows; const ya = lerp(lerp(a.y0, a.y1, t0), lerp(b.y0, b.y1, t0), tx), yb = lerp(lerp(a.y0, a.y1, t1), lerp(b.y0, b.y1, t1), tx); ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x, yb); ctx.stroke(); }
        // ところどころの苔・染み
        if (R() < 0.6) { ctx.fillStyle = rgba(o.moss || "#3a4a2a", 0.25); ctx.beginPath(); ctx.ellipse(lerp(ax, bx, 0.5), lerp(a.y1, b.y1, 0.5) - (a.y1 - a.y0) * 0.1, Math.abs(bx - ax) * 0.4, (a.y1 - a.y0) * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      // アーチの肋（一つおき）
      if (i % 2 === 0 && i > 0 && o.arches !== false) {
        const t = Math.max(2, (a.x1 - a.x0) * 0.035);
        ctx.fillStyle = mix(stone, "#000", dark * 0.9);
        ctx.fillRect(a.x0, a.y0, t, a.y1 - a.y0); ctx.fillRect(a.x1 - t, a.y0, t, a.y1 - a.y0);
        ctx.beginPath(); ctx.moveTo(a.x0, a.y0 + (a.y1 - a.y0) * 0.22); ctx.quadraticCurveTo(P.cx, a.y0 - (a.y1 - a.y0) * 0.05, a.x1, a.y0 + (a.y1 - a.y0) * 0.22); ctx.lineTo(a.x1, a.y0); ctx.lineTo(a.x0, a.y0); ctx.fill();
      }
      // 壁の松明
      if (o.torches !== false && (i === 1 || i === 3 || i === 5)) {
        const s = (a.y1 - a.y0) * 0.06;
        const side = i % 4 === 1 ? 0 : 1;
        const tx = lerp(side ? a.x1 : a.x0, side ? b.x1 : b.x0, 0.5), ty = lerp(a.y0, a.y1, 0.42);
        torch(P, tx, ty, s, { reach: 12, col: o.torchCol, k: 1.1 - i * 0.12 });
      }
    }
    // 奥の闇
    const e = box(n + 1);
    const vg = ctx.createRadialGradient(P.cx, vy, 0, P.cx, vy, (e.x1 - e.x0) * 1.5);
    vg.addColorStop(0, o.endGlow ? rgba(o.endGlow, 0.5) : "rgba(0,0,0,1)"); vg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    if (o.endGlow) light(P, P.cx, vy, (e.x1 - e.x0) * 4, o.endGlow, 0.8, false);
    // 濡れた床の照り返し
    const f0 = box(0);
    for (let i = 0; i < 24; i++) { const t = R(), y = lerp(vy + h * 0.05, f0.y1, Math.pow(t, 0.7)); ctx.fillStyle = rgba("#a0a8b8", 0.04 + R() * 0.05); ctx.beginPath(); ctx.ellipse(P.cx + (R() - 0.5) * (y - vy) * 2.2, y, (y - vy) * 0.3 * (0.4 + R()), (y - vy) * 0.03, 0, 0, Math.PI * 2); ctx.fill(); }
    return { vy, box };
  }
  // 洞窟：ごつごつした岩の輪を奥へ重ねる
  function cavern(P, o) {
    const { ctx, w, h, R } = P;
    o = o || {};
    const rock = o.rock || "#4a3e34", vy = h * (o.vy || 0.48);
    ctx.fillStyle = "#040302"; ctx.fillRect(0, 0, w, h);
    const n = 6;
    const glowC = o.glow;
    if (glowC) { const g = ctx.createRadialGradient(P.cx, vy, 0, P.cx, vy, w * 0.3); g.addColorStop(0, rgba(glowC, 0.7)); g.addColorStop(1, rgba(glowC, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    for (let i = n; i >= 0; i--) {
      const s = Math.pow(0.7, i), rx = w * 0.62 * s, ry = h * 0.62 * s;
      const c = mix(rock, "#000", clamp(0.15 + i * 0.13, 0, 0.92));
      const f = noise(R, 24);
      ctx.beginPath();
      ctx.rect(-10, -10, w + 20, h + 20);
      const N = 48;
      for (let k = N; k >= 0; k--) { const a = (k / N) * Math.PI * 2, r = 1 + (f(k * 0.5) - 0.5) * 0.45; const x = P.cx + Math.cos(a) * rx * r, y = vy + Math.sin(a) * ry * r * (Math.sin(a) > 0 ? 0.75 : 1); k === N ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.closePath();
      const g = ctx.createRadialGradient(P.cx, vy, rx * 0.6, P.cx, vy, rx * 1.6);
      g.addColorStop(0, mix(c, glowC || "#000", glowC ? 0.25 : 0)); g.addColorStop(1, mix(c, "#000", 0.3));
      ctx.fillStyle = g; ctx.fill("evenodd");
    }
    // 床の岩と鍾乳石
    for (let i = 0; i < 14; i++) { const x = R() * w, l = h * (0.05 + R() * 0.16), s = P.u * (1 + R() * 2.5); ctx.fillStyle = mix(rock, "#000", 0.55 + R() * 0.2); ctx.beginPath(); ctx.moveTo(x - s, 0); ctx.lineTo(x, l); ctx.lineTo(x + s, 0); ctx.fill(); ctx.fillStyle = rgba("#c8d8e8", 0.15); ctx.fillRect(x - 0.5, l - 2, 1, 2); }
    for (let i = 0; i < 9; i++) { const x = R() * w, s = P.u * (2 + R() * 5); ctx.fillStyle = mix(rock, "#000", 0.45 + R() * 0.25); ctx.beginPath(); ctx.ellipse(x, h - s * 0.2, s * 1.4, s, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = rgba(mix(rock, "#c8a888", 0.4), 0.35); ctx.beginPath(); ctx.ellipse(x + P.ldir * s * 0.4, h - s * 0.6, s * 0.6, s * 0.3, 0, Math.PI, 0); ctx.fill(); }
    return { vy };
  }
  Object.assign(V, { room, roomWindow, hearth, shelf, table, barrel, candle, corridor, cavern });

  // ---------------------------------------------------------------- 仕上げ
  // 灯りの暈（加算）。昼は弱く、夜は強く
  function emit(P) {
    const { ctx } = P;
    if (!P.lights.length) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const K = P.inside ? 1 : P.lightK;
    for (const L of P.lights) {
      const a = 0.32 * L.k * K;
      if (a < 0.01) continue;
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
      g.addColorStop(0, rgba(L.col, a)); g.addColorStop(0.35, rgba(L.col, a * 0.35)); g.addColorStop(1, rgba(L.col, 0));
      ctx.fillStyle = g; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    // 水と濡れた道に映る灯り（縦の筋）
    const refl = (L, top, bot) => {
      const len = Math.min(bot - top, (bot - top) * 0.7);
      const Rr = rng(L.x + ":" + L.y);
      for (let y = top; y < top + len; y += P.u * (0.35 + Rr() * 0.5)) {
        const t = (y - top) / len, ww = L.r * (0.05 + t * 0.12) * (0.5 + Rr());
        ctx.fillStyle = rgba(L.col, 0.28 * L.k * K * (1 - t));
        ctx.fillRect(L.x - ww / 2 + (Rr() - 0.5) * ww * 0.6, y, ww, Math.max(1, P.u * 0.18));
      }
    };
    if (P.reflectWater) for (const L of P.lights) if (L.y < P.reflectWater.top && L.x > P.reflectWater.x0 && L.x < P.reflectWater.x1 && L.k * K > 0.2) refl(L, P.reflectWater.top + (P.reflectWater.top - L.y) * 0.9, P.reflectWater.bot);
    ctx.restore();
  }
  // 季節の地面（落ち葉・花びら）は動かさずに置き、降るものは毎コマ（weather の層）
  function grain(P) {
    const { ctx, w, h } = P;
    if (!P.mk) return;
    if (!V._grain) {
      const c = P.mk(96, 96);
      if (!c) return;
      const g = c.getContext("2d"), img = g.createImageData(96, 96), Rg = rng("grain");
      for (let i = 0; i < img.data.length; i += 4) { const v = 110 + Rg() * 40; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      g.putImageData(img, 0, 0);
      V._grain = c;
    }
    const pat = ctx.createPattern(V._grain, "repeat");
    if (!pat) return;
    ctx.save(); ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = 0.18; ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  // 季節と天候の静止の部分（積もった雪・落ち葉、霧の帯）
  function seasonGround(P) {
    const { ctx, w, h, R } = P;
    if (P.inside) return;
    if (P.season === "autumn" || (P.season === "spring" && P.key === "w1_oboro")) {
      const cols = P.season === "autumn" ? ["#b83a1c", "#d8782a", "#e0a838"] : ["#f4c4cf", "#ffdce4"];
      for (let i = 0; i < w / 4; i++) { const y = P.hz + Math.pow(R(), 0.6) * (h - P.hz), dd = P.depth(y); ctx.fillStyle = rgba(P.c(cols[i % cols.length], 0.3 * (1 - dd)), 0.8); ctx.beginPath(); ctx.ellipse(R() * w, y, P.u * (0.2 + dd * 0.6), P.u * (0.1 + dd * 0.25), R() * 3, 0, Math.PI * 2); ctx.fill(); }
    }
    if (P.weather === "fog") {
      for (let i = 0; i < 4; i++) fogBand(P, P.hz - P.h * 0.05 + i * P.h * 0.1, P.h * (0.08 + R() * 0.06), (P.night ? 0.28 : 0.45) * (1 - i * 0.12), mix(P.night ? mix(P.fogC, "#1c2230", 0.6) : P.fogC, "#ffffff", 0.1));
      ctx.fillStyle = rgba(P.night ? mix(P.fogC, "#1c2230", 0.6) : P.fogC, 0.18); ctx.fillRect(0, 0, w, h);
    }
  }
  // 絵画風の仕上げ（前半）：色を褪せさせ（彩度を落とす）、ぼかした写しを重ねてにじませ、影を青緑・光をセピアに寄せる
  function wash(P) {
    const { ctx, w, h, cv, dpr, mk } = P;
    if (!cv || !mk) return;
    const tmp = mk(cv.width, cv.height), t = tmp.getContext("2d");
    t.filter = "saturate(0.6) contrast(1.04)"; t.drawImage(cv, 0, 0); t.filter = "none";
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "copy"; ctx.drawImage(tmp, 0, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.38; ctx.filter = `blur(${(1.4 * dpr).toFixed(1)}px)`; ctx.drawImage(tmp, 0, 0);
    ctx.filter = "none"; ctx.globalAlpha = 1; ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(40,74,76,.45)"); g.addColorStop(0.6, "rgba(60,70,60,.25)"); g.addColorStop(1, "rgba(58,40,24,.4)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgba(230,214,184,.42)"; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  // 紙（繊維と斑）。一度だけ作る
  function paperTile(mk) {
    if (V._paper) return V._paper;
    const N = 256, c = mk(N, N);
    if (!c) return null;
    const g = c.getContext("2d"), img = g.createImageData(N, N), Rp = rng("paper"), f = noise(Rp, 16);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4, m = f((x / N) * 16 + Math.sin(y * 0.05) * 2) * 0.5 + f((y / N) * 16 + 7) * 0.5;
      const v = 222 + m * 26 + (Rp() - 0.5) * 22;
      img.data[i] = v; img.data[i + 1] = v - 6; img.data[i + 2] = v - 18; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = "rgba(120,100,70,.18)"; g.lineWidth = 0.6;
    for (let i = 0; i < 160; i++) { const x = Rp() * N, y = Rp() * N, a = Rp() * Math.PI, l = 4 + Rp() * 14; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    return (V._paper = c);
  }
  // 絵画風の仕上げ（後半）：絵の具の溜まり（斑）、かすれた筆の跡、紙の質感、墨色の縁
  function paperFinish(P) {
    const { ctx, w, h, mk } = P;
    if (!mk) return;
    const Rf = rng(P.seed + ":paper");
    ctx.save();
    // 絵の具の溜まり（輪郭の濃い淡い斑）
    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < 14; i++) {
      const x = Rf() * w, y = Rf() * h, r = Math.max(w, h) * (0.06 + Rf() * 0.16);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.06 + Rf() * 0.08;
      g.addColorStop(0, `rgba(150,128,100,${a})`); g.addColorStop(0.6, `rgba(160,140,110,${a * 0.6})`); g.addColorStop(1, "rgba(200,184,160,0)");
      ctx.save(); ctx.translate(x, y); ctx.rotate(Rf() * 3); ctx.scale(1, 0.4 + Rf() * 0.5); ctx.translate(-x, -y);
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
    }
    // かすれた筆の跡（横に流れる細い明暗）
    ctx.globalCompositeOperation = "soft-light";
    ctx.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      const y = Rf() * h, x = Rf() * w, l = Math.min(w, h) * (0.05 + Rf() * 0.12), a = (Rf() - 0.5) * 1.2;
      ctx.strokeStyle = Rf() < 0.5 ? "rgba(255,246,226,.07)" : "rgba(30,26,20,.07)"; ctx.lineWidth = P.u * (0.8 + Rf() * 1.6);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + (Rf() - 0.5) * l * 0.2, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    // 紙の質感
    const tile = paperTile(mk);
    const pat = tile && ctx.createPattern(tile, "repeat");
    if (pat) { ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 0.6; ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
    // 墨色の縁（四隅が沈む）
    ctx.globalCompositeOperation = "multiply";
    const vg = ctx.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.hypot(w, h) * 0.6);
    vg.addColorStop(0, "rgba(255,255,255,0)"); vg.addColorStop(1, "rgba(70,58,44,.75)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  Object.assign(V, { emit, grain, wash, paperFinish });

  // ---------------------------------------------------------------- 毎コマ重ねるもの
  // 炎（松明・暖炉・篝火）：涙の形を三重にし、時間で揺らす
  function drawFlame(ctx, a, t) {
    const f = Math.sin(t * 9 + a.x) * 0.5 + Math.sin(t * 14.3 + a.y) * 0.3 + Math.sin(t * 23 + a.x * 0.3) * 0.2;
    const s = a.s, hgt = s * (1 + f * 0.18), sway = f * s * 0.12;
    const layer = (k, col, al) => {
      ctx.fillStyle = rgba(col, al);
      ctx.beginPath(); ctx.moveTo(a.x - s * 0.32 * k, a.y);
      ctx.quadraticCurveTo(a.x - s * 0.4 * k, a.y - hgt * 0.5 * k, a.x + sway, a.y - hgt * k);
      ctx.quadraticCurveTo(a.x + s * 0.4 * k, a.y - hgt * 0.5 * k, a.x + s * 0.32 * k, a.y);
      ctx.quadraticCurveTo(a.x, a.y + s * 0.12 * k, a.x - s * 0.32 * k, a.y); ctx.fill();
    };
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(a.x, a.y - s * 0.4, 0, a.x, a.y - s * 0.4, s * 2.4);
    g.addColorStop(0, rgba(a.col, 0.35 + f * 0.06)); g.addColorStop(1, rgba(a.col, 0));
    ctx.fillStyle = g; ctx.fillRect(a.x - s * 2.4, a.y - s * 2.8, s * 4.8, s * 4.8);
    layer(1.1, "#c8401a", 0.75); layer(0.8, a.col, 0.85); layer(0.45, "#fff2c0", 0.9);
    ctx.restore();
  }
  // 灯りの揺れ：静止の暈の上に、明るさの揺らぎを足す
  function drawFlicker(ctx, L, t, K) {
    const f = Math.sin(t * 7 + L.x * 0.37) * 0.5 + Math.sin(t * 13 + L.y * 0.21) * 0.5;
    const a = 0.08 * L.k * K * (0.6 + f * 0.4);
    if (a <= 0.004) return;
    const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 0.7);
    g.addColorStop(0, rgba(L.col, a)); g.addColorStop(1, rgba(L.col, 0));
    ctx.fillStyle = g; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
  }
  // 天候と降るもの（画面の座標で描く。seed から決まった粒を、時間で流す）
  function makeWeather(P) {
    const list = [];
    const Rw = rng(P.seed + ":w");
    const N = (k) => Math.round(Math.min(900, (P.w * P.h) / k));
    const storm = P.key === "snow" || P.key === "snowcity" || P.key === "mountain" || P.key === "w2_echo" || P.key === "w2_arena";
    if (P.weather === "rain") list.push({ type: "rain", drops: Array.from({ length: N(1100) }, () => [Rw(), Rw(), 0.6 + Rw() * 0.6]) });
    if (P.weather === "snow") list.push({ type: "snow", storm, flakes: Array.from({ length: N(storm ? 900 : 1600) }, () => [Rw(), Rw(), 0.5 + Rw() * 1.5, Rw() * 6]) });
    if (P.weather === "fog") list.push({ type: "fog", wisps: Array.from({ length: 6 }, () => [Rw(), 0.45 + Rw() * 0.5, 0.25 + Rw() * 0.3, 0.3 + Rw() * 0.7]) });
    const petals = P.season === "spring" && !P.inside ? (P.key === "w1_oboro" ? ["#f8c8d4", "#ffe2ea"] : ["#f8d0da"]) : P.season === "autumn" && !P.inside ? ["#c8481e", "#e0902a", "#b8301a", "#d8a830"] : null;
    if (petals && P.weather !== "rain" && P.weather !== "snow") list.push({ type: "petal", cols: petals, bits: Array.from({ length: Math.round(N(9000) * (P.key === "w1_oboro" ? 2.5 : 1)) }, () => [Rw(), Rw(), 0.6 + Rw(), Rw() * 6]) });
    if (P.ash) list.push({ type: "ash", col: P.ash, bits: Array.from({ length: N(2500) }, () => [Rw(), Rw(), 0.5 + Rw(), Rw() * 6]) });
    if (P.embers) list.push({ type: "ember", col: P.embers.col || "#ffa040", x: P.embers.x, y: P.embers.y, spread: P.embers.spread, bits: Array.from({ length: 40 }, () => [Rw(), Rw(), 0.5 + Rw(), Rw() * 6]) });
    if (P.fireflies) list.push({ type: "firefly", col: P.fireflies, bits: Array.from({ length: 24 }, () => [Rw(), 0.5 + Rw() * 0.45, Rw() * 6, 0.5 + Rw()]) });
    return list;
  }
  function drawWeather(ctx, wl, w, h, t, night) {
    for (const W of wl) {
      if (W.type === "rain") {
        ctx.fillStyle = "rgba(16,22,32,.12)"; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = night ? "rgba(170,185,210,.3)" : "rgba(205,215,232,.42)"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [x0, y0, sp] of W.drops) {
          const l = 10 + sp * 12, y = ((y0 * (h + 40) + t * 900 * sp) % (h + 40)) - 20, x = ((x0 * (w + 60) - t * 220 * sp) % (w + 60) + w + 60) % (w + 60) - 30;
          ctx.moveTo(x, y); ctx.lineTo(x - l * 0.25, y + l);
        }
        ctx.stroke();
        ctx.strokeStyle = night ? "rgba(170,185,210,.22)" : "rgba(215,225,238,.35)";
        for (let i = 0; i < W.drops.length / 12; i++) { const [x0, y0] = W.drops[i]; const ph = (t * 2.2 + y0 * 7) % 1; ctx.beginPath(); ctx.ellipse(x0 * w, h * (0.9 + y0 * 0.09), 2 + ph * 8, 0.6 + ph * 1.6, 0, 0, Math.PI * 2); ctx.globalAlpha = 1 - ph; ctx.stroke(); }
        ctx.globalAlpha = 1;
      } else if (W.type === "snow") {
        if (W.storm) { ctx.fillStyle = night ? "rgba(160,170,190,.1)" : "rgba(232,238,246,.16)"; ctx.fillRect(0, 0, w, h); }
        ctx.fillStyle = night ? "rgba(220,228,240,.65)" : "rgba(255,255,255,.88)";
        for (const [x0, y0, r, ph] of W.flakes) {
          const vy = W.storm ? 160 : 40, vx = W.storm ? 260 : 12;
          const y = ((y0 * (h + 20) + t * vy * (0.6 + r * 0.3)) % (h + 20)) - 10;
          const x = (((x0 * (w + 40) + t * vx * (0.6 + r * 0.3) + Math.sin(t * 1.3 + ph) * 12) % (w + 40)) + w + 40) % (w + 40) - 20;
          if (W.storm) { ctx.save(); ctx.translate(x, y); ctx.rotate(0.35); ctx.fillRect(0, 0, r * 3.5, r * 0.7); ctx.restore(); }
          else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
        }
      } else if (W.type === "fog") {
        for (const [x0, y0, s, a] of W.wisps) {
          const rx = w * s * 1.4, ry = h * s * 0.35;
          const x = ((x0 * (w + rx * 2) + t * 14 * (0.5 + a)) % (w + rx * 2)) - rx, y = h * y0;
          const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
          g.addColorStop(0, `rgba(225,230,236,${0.16 * a})`); g.addColorStop(1, "rgba(225,230,236,0)");
          ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2); ctx.restore();
        }
      } else if (W.type === "petal" || W.type === "ash") {
        for (const [x0, y0, s, ph] of W.bits) {
          const y = ((y0 * (h + 20) + t * 30 * s) % (h + 20)) - 10, x = (((x0 * (w + 40) + t * 24 * s + Math.sin(t * 1.5 + ph) * 18) % (w + 40)) + w + 40) % (w + 40) - 20;
          ctx.fillStyle = W.type === "ash" ? W.col : W.cols[Math.floor(ph) % W.cols.length];
          ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.4 * s + ph); ctx.globalAlpha = W.type === "ash" ? 0.55 : 0.9;
          ctx.beginPath(); ctx.ellipse(0, 0, 2.6 * s, 1.2 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
      } else if (W.type === "ember") {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (const [x0, y0, s, ph] of W.bits) {
          const life = (t * 0.35 * s + y0) % 1;
          const x = W.x + (x0 - 0.5) * W.spread + Math.sin(t * 2 + ph) * 10 * life, y = W.y - life * h * 0.45;
          ctx.fillStyle = rgba(W.col, (1 - life) * 0.9); ctx.fillRect(x, y, 1.6 * s, 1.6 * s);
        }
        ctx.restore();
      } else if (W.type === "firefly") {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (const [x0, y0, ph, s] of W.bits) {
          const x = x0 * w + Math.sin(t * 0.6 * s + ph) * 30, y = h * y0 + Math.cos(t * 0.8 * s + ph * 2) * 14, a = 0.5 + Math.sin(t * 3 * s + ph) * 0.5;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
          g.addColorStop(0, rgba(W.col, a * 0.9)); g.addColorStop(1, rgba(W.col, 0));
          ctx.fillStyle = g; ctx.fillRect(x - 9, y - 9, 18, 18);
        }
        ctx.restore();
      }
    }
  }
  function vignette(ctx, w, h, a) {
    const g = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  Object.assign(V, { drawFlame, drawWeather, vignette });

  // ---------------------------------------------------------------- 1枚を描く
  // 静止の層（空・地形・建物・灯りの暈・季節の地面・霧）を P.ctx に描く
  function paintBase(P, key) {
    const inside = P.inside;
    const fn = V.OUT[key] || V.IN[key];
    if (!inside) paintSky(P);
    fn(P);
    if (!inside) seasonGround(P);
    wash(P);
    emit(P);
    // 濡れた道に映る灯り
    if (P.wetRoad) {
      const { ctx } = P;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const L of P.lights) if (L.y < P.h && L.k * P.lightK > 0.2) { const g = ctx.createLinearGradient(0, P.hz, 0, P.h); g.addColorStop(0, rgba(L.col, 0)); g.addColorStop(0.5, rgba(L.col, 0.12 * L.k)); g.addColorStop(1, rgba(L.col, 0)); ctx.fillStyle = g; ctx.fillRect(L.x - L.r * 0.04, Math.max(P.hz, L.y), L.r * 0.08, P.h - Math.max(P.hz, L.y)); }
      ctx.restore();
    }
    paperFinish(P);
  }
  V.paintBase = paintBase;
  // 背景の画像を読み込んでいるあいだの仮の絵：屋外は空、室内は暗い色だけ（canvas の絵を描かない。T）
  function paintWait(P) {
    if (P.inside) { P.ctx.fillStyle = "#14110e"; P.ctx.fillRect(0, 0, P.w, P.h); }
    else paintSky(P);
  }
  V.paintWait = paintWait;

  // 室内か（施設の絵・迷宮の中）
  const isInside = (key) => !!V.IN[key] && !V.OUT[key] && !V.IN[key].outdoor;
  V.has = (key) => !!(V.IN[key] || V.OUT[key]);

  // ---------------------------------------------------------------- 取っておく・毎コマ重ねる
  const hasDoc = typeof document !== "undefined" && document.createElement;
  const mk = hasDoc ? (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; } : null;
  const CACHE = new Map(); // 静止の層（同じ場所・時間・天候・大きさなら描き直さない）
  const LIVE = new Set();  // 動いている背景
  const calm = () => { try { return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  const ZOOM = 1.14;
  const focusNow = (st) => (st.opt.focus != null ? !!st.opt.focus : st.foes.length > 0 || !!(G.S && G.S.mode === "event"));
  // 敵の並べ方（scene.js・fx.js と同じ）
  function paintFoes(ctx, w, h, foes) {
    const n = foes.length;
    foes.forEach((f, i) => {
      const x = w * (n === 1 ? 0.5 : 0.22 + (0.56 * i) / Math.max(1, n - 1));
      const s = h * (f.boss ? 0.78 : 0.58) * (n > 2 ? 0.85 : 1);
      if (G.paintMonster) G.paintMonster(ctx, x, h * 0.97, s, f);
    });
  }
  // 1コマ：取っておいた絵を（寄りなら拡大して）置き、灯りの揺れ・炎・敵・天候・周辺減光を重ねる
  function compose(st, t) {
    const { cv, w, h, dpr, P } = st;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const z = st.z, k = (z - 1) / (ZOOM - 1);
    ctx.save();
    if (z !== 1) { const ax = w / 2, ay = P.inside ? h * 0.5 : P.hz; ctx.translate(ax, ay); ctx.scale(z, z); ctx.translate(-ax, -ay); }
    if (st.base) ctx.drawImage(st.base, 0, 0, w, h);
    // 灯りの揺れと炎（絵の中の座標）
    ctx.globalCompositeOperation = "lighter";
    const K = P.inside ? 1 : P.lightK;
    for (const L of P.lights) if (L.flick) drawFlicker(ctx, L, t, K);
    ctx.globalCompositeOperation = "source-over";
    for (const a of P.anim) if (a.type === "flame") drawFlame(ctx, a, t); else if (a.draw) a.draw(ctx, t, P);
    ctx.restore();
    // 寄り：暗くする（戦闘は赤みも）
    if (k > 0) {
      ctx.fillStyle = `rgba(6,4,10,${0.34 * k})`; ctx.fillRect(0, 0, w, h);
      if (st.foes.length) { ctx.fillStyle = `rgba(90,0,0,${0.16 * k})`; ctx.fillRect(0, 0, w, h); }
    }
    if (st.foesLayer) ctx.drawImage(st.foesLayer, 0, 0, w, h);
    else if (!st.base && st.foes.length) paintFoes(ctx, w, h, st.foes);
    drawWeather(ctx, st.weather, w, h, t, P.night);
    vignette(ctx, w, h, 0.5 + 0.2 * k);
  }
  // 舞台（v1_stage.js）の裏に回った層の canvas か（.bgLayer に on が無い）。見えるようになれば（on が付けば）また動かす
  const hiddenLayer = (cv) => { const p = cv.parentNode; return !!(p && p.classList && p.classList.contains("bgLayer") && !p.classList.contains("on")); };
  V.hiddenLayer = hiddenLayer;
  let looping = false, lastT = 0;
  // 遅い端末では背景の動きのコマ数を下げる（T）：毎コマの間隔がずっと長い（画面が追いつかない）なら、24 コマ/秒を 12 コマ/秒に。
  // 下げたら 20 秒はそのまま、そのあと間隔が短ければ戻す。速い端末では今まで通り
  const pace = V.pace = { gap: 42, ema: 16, prev: 0, n: 0, since: 0 };
  V.paceStep = (now) => {
    const d = pace.prev ? now - pace.prev : 0;
    pace.prev = now;
    if (!(d > 0 && d < 400)) return pace.gap; // 裏に回っていた・止まっていた間は数えない
    pace.ema = pace.ema * 0.95 + d * 0.05;
    pace.n++;
    if (pace.gap === 42 && pace.n > 90 && pace.ema > 48) { pace.gap = 84; pace.since = now; }
    else if (pace.gap === 84 && now - pace.since > 20000 && pace.ema < 26) { pace.gap = 42; pace.n = 0; }
    return pace.gap;
  };
  function tick(now) {
    if (!LIVE.size) { looping = false; pace.prev = 0; return; }
    requestAnimationFrame(tick);
    const gap = V.paceStep(now);
    if ((typeof document !== "undefined" && document.hidden) || now - lastT < gap) return;
    lastT = now;
    for (const st of LIVE) {
      if (!st.cv.isConnected) { LIVE.delete(st); continue; }
      if (hiddenLayer(st.cv)) continue; // 見えていない層（舞台の切り替えで裏に回った層）は動かさない（T）
      const target = focusNow(st) ? ZOOM : 1;
      const still = calm();
      let moved = false;
      if (st.z !== target) { st.z = still || Math.abs(target - st.z) < 0.004 ? target : st.z + (target - st.z) * 0.18; moved = true; }
      if (still && !moved) continue;
      if (!st.moving && !moved) continue;
      compose(st, still ? 0 : now / 1000);
    }
  }
  function startLoop() {
    if (looping || typeof requestAnimationFrame !== "function") return;
    looping = true; requestAnimationFrame(tick);
  }

  const old = G.paintScene;
  G.paintSceneV1 = old;
  G.sceneNamesV2 = () => ({ out: Object.keys(V.OUT), inside: Object.keys(V.IN) });
  G.paintScene = (canvas, opt) => {
    opt = opt || {};
    // 絵の決まっていない施設は、施設の名前の室内があればそれを使う（学院など）
    const key = opt.key || (G.S && G.S.mode === "fac" && V.IN[G.S.fac] ? G.S.fac : opt.key);
    if (!V.has(key)) { if (old) return old(canvas, opt); return; }
    const dpr = Math.min(2, (typeof devicePixelRatio === "number" && devicePixelRatio) || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(200, Math.round(rect.width)), h = Math.max(120, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    const inside = isInside(key);
    const fn = V.OUT[key] || V.IN[key];
    if (fn.phase != null) opt = Object.assign({}, opt, { phase: fn.phase });
    const foes = opt.foes || [];
    const at = !inside && !V.RED_KEYS[key] ? (opt.sky || (G.skyAt && G.S && G.S.loc ? G.skyAt(G.S.loc) : null)) : null;
    // 持ち主が作った背景の画像（A11。scene_v3_photo.js）があり、読み終わっていれば、静止の層をその画像＋色味にする（無い・読めない・読み込み中は canvas の絵）
    const photo = V.photo ? V.photo(key, opt, canvas) : null;
    const sig = [key, opt.phase | 0, opt.seed || key, at ? at.season + at.weather : "", w, h, dpr, opt.redMoon ? 1 : 0, photo ? photo.id : ""].join("|");
    let st = canvas.__sv2;
    if (!st) { st = canvas.__sv2 = { cv: canvas, z: 1 }; }
    let hit = mk && CACHE.get(sig);
    let P;
    if (hit) { P = hit.P; CACHE.delete(sig); CACHE.set(sig, hit); }
    else {
      const base = mk ? mk(w * dpr, h * dpr) : null;
      const bctx = base ? base.getContext("2d") : canvas.getContext("2d");
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      P = makeP(bctx, w, h, Object.assign({}, opt, { sky: at || opt.sky }), key, inside);
      P.cv = base; P.dpr = dpr; P.mk = mk;
      // 背景の画像（A11）を読み込み中なら、canvas の絵（重い）は描かずに空の色だけを敷いて待つ。読み終われば scene_v3_photo.js が描き直す。
      // 読めなかったときは、ふつうに canvas の絵を描く（この仮の絵は取っておかない）（T）
      const pending = !photo && V.photoPending && V.photoPending(key, opt);
      if (photo) V.paintPhoto(P, photo); else if (pending) paintWait(P); else paintBase(P, key);
      P.ctx = null; // 取っておく絵は描き終わったら道具箱から外す
      hit = { base, P };
      if (base && !pending) { CACHE.set(sig, hit); while (CACHE.size > 4) CACHE.delete(CACHE.keys().next().value); }
    }
    Object.assign(st, { w, h, dpr, P, base: hit.base, opt, foes, weather: makeWeather(P), moving: !calm() && (P.anim.length > 0 || P.lights.some((L) => L.flick) || !!P.weather || P.season === "spring" || P.season === "autumn" || !!P.ash || !!P.embers || !!P.fireflies) });
    // 敵は別の層に一度だけ描く
    st.foesLayer = null;
    if (foes.length && mk) {
      const fl = mk(w * dpr, h * dpr), fctx = fl.getContext("2d");
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintFoes(fctx, w, h, foes);
      st.foesLayer = fl;
    }
    const target = focusNow(st) ? ZOOM : 1;
    if (opt.instant || calm() || !mk || st.lastKey !== key) st.z = target;
    st.lastKey = key;
    compose(st, typeof performance !== "undefined" && performance.now ? performance.now() / 1000 : 0);
    if (mk) { LIVE.add(st); startLoop(); }
  };
  V.paint = G.paintScene; // この絵の入口（画像が読み終わったとき、scene_v3_photo.js が描き直すのに使う）
  V.RED_KEYS = RED;
  V.makeWeather = makeWeather;
})(globalThis.G = globalThis.G || {});
