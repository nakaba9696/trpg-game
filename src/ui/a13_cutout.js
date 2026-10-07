// A13・A14：白い無地の背景で作った絵（人物の絵：docs/art/style.json、魔物の絵：docs/art/style_monsters.json）の背景を消して透明にし、背景の絵になじませる。
// 消すのは、絵の外周からつながった、背景の色（縁の白に近い升の色）にごく近い所（A14）と、線画に囲まれた背景（腕と体のあいだ・武器の柄と体のあいだ・
// 髪の房のあいだなど。A15・A16）。白い服・白い毛皮・白目・歯・光の反射は残す。囲まれた背景で消すか迷う所は、薄白の半透明にする（A16）。
// 境目は 0/1 で切らず、半透明にする（ソフトマット）：境目の数 px は、その画素の色が「背景の色」と「すぐ内側の絵の色」のどこにあるかで透け具合を決め、
// 白と混ざった分を取り除いて色を戻す（色のにじみ抜き。白い縁取りを残さない）。
// 人物は v4_assets.js、魔物（人の姿の敵も）は v6_monsters.js が使う。同じ鍵は一度だけ処理して覚えておく（G.a13.cutout）。
// 画素を読めないとき（file:// で開いたときなど）は null を返し、呼んだ側は元の絵のまま描く（壊さない）。
// 消せた立ち絵の canvas には cut の印が付き、CSS（ui/a13_cutout.css）は縁を四角くぼかす覆いをやめて、足元だけを背景へ溶かす。
// 背景をもう透明にしてある絵（透明つきの webp に置き換えた絵）は切り抜かずにそのまま使い、同じく cut の印を付ける（A16）。
// 大きく縮めて描くときは G.a13.draw で段階的に縮める（なめらかに。A14）。レーン A（絵）
(function (G) {
  const A13 = (G.a13 = G.a13 || {});
  // 背景を消す計算（DOM なし・外の名前を使わない）。同じものを Worker でも動かすので、この関数の中だけで閉じている（T）
  function a13core() {
    const LIGHT = 226, LIGHT_SPREAD = 24; // 背景の色（縁の升の色）がこれより明るく、色が薄いこと
    const PATCH_TOL = 14; // 升の中の色の揺れ（これより揺れる升は背景の色に使わない）
    const TOL = 14; // 外周から塗りつぶすとき、背景とみなす色の幅（背景の色からの、どの色の差もこれ未満）
    const BAND = 3; // 境目の半透明にする幅（px。絵の側）
    const SEMI = 56; // 消すか迷う囲まれた背景の不透明度（0〜255。約 22%。薄白に残す。A16）

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

    // 透明を持つ絵か：四隅のどれかが透明（不透明さ 16 未満）か、透明な画素が 1% 以上あれば、透明な画素（不透明さ 128 未満）の割合
    // （透明が少ない絵でも「消せた絵」とみなされるよう、0.05 より小さくは返さない。A13.MIN より大きい）。そうでなければ −1
    function transparent(p, W, H) {
      const n = W * H;
      const corner = [0, W - 1, (H - 1) * W, n - 1].some((i) => p[i * 4 + 3] < 16);
      let k = 0;
      for (let i = 3; i < n * 4; i += 4) if (p[i] < 128) k++;
      return corner || k >= n * 0.01 ? Math.max(0.05, k / n) : -1;
    }

    // px：RGBA の配列（ImageData.data）を、その場で書き換える。返り値：消した（ほぼ透明にした）画素の割合（0〜1）。白い背景の絵でなければ 0（何もしない）
    // opt.bottom：下の縁からも消す（魔物は足元まで白い背景。人物は胸から下の服で切れているので、白い服を守るため下からは消さない）
    const keyOut = (p, W, H, opt = {}) => {
      const n = W * H;
      // もう透明を持つ絵（背景を除いて透明つきで置き換えた絵）は、切り抜かずにそのまま返す。返り値は透明な所の割合
      // （呼んだ側はこれで「背景を消せた絵」とみなし、cut の印を付けて足元だけを溶かす。A16）
      const clear = transparent(p, W, H);
      if (clear >= 0) return clear;
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
      // 囲まれた背景（A15・A16）：腕と体のあいだ・脚のあいだ・武器の柄と体のあいだ・髪の房のあいだなど、線画に囲まれて外周とつながらない背景も消す。
      // 背景の色に近い塊（HOLE_TOL 未満の点から、圧縮のむら HOLE_GROW 未満まで広げた所）ごとに、次で見分ける（真っ白の背景の絵でも同じ）：
      // ・中身：むらが無い（5×5 の平均で背景の色ちょうどの所が多く、陰が少ない）・色がずれていない（HOLE_TINT 未満）。生成の背景はむらの無い一色。
      //   白い服・白い毛皮・白い紋は、白くても陰や色みがある
      // ・まわり：縁がすぐ濃い線画になる（HOLE_INK より暗い色が数 px 以内）。線を越えた先がまた白くない（白い服の襟・帯の向こうはまた白い）。
      //   線の向こうが同じ塊（細く薄い線＝白い服の折り目・白い毛の筋）でない。中に閉じこめた物（白目の中の瞳）が無い
      // はっきり背景の塊（大きく・太い）は透明に（bg=1）。消すか迷う塊（小さめ・細い・条件が少し甘い）は、完全には消さず薄白の半透明に（bg=2。SEMI）。
      // 白目・歯・光の点のような小さな白（HOLE_SMALL 未満）は触らない。opt.dbg（Uint8Array）を渡すと、塊ごとの判定（1 透明・2 薄白・3 残す）を書く（確かめ用）
      if (opt.holes !== false) {
        const HOLE_TOL = 8, HOLE_GROW = 20, HOLE_SMALL = Math.max(48, Math.round(n * 0.00016)), HOLE_MIN = Math.max(150, Math.round(n * 0.0016));
        const HOLE_REACH = 4, HOLE_EDGE = 60, HOLE_PAST = 12, HOLE_INK = 120, HOLE_TINT = 1.8;
        // 外の背景の大部分に使われた背景の色だけを、囲まれた背景の色とみなす（縁の升が白い物に掛かってできた候補の色＝白い刃・白い面などは使わない）
        const used = new Float64Array(refs.length);
        let usedAll = 0;
        for (let i = 0; i < n; i++) if (bg[i]) { used[near[i]]++; usedAll++; }
        const mark = new Int32Array(n), comp = [];
        let id = 0;
        // i から step の向きに歩く。返り値：1＝HOLE_REACH 以内に線画・濃い色が無い（薄い色のまま）、2＝線を越えた先がまた白い、
        // 3＝線を越えた先が外の背景、4＝細く薄い線（折り目・毛の筋）を越えた先がまた同じ塊、0＝そのほか
        const look = (i, step) => {
          let hard = 0, dark = 765;
          for (let s = 1, j = i; s <= HOLE_PAST + 8; s++) {
            if (s > HOLE_PAST && (!hard || dark < 260)) break; // HOLE_PAST より先は、越えているのが線画でない色の帯（縞の服の縞）のときだけ見る
            const px = j % W;
            j += step;
            if (j < 0 || j >= n || (step === 1 && px === W - 1) || (step === -1 && px === 0)) break;
            if (mark[j] === id) { if (hard) return hard <= 3 && dark > 100 * 3 ? 4 : 0; continue; } // 白い服の中の折り目・白い毛の筋（細くて薄い線）
            if (dist[j] >= HOLE_EDGE) { hard++; const l = p[j * 4] + p[j * 4 + 1] + p[j * 4 + 2]; if (l < dark) dark = l; }
            else if (hard && dist[j] < HOLE_TOL) return bg[j] ? 3 : 2; // 線の向こうが外の背景（細い柄・薄い線の向こう）なら白い服の印にしない
            if (s === HOLE_REACH && !hard) return 1;
          }
          return 0;
        };
        // i から step の向きに HOLE_REACH+1 px 以内に、線画（暗い色）があるか。キノコの笠の白い斑点・模様・光は、線画なしで色に接している
        const ink = (i, step) => {
          for (let s = 1, j = i; s <= HOLE_REACH + 1; s++) {
            const px = j % W;
            j += step;
            if (j < 0 || j >= n || (step === 1 && px === W - 1) || (step === -1 && px === 0)) return false;
            if (p[j * 4] + p[j * 4 + 1] + p[j * 4 + 2] < HOLE_INK * 3) return true;
          }
          return false;
        };
        // i から step の向きに、薄い線（暗い色なし）一本だけを越えて外の背景に届くか（髪のまわりの薄い線に囲まれた背景など）
        const faint = (i, step) => {
          for (let s = 1, j = i; s <= 6; s++) {
            const px = j % W;
            j += step;
            if (j < 0 || j >= n || (step === 1 && px === W - 1) || (step === -1 && px === 0)) return false;
            if (bg[j] === 1 && dist[j] < HOLE_TOL) return s > 1;
            if (mark[j] !== id && p[j * 4] + p[j * 4 + 1] + p[j * 4 + 2] < 170 * 3) return false;
          }
          return false;
        };
        // その高さの外の背景の色（上下で色の変わる背景がある。前後 8 行の外の背景の平均）。中身のむらは、この色からの差で見る
        const rs = new Float64Array(H * 4);
        for (let i = 0; i < n; i++) if (bg[i] && dist[i] < 6) { const y = (i / W) | 0; rs[y * 4] += p[i * 4]; rs[y * 4 + 1] += p[i * 4 + 1]; rs[y * 4 + 2] += p[i * 4 + 2]; rs[y * 4 + 3]++; }
        const rowRef = new Float64Array(H * 3);
        for (let y = 0; y < H; y++) {
          let r = 0, g = 0, b = 0, k = 0;
          for (let t = Math.max(0, y - 8); t <= Math.min(H - 1, y + 8); t++) { r += rs[t * 4]; g += rs[t * 4 + 1]; b += rs[t * 4 + 2]; k += rs[t * 4 + 3]; }
          const R0 = refs[0];
          rowRef[y * 3] = k ? r / k : R0[0]; rowRef[y * 3 + 1] = k ? g / k : R0[1]; rowRef[y * 3 + 2] = k ? b / k : R0[2];
        }
        // 背景の色との差（明るさ。符号つき）を 5×5 で平均して見る。圧縮の細かい点は打ち消しあい、服の陰・刃の光のような広い差は残る
        const sat = new Float64Array((W + 1) * (H + 1));
        for (let y = 0; y < H; y++) {
          const r0 = rowRef[y * 3] + rowRef[y * 3 + 1] + rowRef[y * 3 + 2];
          for (let x = 0, row = 0; x < W; x++) { const i = (y * W + x) * 4; row += (p[i] + p[i + 1] + p[i + 2] - r0) / 3; sat[(y + 1) * (W + 1) + x + 1] = sat[y * (W + 1) + x + 1] + row; }
        }
        const box5 = (x, y) => Math.abs(sat[(y + 3) * (W + 1) + x + 3] - sat[(y - 2) * (W + 1) + x + 3] - sat[(y + 3) * (W + 1) + x - 2] + sat[(y - 2) * (W + 1) + x - 2]) / 25;
        const inside = (i, x) => { // 縁から 2px より内側か
          for (let r = 1; r <= 2; r++) {
            if (x - r < 0 || x + r >= W || i - r * W < 0 || i + r * W >= n) return false;
            if (mark[i - r] !== id || mark[i + r] !== id || mark[i - r * W] !== id || mark[i + r * W] !== id) return false;
          }
          return true;
        };
        for (let s0 = 0; s0 < n; s0++) {
          if (bg[s0] || mark[s0] || dist[s0] >= HOLE_TOL) continue;
          id++;
          comp.length = 0;
          let qh = 0, edge = false;
          mark[s0] = id; comp.push(s0);
          while (qh < comp.length) {
            const i = comp[qh++], x = i % W;
            if (x === 0 || x === W - 1 || i < W || i >= n - W) edge = true;
            const go = (j) => { if (!bg[j] && !mark[j] && dist[j] < HOLE_GROW) { mark[j] = id; comp.push(j); } };
            if (x > 0) go(i - 1);
            if (x < W - 1) go(i + 1);
            if (i >= W) go(i - W);
            if (i < n - W) go(i + W);
          }
          if (comp.length < HOLE_SMALL) continue;
          if (refs.length > 1) { const cnt = new Float64Array(refs.length); for (const i of comp) cnt[near[i]]++; let r = 0; for (let k = 1; k < refs.length; k++) if (cnt[k] > cnt[r]) r = k; if (used[r] < usedAll * 0.2) continue; }
          // 中身のむら
          let inn = 0, exact = 0, shade = 0, all = 0, allExact = 0;
          const off = [0, 0, 0], offIn = [0, 0, 0]; // 背景の色との差の平均（色ごと。符号つき）
          for (const i of comp) {
            const x = i % W, y = (i - x) / W;
            all++; if (dist[i] <= 3) allExact++;
            for (let c = 0; c < 3; c++) off[c] += p[i * 4 + c] - rowRef[y * 3 + c];
            if (!inside(i, x)) continue;
            for (let c = 0; c < 3; c++) offIn[c] += p[i * 4 + c] - rowRef[y * 3 + c];
            const d = box5(x, (i - x) / W);
            inn++; if (d <= 1.5) exact++; else if (d >= 4) shade++;
          }
          // 細い塊（髪の房のあいだなど）は内側がほとんど無い（5×5 の平均にまわりの髪が混ざる）ので、塊ぜんぶを 1 画素ずつ見る
          const thin = inn < 24 || inn < all * 0.3;
          const flat = thin ? allExact / all : exact / inn, sh = thin ? 0 : shade / inn;
          // 色ずれ：塊の平均の色が背景の色から HOLE_TINT 以上ずれていれば、背景ではない（少し明るい白い襟・青みの白い紋など）
          const tint = Math.max(...(thin ? off.map((v) => Math.abs(v) / all) : offIn.map((v) => Math.abs(v) / inn)));
          if (flat < 0.3 || sh > 0.3 || tint >= HOLE_TINT) { if (opt.dbg) for (const i of comp) opt.dbg[i] = 3; continue; }
          // まわり
          let rim = 0, soft = 0, white = 0, inked = 0, thinOut = 0, self = 0;
          for (const i of comp) {
            const x = i % W;
            for (const st of [-1, 1, -W, W]) {
              const j = i + st;
              if (j < 0 || j >= n || (st === -1 && x === 0) || (st === 1 && x === W - 1) || mark[j] === id) continue;
              rim++;
              const r = look(i, st);
              if (r === 1) soft++; else if (r === 2) white++; else if (r === 4) self++;
              if (ink(i, st)) inked++;
              if (faint(i, st)) thinOut++;
            }
          }
          // 中に閉じこめた物（白目の中の瞳など）：塊の外接矩形の縁から、塊でない所づたいに届かない所の広さ
          let x0 = W, x1 = 0, y0 = H, y1 = 0;
          for (const i of comp) { const x = i % W, y = (i - x) / W; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          const bw = x1 - x0 + 1, bh = y1 - y0 + 1, seen = new Uint8Array(bw * bh), bq = [];
          const reach = (x, y) => { const k = (y - y0) * bw + x - x0; if (!seen[k] && mark[y * W + x] !== id) { seen[k] = 1; bq.push(k); } };
          for (let x = x0; x <= x1; x++) { reach(x, y0); reach(x, y1); }
          for (let y = y0; y <= y1; y++) { reach(x0, y); reach(x1, y); }
          for (let h = 0; h < bq.length; h++) {
            const k = bq[h], x = (k % bw) + x0, y = ((k / bw) | 0) + y0;
            if (x > x0) reach(x - 1, y); if (x < x1) reach(x + 1, y); if (y > y0) reach(x, y - 1); if (y < y1) reach(x, y + 1);
          }
          const isl = (bw * bh - bq.length - comp.length) / comp.length;
          const so = rim ? soft / rim : 1, wh = rim ? white / rim : 1, li = rim ? inked / rim : 0, fa = rim ? thinOut / rim : 0, sf = rim ? self / rim : 0, k = edge ? 0.5 : 1;
          const big = comp.length >= HOLE_MIN, th = comp.length / (rim || 1); // th：太さの目安（広さ÷縁の長さ）
          // はっきり背景：大きく、太く、縁のほとんどがすぐ線画になり、線の向こうがほとんど白くなく、中がむらの無い背景の色
          const sure = big && th >= 4 && isl < 0.03 && sf < 0.09 && li >= 0.3 && flat >= 0.6 && sh <= 0.08 && so < 0.05 * k && wh < 0.05 * k;
          // 迷う：小さめ（指のあいだ）・細い（髪の房のあいだ。まわりがはっきり線画）でも縁の条件を満たす。
          // または、ほぼ完全に背景の色ちょうどで、薄い線一本で外の背景とへだてられた所（髪のまわりの薄い線の内側など）
          const maybe = isl < 0.03 && sf < 0.09 && ((li >= (th < 4 ? 0.6 : 0.3) && flat >= 0.6 && sh <= 0.1 && so < (th < 4 ? 0.03 : 0.08) * k && wh < 0.08 * k) ||
            (li >= 0.3 && fa >= 0.3 && flat >= 0.65 && sh <= 0.05 && so < 0.35 && wh < 0.2) ||
            // 髪の房のあいだ：細く、まわりがほとんど濃い線（髪）。線の向こうが別の房のあいだ（白）でもよい
            (th < 3.5 && li >= 0.8 && flat >= 0.6 && so < 0.03 && wh < 0.4));
          const v = sure ? 1 : maybe ? 2 : 0;
          if (opt.dbg) for (const i of comp) opt.dbg[i] = v || 3;
          if (v) for (const i of comp) bg[i] = v;
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
        // 迷う塊（bg=2）は薄白の半透明（SEMI）に残す：背景の色で、透け具合は SEMI より透けない
        if (bg[i] === 2 && p[i * 4 + 3] < SEMI) { const B = refs[near[i]]; p[i * 4] = B[0]; p[i * 4 + 1] = B[1]; p[i * 4 + 2] = B[2]; p[i * 4 + 3] = SEMI; }
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
