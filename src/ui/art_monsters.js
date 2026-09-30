// モンスターの絵。画像ファイルは使わず、部品（体・頭・目・口・角・翼・尾・腕・武器・服・模様・色）を組み合わせて canvas に描く。
// G.monsterLook(id, enemy)  … 見た目の指定を決める（DOM なし。テストからも呼べる）
// G.paintMonster(ctx, x, base, s, foe) … foe = { id, shape, eye, boss } を足元 (x, base)・背丈 s で描く
// 見た目の決まり方：敵のデータの look > 下の PRESET[id] > 種類（shape）と id の種から自動。どれも欄ごとに上書きできる。
// 乱数は id から作る（G.rand を使わない）ので、同じ敵はいつも同じ見た目になる。レーン A（絵）が管理
(function (G) {
  // ---------------------------------------------------------------- 小道具
  function rng(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
    return () => { s = (s + 0x6d2b79f5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hex = (c) => { const n = parseInt(String(c).slice(1, 7), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const x = hex(a), y = hex(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
  const pickR = (R, a) => a[Math.floor(R() * a.length)];
  const INK = "#140e12"; // 輪郭の色
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- 決めてある見た目（今いる敵）
  // 新しい敵は、敵のデータに look: {...} を書けばよい（欄の意味は下の monsterLook の auto を参照）
  const PRESET = {
    goblin: { body: "biped", build: "small", skin: "#6f9a3a", head: "plain", ears: "pointy", eyes: "slit", mouth: "grin", weapon: "dagger", outfit: "rags", cloth: "#6b5238", extra: ["nose"], mood: "silly" },
    wolf: { body: "quad", head: "wolf", skin: "#6b6258", skin2: "#a89a88", eyes: "slit", mouth: "tongue", tail: "thin", pattern: "ribs", mood: "silly" },
    barrelgob: { body: "biped", build: "small", skin: "#8aa84a", head: "plain", ears: "pointy", eyes: "googly", mouth: "tongue", weapon: "bottle", outfit: "none", extra: ["barrel", "blush", "nose"], mood: "silly" },
    dogu: { body: "biped", build: "stubby", skin: "#a8744a", skin2: "#c89468", head: "plain", eyes: "goggle", mouth: "o", arms: "stubs", pattern: "cracks", mood: "silly" },
    bandit: { body: "biped", build: "normal", skin: "#d7a57a", head: "human", hair: "#3a2a1c", eyes: "dot", mouth: "frown", weapon: "dagger", outfit: "rags", cloth: "#6e5a3c", extra: ["bandana", "stubble"] },
    orc: { body: "biped", build: "brute", skin: "#a87a64", skin2: "#d8a08a", head: "pig", eyes: "glow", mouth: "tusks", weapon: "axe", outfit: "loin", cloth: "#5a4430", extra: ["pauldron"], mood: "fierce" },
    werewolf: { body: "biped", build: "brute", skin: "#5a4a3e", skin2: "#8a7a68", head: "wolf", eyes: "glow", mouth: "fangs", arms: "claws", tail: "thin", outfit: "rags", cloth: "#3a4a6a", mood: "fierce" },
    spider: { body: "bug", skin: "#2a2228", skin2: "#b02a2a", eyes: "glow", eyeN: 8, mouth: "fangs", pattern: "hourglass", mood: "fierce" },
    slime: { body: "blob", skin: "#7fd94a", eyes: "dot", mouth: "grin", extra: ["bubbles", "bone"], mood: "silly" },
    banditboss: { body: "biped", build: "brute", skin: "#c89068", head: "human", hair: "#2a1a10", eyes: "dot", mouth: "grin", weapon: "axe", outfit: "rags", cloth: "#5a3a2a", extra: ["eyepatch", "beard", "fur"] },
    guard: { body: "biped", build: "normal", skin: "#e0b08a", head: "human", hair: "#6a4a2a", eyes: "dot", mouth: "smirk", weapon: "spear", outfit: "armor", cloth: "#3e5a8a", extra: ["cap", "pouch"] },
    ogre: { body: "biped", build: "giant", skin: "#8a9a6a", skin2: "#b0bc8a", head: "ogre", eyes: "googly", mouth: "tusks", weapon: "club", outfit: "loin", cloth: "#6a5038", extra: ["drool"], mood: "silly" },
    zombie: { body: "swarm", count: 4, build: "normal", skin: "#7a8f6a", head: "plain", hair: "#2a2a22", eyes: "hollow", mouth: "jaw", arms: "forward", outfit: "rags", cloth: "#4a4038", pattern: "scars", mood: "fierce" },
    wyvern: { body: "wyrm", skin: "#5a7a4a", skin2: "#c8b878", horns: "nubs", eyes: "slit", mouth: "fangs", wings: "bat", tail: "spike", mood: "fierce" },
    deserter: { body: "biped", build: "normal", skin: "#c8987a", head: "human", hair: "#4a3a2a", eyes: "dot", mouth: "frown", weapon: "sword", outfit: "armor", cloth: "#5a2a22", pattern: "scars", extra: ["helmet", "stubble"] },
    ninja: { body: "biped", build: "lanky", skin: "#d8b090", head: "mask", eyes: "glow", mouth: "none", weapon: "katana", outfit: "garb", cloth: "#23242e", extra: ["scarf"], mood: "fierce" },
    mimic: { body: "chest", skin: "#7a4a26", skin2: "#c8a040", eyes: "glow", mouth: "fangs", mood: "fierce" },
    oni: { body: "biped", build: "giant", skin: "#b8403a", head: "plain", hair: "#1a1a1a", horns: "one", eyes: "glow", mouth: "tusks", weapon: "club", outfit: "loin", cloth: "#d8a93a", pattern: "none", extra: ["tigerloin"], mood: "fierce" },
    warlock: { body: "biped", build: "lanky", skin: "#b8b0a0", head: "hood", eyes: "glow", mouth: "none", weapon: "staff", outfit: "robe", cloth: "#3a2a4a", extra: ["runes"], mood: "fierce" },
    chimera: { body: "quad", head: "lion", skin: "#b08a4a", skin2: "#6a4020", eyes: "glow", mouth: "fangs", tail: "snake", extra: ["goathead"], mood: "fierce" },
    blackknight: { body: "biped", build: "brute", skin: "#2a2a30", head: "helm", eyes: "glow", mouth: "none", weapon: "greatsword", outfit: "armor", cloth: "#1c1c22", extra: ["cape", "smoke"], mood: "fierce" },
    general: { body: "biped", build: "giant", skin: "#5a4a6a", head: "plain", horns: "ram", eyes: "glow", mouth: "fangs", weapon: "spear", outfit: "armor", cloth: "#3a2a2a", extra: ["cape", "pauldron"], mood: "fierce" },
    kin: { body: "biped", build: "lanky", skin: "#6a4a8a", skin2: "#9a7ac0", head: "plain", horns: "nubs", eyes: "glow", eyeN: 3, mouth: "none", arms: "claws", wings: "bat", tail: "thin", outfit: "none", extra: ["float"], mood: "fierce" },
    kain: { body: "biped", build: "lanky", skin: "#e8dcd0", head: "human", hair: "#d8d0c8", eyes: "glow", mouth: "smirk", weapon: "tome", outfit: "robe", cloth: "#2a2440", extra: ["longhair", "monocle", "runes"] },
    shuten: { body: "biped", build: "giant", skin: "#c8483a", head: "plain", hair: "#ece6dc", horns: "long", eyes: "glow", mouth: "grin", weapon: "club", outfit: "loin", cloth: "#4a3a6a", extra: ["gourd", "blush", "backsword", "wildhair"] },
    bonedragon: { body: "wyrm", bones: true, skin: "#1e2a24", skin2: "#e0dccb", horns: "long", eyes: "hollow", mouth: "jaw", wings: "tatter", tail: "spike", extra: ["sword_in"], mood: "fierce" },
    rize: { body: "biped", build: "lanky", skin: "#f0d8c8", head: "human", hair: "#8a1a2a", eyes: "glow", mouth: "grin", weapon: "greatsword", outfit: "armor", cloth: "#2a1a1e", extra: ["longhair", "blood"], mood: "fierce" },
    graw: { body: "biped", build: "giant", size: 1.12, skin: "#2e2224", skin2: "#6a3a30", head: "plain", horns: "long", eyes: "glow", eyeN: 3, mouth: "fangs", arms: "claws", weapon: "greatsword", outfit: "loin", cloth: "#1a1214", pattern: "lava", extra: ["pauldron", "cape", "blood", "wildhair"], hair: "#120c0e", mood: "fierce" },
    royalguard: { body: "biped", build: "brute", skin: "#c8ccd4", head: "helm", eyes: "glow", mouth: "none", weapon: "sword", shield: true, outfit: "armor", cloth: "#2a4a9a", extra: ["plume", "cape"] },
  };

  // 種類（shape）から体の形
  const BODY_OF = { humanoid: "biped", small: "biped", giant: "biped", beast: "quad", blob: "blob", swarm: "swarm", winged: "wyrm", dragon: "wyrm" };
  const BUILD_OF = { humanoid: "normal", small: "small", giant: "giant" };
  const FIERCE_SKINS = ["#5a3a3a", "#3a4a3a", "#4a3a5a", "#6a2a2a", "#2a3a4a", "#5a5040", "#3a2a2a"];
  const SILLY_SKINS = ["#8ab04a", "#c08a5a", "#7aa0c8", "#c8a05a", "#a07ac0", "#d88a8a", "#6ab0a0"];
  const CLOTHS = ["#5a4430", "#3a4a6a", "#6a3a3a", "#3a3a3a", "#4a5a3a"];

  // 見た目を決める（純粋な関数。DOM を使わない）
  G.monsterLook = (id, e) => {
    e = e || (G.data && G.data.ENEMIES && G.data.ENEMIES[id]) || {};
    const R = rng("look:" + id);
    const shape = e.shape || "humanoid";
    const silly = !e.boss && ((e.tier || 1) <= 1 || (e.will || 50) <= 30);
    const mood = silly ? "silly" : "fierce";
    const auto = {
      body: BODY_OF[shape] || "biped",
      build: BUILD_OF[shape] || "normal",
      size: 1,
      skin: e.undead ? pickR(R, ["#7a8f6a", "#8a8a78", "#6a7a80"]) : pickR(R, silly ? SILLY_SKINS : FIERCE_SKINS),
      head: pickR(R, silly ? ["plain", "pig", "plain"] : ["plain", "ogre", "wolf", "plain"]),
      eyes: e.undead ? "hollow" : silly ? pickR(R, ["googly", "dot", "googly"]) : pickR(R, ["glow", "slit", "glow"]),
      eyeN: silly ? pickR(R, [2, 2, 1]) : pickR(R, [2, 2, 3, 1]),
      mouth: silly ? pickR(R, ["tongue", "grin", "o"]) : pickR(R, ["fangs", "tusks", "grin"]),
      horns: pickR(R, silly ? ["none", "nubs", "none"] : ["none", "nubs", "ram", "long", "one"]),
      ears: pickR(R, ["none", "pointy", "round", "none"]),
      wings: shape === "winged" || shape === "dragon" ? "bat" : "none",
      tail: pickR(R, ["none", "thin", "spike", "none"]),
      arms: pickR(R, ["hands", "claws"]),
      weapon: pickR(R, silly ? ["none", "dagger", "club", "bottle"] : ["axe", "club", "sword", "spear", "none"]),
      outfit: pickR(R, ["none", "rags", "loin", "armor"]),
      cloth: pickR(R, CLOTHS),
      pattern: e.undead ? "ribs" : pickR(R, ["none", "stripes", "spots", "scars", "none"]),
      extra: silly ? [pickR(R, ["sweat", "blush", "drool"])] : [],
      mood,
      count: 3,
    };
    if (auto.head === "pig") auto.mouth = "tusks";
    // 指定があるときは、書いていない部品を「無し」にする（人に尾が生えたりしないように）
    const given = PRESET[id] || e.look ? Object.assign({ build: auto.build, head: "plain", eyes: silly ? "dot" : "glow", eyeN: 2, mouth: "none", horns: "none", ears: "none", wings: "none", tail: "none", arms: "hands", weapon: "none", outfit: "none", cloth: auto.cloth, pattern: "none", extra: [], mood, count: 3, size: 1 }, PRESET[id] || {}) : auto;
    const L = Object.assign({}, auto, given, e.look || {});
    L.extra = (L.extra || []).slice();
    L.eye = L.eye || e.eye || "#ff3a3a";
    L.skin2 = L.skin2 || mix(L.skin, "#ffffff", 0.3);
    if (e.undead && !L.pattern) L.pattern = "ribs";
    if (e.boss && L.aura === undefined) L.aura = L.eye;
    if (e.majin && L.barrier === undefined) L.barrier = true;
    if (e.boss && !(e.look && e.look.size)) L.size = (L.size || 1) * 1.05;
    L.seed = "part:" + id;
    return L;
  };

  // 見た目が決めてあるか（PRESET か敵のデータの look）。無ければ種類と id から自動で作られる（tests/checks/a4_art.mjs が見る）
  G.monsterHasLook = (id) => !!(PRESET[id] || (G.data && G.data.ENEMIES && G.data.ENEMIES[id] && G.data.ENEMIES[id].look));

  // ---------------------------------------------------------------- 描く道具
  function shade(ctx, x, y, r, c) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2);
    g.addColorStop(0, mix(c, "#ffffff", 0.28));
    g.addColorStop(0.55, c);
    g.addColorStop(1, mix(c, "#000000", 0.45));
    return g;
  }
  // 塗って輪郭を引く
  function paint(ctx, fill, lw, path) {
    ctx.beginPath(); path(); ctx.fillStyle = fill; ctx.fill();
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke(); }
  }
  // 太い手足（輪郭つき）
  function limb(ctx, pts, w, c, lw) {
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const run = () => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); };
    run(); ctx.strokeStyle = INK; ctx.lineWidth = w + lw * 2; ctx.stroke();
    run(); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
    run(); ctx.strokeStyle = rgba("#ffffff", 0.12); ctx.lineWidth = w * 0.35; ctx.stroke();
  }
  function glowOn(ctx, c, b) { ctx.shadowColor = c; ctx.shadowBlur = b; }
  function glowOff(ctx) { ctx.shadowBlur = 0; ctx.shadowColor = "transparent"; }
  function ellipse(ctx, x, y, rx, ry, rot) { ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }

  // ---------------------------------------------------------------- 顔の部品
  function eyes(ctx, L, cx, cy, r, spread, R, lw) {
    const n = L.eyeN || 2;
    const style = L.eyes;
    const list = [];
    if (n === 1) list.push([cx, cy, 1.5]);
    else if (n === 3) { list.push([cx - spread, cy, 1], [cx + spread, cy, 1], [cx, cy - r * 2.3, 0.85]); }
    else if (n >= 5) { for (let i = 0; i < n; i++) { const a = (i / (n - 1)) * Math.PI; list.push([cx - Math.cos(a) * spread * 1.3, cy - Math.sin(a) * r * 1.6 + (i % 2) * r * 0.6, i % 3 === 0 ? 0.9 : 0.6]); } }
    else list.push([cx - spread, cy, 1], [cx + spread, cy, 1]);
    list.forEach(([ex, ey, k], i) => {
      const rr = r * k;
      if (style === "googly") {
        const big = i === 0 ? 1.15 : 0.9; // 大きさの違う目がまぬけに見える
        paint(ctx, "#fbf8ee", lw * 0.7, () => ellipse(ctx, ex, ey, rr * 1.3 * big, rr * 1.3 * big));
        const px = ex + (R() - 0.5) * rr * 1.2, py = ey + (R() - 0.3) * rr * 0.9;
        ctx.fillStyle = "#15110f"; ctx.beginPath(); ellipse(ctx, px, py, rr * 0.5 * big, rr * 0.5 * big); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ellipse(ctx, px - rr * 0.15, py - rr * 0.18, rr * 0.14, rr * 0.14); ctx.fill();
      } else if (style === "dot") {
        paint(ctx, "#fbf8ee", lw * 0.5, () => ellipse(ctx, ex, ey, rr * 0.8, rr * 0.9));
        ctx.fillStyle = "#1a1412"; ctx.beginPath(); ellipse(ctx, ex, ey + rr * 0.1, rr * 0.48, rr * 0.58); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ellipse(ctx, ex - rr * 0.15, ey - rr * 0.15, rr * 0.15, rr * 0.15); ctx.fill();
      } else if (style === "slit") {
        paint(ctx, L.eye, lw * 0.6, () => ellipse(ctx, ex, ey, rr * 1.05, rr * 0.75));
        ctx.fillStyle = "#0a0806"; ctx.beginPath(); ellipse(ctx, ex, ey, rr * 0.18, rr * 0.7); ctx.fill();
      } else if (style === "hollow") {
        ctx.fillStyle = "#0a0806"; ctx.beginPath(); ellipse(ctx, ex, ey, rr * 1.1, rr * 1.2); ctx.fill();
        glowOn(ctx, L.eye, rr * 3); ctx.fillStyle = L.eye; ctx.beginPath(); ellipse(ctx, ex, ey, rr * 0.3, rr * 0.3); ctx.fill(); glowOff(ctx);
      } else if (style === "goggle") {
        paint(ctx, mix(L.skin, "#000000", 0.25), lw * 0.7, () => ellipse(ctx, ex, ey, rr * 1.6, rr * 1.05));
        glowOn(ctx, L.eye, rr * 2); ctx.strokeStyle = L.eye; ctx.lineWidth = rr * 0.28; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(ex - rr * 1.1, ey); ctx.lineTo(ex + rr * 1.1, ey); ctx.stroke(); glowOff(ctx);
      } else { // glow：つり上がった光る目
        const d = ex < cx ? -1 : ex > cx ? 1 : 0;
        glowOn(ctx, L.eye, rr * 4);
        ctx.fillStyle = L.eye; ctx.beginPath();
        ctx.moveTo(ex - rr * 1.1, ey - (d < 0 ? rr * 0.5 : d > 0 ? -rr * 0.1 : 0));
        ctx.quadraticCurveTo(ex, ey - rr * 0.8, ex + rr * 1.1, ey - (d > 0 ? rr * 0.5 : d < 0 ? -rr * 0.1 : 0));
        ctx.quadraticCurveTo(ex, ey + rr * 0.7, ex - rr * 1.1, ey - (d < 0 ? rr * 0.5 : d > 0 ? -rr * 0.1 : 0));
        ctx.fill();
        ctx.fillStyle = "#fffbe8"; ctx.beginPath(); ellipse(ctx, ex, ey - rr * 0.05, rr * 0.28, rr * 0.2); ctx.fill();
        glowOff(ctx);
      }
    });
  }
  function mouth(ctx, L, cx, cy, w, lw) {
    const m = L.mouth;
    if (m === "none") return;
    ctx.lineCap = "round";
    if (m === "fangs" || m === "jaw") {
      paint(ctx, "#2a0a0c", lw * 0.7, () => { ctx.moveTo(cx - w, cy - w * 0.1); ctx.quadraticCurveTo(cx, cy + w * 0.9, cx + w, cy - w * 0.1); ctx.quadraticCurveTo(cx, cy + w * 0.2, cx - w, cy - w * 0.1); });
      ctx.fillStyle = m === "jaw" ? "#e8e2cc" : "#f4efe0";
      const n = m === "jaw" ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, tx = cx - w * 0.85 + t * w * 1.7, big = m === "fangs" && (i === 0 || i === n - 1) ? 1.9 : 1;
        ctx.beginPath(); ctx.moveTo(tx - w * 0.12, cy + w * 0.02); ctx.lineTo(tx + w * 0.12, cy + w * 0.02); ctx.lineTo(tx, cy + w * 0.26 * big); ctx.fill();
      }
    } else if (m === "tusks") {
      ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.2;
      ctx.beginPath(); ctx.moveTo(cx - w * 0.8, cy); ctx.quadraticCurveTo(cx, cy + w * 0.35, cx + w * 0.8, cy); ctx.stroke();
      for (const sx of [-1, 1]) paint(ctx, "#f2ead2", lw * 0.6, () => { ctx.moveTo(cx + sx * w * 0.55, cy + w * 0.12); ctx.quadraticCurveTo(cx + sx * w * 0.85, cy - w * 0.25, cx + sx * w * 0.7, cy - w * 0.6); ctx.lineTo(cx + sx * w * 0.4, cy + w * 0.1); });
    } else if (m === "grin") {
      paint(ctx, "#2a0a0c", lw * 0.7, () => { ctx.moveTo(cx - w, cy - w * 0.2); ctx.quadraticCurveTo(cx, cy + w * 0.8, cx + w, cy - w * 0.2); ctx.quadraticCurveTo(cx, cy + w * 0.25, cx - w, cy - w * 0.2); });
      ctx.fillStyle = "#f4efe0";
      for (let i = 0; i < 5; i++) { const tx = cx - w * 0.7 + i * w * 0.35; ctx.beginPath(); ctx.moveTo(tx - w * 0.13, cy - w * 0.02 + Math.abs(i - 2) * -w * 0.06); ctx.lineTo(tx + w * 0.13, cy - w * 0.02 + Math.abs(i - 2) * -w * 0.06); ctx.lineTo(tx, cy + w * 0.2); ctx.fill(); }
    } else if (m === "tongue") {
      paint(ctx, "#3a0c10", lw * 0.7, () => ellipse(ctx, cx, cy + w * 0.15, w * 0.6, w * 0.4));
      paint(ctx, "#e0607a", lw * 0.6, () => { ctx.moveTo(cx - w * 0.3, cy + w * 0.3); ctx.quadraticCurveTo(cx - w * 0.35, cy + w * 1.1, cx + w * 0.05, cy + w * 1.05); ctx.quadraticCurveTo(cx + w * 0.35, cy + w * 0.9, cx + w * 0.3, cy + w * 0.3); });
    } else if (m === "o") {
      paint(ctx, "#2a0a0c", lw * 0.6, () => ellipse(ctx, cx, cy + w * 0.1, w * 0.28, w * 0.34));
    } else if (m === "smirk") {
      ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.1;
      ctx.beginPath(); ctx.moveTo(cx - w * 0.5, cy + w * 0.1); ctx.quadraticCurveTo(cx + w * 0.1, cy + w * 0.3, cx + w * 0.55, cy - w * 0.15); ctx.stroke();
    } else { // frown
      ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.1;
      ctx.beginPath(); ctx.moveTo(cx - w * 0.5, cy + w * 0.2); ctx.quadraticCurveTo(cx, cy - w * 0.1, cx + w * 0.5, cy + w * 0.2); ctx.stroke();
    }
  }
  function horns(ctx, L, hx, hy, hr, lw) {
    const kind = L.horns;
    if (!kind || kind === "none") return;
    const c = L.bones ? "#e8e2cc" : L.hornColor || "#e6dcc0";
    const fill = (pts) => paint(ctx, shade(ctx, hx, hy - hr, hr, c), lw, () => { ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 6) ctx.bezierCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]); ctx.closePath(); });
    if (kind === "one") {
      fill([hx - hr * 0.2, hy - hr * 0.85, hx - hr * 0.1, hy - hr * 1.4, hx, hy - hr * 1.7, hx + hr * 0.05, hy - hr * 1.9, hx + hr * 0.1, hy - hr * 1.5, hx + hr * 0.2, hy - hr * 1.2, hx + hr * 0.22, hy - hr * 0.85]);
      return;
    }
    for (const sx of [-1, 1]) {
      const bx = hx + sx * hr * 0.55, by = hy - hr * 0.7;
      if (kind === "nubs") fill([bx - hr * 0.14, by + hr * 0.05, bx - hr * 0.1, by - hr * 0.3, bx + sx * hr * 0.1, by - hr * 0.5, bx + sx * hr * 0.12, by - hr * 0.45, bx + hr * 0.1, by - hr * 0.2, bx + hr * 0.14, by, bx + hr * 0.14, by + hr * 0.05]);
      else if (kind === "long") fill([bx - sx * hr * 0.15, by + hr * 0.1, bx + sx * hr * 0.2, by - hr * 0.7, bx + sx * hr * 0.5, by - hr * 1.3, bx + sx * hr * 0.35, by - hr * 1.9, bx + sx * hr * 0.75, by - hr * 1.2, bx + sx * hr * 0.5, by - hr * 0.5, bx + sx * hr * 0.28, by + hr * 0.1]);
      else if (kind === "ram") fill([bx - sx * hr * 0.1, by + hr * 0.1, bx + sx * hr * 0.4, by - hr * 0.9, bx + sx * hr * 1.5, by - hr * 0.6, bx + sx * hr * 1.2, by + hr * 0.5, bx + sx * hr * 1.0, by - hr * 0.1, bx + sx * hr * 0.6, by - hr * 0.35, bx + sx * hr * 0.3, by + hr * 0.25]);
      else if (kind === "antler") {
        ctx.strokeStyle = INK; ctx.lineWidth = hr * 0.22 + lw; ctx.lineCap = "round";
        const draw = () => { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + sx * hr * 0.5, by - hr * 1.1); ctx.moveTo(bx + sx * hr * 0.25, by - hr * 0.55); ctx.lineTo(bx + sx * hr * 0.8, by - hr * 0.7); ctx.moveTo(bx + sx * hr * 0.4, by - hr * 0.85); ctx.lineTo(bx + sx * hr * 0.2, by - hr * 1.3); ctx.stroke(); };
        draw(); ctx.strokeStyle = c; ctx.lineWidth = hr * 0.22; draw();
      }
    }
  }
  function ears(ctx, L, hx, hy, hr, lw, c) {
    if (L.ears === "pointy") for (const sx of [-1, 1]) paint(ctx, c, lw, () => { ctx.moveTo(hx + sx * hr * 0.8, hy - hr * 0.3); ctx.lineTo(hx + sx * hr * 2.0, hy - hr * 0.75); ctx.lineTo(hx + sx * hr * 0.85, hy + hr * 0.25); });
    else if (L.ears === "round") for (const sx of [-1, 1]) paint(ctx, c, lw, () => ellipse(ctx, hx + sx * hr * 0.9, hy - hr * 0.55, hr * 0.32, hr * 0.32));
  }

  // 前を向いた頭。(hx, hy) は頭の中心、hr は半径
  function head(ctx, L, hx, hy, hr, lw, R) {
    const k = L.head;
    const skin = L.skin;
    if ((L.extra.includes("longhair") || L.extra.includes("wildhair")) && L.hair) {
      const wild = L.extra.includes("wildhair");
      paint(ctx, shade(ctx, hx, hy, hr * 1.6, L.hair), lw, () => {
        ctx.moveTo(hx - hr * 1.05, hy - hr * 0.2);
        if (wild) { for (let i = 0; i <= 16; i++) { const a = Math.PI * 0.75 + (i / 16) * Math.PI * 1.5; const rr = hr * (i % 2 ? 1.2 : 1.75); ctx.lineTo(hx + Math.cos(a) * rr, hy - hr * 0.15 + Math.sin(a) * rr); } ctx.lineTo(hx + hr * 0.9, hy + hr * 1.3); ctx.lineTo(hx - hr * 0.9, hy + hr * 1.3); }
        else { ctx.quadraticCurveTo(hx - hr * 1.5, hy + hr * 1.8, hx - hr * 1.1, hy + hr * 3.2); ctx.lineTo(hx + hr * 1.1, hy + hr * 3.2); ctx.quadraticCurveTo(hx + hr * 1.5, hy + hr * 1.8, hx + hr * 1.05, hy - hr * 0.2); ctx.arc(hx, hy - hr * 0.1, hr * 1.08, 0, Math.PI, true); }
      });
    }
    if (k === "hood") {
      paint(ctx, shade(ctx, hx, hy, hr * 1.4, L.cloth), lw, () => { ctx.moveTo(hx, hy - hr * 1.7); ctx.quadraticCurveTo(hx + hr * 1.5, hy - hr * 0.6, hx + hr * 1.35, hy + hr * 1.2); ctx.lineTo(hx - hr * 1.35, hy + hr * 1.2); ctx.quadraticCurveTo(hx - hr * 1.5, hy - hr * 0.6, hx, hy - hr * 1.7); });
      ctx.fillStyle = "#07060a"; ctx.beginPath(); ellipse(ctx, hx, hy + hr * 0.15, hr * 0.75, hr * 0.9); ctx.fill();
      eyes(ctx, L, hx, hy + hr * 0.05, hr * 0.17, hr * 0.32, R, lw);
      return;
    }
    if (k === "helm") {
      const c = L.skin;
      paint(ctx, shade(ctx, hx, hy, hr, c), lw, () => { ctx.moveTo(hx - hr, hy + hr * 0.9); ctx.lineTo(hx - hr, hy - hr * 0.2); ctx.quadraticCurveTo(hx - hr, hy - hr * 1.15, hx, hy - hr * 1.15); ctx.quadraticCurveTo(hx + hr, hy - hr * 1.15, hx + hr, hy - hr * 0.2); ctx.lineTo(hx + hr, hy + hr * 0.9); ctx.quadraticCurveTo(hx, hy + hr * 1.25, hx - hr, hy + hr * 0.9); });
      ctx.fillStyle = "#050406"; ctx.fillRect(hx - hr * 0.8, hy - hr * 0.15, hr * 1.6, hr * 0.28); ctx.fillRect(hx - hr * 0.1, hy - hr * 0.15, hr * 0.2, hr * 0.9);
      ctx.strokeStyle = mix(c, "#ffffff", 0.35); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(hx, hy - hr * 1.1); ctx.lineTo(hx, hy - hr * 0.2); ctx.stroke();
      glowOn(ctx, L.eye, hr * 0.6); ctx.fillStyle = L.eye;
      ctx.fillRect(hx - hr * 0.62, hy - hr * 0.07, hr * 0.34, hr * 0.12); ctx.fillRect(hx + hr * 0.28, hy - hr * 0.07, hr * 0.34, hr * 0.12); glowOff(ctx);
      if (L.extra.includes("plume")) paint(ctx, "#c8302a", lw, () => { ctx.moveTo(hx, hy - hr * 1.1); ctx.bezierCurveTo(hx + hr * 0.4, hy - hr * 2.2, hx + hr * 1.6, hy - hr * 2.0, hx + hr * 1.9, hy - hr * 0.9); ctx.bezierCurveTo(hx + hr * 1.2, hy - hr * 1.5, hx + hr * 0.5, hy - hr * 1.4, hx + hr * 0.2, hy - hr * 1.0); });
      horns(ctx, L, hx, hy, hr, lw);
      return;
    }
    ears(ctx, L, hx, hy, hr, lw, skin);
    if (k === "wolf") for (const sx of [-1, 1]) paint(ctx, skin, lw, () => { ctx.moveTo(hx + sx * hr * 0.25, hy - hr * 0.8); ctx.lineTo(hx + sx * hr * 0.85, hy - hr * 1.75); ctx.lineTo(hx + sx * hr * 0.95, hy - hr * 0.3); });
    if (k === "pig") for (const sx of [-1, 1]) paint(ctx, skin, lw, () => { ctx.moveTo(hx + sx * hr * 0.35, hy - hr * 0.85); ctx.lineTo(hx + sx * hr * 1.15, hy - hr * 1.2); ctx.lineTo(hx + sx * hr * 0.95, hy - hr * 0.25); });
    const rx = k === "ogre" ? hr * 1.2 : hr, ry = k === "ogre" ? hr * 0.95 : hr;
    const faceC = k === "skull" ? "#e6e0cc" : skin;
    paint(ctx, shade(ctx, hx, hy, hr, faceC), lw, () => ellipse(ctx, hx, hy, rx, ry));
    if (k === "ogre") paint(ctx, shade(ctx, hx, hy + hr * 0.6, hr, faceC), lw, () => ellipse(ctx, hx, hy + hr * 0.55, rx * 0.95, hr * 0.55));
    // 髪
    if (L.hair && !L.extra.includes("longhair") && k !== "mask") {
      if (L.extra.includes("wildhair")) { /* 後ろ髪で済ませる */ } else paint(ctx, shade(ctx, hx, hy - hr, hr, L.hair), lw, () => { ctx.moveTo(hx - rx * 1.02, hy - hr * 0.05); ctx.quadraticCurveTo(hx - rx * 1.1, hy - hr * 1.2, hx, hy - hr * 1.12); ctx.quadraticCurveTo(hx + rx * 1.1, hy - hr * 1.2, hx + rx * 1.02, hy - hr * 0.05); ctx.quadraticCurveTo(hx + rx * 0.5, hy - hr * 0.7, hx - rx * 0.2, hy - hr * 0.5); ctx.quadraticCurveTo(hx - rx * 0.7, hy - hr * 0.4, hx - rx * 1.02, hy - hr * 0.05); });
    } else if (L.hair && L.extra.includes("longhair")) {
      paint(ctx, shade(ctx, hx, hy - hr, hr, L.hair), lw, () => { ctx.moveTo(hx - hr * 1.05, hy + hr * 0.2); ctx.quadraticCurveTo(hx - hr * 1.15, hy - hr * 1.25, hx, hy - hr * 1.12); ctx.quadraticCurveTo(hx + hr * 1.15, hy - hr * 1.25, hx + hr * 1.05, hy + hr * 0.2); ctx.quadraticCurveTo(hx + hr * 0.6, hy - hr * 0.55, hx - hr * 0.1, hy - hr * 0.62); ctx.quadraticCurveTo(hx - hr * 0.3, hy - hr * 0.2, hx - hr * 1.05, hy + hr * 0.2); });
    }
    if (k === "mask") {
      paint(ctx, shade(ctx, hx, hy, hr, L.cloth), lw, () => ellipse(ctx, hx, hy, hr * 1.02, hr * 1.02));
      paint(ctx, skin, lw * 0.6, () => { ctx.rect(hx - hr * 0.85, hy - hr * 0.3, hr * 1.7, hr * 0.42); });
    }
    const eyY = k === "ogre" ? hy - hr * 0.2 : hy - hr * 0.05;
    const eyR = k === "human" ? hr * 0.16 : L.eyes === "googly" ? hr * 0.22 : hr * 0.2;
    if (k === "wolf") paint(ctx, shade(ctx, hx, hy + hr * 0.5, hr * 0.6, L.skin2), lw, () => ellipse(ctx, hx, hy + hr * 0.45, hr * 0.55, hr * 0.42));
    eyes(ctx, L, hx, k === "mask" ? hy - hr * 0.09 : eyY, eyR, hr * 0.4, R, lw);
    if (k === "pig") {
      paint(ctx, shade(ctx, hx, hy + hr * 0.3, hr * 0.4, L.skin2), lw, () => ellipse(ctx, hx, hy + hr * 0.3, hr * 0.38, hr * 0.26));
      ctx.fillStyle = "#3a1a1a"; ctx.beginPath(); ellipse(ctx, hx - hr * 0.13, hy + hr * 0.3, hr * 0.07, hr * 0.11); ellipse(ctx, hx + hr * 0.13, hy + hr * 0.3, hr * 0.07, hr * 0.11); ctx.fill();
      mouth(ctx, L, hx, hy + hr * 0.72, hr * 0.5, lw);
    } else if (k === "wolf") {
      ctx.fillStyle = "#15100e"; ctx.beginPath(); ellipse(ctx, hx, hy + hr * 0.25, hr * 0.17, hr * 0.12); ctx.fill();
      mouth(ctx, L, hx, hy + hr * 0.55, hr * 0.42, lw);
    } else if (k === "skull") {
      ctx.fillStyle = "#1a1412"; ctx.beginPath(); ctx.moveTo(hx, hy + hr * 0.15); ctx.lineTo(hx - hr * 0.12, hy + hr * 0.38); ctx.lineTo(hx + hr * 0.12, hy + hr * 0.38); ctx.fill();
      mouth(ctx, Object.assign({}, L, { mouth: "jaw" }), hx, hy + hr * 0.55, hr * 0.5, lw);
    } else if (k === "mask") {
      /* 口は覆面の下 */
    } else {
      if (L.extra.includes("nose")) paint(ctx, shade(ctx, hx, hy + hr * 0.2, hr * 0.3, skin), lw * 0.8, () => { ctx.moveTo(hx - hr * 0.1, hy + hr * 0.02); ctx.quadraticCurveTo(hx + hr * 0.5, hy + hr * 0.25, hx + hr * 0.12, hy + hr * 0.45); ctx.quadraticCurveTo(hx - hr * 0.2, hy + hr * 0.4, hx - hr * 0.1, hy + hr * 0.02); });
      else if (k === "human") { ctx.strokeStyle = rgba(INK, 0.6); ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(hx + hr * 0.02, hy + hr * 0.08); ctx.lineTo(hx + hr * 0.1, hy + hr * 0.32); ctx.lineTo(hx - hr * 0.04, hy + hr * 0.34); ctx.stroke(); }
      if (L.extra.includes("beard") && L.hair) paint(ctx, shade(ctx, hx, hy + hr * 0.7, hr * 0.8, L.hair), lw, () => { ctx.moveTo(hx - hr * 0.85, hy + hr * 0.25); ctx.quadraticCurveTo(hx - hr * 0.7, hy + hr * 1.5, hx, hy + hr * 1.6); ctx.quadraticCurveTo(hx + hr * 0.7, hy + hr * 1.5, hx + hr * 0.85, hy + hr * 0.25); ctx.quadraticCurveTo(hx, hy + hr * 0.5, hx - hr * 0.85, hy + hr * 0.25); });
      if (L.extra.includes("stubble")) { ctx.fillStyle = rgba("#2a2018", 0.35); ctx.beginPath(); ellipse(ctx, hx, hy + hr * 0.62, hr * 0.62, hr * 0.32); ctx.fill(); }
      mouth(ctx, L, hx, k === "ogre" ? hy + hr * 0.6 : hy + (k === "human" ? hr * 0.58 : hr * 0.5), k === "ogre" ? hr * 0.75 : k === "human" ? hr * 0.36 : hr * 0.5, lw);
    }
    if (L.extra.includes("eyepatch")) {
      ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(hx - hr, hy - hr * 0.45); ctx.lineTo(hx + hr * 0.95, hy + hr * 0.1); ctx.stroke();
      paint(ctx, "#15100e", lw * 0.5, () => ellipse(ctx, hx - hr * 0.4, hy - hr * 0.05, hr * 0.26, hr * 0.22));
    }
    if (L.extra.includes("monocle")) { ctx.strokeStyle = "#d8b048"; ctx.lineWidth = lw; ctx.beginPath(); ellipse(ctx, hx + hr * 0.4, hy - hr * 0.05, hr * 0.26, hr * 0.26); ctx.moveTo(hx + hr * 0.62, hy + hr * 0.1); ctx.quadraticCurveTo(hx + hr * 0.8, hy + hr * 0.8, hx + hr * 0.6, hy + hr * 1.3); ctx.stroke(); }
    if (L.extra.includes("blush")) { ctx.fillStyle = "rgba(255,90,110,.45)"; ctx.beginPath(); ellipse(ctx, hx - hr * 0.6, hy + hr * 0.3, hr * 0.22, hr * 0.13); ellipse(ctx, hx + hr * 0.6, hy + hr * 0.3, hr * 0.22, hr * 0.13); ctx.fill(); }
    if (L.extra.includes("sweat")) paint(ctx, "#bfe6ff", lw * 0.6, () => { ctx.moveTo(hx + hr * 0.95, hy - hr * 0.75); ctx.quadraticCurveTo(hx + hr * 1.25, hy - hr * 0.3, hx + hr * 1.05, hy - hr * 0.2); ctx.quadraticCurveTo(hx + hr * 0.8, hy - hr * 0.3, hx + hr * 0.95, hy - hr * 0.75); });
    if (L.extra.includes("drool")) paint(ctx, "rgba(210,240,255,.85)", lw * 0.5, () => { const dy = k === "ogre" ? hr * 0.75 : hr * 0.6; ctx.moveTo(hx + hr * 0.35, hy + dy); ctx.quadraticCurveTo(hx + hr * 0.42, hy + dy + hr * 0.6, hx + hr * 0.3, hy + dy + hr * 0.75); ctx.quadraticCurveTo(hx + hr * 0.2, hy + dy + hr * 0.5, hx + hr * 0.3, hy + dy); });
    if (L.extra.includes("bandana")) { paint(ctx, "#a82a2a", lw, () => { ctx.moveTo(hx - hr * 1.02, hy - hr * 0.35); ctx.quadraticCurveTo(hx, hy - hr * 0.75, hx + hr * 1.02, hy - hr * 0.35); ctx.lineTo(hx + hr * 0.98, hy - hr * 0.6); ctx.quadraticCurveTo(hx, hy - hr * 1.15, hx - hr * 0.98, hy - hr * 0.6); }); paint(ctx, "#a82a2a", lw, () => { ctx.moveTo(hx + hr * 0.95, hy - hr * 0.5); ctx.lineTo(hx + hr * 1.5, hy - hr * 0.2); ctx.lineTo(hx + hr * 1.35, hy + hr * 0.05); }); }
    if (L.extra.includes("cap") || L.extra.includes("helmet")) {
      const dent = L.extra.includes("helmet");
      paint(ctx, shade(ctx, hx, hy - hr, hr, dent ? "#6a6a62" : "#9aa0a8"), lw, () => { ctx.moveTo(hx - hr * 1.25, hy - hr * 0.3); ctx.quadraticCurveTo(hx - hr * 1.05, hy - hr * 1.35, hx, hy - hr * 1.3); ctx.quadraticCurveTo(hx + hr * 1.05, hy - hr * (dent ? 1.0 : 1.35), hx + hr * 1.25, hy - hr * 0.3); ctx.closePath(); });
      if (dent) { ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.moveTo(hx + hr * 0.3, hy - hr * 1.15); ctx.lineTo(hx + hr * 0.45, hy - hr * 0.8); ctx.lineTo(hx + hr * 0.7, hy - hr * 0.85); ctx.stroke(); }
    }
    if (L.extra.includes("pot")) {
      // かぶった鍋（ずり落ちかけて、片目が隠れている）
      paint(ctx, shade(ctx, hx, hy - hr, hr * 1.2, "#4a4a4e"), lw, () => { ctx.moveTo(hx - hr * 1.15, hy - hr * 0.1); ctx.lineTo(hx - hr * 1.0, hy - hr * 1.2); ctx.lineTo(hx + hr * 1.0, hy - hr * 1.3); ctx.lineTo(hx + hr * 1.2, hy - hr * 0.35); ctx.closePath(); });
      paint(ctx, "#2a2a2e", lw, () => ctx.rect(hx + hr * 1.1, hy - hr * 0.75, hr * 0.7, hr * 0.16));
    }
    if (L.extra.includes("crown")) crown(ctx, hx, hy - hr * 0.95, hr * 0.7, lw);
    horns(ctx, L, hx, hy, hr, lw);
  }
  // 小さな冠（体に比べて小さすぎる。まぬけな王さま用）
  function crown(ctx, x, y, r, lw) {
    paint(ctx, shade(ctx, x, y, r, "#e0b030"), lw, () => { ctx.moveTo(x - r, y); ctx.lineTo(x - r, y - r * 0.7); ctx.lineTo(x - r * 0.5, y - r * 0.3); ctx.lineTo(x, y - r * 0.85); ctx.lineTo(x + r * 0.5, y - r * 0.3); ctx.lineTo(x + r, y - r * 0.7); ctx.lineTo(x + r, y); ctx.closePath(); });
    ctx.fillStyle = "#c83040"; ctx.beginPath(); ellipse(ctx, x, y - r * 0.25, r * 0.14, r * 0.14); ctx.fill();
  }

  // ---------------------------------------------------------------- 手に持つもの
  // (px, py) は握る手。size は背丈
  function weapon(ctx, L, px, py, H, lw, side) {
    const w = L.weapon;
    if (!w || w === "none") return;
    ctx.save(); ctx.translate(px, py);
    const steel = "#c8ccd4", wood = "#6a4a2a";
    const blade = (len, wid, c, curve) => paint(ctx, shade(ctx, 0, -len * 0.5, len * 0.5, c), lw, () => { ctx.moveTo(-wid * 0.5, 0); ctx.lineTo(-wid * 0.5, -len * 0.85); ctx.quadraticCurveTo(curve || 0, -len * 1.05, wid * 0.5, -len * 0.85 - (curve ? wid : 0)); ctx.lineTo(wid * 0.5, 0); });
    const grip = (len) => { paint(ctx, "#3a2418", lw, () => ctx.rect(-H * 0.012, 0, H * 0.024, len)); };
    const guard = (wd) => paint(ctx, "#b89040", lw, () => ctx.rect(-wd / 2, -H * 0.012, wd, H * 0.024));
    ctx.rotate(side * (w === "spear" || w === "staff" ? 0.08 : 0.35));
    if (w === "dagger") { grip(H * 0.06); guard(H * 0.07); blade(H * 0.2, H * 0.04, steel); }
    else if (w === "sword") { grip(H * 0.09); guard(H * 0.13); blade(H * 0.48, H * 0.05, steel); }
    else if (w === "greatsword") {
      grip(H * 0.14); guard(H * 0.2); blade(H * 0.78, H * 0.09, L.bladeColor || "#9aa0ac");
      if (L.extra.includes("blood")) { ctx.fillStyle = "rgba(150,10,20,.8)"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ellipse(ctx, (i % 2 ? 1 : -1) * H * 0.015, -H * (0.3 + i * 0.1), H * 0.018, H * 0.04); ctx.fill(); } }
    } else if (w === "katana") { grip(H * 0.08); paint(ctx, "#15100e", lw, () => ellipse(ctx, 0, 0, H * 0.03, H * 0.012)); blade(H * 0.42, H * 0.03, "#e6eaf0", H * 0.05); }
    else if (w === "axe") {
      paint(ctx, wood, lw, () => ctx.rect(-H * 0.02, -H * 0.42, H * 0.04, H * 0.52));
      paint(ctx, shade(ctx, 0, -H * 0.35, H * 0.14, steel), lw, () => { ctx.moveTo(H * 0.02, -H * 0.42); ctx.quadraticCurveTo(H * 0.2, -H * 0.5, H * 0.22, -H * 0.36); ctx.quadraticCurveTo(H * 0.24, -H * 0.24, H * 0.02, -H * 0.28); });
    } else if (w === "club") {
      const big = L.build === "giant" ? 1.3 : 1;
      paint(ctx, shade(ctx, 0, -H * 0.35, H * 0.2, L.clubColor || (L.horns && L.horns !== "none" ? "#3a3a44" : wood)), lw, () => { ctx.moveTo(-H * 0.02, H * 0.06); ctx.lineTo(-H * 0.07 * big, -H * 0.5); ctx.quadraticCurveTo(0, -H * 0.6, H * 0.07 * big, -H * 0.5); ctx.lineTo(H * 0.02, H * 0.06); });
      ctx.fillStyle = "#d8d0c0"; for (let i = 0; i < 6; i++) { const yy = -H * (0.2 + i * 0.05), xx = (i % 2 ? 1 : -1) * H * (0.045 + i * 0.004) * big; ctx.beginPath(); ctx.moveTo(xx, yy - H * 0.012); ctx.lineTo(xx + Math.sign(xx) * H * 0.03, yy); ctx.lineTo(xx, yy + H * 0.012); ctx.fill(); }
    } else if (w === "spear") {
      paint(ctx, wood, lw, () => ctx.rect(-H * 0.012, -H * 0.7, H * 0.024, H * 0.95));
      paint(ctx, shade(ctx, 0, -H * 0.75, H * 0.1, steel), lw, () => { ctx.moveTo(-H * 0.035, -H * 0.68); ctx.lineTo(0, -H * 0.86); ctx.lineTo(H * 0.035, -H * 0.68); ctx.closePath(); });
    } else if (w === "staff") {
      paint(ctx, "#2a1c14", lw, () => { ctx.moveTo(-H * 0.012, H * 0.3); ctx.lineTo(-H * 0.012, -H * 0.55); ctx.quadraticCurveTo(-H * 0.07, -H * 0.66, -H * 0.02, -H * 0.72); ctx.lineTo(H * 0.02, -H * 0.72); ctx.quadraticCurveTo(H * 0.07, -H * 0.66, H * 0.012, -H * 0.55); ctx.lineTo(H * 0.012, H * 0.3); });
      glowOn(ctx, L.eye, H * 0.12); paint(ctx, shade(ctx, 0, -H * 0.66, H * 0.05, L.eye), 0, () => ellipse(ctx, 0, -H * 0.66, H * 0.045, H * 0.045)); glowOff(ctx);
    } else if (w === "bottle") {
      ctx.rotate(-side * 0.9);
      paint(ctx, "rgba(90,160,90,.9)", lw, () => { ctx.moveTo(-H * 0.035, H * 0.02); ctx.lineTo(-H * 0.035, -H * 0.1); ctx.quadraticCurveTo(-H * 0.035, -H * 0.14, -H * 0.012, -H * 0.16); ctx.lineTo(-H * 0.012, -H * 0.21); ctx.lineTo(H * 0.012, -H * 0.21); ctx.lineTo(H * 0.012, -H * 0.16); ctx.quadraticCurveTo(H * 0.035, -H * 0.14, H * 0.035, -H * 0.1); ctx.lineTo(H * 0.035, H * 0.02); ctx.closePath(); });
    } else if (w === "tome") {
      ctx.rotate(-side * 0.35);
      ctx.translate(side * H * 0.05, -H * 0.1);
      glowOn(ctx, L.eye, H * 0.1);
      paint(ctx, "#3a1a2a", lw, () => { ctx.moveTo(-H * 0.11, 0); ctx.lineTo(0, H * 0.03); ctx.lineTo(H * 0.11, 0); ctx.lineTo(H * 0.11, -H * 0.12); ctx.lineTo(0, -H * 0.09); ctx.lineTo(-H * 0.11, -H * 0.12); ctx.closePath(); });
      paint(ctx, "#efe6cf", lw * 0.5, () => { ctx.moveTo(-H * 0.095, -H * 0.012); ctx.lineTo(0, H * 0.014); ctx.lineTo(H * 0.095, -H * 0.012); ctx.lineTo(H * 0.095, -H * 0.11); ctx.lineTo(0, -H * 0.08); ctx.lineTo(-H * 0.095, -H * 0.11); ctx.closePath(); });
      glowOff(ctx);
      ctx.strokeStyle = rgba(L.eye, 0.9); ctx.lineWidth = lw * 0.6;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-H * 0.08, -H * (0.03 + i * 0.018)); ctx.lineTo(-H * 0.015, -H * (0.02 + i * 0.018)); ctx.moveTo(H * 0.015, -H * (0.02 + i * 0.018)); ctx.lineTo(H * 0.08, -H * (0.03 + i * 0.018)); ctx.stroke(); }
    }
    ctx.restore();
  }
  function shield(ctx, L, px, py, H, lw) {
    paint(ctx, shade(ctx, px, py, H * 0.14, L.cloth), lw * 1.2, () => { ctx.moveTo(px - H * 0.1, py - H * 0.13); ctx.lineTo(px + H * 0.1, py - H * 0.13); ctx.lineTo(px + H * 0.1, py + H * 0.02); ctx.quadraticCurveTo(px + H * 0.08, py + H * 0.12, px, py + H * 0.17); ctx.quadraticCurveTo(px - H * 0.08, py + H * 0.12, px - H * 0.1, py + H * 0.02); ctx.closePath(); });
    ctx.strokeStyle = "#e0c060"; ctx.lineWidth = lw * 1.2; ctx.beginPath(); ctx.moveTo(px, py - H * 0.1); ctx.lineTo(px, py + H * 0.12); ctx.moveTo(px - H * 0.07, py - H * 0.03); ctx.lineTo(px + H * 0.07, py - H * 0.03); ctx.stroke();
  }

  // ---------------------------------------------------------------- 背の翼・尾
  function wings(ctx, L, x, y, span, lw, R) {
    const k = L.wings;
    if (!k || k === "none") return;
    const c = mix(L.skin, "#000000", 0.25);
    for (const sx of [-1, 1]) {
      const tip = [x + sx * span, y - span * 0.75];
      if (k === "feather") {
        for (let i = 0; i < 5; i++) paint(ctx, mix("#e8e4dc", c, i * 0.1), lw, () => ellipse(ctx, x + sx * span * (0.35 + i * 0.13), y - span * (0.2 + i * 0.1), span * 0.28, span * 0.09, sx * (-0.5 - i * 0.12)));
        continue;
      }
      const memb = k === "tatter" ? rgba(mix(L.skin, "#445544", 0.4), 0.55) : shade(ctx, x + sx * span * 0.5, y - span * 0.4, span * 0.6, c);
      paint(ctx, memb, lw, () => {
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + sx * span * 0.4, y - span * 0.9, tip[0], tip[1]);
        const n = 4;
        for (let i = 1; i <= n; i++) {
          const t = i / n, fx = x + sx * span * (1 - t * 0.85), fy = y - span * 0.75 + t * span * 0.95;
          const cx2 = x + sx * span * (1 - (t - 0.12) * 0.85) - sx * span * 0.02, cy2 = fy - span * (k === "tatter" ? 0.3 * R() : 0.18);
          ctx.quadraticCurveTo(cx2, cy2, fx, fy);
        }
        ctx.closePath();
      });
      // 骨
      ctx.strokeStyle = L.bones ? "#e0dccb" : INK; ctx.lineWidth = lw * (L.bones ? 1.8 : 1.1); ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 1; i <= 3; i++) { const t = i / 4; ctx.moveTo(tip[0], tip[1]); ctx.lineTo(x + sx * span * (1 - t * 0.85), y - span * 0.75 + t * span * 0.95); }
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sx * span * 0.4, y - span * 0.9, tip[0], tip[1]);
      ctx.stroke();
    }
  }
  function tail(ctx, L, x, y, len, w, dir, lw) {
    const k = L.tail;
    if (!k || k === "none") return;
    const c = k === "snake" ? "#4a7a3a" : L.skin;
    const ex = x + dir * len, ey = y - len * 0.55;
    ctx.lineCap = "round";
    const run = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + dir * len * 0.5, y + len * 0.25, x + dir * len * 0.9, y + len * 0.1, ex, ey); };
    run(); ctx.strokeStyle = INK; ctx.lineWidth = w + lw * 2; ctx.stroke();
    run(); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
    if (k === "spike") paint(ctx, "#e6dcc0", lw, () => { ctx.moveTo(ex - w * 0.6, ey + w * 0.5); ctx.lineTo(ex + dir * w * 1.8, ey - w * 1.6); ctx.lineTo(ex + w * 0.6, ey + w * 0.2); });
    if (k === "snake") {
      paint(ctx, shade(ctx, ex, ey, w, c), lw, () => ellipse(ctx, ex + dir * w * 0.4, ey - w * 0.3, w * 1.2, w * 0.8, -dir * 0.5));
      ctx.fillStyle = "#ffe04a"; ctx.beginPath(); ellipse(ctx, ex + dir * w * 0.7, ey - w * 0.55, w * 0.22, w * 0.22); ctx.fill();
      ctx.strokeStyle = "#d0304a"; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ex + dir * w * 1.5, ey - w * 0.3); ctx.lineTo(ex + dir * w * 2.2, ey - w * 0.2); ctx.lineTo(ex + dir * w * 2.4, ey - w * 0.45); ctx.moveTo(ex + dir * w * 2.2, ey - w * 0.2); ctx.lineTo(ex + dir * w * 2.4, ey); ctx.stroke();
    }
  }
  // 体の模様（切り抜きの中で呼ぶ）
  function pattern(ctx, L, cx, cy, rw, rh, lw, R) {
    const p = L.pattern;
    if (!p || p === "none") return;
    const dark = rgba(mix(L.skin, "#000000", 0.6), 0.55);
    ctx.lineCap = "round";
    if (p === "stripes") { ctx.strokeStyle = dark; ctx.lineWidth = rw * 0.12; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * rw * 0.4 - rw * 0.1, cy - rh); ctx.quadraticCurveTo(cx + i * rw * 0.4 + rw * 0.15, cy, cx + i * rw * 0.4 - rw * 0.05, cy + rh); ctx.stroke(); } }
    else if (p === "spots") { ctx.fillStyle = dark; for (let i = 0; i < 9; i++) { ctx.beginPath(); ellipse(ctx, cx + (R() - 0.5) * rw * 1.8, cy + (R() - 0.5) * rh * 1.8, rw * (0.06 + R() * 0.08), rw * (0.05 + R() * 0.07)); ctx.fill(); } }
    else if (p === "scars") { ctx.strokeStyle = rgba("#e8b0a0", 0.75); ctx.lineWidth = lw * 1.2; for (let i = 0; i < 4; i++) { const sx = cx + (R() - 0.5) * rw * 1.4, sy = cy + (R() - 0.5) * rh * 1.4; ctx.beginPath(); ctx.moveTo(sx - rw * 0.25, sy - rh * 0.15); ctx.lineTo(sx + rw * 0.25, sy + rh * 0.15); for (let j = -2; j <= 2; j++) { ctx.moveTo(sx + j * rw * 0.1 - rw * 0.02, sy + j * rh * 0.06 - rh * 0.06); ctx.lineTo(sx + j * rw * 0.1 + rw * 0.02, sy + j * rh * 0.06 + rh * 0.06); } ctx.stroke(); } }
    else if (p === "cracks") { ctx.strokeStyle = rgba("#2a1810", 0.7); ctx.lineWidth = lw; for (let i = 0; i < 5; i++) { let px = cx + (R() - 0.5) * rw * 1.6, py = cy + (R() - 0.5) * rh * 1.6; ctx.beginPath(); ctx.moveTo(px, py); for (let j = 0; j < 3; j++) { px += (R() - 0.5) * rw * 0.5; py += (R() - 0.2) * rh * 0.4; ctx.lineTo(px, py); } ctx.stroke(); } ctx.fillStyle = rgba("#f0d8a8", 0.6); for (let i = 0; i < 6; i++) { ctx.beginPath(); ellipse(ctx, cx - rw * 0.5 + i * rw * 0.2, cy + rh * 0.15, rw * 0.04, rw * 0.04); ctx.fill(); } }
    else if (p === "ribs") { ctx.strokeStyle = dark; ctx.lineWidth = lw * 1.4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - rw * 0.7, cy - rh * 0.5 + i * rh * 0.3); ctx.quadraticCurveTo(cx, cy - rh * 0.3 + i * rh * 0.3, cx + rw * 0.7, cy - rh * 0.5 + i * rh * 0.3); ctx.stroke(); } }
    else if (p === "lava") { glowOn(ctx, L.eye, lw * 6); ctx.strokeStyle = L.eye; ctx.lineWidth = lw * 1.3; for (let i = 0; i < 7; i++) { let px = cx + (R() - 0.5) * rw * 1.7, py = cy + (R() - 0.5) * rh * 1.7; ctx.beginPath(); ctx.moveTo(px, py); for (let j = 0; j < 3; j++) { px += (R() - 0.5) * rw * 0.45; py += (R() - 0.3) * rh * 0.35; ctx.lineTo(px, py); } ctx.stroke(); } glowOff(ctx); }
    else if (p === "hourglass") { ctx.fillStyle = L.skin2; ctx.beginPath(); ctx.moveTo(cx - rw * 0.25, cy - rh * 0.45); ctx.lineTo(cx + rw * 0.25, cy - rh * 0.45); ctx.lineTo(cx, cy); ctx.lineTo(cx + rw * 0.25, cy + rh * 0.45); ctx.lineTo(cx - rw * 0.25, cy + rh * 0.45); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill(); }
  }

  // ---------------------------------------------------------------- 体：二本足
  const BUILDS = {
    //        背丈  頭   肩幅  腰幅  肩の高さ 腰の高さ 脚の太さ 腕の太さ
    normal: { h: 1.0, hr: 0.105, sw: 0.17, hw: 0.12, sy: 0.74, hip: 0.42, leg: 0.075, arm: 0.06 },
    small: { h: 0.66, hr: 0.2, sw: 0.17, hw: 0.14, sy: 0.6, hip: 0.3, leg: 0.1, arm: 0.075 },
    stubby: { h: 0.7, hr: 0.19, sw: 0.24, hw: 0.22, sy: 0.6, hip: 0.25, leg: 0.13, arm: 0.1 },
    lanky: { h: 1.04, hr: 0.095, sw: 0.14, hw: 0.1, sy: 0.76, hip: 0.44, leg: 0.06, arm: 0.05 },
    brute: { h: 1.1, hr: 0.1, sw: 0.24, hw: 0.14, sy: 0.72, hip: 0.4, leg: 0.09, arm: 0.085 },
    giant: { h: 1.32, hr: 0.1, sw: 0.27, hw: 0.17, sy: 0.7, hip: 0.37, leg: 0.1, arm: 0.095 },
  };
  function biped(ctx, L, x, base, U, R, scaleLw) {
    const B = BUILDS[L.build] || BUILDS.normal;
    const H = U * B.h;
    const lw = Math.max(1, H * 0.009) * (scaleLw || 1);
    const sw = H * B.sw, hw = H * B.hw, sy = base - H * B.sy, hy = base - H * B.hip;
    const hr = H * B.hr;
    const hunch = L.build === "giant" || L.build === "brute" ? hr * 0.25 : 0;
    const headY = sy - hr * 0.8 + hunch;
    const float = L.extra.includes("float");
    const robe = L.outfit === "robe";
    const skinArm = L.outfit === "armor" ? mix(L.cloth, "#9aa0a8", 0.45) : L.skin;
    const cloth = L.cloth;
    const handY = hy + H * 0.02;
    const handL = L.arms === "forward" ? [x - sw * 1.5, sy + H * 0.02] : L.arms === "stubs" ? [x - sw * 1.35, sy + H * 0.12] : [x - sw - H * 0.07, handY];
    const handR = L.arms === "forward" ? [x + sw * 1.5, sy + H * 0.04] : L.arms === "stubs" ? [x + sw * 1.35, sy + H * 0.1] : [x + sw + H * 0.1, sy + H * 0.14];

    if (L.extra.includes("cape")) paint(ctx, shade(ctx, x, sy + H * 0.3, H * 0.4, mix(L.extra.includes("smoke") ? "#5a0c10" : "#7a1a1a", cloth, 0.2)), lw, () => { ctx.moveTo(x - sw * 0.9, sy); ctx.quadraticCurveTo(x - sw * 1.6, base - H * 0.2, x - sw * 1.4, base - H * 0.02); ctx.lineTo(x + sw * 1.4, base - H * 0.02); ctx.quadraticCurveTo(x + sw * 1.6, base - H * 0.2, x + sw * 0.9, sy); });
    if (L.extra.includes("backsword")) { ctx.save(); glowOn(ctx, "#f4f8ff", H * 0.05); ctx.translate(x - sw * 0.6, sy + H * 0.15); ctx.rotate(-0.6); paint(ctx, "#f4f6ff", lw, () => ctx.rect(-H * 0.018, -H * 0.5, H * 0.036, H * 0.5)); paint(ctx, "#2a1a14", lw, () => ctx.rect(-H * 0.015, 0, H * 0.03, H * 0.1)); glowOff(ctx); ctx.restore(); }
    wings(ctx, L, x, sy + H * 0.05, sw * 3.4, lw, R);
    tail(ctx, L, x + hw * 0.3, hy, H * 0.35, H * 0.05, 1, lw);

    // 脚
    if (float) {
      paint(ctx, shade(ctx, x, hy + H * 0.15, H * 0.3, L.skin), lw, () => { ctx.moveTo(x - hw * 1.1, hy - H * 0.02); ctx.quadraticCurveTo(x - hw * 1.2, hy + H * 0.2, x - hw * 0.3, base - H * 0.12); ctx.lineTo(x, hy + H * 0.2); ctx.lineTo(x + hw * 0.4, base - H * 0.06); ctx.quadraticCurveTo(x + hw * 1.2, hy + H * 0.2, x + hw * 1.1, hy - H * 0.02); });
    } else if (!robe) {
      const legC = L.outfit === "armor" ? mix(cloth, "#8a9098", 0.4) : L.outfit === "garb" || L.outfit === "rags" ? mix(cloth, "#000000", 0.15) : L.skin;
      for (const sx of [-1, 1]) {
        const lx = x + sx * hw * 0.55, fx = x + sx * hw * (L.build === "stubby" ? 0.7 : 0.75);
        limb(ctx, [lx, hy, (lx + fx) / 2 + sx * H * 0.01, (hy + base) / 2, fx, base - H * 0.05], H * B.leg, legC, lw);
        paint(ctx, L.outfit === "armor" ? "#3a3a40" : L.arms === "claws" ? L.skin : "#3a2a1e", lw, () => ellipse(ctx, fx + sx * H * 0.02, base - H * 0.03, H * B.leg * 0.85, H * 0.035));
      }
    }
    // 胴
    const torso = () => {
      if (robe) { ctx.moveTo(x - sw, sy); ctx.quadraticCurveTo(x - sw * 1.05, hy, x - sw * 1.35, base - H * 0.01); ctx.lineTo(x + sw * 1.35, base - H * 0.01); ctx.quadraticCurveTo(x + sw * 1.05, hy, x + sw, sy); ctx.quadraticCurveTo(x, sy - H * 0.04, x - sw, sy); }
      else if (L.build === "stubby") ellipse(ctx, x, (sy + hy) / 2, sw, (hy - sy) * 0.62);
      else { ctx.moveTo(x - sw, sy); ctx.quadraticCurveTo(x - sw * 1.08, (sy + hy) / 2, x - hw, hy + H * 0.03); ctx.lineTo(x + hw, hy + H * 0.03); ctx.quadraticCurveTo(x + sw * 1.08, (sy + hy) / 2, x + sw, sy); ctx.quadraticCurveTo(x, sy - H * 0.05, x - sw, sy); }
    };
    const bodyC = robe || L.outfit === "garb" ? cloth : L.outfit === "armor" ? mix(cloth, "#9aa0a8", 0.35) : L.skin;
    paint(ctx, shade(ctx, x, (sy + hy) / 2, (hy - sy) * 0.8, bodyC), lw, torso);
    ctx.save(); ctx.beginPath(); torso(); ctx.clip();
    if (L.outfit === "none" || L.outfit === "loin") pattern(ctx, L, x, (sy + hy) / 2, sw, (hy - sy) / 2, lw, R);
    if (L.outfit === "rags") {
      ctx.fillStyle = shade(ctx, x, hy, sw, cloth); ctx.beginPath(); ctx.moveTo(x - sw * 1.2, sy + (hy - sy) * 0.25);
      for (let i = 0; i <= 6; i++) ctx.lineTo(x - sw * 1.2 + i * sw * 0.4, hy + H * 0.04 + (i % 2) * H * 0.04);
      ctx.lineTo(x + sw * 1.2, sy + (hy - sy) * 0.3); ctx.quadraticCurveTo(x, sy + (hy - sy) * 0.1, x - sw * 1.2, sy + (hy - sy) * 0.25); ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.5); ctx.lineWidth = lw; ctx.stroke();
      if (L.pattern && L.pattern !== "none") pattern(ctx, L, x, (sy + hy) / 2, sw, (hy - sy) / 2, lw, R);
    }
    if (L.outfit === "armor") {
      ctx.fillStyle = cloth; ctx.fillRect(x - sw * 0.45, sy, sw * 0.9, hy - sy + H * 0.05);
      ctx.strokeStyle = rgba(INK, 0.6); ctx.lineWidth = lw; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - sw * 1.1, sy + (hy - sy) * i / 4); ctx.quadraticCurveTo(x, sy + (hy - sy) * i / 4 + H * 0.02, x + sw * 1.1, sy + (hy - sy) * i / 4); ctx.stroke(); }
      if (L.pattern === "scars") pattern(ctx, Object.assign({}, L, { skin: cloth }), x, (sy + hy) / 2, sw, (hy - sy) / 2, lw, R);
    }
    if (robe) { ctx.strokeStyle = "#c8a040"; ctx.lineWidth = lw * 1.5; ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x, base); ctx.stroke(); ctx.fillStyle = rgba("#000000", 0.25); ctx.fillRect(x - sw * 1.5, hy - H * 0.01, sw * 3, H * 0.03); }
    if (L.outfit === "garb") { ctx.fillStyle = "#8a1a1a"; ctx.fillRect(x - sw * 1.2, hy - H * 0.05, sw * 2.4, H * 0.035); }
    if (L.extra.includes("fur")) { ctx.fillStyle = "#8a7050"; for (let i = 0; i < 9; i++) { ctx.beginPath(); ellipse(ctx, x - sw + i * sw * 0.25, sy + H * 0.01, sw * 0.18, H * 0.04); ctx.fill(); } }
    ctx.restore();
    if (L.outfit === "loin") {
      const lc = L.extra.includes("tigerloin") ? "#e0b030" : cloth;
      paint(ctx, shade(ctx, x, hy, hw * 1.2, lc), lw, () => { ctx.moveTo(x - hw * 1.15, hy - H * 0.04); ctx.lineTo(x + hw * 1.15, hy - H * 0.04); ctx.lineTo(x + hw * 0.9, hy + H * 0.1); ctx.lineTo(x + hw * 0.3, hy + H * 0.07); ctx.lineTo(x, hy + H * 0.13); ctx.lineTo(x - hw * 0.3, hy + H * 0.07); ctx.lineTo(x - hw * 0.9, hy + H * 0.1); ctx.closePath(); });
      if (L.extra.includes("tigerloin")) { ctx.strokeStyle = "#1a1210"; ctx.lineWidth = lw * 1.6; for (let i = 0; i < 5; i++) { const tx = x - hw * 0.9 + i * hw * 0.45; ctx.beginPath(); ctx.moveTo(tx, hy - H * 0.03); ctx.lineTo(tx + hw * 0.1, hy + H * 0.04); ctx.stroke(); } }
      ctx.fillStyle = "#3a2a1c"; ctx.fillRect(x - hw * 1.18, hy - H * 0.055, hw * 2.36, H * 0.025);
    }
    // 腕
    const armW = H * B.arm;
    const elbow = (sx, hand) => [x + sx * sw * 1.05 + (hand[0] - x - sx * sw) * 0.3 + sx * H * 0.03, (sy + hand[1]) / 2];
    for (const [sx, hand] of [[-1, handL], [1, handR]]) {
      const e = elbow(sx, hand);
      limb(ctx, [x + sx * sw * 0.9, sy + armW * 0.3, e[0], e[1], hand[0], hand[1]], armW, skinArm, lw);
    }
    if (L.extra.includes("pauldron") || L.outfit === "armor") for (const sx of [-1, 1]) paint(ctx, shade(ctx, x + sx * sw, sy, armW * 1.3, L.outfit === "armor" ? mix(cloth, "#b0b4bc", 0.5) : "#6a6a72"), lw, () => { ctx.moveTo(x + sx * sw * 0.55, sy - armW * 0.2); ctx.quadraticCurveTo(x + sx * (sw + armW * 1.3), sy - armW * 1.0, x + sx * (sw + armW * 1.1), sy + armW * 1.0); ctx.lineTo(x + sx * sw * 0.55, sy + armW * 0.6); ctx.closePath(); if (L.extra.includes("pauldron")) { ctx.moveTo(x + sx * (sw + armW * 0.4), sy - armW * 0.5); ctx.lineTo(x + sx * (sw + armW * 0.7), sy - armW * 1.6); ctx.lineTo(x + sx * (sw + armW * 0.95), sy - armW * 0.35); } });
    if (L.extra.includes("barrel")) {
      const by = (sy + hy) / 2 + H * 0.04, bw = sw * 1.3, bh = (hy - sy) * 0.75;
      paint(ctx, shade(ctx, x, by, bw, "#8a5a2a"), lw, () => { ctx.moveTo(x - bw * 0.9, by - bh); ctx.quadraticCurveTo(x - bw * 1.15, by, x - bw * 0.9, by + bh); ctx.lineTo(x + bw * 0.9, by + bh); ctx.quadraticCurveTo(x + bw * 1.15, by, x + bw * 0.9, by - bh); ctx.closePath(); });
      ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = lw * 2.2; for (const t of [-0.6, 0.6]) { ctx.beginPath(); ctx.moveTo(x - bw * 1.02, by + bh * t); ctx.quadraticCurveTo(x, by + bh * t + H * 0.02, x + bw * 1.02, by + bh * t); ctx.stroke(); }
      ctx.strokeStyle = rgba("#2a1a0a", 0.5); ctx.lineWidth = lw; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * bw * 0.35, by - bh); ctx.lineTo(x + i * bw * 0.38, by + bh); ctx.stroke(); }
    }
    // 手
    const handC = L.outfit === "armor" ? "#4a4a52" : L.skin;
    for (const [sx, hand] of [[-1, handL], [1, handR]]) {
      if (L.arms === "claws") { paint(ctx, handC, lw, () => ellipse(ctx, hand[0], hand[1], armW * 0.7, armW * 0.7)); ctx.fillStyle = "#f0e8d0"; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hand[0] + i * armW * 0.4 - armW * 0.12, hand[1] + armW * 0.4); ctx.lineTo(hand[0] + i * armW * 0.5 + sx * armW * 0.2, hand[1] + armW * 1.3); ctx.lineTo(hand[0] + i * armW * 0.4 + armW * 0.12, hand[1] + armW * 0.4); ctx.fill(); } }
      else paint(ctx, handC, lw, () => ellipse(ctx, hand[0], hand[1], armW * 0.62, armW * 0.62));
    }
    if (L.extra.includes("pouch")) paint(ctx, "#b08a3a", lw, () => ellipse(ctx, handL[0], handL[1] + armW * 0.9, armW * 0.8, armW * 0.7));
    if (L.extra.includes("gourd")) { ctx.strokeStyle = "#5a2a1a"; ctx.lineWidth = lw * 1.5; ctx.beginPath(); ctx.moveTo(handL[0], handL[1]); ctx.lineTo(handL[0], handL[1] + H * 0.05); ctx.stroke(); paint(ctx, shade(ctx, handL[0], handL[1] + H * 0.12, H * 0.06, "#d89a3a"), lw, () => { ellipse(ctx, handL[0], handL[1] + H * 0.08, H * 0.03, H * 0.028); ellipse(ctx, handL[0], handL[1] + H * 0.14, H * 0.045, H * 0.045); }); }
    // 首と頭
    if (L.head !== "helm" && L.head !== "hood") limb(ctx, [x, sy + hr * 0.1, x, headY + hr * 0.6], hr * 0.7, L.skin, lw);
    if (L.extra.includes("scarf")) { paint(ctx, "#a02020", lw, () => { ctx.moveTo(x - hr * 0.8, sy - hr * 0.1); ctx.lineTo(x + hr * 0.8, sy - hr * 0.1); ctx.lineTo(x + hr * 0.9, sy + hr * 0.3); ctx.lineTo(x - hr * 0.9, sy + hr * 0.3); }); paint(ctx, "#a02020", lw, () => { ctx.moveTo(x + hr * 0.6, sy); ctx.quadraticCurveTo(x + hr * 2.5, sy - hr * 0.3, x + hr * 3.6, sy - hr * 1.0); ctx.lineTo(x + hr * 3.2, sy - hr * 0.3); ctx.quadraticCurveTo(x + hr * 2.3, sy + hr * 0.4, x + hr * 0.6, sy + hr * 0.4); }); }
    head(ctx, L, x, headY, hr, lw, R);
    // 手に持つもの（頭より前）
    weapon(ctx, L, handR[0], handR[1], H, lw, 1);
    if (L.shield) shield(ctx, L, handL[0] - armW * 0.3, handL[1] - H * 0.05, H, lw);
    if (L.extra.includes("smoke")) { for (let i = 0; i < 7; i++) { const px = x + (R() - 0.5) * sw * 2.2, py = sy + R() * (hy - sy); ctx.fillStyle = rgba("#1a1420", 0.35); ctx.beginPath(); ellipse(ctx, px, py - H * 0.05, H * 0.03, H * 0.06); ctx.fill(); } }
    if (L.extra.includes("runes")) { glowOn(ctx, L.eye, H * 0.03); ctx.strokeStyle = rgba(L.eye, 0.85); ctx.lineWidth = lw; for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.9 + i * 0.45, rx = x + Math.cos(a) * sw * 2.6, ry = sy - H * 0.05 + Math.sin(a) * H * 0.25; ctx.beginPath(); ctx.moveTo(rx - H * 0.015, ry - H * 0.02); ctx.lineTo(rx + H * 0.015, ry); ctx.lineTo(rx - H * 0.01, ry + H * 0.02); ctx.moveTo(rx, ry - H * 0.02); ctx.lineTo(rx, ry + H * 0.02); ctx.stroke(); } glowOff(ctx); }
    return { top: headY - hr * 2.2, mid: (sy + hy) / 2, width: Math.max(sw * 3, L.wings && L.wings !== "none" ? sw * 7 : 0), H };
  }

  // ---------------------------------------------------------------- 体：四つ足（左を向く）
  function quad(ctx, L, x, base, U, R) {
    const lw = Math.max(1, U * 0.009);
    const rx = U * 0.4, ry = U * 0.17, by = base - U * 0.42;
    const fat = L.pattern === "ribs" ? 0.8 : 1;
    const legW = U * 0.075;
    const far = mix(L.skin, "#000000", 0.35);
    tail(ctx, L, x + rx * 0.9, by - ry * 0.3, U * 0.4, U * 0.05, 1, lw);
    // 奥の脚
    for (const fx of [-0.55, 0.6]) limb(ctx, [x + rx * fx + U * 0.04, by, x + rx * fx + U * 0.07, base - U * 0.16, x + rx * fx + U * 0.03, base - U * 0.03], legW * 0.9, far, lw);
    const body = () => ellipse(ctx, x, by, rx, ry * fat);
    if (L.head === "lion") paint(ctx, shade(ctx, x - rx * 0.95, by - U * 0.2, U * 0.3, L.skin2), lw, () => { for (let i = 0; i <= 14; i++) { const a = (i / 14) * TAU, r = U * (i % 2 ? 0.2 : 0.26); ctx.lineTo(x - rx * 0.95 + Math.cos(a) * r, by - U * 0.18 + Math.sin(a) * r); } ctx.closePath(); });
    paint(ctx, shade(ctx, x, by, rx, L.skin), lw, body);
    ctx.save(); ctx.beginPath(); body(); ctx.clip(); pattern(ctx, L, x, by, rx, ry, lw, R); ctx.fillStyle = rgba(L.skin2, 0.5); ctx.beginPath(); ellipse(ctx, x, by + ry * 0.7, rx * 0.8, ry * 0.4); ctx.fill(); ctx.restore();
    if (L.extra.includes("goathead")) {
      const gx = x + rx * 0.25, gy = by - ry - U * 0.14;
      limb(ctx, [gx, by - ry * 0.6, gx - U * 0.02, gy + U * 0.05], U * 0.06, "#8a7a6a", lw);
      paint(ctx, shade(ctx, gx, gy, U * 0.08, "#9a8a78"), lw, () => { ellipse(ctx, gx, gy, U * 0.065, U * 0.07); ctx.moveTo(gx - U * 0.05, gy + U * 0.02); ctx.lineTo(gx - U * 0.13, gy + U * 0.07); ctx.lineTo(gx - U * 0.03, gy + U * 0.07); });
      horns(ctx, { horns: "ram", extra: [] }, gx, gy + U * 0.02, U * 0.06, lw);
      ctx.fillStyle = "#ffe04a"; ctx.beginPath(); ellipse(ctx, gx - U * 0.03, gy - U * 0.01, U * 0.012, U * 0.012); ctx.fill();
    }
    // 手前の脚
    for (const fx of [-0.6, 0.55]) {
      limb(ctx, [x + rx * fx, by + ry * 0.2, x + rx * fx - U * 0.02, base - U * 0.17, x + rx * fx + U * 0.01, base - U * 0.03], legW, L.skin, lw);
      ctx.fillStyle = "#f0e8d0"; for (let i = 0; i < 3; i++) { const cx0 = x + rx * fx - U * 0.035 + i * U * 0.02; ctx.beginPath(); ctx.moveTo(cx0, base - U * 0.02); ctx.lineTo(cx0 - U * 0.012, base); ctx.lineTo(cx0 + U * 0.006, base - U * 0.015); ctx.fill(); }
    }
    // 首と頭
    const hx = x - rx * 1.05, hy = by - U * 0.17, hr = U * 0.12;
    limb(ctx, [x - rx * 0.6, by - ry * 0.3, hx + hr * 0.3, hy + hr * 0.2], U * 0.12, L.skin, lw);
    if (L.head !== "lion") paint(ctx, L.skin, lw, () => { ctx.moveTo(hx + hr * 0.1, hy - hr * 0.6); ctx.lineTo(hx + hr * 0.45, hy - hr * 1.7); ctx.lineTo(hx + hr * 0.85, hy - hr * 0.4); });
    paint(ctx, shade(ctx, hx, hy, hr, L.skin), lw, () => ellipse(ctx, hx, hy, hr, hr * 0.9));
    // 鼻づら（上あご・下あご）
    const open = L.mouth === "fangs" || L.mouth === "tongue" ? hr * 0.45 : hr * 0.15;
    paint(ctx, shade(ctx, hx - hr, hy + hr * 0.3, hr, L.skin2), lw, () => { ctx.moveTo(hx - hr * 0.3, hy + hr * 0.35); ctx.lineTo(hx - hr * 1.3, hy + hr * 0.35 + open * 0.8); ctx.lineTo(hx - hr * 1.2, hy + hr * 0.6 + open); ctx.lineTo(hx - hr * 0.2, hy + hr * 0.8); });
    paint(ctx, "#2a0a0c", 0, () => { ctx.moveTo(hx - hr * 0.3, hy + hr * 0.3); ctx.lineTo(hx - hr * 1.3, hy + hr * 0.35 + open * 0.8); ctx.lineTo(hx - hr * 0.3, hy + hr * 0.5); });
    paint(ctx, shade(ctx, hx - hr, hy, hr, L.skin), lw, () => { ctx.moveTo(hx - hr * 0.2, hy - hr * 0.5); ctx.quadraticCurveTo(hx - hr * 1.2, hy - hr * 0.4, hx - hr * 1.55, hy + hr * 0.15); ctx.lineTo(hx - hr * 1.5, hy + hr * 0.4); ctx.lineTo(hx - hr * 0.2, hy + hr * 0.4); });
    ctx.fillStyle = "#15100e"; ctx.beginPath(); ellipse(ctx, hx - hr * 1.48, hy + hr * 0.18, hr * 0.12, hr * 0.1); ctx.fill();
    ctx.fillStyle = "#f4efe0";
    for (let i = 0; i < 3; i++) { const tx = hx - hr * (1.2 - i * 0.3); ctx.beginPath(); ctx.moveTo(tx - hr * 0.08, hy + hr * 0.4); ctx.lineTo(tx + hr * 0.08, hy + hr * 0.4); ctx.lineTo(tx, hy + hr * (i === 0 ? 0.75 : 0.58)); ctx.fill(); }
    if (L.mouth === "tongue") paint(ctx, "#e0607a", lw * 0.6, () => { ctx.moveTo(hx - hr * 0.8, hy + hr * 0.6); ctx.quadraticCurveTo(hx - hr * 1.3, hy + hr * 1.3, hx - hr * 1.0, hy + hr * 1.4); ctx.quadraticCurveTo(hx - hr * 0.7, hy + hr * 1.1, hx - hr * 0.6, hy + hr * 0.65); });
    eyes(ctx, Object.assign({}, L, { eyeN: 1 }), hx - hr * 0.35, hy - hr * 0.15, hr * 0.16, 0, R, lw);
    return { top: hy - hr * 2, mid: by, width: rx * 2.8, H: U * 0.7 };
  }

  // ---------------------------------------------------------------- 体：まるいもの
  function blob(ctx, L, x, base, U, R) {
    const lw = Math.max(1, U * 0.009);
    const w = U * 0.42, h = U * 0.5;
    const see = L.extra.includes("bubbles");
    const body = () => { ctx.moveTo(x - w, base); ctx.bezierCurveTo(x - w * 1.1, base - h * 0.6, x - w * 0.6, base - h * 1.05, x, base - h); ctx.bezierCurveTo(x + w * 0.6, base - h * 1.05, x + w * 1.1, base - h * 0.6, x + w, base); for (let i = 0; i < 6; i++) ctx.quadraticCurveTo(x + w - (i + 0.5) * w / 3, base + U * 0.03, x + w - (i + 1) * w / 3, base); };
    paint(ctx, see ? rgba(L.skin, 0.72) : shade(ctx, x, base - h * 0.5, w, L.skin), lw, body);
    ctx.save(); ctx.beginPath(); body(); ctx.clip();
    if (L.extra.includes("bone")) { ctx.save(); ctx.translate(x + w * 0.35, base - h * 0.25); ctx.rotate(0.6); ctx.fillStyle = rgba("#f0ead8", 0.6); ctx.fillRect(-w * 0.25, -U * 0.012, w * 0.5, U * 0.024); for (const s of [-1, 1]) { ctx.beginPath(); ellipse(ctx, s * w * 0.25, -U * 0.015, U * 0.02, U * 0.02); ellipse(ctx, s * w * 0.25, U * 0.015, U * 0.02, U * 0.02); ctx.fill(); } ctx.restore(); ctx.beginPath(); ellipse(ctx, x - w * 0.45, base - h * 0.2, U * 0.04, U * 0.045); ctx.fillStyle = rgba("#f0ead8", 0.45); ctx.fill(); }
    if (see) for (let i = 0; i < 9; i++) { ctx.strokeStyle = rgba("#ffffff", 0.5); ctx.lineWidth = lw * 0.6; ctx.beginPath(); ellipse(ctx, x + (R() - 0.5) * w * 1.5, base - R() * h * 0.8, U * (0.008 + R() * 0.02), U * (0.008 + R() * 0.02)); ctx.stroke(); }
    pattern(ctx, L, x, base - h * 0.45, w, h * 0.5, lw, R);
    ctx.fillStyle = rgba("#ffffff", 0.35); ctx.beginPath(); ellipse(ctx, x - w * 0.4, base - h * 0.75, w * 0.18, h * 0.1, -0.6); ctx.fill();
    ctx.restore();
    eyes(ctx, L, x, base - h * 0.62, U * 0.05, w * 0.35, R, lw);
    mouth(ctx, L, x, base - h * 0.35, w * 0.3, lw);
    if (L.extra.includes("crown")) crown(ctx, x + w * 0.1, base - h * 0.97, U * 0.1, lw);
    if (L.extra.includes("blush")) { ctx.fillStyle = "rgba(255,90,110,.45)"; ctx.beginPath(); ellipse(ctx, x - w * 0.5, base - h * 0.45, U * 0.04, U * 0.022); ellipse(ctx, x + w * 0.5, base - h * 0.45, U * 0.04, U * 0.022); ctx.fill(); }
    if (L.extra.includes("sweat")) paint(ctx, "#bfe6ff", lw * 0.6, () => { const sx = x + w * 0.75, sy = base - h * 0.85; ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + U * 0.04, sy + U * 0.06, sx, sy + U * 0.07); ctx.quadraticCurveTo(sx - U * 0.04, sy + U * 0.06, sx, sy); });
    return { top: base - h, mid: base - h * 0.5, width: w * 2, H: h };
  }

  // ---------------------------------------------------------------- 体：宝箱
  function chest(ctx, L, x, base, U, R) {
    const lw = Math.max(1, U * 0.01);
    const w = U * 0.36, h = U * 0.26, top = base - h;
    const wood = L.skin, band = L.skin2;
    // ふた（後ろに開く）
    paint(ctx, shade(ctx, x, top - U * 0.2, w, mix(wood, "#000000", 0.2)), lw, () => { ctx.moveTo(x - w, top); ctx.lineTo(x - w * 1.05, top - U * 0.3); ctx.quadraticCurveTo(x, top - U * 0.42, x + w * 1.05, top - U * 0.3); ctx.lineTo(x + w, top); ctx.closePath(); });
    // 口の中
    paint(ctx, "#4a0a14", lw, () => { ctx.moveTo(x - w * 0.95, top); ctx.lineTo(x - w * 0.98, top - U * 0.26); ctx.quadraticCurveTo(x, top - U * 0.36, x + w * 0.98, top - U * 0.26); ctx.lineTo(x + w * 0.95, top); ctx.closePath(); });
    ctx.fillStyle = "#f4efe0";
    for (let i = 0; i < 8; i++) { const tx = x - w * 0.85 + i * w * 0.243; ctx.beginPath(); ctx.moveTo(tx - w * 0.1, top - U * 0.28 - Math.sin((i / 7) * Math.PI) * U * 0.06); ctx.lineTo(tx + w * 0.1, top - U * 0.28 - Math.sin((i / 7) * Math.PI) * U * 0.06); ctx.lineTo(tx, top - U * 0.16 - Math.sin((i / 7) * Math.PI) * U * 0.05); ctx.fill(); ctx.beginPath(); ctx.moveTo(tx - w * 0.1, top); ctx.lineTo(tx + w * 0.1, top); ctx.lineTo(tx, top - U * 0.09); ctx.fill(); }
    eyes(ctx, L, x, top - U * 0.19, U * 0.035, w * 0.35, R, lw);
    // 箱
    paint(ctx, shade(ctx, x, base - h / 2, w, wood), lw, () => ctx.rect(x - w, top, w * 2, h));
    ctx.strokeStyle = rgba("#2a1608", 0.6); ctx.lineWidth = lw; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - w, top + (h * i) / 3); ctx.lineTo(x + w, top + (h * i) / 3); ctx.stroke(); }
    for (const bx of [-0.75, 0.75]) paint(ctx, band, lw, () => ctx.rect(x + w * bx - w * 0.07, top, w * 0.14, h));
    paint(ctx, band, lw, () => ctx.rect(x - w * 0.1, top, w * 0.2, h * 0.35));
    ctx.fillStyle = "#1a1008"; ctx.beginPath(); ellipse(ctx, x, top + h * 0.2, w * 0.03, w * 0.04); ctx.fill();
    // 舌
    paint(ctx, "#d0506a", lw, () => { ctx.moveTo(x - w * 0.3, top - U * 0.02); ctx.bezierCurveTo(x - w * 0.5, top + h * 0.6, x - w * 1.4, top + h * 0.2, x - w * 1.3, base - U * 0.01); ctx.quadraticCurveTo(x - w * 1.1, base - h * 0.35, x - w * 0.9, base - h * 0.2); ctx.bezierCurveTo(x - w * 0.9, top + h * 0.4, x - w * 0.1, top + h * 0.4, x + w * 0.1, top - U * 0.02); });
    // こぼれた金貨
    for (let i = 0; i < 5; i++) paint(ctx, "#e8c040", lw * 0.6, () => ellipse(ctx, x + w * (0.6 + R() * 0.8), base - U * 0.012 - i % 2 * U * 0.015, U * 0.025, U * 0.012));
    return { top: top - U * 0.42, mid: base - h, width: w * 2.6, H: U * 0.7 };
  }

  // ---------------------------------------------------------------- 体：虫（大蜘蛛）
  function bug(ctx, L, x, base, U, R) {
    const lw = Math.max(1, U * 0.009);
    const ax = x + U * 0.2, ay = base - U * 0.42, ar = U * 0.27;
    const cx = x - U * 0.12, cy = base - U * 0.3, cr = U * 0.15;
    const leg = (sx, i, near) => {
      const ang = (i - 1.5) * 0.35, rootx = cx + sx * cr * 0.4, rooty = cy + (i - 1.5) * cr * 0.2;
      const kx = rootx + sx * U * (0.28 + i * 0.03) , ky = base - U * (0.62 - Math.abs(ang) * 0.3) - (near ? 0 : U * 0.04);
      const fx = rootx + sx * U * (0.45 + i * 0.08), fy = base - (near ? 0 : U * 0.04);
      limb(ctx, [rootx, rooty, kx, ky, fx, fy], U * (near ? 0.04 : 0.035), near ? L.skin : mix(L.skin, "#000000", 0.4), lw);
      ctx.strokeStyle = rgba("#b09090", 0.6); ctx.lineWidth = lw * 0.6; for (let j = 0; j < 3; j++) { const t = 0.3 + j * 0.2, px = kx + (fx - kx) * t, py = ky + (fy - ky) * t; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sx * U * 0.02, py - U * 0.02); ctx.stroke(); }
    };
    for (let i = 0; i < 4; i++) { leg(-1, i, false); leg(1, i, false); }
    paint(ctx, shade(ctx, ax, ay, ar, L.skin), lw, () => ellipse(ctx, ax, ay, ar, ar * 0.85));
    ctx.save(); ctx.beginPath(); ellipse(ctx, ax, ay, ar, ar * 0.85); ctx.clip(); pattern(ctx, L, ax, ay, ar, ar * 0.85, lw, R);
    ctx.strokeStyle = rgba("#b09090", 0.35); ctx.lineWidth = lw * 0.6; for (let i = 0; i < 30; i++) { const a = R() * TAU, r = ar * (0.7 + R() * 0.3); ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * r, ay + Math.sin(a) * r * 0.85); ctx.lineTo(ax + Math.cos(a) * (r + ar * 0.12), ay + Math.sin(a) * (r + ar * 0.12) * 0.85); ctx.stroke(); }
    ctx.restore();
    for (let i = 0; i < 4; i++) { leg(-1, i, true); leg(1, i, true); }
    paint(ctx, shade(ctx, cx, cy, cr, mix(L.skin, "#ffffff", 0.08)), lw, () => ellipse(ctx, cx, cy, cr, cr * 0.9));
    // 牙
    for (const sx of [-1, 1]) paint(ctx, "#1a1014", lw, () => { ctx.moveTo(cx + sx * cr * 0.4, cy + cr * 0.5); ctx.quadraticCurveTo(cx + sx * cr * 0.55, cy + cr * 1.2, cx + sx * cr * 0.1, cy + cr * 1.35); ctx.quadraticCurveTo(cx + sx * cr * 0.3, cy + cr * 1.0, cx + sx * cr * 0.1, cy + cr * 0.6); });
    ctx.fillStyle = "rgba(170,255,120,.8)"; ctx.beginPath(); ellipse(ctx, cx - cr * 0.1, cy + cr * 1.45, cr * 0.06, cr * 0.1); ctx.fill();
    eyes(ctx, L, cx, cy - cr * 0.05, cr * 0.13, cr * 0.4, R, lw);
    return { top: ay - ar, mid: ay, width: U * 1.2, H: U * 0.7 };
  }

  // ---------------------------------------------------------------- 体：竜（翼竜・屍竜）
  function wyrm(ctx, L, x, base, U, R) {
    const lw = Math.max(1, U * 0.009);
    const bones = !!L.bones;
    const bx = x + U * 0.05, by = base - U * 0.42, rx = U * 0.3, ry = U * 0.16;
    const hx = x - U * 0.42, hy = base - U * 0.86, hr = U * 0.1;
    const skin = L.skin, boneC = L.skin2;
    wings(ctx, L, bx, by - ry * 0.6, U * 0.75, lw, R);
    // 尾
    const tailRun = () => { ctx.beginPath(); ctx.moveTo(bx + rx * 0.7, by); ctx.bezierCurveTo(bx + rx * 1.6, by + ry * 1.2, bx + rx * 2.4, base - U * 0.04, bx + rx * 2.6, base - U * 0.3); };
    ctx.lineCap = "round";
    tailRun(); ctx.strokeStyle = INK; ctx.lineWidth = U * 0.08 + lw * 2; ctx.stroke(); tailRun(); ctx.strokeStyle = bones ? rgba(skin, 0.8) : skin; ctx.lineWidth = U * 0.08; ctx.stroke();
    if (bones) { tailRun(); ctx.setLineDash([U * 0.025, U * 0.02]); ctx.strokeStyle = boneC; ctx.lineWidth = U * 0.04; ctx.stroke(); ctx.setLineDash([]); }
    if (L.tail === "spike") paint(ctx, bones ? boneC : "#e6dcc0", lw, () => { const ex = bx + rx * 2.6, ey = base - U * 0.3; ctx.moveTo(ex - U * 0.04, ey + U * 0.02); ctx.lineTo(ex + U * 0.03, ey - U * 0.12); ctx.lineTo(ex + U * 0.05, ey + U * 0.01); });
    // 脚
    for (const [fx, near] of [[0.5, false], [-0.4, false], [0.45, true], [-0.45, true]]) {
      const lx = bx + rx * fx + (near ? 0 : U * 0.04);
      limb(ctx, [lx, by, lx + U * 0.05, base - U * 0.16, lx - U * 0.02, base - U * 0.03], U * (near ? 0.075 : 0.06), bones ? (near ? boneC : mix(boneC, "#000000", 0.4)) : near ? skin : mix(skin, "#000000", 0.35), lw);
      ctx.fillStyle = "#f0e8d0"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(lx - U * 0.05 + i * U * 0.025, base - U * 0.02); ctx.lineTo(lx - U * 0.065 + i * U * 0.025, base); ctx.lineTo(lx - U * 0.035 + i * U * 0.025, base - U * 0.012); ctx.fill(); }
    }
    // 首
    const neckRun = () => { ctx.beginPath(); ctx.moveTo(bx - rx * 0.6, by - ry * 0.2); ctx.bezierCurveTo(bx - rx * 1.3, by - ry * 0.8, hx + U * 0.12, hy + U * 0.3, hx + hr * 0.4, hy + hr * 0.3); };
    neckRun(); ctx.strokeStyle = INK; ctx.lineWidth = U * 0.11 + lw * 2; ctx.stroke(); neckRun(); ctx.strokeStyle = bones ? rgba(skin, 0.85) : skin; ctx.lineWidth = U * 0.11; ctx.stroke();
    if (bones) { neckRun(); ctx.setLineDash([U * 0.03, U * 0.018]); ctx.strokeStyle = boneC; ctx.lineWidth = U * 0.05; ctx.stroke(); ctx.setLineDash([]); }
    else { neckRun(); ctx.strokeStyle = rgba(L.skin2, 0.6); ctx.lineWidth = U * 0.04; ctx.stroke(); }
    // 胴
    const body = () => ellipse(ctx, bx, by, rx, ry);
    paint(ctx, bones ? rgba(skin, 0.85) : shade(ctx, bx, by, rx, skin), lw, body);
    ctx.save(); ctx.beginPath(); body(); ctx.clip();
    if (bones) {
      ctx.strokeStyle = boneC; ctx.lineCap = "round";
      ctx.lineWidth = U * 0.03; ctx.beginPath(); ctx.moveTo(bx - rx, by - ry * 0.55); ctx.quadraticCurveTo(bx, by - ry * 0.9, bx + rx, by - ry * 0.4); ctx.stroke();
      ctx.lineWidth = U * 0.018; for (let i = 0; i < 7; i++) { const px = bx - rx * 0.75 + i * rx * 0.24; ctx.beginPath(); ctx.moveTo(px, by - ry * 0.7); ctx.quadraticCurveTo(px - rx * 0.12, by + ry * 0.2, px + rx * 0.02, by + ry * 0.9); ctx.stroke(); }
    } else { ctx.fillStyle = rgba(L.skin2, 0.8); ctx.beginPath(); ellipse(ctx, bx, by + ry * 0.7, rx * 0.85, ry * 0.45); ctx.fill(); ctx.strokeStyle = rgba(INK, 0.35); ctx.lineWidth = lw; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(bx - rx * 0.7 + i * rx * 0.28, by + ry * 0.35); ctx.lineTo(bx - rx * 0.7 + i * rx * 0.28, by + ry); ctx.stroke(); } }
    ctx.restore();
    if (L.extra.includes("sword_in")) { ctx.save(); ctx.translate(bx - rx * 0.1, by + ry * 0.1); ctx.rotate(-0.5); glowOn(ctx, "#ff5a5a", U * 0.06); paint(ctx, "#3a1418", lw, () => ctx.rect(-U * 0.012, -U * 0.02, U * 0.024, U * 0.22)); paint(ctx, "#8a2a2a", lw, () => ctx.rect(-U * 0.05, -U * 0.02, U * 0.1, U * 0.022)); paint(ctx, "#2a1a1a", lw, () => ctx.rect(-U * 0.015, -U * 0.12, U * 0.03, U * 0.1)); glowOff(ctx); ctx.restore(); }
    // 頭（左を向く）
    const headC = bones ? boneC : skin;
    horns(ctx, L, hx + hr * 0.4, hy, hr, lw);
    paint(ctx, shade(ctx, hx, hy, hr, headC), lw, () => { ctx.moveTo(hx + hr * 0.9, hy - hr * 0.5); ctx.quadraticCurveTo(hx, hy - hr * 1.1, hx - hr * 1.9, hy - hr * 0.1); ctx.lineTo(hx - hr * 1.95, hy + hr * 0.25); ctx.lineTo(hx + hr * 0.2, hy + hr * 0.3); ctx.quadraticCurveTo(hx + hr * 1.1, hy + hr * 0.3, hx + hr * 0.9, hy - hr * 0.5); });
    paint(ctx, "#2a0a0c", lw, () => { ctx.moveTo(hx - hr * 1.95, hy + hr * 0.25); ctx.lineTo(hx + hr * 0.1, hy + hr * 0.3); ctx.lineTo(hx - hr * 1.6, hy + hr * 0.95); ctx.closePath(); });
    paint(ctx, shade(ctx, hx, hy + hr, hr, headC), lw, () => { ctx.moveTo(hx + hr * 0.2, hy + hr * 0.3); ctx.lineTo(hx - hr * 1.65, hy + hr * 0.9); ctx.lineTo(hx - hr * 1.6, hy + hr * 1.12); ctx.quadraticCurveTo(hx - hr * 0.5, hy + hr * 0.95, hx + hr * 0.4, hy + hr * 0.55); ctx.closePath(); });
    ctx.fillStyle = "#f4efe0"; for (let i = 0; i < 5; i++) { const tx = hx - hr * (1.75 - i * 0.38); ctx.beginPath(); ctx.moveTo(tx - hr * 0.08, hy + hr * 0.25); ctx.lineTo(tx + hr * 0.08, hy + hr * 0.27); ctx.lineTo(tx, hy + hr * (i === 0 ? 0.65 : 0.5)); ctx.fill(); }
    if (bones) { ctx.fillStyle = "#0a0806"; ctx.beginPath(); ellipse(ctx, hx - hr * 1.2, hy - hr * 0.05, hr * 0.14, hr * 0.08); ctx.fill(); }
    eyes(ctx, Object.assign({}, L, { eyeN: 1 }), hx - hr * 0.15, hy - hr * 0.3, hr * 0.2, 0, R, lw);
    if (L.eyes === "hollow") { ctx.fillStyle = rgba(L.eye, 0.25); ctx.beginPath(); ellipse(ctx, hx - hr * 0.8, hy + hr * 0.6, hr * 0.8, hr * 0.3); ctx.fill(); }
    return { top: base - U * 1.15, mid: by, width: U * 1.6, H: U };
  }

  // ---------------------------------------------------------------- 群れ
  function swarm(ctx, L, x, base, U, R) {
    const n = Math.max(2, Math.min(6, L.count || 3));
    const one = Object.assign({}, L, { body: "biped" });
    const step = U * 0.34;
    // 奥の列から
    const order = [];
    for (let i = 0; i < n; i++) order.push({ i, back: i % 2 === 1 });
    order.sort((a, b) => Number(b.back) - Number(a.back));
    let top = base;
    for (const o of order) {
      const px = x + (o.i - (n - 1) / 2) * step + (R() - 0.5) * U * 0.05;
      const pb = base - (o.back ? U * 0.06 : 0);
      const k = (o.back ? 0.62 : 0.72) * (0.92 + R() * 0.16);
      ctx.save(); if (o.back) ctx.globalAlpha = 0.9;
      const g = biped(ctx, one, px, pb, U * k, R, 1.2);
      ctx.restore();
      if (o.back) { ctx.fillStyle = "rgba(0,0,0,.18)"; }
      top = Math.min(top, g.top);
    }
    return { top, mid: base - U * 0.35, width: step * n, H: U * 0.72 };
  }

  const BODIES = { biped, quad, blob, chest, bug, wyrm, swarm };
  // 体ごとの背の高さの目安（はみ出さないように縮める）
  const TALL = { biped: 1.05, quad: 0.8, blob: 0.55, chest: 0.72, bug: 0.72, wyrm: 1.2, swarm: 0.85 };

  // ---------------------------------------------------------------- ボスの光・絶界
  function aura(ctx, L, x, base, U, R) {
    const c = L.aura;
    const cy = base - U * 0.5;
    const g = ctx.createRadialGradient(x, cy, U * 0.05, x, cy, U * 0.95);
    g.addColorStop(0, rgba(c, 0.55)); g.addColorStop(0.5, rgba(c, 0.22)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - U, cy - U, U * 2, U * 2);
    // 立ちのぼる気
    for (let i = 0; i < 9; i++) {
      const px = x + (R() - 0.5) * U * 0.9, py = base - U * (0.1 + R() * 0.5), h = U * (0.25 + R() * 0.35);
      ctx.fillStyle = rgba(c, 0.18 + R() * 0.12);
      ctx.beginPath(); ctx.moveTo(px - U * 0.05, py); ctx.quadraticCurveTo(px - U * 0.07, py - h * 0.6, px + (R() - 0.5) * U * 0.1, py - h); ctx.quadraticCurveTo(px + U * 0.06, py - h * 0.5, px + U * 0.05, py); ctx.fill();
    }
  }
  // 絶界：人の武器を弾く、魔人を包む光の殻
  function barrier(ctx, L, x, base, U, R) {
    const cy = base - U * 0.58, rx = U * 0.78, ry = U * 0.72;
    const c1 = "#ffe2a8", c2 = L.aura || "#ff3030";
    ctx.save();
    ctx.beginPath(); ellipse(ctx, x, cy, rx, ry); ctx.clip();
    const g = ctx.createRadialGradient(x, cy, rx * 0.5, x, cy, rx);
    g.addColorStop(0, rgba(c2, 0)); g.addColorStop(0.8, rgba(c2, 0.08)); g.addColorStop(1, rgba(c1, 0.35));
    ctx.fillStyle = g; ctx.fillRect(x - rx, cy - ry, rx * 2, ry * 2);
    // 六角の格子
    ctx.strokeStyle = rgba(c1, 0.22); ctx.lineWidth = Math.max(1, U * 0.004);
    const s = U * 0.09;
    for (let row = -9; row <= 9; row++) for (let col = -9; col <= 9; col++) {
      const hx = x + col * s * 1.5, hy = cy + row * s * 1.732 + (col % 2 ? s * 0.866 : 0);
      if (((hx - x) / rx) ** 2 + ((hy - cy) / ry) ** 2 < 0.45) continue;
      ctx.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k / 6) * TAU; ctx.lineTo(hx + Math.cos(a) * s, hy + Math.sin(a) * s); } ctx.stroke();
    }
    ctx.restore();
    glowOn(ctx, c2, U * 0.08);
    ctx.strokeStyle = rgba(c1, 0.85); ctx.lineWidth = Math.max(1.5, U * 0.008);
    ctx.beginPath(); ellipse(ctx, x, cy, rx, ry); ctx.stroke();
    // 輪に刻まれた紋
    ctx.fillStyle = rgba(c1, 0.95);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + R() * 0.05, px = x + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 2);
      if (i % 3 === 0) { ctx.fillRect(-U * 0.012, -U * 0.025, U * 0.024, U * 0.05); } else { ctx.beginPath(); ctx.moveTo(0, -U * 0.02); ctx.lineTo(U * 0.012, 0); ctx.lineTo(0, U * 0.02); ctx.lineTo(-U * 0.012, 0); ctx.fill(); }
      ctx.restore();
    }
    glowOff(ctx);
  }
  // 絶界の後ろの光の筋
  function rays(ctx, L, x, base, U) {
    const cy = base - U * 0.6;
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      const g = ctx.createLinearGradient(x, cy, x + Math.cos(a) * U * 1.3, cy + Math.sin(a) * U * 1.3);
      g.addColorStop(0, rgba("#ffd9a0", 0.28)); g.addColorStop(1, rgba("#ffd9a0", 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + Math.cos(a - 0.07) * U * 1.3, cy + Math.sin(a - 0.07) * U * 1.3); ctx.lineTo(x + Math.cos(a + 0.07) * U * 1.3, cy + Math.sin(a + 0.07) * U * 1.3); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 入口
  G.paintMonster = (ctx, x, base, s, f) => {
    f = f || {};
    let e = (G.data && G.data.ENEMIES && G.data.ENEMIES[f.id]) || { shape: f.shape, eye: f.eye, boss: f.boss };
    // 出来事の絵（art_people.js）は、敵の見た目を少し変えて描ける（{ id, look }。look が敵のデータの look に重なる）
    if (f.look) e = Object.assign({}, e, { look: Object.assign({}, e.look || {}, f.look) });
    const L = G.monsterLook(f.id || f.shape || "foe", e);
    const R = rng(L.seed);
    let U = s * (L.size || 1);
    const tall = TALL[L.body] || 1;
    const bld = L.body === "biped" ? (BUILDS[L.build] || BUILDS.normal).h : 1;
    const maxU = (base * 0.93) / (tall * bld + (L.horns && L.horns !== "none" ? 0.12 : 0));
    if (U > maxU) U = maxU;
    ctx.save();
    // 地面の影
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ellipse(ctx, x, base - 1, U * (L.body === "wyrm" ? 0.7 : L.body === "swarm" ? 0.75 : 0.42), U * 0.05); ctx.fill();
    if (L.barrier) rays(ctx, L, x, base, U * bld);
    if (L.aura) aura(ctx, L, x, base, U * Math.max(bld, 0.8), R);
    const draw = BODIES[L.body] || biped;
    draw(ctx, L, x, base, U, R);
    if (L.barrier) barrier(ctx, L, x, base, U * bld, R);
    ctx.restore();
  };
})(globalThis.G = globalThis.G || {});
