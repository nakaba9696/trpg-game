// E13：使徒の不死＝門（src/data/zz_e13_immortal.js・src/engine/zz_e3y_e13_immortal.js・src/ui/zz_e13_reveal.js。設計は docs/lore/immortal.md）
// - 討伐できる十六体すべてに門がある。型は全員違う。S 級だけ二段
// - 門の条件（E3 の条件 id・弱らせる出来事の key）・能力値・手がかり（噂・出来事・手引きの行・覚え書き）が実在し、手がかりは一体に二本以上
// - 破らずに戦いに入らない：不死の場面・最大 HP の 2 割を失う（死なない）・挑んだ回数が増える
// - 破れば、今の格のまま戦える（frac は E3 の計算のまま）。破れた一行と、人の姿の立ち絵がある使徒は正体を現す一行
// - 黒鎧は伝説の武具でも破れ、門を破ったら刃は弾かれない（決定 1）／咎追いは罪（決定 4）／S 級は二段（決定 6）
// - 長編の決戦は opt.gate（"open"・"skip"）で門を渡す
// - 正体を現した使徒は、魔物の姿の絵が無ければ立ち絵に戻さず絵を出さない
// - プレイヤーに見える文に、由来の理屈の言葉（〔秘〕）が出ない
// - 決まった乱数で、全員に一通り挑む
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const PROFILE = { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" };
const file = (p) => fileURLToPath(new URL("../../" + p, import.meta.url));

export default ({ fail, ok, loadEngine, seeded }) => {
  const G0 = loadEngine();
  const D0 = G0.data;
  const E13 = D0.E13;
  if (!E13 || !G0.e13Gate) return fail("E13 門の表（D.E13）か仕組み（G.e13Gate）が無い");
  const LIST = D0.E3.LIST;
  const slay = Object.values(LIST).filter((a) => !a.noslay);

  // ---------------------------------------------------------------- 表
  const types = new Set();
  for (const a of slay) {
    const g = E13.GATE[a.id];
    if (!g) { fail(`E13 討伐できる使徒 ${a.id} に門が無い`); continue; }
    if (types.has(g.type)) fail(`E13 門の型「${g.type}」が二体にある（${a.id}）`);
    types.add(g.type);
    if (g.stages.length !== (a.rank === "S" ? 2 : 1)) fail(`E13 ${a.id}（${a.rank}）の門が ${g.stages.length} 段（S 級だけ二段）`);
    for (const st of g.stages) {
      if (!D0.STATS.includes(st.stat)) fail(`E13 ${a.id} の判定の能力値 ${st.stat} が無い`);
      if (!st.keys.length) fail(`E13 ${a.id} の門に条件が無い`);
      for (const k of [...st.keys, ...(st.easy || []), ...(st.auto || [])]) if (!a.keys.some((x) => x.id === k)) fail(`E13 ${a.id} の門の条件 ${k} が E3 の条件に無い`);
      for (const k of st.e10 || []) if (!((D0.E10 && D0.E10.LIST[a.id]) || []).some((x) => x.key === k)) fail(`E13 ${a.id} の門の出来事 ${k} が E10 に無い`);
      if (!st.broken) fail(`E13 ${a.id} の門に破れた一行が無い`);
    }
    if (!g.scene) fail(`E13 ${a.id} に不死の場面が無い`);
    for (const l of g.lore || []) if (!D0.LORE[l]) fail(`E13 ${a.id} の手引きの項目 ${l} が無い`);
    // 手がかり：実在して、二本以上（STY-12）
    let n = 0;
    for (const c of g.clues || []) {
      let hit = false;
      if (c.rumor) hit = D0.RUMORS.some((r) => (typeof r === "string" ? r : r && r.text || "").includes(c.rumor));
      else if (c.ev) hit = D0.EVENTS.some((e) => e.id === c.ev);
      else if (c.lore) { const [id, key] = c.lore.split(":"); hit = !!(D0.LORE[id] && D0.LORE[id].lines.some((l) => l[0] === key)); }
      else if (c.memo) hit = !!(a.meet && a.meet.peek && a.meet.peek.memo);
      if (!hit) fail(`E13 ${a.id} の手がかり ${JSON.stringify(c)} が見つからない`);
      else n++;
    }
    if (n < 2) fail(`E13 ${a.id} の手がかりが ${n} 本（二本以上）`);
    // 門の条件の品・印が、どこかで手に入る（E3 の条件の品・印の確かめは e3_apostles.mjs）
    // 正体を現す一行は、人の姿の立ち絵がある使徒だけ
    const portrait = existsSync(file(`assets/portraits/${a.id}.webp`));
    if (portrait && !g.reveal) fail(`E13 ${a.id} は人の姿の立ち絵があるのに、正体を現す一行が無い`);
    if (!portrait && g.reveal) fail(`E13 ${a.id} は人の姿の立ち絵が無いのに、正体を現す一行がある`);
  }
  for (const id of Object.keys(E13.GATE)) if (!LIST[id] || LIST[id].noslay) fail(`E13 討伐できない使徒 ${id} に門がある（討てない使徒は E8 のまま）`);
  if (!D0.EVENTS.some((e) => e.choices && e.choices.some((c) => c.ok && c.ok.flag === "e13_deed"))) fail("E13 砂の証文（e13_deed）がどの出来事でも付かない");
  if (!D0.EVENTS.some((e) => e.choices && e.choices.some((c) => c.ok && c.ok.e13said))) fail("E13 罪を言う出来事（e13said）が無い");

  // ---------------------------------------------------------------- 〔秘〕の言葉がプレイヤーに見える文に出ない
  const BAD = /兵器|創造主|作られ|魔王/;
  const texts = [E13.SLIP, E13.BACK];
  Object.values(E13.GATE).forEach((g) => { texts.push(g.scene, g.reveal); g.stages.forEach((st) => texts.push(st.broken)); });
  D0.EVENTS.filter((e) => /^e13_/.test(e.id)).forEach((e) => { texts.push(e.text); e.choices.forEach((c) => { if (c.ok) texts.push(c.ok.text, c.ok.memo); if (c.ng) texts.push(c.ng.text); }); });
  ["zalve:deed", "togaoi:say"].forEach((t) => { const [id, k] = t.split(":"); const l = D0.LORE[id] && D0.LORE[id].lines.find((x) => x[0] === k); if (l) texts.push(l[1]); else fail(`E13 手引きの行 ${t} が無い`); });
  ["deed", "clean"].forEach((k) => { const x = [LIST.zalve, LIST.togaoi].flatMap((a) => a.keys).find((y) => y.id === k); if (x) texts.push(x.on, x.label); else fail(`E13 新しい条件 ${k} が無い`); });
  D0.RUMORS.filter((r) => typeof r === "string" && /読み違えている|こだまより先に自分の罪/.test(r)).forEach((r) => texts.push(r));
  for (const t of texts) if (t && BAD.test(t)) fail(`E13 見える文に〔秘〕の言葉「${t.match(BAD)[0]}」：${t.slice(0, 30)}…`);

  // ---------------------------------------------------------------- 遊んでみる
  const start = (seed, st = 60, goal = "majin") => {
    const G = loadEngine();
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    G.data.STATS.forEach((k) => { stats[k] = st; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal, profile: { ...PROFILE } });
    G.S.weapon = "mithril";
    G.S.mode = "event";
    return G;
  };
  const keysAll = (G, on) => { const k0 = G.e3Keys; G.e3Keys = (a, s) => k0(a, s).map((k) => Object.assign(k, { met: on })); return () => { G.e3Keys = k0; }; };
  const forceCheck = (G, okv) => { const c0 = G.check; G.check = (stat, diff, reason) => { const r = c0(stat, diff, reason); return Object.assign(r, { ok: okv }); }; return () => { G.check = c0; }; };
  const said = (G, t) => G.S.log.some((l) => l.text === t || (l.text || "").startsWith(t));

  for (const a of slay) {
    const g = E13.GATE[a.id];
    if (!g) continue;
    // 条件が無い：戦いにならない・場面・2 割・死なない・回数
    {
      const G = start(10);
      const undo = keysAll(G, false);
      const S = G.S;
      const hp0 = S.hp = S.maxHp;
      const t0 = G.e3Tries(a.id);
      G.apply({ e3fight: a.id });
      undo();
      if (S.combat) fail(`E13 ${a.id}：条件が無いのに戦いになる`);
      if (!said(G, g.scene)) fail(`E13 ${a.id}：破れなかったのに不死の場面が出ない`);
      const want = Math.round(S.maxHp * E13.HURT);
      if (hp0 - S.hp !== want) fail(`E13 ${a.id}：破れなかったときに失う HP が ${hp0 - S.hp}（最大 HP の 2 割 ${want}）`);
      if (G.e3Tries(a.id) !== t0 + 1) fail(`E13 ${a.id}：破れなかったのに挑んだ回数が増えない`);
      // HP が少なくても死なない
      S.hp = 1;
      G.apply({ e3fight: a.id });
      if (S.over || S.hp !== 1) fail(`E13 ${a.id}：HP 1 で門に止められて死ぬ・HP が変わる`);
    }
    // 条件はあるが判定に落ちる：戦いにならない・手立ては合っていた一行
    {
      const G = start(11);
      const undo = keysAll(G, true);
      const undoC = forceCheck(G, false);
      G.apply({ e3fight: a.id });
      undoC(); undo();
      const autoAll = g.stages.every((st) => st.auto && st.auto.length);
      if (!autoAll && G.S.combat) fail(`E13 ${a.id}：判定に落ちたのに戦いになる`);
      if (!autoAll && !said(G, E13.SLIP)) fail(`E13 ${a.id}：判定に落ちたとき「手立ては合っていた」の一行が出ない`);
    }
    // 破れば、今の格のまま戦える
    {
      const G = start(12);
      if (G.e10Fill) G.e10Fill(G.S);
      const undo = keysAll(G, true);
      const undoC = forceCheck(G, true);
      const m = G.e3Mods(a.id);
      G.apply({ e3fight: a.id });
      undoC(); undo();
      const C = G.S.combat;
      const f = C && C.foes.find((x) => x.id === a.foe);
      if (!f) { fail(`E13 ${a.id}：門を破っても戦いにならない`); continue; }
      if (!f.e13) fail(`E13 ${a.id}：門を破った印（f.e13）が無い`);
      if (Math.abs(f.e3.frac - m.frac) > 1e-9) fail(`E13 ${a.id}：門を通ると弱り方が変わる（${f.e3.frac} と ${m.frac}）`);
      if (G.foeData(f).majin) fail(`E13 ${a.id}：門を破ったのに刃が弾かれる`);
      for (const st of g.stages) if (!said(G, st.broken)) fail(`E13 ${a.id}：破れた一行が出ない`);
      if (g.reveal && !said(G, g.reveal)) fail(`E13 ${a.id}：正体を現す一行が出ない`);
      // 正体を現した使徒：魔物の姿の絵が無ければ、立ち絵に戻さない
      const ctx = vm.createContext({ G: { ASSETS: { ["portraits/" + a.id]: "p.webp" }, S: G.S }, console });
      vm.runInContext(readFileSync(file("src/ui/v6_monsters.js"), "utf8"), ctx, { filename: "ui/v6_monsters.js" });
      vm.runInContext(readFileSync(file("src/ui/zz_e13_reveal.js"), "utf8"), ctx, { filename: "ui/zz_e13_reveal.js" });
      const g6 = ctx.G;
      if (g6.V6_APOSTLE[a.foe] && g6.v6ArtKey(a.foe)) fail(`E13 ${a.id}：正体を現したのに、戦いで人の姿の立ち絵が出る`);
    }
  }

  // S 級：一段目だけでは戦いにならない
  for (const id of ["kurobane", "tojizuki"]) {
    const G = start(13, 99);
    const g = E13.GATE[id];
    const k0 = G.e3Keys;
    G.e3Keys = (x, s) => k0(x, s).map((k) => Object.assign(k, { met: g.stages[0].keys.includes(k.id) }));
    G.apply({ e3fight: id });
    G.e3Keys = k0;
    if (G.S.combat) fail(`E13 ${id}：一段目だけで戦いになる（S 級は二段）`);
  }
  // 黒鎧：伝説の武具だけでも破れる。剣も羽も無ければ戦いにならない（決定 1）
  {
    const G = start(14, 99);
    LIST.graw && G.data.E3.LIST.graw.keys.forEach((k) => { k.test = () => false; });
    G.apply({ e3fight: "graw" });
    if (G.S.combat) fail("E13 黒鎧：羽も伝説の武具も無いのに戦いになる");
    G.S.weapon = "volgrim";
    G.apply({ e3fight: "graw" });
    if (!G.S.combat) fail("E13 黒鎧：伝説の武具を持っても戦いにならない");
    else if (G.foeData(G.S.combat.foes[0]).majin) fail("E13 黒鎧：門を破ったのに絶界に弾かれる");
  }
  // 咎追い：罪の匂いがあれば止まる。石碑で言えば数えない。言ったあとに増えた罪は数える。古いセーブ（S.e13 なし）でも動く
  {
    const G = start(15, 99);
    const S = G.S;
    delete S.e13;
    const clean = () => G.e3Keys("togaoi").find((k) => k.id === "clean").met;
    S.sin = 0;
    if (!clean()) fail("E13 咎追い：罪の無い身が条件を満たさない");
    S.sin = 5;
    if (clean()) fail("E13 咎追い：罪の匂いがあるのに条件を満たす");
    G.apply({ e3fight: "togaoi" });
    if (S.combat) fail("E13 咎追い：罪の匂いがあるのに戦いになる");
    G.apply({ text: "", e13said: true });
    if (!clean()) fail("E13 咎追い：石碑で罪を言っても数えられる");
    S.sin = 7;
    if (clean()) fail("E13 咎追い：言ったあとに増えた罪が数えられない");
    const ev = G.data.EVENTS.find((e) => e.id === "e13_confess");
    if (!ev || !ev.cond(S)) fail("E13 咎追い：罪が増えたのに石碑の出来事が起きない");
  }
  // 手がかりを知っていれば一段易しい
  {
    const G = start(16, 40);
    const undo = keysAll(G, true);
    const d0 = G.e13Gate("levian").stages[0].diff;
    G.openLore("levian:met", true);
    const d1 = G.e13Gate("levian").stages[0].diff;
    undo();
    if (!(d0 === "普通" && d1 === "易しい")) fail(`E13 手がかりを知っても易しくならない（${d0} → ${d1}）`);
  }
  // 長編：open なら判定なしで破れる・skip なら門を見ない
  {
    const G = start(17, 99);
    const undo = keysAll(G, false);
    G.e3Register("mirza");
    G.startCombat(["e3_mirza"], { gate: "open" });
    if (!G.S.combat || !G.S.combat.foes[0].e13) fail("E13 長編の備えで守りが破れているのに、決戦が門に止められる");
    G.S.combat = null; G.S.mode = "event";
    G.startCombat(["e3_mirza"], { gate: "skip" });
    if (!G.S.combat) fail("E13 物語の戦い（skip）が門に止められる");
    else if (G.S.combat.foes[0].e13) fail("E13 物語の戦い（skip）で正体を現す");
    undo();
  }
  // 決まった乱数で、全員に一通り（条件をそろえて挑み、破れたら討つ・破れなければ挑み直す）
  {
    const G = start(99, 70, "none"); // 目的「使徒を討つ」だと途中で冒険が終わる
    if (G.e10Fill) G.e10Fill(G.S);
    const undo = keysAll(G, true);
    let won = 0, rep = 0;
    for (const a of slay) {
      for (let i = 0; i < 4 && !(G.S.e3 && (G.S.e3.done || []).includes(a.id)); i++) {
        G.S.hp = G.S.maxHp; G.S.mode = "event";
        if (G.addSanity) G.addSanity(100, true); // 使徒を見るたびに正気が削れる（M5）。ここは門だけを見る
        G.apply({ e3fight: a.id });
        if (!G.S.combat) { rep++; continue; }
        G.S.combat.foes.forEach((f) => { f.hp = 0; });
        G._endCombat("win");
        G.endTurn();
      }
      if (G.S.e3 && (G.S.e3.done || []).includes(a.id)) won++;
      if (G.S.over) { fail(`E13 一通り：${a.id} で冒険が終わった`); break; }
    }
    undo();
    if (won !== slay.length) fail(`E13 一通り：討てたのは ${won}/${slay.length} 体`);
    ok(`E13 使徒の不死：門 ${Object.keys(E13.GATE).length} 体・型 ${types.size}・一通り ${won} 体（止められた ${rep} 回）`);
  }
};
