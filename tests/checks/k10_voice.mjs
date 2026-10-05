// K10：仲間の口調（src/data/k10_voice.js の D.K10_VOICE・人が読む表は docs/voice_table.md）
// - 表：仲間になる人が一人残らず載っている。段のある人は、段の場面（話題）があり、出る好感度が段と同じ
// - 台詞：各仲間の台詞（会話・掛け合い・恋・依頼・出来事・部品。集め方は tests/k10_lines.mjs）が、表の一人称・呼び方に合う。
//   段で変わる呼び方は、変わる場面のほかは {U} で書く（くだける前にくだけた台詞が出ない）。だれが選ばれるか分からない出来事の台詞は {I} {U} で書く。
//   例外（D.K10_VOICE_EXCEPT）には理由があり、どれも今の台詞に当たる（古い例外を残さない）
// - 遊ぶ：{I} {U} {v:} が話し手の口調になる。段の場面を聞くまでは前の呼び方、聞いて好感度があれば段の呼び方。場面は一覧のいちばん上に出る。
//   持ち主の見た台詞（M10 の「窓のある家」）が、ミルレーネの口から「お前」と出ない
import { collectLines, voiceProblems } from "../k10_lines.mjs";

export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("口調K10: " + m); };
  const D0 = G0.data;
  const P = D0.C2_PEOPLE || {};
  const T = D0.K10_VOICE || {};

  // ---------------------------------------------------------------- 表
  const comps = Object.keys(P).filter((id) => P[id].join);
  for (const id of comps) {
    const v = T[id];
    if (!v) { F(`${id}（${P[id].name}）が表に無い`); continue; }
    if (!Array.isArray(v.i) || !Array.isArray(v.you)) F(`${id}: i・you が配列でない`);
    if (id !== "rui" && (!v.i.length || !v.you.length)) F(`${id}: 一人称か呼び方が空`);
    if (!v.tail) F(`${id}: 語尾の控え（tail）が無い`);
    let prev = null;
    for (const s of v.stages || []) {
      const tp = ((D0.TALK[id] || {}).topics || []).find((x) => x.id === s.scene);
      if (!tp) { F(`${id}: 段「${s.name}」の場面 ${s.scene} が会話の話題に無い`); continue; }
      if ((tp.min ?? -19) !== s.at) F(`${id}: 場面 ${s.scene} の出る好感度（${tp.min}）が段（${s.at}）と違う`);
      if (prev && !String(tp.after || "").startsWith(prev)) F(`${id}: 場面 ${s.scene} が前の段の場面 ${prev} の後になっていない`);
      if (!s.you || !s.you.length) F(`${id}: 段「${s.name}」の呼び方が無い`);
      prev = s.scene;
    }
  }
  for (const id of Object.keys(T)) if (!P[id] || !P[id].join) F(`表の ${id} は仲間になる人でない`);
  const staged = comps.filter((id) => (T[id] || {}).stages);
  if (staged.length < 3) F(`段で呼び方が変わる人が ${staged.length} 人（3 人以上）`);
  if (staged.length > comps.length / 2) F(`段で呼び方が変わる人が多すぎる（${staged.length} 人。変わらない人のほうが多くてよい）`);

  // ---------------------------------------------------------------- 台詞
  const probs = voiceProblems(G0);
  const seen = new Set();
  for (const p of probs) {
    const k = p.who + p.src + p.text + p.why;
    if (seen.has(k)) continue;
    seen.add(k);
    if (seen.size <= 30) F(`${p.who}（${p.src}）：${p.why}　「${p.text.slice(0, 60)}」`);
  }
  if (seen.size > 30) F(`ほかに ${seen.size - 30} 件`);
  const lines = collectLines(G0);
  const by = {};
  for (const l of lines) by[l.who] = (by[l.who] || 0) + 1;
  for (const id of comps) if ((by[id] || 0) < (id === "rui" ? 20 : 150)) F(`${id} の台詞が ${by[id] || 0} しか集まらない（集め方が壊れていないか）`);
  if ((by["*"] || 0) < 100) F(`だれでも話す台詞が ${by["*"] || 0} しか集まらない`);
  for (const x of D0.K10_VOICE_EXCEPT || []) {
    if (!x.why) F(`例外（${x.who} ${x.src || ""} ${x.has || ""}）に理由が無い`);
    const hit = lines.some((l) => (x.who === l.who || x.who === "*") && (!x.has || l.text.includes(x.has)) && (!x.src || l.src.startsWith(x.src)));
    if (!hit) F(`例外（${x.who} ${x.src || ""} ${x.has || ""}）が、どの台詞にも当たらない（古い例外は消す）`);
  }

  // ---------------------------------------------------------------- 遊ぶ
  const start = (mates, seed) => {
    const G = loadEngine();
    const D = G.data;
    G.rand = seeded(seed);
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 24, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.mode = "explore";
    mates.forEach((id) => G.c2Join(id));
    G.tkState(S);
    return { G, S, D, c: (id) => S.companions.find((x) => x.c2 === id) };
  };
  const focus = (G, S, c) => { G.m2State(S).focus = c.id; };
  {
    const { G, S, c } = start(["mirlene", "takimaru"], 101);
    const m = c("mirlene"), t = c("takimaru");
    if (!m || !t) F("ミルレーネかタキマルが仲間にならない");
    else {
      const aff = (id, v) => { G.affState(S)[id] = v; };
      focus(G, S, m);
      aff("mirlene", 20);
      if (G.m2Fill("{I}/{U}") !== "わたし/あなた") F(`ミルレーネの {I}/{U} が「${G.m2Fill("{I}/{U}")}」（わたし/あなた）`);
      if (G.m2Fill("{v:そうか|そうですか}") !== "そうですか") F("ミルレーネの {v:} が丁寧な方にならない");
      // 段に届いても、場面を聞くまでは「あなた」
      aff("mirlene", 35);
      if (G.m2Fill("{U}") !== "あなた") F(`場面を聞く前なのに、ミルレーネの {U} が「${G.m2Fill("{U}")}」`);
      // 場面は一覧のいちばん上に出る
      S.day += 1; m.talkDay = 0;
      G.m2Talk(m.id);
      if (S.event !== "tk_menu" || S.tk.cur.menu[0] !== "k10_mirlene_1") F(`好感度 35 で話すと、場面 k10_mirlene_1 が一覧の先頭に出ない（${S.tk && S.tk.cur && S.tk.cur.menu.join(",")}）`);
      else {
        G.act("ev:0");
        if (S.event !== "tk_topic") F("場面 k10_mirlene_1 が開けない");
        else G.act("ev:0");
      }
      if (S.mode === "event") { S.mode = "explore"; S.event = null; S.tk.cur = null; }
      focus(G, S, m);
      if (G.m2Fill("{U}") !== "テストさん") F(`場面を聞いたのに、ミルレーネの {U} が「${G.m2Fill("{U}")}」（テストさん）`);
      aff("mirlene", 65);
      if (G.m2Fill("{U}") !== "テストさん") F("二つ目の場面を聞く前に、ミルレーネが呼び捨てにする");
      G.tkState(S).heard.k10_mirlene_2 = { day: S.day, k: "sweet" };
      if (G.m2Fill("{U}") !== "テスト") F(`二つ目の場面のあと、ミルレーネの {U} が「${G.m2Fill("{U}")}」（テスト）`);
      // 好感度が下がれば、段の呼び方も戻る
      aff("mirlene", 10);
      if (G.m2Fill("{U}") !== "あなた") F("好感度が下がっても、ミルレーネが名前で呼び続ける");
      // 持ち主の見た台詞（M10 の窓のある家）
      aff("mirlene", 98);
      const ev = D0.EVENTS.find((e) => e.id === "m10_wed_window");
      const raw = JSON.stringify(ev ? ev.choices : "");
      const text = G.m2Fill(raw);
      if (!ev) F("M10 の m10_wed_window が無い");
      else if (/お前/.test(text)) F("ミルレーネの「窓のある家」に「お前」が出る");
      else if (!/テストが無駄遣いしなければ/.test(text)) F("ミルレーネの「窓のある家」が、名前で呼ぶ形にならない");
      // 話し手が決まっている部品の {U:id}
      focus(G, S, t);
      aff("takimaru", 50);
      if (G.m2Fill("{U:mirlene}") !== "テスト") F("{U:mirlene} が、ミルレーネの今の呼び方にならない");
      if (G.m2Fill("{I}/{U}") !== "おれ/兄貴") F(`タキマルの {I}/{U} が「${G.m2Fill("{I}/{U}")}」`);
      aff("takimaru", 80);
      if (G.m2Fill("{U}") !== "兄貴") F("「砂に書いた字」を聞く前に、タキマルが「あんた」と呼ぶ");
      G.tkState(S).heard.takimaru_v2 = { day: S.day, k: "sweet" };
      if (G.m2Fill("{U}") !== "あんた") F("「砂に書いた字」のあと、タキマルの {U} が「あんた」にならない");
      if (G.m2Fill("{v:そうか|そうですか}") !== "そうか") F("タキマルの {v:} がくだけた方にならない");
      // 書いた差し込みが、どの文でも残らない（{v:} の中の {kin} なども埋まる）
      const strs = [];
      const pull = (v, d = 0) => { if (d > 12 || v == null) return; if (typeof v === "string") { if (/\{(I|U|v:)/.test(v)) strs.push(v); } else if (typeof v === "object") Object.values(v).forEach((x) => pull(x, d + 1)); };
      pull(D0.EVENTS); pull(D0.TALK); pull(D0.TALK_BANTER); pull(D0.R2);
      for (const who of [m, t]) {
        focus(G, S, who);
        for (const x of strs) { const y = G.m2Fill(x); if (/\{(I|U|v:)|\{[a-z0-9_]+\}/.test(y)) { F(`差し込みが残る（${who.c2}）：${y.slice(0, 60)}`); break; } }
      }
      if (strs.length < 40) F(`{I} {U} {v:} を使う文が ${strs.length} しかない`);
    }
  }
  // 名の無い仲間は、性格の口調
  {
    const { G, S } = start([], 102);
    const fake = { id: "x1", name: "名無し", trait: "coward", bond: 60 };
    S.companions.push(fake);
    G.m2State(S).focus = "x1";
    const want = D0.K10_TRAIT.coward;
    if (G.m2Fill("{I}/{U}") !== `${want.i}/${want.you}`) F(`名の無い仲間（臆病）の {I}/{U} が「${G.m2Fill("{I}/{U}")}」`);
    if (G.m2Fill("{v:a|b}") !== "b") F("名の無い仲間（臆病）の {v:} が丁寧な方にならない");
  }
  if (!n) ok(`口調K10: 仲間 ${comps.length} 人の表・台詞 ${lines.length} 行が表に合う（段で変わる人 ${staged.length} 人：${staged.map((id) => P[id].name).join("・")}。例外 ${(D0.K10_VOICE_EXCEPT || []).length}）`);
};
