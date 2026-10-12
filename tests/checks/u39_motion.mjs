// U39：画面の動き（src/ui/zzzzzzzzzz_u39_motion.js・.css）。DOM なしで確かめられる範囲
// - 動きの時間はどれも 120〜400ms、得たものの時間差には上限がある（札が多くても待たせない）
// - 「動きを減らす」（G.P.u39still）か端末の prefers-reduced-motion なら動かさない。設定の無い古い記録・G.P が無いときは動く（落ちない）
// - さいころの止まり方は 大成功・成功・失敗・大失敗 で違い、どれも元の形で終わる。転がる間の目は乱数を使わない（同じ出目なら同じ並び）
// - HP の増減で跳ねる数：戦闘中に減った分は出さない（fx.js が出す）、別の冒険・初回は出さない
// - DOM の無い所で読んでも落ちない。見た目（.css）に「動きを減らす」の止め方があり、ビルドに入る
import { readFileSync, existsSync, readdirSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, ok }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U39：" + m); };
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const ctx = vm.createContext({ console });
  let rnd = 0;
  ctx.Math = Object.create(Math, { random: { value: () => { rnd++; return 0.5; } } });
  try { vm.runInContext("globalThis.G = { ui: { render() {} } };", ctx); vm.runInContext(src("ui/zzzzzzzzzz_u39_motion.js"), ctx, { filename: "ui/zzzzzzzzzz_u39_motion.js" }); }
  catch (e) { return fail("DOM なしで読むと落ちる：" + e.message); }
  const u = ctx.G.u39;
  const need = ["still", "chosen", "kindOf", "land", "faces", "delay", "total", "hpPop"];
  if (!u || need.some((k) => typeof u[k] !== "function")) return fail("G.u39 の入口が足りない");

  // ---- 時間
  const times = [];
  const walk = (o, at) => Object.entries(o).forEach(([k, v]) => (typeof v === "number" ? times.push([at + k, v]) : walk(v, at + k + ".")));
  walk(u.MS, "");
  times.filter(([k]) => !/chipStep|chipMax|popHold|beatGap/.test(k)).forEach(([k, v]) => { if (v < 120 || v > 400) fail(`動き ${k} が ${v}ms（120〜400 に）`); });
  if (u.total(50) > 400 + u.MS.chip) fail(`札 50 枚が出そろうまで ${u.total(50)}ms（待たせすぎ）`);
  if (u.delay(0) !== 0 || u.delay(1) <= 0 || u.delay(99) !== u.MS.chipMax) fail("札の時間差が 0 から始まって上限で止まっていない");
  if (u.total(0) !== 0) fail("札 0 枚なのに時間がかかる");

  // ---- 動きを減らす（設定が無くても落ちない）
  for (const P of [undefined, null, {}, { trophies: {} }, { u39still: false }]) {
    if (u.still(P, false)) fail(`設定の無い記録（${JSON.stringify(P)}）で動きが止まる`);
    if (!u.still(P, true)) fail(`端末が動きを減らす設定なのに（${JSON.stringify(P)}）動く`);
  }
  if (!u.still({ u39still: true }, false)) fail("「動きを減らす」を選んでも動く");
  if (!u.chosen({ u39still: 1 }) || u.chosen({})) fail("選んだかどうかの読み方が違う");

  // ---- さいころの止まり方
  const kinds = [
    [{ ok: true, crit: true, label: "大成功" }, "crit"], [{ ok: true, label: "成功" }, "ok"],
    [{ ok: false, label: "失敗" }, "ng"], [{ ok: false, fumble: true, label: "大失敗" }, "fumble"],
    [{ label: "大失敗" }, "fumble"], [{ label: "大成功", ok: true }, "crit"], [null, "ok"],
  ];
  kinds.forEach(([e, want]) => { if (u.kindOf(e) !== want) fail(`判定 ${JSON.stringify(e)} の止まり方が ${u.kindOf(e)}（${want} のはず）`); });
  const sigs = new Set();
  ["crit", "ok", "ng", "fumble"].forEach((k) => {
    const L = u.land(k);
    if (!L || !Array.isArray(L.die) || L.die.length < 2 || !Array.isArray(L.verdict)) return fail(`止まり方 ${k} のキーフレームが無い`);
    if (L.ms < 120 || L.ms > 400) fail(`止まり方 ${k} が ${L.ms}ms`);
    const last = L.die[L.die.length - 1];
    if ((last.scale && last.scale !== "1") || (last.translate && last.translate !== "0 0") || (last.rotate && last.rotate !== "0deg") || (last.opacity != null && last.opacity !== 1))
      fail(`止まり方 ${k} が元の形で終わらない`);
    sigs.add(JSON.stringify(L.die));
  });
  if (sigs.size !== 4) fail("大成功・成功・失敗・大失敗の止まり方が同じものを含む");
  // 弾む（大きくなって戻る）・沈む（下がって戻る）
  if (!/1\.[3-9]/.test(u.land("crit").die[0].scale || "")) fail("大成功が大きく弾まない");
  if (!u.land("ng").die.some((f) => /^0 [1-9]/.test(f.translate || ""))) fail("失敗が沈まない");
  const f1 = u.faces(57, 5), f2 = u.faces(57, 5);
  if (JSON.stringify(f1) !== JSON.stringify(f2) || f1.some((x) => !(x >= 0 && x < 100))) fail("転がる間の目が決まった並びでない");
  if (rnd) fail(`Math.random を ${rnd} 回使った（ゲームの乱数を動かさないように、決まった並びで）`);

  // ---- HP の跳ねる数
  const S = (o) => Object.assign({ id: "a", hp: 10 }, o);
  const cases = [
    [null, S(), null, "初回"], [{ id: "b", hp: 3 }, S(), null, "別の冒険"], [{ id: "a", hp: 10 }, S(), null, "変わらない"],
    [{ id: "a", hp: 4 }, S(), "+6", "回復"], [{ id: "a", hp: 14 }, S(), "−4", "戦闘の外で受けた"],
    [{ id: "a", hp: 14, combat: true }, S(), null, "戦闘で受けた"], [{ id: "a", hp: 14 }, S({ combat: {} }), null, "戦闘で受けた"],
    [{ id: "a", hp: 4, combat: true }, S({ combat: {} }), "+6", "戦闘で回復"], [{ id: "a" }, S(), null, "古い記録"],
  ];
  cases.forEach(([prev, s, want, what]) => {
    const p = u.hpPop(prev, s);
    if ((p ? p.text : null) !== want) fail(`HP の数（${what}）が ${p ? p.text : "なし"}（${want || "なし"} のはず）`);
  });

  // ---- 見た目・設定の口・エンジンに触っていない
  const css = src("ui/zzzzzzzzzz_u39_motion.css");
  if (!/html\.u39still[^{]*\{[^}]*animation-duration[^}]*transition-duration/.test(css)) fail("「動きを減らす」で CSS の動きを止めていない");
  const js = src("ui/zzzzzzzzzz_u39_motion.js");
  if (!/addSetting\(\{[\s\S]*id: "u39still"[\s\S]*section: "画面"/.test(js)) fail("設定の窓の「画面」に「動きを減らす」を足していない");
  if (/G\.S\.[a-zA-Z_]+\s*=(?!=)/.test(js)) fail("セーブ（G.S）に書いている（設定は G.P に）");
  if (/\b(gsap|import\s|require\(|https?:\/\/)/i.test(js.replace(/^\s*\/\/.*$/gm, ""))) fail("外の部品を読み込んでいる");
  // ビルドの出力（コードは game.js・game-2.js… に分かれる）に入っているか
  const site = new URL("../../dist/site/", import.meta.url);
  if (existsSync(site)) {
    const built = readdirSync(site).filter((f) => /^game(-\d+)?\.js$/.test(f)).map((f) => readFileSync(new URL(f, site), "utf8")).join("\n");
    if (built && !built.includes("G.u39 = {}")) fail("ビルドに入っていない（node tools/build.mjs）");
  }
  if (!bad) ok("U39：動きの時間・減らす設定・さいころの止まり方・HP の数");
};
