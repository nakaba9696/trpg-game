// V3：物語が進む場面の長い文（src/engine/zzzzzzzzzz_v3_prose.js・src/data/zv3_prose_*.js）
// - 差し替えの表 D.V3_PROSE が、すべて今ある出来事・選択肢・結果に当たる（元の文が変わって外れたら落ちる）
// - 差し替えた文に数字を書かない（物語の中で具体的な数値を出さない）。「！」も書かない
// - 物語の場面として、二段落以上ある
// - 語りの文の改行は、段落ごとに別の行として記録される
// - 山場（peak: true の場面）では、見出しと段落の記録に peak の印が付く。山場でない場面には付かない
export default ({ loadEngine, seeded, fail, ok }) => {
  const G = loadEngine();
  const D = G.data;
  const V3 = G.v3prose;
  if (!V3) { fail("G.v3prose が無い"); return; }
  (V3.missing || []).forEach((m) => fail(`V3 の差し替えが当たらない：${m}`));

  let scenes = 0, texts = 0;
  const look = (where, t) => {
    texts++;
    if (typeof t !== "string" || !t.trim()) { fail(`${where}：文が空`); return; }
    if (/[0-9０-９]/.test(t)) fail(`${where}：数字が入っている「${t.match(/.{0,8}[0-9０-９].{0,8}/)[0]}」`);
    if (/[!！]/.test(t)) fail(`${where}：「！」が入っている`);
    if (/\n\s*\n\s*\n/.test(t)) fail(`${where}：空行が二つ続いている`);
  };
  for (const [id, p] of Object.entries(D.V3_PROSE || {})) {
    scenes++;
    if (p.text) {
      look(`${id}.text`, p.text);
      if (V3.paras(p.text).length < 2) fail(`${id}.text：物語の場面なのに一段落しかない`);
    }
    for (const [label, outs] of Object.entries(p.choices || {})) for (const [k, t] of Object.entries(outs)) look(`${id}「${label}」${k}`, t);
  }
  for (const [path, t] of Object.entries(D.V3_PROSE_AT || {})) { scenes++; look(path, t); }
  if (scenes < 1) fail("差し替えの表が空");

  // 段落ごとに別の行になる
  G.rand = seeded(3);
  G.P = { trophies: {}, graves: [] };
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  const n0 = G.S.log.length;
  G.say("一つめの段落。\n\n二つめの段落。\n三つめ。");
  const got = G.S.log.slice(n0).map((e) => e.text);
  if (JSON.stringify(got) !== JSON.stringify(["一つめの段落。", "二つめの段落。", "三つめ。"])) fail(`段落に分かれない：${JSON.stringify(got)}`);

  // 山場の印
  const peakId = Object.keys(D.V3_PROSE || {}).find((id) => D.V3_PROSE[id].peak && D.V3_PROSE[id].text && !/\{/.test(D.V3_PROSE[id].text));
  const flatId = Object.keys(D.V3_PROSE || {}).find((id) => !D.V3_PROSE[id].peak && D.V3_PROSE[id].text && !/\{/.test(D.V3_PROSE[id].text));
  let peaks = 0;
  if (!peakId) fail("山場の印の付いた場面が無い");
  else {
    const n1 = G.S.log.length;
    G.startEvent(peakId);
    const got1 = G.S.log.slice(n1);
    if (!got1.some((e) => e.k === "title" && e.peak)) fail(`山場 ${peakId}：見出しに印が無い`);
    const ps = V3.paras(D.V3_PROSE[peakId].text);
    peaks = got1.filter((e) => e.k === "nar" && e.peak).length;
    if (peaks < ps.length) fail(`山場 ${peakId}：段落に印が無い（${peaks}／${ps.length}）`);
    G.S.mode = "explore"; G.S.event = null;
  }
  if (flatId) {
    const n2 = G.S.log.length;
    G.startEvent(flatId);
    if (G.S.log.slice(n2).some((e) => e.peak)) fail(`山場でない ${flatId} に印が付いた`);
    G.S.mode = "explore"; G.S.event = null;
  }

  ok(`物語の長い文（差し替え ${scenes} 場面・文 ${texts}）`);
};
