// V8：立ち絵の喜怒哀楽の差分を選ぶ。who.mood（"joy"・"anger"・"sorrow"・"fun"）があり、その人の差分の絵
// （G.ASSETS["portraits/<id>_<mood>"]。assets/portraits/<id>_joy.webp など）があればそれ、無ければ通常の絵（v4_assets.js の鍵）。
// 表情は src/engine/v8_moods.js が場面ごとに決め（G.moodOf(S)）、V5 の立ち絵（v5_stand.js）が who に付けて描く。
// v4_assets.js の G.v4PortraitKey を包むだけ。レーン A（絵）の V8
(function (G) {
  const key0 = G.v4PortraitKey;
  if (!key0) return;
  G.v8MoodKey = (key, mood) => {
    if (!key || !mood || !(G.isMood ? G.isMood(mood) : true)) return key;
    const k = key + "_" + mood;
    return (G.ASSETS || {})["portraits/" + k] ? k : key;
  };
  G.v4PortraitKey = (who) => {
    const key = key0(who);
    return who && who.mood ? G.v8MoodKey(key, who.mood) : key;
  };
})(globalThis.G = globalThis.G || {});
