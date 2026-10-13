// T5：お金と資源の入口・出口（economy）。数えるだけで、数値の調整はしない（持ち主の判断）。
//   census(G)            … データから、金（G）と消耗する資源（回復薬・食べ物・交易の荷など）の入口と出口を数える
//   makeStyleBot(G, 型)  … tests/bot.mjs の筋のよい遊び方に「遊び方の型」を重ねたボット（慎重・無謀・貯める・ふつう）
//   playStyles(opts)     … 型ごとに決まった乱数で遊ばせ、日ごとの所持金・出口ごとの使われ方を集計する
//   reportMd(...)        … 報告（Markdown）。docs/review/economy_<日付>.md
// tests/checks/t5_economy.mjs が小さな回数で動かし、壊れていないことを緩い閾値で見張る。
//   node tests/t5_econ.mjs                    … 報告を docs/review/economy_<今日>.md に書く（既定：型ごとに 40 回・1 回 1500 行動）
//   T5_GAMES=100 T5_STEPS=3000 node tests/t5_econ.mjs … 回数・行動の上限を変える（重い集計はこちらで）
//   T5_SEED=1 …                               … 乱数の出発点をずらす
//   T5_OUT=path.md …                          … 書き出す先
//   JOBS=1 …                                  … 働き手に分けずに一つずつ（既定はコアの数。分けても数字は同じ）
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { availableParallelism } from "node:os";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { loadEngine, seeded } from "./lib.mjs";
import { makeSmartBot } from "./bot.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------- データから数える
// 消耗する資源：使う品（type use）と交易の荷（type trade）
const RESOURCE_TYPES = ["use", "trade"];

// アイテム id がデータのどこに出てくるか（ITEMS 自身は除く）。関数（条件・結果の関数）は文字列にして探す
function itemMentions(D, ids) {
  const want = new Set(ids);
  const hits = Object.fromEntries(ids.map((id) => [id, []]));
  const seen = new Set();
  const fnHit = (fn, where) => {
    const src = String(fn);
    for (const id of want) if (src.includes(`"${id}"`) || src.includes(`'${id}'`) || src.includes(`.${id}`)) hits[id].push(where + "()");
  };
  const walk = (v, where) => {
    if (v == null) return;
    if (typeof v === "string") { if (want.has(v)) hits[v].push(where); return; }
    if (typeof v === "function") { fnHit(v, where); return; }
    if (typeof v !== "object" || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) { v.forEach((x) => walk(x, where)); return; }
    for (const [k, x] of Object.entries(v)) {
      if (want.has(k)) hits[k].push(where + "." + k);
      walk(x, where + "." + k);
    }
  };
  for (const [k, v] of Object.entries(D)) if (k !== "ITEMS") walk(v, k);
  return hits;
}
// 出てくる場所を、入口・出口の種類に分ける
function classify(where) {
  const p = where.replace(/\.(\d+)(?=\.|$)/g, "");
  if (/^ENEMIES\..*\.loot/.test(p) || /^K1_DROPS/.test(p)) return { in: "敵が落とす" };
  if (/^(SHOP_BASE|K1_SHOP)/.test(p) || /^LOCS\.[^.]+\.shop/.test(p)) return { in: "店で買える" };
  if (/^LOCS\.[^.]+\.reward/.test(p)) return { in: "迷宮の主" };
  if (/^Q4\.GOODS\.[^.]+$/.test(p)) return { in: "産地で買う（交易）" };
  if (/^EVENTS\..*\.remove/.test(p)) return { out: "出来事で手放す" };
  if (/^EVENTS\..*\.(need|cond)/.test(p) || /\(\)$/.test(p) && /^EVENTS/.test(p) && /cond|need/.test(p)) return { out: "出来事の条件" };
  if (/^EVENTS\..*\.item/.test(p)) return { in: "出来事でもらう" };
  if (/^EVENTS/.test(p)) return { other: "出来事（ほか）" };
  return { other: p.split(".")[0] };
}
// エンジンのコードに id が書いてあるファイル（品を渡す・使う仕組みがコードにあるもの）
function engineMentions(ids) {
  const dir = path.join(ROOT, "src", "engine");
  const out = Object.fromEntries(ids.map((id) => [id, []]));
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".js"))) {
    const src = readFileSync(path.join(dir, f), "utf8");
    for (const id of ids) if (src.includes(`"${id}"`) || src.includes(`'${id}'`)) out[id].push(f);
  }
  return out;
}

export function census(G) {
  const D = G.data;
  const items = Object.entries(D.ITEMS);
  // 金の入口
  const foes = Object.values(D.ENEMIES).filter((e) => Array.isArray(e.gold));
  const foeGold = foes.map((e) => (e.gold[0] + e.gold[1]) / 2);
  const outs = [];
  const choices = [];
  for (const e of D.EVENTS) for (const c of e.choices || []) {
    choices.push(c);
    for (const k of ["ok", "ng", "win", "lose", "flee"]) if (c[k] && typeof c[k] === "object") outs.push(c[k]);
  }
  const evIn = outs.filter((o) => typeof o.gold === "number" && o.gold > 0);
  const evOut = outs.filter((o) => typeof o.gold === "number" && o.gold < 0);
  const evCost = choices.filter((c) => typeof c.cost === "number" && c.cost > 0);
  const locs = Object.values(D.LOCS);
  const facN = (f) => locs.filter((l) => (l.fac || []).includes(f)).length;
  const loot = items.filter(([, it]) => it.type === "loot");
  const stock = new Set(D.SHOP_BASE || []);
  locs.forEach((l) => (l.shop || []).forEach((id) => stock.add(id)));
  const stockIds = [...stock].filter((id) => D.ITEMS[id]);
  const sea = locs.flatMap((l) => Object.values(l.sea || {}));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  const gold = {
    in: [
      { name: "敵が落とす金", n: foes.length, note: `敵 ${foes.length} 種・一体の中央値 ${med(foeGold)}G` },
      { name: "出来事の金", n: evIn.length, note: `結果 ${evIn.length}・合計 ${sum(evIn.map((o) => o.gold))}G（一つの中央値 ${med(evIn.map((o) => o.gold))}G）` },
      { name: "ギルドの依頼", n: facN("guild"), note: `ギルドのある町 ${facN("guild")}（荷運び・調査・退治。報酬はエンジンが危険度から決める）` },
      { name: "売る（戦利品）", n: loot.length, note: `戦利品 ${loot.length} 種（定価で売れる）・ほかの品は半値。店のある町 ${facN("shop")}` },
      { name: "迷宮の宝・隠し部屋", n: 1, note: "大きな迷宮の部屋（エンジンの表。危険度と深さで決まる）" },
      { name: "交易の荷", n: items.filter(([, it]) => it.type === "trade").length, note: "土地の品を遠くで売る（Q4）" },
    ],
    out: [
      { name: "店で買う", n: stockIds.length, note: `店に並ぶ品 ${stockIds.length} 種・店のある町 ${facN("shop")}` },
      { name: "宿", n: facN("inn"), note: `宿のある町 ${facN("inn")}（一晩 5G・都は 10G）` },
      { name: "教会（治療・祓い・懺悔）", n: facN("church"), note: `教会のある町 ${facN("church")}` },
      { name: "訓練場", n: facN("train"), note: `訓練場のある町 ${facN("train")}` },
      { name: "酒場（仲間を雇う）", n: facN("tavern"), note: `酒場のある町 ${facN("tavern")}` },
      { name: "船賃", n: sea.length, note: `航路 ${sea.length}（${Math.min(...sea.map((s) => s.cost))}〜${Math.max(...sea.map((s) => s.cost))}G）` },
      { name: "出来事の出費", n: evCost.length + evOut.length, note: `選ぶのに払う ${evCost.length}（中央値 ${med(evCost.map((c) => c.cost))}G）・結果で失う ${evOut.length}` },
      { name: "学院（術を覚える）", n: facN("academy"), note: `学院 ${facN("academy")}` },
    ],
  };
  // 資源ごとの入口・出口
  const res = items.filter(([, it]) => RESOURCE_TYPES.includes(it.type));
  const ids = res.map(([id]) => id);
  const ment = itemMentions(D, ids);
  const eng = engineMentions(ids);
  const rows = res.map(([id, it]) => {
    const ins = new Set(), outsR = new Set(), other = new Set();
    for (const w of ment[id]) { const c = classify(w); if (c.in) ins.add(c.in); if (c.out) outsR.add(c.out); if (c.other) other.add(c.other); }
    if (stock.has(id)) ins.add("店で買える");
    if (eng[id].length) other.add("エンジン");
    // 出口：使う（持ち物から・戦闘で）
    if (it.type === "use" && (it.hp || it.mp)) outsR.add("使う");
    else if (it.type === "use" && (it.escape || it.holy || it.reroll || it.sanity || it.m14scroll || eng[id].length)) outsR.add("使う（特別）");
    if (it.type === "trade") outsR.add("交易で売る");
    if (it.price > 0) outsR.add("店で売る");
    // 入口：データに出てこなくても、エンジンのコードが渡すもの（仲間の差し入れ c13・交易の荷・術の巻物など）
    if (!ins.size && it.c13) ins.add("仲間の差し入れ");
    if (!ins.size && eng[id].length) ins.add("エンジンが渡す");
    return { id, name: it.name, type: it.type, price: it.price, ins: [...ins], outs: [...outsR], other: [...other], engine: eng[id] };
  });
  return {
    gold,
    rows,
    noIn: rows.filter((r) => !r.ins.length).map((r) => r.id),
    // 「店で売る」だけが出口のもの（使い道が無い資源）
    noOut: rows.filter((r) => !r.outs.some((o) => o !== "店で売る")).map((r) => r.id),
  };
}

// ---------------------------------------------------------------- 遊び方の型
export const STYLES = {
  normal: { name: "ふつう", text: "tests/bot.mjs の筋のよい遊び方のまま" },
  cautious: { name: "慎重", text: "傷が浅いうちに休む（宿・野営・迷宮から引き返す）・危なくなる前に逃げる・薬を買い込む（6 個まで）" },
  reckless: { name: "無謀", text: "逃げない・話さない・賄賂を出さない・迷宮は HP が 3 割を切るまで進む・宿は HP が半分を切るまで使わない" },
  saver: { name: "貯める", text: "買わない（店で買わない・訓練しない・仲間を雇わない）。売る・宿・教会は使う" },
};
const HEALS = ["potion", "herb"];

export function makeStyleBot(G, style) {
  const D = G.data;
  const base = makeSmartBot(G);
  const mem = base.mem;
  const extra = { shopDay: null };
  const flat = () => G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
  // 町へ向かう一歩（陸路だけ・日数のいちばん少ない道）
  const stepToTown = () => {
    const S = G.S;
    const prev = { [S.loc]: null }, q = [S.loc];
    while (q.length) {
      const u = q.shift();
      const L = D.LOCS[u];
      if (u !== S.loc && L.type === "town") { let v = u; while (prev[v] !== S.loc) v = prev[v]; return "travel:" + v; }
      for (const v of Object.keys(L.links || {})) if (D.LOCS[v] && !(v in prev)) { prev[v] = u; q.push(v); }
    }
    return null;
  };
  const choose = () => {
    const S = G.S;
    const hp = S.hp / S.maxHp;
    if (style === "saver") { mem.trainDay = S.day; mem.tavernDay = S.day + ":" + S.loc; }
    if (style === "reckless" && hp > 0.3) mem.sortie = 0; // 帰らずに戦い続ける
    let id = base.choose();
    if (!id) return id;
    const avail = flat();
    const ok = (x) => x && avail.some((a) => a.id === x);
    const L = D.LOCS[S.loc];
    if (style === "saver") {
      if (/^shop:buy:|^train:|^tavern:hire:|^fac:train$|^fac:tavern$/.test(id)) {
        extra.shopDay = mem.shopDay = S.day + ":" + S.loc;
        const sell = avail.find((a) => a.id.startsWith("shop:sell:") && (G.itemInfo(a.id.slice(10)) || {}).type === "loot");
        id = sell ? sell.id : ok("back") ? "back" : id;
      }
    } else if (style === "cautious") {
      const nHeal = HEALS.reduce((a, x) => a + (G.count(x) || 0), 0);
      if (S.mode === "combat" && !S.combat.boss && hp < 0.5) {
        const run = ["cb:item:smoke", "cb:flee"].find(ok);
        if (run) id = run;
      } else if (S.mode === "fac" && S.fac === "shop" && nHeal < 6) {
        const buy = HEALS.map((x) => "shop:buy:" + x).find((x) => ok(x) && S.gold >= D.ITEMS[x.slice(9)].price + 25);
        if (buy) id = buy;
      } else if (S.mode === "explore" && L.type === "town") {
        if (S.hp < S.maxHp && ok("fac:inn")) id = "fac:inn";
        else if (nHeal < 6 && extra.shopDay !== S.day + ":" + S.loc && ok("fac:shop") && S.gold >= 33) { extra.shopDay = S.day + ":" + S.loc; id = "fac:shop"; }
      } else if (S.mode === "explore" && hp < 0.75) {
        if (L.type === "dungeon" && S.depth > 0 && ok("leave")) id = "leave";
        else if (L.type !== "dungeon" || !S.depth) id = (ok(stepToTown()) && stepToTown()) || (ok("camp") ? "camp" : id);
      }
    } else if (style === "reckless") {
      if (S.mode === "combat" && /^cb:(flee|talk|bribe|guard|item:smoke)$/.test(id)) {
        const hit = ["cb:attack", "cb:fire"].find(ok);
        if (hit) id = hit;
      } else if (S.mode === "explore" && id === "leave" && hp > 0.3 && ok("deeper")) id = "deeper";
      else if (S.mode === "explore" && id === "fac:inn" && hp >= 0.5) {
        // 休まずに出る：いちばん危険な隣の野外・迷宮へ
        const next = Object.keys(L.links || {}).filter((v) => D.LOCS[v] && D.LOCS[v].type !== "town").sort((a, b) => (D.LOCS[b].danger || 0) - (D.LOCS[a].danger || 0))[0];
        if (ok("travel:" + next)) id = "travel:" + next;
      }
    }
    return id;
  };
  return { choose, mem };
}

// ---------------------------------------------------------------- 遊ばせて数える
// 行動の id から、金・品の動きの種類を決める
export function flowKind(id, mode) {
  if (!id) return "（行動の外）";
  const m = /^([^:]+)(?::([^:]+))?/.exec(id);
  const h = m[1], s = m[2];
  if (h === "shop") return s === "buy" ? "店で買う" : s === "sell" ? "店で売る" : "店（ほか）";
  if (h === "inn") return "宿";
  if (h === "train") return "訓練場";
  if (h === "tavern") return "酒場（仲間）";
  if (h === "church" || h === "m5") return "教会";
  if (h === "guild") return s === "report" ? "依頼の報酬" : "ギルド（ほか）";
  if (h === "sail") return "船賃";
  if (h === "cb") return s === "bribe" ? "賄賂" : "戦闘";
  if (h === "ev") return "出来事";
  if (h === "travel" || h === "w6go") return "旅";
  if (h === "rr") return "判定の振り直し";
  if (["explore", "deeper", "leave", "camp"].includes(h)) return mode === "combat" ? "戦闘" : "探索・迷宮";
  if (h === "fac" || h === "back") return "施設の出入り";
  if (h === "use") return "持ち物で使う";
  return h;
}
export const CHECK_DAYS = [1, 3, 7, 14, 30, 60, 100, 200, 365];

export function playStyles({ styles = Object.keys(STYLES), games = 40, steps = 1500, seed = 0, classes, start = 0 } = {}) {
  const G = loadEngine();
  const D = G.data;
  const cls = classes || Object.keys(D.CLASSES);
  const goals = Object.keys(D.GOALS).filter((k) => D.GOALS[k].text);
  const resIds = Object.entries(D.ITEMS).filter(([, it]) => RESOURCE_TYPES.includes(it.type)).map(([id]) => id);
  const out = {};
  styles.forEach((style) => {
    const r = out[style] = { style, games: 0, errors: 0, deaths: 0, days: [], turns: [], goldAt: Object.fromEntries(CHECK_DAYS.map((d) => [d, []])),
      endGold: [], maxGold: [], broke: 0, flowIn: {}, flowOut: {}, runsIn: {}, runsOut: {}, resIn: {}, resOut: {}, evOut: {}, evIn: {} };
    for (let i = start; i < games; i++) {
      G.rand = seeded(500000 + seed * 1000000 + Object.keys(STYLES).indexOf(style) * 10000 + i); // 型ごとに別の範囲（型を選んで遊んでも数字は同じ）
      G.P = { trophies: {}, graves: [] };
      const c = cls[i % cls.length];
      const { stats, caps } = G.cre.quickStats(c, G.rand);
      G.newGame({ cls: c, stats, caps, goal: goals[i % goals.length], profile: { name: "測定", sex: "男", age: 20, history: "測定用", personality: "無口" } });
      const bot = makeStyleBot(G, style);
      const usedIn = new Set(), usedOut = new Set();
      const byDay = {};
      let maxG = G.S.gold, brokeDays = 0, lastDay = G.S.day;
      const inv = () => Object.fromEntries(resIds.map((x) => [x, G.S.inv[x] || 0]));
      const book = (kind, g0, g1, i0, i1, evId) => {
        const dg = g1 - g0;
        if (dg > 0) { r.flowIn[kind] = (r.flowIn[kind] || 0) + dg; usedIn.add(kind); if (evId) r.evIn[evId] = (r.evIn[evId] || 0) + dg; }
        if (dg < 0) { r.flowOut[kind] = (r.flowOut[kind] || 0) - dg; usedOut.add(kind); if (evId) r.evOut[evId] = (r.evOut[evId] || 0) - dg; }
        for (const x of resIds) {
          const d = i1[x] - i0[x];
          if (d > 0) { const k = `${x}|${kind}`; r.resIn[k] = (r.resIn[k] || 0) + d; }
          if (d < 0) { const k = `${x}|${kind}`; r.resOut[k] = (r.resOut[k] || 0) - d; }
        }
      };
      try {
        for (let step = 0; step < steps && !G.S.over; step++) {
          let g0 = G.S.gold, i0 = inv();
          const id = bot.choose(); // 持ち物の薬を使う・装備するのは、ここ（手番は進まない）
          book("持ち物で使う", g0, G.S.gold, i0, inv());
          if (!id) break;
          const mode = G.S.mode, evId = G.S.mode === "event" ? G.S.event : null;
          g0 = G.S.gold; i0 = inv();
          G.act(id);
          book(flowKind(id, mode), g0, G.S.gold, i0, inv(), evId);
          const S = G.S;
          byDay[S.day] = S.gold;
          if (S.gold > maxG) maxG = S.gold;
          if (S.day !== lastDay) { if (S.gold < 5) brokeDays += S.day - lastDay; lastDay = S.day; }
        }
      } catch {
        r.errors++; // 例外は tests/run.mjs のランダムプレイが拾う。ここでは数えるだけ
        continue;
      }
      const S = G.S;
      r.games++;
      if (S.over === "dead") r.deaths++;
      r.days.push(S.day);
      r.turns.push(S.turn);
      r.endGold.push(S.gold);
      r.maxGold.push(maxG);
      if (brokeDays >= Math.max(10, S.day * 0.3)) r.broke++;
      // 日ごとの所持金：その日まで生きていた回だけ（その日の最後に見た所持金。動きの無い日は前の日の値）
      let g = 0, d = 1;
      const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
      for (const cd of CHECK_DAYS) {
        if (S.day < cd) break;
        while (d < days.length + 1 && days[d - 1] <= cd) { g = byDay[days[d - 1]]; d++; }
        r.goldAt[cd].push(g);
      }
      usedIn.forEach((k) => { r.runsIn[k] = (r.runsIn[k] || 0) + 1; });
      usedOut.forEach((k) => { r.runsOut[k] = (r.runsOut[k] || 0) + 1; });
    }
  });
  return out;
}

// 同じ型の、続きの回の集計を足す（種は回ごとに決まっているので、分けて遊んでも数字は同じ）
export function mergePlay(a, b) {
  const out = { ...a };
  for (const [k, rb] of Object.entries(b)) {
    const ra = out[k];
    if (!ra) { out[k] = rb; continue; }
    const r = { ...ra };
    for (const x of ["games", "errors", "deaths", "broke"]) r[x] = ra[x] + rb[x];
    for (const x of ["days", "turns", "endGold", "maxGold"]) r[x] = [...ra[x], ...rb[x]];
    r.goldAt = Object.fromEntries(CHECK_DAYS.map((d) => [d, [...ra.goldAt[d], ...rb.goldAt[d]]]));
    for (const x of ["flowIn", "flowOut", "runsIn", "runsOut", "resIn", "resOut", "evOut", "evIn"]) {
      r[x] = { ...ra[x] };
      for (const [y, n] of Object.entries(rb[x])) r[x][y] = (r[x][y] || 0) + n;
    }
    out[k] = r;
  }
  return out;
}
// 型ごと・回の区切りごとに働き手へ分けて遊ばせる（報告を書くときだけ。checks の中では使わない）
export async function playStylesSplit({ games, steps, seed, jobs = availableParallelism(), chunk = 5 }) {
  const tasks = Object.keys(STYLES).flatMap((style) => Array.from({ length: Math.ceil(games / chunk) }, (_, k) => ({ styles: [style], steps, seed, start: k * chunk, games: Math.min(games, (k + 1) * chunk) })));
  const parts = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, () => new Promise((resolve, reject) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { t5: true } });
    const give = () => { if (next >= tasks.length) { w.terminate(); return; } const i = next++; w.postMessage({ i, task: tasks[i] }); };
    w.on("message", (m) => { if (m.error) { reject(new Error(m.error)); w.terminate(); return; } parts[m.i] = m.play; give(); });
    w.on("error", reject);
    w.on("exit", resolve);
    give();
  })));
  // 型の順（STYLES の順）・回の順に足す
  return parts.reduce((acc, p) => mergePlay(acc, p), {});
}
if (!isMainThread && workerData && workerData.t5) {
  parentPort.on("message", ({ i, task }) => {
    try { parentPort.postMessage({ i, play: playStyles(task) }); } catch (e) { parentPort.postMessage({ i, error: String(e.stack || e) }); }
  });
}

// ---------------------------------------------------------------- 集計
export const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const top10 = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * 0.9))]; };
const pct = (n, d) => (d ? Math.round((n / d) * 100) + "%" : "-");

// 壊れの目安（報告と tests/checks/t5_economy.mjs が使う）
export const CORE_SINKS = ["店で買う", "宿", "教会", "訓練場", "酒場（仲間）", "船賃"];
export function findBreaks(play) {
  const out = [];
  for (const r of Object.values(play)) {
    const n = r.games || 1;
    const name = STYLES[r.style].name;
    // 出口がほぼ使われない（ふつうの遊び方で、5% 未満の回でしか使われない主な出口）
    if (r.style === "normal") for (const k of CORE_SINKS) if ((r.runsOut[k] || 0) / n < 0.05) out.push({ kind: "unused", style: r.style, text: `${name}：出口「${k}」を使った回が ${pct(r.runsOut[k] || 0, n)}` });
    // 所持金が早い段階で膨らむ（30 日目の上位 10% が 5000G を超える）
    const g30 = r.goldAt[30];
    if (g30.length >= 3 && top10(g30) > 5000) out.push({ kind: "flood", style: r.style, text: `${name}：30 日目の所持金の上位 10% が ${top10(g30)}G` });
    // 型によって極端に詰む（死ぬ回が 9 割を超える・ずっと金欠の回が半分を超える）
    if (r.deaths / n > 0.9) out.push({ kind: "doom", style: r.style, text: `${name}：死亡率 ${pct(r.deaths, n)}` });
    if (r.broke / n > 0.5) out.push({ kind: "broke", style: r.style, text: `${name}：金欠（5G 未満）が冒険の 3 割以上続いた回 ${pct(r.broke, n)}` });
  }
  return out;
}
// 資源の入りと減りの比（全部の型の合計）。入りが減りの 5 倍を超え、50 個以上たまるものを「出口が細い」とする
export function resourceFlow(play) {
  const res = {};
  for (const r of Object.values(play)) for (const [f, dir] of [["resIn", "in"], ["resOut", "out"]]) for (const [k, n] of Object.entries(r[f])) {
    const id = k.split("|")[0];
    (res[id] ||= { in: 0, out: 0 })[dir] += n;
  }
  return res;
}
export function thinOutlets(play) {
  return Object.entries(resourceFlow(play)).filter(([, x]) => x.in >= 50 && x.in > x.out * 5).map(([id, x]) => ({ id, ...x }));
}

export function reportMd({ cen, play, games, steps, seed, ms, date, D }) {
  const L = [];
  const nm = (id) => (D.ITEMS[id] ? D.ITEMS[id].name : id);
  L.push(`# お金と資源の入口・出口（T5・${date}）`, "");
  L.push("`node tests/t5_econ.mjs` が書いた報告。数値の調整はしていない（持ち主の判断）。最後に提案だけ書く。", "");
  L.push("## 1. データから数えた入口と出口", "", "### 金（G）", "", "| 向き | 種類 | 数 | 中身 |", "|---|---|--:|---|");
  for (const x of cen.gold.in) L.push(`| 入口 | ${x.name} | ${x.n} | ${x.note} |`);
  for (const x of cen.gold.out) L.push(`| 出口 | ${x.name} | ${x.n} | ${x.note} |`);
  L.push("", "所持金の上限は無い（エンジンに金を頭打ちにする所が見当たらない）。", "");
  L.push("### 消耗する資源（使う品・交易の荷）", "", "入口・出口はデータ（敵の戦利品・店の品揃え・出来事の結果と条件・迷宮の主）と、エンジンのコードに id が書いてあるかで数えた。", "",
    "| 品 | 種類 | 値 | 入口 | 出口 | ほかに出てくる所 |", "|---|---|--:|---|---|---|");
  for (const r of cen.rows) L.push(`| ${r.name}（\`${r.id}\`） | ${r.type} | ${r.price} | ${r.ins.join("・") || "**なし**"} | ${r.outs.join("・") || "**なし**"} | ${r.other.join("・") || "-"} |`);
  L.push("", `- 入口の無い資源：${cen.noIn.length ? cen.noIn.map((id) => `${nm(id)}（\`${id}\`）`).join("・") : "なし"}`);
  L.push(`- 出口の無い資源（店で売る以外に使い道が無い）：${cen.noOut.length ? cen.noOut.map((id) => `${nm(id)}（\`${id}\`）`).join("・") : "なし"}`, "");

  L.push("## 2. 遊び方の型ごとの自動プレイ", "", `型ごとに ${games} 回・1 回 ${steps} 行動まで・種 ${seed}・職業と目的は回ごとに順に回す・${(ms / 1000).toFixed(0)} 秒。`, "");
  for (const [k, s] of Object.entries(STYLES)) L.push(`- **${s.name}**：${s.text}`);
  L.push("", "### 生き残りと所持金", "", "| 型 | 回 | 死亡率 | 日数（中央値） | 最後の所持金（中央値／上位10%） | 一番多かった所持金（中央値／上位10%） | 金欠が続いた回 |", "|---|--:|--:|--:|--:|--:|--:|");
  for (const r of Object.values(play)) L.push(`| ${STYLES[r.style].name} | ${r.games} | ${pct(r.deaths, r.games)} | ${median(r.days)} | ${median(r.endGold)} / ${top10(r.endGold)} | ${median(r.maxGold)} / ${top10(r.maxGold)} | ${pct(r.broke, r.games)} |`);
  L.push("", "### 日数ごとの所持金（その日まで生きていた回の 中央値 / 上位10%・回数）", "", `| 型 | ${CHECK_DAYS.map((d) => d + "日").join(" | ")} |`, `|---|${CHECK_DAYS.map(() => "--:").join("|")}|`);
  for (const r of Object.values(play)) L.push(`| ${STYLES[r.style].name} | ${CHECK_DAYS.map((d) => r.goldAt[d].length ? `${median(r.goldAt[d])} / ${top10(r.goldAt[d])}（${r.goldAt[d].length}）` : "-").join(" | ")} |`);
  const kindsOut = [...new Set(Object.values(play).flatMap((r) => Object.keys(r.flowOut)))].sort();
  const kindsIn = [...new Set(Object.values(play).flatMap((r) => Object.keys(r.flowIn)))].sort();
  const flowTable = (title, kinds, f, runs) => {
    L.push("", `### ${title}（使った回の割合・使った金の割合）`, "", `| 種類 | ${Object.values(play).map((r) => STYLES[r.style].name).join(" | ")} |`, `|---|${Object.values(play).map(() => "--:").join("|")}|`);
    for (const k of kinds) L.push(`| ${k} | ${Object.values(play).map((r) => { const tot = Object.values(r[f]).reduce((a, b) => a + b, 0); return `${pct(r[runs][k] || 0, r.games)}・${pct(r[f][k] || 0, tot)}`; }).join(" | ")} |`);
  };
  flowTable("金の出口", kindsOut, "flowOut", "runsOut");
  flowTable("金の入口", kindsIn, "flowIn", "runsIn");
  // 出来事のうち、金の動きの大きいもの（ふつう）
  const nrm = play.normal || Object.values(play)[0];
  const topEv = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, g]) => `\`${id}\` ${g}G`).join("・") || "なし";
  L.push("", `出来事で金が動いた上位（${STYLES[nrm.style].name}・合計）：入り ${topEv(nrm.evIn)}／出 ${topEv(nrm.evOut)}`);
  // 資源の動き（全部の型の合計）
  const res = {};
  for (const r of Object.values(play)) {
    for (const [k, n] of Object.entries(r.resIn)) { const [id, kind] = k.split("|"); ((res[id] ||= { in: {}, out: {} }).in[kind] = (res[id].in[kind] || 0) + n); }
    for (const [k, n] of Object.entries(r.resOut)) { const [id, kind] = k.split("|"); ((res[id] ||= { in: {}, out: {} }).out[kind] = (res[id].out[kind] || 0) + n); }
  }
  const fmt = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join("・") || "-";
  L.push("", "### 資源の動き（全部の型の合計・個数）", "", "| 品 | 手に入れた | 減った |", "|---|---|---|");
  for (const [id, x] of Object.entries(res).sort((a, b) => Object.values(b[1].in).reduce((p, q) => p + q, 0) - Object.values(a[1].in).reduce((p, q) => p + q, 0))) L.push(`| ${nm(id)} | ${fmt(x.in)} | ${fmt(x.out)} |`);
  const never = cen.rows.filter((r) => !res[r.id]).map((r) => nm(r.id));
  L.push("", `自動プレイで一度も動かなかった資源：${never.join("・") || "なし"}`);
  return L;
}

// ---------------------------------------------------------------- 直接動かしたとき：報告を書く
if (isMainThread && process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const games = Number(process.env.T5_GAMES || 40), steps = Number(process.env.T5_STEPS || 1500), seed = Number(process.env.T5_SEED || 0);
  const jobs = Number(process.env.JOBS || availableParallelism());
  const G = loadEngine();
  const t0 = Date.now();
  const cen = census(G);
  const play = jobs > 1 ? await playStylesSplit({ games, steps, seed, jobs }) : playStyles({ games, steps, seed });
  const ms = Date.now() - t0;
  const date = process.env.T5_DATE || new Date().toISOString().slice(0, 10);
  const L = reportMd({ cen, play, games, steps, seed, ms, date, D: G.data });
  const br = findBreaks(play);
  const thin = thinOutlets(play);
  L.push("", "## 3. 壊れの目安（自動で判定したもの）", "", ...(br.length ? br.map((b) => `- ${b.text}`) : ["- 目安に掛かったものは無い"]));
  L.push(...thin.map((x) => `- 出口が細い資源：${G.data.ITEMS[x.id].name}（\`${x.id}\`）手に入れた ${x.in}・減った ${x.out}`));
  const file = process.env.T5_OUT || path.join(ROOT, "docs", "review", `economy_${date}.md`);
  writeFileSync(file, L.join("\n") + "\n");
  console.log(L.join("\n"));
  console.log(`\n→ ${path.relative(ROOT, file)}`);
}
