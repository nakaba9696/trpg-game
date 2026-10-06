// M13：正気を両刃の資源にする（src/data/m13_edge.js・src/engine/zzzzzzzzzzzz_m13_edge.js）
// - 段の低いときだけ現れる選択肢（mad1〜mad3）。澄んでいるときは出ない。うっすら見せるのは一つ深い段まで
// - 縁で聞いた名：使徒の読み（F1 の ◎）と、呼び返した使徒が鈍る。正気を戻しても残る
// - 戻すと「見えなくなる」一言。読んだ行は残るが、言葉が欠ける。もう一度深く落ちれば読める
// - 心の傷：正気の戻る上限が下がる。ステータスは段の言葉（数字なし）
// - 崩れかけの入れ替わりと、正気 0 の終わりは残る。古いセーブ（S.m13 なし）でも動く
// - 釣り合い：正気を低く保つ遊び方と、ふつうのランダムプレイを比べ、極端に強くも弱くもない
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  let bad = 0;
  const f = (m) => { bad++; fail("M13: " + m); };
  if (!G.m13 || !D.M13) { f("G.m13 か D.M13 が無い"); return; }
  const C = G.c10;

  const start = (seed, san) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 12; });
    G.newGame({ cls: "merc", stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.maxHp = G.S.hp = 999;
    if (san !== undefined) G.S.sanity = san;
    return G.S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const evActs = (id) => { const S = G.S; S.mode = "event"; S.event = id; S.combat = null; return acts().filter((a) => /^ev:|^c10lock:/.test(a.id)); };
  const mad = (a) => /^mad\d$/.test(a.c10 || "");

  // ---------------------------------------------------------------- データ
  const added = Object.values(G.m13.added).reduce((a, b) => a + b, 0);
  const evs = Object.keys(G.m13.added);
  if (added < 40) f(`足した選択肢が少ない（${added}）`);
  for (const id of ["m13_voice", "m13_door", "m13_stranger", "m13_relic"]) if (!D.EVENTS.some((e) => e.id === id)) f(`出来事 ${id} が無い`);
  const meets = Object.values(D.E3.LIST).filter((a) => a.meet);
  for (const a of meets) if (!(G.m13.added["e3_meet_" + a.id] >= 2)) f(`使徒の会う出来事 e3_meet_${a.id} に、名を聞く選択肢が無い`);
  for (const a of Object.values(D.E3.LIST)) if (!D.LORE.m13_names.lines.some((l) => l[0] === a.id)) f(`使徒 ${a.id} の縁で聞いた名の行が無い`);
  for (const id of D.M13.GIFTS) if (!D.ITEMS[id]) f(`扉の向こうの品 ${id} が無い`);
  const words = /見世物|観客|客席|舞台|台本/;
  const NUM = /\d|名声|悪名|正気|成功率/;
  const texts = [];
  for (const id of evs) {
    const e = D.EVENTS.find((x) => x.id === id);
    e.choices.filter((c) => mad(c) || c.m13relic).forEach((c) => texts.push(c.label, c.ok && c.ok.text, c.ng && c.ng.text));
  }
  Object.values(D.LORE).forEach((e) => e.lines.forEach((l) => { if (l.m13raw) texts.push(l.m13raw); }));
  for (const t of texts.filter(Boolean)) {
    if (words.test(t)) f(`書いてはいけない言葉：${t.slice(0, 30)}`);
    if (NUM.test(t)) f(`物語の文に数字・内部の言葉：${t.slice(0, 30)}`);
  }

  // ---------------------------------------------------------------- 段で出る・出ない
  for (const [san, want] of [[100, 0], [55, 1], [30, 2], [10, 3]]) {
    start(11, san);
    const list = evActs("m5_wallwords");
    const real = list.filter((a) => /^ev:/.test(a.id) && mad(a)).map((a) => +a.c10.slice(3));
    const deepest = real.length ? Math.max(...real) : 0;
    if (deepest !== want) f(`正気 ${san} で、壁の字の段の選択肢の深さが ${deepest}（${want} のはず）`);
    if (real.some((n) => n > want)) f(`正気 ${san} で、より深い段の選択肢が選べる`);
    const locked = list.filter((a) => a.locked && mad(a)).map((a) => +a.c10.slice(3));
    if (locked.some((n) => n > want + 1)) f(`正気 ${san} で、二つ以上深い段の選択肢がうっすら見える`);
    if (want === 0 && !locked.includes(1)) f("澄んでいるとき、揺らいだ者の選択肢がうっすら見えない");
    for (const a of list.filter((x) => /^ev:/.test(x.id) && mad(x))) if (!a.sub || !a.sub.includes(D.M13.TAG[+a.c10.slice(3)])) f(`「${a.label}」に段の添え書きが無い（${a.sub}）`);
  }

  // ---------------------------------------------------------------- 縁で見て、戻すと見えなくなる。読んだ行は欠けて残る
  {
    const S = start(21, 30);
    const pick = evActs("m5_wallwords").find((a) => a.c10 === "mad2" && !a.locked);
    if (!pick) f("縁で、壁の字を待つ選択肢が無い");
    else {
      G.act(pick.id);
      if (!(G.loreOf(S).m13_walls || []).includes("read")) f("縁で読んだ壁の字が、手引きに載らない");
      const line = () => D.LORE.m13_walls.lines.find((l) => l[0] === "read")[1];
      const raw = D.LORE.m13_walls.lines.find((l) => l[0] === "read").m13raw;
      if (line() !== raw) f("縁にいるのに、読んだ行が欠けて見える");
      const n0 = S.log.length;
      S.mode = "explore";
      G.addSanity(60);
      const after = S.log.slice(n0).map((l) => l.text || "").join("\n");
      if (!after.includes(D.M13.BACK_SYS)) f("正気を戻したのに、見えなくなる一言が出ない");
      if (line() === raw || !line().includes("・")) f("正気を戻しても、読んだ行の言葉が欠けない");
      if (!(G.loreOf(S).m13_walls || []).includes("read")) f("正気を戻したら、読んだ行が手引きから消えた");
      const secs = JSON.stringify(G.loreSections(S));
      if (!secs.includes("縁で見たもの")) f("手引きに「縁で見たもの」の節が出ない");
      G.addSanity(-50, true);
      if (line() !== raw) f("もう一度縁に落ちても、読んだ行が読めない");
      // 段が戻らない回復には、一言は出ない
      S.sanity = 30; const n1 = S.log.length; G.addSanity(3);
      if (S.log.slice(n1).some((l) => l.text === D.M13.BACK_SYS)) f("段が変わらないのに、見えなくなる一言が出る");
    }
    // 懺悔と宿の添え書き
    S.sanity = 50; S.mode = "fac"; S.fac = "church";
    const conf = acts().find((a) => a.id === "m5:confess");
    if (!conf || !conf.sub.includes(D.M13.RESTORE_SUB)) f("揺らいでいるとき、懺悔に「見えているものは消える」の添え書きが無い");
    S.sanity = 100;
    const conf2 = acts().find((a) => a.id === "m5:confess");
    if (conf2 && conf2.sub.includes(D.M13.RESTORE_SUB)) f("澄んでいるのに、懺悔に添え書きが出る");
  }

  // ---------------------------------------------------------------- 使徒の名と弱み
  {
    const a = D.E3.LIST.levian;
    const S = start(31, 30);
    const foe = a.foe;
    const known0 = G.f1.known(foe);
    S.sanity = 100;
    if (G.f1.known(foe)) f("澄んでいて名も知らないのに、使徒の読みが付く");
    S.sanity = 30;
    if (!G.f1.known(foe) && !known0) f("縁に立っていても、使徒の読みが付かない");
    const frac0 = G.e3Mods("levian", S).frac;
    const ask = evActs("e3_meet_levian").find((x) => x.c10 === "mad2" && !x.locked);
    if (!ask) f("縁で、使徒の名を聞く選択肢が出ない");
    else {
      G.act(ask.id);
      if (G.m13.named(S, "levian") !== 1) f("名を聞いても、覚えていない");
      if (!(G.loreOf(S).m13_names || []).includes("levian")) f("縁で聞いた名が、手引きに載らない");
      G.addSanity(80);
      if (!G.f1.known(foe)) f("正気を戻したら、縁で聞いた名の読みが消えた");
      if (G.e3Mods("levian", S).frac !== frac0) f("名を聞いただけで、使徒が鈍る");
      if (evActs("e3_meet_levian").some((x) => x.c10 === "mad2" && !x.locked)) f("澄んだのに、縁の選択肢が選べる");
      S.sanity = 30;
      if (evActs("e3_meet_levian").some((x) => x.c10 === "mad2" && !x.locked)) f("名を聞いた使徒に、また名を聞く選択肢が出る");
      S.sanity = 12;
      const call = evActs("e3_meet_levian").find((x) => x.c10 === "mad3" && !x.locked);
      if (!call) f("崩れかけで、名を呼び返す選択肢が出ない");
      else {
        G.rand = () => 0.99;   // 入れ替わりを起こさない（入れ替わりは r4_swap・m5_sanity で確かめる）
        G.act(call.id);
        G.rand = seeded(32);
        if (G.m13.named(S, "levian") !== 2) f("名を呼び返しても、弱みを覚えていない");
        if (!(G.e3Mods("levian", S).frac > frac0)) f("弱みを見た使徒が鈍らない");
        if (!(G.m13.scar(S) > 0)) f("崩れかけの選択に、心の傷の代償が無い");
      }
    }
  }

  // ---------------------------------------------------------------- 心の傷とステータスの言葉
  {
    const S = start(41, 30);
    S.m13 = { scar: 20 };
    S.sanity = 70;
    G.addSanity(40);
    if (S.sanity !== 80) f(`心の傷があるのに、正気が上限まで戻らないか上を超える（${S.sanity}）`);
    S.mode = "fac"; S.fac = "inn"; S.gold = 999;
    G.exploreAct("inn", "rest");
    if (S.sanity > 80) f("宿で眠ると、心の傷を越えて正気が戻る");
    const rows = G.m5Rows(S);
    const r = rows.find(([k]) => k === "正気");
    if (!r || /\d/.test(r[1]) || !r[1].startsWith(D.M13.WORD[G.m13.stage(S)])) f(`ステータスの正気が段の言葉でない（${r && r[1]}）`);
    if (!rows.some(([k]) => k === "心の傷")) f("心の傷がステータスに出ない");
    for (const [san, w] of [[90, 0], [55, 1], [30, 2], [10, 3]]) { S.sanity = san; const v = G.m5Rows(S).find(([k]) => k === "正気"); if (!v || !v[1].startsWith(D.M13.WORD[w])) f(`正気 ${san} の言葉が「${D.M13.WORD[w]}」でない`); }
  }

  // ---------------------------------------------------------------- 呪われた品の本当の使い方
  {
    const S = start(51, 30);
    G.give("m5_namecrown", 1);
    S.m5.trueName = "テスト";
    S.profile.name = "テ・ト";
    const e = D.EVENTS.find((x) => x.id === "m13_relic");
    if (!e.cond(S)) f("冠を持って縁に立っても、持ち物の声の出来事が起きない");
    const crown = evActs("m13_relic").find((a) => /冠/.test(a.label));
    if (!crown) f("冠の本当の使い方の選択肢が出ない");
    else {
      G.act(crown.id);
      if (S.profile.name !== "テスト") f("冠の本当の使い方で、名前が戻らない");
      if (G.count("m5_namecrown") > 0) f("冠を手放していない");
    }
    S.sanity = 100;
    if (e.cond(S)) f("澄んでいるのに、持ち物の声の出来事が起きる");
  }

  // ---------------------------------------------------------------- 古いセーブ・崩れかけの入れ替わり・正気 0 の終わり
  {
    const S = start(61, 25);
    delete S.m13;
    try {
      for (let k = 0; k < 120 && !S.over; k++) {
        const a = acts().filter((x) => !x.disabled);
        if (!a.length) break;
        G.act(a[Math.floor(G.rand() * a.length)].id);
      }
    } catch (x) { f(`古いセーブ（S.m13 なし）で例外 ${x.stack || x}`); }
    const T = start(62, 5);
    G.addSanity(-10);
    if (!(T.over && T.fate === "mad")) f("正気 0 で冒険が終わらない");
  }

  // ---------------------------------------------------------------- 釣り合い：正気を低く保つ遊び方 と ふつうのランダムプレイ
  const GAMES = 40, STEPS = 400;
  const RESTORE = /^(m5:confess|inn:rest|tavern:drink)$/;
  const run = (low) => {
    const r = { turns: 0, dead: 0, mad: 0, gold: 0, lore: 0, names: 0, weak: 0, scar: 0, madPicks: 0 };
    for (let g = 0; g < GAMES; g++) {
      const S = start(7000 + g, low ? 35 : undefined);
      const c = D.CLASSES[Object.keys(D.CLASSES)[g % 5]];
      S.cls = Object.keys(D.CLASSES)[g % 5];
      D.STATS.forEach((k) => { S.stats[k] = Math.round((c.base[k] + 5) / 4); });
      S.maxHp = S.hp = G.maxHpOf(S.stats);
      try {
        for (let step = 0; step < STEPS && !S.over; step++) {
          let a = acts().filter((x) => !x.disabled);
          if (!a.length) break;
          if (low) {
            // 低く保つ：段の選択肢があれば選ぶ。正気が段の境目より上がりそうなら、戻す行動はしない（HP が危ないときの宿は別）
            const m = a.filter((x) => mad(x) || (x.sub || "").includes(D.M13.TAG[2]));
            if (m.length && G.rand() < 0.8) a = m;
            else if (G.sanityOf(S) > 20) { const b = a.filter((x) => !RESTORE.test(x.id) || (x.id === "inn:rest" && S.hp < S.maxHp / 3)); if (b.length) a = b; }
          }
          const pick = a[Math.floor(G.rand() * a.length)];
          if (mad(pick)) r.madPicks++;
          G.act(pick.id);
          if (!(G.sanityOf(S) >= 0 && G.sanityOf(S) <= G.m13.maxSanity(S))) { f(`正気が範囲外 ${S.sanity}／上限 ${G.m13.maxSanity(S)}`); break; }
        }
      } catch (x) { f(`${low ? "低く保つ" : "ふつう"} game ${g}: 例外 ${x.stack || x}`); }
      r.turns += S.turn;
      if (S.over) r.dead++;
      if (S.fate === "mad") r.mad++;
      r.gold += S.gold;
      r.lore += Object.entries(G.loreOf(S)).filter(([id]) => /^m13_/.test(id)).reduce((n, [, ks]) => n + ks.length, 0);
      const nm = Object.values((S.m13 && S.m13.names) || {});
      r.names += nm.length; r.weak += nm.filter((v) => v >= 2).length;
      r.scar += G.m13.scar(S);
    }
    return r;
  };
  const base = run(false);
  const low = run(true);
  const avg = (r, k) => Math.round((r[k] / GAMES) * 10) / 10;
  console.log(`NOTE M13 ふつう ${GAMES} 回：平均 ${avg(base, "turns")} 手番・倒れた ${base.dead}・発狂 ${base.mad}・所持金 ${avg(base, "gold")}・縁の行 ${base.lore}・名 ${base.names}`);
  console.log(`NOTE M13 低く保つ ${GAMES} 回：平均 ${avg(low, "turns")} 手番・倒れた ${low.dead}・発狂 ${low.mad}・所持金 ${avg(low, "gold")}・縁の行 ${low.lore}・名 ${low.names}（弱み ${low.weak}）・段の選択 ${low.madPicks}・心の傷 平均 ${avg(low, "scar")}`);
  if (!(low.lore > base.lore)) f("正気を低く保っても、縁で見えるものが増えない（弱すぎる）");
  if (!(low.madPicks > GAMES)) f("正気を低く保っても、段の選択肢がほとんど出ない");
  if (low.turns > base.turns * 1.5) f(`正気を低く保つほうが、ずっと長く生き延びる（${avg(low, "turns")} 対 ${avg(base, "turns")}。強すぎる）`);
  if (low.turns < base.turns * 0.35) f(`正気を低く保つと、すぐ倒れる（${avg(low, "turns")} 対 ${avg(base, "turns")}。弱すぎる）`);
  if (low.gold > base.gold * 1.5 + 50 * GAMES) f(`正気を低く保つほうが、ずっと稼げる（${avg(low, "gold")} 対 ${avg(base, "gold")}）`);
  if (low.mad > GAMES * 0.85) f(`正気を低く保つと、ほとんど発狂で終わる（${low.mad}/${GAMES}）`);

  if (!bad) ok(`M13 正気の両刃（出来事 ${evs.length} 件に段の選択肢 ${added} 個・名と弱み・戻すと見えなくなる・欠けて残る行・心の傷・段の言葉・品の本当の使い方・古いセーブ・釣り合い：ふつう ${avg(base, "turns")} 手番／低く保つ ${avg(low, "turns")} 手番）`);
};
