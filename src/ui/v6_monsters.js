// V6：持ち主が作った魔物の絵（assets/monsters/<id>.webp。tools/assets.mjs）を戦闘で描く。G.ASSETS["monsters/<id>"] は外のファイルの形（既定）なら
// 25 枚ずつのスプライト（monsters/packs/monsters-<n>.svg）の「#xywh=x,y,w,h」（切り出す場所。A12）、埋め込み（--embed）なら data URI。
// スプライトは一つのファイルにつき一度だけ読み、その升目を切り出して使う。人物の絵（portraits/<id>）も同じ形（portraits/packs/*.svg）。
// art_monsters.js の入口 G.paintMonster を置き換える。画像があればそれを描き、無ければ（読み込み前・読めないときも）何も描かない（A10：canvas の魔物の絵はやめた）。
// 読み込み前に描けなかった魔物は、読み終わったら画面を描き直す（G.ui.repaint）。
// 人の姿の敵（docs/art/monsters.json の people。コノハ・ベルナなど）と、人の姿の絵がある使徒（APOSTLE）は、人物の生成画像（portraits/<id>）を立たせて描く。
// 画像は白い無地の背景で作る（docs/art/style_monsters.json）。描く前に一度だけ、縁から続く白を消し、周りをぼかし、足元を闇に沈めて、戦闘の背景になじませる。
// 出来事・仲間の胸から上の魔物（who.kind "foe"）は v4_assets.js が G.v6Sprite で切り取って描く。
// 描く物の一覧と、Stable Diffusion に入れる特徴のタグは docs/art/monsters.md（機械で読める形は docs/art/monsters.json）。レーン A（絵）
(function (G) {
  // 一覧で same_as を付けた敵（色違いなど）→ その絵の id。docs/art/monsters.json と同じにする（tests/checks/v6_monsters.mjs が見る）
  const SAME = {};
  G.V6_SAME = SAME;
  // 人の姿の敵 → 人物の絵の id（docs/art/monsters.json の people と同じにする。tests/checks/v6_monsters.mjs が見る）
  const PEOPLE = { c4_musette: "musette", c5_violaine: "violaine", c5_severin: "severin", c8_graul: "graul", c2_nora: "nora", c2_angelica: "angelica", c2_zork: "zork", w1_konoha: "konoha", e2_berna: "berna" };
  G.V6_PEOPLE = PEOPLE;
  // 使徒（D.E3.FOES。戦いが始まるまで D.ENEMIES にいない）で、人の姿の絵がある者は、その絵で描く（A10）。
  // 人の姿の無い使徒（ルアマリス・咎追いなど 10 体）は魔物の絵（monsters/<id>）で描く
  const APOSTLE = { e3_mirza: "mirza", e3_zalve: "zalve", e3_aurelia: "aurelia", e3_yoihime: "yoihime", e3_chezar: "chezar", e3_yura: "yura", e3_azlag: "azlag", e3_salphiel: "salphiel", e3_yuzuel: "yuzuel" };
  G.V6_APOSTLE = APOSTLE;
  const A = () => G.ASSETS || {};
  // 鍵は「monsters/<id>」か「portraits/<id>」（G.ASSETS の鍵）。無ければ null（絵を出さない）
  G.v6ArtKey = (id) => {
    if (!id) return null;
    const k = "monsters/" + (SAME[id] || id);
    if (A()[k]) return k;
    const pid = PEOPLE[id] || APOSTLE[id];
    const p = pid && "portraits/" + pid;
    return p && A()[p] ? p : null;
  };
  G.v6MonsterKey = (f) => { const k = f && G.v6ArtKey(f.id); return k && k.startsWith("monsters/") ? k.slice(9) : null; };

  // ---------------------------------------------------------------- 読む・なじませる
  const imgs = {}, sprites = {}; // imgs：ファイル（src）→ Image（同じスプライトの魔物みなで一つ）。sprites：鍵 → なじませた絵
  // 鍵の値 → { src, rect }。スプライトの升目なら rect（x, y, w, h）、1 枚の絵なら null（絵の全体）
  const SPRITE = /#xywh=(\d+),(\d+),(\d+),(\d+)$/;
  const where = (key) => {
    const v = String(A()[key] || "");
    const m = SPRITE.exec(v);
    return m ? { src: v.slice(0, m.index), rect: m.slice(1, 5).map(Number) } : { src: v, rect: null };
  };
  G.v6Where = (key) => (key && A()[key] ? where(key) : null);
  const hasDoc = () => typeof document !== "undefined" && !!document.createElement;
  const ready = (img) => img && !img.v6bad && img.complete && (img.naturalWidth || img.width) > 0;
  let again = 0; // 読み込み前に描けなかった魔物があれば、読み終わったときに画面を描き直す
  const repaint = () => {
    if (again || typeof setTimeout !== "function") return;
    again = setTimeout(() => { again = 0; try { if (G.ui && G.ui.repaint && G.S && G.S.combat) G.ui.repaint(); } catch (e) { /* 描き直しに失敗しても止めない */ } }, 30);
  };
  const image = (key) => {
    const src = where(key).src;
    if (imgs[src]) return imgs[src];
    const img = new Image();
    img.v6bad = false;
    img.addEventListener("error", () => { img.v6bad = true; });
    img.addEventListener("load", () => { if (img.v6want) repaint(); });
    img.src = src;
    return (imgs[src] = img);
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
    // スプライトの升目なら、その升目だけを切り出す（なじませるのも升目ごと）
    const rect = where(id).rect;
    const W = rect ? rect[2] : img.naturalWidth || img.width, H = rect ? rect[3] : img.naturalHeight || img.height;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    // 人の姿の敵：白い背景を消せれば、消した絵を立たせる（A13。a13_cutout.js。立ち絵と同じ鍵で覚える）
    const cut = id.startsWith("portraits/") && G.a13 && G.a13.cutout ? G.a13.cutout(id.slice(10), img, rect) : null;
    if (cut) g.drawImage(cut, 0, 0, W, H);
    else if (rect) g.drawImage(img, rect[0], rect[1], W, H, 0, 0, W, H);
    else g.drawImage(img, 0, 0);
    if (id.startsWith("portraits/")) return (sprites[id] = person(c, g, W, H));
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
  // 人の姿の敵：胸から上の絵（背景つき）の縁と下をぼかして、戦闘の背景の上に立たせる
  function person(c, g, W, H) {
    g.globalCompositeOperation = "destination-in";
    const r = g.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.3, W / 2, H * 0.42, Math.max(W, H) * 0.62);
    r.addColorStop(0, "rgba(0,0,0,1)"); r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r; g.fillRect(0, 0, W, H);
    const b = g.createLinearGradient(0, H * 0.72, 0, H);
    b.addColorStop(0, "rgba(0,0,0,1)"); b.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = b; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "source-over";
    return c;
  }
  // 出来事・仲間の胸から上の魔物（v4_assets.js）：読み終わっていれば背景を消した絵、まだなら null（読み終わったら then を呼ぶ）
  G.v6Sprite = (id, then) => {
    const key = G.v6ArtKey(id);
    if (!key || typeof Image !== "function") return null;
    const img = image(key);
    if (ready(img)) return sprite(key, img);
    if (then && !img.v6bad) img.addEventListener("load", then, { once: true });
    return null;
  };

  // 魔物の絵は、最初に読み始めておく（戦闘が始まったときに間に合うように）。外のファイルの形では、起動の読み込みと取り合わないよう少し後で
  const preload = () => { for (const k of Object.keys(A())) if (k.startsWith("monsters/")) image(k); };
  if (typeof Image === "function") {
    if (G.ASSET_MODE === "files" && typeof setTimeout === "function") setTimeout(preload, 1500);
    else preload();
  }

  // ---------------------------------------------------------------- 描く（x：真ん中、base：足元、s：大きさ。art_monsters.js と同じ）
  G.paintMonster = (ctx, x, base, s, f) => {
    f = f || {};
    const key = typeof Image === "function" ? G.v6ArtKey(f.id) : null;
    const img = key && image(key);
    if (!ready(img)) { if (img && !img.v6bad) img.v6want = true; return; } // 読み終わるまで（読めなければずっと）何も描かない
    const sp = sprite(key, img);
    const D = Math.min(s * 1.3, base * 1.03);
    ctx.save();
    if (key.startsWith("portraits/")) {
      // 人の姿の敵：胸から上の絵（4:5）を、足元の少し上まで
      const hh = D * 0.95, ww = hh * 0.8;
      ctx.drawImage(sp, x - ww / 2, base - hh, ww, hh);
    } else {
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.beginPath(); ctx.ellipse(x, base - 1, D * 0.3, D * 0.04, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(sp, x - D / 2, base - D * 0.97, D, D);
    }
    ctx.restore();
  };
})(globalThis.G = globalThis.G || {});
