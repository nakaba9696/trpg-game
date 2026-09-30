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

// ---------------------------------------------------------------- 1c. 装飾品の枠（I1）
{
  const G = loadEngine();
  const D = G.data;
  const before = failures;
  // データ：装飾品の効き目の欄が正しいか、I1 の品に入手先があるか
  const sources = new Set([...D.SHOP_BASE]);
  for (const L of Object.values(D.LOCS)) for (const it of L.shop || []) sources.add(it);
  for (const e of Object.values(D.ENEMIES)) for (const [it] of e.loot || []) sources.add(it);
  const addOut = (o) => { if (!o) return; for (const it of typeof o.item === "string" ? [o.item] : Object.keys(o.item || {})) sources.add(it); addOut(o.win); };
  for (const e of D.EVENTS) for (const c of e.choices) { addOut(c.ok); addOut(c.ng); addOut(c.win); }
  const i1 = Object.keys(D.ITEMS).filter((id) => id.startsWith("i1_"));
  if (i1.length !== 15) fail(`I1 の品が ${i1.length} 種（15 種のはず）`);
  for (const id of i1) if (!sources.has(id)) fail(`${id}: 入手先（店・落とし物・出来事）が無い`);
  for (const [id, it] of Object.entries(D.ITEMS)) {
    if (it.type !== "ring") continue;
    for (const k of Object.keys(it.stats || {})) if (!D.STATS.includes(k)) fail(`装飾品 ${id}: 能力値 ${k} が無い`);
    for (const k of Object.keys(it.bonus || {})) if (!["fire", "heal", "steal", "trap", "talk"].includes(k)) fail(`装飾品 ${id}: 補正の種類 ${k} が無い`);
  }
  // 付け外しと効き目
  G.rand = seeded(11);
  G.P = { trophies: {}, graves: [] };
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 40; caps[k] = 60; });
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  const S = G.S;
  delete S.ring; // 古いセーブには枠が無い
  const base = { str: G.chance("筋力", 0), steal: G.gearBonus("steal"), magic: G.magicBonus(), agi: G.statEff("敏捷") };
  if (G.ring() !== null) fail("古いセーブで装飾品があることになっている");
  if (G.unequip("ring")) fail("何も付けていないのに外せた");
  G.give("i1_fangring");
  if (!G.equip("i1_fangring") || S.ring !== "i1_fangring" || S.inv.i1_fangring) fail("装飾品を装備できない");
  if (G.chance("筋力", 0) !== base.str + 5) fail(`牙の指輪で筋力の判定が +5 にならない（${base.str}→${G.chance("筋力", 0)}）`);
  if (!G.has("i1_fangring")) fail("装備中の装飾品を持っていないことになる");
  G.give("i1_slipring");
  G.equip("i1_slipring");
  if (S.ring !== "i1_slipring" || S.inv.i1_fangring !== 1) fail("装飾品を付け替えると前の物が持ち物に戻らない");
  if (G.gearBonus("steal") !== base.steal + 10 || G.statEff("敏捷") !== base.agi + 5) fail("すり抜けの指輪の補正が効かない");
  G.give("i1_foxring");
  G.equip("i1_foxring");
  if (G.magicBonus() !== base.magic + 5 || G.gearBonus("fire") < 10) fail("狐火の指輪の魔法の補正が効かない");
  if (!G.unequip("ring") || S.ring || S.inv.i1_foxring !== 1) fail("装飾品を外せない");
  if (G.chance("筋力", 0) !== base.str || G.magicBonus() !== base.magic) fail("外したのに補正が残る");
  // 呪われた指輪は外すと HP が減るが、それで死にはしない
  G.give("i1_eyering");
  G.equip("i1_eyering");
  if (G.statEff("知力") !== 50 || G.statEff("魅力") !== 30) fail("覗き目の指輪の補正が効かない");
  S.hp = 2;
  G.unequip("ring");
  if (S.hp !== 1 || S.over) fail(`呪われた指輪を外したあとの HP が変 ${S.hp}`);
  S.hp = S.maxHp;
  G.equip("i1_eyering");
  G.unequip("ring");
  if (S.hp !== S.maxHp - 3) fail("呪われた指輪を外しても HP が減らない");
  if (G.equip("herb")) fail("薬草を装備できた");
  if (failures === before) ok(`装飾品の枠（装飾品 ${Object.values(D.ITEMS).filter((it) => it.type === "ring").length} 種・I1 の品 ${i1.length} 種すべてに入手先あり）`);
}

// ---------------------------------------------------------------- 2. ランダムに遊ぶ
{
  const G = loadEngine();
  const D = G.data;
  const GAMES = Number(process.env.GAMES || 150);
  const STEPS = Number(process.env.STEPS || 500);
  let deaths = 0, maxDay = 0, totalTurns = 0, bossKills = 0;
  const m2 = { talk: 0, betray: 0, leave: 0, death: 0, hired: 0 }; // 仲間の出来事（M2）が起きた回数
  const before = failures;
  // I1 の品が手に入った回数（G.give を数える）
  const gains = {};
  const give0 = G.give;
  G.give = (id, n) => { if (String(id).startsWith("i1_") && G.S.turn > 0) gains[id] = (gains[id] || 0) + (n || 1); return give0(id, n); };
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
        // ときどき持ち物の装備・装飾品の付け外しもする（画面の持ち物欄の代わり）
        if (step % 23 === 11 && G.S.mode !== "combat") {
          const gear = Object.keys(G.S.inv).filter((id) => ["weapon", "armor", "ring"].includes(G.itemInfo(id).type));
          if (G.S.ring && G.rand() < 0.3) G.unequip("ring");
          else if (gear.length) G.equip(gear[Math.floor(G.rand() * gear.length)]);
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
    for (const k of ["talk", "betray", "leave", "death"]) m2[k] += G.S.m2?.counts?.[k] || 0;
    for (const c of G.S.companions) if (!(c.bond >= 0 && c.bond <= 100) || !c.id || !G.data.M2_TRAITS[c.trait]) fail(`game ${g}: 仲間 ${c.name} の好感度か性格が変`);
    maxDay = Math.max(maxDay, G.S.day);
    totalTurns += G.S.turn;
    bossKills += G.S.counters.bosses;
  }
  G.give = give0;
  console.log(`NOTE ランダムプレイで仲間の出来事が起きた回数: 会話 ${m2.talk}・裏切り ${m2.betray}・去る ${m2.leave}・死別 ${m2.death}`);
  if (!m2.talk || !(m2.betray + m2.leave) || !m2.death) fail(`ランダムプレイで仲間の会話・裏切り・死別のどれかが一度も起きない（${JSON.stringify(m2)}）`);
  const gained = Object.entries(gains).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${D.ITEMS[id].name} ${n}`);
  console.log(`NOTE ランダムプレイで I1 の品が手に入った回数（${Object.keys(gains).length}/15 種）: ${gained.join("・") || "なし"}`);
  if (failures === before) ok(`ランダムに ${GAMES} 回遊ぶ（死亡 ${deaths}・最長 ${maxDay} 日・平均 ${Math.round(totalTurns / GAMES)} 手番・ボス撃破 ${bossKills}）`);
}

// ---------------------------------------------------------------- 2a. 仲間の個性（M2）：好感度・会話・裏切り・死別・古いセーブ
{
  const G = loadEngine();
  const D = G.data;
  const before = failures;
  const m2ev = D.EVENTS.filter((e) => e.id.startsWith("m2_"));
  if (m2ev.some((e) => !e.m2)) fail("M2: m2_ の出来事に m2 の欄が無い");
  // 見せる文に書かない言葉（神々のことは明かさない）
  const texts = [];
  const addO = (o) => { if (!o) return; for (const k of ["text", "memo", "chron"]) if (o[k]) texts.push(o[k]); addO(o.win); };
  for (const e of m2ev) { texts.push(e.title, e.text); for (const c of e.choices) { texts.push(c.label); addO(c.ok); addO(c.ng); addO(c.win); } }
  for (const t of Object.values(D.M2_TRAITS)) texts.push(...t.talk, t.betray, t.die, t.name);
  texts.push(...D.M2_RUMORS);
  for (const t of texts) if (/見世物|観客|客席|舞台|台本|神々が眺め/.test(t)) fail(`M2: 見せる文に書かない言葉がある「${t}」`);
  for (const [k, t] of Object.entries(D.M2_TRAITS)) if (!["steal", "knife", "sell", "leave"].includes(t.style) || t.talk.length < 3) fail(`M2: 性格 ${k} の欄が足りない`);
  // 今の性格の表（characters.js）は、どれも決まった性格に当たる
  for (const p of D.PROFILE.personality) if (!Object.values(D.M2_TRAITS).some((t) => t.re.test(p))) fail(`M2: 性格「${p}」に当たる M2 の性格が無い`);
  G.rand = seeded(31);
  G.P = { trophies: {}, graves: [] };
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  const start = () => G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  start();
  const S = G.S;
  S.maxHp = S.hp = 999;
  G.addCompanion("random");
  G.addCompanion({ name: "樽ゴブリンのダル", cls: "ゴブリン", power: 30, dmg: 1, desc: "酒好き。戦うときも酔っている。" });
  const [a, b] = S.companions;
  if (!a.id || !a.trait || !(a.bond > 0) || b.trait !== "drunk" || a.id === b.id) fail(`M2: 仲間に id・性格・好感度が付かない ${JSON.stringify(a)}`);
  // 「仲間と話す」→ 会話の出来事。{n} などが名前に置き換わる
  for (let i = 0; i < 40; i++) { a.talkDay = 0; G.m2Talk(a.id); if (S.event === "m2_grave" || S.event === "m2_share" && S.gold < 30) fail(`M2: 条件を満たさない会話 ${S.event}`); S.mode = "explore"; S.event = null; }
  S.m2.counts.talk = 0; a.talkDay = 0; a.bond = 50;
  const talkAct = G.actions().flatMap((x) => x.list).find((x) => x.id === "m2talk:" + a.id);
  if (!talkAct || talkAct.disabled) fail("M2: 「仲間と話す」が出ない");
  G.act("m2talk:" + a.id);
  if (S.mode !== "event" || !S.event.startsWith("m2_") || S.m2.focus !== a.id) fail(`M2: 話すと会話の出来事にならない（${S.mode} ${S.event}）`);
  if (S.log.some((l) => /\{(c|n|m|say|say2|dead)\}/.test(l.text || ""))) fail("M2: 文に {n} などが残る");
  if (G.actions()[0].list.some((x) => /\{/.test(x.label))) fail("M2: 選択肢に {n} などが残る");
  if (S.m2.counts.talk !== 1) fail("M2: 会話を数えない");
  if (S.event === "m2_grave") fail("M2: 死んだ仲間がいないのに、死んだ仲間の話をする");
  while (S.mode === "event") G.act(G.actions()[0].list[0].id);
  if (G.actions().flatMap((x) => x.list).find((x) => x.id === "m2talk:" + a.id)?.disabled !== true) fail("M2: 同じ日に何度も話せる");
  // 好感度が尽きると別れ話（性格ごとの去り方）
  S.day++;
  a.trait = "greedy"; a.bond = 5;
  S.gold = 200;
  G.act("m2talk:" + a.id);
  if (S.event !== "m2_betray_steal") fail(`M2: 好感度が尽きた がめつい仲間が持ち逃げしない（${S.event}）`);
  G.act("ev:1");
  if (S.companions.includes(a) || S.gold !== 100 || S.m2.counts.betray !== 1) fail(`M2: 持ち逃げで仲間が去らないか、金が半分にならない（${S.gold}）`);
  if (!S.chronicle.some((c) => c.kind === "comp" && c.text.includes(a.name) && c.text.includes("裏切"))) fail("M2: 裏切りが年表に残らない");
  // 刃を向けた仲間を討つ
  G.addCompanion({ name: "剣士のカイ", cls: "剣士", power: 50, dmg: 1, desc: "冷酷で、どこまでも合理的" });
  const k = S.companions.find((c) => c.name === "剣士のカイ");
  if (k.trait !== "cold") fail("M2: 説明から性格を拾えない");
  k.bond = 3;
  G.act("m2talk:" + k.id);
  if (S.event !== "m2_betray_knife") fail(`M2: 冷酷な仲間が刃を向けない（${S.event}）`);
  G.act("ev:0");
  if (S.mode !== "combat" || S.combat.foes[0].name !== "カイ" || S.companions.includes(k)) fail("M2: 裏切った仲間との戦いにならない");
  for (let i = 0; i < 40 && S.combat; i++) { S.combat.foes[0].hp = 1; G.act("cb:attack"); }
  if (!S.m2.gone.some((g) => g.id === k.id && g.how === "slain")) fail("M2: 討った仲間が記録に残らない");
  // 死別：深手 → 手番の終わりに看取り → 年表
  S.mode = "explore"; S.event = null; S.combat = null;
  G.m2Doom(b, "テストの深手");
  G.endTurn();
  if (S.event !== "m2_farewell" || S.m2.focus !== b.id) fail(`M2: 深手の仲間を看取る出来事が始まらない（${S.event}）`);
  G.act("ev:1");
  if (S.companions.includes(b) || S.m2.counts.death < 2) fail("M2: 看取ったのに仲間が残る");
  const dead = S.chronicle.find((c) => c.kind === "comp" && c.text.includes(b.name) && c.text.includes("死"));
  if (!dead || !dead.text.includes("テストの深手")) fail("M2: 死別が年表に残らない");
  if (!S.m2.gone.some((g) => g.id === b.id && g.how === "death" && g.date)) fail("M2: 死別の記録（S.m2.gone）が無い");
  // 古いセーブ：S.m2 も仲間の欄も無い
  start();
  const O = G.S;
  O.companions.push({ name: "脱走兵ヨアヒム", cls: "元帝国兵", power: 50, dmg: 2, desc: "元は帝国の槍兵。人を殺すのに疲れた。" }, { name: "弓使いのミラ", cls: "弓使い", power: 40, dmg: 1, desc: "よく分からない人" });
  delete O.m2;
  try {
    const acts = G.actions().flatMap((x) => x.list);
    if (!acts.some((x) => x.id.startsWith("m2talk:"))) fail("M2: 古いセーブで「仲間と話す」が出ない");
    const j = O.companions[0];
    if (j.trait !== "loyal" || j.bond !== 50 || !j.id) fail(`M2: 古いセーブの仲間の性格・好感度が変（${j.trait} ${j.bond}）`);
    for (let i = 0; i < 30 && !O.over; i++) { const l = G.actions().flatMap((x) => x.list).filter((x) => !x.disabled); G.act(l[Math.floor(G.rand() * l.length)].id); }
    const t1 = G.m2TraitOf({ name: "弓使いのミラ" }), t2 = G.m2TraitOf({ name: "弓使いのミラ" });
    if (t1 !== t2) fail("M2: 古いセーブの仲間の性格が読み込むたびに変わる");
  } catch (e) { fail("M2: 古いセーブで例外 " + (e.stack || e)); }
  if (failures === before) ok(`仲間の個性（性格 ${Object.keys(D.M2_TRAITS).length}・出来事 ${m2ev.length}・噂 ${D.M2_RUMORS.length}・会話・裏切り・討つ・看取り・古いセーブ）`);
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

// ---------------------------------------------------------------- 2c. 人物の絵（DOM なしの偽の canvas で描く）
{
  const G = loadEngine();
  const before = failures;
  const vmc = vm.createContext({ G });
  for (const f of ["art_monsters.js", "art_people.js"]) vm.runInContext(readFileSync(new URL("../src/ui/" + f, import.meta.url), "utf8"), vmc);
  const noop = () => {};
  const grad = { addColorStop: noop };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? () => grad : noop), set: (t, k, v) => ((t[k] = v), true) });
  G.rand = () => { throw new Error("絵が G.rand を使った"); };
  const kinds = Object.keys(G.PEOPLE);
  if (kinds.length < 8) fail(`人物の絵: 種類が ${kinds.length} しかない（8 以上）`);
  const draw = (who, label) => { try { G.paintPerson(ctx, 0, 0, 96, 120, who); } catch (err) { fail(`人物の絵 ${label}: 描くと例外 ${err.message}`); } };
  const sig = (who) => JSON.stringify(Object.assign({}, G.personLook(who), { seed: 0 }));
  // 種類ごとに、同じ種は同じ見た目・種が違えば違う見た目
  for (const k of kinds) {
    if (!G.PEOPLE[k].name) fail(`人物の絵 ${k}: name が無い`);
    for (const sex of ["男", "女", undefined]) for (let i = 0; i < 4; i++) draw({ kind: k, seed: "t" + i, sex }, `${k}/${sex}/${i}`);
    if (sig({ kind: k, seed: "a" }) !== sig({ kind: k, seed: "a" })) fail(`人物の絵 ${k}: 同じ種なのに見た目が変わる`);
    if (sig({ kind: k, seed: "a" }) === sig({ kind: k, seed: "b" })) fail(`人物の絵 ${k}: 種が違っても同じ見た目`);
  }
  // 主人公：職業ごとに違う見た目（同じ人物設定でも）
  const prof = { name: "テスト", sex: "男", age: "24", look: "黒髪、鋭い目つき、大柄な体" };
  const heroes = new Map();
  for (const cls of Object.keys(G.data.CLASSES)) {
    const who = G.heroWho(prof, cls);
    draw(who, `主人公 ${cls}`);
    for (const age of ["8", "70"]) draw(G.heroWho({ ...prof, age }, cls), `主人公 ${cls} ${age}歳`);
    const L = G.personLook(who);
    const key = [L.outfit, L.gear].join("/");
    if (heroes.has(key)) fail(`人物の絵: 主人公 ${cls} と ${heroes.get(key)} の服と装備が同じ`);
    heroes.set(key, cls);
    if (L.hair !== "#1c1a1e" || L.eyes !== "sharp" || L.build !== "broad") fail(`人物の絵: 主人公 ${cls} に外見の文（黒髪・鋭い・大柄）が効かない`);
  }
  // 出来事の who は、ある種類（か、ある敵）を指す
  let withWho = 0;
  const evIds = new Set(G.data.EVENTS.map((e) => e.id));
  for (const id of Object.keys(G.data.EVENT_WHO || {})) if (!evIds.has(id)) fail(`events_who.js: 出来事 ${id} が無い`);
  for (const e of G.data.EVENTS) {
    if (!G.eventWho(e)) continue;
    withWho++;
    const w = G.eventWho(e);
    if (w.kind === "foe") { if (!G.data.ENEMIES[w.foe]) fail(`出来事 ${e.id}: who の敵 ${w.foe} が無い`); continue; }
    if (!G.PEOPLE[w.kind]) fail(`出来事 ${e.id}: who の種類 ${w.kind} が無い（${kinds.join(", ")}）`);
    draw(w, `出来事 ${e.id}`);
  }
  if (G.eventWho({ id: "x" }) !== null) fail("人物の絵: who の無い出来事で絵を出そうとする");
  // 仲間（名前と職業から）
  for (const c of [{ name: "傭兵のラグナ", cls: "傭兵" }, { name: "僧侶のセラ", cls: "僧侶" }, { name: "謎の人", cls: "謎" }, { name: "樽ゴブリンのダル", cls: "ゴブリン" }]) {
    const w = G.companionWho(c);
    if (w.kind === "foe") { if (!G.data.ENEMIES[w.foe]) fail(`仲間 ${c.name}: 敵 ${w.foe} が無い`); } else draw(w, `仲間 ${c.name}`);
  }
  if (G.companionWho({ name: "僧侶のセラ", cls: "僧侶" }).sex !== "女") fail("人物の絵: 仲間の名前から性別を拾えない");
  if (failures === before) ok(`人物の絵（${kinds.length} 種・職業 ${heroes.size} つが別々の姿・who のある出来事 ${withWho} 件）`);
}

// ---------------------------------------------------------------- 保存の鍵の移し替え（古い名前 → Morsveld）
{
  const G = loadEngine();
  const before = failures;
  const mem = (init) => {
    const m = new Map(Object.entries(init));
    return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  };
  const K = G.SAVE_KEYS;
  if (!K || !/^morsveld-/.test(K.save) || !/^morsveld-/.test(K.profile)) fail("保存の鍵: 新しい鍵が Morsveld になっていない");
  const save = JSON.stringify({ v: 1, chron: [{ day: 1, text: "旅立ち" }] });
  const prof = JSON.stringify({ trophies: { first: 1 }, graves: [{ id: "g1", name: "名無し" }] });
  // 古い鍵だけ → 新しい鍵へ移り、古い鍵は消える（冒険・年表・トロフィー・墓碑）
  const OLD = { save: "koto" + "dama3-save", profile: "koto" + "dama3-profile" }; // 古い鍵（git grep に掛からないように分けて書く）
  const a = mem({ [OLD.save]: save, [OLD.profile]: prof });
  const moved = G.migrateSaveKeys(a);
  if (a.getItem(K.save) !== save) fail("保存の鍵: 古い冒険（年表）が移らない");
  if (a.getItem(K.profile) !== prof) fail("保存の鍵: 古いトロフィー・墓碑が移らない");
  if (a.m.has(OLD.save) || a.m.has(OLD.profile)) fail("保存の鍵: 古い鍵が残る");
  if (moved.length !== 2) fail("保存の鍵: 移したものの数が違う");
  // 新しい鍵が既にある → 上書きしない
  const b = mem({ [OLD.save]: save, [K.save]: "新しい" });
  G.migrateSaveKeys(b);
  if (b.getItem(K.save) !== "新しい") fail("保存の鍵: 新しいセーブを古いもので上書きする");
  // 二度目は何もしない・保存できない環境でも落ちない
  if (G.migrateSaveKeys(a).length) fail("保存の鍵: 二度目にも移し替える");
  G.migrateSaveKeys(null);
  G.migrateSaveKeys({ getItem() { throw new Error("blocked"); } });
  if (failures === before) ok("保存の鍵の移し替え（古い鍵 → " + K.save + "・" + K.profile + "）");
}

// ---------------------------------------------------------------- 3. 釣り合いの測定（失敗にはしない）
try {
  measureBalance();
} catch (e) {
  console.log("NOTE 釣り合いの測定を出せなかった（失敗にはしない）: " + (e.stack || e));
}

console.log(failures ? `DONE failures=${failures}` : "DONE failures=0");
process.exit(failures ? 1 : 0);
