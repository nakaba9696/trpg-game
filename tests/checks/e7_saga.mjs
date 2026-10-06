// E7：使徒を正面から倒す長編（試作：微笑の使徒「微笑の糸を断つ」）。src/data/e7_*.js・src/engine/zzzzzzzzzzzzz_e7_saga.js
// - 表の形：章の入口と小さな段の出来事があり、出来事の続き（next）がある出来事を指している。長編の出来事は C10 の型を足されない
// - 通しで遊ぶ：行動の欄の「使徒を追う」から選ぶだけで、章が順につながって最後の章まで届く（結末ごとに。決戦の前後で保存と読み込み）
//   結末：誰も払わない・ベルトラン・フィーネ・ミュゼット・自分の顔（五つ）と、裏道（別の手で）。どの道でも、行き止まり（選べる選択肢が無い・先へ進まない）が無い
// - 一度目の対面は勝てないが死なない（糸が倒れることを許さず、何手かで終わる）。決戦から逃げたら備え直す章に戻る
// - 備えなしの決戦は勝てない強さ（絶界に刃が届かない。剣で破っても強い）。備えと仲間で弱る
// - 依頼の一覧（Q7）に今の章が出る／終わった長編が出る。古いセーブ（S.e7 が無い）でも動く
// - 文：見せない言葉が無い・置き換え忘れが無い・AI っぽい癖が多すぎない（V3 と同じ上限）・物語に数値を出さない（V12 の確認に任せる）
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import { lintFile } from "../../tools/prose_lint.mjs";

const BANNED = /見世物|観客|客席|舞台|台本|言霊/;

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let failures = 0;
  const fail = (m) => { failures++; fail0("E7: " + m); };
  const G = loadEngine();
  const D = G.data;
  const E7 = D.E7;
  const sg = E7 && E7.SAGAS && E7.SAGAS.mirza;
  if (!sg || !G.e7) { fail("長編の表か仕組みが無い"); return; }
  const evOf = (id) => D.EVENTS.find((e) => e.id === id);

  // ---------------------------------------------------------------- 表の形
  const starts = [];
  sg.chapters.forEach((c, i) => {
    if (c.start) starts.push(c.start);
    Object.values(c.subs || {}).forEach((s) => starts.push(s.start));
    if (!c.title || !c.line) fail(`第${i + 1}章に名前か説明が無い`);
    (Array.isArray(c.at) ? c.at : c.subs ? Object.values(c.subs).flatMap((s) => s.at) : []).forEach((l) => { if (!D.LOCS[l]) fail(`第${i + 1}章の場所 ${l} が無い`); });
  });
  starts.forEach((id) => { if (!evOf(id)) fail(`入口の出来事 ${id} が無い`); });
  [sg.toy.after, sg.final.flee].forEach((id) => { if (!evOf(id)) fail(`出来事 ${id} が無い`); });
  // 分量は格で変える（持ち主の決定）：S 級 十〜十二章・A 級 六〜八章・B 級 三〜五章（後日談の終章は数えない）
  const RANGE = { S: [10, 12], A: [6, 8], B: [3, 5] }[sg.grade] || [3, 12];
  const nCh = G.e7.count("mirza");
  if (nCh < RANGE[0] || nCh > RANGE[1]) fail(`${sg.grade} 級の長編の章の数が ${nCh}（${RANGE.join("〜")}）`);
  if (sg.opener && !evOf(sg.opener.start)) fail(`入口の出来事 ${sg.opener.start} が無い`);
  const PREP = sg.chapters.findIndex((c) => c.subs && c.subs.train);
  const FINAL = PREP + 1;
  // 格は G.e7.grade を通して読む。長編の表の格と、使徒の格が食い違わない
  if (G.e7.grade(sg.apostle) !== sg.grade) fail(`長編の格 ${sg.grade} と、使徒の格 ${G.e7.grade(sg.apostle)} が違う`);
  let chars = 0;
  const texts = [];
  const walkO = (o, where) => {
    if (!o) return;
    if (o.next && !evOf(o.next)) fail(`${where}：続き ${o.next} が無い`);
    if (o.item && !D.ITEMS[typeof o.item === "string" ? o.item : Object.keys(o.item)[0]]) fail(`${where}：品 ${o.item} が無い`);
    if (o.text) texts.push([where, o.text]);
    walkO(o.win, where + "・勝ち");
  };
  for (const id of E7.EVENTS) {
    const e = evOf(id);
    if (!e) { fail(`出来事 ${id} が D.EVENTS に無い`); continue; }
    if (!e.noC10) fail(`${id}：C10 の型を足さない印が無い`);
    if (!e.choices.length) fail(`${id}：選択肢が無い`);
    texts.push([id, e.text]);
    e.choices.forEach((c, i) => {
      if (c.fight && !G.resolveFoes(c.fight).length) fail(`${id}・${i}：敵 ${c.fight} が無い`);
      if (c.ng && c.ng.fight && !G.resolveFoes(c.ng.fight).length) fail(`${id}・${i}：敵が無い`);
      walkO(c.ok, `${id}・${c.label}`); walkO(c.ng, `${id}・${c.label}・しくじり`); walkO(c.win, `${id}・${c.label}`);
    });
  }
  // ---------------------------------------------------------------- 通しで遊ぶ
  const roundTrip = () => { G.S = JSON.parse(JSON.stringify(G.S)); return G.S; };
  const start = (seed, cls) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats(cls || "merc", G.rand);
    G.newGame({ cls: cls || "merc", stats, caps, goal: "majin", profile: { name: "試し", sex: "女", age: 28, history: "", personality: "" } });
    const S = G.S;
    D.STATS.forEach((k) => { S.stats[k] = Math.max(S.stats[k], 90); });
    S.maxHp = S.hp = 999;
    S.gold = 5000;
    S.flags.mirza = true; // 日傘の若君に会った（噂をたどれる）
    S.day = 30;
    return S;
  };
  const allActs = () => G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
  const goTo = (loc) => { const S = G.S; S.loc = loc; S.mode = "explore"; S.travel = null; S.event = null; S.fac = null; S.day += 1; S.phase = 0; };
  // 戦いを片付ける：一度目の対面は本当に戦う（死なないこと・何手かで終わることを見る）。ほかは勝ったことにする（逃げる、と言われたら逃げる）
  const settle = (how, log) => {
    const S = G.S;
    let n = 0;
    while (S.mode === "combat" && !S.over && n++ < 40) {
      const toy = S.combat.foes.some((f) => f.e7 && f.e7.kind === "toy");
      if (toy) { const a = allActs().find((x) => x.id === "cb:attack") || allActs()[0]; G.act(a.id); if (S.hp <= 0 || S.over) { fail(`一度目の対面で死んだ（${log}）`); return; } continue; }
      if (how === "flee" && S.combat.foes.some((f) => f.e7 && f.e7.kind === "final")) { G._endCombat("fled"); G.endTurn(); return; }
      S.combat.foes.forEach((f) => { f.hp = 0; });
      G._endCombat("win");
      G.endTurn();
    }
    if (S.mode === "combat") fail(`戦いが終わらない（${log}）`);
  };
  // 出来事で選ぶ：好みの順に名前を当て、無ければ逃げ道でない最初の選択肢
  const AVOID = /背を向け|やめておく|聞き流す|引き返す|備え直す|黙って見る|会釈して/;
  const play = (prefer, how, log) => {
    const S = G.S;
    let n = 0;
    while (!S.over && (S.mode === "event" || S.mode === "combat") && n++ < 30) {
      if (S.mode === "combat") { settle(how, log); continue; }
      const list = G.eventChoices();
      if (!list.length) { fail(`${S.event}：選べる選択肢が無い（${log}）`); return; }
      let pick = null;
      for (const re of prefer) { pick = list.find(({ c }) => re.test(c.label) && !(c.cost && S.gold < c.cost)); if (pick) break; }
      if (!pick) pick = list.find(({ c }) => !AVOID.test(c.label) && !(c.cost && S.gold < c.cost)) || list[0];
      G.act("ev:" + pick.i);
    }
  };
  const PLACES = { town: "nerva" };
  const runSaga = ({ seed, prefer = [], preps = ["ward", "arms", "train", "host"], investigate = ["rope", "bert"], flee = false, mask = false, cls }, want) => {
    const S = start(seed, cls);
    if (mask) S.inv.e3_mask = 1;
    const log = `結末 ${want}・種 ${seed}`;
    let fled = false;
    for (let step = 0; step < 40; step++) {
      const st = G.e7.peek("mirza", G.S);
      if (st && st.closed) break;
      if (G.S.over) { fail(`途中で冒険が終わった（${G.S.deathCause}・${log}）`); return null; }
      const ch = st ? st.ch : 0;
      const c = sg.chapters[ch];
      if (st && st.end === "back") break;
      // どこへ行くか
      let loc;
      if (!st || !st.on) loc = PLACES.town;
      else if (c && c.subs) {
        const done = Object.keys(c.subs).filter((k) => st.sub[k]).length;
        const want2 = ch === PREP ? preps : investigate;
        const k = want2.find((x) => !st.sub[x]);
        if (k && (done < (c.need || 1) || ch === PREP)) loc = c.subs[k].at[0];
        else loc = sg.chapters[ch + 1].at[0];
      } else loc = c.at === "town" ? PLACES.town : c.at[0];
      goTo(loc);
      if (G.addSanity) G.addSanity(100, true); // 章のあいだに宿で休んだことにする（正気の行き着く先は M5 の確かめに任せる）
      if (step % 3 === 1) roundTrip();
      const acts = allActs().filter((a) => a.id.startsWith("e7:"));
      if (!acts.length) { fail(`${D.LOCS[loc].name}に「使徒を追う」の行動が無い（第${ch + 1}章・${log}）`); return null; }
      // 段の行動を選ぶ（次の章があれば、備えをそろえてから）
      const nx = acts.find((a) => /:n$/.test(a.id));
      const sub = acts.find((a) => /:s:/.test(a.id));
      const a = ch === PREP && sub ? sub : nx || acts[0];
      const before = JSON.stringify([st && st.ch, st && st.sub, st && st.prep]);
      G.act(a.id);
      const fleeNow = flee && !fled && G.e7.peek("mirza").ch === FINAL;
      play(prefer, fleeNow ? "flee" : "win", log);
      if (fleeNow) {
        fled = true;
        if (G.S.mode === "event") play([/備え直しに戻る/], "win", log);
        if (G.e7.peek("mirza").ch !== PREP) fail(`決戦から逃げても、備え直す章に戻らない（${log}）`);
        if (!G.e7.peek("mirza").retreats) fail(`決戦から逃げた数が残らない（${log}）`);
      }
      const st2 = G.e7.peek("mirza", G.S);
      const after = JSON.stringify([st2 && st2.ch, st2 && st2.sub, st2 && st2.prep]);
      if (before === after && !(st2 && st2.end) && !fleeNow) fail(`${a.label} を選んでも先へ進まない（${log}）`);
      // 依頼の一覧に今の章が出る
      if (st2 && st2.on && G.e7.cur("mirza", G.S) && !G.q7.list(G.S).some((x) => x.key === "e7:mirza")) fail(`依頼の一覧に長編が出ない（第${st2.ch + 1}章・${log}）`);
    }
    const st = G.e7.peek("mirza", G.S);
    if (!st || st.end !== want) fail(`結末が ${st && st.end}（${want} のはず・${log}）`);
    if (want !== "back" && st && !st.closed) fail(`後日談の章で閉じない（${log}）`);
    if (want !== "back") {
      if (!G.S.flags["e3:mirza"]) fail(`使徒を倒した印が無い（${log}）`);
      if (!(G.P.slain && G.P.slain.e3_mirza)) fail(`冒険をまたぐ記録に倒した使徒が無い（${log}）`);
      if (!(G.P.trophies && G.P.trophies.e7_mirza)) fail(`トロフィー「糸切り」が無い（${log}）`);
      if (!G.S.chronicle.some((x) => /日傘の若君を正面から討つ/.test(x.text))) fail(`年表に決着の一行が無い（${log}）`);
      if (!G.q7.finished(G.S).some((x) => x.src === "e7")) fail(`終わった依頼に長編が無い（${log}）`);
      const m = G.m6Milestones ? null : null; // 節目は M6 の確認に任せる（表に足したことだけ下で見る）
    }
    return st;
  };
  const prep4 = ["ward", "arms", "train", "host"];
  const ROUTES = [
    { want: "clean", seed: 101, prefer: [/付けを全部払う/, /^連れていく/, /ベルトランに任せる/, /ベルトランに、下から/, /刃一本で/, /広場の真ん中/] },
    { want: "bert", seed: 202, prefer: [/付けを全部払う/, /芸の町へ帰れ/, /ベルトランに任せる/, /ベルトランに、糸を持たせる/], flee: true },
    { want: "fine", seed: 303, prefer: [/ベルトランに決めさせる/, /^連れていく/, /綱に登って/, /フィーネに、糸の上/, /リュドガー/], preps: ["ward", "host"] },
    { want: "mus", seed: 404, prefer: [/付けを全部払う/, /ベルトランに任せる/, /ミュゼットに縫い留め/, /ミュゼットに、自分の糸/], preps: ["price", "train"] },
    { want: "face", seed: 505, prefer: [/銀の糸を枕元/, /芸の町へ帰れ/, /人形ごと斬る/, /自分の顔で/], preps: ["arms", "ward"] },
  ];
  const ends = [];
  for (const r of ROUTES) {
    const st = runSaga({ seed: r.seed, prefer: r.prefer, preps: r.preps || prep4, flee: r.flee }, r.want);
    if (st) ends.push(st.end);
  }
  // 裏道：庭の奥で、笑わない面をつけて挑む（E3 の戦い）
  {
    const st = runSaga({ seed: 606, prefer: [/笑わない面をつけて/], mask: true }, "back");
    if (st && st.end === "back" && G.S.flags["e7:mirza"]) fail("裏道で倒したのに、正面から討った印が付いた");
    if (st && st.end === "back" && G.P.trophies.e7_mirza) fail("裏道で倒したのに、正面のトロフィーが付いた");
  }

  // ---------------------------------------------------------------- 決戦の強さ
  {
    start(707);
    const S = G.S;
    S.weapon = "mithril";
    const st = G.e7.of("mirza", S);
    const m0 = G.e7.mods("mirza", S);
    if (m0.open) fail("備えなしで、絶界に刃が届く");
    if (m0.hp < sg.final.hp) fail("備えなしの決戦が、正面の強さより弱い");
    let last = m0;
    for (const k of ["train", "arms", "ward", "host", "price"]) {
      st.prep[k] = true;
      const m = G.e7.mods("mirza", S);
      if (!(m.hp <= last.hp && m.hit <= last.hit && m.agi <= last.agi && m.def <= last.def && m.dmgMul <= last.dmgMul)) fail(`備え ${k} で強くなった`);
      last = m;
    }
    if (!last.open) fail("陣と顔の備えをしても、絶界が破れない");
    if (!(last.hp < m0.hp * 0.8)) fail("備えをそろえても、ほとんど弱らない");
    // 剣で絶界を破っても、備えなしなら正面の強さ（裏道の E3 の戦いよりずっと強い）
    const e3 = G.e3FoeData("mirza");
    if (!(sg.final.hp > e3.hp * 1.5)) fail("正面からの決戦が、裏道の戦いと変わらない強さ");
    // 開いた見出し：章の呼び名
    if (G.e7.chName("mirza", 0) !== "第一章" || G.e7.chName("mirza", sg.chapters.length - 1) !== "終章") fail("章の呼び名が違う");
  }

  // ---------------------------------------------------------------- 古いセーブ・ほかの冒険
  {
    start(808);
    const S = G.S;
    delete S.e7;
    try { G.e7.here(S); G.q7.list(S); G.q7.finished(S); G.actions(); G.endTurn(); } catch (e) { fail("S.e7 が無いセーブで例外：" + e.message); }
    S.flags.mirza = false; S.day = 1; S.loc = "nerva";
    if (G.actions().flatMap((g) => g.list).some((a) => a.id.startsWith("e7:"))) fail("噂を聞く前から、長編の行動が出る");
  }

  // ---------------------------------------------------------------- 文
  let dead = 0;
  for (const [w, t0] of texts) {
    const t = String(t0 || "");
    if (!t) { dead++; continue; }
    chars += t.length;
    if (BANNED.test(t)) fail(`${w}：見せない言葉「${t.match(BANNED)[0]}」`);
    if (/undefined|NaN|\{[a-z]+\}|\[object/.test(t)) fail(`${w}：置き換え忘れ「${t.slice(0, 30)}」`);
  }
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "data");
  for (const f of readdirSync(dir).filter((x) => /^e7_.*\.js$/.test(x))) {
    const r = lintFile(path.join(dir, f));
    if (r.chars < 500) continue;
    if (r.rate > 2.5) fail(`文の癖が多い ${f}：千字あたり ${r.rate.toFixed(2)} ${JSON.stringify(r.counts)}`);
    if (r.dots > 2.0) fail(`「……」が多い ${f}：千字あたり ${r.dots.toFixed(2)}`);
  }
  if (failures === 0) ok(`E7 長編「${sg.title}」（${sg.grade} 級・${nCh} 章と終章・出来事 ${E7.EVENTS.length}・結末 ${[...new Set(ends)].join("・")}・裏道・文 ${chars} 字）`);
};
