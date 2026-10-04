// A10：古い絵柄（canvas の人物・魔物の絵）を出さない。主人公の立ち絵は出さない（持ち主の決定）
// - 主人公：どの職業・性別・種族・年齢でも絵の鍵が無く、描くと枠を空けるだけ。画面（ui.js・setup.js・v9_pc.js）が主人公の絵を描かない。hero_* の画像と一覧の行が無い
// - 人物（名のある人・型・乱数の仲間・出来事の who・施設の人）と、敵・使徒：描くと「生成画像を描く」か「何も描かない（noart の印）」のどちらか。
//   canvas の筆（線・塗り・弧など）が一度も動かない。画像が読めないとき・読み込みのあいだも同じ
// - 表（docs/art/a10_map.md。tools/a10_map.mjs）がある
// - ファイル数：外のファイルの形の画像＋ページが 1 つの版の上限（511）に収まり、hero_* を載せない
import { readFileSync, readdirSync, existsSync } from "node:fs";
import vm from "node:vm";
import { loadArt, realAssets, a10Survey, MAP_PATH, ROOT } from "../../tools/a10_map.mjs";
import { siteAssets } from "../../tools/assets.mjs";

export default ({ fail: failTo, ok, note, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("A10：" + m); };
  const NOTE = note || ((m) => console.log("NOTE " + m));
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");

  // ---------------------------------------------------------------- canvas で描くコードが残っていない
  const people = src("ui/art_people.js"), monsters = src("ui/art_monsters.js"), v4 = src("ui/v4_assets.js"), v6 = src("ui/v6_monsters.js");
  if (/paintPerson|function (face|hairFront|beastEars|backdrop)\b/.test(people)) fail("art_people.js に canvas の人物の絵を描くコードが残っている");
  if (/monsterLook|PRESET|\.bezierCurveTo|\.arc\(/.test(monsters)) fail("art_monsters.js に canvas の魔物の絵を描くコードが残っている");
  if (/draw0|GRACE/.test(v4)) fail("v4_assets.js に canvas の絵へ戻る道が残っている");
  if (/paint0/.test(v6)) fail("v6_monsters.js に canvas の絵へ戻る道が残っている");

  // ---------------------------------------------------------------- 実際の画像の一覧で読む
  const assets = realAssets();
  const G = loadArt(loadEngine(), assets);
  const D = G.data;
  // 筆を数える偽の canvas。clearRect・setTransform・drawImage と、魔物の胸から上の地（fillRect・グラデーション）のほかは「canvas の絵」
  const ALLOWED = new Set(["clearRect", "setTransform", "drawImage", "fillRect", "createLinearGradient", "save", "restore", "getContext"]);
  const rec = () => {
    const calls = [];
    const grad = { addColorStop() {} };
    const ctx = new Proxy({}, {
      get: (t, k) => (k in t ? t[k] : k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => (calls.push(String(k)), grad) : (...a) => calls.push(String(k))),
      set: (t, k, v) => ((t[k] = v), true),
    });
    const cls = new Set();
    const cv = { width: 192, height: 240, getBoundingClientRect: () => ({ width: 96, height: 120 }), getContext: () => ctx, classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) } };
    return { cv, ctx, calls, cls };
  };
  // 画像は「読み終わった」ことにする（読み込みのあいだ・読めないときは下で別に見る）
  const done = (img) => { img.complete = true; img.naturalWidth = img.width = 512; img.naturalHeight = img.height = 640; };
  const ImageReady = class { constructor() { this.ls = {}; done(this); } addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); } set src(v) { this._src = v; } get src() { return this._src; } };
  const G2 = (() => {
    const g = loadEngine();
    g.ASSETS = assets; g.ASSET_MODE = "files";
    const c = vm.createContext({ console, G: g, Image: ImageReady });
    for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v6_monsters.js"]) vm.runInContext(src("ui/" + f), c, { filename: "ui/" + f });
    return g;
  })();
  const canvasArt = (calls) => calls.filter((k) => !ALLOWED.has(k));
  let shown = 0, blank = 0;
  const tryWho = (where, w, g = G2) => {
    const r = rec();
    try { g.drawPortrait(r.cv, w); } catch (e) { return fail(`${where}：描くと例外 ${e.message}`); }
    const extra = canvasArt(r.calls);
    if (extra.length) return fail(`${where}：canvas の絵を描いた（${[...new Set(extra)].join(",")}）`);
    const drew = r.calls.includes("drawImage");
    const art = g.portraitArt(w);
    if (drew && r.cls.has("noart")) fail(`${where}：画像を描いたのに noart の印が付いた`);
    if (!drew && !r.cls.has("noart")) fail(`${where}：絵を描かず、noart の印も付いていない（空の枠が出る）`);
    if (!!art !== drew) fail(`${where}：G.portraitArt（${art}）と描いたもの（${drew ? "画像" : "なし"}）が合わない`);
    drew ? shown++ : blank++;
  };

  // ---------------------------------------------------------------- 主人公
  const beasts = Object.keys(D.BEASTS || {});
  let heroes = 0;
  for (const cls of Object.keys(D.CLASSES)) for (const sex of ["男", "女"]) for (const race of ["human", "elf", ...beasts.map((b) => "beast:" + b)]) for (const age of [9, 24, 45, 70]) {
    const w = G2.heroWho({ name: "テスト", sex, age, race: race.split(":")[0], beast: race.split(":")[1] }, cls);
    heroes++;
    if (G2.v4PortraitKey(w) || G2.portraitArt(w)) fail(`主人公 ${cls}・${sex}・${race}・${age} に絵の鍵がある`);
    tryWho(`主人公 ${cls}・${sex}・${race}`, w);
  }
  if (Object.keys(assets).some((k) => /^portraits\/hero_/.test(k))) fail("assets/portraits/ に主人公の型（hero_*）の画像が残っている");
  const plist = JSON.parse(readFileSync(new URL("../../docs/art/portraits.json", import.meta.url), "utf8")).portraits;
  if (plist.some((p) => p.group === "hero" || /^hero_/.test(p.id))) fail("docs/art/portraits.json に主人公の型（hero）の行が残っている");
  // 画面が主人公の絵を描かない
  const ui = src("ui/ui.js"), setup = src("ui/setup.js"), v9 = src("ui/v9_pc.js");
  if (/drawPortrait\([^)]*heroWho|face\([^)]*heroWho|faceQueue\.push\(\[[^\]]*heroWho|graveWho\(g\)\s*:\s*null;\s*\n\s*if \(who\)/.test(ui)) fail("ui.js が主人公の絵を描いている（シート・左上の札・人物・墓碑）");
  if (/mFace|profFace|"eface"|"gface"|"sface"/.test(ui)) fail("ui.js に主人公の顔の枠（mFace・profFace・eface・gface・sface）が残っている");
  if (/drawPortrait|heroFace|miniFace|csFace/.test(setup)) fail("setup.js（作成の画面）が主人公の絵を描いている");
  if (/add\(G\.heroWho/.test(v9)) fail("v9_pc.js（PC の配置）が戦闘で主人公を立たせている");
  {
    const g = loadEngine();
    g.ASSETS = assets;
    const c = vm.createContext({ console, G: g, Image: ImageReady });
    for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v5_stand.js", "v6_monsters.js", "v9_pc.js"]) vm.runInContext(src("ui/" + f), c, { filename: "ui/" + f });
    g.rand = seeded(7);
    g.newGame({ cls: "merc", stats: Object.fromEntries(D.STATS.map((k) => [k, 40])), caps: Object.fromEntries(D.STATS.map((k) => [k, 70])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    g.S.companions = [g.genCompanion(), g.genCompanion()];
    g.S.combat = { foes: [] };
    const cast = g.v9.castOf(g.S);
    if (cast.some((c) => c.role === "hero" || c.who.kind === "hero")) fail("PC の配置の戦闘で主人公が立つ");
    if (cast.some((c) => !g.portraitArt(c.who))) fail("PC の配置に、絵の無い人が並ぶ");
  }

  // ---------------------------------------------------------------- 人物すべて
  const s = a10Survey(loadArt(loadEngine(), assets), seeded); // 表と同じ調べ方（数を合わせる）
  if (s.hero.length) fail(`主人公に絵が出る：${s.hero.join("、")}`);
  // 型：人の種類 × 性別 × 年頃 × 種族
  for (const kind of Object.keys(G2.PEOPLE)) for (const sex of ["男", "女"]) for (const age of [undefined, 9, 30, 70]) for (const look of [undefined, { ears: "pointy" }, ...beasts.map((b) => ({ ears: "none", beast: b }))]) {
    const w = { kind, sex, age, seed: "a10:" + kind, look };
    tryWho(`型 ${kind}・${sex}・${age || "年齢なし"}・${look ? look.beast || "エルフ" : "人間"}`, w);
    if (kind !== "majin" && !G2.portraitArt(w)) fail(`型 ${kind}・${sex}・${age}・${look ? look.beast || "エルフ" : "人間"} に合う型の絵が無い`);
  }
  // 二枚目の型（もとは主人公の型）：ある種類・性別では、人ごとに一枚目と二枚目に分かれ、同じ人はいつも同じ絵
  for (const k of Object.keys(assets).filter((k) => /^portraits\/kind_[a-z]+_[mf]_b$/.test(k))) {
    const [, kind, sx] = /^portraits\/kind_([a-z]+)_([mf])_b$/.exec(k);
    const got = new Set();
    for (let i = 0; i < 40; i++) {
      const w = { kind, sex: sx === "m" ? "男" : "女", age: 30, seed: "a10:alt:" + i };
      const key = G2.v4PortraitKey(w);
      if (key !== G2.v4PortraitKey(Object.assign({}, w))) fail(`${k}：同じ人なのに絵が変わる`);
      got.add(key);
    }
    if (!got.has(k.slice(10)) || !got.has(`kind_${kind}_${sx}`)) fail(`${k}：二枚目の型が使われていないか、一枚目が出なくなった（${[...got].join("・")}）`);
  }
  // 名のある人
  for (const [id, p] of Object.entries(D.C2_PEOPLE || {})) tryWho(`キャラメモ ${p.name}`, p.who);
  for (const id of Object.keys(G2.V4_NAMED)) { const w = G2.v4Canon(id); if (w) tryWho(`名のある人 ${id}`, w); }
  // 出来事の who（仲間の顔の出来事は仲間で見る）・施設の人
  for (const e of D.EVENTS) {
    const d = Object.getOwnPropertyDescriptor(e, "who");
    if (d && d.get) continue;
    const w = G2.eventWho(e);
    if (w) tryWho(`出来事 ${e.id}`, w);
  }
  for (const id of Object.keys(D.LOCS)) { const w = G2.facWho({ mode: "fac", fac: "castle", loc: id, flags: {} }); if (w) tryWho(`王城の主 ${id}`, w); }
  // 仲間：乱数の仲間と出来事の仲間
  const comps = [];
  const scan = (o) => { if (!o || typeof o !== "object") return; if (o.companion && typeof o.companion === "object") comps.push(o.companion); for (const k of ["ok", "ng", "win"]) scan(o[k]); };
  for (const e of D.EVENTS) for (const c of e.choices || []) scan(c);
  G2.rand = seeded(41);
  G2.newGame({ cls: "thief", stats: Object.fromEntries(D.STATS.map((k) => [k, 40])), caps: Object.fromEntries(D.STATS.map((k) => [k, 70])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  for (let i = 0; i < 120; i++) comps.push(G2.genCompanion());
  for (const c of comps) tryWho(`仲間 ${c.name}`, G2.companionWho(c));
  if (s.comps.none.length) fail(`絵の無い仲間がいる（型が当たらない）：${[...new Set(s.comps.none)].slice(0, 10).join("、")}`);

  // 画像が読めない・読み込みのあいだ：canvas の絵に戻らない
  {
    const w = G.eventWho(D.EVENTS.find((e) => e.id === "donation") || D.EVENTS[0]);
    const r = rec();
    G.drawPortrait(r.cv, w); // loadArt の Image は読み込み待ち
    if (canvasArt(r.calls).length || r.calls.includes("drawImage")) fail("読み込みのあいだに canvas の絵か画像を描いた");
    const key = G.v4PortraitKey(w);
    const img = key && G.v4Image(key);
    if (img) { img.v4bad = true; (img.ls.error || []).forEach((f) => f()); }
    if (!r.cls.has("noart") && key) fail("画像が読めないとき、noart の印を付けて枠を空けていない");
    const r2 = rec();
    G.drawPortrait(r2.cv, w);
    if (canvasArt(r2.calls).length || !r2.cls.has("noart")) fail("読めなかった画像の人を、canvas の絵か空の枠で描いた");
  }

  // ---------------------------------------------------------------- 魔物：敵のすべてと使徒
  const foeIds = [...new Set([...Object.keys(D.ENEMIES), ...Object.keys((D.E3 && D.E3.FOES) || {})])];
  let foeArt = 0, met = 0;
  for (const id of foeIds) {
    const r = rec();
    const e = D.ENEMIES[id] || D.E3.FOES[id];
    try { G2.paintMonster(r.ctx, 200, 300, 160, { id, shape: e.shape, eye: e.eye, boss: !!e.boss }); } catch (err) { fail(`魔物 ${id}：描くと例外 ${err.message}`); continue; }
    const drew = r.calls.includes("drawImage");
    if (!drew && r.calls.length) fail(`魔物 ${id}：画像が無いのに canvas に描いた（${[...new Set(r.calls)].join(",")}）`);
    if (drew !== !!G2.v6ArtKey(id)) fail(`魔物 ${id}：絵の鍵と描いたものが合わない`);
    if (drew) foeArt++;
  }
  // 出現する敵：決まった乱数で遊び、戦った敵がみな上の一覧にいる（一覧の外の敵＝絵の決め方の外）
  {
    const g = loadEngine();
    const seen = new Set();
    const start0 = g.startCombat;
    if (start0) g.startCombat = (...a) => { const r = start0(...a); ((g.S.combat && g.S.combat.foes) || []).forEach((f) => seen.add(f.id)); return r; };
    g.P = { trophies: {}, graves: [], codex: {} };
    for (let n = 0; n < 6; n++) {
      g.rand = seeded(100 + n);
      g.newGame({ cls: Object.keys(D.CLASSES)[n % 5], stats: Object.fromEntries(D.STATS.map((k) => [k, 45])), caps: Object.fromEntries(D.STATS.map((k) => [k, 70])), goal: Object.keys(D.GOALS)[n % Object.keys(D.GOALS).length], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
      if (n % 2 === 0) D.STATS.forEach((k) => { g.S.stats[k] = 80; g.S.caps[k] = 95; });
      for (let t = 0; t < 600 && !g.S.over; t++) {
        if (g.S.combat) (g.S.combat.foes || []).forEach((f) => seen.add(f.id));
        const acts = g.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
        if (!acts.length) break;
        try { g.act(acts[Math.floor(g.rand() * acts.length)].id); } catch (e) { break; }
      }
    }
    const out = [...seen].filter((id) => !foeIds.includes(id) && !(g.data.E3 && g.data.E3.FOES && g.data.E3.FOES[id]));
    if (out.length) fail(`遊んで出た敵が、敵の一覧にも使徒の一覧にもいない：${out.join("、")}`);
    if (!seen.size) NOTE("A10：決まった乱数で遊んでも敵に会わなかった（出現する敵の確かめが空）");
    else met = seen.size;
  }
  if (s.foes.none.length) NOTE(`A10：絵の無い使徒（戦闘で何も描かない。絵ができたら docs/art/monsters.json に）：${s.foes.none.join("・")}`);
  if (s.events.none.length) NOTE(`A10：絵の無い出来事の人（額を出さない）：${s.events.none.length} 件`);

  // ---------------------------------------------------------------- 表とファイル数
  if (!existsSync(MAP_PATH)) fail("docs/art/a10_map.md が無い（node tools/a10_map.mjs）");
  const site = siteAssets(ROOT + "/assets");
  const files = Object.keys(site.files || site.map).length;
  const n = new Set(Object.values(site.map).map((v) => String(v).replace(/#.*$/, ""))).size;
  if (n + 1 > 511) fail(`画像 ${n} ファイル＋ページが、1 つの版の上限 511 を超える`);
  if (readdirSync(new URL("../../assets/portraits/", import.meta.url)).some((f) => f.startsWith("hero_"))) fail("hero_* の画像が公開する画像に入る");
  const dist = new URL("../../dist/site/files.json", import.meta.url);
  if (existsSync(dist) && Object.keys(JSON.parse(readFileSync(dist, "utf8"))).some((k) => /hero_/.test(k))) fail("dist/site/files.json に hero_* が載っている（ビルドし直す）");

  if (!bad) ok(`A10 古い絵を出さない：主人公 ${heroes} 通りは絵なし。人物 ${shown + blank} 通り（画像 ${shown}・絵なし ${blank}）と敵・使徒 ${foeIds.length}（画像 ${foeArt}。遊んで会った敵 ${met} 種はみな一覧の中）で canvas の絵 0。公開する画像 ${n} ファイル＋ページ（上限 511。${files} 鍵）`);
};
