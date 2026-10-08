// M4：世界の出来事。日数が進むと、あなたと関係なく世界が動く（帝国の皇帝の出陣と戦傷・宮廷の争いと皇女の婿取り、三国の戦と協定、使徒の襲来）。
// 表は src/data/world_events_m4.js（D.M4）、町で起きる出来事は src/data/events_m4.js。
// 状態は S.world（古いセーブで無ければ、その日から始める）：
//   { day: 最後に進めた日, plan: 筋の日取り, emp: 帝国の筋（sick 平時→worse 皇帝の出陣→dead 皇帝の戦傷→civil 派閥と婿取りの争い→new 婿が決まる。名は古いセーブのまま）, heir（皇女の婿）, war: { foe, since, until } | null,
//     warDone, lastWar, treaty: ""|"renewed"|"broken", towns: { 町 id: { st, by, since, until, seen, h } }, hist: [...], nextRaid, here }
//   hist の一件：{ id, day, kind, loc, by?, heir?, foe?, heard: ""|"seen"|"rumor"|"notice"|"here" }。M6（人生の物語）は G.m4History() で読む
// プレイヤーに伝わるのは、着いた町の様子・町をぶらついたときの張り紙と通行人・酒場の噂・閉まった店だけ。聞いたときに年表（kind "world"）に残る。
// core.js と explore.js は書き換えず、G.endTurn・G.arrive・G.exploreActions・G.exploreAct・G.facActions・G.facAct・G.eventTags を包む。
// レーン W＋V（M4）が管理
(function (G) {
  const D = G.data;
  const M = D.M4;

  const RUIN = ["burned", "fallen"];
  const HIST_MAX = 200;
  const rng = (a, b) => a + Math.floor(G.rand() * (b - a + 1));
  const fmt = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
  const lore = (x) => { if (x && G.openLores) G.openLores(x); };

  G.m4Season = (day) => G.SEASONS[G.calSi(day)];

  // ---------------------------------------------------------------- 状態
  G.m4World = (S) => {
    S = S || G.S;
    if (!S.world) S.world = { v: 1, day: S.day, plan: null, emp: "sick", heir: "", war: null, warDone: false, treaty: "", towns: {}, hist: [], n: 0, nextRaid: 0, here: "" };
    return S.world;
  };
  // 筋の日取り。はじめの半月は世界を動かさず、乱数も引かない（最初の町と最初の数日は、身近なことだけ）
  const PLAN_FROM = 15;
  function makePlan(W, d) {
    W.plan = {
      worse: Math.max(d + 5, rng(18, 36)), dead: Math.max(d + 20, rng(70, 120)), civil: rng(3, 10), heir: rng(25, 50),
      war: rng(10, 30), warLen: rng(70, 140), treaty: G.YEAR_DAYS * 3 + 1 + rng(0, Math.floor(G.SEASON_DAYS / 3)), // 1130年の春のはじめ（暦。C16）
    };
    W.nextRaid = d + rng(10, 30);
  }

  const nationOf = (id) => {
    if (M.NATION[id]) return M.NATION[id];
    const r = (D.LOCS[id] && D.LOCS[id].region) || "";
    if (r.includes("王国") || r.includes("教会")) return "kingdom";
    if (r.includes("帝国")) return "empire";
    if (r.includes("エルメシア") || r.includes("共和国")) return "republic";
    if (r.includes("最前線")) return "front";
    return "other";
  };
  G.m4Nation = nationOf;
  const towns = () => Object.keys(D.LOCS).filter((id) => D.LOCS[id].type === "town");
  const foeName = (f) => M.NATION_NAMES[f] || "隣の国";

  // その場所の町の様子（無ければ null）
  G.m4Town = (id, S) => {
    S = S || G.S;
    const W = S && S.world;
    return (W && W.towns[id || S.loc]) || null;
  };
  // 戦に巻き込まれている場所か（戦をしている国の町・砦・戦をしていない国の商いの町・前線の野外）
  // "free" は、王国が戦に加わっていないときの南の商いの町（M.MARKET。どちらの側にも売る）。内部の名前なので前のまま
  G.m4WarAt = (id, S) => {
    S = S || G.S;
    const W = S && S.world;
    if (!W || !W.war) return "";
    const n = nationOf(id);
    if (n === "empire" || n === W.war.foe) return "home";
    if (n === "front") return "fort";
    if ((M.MARKET || []).includes(id)) return "free";
    if ((M.FRONT[W.war.foe] || []).includes(id)) return "front";
    return "";
  };

  // 使えなくなっている行動：{ 行動の id: 理由 }
  G.m4Off = (id, S) => {
    S = S || G.S;
    const W = S && S.world;
    const off = {};
    if (!W) return off;
    const t = W.towns[id];
    if (t) {
      const R = M.RAIDERS[t.by];
      if (t.st === "rebuild") { if (t.was === "fallen") Object.assign(off, { "fac:guild": "まだ掲示板が無い", "fac:church": "鐘楼は崩れたままだ", "fac:academy": "塔の扉が歪んで開かない" }); }
      else if (R && R.off) Object.assign(off, R.off);
    }
    const war = G.m4WarAt(id, S);
    if (war === "home" || war === "fort") off["fac:train"] = off["fac:train"] || "教官は戦に取られた";
    if (id === "garmund") {
      if (W.emp === "dead" && S.day - (W.deadDay || 0) < 20) off["fac:tavern"] = off["fac:tavern"] || "陛下のご平癒まで休み";
      if (W.emp === "civil") off["fac:tavern"] = off["fac:tavern"] || "外出禁止令で、日暮れ前に閉めている";
    }
    delete off["fac:castle"]; // 王への道は閉じない（滅んだ町に王城は無い）
    if (t && t.st === "fallen") off["fac:castle"] = M.RAIDERS.passing.off["fac:castle"];
    return off;
  };

  // 戦で値が上がる割合
  G.m4Markup = (id, S) => {
    const w = G.m4WarAt(id, S);
    return w === "fort" ? 0.5 : w === "home" ? 0.3 : w === "free" ? 0.15 : 0;
  };

  // ---------------------------------------------------------------- 年表
  function add(W, day, kind, loc, extra) {
    const h = Object.assign({ id: "m4h" + ++W.n, day, kind, loc, heard: "" }, extra || {});
    W.hist.push(h);
    if (W.hist.length > HIST_MAX) W.hist.splice(0, W.hist.length - HIST_MAX);
    return h;
  }
  const newsOf = (h) => (h.kind === "raid" ? M.RAIDERS[h.by] : M.NEWS[h.kind]) || {};
  const varsOf = (h) => ({ town: (D.LOCS[h.loc] || {}).name || "", heir: h.heir || "", foe: foeName(h.foe) });

  // 聞いた・見た。はじめてなら年表に残し、用語を開く
  function hear(h, how) {
    if (!h || h.heard) return false;
    h.heard = how;
    const N = newsOf(h);
    const text = (how === "here" && N.chronHere) || (how === "seen" && N.chronSeen) || N.chron;
    const line = text && fmt(text, varsOf(h));
    // 同じ話（峡谷の小競り合いなど）を続けて聞いても、年表には一度だけ
    if (line && !G.S.chronicle.slice(-8).some((c) => c.text === line)) G.chron(line, "world");
    lore(how === "rumor" || how === "notice" ? N.loreHeard || N.lore : N.lore);
    return true;
  }
  G.m4Hear = hear;

  // 世界で起きたこと（聞いていないことも含む）。M6 の人生の物語が読む
  G.m4History = (S) => {
    S = S || G.S;
    const W = S && S.world;
    if (!W) return [];
    return W.hist.map((h) => {
      const N = newsOf(h);
      return { day: h.day, date: G.dateOf(h.day), kind: h.kind, loc: h.loc, by: h.by || "", heard: h.heard, text: fmt(N.chron || "", varsOf(h)).replace(/と聞く$/, "") };
    });
  };

  // ---------------------------------------------------------------- 世界を進める
  function startWar(W, day) {
    const foe = G.rand() < 0.65 ? "kingdom" : "republic";
    W.war = { foe, since: day, until: day + W.plan.warLen };
    add(W, day, "war", "garmund", { foe });
  }

  function raid(W, day, S) {
    const pool = Object.entries(M.RAIDERS).map(([k, R]) => [k, R, Math.max(0, R.w(W, day) || 0)]).filter(([, , w]) => w > 0);
    let total = pool.reduce((a, x) => a + x[2], 0);
    if (!total) return null;
    let r = G.rand() * total, pick = pool[pool.length - 1];
    for (const x of pool) { r -= x[2]; if (r <= 0) { pick = x; break; } }
    const [by, R] = pick;
    if (R.news) return add(W, day, "raid", "fort", { by });
    const cand = towns().filter((id) => !W.towns[id] && !(id === S.loc && day < 40)).map((id) => [id, Math.max(0, R.town(id, W, day) || 0)]).filter(([, w]) => w > 0);
    total = cand.reduce((a, x) => a + x[1], 0);
    if (!total) return null;
    r = G.rand() * total;
    let id = cand[cand.length - 1][0];
    for (const [c, w] of cand) { r -= w; if (r <= 0) { id = c; break; } }
    const h = add(W, day, "raid", id, { by });
    W.towns[id] = { st: R.st, by, since: day, until: day + rng(R.days[0], R.days[1]), seen: false, h: h.id };
    if (id === S.loc) W.here = h.id;
    return h;
  }

  function daily(W, day, S) {
    const P = W.plan;
    // 皇帝（出陣→戦傷→床のあいだの争い→皇女の婿）
    if (W.emp === "sick" && day >= P.worse) { W.emp = "worse"; add(W, day, "emp_worse", "garmund"); }
    else if (W.emp === "worse" && day >= P.dead) {
      if (!W.rallied && G.rand() < 0.2) { W.rallied = true; P.dead = day + rng(150, 300); add(W, day, "emp_rally", "garmund"); }
      else { W.emp = "dead"; W.deadDay = day; add(W, day, "emp_dead", "garmund"); }
    } else if (W.emp === "dead" && day >= W.deadDay + P.civil) { W.emp = "civil"; W.civilDay = day; add(W, day, "civil", "garmund"); }
    else if (W.emp === "civil" && day >= W.civilDay + P.heir) { W.emp = "new"; W.heir = G.pick(M.HEIRS); W.heirDay = day; add(W, day, "heir", "garmund", { heir: W.heir }); }
    // 戦
    if (!W.war && !W.warDone && W.emp === "new" && day >= W.heirDay + P.war) startWar(W, day);
    else if (W.war && day >= W.war.until) {
      W.lastWar = Object.assign({}, W.war, { until: day });
      add(W, day, "truce", "garmund", { foe: W.war.foe });
      W.war = null;
      W.warDone = true;
    }
    // 協定の結び直し（1130年）。戦の最中なら誰も来ない
    if (!W.treaty && day >= P.treaty) {
      const ok = !W.war && G.rand() < 0.5;
      W.treaty = ok ? "renewed" : "broken";
      add(W, day, ok ? "treaty_ok" : "treaty_broken", "karna");
      if (!ok && !W.war) startWar(W, day);
    }
    // 襲来
    // 年を追うごとに間が詰まる（はじめの年は大きな災いがまだ少ない）
    if (day >= W.nextRaid) { raid(W, day, S); W.nextRaid = day + (day <= 360 ? rng(35, 65) : day <= 720 ? rng(28, 50) : rng(20, 40)); } // 襲来の間隔は旅の日数で詰まる（暦の年とは別。C16）
    // 町が立ち直る
    Object.entries(W.towns).forEach(([id, t]) => {
      if (day < t.until) return;
      if (t.st === "rebuild") delete W.towns[id];
      else { t.was = t.st; t.st = "rebuild"; t.until = day + rng(20, 45); t.rseen = false; }
    });
  }

  G.m4Tick = () => {
    const S = G.S;
    if (!S || S.over) return;
    const W = G.m4World(S);
    if (!W.plan) { if (S.day < PLAN_FROM) { W.day = S.day; return; } makePlan(W, W.day); }
    const upto = Math.min(S.day, W.day + 2000); // 古いセーブで何年も飛んでも、固まらないように
    while (W.day < upto) { W.day++; daily(W, W.day, S); }
    W.day = Math.max(W.day, S.day);
    // その町にいるときに襲われた
    if (W.here && (S.mode === "explore" || S.mode === "fac")) {
      const h = W.hist.find((x) => x.id === W.here);
      W.here = "";
      const t = h && W.towns[h.loc];
      if (h && t && h.loc === S.loc && G.startEvent("m4_here_" + h.by)) { t.seen = true; hear(h, "here"); }
    }
  };

  // ---------------------------------------------------------------- 伝わる
  // 道と船の日数で、どの町からどの町まで何日かかるか（噂の届く速さ）
  const distCache = {};
  function dist(from, to) {
    if (from === to) return 0;
    let m = distCache[from];
    if (!m) {
      m = distCache[from] = { [from]: 0 };
      const q = [from];
      while (q.length) {
        q.sort((a, b) => m[a] - m[b]);
        const u = q.shift();
        const L = D.LOCS[u] || {};
        const edges = [...Object.entries(L.links || {}), ...Object.entries(L.sea || {}).map(([k, s]) => [k, s.days])];
        for (const [v, d] of edges) if (m[v] === undefined || m[u] + d < m[v]) { m[v] = m[u] + d; q.push(v); }
      }
    }
    return m[to] === undefined ? 30 : m[to];
  }
  // ここまで届いている話（新しい順。まだ聞いていない話は、古いものから伝える）
  function knownHere(S, fresh) {
    const W = S.world;
    return W.hist.filter((h) => S.day >= h.day + Math.min(15, dist(h.loc, S.loc)) && S.day - h.day <= 150 && (!fresh || !h.heard)).reverse();
  }

  // 酒場の噂。届いている話があれば、ときどきそれを聞く
  function worldRumor(S) {
    const fresh = knownHere(S, true).filter((h) => (newsOf(h).rumor || []).length);
    const old = knownHere(S, false).filter((h) => (newsOf(h).rumor || []).length);
    const h = fresh.length && G.rand() < 0.65 ? fresh[fresh.length - 1] : old.length && G.rand() < 0.2 ? G.pick(old) : null;
    if (!h) return false;
    const text = fmt(G.pick(newsOf(h).rumor), varsOf(h));
    S.gold -= 2;
    G.log("you", "噂を聞く");
    G.say(`${G.pick(M.SPEAKERS)}「${text}」`);
    G.memo("噂：" + text);
    if (G.heard) G.heard("噂：" + text);
    hear(h, "rumor");
    G.pass(1);
    return true;
  }

  // 町をぶらついたときの、世の中の一行
  function worldLine(S) {
    const W = S.world;
    const here = S.loc;
    const vars = { town: G.loc().name };
    // 張り紙（まだ聞いていない話）
    const notes = knownHere(S, true).filter((h) => (newsOf(h).notice || []).length && h.loc !== here);
    if (notes.length && G.rand() < 0.5) {
      const h = notes[notes.length - 1];
      G.say(fmt(G.pick(newsOf(h).notice), varsOf(h)));
      hear(h, "notice");
      return true;
    }
    const lines = [];
    const t = W.towns[here];
    if (t) {
      const R = M.RAIDERS[t.by] || {};
      lines.push(...(t.st === "rebuild" ? R.rebuild || [] : R.lines || []));
    }
    const war = G.m4WarAt(here, S);
    if (war === "home") lines.push(...M.WAR_LINES);
    if (war === "free") lines.push(...M.FREE_LINES);
    if (war === "fort") lines.push(...M.FORT_LINES);
    if (!W.war && W.lastWar && S.day - W.lastWar.until < 150 && ["empire", W.lastWar.foe].includes(nationOf(here))) lines.push(...M.AFTER_LINES);
    if (here === "garmund") {
      if (W.emp === "dead") lines.push(...M.MOURN_LINES);
      if (W.emp === "civil") lines.push(...M.CIVIL_LINES);
      if (W.emp === "new" && S.day - W.heirDay < 90) lines.push(...M.HEIR_LINES);
    }
    if (!lines.length) return false;
    G.say(fmt(G.pick(lines), vars));
    if (war === "free") lore("m4_war:merc");
    return true;
  }

  // 着いた町の様子（はじめて見たときだけ）
  function arrivalSight(S) {
    const W = S.world;
    const t = W.towns[S.loc];
    const vars = { town: G.loc().name };
    if (t) {
      const R = M.RAIDERS[t.by] || {};
      const h = W.hist.find((x) => x.id === t.h);
      if (t.st === "rebuild" && !t.rseen) {
        t.rseen = true;
        t.seen = true;
        G.say(fmt(G.pick(R.rebuild || R.seen || [""]), vars));
        hear(h, "seen");
      } else if (!t.seen) {
        t.seen = true;
        G.say(fmt(G.pick(R.seen || [""]), vars));
        hear(h, "seen");
      }
    }
    if (S.loc === "garmund" && (W.emp === "dead" || W.emp === "civil")) {
      const h = W.hist.filter((x) => x.kind === "emp_dead").pop();
      if (h && !h.heard) { G.say(M.NEWS.emp_dead.seen); hear(h, "seen"); }
    }
  }

  // ---------------------------------------------------------------- 包む
  const baseEndTurn = G.endTurn;
  G.endTurn = () => { G.m4Tick(); baseEndTurn(); };

  const baseArrive = G.arrive;
  G.arrive = (dest) => {
    baseArrive(dest);
    const S = G.S;
    if (!S || S.over) return;
    G.m4World(S);
    if (G.loc().type === "town") arrivalSight(S);
  };

  const WALK_LABEL = { burned: ["焼け跡を歩く", "瓦礫と、残った人々"], fallen: ["残った町を歩く", "消えた幅の縁"] };
  const baseExploreActions = G.exploreActions;
  G.exploreActions = () => {
    const S = G.S;
    const groups = baseExploreActions();
    const W = S.world;
    if (!W) return groups;
    const off = G.loc().type === "town" ? G.m4Off(S.loc, S) : {};
    const t = W.towns[S.loc];
    groups.forEach((g) => g.list.forEach((a) => {
      if (off[a.id]) { a.disabled = true; a.sub = off[a.id]; }
      if (a.id === "walk" && t && WALK_LABEL[t.st]) { a.label = WALK_LABEL[t.st][0]; a.sub = WALK_LABEL[t.st][1]; a.kw = [...(a.kw || []), "焼け跡", "瓦礫"]; }
      // 聞いた話や見たことは、旅立つ先の欄に一言
      if (/^(travel|sail):/.test(a.id)) {
        const to = a.id.split(":")[1];
        const tt = W.towns[to];
        const h = tt && W.hist.find((x) => x.id === tt.h);
        if (tt && h && h.heard && tt.st !== "rebuild") a.sub += "・" + ({ burned: "焼けたと聞いた", fallen: "半分が消えたと聞いた", famine: "食べ物が無いと聞いた", plague: "疫病が出たと聞いた", dance: "踊り疲れていると聞いた" }[tt.st] || "");
      }
    }));
    return groups;
  };

  // 滅んだ町・焼けた町をぶらつく
  function ruinWalk(S, t) {
    G.log("you", WALK_LABEL[t.st][0]);
    G.pass(1);
    const tags = G.eventTags();
    const pool = D.EVENTS.filter((e) => e.w > 0 && e.where.some((w) => w.startsWith("m4_") && tags.includes(w)) && !(e.once && S.flags["ev:" + e.id]) && (!e.cond || e.cond(S)));
    if (pool.length && G.rand() < 0.3) {
      let r = G.rand() * pool.reduce((a, e) => a + e.w, 0);
      let e = pool[pool.length - 1];
      for (const x of pool) { r -= x.w; if (r <= 0) { e = x; break; } }
      G.startEvent(e);
      return;
    }
    worldLine(S);
    if (G.rand() < 0.25) {
      const g = G.d(8);
      S.gold += g;
      G.say("瓦礫の下から、煤けた銅貨を何枚か拾った。持ち主は、もういないのかもしれない。");
      G.note(`${g}G を手に入れた。`);
    }
  }

  const baseExploreAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const W = S.world;
    const t = W && W.towns[S.loc];
    if (head === "walk" && t && RUIN.includes(t.st)) { ruinWalk(S, t); return; }
    baseExploreAct(head, arg, a);
    if (head === "walk" && W && S.mode === "explore" && !S.over) {
      const heavy = t || G.m4WarAt(S.loc, S) || (S.loc === "garmund" && ["dead", "civil"].includes(W.emp));
      if ((heavy || W.hist.length) && G.rand() < (heavy ? 0.6 : 0.3)) worldLine(S);
    }
  };

  const baseFacActions = G.facActions;
  G.facActions = () => {
    const S = G.S;
    const groups = baseFacActions();
    if (!S.world) return groups;
    const off = G.m4Off(S.loc, S);
    const mk = S.fac === "shop" ? G.m4Markup(S.loc, S) : 0;
    groups.forEach((g) => g.list.forEach((a) => {
      if (off[a.id]) { a.disabled = true; a.sub = off[a.id]; }
      if (mk && a.id.startsWith("shop:buy:")) {
        const it = D.ITEMS[a.id.slice(9)];
        if (!it) return;
        const price = it.price + Math.ceil(it.price * mk);
        a.sub = a.sub.replace(/^\d+G/, `${price}G`);
        a.disabled = a.disabled || S.gold < price;
      }
    }));
    return groups;
  };

  const baseFacAct = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (S.world) {
      if (head === "tavern" && arg === "rumor" && worldRumor(S)) return;
      if (head === "shop" && arg.startsWith("buy:")) {
        const it = D.ITEMS[arg.slice(4)];
        const extra = it ? Math.ceil(it.price * G.m4Markup(S.loc, S)) : 0;
        if (extra) {
          if (S.gold < it.price + extra) return;
          S.gold -= extra;
          baseFacAct(head, arg, a);
          G.note(`戦で値が上がっていた。（さらに -${extra}G）`);
          return;
        }
      }
    }
    baseFacAct(head, arg, a);
  };

  // 出来事の場所のタグ：m4_war（戦に巻き込まれた所）・m4_front（前線の野外）・m4_<町の様子>・m4_ruin（焼け跡・消えた町）
  const baseTags = G.eventTags;
  G.eventTags = () => {
    const tags = baseTags();
    const S = G.S;
    const W = S && S.world;
    if (!W) return tags;
    const war = G.m4WarAt(S.loc, S);
    if (war) tags.push("m4_war", "m4_war_" + war);
    const t = W.towns[S.loc];
    if (t) { tags.push("m4_" + t.st); if (RUIN.includes(t.st)) tags.push("m4_ruin"); }
    if (W.hist.some((h) => h.kind === "raid" && M.RAIDERS[h.by] && RUIN.includes(M.RAIDERS[h.by].st))) tags.push("m4_after_raid");
    if (W.lastWar && !W.war) tags.push("m4_after_war");
    if (S.loc === "garmund" && ["dead", "civil"].includes(W.emp)) tags.push("m4_mourn");
    if (W.emp === "civil" && ["garmund", "frost"].includes(S.loc)) tags.push("m4_civil");
    return tags;
  };
})(globalThis.G = globalThis.G || {});
