// U31：スマホの画面（持ち主「スマホ版の UI も改善してほしい。ログが画面を覆っていて立ち絵も見えないし、操作が大変」）
// PC の配置（V9 の舞台・U21／U29 の四つの窓）の考え方を、縦長・横長のスマホに合わせて作り直す。PC の大きさ（v9.isPC）のときは何もしない
//   ・上の細い帯：今の状態を一行（いる所・日付・HP と MP・所持金）。右端の「メニュー」一つで、図鑑・地図・依頼・ステータス・ログ・トロフィー・システム・設定が開く
//   ・その下（縦長は画面の上半分ほど・横長は左半分）：背景と立ち絵・魔物だけの舞台。話している人は本文に隠れず、戦闘の魔物は全身が見える
//   ・ログ（本文の欄）：舞台の下に短く（最新の数行）。押すと全文が開き、「閉じる」で戻る。行動 → ログ → 結果 → メニューの順（U28）はそのまま
//   ・コマンド（#panel）：いちばん下。組の札を横に並べ、開いた組の中身だけがその下で流れる。押す所は高さ 44px 以上。戦闘は「攻撃」「防御」（F9 の札）を大きく、ほかの見出しはその下
//   ・知らせ（トロフィー・図鑑・用語集）は上の帯に重ねて短く出す（立ち絵・コマンドに重ねない）
// 配置の形は U21 と同じ（tome・side・cast・stage）なので、V9・U21 の描き方（立ち絵・魔物・窓）をそのまま使う。見た目は ui/zzzzzzzz_u31_mobile.css（ほかの PC 向けの CSS より後に足す）。
// 名前の zzzzz_u31 で、u21（zzzzz_u21_side.js）より後に読み、u21.layout・u21.placeCast を包む。エンジンは読むだけ。レーン U（U31）
(function (G) {
  const u31 = (G.u31 = G.u31 || {});
  const v9 = G.v9, u21 = G.u21;
  if (!v9 || !u21 || !u21.layout) return;

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  u31.HEAD = 48; // 上の細い帯の高さ（縦長）。メニューのボタン（44px）が入る高さ
  u31.HEAD_LAND = 48; // 横長
  u31.STAGE = 0.47; // 縦長：舞台の下端（画面の高さに対して）。上の帯の下〜ここまでが絵だけの場所
  u31.STAGE_COMBAT = 0.44; // 戦闘は手の欄を少し広く
  u31.LOG = 0.15; // 縦長：ログの窓の高さ（画面の高さに対して。最新の 3〜4 行）
  u31.LOG_MIN = 92;
  u31.LOG_MAX = 150;
  u31.GAP = 6;
  u31.SIGN = 26; // ログの窓の上の縁に掛かる場所の札（U14）の分。上の帯に潜らないように空ける
  u31.FOES = 58; // 戦闘：舞台の上に並ぶ敵の札の高さ（魔物はその下に全身）
  // スマホの形にするか：PC の大きさでなければ（縦長・横長とも）
  u31.isMobile = (vw, vh) => !v9.isPC(vw, vh) && (vw || 0) >= 300 && (vh || 0) >= 300;
  v9.mobileOn = (vw, vh) => u31.isMobile(vw, vh);
  // 配置（U21 と同じ形）。m は縁の余白、land は横長
  u31.layout = (vw, vh, combat) => {
    vw = Math.max(300, Math.round(vw || 0));
    vh = Math.max(300, Math.round(vh || 0));
    const land = vw > vh;
    const m = 6;
    const fs = 15;
    const head = land ? u31.HEAD_LAND : u31.HEAD;
    let tome, side, cast, stage;
    if (!land) {
      const sb = Math.round(vh * (combat ? u31.STAGE_COMBAT : u31.STAGE));
      const lh = Math.round(Math.max(u31.LOG_MIN, Math.min(u31.LOG_MAX, vh * u31.LOG)));
      tome = { x: m, y: sb, w: vw - m * 2, h: lh, min: lh };
      const sy = tome.y + tome.h + u31.GAP;
      side = { x: m, y: sy, w: vw - m * 2, h: vh - m - sy };
      cast = { x: 0, y: head, w: vw, h: sb - head };
      stage = combat ? { x: 0, y: head + u31.FOES, w: vw, h: sb - head - u31.FOES } : null;
    } else {
      // 横長：左を舞台、右にログ（上・短く）とコマンド（下）
      const cw = Math.round(vw * 0.46);
      const rx = cw + m;
      const rw = vw - m - rx;
      const lh = Math.round(Math.max(64, Math.min(110, (vh - head) * 0.25)));
      tome = { x: rx, y: head + u31.SIGN, w: rw, h: lh, min: lh };
      const sy = tome.y + tome.h + u31.GAP;
      side = { x: rx, y: sy, w: rw, h: vh - m - sy };
      cast = { x: 0, y: head, w: cw, h: vh - head };
      stage = combat ? { x: 0, y: head + u31.FOES, w: cw, h: vh - head - u31.FOES - m } : null;
    }
    // 全文を開いたときのログの窓：上の帯の下から、コマンドの窓の上まで
    const open = { x: tome.x, y: head + u31.SIGN, w: tome.w, h: Math.max(tome.h, (land ? vh - m : side.y - u31.GAP) - (head + u31.SIGN)) };
    const chars = Math.max(14, Math.floor((tome.w - 28) / fs));
    return { vw, vh, head, m, fs, chars, tome, side, cast, stage, open, stand: { x0: cast.x, x1: cast.x + cast.w }, combat: !!combat, side21: true, mobile: true, land };
  };
  // 立ち絵：話している人を舞台の真ん中に、足元までログの窓の上に収める（本文に隠れない）。仲間は後ろに小さく暗く。戦闘では出さない（魔物を見せる）
  u31.placeCast = (L, list) => {
    const C = L.cast, n = (list || []).length;
    if (!n || C.w <= 0 || L.combat) return [];
    const H = Math.round(Math.min(C.h * 0.98, (C.w * 0.92) / 0.8));
    const mid = Math.round(C.w / 2);
    const off = Math.round(Math.min(C.w * 0.3, H * 0.34));
    if (list[0] && list[0].role === "speaker") {
      const xs = [mid, mid - off, mid + off];
      return list.map((c, i) => ({ x: xs[i], h: i ? Math.round(H * 0.8) : H, front: i === 0, dim: i ? 0.45 : 0, z: i ? 1 : 3 }));
    }
    const xs = n === 1 ? [mid] : n === 2 ? [mid - off / 2, mid + off / 2] : [mid, mid - off, mid + off];
    return list.map((c, i) => ({ x: Math.round(xs[i]), h: Math.round(H * (n === 3 && i ? 0.84 : 0.9)), front: false, dim: 0.22, z: n === 3 && !i ? 2 : 1 }));
  };
  const layout0 = u21.layout;
  u21.layout = (vw, vh, combat) => (u31.isMobile(vw, vh) ? u31.layout(vw, vh, combat) : layout0(vw, vh, combat));
  const place0 = u21.placeCast;
  u21.placeCast = (L, list) => (L && L.mobile ? u31.placeCast(L, list) : place0(L, list));

  if (typeof document === "undefined" || typeof window === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const body = document.body;
  const mobile = () => body.classList.contains("u31m");
  const px = (k, v) => document.documentElement.style.setProperty(k, Math.round(v) + "px");

  // ---------------------------------------------------------------- 配置の値（CSS の変数）
  function vars() {
    if (!mobile()) return;
    const L = u31.layout(document.documentElement.clientWidth || window.innerWidth, window.innerHeight, !!(G.S && G.S.combat));
    px("--u31-head", L.head);
    px("--u31-ox", L.open.x); px("--u31-oy", L.open.y); px("--u31-ow", L.open.w); px("--u31-oh", L.open.h);
    document.documentElement.classList.toggle("u31land", L.land);
  }

  // ---------------------------------------------------------------- ログ：短く出し、押すと全文。閉じるボタン
  const logBtn = h("button", "u31logbtn");
  logBtn.type = "button";
  const setLogBtn = () => {
    const open = body.classList.contains("u31logopen");
    logBtn.textContent = open ? "閉じる ▼" : "全文 ▲";
    logBtn.setAttribute("aria-expanded", String(open));
    logBtn.setAttribute("aria-label", open ? "ログを閉じる" : "ログを全部開く");
  };
  u31.openLog = (open) => {
    body.classList.toggle("u31logopen", !!open);
    setLogBtn();
    const log = $("#log");
    if (log) log.scrollTop = open ? log.scrollHeight : 0;
  };
  logBtn.addEventListener("click", (ev) => { ev.stopPropagation(); u31.openLog(!body.classList.contains("u31logopen")); });
  // ログの窓を押すと開く（用語・リンク・ボタンを押したときは開かない）
  document.addEventListener("click", (ev) => {
    if (!mobile() || body.classList.contains("u31logopen")) return;
    const t = ev.target;
    if (!t || !t.closest || !t.closest(".tome") || t.closest("button, a, summary, [role=button], .u8term, .v9term")) return;
    u31.openLog(true);
  });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && mobile() && body.classList.contains("u31logopen")) u31.openLog(false); });

  // ---------------------------------------------------------------- メニュー：上の帯の道具を一つのボタンにまとめる
  const menuBtn = h("button", "btn u31menu", "メニュー");
  menuBtn.type = "button";
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.setAttribute("aria-controls", "u31tools");
  const setMenu = (open) => {
    body.classList.toggle("u31menuopen", !!open);
    menuBtn.setAttribute("aria-expanded", String(!!open));
    menuBtn.textContent = open ? "閉じる" : "メニュー";
  };
  u31.menu = setMenu;
  menuBtn.addEventListener("click", (ev) => { ev.stopPropagation(); setMenu(!body.classList.contains("u31menuopen")); });
  // メニューの中のボタンを押したら閉じる。外を押しても閉じる
  document.addEventListener("click", (ev) => {
    if (!body.classList.contains("u31menuopen")) return;
    const t = ev.target;
    if (t && t.closest && t.closest(".u31menu")) return;
    if (t && t.closest && t.closest(".top .tools") && !t.closest("button")) return;
    setMenu(false);
  });

  // ---------------------------------------------------------------- 上の帯の日付は短く（年を省く。帯を一行に収める）
  function shortDate() {
    const d = $("#u29where .u29wdate");
    if (d) d.textContent = d.textContent.replace(/^\d+年\s*/, "").replace(/\s+/g, "");
  }

  // ---------------------------------------------------------------- 短いログでは、知らせと同じ行（手引き・図鑑・覚え書き・トロフィー）を出さない（全文では出す）
  //   短い窓（3〜4 行）を本文に使う。知らせは上の帯・ログの窓の縁に短く出ている
  u31.ASIDE = /^(手引きに書き足された|図鑑に|覚え書き|トロフィー『)/;
  function markAside() {
    document.querySelectorAll("#log > p").forEach((p) => {
      if (p.classList.contains("u31aside")) return;
      if (p.classList.contains("l-trophy") || u31.ASIDE.test(p.textContent.trim())) p.classList.add("u31aside");
    });
  }

  // ---------------------------------------------------------------- 描くたびに
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      if (mobile()) {
        vars();
        const top = $(".top");
        const tools = $(".top .tools");
        if (tools && !tools.id) tools.id = "u31tools";
        if (top && menuBtn.parentNode !== top) top.append(menuBtn);
        const tome = $(".tome");
        if (tome && logBtn.parentNode !== tome) tome.append(logBtn);
        setLogBtn();
        shortDate();
        markAside();
        // 出来事の組の見出し「どうする？」は、窓の縁の札（u28）と同じなので出さない
        document.querySelectorAll("#panel > .agroup > h3").forEach((t) => { if (t.textContent.trim() === "どうする？") t.hidden = true; });
      } else {
        if (body.classList.contains("u31logopen")) body.classList.remove("u31logopen");
        setMenu(false);
      }
    } catch (e) { /* 並べ替えに失敗しても、画面は止めない */ }
    return r;
  };
  // 場面が変わったら（行動したら）ログは短い形に戻す
  const act0 = G.act;
  if (typeof act0 === "function") G.act = (...a) => { if (body.classList.contains("u31logopen")) u31.openLog(false); return act0(...a); };
  window.addEventListener("resize", () => { if (mobile()) vars(); });
})(globalThis.G = globalThis.G || {});
