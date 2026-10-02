// V6：持ち主が作った魔物の絵（assets/monsters/<id>.webp。tools/assets.mjs）を戦闘で描く。G.ASSETS["monsters/<id>"] は外のファイルの形（既定）なら
// HTML の隣の monsters/<id>.webp への相対パス、埋め込み（--embed）なら data URI。どちらも Image の src にそのまま使う。
// art_monsters.js の入口 G.paintMonster を包むだけ。画像があればそれを、無ければ（読み込み前・読めないときも）今の canvas の絵を描く。
// 画像は白い無地の背景で作る（docs/art/style_monsters.json）。描く前に一度だけ、縁から続く白を消し、周りをぼかし、足元を闇に沈めて、戦闘の背景になじませる。
// 出来事・仲間の胸から上の絵（art_people.js が look を付けて呼ぶ）は、切り取り方が canvas の絵に合わせてあるので今の絵のまま。
// 描く物の一覧と、Stable Diffusion に入れる特徴のタグは docs/art/monsters.md（機械で読める形は docs/art/monsters.json）。レーン A（絵）
(function (G) {
  // 一覧で same_as を付けた敵（色違いなど）→ その絵の id。docs/art/monsters.json と同じにする（tests/checks/v6_monsters.mjs が見る）
  const SAME = {};
  G.V6_SAME = SAME;
  const A = () => G.ASSETS || {};
  G.v6MonsterKey = (f) => {
    if (!f || !f.id || Object.prototype.hasOwnProperty.call(f, "look")) return null;
    const id = SAME[f.id] || f.id;
    return A()["monsters/" + id] ? id : null;
  };

  // ---------------------------------------------------------------- 読む・なじませる
  const imgs = {}, sprites = {};
  const hasDoc = () => typeof document !== "undefined" && !!document.createElement;
  const ready = (img) => img && !img.v6bad && img.complete && (img.naturalWidth || img.width) > 0;
  const image = (id) => {
    if (imgs[id]) return imgs[id];
    const img = new Image();
    img.v6bad = false;
    img.addEventListener("error", () => { img.v6bad = true; });
    img.src = A()["monsters/" + id];
    return (imgs[id] = img);
  };
  // 縁から続く白っぽい所（背景）を消す。魔物の中の白（目・牙）は縁と繋がっていないので残る
  function keyOut(g, W, H) {
    const d = g.getImageData(0, 0, W, H), p = d.data, n = W * H;
    const bg = new Uint8Array(n), q = new Int32Array(n);
    let qt = 0;
    const light = (i) => {
      const r = p[i * 4], gg = p[i * 4 + 1], b = p[i * 4 + 2];
      const mn = Math.min(r, gg, b), mx = Math.max(r, gg, b);
      return mn > 224 && mx - mn < 26;
    };
    const seed = (i) => { if (!bg[i] && light(i)) { bg[i] = 1; q[qt++] = i; } };
    for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
    for (let qh = 0; qh < qt; qh++) {
      const i = q[qh], x = i % W;
      if (x > 0) seed(i - 1);
      if (x < W - 1) seed(i + 1);
      if (i >= W) seed(i - W);
      if (i < n - W) seed(i + W);
    }
    // 縁と繋がっていなくても、大きな真っ白の所（脚のあいだなど）は背景。小さな白（目・牙）は残す
    const white = (i) => { const mn = Math.min(p[i * 4], p[i * 4 + 1], p[i * 4 + 2]); return mn > 236 && Math.max(p[i * 4], p[i * 4 + 1], p[i * 4 + 2]) - mn < 16; };
    const seen = new Uint8Array(n), big = n * 0.006;
    for (let s = 0; s < n; s++) {
      if (bg[s] || seen[s] || !white(s)) continue;
      let t = 0;
      q[t++] = s; seen[s] = 1;
      for (let h = 0; h < t; h++) {
        const i = q[h], x = i % W;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < n && !seen[j] && !bg[j] && white(j)) { seen[j] = 1; q[t++] = j; }
      }
      if (t > big) for (let h = 0; h < t; h++) bg[q[h]] = 1;
    }
    for (let i = 0; i < n; i++) {
      if (bg[i]) { p[i * 4 + 3] = 0; continue; }
      const x = i % W;
      const edge = (x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) || (i >= W && bg[i - W]) || (i < n - W && bg[i + W]);
      if (edge) { const mn = Math.min(p[i * 4], p[i * 4 + 1], p[i * 4 + 2]); p[i * 4 + 3] = Math.min(255, (255 - mn) * 5); }
    }
    g.putImageData(d, 0, 0);
  }
  function sprite(id, img) {
    if (sprites[id]) return sprites[id];
    if (!hasDoc()) return img; // テスト（DOM なし）はそのまま
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    try { keyOut(g, W, H); } catch (e) { /* 読めない画像は消さずに、ぼかしだけ */ }
    // 周りをぼかす（丸く）・足元を消す
    g.globalCompositeOperation = "destination-in";
    const r = g.createRadialGradient(W / 2, H * 0.54, Math.min(W, H) * 0.34, W / 2, H * 0.54, Math.min(W, H) * 0.58);
    r.addColorStop(0, "rgba(0,0,0,1)"); r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r; g.fillRect(0, 0, W, H);
    const b = g.createLinearGradient(0, H * 0.84, 0, H);
    b.addColorStop(0, "rgba(0,0,0,1)"); b.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = b; g.fillRect(0, 0, W, H); // destination-in は塗らない所を消すので、全体を塗る（上はグラデーションの端の色＝そのまま）
    // 色を少しくすませ、下から闇に沈める（art_monsters.js の仕上げと同じ向き）
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(92,82,74,.16)"; g.fillRect(0, 0, W, H);
    const k = g.createLinearGradient(0, H * 0.55, 0, H);
    k.addColorStop(0, "rgba(10,6,10,0)"); k.addColorStop(1, "rgba(10,6,10,.55)");
    g.fillStyle = k; g.fillRect(0, H * 0.55, W, H * 0.45);
    g.globalCompositeOperation = "source-over";
    return (sprites[id] = c);
  }
  // 魔物の絵は、最初に読み始めておく（戦闘が始まったときに間に合うように）。外のファイルの形では、起動の読み込みと取り合わないよう少し後で
  const preload = () => { for (const k of Object.keys(A())) if (k.startsWith("monsters/")) image(k.slice(9)); };
  if (typeof Image === "function") {
    if (G.ASSET_MODE === "files" && typeof setTimeout === "function") setTimeout(preload, 1500);
    else preload();
  }

  // ---------------------------------------------------------------- 描く（x：真ん中、base：足元、s：大きさ。art_monsters.js と同じ）
  const paint0 = G.paintMonster;
  if (paint0) G.paintMonster = (ctx, x, base, s, f) => {
    f = f || {};
    const id = typeof Image === "function" ? G.v6MonsterKey(f) : null;
    const img = id && image(id);
    if (!ready(img)) return paint0(ctx, x, base, s, f);
    const sp = sprite(id, img);
    const D = Math.min(s * 1.3, base * 1.03);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.beginPath(); ctx.ellipse(x, base - 1, D * 0.3, D * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(sp, x - D / 2, base - D * 0.97, D, D);
    ctx.restore();
  };
})(globalThis.G = globalThis.G || {});
