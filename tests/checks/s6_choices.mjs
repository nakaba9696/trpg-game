// S6：成功率の表示を「正解の表示」にしない・同じ能力だけを使い続けるのが最適にならない
// - 使い方の偏り：同じ能力ばかり使うと伸びが鈍り、しばらく使っていない能力は伸びやすい（G.s5Fresh・G.s5Used）。古いセーブ（S.s5use が無い）でも動く
// - 戦闘：同じ戦いで急所ばかり狙うと見切られる。素早い敵には筋力の武器、硬い敵には敏捷の武器が当たりにくい
// - よく出る出来事の直し（src/data/zz_s6_events_tune.js）：いちばん難しい解き方の見返りが、いちばん易しい解き方より小さくない・解き方の能力が 2 つ以上・状況の選択肢はその状況でだけ出る・物語の文に数字が無い
export default ({ G, fail: fail0, ok, seeded }) => {
  const D = G.data;
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  G.rand = seeded(6600);
  G.P = { trophies: {}, graves: [] };
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  G.newGame({ cls: "thief", stats: st(12), caps: st(99), goal: "rich", profile: { name: "テスト", sex: "女", age: 22, history: "テスト用" } });
  const S = G.S;
  const cls0 = S.cls; S.cls = "__neutral";   // 職業の向き不向き（S7）の無い形で、使い方の偏りだけを見る

  // ---------------------------------------------------------------- 使い方の偏り
  delete S.s5use;
  const f0 = G.s5Fresh("敏捷");
  if (!(f0 > 0.9 && f0 < 1.4)) fail(`古いセーブ（使い方の記録なし）の伸びやすさが変（${f0}）`);
  for (let i = 0; i < 60; i++) G.s5Used("敏捷");
  const tired = G.s5Fresh("敏捷"), rested = G.s5Fresh("魅力");
  if (!(tired < 0.7)) fail(`同じ能力ばかり使っても伸びが鈍らない（${tired.toFixed(2)}）`);
  if (!(rested > 1.1)) fail(`しばらく使っていない能力が伸びやすくならない（${rested.toFixed(2)}）`);
  // 判定の成長にも効く：使い込んだ敏捷と、使っていない魅力で、同じ回数の成功
  const gain = (k) => {
    S.stats[k] = 20; S.s5exp = {}; S.s5use = Object.fromEntries(D.STATS.map((x) => [x, x === k ? 40 : 1]));
    G.rand = seeded(6601);
    let wins = 0, n = 0;
    while (wins < 30 && n++ < 2000) if (G.check(k, { vs: 20 }, "テスト").ok) wins++;
    return S.stats[k] - 20 + (S.s5exp[k] || 0) / G.s5Need(S.stats[k]);
  };
  const worn = gain("敏捷");
  S.s5use = Object.fromEntries(D.STATS.map((x) => [x, x === "敏捷" ? 40 : 1]));
  const fresh = (() => { S.stats.魅力 = 20; S.s5exp = {}; G.rand = seeded(6601); let w = 0, n = 0; while (w < 30 && n++ < 2000) if (G.check("魅力", { vs: 20 }, "テスト").ok) w++; return S.stats.魅力 - 20 + (S.s5exp.魅力 || 0) / G.s5Need(S.stats.魅力); })();
  S.cls = cls0;
  if (!(fresh > worn * 1.08)) fail(`使っていない能力の方が伸びやすくなっていない（使い込んだ ${worn.toFixed(1)}・使っていない ${fresh.toFixed(1)}）`);

  // ---------------------------------------------------------------- 戦闘
  {
    const fast = { tier: 3, def: 5, agi: 80, hit: 60 }, hard = { tier: 3, def: 30, agi: 15, hit: 60 };
    if (!(G.foeVs.eva(fast, "筋力") > G.foeVs.eva(fast, "敏捷"))) fail("素早い敵に、筋力の武器の方が当たりやすい");
    if (!(G.foeVs.eva(hard, "敏捷") > G.foeVs.eva(hard, "筋力"))) fail("硬い敵に、敏捷の武器の方が当たりやすい");
    S.stats = st(20); S.conds = [];
    S.maxHp = S.hp = 999;
    G.startCombat(["ogre"]);
    const v0 = G.cb.vital();
    G.combatAct("vital"); G.S.hp = 999;
    if (G.S.combat) { G.combatAct("vital"); G.S.hp = 999; }
    if (G.S.combat) {
      const v2 = G.cb.vital();
      if (!(v2 < v0 - 10)) fail(`急所を続けて狙っても見切られない（${v0}%→${v2}%）`);
      if (!G.S.log.some((e) => /見切りはじめた/.test(e.text || ""))) fail("急所を見切られたことが記録に出ない");
      const a = G.cb.attack();
      if (!(a > v2)) fail("急所を見切られたあと、普通の攻撃の方が当たりやすくならない");
    }
    G.S.combat = null; G.S.mode = "explore";
  }

  // ---------------------------------------------------------------- 出来事
  const DV = (c) => G.s5Target(c.diff || "普通");
  const val = (o) => {
    if (!o) return 0;
    let v = (o.gold || 0) / 10 + (o.fame || 0) * 2 + (o.hp > 0 ? o.hp / 3 : 0) + (o.mp || 0) / 3 - (o.sin || 0) * 3;
    if (o.item) v += Object.values(typeof o.item === "string" ? { [o.item]: 1 } : o.item).reduce((a, b) => a + b, 0) * 3;
    if (o.heard || o.memo) v += 1;
    return v;
  };
  const tuned = D.S6_TUNED || [];
  if (tuned.length < 10) fail(`直した出来事が ${tuned.length} 件しかない`);
  for (const id of tuned) {
    const e = D.EVENTS.find((x) => x.id === id);
    const cs = e.choices.filter((c) => c.stat && !c.cond);
    const stats = new Set(e.choices.filter((c) => c.stat).map((c) => c.stat));
    if (stats.size < 2) fail(`${id}: 解き方の能力が 1 つだけ`);
    if (cs.length >= 2) {
      const s = [...cs].sort((a, b) => DV(a) - DV(b));
      const easy = s[0], hard = s[s.length - 1];
      if (DV(hard) > DV(easy) && val(hard.ok) < val(easy.ok)) fail(`${id}: いちばん難しい「${hard.label}」の見返りが、易しい「${easy.label}」より小さい`);
    }
    for (const c of e.choices) for (const o of [c.ok, c.ng]) if (o && o.text && /[0-9０-９]/.test(o.text)) fail(`${id}: 物語の文に数字がある（${o.text.slice(0, 20)}…）`);
  }
  // 状況の選択肢：その状況でだけ出る
  {
    S.mode = "event"; S.event = "toll"; S.phase = 1;
    const day = G.eventChoices().map(({ c }) => c.label);
    S.phase = 3;
    const nightC = G.eventChoices().map(({ c }) => c.label);
    if (day.some((l) => /夜陰/.test(l)) || !nightC.some((l) => /夜陰/.test(l))) fail("通せんぼの「夜陰に紛れる」が夜だけに出ない");
    S.event = "fallen"; S.companions = [];
    const alone = G.eventChoices().map(({ c }) => c.label);
    S.companions = [{ name: "傭兵のアベル", cls: "傭兵", power: 50, dmg: 1, desc: "無口" }];
    const party = G.eventChoices().map(({ c }) => c.label);
    if (alone.some((l) => /仲間に/.test(l)) || !party.some((l) => /仲間に/.test(l))) fail("倒れた旅人の「仲間に見張らせる」が仲間のいるときだけに出ない");
    S.mode = "explore"; S.event = null; S.companions = [];
  }

  if (!bad) ok(`S6 選び方（同じ能力 60 回で伸び ${tired.toFixed(2)} 倍・使っていない能力 ${rested.toFixed(2)} 倍・直した出来事 ${tuned.length} 件）`);
};
