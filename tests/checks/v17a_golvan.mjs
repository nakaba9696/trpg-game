// v17a（持ち主の決定 t01）：長編「王の仇討ち」（黒曜の獣・A 級。src/data/v17a_golvan_*.js・src/engine/zz_v17a_golvan.js）
// - 使徒の表：黒曜の獣は A 級・敵対・シート二十四。ふつうに挑んでも倒せない（E8 の討伐の数 S2・A6・B8 を変えない）。長編の戦いだけは戦いになる
// - 表の形：章の入口と小さな段の出来事があり、続き（next）がある出来事を指す。A 級は六〜八章と終章。長編の出来事は C10 の型を足されない
// - 通しで遊ぶ：行動の欄の「使徒を追う」から選ぶだけで、入口から終章まで届く（結末ごとに。途中で保存と読み込み）。行き止まりが無い
//   結末：誰も欠けない・老騎士・斥候・自分の腕（四つ）と、別の手で（裏道）
// - 一度目の対面は勝てない・死なない。決戦から逃げたら備え直す章に戻る。死んだ人は以後の選択肢に出ない
// - 備えなしの決戦は刃が届かない強さ。備えと戻らなかった欠けで弱る。古いセーブ（S.e7 が無い）でも動く。条件の前には行動が出ない
// - 終わったあと：長編の行動が出ない・倒した印・トロフィー・依頼の一覧の終わった欄・倒したあとの出来事
// - 文：見せない言葉・置き換え忘れ・獣の名・癖の数（tools/prose_lint.mjs）
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import { lintFile } from "../../tools/prose_lint.mjs";

const BANNED = /見世物|観客|客席|舞台|台本|言霊/;

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let failures = 0;
  const fail = (m) => { failures++; fail0("v17a 王の仇討ち: " + m); };
  const G = loadEngine();
  const D = G.data;
  const E7 = D.E7;
  const ID = "golvan";
  const sg = E7 && E7.SAGAS && E7.SAGAS[ID];
  const ap = D.E3 && D.E3.LIST && D.E3.LIST[ID];
  if (!sg || !G.e7 || !ap) { fail("長編の表か使徒の表が無い"); return; }
  const evOf = (id) => D.EVENTS.find((e) => e.id === id);

  // ---------------------------------------------------------------- 使徒の表
  if (ap.rank !== "A" || ap.calm !== "敵対" || ap.no !== 24) fail(`黒曜の獣の格・態度・番号が違う（${ap.rank}・${ap.calm}・${ap.no}）`);
  if (!ap.keys.some((k) => k.zekkai)) fail("黒曜の獣に zekkai の条件が無い");
  if (!ap.noslay || (G.e3Slayable && G.e3Slayable(ID))) fail("黒曜の獣が、ふつうに挑んで倒せる使徒になっている（討伐の数 S2・A6・B8 が変わる）");
  if (G.e7.grade(ID) !== sg.grade || sg.grade !== "A") fail(`長編の格 ${sg.grade} と使徒の格 ${G.e7.grade(ID)}`);
  const foeName = G.e3FoeData(ID).name;
  const kana = foeName.replace(/^.*の使徒/, "");
  if (!/^黒曜の使徒[ァ-ヴー]+$/.test(foeName)) fail(`戦いの見出しの名が「黒曜の使徒〇〇」でない：${foeName}`);

  // ---------------------------------------------------------------- 表の形
  const starts = [];
  sg.chapters.forEach((c, i) => {
    if (c.start) starts.push(c.start);
    Object.values(c.subs || {}).forEach((s) => starts.push(s.start));
    if (!c.title || !c.line) fail(`第${i + 1}章に名前か説明が無い`);
    (Array.isArray(c.at) ? c.at : c.subs ? Object.values(c.subs).flatMap((s) => s.at) : []).forEach((l) => { if (!D.LOCS[l]) fail(`第${i + 1}章の場所 ${l} が無い`); });
    Object.values(c.subs || {}).forEach((s) => s.at.forEach((l) => { if (!D.LOCS[l]) fail(`小さな段の場所 ${l} が無い`); else if (D.LOCS[l].type !== "town" && c.at === "town") fail(`備えの場所 ${l} が町でない`); }));
  });
  if (sg.opener) starts.push(sg.opener.start);
  starts.forEach((id) => { if (!evOf(id)) fail(`入口の出来事 ${id} が無い`); });
  [sg.toy.after, sg.final.flee, sg.final.win.next].forEach((id) => { if (!evOf(id)) fail(`出来事 ${id} が無い`); });
  const nCh = G.e7.count(ID);
  if (nCh < 6 || nCh > 8) fail(`A 級の長編の章の数が ${nCh}（六〜八）`);
  if (G.e7.chName(ID, 0) !== "第一章" || G.e7.chName(ID, sg.chapters.length - 1) !== "終章") fail("章の呼び名が違う");
  const PREP = sg.chapters.findIndex((c) => c.subs && c.subs.quench);
  const FINAL = PREP + 1;
  if (PREP < 0 || !sg.chapters[FINAL] || sg.chapters[FINAL].start !== "e7g_6") fail("備え直す章のあとが決戦の章でない");
  if (!Object.values(sg.preps).some((p) => p.weak && p.weak.open)) fail("刃を届かせる備え（open）が一つも無い");
  if (!(D.BGM && D.BGM.ROUTES && (D.BGM.ROUTES["apostle@saga_" + ID] || []).length)) fail("決戦の曲が無い");

  const texts = [];
  const walkO = (o, where) => {
    if (!o) return;
    if (o.next && !evOf(o.next)) fail(`${where}：続き ${o.next} が無い`);
    if (o.item && !D.ITEMS[typeof o.item === "string" ? o.item : Object.keys(o.item)[0]]) fail(`${where}：品 ${o.item} が無い`);
    if (o.text) texts.push([where, o.text]);
    walkO(o.win, where + "・勝ち");
  };
  const mine = E7.EVENTS.filter((id) => { const e = evOf(id); return e && e.e7 === ID; });
  if (mine.length < 15) fail(`長編の出来事が少ない（${mine.length}）`);
  for (const id of mine) {
    const e = evOf(id);
    if (!e.noC10) fail(`${id}：C10 の型を足さない印が無い`);
    if (!e.choices.length) fail(`${id}：選択肢が無い`);
    texts.push([id, e.text]);
    e.choices.forEach((c, i) => {
      if (c.fight && !G.resolveFoes(c.fight).length) fail(`${id}・${i}：敵 ${c.fight} が無い`);
      walkO(c.ok, `${id}・${c.label}`); walkO(c.ng, `${id}・${c.label}・しくじり`); walkO(c.win, `${id}・${c.label}`);
      texts.push([id, c.label]);
    });
  }
  // 使徒の表の文も
  [ap.meet.text, ap.meet.peek.text, ap.meet.leaveText, ap.win.text, ap.after.text, ...ap.keys.map((k) => k.on), D.E8.UNSLAY[ID]].forEach((t) => texts.push(["使徒の表", t]));

  // ---------------------------------------------------------------- ふつうに挑んでも倒せない。長編の外では、直接の戦いにもならない
  const roundTrip = () => { G.S = JSON.parse(JSON.stringify(G.S)); return G.S; };
  const start = (seed, open = true) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats("merc", G.rand);
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { name: "試し", sex: "女", age: 28, history: "", personality: "" } });
    const S = G.S;
    D.STATS.forEach((k) => { S.stats[k] = Math.max(S.stats[k], 90); });
    S.maxHp = S.hp = 999;
    S.gold = 5000;
    if (open) S.flags.c2_valeon_eye = true; // 王に腕を見込まれた（c2_valeon で使徒を討った話をした）
    S.day = 30;
    return S;
  };
  {
    const S = start(11);
    S.mode = "event";
    G.apply({ e3fight: ID });
    if (S.combat || S.mode === "combat") fail("長編の外で黒曜の獣に挑むと、戦いになる");
    if (!S.log.some((l) => l.text === D.E8.UNSLAY[ID])) fail("長編の外で挑んでも、倒せない一行が出ない");
    G.startCombat([ap.foe]);
    if (S.combat) fail("長編の外で、黒曜の獣と直接戦いになる");
    if (S.flags[ap.flag]) fail("長編の外で、倒した印が付く");
  }

  // ---------------------------------------------------------------- 条件の前には行動が出ない。微笑の長編の試し（e7_saga.mjs）の形でも出ない
  const allActs = () => G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
  const goTo = (loc) => { const S = G.S; S.loc = loc; S.mode = "explore"; S.travel = null; S.event = null; S.fac = null; S.day += 1; S.phase = 0; };
  {
    start(12, false);
    for (const loc of ["leavel", "nerva", "fort", "mountains"]) { goTo(loc); if (allActs().some((a) => a.id.startsWith("e7:" + ID))) fail(`王の目に留まる前から、${D.LOCS[loc].name}に長編の行動が出る`); }
    const S = start(13, false);
    S.flags.mirza = true; S.day = 30;
    if (G.e7.canOpen(ID, S)) fail("微笑の長編の試しと同じ形で、王の仇討ちが始められる（e7_saga.mjs の行動の選び方を乱す）");
    for (const loc of ["nerva", "w7_salyues", "karna", "w7_melvi", "w7_hermitage", "mountains", "wasteland", "w2_zalgros", "w2_dranherz", "zephara", "w7_glatz"]) {
      goTo(loc); if (allActs().some((a) => a.id.startsWith("e7:" + ID))) fail(`微笑の長編の試しの形で、${D.LOCS[loc].name}に王の仇討ちの行動が出る`);
    }
    start(14);
    goTo("nerva");
    if (allActs().some((a) => a.id.startsWith("e7:" + ID))) fail("王都の外で、王宮からの使いが来る");
    goTo("leavel");
    if (!allActs().some((a) => a.id === `e7:${ID}:open`)) fail("王の目に留まったのに、王都で長編を始められない");
  }

  // ---------------------------------------------------------------- 通しで遊ぶ
  const settle = (how, log) => {
    const S = G.S;
    let n = 0;
    while (S.mode === "combat" && !S.over && n++ < 40) {
      const toy = S.combat.foes.some((f) => f.e7 && f.e7.kind === "toy");
      if (toy) {
        const a = allActs().find((x) => x.id === "cb:attack") || allActs()[0];
        G.act(a.id);
        if (S.hp <= 0 || S.over) { fail(`一度目の対面で死んだ（${log}）`); return; }
        if (S.flags[ap.flag]) { fail(`一度目の対面で倒せてしまった（${log}）`); return; }
        continue;
      }
      if (how === "flee" && S.combat.foes.some((f) => f.e7 && f.e7.kind === "final")) { G._endCombat("fled"); G.endTurn(); return; }
      S.combat.foes.forEach((f) => { f.hp = 0; });
      G._endCombat("win");
      G.endTurn();
    }
    if (S.mode === "combat") fail(`戦いが終わらない（${log}）`);
  };
  const AVOID = /背を向け|今は退いて|断る|備え直/;
  const NAMES = [["gunt", "ギュンター"], ["jutta", "ユッタ"], ["wil", "近衛"]];
  let force = null; // { re: 出来事の id, ok: 判定を必ず成功（true）か失敗（false）にする }
  const play = (prefer, how, log) => {
    const S = G.S;
    let n = 0;
    while (!S.over && (S.mode === "event" || S.mode === "combat") && n++ < 30) {
      if (S.mode === "combat") { settle(how, log); continue; }
      const list = G.eventChoices();
      if (!list.length) { fail(`${S.event}：選べる選択肢が無い（${log}）`); return; }
      const sf = (G.e7.peek(ID, S) || { f: {} }).f;
      for (const [k, nm] of NAMES) if (sf["ally_" + k] === "dead") list.forEach(({ c }) => { if (c.label.includes(nm)) fail(`${S.event}：死んだ人（${nm}）の選択肢「${c.label}」が出る（${log}）`); });
      let pick = null;
      for (const re of prefer) { pick = list.find(({ c }) => re.test(c.label) && !(c.cost && S.gold < c.cost)); if (pick) break; }
      if (!pick) pick = list.find(({ c }) => !AVOID.test(c.label) && !(c.cost && S.gold < c.cost)) || list[0];
      const f = force && force.find((x) => x.re.test(S.event || ""));
      if (f) {
        const c0 = G.check;
        G.check = () => (f.ok ? { ok: true, roll: 1, chance: 100 } : { ok: false, roll: 100, chance: 0 });
        try { G.act("ev:" + pick.i); } finally { G.check = c0; }
      } else G.act("ev:" + pick.i);
    }
  };
  const runSaga = ({ seed, prefer = [], preps = ["quench", "chain", "host", "bell"], investigate = ["lib", "gunt"], flee = false, forced = null, stopAt = null }, want) => {
    const S0 = start(seed);
    const log = `結末 ${want}・種 ${seed}`;
    force = forced;
    let fled = false;
    for (let step = 0; step < 40; step++) {
      const S = G.S;
      const st = G.e7.peek(ID, S);
      if (st && st.closed) break;
      if (S.over) { fail(`途中で冒険が終わった（${S.deathCause}・${log}）`); break; }
      if (st && st.end === "back") break;
      const ch = st ? st.ch : 0;
      if (stopAt != null && st && st.on && ch >= stopAt) break;
      const c = sg.chapters[ch];
      let loc;
      if (!st || !st.on) loc = sg.opener.at[0];
      else if (c && c.subs) {
        const done = Object.keys(c.subs).filter((k) => st.sub[k]).length;
        const want2 = ch === PREP ? preps : investigate;
        const k = want2.find((x) => !st.sub[x]);
        if (k && (done < (c.need || 1) || ch === PREP)) loc = c.subs[k].at[0];
        else loc = sg.chapters[ch + 1].at[0];
      } else loc = c.at === "town" ? "leavel" : c.at[0];
      goTo(loc);
      if (G.addSanity) G.addSanity(100, true);
      S.hp = S.maxHp;
      if (step % 3 === 1) roundTrip();
      const acts = allActs().filter((a) => a.id.startsWith("e7:" + ID));
      if (!acts.length) { fail(`${D.LOCS[loc].name}に「使徒を追う」の行動が無い（第${ch + 1}章・${log}）`); break; }
      const nx = acts.find((a) => /:n$/.test(a.id));
      const sub = acts.find((a) => /:s:/.test(a.id));
      const a = ch === PREP && sub ? sub : nx || acts[0];
      const before = JSON.stringify([st && st.ch, st && st.sub, st && st.prep]);
      G.act(a.id);
      const fleeNow = flee && !fled && G.e7.peek(ID).ch === FINAL;
      play(prefer, fleeNow ? "flee" : "win", log);
      if (fleeNow) {
        fled = true;
        const s3 = G.e7.peek(ID);
        if (s3.won || s3.ch !== PREP) fail(`決戦から逃げても、備え直す章に戻らない（${log}・第${s3.ch + 1}章）`);
        if (!s3.retreats) fail(`決戦から逃げた数が残らない（${log}）`);
      }
      const st2 = G.e7.peek(ID, G.S);
      const after = JSON.stringify([st2 && st2.ch, st2 && st2.sub, st2 && st2.prep]);
      if (before === after && !(st2 && st2.end) && !fleeNow) fail(`${a.label} を選んでも先へ進まない（${log}）`);
      if (st2 && st2.on && G.e7.cur(ID, G.S) && !G.q7.list(G.S).some((x) => x.key === "e7:" + ID)) fail(`依頼の一覧に長編が出ない（第${st2.ch + 1}章・${log}）`);
    }
    force = null;
    const st = G.e7.peek(ID, G.S);
    if (flee && !fled) fail(`決戦から逃げる道を通れなかった（${log}）`);
    if (want === null) return st;
    if (!st || st.end !== want) { fail(`結末が ${st && st.end}（${want} のはず・${log}・${JSON.stringify(st && st.f)}）`); return st; }
    if (want !== "back") {
      const S = G.S;
      if (!st.closed) fail(`後日談の章で閉じない（${log}）`);
      if (!S.flags[ap.flag] || !S.flags["e7:" + ID]) fail(`倒した印が無い（${log}）`);
      if (!(G.P.slain && G.P.slain[ap.foe])) fail(`冒険をまたぐ記録に倒した使徒が無い（${log}）`);
      if (!(G.P.trophies && G.P.trophies.e7_golvan)) fail(`トロフィー「石割り」が無い（${log}）`);
      if ((want === "clean") !== !!(G.P.trophies && G.P.trophies.e7_golvan_clean)) fail(`トロフィー「欠けなかった隊」の付き方が違う（${log}）`);
      if (!S.chronicle.some((x) => /黒い石の獣を正面から討つ/.test(x.text))) fail(`年表に決着の一行が無い（${log}）`);
      if (!G.q7.finished(S).some((x) => x.src === "e7" && x.title === sg.title)) fail(`終わった依頼に長編が無い（${log}）`);
      // 終わったあと：長編の行動はもう出ない。倒したあとの出来事が起こりうる
      for (const loc of ["leavel", "mountains", "fort", "w3_frosleia"]) { goTo(loc); if (allActs().some((a) => a.id.startsWith("e7:" + ID))) fail(`終わった長編の行動が${D.LOCS[loc].name}に出る（${log}）`); }
      if (!evOf("e3_after_golvan").cond(S)) fail(`倒したあとの縄張りの出来事が起こらない（${log}）`);
      if (evOf("e3_meet_golvan").cond(S)) fail(`倒したあとも、黒い石の獣に会う出来事が起こる（${log}）`);
      if (G.e7.canOpen(ID, S)) fail(`倒したあとも長編を始め直せる（${log}）`);
    }
    return st;
  };
  const ends = [];
  const CLEAN = [/「行く」と言う/, /探すのは私/, /報せを、最初から/, /「一緒に来てくれ」/, /案内料を払って/, /古い鎧の列/, /正面から斬りかかる/, /代金を払/, /侍従長に、帳面/, /夜明けを待って/, /鐘の音/, /鎖の杭/, /王と並んで/, /王と二人で/, /埋まった札/];
  // 誰も欠けない（判定は成功させる）。決戦から一度逃げる
  {
    const st = runSaga({ seed: 101, prefer: CLEAN, flee: true, forced: [{ re: /^e7g_6_last$/, ok: true }] }, "clean");
    if (st) ends.push(st.end);
    const f = (st && st.f) || {};
    if (f.ally_gunt !== "with" && f.ally_gunt !== undefined) fail(`誰も欠けない道で、老騎士が ${f.ally_gunt}`);
  }
  // 老騎士が割れ目を支える
  {
    const st = runSaga({ seed: 202, prefer: [/ギュンターに、兄君/, /陛下が自分で/, /黙って、釣瓶/, /王の名を出す/, /ギュンターに、あの日/, /灰掻き/, /ふいご/, /王に、侍従長の/, /老騎士を、王の左/, ...CLEAN],
      preps: ["host", "chain"], investigate: ["gunt", "glass"], forced: [{ re: /^e7g_2_gunt$/, ok: true }] }, "gunt");
    if (st) ends.push(st.end);
    if (st && st.f.ally_gunt !== "dead") fail(`老騎士の結末で、老騎士が死んだことになっていない（${st.f.ally_gunt}）`);
    if (st && !G.S.chronicle.some((x) => /老騎士ギュンターが死ぬ/.test(x.text))) fail("老騎士の死が年表に無い");
  }
  // 斥候が最後の歩数を数える
  {
    const st = runSaga({ seed: 303, prefer: [/ユッタに、獣の裏/, /王の名を出す/, /ユッタの数える歩数/, /ユッタの数える/, /正面から斬りかかる/, /綱を、引く/, /小さな鐘/, /鎖と杭の代金/, ...CLEAN],
      preps: ["bell", "chain"], investigate: ["lib", "glass"] }, "jutta");
    if (st) ends.push(st.end);
    if (st && st.f.ally_jutta !== "dead") fail("斥候の結末で、斥候が死んだことになっていない");
  }
  // 自分の腕で支える。近衛の隊長は重さの坂で列を支えて死ぬ
  {
    const st = runSaga({ seed: 404, prefer: [/自分の腕を/, /近衛の槍の列で/, /「行く」と言う/, /黒い欠片を、手に取らせて/, /案内料/, /代金を払/, /侍従長に、帳面/, ...CLEAN],
      preps: ["quench", "host"], investigate: ["lib", "glass"] }, "self");
    if (st) ends.push(st.end);
    if (st && st.f.ally_wil !== "dead") fail("近衛の列を使った道で、隊長が死んだことになっていない");
    if (st && !G.S.chronicle.some((x) => /近衛の隊長ヴィルフリートが死ぬ/.test(x.text))) fail("近衛の隊長の死が年表に無い");
  }
  // 斥候が一度目の対面で死ぬ。死んだ斥候は以後の選択肢に出ない。割れ目を王と開けるのにしくじると、自分の腕で受ける
  {
    const st = runSaga({ seed: 505, prefer: [/ユッタに、先に回りこませる/, /案内料/, /斥候の紐/, /王と二人で/, ...CLEAN],
      preps: ["bell", "quench", "chain"], forced: [{ re: /^e7g_6_last$/, ok: false }] }, "self");
    if (st) ends.push(st.end);
    if (st && st.f.ally_jutta !== "dead") fail("一度目の対面で斥候を先に行かせても、死んだことになっていない");
    if (st && !G.S.chronicle.some((x) => /斥候のユッタが死ぬ/.test(x.text))) fail("斥候の死が年表に無い");
  }
  // 裏道：長編の途中で、別の手で倒れた（倒した印が外から付いた）
  {
    runSaga({ seed: 606, prefer: CLEAN, stopAt: PREP }, null);
    const S = G.S;
    const st = G.e7.peek(ID, S);
    if (!st || st.ch !== PREP) fail(`裏道の試しで、備え直す章まで来ない（${st && st.ch}）`);
    S.mode = "explore"; S.event = null; S.combat = null;
    S.flags[ap.flag] = true;
    G.endTurn();
    const st2 = G.e7.peek(ID, S);
    if (!st2 || st2.end !== "back") fail(`別の手で倒れても、長編が「別の手で」で閉じない（${st2 && st2.end}）`);
    else ends.push("back");
    if (S.flags["e7:" + ID]) fail("別の手で倒れたのに、正面から討った印が付いた");
    if (G.P.trophies.e7_golvan) fail("別の手で倒れたのに、正面のトロフィーが付いた");
    if (!G.q7.finished(S).some((x) => x.src === "e7" && x.failed)) fail("別の手で倒れた長編が、終わった依頼に出ない");
    goTo("leavel");
    if (allActs().some((a) => a.id.startsWith("e7:" + ID))) fail("別の手で倒れたあとも、長編の行動が出る");
  }
  for (const want of ["clean", "gunt", "jutta", "self", "back"]) if (!ends.includes(want)) fail(`結末 ${want} に届かなかった`);

  // ---------------------------------------------------------------- 決戦の強さ
  {
    const S = start(707);
    S.weapon = "mithril";
    const st = G.e7.of(ID, S);
    const m0 = G.e7.mods(ID, S);
    if (m0.open) fail("備えなしで、刃が届く");
    if (m0.hp < sg.final.hp) fail("備えなしの決戦が、正面の強さより弱い");
    let last = m0;
    for (const k of ["host", "chain", "bell", "quench"]) {
      st.prep[k] = true;
      const m = G.e7.mods(ID, S);
      if (!(m.hp <= last.hp && m.hit <= last.hit && m.agi <= last.agi && m.def <= last.def && m.dmgMul <= last.dmgMul)) fail(`備え ${k} で強くなった`);
      last = m;
    }
    if (!last.open) fail("火と雪の水の備えをしても、刃が届かない");
    if (!(last.hp < m0.hp * 0.8)) fail("備えをそろえても、ほとんど弱らない");
    st.prep = {};
    S.inv.e3_golvanchip = 1;
    if (!G.e7.mods(ID, S).open) fail("戻らなかった欠けを持っていても、刃が届かない");
    const e3 = G.e3FoeData(ID);
    if (!(sg.final.hp > e3.hp * 1.5)) fail("正面からの決戦が、使徒の表の強さと変わらない");
  }

  // ---------------------------------------------------------------- 古いセーブ
  {
    const S = start(808);
    delete S.e7;
    try { G.e7.here(S); G.q7.list(S); G.q7.finished(S); G.actions(); G.endTurn(); G.e7.mods(ID, S); } catch (e) { fail("S.e7 が無いセーブで例外：" + e.message); }
  }

  // ---------------------------------------------------------------- 文
  let chars = 0;
  for (const [w, t0] of texts) {
    const t = String(t0 || "");
    chars += t.length;
    if (BANNED.test(t)) fail(`${w}：見せない言葉「${t.match(BANNED)[0]}」`);
    if (/undefined|NaN|\{[a-z]+\}|\[object/.test(t)) fail(`${w}：置き換え忘れ「${t.slice(0, 30)}」`);
    if (kana.length >= 3 && t.includes(kana)) fail(`${w}：獣の名「${kana}」が地の文に出ている`);
    if (/[0-9０-９]/.test(t)) fail(`${w}：物語の文に数字`);
  }
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "data");
  const files = readdirSync(dir).filter((x) => /^v17a_golvan.*\.js$/.test(x));
  if (files.length < 4) fail(`長編のファイルが足りない（${files.join("・")}）`);
  for (const f of files) {
    const r = lintFile(path.join(dir, f));
    if (r.chars < 500) continue;
    if (r.rate > 2.5) fail(`文の癖が多い ${f}：千字あたり ${r.rate.toFixed(2)} ${JSON.stringify(r.counts)}`);
    if (r.dots > 2.0) fail(`「……」が多い ${f}：千字あたり ${r.dots.toFixed(2)}`);
  }
  if (failures === 0) ok(`v17a 長編「${sg.title}」（${sg.grade} 級・${nCh} 章と終章・出来事 ${mine.length}・結末 ${[...new Set(ends)].join("・")}・文 ${chars} 字）`);
};
