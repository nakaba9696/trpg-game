// U7：世界の手引き（用語集）は、物語で出てきたものだけ載せる
// - 新しく始めた直後に載るのは、出発の町・冒険者ギルド・金貨と暦（と判定のしくみ）だけ。intro は短い
// - 町に着く・戦闘・教会・遺跡の品・術などのきっかけで、項目が増える（「手引きに書き足された」と出る）
// - GM に渡す世界の説明は今までどおり全部
// - 古いセーブ（S.u7lore が無い）は、訪れた場所から静かに開き直す
// - 150 回のランダムな遊びの終わりには、いくつも開いている
const PROFILE = { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" };
const MOVED = ["大陸", "レオネスト王国", "ノルディア帝国", "エルメシア共和国", "自由都市連合", "シェルアーク", "三国の協定", "人と種族", "光天教会", "遺跡の品", "格", "術", "凶暴な魔物", "間の抜けた魔物"];

export default ({ fail, loadEngine, seeded }) => {
  const start = (G, cls, goal) => {
    const D = G.data;
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; caps[k] = stats[k] + 30; });
    return G.newGame({ cls, stats, caps, goal: goal || Object.keys(D.GOALS)[0], profile: { ...PROFILE } });
  };
  const rows = (G) => G.data.WORLD.sections.flatMap(([, r]) => r.map(([k]) => k)).filter(Boolean);

  // ---- はじめは最小限
  {
    const G = loadEngine();
    const D = G.data;
    if (!D.WORLD.intro || D.WORLD.intro.length > 90) fail(`intro が長い（${(D.WORLD.intro || "").length} 字）`);
    if (/三つの大国|協定|教会|エルフ/.test(D.WORLD.intro)) fail("intro が世界の大枠を説明している");
    if (!D.RULES_TEXT) fail("判定のしくみが無い");
    for (const cls of Object.keys(D.CLASSES)) {
      G.rand = seeded(5);
      const S = start(G, cls);
      const r = rows(G);
      const home = D.LOCS[D.CLASSES[cls].start].name;
      if (!r.includes(home)) fail(`${cls}: 出発の町「${home}」の一行が無い`);
      if (!r.includes("冒険者ギルド") || !r.includes("金貨と暦")) fail(`${cls}: 冒険者ギルド・金貨と暦が無い`);
      const extra = r.filter((k) => ![home, "冒険者ギルド", "金貨と暦"].includes(k));
      if (extra.length > 1) fail(`${cls}: はじめから手引きに載る項目が多い：${extra.join("・")}`);
      const moved = r.filter((k) => MOVED.includes(k));
      if (moved.length) fail(`${cls}: はじめから物語で開くはずの項目が見える：${moved.join("・")}`);
      if (Object.keys(S.lore).some((id) => id.startsWith("u7_"))) fail(`${cls}: はじめから U7 の項目が開いている`);
    }
  }

  // ---- 作成画面と冒頭の文は、世界の大枠を説明しない（三国の関係・協定・世界の成り立ち・教会の教え・格・術の成り立ち）
  {
    const G = loadEngine();
    const D = G.data;
    const texts = [["WORLD.intro", D.WORLD.intro]];
    const put = (w, t) => { if (t) texts.push([w, typeof t === "string" ? t : JSON.stringify(t)]); };
    Object.entries(D.CLASSES).forEach(([k, c]) => put(`職業 ${k}`, c.blurb));
    Object.entries(D.GOALS).forEach(([k, g]) => { put(`目的 ${k}`, g.text); put(`目的 ${k}`, g.hint); });
    Object.entries(D.AGES || {}).forEach(([k, a]) => put(`年齢 ${k}`, a.blurb));
    Object.entries(D.ORIGINS || {}).forEach(([k, o]) => { put(`生まれ ${k}`, o.blurb); put(`生まれ ${k}`, o.home); });
    Object.entries(D.RACES || {}).forEach(([k, r]) => put(`種族 ${k}`, r.blurb));
    Object.entries(D.BEASTS || {}).forEach(([k, b]) => { put(`獣 ${k}`, b.blurb); put(`獣 ${k}`, b.temper); });
    put("導入", D.PROLOGUE);
    put("種族の導入", D.R1_TEXT && D.R1_TEXT.prologue);
    Object.values(D.CLASSES).forEach((c) => put(`出発の町 ${c.start}`, D.LOCS[c.start].desc));
    // はじめの手番の地の文（新しく始めた直後の記録）
    G.rand = seeded(2);
    start(G, "mage");
    G.S.log.forEach((e) => put("はじめの記録", e.text));
    const BAD = /協定|三国|三大国|三つの大国|盟主が代わ|精霊と契約|契約のある|議席|世界を作|創世|父なる神|悪魔のもの|天災|国難|魔物界|使徒領|人の世界|後継を争|刺客を放ち/;
    texts.forEach(([w, t]) => { const m = String(t).match(BAD); if (m) fail(`${w}：世界の大枠を説明している「${m[0]}」`); });
  }

  // ---- GM には全部
  {
    const G = loadEngine();
    const p = G.data.worldPrompt();
    for (const k of ["レオネスト王国", "三国の協定", "光天教会", "遺跡の品", "格", "術", "間の抜けた魔物", "三つの大国"]) if (!p.includes(k)) fail(`GM への世界の説明に「${k}」が無い`);
  }

  // ---- きっかけで増える
  {
    const G = loadEngine();
    const D = G.data;
    G.rand = seeded(9);
    const S = start(G, "merc");
    const has = (k) => rows(G).includes(k);
    const noted = (k) => S.log.some((e) => e.text === `手引きに書き足された：${k}`);
    G.endTurn();
    if (!has("自由都市連合") || !noted("自由都市連合")) fail("出発の町（ブランデール）で一手番すぎても「自由都市連合」が開かない／書き足されたと出ない");
    if (has("レオネスト王国")) fail("王国の町に着く前に「レオネスト王国」が見える");
    G.arrive("leavel"); G.endTurn();
    if (!has("レオネスト王国") || !(S.lore.u7_leonest || []).includes("king")) fail("王都に着いても「レオネスト王国」（王の行）が開かない");
    if (!has("大陸") && S.counters.travels) fail("旅をしても「大陸」が開かない");
    if (has("光天教会")) fail("教会に入る前に「光天教会」が見える");
    G.exploreAct("fac", "church");
    if (!has("光天教会") || !noted("光天教会")) fail("教会に入っても「光天教会」が開かない");
    S.mode = "explore"; S.fac = null;
    if (has("凶暴な魔物")) fail("戦う前に「凶暴な魔物」が見える");
    G.startCombat(["goblin"], {});
    if (!has("凶暴な魔物")) fail("ゴブリンと戦っても「凶暴な魔物」が開かない");
    if (has("格")) fail("ゴブリンで「格」が開く");
    S.mode = "explore"; S.combat = null;
    G.startCombat(["oni"], {});
    if (!has("格")) fail("格の高い敵（鬼）に会っても「格」が開かない");
    S.mode = "explore"; S.combat = null;
    G.startCombat(["dogu"], {});
    if (!has("間の抜けた魔物") || !(S.lore.u7_silly || []).includes("dogu")) fail("ドグーに会っても「間の抜けた魔物」が開かない");
    S.mode = "explore"; S.combat = null;
    G.give("relic");
    if (!has("遺跡の品")) fail("古代の遺物を拾っても「遺跡の品」が開かない");
    G.memo("酒場の噂：南の海のシェルアークには、鬼の島があるらしい");
    if (!has("シェルアーク")) fail("シェルアークの噂（memo）を聞いても「シェルアーク」が開かない");
    G.arrive("zephara"); G.endTurn();
    if (!has("エルメシア共和国") || !(S.lore.u7_races || []).includes("elf")) fail("共和国の都に着いても「エルメシア共和国」「人と種族（エルフ）」が開かない");
    // 同じ見出しの節は一つにまとまる
    const titles = D.WORLD.sections.map(([t]) => t);
    if (new Set(titles).size !== titles.length) fail(`手引きの節の見出しが重なる：${titles.join("・")}`);
    // 術：術を学んでいれば、使ったときに開く
    const G2 = loadEngine();
    G2.rand = seeded(3);
    const S2 = start(G2, "mage");
    if (rows(G2).includes("術")) fail("魔法使いでも、始めた直後に「術」が見える");
    G2.endTurn();
    if (!rows(G2).includes("術")) fail("魔法使いが一手番すぎても「術」が開かない");
    if (!S2.lore.u7_jutsu) fail("術の行が S.lore に無い");
  }

  // ---- 古いセーブ：訪れた場所から静かに開き直す
  {
    const G = loadEngine();
    G.rand = seeded(4);
    const S = start(G, "merc");
    G.endTurn();
    S.visited.garmund = true; S.visited.w1_holy = true;
    S.memos.push("酒場の噂：三国の協定の結び直しが近い");
    delete S.u7lore;
    delete S.lore;
    const before = S.log.length;
    const r = rows(G);
    for (const k of ["自由都市連合", "ノルディア帝国", "光天教会", "三国の協定"]) if (!r.includes(k)) fail(`古いセーブで「${k}」が開き直らない`);
    if (S.log.length !== before) fail("古いセーブの開き直しで、書き足されたと出てしまう");
    if (!S.u7lore) fail("開き直したあとに S.u7lore が付かない");
  }

  // ---- ランダムに遊ぶと、いくつも開く
  {
    const G = loadEngine();
    const D = G.data;
    const GAMES = Number(process.env.GAMES || 150), STEPS = 150;
    let total = 0, few = 0;
    const seen = new Set();
    for (let g = 0; g < GAMES; g++) {
      G.rand = seeded(7000 + g);
      start(G, Object.keys(D.CLASSES)[g % 5], Object.keys(D.GOALS)[g % 4]);
      try {
        for (let step = 0; step < STEPS && !G.S.over; step++) {
          const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
          if (!acts.length) break;
          G.act(acts[Math.floor(G.rand() * acts.length)].id);
        }
      } catch (e) { fail(`game ${g}: 例外 ${e.stack || e}`); break; }
      const ids = Object.keys(G.S.lore || {}).filter((id) => id.startsWith("u7_"));
      ids.forEach((id) => seen.add(id));
      total += ids.length;
      if (ids.length < 2) few++;
    }
    const avg = total / GAMES;
    console.log(`NOTE U7：ランダムに ${GAMES} 回遊んだ終わりに開いていた手引きの項目 平均 ${avg.toFixed(1)}・二つ未満 ${few} 回・一度でも開いた ${seen.size}/${Object.keys(D.LORE).filter((id) => id.startsWith("u7_")).length}`);
    if (avg < 3) fail(`ランダムに遊んでも、手引きの項目があまり開かない（平均 ${avg.toFixed(1)}）`);
    if (few > GAMES / 4) fail(`ランダムに遊んで、手引きの項目が二つ未満のままの冒険が多い（${few}/${GAMES}）`);
    if (seen.size < 8) fail(`ランダムに遊んで一度でも開いた項目が少ない（${seen.size}）`);
  }
};
