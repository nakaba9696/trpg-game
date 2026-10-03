// Q5：組み合わせで作るギルドの依頼（src/data/quests_q5.js・src/engine/zzz_q5_quests.js）
// - 依頼の型が 20 以上。表の中身が正しい（敵・能力値・難易度・依頼人・名のある人・ひねり・途中の出来事・仕事）
// - 組み合わせた依頼の題・説明・場面・途中の出来事が、どれも文になる（{…} が残らない・「！」や禁じた言葉が無い）
// - ひねり（依頼人の嘘・相手も被害者・罠）が場面で明かされ、別の結末（嘘を暴く・手を組む・裏切る）に分かれる
// - 途中の出来事・期限切れ・報告（報酬の品・評判・図鑑の記録）・町の小さな仕事
// - 古いセーブ（S.q5 が無い・前の形の依頼）でも動く。依頼を多めに受けるランダムプレイで止まらない
const BANNED = /見世物|観客|客席|舞台|台本|言霊|魔王|！|!/;
const LEFT = /\{\w+\}/;

export default ({ fail, ok, loadEngine, seeded }) => {
  let failures = 0;
  const F = (m) => { failures++; fail(m); };
  const newGame = (G, seed, cls) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 55]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 85]));
    G.newGame({ cls: cls || Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.maxHp = G.S.hp = 400;
    return G.S;
  };
  const textsOf = (o, out, where) => {
    if (!o) return;
    ["text", "memo", "chron", "label"].forEach((k) => { if (typeof o[k] === "string") out.push([where + "." + k, o[k]]); });
    ["ok", "ng", "win"].forEach((k) => textsOf(o[k], out, where + "." + k));
  };
  const checkTexts = (list) => {
    for (const [w, t] of list) {
      if (LEFT.test(t)) { F(`${w}: 差し込みが残っている「${t.slice(0, 50)}」`); return false; }
      if (BANNED.test(t)) { F(`${w}: 「${t.match(BANNED)[0]}」がある「${t.slice(0, 50)}」`); return false; }
    }
    return true;
  };

  const G = loadEngine();
  const D = G.data;
  const Q = D.Q5;
  if (!Q || !G.q5) { F("D.Q5 か G.q5 が無い"); return; }

  // ---------------------------------------------------------------- 表の中身
  if (Q.TYPES.length < 20) F(`依頼の型が ${Q.TYPES.length}（20 以上）`);
  const keys = new Set();
  const scanChoice = (c, where) => {
    if (c.stat && !D.STATS.includes(c.stat)) F(`${where}: 能力値 ${c.stat} が無い`);
    if (c.diff && D.DIFF[c.diff] === undefined) F(`${where}: 難易度 ${c.diff} が無い`);
    const foes = c.fight && !String(c.fight).startsWith("@") ? [].concat(c.fight) : [];
    foes.forEach((f) => { if (!D.ENEMIES[f]) F(`${where}: 敵 ${f} が無い`); });
    ["ok", "ng", "win"].forEach((k) => { if (c[k]) scanChoice(c[k], where + "." + k); });
    if (c.item && !D.ITEMS[c.item]) F(`${where}: アイテム ${c.item} が無い`);
    if (c.remove && !D.ITEMS[c.remove]) F(`${where}: アイテム ${c.remove} が無い`);
    const R = ["ok", "fail", "lost", "betray", "ally", "expose", "trap", "half", "bonus", "extend", "progress", "keep"];
    if (c.q5 && !R.includes(c.q5)) F(`${where}: 依頼の行方 ${c.q5} が無い`);
    if (c.then && !R.includes(c.then)) F(`${where}: 依頼の行方 ${c.then} が無い`);
  };
  for (const t of Q.TYPES) {
    if (keys.has(t.key)) F(`型 ${t.key} が重複`);
    keys.add(t.key);
    if (!["hunt", "delve", "deliver", "scene", "escort"].includes(t.mech)) F(`型 ${t.key}: mech ${t.mech}`);
    if (!["wild", "dungeon", "field", "town2", "here", "townAny"].includes(t.at)) F(`型 ${t.key}: at ${t.at}`);
    for (const r of t.roles) if (!Q.CLIENTS[r]) F(`型 ${t.key}: 依頼人 ${r} が無い`);
    for (const tw of t.twists || []) if (!Q.TWISTS[tw] && !Q.MIDS.some((m) => m.twist === tw)) F(`型 ${t.key}: ひねり ${tw} が無い`);
    if ((t.mech === "scene" || t.mech === "escort") && !Q.CLIMAX[t.key]) F(`型 ${t.key}: 取りかかる場面が無い`);
    (Q.CLIMAX[t.key] ? Q.CLIMAX[t.key].choices : []).forEach((c, i) => scanChoice(c, `場面 ${t.key}[${i}]`));
  }
  Object.entries(Q.TWISTS).forEach(([k, tw]) => tw.choices.forEach((c, i) => scanChoice(c, `ひねり ${k}[${i}]`)));
  Q.MIDS.forEach((m) => m.choices.forEach((c, i) => scanChoice(c, `途中 ${m.key}[${i}]`)));
  for (const [loc, list] of Object.entries(Q.TOWN_PEOPLE)) {
    if (!D.LOCS[loc]) F(`TOWN_PEOPLE: 町 ${loc} が無い`);
    for (const [id, kinds] of list) {
      if (!(D.C2_PEOPLE || {})[id] && !(D.F2_PEOPLE || {})[id]) F(`TOWN_PEOPLE ${loc}: 人物 ${id} が無い`);
      for (const k of kinds) if (!keys.has(k)) F(`TOWN_PEOPLE ${loc}/${id}: 型 ${k} が無い`);
    }
  }
  for (const n of Object.keys(Q.NATION_BIAS)) if (!Object.values(D.LOCS).some((L) => (L.nation || L.region) === n)) F(`NATION_BIAS: 国 ${n} の場所が無い`);
  for (const b of Object.values(Q.NATION_BIAS)) for (const k of Object.keys(b)) if (!keys.has(k)) F(`NATION_BIAS: 型 ${k} が無い`);
  const jobTowns = new Set();
  for (const j of Q.JOBS) {
    if (!D.STATS.includes(j.stat)) F(`仕事 ${j.key}: 能力値 ${j.stat}`);
    for (const c of Object.keys(j.cls || {})) if (!D.CLASSES[c]) F(`仕事 ${j.key}: 職業 ${c} が無い`);
    if (!checkTexts([...j.ok, ...j.ng].map((t) => ["仕事 " + j.key, t]))) break;
  }

  // ---------------------------------------------------------------- 組み合わせが文になる
  const seenKinds = new Set(), seenTwists = new Set();
  let made = 0, scenes = 0;
  const examples = [];
  {
    newGame(G, 501);
    const S = G.S;
    const st = G.q5State(S);
    const guilds = Object.keys(D.LOCS).filter((k) => (D.LOCS[k].fac || []).includes("guild"));
    let stop = false;
    for (const fame of [0, 45, 160, 400]) {
      for (let seed = 0; seed < 4 && !stop; seed++) {
        for (const loc of guilds) {
          G.rand = seeded(9000 + seed * 31 + fame);
          S.fame = fame; S.loc = loc;
          if (fame >= 160 && G.nationOf(loc)) G.repOf(G.nationOf(loc)).rep = 20; // 評判の要る型（代理の決闘）も出す
          const b = G.q5.board(S);
          if (b.list.length < 3) F(`${loc} 名声${fame}: 掲示が ${b.list.length} 件`);
          for (const q of b.list) {
            made++;
            seenKinds.add(q.kind);
            if (q.twist) seenTwists.add(q.twist);
            if (!D.LOCS[q.loc]) F(`${q.kind}: 行き先 ${q.loc} が無い`);
            if (!(q.reward > 0) || !(q.dur >= 3)) F(`${q.kind}: 報酬か期限が変 ${q.reward}G ${q.dur}日`);
            if (q.type === "hunt" && !(D.ENEMIES[q.target] && q.need >= 1)) F(`${q.kind}: 討伐の相手か数が変`);
            if (q.item && !D.ITEMS[q.item]) F(`${q.kind}: 報酬の品 ${q.item} が無い`);
            if (examples.length < 6 && q.twist && !examples.some((e) => e.includes(q.kind))) examples.push(`[${q.kind}/${q.twist}] ${q.title}──${q.desc}（依頼人 ${q.client.name}・${q.reward}G・${q.dur}日）`);
            const texts = [["題", q.title], ["説明", q.desc], ["依頼人", q.client.name], ["前触れ", q.tell || ""]];
            Object.entries(Q.PROBE).forEach(([k, t]) => texts.push(["確かめる " + k, G.q5.fill(t, q.v)]));
            Object.entries(Q.TWISTS).forEach(([k, tw]) => [tw.after, ...(tw.sprung || []), ...(tw.tells || []), tw.know && tw.know.text].filter(Boolean).forEach((t) => texts.push(["ひねり " + k, G.q5.fill(t, q.v)])));
            // 取りかかる場面と、当てはまる途中の出来事をすべて組み立てる
            const curs = [];
            if (q.type === "q5scene" || q.type === "q5escort") for (let t = 0; t < 2; t++) curs.push({ qid: q.id, sc: "climax", t });
            for (const m of Q.MIDS) for (let t = 0; t < m.text.length; t++) curs.push({ qid: q.id, sc: "mid", key: m.key, t });
            for (const cur of curs) {
              const sc = G.q5.scene(q, cur);
              if (!sc) { if (cur.sc === "climax") F(`${q.kind}: 場面が組み立たない`); continue; }
              scenes++;
              texts.push([`${q.kind}/${cur.sc}/${cur.key || ""} 題`, sc.title], [`${q.kind}/${cur.sc}/${cur.key || ""}`, sc.text]);
              sc.choices.forEach((c, i) => textsOf(c, texts, `${q.kind}/${cur.sc}/${cur.key || ""}[${i}]`));
              sc.choices.forEach((c) => { const fs = [].concat(c.fight || [], (c.ng && c.ng.fight) || []); fs.forEach((f) => { if (!D.ENEMIES[f]) F(`${q.kind}: 戦う相手 ${f} が無い`); }); });
            }
            if (!checkTexts(texts)) { stop = true; break; }
          }
        }
      }
    }
    void st;
  }
  if (seenKinds.size < Q.TYPES.length) F(`掲示に出ない型がある：${Q.TYPES.map((t) => t.key).filter((k) => !seenKinds.has(k)).join("・")}`);
  for (const tw of ["liar", "victim", "ambush", "rival", "extend", "bonus"]) if (!seenTwists.has(tw)) F(`ひねり ${tw} が一度も出ない`);

  // 国ごとの傾向：帝国の掲示には賞金首が、共和国の掲示には採集が多い
  {
    newGame(G, 77);
    const S = G.S;
    S.fame = 60;
    const count = (loc, kind) => { let n = 0; for (let i = 0; i < 40; i++) { G.rand = seeded(300 + i); S.loc = loc; n += G.q5.board(S).list.filter((q) => q.kind === kind).length; } return n; };
    const bg = count("garmund", "bounty"), bz = count("zephara", "bounty");
    const gz = count("zephara", "gather"), gg = count("garmund", "gather");
    if (!(bg > bz)) F(`国の傾向が効かない：賞金首 帝都 ${bg}・首都エルメシア ${bz}`);
    if (!(gz > gg)) F(`国の傾向が効かない：採集 首都エルメシア ${gz}・帝都 ${gg}`);
    // 名声と評判で、受けられる型と掲示の数が増える
    S.loc = "karna"; S.fame = 0;
    G.rand = seeded(5);
    const low = new Set(); for (let i = 0; i < 30; i++) G.q5.board(S).list.forEach((q) => low.add(q.kind));
    if (low.has("relic") || low.has("duel") || low.has("bounty")) F("名声 0 で、名声の要る依頼が出る");
    S.fame = 200; G.repOf("自由都市連合").rep = 30;
    if (G.q5.board(S).list.length !== 5) F(`名声 200・評判 30 で掲示が ${G.q5.board(S).list.length} 件（5 件のはず）`);
  }

  // ---------------------------------------------------------------- 受ける・取りかかる・ひねり・報告
  const takeKind = (S, kind, twist, loc) => {
    const t = G.q5.type(kind);
    const q = G.q5.make(t, S, { i: 0 });
    if (!q) return null;
    if (twist !== undefined) q.twist = twist;
    if (loc) { q.loc = loc; q.v.place = D.LOCS[loc].name; }
    S.board = { loc: S.loc, day: S.day, list: [q], q5: 1 };
    S.mode = "fac"; S.fac = "guild";
    G.act("guild:take:" + q.id);
    return S.quests.find((x) => x.id === q.id) || null;
  };
  {
    // ふつうに果たして報告する（報酬の品・評判・図鑑）
    const S = newGame(G, 11);
    S.loc = "karna"; S.fame = 60;
    const q = takeKind(S, "guard", "", "karna");
    if (!q) F("用心棒の依頼を受けられない");
    else {
      if (q.deadline !== S.day + q.dur) F("受けたときに期限が決まらない");
      q.item = Object.keys(D.ITEMS).find((id) => /^i1_/.test(id));
      S.mode = "explore"; S.fac = null;
      const go = G.actions().flatMap((g) => g.list).find((a) => a.id === "q5go:" + q.id);
      if (!go) F("依頼の町で「取りかかる」が出ない");
      else {
        G.act(go.id);
        if (S.mode !== "event" || S.event !== "q5_scene") F(`取りかかっても場面にならない（${S.mode}）`);
        const i = G.eventChoices().findIndex(({ c }) => !c.fight && c.stat && c.label !== D.Q5.PROBE.label);
        G.rand = () => 0.01; // 判定は成功
        G.act("ev:" + G.eventChoices()[i].i);
        G.rand = seeded(12);
        if (!q.done) F("用心棒の場面で成功しても依頼が果たせない");
        const gold = S.gold, rep = G.repOf("自由都市連合").rep;
        S.mode = "fac"; S.fac = "guild";
        G.act("guild:report:" + q.id);
        if (S.quests.includes(q)) F("報告しても依頼が残る");
        if (S.gold !== gold + q.reward) F(`報告の報酬が合わない ${S.gold - gold}／${q.reward}`);
        if (!G.has(q.item)) F("報酬の品が手に入らない");
        if (!(G.repOf("自由都市連合").rep > rep)) F("報告しても評判が上がらない");
        if (!(G.P.q5 && G.P.q5.kinds.guard && G.P.q5.kinds.guard.ok === 1)) F("図鑑（依頼の記録）に残らない");
      }
    }
  }
  {
    // ひねり：依頼人の嘘 → 嘘を暴く。相手も被害者 → 手を組む。罠 → 切り抜ける
    for (const [kind, twist, label, want] of [["collect", "liar", "嘘を、ギルドに", "expose"], ["missing", "victim", "手を組み", "ally"], ["spy", "ambush", "先に仕掛ける", "trap"]]) {
      const S = newGame(G, 21);
      S.loc = "karna"; S.fame = 100;
      const q = takeKind(S, kind, twist, "karna");
      if (!q) { F(`${kind} を受けられない`); continue; }
      S.mode = "explore"; S.fac = null;
      G.act("q5go:" + q.id);
      // 先に確かめる（知力）と、ひねりを見抜いて、ひねりの選択肢になる
      const probe = G.eventChoices().find(({ c }) => c.label === D.Q5.PROBE.label);
      if (!probe) { F(`${kind}/${twist}: 「先に確かめる」が出ない`); continue; }
      G.rand = () => 0.01;
      G.act("ev:" + probe.i);
      G.rand = seeded(23);
      if (!q.revealed || S.event !== "q5_scene") F(`${kind}/${twist}: 確かめても見抜けない`);
      if (!S.memos.includes(D.Q5.TWISTS[twist].know.text)) F(`${kind}/${twist}: 見抜いても覚え書きの元が残らない`);
      const ch = G.eventChoices().find(({ c }) => c.label.includes(label));
      if (!ch) { F(`${kind}/${twist}: ひねりの選択肢「${label}」が出ない（${G.eventChoices().map(({ c }) => c.label).join("・")}）`); continue; }
      const affBefore = S.gold;
      G.rand = () => 0.01;
      G.act("ev:" + ch.i);
      G.rand = seeded(22);
      for (let k = 0; k < 30 && S.mode === "combat"; k++) { S.combat.foes.forEach((f) => { if (f.hp > 1) f.hp = 1; }); G.act(G.actions().flatMap((g) => g.list).find((a) => !a.disabled && /^cb:/.test(a.id)).id); }
      if (S.quests.includes(q)) F(`${kind}/${twist}: 別の結末なのに依頼が残る`);
      if (!(G.P.q5 && G.P.q5.kinds[kind] && G.P.q5.kinds[kind][want] === 1)) F(`${kind}/${twist}: 記録が ${want} にならない（${JSON.stringify(G.P.q5 && G.P.q5.kinds[kind])}）`);
      void affBefore;
    }
    // 確かめずに進むと：罠は不意打ち（三人・傷を負って始まる）、嘘は報告のあとで露見して悪名
    {
      const S = newGame(G, 24);
      S.loc = "karna"; S.fame = 100;
      const q = takeKind(S, "spy", "ambush", "karna");
      S.mode = "explore"; S.fac = null;
      G.act("q5go:" + q.id);
      const hp = S.hp;
      const ch = G.eventChoices().find(({ c }) => c.label !== D.Q5.PROBE.label);
      G.act("ev:" + ch.i);
      if (S.mode !== "combat" || S.combat.foes.length !== 3 || !(S.hp < hp)) F(`罠に気づかず進んでも不意打ちにならない（${S.mode}・${S.hp}/${hp}）`);
      const S2 = newGame(G, 25);
      S2.loc = "karna"; S2.fame = 100;
      const q2 = takeKind(S2, "collect", "liar", "karna");
      S2.mode = "explore"; S2.fac = null;
      G.act("q5go:" + q2.id);
      const c2 = G.eventChoices().find(({ c }) => c.label.includes("道理を説いて"));
      G.rand = () => 0.01; G.act("ev:" + c2.i); G.rand = seeded(26);
      const inf = G.repOf("自由都市連合").inf;
      S2.mode = "fac"; S2.fac = "guild";
      G.act("guild:report:" + q2.id);
      if (!(G.repOf("自由都市連合").inf > inf)) F("見抜かずに嘘の片棒を担いでも、あとで悪名が付かない");
      // 前触れ：罠・嘘の依頼は、たいてい掲示に前触れが見える。罠は報酬が高い
      const S3 = newGame(G, 27);
      S3.fame = 100; S3.loc = "karna";
      let tw = 0, told = 0;
      for (let i = 0; i < 300; i++) { const q3 = G.q5.make(G.q5.type("spy"), S3, {}); if (["ambush", "liar", "victim"].includes(q3.twist)) { tw++; if (q3.tell) told++; } }
      if (!(tw && told / tw > 0.6)) F(`ひねりのある依頼に前触れが見えない（${told}/${tw}）`);
      if (G.q5.KNOW().length < 3) F("覚え書きの元（G.q5.KNOW）が足りない");
    }
    // 裏切ると、その国で悪名が付く
    const S = newGame(G, 31);
    S.loc = "garmund"; S.fame = 100;
    const q = takeKind(S, "bounty", "", "frost");
    if (q) {
      S.loc = "frost"; S.mode = "explore"; S.fac = null;
      G.act("q5go:" + q.id);
      const ch = G.eventChoices().find(({ c }) => c.label.includes("見逃す"));
      const inf = G.repOf("ノルディア帝国").inf, gold = S.gold;
      if (ch) G.act("ev:" + ch.i); else F("賞金首の見逃す道が無い");
      if (!(G.repOf("ノルディア帝国").inf > inf)) F("依頼人を裏切っても悪名が付かない");
      if (!(S.gold > gold)) F("裏切りの金が入らない");
      if (S.quests.includes(q)) F("裏切った依頼が残る");
    } else F("賞金首を受けられない");
  }
  {
    // 途中の出来事：横取り（ひねり rival）・期限が延びる（extend）
    const S = newGame(G, 41);
    S.loc = "karna"; S.fame = 30;
    const q = takeKind(S, "hunt", "extend");
    if (q) {
      S.day += 1; S.mode = "explore"; S.fac = null;
      const dl = q.deadline;
      G.rand = () => 0.01;
      if (!G.q5.maybeMid()) F("途中の出来事が起きない");
      G.rand = seeded(42);
      if (S.event !== "q5_scene" || !/言伝/.test(D.EVENTS.find((e) => e.id === "q5_scene").title)) F("期限のひねりの出来事にならない");
      G.act("ev:0");
      if (!(q.deadline > dl)) F("期限が延びない");
      // 期限切れ
      S.day = q.deadline + 1; S.mode = "explore";
      G.endTurn();
      if (S.quests.includes(q)) F("期限が過ぎても依頼が残る");
      if (!(G.P.q5.kinds.hunt && G.P.q5.kinds.hunt.late === 1)) F("期限切れが記録に残らない");
    } else F("討伐を受けられない");
    const S2 = newGame(G, 43);
    S2.loc = "karna"; S2.fame = 30;
    const q2 = takeKind(S2, "survey", "rival");
    if (q2) {
      S2.day += 1; S2.mode = "explore"; S2.fac = null;
      G.rand = () => 0.01;
      G.q5.maybeMid();
      G.rand = seeded(44);
      const ch = G.eventChoices().find(({ c }) => c.label.includes("山分け"));
      if (!ch) F("横取りの出来事に山分けが無い");
      else { const r = q2.reward; G.act("ev:" + ch.i); if (q2.reward !== Math.ceil(r / 2)) F("山分けで報酬が半分にならない"); }
    } else F("地図作りを受けられない");
  }
  {
    // 送り届ける依頼：着いたら場面になり、果たせる
    const S = newGame(G, 51);
    S.loc = "karna"; S.fame = 30;
    const q = takeKind(S, "escort", "", "nerva");
    if (q) {
      S.mode = "explore"; S.fac = null;
      G.arrive("nerva");
      if (S.event !== "q5_scene") F("送り先に着いても場面にならない");
      else { const c = G.eventChoices().find(({ c }) => c.label !== D.Q5.PROBE.label); G.act("ev:" + c.i); if (!q.done) F("送り届けても果たせない"); }
    } else F("護衛を受けられない");
  }

  // ---------------------------------------------------------------- 町の小さな仕事
  {
    const S = newGame(G, 61, "mage");
    S.loc = "zephara"; S.mode = "explore";
    G.act("fac:tavern");
    const work = G.actions().flatMap((g) => g.list).find((a) => a.id === "q5work");
    if (!work) F("首都エルメシアの酒場に「日雇いの仕事を探す」が無い");
    const scribe = G.q5.jobsHere(S).find((j) => j.key === "scribe");
    if (!scribe) F("学院のある町に写本の仕事が無い");
    else if (G.q5.jobBonus(scribe, S) <= G.q5.jobBonus(scribe, { cls: "merc" })) F("職業で仕事の得手が変わらない");
    const gold = S.gold;
    G.act("q5work");
    if (S.event !== "q5_job" || G.eventChoices().length < 2) F("「日雇いの仕事を探す」で仕事の一覧が出ない");
    const sub = G.actions().flatMap((g) => g.list)[0];
    if (!sub || !/%/.test(sub.sub || "")) F("仕事の一覧に判定の見込みが出ない");
    G.act("ev:0");
    if (!(S.gold > gold)) F("働いても給金が入らない");
    if (S.mode !== "explore") F(`働いたあとの mode が ${S.mode}`);
    G.act("fac:tavern");
    if (!G.actions().flatMap((g) => g.list).find((a) => a.id === "q5work").disabled) F("同じ日に何度も働ける");
    // 港町では荷運び、どの町でも何かしら仕事がある
    for (const [id, L] of Object.entries(D.LOCS)) {
      if (L.type !== "town") continue;
      S.loc = id;
      if (!G.q5.jobFac(L)) F(`${L.name}に日雇いの札を下げる施設（酒場・ギルド・宿）が無い`);
      for (let d = 0; d < 12; d++) {
        S.day = d;
        const js = G.q5.jobsHere(S);
        if (!js.length) { F(`${L.name}に町の仕事が一つも無い`); break; }
        js.forEach((j) => jobTowns.add(j.key));
      }
    }
    if (jobTowns.size < Q.JOBS.length) F(`どの町にも出ない仕事がある：${Q.JOBS.map((j) => j.key).filter((k) => !jobTowns.has(k)).join("・")}`);
    // 稼ぎすぎない：一日一回、30 日働いても 700G に届かない
    const S2 = newGame(G, 62, "merc");
    S2.loc = "nerva"; S2.mode = "explore";
    const g0 = S2.gold;
    for (let d = 0; d < 30; d++) { S2.mode = "explore"; G.act("fac:tavern"); G.act("q5work"); if (S2.event === "q5_job") G.act("ev:0"); S2.day++; }
    if (S2.gold - g0 > 700) F(`町の仕事で稼ぎすぎる：30 日で ${S2.gold - g0}G`);
  }

  // ---------------------------------------------------------------- 古いセーブ
  {
    const S = newGame(G, 71);
    delete S.q5;
    S.quests.push({ id: "q1_0_old", type: "hunt", loc: "forest", target: "goblin", need: 1, progress: 0, title: "迷いの森のゴブリン退治", desc: "ゴブリンを1体", reward: 30, fame: 4, done: false });
    S.board = { loc: S.loc, day: S.day, list: [] };
    const old = JSON.parse(JSON.stringify(S));
    G.S = old;
    try {
      G.actions();
      G.act("fac:guild");
      if (!(G.S.board && G.S.board.q5)) F("古いセーブの掲示板が新しい依頼に替わらない");
      G.endTurn();
      if (!G.S.quests.some((q) => q.id === "q1_0_old")) F("古いセーブの依頼が消えた");
      G.S.loc = "forest"; G.S.mode = "explore"; G.S.fac = null;
      G.startCombat(["goblin"], {});
      for (let k = 0; k < 30 && G.S.mode === "combat"; k++) { G.S.combat.foes.forEach((f) => { if (f.hp > 1) f.hp = 1; }); G.act(G.actions().flatMap((g) => g.list).find((a) => !a.disabled && /^cb:/.test(a.id)).id); }
      if (!G.S.quests.find((q) => q.id === "q1_0_old").done) F("古いセーブの討伐が数えられない");
      if (G.questWays(G.S).length !== 1) F("古いセーブの依頼の行き先が出ない");
    } catch (e) { F(`古いセーブで例外 ${e.stack || e}`); }
    // 依頼の途中でセーブ → 読み込み（JSON）→ 場面の続き
    const S2 = newGame(G, 72);
    S2.loc = "karna"; S2.fame = 50;
    const q = takeKind(S2, "festival", "", "karna");
    S2.mode = "explore"; S2.fac = null;
    G.act("q5go:" + q.id);
    G.S = JSON.parse(JSON.stringify(S2));
    const ch = G.eventChoices();
    if (!ch.length || ch[0].c.label === "その場を離れる") F("読み込んだあと、依頼の場面の選択肢が戻らない");
    else G.act("ev:" + ch[0].i);
  }

  // ---------------------------------------------------------------- 依頼を多めに受けて遊ぶ（止まらない）
  {
    let steps = 0, took = 0, done = 0, mids = 0;
    for (let g = 0; g < 16; g++) {
      const S = newGame(G, 800 + g, Object.keys(D.CLASSES)[g % 5]);
      S.maxHp = S.hp = 120;
      if (g % 2) S.fame = 120;
      try {
        for (let step = 0; step < 260 && !G.S.over; step++) {
          const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
          if (!acts.length) { F(`q5 game ${g}: できる行動が無い（${G.S.mode}）`); break; }
          const pref = acts.filter((a) => /^(q5go|q5work|guild:|fac:guild|fac:tavern)/.test(a.id));
          const a = pref.length && G.rand() < 0.45 ? pref[Math.floor(G.rand() * pref.length)] : acts[Math.floor(G.rand() * acts.length)];
          if (/^guild:take/.test(a.id)) took++;
          const wasMid = G.S.q5 && G.S.q5.cur && G.S.q5.cur.sc === "mid" && G.S.event === "q5_scene";
          G.act(a.id);
          if (!wasMid && G.S.event === "q5_scene" && G.S.q5.cur && G.S.q5.cur.sc === "mid") mids++;
          steps++;
          const s = G.S;
          if (s.gold < 0 || !Number.isFinite(s.gold)) F(`q5 game ${g}: 所持金が変 ${s.gold}（${a.id}）`);
          if (!["explore", "fac", "event", "combat", "over"].includes(s.mode)) F(`q5 game ${g}: mode が変 ${s.mode}`);
          if (s.mode === "event" && s.event === "q5_scene" && !G.eventChoices().length) F(`q5 game ${g}: 場面に選択肢が無い`);
          if ((s.quests || []).length > 3) F(`q5 game ${g}: 依頼が 3 件を超えた`);
          if (failures > 20) throw new Error("失敗が多すぎる");
        }
      } catch (e) { F(`q5 game ${g}: 例外 ${e.stack || e}`); break; }
      done += Object.values((G.S.q5 && G.S.q5.res) || {}).reduce((a, n) => a + n, 0);
    }
    if (!took || !done || !mids) F(`依頼を受けて遊んでも、受ける ${took}・終わる ${done}・途中の出来事 ${mids} のどれかが 0`);
    if (!failures) ok(`Q5 依頼（型 ${Q.TYPES.length}・作った依頼 ${made}・組み立てた場面 ${scenes}・仕事 ${Q.JOBS.length}・遊んで受けた ${took}・終わった ${done}・途中の出来事 ${mids}・${steps} 手）`);
    if (!failures) examples.forEach((e) => console.log("NOTE " + e));
  }
};
