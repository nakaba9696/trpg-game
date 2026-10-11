// E3：すべての使徒を倒せるように（表は src/data/e3_apostles.js の D.E3）。
// - 条件（keys）を満たすほど使徒は弱る。zekkai の条件か、絶界を破る剣があれば、刃が届く（G.foeData を包んで、その戦いだけの強さにする）
// - 使徒との戦いでは、ふつうの「逃げる」の代わりに「背を向けて逃げる」が出る（しくじれば無防備で一手受ける）
// - 挑んで生き延びた・死んだ回数は、冒険をまたいで G.P.e3tries に残る（「何度も挑んで癖を覚える」条件）
// - 倒したら：印（a.flag）・骸の素材・格のトロフィー・縄張りの変化（M4 の襲来が止まる など）。
//   冒険をまたいで G.P.slain[敵 id] = { n, at, by, name } に残る（魔物図鑑〔F2〕は G.e3Codex で読む。使徒は倒すと性能が見える）
// - 新しい使徒の戦闘データ（D.E3.FOES）は、絵の一覧に載るまでは戦いが始まるときに D.ENEMIES へ入れる（G.e3Register）
// 古いセーブで S.e3 や G.P.slain が無くても動く。core.js・combat.js は書き換えず、関数を包む。レーン E（敵）が管理
(function (G) {
  const D = G.data;
  const E3 = D.E3;
  if (!E3) return;
  const LIST = E3.LIST;
  const byFoe = {};
  Object.values(LIST).forEach((a) => { byFoe[a.foe] = a.id; });

  // ---------------------------------------------------------------- 引く
  G.e3List = () => Object.values(LIST);
  G.e3Of = (foeId) => (byFoe[foeId] ? LIST[byFoe[foeId]] : null);
  G.e3Register = (id) => {
    const a = LIST[id] || G.e3Of(id);
    if (a && !D.ENEMIES[a.foe] && E3.FOES[a.foe]) D.ENEMIES[a.foe] = E3.FOES[a.foe];
    return a ? D.ENEMIES[a.foe] : null;
  };
  // 使徒の戦闘データ（D.ENEMIES に入れる前でも読める）
  G.e3FoeData = (id) => { const a = LIST[id] || G.e3Of(id); return a ? D.ENEMIES[a.foe] || E3.FOES[a.foe] : null; };

  const prof = () => (G.P = G.P || { trophies: {}, graves: [] });
  G.e3Tries = (id) => ((prof().e3tries || {})[id] || 0);
  const addTry = (id) => { const P = prof(); P.e3tries = P.e3tries || {}; P.e3tries[id] = (P.e3tries[id] || 0) + 1; };

  // 条件を満たしているか（S は今の冒険）
  G.e3Keys = (id, S) => {
    S = S || G.S;
    const a = LIST[id];
    if (!a || !S) return [];
    return a.keys.map((k) => { let met = false; try { met = !!k.test(S); } catch (e) { met = false; } return { id: k.id, label: k.label, zekkai: !!k.zekkai, on: k.on, met }; });
  };
  // 刃が届くか（絶界を破る剣か、zekkai の条件）
  G.e3Open = (id, S) => !!((G.S && G.weapon && G.weapon().pierce) || G.e3Keys(id, S).some((k) => k.zekkai && k.met));
  // その戦いだけの強さの倍率
  G.e3Mods = (id, S) => {
    const a = LIST[id];
    const keys = G.e3Keys(id, S);
    const frac = keys.length ? keys.filter((k) => k.met).length / keys.length : 0;
    const W = E3.WEAK[a.rank];
    const mul = (m) => 1 - frac * (1 - m);
    return { id, open: G.e3Open(id, S), frac, hp: mul(W.hp), dmg: mul(W.dmg), hit: Math.round(frac * W.hit), def: Math.round(frac * W.def), agi: Math.round(frac * W.agi) };
  };
  const scaleDmg = (d, m) => (m >= 1 ? d : [Math.max(1, Math.round(d[0] * m)), d[1], Math.round((d[2] || 0) * m)]);
  // 条件を当てはめた強さ（図鑑・テスト用。S を渡せばその冒険の条件で）
  G.e3Effective = (id, S) => {
    const a = LIST[id];
    const e = G.e3FoeData(id);
    if (!a || !e) return null;
    const m = G.e3Mods(id, S);
    return Object.assign({}, e, { majin: e.majin && !m.open, hp: Math.max(1, Math.round(e.hp * m.hp)), dmg: scaleDmg(e.dmg, m.dmg), hit: e.hit + m.hit, def: Math.max(0, e.def + m.def), agi: e.agi + m.agi });
  };

  // ---------------------------------------------------------------- 図鑑（F2）と記録
  G.e3EverSlain = (foeId) => !!((prof().slain || {})[foeId]);
  // 図鑑の一項目。倒したことがあれば性能（条件なしの強さ）と、条件の短い言葉が見える
  G.e3Codex = (foeId) => {
    const a = G.e3Of(foeId);
    if (!a) return null;
    const rec = (prof().slain || {})[foeId] || null;
    const e = G.e3FoeData(a.id);
    return {
      apostle: a.id, foe: a.foe, no: a.no, rank: a.rank, calm: a.calm, noslay: !!a.noslay, slain: rec, tries: G.e3Tries(a.id),
      stats: rec && e ? { hp: e.hp, dmg: e.dmg, hit: e.hit, def: e.def, agi: e.agi, mres: e.mres, magic: !!e.magic } : null,
      keys: rec ? a.keys.map((k) => k.label) : null,
    };
  };

  function slain(a) {
    const S = G.S;
    if (!S || (S.e3 && S.e3.done && S.e3.done.includes(a.id))) return;
    S.e3 = S.e3 || {};
    S.e3.done = [...(S.e3.done || []), a.id];
    S.flags[a.flag] = true;
    const P = prof();
    P.slain = P.slain || {};
    const old = P.slain[a.foe];
    P.slain[a.foe] = { n: (old ? old.n : 0) + 1, at: Date.now(), by: `${S.clsName || ""} ${(S.profile && S.profile.name) || ""}`.trim(), name: G.e3FoeData(a.id).name, date: G.date() };
    if (a.drop && G.give(a.drop.id)) G.note(`${a.drop.name}を手に入れた。`);
    if (a.rank === "S") G.award("e3_saigai");
    if (a.rank === "A") G.award("e3_kokunan");
    if (Object.keys(P.slain).filter((k) => G.e3Of(k) && !G.e3Of(k).noslay).length >= 5) G.award("e3_five"); // 討伐できる使徒だけ（E8）
    G.award("majin");
    worldChange(a);
    if (G.onProfile) G.onProfile();
  }

  // ---------------------------------------------------------------- 縄張りと世の動き（M4）
  // 倒した使徒の襲来は起きなくなる（灼け口・苔衣は e2_lair.js が止める）
  const STOP = { sky: "e3:azlag", dance: "e3:mirza" };
  const RAID = D.M4 && D.M4.RAIDERS;
  Object.entries(STOP).forEach(([k, flag]) => {
    const R = RAID && RAID[k];
    if (!R || typeof R.w !== "function") return;
    const w0 = R.w;
    R.w = (W, day) => (G.S && G.S.flags && G.S.flags[flag] ? 0 : w0(W, day));
  });
  function worldChange(a) {
    const S = G.S;
    const W = S.world;
    // 北の賢人がいなくなると、婿取りの盤は賢人の推さない家に転ぶ
    if (a.id === "chezar" && W && D.M4 && D.M4.HEIRS) {
      const other = D.M4.HEIRS.find((h) => !/北の賢人/.test(h));
      if (other && (!W.heir || /北の賢人/.test(W.heir))) W.heir = other;
    }
    // 町を踊らせる・空から焼く使徒を倒したら、今その様子の町は立ち直りはじめる
    const st = { mirza: "dance", azlag: "burned" }[a.id];
    if (st && W && W.towns) Object.values(W.towns).forEach((t) => { if (t.st === st && t.by === (a.id === "mirza" ? "dance" : "sky")) t.until = Math.min(t.until || S.day, S.day + 3); });
  }

  // ---------------------------------------------------------------- 用語説明に書き足す
  Object.entries(E3.LORE || {}).forEach(([id, rows]) => {
    const e = D.LORE && D.LORE[id];
    if (e) rows.forEach((r) => { if (!e.lines.some((l) => l[0] === r[0])) e.lines.push(r); });
  });

  // ---------------------------------------------------------------- 使徒を倒した印も「使徒を討つ」に数える（q4_paths.js）
  const flags0 = G.majinFlags;
  // 毎手番の節目の確認で呼ばれ、場所を全部見直して遅かったので覚えておく（場所や使徒の数が変わったら作り直す。中身は同じ）
  let flagsMemo = null;
  if (flags0) G.majinFlags = () => {
    const key = Object.keys(D.LOCS).length + ":" + Object.keys(D.ENEMIES).length + ":" + Object.keys(LIST).length;
    if (!flagsMemo || flagsMemo.key !== key) flagsMemo = { key, list: [...new Set([...flags0(), ...Object.values(LIST).map((a) => a.flag)])] };
    return flagsMemo.list.slice();
  };

  // ---------------------------------------------------------------- 居城の謁見に「弱みを突いて挑む」を足す（剣が無くても、zekkai の条件で）
  Object.values(LIST).filter((a) => a.lair).forEach((a) => {
    const ev = D.EVENTS.find((x) => x.id === a.lair);
    if (!ev || ev.choices.some((c) => c.ok && c.ok.e3fight)) return;
    ev.choices.splice(1, 0, { label: "弱みを突いて挑む", cond: () => !G.canPierce() && G.e3Open(a.id), ok: { e3fight: a.id } });
  });

  // ほかの出来事で会うときにも挑む道を足す（a.also：[{ event, label }]）
  Object.values(LIST).forEach((a) => (a.also || []).forEach((x) => {
    const ev = D.EVENTS.find((e) => e.id === x.event);
    if (ev && !ev.choices.some((c) => c.ok && c.ok.e3fight)) ev.choices.splice(Math.max(0, ev.choices.length - 1), 0, { label: x.label, ok: { e3fight: a.id } }); // 最後の選択肢の手前に
  }));

  // ---------------------------------------------------------------- 戦い
  // 出来事の結果 e3fight：その使徒との戦いを始める
  const baseApply = G.apply;
  G.apply = (o) => {
    baseApply(o);
    const S = G.S;
    if (!o || !o.e3fight || !S || S.over) return;
    const a = LIST[o.e3fight];
    if (!a) return;
    G.e3Register(a.id);
    let win = a.win;
    if (a.lair) { const L = Object.values(D.LOCS).find((x) => x.boss === a.foe); const r = L && L.reward; if (r) win = { text: r.text, flag: r.flag, fame: r.fame, trophy: r.trophy, chron: r.chron }; }
    G.startCombat([a.foe], { win });
  };

  let cur = null; // 今の使徒との戦い（セーブには入らない。読み込み直したら次の手番で拾い直す）
  const apostleIn = (C) => (C && C.foes ? C.foes.filter((f) => G.e3Of(f.id)) : []);

  const baseStart = G.startCombat;
  G.startCombat = (ids, opt) => {
    (ids || []).forEach((id) => { if (byFoe[id]) G.e3Register(id); });
    baseStart(ids, opt);
    const S = G.S;
    const C = S && S.combat;
    if (!C) return;
    const list = apostleIn(C);
    if (!list.length) return;
    list.forEach((f) => {
      const a = G.e3Of(f.id);
      const m = G.e3Mods(a.id);
      f.e3 = m;
      const ratio = f.max ? f.hp / f.max : 1;
      f.max = Math.max(1, Math.round(D.ENEMIES[f.id].hp * m.hp));
      f.hp = Math.max(1, Math.ceil(f.max * ratio));
      G.e3Keys(a.id).filter((k) => k.met).forEach((k) => G.say(k.on));
      if (m.frac < 1 && a.rank !== "B" || m.frac === 0) G.note(G.pick(E3.DREAD[a.rank]));
      if (!m.open) G.note(E3.WALL);
    });
    cur = C;
  };

  // その戦いだけの強さ（combat.js・relics_c1.js などは G.foeData を読む）
  const fd0 = G.foeData;
  G.foeData = (f) => {
    const e = fd0(f);
    const m = f && f.e3;
    if (!m || !e) return e;
    return Object.assign({}, e, { majin: e.majin && !m.open && !(G.weapon && G.weapon().pierce), dmg: scaleDmg(e.dmg, m.dmg), hit: e.hit + m.hit, def: Math.max(0, e.def + m.def), agi: e.agi + m.agi });
  };

  // 背を向けて逃げる（使徒との戦いだけ。ボス戦のふつうの「逃げる」は出ない）
  G.e3FleeChance = () => {
    const S = G.S;
    const list = G.alive().filter((f) => f.e3);
    if (!list.length) return 0;
    const agi = Math.max(...list.map((f) => G.foeData(f).agi));
    const t = Math.max(...list.map((f) => G.e3Tries(G.e3Of(f.id).id)));
    return G.chance("敏捷", 0, 20 - agi + 5 * Math.min(4, t));
  };
  const baseActions = G.combatActions;
  G.combatActions = () => {
    const groups = baseActions();
    const S = G.S;
    if (!S || !S.combat || !G.alive().some((f) => f.e3)) return groups;
    const g = groups.find((x) => x.title === "その他") || groups[groups.length - 1];
    if (g) g.list.push({ id: "cb:e3flee", label: "背を向けて逃げる", sub: `敏捷 ${G.e3FleeChance()}%・しくじれば無防備`, kw: ["逃", "退", "走", "背"] });
    return groups;
  };
  const baseAct = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    if (arg !== "e3flee" || !S || !S.combat) return baseAct(arg);
    const C = S.combat;
    const list = G.alive().filter((f) => f.e3);
    if (!list.length) return baseAct("guard");
    G.log("you", "背を向けて逃げる");
    const agi = Math.max(...list.map((f) => G.foeData(f).agi));
    const t = Math.max(...list.map((f) => G.e3Tries(G.e3Of(f.id).id)));
    const r = G.check("敏捷", 0, "使徒から逃げる", 20 - agi + 5 * Math.min(4, t));
    if (r.ok) {
      G.say("振り返らずに走った。追ってくる気配は、途中で消えた。見逃されたのか、飽きられたのかは、分からない。");
      G._endCombat("fled");
      return;
    }
    G.say("背中を見せた。それだけで、十分だった。");
    C.exposed = true;
    return baseAct("e3miss"); // 何もせずに一手受ける（仲間と敵の手番だけが進む）
  };

  // 死んだら、挑んだ回数に数える（G.P は G.finishRun の中で保存される）
  const baseDie = G.die;
  G.die = (cause) => {
    const S = G.S;
    if (S && !S.over) apostleIn(S.combat).filter((f) => f.hp > 0).forEach((f) => addTry(G.e3Of(f.id).id));
    cur = null;
    return baseDie(cause);
  };

  // 戦いの終わりを手番の終わりに見る（倒した・逃げた）
  const baseEnd = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && cur && S.combat !== cur) {
      const C = cur;
      cur = null;
      if (!S.over) apostleIn(C).forEach((f) => {
        const a = G.e3Of(f.id);
        if (f.hp <= 0) slain(a);
        else { addTry(a.id); if (G.onProfile) G.onProfile(); }
      });
    }
    if (S && !cur && S.combat && apostleIn(S.combat).length) cur = S.combat;
    return baseEnd();
  };

  // 古いセーブ（使徒との戦いの途中で保存したもの）を読み込んだら、戦闘データを入れておく
  const baseFix = G.fixOldNames;
  G.fixOldNames = (S) => {
    if (baseFix) baseFix(S);
    if (S && S.combat && S.combat.foes) S.combat.foes.forEach((f) => { if (byFoe[f.id]) G.e3Register(f.id); });
    return S;
  };
})(globalThis.G = globalThis.G || {});
