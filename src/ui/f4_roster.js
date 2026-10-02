// F4：図鑑の人物に「会ったことのある場所」「仲間にする方法」「次の冒険で狙う」印と、手引きの図鑑の進み具合。描くだけ（中身は engine/zz_f4_roster.js）。
// f2_codex.js の差し込み口（F2.peopleSum・F2.personCell・F2.personMore・F2.personUnknown）と、G.ui.buildWorld を包む。見た目は ui/f4_roster.css。
// レーン F＋C（F4）
(function (G) {
  if (typeof document === "undefined") return;
  const D = G.data;
  const F2 = (G.f2 = G.f2 || {});
  const F4 = (G.f4 = G.f4 || {});
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const saveSoon = () => { if (G.onCodexChange) try { G.onCodexChange(); } catch {} };

  // 一覧の上の数：仲間にした人
  F2.peopleSum = (sum) => {
    const n = G.f4Count();
    sum.textContent += `・仲間にした人 ${n.joined}／${n.joinable}` + (n.want ? `・狙う人 ${n.want}` : "");
  };

  // 格子：狙う印と、噂だけ聞いた人
  F2.personCell = (b, id) => {
    if (F4.wanted(id)) { b.classList.add("f4want"); b.append(h("span", "f4star", "狙う")); }
    const rec = G.codexPerson(id);
    const heard = !rec && F4.profile().heard[id];
    if (heard) {
      b.classList.add("f4heard");
      b.append(h("span", "f2tier", "噂"));
      b.setAttribute("aria-label", "噂だけ聞いた人");
      b.onclick = () => {
        const det = document.querySelector("#dlgCodex .f2detail");
        if (det) { F2.personUnknown(det, id); if (window.matchMedia && window.matchMedia("(max-width: 760px)").matches) det.scrollIntoView({ block: "start", behavior: "smooth" }); }
      };
    }
  };

  // 狙う／やめるのボタン
  const wantBox = (id, redraw) => {
    if (!F4.joinable(id)) return null;
    const box = h("div", "f4wantbox");
    const on = F4.wanted(id);
    const b = h("button", "btn" + (on ? " on" : ""), on ? "狙うのをやめる" : "次の冒険で狙う");
    b.type = "button";
    b.setAttribute("aria-pressed", String(on));
    const full = !on && F4.wantCount() >= F4.WANT_MAX;
    b.disabled = full || (!on && !F4.canWant(id));
    b.onclick = () => {
      F4.setWant(id, !on);
      saveSoon();
      const cellEl = document.querySelector(`#dlgCodex .f2cell[data-id="${id}"]`);
      if (cellEl) { cellEl.classList.toggle("f4want", !on); cellEl.querySelectorAll(".f4star").forEach((x) => x.remove()); if (!on) cellEl.append(h("span", "f4star", "狙う")); }
      const sum = document.querySelector("#dlgCodex .f2sum");
      if (sum) { const c = G.codexCount(); sum.textContent = `出会った人 ${c.people}／${c.peopleAll}`; F2.peopleSum(sum); }
      redraw();
    };
    box.append(b, h("p", "fine", full ? `狙えるのは${F4.WANT_MAX}人まで。` : "印を付けた人は、次からの冒険で世界に居ることが多くなり、居場所の噂も耳に入りやすくなる。必ず居るとは限らない。"));
    return box;
  };

  const section = (title) => { const s = h("div", "f2where f4how"); s.append(h("h4", "", title)); return s; };

  // 詳しい説明：会ったことのある場所・仲間にする方法・狙う
  F2.personMore = (detail, id) => {
    const at = F4.metPlaces(id);
    if (at.length) { const s = section("会ったことのある場所"); const ul = h("ul"); at.forEach((t) => ul.append(h("li", "", t))); s.append(ul); detail.append(s); }
    const how = G.f4How(id);
    if (!how) return;
    const rec = G.codexPerson(id);
    const s = section("仲間にする方法");
    if (rec && rec.joined) {
      how.ways.forEach((w, k) => {
        if (how.ways.length > 1) s.append(h("p", "fine f4way", `その${"一二三"[k] || k + 1}`));
        const ol = h("ol", "f4steps");
        w.forEach((t) => ol.append(h("li", "", t)));
        s.append(ol);
      });
      if (rec.via) { const e = D.EVENTS.find((x) => x.id === rec.via); if (e) s.append(h("p", "fine", `かつて、出来事「${e.title}」で仲間にした。`)); }
      if (how.after) s.append(h("p", "fine", how.after));
    } else {
      s.append(h("p", "f4vague", how.vague));
      s.append(h("p", "fine", "一度仲間にすれば、確かな道すじがここに残る。"));
    }
    if (G.S && G.S.f4 && !F4.present(id, G.S) && (G.S.f4.heard || {})[id]) s.append(h("p", "fine f4gone", "この冒険では、遠くへ行ってしまったらしい。"));
    detail.append(s);
    const draw = () => { detail.querySelectorAll(".f4wantbox").forEach((x) => x.remove()); const n = wantBox(id, draw); if (n) detail.append(n); };
    draw();
  };

  // 会っていないが噂は聞いた人
  F2.personUnknown = (detail, id) => {
    const how = G.f4How(id);
    if (!how || !how.heard) return false;
    detail.textContent = "";
    detail.append(h("span", "f2glyph f2who", "？"), h("p", "fine c3role", F4.titleOf(id)), h("h3", "f2title", "噂の人"));
    const s = section("噂");
    s.append(h("p", "f4vague", how.heard));
    s.append(h("p", "fine", "会えば、名前と会える場所が分かる。"));
    detail.append(s);
    const draw = () => { detail.querySelectorAll(".f4wantbox").forEach((x) => x.remove()); const n = wantBox(id, draw); if (n) detail.append(n); };
    draw();
    return true;
  };

  // ---------------------------------------------------------------- 世界の手引き：図鑑の進み具合と、この冒険で聞いた噂
  if (G.ui && G.ui.buildWorld) {
    const baseBuild = G.ui.buildWorld;
    G.ui.buildWorld = () => {
      baseBuild();
      const body = document.querySelector("#worldBody");
      if (!body) return;
      const c = G.codexCount ? G.codexCount() : null;
      const n = G.f4Count();
      const box = h("section", "f4progress");
      box.append(h("h3", "", "図鑑の進み具合"));
      const dl = h("dl", "f4prog");
      const row = (k, a, b) => {
        const dd = h("dd");
        const bar = h("span", "f4bar");
        const fill = h("span", "f4fill");
        fill.style.width = `${b ? Math.round((a / b) * 100) : 0}%`;
        bar.append(fill);
        dd.append(h("span", "", `${a}／${b}`), bar);
        dl.append(h("dt", "", k), dd);
      };
      row("出会った人", n.people, n.peopleAll);
      row("仲間にした人", n.joined, n.joinable);
      if (c) { row("アイテム", c.items, c.itemsAll); row("魔物", c.foes, c.foesAll); row("用語", c.lore, c.loreAll); }
      box.append(dl);
      const S = G.S;
      if (S && S.f4) {
        const heard = Object.keys(S.f4.heard || {});
        box.append(h("p", "fine", `この冒険では、仲間になりうる人のうち、一部だけが世界のどこかに居る。誰が居るかは、酒場の噂やギルドの尋ね人の貼り紙で少しずつ分かる。${n.want ? `狙っている人：${Object.keys(F4.profile().want).map((id) => F2.personName(id)).join("・")}` : ""}`));
        if (heard.length) {
          const ul = h("ul", "f4heardlist");
          heard.forEach((id) => {
            const met = G.c2Met && G.c2Met(id, S);
            ul.append(h("li", "", `${met ? F2.personName(id) : F4.titleOf(id)}：${!F4.present(id, S) ? "この冒険では噂を聞かない" : F4.fill("{place}のあたり", id, S)}`));
          });
          box.append(h("h4", "", "この冒険で聞いた尋ね人の噂"), ul);
        }
      }
      body.prepend(box);
    };
  }
})(globalThis.G = globalThis.G || {});
