// R1：種族の絵（エルフのとがった耳・獣人の頭の上の耳や羽）。人物の絵（art_people.js）の who に look を足すだけ。
// 主人公（G.heroWho）は profile.race・profile.beast から、仲間（G.companionWho）は c.race・c.beast から。出来事の人物は who.look に
// { beast: "wolf", ears: "none" } か { ears: "pointy" } を書けばよい。エルフは長く生きるので、絵の歳は見た目の歳（D.RACES.elf.look）にする。
// レーン A（絵）＋C（R1）
(function (G) {
  const D = G.data;

  // 種族 → 絵の look
  const lookOf = (r) => (r.race === "elf" ? { ears: "pointy" } : r.race === "beast" ? { ears: "none", beast: r.beast } : null);

  const hero0 = G.heroWho;
  G.heroWho = (p, cls) => {
    const w = hero0(p, cls);
    const r = G.r1Of ? G.r1Of({ profile: p || {} }) : { race: "human" };
    const lk = lookOf(r);
    if (!lk) return w;
    w.look = Object.assign({}, w.look, lk);
    w.seed += `:${r.race}${r.beast || ""}`;
    if (r.race === "elf") {
      const L = D.RACES.elf.look || {};
      const band = (p && p.ageBand) || "prime";
      w.age = L[band] || 26;
    }
    return w;
  };
  const comp0 = G.companionWho;
  G.companionWho = (c) => {
    const w = comp0(c);
    if (!w || w.kind === "foe" || !G.r1Comp) return w;
    const lk = lookOf(G.r1Comp(c));
    if (!lk) return w;
    w.look = Object.assign({}, w.look, lk);
    if (lk.ears === "pointy") w.age = Math.min(w.age || 30, 34);
    return w;
  };

  // 頭の上の耳（art_people.js の paintPerson が、髪の前・帽子の前に呼ぶ）
  // 形：tri 三角（狼・狐・猫）・round 丸（熊・鼠）・long 長い（兎）・tuft 羽の房（鳥）
  const SHAPE = { wolf: ["tri", 1.0, 0.95], fox: ["tri", 1.15, 1.05], cat: ["tri", 0.8, 0.9], bear: ["round", 0.75, 0.75], rat: ["round", 1.05, 1.0], rabbit: ["long", 0.7, 2.0], bird: ["tuft", 1.0, 1.0] };
  G.r1PaintEars = (ctx, L, cx, cy, rx, ry, U, k) => {
    const [shape, wMul, hMul] = SHAPE[L.beast] || SHAPE.wolf;
    const fur = L.hair || "#6a5a4a";
    const inner = L.beast === "fox" ? "#f0e6da" : k.mix(L.skin, "#d08080", 0.35);
    const stroke = () => { ctx.lineWidth = U * 0.008; ctx.strokeStyle = k.INK; ctx.lineJoin = "round"; ctx.stroke(); };
    for (const s of [-1, 1]) {
      const bx = cx + s * rx * 0.62, by = cy - ry * 0.72;
      const w = rx * 0.36 * wMul, h = ry * 0.5 * hMul;
      ctx.beginPath();
      if (shape === "tri") {
        ctx.moveTo(bx - w, by + h * 0.25); ctx.lineTo(bx + s * w * 0.35, by - h); ctx.lineTo(bx + w, by + h * 0.2); ctx.closePath();
        ctx.fillStyle = fur; ctx.fill(); stroke();
        ctx.beginPath(); ctx.moveTo(bx - w * 0.5, by + h * 0.1); ctx.lineTo(bx + s * w * 0.3, by - h * 0.62); ctx.lineTo(bx + w * 0.5, by + h * 0.08); ctx.closePath();
        ctx.fillStyle = inner; ctx.fill();
      } else if (shape === "round") {
        ctx.ellipse(bx + s * w * 0.2, by - h * 0.25, w, h * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = fur; ctx.fill(); stroke();
        ctx.beginPath(); ctx.ellipse(bx + s * w * 0.2, by - h * 0.2, w * 0.55, h * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = inner; ctx.fill();
      } else if (shape === "long") {
        ctx.ellipse(bx + s * w * 0.4, by - h * 0.5, w, h * 0.62, s * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = fur; ctx.fill(); stroke();
        ctx.beginPath(); ctx.ellipse(bx + s * w * 0.4, by - h * 0.48, w * 0.45, h * 0.48, s * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = inner; ctx.fill();
      } else {
        // 羽の房：耳のあたりから、後ろへ三枚
        for (let i = 0; i < 3; i++) {
          const fx = cx + s * rx * (0.9 + i * 0.05), fy = k.ey - ry * (0.15 + i * 0.16);
          ctx.beginPath();
          ctx.ellipse(fx + s * rx * 0.22, fy - ry * 0.05, rx * 0.3, ry * 0.08, s * (-0.5 - i * 0.25), 0, Math.PI * 2);
          ctx.fillStyle = i === 1 ? k.mix(fur, "#ffffff", 0.25) : fur; ctx.fill(); stroke();
        }
      }
    }
  };
})(globalThis.G = globalThis.G || {});
