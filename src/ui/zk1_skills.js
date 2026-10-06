// K1・K2：ステータスの「能力」のタブに「戦技」の欄（覚えた戦技・熟練・効き目・気力）と「スキル」の欄（名前・効き目）を足し、新しく覚えた手番に目立つ一行を出す。
// 中身はエンジンの G.k1.view。ui.render のあとに書き足す（ほかの欄の形は変えない。F3 の節目の欄と同じ作り）。レーン U（K1）
(function (G) {
  // 行動の分類（U13）：巻物と手当てはその他、追跡・薬草・野営の稽古は「この地で」、仲間に習うは「仲間」
  if (G.u13 && G.u13.BY_PREFIX) Object.assign(G.u13.BY_PREFIX, { k1scroll: "misc", k1aid: "misc", k1track: "here", k1herb: "here", k1camp: "here", k1comp: "party" });
  const ui = G.ui;
  if (!ui || !ui.render || typeof document === "undefined" || !G.k1) return;
  const K = G.k1;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const open = { k1arts: true, k1skills2: true };

  // 戦技（気力を使う戦闘の技）とスキル（持っているだけで効く・選択肢が現れる）を、別の欄に
  function section(cls, title, rows, empty, rowFn) {
    const d = el("details", "ssec k1skills " + cls);
    d.open = open[cls];
    d.addEventListener("toggle", () => { open[cls] = d.open; });
    d.append(el("summary", "lab", title));
    const list = el("div", "k1list");
    if (!rows.length) list.append(el("p", "k1hint", empty));
    rows.forEach((r) => list.append(rowFn(r)));
    d.append(list);
    return d;
  }
  function paint(S) {
    const pane = document.getElementById("spane-self");
    if (!pane || pane.querySelector(".k1skills")) return;
    const all = K.view(S);
    const arts = all.filter((r) => K.isArt(r.id));
    const skills = all.filter((r) => !K.isArt(r.id));
    const a = section("k1arts", `戦技（${arts.length}）・気力 ${K.ki(S)}/${K.kiMax(S)}`, arts, "まだ戦技を覚えていない。訓練場で稽古する・人に教わる・戦技の巻物を読むと覚えられる。", (r) => {
      const row = el("div", "k1row" + (r.usable ? "" : " k1off"));
      row.append(el("span", "nm", r.name), el("span", "k1lv k1lv" + r.lv, r.lvName));
      const meta = [r.ki ? `気力${r.ki}` : "気力いらず"];
      if (r.style) meta.push(r.style.join("・"));
      if (r.left > 0) meta.push(`次の段まで ${r.left}`);
      row.append(el("span", "k1meta", meta.join("・")), el("span", "k1fx", r.hint));
      return row;
    });
    const b = section("k1skills2", `スキル（${skills.length}）`, skills, "まだスキルを持っていない。稽古・師・巻物のほか、判定で大成功してコツをつかむと身につくこともある。", (r) => {
      const row = el("div", "k1row");
      row.append(el("span", "nm", r.name), el("span", "k1lv", r.kind === "passive" ? "常に効く" : "選択肢"), el("span", "k1meta", ""), el("span", "k1fx", r.hint));
      return row;
    });
    const after = pane.querySelector(".f3marks") || ((pane.querySelector(".statlist") || {}).closest ? pane.querySelector(".statlist").closest("details") : null);
    if (after && after.parentNode === pane) { after.after(a); a.after(b); } else pane.append(a, b);
  }

  // 戦技・スキルを覚えた・熟練の段が上がった手番：能力値の札（U13 の #u13grow）に一行。札が出ていなければ通知で
  let seen = null; // { run, set }（記録は長くなると頭から消えるので、数ではなく行そのものを覚える）
  function announce(S) {
    const lines = (S.log || []).filter((e) => e && e.k === "grow" && e.k1);
    if (!seen || seen.run !== S.id) { seen = { run: S.id, set: new WeakSet(lines) }; return; }
    const fresh = lines.filter((e) => !seen.set.has(e));
    fresh.forEach((e) => seen.set.add(e));
    if (!fresh.length) return;
    setTimeout(() => {
      const box = document.getElementById("u13grow");
      fresh.forEach((e) => {
        const text = String(e.text || "").replace(/。$/, "");
        if (box && !box.hidden) {
          const line = el("div", "k1pop", text);
          const hint = box.querySelector(".u13ghint");
          if (hint) hint.before(line); else box.append(line);
        } else if (ui.toast) {
          const s = (G.data.SKILLS || {})[e.k1];
          const name = s ? `「${s.name}」` : "";
          const art = K.isArt(e.k1);
          if (e.lv != null) ui.toast(art ? "戦技の熟練" : "スキルの熟練", `${name}が${G.data.K1_LV_NAMES[e.lv] || ""}に`);
          else ui.toast(e.learn === "crit" ? "コツをつかんだ" : e.learn === "suffer" ? "耐え抜いて身につけた" : art ? "戦技を覚えた" : "スキルを身につけた", s ? `${name}──${s.hint}` : text);
        }
      });
    }, 0);
  }

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { if (G.S && !G.S.over) { paint(G.S); announce(G.S); } } catch (e) { /* 戦技・スキルの欄が描けなくても遊びは止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
