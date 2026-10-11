// E7：使徒を正面から倒す長編（一体ずつの章立ての物語）。表は src/data/e7_0_saga.js（D.E7.SAGAS）、文は src/data/e7_<使徒>_*.js。
// 新しい大きな仕組みは足さない。章は出来事（D.EVENTS）で、入口は行動の欄「使徒を追う」（その章の場所にいるときだけ）。
// 進み具合は依頼の一覧（Q7）の一行と年表に残す。決戦は E3 の使徒の戦い（zz_e3_apostles.js）をそのまま使い、その戦いだけ長編の強さに替える。
//
// 章：saga.chapters[i] = { title, line 依頼の一覧の説明, at 場所（[id] か "town"）, start 入口の出来事, gap 前の章から空ける日数,
//      subs { 鍵: { title, at, start, line } }・need（その数の小さな段を済ませれば次の章へ進める。残りは次の章を始めるまで選べる）, chron 済ませたときの年表 }
// 出来事の結果 e7：{ id 長編, done 済ませた章の番号, sub 済ませた小さな段, prep 備え, set { 話の印 }, fight "toy"|"final", won, end 結末, close 閉じる, back 戻る章, lose 失う人, gain 加わる人 }
// 決戦の強さ：saga.final（正面からの強さ）から、備え（prep）・仲間・E3 の条件・縁で聞いた名（M13）で弱る。絶界は備え（open）か剣か E3 の zekkai の条件で破れる。
// 一度目の対面（toy）：勝てない戦い。糸が倒れることを許さず（HP は 1 で止まる）、何手かで若君が飽きて終わる。
// 裏道：E3 の会う出来事・鍵の品はそのまま。長編の途中で別の手で倒したら、長編は「別の手で」で閉じる（正面からの報いは無い）。
// セーブに足すもの：S.e7 = { 長編 id: { ch, day, on, f {}, sub {}, prep {}, fight, won, end, endDay, closed, retreats } }。古いセーブで無くても動く。
// 結末（end）は決着の場で決まり、報い（名声・年表・トロフィー・町に残る一行）もそこで付く。そのあと後日談の章（after: true）を済ませると閉じる（close）。
// 乱数は使わない（判定と戦いは出来事・戦闘の仕組みのまま）。DOM には触らない。名前の頭の z の数で、ほかの包み（E3・C9・F1・M13・F4・Q7）より外側にする。
// レーン E＋V（E7）
(function (G) {
  const D = G.data;
  const E7 = D.E7;
  if (!E7 || !E7.SAGAS) return;
  const X = (G.e7 = G.e7 || {});
  const SAGAS = E7.SAGAS;
  const lines = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const locName = (id) => (id && D.LOCS[id] ? D.LOCS[id].name : "");

  // ---------------------------------------------------------------- 格（S 級・A 級・B 級）
  // 格はここを通して読む（呼び名の置き換え〔E8〕が入ったら、G.apostleGrade があればそちらを使う）。tier の内部の値は直接いじらない
  const GRADE = { 天災: "S", 国難: "A", 討伐: "B", S: "S", A: "A", B: "B" };
  X.grade = (apostle) => {
    if (G.apostleGrade) { const g = G.apostleGrade(apostle); if (g) return g; }
    const a = D.E3 && D.E3.LIST && D.E3.LIST[apostle];
    return (a && GRADE[a.grade || a.rank]) || null;
  };

  // ---------------------------------------------------------------- 状態
  X.of = (id, S) => {
    S = S || G.S;
    if (!S) return null;
    if (!S.e7 || typeof S.e7 !== "object") S.e7 = {};
    const st = S.e7[id] || (S.e7[id] = { ch: 0, day: 0, on: false, f: {}, sub: {}, prep: {}, fight: "", won: false, end: "", endDay: 0, retreats: 0 });
    st.f = st.f || {}; st.sub = st.sub || {}; st.prep = st.prep || {};
    return st;
  };
  X.peek = (id, S) => { S = S || G.S; return (S && S.e7 && S.e7[id]) || null; };
  X.flag = (id, k, S) => { const st = X.peek(id, S); return st && st.f ? st.f[k] : undefined; };
  X.preps = (id, S) => { const st = X.peek(id, S); return st ? Object.keys(st.prep || {}).filter((k) => st.prep[k]) : []; };
  X.ended = (id, S) => { const st = X.peek(id, S); return !!(st && st.end); };
  // 使徒がもう倒れている（この冒険で。長編の決戦か、裏道か）
  const apostleDown = (sg, S) => !!(S && ((S.e3 && (S.e3.done || []).includes(sg.apostle)) || (sg.flag && S.flags && S.flags[sg.flag])));

  // 今の章（まだ済ませていない章）。小さな段の章で、必要な数を済ませていれば、次の章も始められる
  X.cur = (id, S) => {
    S = S || G.S;
    const sg = SAGAS[id];
    const st = X.peek(id, S);
    if (!sg || !st || st.closed) return null;
    const i = st.ch;
    const c = sg.chapters[i];
    if (!c) return null;
    // 結末のあとは、後日談の章（after）だけ。裏道で閉じた長編には後日談が無い
    if (st.end && (st.end === "back" || !c.after)) return null;
    return { i, c };
  };
  const subsDone = (st, c) => Object.keys(c.subs || {}).filter((k) => st.sub[k]).length;
  const atOk = (at, S) => {
    const L = D.LOCS[S.loc];
    if (!L) return false;
    if (at === "town") return L.type === "town";
    return lines(at).includes(S.loc);
  };
  const gapOk = (c, st, S) => S.day >= (st.day || 0) + (c.gap === undefined ? 1 : c.gap);
  // 始めてよいか（章の入口の条件）
  X.canOpen = (id, S) => {
    S = S || G.S;
    const sg = SAGAS[id];
    if (!sg || !S || apostleDown(sg, S)) return false;
    const st = X.peek(id, S);
    if (st && (st.on || st.end)) return false;
    return !!(sg.open && sg.open(S));
  };

  // 章の数（後日談の終章は数えない）と、章の呼び名（「第三章」「終章」）
  const KAN = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
  X.count = (id) => SAGAS[id].chapters.filter((c) => !c.after).length;
  X.chName = (id, i) => { const c = SAGAS[id].chapters[i]; return c && c.after ? "終章" : `第${KAN[i] || i + 1}章`; };

  // 行動の欄に出す段：[{ key, label, sub, ev, kind: "open"|"ch"|"sub"|"next" }]
  X.here = (S) => {
    S = S || G.S;
    if (!S || S.over || S.travel || S.mode !== "explore" || S.combat || S.event) return [];
    const out = [];
    Object.entries(SAGAS).forEach(([id, sg]) => {
      // 入口（opener。章に数えない噂の場面。無ければ一章目）
      const c0 = sg.opener || sg.chapters[0];
      if (X.canOpen(id, S) && c0 && atOk(c0.at, S) && (!c0.cond || c0.cond(S, X.peek(id, S) || { f: {} }))) {
        out.push({ key: `${id}:open`, label: sg.openLabel || `${sg.title}：${c0.title}`, sub: sg.openSub || "噂をたどる", ev: c0.start, kind: "open", id });
        return;
      }
      const st = X.peek(id, S);
      if (!st || !st.on || st.closed || st.fight) return;
      const cur = X.cur(id, S);
      if (!cur) return;
      const { i, c } = cur;
      const N = X.count(id);
      if (c.subs) {
        Object.entries(c.subs).forEach(([k, s]) => {
          if (st.sub[k] || !atOk(s.at, S) || (s.cond && !s.cond(S, st))) return;
          out.push({ key: `${id}:s:${k}`, label: `${sg.title}：${s.title}`, sub: `${X.chName(id, i)}・${c.title}`, ev: s.start, kind: "sub", id });
        });
        const nx = sg.chapters[i + 1];
        if (nx && subsDone(st, c) >= (c.need || 1) && atOk(nx.at, S) && (!nx.cond || nx.cond(S, st)))
          out.push({ key: `${id}:n`, label: `${sg.title}：${nx.title}`, sub: `${X.chName(id, i + 1)}／全${N}章`, ev: nx.start, kind: "next", id });
        return;
      }
      if (!atOk(c.at, S) || !gapOk(c, st, S) || (c.cond && !c.cond(S, st))) return;
      out.push({ key: `${id}:c`, label: `${sg.title}：${c.title}`, sub: `${X.chName(id, i)}／全${N}章`, ev: c.start, kind: "ch", id });
    });
    return out;
  };

  // ---------------------------------------------------------------- 行動の欄
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const list = X.here(G.S);
    if (list.length) groups.push({ title: "使徒を追う", list: list.map((x) => ({ id: "e7:" + x.key, label: x.label, sub: x.sub, kw: ["使徒", "追", "日傘"] })) });
    return groups;
  };
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "e7") return act0(head, arg, a);
    const S = G.S;
    const it = X.here(S).find((x) => x.key === arg);
    if (!it) return;
    const sg = SAGAS[it.id];
    const st = X.of(it.id, S);
    if (it.kind === "open") { st.on = true; st.day = S.day; }
    if (it.kind === "next") { st.ch += 1; st.day = S.day; }
    G.log("you", it.label.replace(/^.*：/, ""));
    G.pass(1);
    G.startEvent(it.ev);
  };

  // ---------------------------------------------------------------- 結果の当てはめ
  const removeAlly = (sg, key, cause) => {
    const S = G.S;
    const a = (sg.allies || {})[key];
    if (!a) return;
    if (a.c2) {
      // 家に残した連れ合い（M10 の atHome）なら、仲間の欄に戻してから別れにする（M10 の「失ったとき」の文と、人生の物語の一行が出る）
      const m10 = S.m10;
      if (m10 && m10.atHome && m10.atHome.c2 === a.c2) { S.companions.push(m10.atHome); m10.atHome = null; }
      const c = (S.companions || []).find((x) => x && x.c2 === a.c2);
      if (c && G.m2Remove) G.m2Remove(c, "death", cause || a.cause || "");
      else G.chron(`${a.name}が死ぬ。${cause || a.cause || ""}`, "comp");
      if (G.c2State) G.c2State(S).gone[a.c2] = "dead";
    } else G.chron(`${a.name}が死ぬ。${cause || a.cause || ""}`, "comp");
  };
  const finish = (sg, st, key) => {
    const S = G.S;
    const e = (sg.ends || {})[key];
    st.end = key;
    st.endDay = S.day || 1;
    st.fight = "";
    if (!e) return;
    S.flags[`e7:${sg.id}:${key}`] = true;
    if (key !== "back") S.flags[`e7:${sg.id}`] = true;
    if (e.lose) lines(e.lose).forEach((k) => removeAlly(sg, k, e.cause));
    if (e.chron) G.chron(e.chron, "event");
    if (e.epithet) G.chron(`「${e.epithet}」と呼ばれるようになる`, "event");
    if (e.fame) { G.addFame(e.fame); G.note(`名声 ${G.sign(e.fame)}`); }
    lines(e.trophy).forEach((t) => G.award(t));
    if (e.memo) G.memo(e.memo);
    // 町にずっと残る一行（M12 の傷あとの欄を借りる）
    if (e.scar && G.m12 && G.m12.state) {
      const W = G.m12.state(S);
      lines(e.scar).forEach((s) => { const at = s.at || sg.home; if (!W.scars.some((x) => x.id === at && x.line === s.line)) W.scars.push({ id: at, line: s.line, kind: "e7" }); });
    }
    if (key !== "back") G.note(`「${sg.title}」はここで終わった。`);
  };
  X.finish = (id, key) => { const sg = SAGAS[id]; if (sg && G.S) finish(sg, X.of(id), key); };

  const apply0 = G.apply;
  G.apply = (o) => {
    if (!o || !o.e7 || !G.S) return apply0(o);
    const S = G.S;
    const x = o.e7;
    const sg = SAGAS[x.id];
    apply0(o);
    if (!sg || S.over) return;
    const st = X.of(x.id, S);
    st.on = true;
    if (x.set) Object.assign(st.f, x.set);
    if (x.sub) { st.sub[x.sub] = true; st.day = S.day; }
    if (x.prep) {
      st.prep[x.prep] = true;
      st.sub[x.prep] = true;   // 備えは、備え直す章の小さな段でもある
      const p = (sg.preps || {})[x.prep];
      if (p && p.chron) G.chron(p.chron, "event");
      st.day = S.day;
    }
    if (x.gain) lines(x.gain).forEach((k) => { st.f["ally_" + k] = "with"; });
    if (x.lose) lines(x.lose).forEach((k) => { st.f["ally_" + k] = "dead"; removeAlly(sg, k, x.cause); });
    if (x.done != null) {
      const was = st.ch;
      st.ch = Math.max(st.ch, x.done);
      st.day = S.day;
      const c = sg.chapters[x.done - 1];
      if (st.ch > was && c && c.chron) G.chron(c.chron, "event");
      const nx = sg.chapters[st.ch];
      const to = nx && !nx.subs && nx.at !== "town" ? lines(nx.at)[0] : null;
      if (nx && st.ch > was) G.note(`「${sg.title}」の次：${nx.title}${to && to !== S.loc ? `（${locName(to)}）` : ""}`);
    }
    if (x.back != null) { st.ch = x.back; st.day = S.day; st.retreats = (st.retreats || 0) + 1; }
    if (x.won) { st.won = true; st.fight = ""; }
    if (x.end && !st.end) finish(sg, st, x.end);
    if (x.close) st.closed = true;
    if (x.fight) startFight(sg, st, x.fight);
  };

  // ---------------------------------------------------------------- 戦い（E3 の使徒の戦いを、長編の強さに替える）
  let pending = null;
  function startFight(sg, st, kind) {
    const S = G.S;
    st.fight = kind;
    pending = { id: sg.id, kind };
    const F = kind === "final" ? sg.final : sg.toy;
    G.startCombat([sg.foe], { win: kind === "final" ? F.win : null });
    pending = null;
    if (!S.combat) st.fight = "";
  }
  // 決戦の強さ：正面の強さから、備え・仲間・条件で弱る
  X.mods = (id, S) => {
    S = S || G.S;
    const sg = SAGAS[id];
    const st = X.peek(id, S) || { f: {}, prep: {} };
    const F = sg.final;
    const m = { hp: F.hp, dmgMul: 1, hit: F.hit, def: F.def, agi: F.agi, open: false, why: [] };
    const take = (w) => {
      if (!w) return;
      if (w.hp) m.hp -= w.hp;
      if (w.dmg) m.dmgMul *= w.dmg;
      if (w.hit) m.hit -= w.hit;
      if (w.def) m.def -= w.def;
      if (w.agi) m.agi -= w.agi;
      if (w.open) m.open = true;
      if (w.on) m.why.push(w.on);
    };
    Object.entries(sg.preps || {}).forEach(([k, p]) => { if (st.prep[k]) take(p.weak); });
    (sg.weak || []).forEach((w) => { try { if (w.test(S, st)) take(w); } catch (e) { /* 書き損じは数えない */ } });
    // E3 の条件（裏道の鍵）も効く。zekkai の条件か、絶界を破る剣なら、刃が届く
    if (G.e3Keys) {
      const ks = G.e3Keys(sg.apostle, S);
      const met = ks.filter((k) => k.met);
      if (met.some((k) => k.zekkai)) m.open = true;
      if (met.length) { m.hp -= F.keyHp * met.length; m.hit -= 3 * met.length; }
    }
    if (G.m13 && G.m13.named && G.m13.named(S, sg.apostle) >= 2) { m.hit -= 6; m.agi -= 8; }
    if (S.weapon && D.ITEMS[S.weapon] && D.ITEMS[S.weapon].pierce) m.open = true;
    m.hp = Math.max(F.minHp || 1, Math.round(m.hp));
    m.dmgMul = Math.max(F.minDmg || 0.4, m.dmgMul);
    m.hit = Math.max(F.minHit || 40, m.hit);
    m.def = Math.max(0, m.def);
    m.agi = Math.max(0, m.agi);
    return m;
  };

  // 決戦を始めるあいだは、長編の備え（陣・顔）で絶界が破れていれば、E3 にも刃が届くと答える（「絶界だ」の一行を出さない）
  const open0 = G.e3Open;
  if (open0) G.e3Open = (id, S) => open0(id, S) || !!(pending && pending.kind === "final" && SAGAS[pending.id].apostle === id && X.mods(pending.id, S || G.S).open);

  const start0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    const p = pending;
    start0(ids, opt);
    const S = G.S;
    if (!p || !S || !S.combat) return;
    const sg = SAGAS[p.id];
    const f = S.combat.foes.find((x) => x.id === sg.foe);
    if (!f) return;
    if (p.kind === "toy") {
      f.e7 = { id: p.id, kind: "toy", open: false };
      f.max = f.hp = Math.max(1, Math.round((sg.toy.hp || 3) * D.ENEMIES[sg.foe].hp));
      lines(sg.toy.open).forEach((t) => G.say(t));
      return;
    }
    const m = X.mods(p.id, S);
    f.e7 = { id: p.id, kind: "final", open: m.open, dmg: m.dmgMul, hit: m.hit, def: m.def, agi: m.agi };
    f.max = f.hp = m.hp;
    if (f.e3) f.e3.open = m.open;
    m.why.forEach((t) => G.say(t));
    lines(sg.final.open).forEach((t) => G.say(t));
    if (!m.open) G.note(sg.final.wall);
  };

  // その戦いだけの強さ（combat.js・F1 などは G.foeData を読む）
  const scale = (d, k) => [Math.max(1, Math.round(d[0] * k)), d[1], Math.round((d[2] || 0) * k)];
  const fd0 = G.foeData;
  G.foeData = (f) => {
    const e = fd0(f);
    const m = f && f.e7;
    if (!m || !e) return e;
    const sg = SAGAS[m.id];
    const pierce = !!(G.weapon && G.weapon() && G.weapon().pierce);
    if (m.kind === "toy") return Object.assign({}, e, { majin: !pierce, dmg: sg.toy.dmg || e.dmg, hit: sg.toy.hit || e.hit, agi: sg.toy.agi || e.agi, def: sg.toy.def || e.def });
    return Object.assign({}, e, { majin: !(m.open || pierce), dmg: scale(sg.final.dmg, m.dmg), hit: m.hit, def: m.def, agi: m.agi });
  };

  // 一度目の対面：糸が、倒れることを許さない
  const toyOn = (S) => !!(S && S.combat && S.combat.foes.some((f) => f.e7 && f.e7.kind === "toy" && f.hp > 0));
  const hurt0 = G.hurt;
  G.hurt = (n, cause) => {
    const S = G.S;
    if (S && !S.over && toyOn(S) && n >= S.hp) {
      const sg = SAGAS[S.combat.foes.find((f) => f.e7).e7.id];
      n = Math.max(0, S.hp - 1);
      if (!S.combat.e7held) { S.combat.e7held = true; G.say(sg.toy.held); }
    }
    return hurt0(n, cause);
  };

  // 戦いの終わりを手番の終わりに見る
  const end0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && !S.over && S.e7) {
      Object.entries(SAGAS).forEach(([id, sg]) => {
        const st = S.e7[id];
        if (!st || st.closed) return;
        if (st.fight === "toy") {
          const C = S.combat;
          if (C && toyOn(S) && C.round > (sg.toy.rounds || 3)) { lines(sg.toy.bored).forEach((t) => G.say(t)); G._endCombat("fled"); }
          if (!S.combat) { st.fight = ""; G.startEvent(sg.toy.after); }
        } else if (st.fight === "final" && !S.combat) {
          st.fight = "";
          if (!st.won) G.startEvent(sg.final.flee);
        }
      });
    }
    const r = end0();
    // 裏道（E3 の戦い）で倒れた：E3 が倒した印を付けるのは手番の終わり（end0 の中）なので、そのあとで見る
    if (S && !S.over && S.e7) Object.entries(SAGAS).forEach(([id, sg]) => {
      const st = S.e7[id];
      if (st && st.on && !st.won && !st.end && !st.fight && apostleDown(sg, S)) {
        finish(sg, st, "back");
        if (sg.ends && sg.ends.back && sg.ends.back.say) G.say(sg.ends.back.say);
      }
    });
    return r;
  };

  // ---------------------------------------------------------------- 依頼の一覧（Q7）
  if (G.q7 && G.q7.list) {
    const list0 = G.q7.list;
    G.q7.list = (S) => {
      S = S || G.S;
      const out = list0(S);
      if (!S || !S.e7) return out;
      Object.entries(SAGAS).forEach(([id, sg]) => {
        const st = S.e7[id];
        if (!st || !st.on || st.closed) return;
        const cur = X.cur(id, S);
        if (!cur) return;
        const { i, c } = cur;
        const desc = [c.line];
        if (c.subs) {
          Object.entries(c.subs).forEach(([k, s]) => desc.push(`${st.sub[k] ? "済" : "・"} ${s.line || s.title}`));
          const nx = sg.chapters[i + 1];
          if (nx && subsDone(st, c) >= (c.need || 1)) desc.push(`次の章へ：${nx.line}`);
        } else if (c.at !== "town") desc.push(`行き先：${lines(c.at).map(locName).join("か")}`);
        out.unshift({
          key: "e7:" + id, src: "e7", kind: sg.kind || "使徒を追う", title: `${sg.title}：${c.title}`, client: sg.client || "", from: locName(st.from || sg.home),
          state: "active", stateLabel: G.q7.STATE.active, desc: desc.filter(Boolean), progress: `${X.chName(id, i)}／全${X.count(id)}章`,
          reward: "", deadline: null, report: null,
        });
      });
      return out;
    };
    const fin0 = G.q7.finished;
    G.q7.finished = (S) => {
      S = S || G.S;
      const out = fin0(S);
      if (!S || !S.e7) return out;
      Object.entries(SAGAS).forEach(([id, sg]) => {
        const st = S.e7[id];
        const e = st && st.end && (sg.ends || {})[st.end];
        if (!e) return;
        out.push({ src: "e7", title: sg.title, day: st.endDay || 0, date: G.dateOf ? G.dateOf(st.endDay || 0) : "", result: `結末：${e.name}`, failed: st.end === "back" });
      });
      return out.sort((a, b) => b.day - a.day);
    };
  }

  // ---------------------------------------------------------------- 用語説明に書き足す（分かったことだけ。行は出来事の lore で開く）
  Object.entries(E7.LORE || {}).forEach(([id, rows]) => {
    const e = D.LORE && D.LORE[id];
    if (e) rows.forEach((r) => { if (!e.lines.some((l) => l[0] === r[0])) e.lines.push(r); });
  });

  // ---------------------------------------------------------------- トロフィーと、物語の終わり方（M6）の節目・人生の物語の一行
  if (Array.isArray(D.TROPHIES)) (E7.TROPHIES || []).forEach((t) => { if (!D.TROPHIES.some((x) => x.key === t.key)) D.TROPHIES.push(t); });
  const M6 = D.M6;
  if (M6 && Array.isArray(M6.MILESTONES)) (E7.MILESTONES || []).forEach((m) => { if (!M6.MILESTONES.some((x) => x.id === m.id)) M6.MILESTONES.push(m); });
  if (M6 && Array.isArray(M6.HIGHLIGHTS)) (E7.HIGHLIGHTS || []).forEach((h) => { if (!M6.HIGHLIGHTS.some((x) => x.key === h.key)) M6.HIGHLIGHTS.push(h); });

  // ---------------------------------------------------------------- 読み合い（F1）の本気の一言
  Object.values(SAGAS).forEach((sg) => { if (sg.rage) { D.F1_RAGE = D.F1_RAGE || {}; if (!D.F1_RAGE[sg.foe]) D.F1_RAGE[sg.foe] = sg.rage; } });
})(globalThis.G = globalThis.G || {});
