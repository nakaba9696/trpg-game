// W6：旅の途中の出来事。持ち主の声「街から街へ移動する時も、日数だけ経過するのではなく、何かランダムなイベントがほしい」
// explore.js の travel() は書き換えず、G.exploreAct の travel / sail を包んで、ここで旅をする（船賃・日数・旅の回数は今までどおり）。
//   1. 旅立つと、日数と危険度から道中の出来事の回数を決める（W6.count。短い道は 0 回が多く、長い道・危険な道は 1〜2 回）
//   2. 襲撃（今までの「何者かに襲われた」戦い）は、今までと同じ割合で決め、起きるなら道中の最後に置く（戦いが終われば着く）
//   3. 出来事を一つずつ起こす。選んで結果が出たら（戦いになったら戦いが終わったら）、手番の終わり（G.endTurn）で次へ進む。残りが無ければ着く
// 出来事は D.EVENTS に、where: ["w6"]・w: 0（ふつうの出来事の抽選には出ない）と、旅の条件 w6 を付けて置く（src/data/events_w6_*.js）
//   w6: { w 重み, on "land"|"sea"|"any"（既定 land）, reg [地方]（出発地か行き先のどちらかが当たれば）, dmin / dmax 危険度, days 何日以上の旅,
//         season [季節], weather [天候]（行き先の空）, tod [時間帯]（その出来事が起きる時。旅の中で引く）, comp 仲間がいるとき, fame 名声がこれ以上,
//         flag この印があるとき, noflag この印が無いとき }
//   地方：free 自由都市連合・leo レオネスト王国・nord ノルディア帝国・elm エルメシア共和国・holy 光天教会領・front 人類の最前線と断界山脈・isle シェルアーク・realm 使徒領
// 結果（G.apply）に足せるもの：heard "話"（図鑑の聞いた話。G.heard が無ければ覚え書き）・detour true（寄り道。近くの別の場所に着く）・banter "camp"|"road"（仲間の掛け合いを一つ）
// セーブに足すもの：S.w6 = { dest, from, sea, days, danger, left 残りの回数, raid 襲撃が残っているか, seen [この旅で起きた出来事], tod }（着いたら null）
//   S.w6recent = [最近の旅の出来事]（同じ出来事が続かないように）。古いセーブに無くても動く。旅の途中の古いセーブ（S.travel だけある）は、次の手番で着く
// 乱数は G.rand だけ。レーン W＋V（W6）
(function (G) {
  const D = G.data;
  const W6 = (G.w6 = G.w6 || {});
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  W6.MAX = 2;          // 一つの旅で起きる出来事の数の上限（襲撃を含む）
  W6.RAID = 0.85;      // 襲撃の割合は今まで（explore.js）の何倍か。道中の出来事にも戦いがあるので、少しだけ下げる
  W6.RECENT = 16;      // 最近の出来事として覚えておく数
  W6.REGIONS = ["free", "leo", "nord", "elm", "holy", "front", "isle", "realm"];
  W6.TODS = ["朝", "昼", "夕", "夜"];
  const NATION = { 自由都市連合: "free", レオネスト王国: "leo", ノルディア帝国: "nord", エルメシア共和国: "elm", 光天教会領: "holy", 人類の最前線: "front", シェルアーク: "isle" };
  const REALM = ["wasteland", "majincastle", "w4_canopy", "e2_kitchen"];

  W6.regionOf = (id) => {
    if (REALM.includes(id)) return "realm";
    let n = null;
    try { n = G.nationOf ? G.nationOf(id) : null; } catch (e) { n = null; }
    return NATION[n] || "front";
  };

  // 道中の出来事の回数（襲撃は別）。期待値 = 0.15 + 0.22×日数 + 0.06×危険度（船は少し少なめ）
  W6.expect = (days, danger, sea) => (sea ? 0.1 + 0.2 * days : 0.15 + 0.22 * days + 0.06 * (danger || 0));
  W6.count = (days, danger, sea) => {
    const e = Math.min(W6.MAX, W6.expect(days, danger, sea));
    const n = Math.floor(e);
    return Math.min(W6.MAX, n + (G.rand() < e - n ? 1 : 0));
  };
  W6.raidChance = (days, danger) => Math.min(0.7, 0.12 + 0.08 * danger + 0.03 * days) * W6.RAID;

  // ---------------------------------------------------------------- 旅の出来事を選ぶ
  W6.ctx = (S) => {
    const w = S.w6 || {};
    const sky = (G.skyAt && w.dest && G.skyAt(w.dest)) || {};
    return {
      sea: !!w.sea, days: w.days || 1, danger: w.danger || 0, tod: w.tod || "昼",
      reg: [W6.regionOf(w.from), W6.regionOf(w.dest)], season: sky.season, weather: sky.weather,
    };
  };
  W6.fits = (e, S, c) => {
    const r = e.w6;
    if (!r || !(r.w > 0)) return false;
    const on = r.on || "land";
    if (on !== "any" && (on === "sea") !== c.sea) return false;
    if (r.reg && !as(r.reg).some((x) => c.reg.includes(x))) return false;
    if (r.dmin != null && c.danger < r.dmin) return false;
    if (r.dmax != null && c.danger > r.dmax) return false;
    if (r.days != null && c.days < r.days) return false;
    if (r.season && !as(r.season).includes(c.season)) return false;
    if (r.weather && !as(r.weather).includes(c.weather)) return false;
    if (r.tod && !as(r.tod).includes(c.tod)) return false;
    if (r.comp && !(S.companions || []).length) return false;
    if (r.fame != null && (S.fame || 0) < r.fame) return false;
    if (r.flag && !as(r.flag).every((f) => S.flags[f])) return false;
    if (r.noflag && as(r.noflag).some((f) => S.flags[f])) return false;
    if (e.once && S.flags["ev:" + e.id]) return false;
    if (e.cond && !e.cond(S)) return false;
    return true;
  };
  W6.pool = (S) => {
    const c = W6.ctx(S);
    const seen = (S.w6 && S.w6.seen) || [];
    return D.EVENTS.filter((e) => e.w6 && !seen.includes(e.id) && W6.fits(e, S, c));
  };
  W6.pick = (S) => {
    const pool = W6.pool(S);
    if (!pool.length) return null;
    const recent = S.w6recent || [];
    const wt = (e) => e.w6.w * (recent.includes(e.id) ? 0.2 : 1);
    let r = G.rand() * pool.reduce((a, e) => a + wt(e), 0);
    for (const e of pool) { r -= wt(e); if (r <= 0) return e; }
    return pool[pool.length - 1];
  };

  // ---------------------------------------------------------------- 旅
  function encounter(L) {
    const pool = (L.pool || ["goblin", "wolf", "bandit"]).filter((id) => D.ENEMIES[id] && !D.ENEMIES[id].boss);
    const n = G.rand() < 0.35 + 0.05 * (L.danger || 1) ? 2 : 1;
    const out = [];
    for (let i = 0; i < n; i++) out.push(G.pick(pool.length ? pool : ["goblin"]));
    return out;
  }
  W6.encounter = encounter;

  W6.start = (dest, days, cost) => {
    const S = G.S;
    const fromId = S.loc;
    const from = G.loc();
    const T = D.LOCS[dest];
    const sea = !!cost;
    if (cost) { S.gold -= cost; G.note(`船賃 -${cost}G`); }
    G.log("you", `${T.name}へ向かう`);
    G.passDays(days);
    S.counters.travels++;
    const danger = Math.max(from.danger || 0, T.danger || 0);
    let n = W6.count(days, danger, sea);
    const raid = !sea && G.rand() < W6.raidChance(days, danger);
    if (raid && n >= W6.MAX) n = W6.MAX - 1;
    S.travel = dest;
    S.w6 = { dest, from: fromId, sea, days, danger, left: n, raid, seen: [], tod: "昼" };
    W6.next();
  };

  // 次の出来事へ。残りが無ければ着く。出来事か戦いが始まったら true
  W6.next = () => {
    const S = G.S;
    if (!S || S.over || !S.travel) return false;
    if (S.mode !== "explore" || S.combat) return false;
    const w = S.w6;
    if (!w || w.dest !== S.travel) { G.arrive(S.travel); return false; }   // 古いセーブの旅の途中
    while (w.left > 0) {
      w.left--;
      w.tod = G.pick(W6.TODS);
      const e = W6.pick(S);
      if (!e) continue;
      w.seen.push(e.id);
      S.w6recent = [...(S.w6recent || []).filter((x) => x !== e.id), e.id].slice(-W6.RECENT);
      G.startEvent(e);
      return true;
    }
    if (w.raid) {
      w.raid = false;
      const T = D.LOCS[w.dest] || {};
      const from = D.LOCS[w.from] || {};
      const src = T.pool ? T : from.pool ? from : { pool: ["bandit", "wolf", "goblin"], danger: 1 };
      G.say(w.seen.length ? "残りの道のりの途中、何者かに襲われた。" : `${w.days}日の旅の途中、何者かに襲われた。`);
      G.startCombat(encounter(src), { after: "arrive" });
      return true;
    }
    if (w.sea && !w.seen.length && G.rand() < 0.25) G.say("船旅は荒れた。甲板で吐いている間に、財布の紐がゆるくなった気がする。");
    G.arrive(w.dest);
    return false;
  };

  // 寄り道：行き先か出発地から道のある、危なすぎない別の場所に着く
  W6.detour = () => {
    const S = G.S;
    const w = S.w6;
    if (!w) return false;
    const near = [...new Set([...Object.keys((D.LOCS[w.dest] || {}).links || {}), ...Object.keys((D.LOCS[w.from] || {}).links || {})])]
      .filter((id) => id !== w.dest && id !== w.from && D.LOCS[id] && !REALM.includes(id) && (D.LOCS[id].danger || 0) <= Math.max(1, w.danger));
    if (!near.length) return false;
    const to = G.pick(near.sort());
    w.dest = to;
    S.travel = to;
    w.left = 0;
    w.raid = false;
    G.note(`行き先が${D.LOCS[to].name}に変わった。`);
    return true;
  };

  // 仲間の掛け合いを一つ（選ぶ場面の無いものだけ。会話の仕組み G.tk があるときだけ）
  W6.banter = (where) => {
    const S = G.S;
    const TK = G.tk;
    if (!TK || !TK.pick || !TK.banter || !G.tkState) return false;
    let b = null;
    try { b = TK.pick(S, where); } catch (e) { b = null; }
    if (!b || b.side) return false;
    TK.banter(b);
    return true;
  };

  W6.heard = (t) => {
    if (!t) return;
    if (G.heard) G.heard(t);
    else G.memo("噂：" + t);
  };

  // ---------------------------------------------------------------- 包む
  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    const S = G.S;
    if (!o || !S || S.over) return;
    as(o.heard).forEach(W6.heard);
    if (S.mode !== "explore" || S.combat) return;
    if (o.detour && S.travel) W6.detour();
    if (o.banter) W6.banter(o.banter);
  };

  const arrive0 = G.arrive;
  G.arrive = (dest) => {
    if (G.S) G.S.w6 = null;
    return arrive0(dest);
  };

  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const L = G.loc();
    if (head === "travel" && L.links && L.links[arg] != null) return W6.start(arg, L.links[arg], 0);
    if (head === "sail" && L.sea && L.sea[arg]) return W6.start(arg, L.sea[arg].days, L.sea[arg].cost);
    if (head === "w6go") { if (S.travel) W6.next(); return; }
    return act0(head, arg, a);
  };

  // 旅の途中で手が止まったとき（古いセーブなど）は「先へ進む」だけ
  const actions0 = G.exploreActions;
  G.exploreActions = () => {
    const S = G.S;
    if (S && S.travel && S.mode === "explore" && !S.combat && D.LOCS[S.travel]) {
      return [{ title: "旅の途中", list: [{ id: "w6go", label: "先へ進む", sub: `${D.LOCS[S.travel].name}へ`, kw: ["進", "先", "旅", "続"] }] }];
    }
    return actions0();
  };

  // 出来事を選び終えた・戦いが終わった手番の終わりに、次の出来事へ進む
  const end0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && !S.over && S.travel && S.mode === "explore" && !S.combat) W6.next();
    return end0();
  };
})(globalThis.G = globalThis.G || {});
