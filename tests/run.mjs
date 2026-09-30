// エンジンの自動テスト（DOM なしで動く）。node tests/run.mjs
// 1. データの整合（存在しない場所・敵・アイテムを参照していないか）
// 2. ランダムに遊び続けるテスト（例外が出ないか、数値が範囲に収まるか）
// 3. 釣り合いの測定（職業ごとの数字を出すだけ。失敗にはしない）。tests/balance.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { loadEngine, seeded } from "./lib.mjs";
import { measureBalance } from "./balance.mjs";

let failures = 0;
const fail = (msg) => { failures++; console.log("FAIL " + msg); };
const ok = (msg) => console.log("OK   " + msg);

// ---------------------------------------------------------------- 1. データの整合
{
  const G = loadEngine();
  const D = G.data;
  const before = failures;
  for (const [id, L] of Object.entries(D.LOCS)) {
    for (const [to, days] of Object.entries(L.links || {})) {
      if (!D.LOCS[to]) fail(`${id}: 道の行き先 ${to} が無い`);
      else if (D.LOCS[to].links?.[id] !== days) fail(`${id}→${to}: 道が片道か、日数が食い違う`);
    }
    for (const to of Object.keys(L.sea || {})) if (!D.LOCS[to]?.sea?.[id]) fail(`${id}→${to}: 船が片道`);
    for (const e of L.pool || []) if (!D.ENEMIES[e]) fail(`${id}: 敵 ${e} が無い`);
    for (const it of L.shop || []) if (!D.ITEMS[it]) fail(`${id}: 店の品 ${it} が無い`);
    if (L.boss && !D.ENEMIES[L.boss]) fail(`${id}: ボス ${L.boss} が無い`);
    if (L.reward?.item && !D.ITEMS[L.reward.item]) fail(`${id}: 報酬 ${L.reward.item} が無い`);
    for (const m of Object.values(L.midboss || {})) if (!D.ENEMIES[m]) fail(`${id}: 中ボス ${m} が無い`);
    if (L.type === "town" && !(L.fac || []).length) fail(`${id}: 町なのに施設が無い`);
    if (L.type === "dungeon" && !(L.floors > 0 && L.boss)) fail(`${id}: 迷宮の階数かボスが無い`);
    if (L.type !== "town" && !(L.pool || []).length) fail(`${id}: 敵が出ない`);
  }
  for (const it of D.SHOP_BASE) if (!D.ITEMS[it]) fail(`SHOP_BASE: ${it} が無い`);
  for (const [id, e] of Object.entries(D.ENEMIES)) for (const [it] of e.loot || []) if (!D.ITEMS[it]) fail(`敵 ${id}: 落とし物 ${it} が無い`);
  for (const [id, c] of Object.entries(D.CLASSES)) {
    if (!D.LOCS[c.start]) fail(`職業 ${id}: 出発地 ${c.start} が無い`);
    for (const it of [c.weapon, c.armor, ...Object.keys(c.items)].filter(Boolean)) if (!D.ITEMS[it]) fail(`職業 ${id}: ${it} が無い`);
    for (const k of D.STATS) if (typeof c.base[k] !== "number") fail(`職業 ${id}: 能力値 ${k} が無い`);
    if (!D.PROFILE.history[id]) fail(`職業 ${id}: 生い立ちの表が無い`);
  }
  const evIds = new Set(D.EVENTS.map((e) => e.id));
  if (evIds.size !== D.EVENTS.length) fail("出来事の id が重複している");
  const checkOutcome = (where, o) => {
    if (!o) return;
    const items = typeof o.item === "string" ? [o.item] : Object.keys(o.item || {});
    for (const it of items) if (!D.ITEMS[it]) fail(`${where}: アイテム ${it} が無い`);
    for (const k of Object.keys(o.grow || {})) if (!D.STATS.includes(k)) fail(`${where}: 能力値 ${k} が無い`);
    const foes = o.fight ? (Array.isArray(o.fight) ? o.fight : [o.fight]) : [];
    for (const f of foes) if (f !== "@pool" && !D.ENEMIES[f]) fail(`${where}: 敵 ${f} が無い`);
    if (o.next && !evIds.has(o.next)) fail(`${where}: 続きの出来事 ${o.next} が無い`);
    if (o.trophy && !D.TROPHIES.some((t) => t.key === o.trophy)) fail(`${where}: トロフィー ${o.trophy} が無い`);
    checkOutcome(where + ".win", o.win);
  };
  for (const e of D.EVENTS) {
    if (!e.choices?.length) fail(`出来事 ${e.id}: 選択肢が無い`);
    e.choices.forEach((c, i) => {
      const w = `出来事 ${e.id}[${i}]`;
      if (c.stat && !D.STATS.includes(c.stat)) fail(`${w}: 能力値 ${c.stat} が無い`);
      if (c.diff && D.DIFF[c.diff] === undefined) fail(`${w}: 難易度 ${c.diff} が無い`);
      checkOutcome(w + ".ok", c.ok);
      checkOutcome(w + ".ng", c.ng);
      checkOutcome(w, { fight: c.fight, next: c.next, win: c.win });
    });
  }
  for (const [id, L] of Object.entries(D.LOCS)) if (L.reward?.trophy && !D.TROPHIES.some((t) => t.key === L.reward.trophy)) fail(`${id}: トロフィー ${L.reward.trophy} が無い`);
  if (failures === before) ok(`データの整合（場所 ${Object.keys(D.LOCS).length}・敵 ${Object.keys(D.ENEMIES).length}・アイテム ${Object.keys(D.ITEMS).length}・出来事 ${D.EVENTS.length}）`);
}

// ---------------------------------------------------------------- 1a. どの場所にも、どの出発地からも道か船で行ける
{
  const G = loadEngine();
  const D = G.data;
  const before = failures;
  for (const [cls, c] of Object.entries(D.CLASSES)) {
    const seen = new Set([c.start]), queue = [c.start];
    while (queue.length) {
      const L = D.LOCS[queue.shift()];
      for (const to of [...Object.keys(L?.links || {}), ...Object.keys(L?.sea || {})]) if (!seen.has(to)) { seen.add(to); queue.push(to); }
    }
    for (const id of Object.keys(D.LOCS)) if (!seen.has(id)) fail(`職業 ${cls}: 出発地 ${c.start} から ${id} へ行けない`);
    for (const [id, L] of Object.entries(D.LOCS)) if (!(L.x >= 0 && L.x <= 100 && L.y >= 0 && L.y <= 100)) fail(`${id}: 地図の位置が無い`);
  }
  if (failures === before) ok(`どの場所にも行ける（場所 ${Object.keys(D.LOCS).length}）`);
}

// ---------------------------------------------------------------- 1b. 敵の台詞と逃げ方（engine/foe_quirks.js）
{
  const G = loadEngine();
  const D = G.data;
  const before = failures;
  for (const [id, e] of Object.entries(D.ENEMIES)) {
    if (e.fleeAt !== undefined && !(e.fleeAt > 0 && e.fleeAt < 1)) fail(`敵 ${id}: fleeAt は 0〜1`);
    if (e.fleeAt && e.boss) fail(`敵 ${id}: ボスは逃げない`);
    for (const k of Object.keys(e.lines || {})) {
      if (k === "flee") { if (typeof e.lines.flee !== "string") fail(`敵 ${id}: lines.flee は文字列`); }
      else if (k === "open" || k === "turn") { if (!Array.isArray(e.lines[k]) || !e.lines[k].every((s) => typeof s === "string" && s)) fail(`敵 ${id}: lines.${k} は文字列の配列`); }
      else fail(`敵 ${id}: lines.${k} は使われない`);
    }
  }
  // 深手の臆病者が逃げると、倒したことにならず戦闘が終わる
  G.rand = seeded(7);
  G.P = { trophies: {}, graves: [] };
  const cls = Object.keys(D.CLASSES)[0];
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
  G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  G.S.maxHp = G.S.hp = 999;
  G.startCombat(["e1_crowngob"], {});
  const kills = G.S.counters.kills;
  let fled = false;
  for (let i = 0; i < 20 && G.S.combat; i++) {
    G.S.combat.foes[0].hp = 1;
    G.combatAct("guard");
    if (!G.S.combat) fled = G.S.counters.kills === kills;
  }
  if (!fled) fail("王冠ゴブリンが深手を負っても逃げない");
  if (G.S.mode !== "explore") fail(`敵が逃げたあとの mode が変 ${G.S.mode}`);
  if (failures === before) ok(`敵の台詞と逃げ方（台詞あり ${Object.values(D.ENEMIES).filter((e) => e.lines).length} 種・逃げる ${Object.values(D.ENEMIES).filter((e) => e.fleeAt).length} 種）`);
}

// ---------------------------------------------------------------- 2. ランダムに遊ぶ
{
  const G = loadEngine();
  const D = G.data;
  const GAMES = Number(process.env.GAMES || 150);
  const STEPS = Number(process.env.STEPS || 500);
  let deaths = 0, maxDay = 0, totalTurns = 0, bossKills = 0;
  const before = failures;
  for (let g = 0; g < GAMES; g++) {
    G.rand = seeded(1000 + g);
    G.P = { trophies: {}, graves: [] };
    const cls = Object.keys(D.CLASSES)[g % 5];
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; caps[k] = stats[k] + 30; });
    const goal = Object.keys(D.GOALS)[g % 4];
    G.newGame({ cls, stats, caps, goal, profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    // 一部は金持ちや強者で始めて、奥の場所や王城も通るようにする
    if (g % 3 === 0) { G.S.gold = 5000; G.S.fame = 700; }
    if (g % 4 === 0) {
      D.STATS.forEach((k) => { G.S.stats[k] = 80; G.S.caps[k] = 95; });
      G.S.maxHp = G.maxHpOf(G.S.stats); G.S.hp = G.S.maxHp; G.S.maxMp = G.maxMpOf(G.S.stats); G.S.mp = G.S.maxMp;
      G.give("volgrim"); G.equip("volgrim");
    }
    try {
      for (let step = 0; step < STEPS && !G.S.over; step++) {
        const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
        if (!acts.length) { fail(`game ${g} step ${step}: できる行動が無い（mode=${G.S.mode} fac=${G.S.fac} loc=${G.S.loc}）`); break; }
        if (step % 17 === 0) {
          const a = acts[Math.floor(G.rand() * acts.length)];
          if (!G.parse(a.label)) fail(`game ${g}: 「${a.label}」を読み取れない`);
        }
        const a = acts[Math.floor(G.rand() * acts.length)];
        G.act(a.id);
        const S = G.S;
        if (!(S.hp >= 0 && S.hp <= S.maxHp)) fail(`game ${g} step ${step}: HP が範囲外 ${S.hp}/${S.maxHp}（${a.id}）`);
        if (!(S.mp >= 0 && S.mp <= S.maxMp)) fail(`game ${g} step ${step}: MP が範囲外 ${S.mp}/${S.maxMp}（${a.id}）`);
        if (S.gold < 0 || !Number.isFinite(S.gold)) fail(`game ${g} step ${step}: 所持金が変 ${S.gold}（${a.id}）`);
        for (const k of D.STATS) if (S.stats[k] > S.caps[k]) fail(`game ${g}: ${k} が限界を超えた`);
        if (!["explore", "fac", "event", "combat", "over"].includes(S.mode)) fail(`game ${g}: mode が変 ${S.mode}`);
        if (S.mode === "combat" && !S.combat) fail(`game ${g}: 戦闘中なのに combat が無い`);
        if (S.mode === "event" && !S.event) fail(`game ${g}: 出来事中なのに event が無い`);
        if (!D.LOCS[S.loc]) fail(`game ${g}: 場所が変 ${S.loc}`);
        if (failures - before > 20) throw new Error("失敗が多すぎるので打ち切り");
      }
      // 自由入力 → GM の結果の当てはめ（Claude の代わりに決まった答えを使う）
      if (!G.S.over) {
        const res = { check: { stat: "魅力", difficulty: "普通" }, intro: "試す", success: { text: "うまくいった", gold: 999, hp: 50, item: "謎の鍵" }, failure: { text: "だめだった", hp: -3 } };
        G.gmApply("門番を口説く", res);
        if (G.S.gold < 0) fail(`game ${g}: GM の結果で所持金が負`);
      }
    } catch (e) {
      fail(`game ${g}: 例外 ${e.stack || e}`);
      if (failures - before > 20) break;
    }
    if (G.S.over === "dead") deaths++;
    maxDay = Math.max(maxDay, G.S.day);
    totalTurns += G.S.turn;
    bossKills += G.S.counters.bosses;
  }
  if (failures === before) ok(`ランダムに ${GAMES} 回遊ぶ（死亡 ${deaths}・最長 ${maxDay} 日・平均 ${Math.round(totalTurns / GAMES)} 手番・ボス撃破 ${bossKills}）`);
}

// ---------------------------------------------------------------- 2b. モンスターの絵（DOM なしの偽の canvas で描く）
{
  const G = loadEngine();
  const before = failures;
  vm.runInContext(readFileSync(new URL("../src/ui/art_monsters.js", import.meta.url), "utf8"), vm.createContext({ G }));
  // 何を呼んでも受け流す偽の 2D 文脈
  const noop = () => {};
  const grad = { addColorStop: noop };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? () => grad : noop), set: (t, k, v) => ((t[k] = v), true) });
  const seen = new Map();
  G.rand = () => { throw new Error("絵が G.rand を使った"); };
  for (const [id, e] of Object.entries(G.data.ENEMIES)) {
    const a = G.monsterLook(id, e), b = G.monsterLook(id, e);
    const sig = JSON.stringify(Object.assign({}, a, { seed: 0 }));
    if (sig !== JSON.stringify(Object.assign({}, b, { seed: 0 }))) fail(`絵 ${id}: 同じ敵なのに見た目が変わる`);
    if (seen.has(sig)) fail(`絵 ${id}: ${seen.get(sig)} と見た目がまったく同じ`);
    seen.set(sig, id);
    if (e.boss && !a.aura) fail(`絵 ${id}: ボスなのにオーラが無い`);
    if (e.majin && !a.barrier) fail(`絵 ${id}: 魔人なのに絶界が無い`);
    try { G.paintMonster(ctx, 200, 240, 120, { id, shape: e.shape, eye: e.eye, boss: !!e.boss }); } catch (err) { fail(`絵 ${id}: 描くと例外 ${err.message}`); }
  }
  // look の指定が優先され、書いていない部品は無しになる
  const custom = G.monsterLook("zz_test", { shape: "humanoid", tier: 3, look: { body: "blob", skin: "#123456" } });
  if (custom.body !== "blob" || custom.skin !== "#123456" || custom.tail !== "none") fail("絵: look の指定が効かない");
  try { G.paintMonster(ctx, 200, 240, 120, { id: "zz_unknown", shape: "dragon" }); } catch (err) { fail(`絵: データに無い敵で例外 ${err.message}`); }
  if (failures === before) ok(`モンスターの絵（${seen.size} 種が別々の見た目・ボスはオーラ・魔人は絶界）`);
}

// ---------------------------------------------------------------- 3. 釣り合いの測定（失敗にはしない）
try {
  measureBalance();
} catch (e) {
  console.log("NOTE 釣り合いの測定を出せなかった（失敗にはしない）: " + (e.stack || e));
}

console.log(failures ? `DONE failures=${failures}` : "DONE failures=0");
process.exit(failures ? 1 : 0);
