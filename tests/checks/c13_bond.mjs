// C13：好感度の節目の褒美（src/engine/zzzzzzzzzzzzzzz_c13_bond.js・src/data/c13_bond_*.js）
// - 表：褒美のある人は仲間になる人（C2 の join）で、一人 2〜3 段。節目は上がっていく。品・技・術・場所が実在し、品は店・落とし物に無い
// - 流れ：好感度が節目に届くと「〇〇が呼んでいる」が出て、選ぶと褒美。品・技・術が手に入り、年表と図鑑に一行残る。依頼は頼まれたあと、その場所で果たす
// - 一度きり：済んだ節目は二度と出ない。同じ結果を当てはめ直しても二つ目は来ない
// - 死んだ・去った人には起きない
// - 術の才が無ければ術は教わらない（代わりの品）。才があれば教わる
// - 古いセーブ（S.c13 が無い）でも動く
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };
const MIN_PEOPLE = 53; // 仲間になる人の全員（下の ALL でも一人ずつ確かめる）

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("C13: " + m); };
  const D = G.data;
  const B = D.C13_BOND || {};
  const P = D.C2_PEOPLE || {};
  const ids = Object.keys(B);
  const mates = Object.keys(P).filter((id) => P[id].join);
  const ALL = true;

  // ---------------------------------------------------------------- 表
  if (ids.length < MIN_PEOPLE) F(`褒美のある人が ${ids.length} 人（${MIN_PEOPLE} 人以上のはず）`);
  if (ALL) for (const id of mates) if (!B[id]) F(`${id}: 仲間になる人なのに褒美が無い`);
  const sources = new Set(D.SHOP_BASE || []);
  for (const L of Object.values(D.LOCS)) for (const it of L.shop || []) sources.add(it);
  for (const e of Object.values(D.ENEMIES)) for (const [it] of e.loot || []) sources.add(it);
  const KINDS = ["gift", "skill", "spell", "quest", "favor"];
  const itemOk = (where, it, own) => {
    if (own && !String(it).startsWith("c13_")) own = false; // C14 で本・巻物に差し替えた最後の褒美は、その人だけの品でなくてよい
    if (!D.ITEMS[it]) { F(`${where}: 品 ${it} が無い`); return; }
    if (own && (!D.ITEMS[it].c13 || D.ITEMS[it].price)) F(`${where}: 品 ${it} がその人だけの品（c13・値なし）でない`);
    if (own && sources.has(it)) F(`${where}: 品 ${it} が店か落とし物に出る`);
  };
  for (const id of ids) {
    const list = B[id];
    if (!P[id] || !P[id].join) { F(`${id}: 仲間になる人でない`); continue; }
    if (!(list.length >= 2 && list.length <= 3)) F(`${id}: 褒美が ${list.length} 段（2〜3 段のはず）`);
    let prev = -101;
    list.forEach((t, i) => {
      const w = `${id} の ${i + 1} 段目`;
      if (!KINDS.includes(t.kind)) F(`${w}: 種類 ${t.kind} が変`);
      if (!(t.at > prev && t.at >= 20 && t.at <= 100)) F(`${w}: 節目 ${t.at} が上がっていないか、20〜100 でない`);
      prev = t.at;
      if (!t.title || !(t.text || (t.ask && t.ask.text))) F(`${w}: 題か文が無い`);
      if (t.kind === "gift") itemOk(w, t.item, true);
      if (t.kind === "skill" && !(D.SKILLS || {})[t.skill]) F(`${w}: 技 ${t.skill} が無い`);
      if (t.kind === "spell" && (!D.SPELLS[t.spell] || D.SPELLS[t.spell].base)) F(`${w}: 術 ${t.spell} が無いか、はじめから使える`);
      if ((t.kind === "skill" || t.kind === "spell") && !(t.alt && t.alt.text && (t.alt.item || t.alt.skill))) F(`${w}: 教われないときの代わり（alt）が無い`);
      if (t.alt && t.alt.item) itemOk(w + " の代わり", t.alt.item, false);
      if (t.kind === "quest") {
        const locs = Array.isArray(t.loc) ? t.loc : [t.loc];
        for (const l of locs) if (!D.LOCS[l]) F(`${w}: 場所 ${l} が無い`);
        if (!t.ask || !(t.ask.choices || []).length || !(t.choices || []).length) F(`${w}: 頼む場面か、果たす場面の選択肢が無い`);
        const r = t.reward || {};
        if (!r.item && !r.skill) F(`${w}: 依頼の褒美が無い`);
        if (r.item) itemOk(w + " の褒美", r.item, true);
        if (r.skill && !(D.SKILLS || {})[r.skill]) F(`${w}: 褒美の技 ${r.skill} が無い`);
        if (!(t.choices || []).some((c) => !c.stat)) for (const c of t.choices) if (c.stat && !c.ng) F(`${w}: 判定の選択肢にしくじりが無い`);
      }
      if (t.kind === "favor" && !t.line) F(`${w}: 小さな褒美の年表の一行（line）が無い`);
    });
  }
  // 出来事に組み立てられている
  for (const id of ids) B[id].forEach((t, i) => {
    if (!D.EVENTS.some((e) => e.id === G.c13.evId(id, i, false))) F(`${id}: ${i + 1} 段目の出来事が無い`);
    if (t.kind === "quest" && !D.EVENTS.some((e) => e.id === G.c13.evId(id, i, true))) F(`${id}: ${i + 1} 段目の依頼の場面が無い`);
  });

  // ---------------------------------------------------------------- 流れ
  let g = null;
  const start = (cls, mag) => {
    g = loadEngine();
    g.rand = seeded(1313);
    g.P = { trophies: {}, graves: [] };
    const st = {}, caps = {};
    g.data.STATS.forEach((k) => { st[k] = 60; caps[k] = 80; });
    if (mag != null) st.魔力 = mag;
    g.newGame({ cls, stats: st, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
    g.S.maxHp = g.S.hp = 999;
    g.S.gold = 2000;
    g.S.day = 10;
  };
  const acts = () => g.actions().flatMap((x) => x.list);
  const lucky = (f) => { const r = g.rand; g.rand = () => 0.01; try { return f(); } finally { g.rand = r; } };
  const join = (id) => {
    const p = P[id];
    g.S.loc = p.join.home[0]; g.S.visited[g.S.loc] = true;
    g.S.mode = "explore"; g.S.fac = null; g.S.event = null;
    if (!g.c2Join(id)) { F(`${id}: 仲間に加わらない`); return false; }
    g.affState()[id] = 100;
    // C14：関係の出来事（身の上話・頼みごと）は済ませてあることにする（段の確かめは tests/checks/c14_stages.mjs）
    const tk = (g.S.tk = g.S.tk || {}); tk.heard = tk.heard || {};
    (((g.data.TALK || {})[id] || {}).topics || []).filter((t) => t.kind === "past").forEach((t) => { tk.heard[t.id] = { day: 1, k: "x", seq: 0 }; });
    const q = (g.data.Q9 || {})[id];
    if (q) { g.S.q9 = g.S.q9 || {}; g.S.q9[id] = { n: q.steps.length, day: 1, r: [], end: Object.keys(q.ends || {})[0] || "done" }; }
    if (g.S.c14) delete g.S.c14.st[id]; // 段は今の好感度から決め直す（古いセーブと同じ）
    return true;
  };
  const myAct = (id) => acts().find((a) => typeof a.id === "string" && a.id.startsWith(`c13:${id}:`));
  // 呼ばれたら応じて、選択肢の一つ目を選ぶ。依頼は頼まれたら場所へ行く。全部済むまで（一段に何度か）
  const playAll = (id, choose) => {
    const list = B[id];
    for (let n = 0; n < list.length * 4 && (g.S.c13 ? (g.S.c13.done[id] || []).length : 0) < list.length; n++) {
      g.S.day += 4;
      g.S.mode = "explore"; g.S.event = null; g.S.combat = null;
      const x = g.c13.next(id);
      if (x && x.t.kind === "quest" && g.S.c13 && g.S.c13.ask[id] === x.i) { const l = [].concat(x.t.loc)[0]; g.S.loc = l; g.S.visited[l] = true; }
      if (x && x.t.kind === "skill" && g.k1 && g.k1.state().lesson != null) g.k1.state().lesson = -999;
      const a = myAct(id);
      if (!a) { F(`${id}: 好感度 100 で「呼んでいる」が出ない（${(g.S.c13 && g.S.c13.done[id] || []).length}/${list.length} 段済み）`); return; }
      if (a.disabled) { F(`${id}: 呼んでいるのに選べない（${a.sub}）`); return; }
      g.act(a.id);
      if (g.S.mode !== "event") { F(`${id}: 応じても出来事が始まらない`); return; }
      const ch = g.actions().flatMap((x2) => x2.list).filter((c) => c.id.startsWith("ev:") && !c.disabled);
      if (!ch.length) { F(`${id}: 出来事に選べる選択肢が無い`); return; }
      lucky(() => g.act((choose && choose(ch)) || ch[0].id));
    }
  };

  // 全員：褒美が全部受け取れる。品・技・術が手に入り、年表と図鑑に残る
  let people = 0, got = 0;
  for (const id of ids) {
    start("mage");
    if (!join(id)) continue;
    const inv0 = JSON.stringify(g.S.inv), sk0 = (g.S.skills || []).length, sp0 = (g.S.spells || []).length;
    playAll(id);
    const done = (g.S.c13 && g.S.c13.done[id]) || [];
    if (done.length !== B[id].length) { F(`${id}: 褒美が ${done.length}/${B[id].length} 段しか済まない`); continue; }
    B[id].forEach((t, i) => {
      if (t.kind === "gift" && !g.has(t.item)) F(`${id}: ${i + 1} 段目の品 ${t.item} を持っていない`);
      if (t.kind === "skill" && !(g.k1.knows(t.skill) || (t.alt.item && g.has(t.alt.item)))) F(`${id}: ${i + 1} 段目の技も代わりの品も無い`);
      if (t.kind === "spell" && !(g.S.spells || []).includes(t.spell)) F(`${id}: 術の才があるのに ${t.spell} を教わっていない`);
      if (t.kind === "quest" && t.reward.item && !g.has(t.reward.item) && !(t.reward.skill && g.k1.knows(t.reward.skill))) F(`${id}: 依頼の褒美を受け取っていない`);
    });
    const chron = g.S.chronicle.filter((c) => c.text.includes(P[id].short || P[id].name));
    if (chron.length < B[id].length) F(`${id}: 年表の褒美の行が ${chron.length}（${B[id].length} 段ぶん欲しい）`);
    const rec = g.codexPerson && g.codexPerson(id);
    if ((g.data.F2_PEOPLE || {})[id] && !(rec && (rec.c13 || []).length >= 1)) F(`${id}: 図鑑の人物の欄に褒美の行が無い`);
    if (JSON.stringify(g.S.inv) !== inv0 || g.S.skills.length > sk0 || g.S.spells.length > sp0) got++;
    // 一度きり：もう呼ばれない。同じ結果を当て直しても増えない
    g.S.day += 30;
    if (myAct(id)) F(`${id}: 全部済んだのに、まだ呼んでいる`);
    const t0 = B[id].findIndex((t) => t.kind === "gift");
    if (t0 >= 0) {
      const n0 = g.count(B[id][t0].item);
      g.apply({ c13: { id, i: t0, k: "gift" } });
      if (g.count(B[id][t0].item) !== n0) F(`${id}: 済んだ贈り物がもう一度もらえる`);
    }
    people++;
  }

  // 節目に届かないうちは出ない・届けば出る（古いセーブ：S.c13 が無い）
  {
    const id = ids[0];
    start("merc");
    join(id);
    g.affState()[id] = B[id][0].at - 1;
    if (myAct(id)) F("節目に届かないのに呼んでいる");
    delete g.S.c13;
    g.affState()[id] = B[id][0].at;
    if (!myAct(id)) F("古いセーブ（S.c13 が無い）で、節目に届いても呼ばない");
  }

  // 死んだ・去った人には起きない
  {
    const id = ids[0];
    start("merc");
    join(id);
    if (!myAct(id)) F("死ぬ前に呼ばない（確かめの前提）");
    const c = g.S.companions.find((x) => x.c2 === id);
    g.m2Remove(c, "death", "テスト");
    if (myAct(id) || g.c13.next(id)) F("死に別れた人の褒美が出る");
    start("merc");
    join(id);
    g.c2State(g.S).gone[id] = "dead"; // 長編（E7）で死んだ人：一行の欄に残っていても
    if (g.c13.next(id)) F("死んだ（c2 の dead）人の褒美が出る");
  }

  // 術の才
  const spellPeople = ids.filter((id) => B[id].some((t) => t.kind === "spell"));
  if (!spellPeople.length) F("術を教わる褒美が一つも無い");
  for (const id of spellPeople.slice(0, 2)) {
    const i = B[id].findIndex((t) => t.kind === "spell");
    const t = B[id][i];
    start("merc", 9); // 魔力が苦手な職業で、魔力も低い
    if (g.m14) g.S.magic = { lv: 0, good: [], bad: [] }; // M14 の決まりでも「術の才なし」
    join(id);
    if (g.c13.gift(g.S, t.spell)) F("術の才が無いのに、才があることになっている");
    playAll(id);
    if ((g.S.spells || []).includes(t.spell)) F(`${id}: 術の才が無いのに ${t.spell} を教わった`);
    if (!g.has(t.alt.item)) F(`${id}: 術の才が無いとき、代わりの品 ${t.alt.item} が来ない`);
    start("mage");
    if (g.m14) g.S.magic = { lv: 2, good: [g.data.SPELLS[t.spell].el], bad: [] }; // その属性が得意な才
    join(id);
    if (!g.c13.gift(g.S, t.spell)) F("術の才があるのに、才が無いことになっている");
  }

  // 依頼：頼まれたあと、場所が違えば選べない（どこでとだけ出る）。しくじっても、日をおいてまた挑める
  const qp = ids.find((id) => B[id].some((t) => t.kind === "quest"));
  if (qp) {
    const i = B[qp].findIndex((t) => t.kind === "quest");
    const t = B[qp][i];
    start("mage");
    join(qp);
    g.S.c13 = { done: { [qp]: B[qp].map((_, k) => k).filter((k) => k !== i) }, ask: {}, last: {}, wait: {} };
    let a = myAct(qp);
    if (!a || a.disabled) F("依頼の頼みが呼ばれない");
    else { g.act(a.id); g.act(g.actions().flatMap((x) => x.list).find((c) => c.id.startsWith("ev:")).id); }
    if (!(g.S.c13.ask[qp] === i)) F("依頼を頼まれた印が付かない");
    const list7 = g.q7 && g.q7.list ? g.q7.list(g.S) : [];
    if (!list7.some((q) => q.key === "c13:" + qp)) F("頼まれた依頼が、依頼の一覧に出ない");
    const elsewhere = Object.keys(g.data.LOCS).find((l) => ![].concat(t.loc).includes(l) && g.data.LOCS[l].type === "town");
    g.S.loc = elsewhere; g.S.day += 5;
    a = myAct(qp);
    if (!a || !a.disabled) F("依頼の場所でないのに、依頼が選べる");
    const l = [].concat(t.loc)[0];
    g.S.loc = l; g.S.visited[l] = true;
    a = myAct(qp);
    if (!a || a.disabled) F(`依頼の場所で、依頼が選べない（${a && a.sub}）`);
    else {
      g.act(a.id);
      const stat = g.actions().flatMap((x) => x.list).find((c) => c.id.startsWith("ev:") && t.choices[Number(c.id.slice(3))].stat);
      if (stat) {
        const r = g.rand; g.rand = () => 0.999; try { g.act(stat.id); } finally { g.rand = r; }
        if (g.c13.done(qp, i)) F("依頼にしくじったのに済んだことになった");
        g.S.mode = "explore"; g.S.event = null; g.S.combat = null;
        if (g.c13.tierWhy(qp, i) === "") F("しくじった直後に、もう一度挑める");
        g.S.day += g.c13.RETRY + 1;
        if (g.c13.tierWhy(qp, i) !== "") F("日をおいても、もう一度挑めない");
      }
    }
  }

  if (!bad) ok(`C13：好感度の褒美（${ids.length} 人・${ids.reduce((a, id) => a + B[id].length, 0)} 段・全部受け取れた ${people} 人・術の才なしは代わりの品・死んだ人は止まる・一度きり）`);
};
