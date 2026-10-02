// 効果音と環境音。音声ファイルは使わず、Web Audio でその場で合成する。
// 鳴らすのは画面側だけ。ui.js が描き直すたびに G.sound.react(G.S) を呼び、増えた記録と状態の変化から音を選ぶ。
// 名前で鳴らす：G.sound.play("slash")。名前の一覧は G.sound.names。
// AudioContext が無い環境（テスト）や、最初のタップの前は何もしない。
// 乱数は Math.random を使う（音の揺らぎだけで、遊びの結果には関わらないため。G.rand を進めない）。レーン S（音）が管理
(function (G) {
  const snd = (G.sound = { names: [], play() {}, ambient() {}, settings: null });
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;

  // ---------------------------------------------------------------- 設定（このブラウザに保存）
  const SKEY = "morsveld-sound";
  // mute は全体の切り替え。sfxOn・ambOn・dice は音ごとのオンオフ（S2。古い設定に無ければ既定値）
  const DEF = { mute: false, sfx: 0.7, amb: 0.4, sfxOn: true, ambOn: true, dice: true };
  snd.DEF = DEF;
  const loadSet = () => { try { const j = JSON.parse(globalThis.localStorage.getItem(SKEY)); return { ...DEF, ...(j || {}) }; } catch { return { ...DEF }; } };
  const saveSet = () => { try { globalThis.localStorage.setItem(SKEY, JSON.stringify(snd.settings)); } catch {} };
  snd.settings = loadSet();

  const R = Math.random;
  const rr = (a, b) => a + R() * (b - a);

  // ---------------------------------------------------------------- 音の部品（ctx と出口を受け取る。OfflineAudioContext でも同じに動く）
  // 雑音の元（白・茶）。茶は低く重いざわめき
  function noiseBuf(ctx, kind, sec) {
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = R() * 2 - 1;
      if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }
  // 残響（減衰する雑音を畳み込む）
  function impulse(ctx, sec, decay) {
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  // 音の卓：効果音と環境音の2本の束 → 主音量 → 圧縮（音割れを防ぐ） → 出口
  function makeDesk(ctx, dest) {
    const E = { ctx };
    E.master = ctx.createGain(); E.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 12; comp.attack.value = 0.003; comp.release.value = 0.25;
    E.master.connect(comp); comp.connect(dest || ctx.destination);
    E.sfx = ctx.createGain(); E.sfx.connect(E.master);
    E.amb = ctx.createGain(); E.amb.connect(E.master);
    const ir = impulse(ctx, 2.6, 2.8);
    const mkRev = (out) => { const i = ctx.createGain(); const cv = ctx.createConvolver(); cv.buffer = ir; const o = ctx.createGain(); o.gain.value = 0.5; i.connect(cv); cv.connect(o); o.connect(out); return i; };
    E.sfxRev = mkRev(E.sfx);
    E.ambRev = mkRev(E.amb);
    E.white = noiseBuf(ctx, "white", 2);
    E.brown = noiseBuf(ctx, "brown", 4);
    return E;
  }
  function route(E, node, o) {
    const out = o.out || E.sfx;
    node.connect(out);
    if (o.wet) { const w = E.ctx.createGain(); w.gain.value = o.wet; node.connect(w); w.connect(out === E.amb ? E.ambRev : E.sfxRev); }
  }
  // 包絡：無音から a 秒で頂点、hold 秒保って、d 秒で消える。終わる時刻を返す
  function env(p, t, a, peak, d, hold) {
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (hold) p.setValueAtTime(peak, t + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t + a + (hold || 0) + d);
    return t + a + (hold || 0) + d;
  }
  function filt(E, o, t, end) {
    const f = E.ctx.createBiquadFilter();
    f.type = o.ft || "lowpass";
    f.frequency.setValueAtTime(o.ff || 1000, t);
    if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t + (o.fglide || end - t));
    f.Q.value = o.q || 0.7;
    return f;
  }
  // 音程のある音。o: type f f2 glide a d hold g wet ft ff ff2 q vib[速さ,深さ] det
  function tone(E, t, o) {
    const ctx = E.ctx;
    const s = ctx.createOscillator();
    s.type = o.type || "sine";
    s.frequency.setValueAtTime(o.f, t);
    if (o.det) s.detune.value = o.det;
    const g = ctx.createGain();
    const end = env(g.gain, t, o.a || 0.005, o.g || 0.3, o.d || 0.3, o.hold);
    if (o.f2) s.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || end - t));
    let node = s;
    if (o.ff) { const f = filt(E, o, t, end); s.connect(f); node = f; }
    node.connect(g);
    route(E, g, o);
    if (o.vib) { const l = ctx.createOscillator(); const lg = ctx.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(end + 0.05); }
    s.start(t); s.stop(end + 0.05);
    return end;
  }
  // 雑音。o: brown ft ff ff2 fglide q a d hold g wet rate
  function hiss(E, t, o) {
    const ctx = E.ctx;
    const s = ctx.createBufferSource();
    s.buffer = o.brown ? E.brown : E.white;
    s.loop = true;
    if (o.rate) s.playbackRate.value = o.rate;
    const g = ctx.createGain();
    const end = env(g.gain, t, o.a || 0.003, o.g || 0.3, o.d || 0.2, o.hold);
    const f = filt(E, o, t, end);
    s.connect(f); f.connect(g);
    route(E, g, o);
    s.start(t, R() * 1.5); s.stop(end + 0.05);
    return end;
  }
  // 金属・鐘：倍音が整数倍でない正弦波を重ねる
  function bell(E, t, f, o) {
    o = o || {};
    const parts = o.parts || [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]];
    let end = t;
    parts.forEach(([m, v]) => { end = Math.max(end, tone(E, t, { f: f * m, g: (o.g || 0.2) * v, a: o.a || 0.002, d: (o.d || 1.2) / Math.sqrt(m), wet: o.wet ?? 0.3, out: o.out })); });
    return end;
  }
  // 重い打撃（胴に響く低音＋鈍い雑音）
  function thud(E, t, o) {
    o = o || {};
    tone(E, t, { f: o.f || 110, f2: o.f2 || 40, glide: 0.15, g: o.g || 0.6, a: 0.002, d: o.d || 0.25 });
    return hiss(E, t, { brown: true, ft: "lowpass", ff: o.ff || 700, g: (o.g || 0.6) * 0.8, a: 0.002, d: (o.d || 0.25) * 0.6, wet: o.wet || 0.1 });
  }
  // 刃が空を切る音
  function swish(E, t, o) {
    o = o || {};
    return hiss(E, t, { ft: "bandpass", ff: o.ff || 1200, ff2: o.ff2 || 5000, q: 1.6, a: 0.05, d: 0.12, g: o.g || 0.35, fglide: 0.15 });
  }

  // ---------------------------------------------------------------- S2：ダイスが木の卓で転がって止まる音
  // はねる時刻と強さの表（DOM・音なしでも作れる。テストはこれを見る）。short は戦闘の攻撃など続くところ用（1〜2 回はねるだけ）
  // 返す：{ hits: [{ at, g, f, edge }], end }。at は始まりからの秒、f は木の胴の高さ
  snd.ROLL_LAG = 0.5; // 結果の音を遅らせる秒（止まったところに重ねる）
  snd.ROLL_LAG_SHORT = 0.2;
  snd.rollPlan = (short) => {
    const hits = [];
    const base = rr(480, 680);
    let at = 0, g = rr(0.45, 0.55);
    let gap = short ? rr(0.07, 0.1) : rr(0.12, 0.16);
    const n = short ? 1 + (R() < 0.5 ? 1 : 0) : 3 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      hits.push({ at, g, f: base * rr(0.9, 1.15), edge: R() < 0.45 });
      at += gap; gap *= rr(0.55, 0.75); g *= rr(0.62, 0.8);
    }
    // 転がる：角が卓を細かく叩く
    if (!short) for (let k = 2 + Math.floor(R() * 3), i = 0; i < k; i++) { hits.push({ at, g: g * rr(0.25, 0.4), f: base * rr(1.1, 1.4) }); at += rr(0.018, 0.032); }
    // コトン：面が座って止まる（低く、少し重い）
    at += short ? rr(0.02, 0.04) : rr(0.03, 0.05);
    hits.push({ at, g: Math.max(g, 0.18) * 1.1, f: base * rr(0.7, 0.8), last: true });
    let end = at + 0.08;
    // 長さを 0.4〜0.7 秒（短い版は 0.12〜0.3 秒）に収める
    const [lo, hi] = short ? [0.12, 0.3] : [0.42, 0.68];
    const k = end < lo ? lo / end : end > hi ? hi / end : 1;
    if (k !== 1) { hits.forEach((h) => { h.at *= k; }); end *= k; }
    return { hits, end };
  };
  // 一打：角が当たる高い「カッ」＋木の胴の短い響き
  function knock(E, t, h) {
    hiss(E, t, { ft: "bandpass", ff: h.f * rr(4.5, 6.5), q: 2.5, a: 0.0008, d: h.last ? 0.02 : 0.03, g: h.g * 0.55 });
    tone(E, t, { type: "triangle", f: h.f, f2: h.f * 0.94, g: h.g * 0.45, a: 0.001, d: h.last ? 0.09 : 0.06, wet: 0.1 });
    tone(E, t, { f: h.f * 2.63, g: h.g * 0.18, a: 0.001, d: 0.03 });
    if (h.edge) hiss(E, t + rr(0.012, 0.024), { ft: "bandpass", ff: h.f * rr(5, 7), q: 3, a: 0.0008, d: 0.02, g: h.g * 0.25 });
    if (h.last) tone(E, t, { f: h.f * 0.4, f2: h.f * 0.33, g: h.g * 0.35, a: 0.002, d: 0.1 });
  }
  function rollSound(E, t, short) {
    const p = snd.rollPlan(short);
    p.hits.forEach((h) => knock(E, t + h.at, h));
    return t + p.end;
  }

  // ---------------------------------------------------------------- 効果音（名前 → 合成）。どれも t から鳴らし、終わる時刻を返す
  const SFX = {
    // 画面
    click: (E, t) => { hiss(E, t, { ft: "bandpass", ff: 2400, q: 3, g: 0.12, d: 0.03 }); return tone(E, t, { f: 210, f2: 150, g: 0.12, d: 0.05 }); },
    page: (E, t) => { hiss(E, t, { ft: "bandpass", ff: 3200, ff2: 1600, q: 0.8, a: 0.04, d: 0.12, g: 0.1 }); return hiss(E, t + 0.09, { ft: "highpass", ff: 2500, a: 0.01, d: 0.1, g: 0.07 }); },
    // 判定。roll はダイスを振る音（結果の音より先に鳴らす）、rollShort は短い版
    roll: (E, t) => rollSound(E, t, false),
    rollShort: (E, t) => rollSound(E, t, true),
    // M7：振り直し。遠くで誰かが小さく二度、手を打つ
    clap: (E, t) => { hiss(E, t, { ft: "bandpass", ff: 1500, q: 1.2, a: 0.002, d: 0.06, g: 0.12, wet: 0.7 }); return hiss(E, t + 0.32, { ft: "bandpass", ff: 1400, q: 1.2, a: 0.002, d: 0.06, g: 0.1, wet: 0.7 }); },
    ok: (E, t) => { bell(E, t, 220, { g: 0.22, d: 1.0, parts: [[1, 1], [2, 0.35], [3.01, 0.2], [4.2, 0.08]] }); return tone(E, t, { f: 110, g: 0.12, d: 0.5, type: "triangle" }); },
    ng: (E, t) => { thud(E, t, { f: 160, f2: 70, g: 0.35, d: 0.18, ff: 500 }); return tone(E, t + 0.02, { type: "triangle", f: 147, f2: 131, g: 0.14, d: 0.35, ff: 600 }); },
    crit: (E, t) => {
      [0, 0.09, 0.18].forEach((dt, i) => bell(E, t + dt, [262, 330, 392][i], { g: 0.18, d: 1.6, wet: 0.45 }));
      hiss(E, t + 0.18, { ft: "highpass", ff: 6000, a: 0.2, d: 0.8, g: 0.06, wet: 0.5 });
      return thud(E, t, { f: 90, f2: 45, g: 0.4, d: 0.5 }) + 1.3;
    },
    // 大失敗：間の抜けた、ばねのような下がり音
    fumble: (E, t) => {
      tone(E, t, { type: "triangle", f: 420, f2: 95, glide: 0.55, g: 0.28, a: 0.01, d: 0.6, vib: [11, 25], ff: 1800 });
      return thud(E, t + 0.5, { f: 120, f2: 60, g: 0.35, d: 0.2 });
    },
    // 戦闘
    swing: (E, t) => swish(E, t),
    slash: (E, t) => {
      swish(E, t, { g: 0.3 });
      hiss(E, t + 0.07, { ft: "bandpass", ff: 2800, q: 2, a: 0.001, d: 0.09, g: 0.35 });
      return thud(E, t + 0.07, { f: 130, f2: 50, g: 0.5, d: 0.2, ff: 1200 });
    },
    blunt: (E, t) => thud(E, t, { f: 80, f2: 35, g: 0.75, d: 0.35, ff: 400, wet: 0.15 }),
    clang: (E, t) => { hiss(E, t, { ft: "highpass", ff: 3000, a: 0.001, d: 0.06, g: 0.3 }); return bell(E, t, 523, { g: 0.2, d: 1.1, parts: [[1, 1], [2.32, 0.7], [3.4, 0.5], [5.03, 0.35]], wet: 0.4 }); },
    hurt: (E, t) => {
      thud(E, t, { f: 95, f2: 40, g: 0.7, d: 0.3, ff: 600 });
      return tone(E, t + 0.02, { type: "sawtooth", f: 140, f2: 80, g: 0.12, d: 0.2, ff: 700, q: 3 });
    },
    kill: (E, t) => {
      thud(E, t, { f: 70, f2: 30, g: 0.8, d: 0.5, ff: 500, wet: 0.2 });
      hiss(E, t + 0.12, { brown: true, ft: "lowpass", ff: 400, ff2: 120, a: 0.05, d: 0.6, g: 0.4 });
      return tone(E, t + 0.05, { type: "sawtooth", f: 110, f2: 55, g: 0.1, d: 0.6, ff: 500 });
    },
    // 弱い魔物が倒れる：ぷしゅっと気の抜けた音
    pop: (E, t) => {
      tone(E, t, { type: "square", f: 330, f2: 70, glide: 0.35, g: 0.12, d: 0.4, ff: 900, q: 4 });
      return thud(E, t + 0.3, { f: 140, f2: 70, g: 0.3, d: 0.15 });
    },
    battle: (E, t) => {
      thud(E, t, { f: 65, f2: 38, g: 0.8, d: 0.6, ff: 350, wet: 0.3 });
      thud(E, t + 0.32, { f: 65, f2: 38, g: 0.7, d: 0.6, ff: 350, wet: 0.3 });
      // 剣を抜く音
      return hiss(E, t + 0.55, { ft: "bandpass", ff: 1800, ff2: 7000, q: 6, a: 0.25, d: 0.25, g: 0.18, wet: 0.2 });
    },
    // 使徒：地の底から湧く不協和な唸り
    majin: (E, t) => {
      [41, 43.6, 58].forEach((f) => tone(E, t, { type: "sawtooth", f, f2: f * 0.9, g: 0.16, a: 1.2, hold: 0.8, d: 1.6, ff: 260, q: 2, wet: 0.4 }));
      tone(E, t, { f: 30, g: 0.35, a: 1, hold: 1, d: 1.5 });
      hiss(E, t, { ft: "bandpass", ff: 200, ff2: 1600, q: 3, a: 2, d: 0.4, g: 0.12, wet: 0.5 });
      return bell(E, t + 2.1, 73, { g: 0.3, d: 3, wet: 0.6 });
    },
    // 魔法（系統ごと）
    fire: (E, t) => {
      hiss(E, t, { brown: true, ft: "lowpass", ff: 300, ff2: 2500, a: 0.25, d: 0.6, g: 0.5, wet: 0.2 });
      for (let i = 0; i < 9; i++) hiss(E, t + rr(0.05, 0.8), { ft: "bandpass", ff: rr(1500, 4000), q: 4, a: 0.001, d: 0.02, g: rr(0.1, 0.25) });
      return tone(E, t, { f: 55, f2: 80, g: 0.25, a: 0.2, d: 0.6 });
    },
    ice: (E, t) => {
      hiss(E, t, { ft: "highpass", ff: 5000, a: 0.001, d: 0.12, g: 0.25 });
      let end = t;
      for (let i = 0; i < 7; i++) end = Math.max(end, tone(E, t + i * 0.05 + rr(0, 0.03), { f: rr(1800, 4200), g: 0.07, d: 0.5, wet: 0.5 }));
      tone(E, t, { type: "triangle", f: 880, f2: 1760, g: 0.06, a: 0.2, d: 0.5, wet: 0.5 });
      return end;
    },
    thunder: (E, t) => {
      hiss(E, t, { ft: "highpass", ff: 800, a: 0.001, d: 0.08, g: 0.6 });
      hiss(E, t + 0.05, { ft: "bandpass", ff: 2000, q: 1, a: 0.001, d: 0.05, g: 0.4 });
      return hiss(E, t + 0.08, { brown: true, ft: "lowpass", ff: 400, ff2: 90, a: 0.08, d: 1.6, g: 0.7, wet: 0.3 });
    },
    curse: (E, t) => {
      tone(E, t, { type: "sawtooth", f: 98, f2: 82, g: 0.13, a: 0.3, d: 1.1, ff: 500, q: 5, vib: [5, 4], wet: 0.4 });
      tone(E, t, { type: "sawtooth", f: 138.6, f2: 116, g: 0.11, a: 0.3, d: 1.1, ff: 500, q: 5, vib: [6, 5], wet: 0.4 });
      return hiss(E, t + 0.1, { ft: "bandpass", ff: 600, ff2: 250, q: 8, a: 0.4, d: 0.8, g: 0.12, wet: 0.5 });
    },
    bless: (E, t) => {
      let end = t;
      [196, 247, 294, 392].forEach((f, i) => { end = Math.max(end, tone(E, t + i * 0.04, { type: "triangle", f, det: rr(-8, 8), g: 0.08, a: 0.35, hold: 0.3, d: 1.0, ff: 1800, wet: 0.6 })); });
      return end;
    },
    heal: (E, t) => {
      let end = t;
      [294, 370, 440, 587].forEach((f, i) => { end = Math.max(end, tone(E, t + i * 0.12, { f, g: 0.1, a: 0.08, d: 0.9, wet: 0.55 })); });
      hiss(E, t, { ft: "highpass", ff: 7000, a: 0.3, d: 0.6, g: 0.03, wet: 0.5 });
      return end;
    },
    // 手に入れる
    coin: (E, t) => {
      let end = t;
      for (let i = 0; i < 3; i++) end = Math.max(end, bell(E, t + i * rr(0.06, 0.1), rr(1900, 2500), { g: 0.08, d: 0.35, parts: [[1, 1], [1.52, 0.6], [2.4, 0.3]], wet: 0.15 }));
      return end;
    },
    item: (E, t) => {
      hiss(E, t, { brown: true, ft: "bandpass", ff: 700, q: 1.2, a: 0.02, d: 0.15, g: 0.4 });
      return thud(E, t + 0.05, { f: 150, f2: 80, g: 0.25, d: 0.12 });
    },
    // 能力値が伸びた：低い角笛のような上がり音
    levelup: (E, t) => {
      let end = t;
      [[147, 0], [220, 0.16], [294, 0.32]].forEach(([f, dt]) => { end = Math.max(end, tone(E, t + dt, { type: "sawtooth", f, g: 0.09, a: 0.06, hold: 0.12, d: 0.6, ff: 900, q: 1, wet: 0.35 })); });
      return end;
    },
    trophy: (E, t) => {
      bell(E, t, 196, { g: 0.2, d: 2.2, wet: 0.5 });
      bell(E, t + 0.25, 294, { g: 0.16, d: 2, wet: 0.5 });
      return bell(E, t + 0.5, 392, { g: 0.14, d: 2, wet: 0.5 });
    },
    // 場所
    door: (E, t) => {
      tone(E, t, { type: "sawtooth", f: 70, f2: 95, g: 0.1, a: 0.08, d: 0.45, ff: 900, q: 8, vib: [23, 18] });
      return thud(E, t + 0.5, { f: 90, f2: 45, g: 0.45, d: 0.3, ff: 500, wet: 0.2 });
    },
    step: (E, t) => { let end = t; for (let i = 0; i < 3; i++) end = thud(E, t + i * 0.28, { f: 120, f2: 60, g: 0.25, d: 0.12, ff: 450, wet: 0.35 }); return end; },
    depart: (E, t) => {
      for (let i = 0; i < 4; i++) thud(E, t + i * 0.3, { f: 110, f2: 55, g: 0.2, d: 0.1, ff: 380 });
      return hiss(E, t, { ft: "bandpass", ff: 400, ff2: 900, q: 1.2, a: 0.6, d: 0.9, g: 0.15 });
    },
    sleep: (E, t) => {
      tone(E, t, { type: "triangle", f: 196, g: 0.09, a: 0.2, d: 1.2, wet: 0.6 });
      return tone(E, t + 0.5, { type: "triangle", f: 147, g: 0.09, a: 0.2, d: 1.6, wet: 0.6 });
    },
    // 自分が倒れる：弔いの鐘
    death: (E, t) => {
      thud(E, t, { f: 60, f2: 28, g: 0.8, d: 0.8, ff: 300, wet: 0.4 });
      tone(E, t + 0.3, { type: "sawtooth", f: 73, f2: 49, glide: 3, g: 0.08, a: 0.8, d: 2.5, ff: 300, wet: 0.5 });
      return bell(E, t + 0.6, 98, { g: 0.3, d: 4, wet: 0.6 });
    },
  };
  snd.names = Object.keys(SFX);

  // ---------------------------------------------------------------- 環境音（続けて鳴らす。場所・天候で切り替える）
  // それぞれ gain を1つ返し、止めるときはその gain を絞ってから止める
  const AMB = {
    town: (E, out) => {
      const nodes = [];
      const s = loopNoise(E, "brown", out, { ft: "bandpass", ff: 500, q: 0.6, g: 0.35, lfo: [0.13, 0.12] }); nodes.push(s);
      nodes.push(loopNoise(E, "white", out, { ft: "bandpass", ff: 1200, q: 2, g: 0.02, lfo: [0.31, 0.015] }));
      return { nodes, tick: (t) => { if (R() < 0.25) bell(E, t, rr(1500, 2600), { g: 0.02, d: 0.25, out, wet: 0.2, parts: [[1, 1], [1.5, 0.5]] }); } };
    },
    wind: (E, out) => ({ nodes: [loopNoise(E, "white", out, { ft: "bandpass", ff: 500, q: 1.5, g: 0.2, lfo: [0.09, 0.14], sweep: [0.05, 350] })] }),
    cave: (E, out) => ({
      nodes: [loopNoise(E, "brown", out, { ft: "lowpass", ff: 160, g: 0.35, lfo: [0.05, 0.08] })],
      tick: (t) => { if (R() < 0.5) tone(E, t, { f: rr(900, 1400), f2: rr(1800, 2600), glide: 0.04, g: 0.05, d: 0.18, out, wet: 0.8 }); },
    }),
    rain: (E, out) => ({ nodes: [loopNoise(E, "white", out, { ft: "highpass", ff: 1200, g: 0.1, lfo: [0.2, 0.02] }), loopNoise(E, "brown", out, { ft: "lowpass", ff: 400, g: 0.2 })] }),
    fire: (E, out) => ({
      nodes: [loopNoise(E, "brown", out, { ft: "lowpass", ff: 350, g: 0.3, lfo: [0.4, 0.08] })],
      tick: (t) => { for (let i = 0; i < 3; i++) if (R() < 0.6) hiss(E, t + rr(0, 0.9), { ft: "bandpass", ff: rr(1500, 3500), q: 5, a: 0.001, d: 0.015, g: rr(0.05, 0.12), out }); },
    }),
    sea: (E, out) => ({ nodes: [loopNoise(E, "brown", out, { ft: "lowpass", ff: 500, g: 0.28, lfo: [0.08, 0.2] }), loopNoise(E, "white", out, { ft: "bandpass", ff: 1500, q: 0.5, g: 0.03, lfo: [0.08, 0.025] })] }),
    dread: (E, out) => ({
      nodes: [loopNoise(E, "brown", out, { ft: "lowpass", ff: 120, g: 0.5, lfo: [0.03, 0.15] }), loopTone(E, out, 36.7, 0.05), loopTone(E, out, 38.9, 0.04)],
    }),
  };
  function loopNoise(E, kind, out, o) {
    const ctx = E.ctx;
    const s = ctx.createBufferSource(); s.buffer = kind === "brown" ? E.brown : E.white; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.ft; f.frequency.value = o.ff; f.Q.value = o.q || 0.7;
    const g = ctx.createGain(); g.gain.value = o.g;
    s.connect(f); f.connect(g); g.connect(out);
    const stops = [s];
    if (o.lfo) { const l = ctx.createOscillator(); const lg = ctx.createGain(); l.frequency.value = o.lfo[0]; lg.gain.value = o.lfo[1]; l.connect(lg); lg.connect(g.gain); l.start(); stops.push(l); }
    if (o.sweep) { const l = ctx.createOscillator(); const lg = ctx.createGain(); l.frequency.value = o.sweep[0]; lg.gain.value = o.sweep[1]; l.connect(lg); lg.connect(f.frequency); l.start(); stops.push(l); }
    s.start(0, R() * 3);
    return stops;
  }
  function loopTone(E, out, f, gv) {
    const s = E.ctx.createOscillator(); s.type = "sawtooth"; s.frequency.value = f;
    const lp = E.ctx.createBiquadFilter(); lp.frequency.value = 180;
    const g = E.ctx.createGain(); g.gain.value = gv;
    s.connect(lp); lp.connect(g); g.connect(out); s.start();
    return [s];
  }
  snd.ambNames = Object.keys(AMB);

  // 場所・施設・天候から環境音を選ぶ（S.weather は、天候の仕組みが入ったときのための予約）
  const SEA = { port: 1, yakumo: 1 };
  const WINDY = { snow: 1, mountain: 1, plains: 1, realm: 1, swamp: 1, forest: 1, snowcity: 0, e2_garden: 1, onigashima: 1 };
  snd.ambFor = (S) => {
    if (!S || S.over) return null;
    const L = G.data.LOCS[S.loc] || {};
    const w = String(S.weather || "");
    if (/rain|雨|嵐/.test(w) && !(S.mode === "fac") && !(L.type === "dungeon" && S.depth > 0)) return "rain";
    if (S.mode === "fac") return S.fac === "inn" || S.fac === "tavern" ? "fire" : null;
    if (L.type === "dungeon" && S.depth > 0) return L.scene === "majin" ? "dread" : "cave";
    if (L.scene === "majin" || L.scene === "realm" || L.scene === "e2_kitchen") return "dread";
    if (L.type === "town") return SEA[L.scene] ? "sea" : "town";
    if (WINDY[L.scene] !== undefined || L.type === "wild") return "wind";
    return null;
  };

  // ---------------------------------------------------------------- 記録と状態の変化から音を選ぶ
  let seen = null; // 最後に見た記録（記録は長くなると頭が消えるので、数ではなく物で覚える）
  let prev = null;
  // 記録1件 → 音の名前（無ければ null）
  function cueOf(e, ctx) {
    const t = e.text || "";
    if (e.k === "dice") {
      if (e.rr) return "clap";
      if (e.crit) return "crit";
      if (e.fumble) return "fumble";
      if (/^(攻撃|急所狙い)$/.test(e.reason)) return e.ok ? null : "swing";
      if (ctx.magic && e.ok) return null; // 術の音は行動の記録で鳴らした
      return e.ok ? "ok" : "ng";
    }
    if (e.k === "grow") return "levelup";
    if (e.k === "trophy") return "trophy";
    if (e.k === "title") return t === "戦闘" ? "battle" : /地下\d+階/.test(t) ? "step" : null;
    if (e.k === "you") {
      if (/宿に泊まる|野営/.test(t)) return "sleep";
      if (/へ向かう/.test(t)) return "depart";
      if (/迷宮に入る|奥へ進む/.test(t)) return null; // 階の見出しで足音を鳴らす
      if (/に入る$|外に出る|入口まで/.test(t)) return "door";
      if (!MAGIC.test(t)) return null;
      if (/氷|凍|冷気/.test(t)) return "ice";
      if (/雷|稲妻/.test(t)) return "thunder";
      if (/呪い|呪詛/.test(t)) return "curse";
      if (/加護|守り/.test(t)) return "bless";
      if (/炎|火/.test(t)) return "fire";
      return null;
    }
    if (/絶界|見えない壁に弾かれ/.test(t)) return "clang";
    if (/を倒した！/.test(t)) {
      const name = t.replace(/を倒した！.*/, "");
      const id = ctx.foes[name];
      const d = id && G.data.ENEMIES[id];
      if (d && (d.boss || d.majin)) return "kill";
      return d && d.tier <= 1 ? "pop" : "kill";
    }
    if (/のダメージ（残り/.test(t)) return ctx.magic ? null : ctx.blunt ? "blunt" : "slash";
    if (/の(攻撃|呪い)！.*ダメージ/.test(t)) return /呪い！/.test(t) ? "curse" : "hurt";
    if (/HP \+|全快|傷がふさがって/.test(t)) return "heal";
    if (/G を手に入れた|^\+\d+G|報酬/.test(t)) return "coin";
    if (/を手に入れた|を見つけた|を買った/.test(t)) return "item";
    return null;
  }
  const MAGIC = /魔法|術|放つ|唱え|奇跡|祈|呪いの言葉/;
  const BLUNT = /棍|槌|杖|拳|メイス|鎚|こん棒|棒/;
  // 鳴らす音の名前を順に返す（DOM・音なしでも動く。テストはこれを見る）
  snd.cues = (S) => {
    if (!S) return [];
    const log = S.log || [];
    const last = log[log.length - 1] || null;
    const fresh = !prev || prev.S !== S;
    let news = [];
    if (!fresh && seen !== last) {
      const i = seen ? log.lastIndexOf(seen) : -1;
      news = i >= 0 ? log.slice(i + 1) : log.slice(-12);
    }
    seen = last;
    const foes = { ...(prev && prev.foes) };
    if (S.combat) S.combat.foes.forEach((f) => { foes[f.name] = f.id; });
    let w = null;
    try { w = G.S === S && G.weapon ? G.weapon() : null; } catch {}
    const ctx = { foes, magic: false, blunt: !!(w && BLUNT.test(w.name)) };
    const cues = [];
    const from = []; // 音ごとの元になった記録（戦闘の演出と同じ瞬間に鳴らすため）
    const add = (c, e) => { if (c && !cues.includes(c)) { cues.push(c); from.push(e || null); } };
    news.forEach((e) => {
      if (e.k === "you") ctx.magic = MAGIC.test(e.text || "");
      // S2：判定の前にダイスを振る音。攻撃の判定は短い版。同じ手番の 2 回目以降は add が省く（同じ名前は一度だけ）
      if (e.k === "dice" && snd.settings.dice !== false && !e.rr) add(/^(攻撃|急所狙い)$/.test(e.reason) ? "rollShort" : "roll", e);
      add(cueOf(e, ctx), e);
    });
    if (!fresh) {
      if (S.combat && !prev.combat && S.combat.foes.some((f) => { const d = G.data.ENEMIES[f.id]; return d && (d.majin || (d.boss && d.tier >= 5)); })) { cues.unshift("majin"); from.unshift(null); }
      if (S.gold > prev.gold && !cues.includes("coin")) add("coin");
      const inv = Object.values(S.inv || {}).reduce((a, n) => a + n, 0);
      if (inv > prev.inv && !cues.includes("item") && !cues.includes("coin")) add("item");
      if (S.over === "dead" && !prev.over) { cues.length = from.length = 0; cues.push("death"); }
      else if (S.over === "end" && !prev.over) { cues.length = from.length = 0; cues.push("trophy"); }
      if (!cues.length && news.length) add("page");
    }
    prev = { S, foes, gold: S.gold, inv: Object.values(S.inv || {}).reduce((a, n) => a + n, 0), combat: !!S.combat, over: S.over };
    snd.cueFrom = from.slice(0, 6);
    snd.cueNews = news;
    return cues.slice(0, 6);
  };
  snd.forget = () => { prev = null; seen = null; };
  // 冒険から作成画面に戻ったら環境音を止める（main.js は最後に読まれるので、最初に描くときに包む）
  function hookMain() {
    const M = G.main;
    if (!M || !M.toSetup || M.toSetup._sound) return;
    const orig = M.toSetup;
    M.toSetup = (...a) => { snd.ambient(null); snd.forget(); return orig(...a); };
    M.toSetup._sound = true;
  }
  // 重なりすぎないよう、少しずつずらして鳴らす
  snd.react = (S) => {
    hookMain();
    const cues = snd.cues(S);
    // 戦闘の演出（ui/fx.js）がある記録の音は、その絵が出る瞬間に鳴らす。ほかは少しずつずらす
    const at = G.fx && G.fx.plan ? new Map(G.fx.plan(snd.cueNews).map((p) => [p.src, p.at / 1000])) : null;
    // ダイスを振る音のあとの音は、ダイスが止まるまで遅らせる（戦闘の演出に合わせる音はそのまま）
    let lag = 0, j = 0;
    cues.forEach((c, i) => {
      const e = snd.cueFrom[i];
      if (c === "roll" || c === "rollShort") { snd.play(c, j * 0.17 + lag); lag += c === "roll" ? snd.ROLL_LAG : snd.ROLL_LAG_SHORT; return; }
      snd.play(c, at && e && at.has(e) ? at.get(e) : j * 0.17 + lag);
      j++;
    });
    if (S) snd.ambient(snd.ambFor(S));
  };


  // ---------------------------------------------------------------- 実際に鳴らす（ブラウザの中だけ）
  if (!AC || typeof document === "undefined") return;
  let E = null;
  const vol = () => {
    if (!E) return;
    const st = snd.settings;
    const now = E.ctx.currentTime;
    E.sfx.gain.setTargetAtTime(st.mute || st.sfxOn === false ? 0 : st.sfx, now, 0.05);
    E.amb.gain.setTargetAtTime(st.mute || st.ambOn === false ? 0 : st.amb * 0.5, now, 0.3);
  };
  function wake() {
    if (E) { if (E.ctx.state === "suspended") E.ctx.resume().catch(() => {}); return; }
    try { E = makeDesk(new AC()); } catch { E = null; return; }
    E.sfx.gain.value = 0; E.amb.gain.value = 0;
    vol();
    if (G.S) snd.ambient(snd.ambFor(G.S));
  }
  document.addEventListener("pointerdown", wake, true);
  document.addEventListener("keydown", wake, true);
  document.addEventListener("visibilitychange", () => { if (!E) return; if (document.hidden) E.ctx.suspend().catch(() => {}); else E.ctx.resume().catch(() => {}); });
  // ボタンを押したときの小さな音
  document.addEventListener("click", (ev) => { const b = ev.target.closest && ev.target.closest("button"); if (b && !b.disabled && !b.classList.contains("act")) snd.play("click"); }, true);

  snd.play = (name, delay) => {
    const st = snd.settings;
    if (!E || st.mute || !SFX[name] || E.ctx.state !== "running") return;
    if (st.sfxOn === false || ((name === "roll" || name === "rollShort") && st.dice === false)) return;
    try { SFX[name](E, E.ctx.currentTime + 0.01 + (delay || 0)); } catch {}
  };

  let amb = null; // { name, gain, stops, timer }
  snd.ambient = (name) => {
    if (!E) return;
    if (amb && amb.name === name) return;
    const now = E.ctx.currentTime;
    if (amb) {
      const a = amb;
      clearInterval(a.timer);
      a.gain.gain.setTargetAtTime(0, now, 0.4);
      setTimeout(() => { a.stops.forEach((s) => { try { s.stop(); } catch {} }); a.gain.disconnect(); }, 2500);
      amb = null;
    }
    if (!name || !AMB[name]) return;
    const g = E.ctx.createGain(); g.gain.value = 0; g.connect(E.amb);
    g.gain.setTargetAtTime(1, now, 0.8);
    const made = AMB[name](E, g);
    const stops = made.nodes.flat();
    const timer = made.tick ? setInterval(() => { if (E.ctx.state === "running" && !snd.settings.mute) made.tick(E.ctx.currentTime + 0.05); }, 1100) : 0;
    amb = { name, gain: g, stops, timer };
  };

  // ---------------------------------------------------------------- 設定の画面（見出しの道具に「音」ボタンを足す）
  function buildSettings() {
    const tools = document.querySelector(".top .tools");
    if (!tools || document.getElementById("openSound")) return;
    const b = document.createElement("button");
    b.className = "btn"; b.id = "openSound"; b.type = "button";
    const label = () => { b.textContent = snd.settings.mute ? "音：切" : "音"; b.setAttribute("aria-pressed", String(!snd.settings.mute)); };
    label();
    tools.prepend(b);
    const dlg = document.createElement("dialog");
    dlg.id = "dlgSound";
    dlg.innerHTML = `<div class="dhead"><h2>音</h2><button class="btn" type="button" data-close>閉じる</button></div>
      <div class="dbody sound">
        <label class="srow smute"><input type="checkbox" id="sndMute"> 消音する（すべての音）</label>
        <div class="srow"><label class="son"><input type="checkbox" id="sndSfxOn"> 効果音</label><input type="range" id="sndSfx" min="0" max="100" step="5" aria-label="効果音の音量"><output id="sndSfxV" class="num"></output></div>
        <div class="srow"><label class="son"><input type="checkbox" id="sndAmbOn"> 環境音</label><input type="range" id="sndAmb" min="0" max="100" step="5" aria-label="環境音の音量"><output id="sndAmbV" class="num"></output></div>
        <label class="srow sdice"><input type="checkbox" id="sndDice"> ダイスの音（判定のときに振る音）</label>
        <div class="start"><button class="btn" type="button" id="sndTest">試しに鳴らす</button></div>
        <p class="fine">設定はこのブラウザに保存されます。音は画面を一度押してから鳴ります。</p>
      </div>`;
    document.body.append(dlg);
    const $ = (id) => dlg.querySelector("#" + id);
    const sync = () => {
      const st = snd.settings;
      $("sndMute").checked = st.mute;
      $("sndSfxOn").checked = st.sfxOn !== false; $("sndAmbOn").checked = st.ambOn !== false; $("sndDice").checked = st.dice !== false;
      $("sndSfx").disabled = !$("sndSfxOn").checked; $("sndAmb").disabled = !$("sndAmbOn").checked;
      $("sndDice").disabled = !$("sndSfxOn").checked;
      $("sndSfx").value = Math.round(st.sfx * 100); $("sndSfxV").textContent = Math.round(st.sfx * 100);
      $("sndAmb").value = Math.round(st.amb * 100); $("sndAmbV").textContent = Math.round(st.amb * 100);
      label();
    };
    const change = () => {
      snd.settings = { ...snd.settings, mute: $("sndMute").checked, sfx: $("sndSfx").value / 100, amb: $("sndAmb").value / 100,
        sfxOn: $("sndSfxOn").checked, ambOn: $("sndAmbOn").checked, dice: $("sndDice").checked };
      saveSet(); sync(); vol();
    };
    ["sndMute", "sndSfx", "sndAmb", "sndSfxOn", "sndAmbOn", "sndDice"].forEach((id) => $(id).addEventListener("input", change));
    $("sndDice").addEventListener("change", () => { if ($("sndDice").checked) { wake(); snd.play("roll"); snd.play("ok", snd.ROLL_LAG); } });
    $("sndSfx").addEventListener("change", () => snd.play("slash"));
    $("sndTest").onclick = () => { wake(); snd.play("roll", 0.05); ["ok", "slash", "coin"].forEach((c, i) => snd.play(c, 0.05 + snd.ROLL_LAG + i * 0.35)); };
    dlg.querySelector("[data-close]").onclick = () => dlg.close();
    dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
    b.onclick = () => { sync(); dlg.showModal(); };
  }
  buildSettings();

  // 検証用：OfflineAudioContext に同じ卓を組んで鳴らす（tools/sound_check.mjs が使う）
  //   name を配列にすると、同じ卓で順に鳴らす（at は始まりの秒の配列）
  snd._offline = (ctx, name, isAmb, at) => {
    const D = makeDesk(ctx);
    D.sfx.gain.value = 1; D.amb.gain.value = 0.5;
    if (isAmb) { const g = ctx.createGain(); g.connect(D.amb); const m = AMB[name](D, g); if (m.tick) for (let t = 0.2; t < ctx.length / ctx.sampleRate - 1; t += 1.1) m.tick(t); return; }
    [].concat(name).forEach((n, i) => SFX[n](D, 0.01 + ((at && at[i]) || 0)));
  };
})(globalThis.G = globalThis.G || {});
