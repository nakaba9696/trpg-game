// 筋のよいボット：目的ごとに決まった手順で遊ぶ（乱数は G.rand を固定して使う）。
// 画面と同じく G.actions() に出ている行動だけを G.act() で選ぶ。節目の問い（S.m6.pending）には、
// 画面のボタンと同じ G.endStory / G.m6GoOn で答える。
// Q4（目的の道筋）の tests/goals.mjs・tests/checks/q4_goals.mjs が使う。釣り合いの測定（Q2）からも使える。
//
//   const bot = makeBot(G, "king");      // 目的
//   for (...) { if (!bot.step()) break; } // 1 行動ずつ
//
// 考え方（人が遊ぶときの素直な手順）：
//   - 傷ついたら休む（町なら宿、野外なら野営、迷宮の奥なら引き返す）。毒と呪い・獣の病（1〜2 段）は教会で祓い、正気が削れたら宿と懺悔で戻す
//   - 持っているだけで何かを奪う品は手放す。噛んで病をうつす敵からは、うつされたら逃げる
//   - 町に着いたら、終えた依頼を報告し、戦利品を売り、薬を買い足し、よい武具を買い、腕のよい仲間を雇い、訓練する
//   - 自分の腕に合った危険度の場所で依頼をこなし、名声と金を積む
//   - 目的の手順（王城で位を願う・迷宮の主を倒す・交易で稼ぐ）へ、準備ができたら向かう
//   - ボスに勝てるかは、今の冒険を写して別の乱数で何度か戦わせて見積もる（本物の状態と乱数は元に戻す）
//   - 出来事では、成功しやすく損の少ない選択肢を選ぶ。罪になる選択肢と、物語を終える選択肢は選ばない

// 目的ごとの「準備ができた」の目安と、向かう先
export const PLANS = {
  // 自分で決める：ふつうに冒険を続ける（節目はしばらく遊べば着く）
  custom: { steps: [] },
  // 大富豪：交易（Q4）で稼ぐ。荷車を買い、土地の品を遠くへ運ぶ
  rich: { steps: [] },
  // 成り上がる：騎士 → 領主 → 王位
  king: { steps: ["knight", "lord", "throne"] },
  // 伝説の剣：鬼ヶ島（聖刀白夜）。強くなれば竜の墓場（魔剣）も
  sword: { steps: ["blade"] },
  // 使徒を討つ：伝説の剣を得てから、勝てる見込みのある近い使徒の居城へ
  majin: { steps: ["blade", "castle"] },
};

const TRAIN_OF = { merc: ["筋力", "体力", "敏捷"], samurai: ["筋力", "体力", "敏捷"], thief: ["敏捷", "体力", "筋力"], mage: ["魔力", "体力", "敏捷"], priest: ["魔力", "筋力", "体力"] };

const mulberry = (seed) => {
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
};

export function makeBot(G, goal, opt = {}) {
  const D = G.data;
  const info = { goal, reached: null, reachedTurn: 0, reachedDay: 0, stuck: 0, lastBad: null };
  const flat = () => G.actions().flatMap((g) => g.list);
  const avail = (id) => flat().find((a) => a.id === id && !a.disabled);
  const has = (id) => (G.S.inv[id] || 0) > 0;
  const hpr = () => G.S.hp / G.S.maxHp;
  const cls = () => G.S.cls;
  const isMage = () => cls() === "mage";

  // ------------------------------------------------------------ 地図：いちばん日数の少ない道（陸路と船）
  const edges = (id) => {
    const L = D.LOCS[id];
    const out = Object.entries(L.links || {}).map(([to, d]) => ({ to, d, act: "travel:" + to }));
    for (const [to, s] of Object.entries(L.sea || {})) out.push({ to, d: s.days, act: "sail:" + to, cost: s.cost });
    return out;
  };
  const route = (from, to) => {
    if (from === to) return [];
    const dist = { [from]: 0 }, prev = {}, done = new Set();
    for (;;) {
      let u = null;
      for (const k of Object.keys(dist)) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k;
      if (u === null) return null;
      if (u === to) break;
      done.add(u);
      // 危ない所は、腕が足りないうちは通らない（遠回りでも）
      for (const e of edges(u)) {
        const T = D.LOCS[e.to];
        const extra = e.to !== to && (T.danger || 0) > safeDanger() ? 50 : 0;
        const nd = dist[u] + e.d + extra;
        if (dist[e.to] === undefined || nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = { u, e }; }
      }
    }
    const path = [];
    for (let v = to; v !== from; v = prev[v].u) path.unshift(prev[v].e);
    return path;
  };
  const daysTo = (to) => { const r = route(G.S.loc, to); return r ? r.reduce((a, e) => a + e.d, 0) : 999; };

  // ------------------------------------------------------------ 腕前の目安
  // 武器の一撃の期待値（命中 × 傷）。敵の守り def を引いて測る
  const weaponValue = (id, def = 10) => {
    const w = D.ITEMS[id];
    if (!w || w.type !== "weapon") return 0;
    const S = G.S;
    const stat = S.stats[w.stat] || 0;
    const hit = Math.min(95, Math.max(5, stat + (w.hit || 0) - def)) / 100;
    const avg = w.dmg[0] * (w.dmg[1] + 1) / 2 + w.dmg[2] + (w.stat === "筋力" ? Math.floor(S.stats.筋力 / 15) : Math.floor(S.stats.敏捷 / 20));
    return hit * avg + (w.pierce ? 100 : 0);
  };
  const armorValue = (id) => {
    const a = D.ITEMS[id];
    if (!a || a.type !== "armor") return 0;
    return a.def * 3 + (a.agi || 0) / 5 + (isMage() ? (a.magic || 0) / 2 : 0);
  };
  // 腕前：1 撃の期待値 × 生き延びる手数。仲間の分も足す
  const power = () => {
    const S = G.S;
    const atk = isMage() ? Math.max(weaponValue(S.weapon), (Math.min(95, S.stats.魔力 + 10) / 100) * (7 + S.stats.魔力 / 8)) : weaponValue(S.weapon);
    const comp = (S.companions || []).reduce((a, c) => a + (c.power / 100) * (3.5 + (c.dmg || 0)), 0);
    const def = (G.armor() ? G.armor().def : 0);
    return (atk + comp) * (S.maxHp + def * 6);
  };
  // 危険度ごとに要る腕前（大まかに。1 = 森、4 = 山脈、6 = 使徒の城）
  const NEED = [0, 0, 150, 280, 420, 600, 800];
  const safeDanger = () => { const p = power(); let d = 1; for (let i = 1; i < NEED.length; i++) if (p >= NEED[i]) d = i; return Math.min(d, 5); };
  // ボスに勝てるか：今の冒険を写して、別の乱数で n 回戦わせてみる（本物の G.S・G.P・G.rand は元に戻す）
  // now: 今の HP で（迷宮の奥の扉の前）。そうでなければ、宿で休んだあとの体で
  const simCache = {};
  const simWin = (ids, now, n = 16) => {
    const S0 = G.S, P0 = G.P, r0 = G.rand;
    const key = [ids.join(","), now ? S0.hp : "full", S0.mp, S0.weapon, S0.armor, S0.ring, S0.companions.map((c) => c.power).join("/"), D.STATS.map((k) => S0.stats[k]).join("/"), S0.maxHp, JSON.stringify(S0.inv)].join("|");
    if (simCache[key] !== undefined) return simCache[key];
    const snap = JSON.stringify(S0), psnap = JSON.stringify(P0);
    let wins = 0;
    try {
      for (let i = 0; i < n; i++) {
        const S = (G.S = JSON.parse(snap));
        G.P = JSON.parse(psnap);
        G.rand = mulberry(9001 + i * 7919 + S0.turn);
        if (!now) { S.hp = S.maxHp; S.mp = S.maxMp; S.conds = []; }
        S.mode = "explore"; S.event = null; S.fac = null; S.combat = null;
        if (S.m6) S.m6.pending = null;
        G.startCombat(ids, {});
        for (let k = 0; k < 300 && S.mode === "combat" && !S.over; k++) {
          const id = combatChoice();
          if (!id) break;
          G.act(id);
        }
        if (!S.over && S.mode !== "combat" && S.counters.bosses > JSON.parse(snap).counters.bosses) wins++;
      }
    } finally { G.S = S0; G.P = P0; G.rand = r0; }
    return (simCache[key] = wins / n);
  };
  // 旅の支度の見立ては、30 手番に一度だけ測り直す（重いので）
  const planned = {};
  const bossReady = (boss, mult = 1, now = false) => {
    const need = mult >= 1 ? 0.85 : 0.7;
    if (now) return simWin([boss], true) >= need;
    const p = planned[boss];
    if (!p || G.S.turn - p.turn >= 30) planned[boss] = { turn: G.S.turn, v: simWin([boss], false, 12) };
    return planned[boss].v >= need;
  };
  const potions = () => ["potion", "herb", "elixir"].reduce((a, k) => a + (G.S.inv[k] || 0) * (k === "elixir" ? 3 : k === "herb" ? 0.45 : 1), 0);

  // ------------------------------------------------------------ 施設を使う
  const inFac = (f) => G.S.mode === "fac" && G.S.fac === f;
  const leaveFac = () => (G.S.mode === "fac" ? "back" : null);
  // 世界の出来事（M4）で閉まっている施設は使えない
  const closed = (loc, f) => !!(G.m4Off && G.m4Off(loc, G.S)["fac:" + f]);
  const townHas = (f) => (G.loc().fac || []).includes(f) && !closed(G.S.loc, f);
  // 施設の中の行動を選ぶ（施設に入っていなければ入る）
  const facDo = (f, id) => {
    if (inFac(f)) return avail(id) ? id : "back";
    if (G.S.mode === "fac") return "back";
    return townHas(f) ? "fac:" + f : null;
  };

  // ------------------------------------------------------------ 戦闘
  const combatChoice = () => {
    const S = G.S;
    const C = S.combat;
    const list = flat();
    const get = (id) => list.find((a) => a.id === id && !a.disabled);
    const pct = (a) => (a ? Number((a.sub.match(/(\d+)%/) || [0, 0])[1]) : 0);
    const boss = C.boss;
    // 回復
    const low = hpr() < (boss ? 0.45 : 0.35);
    if (low) {
      if (cls() === "priest" && get("cb:heal") && pct(get("cb:heal")) >= 50) return "cb:heal";
      const miss = S.maxHp - S.hp;
      const order = miss >= 18 ? ["potion", "elixir", "herb", "riceball", "jerky"] : ["herb", "potion", "riceball", "jerky", "elixir"];
      if (hpr() < 0.2 && boss && get("cb:item:elixir")) return "cb:item:elixir";
      for (const k of order) if (get("cb:item:" + k)) return "cb:item:" + k;
      if (!boss) {
        if (get("cb:item:smoke")) return "cb:item:smoke";
        if (get("cb:flee") && pct(get("cb:flee")) >= 35) return "cb:flee";
        if (get("cb:talk") && pct(get("cb:talk")) >= 35) return "cb:talk";
      }
    }
    // 病をうつす敵からは、うつされたら逃げる（噛まれるたびに病が進む）
    if (!boss && (S.beast || 0) >= 1 && G.alive().some((f) => D.ENEMIES[f.id].bite)) {
      if (get("cb:item:smoke")) return "cb:item:smoke";
      if (get("cb:flee") && pct(get("cb:flee")) >= 25) return "cb:flee";
    }
    // 不死には聖水
    const t = G.target();
    if (t && D.ENEMIES[t.id].undead && get("cb:item:holywater")) return "cb:item:holywater";
    // 魔法と武器の期待値を比べる
    const w = G.weapon();
    const wAvg = w.dmg[0] * (w.dmg[1] + 1) / 2 + w.dmg[2] + (w.stat === "筋力" ? Math.floor(S.stats.筋力 / 15) : Math.floor(S.stats.敏捷 / 20));
    const cand = [];
    const atk = get("cb:attack");
    if (atk) cand.push(["cb:attack", (pct(atk) / 100) * wAvg]);
    const vit = get("cb:vital");
    if (vit) cand.push(["cb:vital", (pct(vit) / 100) * (w.dmg[0] * (w.dmg[1] + 1) / 2 + w.dmg[2] + Math.floor(S.stats.敏捷 / 15)) * 2]);
    const fire = get("cb:fire");
    const majinWall = t && D.ENEMIES[t.id].majin && !w.pierce;
    if (fire && !majinWall && S.mp >= 3) cand.push(["cb:fire", (pct(fire) / 100) * (7 + Math.floor(S.stats.魔力 / 8)) * (S.mp >= 9 || boss ? 1 : 0.8)]);
    const bolt = get("cb:bolt");
    if (bolt && !majinWall && G.alive().length > 1) cand.push(["cb:bolt", (pct(bolt) / 100) * (5 + Math.floor(S.stats.魔力 / 12)) * G.alive().length]);
    const ice = get("cb:ice");
    if (ice && !majinWall && boss) cand.push(["cb:ice", (pct(ice) / 100) * (3.5 + Math.floor(S.stats.魔力 / 10)) * 1.8]);
    cand.sort((a, b) => b[1] - a[1]);
    if (cand.length) return cand[0][0];
    return list.find((a) => !a.disabled)?.id;
  };

  // ------------------------------------------------------------ 出来事
  const DEEDS = D.DEEDS || {};
  const outcomeScore = (o, S) => {
    if (!o) return 0;
    let s = 0;
    if (o.m6end) return -1000;          // 物語を終える選択肢（光の壁）は選ばない
    if (o.gold) s += Math.max(-S.gold, o.gold) / 10;
    if (o.fame) s += o.fame * 2;
    if (o.hp) s += o.hp < 0 ? (S.hp + o.hp <= 3 ? -200 : o.hp * 2) : Math.min(o.hp, S.maxHp - S.hp);
    if (o.heal === "full") s += (S.maxHp - S.hp);
    if (o.item) s += 5;
    if (o.grow) s += 8 * Object.values(o.grow).reduce((a, b) => a + b, 0);
    if (o.cond) s -= 15;
    if (o.crime || o.infamy) s -= 40;
    if (o.sin) s -= 10 * o.sin;
    if (o.dropCompanion) s -= 30;
    if (o.fight) s += hpr() > 0.7 ? -5 : -60;
    if (o.e3fight) s -= 1000;          // 使徒に挑む（E3）は選ばない
    if (o.days) s -= o.days;
    if (o.companion) s += (S.companions.length < 3 ? 10 : 0);
    return s;
  };
  const eventChoice = () => {
    const S = G.S;
    const e = D.EVENTS.find((x) => x.id === S.event);
    const acts = flat().filter((a) => a.id.startsWith("ev:") && !a.disabled);
    if (!acts.length) return flat().find((a) => !a.disabled)?.id;
    let best = null, bestS = -Infinity;
    for (const a of acts) {
      const i = Number(a.id.slice(3));
      const c = e ? e.choices[i] : null;
      let s = 0;
      if (c) {
        if (c.fight) s += hpr() > 0.7 && safeDanger() >= (G.loc().danger || 1) ? 5 : -60;
        if (c.cost) s -= c.cost / (S.gold > 3000 ? 40 : 8);
        if (c.stat) {
          const p = G.chance(c.stat, c.diff || "普通", c.bonus ? G.gearBonus(c.bonus) : 0) / 100;
          s += p * outcomeScore(c.ok, S) + (1 - p) * outcomeScore(c.ng, S) + p * 3;
        } else s += outcomeScore(c.ok, S);
        // 目的の使徒に挑む選択肢（居城の最奥の謁見）
        const foe = c.fight && (Array.isArray(c.fight) ? c.fight[0] : c.fight);
        if (goal === "majin" && foe && D.ENEMIES[foe] && D.ENEMIES[foe].majin && !(G.majinSlain && G.majinSlain(S).length)) s += bossReady(foe, 1, true) ? 1000 : -1000;
        const deed = DEEDS[e.id + ":" + i];
        if (deed) s -= 40;
        if (c.ok && c.ok.m6end) s = -1000;
      }
      if (s > bestS) { bestS = s; best = a.id; }
    }
    return best;
  };

  // ------------------------------------------------------------ 町でのこと
  const bestShopWeapon = () => {
    const S = G.S;
    const list = flat().filter((a) => a.id.startsWith("shop:buy:") && !a.disabled);
    let best = null, bv = weaponValue(S.weapon) * 1.1 + 0.3;
    for (const a of list) {
      const id = a.id.slice(9);
      const it = D.ITEMS[id];
      if (it.type !== "weapon" || it.price > S.gold - reserve()) continue;
      if (isMage() && !it.magic && D.ITEMS[S.weapon]?.magic) continue;
      const v = weaponValue(id);
      if (v > bv) { bv = v; best = a.id; }
    }
    return best;
  };
  const bestShopArmor = () => {
    const S = G.S;
    const list = flat().filter((a) => a.id.startsWith("shop:buy:") && !a.disabled);
    let best = null, bv = armorValue(S.armor) + 0.5;
    for (const a of list) {
      const id = a.id.slice(9);
      const it = D.ITEMS[id];
      if (it.type !== "armor" || it.price > S.gold - reserve()) continue;
      const v = armorValue(id);
      if (v > bv) { bv = v; best = a.id; }
    }
    return best;
  };
  // 目的のために残しておく金
  const reserve = () => {
    const S = G.S;
    if (goal === "rich") return Math.max(60, S.gold * 0.6);
    if (goal === "king") {
      if (!S.title) return S.fame >= 110 ? 520 : 60;
      if (S.title === "騎士") return S.fame >= 240 ? Math.min(3050, S.gold) : 60;
    }
    return 60;
  };
  const wantPotions = () => (safeDanger() >= 3 ? 6 : 3);

  // 町で済ませること。null なら町の用は済んだ。施設ごとに「その町に着いてから一度」入り、中でできることを済ませて出る
  let arrivedAt = "", visitKey = "";
  const done = {};
  let trainCount = 0;
  const shopWant = () => {
    const S = G.S;
    // 持っているだけで何かを奪う品は、真っ先に手放す
    const bad = Object.keys(S.inv).find((id) => { const it = D.ITEMS[id]; return it && it.toll && it.type !== "use" && !it.key && avail("shop:sell:" + id); });
    if (bad) return "shop:sell:" + bad;
    const tr = tradeShop();
    if (tr) return tr;
    const loot = Object.keys(S.inv).find((id) => { const it = G.itemInfo(id); return it && !(D.ITEMS[id] && D.ITEMS[id].key) && (it.type === "loot" || (it.toll && it.type !== "use") || ((it.type === "weapon" || it.type === "armor") && id !== S.weapon && id !== S.armor && it.price > 0 && !it.pierce)); });
    if (loot && avail("shop:sell:" + loot)) return "shop:sell:" + loot;
    const w = bestShopWeapon();
    if (w) return w;
    const a = bestShopArmor();
    if (a) return a;
    const buy = (id, n, price) => (S.inv[id] || 0) < n && S.gold - price >= reserve() && avail("shop:buy:" + id) ? "shop:buy:" + id : null;
    return buy("potion", wantPotions(), 30) || (isMage() || cls() === "priest" ? buy("manawater", 2, 25) : null) || (safeDanger() >= 3 ? buy("smoke", 1, 15) : null)
      || (bossTarget() === "bonedragon" ? buy("holywater", 4, 40) : null) || (S.gold > 1500 ? buy("elixir", 1, 300) : null) || null;
  };
  const tavernWant = () => {
    const S = G.S;
    if (S.companions.length >= 3 || !S.recruits) return null;
    const hire = flat().filter((a) => a.id.startsWith("tavern:hire:") && !a.disabled).map((a) => ({ a, c: S.recruits.list[Number(a.id.slice(12))] }))
      .filter(({ c }) => c && c.fee <= S.gold - reserve() && c.power >= 30).sort((x, y) => y.c.power - x.c.power)[0];
    return hire ? hire.a.id : null;
  };
  // 武具を買うための蓄え（まだ良い武具が無いうち）
  const gearFund = () => {
    const S = G.S;
    if (bladeHave()) return 0;
    if (isMage()) return S.armor === "robe" ? 0 : 250;
    const w = D.ITEMS[S.weapon] || {};
    const a = D.ITEMS[S.armor] || { def: 0 };
    return (weaponValue(S.weapon) < weaponValue("mithril") ? 700 : 0) + (a.def < 4 ? 500 : 0);
  };
  const trainWant = () => {
    const S = G.S;
    if (S.gold - 30 < reserve() + 40 + gearFund() || trainCount > 300) return null;
    // 得意な能力値を、今の値が低いものから（体力は HP になる）
    const k = (TRAIN_OF[cls()] || ["筋力"]).filter((st) => S.stats[st] < S.caps[st] && S.stats[st] < 90)
      .sort((a, b) => S.stats[a] * (a === TRAIN_OF[cls()][0] ? 0.8 : 1) - S.stats[b] * (b === TRAIN_OF[cls()][0] ? 0.8 : 1))[0];
    return k && avail("train:" + k) ? "train:" + k : null;
  };
  const guildWant = () => {
    const S = G.S;
    const q = S.quests.find((x) => x.done);
    if (q && avail("guild:report:" + q.id)) return "guild:report:" + q.id;
    if (S.quests.length >= 3 || !S.board) return null;
    const take = flat().filter((a) => a.id.startsWith("guild:take:") && !a.disabled).map((a) => ({ a, q: S.board.list.find((x) => "guild:take:" + x.id === a.id) }))
      .filter(({ q }) => q && (q.type === "deliver" ? daysTo(q.loc) <= 6 : (D.LOCS[q.loc].danger || 0) <= safeDanger() && daysTo(q.loc) <= 8))
      .sort((x, y) => y.q.reward / (1 + daysTo(y.q.loc)) - x.q.reward / (1 + daysTo(x.q.loc)))[0];
    return take ? take.a.id : null;
  };
  const townChores = () => {
    const S = G.S;
    const L = G.loc();
    if (L.type !== "town") return null;
    if (arrivedAt !== S.loc) { arrivedAt = S.loc; visitKey = S.loc + ":" + S.turn; }
    // 中にいる施設で、まだすることがあれば続ける
    const inside = S.mode === "fac" ? S.fac : null;
    const wants = {
      church: () => {
        const beast = S.beast || 0;
        if (beast >= 1 && beast <= 2 && avail("m5:purge")) return "m5:purge";
        if (typeof S.sanity === "number" && S.sanity < 60 && avail("m5:confess")) return "m5:confess";
        if ((S.conds.includes("毒") || S.conds.includes("呪い")) && avail("church:heal")) return "church:heal";
        return null;
      },
      inn: () => ((hpr() < 0.99 || S.mp < S.maxMp || (typeof S.sanity === "number" && S.sanity < 85)) && avail("inn:rest") && lastRest !== S.day ? "inn:rest" : null),
      shop: shopWant, tavern: tavernWant, train: trainWant, guild: guildWant,
    };
    if (inside) {
      const w = wants[inside] ? wants[inside]() : null;
      if (w) { if (w === "inn:rest") lastRest = S.day + 1; return w; }
      done[visitKey + ":" + inside] = true;
      return "back";
    }
    // 入るべき施設
    const need = {
      church: () => ((S.beast || 0) >= 1 && (S.beast || 0) <= 2 && S.gold >= 120) || (typeof S.sanity === "number" && S.sanity < 60 && S.gold >= 20) || ((S.conds.includes("毒") || S.conds.includes("呪い")) && S.gold >= 15),
      guild: () => S.quests.some((q) => q.done) || S.quests.length < 3,
      inn: () => (hpr() < 0.99 || S.mp < S.maxMp) && S.gold >= 10 && lastRest !== S.day,
      shop: () => true,
      tavern: () => S.companions.length < 3 && S.gold - reserve() >= 60,
      train: () => S.gold - 30 >= reserve() + 40 + gearFund(),
    };
    for (const f of ["guild", "church", "inn", "shop", "tavern", "train", "guild"]) {
      if (!townHas(f) || done[visitKey + ":" + f] || !need[f]()) continue;
      // 訓練は、した後にもう一度入れるように（次の日の分）
      if (f === "train" && trainWant === null) continue;
      return "fac:" + f;
    }
    return null;
  };
  let lastRest = -1;
  // 町を出るとき・長くいたときに、施設をもう一度見られるようにする
  const refreshVisit = () => { const S = G.S; if (G.loc().type === "town" && S.turn - Number(visitKey.split(":")[1] || 0) > 12) visitKey = S.loc + ":" + S.turn; };

  // ------------------------------------------------------------ 動き
  const goTo = (to) => {
    const S = G.S;
    if (S.loc === to) return null;
    const r = route(S.loc, to);
    if (!r || !r.length) return null;
    const e = r[0];
    if (e.cost && S.gold < e.cost) return null;
    if (S.mode === "fac") return "back";
    if (G.loc().type === "dungeon" && S.depth > 0) return "leave";
    // 危ない道に出る前に傷を治す
    return e.act;
  };
  // 野外や迷宮で休む
  const restHere = () => {
    const S = G.S;
    const L = G.loc();
    if (L.type === "dungeon" && S.depth > 0) return "leave";
    if (avail("camp")) return "camp";
    return null;
  };
  // 腕試し：依頼の場所か、腕に合った近くの野外・迷宮
  const grindBan = {};
  const grindSpot = () => {
    const S = G.S;
    const q = S.quests.find((x) => !x.done && x.type !== "deliver" && (D.LOCS[x.loc].danger || 0) <= safeDanger());
    if (q) return { loc: q.loc, q };
    const sd = safeDanger();
    const here = S.loc;
    let best = null, bs = -Infinity;
    for (const [id, L] of Object.entries(D.LOCS)) {
      if (L.type === "town" || !L.pool) continue;
      if ((L.danger || 0) > sd || (grindBan[id] || 0) > S.day) continue;
      if (L.type === "dungeon" && id !== bladeLoc() && S.flags[(L.reward && L.reward.flag) || "boss:" + id] === undefined && (L.danger || 0) >= sd) continue;
      const s = (L.danger || 0) * 10 - daysTo(id) * 2 + (id === here ? 3 : 0);
      if (s > bs) { bs = s; best = id; }
    }
    return { loc: best || "forest", q: null };
  };
  const nearestTown = (need) => {
    let best = null, bd = 999;
    for (const [id, L] of Object.entries(D.LOCS)) {
      if (L.type !== "town") continue;
      if (need && !need.every((f) => (L.fac || []).includes(f) && !closed(id, f))) continue;
      const d = daysTo(id);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  };

  // ------------------------------------------------------------ 目的の手順
  const bladeHave = () => has("volgrim") || has("byakuya") || G.S.weapon === "volgrim" || G.S.weapon === "byakuya";
  const bladeLoc = () => (G.S.flags.shuten ? "graveyard" : "onigashima");
  const bossTarget = () => {
    if ((goal === "sword" || goal === "majin") && !bladeHave()) return bladeLoc() === "onigashima" ? "shuten" : "bonedragon";
    if (goal === "majin") return "graw";
    return null;
  };
  const dungeonRun = (loc, boss) => {
    // 迷宮に潜る。主の前（最後の階の手前）で傷が浅ければ進む
    const S = G.S;
    const L = D.LOCS[loc];
    if (S.loc !== loc) return goTo(loc);
    if (S.mode === "fac") return "back";
    const nextIsBoss = S.depth + 1 >= L.floors;
    const mid = L.midboss && L.midboss[S.depth + 1] && !S.flags[`mid:${loc}:${S.depth + 1}`];
    const foeNext = nextIsBoss ? L.boss : mid ? L.midboss[S.depth + 1] : null;
    const tired = foeNext ? !bossReady(foeNext, 1, true) || (isMage() && S.mp < 6) : hpr() < 0.55;
    if (tired) {
      // 入口なら野営、奥なら薬を飲むか引き返す
      if (S.depth === 0) return "camp";
      const miss = S.maxHp - S.hp;
      if (miss >= 15 && has("potion")) return useOut("potion");
      if (has("herb") && miss >= 8) return useOut("herb");
      if (nextIsBoss || mid) { if (has("elixir")) return useOut("elixir"); }
      return "leave";
    }
    // 主や中ボスに勝てる見込みがなければ、その手前で引き返す
    const bossFlag = (L.reward && L.reward.flag) || "boss:" + loc;
    if (nextIsBoss && !S.flags[bossFlag] && !bossReady(L.boss)) return S.depth ? "leave" : null;
    if (mid && !bossReady(L.midboss[S.depth + 1])) return S.depth ? "leave" : null;
    if (nextIsBoss && S.flags[bossFlag]) return S.depth ? "leave" : null;
    return avail("deeper") ? "deeper" : "leave";
  };
  // 探索中に物を使う（画面の持ち物の「使う」と同じ G.useItem）。行動ではないので、手番は進めない
  const useOut = (id) => ({ use: id });

  // ------------------------------------------------------------ 交易（Q4）：土地の品を箱で仕入れ、高く売れる町へ運ぶ
  const Q4 = D.Q4;
  const trading = () => !!Q4 && (goal === "rich" || (goal === "king" && G.S.title === "騎士" && G.S.gold < 3000 && G.S.fame >= 200));
  const cargo = () => (Q4 ? Object.keys(Q4.GOODS).filter((id) => G.S.inv[id]) : []);
  const capBoxes = () => (G.S.inv[Q4.CART.id] ? Q4.LOAD_CART : Q4.LOAD);
  const shopTowns = () => Object.keys(D.LOCS).filter((k) => D.LOCS[k].type === "town" && (D.LOCS[k].fac || []).includes("shop") && !closed(k, "shop"));
  // 荷を売るのによい町（1 日あたりの売り上げ）
  const bestSellTown = () => {
    let best = null, bv = -1;
    for (const t of shopTowns()) {
      const d = t === G.S.loc ? 0 : daysTo(t);
      if (d > 12) continue;
      const v = cargo().reduce((a, id) => a + (Q4.GOODS[id].from === t ? 0 : G.q4SellPrice(id, t) * G.S.inv[id]), 0) / (d + 2);
      if (v > bv) { bv = v; best = t; }
    }
    return best;
  };
  // 仕入れに行く町と、売る町（1 日あたりの利ざや）
  const bestRun = () => {
    const S = G.S;
    const money = S.gold - 80;
    let best = null, bv = 0;
    for (const [id, g] of Object.entries(Q4.GOODS)) {
      const buy = G.q4BuyPrice(id, g.from);
      const n = Math.min(capBoxes(), Math.floor(money / buy));
      if (n < 2) continue;
      const d0 = g.from === S.loc ? 0 : daysTo(g.from);
      if (d0 > 12) continue;
      for (const t of shopTowns()) {
        if (t === g.from) continue;
        const d1 = route(g.from, t);
        if (!d1) continue;
        const dd = d1.reduce((a, e) => a + e.d, 0);
        // 同じ町で売るほど値が下がる（一箱ごとに 2%）。船賃も引く
        const p0 = G.q4SellPrice(id, t);
        let rev = 0;
        for (let k = 0; k < n; k++) rev += p0 * Math.max(0.7, 1 - 0.02 * k) * 0.92;
        const fare = d1.reduce((a, e) => a + (e.cost || 0), 0);
        const gain = (rev - buy * n - fare) / (d0 + dd + 2);
        if (gain > bv) { bv = gain; best = { id, from: g.from, to: t, n }; }
      }
    }
    return bv >= 8 ? best : null;
  };
  let tradeRun = null;
  const tradeShop = () => {
    // 店の中：荷を売る・仕入れる・荷車を買う
    const S = G.S;
    if (!Q4 || !trading()) return null;
    const here = S.loc;
    for (const id of cargo()) {
      if (Q4.GOODS[id].from === here) continue;
      const t = tradeRun && tradeRun.id === id && tradeRun.to && !closed(tradeRun.to, "shop") ? tradeRun.to : bestSellTown();
      const avg = (S.q4 && S.q4.cost[id] || 0) / S.inv[id];
      const p = G.q4SellPrice(id, here);
      if (t === here || !t || (p >= G.q4SellPrice(id, t) * 0.92 && p >= avg)) { if (avail("q4:sell:" + id)) return "q4:sell:" + id; }
    }
    if (avail("q4:cart") && S.gold >= Q4.CART.price + 250) return "q4:cart";
    const run = tradeRun && tradeRun.from === here ? tradeRun : null;
    if (run && (S.inv[run.id] || 0) < run.n && avail("q4:buy:" + run.id) && S.gold - G.q4BuyPrice(run.id, here) >= 80) { run.bought = true; return "q4:buy:" + run.id; }
    return null;
  };
  const tradePlan = () => {
    const S = G.S;
    if (!Q4 || !trading() || G.loc().type === "dungeon" && S.depth > 0) return null;
    // 荷車（積める箱が増える）を買いに行く
    if (!S.inv[Q4.CART.id] && S.gold >= Q4.CART.price + 250 && !cargo().length) {
      const t = Q4.CART.sold.slice().sort((a, b) => daysTo(a) - daysTo(b))[0];
      if (S.loc !== t) { const g = goTo(t); if (g) return g; }
      else if (!inFac("shop")) return S.mode === "fac" ? "back" : "fac:shop";
      else if (avail("q4:cart")) return "q4:cart";
    }
    // 仕入れの途中：積めるだけ積む
    if (tradeRun && S.loc === tradeRun.from && (S.inv[tradeRun.id] || 0) < tradeRun.n && S.gold - G.q4BuyPrice(tradeRun.id, S.loc) >= 80 && cargo().length <= 1) {
      if (!inFac("shop")) return S.mode === "fac" ? "back" : "fac:shop";
      if (avail("q4:buy:" + tradeRun.id)) { tradeRun.bought = true; return "q4:buy:" + tradeRun.id; }
    }
    if (cargo().length) {
      // 仕入れたときに決めた売り先へ（閉まっていれば、そのとき一番よい町へ）
      const t = tradeRun && tradeRun.to && !closed(tradeRun.to, "shop") && cargo().includes(tradeRun.id) ? tradeRun.to : bestSellTown();
      if (!t) return null;
      if (t !== S.loc) { const g = goTo(t); if (g) return g; tradeRun = null; return null; }
      if (!inFac("shop")) return S.mode === "fac" ? "back" : "fac:shop";
      return shopWant() || "back";
    }
    if (tradeRun && tradeRun.bought && !cargo().length) tradeRun = null;
    if (!tradeRun || S.turn - (tradeRun.turn || 0) > 60) { tradeRun = bestRun(); if (tradeRun) tradeRun.turn = S.turn; }
    if (!tradeRun) return null;
    if (S.loc !== tradeRun.from) return goTo(tradeRun.from);
    if (!inFac("shop")) return S.mode === "fac" ? "back" : "fac:shop";
    const b = tradeShop();
    if (b) return b;
    tradeRun = null;
    return "back";
  };

  const planAction = () => {
    const S = G.S;
    const steps = PLANS[goal].steps;
    if (hpr() >= 0.6 && !(S.beast >= 1)) { const t = tradePlan(); if (t) return t; }
    for (const step of steps) {
      if (step === "knight") {
        if (S.title) continue;
        if (S.fame >= 150 && S.gold >= 500) return knightAt();
        return null;
      }
      if (step === "lord") {
        if (S.title !== "騎士") continue;
        if (S.fame >= 300 && S.gold >= 3000) return castleDo(S.titleAtLoc || "leavel", "castle:lord");
        return null;
      }
      if (step === "throne") {
        if (S.title !== "領主") continue;
        if (S.fame >= 600 && bossReady("royalguard") && hpr() > 0.95) return castleDo("leavel", "castle:throne");
        return null;
      }
      if (step === "blade") {
        if (bladeHave()) continue;
        const loc = bladeLoc();
        const boss = D.LOCS[loc].boss;
        if (bossReady(boss) || (S.loc === loc && S.depth > 0 && bossReady(boss, 0.8))) return dungeonRun(loc, boss);
        return null;
      }
      if (step === "castle") {
        if (S.flags.graw) continue;
        // 伝説の剣を持つ
        for (const k of ["volgrim", "byakuya"]) if (has(k) && S.weapon !== k && S.inv[k]) G.equip(k);
        if (G.majinSlain && G.majinSlain(S).length) continue;
        // 使徒の居城のうち、勝てる見込みがあって近いところ（主と中ボスの両方）
        const lairs = Object.entries(D.LOCS).filter(([, L]) => L.type === "dungeon" && L.boss && D.ENEMIES[L.boss].majin)
          .map(([id, L]) => ({ id, L, d: S.loc === id ? 0 : daysTo(id) })).sort((a, b) => a.d - b.d);
        for (const { id, L } of lairs) {
          const foes = [L.boss, ...Object.values(L.midboss || {})];
          if (S.loc === id && S.depth > 0) return dungeonRun(id, L.boss);
          if (foes.every((f) => bossReady(f))) return dungeonRun(id, L.boss);
        }
        return null;
      }
    }
    return null;
  };
  const castleDo = (loc, id) => {
    const S = G.S;
    if (S.loc !== loc) return goTo(loc);
    return facDo("castle", id);
  };
  const knightAt = () => castleDo("leavel", "castle:knight");

  // ------------------------------------------------------------ 1 行動
  let recovering = false;
  const hist = [];
  // 買った武具を身に着ける（画面の持ち物の「装備する」と同じ G.equip。手番は進まない）
  const equipBest = () => {
    const S = G.S;
    if (S.mode === "combat") return;
    // 持っているだけで何かを奪う装飾品は外す（外したものは店で売る）
    if (S.ring && D.ITEMS[S.ring] && D.ITEMS[S.ring].toll && !D.ITEMS[S.ring].cursed) G.unequip("ring");
    for (const id of Object.keys(S.inv)) {
      const it = D.ITEMS[id];
      if (!it || it.cursed) continue;
      if (it.type === "weapon" && weaponValue(id) > weaponValue(S.weapon) && !(isMage() && D.ITEMS[S.weapon]?.magic && !it.magic && !it.pierce)) G.equip(id);
      else if (it.type === "armor" && armorValue(id) > armorValue(S.armor)) G.equip(id);
    }
  };
  const choose = () => {
    const S = G.S;
    refreshVisit();
    equipBest();
    if (S.mode === "combat") return combatChoice();
    if (S.mode === "event") return eventChoice();
    // 迷宮の奥で傷ついた
    if (G.loc().type === "dungeon" && S.depth > 0 && hpr() < 0.4) {
      const miss = S.maxHp - S.hp;
      if (has("potion") && miss >= 15) return useOut("potion");
      if (has("herb")) return useOut("herb");
      return "leave";
    }
    // 正気が削れてきたら、町で休む（宿で眠る・教会で懺悔する）。戻りきるまで町にいる
    const san = typeof S.sanity === "number" ? S.sanity : 100;
    if (san < 50 || (recovering && san < 80)) {
      recovering = true;
      if (G.loc().type === "dungeon" && S.depth > 0) return "leave";
      const t = nearestTown(["church", "inn"]) || nearestTown(["inn"]);
      if (t && S.loc !== t) { const g = goTo(t); if (g) return g; }
      if (S.loc === t) {
        if (inFac("church") && avail("m5:confess")) return "m5:confess";
        if (!inFac("church") && townHas("church") && (S.m5 || {}).confessed !== S.day && S.gold >= 20) return inFac("inn") || S.mode === "fac" ? "back" : "fac:church";
        if (inFac("inn") && avail("inn:rest")) return "inn:rest";
        if (S.mode === "fac" && !inFac("inn")) return "back";
        if (S.gold >= 10) return "fac:inn";
      }
    } else recovering = false;
    // 獣の病：祓える町へ急ぐ（金が足りなければ、その近くで稼ぐ）
    if ((S.beast || 0) >= 1 && (S.beast || 0) <= 2) {
      const t = nearestTown(["church"]);
      if (t && S.gold >= 120) {
        if (S.loc !== t) { const g = goTo(t); if (g) return g; }
        else return inFac("church") ? "m5:purge" : S.mode === "fac" ? "back" : "fac:church";
      }
    }
    // 目的の手順（準備ができていれば）
    const plan = planAction();
    if (plan) return plan;
    // 町の用事
    const chore = townChores();
    if (chore) return chore;
    // 傷ついたら休む
    if (hpr() < 0.6 || S.conds.includes("毒")) {
      if (G.loc().type !== "town") {
        const t = nearestTown(["inn"]);
        if (t && daysTo(t) <= 2 && S.gold >= 10) return goTo(t);
        const r = restHere();
        if (r) return r;
      }
    }
    // 届け物
    const dq = S.quests.find((q) => !q.done && q.type === "deliver");
    if (dq && daysTo(dq.loc) <= 8) return goTo(dq.loc);
    // 依頼を終えていれば、ギルドのある町へ
    if (S.quests.some((q) => q.done)) { const t = nearestTown(["guild"]); if (t) return goTo(t) || (G.S.mode === "fac" ? "back" : null); }
    // 仲間と話す（十日も口をきかないと不満がたまる）
    const talk = flat().find((a) => a.id.startsWith("m2talk:") && !a.disabled && (() => { const c = S.companions.find((x) => "m2talk:" + x.id === a.id); return c && S.day - (c.talkDay || c.joined || 0) >= 4; })());
    if (talk) return talk.id;
    // 腕試し
    const spot = grindSpot();
    if (S.loc !== spot.loc) {
      // 金があって町にいるなら、町の用事を先に（上で済ませた）。行き先へ
      return goTo(spot.loc);
    }
    const L = G.loc();
    if (L.type === "dungeon") { const r = dungeonRun(spot.loc); if (r) return r; grindBan[S.loc] = S.day + 20; return goTo(grindSpot().loc) || "camp"; }
    if (avail("explore")) return "explore";
    return flat().find((a) => !a.disabled)?.id;
  };

  const step = () => {
    const S = G.S;
    if (!S || S.over) return false;
    // 節目の問い（画面のボタン）
    if (S.m6 && S.m6.pending && S.mode !== "combat") {
      const m = D.M6.MILESTONES.find((x) => x.id === S.m6.pending);
      if (m && m.goal === goal) {
        if (!info.reached) { info.reached = m.id; info.reachedTurn = S.turn; info.reachedDay = S.day; }
        if (opt.onMilestone) { const r = opt.onMilestone(m); if (r === "stop") return false; }
        if (opt.endAtGoal !== false) { G.endStory(m.id); return false; }
      }
      G.m6GoOn();
    }
    let id = choose();
    if (id && typeof id === "object" && id.use) {
      G.useItem(id.use);
      id = null;
      return true;
    }
    if (!id || !avail(id)) {
      // 選べなかった：外に出るか、できることを何か
      info.stuck++;
      info.lastBad = id;
      id = flat().find((a) => !a.disabled && (a.id === "back" || a.id === "explore" || a.id === "camp" || a.id === "walk"))?.id || flat().find((a) => !a.disabled)?.id;
      if (!id) return false;
    }
    // 同じ所を行き来するだけで日が進まない（ボットの迷い）なら、町を歩くか探索して抜ける
    hist.push(`${S.day}|${S.loc}|${id}`);
    if (hist.length > 12) hist.shift();
    if (hist.length === 12 && new Set(hist.map((h) => h.split("|")[0] + h.split("|")[1])).size === 1 && new Set(hist.map((h) => h.split("|")[2])).size <= 3) {
      info.stuck++;
      hist.length = 0;
      id = S.mode === "fac" ? "back" : (flat().find((a) => !a.disabled && ["walk", "explore", "camp"].includes(a.id)) || flat().find((a) => !a.disabled && a.id.startsWith("travel:")) || {}).id || id;
    }
    G.act(id);
    return true;
  };

  return { step, info, power, safeDanger, bossReady, route };
}

// 決まった形で冒険を始める（作成画面と同じ振り方。ボーナス点は職業の得意な能力値へ）
// strong: true なら丈夫な体（HP 999・能力値 70）で始める。道筋そのものが通るかを、腕前と切り離して確かめる用
export function startRun(G, { goal, cls, seed, seeded, strong }) {
  const D = G.data;
  G.rand = seeded(seed);
  G.P = { trophies: {}, graves: [] };
  // 作成画面と同じ振り方（G.cre.quickStats。S2）。ボーナス点は均等に配る
  const { stats, caps } = G.cre.quickStats(cls, G.rand);
  G.newGame({ cls, stats, caps, goal, goalText: goal === "custom" ? "自分の店を持つ" : undefined,
    profile: { name: "ボット", sex: "女", age: 24, history: "借金のかたに傭兵団へ売られ、腕一本で抜け出した", personality: "無口だが義理堅い" } });
  if (strong) {
    const S = G.S;
    D.STATS.forEach((k) => { S.stats[k] = Math.max(S.stats[k], 70); S.caps[k] = 99; });
    S.maxHp = S.hp = 999;
  }
  return G.S;
}
