// A11（雪と湖）：雪の町と湖の町の景色（data/zz_a11_sights.js・engine/zzzzzzzzzz_a11_sights.js・ui/scene_v4_snowlake.js）
// - 「景色を眺める」は D.A11_SIGHTS のある町だけに出る。一日に一度、時が一つ進み、正気が戻る（金・品・名声は増えない）。次の日にまた眺められる
// - はじめての発見と手引きの一行は一度だけ。古いセーブ（S.a11sight 無し）でも動く。文に癖の語（……・少しだけ・どこか など）が無い
// - 背景：雪・湖の絵を、画像の上でも canvas でも、時間帯×天候ごとに例外なく描け、動く層（P.anim）が付く。G.rand を使わない
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";
import { TICS, stringsOf } from "../../tools/prose_lint.mjs";

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("A11 雪と湖：" + m); };
  const G = loadEngine();
  const D = G.data;
  const SP = D.A11_SIGHTS || {};
  const ids = Object.keys(SP);
  for (const id of ["garmund", "w7_eisenvan", "w3_lignoa", "w4_tulier"]) if (!SP[id]) F(`${id} の景色が無い`);

  // ---------------------------------------------------------------- 文
  const texts = [];
  for (const id of ids) {
    const sp = SP[id], L = D.LOCS[id];
    if (!L || L.type !== "town") { F(`${id} は町ではない`); continue; }
    if (!sp.label || !Array.isArray(sp.phase) || sp.phase.length !== 4 || sp.phase.some((x) => !x || !x.length)) F(`${id}: label か時間帯 4 つの文が無い`);
    texts.push(sp.label, ...sp.phase.flat(), ...Object.values(sp.weather || {}).flat(), ...Object.values(sp.season || {}).flat());
    if (sp.first) {
      texts.push(sp.first.text);
      const [lid, key] = String(sp.first.lore).split(":");
      if (!D.LORE[lid] || !D.LORE[lid].lines.some((l) => l[0] === key)) F(`${id}: 手引きの行 ${sp.first.lore} が無い`);
      else texts.push(D.LORE[lid].lines.find((l) => l[0] === key)[1]);
    }
  }
  // このファイルで書いた文（着いたときの一文・町の説明の一文も）
  texts.push(...stringsOf(readFileSync(new URL("../../src/data/zz_a11_sights.js", import.meta.url), "utf8")));
  for (const t of texts) for (const [k, re] of TICS) if (new RegExp(re.source).test(t)) F(`癖の語「${k}」：${t.slice(0, 30)}`);

  // ---------------------------------------------------------------- 町の行動
  const fresh = (loc) => {
    G.rand = seeded(5);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 22 } });
    const S = G.S;
    S.loc = loc; S.visited[loc] = true; S.mode = "explore";
    return S;
  };
  const find = () => G.actions().flatMap((g) => g.list).find((a) => a.id === "a11sight");
  for (const id of ids) {
    const S = fresh(id);
    S.sanity = 60;
    const a = find();
    if (!a || a.disabled) { F(`${id}: 「景色を眺める」が出ない`); continue; }
    const gold = S.gold, fame = S.fame, items = JSON.stringify(S.inv), day = S.day, phase = S.phase, n = S.log.length;
    G.act("a11sight");
    const said = S.log.slice(n).filter((x) => x.k === "nar").map((x) => x.text);
    if (!said.length) F(`${id}: 眺めても文が出ない`);
    if (!said.includes(SP[id].first.text)) F(`${id}: はじめての発見の文が出ない`);
    const [lid, key] = SP[id].first.lore.split(":");
    if (!(G.loreOf(S)[lid] || []).includes(key)) F(`${id}: 手引きの行が開かない`);
    if (!(S.sanity > 60 && S.sanity <= 60 + G.a11.SANITY)) F(`${id}: 正気の戻りが変（${S.sanity}）`);
    if (S.gold !== gold || S.fame !== fame || JSON.stringify(S.inv) !== items) F(`${id}: 金・名声・持ち物が変わった`);
    if (!(S.day * 4 + S.phase === day * 4 + phase + 1)) F(`${id}: 時が一つ進まない`);
    const b = find();
    if (S.day === day && !(b && b.disabled)) F(`${id}: 同じ日にもう一度眺められる`);
    // 次の日：また眺められるが、発見はもう出ない
    S.day += 1; S.phase = 3;
    const m = S.log.length;
    if (!find() || find().disabled) F(`${id}: 次の日に眺められない`);
    G.act("a11sight");
    if (S.log.slice(m).some((x) => x.text === SP[id].first.text)) F(`${id}: 発見が二度出た`);
    if (!S.log.slice(m).some((x) => SP[id].phase[3].includes(x.text) || Object.values(SP[id].weather || {}).flat().includes(x.text) || Object.values(SP[id].season || {}).flat().includes(x.text))) F(`${id}: 夜の文（か天候の文）にならない`);
  }
  // 景色の無い町・野外には出ない
  const other = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && !SP[id]);
  fresh(other);
  if (find()) F(`${other}（景色の無い町）に出る`);
  // 古いセーブ
  const S0 = fresh("w3_lignoa");
  delete S0.a11sight; delete S0.lore;
  try { if (!find()) F("古いセーブで出ない"); G.act("a11sight"); } catch (err) { F(`古いセーブで例外 ${err.message}`); }

  // ---------------------------------------------------------------- 背景の絵
  const dir = new URL("../../src/ui/", import.meta.url);
  const src = (f) => readFileSync(new URL(f, dir), "utf8");
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : (...a) => (k === "createRadialGradient" || k === "createLinearGradient" || k === "createPattern" ? grad : k === "getImageData" ? { data: [] } : undefined)),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const cv = () => ({ width: 10, height: 10, getContext: () => ctx });
  const H = loadEngine();
  H.rand = () => { throw new Error("背景の絵が G.rand を使った"); };
  const c = vm.createContext({ console, G: H, document: { createElement: cv }, setTimeout: () => 0, matchMedia: () => ({ matches: false }) });
  const v2 = readdirSync(dir).filter((f) => /^scene_v2.*\.js$/.test(f)).sort();
  for (const f of ["scene.js", ...v2, "scene_v3_photo.js", "scene_v4_snowlake.js"]) vm.runInContext(src(f), c, { filename: "ui/" + f });
  const V = H.SV2;
  const PH = { snowcity: "garmund", w7_icehaven: "w7_eisenvan", snow: "frost", w3_lake: "w3_lignoa", w4_water: "w4_tulier" };
  let n = 0;
  for (const [key, pid] of Object.entries(PH)) for (const phase of [0, 1, 2, 3]) for (const weather of ["晴", "雨", "霧", "雪"]) for (const photo of [false, true]) {
    try {
      const P = V.makeP(ctx, 640, 360, { phase, sky: { season: key === "w4_water" ? "夏" : "冬", weather } }, key, false);
      P.cv = cv(); P.mk = cv;
      if (photo) V.paintPhoto(P, { id: pid, img: { naturalWidth: 1232, naturalHeight: 704 }, rect: null });
      else V.OUT[key](P);
      if (!P.anim.length && weather === "晴") F(`${key}（${photo ? "画像" : "canvas"}・${phase}・${weather}）に動く層が無い`);
      for (const A of P.anim) if (A.draw) { A.draw(ctx, 0, P); A.draw(ctx, 7.3, P); }
      n++;
    } catch (err) { F(`${key}（${photo ? "画像" : "canvas"}・${phase}・${weather}）：例外 ${err.message}`); }
  }
  // 包んだ絵（w3_lake を土台にする緑の都エルデンホルムなど）には、湖の層を足さない
  const P = V.makeP(ctx, 640, 360, { phase: 1, sky: { season: "夏", weather: "晴" } }, "w7_greenvale", false);
  P.cv = cv(); P.mk = cv;
  V.OUT.w7_greenvale(P);
  if (P.anim.length) F("w3_lake を土台にした別の町の絵にも湖の層が付いた");

  if (!bad) ok(`A11 雪と湖（景色 ${ids.length} 町・背景 ${n} 枚を描いた）`);
};
