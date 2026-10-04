// Q7：右上の道具の列を一か所にまとめる・設定を一つの窓に（持ち主の声「図鑑も地図も 2 つ表示されてる。右上にまとめていい」「音とかの設定系は一個にまとめて開く感じ」）
// - 図鑑・地図・依頼・ステータス・セーブ／ロード・トロフィーと墓碑・ログ・タイトルへ・設定 を、右上の .top .tools に決まった順で並べる。
//   帯（#mbar）の下の段（U11 の [ステータス][図鑑][地図][依頼]）は外す。図鑑の赤い「！」は右上の図鑑（data-codex-open）に付く
// - 狭い画面では、トロフィーと墓碑・ログ・タイトルへを「…」の中に畳む（横にはみ出さない）。タイトルへは確かめてから、中断の枠に残して戻る
// - 「明暗」「音」のボタンは「設定」の窓にまとめる。音の行は音の窓（sound.js・sound_bgm.js が作る #dlgSound）の中身をそのまま移す
// - 設定の窓に項目を足す口：G.ui.addSetting({ id, section, label, kind: "toggle" | "range" | "select" | "custom", get, set, options, min, max, step, hint, render })
// ほかのファイルは書き換えず、作られたボタンを並べ直すだけ（名前の頭の zz は、zu11_quick.js・zu12・q7_quests.js より後に読ませるため）。見た目は ui/zz_q7_topbar.css。レーン U
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const tools = $(".top .tools");
  if (!tools) return;

  // ---------------------------------------------------------------- 設定の窓
  const dlg = h("dialog", "q7set");
  dlg.id = "dlgSettings";
  dlg.setAttribute("aria-labelledby", "q7setTitle");
  const head = h("div", "dhead");
  const title = h("h2", "", "設定");
  title.id = "q7setTitle";
  const close = h("button", "btn", "閉じる");
  close.type = "button";
  close.onclick = () => dlg.close();
  head.append(title, close);
  const body = h("div", "dbody q7setbody");
  dlg.append(head, body);
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
  document.body.append(dlg);

  const SECTIONS = ["画面", "音", "遊び"];
  const extra = []; // addSetting で足された項目
  ui.addSetting = (def) => {
    if (!def || !def.id || extra.some((x) => x.id === def.id)) return false;
    extra.push(Object.assign({ section: "遊び", kind: "toggle" }, def));
    if (dlg.open) paint();
    return true;
  };

  // 画面：明暗（自動／明るい／暗い）
  const store = (() => { try { return window.localStorage; } catch { return null; } })();
  function themeRow() {
    const T = G.theme;
    if (!T || !T.set) return null;
    const box = h("div", "q7setrow");
    box.append(h("span", "q7setlab", "明るさ"));
    const opts = h("div", "q7seg");
    opts.setAttribute("role", "radiogroup");
    opts.setAttribute("aria-label", "画面の明るさ");
    const chosen = T.load ? T.load(store) : null;
    [["", "端末に合わせる"], ["light", "明るい"], ["dark", "暗い"]].forEach(([v, label]) => {
      const lab = h("label", "q7opt");
      const r = h("input");
      r.type = "radio"; r.name = "q7theme"; r.value = v; r.checked = (chosen || "") === v;
      r.onchange = () => { T.set(v || null); };
      lab.append(r, h("span", "", label));
      opts.append(lab);
    });
    box.append(opts);
    return box;
  }

  // 音：#dlgSound の中身を移す（音の窓を開いたときの「今の値に合わせる」は、#openSound を押したときに走るので、窓は出さずにそれだけ借りる）
  const soundBody = () => { const d = $("#dlgSound"); return (d && d.querySelector(".dbody")) || body.querySelector(".dbody.sound"); };
  function soundSync() {
    const d = $("#dlgSound"), b = $("#openSound");
    if (!d || !b) return;
    if (!d.q7quiet) { d.showModal = () => {}; d.q7quiet = true; } // 音の窓はもう開かない（中身は設定の窓にある）
    try { b.click(); } catch {}
  }

  function extraRow(x) {
    const box = h("div", "q7setrow");
    box.dataset.setting = x.id;
    if (x.kind === "custom" && x.render) { try { x.render(box); } catch {} return box; }
    const id = "q7s-" + x.id;
    const lab = h("label", "q7setlab", x.label || x.id);
    lab.htmlFor = id;
    let input;
    const v = (() => { try { return x.get ? x.get() : undefined; } catch { return undefined; } })();
    if (x.kind === "range") {
      input = h("input"); input.type = "range"; input.min = x.min ?? 0; input.max = x.max ?? 100; input.step = x.step ?? 1; input.value = v ?? input.min;
      const out = h("output", "num", String(input.value));
      input.oninput = () => { out.textContent = input.value; try { x.set && x.set(+input.value); } catch {} };
      box.append(lab, input, out);
    } else if (x.kind === "select") {
      input = h("select");
      (x.options || []).forEach(([ov, ol]) => { const o = h("option", "", ol); o.value = String(ov); if (String(ov) === String(v)) o.selected = true; input.append(o); });
      input.onchange = () => { try { x.set && x.set(input.value); } catch {} };
      box.append(lab, input);
    } else {
      input = h("input"); input.type = "checkbox"; input.checked = !!v;
      input.onchange = () => { try { x.set && x.set(input.checked); } catch {} };
      box.append(lab, input);
    }
    input.id = id;
    if (x.hint) box.append(h("p", "fine q7sethint", x.hint));
    return box;
  }

  function paint() {
    const sb = soundBody();
    if (sb && sb.parentNode) sb.remove(); // 描き直しのあいだ、音の中身は外しておいて付け直す
    body.textContent = "";
    SECTIONS.forEach((name) => {
      const rows = [];
      if (name === "画面") { const t = themeRow(); if (t) rows.push(t); }
      if (name === "音" && sb) rows.push(sb);
      extra.filter((x) => x.section === name).forEach((x) => rows.push(extraRow(x)));
      if (!rows.length) return;
      const sec = h("section", "q7setsec");
      sec.dataset.section = name;
      sec.append(h("h3", "", name), ...rows);
      body.append(sec);
    });
    // 決まった節に入らない項目
    const rest = extra.filter((x) => !SECTIONS.includes(x.section));
    if (rest.length) { const sec = h("section", "q7setsec"); sec.append(h("h3", "", "そのほか"), ...rest.map(extraRow)); body.append(sec); }
    body.append(h("p", "fine", "設定はこのブラウザに保存されます。"));
  }
  ui.openSettings = () => {
    soundSync();
    paint();
    if (!dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute("open", ""); } }
  };

  // ---------------------------------------------------------------- 右上の並び
  const setBtn = h("button", "btn q7setbtn");
  setBtn.id = "openSettings";
  setBtn.type = "button";
  setBtn.title = "設定（明るさ・音など）";
  const gear = h("span", "q7gear", "⚙");
  gear.setAttribute("aria-hidden", "true");
  setBtn.append(gear, h("span", "q7setword", "設定"));
  setBtn.onclick = () => ui.openSettings();

  const moreBtn = h("button", "btn q7morebtn", "…");
  moreBtn.id = "q7More";
  moreBtn.type = "button";
  moreBtn.title = "ほかの道具（トロフィーと墓碑・ログ・タイトルへ）";
  moreBtn.setAttribute("aria-label", "ほかの道具");
  moreBtn.setAttribute("aria-expanded", "false");
  const more = h("span", "q7more");
  more.id = "q7MoreBox";
  const setMore = (on) => { more.classList.toggle("open", on); moreBtn.setAttribute("aria-expanded", String(on)); };
  moreBtn.onclick = (ev) => { ev.stopPropagation(); setMore(!more.classList.contains("open")); };
  document.addEventListener("click", (ev) => { if (!more.contains(ev.target) && ev.target !== moreBtn) setMore(false); });
  more.addEventListener("click", (ev) => { if (ev.target.closest("button")) setMore(false); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && more.classList.contains("open")) { setMore(false); moreBtn.focus(); } });

  // ---------------------------------------------------------------- タイトルへ（持ち主の声「タイトルに戻るも追加して」）
  // 確かめてから戻る。戻る前に今の冒険を中断の枠（G.main.save）に残すので、タイトルの「つづきから」やロードの「中断」で戻れる。戦闘中も押せる
  const toTitle = h("button", "btn q7totitle", "タイトルへ");
  toTitle.id = "q7ToTitle";
  toTitle.type = "button";
  toTitle.title = "タイトルに戻る（最後の行動までは中断として残る）";
  const ask = h("dialog", "q7ask");
  ask.id = "dlgToTitle";
  ask.setAttribute("aria-labelledby", "q7askTitle");
  const askH = h("div", "dhead");
  const askT = h("h2", "", "タイトルに戻りますか？");
  askT.id = "q7askTitle";
  askH.append(askT);
  const askB = h("div", "dbody");
  askB.append(h("p", "", "最後の行動までは「中断」として残ります。タイトルの「つづきから」か、ロードの「中断（最後の行動）」で戻れます。"));
  const askRow = h("div", "q7askrow");
  const yes = h("button", "btn primary", "タイトルへ戻る"); yes.type = "button"; yes.id = "q7ToTitleYes";
  const no = h("button", "btn", "やめる"); no.type = "button";
  askRow.append(yes, no);
  askB.append(askRow);
  ask.append(askH, askB);
  ask.addEventListener("click", (ev) => { if (ev.target === ask) ask.close(); });
  document.body.append(ask);
  no.onclick = () => ask.close();
  yes.onclick = () => {
    ask.close();
    try { if (G.S && !G.S.over) G.main.save(); } catch {}
    if (ui.setSheetOpen) ui.setSheetOpen(false);
    G.main.toTitle();
  };
  toTitle.onclick = () => { try { ask.showModal(); } catch { ask.setAttribute("open", ""); } yes.focus(); };
  tools.append(toTitle);

  // 並べる順（無い物は飛ばす）。main：いつも見える。more：狭い画面では「…」の中
  const MAIN = ["#openCodex", "#openMap", "#q7Quests", "#openSheet", ".q7top"];
  const MORE = ["#openTrophy", "#openLog", "#q7ToTitle"];
  const HIDE = ["#themeBtn", "#openSound"]; // 設定の窓にまとめた
  function arrange() {
    // 帯の下の段（U11）は外す。そこにあったステータスと依頼は右上へ
    const row = $("#mbar .u11quick");
    const sheet = $("#openSheet"), quests = $("#q7Quests");
    if (sheet) sheet.classList.remove("u11qb");
    if (quests) quests.classList.remove("u11qb");
    MAIN.forEach((sel) => { const el = $(sel); if (el && el.parentNode !== tools) tools.append(el); else if (el) tools.append(el); });
    MORE.forEach((sel) => { const el = $(sel); if (el) more.append(el); });
    tools.append(more, moreBtn, setBtn);
    HIDE.forEach((sel) => { const el = $(sel); if (el) el.hidden = true; });
    if (row) row.remove();
    const bar = $("#mbar");
    if (bar) bar.classList.add("q7norow");
    if (G.f2 && G.f2.markBtn) { try { G.f2.markBtn(); } catch {} }
  }
  ui.topOrder = () => [...MAIN, ...MORE, "#openSettings"];
  // 右上が決まった順に並んでいるか（並んでいれば動かさない。押したボタンから focus を奪わないように）
  function inOrder() {
    const want = [...MAIN.map((x) => $(x)).filter(Boolean), more, moreBtn, setBtn];
    const got = [...tools.children].filter((el) => want.includes(el));
    if (got.length !== want.length || got.some((el, i) => el !== want[i])) return false;
    return MORE.every((x) => { const el = $(x); return !el || el.parentNode === more; });
  }

  // 冒険中かどうか（ステータス・依頼は冒険中だけ）
  const play = $("#play");
  const sync = () => document.body.classList.toggle("q7play", !!(play && !play.hidden && G.S));
  if (play) new MutationObserver(sync).observe(play, { attributes: true, attributeFilter: ["hidden"] });

  // 依頼のボタン（q7_quests.js）とステータスのボタンは描いたあとに出来る・動くので、描くたびに並べ直す（同じ順なら何もしない）
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { if (!inOrder() || $("#mbar .u11quick")) arrange(); sync(); } catch {}
    return r;
  };
  arrange();
  sync();
})(globalThis.G = globalThis.G || {});
