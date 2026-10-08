// U28：行動 → 記録 → 結果 → 得たもの → 選択肢、の順に見せる。持ち主の声「街へ行く選択肢を押すと、急に到着して、着いたあとにログが出る。
// 街に行くボタンを押す → ログ表示 → 街へ着いたログ表示 → 街での選択メニュー表示、みたいな感じにして。ログとメニューが一体になっているから、どの状態なのかが分かりにくい」
//   ① 選んだ行動の一行（「▶ 〇〇へ向かう」） ② その行動の記録（道中・出来事・判定） ③ 結果（「〇〇」の見出し＝着いた） ④ 得たもの（U27 の枠） ⑤ 新しい選択肢
//   ・②〜④は一行（段落）ずつ、少し間を置いて出す。出しきるまで選択肢は薄く、押せない
//   ・背景の絵・場所の名前（上の帯・看板）・場面の色・BGM・町の見出しは、③の見出しが出たときに切り替える（押した瞬間には変えない）。見出しが無ければ最後に
//   ・記録や絵を押す・Enter・Space・数字のキーで早送り（全部出す）。設定「本文を少しずつ出す」を切れば、今までどおり一度に
//   ・戦闘の手番・戦闘が始まる手番は何もしない（戦闘の流れは F1 の u13_battle が出す）
//   ・選択肢の頭に「どうする？」と今いる所・今の状態（町・荒野・迷宮・旅の途中・出来事・会話）の見出しを置き、記録と選択肢を見た目で分ける
// エンジンは触らない（記録は今までどおり一度に積まれ、画面だけが順に見せる）。ui.js・v1_stage・sound_bgm・u14 は書き換えず、
// G.ui.render・G.paintScene・G.sound.bgmUpdate を包む（名前の zzzzzz で u26 より後、とどめの見せ方（F5 の zzzzzzz_f5_finish）より前）。見た目は ui/zzzzzz_u28_beats.css。レーン U（U28）
(function (G) {
  const U = (G.u28 = G.u28 || {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  U.BASE = 380; // 一行ごとの間（ミリ秒）
  U.PER_CHAR = 14; // 字数に応じて足す間
  U.MAX = 1500; // 一行の間の上限
  U.GAIN = 260; // 得たものの枠の前の間
  U.TOTAL = 5200; // 全部を出しきるまでの長さの上限（これを超えるときは間を詰める）
  U.MIN = 160; // 詰めたときの一行の間の下限
  // 出す順と間。rows は新しく出た行 [{ kind: "you"|"title"|"gain"|"line", len }]。返すのは [{ at: その行を出すまでの待ち（前の行から）}] と、場面を切り替える行の番号
  U.plan = (rows) => {
    rows = rows || [];
    const steps = rows.map((r, i) => {
      if (i === 0 && r.kind === "you") return { at: 0 };
      if (r.kind === "gain") return { at: U.GAIN };
      const prev = rows[i - 1];
      const read = prev && prev.kind !== "you" ? Math.min(U.MAX, U.BASE + U.PER_CHAR * (prev.len || 0)) : U.BASE;
      return { at: read };
    });
    // 行が多いときは、全体が U.TOTAL に収まるように間を詰める（一行の間は U.MIN まで）
    const sum = steps.reduce((a, x) => a + x.at, 0);
    if (sum > U.TOTAL) { const k = U.TOTAL / sum; steps.forEach((x, i) => { if (i) x.at = Math.max(U.MIN, Math.round(x.at * k)); }); }
    let arrive = rows.findIndex((r) => r.kind === "title");
    if (arrive < 0) arrive = rows.findIndex((r) => r.kind === "gain");
    if (arrive < 0) arrive = rows.length; // 最後まで出したら
    return { steps, arrive };
  };
  // 今の状態の名前（選択肢の見出し）
  U.stateOf = (S) => {
    if (!S) return "";
    if (S.over) return "冒険の終わり";
    if (S.combat) return "戦闘";
    if (S.travel) return "旅の途中";
    if (S.tk && S.tk.cur) return "会話";
    if (S.mode === "event") return "出来事";
    const L = ((G.data || {}).LOCS || {})[S.loc] || {};
    if (S.mode === "fac") return "施設";
    return L.type === "town" ? "町" : L.type === "dungeon" ? (S.depth > 0 ? `迷宮・地下${S.depth}階` : "迷宮") : "荒野";
  };
  U.placeOf = (S) => {
    if (!S) return "";
    const L = ((G.data || {}).LOCS || {})[S.loc] || {};
    const fac = S.mode === "fac" && S.fac && G.FAC_NAMES ? G.FAC_NAMES[S.fac] : "";
    const to = S.travel && G.data && G.data.LOCS && G.data.LOCS[S.travel] ? `${G.data.LOCS[S.travel].name}へ` : "";
    return to || [L.name, fac].filter(Boolean).join("・");
  };

  if (typeof document === "undefined" || typeof window === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const body = document.body;
  const calm = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- 設定：本文を少しずつ出す
  const KEY = "morsveld-u28-beats";
  U.on = true;
  try { U.on = localStorage.getItem(KEY) !== "0"; } catch {}
  if (typeof ui.addSetting === "function") {
    try {
      ui.addSetting({ id: "u28beats", section: "遊び", label: "本文を少しずつ出す", hint: "行動のあと、本文を一行ずつ出してから選択肢を出す。切ると一度に全部出る（押せば、いつでも早送りできる）",
        get: () => U.on, set: (v) => { U.on = !!v; try { localStorage.setItem(KEY, v ? "1" : "0"); } catch {} } });
    } catch {}
  }

  // ---------------------------------------------------------------- 押したこと（選択肢を押したときだけ、順に見せる）
  let acted = false;
  document.addEventListener("click", (ev) => {
    if (run) return; // 出している途中の押しは早送り（下）
    const b = ev.target && ev.target.closest && ev.target.closest("#panel button.act, #panel .u13whoOpt");
    if (b && !b.disabled) acted = true;
  }, true);
  // 数字のキーで選んだときも（v9_pc.js が選択肢を click する。その前に印を付ける）
  document.addEventListener("keydown", (ev) => { if (/^[0-9]$/.test(ev.key) && !run) acted = true; }, true);

  // ---------------------------------------------------------------- 場面の切り替えを待たせる（背景・場所の名前・場面の色・BGM・町の見出し）
  let hold = null; // { scene: [canvas, opt] | null, bgm: bool, labels: Map(el → 新しい中身), u14: 新しい data-u14 }
  const paint0 = G.paintScene;
  if (paint0) G.paintScene = (canvas, opt) => {
    if (hold && canvas && canvas.id === "scene") { hold.scene = [canvas, opt]; return; }
    return paint0(canvas, opt);
  };
  const snd = G.sound || {};
  if (typeof snd.bgmUpdate === "function") {
    const bgm0 = snd.bgmUpdate;
    snd.bgmUpdate = (...a) => { if (hold) { hold.bgm = true; return; } return bgm0(...a); };
  }
  // 場所の名前（上の帯・本文の看板・絵の下の名前）：押す前の形の写しを置き、新しい方（ほかのファイルが中を書き換える本物）は隠しておく
  //   本物の中身を入れ替えると、書き換えるファイル（v9・u14）が持っている子の参照が外れるので、本物には触らない
  const LABELS = ["#v9place", "#u14sign", "#sceneTitle", "#sceneDate"];
  const grab = () => LABELS.map((s) => $(s)).filter(Boolean).map((el) => ({ el, copy: el.cloneNode(true) }));
  function release() {
    const H = hold;
    if (!H) return;
    hold = null;
    body.classList.remove("u28hold");
    (H.copies || []).forEach((c) => { c.remove(); });
    document.querySelectorAll(".u28real").forEach((el) => { el.classList.remove("u28real"); if (el.dataset.u28id) { el.id = el.dataset.u28id; delete el.dataset.u28id; } });
    if (H.u14 !== undefined) { if (H.u14) body.dataset.u14 = H.u14; else delete body.dataset.u14; }
    if (H.scene && paint0) { try { paint0(H.scene[0], H.scene[1]); } catch {} }
    if (H.bgm && snd.bgmUpdate) { try { snd.bgmUpdate(); } catch {} }
  }
  U.release = release;
  // HP・MP・所持金の札（#mbar）：本文を出している間は押す前の値のまま。得たものの枠が出たとき（無ければ出しきったとき）に今の値へ
  //   中の要素は id で見た目が決まっているので写しは置かず、押す前の中身をいったん戻しておき、そのときに描いた中身へ差し替える
  const barOf = () => { const b = $("#mbar"); return b ? { html: b.innerHTML, cls: b.className } : null; };
  let barNow = null;
  function releaseBar() {
    const B = barNow, b = $("#mbar");
    barNow = null;
    if (B && b) { b.innerHTML = B.html; b.className = B.cls; }
  }
  U.releaseBar = releaseBar;

  // ---------------------------------------------------------------- 順に見せる
  let run = null; // { rows: [el], i, timer, steps, arrive }
  const kindOf = (el) => el.classList.contains("l-you") ? "you" : el.classList.contains("l-gain") ? "gain" : (el.classList.contains("l-title") || el.classList.contains("u14place")) ? "title" : "line";
  function stepTo(i) {
    const R = run;
    if (!R) return;
    for (let k = R.i; k <= i && k < R.rows.length; k++) {
      R.rows[k].classList.remove("u28wait");
      R.rows[k].classList.add("u28show");
      if (k >= R.arrive) release();
      if (kindOf(R.rows[k]) === "gain") releaseBar();
    }
    R.i = Math.max(R.i, i + 1);
    if (R.i >= R.rows.length) { finish(); return; }
    // 新しく出した行が見えるように（本文の欄の中だけ動かす）
    const last = R.rows[R.i - 1];
    const log = $("#log");
    if (last && log && last.offsetTop + last.offsetHeight > log.scrollTop + log.clientHeight) log.scrollTop = last.offsetTop - log.offsetTop - 8;
    R.timer = setTimeout(() => stepTo(R.i), R.steps[R.i].at);
  }
  function finish() {
    const R = run;
    if (R) { clearTimeout(R.timer); R.rows.forEach((el) => { el.classList.remove("u28wait"); el.classList.add("u28show"); }); }
    run = null;
    release();
    releaseBar();
    body.classList.remove("u28busy");
  }
  U.skip = () => { if (run) finish(); };
  U.busy = () => !!run;

  function start(S, before) {
    const log = $("#log");
    if (!log) return;
    const rows = Array.from(log.children).filter((el) => el.classList.contains("new") && !el.classList.contains("u19gone") && !el.classList.contains("v9old") && !el.classList.contains("u14later"));
    if (rows.length < 2) { release(); return; }
    const p = U.plan(rows.map((el) => ({ kind: kindOf(el), len: (el.textContent || "").length })));
    rows.forEach((el, i) => { if (i > 0) { el.classList.add("u28wait"); el.classList.remove("u28show"); } });
    run = { rows, i: 1, steps: p.steps, arrive: p.arrive, timer: 0 };
    const bar = $("#mbar");
    if (before && before.bar && bar && (bar.innerHTML !== before.bar.html || bar.className !== before.bar.cls)) {
      barNow = { html: bar.innerHTML, cls: bar.className };
      bar.innerHTML = before.bar.html; bar.className = before.bar.cls;
    }
    body.classList.add("u28busy");
    if (p.arrive >= 1) {
      // 場面の切り替えを待たせる：前の名前（写し）と色を出し、新しい方は隠しておく
      if (before && before.labels) {
        hold.copies = [];
        before.labels.forEach(({ el, copy }) => {
          if (!el.isConnected) return;
          // 写しが id を持つ（見た目は id で決まっている）。本物の id は待つ間だけ外す（放すときに戻す）
          copy.classList.add("u28copy");
          el.dataset.u28id = el.id;
          el.removeAttribute("id");
          el.before(copy);
          el.classList.add("u28real");
          hold.copies.push(copy);
        });
        hold.u14 = body.dataset.u14 || "";
        if (before.u14) body.dataset.u14 = before.u14; else delete body.dataset.u14;
        body.classList.add("u28hold");
      }
    } else release();
    run.timer = setTimeout(() => stepTo(1), p.steps[1] ? p.steps[1].at : U.BASE);
  }

  const render0 = ui.render;
  ui.render = (...a) => {
    const S = G.S;
    const doBeat = acted && U.on && !calm() && S && !S.combat && !run;
    acted = false;
    if (run) finish(); // 前の分が出しきれていなければ、先に全部出す
    let before = null;
    if (doBeat) {
      before = { labels: grab(), u14: body.dataset.u14 || "", bar: barOf() };
      hold = { scene: null, bgm: false, copies: null };
    }
    let r;
    try { r = render0(...a); } catch (e) { release(); throw e; }
    try {
      const S2 = G.S;
      paintHead(S2);
      // 戦闘が始まった・終わりになった・結果の場面（F1）を出しているときは、待たせない
      if (doBeat && S2 && !S2.combat && !(G.u13 && G.u13.holding && G.u13.holding())) start(S2, before);
      else release();
    } catch (e) { release(); }
    return r;
  };

  // 早送り：記録・絵・本文の欄を押す、Enter・Space・数字のキー
  document.addEventListener("click", (ev) => {
    if (!run) return;
    const t = ev.target;
    if (t && t.closest && t.closest("dialog, .top")) return;
    ev.preventDefault();
    ev.stopPropagation();
    finish();
  }, true);
  document.addEventListener("keydown", (ev) => {
    if (!run || ev.altKey || ev.ctrlKey || ev.metaKey || document.querySelector("dialog[open]")) return;
    if (ev.key === "Enter" || ev.key === " " || /^[0-9]$/.test(ev.key) || ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); finish(); }
  }, true);

  // ---------------------------------------------------------------- 選択肢の見出し：「どうする？」・今いる所・今の状態
  function paintHead(S) {
    const panel = $("#panel");
    if (!panel || !S) return;
    panel.querySelectorAll(":scope > .u28head").forEach((x) => x.remove());
    if (S.over) return;
    const head = h("div", "u28head");
    head.dataset.state = U.stateOf(S);
    head.append(h("span", "u28q", "どうする？"), h("b", "u28place", U.placeOf(S)), h("span", "u28state", U.stateOf(S)));
    panel.prepend(head);
  }
})(globalThis.G = globalThis.G || {});
