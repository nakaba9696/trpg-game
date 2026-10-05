// U13：戦闘の見せ方（src/ui/u13_battle.js の DOM を使わない部分、G.u13）と、戦闘の手の札（u13_menu.js の戦闘のまとめ方）
// - 一手の記録は一行ずつ間をおいて出る。早送り（finish）で残りが全部出る。速さ「すぐ」は今まで通り一度に出る。古い記録（速さが無い）は「ふつう」
// - 結果の場面：勝ち方の見出し・得た金と品・伸びた能力値（表示の点）・仲間の伸び・一行の HP
// - 戦闘の手：攻撃・急所・身を守る・逃げるはいつも出し、魔法・口と頭・道具は押すと開く組。どの組もこぼれない
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const G = loadEngine();
  const ctx = vm.createContext({ console, G, globalThis: { G } });
  for (const f of ["u13_battle.js", "u13_menu.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), ctx, { filename: "ui/" + f });
  const u = G.u13;
  if (!u || !u.revealPlan || !u.makeReveal || !u.result) { fail("U13: G.u13 の戦闘の見せ方が無い"); return; }
  const D = G.data;

  // ---------------------------------------------------------------- 速さと段取り
  if (u.speed({}) !== "normal" || u.speed(null) !== "normal" || u.speed({ u13speed: "やたら速い" }) !== "normal") fail("U13: 速さの無い（古い）記録が「ふつう」にならない");
  if (u.speed({ u13speed: "slow" }) !== "slow") fail("U13: 速さ「ゆっくり」を読めない");
  const pn = u.revealPlan(5, {});
  if (pn.length !== 5 || pn[0] !== 0 || !pn.every((t, i) => !i || t > pn[i - 1])) fail(`U13: 一行ずつの段取りが順に並ばない ${pn}`);
  const ps = u.revealPlan(5, { u13speed: "slow" });
  if (!(ps[4] > pn[4])) fail("U13: 「ゆっくり」が「ふつう」より遅くない");
  if (u.revealPlan(5, { u13speed: "instant" }).some((t) => t)) fail("U13: 「すぐ」なのに間をおく");
  if (u.revealPlan(1, {}).some((t) => t)) fail("U13: 一行だけなのに間をおく");
  const gap = pn[1] - pn[0];
  if (gap < 300 || gap > 800) fail(`U13: 一行の間 ${gap}ms が 0.3〜0.8 秒の外`);

  // 順に出る・早送りで全部出る（時計は差し替える）
  const fakeTimer = () => { const q = []; const set = (fn, ms) => { q.push({ fn, ms }); return q.length; }; set.run = (upto) => { q.filter((x) => x.ms <= upto && !x.ran).sort((a, b) => a.ms - b.ms).forEach((x) => { x.ran = true; x.fn(); }); }; return set; };
  {
    const shown = []; let done = 0;
    const t = fakeTimer();
    const r = u.makeReveal(u.revealPlan(4, {}), (i) => shown.push(i), () => done++, t);
    if (shown.join() !== "0" || r.done) fail(`U13: 出し始めに一行目だけが出ない（${shown}）`);
    t.run(gap * 2);
    if (shown.join() !== "0,1,2" || r.done) fail(`U13: 時が経っても順に出ない（${shown}）`);
    t.run(gap * 9);
    if (shown.join() !== "0,1,2,3" || !r.done || done !== 1) fail(`U13: 最後まで出たあと終わらない（${shown}・終わり ${done}）`);
  }
  {
    const shown = []; let done = 0;
    const t = fakeTimer();
    const r = u.makeReveal(u.revealPlan(5, { u13speed: "slow" }), (i) => shown.push(i), () => done++, t);
    r.finish();
    if (shown.join() !== "0,1,2,3,4" || !r.done || done !== 1) fail(`U13: 早送りで残りが全部出ない（${shown}）`);
    t.run(99999);
    if (shown.length !== 5 || done !== 1) fail("U13: 早送りのあとに、同じ行がもう一度出る");
  }
  {
    const shown = []; let done = 0;
    const r = u.makeReveal(u.revealPlan(6, { u13speed: "instant" }), (i) => shown.push(i), () => done++, fakeTimer());
    if (shown.length !== 6 || !r.done || done !== 1) fail("U13: 「すぐ」で一度に全部出ない（今まで通りにならない）");
  }

  // ---------------------------------------------------------------- 結果の場面
  G.rand = seeded(13);
  G.P = { trophies: {}, graves: [] };
  const st = {};
  D.STATS.forEach((k) => { st[k] = 50; });
  G.newGame({ cls: "merc", stats: st, goal: "majin", profile: { name: "テスト", sex: "男", age: 30 } });
  const S = G.S;
  const before = u.snap(S);
  S.gold += 37;
  S.inv.herb = (S.inv.herb || 0) + 2;
  // 表示の点がちょうど 1 つ増えるまで筋力を上げる（点の目盛りは S5 で変わりうるので、G.pt で数える）
  while (G.pt(S.stats["筋力"]) === before.pts["筋力"]) S.stats["筋力"] += 1;
  // 経験だけ（点は増えない）なら、伸びたとはしない（目盛りが 1 点 = 1 なら、この確かめは無い）
  S.stats["知力"] += 1;
  if (G.pt(S.stats["知力"]) !== before.pts["知力"]) S.stats["知力"] -= 1;
  const res = u.result(before, S, "win");
  if (res.title !== "勝利") fail(`U13: 勝ったときの見出しが「${res.title}」`);
  if (res.gold !== 37) fail(`U13: 得た金が ${res.gold}`);
  if (!res.items.some((x) => x.n === 2 && x.name === (G.itemInfo ? G.itemInfo("herb").name : D.ITEMS.herb.name))) fail(`U13: 得た品が出ない ${JSON.stringify(res.items)}`);
  if (res.grow.length !== 1 || res.grow[0].k !== "筋力" || res.grow[0].to !== res.grow[0].from + 1) fail(`U13: 伸びた能力値が合わない ${JSON.stringify(res.grow)}`);
  if (res.party[0].name !== "あなた" || res.party[0].hp !== S.hp) fail("U13: 一行の HP が出ない");
  for (const [how, t] of [["fled", "逃げ切った"], ["scared", "追い払った"], ["bribed", "見逃してもらった"]]) if (u.result(before, S, how).title !== t) fail(`U13: ${how} の見出しが「${t}」にならない`);
  if (u.grown(u.snap(S), S).length) fail("U13: 何も伸びていないのに伸びたとする");
  // 物語の文に内部の数（名声）を出さない：結果の中身に名声の項目が無い
  if (/名声|fame/.test(JSON.stringify(res))) fail("U13: 結果の場面に名声の数が出る");

  // ---------------------------------------------------------------- 戦闘の手の札（いつも出す手・押すと開く組）
  S.inv = { herb: 3, potion: 1, smoke: 1 };
  G.startCombat(["goblin", "goblin"], {});
  const gs = G.actions();
  const p = u.plan(gs, S);
  if (!p || p.kind !== "combat") fail("U13: 戦闘の手をまとめない");
  else {
    const ids = (is) => is.flatMap((i) => gs.filter((g) => g.list.length)[i].list.map((a) => a.id));
    const main = ids(p.main);
    for (const id of ["cb:attack", "cb:vital", "cb:guard", "cb:flee"]) if (!main.includes(id)) fail(`U13: ${id} がいつも出す手にない`);
    const labels = p.drawers.map((d) => d.label);
    for (const l of ["魔法", "道具"]) if (!labels.includes(l)) fail(`U13: 「${l}」が押すと開く組にない（${labels}）`);
    const n = gs.filter((g) => g.list.length).length;
    if (p.main.length + p.top.length + p.drawers.reduce((a, d) => a + d.groups.length, 0) !== n) fail("U13: 戦闘の組がこぼれる・重なる");
  }
  // 誰に使うかを選んでいる途中（問いだけ）はまとめない
  if (u.plan([{ title: "薬草を誰に使う？", list: [{ id: "cb:item:herb:x", label: "x" }, { id: "b5:cancel", label: "やめる" }] }], S)) fail("U13: 誰に使うかの問いだけなのにまとめる");

  // 「〇〇」と「〇〇を仲間に」は一行にまとめる（押すと使う相手を選ぶ）。まとめた行の数を札に出す
  {
    const pairs = u.pairPicks([{ id: "cb:item:herb" }, { id: "b5:pick:item:herb" }, { id: "cb:item:smoke" }, { id: "cb:heal" }, { id: "b5:pick:heal" }]);
    if (pairs["cb:item:herb"] !== "b5:pick:item:herb" || pairs["cb:heal"] !== "b5:pick:heal" || pairs["cb:item:smoke"]) fail(`U13: 品・術と「仲間に」の組み合わせが合わない ${JSON.stringify(pairs)}`);
    if (u.targetOf("b5:pick:item:herb", "c1") !== "cb:item:herb:c1" || u.targetOf("b5:pick:heal", "c1") !== "cb:heal:c1") fail("U13: 仲間に使うときの行動の id が合わない");
    // 実際の戦闘で：仲間が傷ついていて「仲間に」が出るとき、まとめた行から相手を選ぶ流れがエンジンで通る
    G.rand = seeded(31);
    G.P = { trophies: {}, graves: [] };
    const st2 = {};
    D.STATS.forEach((k) => { st2[k] = 50; });
    G.newGame({ cls: "priest", stats: st2, goal: "majin", profile: { name: "テスト", sex: "女", age: 30 } });
    G.addCompanion({ name: "テストの僧侶", cls: "僧侶", desc: "", power: 50, dmg: 2, hp: 20, maxHp: 20 });
    G.S.inv = { herb: 3, smoke: 1 };
    G.startCombat(["goblin"], {});
    const c = G.S.companions[0];
    c.hp = 3;
    const tools = G.actions().find((g) => g.list.some((a) => a.id === "cb:item:herb"));
    const pr = tools ? u.pairPicks(tools.list) : {};
    if (!pr["cb:item:herb"]) fail("U13: 仲間が傷ついているのに、薬草と「薬草を仲間に」がまとまらない");
    else {
      const p2 = u.plan(G.actions(), G.S);
      const d = p2 && p2.drawers.find((x) => x.label === "道具");
      if (!d || d.count !== tools.list.length - 1) fail(`U13: 道具の札の数が、まとめた行の数になっていない（${d && d.count}）`);
      const hp0 = c.hp;
      G.act(pr["cb:item:herb"]);
      const target = u.targetOf(pr["cb:item:herb"], c.id);
      if (!G.actions().flatMap((g) => g.list).some((a) => a.id === target)) fail(`U13: 相手を選ぶ行動 ${target} が出ない`);
      G.act(target);
      if (!(c.hp > hp0) || G.S.b5pick) fail(`U13: まとめた行から仲間に薬草を使えない（HP ${hp0}→${c.hp}）`);
    }
  }
  // 開いた一覧はボタンや手と重ならない：PC は縦に積み、一覧の中だけが流れる。開いている間は手を隠して高さを渡す
  const mcss = readFileSync(new URL("../../src/ui/u13_menu.css", import.meta.url), "utf8");
  if (!/#panel\.u13fight \{[^}]*flex-direction: column/.test(mcss) || !/> \.u13pop \{[^}]*overflow-y: auto/.test(mcss) || !/:has\(> \.u13pop\) > \.u13main/.test(mcss)) fail("U13: 戦闘の一覧が札と重ならない並べ方になっていない");
  if (/u13pop \{[^}]*min-height: min-content/.test(mcss)) fail("U13: 一覧が欄からはみ出す書き方（min-height: min-content）が残っている");
  // 10 番目の選択肢は 0 のキー
  const msrc = readFileSync(new URL("../../src/ui/u13_menu.js", import.meta.url), "utf8");
  if (!/ev\.key !== "0"/.test(msrc)) fail("U13: 10 番目の選択肢を 0 のキーで選べない");

  // 死の場面：見出し・倒れたわけ（R3 の墓碑と同じ文。無ければ死因）。年表は押すまで開かない（ui.after の自動を止める印）
  {
    G.rand = seeded(77);
    G.P = { trophies: {}, graves: [] };
    const st3 = {};
    D.STATS.forEach((k) => { st3[k] = 40; });
    G.newGame({ cls: "merc", stats: st3, goal: "majin", profile: { name: "テスト", sex: "男", age: 30 } });
    G.die("崩れた床の下の杭に貫かれた");
    const d = u.deathScene(G.S);
    const clue = G.r3Clue && G.r3Clue(G.S);
    if (d.title !== "あなたは倒れた" || !d.cause) fail("U13: 死の場面の見出しか倒れたわけが無い");
    if (clue && clue.what && d.cause !== clue.what) fail("U13: 死の場面の倒れたわけが、墓碑（R3）の文と違う");
    if (!clue && !d.cause.includes("杭")) fail("U13: 死の場面に死因が出ない");
    if (!/ロード/.test(u.RETRY)) fail("U13: 墓碑にロードでやり直せる一言が無い");
    const bsrc2 = readFileSync(new URL("../../src/ui/u13_battle.js", import.meta.url), "utf8");
    if (!/justDied[\s\S]*?S\.flags\.chronShown = true/.test(bsrc2) || !/ui\.openChronicle\(S, true\)/.test(bsrc2)) fail("U13: 死んだとき、押すまで年表を開かない形になっていない");
  }

  // 速さは独自のボタンを置かず、設定の窓（G.ui.addSetting）に足す
  const bsrc = readFileSync(new URL("../../src/ui/u13_battle.js", import.meta.url), "utf8");
  if (!/ui\.addSetting\(\{[\s\S]*?id: "u13speed"[\s\S]*?kind: "select"/.test(bsrc)) fail("U13: 戦闘の表示の速さを設定の窓（G.ui.addSetting）に足していない");
  if (/speedButton/.test(bsrc + readFileSync(new URL("../../src/ui/u13_menu.js", import.meta.url), "utf8"))) fail("U13: 戦闘の表示の速さの独自のボタンが残っている");

  if (!bad) ok(`U13: 戦闘の見せ方（一行の間 ${gap}ms・早送り・「すぐ」・結果の場面・能力値の伸び・戦闘の手の札）`);
};
