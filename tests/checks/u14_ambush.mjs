// U14：会話・出来事・旅のあとに戦闘が始まるときの境目（src/engine/zzzzzzzzz_u14_ambush.js・src/ui/zu14_scenes.*）
// 持ち主「道端で会話した後、急に戦闘が始まると、そいつが襲ってきたように見えるので、動作の切り替わりは分かるようにして」
// - 出来事（旅の道中の出来事）から戦闘：「戦闘」の見出しの前に区切りの一行、見出しのあとに敵の名前の入った一文。S.combat.u14cut が残る
// - 旅の襲撃：「何者かに襲われた」が敵の名前になり、区切りは「旅を続けるうちに」
// - 前の場面と関係ない戦闘（探索で出会った）は、今まで通り（区切りを入れない）
// - 会話の立ち絵が戦闘に残らない：戦闘中は話し手を返さない（V5 の G.stand.whoOf・V9 の G.v9.castOf）。出ていく立ち絵を戦闘の見た目ですぐ消す CSS がある
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U14 境目：" + m); };
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const D = G.data;
  const U = G.u14;
  if (!U || typeof U.cut !== "function" || typeof U.attackLine !== "function" || typeof U.foeNames !== "function") return fail("G.u14.cut・attackLine・foeNames が無い");
  const stats = {};
  D.STATS.forEach((k) => { stats[k] = 44; });
  const fresh = () => {
    G.rand = seeded(7);
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
    return G.S;
  };
  const enemyName = (S) => (S.combat.foes || []).map((f) => (D.ENEMIES[f.id] || {}).name);
  const afterTitle = (S) => {
    const ti = S.log.map((e) => e.k === "title" && e.text === "戦闘").lastIndexOf(true);
    return { ti, before: S.log[ti - 1], next: S.log.slice(ti + 1).find((e) => e.k === "nar" && !e.fx) };
  };

  // ---- 旅の道中の出来事で、話していた人の横から別の魔物が出る（船尾の釣り → 蟹）
  {
    const S = fresh();
    const ev = D.EVENTS.find((e) => e.id === "w6s_fishing");
    const i = ev ? ev.choices.findIndex((c) => c.ng && c.ng.fight) : -1;
    if (!ev || i < 0) fail("確かめに使う出来事（w6s_fishing）が無い");
    else {
      S.travel = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && id !== S.loc);
      S.w6 = { dest: S.travel, from: S.loc, sea: true, days: 3, danger: 0, left: 0, raid: false, seen: [ev.id], tod: "昼" };
      G.startEvent(ev.id);
      G.rand = () => 0.999; // 判定に失敗して戦闘へ
      G.chooseEvent(i);
      if (!S.combat) fail("出来事から戦闘が始まらない");
      else {
        const { ti, before, next } = afterTitle(S);
        if (ti < 0) fail("「戦闘」の見出しが無い");
        if (!before || !before.u14cut || before.text !== U.HEAD.event) fail(`「戦闘」の見出しの前に区切りの一行が無い（${before && before.text}）`);
        if (!next || !enemyName(S).some((n) => next.text.includes(n))) fail(`襲ってきた一文に敵の名前が無い（${next && next.text}）`);
        if (!S.combat.u14cut || !S.combat.u14cut.line.includes(enemyName(S)[0])) fail("S.combat.u14cut が残らない");
        // 話していた人（船乗り）が襲ってきたとは書かない
        if (/船乗り|ロサ/.test(next.text)) fail("話していた人が襲ってきたように書いている");
      }
    }
  }

  // ---- 魔物そのものが出来事の相手（「鍋をのぞく小鬼」など）
  {
    const line = U.attackLine(["goblin"], { kind: "foe", foe: "goblin" }, 0);
    if (!line.includes(D.ENEMIES.goblin.name)) fail("出来事の相手が敵になる一文に、敵の名前が無い");
    const h = U.attackLine(["bandit", "bandit"], { kind: "rogue" }, 0);
    if (!h.includes(D.ENEMIES.bandit.name + "たち")) fail(`同じ敵が二人のときの呼び名が違う（${h}）`);
  }

  // ---- 旅の襲撃：「何者か」→ 敵の名前、区切りは「旅を続けるうちに」
  {
    const S = fresh();
    const L = G.loc();
    const to = Object.keys(L.links || {})[0];
    const c0 = G.w6.count, r0 = G.w6.raidChance;
    G.w6.count = () => 0; G.w6.raidChance = () => 1;
    try { G.act("travel:" + to); } finally { G.w6.count = c0; G.w6.raidChance = r0; }
    if (!S.combat) fail("旅の襲撃が起きない");
    else {
      if (S.log.some((e) => /何者か/.test(e.text || ""))) fail("「何者かに襲われた」が残っている");
      const raid = S.log.find((e) => /に襲われた。$/.test(e.text || ""));
      if (!raid || !enemyName(S).some((n) => raid.text.includes(n))) fail(`襲われた一文に敵の名前が無い（${raid && raid.text}）`);
      const { next } = afterTitle(S);
      const ri = S.log.indexOf(raid);
      const before = S.log[ri - 1];
      if (!before || !before.u14cut || before.text !== U.HEAD.travel) fail(`旅の襲撃の一文の前に「${U.HEAD.travel}」の区切りが無い（${before && before.text}）`);
      if (!next || !enemyName(S).some((n) => next.text.includes(n))) fail("旅の襲撃の一文に敵の名前が無い");
    }
  }

  // ---- 前の場面と関係ない戦闘は今まで通り
  {
    const S = fresh();
    S.travel = null;
    G.startCombat(["goblin"], {});
    if (S.log.some((e) => e.u14cut) || S.combat.u14cut) fail("出来事・旅でない戦闘に区切りを入れている");
  }

  // ---- 会話の立ち絵が戦闘に残らない（V5・V9 の決まり）と、CSS
  {
    const vmc = vm.createContext({ console, G, Image: class { addEventListener() {} } });
    for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v5_stand.js", "v9_pc.js"]) vm.runInContext(src("ui/" + f), vmc, { filename: "ui/" + f });
    const S = fresh();
    const ev = D.EVENTS.find((e) => e.id === "w6s_fishing") || D.EVENTS.find((e) => e.who && e.who.kind !== "foe");
    G.startEvent(ev.id);
    const talking = G.stand.whoOf(S);
    if (!talking) fail("出来事の話し手が分からない（確かめられない）");
    G.startCombat(["goblin"], {});
    if (G.stand.whoOf(S)) fail("戦闘中も話し手の立ち絵を出す（スマホ）");
    const cast = G.v9 && G.v9.castOf ? G.v9.castOf(S) : [];
    if (cast.some((c) => c.role === "speaker")) fail("戦闘中も話し手の立ち絵を出す（PC）");
    const css = src("ui/zu14_scenes.css").replace(/\/\*[\s\S]*?\*\//g, "");
    if (!/body\[data-u14="combat"\] #v9cast \.v9fig\.out[^{]*#stand \.standFig:not\(\.on\)[^{]*\{[^}]*opacity:\s*0/.test(css)) fail("戦闘の見た目で、出ていく立ち絵をすぐ消す CSS が無い");
    if (!/#log \.u14later\s*\{[^}]*display:\s*none/.test(css)) fail("結果の場面の間に、次の場面の文を隠す CSS が無い");
    const js = src("ui/zu14_scenes.js");
    if (!/u13\.holding/.test(js)) fail("U13 の結果の場面の間も戦闘の見た目にしていない");
  }

  if (!bad) ok("U14 境目：出来事・旅から戦闘への区切りと、敵の名前の入った一文・旅の襲撃の名前・話し手の立ち絵が戦闘に残らない");
};
