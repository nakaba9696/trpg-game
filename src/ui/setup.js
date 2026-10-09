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
  // 作成の段（人物／能力値／確認）。extra を渡すと、段の並びの右端に小さく置く（人物の「全部おまかせ」。U20）
  function steps(root, i, extra) {
    const ol = h("ol", "creSteps");
    ["人物", "能力値", "確認"].forEach((s, j) => { const li = h("li", j === i ? "on" : j < i ? "done" : "", s); if (j === i) li.setAttribute("aria-current", "step"); ol.append(li); });
    if (!extra) { root.append(ol); return; }
    const row = h("div", "creStepsRow");
    row.append(ol, extra);
    root.append(row);
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
  // おまかせで全部埋まった状態から始める。まず「名前と年齢」（性別・名前・年齢）、次に「職業と目的」の順に並べる（U19。生まれは U25 で無くした）。
  // 「あとでもよいこと」（外見・生い立ち）の欄は、中身ごと無くした（U17）。各項目に、ゲームにどう効くかの一行（D.CRE_HINTS）。U15。名前・年齢を今決めることへ移し、候補から選ぶ形に（U16）
  function person(root) {
    const HN = D.CRE_HINTS || {}, TX = D.CRE_TEXT || {};
    const eff = (k) => h("p", "creEff", HN[k] || "");
    // 上の見出しと人物の札は外した（札の中身は「確認」で見られる。持ち主の決定 U20）。「全部おまかせ」は段の並びの右端に小さく
    const all = btn("全部おまかせ", "small", () => { const s = draft.customGoal; draft = cre.fresh(R); draft.customGoal = s; sfx("dice", "coin"); setup.show(); }, "p-all");
    all.title = "性別・名前・年齢・職業・目的を全部おまかせで決め直す";
    steps(root, 0, all);

    // 初めて遊ぶ人（トロフィーも墓碑も無い）には、おまかせで旅立つのを勧める（強制しない）
    if (cre.firstTime && cre.firstTime()) {
      const fn = h("div", "creFirst");
      fn.append(h("p", "", TX.first), btn(TX.firstGo, "", () => { cre.quickFinish(draft); go("sheet"); }, "p-first"));
      root.append(fn);
    }

    const lay = h("div", "cre2");
    // 年齢の説明の一行を、選び直すたびに書き換える
    function refresh() {
      const a = D.AGES[draft.ageBand];
      if (aBlurb) aBlurb.textContent = `${a.blurb}（${modText(a.mod)}${cre.ageRange ? `、${cre.ageRange(draft).join("〜")}歳` : ""}）`;
    }

    const form = h("div", "creForm");
    let aBlurb = null;
    const groupHead = (title, sub) => {
      const gh = h("div", "creGroupHead");
      const t = h("b", "", title);
      gh.append(t, h("span", "fine", sub));
      return gh;
    };

    // ================= あなたは誰か（性別 → 名前 → 年齢。U19：職業・目的より先に。U25：名前の響きを決める性別を名前の前に。生まれは無くした）
    const now = h("div", "creGroup creNow");
    now.append(groupHead(TX.now, TX.nowSub));

    // 性別（名前の響きが変わるので、名前より前に独立した項目で置く。選び直すと名前の候補も引き直す。U25）
    const sSex = h("section", "creSec creSexSec");
    const x3 = h("h3", "", "性別");
    x3.append(btn("おまかせ", "small", () => { cre.randomPart(draft, "sex", R); drawSex(); drawNames(); refresh(); }, "p-sex-r"));
    sSex.append(x3);   // 説明の一行は無くした（U25）
    const sexSeg = segEl("性別", "sex", [["男", "男"], ["女", "女"]], draft.sex, (v) => { cre.setSex(draft, v, R); drawNames(); refresh(); });
    sSex.append(sexSeg);
    const drawSex = () => sexSeg.querySelectorAll("input").forEach((i) => { i.checked = i.value === draft.sex; });
    now.append(sSex);

    // 名前（上で選んだ性別の名前の表から選ぶ。自由入力は無い。「別の候補」で引き直す。U16。性別のあとに置く U25）
    const s1 = h("section", "creSec creNameSec");
    const n3 = h("h3", "", "名前");
    n3.append(btn("おまかせ", "small", () => { cre.randomPart(draft, "name", R); drawNames(); refresh(); }, "p-name-r"));
    s1.append(n3);   // 説明の一行は無くした（U25）
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
    s0.append(a3, h("p", "creEff", HN.age || ""));
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
    form.append(now);

    // ================= 何をする者か（職業・目的。U19：誰かを決めてから）
    const job = h("div", "creGroup creNow");
    job.append(groupHead(TX.job, TX.jobSub));

    // 職業
    const s3 = h("section", "creSec");
    s3.append(h("h3", "", "職業"), eff("cls"));
    const cards = h("div", "cards compact");
    Object.entries(D.CLASSES).forEach(([id, c]) => {
      const l = h("label", "card");
      const inp = h("input"); inp.type = "radio"; inp.name = "cls"; inp.value = id; inp.checked = draft.cls === id;
      inp.onchange = () => {
        cre.setClass(draft, id, R);   // 選んだ名前・性別・年齢はそのまま（U25）
        refresh();
      };
      l.append(inp, h("b", "", c.name), h("span", "", c.blurb), h("span", "fine", `得意：${cre.strengths(id).join("・")}`));
      // 初期装備・持ち物・所持金と、最初の戦技／スキル／魔法（表から作る。U21）
      if (cre.classLines) {
        const dl = h("dl", "clsGear");
        cre.classLines(id).forEach(([k, v]) => { dl.append(h("dt", "", k), h("dd", "", v)); });
        if (dl.children.length) l.append(dl);
      }
      cards.append(l);
    });
    s3.append(cards);
    job.append(s3);

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
    job.append(s4);
    form.append(job);


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
    wt.append(h("b", "", draft.profile.name || "（名無し）"), h("span", "fine", [c.name, D.AGES[draft.ageBand].name].join("・")));
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
    if (ts) bh.append(h("span", "trophyBonus num", `トロフィーでボーナス +${tb}（トロフィーの点数 ${ts}。あと ${cre.trophyNext()} でボーナス +${tb + 1}）`));
    bh.append(h("span", "fine", "ボーナスは、好きな能力値に配って足せます。トロフィーを集めるとボーナスが増えます（トロフィーの点数は銅 1・銀 2・金 5・白金 10。点数が 10 たまるごとにボーナス +1）"));
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
    if (setup.statsExtra) setup.statsExtra(root, draft, h);   // 術の才（M14。src/ui/zm14_magic.js）

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
  // S7：職業による伸び方の一言（得意な能力は伸びやすく、苦手な能力は伸びにくい）
  function growLine(cls) {
    const up = D.STATS.filter((k) => G.s5AptOf(cls, k) > 0), down = D.STATS.filter((k) => G.s5AptOf(cls, k) < 0);
    return `得意な能力ほど伸びやすく、高くなっても伸び続ける。苦手な能力は伸びにくい（伸びやすい：${up.join("・") || "なし"}／伸びにくい：${down.join("・") || "なし"}）`;
  }
  function sheet(root) {
    steps(root, 2);
    head(root, "この者で旅立つか", "戻って直すこともできる");
    const o = cre.options(draft, R);
    const p = o.profile, c = D.CLASSES[o.cls];
    const paper = h("article", "charSheet");
    const top = h("header", "csTop");
    const nm = h("div");
    nm.append(h("b", "csName", p.name), h("span", "csLine", `${[c.name, p.sex].join("・")}・${p.age}歳（${D.AGES[p.ageBand].name}）`));
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
    [["職業", c.blurb], ["得意", cre.strengths(o.cls).join("・")], ["伸び方", growLine(o.cls)], ["出発地", D.LOCS[c.start].name], ...rrows, ...(cre.sheetRows ? cre.sheetRows(draft) : [])]
      .forEach(([k, v]) => { if (!v) return; dl.append(h("dt", "", k), h("dd", "", v)); });
    const pb = h("section");
    pb.append(h("h3", "", "人物"), dl);
    cols.append(sb, pb);
    paper.append(cols);
    root.append(paper);

    const nav = h("div", "creNav");
    nav.append(btn("人物を直す", "", () => go("person")), btn("能力値を直す", "", () => go("stats")),
      btn("この者で旅立つ", "primary", () => { opts = o; page = 0; go("prologue"); if (G.sound && G.sound.bgmUpdate) G.sound.bgmUpdate(); }, "c-go"));
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
