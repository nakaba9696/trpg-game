// S6：場面をもっと細かく分けて曲を選ぶ（町の時間帯・町の性格・地方の旅・ボスの性格・使徒ごと）。曲と表は src/data/s6_tracks*.js（D.BGM.ROUTES・D.BGM.S6）。
// 場面の名前は「元の場面@分け方」（例：town@dusk・road@north・apostle@kurobane）。表に曲が無い分け方は、元の場面の曲に戻る。
// 元の場面の決め方（src/ui/sound_bgm.js の G.sound.bgmScene）を包むだけで、鳴らし方・音量・切り替えはそのまま。
// 場面の名前が変われば曲も変わる（夕方になった・別の地方に入った・別の使徒と戦う）。DOM・音なしで動く（テストはこれを見る）。
// ページの中の Web Audio だけで鳴らし、パソコンの音量・ほかのアプリには触れない（sound_bgm.js の決まりのまま）。レーン S（音）
(function (G) {
  const snd = (G.sound = G.sound || {});
  const BGM = () => (G.data && G.data.BGM) || { TRACKS: {}, SCENES: {} };
  const routes = () => BGM().ROUTES || {};
  const S6 = () => BGM().S6 || {};
  const has = (k) => (routes()[k] || []).some((id) => BGM().TRACKS[id]);
  const baseOf = (scene) => String(scene || "").split("@")[0];
  snd.bgmBase = baseOf;

  // 戦っている相手から分け方を決める：使徒は使徒ごと（長編の決戦は長編の曲）、強敵は性格（かっこいい・不気味・獣）
  function foeVariant(S, base) {
    const D = G.data || {}, T = S6();
    const foes = (S.combat && S.combat.foes) || [];
    if (base === "apostle") {
      for (const f of foes) {
        if (f.e7 && f.e7.kind === "final" && has("apostle@saga_" + f.e7.id)) return "saga_" + f.e7.id;
      }
      for (const f of foes) {
        const a = G.e3Of ? G.e3Of(f.id) : null;
        const id = (a && a.id) || (T.APOSTLE_FOE || {})[f.id];
        if (id && has("apostle@" + id)) return id;
      }
      return null;
    }
    if (base === "boss") {
      const E = D.ENEMIES || {};
      // いちばん手ごわい相手で決める
      const top = foes.map((f) => ({ f, e: E[f.id] || {} })).filter((x) => x.e.boss || x.e.tier >= 5).sort((a, b) => (b.e.tier || 0) - (a.e.tier || 0))[0];
      if (!top) return null;
      const own = (T.BOSS_FOE || {})[top.f.id];
      if (own && has("boss@" + own)) return own;
      const style = (T.BOSS_STYLE || {})[top.f.id] || (top.e.undead || top.e.magic ? "eerie" : top.e.shape === "beast" || top.e.beast ? "beast" : "cool");
      return has("boss@" + style) ? style : null;
    }
    return null;
  }
  // 町：朝・夕は時間帯の曲、昼は町の性格（港・村・聖地・北）、夜は小さな町や聖地なら静かな夜の曲
  function placeVariant(S, base) {
    const D = G.data || {}, T = S6();
    const L = (D.LOCS || {})[S.loc] || {};
    if (base === "town") {
      if (S.phase === 2 && has("town@dusk")) return "dusk";
      if (S.phase === 0 && has("town@morning")) return "morning";
      const v = (T.TOWN_LOC || {})[S.loc] || (T.TOWN_REGION || {})[L.region];
      return v && has("town@" + v) ? v : null;
    }
    if (base === "town_night") {
      if (S.mode === "fac" && S.fac === "alley") return null;
      const v = (T.NIGHT_LOC || {})[S.loc] || (T.NIGHT_REGION || {})[L.region];
      return v && has("town_night@" + v) ? v : null;
    }
    if (base === "road") {
      const v = (T.ROAD_LOC || {})[S.loc] || (T.ROAD_REGION || {})[L.region];
      return v && has("road@" + v) ? v : null;
    }
    return null;
  }
  snd.bgmVariant = (S, base) => {
    if (!S || S.over) return null;
    try {
      return base === "apostle" || base === "boss" ? foeVariant(S, base) : placeVariant(S, base);
    } catch { return null; }
  };

  // 元の場面の決め方を包む（何度読まれても二重に包まない）
  const scene0 = snd.bgmScene;
  if (scene0 && !scene0._s6) {
    snd.bgmScene = (S, view) => {
      const b = scene0(S, view);
      const v = snd.bgmVariant(S, b);
      return v ? b + "@" + v : b;
    };
    snd.bgmScene._s6 = true;
    snd.bgmScene._base = scene0;
  }
  // 場面 → 曲：分けた場面は ROUTES の曲（二つ以上なら入るたびに順に）、無ければ元の場面の曲
  const track0 = snd.bgmTrackFor;
  const turn = {};
  if (track0 && !track0._s6) {
    snd.bgmTrackFor = (scene, advance) => {
      if (String(scene || "").includes("@")) {
        const list = (routes()[scene] || []).filter((id) => BGM().TRACKS[id]);
        if (list.length) {
          const i = turn[scene] || 0;
          if (advance) turn[scene] = i + 1;
          return list[i % list.length];
        }
        return track0(baseOf(scene), advance);
      }
      return track0(scene, advance);
    };
    snd.bgmTrackFor._s6 = true;
  }
  // 持ち主の曲のファイル（assets/music/）は、曲の id か元の場面の名前で探す
  const key0 = snd.musicKey;
  if (key0 && !key0._s6) {
    snd.musicKey = (scene, id, assets) => key0(baseOf(scene), id, assets);
    snd.musicKey._s6 = true;
  }
})(globalThis.G = globalThis.G || {});
