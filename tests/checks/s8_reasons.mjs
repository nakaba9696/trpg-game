// S8：成功率と「選ぶ理由」を別のものにする（src/data/zz_s8_reasons.js・src/engine/zzzzzzzzzzzz_s8_why.js）
// - 直した出来事が揃っている・選択肢の「選ぶ理由」の一言が画面の小さな文字に出る（数字は出さない）
// - 直した出来事では、いちばん難しい解き方が、易しい解き方の劣化版になっていない
//   （易しいほうに無いものが手に入る・易しいほうに代価がある・言葉で違いが見える、のどれか）
// - 直した低い選択肢の失敗は、文だけで終わらない（覚え書き・町の空気など、何かが残る）
// - 成功率は変えない（選択肢の下の文字は、成功率の表示のあとに足すだけ）
export default ({ G, fail: fail0, ok, seeded }) => {
  const D = G.data;
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const fixed = D.S8_FIXED || [];
  if (fixed.length < 15) fail(`直した出来事が ${fixed.length} 件しかない`);

  const DV = (c) => (c.stat ? G.s5Target(c.diff || "普通") : -99);
  const GAIN = ["memo", "heard", "item", "gold", "fame", "virtue", "town", "w8side", "grow", "hp", "mp", "chron", "next", "lore"];
  const gains = (o) => new Set(Object.keys(o || {}).filter((k) => GAIN.includes(k) && !(typeof o[k] === "number" && o[k] <= 0)));
  const costly = (o) => !!(o && (o.days || (o.hp || 0) < 0 || (o.fame || 0) < 0 || o.sin || o.crime));
  const tail = (o) => Object.keys(o || {}).some((k) => !["text", "mood"].includes(k));
  let whys = 0;
  for (const id of fixed) {
    const e = D.EVENTS.find((x) => x.id === id);
    if (!e) { fail(`${id}: 出来事が無い`); continue; }
    const cs = e.choices.filter((c) => !c.cond && !c.fight && !c.cost);
    for (const c of e.choices) {
      if (c.why) {
        whys++;
        if (/[0-9０-９%％]/.test(c.why)) fail(`${id}: 選ぶ理由の一言に数字がある（${c.why}）`);
        if (c.why.length > 16) fail(`${id}: 選ぶ理由の一言が長い（${c.why}）`);
      }
      if (c.s8) for (const o of [c.ok, c.ng]) if (o && o.text && /[0-9０-９]/.test(o.text)) fail(`${id}: 物語の文に数字がある（${o.text.slice(0, 20)}…）`);
    }
    const stat = cs.filter((c) => c.stat);
    if (!stat.length) continue;
    const hard = [...stat].sort((a, b) => DV(b) - DV(a))[0];
    if (!hard.s8) continue;   // いちばん難しい選択肢に手を入れていない出来事は、既に理由があるとみなした所（S6 など）
    const others = cs.filter((c) => c !== hard && DV(c) < DV(hard));
    for (const easy of others) {
      const mine = gains(hard.ok), theirs = gains(easy.ok);
      const own = [...mine].some((k) => !theirs.has(k)) || [...gains(hard.ng)].some((k) => !theirs.has(k));
      if (!(own || costly(easy.ok) || hard.why || easy.why)) fail(`${id}: 難しい「${hard.label}」が、易しい「${easy.label}」の劣化版のまま`);
    }
  }
  // 直した失敗は、文だけで終わらない
  const NG = [["pickpocket", "追いかける"], ["peddler", "見抜く"], ["donation", "裏を探る"], ["u3_notice", "猫を探して"], ["stele", "解読する"], ["corpse", "日記を最後まで"],
    ["spring", "水面の月を"], ["u3_campsite", "荷物を調べる"], ["u3_lostbag", "手紙を読んで"], ["w6r_signpost", "消し跡に指を"]];
  for (const [id, lab] of NG) {
    const c = (D.EVENTS.find((x) => x.id === id) || { choices: [] }).choices.find((x) => !x.cond && String(x.label).startsWith(lab));
    if (!c) fail(`${id}: 「${lab}」が無い`);
    else if (!tail(c.ng)) fail(`${id}: 「${lab}」の失敗が文だけで終わる`);
  }

  // 画面：選ぶ理由の一言が、成功率のあとに出る。成功率は直す前と同じ
  G.rand = seeded(8800);
  G.P = { trophies: {}, graves: [] };
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  G.newGame({ cls: "thief", stats: st(12), caps: st(99), goal: "rich", profile: { name: "テスト", sex: "女", age: 22, history: "テスト用" } });
  const S = G.S;
  S.mode = "event"; S.event = "trap";
  const list = G.actions().flatMap((g) => g.list);
  const run = list.find((a) => /駆け抜ける/.test(a.label));
  const e = D.EVENTS.find((x) => x.id === "trap");
  const c = e.choices.find((x) => x.label === "駆け抜ける");
  const want = `${c.stat}・${c.diff || "普通"} ${G.chance(c.stat, G.s5EventDiff(c.diff), 0)}%`;
  if (!run || !run.sub.startsWith(want) || !run.sub.includes(c.why)) fail(`罠の「駆け抜ける」の小さな文字が変（${run && run.sub}）`);

  if (!bad) ok(`S8 選ぶ理由（直した出来事 ${fixed.length} 件・一言 ${whys} 個）`);
};
