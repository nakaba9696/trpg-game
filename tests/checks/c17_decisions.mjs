// C17：持ち主の決定（2026-10-13）の反映（src/data/zzzzzzz_c17_decisions.js・src/engine/zzzzzzzzzzzzzzzzzzzzzzz_c17_decisions.js・src/ui/zzzzzzzzzz_c17_linger.js・src/ui/scene.js）
// i28 ドレイゼの担保だけ能力値が下がる／i108 ベルナの高い薬で 3〜4 段も治る／i140 古い背景の描き方を消した／i150 D9 の案のまま／
// i157 結果の場面でも立ち絵を残す／t07 砂塵のあとのボルグ／t08 討伐後は止める／t18 記憶を売る／t22 扉を叩く／t23 手紙三通／t24 徴兵の名簿
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const C = D.C17;
  const f = (m) => fail("C17: " + m);
  if (!C) return f("D.C17 が無い");
  if (C.MISS.length) f(`当て先が見つからない：${C.MISS.join("、")}`);

  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 70; });
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    G.S.gold = 5000;
    return G.S;
  };
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  const withRand = (v, fn) => { const r = G.rand; G.rand = () => v; try { return fn(); } finally { G.rand = r; } };
  // 出来事を始めて、その選択肢を選ぶ（判定は roll の乱数で）
  const choose = (id, label, roll) => {
    const S = G.S;
    S.mode = "explore"; S.event = null; S.combat = null;
    G.startEvent(id);
    const i = ev(id).choices.findIndex((c) => c.label.startsWith(label));
    if (i < 0) { f(`${id}: 選択肢「${label}」が無い`); return false; }
    if (!G.eventChoices().some((x) => x.i === i)) { f(`${id}: 選択肢「${label}」が出ていない`); return false; }
    withRand(roll == null ? 0.01 : roll, () => G.act(`ev:${i}`));
    return true;
  };

  // ---------------------------------------------------------------- i150：D9 の案のまま
  const L3 = D.E3.LIST;
  const want = { levian: [5, "ルアマリス"], gormore: [20, "テルグリス"], aurelia: [40, "ユヴァリエ"], yoihime: [18, "ベリエラ"], chezar: [23, "ディエラン"], notari: [55, "オルネグス"] };
  for (const [id, [no, name]] of Object.entries(want)) {
    if (!L3[id] || L3[id].no !== no) f(`i150a：${id} の重ね先が ${no} でない`);
    const row = Object.values(D.MAJIN || {}).find((m) => m.no === no);
    if (row && row.name !== name) f(`i150a：シートの ${no} が ${name} でない`);
  }
  const W1 = D.ENEMIES;
  if (!W1.w1_konoha || W1.w1_konoha.name !== "香炉番のシオン") f("i150c：w1_konoha が「香炉番のシオン」でない");
  if (!W1.w1_tanuki || W1.w1_tanuki.name !== "祭りの煙小鬼") f("i150c：w1_tanuki が「祭りの煙小鬼」でない");
  const evText = JSON.stringify(D.EVENTS, (k, v) => (typeof v === "function" ? undefined : v));
  if (/丁半|化け狸|狐の忍/.test(evText)) f("i150c：朧島の古い名（丁半・化け狸・狐の忍）が出来事に残っている");
  if (/皇帝が(死ん|崩御|息を引き取)|皇帝の死/.test(evText)) f("i150b：皇帝が死ぬ文が出来事に残っている（皇帝の戦傷のまま）");

  // ---------------------------------------------------------------- i28：能力値を下げるのはドレイゼの担保だけ
  for (const e of D.EVENTS) e.choices.forEach((c) => {
    const os = [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win].filter(Boolean);
    if (os.some((o) => o.c17lose) && !C.LOSE_EVENTS.includes(e.id)) f(`i28：${e.id} で能力値が下がる（下げてよいのは ${C.LOSE_EVENTS.join("・")}）`);
    if (os.some((o) => o.grow && Object.values(o.grow).some((n) => n < 0))) f(`i28：${e.id} の grow が負（下げるときは c17lose。ドレイゼの担保だけ）`);
  });
  let S = start(1701);
  {
    const a = S.stats.筋力, g = S.gold;
    if (choose("v1_zalve", "筋力を担保に")) {
      if (S.stats.筋力 !== a - 5) f(`i28：担保で筋力が 5 下がらない（${a}→${S.stats.筋力}）`);
      if (S.gold !== g + 500) f(`i28：担保で 500G 借りられない（${g}→${S.gold}）`);
      if (S.flags.v1_debt) f("i28：担保で借りたのに、取り立ての借金も付いた");
    }
    S.stats.筋力 = 3; G.apply({ c17lose: { 筋力: 5 } });
    if (S.stats.筋力 !== 1) f("i28：能力値が 1 より下がる");
  }

  // ---------------------------------------------------------------- i108：3〜4 段の病もベルナの高い薬で治る
  for (const [kind, label] of [["sanity", "高い薬を頼み、正気"], ["hp", "高い薬を頼み、体"]]) {
    S = start(1702);
    S.mode = "explore"; G.startEvent("e2_berna_clinic");
    if (G.eventChoices().some((x) => /^高い薬/.test(x.c.label))) f("i108：病の無い者に高い薬が出ている");
    S.beast = 2;
    if (G.eventChoices().some((x) => /^高い薬/.test(x.c.label))) f("i108：2 段（祓える段）で高い薬が出ている");
    S.beast = 4; S.event = null;
    const san = G.sanityOf(S), hp = S.maxHp, gold = S.gold;
    if (!choose("e2_berna_clinic", label)) continue;
    if ((S.beast || 0) !== 0) f(`i108：高い薬（${kind}）で 4 段の病が治らない`);
    if (S.gold !== gold - C.BEAST_COST) f(`i108：高い薬の値段が ${C.BEAST_COST}G でない`);
    if (kind === "sanity" && !(G.sanityOf(S) < san)) f("i108：正気を差し出したのに正気が減らない");
    if (kind === "hp") {
      if (!(S.maxHp < hp)) f("i108：体を差し出したのに最大 HP が減らない");
      const m = S.maxHp;
      for (let k = 0; k < 40; k++) G.grow("体力", 12);
      if (S.maxHp !== G.maxHpOf(S.stats) || G.maxHpOf(S.stats) !== Math.max(8, 10 + Math.floor(G.s5Pow(S.stats.体力) / 3) - S.c17hp)) f(`i108：体力が伸びると差し出した最大 HP が戻る（${m}→${S.maxHp}）`);
    }
  }
  // 古いセーブ（S.c17hp が無い）でも最大 HP はそのまま
  S = start(1703); delete S.c17hp;
  if (G.maxHpOf(S.stats) !== 10 + Math.floor(G.s5Pow(S.stats.体力) / 3)) f("i108：S.c17hp の無いセーブで最大 HP が変わる");

  // ---------------------------------------------------------------- t18：忘れ水に記憶を売る
  S = start(1704);
  S.memos = ["一つ目", "二つ目"];
  S.sanity = 50;
  if (choose("e3_meet_levian", "記憶を一つ売る")) {
    if (S.memos.length !== 1) f("t18：記憶を売ってもメモが一行消えない");
    if (!(G.sanityOf(S) > 50)) f("t18：記憶を売っても正気が戻らない");
  }
  S.memos = []; S.mode = "explore"; S.event = null; G.startEvent("e3_meet_levian");
  if (G.eventChoices().some((x) => x.c.label === "記憶を一つ売る")) f("t18：メモが無いのに記憶を売れる");
  S.flags["e3:levian"] = true;
  if (ev("e3_meet_levian").cond(S)) f("t18：討ったあとも水の書庫の女に会える");

  // ---------------------------------------------------------------- t22：三つ目の扉を叩く
  {
    const e = ev("w4_r_door");
    const knock = e.choices.find((c) => /叩く/.test(c.label));
    if (!knock) f("t22：w4_r_door に「叩く」が無い");
    if (e.choices.filter((c) => !/叩く/.test(c.label)).some((c) => !/^鍵で開けて/.test(c.label))) f("t22：鍵で開ける選択肢の名が「鍵で開けて」で始まらない");
    if (/錠は思ったより素直に回った/.test(e.text)) f("t22：出来事の文で扉が開いてしまっている（叩く前に）");
    S = start(1705); S.flags.w4_vetkey = true; S.depth = 3;
    const g = S.gold;
    if (choose("w4_r_door", "扉を開けずに")) {
      if (!S.flags.w4_shiftcard) f("t22：叩いても交代の札が手に入らない");
      if (S.gold !== g) f("t22：叩いたのに、開けたときと同じく銀貨が手に入る");
    }
  }

  // ---------------------------------------------------------------- t23：手紙三通
  S = start(1706);
  if (choose("v2_letter", "宛名を読み解く", 0.01)) {
    if (G.count("c17_letter_mason") !== 1) f("t23：凍えた旅人の手紙を預かれない");
    G.arrive("nerva");
    if (G.count("c17_letter_mason") !== 1) f("t23：違う町で手紙を渡してしまう");
    G.arrive("garmund");
    if (G.count("c17_letter_mason") !== 0 || !S.flags["c17:letter:mason"]) f("t23：帝都で凍えた旅人の手紙を渡せない");
    G.apply({ c17letter: "mason" });
    if (G.count("c17_letter_mason")) f("t23：渡した手紙をもう一度預かる");
  }
  {
    const c = ev("w4_s_hunter").choices.find((x) => x.label.startsWith("身構える"));
    if (!(c && c.win && c.win.c17letter === "hunter")) f("t23：沈黙の森の狩人を倒しても手紙を預からない");
    G.apply({ c17letter: "hunter" });
    G.arrive("w7_revandel");
    if (G.count("c17_letter_hunter") || !S.flags["c17:letter:hunter"]) f("t23：森のそばの町で狩人の手紙を渡せない");
  }
  if (choose("w7_zai_letter", "手紙だけ受け取り")) {
    if (G.count("c17_letter_north") !== 1) f("t23：脱走兵の手紙を預かれない");
    const town = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && D.LOCS[id].region === "ノルディア帝国" && id !== "garmund");
    G.arrive(town);
    if (G.count("c17_letter_north") || !S.flags["c17:letter:north"]) f(`t23：帝国の町（${town}）で脱走兵の手紙を渡せない`);
  }
  for (const x of Object.values(C.LETTERS)) {
    if (!D.ITEMS[x.item]) f(`t23：手紙の品 ${x.item} が無い`);
    (x.to || []).forEach((id) => { if (!D.LOCS[id] || D.LOCS[id].type !== "town") f(`t23：届け先 ${id} が町でない`); });
  }

  // ---------------------------------------------------------------- t24：徴兵の名簿
  S = start(1707);
  {
    const c = (D.C10_ADD.v1_conscript || []).find((x) => /代わりに傭兵が一人/.test(x.label));
    G.apply(c.ok);
    if (!S.flags[C.CONSCRIPT.flag]) f("t24：名簿に名を書いても印が付かない");
    S.world = S.world || G.m4World(S);
    G.arrive("nerva");
    if (S.flags["c17:called"]) f("t24：戦の知らせの前に呼び出しが来る");
    S.world.hist.push({ id: "c17t", day: S.day, kind: "war", loc: "garmund", heard: "rumor", foe: "kingdom" });
    G.arrive("garmund");
    if (!S.flags["c17:called"]) f("t24：戦の知らせのあとに呼び出しが来ない");
  }

  // ---------------------------------------------------------------- t07：砂塵を討つと借金は白紙
  S = start(1708);
  S.flags.v1_debt = true;
  G.arrive("nerva");
  if (!S.flags.v1_debt) f("t07：砂塵を討つ前に借金が消える");
  S.flags["e3:zalve"] = true;
  const before = S.log.length;
  G.arrive("garmund");
  if (S.flags.v1_debt) f("t07：砂塵を討っても借金（v1_debt）が残る");
  if (!S.log.slice(before).some((l) => /貸し、ひとつ/.test(JSON.stringify(l)))) f("t07：ボルグの「貸し、ひとつ」が出ない");
  if (ev("v1_borg").cond(S)) f("t07：砂塵を討ったあとも取り立て屋ボルグが来る");

  // ---------------------------------------------------------------- t08：討伐後は止める
  S = start(1709);
  for (const [ap, ids] of Object.entries(C.STOP)) {
    if (!L3[ap]) f(`t08：使徒 ${ap} が無い`);
    ids.forEach((id) => {
      const e = ev(id);
      if (!e) return f(`t08：出来事 ${id} が無い`);
      S.flags[L3[ap].flag] = true;
      if (e.cond && e.cond(Object.assign({}, S, { sin: 99, phase: 3, depth: 9, flags: Object.assign({}, S.flags, { m3_steps1: true, m3_steps2: true, w1_believer: true, w1_gregor: true }) }))) f(`t08：${ap} を討ったあとも ${id} が起きる`);
      delete S.flags[L3[ap].flag];
    });
  }
  {
    const kin = Object.keys(D.ENEMIES).filter((id) => D.ENEMIES[id].kinOf === "levian");
    if (!kin.length) f("t08：忘れ水の眷属が無い");
    S.loc = "ruins";
    const shaped = (ids) => G.data.E4.shape(ids.slice());
    S.flags["e3:levian"] = true;
    for (let k = 0; k < 20; k++) {
      const out = shaped(kin);
      if (out.some((id) => D.ENEMIES[id].kinOf === "levian")) { f("t08：忘れ水を討ったあとも書庫の眷属が出る"); break; }
    }
    delete S.flags["e3:levian"];
  }

  // ---------------------------------------------------------------- i157：結果の場面でも立ち絵を残す
  S = start(1710);
  {
    const e = D.EVENTS.find((x) => x.who && x.who.kind !== "foe" && !x.cond && x.choices.some((c) => !c.fight && !c.next && !c.stat && !c.cost && !c.cond && c.ok && !c.ok.fight && !c.ok.next && !c.ok.e3fight));
    const i = e.choices.findIndex((c) => !c.fight && !c.next && !c.stat && !c.cost && !c.cond && c.ok && !c.ok.fight && !c.ok.next && !c.ok.e3fight);
    S.mode = "explore"; S.event = null;
    G.startEvent(e.id);
    G.act(`ev:${i}`);
    if (S.mode === "explore" && !S.combat) {
      const L = G.c17Linger(S);
      if (!L || L.ev !== e.id) f(`i157：${e.id} の結果のあと、出来事の人が残らない`);
      // 結果の表情：結果に mood を書けば、その表情
      const c = e.choices[i];
      const m0 = c.ok.mood;
      c.ok.mood = "joy";
      S.mode = "explore"; S.event = null;
      G.startEvent(e.id); G.act(`ev:${i}`);
      if (S.mode === "explore" && G.moodOf(S) !== "joy") f("i157：結果の場面で、結果の表情（mood）にならない");
      if (m0 === undefined) delete c.ok.mood; else c.ok.mood = m0;
      // 次の行動で下がる
      const a = G.actions().flatMap((g) => g.list).find((x) => !x.disabled && !/^ev:/.test(x.id) && /^(rest|look|wander|explore)/.test(x.id)) || G.actions().flatMap((g) => g.list).find((x) => !x.disabled && !/^ev:/.test(x.id));
      if (a) { G.act(a.id); if (S.mode === "explore" && G.c17Linger(S)) f(`i157：次の行動（${a.id}）のあとも立ち絵が残る`); }
      // 戦闘・出来事が始まれば下がる
      S.mode = "explore"; S.event = null; G.startEvent(e.id); G.act(`ev:${i}`);
      G.startCombat(["goblin"], {});
      S.combat = null; S.mode = "explore";
      if (G.c17Linger(S)) f("i157：戦闘のあとに、前の出来事の立ち絵が戻る");
    }
    // 画面：出来事のあいだに立っていた人を、結果の場面でも返す（DOM なし）
    const who = { kind: "villager", name: "テストの人" };
    const UG = { stand: { whoOf: (s) => (s.mode === "event" ? who : null) }, c17Linger: (s) => (s.mode === "explore" ? { ev: "x1" } : null) };
    vm.runInContext(readFileSync(new URL("../../src/ui/zzzzzzzzzz_c17_linger.js", import.meta.url), "utf8"), vm.createContext({ G: UG }));
    if (UG.stand.whoOf({ mode: "event", event: "x1", flags: {} }) !== who) f("i157（画面）：出来事のあいだの人が変わる");
    if (UG.stand.whoOf({ mode: "explore", flags: {} }) !== who) f("i157（画面）：結果の場面で立ち絵が下がる");
    UG.c17Linger = () => null;
    if (UG.stand.whoOf({ mode: "explore", flags: {} })) f("i157（画面）：次の行動のあとも立ち絵が残る");
  }

  // ---------------------------------------------------------------- i140：古い背景の描き方は消した。名前はすべて V2
  {
    const src = readFileSync(new URL("../../src/ui/scene.js", import.meta.url), "utf8");
    if (/const (OUT|IN) = \{/.test(src) || src.split("\n").length > 60) f("i140：scene.js に古い描き方（OUT・IN）が残っている");
    if (/paintSceneV1/.test(readFileSync(new URL("../../src/ui/scene_v2.js", import.meta.url), "utf8"))) f("i140：G.paintSceneV1（古い描き方への落とし先）が残っている");
  }
};
