// Q7：セーブ・ロードの画面。枠の読み書きはエンジン（src/engine/q7_slots.js）、ここは選ぶ画面だけ。
// 入口：ステータスの下のボタン（セーブ・ロード）と、タイトルの「ロード」。ui.js・setup.js は書き換えず、G.ui.render と G.setup.show を包む。レーン U
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render || !G.setup) return;
  const ui = G.ui;
  const store = (() => { try { return window.localStorage; } catch { return null; } })();
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const button = (label, cls, fn) => { const b = h("button", "btn" + (cls ? " " + cls : ""), label); b.type = "button"; b.onclick = fn; return b; };
  const sfx = (n) => { try { const s = G.sound; if (s && s.play && (!s.names || s.names.includes(n))) s.play(n); } catch {} };
  const stamp = (at) => {
    if (!at) return "";
    const d = new Date(at), p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const playing = () => !document.querySelector("#play").hidden;
  const live = () => !!(G.S && !G.S.over && G.S.profile);

  // ---------------------------------------------------------------- 窓（ほかの窓と同じ作り）
  const dlg = h("dialog", "q7dlg");
  dlg.id = "dlgSlots";
  const head = h("div", "dhead");
  const title = h("h2", "", "セーブ");
  head.append(title, button("閉じる", "", () => dlg.close()));
  const body = h("div", "dbody");
  dlg.append(head, body);
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
  document.body.append(dlg);

  let mode = "save";
  let asking = null; // 確かめている枠の id
  let msg = null;    // { text, bad }

  const entryTitle = (e) => (e.kind === "auto" ? "自動" : e.kind === "last" ? "自動（倒れる前）" : `枠 ${e.i}`);
  function entryInfo(e, row) {
    if (e.broken) { row.append(h("span", "q7who", "読めない（壊れている）")); return; }
    if (e.empty) { row.append(h("span", "q7who q7empty", "空き")); return; }
    const m = e.meta;
    row.append(h("span", "q7who", `${m.cls} ${m.name}`));
    row.append(h("span", "q7where", `${m.date}・${m.loc}${m.depth ? `・地下${m.depth}階` : ""}`));
    row.append(h("span", "q7at num", m.over ? (m.over === "dead" ? "倒れた冒険" : "終えた冒険") : `保存 ${stamp(m.at)}`));
  }

  function act(e) {
    msg = null;
    if (mode === "save") {
      const r = G.writeSlot(store, e.i, G.S);
      asking = null;
      if (r.ok) {
        msg = { text: `枠 ${e.i} に保存した。` };
        sfx("page");
        mirror(e.i);
      } else msg = { text: r.why, bad: true };
      paint();
      return;
    }
    const S = G.loadEntry(store, e.id);
    asking = null;
    if (!S) { msg = { text: "この枠は読めなかった。", bad: true }; paint(); return; }
    G.adoptLoaded(S);
    dlg.close();
    ui.setSheetOpen(false);
    G.main.save();
    G.main.resume();
    sfx("page");
    ui.toast("ロード", `${S.clsName} ${S.profile.name}・${G.date()}・${G.loc().name}`);
  }

  // 枠が押せるか・確かめが要るか
  function rule(e) {
    if (mode === "save") {
      const can = G.canSave(G.S);
      if (!can.ok) return { off: true };
      return { confirm: !e.empty ? "上書きする" : null, label: e.empty ? "ここに保存" : "上書き" };
    }
    if (e.empty || e.broken) return { off: true };
    if (e.meta && e.meta.over) return { off: true };
    // 冒険中の「自動」は今の冒険そのもの
    if (e.kind === "auto" && playing()) return { off: true, note: "今の冒険" };
    if (e.kind === "auto") return { label: "つづきから" };
    return { confirm: live() ? "今の冒険を捨ててロードする" : null, label: "ロード" };
  }

  function paint() {
    title.textContent = mode === "save" ? "セーブ" : "ロード";
    body.textContent = "";
    const can = G.canSave(G.S);
    if (mode === "save") body.append(h("p", "fine q7lead" + (can.ok ? "" : " q7bad"), can.ok ? "保存する枠を選ぶ。手動の枠は死んでも消えない。" : `今は保存できない：${can.why}`));
    else body.append(h("p", "fine q7lead", "戻る冒険を選ぶ。トロフィー・図鑑・墓碑はロードしても減らない。"));
    if (!store) body.append(h("p", "fine q7bad", "このブラウザでは保存の場所が使えない。枠は読み書きできない。"));
    if (msg) { const p = h("p", "q7msg" + (msg.bad ? " q7bad" : ""), msg.text); p.setAttribute("role", "status"); body.append(p); }
    const list = G.listSlots(store).filter((e) => mode === "load" || e.kind === "slot");
    const ul = h("ul", "q7slots");
    list.forEach((e) => {
      const r = rule(e);
      const li = h("li", "q7slot" + (e.empty ? " empty" : "") + (e.broken ? " broken" : ""));
      li.dataset.slot = e.id;
      const info = h("div", "q7info");
      info.append(h("b", "q7name", entryTitle(e)));
      entryInfo(e, info);
      li.append(info);
      const side = h("div", "q7side");
      if (asking === e.id && r.confirm) {
        side.append(h("span", "q7ask", r.confirm + "？"));
        side.append(button("はい", "primary q7yes", () => act(e)), button("やめる", "q7no", () => { asking = null; paint(); }));
      } else if (r.note) side.append(h("span", "fine", r.note));
      else if (!r.off) {
        side.append(button(r.label, mode === "save" && e.empty ? "primary q7go" : "q7go", () => {
          if (r.confirm) { asking = e.id; msg = null; paint(); const y = body.querySelector(".q7yes"); if (y) y.focus(); return; }
          act(e);
        }));
      }
      li.append(side);
      ul.append(li);
    });
    body.append(ul);
    if (mode === "load" && !list.some((e) => !e.empty)) body.append(h("p", "fine", "まだ保存された冒険が無い。"));
  }

  ui.openSlots = (m) => {
    mode = m === "load" ? "load" : "save";
    asking = null;
    msg = null;
    paint();
    if (!dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute("open", ""); } }
  };

  // ---------------------------------------------------------------- claude.ai のデータとそろえる（使えるときだけ）
  function mirror(i) {
    const st = G.main && G.main.store;
    if (!st || !st.remote) return;
    try { const raw = store.getItem(G.slotKey(i)); st.remote("slot" + i, raw ? { raw } : null); } catch {}
  }
  const ready = () => {
    if (!G.main) return;
    G.main.onRemote = async (st) => {
      for (let i = 1; i <= G.SLOT_COUNT; i++) {
        const r = await st.read("slot" + i);
        const mine = G.readSlot(store, i);
        const theirs = r && typeof r.raw === "string" ? r.raw : null;
        let at = 0;
        try { at = theirs ? (JSON.parse(theirs).meta || {}).at || 0 : 0; } catch {}
        if (theirs && (!mine || mine.broken || at > ((mine.meta && mine.meta.at) || 0))) { try { store.setItem(G.slotKey(i), theirs); } catch {} }
        else if (mine && !mine.broken) mirror(i);
      }
    };
  };
  // main.js はこのあとに読まれる
  if (G.main) ready(); else queueMicrotask(ready);

  // ---------------------------------------------------------------- 入口：ステータスの下
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      const acts = document.querySelector("#sheet .sheet-actions");
      if (acts && !acts.querySelector(".q7save")) {
        const can = G.canSave(G.S);
        const sv = button("セーブ", "q7save", () => ui.openSlots("save"));
        sv.disabled = !can.ok;
        if (!can.ok) sv.title = can.why;
        const ld = button("ロード", "q7load", () => ui.openSlots("load"));
        acts.prepend(sv, ld);
        const note = acts.querySelector(".saved");
        const why = can.ok ? "" : `いまは手動で保存できない（${can.why.replace(/。$/, "")}）。`;
        if (note) note.textContent = `冒険は行動のたびに自動でも保存される。「セーブ」で枠に残せば、あとでその時点へ戻れる。${why}`;
      }
    } catch { /* 入口が付かなくても画面は止めない */ }
    return r;
  };

  // ---------------------------------------------------------------- 入口：倒れたあとの年表（「新しい冒険を始める」の横）
  const chronActs = document.querySelector("#chronActions");
  if (chronActs) {
    const b = button("ロードしてやり直す", "q7load", () => { const d = document.querySelector("#dlgChron"); if (d && d.open) d.close(); ui.openSlots("load"); });
    chronActs.append(b);
  }

  // ---------------------------------------------------------------- 入口：タイトル
  const show0 = G.setup.show;
  G.setup.show = (...a) => {
    const r = show0(...a);
    try {
      const menu = document.querySelector("#setup .titleMenu");
      if (menu && !menu.querySelector(".q7load")) {
        const any = G.listSlots(store).some((e) => !e.empty && !e.broken && !(e.meta && e.meta.over) && e.kind !== "auto");
        if (any) {
          const b = button("ロード", "q7load", () => ui.openSlots("load"));
          b.id = "t-load";
          b.append(h("small", "", "保存した枠から始める"));
          menu.append(b);
        }
      }
    } catch {}
    return r;
  };
})(globalThis.G = globalThis.G || {});
