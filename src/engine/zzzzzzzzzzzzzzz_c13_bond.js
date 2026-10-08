// C13：好感度の節目の褒美（持ち主「キャラの好感度を上げると、アイテムとかスキル伝授とかのイベントが発生するような褒美がほしい」）。
// 表は src/data/c13_bond_*.js（D.C13_BOND）。仲間にできる名のある人（D.C2_PEOPLE の join）に、好感度の節目ごとの褒美を一つずつ。
//
// 節目（tier）：{ at 好感度（F3 の −100〜+100）, kind, title, text 場面, choices [{ label, text, ...結果に足すもの }] }
//   gift  … item：その人だけの品（店には並ばない）を受け取る
//   skill … skill：その人の戦技・スキル（K1）を教わる。能力値の目安に届かない・前に教わったことが体に入りきっていない（K3）間は待つ。
//           もう覚えていれば alt（{ text, item か gold }）
//   spell … spell：術を教わる。術の才が無ければ教われない（alt を受け取る）。才は G.c13.gift（M14 の決まりがあればそちら）
//   quest … ask（頼まれる場面の { text, choices }）のあと、loc の場所で text・choices（判定つき）。果たすと reward（{ item, skill, alt, gold, fame }）。
//           しくじっても、数日おいてまた挑める
//   favor … 小さな褒美（gold・heal・item の消耗品・memo）を結果にそのまま書く
// 起き方：好感度が節目に届いた仲間が一行にいると、行動の欄に「〇〇が呼んでいる」が出る（選ぶまで待つ。古いセーブでも、次に見たときに出る）。
//   同じ人の褒美は一度きり。前の褒美から GAP 日はあける。死んだ・去った人（一行にいない人）には起きない。
// 起きた褒美は、年表（G.chron）・図鑑の人物の欄（G.codex().people[id].c13）・画面の一行（「〇〇から△△を受け取った」「〇〇から『××』を教わった」）に残る。
// 好感度の上がり方は Q8 のまま（雑談は一日の上限と「信頼している」の入り口まで）。褒美は好感度を動かさないので、稼ぎにならない。
// セーブに足すもの：S.c13 = { done { 人: [節目の番号] }, ask { 人: 番号 }, last { 人: 日 }, wait { "人:番号": 日 } }。古いセーブで無くても動く。
// 乱数は使わない。DOM には触らない。名前の頭の z の数は、K1・Q7・Q8・E7b・F3 の包みより後に読ませるため。レーン C＋V（C13）
(function (G) {
  const D = G.data;
  const X = (G.c13 = G.c13 || {});
  const T = () => D.C13_BOND || {};
  const P = () => D.C2_PEOPLE || {};
  X.GAP = 2;      // 同じ人の褒美のあいだに空ける日数
  X.RETRY = 3;    // 依頼にしくじってから、また挑めるまでの日数
  X.TIERS = [30, 55, 80]; // おすすめの節目（表の at はこれに合わせる）

  // ---------------------------------------------------------------- 状態
  X.state = (S) => {
    S = S || G.S;
    if (!S.c13 || typeof S.c13 !== "object") S.c13 = {};
    const s = S.c13;
    s.done = s.done || {}; s.ask = s.ask || {}; s.last = s.last || {}; s.wait = s.wait || {};
    return s;
  };
  X.done = (id, i, S) => (X.state(S).done[id] || []).includes(i);
  const markDone = (id, i, S) => {
    const s = X.state(S);
    const d = (s.done[id] = s.done[id] || []);
    if (!d.includes(i)) d.push(i);
    if (s.ask[id] === i) delete s.ask[id];
    s.last[id] = S.day;
  };
  const comp = (id, S) => ((S || G.S).companions || []).find((c) => c.c2 === id) || null;
  const nameOf = (id, S) => { const c = comp(id, S); const p = P()[id] || {}; return (c && G.m2Short ? G.m2Short(c) : "") || p.short || p.name || id; };
  const aff = (id, S) => (G.affOf ? G.affOf(id, S) : null);
  const itemName = (it) => (G.itemInfo && G.itemInfo(it) ? G.itemInfo(it).name : (D.ITEMS[it] || {}).name || it);
  const K = () => G.k1 || null;
  const SK = () => D.SKILLS || {};
  const locName = (l) => (D.LOCS[l] ? D.LOCS[l].name : l);
  const locs = (v) => (v ? (Array.isArray(v) ? v : [v]) : []);

  // ---------------------------------------------------------------- 術の才（M14 の決まりがあればそちら）
  // 無いあいだは：職業の向き不向き（S7）で魔力が苦手なら、魔力がよほど高くないかぎり才は無い
  X.GIFT_MIN = 18;
  X.gift = (S, spell) => {
    S = S || G.S;
    if (!S) return false;
    if (G.m14Talent) return !!G.m14Talent(S, spell);
    if (G.m14CanLearn) return !!G.m14CanLearn(spell, S);
    const apt = G.s5Apt ? G.s5Apt("魔力", S) : 0;
    return apt >= 0 || ((S.stats || {}).魔力 || 0) >= X.GIFT_MIN;
  };
  const knowsSpell = (sp, S) => ((S || G.S).spells || []).includes(sp) || (G.knows && S === G.S && G.knows(sp));
  X.canSpell = (sp, S) => { S = S || G.S; return !!(D.SPELLS[sp] && !knowsSpell(sp, S) && X.gift(S, sp)); };
  const knowsSkill = (sk, S) => !!(K() && K().knows(sk, S));
  X.canSkill = (sk, S) => { S = S || G.S; return !!(K() && SK()[sk] && !knowsSkill(sk, S) && !K().needMiss(sk, S).length); };

  // ---------------------------------------------------------------- 節目が来ているか
  // 返す：{ i, t, why }。why が "" なら今起きる。届いていない・済んだ節目は返さない
  X.tierWhy = (id, i, S) => {
    S = S || G.S;
    const t = (T()[id] || [])[i];
    if (!t) return null;
    if (t.kind === "skill" && !knowsSkill(t.skill, S) && K()) {
      const miss = K().needMiss(t.skill, S);
      if (miss.length) return `${miss.join("と")}が、まだ足りない`;
      if (K().lessonWait(S)) return K().LESSON_WAIT;
    }
    if (t.kind === "quest" && X.state(S).ask[id] === i) {
      const w = X.state(S).wait[id + ":" + i];
      if (w != null && S.day < w) return "仕切り直すには、まだ早い";
      if (!locs(t.loc).includes(S.loc)) return `${locs(t.loc).map(locName).join("か")}で`;
    }
    return "";
  };
  X.next = (id, S) => {
    S = S || G.S;
    const c = comp(id, S);
    if (!c || (G.c2Gone && G.c2Gone(id, S))) return null;
    const a = aff(id, S);
    if (a == null) return null;
    const list = T()[id] || [];
    const s = X.state(S);
    if (s.last[id] != null && S.day - s.last[id] < X.GAP && s.ask[id] == null) return null;
    let first = null;
    for (let i = 0; i < list.length; i++) {
      if (X.done(id, i, S) || (a < list[i].at && s.ask[id] !== i)) continue; // 頼まれた依頼は、そのあと好感度が少し下がっても残る
      const why = X.tierWhy(id, i, S);
      if (why === "") return { i, t: list[i], why };
      if (!first) first = { i, t: list[i], why };
    }
    return first;
  };

  // ---------------------------------------------------------------- 出来事を組み立てる（表から D.EVENTS へ）
  const evId = (id, i, go) => `c13_${id}_${i + 1}${go ? "_go" : ""}`;
  X.evId = evId;
  const pick = (id) => (c) => c.c2 === id;
  const tag = (id, i, k, extra) => Object.assign({ c13: Object.assign({ id, i, k }, extra || {}) });
  const out = (ch, base) => {
    const o = Object.assign({}, ch);
    delete o.label; delete o.cond;
    return Object.assign(o, base);
  };
  function build(id, i, t) {
    const head = { c2: id, w: 0, where: [], m2: { pick: pick(id) }, c13: true };
    const ev = [];
    const mk = (go, title, text, choices) => {
      const e = Object.assign({ id: evId(id, i, go), title, text, choices }, head);
      // 絵はその人の顔（仲間の顔があればそれ。無ければ表の顔）
      Object.defineProperty(e, "who", { get: () => {
        const c = G.S && comp(id, G.S);
        if (c && G.companionWho) return Object.assign({}, G.companionWho(c), { name: c.name });
        const p = P()[id];
        return p && p.who ? Object.assign({}, p.who, { name: p.name }) : null;
      }, enumerable: true });
      ev.push(e);
    };
    const plain = (k) => (t.choices || []).map((ch) => ({ label: ch.label, ok: out(ch, tag(id, i, k)) }));
    switch (t.kind) {
      case "gift": case "favor": mk(false, t.title, t.text, plain(t.kind)); break;
      case "skill": case "spell": {
        const can = t.kind === "skill" ? (S) => X.canSkill(t.skill, S) : (S) => X.canSpell(t.spell, S);
        const choices = (t.choices || []).map((ch) => ({ label: ch.label, cond: can, ok: out(ch, tag(id, i, t.kind)) }));
        const alt = t.alt || {};
        choices.push({ label: alt.label || "黙って受け取る", cond: (S) => !can(S), ok: Object.assign({ text: alt.text }, tag(id, i, "alt")) });
        mk(false, t.title, t.text, choices);
        break;
      }
      case "quest": {
        const a = t.ask || {};
        mk(false, a.title || t.title, a.text, (a.choices || []).map((ch) => ({ label: ch.label, ok: out(ch, tag(id, i, "ask")) })));
        mk(true, t.title, t.text, (t.choices || []).map((ch) => {
          const c = Object.assign({}, ch);
          if (c.ok) c.ok = Object.assign({}, c.ok, tag(id, i, "quest"));
          if (c.ng) c.ng = Object.assign({}, c.ng, tag(id, i, "miss"));
          if (!c.stat && !c.ok) c.ok = tag(id, i, "quest");
          return c;
        }));
        break;
      }
    }
    return ev;
  }
  X.build = () => {
    const have = new Set((D.EVENTS || []).map((e) => e.id));
    Object.entries(T()).forEach(([id, list]) => (list || []).forEach((t, i) => build(id, i, t).forEach((e) => { if (!have.has(e.id)) { D.EVENTS.push(e); have.add(e.id); } })));
  };
  X.build();
  // 図鑑の入手場所（コードで渡す品なので、F2 の表に書き足す）：「〇〇の好感度の褒美」
  X.where = () => {
    const W = (D.F2_ITEM_WHERE = D.F2_ITEM_WHERE || {});
    const add = (it, id) => {
      if (!it || !D.ITEMS[it] || !D.ITEMS[it].c13) return;
      const t = `${(P()[id] || {}).name || id}の好感度の褒美`;
      const a = (W[it] = [].concat(W[it] || []));
      if (!a.includes(t)) a.push(t);
    };
    Object.entries(T()).forEach(([id, list]) => (list || []).forEach((t) => {
      add(t.item, id);
      if (t.alt) add(t.alt.item, id);
      if (t.reward) { add(t.reward.item, id); if (t.reward.alt) add(t.reward.alt.item, id); }
      (t.choices || []).forEach((ch) => { if (ch.item && typeof ch.item === "object") Object.keys(ch.item).forEach((k) => add(k, id)); });
    }));
  };
  X.where();

  // ---------------------------------------------------------------- 褒美を渡す
  const record = (id, line, S) => {
    G.chron(line, "comp");
    if (G.codex && (D.F2_PEOPLE || {})[id]) {
      try {
        if (G.codexMeetPerson) G.codexMeetPerson(id, true);
        const r = G.codex().people[id];
        if (r) { r.c13 = r.c13 || []; if (!r.c13.includes(line)) r.c13.push(line); if (G.onCodexChange) G.onCodexChange(); }
      } catch { /* 図鑑が無くても褒美は渡す */ }
    }
  };
  const giveItem = (id, it, S) => {
    if (!it || !G.give(it, 1)) return "";
    const n = nameOf(id, S);
    G.log("grow", `${n}から${itemName(it)}を受け取った。`, { c13: id });
    return `${n}から${itemName(it)}を受け取る`;
  };
  const teachSkill = (id, sk, S) => {
    if (!K() || !X.canSkill(sk, S)) return "";
    K().learn(sk, "bond");
    if (K().lessonDone) K().lessonDone();
    const n = nameOf(id, S);
    G.log("grow", `${n}から「${SK()[sk].name}」を教わった。`, { c13: id });
    return `${n}から${K().label(sk)}「${SK()[sk].name}」を教わる`;
  };
  const teachSpell = (id, sp, S) => {
    if (!X.canSpell(sp, S) || !G.learnSpell(sp)) return "";
    const n = nameOf(id, S);
    G.log("grow", `${n}から「${D.SPELLS[sp].name}」を教わった。`, { c13: id });
    return `${n}から「${D.SPELLS[sp].name}」を教わる`;
  };
  const giveAlt = (id, alt, S) => {
    alt = alt || {};
    if (alt.item) return giveItem(id, alt.item, S);
    if (alt.skill) { const r = teachSkill(id, alt.skill, S); if (r) return r; }
    return "";
  };
  X.grant = (o) => {
    const S = G.S;
    const k = o.c13;
    const t = (T()[k.id] || [])[k.i];
    if (!t || X.done(k.id, k.i, S)) return;
    const n = nameOf(k.id, S);
    let line = "";
    switch (k.k) {
      case "gift": line = giveItem(k.id, t.item, S); break;
      case "skill": line = teachSkill(k.id, t.skill, S) || giveAlt(k.id, t.alt, S); break;
      case "spell": line = teachSpell(k.id, t.spell, S) || giveAlt(k.id, t.alt, S); break;
      case "alt": line = giveAlt(k.id, t.alt, S); break;
      case "favor": line = t.line || `${n}の厚意を受ける`; break;
      case "ask": {
        const s = X.state(S);
        s.ask[k.id] = k.i; s.last[k.id] = S.day;
        delete s.wait[k.id + ":" + k.i];
        G.note(`（${n}の頼み「${t.title}」：${locs(t.loc).map(locName).join("か")}で）`);
        return;
      }
      case "miss": X.state(S).wait[k.id + ":" + k.i] = S.day + X.RETRY; return;
      case "quest": {
        const r = t.reward || {};
        const got = [];
        if (r.skill) { const s = teachSkill(k.id, r.skill, S); if (s) got.push(s); else if (r.alt) { const a = giveAlt(k.id, r.alt, S); if (a) got.push(a); } }
        if (r.item) { const s = giveItem(k.id, r.item, S); if (s) got.push(s); }
        if (r.gold) { S.gold += r.gold; G.note(`所持金 +${r.gold}G`); }
        if (r.fame && G.addFame) { G.addFame(r.fame); G.note(`名声 ${G.sign(r.fame)}`); }
        record(k.id, `${n}の頼み「${t.title}」を果たす`, S);
        got.forEach((g) => record(k.id, g, S));
        break;
      }
    }
    markDone(k.id, k.i, S);
    if (line) record(k.id, line, S);
  };
  // 冒険をまたいだ図鑑を一つにまとめるとき（G.codexMerge）、受け取ったものの行は両方から残す
  if (G.codexMerge) {
    const merge0 = G.codexMerge;
    G.codexMerge = (a, b) => {
      const r = merge0(a, b);
      Object.keys((r && r.people) || {}).forEach((id) => {
        const all = [];
        [a, b].forEach((c) => (((c && c.people && c.people[id]) || {}).c13 || []).forEach((t) => { if (!all.includes(t)) all.push(t); }));
        if (all.length) r.people[id].c13 = all;
      });
      return r;
    };
  }
  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    if (!o || !o.c13 || !G.S || G.S.over) return;
    X.grant(o);
  };

  // ---------------------------------------------------------------- 行動の欄「〇〇が呼んでいる」
  const label = (id, x) => {
    const n = nameOf(id);
    if (x.t.kind === "quest" && X.state(G.S).ask[id] === x.i) return { label: `${n}の頼み：${x.t.title}`, kw: ["頼み", n] };
    return { label: `${n}が呼んでいる`, kw: ["呼", n] };
  };
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S || S.travel || S.combat || S.mode !== "explore") return groups;
    const list = [];
    (S.companions || []).forEach((c) => {
      if (!c.c2 || !T()[c.c2]) return;
      const x = X.next(c.c2, S);
      if (!x) return;
      const l = label(c.c2, x);
      const go = x.t.kind === "quest" && X.state(S).ask[c.c2] === x.i;
      list.push({ id: `c13:${c.c2}:${x.i}`, label: l.label, sub: x.why || (go ? "頼みを果たす" : x.t.title), disabled: !!x.why, kw: l.kw });
    });
    if (list.length) groups.push({ title: "絆", list });
    return groups;
  };
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "c13") return act0(head, arg, a);
    const S = G.S;
    const [id, si] = String(arg).split(":");
    const x = X.next(id, S);
    if (!x || String(x.i) !== si || x.why) return;
    const go = x.t.kind === "quest" && X.state(S).ask[id] === x.i;
    const c = comp(id, S);
    G.m2State(S).force = c.id;
    G.startEvent(evId(id, x.i, go));
  };

  // ---------------------------------------------------------------- 依頼の一覧（Q7）に、頼まれている褒美の依頼を
  if (G.q7 && G.q7.mateEntries) {
    const mate0 = G.q7.mateEntries;
    G.q7.mateEntries = (S) => {
      S = S || G.S;
      const list = mate0(S);
      const s = (S && S.c13) || {};
      Object.entries(s.ask || {}).forEach(([id, i]) => {
        const t = (T()[id] || [])[i];
        if (!t || X.done(id, i, S)) return;
        const inParty = !!comp(id, S);
        const who = nameOf(id, S);
        list.push({
          key: "c13:" + id, src: "mate", kind: "仲間の頼みごと", title: t.title, client: who, from: "",
          state: "active", stateLabel: (G.q7.STATE || {}).active || "進行中",
          desc: [t.line || `${locs(t.loc).map(locName).join("か")}へ、${who}と行く。`].concat(inParty ? [] : [`${who}は今、一行にいない。連れて行かないと先へ進まない。`]),
          progress: "", reward: "", deadline: null, report: null,
        });
      });
      return list;
    };
  }
})(globalThis.G = globalThis.G || {});
