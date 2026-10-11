// V15：語りの視点（持ち主の決定。docs/lore/voice.md の「語りの視点」）。出来事・長編・仲間の話・恋の話は、
// 主人公のいない場面へ切り替えてよい。切り替えは「――」で終わる一行だけの段落で示す。
// - D.V15_ADV に挙げた場面（src/data/zv3_prose_v15*.js）が、実在する出来事・選択肢・結果・恋の段を指し、差し替えが当たっている
// - 差し替えたあとの文に、切り替えの印の段落がある（ほかの表に上書きされて消えていない）
// - 印の段落は短い一行で、台詞を含まない
export default ({ loadEngine, fail, ok }) => {
  const G = loadEngine();
  const D = G.data;
  const V3 = G.v3prose;
  const list = D.V15_ADV || [];
  if (list.length < 20) fail(`V15 の場面が少ない：${list.length}`);
  const CUT = /^[^「」『』。]{2,40}――$/;
  const textAt = (x) => {
    if (x.path) {
      let o = D;
      for (const k of x.path.split(".")) o = V3.step(o, k);
      return Array.isArray(o) ? o.join("\n\n") : o;
    }
    const e = (D.EVENTS || []).find((y) => y.id === x.id);
    if (!e) return null;
    if (x.at === "text") return e.text;
    const [label, ...path] = x.at.split(".");
    let o = (e.choices || []).find((c) => c.label === label);
    for (const k of path) o = o && o[k];
    return o && o.text;
  };
  let cuts = 0;
  for (const x of list) {
    const where = x.path || `${x.id} ${x.at}`;
    const t = textAt(x);
    if (typeof t !== "string") { fail(`V15：場面が無い ${where}`); continue; }
    const ps = V3.paras(t);
    const cs = ps.filter((p) => CUT.test(p));
    if (!cs.length) fail(`V15：視点の切り替えの印（「――」で終わる一行）が無い ${where}`);
    if (ps.some((p) => /――$/.test(p) && !CUT.test(p))) fail(`V15：切り替えの印が長すぎるか台詞を含む ${where}`);
    cuts += cs.length;
  }
  (V3.missing || []).filter((m) => list.some((x) => m.startsWith(x.id || x.path))).forEach((m) => fail(`V15：差し替えが当たらない ${m}`));
  ok(`V15 の語りの視点（${list.length} 場面・切り替え ${cuts}）`);
};
