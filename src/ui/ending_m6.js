// M6 の画面：節目の「ここで物語を終える／旅を続ける」と、終わりの画面（人生の物語・その後・墓碑・年表）。
// ui.js の G.ui.render と G.ui.openChronicle を包むだけ。物語の中身はエンジン（src/engine/ending_m6.js）が作る。
// 見る順番：死の場面（記録）→ 人生の物語 → その後（終えたとき）→ 墓碑 → 年表。墓碑の一覧から後でも読み返せる。
// レーン U（UI）
(function (G) {
  const ui = G.ui;
  if (!ui || typeof document === "undefined") return;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  const css = h("style");
  css.textContent = `
.m6ms { border: 1px solid var(--accent); background: var(--accent-soft); border-radius: 3px; padding: 10px 12px; margin-bottom: 12px; display: grid; gap: 8px; }
.m6ms b { font-family: var(--f-body); font-size: 16px; font-weight: 400; }
.m6ms .row { display: flex; flex-wrap: wrap; gap: 8px; }
.m6story { font-family: var(--f-body); margin-bottom: 14px; }
.m6story h3 { font-family: var(--f-display, var(--f-body)); font-weight: 400; font-size: 18px; margin: 0 0 2px; letter-spacing: .05em; }
.m6story .who { color: var(--muted); font-size: 12.5px; margin: 0 0 8px; }
.m6story p { margin: 0 0 .9em; text-indent: 1em; line-height: 1.9; max-width: 40em; }
.m6story .after { border-top: 1px solid var(--rule); margin-top: 12px; padding-top: 10px; }
.m6story .grave { text-align: center; margin: 14px 0 4px; letter-spacing: .08em; }
.m6story p.who, .m6story p.grave { text-indent: 0; }
`;
  document.head.append(css);

  // ---------------------------------------------------------------- 節目に着いたとき
  const baseRender = ui.render;
  ui.render = (ups) => {
    baseRender(ups);
    const S = G.S;
    const id = S && !S.over && S.mode === "explore" && S.m6 && S.m6.pending;
    const m = id && G.data.M6.MILESTONES.find((x) => x.id === id);
    if (!m) return;
    const box = h("div", "m6ms");
    box.append(h("b", "", `節目：${m.title}`), h("p", "fine", G.data.M6.ASK));
    const row = h("div", "row");
    const end = h("button", "btn primary", "ここで物語を終える"); end.type = "button";
    end.onclick = () => { G.endStory(id); ui.after(); };
    const go = h("button", "btn", "旅を続ける"); go.type = "button";
    go.onclick = () => { G.m6GoOn(); ui.after(); };
    row.append(end, go);
    box.append(row);
    $("#panel").prepend(box);
  };

  // ---------------------------------------------------------------- 人生の物語（年表の前に置く）
  const baseChron = ui.openChronicle;
  ui.openChronicle = (run, fromEnd) => {
    baseChron(run, fromEnd);
    const body = $("#dlgChron .dbody");
    let box = $("#m6Story");
    if (!box) { box = h("section", "m6story"); box.id = "m6Story"; body.prepend(box); }
    box.textContent = "";
    const ended = run.over || run.end;
    const story = ended ? (run.profile ? run.story || G.m6StoryOf(run) : G.m6StoryOf(run)) : null;
    box.hidden = !story;
    if (!story) return;
    const name = run.profile ? run.profile.name : run.name;
    $("#chronTitle").textContent = `${name}の物語`;
    box.append(h("h3", "", "人生の物語"), h("p", "who", `語り手：${story.narrator}`));
    story.life.forEach((p) => box.append(h("p", "", p)));
    if (story.after) {
      const af = h("div", "after");
      af.append(h("h3", "", "その後"));
      story.after.forEach((p) => af.append(h("p", "", p)));
      box.append(af);
    }
    if (story.epitaph) box.append(h("p", "grave", `── ${story.epitaph} ──`));
    body.scrollTop = 0;
  };
})(globalThis.G = globalThis.G || {});
