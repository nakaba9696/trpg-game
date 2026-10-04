// M7: 判定の振り直し（engine/reroll_m7.js・data/m7_reroll.js）
// - 古いセーブ（S.rerolls が無い）でも動き、振り直しは出ない
// - 失敗した判定のあとに「振り直す」が出て、使うと 1 減り、同じ場面で出目だけが振り直される。二度目は振り直せない
// - 上限を超えない。欠けた賽子・賽の夜・祠・瀕死から立ち上がる、で増える
// - ランダムプレイ：振り直しを使う遊び方と使わない遊び方で、同じ種の 150 回を比べる（数字を出すだけ）
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const before = { n: 0 };
  const bad = (m) => { before.n++; fail(m); };
  const start = (cls, seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 40; caps[k] = 60; });
    G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const hasRR = () => acts().some((a) => a.id === "rr:go");
  // 決まった出目を順に返す乱数（尽きたら 0.5）
  const script = (vals) => { let i = 0; return () => (i < vals.length ? vals[i++] : 0.5); };

  // 持ち始め
  if (start("merc", 1).rerolls !== 1) bad("傭兵の振り直しの持ち始めが 1 でない");
  if (start("thief", 2).rerolls !== 2) bad("盗賊の振り直しの持ち始めが 2 でない");

  // 古いセーブ：S.rerolls が無い → 0。失敗しても振り直しは出ない
  let S = start("merc", 3);
  delete S.rerolls;
  G.startEvent("shrine");
  G.rand = script([0.9]);
  G.act("ev:0"); // 祈る（魔力・普通）。出目 91 で失敗
  if (hasRR()) bad("古いセーブ（振り直し 0）なのに振り直しが出る");
  if (G.rerolls() !== 0) bad("古いセーブの振り直しが 0 でない");

  // 失敗 → 振り直す → 同じ場面で出目だけ新しい。回数が減る。二度目は振り直せない
  S = start("merc", 4);
  S.stats.魔力 = 40;
  G.startEvent("shrine");
  const gold0 = S.gold, turn0 = S.turn;
  G.rand = script([0.9]); // 出目 91：失敗
  G.act("ev:0");
  const dice = S.log.filter((e) => e.k === "dice");
  const failed = dice[dice.length - 1];
  if (!failed || failed.ok) bad("用意した判定が失敗にならない");
  const rr = acts().find((a) => a.id === "rr:go");
  if (!rr || !/残り 1/.test(rr.sub)) bad("失敗した判定のあとに「振り直す（残り 1）」が出ない");
  if (!G.rerollTarget(failed)) bad("記録の失敗した判定に振り直しのしるしが付かない");
  if (!/振り直す/.test(rr.label)) bad("「振り直す」が選択肢の名前に無い");
  G.rand = script([0.01, 0.99]); // 出目 2：成功（成長はしない）
  G.act("rr:go");
  const last = S.log.filter((e) => e.k === "dice").pop();
  if (!last || !last.ok || !last.rr || last.rr.roll !== failed.roll) bad("振り直した判定の結果が記録に残らない");
  if (S.rerolls !== 0 || S.counters.rerolls !== 1 || S.counters.rerollWins !== 1) bad(`振り直しの回数が減らない（残り ${S.rerolls}）`);
  if (S.turn !== turn0 + 1) bad(`振り直すと手番が余計に進む（${turn0}→${S.turn}）`);
  if (S.gold !== gold0 || S.mode !== "explore" || S.event) bad("振り直したあとの場面が、行動のあとと食い違う");
  if (S.log.filter((e) => e.k === "dice" && e.reason === "祈る").length !== 1) bad("振り直す前の判定が記録に二重に残る");
  if (!S.log.some((e) => /転がり直った/.test(e.text || ""))) bad("振り直しの一文が出ない");
  if (hasRR()) bad("回数が無いのに、また振り直せる");

  // 二度目は受け入れる：回数があっても、振り直した判定はもう振り直せない
  S = start("thief", 5);
  G.startEvent("shrine");
  G.rand = script([0.9]);
  G.act("ev:0");
  G.rand = script([0.9]); // もう一度失敗
  G.act("rr:go");
  if (S.rerolls !== 1) bad("盗賊の振り直しが 1 減らない");
  if (hasRR()) bad("振り直した判定を、もう一度振り直せる");
  // ほかの行動をしたら、振り直しは消える
  G.startEvent("shrine");
  G.rand = script([0.9]);
  G.act("ev:0");
  if (!hasRR()) bad("二度目の失敗で振り直しが出ない");
  G.act(acts().find((a) => a.id !== "rr:go").id);
  if (hasRR()) bad("ほかの行動をしたのに、前の判定を振り直せる");

  // 戦闘の判定も振り直せる
  S = start("merc", 6);
  S.maxHp = S.hp = 999;
  G.startCombat(["dogu"], {});
  G.rand = script([0.97]); // 大失敗
  G.act("cb:attack");
  if (!hasRR()) bad("戦闘の攻撃の失敗を振り直せない");
  const foeHp = G.S.combat && G.S.combat.foes[0].hp;
  G.rand = seeded(66);
  G.act("rr:go");
  if (S.counters.rerolls !== 1) bad("戦闘の振り直しが数えられない");
  if (!(S.log.filter((e) => e.k === "dice" && e.rr).length === 1)) bad("戦闘の振り直しが記録に残らない");
  if (foeHp === undefined) bad("戦闘が用意できていない");

  // 上限と増やし方
  S = start("merc", 7);
  G.give("m7_chipdie", 4);
  for (let i = 0; i < 4; i++) G.useItem("m7_chipdie");
  if (S.rerolls !== G.REROLL_MAX || S.inv.m7_chipdie !== 2) bad(`欠けた賽子で上限（${G.REROLL_MAX}）を超えるか、上限なのに賽子が減る（${S.rerolls}・残り賽子 ${S.inv.m7_chipdie}）`);
  G.gainReroll(5);
  if (S.rerolls !== G.REROLL_MAX) bad("上限を超えて増えた");
  S.rerolls = 0;
  G.startEvent("m7_shrine");
  G.act("ev:1"); // 賽子を懐に入れる：+1、呪い
  if (S.rerolls !== 1 || !S.conds.includes("呪い")) bad("祠の賽子で振り直しが増えないか、呪いがつかない");
  // 賽の夜：冬の町でだけ、一冬に一度
  S.loc = D.CLASSES.merc.start; S.day = 1;
  const nightOk = () => D.EVENTS.find((e) => e.id === "m7_dicenight").cond(S);
  if (nightOk()) bad("春なのに賽の夜が起きる");
  S.day = 300;
  if (!nightOk()) bad("冬なのに賽の夜が起きない");
  G.startEvent("m7_dicenight");
  S.gold = 100;
  G.rand = script([0.01, 0.99]);
  G.act("ev:0");
  if (nightOk()) bad("同じ冬に賽の夜が二度起きる");
  if (!S.inv.m7_chipdie) bad("賽の夜に勝っても欠けた賽子が手に入らない");
  S.day = 300 + 360;
  if (!nightOk()) bad("次の冬に賽の夜が起きない");
  // 瀕死から立ち上がると +1
  S.rerolls = 0; S.hp = 1; S.clungUsed = false;
  G.rand = script([0.01, 0.99]);
  G.hurt(5, "テスト");
  if (S.over || S.rerolls !== 1) bad("瀕死から立ち上がっても振り直しが増えない");

  // ---------------------------------------------------------------- ランダムプレイ：振り直しを使う・使わない
  const play = (useIt, GAMES = 150, STEPS = 500) => {
    let deaths = 0, turns = 0, used = 0, gained = 0, wins = 0, offered = 0, chips = 0;
    for (let g = 0; g < GAMES; g++) {
      const cls = Object.keys(D.CLASSES)[g % 5];
      G.rand = seeded(1000 + g);
      G.P = { trophies: {}, graves: [] };
      const stats = {}, caps = {};
      D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; caps[k] = stats[k] + 30; });
      G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[g % 4], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
      if (!useIt) G.S.rerolls = 0;
      for (let step = 0; step < STEPS && !G.S.over; step++) {
        if (G.S.inv.m7_chipdie && G.S.mode !== "combat") { chips++; if (useIt) G.useItem("m7_chipdie"); else G.take("m7_chipdie"); }
        if (!useIt) G.S.rerolls = 0;
        const list = acts().filter((a) => !a.disabled);
        if (!list.length) break;
        if (list[0].id === "rr:go") { offered++; G.act("rr:go"); continue; }
        G.act(list[Math.floor(G.rand() * list.length)].id);
      }
      const S = G.S;
      if (S.over === "dead") deaths++;
      turns += S.turn;
      used += S.counters.rerolls || 0; gained += S.counters.rerollGains || 0; wins += S.counters.rerollWins || 0;
    }
    return { deaths, turns: Math.round(turns / GAMES), used, gained, wins, offered, chips };
  };
  const off = play(false), on = play(true);
  if (on.used === 0) bad("ランダムプレイで振り直しが一度も使われない");
  if (on.gained === 0) bad("ランダムプレイで振り直しが一度も増えない");
  console.log(`NOTE M7 振り直し：使わない 死亡 ${off.deaths}/150・平均 ${off.turns} 手番 ／ 使う 死亡 ${on.deaths}/150・平均 ${on.turns} 手番（使った ${on.used}・成功に変わった ${on.wins}・旅で増えた ${on.gained}・欠けた賽子 ${on.chips}）`);
  if (!before.n) ok(`判定の振り直し（古いセーブ・振り直しの一回きり・戦闘・上限 ${G.REROLL_MAX}・賽子・賽の夜・祠・瀕死）`);
};
