// V12：図鑑の項目について聞いた話を、その項目の「聞いた話」に残す（engine/zzzz_v12_heard.js）
// - ゴブリンの噂はゴブリンの項目に。地名の噂はその場所に。どの項目にも当たらない話は残さない（箱は作らない）
// - G.heard(t, { person }) のように渡した id が先。人物の名前の入った文は {n} を埋めてから残す
// - 出来事のあらすじ・頼みごと・行き先の手がかり（G.memo）は図鑑に残さない。S.memos には今までどおり残る
// - 酒場の噂を聞くと、項目の話なら図鑑に入る
// - 図鑑に載っている項目なら、その項目に新しい印。載っていなければ噂のタブの印
// - 古いセーブ（S.memos だけ）の噂と手がかりを一度だけ振り分ける。印は付けない
// - 冒険をまたいだ図鑑を合わせても、聞いた話が残る
export default ({ fail, ok, loadEngine, seeded }) => {
  let failures = 0;
  const F = (m) => { failures++; fail(m); };
  const start = () => {
    const G = loadEngine();
    const D = G.data;
    G.rand = seeded(5);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps: stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G;
  };
  const total = (V) => Object.values(V.store()).reduce((a, x) => a + x.length, 0);

  {
    const G = start();
    const D = G.data;
    const V = G.v12;
    if (!V || !G.heard) { F("G.v12・G.heard が無い"); return; }
    // ゴブリンの噂 → ゴブリンの項目（まだ会っていないので噂のタブの印）
    G.heard("噂：街道のゴブリンは、火を焚くと寄ってこないんだと");
    if (!V.list("foe:goblin").some((x) => x.t.includes("火を焚く"))) F("ゴブリンの噂がゴブリンの項目に入らない");
    if (!G.codexIsFresh("heard", "foe:goblin")) F("まだ会っていない魔物の噂に、噂のタブの印が付かない");
    if (!V.boxes().some((b) => b.id === "un:foe")) F("まだ会っていない魔物の噂が、噂のタブの箱に出ない");
    // 会ったあとの噂は、ゴブリンの項目そのものに印
    G.codexMeet("goblin", true);
    G.heard("噂：ゴブリンは、群れの頭を倒すと散り散りになるらしい");
    if (!G.codexIsFresh("foe", "goblin")) F("図鑑に載った魔物の噂に、その項目の印が付かない");
    if (V.boxes().some((b) => b.id === "un:foe")) F("会ったあとも、魔物の噂が噂のタブに残る");
    // どの項目にも当たらない話は残さない
    const n0 = total(V);
    if (G.heard("噂：隣の家の猫が、また屋根の上で歌っていた") !== null || total(V) !== n0) F("どの項目にも当たらない話が残る");
    if (V.store().misc) F("「ほかの噂」の箱ができる");
    // 地名の噂 → その場所（短い呼び名でも）
    G.heard("噂：ヴァレンツァの魚屋は、月曜だけ口がきけない");
    if (!V.list("loc:nerva").length) F("地名（ヴァレンツァ）の噂が港町ヴァレンツァに入らない");
    // 渡した id が先
    const pid = Object.keys(D.F2_PEOPLE)[0];
    G.heard("噂：だれそれは、夜明けに必ず井戸へ行く", { person: pid });
    if (!V.list("person:" + pid).length) F("G.heard に渡した人物の id に入らない");
    // 同じ文は二度入らない
    G.heard("噂：ゴブリンは、群れの頭を倒すと散り散りになるらしい");
    if (V.list("foe:goblin").filter((x) => x.t.includes("群れの頭")).length !== 1) F("同じ話が二度入る");
    // 出来事のあらすじ（G.memo）は図鑑に残さない。S.memos には残る
    const n1 = total(V);
    G.memo("ゴブリンの巣で、錆びた鍋を拾った");
    G.apply({ memo: "港町ヴァレンツァで、樽ゴブリンと飲み比べをした" });
    if (total(V) !== n1) F("出来事の覚え書き（G.memo）が図鑑に入る");
    if (!G.S.memos.some((t) => t.includes("錆びた鍋"))) F("S.memos に残らない（用語の解放・会話の条件が読む）");
    // 酒場の噂を聞くと、項目の話なら図鑑に入る
    const n2 = total(V);
    G.S.gold = 999;
    for (let i = 0; i < 12 && !G.S.over && !G.S.combat; i++) { G.S.event = null; G.facAct("tavern", "rumor"); }
    if (total(V) <= n2) F("酒場の噂が図鑑に入らない");
    // 噂の表のうち、半分より多くが項目に当たる
    const keys = D.RUMORS.map((t) => V.classify(t));
    const hit = keys.filter(Boolean).length;
    if (hit * 2 <= keys.length) F(`噂の表の半分以上がどの項目にも当たらない（${hit}/${keys.length}）`);
    // 冒険をまたいだ図鑑を合わせても残る
    const merged = G.codexMerge(G.codex(), { items: {}, foes: {}, people: {}, heard: { "loc:karna": [{ t: "別のブラウザで聞いた話", at: 1 }] } });
    if (!merged.heard || !merged.heard["foe:goblin"] || !merged.heard["loc:karna"].some((x) => x.t === "別のブラウザで聞いた話")) F("図鑑を合わせると聞いた話が消える");
    if (!failures) ok(`V12 聞いた話を項目に残す（噂の表 ${keys.length} 件のうち項目に当たる ${hit}）`);
  }

  // 古いセーブ：S.memos だけがある
  {
    const G = start();
    const S = G.S;
    delete S.v12heard;
    S.memos = ["噂：樽ゴブリンに飲み比べで勝つと、宝をくれるらしいぞ。", "樽ゴブリンと飲み比べをして負けた", "噂：どこかで鐘が三つ鳴った"];
    G.codex().heard = undefined;
    G.endTurn();
    const V = G.v12;
    const got = V.list("foe:barrelgob");
    if (got.length !== 1 || !got[0].t.startsWith("噂：")) F(`古いセーブの噂だけが振り分けられない（樽ゴブリン ${got.length} 件）`);
    if (G.codexFresh("heard").length || G.codexIsFresh("foe", "barrelgob")) F("古いセーブの振り分けで印が付く");
    if (!S.v12heard) F("振り分けの済みの印（S.v12heard）が立たない");
    const n = total(V);
    S.memos.push("噂：樽ゴブリンは、樽の底に地図を隠してる");
    G.endTurn();
    if (total(V) !== n) F("古いセーブの振り分けを二度する");
    if (!failures) ok("V12 古いセーブの噂を振り分ける");
  }
};
