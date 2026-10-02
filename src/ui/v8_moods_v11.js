// V11：立ち絵の差分を、落とし先（近い表情）まで探して選ぶ。V8（src/ui/v8_moods.js）の G.v8MoodKey を差し替えるだけ。
// 例：「照れ」の絵が無い人は「喜」、それも無ければ基本の絵。落とし先は src/data/v11_moods.js（G.moodChain）。レーン A（絵）の V11
(function (G) {
  if (!G.v8MoodKey || !G.moodChain) return;
  G.v8MoodKey = (key, mood) => {
    if (!key || !mood) return key;
    const A = G.ASSETS || {};
    for (const m of G.moodChain(mood)) if (A["portraits/" + key + "_" + m]) return key + "_" + m;
    return key;
  };
})(globalThis.G = globalThis.G || {});
