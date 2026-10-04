// #35：墓碑に主人公の絵を残す。墓碑（G.P.graves）に、絵を描くのに要る人物設定と職業 id を hero として足す。
// hero = { cls: 職業 id, profile: { name, sex, age, ageBand, look, race, beast } }（G.heroWho(profile, cls) にそのまま渡せる形）
// 古い墓碑には hero が無いので、画面は今までどおり絵を出さない。core.js の G.finishRun を包むだけ。レーン C
(function (G) {
  const KEYS = ["name", "sex", "age", "ageBand", "look", "race", "beast"];
  G.c35GraveHero = (S) => {
    if (!S || !S.profile || !S.cls) return null;
    const profile = {};
    KEYS.forEach((k) => { if (S.profile[k] !== undefined && S.profile[k] !== "") profile[k] = S.profile[k]; });
    return { cls: S.cls, profile };
  };
  // 墓碑から絵の who を作る（hero が無い古い墓碑は null）
  G.graveWho = (g) => (g && g.hero && g.hero.profile && g.hero.cls && G.heroWho ? G.heroWho(g.hero.profile, g.hero.cls) : null);

  const finish0 = G.finishRun;
  G.finishRun = () => {
    const S = G.S;
    const hero = G.c35GraveHero(S);
    const cb = G.onFinish;
    G.onFinish = () => {
      G.onFinish = cb;
      const g = G.P.graves[0];
      if (g && S && g.id === S.id && hero) g.hero = hero;
      if (cb) cb();
    };
    try { finish0(); } finally { G.onFinish = cb; }
  };
})(globalThis.G = globalThis.G || {});
