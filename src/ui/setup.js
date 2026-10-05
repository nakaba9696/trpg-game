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
    // 題名だけを大きく出す（説明文・副題は置かない。持ち主の決定 U15。前の #56・N1 の「題を置かない」を改めた）。題名は D.CRE_TEXT.title
    const hero = h("div", "titleHero");
    const TT = (D.CRE_TEXT || {}).title;
    if (TT) {
      const h1 = h("h1", "titleName");
      h1.append(h("span", "titleLatin", TT.name));
      if (TT.kana) h1.append(h("span", "titleKana", TT.kana));
      hero.append(h1);
    }
    root.append(hero);

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
  // おまかせで全部埋まった状態から始める。「今決めること」（職業・目的・名前と性別・年齢・生まれ）を上に、「あとでもよいこと」（外見・生い立ち）は
  // 畳んで下に置き、開けば直せる。各項目に、ゲームにどう効くかの一行（D.CRE_HINTS）。U15。名前・年齢・生まれを今決めることへ移し、候補から選ぶ形に（U16）
  let laterOpen = false;   // 「あとでもよいこと」を開いているか（描き直しても保つ）
  function person(root) {
    const HN = D.CRE_HINTS || {}, TX = D.CRE_TEXT || {};
    const eff = (k) => h("p", "creEff", HN[k] || "");
    steps(root, 0);
    const top = h("div", "creHead");
    head(top, "あなたは何者か", "おまかせで全部埋まっている。変えたい所だけ変えればよい");
    top.append(btn("全部おまかせ", "primary", () => { const s = draft.customGoal; draft = cre.fresh(R); draft.customGoal = s; sfx("dice", "coin"); setup.show(); }, "p-all"));
    root.append(top);

    // 初めて遊ぶ人（トロフィーも墓碑も無い）には、おまかせで旅立つのを勧める（強制しない）
    if (cre.firstTime && cre.firstTime()) {
      const fn = h("div", "creFirst");
      fn.append(h("p", "", TX.first), btn(TX.firstGo, "", () => { cre.quickFinish(draft); go("sheet"); }, "p-first"));
      root.append(fn);
    }

    const lay = h("div", "cre2");
    // 姿と短い説明（スマホでは上）
    const card = h("aside", "whoCard");
    const txt = h("div", "whoTxt");
    card.append(txt);
    let laterLine = null;
    function refresh() {
      const c = D.CLASSES[draft.cls], a = D.AGES[draft.ageBand], o = D.ORIGINS[draft.origin];
      txt.textContent = "";
      txt.append(h("b", "whoName", draft.profile.name || "（名無し）"));
      txt.append(h("span", "whoLine", `${c.name}・${draft.sex}・${a.name}（${draft.profile.age || "?"}歳）・${o.short}生まれ`));
      // 職業の紹介と得意な能力値・はじめの町は札に出さない（職業のカードと、最後のシートに出る。持ち主の決定）
      if (oBlurb) oBlurb.textContent = `${o.blurb}（${modText(o.mod)}）`;
      if (aBlurb) aBlurb.textContent = `${a.blurb}（${modText(a.mod)}${cre.ageRange ? `、${cre.ageRange(draft).join("〜")}歳` : ""}）`;
      // 畳んであるときも、いま何が入っているかは見える
      if (laterLine) laterLine.textContent = [draft.profile.look, draft.profile.history].filter(Boolean).join("・");
    }
    lay.append(card);

    const form = h("div", "creForm");
    let oBlurb = null, aBlurb = null;
    const setVal = (k) => { const el = form.querySelector("#pf-" + k); if (el) { el.value = draft.profile[k] || ""; if (el.tagName === "TEXTAREA") fitArea(el); } };
    const groupHead = (title, sub, tag) => {
      const gh = h("div", "creGroupHead");
      const t = h("b", "", title);
      if (tag) t.append(h("span", "creLaterTag", tag));
      gh.append(t, h("span", "fine", sub));
      return gh;
    };

    // ================= 今決めること（職業・目的・名前）
    const now = h("div", "creGroup creNow");
    now.append(groupHead(TX.now, TX.nowSub));

    // 職業
    const s3 = h("section", "creSec");
    s3.append(h("h3", "", "職業"), eff("cls"));
    const cards = h("div", "cards compact");
    Object.entries(D.CLASSES).forEach(([id, c]) => {
      const l = h("label", "card");
      const inp = h("input"); inp.type = "radio"; inp.name = "cls"; inp.value = id; inp.checked = draft.cls === id;
      inp.onchange = () => {
        const oldOrigin = draft.origin;
        cre.setClass(draft, id, R);
        drawNames(); setVal("history");
        if (draft.origin !== oldOrigin) { const r = form.querySelector(`input[name=origin][value=${draft.origin}]`); if (r) r.checked = true; }
        refresh();
      };
      l.append(inp, h("b", "", c.name), h("span", "", c.blurb), h("span", "fine", `得意：${cre.strengths(id).join("・")}`));
      cards.append(l);
    });
    s3.append(cards);
    now.append(s3);

    // 目的
    const s4 = h("section", "creSec");
    const g3 = h("h3", "", "目的");
    const gFine = h("span", "fine");
    g3.append(gFine);
    s4.append(g3, eff("goal"));
    const gcards = h("div", "cards compact");
    const cg = h("div", "field");
    const setGoalFine = () => { gFine.textContent = draft.goal === "custom" ? TX.customFine : TX.goalFine; cg.hidden = draft.goal !== "custom"; };
    Object.entries(D.GOALS).forEach(([id, g]) => {
      const l = h("label", "card");
      const inp = h("input"); inp.type = "radio"; inp.name = "goal"; inp.value = id; inp.checked = draft.goal === id;
      inp.onchange = () => { draft.goal = id; setGoalFine(); };
      l.append(inp, h("b", "", g.name), h("span", "", g.hint || g.text));   // 行き先・手順は出さない（目指すことだけ）
      gcards.append(l);
    });
    s4.append(gcards);
    const cgl = h("label", "", "自分で決めた目的"); cgl.htmlFor = "customGoal";
    const cgi = h("input"); cgi.id = "customGoal"; cgi.maxLength = 80; cgi.placeholder = "生き別れの妹を探し出し、村を焼いた男に報いを受けさせる";
    cgi.value = draft.customGoal || "";
    cgi.oninput = () => { draft.customGoal = cgi.value; };
    // ゲームは中身を判定できない。区切りは自分でつける（節目「区切り」・トロフィー「自分で決めた道」に合わせた説明）
    const cn = h("div", "creCustomNote");
    cn.setAttribute("role", "note");
    (TX.custom || []).forEach((t) => cn.append(h("p", "", t)));
    cg.append(cgl, cgi, cn);
    s4.append(cg);
    setGoalFine();
    now.append(s4);

    // 名前（性別と生まれの響きの表から選ぶ。自由入力は無い。「別の候補」で引き直す。U16）
    const s1 = h("section", "creSec creNameSec");
    const n3 = h("h3", "", "名前");
    n3.append(btn("おまかせ", "small", () => { cre.randomPart(draft, "name", R); drawNames(); refresh(); }, "p-name-r"));
    s1.append(n3, eff("name"));
    const sexRow = h("div", "creRow");
    sexRow.append(segEl("性別", "sex", [["男", "男"], ["女", "女"]], draft.sex, (v) => { cre.setSex(draft, v, R); drawNames(); refresh(); }));
    s1.append(sexRow, h("p", "creEff", `性別：${HN.sex || ""}`));
    const nameBox = h("div", "creNames");
    const nameChips = h("div", "chips");
    nameChips.setAttribute("role", "radiogroup");
    nameChips.setAttribute("aria-label", "名前の候補");
    nameBox.append(nameChips, btn("別の候補", "small", () => { cre.drawNames(draft, R); drawNames(); }, "p-name-more"));
    s1.append(nameBox);
    function drawNames() {
      nameChips.textContent = "";
      cre.nameOptions(draft, R).forEach((n) => {
        const l = h("label", "chip");
        const inp = h("input"); inp.type = "radio"; inp.name = "pname"; inp.value = n; inp.checked = draft.profile.name === n;
        inp.onchange = () => { cre.setName(draft, n); refresh(); };
        l.append(inp, document.createTextNode(n));
        nameChips.append(l);
      });
    }
    drawNames();
    now.append(s1);

    // 年齢（区分を選び、その幅の中の歳を選ぶ。U16）
    const s0 = h("section", "creSec");
    const a3 = h("h3", "", "年齢");
    a3.append(btn("おまかせ", "small", () => { cre.randomPart(draft, "age", R); drawAge(); refresh(); }, "p-age-r"));
    s0.append(a3, eff("age"));
    const row = h("div", "creRow");
    const bandSeg = segEl("年頃", "age", Object.entries(D.AGES).map(([id, a]) => [id, a.name]), draft.ageBand, (v) => { cre.setAge(draft, v, R); drawAge(); refresh(); });
    row.append(bandSeg);
    const ageF = h("div", "field ageNum");
    const al = h("label", "flabel", "歳"); al.htmlFor = "pf-age";
    const ai = h("select"); ai.id = "pf-age";
    ai.onchange = () => { cre.setAgeNum(draft, ai.value); refresh(); };
    ageF.append(al, ai);
    row.append(ageF);
    s0.append(row);
    function drawAge() {
      bandSeg.querySelectorAll("input").forEach((i) => { i.checked = i.value === draft.ageBand; });
      ai.textContent = "";
      cre.ageChoices(draft).forEach((n) => { const op = h("option", "", `${n}歳`); op.value = String(n); ai.append(op); });
      ai.value = String(draft.profile.age);
    }
    drawAge();
    aBlurb = h("p", "fine");
    s0.append(aBlurb);
    now.append(s0);

    // 生まれ
    const s2 = h("section", "creSec");
    const o3 = h("h3", "", "生まれ");
    o3.append(btn("おまかせ", "small", () => { cre.randomPart(draft, "origin", R); drawOrigin(); drawNames(); refresh(); }, "p-origin-r"));
    s2.append(o3, eff("origin"));
    const chips = h("div", "chips");
    chips.setAttribute("role", "radiogroup");
    chips.setAttribute("aria-label", "生まれ");
    Object.entries(D.ORIGINS).forEach(([id, o]) => {
      const l = h("label", "chip");
      const inp = h("input"); inp.type = "radio"; inp.name = "origin"; inp.value = id; inp.checked = draft.origin === id;
      inp.onchange = () => { cre.setOrigin(draft, id, R); drawNames(); refresh(); };
      l.append(inp, document.createTextNode(o.name));
      chips.append(l);
    });
    const drawOrigin = () => chips.querySelectorAll("input").forEach((i) => { i.checked = i.value === draft.origin; });
    s2.append(chips);
    oBlurb = h("p", "fine");
    s2.append(oBlurb);
    now.append(s2);
    form.append(now);

    // ================= あとでもよいこと（畳んでおく。おまかせで埋まっている）
    const later = h("details", "creGroup creLater");
    later.open = laterOpen;
    later.ontoggle = () => { laterOpen = later.open; };
    const sum = h("summary", "creGroupHead");
    const st = h("b", "", TX.later);
    st.append(h("span", "creLaterTag", TX.laterTag));
    laterLine = h("span", "creLaterLine");
    sum.append(st, h("span", "fine", TX.laterSub), laterLine);
    later.append(sum);
    // 生い立ち・特徴
    const s5 = h("section", "creSec");
    const t3 = h("h3", "", "外見・生い立ち");
    t3.append(btn("特徴をおまかせ", "small", () => { cre.randomTraits(draft, R); cre.TRAITS.forEach(setVal); refresh(); }, "p-traits"));
    s5.append(t3, eff("traits"));
    const grid = h("div", "grid2");
    [["look", "外見", "input"], ["history", "生い立ち", "textarea"]]
      .forEach(([k, label, type]) => grid.append(fieldEl(k, label, type, refresh)));
    const hi = grid.querySelector("#pf-history");
    if (hi) hi.placeholder = "空けておいてもよい（「振る」でおまかせ）";
    s5.append(grid);
    later.append(s5);
    // 畳んだまま描いた textarea は、開いたときに高さを合わせる
    later.addEventListener("toggle", () => { if (later.open) later.querySelectorAll("textarea.fit").forEach(fitArea); });
    form.append(later);
    form.querySelectorAll("textarea.fit").forEach(fitArea);

    lay.append(form);
    root.append(lay);

    const nav = h("div", "creNav");
    nav.append(btn("タイトルへ", "", () => go("title")), btn("次へ：能力値を振る", "primary", () => go("stats"), "p-next"));
    root.append(nav);
    refresh();
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

  // textarea の高さを中身に合わせる（まだ画面に無いときは次の描画で）
  function fitArea(el) {
    if (!el.isConnected || !el.offsetWidth) { requestAnimationFrame(() => { if (el.isConnected && el.offsetWidth) fitArea(el); }); return; }
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  }
  addEventListener("resize", () => document.querySelectorAll("#setup textarea.fit").forEach(fitArea));

  function fieldEl(key, label, type, after) {
    const f = h("div", "field");
    const lab = h("label", "", label);
    lab.htmlFor = "pf-" + key;
    f.append(lab);
    const row = h("div", "row");
    // 外見も生い立ちも textarea にして、文の長さに合わせて高さを伸ばす（おまかせの長い文も全部見える。持ち主の要望）
    const inp = h("textarea", "fit");
    inp.id = "pf-" + key;
    inp.rows = 1;
    inp.maxLength = type === "textarea" ? 160 : 60;
    inp.value = draft.profile[key] || "";
    // 外見は一行の文（改行させない。日本語の変換を確定する Enter は止めない）
    if (type !== "textarea") inp.onkeydown = (e) => { if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) e.preventDefault(); };
    inp.oninput = () => { if (type !== "textarea" && inp.value.includes("\n")) inp.value = inp.value.replace(/\n/g, " "); draft.profile[key] = inp.value; fitArea(inp); after(); };
    const b = btn("振る", "small", () => { inp.value = draft.profile[key] = cre.gen(draft, key, R); fitArea(inp); after(); });
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
    head(root, "能力値", "何度でも振り直せる。初期値はダイス（3D6）で決まり、運が良ければ 20 を超える。ボーナス点は 5 点（トロフィーで増える）");

    const bar = h("div", "rollBar");
    const who = h("div", "rollWho");
    const c = D.CLASSES[draft.cls];
    const st = cre.final(draft);
    const wt = h("div");
    wt.append(h("b", "", draft.profile.name || "（名無し）"), h("span", "fine", `${[c.name, D.AGES[draft.ageBand].name].join("・")}・${D.ORIGINS[draft.origin].short}生まれ`));
    who.append(wt);
    const tray = h("div", "tray");
    tray.setAttribute("aria-hidden", "true");
    const dice = [die(1 + Math.floor(R() * 6)), die(1 + Math.floor(R() * 6)), die(1 + Math.floor(R() * 6))];
    tray.append(...dice);
    const rb = btn("振る", "primary rollBtn", () => { cre.roll(draft, R); rolledNow = true; sfx("dice", "coin"); setup.show(); }, "s-roll");
    const info = h("div", "rollInfo num");
    info.append(h("span", "", `振った回数 ${draft.rolls}`), h("span", "", `振った中で最高の合計 ${draft.best || cre.total(draft)}`), h("span", "statTotal", `合計 ${cre.baseTotal(draft)}（ボーナス込み ${cre.total(draft)}）`), h("span", "", `HP ${G.maxHpOf(st)} ／ MP ${G.maxMpOf(st)}`));
    bar.append(who, tray, rb, info);
    root.append(bar);

    const box = h("section", "box");
    const bh = h("div", "boxhead");
    bh.append(h("b", "", "ボーナス点"));
    const bn = h("span", "bonusRoll num", `${cre.bonusPoints(draft)} 点`);
    bn.setAttribute("aria-live", "polite");
    bh.append(bn);
    const left = cre.bonusLeft(draft);
    bh.append(h("span", "bonusLeft num" + (left ? " has" : ""), `残り ${left} 点`));
    const tb = cre.trophyBonus ? cre.trophyBonus() : 0;
    const ts = cre.trophyScore ? cre.trophyScore() : 0;
    if (ts) bh.append(h("span", "trophyBonus num", `トロフィー ${ts} 点で +${tb}（次の +1 まであと ${cre.trophyNext()} 点）`));
    bh.append(h("span", "fine", "好きな能力値に足す。トロフィーは銅 1・銀 2・金 5 点で数え、10 点ごとにボーナス点 +1"));
    box.append(bh);
    const list = h("div", "statlist creStats num");
    D.STATS.forEach((k) => {
      const lucky = cre.base(draft, k) >= 20;   // 上振れ（20 以上）
      const row = h("div", "srow" + (rolledNow ? " rolled" : "") + (lucky ? " lucky" : ""));
      row.title = D.STAT_HINT[k];
      const v = cre.value(draft, k);
      const b = h("span", "bar"); const i = h("i"); i.style.width = G.s5Bar(v) + "%"; b.append(i);   // 99 で満点（S5）
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
      det.append(h("span", lucky ? "luckyTag" : "", `ダイス ${draft.dice ? draft.dice[k] : draft.rolled[k]}${lucky ? "・上振れ！" : ""}`));
      const cm = cre.classMod(draft.cls, k);
      if (cm) det.append(h("span", cm > 0 ? "plus" : "minus", `職業 ${signed(cm)}`));
      if (m.age) det.append(h("span", m.age > 0 ? "plus" : "minus", `年齢 ${signed(m.age)}`));
      if (m.origin) det.append(h("span", m.origin > 0 ? "plus" : "minus", `生まれ ${signed(m.origin)}`));
      if (draft.bonus[k]) det.append(h("span", "plus", `ボーナス +${draft.bonus[k]}`));
      det.append(h("span", "", `普通の判定 ${G.s5Plain(v)}%`));   // 相手・難しさとの差で決まる（S5）
      row.append(h("span", "nm", k), h("span", "v", String(v)), b, pm, det);
      list.append(row);
    });
    box.append(list);
    // 能力値の合計（初期値＋補正、ボーナス込み）。振り直しで良い目を探すときの目安
    const sum = h("div", "statSum num");
    sum.append(h("span", "", "合計"), h("b", "", String(cre.baseTotal(draft))), h("span", "fine", `ボーナス込み ${cre.total(draft)}`));
    box.append(sum);
    box.append(h("p", "fine", `能力値は点で、冒険の中で 99 まで伸びていく（使うほど、強い相手に挑むほど伸びる）。12 点で普通の判定が五分五分。相手が強い・難しいほど成功率は下がり、点が上なら上がる。能力の名前に触れると説明が出る。`));
    root.append(box);

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
    nm.append(h("b", "csName", p.name), h("span", "csLine", `${[c.name, p.sex].join("・")}・${p.age}歳（${D.AGES[p.ageBand].name}）・${D.ORIGINS[p.origin].name}生まれ`));
    nm.append(h("span", "csLine", `目的：${o.goalText}${o.goal === "custom" ? (D.CRE_TEXT || {}).customSheet || "" : ""}`));
    top.append(nm);
    paper.append(top);

    const cols = h("div", "csCols");
    const stl = h("div", "statlist num");
    D.STATS.forEach((k) => {
      const r = h("div", "stat");
      const b = h("span", "bar"); const i = h("i"); i.style.width = G.s5Bar(o.stats[k]) + "%"; b.append(i);
      r.append(h("span", "nm", k), h("span", "v", String(G.pt(o.stats[k]))), b, h("span", "cap", `${G.s5Plain(o.stats[k])}%`));
      stl.append(r);
    });
    const sb = h("section");
    sb.append(h("h3", "", "能力値"), stl, h("p", "fine num", `HP ${G.maxHpOf(o.stats)} ／ MP ${G.maxMpOf(o.stats)} ／ 所持金 ${c.gold}G`));
    const it = (id) => (D.ITEMS[id] ? D.ITEMS[id].name : id);
    const gear = [c.weapon, c.armor].filter(Boolean).map(it).concat(Object.entries(c.items).map(([id, n]) => `${it(id)}${n > 1 ? "×" + n : ""}`));
    sb.append(h("h3", "", "持ち物"), h("p", "csGear", gear.join("、")));
    const dl = h("dl", "kv csKv");
    const rrows = G.r1Rows ? G.r1Rows({ profile: p }).filter(([k]) => k !== "種族") : [];
    [["職業", c.blurb], ["得意", cre.strengths(o.cls).join("・")], ["出発地", D.LOCS[c.start].name], ...rrows, ["外見", p.look], ["生い立ち", p.history]]
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
    book.append(pg);
    if (pages.length > 1) book.append(h("div", "folio", `── ${KANJI[page]} ──`));  // 導入は今 1 頁（状況の概要だけ）
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
