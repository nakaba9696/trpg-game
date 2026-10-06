// U19：本文の欄（#log）を、行動ごとに上から書き直す。持ち主の声「行動したらログを下に書き足すのではなく、また上から新規で書いてほしい。
// スクロールが大変。今までの行動ログは右上のログから見られるので大丈夫」
//   ・選択肢を押したあと、新しい記録が出たら、それより前の行を本文の欄から隠す（class "u19gone"）。本文の欄は先頭へ戻す
//   ・何を選んだかは本文の頭に一行（「▶ 酒場で噂を聞く」。#log の ::after）。エンジンが「あなた」の行（k: "you"）を書いていればそれを、無ければ押したボタンの名前を出す
//   ・戦闘は手番ごとに書き直し、直前の手番の要約を一行だけ薄く残す
//   ・ひとつの行動の結果が何度かに分けて描かれる（演出の待ちなど）ときは、押してから最初の描き直しで頁を改め、あとは同じ頁に書き足す
//   ・過去の文は右上の「ログ」の窓（v9_pc.js の v9.openLog）で読める。窓は本文の欄に並ぶ 90 行に加え、記録（S.log）の残り全部を頭に足す
//   ・設定「本文を積み上げる（前の形）」で、今までの積み上げる形に戻せる（このブラウザに覚える）
// 行は消さずに隠すだけ（並びは S.log の後ろと同じまま。q7_lognums・echo_f4・u8 などが並びで合わせているため）。
// ui.js は書き換えず、G.ui.render を包む（名前の zzzz で、u13・u14・q7 より後に読まれる）。エンジンは読むだけ。レーン U（U19）
(function (G) {
  const U19 = (G.u19 = G.u19 || {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  // 頁の頭（本文の欄に並ぶ行のうち、何番目から見せるか）
  //   n 並ぶ行の数、kinds 各行の k、fresh 今回増えた行の数（末尾から）、prev 前の頁の頭（-1 は分からない）、acted 押してからまだ頁を改めていないか
  U19.pageStart = (o) => {
    const n = o.n || 0, fresh = Math.min(n, o.fresh || 0), prev = o.prev == null ? -1 : o.prev;
    if (fresh > 0 && (o.acted || prev < 0)) return n - fresh;
    if (prev >= 0 && prev <= n) return prev;
    // 開き直したとき：最後の「あなた」の行から。無ければ全部
    const kinds = o.kinds || [];
    return Math.max(0, kinds.lastIndexOf("you"));
  };
  // 頁の頭に出す「何を選んだか」。頁の最初の行が「あなた」の行なら要らない
  U19.headOf = (first, label) => {
    if (first && first.k === "you") return "";
    const t = String(label || "").replace(/\s+/g, " ").trim();
    return t ? "▶ " + (t.length > 30 ? t.slice(0, 29) + "…" : t) : "";
  };
  // 直前の手番の要約（戦闘）：「▶ 攻撃 ── 文…」の一行。判定は出目だけ
  U19.summary = (entries, label) => {
    if (!entries || !entries.length) return "";
    const you = entries.find((e) => e.k === "you");
    const act = you ? you.text : String(label || "").trim();
    const rest = entries.filter((e) => e !== you && e.k !== "title").map((e) => e.k === "dice" ? `${e.reason || "判定"}${e.label ? "：" + e.label : ""}` : e.text).filter(Boolean);
    let txt = rest.join("　");
    if (txt.length > 90) txt = txt.slice(0, 89) + "…";
    return (act ? "▶ " + act : "") + (act && txt ? " ── " : "") + txt;
  };
  // ログの窓で読む一行（ui.js の「ログをコピー」と同じ書き方）
  U19.lineOf = (e) => e.k === "dice" ? `［判定］${e.reason}【${e.stat}】成功率${e.chance}% 出目${e.roll} ${e.label}` : e.k === "you" ? `▶ ${e.text}` : e.text;
  const STACK_KEY = "morsveld-u19-stack";
  U19.stack = false;

  if (typeof document === "undefined" || !G.ui) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  try { U19.stack = localStorage.getItem(STACK_KEY) === "1"; } catch {}

  // 本文の頭の二行は #log の ::before（直前の手番）・::after（何を選んだか。order で頭へ）に出す。
  // #log の子を増やすと S.log との並びが崩れ、外に置くと PC の窓の grid の段が崩れるため
  const setAttr = (el, k, v) => { if (v) { if (el.getAttribute(k) !== v) el.setAttribute(k, v); } else el.removeAttribute(k); };

  // 押したこと（選択肢・道具など。ログの窓と設定の窓の中は数えない）
  let acted = false, label = "";
  document.addEventListener("click", (ev) => {
    const b = ev.target && ev.target.closest && ev.target.closest("button");
    if (!b || b.closest("#dlgLog, .top, dialog") || b.id === "logToggle") return;
    acted = true;
    if (b.closest("#panel")) { const t = b.querySelector("b"); label = (t || b).textContent; }
    else label = "";
  }, true);

  let pageEntry = null, run = null, pageLabel = "", lastPage = null, pageCombat = false; // lastPage：{ entries, label, combat 戦闘の中で始まった頁か }
  function paint() {
    const S = G.S, log = $("#log");
    if (!S || !log) return;
    const kids = Array.from(log.children);
    if (U19.stack) {
      kids.forEach((el) => el.classList.remove("u19gone"));
      setAttr(log, "data-u19prev", ""); setAttr(log, "data-u19head", "");
      return;
    }
    const shown = S.log.slice(-kids.length);
    if (run !== S.id) { run = S.id; pageEntry = null; lastPage = null; acted = false; }
    const fresh = kids.filter((el) => el.classList.contains("new")).length;
    const prev = pageEntry ? shown.indexOf(pageEntry) : -1;
    const start = U19.pageStart({ n: kids.length, kinds: shown.map((e) => e.k), fresh, prev, acted });
    const turned = start !== prev;
    if (turned) {
      // 直前の頁を覚える（戦闘の手番の要約に使う）
      if (prev >= 0 && start > prev) lastPage = { entries: shown.slice(prev, start), label: pageLabel, combat: pageCombat };
      else if (prev < 0) lastPage = null;
      pageEntry = shown[start] || null;
      pageLabel = acted ? label : "";
      pageCombat = !!S.combat;
      acted = false;
    }
    kids.forEach((el, i) => el.classList.toggle("u19gone", i < start));
    // 何を選んだか
    const head = U19.headOf(shown[start], pageLabel);
    setAttr(log, "data-u19head", head);
    // 直前の手番（戦闘の中で、前の頁も戦闘だったとき）
    const sum = S.combat && lastPage && lastPage.combat ? U19.summary(lastPage.entries, lastPage.label) : "";
    setAttr(log, "data-u19prev", sum ? "前の手番　" + sum : "");
    if (turned) requestAnimationFrame(() => { log.scrollTop = 0; });
  }

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { paint(); } catch (e) { /* 書き直しに失敗しても画面は止めない */ }
    return r;
  };

  // ---------------------------------------------------------------- ログの窓：記録の全部
  const v9 = G.v9;
  if (v9 && typeof v9.openLog === "function") {
    const open = v9.openLog;
    v9.openLog = (...a) => {
      const r = open(...a);
      try {
        const box = $("#dlgLog .v9logAll"), log = $("#log"), S = G.S;
        if (box && S) {
          box.querySelectorAll(".u19gone").forEach((el) => el.classList.remove("u19gone"));
          const n = log ? log.children.length : 0;
          const older = S.log.slice(0, Math.max(0, S.log.length - n));
          if (older.length) {
            const empty = box.querySelector(":scope > .fine");
            if (empty && n === 0) empty.remove();
            const frag = document.createDocumentFragment();
            older.forEach((e) => frag.append(h("p", "u19old " + (e.k === "you" ? "l-you" : e.k === "title" ? "l-title" : e.k === "dice" ? "l-sys" : "l-" + e.k), U19.lineOf(e))));
            box.prepend(frag);
            box.scrollTop = box.scrollHeight;
          }
        }
      } catch {}
      return r;
    };
  }

  // ---------------------------------------------------------------- 設定
  const set = (on) => {
    U19.stack = !!on;
    try { localStorage.setItem(STACK_KEY, on ? "1" : "0"); } catch {}
    if (G.S && ui.render) ui.render();
  };
  U19.setStack = set;
  if (typeof ui.addSetting === "function") {
    try { ui.addSetting({ id: "u19stack", section: "遊び", label: "本文を積み上げる（前の形）", hint: "行動のたびに本文を上から書き直さず、下に書き足していく。過去の文は右上の「ログ」でいつでも読める", get: () => U19.stack, set }); } catch {}
  }
})(globalThis.G = globalThis.G || {});
