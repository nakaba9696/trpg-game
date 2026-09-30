// B1: 戦闘の演出。記録に添える fx（engine/combat.js）と、ボスの前口上（data/boss_lines.js）、画面の演出の順番表（ui/fx.js）
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail: failTo, ok, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo(m); };
  const D = G.data;
  // 前口上は、あるボスだけを指し、どのボスにもある。短く、明かさない言葉を使わず、神々を語らない
  const HIDDEN = /見世物|観客|客席|舞台|台本|神/;
  for (const [id, B] of Object.entries(D.BOSS_LINES)) {
    if (!D.ENEMIES[id]) { fail(`前口上 ${id}: その敵が無い`); continue; }
    if (!D.ENEMIES[id].boss) fail(`前口上 ${id}: ボスではない`);
    if (!Array.isArray(B.lines) || !B.lines.length) fail(`前口上 ${id}: lines が空`);
    for (const t of B.lines || []) {
      if (typeof t !== "string" || !t) fail(`前口上 ${id}: 文字列でない`);
      else if (t.length > 60) fail(`前口上 ${id}: 長すぎる（${t.length} 字・60 字まで）`);
      else if (HIDDEN.test(t)) fail(`前口上 ${id}: 明かさない言葉がある「${t}」`);
    }
  }
  for (const [id, e] of Object.entries(D.ENEMIES)) if (e.boss && !D.BOSS_LINES[id]) fail(`ボス ${id}: 前口上が無い（src/data/boss_lines.js に足す）`);

  G.rand = seeded(16);
  G.P = { trophies: {}, graves: [] };
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 70; });
  const fresh = () => G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  const fxOf = (from) => G.S.log.slice(from).filter((e) => e.fx);

  // ボス戦の始まりに前口上。魔人には絶界の fx
  fresh();
  G.S.maxHp = G.S.hp = 9999;
  let mark = G.S.log.length;
  G.startCombat(["graw"], {});
  const intro = fxOf(mark).find((e) => e.fx === "boss");
  if (!intro || intro.foe !== "graw" || intro.name !== D.ENEMIES.graw.name || !D.BOSS_LINES.graw.lines.includes(intro.text)) fail("ボス戦の始まりに前口上の fx が無い");
  for (let i = 0; i < 30 && G.S.combat && !fxOf(mark).some((e) => e.fx === "wall"); i++) { G.S.hp = 9999; G.combatAct("attack"); }
  if (!fxOf(mark).some((e) => e.fx === "wall" && e.foe === D.ENEMIES.graw.name)) fail("絶界に弾かれた fx が無い");
  fresh();
  mark = G.S.log.length;
  G.startCombat(["goblin"], {});
  if (fxOf(mark).some((e) => e.fx === "boss")) fail("ボスでない敵に前口上が出た");

  // 普通の戦闘：hit の合計が敵の減った HP、hurt の合計があなたの減った HP、倒れた数だけ down
  fresh();
  G.S.maxHp = G.S.hp = 9999;
  G.startCombat(["orc", "orc"], {});
  const names = G.S.combat.foes.map((f) => f.name);
  const foes = G.S.combat.foes;
  mark = G.S.log.length;
  let hurtBad = 0, turns = 0;
  for (; turns < 200 && G.S.combat; turns++) {
    const hp = G.S.hp, from = G.S.log.length;
    G.combatAct(turns % 3 === 2 ? "vital" : "attack");
    const hurt = fxOf(from).filter((e) => e.fx === "hurt").reduce((a, e) => a + e.n, 0);
    if (hurt !== hp - G.S.hp) hurtBad++;
  }
  const all = fxOf(mark);
  if (G.S.combat) fail("演出の確認：戦闘が終わらない");
  if (hurtBad) fail(`hurt の数字と減った HP が合わない手番が ${hurtBad} 回`);
  for (const f of foes) {
    const dealt = all.filter((e) => e.fx === "hit" && e.foe === f.name).reduce((a, e) => a + e.n, 0);
    if (Math.min(dealt, f.max) !== f.max - f.hp) fail(`hit の合計（${dealt}）と ${f.name} の減った HP（${f.max - f.hp}）が合わない`);
  }
  if (all.some((e) => (e.fx === "hit" || e.fx === "down") && !names.includes(e.foe))) fail("fx の foe が戦闘中の敵の名前でない");
  const downs = all.filter((e) => e.fx === "down");
  if (downs.length !== foes.filter((f) => f.hp <= 0).length || downs.length !== 2) fail(`down の数が倒れた数と合わない（${downs.length}）`);
  if (!all.some((e) => e.fx === "hurt")) fail("hurt の fx が一度も出ない");

  // 画面の演出の順番表（ui/fx.js の DOM を使わない部分）
  vm.runInContext(readFileSync(new URL("../../src/ui/fx.js", import.meta.url), "utf8"), vm.createContext({ G }));
  const plan = G.fx.plan([{ k: "you" }, { fx: "crit" }, { fx: "hit", foe: "A", n: 5 }, { fx: "hurt", n: 3, heavy: true }, { fx: "down", foe: "A" }]);
  if (plan.length !== 4 || plan[0].at !== plan[1].at || !(plan[2].at > plan[1].at) || !(plan[3].at > plan[2].at)) fail("演出の順番表が変");
  if (G.fx.plan(all).some((p, i, a) => i && p.at < a[i - 1].at)) fail("演出の順番表が時間の順になっていない");
  if (!bad) ok(`戦闘の演出（前口上 ${Object.keys(D.BOSS_LINES).length} 体・${turns} 手番の戦闘で fx ${all.length} 件が HP の増減と合う）`);
};
