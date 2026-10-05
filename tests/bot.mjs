// 「筋のよい遊び方」のボット（Q2 #17）。tests/balance.mjs と tests/checks/q2_balance.mjs が使う。
// 乱数は使わない（同じ状態なら同じ行動を選ぶ）。遊びの乱数は G.rand のまま。
//
// やること（人が普通に考える遊び方）：
//   - 戦う前に勝ち目を見積もる（敵の HP・命中・ダメージと、自分の成功率・ダメージから）
//   - 戦闘では、見込みダメージの大きい手を選ぶ。危なくなったら薬を飲む・癒す・逃げる
//   - 傷ついたら町へ戻って宿で休む。金があれば装備を買い、薬を買い、訓練場で鍛え、仲間を雇う
//   - 勝てる見込みのある、いちばん危険な所で稼ぐ（危険の低い所から）。ギルドの依頼も受ける
//   - 迷宮は、主に勝てる見込みがあるときだけ最奥まで潜る
// 画面でできること（装備・持ち物を使う）は G.equip・G.useItem を直接呼ぶ（手番は進まない）。
export function makeSmartBot(G) {
  const D = G.data;
  const mem = { sortie: 0, target: null, guildDay: -1, shopDay: -1, trainDay: -1, tavernDay: -1, visits: {} };
  const avg = (d) => (d ? d[0] * (d[1] + 1) / 2 + d[2] : 0);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const S = () => G.S;
  const beast = () => (G.beastOf ? G.beastOf(G.S) : 0);
  const sanity = () => (G.sanityOf ? G.sanityOf(G.S) : 100);

  // ---------------------------------------------------------------- 見積もり
  // 自分の1手番あたりの見込みダメージ（MP を使う手は、使える間だけ）
  function myOptions(e, nFoes) {
    const s = S();
    const w = G.weapon();
    const pierceBlock = e.majin && !w.pierce;
    const out = [];
    // 成功率は敵の強さとの差（S5。G.foeVs）、ダメージの上乗せは体の目盛り（G.s5Pow）
    const pw = (k, n) => Math.floor(G.s5Pow(s.stats[k]) / n);
    const statBonus = w.stat === "筋力" ? pw("筋力", 15) : pw("敏捷", 20);
    out.push({ id: "cb:attack", mp: 0, dmg: pierceBlock ? 0 : (G.chance(w.stat, { vs: G.foeVs.eva(e, w.stat) }, w.hit || 0) / 100) * (avg(w.dmg) + statBonus) });
    out.push({ id: "cb:vital", mp: 0, dmg: pierceBlock ? 0 : (G.chance("敏捷", { vs: G.foeVs.vital(e) }, w.vital || 0) / 100) * 2 * (avg(w.dmg) + pw("敏捷", 15)) });
    const mb = G.magicBonus();
    out.push({ id: "cb:fire", mp: 3, dmg: pierceBlock ? 0 : (G.chance("魔力", { vs: G.foeVs.mres(e) }, G.gearBonus("fire") + mb) / 100) * (7 + pw("魔力", 8)) });
    if (G.knows && G.knows("ice") && D.SPELLS.ice) {
      const p = G.chance("魔力", { vs: G.foeVs.mres(e) - G.s5Mod(D.SPELLS.ice.diff || 0) }, G.gearBonus("ice") + mb) / 100;
      out.push({ id: "cb:ice", mp: D.SPELLS.ice.mp, dmg: pierceBlock ? 0 : p * (3.5 + pw("魔力", 10) + avg(e.dmg) * 0.6) });
    }
    if (G.knows && G.knows("bolt") && D.SPELLS.bolt) {
      const p = G.chance("魔力", { vs: G.foeVs.mres(e) - G.s5Mod(D.SPELLS.bolt.diff || 0) }, G.gearBonus("bolt") + mb) / 100;
      out.push({ id: "cb:bolt", mp: D.SPELLS.bolt.mp, dmg: pierceBlock ? 0 : p * (5 + pw("魔力", 12)) * nFoes });
    }
    return out;
  }
  function companionDpr(e) {
    return (S().companions || []).reduce((a, c) => a + (G.allyHitChance(c, e) / 100) * ((c.fire ? 7 : 3.5) + (c.dmg || 0)), 0);
  }
  function foeDpr(e) {
    const armor = G.armor();
    const hit = G.foeHitChance(e) / 100;
    return hit * Math.max(1, avg(e.dmg) - (e.magic ? 0 : armor ? armor.def : 0));
  }
  // この敵の組と最後まで戦ったときの、見込みの被ダメージ（mpCap を渡すと、MP はそれまでしか無いものとして見る）
  function fightCost(ids, hpLeft, mpCap) {
    const s = S();
    let mp = mpCap == null ? s.mp : Math.min(s.mp, mpCap);
    const foes = ids.map((id) => ({ e: D.ENEMIES[id], hp: hpLeft ? hpLeft[ids.indexOf(id)] : D.ENEMIES[id].hp })).sort((a, b) => a.hp - b.hp);
    let taken = 0;
    let rounds = 0;
    // 見積もりは一つの敵を相手にしている間は変わらないので、手番ごとに計り直さない（速さのため。数字は同じ）
    const dpr = foes.map((f) => foeDpr(f.e));
    for (let i = 0; i < foes.length; i++) {
      const f = foes[i];
      let hp = f.hp;
      const n = foes.length - i;
      const opts = myOptions(f.e, n);
      const spell = Math.max(0, ...opts.filter((o) => o.mp).map((o) => o.dmg));
      const melee = Math.max(...opts.filter((o) => !o.mp).map((o) => o.dmg));
      const comp = companionDpr(f.e);
      while (hp > 0 && rounds < 60) {
        let dmg = melee;
        if (spell > melee && mp >= 3) { dmg = spell; mp -= 3; }
        dmg += comp;
        hp -= Math.max(0.3, dmg);
        rounds++;
        for (let j = i; j < foes.length; j++) if (j > i || hp > 0) taken += dpr[j];
      }
      if (f.e.majin && !G.weapon().pierce) return Infinity;
    }
    return rounds >= 60 ? Infinity : taken;
  }
  const healStock = () => Object.entries(S().inv).reduce((a, [id, n]) => a + ((D.ITEMS[id] && D.ITEMS[id].type === "use" && D.ITEMS[id].hp) ? Math.min(D.ITEMS[id].hp, S().maxHp) * n : 0), 0);

  // その場所の敵と戦って大丈夫か（2 体組みの、強い方の敵で見る）
  // 稼ぎ場では休まずに何度も戦うので、MP は最大の半分しか残っていないものとして見る（Q6。満タンで見ると、術に頼る魔法使いだけ
  // 二戦目からの杖の殴り合いで死にやすく、筋のよい遊び方の職業の差が 1.4 倍前後になっていた。人なら MP が尽きるのを見越して選ぶ）
  function areaRisk(L) {
    const pool = (L.pool || []).filter((id) => D.ENEMIES[id] && !D.ENEMIES[id].boss);
    if (!pool.length) return 0;
    const costs = pool.map((id) => fightCost([id, id], null, Math.floor(S().maxMp / 2))).sort((a, b) => a - b);
    return costs[Math.floor(costs.length * 0.75)] || costs[costs.length - 1];
  }
  function fightReady(ids) {
    const s = S();
    return fightCost(ids) < (s.maxHp + Math.min(healStock(), s.maxHp)) * 0.55;
  }
  function bossReady(L, lid) {
    if (!L.boss) return false;
    if (L.lair) return false; // 使徒の居城は、剣が無ければ挑めない（出来事で決まる）
    const mids = Object.entries(L.midboss || {}).filter(([d]) => !S().flags[`mid:${lid}:${d}`]).map(([, id]) => [id]);
    return fightReady([L.boss]) && mids.every(fightReady);
  }

  // ---------------------------------------------------------------- 道
  // 一つの出発地から、すべての場所への道（日数＋危険）。船賃を払えるかで変わるので、それも鍵にする
  const routeCache = {};
  function tree(from) {
    const s = S();
    const key = from + ":" + (s.gold >= 60 ? 1 : 0);
    if (routeCache[key]) return routeCache[key];
    const dist = { [from]: 0 }, prev = {}, done = {};
    for (;;) {
      let u = null;
      for (const k in dist) if (!done[k] && (u === null || dist[k] < dist[u])) u = k;
      if (u === null) break;
      done[u] = true;
      const L = D.LOCS[u];
      const edges = Object.entries(L.links || {}).map(([v, d]) => [v, d]);
      Object.entries(L.sea || {}).forEach(([v, x]) => { if (s.gold >= 60 && x.cost <= 40) edges.push([v, x.days]); });
      for (const [v, d] of edges) {
        if (!D.LOCS[v]) continue;
        const nd = dist[u] + d + (D.LOCS[v].danger || 0) * 2;
        if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; prev[v] = u; }
      }
    }
    return (routeCache[key] = { dist, prev });
  }
  function route(from, to) {
    const { dist, prev } = tree(from);
    if (dist[to] === undefined) return null;
    let v = to;
    const path = [v];
    while (prev[v]) { v = prev[v]; path.unshift(v); }
    return { path, cost: dist[to] };
  }
  function stepToward(to) {
    const s = S();
    const r = route(s.loc, to);
    if (!r || r.path.length < 2) return null;
    const next = r.path[1];
    const L = G.loc();
    return L.links && L.links[next] ? "travel:" + next : "sail:" + next;
  }
  function nearestTown(fac) {
    let best = null;
    for (const [id, L] of Object.entries(D.LOCS)) {
      if (L.type !== "town" || !L.fac.includes(fac || "inn")) continue;
      const r = route(S().loc, id);
      if (r && (!best || r.cost < best.cost)) best = { id, cost: r.cost };
    }
    return best && best.id;
  }

  // 稼ぎ場を選ぶ：勝てる見込みのある中で、いちばん危険（＝実入りがよい）な所。近い方がよい
  function chooseTarget() {
    const s = S();
    let best = null;
    for (const [id, L] of Object.entries(D.LOCS)) {
      if (L.type === "town") continue;
      const r = route(s.loc, id);
      if (!r) continue;
      const risk = areaRisk(L);
      if (risk > s.maxHp * 0.45) continue;
      let score = (L.danger || 0) * 10 - r.cost;
      if (L.type === "dungeon" && L.boss && !s.flags[(L.reward && L.reward.flag) || "boss:" + id] && bossReady(L, id)) score += 25;
      if (s.quests.some((q) => !q.done && q.loc === id)) score += 6;
      if (!best || score > best.score) best = { id, score };
    }
    return best ? best.id : "forest";
  }

  // ---------------------------------------------------------------- 町
  // 獣の病にかかったら、祓い代（120G）を残す
  const reserve = () => (beast() >= 1 && beast() <= 2 ? 145 : 25);
  function wantedBuys() {
    const s = S();
    const out = [];
    const L = G.loc();
    const stock = [...new Set([...(L.shop || []), ...(D.SHOP_BASE || [])])].filter((id) => D.ITEMS[id]);
    const spare = s.gold - reserve();
    // 武器：見込みダメージ（仮の敵 def 10）が上がるもの
    const probe = { def: 10, mres: 10, dmg: [1, 6, 1], hit: 60 };
    const w0 = G.weapon();
    const wScore = (w) => (G.chance(w.stat, 0, (w.hit || 0) - 10) / 100) * (avg(w.dmg) + Math.floor(G.s5Pow(s.stats[w.stat === "筋力" ? "筋力" : "敏捷"]) / (w.stat === "筋力" ? 15 : 20))) + (w.magic || 0) * (s.stats.魔力 >= 10 ? 0.12 : 0);
    let bestW = null;
    for (const id of stock) {
      const it = D.ITEMS[id];
      if (it.type !== "weapon" || it.price > spare) continue;
      if (wScore(it) > wScore(w0) * 1.12 && (!bestW || wScore(it) > wScore(D.ITEMS[bestW]))) bestW = id;
    }
    if (bestW) out.push(bestW);
    const a0 = G.armor();
    const aScore = (a) => (a ? a.def * 2 + (a.agi || 0) / 5 + (a.magic || 0) * (s.stats.魔力 >= 10 ? 0.15 : 0) : 0);
    let bestA = null;
    for (const id of stock) {
      const it = D.ITEMS[id];
      if (it.type !== "armor" || it.price > spare - (bestW ? D.ITEMS[bestW].price : 0)) continue;
      if (aScore(it) > aScore(a0) + 0.5 && (!bestA || aScore(it) > aScore(D.ITEMS[bestA]))) bestA = id;
    }
    if (bestA) out.push(bestA);
    void probe;
    // 薬
    const heals = ["potion", "herb"].filter((id) => stock.includes(id));
    const nHeal = (G.count("potion") || 0) + (G.count("herb") || 0);
    if (nHeal < 3 && heals.length) {
      const id = s.gold > 120 && heals.includes("potion") ? "potion" : heals.includes("herb") ? "herb" : heals[0];
      if (D.ITEMS[id].price <= spare) out.push(id);
    }
    if (s.maxMp >= 8 && G.count("manawater") < 2 && stock.includes("manawater") && D.ITEMS.manawater.price <= spare - 30) out.push("manawater");
    return out;
  }
  function trainStat() {
    const s = S();
    const w = G.weapon();
    const caster = s.stats.魔力 >= 10 && s.stats.魔力 > s.stats[w.stat];
    const pri = [caster ? "魔力" : w.stat, "体力", "敏捷"];
    let best = null;
    for (const k of pri) if (!best || s.stats[k] < s.stats[best] - 1) best = k;   // 点（S5）。低いものから
    return best;
  }

  function townAction() {
    const s = S();
    const L = G.loc();
    const fac = L.fac || [];
    const hurt = s.hp < s.maxHp || s.mp < s.maxMp || s.conds.includes("毒");
    const innCost = L.capital ? 10 : 5;
    const day = s.day;
    if (fac.includes("guild") && s.quests.some((q) => q.done)) return "fac:guild";
    if (fac.includes("church") && s.conds.includes("呪い") && s.gold >= 15 + reserve()) return "fac:church";
    if (fac.includes("church") && beast() >= 1 && beast() <= 2 && s.gold >= 120) return "fac:church";
    if (fac.includes("church") && sanity() < 60 && mem.confessDay !== day && s.gold >= 30 + reserve()) return "fac:church";
    if (fac.includes("shop") && mem.shopDay !== day + ":" + s.loc && wantedBuys().length) return "fac:shop";
    if (fac.includes("guild") && mem.guildDay !== day + ":" + s.loc && s.quests.length < 3) return "fac:guild";
    if (fac.includes("train") && mem.trainDay !== day && s.gold >= 30 + 80 + reserve() && trainStat()) return "fac:train";
    if (fac.includes("tavern") && mem.tavernDay !== day + ":" + s.loc && s.companions.length < 2 && s.gold >= 150 + reserve()) return "fac:tavern";
    if (fac.includes("inn") && hurt && s.gold >= innCost) return "fac:inn";
    // 出かける
    mem.target = chooseTarget();
    mem.sortie = 0;
    return stepToward(mem.target) || (L.links && Object.keys(L.links).length ? "travel:" + Object.keys(L.links)[0] : null);
  }

  function facAction(avail) {
    const s = S();
    const f = s.fac;
    const has = (id) => avail.some((a) => a.id === id);
    const day = s.day;
    if (f === "inn") { if (has("inn:rest") && (s.hp < s.maxHp || s.mp < s.maxMp || s.conds.includes("毒"))) return "inn:rest"; }
    else if (f === "guild") {
      const rep = avail.find((a) => a.id.startsWith("guild:report:"));
      if (rep) return rep.id;
      mem.guildDay = day + ":" + s.loc;
      const takes = avail.filter((a) => a.id.startsWith("guild:take:"));
      for (const a of takes) {
        const q = s.board && s.board.list.find((x) => "guild:take:" + x.id === a.id);
        if (!q) continue;
        const L = D.LOCS[q.loc];
        if (q.type === "deliver") { if (route(s.loc, q.loc) && route(s.loc, q.loc).cost <= 6) return a.id; continue; }
        if (L && areaRisk(L) <= s.maxHp * 0.45) return a.id;
      }
    } else if (f === "church") {
      if (has("m5:purge")) return "m5:purge";
      if (has("church:heal") && (s.conds.includes("呪い") || s.conds.includes("毒"))) return "church:heal";
      if (has("m5:confess") && sanity() < 60 && mem.confessDay !== day) { mem.confessDay = day; return "m5:confess"; }
      mem.confessDay = day;
    }
    else if (f === "shop") {
      const buys = wantedBuys();
      for (const id of buys) if (has("shop:buy:" + id)) return "shop:buy:" + id;
      // 戦利品は売る
      const sell = avail.find((a) => a.id.startsWith("shop:sell:") && G.itemInfo(a.id.slice(10)).type === "loot");
      if (sell) return sell.id;
      // 使わなくなった武具も売る
      const old = avail.find((a) => { const it = G.itemInfo(a.id.slice(10)); return a.id.startsWith("shop:sell:") && it && (it.type === "weapon" || it.type === "armor"); });
      if (old) return old.id;
      mem.shopDay = day + ":" + s.loc;
    } else if (f === "train") {
      mem.trainDay = day;
      const k = trainStat();
      if (k && has("train:" + k) && s.gold >= 30 + 80 + reserve()) return "train:" + k;
    } else if (f === "tavern") {
      mem.tavernDay = day + ":" + s.loc;
      const hire = avail.filter((a) => a.id.startsWith("tavern:hire:") && !a.disabled);
      const pick = hire.find((a) => { const c = s.recruits && s.recruits.list[Number(a.id.slice(12))]; return c && s.gold - c.fee >= 60 + reserve(); });
      if (pick) return pick.id;
    }
    return "back";
  }

  // ---------------------------------------------------------------- 野外・迷宮
  function fieldAction() {
    const s = S();
    const L = G.loc();
    healUp(0.5);
    const low = s.hp < s.maxHp * 0.5;
    if (L.type === "dungeon" && s.depth > 0) {
      const bf = (L.reward && L.reward.flag) || "boss:" + s.loc;
      const nextBoss = s.depth + 1 >= L.floors && !s.flags[bf];
      if (low || mem.sortie >= 8) return "leave";
      if (nextBoss && !bossReady(L, s.loc)) return "leave";
      const mid = L.midboss && L.midboss[s.depth + 1];
      if (mid && !s.flags[`mid:${s.loc}:${s.depth + 1}`] && !fightReady([mid])) return "leave";
      if (s.depth >= L.floors) return "leave";
      mem.sortie++;
      return "deeper";
    }
    const town = beast() >= 1 && beast() <= 2 && s.gold >= 120 ? nearestTown("church") || nearestTown() : nearestTown();
    const goHome = town !== nearestTown() || low || mem.sortie >= 6 || s.quests.some((q) => q.done) || (s.hp < s.maxHp * 0.75 && healStock() === 0);
    if (goHome) {
      if (low && L.type !== "town" && (route(s.loc, town) || { cost: 0 }).cost >= 5 && s.hp < s.maxHp * 0.35) return "camp";
      return stepToward(town) || "camp";
    }
    if (!mem.target || mem.target === s.loc || !route(s.loc, mem.target)) {
      if (mem.target !== s.loc) mem.target = chooseTarget();
    }
    if (mem.target !== s.loc) return stepToward(mem.target) || (L.type === "wild" ? "explore" : "deeper");
    mem.sortie++;
    if (L.type === "wild") return "explore";
    const bf = (L.reward && L.reward.flag) || "boss:" + s.loc;
    if (s.flags[bf] && s.depth === 0 && mem.sortie > 3) { mem.target = chooseTarget(); }
    return "deeper";
  }

  // 戦闘の外で薬を飲む（画面の持ち物欄と同じ。手番は進まない）
  function healUp(frac) {
    const s = S();
    let guard = 0;
    while (s.hp < s.maxHp * frac && guard++ < 5) {
      const id = ["herb", "potion", "w2_kilnpie", "w2_sausage", "w2_whitebread", "riceball", "jerky", "ale"].find((x) => G.count(x) > 0 && D.ITEMS[x] && s.maxHp - s.hp >= Math.min(D.ITEMS[x].hp, 8));
      if (!id || !G.useItem(id)) break;
    }
  }

  // ---------------------------------------------------------------- 戦闘
  function combatAction(avail) {
    const s = S();
    const has = (id) => { const a = avail.find((x) => x.id === id); return a && !a.disabled; };
    const foes = G.alive();
    const t = G.target();
    const te = G.foeData(t);
    const boss = s.combat.boss;
    const inc = foes.reduce((a, f) => a + foeDpr(G.foeData(f)), 0);
    const maxHit = foes.reduce((a, f) => a + G.foeData(f).dmg[0] * G.foeData(f).dmg[1] + G.foeData(f).dmg[2], 0);
    const cost = fightCost(foes.map((f) => f.id), foes.map((f) => f.hp));
    // 危ない：薬 → 癒し → 逃げる
    if (s.hp <= Math.max(inc * 2, maxHit * 0.8) || s.hp < s.maxHp * 0.3) {
      const heal = ["potion", "elixir", "herb", "w2_kilnpie", "w2_sausage", "w2_whitebread", "riceball", "jerky"].find((x) => has("cb:item:" + x));
      if (heal) return "cb:item:" + heal;
      if (!boss && cost > s.hp) {
        if (has("cb:item:smoke")) return "cb:item:smoke";
        if (has("cb:bribe")) return "cb:bribe";
        if (has("cb:flee") && G.cb.flee() >= 25) return "cb:flee";
      }
      if (has("cb:heal") && G.cb.heal() >= 40) return "cb:heal";
    }
    // 勝ち目がない雑魚戦は、早めに逃げる
    if (!boss && cost > s.hp * 1.2) {
      if (has("cb:talk") && G.cb.talk() >= 45) return "cb:talk";
      if (has("cb:bribe") && s.gold > 60) return "cb:bribe";
      if (has("cb:flee") && G.cb.flee() >= 35) return "cb:flee";
      if (has("cb:item:smoke")) return "cb:item:smoke";
    }
    if (has("cb:talk") && G.cb.talk() >= 70 && !boss) return "cb:talk";
    if (te.undead && has("cb:item:holywater")) return "cb:item:holywater";
    // 見込みダメージの大きい手
    const opts = myOptions(te, foes.length).filter((o) => has(o.id));
    // MP は、雑魚が一発で落ちないときか、ボスのときに使う
    opts.sort((a, b) => b.dmg - a.dmg);
    let pick = opts[0];
    const melee = opts.find((o) => !o.mp);
    if (pick && pick.mp && melee && !boss && t.hp <= melee.dmg * 1.5 && foes.length === 1) pick = melee;
    if (pick && pick.mp && s.mp < pick.mp + 3 && !boss && s.hp > s.maxHp * 0.6 && melee && melee.dmg > pick.dmg * 0.6) pick = melee;
    if (!pick || pick.dmg <= 0.2) {
      if (!boss && has("cb:flee")) return "cb:flee";
      if (has("cb:guard")) return "cb:guard";
    }
    if (pick) return pick.id;
    return avail[0] && avail[0].id;
  }

  // ---------------------------------------------------------------- 出来事
  function outcomeValue(o) {
    const s = S();
    if (!o) return 0;
    let v = 0;
    if (o.m6end) v -= 1000; // 物語を終えない（測定を続ける）
    if (o.hp) v += o.hp > 0 ? Math.min(o.hp, s.maxHp - s.hp) : o.hp * (s.hp + o.hp <= 0 ? 50 : 3 + 20 / Math.max(1, s.hp + o.hp));
    if (o.gold) v += o.gold / 8;
    if (o.heal === "full") v += (s.maxHp - s.hp) + 2;
    if (o.grow) v += Object.values(o.grow).reduce((a, n) => a + n * 3, 0);
    if (o.item) v += 3;
    if (o.cond) v -= 8;
    if (o.cure) v += 3;
    if (o.crime || o.infamy) v -= 4;
    if (o.sanity) v += o.sanity / 3;
    if (o.beast === "infect" || typeof o.beast === "number") v -= 30;
    if (o.fame) v += o.fame;
    if (o.dropCompanion) v -= 6;
    if (o.fight) v -= fightPenalty(G.resolveFoes ? G.resolveFoes(o.fight) : o.fight);
    if (o.e3fight) v -= 200; // 使徒に挑む（E3）。条件をそろえずに挑むのは無謀なので、筋のよい遊び方では選ばない
    return v;
  }
  function fightPenalty(ids) {
    const s = S();
    const c = fightCost(Array.isArray(ids) ? ids : [ids]);
    if (!isFinite(c) || c >= s.hp) return 200;
    return c * 2 - 2;
  }
  function eventAction() {
    const s = S();
    const ch = G.eventChoices();
    let best = null;
    for (const { c, i } of ch) {
      if (c.cost && s.gold < c.cost) continue;
      let v;
      if (c.fight) v = -fightPenalty(G.resolveFoes(c.fight)) + (c.win ? outcomeValue(c.win) : 4);
      else if (c.stat) {
        const p = G.chance(c.stat, G.s5EventDiff(c.diff), c.bonus ? G.gearBonus(c.bonus) : 0) / 100;
        v = p * outcomeValue(c.ok) + (1 - p) * outcomeValue(c.ng) + 0.5;
      } else v = c.next ? 1 : outcomeValue(c.ok);
      if (c.cost) v -= c.cost / 8;
      if (!best || v > best.v) best = { v, i };
    }
    return best ? "ev:" + best.i : null;
  }

  // ---------------------------------------------------------------- 1 行動を選ぶ
  function choose() {
    const s = S();
    // 手に入れた装備は付ける（画面の持ち物欄と同じ）
    for (const id of Object.keys(s.inv)) {
      const it = D.ITEMS[id];
      if (!it || s.mode === "combat") continue;
      if (it.type === "weapon" && !it.cursed) {
        const cur = G.weapon();
        const sc = (w) => avg(w.dmg) * (G.chance(w.stat, 0, w.hit || 0) / 100) + (w.pierce ? 50 : 0);
        if (sc(it) > sc(cur) * 1.1) G.equip(id);
      } else if (it.type === "armor" && !it.cursed) {
        const cur = G.armor();
        if (!cur || it.def > cur.def) G.equip(id);
      }
    }
    const avail = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
    if (!avail.length) return null;
    const ok = (id) => id && avail.some((a) => a.id === id);
    let id = null;
    if (ok("rr:go") && (s.mode === "combat" || s.hp < s.maxHp * 0.5)) return "rr:go";
    if (s.mode === "combat") id = combatAction(avail);
    else if (s.mode === "event") id = eventAction();
    else if (s.mode === "fac") id = facAction(avail);
    else if (G.loc().type === "town") id = townAction();
    else id = fieldAction();
    if (ok(id)) return id;
    // 選んだ手ができないとき（金が足りない・その場に無い）：無難な手
    const safe = ["back", "fac:inn", "camp", "explore", "leave"].find(ok);
    return safe || avail.filter((a) => a.id !== "rr:go")[0].id;
  }

  return { choose, mem };
}
