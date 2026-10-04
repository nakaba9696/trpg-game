// U8：用語集（世界の手引き）に載っている言葉を、本文の中で強調する。
//   ・記録・選択肢などの文に出てくる、手引きに載っている見出し語（と別名）を、深い金茶色の細い下線で強調する（暗い版では明るい金）
//   ・同じ語は一つの場面（一つの記録の塊＝「あなた」の行から次の「あなた」の行まで）で最初の 1 回だけ
//   ・その場面で新しく手引きに載った語は ✦ を付けて少し光らせ、画面の隅に「用語集に追加：〇〇」と数秒出す
//   ・強調した語：マウスを乗せる・キーボードで辿る（tabindex）と短い説明。押すと手引きのその項目へ飛ぶ。指で触る画面は、押すと説明（説明の中の「手引きで見る」で飛ぶ）
//   ・まだ開いていない語は強調しない（S.lore に開いた行の言葉だけ。〔秘〕の語は出さない）
// 言葉の表は D.LORE の見出し（title）と、開いた行の hint のうち名詞らしいもの、手引きに最初から載る行（D.WORLD.sections）から作る。
// 他の画面（I2 のアイテムの説明など）からは G.gloss.mark(要素) を通すと同じ強調が効く（G.gloss.mark(el, { scope, passive })）。
// エンジンは lore.js の関数（G.loreOf）と D.LORE を読むだけ。ui.js は ui.render・ui.buildWorld を包む。レーン U（U8）が管理
(function (G) {
  const gl = (G.gloss = {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  // 短い説明（最初の一文。長ければ切る）
  gl.tipText = (v) => {
    const s = String(v || "").replace(/\s+/g, "");
    const m = s.match(/^.*?[。！？]/);
    const t = m ? m[0] : s;
    return t.length > 64 ? t.slice(0, 62) + "…" : t;
  };
  // 別名にしてよい hint：漢字・カタカナの名詞（「の」でつないだものまで）。数だけのもの・ありふれた言葉は外す
  const NOUN = /^[\p{Script=Han}\p{Script=Katakana}ー・ヶ]+(の[\p{Script=Han}\p{Script=Katakana}ー・ヶ]+)*$/u;
  const NUM = /^[一二三四五六七八九十百千万〇]+$/;
  gl.SKIP = new Set(["花畑", "花粉", "蜜菓子", "日傘", "大厨房", "縁談", "協定"]);
  gl.aliasOk = (w) => typeof w === "string" && w.length >= 2 && w.length <= 8 && NOUN.test(w) && !NUM.test(w) && !gl.SKIP.has(w);
  // 見出しを言葉にしてよいか：2 字以上で、ひらがなだけではない（「あれ」は本文のどこにでも出る）
  gl.titleOk = (w) => typeof w === "string" && w.length >= 2 && !/^[\p{Script=Hiragana}ー]+$/u.test(w) && !/[〔〕]/.test(w);
  const secret = (t) => /〔秘〕/.test(String(t || ""));

  // 今の冒険で手引きに載っている言葉：[{ w: 語, id: 項目（D.LORE の id か "w:見出し"）, title: 手引きの見出し, tip: 短い説明 }]（長い語から）
  gl.words = (S) => {
    const D = G.data || {};
    const out = new Map();
    const add = (w, id, title, tip) => { if (!out.has(w)) out.set(w, { w, id, title, tip: gl.tipText(tip) }); };
    const lore = S ? (G.loreOf ? G.loreOf(S) : S.lore || {}) : {};
    const titles = new Set();
    Object.entries(D.LORE || {}).forEach(([id, e]) => {
      titles.add(e.title);
      const keys = lore[id] || [];
      const rows = (e.lines || []).filter((l) => keys.includes(l[0]) && !secret(l[1]));
      if (!rows.length) return;
      if (gl.titleOk(e.title)) add(e.title, id, e.title, rows[0][1]);
      rows.forEach(([, text, opt]) => ((opt && opt.hint) || []).forEach((w) => { if (gl.aliasOk(w) && w !== e.title) add(w, id, e.title, text); }));
    });
    // 手引きに最初から載る行（冒険者ギルド・金貨・出発の町）
    const secs = (D.WORLD && S ? D.WORLD.sections : []) || [];
    secs.forEach(([, rows]) => (rows || []).forEach((r) => {
      if (!r || !gl.titleOk(r[0]) || titles.has(r[0]) || !r[1] || secret(r[1])) return;
      add(r[0], "w:" + r[0], r[0], r[1]);
    }));
    return [...out.values()].sort((a, b) => b.w.length - a.w.length);
  };
  // 言葉の表の印（変わったら作り直す）
  gl.sig = (S) => {
    if (!S) return "";
    const lore = S.lore || {};
    return [S.id || "", S.loc || "", Object.keys(lore).map((k) => k + ":" + lore[k].length).join(",")].join("|");
  };

  // 文の中の用語の位置：[{ at, len, w, id, title, tip }]。used（Set）に入っている項目は飛ばし、拾った項目を足す（一つの場面で一度だけ）
  const reOf = new WeakMap();
  gl.find = (text, words, used) => {
    text = String(text || "");
    if (!text || !words || !words.length) return [];
    let re = reOf.get(words);
    if (!re) {
      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      re = new RegExp(words.map((x) => esc(x.w)).join("|"), "g");
      reOf.set(words, re);
    }
    const byW = new Map(words.map((x) => [x.w, x]));
    used = used || new Set();
    const out = [];
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      const x = byW.get(m[0]);
      if (!x || used.has(x.id)) continue;
      used.add(x.id);
      out.push({ at: m.index, len: m[0].length, w: x.w, id: x.id, title: x.title, tip: x.tip });
    }
    return out;
  };
  // 文を、用語とそれ以外に切り分ける（描くとき用）：[文字列 | { w, id, title, tip }]
  gl.split = (text, words, used) => {
    text = String(text || "");
    const hits = gl.find(text, words, used);
    const out = [];
    let at = 0;
    hits.forEach((x) => {
      if (x.at > at) out.push(text.slice(at, x.at));
      out.push(x);
      at = x.at + x.len;
    });
    if (at < text.length || !out.length) out.push(text.slice(at));
    return out;
  };
  // 新しく手引きに載った項目：before（前に見た S.lore の写し）と比べて、行が増えた項目の id
  gl.snap = (S) => { const o = {}; Object.entries((S && S.lore) || {}).forEach(([k, v]) => { o[k] = (v || []).length; }); return o; };
  gl.fresh = (before, S) => {
    const now = gl.snap(S);
    return Object.keys(now).filter((k) => now[k] > ((before || {})[k] || 0) && G.data.LORE[k]);
  };
  // 「手引きに書き足された：〇〇」の記録から見出しを取る
  gl.noteTitle = (text) => { const m = /^手引きに書き足された：(.+)$/.exec(String(text || "")); return m ? m[1] : null; };

  if (typeof document === "undefined" || typeof window === "undefined") return;
  const ui = G.ui;
  if (!ui || !ui.render) return;

  // ---------------------------------------------------------------- 小道具
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const coarse = () => window.matchMedia && window.matchMedia("(hover: none)").matches;

  let words = [], wordsSig = null;
  const wordsNow = () => {
    const sig = gl.sig(G.S);
    if (sig !== wordsSig) { wordsSig = sig; words = gl.words(G.S); }
    return words;
  };

  // 一つの語の印。passive：ボタンの中など（押すとボタンが動くので、説明だけ出して飛ばない）
  function termEl(x, opt) {
    const s = h("span", "u8term" + (opt.fresh && opt.fresh.has(x.id) ? " u8new" : ""), x.w);
    s.dataset.tip = x.tip || "";
    s.dataset.title = x.title;
    s.dataset.id = x.id;
    if (!opt.passive) {
      s.tabIndex = 0;
      s.setAttribute("role", "button");
      s.setAttribute("aria-label", `${x.w}（手引き：${x.title}）`);
    } else s.classList.add("u8passive");
    return s;
  }

  // 要素の中の文字を通して、用語を強調する（I2 などほかの画面からも呼べる）
  //   opt.scope：一つの場面の Set（同じ語を一度だけにする。渡さなければこの要素だけで一度）
  //   opt.passive：押しても飛ばない（ボタンの中）  opt.fresh：新しく載った項目の id の Set  opt.words：言葉の表（省くと今の冒険）
  gl.mark = (el, opt) => {
    opt = opt || {};
    if (!el || el.closest && el.closest(".u8term")) return 0;
    const list = opt.words || wordsNow();
    if (!list.length) return 0;
    const used = opt.scope || new Set();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && n.parentElement.closest(".u8term, .v9key, kbd, button.btn, .die, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let n = 0;
    nodes.forEach((t) => {
      const parts = gl.split(t.nodeValue, list, used);
      if (parts.length < 2 && typeof parts[0] === "string") return;
      const frag = document.createDocumentFragment();
      parts.forEach((p) => { if (typeof p === "string") { if (p) frag.append(p); } else { frag.append(termEl(p, opt)); n++; } });
      t.replaceWith(frag);
    });
    return n;
  };

  // ---------------------------------------------------------------- 記録・選択肢に通す
  // freshNow：今回の描画で新しく載った項目（記録の ✦）。unseen：手引きをまだ開いて見ていない、新しく載った項目（手引きの ✦）
  let seenLore = null, seenRun = null, freshNow = new Set(), unseen = new Set();
  function markAll() {
    const S = G.S;
    if (!S) return;
    // 新しく載った項目（同じ冒険の前の描画と比べる。初めて描くときは無し）
    if (seenRun !== S.id) { seenRun = S.id; seenLore = gl.snap(S); unseen = new Set(); }
    const got = gl.fresh(seenLore, S);
    seenLore = gl.snap(S);
    freshNow = new Set(got);
    got.forEach((id) => unseen.add(id));
    if (got.length) announce(got.map((id) => G.data.LORE[id].title));
    const list = wordsNow();
    const log = $("#log");
    if (log && list.length) {
      // 場面ごと（「あなた」の行で区切る）に、同じ語は一度だけ。新しく載った語の ✦ は、今回増えた記録の中だけ
      let used = new Set();
      Array.from(log.children).forEach((el) => {
        if (el.classList.contains("l-you")) { used = new Set(); return; }
        const isNew = el.classList.contains("new");
        const fresh = isNew ? freshNow : null;
        const t = gl.noteTitle(el.textContent);
        if (t) { noteEl(el, t, used, fresh); return; }
        gl.mark(el, { scope: used, fresh, words: list });
      });
    }
    // 選択肢（ボタンの中なので、説明だけ）
    const used = new Set();
    document.querySelectorAll("#panel .act").forEach((b) => gl.mark(b, { scope: used, passive: true, words: list }));
  }
  // 「手引きに書き足された：〇〇」の見出しは、言葉の表に無い見出し（「あれ」など）でも強調する
  function noteEl(el, title, used, fresh) {
    const e = Object.entries(G.data.LORE || {}).find(([, x]) => x.title === title);
    if (!e) return;
    const [id, L] = e;
    const keys = (G.S.lore || {})[id] || [];
    const row = L.lines.find((l) => keys.includes(l[0]));
    if (!row || secret(row[1])) return;
    used.add(id);
    const x = { w: title, id, title, tip: gl.tipText(row[1]) };
    el.textContent = "手引きに書き足された：";
    el.append(termEl(x, { fresh }));
  }

  // ---------------------------------------------------------------- 「用語集に追加」の知らせ（左下。トロフィーの知らせは上の真ん中）
  const box = h("div");
  box.id = "u8note";
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  box.hidden = true;
  document.body.append(box);
  let noteT = 0;
  function announce(titles) {
    titles.forEach((t) => {
      const line = h("div", "u8line");
      line.append(h("span", "u8star", "✦"), h("span", "", "用語集に追加："), h("b", "", t));
      box.append(line);
    });
    while (box.children.length > 3) box.firstChild.remove();
    box.hidden = false;
    clearTimeout(noteT);
    noteT = setTimeout(() => { box.hidden = true; box.textContent = ""; }, 4200);
  }
  gl.announce = announce;

  // ---------------------------------------------------------------- 短い説明
  const tip = h("div");
  tip.id = "u8tip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);
  let tipFor = null;
  function showTip(t, withLink) {
    tipFor = t;
    tip.textContent = "";
    const head = h("b", "", t.dataset.title);
    tip.append(head, h("span", "", t.dataset.tip || ""));
    if (withLink) {
      const go = h("button", "u8go", "手引きで見る ›");
      go.type = "button";
      go.onclick = (ev) => { ev.stopPropagation(); jump(t.dataset.title); };
      tip.append(go);
    }
    tip.classList.toggle("u8tap", !!withLink);
    tip.hidden = false;
    const r = t.getBoundingClientRect(), vw = document.documentElement.clientWidth || window.innerWidth;
    const w = tip.offsetWidth, hh = tip.offsetHeight;
    const x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
    const y = r.top - hh - 8 < 8 ? r.bottom + 8 : r.top - hh - 8;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  const hideTip = () => { tip.hidden = true; tipFor = null; };
  gl.hideTip = hideTip;
  const termOf = (ev) => (ev.target && ev.target.closest ? ev.target.closest(".u8term") : null);
  document.addEventListener("mouseover", (ev) => { const t = termOf(ev); if (t && !coarse()) showTip(t); });
  document.addEventListener("mouseout", (ev) => { const t = termOf(ev); if (t && !t.contains(ev.relatedTarget) && !tip.classList.contains("u8tap")) hideTip(); });
  document.addEventListener("focusin", (ev) => { const t = termOf(ev); if (t) showTip(t); });
  document.addEventListener("focusout", (ev) => { const t = termOf(ev); if (t && !tip.contains(ev.relatedTarget)) hideTip(); });
  window.addEventListener("scroll", () => { if (!tip.classList.contains("u8tap")) hideTip(); }, true);
  document.addEventListener("click", (ev) => {
    const t = termOf(ev);
    if (!t) { if (!tip.contains(ev.target)) hideTip(); return; }
    if (t.classList.contains("u8passive")) return; // ボタンの中：押せばボタンが動く
    ev.preventDefault();
    if (coarse() && !(tipFor === t && tip.classList.contains("u8tap"))) { showTip(t, true); return; }
    jump(t.dataset.title);
  });
  document.addEventListener("keydown", (ev) => {
    const t = termOf(ev);
    if (t && !t.classList.contains("u8passive") && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); ev.stopPropagation(); jump(t.dataset.title); }
    else if (ev.key === "Escape" && !tip.hidden) hideTip();
  }, true);

  // ---------------------------------------------------------------- 手引きのその項目へ飛ぶ
  function jump(title) {
    hideTip();
    // 手引きは図鑑の「用語」のタブ。その用語を選んだ状態で開く（U11。G.ui.openWorld は ui/f2_codex.js）
    if (G.ui.openWorld) G.ui.openWorld(title);
  }
  gl.jump = jump;

  // 手引き：見出しに目印を付ける（続きの行は見出しが空なので、直前の見出しを引き継ぐ）。新しく載った項目には ✦
  const baseBuild = ui.buildWorld;
  ui.buildWorld = (...a) => {
    const r = baseBuild(...a);
    let last = "";
    const fresh = new Set([...unseen].map((id) => (G.data.LORE[id] || {}).title));
    unseen = new Set();
    document.querySelectorAll("#worldBody dt").forEach((dt) => {
      const t = dt.textContent;
      if (t) last = t;
      dt.dataset.term = last;
      if (t && fresh.has(t)) dt.classList.add("u8newdt");
    });
    return r;
  };

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    hideTip();
    markAll();
    return r;
  };
})(globalThis.G = globalThis.G || {});
