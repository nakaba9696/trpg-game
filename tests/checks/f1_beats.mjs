// F1：戦闘の手番を一段ずつ見せる（src/ui/u13_battle.js の DOM を使わない部分・src/ui/fx.js）。エンジンの計算は変えない
// - 速さは「ゆっくり・ふつう・速い・一気に」。古い記録の「すぐ」（instant）は「一気に」として読む。「一気に」は間をおかない
// - 段の重さ：サイコロ（転がる間を含む）は地の文より長く、大成功・大失敗はさらに長い。気配・倒れる・深手も長め。注釈は短い
// - 一手番の記録（サイコロ → 一撃 → 敵の行動）の段取りが順に並び、ゆっくり > ふつう > 速い。0.4〜0.8 秒ほどの間が多い
// - サイコロの転がる目は乱数を使わず、最後は本当の出目
// - 一手番の記録の並びは「あなた → 判定 → 与えたダメージ → 敵の行動」（エンジンが順番つきの記録として返す）
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("F1 段ずつ：" + m); };
  const G = loadEngine();
  const ctx = vm.createContext({ console, G, globalThis: { G } });
  for (const f of ["fx.js", "u13_battle.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), ctx, { filename: "ui/" + f });
  const u = G.u13;
  if (!u || !u.beatOf || !u.rollFrames) { F("G.u13.beatOf・rollFrames が無い"); return; }

  // 速さ
  const names = u.SPEED_ORDER.map((k) => u.SPEEDS[k].name).join("・");
  if (names !== "ゆっくり・ふつう・速い・一気に") F(`速さの並びが違う：${names}`);
  if (u.speed({ u13speed: "fast" }) !== "fast" || u.speed({ u13speed: "instant" }) !== "instant") F("速さ「速い」「一気に」を読めない");

  // 段の重さ
  const dice = { k: "dice", reason: "攻撃", roll: 31, ok: true };
  const crit = { ...dice, roll: 2, crit: true };
  const sys = { k: "sys", text: "オークの攻撃をかわした。" };
  if (!(u.beatOf(crit) > u.beatOf(dice) && u.beatOf(dice) > u.beatOf(sys))) F("サイコロ・大成功・注釈の間の長さの順が違う");
  if (!(u.beatOf({ k: "nar", text: "気配", tell: "オーク" }) > u.beatOf({ k: "nar", text: "地の文" }))) F("気配の行が地の文より短い");
  if (!(u.beatOf({ k: "nar", fx: "hurt", n: 9, heavy: true }) > u.beatOf({ k: "nar", fx: "hurt", n: 2 }))) F("深手の間が浅手より短い");

  // 本当の一手番で段取りを作る
  G.rand = seeded(7);
  G.P = { trophies: {}, graves: [] };
  const D = G.data, stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 30; caps[k] = 60; });
  G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "", personality: "無口" } });
  G.S.maxHp = G.S.hp = 999; G.S.companions = [];
  G.startCombat(["orc"], {});
  G.S.combat.foes[0].hp = G.S.combat.foes[0].max = 99;
  const from = G.S.log.length;
  G.act("cb:attack");
  const turn = G.S.log.slice(from);
  const iYou = turn.findIndex((e) => e.k === "you"), iDice = turn.findIndex((e) => e.k === "dice");
  const iHit = turn.findIndex((e) => e.fx === "hit"), iFoe = turn.findIndex((e) => /オークの(攻撃|大技|連撃)|オークは|オークが/.test(e.text || ""));
  if (!(iYou >= 0 && iDice > iYou)) F("一手番の記録が「あなた → 判定」の順でない");
  if (iHit >= 0 && !(iHit > iDice)) F("与えたダメージが判定より前に記録された");
  if (iFoe >= 0 && iHit >= 0 && !(iFoe > iHit)) F("敵の行動が、こちらの一撃より前に記録された");
  const plan = (sp) => u.revealPlan(turn.length, { u13speed: sp }, turn);
  const pn = plan("normal"), ps = plan("slow"), pf = plan("fast"), pi = plan("instant");
  if (!pn.every((t, i) => !i || t > pn[i - 1])) F(`段取りが順に並ばない ${pn}`);
  if (!(ps[ps.length - 1] > pn[pn.length - 1] && pn[pn.length - 1] > pf[pf.length - 1])) F("ゆっくり > ふつう > 速い になっていない");
  if (pi.some((t) => t)) F("「一気に」なのに間をおく");
  const gaps = pn.slice(1).map((t, i) => t - pn[i]);
  if (gaps.some((g) => g < 250 || g > 1100)) F(`一段の間が 0.25〜1.1 秒の外 ${gaps}`);
  if (iDice >= 0 && !(pn[iDice + 1] - pn[iDice] >= 700)) F("サイコロのあと、転がって止まる間が無い");

  // サイコロの転がる目
  const fr = u.rollFrames(31, 7);
  if (fr.length !== 7 || fr[6] !== 31 || fr.some((r) => !(r >= 0 && r < 100))) F(`転がる目が変 ${fr}`);
  if (JSON.stringify(fr) !== JSON.stringify(u.rollFrames(31, 7))) F("転がる目が毎回変わる（乱数を使っている）");

  if (!bad) ok(`F1 戦闘を一段ずつ（${names}。一手番 ${turn.length} 行・ふつうで ${(pn[pn.length - 1] / 1000).toFixed(1)} 秒）`);
};
