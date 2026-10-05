// S4：戦闘が始まった瞬間の短い演出（持ち主の声「戦闘が始まったら、モンスターの咆哮なり SE なりで戦闘開始が分かるようにして」）
//   ・画面の上に見出し「敵が現れた」（不意を突いた・強敵・使徒は言葉と色を変える）と敵の名前を 1.5〜2.5 秒
//   ・画面がわずかに揺れ、縁が戦闘の色に一瞬光る（不意打ち・ボス・使徒では強く）。枠の色そのものは U14（zu14_scenes）が戦闘の色にする
//   ・音（開始の合図と敵の咆哮）は sound.js が同じ描き直しで鳴らし、BGM は sound_bgm.js が戦闘の曲へ切り替える
// 強さの決め方は G.sound.encounterOf（DOM なしで動く）。prefers-reduced-motion では揺れと光を止め、見出しだけ出す。
// G.ui.render を包むだけ（名前の zs4 で ui.js より後に読まれる）。見た目は ui/zs4_encounter.css。レーン S（音）
(function (G) {
  const ENC = (G.s4enc = G.s4enc || {});
  // 強さ → 見出しの言葉
  ENC.TITLE = { normal: "敵が現れた", ambush: "不意を突いた", boss: "強敵が立ちはだかる", majin: "使徒" };
  // 見出しの中身（DOM なし。テストも使う）：{ level, title, names（2 人まで＋「ほか n」）, ms（出しておく時間） }
  ENC.cardOf = (S) => {
    if (!S || !S.combat || !G.sound || !G.sound.encounterOf) return null;
    const en = G.sound.encounterOf(S);
    const n = en.names.length;
    return { level: en.level, title: ENC.TITLE[en.level], names: en.names.slice(0, 2).join("・") + (n > 2 ? ` ほか ${n - 2}` : ""), ms: en.level === "normal" ? 1500 : 2400 };
  };

  if (typeof document === "undefined" || typeof window === "undefined" || !G.ui || !G.ui.render) return;
  const calm = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const card = document.createElement("div");
  card.id = "s4enc";
  card.hidden = true;
  card.setAttribute("role", "status");
  const tTitle = document.createElement("span"); tTitle.className = "s4enc-title";
  const tNames = document.createElement("b"); tNames.className = "s4enc-names";
  card.append(tTitle, tNames);
  const flash = document.createElement("div");
  flash.id = "s4flash";
  flash.setAttribute("aria-hidden", "true");
  document.body.append(flash, card);

  let was = null, timer = 0, shakeT = 0;
  function show(S) {
    const c = ENC.cardOf(S);
    if (!c) return;
    clearTimeout(timer); clearTimeout(shakeT);
    card.dataset.level = c.level; flash.dataset.level = c.level;
    tTitle.textContent = c.title; tNames.textContent = c.names;
    card.hidden = false;
    card.classList.remove("on"); void card.offsetWidth; card.classList.add("on");
    if (!calm()) {
      const play = document.getElementById("play") || document.body;
      play.classList.remove("s4shake"); flash.classList.remove("on"); void flash.offsetWidth;
      play.dataset.s4lv = c.level; play.classList.add("s4shake"); flash.classList.add("on");
      shakeT = setTimeout(() => { play.classList.remove("s4shake"); flash.classList.remove("on"); }, 900);
    }
    timer = setTimeout(hide, c.ms);
  }
  function hide() { card.classList.remove("on"); timer = setTimeout(() => { card.hidden = true; }, 400); }
  card.addEventListener("click", hide);

  const base = G.ui.render;
  G.ui.render = (...a) => {
    const r = base(...a);
    try {
      const S = G.S;
      const now = { run: S && S.id, combat: !!(S && S.combat) };
      // 同じ冒険の中で、戦闘でなかったのが戦闘になったときだけ（読み込んだ直後は出さない）
      if (was && now.combat && !was.combat && was.run === now.run) show(S);
      if (!now.combat && !card.hidden) hide();
      was = now;
    } catch {}
    return r;
  };
})(globalThis.G = globalThis.G || {});
