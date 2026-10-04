// Q7：手動のセーブ枠とロード（engine/q7_slots.js）
// - 保存→別の行動→ロードで状態が戻る。枠の一覧（自動・手動）と見出し。上書き
// - 戦闘中・出来事の選択の途中・終わった冒険は保存できない（理由が出る）
// - 古いセーブ（自動の枠だけ・項目が足りない）から続けられ、枠にも保存できる
// - ロードしてもプロフィール（トロフィー・図鑑・墓碑）は減らない
// - 壊れた枠・使えない保存の場所・満杯でも止まらない
// - 倒れたとき、自動の枠の「倒れる前」が残り、そこから遊び直せる
export default ({ G, fail, seeded }) => {
  const D = G.data;
  const mem = () => {
    const m = {};
    return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } };
  };
  const start = (seed, cls = Object.keys(D.CLASSES)[0]) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 45; });
    G.newGame({ cls, stats, goal: Object.keys(D.GOALS)[0], profile: { name: "セーブ試し", sex: "女", age: 22, history: "テスト用", personality: "慎重" } });
    G.checkTrophies();
    return G.S;
  };
  const acts = () => G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
  // 戦闘・出来事を片づけながら n 回動く
  const walk = (n) => {
    for (let k = 0; k < n && !G.S.over; k++) {
      const list = acts();
      if (!list.length) break;
      G.act(list[Math.floor(G.rand() * list.length)].id);
    }
  };
  const autoSave = (st) => st.setItem(G.SAVE_KEYS.save, JSON.stringify(G.S));
  const pick = (S) => JSON.stringify({ turn: S.turn, day: S.day, hp: S.hp, gold: S.gold, loc: S.loc, inv: S.inv, stats: S.stats, logN: S.log.length });

  // 1. 保存 → 別の行動 → ロードで戻る
  let st = mem();
  let S = start(1);
  if (!G.canSave(S).ok) fail(`始めたばかりで保存できない：${G.canSave(S).why}`);
  const r1 = G.writeSlot(st, 1, S);
  if (!r1.ok) fail(`枠 1 に保存できない：${r1.why}`);
  const saved = pick(S);
  walk(30);
  if (pick(G.S) === saved) fail("30 回動いても状態が変わらない（試しが弱い）");
  const L = G.loadEntry(st, "slot1");
  if (!L) fail("枠 1 を読めない");
  else {
    if (pick(L) !== saved) fail("ロードした状態が保存した時と違う");
    if (!G.adoptLoaded(L) || G.S !== L) fail("ロードした冒険が今の冒険にならない");
    walk(20); // ロードしたあとも遊べる
    if (!G.S.log.length) fail("ロードしたあと動けない");
  }

  // 2. 枠の一覧と見出し
  S = start(2);
  st = mem();
  autoSave(st);
  G.writeSlot(st, 3, S);
  let list = G.listSlots(st);
  if (list.length !== G.SLOT_COUNT + 1) fail(`一覧の数が違う：${list.length}`);
  if (list[0].kind !== "auto" || list[0].empty) fail("一覧の先頭が自動の枠でない");
  const s3 = list.find((e) => e.id === "slot3");
  if (!s3 || s3.empty || !s3.meta) fail("保存した枠 3 が一覧で空き");
  else {
    const m = s3.meta;
    if (m.name !== "セーブ試し" || m.cls !== S.clsName || !m.date || m.loc !== D.LOCS[S.loc].name || !m.at) fail(`枠の見出しが足りない：${JSON.stringify(m)}`);
  }
  if (!list.find((e) => e.id === "slot1").empty) fail("保存していない枠 1 が空きでない");
  if (G.SLOT_COUNT < 3 || G.SLOT_COUNT > 5) fail("手動の枠は 3〜5");

  // 3. 上書き
  const at0 = s3 && s3.meta.at;
  walk(10);
  S = G.S;
  if (S.mode === "combat" || S.mode === "event") { S.mode = "explore"; S.combat = null; S.event = null; }
  S.gold = 4321;
  if (!G.writeSlot(st, 3, S).ok) fail("枠 3 を上書きできない");
  const again = G.readSlot(st, 3);
  if (!again || again.S.gold !== 4321) fail("上書きした枠の中身が新しくない");
  if (again && at0 && again.meta.at < at0) fail("上書きした枠の時刻が古い");

  // 4. 保存できない場面
  S = start(4);
  G.startCombat(["goblin"], {});
  let c = G.canSave(S);
  if (c.ok || !/戦闘/.test(c.why)) fail(`戦闘中に保存できる／理由が無い：${c.why}`);
  if (G.writeSlot(st, 2, S).ok) fail("戦闘中に枠へ書けた");
  if (G.readSlot(st, 2)) fail("戦闘中の保存で枠 2 が埋まった");
  S = start(5);
  G.startEvent(D.EVENTS[0].id);
  c = G.canSave(S);
  if (c.ok || !/出来事/.test(c.why)) fail(`出来事の途中に保存できる：${c.why}`);
  S = start(6);
  G.die("試し");
  if (G.canSave(S).ok) fail("倒れた冒険を保存できる");

  // 5. 古いセーブ（自動の枠だけ。新しい項目が無い）
  S = start(7);
  walk(5);
  if (G.S.mode !== "explore" && G.S.mode !== "fac") { G.S.mode = "explore"; G.S.combat = null; G.S.event = null; }
  const old = JSON.parse(JSON.stringify(G.S));
  ["savedAt", "rerolls"].forEach((k) => delete old[k]);
  st = mem();
  st.setItem(G.SAVE_KEYS.save, JSON.stringify(old));
  list = G.listSlots(st);
  if (list[0].kind !== "auto" || !list[0].meta) fail("古いセーブが一覧の自動の枠に出ない");
  if (list.filter((e) => e.kind === "slot").some((e) => !e.empty)) fail("古いセーブなのに手動の枠が埋まっている");
  const back = G.loadEntry(st, "auto");
  if (!back) fail("古いセーブを読めない");
  else {
    G.adoptLoaded(back);
    try { walk(10); } catch (e) { fail(`古いセーブから続けると止まる：${e.message}`); }
    if (!G.S.over && G.canSave().ok && !G.writeSlot(st, 1).ok) fail("古いセーブから続けた冒険を枠に保存できない");
  }

  // 6. ロードしてもプロフィールは減らない
  S = start(8);
  st = mem();
  G.writeSlot(st, 1, S);
  walk(40);
  G.award(D.TROPHIES[0].key);
  G.P.graves.push({ id: "old", name: "昔の人", at: 1 });
  G.P.codex = { foes: { goblin: 1 } };
  const prof = JSON.stringify(G.P);
  G.adoptLoaded(G.loadEntry(st, "slot1"));
  if (JSON.stringify(G.P) !== prof) fail("ロードでプロフィールが変わった");

  // 7. 壊れた枠・使えない場所・満杯
  st = mem();
  st.setItem(G.slotKey(1), "{これは JSON ではない");
  st.setItem(G.slotKey(2), JSON.stringify({ v: 1, meta: { name: "x" }, S: { v: 1 } }));
  st.setItem(G.slotKey(3), "null");
  st.setItem(G.slotKey(4), JSON.stringify({ v: 1, meta: "壊れ", S: { ...JSON.parse(JSON.stringify(G.S)), loc: "存在しない場所" } }));
  st.setItem(G.SAVE_KEYS.save, "[1,2");
  try {
    list = G.listSlots(st);
    [1, 2, 3, 4].forEach((i) => { if (!list.find((e) => e.id === "slot" + i).broken) fail(`壊れた枠 ${i} が壊れと出ない`); });
    if (!list[0].broken) fail("壊れた自動の枠が壊れと出ない");
    ["slot1", "slot2", "slot3", "slot4", "auto", "slot9", "nothing"].forEach((id) => { if (G.loadEntry(st, id)) fail(`壊れた枠 ${id} を読めたことになる`); });
    if (!G.writeSlot(st, 1, G.S.over ? start(9) : G.S).ok) fail("壊れた枠に上書きできない");
  } catch (e) { fail(`壊れた枠で止まる：${e.message}`); }
  const boom = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("SecurityError"); }, removeItem: () => { throw new Error("x"); } };
  const fullSt = { getItem: () => null, setItem: () => { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; }, removeItem: () => {} };
  try {
    S = start(10);
    if (G.listSlots(boom).some((e) => !e.empty)) fail("使えない場所で枠が埋まって見える");
    const a = G.writeSlot(boom, 1, S), b = G.writeSlot(fullSt, 1, S), n = G.writeSlot(null, 1, S);
    if (a.ok || !a.why) fail("使えない場所で保存できたことになる");
    if (b.ok || !/いっぱい/.test(b.why)) fail(`満杯のとき理由が出ない：${b.why}`);
    if (n.ok || !n.why) fail("保存の場所が無いのに保存できたことになる");
    if (G.writeSlot(mem(), 0, S).ok || G.writeSlot(mem(), G.SLOT_COUNT + 1, S).ok) fail("無い枠に保存できる");
    G.keepLastBreath(boom, S);
  } catch (e) { fail(`使えない場所・満杯で止まる：${e.message}`); }

  // 8. 倒れたとき：自動の枠の「倒れる前」が残り、手動の枠は消えない
  S = start(11);
  st = mem();
  G.writeSlot(st, 2, S);
  autoSave(st);
  const before = pick(S);
  G.die("試しに倒れる");
  G.keepLastBreath(st, G.S);
  autoSave(st);
  list = G.listSlots(st);
  const auto = list.find((e) => e.kind === "auto");
  const last = list.find((e) => e.kind === "last");
  if (!auto || !auto.meta || auto.meta.over !== "dead") fail("倒れた冒険が自動の枠に無い");
  if (G.loadEntry(st, "auto")) fail("倒れた冒険をロードできてしまう");
  if (!last || !last.meta) fail("倒れる前の自動の枠が残らない");
  const lb = G.loadEntry(st, "last");
  if (!lb || lb.over || pick(lb) !== before) fail("倒れる前の自動の枠から戻れない");
  if (!G.loadEntry(st, "slot2")) fail("倒れたら手動の枠が読めなくなった");
  // 別の冒険が倒れても、ほかの冒険の写しで上書きしない
  const other = start(12);
  other.over = "dead";
  if (G.keepLastBreath(st, other)) fail("別の冒険が倒れたのに倒れる前の写しを書き換えた");
};
