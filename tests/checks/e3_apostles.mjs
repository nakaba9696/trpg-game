// E3：すべての使徒を倒せるように（src/data/e3_apostles.js・src/engine/zz_e3_apostles.js）
// - ゲームに出る使徒（D.MAJIN の十三と、D.E3.LIST のほか）すべてに、戦闘データと倒す道（会う出来事か居城）がある
// - 条件の品・印は、どれも出来事で手に入る。条件はどれも満たせる
// - S 級（旧「天災」）は、条件なしだと勝率がごく低い。条件を満たせば、鍛えた冒険者に勝てる見込みがある（全員）
// - 倒すと：印・骸の素材・トロフィー・図鑑の記録（G.P.slain）。「使徒を討つ」の目的に数える。挑んで逃げると回数が残る
// - 筋のよい遊び方の bot は、使徒に挑む選択肢を選ばない
import { readFileSync } from "node:fs";

const PROFILE = { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" };

export default ({ fail, ok, loadEngine, seeded }) => {
  const G0 = loadEngine();
  const D0 = G0.data;
  const E3 = D0.E3;
  if (!E3) return fail("D.E3 が無い");
  const LIST = E3.LIST;

  // ---------------------------------------------------------------- 表の整い
  for (const id of Object.keys(D0.MAJIN)) if (!LIST[id]) fail(`会える使徒 ${id} に戦いの表が無い`);
  const evIds = new Set(D0.EVENTS.map((e) => e.id));
  const gives = new Set(), sets = new Set();
  const scan = (o) => {
    if (!o) return;
    const it = typeof o.item === "string" ? [o.item] : Object.keys(o.item || {});
    it.forEach((x) => gives.add(x));
    if (o.flag) sets.add(o.flag);
  };
  D0.EVENTS.forEach((e) => e.choices.forEach((c) => { scan(c.ok); scan(c.ng); scan(c.win); }));
  for (const a of Object.values(LIST)) {
    const w = `使徒 ${a.id}`;
    const e = D0.ENEMIES[a.foe] || E3.FOES[a.foe];
    if (!e) { fail(`${w}: 戦闘データ ${a.foe} が無い`); continue; }
    if (!e.majin || !e.boss) fail(`${w}: 絶界（majin）かボスの印が無い`);
    if (!["S", "A", "B"].includes(a.rank)) fail(`${w}: 格 ${a.rank} が無い`);
    if (!E3.WEAK[a.rank]) fail(`${w}: 格の倍率が無い`);
    if (!a.keys.length) fail(`${w}: 条件が無い`);
    if (!a.keys.some((k) => k.zekkai)) fail(`${w}: 剣が無くても絶界を破る条件が無い`);
    if (a.rank !== "B" && a.keys.length < 2) fail(`${w}: ${a.rank} 級なのに条件が一つしかない`);
    if (!a.flag) fail(`${w}: 倒した印が無い`);
    if (!a.drop || !D0.ITEMS[a.drop.id]) fail(`${w}: 骸の素材が無い`);
    if (!a.after || !evIds.has("e3_after_" + a.id)) fail(`${w}: 倒したあとの縄張りの様子が無い`);
    // 倒す道：会う出来事（挑む選択肢）か、居城の最奥（ボスか謁見）
    const meet = D0.EVENTS.find((x) => x.id === "e3_meet_" + a.id);
    const lairEv = a.lair && D0.EVENTS.find((x) => x.id === a.lair);
    const bossLoc = Object.values(D0.LOCS).find((L) => L.boss === a.foe);
    if (meet) {
      if (!meet.choices.some((c) => c.ok && c.ok.e3fight === a.id)) fail(`${w}: 会う出来事に挑む選択肢が無い`);
      if (!meet.choices.some((c) => !c.stat && c.ok && !c.ok.e3fight && !c.cost)) fail(`${w}: 会う出来事に、戦わずに離れる選択肢が無い`);
      if (!a.win || !a.win.text || !a.win.chron) fail(`${w}: 勝ったときの文か年表の一行が無い`);
      const tags = new Set(Object.entries(D0.LOCS).flatMap(([id, L]) => [id, L.type, L.sea ? "port" : ""]));
      if (!meet.where.some((x) => tags.has(x))) fail(`${w}: 会う場所 ${meet.where} がどこにも当たらない`);
    } else if (lairEv) {
      if (!lairEv.choices.some((c) => c.ok && c.ok.e3fight === a.id)) fail(`${w}: 謁見に、剣が無くても挑める選択肢が無い`);
    } else if (!bossLoc) fail(`${w}: 戦う場所が無い（会う出来事も居城も無い）`);
    if (a.calm === "無関心" && meet && !/手を出す/.test(meet.choices.find((c) => c.ok && c.ok.e3fight).label)) fail(`${w}: 無関心の使徒なのに「手を出す」が無い`);
    if (a.kid && !/目が覚め|場面|――/.test(a.win.text)) fail(`${w}: 子どもの姿の使徒を倒す場面が場面転換になっていない`);
    for (const k of a.keys) if (!k.label || !k.on || typeof k.test !== "function") fail(`${w}: 条件 ${k.id} に label・on・test のどれかが無い`);
  }
  // 条件の品と印が出来事で手に入る
  for (const [id, it] of Object.entries(E3.ITEMS)) if (it.type === "key" && !gives.has(id)) fail(`条件の品 ${id} が、どの出来事でも手に入らない`);
  for (const f of ["e3_awake", "e3_song", "e3_shadowword", "e3_rootlie"]) if (!sets.has(f)) fail(`条件の印 ${f} が、どの出来事でも付かない`);
  // 書き方：見世物の言葉を出さない・名前（刻印の読み）を地の文に出さない
  const BAD = /見世物|観客|客席|舞台|台本|神々が眺め|魔王/;
  const texts = [];
  Object.values(LIST).forEach((a) => { if (a.meet) texts.push(a.meet.text, a.meet.peek.text, a.meet.leaveText); if (a.win) texts.push(a.win.text); texts.push(a.after.text, ...a.keys.map((k) => k.on)); });
  E3.FRAGMENTS.forEach((e) => { texts.push(e.text); e.choices.forEach((c) => { if (c.ok) texts.push(c.ok.text); if (c.ng) texts.push(c.ng.text); }); });
  texts.push(...E3.RUMORS);
  for (const t of texts) if (t && BAD.test(t)) fail(`使ってはいけない言葉：${t.match(BAD)[0]}（${t.slice(0, 30)}…）`);
  for (const t of texts) for (const a of Object.values(LIST)) { const e = D0.ENEMIES[a.foe] || E3.FOES[a.foe]; const nm = e.name.replace(/^.*の使徒/, ""); if (nm.length >= 3 && /^[ァ-ヴー]+$/.test(nm) && t && t.includes(nm)) fail(`地の文に使徒の名前「${nm}」が出ている`); }
  // 絵の一覧に載っていない新しい使徒は、読み込んだ時点では D.ENEMIES に入れない（tests/checks/v6_monsters.mjs）
  for (const id of Object.keys(E3.FOES)) if (D0.ENEMIES[id]) fail(`新しい使徒 ${id} が読み込み時から D.ENEMIES にいる`);
  // VISION の方針
  const vision = readFileSync(new URL("../../docs/VISION.md", import.meta.url), "utf8");
  // E8 で「討伐できる使徒は S 3・A 5・B 8」に改めた（それより前は「すべての使徒は倒せる」）
  if (!/討伐できる使徒は S 級 2・A 級 6・B 級 8/.test(vision)) fail("docs/VISION.md に「討伐できる使徒は S 級 2・A 級 6・B 級 8」の方針が無い");
  if (/無関心の使徒には戦う選択肢を出さず/.test(vision)) fail("docs/VISION.md に古い方針（無関心の使徒には戦う選択肢を出さない）が残っている");

  // ---------------------------------------------------------------- 条件はどれも満たせる（品・印・仲間・季節・時刻・天候・回数をそろえた状態で）
  const start = (G, seed, keepP) => {
    const D = G.data;
    G.rand = seeded(seed);
    if (!keepP) G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 99; });
    return G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { ...PROFILE } });
  };
  const fullfill = (G) => {
    const S = G.S;
    Object.entries(G.data.E3.ITEMS).forEach(([id, it]) => { if (it.type === "key") G.give(id); });
    G.give("smoke", 2);
    ["e3_awake", "e3_song", "e3_shadowword", "e3_rootlie", "mid:majincastle:3", "mid:e2_kitchen:3", "mid:e2_garden:3", "kain", "w1_gregor", "w1_konoha", "w2_ironwarden"].forEach((f) => { S.flags[f] = true; });
    S.companions = [{ name: "剣士のアル", cls: "剣士", power: 70, dmg: 2, desc: "無口", bond: 90 }];
    S.day = 271; S.phase = 3; // 冬の夜
    S.world = Object.assign(S.world || {}, { emp: "civil" });
    G.skyAt = () => ({ season: "冬", weather: "雪", still: false, label: "冬・雪" });
    G.P.e3tries = Object.fromEntries(Object.keys(G.data.E3.LIST).map((id) => [id, 3]));
  };
  {
    const G = loadEngine();
    start(G, 1);
    fullfill(G);
    for (const a of Object.values(G.data.E3.LIST)) {
      const miss = G.e3Keys(a.id).filter((k) => !k.met);
      if (miss.length) fail(`使徒 ${a.id}: そろえても満たせない条件：${miss.map((k) => k.id).join("・")}`);
      if (!G.e3Open(a.id)) fail(`使徒 ${a.id}: 条件をそろえても絶界が破れない`);
    }
  }

  // ---------------------------------------------------------------- 戦ってみる（鍛えた冒険者・仲間三人・薬あり）
  const strong = (G, seed, keys, sword) => {
    const D = G.data;
    start(G, seed);
    const S = G.S;
    // 点（S5）。使徒は高い点が前提の強さ：鍛えた冒険者は、やりこんだ 70 点近く（20 点ほどでは条件をそろえても勝てない）
    Object.assign(S.stats, { 筋力: 67, 体力: 67, 敏捷: 57, 知力: 42, 魔力: 30, 魅力: 42 });
    S.maxHp = S.hp = G.maxHpOf(S.stats);
    S.weapon = sword ? "volgrim" : "mithril"; S.armor = "dragonmail";
    S.inv = { potion: 6, elixir: 2 };
    S.companions = [0, 1, 2].map((i) => ({ name: `傭兵の${"アベル,ブラン,カイ".split(",")[i]}`, cls: "傭兵", power: 70, dmg: 2, desc: "無口" }));
    if (keys) Object.values(D.E3.LIST).forEach((a) => a.keys.forEach((k) => { k.test = keys === "all" ? () => true : () => false; }));
    if (keys === "all" && G.e10Fill) G.e10Fill(S); // 弱らせる出来事（E10）も、すべて起こしたことに
  };
  const fight = (G, id) => {
    const S = G.S;
    S.mode = "event";
    G.apply({ e3fight: id });
    let n = 0;
    while (S.mode === "combat" && !S.over && n++ < 200) {
      const lowHp = S.hp < S.maxHp * 0.45;
      const potion = ["elixir", "potion"].find((p) => S.inv[p]);
      G.act(lowHp && potion ? "cb:item:" + potion : "cb:attack");
    }
    return !S.over && S.mode !== "combat" && !!S.flags[G.data.E3.LIST[id].flag];
  };
  const rate = (id, keys, N, sword) => {
    let w = 0;
    for (let i = 0; i < N; i++) { const G = loadEngine(); strong(G, 1000 + i, keys, sword); if (fight(G, id)) w++; }
    return w / N;
  };
  const N = 24;
  const rows = [];
  // 倒せない使徒（E8。src/data/e8_unslay.js）は戦いにならないので測らない（tests/checks/e8_unslay.mjs）
  for (const a of Object.values(LIST).filter((x) => !x.noslay)) {
    const all = rate(a.id, "all", N);
    const none = rate(a.id, "none", N, true); // 絶界を破る剣だけ持って、条件なしで
    rows.push(`${a.id}(${a.rank}) 剣だけ ${Math.round(none * 100)}%・条件そろえて ${Math.round(all * 100)}%`);
    if (all < 0.3) fail(`使徒 ${a.id}: 条件をそろえても、鍛えた冒険者の勝率が低すぎる（${Math.round(all * 100)}%）`);
    if (a.rank === "S" && none > 0.04) fail(`使徒 ${a.id}: S 級なのに、剣だけで勝ててしまう（${Math.round(none * 100)}%）`);
    // もとからいる居城の主（黒鎧・苔衣）は、絶界を破る剣そのものが条件として書かれていた（目的「使徒を討つ」）。新しい使徒だけ測る
    if (a.rank === "A" && E3.FOES[a.foe] && none > 0.2) fail(`使徒 ${a.id}: A 級なのに、剣だけで勝ちやすい（${Math.round(none * 100)}%）`);
  }
  console.log("NOTE E3 鍛えた冒険者（仲間三人・薬あり）の勝率: " + rows.join(" ／ "));

  // ---------------------------------------------------------------- 倒したあと・逃げたあと
  {
    const G = loadEngine();
    strong(G, 7, "all");
    const S = G.S;
    let won = false;
    for (let i = 0; i < 6 && !won; i++) { const g = loadEngine(); strong(g, 7 + i, "all"); if (fight(g, "levian")) { won = g; } }
    if (!won) fail("忘れ水の使徒に一度も勝てなかった（確かめられない）");
    else {
      const g = won;
      const rec = g.P.slain && g.P.slain.e3_levian;
      if (!rec || rec.n !== 1) fail("倒した使徒が G.P.slain に残っていない");
      const cx = g.e3Codex("e3_levian");
      if (!cx || !cx.stats || !cx.keys) fail("倒した使徒の性能が図鑑（G.e3Codex）で見えない");
      if (g.e3Codex("e3_lugu").stats) fail("倒していない使徒の性能が図鑑で見えている");
      if (!g.S.inv.e3_d_levian) fail("骸の素材を落とさない");
      if (!g.P.trophies.majin) fail("トロフィー「使徒殺し」が付かない");
      if (!g.majinSlain(g.S).length || !g.goalDone(g.S)) fail("忘れ水の使徒を倒しても「使徒を討つ」の目的が果たせない");
      if (!g.S.chronicle.some((c) => /書庫の女を討つ/.test(c.text))) fail("年表（人生の物語）に倒した一行が無い");
      // 次の冒険では生きている（世界はやり直し）が、図鑑には残る
      start(g, 99, true);
      if (g.S.flags[g.data.E3.LIST.levian.flag]) fail("次の冒険でも使徒が死んだままになっている");
      if (!g.e3EverSlain("e3_levian")) fail("次の冒険で、倒したことがある記録が消えている");
      if (!g.data.EVENTS.find((e) => e.id === "e3_meet_levian").cond(g.S)) fail("次の冒険で、その使徒に会えない");
    }
    // S 級を倒すとトロフィー
    let wonS = null;
    for (let i = 0; i < 8 && !wonS; i++) { const g = loadEngine(); strong(g, 50 + i, "all"); if (fight(g, "kurobane")) wonS = g; } // S 級（E9 で海嘯は A に移った）
    if (wonS && !wonS.P.trophies.e3_saigai) fail("S 級を倒しても「格付けの外」が付かない");
  }
  {
    // 背を向けて逃げる：出る・逃げ切れば回数が残る
    const G = loadEngine();
    strong(G, 3, "none");
    const S = G.S;
    S.stats.敏捷 = 99;
    S.mode = "event";
    G.apply({ e3fight: "notari" });
    const acts = G.actions().flatMap((g) => g.list);
    if (!acts.some((a) => a.id === "cb:e3flee")) fail("使徒との戦いに「背を向けて逃げる」が無い");
    if (acts.find((a) => a.id === "cb:flee" && !a.disabled)) fail("使徒との戦いで、ふつうの逃げるが使える");
    let n = 0;
    while (S.mode === "combat" && !S.over && n++ < 50) G.act("cb:e3flee");
    if (!S.over && S.mode !== "combat" && G.e3Tries("notari") < 1) fail("使徒から逃げ切っても、挑んだ回数が残らない");
    // 古い G.P（slain・e3tries が無い）でも動く
    const g2 = loadEngine();
    g2.P = { trophies: {}, graves: [] };
    if (g2.e3Tries("yura") !== 0 || g2.e3EverSlain("e3_yura")) fail("古い G.P で記録の読み出しがおかしい");
  }
  {
    // 剣も条件も無いと、刃は届かない（絶界）。剣があれば届く。E11 から絶界は黒鎧だけなので、黒鎧で確かめる
    const G = loadEngine();
    strong(G, 4, "none");
    G.S.mode = "event";
    G.apply({ e3fight: "graw" });
    const f = G.S.combat.foes[0];
    if (!G.foeData(f).majin) fail("条件も剣も無いのに、絶界が破れている");
    const G2 = loadEngine();
    strong(G2, 4, "none");
    G2.S.weapon = "volgrim";
    G2.S.mode = "event";
    G2.apply({ e3fight: "graw" });
    if (G2.foeData(G2.S.combat.foes[0]).majin) fail("絶界を破る剣があるのに、絶界が破れない");
  }
  {
    // 筋のよい遊び方の bot は、使徒に挑む選択肢を選ばない
    const src = readFileSync(new URL("../bot.mjs", import.meta.url), "utf8") + readFileSync(new URL("../bots.mjs", import.meta.url), "utf8");
    if ((src.match(/e3fight/g) || []).length < 2) fail("bot が使徒に挑む選択肢（e3fight）を見分けていない");
  }
};
