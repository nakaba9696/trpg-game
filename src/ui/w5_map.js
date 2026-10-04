// W5：世界地図の窓。古い羊皮紙の地図のような一枚絵を canvas で描く（外の画像は使わない）。
// 形と見え方はエンジン（engine/zz_w5_map.js の G.w5）が決める。ここは描くだけ。
// - 下絵（海・陸・国の色分け・国境・山・森・川・湿地・荒野・雪原・羅針盤）は明暗ごとに一度だけ描いてとっておく
// - 上に重ねる（画面の大きさで描く）：道・場所の印・国の名前・場所の名前（重ならないように置く。重なるときは大事なほうだけ）
// - 指でつまむ・ドラッグ・ホイールで拡大と移動。印を押すと下にその場所のこと
// 開く場所：冒険の「地図」ボタン（G.ui.openMap を置き換える）と、上の道具の列・冒険中の帯の「地図」（U11。冒険の外でも）。
// index.html・ui.js・f2_codex.js は書き換えない（窓とボタンはここで作る）。見た目は ui/w5_map.css。レーン W＋U（W5）
(function (G) {
  if (typeof document === "undefined") return;
  const D = G.data;
  const W5 = G.w5;
  if (!W5 || !D.W5_MAP) return;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const UI = (W5.ui = {});

  // ---------------------------------------------------------------- 窓
  const dlg = h("dialog", "w5dlg");
  dlg.id = "dlgW5Map";
  dlg.setAttribute("aria-labelledby", "w5Title");
  const head = h("div", "dhead");
  const title = h("h2", "", "世界地図");
  title.id = "w5Title";
  const tools = h("div", "w5tools");
  const tb = (label, aria, fn) => { const b = h("button", "btn", label); b.type = "button"; b.setAttribute("aria-label", aria); b.title = aria; b.onclick = fn; tools.append(b); return b; };
  tb("＋", "拡大", () => zoomBy(1.4));
  tb("－", "縮小", () => zoomBy(1 / 1.4));
  tb("全体", "全体を見る", () => { fit(); draw(); });
  const hereBtn = tb("今いる所", "今いる所へ", () => focusHere());
  const close = h("button", "btn", "閉じる");
  close.type = "button";
  close.onclick = () => dlg.close();
  head.append(title, tools, close);
  const body = h("div", "dbody w5body");
  const wrap = h("div", "w5wrap");
  const cv = h("canvas", "w5cv");
  cv.setAttribute("role", "img");
  cv.tabIndex = 0;
  wrap.append(cv);
  const info = h("p", "w5info");
  info.setAttribute("aria-live", "polite");
  const legend = h("p", "fine w5legend");
  [["w5k here", "今いる所"], ["w5k now", "この冒険で行った"], ["w5k past", "前の冒険で行った"], ["w5k heard", "道標で名だけ"], ["w5k none", "まだ知らない"], ["w5k road", "陸路"], ["w5k sea", "船"]].forEach(([c, t]) => { const s = h("span", "w5li"); s.append(h("i", c), document.createTextNode(t)); legend.append(s); });
  const side = h("div", "w5side");
  side.append(info, legend);
  body.append(wrap, side);
  dlg.append(head, body);
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
  document.body.append(dlg);

  // ---------------------------------------------------------------- 色
  const isDark = () => { const t = document.documentElement.dataset.theme; if (t) return t === "dark"; return !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches); };
  const PAL = {
    light: { sea: "#b9c3b4", sea2: "#a6b3a6", wave: "rgba(60,78,74,.35)", land: "#e6d6ae", land2: "#d6c294", coast: "#4a3a26", ink: "#2e2416", muted: "#6c5a40", faint: "rgba(80,62,40,.6)", lake: "#a9b8ab", river: "#4f6a72", tint: 0.42, border: "rgba(90,40,30,.75)", road: "#5a4428", roadSoft: "rgba(90,68,40,.55)", seaRoute: "#2f5a70", here: "#a3321f", stamp: "#2e2416", past: "#8a6a44", none: "rgba(70,56,36,.5)", halo: "rgba(240,228,196,.85)", mtn: "#5a4630", mtnShade: "rgba(90,70,48,.45)", tree: "#4e5e34", marsh: "#4f5e46", waste: "#4a2a2a", snow: "#ffffff", vign: "rgba(90,60,25,.38)", regionInk: "rgba(56,40,24,.62)", dreadInk: "rgba(70,10,20,.75)" },
    dark: { sea: "#121c20", sea2: "#0d1518", wave: "rgba(150,170,160,.18)", land: "#2a271f", land2: "#221f18", coast: "#c9b48a", ink: "#ece0c4", muted: "#b0a48a", faint: "rgba(220,206,170,.55)", lake: "#152227", river: "#6f97a0", tint: 0.5, border: "rgba(230,150,120,.7)", road: "#d8c49a", roadSoft: "rgba(216,196,154,.45)", seaRoute: "#7fb0c8", here: "#ff7a5c", stamp: "#ece0c4", past: "#b89a70", none: "rgba(200,186,150,.45)", halo: "rgba(14,16,14,.85)", mtn: "#cdb894", mtnShade: "rgba(0,0,0,.4)", tree: "#8aa070", marsh: "#7f9478", waste: "#c08080", snow: "#d8e2e8", vign: "rgba(0,0,0,.55)", regionInk: "rgba(236,224,196,.6)", dreadInk: "rgba(255,140,140,.7)" },
  };
  const css = (n, d) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d);

  // ---------------------------------------------------------------- 下絵（明暗ごとに一度）
  const V = D.W5_MAP.view;
  const VW = V.x1 - V.x0, VH = V.y1 - V.y0;
  const K = 12; // 下絵の 1 単位あたりの画素
  const bases = {};
  const pathOf = (ctx, pts) => { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
  const landPath = (ctx, S) => { ctx.beginPath(); pathOf(ctx, S.main); S.islands.forEach((p) => pathOf(ctx, p)); };
  const nearLoc = (x, y, r) => Object.values(D.LOCS).some((L) => Math.hypot(L.x - x, L.y - y) < r);
  function buildBase(dark) {
    const P = dark ? PAL.dark : PAL.light;
    const S = W5.shape();
    const c = document.createElement("canvas");
    c.width = Math.round(VW * K); c.height = Math.round(VH * K);
    const x = c.getContext("2d");
    x.setTransform(K, 0, 0, K, -V.x0 * K, -V.y0 * K);
    const r = W5.rng(51);
    // 海
    const sg = x.createRadialGradient(50, 50, 10, 50, 50, 85);
    sg.addColorStop(0, P.sea); sg.addColorStop(1, P.sea2);
    x.fillStyle = sg; x.fillRect(V.x0, V.y0, VW, VH);
    // 岸に沿う波の線（古い地図の海岸のぼかし）
    x.lineJoin = "round";
    [3.2, 2.2, 1.4, 0.8].forEach((w, i) => { landPath(x, S); x.strokeStyle = dark ? `rgba(150,170,160,${0.05 + i * 0.03})` : `rgba(70,90,84,${0.06 + i * 0.04})`; x.lineWidth = w; x.stroke(); });
    // 波の印
    x.strokeStyle = P.wave; x.lineWidth = 0.12;
    for (let i = 0; i < 260; i++) {
      const wx = V.x0 + r() * VW, wy = V.y0 + r() * VH;
      if (W5.onLand(wx, wy) || W5.coastDist(wx, wy) < 2.4) continue;
      x.beginPath(); x.moveTo(wx - 0.9, wy); x.quadraticCurveTo(wx - 0.45, wy - 0.45, wx, wy); x.quadraticCurveTo(wx + 0.45, wy - 0.45, wx + 0.9, wy); x.stroke();
    }
    // 陸
    const lg = x.createLinearGradient(0, 0, 100, 100);
    lg.addColorStop(0, P.land); lg.addColorStop(1, P.land2);
    landPath(x, S); x.fillStyle = lg; x.fill();
    // 国の色分け（粗い格子に色を置いて、なめらかに引き伸ばす）＋国境の点線
    const R = 2.5;
    const gw = Math.ceil(VW * R), gh = Math.ceil(VH * R);
    const tc = document.createElement("canvas"); tc.width = gw; tc.height = gh;
    const tx = tc.getContext("2d");
    const img = tx.createImageData(gw, gh);
    const dc = document.createElement("canvas"); dc.width = gw; dc.height = gh; // 使徒領の暗い地の型
    const dx = dc.getContext("2d");
    const dimg = dx.createImageData(gw, gh);
    const reg = new Array(gw * gh);
    const rgb = {};
    const colOf = (name) => rgb[name] || (rgb[name] = ((st) => { const s = (dark ? st.dark : st.light).replace("#", ""); return [0, 2, 4].map((k) => parseInt(s.slice(k, k + 2), 16)); })(W5.regionStyle(name)));
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const wx = V.x0 + (i + 0.5) / R, wy = V.y0 + (j + 0.5) / R;
      const name = W5.regionAt(wx, wy);
      reg[j * gw + i] = name;
      const [cr, cg, cb] = colOf(name);
      const k = (j * gw + i) * 4;
      img.data[k] = cr; img.data[k + 1] = cg; img.data[k + 2] = cb; img.data[k + 3] = 255;
      if (W5.regionStyle(name).dread) dimg.data[k + 3] = 255;
    }
    tx.putImageData(img, 0, 0);
    dx.putImageData(dimg, 0, 0);
    x.save();
    landPath(x, S); x.clip();
    x.globalAlpha = P.tint;
    x.imageSmoothingEnabled = true;
    x.drawImage(tc, V.x0, V.y0, gw / R, gh / R);
    x.globalAlpha = 1;
    // 使徒領：斜めの細い線で暗く（型で切り抜く）
    const hc = document.createElement("canvas"); hc.width = c.width; hc.height = c.height;
    const hx = hc.getContext("2d");
    hx.setTransform(K, 0, 0, K, -V.x0 * K, -V.y0 * K);
    hx.strokeStyle = dark ? "rgba(0,0,0,.55)" : "rgba(40,10,14,.35)"; hx.lineWidth = 0.14;
    for (let t = -VH; t < VW + VH; t += 0.9) { hx.beginPath(); hx.moveTo(V.x0 + t, V.y0); hx.lineTo(V.x0 + t - VH, V.y1); hx.stroke(); }
    hx.setTransform(1, 0, 0, 1, 0, 0);
    hx.globalCompositeOperation = "destination-in";
    hx.imageSmoothingEnabled = true;
    hx.drawImage(dc, 0, 0, gw, gh, 0, 0, c.width * (gw / R / VW), c.height * (gh / R / VH));
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.drawImage(hc, 0, 0);
    x.setTransform(K, 0, 0, K, -V.x0 * K, -V.y0 * K);
    // 国境
    x.fillStyle = P.border;
    for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
      const a = reg[j * gw + i];
      if (a === reg[j * gw + i + 1] && a === reg[(j + 1) * gw + i]) continue;
      if ((i + j) % 2) continue;
      const wx = V.x0 + (i + 1) / R, wy = V.y0 + (j + 1) / R;
      if (!W5.onLand(wx, wy)) continue;
      x.beginPath(); x.arc(wx, wy, 0.17, 0, Math.PI * 2); x.fill();
    }
    x.restore();
    // 紙のしみ（陸の上）
    x.save(); landPath(x, S); x.clip();
    for (let i = 0; i < 70; i++) {
      const bx = V.x0 + r() * VW, by = V.y0 + r() * VH, br = 2 + r() * 7;
      const g = x.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, dark ? "rgba(0,0,0,.12)" : "rgba(120,90,40,.09)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    x.restore();
    // 湖
    S.lakes.forEach((p) => { x.beginPath(); pathOf(x, p); x.fillStyle = P.lake; x.fill(); x.strokeStyle = P.coast; x.lineWidth = 0.14; x.stroke(); });
    // 海岸線
    landPath(x, S); x.strokeStyle = P.coast; x.lineWidth = 0.22; x.stroke();
    // 川
    x.strokeStyle = P.river; x.lineCap = "round";
    S.rivers.forEach((pts) => {
      x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; x.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
      const e = pts[pts.length - 1]; x.lineTo(e[0], e[1]);
      x.lineWidth = 0.32; x.stroke();
    });
    // 森・湿地・荒野・雪原・丘・畑・灰
    D.W5_MAP.patches.forEach((pa, pi) => {
      const pr = W5.rng(1000 + pi * 31);
      if (pa.kind === "tree") { worldTree(x, P, pa.x, pa.y); return; }
      const step = { forest: 1.25, marsh: 1.5, waste: 1.6, snow: 1.9, hills: 2.2, field: 1.6, ash: 1.1 }[pa.kind] || 1.5;
      for (let gy = pa.y - pa.r; gy <= pa.y + pa.r; gy += step) for (let gx = pa.x - pa.r; gx <= pa.x + pa.r; gx += step) {
        const px = gx + (pr() - 0.5) * step * 0.9, py = gy + (pr() - 0.5) * step * 0.9;
        const dd = Math.hypot(px - pa.x, py - pa.y) / pa.r;
        if (dd > 1 || pr() < dd * dd * 0.8) continue;
        if (!W5.onLand(px, py) || W5.coastDist(px, py) < 0.7 || nearLoc(px, py, 1.9)) continue;
        glyph(x, P, pa.kind, px, py, pr);
      }
    });
    // 山
    D.W5_MAP.ridges.forEach((rg, ri) => {
      const rr = W5.rng(2000 + ri * 13);
      const pts = rg.pts;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / (rg.big ? 1.7 : 2.1)));
        for (let k = 0; k < n; k++) {
          const t = (k + rr() * 0.5) / n;
          const mx = ax + (bx - ax) * t + (rr() - 0.5) * 1.6, my = ay + (by - ay) * t + (rr() - 0.5) * 1.4;
          if (!W5.onLand(mx, my) || nearLoc(mx, my, 2.3)) continue;
          mountain(x, P, mx, my, (rg.big ? 1.25 : 0.95) * (0.8 + rr() * 0.45), rg.dark);
        }
      }
      if (rg.volcano && !nearLoc(rg.volcano[0], rg.volcano[1], 1.5)) volcano(x, P, rg.volcano[0], rg.volcano[1]);
    });
    // 羅針盤
    compass(x, P, 92, 101.5, 3.4);
    // 枠と端の焼け
    x.setTransform(1, 0, 0, 1, 0, 0);
    const vg = x.createRadialGradient(c.width / 2, c.height / 2, c.width * 0.36, c.width / 2, c.height / 2, c.width * 0.74);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, P.vign);
    x.fillStyle = vg; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = P.coast; x.lineWidth = 6; x.strokeRect(10, 10, c.width - 20, c.height - 20);
    x.lineWidth = 1.5; x.strokeRect(22, 22, c.width - 44, c.height - 44);
    return c;
  }
  function glyph(x, P, kind, px, py, pr) {
    x.lineWidth = 0.13;
    if (kind === "forest") {
      const s = 0.55 + pr() * 0.25;
      x.fillStyle = P.tree; x.strokeStyle = P.tree;
      x.beginPath(); x.moveTo(px, py + s * 0.9); x.lineTo(px, py + s * 1.4); x.stroke();
      x.beginPath(); x.moveTo(px, py - s); x.lineTo(px + s * 0.6, py + s * 0.9); x.lineTo(px - s * 0.6, py + s * 0.9); x.closePath();
      x.globalAlpha = 0.85; x.fill(); x.globalAlpha = 1;
    } else if (kind === "marsh") {
      x.strokeStyle = P.marsh;
      x.beginPath(); x.moveTo(px - 0.6, py + 0.3); x.lineTo(px + 0.6, py + 0.3); x.stroke();
      [-0.35, 0, 0.35].forEach((o) => { x.beginPath(); x.moveTo(px + o, py + 0.3); x.lineTo(px + o * 1.4, py - 0.35); x.stroke(); });
    } else if (kind === "waste") {
      x.fillStyle = P.waste; x.strokeStyle = P.waste;
      if (pr() < 0.5) { x.beginPath(); x.moveTo(px - 0.6, py); x.lineTo(px - 0.1, py - 0.25); x.lineTo(px + 0.2, py + 0.15); x.lineTo(px + 0.6, py - 0.1); x.stroke(); }
      else for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(px + (pr() - 0.5), py + (pr() - 0.5), 0.1, 0, Math.PI * 2); x.fill(); }
    } else if (kind === "snow") {
      x.strokeStyle = P.snow; x.globalAlpha = 0.8;
      for (let a = 0; a < 3; a++) { const t = (a * Math.PI) / 3; x.beginPath(); x.moveTo(px - Math.cos(t) * 0.35, py - Math.sin(t) * 0.35); x.lineTo(px + Math.cos(t) * 0.35, py + Math.sin(t) * 0.35); x.stroke(); }
      x.globalAlpha = 1;
    } else if (kind === "hills") {
      x.strokeStyle = P.mtn;
      x.beginPath(); x.arc(px, py + 0.4, 0.75, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    } else if (kind === "field") {
      x.strokeStyle = P.muted; x.globalAlpha = 0.6;
      for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(px - 0.6, py + i * 0.28); x.lineTo(px + 0.6, py + i * 0.28 - 0.15); x.stroke(); }
      x.globalAlpha = 1;
    } else if (kind === "ash") {
      x.fillStyle = P.muted;
      x.beginPath(); x.arc(px, py, 0.09, 0, Math.PI * 2); x.fill();
    }
  }
  function mountain(x, P, mx, my, s, dark) {
    const w = s * 1.1, hgt = s * 1.25;
    x.beginPath(); x.moveTo(mx - w, my + hgt * 0.45); x.lineTo(mx, my - hgt * 0.6); x.lineTo(mx + w, my + hgt * 0.45); x.closePath();
    x.fillStyle = dark ? "rgba(40,16,20,.55)" : P.land; x.fill();
    x.beginPath(); x.moveTo(mx, my - hgt * 0.6); x.lineTo(mx + w, my + hgt * 0.45); x.lineTo(mx + w * 0.15, my + hgt * 0.45); x.closePath();
    x.fillStyle = P.mtnShade; x.fill();
    x.beginPath(); x.moveTo(mx - w, my + hgt * 0.45); x.lineTo(mx, my - hgt * 0.6); x.lineTo(mx + w, my + hgt * 0.45);
    x.strokeStyle = P.mtn; x.lineWidth = 0.17; x.stroke();
  }
  function volcano(x, P, vx, vy) {
    mountain(x, P, vx, vy, 1.5);
    x.fillStyle = "rgba(180,60,30,.8)"; x.beginPath(); x.arc(vx, vy - 1.1, 0.25, 0, Math.PI * 2); x.fill();
    x.strokeStyle = P.muted; x.lineWidth = 0.14;
    x.beginPath(); x.moveTo(vx, vy - 1.2); x.bezierCurveTo(vx + 0.8, vy - 2, vx - 0.6, vy - 2.6, vx + 0.5, vy - 3.4); x.stroke();
  }
  function worldTree(x, P, tx, ty) {
    x.strokeStyle = P.tree; x.fillStyle = P.tree; x.lineWidth = 0.25;
    x.beginPath(); x.moveTo(tx, ty + 1.6); x.lineTo(tx, ty - 0.4); x.stroke();
    x.globalAlpha = 0.75;
    [[0, -1.6, 1.4], [-1, -0.9, 1], [1, -0.9, 1], [-0.5, -2.2, 0.9], [0.6, -2.2, 0.9]].forEach(([ox, oy, rr]) => { x.beginPath(); x.arc(tx + ox, ty + oy, rr, 0, Math.PI * 2); x.fill(); });
    x.globalAlpha = 1;
  }
  function compass(x, P, cx, cy, rr) {
    x.save(); x.translate(cx, cy);
    x.strokeStyle = P.coast; x.lineWidth = 0.12;
    x.beginPath(); x.arc(0, 0, rr * 0.75, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(0, 0, rr * 0.68, 0, Math.PI * 2); x.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, l = i % 2 ? rr * 0.55 : rr;
      x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a - 0.18) * l * 0.28, Math.sin(a - 0.18) * l * 0.28); x.lineTo(Math.cos(a) * l, Math.sin(a) * l); x.closePath();
      x.fillStyle = i % 2 ? P.muted : P.coast; x.fill();
    }
    x.fillStyle = P.coast; x.font = `${rr * 0.5}px serif`; x.textAlign = "center"; x.textBaseline = "bottom";
    x.fillText("北", 0, -rr * 1.02);
    x.restore();
  }
  const baseFor = () => { const k = isDark() ? "dark" : "light"; return bases[k] || (bases[k] = buildBase(k === "dark")); };

  // ---------------------------------------------------------------- 見る位置（s：1 単位あたりの画面の画素、ox・oy：画面の左上の座標）
  const view = { s: 6, ox: V.x0, oy: V.y0 };
  let cw = 0, ch = 0, dpr = 1;
  const minS = () => Math.min(cw / VW, ch / VH);
  const clampView = () => {
    view.s = Math.max(minS(), Math.min(minS() * 6, view.s));
    const vw = cw / view.s, vh = ch / view.s;
    view.ox = vw >= VW ? V.x0 - (vw - VW) / 2 : Math.max(V.x0, Math.min(V.x1 - vw, view.ox));
    view.oy = vh >= VH ? V.y0 - (vh - VH) / 2 : Math.max(V.y0, Math.min(V.y1 - vh, view.oy));
  };
  const fit = () => { view.s = minS(); clampView(); };
  const centerOn = (wx, wy, s) => { if (s) view.s = s; view.ox = wx - cw / view.s / 2; view.oy = wy - ch / view.s / 2; clampView(); };
  const zoomAt = (f, sx, sy) => { const wx = view.ox + sx / view.s, wy = view.oy + sy / view.s; view.s *= f; clampView(); view.ox = wx - sx / view.s; view.oy = wy - sy / view.s; clampView(); draw(); };
  const zoomBy = (f) => zoomAt(f, cw / 2, ch / 2);
  const toScreen = (wx, wy) => [(wx - view.ox) * view.s, (wy - view.oy) * view.s];
  function focusHere() {
    const S = G.S;
    const L = S && !S.over && D.LOCS[S.loc];
    if (!L) { fit(); draw(); return; }
    centerOn(L.x, L.y, Math.max(view.s, minS() * 2.2));
    draw();
  }

  // ---------------------------------------------------------------- 上に重ねる
  let marks = [];
  let picked = null;
  const TYPE = { town: "町", wild: "野外", dungeon: "迷宮" };
  function draw() {
    if (!cw) return;
    const P = isDark() ? PAL.dark : PAL.light;
    const x = cv.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = P.sea2; x.fillRect(0, 0, cw, ch);
    const base = baseFor();
    x.imageSmoothingEnabled = true;
    x.drawImage(base, (V.x0 - view.ox) * view.s, (V.y0 - view.oy) * view.s, VW * view.s, VH * view.s);
    const S = G.S;
    const z = view.s / minS(); // 拡大の度合い（全体＝1）
    const fBody = css("--f-body", "serif"), fDisp = css("--f-display", "serif");
    // 国の名前（初めから見える）と海の名
    x.textAlign = "center"; x.textBaseline = "middle";
    const regRects = [];
    W5.regionLabels().forEach((rl) => {
      const [sx, sy] = toScreen(rl.x, rl.y);
      const fs = Math.max(10, Math.min(34, view.s * 2.6 * rl.size));
      x.font = `${fs}px ${fDisp}`;
      x.fillStyle = rl.dread ? P.dreadInk : P.regionInk;
      const text = rl.name;
      const tw = rl.vert ? fs : x.measureText(text).width * 1.25, th = rl.vert ? fs * 1.08 * text.length : fs;
      regRects.push([sx - tw / 2, sy - th / 2, sx + tw / 2, sy + th / 2]);
      if (rl.vert) [...text].forEach((chr, i) => { const yy = sy + (i - (text.length - 1) / 2) * fs * 1.08; haloText(x, P, chr, sx, yy, rl.dread ? 0.85 : 0.5); });
      else { x.save(); if ("letterSpacing" in x) x.letterSpacing = `${Math.round(fs * 0.25)}px`; haloText(x, P, text, sx, sy, 0.5); x.restore(); }
    });
    D.W5_MAP.seas.forEach((se) => {
      const [sx, sy] = toScreen(se.x, se.y);
      const fs = Math.max(10, Math.min(20, view.s * 1.5));
      x.font = `italic ${fs}px ${fBody}`; x.fillStyle = P.faint;
      if (se.vert) [...se.name].forEach((chr, i) => x.fillText(chr, sx, sy + (i - (se.name.length - 1) / 2) * fs * 1.1));
      else x.fillText(se.name, sx, sy);
    });
    // 道
    const pos = {};
    marks = W5.marks(S);
    marks.forEach((m) => { pos[m.id] = toScreen(m.x, m.y); });
    x.lineCap = "round";
    W5.roads(S).forEach((rd) => {
      const a = pos[rd.a], b = pos[rd.b];
      if (!a || !b) return;
      x.beginPath(); x.moveTo(a[0], a[1]);
      if (rd.kind === "sea") { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; x.quadraticCurveTo(mx + dy * 0.12, my - dx * 0.12, b[0], b[1]); }
      else x.lineTo(b[0], b[1]);
      x.setLineDash(rd.kind === "sea" ? [5, 5] : rd.known ? [] : [2, 4]);
      x.strokeStyle = rd.kind === "sea" ? P.seaRoute : rd.known ? P.road : P.roadSoft;
      x.lineWidth = rd.known ? 1.8 : 1.3;
      x.stroke();
    });
    x.setLineDash([]);
    // 印
    const ORDER = { none: 0, heard: 1, past: 2, now: 3, here: 4 };
    marks.sort((a, b) => ORDER[a.status] - ORDER[b.status]);
    const rad = Math.max(3.5, Math.min(8, view.s * 0.7));
    marks.forEach((m) => {
      const [sx, sy] = pos[m.id];
      const r = m.type === "town" ? rad : rad * 0.85;
      const been = W5.KNOWN[m.status];
      const fill = m.status === "here" || m.status === "now" ? P.stamp : m.status === "past" ? P.past : null;
      x.beginPath();
      if (m.type === "town") x.rect(sx - r, sy - r, r * 2, r * 2);
      else if (m.type === "dungeon") { x.moveTo(sx, sy - r * 1.2); x.lineTo(sx + r * 1.05, sy); x.lineTo(sx, sy + r * 1.2); x.lineTo(sx - r * 1.05, sy); x.closePath(); }
      else x.arc(sx, sy, r * 0.9, 0, Math.PI * 2);
      x.fillStyle = fill || P.halo; x.fill();
      x.lineWidth = been ? 1.5 : 1.1;
      x.strokeStyle = been ? P.stamp : P.none; x.stroke();
      if (m.status === "none") { x.fillStyle = P.none; x.font = `${Math.round(r * 1.5)}px ${fBody}`; x.fillText("?", sx, sy + 0.5); }
      if (m.status === "here") {
        x.strokeStyle = P.here; x.lineWidth = 2.5;
        x.beginPath(); x.arc(sx, sy, r * 2.1, 0, Math.PI * 2); x.stroke();
        x.lineWidth = 1; x.beginPath(); x.arc(sx, sy, r * 2.9, 0, Math.PI * 2); x.stroke();
      }
      if (picked === m.id) { x.strokeStyle = P.here; x.lineWidth = 1.5; x.setLineDash([3, 3]); x.beginPath(); x.arc(sx, sy, r * 2.4, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
    });
    // 場所の名前：大事なものから、重ならない位置に置く。置けなければ出さない
    const placed = marks.map((m) => { const [sx, sy] = pos[m.id]; return [sx - rad, sy - rad, sx + rad, sy + rad]; });
    const over = (b, list) => list.some((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]);
    const hit = (b) => over(b, placed);
    const named = marks.filter((m) => m.name).sort((a, b) => ORDER[b.status] - ORDER[a.status] || (a.type === "town" ? -1 : 1) - (b.type === "town" ? -1 : 1));
    named.forEach((m) => {
      const [sx, sy] = pos[m.id];
      const fs = Math.round(Math.max(11, Math.min(16, 9.5 + z * 1.4)) * (m.status === "here" ? 1.12 : m.faint ? 0.86 : m.type === "town" ? 1 : 0.92));
      x.font = `${m.status === "here" || m.status === "now" ? "bold " : ""}${fs}px ${fBody}`;
      const w = x.measureText(m.name).width, hh = fs * 1.15, g = rad * (m.status === "here" ? 2.4 : 1.4) + 2;
      const cand = [[sx + g, sy - hh / 2, "left"], [sx - g - w, sy - hh / 2, "left"], [sx - w / 2, sy - g - hh, "left"], [sx - w / 2, sy + g, "left"], [sx + g * 0.7, sy - g * 0.7 - hh, "left"], [sx + g * 0.7, sy + g * 0.7, "left"], [sx - g * 0.7 - w, sy - g * 0.7 - hh, "left"], [sx - g * 0.7 - w, sy + g * 0.7, "left"]];
      const fits = ([lx, ly]) => lx > 2 && ly > 2 && lx + w < cw - 2 && ly + hh < ch - 2 && !hit([lx, ly, lx + w, ly + hh]);
      // 国の名前とも重ならない位置を先に探す。無ければ国の名前の上でもよい
      const at = cand.find((c) => fits(c) && !over([c[0], c[1], c[0] + w, c[1] + hh], regRects)) || cand.find(fits);
      if (!at) return;
      placed.push([at[0] - 2, at[1], at[0] + w + 2, at[1] + hh]);
      x.textAlign = "left"; x.textBaseline = "middle";
      x.fillStyle = m.status === "here" ? P.here : m.status === "now" ? P.ink : m.status === "past" ? P.past : P.faint;
      haloText(x, P, m.name, at[0], at[1] + hh / 2, m.faint ? 0.5 : 1);
    });
    cv.setAttribute("aria-label", `世界地図。${summary()}`);
  }
  function haloText(x, P, t, sx, sy, a) {
    x.save(); x.globalAlpha = a; x.lineJoin = "round"; x.strokeStyle = P.halo; x.lineWidth = 3.2; x.strokeText(t, sx, sy);
    x.globalAlpha = Math.min(1, a + 0.25); x.fillText(t, sx, sy); x.restore();
  }
  function summary() {
    const n = W5.count();
    const S = G.S;
    const now = S && S.visited ? Object.keys(S.visited).filter((id) => D.LOCS[id]).length : 0;
    const L = S && !S.over && D.LOCS[S.loc];
    return `${L ? `今いる所：${L.name}。` : ""}行ったことのある場所 ${n.been}／${n.all}${S && S.visited ? `（この冒険で ${now}）` : ""}`;
  }
  function showInfo(m) {
    info.textContent = "";
    if (!m) { info.append(h("span", "fine", summary() + "。印を押すと、その場所のことが出る。")); return; }
    const L = D.LOCS[m.id];
    const nm = h("b", "", m.name || "？？？");
    info.append(nm, h("span", "w5tag", `${m.region || ""}・${TYPE[m.type] || ""}${m.type !== "town" && m.name ? " " + "★".repeat(Math.min(6, m.danger)) : ""}`));
    const st = { here: "今いる所。", now: "この冒険で行った。", past: "前の冒険で行った。", heard: "行ったことはない。道標で名前だけ知っている。", none: "まだ行ったことがない。" }[m.status];
    let more = st;
    if (m.rec && m.status !== "now" && m.status !== "here") more += `（はじめて行ったのは ${m.rec.by}${m.rec.date ? "、" + m.rec.date : ""}）`;
    if (W5.KNOWN[m.status] || m.status === "heard") {
      const near = Object.entries(Object.assign({}, L.links)).map(([to, d]) => [to, d, "陸"]).concat(Object.entries(L.sea || {}).map(([to, d]) => [to, d, "船"]));
      if (W5.KNOWN[m.status] && near.length) {
        const named = near.filter(([to]) => W5.status(to) !== "none"), unknown = near.length - named.length;
        more += " 道：" + named.map(([to, d, k]) => `${D.LOCS[to].name}（${k}${typeof d === "number" ? d + "日" : ""}）`).concat(unknown ? [`まだ知らない所へ ${unknown} 本`] : []).join("・");
      }
    }
    info.append(h("span", "w5more", more));
  }

  // ---------------------------------------------------------------- 大きさと操作
  function resize() {
    const r = wrap.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const was = cw ? { cx: view.ox + cw / view.s / 2, cy: view.oy + ch / view.s / 2, z: view.s / minS() } : null;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = r.width; ch = r.height;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    cv.style.width = cw + "px"; cv.style.height = ch + "px";
    if (was) centerOn(was.cx, was.cy, minS() * was.z);
    return true;
  }
  if (window.ResizeObserver) new ResizeObserver(() => { if (dlg.open && resize()) draw(); }).observe(wrap);
  const ptrs = new Map();
  let drag = null, moved = 0, pinch = null;
  cv.addEventListener("pointerdown", (ev) => {
    cv.setPointerCapture && cv.setPointerCapture(ev.pointerId);
    ptrs.set(ev.pointerId, [ev.offsetX, ev.offsetY]);
    if (ptrs.size === 1) { drag = { x: ev.offsetX, y: ev.offsetY, ox: view.ox, oy: view.oy }; moved = 0; }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: view.s }; moved = 99; }
  });
  cv.addEventListener("pointermove", (ev) => {
    if (!ptrs.has(ev.pointerId)) return;
    ptrs.set(ev.pointerId, [ev.offsetX, ev.offsetY]);
    if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      zoomAt((pinch.s * d) / pinch.d / view.s, mx, my);
      return;
    }
    if (drag) {
      const dx = ev.offsetX - drag.x, dy = ev.offsetY - drag.y;
      moved = Math.max(moved, Math.hypot(dx, dy));
      view.ox = drag.ox - dx / view.s; view.oy = drag.oy - dy / view.s;
      clampView(); draw();
    }
  });
  const up = (ev) => {
    const was = ptrs.has(ev.pointerId);
    ptrs.delete(ev.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 1) { const [p] = [...ptrs.values()]; drag = { x: p[0], y: p[1], ox: view.ox, oy: view.oy }; return; }
    if (!ptrs.size) { if (was && moved < 6 && ev.type === "pointerup") tap(ev.offsetX, ev.offsetY); drag = null; }
  };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", (ev) => { ev.preventDefault(); zoomAt(ev.deltaY < 0 ? 1.18 : 1 / 1.18, ev.offsetX, ev.offsetY); }, { passive: false });
  cv.addEventListener("dblclick", (ev) => zoomAt(1.6, ev.offsetX, ev.offsetY));
  cv.addEventListener("keydown", (ev) => {
    const st = 40 / view.s;
    const k = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[ev.key];
    if (k) { view.ox += k[0]; view.oy += k[1]; clampView(); draw(); ev.preventDefault(); }
    else if (ev.key === "+" || ev.key === "=") { zoomBy(1.3); ev.preventDefault(); }
    else if (ev.key === "-") { zoomBy(1 / 1.3); ev.preventDefault(); }
  });
  function tap(sx, sy) {
    let best = null, bd = 22;
    marks.forEach((m) => { const [px, py] = toScreen(m.x, m.y); const d = Math.hypot(px - sx, py - sy); if (d < bd) { bd = d; best = m; } });
    picked = best ? best.id : null;
    showInfo(best);
    draw();
  }

  // ---------------------------------------------------------------- 開く
  UI.open = () => {
    if (G.ui && G.ui.setSheetOpen) try { G.ui.setSheetOpen(false); } catch {}
    if (G.S) W5.record(G.S);
    if (!dlg.open) dlg.showModal();
    picked = null;
    hereBtn.hidden = !(G.S && !G.S.over);
    cw = 0;
    resize();
    fit();
    // スマホは全体だと小さいので、今いる所を寄せて開く
    if (G.S && !G.S.over && cw < 640) focusHere(); else draw();
    showInfo(null);
    cv.focus({ preventScroll: true });
  };
  UI.draw = () => draw();
  UI.view = view;
  // 明暗が変わったら描き直す
  new MutationObserver(() => { if (dlg.open) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // 冒険の「地図」ボタン
  if (G.ui) G.ui.openMap = UI.open;
  // 図鑑とは別の「地図」ボタン（上の道具の列・冒険中の帯）は ui/zu11_quick.js が置く（冒険の外でも開ける）
})(globalThis.G = globalThis.G || {});
