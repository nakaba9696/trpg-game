// W5：世界地図（data/w5_map.js・engine/zz_w5_map.js・ui/w5_map.js）
// - 全ての場所に座標がある（0〜100）。海の上に無い（陸の形で判定。岸から少し離れている）
// - 地図の形は毎回同じ（エンジンを読み直しても同じ海岸線）
// - 国の名前（主要な国）が初めから出る。どの地方にも名前の置き場所がある
// - 行った場所だけ名前が出る（行っていない場所は印だけ。今の冒険で行った場所から道がつながる場所は名前だけ薄く）
// - 行った場所は冒険をまたいで記録に残る（死んでも・新しい冒険でも）が、地図には今の冒険の分だけ出す（前の冒険で行っただけの場所は heard か none）。古い profile・古いセーブでも動く。二つの記録をまとめられる
// - 道は、両端のどちらかに行ったことがあるものだけ
// - 画面：冒険の「地図」ボタン（G.ui.openMap）を置き換え、図鑑の隣の「地図」ボタン（U11）からも開ける
import { readFileSync } from "node:fs";

const MAJOR = ["レオネスト王国", "ノルディア帝国", "エルメシア共和国", "光天教会領", "シェルアーク", "人と魔の境", "使徒領"];

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("W5：" + m); };
  const start = (G, seed, cls) => {
    const D = G.data;
    G.rand = seeded(seed);
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 60]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: cls || Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };

  // ---- 座標と陸
  const G = loadEngine();
  const D = G.data;
  const W5 = G.w5;
  if (!W5 || !D.W5_MAP) { F("G.w5 か D.W5_MAP が無い"); return; }
  for (const [id, L] of Object.entries(D.LOCS)) {
    if (typeof L.x !== "number" || typeof L.y !== "number" || !Number.isFinite(L.x) || !Number.isFinite(L.y)) { F(`${id}: 座標（x・y）が無い`); continue; }
    if (L.x < 0 || L.x > 100 || L.y < 0 || L.y > 100) F(`${id}: 座標が 0〜100 の外（${L.x}, ${L.y}）`);
    if (!W5.onLand(L.x, L.y)) F(`${id}: 海（か湖）の上にある（${L.x}, ${L.y}）`);
    else if (W5.coastDist(L.x, L.y) < 1) F(`${id}: 岸に近すぎて印が海にかかる（${L.x}, ${L.y}）`);
  }
  // 近すぎる場所（印が重なる）
  const ids = Object.keys(D.LOCS);
  ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => { const A = D.LOCS[a], B = D.LOCS[b]; if (Math.hypot(A.x - B.x, A.y - B.y) < 2.5) F(`${a} と ${b} が近すぎる`); }));
  // 海はちゃんと海（地図の四隅と、島のあいだ）
  [[-6, -5], [106, -5], [-6, 105], [106, 105], [5, 83]].forEach(([x, y]) => { if (W5.onLand(x, y)) F(`(${x}, ${y}) が陸になっている（海のはず）`); });
  // シェルアークの島は大陸と離れている（本島と大陸の間に海）
  if (D.LOCS.yakumo && D.LOCS.nerva) {
    const A = D.LOCS.yakumo, B = D.LOCS.nerva;
    let sea = false;
    for (let t = 0.05; t < 0.95; t += 0.02) if (!W5.onLand(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t)) sea = true;
    if (!sea) F("島の都シェルアークが大陸と陸続き");
  }
  // 毎回同じ形
  const G2 = loadEngine();
  if (JSON.stringify(G2.w5.shape().main) !== JSON.stringify(W5.shape().main)) F("海岸線が読み込むたびに変わる");
  if (G2.w5.regionAt(40, 40) !== W5.regionAt(40, 40)) F("国の色分けが読み込むたびに変わる");
  // 自分の場所の国が、その場所の region（色分けが場所と食い違わない）
  let off = 0;
  for (const [id, L] of Object.entries(D.LOCS)) if (W5.regionAt(L.x, L.y) !== L.region) { off++; if (off <= 3) F(`${id}: 地図の色分けが ${W5.regionAt(L.x, L.y)}（${L.region} のはず）`); }

  // ---- 国の名前
  {
    const names = W5.regionLabels().map((r) => r.name);
    MAJOR.forEach((r) => { if (!names.includes(r)) F(`国の名前「${r}」が地図に出ない`); });
    const regions = new Set(Object.values(D.LOCS).map((L) => L.region));
    regions.forEach((r) => { if (!names.includes(r)) F(`地方「${r}」の名前が地図に出ない`); if (!D.W5_MAP.regions[r]) F(`地方「${r}」の色が D.W5_MAP.regions に無い`); });
    W5.regionLabels().forEach((r) => { if (!Number.isFinite(r.x) || !Number.isFinite(r.y)) F(`「${r.name}」の名前の置き場所が無い`); });
    // 冒険の前でも（G.S が無くても）出る
    const G3 = loadEngine();
    G3.S = null;
    if (G3.w5.regionLabels().length < MAJOR.length) F("冒険の前に国の名前が出ない");
    if (G3.w5.marks(null).some((m) => m.name)) F("冒険の前、どこにも行っていないのに場所の名前が出る");
  }

  // ---- 行った場所だけ名前が出る
  const P0 = (() => {
    const G = loadEngine();
    const D = G.data;
    G.P = { trophies: {}, graves: [] }; // 古い profile（codex が無い）
    const S = start(G, 11);
    const home = S.loc;
    const m = Object.fromEntries(G.w5.marks().map((x) => [x.id, x]));
    if (m[home].status !== "here" || m[home].name !== D.LOCS[home].name) F("出発の町が「今いる所」として名前つきで出ない");
    const near = new Set(Object.keys(Object.assign({}, D.LOCS[home].links, D.LOCS[home].sea)));
    Object.values(m).forEach((x) => {
      if (x.id === home) return;
      if (near.has(x.id)) { if (x.status !== "heard" || !x.faint || !x.name) F(`${x.id}: 出発の町から道がつながるのに、名前が薄く出ない（${x.status}）`); }
      else if (x.name || x.status !== "none") F(`${x.id}: 行っていないのに名前が出る（${x.status}）`);
    });
    if (!G.P.codex || !G.P.codex.places || !G.P.codex.places[home]) F("出発の町が冒険をまたぐ記録に残らない");
    // 道：出発の町から出る道だけが見える
    const roads = G.w5.roads();
    if (!roads.length) F("出発の町から出る道が見えない");
    roads.forEach((r) => { if (r.a !== home && r.b !== home) F(`行っていない場所どうしの道 ${r.a}–${r.b} が見える`); });
    // 旅をして着く
    const to = Object.keys(D.LOCS[home].links)[0];
    G.arrive(to);
    if (G.w5.status(to) !== "here" || G.w5.status(home) !== "now") F("着いた先が「今いる所」、前の町が「この冒険で行った」にならない");
    if (!G.P.codex.places[to] || !G.P.codex.places[to].by) F("着いた場所が冒険をまたぐ記録に残らない（誰が行ったかも）");
    // 死んで、新しい冒険
    G.die("テスト");
    return { P: JSON.parse(JSON.stringify(G.P)), home, to };
  })();

  // ---- 前の冒険で行った場所は、地図に出さない（持ち主の声「前の冒険で行った場所は表示しなくていい」）。記録（G.P.codex.places）は残る
  {
    const G = loadEngine();
    const D = G.data;
    G.P = P0.P;
    const other = Object.keys(D.CLASSES).find((c) => D.CLASSES[c].start !== P0.home && D.CLASSES[c].start !== P0.to);
    const S = start(G, 12, other);
    const nearNow = (id) => Object.keys(Object.assign({}, D.LOCS[id].links, D.LOCS[id].sea)).some((to) => S.visited[to]);
    [P0.home, P0.to].forEach((id) => {
      if (S.visited[id]) return;
      const st = G.w5.status(id);
      const want = nearNow(id) ? "heard" : "none";
      if (st !== want) F(`${id}: 前の冒険で行っただけの場所が、今の冒険の見え方（${want}）にならない（${st}）`);
      const m = G.w5.marks().find((x) => x.id === id);
      if (want === "none" && m.name) F(`${id}: 前の冒険で行っただけの場所の名前が出る`);
      if (!(G.P.codex.places || {})[id]) F(`${id}: 冒険をまたぐ記録が消えた（地図に出さないだけのはず）`);
    });
    if (G.w5.marks().some((m) => m.status === "past")) F("地図に「前の冒険」の印が残っている");
    // 道：今の冒険で行った場所から出る道だけ
    G.w5.roads().forEach((r) => { if (!S.visited[r.a] && !S.visited[r.b]) F(`今の冒険で行っていない場所どうしの道 ${r.a}–${r.b} が見える`); });
    if (G.w5.count().been < 2) F("行ったことのある場所の数（記録）が数えられない");
    const src = readFileSync(new URL("../../src/ui/w5_map.js", import.meta.url), "utf8");
    if (/前の冒険|"past"|\.past\b/.test(src)) F("地図の画面に「前の冒険」の凡例・文・色が残っている");
  }

  // ---- 古いセーブ（今の冒険で行った場所が記録に無い）でも、地図を開くと写る
  {
    const G = loadEngine();
    G.P = { trophies: {}, graves: [] };
    const S = start(G, 13);
    delete G.P.codex;
    S.visited.ruins = true;
    if (G.w5.record(S) < 1 || !G.P.codex.places.ruins) F("古いセーブの行った場所が記録に写らない");
  }

  // ---- 二つの記録をまとめる（claude.ai のデータとこのブラウザ）
  {
    const G = loadEngine();
    const a = { items: {}, foes: {}, people: {}, places: { karna: { by: "甲", at: 5 }, nerva: { by: "甲", at: 9 } } };
    const b = { items: {}, foes: {}, people: {}, places: { nerva: { by: "乙", at: 3 }, yakumo: { by: "乙", at: 4 } } };
    const m = G.codexMerge(a, b);
    if (!m.places || !m.places.karna || !m.places.yakumo || (m.places.nerva || {}).by !== "乙") F("二つの記録をまとめると、行った場所が抜けるか、早いほうが残らない");
  }

  // ---- 画面
  {
    const src = readFileSync(new URL("../../src/ui/w5_map.js", import.meta.url), "utf8");
    if (!/G\.ui\.openMap\s*=/.test(src)) F("冒険の「地図」ボタン（G.ui.openMap）を置き換えていない");
    // U11：世界地図は図鑑の窓から外し、図鑑の隣の「地図」ボタン（ui/zu11_quick.js。冒険の外でも開ける）
    if (/dlgCodex/.test(src)) F("世界地図が図鑑の窓の中に残っている");
    if (!/id = "openMap"/.test(readFileSync(new URL("../../src/ui/zu11_quick.js", import.meta.url), "utf8"))) F("図鑑の隣の「地図」ボタンが無い");
    if (!/pointerdown/.test(src) || !/wheel/.test(src)) F("拡大・移動（指・ホイール）ができない");
    if (/G\.(rand|d|dice|pick)\(/.test(src)) F("地図の絵がゲームの乱数を使っている（毎回同じ形にならない）");
    const css = readFileSync(new URL("../../src/ui/w5_map.css", import.meta.url), "utf8");
    if (!/max-width:\s*640px/.test(css)) F("スマホの見た目が無い");
  }

  if (!bad) ok(`W5：世界地図（場所 ${Object.keys(D.LOCS).length} か所が陸の上・国の名前 ${W5.regionLabels().length}・行った場所だけ名前・冒険をまたいで残る）`);
};
