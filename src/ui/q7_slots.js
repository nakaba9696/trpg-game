// Q7：セーブ・ロードの画面。枠の読み書きはエンジン（src/engine/q7_slots.js）、ここは選ぶ画面だけ。
// 入口：冒険中の画面の右上（上の道具の列の右端）の「セーブ」「ロード」、タイトルの「ロード」、倒れたあとの年表、キーの近道 S・L。ui.js・setup.js は書き換えず、G.ui.render と G.setup.show を包む。レーン U
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

  // 枠の名前。オートセーブ（町に着いたとき）・中断（最後の行動。タイトルの「つづきから」）・手動 1〜5 の違いが分かるように
  const entryTitle = (e) => ({ town: "オートセーブ（町に着いたとき）", auto: "中断（最後の行動）", last: "中断（倒れる前の行動）" })[e.kind] || `手動 ${e.i}`;
  function entryInfo(e, row) {
    if (e.broken) { row.append(h("span", "q7who", "読めない（壊れている）")); return; }
    if (e.empty) { row.append(h("span", "q7who q7empty", e.kind === "town" ? "まだ無い（町に着くと自動で入る）" : "空き")); return; }
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
        msg = { text: `手動 ${e.i} に保存した。` };
        sfx("page");
        mirror("slot" + e.i, G.slotKey(e.i));
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
      if (e.kind === "town") return { off: true, note: "町に着くと自動で入る" }; // 手動では上書きできない
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
    const list = G.listSlots(store).filter((e) => mode === "load" || e.kind === "slot" || e.kind === "town");
    const ul = h("ul", "q7slots");
    list.forEach((e) => {
      const r = rule(e);
      const li = h("li", "q7slot q7k-" + e.kind + (e.empty ? " empty" : "") + (e.broken ? " broken" : ""));
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
    if (mode === "load") body.append(h("p", "fine q7legend", "オートセーブ：町に着いたときに自動で残る。中断：最後の行動のあと（タイトルの「つづきから」）。手動：「セーブ」で残した枠。どれも死んでも消えない。"));
  }

  ui.slotMode = () => (dlg.open ? mode : null);
  ui.openSlots = (m) => {
    mode = m === "load" ? "load" : "save";
    asking = null;
    msg = null;
    paint();
    if (!dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute("open", ""); } }
  };

  // ---------------------------------------------------------------- claude.ai のデータとそろえる（使えるときだけ）
  // name：claude.ai のデータでの名前（slot1〜・town）、key：ブラウザの鍵
  function mirror(name, key) {
    const st = G.main && G.main.store;
    if (!st || !st.remote) return;
    try { const raw = store.getItem(key); st.remote(name, raw ? { raw } : null); } catch {}
  }
  const boxes = () => [...Array.from({ length: G.SLOT_COUNT }, (_, j) => ["slot" + (j + 1), G.slotKey(j + 1)]), ["town", G.TOWN_SAVE_KEY]];
  const atOf = (raw) => { try { return (JSON.parse(raw).meta || {}).at || 0; } catch { return 0; } };
  const ready = () => {
    if (!G.main) return;
    G.main.onRemote = async (st) => {
      for (const [name, key] of boxes()) {
        const r = await st.read(name);
        let mineRaw = null;
        try { mineRaw = store.getItem(key); } catch {}
        const theirs = r && typeof r.raw === "string" ? r.raw : null;
        if (theirs && (!mineRaw || atOf(theirs) > atOf(mineRaw))) { try { store.setItem(key, theirs); } catch {} }
        else if (mineRaw) mirror(name, key);
      }
    };
    // 町に着いてオートセーブの枠に書いたとき（main.save から）。claude.ai のデータにも写し、「保存済み」の印を「オートセーブしました」にする
    let townT = 0;
    G.main.onTownSave = () => {
      mirror("town", G.TOWN_SAVE_KEY);
      const mark = document.querySelector(".u11saved");
      if (!mark) return;
      mark.textContent = "✓ オートセーブしました";
      mark.classList.add("q7town");
      clearTimeout(townT);
      townT = setTimeout(() => { mark.textContent = "✓ 保存済み"; mark.classList.remove("q7town"); }, 2200);
    };
  };
  // main.js はこのあとに読まれる
  if (G.main) ready(); else queueMicrotask(ready);

  // ---------------------------------------------------------------- 入口：画面の右上（持ち主の声「セーブするとこ分かりにくすぎ。右上に作って」）
  // 上の道具の列の右端に [セーブ][ロード] を並べる。冒険中だけ見せる。保存できない場面では押せない見た目にして、押すと理由を出す
  const topBox = h("span", "q7top");
  const topSave = button("", "q7topSave", () => {
    const can = G.canSave(G.S);
    if (!can.ok) { ui.toast("今はセーブできない", can.why); return; }
    ui.openSlots("save");
  });
  topSave.id = "q7TopSave";
  topSave.append(h("span", "q7ico", "▼"), h("span", "", "セーブ"), h("kbd", "u11key", "S"));
  const topLoad = button("", "q7topLoad", () => ui.openSlots("load"));
  topLoad.id = "q7TopLoad";
  topLoad.append(h("span", "q7ico", "▲"), h("span", "", "ロード"), h("kbd", "u11key", "L"));
  topLoad.title = "保存した枠から戻る（L）";
  [topSave, topLoad].forEach((b) => b.querySelectorAll(".q7ico, kbd").forEach((x) => x.setAttribute("aria-hidden", "true")));
  topBox.append(topSave, topLoad);
  const tools = document.querySelector(".top .tools");
  if (tools) tools.append(topBox);
  const playEl = document.querySelector("#play");
  const syncTop = () => {
    topBox.hidden = !(playEl && !playEl.hidden && G.S);
    const can = G.canSave(G.S);
    topSave.classList.toggle("q7off", !can.ok);
    topSave.setAttribute("aria-disabled", String(!can.ok));
    topSave.title = can.ok ? "今の冒険を枠に残す（S）" : `今はセーブできない：${can.why}`;
  };
  if (playEl) new MutationObserver(syncTop).observe(playEl, { attributes: true, attributeFilter: ["hidden"] });
  syncTop();

  // キーの近道 S・L（文字を打っている所・ほかの窓の上では効かない。同じキーで閉じる）
  document.addEventListener("keydown", (ev) => {
    const t = ev.target;
    const typing = !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)));
    const open = document.querySelector("dialog[open]");
    const a = G.slotKeyAction(ev, typing, open ? open.id || "?" : null, !!(playEl && !playEl.hidden && G.S), ui.slotMode());
    if (!a) return;
    ev.preventDefault();
    if (a === "close") dlg.close();
    else if (a === "save") topSave.click();
    else ui.openSlots("load");
  });

  // 描くたびに右上のボタンの押せる・押せないを合わせる（ステータスの中の入口は、右上にあるので置かない。Q7 のステータスの整理）
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { syncTop(); } catch {}
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
