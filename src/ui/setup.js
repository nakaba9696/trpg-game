// タイトルとキャラクター作成：タイトル → 人物（一画面でまとめて選ぶ）→ 能力値（何度でも振り直し・ボーナス点）→ キャラクターシート → 導入 → 冒険。
// 決まり（おまかせ・振る・ボーナス点・導入の文）は engine/u5_creation.js の G.cre。ここは画面だけ。
// 作成画面の乱数は Math.random（CLAUDE.md の例外）。レーン U（画面）が管理
(function (G) {
  const D = G.data;
  const cre = G.cre;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const btn = (label, cls, fn, fid) => { const b = h("button", "btn" + (cls ? " " + cls : ""), label); b.type = "button"; b.onclick = fn; if (fid) b.dataset.fid = fid; return b; };
  const R = Math.random;
  const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
  const signed = (n) => (n > 0 ? "+" + n : n < 0 ? "−" + -n : "±0");
  const KANJI = ["一", "二", "三", "四", "五", "六", "七", "八"];

  // 音（ui/sound.js があれば鳴らす。無い名前は次の候補へ。ボタンの「click」は sound.js がどのボタンでも鳴らす）
  const sfx = (...names) => {
    const s = G.sound;
    if (!s || !s.play) return;
    const n = names.find((x) => !s.names || s.names.includes(x));
    if (n) s.play(n);
  };

  const setup = (G.setup = {});
  let draft = null;
  let step = "title";
  let opts = null;   // 旅立つ人物（確認のあと）
  let page = 0;      // 導入のページ
  let rolledNow = false;

  // 主人公の絵は出さない（A10。持ち主の決定）
  // 種族の呼び名（R1。無ければ出さない）
  const raceName = (d) => (G.r1Name ? G.r1Name({ profile: { race: d.race, beast: d.beast } }) : "");

  const go = (s) => { step = s; setup.show(); window.scrollTo({ top: 0 }); };

  // ---------------------------------------------------------------- 入口
  setup.show = (o) => {
    o = o || {};
    if (o.step) step = o.step;
    if (o.fresh) draft = null;
    if (!draft) draft = cre.fresh(R);
    const root = $("#setup");
    const fid = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fid : "";
    root.dataset.step = step;
    root.textContent = "";
    ({ title, person, stats, sheet, prologue })[step](root);
    // 描き直しても、押していたボタンに手元を戻す（キーボードで続けて押せるように）
    if (fid) { const el = root.querySelector(`[data-fid="${fid}"]`); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  };

  function head(root, title, fine) {
    const h2 = h("h2", "", title);
    if (fine) h2.append(h("span", "fine", fine));
    root.append(h2);
  }
  function steps(root, i) {
    const ol = h("ol", "creSteps");
    ["人物", "能力値", "確認"].forEach((s, j) => { const li = h("li", j === i ? "on" : j < i ? "done" : "", s); if (j === i) li.setAttribute("aria-current", "step"); ol.append(li); });
    root.append(ol);
  }

  // ---------------------------------------------------------------- 1. タイトル
  function title(root) {
    root.append(h("div", "titleHero")); // 題も副題も置かない（持ち主の決定 #56・N1）。背景の絵を見せる余白だけ

    const menu = h("div", "titleMenu");
    const live = G.S && !G.S.over && G.S.profile;
    menu.append(btn("はじめる", "primary", () => { opts = null; go("person"); }, "t-start"));
    if (live) {
      const c = btn("つづきから", "", () => G.main.resume(), "t-cont");
      c.append(h("small", "", `${G.S.clsName} ${G.S.profile.name}・${G.dateOf ? G.dateOf(G.S.day) : G.S.day + "日目"}`));
      menu.append(c);
    }
    // 墓碑・トロフィー（記録）は右上から開ける（U10）。タイトルは「はじめる」と、保存があるときの「つづきから」だけ
    root.append(menu);
    if (live) root.append(h("p", "fine center", "「はじめる」で新しい者が旅立つと、つづきの冒険は消える。"));
  }

  // ---------------------------------------------------------------- 2. 人物（一画面でまとめて）
  function person(root) {
    steps(root, 0);
    const top = h("div", "creHead");
    head(top, "あなたは何者か", "選ぶと、その場で姿が変わる");
    top.append(btn("全部おまかせ", "primary", () => { const s = draft.customGoal; draft = cre.fresh(R); if (cre.randomRace) cre.randomRace(draft, R); draft.customGoal = s; sfx("dice", "coin"); setup.show(); }, "p-all"));
    root.append(top);

    const lay = h("div", "cre2");
    // 姿と短い説明（スマホでは上）
    const card = h("aside", "whoCard");
    const txt = h("div", "whoTxt");
    card.append(txt);
    function refresh() {
      const c = D.CLASSES[draft.cls], a = D.AGES[draft.ageBand], o = D.ORIGINS[draft.origin];
      txt.textContent = "";
      txt.append(h("b", "whoName", draft.profile.name || "（名無し）"));
      txt.append(h("span", "whoLine", `${c.name}・${[raceName(draft), draft.sex].filter(Boolean).join("・")}・${a.name}（${draft.profile.age || "?"}歳）・${o.short}生まれ`));
      txt.append(h("span", "", c.blurb));
      txt.append(h("span", "fine", `得意：${cre.strengths(draft.cls).join("・")} ／ 出発地：${D.LOCS[c.start].name}`));
      if (oBlurb) oBlurb.textContent = `${o.blurb}（${modText(o.mod)}）`;
      if (aBlurb) aBlurb.textContent = `${a.blurb}（${modText(a.mod)}${cre.ageRange ? `、${cre.ageRange(draft).join("〜")}歳` : ""}）`;
    }
    lay.append(card);

    const form = h("div", "creForm");
    let oBlurb = null, aBlurb = null;
    const setVal = (k) => { const el = form.querySelector("#pf-" + k); if (el) el.value = draft.profile[k] || ""; };

    // 名前・性別・年齢
    const s1 = h("section", "creSec");
    s1.append(h("h3", "", "名前・性別・年齢"));
    s1.append(fieldEl("name", "名前", "input", refresh));
    const row = h("div", "creRow");
    row.append(segEl("性別", "sex", [["男", "男"], ["女", "女"]], draft.sex, (v) => { cre.setSex(draft, v, R); setVal("name"); refresh(); }));
    row.append(segEl("年齢", "age", Object.entries(D.AGES).map(([id, a]) => [id, a.name]), draft.ageBand, (v) => { cre.setAge(draft, v, R); setVal("age"); refresh(); }));
    const ageF = h("div", "field ageNum");
    const al = h("label", "", "歳"); al.htmlFor = "pf-age";
    const ai = h("input"); ai.id = "pf-age"; ai.inputMode = "numeric"; ai.maxLength = 3; ai.value = draft.profile.age || "";
    ai.oninput = () => { draft.profile.age = ai.value.replace(/[^0-9]/g, ""); refresh(); };
    ageF.append(al, ai);
    row.append(ageF);
    s1.append(row);
    aBlurb = h("p", "fine");
    s1.append(aBlurb);
    form.append(s1);

    // 種族（R1）。獣人なら元の獣も選ぶ
    if (D.RACES && cre.setRace) form.append(raceSec());

    // 生まれ
    const s2 = h("section", "creSec");
    s2.append(h("h3", "", "生まれ"));
    const chips = h("div", "chips");
    chips.setAttribute("role", "radiogroup");
    chips.setAttribute("aria-label", "生まれ");
    Object.entries(D.ORIGINS).forEach(([id, o]) => {
      const l = h("label", "chip");
      const inp = h("input"); inp.type = "radio"; inp.name = "origin"; inp.value = id; inp.checked = draft.origin === id;
      inp.onchange = () => { cre.setOrigin(draft, id, R); setVal("name"); refresh(); };
      l.append(inp, document.createTextNode(o.name));
      chips.append(l);
    });
    s2.append(chips);
    oBlurb = h("p", "fine");
    s2.append(oBlurb);
    form.append(s2);

    // 職業
    const s3 = h("section", "creSec");
    s3.append(h("h3", "", "職業"));
    const cards = h("div", "cards compact");
    Object.entries(D.CLASSES).forEach(([id, c]) => {
      const l = h("label", "card");
      const inp = h("input"); inp.type = "radio"; inp.name = "cls"; inp.value = id; inp.checked = draft.cls === id;
      inp.onchange = () => {
        const oldOrigin = draft.origin;
        cre.setClass(draft, id, R);
        setVal("name"); setVal("history");
        if (draft.origin !== oldOrigin) { const r = form.querySelector(`input[name=origin][value=${draft.origin}]`); if (r) r.checked = true; }
        refresh();
      };
      l.append(inp, h("b", "", c.name), h("span", "", c.blurb), h("span", "fine", `得意：${cre.strengths(id).join("・")}`));
      cards.append(l);
    });
    s3.append(cards);
    form.append(s3);

    // 目的
    const s4 = h("section", "creSec");
    const g3 = h("h3", "", "目的");
    g3.append(h("span", "fine", "果たすとトロフィー「宿願成就」。その後も冒険は続けられる"));
    s4.append(g3);
    const gcards = h("div", "cards compact");
    const cg = h("div", "field");
    Object.entries(D.GOALS).forEach(([id, g]) => {
      const l = h("label", "card");
      const inp = h("input"); inp.type = "radio"; inp.name = "goal"; inp.value = id; inp.checked = draft.goal === id;
      inp.onchange = () => { draft.goal = id; cg.hidden = id !== "custom"; };
      l.append(inp, h("b", "", g.name), h("span", "", g.hint));
      gcards.append(l);
    });
    s4.append(gcards);
    cg.hidden = draft.goal !== "custom";
    const cgl = h("label", "", "自分で決めた目的"); cgl.htmlFor = "customGoal";
    const cgi = h("input"); cgi.id = "customGoal"; cgi.maxLength = 80; cgi.placeholder = "生き別れの妹を探し出し、村を焼いた男に報いを受けさせる";
    cgi.value = draft.customGoal || "";
    cgi.oninput = () => { draft.customGoal = cgi.value; };
    cg.append(cgl, cgi);
    s4.append(cg);
    form.append(s4);

    // 生い立ち・特徴
    const s5 = h("section", "creSec");
    const t3 = h("h3", "", "生い立ち・特徴");
    t3.append(btn("特徴をおまかせ", "small", () => { cre.randomTraits(draft, R); cre.TRAITS.forEach(setVal); refresh(); }, "p-traits"));
    s5.append(t3);
    const grid = h("div", "grid2");
    [["look", "外見", "input"], ["history", "生い立ち", "textarea"]]
      .forEach(([k, label, type]) => grid.append(fieldEl(k, label, type, refresh)));
    const hi = grid.querySelector("#pf-history");
    if (hi) hi.placeholder = "空けておいてもよい（「振る」でおまかせ）";
    s5.append(grid);
    form.append(s5);

    lay.append(form);
    root.append(lay);

    const nav = h("div", "creNav");
    nav.append(btn("タイトルへ", "", () => go("title")), btn("次へ：能力値を振る", "primary", () => go("stats"), "p-next"));
    root.append(nav);
    refresh();
  }

  // 種族の欄：人間・エルフ・獣人。獣人なら元の獣（おまかせ可）。選ぶと名前と歳が種族に合わせて変わる
  function raceSec() {
    const sec = h("section", "creSec raceSec");
    sec.append(h("h3", "", "種族"));
    const radios = (name, label, list, cur, fn) => {
      const box = h("div", "chips");
      box.setAttribute("role", "radiogroup");
      box.setAttribute("aria-label", label);
      list.forEach(([id, text]) => {
        const l = h("label", "chip");
        const inp = h("input"); inp.type = "radio"; inp.name = name; inp.value = id; inp.checked = cur === id;
        inp.onchange = () => { fn(id); setup.show(); };
        l.append(inp, document.createTextNode(text));
        box.append(l);
      });
      return box;
    };
    const race = draft.race || "human";
    sec.append(radios("race", "種族", Object.entries(D.RACES).map(([id, r]) => [id, r.name]), race, (id) => cre.setRace(draft, id, R)));
    const sp = G.r1Spec({ race, beast: draft.beast });
    if (race === "beast") {
      const bl = h("div", "field beastPick");
      bl.append(h("span", "flabel", "元になった獣"));
      bl.append(radios("beast", "元になった獣", [["auto", "おまかせ"], ...D.BEAST_KEYS.map((k) => [k, D.BEASTS[k].name])], draft.beast, (id) => cre.setBeast(draft, id, R)));
      sec.append(bl);
    }
    const B = race === "beast" ? D.BEASTS[draft.beast] : null;
    const tr = G.r1Traits({ race, beast: draft.beast });
    const tal = sp.talents.map((k) => (D.TALENTS && D.TALENTS[k] ? D.TALENTS[k].name : k));
    const lines = [
      D.RACES[race].blurb + (B ? `${B.name}の獣人は、${B.blurb}` : ""),
      `能力値：${modText(sp.mod)}${tal.length ? ` ／ 才の付きやすい技能：${tal.join("・")}` : ""}${sp.ages ? ` ／ 年齢 ${sp.ages.young[0]}〜${sp.ages.old[1]}歳` : ""}`,
    ];
    if (B) lines.push(`気性：${B.temper}`);
    if (tr.length) lines.push(`特性：${tr.map((x) => `${x.name}（${x.hint}）`).join("・")}`);
    const gr = G.r1Greet({ race, beast: draft.beast });
    if (gr.length) lines.push(`人の目：${gr.map(([n, v]) => `${n} 魅力${signed(v)}`).join("・")}`);
    lines.forEach((t, i) => sec.append(h("p", i ? "fine" : "fine raceBlurb", t)));
    return sec;
  }

  const modText = (m) => { const s = Object.entries(m || {}).filter(([, v]) => v).map(([k, v]) => `${k}${signed(v)}`); return s.length ? s.join(" ") : "補正なし"; };

  function segEl(label, name, list, cur, fn) {
    const f = h("div", "field");
    f.append(h("span", "flabel", label));
    const seg = h("div", "seg");
    seg.setAttribute("role", "radiogroup");
    seg.setAttribute("aria-label", label);
    list.forEach(([v, text]) => {
      const l = h("label");
      const inp = h("input"); inp.type = "radio"; inp.name = name; inp.value = v; inp.checked = cur === v;
      inp.onchange = () => fn(v);
      l.append(inp, document.createTextNode(text));
      seg.append(l);
    });
    f.append(seg);
    return f;
  }

  function fieldEl(key, label, type, after) {
    const f = h("div", "field");
    const lab = h("label", "", label);
    lab.htmlFor = "pf-" + key;
    f.append(lab);
    const row = h("div", "row");
    const inp = h(type === "textarea" ? "textarea" : "input");
    inp.id = "pf-" + key;
    inp.maxLength = type === "textarea" ? 160 : 60;
    inp.value = draft.profile[key] || "";
    inp.oninput = () => { draft.profile[key] = inp.value; after(); };
    const b = btn("振る", "small", () => { inp.value = draft.profile[key] = cre.gen(draft, key, R); after(); });
    b.setAttribute("aria-label", `${label}をおまかせで作り直す`);
    row.append(inp, b);
    f.append(row);
    return f;
  }

  // ---------------------------------------------------------------- 3. 能力値（何度でも振り直す）
  const PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  function die(n) {
    const d = h("span", "pipDie");
    for (let i = 0; i < 9; i++) d.append(h("i", PIPS[n - 1].includes(i) ? "on" : ""));
    return d;
  }
  const setDie = (d, n) => [...d.children].forEach((p, i) => p.classList.toggle("on", PIPS[n - 1].includes(i)));

  function stats(root) {
    steps(root, 1);
    head(root, "能力値", "何度でも振り直せる。ボーナス点の数は振るたびに変わり、ときどき大当たりが出る。足したボーナスは振り直しても残る");

    const bar = h("div", "rollBar");
    const who = h("div", "rollWho");
    const c = D.CLASSES[draft.cls];
    const st = cre.final(draft);
    const wt = h("div");
    wt.append(h("b", "", draft.profile.name || "（名無し）"), h("span", "fine", `${[c.name, raceName(draft), D.AGES[draft.ageBand].name].filter(Boolean).join("・")}・${D.ORIGINS[draft.origin].short}生まれ`));
    who.append(wt);
    const tray = h("div", "tray");
    tray.setAttribute("aria-hidden", "true");
    const dice = [die(1 + Math.floor(R() * 6)), die(1 + Math.floor(R() * 6)), die(1 + Math.floor(R() * 6))];
    tray.append(...dice);
    const rb = btn("振る", "primary rollBtn", () => { cre.roll(draft, R); rolledNow = true; sfx("dice", "coin"); setup.show(); }, "s-roll");
    const info = h("div", "rollInfo num");
    info.append(h("span", "", `振った回数 ${draft.rolls}`), h("span", "", `これまでの最高 ${draft.best || cre.bonusPoints(draft)} 点`), h("span", "", `合計 ${cre.total(draft)}`), h("span", "", `HP ${G.maxHpOf(st)} ／ MP ${G.maxMpOf(st)}`));
    bar.append(who, tray, rb, info);
    root.append(bar);

    const box = h("section", "box");
    const bh = h("div", "boxhead");
    bh.append(h("b", "", "ボーナス点"));
    // 振ったボーナス点（ふつう・当たり・大当たり）
    const tier = draft.bonusTier || "ふつう";
    const tierCls = { 大当たり: " jackpot", 当たり: " lucky" }[tier] || "";
    const bn = h("span", "bonusRoll num" + tierCls, `${draft.bonusRoll === undefined ? cre.bonusPoints(draft) : draft.bonusRoll} 点`);
    bn.setAttribute("aria-live", "polite");
    bh.append(bn, h("span", "bonusTier" + tierCls, tier === "大当たり" ? "大当たり！" : tier === "当たり" ? "当たり" : "ふつう"));
    const left = cre.bonusLeft(draft);
    bh.append(h("span", "bonusLeft num" + (left ? " has" : ""), `残り ${left} 点`));
    const tb = cre.trophyBonus ? cre.trophyBonus() : 0;
    if (tb) bh.append(h("span", "trophyBonus num", `トロフィーで +${tb}`));
    bh.append(h("span", "fine", "好きな能力値に足す（どの能力値も 24 点まで）。ふつうは 5〜10 点、1 割ほどで 15〜20 点、まれに 25 点を超える"));
    box.append(bh);
    const list = h("div", "statlist creStats num");
    D.STATS.forEach((k) => {
      const row = h("div", "srow" + (rolledNow ? " rolled" : ""));
      row.title = D.STAT_HINT[k];
      const v = cre.value(draft, k);
      const PCT = G.PT();
      const b = h("span", "bar"); const i = h("i"); i.style.width = v * PCT + "%"; b.append(i);
      const pm = h("span", "pm");
      const minus = btn("−", "small", () => { cre.addBonus(draft, k, -1); setup.show(); }, "m-" + k);
      minus.setAttribute("aria-label", `${k}のボーナスを1戻す`);
      minus.disabled = !cre.canSub(draft, k);
      const plus = btn("＋", "small", () => { cre.addBonus(draft, k, 1); setup.show(); }, "p-" + k);
      plus.setAttribute("aria-label", `${k}にボーナスを1足す`);
      plus.disabled = !cre.canAdd(draft, k);
      pm.append(minus, h("span", "bn", draft.bonus[k] ? "+" + draft.bonus[k] : "0"), plus);
      const m = cre.modParts(draft, k);
      const det = h("span", "det");
      det.append(h("span", "", `職業 ${draft.rolled[k]}`));
      if (m.age) det.append(h("span", m.age > 0 ? "plus" : "minus", `年齢 ${signed(m.age)}`));
      if (m.origin) det.append(h("span", m.origin > 0 ? "plus" : "minus", `生まれ ${signed(m.origin)}`));
      if (m.race) det.append(h("span", m.race > 0 ? "plus" : "minus", `種族 ${signed(m.race)}`));
      if (draft.bonus[k]) det.append(h("span", "plus", `ボーナス +${draft.bonus[k]}`));
      det.append(h("span", "", `成功率 ${v * PCT}%`));
      row.append(h("span", "nm", k), h("span", "v", String(v)), b, pm, det);
      list.append(row);
    });
    box.append(list);
    box.append(h("p", "fine", `1 点が成功率の基準 ${G.PT()}％（12 点なら ${12 * G.PT()}％）。使った能力値は、冒険の中で伸びていく（24 点まで）。能力の名前に触れると説明が出る。`));
    root.append(box);
    if (G.m8ui) root.append(G.m8ui.creBox(cre.talents(draft), cre.flavors && cre.flavors(draft)));

    const nav = h("div", "creNav");
    const next = btn("次へ：確かめる", "primary", () => go("sheet"), "s-next");
    nav.append(btn("人物に戻る", "", () => go("person")), next);
    if (left > 0) nav.append(h("span", "fine", `ボーナスが ${left} 点残っている`));
    root.append(nav);
    // 振った瞬間の小さな演出
    if (rolledNow) {
      rolledNow = false;
      if (!reduced()) {
        tray.classList.add("tumble");
        let n = 0;
        const t = setInterval(() => { dice.forEach((d) => setDie(d, 1 + Math.floor(R() * 6))); if (++n >= 6) { clearInterval(t); tray.classList.remove("tumble"); } }, 60);
      }
    }
  }

  // ---------------------------------------------------------------- 4. キャラクターシート（確認）
  function sheet(root) {
    steps(root, 2);
    head(root, "この者で旅立つか", "戻って直すこともできる");
    const o = cre.options(draft, R);
    const p = o.profile, c = D.CLASSES[o.cls];
    const paper = h("article", "charSheet");
    const top = h("header", "csTop");
    const nm = h("div");
    nm.append(h("b", "csName", p.name), h("span", "csLine", `${[c.name, raceName(draft), p.sex].filter(Boolean).join("・")}・${p.age}歳（${D.AGES[p.ageBand].name}）・${D.ORIGINS[p.origin].name}生まれ`));
    nm.append(h("span", "csLine", `目的：${o.goalText}`));
    top.append(nm);
    paper.append(top);

    const cols = h("div", "csCols");
    const stl = h("div", "statlist num");
    D.STATS.forEach((k) => {
      const r = h("div", "stat");
      const b = h("span", "bar"); const i = h("i"); i.style.width = o.stats[k] + "%"; b.append(i);
      r.append(h("span", "nm", k), h("span", "v", String(G.pt(o.stats[k]))), b, h("span", "cap", `${o.stats[k]}%`));
      stl.append(r);
    });
    const sb = h("section");
    sb.append(h("h3", "", "能力値"), stl, h("p", "fine num", `HP ${G.maxHpOf(o.stats)} ／ MP ${G.maxMpOf(o.stats)} ／ 所持金 ${c.gold}G`));
    if (G.m8ui && o.talents) sb.append(G.m8ui.sheetPart(o.talents, o.flavors));
    const it = (id) => (D.ITEMS[id] ? D.ITEMS[id].name : id);
    const gear = [c.weapon, c.armor].filter(Boolean).map(it).concat(Object.entries(c.items).map(([id, n]) => `${it(id)}${n > 1 ? "×" + n : ""}`));
    sb.append(h("h3", "", "持ち物"), h("p", "csGear", gear.join("、")));
    const dl = h("dl", "kv csKv");
    const rrows = G.r1Rows ? G.r1Rows({ profile: p }).filter(([k]) => k !== "種族") : [];
    [["出発地", D.LOCS[c.start].name], ...rrows, ["外見", p.look], ["生い立ち", p.history]]
      .forEach(([k, v]) => { if (!v) return; dl.append(h("dt", "", k), h("dd", "", v)); });
    const pb = h("section");
    pb.append(h("h3", "", "人物"), dl);
    cols.append(sb, pb);
    paper.append(cols);
    root.append(paper);

    const nav = h("div", "creNav");
    nav.append(btn("人物を直す", "", () => go("person")), btn("能力値を直す", "", () => go("stats")),
      btn("この者で旅立つ", "primary", () => { opts = o; page = 0; go("prologue"); }, "c-go"));
    root.append(nav);
    root.append(h("p", "fine", "普段の行動は Claude を使わない（利用量はかからない）。自由入力で「GM に任せる」を選んだときだけ使う。"));
  }

  // ---------------------------------------------------------------- 5. 導入（ページをめくる）
  function prologue(root) {
    if (!opts) { step = "sheet"; sheet(root); return; }
    const pages = cre.prologue(opts);
    page = Math.max(0, Math.min(page, pages.length - 1));
    const book = h("article", "book");
    book.setAttribute("aria-live", "polite");
    const pg = h("div", "bookPage" + (reduced() ? "" : " turn"));
    pages[page].forEach((t) => pg.append(h("p", "", t)));
    book.append(pg, h("div", "folio", `── ${KANJI[page]} ──`));
    root.append(book);
    const last = page === pages.length - 1;
    const nav = h("div", "creNav bookNav");
    const begin = () => { const o = opts; opts = null; draft = null; step = "title"; sfx("depart", "page"); G.main.start(o); };
    if (!last) nav.append(btn("とばす", "", begin));
    if (page > 0) nav.append(btn("前のページ", "", () => { page--; sfx("page"); setup.show(); }, "b-prev"));
    nav.append(last ? btn("旅立つ", "primary", begin, "b-go") : btn("ページをめくる", "primary", () => { page++; sfx("page"); setup.show(); }, "b-next"));
    root.append(nav);
  }
})(globalThis.G = globalThis.G || {});
