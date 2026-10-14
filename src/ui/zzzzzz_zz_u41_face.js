// U41：ADV の「顔の窓」（持ち主の声「全身の立ち絵で表情差分つくるとぼろが出るなら、advみたいに小さい四角い枠にだけ表情差分だしてもいいよ」）。
// 表情違いの絵は、体・服・持ち物・前髪の先が表情ごとに崩れていることが多い。そこで：
//   ・全身の立ち絵は、いつも基本の絵（V8 の G.v8WithMood を包み、表情を付けない）。設定「全身の立ち絵でも表情を変える」（G.P.u41full。セーブの外。既定は切）を選べば今までどおり
//   ・表情の付いた場面（G.moodOf(S) がある＝出来事・会話・仲間の話など、今まで表情違いの立ち絵を出していた所）では、本文の窓の上（PC・スマホの縦）／左（スマホの横）に
//     小さい四角い「顔の窓」（#u41face）を出し、その表情の絵から G.data.FACE_BOX[id]（src/data/u41_face_box.js。[左, 上, 幅, 高さ] の割合）の四角だけを
//     CSS の background-size・background-position で切り出して見せる（画像は増やさない）。表情の絵が無ければ（落とし先も無ければ）基本の絵の同じ四角
//   ・顔の窓の横（下）に名前の札を並べる。そのあいだ、話している人の立ち絵の名札（.v9name）は隠す（同じ名前を二つ出さない）
//   ・FACE_BOX の無い人（型の絵の人・魔物）と主人公には出さない。戦闘中も出さない（G.moodOf が null）
// 置き場所は本文の窓（.tome）の実際の位置から決める（PC の四つの窓 U21・スマホの U31 のどちらでも、本文の窓とコマンドの窓に重ねない）。見た目は zzzzzzzzzz_u41_face.css。
// ほかのファイルは書き換えず、G.v8WithMood と G.ui.render を包むだけ。レーン U（U41）
(function (G) {
  const u41 = (G.u41 = G.u41 || {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  // 全身の立ち絵でも表情を変えるか（古い記録・記録なしでは切）
  u41.full = (P) => !!(P && P.u41full);
  // 顔の四角（無い・形の悪い値は null）
  u41.box = (id) => {
    const b = id && G.data && G.data.FACE_BOX ? G.data.FACE_BOX[id] : null;
    if (!Array.isArray(b) || b.length !== 4 || !b.every((v) => typeof v === "number" && v >= 0 && v <= 1)) return null;
    return b[2] > 0 && b[3] > 0 && b[0] + b[2] <= 1.0001 && b[1] + b[3] <= 1.0001 ? b : null;
  };
  // 表情を付けない who（表情があれば写しから外す）
  const plain = (who) => (who && who.mood ? Object.assign({}, who, { mood: undefined }) : who);
  // 顔の窓に出すもの（出さないなら null）。{ id：基本の絵の鍵（FACE_BOX の鍵）, key：表情の絵の鍵（無ければ基本）, mood, box }
  u41.faceOf = (who, S) => {
    if (!who || who.kind === "hero" || who.kind === "foe" || !G.v4PortraitKey) return null;
    const mood = G.moodOf ? G.moodOf(S) : null;
    if (!mood) return null;
    const id = G.v4PortraitKey(plain(who));
    const box = u41.box(id);
    if (!box) return null;
    const key = G.v8MoodKey ? G.v8MoodKey(id, mood) || id : id;
    return { id, key, mood, box };
  };
  // 切り出し方（CSS の background-size・background-position の px）。size：顔の窓の一辺、nat：絵のファイルの大きさ [幅, 高さ]、
  // rect：ファイルの中のその絵の升目 [x, y, 幅, 高さ]（スプライトでなければ null＝全体）。顔の四角が窓いっぱいに入るよう、四角の真ん中を窓の真ん中に
  u41.crop = (size, nat, rect, box) => {
    const [nw, nh] = nat;
    const [cx, cy, cw, ch] = rect || [0, 0, nw, nh];
    const bx = cx + box[0] * cw, by = cy + box[1] * ch, bw = box[2] * cw, bh = box[3] * ch;
    const k = Math.max(size / bw, size / bh);
    return { w: nw * k, h: nh * k, x: (size - bw * k) / 2 - bx * k, y: (size - bh * k) / 2 - by * k };
  };

  // 全身の立ち絵は表情を付けない（設定で全身も変えるときは V8 のまま）。V8 の顔の入れ替え（sync）もこれを通るので、立ち絵は入れ替わらない
  const with0 = G.v8WithMood;
  if (with0) G.v8WithMood = (who, S) => (u41.full(G.P) ? with0(who, S) : plain(who));

  // ---------------------------------------------------------------- 画面
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const ui = G.ui;
  if (!ui || !ui.render) return;
  const body = document.body;

  let el = null, pic = null, plate = null;
  function make() {
    el = document.createElement("div");
    el.id = "u41face";
    el.setAttribute("aria-hidden", "true");
    pic = document.createElement("div");
    pic.className = "u41img";
    plate = document.createElement("div");
    plate.className = "u41name";
    el.append(pic, plate);
    body.append(el);
  }
  const vis = (x) => { if (!x) return null; const cs = getComputedStyle(x); if (cs.display === "none" || cs.visibility === "hidden") return null; const r = x.getBoundingClientRect(); return r.width && r.height ? r : null; };
  // 顔の窓の大きさと置き場所（本文の窓の上。スマホの横長は本文の窓の左で、名前の札は顔のさらに左）
  function place() {
    const tome = vis(document.querySelector(".tome"));
    if (!tome) return false;
    const vw = window.innerWidth, vh = window.innerHeight;
    const mobile = body.classList.contains("u31m");
    const wide = mobile && vw > vh;
    let size, x, y;
    if (wide) {
      size = Math.round(Math.max(64, Math.min(96, vh * 0.22)));
      x = tome.left - 8 - size; y = tome.top;
      // 初回の案内（.tip）が上に出ていれば、その下へ（案内のボタンを隠さない）
      document.querySelectorAll(".tip").forEach((t) => { const r = vis(t); if (r && r.right > x && r.left < x + size && r.bottom > y && r.top < y + size) y = r.bottom + 6; });
    } else {
      size = Math.round(mobile ? Math.max(72, Math.min(104, vw * 0.24)) : Math.max(104, Math.min(156, vh * 0.17)));
      // 本文の窓の見出しの札（窓の上へ 20px ほどはみ出す）より上に置く
      x = tome.left + (mobile ? 4 : 6); y = tome.top - (mobile ? 26 : 30) - size;
    }
    if (x < 2 || y < 2) return false;
    el.classList.toggle("wide", wide);
    el.style.setProperty("--u41s", size + "px");
    el.style.left = Math.round(x) + "px";
    el.style.top = Math.round(y) + "px";
    return size;
  }
  let want = ""; // 今出すはずの絵の鍵（読み込みを待つ間に人・表情が変わったら、古い絵は出さない）
  function paint(face, size) {
    const w = G.v4Where(face.key);
    const img = G.v4Image(face.key);
    if (!w || !img) return false;
    if (img.v4bad) {
      if (face.key === face.id) return false;
      return paint(Object.assign({}, face, { key: face.id }), size); // 表情の絵が読めなければ基本の絵の同じ四角
    }
    const nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    if (!(img.complete && nw && nh)) {
      const k = face.key;
      const go = () => { if (want === k) sync(); };
      img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
      return el.dataset.key ? true : false; // 前の顔は読み終わるまで残す
    }
    const c = u41.crop(size, [nw, nh], w.rect, face.box);
    const url = 'url("' + String(w.src).replace(/"/g, "%22") + '")';
    if (pic.dataset.src !== w.src) { pic.style.backgroundImage = url; pic.dataset.src = w.src; }
    pic.style.backgroundSize = `${c.w.toFixed(1)}px ${c.h.toFixed(1)}px`;
    pic.style.backgroundPosition = `${c.x.toFixed(1)}px ${c.y.toFixed(1)}px`;
    el.dataset.key = face.key;
    return true;
  }
  function hide() {
    want = "";
    if (el) { el.classList.remove("on"); delete el.dataset.key; }
    body.classList.remove("u41on");
  }
  function sync() {
    const S = G.S, st = G.stand;
    if (!S || !st || !st.whoOf || S.over) return hide();
    const who = st.whoOf(S);
    const face = u41.faceOf(who, S);
    if (!face || !G.v4Where || !G.v4Image) return hide();
    if (!el) make();
    const size = place();
    if (!size) return hide();
    want = face.key;
    if (!paint(face, size)) return hide();
    const tag = G.whoTag ? G.whoTag(who, S) : null;
    if (tag && G.c3Plate) G.c3Plate(plate, tag);
    else plate.textContent = st.nameOf ? st.nameOf(who) : who.name || "";
    el.dataset.mood = face.mood;
    el.classList.add("on");
    body.classList.add("u41on");
  }
  u41.sync = sync;
  const base = ui.render;
  ui.render = (...a) => { const r = base(...a); try { sync(); } catch (e) { hide(); } return r; };
  let rz = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { try { sync(); } catch (e) { hide(); } }); });

  // 設定の窓（画面）：全身の立ち絵でも表情を変えるか
  function registerSetting() {
    if (typeof ui.addSetting !== "function") return false;
    try {
      ui.addSetting({
        id: "u41full", section: "画面", label: "全身の立ち絵でも表情を変える", kind: "toggle",
        get: () => u41.full(G.P),
        set: (v) => { if (!G.P) return; G.P.u41full = !!v; if (G.main && G.main.saveProfile) G.main.saveProfile(); if (G.v8 && G.v8.sync) { try { G.v8.sync(); } catch (e) { /* 入れ替えに失敗しても止めない */ } } ui.render(); },
        hint: "切のときは、表情は本文の窓のそばの小さな顔の窓にだけ出し、全身の立ち絵はいつも基本の絵にする（次の場面から）",
      });
    } catch {}
    return true;
  }
  if (!registerSetting()) setTimeout(registerSetting, 0);
})(globalThis.G = globalThis.G || {});
