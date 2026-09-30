// 季節と天候（A1）。背景の絵（ui/scene.js）が読む。
// 季節は暦（G.dateOf と同じ 90 日ごと）と場所の寒さから、天候は日付・地方・冒険ごとの種から決める。
// 種は冒険の初めに G.rand で一度だけ引く（S.wseed）。古いセーブに無ければ冒険の id から作る。
// G.skyAt(locId?, day?) → { season: "春|夏|秋|冬", weather: "晴|雨|霧|雪", still, label }
// 行動のたびに、今いる場所の天候を S.weather に写す（環境音が読む）
(function (G) {
  const D = G.data;

  // 場所ごとの気候。rain / fog：その日が雨・霧になる割合。
  // cold：1 = 寒い（春が遅く、秋のあとすぐ冬）、2 = 一年じゅう冬（雨は雪になる）。
  // season：季節が止まっている場所。still：季節も天候も無い（魔物界）。
  // 書いていない場所は _default。新しい場所は、ここに1行足せば気候が付く
  D.CLIMATE = Object.assign(D.CLIMATE || {}, {
    _default: { rain: 0.18, fog: 0.12 },
    karna: { rain: 0.18, fog: 0.1 },
    nerva: { rain: 0.22, fog: 0.38 },          // 霧深い港町
    forest: { rain: 0.2, fog: 0.25 },
    ruins: { rain: 0.15, fog: 0.2 },
    plains: { rain: 0.15, fog: 0.12 },
    leavel: { rain: 0.15, fog: 0.08 },
    frost: { rain: 0.45, fog: 0.15, cold: 2 },  // 吹雪の街道
    garmund: { rain: 0.3, fog: 0.15, cold: 2 },
    fort: { rain: 0.2, fog: 0.2, cold: 1 },
    zephara: { rain: 0.15, fog: 0.15 },
    swamp: { rain: 0.25, fog: 0.45 },
    mountains: { rain: 0.3, fog: 0.3, cold: 2 },
    graveyard: { rain: 0.1, fog: 0.35, cold: 1 },
    wasteland: { still: true },
    majincastle: { still: true },
    yakumo: { rain: 0.3, fog: 0.12 },
    onigashima: { rain: 0.3, fog: 0.12 },
    w1_holy: { rain: 0, fog: 0.04 },            // 聖都には、なぜか雨が降らない
    w1_catacomb: { rain: 0.12, fog: 0.5 },
    w1_oboro: { rain: 0, fog: 0.3, season: "秋" }, // 夜の明けない島は、季節も進まない
  });

  // 寒さごとに、暦の季節（春夏秋冬の順）を見た目の季節に置き換える
  const COLD = [["春", "夏", "秋", "冬"], ["冬", "夏", "秋", "冬"], ["冬", "冬", "冬", "冬"]];

  function hash(...xs) {
    let s = 0x811c9dc5 | 0;
    for (const x of xs) {
      const str = String(x);
      for (let i = 0; i < str.length; i++) s = Math.imul(s ^ str.charCodeAt(i), 0x01000193);
      s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d);
    }
    s ^= s >>> 13; s = Math.imul(s, 0x297a2d39); s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  }

  G.climateOf = (id) => D.CLIMATE[id] || D.CLIMATE._default;
  G.seasonOf = (day) => G.SEASONS[Math.floor((((day - 1) % 360) + 360) % 360 / 90)];

  G.skyAt = (id, day) => {
    const S = G.S || {};
    id = id || S.loc;
    day = day || S.day || 1;
    const C = G.climateOf(id);
    if (C.still) return { season: "", weather: "", still: true, label: "" };
    const cal = G.SEASONS.indexOf(G.seasonOf(day));
    const season = C.season || COLD[C.cold || 0][cal];
    // 同じ地方は同じ空の下（隣の町でも雨なら雨）。割合は場所ごと
    const L = D.LOCS[id];
    const r = hash(S.wseed || hash(S.id || "") * 1e9, day, (L && L.region) || id);
    let weather = r < (C.rain || 0) ? "雨" : r < (C.rain || 0) + (C.fog || 0) ? "霧" : "晴";
    if (weather === "雨" && season === "冬") weather = "雪";
    return { season, weather, still: false, label: season + "・" + weather };
  };

  // 今いる場所の天候を S.weather に写す（「晴」「雨」「霧」「雪」。魔物界は ""）。
  // 環境音（ui/sound.js）はこれを読んで雨の音にする。古いセーブは次の行動で入る
  G.syncWeather = () => {
    const S = G.S;
    if (!S || !S.loc) return;
    S.weather = G.skyAt(S.loc, S.day).weather;
  };
  const after = (name) => {
    const f0 = G[name];
    if (typeof f0 !== "function") return;
    G[name] = function () { const r = f0.apply(this, arguments); G.syncWeather(); return r; };
  };
  // 冒険の初めに天候の種を引く（古いセーブは上の S.id から作る）
  const newGame0 = G.newGame;
  G.newGame = function (opt) {
    const r = newGame0.apply(this, arguments);
    if (G.S && !G.S.wseed) G.S.wseed = 1 + Math.floor(G.rand() * 1e9);
    G.syncWeather();
    return r;
  };
  after("act");
  after("gmApply");
})(globalThis.G = globalThis.G || {});
