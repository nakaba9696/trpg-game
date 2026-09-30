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

// ---------------------------------------------------------------- 1d. 評判と悪名（M3。core.js・engine/m3_repute.js・data/events_m3.js）
{
  const G = loadEngine();
  const D = G.data;
  const before = failures;
  // データ：罪の表・既存の出来事の悪行・倒すと罪になる相手・出来事の結果の罪
  const evById = Object.fromEntries(D.EVENTS.map((e) => [e.id, e]));
  for (const [k, d] of Object.entries(D.DEEDS)) {
    const [id, i] = k.split(":");
    if (!evById[id]?.choices[Number(i)]) fail(`D.DEEDS ${k}: 出来事か選択肢が無い`);
    if (!D.CRIMES[d.crime]) fail(`D.DEEDS ${k}: 罪 ${d.crime} が無い`);
    if (d.on && !["ok", "ng", "any"].includes(d.on)) fail(`D.DEEDS ${k}: on は ok / ng / any`);
  }
  for (const [id, c] of Object.entries(D.LAWFUL)) { if (!D.ENEMIES[id]) fail(`D.LAWFUL: 敵 ${id} が無い`); if (!D.CRIMES[c]) fail(`D.LAWFUL ${id}: 罪 ${c} が無い`); }
  const m3 = D.EVENTS.filter((e) => e.id.startsWith("m3_"));
  for (const e of m3) e.choices.forEach((c, i) => [c.ok, c.ng, c.win].forEach((o) => { if (o?.crime && !D.CRIMES[o.crime]) fail(`出来事 ${e.id}[${i}]: 罪 ${o.crime} が無い`); }));
  for (const L of Object.values(D.LOCS)) if (L.type === "town" && !L.nation && D.LAWLESS.includes(L.region)) fail(`${L.name}: 町なのに衛兵のいない地域`);

  G.rand = seeded(31);
  G.P = { trophies: {}, graves: [] };
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 90; caps[k] = 95; });
  const start = () => {
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.loc = "karna"; G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  // 古いセーブ（repute・sin・titleAt が無い）でも動く
  let S = start();
  delete S.repute; delete S.sin;
  try {
    G.actions(); G.reputeLabel(); G.endTurn();
    if (G.wanted() || G.infamyHere() !== 0 || G.wantedIn().length) fail("悪名: 古いセーブで手配されている");
    if (D.EVENTS.find((e) => e.id === "m3_poster").cond(S)) fail("悪名: 古いセーブで手配書の出来事が起きる");
    if (S.repute) fail("悪名: 読むだけで repute が作られた");
  } catch (e) { fail(`悪名: 古いセーブで例外 ${e.message}`); }
  // 盗みを重ねると、その国でだけ賞金首になる
  const nation = G.nationOf();
  if (nation !== "自由都市連合") fail(`悪名: カルナの国が ${nation}`);
  for (let i = 0; i < 4; i++) G.crime("theft");
  if (G.wanted()) fail("悪名: 盗み 4 回（24）で手配された");
  G.crime("theft");
  if (!G.wanted() || G.bounty(nation) !== 300) fail(`悪名: 盗み 5 回（30）で手配されない（悪名 ${G.infamyHere()}）`);
  if (!S.chronicle.some((c) => c.text.includes("賞金首"))) fail("悪名: 賞金首になったことが年表に無い");
  if (!G.reputeLabel().includes("手配中")) fail(`悪名: 見出しに出ない「${G.reputeLabel()}」`);
  if (G.wanted("聖王国リーヴェル")) fail("悪名: よその国でも手配された");
  if (!D.EVENTS.find((e) => e.id === "m3_eyes").cond(S)) fail("悪名: 手配中なのに衛兵の出来事が起きない");
  S.loc = "plains";
  if (G.wanted()) fail("悪名: 国境を越えても手配されている");
  if (!D.EVENTS.find((e) => e.id === "m3_hunter").cond(S)) fail("悪名: よその国で賞金稼ぎが来ない");
  // 日が経つと薄れ、線より 10 下がると手配が解ける
  S.loc = "karna";
  S.day += 100; G.reputeTick();
  if (G.infamyHere() !== 20 || !G.wanted()) fail(`悪名: 100 日後の悪名 ${G.infamyHere()}（20・手配のまま のはず）`);
  S.day += 10; G.reputeTick();
  if (G.wanted()) fail("悪名: 線より 10 下がっても手配が解けない");
  // 評判（その国で稼いだ名声）が高いと、手配の線が上がる
  S = start();
  G.addFame(200);
  if (G.repOf("自由都市連合").rep !== 200 || G.bountyLine("自由都市連合") !== 50) fail(`悪名: 評判 ${G.repOf("自由都市連合").rep}・線 ${G.bountyLine("自由都市連合")}`);
  G.crime("murder"); G.crime("murder");
  if (G.wanted()) fail("悪名: 評判が高いのに悪名 40 で手配された");
  // 衛兵を倒すと人殺し。王位を奪う一騎打ちは罪にならない
  S = start();
  G.startCombat(["guard"], {});
  for (let i = 0; i < 30 && S.combat; i++) { S.combat.foes.forEach((f) => { f.hp = 1; }); G.combatAct("attack"); }
  if (G.infamyHere() !== D.CRIMES.murder.inf || S.sin !== D.CRIMES.murder.sin) fail(`悪名: 衛兵を倒しても人殺しにならない（悪名 ${G.infamyHere()}・罪 ${S.sin}）`);
  S = start();
  S.loc = "wasteland"; G.crime("murder");
  if (Object.keys(S.repute || {}).length || S.sin !== D.CRIMES.murder.sin) fail("悪名: 魔物界の罪が国の悪名になった／罪の匂いが残らない");
  // 手配された国の位は取り上げられ、城では位を願い出られない
  S = start();
  S.loc = "leavel"; S.gold = 5000; S.fame = 700; S.fac = "castle";
  G.exploreAct("castle", "knight");
  if (S.title !== "騎士" || S.titleAt !== "聖王国リーヴェル") fail(`悪名: 騎士の位の国が残らない ${S.titleAt}`);
  G.crime("murder"); G.crime("murder");
  if (S.title) fail("悪名: 手配されても騎士の位が残る");
  const knight = G.facActions().flatMap((g) => g.list).find((x) => x.id === "castle:knight");
  if (!knight?.disabled) fail("悪名: 手配中なのに騎士の位を願い出られる");
  G.exploreAct("castle", "audience");
  if (S.mode !== "event" || S.event !== "m3_castle" || S.fac) fail(`悪名: 手配中に城へ入っても捕まらない（${S.mode} ${S.event}）`);
  // 王位を奪うとその国の悪名は消える
  S = start(); S.loc = "leavel"; G.crime("murder"); G.apply({ title: "国王" });
  if (G.infamyHere() || G.wanted()) fail("悪名: 国王になっても悪名が残る");
  // 既存の出来事の悪行（出来事ファイルは書き換えず D.DEEDS で）
  for (const [k, d] of Object.entries(D.DEEDS)) {
    const [id, i] = k.split(":");
    let got = false;
    for (let t = 0; t < 40 && !got; t++) {
      S = start();
      if (evById[id].where.some((w) => D.LOCS[w])) S.loc = evById[id].where.find((w) => D.LOCS[w]);
      if (!G.nationOf()) S.loc = "karna";
      S.gold = 9999; S.flags.v1_debt = true;
      G.startEvent(id);
      G.chooseEvent(Number(i));
      const inf = G.infamyHere();
      if (inf === D.CRIMES[d.crime].inf) got = true;
      else if (inf) { fail(`D.DEEDS ${k}: 悪名が ${inf}（${D.CRIMES[d.crime].inf} のはず）`); got = true; }
    }
    if (!got) fail(`D.DEEDS ${k}: 40 回試しても悪名が付かない`);
  }
  // 仲間を売ると裏切り、鈴の執行人が来る。首を差し出すと罪の匂いが消える
  S = start();
  G.addCompanion("random"); G.S.sin = 12;
  G.startEvent("m3_sellout"); G.chooseEvent(0);
  if (S.companions.length || S.sin !== 22 || G.infamyHere() !== D.CRIMES.betrayal.inf) fail(`悪名: 仲間を売っても裏切りにならない（仲間 ${S.companions.length}・罪 ${S.sin}）`);
  const bell = D.EVENTS.find((e) => e.id === "m3_bell");
  if (!bell.cond(S)) fail("悪名: 罪の匂い 22 で鈴の執行人が来ない");
  G.startEvent("m3_bell"); G.chooseEvent(bell.choices.length - 1);
  if (S.sin !== 0 || S.over) fail(`悪名: 首を差し出しても罪が消えない（${S.sin}）`);
  // 牢で刑期を務めると悪名が下がる
  S = start(); for (let i = 0; i < 5; i++) G.crime("theft");
  G.startEvent("m3_jail"); G.chooseEvent(3);
  if (G.wanted() || G.infamyHere()) fail(`悪名: 刑期を務めても悪名が残る ${G.infamyHere()}`);
  // m3_ の出来事のすべての選択肢を、手配中の状態で何度か通す（戦闘は決着まで）
  for (const e of m3) e.choices.forEach((c, i) => {
    for (let t = 0; t < 6; t++) {
      S = start(); S.gold = 999; S.sin = 25; G.addCompanion("random");
      for (let j = 0; j < 5; j++) G.crime("theft");
      try {
        G.startEvent(e.id); G.chooseEvent(i);
        for (let k = 0; k < 40 && !S.over && S.mode !== "explore"; k++) { const a = G.actions().flatMap((x) => x.list).find((x) => !x.disabled); if (!a) break; G.act(a.id); }
      } catch (err) { fail(`出来事 ${e.id}[${i}]: 例外 ${err.message}`); break; }
      if (S.gold < 0 || Object.values(S.repute || {}).some((r) => r.inf < 0)) fail(`出来事 ${e.id}[${i}]: 所持金か悪名が負`);
    }
  });
  if (failures === before) ok(`評判と悪名（罪 ${Object.keys(D.CRIMES).length} 種・既存の悪行 ${Object.keys(D.DEEDS).length} 件・出来事 ${m3.length} 件・古いセーブ・手配と解除・位の剥奪・執行人）`);
}

// ---------------------------------------------------------------- 2. ランダムに遊ぶ
{
  const G = loadEngine();
  const D = G.data;
  const GAMES = Number(process.env.GAMES || 150);
  const STEPS = Number(process.env.STEPS || 500);
  let deaths = 0, maxDay = 0, totalTurns = 0, bossKills = 0;
  let wantedGames = 0, bellGames = 0;
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
    if (G.S.chronicle.some((c) => c.text.includes("賞金首"))) wantedGames++;
    if ((G.S.sin || 0) >= 20 || G.S.chronicle.some((c) => c.text.includes("鈴の執行人"))) bellGames++;
    for (const [n, r] of Object.entries(G.S.repute || {})) if (!(r.inf >= 0 && r.rep >= 0) || D.LAWLESS.includes(n)) fail(`game ${g}: 評判が変 ${n} ${JSON.stringify(r)}`);
    maxDay = Math.max(maxDay, G.S.day);
    totalTurns += G.S.turn;
    bossKills += G.S.counters.bosses;
  }
  if (failures === before) ok(`ランダムに ${GAMES} 回遊ぶ（死亡 ${deaths}・最長 ${maxDay} 日・平均 ${Math.round(totalTurns / GAMES)} 手番・ボス撃破 ${bossKills}・賞金首 ${wantedGames}・罪の匂い20以上 ${bellGames}）`);
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

// ---------------------------------------------------------------- 3. 釣り合いの測定（失敗にはしない）
try {
  measureBalance();
} catch (e) {
  console.log("NOTE 釣り合いの測定を出せなかった（失敗にはしない）: " + (e.stack || e));
}

console.log(failures ? `DONE failures=${failures}` : "DONE failures=0");
process.exit(failures ? 1 : 0);
