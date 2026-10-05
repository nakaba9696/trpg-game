// F3：癖のある品と掘り出し物
// - 癖（quirk）の条件がすべて分かる言葉で、効き目の欄が知っているもの。どの品にも手がかり（hint）と由来の文がある
// - 条件で効き目が変わる（夜の刃・組み合わせの刀と鞘・はぐれ狼の牙・剛力で扱える槌・火の章と籠手）。条件を外すと戻る
// - 掘り出し物は店の「今日の品」にごくまれに並び、少し高く、買えば持ち物に入る。日と町と人物で決まる（G.rand を減らさない）
// - 蒐集家の出来事：珍品を金に換える・取り替える。島の祠：鞘があれば刀を譲られる
// - どの品にも入手先（敵の落とし物・店・出来事・取り替え）があり、噂がある
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const F = D.F3I;
  const API = G.f3i;
  if (!F || !API) { fail("F3 の癖のある品（D.F3I・G.f3i）が無い"); return; }
  const ids = Object.keys(D.ITEMS).filter((id) => id.startsWith("f3i_"));
  const WHEN = /^(night|day|wet|dry|alone|party|poor|rich|hurt|sinful|pure|stat:(筋力|体力|敏捷|知力|魔力|魅力)|pair:.+)$/;
  const FX = new Set(["dmg", "hit", "vital", "first", "magic", "drain", "def", "agi", "stats", "bonus"]);
  for (const id of ids) {
    const it = D.ITEMS[id];
    if (!it.desc) fail(`${id}：由来の文が無い`);
    if (/\d/.test(it.desc || "") || /\d/.test(it.hint || "")) fail(`${id}：文に数がある`);
    if (it.quirk) {
      if (!it.hint) fail(`${id}：癖があるのに手がかりが無い`);
      it.quirk.forEach((q) => {
        if (!WHEN.test(q.when)) fail(`${id}：知らない条件 ${q.when}`);
        const m = /^pair:(.+)$/.exec(q.when);
        if (m && !D.ITEMS[m[1]]) fail(`${id}：組み合わせの相手 ${m[1]} が無い`);
        [q.on, q.off].filter(Boolean).forEach((fx) => Object.keys(fx).forEach((k) => FX.has(k) || fail(`${id}：知らない効き目 ${k}`)));
      });
    }
    // 入手先
    const drop = Object.values(D.ENEMIES).some((e) => (e.loot || []).some(([x]) => x === id));
    const market = F.MARKET.includes(id) || (F.TRADE || []).includes(id);
    const ev = D.EVENTS.some((e) => JSON.stringify(e.choices || []).includes(`"${id}"`));
    if (!drop && !market && !ev) fail(`${id}：手に入る所が無い`);
  }
  const quirky = ids.filter((id) => D.ITEMS[id].quirk);
  const curios = ids.filter((id) => D.ITEMS[id].curio);
  if (quirky.length < 10) fail(`癖のある品が ${quirky.length} 種（10 種以上のはず）`);
  if (curios.length < 3) fail(`珍品が ${curios.length} 種`);
  if (!D.RUMORS.some((r) => /鞘/.test(r)) || !D.RUMORS.some((r) => /蒐集家/.test(r))) fail("掘り出し物の噂が無い");

  // ---------------------------------------------------------------- 条件で効き目が変わる
  const start = (seed = 3) => {
    G.rand = seeded(seed);
    G.newGame({ cls: "thief", stats: { 筋力: 12, 体力: 12, 敏捷: 14, 知力: 12, 魔力: 8, 魅力: 10 }, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 22, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.companions = []; S.ring = ""; S.gold = 100;
    return S;
  };
  {
    const S = start();
    S.weapon = "f3i_moonedge";
    S.phase = 0; const day = G.weapon();
    S.phase = 3; const night = G.weapon();
    if (!(night.dmg[2] > day.dmg[2] && night.hit > day.hit)) fail("月夜の刃が、夜に冴えない");
    if (D.ITEMS.f3i_moonedge.dmg[2] !== 2) fail("癖が元の品のデータを書き換えた");
    S.weapon = "f3i_twinblade";
    const h0 = G.weapon().hit;
    G.give("f3i_twinsheath");
    if (!(G.weapon().hit > h0)) fail("鞘を持っても、鞘を失くした刀が落ち着かない");
    G.take("f3i_twinsheath");
    if (G.weapon().hit !== h0) fail("鞘を手放しても、刀の効き目が残る");
    S.ring = "f3i_lonefang";
    const alone = G.statEff("筋力");
    S.companions.push({ name: "剣士のハンス", cls: "剣士", power: 40, dmg: 1 });
    if (!(alone > G.statEff("筋力"))) fail("はぐれ狼の牙が、独りのときに力を貸さない");
    S.weapon = "f3i_giantmaul";
    S.stats.筋力 = 20; const weak = G.weapon().hit;
    S.stats.筋力 = 30; if (!(G.weapon().hit > weak)) fail("剛力に届いても、巨人の槌が扱いやすくならない");
    S.ring = "f3i_flintgauntlet";
    const f0 = G.gearBonus("fire");
    G.give("grimoire");
    if (!(G.gearBonus("fire") > f0)) fail("火の章を持っても、火打ちの籠手が化けない");
    // 効きはじめを知らせる
    S.weapon = "f3i_moonedge"; S.phase = 0; S.mode = "explore";
    G.endTurn(); S.phase = 3;
    const n0 = S.log.length;
    G.endTurn();
    if (!S.log.slice(n0).some((e) => /月夜の刃/.test(e.text || ""))) fail("癖が効きはじめても、記録に出ない");
    // 古いセーブ（S.f3i が無い）
    delete S.f3i;
    try { G.endTurn(); } catch (x) { fail(`古いセーブで例外 ${x.message}`); }
  }

  // ---------------------------------------------------------------- 掘り出し物
  {
    const S = start();
    const towns = Object.keys(D.LOCS).filter((id) => D.LOCS[id].type === "town" && (D.LOCS[id].fac || []).includes("shop"));
    let n = 0, tot = 0, at = null;
    const r0 = G.rand;
    let calls = 0;
    G.rand = () => { calls++; return r0(); };
    for (const t of towns) for (let d = 1; d <= 40; d++) { tot++; const id = API.marketFind(t, d, S); if (id) { n++; if (!at) at = { t, d, id }; } }
    if (calls) fail("掘り出し物を決めるのに G.rand を使っている");
    G.rand = r0;
    const rate = n / tot;
    if (rate < 0.05 || rate > 0.3) fail(`掘り出し物の並ぶ見込みが変（${rate.toFixed(2)}）`);
    if (!at) { fail("掘り出し物がどこにも並ばない"); }
    else {
      S.loc = at.t; S.day = at.d; S.mode = "fac"; S.fac = "shop"; S.gold = 5000;
      const a = G.actions().flatMap((g) => g.list).find((x) => x.id === "shop:buy:" + at.id);
      if (!a || !/掘り出し物/.test(a.label)) fail("店の今日の品に、掘り出し物の印が無い");
      else {
        G.act(a.id);
        if (!S.inv[at.id]) fail("掘り出し物を買っても持ち物に入らない");
        if (S.gold !== 5000 - API.price(at.id)) fail(`掘り出し物の値段が違う（${5000 - S.gold} / ${API.price(at.id)}）`);
        if (G.actions().flatMap((g) => g.list).some((x) => x.id === "shop:buy:" + at.id)) fail("買った掘り出し物が、まだ並んでいる");
      }
    }
  }

  // ---------------------------------------------------------------- 蒐集家と祠
  {
    const S = start();
    const col = D.EVENTS.find((e) => e.id === "f3i_collector");
    if (col.cond(S)) fail("珍品を持っていないのに蒐集家が現れる");
    G.give(curios[0]);
    if (!col.cond(S)) fail("珍品を持っているのに蒐集家が現れない");
    S.mode = "event"; S.event = "f3i_collector";
    const list = () => G.actions().flatMap((g) => g.list);
    const sell = list().find((a) => a.label.includes(D.ITEMS[curios[0]].name));
    const g0 = S.gold;
    if (!sell) fail("蒐集家に珍品を売る選択肢が無い");
    else { G.act(sell.id); if (S.inv[curios[0]] || !(S.gold > g0 + D.ITEMS[curios[0]].price)) fail("蒐集家に売っても、珍品が残るか高く売れない"); }
    G.give(curios[1]);
    S.mode = "event"; S.event = "f3i_collector";
    const trade = list().find((a) => /取り替える/.test(a.label));
    G.act(trade.id);
    if (S.inv[curios[1]] || !Object.keys(S.inv).some((id) => (F.TRADE || []).includes(id))) fail("蒐集家と取り替えても、品が入れ替わらない");
    const T = start();
    G.give("f3i_twinsheath");
    T.mode = "event"; T.event = "f3i_shrine";
    const take = list().find((a) => /鞘を持っている/.test(a.label));
    if (!take) fail("鞘を持っているのに、祠で刀を譲り受けられない");
    else { G.act(take.id); if (!G.has("f3i_twinblade")) fail("祠で刀を譲り受けても、持ち物に入らない"); }
  }

  ok(`癖のある品と掘り出し物（癖のある品 ${quirky.length} 種・珍品 ${curios.length} 種・店に並ぶ品 ${F.MARKET.length} 種）`);
};
