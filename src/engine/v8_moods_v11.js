// V11：表情の種類を喜怒哀楽の外へ広げる（表は src/data/v11_moods.js、絵のタグは docs/art/moods.json）。V8（v8_moods.js）を包むだけ。
//   ・G.MOODS に表の表情を足す（並びは喜怒哀楽が先）。出来事・結果・会話（K1）の mood に、どれでも書ける
//   ・G.moodChain(m)：その表情と落とし先（近い表情）の並び。画面は左から順に、その人の絵がある表情を出す（無ければ基本の絵）
//   ・G.guessMood：文から推す手がかりを表（D.MOOD_GUESS）に替える（泣き崩れ→泣き、頬を染め→照れ など）
//   ・G.eventMood：出来事のデータに mood が無ければ、表（D.EVENT_MOODS）の表情を使う（既存の出来事のファイルは書き換えない）
//   ・会話（K1）の話題・掛け合いにも、表（D.TALK_MOODS）の表情を付ける
// 古いセーブの S.mood（喜怒哀楽か null）はそのまま動く。知らない表情は通常として扱う。レーン A（絵）・U（画面）の V11
(function (G) {
  const D = G.data || {};
  const T = D.MOOD_TABLE || {};
  const MOODS = G.MOODS || (G.MOODS = []);
  for (const m of Object.keys(T)) if (!MOODS.includes(m)) MOODS.push(m);
  const NAMES = (G.MOOD_NAMES = G.MOOD_NAMES || {});
  for (const [m, t] of Object.entries(T)) if (!NAMES[m]) NAMES[m] = t.name;
  if (!G.isMood) G.isMood = (m) => MOODS.includes(m);

  G.moodChain = (m) => {
    if (!G.isMood(m)) return [];
    const out = [m];
    for (const f of (T[m] && T[m].fallback) || []) if (G.isMood(f) && !out.includes(f)) out.push(f);
    return out;
  };

  const GUESS = D.MOOD_GUESS || [];
  if (GUESS.length) G.guessMood = (text) => {
    const t = String(text || "");
    if (!t) return null;
    for (const [m, re] of GUESS) if (re.test(t)) return m;
    return null;
  };

  // 会話（K1）の話題・掛け合いに、表（D.TALK_MOODS）の表情を付ける（データに mood があればそのまま。会話のファイルは書き換えない）
  const TM = D.TALK_MOODS || {};
  const putMood = (x) => { if (x && x.mood === undefined && G.isMood(TM[x.id])) x.mood = TM[x.id]; };
  for (const t of Object.values(D.TALK || {})) (t.topics || []).forEach(putMood);
  (D.TALK_BANTER || []).forEach(putMood);

  const event0 = G.eventMood;
  if (event0) G.eventMood = (e, carry) => {
    const m = e && e.mood === undefined && D.EVENT_MOODS ? D.EVENT_MOODS[e.id] : undefined;
    return G.isMood(m) ? m : event0(e, carry);
  };
})(globalThis.G = globalThis.G || {});
