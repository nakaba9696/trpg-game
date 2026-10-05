// U5：キャラクター作成（engine/u5_creation.js の G.cre を DOM なしで）
// - おまかせで作って、そのまま冒険を始められる
// - ボーナス点の合計が合う（5 点＋トロフィー。S2）・鍵は無い（振り直しは初期値のダイスを振り直す。古い下書きの locks は効かない）
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
  // 導入は状況の概要の 3 頁（持ち主の決定。V12 で厚く）：世界の今・あなたは誰か・今どこにいて何を目指すか。目的ごとの情景の挿話は持たない
  for (const k of ["who", "whoNoOrigin", "arrive", "arriveHome", "goal", "custom", "close", "pastNone"]) if (typeof D.PROLOGUE[k] !== "string") fail(`導入: ${k} の文が無い`);
  if (!Array.isArray(D.PROLOGUE.world) || D.PROLOGUE.world.length < 3) fail("導入: 世界の今（world）の文が無い");
  for (const id of Object.keys(D.ORIGINS)) if (!(D.PROLOGUE.life[id] || []).length) fail(`導入: 生まれ ${id} の暮らしの文が無い`);
  for (const c of Object.keys(D.CLASSES)) for (const a of Object.keys(D.AGES)) if (!(D.PROLOGUE.past[c] || {})[a]) fail(`導入: 職業 ${c}・年齢 ${a} の、冒険者になったわけの文が無い`);
  for (const k of ["cls", "age", "goals", "scene"]) if (D.PROLOGUE[k]) fail(`導入: 使わなくなった ${k} の文が残っている`);
  // 地の文に「！」を使わない
  if (/[！!]/.test(JSON.stringify(D.PROLOGUE))) fail("導入: 「！」がある");
  for (const [id, o] of Object.entries(D.ORIGINS)) if (o.home) fail(`生まれ ${id}: 導入の思い出（home）が残っている`);
  // 明かさない言葉（#1 の持ち主の方針）
  const BANNED = /見世物|観客|客席|舞台|台本|神々が(世界を)?眺め/;
  const scan = (where, t) => { if (BANNED.test(t)) fail(`${where}: 明かさない言葉が入っている「${t}」`); };
  for (const o of Object.values(D.ORIGINS)) scan("生まれ", o.blurb);
  for (const a of Object.values(D.AGES)) scan("年齢", a.blurb);
  scan("導入", JSON.stringify(D.PROLOGUE));
  // 導入は世界を説明しない：使徒の名前と「〇〇の使徒」を出さない（二つ名だけだと「契約」のような普通の言葉と重なる）。「神様は良い」と説く文を置かない
  const told = JSON.stringify([D.PROLOGUE, Object.values(D.ORIGINS).map((o) => o.blurb)]);
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
    // 全部使い切れる（上限は無い）
    while (cre.bonusLeft(dr) > 0) { const k = D.STATS.find((s) => cre.canAdd(dr, s)); if (!k) break; cre.addBonus(dr, k, 1); }
    if (cre.bonusUsed(dr) !== pts) fail(`作成 ${i}: ボーナス点 ${pts} を使い切れない（${cre.bonusUsed(dr)}）`);
    const sumBase = D.STATS.reduce((a, k) => a + cre.base(dr, k), 0);
    if (cre.total(dr) !== sumBase + cre.bonusUsed(dr)) fail(`作成 ${i}: 合計が素の値＋補正＋ボーナスと合わない`);
    const o = cre.options(dr, rnd);
    for (const k of D.STATS) {
      if (!(o.stats[k] >= D.S2.MIN * D.S2.PCT && o.stats[k] === cre.value(dr, k) * D.S2.PCT)) fail(`作成 ${i}: ${k} ${o.stats[k]} が範囲の外`);
    }
    if (!o.profile.name || !o.profile.age || !D.AGES[o.profile.ageBand] || !D.ORIGINS[o.profile.origin]) fail(`作成 ${i}: 人物設定が欠けている`);
    const [lo, hi] = D.AGES[o.profile.ageBand].range;
    const age = Number(o.profile.age);
    if (!(age >= lo && age <= hi)) fail(`作成 ${i}: 年齢 ${age} が ${D.AGES[o.profile.ageBand].name} の幅の外`);
    const pages = cre.prologue(o);
    if (pages.length !== 3 || pages.some((pg) => !pg.length || pg.length > 5 || pg.some((t) => !t || /undefined|\{/.test(t)))) fail(`作成 ${i}: 導入が状況の概要の 3 頁になっていない ${JSON.stringify(pages)}`);
    pages.flat().forEach((t) => scan(`作成 ${i} の導入`, t));
    {
      // 誰か（名前・年齢・職業・生まれ）・どこにいるか（出発地）・何を目指すか（目的の文だけ）
      const all = pages.flat().join("");
      const want = [o.profile.name, `${o.profile.age}歳`, D.CLASSES[o.cls].name, D.ORIGINS[o.profile.origin].name, D.LOCS[D.CLASSES[o.cls].start].name, o.goalText.replace(/[。．.]+$/, "")];
      for (const w of want) if (!all.includes(w)) fail(`作成 ${i}: 導入に「${w}」が無い ${all}`);
      if (all.length > 900) fail(`作成 ${i}: 導入が長い（${all.length} 字。概要だけにする）`);
      // 行き先・手順のヒントを書かない（目的の文は除いて調べる）。年齢のほかに数字を出さない
      const rest = all.replace(o.goalText.replace(/[。．.]+$/, ""), "");
      const HINT = /竜の墓場|鬼ヶ島|ヴォルグリム|白夜|エンバルダ|灰の荒野|騎士|領主|王位|絶界/;
      if (HINT.test(rest)) fail(`作成 ${i}: 導入に行き先・手順のヒント「${rest.match(HINT)[0]}」`);
      if (/[0-9０-９]/.test(rest.replace(`${o.profile.age}歳`, ""))) fail(`作成 ${i}: 導入に数字がある ${rest}`);
    }
    G.rand = seeded(6400 + i);
    G.P = { trophies: {}, graves: [] };
    try {
      G.newGame(o);
      for (let t = 0; t < 30 && !G.S.over; t++) { const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled); if (!acts.length) break; G.act(acts[Math.floor(G.rand() * acts.length)].id); }
      made++;
    } catch (e) { fail(`作成 ${i}: 冒険を始めて例外 ${e.stack || e}`); break; }
    if (G.S.profile.origin !== o.profile.origin || G.S.profile.ageBand !== o.profile.ageBand) fail(`作成 ${i}: 生まれ・年齢の区分がセーブに残らない`);
  }

  // 鍵は無い：振り直しは初期値（ダイス）を振り直す。何度でもできる。足したボーナスは 0 に戻る。古い下書きの locks は効かない
  {
    if (cre.toggleLock || cre.lockCount || D.LOCK_MAX !== undefined) fail("鍵の仕組みが残っている");
    const dr = cre.fresh(rnd);
    dr.locks = { [D.STATS[0]]: true }; // 古い下書き
    const seen = new Set();
    for (let n = 0; n < 200; n++) {
      while (cre.bonusLeft(dr) > 0 && cre.canAdd(dr, D.STATS[n % 6])) cre.addBonus(dr, D.STATS[n % 6], 1);
      const keep = dr.rolled[D.STATS[0]];
      cre.roll(dr, rnd);
      seen.add(dr.rolled[D.STATS[0]]);
      if (cre.bonusUsed(dr) !== 0) { fail("振り直したあと、ボーナスが戻らない"); break; }
      if (n === 199 && seen.size < 8) fail(`鍵: 古い locks で初期値が固まった（${keep}）`);
    }
    if (dr.rolls < 200) fail("振り直しの回数に上限がある");
  }

  // 年齢・生まれを変えても、ボーナスの合計は崩れない
  {
    const dr = cre.fresh(rnd);
    dr.ageBand = "young"; cre.fit(dr);
    const k = D.STATS[0];
    while (cre.canAdd(dr, k)) cre.addBonus(dr, k, 1);
    cre.setAge(dr, "old", rnd);
    if (cre.value(dr, k) > cre.cap(dr, k) || cre.bonusLeft(dr) < 0) fail("年齢を変えたあと、上限かボーナス点の合計が崩れる");
  }

  // 古いセーブ（年齢の区分・生まれが無い）でも導入の文が作れる。「自分で決める」目的は書いた文をそのまま使う
  {
    const old = { cls: "merc", goal: { id: "rich", text: "大陸一の大金持ちになる" }, profile: { name: "ロイド", sex: "男", age: "45", history: "テスト用" } };
    try { const t = cre.prologue(old).flat().join(""); if (!t.includes("ロイド") || !t.includes("45歳") || !t.includes("大陸一の大金持ちになる") || /undefined|\{/.test(t)) fail(`古いセーブ: 導入が崩れる ${t}`); }
    catch (e) { fail("古いセーブ: 導入で例外 " + (e.stack || e)); }
    const mine = cre.prologue({ cls: "thief", goal: "custom", goalText: "生き別れの妹を探し出す", profile: { name: "ミア", age: "19", origin: "nerva" } }).flat().join("");
    if (!mine.includes("「生き別れの妹を探し出す」")) fail(`自分で決めた目的が導入にそのまま出ない ${mine}`);
  }
  if (!bad) ok(`キャラクター作成（おまかせで ${made} 人が旅立つ・ボーナス点・生まれ ${Object.keys(D.ORIGINS).length}・年齢 ${Object.keys(D.AGES).length}）`);
};
