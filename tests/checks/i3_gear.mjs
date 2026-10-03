// I3：武具の型と組み合わせの品（src/data/items_i3_*.js・src/engine/zzz_gear_i3.js）
// - 数（武器 60・防具 40・装飾品 30 以上、伝説の品 8 以上）。型の欄と、名物の町が本当にある町か
// - 組み合わせの品が文になる（未置換・undefined・NaN が無い。装飾品の補正の種類は決まりどおり）
// - 稀さの分かれ方（深いほど逸品が増える）
// - 呪いと鑑定（正体不明の品は着けると正体が分かる・呪われた武具は外すと傷を負う・鍛冶屋で鑑定・呪い抜き・強化・銘入れ）
// - 店の入れ替わり（日ごとに変わる・同じ日は同じ・買った品は消える・鍛冶の都は品が多い）
// - 保存と読み込み（JSON にして別のエンジンで読み直しても同じ品）・古いセーブ（S.i3 が無い）
// - ランダムに遊んで止まらない（店・鍛冶・宿の預かりを多めに選ぶ）
export default ({ G, fail, ok, loadEngine, seeded }) => {
  const D = G.data;
  const I3 = D.I3;
  const A = G.i3;
  if (!A || !I3) return fail("I3: G.i3 か D.I3 が無い");
  const all = Object.entries(D.ITEMS);
  const count = (type, legend) => all.filter(([, it]) => it.type === type && !!it.legend === legend).length;
  const n = { weapon: count("weapon", false), armor: count("armor", false), ring: count("ring", false), legend: all.filter(([, it]) => it.legend).length };
  if (n.weapon < 60 || n.armor < 40 || n.ring < 30) fail(`I3: 型の数が足りない（武器 ${n.weapon}・防具 ${n.armor}・装飾品 ${n.ring}）`);
  if (n.legend < 8) fail(`I3: 伝説の品が ${n.legend}`);
  for (const [id, it] of all) {
    if (!it.i3) continue;
    for (const t of it.i3.from || []) if (!D.LOCS[t] || D.LOCS[t].type !== "town") fail(`I3: ${id} の名物の町 ${t} が町でない`);
    if (it.i3.gen && it.i3.mat && !I3.MATS[it.i3.mat]) fail(`I3: ${id} の材質の種類 ${it.i3.mat} が無い`);
    if (it.type === "weapon" && !(it.dmg && it.dmg.length === 3 && D.STATS.includes(it.stat))) fail(`I3: ${id} の攻撃の欄が変`);
    if (!it.desc && !it.i3.line) fail(`I3: ${id} に説明が無い`);
  }
  // 名物の型・使徒領の型には入手先がある（町の品ぞろえ・落とし物・宝）
  const lootSrc = new Set(Object.values(D.ENEMIES).flatMap((e) => (e.loot || []).map(([x]) => x)));
  for (const [id, it] of all) if (it.i3 && !it.i3.gen && !(it.i3.from || []).length && !lootSrc.has(id)) fail(`I3: ${id} に入手先が無い`);
  const legendSrc = new Set([...I3.LEGEND_DEEP, ...I3.LEGEND_APOSTLE]);
  for (const e of D.EVENTS) for (const c of e.choices) for (const o of [c.ok, c.ng]) if (o && typeof o.item === "string") legendSrc.add(o.item);
  for (const [id, it] of all) if (it.legend && !legendSrc.has(id)) fail(`I3: 伝説の品 ${id} に入手先が無い`);

  // ---------------------------------------------------------------- 組み合わせの品が文になる
  const bad = (s) => typeof s !== "string" || !s || /\{|\}|undefined|NaN|null/.test(s);
  const gens = Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].i3 && D.ITEMS[id].i3.gen && A.smithable(id));
  let built = 0;
  const check = (id) => {
    const it = D.ITEMS[id];
    if (!it) return;
    built++;
    const eff = A.effectText(it);
    if (bad(it.name) || bad(it.desc) || /NaN|undefined/.test(eff) || !(it.price >= 1)) fail(`I3: 組み合わせの品の文が変 ${id}：${it.name}／${it.desc}／${eff}／${it.price}`);
    if (it.type === "ring") {
      for (const k of Object.keys(it.stats || {})) if (!D.STATS.includes(k)) fail(`I3: ${id} の能力値 ${k}`);
      for (const k of Object.keys(it.bonus || {})) if (!A.RING_BONUS.includes(k)) fail(`I3: ${id} の補正の種類 ${k}`);
    }
    if (it.type === "weapon" && !(it.dmg[2] >= 0)) fail(`I3: ${id} の攻撃の加算が負`);
  };
  for (const b of gens) {
    const kind = D.ITEMS[b].i3.mat;
    for (const m of ["", ...Object.keys(I3.MATS[kind] || {})]) for (const f of ["", "u", "r", "+3"]) check(A.id({ base: b, mat: m, unk: f === "u", rust: f === "r", plus: f === "+3" ? 3 : 0 }));
    for (const pre of Object.keys(I3.PRE)) check(A.id({ base: b, pre }));
    for (const suf of Object.keys(I3.SUF)) check(A.id({ base: b, suf }));
  }
  const rnd = seeded(5);
  for (let i = 0; i < 3000; i++) { const id = A.roll(Math.floor(rnd() * 7), { find: rnd() < 0.5, rnd }); if (!id) fail("I3: 作れない組み合わせがある"); else check(id); }
  // 二つの銘の組み合わせはすべて名になる
  for (const pre of Object.keys(I3.PRE)) for (const suf of Object.keys(I3.SUF)) for (const b of ["i3w_spear", "i3a_hauberk", "i3r_ring"]) check(A.id({ base: b, mat: "", pre, suf }));
  if (D.ITEMS["i3~i3w_spear~nope~~~"] || D.ITEMS["i3~volgrim~~~~+1"] || D.ITEMS["i3~herb~~~~"]) fail("I3: 組み立ててはいけない品が組み立った");
  if (Object.keys(D.ITEMS).some((k) => k.startsWith("i3~"))) fail("I3: 組み合わせの品が D.ITEMS の一覧に出てくる");

  // ---------------------------------------------------------------- 稀さの分かれ方
  const share = (lv) => { const c = [0, 0, 0]; const r = seeded(9 + lv); for (let i = 0; i < 2000; i++) c[A.rarityOf(D.ITEMS[A.roll(lv, { rnd: r })])]++; return c.map((x) => Math.round((x / 2000) * 100)); };
  const s0 = share(0), s5 = share(5);
  if (!(s0[0] > s0[1] && s0[1] > s0[2] && s0[2] > 0)) fail(`I3: 浅い所の稀さの分かれ方が変 ${s0}`);
  if (!(s5[2] > s0[2] * 2 && s5[0] < s0[0])) fail(`I3: 深い所で逸品が増えない ${s0} → ${s5}`);

  // ---------------------------------------------------------------- 冒険の中で
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 70; });
  const start = (g) => g.newGame({ cls: "merc", stats, caps, goal: Object.keys(g.data.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  G.rand = seeded(17);
  G.P = { trophies: {}, graves: [] };
  start(G);
  const S = G.S;
  S.gold = 99999;
  // 正体不明の呪われた武器：着けると正体が分かり、別の武器に替えると傷を負う
  const cursedU = A.id({ base: "i3w_broadsword", mat: "steel", pre: "cursed", unk: true });
  G.give(cursedU);
  if (!/見慣れない/.test(D.ITEMS[cursedU].name) || D.ITEMS[cursedU].cursed) fail("I3: 正体不明の品の名か呪いが見えている");
  G.equip(cursedU);
  const real = A.identify(cursedU);
  if (S.weapon !== real || S.inv[cursedU] || !G.weapon().cursed) fail(`I3: 着けても正体が分からない ${S.weapon}`);
  if (!(G.statEff("魅力") <= 40)) fail("I3: 呪いの魅力の減りが効かない");
  S.hp = S.maxHp;
  G.give("longsword");
  G.equip("longsword");
  if (S.hp !== S.maxHp - 3 || S.weapon !== "longsword" || !S.inv[real]) fail(`I3: 呪われた武器を外しても傷を負わない（HP ${S.hp}/${S.maxHp}）`);
  // 鍛冶：鑑定・呪い抜き・強化・銘入れ（店の奥の炉）
  const go = (loc, fac) => { S.loc = loc; S.mode = "fac"; S.fac = fac; };
  go("karna", "shop");
  const ids = () => G.actions().flatMap((g) => g.list).map((a) => a.id);
  const unk2 = A.id({ base: "i3r_ring", mat: "gold", suf: "cat", unk: true });
  G.give(unk2);
  if (!ids().includes("shop:i3appr:" + unk2)) fail("I3: 正体不明の品の鑑定が店に出ない");
  G.act("shop:i3appr:" + unk2);
  if (S.inv[unk2] || !S.inv[A.identify(unk2)]) fail("I3: 鑑定しても正体が分からない");
  G.act("shop:i3fix:" + real);
  const clean = A.id({ base: "i3w_broadsword", mat: "steel" });
  if (S.inv[real] || !S.inv[clean]) fail("I3: 打ち直しても呪いが抜けない");
  G.equip(clean);
  let tries = 0;
  while (A.parse(S.weapon).plus < 2 && tries++ < 30) G.act("shop:i3up:" + S.weapon);
  if (A.parse(S.weapon).plus !== 2) fail(`I3: 鍛え直しで +2 にならない ${S.weapon}`);
  if (ids().includes("shop:i3up:" + S.weapon)) fail("I3: ふつうの町で +3 より上に鍛えられる");
  go("w2_dranherz", "shop");
  if (!ids().includes("shop:i3up:" + S.weapon)) fail("I3: 鍛冶の都で +3 に鍛えられない");
  G.act("shop:i3up:" + S.weapon);
  if (A.parse(S.weapon).plus !== 3) fail("I3: 鍛冶の都の +3 が失敗した（見込み 100%）");
  const w3 = G.weapon();
  if (!(w3.dmg[2] === D.ITEMS.i3w_broadsword.dmg[2] + 1 + 3)) fail(`I3: 強化の攻撃の加算が変 ${w3.dmg}`);
  G.act("shop:i3name:" + S.weapon);
  if (!A.parse(S.weapon).pre) fail("I3: 銘入れで前の銘が付かない");
  go("w2_dranherz", "forge");
  if (!ids().some((x) => x.startsWith("forge:i3name:"))) fail("I3: 鍛冶場に鍛冶の行いが出ない");
  // 武器と防具の補正が判定に効く
  const before = G.gearBonus("steal");
  const thiefArmor = A.id({ base: "i3a_tunic", mat: "hemp", suf: "thief" });
  G.give(thiefArmor);
  G.equip(thiefArmor);
  if (G.gearBonus("steal") !== before + 10) fail("I3: 防具の盗みの補正が効かない");

  // ---------------------------------------------------------------- 店の入れ替わり
  go("karna", "shop");
  const d1 = A.stock("karna", 10), d1b = A.stock("karna", 10), d2 = A.stock("karna", 11);
  if (JSON.stringify(d1) !== JSON.stringify(d1b)) fail("I3: 同じ日の品ぞろえが変わる");
  let changed = 0;
  for (let d = 1; d <= 10; d++) if (JSON.stringify(A.stock("karna", d)) !== JSON.stringify(A.stock("karna", d + 1))) changed++;
  if (changed < 9 || JSON.stringify(d1) === JSON.stringify(d2)) fail(`I3: 日ごとに品ぞろえが入れ替わらない（${changed}/10）`);
  if (A.stock("w2_dranherz", 3).length <= A.stock("w2_granbel", 3).length) fail("I3: 鍛冶の都の品が少ない");
  if (JSON.stringify(A.stock("karna", 4)) === JSON.stringify(A.stock("yakumo", 4))) fail("I3: 町ごとに品ぞろえが違わない");
  if (!A.stock("yakumo", 2).concat(A.stock("yakumo", 3), A.stock("yakumo", 4)).some((id) => (D.ITEMS[id].i3 || {}).from)) fail("I3: 島の都に名物が並ばない");
  S.day = 10;
  const today = A.stock();
  const pick = today[0];
  if (!ids().includes("shop:buy:" + pick)) fail("I3: 今日の品が店に出ない");
  const g0 = S.gold;
  G.act("shop:buy:" + pick);
  if (S.gold !== g0 - D.ITEMS[pick].price || !S.inv[pick] || A.stock().includes(pick)) fail("I3: 今日の品を買えない・買っても並んだまま");
  if (!G.actions().flatMap((g) => g.list).some((a) => a.id.startsWith("shop:buy:") && /[▲▼＝？]/.test(a.sub))) fail("I3: 店に比べの印が出ない");
  // まとめて売る・宿に預ける
  G.give("i3w_club"); G.give("i3w_knife");
  if (ids().includes("shop:i3junk")) { G.act("shop:i3junk"); if (S.inv.i3w_club) fail("I3: 要らない武具をまとめて売れない"); }
  else fail("I3: まとめて売るが出ない");
  for (let i = 0; i < 12; i++) G.give(A.id({ base: "i3w_spear", mat: "iron", plus: (i % 2) + 1 }));
  for (let i = 0; i < 12; i++) G.give("i3w_club");
  const agi = G.statEff("敏捷");
  if (!(A.load() > A.CAP) || !(A.overPenalty() > 0)) fail("I3: 荷の重さが数えられない");
  go("karna", "inn");
  G.act("inn:i3put");
  if (A.load() !== 0 || !(G.statEff("敏捷") > agi)) fail("I3: 宿に預けても荷が軽くならない");
  const stashId = Object.keys(S.i3.stash)[0];
  G.act("inn:i3get:" + stashId);
  if (!S.inv[stashId]) fail("I3: 宿から受け取れない");
  if (!G.m5Rows(S).some(([k]) => k === "武具の荷")) fail("I3: シートに武具の荷の行が無い");

  // ---------------------------------------------------------------- 図鑑
  const cx = A.codex();
  if (!cx.mats["metal:steel"] || !Object.keys(cx.pre).length) fail("I3: 図鑑に材質と銘が残らない");
  if (G.codex().items[clean] || !G.codex().items.i3w_broadsword) fail("I3: 図鑑に組み合わせの品そのものが載る・型が載らない");
  const merged = G.codexMerge({ items: {}, i3: { mats: { "wood:oak": 1 }, pre: {}, suf: {} } }, G.codex());
  if (!merged.i3 || !merged.i3.mats["wood:oak"] || !merged.i3.mats["metal:steel"]) fail("I3: 図鑑をまとめると材質と銘が消える");
  const tbl = A.codexTable();
  if (!tbl.mats.length || tbl.pre.length !== Object.keys(I3.PRE).length) fail("I3: 図鑑の表が作れない");

  // ---------------------------------------------------------------- 宝の口・伝説の品
  S.loc = "graveyard"; S.mode = "explore"; S.fac = null; S.depth = 3;
  const inv0 = Object.keys(S.inv).length;
  G.apply({ text: "棚の奥に何かある。", i3gear: 4 });
  if (Object.keys(S.inv).length <= inv0) fail("I3: 出来事の i3gear で品が出ない");
  const lg = A.freeLegend(I3.LEGEND_APOSTLE);
  G.give(lg);
  if (!S.i3.legends[lg] || A.freeLegend([lg])) fail("I3: 伝説の品が一つの冒険で二度出る");

  // ---------------------------------------------------------------- 保存と読み込み・古いセーブ
  const json = JSON.stringify({ S, P: G.P });
  const G2 = loadEngine();
  const back = JSON.parse(json);
  G2.S = back.S;
  G2.P = back.P;
  G2.rand = seeded(1);
  for (const id of [back.S.weapon, back.S.armor, ...Object.keys(back.S.inv), ...Object.keys(back.S.i3.stash)].filter(Boolean)) {
    const a = D.ITEMS[id], b = G2.data.ITEMS[id];
    if (!b || a.name !== b.name || a.price !== b.price || JSON.stringify(a.dmg) !== JSON.stringify(b.dmg)) fail(`I3: 読み直すと品が変わる ${id}`);
  }
  if (G2.weapon().name !== G.weapon().name || G2.statEff("敏捷") !== G.statEff("敏捷")) fail("I3: 読み直すと装備の効き目が変わる");
  if (JSON.stringify(G2.i3.stock("karna", 20)) !== JSON.stringify(A.stock("karna", 20))) fail("I3: 読み直すと品ぞろえが変わる");
  // 古いセーブ（S.i3 が無い）
  const old = JSON.parse(json).S;
  delete old.i3;
  G2.S = old;
  try {
    old.loc = "karna"; old.mode = "fac"; old.fac = "shop";
    G2.actions();
    old.fac = "inn";
    G2.actions();
    G2.act("inn:i3put");
    G2.m5Rows(old);
    old.mode = "explore"; old.fac = null;
    G2.startCombat(["goblin"], {});
    for (let i = 0; i < 20 && old.combat; i++) G2.act("cb:attack");
  } catch (e) { fail("I3: 古いセーブで止まる " + e.stack); }

  // ---------------------------------------------------------------- ランダムに遊んで止まらない
  let errs = 0, steps = 0, smith = 0, legends = 0, finds = 0;
  for (let game = 0; game < 24; game++) {
    const g = loadEngine();
    g.rand = seeded(1000 + game);
    g.P = { trophies: {}, graves: [] };
    start(g);
    const s = g.S;
    s.gold = 400 + game * 50;
    const r = seeded(77 + game);
    for (let i = 0; i < 400 && !s.over; i++) {
      try {
        const list = g.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
        if (!list.length) break;
        const mine = list.filter((a) => /i3|shop:buy|fac:shop|fac:inn|fac:forge/.test(a.id));
        const a = mine.length && r() < 0.35 ? mine[Math.floor(r() * mine.length)] : list[Math.floor(r() * list.length)];
        if (/i3(up|name|fix|appr)/.test(a.id)) smith++;
        const inv = Object.keys(s.inv).length;
        g.act(a.id);
        steps++;
        if (Object.keys(s.inv).some((id) => id.startsWith("i3~")) && Object.keys(s.inv).length > inv) finds++;
        if (r() < 0.2) { const gear = Object.keys(s.inv).filter((id) => ["weapon", "armor", "ring"].includes((g.data.ITEMS[id] || {}).type)); if (gear.length && s.mode !== "combat") g.equip(gear[Math.floor(r() * gear.length)]); }
        for (const id of [s.weapon, s.armor, s.ring, ...Object.keys(s.inv)]) if (id && !g.itemInfo(id)) throw new Error("品が引けない " + id);
      } catch (e) { errs++; if (errs < 4) fail(`I3: ランダムに遊ぶと止まる（${game}）：${e.stack}`); break; }
    }
    legends += Object.keys((s.i3 && s.i3.legends) || {}).length;
  }
  if (!smith) fail("I3: ランダムに遊んでも鍛冶が一度も選ばれない");
  if (!errs) ok(`i3 武具：武器 ${n.weapon}・防具 ${n.armor}・装飾品 ${n.ring}・伝説 ${n.legend}・組み立てた品 ${built}・稀さ（浅い ${s0.join("/")}％ → 深い ${s5.join("/")}％）・ランダム ${steps} 手（鍛冶 ${smith}・拾った ${finds}・伝説 ${legends}）`);
};
