// Q5：ギルドの依頼を組み合わせで作る（型×依頼人×場所×相手×期限×ひねり）・依頼の途中の出来事・町の小さな仕事・依頼の記録。
// explore.js は書き換えず、G.exploreAct・G.exploreActions・G.facActions・G.arrive・G.apply・G.endTurn・G.questWays を包む。
// 文と数は src/data/quests_q5.js（D.Q5）。DOM には触らない（画面は src/ui/q5_quests.js）。
//
// 依頼（S.quests の一件）に足す項目。今までの依頼（q5 の無いもの）は今まで通りに動く：
//   q5: 1, kind: 型の key, type: hunt | delve | deliver | q5scene（その場所で取りかかる）| q5escort（依頼人を送り届ける）
//   client { name, short, id?（名のある人）, kind, sex }, v: 文の差し込み, from: 受けた町, nation: 受けた国, dur: 期限の日数
//   deadline: 期限の日（受けたときに決まる）, twist: ひねり, tw: ひねりの出来事が済んだ, mids: 途中の出来事の回数, item: 報酬の品
// セーブに足すもの（古いセーブで無くても動く。G.q5State が埋める）：
//   S.q5 = { cur: 今の場面 { qid, sc: "climax" | "mid", key, t }, jobDay: 最後に働いた日, talk: あなたの噂, res: 結果の数, log: この冒険の記録 }
// 冒険をまたいで残るもの：G.P.q5 = { kinds: { 型: { 結果: 回数 } }, log: [{ by, date, title, kind, r, client, place }] }（図鑑の「依頼」）
// レーン F（Q5）
(function (G) {
  const D = G.data;
  const Q = D.Q5;
  const Q5 = (G.q5 = G.q5 || {});

  // ---------------------------------------------------------------- 状態
  G.q5State = (S) => {
    S = S || G.S;
    if (!S.q5 || typeof S.q5 !== "object") S.q5 = {};
    const st = S.q5;
    if (!Array.isArray(st.talk)) st.talk = [];
    if (!st.res || typeof st.res !== "object") st.res = {};
    if (!Array.isArray(st.log)) st.log = [];
    return st;
  };
  Q5.fill = (s, v) => String(s == null ? "" : s).replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? String(v[k]) : m));
  const fill = Q5.fill;
  Q5.type = (key) => Q.TYPES.find((t) => t.key === key) || null;
  const find = (qid) => ((G.S && G.S.quests) || []).find((q) => q.id === qid) || null;
  const MECH = { hunt: "hunt", delve: "delve", deliver: "deliver", scene: "q5scene", escort: "q5escort" };
  Q5.mechOf = (q) => { const t = Q5.type(q.kind); return t ? t.mech : q.type; };
  Q5.RES = { ok: "果たした", fail: "しくじった", lost: "横取りされた", late: "期限切れ", betray: "依頼人を裏切った", ally: "相手と手を組んだ", expose: "依頼人の嘘を暴いた", trap: "罠を切り抜けた" };

  // ---------------------------------------------------------------- 道のり（陸路と船。日数の少ない道）
  const edges = (id) => {
    const L = D.LOCS[id] || {};
    const e = Object.assign({}, L.links || {});
    Object.entries(L.sea || {}).forEach(([k, s]) => { if (e[k] == null || s.days < e[k]) e[k] = s.days; });
    return e;
  };
  Q5.distFrom = (from) => {
    const dist = { [from]: 0 };
    const done = new Set();
    for (;;) {
      let cur = null;
      for (const k in dist) if (!done.has(k) && (cur === null || dist[k] < dist[cur])) cur = k;
      if (cur === null) return dist;
      done.add(cur);
      for (const [n, d] of Object.entries(edges(cur))) {
        if (!D.LOCS[n]) continue;
        const nd = dist[cur] + d;
        if (dist[n] == null || nd < dist[n]) dist[n] = nd;
      }
    }
  };

  const wpick = (arr, wf) => {
    const ws = arr.map(wf);
    const tot = ws.reduce((a, b) => a + b, 0);
    if (!(tot > 0)) return null;
    let r = G.rand() * tot;
    for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  };

  // 名のある人（会ったことがあり、仲間でも、いなくなってもいない人）
  const knownHere = (loc) => (Q.TOWN_PEOPLE[loc] || []).filter(([id]) => G.f3 && G.f3.has && G.f3.has(id) && G.affKnown && G.affKnown(id)
    && !(G.c2Gone && G.c2Gone(id)) && !(G.c2Has && G.c2Has(id)));
  const personName = (id) => (G.f3 && G.f3.name ? G.f3.name(id) : ((D.C2_PEOPLE || {})[id] || {}).name || id);

  // ---------------------------------------------------------------- 依頼人
  Q5.makeClient = (t, loc) => {
    const named = knownHere(loc).filter(([, kinds]) => kinds.includes(t.key));
    if (named.length && G.rand() < 0.35) {
      const [id] = G.pick(named);
      const nm = personName(id);
      return { id, name: nm, short: nm, kind: "villager" };
    }
    const role = G.pick(t.roles);
    const C = Q.CLIENTS[role];
    const sex = C.sex || (G.rand() < 0.5 ? "男" : "女");
    const nm = G.pick(Q.NAMES[sex]);
    return { role, name: `${C.role}の${nm}`, short: nm, kind: C.kind, sex };
  };

  // ---------------------------------------------------------------- 依頼を一件つくる
  const TOWN_FOE = { pest: ["e1_tollrat", "goblin"], def: ["bandit"] };
  Q5.make = (t, S, o) => {
    o = o || {};
    const here = S.loc;
    const dist = o.dist || Q5.distFrom(here);
    const maxDanger = o.maxDanger || G.clamp(1 + Math.floor(S.fame / 40), 1, 5);
    const qid = "q5_" + S.day + "_" + (o.i || 0) + "_" + Math.floor(G.rand() * 1e5);
    let at = t.at;
    if (at === "townAny") at = G.rand() < 0.5 ? "here" : "town2";
    const fightable = (L) => (L.pool || []).some((f) => D.ENEMIES[f] && !D.ENEMIES[f].boss);
    let loc;
    if (at === "here") loc = here;
    else {
      const tps = at === "town2" ? ["town"] : at === "wild" ? ["wild"] : at === "dungeon" ? ["dungeon"] : ["wild", "dungeon"];
      const max = at === "town2" ? 9 : 14;
      const cand = Object.keys(D.LOCS).filter((k) => {
        const L = D.LOCS[k];
        if (!tps.includes(L.type) || k === here || dist[k] == null || dist[k] > max) return false;
        if (L.type === "town") return true;
        if (L.type === "dungeon" && !(L.floors > 1)) return false;
        return (L.danger || 0) <= maxDanger && fightable(L);
      });
      if (!cand.length) return null;
      loc = wpick(cand, (k) => (at === "town2" ? 1 / (1 + dist[k]) : 1 / (1 + dist[k] / 3)));
    }
    const L = D.LOCS[loc];
    const danger = Math.max(1, L.danger || 1);
    const days = dist[loc] || 0;
    // 相手の魔物
    const pool = (L.pool || []).filter((id) => D.ENEMIES[id] && !D.ENEMIES[id].boss);
    let foe;
    if (pool.length) foe = t.big ? pool.slice().sort((a, b) => (D.ENEMIES[b].tier || 0) - (D.ENEMIES[a].tier || 0))[0] : G.pick(pool);
    else foe = (TOWN_FOE[t.key] || TOWN_FOE.def).find((id) => D.ENEMIES[id]) || "bandit";
    // 数（倒す数・潜る階）
    let need = 0;
    if (t.mech === "hunt") need = t.big ? 1 : G.d(2);
    if (L.type === "dungeon" && (t.mech === "delve" || t.mech === "scene")) need = t.mech === "delve" ? Math.min(L.floors - 1, 1 + G.d(2)) : t.key === "relic" ? Math.max(1, Math.min(L.floors - 1, G.d(3))) : 1;
    const client = Q5.makeClient(t, here);
    const P = Q.PARTS;
    const nameOf = (sex) => { const all = Q.NAMES[sex || (G.rand() < 0.5 ? "男" : "女")].filter((x) => x !== client.short); return G.pick(all); };
    const anyName = () => nameOf("");
    const [rel, rsex] = G.pick(P.who);
    const v = {
      town: D.LOCS[here].name, place: L.name, foe: D.ENEMIES[foe].name, n: need || 1, client: client.name, cl: client.short,
      thing: G.pick(P.thing), herb: G.pick(P.herb), who: `${rel}の${nameOf(rsex)}`, outlaw: G.pick(P.outlaw) + nameOf("男"),
      debtor: G.pick(P.debtor) + anyName(), mark: G.pick(P.mark) + anyName(), rival: G.pick(P.rival), days: 3 + G.d(3),
    };
    // 横取りに来る者：ヴァレンツァの冒険者の一団の頭（C2 のヴィットリオ）に会っていれば、ときどき
    if (G.f3 && G.f3.has && G.f3.has("vittorio") && G.affKnown && G.affKnown("vittorio") && G.rand() < 0.4) { v.rival = `${personName("vittorio")}の一団`; v.rivalId = "vittorio"; }
    // ひねり（その型の文があるものだけ）
    const tws = (t.twists || []).filter((x) => (x !== "liar" || t.lie) && (x !== "victim" || t.victim));
    const twist = tws.length && G.rand() < 0.4 ? G.pick(tws) : "";
    // 前触れ（ひねりのある依頼はたいてい見える。無い依頼にも、ときどき紛れる）
    const TW = Q.TWISTS;
    let tell = "";
    if (TW[twist] && TW[twist].tells) { if (G.rand() < 0.8) tell = G.pick(TW[twist].tells); }
    else if (twist === "rival") { if (G.rand() < 0.7) tell = G.pick(Q.RIVAL_TELLS); }
    else if (G.rand() < 0.12) tell = G.pick(Object.values(TW).flatMap((x) => x.tells || []));
    // 報酬・名声・期限
    let reward;
    if (t.mech === "hunt") reward = (t.pay[0] + t.pay[1] * danger + G.d(15)) * Math.max(1, need);
    else if (L.type === "town") reward = t.pay[0] + t.pay[1] * days + G.d(20);
    else reward = t.pay[0] + t.pay[1] * danger + G.d(20);
    if (twist === "ambush") reward = Math.round(reward * 1.3); // 罠の依頼は、相場より妙に高い
    const fame = L.type === "town" ? 2 + ((t.fame || 0) >= 20 ? 3 : 1) : 1 + 3 * danger + ((t.fame || 0) >= 20 ? 2 : 0);
    const dur = Math.max(3, t.days + days * 2);
    let item = "";
    if (danger >= 2 && L.type !== "town" && G.rand() < 0.18) {
      const goods = Object.keys(D.ITEMS).filter((id) => /^i(1|3[a-z]?)_/.test(id) && ["weapon", "armor", "ring"].includes(D.ITEMS[id].type) && D.ITEMS[id].price >= 30 && D.ITEMS[id].price <= 90 * danger);
      if (goods.length) item = G.pick(goods);
    }
    const q = {
      id: qid, q5: 1, kind: t.key, type: MECH[t.mech], loc, title: fill(G.pick(t.title), v), desc: fill(t.desc, v),
      reward, fame, dur, twist, client, v, from: here, nation: G.nationOf(here) || "", foe, mids: 0,
    };
    if (item) q.item = item;
    if (tell) q.tell = tell;
    if (need) q.need = need;
    if (t.mech === "hunt") Object.assign(q, { target: foe, progress: 0 });
    return q;
  };

  // ---------------------------------------------------------------- 掲示板（国ごとの傾向・名声と評判で増える）
  Q5.boardSize = (S) => {
    const n = G.nationOf(S.loc);
    const rep = n && S.repute && S.repute[n] ? S.repute[n].rep : 0;
    return 3 + (rep >= 15 ? 1 : 0) + (S.fame >= 150 ? 1 : 0);
  };
  Q5.board = (S) => {
    const L = D.LOCS[S.loc];
    const n = G.nationOf(S.loc);
    const rep = n && S.repute && S.repute[n] ? S.repute[n].rep : 0;
    const bias = Q.NATION_BIAS[L.nation || L.region] || {};
    const types = Q.TYPES.filter((t) => S.fame >= (t.fame || 0) && rep >= (t.rep || 0));
    const size = Q5.boardSize(S);
    const dist = Q5.distFrom(S.loc);
    const maxDanger = G.clamp(1 + Math.floor(S.fame / 40), 1, 5);
    const list = [], used = {};
    for (let tries = 0; list.length < size && tries < size * 4; tries++) {
      const t = wpick(types, (x) => x.w * (bias[x.key] || 1) / (1 + 3 * (used[x.key] || 0)));
      if (!t) break;
      const q = Q5.make(t, S, { dist, maxDanger, i: list.length });
      if (!q) continue;
      used[t.key] = (used[t.key] || 0) + 1;
      list.push(q);
    }
    return { loc: S.loc, day: S.day, list, q5: 1 };
  };

  // ---------------------------------------------------------------- 場面（取りかかる・途中の出来事）の中身
  const foesOf = (spec, q) => {
    if (spec === "@foe") return [q.foe];
    if (spec === "@foe2") return [q.foe, q.foe];
    return (Array.isArray(spec) ? spec : [spec]).filter((id) => D.ENEMIES[id]);
  };
  const EXTRA = ["then", "payR", "rival", "cut", "extendBy", "pkg"];
  const outOf = (x, q) => {
    if (!x) return x;
    const o = {};
    Object.entries(x).forEach(([k, val]) => {
      if (EXTRA.includes(k)) return;
      if (k === "text" || k === "memo" || k === "chron") o[k] = fill(val, q.v);
      else if (k === "q5") o.q5 = null;
      else if (k === "fight") o.fight = foesOf(val, q);
      else if (k === "win") o.win = outOf(val, q);
      else o[k] = val;
    });
    if (x.q5 || x.payR || x.pkg || x.rival) {
      const z = { r: x.q5 || "keep", qid: q.id };
      EXTRA.forEach((k) => { if (x[k] !== undefined) z[k] = x[k]; });
      o.q5 = z;
    } else delete o.q5;
    return o;
  };
  const choiceOf = (c, q) => {
    const o = { label: fill(c.label, q.v) };
    if (c.stat) { o.stat = c.stat; o.diff = c.diff || "普通"; }
    if (c.bonus) o.bonus = c.bonus;
    if (c.cost) o.cost = c.cost;
    if (c.cond === "herb") o.cond = () => G.count("herb") > 0;
    if (c.fight) { o.fight = foesOf(c.fight, q); o.win = outOf(c.win || {}, q); if (c.firstStrike) o.firstStrike = true; }
    if (c.ok) o.ok = outOf(c.ok, q);
    if (c.ng) o.ng = outOf(c.ng, q);
    return o;
  };
  const clientWho = (q) => {
    const c = q.client || {};
    const P = c.id && ((D.C2_PEOPLE || {})[c.id] || (D.F2_PEOPLE || {})[c.id]);
    if (P && P.who) return Object.assign({}, P.who, { name: c.name });
    return { kind: c.kind || "villager", sex: c.sex, seed: "q5:" + q.id, name: c.name };
  };
  const SCENE_WHO = { bounty: "rogue", collect: "villager", spy: "merchant", duel: "knight", missing: "villager" };
  Q5.scene = (q, cur) => {
    const t = Q5.type(q.kind);
    if (cur.sc === "mid") {
      const m = Q.MIDS.find((x) => x.key === cur.key);
      if (!m) return null;
      const who = m.who === "@client" ? clientWho(q) : m.who ? Object.assign({ seed: `q5:${q.id}:${m.key}` }, m.who) : null;
      return { title: m.title, text: fill(m.text[(cur.t || 0) % m.text.length], q.v), choices: m.choices.map((c) => choiceOf(c, q)), who };
    }
    const sc = Q.CLIMAX[q.kind];
    if (!sc || !t) return null;
    let text = fill(sc.text[(cur.t || 0) % sc.text.length], q.v);
    let choices = sc.choices.map((c) => choiceOf(c, q));
    const big = ["liar", "victim", "ambush"].includes(q.twist);
    if (big && q.revealed) {
      // 先に確かめて、見抜いた
      const tw = Q.TWISTS[q.twist];
      if (q.twist === "liar") text += fill(t.lie, q.v);
      else if (q.twist === "victim") text += fill(t.victim, q.v);
      else text += fill(tw.reveal[(cur.t || 0) % tw.reveal.length], q.v);
      choices = tw.choices.map((c) => choiceOf(c, q));
    } else {
      // 罠に気づかないまま進むと、どの手を選んでも不意打ちになる
      if (q.twist === "ambush") {
        const A = Q.TWISTS.ambush;
        const sprung = { text: A.sprung[(cur.t || 0) % A.sprung.length], hp: -4, memo: A.know.text, fight: ["bandit", "bandit", "bandit"], win: A.choices[0].win };
        choices = sc.choices.map((c) => ({ label: fill(c.label, q.v), ok: outOf(sprung, q) }));
      }
      // 話の裏と物陰を確かめる（ひねりの起こりうる型だけ。一度きり）
      const t2 = Q5.type(q.kind);
      if (!q.probed && t2 && (t2.twists || []).some((x) => ["liar", "victim", "ambush"].includes(x))) {
        choices = [{ label: Q.PROBE.label, stat: "知力", diff: "普通", ok: { q5: { r: "probe", qid: q.id } }, ng: { q5: { r: "probefail", qid: q.id } } }, ...choices];
      }
    }
    const wk = SCENE_WHO[q.kind];
    const who = wk && !(q.twist === "liar" && q.revealed) ? { kind: wk, seed: `q5:${q.id}:${q.kind}` } : clientWho(q);
    return { title: q.title, text, choices, who };
  };

  // 出来事の殻（中身は今の場面から読む。乱数は使わない）
  const LEAVE = { label: "その場を離れる", ok: { text: "あなたは、その場を離れた。" } };
  const curScene = () => {
    const S = G.S;
    const cur = S && S.q5 && S.q5.cur;
    const q = cur && find(cur.qid);
    if (!q) return null;
    try { return Q5.scene(q, cur); } catch (e) { return null; }
  };
  const shell = { id: "q5_scene", where: [], w: 0, q5: true };
  Object.defineProperty(shell, "title", { get: () => { const s = curScene(); return s ? s.title : "依頼"; }, enumerable: true });
  Object.defineProperty(shell, "text", { get: () => { const s = curScene(); return s ? s.text : "依頼の話は、もう済んだようだ。"; }, enumerable: true });
  Object.defineProperty(shell, "choices", { get: () => { const s = curScene(); return s && s.choices.length ? s.choices : [LEAVE]; }, enumerable: true });
  Object.defineProperty(shell, "who", { get: () => { const s = curScene(); return s ? s.who : null; }, enumerable: true });
  D.EVENTS.push(shell);
  // 町の仕事の一覧（選ぶと半日働く）
  const jobChoices = () => {
    const S = G.S;
    if (!S) return [LEAVE];
    return [...Q5.jobsHere(S).map((j) => ({ label: j.name, ok: { q5job: j.key } })), { label: "やめておく", ok: { text: "今日のところは、やめておいた。" } }];
  };
  const jobShell = { id: "q5_job", where: [], w: 0, q5: true, title: "町の仕事", who: { kind: "host", seed: "q5:job" } };
  Object.defineProperty(jobShell, "text", { get: () => { const S = G.S; const L = S && D.LOCS[S.loc]; const f = L && Q5.jobFac(L); return `${f ? G.FAC_NAMES[f] : "町"}の柱に、日雇いの札が何枚か下がっている。どれも半日の仕事で、給金はその日のうちに払われる。`; }, enumerable: true });
  Object.defineProperty(jobShell, "choices", { get: jobChoices, enumerable: true });
  D.EVENTS.push(jobShell);
  // 仕事の一覧に、判定と給金の見込みを添える（core.js の G.actions は stat・cost しか書かない）
  const actions0 = G.actions;
  G.actions = () => {
    const groups = actions0();
    const S = G.S;
    if (!S || S.mode !== "event" || S.event !== "q5_job") return groups;
    const jobs = Q5.jobsHere(S);
    groups.forEach((g) => { g.title = "どの仕事をする？"; g.list.forEach((a) => {
      const j = jobs[Number(String(a.id).split(":")[1])];
      if (j) a.sub = `${j.stat} ${G.chance(j.stat, j.diff || "普通", Q5.jobBonus(j, S))}%・${j.pay[0]}〜${j.pay[1] + 4}G${j.herb ? "・薬草" : ""}${Q5.jobBonus(j, S) ? "・得手" : ""}`;
    }); });
    return groups;
  };

  // ---------------------------------------------------------------- 取りかかる
  Q5.begin = (qid, quiet) => {
    const S = G.S;
    const q = find(qid);
    if (!q || q.done) return false;
    const st = G.q5State(S);
    if (!quiet) { G.log("you", `取りかかる：${q.title}`); G.pass(1); }
    if (q.kind === "smuggle" && !G.count("package")) {
      G.say("渡すはずの荷が、もう手もとに無い。受け取り手は、黙って背を向けた。");
      Q5.end(q, "fail", { pkg: true });
      return true;
    }
    st.cur = { qid: q.id, sc: "climax", t: Math.floor(G.rand() * 2) };
    return G.startEvent("q5_scene");
  };
  // その場で取りかかれる依頼（迷宮は決まった階まで潜ってから）
  Q5.ready = (S) => (S.quests || []).filter((q) => q.q5 && !q.done && q.type === "q5scene" && q.loc === S.loc && (G.loc().type !== "dungeon" || S.depth >= (q.need || 1)));

  // ---------------------------------------------------------------- 途中の出来事
  const fits = (m, q) => {
    if (m.twist) return q.twist === m.twist && !q.tw;
    const mech = Q5.mechOf(q);
    if (!m.mech && !m.kinds) return true;
    return !!((m.mech && m.mech.includes(mech)) || (m.kinds && m.kinds.includes(q.kind)));
  };
  Q5.midsFor = (q) => Q.MIDS.filter((m) => fits(m, q) && (m.key !== "peek" || G.count("package") > 0));
  Q5.maybeMid = () => {
    const S = G.S;
    if (!S || S.over || S.mode !== "explore") return false;
    const qs = (S.quests || []).filter((q) => q.q5 && !q.done && (q.mids || 0) < 2 && q.takenDay != null && S.day > q.takenDay);
    if (!qs.length) return false;
    const q = G.pick(qs);
    const twistMid = q.twist && !q.tw && Q.MIDS.some((m) => m.twist === q.twist);
    if (G.rand() >= (twistMid ? 0.22 : 0.08)) return false;
    const pool = Q5.midsFor(q).filter((m) => !twistMid || m.twist);
    const m = wpick(pool, (x) => x.w || 1);
    if (!m) return false;
    q.mids = (q.mids || 0) + 1;
    if (m.twist) q.tw = true;
    G.q5State(S).cur = { qid: q.id, sc: "mid", key: m.key, t: Math.floor(G.rand() * m.text.length) };
    return G.startEvent("q5_scene");
  };

  // ---------------------------------------------------------------- 結果
  const repDown = (n, v) => { const S = G.S; if (n && S.repute && S.repute[n]) S.repute[n].rep = Math.max(0, S.repute[n].rep - v); };
  const repUp = (n, v) => { if (n && G.repOf) G.repOf(n).rep += v; };
  const affTo = (q, n) => { const id = q.client && q.client.id; if (id && G.affAdd) G.affAdd(id, n); };
  // 覚え書きの元（L1 が冒険をまたいで拾う）。この冒険で知ったものは S.q5.know に印
  Q5.KNOW = () => Object.values(Q.TWISTS).map((t) => t.know).filter(Boolean);
  Q5.learn = (k) => {
    if (!k) return;
    G.memo(k.text);
    const st = G.q5State(G.S);
    (st.know || (st.know = {}))[k.id] = true;
  };
  Q5.resolve = (qid, r, x) => {
    const S = G.S;
    const q = find(qid);
    if (!q) return;
    x = x || {};
    if (x.rival && q.v && q.v.rivalId && G.affAdd) G.affAdd(q.v.rivalId, x.rival === "share" ? 5 : -5);
    switch (r) {
      case "ok":
        if (!q.done) { q.done = true; G.note(`依頼「${q.title}」を果たした。ギルドに報告しよう。`); }
        break;
      case "half":
        q.reward = Math.max(1, Math.ceil(q.reward / 2));
        G.note(`依頼「${q.title}」の報酬が ${q.reward}G に減った。`);
        break;
      case "bonus": {
        const add = Math.max(5, Math.round(q.reward * 0.3));
        q.reward += add;
        if (x.extendBy && q.deadline) q.deadline += x.extendBy;
        G.note(`依頼「${q.title}」の報酬 +${add}G（${q.reward}G）`);
        break;
      }
      case "extend": {
        const n = Number(q.v && q.v.days) || 5;
        q.deadline = (q.deadline || S.day) + n;
        if (x.cut) q.reward = Math.max(1, Math.round(q.reward * (1 - x.cut)));
        G.note(`依頼「${q.title}」の期限が ${n} 日延びた（報酬 ${q.reward}G）。`);
        break;
      }
      case "progress":
        if (q.type === "hunt" && !q.done) {
          q.progress = (q.progress || 0) + 1;
          if (q.progress >= q.need) { q.done = true; G.note(`依頼「${q.title}」を達成した。ギルドに報告しよう。`); }
          else G.note(`依頼「${q.title}」（${q.progress}/${q.need}）`);
        }
        break;
      case "keep": break;
      case "probe":
      case "probefail": {
        q.probed = true;
        G.pass(1);
        const big = ["liar", "victim", "ambush"].includes(q.twist);
        if (r === "probe" && big) {
          q.revealed = true;
          G.say(fill(Q.PROBE[q.twist], q.v));
          Q5.learn(Q.TWISTS[q.twist].know);
        } else if (r === "probefail" && q.twist === "ambush") {
          // 確かめそこねた。罠はそのまま口を開ける
          const A = Q.TWISTS.ambush;
          G.apply(outOf({ text: A.sprung[0], hp: -4, memo: A.know.text, fight: ["bandit", "bandit", "bandit"], win: A.choices[0].win }, q));
          return;
        } else G.say(fill(r === "probe" ? Q.PROBE.none : Q.PROBE.miss, q.v));
        if (!S.over) Q5.begin(q.id, true);
        break;
      }
      default: Q5.end(q, r, x);
    }
  };

  // 依頼が報告を待たずに終わる（しくじり・期限切れ・横取り・裏切り・手を組む・嘘を暴く・罠）
  Q5.end = (q, r, x) => {
    const S = G.S;
    x = x || {};
    const i = S.quests.indexOf(q);
    if (i >= 0) S.quests.splice(i, 1);
    const st = G.q5State(S);
    if (st.cur && st.cur.qid === q.id) st.cur = null;
    if ((q.type === "deliver" || q.kind === "smuggle") && !x.pkg) G.take("package");
    const n = q.nation;
    if (r === "fail" || r === "lost" || r === "late") {
      G.note(r === "late" ? `依頼「${q.title}」の期限が過ぎた。` : r === "lost" ? `依頼「${q.title}」は、ほかの者に持っていかれた。` : `依頼「${q.title}」はしくじった。`);
      if (S.fame > 0) G.addFame(-1);
      repDown(n, 2);
      affTo(q, -6);
    } else if (r === "betray") {
      G.note(`依頼「${q.title}」は、もう誰の仕事でもない。`);
      if (n) G.addInfamy(3, n);
      S.sin = (S.sin || 0) + 1;
      affTo(q, -25);
      G.chron(`${q.v.town}で受けた依頼の依頼人、${q.client.name}を裏切る`, "event");
    } else if (r === "ally") {
      affTo(q, -12);
      G.addFame(1);
      G.chron(`依頼「${q.title}」で、相手の側に立つ`, "event");
    } else if (r === "expose") {
      const g = Math.round(q.reward / 3);
      S.gold += g;
      G.note(`ギルドからの心付け +${g}G`);
      G.addFame(2);
      repUp(n, 2);
      affTo(q, -20);
    } else if (r === "trap") {
      G.addFame(2);
      G.chron("仕組まれた依頼の罠を切り抜ける", "event");
    }
    Q5.record(q, r);
  };

  // ギルドで報告したとき
  Q5.reported = (q) => {
    if (q.item && D.ITEMS[q.item] && G.give(q.item)) G.note(`報酬の品：${D.ITEMS[q.item].name}を受け取った。`);
    affTo(q, 8);
    repUp(q.nation, 2);
    if (q.kind === "bounty") G.chron(`賞金首の${q.v.outlaw}をギルドに引き渡す`, "event");
    if (q.client && q.client.id) G.say(`帳場に、${q.client.name}からの言付けが添えてあった。「助かりました」とだけ。`);
    // 見抜かずに片づけた嘘と、聞かずに済ませた相手の言い分は、あとから知れる
    if ((q.twist === "liar" || q.twist === "victim") && !q.revealed) {
      const tw = Q.TWISTS[q.twist];
      G.say(fill(tw.after, q.v));
      if (q.twist === "liar" && q.nation) G.addInfamy(2, q.nation);
      Q5.learn(tw.know);
    }
    Q5.record(q, "ok");
  };

  // 記録（この冒険と、冒険をまたいだ図鑑）と、酒場で流れるあなたの噂
  const TALK = {
    ok: ["「{town}の{client}の頼みを片づけたのは、{me}って{cls}らしいよ」", "「{place}の件、{me}がやったんだってさ。若いのに、まあまあやる」"],
    betray: ["「{cl}の依頼を受けた{cls}が、途中で寝返ったんだと。名前は{me}」", "「{me}には仕事を回すなって、{town}の帳場で言ってたよ」"],
    ally: ["「{place}の件、受けた冒険者が相手の側についたってさ。{cl}がかんかんだ」"],
    fail: ["「{cl}の頼み、引き受けた奴が投げ出したらしい」"], late: ["「{cl}が、頼んだ冒険者が戻らないってこぼしてた」"], lost: ["「{place}の仕事、ほかの連中に先を越された間抜けがいるんだと」"],
    expose: ["「{cl}が、ギルドの帳面から名を消されたってさ。嘘の依頼を出したとかで」"],
    trap: ["「罠の依頼に呼び出された冒険者が、逆に相手を叩きのめしたって。{me}とかいう」"],
  };
  Q5.record = (q, r) => {
    const S = G.S;
    const st = G.q5State(S);
    st.res[r] = (st.res[r] || 0) + 1;
    st.log.push({ day: S.day, title: q.title, kind: q.kind, r });
    if (st.log.length > 30) st.log.shift();
    const lines = TALK[r];
    if (lines) {
      st.talk.push(fill(G.pick(lines), Object.assign({}, q.v, { me: S.profile.name, cls: S.clsName || "冒険者" })));
      if (st.talk.length > 6) st.talk.shift();
    }
    if (!G.P) G.P = { trophies: {}, graves: [] };
    const R = G.P.q5 && typeof G.P.q5 === "object" ? G.P.q5 : (G.P.q5 = {});
    if (!R.kinds) R.kinds = {};
    if (!Array.isArray(R.log)) R.log = [];
    const k = R.kinds[q.kind] || (R.kinds[q.kind] = {});
    k[r] = (k[r] || 0) + 1;
    R.log.unshift({ by: `${S.clsName || ""} ${S.profile.name || ""}`.trim(), date: G.date(), title: q.title, kind: q.kind, r, client: q.client.name, place: q.v.place });
    if (R.log.length > 40) R.log.length = 40;
    if (G.onProfile) try { G.onProfile(); } catch (e) { /* 画面の保存の失敗は遊びを止めない */ }
  };
  Q5.daysLeft = (q, S) => (q.deadline ? q.deadline - (S || G.S).day : null);
  // 画面に出す一言（期限・依頼人）
  Q5.brief = (q, S) => {
    if (!q || !q.q5) return "";
    const left = Q5.daysLeft(q, S);
    const t = Q5.type(q.kind);
    const parts = [t ? t.name : ""];
    if (q.done) parts.push("報告を待つ");
    else if (left != null) parts.push(left > 0 ? `期限まであと${left}日` : "期限は今日まで");
    parts.push(`依頼人 ${q.client.name}`);
    if (q.tell && !q.done && !q.revealed) parts.push(q.tell);
    if (q.reward) parts.push(`${q.reward}G${q.item ? "＋品" : ""}`);
    return parts.filter(Boolean).join("・");
  };

  // ---------------------------------------------------------------- 町の小さな仕事
  const jobOk = (j, L, id) => {
    const n = j.need || {};
    if (n.loc && n.loc.includes(id)) return true;
    if (n.fac && [].concat(n.fac).some((f) => (L.fac || []).includes(f))) return true;
    if (n.sea && L.sea && Object.keys(L.sea).length) return true;
    if (n.wild && Object.keys(L.links || {}).some((k) => D.LOCS[k] && D.LOCS[k].type === "wild" && (D.LOCS[k].danger || 0) <= 2)) return true;
    return false;
  };
  Q5.jobsHere = (S) => {
    const L = D.LOCS[S.loc];
    if (!L || L.type !== "town") return [];
    const all = Q.JOBS.filter((j) => jobOk(j, L, S.loc));
    if (all.length <= 3) return all;
    const s = S.day % all.length; // 日によって入れ替わる（乱数は使わない）
    return [0, 1, 2].map((i) => all[(s + i) % all.length]);
  };
  Q5.jobBonus = (j, S) => ((j.cls || {})[S.cls] || 0);
  Q5.work = (key) => {
    const S = G.S;
    const j = Q.JOBS.find((x) => x.key === key);
    if (!j) return;
    const st = G.q5State(S);
    st.jobDay = S.day;
    G.pass(2);
    const bonus = Q5.jobBonus(j, S);
    const r = G.check(j.stat, j.diff || "普通", j.name, bonus);
    const pay = r.ok ? j.pay[1] + Math.floor((S.stats[j.stat] || 0) / 25) + (bonus ? 1 : 0) + (r.crit ? 3 : 0) : j.pay[0];
    S.gold += pay;
    G.say(G.pick(r.ok ? j.ok : j.ng));
    G.note(`給金 +${pay}G`);
    if (j.herb && r.ok) { G.give("herb"); G.note("薬草を手に入れた。"); }
    st.jobs = (st.jobs || 0) + 1;
    // 仕事場での出会いと噂
    const roll = G.rand();
    const people = knownHere(S.loc);
    if (roll < 0.25 && people.length) {
      const [id] = G.pick(people);
      G.say(`仕事の合間に、${personName(id)}が顔を出した。短く言葉を交わして、また手を動かした。`);
      if (G.affAdd) G.affAdd(id, 3);
    } else if (roll < 0.6 && (D.RUMORS || []).length) {
      const rr = G.pick(D.RUMORS);
      G.say(`${G.pick(Q.COWORKERS)}が、手を休めずに言った。「${rr}」`);
      G.memo("噂：" + rr);
    }
  };

  // ---------------------------------------------------------------- 行動の一覧
  const exploreActions0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = exploreActions0();
    const S = G.S;
    const st = G.q5State(S);
    const ready = Q5.ready(S);
    if (ready.length) {
      const list = ready.map((q) => {
        const t = Q5.type(q.kind);
        const left = Q5.daysLeft(q, S);
        return { id: "q5go:" + q.id, label: `取りかかる：${q.title}`, sub: [t && t.name, left != null ? `あと${Math.max(0, left)}日` : ""].filter(Boolean).join("・"), kw: ["取りかか", "依頼", q.title] };
      });
      groups.unshift({ title: "依頼", list }); // いちばん上に
    }
    return groups;
  };

  // ギルド：受ける依頼に期限と依頼人を添え、名声で増える依頼をほのめかす
  // 日雇いの札が下がっている施設（酒場、無ければギルド、無ければ宿）
  Q5.jobFac = (L) => ["tavern", "guild", "inn"].find((f) => (L.fac || []).includes(f)) || null;
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    const jobs = Q5.jobsHere(S);
    if (jobs.length && S.fac && S.fac === Q5.jobFac(G.loc()) && g[0]) {
      const worked = G.q5State(S).jobDay === S.day;
      g[0].list.push({ id: "q5work", label: "日雇いの仕事を探す", sub: worked ? "今日はもう働いた" : `半日・${jobs.map((j) => j.name).join("／")}`, disabled: worked, kw: ["働", "日雇い", "稼", ...jobs.map((j) => j.name)] });
    }
    if (S.fac !== "guild") return g;
    const grp = g.find((x) => x.list.some((a) => /^guild:/.test(a.id)));
    if (!grp) return g;
    grp.list.forEach((a) => {
      if (a.id.startsWith("guild:take:")) {
        const q = S.board && S.board.list.find((x) => "guild:take:" + x.id === a.id);
        if (q && q.q5) { const t = Q5.type(q.kind); a.sub = `${q.reward}G${q.item ? "＋品" : ""}・${t ? t.name : ""}・期限${q.dur}日・依頼人 ${q.client.name}・${q.desc}${q.tell ? `（${q.tell}）` : ""}`; }
      } else if (a.id.startsWith("guild:report:")) {
        const q = S.quests.find((x) => "guild:report:" + x.id === a.id);
        if (q && q.item && D.ITEMS[q.item]) a.sub += `・${D.ITEMS[q.item].name}`;
      }
    });
    grp.list = grp.list.filter((a) => a.id !== "guild:none" || grp.list.length === 1);
    const next = Q.TYPES.filter((t) => (t.fame || 0) > S.fame).sort((a, b) => a.fame - b.fame)[0];
    if (next) grp.list.push({ id: "guild:locked", label: `名声 ${next.fame} で「${next.name}」の依頼も回ってくる`, sub: `今の名声 ${S.fame}`, disabled: true });
    if (S.board && S.board.q5 && Q5.boardSize(S) > 3) grp.title += `・掲示 ${S.board.list.length} 件`;
    return g;
  };

  // ---------------------------------------------------------------- 手番
  const MID_AFTER = ["explore", "walk", "camp", "travel", "sail", "deeper", "leave"];
  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const st = G.q5State(S);
    if (head === "q5go") { Q5.begin(arg); return; }
    if (head === "q5work") { G.log("you", "日雇いの仕事を探す"); G.q5State(S).cur = { sc: "job" }; G.startEvent("q5_job"); return; }
    if (head === "tavern" && arg === "rumor" && st.talk.length && S.gold >= 2 && G.rand() < 0.4) {
      S.gold -= 2;
      G.log("you", "噂を聞く");
      G.say(`隣の卓の話し声が耳に入った。${st.talk.shift()}`);
      G.pass(1);
      return;
    }
    // 依頼の場所を探索すると、ときどきそのまま取りかかる
    if (head === "explore" && G.loc().type === "wild") {
      const q = Q5.ready(S)[0];
      if (q && G.rand() < 0.35) { G.log("you", "あたりを探索する"); G.pass(1); Q5.begin(q.id, true); return; }
    }
    let rep = null;
    if (head === "guild" && String(arg).startsWith("report:")) rep = S.quests.find((x) => x.id === String(arg).slice(7) && x.done) || null;
    exploreAct0(head, arg, a);
    if (S.over) return;
    if (head === "fac" && arg === "guild" && S.fac === "guild" && (!S.board || !S.board.q5)) S.board = Q5.board(S);
    if (head === "guild" && String(arg).startsWith("take:")) {
      const q = S.quests.find((x) => x.id === String(arg).slice(5));
      if (q && q.q5 && q.deadline == null) {
        q.deadline = S.day + q.dur;
        q.takenDay = S.day;
        G.say(`依頼人は${q.client.name}。期限は${q.dur}日。${q.tell ? q.tell + "。" : ""}`);
        if (q.kind === "smuggle") { G.give("package"); G.note("封のある荷を預かった。"); }
        if (q.type === "q5escort") G.note(`${q.client.short}が旅の連れになった。${q.v.place}まで送り届ける。`);
      }
    }
    if (rep && rep.q5 && !S.quests.includes(rep)) Q5.reported(rep);
    if (head === "deeper" && S.mode === "explore") {
      const q = Q5.ready(S)[0];
      if (q && G.rand() < 0.35) { Q5.begin(q.id, true); return; }
    }
    if (MID_AFTER.includes(head)) Q5.maybeMid();
  };

  // 送り届ける依頼は、着いたらそのまま
  const arrive0 = G.arrive;
  G.arrive = (dest) => {
    arrive0(dest);
    const S = G.S;
    if (!S || S.over || S.mode !== "explore") return;
    const q = (S.quests || []).find((x) => x.q5 && (x.type === "q5escort" || (x.type === "q5scene" && D.LOCS[dest].type === "town")) && !x.done && x.loc === dest);
    if (q) { if (q.type === "q5scene") G.say(`ここは依頼の町だ。${q.client.short}の用件を思い出す。`); Q5.begin(q.id, true); }
  };

  // 出来事の結果の q5（依頼の行方）
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (o && o.q5job && S) { Q5.work(o.q5job); return; }
    if (!o || !o.q5 || !S) return apply0(o);
    const x = o.q5;
    const rest = Object.assign({}, o);
    delete rest.q5;
    const q = find(x.qid);
    if (q && x.payR) rest.gold = (rest.gold || 0) + Math.round(q.reward * x.payR);
    if (x.pkg) G.take("package");
    apply0(rest);
    if (S.over) return;
    Q5.resolve(x.qid, x.r, x);
    if (x.then) Q5.resolve(x.qid, x.then, {});
  };

  // 期限切れ
  Q5.tick = (S) => {
    if (S.mode === "event" || S.mode === "combat") return;
    (S.quests || []).slice().forEach((q) => { if (q.q5 && !q.done && q.deadline != null && S.day > q.deadline) Q5.end(q, "late"); });
  };
  const endTurn0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && !S.over) Q5.tick(S);
    endTurn0();
  };

  // 依頼の行き先（U4）に期限を添える
  if (G.questWays) {
    const ways0 = G.questWays;
    G.questWays = (S) => ways0(S).map((w) => {
      const q = w.q;
      if (!q || !q.q5) return w;
      const left = Q5.daysLeft(q, S);
      const why = q.done ? w.why : q.type === "q5escort" ? "送り先" : w.why;
      return Object.assign({}, w, { why: !q.done && left != null ? `${why}（あと${Math.max(0, left)}日）` : why });
    });
  }
})(globalThis.G = globalThis.G || {});
