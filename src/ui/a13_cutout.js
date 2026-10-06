// A13・A14：白い無地の背景で作った絵（人物の絵：docs/art/style.json、魔物の絵：docs/art/style_monsters.json）の背景を消して透明にし、背景の絵になじませる。
// 消すのは、絵の外周からつながった、背景の色（縁の白に近い升の色）にごく近い所（A14）と、線画に囲まれた背景（腕と体のあいだ・脚のあいだなど。
// むらの無い背景の色で、大きく、縁に触れず、まわりがすぐ線画になる所。A15）。白い服・白い毛皮・白目・歯・光の反射は残す（迷うなら消さない）。
// 境目は 0/1 で切らず、半透明にする（ソフトマット）：境目の数 px は、その画素の色が「背景の色」と「すぐ内側の絵の色」のどこにあるかで透け具合を決め、
// 白と混ざった分を取り除いて色を戻す（色のにじみ抜き。白い縁取りを残さない）。
// 人物は v4_assets.js、魔物（人の姿の敵も）は v6_monsters.js が使う。同じ鍵は一度だけ処理して覚えておく（G.a13.cutout）。
// 画素を読めないとき（file:// で開いたときなど）は null を返し、呼んだ側は元の絵のまま描く（壊さない）。
// 消せた立ち絵の canvas には cut の印が付き、CSS（ui/a13_cutout.css）は縁を四角くぼかす覆いをやめて、足元だけを背景へ溶かす。
// 大きく縮めて描くときは G.a13.draw で段階的に縮める（なめらかに。A14）。レーン A（絵）
(function (G) {
  const A13 = (G.a13 = G.a13 || {});
  // 背景を消す計算（DOM なし・外の名前を使わない）。同じものを Worker でも動かすので、この関数の中だけで閉じている（T）
  function a13core() {
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
    const keyOut = (p, W, H, opt = {}) => {
      const n = W * H;
      const refs = refsOf(p, W, H, !!opt.bottom);
      if (!refs.length) return 0;
      // 背景の色からの差（いちばん近い候補との、色ごとの差の最大）と、その候補
      const dist = new Uint8Array(n), near = new Uint8Array(n);
      if (refs.length === 1) { // たいていは真っ白が一つ（速い道。結果は下と同じ）
        const R = refs[0], r0 = R[0], r1 = R[1], r2 = R[2];
        for (let i = 0, k = 0; i < n; i++, k += 4) {
          const a = Math.abs(p[k] - r0), b = Math.abs(p[k + 1] - r1), c = Math.abs(p[k + 2] - r2);
          const d = a > b ? (a > c ? a : c) : (b > c ? b : c);
          dist[i] = d < 255 ? d : 255;
        }
      } else for (let i = 0; i < n; i++) {
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
      // 囲まれた背景（A15）：腕と体のあいだ・脚のあいだなど、線画に囲まれて外周とつながらない背景も消す。消すのは、
      // ・背景の色にごく近く（HOLE_TOL 未満の点から、圧縮のむら HOLE_GROW 未満まで広げた所）、むらが無い（平均の差が HOLE_FLAT 未満）
      // ・ある程度大きい（HOLE_MIN 以上。白目・歯・光の点は消さない）
      // ・まわりがすぐ線画や濃い色になる（縁から HOLE_REACH px 以内に背景から HOLE_EDGE 以上離れた色がある）。白い服・帯・白い毛皮は
      //   縁に薄い影の色が広がっているので、縁の HOLE_SOFT 以上が「薄い色のまま」なら残す
      // ・線の向こうがまた白くない（縁から外へ HOLE_PAST px 見て、線を越えた先が背景の色に近い縁が HOLE_WHITE 以上なら残す）。
      //   白い服の折り目・襟・旗などは、線を越えてもまた白い。腕と体のあいだの背景は、線の向こうが肌や服の色になる
      // ・下の縁に触れるもの（脚や腕と服のあいだが絵の下まで続く所）は、条件を厳しくする（胸から下で切れた白い服を守る）。迷うなら消さない
      // ・背景が真っ白（明るい。251 を超える）の絵ではしない。真っ白な背景と白い服は同じ色で見分けられない（生成の背景が少し灰色の絵だけ）
      if (opt.holes !== false && refs.every((r) => Math.max(r[0], r[1], r[2]) <= 251)) {
        const HOLE_TOL = 8, HOLE_GROW = 20, HOLE_FLAT = 3, HOLE_MIN = Math.max(150, Math.round(n * 0.0012));
        const HOLE_REACH = 4, HOLE_EDGE = 60, HOLE_SOFT = 0.2, HOLE_PAST = 12, HOLE_WHITE = 0.15;
        const mark = new Int32Array(n), comp = [];
        let id = 0;
        // i から step の向きに歩く。返り値：1＝HOLE_REACH 以内に線画・濃い色が無い（薄い色のまま）、2＝線を越えた先がまた白い、0＝そのほか
        const look = (i, step) => {
          let hard = false;
          for (let s = 1, j = i; s <= HOLE_PAST; s++) {
            const px = j % W;
            j += step;
            if (j < 0 || j >= n || (step === 1 && px === W - 1) || (step === -1 && px === 0)) break;
            if (mark[j] === id) continue;
            if (dist[j] >= HOLE_EDGE) hard = true;
            else if (hard && dist[j] < HOLE_GROW) return 2;
            if (s === HOLE_REACH && !hard) return 1;
          }
          return 0;
        };
        for (let s0 = 0; s0 < n; s0++) {
          if (bg[s0] || mark[s0] || dist[s0] >= HOLE_TOL) continue;
          id++;
          comp.length = 0;
          let qh = 0, sum = 0, edge = false;
          mark[s0] = id; comp.push(s0);
          while (qh < comp.length) {
            const i = comp[qh++], x = i % W;
            sum += dist[i];
            if (x === 0 || x === W - 1 || i < W || i >= n - W) edge = true;
            const go = (j) => { if (!bg[j] && !mark[j] && dist[j] < HOLE_GROW) { mark[j] = id; comp.push(j); } };
            if (x > 0) go(i - 1);
            if (x < W - 1) go(i + 1);
            if (i >= W) go(i - W);
            if (i < n - W) go(i + W);
          }
          if (comp.length < HOLE_MIN || sum / comp.length >= (edge ? HOLE_FLAT - 1 : HOLE_FLAT)) continue;
          let rim = 0, soft = 0, white = 0;
          for (const i of comp) {
            const x = i % W;
            for (const st of [-1, 1, -W, W]) {
              const j = i + st;
              if (j < 0 || j >= n || (st === -1 && x === 0) || (st === 1 && x === W - 1) || mark[j] === id) continue;
              rim++;
              const r = look(i, st);
              if (r === 1) soft++; else if (r === 2) white++;
            }
          }
          const k = edge ? 0.5 : 1;
          if (!rim || soft / rim >= HOLE_SOFT * k || white / rim >= HOLE_WHITE * k) continue;
          for (const i of comp) bg[i] = 1;
        }
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
        const visit = (j) => { if (!bg[j] && !depth[j]) { depth[j] = d; next.push(j); } };
        for (const i of front) {
          const x = i % W;
          if (x > 0) visit(i - 1);
          if (x < W - 1) visit(i + 1);
          if (i >= W) visit(i - W);
          if (i < n - W) visit(i + W);
        }
        front = next;
      }
      // すぐ内側の絵の色（境目より内側。半径 BAND+2 のうち、背景の色からいちばん離れていて近い画素。線画があれば線画の色になる）
      const R = BAND + 2, SIDE = 2 * R + 1;
      const NEAR = new Float64Array(SIDE * SIDE); // 中心からの距離×12（毎回 sqrt しない）
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) NEAR[(dy + R) * SIDE + dx + R] = Math.sqrt(dx * dx + dy * dy) * 12;
      const inner = (i) => {
        const x0 = i % W, y0 = (i - x0) / W, di = depth[i];
        let best = -1, bd = 1e9;
        for (let dy = -R; dy <= R; dy++) {
          const y = y0 + dy;
          if (y < 0 || y >= H) continue;
          const row = y * W, nrow = (dy + R) * SIDE + R;
          for (let dx = -R; dx <= R; dx++) {
            const x = x0 + dx;
            if (x < 0 || x >= W) continue;
            const j = row + x;
            if (bg[j] || (depth[j] && depth[j] <= di)) continue; // 自分より内側（深い）の画素だけ
            const score = NEAR[nrow + dx] - dist[j]; // 近くて、背景の色から離れているほどよい
            if (score < bd) { bd = score; best = j; }
          }
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
          if (x > 0 && depth[i - 1] === d - 1 && alpha[i - 1] > a) a = alpha[i - 1];
          if (x < W - 1 && depth[i + 1] === d - 1 && alpha[i + 1] > a) a = alpha[i + 1];
          if (i >= W && depth[i - W] === d - 1 && alpha[i - W] > a) a = alpha[i - W];
          if (i < n - W && depth[i + W] === d - 1 && alpha[i + W] > a) a = alpha[i + W];
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
    return keyOut;
  }
  A13.core = a13core;
  A13.keyOut = a13core();

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
  A13.has = (key) => key in cache; // もう処理してあるか（T）

  // ---------------------------------------------------------------- 画面を止めずに消す（T）
  // 背景を消す計算（1 枚 20〜100ms。遅い端末では数百 ms）を、Worker（裏の働き手）でする。Worker を作れない（ページの決まりで禁じられている
  // など）ときは、暇なとき（requestIdleCallback）にこの場でする。どちらでも結果は同じ（同じ a13core を動かす）
  let worker = null; // null：まだ作っていない／false：使えない
  let wid = 0;
  const waiting = new Map();
  const idle = (f) => (typeof requestIdleCallback === "function" ? requestIdleCallback(f, { timeout: 400 }) : setTimeout(f, 16));
  const getWorker = () => {
    if (worker !== null) return worker;
    worker = false;
    try {
      if (typeof Worker !== "function" || typeof Blob !== "function" || typeof URL === "undefined" || !URL.createObjectURL) return worker;
      const src = `const keyOut = (${a13core.toString()})();\nonmessage = (e) => { const m = e.data; let r = -1; try { r = keyOut(new Uint8ClampedArray(m.buf), m.W, m.H, m.opt || {}); } catch (x) { r = -1; } postMessage({ id: m.id, buf: m.buf, r }, [m.buf]); };`;
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
      w.onmessage = (e) => { const f = waiting.get(e.data.id); waiting.delete(e.data.id); if (f) f(e.data); };
      w.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); worker = false; const fs = [...waiting.values()]; waiting.clear(); fs.forEach((f) => f(null)); };
      worker = w;
    } catch (e) { worker = false; }
    return worker;
  };
  A13.worker = () => !!getWorker();
  // d：ImageData（書き換える）。cb(r, d)：r は keyOut の返り値（消えた割合）。Worker が途中で使えなくなったら、元の画素でこの場で計算し直す
  A13.run = (d, opt, cb) => {
    const local = (dd) => idle(() => { let r = 0; try { r = A13.keyOut(dd.data, dd.width, dd.height, opt); } catch (e) { r = 0; } cb(r, dd); });
    const w = getWorker();
    if (!w) return local(d);
    const W = d.width, H = d.height;
    const keep = new Uint8ClampedArray(d.data); // Worker が使えなくなったとき用の元の画素（渡す方は Worker に移す）
    const id = ++wid;
    waiting.set(id, (m) => {
      if (!m || m.r < 0) return local(new ImageData(keep, W, H));
      cb(m.r, new ImageData(new Uint8ClampedArray(m.buf), W, H));
    });
    const buf = d.data.buffer;
    try { w.postMessage({ id, buf, W, H, opt: opt || {} }, [buf]); } catch (e) { waiting.delete(id); local(new ImageData(keep, W, H)); }
  };
  // A13.cutout と同じ結果を、画面を止めずに作って覚える。done(canvas|null) は済んだら呼ぶ（もう済んでいれば、すぐ）
  const pending = {};
  A13.prepare = (key, img, rect, opt, done) => {
    if (key in cache) { if (done) done(cache[key]); return; }
    if (pending[key]) { if (done) pending[key].push(done); return; }
    pending[key] = done ? [done] : [];
    const finish = (c) => { if (!(key in cache)) cache[key] = c; const fs = pending[key] || []; delete pending[key]; fs.forEach((f) => f(cache[key])); };
    if (typeof document === "undefined" || !document.createElement || typeof ImageData !== "function") return finish(A13.cutout(key, img, rect, opt));
    let c, g, d;
    try {
      const [x, y, w, h] = rect || [0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height];
      if (!w || !h) { delete pending[key]; return done && done(null); } // まだ大きさが分からない：覚えずに次の機会に
      c = document.createElement("canvas");
      c.width = w; c.height = h;
      g = c.getContext("2d");
      g.drawImage(img, x, y, w, h, 0, 0, w, h);
      d = g.getImageData(0, 0, w, h); // file:// などで画素を読めなければ、ここで投げる
    } catch (e) { return finish(null); }
    A13.run(d, opt, (r, dd) => {
      if (key in cache) return finish(cache[key]); // そのあいだに描くために、この場で処理された
      if (r >= A13.MIN) { g.putImageData(dd, 0, 0); finish(c); } else finish(null);
    });
  };
  A13.preparing = (key) => !!pending[key];

  // 少しずつ処理する（T）：白抜きは 1 枚で数十 ms かかる。図鑑の一覧のように何十枚も要るときは、1 回に 1 枚ずつ、間で画面を動かしながら片づける。
  // job は真を返す（または返り値なし）と済み。alive() が偽になった仕事（窓を閉じた・見えなくなった）は飛ばす
  const jobs = [];
  let running = false;
  const tick = () => {
    running = false;
    while (jobs.length) {
      const j = jobs.shift();
      if (j.alive && !j.alive()) continue;
      try { j.run(); } catch (e) { /* 一枚が失敗しても続ける */ }
      break;
    }
    if (jobs.length) { running = true; setTimeout(tick, 0); }
  };
  A13.queue = (run, alive) => {
    jobs.push({ run, alive });
    if (!running && typeof setTimeout === "function") { running = true; setTimeout(tick, 0); }
  };
  A13.queued = () => jobs.length;

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
