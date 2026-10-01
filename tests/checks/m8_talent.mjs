// M8: 人の才（engine/zm8_talent.js・data/m8_talents.js・data/events_m8.js）
// - 才は 6〜10 個の技能で Lv0〜3。作成の分布で Lv3 はまずいない（1% 未満）。得意の技能は才が付きやすい
// - 作成：振り直すと才も揺れる。鍵をかけた能力値の技能は残る。Lv2 以上は限界を押し上げる。cre.options が才を渡す
// - 判定：才の段階で成功率が変わる（攻撃は武器の技能、術・癒し・威圧・逃走はそれぞれの技能）。見込みの％と実際の判定が同じ
// - 成長：Lv3 は Lv0 よりよく伸びる
// - 古いセーブ（S.m8 が無い）でも動き、職業と能力値から推す（乱数を進めない）
// - 仲間：はじめは見えない。見立て屋で分かる。長く旅をしても分かる
// - 才が変わる出来事・人生の物語と墓碑の一行
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  let n = 0;
  const f = (m) => { n++; fail(m); };
  const start = (cls, seed, talents) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 40; caps[k] = 60; });
    G.newGame({ cls, stats, caps, talents, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const flat = (v) => Object.fromEntries(D.TALENT_KEYS.map((k) => [k, v]));

  // ---------------------------------------------------------------- 表
  const keys = D.TALENT_KEYS;
  if (!(keys.length >= 6 && keys.length <= 10)) f(`技能の数が ${keys.length}（6〜10）`);
  keys.forEach((k) => { if (!D.STATS.includes(D.TALENTS[k].stat)) f(`技能 ${k} の能力値 ${D.TALENTS[k].stat} が無い`); });
  Object.keys(D.CLASSES).forEach((c) => { if (!G.m8Main(c).length) f(`職業 ${c} に得意の技能が無い`); G.m8Main(c).forEach((k) => { if (!D.TALENTS[k]) f(`職業 ${c} の得意 ${k} が技能に無い`); }); });

  // ---------------------------------------------------------------- 分布（作成と同じ振り方を 4000 人）
  const r = seeded(8);
  const cnt = [0, 0, 0, 0];
  let mainHi = 0, mainN = 0, otherHi = 0, otherN = 0, anyLv3 = 0;
  for (let i = 0; i < 4000; i++) {
    const cls = Object.keys(D.CLASSES)[i % 5];
    const t = G.m8Roll(cls, r);
    if (keys.some((k) => t[k] === 3)) anyLv3++;
    keys.forEach((k) => {
      cnt[t[k]]++;
      if (G.m8Main(cls).includes(k)) { mainN++; if (t[k] >= 1) mainHi++; } else { otherN++; if (t[k] >= 1) otherHi++; }
    });
  }
  const all = cnt.reduce((a, b) => a + b, 0);
  const p3 = cnt[3] / all;
  if (!(p3 > 0 && p3 < 0.005)) f(`Lv3 の割合が ${(p3 * 100).toFixed(2)}%（0〜0.5%）`);
  if (!(anyLv3 / 4000 < 0.04)) f(`Lv3 を持つ人が ${(anyLv3 / 40).toFixed(1)}%（4% 未満。まずいない）`);
  if (!(mainHi / mainN > otherHi / otherN + 0.3)) f("得意の技能に才が付きやすくない");
  ok(`m8 分布：Lv0 ${cnt[0]}・Lv1 ${cnt[1]}・Lv2 ${cnt[2]}・Lv3 ${cnt[3]}（Lv3 ${(p3 * 100).toFixed(2)}%・Lv3 を持つ人 ${(anyLv3 / 40).toFixed(1)}%）`);

  // ---------------------------------------------------------------- 作成
  if (G.cre) {
    const cre = G.cre;
    const rr = seeded(21);
    const dr = cre.fresh(rr);
    if (!dr.talents) f("作成の下書きに才が無い");
    else {
      let moved = false;
      for (let i = 0; i < 20 && !moved; i++) { const a = JSON.stringify(dr.talents); cre.roll(dr, rr); moved = JSON.stringify(dr.talents) !== a; }
      if (!moved) f("振り直しても才が揺れない");
      // 鍵：魔力に鍵をかけると、術と祈りの才は残る
      dr.locks = { 魔力: true };
      const keep = [dr.talents.magic, dr.talents.pray];
      for (let i = 0; i < 10; i++) cre.roll(dr, rr);
      if (dr.talents.magic !== keep[0] || dr.talents.pray !== keep[1]) f("鍵をかけた能力値の才が振り直しで変わった");
      dr.locks = {};
      // 伸びしろ：剣と槍斧が Lv3 なら筋力の限界が上がる
      const base = cre.cap(Object.assign({}, dr, { talents: flat(1) }), "筋力");
      const up = cre.cap(Object.assign({}, dr, { talents: Object.assign(flat(1), { sword: 3 }) }), "筋力");
      if (!(up > base || base === 99)) f(`才が限界を押し上げない（${base} → ${up}）`);
      const o = cre.options(dr, rr);
      if (!o.talents || JSON.stringify(o.talents) !== JSON.stringify(dr.talents)) f("cre.options が才を渡さない");
      G.rand = seeded(5);
      G.newGame(o);
      if (JSON.stringify(G.S.m8.t) !== JSON.stringify(dr.talents)) f("作成の才が冒険に引き継がれない");
    }
  }

  // ---------------------------------------------------------------- 判定
  let S = start("merc", 31, flat(1));
  G.startCombat(["goblin"]);
  const atk1 = G.cb.attack(), heal1 = G.cb.heal(), flee1 = G.cb.flee();
  S.m8.t = Object.assign(flat(1), { sword: 3, pray: 2, stealth: 0 });
  const atk3 = G.cb.attack(), heal2 = G.cb.heal(), flee0 = G.cb.flee();
  if (atk3 - atk1 !== Math.min(95, atk1 + 12) - atk1) f(`剣の才 Lv3 で攻撃が +12 にならない（${atk1} → ${atk3}）`);
  if (heal2 - heal1 !== Math.min(95, heal1 + 6) - heal1) f(`祈りの才 Lv2 で癒しが +6 にならない（${heal1} → ${heal2}）`);
  if (flee0 !== flee1) f("才なしで逃走の成功率が変わった（才なしは伸びにくいだけ）");
  // 見込みと実際の判定が同じ％
  const shown = G.cb.attack();
  G.combatAct("attack");
  const last = [...S.log].reverse().find((e) => e.k === "dice" && e.reason === "攻撃");
  if (!last || last.chance !== shown) f(`攻撃の見込み ${shown}% と判定 ${last && last.chance}% が違う`);
  if (last && !(last.talent && last.talent.k === "sword" && last.talent.lv === 3)) f("判定の記録に才が残らない");
  // 武器の技能
  if (G.m8WeaponSkill(D.ITEMS.axe) !== "spear" || G.m8WeaponSkill(D.ITEMS.katana) !== "sword" || G.m8WeaponSkill(D.ITEMS.dagger) !== "sword" || G.m8WeaponSkill(D.ITEMS.fists) !== null) f("武器の技能の見分けがおかしい");
  // 能力値だけの判定（出来事の％）も才で動く
  S = start("thief", 32, Object.assign(flat(1), { stealth: 3 }));
  if (G.chance("敏捷", 0) !== G.clamp(S.stats.敏捷 + 12, 5, 95)) f("盗みの才が敏捷の判定に効かない");

  // ---------------------------------------------------------------- 成長
  const growth = (lv) => {
    let total = 0;
    for (let s = 0; s < 40; s++) {
      const S2 = start("merc", 900 + s, Object.assign(flat(1), { lore: lv }));
      S2.stats.知力 = 20; S2.caps.知力 = 99;
      for (let i = 0; i < 60; i++) G.check("知力", "易しい", "テスト");
      total += S2.stats.知力 - 20;
    }
    return total;
  };
  const g0 = growth(0), g3 = growth(3);
  if (!(g3 > g0 * 1.5)) f(`学問の才 Lv3 の伸び（${g0} → ${g3}）が Lv0 より大きくない`);
  ok(`m8 成長（知力・40人×60回）：才なし ${g0}・百年に一人 ${g3}`);

  // ---------------------------------------------------------------- 古いセーブ
  S = start("mage", 41);
  delete S.m8;
  G.rand = seeded(41);
  const t = G.m8Of(S);
  if (G.rand() !== seeded(41)()) f("古いセーブの才を推すときに乱数を進めた");
  if (!t || !keys.every((k) => typeof t[k] === "number")) f("古いセーブで才が推されない");
  if (S.m8.src !== "guess") f("古いセーブの才の出どころが guess でない");
  if (!(t.magic >= 1)) f("魔法使いの古いセーブで術の才が無い");
  const S3 = JSON.parse(JSON.stringify(S));
  delete S3.m8;
  if (JSON.stringify(G.m8Guess(S3)) !== JSON.stringify(G.m8Guess(S3))) f("推した才が毎回同じでない");

  // ---------------------------------------------------------------- 仲間
  S = start("merc", 51, flat(1));
  G.addCompanion({ name: "槍兵のロイド", cls: "槍兵", power: 50, dmg: 1, desc: "無口だが義理堅い" });
  const c = S.companions[0];
  if (!c.m8 || c.m8.known) f("仲間の才が無いか、はじめから見えている");
  if (G.m8CompLabel(c) !== "才は、まだ見えない") f("見立ての前に仲間の才が見える");
  const again = JSON.stringify(c.m8.t);
  delete c.m8;
  if (JSON.stringify(G.m8Comp(c).t) !== again) f("仲間の才が名前から決まらない（古いセーブで揺れる）");
  // 酒場の見立て屋
  S.loc = Object.keys(D.LOCS).find((id) => (D.LOCS[id].facilities || D.LOCS[id].fac || []).includes("tavern")) || S.loc;
  S.mode = "fac"; S.fac = "tavern"; S.gold = 100; S.recruits = null;
  const seer = G.actions().flatMap((g) => g.list).find((a) => a.id === "m8:seer");
  if (!seer) f("酒場に見立て屋が出ない");
  else {
    G.act("m8:seer");
    if (!G.m8Comp(c).known) f("見立て屋で仲間の才が分からない");
    if (S.gold !== 100 - D.M8_TEXT.seer.price) f("見立て屋の代金が引かれない");
    if (G.actions().flatMap((g) => g.list).some((a) => a.id === "m8:seer")) f("見立てたあとも見立て屋が出る（見る者がいない）");
  }
  // 長い旅
  S = start("merc", 52, flat(1));
  G.addCompanion({ name: "弓使いのセラ", cls: "弓使い", power: 50, dmg: 1, desc: "陽気なほら吹き" });
  const d = S.companions[0];
  if (G.m8CompMain(d) !== "bow" && d.m8.t.bow < 1 && !G.m8Best(d.m8.t).length) f("弓使いの得意が弓でない");
  S.day += 25;
  S.mode = "explore";
  G.endTurn();
  if (!G.m8Comp(d).known) f("長く旅をしても仲間の才が分からない");
  // 酒場で雇える者は、才のぶん腕前が違う
  G.rand = seeded(53);
  const gens = Array.from({ length: 300 }, () => G.genCompanion());
  if (!gens.every((x) => x.m8 && x.m8.t)) f("雇える者に才が無い");

  // ---------------------------------------------------------------- 才が変わる出来事
  S = start("merc", 61, Object.assign(flat(1), { sword: 2 }));
  const ev = D.EVENTS.find((e) => e.id === "m8_fingerstone");
  if (!ev) f("才が変わる出来事が無い");
  else {
    G.startEvent("m8_fingerstone");
    G.chooseEvent(0);
    const sum = keys.reduce((a, k) => a + S.m8.t[k], 0);
    if (S.m8.t.sword !== 3) f("指の跡の石で、いちばんの才が伸びない");
    if (sum !== keys.length + 1) f(`指の跡の石の代償がない（才の合計 ${sum}）`);
  }

  // ---------------------------------------------------------------- 人生の物語と墓碑
  S = start("merc", 71, Object.assign(flat(1), { sword: 3 }));
  G.die("テストで倒れた");
  const g = G.P.graves[0];
  if (!g || !g.talentLine || !g.talentLine.includes("剣")) f(`墓碑に才の一行が無い（${g && g.talentLine}）`);
  if (S.story && !S.story.life[0].includes("剣の才")) f("人生の物語に才の一行が無い");
  if (g && G.m6StoryOf) { const st = G.m6StoryOf(Object.assign({}, g, { story: null })); if (st && !st.life[0].includes("剣")) f("墓碑から読む物語に才の一行が無い"); }
  if (S.chronicle[0] && !S.chronicle.some((x) => x.text.includes("剣の才"))) f("年表に生まれつきの才が残らない");

  if (!n) ok("m8: 才（分布・作成・判定・成長・古いセーブ・仲間・出来事・墓碑）");
};
