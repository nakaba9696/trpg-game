// 背景の絵（A11 雪と湖）：帝都ノルディア・北の港アイゼルヴァン・凍てつく街道（雪）と、森と湖の都リグノア・水の都トゥリエル（湖）に、
// 動く層を重ねて景色を厚くする。降る雪・雪のきらめき・窓の灯と水に映る灯・さざ波のきらめき・朝霧・煙・橋の灯・北の空の光の帯。
// 持ち主の背景の画像（scene_v3_photo.js）があるときは、画像の中の位置（横 0〜1・縦 0〜1）に合わせて重ねる（V.paintPhoto を包む）。
// 画像が無いとき（アイゼルヴァンなど）は canvas の絵（V.OUT[絵の名前]）を包んで、同じ層を重ねる。
// 時間帯（朝・昼・夕・夜）と天候（雨・霧・雪）で、出す層と色を変える。動きは P.anim（scene_v2.js が毎コマ重ねる）で、数を絞って軽くする。
// 乱数は場所の名前からの決まった種（V.rng。G.rand は使わない）。レーン A（絵）
(function (G) {
  const V = G.SV2;
  if (!V || !V.OUT) return;
  const { rgba, rng } = V;
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- 画像の中の位置 → 絵の上の位置（paintPhoto と同じ切り取り方）
  const photoMap = (P, ph) => {
    const img = ph.img;
    const [, , iw, ih] = ph.rect || [0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height];
    if (!iw || !ih) return null;
    const k = Math.max(P.w / iw, P.h / ih), sw = P.w / k, sh = P.h / k, x0 = (iw - sw) / 2, y0 = (ih - sh) * 0.55;
    return { x: (nx) => (nx * iw - x0) * k, y: (ny) => (ny * ih - y0) * k, s: iw * k };
  };
  // canvas の絵では、絵の幅・高さをそのまま 0〜1 にする
  const flatMap = (P) => ({ x: (nx) => nx * P.w, y: (ny) => ny * P.h, s: P.w });

  // 点が多角形の中か
  const inside = (pts, x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  // 場所（矩形 [x0, y0, x1, y1] か多角形）の中に n 個、決まった種で点を撒く。skip(x, y) が真の点は除く
  const scatter = (R, area, n, skip) => {
    const out = [];
    const poly = Array.isArray(area[0]);
    const xs = poly ? area.map((p) => p[0]) : [area[0], area[2]], ys = poly ? area.map((p) => p[1]) : [area[1], area[3]];
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
    for (let k = 0; out.length < n && k < n * 30; k++) {
      const x = bx0 + R() * (bx1 - bx0), y = by0 + R() * (by1 - by0);
      if (poly && !inside(area, x, y)) continue;
      if (skip && skip(x, y)) continue;
      out.push([x, y, R() * TAU, 0.6 + R() * 0.9]);
    }
    return out;
  };

  // 今の空の明るさ・色（朝・昼・夕・夜）
  const tone = (P) => P.night ? { glint: "#cfdcff", k: 0.55 } : P.dusk ? { glint: "#ffc890", k: 0.9 } : P.dawn ? { glint: "#ffe2c0", k: 0.85 } : { glint: "#ffffff", k: 1 };
  const lampsOn = (P) => P.night || P.dusk || (P.dawn && P.overcast) || (P.overcast && P.weather === "snow");

  // ---------------------------------------------------------------- 層
  // 水面のきらめき：細い十字が一つずつ瞬く（雨の日は出さない。霧の日は少なく弱く）
  function glints(P, M, area, n, o) {
    o = o || {};
    if (P.weather === "rain") return;
    const T = tone(P);
    const fog = P.weather === "fog" || P.weather === "snow";
    const pts = scatter(rng(P.seed + ":a11g"), area, Math.round(n * (fog ? 0.35 : P.night ? 0.5 : 1)), o.skip).map(([x, y, ph, s]) => [M.x(x), M.y(y), ph, s]);
    if (!pts.length) return;
    const size = Math.max(1.2, M.s * 0.0035) * (o.size || 1), a0 = (fog ? 0.45 : 0.9) * T.k;
    P.anim.push({ draw: (c, t) => {
      c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = rgba(T.glint, 1);
      for (const [x, y, ph, s] of pts) {
        const v = Math.sin(t * 1.7 * s + ph);
        if (v < 0.55) continue;
        const a = ((v - 0.55) / 0.45) ** 2 * a0, r = size * s * (0.6 + a);
        c.globalAlpha = a;
        c.fillRect(x - r * 2.2, y - 0.5, r * 4.4, 1); c.fillRect(x - 0.5, y - r * 1.1, 1, r * 2.2);
        c.globalAlpha = a * 0.5; c.fillRect(x - r * 0.6, y - r * 0.6, r * 1.2, r * 1.2);
      }
      c.restore();
    } });
  }

  // さざ波：水平の細い光の筋が、ゆっくり横に流れて明滅する
  function ripples(P, M, y0, y1, x0, x1, n) {
    if (P.weather === "rain") return;
    const R = rng(P.seed + ":a11r"), T = tone(P);
    const lines = Array.from({ length: n }, () => [x0 + R() * (x1 - x0), y0 + (y1 - y0) * R() ** 0.7, 0.03 + R() * 0.07, R() * TAU]);
    const X0 = M.x(x0), X1 = M.x(x1);
    P.anim.push({ draw: (c, t) => {
      c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = rgba(T.glint, 1); c.lineWidth = 1;
      for (const [x, y, len, ph] of lines) {
        const a = (0.5 + 0.5 * Math.sin(t * 0.9 + ph)) * 0.16 * T.k;
        const yy = M.y(y), d = (yy - M.y(y0)) / Math.max(1, M.y(y1) - M.y(y0)); // 手前ほど長い
        const L = len * M.s * (0.5 + d), xx = M.x(x) + Math.sin(t * 0.25 + ph) * M.s * 0.01;
        if (xx + L < X0 || xx - L > X1) continue;
        c.globalAlpha = a; c.beginPath(); c.moveTo(xx - L / 2, yy); c.lineTo(xx + L / 2, yy); c.stroke();
      }
      c.restore();
    } });
  }

  // 窓の灯（夕方・夜・雪の曇り日）。静止の層に描き、水に映る灯は揺らす（refl：水面の線の縦位置。窓の映りはそこで折り返す）
  function windows(P, M, list, o) {
    o = o || {};
    if (!lampsOn(P)) return;
    const ctx = P.ctx, col = o.col || "#ffb24a";
    const a = P.night ? 1 : 0.65;
    const ww = M.s * (o.w || 0.008), wh = M.s * (o.h || 0.014);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [nx, ny, k] of list) {
      const x = M.x(nx), y = M.y(ny), s = k || 1, R = wh * 2.6 * s;
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, rgba(col, 0.42 * a)); g.addColorStop(0.35, rgba(col, 0.16 * a)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
      // 窓の中は明るく、縁はにじませる（画像の窓枠が透けて見えるように、上から足す）
      const gi = ctx.createRadialGradient(x, y, 0, x, y, Math.max(ww, wh) * 0.6 * s);
      gi.addColorStop(0, rgba("#ffe0a0", 0.75 * a)); gi.addColorStop(1, rgba("#ffb850", 0.25 * a));
      ctx.fillStyle = gi; ctx.fillRect(x - (ww * s) / 2, y - (wh * s) / 2, ww * s, wh * s);
    }
    ctx.restore();
    if (o.refl == null || P.weather === "rain") return;
    const ry = o.refl, pts = list.map(([nx, ny, k]) => [M.x(nx), M.y(ry + (ry - ny) * (o.squash || 1)), k || 1, nx * 37]);
    P.anim.push({ draw: (c, t) => {
      c.save(); c.globalCompositeOperation = "lighter";
      for (const [x, y, s, ph] of pts) {
        // 水に映る灯：細い横の筋が縦に並び、揺れながら下へ薄れる
        for (let i = 0; i < 7; i++) {
          const yy = y - wh * s * 0.5 + i * wh * 0.32 * s, dx = Math.sin(t * 1.8 + ph + i * 1.1) * ww * 0.5 * s;
          const L = ww * s * (0.5 + 0.35 * Math.sin(t * 2.3 + ph * 3 + i * 2.1) + 0.25);
          c.fillStyle = rgba(col, (0.3 - i * 0.035) * a);
          c.fillRect(x - L / 2 + dx, yy, L, Math.max(1, wh * 0.12 * s));
        }
      }
      c.restore();
    } });
  }

  // 霧（帯）：大きなにじみがゆっくり横に流れる。朝と霧の日に濃い
  function mist(P, M, ny, nh, o) {
    o = o || {};
    const k = P.weather === "fog" ? 0.34 : P.dawn ? 0.3 : P.night ? 0.1 : P.dusk ? 0.12 : o.day || 0.08;
    if (P.weather === "rain") return;
    const R = rng(P.seed + ":a11m");
    const col = P.night ? "#9aa8c0" : P.dusk ? "#f0c8b0" : P.dawn ? "#fbe8dc" : "#eef2f6";
    const blobs = Array.from({ length: 5 }, () => [R(), ny + (R() - 0.5) * nh, 0.18 + R() * 0.2, R() * TAU]);
    P.anim.push({ draw: (c, t) => {
      c.save();
      for (const [x0, y0, s, ph] of blobs) {
        const rx = M.s * s, ry = M.s * nh * 0.9;
        const x = M.x(((x0 + t * 0.006 * (0.6 + s)) % 1.4) - 0.2), y = M.y(y0) + Math.sin(t * 0.3 + ph) * ry * 0.15;
        const g = c.createRadialGradient(x, y, 0, x, y, rx);
        g.addColorStop(0, rgba(col, k)); g.addColorStop(1, rgba(col, 0));
        c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = g; c.fillRect(x - rx, y - rx, rx * 2, rx * 2); c.restore();
      }
      c.restore();
    } });
  }

  // 静かに降る雪（天候が雪でない日も、雪の町には少しだけ。雪の日は scene_v2.js の雪が降るので足さない）
  function flurry(P, n) {
    if (P.weather === "snow" || P.weather === "rain") return;
    const R = rng(P.seed + ":a11f");
    const bits = Array.from({ length: n }, () => [R(), R(), 0.5 + R() * 1.1, R() * TAU]);
    const col = P.night ? "rgba(214,224,242,.7)" : "rgba(255,255,255,.85)";
    P.anim.push({ draw: (c, t) => {
      const { w, h } = P;
      c.save(); c.fillStyle = col;
      for (const [x0, y0, r, ph] of bits) {
        const y = ((y0 * (h + 20) + t * 22 * (0.5 + r * 0.4)) % (h + 20)) - 10;
        const x = (((x0 * (w + 40) + t * 6 + Math.sin(t * 0.8 + ph) * 10) % (w + 40)) + w + 40) % (w + 40) - 20;
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }
      c.restore();
    } });
  }

  // 雪のきらめき：日の当たる雪面に、細かい光の粒（朝・昼・夕。夜は月の光で少し）
  function snowSparkle(P, M, area, n, skip) {
    if (P.weather === "rain" || P.weather === "fog") return;
    const T = tone(P);
    const k = P.weather === "snow" ? 0.4 : 1;
    const pts = scatter(rng(P.seed + ":a11s"), area, Math.round(n * (P.night ? 0.4 : 1) * k), skip).map(([x, y, ph, s]) => [M.x(x), M.y(y), ph, s]);
    const r0 = Math.max(0.8, M.s * 0.0016);
    const cols = P.night ? ["#d8e4ff"] : P.dusk ? ["#ffd8b0", "#ffc0d0"] : ["#ffffff", "#e8f4ff", "#fff4dc"];
    P.anim.push({ draw: (c, t) => {
      c.save(); c.globalCompositeOperation = "lighter";
      pts.forEach(([x, y, ph, s], i) => {
        const v = Math.sin(t * 2.6 * s + ph);
        if (v < 0.7) return;
        c.globalAlpha = ((v - 0.7) / 0.3) * 0.9 * T.k;
        c.fillStyle = cols[i % cols.length];
        const r = r0 * s;
        c.fillRect(x - r * 1.8, y - 0.4, r * 3.6, 0.8); c.fillRect(x - 0.4, y - r * 1.8, 0.8, r * 3.6);
      });
      c.restore();
    } });
  }

  // 煙突の煙：まっすぐ上がる薄い柱（帝都の名物）
  function smokes(P, M, list) {
    if (P.weather === "rain") return;
    const col = P.night ? "#4a5060" : "#c8ccd4";
    P.anim.push({ draw: (c, t) => {
      c.save();
      for (const [nx, ny, nh] of list) {
        const x = M.x(nx), y = M.y(ny), H = M.s * nh;
        for (let i = 0; i < 6; i++) {
          const life = (t * 0.05 + i / 6 + nx) % 1, r = M.s * (0.004 + life * 0.012);
          const g = c.createRadialGradient(x, y - life * H, 0, x, y - life * H, r);
          g.addColorStop(0, rgba(col, 0.28 * (1 - life))); g.addColorStop(1, rgba(col, 0));
          c.fillStyle = g; c.fillRect(x - r + Math.sin(t * 0.4 + i) * r * 0.2, y - life * H - r, r * 2, r * 2);
        }
      }
      c.restore();
    } });
  }

  // 橋や桟橋の灯（夕方・夜）：小さな火と暈が揺れる
  function lanterns(P, M, list, col) {
    if (!(P.night || P.dusk)) return;
    col = col || "#ffb050";
    const pts = list.map(([nx, ny]) => [M.x(nx), M.y(ny), nx * 53]);
    const r0 = M.s * 0.012;
    P.anim.push({ draw: (c, t) => {
      c.save(); c.globalCompositeOperation = "lighter";
      for (const [x, y, ph] of pts) {
        const f = 0.85 + Math.sin(t * 7 + ph) * 0.08 + Math.sin(t * 13 + ph * 2) * 0.05, r = r0 * f * (P.night ? 1.4 : 1);
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba("#fff0c8", 0.9)); g.addColorStop(0.25, rgba(col, 0.5)); g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      c.restore();
    } });
  }

  // 北の空の光の帯（晴れた夜だけ）：緑と青緑のカーテンがゆっくり波打ち、細い光の筋が立つ
  function aurora(P, M, ny0, ny1) {
    if (!P.night || P.overcast || P.weather === "fog" || P.red) return;
    const R = rng(P.seed + ":a11au");
    const bands = Array.from({ length: 3 }, (_, i) => [0.3 + R() * 0.3, ny0 + (ny1 - ny0) * (0.25 + i * 0.28), R() * TAU, i === 1 ? "#5ac8d0" : "#5ae0a0", 0.5 + R() * 0.5]);
    const rays = Array.from({ length: 40 }, () => [R(), R() * TAU, 0.4 + R() * 0.6]);
    P.anim.push({ draw: (c, t) => {
      const W = P.w, H = M.s * 0.1, N = 48;
      c.save(); c.globalCompositeOperation = "lighter";
      for (const [amp, ny, ph, col, k] of bands) {
        const y0 = M.y(ny);
        const yAt = (u) => y0 + Math.sin(u * 4.2 + t * 0.1 + ph) * H * amp + Math.sin(u * 11 - t * 0.17 + ph) * H * 0.15;
        // 帯：下の縁が明るく、上へ薄れる
        c.beginPath();
        for (let i = 0; i <= N; i++) { const u = i / N; c.lineTo(u * W, yAt(u)); }
        for (let i = N; i >= 0; i--) { const u = i / N; c.lineTo(u * W, yAt(u) - H * (1.2 + 0.5 * Math.sin(u * 7 + t * 0.2 + ph))); }
        c.closePath();
        const g = c.createLinearGradient(0, y0 - H * 1.8, 0, y0 + H * 0.4);
        const a = 0.13 * k * (0.75 + 0.25 * Math.sin(t * 0.3 + ph));
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.7, rgba(col, a)); g.addColorStop(0.85, rgba(col, a * 1.4)); g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g; c.fill();
        // 光の筋
        c.lineWidth = Math.max(1, W / 400);
        for (const [u, rp, rk] of rays) {
          const v = 0.5 + 0.5 * Math.sin(t * 0.6 * rk + rp);
          if (v < 0.4) continue;
          const x = u * W, yb = yAt(u), L = H * (0.8 + rk);
          const gr = c.createLinearGradient(0, yb - L, 0, yb);
          gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, 0.1 * k * v * Math.sin(Math.PI * u)));
          c.strokeStyle = gr; c.beginPath(); c.moveTo(x, yb); c.lineTo(x, yb - L); c.stroke();
        }
      }
      c.restore();
    } });
  }

  // 地吹雪：地面すれすれを白い筋が流れる（凍てつく街道）
  function drift(P, M, ny0, ny1, n) {
    if (P.weather === "rain") return;
    const R = rng(P.seed + ":a11d");
    const bits = Array.from({ length: n }, () => [R(), ny0 + (ny1 - ny0) * R(), 0.04 + R() * 0.08, 0.6 + R()]);
    const col = P.night ? "#b8c4dc" : "#ffffff";
    P.anim.push({ draw: (c, t) => {
      c.save();
      for (const [x0, y, len, sp] of bits) {
        const L = M.s * len, x = ((x0 + t * 0.05 * sp) % 1.3) * P.w * 1.2 - L, yy = M.y(y) + Math.sin(t * 1.5 + x0 * 9) * M.s * 0.003;
        const g = c.createLinearGradient(x, 0, x + L, 0);
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.6, rgba(col, 0.22 * sp)); g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g; c.fillRect(x, yy, L, Math.max(1, M.s * 0.0025));
      }
      c.restore();
    } });
  }

  // 霜の縁：四隅に白い霜がうっすら（凍える港・街道）
  function frostEdge(P, a) {
    const { ctx, w, h } = P, r = Math.max(w, h) * 0.32;
    ctx.save();
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(P.night ? "#9fb0cc" : "#f4f8ff", a)); g.addColorStop(1, rgba("#ffffff", 0));
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 画像ごとの位置（docs/art/scenes.md の画像。横 0〜1・縦 0〜1）
  // 水の都トゥリエル：大樹の下の高床の家、手前一面の鏡のような湖、左の小舟
  const TULIER_WATER = [0, 0.655, 1, 1];
  const TULIER_WIN = [[0.52, 0.52], [0.565, 0.515, 1.3], [0.615, 0.52], [0.765, 0.52], [0.895, 0.52]];
  // 森と湖の都リグノア：左の砦、谷を流れて手前へ広がる湖、湖を渡る長い跳ね橋
  const LIGNOA_WATER = [[0.57, 0.26], [0.66, 0.26], [0.7, 0.32], [0.76, 0.4], [0.98, 0.42], [0.98, 0.55], [0.86, 0.56], [0.83, 0.62], [0.8, 0.7], [0.78, 0.78], [0.7, 0.88], [0.66, 1], [0.46, 1], [0.5, 0.8], [0.48, 0.68], [0.47, 0.6], [0.46, 0.53], [0.52, 0.49], [0.62, 0.47], [0.66, 0.43], [0.66, 0.38], [0.62, 0.33]];
  const onLignoaBridge = (x, y) => {
    const top = 0.52 + (x - 0.42) * 0.4; // 長い橋
    if (y > top - 0.015 && y < top + 0.08 && x < 0.87) return true;
    const t2 = 0.79 + (x - 0.49) * 0.87; // 手前の細い橋
    return x > 0.48 && x < 0.66 && y > t2 - 0.02 && y < t2 + 0.04;
  };
  const LIGNOA_WIN = [[0.325, 0.463], [0.339, 0.461], [0.343, 0.484], [0.327, 0.494], [0.338, 0.536, 1.6], [0.206, 0.466], [0.216, 0.468], [0.228, 0.468], [0.378, 0.463], [0.388, 0.463], [0.412, 0.466], [0.42, 0.466], [0.204, 0.566], [0.216, 0.567], [0.238, 0.567], [0.248, 0.566], [0.16, 0.507], [0.172, 0.507], [0.342, 0.381], [0.35, 0.381]];
  const LIGNOA_LAMPS = [0.46, 0.55, 0.64, 0.73, 0.82].map((x) => [x, 0.505 + (x - 0.42) * 0.4]);
  // 帝都ノルディア：黒い石の塔と城壁、雪の積もった屋根と中庭
  const GARMUND_WIN = [[0.452, 0.263], [0.491, 0.263], [0.444, 0.384], [0.465, 0.386], [0.493, 0.384], [0.511, 0.384], [0.434, 0.547], [0.464, 0.554], [0.493, 0.554], [0.515, 0.54], [0.331, 0.558], [0.367, 0.551], [0.403, 0.551], [0.56, 0.528], [0.627, 0.526], [0.662, 0.526], [0.238, 0.528], [0.264, 0.509], [0.278, 0.497], [0.166, 0.575], [0.193, 0.558], [0.128, 0.608], [0.783, 0.433], [0.812, 0.44], [0.771, 0.625], [0.8, 0.646], [0.864, 0.732]];
  const GARMUND_SNOW = [[0.3, 0.74, 0.66, 1], [0.55, 0.69, 0.84, 0.86], [0.17, 0.6, 0.37, 0.69], [0.73, 0.47, 0.98, 0.6], [0.02, 0.4, 0.3, 0.5]];
  const GARMUND_SMOKE = [[0.27, 0.355, 0.12], [0.69, 0.35, 0.1], [0.865, 0.385, 0.11], [0.12, 0.37, 0.09]];

  const PHOTO = {
    w4_tulier(P, M) {
      ripples(P, M, 0.66, 1, 0, 1, 26);
      glints(P, M, TULIER_WATER, 60, { skip: (x, y) => x > 0.12 && x < 0.25 && y > 0.7 && y < 0.8 }); // 小舟の上は除く
      windows(P, M, TULIER_WIN, { w: 0.016, h: 0.03, refl: 0.645, squash: 0.95 });
      mist(P, M, 0.63, 0.05, { day: 0.06 });
    },
    w3_lignoa(P, M) {
      glints(P, M, LIGNOA_WATER, 70, { skip: onLignoaBridge });
      windows(P, M, LIGNOA_WIN, { w: 0.006, h: 0.012 });
      lanterns(P, M, LIGNOA_LAMPS);
      mist(P, M, 0.3, 0.06, { day: 0.05 });
      mist(P, M, 0.72, 0.08, { day: 0 });
    },
    garmund(P, M) {
      windows(P, M, GARMUND_WIN, { w: 0.007, h: 0.026 });
      smokes(P, M, GARMUND_SMOKE);
      snowSparkle(P, M, GARMUND_SNOW, 90);
      flurry(P, 70);
    },
    frost(P, M) {
      snowSparkle(P, M, [0, 0.62, 1, 1], 110, (x, y) => x > 0.2 && x < 0.55 && y > 0.75); // 手前の小川は除く
      drift(P, M, 0.6, 0.95, 14);
      flurry(P, 60);
      aurora(P, M, 0.05, 0.25);
    },
  };

  const paintPhoto0 = V.paintPhoto;
  if (paintPhoto0) {
    V.paintPhoto = (P, ph) => {
      const r = paintPhoto0(P, ph);
      const add = ph && PHOTO[ph.id];
      const M = add && photoMap(P, ph);
      if (M) add(P, M);
      return r;
    };
  }

  // ---------------------------------------------------------------- 画像の無いときの canvas の絵
  const wrap = (key, extra) => {
    const f0 = V.OUT[key];
    if (!f0) return;
    const f = (P) => { const r = f0(P); if (P.key === key) extra(P, flatMap(P)); return r; };
    Object.keys(f0).forEach((k) => { f[k] = f0[k]; });
    V.OUT[key] = f;
  };
  const waterTop = (P) => (P.waterTop || P.hz) / P.h;

  wrap("w4_water", (P, M) => {
    const t = waterTop(P);
    ripples(P, M, t + 0.02, 1, 0, 1, 22);
    glints(P, M, [0, t + 0.03, 1, 1], 50);
    mist(P, M, t + 0.02, 0.04);
  });
  wrap("w3_lake", (P, M) => {
    const t = waterTop(P);
    ripples(P, M, t + 0.02, 0.88, 0.15, 0.85, 18);
    glints(P, M, [0.12, t + 0.03, 0.85, 0.88], 50);
    mist(P, M, t + 0.02, 0.05);
  });
  wrap("snowcity", (P, M) => {
    snowSparkle(P, M, [0, P.hz / P.h + 0.04, 1, 1], 70);
    flurry(P, 60);
  });
  wrap("snow", (P, M) => {
    snowSparkle(P, M, [0, P.hz / P.h + 0.03, 1, 1], 90);
    drift(P, M, P.hz / P.h + 0.05, 0.95, 12);
    flurry(P, 50);
    aurora(P, M, 0.06, 0.3);
  });
  // 北の港アイゼルヴァン（画像がまだ無いので canvas で描き直す）：雪の崖、氷の欠片の浮く鉛色の海、坂に段々の雪の屋根、
  // 坂の上の朝まで灯を落とさない窓、氷でふくらんだ桟橋の杭と舫った漁舟。降る雪・海のきらめき・霜の縁・晴れた夜の光の帯
  const icehaven = (P) => {
    const { ctx, u, w, h, hz, R } = P;
    const snowy = { snow: true };
    V.mountains(P, { base: hz - u * 1, height: u * 10, d: 0.72, color: "#3e4a5c", snow: 0.3, round: true, scale: 2 });
    V.mountains(P, { base: hz + u * 0.5, height: u * 6, d: 0.5, color: "#34404e", snow: 0.4, round: true });
    V.water(P, { top: hz, color: "#22405a", reflect: 0.5 });
    P.reflectWater.x0 = w * 0.3;
    // 氷の欠片：角ばった平たい板。上の面は白く、海に沈む縁は青い影
    for (let i = 0; i < 16; i++) {
      const d = R(), y = hz + (h - hz) * (0.05 + d * d * 0.85), s = u * (0.8 + d * 4.5) * (0.6 + R() * 0.8), x = w * (0.34 + R() * 0.68);
      const n = 6 + Math.floor(R() * 3), pts = [];
      for (let k = 0; k < n; k++) { const a = (k / n) * TAU + R() * 0.5, r = s * (0.6 + R() * 0.5); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.22]); }
      const poly = (dy) => { ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py + dy) : ctx.moveTo(px, py + dy))); ctx.closePath(); ctx.fill(); };
      ctx.fillStyle = P.dark("#5a86a8", 1 - d, 0.25); poly(s * 0.09);
      ctx.fillStyle = P.lit("#f2f7fc", 1 - d, 0.35); poly(0);
    }
    // 坂の町：三段の家並み（雪の屋根）。上ほど小さく霞む
    const rows = [[hz - u * 9, 3.6, 0.5, w * 0.24], [hz - u * 4.5, 4.6, 0.38, w * 0.3], [hz + u * 0.5, 6, 0.24, w * 0.36]];
    ctx.fillStyle = P.c("#d8e0ea", 0.45); ctx.beginPath(); ctx.moveTo(-u, hz - u * 10); ctx.lineTo(w * 0.22, hz - u * 8); ctx.lineTo(w * 0.4, hz + u * 2); ctx.lineTo(-u, hz + u * 2); ctx.fill();
    for (const [base, size, d, to] of rows) V.houseRow(P, { base, size, d, to, walls: ["#8a8478", "#a49a8a", "#6e6a64"], roofs: ["#3a3c44", "#4a3a34"], roofType: ["gable"], chimney: 0.6, side: 0.06, house: snowy });
    // 坂の上の家：窓の灯は朝まで落とさない
    const tx = w * 0.06, ty = hz - u * 13;
    V.house(P, tx - u * 2.4, ty, u * 4.8, u * 4, { wall: "#8a8478", roof: "#3a3c44", roofType: "gable", d: 0.5, snow: true, lit: true, windows: 1 });
    V.light(P, tx, ty - u * 2, u * 5, "#ffc060", P.night || P.dusk ? 1 : 0.5, true);
    // 桟橋：氷でふくらんだ杭、雪の板、舫った漁舟
    const py = hz + (h - hz) * 0.46, px0 = w * 0.28, px1 = w * 0.8;
    for (let i = 0; i <= 10; i++) {
      const x = px0 + (px1 - px0) * (i / 10);
      ctx.fillStyle = P.dark("#3a2e26", 0.1, 0.4); ctx.fillRect(x - u * 0.35, py - u * 0.8, u * 0.7, u * 4.2);
      ctx.fillStyle = P.lit("#e4eef8", 0.1, 0.25); ctx.beginPath(); ctx.ellipse(x, py + u * 2.6, u * 0.8, u * 0.5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, py - u * 0.8, u * 0.55, u * 0.3, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = P.c("#5a4434", 0.1); ctx.fillRect(px0 - u, py - u * 0.2, px1 - px0 + u * 2, u * 1.1);
    ctx.fillStyle = P.lit("#f2f6fb", 0.1, 0.2); ctx.fillRect(px0 - u, py - u * 0.55, px1 - px0 + u * 2, u * 0.5);
    const boat = (x, y, s, col) => {
      ctx.fillStyle = P.c(col, 0.15); ctx.beginPath(); ctx.moveTo(x - s, y - s * 0.2); ctx.quadraticCurveTo(x, y + s * 0.45, x + s, y - s * 0.25); ctx.lineTo(x + s * 0.85, y); ctx.quadraticCurveTo(x, y + s * 0.3, x - s * 0.85, y); ctx.fill();
      ctx.fillStyle = P.lit("#f2f6fb", 0.15, 0.2); ctx.beginPath(); ctx.ellipse(x, y - s * 0.16, s * 0.8, s * 0.07, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = P.dark("#3a2e26", 0.15, 0.3); ctx.lineWidth = Math.max(1, u * 0.18); ctx.beginPath(); ctx.moveTo(x, y - s * 0.16); ctx.lineTo(x, y - s * 1.2); ctx.stroke();
    };
    boat(w * 0.42, py + u * 5, u * 5.5, "#8a3a2a"); boat(w * 0.6, py + u * 5.6, u * 4.6, "#2e5a7a"); boat(w * 0.7, py - u * 2.4, u * 3.2, "#7a6a48");
    // 舫い綱（杭から舟へ）
    ctx.strokeStyle = rgba(P.dark("#2a2420"), 0.7); ctx.lineWidth = 1;
    for (const [x0, x1, y1] of [[0.4, 0.42, py + u * 3.6], [0.58, 0.6, py + u * 4.2]]) { ctx.beginPath(); ctx.moveTo(w * x0, py); ctx.quadraticCurveTo(w * (x0 + x1) / 2, y1 + u, w * x1, y1); ctx.stroke(); }
    // 桟橋の灯
    for (const x of [px0 + u, w * 0.54, px1 - u]) { ctx.fillStyle = P.dark("#2a2420"); ctx.fillRect(x - u * 0.15, py - u * 4, u * 0.3, u * 4); V.light(P, x, py - u * 4.2, u * 6, "#ffc070", P.night || P.dusk ? 1 : 0.25, true); }
    // 手前の雪だまり
    ctx.fillStyle = P.lit("#e8f0f8", 0, 0.25); ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h - u * 7); ctx.quadraticCurveTo(w * 0.12, h - u * 9, w * 0.26, h - u * 3); ctx.lineTo(w * 0.3, h); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w, h); ctx.lineTo(w, h - u * 5); ctx.quadraticCurveTo(w * 0.9, h - u * 6.5, w * 0.78, h); ctx.fill();
    V.fogBand(P, hz + u * 0.8, u * 2.5, P.weather === "fog" ? 0.5 : 0.18, P.night ? "#3a4656" : "#dde6ee");
    V.frame(P, { color: "#162230" });
  };
  V.OUT.w7_icehaven = (P) => {
    icehaven(P);
    if (P.key !== "w7_icehaven") return;
    const M = flatMap(P), t = waterTop(P);
    glints(P, M, [0.3, t + 0.02, 1, 0.9], 40, { size: 0.8 });
    flurry(P, 70);
    aurora(P, M, 0.04, 0.26);
    frostEdge(P, P.night ? 0.12 : 0.22);
  };
  // 画像が作られたとき（docs/art/scenes.md の w7_eisenvan）にも、位置によらない層だけ重ねる
  PHOTO.w7_eisenvan = (P, M) => { flurry(P, 70); aurora(P, M, 0.03, 0.2); frostEdge(P, P.night ? 0.1 : 0.18); };
})(globalThis.G = globalThis.G || {});
