// V17a：長編「膝を折らぬ者」（黒鎧の使徒・A 級）。src/data/v17a_graw_*.js（表は v17a_graw_0.js）・仕組みは src/engine/zzzzzzzzzzzzz_e7_saga.js
// - 表の形：A 級は六〜八章と終章。章の入口・小さな段・続き（next）の出来事があり、品・敵が実在する。長編の出来事は C10 の型を足されない。格が E3 と同じ
// - 通しで遊ぶ：行動の欄の「使徒を追う」（e7:graw:）から選ぶだけで、入口から終章まで届く。結末ごと（誰も膝を折らない・ディートマル・ラウレンツ・自分の膝）と裏道（E3 の戦い）
//   どの道でも行き止まり（選べる選択肢が無い・先へ進まない）が無い。決戦の前後で保存と読み込み
// - 一度目の対面は勝てないが死なない（HP は 1 で止まり、何手かで門の外へ放り出される）。先に行かせた伍長は死ぬ。決戦から逃げたら備え直す章に戻る
// - 名前のある人物は道中でも死ぬ（玉座の間のラウレンツ・控えの間のディートマル）。死んだ人の選択肢は出ず、年表に残る
// - 決戦の強さ：備えなしでは見えない壁に刃が届かず、備えるほど弱る。壁を割るのは宿敵の羽の備えだけ（陣では割らない設定）。E10 の印は備えと二重に数えない
// - E10 の「触れ役の果たし状」「砦の総出」と同じ印：長編の備えで済ませれば E10 の出来事はもう起きない。倒したあとも起きない
// - 倒したあと：長編の行動が出ない・印（e3 の graw と e7）・トロフィー・依頼の一覧の終わった欄。古いセーブ（S.e7 が無い）でも動く。条件の前は入口が出ない
// - 文：見せない言葉・置き換え忘れ・数字・「！」が無い。AI っぽい癖（V3 と同じ上限）
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import { lintFile } from "../../tools/prose_lint.mjs";

const BANNED = /見世物|観客|客席|舞台|台本|言霊/;
const ID = "graw";

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let failures = 0;
  let hush = false;
  const fail = (m) => { if (hush) return; failures++; fail0("V17a 黒鎧: " + m); };
  const G = loadEngine();
  const D = G.data;
  const E7 = D.E7;
  const sg = E7 && E7.SAGAS && E7.SAGAS[ID];
  if (!sg || !G.e7) { fail("長編の表か仕組みが無い"); return; }
  const evOf = (id) => D.EVENTS.find((e) => e.id === id);
  const mine = E7.EVENTS.filter((id) => (evOf(id) || {}).e7 === ID);

  // ---------------------------------------------------------------- 表の形
  const starts = [sg.opener.start];
  sg.chapters.forEach((c, i) => {
    if (c.start) starts.push(c.start);
    Object.values(c.subs || {}).forEach((s) => starts.push(s.start));
    if (!c.title || !c.line) fail(`第${i + 1}章に名前か説明が無い`);
    (Array.isArray(c.at) ? c.at : c.subs ? Object.values(c.subs).flatMap((s) => s.at) : []).forEach((l) => { if (!D.LOCS[l]) fail(`第${i + 1}章の場所 ${l} が無い`); });
  });
  [sg.toy.after, sg.final.flee, sg.final.win.next].forEach((id) => starts.push(id));
  starts.forEach((id) => { if (!evOf(id)) fail(`出来事 ${id} が無い`); });
  const nCh = G.e7.count(ID);
  if (sg.grade !== "A" || nCh < 6 || nCh > 8) fail(`A 級の長編の章の数が ${nCh}（6〜8）`);
  if (G.e7.grade(sg.apostle) !== sg.grade) fail(`長編の格 ${sg.grade} と、使徒の格 ${G.e7.grade(sg.apostle)} が違う`);
  if (!sg.chapters[sg.chapters.length - 1].after) fail("最後が後日談の終章でない");
  if (G.e7.chName(ID, 0) !== "第一章" || G.e7.chName(ID, sg.chapters.length - 1) !== "終章") fail("章の呼び名が違う");
  const PREP = sg.chapters.findIndex((c) => c.subs && c.subs.feather);
  const FINAL = PREP + 1;
  const TOY = sg.chapters.findIndex((c) => c.start === "v17g_5");
  if (PREP < 0 || TOY < 0 || TOY >= PREP) fail("一度目の対面・備え直す章の並びが違う");
  if (!Object.values(sg.preps).some((p) => p.weak && p.weak.open)) fail("壁を割る備え（open）が無い");
  if (Object.entries(sg.preps).some(([k, p]) => p.weak && p.weak.open && k !== "feather")) fail("宿敵の羽のほかに、壁を割る備えがある（設定では羽と伝説の武具だけ）");
  if (!D.TROPHIES.some((t) => t.key === "e7_graw") || !D.TROPHIES.some((t) => t.key === "e7_graw_clean")) fail("トロフィーが表に入っていない");
  if (!(D.M6 && D.M6.MILESTONES.some((m) => m.id === "e7_graw"))) fail("節目（M6）が表に入っていない");
  if (!(D.M6 && D.M6.HIGHLIGHTS.some((h) => h.key === "e7_graw"))) fail("人生の物語の一行（M6）が表に入っていない");
  if (!(D.F1_RAGE && D.F1_RAGE.graw)) fail("本気の一言（F1）が無い");
  const texts = [];
  const walkO = (o, where) => {
    if (!o) return;
    if (o.next && !evOf(o.next)) fail(`${where}：続き ${o.next} が無い`);
    if (o.item && !D.ITEMS[typeof o.item === "string" ? o.item : Object.keys(o.item)[0]]) fail(`${where}：品 ${o.item} が無い`);
    if (o.remove && !D.ITEMS[o.remove]) fail(`${where}：失う品 ${o.remove} が無い`);
    if (o.fight && !G.resolveFoes(o.fight).length) fail(`${where}：敵 ${o.fight} が無い`);
    if (o.text) texts.push([where, o.text]);
    walkO(o.win, where + "・勝ち");
  };
  for (const id of mine) {
    const e = evOf(id);
    if (!e.noC10) fail(`${id}：C10 の型を足さない印が無い`);
    if (!e.choices.length) fail(`${id}：選択肢が無い`);
    if (!e.who) fail(`${id}：話す人（who）が無い`);
    texts.push([id, e.text]);
    e.choices.forEach((c, i) => {
      if (c.fight && !G.resolveFoes(c.fight).length) fail(`${id}・${i}：敵 ${c.fight} が無い`);
      walkO(c.ok, `${id}・${c.label}`); walkO(c.ng, `${id}・${c.label}・しくじり`); walkO(c.win, `${id}・${c.label}`);
    });
  }
  if (mine.length < 15) fail(`出来事が少ない（${mine.length}）`);

  // ---------------------------------------------------------------- 通しで遊ぶ
  const roundTrip = () => { G.S = JSON.parse(JSON.stringify(G.S)); return G.S; };
  const start = (seed, cls) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats(cls || "merc", G.rand);
    G.newGame({ cls: cls || "merc", stats, caps, goal: "majin", profile: { name: "試し", sex: "男", age: 30, history: "", personality: "" } });
    const S = G.S;
    D.STATS.forEach((k) => { S.stats[k] = Math.max(S.stats[k], 90); });
    S.maxHp = S.hp = 999;
    S.gold = 5000;
    S.fame = 100;
    S.lore = Object.assign(S.lore || {}, { graw: ["castle"] }); // 荒野の城のことを知っている
    S.day = 30;
    return S;
  };
  const allActs = () => G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
  const sagaActs = () => allActs().filter((a) => a.id.startsWith(`e7:${ID}:`));
  const goTo = (loc) => { const S = G.S; S.loc = loc; S.mode = "explore"; S.travel = null; S.event = null; S.fac = null; S.depth = 0; S.day += 1; S.phase = 0; };
  let toyRounds = 0;
  const settle = (how, log) => {
    const S = G.S;
    let n = 0;
    while (S.mode === "combat" && !S.over && n++ < 40) {
      const toy = S.combat.foes.some((f) => f.e7 && f.e7.kind === "toy");
      if (toy) {
        toyRounds++;
        const a = allActs().find((x) => x.id === "cb:attack") || allActs()[0];
        G.act(a.id);
        if (S.hp <= 0 || S.over) { fail(`一度目の対面で死んだ（${log}）`); return; }
        if (S.flags.graw) fail(`一度目の対面で鎧を倒せた（${log}）`);
        continue;
      }
      if (how === "flee" && S.combat.foes.some((f) => f.e7 && f.e7.kind === "final")) { G._endCombat("fled"); G.endTurn(); return; }
      S.combat.foes.forEach((f) => { f.hp = 0; });
      G._endCombat("win");
      G.endTurn();
    }
    if (S.mode === "combat") fail(`戦いが終わらない（${log}）`);
  };
  const AVOID = /背を向け|やめておく|聞き流す|引き返す|備え直す|膝をついて|回りこむ|来なくていい/;
  const NAMES = [["laur", "ラウレンツ"], ["diet", "ディートマル"]];
  let failNext = null;
  const play = (prefer, how, log) => {
    const S = G.S;
    let n = 0;
    while (!S.over && (S.mode === "event" || S.mode === "combat") && n++ < 30) {
      if (S.mode === "combat") { settle(how, log); continue; }
      const list = G.eventChoices();
      if (!list.length) { fail(`${S.event}：選べる選択肢が無い（${log}）`); return; }
      const sf = (G.e7.peek(ID, S) || { f: {} }).f;
      for (const [k, nm] of NAMES) if (sf["ally_" + k] === "dead") list.forEach(({ c }) => { if (c.label.includes(nm)) fail(`${S.event}：死んだ${nm}の選択肢「${c.label}」が出る（${log}）`); });
      if (failNext && failNext.test(S.event || "")) { const c0 = G.check; G.check = () => ({ ok: false, roll: 100, chance: 0 }); try { G.act("ev:" + (list.find(({ c }) => c.stat) || list[0]).i); } finally { G.check = c0; } continue; }
      let pick = null;
      for (const re of prefer) { pick = list.find(({ c }) => re.test(c.label) && !(c.cost && S.gold < c.cost)); if (pick) break; }
      if (!pick) pick = list.find(({ c }) => !AVOID.test(c.label) && !(c.cost && S.gold < c.cost)) || list[0];
      G.act("ev:" + pick.i);
    }
  };
  const runSaga = ({ seed, prefer = [], preps = ["feather", "train", "arms", "herald", "host"], investigate = ["map", "old"], flee = false, feather = false, cls }, want) => {
    const S = start(seed, cls);
    if (feather) S.inv.e3_bladefeather = 1;
    const log = `結末 ${want}・種 ${seed}`;
    let fled = false;
    for (let step = 0; step < 50; step++) {
      const st = G.e7.peek(ID, G.S);
      if (st && st.closed) break;
      if (G.S.over) { fail(`途中で冒険が終わった（${G.S.deathCause}・${log}）`); return null; }
      if (st && st.end === "back") break;
      const ch = st ? st.ch : 0;
      const c = sg.chapters[ch];
      let loc;
      if (!st || !st.on) loc = "nerva";
      else if (c && c.subs) {
        const done = Object.keys(c.subs).filter((k) => st.sub[k]).length;
        const list = ch === PREP ? preps : investigate;
        const k = list.find((x) => !st.sub[x]);
        if (k && (done < (c.need || 1) || ch === PREP)) loc = c.subs[k].at[0];
        else loc = sg.chapters[ch + 1].at[0];
      } else loc = c.at[0];
      goTo(loc);
      if (G.addSanity) G.addSanity(100, true);
      if (step % 3 === 1) roundTrip();
      const acts = sagaActs();
      if (!acts.length) { fail(`${D.LOCS[loc].name}に「使徒を追う」の行動が無い（第${ch + 1}章・${log}）`); return null; }
      const nx = acts.find((a) => /:n$/.test(a.id));
      const sub = acts.find((a) => /:s:/.test(a.id));
      const a = ch === PREP && sub ? sub : nx || acts[0];
      const before = JSON.stringify([st && st.ch, st && st.sub, st && st.prep, st && st.on]);
      G.act(a.id);
      const fleeNow = flee && !fled && G.e7.peek(ID).ch === FINAL;
      play(prefer, fleeNow ? "flee" : "win", log);
      if (fleeNow) {
        fled = true;
        if (G.S.mode === "event") play([/備え直しに戻る/], "win", log);
        if (G.e7.peek(ID).ch !== PREP) fail(`決戦から逃げても、備え直す章に戻らない（${log}）`);
        if (!G.e7.peek(ID).retreats) fail(`決戦から逃げた数が残らない（${log}）`);
        if (G.S.flags.graw) fail(`決戦から逃げたのに、鎧が倒れた印がある（${log}）`);
      }
      const st2 = G.e7.peek(ID, G.S);
      const after = JSON.stringify([st2 && st2.ch, st2 && st2.sub, st2 && st2.prep, st2 && st2.on]);
      if (before === after && !(st2 && st2.end) && !fleeNow) fail(`${a.label} を選んでも先へ進まない（${log}）`);
      if (st2 && st2.on && G.e7.cur(ID, G.S) && !G.q7.list(G.S).some((x) => x.key === "e7:" + ID)) fail(`依頼の一覧に長編が出ない（第${st2.ch + 1}章・${log}）`);
    }
    const st = G.e7.peek(ID, G.S);
    if (want === null) return st;
    if (!st || st.end !== want) fail(`結末が ${st && st.end}（${want} のはず・${log}・${JSON.stringify(st && st.f)}）`);
    if (want !== "back" && st && !st.closed) fail(`後日談の章で閉じない（${log}）`);
    const S2 = G.S;
    if (!S2.flags.graw) fail(`鎧を倒した印（E3 の graw）が無い（${log}）`);
    if (!(G.P.slain && G.P.slain.graw)) fail(`冒険をまたぐ記録に倒した使徒が無い（${log}）`);
    if (want !== "back") {
      if (!S2.flags["e7:graw"]) fail(`正面から討った印が無い（${log}）`);
      if (!(G.P.trophies && G.P.trophies.e7_graw)) fail(`トロフィー「膝折らず」が無い（${log}）`);
      if (!S2.chronicle.some((x) => /黒い鎧を正面から討つ/.test(x.text))) fail(`年表に決着の一行が無い（${log}）`);
      if (!G.q7.finished(S2).some((x) => x.src === "e7" && x.title === sg.title)) fail(`終わった依頼に長編が無い（${log}）`);
    } else {
      if (S2.flags["e7:graw"]) fail("裏道で倒したのに、正面から討った印が付いた");
      if (G.P.trophies.e7_graw) fail("裏道で倒したのに、正面のトロフィーが付いた");
      if (!G.q7.finished(S2).some((x) => x.src === "e7" && x.failed)) fail("裏道で閉じた長編が、終わった依頼に出ない");
    }
    // 倒したあと：どこにいても長編の行動が出ない。E10 の黒鎧の出来事も起きない
    for (const l of ["nerva", "fort", "mountains", "majincastle", "w2_zalgros"]) { goTo(l); if (sagaActs().length) fail(`倒したあとも${D.LOCS[l].name}に長編の行動が出る（${log}）`); }
    for (const k of ["herald", "fort"]) { const e = evOf(`e10_graw_${k}`); if (e && e.cond(S2)) fail(`倒したあとも E10 の黒鎧の出来事 ${k} が起きうる（${log}）`); }
    const op = evOf(sg.opener.start);
    goTo("nerva");
    if (op.cond(S2)) fail(`倒したあとも入口の出来事が起きうる（${log}）`);
    return st;
  };

  const ends = [];
  const ROUTES = [
    { want: "clean", seed: 101, prefer: [/溝に降りて/, /印の名前/, /そのときのこと/, /名を名乗り/, /前に出て、名乗り/, /夜明けを待って/, /^踏みこむ$/, /一人で、最後の一歩/, /地図の線/] },
    { want: "diet", seed: 202, prefer: [/石切り場の穴/, /そのときのこと/, /膝の話を/, /ディートマルと並んで/, /^女剣士と斬り結ぶ/, /ディートマルが、先に前へ出る/], preps: ["feather", "train"], flee: true },
    { want: "laur", seed: 303, prefer: [/溝に降りて/, /前に出て、名乗り/, /ラウレンツの鶴嘴/, /溝のことを聞く/], preps: ["herald", "feather"], investigate: ["map", "rival"] },
    { want: "knee", seed: 404, prefer: [/尾根の上まで/, /膝が砕けても/], preps: ["arms", "host"], investigate: ["rival", "old"], feather: true }, // E13：羽か伝説の武具が無いと決戦にならない（門）
  ];
  for (const r of ROUTES) {
    let st = null;
    for (let k = 0; k < (r.want === "clean" ? 3 : 1); k++) {
      const quiet = r.want === "clean" && k < 2;
      hush = quiet;
      st = runSaga({ seed: r.seed + k * 10, prefer: r.prefer, preps: r.preps, investigate: r.investigate, flee: r.flee, feather: r.feather }, quiet ? null : r.want);
      hush = false;
      if (st && st.end === r.want) break;
    }
    if (st) ends.push(st.end);
  }
  if (toyRounds < 2) fail(`一度目の対面を本当に戦っていない（${toyRounds} 手）`);

  // 名前のある人物が道中で死ぬ道：玉座の間でラウレンツ、控えの間でディートマル
  {
    failNext = /^v17g_7a$/;
    const st = runSaga({ seed: 909, prefer: [/溝に降りて/, /そのときのこと/, /ラウレンツに、溝のことを言わせる/, /名を名乗り/, /夜明けを待って/, /^踏みこむ$/, /膝が砕けても/] }, "knee");
    failNext = null;
    const f = (st && st.f) || {};
    if (f.ally_laur !== "dead") fail(`玉座の間でラウレンツが死んでいない（${f.ally_laur}）`);
    if (f.ally_diet !== "dead") fail(`控えの間でディートマルが死んでいない（${f.ally_diet}）`);
    const deaths = G.S.chronicle.filter((x) => /が死ぬ/.test(x.text)).length;
    if (deaths < 2) fail(`年表に、道中で死んだ人の行が足りない（${deaths}）`);
    if (!G.S.flags["mid:majincastle:3"]) fail("控えの間で女剣士を倒しても、E3 の条件の印が付かない");
  }

  // 裏道：玉座の間で、宿敵の抜け羽を掲げて挑む（E3 の戦い）
  {
    const st = runSaga({ seed: 606, prefer: [/刃の抜け羽を掲げて/], feather: true }, "back");
    if (st && st.end === "back" && st.closed) fail("裏道で閉じた長編に後日談がある");
  }

  // ---------------------------------------------------------------- 決戦の強さ
  {
    start(707);
    const S = G.S;
    S.weapon = "mithril";
    const st = G.e7.of(ID, S);
    const m0 = G.e7.mods(ID, S);
    if (m0.open) fail("備えなしで、見えない壁に刃が届く");
    if (m0.hp < sg.final.hp) fail("備えなしの決戦が、正面の強さより弱い");
    let last = m0;
    for (const k of ["train", "arms", "herald", "host", "feather"]) {
      st.prep[k] = true;
      const m = G.e7.mods(ID, S);
      if (!(m.hp <= last.hp && m.hit <= last.hit && m.agi <= last.agi && m.def <= last.def && m.dmgMul <= last.dmgMul)) fail(`備え ${k} で強くなった`);
      if (k !== "feather" && m.open) fail(`備え ${k} で壁が割れた`);
      last = m;
    }
    if (!last.open) fail("宿敵の羽を備えても、壁が割れない");
    if (!(last.hp < m0.hp * 0.8)) fail("備えをそろえても、ほとんど弱らない");
    const e3 = G.e3FoeData(ID);
    if (!(sg.final.hp > e3.hp * 1.5)) fail("正面からの決戦が、裏道の戦いと変わらない強さ");
    // E10 の印は、備えと二重に数えない。長編の外で済ませていれば、備えなしでも効く
    st.prep = {};
    const base = G.e7.mods(ID, S);
    S.flags["e10:graw:herald"] = true; S.flags["e10:graw:fort"] = true;
    const byFlag = G.e7.mods(ID, S);
    if (!(byFlag.hp < base.hp)) fail("E10 の出来事を済ませていても、決戦が弱らない");
    st.prep.herald = true; st.prep.host = true;
    const both = G.e7.mods(ID, S);
    if (both.hp !== byFlag.hp || both.def !== byFlag.def) fail("E10 の印と備えを二重に数えている");
    // 宿敵の羽を持っていれば（E3 の条件）、備えでなくても壁が割れる
    st.prep = {}; S.flags = {}; S.inv.e3_bladefeather = 1;
    if (!G.e7.mods(ID, S).open) fail("宿敵の抜け羽を持っていても、壁が割れない");
  }

  // ---------------------------------------------------------------- E10 の出来事とのつながり
  {
    start(717);
    const S = G.S;
    const he = evOf("e10_graw_herald"), fo = evOf("e10_graw_fort");
    if (!he || !fo) fail("E10 の黒鎧の出来事が無い");
    else {
      S.fame = 200;
      if (!he.cond(S) || !fo.cond(S)) fail("確かめの前提：E10 の黒鎧の出来事が起きうる状態になっていない");
      // 長編の備えで果たし状・総出を済ませる
      const st = G.e7.of(ID, S); st.on = true; st.ch = PREP;
      goTo("fort");
      G.startEvent("v17g_6_herald");
      play([/鐘楼で触れ役を待ち/], "win", "果たし状");
      G.startEvent("v17g_6_host");
      play([/兵舎を回り/], "win", "総出");
      if (!st.prep.herald || !st.prep.host) fail("果たし状・総出の備えが済まない");
      if (he.cond(S) || fo.cond(S)) fail("長編の備えで済ませたのに、E10 の黒鎧の出来事がまだ起きうる");
      // 先に E10 で済ませていれば、備えはすぐ済む（判定なし・日数なし）
      start(727);
      const S2 = G.S;
      S2.flags["e10:graw:herald"] = true; S2.flags["e10:graw:fort"] = true;
      const st2 = G.e7.of(ID, S2); st2.on = true; st2.ch = PREP;
      goTo("fort");
      const d0 = S2.day;
      for (const id of ["v17g_6_herald", "v17g_6_host"]) {
        G.startEvent(id);
        const list = G.eventChoices();
        if (list.length !== 1 || list[0].c.stat) fail(`${id}：E10 で済ませていたのに、すぐ済む一つの道になっていない`);
        G.act("ev:" + list[0].i);
      }
      if (!st2.prep.herald || !st2.prep.host || S2.day !== d0) fail("E10 で済ませていたのに、備えがすぐ済まない");
    }
  }

  // ---------------------------------------------------------------- 古いセーブ・入口の条件
  {
    start(808);
    const S = G.S;
    delete S.e7;
    try { G.e7.here(S); G.q7.list(S); G.q7.finished(S); G.actions(); G.endTurn(); G.e7.mods(ID, S); } catch (e) { fail("S.e7 が無いセーブで例外：" + e.message); }
    S.loc = "nerva"; S.mode = "explore";
    if (!sagaActs().length) fail("条件がそろっても、入口の行動が出ない");
    const op = evOf(sg.opener.start);
    if (!op.cond(S)) fail("条件がそろっても、入口の町の出来事が起きない");
    S.fame = 0;
    if (sagaActs().length || op.cond(S)) fail("名が通る前から、長編の入口が出る");
    S.fame = 100; S.lore = {};
    if (sagaActs().length || op.cond(S)) fail("黒い鎧を知る前から、長編の入口が出る");
    S.lore = { graw: ["castle"] }; S.day = 3;
    if (sagaActs().length) fail("冒険の初めから、長編の入口が出る");
    S.day = 30; S.loc = "fort";
    if (sagaActs().length) fail("黒鉄の砦で、入口（砦の外の町の噂）が出る");
    // 微笑の長編の確かめ（tests/checks/e7_saga.mjs）と同じ始まり方では、この長編の入口は出ない
    start(818);
    G.S.fame = 0; G.S.lore = {}; G.S.flags.mirza = true; G.S.loc = "nerva";
    if (sagaActs().length) fail("微笑の長編の確かめと同じ始まり方で、この長編の入口が出る");
  }

  // ---------------------------------------------------------------- 文
  let chars = 0;
  for (const [w, t0] of texts) {
    const t = String(t0 || "");
    chars += t.length;
    if (BANNED.test(t)) fail(`${w}：見せない言葉「${t.match(BANNED)[0]}」`);
    if (/undefined|NaN|\{[a-z]+\}|\[object/.test(t)) fail(`${w}：置き換え忘れ「${t.slice(0, 30)}」`);
    if (/[0-9０-９]/.test(t)) fail(`${w}：物語に数字「${t.match(/.{0,8}[0-9０-９].{0,8}/)[0]}」`);
    if (/[！!]/.test(t)) fail(`${w}：「！」がある`);
    if (/エンバルダ/.test(t)) fail(`${w}：使徒の名が地の文に出る`);
  }
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "data");
  for (const f of readdirSync(dir).filter((x) => /^v17a_graw.*\.js$/.test(x))) {
    const r = lintFile(path.join(dir, f));
    if (r.chars < 500) continue;
    if (r.rate > 2.5) fail(`文の癖が多い ${f}：千字あたり ${r.rate.toFixed(2)} ${JSON.stringify(r.counts)}`);
    if (r.dots > 2.0) fail(`「……」が多い ${f}：千字あたり ${r.dots.toFixed(2)}`);
  }
  if (failures === 0) ok(`V17a 長編「${sg.title}」（${sg.grade} 級・${nCh} 章と終章・出来事 ${mine.length}・結末 ${[...new Set(ends)].join("・")}・裏道・文 ${chars} 字）`);
};
