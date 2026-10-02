// F3：名のある人物の好感度（−100〜+100。0 が初対面のふつう）。DOM には触らない。
// 名前の頭の zzz は、companions_m2.js・zz_c2_people.js・zz_f2_codex.js・m10/m11 の恋より後に読ませて包むため。core.js などは書き換えない。
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.affState が埋める）
//   S.aff = { 人物の id: 好感度 }。今の冒険で会った人だけ入る（冒険ごとに世界はやり直すので、過去の冒険の値は持たない）
//
// 仲間の好感度（M2 の c.bond、0〜100）と二重の数にしない：
//   名のある人物が仲間でいるあいだ、c.bond は S.aff[id] を読み書きする窓になる（bond = (aff + 100) / 2）。
//   だから M2 の裏切り（bond 15 以下＝aff −70 以下）・恋（m10/m11）・会話の閾値は、今までと同じ所で起きる。
//   仲間になるとき：それまでの好感度に、その人の加わり方（C2 の join.bond、ふつうの仲間は M2 の雇い方）を足す。初対面なら今までと同じ数
//   名のある人物：D.C2_PEOPLE と D.F2_PEOPLE の id。F2 の named の人（ヨアヒムなど）は、仲間の名前が同じなら c.aff にその id を持つ
//
// 出来事の結果に書けるもの：aff: { 人物の id: 増減 }（好感度の目盛り。会っていなければ会ったことにする）
//   仲間の主役への増減は今まで通り bond（M2。0〜100 の目盛り）で書いてよい。同じ数が動く
// 通知は M2 と同じ形：「〇〇の好感度 +6（24・好意）」。仲間の好感度の表示も、この目盛りにそろえる
// レーン F＋C（F3）
(function (G) {
  const D = G.data;
  const F3 = (G.f3 = G.f3 || {});
  const MIN = -100, MAX = 100;
  const clampA = (a) => Math.max(MIN, Math.min(MAX, Math.round(a)));

  // ---------------------------------------------------------------- 人物と状態
  F3.ids = () => [...new Set([...Object.keys(D.C2_PEOPLE || {}), ...Object.keys(D.F2_PEOPLE || {})])];
  F3.has = (id) => !!((D.C2_PEOPLE || {})[id] || (D.F2_PEOPLE || {})[id]);
  F3.name = (id) => {
    const p = (D.C2_PEOPLE || {})[id], q = (D.F2_PEOPLE || {})[id] || {};
    return (p && (p.short || p.name)) || q.name || id;
  };
  G.affState = (S) => {
    S = S || G.S;
    if (!S.aff || typeof S.aff !== "object") S.aff = {};
    return S.aff;
  };

  // 換算（仲間の bond 0〜100 ⇔ 好感度 −100〜+100）
  G.affFromBond = (b) => clampA((Number(b) || 0) * 2 - 100);
  G.bondFromAff = (a) => (a + 100) / 2;

  // 言葉（マイナス側も段階を）。−70 以下は、仲間なら裏切る・去る所
  F3.WORDS = [[60, "慕っている"], [30, "信頼している"], [10, "好意"], [-19, "ふつう"], [-44, "警戒"], [-69, "嫌っている"], [MIN, "憎んでいる"]];
  G.affWord = (a) => (F3.WORDS.find(([t]) => a >= t) || F3.WORDS[F3.WORDS.length - 1])[1];

  const compOf = (id, S) => ((S || G.S).companions || []).find((c) => (c.c2 || c.aff) === id) || null;
  // 今の冒険で会ったか（古いセーブは C2 の「出会った」と今の仲間から）
  G.affKnown = (id, S) => {
    S = S || G.S;
    if (!S || !F3.has(id)) return false;
    return typeof (S.aff || {})[id] === "number" || !!(S.c2 && S.c2.met && S.c2.met[id]) || !!compOf(id, S);
  };
  // 今の冒険の好感度。会っていなければ null
  G.affOf = (id, S) => {
    S = S || G.S;
    if (!G.affKnown(id, S)) return null;
    F3.bindAll(S);
    const a = (S.aff || {})[id];
    return typeof a === "number" ? a : 0;
  };
  G.affMeet = (id, S) => {
    S = S || G.S;
    if (!S || !F3.has(id)) return;
    const A = G.affState(S);
    if (typeof A[id] !== "number") A[id] = 0;
  };
  // 増減。仲間でいれば、その仲間の bond も同じ数を見ているので一緒に動く
  G.affAdd = (id, n, quiet) => {
    const S = G.S;
    if (!S || !F3.has(id) || !n) return;
    F3.bindAll(S);
    G.affMeet(id, S);
    const A = G.affState(S);
    const a = A[id];
    A[id] = clampA(a + n);
    if (!quiet && A[id] !== a) G.note(`${F3.name(id)}の好感度 ${G.sign(A[id] - a)}（${A[id]}・${G.affWord(A[id])}）`);
  };

  // ---------------------------------------------------------------- 仲間の bond を好感度の窓にする
  F3.bind = (c, S) => {
    const id = c && (c.c2 || c.aff);
    if (!id || !F3.has(id) || !S) return c;
    const d = Object.getOwnPropertyDescriptor(c, "bond");
    if (d && d.get && d.get.f3 === S) return c;
    const A = G.affState(S);
    // 窓を作る前に書かれた数（古いセーブ・テストで直に書いた数）が新しい
    const v = d ? (d.get ? d.get() : d.value) : undefined;
    if (typeof v === "number") A[id] = G.affFromBond(v);
    else if (typeof A[id] !== "number") A[id] = 0;
    const get = () => { const a = G.affState(S)[id]; return G.bondFromAff(typeof a === "number" ? a : 0); };
    get.f3 = S;
    Object.defineProperty(c, "bond", {
      get, set: (b) => { G.affState(S)[id] = G.affFromBond(b); }, enumerable: true, configurable: true,
    });
    return c;
  };
  F3.bindAll = (S) => {
    if (!S) return;
    (S.companions || []).forEach((c) => F3.bind(c, S));
    if (S.m10 && S.m10.atHome) F3.bind(S.m10.atHome, S); // 家に残った連れ合いも同じ数
  };
  if (G.m2Comp) {
    const comp0 = G.m2Comp;
    G.m2Comp = (c, S) => { comp0(c, S); return F3.bind(c, S || G.S); };
  }
  if (G.m2State) {
    const state0 = G.m2State;
    G.m2State = (S) => { const m = state0(S); F3.bindAll(S || G.S); return m; };
  }

  // ふつうの仲間の加わり方で、F2 の named の人（同じ名前）が仲間になったとき
  // 呼び名は C3（D.C3_NAMES）で読み替わるので、今の名前・名乗る前の呼び名・前の呼び名（was）のどれでも引く
  const namesOf = (id) => {
    const q = (D.F2_PEOPLE || {})[id] || {}, t = (D.C3_NAMES || {})[id] || {};
    return [q.name, t.name, t.alias, ...(t.was || [])].filter(Boolean);
  };
  const namedByName = (name) => Object.keys(D.F2_PEOPLE || {}).find((id) => !(D.C2_PEOPLE || {})[id] && namesOf(id).includes(name)) || null;
  const add0 = G.addCompanion;
  G.addCompanion = (c) => {
    const S = G.S;
    const id = c && !c.c2 && namedByName(c.name);
    const prev = id ? G.affOf(id, S) || 0 : 0;
    if (id) { c.aff = id; G.affMeet(id, S); }
    const n = S.companions.length;
    const r = add0(c);
    if (id && S.companions.length > n) {
      const comp = S.companions[S.companions.length - 1];
      F3.bind(comp, S);
      G.affState(S)[id] = clampA(prev + G.affState(S)[id]);
    }
    return r;
  };
  // C2 の人物：それまでの好感度に、その人の始まりの好感度を足す（初対面なら今までと同じ join.bond）
  if (G.c2Join) {
    const join0 = G.c2Join;
    G.c2Join = (id) => {
      const S = G.S;
      const prev = (S && G.affOf(id, S)) || 0;
      const r = join0(id);
      if (r && S) {
        const c = compOf(id, S);
        if (c) F3.bind(c, S);
        const A = G.affState(S);
        A[id] = clampA(prev + A[id]);
      }
      return r;
    };
  }

  // ---------------------------------------------------------------- 会う（F2 が図鑑に記録する所で、今の冒険の好感度も作る）
  if (G.codexMeetPerson) {
    const meet0 = G.codexMeetPerson;
    G.codexMeetPerson = (id, quiet) => { const r = meet0(id, quiet); if (G.S) G.affMeet(id); return r; };
  }
  if (G.c2Meet) {
    const c2meet0 = G.c2Meet;
    G.c2Meet = (id) => { const r = c2meet0(id); if (G.S) G.affMeet(id); return r; };
  }

  // ---------------------------------------------------------------- 出来事の結果
  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    const S = G.S;
    if (!o || !o.aff || !S || S.over) return;
    Object.entries(o.aff).forEach(([id, n]) => G.affAdd(id, Number(n) || 0));
  };

  // ---------------------------------------------------------------- 仲間の好感度の見せ方を、この目盛りにそろえる（M2 の書き方のまま）
  G.m2Mood = (b) => G.affWord(G.affFromBond(b));
  G.m2Bond = (c, n, quiet) => {
    if (!c || !n) return;
    const a = c.bond;
    c.bond = G.clamp(Math.round(a + n), 0, 100);
    if (!quiet && c.bond !== a) {
      const x = G.affFromBond(a), y = G.affFromBond(c.bond);
      G.note(`${G.m2Short(c)}の好感度 ${G.sign(y - x)}（${y}・${G.affWord(y)}）`);
    }
  };
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S) return groups;
    groups.forEach((g) => (g.list || []).forEach((a) => {
      if (typeof a.id !== "string" || !a.id.startsWith("m2talk:")) return;
      const c = S.companions.find((x) => x.id === a.id.slice(7));
      if (c && typeof a.sub === "string") a.sub = a.sub.replace(`（${c.bond}）`, `（${G.affFromBond(c.bond)}）`); // M10 などが足した言葉は残す
    }));
    return groups;
  };
})(globalThis.G = globalThis.G || {});
