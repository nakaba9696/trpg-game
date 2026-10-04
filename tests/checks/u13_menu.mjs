// U13：町などの行動の選択肢を分類（街で・冒険・仲間・その他）にまとめる（src/ui/u13_menu.js の DOM を使わない部分、G.u13）
// - どの組も、どれかの分類か「上に出したまま／下に出したまま」に入り、消えない（知らない組は「その他」）
// - 出来事はまとめない。戦闘は別の形（いつも出す手と押すと開く組）。分類が少ない・選択肢が少ないときもまとめない
// - 店で組が多いときは、組そのものを分類にする（店を出るは下に残す）
// - 開いた分類は場所の種類ごとに覚える。新しく出た項目のある分類には印
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const src = readFileSync(new URL("../../src/ui/u13_menu.js", import.meta.url), "utf8");
  const G = loadEngine();
  vm.runInContext(src, vm.createContext({ console, G, globalThis: { G } }), { filename: "ui/u13_menu.js" });
  const u = G.u13;
  if (!u || !u.plan) { fail("U13: G.u13.plan が無い"); return; }
  const D = G.data;

  // ---------------------------------------------------------------- 遊びながら、まとめ方を見る
  let towns = 0, planned = 0, fac = 0, other = 0;
  const notLost = (gs, plan, where) => {
    const n = gs.filter((g) => g.list.length).length;
    const idx = [...plan.tabs.flatMap((t) => t.groups), ...plan.top, ...plan.bottom, ...(plan.main || [])];
    const got = idx.length;
    if (got !== n || new Set(idx).size !== n) fail(`U13: ${where} で組が分類からこぼれる・重なる（組 ${n}・分類に ${got}）`);
    if (plan.tabs.length < 2) fail(`U13: ${where} で分類が 1 つなのにまとめている`);
  };
  for (let s = 0; s < 12; s++) {
    G.rand = seeded(500 + s);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 60; });
    G.newGame({ cls: Object.keys(D.CLASSES)[s % Object.keys(D.CLASSES).length], stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
    G.S.gold = 2000;
    for (let i = 0; i < 400 && !G.S.over; i++) {
      const gs = G.actions();
      const plan = u.plan(gs, G.S);
      const where = `${G.S.mode}:${G.S.loc}${G.S.fac ? ":" + G.S.fac : ""}`;
      if (G.S.mode === "event") { if (plan) fail(`U13: ${where} の選択肢をまとめている（出来事はまとめない）`); }
      else if (G.S.mode === "combat") { if (plan) { if (plan.kind !== "combat") fail(`U13: ${where} の戦闘を町と同じ形でまとめている`); else notLost(gs, plan, where); } }
      else if (plan) {
        planned++;
        notLost(gs, plan, where);
        if (G.S.mode === "fac") fac++;
        else if (plan.tabs[0].key !== "here" && plan.tabs.some((t) => t.key === "here")) fail(`U13: ${where} の最初の分類が「${plan.tabs[0].label}」`);
      }
      if (G.S.mode === "explore" && G.loc().type === "town") {
        towns++;
        const n = gs.reduce((a, g) => a + g.list.length, 0);
        if (n >= 15 && !plan) fail(`U13: 選択肢が ${n} ある町（${G.S.loc}）でまとめていない`);
        if (plan && plan.tabs[0].label !== "街で") fail(`U13: 町の最初の分類が「${plan.tabs[0].label}」`);
      }
      const acts = gs.flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
      other++;
    }
  }
  if (!planned) fail("U13: 一度もまとめなかった");

  // ---------------------------------------------------------------- 決まった場面
  G.rand = seeded(9);
  G.P = { trophies: {}, graves: [] };
  const st = {};
  D.STATS.forEach((k) => { st[k] = 50; });
  G.newGame({ cls: "thief", stats: st, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
  // 知らない組は「その他」に入る。答えを待つ問い（〇〇を誰に使う？）は上に出したまま
  const town = G.actions();
  const extra = [...town, { title: "新しい何か", list: [{ id: "zzz_new:1", label: "見知らぬ行い" }] }, { title: "薬草を誰に使う？", list: [{ id: "b5use:herb:0", label: "あなた" }, { id: "b5:back", label: "やめる" }] }];
  const p1 = u.plan(extra, G.S);
  if (!p1) fail("U13: 町の選択肢をまとめない");
  else {
    const misc = p1.tabs.find((t) => t.key === "misc");
    if (!misc || !misc.ids.includes("zzz_new:1") || misc.label !== "その他") fail("U13: 知らない組が「その他」に入らない");
    if (p1.top.length !== 1) fail("U13: 「〇〇を誰に使う？」が上に出したままにならない");
    if (p1.tabs.find((t) => t.key === "adv").ids.some((id) => !/^(travel|sail|q5go):/.test(id))) fail("U13: 「冒険」に旅・船・依頼でないものが入る");
    notLost(extra, p1, "町（知らない組を足した）");
    // 開いた分類を覚える（同じ種類の場所なら、別の町でも）
    if (u.openKey(p1) !== "here") fail("U13: 最初に開く分類が「街で」でない");
    u.setOpen(p1, "adv");
    if (u.openKey(u.plan(extra, G.S)) !== "adv") fail("U13: 開いた分類を覚えていない");
    // 新しく出た項目：初めて見たときは印なし。新しい行動が増えた閉じた分類に印。開くと消える
    const m0 = u.fresh(p1, "here", "test-town");
    if (Object.values(m0).some(Boolean)) fail("U13: 初めて見た場所で、新しい印が付いている");
    const more = [...extra, { title: "仲間", list: [{ id: "m2talk:new", label: "新しい仲間と話す" }] }];
    const p2 = u.plan(more, G.S);
    const m1 = u.fresh(p2, "here", "test-town");
    if (!m1.party) fail("U13: 新しく出た会話のある「仲間」に印が付かない");
    if (m1.adv) fail("U13: 何も増えていない「冒険」に印が付く");
    const m2 = u.fresh(p2, "party", "test-town");
    const m3 = u.fresh(p2, "here", "test-town");
    if (m2.party || m3.party) fail("U13: 開いて見たあとも印が残る");
  }
  // 選択肢が少なければまとめない
  if (u.plan([{ title: "x", list: [{ id: "fac:inn" }] }, { title: "旅立つ", list: [{ id: "travel:a" }] }], G.S)) fail("U13: 選択肢が 2 つでもまとめている");
  // 店：組そのものを分類に。店を出るは下に残す
  G.S.gold = 2000;
  G.act("fac:shop");
  if (G.S.mode === "fac") {
    const gs = G.actions();
    const p = u.plan(gs, G.S);
    if (!p) fail("U13: 店の選択肢をまとめない");
    else {
      notLost(gs, p, "店");
      if (p.tabs[0].label !== "買う") fail(`U13: 店の最初の分類が「${p.tabs[0].label}」`);
      if (p.tabs.some((t) => /（/.test(t.label))) fail("U13: 店の分類の名前に括弧の説明が残る");
      if (!p.bottom.length) fail("U13: 店を出るが、分類の外（下）に残らない");
    }
  }
  // 戦闘は、いつも出す手と押すと開く組に分ける（詳しくは u13_battle.mjs）
  G.S.mode = "explore"; G.S.fac = null;
  G.startCombat(["goblin"], {});
  const pc = u.plan(G.actions(), G.S);
  if (!pc || pc.kind !== "combat") fail("U13: 戦闘の手を、いつも出す手と押すと開く組に分けない");

  if (!bad) ok(`U13: 行動の選択肢を分類にまとめる（${planned} 場面でまとめ、うち店 ${fac}・町を見た ${towns} 回。こぼれる組なし）`);
};
