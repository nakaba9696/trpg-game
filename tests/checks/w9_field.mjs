// W9（野）：浅い所は荒らされている・ギルドのいつもの仕事・格の外れたものの通過・冒険者の書き込み帳（engine/zzzzzzzzzzzzzzzzz_w9_field.js・data/w9_field*.js）
// - 出来事の整合（種類・土地・場所）。夜に出るもの・通過するものの場所が設定どおり（呼ぶ声は迷いの森と街道、通過は D.W9F_PASS の場所だけ、
//   魔物は隣の縄張りから来てその土地の格を超える、無関心な使徒には戦う選択肢が無い）
// - 段（浅い・奥）と実入りの倍率。浅い所でだけ鉢合わせが起き、奥では起きない
// - 夕暮れの場面が出て、野営・夜も歩くが効く。夜は昼より危ない（戦い・傷・夜の出来事の割合）
// - いつもの仕事は何度でも受けられ、手間賃が入り、使った能力値に経験が入り、傷つかない
// - 書き込みを読むと覚え書き（図鑑）が開く。嘘はデータの弱点と食い違うものだけで、その魔物の覚え書きが開くと嘘と分かる
// - 古いセーブ（S.w9f なし）・古い profile（G.P.w9f なし）で動く
export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("w9_field: " + m); };
  const D0 = G0.data;
  if (!G0.w9f || !D0.W9F) { F("G.w9f / D.W9F が無い"); return; }
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  // ---------------------------------------------------------------- 出来事とデータの整合
  const KINDS = ["dusk", "night", "rival", "pass"];
  const LANDS = ["forest", "plain", "snow", "swamp", "mount", "ruin", "isle", "realm", "dungeon", "wild"];
  const evs = D0.EVENTS.filter((e) => e.w9f);
  const byKind = Object.fromEntries(KINDS.map((k) => [k, evs.filter((e) => e.w9f.kind === k)]));
  for (const k of KINDS) if (!byKind[k].length) F(`種類 ${k} の出来事が無い`);
  if (byKind.rival.length < 3 || byKind.night.length < 4) F("鉢合わせ（3 以上）・夜（4 以上）の出来事が少ない");
  const fights = (c) => [c.fight, c.ok && c.ok.fight, c.ng && c.ng.fight].filter(Boolean);
  for (const e of evs) {
    if (!(e.w9f.w > 0) || e.w !== 0 || !e.where.includes("w9f")) F(`${e.id}: w9f の重み・w 0・where の形`);
    as(e.w9f.land).forEach((l) => { if (!LANDS.includes(l)) F(`${e.id}: 土地 ${l} が無い`); });
    as(e.w9f.loc).forEach((l) => { if (!D0.LOCS[l] || D0.LOCS[l].type === "town") F(`${e.id}: 場所 ${l} が無いか町`); });
    if (!e.w9f.land && !e.w9f.loc) F(`${e.id}: 土地も場所も無い`);
    for (const c of e.choices) for (const f of fights(c)) for (const id of as(f)) if (id !== "@pool" && !D0.ENEMIES[id]) F(`${e.id}: 敵 ${id} が無い`);
  }
  // 鉢合わせの出来事は、譲る・張り合う・組む・脅すがそろう
  for (const e of byKind.rival) {
    const ls = e.choices.map((c) => c.label).join("／");
    for (const w of ["譲", "張り合", "組", "脅"]) if (!ls.includes(w)) F(`${e.id}: 「${w}」の選択肢が無い`);
  }
  // 夜の呼ぶ声は、迷いの森と街道（strata.md 6. のヨビゴエ）。足音は罪の匂いのある者だけ
  const voice = D0.EVENTS.find((e) => e.id === "w9fn_voice");
  if (!voice || !as(voice.w9f.loc).includes("forest") || as(voice.w9f.land).length) F("呼ぶ声が迷いの森の出来事になっていない（場所で決める）");
  const steps = D0.EVENTS.find((e) => e.id === "w9fn_steps");
  if (!steps || steps.cond({ sin: 0 }) || !steps.cond({ sin: 9 })) F("足音の出来事が罪の匂いで分かれていない");
  // 通過：場所と相手が設定どおり
  const ORDER = (D0.E8 && D0.E8.ORDER) || ["S", "A", "B", "C", "D"];
  const gi = (g) => ORDER.indexOf(g);
  for (const [id, p] of Object.entries(D0.W9F_PASS || {})) {
    const e = D0.EVENTS.find((x) => x.id === id);
    if (!e || !e.w9f || e.w9f.kind !== "pass") { F(`通過 ${id}: 出来事が無い`); continue; }
    if (JSON.stringify(as(e.w9f.loc).slice().sort()) !== JSON.stringify(as(p.loc).slice().sort())) F(`通過 ${id}: 出来事の場所と表の場所が違う`);
    if (!p.why) F(`通過 ${id}: 理由（why）が無い`);
    for (const l of as(p.loc)) if ((D0.LOCS[l] || {}).type !== "wild") F(`通過 ${id}: ${l} が野でない`);
    const labels = e.choices.map((c) => c.label).join("／");
    if (!e.choices.some((c) => c.ok && c.ok.w9fLeave)) F(`通過 ${id}: 避ける（遠回り）の選択肢が無い`);
    for (const w of ["隠|伏", "様子を見る|見上げる|見る"]) if (!new RegExp(w).test(labels)) F(`通過 ${id}: 「${w}」の選択肢が無い`);
    if (p.kind === "beast") {
      const home = as(((D0.W8_FOES || {})[p.foe] || {}).loc);
      if (!D0.ENEMIES[p.foe] || !home.length) F(`通過 ${id}: 魔物 ${p.foe} が W8 の強敵に無い`);
      for (const l of as(p.loc)) {
        if (home.includes(l)) F(`通過 ${id}: ${l} は縄張りの中（W8 の前触れと重なる）`);
        if (!home.some((h) => (D0.LOCS[l].links || {})[h] != null)) F(`通過 ${id}: ${l} が ${p.foe} の縄張りの隣でない`);
        const top = Math.min(...(D0.LOCS[l].pool || []).map((x) => gi(G0.gradeOf(x))));
        if (!(gi(G0.gradeOf(p.foe)) < top)) F(`通過 ${id}: ${p.foe} がその土地の格を超えていない`);
      }
      if (!e.choices.some((c) => /挑/.test(c.label) && as(c.fight).includes(p.foe))) F(`通過 ${id}: 挑む選択肢が無い`);
    } else {
      if (e.choices.some((c) => fights(c).length)) F(`通過 ${id}: 無関心な使徒に戦う選択肢がある`);
      if (p.ap) {
        const a = ((D0.E3 || {}).LIST || {})[p.ap];
        if (!a || a.calm !== "無関心" || !as(p.loc).includes(a.home)) F(`通過 ${id}: 使徒 ${p.ap} の居場所・態度と合わない`);
      }
    }
  }

  // ---------------------------------------------------------------- 遊ぶ準備
  const fresh = (seed) => {
    const G = loadEngine();
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 14])), caps: Object.fromEntries(D.STATS.map((k) => [k, 99])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.hp = G.S.maxHp = 999;
    return G;
  };
  const put = (G, loc, phase) => {
    const S = G.S;
    S.loc = loc; S.depth = 0; S.mode = "explore"; S.fac = null; S.event = null; S.combat = null; S.travel = null;
    if (phase != null) S.phase = phase;
    const st = G.w9f.st(S);
    st.woke = S.day;
    st.dusk = S.phase === 2 ? `${loc}:${S.day}` : st.dusk;
    return S;
  };
  // ギルドでは「いつもの仕事と書き込み帳」から帳面を選ぶ。酒場は壁の落書きを直に読む
  const readNote = (G) => {
    if (G.S.fac !== "guild") return G.act("w9fnote");
    G.act("w9fjobs");
    const c = G.eventChoices().find(({ c }) => c.ok && c.ok.w9fJob === "note");
    if (!c) { F("ギルドの掲示に書き込み帳の選択肢が無い"); return; }
    G.act("ev:" + c.i);
  };
  const evOf = (G) => (G.S.mode === "event" ? G.data.EVENTS.find((e) => e.id === G.S.event) : null);

  // ---------------------------------------------------------------- 段と実入り
  {
    const G = fresh(1);
    const W = G.w9f;
    const want = { forest: "shallow", plains: "shallow", mountains: "deep", wasteland: "deep", w2_shadow: "mid" };
    for (const [l, t] of Object.entries(want)) if (W.tierOf(l, 0) !== t) F(`段：${l} が ${W.tierOf(l, 0)}（${t} のはず）`);
    if (W.tierOf("ruins", 1) !== "shallow" || W.tierOf("ruins", 3) !== "deep") F("段：町に近い迷宮の地下 1 階が浅く、半分より下が奥になっていない");
    if (W.tierOf("majincastle", 1) === "shallow") F("段：町から遠い迷宮の地下 1 階が浅い");
    const gain = (loc, phase) => {
      const S = put(G, loc, phase);
      const g0 = (S.gold = 100);
      S.gold += 20;
      G.note("20G を手に入れた。");
      W.thin(S, g0);
      return S.gold - g0;
    };
    const s = gain("forest", 1);
    const line = G.S.log.filter((x) => x.k === "sys").pop();
    if (!line || line.text !== `${s}G を手に入れた。`) F(`実入り：手に入れた行の数を書き直していない（${line && line.text}・${s}）`);
    const m = gain("w2_shadow", 1), d = gain("mountains", 1), nn = gain("forest", 3);
    if (!(s < m && m < d)) F(`実入り：浅い ${s}・中 ${m}・奥 ${d}（浅い < 中 < 奥 のはず）`);
    if (!(nn > s)) F(`実入り：夜の浅い所 ${nn} が昼 ${s} より多くない`);
  }

  // ---------------------------------------------------------------- 鉢合わせは浅い所だけ
  {
    const count = (loc, depth) => {
      const G = fresh(7);
      let rival = 0;
      for (let i = 0; i < 300; i++) {
        const S = put(G, loc, 1);
        S.depth = 0;
        G.exploreAct(depth ? "deeper" : "explore");
        const e = evOf(G);
        if (e && e.w9f && e.w9f.kind === "rival") rival++;
        if (G.S.over) break;
      }
      return rival;
    };
    const a = count("forest"), b = count("mountains"), c = count("w2_shadow"), d = count("ruins", 1);
    if (!(a > 10)) F(`鉢合わせ：迷いの森で ${a} 回（300 回のうち）`);
    if (b || c) F(`鉢合わせ：奥・中ほどで起きた（断界山脈 ${b}・影の谷 ${c}）`);
    if (!(d > 2)) F(`鉢合わせ：町に近い迷宮の地下 1 階に下りて ${d} 回`);
  }

  // ---------------------------------------------------------------- 夕暮れと夜
  {
    const G = fresh(11);
    const W = G.w9f;
    const S = G.S;
    S.phase = 2; // 旅は夕方に着く（G.passDays）
    G.arrive("forest");
    G.w9f.st(S).woke = S.day - G.data.W9F.DUSK_DAYS; // 着いてから DUSK_DAYS 日歩き回った
    G.exploreAct("explore");
    let e = evOf(G);
    if (!e || e.w9f.kind !== "dusk") F("夕暮れ：寝ずに歩き回った夕に夕暮れの場面が出ない");
    else {
      const i = e.choices.findIndex((c) => c.ok && c.ok.w9fCamp);
      const day = S.day;
      G.chooseEvent(i);
      if (S.mode === "event") G.chooseEvent(G.eventChoices()[0].i); // 野営の夜の出来事
      if (S.mode === "combat") { S.combat = null; S.mode = "explore"; }
      if (!(S.day > day && S.phase === 0)) F(`夕暮れ：野営しても朝にならない（${S.day}日 ${S.phase}）`);
    }
    // 起きてから DUSK_DAYS 日歩き回ると、また日が傾く。夜も歩くと夜になる
    put(G, "forest", 0);
    W.st(S).woke = S.day - G.data.W9F.DUSK_DAYS;
    G.act("explore"); // 時間帯が夕になるのは手番の終わり
    e = evOf(G);
    if (!e || e.w9f.kind !== "dusk" || S.phase !== 2) F("夕暮れ：寝ずに歩き回っても日が傾かない");
    else {
      G.chooseEvent(e.choices.findIndex((c) => c.ok && c.ok.w9fNight));
      if (S.phase !== 3 || !W.night(S)) F("夕暮れ：夜も歩くを選んでも夜にならない");
    }
    // 町へ引き返す（町への道がある野）
    put(G, "forest", 2); W.st(S).dusk = null; W.st(S).woke = S.day - 9;
    G.exploreAct("explore");
    e = evOf(G);
    const back = e ? e.choices.findIndex((c) => c.ok && c.ok.w9fBack) : -1;
    if (back < 0) F("夕暮れ：町へ引き返す選択肢が無い");
    else { G.chooseEvent(back); if (S.loc === "forest" && !S.travel && S.mode === "explore") F("夕暮れ：引き返しても町へ向かわない"); }
    // 町への道が無い野では、引き返す選択肢を出さない
    const G2 = fresh(12);
    put(G2, "w3_driftisle", 2); G2.w9f.st(G2.S).dusk = null; G2.w9f.st(G2.S).woke = G2.S.day - 9;
    G2.exploreAct("explore");
    const e2 = evOf(G2);
    if (!e2 || e2.w9f.kind !== "dusk") F("夕暮れ：数の合わない島で夕暮れの場面が出ない");
    else if (G2.eventChoices().some(({ c }) => c.ok && c.ok.w9fBack)) F("夕暮れ：町への道の無い島で、引き返すが選べる");
  }
  {
    // 夜は昼より危ない（戦い・傷・夜の出来事）。同じ土地で 400 回ずつ
    const risk = (phase, seed) => {
      const G = fresh(seed);
      let bad = 0, night = 0;
      for (let i = 0; i < 400; i++) {
        const S = put(G, "plains", phase);
        S.hp = S.maxHp;
        G.exploreAct("explore");
        const e = evOf(G);
        if (e && e.w9f && e.w9f.kind === "night") night++;
        if (G.S.mode === "combat" || G.S.hp < G.S.maxHp || (e && e.w9f && e.w9f.kind === "night")) bad++;
        if (G.S.over) break;
      }
      return { bad, night };
    };
    const day = risk(1, 21), nt = risk(3, 21);
    if (!(nt.bad > day.bad * 1.25)) F(`夜の危うさ：夜 ${nt.bad}・昼 ${day.bad}（400 回のうち。夜が 1.25 倍より多いはず）`);
    if (day.night) F("夜の出来事が昼に起きた");
    if (!(nt.night > 40)) F(`夜の出来事が少ない（${nt.night}）`);
    // 夜の出来事の場所：呼ぶ声は迷いの森・街道だけ
    const G = fresh(3);
    const S = put(G, "swamp", 3);
    if (G.w9f.pool(S, "night").some((e) => e.id === "w9fn_voice")) F("呼ぶ声が毒沼の湿地で起きる");
    put(G, "forest", 3);
    if (!G.w9f.pool(S, "night").some((e) => e.id === "w9fn_voice")) F("呼ぶ声が迷いの森で起きない");
  }

  // ---------------------------------------------------------------- 格の外れたものが通る
  {
    const G = fresh(31);
    const T = G.data.W9F;
    T.PASS.CHANCE = 1;
    const seen = {};
    for (const loc of Object.keys(G.data.LOCS).filter((l) => G.data.LOCS[l].type === "wild")) {
      for (let i = 0; i < 6; i++) {
        const S = put(G, loc, 1);
        G.w9f.st(S).pass = {};
        G.exploreAct("explore");
        const e = evOf(G);
        if (e && e.w9f && e.w9f.kind === "pass") (seen[loc] = seen[loc] || new Set()).add(e.id);
        if (G.S.over) break;
      }
    }
    const want = {};
    Object.entries(G.data.W9F_PASS).forEach(([id, p]) => as(p.loc).forEach((l) => (want[l] = want[l] || new Set()).add(id)));
    for (const [loc, ids] of Object.entries(seen)) for (const id of ids) if (!(want[loc] && want[loc].has(id))) F(`通過 ${id} が ${loc} で起きた`);
    for (const loc of Object.keys(want)) if (!seen[loc]) F(`通過が ${loc} で起きない`);
    // 同じ場所では間をあける
    const S = put(G, "w2_shadow", 1);
    G.w9f.st(S).pass = { w2_shadow: S.day };
    if (G.w9f.passHere(S).length) F("通過が同じ場所で続けて起きる");
    // 様子を見ると、図鑑に載って覚え書きが開く
    const G3 = fresh(32);
    put(G3, "w4_watch", 1);
    const k0 = G3.knowCount().known;
    G3.apply({ text: "見た。", w9fPeek: "e4_rockeater_x" });
    if (!(G3.knowCount().known > k0) && G3.l1.ids().some((id) => G3.data.KNOW[id].foe === "e4_rockeater_x")) F("通過：様子を見ても覚え書きが開かない");
    if (!G3.codexFoe("e4_rockeater_x")) F("通過：様子を見ても図鑑に載らない");
  }

  // ---------------------------------------------------------------- ギルドのいつもの仕事
  {
    const G = fresh(41);
    const D = G.data;
    const town = Object.keys(D.LOCS).find((l) => (D.LOCS[l].fac || []).includes("guild"));
    put(G, town, 0);
    G.exploreAct("fac", "guild");
    const S = G.S;
    for (const j of D.W9F_JOBS) {
      const exp0 = (S.s5exp || {})[j.stat] || 0, st0 = S.stats[j.stat];
      for (let i = 0; i < 12; i++) {
        const a = G.actions().flatMap((g) => g.list).find((x) => x.id === "w9fjobs");
        if (!a || a.disabled) { F(`いつもの仕事 ${j.id}: ${i + 1} 回目に受けられない`); break; }
        S.hp = S.maxHp;
        const g0 = S.gold;
        G.act("w9fjobs");
        const c = G.eventChoices().find(({ c }) => c.ok && c.ok.w9fJob === j.id);
        if (!c) { F(`いつもの仕事 ${j.id}: 掲示に選択肢が無い`); break; }
        G.act("ev:" + c.i);
        if (!(S.gold > g0)) F(`いつもの仕事 ${j.id}: 手間賃が入らない`);
        if (S.gold - g0 > D.W9F.JOB.PAY[0] + D.W9F.JOB.PAY[1] + 5) F(`いつもの仕事 ${j.id}: 手間賃が高すぎる（${S.gold - g0}G）`);
        if (S.hp < S.maxHp) F(`いつもの仕事 ${j.id}: 傷を負った`);
        if (S.mode !== "fac" || S.fac !== "guild") { F(`いつもの仕事 ${j.id}: ギルドの外に出た`); break; }
      }
      if (!(S.stats[j.stat] > st0 || ((S.s5exp || {})[j.stat] || 0) > exp0)) F(`いつもの仕事 ${j.id}: ${j.stat} に経験が入らない`);
    }
    if (!(G.w9f.st(S).jobs >= D.W9F_JOBS.length * 12)) F("いつもの仕事の回数が数えられていない");
  }

  // ---------------------------------------------------------------- 書き込み帳
  {
    const G = fresh(51);
    const D = G.data;
    const T = D.W9F;
    const town = "karna";
    put(G, town, 0);
    G.P = { trophies: {}, graves: [] }; // 古い profile（w9f も know も無い）
    G.exploreAct("fac", "guild");
    const S = G.S;
    T.NOTE.TRUE = 1; T.NOTE.LIE = 0;
    const k0 = G.knowCount().known;
    readNote(G);
    if (!(G.knowCount().known === k0 + 1)) F(`書き込み帳：読んでも覚え書きが開かない（${k0} → ${G.knowCount().known}）`);
    if (!Object.values(G.P.know || {}).some((r) => r.how === "note")) F("書き込み帳：覚え書きのきっかけが「書き込みで」になっていない");
    readNote(G);
    if (G.knowCount().known !== k0 + 1) F("書き込み帳：同じ日に二度読んで、また開いた");
    S.day++;
    readNote(G);
    if (G.knowCount().known !== k0 + 2) F("書き込み帳：次の日に新しい書き込みが無い");
    // 酒場の落書きも読める（施設ごとに一日一つ）
    G.exploreAct("back"); G.exploreAct("fac", "tavern");
    if (!G.actions().flatMap((g) => g.list).some((x) => x.id === "w9fnote")) F("酒場に落書きが無い");
    readNote(G);
    if (G.knowCount().known !== k0 + 3) F("酒場の落書きを読んでも覚え書きが開かない");
    // 嘘：データの弱点と食い違うものだけ。その魔物の覚え書きが開くと、嘘と分かる
    T.NOTE.TRUE = 0; T.NOTE.LIE = 1;
    for (let i = 0; i < 6; i++) { S.day++; readNote(G); }
    const lies = Object.values((G.P.w9f || {}).lies || {});
    if (lies.length < 3) F(`書き込み帳：嘘が書かれない（${lies.length}）`);
    for (const x of lies) {
      const e = D.ENEMIES[x.foe];
      if (!e || G.w9f.TRUE[x.aim](e)) F(`書き込み帳：嘘 ${x.foe}:${x.aim} がデータの弱点と食い違っていない`);
      if (!x.text.includes(e.name)) F(`書き込み帳：嘘の文に魔物の名が無い`);
    }
    const x = lies.find((l) => !l.found);
    if (x) {
      const id = G.l1.ids().find((k) => D.KNOW[k].foe === x.foe && !G.knowHas(k));
      if (id) { G.learn(id, "seen"); if (!x.found) F("書き込み帳：その魔物の覚え書きが開いても、嘘と分からない"); }
    }
    // 自慢話は何も開かない
    T.NOTE.TRUE = 0; T.NOTE.LIE = 0;
    const k1 = G.knowCount().known;
    S.day++; readNote(G);
    if (G.knowCount().known !== k1) F("書き込み帳：自慢話で覚え書きが開いた");
  }

  // ---------------------------------------------------------------- 古いセーブ
  {
    const G = fresh(61);
    const S = put(G, "forest", 1);
    delete S.w9f;
    G.exploreAct("explore");
    if (G.S.over && !/力尽き|倒され/.test(G.S.deathCause || "")) F("古いセーブ（S.w9f なし）で探索が止まった");
    const G2 = fresh(62);
    put(G2, "karna", 0);
    delete G2.S.w9f;
    G2.P = { trophies: {}, graves: [] };
    G2.exploreAct("fac", "guild");
    G2.act("w9fjobs"); G2.chooseEvent(0);
    readNote(G2);
    if (!G2.S.w9f) F("古いセーブで、いつもの仕事・書き込み帳が動かない");
  }

  if (!n) ok(`W9 の野（出来事 ${evs.length}：夕暮れ ${byKind.dusk.length}・夜 ${byKind.night.length}・鉢合わせ ${byKind.rival.length}・通過 ${byKind.pass.length}。いつもの仕事 ${D0.W9F_JOBS.length}。段と実入り・夜の危うさ・通過の場所・書き込みと嘘・古いセーブ）`);
};
