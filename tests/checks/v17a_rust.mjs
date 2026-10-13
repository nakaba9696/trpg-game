// V17a（t02）「錆鎧の心核」（src/data/v17a_rust.js）
// - 筋の出来事がそろい、next・戦う相手がみな在る。どの出来事のどの選択肢を選んでも、行き止まりにならず落ちない（戦いは勝ちきれる）
// - ユリナと会っていなくても、会って炭鉱で別れていても、最後（心核を砕く）まで進む。会っていない冒険で、ユリナに会ったことにならない
// - 始まったら c2_yurina は起きない。心核を砕いたら、この筋の出来事（セリオスに話す一度きりを除く）も分かれ身も出ない
// - 心核のそばの分かれ身は B 級で、使徒の B の素の強さより下。本体（錆鎧ゼブラン）の名は出さない
// - 文に数字・「！」・見せない言葉が無い。文の癖（千字あたり）が多すぎない
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintFile } from "../../tools/prose_lint.mjs";

const PROFILE = { name: "テスト", sex: "女", age: 26, history: "", personality: "無口", origin: "village" };
const CHAIN = ["v17a_rust_nail", "v17a_rust_mouth", "v17a_rust_mouth_v", "v17a_rust_shaft", "v17a_rust_core", "v17a_rust_quiet", "v17a_rust_again", "v17a_rust_word"];
const NARR = /[0-9０-９]|！|!/;
const BANNED = /見世物|観客|客席|舞台|台本|言霊/;

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("V17a 錆鎧の心核: " + m); };
  const start = (G, seed, day) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats: Object.fromEntries(D.STATS.map((k) => [k, 50])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), goal: "sword", profile: { ...PROFILE } });
    const S = G.S;
    S.hp = S.maxHp = 400;
    S.loc = "w2_dranherz"; S.visited.w2_dranherz = true; S.day = day; S.mode = "explore"; S.event = null; S.combat = null;
    return S;
  };
  const fightOut = (G) => {
    const S = G.S;
    for (let k = 0; k < 200 && S.mode === "combat" && !S.over; k++) G.act("cb:attack");
  };
  // 出来事を、決めた選択肢（ラベルの正規表現の並び）で、出来事が続くかぎり進める
  const walk = (G, prefs) => {
    const S = G.S;
    const seen = [];
    for (let g = 0; g < 20 && S.mode === "event" && !S.over; g++) {
      seen.push(S.event);
      const list = G.eventChoices();
      if (!list.length) { F(`${S.event}: 選べる選択肢が無い`); break; }
      const p = prefs.map((re) => list.find(({ c }) => re.test(c.label))).find(Boolean) || list[0];
      G.act("ev:" + p.i);
      fightOut(G);
    }
    return seen;
  };
  const pool = (G) => { const S = G.S; const tags = G.eventTags(); return G.data.EVENTS.filter((e) => e.w > 0 && e.where.some((w) => tags.includes(w)) && !(e.once && S.flags["ev:" + e.id]) && (!e.cond || e.cond(S))).map((e) => e.id); };

  const G0 = loadEngine();
  const D0 = G0.data;
  const evs = CHAIN.map((id) => D0.EVENTS.find((e) => e.id === id));
  CHAIN.forEach((id, i) => { if (!evs[i]) F(`出来事 ${id} が無い`); });
  if (bad) return;

  // ---------------------------------------------------------------- 形：next・戦う相手・文
  const outs = (c) => [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win].filter(Boolean);
  let chars = 0;
  for (const e of evs) {
    if (!e.where.includes("w2_dranherz")) F(`${e.id}: 鍛冶の都で起きない`);
    const texts = [e.title, e.text, ...e.choices.map((c) => c.label)];
    for (const c of e.choices) {
      if (c.next && !D0.EVENTS.some((x) => x.id === c.next)) F(`${e.id}「${c.label}」: next ${c.next} が無い`);
      for (const f of [].concat(c.fight || [])) if (!D0.ENEMIES[f]) F(`${e.id}「${c.label}」: 敵 ${f} が無い`);
      for (const o of outs(c)) {
        texts.push(o.text, o.memo, o.chron);
        if (o.next && !D0.EVENTS.some((x) => x.id === o.next)) F(`${e.id}「${c.label}」: next ${o.next} が無い`);
        for (const f of [].concat(o.fight || [])) if (!D0.ENEMIES[f]) F(`${e.id}「${c.label}」: 敵 ${f} が無い`);
      }
    }
    if (!e.choices.some((c) => !c.stat && !c.cond && !c.cost)) F(`${e.id}: 判定も条件も要らない選択肢が無い`);
    for (const t of texts.filter(Boolean)) {
      chars += t.length;
      if (NARR.test(t)) F(`${e.id}: 文に数字か「！」：${t.slice(0, 30)}`);
      if (BANNED.test(t)) F(`${e.id}: 見せない言葉「${t.match(BANNED)[0]}」`);
      if (/ゼブラン|錆鎧ゼ/.test(t)) F(`${e.id}: 本体の名が出る`);
    }
  }
  for (const id of ["v17a_rust_keeper", "v17a_rust_husk", "v17a_rust_chain"]) {
    const en = D0.ENEMIES[id];
    if (!en) { F(`敵 ${id} が無い`); continue; }
    if (NARR.test(en.desc + JSON.stringify(en.lines || {}))) F(`敵 ${id}: 説明に数字か「！」`);
  }
  if (G0.gradeOf("v17a_rust_keeper") !== "B") F(`心核のそばの分かれ身が B 級でない（${G0.gradeOf("v17a_rust_keeper")}）`);
  const bBase = { tier: 6, hp: 200 };   // 使徒の B 級の素の強さ（src/data/e3_apostles.js の BASE.B）
  const kp = D0.ENEMIES.v17a_rust_keeper;
  if (!(kp.hp < bBase.hp && kp.tier < bBase.tier)) F("心核のそばの分かれ身が使徒の B の素の強さ以上");
  if (["A", "S"].includes(G0.gradeOf("v17a_rust_husk"))) F("ひびの入った分かれ身が強すぎる");
  if (G0.e3Of && G0.e3Of("v17a_rust_keeper")) F("分かれ身が使徒の表に入っている（本体は出さない）");
  // 文の癖
  const r = lintFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "data", "v17a_rust.js"));
  if (r.rate > 2.5) F(`文の癖が多い：千字あたり ${r.rate.toFixed(2)} ${JSON.stringify(r.counts)}`);
  if (r.dots > 2.0) F(`「……」が多い：千字あたり ${r.dots.toFixed(2)}`);

  // ---------------------------------------------------------------- 会っていない冒険：最後まで進む
  {
    const G = loadEngine();
    const S = start(G, 11, 10);
    if (pool(G).includes("v17a_rust_nail")) F("ユリナに会わずに日が浅いうちから始まる");
    S.day = 40;
    if (!pool(G).includes("v17a_rust_nail")) F("ユリナに会わずに日がたっても始まらない");
    if (!pool(G).includes("c2_yurina")) F("（前提）始まる前は c2_yurina が起きうるはず");
    G.rand = () => 0.01;
    G.startEvent("v17a_rust_nail");
    const seen = walk(G, [/坑口を見に/, /板を外して/, /鎖を辿る/, /心核を先に/, /足を止める/]);
    for (const id of ["v17a_rust_mouth", "v17a_rust_shaft", "v17a_rust_core", "v17a_rust_quiet"]) if (!seen.includes(id)) F(`会っていない冒険: ${id} を通らない（${seen.join("→")}）`);
    if (seen.includes("v17a_rust_mouth_v")) F("ヴィオレーヌに会っていないのに坑口に出る");
    if (S.over) F("会っていない冒険: 途中で死んだ");
    if (!S.flags.v17a_rust_done) F("会っていない冒険: 心核を砕けない");
    if (G.c2Met("yurina", S)) F("会っていないのに、ユリナに会ったことになる");
    if (G.c2Met("violaine", S)) F("ヴィオレーヌに会ったことになる");
    // 砕いたあと
    S.mode = "explore"; S.event = null;
    for (let d = 0; d < 3; d++) {
      S.day += 7;
      const p = pool(G);
      const left = p.filter((id) => /^v17a_rust_/.test(id) && id !== "v17a_rust_word");
      if (left.length) F(`心核を砕いたあとも筋の出来事が起きうる：${left.join("・")}`);
      if (p.includes("c2_yurina")) F("心核を砕いたあとに c2_yurina が起きうる");
    }
    if (!pool(G).includes("v17a_rust_word")) F("心核を砕いたあと、セリオスに話す出来事が起きない");
    G.startEvent("v17a_rust_word");
    if (G.eventChoices().some(({ c }) => /ここで合ってた/.test(c.label))) F("ユリナの言葉を聞いていないのに、伝える選択肢が出る");
    G.act("ev:" + G.eventChoices()[0].i);
    if (pool(G).some((id) => /^v17a_rust_/.test(id))) F("セリオスに話したあとも、筋の出来事が起きうる");
  }

  // ---------------------------------------------------------------- 会って炭鉱で別れた冒険（ヴィオレーヌに会っている・ナタリアが仲間）
  {
    const G = loadEngine();
    const S = start(G, 12, 20);
    G.rand = () => 0.01;
    G.startEvent("c2_yurina");
    walk(G, [/一緒に行く/, /壁の錆/, /並んで戦う/]);
    if (S.over || !G.c2Gone("yurina", S)) F("（前提）ユリナの炭鉱の出来事が終わらない");
    S.mode = "explore"; S.event = null;
    if (pool(G).includes("v17a_rust_nail")) F("ユリナと別れたその日に始まる");
    S.day += 6;
    if (!pool(G).includes("v17a_rust_nail")) F("ユリナと別れて日がたっても始まらない");
    G.c2Meet("violaine");
    G.c2Join("natalia");
    if (!G.c2Has("natalia")) F("（前提）ナタリアが仲間にならない");
    G.startEvent("v17a_rust_nail");
    if (!G.eventChoices().some(({ c }) => /自分もその炭鉱に/.test(c.label))) F("ユリナの言葉を聞いたのに、炭鉱にいたと言えない");
    const seen = walk(G, [/坑口を見に/, /一緒に入ろう/, /ヴィオレーヌに斬り跡/, /ヴィオレーヌに鎧/, /ヴィオレーヌを待つ/]);
    if (!seen.includes("v17a_rust_mouth_v")) F(`ヴィオレーヌに会っているのに坑口に出ない（${seen.join("→")}）`);
    if (S.over || !S.flags.v17a_rust_done) F("会って別れた冒険: 心核を砕けない");
    if (G.c2Gone("violaine", S) || G.c2Gone("natalia", S) || !G.c2Has("natalia")) F("ヴィオレーヌかナタリアが死ぬ・去る");
    S.mode = "explore"; S.event = null;
    G.startEvent("v17a_rust_word");
    const w = G.eventChoices().find(({ c }) => /ここで合ってた/.test(c.label));
    if (!w) F("ユリナの言葉を聞いたのに、セリオスに伝えられない");
    else {
      G.act("ev:" + w.i);
      S.mode = "explore"; S.event = null;
      if (pool(G).includes("c19r_serios_sketch")) F("言葉を伝えたあとに、もう一度伝える出来事（c19r_serios_sketch）が起きうる");
    }
  }

  // ---------------------------------------------------------------- 引き返しても続きに戻れる
  {
    const G = loadEngine();
    const S = start(G, 13, 40);
    G.rand = () => 0.01;
    G.startEvent("v17a_rust_nail");
    walk(G, [/坑口を見に/, /引き返す/]);
    S.mode = "explore"; S.event = null;
    if (!pool(G).includes("v17a_rust_again")) F("坑口で引き返したあと、続きに戻る出来事が起きない");
    if (pool(G).includes("v17a_rust_nail")) F("始まったあとも始まりの出来事が起きうる");
    if (pool(G).includes("c2_yurina")) F("筋が始まったあとに c2_yurina が起きうる");
    G.startEvent("v17a_rust_again");
    walk(G, [/北の炭鉱へ戻る/, /角灯/, /鎖を辿る/, /上がる/]);
    S.mode = "explore"; S.event = null;
    if (!S.flags.v17a_rust_deep || S.flags.v17a_rust_done) F("竪穴で引き返した形にならない");
    G.startEvent("v17a_rust_again");
    if (!G.eventChoices().some(({ c }) => /竪穴の底へ/.test(c.label))) F("竪穴まで行ったのに、底へ戻る選択肢が無い");
    walk(G, [/竪穴の底へ/, /斬り合う/, /足を止める/]);
    if (S.over || !S.flags.v17a_rust_done) F("戻ってから心核を砕けない");
  }

  // ---------------------------------------------------------------- どの出来事のどの選択肢でも（判定の成否どちらでも）行き止まりにならない
  let tried = 0;
  const GX = loadEngine();   // 冒険は毎回 newGame で作り直す（読み込みは一度）
  for (const e of evs) {
    for (let i = 0; i < e.choices.length; i++) {
      for (const roll of e.choices[i].stat ? [0.01, 0.99] : [0.01]) {
        const S = start(GX, 100 + tried, 60);
        const G = GX;
        G.c2Meet("yurina"); G.c2State(S).gone.yurina = "dead"; S.flags.c19_yurina_word = true;
        G.c2Meet("violaine"); G.c2Join("natalia");
        Object.assign(S.flags, { v17a_rust_on: true, v17a_rust_vio: true, v17a_rust_deep: e.id !== "v17a_rust_again" || roll < 0.5 });
        if (e.id === "v17a_rust_word") S.flags.v17a_rust_done = true;
        G.startEvent(e.id);
        const l = G.eventChoices().find((x) => x.i === i);
        if (!l) continue;   // 条件で出ない選択肢（この形では出ない）
        tried++;
        try {
          G.rand = () => roll;
          G.act("ev:" + i);
          G.rand = () => 0.01;
          fightOut(G);
          walk(G, [/板を外して/, /一緒に入ろう/, /鎖を辿る/, /斬り合う/, /足を止める/]);
          if (S.over) F(`${e.id}「${e.choices[i].label}」（${roll}）: 死んだ`);
          if (S.mode === "combat") F(`${e.id}「${e.choices[i].label}」（${roll}）: 戦いが終わらない`);
          if (S.mode === "event") F(`${e.id}「${e.choices[i].label}」（${roll}）: 出来事が終わらない（${S.event}）`);
        } catch (err) { F(`${e.id}「${e.choices[i].label}」（${roll}）で落ちる：${err.message}`); }
      }
    }
  }

  if (!bad) ok(`V17a 錆鎧の心核（出来事 ${evs.length}・選び方 ${tried}・文 ${chars} 字・癖 ${r.rate.toFixed(2)}／千字）`);
};
