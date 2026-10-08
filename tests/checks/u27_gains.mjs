// U27：行動ごとの「得たもの・失ったもの」（src/engine/zzzzzzzzzzzzzzz_u27_gains.js・src/ui/zu27_gains.*）
// - 比べ方（G.u27.diff）：持ち物（身につけた物も）・所持金・名声・位・評判と悪名・HP/MP・能力値・術と技・仲間・振り直しの増減。増は good、減は bad（悪名は増が bad）
// - 実際に遊んで：戦闘でない行動で所持金・持ち物・名声が変わったら、その行動の記録の最後のほうに k: "gain" が一つ。中身は本当の増減と合う
//   戦闘の手番・戦闘を終える手番には出さない。変わらなければ出さない。記録はセーブできる形（JSON）
// - 画面：ui.js の記録の描き方の入口（ui.logEl）に足すだけ
import { readFileSync } from "node:fs";

export default ({ fail: failTo, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U27：" + m); };
  const G = loadEngine();
  const D = G.data;
  const U = G.u27;
  if (!U || typeof U.diff !== "function" || typeof U.snap !== "function") return fail("G.u27 が無い");

  // ---------------------------------------------------------------- 比べ方
  const item = Object.keys(D.ITEMS).find((id) => id !== "fists");
  const A = { gold: 100, hp: 10, mp: 5, maxHp: 20, maxMp: 5, fame: 3, title: "", sanity: 80, rerolls: 1, stats: { 筋力: 40 }, own: {}, spells: [], skills: [], comps: [], rep: { leo: { rep: 2, inf: 0 } } };
  const B = { ...A, gold: 70, hp: 14, fame: 5, title: "騎士", sanity: 70, rerolls: 2, stats: { 筋力: 41 }, own: { [item]: 2 }, comps: [{ id: "c1", name: "グレン" }], rep: { leo: { rep: 2, inf: 3 } } };
  const g = U.diff(A, B);
  const by = (k) => g.filter((x) => x.kind === k);
  const want = [["gold", -30, "bad"], ["fame", 2, "good"], ["hp", 4, "good"], ["sanity", -10, "bad"], ["stat", 1, "good"], ["item", 2, "good"], ["reroll", 1, "good"], ["comp", 1, "good"], ["inf", 3, "bad"]];
  want.forEach(([k, d, tone]) => { const x = by(k)[0]; if (!x || x.delta !== d || x.tone !== tone) fail(`${k} の増減が ${JSON.stringify(x)}（${d}・${tone} のはず）`); });
  if (!by("title").length) fail("位が変わったのに出ない");
  if (U.diff(A, { ...A }).length) fail("何も変わらないのに増減が出る");
  if (!by("item")[0].text.includes("×2")) fail("持ち物の数（×2）が出ない");

  // ---------------------------------------------------------------- 遊んで確かめる
  let gains = 0, checked = 0;
  for (let s = 0; s < 6; s++) {
    G.rand = seeded(2700 + s);
    G.P = { trophies: {}, graves: [] };
    const stats = {}; D.STATS.forEach((k) => { stats[k] = 60; });
    G.newGame({ cls: Object.keys(D.CLASSES)[s % Object.keys(D.CLASSES).length], stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
    G.S.gold = 500;
    for (let i = 0; i < 250 && !G.S.over; i++) {
      const S = G.S;
      const was = U.snap(S);
      const n0 = S.log.length, last0 = S.log[S.log.length - 1];
      const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
      if (G.S !== S) break;
      const at = S.log.lastIndexOf(last0);
      const fresh = at >= 0 ? S.log.slice(at + 1) : S.log.slice(Math.max(0, S.log.length - (S.log.length - n0)));
      const gl = fresh.filter((e) => e.k === "gain");
      if (gl.length > 1) fail(`一つの行動に「得たもの」が ${gl.length} つ`);
      if (was.combat || S.combat) { if (gl.length) fail("戦闘の手番に「得たもの」が出る"); continue; }
      const now = U.snap(S);
      const moved = now.gold !== was.gold || now.fame !== was.fame || JSON.stringify(now.own) !== JSON.stringify(was.own);
      checked++;
      if (moved && !gl.length) fail(`所持金・名声・持ち物が変わったのに「得たもの」が無い（${acts.length} の中から）`);
      if (!moved && gl.length && !gl[0].gains.some((x) => !["gold", "fame", "item"].includes(x.kind))) fail("変わっていないのに所持金・名声・持ち物が出る");
      if (gl.length) {
        gains++;
        const e = gl[0];
        const gold = e.gains.find((x) => x.kind === "gold");
        if ((gold ? gold.delta : 0) !== now.gold - was.gold) fail(`所持金の増減が合わない（${gold ? gold.delta : 0}／${now.gold - was.gold}）`);
        const fame = e.gains.find((x) => x.kind === "fame");
        if ((fame ? fame.delta : 0) !== now.fame - was.fame) fail("名声の増減が合わない");
        if (!e.text.startsWith("得たもの：") || JSON.parse(JSON.stringify(e)).gains.length !== e.gains.length) fail("記録の形がセーブできない・文が無い");
      }
    }
  }
  if (!gains || !checked) fail(`「得たもの」が一度も出ない（確かめた行動 ${checked}）`);
  const ui = readFileSync(new URL("../../src/ui/ui.js", import.meta.url), "utf8");
  if (!/ui\.logEl/.test(ui)) fail("ui.js に記録の描き方の入口（ui.logEl）が無い");
  if (!bad) ok(`U27：行動ごとの得たもの・失ったもの（${checked} 手を確かめ、${gains} 手で枠。増減は本当の値と合う・戦闘では出さない）`);
};
