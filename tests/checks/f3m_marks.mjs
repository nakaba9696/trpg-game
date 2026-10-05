// F3：能力値の節目
// - 節目のデータ（能力値ごとに段の数だけ名と「できること」）がそろっている。選択肢の型・手書き・施設が、ある節目と出来事を指している
// - 能力値が節目を越えると、記録（S.f3m.marks）に残り、ログに名が出る。はじめから届いていた節目は知らせない（古いセーブも）
// - 節目に届くまで、その選択肢は出ない（一つだけうっすら見える）。届くと選べる。装備の補正で届いても開く
// - 施設の「鍛えた腕で」は一つの施設で一日に一度
// - 足したすべての選択肢が選べて、結果の文に内部の数が無い
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const F3 = D.F3M;
  const API = G.f3m;
  if (!F3 || !API) { fail("F3 の節目（D.F3M・G.f3m）が無い"); return; }

  // ---------------------------------------------------------------- データ
  for (const k of D.STATS) {
    const l = F3.MARKS[k] || [];
    if (l.length !== F3.TIERS.length) fail(`${k} の節目が ${l.length} 段（${F3.TIERS.length} 段のはず）`);
    l.forEach((m, t) => { if (!m.name || !m.gain) fail(`${k} の節目 ${t} に名か「できること」が無い`); });
    if ((F3.HINT[k] || []).length !== F3.TIERS.length) fail(`${k} の節目の添え言葉が足りない`);
  }
  const cats = Object.keys(D.C10_CATS || {});
  F3.TPL.forEach((t) => { if (!cats.includes(t.cat)) fail(`F3 の型「${t.label}」の種類 ${t.cat} が無い`); });
  Object.keys(F3.ADD).forEach((id) => { if (!D.EVENTS.some((e) => e.id === id)) fail(`F3 の手書きの選択肢が、無い出来事 ${id} を指している`); });
  const facs = new Set(Object.values(D.LOCS).flatMap((L) => L.fac || []));
  Object.keys(F3.FAC).forEach((f) => { if (!facs.has(f)) fail(`F3 の施設 ${f} がどの町にも無い`); });

  const evs = D.EVENTS.filter((e) => (e.choices || []).some((c) => c.f3m));
  const all = evs.flatMap((e) => e.choices.map((c, i) => ({ e, c, i })).filter((x) => x.c.f3m));
  if (evs.length < 40) fail(`節目の選択肢がある出来事が ${evs.length} 件（40 件以上のはず）`);
  const perStat = {};
  all.forEach(({ c }) => { const k = c.f3m.split(":")[0]; perStat[k] = (perStat[k] || 0) + 1; });
  for (const k of D.STATS) if (!perStat[k]) fail(`${k} の節目で開く出来事の選択肢が無い`);

  // ---------------------------------------------------------------- 遊びの準備
  const low = Object.fromEntries(D.STATS.map((k) => [k, 10]));
  const start = (stats, seed = 3) => {
    G.rand = seeded(seed);
    G.newGame({ cls: "merc", stats: { ...low, ...(stats || {}) }, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.gold = 500; S.companions = []; S.weapon = "longsword"; S.armor = ""; S.ring = "";
    return S;
  };
  const list = () => G.actions().flatMap((g) => g.list);

  // ---------------------------------------------------------------- 節目を越えると記録とログ
  {
    const S = start({ 筋力: 19 });
    G.grow("筋力", 12);
    if (S.stats.筋力 < 20) fail(`筋力が伸びない（${S.stats.筋力}）`);
    else {
      if (!(S.f3m && S.f3m.marks["筋力:0"] > 0)) fail("筋力が節目を越えても記録に残らない");
      if (!S.log.some((e) => e.k === "grow" && e.text.includes(F3.MARKS.筋力[0].name))) fail("節目を越えても、ログに名が出ない");
    }
    // はじめから届いていた節目は知らせない
    const T = start({ 知力: 33 });
    const n0 = T.log.filter((e) => e.k === "grow").length;
    G.grow("体力", 0.1);
    if (!(T.f3m && "知力:1" in T.f3m.marks && T.f3m.marks["知力:1"] === 0)) fail("はじめから届いていた節目が、記録に（知らせずに）残らない");
    if (T.log.filter((e) => e.k === "grow").length !== n0) fail("はじめから届いていた節目を、伸びたときに知らせる");
    // 古いセーブ（S.f3m が無い）でも動く
    delete T.f3m;
    const v = API.view(T);
    if (v.length !== D.STATS.length || !v.find((r) => r.stat === "知力").got.length) fail("古いセーブで節目の一覧が作れない");
  }

  // ---------------------------------------------------------------- 届くまで出ない・届くと選べる・装備で届いても開く
  {
    const S = start();
    S.mode = "event"; S.event = "toll";
    const re = /倒木を一人で担いで/;
    if (list().some((a) => re.test(a.label) && !a.locked)) fail("筋力が低いのに、剛力の選択肢が選べる");
    S.stats.筋力 = F3.TIERS[1];
    const a = list().find((x) => re.test(x.label) && !x.locked);
    if (!a) fail("剛力に届いても、通行料の出来事に剛力の選択肢が出ない");
    else if (!a.sub || !a.sub.includes(F3.MARKS.筋力[1].name)) fail(`剛力の選択肢に節目の名が添えられない（${a.sub}）`);
    // 装備の補正で届く
    S.stats.筋力 = F3.TIERS[1] - 1;
    const ring = Object.keys(D.ITEMS).find((id) => D.ITEMS[id].type === "ring" && (D.ITEMS[id].stats || {}).筋力 >= 6);
    if (ring) { S.ring = ring; if (!list().some((x) => re.test(x.label) && !x.locked)) fail(`筋力の指輪（${ring}）で剛力に届いても、選択肢が開かない`); S.ring = ""; }
    // うっすら見せる（選択肢の少ない出来事で）
    const ev = evs.find((e) => e.choices.filter((c) => !c.f3m && !c.c10).length <= 2);
    if (ev) {
      const T = start();
      T.mode = "event"; T.event = ev.id;
      const lk = list().filter((x) => /^f3mlock:/.test(x.id));
      if (lk.length !== 1) fail(`出来事 ${ev.id} で、まだ届かない節目の選択肢が ${lk.length} 個うっすら見える（1 個のはず）`);
      else if (!lk[0].disabled || !lk[0].sub || /\d/.test(lk[0].sub)) fail(`うっすらの選択肢が押せるか、添え言葉が変（${lk[0].sub}）`);
    }
  }

  // ---------------------------------------------------------------- 施設：一日に一度
  {
    const town = Object.keys(D.LOCS).find((id) => (D.LOCS[id].fac || []).includes("train"));
    const S = start({ 筋力: 30 });
    S.loc = town; S.mode = "fac"; S.fac = "train";
    const f = list().find((a) => /^f3mf:/.test(a.id) && !a.disabled);
    if (!f) fail("剛力なのに、訓練場に「鍛えた腕で」の行動が無い");
    else {
      G.act(f.id);
      if (S.mode !== "fac" && !S.over) fail("「鍛えた腕で」をしたら施設から出てしまった");
      const again = list().find((a) => a.id === f.id);
      if (!again || !again.disabled) fail("「鍛えた腕で」が一日に何度もできる");
    }
    const T = start(); T.loc = town; T.mode = "fac"; T.fac = "train";
    if (list().some((a) => /^f3mf:/.test(a.id))) fail("節目に届いていないのに「鍛えた腕で」が出る");
  }

  // ---------------------------------------------------------------- 足した選択肢がすべて壊れていない
  const NUM = /名声|悪名|罪の匂い|成功率|善行|\d/;
  const high = Object.fromEntries(D.STATS.map((k) => [k, 60]));
  let n = 0;
  for (const { e, c, i } of all) {
    for (const o of [c.ok, c.ng]) if (o && NUM.test(o.text || "")) fail(`${e.id}「${c.label}」：文に内部の数・言葉がある`);
    if (!c.ok || !c.ok.text) fail(`${e.id}「${c.label}」：結果の文が無い`);
    if (c.stat && !c.ng) fail(`${e.id}「${c.label}」：判定があるのに失敗の結果が無い`);
    const S = start(high, 7 + i);
    S.mode = "event"; S.event = e.id;
    const a = list().find((x) => x.id === "ev:" + i);
    if (!a) { fail(`${e.id}「${c.label}」：節目に届いても出ない`); continue; }
    try { G.act(a.id); } catch (x) { fail(`${e.id}「${c.label}」：選ぶと例外 ${x.message}`); continue; }
    if (!(S.hp >= 0 && S.hp <= S.maxHp)) fail(`${e.id}「${c.label}」：HP が範囲外`);
    if (S.mode === "event" && S.event === e.id) fail(`${e.id}「${c.label}」：選んでも出来事が終わらない`);
    n++;
  }
  for (const [fac, l] of Object.entries(F3.FAC)) l.forEach((f) => { if (NUM.test(f.ok.text || "")) fail(`施設 ${fac}「${f.label}」：文に内部の数がある`); });

  ok(`能力値の節目（${D.STATS.length} 能力値 × ${F3.TIERS.length} 段・出来事 ${evs.length} 件に ${all.length} 個・施設 ${Object.values(F3.FAC).flat().length} 個。選んで確かめた ${n} 回）`);
};
