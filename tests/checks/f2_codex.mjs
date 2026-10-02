// F2：アイテム図鑑と魔物図鑑（engine/zz_f2_codex.js・data/f2_bestiary.js）
// - 手に入れると図鑑に載る／新しい冒険でも残る（死んでも）／古い profile に codex が無くても動く
// - 魔物は出会ったときと倒したときを分けて記録、倒した数も／会っただけなら性能の一部が「？」
// - 入手場所・出現場所がデータから引ける／全敵にフレーバー（2〜3 文、禁じた言葉なし）／使徒の性能は倒すまで伏せる
// - 人物：会うと載る・仲間になったこと・深く関わると説明が一行増える・新しい冒険でも残る・会える場所が引ける
// - 用語：開いた行は profile に残る。手引きに足すのは描くあいだだけ、今の冒険の行（強調に使う G.loreOf）には混ざらない
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
      G.codexMeet(id, true);
      if (G.codexFoeStats(id).length) fail(`使徒 ${id} の性能が、倒す前に見える`);
      const line = G.codexFoeText(id);
      if (!line || line === (D.F2_BESTIARY || {})[id]) fail(`使徒 ${id} の説明が、倒す前から伝承の一行になっていない`);
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
    // あとから足される敵（E3 など）は desc で代える。説明が一つも無い敵は不可
    for (const id of Object.keys(D.ENEMIES)) if (!(D.F2_BESTIARY || {})[id] && !D.ENEMIES[id].desc) fail(`敵 ${id}: 図鑑の説明が無い`);
    const mine = ["goblin", "wolf", "kain", "graw", "e1_crowngob", "w1_vespa", "c2_zork", "e2_mordu", "m5_oldbeast", "w2_ironwarden"];
    for (const id of mine) if (!(D.F2_BESTIARY || {})[id]) fail(`敵 ${id}: 図鑑の説明が無い`);
    for (const id of Object.keys(D.F2_BESTIARY || {})) {
      const t = D.F2_BESTIARY[id];
      const n = (t.match(/。/g) || []).length;
      if (n < 2 || n > 4) fail(`敵 ${id}: 説明は 2〜3 文（${n} 文）`);
      if (BANNED.test(t)) fail(`敵 ${id}: 説明に「${t.match(BANNED)[0]}」`);
    }
    for (const [id, t] of Object.entries(D.F2_APOSTLE || {})) if (BANNED.test(t)) fail(`使徒 ${id}: 伝承に「${t.match(BANNED)[0]}」`);
    for (const id of Object.keys(D.F2_BESTIARY || {})) if (!D.ENEMIES[id]) fail(`図鑑の説明 ${id}: その敵がいない`);
  }

  // ---- 人物：会うと載る・仲間・深く関わる・新しい冒険でも残る
  {
    const G = loadEngine();
    const D = G.data;
    G.P = { trophies: {}, graves: [] };
    const got = [];
    G.onCodex = (k, id) => got.push(k + ":" + id);
    start(G, 6);
    for (const id of Object.keys(D.C2_PEOPLE || {})) if (!(D.F2_PEOPLE || {})[id]) fail(`人物 ${id}: 図鑑の説明が無い`);
    for (const [id, q] of Object.entries(D.F2_PEOPLE || {})) {
      if (!q.title || !q.face || !(q.lines || []).length) fail(`人物 ${id}: 肩書き・人柄・説明のどれかが無い`);
      for (const t of [q.title, q.face, ...(q.lines || [])]) if (BANNED.test(t) || /〔/.test(t)) fail(`人物 ${id}: 説明に書かない言葉「${t}」`);
      for (const e of q.events || []) if (!D.EVENTS.some((x) => x.id === e)) fail(`人物 ${id}: 出来事 ${e} が無い`);
      if (q.fac && !D.LOCS[q.fac[0]]) fail(`人物 ${id}: 場所 ${q.fac[0]} が無い`);
      if (!G.codexPersonWhere(id).length) fail(`人物 ${id}: 会える場所が引けない`);
    }
    if (G.codexPerson("dil")) fail("会う前から載っている");
    G.c2Meet("dil");
    if (!G.codexPerson("dil") || !got.includes("person:dil")) fail("キャラメモの人に会っても図鑑に載らない");
    if (G.codexPersonLines("dil").length !== 1) fail("会っただけで二行目が見える");
    G.c2Join("dil");
    if (!G.codexPerson("dil").joined) fail("仲間になったことが残らない");
    if (G.codexPersonLines("dil").length !== 2) fail("仲間になっても二行目が見えない");
    // 名のある人：出来事で会う
    G.S.mode = "explore";
    G.startEvent("r1_elf_ledger");
    if (!G.codexPerson("hans")) fail("出来事で会った宿の主人が図鑑に載らない");
    if ((G.codexPerson("hans").ev || 0) < 1) fail("会った出来事の数が増えない");
    // 新しい冒険でも残る
    G.die("テスト");
    const G2 = loadEngine();
    G2.P = JSON.parse(JSON.stringify(G.P));
    start(G2, 7);
    if (!G2.codexPerson("dil") || !G2.codexPerson("dil").joined || !G2.codexPerson("hans")) fail("新しい冒険で人物図鑑が消えた");
  }

  // ---- 用語：profile に残る。強調（今の冒険の行）には混ざらない
  {
    const G = loadEngine();
    const D = G.data;
    G.P = { trophies: {}, graves: [] };
    start(G, 8);
    const id = Object.keys(D.LORE).find((x) => D.LORE[x].lines.length >= 1 && !(G.loreOf(G.S)[x] || []).length);
    const key = D.LORE[id].lines[0][0];
    G.openLore(`${id}:${key}`, true);
    if (!((G.P.loreSeen || {})[id] || []).includes(key)) fail("開いた用語が profile に残らない");
    if (G.codexLore()[id][key] !== "now") fail("今の冒険で開いた行が now にならない");
    G.die("テスト");
    const G2 = loadEngine();
    G2.P = JSON.parse(JSON.stringify(G.P));
    start(G2, 9);
    if (((G2.loreOf(G2.S)[id]) || []).includes(key)) fail("過去の冒険の用語が、今の冒険の行（強調に使う）に混ざった");
    if ((G2.codexLore()[id] || {})[key] !== "past") fail("過去の冒険で知った行が図鑑で読めない");
    const rows = (secs) => secs.flatMap(([, r]) => r.map((x) => x[1]));
    const text = D.LORE[id].lines[0][1];
    if (rows(G2.loreSections(G2.S)).includes(text)) fail("手引きを描いていないときにも過去の行が混ざる");
    G2.f2.withPast = true;
    const withPast = rows(G2.loreSections(G2.S));
    G2.f2.withPast = false;
    if (!withPast.includes(text) || !G2.f2.pastTexts.has(text)) fail("手引きに過去の冒険の行が出ない");
    if (G2.data.WORLD.sections.flatMap(([, r]) => r).some((x) => x && x[1] === text)) fail("手引きの表（GM・強調が読む）に過去の行が混ざった");
    const m = G2.codexMergeLore({ a: ["x"] }, { a: ["y"], b: ["z"] });
    if (m.a.length !== 2 || !m.b) fail("用語の記録をまとめられない");
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
