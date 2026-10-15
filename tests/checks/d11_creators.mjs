// D11：創造主の設定（持ち主の決定 2026-10-15。docs/lore/gods.md・world.md 6.）
// - 世界を作ったのは文明の発達した人間たち（創造主）。争いの兵器として使徒を作り、全員死んだ。神々は最初からいない。どれも〔秘〕
// - 見える文に「創造主」と書かない。「神々はいない」「創造主は人間だった」とも書かない
// - 昔の断片（古い祈祷文と、その用語説明）だけは「造り主」と匂わせてよい。今の人の文には出さない
// - GM への説明は新しい設定（創造主・神々は最初からいない・使徒の不死性・滅びていく世界）になっている
// - 夢の子ども（逆夢のベルファス）の言い張りは「あるじさま」。用語説明の maou（古いセーブの記録のため id は残す）の題は「造り主」
const SECRET = /創造主|神々は(もう|最初から|はじめから)?いな|神々など(い|居)な|神は(い|居)ない|造り主は人間|人間が(世界|この世)を作/;
const OLD_ERA = /^(d6_old_\w+|用語 maou(:\w+)?)$/;

export default ({ fail, loadEngine }) => {
  const G = loadEngine();
  const D = G.data;
  const seen = [];
  const add = (w, t) => { if (typeof t === "string") seen.push([w, t]); };
  const deep = (w, x) => { if (typeof x === "string") add(w, x); else if (Array.isArray(x)) x.forEach((y) => deep(w, y)); else if (x && typeof x === "object") Object.entries(x).forEach(([k, y]) => deep(w + "." + k, y)); };
  const out = (w, o) => { if (!o) return; ["text", "memo", "chron"].forEach((k) => add(w, o[k])); out(w, o.win); };
  D.EVENTS.forEach((e) => { add(e.id, e.title); add(e.id, e.text); e.choices.forEach((c) => { add(e.id, c.label); out(e.id, c.ok); out(e.id, c.ng); out(e.id, c.win); }); });
  Object.entries(D.LORE).forEach(([id, x]) => { add(`用語 ${id}`, x.title); x.lines.forEach(([k, t]) => add(`用語 ${id}:${k}`, t)); });
  (D.RUMORS || []).forEach((r, i) => add("噂" + i, r));
  (D.AMBIENT || []).forEach((a) => add(a.id, a.text));
  add("WORLD.intro", D.WORLD.intro);
  D.WORLD.all.forEach(([h, rows]) => { add("手引き", h); rows.forEach(([k, v]) => add("手引き " + k, k + v)); });
  Object.values(D.MAJIN || {}).forEach((m) => add("MAJIN " + m.name, m.rumor));
  Object.entries(D.ITEMS).forEach(([id, it]) => add(id, (it.name || "") + (it.desc || "")));
  Object.entries(D.ENEMIES).forEach(([id, e]) => { add(id, (e.name || "") + (e.desc || "")); deep(id + ".lines", e.lines); });
  Object.entries(D.LOCS).forEach(([id, L]) => add(id, (L.name || "") + (L.desc || "")));
  deep("M4", D.M4);
  deep("V3_PROSE", D.V3_PROSE);
  deep("V3_PROSE_AT", D.V3_PROSE_AT);
  deep("V3_FIRST", D.V3_FIRST);
  deep("V3_SAY", D.V3_SAY);
  if (seen.length < 1000) fail(`見える文の集め方がおかしい（${seen.length}）`);

  for (const [w, t] of seen) if (SECRET.test(t)) fail(`〔秘〕の創造主・神々の真相が見える文にある「${t.match(SECRET)[0]}」：${w}「${t.slice(0, 30)}…」`);
  for (const [w, t] of seen) if (/造り主/.test(t) && !OLD_ERA.test(w)) fail(`「造り主」は昔の断片だけ：${w}「${t.slice(0, 30)}…」`);

  // 滅びていく世界の手触り：通行人のひとことと噂に、愚痴・噂の形で置く（言葉で明かさない）
  const decline = (D.AMBIENT || []).filter((a) => /^u3_d11_/.test(a.id));
  if (decline.length < 4) fail(`滅びの手触りのひとことが少ない（${decline.length}）`);
  for (const a of decline) if (/滅び|終わり|終わって|世界が/.test(a.text)) fail(`滅びの手触りが言葉で明かしている：${a.id}`);

  // 昔の断片と用語説明
  const maou = D.LORE.maou;
  if (!maou) fail("用語説明 maou（造り主）が無い（古いセーブの開いた記録が宙に浮く）");
  else {
    if (maou.title !== "造り主") fail(`用語説明 maou の題が「造り主」でない：${maou.title}`);
    for (const k of ["prayer", "dream", "sulk"]) if (!maou.lines.some((l) => l[0] === k)) fail(`用語説明 maou に ${k} の行が無い`);
  }
  const prayer = D.EVENTS.find((e) => e.id === "d6_old_prayer");
  if (!prayer || !/造り主の眠りを妨げるな/.test(prayer.choices[0].ok.text)) fail("古い祈祷文の切れ端が「造り主の眠りを妨げるな」になっていない");
  const dream = D.EVENTS.find((e) => e.id === "v1_yuradream");
  if (!dream || !/あるじさま/.test(dream.text)) fail("逆さの夢の子どもが「あるじさま」と言っていない");

  // GM への説明
  const yura = D.MAJIN.yura;
  if (!yura || !/あるじさま/.test(yura.secret) || /ガイゼリク|魔王/.test(yura.secret + yura.home)) fail("ベルファスの裏設定が新しい設定（あるじさまの眠りの番）になっていない");
  const gm = D.LORE_GM.join("\n");
  const need = [
    [/文明が異常に発達した人間たち（創造主）/, "創造主は文明の発達した人間"],
    [/兵器として使徒/, "使徒は創造主の争いの兵器"],
    [/創造主は全員死んでいる/, "創造主は全員死んでいる"],
    [/名は誰も知らない/, "創造主の名は誰も知らない"],
    [/神々は最初からいない/, "神々は最初からいない"],
    [/創造主の技術の残り/, "仕組みは創造主の技術の残り"],
    [/滅びていく世界/, "滅びていく世界"],
    [/赤い月の夜が年々増えている/, "滅びの手触り（赤い月の夜が増える）"],
    [/使徒の不死性/, "使徒の不死性"],
    [/絶界は黒鎧のエンバルダだけ/, "絶界はエンバルダだけ"],
    [/プレイヤーに明かさない/, "プレイヤーに明かさない"],
  ];
  for (const [re, what] of need) if (!re.test(gm)) fail(`GM への説明に「${what}」が無い`);
  if (/見世物として(作|眺め)/.test(gm.replace("「神々が世界を見世物として作った」は取り下げた", ""))) fail("GM への説明に、取り下げた「神々が世界を見世物として作った」が残っている");
  if (/覗き窓/.test(gm)) fail("GM への説明に、取り下げた「覗き窓」が残っている（赤い月は見張りの目）");
};
