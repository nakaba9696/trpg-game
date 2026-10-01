// D6：魔王と神々の設定（持ち主の決定）に合わせた見える文と、灰色の外套の旅人・昔の時代の断片の出来事
// - D6 の出来事は実在の場所で起きる。lore のきっかけは実在の行を指す
// - 旅人の出来事・用語説明に、正体や裏設定を表す言葉が出ない
// - 今の人は「魔王」を知らない：見える文に「魔王」が出るのは、昔の断片（夢の子ども・古い祈祷文）と、その用語説明だけ
// - 古い設定（ふて寝・魔王のいびき・七つの国）が、プレイヤーに見える文に残っていない。GM への説明は新しい設定になっている
// - 前に会ってから日が空くと、また出会う。二度目からは「前にも会った気がする」が添えられる。古いセーブでも動く
// - どの選択肢を選んでも止まらない
const REVEAL = /魔王|ガイゼリク|夜哭|魔物の王|正体|見世物|観客|客席|舞台|台本|神々|もういない/;
const OLD = /ふて寝|魔王のいびき|七つ潰|七つ滅/;
const TAGS = ["any", "town", "wild", "dungeon", "capital", "port", "snow", "realm"];

export default ({ fail, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const all = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const d6 = D.EVENTS.filter((e) => /^d6_/.test(e.id));
  const walkers = D.EVENTS.filter((e) => /^d6_w_/.test(e.id));
  if (walkers.length < 5) fail(`旅人の出来事が少ない（${walkers.length}）`);

  // ---- 実在の場所で起きる
  const locTags = (id) => {
    const L = D.LOCS[id];
    const t = ["any", L.type, id];
    if (L.capital) t.push("capital");
    if (L.sea) t.push("port");
    if (["frost", "garmund"].includes(id)) t.push("snow");
    if (["wasteland", "majincastle"].includes(id)) t.push("realm");
    return t;
  };
  for (const e of d6) {
    for (const w of e.where) if (!TAGS.includes(w) && !D.LOCS[w]) fail(`${e.id}: 場所 ${w} が無い`);
    if (!Object.keys(D.LOCS).some((id) => e.where.some((w) => locTags(id).includes(w)))) fail(`${e.id}: 起きる場所が一つも無い`);
  }

  // ---- lore のきっかけ
  const valid = (t) => { const [id, key] = String(t).split(":"); const x = D.LORE[id]; return !!x && (!key || x.lines.some((l) => l[0] === key)); };
  const outcomes = (e) => e.choices.flatMap((c) => [c.ok, c.ng, c.ok && c.ok.win, c.ng && c.ng.win, c.win]).filter(Boolean);
  for (const e of d6) all(e.lore).forEach((t) => valid(t) || fail(`${e.id}: lore ${t} が無い`));
  for (const e of d6) for (const o of outcomes(e)) all(o.lore).forEach((t) => valid(t) || fail(`${e.id}: lore ${t} が無い`));
  if (!D.LORE.d6_walker) fail("用語説明 d6_walker が無い");
  else if (!D.LORE_SECS.includes(D.LORE.d6_walker.sec)) fail(`用語説明 d6_walker: 節 ${D.LORE.d6_walker.sec} が LORE_SECS に無い`);

  // ---- 正体を表す言葉が見える文に出ない
  const texts = [];
  for (const e of walkers) {
    texts.push([e.id, e.title], [e.id, e.text]);
    e.choices.forEach((c, i) => {
      texts.push([`${e.id}[${i}]`, c.label]);
      for (const o of [c.ok, c.ng, c.ok && c.ok.win, c.ng && c.ng.win]) if (o) ["text", "memo", "chron"].forEach((k) => o[k] && texts.push([`${e.id}[${i}]`, o[k]]));
    });
  }
  if (D.LORE.d6_walker) { texts.push(["用語 d6_walker", D.LORE.d6_walker.title]); D.LORE.d6_walker.lines.forEach(([k, t]) => texts.push([`用語 d6_walker:${k}`, t])); }
  for (const [w, t] of texts) if (REVEAL.test(t)) fail(`旅人の文に「${t.match(REVEAL)[0]}」：${w}「${t.slice(0, 30)}…」`);

  // ---- 古い設定が見える文に残っていない。今の人の文に「魔王」が無い
  const seen = [];
  const outText = (w, o) => { if (!o) return; ["text", "memo", "chron"].forEach((k) => o[k] && seen.push([w, o[k]])); outText(w, o.win); };
  D.EVENTS.forEach((e) => { seen.push([e.id, e.title], [e.id, e.text]); e.choices.forEach((c) => { seen.push([e.id, c.label]); outText(e.id, c.ok); outText(e.id, c.ng); outText(e.id, c.win); }); });
  Object.entries(D.LORE).forEach(([id, x]) => { seen.push([`用語 ${id}`, x.title]); x.lines.forEach(([k, t]) => seen.push([`用語 ${id}:${k}`, t])); });
  (D.LORE_SECS || []).forEach((t) => seen.push(["用語の節", t]));
  (D.RUMORS || []).forEach((r, i) => seen.push(["噂" + i, r]));
  (D.AMBIENT || []).forEach((a) => seen.push([a.id, a.text]));
  seen.push(["WORLD.intro", D.WORLD.intro]);
  D.WORLD.all.forEach(([h, rows]) => { seen.push(["手引き", h]); rows.forEach(([k, v]) => seen.push(["手引き " + k, k + v])); });
  Object.values(D.MAJIN || {}).forEach((m) => m.rumor && seen.push(["MAJIN " + m.name, m.rumor]));
  const deep = (w, x) => { if (typeof x === "string") seen.push([w, x]); else if (Array.isArray(x)) x.forEach((y) => deep(w, y)); else if (x && typeof x === "object") Object.entries(x).forEach(([k, y]) => deep(w + "." + k, y)); };
  deep("M4", D.M4);
  Object.entries(D.ITEMS).forEach(([id, it]) => seen.push([id, (it.name || "") + (it.desc || "")]));
  Object.entries(D.ENEMIES).forEach(([id, e]) => { seen.push([id, (e.name || "") + (e.desc || "")]); deep(id + ".lines", e.lines); });
  Object.entries(D.LOCS).forEach(([id, L]) => seen.push([id, (L.name || "") + (L.desc || "")]));
  for (const [w, t] of seen) if (OLD.test(t)) fail(`見える文に古い設定「${t.match(OLD)[0]}」：${w}`);
  // 昔の断片（昔から生きている夢の子ども・古い祈祷文）と、その用語説明の項目だけは「魔王」と書いてよい
  const OLD_ERA = /^(v1_yuradream|d6_old_\w+|用語 maou(:\w+)?)$/;
  for (const [w, t] of seen) if (/魔王/.test(t) && !OLD_ERA.test(w)) fail(`今の人は魔王を知らないのに、見える文に「魔王」：${w}「${t.slice(0, 30)}…」`);
  const gm = D.LORE_GM.join("\n") + Object.values(D.MAJIN).map((m) => m.secret || "").join("\n");
  if (OLD.test(gm)) fail(`GM への説明に古い設定「${gm.match(OLD)[0]}」が残っている`);
  if (!/神々はもういない/.test(gm)) fail("GM への説明に「神々はもういない」が無い");
  if (!/魔王は幕引きの夜（ヴェルド暦元年）に死に/.test(gm)) fail("GM への説明に、昔の魔王が死んでいることが無い");
  if (!/今の人は魔王という存在そのものを知らない/.test(gm)) fail("GM への説明に、今の人は魔王を知らないことが無い");
  if (!/誰の命令でもない/.test(gm)) fail("GM への説明に、使徒の襲来は誰の命令でもないことが無い");
  if (/人に紛れて歩|人間の世界のそこらへんを普通に歩いている/.test(gm)) fail("GM への説明に、取りやめた「魔王は人に紛れて歩く」が残っている");
  if (!/今は中世/.test(gm) || !/オーパーツ/.test(gm)) fail("GM への説明に、技術は中世＋遺跡のオーパーツだということが無い");
  if (!/プレイヤーに明かさない/.test(gm)) fail("GM への説明に「プレイヤーに明かさない」が無い");

  // ---- 何度か出会う
  const newGame = (seed) => {
    const H = loadEngine();
    H.rand = seeded(seed);
    H.P = { trophies: {}, graves: [] };
    const E = H.data;
    const stats = Object.fromEntries(E.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(E.STATS.map((k) => [k, 80]));
    H.newGame({ cls: Object.keys(E.CLASSES)[0], stats, caps, goal: Object.keys(E.GOALS)[0], profile: { name: "テスト", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    H.S.gold = 100;
    return H;
  };
  {
    const H = newGame(7);
    const S = H.S;
    const town = Object.keys(H.data.LOCS).find((id) => H.data.LOCS[id].type === "town");
    S.loc = town;
    const inn = H.data.EVENTS.find((e) => e.id === "d6_w_inn");
    const brawl = H.data.EVENTS.find((e) => e.id === "d6_w_brawl");
    S.day = 5;
    if (inn.cond(S)) fail("旅人に、はじめの数日で会ってしまう");
    S.day = 20;
    if (!inn.cond(S)) fail("日がたっても旅人に会えない");
    H.startEvent(inn);
    if (S.counters.d6_walker !== 1 || S.counters.d6_last !== 20) fail("旅人に会った回数・日が数えられていない");
    H.chooseEvent(2);
    if (!S.lore.d6_walker) fail("旅人に会っても用語説明が開かない");
    S.day = 25;
    if (brawl.cond(S)) fail("会ってすぐに、また旅人に会ってしまう");
    S.day = 40;
    if (!brawl.cond(S)) fail("日が空いても、また旅人に会えない");
    const before = S.log.length;
    H.startEvent(brawl);
    if (!S.log.slice(before).some((l) => /前にも|どこかで見た|また、この人/.test(l.text || ""))) fail("二度目に会ったとき「前にも会った気がする」が無い");
    if (S.counters.d6_walker !== 2) fail("二度目に会った回数が数えられていない");
    H.chooseEvent(1);
    // 古いセーブ（数えた記録が無い）
    delete S.counters.d6_walker; delete S.counters.d6_last;
    if (!H.data.EVENTS.find((e) => e.id === "d6_w_coin").cond(S)) fail("古いセーブで旅人の出来事の条件が動かない");
  }

  // ---- どの選択肢を選んでも止まらない（場所はその出来事が起きる所）
  let seed = 100;
  for (const e of walkers) {
    e.choices.forEach((c, i) => {
      for (let k = 0; k < 3; k++) {
        const H = newGame(seed++);
        const S = H.S;
        const loc = Object.keys(H.data.LOCS).find((id) => e.where.some((w) => locTags(id).includes(w)));
        S.loc = loc;
        S.day = 60;
        try {
          if (!H.startEvent(e.id)) { fail(`${e.id}: 始まらない`); return; }
          H.chooseEvent(i);
          if (S.mode === "combat" || S.combat) { if (!S.combat) fail(`${e.id}[${i}]: 戦いが始まらない`); }
          else if (S.mode !== "explore" && !S.over) fail(`${e.id}[${i}]: 選んだあと探索に戻らない（${S.mode}）`);
        } catch (err) {
          fail(`${e.id}[${i}]: ${err.message}`);
        }
      }
    });
  }
};
