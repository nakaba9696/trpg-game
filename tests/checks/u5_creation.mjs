// U5：キャラクター作成（engine/u5_creation.js の G.cre を DOM なしで）
// - おまかせで作って、そのまま冒険を始められる
// - ボーナス点の合計が合う（振るたびに変わる。S2）・鍵が効く（振り直しても、鍵をかけた能力値に足したボーナス点が残る。LOCK_MAX まで）
// - 古いセーブ（年齢の区分・生まれが無い）でも導入が作れる
// - 導入と作成画面の文に、明かさない言葉が入っていない（#1 の持ち主の方針）
export default ({ G, fail: fail0, ok, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const D = G.data;
  const cre = G.cre;
  const rnd = seeded(6300);
  // 表の整合
  for (const [id, o] of Object.entries(D.ORIGINS)) {
    if (!D.PROFILE.names[o.culture]) fail(`生まれ ${id}: 名前の響き ${o.culture} が無い`);
    for (const k of Object.keys(o.mod || {})) if (!D.STATS.includes(k)) fail(`生まれ ${id}: 能力値 ${k} が無い`);
  }
  for (const [id, a] of Object.entries(D.AGES)) for (const k of Object.keys(a.mod || {})) if (!D.STATS.includes(k)) fail(`年齢 ${id}: 能力値 ${k} が無い`);
  for (const [c, o] of Object.entries(D.CLASS_ORIGIN)) if (!D.CLASSES[c] || !D.ORIGINS[o]) fail(`職業のはじめの生まれ ${c}→${o} が無い`);
  for (const c of Object.keys(D.CLASSES)) if (!(D.PROLOGUE.cls[c] || []).length) fail(`導入: 職業 ${c} の文が無い`);
  for (const g of Object.keys(D.GOALS)) if (!D.PROLOGUE.goal[g]) fail(`導入: 目的 ${g} の文が無い`);
  // 明かさない言葉（#1 の持ち主の方針）
  const BANNED = /見世物|観客|客席|舞台|台本|神々が(世界を)?眺め/;
  const scan = (where, t) => { if (BANNED.test(t)) fail(`${where}: 明かさない言葉が入っている「${t}」`); };
  for (const o of Object.values(D.ORIGINS)) { scan("生まれ", o.blurb); scan("生まれ", o.home); }
  for (const a of Object.values(D.AGES)) scan("年齢", a.blurb);
  scan("導入", JSON.stringify(D.PROLOGUE));
  // 導入は世界を説明しない：使徒の名前と「〇〇の使徒」を出さない（二つ名だけだと「契約」のような普通の言葉と重なる）。「神様は良い」と説く文を置かない
  const told = JSON.stringify([D.PROLOGUE, Object.values(D.ORIGINS).map((o) => [o.blurb, o.home])]);
  for (const m of Object.values(D.MAJIN || {})) for (const w of [m.name, m.title && `${m.title}の使徒`]) if (w && told.includes(w)) fail(`導入: 使徒の名「${w}」を出している`);
  if (/神(様|々)?は(良い|よい|善い|優しい)/.test(told)) fail("導入: 神を説明する文がある");

  // おまかせで作って、そのまま冒険を始められる（トロフィーの無い新しい記録で。トロフィーの分は u10_title.mjs）
  let made = 0;
  for (let i = 0; i < 60; i++) {
    G.P = { trophies: {}, graves: [] }; // 前の周で始めた冒険のトロフィーを持ち越さない
    const dr = cre.fresh(rnd);
    // ボーナス点を好きに振る（足せる所へ、足せなくなるまで）
    for (let n = 0; n < 40; n++) cre.addBonus(dr, D.STATS[Math.floor(rnd() * D.STATS.length)], rnd() < 0.8 ? 1 : -1);
    const pts = cre.bonusPoints(dr);
    if (cre.bonusUsed(dr) > pts || cre.bonusLeft(dr) < 0) fail(`作成 ${i}: ボーナス点の合計が合わない（${cre.bonusUsed(dr)}／${pts}）`);
    // 才能限界まで足せば使い切れる（限界までの余地がボーナス点より少ないときは、余地を全部埋める）
    while (cre.bonusLeft(dr) > 0) { const k = D.STATS.find((s) => cre.canAdd(dr, s)); if (!k) break; cre.addBonus(dr, k, 1); }
    const room = D.STATS.reduce((a, k) => a + cre.cap(dr, k) - cre.base(dr, k), 0);
    if (cre.bonusUsed(dr) !== Math.min(pts, room)) fail(`作成 ${i}: ボーナス点 ${pts} を使い切れない（${cre.bonusUsed(dr)}・余地 ${room}）`);
    const sumBase = D.STATS.reduce((a, k) => a + cre.base(dr, k), 0);
    if (cre.total(dr) !== sumBase + cre.bonusUsed(dr)) fail(`作成 ${i}: 合計が素の値＋補正＋ボーナスと合わない`);
    const o = cre.options(dr, rnd);
    for (const k of D.STATS) {
      if (!(o.stats[k] >= 4 && o.stats[k] <= G.statCap())) fail(`作成 ${i}: ${k} ${o.stats[k]} が範囲の外`);
    }
    if (!o.profile.name || !o.profile.age || !D.AGES[o.profile.ageBand] || !D.ORIGINS[o.profile.origin]) fail(`作成 ${i}: 人物設定が欠けている`);
    const [lo, hi] = D.AGES[o.profile.ageBand].range;
    const age = Number(o.profile.age);
    if (!(age >= lo && age <= hi)) fail(`作成 ${i}: 年齢 ${age} が ${D.AGES[o.profile.ageBand].name} の幅の外`);
    const pages = cre.prologue(o);
    if (pages.length < 3 || pages.some((pg) => !pg.length || pg.some((t) => !t || /undefined|\{/.test(t)))) fail(`作成 ${i}: 導入の文が欠けている ${JSON.stringify(pages)}`);
    pages.flat().forEach((t) => scan(`作成 ${i} の導入`, t));
    if (!pages[pages.length - 1].join("").includes(D.LOCS[D.CLASSES[o.cls].start].name)) fail(`作成 ${i}: 導入の最後に最初の町が出ない`);
    G.rand = seeded(6400 + i);
    G.P = { trophies: {}, graves: [] };
    try {
      G.newGame(o);
      for (let t = 0; t < 30 && !G.S.over; t++) { const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled); if (!acts.length) break; G.act(acts[Math.floor(G.rand() * acts.length)].id); }
      made++;
    } catch (e) { fail(`作成 ${i}: 冒険を始めて例外 ${e.stack || e}`); break; }
    if (G.S.profile.origin !== o.profile.origin || G.S.profile.ageBand !== o.profile.ageBand) fail(`作成 ${i}: 生まれ・年齢の区分がセーブに残らない`);
  }

  // 鍵：鍵をかけた能力値は、振り直しても足したボーナス点が残る（点が足りなければ減る）。鍵の無い能力値のボーナスは 0 に戻る。鍵は LOCK_MAX まで
  {
    const dr = cre.fresh(rnd);
    const [a, b, c, d4] = D.STATS;
    if (!cre.toggleLock(dr, a) || !cre.toggleLock(dr, b) || !cre.toggleLock(dr, c)) fail("鍵: 3 つかけられない");
    if (D.LOCK_MAX === 3 && cre.toggleLock(dr, d4)) fail("鍵: 4 つ目がかかる");
    dr.bonus = Object.fromEntries(D.STATS.map((k) => [k, 0]));
    cre.addBonus(dr, a, 1); cre.addBonus(dr, b, 1); cre.addBonus(dr, d4, 1);
    for (let n = 0; n < 200; n++) {
      cre.roll(dr, rnd);
      if (dr.bonus[a] !== 1 || dr.bonus[b] !== 1) { fail(`鍵: 鍵をかけた能力値のボーナスが振り直しで消えた（${dr.bonus[a]}・${dr.bonus[b]}）`); break; }
      if (dr.bonus[d4] !== 0) { fail("鍵: 鍵の無い能力値のボーナスが振り直しで残った"); break; }
      if (cre.bonusLeft(dr) < 0) { fail("鍵: 振り直したあと、ボーナス点の残りが負"); break; }
    }
    if (dr.rolls < 200) fail("鍵: 振り直しの回数に上限がある");
    cre.toggleLock(dr, a);
    if (!cre.toggleLock(dr, d4)) fail("鍵: 外したあと、別の能力値にかけられない");
  }

  // 年齢・生まれを変えると、限界を超えたボーナスは戻る
  {
    const dr = cre.fresh(rnd);
    dr.ageBand = "young"; cre.fit(dr);
    const k = D.STATS[0];
    while (cre.canAdd(dr, k)) cre.addBonus(dr, k, 1);
    cre.setAge(dr, "old", rnd);
    if (cre.value(dr, k) > cre.cap(dr, k) || cre.bonusLeft(dr) < 0) fail("年齢を変えたあと、上限かボーナス点の合計が崩れる");
  }

  // 古いセーブ（年齢の区分・生まれが無い）でも導入の文が作れる
  {
    const old = { cls: "merc", goal: { id: "rich", text: "大陸一の大金持ちになる" }, profile: { name: "ロイド", sex: "男", age: "45", history: "テスト用" } };
    try { const pg = cre.prologue(old); if (!pg.flat().join("").includes("膝は冷える")) fail("古いセーブ: 年齢から区分を推し量れない"); }
    catch (e) { fail("古いセーブ: 導入で例外 " + (e.stack || e)); }
  }
  if (!bad) ok(`キャラクター作成（おまかせで ${made} 人が旅立つ・ボーナス点・鍵 ${D.LOCK_MAX} つ・生まれ ${Object.keys(D.ORIGINS).length}・年齢 ${Object.keys(D.AGES).length}）`);
};
