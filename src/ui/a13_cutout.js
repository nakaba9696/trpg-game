// A13：立ち絵（人物の絵。白い無地の背景で作る。docs/art/style.json）の白い背景を消して透明にし、背景の絵になじませる。
// 魔物の絵（v6_monsters.js の keyOut）と同じ考え：上と左右の縁からつながった、背景の色（隅の色）に近い所だけを塗りつぶしで消すので、
// 服や肌の白・目のハイライトは線画に囲まれて縁とつながらず、残る。縁とつながらない白（腕と体のあいだなど）は、白い服と見分けられないので残す。
// 消した所との境目は、白との混ざりを戻して（白い縁取りを残さない）、1px ぼかす。
// 描くのは v4_assets.js：絵を読み終わったあと、同じ鍵（基本の絵・表情の差分）は一度だけ処理して覚えておく（G.a13.cutout）。
// 画素を読めないとき（file:// で開いたときなど）は null を返し、v4_assets.js は元の絵のまま描く（壊さない）。
// 消せた絵の canvas には cut の印が付き、CSS（ui/a13_cutout.css）は縁を四角くぼかす覆いをやめて、足元だけを背景へ溶かす。レーン A（絵）
(function (G) {
  const A13 = (G.a13 = G.a13 || {});
  // 縁とつながらない背景を消す決まり：背景の色との差・広さの下限・まわりが線画に接する割合・線画とみなす濃さ
  const POCKET_TOL = 7, POCKET_MIN = 40, POCKET_INK = 0.9, DARK = 180;
  const LIGHT = 226, LIGHT_SPREAD = 24, TOL = 14; // 背景の色（隅の色）がこれより明るく色が薄いこと・背景とみなす色の幅

  // px：RGBA の配列（ImageData.data）を、その場で書き換える。返り値：消した画素の割合（0〜1）
  A13.keyOut = (p, W, H) => {
    const n = W * H;
    const bg = new Uint8Array(n), q = new Int32Array(n);
    const mn = (i) => Math.min(p[i * 4], p[i * 4 + 1], p[i * 4 + 2]);
    const mx = (i) => Math.max(p[i * 4], p[i * 4 + 1], p[i * 4 + 2]);
    // 背景の色：上と左右の縁の 8×8 の升（上の隅・少し内側・4 分の 1・真ん中、左右の真ん中）のうち、揃っていて白に近いもの（どれかに近ければ背景）。
    // 隅に木の枝や影がかかっていても、ほかの升で決まる。どれも白に近くなければ白い背景の絵ではないので、何も消さない
    const patch = (x0, y0) => {
      const sum = [0, 0, 0], lo = [255, 255, 255], hi = [0, 0, 0];
      let k = 0;
      for (let y = y0; y < Math.min(H, y0 + 8); y++) for (let x = x0; x < Math.min(W, x0 + 8); x++) {
        const i = y * W + x;
        for (let c = 0; c < 3; c++) { const v = p[i * 4 + c]; sum[c] += v; lo[c] = Math.min(lo[c], v); hi[c] = Math.max(hi[c], v); }
        k++;
      }
      const avg = sum.map((v) => v / (k || 1));
      const ok = k && Math.min(...avg) > LIGHT && Math.max(...avg) - Math.min(...avg) < LIGHT_SPREAD && hi.every((v, c) => v - lo[c] < TOL);
      return ok ? avg : null;
    };
    const cx = Math.max(0, (W >> 1) - 4), cy = Math.max(0, (H >> 1) - 4), rx = Math.max(0, W - 8);
    const q1 = Math.max(0, (W >> 2) - 4), q3 = Math.max(0, ((W * 3) >> 2) - 4), in1 = Math.min(rx, 32), in2 = Math.max(0, rx - 32);
    const refs = [patch(0, 0), patch(rx, 0), patch(cx, 0), patch(0, cy), patch(rx, cy), patch(q1, 0), patch(q3, 0), patch(in1, 0), patch(in2, 0)].filter(Boolean);
    if (!refs.length) return 0;
    // 縁から消すのは、背景の色に近い所だけ（クリーム色の服の裾が白に溶けていても、そこで止まる）
    const light = (i) => refs.some((r) => Math.abs(p[i * 4] - r[0]) < TOL && Math.abs(p[i * 4 + 1] - r[1]) < TOL && Math.abs(p[i * 4 + 2] - r[2]) < TOL);
    let qt = 0;
    const seed = (i) => { if (!bg[i] && light(i)) { bg[i] = 1; q[qt++] = i; } };
    // 下の縁は胸から下の服で切れているので、種にしない（白い服を消さないように）。上と左右から
    for (let x = 0; x < W; x++) seed(x);
    for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
    for (let h = 0; h < qt; h++) {
      const i = q[h], x = i % W;
      if (x > 0) seed(i - 1);
      if (x < W - 1) seed(i + 1);
      if (i >= W) seed(i - W);
      if (i < n - W) seed(i + W);
    }
    // 縁とつながらない背景（耳と髪のあいだ、腕と体のあいだなど）：背景の色にごく近く、まわりのほとんどが濃い線画（3px 以内）に囲まれた所だけ消す。
    // 白い服の明るい所は、まわりが柔らかい影の色なので残る
    const near = (i) => refs.some((r) => Math.abs(p[i * 4] - r[0]) < POCKET_TOL && Math.abs(p[i * 4 + 1] - r[1]) < POCKET_TOL && Math.abs(p[i * 4 + 2] - r[2]) < POCKET_TOL);
    const dark = (i) => mx(i) < DARK;
    const lined = (i) => {
      const x0 = i % W, y0 = (i - x0) / W;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const x = x0 + dx, y = y0 + dy;
        if (x >= 0 && x < W && y >= 0 && y < H && dark(y * W + x)) return true;
      }
      return false;
    };
    const seen = new Uint8Array(n);
    for (let s0 = 0; s0 < n; s0++) {
      if (bg[s0] || seen[s0] || !near(s0)) continue;
      let t = 0;
      q[t++] = s0; seen[s0] = 1;
      let edge = 0, inked = 0;
      for (let h = 0; h < t; h++) {
        const i = q[h], x = i % W;
        let out = false;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i >= W ? i - W : -1, i < n - W ? i + W : -1]) {
          if (j < 0) continue;
          if (near(j) && !bg[j]) { if (!seen[j]) { seen[j] = 1; q[t++] = j; } } else out = true;
        }
        if (out) { edge++; if (lined(i)) inked++; }
      }
      if (t >= POCKET_MIN && edge && inked / edge >= POCKET_INK) for (let h = 0; h < t; h++) bg[q[h]] = 1;
    }
    // 消す。境目の 2px は白との混ざりを戻して（白い縁取りを残さない）薄くし、1px ぼかす
    let gone = 0;
    const ring = new Uint8Array(n); // 1：背景に接する、2：その内側
    for (let i = 0; i < n; i++) {
      if (bg[i]) continue;
      const x = i % W;
      if ((x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) || (i >= W && bg[i - W]) || (i < n - W && bg[i + W])) ring[i] = 1;
    }
    for (let i = 0; i < n; i++) {
      if (bg[i] || ring[i]) continue;
      const x = i % W;
      if ((x > 0 && ring[i - 1] === 1) || (x < W - 1 && ring[i + 1] === 1) || (i >= W && ring[i - W] === 1) || (i < n - W && ring[i + W] === 1)) ring[i] = 2;
    }
    for (let i = 0; i < n; i++) {
      if (bg[i]) { p[i * 4 + 3] = 0; gone++; continue; }
      if (!ring[i]) continue;
      // 白と混ざった明るさの分だけ透かす（線画の黒はそのまま、白っぽい縁ほど薄く）
      const a = Math.max(0, Math.min(1, ((255 - mn(i)) / 255) * (ring[i] === 1 ? 3 : 6)));
      const al = ring[i] === 1 ? Math.min(a, 0.85) : a; // 背景に接する 1px は少し透かす（ぼかし）
      if (al >= 1) continue;
      if (al > 0.02) for (let c = 0; c < 3; c++) p[i * 4 + c] = Math.max(0, Math.min(255, Math.round((p[i * 4 + c] - (1 - al) * 255) / al)));
      p[i * 4 + 3] = Math.round(p[i * 4 + 3] * al);
    }
    return gone / n;
  };

  // 絵（Image。rect があればスプライトのその升目）の背景を消した canvas を返す。同じ鍵は一度だけ処理する。
  // 画素を読めない・DOM が無い・ほとんど消えない（白い背景でない絵）ときは null（元の絵のまま描く）
  const cache = {};
  A13.MIN = 0.03; // 消えた所がこれより少なければ、白い背景の絵ではないとみなす
  A13.cutout = (key, img, rect) => {
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
      if (A13.keyOut(d.data, w, h) >= A13.MIN) { g.putImageData(d, 0, 0); out = c; }
    } catch (e) { out = null; }
    return (cache[key] = out);
  };
  A13.forget = () => { for (const k of Object.keys(cache)) delete cache[k]; };
})(globalThis.G = globalThis.G || {});
