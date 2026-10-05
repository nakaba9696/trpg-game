// W7：旅の行き先を選ぶ場面の、小さな世界地図（持ち主の声「冒険で行き先を選ぶときに世界地図を出してほしい」）
// 「旅立つ」の組（行動の id が travel: / sail:）が画面にあるとき、その組の選択肢の上に小さな地図を置く。
//   ・今いる所と、選べる行き先と、そこへの道（陸路は実線・船は点線・砦が塞ぐ道は使徒領の色）だけを、行き先が全部入る広さで描く
//   ・選択肢にカーソルを当てる（PC）・選択肢に触れる／フォーカスする（スマホ・鍵盤）と、その行き先と道が光る
//   ・地図の行き先の印を押すと、その選択肢を押したのと同じ（ボタンの click）
// 下絵と色は ui/w5_map.js（G.w5.ui.base・palette）。行き先の一覧はエンジンの G.w7.travelChoices（DOM なし）。見た目は ui/w7_travelmap.css。
// ui.js の行動ボタンの data-act で選択肢を見つける。ui.render を包む（名前の順で u13_menu より後）。レーン W＋U（W7）
(function (G) {
  if (typeof document === "undefined") return;
  const D = G.data;
  const ui = G.ui;
  if (!ui || !ui.render || !G.w7 || !G.w7.travelChoices) return;
  const SHAPE = { town: "town", wild: "wild", dungeon: "dungeon" };

  function paint(cv, st) {
    const W5 = G.w5;
    if (!W5 || !W5.ui || !W5.ui.base) return;
    const rect = cv.getBoundingClientRect();
    const cw = Math.max(120, Math.round(rect.width)), ch = Math.max(90, Math.round(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== cw * dpr || cv.height !== ch * dpr) { cv.width = cw * dpr; cv.height = ch * dpr; }
    const x = cv.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const P = W5.ui.palette();
    const V = D.W5_MAP.view, VW = V.x1 - V.x0, VH = V.y1 - V.y0;
    // 見る範囲：今いる所・行き先・道の曲がり角が全部入る
    const here = D.LOCS[st.loc];
    const pts = [[here.x, here.y], ...st.list.flatMap((c) => c.pts)];
    let x0 = Math.min(...pts.map((p) => p[0])) - 6, x1 = Math.max(...pts.map((p) => p[0])) + 6;
    let y0 = Math.min(...pts.map((p) => p[1])) - 5, y1 = Math.max(...pts.map((p) => p[1])) + 5;
    const s = Math.min(cw / (x1 - x0), ch / (y1 - y0), 22);
    const ox = (x0 + x1) / 2 - cw / s / 2, oy = (y0 + y1) / 2 - ch / s / 2;
    const to = (wx, wy) => [(wx - ox) * s, (wy - oy) * s];
    x.fillStyle = P.sea2; x.fillRect(0, 0, cw, ch);
    x.imageSmoothingEnabled = true;
    x.drawImage(W5.ui.base(), (V.x0 - ox) * s, (V.y0 - oy) * s, VW * s, VH * s);
    // 道
    x.lineCap = "round"; x.lineJoin = "round";
    st.list.forEach((c) => {
      const hot = st.hot === c.id;
      const line = W5.roadSamples(c.pts, c.kind, 12).map((p) => to(p[0], p[1]));
      x.beginPath(); line.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
      if (c.kind !== "sea") { x.setLineDash([]); x.strokeStyle = P.halo; x.globalAlpha = 0.8; x.lineWidth = hot ? 6.5 : 4.4; x.stroke(); x.globalAlpha = 1; }
      x.setLineDash(c.kind === "sea" ? [5, 4] : []);
      x.strokeStyle = hot ? P.here : c.kind === "sea" ? P.seaRoute : c.gate ? P.dreadInk : P.road;
      x.lineWidth = hot ? 3 : 1.8;
      x.stroke();
    });
    x.setLineDash([]);
    // 印と名前
    const r = Math.max(4, Math.min(7, s * 0.55));
    const mark = (id, color, fill, big) => {
      const L = D.LOCS[id];
      const [sx, sy] = to(L.x, L.y);
      const rr = big ? r * 1.25 : r;
      x.beginPath();
      if (SHAPE[L.type] === "town") x.rect(sx - rr, sy - rr, rr * 2, rr * 2);
      else if (SHAPE[L.type] === "dungeon") { x.moveTo(sx, sy - rr * 1.2); x.lineTo(sx + rr * 1.05, sy); x.lineTo(sx, sy + rr * 1.2); x.lineTo(sx - rr * 1.05, sy); x.closePath(); }
      else x.arc(sx, sy, rr * 0.9, 0, Math.PI * 2);
      x.fillStyle = fill; x.fill(); x.lineWidth = 1.5; x.strokeStyle = color; x.stroke();
      return [sx, sy];
    };
    const fs = Math.round(Math.max(11, Math.min(14, 10 + s * 0.2)));
    x.font = `${fs}px ${getComputedStyle(document.documentElement).getPropertyValue("--f-body") || "serif"}`;
    // 名前は重ならない所に置く（右・左・上・下）。置けなければ出さない。光っている行き先と今いる所は必ず出す
    const taken = [];
    const over = (b) => taken.some((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]);
    const label = (t, sx, sy, color, must) => {
      x.font = `${must ? "bold " : ""}${fs}px ${getComputedStyle(document.documentElement).getPropertyValue("--f-body") || "serif"}`;
      const w = x.measureText(t).width, hh = fs * 1.15, g = r + 4;
      const cand = [[sx + g, sy - hh / 2], [sx - g - w, sy - hh / 2], [sx - w / 2, sy - g - hh], [sx - w / 2, sy + g]];
      const fits = ([lx, ly]) => lx > 2 && ly > 2 && lx + w < cw - 2 && ly + hh < ch - 2 && !over([lx, ly, lx + w, ly + hh]);
      const at = cand.find(fits) || (must ? cand.find(([lx, ly]) => lx > 2 && ly > 2 && lx + w < cw - 2 && ly + hh < ch - 2) || cand[0] : null);
      if (!at) return;
      taken.push([at[0] - 2, at[1], at[0] + w + 2, at[1] + hh]);
      x.textBaseline = "middle"; x.textAlign = "left"; x.fillStyle = color;
      W5.ui.haloText(x, P, t, at[0], at[1] + hh / 2, 1);
    };
    st.at = [];
    const spots = st.list.map((c) => { const hot = st.hot === c.id; const [sx, sy] = mark(c.to, hot ? P.here : P.stamp, hot ? P.here : P.halo, hot); st.at.push({ id: c.id, sx, sy }); return { c, hot, sx, sy }; });
    const [hx, hy] = mark(st.loc, P.here, P.stamp, true);
    x.strokeStyle = P.here; x.lineWidth = 2; x.beginPath(); x.arc(hx, hy, r * 2.3, 0, Math.PI * 2); x.stroke();
    // 印の上には名前を置かない
    [...spots.map((p) => [p.sx, p.sy]), [hx, hy]].forEach(([sx, sy]) => taken.push([sx - r, sy - r, sx + r, sy + r]));
    label("今いる所", hx, hy, P.here, true);
    spots.filter((p) => p.hot).concat(spots.filter((p) => !p.hot)).forEach((p) => label(D.LOCS[p.c.to].name, p.sx, p.sy, p.hot ? P.here : P.ink, p.hot));
    cv.setAttribute("aria-label", `行き先の地図。今いる所は${here.name}。行き先：${st.list.map((c) => D.LOCS[c.to].name).join("、")}`);
  }

  function attach() {
    const S = G.S;
    const panel = document.getElementById("panel");
    if (!S || !panel || S.over || S.mode !== "explore") return;
    const list = G.w7.travelChoices(S);
    if (!list.length) return;
    const btns = [...panel.querySelectorAll('button.act[data-act^="travel:"], button.act[data-act^="sail:"]')];
    if (!btns.length) return;
    const group = btns[0].closest(".agroup");
    if (!group || group.querySelector(".w7tmap")) return;
    const shown = new Set(btns.map((b) => b.dataset.act));
    const st = { loc: S.loc, list: list.filter((c) => shown.has(c.id)), hot: null, at: [] };
    if (!st.list.length) return;
    const wrap = document.createElement("div");
    wrap.className = "w7tmap";
    const cv = document.createElement("canvas");
    cv.setAttribute("role", "img");
    wrap.append(cv);
    const listEl = group.querySelector(".alist");
    group.insertBefore(wrap, listEl || null);
    const redraw = () => { try { paint(cv, st); } catch {} };
    const hot = (id) => { if (st.hot !== id) { st.hot = id; redraw(); } };
    btns.forEach((b) => {
      const id = b.dataset.act;
      b.addEventListener("pointerenter", () => hot(id));
      b.addEventListener("pointerleave", () => hot(null));
      b.addEventListener("focus", () => hot(id));
      b.addEventListener("blur", () => hot(null));
      b.addEventListener("touchstart", () => hot(id), { passive: true });
    });
    // 地図の行き先を押す：同じ選択肢のボタンを押す
    cv.addEventListener("click", (ev) => {
      const r = cv.getBoundingClientRect();
      const px = ev.clientX - r.left, py = ev.clientY - r.top;
      let best = null, bd = 22;
      st.at.forEach((a) => { const d = Math.hypot(a.sx - px, a.sy - py); if (d < bd) { bd = d; best = a; } });
      if (!best) return;
      const b = btns.find((x) => x.dataset.act === best.id);
      if (!b || b.disabled) { hot(best.id); return; }
      if (st.hot === best.id || ev.pointerType === "mouse" || !("ontouchstart" in window)) b.click();
      else hot(best.id); // スマホ：一度目は光らせるだけ。二度目で選ぶ
    });
    cv.addEventListener("pointermove", (ev) => {
      if (ev.pointerType !== "mouse") return;
      const r = cv.getBoundingClientRect();
      const near = st.at.find((a) => Math.hypot(a.sx - (ev.clientX - r.left), a.sy - (ev.clientY - r.top)) < 18);
      cv.style.cursor = near ? "pointer" : "default";
      hot(near ? near.id : null);
    });
    requestAnimationFrame(redraw);
  }

  const render0 = ui.render;
  ui.render = (...a) => {
    const r = render0(...a);
    try { attach(); } catch (e) { /* 地図が描けなくても画面は止めない */ }
    return r;
  };
  G.w7.travelMap = { attach, paint };
})(globalThis.G = globalThis.G || {});
