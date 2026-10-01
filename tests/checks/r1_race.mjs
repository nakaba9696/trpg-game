// R1：種族（人間・エルフ・獣人）。engine/zr1_race.js・data/r1_races.js・data/events_r1.js を DOM なしで確かめる
// - 表の整合（能力値・技能・特性・年齢の幅・名前・国）
// - 古いセーブ（種族が無い）は人間として動く。種族を書かない始まりでは乱数の並びが変わらない
// - 作成：種族と元の獣を選ぶと、補正・年齢・名前・才・導入が変わる。能力値は振り直さない。そのまま冒険を始められる
// - 判定：夜目・鳥目と遠目・冬毛・耳・人の目。見込みの％と判定の％が同じ
// - 出来事：既存の出来事に足した選択肢・種族の出来事を最後まで通す。見せない言葉が無い
// - 仲間・評判（M3）・恋（M10）・人生の物語（M6）・墓碑
export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const G = loadEngine();
  const D = G.data;
  const cre = G.cre;

  // ---------------------------------------------------------------- 表の整合
  const nations = new Set(Object.values(D.LOCS).map((L) => L.nation || L.region));
  const checkSpec = (where, x) => {
    for (const k of Object.keys(x.mod || {})) if (!D.STATS.includes(k)) fail(`${where}: 能力値 ${k} が無い`);
    for (const k of x.talents || []) if (!D.TALENTS[k]) fail(`${where}: 技能 ${k} が無い`);
    for (const k of x.traits || []) if (!D.R1_TRAITS[k]) fail(`${where}: 特性 ${k} が無い`);
    for (const n of Object.keys(x.greet || {})) if (!nations.has(n)) fail(`${where}: 国 ${n} が場所に無い`);
    if (x.ages) {
      let last = 0;
      for (const b of ["young", "prime", "old"]) {
        const r = x.ages[b];
        if (!r || !(r[0] <= r[1]) || r[0] <= last) fail(`${where}: 年齢の幅 ${b} がおかしい ${JSON.stringify(r)}`);
        else last = r[1];
      }
    }
  };
  Object.entries(D.RACES).forEach(([id, r]) => {
    checkSpec(`種族 ${id}`, r);
    if (r.names && !["男", "女"].every((s) => (D.PROFILE.names[r.names] || {})[s]?.length)) fail(`種族 ${id}: 名前の表 ${r.names} が無い`);
  });
  Object.entries(D.BEASTS).forEach(([id, b]) => { checkSpec(`獣 ${id}`, b); if (!b.temper || !b.blurb) fail(`獣 ${id}: 気性か説明が無い`); });
  // 獣人は人より力が強い（どの獣でも筋力の補正が人より上）
  for (const b of D.BEAST_KEYS) if (!(G.r1Spec({ race: "beast", beast: b }).mod.筋力 > 0)) fail(`獣人（${b}）の筋力が人より強くない`);
  // 種族の補正の合計が偏りすぎない（−4〜+4）
  for (const r of [{ race: "elf" }, ...D.BEAST_KEYS.map((b) => ({ race: "beast", beast: b }))]) {
    const sum = Object.values(G.r1Spec(r).mod).reduce((a, b) => a + b, 0);
    if (Math.abs(sum) > 4) fail(`${G.r1Name(r)}: 補正の合計 ${sum} が偏りすぎ`);
  }

  // ---------------------------------------------------------------- 見せない言葉（#1 の持ち主の方針）と置き換え忘れ
  const BANNED = /見世物|観客|客席|舞台|台本|神々が(世界を)?眺め|魔王/;
  const scan = (where, t) => { if (typeof t !== "string") return; if (BANNED.test(t)) fail(`${where}: 明かさない言葉「${t}」`); if (/undefined|\{(?!c\}|n\}|say|kin|food|home|keep|sp|m\})/.test(t)) fail(`${where}: 置き換え忘れ「${t}」`); };
  const r1Events = D.EVENTS.filter((e) => e.id.startsWith("r1_"));
  if (r1Events.length < 12) fail(`種族の出来事が少ない（${r1Events.length}）`);
  { const tbl = JSON.stringify([D.RACES, D.BEASTS, D.R1_TEXT, D.R1_TRAITS, D.R1_EXTRA]); if (BANNED.test(tbl)) fail("表に明かさない言葉がある"); }
  for (const a of D.AMBIENT.filter((x) => x.id.startsWith("u3_r1_"))) scan(`ひとこと ${a.id}`, a.text);

  // ---------------------------------------------------------------- 古いセーブ・種族を書かない始まり
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 80; });
  const base = { cls: "merc", stats, caps, goal: "rich", profile: { name: "テスト", sex: "男", age: 24, history: "テスト用", personality: "無口" } };
  const start = (profile, seed) => {
    G.rand = seeded(seed || 120);
    G.P = { trophies: {}, graves: [] };
    G.newGame(Object.assign({}, base, { stats: { ...stats }, caps: { ...caps }, profile: Object.assign({}, base.profile, profile || {}) }));
    G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  let S = start();
  if (S.profile.race !== "human") fail("種族を書かない始まりが人間にならない");
  const afterHuman = G.rand();
  start({ race: "elf" });
  if (G.rand() !== afterHuman) fail("種族を選ぶと、始まりの乱数の並びが変わる（才の付きやすさだけ変わるはず）");
  S = start();
  delete S.profile.race; delete S.profile.beast;
  if (G.r1Of(S).race !== "human" || G.r1Mod("魅力") !== 0) fail("古いセーブが人間として読まれない");
  if (G.r1Rows(S)[0][1] !== "人間") fail("古いセーブのシートが人間と出ない");
  try { for (let t = 0; t < 40 && !G.S.over; t++) { const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled); if (!acts.length) break; G.act(acts[Math.floor(G.rand() * acts.length)].id); } } catch (e) { fail("古いセーブで遊ぶと例外 " + e.stack); }
  if ("race" in S.profile) fail("古いセーブを読んだだけで種族が書き込まれた");
  if (G.r1GraveLine({ name: "古い墓" }) !== "") fail("古い墓碑に種族の行が出る");

  // ---------------------------------------------------------------- 作成
  const rnd = seeded(1200);
  const every = [{ race: "human" }, { race: "elf" }, ...D.BEAST_KEYS.map((b) => ({ race: "beast", beast: b }))];
  every.forEach((want, i) => {
    const dr = cre.fresh(rnd);
    const rolled = { ...dr.rolled };
    if (want.race === "beast") cre.setBeast(dr, want.beast, rnd); else cre.setRace(dr, want.race, rnd);
    const nm = G.r1Name(want);
    if (JSON.stringify(dr.rolled) !== JSON.stringify(rolled)) fail(`${nm}: 種族を変えたら能力値を振り直した`);
    const sp = G.r1Spec(want);
    for (const k of D.STATS) {
      if ((cre.modParts(dr, k).race || 0) !== (sp.mod[k] || 0)) fail(`${nm}: ${k} の種族の補正が出ない`);
      const m = cre.modParts(dr, k);
      const expect = Math.max(5, Math.min(90, dr.rolled[k] + m.age + m.origin + m.race)) + (dr.bonus[k] || 0);
      if (cre.value(dr, k) !== expect) fail(`${nm}: ${k} が振った値＋補正と合わない（${cre.value(dr, k)} / ${expect}）`);
    }
    for (const band of ["young", "prime", "old"]) {
      cre.setAge(dr, band, rnd);
      const [lo, hi] = cre.ageRange(dr);
      const a = Number(dr.profile.age);
      if (!(a >= lo && a <= hi)) fail(`${nm}: ${band} の歳 ${a} が幅 ${lo}〜${hi} の外`);
    }
    const o = cre.options(dr, rnd);
    if (o.profile.race !== want.race || (want.beast && o.profile.beast !== want.beast)) fail(`${nm}: 冒険に種族が渡らない`);
    const pages = cre.prologue(o);
    if (want.race !== "human" && !pages[1].some((t) => D.R1_TEXT.prologue[want.race].some((x) => x.replace("{beast}", want.beast ? D.BEASTS[want.beast].name : "") === t))) fail(`${nm}: 導入に種族の一行が無い`);
    pages.flat().forEach((t) => scan(`${nm} の導入`, t));
    G.rand = seeded(1300 + i);
    G.P = { trophies: {}, graves: [] };
    try {
      G.newGame(o);
      if (G.r1Name(G.S) !== nm) fail(`${nm}: 冒険の種族が ${G.r1Name(G.S)}`);
      for (let t = 0; t < 40 && !G.S.over; t++) { const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled); if (!acts.length) break; G.act(acts[Math.floor(G.rand() * acts.length)].id); }
    } catch (e) { fail(`${nm}: 作成した人物で遊ぶと例外 ${e.stack}`); }
  });
  // 名前の響き：エルフを何人か作ると、エルフの名前が出る
  {
    let elfName = 0;
    for (let i = 0; i < 40; i++) { const dr = cre.fresh(rnd); dr.origin = "karna"; cre.setRace(dr, "elf", rnd); if (D.PROFILE.names.elf[dr.sex].includes(dr.profile.name)) elfName++; }
    if (elfName < 15) fail(`エルフの名前の響きがほとんど出ない（${elfName}/40）`);
  }
  // おまかせ：人間が多く、獣人・エルフも出る
  {
    const n = { human: 0, elf: 0, beast: 0 };
    for (let i = 0; i < 300; i++) { const dr = cre.fresh(rnd); cre.randomRace(dr, rnd); n[dr.race || "human"]++; }
    if (!(n.human > n.beast && n.beast > n.elf && n.elf > 10)) fail(`おまかせの種族の割合がおかしい ${JSON.stringify(n)}`);
  }
  // 才：種族の得意の技能は付きやすい（傭兵のエルフは、人間の傭兵より術の才がよく付く）
  {
    const count = (race) => { let n = 0; for (let i = 0; i < 400; i++) { const dr = cre.fresh(rnd); dr.cls = "merc"; cre.setRace(dr, race, rnd); cre.roll(dr, rnd); if (dr.talents.magic >= 1) n++; } return n; };
    const h = count("human"), e = count("elf");
    if (!(e > h * 2)) fail(`エルフの術の才が付きやすくない（人間 ${h}・エルフ ${e} / 400）`);
  }

  // ---------------------------------------------------------------- 判定
  const at = (loc, phase) => { G.S.loc = loc; G.S.phase = phase; G.S.mode = "explore"; };
  const diff = (race, stat, loc, phase, ctx) => {
    start(race);
    at(loc, phase);
    const a = ctx ? ctx() : G.chance(stat, 0);
    start({ race: "human" });
    at(loc, phase);
    const b = ctx ? ctx() : G.chance(stat, 0);
    return a - b;
  };
  const expect = (name, got, want) => { if (got !== want) fail(`${name}: ${got} になった（${want} のはず）`); };
  expect("狼の夜目（夜の敏捷）", diff({ race: "beast", beast: "wolf" }, "敏捷", "karna", 3), 5);
  expect("狼の夜目（昼は効かない）", diff({ race: "beast", beast: "wolf" }, "敏捷", "karna", 1), 0);
  expect("鳥目（迷宮の知力）", diff({ race: "beast", beast: "bird" }, "知力", "ruins", 1), -5);
  expect("遠目（昼の野外）", diff({ race: "beast", beast: "bird" }, "知力", "plains", 1), 5);
  expect("熊の冬毛（雪の体力）", diff({ race: "beast", beast: "bear" }, "体力", "frost", 1), 5);
  expect("エルフの人の目（王国の魅力）", diff({ race: "elf" }, "魅力", "leavel", 1), -5);
  expect("エルフの人の目（共和国の魅力）", diff({ race: "elf" }, "魅力", "zephara", 1), 5);
  expect("獣人の人の目（自由都市）", diff({ race: "beast", beast: "fox" }, "魅力", "karna", 1), 0);
  // 耳：逃げるとき。見込み（G.cb.flee）と判定（G.check の「逃走」）が同じ
  const flee = (race) => {
    start(race); at("plains", 1);
    G.startCombat(["goblin"]);
    const shown = G.cb.flee();
    const r = G.check("敏捷", 10 - Math.max(...G.alive().map((f) => G.foeData(f).agi)), "逃走");
    if (r.chance !== shown) fail(`${G.r1Name(G.S)}: 逃げる見込み ${shown}% と判定 ${r.chance}% が違う`);
    return shown;
  };
  const fh = flee({ race: "human" });
  expect("兎の耳（逃げる）", flee({ race: "beast", beast: "rabbit" }) - fh, 10);
  expect("猫の耳（逃げる）", flee({ race: "beast", beast: "cat" }) - fh, 5);
  // 出来事の見込みと判定が同じ（エルフが王国で魅力の判定）
  start({ race: "elf" }); at("leavel", 1);
  {
    const e = D.EVENTS.find((x) => x.id === "r1_church_door");
    G.startEvent(e);
    const sub = G.actions()[0].list.find((a) => a.label.startsWith("「神さま"));
    const shown = Number(/(\d+)%/.exec(sub.sub)[1]);
    if (shown !== G.chance("魅力", "難しい")) fail(`出来事の見込み ${shown}% が判定の ${G.chance("魅力", "難しい")}% と違う`);
  }

  // ---------------------------------------------------------------- 出来事
  // 既存の出来事に足した選択肢は、その種族・特性のときだけ出る。番号は変わらない
  const labelsOf = (race, id) => { start(race); at("karna", 1); G.S.gold = 100; G.startEvent(id); return G.eventChoices().map(({ c }) => c.label); };
  if (!labelsOf({ race: "beast", beast: "wolf" }, "pickpocket").includes("匂いをたどる")) fail("鼻の利く獣人に「匂いをたどる」が出ない");
  if (labelsOf({ race: "human" }, "pickpocket").includes("匂いをたどる")) fail("人間に「匂いをたどる」が出る");
  if (labelsOf({ race: "beast", beast: "bird" }, "pickpocket").includes("匂いをたどる")) fail("鳥の獣人に「匂いをたどる」が出る");
  if (D.EVENTS.find((e) => e.id === "pickpocket").choices[0].label !== "追いかける") fail("既存の出来事の選択肢の番号が変わった");
  // 種族の出来事を、合う人物で最後まで通す（どの選択肢も）
  const fitFor = (e) => {
    if (/elf/.test(e.id)) return { race: "elf" };
    if (/cat/.test(e.id)) return { race: "beast", beast: "cat" };
    if (/bird/.test(e.id)) return { race: "beast", beast: "bird" };
    if (/ears/.test(e.id)) return { race: "beast", beast: "rabbit" };
    if (/nose|beast|church/.test(e.id)) return { race: "beast", beast: "wolf" };
    return { race: "human" };
  };
  const placeFor = (e) => (e.where.includes("dungeon") ? "ruins" : e.where.includes("wild") ? "plains" : /church|gate/.test(e.id) ? "leavel" : /kin$/.test(e.id) && /elf/.test(e.id) ? "zephara" : "karna");
  const compFor = (e, S) => {
    const c = { name: "弓使いのナエリス", cls: "弓使い", power: 50, dmg: 1, desc: "無口だが義理堅い" };
    if (e.id === "r1_comp_beast") Object.assign(c, { name: "槍兵のガルド", race: "beast", beast: "wolf" });
    if (e.id === "r1_comp_elf" || e.id === "r1_love_face") c.race = "elf";
    if (e.id === "r1_love_scent") Object.assign(c, { race: "beast", beast: "fox" });
    G.addCompanion(c);
    const comp = S.companions[S.companions.length - 1];
    comp.bond = 80;
    if (/love/.test(e.id)) { G.m10Of(comp).st = "love"; comp.m10.since = 1; }
    return comp;
  };
  let ran = 0;
  for (const e of r1Events) {
    for (let i = 0; i < e.choices.length; i++) {
      for (const pass of [0, 1]) {
        const race = e.id === "r1_love_years" ? { race: "elf" } : e.id === "r1_love_face" ? { race: "human" } : e.id === "r1_love_scent" ? { race: "beast", beast: "wolf" } : fitFor(e);
        S = start(race, 1400 + ran);
        G.S.mode = "explore"; G.S.loc = placeFor(e); G.S.phase = 1; G.S.day = 20; G.S.gold = 500;
        if (e.m2 || e.id === "r1_bird_dark") compFor(e, S);
        if (e.cond && !e.cond(S)) { fail(`出来事 ${e.id}: 合う人物で条件が通らない`); break; }
        try {
          if (G.startEvent(e) === false) { fail(`出来事 ${e.id}: 始まらない`); break; }
          scan(`出来事 ${e.id}`, G.m2Fill(e.text));
          const ch = G.eventChoices().find((x) => x.i === i);
          if (!ch) continue;
          G.rand = seeded(pass ? 7 : 99991); // 成功と失敗の両方を通す
          G.chooseEvent(i);
          for (let n = 0; n < 4 && G.S.mode === "event"; n++) G.chooseEvent(G.eventChoices()[0].i);
          G.S.log.slice(-6).forEach((l) => scan(`出来事 ${e.id} の結果`, l.text));
          ran++;
        } catch (err) { fail(`出来事 ${e.id}[${i}]: 例外 ${err.stack}`); }
      }
    }
  }
  if (ran < r1Events.length * 2) fail(`種族の出来事を通せた数が少ない（${ran}）`);

  // ---------------------------------------------------------------- 仲間（名前から種族が決まる）
  {
    S = start({}, 1500);
    const n = { human: 0, elf: 0, beast: 0 };
    for (let i = 0; i < 400; i++) { S.turn = i; const c = G.genCompanion(); n[G.r1Comp(c).race]++; if (c.race === "beast" && !D.BEASTS[c.beast]) fail("仲間の獣人に元の獣が無い"); }
    if (!(n.elf > 10 && n.beast > 50 && n.human > 200)) fail(`雇える仲間の種族の割合がおかしい ${JSON.stringify(n)}`);
    if (G.r1Comp({ name: "脱走兵ヨアヒム" }).race !== "human") fail("種族を書いていない仲間が人間にならない");
    if (G.r1CompLabel({ name: "x", race: "beast", beast: "wolf" }) !== "狼の獣人") fail("仲間の種族の呼び名");
  }
  // 混ざった一党のトロフィー
  {
    S = start({ race: "elf" }, 1510);
    G.addCompanion({ name: "槍兵のガルド", cls: "槍兵", power: 50, dmg: 1, desc: "無口", race: "beast", beast: "bear" });
    G.addCompanion({ name: "剣士のロイド", cls: "剣士", power: 50, dmg: 1, desc: "無口" });
    G.checkTrophies();
    if (!G.P.trophies.r1_kin) fail("人間・エルフ・獣人の一党でトロフィーが出ない");
  }

  // ---------------------------------------------------------------- 評判（M3）：人の国では悪名が 1 多い。共和国・自由都市では同じ
  const infamy = (race, loc) => { start(race); at(loc, 1); G.crime("theft"); return G.repOf(G.nationOf()).inf; };
  expect("エルフの盗み（王国）", infamy({ race: "elf" }, "leavel") - infamy({ race: "human" }, "leavel"), 1);
  expect("獣人の盗み（自由都市）", infamy({ race: "beast", beast: "wolf" }, "karna") - infamy({ race: "human" }, "karna"), 0);

  // ---------------------------------------------------------------- 恋（M10）：同じ獣どうしは相性 +1
  {
    S = start({ race: "beast", beast: "wolf", personality: "無口だが義理堅い" });
    const c1 = { name: "a", trait: "loyal", race: "beast", beast: "wolf" }, c2 = { name: "b", trait: "loyal" };
    S.profile.race = "human";
    const h = [G.m10Compat(c1, S), G.m10Compat(c2, S)];
    S.profile.race = "beast";
    const b = [G.m10Compat(c1, S), G.m10Compat(c2, S)];
    if (!(b[0] === Math.min(2, h[0] + 1) && b[1] === h[1])) fail(`同じ獣どうしの相性が上がらない（人 ${h}・狼 ${b}）`);
  }

  // ---------------------------------------------------------------- 人生の物語（M6）と墓碑
  {
    S = start({ race: "beast", beast: "rat", name: "チセ" }, 1600);
    G.die("試し");
    const g = G.P.graves[0];
    if (g.race !== "beast" || g.beast !== "rat") fail("墓碑に種族が残らない");
    if (G.r1GraveLine(g) !== "鼠の獣人") fail("墓碑の種族の行");
    const st = G.m6Compose ? G.m6Compose(S) : null;
    if (st && !/獣人/.test(st.life[0])) fail("獣人の人生の物語の最初に種族の一文が無い");
    if (G.m6Story) { const s2 = G.m6Story(g); if (s2 && !/獣人/.test(s2.life[0])) fail("墓碑から組んだ物語に種族の一文が無い"); }
    // エルフが物語を終えると、その後にも一文
    S = start({ race: "elf", name: "ナエリス" }, 1610);
    S.over = "end";
    const se = G.m6Compose ? G.m6Compose(S) : null;
    if (se && se.after && !D.R1_TEXT.after_elf.some((t) => se.after[0].startsWith(t.replace(/\{name\}/g, "ナエリス")))) fail("エルフのその後に長命の一文が無い");
    if (se) [...se.life, ...(se.after || [])].forEach((t) => scan("エルフの物語", t));
  }

  // ---------------------------------------------------------------- ランダムプレイ（種族をおまかせで）
  let errs = 0;
  for (let i = 0; i < 40; i++) {
    const dr = cre.fresh(rnd);
    cre.randomRace(dr, rnd);
    G.rand = seeded(1700 + i);
    G.P = { trophies: {}, graves: [] };
    try {
      G.newGame(cre.options(dr, rnd));
      for (let t = 0; t < 150 && !G.S.over; t++) { const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled); if (!acts.length) break; G.act(acts[Math.floor(G.rand() * acts.length)].id); }
      G.S.log.forEach((l) => { if (/undefined/.test(l.text || "")) fail(`ランダムプレイ ${i}: 記録に undefined「${l.text}」`); });
    } catch (e) { errs++; fail(`ランダムプレイ ${i}（${G.r1Name({ profile: { race: dr.race, beast: dr.beast } })}）: 例外 ${e.stack}`); }
  }
  if (!bad) ok(`R1：種族 ${Object.keys(D.RACES).length}・獣 ${D.BEAST_KEYS.length}・出来事 ${r1Events.length}（通した選択 ${ran}）`);
};
