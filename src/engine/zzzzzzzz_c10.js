// C10：状態で現れる選択肢。自由入力をやめたかわりに、善悪・名声・国の評判・位・職業・仲間・持ち物によって、出来事と町の施設の選択肢が増える。
// 条件を満たさない選択肢は出さない（灰色でも見せない）。選択肢は既存の出来事の後ろに足すだけ（番号で付けた D.DEEDS などがずれない）。
// 足す選択肢：手で書いたもの D.C10_ADD（src/data/c10_choices*.js。出来事 id → 選択肢の配列）と、
// 出来事の種類（衛兵・商人・弱い者・ならず者・錠・古文字・祈りの場・貴族）に合う型 D.C10_TPL（src/data/c10_choices_tpl.js）。
// 善い行いの記録 S.virtue（古いセーブで無くても 0）。施す・助ける・祈るなどの選択で増え、罪の匂い S.sin と並べて「清い」を決める。
// 選択肢の印 c10（状態の種類）・c10tag（画面の小さな添え書き。内部の数は書かない）。レーン C＋V（C10）が管理
(function (G) {
  const D = G.data;
  const C = (G.c10 = G.c10 || {});

  // ---------------------------------------------------------------- 状態の見方（S を受け取る。古いセーブで項目が無くても動く）
  C.SIN = 8;        // これ以上で「罪の匂いが濃い」（人殺し一度、追い剥ぎ三度ほど）
  C.VIRTUE = 4;     // これ以上で、罪の匂いが薄ければ「清い」
  C.FAME = 60;      // 一人前。これ以上で「名が知られている」
  C.HERO = 300;     // 英雄。挑まれる
  C.UNKNOWN = 20;   // 駆け出し未満。目立たずに動ける
  C.TRUST = 30;     // その国の評判。衛兵が見逃す
  C.INFAMY = 10;    // その国の悪名（手配の手前）。通報される

  const st = (S) => S || G.S || {};
  C.sin = (S) => st(S).sin || 0;
  C.virtue = (S) => st(S).virtue || 0;
  C.sinful = (S) => C.sin(S) >= C.SIN;
  C.pure = (S) => C.virtue(S) >= C.VIRTUE && C.sin(S) < C.SIN / 2;
  C.famous = (S) => (st(S).fame || 0) >= C.FAME;
  C.hero = (S) => (st(S).fame || 0) >= C.HERO;
  C.unknown = (S) => (st(S).fame || 0) < C.UNKNOWN;
  C.nation = (S) => {
    const L = D.LOCS[st(S).loc];
    const n = L && (L.nation || L.region);
    return n && !(D.LAWLESS || []).includes(n) ? n : null;
  };
  const rep = (S) => { const n = C.nation(S); const r = n && st(S).repute && st(S).repute[n]; return r || { rep: 0, inf: 0, wanted: false }; };
  C.wanted = (S) => !!rep(S).wanted;
  C.trusted = (S) => !C.wanted(S) && (rep(S).rep || 0) >= C.TRUST;
  C.infamous = (S) => !C.wanted(S) && (rep(S).inf || 0) >= C.INFAMY;
  C.lawless = (S) => !C.nation(S);
  C.titled = (S) => ["騎士", "領主", "国王"].includes(st(S).title);
  C.cls = (S, id) => st(S).cls === id;
  C.item = (S, id) => { S = st(S); return !!((S.inv && S.inv[id] > 0) || (G.i2s ? G.i2s.wears(S, id) : S.weapon === id || S.armor === id || S.ring === id)); };

  // 仲間の得意。名前つきの仲間（C2 など）も、職の名と印で見分ける
  const KINDS = {
    fighter: (c) => /傭兵|剣士|槍兵|拳法|騎士|戦士|剣|侍|兵/.test(c.cls || "") && !c.heal,
    heal: (c) => !!c.heal || /僧侶|神官|修道|医/.test(c.cls || ""),
    magic: (c) => !!c.fire || /魔法|術|学者|遺跡の子/.test(c.cls || ""),
    rogue: (c) => /ならず者|盗|スリ|密偵|悪知恵|港町の若者|賊/.test((c.cls || "") + (c.desc || "")),
    trade: (c) => /商人|技師|徴税|帳面|がめつ/.test((c.cls || "") + (c.desc || "")),
    scout: (c) => /弓|狩|獣人|猟|斥候/.test(c.cls || ""),
  };
  C.KIND_NAMES = { fighter: "腕の立つ仲間", heal: "手当てのできる仲間", magic: "術の使える仲間", rogue: "手癖の悪い仲間", trade: "商売の分かる仲間", scout: "目と鼻の利く仲間" };
  C.comp = (S, kind) => ((st(S).companions || []).find((c) => c && KINDS[kind] && KINDS[kind](c)) || null);
  // 仲間の呼び名（「傭兵のハンス」→「ハンス」）
  C.compName = (S, kind) => { const c = C.comp(S, kind); return c ? String(c.name).replace(/^.*の/, "") : "仲間"; };

  // ---------------------------------------------------------------- 状態の種類（画面の添え書きと、テストの見分け）
  C.STATES = {
    sinful: { tag: "裏の顔", cond: (S) => C.sinful(S) },
    pure: { tag: "善行", cond: (S) => C.pure(S) },
    famous: { tag: "名声", cond: (S) => C.famous(S) },
    hero: { tag: "名声", cond: (S) => C.hero(S) },
    unknown: { tag: "無名", cond: (S) => C.unknown(S) },
    wanted: { tag: "手配中", cond: (S) => C.wanted(S) },
    trusted: { tag: "評判", cond: (S) => C.trusted(S) },
    infamous: { tag: "悪名", cond: (S) => C.infamous(S) },
    titled: { tag: "位", cond: (S) => C.titled(S) },
  };
  Object.keys(D.CLASSES || {}).forEach((id) => { C.STATES["cls:" + id] = { tag: D.CLASSES[id].name, cond: (S) => C.cls(S, id) }; });
  Object.keys(KINDS).forEach((k) => { C.STATES["comp:" + k] = { tag: "仲間", cond: (S) => !!C.comp(S, k) }; });
  // 持ち物は "item:<id>"。添え書きは持ち物の名前
  C.state = (key) => {
    if (C.STATES[key]) return C.STATES[key];
    const m = /^item:(.+)$/.exec(key || "");
    if (m && D.ITEMS[m[1]]) return (C.STATES[key] = { tag: D.ITEMS[m[1]].name, cond: (S) => C.item(S, m[1]) });
    return null;
  };

  // ---------------------------------------------------------------- 選択肢を組み立てる
  // spec: { on: 状態の種類（"sinful" や ["famous","titled"]（どれか）） , label, stat, diff, bonus, cost, need, ok, ng, also(S)（ほかの条件） }
  // ok / ng の text・label の "{n}" は仲間の呼び名に置き換える（comp:* のとき）
  C.make = (spec) => {
    const ons = Array.isArray(spec.on) ? spec.on : [spec.on];
    const states = ons.map(C.state);
    if (states.some((s) => !s)) throw new Error(`C10：知らない状態 ${ons.join(",")}`);
    const kind = (ons.find((o) => /^comp:/.test(o)) || "").slice(5);
    const fill = (s) => (kind && typeof s === "string" ? s.replace(/\{n\}/g, C.compName(null, kind)) : s);
    const fillO = (o) => (o && kind && o.text ? { ...o, text: fill(o.text) } : o);
    const c = {
      c10: ons[0], c10tag: states[0].tag,
      cond: (S) => states.some((s) => s.cond(S)) && (!spec.also || !!spec.also(S)) && (!spec.need || C.item(S, spec.need)),
    };
    if (spec.stat) { c.stat = spec.stat; c.diff = spec.diff || "普通"; }
    if (spec.bonus) c.bonus = spec.bonus;
    if (spec.cost) c.cost = spec.cost;
    if (spec.fight) { c.fight = spec.fight; if (spec.win) c.win = spec.win; }
    if (kind) {
      Object.defineProperty(c, "label", { get: () => fill(spec.label), enumerable: true });
      Object.defineProperty(c, "ok", { get: () => fillO(spec.ok), enumerable: true });
      Object.defineProperty(c, "ng", { get: () => fillO(spec.ng), enumerable: true });
    } else {
      c.label = spec.label;
      c.ok = spec.ok;
      if (spec.ng) c.ng = spec.ng;
    }
    return c;
  };

  // ---------------------------------------------------------------- 出来事に足す（一度だけ。あとから足された出来事にも効くように、何度呼んでもよい）
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const SKIP_ID = /^(m6_|e3_|rr|m7_|m10_|m11_|m2_|c\d+_|q\d+_|kn_|r2_|v2_gigi|w6w_mate|epi)/;
  C.added = {};   // 出来事 id → 足した数（テスト・数え上げ用）
  C.catsOf = (e) => {
    const t = `${e.title || ""}　${e.text || ""}`;
    return Object.keys(D.C10_CATS || {}).filter((k) => {
      const c = D.C10_CATS[k];
      return c instanceof RegExp ? c.test(t) : c.re.test(t) && !(c.not && c.not.test(t));
    });
  };
  C.apply = () => {
    const add = D.C10_ADD || {};
    (D.EVENTS || []).forEach((e) => {
      if (!e || !Array.isArray(e.choices)) return;
      const done = (e._c10 = e._c10 || {});
      // 手で書いた選択肢
      if (add[e.id] && !done.hand) {
        done.hand = true;
        add[e.id].forEach((spec) => { e.choices.push(C.make(spec)); C.added[e.id] = (C.added[e.id] || 0) + 1; });
      }
      // 型の選択肢（手で書いた出来事・一度きりの話・続きのある出来事・仲間との会話には足さない）
      if (done.tpl || add[e.id] || e.once || e.noC10 || SKIP_ID.test(e.id) || (D.C10_NOTPL || []).includes(e.id) || /\{[a-z]+\}/.test(e.text || "") || e.choices.some((c) => c.next)) return;
      done.tpl = true;
      const cats = C.catsOf(e);
      if (!cats.length) return;
      const slots = {};
      (D.C10_TPL || []).forEach((tp, i) => {
        if (!cats.includes(tp.cat)) return;
        const slot = tp.slot || tp.on;
        (slots[slot] = slots[slot] || []).push(tp);
      });
      // 同じ種類の状態からは一つだけ（出来事 id で選ぶので、いつも同じ選択肢になる）。一つの出来事に足すのは多くて五つ
      const picked = Object.keys(slots).sort((a, b) => hash(e.id + a) - hash(e.id + b)).slice(0, 5)
        .map((k) => { const l = slots[k]; return l[hash(e.id + "#" + k) % l.length]; });
      picked.forEach((tp) => {
        const v = (x) => (Array.isArray(x) ? x[hash(e.id + tp.label) % x.length] : x);
        e.choices.push(C.make({ ...tp, ok: v(tp.ok), ng: v(tp.ng) }));
        C.added[e.id] = (C.added[e.id] || 0) + 1;
      });
    });
  };
  C.apply();

  const choices0 = G.eventChoices;
  G.eventChoices = () => { C.apply(); return choices0(); };

  // ---------------------------------------------------------------- 善い行い
  const apply0 = G.apply;
  G.apply = (o) => {
    if (o && o.virtue && G.S && !G.S.over) G.S.virtue = Math.max(0, (G.S.virtue || 0) + o.virtue);
    return apply0(o);
  };
  // 既存の出来事の、人を助ける選択（書き換えずに善い行いを数える）。悪行（D.DEEDS）と、C10 の選択肢は数えない
  C.KIND = /助け|救|施|寄付|恵ん|恵む|手当|看病|弔|逃がす|解放|かばう|庇う|返してやる|届け|分け与|励ま|埋葬|葬|見逃してやる|許す|守る|背負って/;
  C.UNKIND = /奪|剥ぐ|盗|殺|売り飛|脅|漁る|見捨て/;
  const choose0 = G.chooseEvent;
  G.chooseEvent = (i) => {
    const S = G.S;
    const e = S && D.EVENTS.find((x) => x.id === S.event);
    const c = e && e.choices[i];
    const r = choose0(i);
    if (c && !c.c10 && G.S === S && !S.over && !(D.DEEDS || {})[e.id + ":" + i]) {
      const l = String(c.label || "");
      if (C.KIND.test(l) && !C.UNKIND.test(l)) S.virtue = (S.virtue || 0) + 1;
    }
    return r;
  };

  // ---------------------------------------------------------------- 画面の添え書き（どの状態で現れた選択肢か）と、まだ選べない選択肢
  // 条件を満たしていない選択肢も、うっすら（押せない）見せて、条件を世界の言葉で添える（持ち主の訂正）。うるさくならないように：
  //   一つの場面で 2 個まで（残りは「ほかにも道がありそうだ」の一行）・選べる選択肢の後ろ・もともと選択肢が 6 つ以上の場面では見せない。
  //   この人物にはもう届かない条件（ほかの職業・名が知られたあとの無名）と、悪い噂の条件（手配・悪名）は見せない。C.showLocked = false で見せない
  C.showLocked = true;
  C.LOCKED_MAX = 2;
  C.CROWDED = 6;
  C.HINT = {
    sinful: "手を汚した者なら", pure: "施しを重ねた者なら", famous: "名が知られていれば", hero: "英雄と呼ばれる者なら",
    unknown: "まだ名の無い者なら", trusted: "この国で慕われていれば", titled: "騎士の位があれば",
  };
  C.hint = (key) => {
    if (C.HINT[key]) return C.HINT[key];
    let m = /^cls:(.+)$/.exec(key || "");
    if (m && D.CLASSES[m[1]]) return `${D.CLASSES[m[1]].name}なら`;
    m = /^comp:(.+)$/.exec(key || "");
    if (m && C.KIND_NAMES[m[1]]) return `${C.KIND_NAMES[m[1]]}が一緒なら`;
    m = /^item:(.+)$/.exec(key || "");
    if (m && D.ITEMS[m[1]]) return `${D.ITEMS[m[1]].name}を持っていれば`;
    return "";
  };
  // この人物に見せてよい「まだ選べない」条件か
  C.reachable = (key, S) => {
    S = st(S);
    if (/^cls:/.test(key)) return false;                       // 職業は替えられない
    if (key === "unknown") return false;                       // 一度名が知られたら、無名には戻れない
    if (["wanted", "infamous"].includes(key)) return false;    // 悪い噂を目指させない
    if (key === "trusted" && !C.nation(S)) return false;
    return !!C.hint(key);
  };
  C.lockedFor = (e, S) => {
    S = st(S);
    if (!e || !C.showLocked) return [];
    const out = [];
    const seenLabel = new Set();
    e.choices.forEach((c, i) => {
      if (!c.c10 || c.hide || !C.reachable(c.c10, S)) return;
      if (c.cond && c.cond(S)) return;
      const label = String(c.label).replace(/\{n\}/g, "仲間");   // 仲間がいないときは「仲間」と書く
      if (seenLabel.has(label)) return;
      seenLabel.add(label);
      out.push({ i, c, label });
    });
    return out;
  };
  const actions0 = G.actions;
  G.actions = () => {
    const g = actions0();
    const S = G.S;
    if (!S || S.mode !== "event") return g;
    const e = D.EVENTS.find((x) => x.id === S.event);
    if (!e) return g;
    let grp0 = null;
    g.forEach((grp) => (grp.list || []).forEach((a) => {
      const m = /^ev:(\d+)$/.exec(a.id || "");
      const c = m && e.choices[+m[1]];
      if (m && !grp0) grp0 = grp;
      if (c && c.c10tag && !a.c10) { a.c10 = c.c10; a.sub = a.sub ? `${c.c10tag}・${a.sub}` : c.c10tag; }
    }));
    if (grp0) {
      const shown = g.reduce((n, grp) => n + (grp.list || []).length, 0);
      const locked = shown < C.CROWDED ? C.lockedFor(e, S) : [];
      locked.slice(0, C.LOCKED_MAX).forEach(({ i, c, label }) => grp0.list.push({ id: "c10lock:" + i, label, sub: C.hint(c.c10), disabled: true, locked: true, c10: c.c10 }));
      if (locked.length > C.LOCKED_MAX) grp0.list.push({ id: "c10more", label: "ほかにも道がありそうだ", sub: "", disabled: true, locked: true });
    }
    return g;
  };

  // 仲間の選択肢の "{n}" を、今いる仲間の呼び名に
  C.fillN = (s, on) => (typeof s === "string" && /^comp:/.test(on || "") ? s.replace(/\{n\}/g, C.compName(null, on.slice(5))) : s);

  // ---------------------------------------------------------------- 町の施設（D.C10_FAC：施設 → 選択肢。一つの施設で一日に一度）
  C.facList = (S) => {
    S = st(S);
    const list = (D.C10_FAC || {})[S.fac] || [];
    return list.map((f, i) => ({ f, i })).filter(({ f }) => {
      const s = C.state(f.on);
      return s && s.cond(S) && (!f.also || f.also(S)) && (!f.need || C.item(S, f.need));
    });
  };
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    const list = C.facList(S);
    if (!list.length) return g;
    const used = S.c10 && S.c10.day === S.day ? S.c10.used || {} : {};
    const items = list.map(({ f, i }) => {
      const sub = [C.state(f.on).tag];
      if (f.stat) sub.push(`${f.stat} ${G.chance(f.stat, f.diff || "普通", f.bonus ? G.gearBonus(f.bonus) : 0)}%`);
      if (f.cost) sub.push(`${f.cost}G`);
      if (used[S.fac]) sub.push("今日はもうした");
      return { id: `c10f:${S.fac}:${i}`, label: C.fillN(f.label, f.on), sub: sub.join("・"), c10: f.on, disabled: !!used[S.fac] || !!(f.cost && S.gold < f.cost) };
    });
    const at = Math.max(0, g.length - 1);   // 「出る」の前に置く
    g.splice(at, 0, { title: "あなたなら", list: items });
    return g;
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    if (head !== "c10f") return facAct0(head, arg, a);
    const S = G.S;
    const [fac, n] = String(arg).split(":");
    const f = ((D.C10_FAC || {})[fac] || [])[+n];
    if (!f || fac !== S.fac) return;
    if (!C.facList(S).some((x) => x.f === f)) return;
    if (S.c10 && S.c10.day === S.day && (S.c10.used || {})[fac]) return;
    if (f.cost) { if (S.gold < f.cost) return; S.gold -= f.cost; G.note(`所持金 -${f.cost}G`); }
    if (!S.c10 || S.c10.day !== S.day) S.c10 = { day: S.day, used: {} };
    S.c10.used[fac] = 1;
    G.log("you", C.fillN(f.label, f.on));
    let o = f.ok;
    if (f.stat) o = G.check(f.stat, f.diff || "普通", f.label, f.bonus ? G.gearBonus(f.bonus) : 0).ok ? f.ok : f.ng;
    if (typeof o === "function") o = o(S);
    if (o && o.text) o = { ...o, text: C.fillN(o.text, f.on) };
    G.apply(o);
    if (!S.over && f.pass !== 0) G.pass(1);
  };
})(globalThis.G = globalThis.G || {});
