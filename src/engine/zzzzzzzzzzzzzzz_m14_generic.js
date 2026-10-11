// M14：汎用の術（暮らし・探索）と術の巻物。データは src/data/spells_m14g.js、才と関門は src/engine/m14_magic.js（G.m14）。
//   施設で教わる（学院・教会・裏路地。知力の判定。野営では覚えない）
//   出来事の選択肢（錠・古い字・忍び込む・衛兵・水。C10・K1 の出来事の種類で見分ける）。MP を払って魔力で判定し、大失敗すると借りを返す
//   錠の出来事には、開錠の術と盗賊のスキル「鍵開け」（k1_lockpick）の両方の道を置く（どちらか持っていれば開く）
//   その場でできる行動（灯り・物探し・毒抜き）、戦闘の「道具」の術の巻物（才が要らない。一度きり）
// 名前の z の数は zzzzzzzzzzzzzz_m14_late.js（C10・K1 の出来事の選択肢を足し終えたあと）に読むため。DOM に触らない。乱数は G.rand。レーン C＋V（M14）
(function (G) {
  const D = G.data;
  const M = G.m14;
  if (!M) return;
  const SP = D.SPELLS;
  const GEN = Object.keys(SP).filter((id) => SP[id].generic);
  M.GEN = GEN;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const day = () => (G.S ? G.S.day : 0);
  const st = (S) => { S = S || G.S; S.m14g = S.m14g || {}; return S.m14g; };   // 古いセーブには無い

  // 判定の補正：汎用の術は属性を問わず、才の高さだけが効く
  const gear0 = G.gearBonus;
  G.gearBonus = (kind) => (kind === "m14g" ? (G.S && M.has() ? D.M14_CAST.lv[M.talent().lv] || 0 : 0) : gear0(kind));
  M.genChance = (id) => G.chance("魔力", SP[id].diff || "普通", G.gearBonus("m14g") + G.magicBonus());
  // 唱える（MP を払う・大失敗で借り）。成否を返す
  M.genCast = (id, label) => {
    const S = G.S;
    const sp = SP[id];
    S.mp -= sp.mp;
    const r = G.check("魔力", sp.diff || "普通", label || sp.name, G.gearBonus("m14g") + G.magicBonus());
    if (r.fumble) G.payDebt(sp.debt || 1);
    return r;
  };

  // ---------------------------------------------------------------- 施設で教わる（学院・教会・裏路地）
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    const T = S && (D.M14_GTEACH || {})[S.fac];
    if (!T || !M.has()) return g;
    const ids = GEN.filter((id) => (SP[id].teach || []).includes(S.fac));
    if (!ids.length) return g;
    const list = ids.map((id) => {
      const sp = SP[id];
      if (G.knows(id)) return { id: `m14g:${id}`, label: `${sp.name}を教わる`, sub: "もう覚えている", disabled: true, kw: sp.kw };
      return { id: `m14g:${id}`, label: `${sp.name}を教わる`, sub: `${T.gold}G・${T.days}日・知力 ${G.chance("知力", T.diff)}%・${sp.hint}`, disabled: S.gold < T.gold, kw: [...sp.kw, "教"] };
    });
    g.splice(Math.max(0, g.length - 1), 0, { title: T.title, list });
    return g;
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    if (head !== "m14g") return facAct0(head, arg, a);
    const S = G.S;
    const T = (D.M14_GTEACH || {})[S.fac];
    const sp = SP[arg];
    if (!T || !sp || !sp.generic || !(sp.teach || []).includes(S.fac) || M.canLearn(arg) || S.gold < T.gold) return;
    S.gold -= T.gold;
    G.log("you", `${sp.name}を教わる`);
    G.note(`所持金 -${T.gold}G`);
    G.passDays(T.days);
    G.say(T.line);
    const r = G.check("知力", T.diff, `${sp.name}の手ほどき`);
    if (r.ok) G.learnSpell(arg);
    else G.say("言われたとおりに手を動かした。手のひらの上には、まだ何も起きない。");
  };

  // ---------------------------------------------------------------- その場でできる行動（灯り・物探し・毒抜き）
  const inDungeon = (S) => S.depth > 0 && (D.LOCS[S.loc] || {}).type === "dungeon";
  M.lit = (S) => { S = S || G.S; return !!(S && inDungeon(S) && st(S).light === `${S.loc}:${S.depth}`); };
  const exploreActions0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = exploreActions0();
    const S = G.S;
    if (!S || S.mode !== "explore" || S.travel) return groups;
    const list = [];
    const can = (id) => G.knows(id) && SP[id];
    if (can("g_light") && inDungeon(S)) list.push({ id: "m14ga:light", label: "灯りの術をともす", sub: M.lit(S) ? "この階はもう明るい" : `魔力 ${M.genChance("g_light")}%・MP${SP.g_light.mp}・この階の判定が少し楽に`, disabled: M.lit(S) || S.mp < SP.g_light.mp, kw: SP.g_light.kw });
    if (can("g_seek")) { const used = st(S).seek === day(); list.push({ id: "m14ga:seek", label: "物探しの術を使う", sub: used ? "今日はもう探した" : `魔力 ${M.genChance("g_seek")}%・MP${SP.g_seek.mp}`, disabled: used || S.mp < SP.g_seek.mp, kw: SP.g_seek.kw }); }
    if (can("g_water") && (S.conds || []).includes("毒")) list.push({ id: "m14ga:purify", label: "水を清める術で毒を抜く", sub: `魔力 ${M.genChance("g_water")}%・MP${SP.g_water.mp}`, disabled: S.mp < SP.g_water.mp, kw: [...SP.g_water.kw, "解毒"] });
    if (list.length) groups.splice(Math.min(1, groups.length), 0, { title: "暮らしの術", list });
    return groups;
  };
  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "m14ga") return exploreAct0(head, arg, a);
    const S = G.S;
    if (arg === "light") {
      if (!G.knows("g_light") || !inDungeon(S) || M.lit(S) || S.mp < SP.g_light.mp) return;
      G.log("you", "灯りの術をともす");
      const r = M.genCast("g_light");
      if (r.ok) { st(S).light = `${S.loc}:${S.depth}`; G.say("手のひらの上に白い灯りが一つ浮かんだ。壁の継ぎ目と床の窪みが、くっきり見えた。"); }
      else G.say(r.fumble ? "灯りは一瞬だけ燃え上がり、目を焼いて消えた。" : "灯りは豆粒ほどにしかならず、すぐに消えた。");
      G.pass(1);
    } else if (arg === "seek") {
      if (!G.knows("g_seek") || st(S).seek === day() || S.mp < SP.g_seek.mp) return;
      st(S).seek = day();
      G.log("you", "物探しの術を使う");
      const r = M.genCast("g_seek");
      if (r.ok) {
        const n = G.d(r.crit ? 40 : 15) + 5;
        if (G.rand() < 0.35 && G.give("herb")) G.say("指先が勝手に地面のほうを向いた。草むらの奥に、誰かが摘み忘れた薬草が残っていた。");
        else { S.gold += n; G.say("指先が勝手に向いたほうへ歩くと、石の下に誰かが隠した小銭の包みがあった。"); G.note(`所持金 +${n}G`); }
      } else G.say(r.fumble ? "指先がぐるぐる回って止まらない。探しているものは、どこにも無いらしい。" : "何も引っかからなかった。");
      G.pass(1);
    } else if (arg === "purify") {
      if (!G.knows("g_water") || !(S.conds || []).includes("毒") || S.mp < SP.g_water.mp) return;
      G.log("you", "水を清める術を、自分の血に向ける");
      const r = M.genCast("g_water");
      if (r.ok) { S.conds = S.conds.filter((c) => c !== "毒"); G.say("喉の奥の苦みがすっと引いた。"); G.note("毒が抜けた。"); }
      else G.say("苦みは消えなかった。");
      G.pass(1);
    }
  };
  // 灯りがともっている階では、知力・敏捷の判定が少し楽になる
  //（G.check は G.chance で成功率を出すので、G.chance だけ包めば判定にも効く。戦闘の中は除く）
  const chance0 = G.chance;
  G.chance = (stat, diff, extra) => chance0(stat, diff, (extra || 0) + (G.S && G.S.mode !== "combat" && M.lit() && (stat === "知力" || stat === "敏捷") ? 10 : 0));

  // ---------------------------------------------------------------- 出来事の選択肢
  const CATS = D.M14_CATS || {};
  const catsOf = (e) => {
    const t = `${e.title || ""}　${e.text || ""}`;
    const own = Object.keys(CATS).filter((k) => CATS[k].re.test(t) && !(CATS[k].not && CATS[k].not.test(t)));
    const k1 = G.k1 && G.k1.catsOf ? G.k1.catsOf(e) : G.c10 && G.c10.catsOf ? G.c10.catsOf(e) : [];
    return [...new Set([...k1, ...own])];
  };
  M.genCatsOf = catsOf;
  const SKIP_ID = /^(m6_|e3_|rr|m7_|m10_|m11_|m2_|c\d+_|q\d+_|kn_|r2_|v2_gigi|w6w_mate|epi|i3_|c1_|w6|k1_|m14_)/;
  const pickOf = (e, x) => (Array.isArray(x) ? x[hash(e.id + "#m14") % x.length] : x);
  const withMp = (o, mp) => (o ? Object.assign({}, o, { mp: -mp }) : { mp: -mp });
  M.makeChoice = (e, id) => {
    const sp = SP[id];
    const T = D.M14_GTPL[id];
    const c = { label: T.label, stat: "魔力", diff: sp.diff || "普通", bonus: "m14g", ok: withMp(pickOf(e, T.ok), sp.mp), ng: withMp(pickOf(e, T.ng), sp.mp), cond: (S) => G.knows(id, S) && S.mp >= sp.mp };
    Object.defineProperty(c, "m14g", { value: id, enumerable: false });
    return c;
  };
  M.added = {};
  M.applyEvents = () => {
    (D.EVENTS || []).forEach((e) => {
      if (!e || !Array.isArray(e.choices) || e._m14g) return;
      e._m14g = true;
      if (e.once || e.noC10 || SKIP_ID.test(e.id) || (D.C10_NOTPL || []).includes(e.id) || /\{[a-z]+\}/.test(e.text || "") || e.choices.some((c) => c.next)) return;
      const cats = catsOf(e);
      if (!cats.length) return;
      // 種類に合う術を一つ（出来事 id で選ぶので、いつも同じ）。錠は開錠の術を必ず
      const ids = GEN.filter((id) => D.M14_GTPL[id] && cats.includes(SP[id].cat) || (id === "g_hush" && cats.includes("guard")));
      if (!ids.length) return;
      const id = cats.includes("lock") ? "g_unlock" : ids[hash(e.id + "m14") % ids.length];
      e.choices.push(M.makeChoice(e, id));
      M.added[e.id] = (M.added[e.id] || 0) + 1;
      // 錠には盗賊の鍵開けの道も（K1 の型が別のスキルを選んでいたとき）
      if (id === "g_unlock" && G.k1 && G.k1.make && !e.choices.some((c) => c.k1 === "k1_lockpick")) {
        const tp = (D.K1_TPL || []).find((t) => t.cat === "lock" && t.sk === "k1_lockpick");
        if (tp) { e.choices.push(G.k1.make({ ...tp, ok: pickOf(e, tp.ok), ng: pickOf(e, tp.ng) })); M.added[e.id]++; }
      }
    });
  };
  M.applyEvents();
  let seenN = (D.EVENTS || []).length;
  const choices0 = G.eventChoices;
  G.eventChoices = () => { const n = (D.EVENTS || []).length; if (n !== seenN) { seenN = n; M.applyEvents(); } return choices0(); };
  // 選んだ術の大失敗で借りを返す
  const choose0 = G.chooseEvent;
  G.chooseEvent = (i) => {
    const S = G.S;
    const e = S && D.EVENTS.find((x) => x.id === S.event);
    const c = e && e.choices[i];
    const f0 = S ? S.counters.fumbles : 0;
    const r = choose0(i);
    if (c && c.m14g && G.S === S && !S.over && S.counters.fumbles > f0) G.payDebt(SP[c.m14g].debt || 1);
    return r;
  };
  // 画面：術の選択肢に術の名を添える
  const actions0 = G.actions;
  G.actions = () => {
    const g = actions0();
    const S = G.S;
    if (!S || S.mode === "combat") return scrolls(g);
    if (S.mode !== "event") return g;
    const e = D.EVENTS.find((x) => x.id === S.event);
    if (!e || !e._m14g) return g;
    g.forEach((grp) => (grp.list || []).forEach((a) => {
      const m = /^ev:(\d+)$/.exec(a.id || "");
      const c = m && e.choices[+m[1]];
      if (c && c.m14g && !a.m14g) { a.m14g = c.m14g; a.sub = `${SP[c.m14g].name}・MP${SP[c.m14g].mp}・${a.sub || ""}`.replace(/・$/, ""); }
    }));
    return g;
  };

  // ---------------------------------------------------------------- 戦闘：術の巻物（道具の組。才が要らない）
  function scrolls(g) {
    const S = G.S;
    if (!S || S.mode !== "combat") return g;
    g.forEach((grp) => (grp.list || []).forEach((a) => {
      const m = /^cb:item:(.+)$/.exec(a.id || "");
      const it = m && D.ITEMS[m[1]];
      if (!it || !it.m14scroll || !SP[it.m14scroll]) return;
      a.id = "cb:m14scroll:" + m[1];
      a.sub = `封を切る・${SP[it.m14scroll].hint}・魔力 ${G.chance("魔力", M.spellVs({ diff: "易しい" }, M.vsOf(it.m14scroll)), G.magicBonus())}%`;
    }));
    return g;
  }
  G.cbActs.m14scroll = (t, itemId) => {
    const it = D.ITEMS[itemId];
    if (!it || !it.m14scroll || !G.take(itemId)) return;
    M.cast(it.m14scroll, t, { scroll: true });
  };
})(globalThis.G = globalThis.G || {});
