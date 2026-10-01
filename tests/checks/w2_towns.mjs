// W2：新しい町と谷（src/data/locations_w2.js）、町の施設と王城（src/engine/explore_w2.js）
// - 新しい町が 4〜6、どれも施設・通行人のひとこと・出来事・気候・背景の絵を持つ。三つの谷は帝国の中
// - 畑・鍛冶場・闘技場・湯治場・狩り場の行いが、例外なく動き、約束どおりに持ち物や金が動く。闘技場では倒れる前に止められる
// - 王城：王国は兄姉の都（訪れた都だけ）、帝国は皇子を選んで騎士になる。王城に入ると手触りの一行が増える
// - 古いセーブ（W2 の項目が無い）でも動く。着いた町で用語説明が開く
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail, ok, loadEngine, seeded }) => {
  const start = (G, seed) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 60])), caps: Object.fromEntries(D.STATS.map((k) => [k, 90])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const ids = (G) => G.actions().flatMap((g) => g.list).filter((a) => !a.disabled).map((a) => a.id);
  const before = { n: 0 };
  const F = (m) => { before.n++; fail(m); };

  // ---------------------------------------------------------------- データ
  const G = loadEngine();
  const D = G.data;
  const w2 = Object.entries(D.LOCS).filter(([id]) => id.startsWith("w2_"));
  const towns = w2.filter(([, L]) => L.type === "town");
  if (towns.length < 4 || towns.length > 6) F(`新しい町が ${towns.length}（4〜6 のはず）`);
  const sceneSrc = readFileSync(new URL("../../src/ui/scene.js", import.meta.url), "utf8");
  for (const [id, L] of w2) {
    if (!D.CLIMATE || !D.CLIMATE[id]) F(`${id}: 気候（D.CLIMATE）が無い`);
    if (!sceneSrc.includes(`${L.scene}(ctx, w, h, sk, R)`)) F(`${id}: 背景の絵 ${L.scene} が scene.js に無い`);
    if (!D.EVENTS.some((e) => e.where.includes(id))) F(`${id}: その場所の出来事が無い`);
    if (L.type !== "town" && !D.LORE_ON.loc[id]) F(`${id}: 着いたときに開く用語説明が無い`);
  }
  for (const [id, L] of towns) {
    if (!(D.AMBIENT || []).some((a) => a.where.includes(id))) F(`${id}: 通行人のひとことが無い`);
    if (!L.fac.some((f) => ["field", "forge", "arena", "bath", "hunt"].includes(f))) F(`${id}: その町だけの施設が無い`);
    if (!G.FAC_NAMES[L.fac[L.fac.length - 1]]) F(`${id}: 施設の名前が無い`);
  }
  for (const id of ["w2_echo", "w2_shadow", "w2_acid"]) if (!D.LOCS[id] || D.LOCS[id].region !== "ノルディア帝国") F(`${id}: 帝国の中の谷になっていない`);
  if (D.LOCS.zephara.region !== "エルメシア共和国") F("エルメシアの地方が共和国になっていない");
  if (!/門の外/.test(D.LOCS.zephara.desc) || !/大樹/.test(D.LOCS.zephara.desc)) F("エルメシアの説明に、門の外の暮らしと東の大樹が無い");
  for (const r of D.W2_FORGE) { if (!D.ITEMS[r.give]) F(`鍛冶場：${r.give} が無い`); for (const k of Object.keys(r.need)) if (!D.ITEMS[k]) F(`鍛冶場：素材 ${k} が無い`); }
  for (const t of D.W2_ARENA) for (const fs of t.foes) for (const e of fs) if (!D.ENEMIES[e]) F(`闘技場：敵 ${e} が無い`);
  for (const ps of Object.values(D.W2_PATRONS)) for (const p of ps) if (p.town && !D.LOCS[p.town]) F(`後ろ盾 ${p.id}: 都 ${p.town} が無い`);

  // ---------------------------------------------------------------- 施設の行い
  {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, 21);
    const go = (id) => { G.arrive(id); G.endTurn(); }; // 着いた場所の用語説明は手番の終わりに開く
    const enter = (f) => { G.act("fac:" + f); if (S.mode !== "fac" || S.fac !== f) F(`${f} に入れない`); };
    // 畑
    go("w2_granbel");
    if (!(G.loreOf(S).midori || []).length) F("麦の都に着いても用語説明「畑を動かすもの」が開かない");
    S.gold = 0;
    enter("field");
    G.act("field:work");
    if (S.gold <= 0) F("畑仕事で日当が出ない");
    G.act("field:old");
    if (!S.flags.w2_oldfield || ids(G).includes("field:old")) F("去年の畑が二度見られる");
    G.act("back");
    // 鍛冶場
    go("w2_dranherz");
    enter("forge");
    S.gold = 1000;
    if (ids(G).includes("forge:2")) F("鬼の角が無いのに金棒を打たせられる");
    G.give("onihorn");
    const day = S.day;
    G.act("forge:2");
    if (!G.count("oniclub") || G.count("onihorn") || S.gold !== 850 || S.day < day + 3) F("鍛冶場で鬼の角から金棒が打てない（素材・金・日数）");
    G.act("back");
    // 闘技場：勝てば金と印。倒れる前に止められる
    go("w2_zalgros");
    enter("arena");
    S.gold = 100; S.maxHp = S.hp = 999;
    G.act("arena:1");
    if (!S.combat || !S.combat.w2_arena) F("闘技場の見習いの部で戦いが始まらない");
    for (let i = 0; i < 50 && S.combat; i++) G.act(ids(G).find((x) => x.startsWith("cb:attack")) || ids(G).find((x) => x.startsWith("cb:")));
    if (S.combat || !S.flags.w2_arena1) F("闘技場で勝っても印が付かない");
    if (ids(G).some((x) => x.startsWith("arena:1"))) F("闘技場で一日に二度戦える");
    S.day++; S.fame = 0;
    G.S.mode = "fac"; G.S.fac = "arena";
    G.act("arena:1");
    let died = false;
    S.hp = 1; S.clungUsed = true;
    for (let i = 0; i < 30 && S.combat && !S.over; i++) { S.combat.w2_late = false; S.hp = 1; G.act("cb:guard"); }
    died = !!S.over;
    if (died) F(`闘技場で倒れて死んだ（${S.overCause || ""}）`);
    if (!died && S.combat) F("闘技場の戦いが終わらない");
    G.S.mode = "explore";
    // 湯治場
    go("w2_amyrein");
    enter("bath");
    S.gold = 100; S.hp = 1; S.mp = 0; S.conds = ["毒", "呪い"];
    G.act("bath:soak");
    if (S.hp !== S.maxHp || S.mp !== S.maxMp || S.conds.includes("毒") || !S.conds.includes("呪い")) F("湯に浸かって全快・毒抜きにならない（呪いは残る）");
    G.act("bath:long");
    if (S.conds.includes("呪い")) F("三日の湯治で呪いが抜けない");
    G.act("bath:show");
    if (ids(G).includes("bath:show")) F("湯守に同じ日に二度傷を見せられる");
    G.act("back");
    // 狩り場
    go("w2_nagris");
    if (!(G.loreOf(S).sekaiju || []).includes("nagris")) F("狩り場の町で世界樹の行が開かない");
    enter("hunt");
    for (let i = 0; i < 6 && !S.over; i++) { S.hp = S.maxHp = 999; if (S.combat) { G.act("cb:guard"); continue; } S.mode = "fac"; S.fac = "hunt"; G.act("hunt:join"); }
    if (S.over) F("狩り場で死んだ");
  }

  // ---------------------------------------------------------------- 王城：騎士の後ろ盾
  {
    const G = loadEngine();
    const S = start(G, 5);
    G.arrive("leavel");
    S.fame = 200; S.gold = 1000;
    const logN = S.log.length;
    G.act("fac:castle");
    if (S.log.length < logN + 3) F("王城に入っても手触りの一行が増えない");
    let a = ids(G);
    if (!a.includes("castle:knight")) F("王国の王城に、女王の御前で願い出る元の道が無い");
    if (a.includes("castle:w2knight:dran")) F("訪れていない鍛冶の都の兄君の推挙が出る");
    S.visited.w2_dranherz = true;
    a = ids(G);
    if (!a.includes("castle:w2knight:dran")) F("訪れた鍛冶の都の兄君の推挙が出ない");
    for (let i = 0; i < 20 && !S.title; i++) { S.gold = 1000; G.act("castle:w2knight:dran"); }
    if (S.title !== "騎士" || !S.w2_patron || S.w2_patron.id !== "dran") F("兄君の推挙で騎士になれない");
    if (!G.count("royalwrit")) F("兄君の推挙で騎士になっても叙任状が無い");
    if (G.nationOf && S.titleAt !== "レオネスト王国") F(`兄君の推挙の位の国が残らない（${S.titleAt}）`);
    // 手配中は、兄姉の推挙も願い出られない（M3）
    if (G.crime) {
      const G3 = loadEngine();
      const S3 = start(G3, 8);
      G3.arrive("leavel"); S3.fame = 200; S3.gold = 1000; S3.visited.w2_dranherz = true;
      G3.crime("murder"); G3.crime("murder");
      S3.mode = "fac"; S3.fac = "castle";
      const d = G3.facActions().flatMap((g) => g.list).find((x) => x.id === "castle:w2knight:dran");
      if (!d || !d.disabled) F("手配中なのに兄君の推挙で騎士の位を願い出られる");
    }

    const G2 = loadEngine();
    const S2 = start(G2, 6);
    G2.arrive("garmund");
    S2.fame = 200; S2.gold = 1000;
    G2.act("fac:castle");
    const all = G2.actions().flatMap((g) => g.list);
    const fifth = all.find((x) => x.id === "castle:w2knight:fifth");
    if (!all.some((x) => x.id === "castle:w2knight:first") || !fifth) F("帝国の王城で皇子を選べない");
    if (all.some((x) => x.id === "castle:knight")) F("帝国の王城に、皇子を選ばない叙任が残っている");
    if (fifth && !fifth.disabled) F("闘技場で勝っていないのに第五皇子に仕えられる");
    G2.act("castle:w2knight:third");
    if (S2.title !== "騎士" || S2.gold !== 700 || !S2.w2_patron || S2.w2_patron.realm !== "garmund") F("第三皇子に仕えて騎士になれない（300G）");
    if (!(G2.loreOf(S2).kouji || []).length) F("皇子に仕えても用語説明「皇子たち」が開かない");
    // 仕えた皇子が倒れる出来事（第三皇子は倒れない）
    const ev = G2.data.EVENTS.find((e) => e.id === "w2_princefell");
    S2.day += 30;
    if (ev.cond(S2)) F("第三皇子に仕えているのに、皇子が倒れる出来事が起きる");
    S2.w2_patron.id = "first";
    if (!ev.cond(S2)) F("第一皇子に仕えて日が経っても、皇子が倒れる出来事が起きない");
  }

  // ---------------------------------------------------------------- 古いセーブ・ランダムに遊ぶ
  {
    const G = loadEngine();
    const S = start(G, 9);
    delete S.w2_patron; delete S.w2_arenaDay; delete S.w2_soak; delete S.lore;
    for (const id of ["w2_granbel", "w2_dranherz", "w2_zalgros", "w2_amyrein", "w2_nagris", "w2_echo", "w2_shadow", "w2_acid"]) {
      G.arrive(id);
      for (let i = 0; i < 25 && !S.over; i++) {
        S.hp = S.maxHp; S.gold = Math.max(S.gold, 200);
        const a = ids(G);
        if (!a.length) break;
        const pick = a.filter((x) => !x.startsWith("travel:") && !x.startsWith("sail:"));
        try { G.act((pick.length ? pick : a)[Math.floor(G.rand() * (pick.length || a.length))]); } catch (err) { F(`${id} で遊ぶと例外 ${err.message}`); break; }
      }
      if (S.over) break;
    }
  }

  // ---------------------------------------------------------------- 背景（施設の中も）
  {
    const vmc = vm.createContext({ console, G });
    for (const f of ["art_monsters.js", "scene.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
    const noop = () => {};
    const grad = { addColorStop: noop };
    const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? () => grad : noop), set: (t, k, v) => ((t[k] = v), true) });
    const canvas = { width: 0, height: 0, getBoundingClientRect: () => ({ width: 640, height: 360 }), getContext: () => ctx };
    start(G, 3);
    for (const f of ["field", "forge", "arena", "bath", "hunt"]) {
      Object.assign(G.S, { mode: "fac", fac: f });
      try { G.paintScene(canvas, { key: undefined, phase: 1, seed: f }); } catch (err) { F(`施設 ${f} の背景を描くと例外 ${err.message}`); }
    }
  }

  if (!before.n) ok(`W2 の町と谷（町 ${towns.length}・場所 ${w2.length}・鍛冶 ${D.W2_FORGE.length}・闘技場 ${D.W2_ARENA.length} 部）`);
};
