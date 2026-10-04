// A13・A14：白い無地の背景で作った絵（人物の絵：docs/art/style.json、魔物の絵：docs/art/style_monsters.json）の背景を消して透明にし、背景の絵になじませる。
// 消すのは、絵の外周からつながった、背景の色（縁の白に近い升の色）にごく近い所だけ（A14）。線画に囲まれた白（白い服・白い毛皮・白目・歯・光の反射、
// 腕と体のあいだの背景も）は、背景と見分けられないので残す（迷うなら消さない）。
// 境目は 0/1 で切らず、半透明にする（ソフトマット）：境目の数 px は、その画素の色が「背景の色」と「すぐ内側の絵の色」のどこにあるかで透け具合を決め、
// 白と混ざった分を取り除いて色を戻す（色のにじみ抜き。白い縁取りを残さない）。
// 人物は v4_assets.js、魔物（人の姿の敵も）は v6_monsters.js が使う。同じ鍵は一度だけ処理して覚えておく（G.a13.cutout）。
// 画素を読めないとき（file:// で開いたときなど）は null を返し、呼んだ側は元の絵のまま描く（壊さない）。
// 消せた立ち絵の canvas には cut の印が付き、CSS（ui/a13_cutout.css）は縁を四角くぼかす覆いをやめて、足元だけを背景へ溶かす。
// 大きく縮めて描くときは G.a13.draw で段階的に縮める（なめらかに。A14）。レーン A（絵）
(function (G) {
  const A13 = (G.a13 = G.a13 || {});
  const LIGHT = 226, LIGHT_SPREAD = 24; // 背景の色（縁の升の色）がこれより明るく、色が薄いこと
  const PATCH_TOL = 14; // 升の中の色の揺れ（これより揺れる升は背景の色に使わない）
  const TOL = 14; // 外周から塗りつぶすとき、背景とみなす色の幅（背景の色からの、どの色の差もこれ未満）
  const BAND = 3; // 境目の半透明にする幅（px。絵の側）

  // 背景の色の候補：縁の 8×8 の升のうち、揃っていて白に近いもの（隅に物が掛かっていても、ほかの升で決まる）
  function refsOf(p, W, H, bottom) {
    const patch = (x0, y0) => {
      const sum = [0, 0, 0], lo = [255, 255, 255], hi = [0, 0, 0];
      let k = 0;
      for (let y = y0; y < Math.min(H, y0 + 8); y++) for (let x = x0; x < Math.min(W, x0 + 8); x++) {
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) { const v = p[i + c]; sum[c] += v; lo[c] = Math.min(lo[c], v); hi[c] = Math.max(hi[c], v); }
        k++;
      }
      const avg = sum.map((v) => v / (k || 1));
      return k && Math.min(...avg) > LIGHT && Math.max(...avg) - Math.min(...avg) < LIGHT_SPREAD && hi.every((v, c) => v - lo[c] < PATCH_TOL) ? avg : null;
    };
    const rx = Math.max(0, W - 8), by = Math.max(0, H - 8), cy = Math.max(0, (H >> 1) - 4);
    const xs = [0, Math.min(rx, 32), Math.max(0, (W >> 2) - 4), Math.max(0, (W >> 1) - 4), Math.max(0, ((W * 3) >> 2) - 4), Math.max(0, rx - 32), rx];
    const at = xs.map((x) => [x, 0]).concat([[0, cy], [rx, cy]]);
    if (bottom) at.push([0, by], [rx, by]);
    // ほとんど同じ色の候補は一つにまとめる（たいていは真っ白が一つ。比べる数を減らす）
    const out = [];
    for (const r of at.map(([x, y]) => patch(x, y)).filter(Boolean)) if (!out.some((o) => Math.max(Math.abs(o[0] - r[0]), Math.abs(o[1] - r[1]), Math.abs(o[2] - r[2])) < 4)) out.push(r);
    return out;
  }

  // px：RGBA の配列（ImageData.data）を、その場で書き換える。返り値：消した（ほぼ透明にした）画素の割合（0〜1）。白い背景の絵でなければ 0（何もしない）
  // opt.bottom：下の縁からも消す（魔物は足元まで白い背景。人物は胸から下の服で切れているので、白い服を守るため下からは消さない）
  A13.keyOut = (p, W, H, opt = {}) => {
    const n = W * H;
    const refs = refsOf(p, W, H, !!opt.bottom);
    if (!refs.length) return 0;
    // 背景の色からの差（いちばん近い候補との、色ごとの差の最大）と、その候補
    const dist = new Uint8Array(n), near = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      let best = 999, bi = 0;
      for (let r = 0; r < refs.length; r++) {
        const R = refs[r];
        const d = Math.max(Math.abs(p[i * 4] - R[0]), Math.abs(p[i * 4 + 1] - R[1]), Math.abs(p[i * 4 + 2] - R[2]));
        if (d < best) { best = d; bi = r; }
      }
      dist[i] = Math.min(255, best); near[i] = bi;
    }
    // 外周からつながった背景（4 近傍の塗りつぶし）
    const bg = new Uint8Array(n), q = new Int32Array(n);
    let qt = 0;
    const seed = (i) => { if (!bg[i] && dist[i] < TOL) { bg[i] = 1; q[qt++] = i; } };
    for (let x = 0; x < W; x++) { seed(x); if (opt.bottom) seed((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
    for (let h = 0; h < qt; h++) {
      const i = q[h], x = i % W;
      if (x > 0) seed(i - 1);
      if (x < W - 1) seed(i + 1);
      if (i >= W) seed(i - W);
      if (i < n - W) seed(i + W);
    }
    // 境目からの深さ（絵の側に 1..BAND）。背景の側の、絵に接する画素（深さ 0 だが背景の色から少し離れたもの）も半透明の候補
    const depth = new Uint8Array(n);
    let front = [];
    for (let i = 0; i < n; i++) {
      if (bg[i]) continue;
      const x = i % W;
      if ((x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) || (i >= W && bg[i - W]) || (i < n - W && bg[i + W])) { depth[i] = 1; front.push(i); }
    }
    for (let d = 2; d <= BAND; d++) {
      const next = [];
      for (const i of front) {
        const x = i % W;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i >= W ? i - W : -1, i < n - W ? i + W : -1]) if (j >= 0 && !bg[j] && !depth[j]) { depth[j] = d; next.push(j); }
      }
      front = next;
    }
    // すぐ内側の絵の色（境目より内側。半径 BAND+2 のうち、背景の色からいちばん離れていて近い画素。線画があれば線画の色になる）
    const inner = (i) => {
      const x0 = i % W, y0 = (i - x0) / W;
      let best = -1, bd = 1e9;
      const R = BAND + 2;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const x = x0 + dx, y = y0 + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const j = y * W + x;
        if (bg[j] || (depth[j] && depth[j] <= depth[i])) continue; // 自分より内側（深い）の画素だけ
        const score = Math.sqrt(dx * dx + dy * dy) * 12 - dist[j]; // 近くて、背景の色から離れているほどよい
        if (score < bd) { bd = score; best = j; }
      }
      return best;
    };
    // 半透明の度合い：c = a·F + (1−a)·B（F：内側の絵の色、B：背景の色）から a を求める
    const alphaOf = (i) => {
      const B = refs[near[i]];
      const j = inner(i);
      // 内側の絵が近くに無い（背景の中の、圧縮で出た白っぽい点など）：背景に近い色なら消し、離れた色ならそのまま
      if (j < 0) return dist[i] < 48 ? 0 : 1;
      const fb = [p[j * 4] - B[0], p[j * 4 + 1] - B[1], p[j * 4 + 2] - B[2]];
      const len = fb[0] * fb[0] + fb[1] * fb[1] + fb[2] * fb[2];
      if (len < 30 * 30) return 1; // 内側の絵も背景に近い色（白い服の縁など）：透かさない（迷うなら消さない）
      return Math.max(0, Math.min(1, ((p[i * 4] - B[0]) * fb[0] + (p[i * 4 + 1] - B[1]) * fb[1] + (p[i * 4 + 2] - B[2]) * fb[2]) / len));
    };
    // 白と混ざった分を取り除いて色を戻し、透け具合を付ける
    const apply = (i, a) => {
      const B = refs[near[i]];
      if (a <= 0.02) { p[i * 4 + 3] = 0; return; }
      if (a < 1) for (let c = 0; c < 3; c++) p[i * 4 + c] = Math.max(0, Math.min(255, Math.round((p[i * 4 + c] - (1 - a) * B[c]) / a)));
      p[i * 4 + 3] = Math.round(p[i * 4 + 3] * a);
    };
    // 境目の画素の透け具合を、外から内へ深さの順に決める。内側の画素は、外側の隣より透けない（線画に当たったら、その内側はもう透かさない。
    // 線画のすぐ内側の白が透けて穴になるのを防ぐ）
    const alpha = new Float32Array(n);
    for (let d = 1; d <= BAND; d++) for (let i = 0; i < n; i++) {
      if (depth[i] !== d) continue;
      let a = alphaOf(i);
      if (d > 1) {
        const x = i % W;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i >= W ? i - W : -1, i < n - W ? i + W : -1]) if (j >= 0 && depth[j] === d - 1) a = Math.max(a, alpha[j]);
      }
      alpha[i] = a;
    }
    let gone = 0;
    for (let i = 0; i < n; i++) {
      if (!bg[i]) continue;
      // 背景の画素：絵に接していて、背景の色から少し離れている（にじみ）なら薄く残し、それ以外は透明
      const x = i % W;
      const touch = (x > 0 && depth[i - 1] === 1) || (x < W - 1 && depth[i + 1] === 1) || (i >= W && depth[i - W] === 1) || (i < n - W && depth[i + W] === 1);
      if (touch && dist[i] >= 3) apply(i, Math.min(0.35, alphaOf(i)));
      else p[i * 4 + 3] = 0;
      if (p[i * 4 + 3] < 8) gone++;
    }
    for (let i = 0; i < n; i++) if (depth[i]) apply(i, alpha[i]);
    return gone / n;
  };

  // 絵（Image。rect があればスプライトのその升目）の背景を消した canvas を返す。同じ鍵は一度だけ処理する。
  // 画素を読めない・DOM が無い・ほとんど消えない（白い背景でない絵）ときは null（元の絵のまま描く）。opt は keyOut へ
  const cache = {};
  A13.MIN = 0.03; // 消えた所がこれより少なければ、白い背景の絵ではないとみなす
  A13.cutout = (key, img, rect, opt) => {
    if (key in cache) return cache[key];
    if (typeof document === "undefined" || !document.createElement) return null;
    let out = null;
    try {
      const [x, y, w, h] = rect || [0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height];
      if (!w || !h) return null; // まだ大きさが分からない：覚えずに次の機会に
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      g.drawImage(img, x, y, w, h, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h); // file:// などで画素を読めなければ、ここで投げる
      if (A13.keyOut(d.data, w, h, opt) >= A13.MIN) { g.putImageData(d, 0, 0); out = c; }
    } catch (e) { out = null; }
    return (cache[key] = out);
  };
  A13.forget = () => { for (const k of Object.keys(cache)) delete cache[k]; };

  // なめらかに縮めて描く（A14）：半分より小さく縮めるときは、半分ずつ段階的に縮めてから描く（一度に縮めるとギザギザになる）。
  // 縮めた途中の絵は、元の絵と大きさごとに覚えておく（同じ大きさを何度も描くので）
  const steps = typeof WeakMap === "function" ? new WeakMap() : null;
  const smooth = (ctx) => { if ("imageSmoothingEnabled" in ctx || ctx.imageSmoothingEnabled !== undefined) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; } };
  A13.draw = (ctx, src, sx, sy, sw, sh, dx, dy, dw, dh) => {
    smooth(ctx);
    let s = src, x = sx, y = sy, w = sw, h = sh;
    if (typeof document !== "undefined" && document.createElement && dw > 0 && dh > 0 && (dw < sw / 2 || dh < sh / 2)) {
      const key = [sx, sy, sw, sh, Math.round(dw), Math.round(dh)].join(",");
      let memo = steps && steps.get(src);
      if (!memo && steps) { memo = {}; steps.set(src, memo); }
      let done = memo && memo[key];
      if (!done) {
        while (w / 2 > dw && h / 2 > dh) {
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(w / 2)); c.height = Math.max(1, Math.round(h / 2));
          const g = c.getContext("2d");
          if (!g) break;
          smooth(g);
          g.drawImage(s, x, y, w, h, 0, 0, c.width, c.height);
          s = c; x = 0; y = 0; w = c.width; h = c.height;
        }
        done = { s, w, h };
        if (memo) memo[key] = done;
      }
      s = done.s; x = 0; y = 0; w = done.w; h = done.h;
      // 縮めた分、元の切り出し位置も同じ割合で（升目の中の位置は呼んだ側が sx/sy に入れているので、ここでは全体を描く）
    }
    ctx.drawImage(s, x, y, w, h, dx, dy, dw, dh);
  };
})(globalThis.G = globalThis.G || {});
