// 仲間の個性（M2）：性格・好感度・会話・裏切り・死別。DOM には触らない。
// 今ある関数（仲間を加える・出来事・結果の当てはめ・記録・手番の終わり・探索の行動）を包んで足す。core.js は書き換えない
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.m2State・G.m2Comp が足りない所を埋める）
//   S.m2 = { seq 仲間の通し番号, focus / focus2 出来事の主役の仲間 id, say / say2 その出来事で話すひとこと,
//            doom { id, cause } 深手を負って看取りを待つ仲間, fight 始まった戦闘の覚え, day 好感度の日ごとの動きを見た日,
//            counts { talk, betray, leave, death }, gone [{ id, name, cls, how, date, loc, cause, bond, days, keep }] }
//     how: betray 裏切って去った / leave 去った / death 死んだ / slain 裏切って刃を向け、あなたが討った
//   仲間ひとりずつ（S.companions[i]）：id, trait（D.M2_TRAITS の鍵）, bond 好感度 0〜100, joined 加わった日,
//     talkDay 最後に話した日, wounds 深手の数, confided 打ち明け話を聞いた,
//     life { home 故郷, kin 家族, food 好物, habit 癖, secret 言えない過去, keep 持ち物 }（名前から決まる）
//
// 出来事のデータ（src/data/events_m2.js）に書けるもの
//   m2: { pick(c, S) 主役にできる仲間, pick2(c, S) 二人目, say(c, S) ひとことの候補（配列）, say2, talk 「仲間と話す」で選ばれる,
//         parting 好感度が尽きたときの別れ, farewell 看取り, keep 前の出来事の主役のまま続ける }
//   文の中の {c} 主役の名前・{n} 短い名前・{m} 二人目の短い名前・{say} {say2} ひとこと・{dead} 最後に死んだ仲間の名前・{deadkeep} その形見
//   {home} {kin} {food} {habit} {secret} {keep} 主役の暮らし（D.M2_LIFE）・{mhome} {mkin} 二人目の故郷と家族
//   結果に書けるもの：bond（数か { 性格: 数, _: 既定 }）, bond2（二人目）, m2（"betray" "rob" "leave" "doom" "die" "slain" "wound" "saved" "confide" "stay"）
// レーン C（コア）＋ V（出来事）の M2 が管理
(function (G) {
  const D = G.data;
  const BETRAY_AT = 15; // これ以下の好感度で裏切る・去る

  // ---------------------------------------------------------------- 状態
  G.m2State = (S) => {
    S = S || G.S;
    if (!S.m2) S.m2 = {};
    const m = S.m2;
    m.seq = m.seq || 0;
    m.counts = Object.assign({ talk: 0, betray: 0, leave: 0, death: 0 }, m.counts || {});
    m.gone = m.gone || [];
    (S.companions || []).forEach((c) => G.m2Comp(c, S));
    return m;
  };
  // 文字列から決まった数（古いセーブの仲間の性格を、乱数を使わずに決める）
  const hash = (s) => { let h = 0; for (const ch of String(s)) h = (Math.imul(31, h) + ch.codePointAt(0)) | 0; return Math.abs(h); };
  G.m2TraitOf = (c) => {
    const keys = Object.keys(D.M2_TRAITS);
    const txt = `${c.desc || ""} ${c.name || ""}`;
    return keys.find((k) => D.M2_TRAITS[k].re.test(txt)) || keys[hash(c.name) % keys.length];
  };
  G.m2Comp = (c, S) => {
    S = S || G.S;
    if (!c.id) { const m = S.m2 || (S.m2 = {}); m.seq = (m.seq || 0) + 1; c.id = "m2c" + m.seq; }
    if (!c.trait || !D.M2_TRAITS[c.trait]) c.trait = G.m2TraitOf(c);
    if (typeof c.bond !== "number") c.bond = 50;
    if (!c.joined) c.joined = S.day;
    if (!c.life) {
      // 暮らし（故郷・家族・好物・癖・言えない過去・持ち物）。名前と id から決まり、乱数を使わない
      const L = D.M2_LIFE, h = hash(c.name + ":" + c.id);
      c.life = {};
      Object.keys(L).forEach((k, i) => { c.life[k] = L[k][Math.floor(h / (i * 7 + 1)) % L[k].length]; });
    }
    return c;
  };
  G.m2Trait = (c) => D.M2_TRAITS[c.trait] || D.M2_TRAITS[G.m2TraitOf(c)];
  G.m2Short = (c) => { const n = String((c && c.name) || ""); const i = n.lastIndexOf("の"); return i >= 0 && i < n.length - 1 ? n.slice(i + 1) : n; };
  G.m2Mood = (b) => (b >= 80 ? "心を許している" : b >= 55 ? "打ち解けている" : b >= 35 ? "様子を見ている" : b > BETRAY_AT ? "不満げ" : "危うい");
  const find = (id) => {
    const S = G.S;
    if (!id || !S) return null;
    return S.companions.find((c) => c.id === id) || (S.m2 && S.m2.lastGone && S.m2.lastGone.id === id ? S.m2.lastGone : null);
  };
  G.m2Focus = () => (G.S && G.S.m2 ? find(G.S.m2.focus) : null);
  G.m2Focus2 = () => (G.S && G.S.m2 ? find(G.S.m2.focus2) : null);

  // 出来事の絵：主役の仲間の顔（events_m2.js の who から呼ぶ。絵の関数が無い所では出さない）
  G.m2Who = () => {
    const c = G.m2Focus();
    if (!c || !G.companionWho) return null;
    return Object.assign({}, G.companionWho(c), { name: c.name });
  };

  // ---------------------------------------------------------------- 好感度
  G.m2Bond = (c, n, quiet) => {
    if (!c || !n) return;
    const a = c.bond;
    c.bond = G.clamp(Math.round(a + n), 0, 100);
    if (!quiet && c.bond !== a) G.note(`${G.m2Short(c)}の好感度 ${G.sign(c.bond - a)}（${c.bond}・${G.m2Mood(c.bond)}）`);
  };
  const bondOf = (v, c) => (typeof v === "number" ? v : v && c ? (v[c.trait] !== undefined ? v[c.trait] : v._ || 0) : 0);

  // ---------------------------------------------------------------- 別れ（裏切り・去る・死ぬ）
  G.m2Remove = (c, how, cause) => {
    const S = G.S;
    const m = G.m2State(S);
    const i = S.companions.indexOf(c);
    if (i < 0) return false;
    S.companions.splice(i, 1);
    const rec = { id: c.id, name: c.name, cls: c.cls, how, date: G.date(), loc: G.loc().name, cause: cause || "", bond: c.bond, days: S.day - (c.joined || S.day), keep: c.life && c.life.keep };
    m.gone.push(rec);
    if (m.gone.length > 30) m.gone.shift();
    m.lastGone = Object.assign({}, c);
    if (how === "death") {
      m.counts.death++;
      G.chron(`${c.name}が死ぬ。${cause || "旅の途中で"}`, "comp");
    } else if (how === "betray") {
      m.counts.betray++;
      G.chron(`${c.name}に裏切られる`, "comp");
    } else {
      m.counts.leave++;
      G.chron(`${c.name}が一党を去る`, "comp");
    }
    return true;
  };
  // 深手を負わせる。看取りの出来事は手番の終わりに始まる
  G.m2Doom = (c, cause) => {
    if (!c) return;
    const m = G.m2State();
    if (!m.doom) m.doom = { id: c.id, cause: cause || "深手を負った" };
  };

  // ---------------------------------------------------------------- 文の差し込み
  G.m2Fill = (t) => {
    if (typeof t !== "string" || t.indexOf("{") < 0 || !G.S || !G.S.m2) return t;
    const m = G.S.m2;
    const c = G.m2Focus(), d = G.m2Focus2();
    const dead = [...(m.gone || [])].reverse().find((g) => g.how === "death" || g.how === "slain");
    const life = (x, k) => (x && x.life && x.life[k]) || { home: "故郷", kin: "家族", food: "好物", keep: "形見", habit: "", secret: "……" }[k];
    const fill = (s) => s.replace(/\{(c|n|m|say|say2|dead|deadkeep|home|kin|food|keep|habit|secret|mhome|mkin)\}/g, (all, k) => {
      if (k === "c") return c ? c.name : "仲間";
      if (["home", "kin", "food", "keep", "habit", "secret"].includes(k)) return life(c, k);
      if (k === "mhome") return life(d, "home");
      if (k === "mkin") return life(d, "kin");
      if (k === "deadkeep") return (dead && dead.keep) || "形見";
      if (k === "n") return c ? G.m2Short(c) : "仲間";
      if (k === "m") return d ? G.m2Short(d) : "もう一人";
      if (k === "say") return m.say || "……";
      if (k === "say2") return m.say2 || "……";
      if (k === "dead") return dead ? G.m2Short(dead) : "あいつ";
      return all;
    });
    return fill(fill(t)); // ひとこと（{say}）の中の {home} なども置き換える
  };
  const log0 = G.log;
  G.log = (k, text, extra) => log0(k, G.m2Fill(text), extra);
  const memo0 = G.memo;
  G.memo = (t) => memo0(G.m2Fill(t));
  const chron0 = G.chron;
  G.chron = (text, kind) => chron0(G.m2Fill(text), kind);

  // ---------------------------------------------------------------- 仲間が加わる
  const add0 = G.addCompanion;
  G.addCompanion = (c) => {
    const S = G.S;
    const n = S.companions.length;
    const r = add0(c);
    if (r && S.companions.length > n) {
      G.m2State(S);
      const comp = S.companions[S.companions.length - 1];
      // 酒場で雇った者は金の縁、助けた者は恩の縁
      comp.bond = S.mode === "fac" && S.fac === "tavern" ? 36 + G.d(12) : 52 + G.d(12);
      comp.joined = S.day;
      G.note(`（${G.m2Trait(comp).name}。${G.m2Mood(comp.bond)}）`);
    }
    return r;
  };

  // ---------------------------------------------------------------- 出来事
  // 主役にできる仲間がいるか（events_m2.js の cond から呼ぶ）
  G.m2Can = (S, spec) => {
    if (!S.companions || !S.companions.length) return false;
    G.m2State(S);
    const a = S.companions.filter((c) => !spec.pick || spec.pick(c, S));
    if (!a.length) return false;
    if (spec.pick2) return a.some((c) => S.companions.some((d) => d !== c && spec.pick2(d, S)));
    return true;
  };
  const start0 = G.startEvent;
  G.startEvent = (ev) => {
    const S = G.S;
    const e = typeof ev === "string" ? D.EVENTS.find((x) => x.id === ev) : ev;
    if (e && e.m2 && S) {
      const m = G.m2State(S);
      const spec = e.m2;
      let c = m.force ? find(m.force) : spec.keep ? G.m2Focus() : null;
      m.force = null;
      if (c && !S.companions.includes(c)) c = null;
      if (!c) {
        const cands = S.companions.filter((x) => (!spec.pick || spec.pick(x, S)) && (!spec.pick2 || S.companions.some((d) => d !== x && spec.pick2(d, S))));
        if (!cands.length) return false;
        c = G.pick(cands);
      }
      m.focus = c.id;
      const d = spec.pick2 ? G.pick(S.companions.filter((x) => x !== c && spec.pick2(x, S))) : null;
      m.focus2 = d ? d.id : null;
      const says = spec.say ? spec.say(c, S) : null;
      m.say = says && says.length ? G.pick(says) : "";
      const says2 = spec.say2 && d ? spec.say2(d, S) : null;
      m.say2 = says2 && says2.length ? G.pick(says2) : "";
      if (!spec.parting && !spec.farewell && !spec.keep) m.counts.talk++;
    }
    return start0(ev);
  };
  const choices0 = G.eventChoices;
  G.eventChoices = () => choices0().map(({ c, i }) => ({ c: c.label && c.label.indexOf("{") >= 0 ? Object.assign({}, c, { label: G.m2Fill(c.label) }) : c, i }));

  // 結果の当てはめ：いつもの結果のあとに、好感度と別れを当てはめる
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (!o || !S || S.over || !(o.bond || o.bond2 || o.m2)) return apply0(o);
    const c = G.m2Focus(), d = G.m2Focus2();
    apply0(o);
    if (S.over) return;
    if (o.bond && c && S.companions.includes(c)) G.m2Bond(c, bondOf(o.bond, c));
    if (o.bond2 && d && S.companions.includes(d)) G.m2Bond(d, bondOf(o.bond2, d));
    if (!o.m2 || !c) return;
    switch (o.m2) {
      case "rob": {
        const g = Math.floor(S.gold / 2);
        if (g > 0) { S.gold -= g; G.note(`所持金 -${g}G`); }
        G.m2Remove(c, "betray");
        break;
      }
      case "betray": G.m2Remove(c, "betray"); break;
      case "leave": G.m2Remove(c, "leave"); break;
      case "stay": c.bond = Math.max(c.bond, 35); G.note(`${G.m2Short(c)}は残ることにした。（好感度 ${c.bond}）`); break;
      case "die": G.m2Remove(c, "death", S.m2.doom && S.m2.doom.id === c.id ? S.m2.doom.cause : "深手がもとで"); S.m2.doom = null; break;
      case "doom": G.m2Doom(c, G.m2Fill(o.cause || "深手を負った")); break;
      case "wound":
        c.wounds = (c.wounds || 0) + 1;
        c.power = Math.max(20, (c.power || 30) - 8);
        G.note(`${G.m2Short(c)}は深手を負った。（腕前 ${c.power}）`);
        if (c.wounds >= 2) G.m2Doom(c, "古傷が開いた");
        break;
      case "saved":
        S.m2.doom = null;
        c.wounds = 0;
        c.power = Math.max(20, (c.power || 30) - 5);
        G.chron(`深手を負った${c.name}を、手当てで死の淵から引き戻す`, "comp");
        break;
      case "confide":
        c.confided = true;
        c.power = Math.min(95, (c.power || 30) + 8);
        G.note(`${G.m2Short(c)}の腕前が上がった。（${c.power}）`);
        G.chron(`${c.name}と、固い絆を結ぶ`, "comp");
        break;
      case "slain": {
        const rec = [...S.m2.gone].reverse().find((g) => g.id === c.id);
        if (rec) rec.how = "slain";
        S.m2.counts.death++;
        G.chron(`刃を向けてきた${c.name}を、自らの手で討つ`, "comp");
        break;
      }
    }
  };

  // 裏切った仲間と戦うときは、敵の名前をその仲間にする
  const combat0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    combat0(ids, opt);
    const S = G.S;
    if (!S.combat) return;
    const m = G.m2State(S);
    m.fight = { kills: S.counters.kills, boss: !!S.combat.boss, foe: S.combat.foes[0] && S.combat.foes[0].name };
    const c = G.m2Focus();
    if (c) S.combat.foes.forEach((f) => { if (f.id === "m2_traitor") f.name = G.m2Short(c); });
  };

  // ---------------------------------------------------------------- 「仲間と話す」
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S.companions.length || S.travel) return groups;
    G.m2State(S);
    groups.push({ title: "仲間", list: S.companions.map((c) => ({
      id: "m2talk:" + c.id, label: `${G.m2Short(c)}と話す`, sub: `${G.m2Trait(c).name}・${G.m2Mood(c.bond)}（${c.bond}）`,
      disabled: c.talkDay === S.day, kw: ["話", "仲間", G.m2Short(c)],
    })) });
    return groups;
  };
  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "m2talk") return exploreAct0(head, arg, a);
    G.m2Talk(arg);
  };
  // 仲間と話す：好感度が尽きていれば別れ話、そうでなければ会話の出来事
  G.m2Talk = (id) => {
    const S = G.S;
    const m = G.m2State(S);
    const c = find(id);
    if (!c || !S.companions.includes(c)) return false;
    c.talkDay = S.day;
    G.log("you", `${G.m2Short(c)}と話す`);
    G.pass(1);
    const tags = G.eventTags();
    const ok = (e) => e.m2 && e.where.some((w) => tags.includes(w)) && (!e.cond || e.cond(S)) && (!e.m2.pick || e.m2.pick(c, S)) && (!e.m2.pick2 || S.companions.some((d) => d !== c && e.m2.pick2(d, S)));
    let pool;
    if (c.bond <= BETRAY_AT) pool = D.EVENTS.filter((e) => e.m2 && e.m2.parting && ok(e));
    else pool = D.EVENTS.filter((e) => e.m2 && e.m2.talk && ok(e) && !(e.once && S.flags["ev:" + e.id]));
    if (!pool.length) { G.say(`${G.m2Short(c)}は、黙って肩をすくめた。`); G.m2Bond(c, 1); return true; }
    m.force = c.id;
    return G.startEvent(G.pick(pool));
  };

  // ---------------------------------------------------------------- 手番の終わり：戦いのあとの深手・日ごとの好感度・看取り
  const end0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && !S.over) {
      const m = G.m2State(S);
      // 戦いが終わった
      if (m.fight && !S.combat) {
        const f = m.fight;
        m.fight = null;
        const won = S.counters.kills > f.kills;
        const near = S.hp < S.maxHp * 0.3;
        S.companions.forEach((c) => {
          const L = G.m2Trait(c).likes || {};
          G.m2Bond(c, (won ? L.win || 0 : 0) + (won && f.boss ? L.boss || 0 : 0) + (near ? L.near || 0 : 0), true);
        });
        const risk = 0.025 + (f.boss ? 0.1 : 0) + (near ? 0.06 : 0) + (won ? 0 : 0.04);
        // B5：深手を負うのは、その戦いで倒れた（戦闘不能になった）仲間だけ（G.b5Fall が f.fell に入れる）
        const fell = S.companions.filter((c) => (f.fell || []).includes(c.id));
        if (fell.length && !S.over && G.rand() < risk) {
          const c = G.pick(fell);
          G.m2Doom(c, won ? `${f.foe || "敵"}との戦いで深手を負った` : `${f.foe || "敵"}から退くとき、しんがりで深手を負った`);
        }
      }
      // 日ごとの好感度（金が乏しい・金がある・放っておかれる）
      if (!m.day) m.day = S.day;
      if (S.day > m.day) {
        const n = Math.min(5, S.day - m.day);
        m.day = S.day;
        S.companions.forEach((c) => {
          const L = G.m2Trait(c).likes || {};
          if (S.gold < 30 && L.poor) G.m2Bond(c, L.poor * n, true);
          if (S.gold >= 300 && L.rich) G.m2Bond(c, L.rich * n, true);
          // 十日以上、口をきいていないと不満がたまる
          if (S.day - (c.talkDay || c.joined || S.day) > 10) G.m2Bond(c, -n, true);
        });
      }
      // 深手の仲間を看取る
      if (m.doom && !S.over) {
        const c = find(m.doom.id);
        if (!c || !S.companions.includes(c)) m.doom = null;
        else if (S.mode === "explore" && !S.combat) {
          m.force = c.id;
          G.startEvent("m2_farewell");
        }
      }
    }
    return end0();
  };
})(globalThis.G = globalThis.G || {});
