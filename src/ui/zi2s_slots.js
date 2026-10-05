// I2（装備の枠）：装備の画面を 7 枠に。シートの「装備」のタブの表（ui.js の sheetGearRows）を、人の形に沿った並びに置き換える。
//         頭
//   右手  胴  左手
//   飾1   足  飾2
//   ・両手持ちで塞がった左手は、斜線と「両手持ち」で分かるように。空の枠は「なし」
//   ・身に着けている品の「外す」ボタン（素手の右手は無し）
//   ・持ち物の行の装備のボタンを、入れる枠ごとに（片手の武器は「右手に」「左手に」、装飾品は空いている枠へ、両方埋まっていれば「1と替える」「2と替える」）
// ui.js は書き換えず、描いたあとに置き換えて包む。エンジンは engine/zzzzzzzzz_i2s_slots.js（G.i2s）。見た目は src/ui/zi2s_slots.css。レーン I（I2）
(function (G) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const ui = G.ui;
  const X = G.i2s;
  if (!ui || !ui.render || !X || !X.rows) return;
  const D = G.data;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const effOf = (it) => (G.i3 && G.i3.effectText ? G.i3.effectText(it) : G.itemEffect ? G.itemEffect(it) : "");
  const rar = (it) => { const r = G.i3 && G.i3.rarityOf ? G.i3.rarityOf(it) : 0; return r ? "i3rar" + r : ""; };
  const free = () => { const S = G.S; return !!S && !S.over && S.mode !== "combat"; };
  const act = (fn) => { if (!free()) return; fn(); if (ui.after) ui.after(); };
  const btn = (label, fn, title) => {
    const b = h("button", "btn small", label);
    b.type = "button";
    b.disabled = !free();
    if (title) b.title = title;
    b.onclick = () => act(fn);
    return b;
  };

  // ---------------------------------------------------------------- 7 枠の表
  function doll() {
    const S = G.S;
    const box = h("div", "i2doll");
    box.setAttribute("role", "list");
    box.setAttribute("aria-label", "装備の枠");
    const right = D.ITEMS[S.weapon];
    const twoH = X.blocked(S);
    X.rows(S).forEach((r) => {
      const cell = h("div", `i2slot i2s-${r.k}${r.blocked ? " blocked" : ""}${r.id ? "" : " empty"}`);
      cell.setAttribute("role", "listitem");
      const lab = r.k === "weapon" && twoH ? "右手・両手持ち" : r.name;
      cell.append(h("span", "i2lab", lab));
      if (r.blocked) {
        cell.append(h("span", "i2nm", "両手持ち"), h("span", "i2eff", `${right ? right.name : "武器"}で塞がっている`));
        cell.setAttribute("aria-label", `${r.name}：右手の両手の武器で塞がっている`);
      } else if (r.it) {
        const nm = h("span", "i2nm " + rar(r.it), r.it.name);
        if (G.itemFlavor && G.itemFlavor(r.id)) nm.dataset.i2item = r.id;
        cell.append(nm);
        const eff = effOf(r.it);
        const extra = r.k === "weapon" && G.weapon().dual ? "二刀・手数" : r.k === "off" && r.it.type === "weapon" ? "二刀（振るのは右手）" : "";
        const e = [eff, extra].filter(Boolean).join("・");
        if (e) cell.append(h("span", "i2eff", e));
        cell.append(btn("外す", () => G.unequip(r.k), r.it.cursed ? "呪われている。外すと傷を負う" : ""));
        cell.setAttribute("aria-label", `${r.name}：${r.it.name}`);
      } else {
        cell.append(h("span", "i2nm none", r.k === "weapon" ? "素手" : "なし"));
        cell.setAttribute("aria-label", `${r.name}：${r.k === "weapon" ? "素手" : "なし"}`);
      }
      box.append(cell);
    });
    // 防御のまとめ（胴・頭・足・盾の合計）
    const a = G.armor();
    const sum = h("p", "i2sum fine", `守り：防御 ${a ? a.def || 0 : 0}${a && a.agi ? `・身のこなし ${G.sign(a.agi)}` : ""}`);
    box.append(sum);
    return box;
  }

  // ---------------------------------------------------------------- 持ち物の行のボタン
  function invButtons() {
    const S = G.S;
    const sec = $$("#sheet details.ssec").find((d) => /^持ち物/.test(($("summary", d) || {}).textContent || ""));
    if (!sec) return;
    const ids = Object.keys(S.inv || {});
    const lis = $$("ul.inv > li", sec);
    if (lis.length !== ids.length) return;
    lis.forEach((li, i) => {
      const id = ids[i];
      const it = D.ITEMS[id];
      const slots = it ? X.slotsFor(id) : [];
      if (!slots.length) return;
      const old = $$(":scope > button.btn", li).filter((b) => /^(装備|外す)$/.test(b.textContent));
      const anchor = old[0] || li.querySelector(":scope > .i2more");
      const add = (b) => { if (anchor) li.insertBefore(b, anchor); else li.append(b); };
      const s = X.slotOf(id);
      const twoH = X.blocked(S);
      const moves = (k) => X.plan(id, k).map((m) => (D.ITEMS[m] || {}).name).filter(Boolean);
      const tip = (k) => { const m = moves(k); return m.length ? `${m.join("と")}は荷物に戻る` : ""; };
      if (s === "hand") {
        if (X.hands(id) === 2) add(btn("両手で持つ", () => G.equip(id, "weapon"), tip("weapon")));
        else {
          add(btn("右手に", () => G.equip(id, "weapon"), tip("weapon")));
          if (slots.includes("off")) add(btn("左手に", () => G.equip(id, "off"), tip("off")));
        }
      } else if (s === "acc") {
        const e1 = !S.ring, e2 = !S.ring2;
        if (e1 || e2) add(btn("装備", () => G.equip(id, e1 ? "ring" : "ring2")));
        else { add(btn("1と替える", () => G.equip(id, "ring"), tip("ring"))); add(btn("2と替える", () => G.equip(id, "ring2"), tip("ring2"))); }
      } else if (s === "off") add(btn(twoH ? "左手に（両手の武器は外す）" : "左手に", () => G.equip(id, "off"), tip("off")));
      else add(btn("装備", () => G.equip(id, X.defaultSlot(id)), tip(X.defaultSlot(id))));
      // 品の行に、入る枠を小さく
      const nm = li.querySelector(":scope > span");
      if (nm && !li.querySelector(".i2where")) nm.after(h("span", "i2where", s === "hand" ? (X.hands(id) === 2 ? "両手" : "片手") : X.KIND[s]));
      old.forEach((b) => b.remove());
    });
  }

  function paintGear() {
    const S = G.S;
    if (!S) return;
    const pane = $("#spane-gear");
    if (!pane) return;
    const kv = pane.querySelector(":scope > dl.kv");
    if (kv) kv.replaceWith(doll());
    invButtons();
  }

  const baseRender = ui.render;
  ui.render = (...a) => {
    const r = baseRender(...a);
    try { paintGear(); } catch {}
    return r;
  };
})(globalThis.G = globalThis.G || {});
