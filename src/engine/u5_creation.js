// キャラクター作成（U5）の決まり：下書き（draft）を作る・おまかせ・能力値を振る・鍵・ボーナス点・導入の文。
// DOM に触らない。乱数は引数 rnd で受け取る（作成画面は Math.random、テストは決まった乱数）。
// 作成は冒険の前なので G.rand を進めない。レーン C（キャラクター）が管理
(function (G) {
  const D = G.data;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cre = (G.cre = {});

  const dn = (rnd, n) => 1 + Math.floor(rnd() * n);
  const pickR = (rnd, a) => a[Math.floor(rnd() * a.length)];

  // 名前の響き（生まれで決まる。古い下書きは職業で）
  const culture = (dr) => (D.ORIGINS[dr.origin] || {}).culture || D.CLASSES[dr.cls].culture;

  // 人物設定の一項目をおまかせで作る
  cre.gen = (dr, key, rnd) => {
    const P = D.PROFILE;
    switch (key) {
      case "name": return pickR(rnd, P.names[culture(dr)][dr.sex]);
      case "age": { const [a, b] = D.AGES[dr.ageBand].range; return String(a + Math.floor(rnd() * (b - a + 1))); }
      case "look": return `${pickR(rnd, P.hair)}、${pickR(rnd, P.eyes)}、${pickR(rnd, P.build)}`;
      case "personality": return pickR(rnd, P.personality);
      case "history": return pickR(rnd, P.history[dr.cls]);
      case "quote": return pickR(rnd, P.quote);
      case "like": return pickR(rnd, P.like);
      case "dislike": return pickR(rnd, P.dislike);
    }
    return "";
  };
  cre.TRAITS = ["look", "personality", "history", "quote", "like", "dislike"];

  // 生い立ち・特徴だけをおまかせで作り直す
  cre.randomTraits = (dr, rnd) => { cre.TRAITS.forEach((k) => { dr.profile[k] = cre.gen(dr, k, rnd); }); };

  // すべておまかせ（職業・性別・年齢・生まれ・目的・人物設定）。能力値も振る
  cre.randomAll = (dr, rnd) => {
    dr.cls = pickR(rnd, Object.keys(D.CLASSES));
    dr.sex = pickR(rnd, ["男", "女"]);
    dr.ageBand = rnd() < 0.2 ? "old" : pickR(rnd, ["young", "prime"]);
    // 半分は職業に似合う生まれ、残りはどこでも
    dr.origin = rnd() < 0.5 ? D.CLASS_ORIGIN[dr.cls] : pickR(rnd, Object.keys(D.ORIGINS));
    dr.goal = pickR(rnd, Object.keys(D.GOALS).filter((g) => g !== "custom"));
    dr.profile = { name: cre.gen(dr, "name", rnd), age: cre.gen(dr, "age", rnd) };
    cre.randomTraits(dr, rnd);
    dr.locks = {};
    dr.bonus = {};
    cre.roll(dr, rnd);
    return dr;
  };

  cre.fresh = (rnd) => cre.randomAll({ rolls: 0, customGoal: "", bonus: {}, locks: {} }, rnd);

  // 職業を変える：生まれが前の職業のはじめの生まれなら、新しい職業の方へ寄せる。名前の響きが変われば名前も作り直す
  cre.setClass = (dr, cls, rnd) => {
    if (dr.cls === cls) return;
    const oldCul = culture(dr);
    if (dr.origin === D.CLASS_ORIGIN[dr.cls]) dr.origin = D.CLASS_ORIGIN[cls];
    dr.cls = cls;
    if (culture(dr) !== oldCul) dr.profile.name = cre.gen(dr, "name", rnd);
    dr.profile.history = cre.gen(dr, "history", rnd);
    dr.locks = {};
    cre.roll(dr, rnd);
  };
  cre.setOrigin = (dr, id, rnd) => {
    const oldCul = culture(dr);
    dr.origin = id;
    if (culture(dr) !== oldCul) dr.profile.name = cre.gen(dr, "name", rnd);
    cre.fit(dr);
  };
  cre.setAge = (dr, band, rnd) => {
    dr.ageBand = band;
    dr.profile.age = cre.gen(dr, "age", rnd);
    cre.fit(dr);
  };
  cre.setSex = (dr, sex, rnd) => { dr.sex = sex; dr.profile.name = cre.gen(dr, "name", rnd); };

  // ---------------------------------------------------------------- 能力値
  // 振った値（職業の基本＋3D6−3）と、その才能限界。鍵のかかった能力値は変えない
  cre.roll = (dr, rnd) => {
    const c = D.CLASSES[dr.cls];
    dr.rolled = dr.rolled || {};
    dr.caps = dr.caps || {};
    dr.bonus = dr.bonus || {};
    dr.locks = dr.locks || {};
    D.STATS.forEach((k) => {
      if (dr.bonus[k] === undefined) dr.bonus[k] = 0;
      if (dr.locks[k] && dr.rolled[k] !== undefined) return;
      const v = clamp(c.base[k] + dn(rnd, 6) + dn(rnd, 6) + dn(rnd, 6) - 3, 5, 90);
      dr.rolled[k] = v;
      dr.caps[k] = clamp(v + 20 + dn(rnd, 10) + dn(rnd, 10) + dn(rnd, 10), v + 10, 99);
    });
    dr.rolls = (dr.rolls || 0) + 1;
    cre.fit(dr);
  };

  // 年齢・生まれによる補正（表示用に出どころ別にも返す）
  cre.modParts = (dr, k) => {
    const a = D.AGES[dr.ageBand] || D.AGES.prime, o = D.ORIGINS[dr.origin] || {};
    return { age: (a.mod || {})[k] || 0, origin: (o.mod || {})[k] || 0 };
  };
  cre.mod = (dr, k) => { const m = cre.modParts(dr, k); return m.age + m.origin; };
  // ボーナスを足す前の値
  cre.base = (dr, k) => clamp(dr.rolled[k] + cre.mod(dr, k), 5, 90);
  // 才能限界（年齢で上下する。今の値より 5 は上）
  cre.cap = (dr, k) => clamp(dr.caps[k] + ((D.AGES[dr.ageBand] || {}).cap || 0), cre.base(dr, k) + 5, 99);
  cre.value = (dr, k) => cre.base(dr, k) + (dr.bonus[k] || 0);
  cre.final = (dr) => Object.fromEntries(D.STATS.map((k) => [k, cre.value(dr, k)]));
  cre.caps = (dr) => Object.fromEntries(D.STATS.map((k) => [k, cre.cap(dr, k)]));
  cre.bonusUsed = (dr) => D.STATS.reduce((a, k) => a + (dr.bonus[k] || 0), 0);
  cre.bonusLeft = (dr) => D.BONUS_POINTS - cre.bonusUsed(dr);
  cre.total = (dr) => D.STATS.reduce((a, k) => a + cre.value(dr, k), 0);

  // 限界を超えたボーナスを戻す（年齢や生まれを変えたあと）
  cre.fit = (dr) => {
    if (!dr.rolled) return;
    D.STATS.forEach((k) => {
      dr.bonus[k] = Math.max(0, dr.bonus[k] || 0);
      while (dr.bonus[k] > 0 && cre.value(dr, k) > cre.cap(dr, k)) dr.bonus[k]--;
    });
    while (cre.bonusLeft(dr) < 0) { const k = D.STATS.find((s) => dr.bonus[s] > 0); dr.bonus[k]--; }
  };

  cre.canAdd = (dr, k) => cre.bonusLeft(dr) > 0 && cre.value(dr, k) < cre.cap(dr, k);
  cre.canSub = (dr, k) => (dr.bonus[k] || 0) > 0;
  cre.addBonus = (dr, k, dir) => {
    if (dir > 0 ? !cre.canAdd(dr, k) : !cre.canSub(dr, k)) return false;
    dr.bonus[k] += dir > 0 ? 1 : -1;
    return true;
  };
  cre.lockCount = (dr) => D.STATS.filter((k) => dr.locks[k]).length;
  cre.toggleLock = (dr, k) => {
    if (dr.locks[k]) { delete dr.locks[k]; return true; }
    if (cre.lockCount(dr) >= D.LOCK_MAX) return false;
    dr.locks[k] = true;
    return true;
  };

  // 得意な能力値（職業の基本の高い順に 2 つ）
  cre.strengths = (cls) => {
    const b = D.CLASSES[cls].base;
    return [...D.STATS].sort((x, y) => b[y] - b[x]).slice(0, 2);
  };

  // ---------------------------------------------------------------- 仕上げ
  cre.goalText = (dr) => (dr.goal === "custom" ? (String(dr.customGoal || "").trim() || "自由に生きる") : D.GOALS[dr.goal].text);

  // G.newGame に渡す形
  cre.options = (dr, rnd) => {
    const p = { ...dr.profile };
    p.name = String(p.name || "").trim() || cre.gen(dr, "name", rnd);
    p.age = String(p.age || "").trim() || cre.gen(dr, "age", rnd);
    p.sex = dr.sex;
    p.ageBand = dr.ageBand;
    p.origin = dr.origin;
    return { cls: dr.cls, stats: cre.final(dr), caps: cre.caps(dr), profile: p, goal: dr.goal, goalText: cre.goalText(dr) };
  };

  // 始まりの導入。ページ（段落の並び）の配列を返す。古いセーブの人物（年齢の区分・生まれが無い）でも作れる
  cre.prologue = (o) => {
    const P = D.PROLOGUE;
    const p = o.profile || {};
    const band = p.ageBand || (parseInt(p.age, 10) >= 40 ? "old" : parseInt(p.age, 10) <= 22 ? "young" : "prime");
    const org = D.ORIGINS[p.origin];
    const start = D.LOCS[D.CLASSES[o.cls].start];
    // 作成画面の形（goal: id, goalText）とセーブの形（goal: { id, text }）のどちらでもよい
    const g = o.goal && typeof o.goal === "object" ? o.goal : { id: o.goal, text: o.goalText };
    const goalLine = P.goal[D.GOALS[g.id] && P.goal[g.id] ? g.id : "custom"].replace("{text}", g.text || o.goalText || "");
    const fill = (t) => t.replace("{name}", p.name).replace("{age}", p.age);
    return [
      (P.cls[o.cls] || []).slice(),
      [org ? org.home : "", fill(P.age[band]) + (p.history ? `${p.history}。` : "")].filter(Boolean),
      [goalLine, P.arrive.replace("{place}", start.name)],
    ];
  };
})(globalThis.G = globalThis.G || {});
