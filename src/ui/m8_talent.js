// M8：才（技能ごとの才能）を画面に出す部品。決まりは src/engine/zm8_talent.js、表は src/data/m8_talents.js。
// ui.js（シート・仲間・墓碑）と setup.js（能力値の画面・確認のシート）から呼ぶ。レーン U（M8）
(function (G) {
  const D = G.data;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const M = (G.m8ui = {});

  // 才の一覧（技能・印・段階の呼び名）。Lv0 は薄く
  M.list = (t) => {
    const box = h("div", "m8tal");
    D.TALENT_KEYS.forEach((k) => {
      const lv = t[k] || 0;
      const L = D.TALENT_LV[lv];
      const row = h("div", "m8row lv" + lv);
      row.title = D.TALENTS[k].hint;
      const pips = h("span", "m8pips");
      pips.setAttribute("aria-hidden", "true");
      for (let i = 1; i <= 3; i++) pips.append(h("i", i <= lv ? "on" : ""));
      row.append(h("span", "nm", D.TALENTS[k].name), pips, h("span", "lvn", L.name));
      row.setAttribute("aria-label", `${D.TALENTS[k].name}：${L.name}`);
      box.append(row);
    });
    return box;
  };

  // 暮らしの才（判定には効かない。持っているものだけ）
  M.flavors = (f) => {
    const keys = G.m8FlavorList ? G.m8FlavorList(f) : [];
    const p = h("p", "m8fl");
    p.append(h("span", "lab", "暮らしの才"));
    if (!keys.length) p.append(h("span", "fine", "これといって無い"));
    keys.forEach((k) => {
      const lv = f[k];
      const chip = h("span", "m8chip lv" + lv, D.FLAVORS[k].name);
      if (lv >= 2) chip.append(h("small", "", lv >= 3 ? "百年に一人" : "抜きん出る"));
      p.append(chip);
    });
    return p;
  };

  // 作成の能力値の画面（振り直すと揺れる）
  M.creBox = (t, f) => {
    const sec = h("section", "box m8box");
    const bh = h("div", "boxhead");
    bh.append(h("b", "", "才"), h("span", "fine", "生まれつきの得手。振り直すと才も揺れる。鍵をかけた能力値に結びつく才は残る"));
    sec.append(bh, M.list(t));
    if (f) sec.append(M.flavors(f));
    sec.append(h("p", "fine", "才のある技能は成功しやすく、よく伸びる。才が無くても使えるが、伸びは遅い。抜きん出た才は、結びつく能力値の限界も押し上げる。"));
    return sec;
  };

  // 確認のシートの小見出しと一覧
  M.sheetPart = (t, fl) => {
    const f = document.createDocumentFragment();
    f.append(h("h3", "", "才"), M.list(t));
    if (fl) f.append(M.flavors(fl));
    return f;
  };

  // 冒険中のシートの欄（開閉は ui.js の欄と同じ見た目）
  let open = true;
  M.sheet = () => {
    const S = G.S;
    if (!S || !G.m8Of) return null;
    const t = G.m8Of(S);
    const d = h("details", "ssec");
    d.open = open;
    d.addEventListener("toggle", () => { open = d.open; });
    const room = G.m8Room(S);
    d.append(h("summary", "lab", "才と伸びしろ"), M.list(t), M.flavors(G.m8FlavorsOf(S)), h("p", "fine", `伸びしろ：${room.name}（限界まで あと ${room.n}）`));
    return d;
  };

  // 墓碑に添える一行（墓碑に無ければ、冒険の状態から）
  M.graveLine = (run) => {
    if (!run) return "";
    if (run.talentLine) return run.talentLine;
    return run.m8 && run.m8.t && G.m8GraveLine ? G.m8GraveLine(run.m8.t, run.m8.f) : "";
  };
})(globalThis.G = globalThis.G || {});
