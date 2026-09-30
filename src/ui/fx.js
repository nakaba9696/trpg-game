// 戦闘の演出（B1）：ダメージの揺れ・敵の倒れる演出・ボスの前口上。
// エンジン（combat.js）が記録に添えた fx を読んで描くだけ。ui.js が描き直すたびに G.fx.play(増えた記録, G.S) を呼ぶ。
//   hit 敵の札が揺れて数字が飛ぶ・背景に斬撃 / crit 画面が白く光る / wall 絶界の波紋 / down 敵が崩れ落ちる
//   hurt 画面が揺れて赤く染まる（heavy は強く） / boss 前口上の帯を背景に重ねる
// 動きを減らす設定（prefers-reduced-motion）では、揺れと沈み込みをやめ、色の変化だけにする。
// 乱数は使わない（絵の粒は名前から作る）。レーン B＋U（戦闘の演出）が管理
(function (G) {
  const fx = (G.fx = {});
  const STEP = 240; // 演出と演出の間（ミリ秒）
  const MAX_DELAY = 1700;

  // 増えた記録から、演出の順番表を作る（DOM なし。テストからも呼べる）
  fx.plan = (entries) => {
    const out = [];
    let t = 0;
    (entries || []).forEach((e) => {
      if (!e || !e.fx) return;
      out.push({ at: Math.min(t, MAX_DELAY), fx: e.fx, foe: e.foe, n: e.n || 0, heavy: !!e.heavy, boss: !!e.boss, name: e.name, text: e.text });
      // 会心の光は次の数字と同時に出す。前口上は帯が出てから、ほかを始める
      t += e.fx === "crit" ? 0 : e.fx === "boss" ? 600 : STEP;
    });
    return out;
  };

  if (typeof document === "undefined") return;

  // ---------------------------------------------------------------- 小道具
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const later = (ms, fn) => setTimeout(fn, ms);
  // 同じ名前ならいつも同じ並びになる、絵のための数列
  function seq(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
    return () => { s = (s + 0x6d2b79f5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // 一度だけクラスを付け直す（続けて同じ演出が来ても最初から動く）
  function pulse(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    later(ms, () => el.classList.remove(cls));
  }
  const cardOf = (name) => Array.from(document.querySelectorAll("#panel .foe[data-foe]")).find((c) => c.dataset.foe === name);

  // ---------------------------------------------------------------- 前の手番の敵（倒れた敵を描くため）
  // 背景に並んでいた敵（scene.js が描いた順）と、札の HP を覚えておく
  let shown = [];
  let hpSeen = {};
  function remember(S) {
    const C = S && S.combat;
    shown = C ? C.foes.filter((f) => f.hp > 0).map((f) => ({ name: f.name, id: f.id, hp: f.hp, max: f.max })) : [];
    hpSeen = {};
    if (C) C.foes.forEach((f) => { hpSeen[f.name] = f.hp; });
  }

  // ---------------------------------------------------------------- 背景の上の層
  function layer() {
    const scene = $(".scene");
    if (!scene) return null;
    let cv = scene.querySelector("canvas.fxLayer");
    if (!cv) { cv = h("canvas", "fxLayer"); cv.setAttribute("aria-hidden", "true"); scene.append(cv); }
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width)), hh = Math.max(1, Math.round(r.height));
    if (cv.width !== w * dpr || cv.height !== hh * dpr) { cv.width = w * dpr; cv.height = hh * dpr; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { cv, ctx, w, h: hh };
  }
  // scene.js と同じ並べ方で、敵の立ち位置を出す
  function spot(i, n, boss, L) {
    const x = L.w * (n === 1 ? 0.5 : 0.22 + (0.56 * i) / Math.max(1, n - 1));
    const s = L.h * (boss ? 0.78 : 0.58) * (n > 2 ? 0.85 : 1);
    return { x, base: L.h * 0.97, s };
  }
  // was は、この手番の前に背景に並んでいた敵（演出は遅れて動くので、呼ぶ側が渡す）
  function foeSpot(name, L, was) {
    const i = was.findIndex((f) => f.name === name);
    if (i < 0) return null;
    const e = G.data.ENEMIES[was[i].id] || {};
    return Object.assign(spot(i, was.length, !!e.boss, L), { id: was[i].id, e });
  }

  // 層の上の動きを1本のループで回す
  const anims = [];
  let raf = 0;
  function run(a) {
    a.t0 = performance.now();
    anims.push(a);
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    const L = layer();
    if (!L) { anims.length = 0; return; }
    L.ctx.clearRect(0, 0, L.w, L.h);
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      const t = (now - a.t0) / a.dur;
      if (t >= 1) { anims.splice(i, 1); continue; }
      L.ctx.save();
      try { a.draw(L.ctx, Math.max(0, t), L); } catch (err) { anims.splice(i, 1); }
      L.ctx.restore();
    }
    if (anims.length) raf = requestAnimationFrame(tick);
    else L.ctx.clearRect(0, 0, L.w, L.h);
  }

  // 斬撃：敵の胸のあたりを斜めに走る光
  function slash(name, big, was) {
    if (calm()) return;
    const L = layer();
    if (!L) return;
    const p = foeSpot(name, L, was);
    const cx = p ? p.x : L.w / 2, cy = p ? p.base - p.s * 0.55 : L.h / 2, r = (p ? p.s : L.h * 0.6) * (big ? 0.55 : 0.4);
    const R = seq(name + ":" + performance.now());
    const ang = -0.9 + R() * 0.5;
    run({ dur: big ? 380 : 260, draw: (ctx, t) => {
      const head = Math.min(1, t * 2.2), tail = Math.max(0, t * 2.2 - 0.9);
      const x0 = cx - Math.cos(ang) * r, y0 = cy - Math.sin(ang) * r, x1 = cx + Math.cos(ang) * r, y1 = cy + Math.sin(ang) * r;
      const lerp = (k) => [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
      const [ax, ay] = lerp(tail), [bx, by] = lerp(head);
      ctx.globalAlpha = 1 - t;
      ctx.lineCap = "round";
      ctx.strokeStyle = big ? "rgba(255,226,150,.95)" : "rgba(255,255,255,.9)";
      ctx.shadowColor = big ? "#ffb040" : "#ffffff";
      ctx.shadowBlur = 12;
      ctx.lineWidth = big ? 6 : 3.5;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    } });
  }
  // 絶界：見えない壁に波紋が立つ
  function ripple(name, was) {
    const L = layer();
    if (!L) return;
    const p = foeSpot(name, L, was);
    const cx = p ? p.x : L.w / 2, cy = p ? p.base - p.s * 0.5 : L.h / 2, r = (p ? p.s : L.h * 0.6) * 0.55;
    run({ dur: calm() ? 380 : 520, draw: (ctx, t) => {
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = "#b8a0ff";
      ctx.shadowColor = "#b8a0ff";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      const k = calm() ? 1 : 0.7 + t * 0.35;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; const x = cx + Math.cos(a) * r * k, y = cy + Math.sin(a) * r * k * 1.1; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
    } });
  }
  // 倒れる：敵の絵が赤く光ってから、沈みながら灰になって消える
  function collapse(name, was) {
    const L = layer();
    if (!L) return;
    const p = foeSpot(name, L, was);
    if (!p || !G.paintMonster) return;
    const still = calm();
    const R = seq("ash:" + name);
    const ash = Array.from({ length: 22 }, () => ({ x: (R() - 0.5) * p.s * 0.7, y: -R() * p.s * 0.9, v: 0.25 + R() * 0.5, r: 1 + R() * 2.2 }));
    // 絵は一度だけ別の canvas に描き、毎コマはそれを動かす（スマホでも重くならないように）
    const dpr = L.cv.width / L.w;
    const sprite = document.createElement("canvas");
    sprite.width = L.cv.width; sprite.height = L.cv.height;
    const sc = sprite.getContext("2d");
    sc.setTransform(dpr, 0, 0, dpr, 0, 0);
    G.paintMonster(sc, p.x, p.base, p.s, { id: p.id, shape: p.e.shape, eye: p.e.eye, boss: !!p.e.boss });
    run({ dur: still ? 450 : p.e.boss ? 1500 : 950, draw: (ctx, t) => {
      // 絵
      ctx.save();
      ctx.globalAlpha = still ? 1 - t : Math.max(0, 1 - t * 1.25);
      if (!still) {
        const sink = t * t * p.s * 0.28;
        const tilt = (p.x < L.w / 2 ? -1 : 1) * t * 0.12;
        ctx.translate(p.x, p.base);
        ctx.rotate(tilt);
        ctx.scale(1 + t * 0.06, 1 - t * 0.35);
        ctx.translate(-p.x, -p.base + sink);
      }
      if ("filter" in ctx) ctx.filter = t < 0.18 ? "brightness(2.2) saturate(0.4)" : `grayscale(${Math.min(1, t * 1.6)}) brightness(${1 - t * 0.5})`;
      ctx.drawImage(sprite, 0, 0, L.w, L.h);
      ctx.restore();
      if (still) return;
      // 灰
      ctx.fillStyle = "rgba(210,200,190,.8)";
      ash.forEach((a) => {
        const k = Math.max(0, t - 0.15);
        ctx.globalAlpha = Math.max(0, 1 - t) * 0.8;
        ctx.beginPath(); ctx.arc(p.x + a.x + Math.sin(k * 6 + a.v * 9) * 4, p.base + a.y - k * p.s * a.v, a.r, 0, Math.PI * 2); ctx.fill();
      });
    } });
  }

  // ---------------------------------------------------------------- 札と画面
  function popNumber(host, text, cls) {
    if (!host) return;
    const s = h("span", "dmgpop " + (cls || ""), text);
    s.setAttribute("aria-hidden", "true");
    host.append(s);
    later(1000, () => s.remove());
  }
  // HP の棒：減った分を薄く残してから縮める
  function drainBar(card, from, to, max) {
    const g = card && card.querySelector(".g");
    const bar = g && g.querySelector("i");
    if (!bar || !(from > to)) return;
    const lost = h("span", "lost");
    lost.style.width = (from / max) * 100 + "%";
    g.insertBefore(lost, bar);
    bar.style.width = (from / max) * 100 + "%";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.width = (to / max) * 100 + "%";
      lost.style.width = (to / max) * 100 + "%";
    }));
  }
  // 最後の一体を倒して戦闘が終わったときは、札が消えているので、倒れる札だけ一瞬出す
  function ghostCard(name, was) {
    const f = was.find((x) => x.name === name);
    const panel = $("#panel");
    if (!f || !panel) return null;
    let row = panel.querySelector(".foes.ghost");
    if (!row) { row = h("div", "foes ghost"); row.setAttribute("aria-hidden", "true"); panel.prepend(row); later(1400, () => row.remove()); }
    const c = h("div", "foe");
    c.dataset.foe = name;
    c.append(h("b", "", name));
    const g = h("span", "g"); const i = h("i"); i.style.width = "0%"; g.append(i); c.append(g);
    c.append(h("span", "num fine", `HP 0/${f.max}`));
    row.append(c);
    return c;
  }
  function hurtScreen(n, heavy) {
    const scene = $(".scene");
    pulse(scene, heavy ? "quake" : "shake", heavy ? 560 : 380);
    pulse(scene, "bleed", 520);
    pulse($("#mbar"), "hurt", 600);
    popNumber(scene, `-${n}`, "you");
  }

  // ---------------------------------------------------------------- 前口上の帯
  let bannerT = 0;
  function banner(name, text) {
    const scene = $(".scene");
    if (!scene) return;
    let b = scene.querySelector(".bossBanner");
    if (!b) {
      b = h("div", "bossBanner");
      b.setAttribute("role", "presentation");
      b.append(h("b"), h("span"));
      b.onclick = () => hide(b);
      scene.append(b);
    }
    b.querySelector("b").textContent = name || "";
    b.querySelector("span").textContent = text || "";
    b.hidden = false;
    b.classList.remove("out");
    pulse(b, "in", 700);
    clearTimeout(bannerT);
    bannerT = later(Math.max(3200, (text || "").length * 90), () => hide(b));
  }
  function hide(b) {
    b.classList.add("out");
    later(calm() ? 10 : 420, () => { if (b.classList.contains("out")) b.hidden = true; });
  }

  // ---------------------------------------------------------------- 入口
  fx.play = (entries, S) => {
    const plan = fx.plan(entries);
    const hpBefore = hpSeen;
    const was = shown;
    const drained = {};
    plan.forEach((p) => {
      later(p.at, () => {
        if (p.fx === "hit") {
          const card = cardOf(p.foe);
          pulse(card, "hit", 380);
          popNumber(card, String(p.n));
          slash(p.foe, false, was);
          if (card && !drained[p.foe]) {
            drained[p.foe] = true;
            const f = S && S.combat && S.combat.foes.find((x) => x.name === p.foe);
            if (f && hpBefore[p.foe] !== undefined) drainBar(card, hpBefore[p.foe], f.hp, f.max);
          }
        } else if (p.fx === "crit") {
          pulse($(".scene"), "flash", 260);
          later(40, () => slash(plan.find((q) => q.fx === "hit" && q.at >= p.at)?.foe || "", true, was));
        } else if (p.fx === "wall") {
          const card = cardOf(p.foe);
          pulse(card, "walled", 520);
          popNumber(card, "無効", "wall");
          ripple(p.foe, was);
        } else if (p.fx === "down") {
          const card = cardOf(p.foe) || ghostCard(p.foe, was);
          if (card) card.classList.add("dying");
          collapse(p.foe, was);
          if (p.boss) pulse($(".scene"), "flash", 420);
        } else if (p.fx === "hurt") {
          hurtScreen(p.n, p.heavy);
        } else if (p.fx === "boss") {
          banner(p.name, p.text);
        }
      });
    });
    remember(S);
  };
})(globalThis.G = globalThis.G || {});
