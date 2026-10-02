// F2：アイテム図鑑と魔物図鑑（engine/f2_codex.js・data/f2_bestiary.js）
// - 手に入れると図鑑に載る／新しい冒険でも残る（死んでも）／古い profile に codex が無くても動く
// - 魔物は出会ったときと倒したときを分けて記録、倒した数も／会っただけなら性能の一部が「？」
// - 入手場所・出現場所がデータから引ける／全敵にフレーバー（2〜3 文、禁じた言葉なし）／使徒の性能は倒すまで伏せる
// - 古いセーブ（S.f2codex が無い）から一度だけ埋め直す／二つの図鑑をまとめられる
const BANNED = /見世物|観客|客席|舞台|台本|言霊|魔王|神々が/;

export default ({ fail, loadEngine, seeded }) => {
  const start = (G, seed) => {
    const D = G.data;
    G.rand = seeded(seed);
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 60]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  const killAll = (G) => {
    for (let i = 0; i < 60 && G.S.combat; i++) { G.S.combat.foes.forEach((f) => { if (f.hp > 0) f.hp = 1; }); G.combatAct("attack"); }
  };

  // ---- 手に入れると載る・新しい冒険でも残る・古い profile でも動く
  {
    const G = loadEngine();
    const D = G.data;
    G.P = { trophies: {}, graves: [] }; // 古い profile（codex が無い）
    const got = [];
    G.onCodex = (k, id) => got.push(k + ":" + id);
    start(G, 1);
    const c0 = G.codexCount();
    if (!c0.items) fail("持ち始めの品が図鑑に載らない");
    if (G.codexHasItem("fists")) fail("素手が図鑑に載った");
    G.give("gem");
    if (!G.codexHasItem("gem")) fail("手に入れた宝石が図鑑に載らない");
    if (!got.includes("item:gem")) fail("新しく埋まった項目の通知（G.onCodex）が来ない");
    if (!G.codexIsFresh("item", "gem")) fail("新しく埋まった項目に印が付かない");
    G.codexSeen("item", "gem");
    if (G.codexIsFresh("item", "gem")) fail("見たあとも印が残る");
    const rec = G.codex().items.gem;
    if (!rec.by || !rec.date) fail("初めて手に入れた冒険と日付が残らない");
    // 死んで、新しい冒険
    G.die("テスト");
    const P = JSON.parse(JSON.stringify(G.P)); // 保存して読み直したのと同じ
    const G2 = loadEngine();
    G2.P = P;
    start(G2, 2);
    if (!G2.codexHasItem("gem")) fail("新しい冒険で図鑑が消えた");
    if (G2.codex().items.gem.by !== rec.by) fail("初めて手に入れた記録が上書きされた");
  }

  // ---- 魔物：出会いと倒したのを分けて、倒した数も。会っただけなら一部が「？」
  {
    const G = loadEngine();
    G.P = { trophies: {}, graves: [] };
    start(G, 3);
    G.startCombat(["goblin"], {});
    const f = G.codexFoe("goblin");
    if (!f) fail("戦ったゴブリンが図鑑に載らない");
    else if (f.kills) fail("出会っただけで倒したことになっている");
    const rows = G.codexFoeStats("goblin");
    if (!rows.some(([, v]) => v === "？")) fail("会っただけの敵の性能が全部見えている");
    killAll(G);
    if (G.S.combat) fail("ゴブリンが倒れない");
    if ((G.codexFoe("goblin") || {}).kills !== 1) fail(`倒した数が 1 にならない（${(G.codexFoe("goblin") || {}).kills}）`);
    if (G.codexFoeStats("goblin").some(([, v]) => v === "？")) fail("倒した敵の性能に「？」が残る");
    G.startCombat(["goblin", "goblin"], {});
    killAll(G);
    if (G.codexFoe("goblin").kills !== 3) fail(`二匹倒しても数が増えない（${G.codexFoe("goblin").kills}）`);
    // 逃げた敵は倒したことにならない
    G.startCombat(["e1_crowngob"], {});
    for (let i = 0; i < 20 && G.S.combat; i++) { G.S.combat.foes[0].hp = 1; G.combatAct("guard"); }
    if ((G.codexFoe("e1_crowngob") || {}).kills) fail("逃げた敵を倒したことにしている");
  }

  // ---- 使徒は倒すまで性能を伏せる
  {
    const G = loadEngine();
    const D = G.data;
    G.P = { trophies: {}, graves: [] };
    start(G, 4);
    const apostles = Object.keys(D.ENEMIES).filter((id) => D.ENEMIES[id].majin);
    if (!apostles.length) fail("使徒がいない");
    for (const id of apostles) {
      if (!(D.F2_APOSTLE || {})[id]) fail(`使徒 ${id} に伝承の一行が無い`);
      G.codexMeet(id, true);
      if (G.codexFoeStats(id).length) fail(`使徒 ${id} の性能が、倒す前に見える`);
      if (G.codexFoeText(id) !== D.F2_APOSTLE[id]) fail(`使徒 ${id} の説明が伝承の一行になっていない`);
      G.codexKill(id, true);
      if (!G.codexFoeStats(id).length) fail(`使徒 ${id} を倒しても性能が見えない`);
    }
  }

  // ---- 入手場所・出現場所がデータから引ける
  {
    const G = loadEngine();
    const D = G.data;
    G.P = { trophies: {}, graves: [] };
    for (const id of G.f2.itemIds()) {
      const w = G.codexItemWhere(id);
      if (!w.length) fail(`アイテム ${id}: 入手場所が引けない`);
      if (w.length > 3) fail(`アイテム ${id}: 入手場所が 3 つを超える`);
      if (!G.codexItemStats(id).length) fail(`アイテム ${id}: 性能が引けない`);
    }
    for (const [lid, L] of Object.entries(D.LOCS)) for (const id of L.shop || []) if (!G.codexItemWhere(id, 99).some((t) => t.includes("商店"))) fail(`${id}: ${lid} の商店が入手場所に無い`);
    for (const [eid, e] of Object.entries(D.ENEMIES)) for (const [id] of e.loot || []) if (!G.codexItemWhere(id, 99).includes(`${e.name}が落とす`)) fail(`${id}: ${e.name}の落とし物が入手場所に無い`);
    if (!G.codexItemWhere("riceball", 99).some((t) => t.startsWith("出来事"))) fail("出来事でもらえる品の入手場所に出来事が無い");
    for (const id of G.f2.foeIds()) {
      if (!G.codexFoeWhere(id).length) fail(`敵 ${id}: 出現場所が引けない`);
      if (!G.f2.regions().includes(G.codexFoeRegion(id))) fail(`敵 ${id}: 地域が一覧に無い`);
    }
    if (!G.codexFoeWhere("kain").includes("エル・ナフ遺構の最奥")) fail("迷宮の主の出現場所が引けない");
    for (const [k] of G.f2.ITEM_KINDS) if (!G.f2.itemIds().some((id) => G.f2.kindOf(D.ITEMS[id]) === k)) fail(`種類 ${k} の品が無い`);
  }

  // ---- 全敵にフレーバー（2〜3 文。真相・禁じた言葉は書かない）
  {
    const G = loadEngine();
    const D = G.data;
    for (const id of Object.keys(D.ENEMIES)) {
      const t = (D.F2_BESTIARY || {})[id];
      if (!t) { fail(`敵 ${id}: 図鑑の説明が無い`); continue; }
      const n = (t.match(/。/g) || []).length;
      if (n < 2 || n > 4) fail(`敵 ${id}: 説明は 2〜3 文（${n} 文）`);
      if (BANNED.test(t)) fail(`敵 ${id}: 説明に「${t.match(BANNED)[0]}」`);
    }
    for (const [id, t] of Object.entries(D.F2_APOSTLE || {})) if (BANNED.test(t)) fail(`使徒 ${id}: 伝承に「${t.match(BANNED)[0]}」`);
    for (const id of Object.keys(D.F2_BESTIARY || {})) if (!D.ENEMIES[id]) fail(`図鑑の説明 ${id}: その敵がいない`);
  }

  // ---- 古いセーブから一度だけ埋め直す
  {
    const G = loadEngine();
    G.P = { trophies: {}, graves: [] };
    const S = start(G, 5);
    G.P = { trophies: {}, graves: [] };
    delete S.f2codex;
    S.inv.relic = 1;
    S.log.push({ k: "nar", text: "オーガを倒した！", fx: "down", foe: "オーガ" });
    S.log.push({ k: "nar", text: "大蜘蛛A、大蜘蛛Bが立ちはだかった！" });
    G.endTurn();
    if (!G.codexHasItem("relic")) fail("古いセーブの持ち物が図鑑に入らない");
    if (!(G.codexFoe("ogre") || {}).kills) fail("古いセーブの記録から倒した敵が入らない");
    if (!G.codexFoe("spider")) fail("古いセーブの記録から出会った敵が入らない");
    if (!S.f2codex) fail("埋め直しが一度で終わらない");
    const before = JSON.stringify(G.codex().foes);
    G.endTurn();
    if (JSON.stringify(G.codex().foes) !== before) fail("埋め直しが二度走った");
  }

  // ---- 二つの図鑑をまとめる（claude.ai のデータとこのブラウザ）
  {
    const G = loadEngine();
    const a = { items: { gem: { by: "A", at: 2 } }, foes: { goblin: { by: "A", at: 5, kills: 3 } } };
    const b = { items: { gem: { by: "B", at: 1 }, herb: { by: "B", at: 9 } }, foes: { goblin: { by: "B", at: 1, kills: 1 }, orc: { at: 3, kills: 0 } } };
    const m = G.codexMerge(a, b);
    if (m.items.gem.by !== "B" || !m.items.herb) fail("図鑑のアイテムをまとめられない（早いほうを残す）");
    if (m.foes.goblin.kills !== 3 || m.foes.goblin.by !== "B" || !m.foes.orc) fail("図鑑の魔物をまとめられない");
    if (!G.codexMerge(undefined, b).items.herb) fail("片方に図鑑が無いとまとめられない");
  }
};
