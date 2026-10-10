// R11：十年の区切り・能力値 99・正気の見え方（src/engine/zzzzzzzzzzzzzzzzzzz_r11_*.js・src/data/r11_decade.js・src/ui/zzzzzz_r11_mind.js）
// - 能力値：成長・装備で 99 を超えない。古いセーブの 99 超えは読み込みで 99 に
// - 十年：九年目・十年目・残り三か月の知らせが一度ずつ。十年に着くと（戦いの途中なら終わってから）節目「十年」で引退し、
//   墓碑・年表・トロフィー（r11_decade）・「その後」（引退の歳＝始めた歳＋10）が残る。古いセーブは読み込んだ日から一年は続けられる
// - 「その後」は状態（位・家と連れ合い・使徒・手配・善悪・職業・目的）で変わる。置き換え漏れ（{ や undefined）が無い
// - 正気：減るたびに理由の一行。迷宮の深みは、まだ降りたことの無い深さだけで減る。戻す手段（仲間と話す・旅立った町）が効く。
//   段が深くなると戻し方の案内。人物の表に「冒険の年」と「心を休める」
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const R = D.R11;
  let bad = 0;
  const f = (m) => { bad++; fail("R11: " + m); };
  const start = (cls, seed, o) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats(cls, G.rand);
    G.newGame(Object.assign({ cls, stats, caps, goal: "king", profile: { name: "テスト", sex: "女", age: 24, history: "", personality: "無口" } }, o || {}));
    return G.S;
  };
  const texts = (S, n) => S.log.slice(-(n || 60)).map((l) => l.text || "").join("\n");
  const firstAct = () => G.actions().flatMap((g) => g.list).find((a) => !a.disabled && /^(rest|wait|camp|look|explore|fac:)/.test(a.id)) || G.actions().flatMap((g) => g.list).find((a) => !a.disabled);
  const Y = G.YEAR_DAYS;

  // ---------------------------------------------------------------- 能力値は 99 で止まる
  let S = start("merc", 1101);
  S.stats.筋力 = 98; S.s5exp = {};
  for (let i = 0; i < 400; i++) G.grow("筋力", 4);
  if (S.stats.筋力 !== 99) f(`成長で筋力が ${S.stats.筋力}（99 で止まるはず）`);
  const [a, b, got] = G.grow("筋力", 4);
  if (b !== 99 || got !== 0) f(`99 のあとも経験が入る（${a}→${b}・${got}）`);
  if (G.statEff("筋力") > 99) f(`装備や補正で 99 を超える（${G.statEff("筋力")}）`);
  S.stats.体力 = 120; S.stats.魔力 = 105;
  G.fixOldNames(S);
  if (S.stats.体力 !== 99 || S.stats.魔力 !== 99) f(`古いセーブの 99 超えが読み込みで止まらない（体力 ${S.stats.体力}・魔力 ${S.stats.魔力}）`);
  if (S.maxHp !== G.maxHpOf(S.stats) || S.hp > S.maxHp) f("99 に止めたあと HP の最大が合わない");

  // ---------------------------------------------------------------- 十年：知らせと引退
  S = start("priest", 1102);
  if (!S.r11 || S.r11.start !== S.day || S.r11.age0 !== 24) f(`新しい冒険に十年の起点が無い（${JSON.stringify(S.r11)}）`);
  const rows = G.r11Rows(S);
  if (!rows.some(([k, v]) => k === R.ROW_YEAR && /1年目/.test(v))) f("人物の表に「冒険の年」の行が無い");
  const told = [];
  for (const d of [100, 8 * Y + 1, 8 * Y + 2, 9 * Y + 1, 10 * Y - 89, 10 * Y - 10]) {
    S.day = d; S.mode = "explore"; S.event = null; S.combat = null;
    const n0 = Object.keys(S.r11.told).length;
    G.act(firstAct().id);
    if (S.over) { f(`${d} 日目で終わってしまった（${S.over}）`); break; }
    if (Object.keys(S.r11.told).length > n0) told.push(d);
  }
  if (told.join() !== [8 * Y + 1, 9 * Y + 1, 10 * Y - 89].join()) f(`知らせの日が違う（${told.join("・")}）`);
  if (!/冒険者でいられる時間は、残り少ない/.test(S.log.map((l) => l.text).join("\n"))) f("九年目の知らせに「残り少ない」が無い");
  // 戦いの途中に十年が来たら、戦いが終わるまで待つ
  S.day = 10 * Y + 1;
  S.mode = "combat"; S.combat = { foes: [] };
  G.r11.tick();
  if (S.over) f("戦いの途中で引退してしまった");
  S.mode = "explore"; S.combat = null;
  G.act(firstAct().id);
  if (S.over !== "end" || !S.ending || S.ending.id !== "decade") f(`十年で引退しない（over=${S.over} ending=${JSON.stringify(S.ending)}）`);
  if (!G.P.trophies.r11_decade) f("十年のトロフィーが無い");
  const g = G.P.graves[0];
  if (!g || g.ending !== "decade" || !g.story || !(g.story.after || []).length) f("墓碑に十年の物語が残らない");
  else {
    const all = [...g.story.life, ...g.story.after, g.epitaph].join("\n");
    if (/\{|undefined|NaN/.test(all)) f(`十年の物語に置き換え漏れ：${all.match(/.{0,20}(\{|undefined|NaN).{0,20}/)[0]}`);
    if (!g.story.after[0].includes("34歳")) f(`引退の歳が始めた歳＋10 でない：${g.story.after[0]}`);
    if (!(g.story.death && g.story.death.age > 34)) f(`最期の歳が引退より前（${g.story.death && g.story.death.age}）`);
  }
  if (!S.chronicle.some((c) => c.kind === "end" && /十年/.test(c.text))) f("年表に十年の引退の行が無い");
  try { JSON.parse(JSON.stringify(S)); } catch (e) { f("引退したあとのセーブが JSON にできない"); }

  // 古いセーブ：r11 が無く、もう十年を過ぎている → 読み込んだ日から一年
  S = start("thief", 1103);
  delete S.r11; S.day = 12 * Y + 5;
  G.fixOldNames(S);
  if (!S.r11 || G.r11.left(S) !== (R.YEARS - (R.YEARS - 1)) * Y) f(`古いセーブの残りが一年でない（${S.r11 && G.r11.left(S)}）`);
  S.mode = "explore";
  G.act(firstAct().id);
  if (S.over) f("古いセーブを読み込んだ直後に引退してしまった");

  // ---------------------------------------------------------------- 「その後」は状態で変わる
  const story = (seed, set) => {
    const S = start(set.cls || "merc", seed, set.opt);
    S.day = 10 * Y + 1;
    set.fn(S);
    S.mode = "explore";
    G.act(firstAct().id);
    const st = S.story || {};
    const t = (st.after || []).join("\n");
    if (S.over !== "end") f(`${set.name}: 引退しない`);
    if (/\{|undefined|NaN/.test(t)) f(`${set.name}: 置き換え漏れ：${(t.match(/.{0,20}(\{|undefined|NaN).{0,20}/) || [""])[0]}`);
    return t;
  };
  const cases = [
    { name: "国王", fn: (S) => { S.title = "国王"; S.fame = 700; }, want: /王/ },
    { name: "領主", fn: (S) => { S.title = "領主"; }, want: /領地/ },
    { name: "手配", fn: (S) => { S.repute = { レオネスト王国: { rep: 0, inf: 40, wanted: true } }; }, want: /手配書|似顔絵|名前は少し変えた|井戸/ },
    { name: "使徒", fn: (S) => { S.e3 = { done: Object.keys(D.E3.LIST).slice(0, 3) }; }, want: /使徒を3体|討った使徒は3体/ },
    { name: "善い", fn: (S) => { S.virtue = 9; S.sin = 0; }, want: /施し|薪/ },
    { name: "罪深い", fn: (S) => { S.sin = 20; }, want: /灯りを消して|ふっと黙った/ },
    { name: "目的なし", opt: { goal: "none" }, fn: () => {}, want: /目的の無い旅|決めずに出た旅/ },
    { name: "魔法使い", cls: "mage", fn: () => {}, want: /私塾|学院/ },
  ];
  const seen = new Set();
  cases.forEach((c, i) => {
    const t = story(1200 + i, c);
    if (!c.want.test(t)) f(`${c.name}: その後の語りに状態が出ない：${t.slice(0, 120)}…`);
    seen.add(t.split("\n")[0]);
  });
  if (seen.size < 4) f(`その後の語りの書き出しが似すぎる（${seen.size} 通り）`);

  // ---------------------------------------------------------------- 正気：理由の一行・迷宮の深み・戻す手段・案内
  S = start("merc", 1301);
  S.maxHp = S.hp = 999;
  const dun = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "dungeon" && (D.LOCS[id].floors || 0) >= 3 && !D.LOCS[id].lair);
  const dive = () => { S.mode = "explore"; S.event = null; S.combat = null; S.fac = null; G.exploreAct("deeper"); };
  S.loc = dun; S.depth = 0;
  const s0 = G.sanityOf(S);
  dive();
  const d1 = S.depth;
  const s1 = G.sanityOf(S);
  if (!(d1 >= 1)) f(`迷宮で潜れない（${dun}・深さ ${S.depth}）`);
  else {
    if (!(s1 < s0)) f("はじめての深さで正気が減らない");
    if (!/正気が削れた──.*はじめて降りた（今の心：/.test(texts(S))) f(`深みで減った理由の一行が無い：${texts(S, 6)}`);
    S.depth = 0; S.sanity = 90;
    const n0 = S.log.length;
    dive();
    if (S.depth === d1 && S.log.slice(n0).some((l) => /はじめて降りた/.test(l.text || ""))) f("同じ深さに降りても、もう一度減る");
  }
  // 大失敗の理由
  S.sanity = 90; S.loc = D.CLASSES.merc.start; S.depth = 0;
  for (let i = 0; i < 300 && !/正気が削れた──大失敗/.test(texts(S, 10)); i++) G.check("筋力", "普通");
  if (!/正気が削れた──大失敗/.test(texts(S, 10))) f("大失敗で正気が減っても理由の一行が出ない");
  // 段が深くなったら戻し方の案内
  S.sanity = 71;
  G.r11m.withWhy({ k: "test", t: "試しに見たもの" }, () => G.addSanity(-5));
  if (!texts(S, 6).includes(G.r11m.GUIDE)) f("段が深くなっても戻し方の案内が出ない");
  if (!G.m5Rows(S).some(([k]) => k === "心を休める")) f("人物の表に「心を休める」の行が無い");
  // 仲間と話す（一日一度、少し戻る）
  S.mode = "explore"; S.event = null; S.combat = null; S.fac = null;
  G.addCompanion("random");
  const cp = S.companions[0];
  if (!cp) f("仲間を加えられない");
  else {
    S.sanity = 50;
    const tk = G.actions().flatMap((g) => g.list).find((x) => x.id === "m2talk:" + cp.id);
    if (!tk) f("仲間と話す行動が無い");
    else {
      G.act(tk.id);
      const s2 = G.sanityOf(S);
      if (!(s2 >= 50 + G.r11m.TALK)) f(`仲間と話しても正気が戻らない（50→${s2}）`);
      S.mode = "explore"; S.event = null; S.combat = null; S.tk = null;
      const tk2 = G.actions().flatMap((g) => g.list).find((x) => x.id === "m2talk:" + cp.id && !x.disabled);
      if (tk2) { G.act(tk2.id); if (G.sanityOf(S) > s2 + 0 && S.r11m.talk === S.day && G.sanityOf(S) - s2 >= G.r11m.TALK) f("同じ日に何度話しても戻る"); }
    }
  }
  // 旅立った町の宿で眠る：ほかの宿より深く戻る
  S.sanity = 60; S.gold = 999; S.loc = D.CLASSES.merc.start; S.mode = "explore"; S.event = null; S.combat = null;
  G.act("fac:inn");
  const sv = G.sanityOf(S);
  G.act("inn:rest");
  if (!(G.sanityOf(S) >= sv + D.M5.TOLL.inn + G.r11m.HOMETOWN - 1)) f(`旅立った町の宿で深く戻らない（${sv}→${G.sanityOf(S)}）`);

  if (!bad) ok(`R11：能力値 99・十年の知らせ ${told.length} つと引退・その後の語り ${cases.length} 通り・正気の理由と戻し方`);
};
