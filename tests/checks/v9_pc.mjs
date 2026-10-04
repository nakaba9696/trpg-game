// V9：PC 向けの画面（src/ui/v9_pc.js・src/ui/v9_pc.css）。DOM なしで確かめられる範囲
// - PC の配置にする大きさ（1280×800・1920×1080 は PC、スマホは今のまま）
// - 文章の窓の 1 行が 35〜40 字。窓・立ち絵・戦闘の魔物の場所が画面に収まり、重ならない
// - 立ち絵：話している人が前で明るく、仲間は後ろで暗い。最大 3 人。同じ人は一度だけ。戦闘は仲間だけ（主人公は出さない。A10）。絵の無い人は並べない
// - 立ち絵は V5 の入口（G.stand.whoOf・sig・big・nameOf）で人を決め、G.drawPortrait で描く（V8 の表情の差し替えがそのまま効く）
// - キー 1〜9・用語の切り出し・演出の決まり・魔物の並べ方（fx.js と同じ）
// - 見た目（v9_pc.css）がビルドに入り、明暗・動きを減らす設定がある
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, ok, loadEngine }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("V9：" + m); };
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const D = G.data;
  const vmc = vm.createContext({ console, G, Image: class { addEventListener() {} } });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v5_stand.js", "v9_pc.js"]) vm.runInContext(src("ui/" + f), vmc, { filename: "ui/" + f });
  const v9 = G.v9;
  const need = ["isPC", "layout", "castOf", "placeCast", "foeSpot", "keyIndex", "terms", "splitTerms", "tipText", "sceneSig", "moment"];
  if (!v9 || need.some((k) => typeof v9[k] !== "function")) return fail("G.v9 の入口が足りない（" + need.filter((k) => !v9 || typeof v9[k] !== "function").join("・") + "）");

  // ---- PC かどうか
  for (const [w, h, want] of [[1280, 800, true], [1920, 1080, true], [1440, 900, true], [1024, 768, true], [390, 844, false], [844, 390, false], [880, 1000, false], [1200, 500, false]])
    if (v9.isPC(w, h) !== want) fail(`${w}×${h} を ${want ? "PC" : "スマホ"}の配置にしていない`);

  // ---- 配置
  const inside = (r, vw, vh) => r && r.x >= 0 && r.y >= 0 && r.x + r.w <= vw + 0.5 && r.y + r.h <= vh + 0.5 && r.w > 0 && r.h > 0;
  for (const [vw, vh] of [[1280, 800], [1920, 1080], [1440, 900], [1024, 768], [2560, 1440]]) {
    const L = v9.layout(vw, vh, false);
    const per = (L.tome.w - v9.PAD * 2 - 10) / L.fs;
    if (L.chars < 35 || L.chars > 40 || per < 35 || per > 40.5) fail(`${vw}×${vh}：文章の窓の 1 行が ${per.toFixed(1)} 字（35〜40 字にしたい）`);
    if (L.fs < 16) fail(`${vw}×${vh}：文章の字が小さい（${L.fs}px）`);
    if (!inside(L.tome, vw, vh)) fail(`${vw}×${vh}：文章の窓が画面からはみ出す`);
    if (L.tome.y < L.head) fail(`${vw}×${vh}：文章の窓が見出しの帯に掛かる`);
    if (!(L.cast.w > vw * 0.3) || L.cast.x + L.cast.w > L.tome.x) fail(`${vw}×${vh}：立ち絵の場所が狭いか、文章の窓に重なる`);
    if (L.tome.x + L.tome.w / 2 < vw / 2) fail(`${vw}×${vh}：文章の窓が右〜中央にない`);
    const C = v9.layout(vw, vh, true);
    if (!C.stage || !inside(C.tome, vw, vh)) { fail(`${vw}×${vh}：戦闘の配置が無いか、下の帯がはみ出す`); continue; }
    if (C.tome.y + C.tome.h < vh - C.m - 1 || C.tome.w < vw * 0.8) fail(`${vw}×${vh}：戦闘の文章と行動が下の帯になっていない`);
    if (C.stage.x < vw * 0.2 || C.stage.x + C.stage.w > vw || C.stage.y < C.head) fail(`${vw}×${vh}：魔物の場所が中央〜右にない`);
    if (C.stage.h < (vh - C.head) * 0.45) fail(`${vw}×${vh}：魔物の場所が低い（大きく描けない）`);
    if (C.cast.x + C.cast.w > C.stage.x || C.cast.y + C.cast.h > C.tome.y) fail(`${vw}×${vh}：戦闘の味方の場所が魔物か下の帯に重なる`);
  }

  // ---- 立ち絵の顔ぶれ
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  if (!ev("c2_nora")) return fail("確かめに使う出来事 c2_nora が無い");
  G.ASSETS = { "portraits/nora": "data:image/webp;base64,AA==", "portraits/sheila": "data:image/webp;base64,AA==", "portraits/kind_adventurer_m": "data:image/webp;base64,AA==", "portraits/kind_adventurer_f": "data:image/webp;base64,AA==", "portraits/kind_priest_m": "data:image/webp;base64,AA==", "portraits/kind_priest_f": "data:image/webp;base64,AA==" };
  const sheila = { name: "シェイラ", who: D.C2_PEOPLE.sheila.who, desc: "" };
  const S = { mode: "event", event: "c2_nora", flags: {}, profile: { name: "テスト", sex: "男", age: 24 }, cls: "merc", companions: [sheila, { name: "傭兵のロタール", desc: "" }, { name: "僧侶のアンナ", desc: "" }, { name: "盗賊のカイ", desc: "" }] };
  const list = v9.castOf(S);
  if (list.length !== v9.MAX_CAST || v9.MAX_CAST > 3) fail(`立ち絵が最大 3 人になっていない（${list.length}）`);
  if (!list[0] || list[0].role !== "speaker" || list[0].key !== G.stand.sig(G.stand.whoOf(S))) fail("話している人（V5 の whoOf）が先頭にいない");
  if (!list[0] || !list[0].big) fail("画像のある人（ノラミ）が大きな立ち絵にならない（V5 の big）");
  if (!list[1] || list[1].role !== "ally" || !list[1].big) fail("仲間（シェイラ）が後ろに並ばない");
  if (new Set(list.map((c) => c.key)).size !== list.length) fail("同じ人が二度並ぶ");
  const twice = v9.castOf({ ...S, companions: [{ name: "ノラミ", who: G.stand.whoOf(S) }, sheila] });
  if (twice.length !== 2) fail("話している人が仲間でもあるとき、二度並ぶ");
  const fight = v9.castOf({ ...S, mode: "combat", combat: { foes: [] } });
  if (!fight[0] || fight.some((c) => c.role === "hero" || c.role === "speaker")) fail("戦闘で主人公か、話している人を出している（A10：戦闘は仲間だけ）");
  if (v9.castOf({ ...S, companions: [{ name: "盗賊のカイ", desc: "" }] }).some((c) => c.role === "ally")) fail("絵の無い仲間（型の絵が無い）を並べている");
  if (v9.castOf({ mode: "explore", flags: {}, companions: [] }).length) fail("誰もいないのに立ち絵を出している");
  if (v9.castOf(null).length) fail("状態が無いのに立ち絵を出している");
  G.ASSETS = {};

  // ---- 立ち絵の置き場所：前の人は明るく前に、後ろの人は暗く小さく。場所の中に収まる
  for (const combat of [false, true]) {
    const L = v9.layout(1280, 800, combat);
    const ps = v9.placeCast(L, combat ? fight : list);
    const f = ps[0], back = ps.slice(1);
    if (!f || !f.front || f.dim !== 0) fail(`${combat ? "戦闘の先頭の仲間" : "話している人"}が前に出て明るくなっていない`);
    if (back.some((p) => p.front || !(p.dim > 0) || p.h > f.h || p.z >= f.z)) fail(`${combat ? "戦闘の仲間" : "仲間"}が後ろで暗く小さくなっていない`);
    if (ps.some((p) => p.x < 0 || p.x > L.cast.w || p.h > L.cast.h || p.h * 0.8 > L.cast.w)) fail(`${combat ? "戦闘" : "出来事"}の立ち絵が場所からはみ出す`);
    if (combat && f.h > L.cast.h) fail("戦闘の味方が大きすぎる");
  }
  const ally = v9.placeCast(v9.layout(1920, 1080, false), list.slice(1).map((c) => ({ ...c, role: "ally" })));
  if (ally.some((p) => p.front || !(p.dim > 0))) fail("話している人がいないとき、仲間が前に出ている");

  // ---- 魔物の並べ方（scene.js・scene_v2.js・fx.js と同じ）
  const fxSrc = src("ui/fx.js");
  if (!/0\.22 \+ \(0\.56 \* i\) \/ Math\.max\(1, n - 1\)/.test(fxSrc) || !/boss \? 0\.78 : 0\.58\) \* \(n > 2 \? 0\.85 : 1\)/.test(fxSrc)) fail("fx.js の魔物の並べ方が変わった（v9 の foeSpot も合わせる）");
  const one = v9.foeSpot(0, 1, false, 1000, 400), three = v9.foeSpot(2, 3, true, 1000, 400);
  if (one.x !== 500 || one.base !== 388 || Math.abs(one.s - 232) > 0.01) fail("魔物一体の並べ方が fx.js と違う");
  if (Math.abs(three.x - 780) > 0.01 || Math.abs(three.s - 400 * 0.78 * 0.85) > 0.01) fail("魔物三体の並べ方が fx.js と違う");

  // ---- キー
  if (v9.keyIndex("1") !== 0 || v9.keyIndex("9") !== 8 || v9.keyIndex("0") !== null || v9.keyIndex("a") !== null || v9.keyIndex("10") !== null) fail("1〜9 のキーの読み方が変");

  // ---- 用語
  const terms = v9.terms([["a", [["冒険者ギルド", "本部はブランデール。仕事は四つ。"], ["ギルド", "組合。"], ["格", "一字の語は当てない。"], null]]]);
  if (terms[0][0] !== "冒険者ギルド" || terms.some(([k]) => k === "格")) fail("用語が長い順になっていないか、一字の語を拾っている");
  if (terms[0][1] !== "本部はブランデール。") fail("用語の説明が最初の一文になっていない");
  if (v9.tipText("あ".repeat(100)).length > 64) fail("用語の説明が長すぎる");
  const text = "冒険者ギルドの前で、冒険者ギルドの話をする。ギルドは遠い。";
  const parts = v9.splitTerms(text, terms);
  if (parts.map((p) => (typeof p === "string" ? p : p.term)).join("") !== text) fail("用語を切り出すと文が変わる");
  const hits = parts.filter((p) => typeof p !== "string").map((p) => p.term);
  if (hits.join("・") !== "冒険者ギルド・ギルド") fail(`用語の当て方が変（${hits.join("・")}。同じ語は一度だけ、長い語を先に）`);
  {
    const G2 = loadEngine();
    G2.P = { trophies: {}, graves: [] };
    const st = {}, cp = {};
    G2.data.STATS.forEach((k) => { st[k] = 50; cp[k] = 80; });
    G2.newGame({ cls: "merc", stats: st, caps: cp, goal: Object.keys(G2.data.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "x", personality: "x" } });
    const vmc2 = vm.createContext({ console, G: G2 });
    vm.runInContext(src("ui/v9_pc.js"), vmc2);
    const t2 = G2.v9.terms(G2.data.WORLD.sections);
    if (!t2.some(([k]) => k === "冒険者ギルド")) fail("手引きに載っている用語（冒険者ギルド）を拾えない");
  }

  // ---- 演出
  const base = { mode: "explore", flags: {} };
  if (v9.moment([{ k: "dice", fumble: true }], base) !== "shake") fail("大失敗で揺れない");
  if (v9.moment([{ k: "dice", crit: true }], base) !== "glow") fail("大成功で光らない");
  if (v9.moment([{ k: "trophy" }], base) !== "glow") fail("トロフィーで光らない");
  if (v9.moment([{ k: "dice", crit: true }, { k: "dice", fumble: true }], base) !== "shake") fail("大失敗より光を優先している");
  if (v9.moment([{ k: "nar" }], base) !== null) fail("ふつうの文で演出している");
  if (v9.moment([{ k: "dice", fumble: true }], { ...base, combat: { foes: [] } }) !== null) fail("戦闘の中で演出している（fx.js に任せる）");
  if (v9.moment([{ k: "nar" }], { ...base, over: "dead" }) !== "dark") fail("死んだときに暗くならない");
  if (v9.moment([], S, "c2_nora") !== null || v9.moment([], S, null) !== "meet") fail("出会いの演出が、出来事の始めだけになっていない");
  const sg = v9.sceneSig({ loc: "karna", mode: "explore", depth: 0 });
  if (sg !== v9.sceneSig({ loc: "karna", mode: "event", depth: 0 })) fail("出来事が始まるだけで暗転する");
  for (const o of [{ loc: "nerva" }, { mode: "fac", fac: "inn" }, { depth: 2 }, { combat: { foes: [] } }]) if (v9.sceneSig({ loc: "karna", mode: "explore", depth: 0, ...o }) === sg) fail(`場面が変わっても暗転しない（${JSON.stringify(o)}）`);

  // ---- 立ち絵は V5 の入口と G.drawPortrait で（V8 の表情の差し替えが効くように）
  const js = src("ui/v9_pc.js");
  for (const k of ["whoOf", "sig", "big", "nameOf"]) if (!G.stand[k] || !js.includes("st." + k)) fail(`V5 の入口 G.stand.${k} を使っていない（名前が変わった？）`);
  if (!/G\.drawPortrait\(f\.cv, c\.who\)/.test(js)) fail("立ち絵を G.drawPortrait で描いていない");
  if (!/G\.paintMonster\(ctx/.test(js)) fail("魔物を G.paintMonster（V6）で描いていない");

  // ---- 見た目
  const css = src("ui/v9_pc.css");
  const rules = [
    [/body\.v9pc \.tome \{[^}]*var\(--v9-tw\)/, "文章の窓の幅"],
    [/body\.v9pc #log \.v9old \{ display: none/, "前の文章を窓から外す"],
    [/\.v9fig \{[^}]*transition: opacity \.48s/s, "立ち絵の出入りのフェード（.48s。v9_pc.js の FADE と合わせる）"],
    [/\.v9fig \{[^}]*transform: translateX\(-28px\)/s, "立ち絵の出入りのスライド"],
    [/\.v9fig:not\(\.front\) \{ filter:[^}]*--v9-dimfig/, "後ろの仲間を暗く"],
    [/body\.v9pc\.v9combat \.scene \{[^}]*--v9-sx/, "戦闘の魔物の場所"],
    [/#v9veil/, "暗転の幕"],
    [/prefers-reduced-motion: reduce\) \{[^]*?\.v9fig[^]*?#v9veil \{ display: none/, "動きを減らす設定"],
    [/:root\[data-theme="dark"\] \{[^}]*--v9-dimfig/, "暗い版の調子"],
    [/prefers-color-scheme: dark\) \{ :root:not\(\[data-theme="light"\]\) \{[^}]*--v9-glow/, "端末の暗い設定"],
    [/body\.v9pc \.v9key \{/, "選択肢の番号"],
    [/\.v9term \{/, "用語の印"],
    [/#v9tip \{/, "用語の説明"],
  ];
  for (const [re, what] of rules) if (!re.test(css)) fail(`v9_pc.css に ${what} が無い`);
  if (v9.FADE !== 480) fail("v9_pc.js の FADE が v9_pc.css の .48s と合っていない");
  if (/(^|[^.\w-])(#play|\.tome|#log|#panel|#mbar|\.top|\.scene) \{/m.test(css.replace(/body\.v9pc[^{]*\{/g, ""))) fail("v9_pc.css が PC 以外（スマホ）の画面を変えている（body.v9pc を付ける）");
  if (/@import|url\(\s*["']?https?:/.test(css)) fail("v9_pc.css が外から読み込んでいる");
  const build = readFileSync(new URL("../../tools/build.mjs", import.meta.url), "utf8");
  if (!/readdirSync\(path\.join\(src, "ui"\)\)\.filter\(\(n\) => n\.endsWith\("\.css"\)\)/.test(build)) fail("ビルドが src/ui/ の .css を読まない");
  if (!bad) ok("V9 PC の画面：配置（1 行 35〜40 字・戦闘）・立ち絵の顔ぶれと前後・キー・用語・演出・見た目");
};
