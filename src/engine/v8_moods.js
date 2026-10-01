// V8：立ち絵の喜怒哀楽。出来事の場面ごとに表情（S.mood）を決める。画面（src/ui/v8_moods.js・v5_stand.js）はそれを読んで、
// その人の差分の絵（assets/portraits/<id>_<joy|anger|sorrow|fun>.webp）があればそれを、無ければ通常の絵を出す。
// 決め方（出来事が始まったとき）：
//   1. 出来事のデータの mood（"joy"・"anger"・"sorrow"・"fun"。"normal" と書けば推さずに通常）
//   2. 無ければ、出来事の文の中身から簡単に推す（G.guessMood。「泣」「怒鳴」「笑」など）
//   3. それでも無ければ、そこへ続いた結果（choices の ok・ng・win）の mood（結果の文から推した表情は持ち越さない）
//   どれも無ければ通常（S.mood は null）
// 結果に書いた mood は、その結果から続く出来事（next）に持ち越す。結果で出来事が終わるときは、立ち絵も下がる。
// 古いセーブで S.mood が無くても通常として動く。レーン A（絵）の V8
(function (G) {
  const MOODS = (G.MOODS = ["joy", "anger", "sorrow", "fun"]);
  G.MOOD_NAMES = { joy: "喜", anger: "怒", sorrow: "哀", fun: "楽" };
  G.isMood = (m) => MOODS.includes(m);

  // 文から表情を推す。強いものから（泣いていれば、笑っていても哀）。当たらなければ null
  const GUESS = [
    ["sorrow", /泣(?!か[なずせ])|涙|嗚咽|すすり泣|しゃくり上げ|べそ/],
    ["anger", /怒鳴|怒っ|怒り|怒った|激昂|睨みつけ|舌打ち|声を荒|歯ぎしり|地団駄/],
    ["fun", /けらけら|げらげら|大笑い|笑い転げ|吹き出し|噴き出し|高笑い|腹を抱え|笑い声/],
    ["joy", /笑顔|微笑|笑った|笑う|にっこり|にかっと|喜ん|喜び|嬉し|うれし|跳ね起き/],
  ];
  G.guessMood = (text) => {
    const t = String(text || "");
    if (!t) return null;
    for (const [m, re] of GUESS) if (re.test(t)) return m;
    return null;
  };

  // 今の場面の表情（出来事の最中だけ）。画面はこれを読む
  G.moodOf = (S) => (S && S.mode === "event" && S.event && !S.combat && G.isMood(S.mood) ? S.mood : null);

  // 出来事の表情を決める（データだけで決まる。テストからも呼べる）
  G.eventMood = (e, carry) => {
    if (!e) return null;
    if (e.mood === "normal") return null;
    if (G.isMood(e.mood)) return e.mood;
    return G.guessMood(e.text) || (G.isMood(carry) ? carry : null);
  };

  let carry = null; // 当てはめ中の結果に書いた mood（続く出来事へ持ち越す）
  const apply0 = G.apply;
  G.apply = (o) => {
    const prev = carry;
    carry = o && G.isMood(o.mood) ? o.mood : null;
    try { return apply0(o); } finally { carry = prev; }
  };
  const start0 = G.startEvent;
  G.startEvent = (ev) => {
    const r = start0(ev);
    const S = G.S;
    if (S && S.mode === "event" && S.event) {
      const D = G.data || {};
      const e = typeof ev === "object" && ev && ev.id === S.event ? ev : (D.EVENTS || []).find((x) => x.id === S.event);
      S.mood = G.eventMood(e, carry);
    }
    return r;
  };
  // 出来事が終われば通常に戻す（金が足りずに選べなかったときは、その場のまま）
  const choose0 = G.chooseEvent;
  G.chooseEvent = (i) => {
    const r = choose0(i);
    const S = G.S;
    if (S && S.mode !== "event") S.mood = null;
    return r;
  };
})(globalThis.G = globalThis.G || {});
