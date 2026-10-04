// V4：持ち主が作った人物の絵（assets/portraits/<id>.webp。tools/assets.mjs）を描く。G.ASSETS["portraits/<id>"] は、
// 外のファイルの形（既定。G.ASSET_MODE "files"）なら HTML の隣の portraits/<id>.webp への相対パス、埋め込み（--embed）なら data URI。どちらも Image の src にそのまま使う。
// 外のファイルの形の表情の差分（<id>_<表情>）は、1 人 1 枚のスプライト（portraits/<id>.moods.svg）の「#xywh=x,y,w,h」の升目を切り出して描く（G.v4Where）。
// 基本の絵も 25 枚ずつのスプライト（portraits/packs/people-<n>.svg・kinds-<n>.svg。A12）の升目で、同じく切り出す（同じファイルは一度だけ読む）。
// 主人公・仲間・話している人と差分は先読みし、名のある人の基本の絵は暇なときに少しずつ読んでおく（v4Preload）。
// art_people.js の入口 G.drawPortrait を包むだけ。画像があればそれを描き、無ければ（読めなければ）絵を出さない（A10：canvas の人物の絵はやめた）。
// 絵を出さない canvas には noart の印が付く（CSS で隠す）。画面の側は G.portraitArt(who) で、絵が出る人かを先に確かめられる。
// どの人にどの画像を使うか（G.v4PortraitKey(who)。表は docs/art/a10_map.md）：
//   主人公 → 立ち絵なし（A10。持ち主の決定）
//   名のある人＝どの冒険でも同じ一人＝一枚。キャラメモの人（who.seed "c2:<id>"）→ portraits/<id>、
//     出来事・施設の人（下の NAMED。出来事の id・seed・仲間の名前で当てる）→ portraits/<id>。画像が無ければ絵なし（型の絵は使わない）
//   型（冒険ごとに乱数で作られる人）→ portraits/kind_<種類>_<m|f>[_elf|_beast[_<獣>]][_b]。種族の型が無ければ人間の型（耳が合わなくてもよい）。
//     _b は二枚目の型（もとは主人公の型。冒険者・ならず者・魔法使い・神官・シェルアークの人）。seed で人ごとに半分ほどが二枚目になる。
//     13 歳未満は child、60 歳以上は elder の型。人の姿の使徒（majin）など、合う型が無ければ絵なし
//   魔物（who.kind "foe"。仲間の魔物・出来事の魔物）→ 魔物の絵（G.v6Sprite。v6_monsters.js）を胸から上に切り取る。無ければ絵なし
// 名のある人は、どの出来事でも同じ顔になるよう、who を一つに固定する（最初の出来事の who。キャラメモの人はそのデータの who）
// 描く物の一覧と、Stable Diffusion に入れる特徴のタグは docs/art/portraits.md（機械で読める形は docs/art/portraits.json）。レーン A（絵）
(function (G) {
  const NAMED = {
    erna: { c2: true, events: ["m3_castle_g"] }, // 鉄の右足の女騎士（キャラメモの人だが、この出来事では seed を持たない）
    chancellor: { seeds: ["fac:garmund:chancellor"] },
    gaston: { events: ["e2_kitchen_pot"], names: ["茹で騎士ガストン"] },
    joachim: { events: ["deserter_help"], names: ["脱走兵ヨアヒム"] },
    mirza: { events: ["mirza", "e3_meet_mirza"] },
    zalve: { events: ["v1_zalve", "e3_meet_zalve", "m11_zalve_1", "m11_zalve_2", "m11_zalve_3", "m11_zalve_4", "m11_zalve_last", "m11_zalve_won", "m11_zalve_no", "m11_zalve_after"] },
    borg: { events: ["v1_borg"] },
    aurelia: { events: ["w1_miracle", "w1_misprayer", "w1_accuse", "e3_meet_aurelia"] },
    yoihime: { events: ["w1_yoidice", "w1_dance", "w1_moonriddle", "w1_kamikakushi", "v1_foxfest", "e3_meet_yoihime", "r2_yoi_rift", "r2_yoi_toll", "r2_yoi_life", "r2_yoi_future", "m11_yoi_1", "m11_yoi_2", "m11_yoi_3", "m11_yoi_4", "m11_yoi_last", "m11_yoi_won", "m11_yoi_no", "m11_yoi_after"] },
    konoha: { events: ["v1_foxdice"] },
    mordu: { events: ["v2_garden"] },
    berna: { events: ["v2_berna", "e2_berna_clinic", "m4_plague_mask"] },
    azlag: { events: ["v2_ride", "e3_meet_azlag"] },
    chezar: { events: ["v1_boardgame", "e3_meet_chezar"] },
    yura: { events: ["v1_yuradream", "e3_meet_yura"] },
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
  // 種族の型（獣ごと → 獣人 → 人間。エルフ → 人間）。最後は人間の型に落とす（耳が合わなくても、canvas の絵よりよい。A10）
  const raceOf = (who) => {
    const lk = who.look || {};
    return lk.beast ? ["_beast_" + lk.beast, "_beast", ""] : lk.ears === "pointy" ? ["_elf", ""] : [""];
  };
  // 型の絵がある人の種類（G.PEOPLE のうち。majin＝人の姿の使徒は型を作らない）
  const KINDS = ["villager", "merchant", "guard", "priest", "noble", "rogue", "child", "elder", "soldier", "knight", "sailor", "mage", "ronin", "host", "beggar", "archer", "adventurer"];
  G.V4_KINDS = KINDS;
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
    if (!who || who.kind === "foe" || who.kind === "hero") return null; // 主人公は立ち絵なし（A10）
    const id = named(who);
    if (id) return has(id) ? id : null; // 名のある人に型の絵は使わない
    const kind = G.v4KindOf(who);
    if (!kind) return null;
    // 二枚目の型（kind_<種類>_<m|f>_b。もとは主人公の型）があれば、人ごとに（seed で）半分ほどをそちらにする
    const alt = altOf(who) ? ["_b", ""] : [""];
    return first(raceOf(who).flatMap((r) => alt.map((x) => `kind_${kind}_${sexOf(who)}${r}${x}`)));
  };
  const altOf = (who) => {
    const t = String(who.seed || "") + "|" + String(who.name || "");
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) | 0;
    return ((h >>> 0) % 2) === 1;
  };
  // 名もない人の型の種類（無ければ null）。年頃で子ども・老人の型に寄せる
  G.v4KindOf = (who) => {
    if (!who || !KINDS.includes(who.kind)) return null;
    const age = Number(who.age) > 0 ? Number(who.age) : G.personLook ? G.personLook(who).age : 0;
    return age > 0 && age < 13 ? "child" : age >= 60 ? "elder" : who.kind;
  };
  // 絵が出る人か（人物の画像の鍵か、魔物の絵の鍵。無ければ null＝絵を出さない）
  G.portraitArt = (who) => {
    if (!who) return null;
    if (who.kind === "foe") return G.v6ArtKey ? G.v6ArtKey(who.foe) : null;
    const k = G.v4PortraitKey(who);
    return k ? "portraits/" + k : null;
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
  // 人の姿の絵の無い使徒（who が majin。出来事の e3 か lore「<使徒>:…」で誰か分かる）は、その使徒の魔物の絵で出す（A10）
  const apostleFoe = (e) => {
    const L = (G.data && G.data.E3 && G.data.E3.LIST) || {};
    const a = L[e.e3] || L[String(e.lore || "").split(":")[0]];
    return a && a.foe ? a.foe : null;
  };
  if (ev0) G.eventWho = (e) => {
    const id = e && BY_SEED["ev:" + e.id];
    const w = id && canon(id);
    if (w) return copy(w);
    const w0 = ev0(e);
    const foe = w0 && w0.kind === "majin" && apostleFoe(e);
    return foe ? { kind: "foe", foe, seed: w0.seed, name: w0.name } : w0;
  };
  if (comp0) G.companionWho = (c) => {
    const name = String((c && c.name) || "");
    if (!(c && c.who)) for (const [id, m] of Object.entries(NAMED)) if ((m.names || []).some((n) => name.includes(n))) { const w = canon(id); if (w) return copy(w); }
    return comp0(c);
  };
  G.v4Canon = canon;

  // ---------------------------------------------------------------- 読む
  const files = () => G.ASSET_MODE === "files";
  const imgs = {}; // 鍵 → Image（一度だけ作る）。スプライトにまとめた差分は、ファイル（src）ごとに一つ（一人の差分みなで一つ）
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
  const slot = (key) => { const w = where(key); return w.rect ? "sprite:" + w.src : key; };
  const image = (key) => {
    const id = slot(key);
    if (imgs[id]) return imgs[id];
    const img = new Image();
    img.v4bad = false;
    img.addEventListener("error", () => { img.v4bad = true; });
    img.src = where(key).src;
    return (imgs[id] = img);
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
    prep(base);
    moods().forEach((m) => { if (has(base + "_" + m)) prep(base + "_" + m); });
  };
  // 読んで、読み終わったら暇なときに白い背景を消しておく（A13。描くときに待たないように。同じ鍵は一度だけ）
  const later = (f) => (typeof requestIdleCallback === "function" ? requestIdleCallback(f, { timeout: 1500 }) : typeof setTimeout === "function" ? setTimeout(f, 50) : f());
  const prep = (key) => {
    const img = image(key);
    if (!G.a13 || !G.a13.cutout || typeof document === "undefined") return;
    const go = () => later(() => { if (ready(img)) G.a13.cutout(key, img, where(key).rect); });
    if (ready(img)) go();
    else img.addEventListener("load", go, { once: true });
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
  // A13：白い背景を消した絵（a13_cutout.js。同じ鍵は一度だけ処理）があればそれを描き、canvas に cut の印を付ける（CSS が覆いを替える）。
  // 画素を読めない（file:// など）ときは元の絵のまま
  const paint = (cv, img, rect, key) => {
    const cut = key && G.a13 && G.a13.cutout ? G.a13.cutout(key, img, rect) : null;
    if (cv.classList && cv.classList.toggle) cv.classList.toggle("cut", !!cut);
    if (cut) { img = cut; rect = null; }
    fit(cv);
    const w = cv.width, h = cv.height;
    const [ox, oy, iw, ih] = rect || [0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height];
    if (!w || !h || !iw || !ih) return false;
    const k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // なめらかに縮めて描く（A14。大きく縮めるときは段階的に）
    if (G.a13 && G.a13.draw) G.a13.draw(ctx, img, ox + (iw - sw) / 2, oy + (ih - sh) * 0.2, sw, sh, 0, 0, w, h);
    else ctx.drawImage(img, ox + (iw - sw) / 2, oy + (ih - sh) * 0.2, sw, sh, 0, 0, w, h);
    return true;
  };
  const blank = (cv) => (G.blankPortrait ? G.blankPortrait(cv) : null);
  const art = (cv) => { if (cv.classList && cv.classList.remove) cv.classList.remove("noart"); };
  // 仲間の魔物・出来事の魔物：魔物の絵（背景を消したもの）を暗い地に、胸から上に切り取って描く
  const paintFoe = (cv, sp) => {
    fit(cv);
    const w = cv.width, h = cv.height, ctx = cv.getContext("2d");
    if (!w || !h) return false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient ? ctx.createLinearGradient(0, 0, 0, h) : null;
    if (g) { g.addColorStop(0, "#4a4a3e"); g.addColorStop(1, "#1e1c18"); ctx.fillStyle = g; } else ctx.fillStyle = "#2a2a24";
    ctx.fillRect(0, 0, w, h);
    const iw = sp.width || sp.naturalWidth || 512, ih = sp.height || sp.naturalHeight || 512;
    const k = (w / iw) * 1.25, sw = w / k, sh = h / k;
    if (G.a13 && G.a13.draw) G.a13.draw(ctx, sp, (iw - sw) / 2, ih * 0.08, sw, sh, 0, 0, w, h);
    else ctx.drawImage(sp, (iw - sw) / 2, ih * 0.08, sw, sh, 0, 0, w, h);
    return true;
  };
  G.drawPortrait = (cv, who) => {
    if (!cv || !who) return;
    const tok = { key: null, done: false };
    if (shown) shown.set(cv, tok);
    const mine = () => !shown || shown.get(cv) === tok;
    if (who.kind === "foe") {
      tok.key = "foe:" + who.foe;
      if (!G.v6Sprite || !G.v6ArtKey || !G.v6ArtKey(who.foe)) return blank(cv);
      const sp = G.v6Sprite(who.foe, () => { if (mine()) G.drawPortrait(cv, who); });
      if (sp && paintFoe(cv, sp)) art(cv);
      else if (!sp) { const ctx = cv.getContext && cv.getContext("2d"); if (ctx && ctx.clearRect) ctx.clearRect(0, 0, cv.width, cv.height); }
      return;
    }
    const key = typeof Image === "function" ? G.v4PortraitKey(who) : null;
    tok.key = key;
    const img = key && image(key);
    if (!img || img.v4bad) return blank(cv); // 画像の無い人・読めない画像：絵を出さない
    const rect = where(key).rect;
    art(cv);
    if (ready(img) && paint(cv, img, rect, key)) return;
    // 読み込みが終わるまでは枠を空けておく（前の人の絵を残さない）。終わったとき、まだ同じ人を描くことになっていれば描く
    if (cv.getContext) {
      const ctx = cv.getContext("2d");
      if (ctx && ctx.clearRect) { ctx.setTransform && ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
    }
    img.addEventListener("load", () => { if (mine() && paint(cv, img, rect, key)) tok.done = true; }, { once: true });
    img.addEventListener("error", () => { if (mine() && !tok.done) { tok.done = true; blank(cv); } }, { once: true });
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
    while (idleList.length && n < 2) { const k = idleList.shift(); if (!imgs[slot(k)]) { image(k); n++; } }
    if (idleList.length) setTimeout(() => idle(trickle), 250);
  }
  const base = ui.render;
  ui.render = (...a) => {
    const S = G.S;
    if (files() && S) {
      try {
        (S.companions || []).forEach((c) => G.companionWho && G.v4Preload(G.companionWho(c)));
        if (G.stand && G.stand.whoOf) G.v4Preload(G.stand.whoOf(S));
        if (!idleOn) { idleOn = true; setTimeout(() => idle(trickle), 3000); }
      } catch (e) { /* 先読みに失敗しても画面は止めない */ }
    }
    return base(...a);
  };
})(globalThis.G = globalThis.G || {});
