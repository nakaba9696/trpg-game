// M13：正気を両刃の資源にする（文と表は src/data/m13_edge.js、正気の仕組みは src/engine/sanity_m5.js）。
// - 状態の種類 "mad1"〜"mad3"（正気の段がその段か、より深い）を C10 の仕組みに足し、段の低いときだけ現れる選択肢を出来事・施設に足す
// - 縁より深い者は、使徒・強敵との戦いで読み（F1 の ◎）が付く。縁で聞いた名（S.m13.names）は、正気を戻しても残る：1 で読み、2 で使徒が鈍る
// - 心の傷（S.m13.scar）：取り返しのつかない代償。眠っても懺悔しても、正気がその分だけもとの所まで戻らない
// - 戻すとき（段が上がったとき）：見えていたものが見えなくなる一言。戻す行動（懺悔・宿）にも添え書き
// - 縁で読んだ用語の行は、段が浅くなると言葉が欠けて見える（手引き・図鑑。読んだ記憶は残る）
// - ステータスの正気は、数ではなく段の言葉で出す
// セーブに足すもの：S.m13 = { scar, names: {使徒 id: 1|2}, relic: {品 id: 1}, gift }。古いセーブに無くても動く。
// 崩れかけの入れ替わり（sanity_m5.js）・重い出来事では入れ替わらない決まり（R4）・正気 0 の終わりは、そのまま。レーン C＋V（M13）が管理
(function (G) {
  const D = G.data;
  const M = D.M13;
  const C = G.c10;
  if (!M || !C || !G.addSanity || !G.sanityStage) return;

  // ---------------------------------------------------------------- 値
  const stage = (S) => G.sanityStage(G.sanityOf(S === undefined ? G.S : S));
  const live = (S) => { const s = stage(S); return s < 4 ? s : 0; };   // 0 で終わった者は数えない
  const st = (S) => (S.m13 = S.m13 || {});
  const scarOf = (S) => Math.min(M.SCAR_MAX, ((S && S.m13 && S.m13.scar) || 0));
  G.m13 = {
    stage: live,
    word: (S) => M.WORD[live(S)],
    scar: scarOf,
    maxSanity: (S) => 100 - scarOf(S),
    named: (S, ap) => ((S && S.m13 && S.m13.names) || {})[ap] || 0,
  };
  const X = G.m13;

  // ---------------------------------------------------------------- 状態の種類（C10）
  [1, 2, 3].forEach((n) => {
    C.STATES["mad" + n] = { tag: M.TAG[n], cond: (S) => live(S || G.S) >= n };
    C.HINT["mad" + n] = M.HINT[n];
  });
  // まだ選べない選択肢（うっすら）は、今の段の一つ深い段までしか見せない
  const reach0 = C.reachable;
  C.reachable = (key, S) => {
    const m = /^mad(\d)$/.exec(key || "");
    if (m) return live(S || G.S) >= +m[1] - 1;
    return reach0(key, S);
  };

  // ---------------------------------------------------------------- 選択肢を足す（一度だけ。あとから足された出来事にも効くように、何度呼んでもよい）
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  X.added = {};
  const push = (e, c) => { e.choices.push(c); X.added[e.id] = (X.added[e.id] || 0) + 1; };
  X.apply = () => {
    Object.values((D.E3 && D.E3.LIST) || {}).forEach((a) => { if (a.meet && !M.ADD["e3_meet_" + a.id]) M.ADD["e3_meet_" + a.id] = M.MEET(a); });
    Object.entries(M.ADD).forEach(([id, list]) => {
      const e = ev(id);
      if (!e || !Array.isArray(e.choices) || e._m13) return;
      e._m13 = true;
      list.forEach((sp) => {
        // 名はもう聞いた・弱みはもう見た使徒には出さない
        const also = sp.ap ? (S) => X.named(S, sp.ap) < sp.lv : undefined;
        push(e, C.make(also ? { ...sp, also } : sp));
      });
    });
    // 呪われた品の本当の使い方（品ごとの条件。添え書きは「縁」）
    const r = ev("m13_relic");
    if (r && !r._m13r) {
      r._m13r = true;
      M.RELIC_ADD.forEach((sp) => push(r, { label: sp.label, ok: sp.ok, c10tag: M.TAG[2], m13relic: sp.relic, cond: (S) => live(S) >= 2 && M.relicOpen(S).includes(sp.relic) }));
    }
  };
  X.apply();
  const choices0 = G.eventChoices;
  G.eventChoices = () => { X.apply(); return choices0(); };

  // 使徒の弱みの行（崩れかけで名を呼び返したとき）。鍵の言葉は使徒の表から
  if (D.LORE && D.LORE.m13_names) {
    Object.values((D.E3 && D.E3.LIST) || {}).forEach((a) => {
      const k = (a.keys || []).find((x) => x.zekkai) || (a.keys || [])[0];
      if (!k || D.LORE.m13_names.lines.some((l) => l[0] === a.id + "_w")) return;
      D.LORE.m13_names.lines.push([a.id + "_w", M.WEAK.replace("{k}", k.label)]);
      M.DEPTH[`m13_names:${a.id}_w`] = 3;
    });
  }

  // ---------------------------------------------------------------- 縁で読んだ行は、段が浅くなると言葉が欠ける（手引き・図鑑どちらも D.LORE の文を読むので、文そのものを差し替える）
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const KEEP = /[、。「」（）\s\n・ー！？]/;
  // 欠け方は文と段の差だけで決まるので、一度作ったものを覚えておく（行を読むたびに一字ずつ作り直すと重い）
  const MASKED = new Map();
  X.mask = (text, gap) => {
    if (gap <= 0) return text;
    const pct = Math.min(45, 12 * gap);
    const key = pct + "|" + text;
    let out = MASKED.get(key);
    if (out === undefined) {
      out = [...text].map((ch, i) => (!KEEP.test(ch) && hash(text + "#" + i) % 100 < pct ? "・" : ch)).join("");
      if (MASKED.size > 5000) MASKED.clear();
      MASKED.set(key, out);
    }
    return out;
  };
  X.depthOf = (id, key) => (M.DEPTH || {})[`${id}:${key}`] || 0;
  Object.entries(D.LORE || {}).forEach(([id, e]) => (e.lines || []).forEach((l) => {
    const d = X.depthOf(id, l[0]);
    if (!d) return;
    const raw = l[1];
    Object.defineProperty(l, 1, { enumerable: true, configurable: true, get: () => X.mask(raw, d - live(G.S || null)) });
    l.m13raw = raw;
  }));

  // ---------------------------------------------------------------- 結果（o.m13）
  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    const S = G.S;
    if (!o || !o.m13 || !S || S.over) return;
    effect(S, o.m13);
  };
  const aliveAps = (S) => Object.values((D.E3 && D.E3.LIST) || {}).filter((a) => !(S.flags && S.flags[a.flag]));
  function learnName(S, ap, lv) {
    const x = st(S);
    x.names = x.names || {};
    const was = x.names[ap] || 0;
    if (lv > was) x.names[ap] = lv;
    if (G.openLore) { G.openLore(`m13_names:${ap}`); if (lv >= 2) G.openLore(`m13_names:${ap}_w`); }
    if (lv > was) G.note(lv >= 2 ? M.WEAK_NOTE : M.NAME_NOTE);
  }
  function effect(S, m) {
    const x = st(S);
    if (m.name) learnName(S, m.name[0], m.name[1]);
    if (m.voiceName) {
      const list = aliveAps(S).filter((a) => !X.named(S, a.id));
      if (list.length) learnName(S, G.pick(list).id, 1);
    }
    if (m.relic) {
      x.relic = x.relic || {};
      x.relic[m.relic] = 1;
      if (G.openLore) G.openLore(`m13_relics:${m.relic}`);
      if (m.relic === "m5_namecrown") crownBack(S);
    }
    if (m.gift && !x.gift) {
      const list = M.GIFTS.filter((id) => D.ITEMS[id] && !C.item(S, id));
      if (list.length) { x.gift = 1; const id = G.pick(list); if (G.give(id, 1)) G.note(`${G.itemInfo(id).name}を手に入れた。`); }
      else find(S);
    }
    if (m.find) find(S);
    if (m.clue) clue(S);
    if (m.scar) {
      const before = scarOf(S);
      x.scar = Math.min(M.SCAR_MAX, before + m.scar);
      if (x.scar > before) {
        G.note(M.SCAR_NOTE);
        const over = G.sanityOf(S) - X.maxSanity(S);
        if (over > 0) G.addSanity(-over, true);
      }
    }
  }
  // 落とし物：たいしたものではない
  function find(S) {
    const id = G.pick(["m5_morning", "herb", "smoke"].filter((k) => D.ITEMS[k]));
    if (id && G.give(id, 1)) G.note(`${G.itemInfo(id).name}を手に入れた。`);
  }
  // 誰にも見えない客の話：まだ生きている使徒の、まだ知らない手がかりの行を一つ
  function clue(S) {
    const lore = G.loreOf ? G.loreOf(S) : {};
    const cand = [];
    aliveAps(S).forEach((a) => ((D.E3.LORE || {})[a.id] || []).forEach(([k]) => {
      if (D.LORE[a.id] && D.LORE[a.id].lines.some((l) => l[0] === k) && !(lore[a.id] || []).includes(k)) cand.push(`${a.id}:${k}`);
    }));
    if (cand.length && G.openLore) G.openLore(G.pick(cand));
  }
  // 忘れ名の冠を手放し、食べられた名を返してもらう
  function crownBack(S) {
    const id = "m5_namecrown";
    ["ring", "ring2", "head", "weapon", "armor", "off", "feet"].forEach((k) => { if (S[k] === id) S[k] = k === "weapon" ? "fists" : ""; });
    if (S.inv && S.inv[id] > 0) G.take(id);
    const t = S.m5 && S.m5.trueName;
    if (t && S.profile.name !== t) { S.profile.name = t; G.chron("忘れ名の冠を手放し、名前を取り戻す", "sanity"); }
  }

  // ---------------------------------------------------------------- 正気が戻るとき：上限（心の傷）と、見えなくなる一言
  const add0 = G.addSanity;
  G.addSanity = (n, quiet, cap) => {
    const S = G.S;
    if (!S || S.over || !n) return add0(n, quiet, cap);
    if (n > 0) {
      cap = Math.min(cap || 100, X.maxSanity(S));
      if (G.sanityOf(S) >= cap) return;
    }
    const a = stage(S);
    add0(n, n > 0 ? true : quiet, cap);
    if (G.S !== S || S.over) return;
    const b = stage(S);
    if (b < a) {
      const back = M.BACK[Math.min(a, M.BACK.length - 1)]; // 正気 0（段 4）から戻るときも、表の外を引かない（R10 低 32）
      if (back) G.say(G.pick(back));
      G.log("sys", M.BACK_SYS);
    }
  };

  // 戻す行動の添え書き（段が 1 以上のとき）
  const fac0 = G.facActions;
  G.facActions = () => {
    const g = fac0();
    const S = G.S;
    if (S && live(S) >= 1) g.forEach((grp) => (grp.list || []).forEach((a) => {
      if (a.id === "m5:confess" || a.id === "inn:rest") a.sub = a.sub ? `${a.sub}・${M.RESTORE_SUB}` : M.RESTORE_SUB;
    }));
    return g;
  };

  // ---------------------------------------------------------------- 使徒への有利
  const apOf = (foeId) => (G.e3Of ? G.e3Of(foeId) : null);
  // 読み（F1 の ◎）：縁より深い者は使徒・強敵の気配が読める。縁で聞いた名は戻しても残る。本当の使い方を知った貝殻を付けていれば、どの敵も
  X.reads = (foeId, S) => {
    S = S || G.S;
    if (!S) return false;
    const a = apOf(foeId);
    if (a && X.named(S, a.id) >= 1) return true;
    const e = D.ENEMIES[foeId] || {};
    if (live(S) >= 2 && (a || e.majin || e.boss)) return true;
    const shell = "m5_whispershell";
    return !!(S.m13 && S.m13.relic && S.m13.relic[shell] && (G.i2s ? G.i2s.wears(S, shell) : S.ring === shell));
  };
  if (G.f1 && G.f1.known) {
    const known0 = G.f1.known;
    G.f1.known = (id) => known0(id) || X.reads(id);
  }
  // 弱み（名を呼び返した使徒）：まだ満たしていない条件の 1/4 ぶん、満たしたことにする（E4 の眷属と同じ量）
  X.WEAK = 0.25;
  if (G.e3Mods && D.E3) {
    const mods0 = G.e3Mods;
    G.e3Mods = (id, S) => {
      const m = mods0(id, S);
      const a = D.E3.LIST[id];
      if (!a || X.named(S || G.S, id) < 2 || m.frac >= 1) return m;
      const frac = m.frac + (1 - m.frac) * X.WEAK;
      const W = D.E3.WEAK[a.rank];
      const mul = (v) => 1 - frac * (1 - v);
      return Object.assign({}, m, { frac, m13: true, hp: mul(W.hp), dmg: mul(W.dmg), hit: Math.round(frac * W.hit), def: Math.round(frac * W.def), agi: Math.round(frac * W.agi) });
    };
  }

  // ---------------------------------------------------------------- ステータスの行：数ではなく段の言葉で
  const rows0 = G.m5Rows;
  G.m5Rows = (S) => {
    const rows = rows0(S).map(([k, v]) => (k === "正気" ? [k, `${M.WORD[live(S)]}・${D.M5.SANITY_WORD[live(S)]}`] : [k, v]));
    const sc = scarOf(S);
    if (sc > 0) {
      const r = ["心の傷", M.SCAR_ROW[sc >= 15 ? 1 : 0]];
      const at = rows.findIndex(([k]) => k === "正気");
      rows.splice(at >= 0 ? at + 1 : rows.length, 0, r);
    }
    return rows;
  };
})(globalThis.G = globalThis.G || {});
