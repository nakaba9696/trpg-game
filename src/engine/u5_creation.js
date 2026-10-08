// キャラクター作成（U5）の決まり：下書き（draft）を作る・おまかせ・能力値を振る・ボーナス点・導入の文。
// DOM に触らない。乱数は引数 rnd で受け取る（作成画面は Math.random、テストは決まった乱数）。
// 作成は冒険の前なので G.rand を進めない。レーン C（キャラクター）が管理
(function (G) {
  const D = G.data;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cre = (G.cre = {});

  const dn = (rnd, n) => 1 + Math.floor(rnd() * n);
  const pickR = (rnd, a) => a[Math.floor(rnd() * a.length)];

  // 名前の表：主人公の名前は、職業の響き（D.CLASSES の culture）の表をみな合わせて、性別で引く。
  // 生まれは無くした（持ち主の決定 U25）。職業を選び直しても、選んだ名前は動かさない
  cre.heroCultures = () => [...new Set(Object.values(D.CLASSES).map((c) => c.culture).filter((k) => D.PROFILE.names[k]))];
  cre.heroNames = (sex) => cre.heroCultures().flatMap((k) => D.PROFILE.names[k][sex] || []);

  // 人物設定の一項目をおまかせで作る
  cre.gen = (dr, key, rnd) => {
    const P = D.PROFILE;
    switch (key) {
      case "name": return pickR(rnd, cre.heroNames(dr.sex));
      case "age": { const [a, b] = D.AGES[dr.ageBand].range; return String(a + Math.floor(rnd() * (b - a + 1))); }
    }
    return "";
  };
  // 生い立ちと外見は無くした（どちらもゲームにほとんど効いていなかった。主人公は立ち絵を出さない。持ち主の決定 U17）。
  // 古いセーブの profile.history は人生の物語の一言にだけ残り、profile.look は読まない。
  // 性格・口癖・好きなもの・苦手なものも作らない（持ち主の決定）。古いセーブの profile に残っていても表示しない

  // すべておまかせ（職業・性別・年齢・目的・名前）。能力値も振る
  cre.randomAll = (dr, rnd) => {
    dr.cls = pickR(rnd, Object.keys(D.CLASSES));
    dr.sex = pickR(rnd, ["男", "女"]);
    dr.ageBand = rnd() < 0.2 ? "old" : pickR(rnd, ["young", "prime"]);
    dr.goal = pickR(rnd, Object.keys(D.GOALS).filter((g) => g !== "custom"));
    dr.profile = { name: cre.gen(dr, "name", rnd), age: cre.gen(dr, "age", rnd) };
    dr.bonus = {};
    cre.roll(dr, rnd);
    return dr;
  };

  cre.fresh = (rnd) => cre.randomAll({ rolls: 0, customGoal: "", bonus: {} }, rnd);

  // 職業を変える：能力値を振り直す（選んだ名前・性別・年齢はそのまま）
  cre.setClass = (dr, cls, rnd) => {
    if (dr.cls === cls) return;
    dr.cls = cls;
    cre.roll(dr, rnd);
  };
  cre.setAge = (dr, band, rnd) => {
    dr.ageBand = band;
    dr.profile.age = cre.gen(dr, "age", rnd);
    cre.fit(dr);
  };
  cre.setSex = (dr, sex, rnd) => { dr.sex = sex; dr.profile.name = cre.gen(dr, "name", rnd); };

  // ---------------------------------------------------------------- 能力値（点。S2）
  // 作成はすべて点で数える（src/data/zs2_points.js）。冒険に渡すときに成功率の尺度（点×4）にする（cre.final）。
  // 持ち主の決定（古いダンジョン RPG 風）：
  //   初期値をダイスで振る … 能力値ごとに 3D6（3〜18）。8％（D.S2.EXTRA）でもう 1D6 が乗って 20 以上も出る（1 人のうちどれか 1 つが 20 以上になるのが約 5％）。
  //     それに職業・種族・年齢の補正を足す（D.S2.MIN より下げない）。振り直しは何度でも。鍵は無い。
  //   ボーナス点 … 5 点（D.BONUS_POINTS）で決まり。トロフィーの格の点（銅 1・銀 2・金 5）10 点ごとに +1（cre.extraBonus。合計の上限は無い）。
  //     トロフィーは格ごとの点（銅 1・銀 2・金 5）の合計 10 点ごとに +1（zz_u10_trophy_bonus.js）。どの能力値にも好きなだけ足せる。
  //   上限 … 能力値そのものに上限は無い（判定は 5〜95％で止まる）。
  // 古い下書きの locks・caps・bonusRoll は見ない
  const S2 = () => D.S2 || { PCT: 4, MIN: 3, EXTRA: 0 };
  cre.MAX_PT = Infinity;
  cre.ptOfPct = (n) => Math.round((n || 0) / S2().PCT);   // 割合で書かれた補正を点に

  // 能力値ひとつ分の初期値のダイス（3D6、まれに +1D6。D.S2.LUCKY を置けば、よい目なら必ず +1D6）
  cre.rollDice = (rnd) => {
    let v = dn(rnd, 6) + dn(rnd, 6) + dn(rnd, 6);
    if ((S2().LUCKY && v >= S2().LUCKY) || rnd() < (S2().EXTRA || 0)) v += dn(rnd, 6);
    return v;
  };
  // 職業の補正（点）
  cre.classMod = (cls, k) => ((D.CLASSES[cls].mod2 || {})[k] || 0);

  cre.roll = (dr, rnd) => {
    dr.dice = {};
    dr.rolled = {};
    delete dr.caps; delete dr.bonusRoll; delete dr.bonusTier;
    D.STATS.forEach((k) => {
      dr.dice[k] = cre.rollDice(rnd);
      dr.rolled[k] = dr.dice[k] + cre.classMod(dr.cls, k);
    });
    dr.bonus = Object.fromEntries(D.STATS.map((k) => [k, 0]));   // 振り直すとボーナスは戻る（初期値が変わるので）
    dr.best = Math.max(dr.best || 0, cre.total(dr));
    dr.rolls = (dr.rolls || 0) + 1;
  };

  // 年齢による補正（表示用に出どころ別にも返す。生まれの補正は無くした U25。古い下書きの origin は見ない）
  cre.modParts = (dr, k) => {
    const a = D.AGES[dr.ageBand] || D.AGES.prime;
    return { age: (a.mod || {})[k] || 0 };
  };
  cre.mod = (dr, k) => cre.modParts(dr, k).age;
  // ボーナスを足す前の値（初期値）
  cre.base = (dr, k) => Math.max(S2().MIN, dr.rolled[k] + cre.mod(dr, k));
  cre.value = (dr, k) => cre.base(dr, k) + (dr.bonus[k] || 0);
  cre.cap = () => Infinity;   // 上限は無い（古い呼び出しのため）
  // 冒険に渡す形（成功率の尺度）
  cre.final = (dr) => Object.fromEntries(D.STATS.map((k) => [k, cre.value(dr, k) * S2().PCT]));
  cre.caps = (dr) => cre.final(dr);   // 古い形（newGame の caps）のため。上限としては使わない
  cre.bonusUsed = (dr) => D.STATS.reduce((a, k) => a + (dr.bonus[k] || 0), 0);
  // 決まりの 5 点（ほかの仕組みが足す分は cre.extraBonus。トロフィー）
  cre.basePoints = () => D.BONUS_POINTS;
  cre.trophyPoints = (dr) => (cre.extraBonus ? cre.extraBonus(dr) || 0 : 0);
  cre.bonusPoints = (dr) => cre.basePoints(dr) + cre.trophyPoints(dr);
  cre.bonusLeft = (dr) => cre.bonusPoints(dr) - cre.bonusUsed(dr);
  cre.total = (dr) => D.STATS.reduce((a, k) => a + cre.value(dr, k), 0);
  cre.baseTotal = (dr) => D.STATS.reduce((a, k) => a + cre.base(dr, k), 0);   // ボーナスを足す前（初期値と補正）の合計


  // ボーナスの合計が点を超えたら後ろの能力値から戻す（トロフィーが減ったときなど）
  cre.fit = (dr) => {
    if (!dr.rolled) return;
    D.STATS.forEach((k) => { dr.bonus[k] = Math.max(0, dr.bonus[k] || 0); });
    const back = [...D.STATS].reverse();
    while (cre.bonusLeft(dr) < 0) { const k = back.find((s) => dr.bonus[s] > 0); if (!k) break; dr.bonus[k]--; }
  };

  // 残りのボーナス点を、職業の得意な能力値と体力へ順に配る（even なら 6 つに均等に。テスト・ボット）
  cre.autoBonus = (dr, even) => {
    const order = even ? [...D.STATS] : [...new Set([...cre.strengths(dr.cls), "体力"])];
    for (let i = 0, guard = 400; cre.bonusLeft(dr) > 0 && guard--; i++) {
      const can = order.filter((s) => cre.canAdd(dr, s));
      const k = can.length ? can[i % can.length] : D.STATS.find((s) => cre.canAdd(dr, s));
      if (!k) break;
      dr.bonus[k]++;
    }
  };

  cre.canAdd = (dr) => cre.bonusLeft(dr) > 0;
  cre.canSub = (dr, k) => (dr.bonus[k] || 0) > 0;
  cre.addBonus = (dr, k, dir) => {
    if (dir > 0 ? !cre.canAdd(dr, k) : !cre.canSub(dr, k)) return false;
    dr.bonus[k] += dir > 0 ? 1 : -1;
    return true;
  };

  // 得意な能力値（職業の補正の高い順に 2 つ）
  cre.strengths = (cls) => {
    const b = D.CLASSES[cls].mod2 || D.CLASSES[cls].base;
    return [...D.STATS].sort((x, y) => b[y] - b[x]).slice(0, 2);
  };

  // 作成画面と同じ振り方の能力値を、人物を選ばずに作る（テスト・ボット）。ボーナス点は均等に配る（o.even === false なら得意な能力値へ）。
  // 返すのは冒険に渡す形（成功率の尺度）
  cre.quickStats = (cls, rnd, o) => {
    o = o || {};
    const dr = { cls, ageBand: o.ageBand || "prime", profile: {}, bonus: {}, rolls: 0 };
    if (o.race) { dr.profile.race = o.race; dr.profile.beast = o.beast || ""; }
    cre.roll(dr, rnd);
    cre.autoBonus(dr, o.even !== false);
    return { stats: cre.final(dr), caps: cre.caps(dr), draft: dr };
  };

  // ---------------------------------------------------------------- 仕上げ
  cre.goalText = (dr) => (dr.goal === "custom" ? (String(dr.customGoal || "").trim() || "自由に生きる") : D.GOALS[dr.goal].text);

  // G.newGame に渡す形
  cre.options = (dr, rnd) => {
    const p = { ...dr.profile };
    delete p.personality; delete p.quote; delete p.like; delete p.dislike; delete p.history; delete p.look;
    p.name = String(p.name || "").trim() || cre.gen(dr, "name", rnd);
    p.age = String(p.age || "").trim() || cre.gen(dr, "age", rnd);
    p.sex = dr.sex;
    p.ageBand = dr.ageBand;
    delete p.origin;   // 生まれは無くした（U25）
    return { cls: dr.cls, stats: cre.final(dr), caps: cre.caps(dr), profile: p, goal: dr.goal, goalText: cre.goalText(dr) };
  };

  // 始まりの導入。ページ（段落の並び）の配列を返す。状況の概要の 3 頁（D.PROLOGUE）：世界の今・あなたは誰か・今どこにいて何を目指すか
  // 古いセーブの人物（年齢の区分が無い）でも作れる。生まれは無くした（U25。古いセーブの origin は見ない）
  cre.prologue = (o) => {
    const P = D.PROLOGUE;
    const p = o.profile || {};
    const c = D.CLASSES[o.cls];
    const startId = c.start;
    const start = D.LOCS[startId];
    // 作成画面の形（goal: id, goalText）とセーブの形（goal: { id, text }）のどちらでもよい
    const g = o.goal && typeof o.goal === "object" ? o.goal : { id: o.goal, text: o.goalText };
    const text = String(g.text || o.goalText || "").trim().replace(/[。．.]+$/, "");
    const fill = (t) => t.replace("{name}", p.name).replace("{age}", p.age).replace("{cls}", c.name)
      .replace("{place}", start.name).replace("{text}", text);
    // 年齢の区分は、書いた歳の数から（区分と歳が食い違うときは歳を信じる）。歳が読めなければ区分、それも無ければ壮年
    const byAge = Object.keys(D.AGES).find((k) => { const [lo, hi] = D.AGES[k].range; const n = Number(p.age); return n >= lo && n <= hi; });
    const band = byAge || (D.AGES[p.ageBand] ? p.ageBand : "prime");
    const past = (P.past[o.cls] || {})[band] || P.pastNone;
    return [
      P.world.slice(),
      [fill(P.who), past].filter(Boolean),
      [fill(P.arrive) + (P.place[startId] ? P.place[startId] : ""), fill(g.id !== "custom" && D.GOALS[g.id] ? P.goal : P.custom), P.close],
    ];
  };
})(globalThis.G = globalThis.G || {});
