// W5：世界地図のエンジン側（DOM なし。画面は ui/w5_map.js）。
// 1. 形：D.W5_MAP の粗い海岸線を決まった種で細かくし（毎回同じ）、陸か海か・国（region）の色分けを答える
// 2. 行った場所の記録：G.P.codex.places = { id: { by, date, at } }。冒険をまたいで残る（図鑑と同じ。死んでも・引退しても）
//    今の冒険で行った場所は S.visited（core.js）。着いたとき（G.arrive）と冒険の始まり（G.newGame）に写す。古いセーブは地図を開いたときに写す
// 3. 見え方：場所ごとに here（今いる）/ now（今の冒険で行った）/ past（前の冒険で行った）/ heard（今の冒険で行った場所から道がつながる＝道標で名前だけ知る）/ none（印だけ）
//    道は、両端のどちらかに行ったことがあれば見える
// 乱数は G.rand を使わない（地図の形はゲームの乱数と関係なく、いつも同じにしたいので、決まった種の小さな乱数を使う）。レーン W（W5）
(function (G) {
  const D = G.data;
  const W5 = (G.w5 = G.w5 || {});
  const M = () => D.W5_MAP;

  // ---------------------------------------------------------------- 決まった乱数と雑音
  W5.rng = (seed) => {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  const hash = (i, j, s) => {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const vnoise = (x, y, s) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  W5.noise = (x, y, s) => (vnoise(x, y, s) * 0.6 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.28 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.12);

  // ---------------------------------------------------------------- 形
  // 辺を半分に割り、真ん中を横へずらす（決まった種）。長さが min を切るまで
  const roughen = (pts, seed, amp, min) => {
    const r = W5.rng(seed);
    const out = [];
    const split = (a, b, depth) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len < min || depth > 9) { out.push(a); return; }
      const off = (r() - 0.5) * len * amp;
      const m = [(a[0] + b[0]) / 2 - (dy / len) * off, (a[1] + b[1]) / 2 + (dx / len) * off];
      split(a, m, depth + 1);
      split(m, b, depth + 1);
    };
    pts.forEach((p, i) => split(p, pts[(i + 1) % pts.length], 0));
    return out;
  };
  const ellipse = (e, seed) => {
    const r = W5.rng(seed);
    const n = 14;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2, k = 0.86 + r() * 0.26;
      const x = Math.cos(t) * e.rx * k, y = Math.sin(t) * e.ry * k;
      pts.push([e.x + x * Math.cos(e.rot || 0) - y * Math.sin(e.rot || 0), e.y + x * Math.sin(e.rot || 0) + y * Math.cos(e.rot || 0)]);
    }
    return roughen(pts, seed + 1, 0.3, 0.5);
  };
  let shape = null;
  W5.shape = () => {
    if (shape && shape.src === M()) return shape;
    const m = M();
    shape = {
      src: m,
      main: roughen(m.land, 1127, 0.32, 0.7),
      islands: m.islands.map((e, i) => ellipse(e, 300 + i * 17)),
      lakes: m.lakes.map((e, i) => ellipse(e, 700 + i * 23)),
      rivers: m.rivers.map((pts, i) => { const r = W5.rng(900 + i); const o = []; pts.forEach((p, k) => { o.push(p); const q = pts[k + 1]; if (q) for (let s = 1; s < 4; s++) { const t = s / 4; o.push([p[0] + (q[0] - p[0]) * t + (r() - 0.5) * 1.1, p[1] + (q[1] - p[1]) * t + (r() - 0.5) * 1.1]); } }); return o; }),
    };
    return shape;
  };
  const inside = (pts, x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  W5.onLand = (x, y) => {
    const s = W5.shape();
    if (s.lakes.some((p) => inside(p, x, y))) return false;
    return inside(s.main, x, y) || s.islands.some((p) => inside(p, x, y));
  };
  const segDist = (x, y, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)) : 0;
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
  };
  // 一番近い岸（海・湖）までの距離
  W5.coastDist = (x, y) => {
    const s = W5.shape();
    let best = Infinity;
    [s.main, ...s.islands, ...s.lakes].forEach((p) => { for (let i = 0; i < p.length; i++) best = Math.min(best, segDist(x, y, p[i], p[(i + 1) % p.length])); });
    return best;
  };

  // ---------------------------------------------------------------- 国（region）
  W5.regionNames = () => {
    const seen = [];
    Object.keys(M().regions).forEach((r) => { if (Object.values(D.LOCS).some((L) => L.region === r)) seen.push(r); });
    Object.values(D.LOCS).forEach((L) => { if (L.region && !seen.includes(L.region)) seen.push(L.region); });
    return seen;
  };
  W5.regionStyle = (r) => M().regions[r] || M().fallback;
  // その地点の国：一番近い場所の region。距離に場所ごとの雑音を掛けて国境を曲げる（掛け算なので、場所そのものの点は必ずその場所の国）
  W5.regionAt = (x, y) => {
    let best = null, bd = Infinity, i = 0;
    for (const L of Object.values(D.LOCS)) {
      i++;
      if (typeof L.x !== "number") continue;
      const n = (W5.noise(x * 0.13 + i * 3.7, y * 0.13 + i * 1.9, 41) - 0.5) * 0.8;
      const d = Math.hypot(x - L.x, y - L.y) * (1 + n);
      if (d < bd) { bd = d; best = L.region; }
    }
    return best;
  };
  // 国の名前（初めから見える）と置き場所
  W5.regionLabels = () => W5.regionNames().map((r) => {
    const st = W5.regionStyle(r);
    let at = st.label;
    if (!at) {
      const ls = Object.values(D.LOCS).filter((L) => L.region === r && typeof L.x === "number");
      at = [ls.reduce((a, L) => a + L.x, 0) / ls.length, ls.reduce((a, L) => a + L.y, 0) / ls.length + 3];
    }
    return { name: r, x: at[0], y: at[1], size: st.size || 0.6, vert: !!st.vert, dread: !!st.dread };
  });

  // ---------------------------------------------------------------- 行った場所の記録（冒険をまたぐ）
  W5.places = () => {
    if (!G.P) G.P = { trophies: {}, graves: [] };
    const c = G.P.codex || (G.P.codex = {});
    return c.places || (c.places = {});
  };
  const stamp = (S) => ({ by: S && S.profile ? `${S.clsName || ""} ${S.profile.name || ""}`.trim() : "", date: S && G.dateOf ? G.dateOf(S.day) : "", at: Date.now() });
  // 今の冒険で行った場所を、冒険をまたぐ記録へ写す。新しく写した数を返す
  W5.record = (S) => {
    S = S === undefined ? G.S : S;
    if (!S || !S.visited) return 0;
    const p = W5.places();
    let n = 0;
    Object.keys(S.visited).forEach((id) => { if (S.visited[id] && D.LOCS[id] && !p[id]) { p[id] = stamp(S); n++; } });
    if (n && G.onCodexChange) try { G.onCodexChange(); } catch {}
    return n;
  };
  if (G.arrive) {
    const baseArrive = G.arrive;
    G.arrive = (dest) => { const r = baseArrive(dest); W5.record(); return r; };
  }
  if (G.newGame) {
    const baseNewGame = G.newGame;
    G.newGame = (opt) => { const S = baseNewGame(opt); W5.record(S); return S; };
  }
  // 図鑑をまとめるとき（claude.ai のデータとこのブラウザ）に、行った場所も両方を残す（早いほうの記録）
  if (G.codexMerge) {
    const baseMerge = G.codexMerge;
    G.codexMerge = (a, b) => {
      const out = baseMerge(a, b);
      const pl = {};
      [a, b].forEach((c) => Object.entries((c && c.places) || {}).forEach(([id, e]) => { const o = pl[id]; if (!o || (e.at || 0) < (o.at || 0)) pl[id] = { ...e }; }));
      out.places = pl;
      return out;
    };
  }

  // ---------------------------------------------------------------- 見え方
  W5.status = (id, S) => {
    S = S === undefined ? G.S : S;
    if (S && S.loc === id && !S.over) return "here";
    if (S && S.visited && S.visited[id]) return "now";
    if ((G.P && G.P.codex && G.P.codex.places || {})[id]) return "past";
    if (S && S.visited) {
      const L = D.LOCS[id];
      const near = Object.keys(Object.assign({}, L.links, L.sea)).some((to) => S.visited[to]);
      if (near) return "heard";
    }
    return "none";
  };
  W5.KNOWN = { here: 1, now: 1, past: 1 };
  // 地図に置く場所の一覧。name は見えるときだけ（heard は faint：名前だけ薄く）
  W5.marks = (S) => {
    S = S === undefined ? G.S : S;
    return Object.entries(D.LOCS).filter(([, L]) => typeof L.x === "number" && typeof L.y === "number").map(([id, L]) => {
      const st = W5.status(id, S);
      const rec = W5.places()[id] || null;
      return { id, x: L.x, y: L.y, type: L.type, region: L.region, danger: L.danger || 0, status: st, name: st === "none" ? null : L.name, faint: st === "heard", rec };
    });
  };
  // 道の描く線：両端と、そのあいだの曲がり角（D.W5_MAP.via。キーは id を名前順に「a|b」、角は a から b へ）。
  // 角の無い道はまっすぐ。地図の上で、ほかの場所の印の上を通って「そこからも行ける」ように見えないように曲げる（W7）
  W5.roadPts = (a, b, kind) => {
    const [p, q] = a < b ? [a, b] : [b, a];
    const via = ((M().via || {})[`${kind === "sea" ? "~" : ""}${p}|${q}`] || []).map((v) => [v[0], v[1]]);
    const A = D.LOCS[p], B = D.LOCS[q];
    const pts = [[A.x, A.y], ...via, [B.x, B.y]];
    return a < b ? pts : pts.reverse();
  };
  // 描く線をなぞった点（画面と同じ曲がり方：陸は角をまっすぐ、船は角をなめらかに・角が無ければ少しふくらませる）。テストが使う
  W5.roadSamples = (pts, kind, n = 12) => {
    const out = [];
    const quad = (a, c, b) => { for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } };
    if (kind !== "sea") { pts.slice(1).forEach((b, k) => { const a = pts[k]; for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n)]); }); return out; }
    if (pts.length === 2) { const [a, b] = pts, dx = b[0] - a[0], dy = b[1] - a[1]; quad(a, [(a[0] + b[0]) / 2 + dy * 0.12, (a[1] + b[1]) / 2 - dx * 0.12], b); return out; }
    let from = pts[0];
    for (let i = 1; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1], to = i === pts.length - 2 ? q : [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; quad(from, p, to); from = to; }
    return out;
  };
  // 見える道：陸路（links）と船（sea）。両端のどちらかに行ったことがある道だけ。known は両端とも行ったことがある
  // pts は描く線（W5.roadPts）。描く線は links・sea にある道だけ（tests/checks/w7_map.mjs）
  W5.roads = (S) => {
    S = S === undefined ? G.S : S;
    const out = [];
    const been = (id) => !!W5.KNOWN[W5.status(id, S)];
    Object.entries(D.LOCS).forEach(([id, L]) => {
      [["land", L.links], ["sea", L.sea]].forEach(([kind, m]) => Object.entries(m || {}).forEach(([to, days]) => {
        if (id >= to || !D.LOCS[to]) return;
        const a = been(id), b = been(to);
        if (!a && !b) return;
        out.push({ a: id, b: to, kind, days, known: a && b, pts: W5.roadPts(id, to, kind), gate: !!(G.w7g && (G.w7g.gated(id, to) || G.w7g.gated(to, id))) }); // gate：砦が塞ぐ、人の住まない土地への道（W7g）
      }));
    });
    return out;
  };
  // 数（図鑑の見出し用）
  W5.count = () => ({ been: Object.keys(W5.places()).filter((id) => D.LOCS[id]).length, all: Object.keys(D.LOCS).length });
})(globalThis.G = globalThis.G || {});
