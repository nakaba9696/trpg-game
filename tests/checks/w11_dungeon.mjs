// W11：迷宮の階と部屋（src/engine/zw11_dungeon.js・src/data/dungeon_w11*.js）
// - 大きな迷宮（size: "large"）は 3〜5 か所で、由来（docs/lore/dungeons.md）に載っている。小さな迷宮は今までどおり「奥へ進む」だけ（部屋が出ない）
// - 表の整合：大きな迷宮ごとの性格（道の呼び名・階ごとの一行・最奥の一行）と、その迷宮だけの部屋・階ごとのかけらがある。部屋の出来事がある。
//   見える文に「！」・禁じた言葉・数字が無い
// - どの大きな迷宮も、部屋をたどって階段を見つけ、最奥まで行ける。どの階にも階段の部屋とかけらの部屋がちょうど一つずつあり、部屋が尽きても詰まない
// - 背景の種類（G.w11.sceneKind）：部屋に入るとその部屋の種類、最奥は deep
// - 画面の地図の一行（地下2階／全4階：部屋 1/4・階段 まだ）。階段を見つけると「階段を下りる」になる
// - 箱：ミミックなら開けると戦い、調べると見破る。錠のある箱は錠の選択肢だけ。潮の迷宮は満ち潮で水の道が通れず、待てる
// - 外から部屋の種類を足せる（G.data.W11_ROOMS に push。W12 の口）
// - 選択肢を並べるだけでは乱数を使わない。古いセーブ（S.w11 が無い・迷宮の途中）でも動く
import { readFileSync } from "node:fs";

const BANNED = /見世物|観客|客席|舞台|台本|言霊|神々|魔王|魔人|正体|もういない|！|!/;

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("W11 " + m); };
  const start = (G, seed, cls) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 30]));
    G.newGame({ cls: cls || Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const acts = (G) => G.actions().flatMap((g) => g.list);
  const keep = (S) => { S.hp = S.maxHp = 9999; S.mp = S.maxMp = 99; S.over = ""; };

  // ---------------------------------------------------------------- 表の整合
  const G0 = loadEngine();
  const D = G0.data;
  const W = G0.w11;
  if (!W) { F("G.w11 が無い"); return; }
  const all = Object.keys(D.LOCS).filter((id) => D.LOCS[id].type === "dungeon");
  const dungeons = all.filter((id) => W.large(id));
  if (dungeons.length < 3 || dungeons.length > 5) F(`大きな迷宮が ${dungeons.length} か所（3〜5 か所）`);
  const lore = readFileSync(new URL("../../docs/lore/dungeons.md", import.meta.url), "utf8");
  const evIds = new Set(D.EVENTS.map((e) => e.id));
  for (const id of dungeons) {
    const P = D.W11_DUNGEONS[id];
    const L = D.LOCS[id];
    if (!lore.includes("`" + id + "`")) F(`${id}: docs/lore/dungeons.md に由来が無い`);
    if (!(P.ways && P.ways.length >= 4)) F(`${id}: 道の呼び名が少ない`);
    if (!(P.intro && P.intro.length >= L.floors - 1)) F(`${id}: 階ごとの一行が足りない（${(P.intro || []).length}/${L.floors - 1}）`);
    if (!P.deep) F(`${id}: 最奥の一行が無い`);
    for (const [k, e] of Object.entries(P.ev || {})) for (const x of [].concat(e)) if (!evIds.has(x)) F(`${id}: 部屋 ${k} の出来事 ${x} が無い`);
    if (!D.W11_ROOMS.some((r) => r.where && r.where.includes(id) && r.force)) F(`${id}: 階ごとのかけらの部屋が無い`);
    for (let d = 1; d < L.floors; d++) {
      const r = D.W11_ROOMS.find((x) => x.where && x.where.includes(id) && x.force);
      const e = r && (typeof r.ev === "function" ? r.ev({}, L, d) : r.ev);
      if (r && !evIds.has(e)) F(`${id} 地下${d}階: かけらの出来事 ${e} が無い`);
      if (d > 1 && r && typeof r.ev === "function" && r.ev({}, L, d) === r.ev({}, L, d - 1)) F(`${id} 地下${d}階: かけらが上の階と同じ`);
    }
  }
  // 小さな迷宮は部屋が出ない
  {
    const G = loadEngine();
    const S = start(G, 2);
    for (const id of all.filter((x) => !W.large(x))) {
      S.loc = id; S.depth = 1; S.mode = "explore"; keep(S);
      const a = acts(G);
      if (a.some((x) => /^w11/.test(x.id))) F(`小さな迷宮 ${id} に部屋が出る`);
      const dp = a.find((x) => x.id === "deeper");
      if (!dp || dp.label !== "奥へ進む") F(`小さな迷宮 ${id} の「奥へ進む」が「${dp && dp.label}」`);
      if (G.w11.sceneKind(S)) F(`小さな迷宮 ${id} に部屋の背景が出る`);
    }
  }
  const seen = new Set();
  for (const r of D.W11_ROOMS) {
    if (seen.has(r.id)) F(`部屋の種類 ${r.id} が重なっている`);
    seen.add(r.id);
    for (const e of [].concat(typeof r.ev === "function" ? [] : r.ev || [])) if (!evIds.has(e)) F(`部屋 ${r.id}: 出来事 ${e} が無い`);
    for (const l of r.where || []) if (!D.LOCS[l] || D.LOCS[l].type !== "dungeon") F(`部屋 ${r.id}: 迷宮 ${l} が無い`);
    if (!r.hint) F(`部屋 ${r.id}: 気配（hint）が無い`);
  }
  const look = (where, t) => {
    if (typeof t !== "string") return;
    if (BANNED.test(t)) F(`${where}：「${t.match(BANNED)[0]}」`);
    if (/[0-9０-９]/.test(t)) F(`${where}：数字が入っている`);
  };
  const outs = (o, w) => { if (!o) return; look(w, o.text); if (o.win) outs(o.win, w + ".win"); };
  const w11ev = D.EVENTS.filter((e) => /^w11_/.test(e.id));
  for (const e of w11ev) {
    if (e.w !== 0 || !e.noC10) F(`${e.id}: 抽選に出ない印（w: 0・noC10）が無い`);
    look(e.id, e.title); look(e.id, e.text);
    e.choices.forEach((c, i) => { look(`${e.id}[${i}]`, c.label); outs(c.ok, `${e.id}[${i}].ok`); outs(c.ng, `${e.id}[${i}].ng`); outs(c.win, `${e.id}[${i}].win`); });
  }
  for (const [id, P] of Object.entries(D.W11_DUNGEONS || {})) {
    if (!D.LOCS[id]) F(`D.W11_DUNGEONS の ${id} は迷宮に無い`);
    [...(P.ways || []), ...(P.wet || []), ...(P.intro || []), ...Object.values(P.say || {})].forEach((t) => look(`${id} の性格`, t));
  }
  // 技（K1）と術（M14）の選択肢が部屋に付いている
  const chest = D.EVENTS.find((e) => e.id === "w11_chest");
  if (!chest.choices.some((c) => c.k1 === "k1_lockpick")) F("箱に鍵開け（K1）の選択肢が無い");
  if (!chest.choices.some((c) => c.m14g === "g_unlock")) F("箱に開錠の術（M14）の選択肢が無い");
  if (!D.EVENTS.find((e) => e.id === "w11_trap_pit").choices.some((c) => c.k1 === "k1_trapsense")) F("罠に罠読み（K1）の選択肢が無い");
  if (!D.EVENTS.find((e) => e.id === "w11_lair").choices.some((c) => c.k1 === "k1_stealth")) F("魔物の巣に隠密（K1）の選択肢が無い");
  if (!D.ITEMS.w11_oldkey) F("迷宮の古い鍵が無い");

  // ---------------------------------------------------------------- どの迷宮も最奥まで行ける（部屋だけをたどって）
  let floors = 0, rooms = 0;
  for (const id of dungeons) {
    const G = loadEngine();
    const D2 = G.data;
    const L = D2.LOCS[id];
    const S = start(G, 7 + floors, "thief");
    S.loc = id; S.visited[id] = true;
    // 主・中ボス・主の巣の出来事はここでは見ない（印を付けて、最奥の手前まで）
    if (L.midboss) Object.keys(L.midboss).forEach((d) => { S.flags[`mid:${id}:${d}`] = true; });
    G.act("deeper");
    let steps = 0, stuck = false;
    while (S.depth < L.floors && steps++ < 600) {
      keep(S);
      if (S.mode === "combat") { S.combat = null; S.mode = "explore"; continue; }
      if (S.mode === "event") {
        const a = acts(G).filter((x) => !x.disabled);
        if (!a.length) { S.mode = "explore"; S.event = null; continue; }
        // 戦いや次の出来事に入らない、最後の選択肢（立ち去る）を選ぶ
        G.act(a[a.length - 1].id);
        continue;
      }
      if (S.mode !== "explore") { S.mode = "explore"; S.fac = null; continue; }
      if (S.depth + 1 >= L.floors && W.hasRooms && G.w11.hasRooms(S) && G.w11.floorOf(S).stairs) break; // 最奥の手前で階段を見つけた
      const f = G.w11.floorOf(S);
      if (!f) { G.act("deeper"); continue; }
      const stairsN = f.rooms.filter((r) => r.k === "stairs").length;
      if (stairsN !== 1) { F(`${id} 地下${S.depth}階: 階段の部屋が ${stairsN}`); stuck = true; break; }
      if (f.rooms.filter((r) => /_lore$/.test(r.k)).length !== 1) F(`${id} 地下${S.depth}階: かけらの部屋が一つでない`);
      const line = G.w11.mapLine(S);
      if (!/^地下\d+階／全\d+階：部屋 \d+\/\d+・階段 (発見|まだ)$/.test(line)) { F(`${id}: 地図の一行が「${line}」`); stuck = true; break; }
      const deeper = acts(G).find((x) => x.id === "deeper");
      if (!deeper) { F(`${id} 地下${S.depth}階: 奥へ進む選択肢が無い`); stuck = true; break; }
      if (f.stairs) {
        if (deeper.label !== "階段を下りる") F(`${id}: 階段を見つけたのに「${deeper.label}」`);
        floors++;
        G.act("deeper");
        continue;
      }
      if (deeper.label !== "階段を探さずに奥へ進む") F(`${id}: 階段を見つける前に「${deeper.label}」`);
      const go = acts(G).find((x) => /^w11go:/.test(x.id) && !x.disabled) || acts(G).find((x) => x.id === "w11wait") || acts(G).find((x) => x.id === "w11search");
      if (!go) { F(`${id} 地下${S.depth}階: 部屋が尽きたのに階段が無い（${JSON.stringify(f.rooms.map((r) => [r.k, r.done, !!r.wet]))}）`); stuck = true; break; }
      if (/^w11go:/.test(go.id)) {
        rooms++;
        const k = f.rooms[Number(go.id.slice(6))].k;
        G.act(go.id);
        const sk = G.w11.sceneKind(S);
        if (S.depth && S.depth < L.floors && !sk) F(`${id}: 部屋（${k}）に入っても背景の種類が無い`);
        continue;
      }
      G.act(go.id);
    }
    if (!stuck && steps >= 600) F(`${id}: 最奥まで行けない（地下${S.depth}階で止まった）`);
    // 最奥の手前から、主の広間へ下りられる
    if (!stuck && S.depth < L.floors) {
      keep(S);
      G.act("deeper");
      if (S.depth !== L.floors) F(`${id}: 最奥の手前から主の階へ下りられない（地下${S.depth}階）`);
      else if (G.w11.sceneKind(S) !== "deep") F(`${id}: 最奥の背景が deep にならない`);
    }
  }
  if (rooms < 10) F(`たどった部屋が少ない（${rooms}）`);

  // ---------------------------------------------------------------- 箱とミミック・錠・潮・外から足す部屋・乱数・古いセーブ
  {
    const G = loadEngine();
    const D2 = G.data;
    const S = start(G, 3);
    S.loc = "graveyard"; S.depth = 1;
    keep(S);
    const f = G.w11.floorOf(S);
    // ミミック：開けると戦い
    f.rooms.push({ k: "chest", ev: "w11_chest", way: "テストの扉", done: false, locked: false, mimic: true });
    G.act(`w11go:${f.rooms.length - 1}`);
    if (S.event !== "w11_chest") F("箱の部屋で箱の出来事が始まらない");
    const open = acts(G).find((a) => a.label === "蓋を開ける");
    if (!open) F("錠の無い箱に「蓋を開ける」が無い");
    else { G.act(open.id); if (S.mode !== "combat" || !S.combat.foes.some((x) => x.id === "mimic")) F("ミミックの箱を開けても戦いにならない"); }
    S.combat = null; S.mode = "explore";
    // 調べると見破る
    f.rooms.push({ k: "chest", ev: "w11_chest", way: "テストの扉二", done: false, locked: true, mimic: true });
    G.act(`w11go:${f.rooms.length - 1}`);
    const labels = acts(G).map((a) => a.label);
    if (labels.includes("蓋を開ける")) F("錠のある箱に「蓋を開ける」が出る");
    if (!labels.includes("叩き壊す")) F("錠のある箱に「叩き壊す」が無い");
    G.apply({ w11: { probe: true } });
    if (S.event !== "w11_mimic") F("ミミックの箱を調べても見破れない");
    S.mode = "explore"; S.event = null;
    // 本物の箱を調べると、箱の前に戻る
    f.rooms.push({ k: "chest", ev: "w11_chest", way: "テストの扉三", done: false, locked: true, mimic: false });
    G.act(`w11go:${f.rooms.length - 1}`);
    G.apply({ w11: { probe: true } });
    if (S.mode !== "event" || S.event !== "w11_chest") F("本物の箱を調べたあと、箱の前に戻らない");
    if (acts(G).some((a) => a.label === "開ける前に、箱を調べる")) F("調べた箱に、また「調べる」が出る");
    // 古い鍵
    G.give("w11_oldkey");
    const key = acts(G).find((a) => a.label === "迷宮の古い鍵を差しこむ");
    if (!key) F("鍵を持っていても「古い鍵」の選択肢が出ない");
    else { const g0 = S.gold; G.act(key.id); if (G.count("w11_oldkey") !== 0 || S.gold <= g0) F("古い鍵で箱が開かない（鍵が減らない・金が増えない）"); }
    S.mode = "explore"; S.event = null;

    // 選択肢を並べるだけでは乱数を使わない
    S.depth = 2; S.w11.floor = null;
    let n = 0;
    const r0 = G.rand;
    G.rand = () => { n++; return r0(); };
    acts(G); acts(G); G.w11.mapLine(S);
    G.rand = r0;
    if (n) F(`選択肢を並べるだけで乱数を ${n} 回使った`);
    // 同じセーブなら同じ部屋の並び
    const a1 = JSON.stringify(G.w11.floorOf(S).rooms.map((r) => [r.k, r.way]));
    S.w11.floor = null; S.w11.n -= 1;
    if (JSON.stringify(G.w11.floorOf(S).rooms.map((r) => [r.k, r.way])) !== a1) F("同じセーブで部屋の並びが変わる");

    // 隠し扉：近道なら階段が分かる
    const fl = G.w11.floorOf(S);
    fl.secret = "short";
    G.rand = () => 0.01;
    G.act("w11search");
    G.rand = r0;
    if (!fl.stairs) F("隠し扉の近道を見つけても階段が分からない");
    if (acts(G).some((a) => a.id === "w11search")) F("一つの階で二度、壁を調べられる");
    if (acts(G).find((a) => a.id === "deeper").label !== "階段を下りる") F("近道を見つけたのに「階段を下りる」にならない");
    // 引き返すと、その階の部屋は忘れる
    G.act("leave");
    if (S.w11.floor) F("入口へ引き返しても階の部屋が残っている");

    // 外から部屋の種類を足せる（W12 の口）
    D2.EVENTS.push({ id: "w11_test_room", where: ["w11"], w: 0, noC10: true, title: "試しの部屋", text: "試しの部屋。", choices: [{ label: "出る", ok: { text: "出た。" } }] });
    D2.W11_ROOMS.push({ id: "w11_test", where: ["graveyard"], w: 1000, max: 1, ev: "w11_test_room", hint: "試し" });
    S.depth = 1; S.w11.floor = null;
    if (!G.w11.floorOf(S).rooms.some((r) => r.k === "w11_test")) F("D.W11_ROOMS に足した部屋が出ない");
    D2.W11_ROOMS.pop();

    // 潮：満ち潮では水の道が通れず、待てる。引き潮なら通れる
    S.loc = "onigashima"; S.depth = 1; S.w11.floor = null; S.mode = "explore";
    const sf = G.w11.floorOf(S);
    if (!sf.rooms.some((r) => r.wet)) sf.rooms.push({ k: "rest", ev: "w11_rest_spring", way: "水の道", wet: true, done: false });
    S.phase = 1;
    const wet = sf.rooms.findIndex((r) => r.wet);
    const wa = acts(G).find((a) => a.id === `w11go:${wet}`);
    if (!wa || !wa.disabled) F("満ち潮なのに水の道が通れる");
    if (!acts(G).some((a) => a.id === "w11wait")) F("満ち潮に「潮が引くまで待つ」が無い");
    if (sf.rooms.some((r) => r.k === "stairs" && r.wet)) F("階段の部屋が水の道にある（満ち潮で詰む）");
    G.act("w11wait");
    if (acts(G).find((a) => a.id === `w11go:${wet}`).disabled) F("潮が引いても水の道が通れない");
  }

  // ---------------------------------------------------------------- 古いセーブ
  {
    const G = loadEngine();
    const S = start(G, 5);
    S.loc = "graveyard"; S.depth = 2;
    delete S.w11;
    keep(S);
    let list;
    try { list = acts(G); } catch (e) { F(`S.w11 の無い迷宮の途中で選択肢が出ない：${e.message}`); }
    if (list && !list.some((a) => /^w11go:/.test(a.id))) F("S.w11 の無い古いセーブで分かれ道が出ない");
    // 部屋の情報が無いまま、箱の出来事の途中で保存していた
    delete S.w11;
    G.startEvent("w11_chest");
    try {
      const a = acts(G).find((x) => x.label === "蓋を開ける");
      if (!a) F("部屋の無い箱の出来事に「蓋を開ける」が無い");
      else G.act(a.id);
    } catch (e) { F(`部屋の無い箱の出来事で止まる：${e.message}`); }
    // 古いセーブで、奥へ進む（今までの手）
    S.mode = "explore"; S.event = null; S.combat = null;
    try { G.act("deeper"); } catch (e) { F(`古いセーブで奥へ進めない：${e.message}`); }
  }

  if (bad === 0) ok(`W11 迷宮の部屋（迷宮 ${dungeons.length}・部屋の種類 ${D.W11_ROOMS.length}・出来事 ${w11ev.length}・たどった部屋 ${rooms}・下りた階 ${floors}）`);
};
