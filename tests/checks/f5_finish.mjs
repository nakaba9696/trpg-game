// F5：戦闘を終えた手番（とどめ・あなたが倒れる一撃）も、順に見せ終えてから結果の場面へ（持ち主「攻撃を選ぶ → ダイス振る → ダメージ → 体力が0になる、ここまで演出があってから戦闘終了画面にいってほしい」）
// - 見せ方の包み（ui/zzzzzzz_f5_finish.js）は、描く包み（ui.render・ui.repaint を包むファイル）のうちいちばん外（最後に読む）。中身は u13_battle.js の u13.inGhost
// - とどめの手番の記録は、見せる段がそろって順に並ぶ：ダイス → 当たり（残り 0）→ 倒れた。あなたの攻撃・術・仲間の一撃・二体のうち一体でも同じ
// - あなたが倒れる手番も：敵の攻撃（ダメージ）→ 倒れた
// - 「手応え」の一行は、記録にも結果の場面にも出ない（持ち主「表示ごとやめて」）
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { listFiles } from "../../tools/files.mjs";

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0("F5 とどめの見せ方：" + m); };
  const src = new URL("../../src/", import.meta.url);
  const read = (f) => readFileSync(new URL(f, src), "utf8");

  // ---------------------------------------------------------------- 包みの順
  {
    const ui = listFiles(new URL(".", src).pathname).ui.filter((f) => f !== "main.js");
    const me = ui.indexOf("ui/zzzzzzz_f5_finish.js");
    if (me < 0) fail("ui/zzzzzzz_f5_finish.js が読まれない");
    const wraps = ui.filter((f) => /\b(G\.)?ui\.(render|repaint)\s*=/.test(read(f)) && f !== "ui/ui.js");
    const later = wraps.filter((f) => ui.indexOf(f) > me);
    if (later.length) fail(`見せ方の包みより外で描き直しを包むファイルがある（終わった戦いが見えない）：${later.join("・")}`);
    const u = read("ui/u13_battle.js");
    for (const k of ["u13.inGhost", "u13.renderStart", "u13.renderEnd", "ghostReal"]) if (!u.includes(k)) fail(`u13_battle.js に ${k} が無い`);
    if (/手応え/.test(u)) fail("結果の場面に「手応え」の行が残っている");
  }

  // ---------------------------------------------------------------- とどめの手番の段
  const G = loadEngine();
  const D = G.data;
  const begin = (seed, comps) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 500;
    if (comps) { S.companions = comps; G.b5Party && G.b5Party(S); }
    return S;
  };
  const turnOf = (S, fn, r) => {
    const from = S.log.length;
    const r0 = G.rand;
    if (r != null) G.rand = () => r;
    try { fn(); } finally { G.rand = r0; }
    return S.log.slice(from);
  };
  // 倒した敵 name について：ダイス（あれば）→ 当たり（残り 0）→ 倒れた、の順
  const order = (where, L, name, needDice) => {
    const iDice = L.findIndex((l) => l.k === "dice");
    const iHit = L.findIndex((l) => l.fx === "hit" && l.foe === name && /残り 0\//.test(l.text || ""));
    const iDown = L.findIndex((l) => l.fx === "down" && l.foe === name);
    if (needDice && iDice < 0) fail(`${where}：とどめの手番にダイスの段が無い`);
    if (iHit < 0) fail(`${where}：とどめの当たり（残り 0）の段が無い`);
    if (iDown < 0) fail(`${where}：倒れた段が無い`);
    if (needDice && iDice >= 0 && iHit >= 0 && iDice > iHit) fail(`${where}：ダイスより先に当たりが出る`);
    if (iHit >= 0 && iDown >= 0 && iHit > iDown) fail(`${where}：当たりより先に倒れる`);
    if (/手応え/.test(L.map((l) => l.text || "").join("\n"))) fail(`${where}：「手応え」の一行が出る`);
  };
  {
    const S = begin(1);
    G.startCombat(["goblin"], {});
    const f = S.combat.foes[0]; f.hp = 1;
    const L = turnOf(S, () => G.act("cb:attack"), 0.02);
    if (S.combat) fail("攻撃のとどめで戦闘が終わらない");
    order("攻撃のとどめ", L, f.name, true);
  }
  {
    const S = begin(2);
    G.startCombat(["goblin"], {});
    const f = S.combat.foes[0]; f.hp = 1;
    const sp = G.actions().flatMap((g) => g.list).find((a) => a.id === "cb:fire" && !a.disabled);
    if (sp) { const L = turnOf(S, () => G.act("cb:fire"), 0.02); order("術のとどめ", L, f.name, true); }
  }
  {
    const S = begin(3);
    G.startCombat(["goblin", "goblin"], {});
    const [a, b] = S.combat.foes;
    a.hp = 1; b.hp = b.max = 500;
    const L = turnOf(S, () => G.act("cb:attack"), 0.02);
    if (!S.combat) fail("二体のうち一体を倒しただけで戦闘が終わる");
    order("二体のうち一体", L, a.name, true);
  }
  {
    const S = begin(4, [{ id: "f5c", name: "仲間ア", cls: "傭兵", power: 99, dmg: 20, desc: "無口", trait: "loyal", bond: 70 }]);
    G.startCombat(["goblin"], {});
    const f = S.combat.foes[0]; f.hp = 1;
    const L = turnOf(S, () => G.act("cb:guard"), 0.02);
    if (!S.combat) order("仲間のとどめ", L, f.name, false);
  }
  {
    // あなたが倒れる：敵の攻撃（ダメージ）→ 倒れた
    const S = begin(5);
    G.startCombat(["goblin"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 999;
    S.hp = 1; S.clungUsed = true;
    const hit = D.ENEMIES.goblin.hit; D.ENEMIES.goblin.hit = 999;
    let L;
    try { L = turnOf(S, () => G.act("cb:guard"), 0.02); } finally { D.ENEMIES.goblin.hit = hit; }
    if (S.over !== "dead") fail("あなたが倒れる手番を作れない");
    else {
      const iHurt = L.findIndex((l) => l.fx === "hurt");
      const iDead = L.findIndex((l) => /は倒れた。/.test(l.text || ""));
      if (iHurt < 0 || iDead < 0 || iHurt > iDead) fail("あなたが倒れる手番が、敵の一撃 → 倒れた、の順に並ばない");
    }
  }

  // ---------------------------------------------------------------- 手応えを出さない（結果の場面）
  {
    const ctx = vm.createContext({ console, G, globalThis: { G } });
    vm.runInContext(read("ui/u13_battle.js"), ctx, { filename: "ui/u13_battle.js" });
    const S = begin(6);
    const a = G.u13.snap(S);
    G.startCombat(["goblin"], {});
    S.combat.foes[0].hp = 1;
    turnOf(S, () => G.act("cb:attack"), 0.02);
    const res = G.u13.result(a, S, "win");
    if ("f1" in res || /手応え/.test(JSON.stringify(res))) fail("結果の場面の中身に「手応え」がある");
    if (G.f1Summary || S.f1last) fail("手応えの記録（G.f1Summary・S.f1last）が残っている");
  }

  if (!bad) ok("F5 とどめの見せ方（包みはいちばん外・とどめと倒れる手番の段の順・手応えを出さない）");
};
