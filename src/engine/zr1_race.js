// R1：種族（人間・エルフ・獣人）。表は src/data/r1_races.js。DOM には触らない。
// 名前の頭の z は、u5_creation.js（G.cre）・m10_love.js・ending_m6.js より後に読ませるため（manifest は触らない）。
//
// 状態：S.profile.race（"human" / "elf" / "beast"）・S.profile.beast（獣人の元の獣。D.BEASTS の鍵）。
//   古いセーブには無い → 人間として動く（G.r1Of が埋める。セーブは書き換えない）。墓碑にも g.race・g.beast を残す。
//   仲間：c.race・c.beast（酒場で雇う者・「random」で加わる者は名前から決まる。乱数を進めない）。無ければ人間。
//     ほかの子が名のある仲間を足すときは、仲間の欄に race・beast を書けば、その種族になる（例：{ name: "…", race: "beast", beast: "wolf" }）。
// 効き目（どれも「ほどよく」）：
//   作成 … 能力値の補正（生まれ・年齢と同じ扱い）、年齢の幅、名前の響き
//   判定 … 特性（夜目・鳥目と遠目・冬毛・耳）と人の目（国ごとの魅力の補正）。成功率の見込み（画面の％）と判定は同じ
//   出来事 … 種族・特性で起きる出来事（src/data/events_r1.js）と、既存の出来事に足す選択肢（D.R1_EXTRA）
//   評判（M3）… 人の国（王国・帝国・教会領）でエルフ・獣人が罪を犯すと、悪名が 1 多く付く（覚えられやすい）
//   恋（M10）… 同じ獣の獣人どうし・エルフどうしは相性 +1。種族の違う恋人・連れ合いは、人生の物語に一文
//   人生の物語（M6）… 最初の段落に種族の一文。エルフは「その後」も長い
// core.js・combat.js・u5_creation.js・m10_love.js・ending_m6.js は書き換えず、ここで包む。レーン C（R1）
(function (G) {
  const D = G.data;
  const hash = (s) => { let h = 0; for (const ch of String(s)) h = (Math.imul(31, h) + ch.codePointAt(0)) | 0; return Math.abs(h); };
  // 名前から決まった乱数（G.rand を進めない）
  const fixedRand = (key) => { let s = hash(key) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
  const uniq = (a) => [...new Set(a)];

  // ---------------------------------------------------------------- 種族を読む
  // S はセーブ（profile を見る）・墓碑・仲間・{ race, beast } のどれでもよい
  G.r1Of = (S) => {
    S = S === undefined ? G.S : S;
    const p = (S && (S.profile || S)) || {};
    const race = D.RACES[p.race] ? p.race : "human";
    const beast = race === "beast" ? (D.BEASTS[p.beast] ? p.beast : D.BEAST_KEYS[0]) : "";
    return { race, beast };
  };
  // 種族と元の獣を合わせた表（能力値の補正・年齢の幅・特性・人の目）
  G.r1Spec = (r) => {
    r = r && r.race ? r : G.r1Of(r);
    const R = D.RACES[r.race] || D.RACES.human;
    const B = r.race === "beast" ? D.BEASTS[r.beast] || {} : {};
    const mod = { ...(R.mod || {}) };
    Object.entries(B.mod || {}).forEach(([k, v]) => { mod[k] = (mod[k] || 0) + v; });
    return {
      race: r.race, beast: r.beast, mod,
      ages: B.ages || R.ages || null,
      traits: uniq([...(R.traits || []), ...(B.traits || [])]),
      greet: R.greet || {}, temper: B.temper || "",
    };
  };
  // 呼び名（「エルフ」「狼の獣人」「人間」）
  G.r1Name = (r) => {
    r = r && r.race ? r : G.r1Of(r);
    return r.race === "beast" ? `${D.BEASTS[r.beast].name}の獣人` : D.RACES[r.race].name;
  };
  // 種族・獣・特性のどれかに当たるか（"elf" / "beast" / "human" / "wolf" などの獣 / "nose" などの特性）
  G.r1Is = (what, S) => {
    const r = G.r1Of(S);
    if (D.RACES[what]) return r.race === what;
    if (D.BEASTS[what]) return r.beast === what;
    return G.r1Spec(r).traits.includes(what);
  };
  G.r1Human = (S) => G.r1Of(S).race === "human";

  // ---------------------------------------------------------------- 判定（特性と人の目）
  let rctx;   // 今の判定の場面（"flee" 逃げる）
  const nation = () => { const L = G.loc(); return L && (L.nation || L.region); };
  // その能力値の判定に足す数。画面の見込みと実際の判定の両方に効く（G.chance を包む）
  G.r1Mod = (stat, S) => {
    S = S || G.S;
    if (!S || !S.profile || S.mode === undefined) return 0;
    const r = G.r1Of(S);
    if (r.race === "human") return 0;
    const sp = G.r1Spec(r);
    const has = (t) => sp.traits.includes(t);
    const L = G.loc();
    const dark = S.phase === 3 || (L && L.type === "dungeon");
    let n = 0;
    if (stat === "敏捷" || stat === "知力") {
      if (has("nightEye") && dark) n += 5;
      if (has("birdEye")) n += dark ? -5 : L && L.type === "wild" ? 5 : 0;
    }
    if (stat === "体力" && has("fur") && G.eventTags().includes("snow")) n += 5;
    if (stat === "魅力") n += sp.greet[nation()] || 0;
    if (rctx === "flee" && has("ears")) n += (D.R1_EAR_SMALL || []).includes(r.beast) ? 5 : 10;
    return n;
  };
  const chance0 = G.chance;
  G.chance = (stat, diff, extra) => chance0(stat, diff, (extra || 0) + G.r1Mod(stat));
  const check0 = G.check;
  G.check = (stat, diff, reason, extra) => {
    const p = rctx;
    if (reason === "逃走") rctx = "flee";
    try { return check0(stat, diff, reason, extra); } finally { rctx = p; }
  };
  if (G.cb && G.cb.flee) {
    const flee0 = G.cb.flee;
    G.cb.flee = (...a) => { const p = rctx; rctx = "flee"; try { return flee0(...a); } finally { rctx = p; } };
  }
  // 特性の一覧（シート・作成画面）
  G.r1Traits = (r) => G.r1Spec(r).traits.map((t) => D.R1_TRAITS[t]).filter(Boolean);
  // 人の目の一覧（「レオネスト王国 −5」など）
  G.r1Greet = (r) => Object.entries(G.r1Spec(r).greet).filter(([, v]) => v);

  // ---------------------------------------------------------------- 新しい冒険
  const newGame0 = G.newGame;
  G.newGame = (opt) => {
    const r = G.r1Of({ profile: (opt && opt.profile) || {} });
    const S = newGame0(opt);
    S.profile.race = r.race;
    if (r.beast) S.profile.beast = r.beast; else delete S.profile.beast;
    return S;
  };

  // ---------------------------------------------------------------- 作成（U5）
  const cre = G.cre;
  if (cre) {
    const rOf = (dr) => G.r1Of({ profile: { race: dr.race, beast: dr.beast } });
    // 能力値の補正：生まれ・年齢と並べて「種族」を出す
    const parts0 = cre.modParts;
    cre.modParts = (dr, k) => Object.assign(parts0(dr, k), { race: G.r1Spec(rOf(dr)).mod[k] || 0 });
    const mod0 = cre.mod;
    cre.mod = (dr, k) => mod0(dr, k) + (G.r1Spec(rOf(dr)).mod[k] || 0);
    // 年齢の幅と名前の響き
    cre.ageRange = (dr, band) => {
      const sp = G.r1Spec(rOf(dr));
      return (sp.ages && sp.ages[band || dr.ageBand]) || D.AGES[band || dr.ageBand].range;
    };
    const gen0 = cre.gen;
    cre.gen = (dr, key, rnd) => {
      const r = rOf(dr);
      if (key === "age" && r.race !== "human") { const [a, b] = cre.ageRange(dr); return String(a + Math.floor(rnd() * (b - a + 1))); }
      if (key === "name" && r.race !== "human") {
        const R = D.RACES[r.race];
        const pool = R.names && D.PROFILE.names[R.names] && D.PROFILE.names[R.names][dr.sex];
        // シェルアークの生まれはシェルアークの名前のまま。ほかの生まれは、種族の響きと生まれの響きを混ぜる
        const yakumo = (D.ORIGINS[dr.origin] || {}).culture === "yakumo";
        if (pool && !yakumo && rnd() < (R.nameRate || 0)) return pool[Math.floor(rnd() * pool.length)];
      }
      return gen0(dr, key, rnd);
    };
    // 種族を変える：名前と年齢を作り直す。能力値は振り直さない（補正だけ変わる）
    const reshape = (dr, rnd, before) => {
      const after = rOf(dr);
      if (before.race !== after.race) { dr.profile.name = cre.gen(dr, "name", rnd); }
      if (before.race !== after.race || G.r1Spec(before).ages !== G.r1Spec(after).ages) dr.profile.age = cre.gen(dr, "age", rnd);
      cre.fit(dr);
    };
    cre.setRace = (dr, race, rnd) => {
      if (!D.RACES[race]) return;
      const before = rOf(dr);
      dr.race = race;
      if (race === "beast" && !D.BEASTS[dr.beast]) dr.beast = D.BEAST_KEYS[Math.floor(rnd() * D.BEAST_KEYS.length)];
      if (race !== "beast") delete dr.beast;
      if (before.race === race && before.beast === rOf(dr).beast) return;
      reshape(dr, rnd, before);
    };
    // 元の獣を選ぶ（"auto" はおまかせ）
    cre.setBeast = (dr, beast, rnd) => {
      const before = rOf(dr);
      dr.race = "beast";
      dr.beast = D.BEASTS[beast] ? beast : D.BEAST_KEYS[Math.floor(rnd() * D.BEAST_KEYS.length)];
      if (before.race === "beast" && before.beast === dr.beast) return;
      reshape(dr, rnd, before);
    };
    // おまかせで種族を選ぶ（人間が多い）
    cre.randomRace = (dr, rnd) => {
      const W = D.R1_RANDOM;
      let x = rnd() * Object.values(W).reduce((a, b) => a + b, 0);
      let race = "human";
      for (const [k, w] of Object.entries(W)) { x -= w; if (x <= 0) { race = k; break; } }
      if (race === "beast") cre.setBeast(dr, "auto", rnd); else cre.setRace(dr, race, rnd);
      return dr;
    };
    // 年齢の区分を変えたとき：種族の幅で作り直す（cre.setAge は cre.gen を呼ぶので、そのままでよい）
    const opts0 = cre.options;
    cre.options = (dr, rnd) => {
      const o = opts0(dr, rnd);
      const r = rOf(dr);
      o.profile.race = r.race;
      if (r.beast) o.profile.beast = r.beast;
      return o;
    };
    // 導入の 2 ページ目に、種族の一行を添える（名前から決まる）
    const prologue0 = cre.prologue;
    cre.prologue = (o) => {
      const pages = prologue0(o);
      const p = (o && o.profile) || {};
      const r = G.r1Of({ profile: p });
      const T = D.R1_TEXT.prologue[r.race];
      if (T && pages[1]) {
        const t = T[hash(`${p.name}:${r.race}`) % T.length].replace(/\{beast\}/g, r.beast ? D.BEASTS[r.beast].name : "");
        pages[1].splice(Math.min(1, pages[1].length), 0, t);
      }
      return pages;
    };
  }

  // ---------------------------------------------------------------- 既存の出来事に足す選択肢（D.R1_EXTRA。末尾に足すので番号は変わらない）
  Object.entries(D.R1_EXTRA || {}).forEach(([id, list]) => {
    const e = D.EVENTS.find((x) => x.id === id);
    if (!e) return;
    list.forEach((c) => { if (!e.choices.some((x) => x.label === c.label)) e.choices.push(Object.assign({ cond: (S) => G.r1Is(c.r1, S) }, c)); });
  });

  // ---------------------------------------------------------------- 仲間（M2）
  G.r1Comp = (c) => G.r1Of(c && c.race ? { race: c.race, beast: c.beast } : { race: "human" });
  G.r1CompLabel = (c) => (c && c.race && c.race !== "human" ? G.r1Name(G.r1Comp(c)) : "");
  // 酒場で雇える者・「random」で加わる者：名前から種族を決め、種族の響きの名前を付け直す（乱数を進めない）
  if (G.genCompanion) {
    const gen0 = G.genCompanion;
    G.genCompanion = () => {
      const c = gen0();
      const rr = fixedRand(`${c.name}:${c.power}:${G.S ? G.S.day + ":" + G.S.turn : ""}:r1`);
      const x = rr();
      const W = D.R1_COMP;
      const race = x < W.elf ? "elf" : x < W.elf + W.beast ? "beast" : "human";
      if (race === "human") return c;
      c.race = race;
      if (race === "beast") c.beast = D.BEAST_KEYS[Math.floor(rr() * D.BEAST_KEYS.length)];
      const sex = G.m10Sex ? G.m10Sex(c) : rr() < 0.5 ? "男" : "女";
      c.sex = sex;
      const pool = D.PROFILE.names[D.RACES[race].names][sex];
      if (pool && rr() < (D.RACES[race].nameRate || 0)) c.name = `${c.cls}の${pool[Math.floor(rr() * pool.length)]}`;
      if (race === "elf" && !c.age) c.age = 60 + Math.floor(rr() * 200);
      return c;
    };
  }

  // ---------------------------------------------------------------- 評判（M3）：人の国では、エルフと獣人は覚えられやすい
  if (G.crime) {
    const crime0 = G.crime;
    G.crime = (kind, n) => {
      crime0(kind, n);
      const S = G.S;
      if (!S || G.r1Human(S) || !(D.CRIMES || {})[kind]) return;
      const at = n === undefined ? G.nationOf() : n;
      if (!at || !((G.r1Spec(G.r1Of(S)).greet[at] || 0) < 0)) return;
      if (!S.flags.r1_noted) { S.flags.r1_noted = 1; G.say(G.pick(D.R1_TEXT.noted)); }
      G.addInfamy(1, at);
    };
  }

  // ---------------------------------------------------------------- 恋（M10）
  if (G.m10Compat) {
    const compat0 = G.m10Compat;
    G.m10Compat = (c, S) => {
      S = S || G.S;
      const n = compat0(c, S);
      const you = G.r1Of(S), them = G.r1Comp(c);
      const same = you.race !== "human" && you.race === them.race && you.beast === them.beast;
      return same ? G.clamp(n + 1, -1, 2) : n;
    };
  }
  // 種族の違う恋人・連れ合いの一文（人生の物語）
  G.r1LoveLine = (S, name) => {
    const p = G.m10Partner && G.m10Partner(S);
    if (!p) return "";
    const you = G.r1Of(S), them = G.r1Comp(p);
    const T = D.R1_TEXT.love;
    const t = you.race === "elf" && them.race !== "elf" ? T.elf : them.race === "elf" && you.race !== "elf" ? T.elf_partner : "";
    return t.replace(/\{sp\}/g, G.m2Short(p)).replace(/\{name\}/g, name);
  };

  // ---------------------------------------------------------------- 人生の物語（M6）と墓碑
  if (G.m6Compose) {
    const compose0 = G.m6Compose;
    G.m6Compose = (S) => {
      const story = compose0(S);
      if (!story || !S || !story.life || !story.life.length) return story;
      const r = G.r1Of(S);
      if (r.race === "human") return story;
      const name = (S.profile && S.profile.name) || S.name || "その人";
      const fill = (t) => t.replace(/\{name\}/g, name).replace(/\{beast\}/g, r.beast ? D.BEASTS[r.beast].name : "");
      story.life[0] += fill(G.pick(D.R1_TEXT.story[r.race]));
      try {
        const ll = S.profile ? G.r1LoveLine(S, name) : "";
        if (ll) story.life[Math.max(0, story.life.length - 2)] += ll;
      } catch (e) { /* 恋の一文なしでも物語は出る */ }
      if (r.race === "elf" && story.after && story.after.length) story.after[0] = fill(G.pick(D.R1_TEXT.after_elf)) + story.after[0];
      return story;
    };
  }
  // 墓碑の一言（「狼の獣人」。人間は空）
  G.r1GraveLine = (g) => {
    const r = G.r1Of(g);
    if (r.race === "human") return "";
    return D.R1_TEXT.grave[r.race].replace(/\{beast\}/g, r.beast ? D.BEASTS[r.beast].name : "");
  };
  const finish0 = G.finishRun;
  G.finishRun = () => {
    const S = G.S;
    const r = S && G.r1Of(S);
    const cb = G.onFinish;
    G.onFinish = () => {
      G.onFinish = cb;
      const g = G.P.graves[0];
      if (g && S && g.id === S.id && r) { g.race = r.race; if (r.beast) g.beast = r.beast; }
      if (cb) cb();
    };
    try { finish0(); } finally { G.onFinish = cb; }
  };

  // ---------------------------------------------------------------- シート（画面は G.S を読んで描く）
  G.r1Rows = (S) => {
    S = S || G.S;
    const r = G.r1Of(S);
    if (r.race === "human") return [["種族", "人間"]];
    const sp = G.r1Spec(r);
    const rows = [["種族", G.r1Name(r)]];
    if (sp.temper) rows.push(["気性", sp.temper]);
    const tr = G.r1Traits(r);
    if (tr.length) rows.push(["特性", tr.map((t) => `${t.name}：${t.hint}`).join("／")]);
    const gr = G.r1Greet(r);
    if (gr.length) rows.push(["人の目", gr.map(([n, v]) => `${n} 魅力${v > 0 ? "+" : "−"}${Math.abs(v)}`).join("・")]);
    return rows;
  };
})(globalThis.G = globalThis.G || {});
