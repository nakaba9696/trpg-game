// S4：場面ごとの BGM。曲は src/data/s4_tracks.js の作曲データ（和音進行・音符の並び・楽器）を、Web Audio でその場で合成して鳴らす。
// 場面（タイトル・町の昼と夜・酒場・宿・街道・迷宮・深淵・戦闘・強敵・使徒・死・その後）は G.sound.bgmScene(S, view) が決める（DOM・音なしで動く）。
// 場面が変わったら、前の曲を絞りながら次の曲を立ち上げる（クロスフェード）。曲は拍の刻みで途切れずに回り続けるので、ループの継ぎ目が無い。
// 持ち主が assets/music/<場面>.ogg（または <曲の id>.ogg。webm・mp3 も可）を置けば、その場面はそのファイルを繰り返し鳴らす（無い・読めなければ合成）。
// 音量は効果音と別のつまみ（G.sound.settings.bgm・bgmOn。古い設定に無ければ既定値）。全体の消音（mute）にも従う。
// ページの中の Web Audio の音量だけを扱い、パソコンの音量・出力先・ほかのアプリには一切触れない。
// 作曲の揺らぎ（強さ・時刻のわずかな揺れ）は曲ごとに決まった種の乱数で作る（G.rand を進めると遊びの結果が変わるため、別の種を使う）。レーン S（音）が管理
(function (G) {
  const snd = (G.sound = G.sound || {});
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  const BGM = () => (G.data && G.data.BGM) || { TRACKS: {}, SCENES: {} };
  // 決まった種の乱数（作曲の揺らぎ・音色のわずかな揺れ用。G.rand は進めない）
  const seeded = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hash = (str) => { let h = 2166136261; for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const jr = seeded(4242);

  // ---------------------------------------------------------------- 設定（効果音と同じ保存先。古い設定に無ければ既定値）
  const SKEY = "morsveld-sound";
  snd.BGM_DEF = { bgm: 0.35, bgmOn: true };
  // 古い設定（S1〜S3）でも、項目が無ければ既定値で埋める
  snd.bgmSettings = (st) => {
    st = st || {};
    const v = Number(st.bgm);
    return { bgm: Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : snd.BGM_DEF.bgm, bgmOn: st.bgmOn !== false, mute: !!st.mute };
  };
  if (snd.settings) snd.settings = { ...snd.BGM_DEF, ...snd.settings, ...snd.bgmSettings(snd.settings) };
  if (snd.DEF) Object.assign(snd.DEF, snd.BGM_DEF);

  // ---------------------------------------------------------------- 場面
  snd.bgmScenes = ["title", "depart", "town", "town_night", "tavern", "inn", "road", "dungeon", "abyss", "battle", "boss", "apostle", "death", "epilogue"];
  const DREAD = { majin: 1, realm: 1, e2_kitchen: 1 };
  // view：{ title: タイトル・人物づくりの画面を出しているか, depart: 「この者で旅立つ」のあとの導入（あらすじ）を出しているか }
  // 旅立ちの導入は作成画面の曲から切り替える（持ち主の要望 U19。最初の町に着けば、町の曲へ）
  snd.bgmScene = (S, view) => {
    if (view && view.depart) return "depart";
    if ((view && view.title) || !S) return "title";
    if (S.over === "dead") return "death";
    if (S.over) return "epilogue";
    const D = G.data || {};
    const E = D.ENEMIES || {};
    if (S.combat) {
      const foes = (S.combat.foes || []).map((f) => E[f.id] || {});
      if (foes.some((d) => d.majin)) return "apostle";
      if (foes.some((d) => d.boss || d.tier >= 5)) return "boss";
      return "battle";
    }
    const L = (D.LOCS || {})[S.loc] || {};
    if (S.mode === "fac") {
      if (S.fac === "tavern") return "tavern";
      if (S.fac === "inn") return "inn";
      if (S.fac === "alley") return "town_night";
    }
    if (DREAD[L.scene]) return "abyss";
    if (L.type === "dungeon") return "dungeon";
    if (L.type === "town") return S.phase === 3 ? "town_night" : "town";
    return "road";
  };
  // 場面 → 曲（場面に二つあれば、入るたびに交互）
  const turn = {};
  snd.bgmTrackFor = (scene, advance) => {
    const list = (BGM().SCENES[scene] || []).filter((id) => BGM().TRACKS[id]);
    if (!list.length) return null;
    const i = turn[scene] || 0;
    if (advance) turn[scene] = i + 1;
    return list[i % list.length];
  };

  // ---------------------------------------------------------------- 作曲データ → 音符の表（DOM・音なしで動く。テストはこれを見る）
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
    phryg: [0, 1, 3, 5, 7, 8, 10], mixo: [0, 2, 4, 5, 7, 9, 10], gypsy: [0, 2, 3, 6, 7, 8, 11], locrian: [0, 1, 3, 5, 6, 8, 10],
  };
  snd.BGM_SCALES = SCALES;
  const QUAL = { M: [0, 4, 7, 11], D: [0, 4, 7, 10], m: [0, 3, 7, 10], o: [0, 3, 6, 9], "+": [0, 4, 8, 11], s: [0, 5, 7, 10], p: [0, 7, 12, 19], c: [0, 1, 6, 7] };
  // 和音の書き方："1"〜"7"（音階の上に三度を積む）、前に b/# で半音ずらす、後ろに M（長）D（属七）m（短）o（減）+（増）s（掛留）p（五度）c（不協和の塊）
  snd.bgmChord = (spec, scale) => {
    const m = /^([b#]?)([1-7])([MDmo+spc]?)$/.exec(String(spec));
    if (!m) return null;
    const sc = SCALES[scale] || SCALES.minor;
    const d = +m[2] - 1;
    const root = sc[d] + (m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0);
    if (m[3]) return { root, iv: QUAL[m[3]] };
    const iv = [0, 2, 4, 6].map((k) => sc[(d + k) % 7] + 12 * Math.floor((d + k) / 7) - sc[d]);
    return { root, iv };
  };
  const DRUMS = { k: "kick", s: "snare", h: "hat", o: "ohat", t: "tom", l: "ltom", c: "clank", m: "anvil", p: "timp", r: "rim", b: "brush", g: "gong", x: "shaker", n: "slam", f: "finger" };
  snd.BGM_DRUMS = DRUMS;
  const toks = (s) => String(s || "").split(/\s+/).filter((t) => t && t !== "|");
  const octs = (t) => (t.match(/'/g) || []).length * 12 - (t.match(/,/g) || []).length * 12;
  // 曲を音符の表にする：{ steps（一巡りの刻みの数）, dt（一刻みの秒）, len（一巡りの秒）, at[刻み] = [{ part, inst, notes:[midi], len（刻み）, vel, drum }], errors }
  snd.bgmCompile = (tr) => {
    const errors = [];
    const meter = tr.meter || 16, bars = tr.bars || 8;
    const steps = meter * bars;
    const dt = 60 / tr.bpm / 4;
    const at = Array.from({ length: steps }, () => []);
    const sc = SCALES[tr.scale] || SCALES.minor;
    if (!SCALES[tr.scale]) errors.push(`音階 ${tr.scale} が無い`);
    const prog = (tr.prog || ["1"]).map((c) => { const ch = snd.bgmChord(c, tr.scale); if (!ch) errors.push(`和音 ${c} が読めない`); return ch || { root: 0, iv: [0, 4, 7, 10] }; });
    (tr.parts || []).forEach((p, pi) => {
      const list = p.kind === "mel" ? p.mel : p.pat || [p.kind === "pad" ? "x" + " -".repeat(meter - 1) : ""];
      if (!list || !list.length) { errors.push(`${pi} 番目のパートに音符が無い`); return; }
      let last = null;
      for (let b = 0; b < bars; b++) {
        const on = !p.on || p.on.some(([a, z]) => b >= a && b < z);
        const ts = toks(list[b % list.length]);
        if (ts.length !== meter) errors.push(`${pi} 番目のパート（${p.inst || "打楽器"}）の ${b + 1} 小節目が ${ts.length} 刻み（${meter} のはず）`);
        if (!on) { last = null; continue; }
        const ch = prog[b % prog.length];
        const base = (tr.key || 60) + 12 * (p.oct || 0);
        ts.forEach((t, i) => {
          const step = b * meter + i;
          if (step >= steps) return;
          if (t === ".") { last = null; return; }
          if (t === "-") { if (last) last.len++; return; }
          const acc = /!/.test(t);
          const vel = acc ? 1 : p.kind === "drum" ? 0.72 : 0.78;
          if (p.kind === "drum") {
            t.replace(/!/g, "").split("+").forEach((d) => {
              const name = DRUMS[d.toLowerCase()];
              if (!name) { errors.push(`打楽器 ${d} が無い`); return; }
              at[step].push({ part: pi, drum: name, notes: [], len: 1, vel: d !== d.toLowerCase() ? 1 : vel });
            });
            last = null;
            return;
          }
          let notes = [];
          const body = t.replace(/[!',]/g, "");
          if (p.kind === "mel") {
            const m = /^([b#]?)([1-7])$/.exec(body);
            if (!m) { errors.push(`旋律の音 ${t} が読めない`); return; }
            notes = [base + sc[+m[2] - 1] + (m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0) + octs(t)];
          } else if ((body === "x" || body === "X") && p.power) {
            // 五度の和音（歪んだギターの刻み）：根音・五度・オクターブ
            const r = base + ch.root + octs(t);
            notes = [r, r + 7, r + 12];
          } else if (body === "x" || body === "X") {
            // 和音をまとめて：中心（center）の上下 6 半音に寄せて、なめらかにつなぐ
            const c = base + (p.center || 5) + octs(t);
            notes = ch.iv.slice(0, body === "X" ? 4 : 3).map((v) => { let n = base + ch.root + v; while (n < c - 6) n += 12; while (n >= c + 6) n -= 12; return n; }).sort((a, b) => a - b);
          } else if (/^[0-3]$/.test(body)) {
            notes = [base + ch.root + ch.iv[+body] + octs(t)];
          } else { errors.push(`音 ${t} が読めない`); return; }
          last = { part: pi, inst: p.inst, notes, len: 1, vel };
          at[step].push(last);
        });
      }
      // 一巡りの終わりから頭へつながる音（タイ）はそこで切る（次の巡りの頭で鳴り直す）
    });
    return { steps, dt, len: steps * dt, at, errors };
  };

  // ---------------------------------------------------------------- 曲のファイル（assets/music/）
  snd.musicKey = (scene, id, assets) => {
    const A = assets || G.ASSETS || {};
    return ["music/" + id, "music/" + scene].find((k) => A[k]) || null;
  };

  // ---------------------------------------------------------------- 楽器（ctx と出口を受け取る。OfflineAudioContext でも同じに動く）
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // 包絡：a 秒で頂点 → 持続の高さ sus に d 秒で下がる → 音の終わりから r 秒で消える
  function adsr(p, t, dur, peak, a, d, sus, r) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (d) p.setTargetAtTime(peak * sus, t + a, d / 3);
    const off = Math.max(t + a, t + dur);
    p.setTargetAtTime(0, off, r / 4);
    return off + r + 0.05;
  }
  function osc(B, type, f, t, end, det) {
    const o = B.ctx.createOscillator();
    if (type && typeof type === "object") o.setPeriodicWave(type); else o.type = type || "sine";
    o.frequency.setValueAtTime(f, t);
    if (det) o.detune.setValueAtTime(det, t);
    o.start(t); o.stop(end);
    return o;
  }
  function lp(B, f, q, type) { const n = B.ctx.createBiquadFilter(); n.type = type || "lowpass"; n.frequency.value = f; n.Q.value = q || 0.7; return n; }
  function gain(B, v) { const g = B.ctx.createGain(); g.gain.value = v; return g; }
  // 揺れ（ビブラート）：遅れて深くなる。短い音には付けない（聞こえないうえ、重くなるため）
  // 同じ揺れを二本以上の発振器にかけるときは、o に配列を渡すと揺れの発振器を一つで済ませる（同じ揺れなので音は同じ。T）
  function vibr(B, o, t, end, rate, cents, delay) {
    if (end - t < 0.45) return;
    const l = B.ctx.createOscillator(); l.frequency.value = rate;
    const g = B.ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(cents, t + (delay || 0.3) + 0.3);
    l.connect(g); (Array.isArray(o) ? o : [o]).forEach((x) => g.connect(x.detune)); l.start(t); l.stop(end);
  }
  // 倍音の表から波を作る（管の音・オルガン）。同じ表は一度だけ作る
  function wave(B, name, amps) {
    B.waves = B.waves || {};
    if (!B.waves[name]) { const re = new Float32Array(amps.length + 1), im = new Float32Array(amps.length + 1); amps.forEach((a, i) => { im[i + 1] = a; }); B.waves[name] = B.ctx.createPeriodicWave(re, im); }
    return B.waves[name];
  }
  // FM：搬送波を変調波で揺らす（鐘・ハープ・電気ピアノ）
  function fm(B, f, t, dur, o) {
    const end = t + dur + (o.r || 1) + 0.1;
    const c = osc(B, o.ctype || "sine", f, t, end);
    const m = osc(B, "sine", f * o.ratio, t, end);
    const mg = B.ctx.createGain();
    mg.gain.setValueAtTime(f * o.index, t);
    mg.gain.setTargetAtTime(f * (o.index2 || 0), t, o.idecay || 0.2);
    m.connect(mg); mg.connect(c.frequency);
    return { c, end };
  }
  const INST = {
    // うねるロックのベース：のこぎりと矩形を重ね、指で弾いた瞬間だけ明るい
    bass: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.15;
      const g = gain(B, 0); const fl = lp(B, 200, 5);
      fl.frequency.setValueAtTime(300 + 1400 * v, t); fl.frequency.setTargetAtTime(180 + 120 * v, t, 0.07);
      osc(B, "sawtooth", f, t, end).connect(fl); osc(B, "square", f / 2, t, end, 4).connect(fl);
      const sub = osc(B, "sine", f, t, end); const sg = gain(B, 0.6); sub.connect(sg); sg.connect(g);
      fl.connect(g); g.connect(out);
      adsr(g.gain, t, dur * 0.92, 0.42 * v, 0.006, 0.25, 0.7, 0.08);
    },
    // 低く柔らかなベース（迷宮・宿）
    sub: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.4;
      const g = gain(B, 0); const fl = lp(B, 380, 1);
      osc(B, "triangle", f, t, end).connect(fl); osc(B, "sine", f / 2, t, end).connect(g);
      fl.connect(g); g.connect(out);
      adsr(g.gain, t, dur, 0.5 * v, 0.03, 0.4, 0.8, 0.3);
    },
    // 金管：三本ののこぎりを少しずらし、吹き始めに明るくなる
    brass: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.3;
      const g = gain(B, 0); const fl = lp(B, 400, 2);
      fl.frequency.setValueAtTime(350, t); fl.frequency.linearRampToValueAtTime(900 + 2600 * v, t + 0.05); fl.frequency.setTargetAtTime(700 + 900 * v, t + 0.06, 0.15);
      [-9, 0, 8].forEach((d) => osc(B, "sawtooth", f, t, end, d).connect(fl));
      fl.connect(g); g.connect(out);
      adsr(g.gain, t, dur * 0.95, 0.16 * v, 0.025, 0.2, 0.75, 0.12);
    },
    // ギターの響き：のこぎり＋矩形（パートの歪み fx:"drive" に通す）。遅れて揺れる
    guitar: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.2;
      const g = gain(B, 0);
      const a = osc(B, "sawtooth", f, t, end, -4); a.connect(g);
      // 刻み（短い音）はのこぎり一本。伸ばす音は矩形を重ねて太くし、揺らす
      if (dur >= 0.25) { const b = osc(B, "square", f * 1.002, t, end, 3); vibr(B, [a, b], t, end, 5.6, 18, 0.25); b.connect(g); }
      g.connect(out);
      adsr(g.gain, t, dur * 0.97, 0.22 * v, 0.004, 0.6, 0.8, 0.09);
    },
    // ムーグ風の鍵盤のリード（プログレの旋律）
    lead: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.25;
      const g = gain(B, 0); const fl = lp(B, 1200, 4);
      fl.frequency.setValueAtTime(500, t); fl.frequency.linearRampToValueAtTime(1200 + 2600 * v, t + 0.04); fl.frequency.setTargetAtTime(1300 + 900 * v, t + 0.05, 0.2);
      const a = osc(B, "sawtooth", f, t, end); const b = osc(B, "square", f, t, end, 7);
      vibr(B, [a, b], t, end, 5.2, 14, 0.35);
      a.connect(fl); b.connect(fl); fl.connect(g); g.connect(out);
      adsr(g.gain, t, dur * 0.96, 0.13 * v, 0.01, 0.3, 0.75, 0.12);
    },
    // パイプオルガン：倍音を重ねた波＋一オクターブ上をわずかにずらす（うなり）。吹き始めに息の音
    organ: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.6;
      const w = wave(B, "organ", [1, 0.55, 0.42, 0.3, 0.12, 0.18, 0.05, 0.16, 0, 0.06, 0, 0.05]);
      const g = gain(B, 0); const fl = lp(B, Math.min(9000, f * 9), 0.5);
      osc(B, w, f, t, end, -3).connect(fl);
      // 速い音（トッカータ）は一本の管だけ。伸ばす音は一オクターブ上と下を足して厚く、吹き始めに息の音
      const long = dur >= 0.3;
      if (long) { osc(B, w, f * 2, t, end, 4).connect(fl); if (f >= 90) { const s = osc(B, "sine", f / 2, t, end); const sg = gain(B, f < 200 ? 0.35 : 0.2); s.connect(sg); sg.connect(fl); } }
      fl.connect(g); g.connect(out);
      adsr(g.gain, t, dur, (long ? 0.075 : 0.1) * v, long ? 0.06 : 0.012, 0, 1, long ? 0.45 : 0.12);
      if (long && B.white) { const n = B.ctx.createBufferSource(); n.buffer = B.white; const bp = lp(B, f * 4, 2, "bandpass"); const ng = gain(B, 0); ng.gain.setValueAtTime(0.05 * v, t); ng.gain.setTargetAtTime(0, t + 0.02, 0.03); n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t, jr() * 0.5); n.stop(t + 0.25); }
    },
    // ハモンド風の鍵盤（プログレの伴奏）。打鍵の瞬間に三倍音が鳴る
    hammond: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.1;
      const w = wave(B, "hammond", [1, 1, 0.8, 0.7, 0, 0.5, 0, 0.4]);
      const g = gain(B, 0);
      osc(B, w, f, t, end).connect(g);
      const p = osc(B, "sine", f * 3, t, end); const pg = gain(B, 0); pg.gain.setValueAtTime(0.5, t); pg.gain.setTargetAtTime(0, t, 0.08); p.connect(pg); pg.connect(g);
      g.connect(out);
      adsr(g.gain, t, dur * 0.9, 0.06 * v, 0.005, 0, 1, 0.05);
    },
    // 弦の合奏：ずらした二本ののこぎり、ゆっくり立ち上がる
    strings: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.9;
      const g = gain(B, 0); const fl = lp(B, 900 + 1500 * v, 0.6);
      const a = osc(B, "sawtooth", f, t, end, -9); const b = osc(B, "sawtooth", f, t, end, 9);
      vibr(B, a, t, end, 4.8, 9, 0.4);
      a.connect(fl); b.connect(fl); fl.connect(g); g.connect(out);
      adsr(g.gain, t, dur, 0.07 * v, 0.28, 0, 1, 0.7);
    },
    // 低い弦の刻み（チェロ・コントラバス）
    cello: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.3;
      const g = gain(B, 0); const fl = lp(B, 300, 1.5);
      fl.frequency.setValueAtTime(400 + 1400 * v, t); fl.frequency.setTargetAtTime(500 + 500 * v, t + 0.03, 0.1);
      const a = osc(B, "sawtooth", f, t, end, -5); const b = osc(B, "sawtooth", f, t, end, 6);
      a.connect(fl); b.connect(fl); fl.connect(g); g.connect(out);
      adsr(g.gain, t, dur * 0.9, 0.16 * v, 0.02, 0.15, 0.7, 0.18);
    },
    // ヴァイオリンの旋律（タンゴ・悲しい場面）
    violin: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.4;
      const g = gain(B, 0); const fl = lp(B, 2600, 1); const pk = lp(B, 2800, 2.5, "peaking"); pk.gain.value = 5;
      const a = osc(B, "sawtooth", f, t, end); vibr(B, a, t, end, 5.8, 22, 0.2);
      a.connect(fl); fl.connect(pk); pk.connect(g); g.connect(out);
      adsr(g.gain, t, dur, 0.11 * v, 0.08, 0.3, 0.85, 0.25);
    },
    // 合唱「あー」：のこぎりを二つの山（声の響き）に通す
    choir: (B, t, f, dur, v, out) => {
      const end = t + dur + 1.2;
      const g = gain(B, 0); const sum = gain(B, 1);
      [-11, 0, 12].forEach((d) => { const o = osc(B, "sawtooth", f, t, end, d); vibr(B, o, t, end, 4.5 + jr(), 10, 0.5); o.connect(sum); });
      const f1 = lp(B, 720, 5, "bandpass"), f2 = lp(B, 1150, 6, "bandpass"), f3 = lp(B, 2600, 7, "bandpass");
      const g3 = gain(B, 0.35);
      sum.connect(f1); sum.connect(f2); sum.connect(f3); f3.connect(g3);
      f1.connect(g); f2.connect(g); g3.connect(g); g.connect(out);
      adsr(g.gain, t, dur, 0.16 * v, 0.45, 0, 1, 1.0);
    },
    // 鐘：整数倍でない倍音（FM）。長く残る
    bell: (B, t, f, dur, v, out) => {
      const { c, end } = fm(B, f, t, 0, { ratio: 3.51, index: 2.2, index2: 0.2, idecay: 0.8, r: 3.5 });
      const g = gain(B, 0); c.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13 * v, t + 0.004); g.gain.setTargetAtTime(0, t + 0.01, 1.1);
      const h = osc(B, "sine", f * 2.0, t, end); const hg = gain(B, 0); hg.gain.setValueAtTime(0.04 * v, t); hg.gain.setTargetAtTime(0, t, 0.5); h.connect(hg); hg.connect(out);
    },
    // チェレスタ・グロッケン：明るく短い金属
    celesta: (B, t, f, dur, v, out) => {
      const { c } = fm(B, f, t, 0, { ratio: 4, index: 1.1, index2: 0, idecay: 0.15, r: 1.3 });
      const g = gain(B, 0); c.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * v, t + 0.003); g.gain.setTargetAtTime(0, t + 0.01, 0.35);
    },
    // ハープ・リュート：弾いた瞬間に倍音が多く、すぐ丸くなる
    harp: (B, t, f, dur, v, out) => {
      const { c } = fm(B, f, t, 0, { ratio: 1, index: 1.6, index2: 0.1, idecay: 0.12, r: 1.6, ctype: "triangle" });
      const g = gain(B, 0); c.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11 * v, t + 0.003); g.gain.setTargetAtTime(0, t + 0.01, 0.5);
    },
    lute: (B, t, f, dur, v, out) => {
      const { c } = fm(B, f, t, 0, { ratio: 2, index: 1.2, index2: 0.05, idecay: 0.06, r: 0.9, ctype: "triangle" });
      const g = gain(B, 0); const fl = lp(B, 2400, 1); c.connect(fl); fl.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12 * v, t + 0.002); g.gain.setTargetAtTime(0, t + 0.01, 0.22);
    },
    // 電気ピアノ（夜の酒場のジャズ）
    epiano: (B, t, f, dur, v, out) => {
      const { c, end } = fm(B, f, t, dur, { ratio: 1, index: 1.4 * v, index2: 0.15, idecay: 0.25, r: 0.4 });
      const g = gain(B, 0); c.connect(g); g.connect(out);
      const tine = osc(B, "sine", f * 14, t, t + 0.1); const tg = gain(B, 0); tg.gain.setValueAtTime(0.012 * v, t); tg.gain.setTargetAtTime(0, t, 0.015); tine.connect(tg); tg.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * v, t + 0.004); g.gain.setTargetAtTime(0.04 * v, t + 0.01, 0.4);
      g.gain.setTargetAtTime(0, t + dur, 0.08); void end;
    },
    // 蛇腹（バンドネオン・アコーディオン）：二枚の簧がわずかにずれてうなる
    reed: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.2;
      const g = gain(B, 0); const fl = lp(B, 1700 + 900 * v, 1.2);
      osc(B, "sawtooth", f, t, end, -7).connect(fl); osc(B, "square", f, t, end, 7).connect(fl);
      fl.connect(g); g.connect(out);
      adsr(g.gain, t, dur * 0.92, 0.07 * v, 0.025, 0.1, 0.85, 0.07);
    },
    // クラリネット（おどけた旋律）：奇数倍音
    clarinet: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.2;
      const w = wave(B, "clar", [1, 0.02, 0.6, 0.02, 0.35, 0.02, 0.2, 0.01, 0.12, 0, 0.06]);
      const g = gain(B, 0); const o = osc(B, w, f, t, end); vibr(B, o, t, end, 5.5, 12, 0.3);
      o.connect(g); g.connect(out);
      adsr(g.gain, t, dur * 0.9, 0.12 * v, 0.02, 0.1, 0.85, 0.06);
    },
    // チューバ（ブンチャッチャのブン）
    tuba: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.15;
      const w = wave(B, "tuba", [1, 0.7, 0.35, 0.2, 0.1, 0.05]);
      const g = gain(B, 0); const fl = lp(B, 600, 1);
      osc(B, w, f, t, end).connect(fl); fl.connect(g); g.connect(out);
      adsr(g.gain, t, dur * 0.8, 0.3 * v, 0.015, 0.1, 0.7, 0.06);
    },
    // 笛：息の雑音を少し混ぜる
    flute: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.3;
      const g = gain(B, 0); const o = osc(B, "sine", f, t, end); const o2 = osc(B, "triangle", f * 2, t, end); const g2 = gain(B, 0.08);
      vibr(B, o, t, end, 5, 12, 0.3);
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out);
      adsr(g.gain, t, dur, 0.13 * v, 0.06, 0.2, 0.85, 0.15);
      if (B.white) { const n = B.ctx.createBufferSource(); n.buffer = B.white; n.loop = true; const bp = lp(B, f * 2, 1.5, "bandpass"); const ng = gain(B, 0); n.connect(bp); bp.connect(ng); ng.connect(out); adsr(ng.gain, t, dur, 0.025 * v, 0.04, 0.1, 0.5, 0.1); n.start(t, jr() * 0.5); n.stop(end); }
    },
    // S6：マンドリン（二本ずつ張った弦をはじく）。長い音は細かく弾き直す（トレモロ）
    mandolin: (B, t, f, dur, v, out) => {
      const n = dur > 0.3 ? Math.max(2, Math.round(dur * 12.5)) : 1;
      const step = dur / n, end = t + dur + 0.5;
      const g = gain(B, 0); const fl = lp(B, 2600 + 1200 * v, 0.9);
      osc(B, "sawtooth", f, t, end, -5).connect(fl); osc(B, "triangle", f, t, end, 6).connect(fl);
      fl.connect(g); g.connect(out);
      const p = g.gain, pk = 0.06 * v;
      for (let i = 0; i < n; i++) {
        const s = t + i * step, k = i ? 0.72 + 0.22 * jr() : 1;
        p.setValueAtTime(i ? pk * 0.3 : 0, s); p.linearRampToValueAtTime(pk * k, s + 0.004); p.setTargetAtTime(pk * 0.3, s + 0.005, 0.025);
      }
      p.setTargetAtTime(0, t + (n > 1 ? dur : 0.01), n > 1 ? 0.06 : 0.22);
    },
    // S6：オカリナ（土の笛）：丸い正弦に、ほんの少しの三倍音と息
    ocarina: (B, t, f, dur, v, out) => {
      const end = t + dur + 0.3;
      const g = gain(B, 0); const o = osc(B, "sine", f, t, end); const o3 = osc(B, "sine", f * 3, t, end); const g3 = gain(B, 0.035);
      vibr(B, [o, o3], t, end, 4.6, 9, 0.35);
      o.connect(g); o3.connect(g3); g3.connect(g); g.connect(out);
      adsr(g.gain, t, dur, 0.15 * v, 0.045, 0.2, 0.88, 0.12);
      if (B.white) { const nz = B.ctx.createBufferSource(); nz.buffer = B.white; nz.loop = true; const bp = lp(B, f * 1.5, 2, "bandpass"); const ng = gain(B, 0); nz.connect(bp); bp.connect(ng); ng.connect(out); adsr(ng.gain, t, Math.min(dur, 0.12), 0.02 * v, 0.02, 0.06, 0.3, 0.06); nz.start(t, jr() * 0.5); nz.stop(end); }
    },
    // S6：グラスハーモニカ（擦ったグラス）：二つの正弦がわずかにずれ、音量がかすかに震える。ゆっくり立ち上がり長く残る
    glass: (B, t, f, dur, v, out) => {
      const end = t + dur + 1.2;
      const g = gain(B, 0); const o = osc(B, "sine", f, t, end); const o2 = osc(B, "sine", f * 2.005, t, end); const g2 = gain(B, 0.18);
      o.connect(g); o2.connect(g2); g2.connect(g);
      const am = gain(B, 1); const tr = osc(B, "sine", 5 + jr(), t, end); const tg = gain(B, 0.22); tr.connect(tg); tg.connect(am.gain);
      g.connect(am); am.connect(out);
      adsr(g.gain, t, dur, 0.11 * v, 0.14, 0.3, 0.8, 0.9);
    },
    // S6：ささやき：雑音を細い帯域二つ（音の高さと、その倍）に通した、息だけの声
    whisper: (B, t, f, dur, v, out) => {
      if (!B.white) return;
      const end = t + dur + 0.6;
      const n = B.ctx.createBufferSource(); n.buffer = B.white; n.loop = true;
      const b1 = lp(B, f, 12, "bandpass"); const b2 = lp(B, f * 2, 9, "bandpass"); const g = gain(B, 0);
      n.connect(b1); n.connect(b2); b1.connect(g); b2.connect(g); g.connect(out);
      adsr(g.gain, t, dur, 0.9 * v, 0.25, 0.3, 0.7, 0.45);
      n.start(t, jr() * 0.8); n.stop(end);
    },
    // ピッツィカート（弦をはじく）
    pizz: (B, t, f, dur, v, out) => {
      const end = t + 0.6;
      const g = gain(B, 0); const fl = lp(B, 1600, 1);
      osc(B, "triangle", f, t, end).connect(fl); osc(B, "sawtooth", f, t, end, 5).connect(fl);
      fl.frequency.setValueAtTime(2200, t); fl.frequency.setTargetAtTime(500, t, 0.05);
      fl.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13 * v, t + 0.003); g.gain.setTargetAtTime(0, t + 0.01, 0.12);
    },
    // 鈍い持続音（深淵）：低いのこぎりのフィルタがゆっくり開閉する
    drone: (B, t, f, dur, v, out) => {
      const end = t + dur + 2;
      const g = gain(B, 0); const fl = lp(B, 200, 6);
      const l = osc(B, "sine", 0.11 + jr() * 0.05, t, end); const lg = gain(B, 160); l.connect(lg); lg.connect(fl.frequency);
      osc(B, "sawtooth", f, t, end, -6).connect(fl); osc(B, "sawtooth", f * 1.498, t, end, 5).connect(fl);
      fl.connect(g); g.connect(out);
      adsr(g.gain, t, dur, 0.14 * v, 1.2, 0, 1, 1.6);
    },
  };
  // 打楽器
  function noise(B, t, dur, v, f, type, q, out, decay) {
    if (!B.white) return;
    const n = B.ctx.createBufferSource(); n.buffer = B.white; n.loop = true;
    const fl = lp(B, f, q || 0.7, type || "highpass"); const g = gain(B, 0);
    n.connect(fl); fl.connect(g); g.connect(out);
    g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t + 0.002, decay || dur / 3);
    n.start(t, jr() * 0.8); n.stop(t + dur + 0.1);
  }
  function thump(B, t, f0, f1, d, v, out, type) {
    const o = osc(B, type || "sine", f0, t, t + d + 0.1); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.4);
    const g = gain(B, 0); o.connect(g); g.connect(out);
    g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t + 0.005, d / 3);
  }
  const DRUM = {
    kick: (B, t, v, out) => { thump(B, t, 150, 46, 0.32, 0.9 * v, out); noise(B, t, 0.02, 0.08 * v, 2500, "bandpass", 1, out, 0.004); },
    snare: (B, t, v, out) => { noise(B, t, 0.2, 0.32 * v, 1700, "bandpass", 0.6, out, 0.05); thump(B, t, 230, 170, 0.1, 0.25 * v, out, "triangle"); },
    hat: (B, t, v, out) => noise(B, t, 0.05, 0.11 * v, 7500, "highpass", 0.7, out, 0.012),
    ohat: (B, t, v, out) => noise(B, t, 0.3, 0.09 * v, 7000, "highpass", 0.7, out, 0.09),
    shaker: (B, t, v, out) => noise(B, t, 0.06, 0.06 * v, 5500, "bandpass", 1.5, out, 0.015),
    tom: (B, t, v, out) => thump(B, t, 190, 120, 0.35, 0.55 * v, out),
    ltom: (B, t, v, out) => thump(B, t, 120, 70, 0.45, 0.6 * v, out),
    rim: (B, t, v, out) => { noise(B, t, 0.03, 0.15 * v, 1800, "bandpass", 4, out, 0.006); thump(B, t, 520, 500, 0.03, 0.12 * v, out, "square"); },
    brush: (B, t, v, out) => noise(B, t, 0.15, 0.07 * v, 3200, "bandpass", 0.8, out, 0.04),
    finger: (B, t, v, out) => noise(B, t, 0.06, 0.18 * v, 2200, "bandpass", 1.2, out, 0.01),
    // 工業的な金物：ずれた矩形の束を帯域で絞る
    clank: (B, t, v, out) => {
      const g = gain(B, 0); const bp = lp(B, 2600, 1.4, "bandpass");
      [317, 449, 573, 811, 1063].forEach((f) => osc(B, "square", f, t, t + 0.4).connect(bp));
      bp.connect(g); g.connect(out); g.gain.setValueAtTime(0.09 * v, t); g.gain.setTargetAtTime(0, t + 0.003, 0.06);
      noise(B, t, 0.08, 0.12 * v, 4000, "highpass", 0.7, out, 0.02);
    },
    // 金床：高い金属の響き
    anvil: (B, t, v, out) => { const { c } = fm(B, 1180, t, 0, { ratio: 1.41, index: 1.6, index2: 0.1, idecay: 0.05, r: 0.8 }); const g = gain(B, 0); c.connect(g); g.connect(out); g.gain.setValueAtTime(0.09 * v, t); g.gain.setTargetAtTime(0, t + 0.003, 0.18); },
    timp: (B, t, v, out) => { thump(B, t, 98, 82, 1.4, 0.7 * v, out); noise(B, t, 0.3, 0.06 * v, 300, "lowpass", 1, out, 0.08); },
    gong: (B, t, v, out) => { const { c } = fm(B, 66, t, 0, { ratio: 1.47, index: 3, index2: 0.6, idecay: 1.5, r: 6 }); const g = gain(B, 0); c.connect(g); g.connect(out); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32 * v, t + 0.05); g.gain.setTargetAtTime(0, t + 0.06, 1.8); },
    // 重い一撃（工場の鉄槌）：太い低音＋残響の多い雑音
    slam: (B, t, v, out) => { thump(B, t, 110, 35, 0.6, 0.9 * v, out); noise(B, t, 0.5, 0.2 * v, 900, "lowpass", 0.8, out, 0.12); },
  };
  snd.bgmInsts = Object.keys(INST);
  snd.bgmDrumNames = Object.keys(DRUM);

  // ---------------------------------------------------------------- 卓（曲ごとの束 → BGM の音量 → 圧縮 → 出口）
  function impulse(ctx, sec, decay) {
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    const r = seeded(77);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < ctx.sampleRate * 0.012 ? i / (ctx.sampleRate * 0.012) : 1); }
    return b;
  }
  function makeBus(ctx, dest) {
    const B = { ctx };
    B.vol = ctx.createGain(); B.vol.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6; comp.attack.value = 0.01; comp.release.value = 0.3;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 32; // 聞こえないほど低い揺れを切る
    B.duck = ctx.createGain(); // S4：効果音の瞬間だけ少し下げる
    B.vol.connect(B.duck); B.duck.connect(hp); hp.connect(comp); comp.connect(dest || ctx.destination);
    B.rev = ctx.createConvolver(); B.rev.buffer = impulse(ctx, 3.4, 3.2);
    const rl = lp(B, 4200, 0.5); B.rev.connect(rl); rl.connect(B.vol);
    const n = ctx.sampleRate;
    B.white = ctx.createBuffer(1, n, n);
    const r = seeded(91); const d = B.white.getChannelData(0); for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    return B;
  }
  // 歪み（ギター）
  function driveCurve(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; }
  // 曲を一つ鳴らす係：曲の束（fader）を作り、刻みを先読みして予約し続ける
  function makePlayer(B, id, tr, C, t0, fadeIn, noMix) {
    const ctx = B.ctx;
    const fader = ctx.createGain(); fader.gain.setValueAtTime(0, t0); fader.gain.linearRampToValueAtTime((tr.gain || 1) * (snd.mixGain && !noMix ? snd.mixGain("bgm", id) : 1), t0 + fadeIn);
    fader.connect(B.vol);
    const send = ctx.createGain(); send.gain.value = 1; fader.connect(send);
    const wet = ctx.createGain(); wet.gain.value = tr.wet ?? 0.3; send.connect(wet); wet.connect(B.rev);
    const parts = (tr.parts || []).map((p) => {
      const pg = gain(B, p.vol ?? 0.6);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) { pan.pan.value = p.pan || 0; pg.connect(pan); pan.connect(fader); } else pg.connect(fader);
      if (p.wet !== undefined) { const w = gain(B, p.wet); pg.connect(w); w.connect(B.rev); }
      let input = pg;
      if (p.fx === "drive") {
        const pre = gain(B, 2.2); const sh = ctx.createWaveShaper(); sh.curve = driveCurve(4); sh.oversample = "2x";
        const hp = lp(B, 140, 0.7, "highpass"); const cab = lp(B, 3200, 0.9); const post = gain(B, 0.42);
        pre.connect(sh); sh.connect(hp); hp.connect(cab); cab.connect(post); post.connect(pg);
        input = pre;
      }
      if (p.echo) {
        const dl = ctx.createDelay(2); dl.delayTime.value = C.dt * (p.echoSteps || 3); const fb = gain(B, p.echo); const el = lp(B, 2500, 0.6);
        pg.connect(dl); dl.connect(el); el.connect(fb); fb.connect(dl); el.connect(fader);
      }
      return { in: input, p };
    });
    const rnd = seeded(hash(id));
    const P = { id, tr, C, fader, step: 0, time: t0 + 0.05, stopAt: Infinity, parts };
    P.tick = (until) => {
      while (P.time < until && P.time < P.stopAt) {
        const i = P.step % C.steps;
        let t = P.time;
        if (tr.swing && i % 4 === 2) t += tr.swing * C.dt;
        for (const ev of C.at[i]) {
          const part = parts[ev.part];
          const v = Math.max(0.2, Math.min(1.1, ev.vel * (1 + (rnd() - 0.5) * 0.14)));
          const tt = t + (ev.drum ? 0 : (rnd() - 0.5) * 0.008);
          try {
            if (ev.drum) DRUM[ev.drum](B, tt, v, part.in);
            else { const fn = INST[ev.inst]; if (fn) for (const m of ev.notes) fn(B, tt, mtof(m), ev.len * C.dt, v, part.in); }
          } catch {}
        }
        P.time += C.dt; P.step++;
      }
    };
    return P;
  }
  // ファイルの曲を繰り返し鳴らす係
  function makeFilePlayer(B, id, buf, t0, fadeIn) {
    const fader = B.ctx.createGain(); fader.gain.setValueAtTime(0, t0); fader.gain.linearRampToValueAtTime(1, t0 + fadeIn); fader.connect(B.vol);
    const s = B.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(fader); s.start(t0);
    return { id, fader, stopAt: Infinity, src: s, tick() {} };
  }

  // 設定 → BGM の束の音量（つまみの 0〜1 を控えめに）
  const bgmLevel = (st) => (st.mute || !st.bgmOn ? 0 : st.bgm * 0.55);
  snd.bgmLevel = bgmLevel;
  // 検証用：OfflineAudioContext に同じ卓を組んで曲を鳴らす（tools/bgm_render.mjs が使う）
  //   levels：true なら既定の音量（設定の音量 × つり合いの倍率）で鳴らす（tools/loudness.mjs が使う）
  snd._bgmOffline = (ctx, id, sec, levels) => {
    const tr = BGM().TRACKS[id];
    const B = makeBus(ctx);
    B.vol.gain.value = levels ? bgmLevel(snd.bgmSettings(snd.BGM_DEF)) : 1;
    const P = makePlayer(B, id, tr, snd.bgmCompile(tr), 0, 0.01, !levels);
    P.tick(sec);
    return P;
  };

  // ---------------------------------------------------------------- 実際に鳴らす（ブラウザの中だけ）
  if (!AC || typeof document === "undefined") { snd.bgm = () => {}; snd.bgmUpdate = () => {}; return; }
  let B = null, cur = null, curScene = null, curId = null, own = false;
  const olds = [];
  const files = {}; // 鍵 → AudioBuffer | "loading" | "bad"
  const level = () => bgmLevel(snd.bgmSettings(snd.settings));
  function ensure() {
    if (B) return B;
    let ctx = snd.ctx && snd.ctx(); // 効果音と同じ AudioContext を使う（無ければ自分で作る）
    if (!ctx) { try { ctx = snd.newContext ? snd.newContext() : new AC(); own = true; } catch { return null; } }
    try { B = makeBus(ctx); } catch { B = null; return null; }
    snd.bgmVol();
    return B;
  }
  // 音量のつまみ・消音・タブの裏表を反映する。音量 0 や BGM オフのあいだは曲を止めて、何も予約しない
  snd.bgmVol = () => {
    if (!B) return;
    B.vol.gain.setTargetAtTime(document.hidden ? 0 : level(), B.ctx.currentTime, document.hidden ? 0.15 : 0.4);
    if (curScene) snd.bgm(curScene);
  };
  // S4：効果音が鳴る瞬間（t）に BGM を少し下げ、すぐ戻す（つり合いの表 MIX.DUCK。小さな音では下げない）
  snd.duck = (name, t) => {
    const K = (G.data && G.data.MIX && G.data.MIX.DUCK) || null;
    if (!B || !K || (K.skip || []).includes(name) || !cur) return;
    const p = B.duck.gain;
    const at = Math.max(B.ctx.currentTime, t || 0);
    try {
      p.cancelScheduledValues(at);
      p.setTargetAtTime(K.depth, at, K.attack / 3);
      p.setTargetAtTime(1, at + K.attack + K.hold, K.release / 3);
    } catch {}
  };
  function stopCur(fade) {
    if (!cur) return;
    const now = B.ctx.currentTime;
    const P = cur; cur = null;
    P.fader.gain.cancelScheduledValues(now); P.fader.gain.setValueAtTime(P.fader.gain.value, now); P.fader.gain.linearRampToValueAtTime(0, now + fade);
    P.stopAt = now + fade;
    if (P.src) try { P.src.stop(now + fade + 0.05); } catch {}
    olds.push(P);
    setTimeout(() => { const i = olds.indexOf(P); if (i >= 0) olds.splice(i, 1); try { P.fader.disconnect(); } catch {} }, (fade + 6) * 1000);
  }
  // 場面の曲にする（同じ場面なら何もしない）。前の曲は 2.5 秒かけて消し、次は 1.5 秒かけて立ち上げる
  snd.bgm = (scene) => {
    if (!ensure() || B.ctx.state === "closed") return;
    if (scene !== curScene) { curScene = scene; curId = snd.bgmTrackFor(scene, true); }
    if (!level()) { stopCur(1.2); return; }
    if (cur && cur.id === curId) return;
    stopCur(2.5);
    if (!curId) return;
    const t0 = B.ctx.currentTime + 0.05;
    const key = snd.musicKey(scene, curId);
    if (key && files[key] !== "bad") {
      if (!files[key]) loadFile(key, scene);
      if (files[key] === "loading") return;
      cur = makeFilePlayer(B, curId, files[key], t0, 1.5);
      return;
    }
    const tr = BGM().TRACKS[curId];
    cur = makePlayer(B, curId, tr, snd.bgmCompile(tr), t0, 1.5);
    pump();
  };
  function loadFile(key, scene) {
    files[key] = "loading";
    fetch(G.ASSETS[key]).then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then((ab) => new Promise((ok, ng) => { const p = B.ctx.decodeAudioData(ab, ok, ng); if (p && p.then) p.then(ok, ng); }))
      .then((buf) => { files[key] = buf; }, () => { files[key] = "bad"; })
      .then(() => { if (curScene === scene && !cur) snd.bgm(scene); });
  }
  // 今の様子（確かめる用）：場面・鳴っている曲・音量・鳴っている曲の数（消えかけを含む）
  snd.bgmNow = () => ({ scene: curScene, id: cur ? cur.id : null, level: level(), playing: (cur ? 1 : 0) + olds.length, state: B ? B.ctx.state : null, shared: B ? !own : null });
  // 先読みして予約（0.1 秒ごとに 0.35 秒先まで）。止まっている・裏に回っているときは何もしない
  function pump() {
    if (!B || B.ctx.state !== "running" || document.hidden) return;
    const until = B.ctx.currentTime + 0.35;
    if (cur) cur.tick(until);
    olds.forEach((P) => P.tick(until));
  }
  setInterval(pump, 100);

  // 今の画面から場面を決めて切り替える
  const view = () => { const s = document.getElementById("setup"); const on = !!(s && !s.hidden); return { title: on || !G.S, depart: on && s.dataset.step === "prologue" }; };
  snd.bgmUpdate = () => { if (B) snd.bgm(snd.bgmScene(G.S, view())); };
  function wakeBgm() {
    if (!ensure()) return;
    if (B.ctx.state === "suspended") B.ctx.resume().catch(() => {});
    snd.bgmUpdate();
  }
  document.addEventListener("pointerdown", wakeBgm, true);
  document.addEventListener("keydown", wakeBgm, true);
  document.addEventListener("visibilitychange", () => {
    if (!B) return;
    snd.bgmVol();
    if (own) { if (document.hidden) B.ctx.suspend().catch(() => {}); else B.ctx.resume().catch(() => {}); }
  });
  // 描き直すたびと、ときどき（タイトルへ戻ったときなど、描き直しの無い切り替えのため）場面を見る
  function hookRender() {
    const ui = G.ui;
    if (!ui || !ui.render || ui.render._bgm) return;
    const base = ui.render;
    ui.render = (...a) => { const r = base(...a); try { snd.bgmUpdate(); } catch {} return r; };
    ui.render._bgm = true;
  }
  setInterval(() => { hookRender(); try { snd.bgmUpdate(); } catch {} }, 700);

  // ---------------------------------------------------------------- 設定の画面（「音」の窓に BGM の行を足す）
  function saveSet() { try { globalThis.localStorage.setItem(SKEY, JSON.stringify(snd.settings)); } catch {} }
  function addRow() {
    const dlg = document.getElementById("dlgSound");
    if (!dlg || document.getElementById("sndBgm")) return !!dlg;
    const row = document.createElement("div");
    row.className = "srow";
    row.innerHTML = `<label class="son"><input type="checkbox" id="sndBgmOn"> BGM</label><input type="range" id="sndBgm" min="0" max="100" step="5" aria-label="BGM の音量"><output id="sndBgmV" class="num"></output>`;
    const rows = dlg.querySelectorAll(".dbody.sound .srow");
    const after = rows[rows.length - 1];
    const amb = dlg.querySelector("#sndAmb");
    const ref = amb ? amb.closest(".srow") : after;
    if (ref) ref.after(row); else dlg.querySelector(".dbody").append(row);
    const on = row.querySelector("#sndBgmOn"), rg = row.querySelector("#sndBgm"), out = row.querySelector("#sndBgmV");
    const sync = () => {
      const st = snd.bgmSettings(snd.settings);
      on.checked = st.bgmOn; rg.disabled = !st.bgmOn;
      rg.value = Math.round(st.bgm * 100); out.textContent = Math.round(st.bgm * 100);
    };
    const change = () => {
      snd.settings = { ...snd.settings, bgm: rg.value / 100, bgmOn: on.checked };
      saveSet(); sync(); ensure(); snd.bgmVol(); snd.bgmUpdate();
    };
    on.addEventListener("input", change); rg.addEventListener("input", change);
    // 消音のチェックは sound.js が保存する。BGM の音量にもすぐ効かせる
    const mute = dlg.querySelector("#sndMute"); if (mute) mute.addEventListener("input", () => setTimeout(() => snd.bgmVol(), 0));
    const open = document.getElementById("openSound"); if (open) open.addEventListener("click", sync);
    sync();
    return true;
  }
  if (!addRow()) { const t = setInterval(() => { if (addRow()) clearInterval(t); }, 500); setTimeout(() => clearInterval(t), 15000); }
})(globalThis.G = globalThis.G || {});
