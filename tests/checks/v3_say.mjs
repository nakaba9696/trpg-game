// V3：エンジンの中の語りの置き換え（src/engine/zzzzzzzzzz_v3_say.js・src/data/zv3_say*.js）
// - どの置き換えも、元の文（下の SAMPLES。エンジンの文が変わったらここも直す）に当たり、置き換えた文は二段落以上・数字なし
// - 元の文を語ると、置き換えた文が段落ごとに記録され、山場なら peak の印が付く
const SAMPLES = {
  castle_knight: "国王ヴァレオンの剣が、あなたの肩に触れた。「汝を騎士に叙する」寄進の500Gは、儀式の前に回収されていた。",
  castle_lord: "辺境の小さな領地と、税を払わない領民と、崩れかけた館を手に入れた。それでも、あなたは領主だ。",
  castle_throne: "あなたは玉座の前で剣を抜いた。広間がどよめく。宰相の前に、近衛騎士団長が進み出た。「痴れ者が。この首、取れるものなら取ってみよ」",
  death: "テストは倒れた。崖から落ちた。",
  castle_throne_win: "近衛騎士団長が倒れると、貴族たちは一斉にあなたの前にひれ伏した。昨日までの主のことなど、誰も覚えていないかのように。",
};
export default ({ loadEngine, seeded, fail, ok }) => {
  const G = loadEngine();
  const D = G.data;
  const list = D.V3_SAY || [];
  if (!list.length) { fail("D.V3_SAY が空"); return; }
  G.rand = seeded(9);
  G.P = { trophies: {}, graves: [] };
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  for (const r of list) {
    const src = SAMPLES[r.id];
    if (!src) { fail(`V3_SAY ${r.id}：元の文の見本が無い（tests/checks/v3_say.mjs の SAMPLES に足す）`); continue; }
    if (r.when) G.S.over = "dead";   // 死の場面は、倒れたときだけ
    const hit = G.v3prose.sayFor(src);
    if (!hit || hit.r !== r) { fail(`V3_SAY ${r.id}：元の文に当たらない`); continue; }
    if (/[0-9０-９!！]/.test(hit.text)) fail(`V3_SAY ${r.id}：数字か「！」が入っている`);
    const ps = G.v3prose.paras(hit.text);
    if (ps.length < 2) fail(`V3_SAY ${r.id}：一段落しかない`);
    const n0 = G.S.log.length;
    G.say(src);
    const got = G.S.log.slice(n0);
    if (got.length !== ps.length || got.some((e, i) => e.text !== ps[i])) fail(`V3_SAY ${r.id}：段落ごとに記録されない`);
    if (r.peak && got.some((e) => !e.peak)) fail(`V3_SAY ${r.id}：山場の印が無い`);
    if (r.when) {
      if (ps[ps.length - 1] !== src) fail(`V3_SAY ${r.id}：元の一行が最後に残らない`);
      G.S.over = false;
      if (G.v3prose.sayFor(src)) fail(`V3_SAY ${r.id}：倒れていないのに当たった`);
    }
  }
  // 当たらない文はそのまま
  const n1 = G.S.log.length;
  G.say("ただの一行。");
  if (G.S.log.slice(n1).map((e) => e.text).join("|") !== "ただの一行。") fail("V3_SAY：当たらない文が変わった");
  ok(`エンジンの中の語りの置き換え（${list.length} 件）`);
};
