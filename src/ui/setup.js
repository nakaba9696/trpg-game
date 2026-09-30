// キャラクター作成：職業、能力値（振り直しとボーナス点）、人物設定（おまかせ生成＋手直し）、目的。
// レーン C（キャラクター）が管理
(function (G) {
  const D = G.data;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const d = (n) => 1 + Math.floor(Math.random() * n);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const setup = (G.setup = {});
  let draft = null;

  const PROFILE_FIELDS = [
    ["age", "年齢", "input"], ["look", "外見", "input"], ["personality", "性格", "input"],
    ["history", "生い立ち", "textarea"], ["quote", "口癖", "input"], ["like", "好きなもの", "input"], ["dislike", "苦手なもの", "input"],
  ];

  function genField(key) {
    const P = D.PROFILE;
    const c = D.CLASSES[draft.cls];
    switch (key) {
      case "name": return pick(P.names[c.culture][draft.sex]);
      case "age": return String(16 + d(24));
      case "look": return `${pick(P.hair)}、${pick(P.eyes)}、${pick(P.build)}`;
      case "personality": return pick(P.personality);
      case "history": return pick(P.history[draft.cls]);
      case "quote": return pick(P.quote);
      case "like": return pick(P.like);
      case "dislike": return pick(P.dislike);
    }
    return "";
  }

  function rollStats() {
    const c = D.CLASSES[draft.cls];
    const stats = {}, caps = {};
    D.STATS.forEach((k) => {
      stats[k] = clamp(c.base[k] + d(6) + d(6) + d(6) - 3, 5, 90);
      caps[k] = clamp(stats[k] + 20 + d(10) + d(10) + d(10), stats[k] + 10, 99);
    });
    draft.rolled = stats;
    draft.caps = caps;
    draft.bonus = Object.fromEntries(D.STATS.map((k) => [k, 0]));
  }
  const finalStats = () => Object.fromEntries(D.STATS.map((k) => [k, draft.rolled[k] + draft.bonus[k]]));
  const bonusLeft = () => D.BONUS_POINTS - D.STATS.reduce((a, k) => a + draft.bonus[k], 0);

  function readProfile() {
    const p = {};
    ["name", ...PROFILE_FIELDS.map((f) => f[0])].forEach((k) => { const el = $("#pf-" + k); p[k] = el ? el.value.trim() : ""; });
    return p;
  }
  function writeProfile(p) { Object.entries(p).forEach(([k, v]) => { const el = $("#pf-" + k); if (el) el.value = v; }); }
  function fullProfile() {
    const p = { name: genField("name") };
    PROFILE_FIELDS.forEach(([k]) => { p[k] = genField(k); });
    return p;
  }

  // ---------------------------------------------------------------- 描画
  setup.show = () => {
    const root = $("#setup");
    if (!draft) {
      draft = { cls: "merc", sex: "男", rerolls: D.REROLLS, goal: "majin" };
      rollStats();
      draft.profile = fullProfile();
    }
    root.textContent = "";
    const intro = h("div");
    intro.append(h("p", "lead", "ヴェルド大陸。断界山脈の向こうには魔王の治める魔物界があり、人の世では国と国が争っている。そして時おり、剣も魔法も通じない「魔人」が現れ、街ひとつを気まぐれに滅ぼしていく。さらにその上では、神々が世界を見世物として眺めている。"));
    const p2 = h("p", "lead", "あなたはこの大陸に生きる、ひとりの冒険者。能力値が行動の成功率を決め、使った能力値は伸びていく。まずは、あなた自身を作ろう。");
    p2.style.marginTop = "8px";
    intro.append(p2);
    root.append(intro);

    // 職業
    const secC = h("section");
    const h2c = h("h2", "", "職業");
    h2c.append(h("span", "fine", "職業で、能力値の傾向と出発地と持ち物が決まる"));
    secC.append(h2c);
    const cards = h("div", "cards");
    Object.entries(D.CLASSES).forEach(([id, c]) => {
      const l = h("label", "card");
      const inp = h("input"); inp.type = "radio"; inp.name = "cls"; inp.value = id; inp.checked = draft.cls === id;
      inp.onchange = () => {
        const oldCulture = D.CLASSES[draft.cls].culture;
        draft.cls = id;
        rollStats();
        draft.profile = readProfile();
        if (oldCulture !== c.culture) draft.profile.name = genField("name");
        draft.profile.history = genField("history");
        setup.show();
      };
      l.append(inp, h("b", "", c.name), h("span", "", c.blurb), h("span", "", `出発地：${D.LOCS[c.start].name}`));
      cards.append(l);
    });
    secC.append(cards);
    root.append(secC);

    // 能力値
    const box = h("section", "box");
    const bh = h("div", "boxhead");
    const st = finalStats();
    bh.append(h("b", "", "能力値"), h("span", "fine num", `HP ${G.maxHpOf(st)} ／ MP ${G.maxMpOf(st)}`));
    const right = h("div", "right");
    const bl = h("span", "fine num", `ボーナス 残り ${bonusLeft()} 点`);
    const rr = h("button", "btn", `振り直す（残り ${draft.rerolls} 回）`);
    rr.type = "button";
    rr.disabled = draft.rerolls <= 0;
    rr.onclick = () => { draft.rerolls--; draft.profile = readProfile(); rollStats(); setup.show(); };
    right.append(bl, rr);
    bh.append(right);
    box.append(bh);
    const list = h("div", "statlist num");
    D.STATS.forEach((k) => {
      const row = h("div", "stat alloc");
      row.title = D.STAT_HINT[k];
      const bar = h("span", "bar"); const i = h("i"); i.style.width = st[k] + "%"; const u = h("u"); u.style.left = `calc(${draft.caps[k]}% - 1px)`; bar.append(i, u);
      const pm = h("span", "pm");
      const minus = h("button", "btn small", "−"); minus.type = "button"; minus.setAttribute("aria-label", `${k}を1下げる`);
      minus.disabled = draft.bonus[k] <= 0;
      minus.onclick = () => { draft.bonus[k]--; draft.profile = readProfile(); setup.show(); };
      const plus = h("button", "btn small", "＋"); plus.type = "button"; plus.setAttribute("aria-label", `${k}を1上げる`);
      plus.disabled = bonusLeft() <= 0 || st[k] >= draft.caps[k];
      plus.onclick = () => { draft.bonus[k]++; draft.profile = readProfile(); setup.show(); };
      pm.append(minus, plus);
      row.append(h("span", "nm", k), h("span", "v", String(st[k])), bar, h("span", "cap", `限界 ${draft.caps[k]}`), pm);
      list.append(row);
    });
    box.append(list);
    box.append(h("p", "fine", "数値がそのまま成功率の基準（％）。赤い線は才能限界で、冒険でそこまで伸ばせる。能力にカーソルを合わせると説明が出る。"));
    root.append(box);

    // 人物設定
    const pbox = h("section", "box");
    const ph = h("div", "boxhead");
    ph.append(h("b", "", "人物設定"), h("span", "fine", "おまかせで作ったあと、自由に書き換えられる"));
    const pr = h("div", "right");
    const all = h("button", "btn", "すべておまかせ");
    all.type = "button";
    all.onclick = () => { draft.profile = fullProfile(); writeProfile(draft.profile); };
    pr.append(all);
    ph.append(pr);
    pbox.append(ph);

    const top = h("div", "grid2");
    top.append(fieldEl("name", "名前", "input"));
    const sexF = h("div", "field");
    sexF.append(h("label", "", "性別"));
    const seg = h("div", "seg");
    ["男", "女"].forEach((s) => {
      const l = h("label");
      const inp = h("input"); inp.type = "radio"; inp.name = "sex"; inp.value = s; inp.checked = draft.sex === s;
      inp.onchange = () => { draft.sex = s; draft.profile = readProfile(); draft.profile.name = genField("name"); writeProfile(draft.profile); };
      l.append(inp, document.createTextNode(s));
      seg.append(l);
    });
    sexF.append(seg);
    top.append(sexF);
    pbox.append(top);
    const grid = h("div", "grid2");
    PROFILE_FIELDS.forEach(([k, label, type]) => grid.append(fieldEl(k, label, type)));
    pbox.append(grid);
    root.append(pbox);
    writeProfile(draft.profile);

    // 目的
    const secG = h("section");
    const h2g = h("h2", "", "目的");
    h2g.append(h("span", "fine", "果たすとトロフィー「宿願成就」。その後も冒険は続けられる"));
    secG.append(h2g);
    const gcards = h("div", "cards");
    Object.entries(D.GOALS).forEach(([id, g]) => {
      const l = h("label", "card");
      const inp = h("input"); inp.type = "radio"; inp.name = "goal"; inp.value = id; inp.checked = draft.goal === id;
      inp.onchange = () => { draft.goal = id; $("#customGoalBox").hidden = id !== "custom"; };
      l.append(inp, h("b", "", g.name), h("span", "", g.hint));
      gcards.append(l);
    });
    secG.append(gcards);
    const cg = h("div", "field");
    cg.id = "customGoalBox";
    cg.hidden = draft.goal !== "custom";
    cg.style.marginTop = "10px";
    cg.append(h("label", "", "自分で決めた目的"));
    const cgi = h("input"); cgi.id = "customGoal"; cgi.maxLength = 80; cgi.value = draft.customGoal || "生き別れの妹を探し出し、村を焼いた男に報いを受けさせる";
    cgi.oninput = () => { draft.customGoal = cgi.value; };
    cg.append(cgi);
    secG.append(cg);
    root.append(secG);

    // 開始
    const start = h("div", "start");
    const sb = h("button", "btn primary", "冒険を始める");
    sb.type = "button";
    sb.onclick = () => {
      const p = readProfile();
      p.name = p.name || genField("name");
      p.sex = draft.sex;
      p.age = p.age || genField("age");
      const goalText = draft.goal === "custom" ? ($("#customGoal").value.trim() || "自由に生きる") : D.GOALS[draft.goal].text;
      const opts = { cls: draft.cls, stats: finalStats(), caps: { ...draft.caps }, profile: p, goal: draft.goal, goalText };
      draft = null;
      G.main.start(opts);
    };
    start.append(sb, h("p", "fine", "普段の行動は Claude を使わない（利用量はかからない）。自由入力で「GM に任せる」を選んだときだけ使う。"));
    root.append(start);

    const legacy = h("div", "legacy");
    legacy.append(h("span", "", `これまでの冒険者 ${G.P.graves.length} 人 ／ トロフィー ${Object.keys(G.P.trophies).length} 個`));
    const lb = h("button", "btn", "トロフィーと墓碑を見る"); lb.type = "button"; lb.onclick = () => G.ui.openTrophies();
    legacy.append(lb);
    root.append(legacy);
  };

  function fieldEl(key, label, type) {
    const f = h("div", "field");
    const lab = h("label", "", label);
    lab.htmlFor = "pf-" + key;
    f.append(lab);
    const row = h("div", "row");
    const inp = h(type === "textarea" ? "textarea" : "input");
    inp.id = "pf-" + key;
    inp.maxLength = type === "textarea" ? 160 : 60;
    const b = h("button", "btn small", "振る");
    b.type = "button";
    b.setAttribute("aria-label", `${label}をおまかせで作り直す`);
    b.onclick = () => { inp.value = genField(key); };
    row.append(inp, b);
    f.append(row);
    return f;
  }
})(globalThis.G = globalThis.G || {});
