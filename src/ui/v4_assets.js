// V4：持ち主が作った人物の絵（assets/portraits/<id>.webp。tools/assets.mjs）を描く。G.ASSETS["portraits/<id>"] は、
// 外のファイルの形（既定。G.ASSET_MODE "files"）なら HTML の隣の portraits/<id>.webp への相対パス、埋め込み（--embed）なら data URI。どちらも Image の src にそのまま使う。
// 外のファイルの形の表情の差分（<id>_<表情>）は、1 人 1 枚のスプライト（portraits/<id>.moods.svg）の「#xywh=x,y,w,h」の升目を切り出して描く（G.v4Where）。
// 外のファイルは読み終わるまで少し待ってから canvas の絵を出し（すぐ読めればちらつかない）、読めたら画像に差し替える。主人公・仲間・話している人と差分は先読みし、
// 名のある人の基本の絵は暇なときに少しずつ読んでおく（v4Preload）。
// art_people.js の入口 G.drawPortrait を包むだけ。画像があればそれを描き、無ければ（または読めなければ）今の canvas の絵に戻す。
// どの人にどの画像を使うか（G.v4PortraitKey(who)）：
//   名のある人＝どの冒険でも同じ一人＝一枚。キャラメモの人（who.seed "c2:<id>"）→ portraits/<id>、
//     出来事・施設の人（下の NAMED。出来事の id・seed・仲間の名前で当てる）→ portraits/<id>
//   型（冒険ごとに乱数で作られる人）。性別・種族が合うもののうち、獣・年齢が一番近いもの。人間の型しか無ければエルフ・獣人は今の絵
//     主人公 → portraits/hero_<職業>_<m|f>[_elf|_beast[_<獣>]][_mid|_old]
//     名もない人（仲間・出来事の町の人）→ portraits/kind_<種類>_<m|f>[_elf|_beast[_<獣>]]（13 歳未満は child、60 歳以上は elder の型）
// 名のある人は、どの出来事でも同じ顔になるよう、canvas の絵の who も一つに固定する（最初の出来事の who。キャラメモの人はそのデータの who）
// 描く物の一覧と、Stable Diffusion に入れる特徴のタグは docs/art/portraits.md（機械で読める形は docs/art/portraits.json）。レーン A（絵）
(function (G) {
  const NAMED = {
    erna: { c2: true, events: ["m3_castle_g"] }, // 鉄の右足の女騎士（キャラメモの人だが、この出来事では seed を持たない）
    chancellor: { seeds: ["fac:garmund:chancellor"] },
    gaston: { events: ["e2_kitchen_pot"], names: ["茹で騎士ガストン"] },
    joachim: { events: ["deserter_help"], names: ["脱走兵ヨアヒム"] },
    mirza: { events: ["mirza"] },
    zalve: { events: ["v1_zalve", "m11_zalve_1", "m11_zalve_2", "m11_zalve_3", "m11_zalve_4", "m11_zalve_last", "m11_zalve_won", "m11_zalve_no", "m11_zalve_after"] },
    borg: { events: ["v1_borg"] },
    aurelia: { events: ["w1_miracle", "w1_misprayer", "w1_accuse"] },
    yoihime: { events: ["w1_yoidice", "w1_dance", "w1_moonriddle", "w1_kamikakushi", "v1_foxfest", "m11_yoi_1", "m11_yoi_2", "m11_yoi_3", "m11_yoi_4", "m11_yoi_last", "m11_yoi_won", "m11_yoi_no", "m11_yoi_after"] },
    konoha: { events: ["v1_foxdice"] },
    mordu: { events: ["v2_garden"] },
    berna: { events: ["v2_berna", "e2_berna_clinic", "m4_plague_mask"] },
    azlag: { events: ["v2_ride"] },
    chezar: { events: ["v1_boardgame"] },
    yura: { events: ["v1_yuradream"] },
    walker: { seeds: ["d6:walker"] },
    captain_east: { events: ["m6_wall_captain", "m6_wall_sea", "m6_wall"] },
    hans: { events: ["r1_elf_ledger"] },
    greta: { events: ["r1_beast_molt"] },
    gert: { events: ["r1_elf_grandfather"] },
    albert: { events: ["r1_church_door"] },
    dominik: { events: ["r1_beast_meat"] },
    neumann: { events: ["r1_nose_ring"] },
  };
  G.V4_NAMED = NAMED;
  const BY_SEED = {};
  for (const [id, m] of Object.entries(NAMED)) {
    (m.seeds || []).forEach((s) => (BY_SEED[s] = id));
    (m.events || []).forEach((e) => (BY_SEED["ev:" + e] = id));
  }

  const A = () => G.ASSETS || {};
  const has = (id) => !!A()["portraits/" + id];
  const sexOf = (who) => {
    const s = who.sex === "男" || who.sex === "女" ? who.sex : G.personLook ? G.personLook(who).sex : "男";
    return s === "女" ? "f" : "m";
  };
  const raceOf = (who) => {
    const lk = who.look || {};
    return lk.beast ? ["_beast_" + lk.beast, "_beast"] : lk.ears === "pointy" ? ["_elf"] : [""];
  };
  const first = (list) => list.find(has) || null;
  const named = (who) => {
    const seed = String(who.seed || "");
    if (seed.startsWith("c2:")) return seed.slice(3);
    if (seed.startsWith("v4:")) return seed.slice(3);
    if (BY_SEED[seed]) return BY_SEED[seed];
    for (const [id, m] of Object.entries(NAMED)) if ((m.names || []).some((n) => seed.includes(n))) return id;
    return null;
  };

  G.v4PortraitKey = (who) => {
    if (!who || who.kind === "foe") return null;
    if (who.kind === "hero") {
      const age = Number(who.age) || 24;
      const bands = age >= 60 ? ["_old", "_mid", ""] : age >= 38 ? ["_mid", "", "_old"] : ["", "_mid", "_old"];
      const base = `hero_${who.cls || "merc"}_${sexOf(who)}`;
      return first(raceOf(who).flatMap((r) => bands.map((x) => base + r + x)));
    }
    const id = named(who);
    if (id) return has(id) ? id : null; // 名のある人に型の絵は使わない
    if (!who.kind || who.kind === "majin") return null;
    const age = Number(who.age) || 0;
    const kind = age > 0 && age < 13 ? "child" : age >= 60 ? "elder" : who.kind;
    return first(raceOf(who).map((r) => `kind_${kind}_${sexOf(who)}${r}`));
  };

  // 名のある人の who を一つに固定する（出来事ごとに seed が違うと、canvas の絵の顔が出来事ごとに変わるため）
  const fixed = {};
  const ev0 = G.eventWho, comp0 = G.companionWho;
  const canon = (id) => {
    if (fixed[id]) return fixed[id];
    const m = NAMED[id], D = G.data || {};
    let w = null;
    if (m.c2 && D.C2_PEOPLE && D.C2_PEOPLE[id]) w = D.C2_PEOPLE[id].who;
    else if (ev0 && m.events && D.EVENTS) { const e = D.EVENTS.find((x) => x.id === m.events[0]); w = e && ev0(e); }
    if (!w) return null;
    w = JSON.parse(JSON.stringify(w));
    if (!String(w.seed || "").startsWith("c2:")) w.seed = "v4:" + id;
    return (fixed[id] = w);
  };
  const copy = (w) => JSON.parse(JSON.stringify(w));
  if (ev0) G.eventWho = (e) => {
    const id = e && BY_SEED["ev:" + e.id];
    const w = id && canon(id);
    return w ? copy(w) : ev0(e);
  };
  if (comp0) G.companionWho = (c) => {
    const name = String((c && c.name) || "");
    if (!(c && c.who)) for (const [id, m] of Object.entries(NAMED)) if ((m.names || []).some((n) => name.includes(n))) { const w = canon(id); if (w) return copy(w); }
    return comp0(c);
  };
  G.v4Canon = canon;

  // ---------------------------------------------------------------- 読む
  const files = () => G.ASSET_MODE === "files";
  const GRACE = 160; // 外のファイルの読み込みを待つ長さ（ミリ秒）。これを過ぎたら canvas の絵を出しておく
  const imgs = {}; // ファイル（src）→ Image（一度だけ作る。スプライトは一人の差分みなで一つ）
  const shown = typeof WeakMap === "function" ? new WeakMap() : null; // canvas → 今描くはずのもの（{ key, done }）
  // 鍵の値 → { src, rect }。外のファイルの形の差分は 1 人 1 枚のスプライト（portraits/<id>.moods.svg）にまとめてあり、
  // 値は「公開パス#xywh=x,y,w,h」（tools/assets.mjs）。rect はそこから切り出す場所（まとめていなければ null＝絵の全体）
  const SPRITE = /#xywh=(\d+),(\d+),(\d+),(\d+)$/;
  const where = (key) => {
    const v = String(A()["portraits/" + key] || "");
    const m = SPRITE.exec(v);
    return m ? { src: v.slice(0, m.index), rect: m.slice(1, 5).map(Number) } : { src: v, rect: null };
  };
  G.v4Where = (key) => (key && has(key) ? where(key) : null);
  const image = (key) => {
    const src = where(key).src;
    if (imgs[src]) return imgs[src];
    const img = new Image();
    img.v4bad = false;
    img.addEventListener("error", () => { img.v4bad = true; });
    img.src = src;
    return (imgs[src] = img);
  };
  const ready = (img) => !!(img && !img.v4bad && img.complete && (img.naturalWidth || img.width));
  G.v4Image = (key) => (key && has(key) && typeof Image === "function" ? image(key) : null);
  G.v4Ready = (key) => ready(G.v4Image(key));
  // その人の絵と、表情の差分（V8・V11。G.MOODS）を読み始める（スプライトにまとめた差分は一つのファイルなので一度だけ読む）
  const moods = () => G.MOODS || ["joy", "anger", "sorrow", "fun"];
  G.v4Preload = (who) => {
    if (!who || typeof Image !== "function") return;
    const base = G.v4PortraitKey(who.mood ? Object.assign({}, who, { mood: undefined }) : who);
    if (!base) return;
    image(base);
    moods().forEach((m) => { if (has(base + "_" + m)) image(base + "_" + m); });
  };

  // ---------------------------------------------------------------- 描く
  const fit = (cv) => {
    const rect = cv.getBoundingClientRect ? cv.getBoundingClientRect() : { width: 0, height: 0 };
    const dpr = Math.min(2, (typeof devicePixelRatio === "number" && devicePixelRatio) || 1);
    if (rect.width > 0 && rect.height > 0) {
      const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
      if (cv.width !== w) cv.width = w;
      if (cv.height !== h) cv.height = h;
    }
  };
  // 枠いっぱいに切り取って描く（横は真ん中、縦は顔が切れないように上寄せ）。rect があればスプライトのその升目だけを絵の全体とみなす
  const paint = (cv, img, rect) => {
    fit(cv);
    const w = cv.width, h = cv.height;
    const [ox, oy, iw, ih] = rect || [0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height];
    if (!w || !h || !iw || !ih) return false;
    const k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, ox + (iw - sw) / 2, oy + (ih - sh) * 0.2, sw, sh, 0, 0, w, h);
    return true;
  };
  const draw0 = G.drawPortrait;
  if (draw0) G.drawPortrait = (cv, who) => {
    if (!cv || !who) return;
    const key = typeof Image === "function" ? G.v4PortraitKey(who) : null;
    const tok = { key, done: false };
    if (shown) shown.set(cv, tok);
    const img = key && image(key);
    if (!img || img.v4bad) return draw0(cv, who);
    const rect = where(key).rect;
    if (ready(img) && paint(cv, img, rect)) return;
    const mine = () => !shown || shown.get(cv) === tok;
    // 読み込みが終わるまでは今の絵。終わったとき、まだ同じ人を描くことになっていれば差し替える
    // 外のファイルは少し待ってから今の絵を出す（そのあいだは前の人の絵を残さないよう消しておく）
    if (files() && typeof setTimeout === "function" && cv.getContext) {
      const ctx = cv.getContext("2d");
      if (ctx && ctx.clearRect) { ctx.setTransform && ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
      setTimeout(() => { if (mine() && !tok.done) draw0(cv, who); }, GRACE);
    } else draw0(cv, who);
    img.addEventListener("load", () => { if (mine() && paint(cv, img, rect)) tok.done = true; }, { once: true });
    img.addEventListener("error", () => { if (mine() && !tok.done) { tok.done = true; draw0(cv, who); } }, { once: true });
  };

  // ---------------------------------------------------------------- 先読み（外のファイルの形・画面があるときだけ）
  if (typeof document === "undefined" || typeof window === "undefined" || typeof Image !== "function") return;
  const ui = G.ui;
  if (!ui || !ui.render) return;
  // 名のある人・型の基本の絵（差分と主人公の型は除く）を、暇なときに 2 枚ずつ読む
  let idleList = null, idleOn = false;
  const idle = (f) => (window.requestIdleCallback ? window.requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 400));
  function trickle() {
    if (!idleList) idleList = Object.keys(A()).filter((k) => k.startsWith("portraits/") && !/^portraits\/hero_/.test(k) && !new RegExp(`_(${moods().join("|")})$`).test(k)).map((k) => k.slice(10));
    let n = 0;
    while (idleList.length && n < 2) { const k = idleList.shift(); if (!imgs[where(k).src]) { image(k); n++; } }
    if (idleList.length) setTimeout(() => idle(trickle), 250);
  }
  const base = ui.render;
  ui.render = (...a) => {
    const S = G.S;
    if (files() && S) {
      try {
        if (G.heroWho && S.profile) G.v4Preload(G.heroWho(S.profile, S.cls));
        (S.companions || []).forEach((c) => G.companionWho && G.v4Preload(G.companionWho(c)));
        if (G.stand && G.stand.whoOf) G.v4Preload(G.stand.whoOf(S));
        if (!idleOn) { idleOn = true; setTimeout(() => idle(trickle), 3000); }
      } catch (e) { /* 先読みに失敗しても画面は止めない */ }
    }
    return base(...a);
  };
})(globalThis.G = globalThis.G || {});
