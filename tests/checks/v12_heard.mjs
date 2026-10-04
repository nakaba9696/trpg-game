// V12：覚え書きを図鑑の項目に振り分ける（engine/zzzz_v12_heard.js）
// - ゴブリンの噂はゴブリンの項目に。名前の無い噂は「ほかの噂」の箱に。地名の噂はその場所に
// - G.memo(t, { person }) のように渡した id が先。出来事の結果の用語（lore）にも寄せる
// - 図鑑に載っている項目なら、その項目に新しい印。載っていなければ噂のタブの印
// - 古いセーブ（S.memos だけ）は一度だけ振り分ける。印は付けない
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

  {
    const G = start();
    const D = G.data;
    const V = G.v12;
    if (!V) { F("G.v12 が無い"); return; }
    // ゴブリンの噂 → ゴブリンの項目（まだ会っていないので噂のタブの印）
    G.memo("噂：街道のゴブリンが、荷車の車輪だけ盗んでいくんだと");
    if (!V.list("foe:goblin").some((x) => x.t.includes("車輪だけ"))) F("ゴブリンの噂がゴブリンの項目に入らない");
    if (!G.codexIsFresh("heard", "foe:goblin")) F("まだ会っていない魔物の噂に、噂のタブの印が付かない");
    if (!V.boxes().some((b) => b.id === "un:foe")) F("まだ会っていない魔物の噂が、噂のタブの箱に出ない");
    // 会ったあとの噂は、ゴブリンの項目そのものに印
    G.codexMeet("goblin", true);
    G.memo("噂：ゴブリンは、光る物を三つ集めると巣に帰るらしい");
    if (!G.codexIsFresh("foe", "goblin")) F("図鑑に載った魔物の噂に、その項目の印が付かない");
    if (V.boxes().some((b) => b.id === "un:foe")) F("会ったあとも、魔物の噂が噂のタブに残る");
    // 名前の無い噂 → ほかの噂の箱
    G.memo("隣の家の猫が、また屋根の上で歌っていた");
    if (!V.list("misc").some((x) => x.t.includes("屋根の上"))) F("名前の無い噂が「ほかの噂」の箱に入らない");
    // 地名の噂 → その場所（短い呼び名でも）
    G.memo("噂：ヴァレンツァの魚屋は、月曜だけ口がきけない");
    if (!V.list("loc:nerva").length) F("地名（ヴァレンツァ）の噂が港町ヴァレンツァに入らない");
    // 渡した id が先
    const pid = Object.keys(D.F2_PEOPLE)[0];
    G.memo("噂：だれそれは、夜明けに必ず井戸へ行く", { person: pid });
    if (!V.list("person:" + pid).length) F("G.memo に渡した人物の id に入らない");
    // 出来事の結果の用語に寄せる
    G.apply({ memo: "石の裏に、小さな手形が三つあった", lore: "redmoon:first" });
    if (!V.list("lore:redmoon").some((x) => x.t.includes("手形"))) F("出来事の結果の用語（lore）に寄せない");
    // 同じ文は二度入らない
    G.memo("隣の家の猫が、また屋根の上で歌っていた");
    if (V.list("misc").filter((x) => x.t.includes("屋根の上")).length !== 1) F("同じ覚え書きが二度入る");
    // これまでどおり S.memos にも残る（ほかの仕組みが読む）
    if (!G.S.memos.some((t) => t.includes("車輪だけ"))) F("S.memos に残らない");
    // 噂の表を全部振り分けても例外が出ない。箱に入るのは半分より少ない
    const keys = D.RUMORS.map((t) => V.classify(t));
    const misc = keys.filter((k) => k === "misc").length;
    if (misc * 2 >= keys.length) F(`噂の表の半分以上が箱に入る（${misc}/${keys.length}）`);
    // 冒険をまたいだ図鑑を合わせても残る
    const merged = G.codexMerge(G.codex(), { items: {}, foes: {}, people: {}, heard: { misc: [{ t: "別のブラウザで聞いた話", at: 1 }] } });
    if (!merged.heard || !merged.heard["foe:goblin"] || !merged.heard.misc.some((x) => x.t === "別のブラウザで聞いた話")) F("図鑑を合わせると聞いた話が消える");
    if (!failures) ok(`V12 覚え書きの振り分け（噂の表 ${keys.length} 件のうち箱 ${misc}）`);
  }

  // 古いセーブ：S.memos だけがある
  {
    const G = start();
    const S = G.S;
    delete S.v12heard;
    S.memos = ["噂：樽ゴブリンに飲み比べで勝つと、宝をくれるらしいぞ。", "どこかで鐘が三つ鳴った"];
    G.codex().heard = undefined;
    G.endTurn();
    const V = G.v12;
    if (!V.list("foe:barrelgob").length) F("古いセーブの覚え書きが振り分けられない（樽ゴブリン）");
    if (!V.list("misc").length) F("古いセーブの名前の無い覚え書きが箱に入らない");
    if (G.codexFresh("heard").length) F("古いセーブの振り分けで印が付く");
    if (!S.v12heard) F("振り分けの済みの印（S.v12heard）が立たない");
    const n = V.list("misc").length;
    S.v12heard = 1;
    G.endTurn();
    if (V.list("misc").length !== n) F("古いセーブの振り分けを二度する");
    if (!failures) ok("V12 古いセーブの覚え書きを振り分ける");
  }
};
