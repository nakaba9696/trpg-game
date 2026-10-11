// F7：戦いのあとの行は、戦闘の本文に流さず結果の場面（「戦いのあと」）にまとめる（持ち主「残りの行は結果の画面と一緒に出す形にして。戦闘終わったあとのリザルトなので、地続きだとわからない」）
// - 区切りは、エンジンが戦いを片づけた所（b5AfterCombat。あなたが倒れたときは「〇〇は倒れた」の一行のあと）。その前に倒れる段まで、そのあとに拾った物・金・トロフィー・手引き
// - 項目分け（u13.afterGroups）：トロフィーは名前、手引き・覚え書きは項目名、拾った物・金・伸びは「得た物」「成長」にあるので出さない、ほかは「そのほか」
// - 画面：本文から外した行は隠す（.u13after）。結果の場面に「戦いのあと」の見出しと項目。死の場面にも項目。段の順と結果を漏らさない決まり（F5・F6）は tests/checks/f5_finish.mjs・f6_no_spoiler.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0("F7 戦いのあと：" + m); };
  const read = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const D = G.data;

  // ---------------------------------------------------------------- 区切りの位置（エンジン）
  {
    G.rand = seeded(7);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "", personality: "無口" } });
    const S = G.S;
    G.startCombat(["goblin"], {});
    S.combat.foes[0].hp = 1;
    let cut = -1;
    const b5a = G.b5AfterCombat;
    G.b5AfterCombat = (how) => { cut = S.log.length; return b5a ? b5a(how) : undefined; };
    const from = S.log.length;
    const r0 = G.rand; G.rand = () => 0.02;
    try { G.act("cb:attack"); } finally { G.rand = r0; G.b5AfterCombat = b5a; }
    if (S.combat || cut < 0) fail("とどめで戦いが片づかない（区切りの位置が取れない）");
    else {
      const before = S.log.slice(from, cut), after = S.log.slice(cut);
      if (!before.some((e) => e.fx === "down")) fail("区切りより前に「倒れた」の段が無い");
      if (!before.some((e) => e.k === "dice")) fail("区切りより前にダイスの段が無い");
      if (!after.some((e) => /G を手に入れた|を手に入れた/.test(e.text || ""))) fail("区切りより後ろに拾った物・金の行が無い（結果の場面に回らない）");
      if (after.some((e) => e.fx === "down" || e.k === "dice")) fail("区切りより後ろに戦闘の段がある");
    }
  }

  // ---------------------------------------------------------------- 項目分け（DOM なし）
  const ctx = vm.createContext({ console, G, globalThis: { G } });
  vm.runInContext(read("ui/u13_battle.js"), ctx, { filename: "ui/u13_battle.js" });
  const u = G.u13;
  if (!u || !u.afterGroups) fail("u13.afterGroups が無い");
  else {
    const g = u.afterGroups([
      { k: "nar", text: "握りしめていた手をゆっくり開く。" },
      { k: "sys", text: "魔物の牙を手に入れた。" },
      { k: "sys", text: "2G を手に入れた。" },
      { k: "trophy", text: "トロフィー『初陣』を獲得（初めて敵を倒した）" },
      { k: "sys", text: "手引きに書き足された：南の商いの町" },
      { k: "sys", text: "覚え書き：ゴブリン：脅しに弱い。" },
      { k: "grow", text: "筋力が伸びた 40→41" },
    ]);
    if (g.trophy.join() !== "『初陣』") fail(`トロフィーの項目が名前だけにならない（${g.trophy}）`);
    if (g.guide.join() !== "南の商いの町,覚え書き：ゴブリン") fail(`手引き・覚え書きの項目が名前だけにならない（${g.guide}）`);
    if (g.note.join() !== "握りしめていた手をゆっくり開く。") fail(`そのほかの項目が違う（拾った物・金・伸びが混ざる？ ${g.note}）`);
  }

  // ---------------------------------------------------------------- 画面
  const ub = read("ui/u13_battle.js"), css = read("ui/u13_battle.css");
  if (!/cutAt = \{ S: G\.S, i: G\.S\.log\.length \}/.test(ub)) fail("戦いを片づけた所（b5AfterCombat）で区切りを覚えていない");
  if (!/G\.die = /.test(ub) || !/は倒れた/.test(ub)) fail("あなたが倒れたときの区切り（「〇〇は倒れた」の一行のあと）が無い");
  if (!/#log > \.u13after \{[^}]*display: none/.test(css)) fail("本文から外した戦いのあとの行が隠れない");
  if (!/戦いのあと/.test(ub) || !/afterRows\(d\.after/.test(ub)) fail("結果の場面に「戦いのあと」の見出し・項目が無い");

  if (!bad) ok("F7 戦いのあと（区切りは片づけた所・拾った物とトロフィーと手引きは結果の場面へ・項目分け・死の場面も）");
};
