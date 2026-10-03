// E4：地域の魔物・強い個体・群れ・眷属・戦いの手ざわり・絵（data/enemies_e4_*.js・engine/zzz_e4_foes.js）
// - 地域の魔物が 50 以上。どの地域にも 4 種以上。今ある場所の出現表に入り、新しい場所（W3・W4）も地域名で当たる。昼夜・季節・天候で出るものが変わる
// - 強い個体：元の種よりはっきり強く、その個体だけの落とし物があり、図鑑に印。出会いでまれに入れ替わる
// - 群れ：2〜4 体で出る。崩れると逃げる・仲間を呼ぶ・庇うが働く
// - 眷属：使徒ごとに 2 種以上、縄張りの出現表にいる。倒すと手がかり（覚え書き）、二体で使徒が弱る
// - 行動：E4 の敵はみな行動か弱点を持つ。眠り・武器を落とす・弱点が効く。どの敵とも例外なく戦える
// - 絵：look があり、docs/art/monsters.json にタグがある（異形の設定は使わない）
import { readFileSync } from "node:fs";

export default ({ fail, ok, loadEngine, seeded }) => {
  const F = (m) => fail("E4：" + m);
  const G = loadEngine();
  const D = G.data;
  const E = D.ENEMIES, E4 = D.E4;
  const ids = Object.keys(E).filter((id) => /^e4k?_/.test(id));
  const regional = ids.filter((id) => E[id].rg);
  const elders = ids.filter((id) => E[id].elderOf);
  const kin = ids.filter((id) => E[id].kinOf);
  const packs = ids.filter((id) => E[id].pack);
  const ACTS = Object.keys(E4.ACT_NAME || {});
  const inPool = (id) => Object.values(D.LOCS).some((L) => (L.e4pool || []).includes(id));

  // ---------------------------------------------------------------- 数と地域
  if (regional.length < 50) F(`地域の魔物が ${regional.length}（50 以上）`);
  const byRg = {};
  regional.forEach((id) => { (byRg[E[id].rg] = byRg[E[id].rg] || []).push(id); });
  for (const k of Object.keys(E4.RG)) if ((byRg[k] || []).length < 4) F(`地域「${k}」の魔物が ${(byRg[k] || []).length} 種（4 以上）`);
  for (const id of regional) {
    if (!E4.RG[E[id].rg]) F(`${id}: 地域 ${E[id].rg} が D.E4.RG に無い`);
    if (!inPool(id)) F(`${id}: どこの出現表にも入っていない`);
  }
  // W3・W4 の新しい場所：地域名と危険度で当たる
  for (const [region, danger, want] of [["人類の最前線", 4, "e4_ladderGob"], ["南西の島々", 3, "e4_islepirate"], ["光天教会領", 2, "e4_bellbat"], ["レオネスト王国", 2, "e4_brokenknight"]]) {
    D.LOCS.e4_test = { name: "試しの野", region, type: "wild", danger, pool: ["goblin"] };
    E4.spread();
    if (!(D.LOCS.e4_test.e4pool || []).includes(want)) F(`新しい場所（${region}・危険度 ${danger}）に ${want} が入らない`);
    if ((D.LOCS.e4_test.e4pool || []).some((id) => /^e4/.test(id) && (E[id].tier > danger || E[id].kinOf))) F(`新しい場所（${region}）に段の合わない敵か眷属が入った`);
    delete D.LOCS.e4_test;
  }
  for (const L of Object.values(D.LOCS)) for (const id of L.pool || []) if (/^e4/.test(id)) F(`${L.name} の pool に E4 の敵 ${id}（e4pool に置く）`);
  for (const L of Object.values(D.LOCS)) for (const id of L.e4pool || []) if (E[id].tier > Math.max(2, L.danger + 1)) F(`${L.name}（危険度 ${L.danger}）に段 ${E[id].tier} の ${id}`);
  const timed = ids.filter((id) => E[id].when);
  if (timed.filter((id) => E[id].when.night).length < 5 || timed.filter((id) => E[id].when.season).length < 3 || timed.filter((id) => E[id].when.weather).length < 3) F("夜・季節・天候で出る魔物が少ない（夜 5・季節 3・天候 3 以上）");

  // ---------------------------------------------------------------- 遊びの準備
  const start = (g, seed) => {
    g.rand = seeded(seed);
    g.P = { trophies: {}, graves: [] };
    const d = g.data;
    g.newGame({ cls: "merc", stats: Object.fromEntries(d.STATS.map((k) => [k, 60])), caps: Object.fromEntries(d.STATS.map((k) => [k, 80])), goal: Object.keys(d.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    g.S.maxHp = g.S.hp = 9999;
    return g.S;
  };
  const at = (g, loc, phase, sky) => { g.S.loc = loc; g.S.phase = phase; g.S.travel = null; g.S.mode = "explore"; g.S.combat = null; g.skyAt = () => sky || { season: "春", weather: "晴" }; };

  // ---------------------------------------------------------------- 昼夜：夜だけの魔物は昼に出ない。出会いに E4 の敵が混ざる
  {
    const g = loadEngine();
    start(g, 11);
    const seen = (loc, phase, sky, n) => { const out = new Set(); for (let i = 0; i < n; i++) { at(g, loc, phase, sky); g.startCombat(["goblin"], {}); g.S.combat.foes.forEach((f) => out.add(f.id)); } g.S.combat = null; return out; };
    const day = seen("forest", 1, null, 120), night = seen("forest", 3, null, 120);
    if (day.has("e4_mosswisp")) F("夜だけの苔灯りが昼に出た");
    if (!night.has("e4_mosswisp")) F("夜の森に苔灯りが出ない");
    if (![...day].some((id) => /^e4_/.test(id))) F("森の出会いに E4 の魔物が混ざらない");
    if (!day.has("goblin")) F("E4 の魔物ばかりで、前からの敵が出なくなった");
    if (seen("plains", 1, { season: "冬", weather: "晴" }, 120).has("e4_cropcrow")) F("夏と秋だけの大烏が冬に出た");
    if (!seen("plains", 1, { season: "秋", weather: "晴" }, 120).has("e4_cropcrow")) F("秋の丘陵に大烏が出ない");
    at(g, "forest", 1);
    g.startCombat(["e4_mosswisp"], {});
    if (g.S.combat.foes.some((f) => f.id === "e4_mosswisp")) F("名指しで呼んでも、夜だけの苔灯りが昼に出た");
    // 勝ったときの結果つきの戦い（出来事・迷宮の主）は引き直さない
    at(g, "plains", 1, { season: "冬", weather: "晴" });
    g.startCombat(["e4_cropcrow"], { win: { fame: 1 } });
    if (g.S.combat.foes[0].id !== "e4_cropcrow") F("名指しの戦いの敵が引き直された");
  }

  // ---------------------------------------------------------------- 強い個体
  if (elders.length < 12) F(`強い個体が ${elders.length}（12 以上）`);
  for (const x of elders) {
    const e = E[x], b = E[e.elderOf];
    if (!b || E4.ELDER_OF[e.elderOf] !== x) { F(`${x}: 元の種がない`); continue; }
    if (!(e.tier > b.tier && e.hp > b.hp && e.dmg[2] > b.dmg[2])) F(`${x}: 元の種より強くない`);
    if (!/年経た|頭目|女王/.test(e.name)) F(`${x}: 名前で強い個体と分からない（${e.name}）`);
    const it = D.ITEMS[(e.loot[0] || [])[0]];
    if (!it || it.type !== "loot" || e.loot[0][1] !== 1 || !it.flavor) F(`${x}: その個体だけの落とし物（必ず落ちる素材・説明つき）が無い`);
  }
  {
    const g = loadEngine();
    start(g, 12);
    at(g, "forest", 1);
    g.data.E4.P.elder = 1;
    g.startCombat(["e4_thornboar"], {});
    if (g.S.combat.foes[0].id !== "e4_thornboar") F("危険度 1 の場所に強い個体が出た");
    at(g, "ruins", 1);
    g.startCombat(["e4_thornboar"], {});
    const f = g.S.combat.foes[0];
    if (f.id !== "e4_thornboar_x") F("出会いで強い個体に入れ替わらない");
    g.data.E4.P.elder = 0.05;
    g.codexMeet(f.id); g.codexKill(f.id);
    const rows = g.codexFoeStats(f.id);
    if (!rows.some(([k, v]) => k === "印" && /強い個体/.test(v))) F("図鑑に強い個体の印が無い");
    if (!g.codexFoeWhere(f.id).some((t) => /まれに/.test(t))) F("強い個体の出現場所が引けない");
    for (let i = 0; i < 40 && g.S.combat; i++) { g.S.combat.foes.forEach((x) => { if (x.hp > 0) x.hp = 1; }); g.combatAct("attack"); }
    if (!g.P.trophies.e4_elder) F("強い個体を倒してもトロフィーが付かない");
  }

  // ---------------------------------------------------------------- 群れ
  if (packs.length < 10) F(`群れで出る敵が ${packs.length}（10 以上）`);
  {
    const g = loadEngine();
    start(g, 13);
    at(g, "w1_catacomb", 1);
    g.startCombat(["e4_bellbat"], {});
    const n = g.S.combat.foes.filter((f) => f.id === "e4_bellbat").length;
    if (n < 2 || n > 4) F(`群れの数が ${n}（2〜4）`);
    // 崩れる：ひとりだけ残ると逃げることがある
    let fled = 0;
    for (let s = 0; s < 20; s++) {
      const h = loadEngine();
      start(h, 100 + s);
      at(h, "forest", 1);
      h.startCombat(["e4_satchelrat", "e4_satchelrat"], { e4raw: true });
      h.S.combat.foes[0].hp = 0;
      h.S.combat.foes[1].hp = 999; h.S.combat.foes[1].max = 999;
      h.combatAct("guard");
      if (!h.S.combat || !h.S.combat.foes.some((f) => f.hp > 0)) fled++;
    }
    if (!fled) F("群れが崩れても逃げない");
    // 庇う
    let guarded = 0;
    for (let s = 0; s < 20 && !guarded; s++) {
      const h = loadEngine();
      start(h, 200 + s);
      at(h, "w2_shadow", 1);
      h.startCombat(["e4_bellbat", "e4k_maskguard"], { e4raw: true });
      h.S.combat.foes.forEach((f) => { f.hp = f.max = 999; });
      h.combatAct("attack");
      if (h.S.log.some((l) => /庇った/.test(l.text || ""))) guarded++;
    }
    if (!guarded) F("仲間を庇う敵が庇わない");
    // 呼ぶ
    let called = 0;
    for (let s = 0; s < 30 && !called; s++) {
      const h = loadEngine();
      start(h, 300 + s);
      at(h, "w2_echo", 1);
      h.startCombat(["e4k_guiltdog"], { e4raw: true });
      for (let r = 0; r < 4 && h.S.combat; r++) { h.S.combat.foes.forEach((f) => { f.hp = f.max = 999; }); h.combatAct("guard"); }
      if (h.S.combat && h.S.combat.foes.length > 1) called++;
    }
    if (!called) F("仲間を呼ぶ敵が呼ばない");
  }

  // ---------------------------------------------------------------- 眷属
  const L3 = (D.E3 && D.E3.LIST) || {};
  for (const ap of Object.keys(L3)) {
    if (!(D.MAJIN || {})[ap] && !E4.CORE[ap]) continue; // 会える使徒（D.MAJIN の十三）と、眷属を持つ使徒
    const mine = kin.filter((id) => E[id].kinOf === ap);
    if (mine.length < 2) F(`使徒 ${ap} の眷属が ${mine.length} 種（2 以上）`);
    if (!E4.CORE[ap]) F(`使徒 ${ap} の縄張りの一行（D.E4.CORE）が無い`);
  }
  for (const id of kin) {
    const e = E[id];
    if (!L3[e.kinOf]) F(`${id}: 使徒 ${e.kinOf} がいない`);
    if (!(e.where || []).length || !e.where.every((l) => !D.LOCS[l] || (D.LOCS[l].e4pool || []).includes(id))) F(`${id}: 縄張りの出現表にいない`);
    if (!e.clue || !e.clue.text || !e.clue.memo) F(`${id}: 倒したときの手がかりが無い`);
  }
  {
    const g = loadEngine();
    const S = start(g, 14);
    at(g, "ruins", 1);
    const m0 = g.e3Mods("levian").frac;
    for (const id of ["e4k_inkling", "e4k_drowned"]) {
      g.startCombat([id], { e4raw: true });
      for (let i = 0; i < 40 && g.S.combat; i++) { g.S.combat.foes.forEach((x) => { if (x.hp > 0) x.hp = 1; }); g.combatAct("attack"); }
    }
    if (!S.memos.some((m) => /^手がかり：/.test(m))) F("眷属を倒しても手がかりが覚え書きに残らない");
    if (((S.e4kin || {}).levian || 0) < 2) F("縄張りの眷属を倒した数が数えられない");
    const m1 = g.e3Mods("levian");
    if (!(m1.frac > m0 && m1.e4core)) F("縄張りの眷属を二体退けても使徒が弱らない");
    if (!g.P.trophies.e4_core) F("縄張りを崩したトロフィーが付かない");
  }

  // ---------------------------------------------------------------- 行動と弱点
  for (const id of ids) {
    const e = E[id];
    if (!(e.acts || []).length && !e.weak) F(`${id}: 特徴のある行動も弱点も無い`);
    for (const a of e.acts || []) if (!ACTS.includes(a)) F(`${id}: 行動 ${a} が無い`);
    if (e.weak && !["blade", "fire", "ice", "bolt", "holy"].includes(e.weak)) F(`${id}: 弱点 ${e.weak} が無い`);
    if (e.call && !E[e.call]) F(`${id}: 呼ぶ敵 ${e.call} が無い`);
    if (e.pack && !(e.pack[0] >= 2 && e.pack[1] <= 4 && e.pack[0] <= e.pack[1])) F(`${id}: 群れの数 ${e.pack} が 2〜4 でない`);
  }
  {
    // 眠り・武器を落とす：その手番は動けない
    const g = loadEngine();
    start(g, 15);
    at(g, "forest", 3);
    g.startCombat(["e4_mosswisp"], { e4raw: true });
    g.S.combat.foes[0].hp = g.S.combat.foes[0].max = 999;
    g.S.combat.e4sleep = 1;
    g.combatAct("attack");
    if (g.S.combat.foes[0].hp !== 999 && !g.S.combat.foes[0].e4rage) F("眠っているのに攻撃できた");
    g.S.combat.e4sleep = 0; g.S.combat.e4disarm = 1;
    const hp = g.S.combat.foes[0].hp;
    g.combatAct("attack");
    if (g.S.combat && g.S.combat.foes[0].hp < hp) F("武器を落としたのに攻撃できた");
    // 弱点：上乗せのダメージ
    let weak = 0;
    for (let s = 0; s < 20 && !weak; s++) {
      const h = loadEngine();
      start(h, 400 + s);
      at(h, "forest", 3);
      h.S.mp = 99;
      h.startCombat(["e4_mosswisp"], { e4raw: true });
      h.S.combat.foes[0].hp = h.S.combat.foes[0].max = 999;
      h.combatAct("fire");
      if (h.S.log.some((l) => /炎に弱い/.test(l.text || ""))) weak++;
    }
    if (!weak) F("弱点の炎が上乗せされない");
  }
  // どの敵とも、例外なく戦える（行動を出しやすくするため HP を多めに）
  {
    let rounds = 0;
    const g = loadEngine();
    start(g, 16);
    g.S.companions = [{ name: "剣士のアル", cls: "剣士", power: 60, dmg: 2, desc: "無口", bond: 50 }];
    g.give("potion", 3); g.give("herb", 3);
    for (const id of ids) {
      at(g, E[id].kinOf ? E[id].where[0] : "forest", 3);
      g.S.hp = g.S.maxHp; g.S.gold = 200; g.S.conds = []; g.S.sanity = 100;
      try {
        g.startCombat([id, id], { e4raw: true });
        for (let i = 0; i < 12 && g.S.combat && !g.S.over; i++) { g.combatAct(i % 3 === 2 ? "fire" : "attack"); rounds++; }
        g.S.combat = null; g.S.mode = "explore";
      } catch (err) { F(`${id}: 戦うと例外 ${err.message}`); }
    }
    if (g.S.over) F("試しの戦いで死んだ（HP を足す）");
    if (!rounds) F("試しの戦いが一度も回らない");
  }

  // ---------------------------------------------------------------- 絵
  const art = JSON.parse(readFileSync(new URL("../../docs/art/monsters.json", import.meta.url), "utf8")).monsters || [];
  const tagged = new Map(art.map((m) => [m.id, m]));
  for (const id of ids) {
    if (!E[id].look || !E[id].look.body) F(`${id}: 絵の指定（look）が無い`);
    const m = tagged.get(id);
    if (!m || !m.tags) F(`${id}: docs/art/monsters.json にタグが無い`);
    else if (m.style === "eldritch") F(`${id}: 異形の設定を使っている`);
  }

  ok(`E4：地域の魔物 ${regional.length}（${Object.entries(byRg).map(([k, v]) => `${k} ${v.length}`).join("・")}）・強い個体 ${elders.length}・群れ ${packs.length}・眷属 ${kin.length}（使徒 ${new Set(kin.map((id) => E[id].kinOf)).size}）・夜/季節/天候で出る ${timed.length}`);
};
