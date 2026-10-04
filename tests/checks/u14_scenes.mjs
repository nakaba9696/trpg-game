// U14：場面ごとの見た目と、町に着いたときの語り（src/engine/zzzzzzzz_u14_arrive.js・src/ui/zu14_scenes.js・.css）。DOM なしで確かめられる範囲
// - 場面の種類（G.u14.kindOf）：街・荒野・迷宮・戦闘・語り（出来事・旅の途中）・終わり
// - 看板（G.u14.signOf）：町の名前と地方・迷宮の階と危険度・旅の行き先
// - 着いたとき：場所の見出しのすぐ後ろ（説明の前）に、歩いて／船で何日の一行。はじめての町ならもう一行。旅をせずに着いたときは足さない。S.u14arr が残る
// - 町の見出しを出すのは、着いた手番だけ（G.u14.arrived）
// - CSS：選択肢の並べ方（U12・U13）に触らない・動きを減らす設定がある・v9_pc.css より後に読まれる
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U14：" + m); };
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const D = G.data;
  vm.runInContext(src("ui/zu14_scenes.js"), vm.createContext({ console, G }), { filename: "ui/zu14_scenes.js" });
  const U = G.u14;
  for (const k of ["kindOf", "signOf", "arrived", "cardLine", "howLine", "firstLine", "days"]) if (!U || typeof U[k] !== "function") return fail(`G.u14.${k} が無い`);

  const stats = {};
  D.STATS.forEach((k) => { stats[k] = 44; });
  const fresh = () => {
    G.rand = seeded(14);
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
    return G.S;
  };
  const ids = (t) => Object.keys(D.LOCS).filter((id) => D.LOCS[id].type === t);
  const town = ids("town").find((id) => D.LOCS[id].sea && Object.keys(D.LOCS[id].sea).length) || ids("town")[0];
  const wild = ids("wild")[0], dun = ids("dungeon").find((id) => D.LOCS[id].floors) || ids("dungeon")[0];

  // ---- 場面の種類
  let S = fresh();
  S.loc = town; S.mode = "explore";
  if (U.kindOf(S) !== "town") fail("町にいるのに town にならない");
  S.mode = "fac"; S.fac = "inn";
  if (U.kindOf(S) !== "town") fail("町の施設の中が town にならない");
  S.mode = "explore"; S.fac = null; S.loc = wild;
  if (U.kindOf(S) !== "wild") fail("荒野が wild にならない");
  S.loc = dun; S.depth = 2;
  if (U.kindOf(S) !== "dungeon") fail("迷宮が dungeon にならない");
  const sg = U.signOf(S);
  if (!sg || sg.name !== D.LOCS[dun].name || !sg.marks.some((m) => m.includes("地下2階")) || !sg.marks.some((m) => m.includes("危険"))) fail("迷宮の看板に深さ・危険度が出ない");
  S.loc = town; S.depth = 0;
  G.startEvent(D.EVENTS.find((e) => !e.w6 && !e.cond && e.choices && e.choices.length).id);
  if (U.kindOf(S) !== "story") fail("出来事の場面が story にならない");
  S.mode = "explore"; S.event = null; S.travel = wild;
  if (U.kindOf(S) !== "story" || !/へ$/.test(U.signOf(S).name)) fail("旅の途中が story・行き先の看板にならない");
  S.travel = null;
  G.startCombat(["goblin"], {});
  if (U.kindOf(S) !== "combat") fail("戦闘が combat にならない");
  S.combat = null; S.mode = "explore";
  S.over = "dead";
  if (U.kindOf(S) !== "over" || U.signOf(S) !== null) fail("終わった冒険が over にならない");
  if (U.kindOf(null) !== null) fail("冒険が無いときに種類を返す");
  const tsg = (() => { const s = fresh(); s.loc = town; return U.signOf(s); })();
  if (!tsg || tsg.kind !== "town" || tsg.name !== D.LOCS[town].name) fail("町の看板に町の名前が出ない");

  // ---- 着いたとき（旅の出来事・襲撃を止めて、ふつうに旅をする）
  const travelTo = (seaTrip) => {
    const S = fresh();
    S.loc = town;
    S.visited = { [town]: true };
    S.gold = 999;
    const c0 = G.w6.count, r0 = G.w6.raidChance;
    G.w6.count = () => 0; G.w6.raidChance = () => 0;
    const to = seaTrip ? Object.keys(D.LOCS[town].sea)[0] : Object.keys(D.LOCS[town].links)[0];
    try { G.act((seaTrip ? "sail:" : "travel:") + to); } finally { G.w6.count = c0; G.w6.raidChance = r0; }
    return { S, to };
  };
  for (const sea of [false, true]) {
    const { S, to } = travelTo(sea);
    const L = D.LOCS[to];
    if (S.loc !== to) { fail(`${sea ? "船" : "陸"}の旅で ${to} に着かない`); continue; }
    const ti = S.log.map((e) => e.k === "title" && e.text === L.name).lastIndexOf(true);
    const di = S.log.map((e) => e.text === L.desc).lastIndexOf(true);
    if (ti < 0 || di < 0) { fail("着いたときの見出しか説明が無い"); continue; }
    const how = S.log[ti + 1];
    if (!how || how.k !== "nar" || !(sea ? /船/ : /日/).test(how.text)) fail(`${sea ? "船" : "陸"}の旅で、どうやって着いたかの一行が見出しのすぐ後ろに無い（${how && how.text}）`);
    if (L.type === "town" && !S.log.slice(ti + 1, di).some((e) => e.text === U.firstLine(0) || [0, 1, 2].some((k) => e.text === U.firstLine(k)))) fail("はじめての町なのに一言が無い");
    if (!(di > ti + 1)) fail("足した行が説明より後ろにある");
    if (!S.log[ti].u14) fail("場所の見出しに日付が付かない");
    const a = S.u14arr;
    if (!a || a.loc !== to || a.sea !== sea || !a.days || a.first !== true) fail(`S.u14arr が違う：${JSON.stringify(a)}`);
    if (L.type === "town" && !U.arrived(S)) fail("着いた手番なのに見出しを出さない");
    if (L.type === "town" && !U.cardLine(a).length) fail("町の見出しの下の一行が空");
    S.turn += 2;
    if (U.arrived(S)) fail("着いた次の手番でも見出しを出す");
    if (S.log.length > 240) fail("記録が 240 件を超えた");
  }
  // 旅をせずに着いた（はじめの町など）ときは足さない。二度目の町では一言を足さない
  {
    const S = fresh();
    const n = S.log.length;
    S.w6 = null;
    G.arrive(wild);
    const added = S.log.slice(n);
    if (added.some((e) => [0, 1, 2].some((k) => e.text === U.howLine({ days: 1, type: D.LOCS[wild].type }, k)))) fail("旅をしていないのに、どうやって着いたかの一行が入る");
    S.visited[town] = true;
    S.w6 = { dest: town, from: wild, sea: false, days: 2, danger: 1, left: 0, raid: false, seen: [] };
    const m = S.log.length;
    G.arrive(town);
    if (S.log.slice(m).some((e) => [0, 1, 2].some((k) => e.text === U.firstLine(k)))) fail("二度目の町なのに「はじめて」の一言が入る");
    if (S.u14arr.first) fail("二度目の町が first になる");
  }
  // 古いセーブ（S.u14arr が無い）でも動く
  {
    const S = fresh();
    delete S.u14arr;
    if (U.arrived(S)) fail("S.u14arr の無いセーブで見出しを出す");
  }
  // 文は決まり（D7 の禁句）に触れない
  const lines = [];
  for (const k of [0, 1, 2]) {
    lines.push(U.firstLine(k));
    for (const type of ["town", "wild", "dungeon"]) for (const sea of [false, true]) lines.push(U.howLine({ sea, days: 3, type }, k));
  }
  for (const t of lines) if (/見世物|観客|客席|舞台|台本|魔王/.test(t)) fail(`語りに使わない言葉がある：${t}`);
  if (U.days(5) !== "五日" || U.days(12) !== "12日") fail("日数の書き方が違う");

  // ---- CSS
  const dir = new URL("../../src/ui/", import.meta.url);
  const css = readFileSync(new URL("zu14_scenes.css", dir), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  if (/\.alist|\.act\b|\.agroup/.test(css)) fail("zu14_scenes.css が選択肢の並べ方に触れている（U12・U13 に任せる）");
  if (!/prefers-reduced-motion:\s*reduce/.test(css)) fail("動きを減らす設定が無い");
  for (const k of ["town", "wild", "dungeon", "combat", "story"]) if (!css.includes(`body[data-u14="${k}"] .tome`)) fail(`${k} の枠の見た目が無い`);
  if (/requestAnimationFrame\(\s*function\s+loop|setInterval/.test(src("ui/zu14_scenes.js"))) fail("毎コマ描く処理を足している");
  const order = readdirSync(dir).filter((n) => n.endsWith(".css")).sort();
  if (order.indexOf("zu14_scenes.css") < order.indexOf("v9_pc.css")) fail("zu14_scenes.css が v9_pc.css より先に読まれる");

  if (!bad) ok("U14：場面の種類・看板・着いたときの語り（陸・船・はじめての町）・見出しの出しどき・CSS の決まり");
};
