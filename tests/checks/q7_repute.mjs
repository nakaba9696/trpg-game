// Q7：ステータスの「名声と評判」（engine/q7_repute.js の G.q7.repute。描くのは ui/ui.js の sheetRepute）
// - 名声：段階の言葉（D.FAME_RANKS）と、次の段階までの進み・あと何点
// - 国ごとの評判と知られた悪名：段階の言葉・手配中なら懸賞金。今いる国が先頭、関わった国だけ
// - 隠れた罪（Q8）や罪の匂い（S.sin）は見せない。一覧を作るだけで S.repute を書き換えない。古いセーブでも動く
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ G, fail, seeded }) => {
  const D = G.data;
  const F = (m) => fail("Q7 名声と評判: " + m);
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "評判の試し", sex: "男", age: 30, history: "テスト用", personality: "無口" } });
    return G.S;
  };

  let S = start(1);
  const here = G.nationOf();
  let R = G.q7.repute(S);
  if (!R || R.fame.rank !== D.FAME_RANKS[0][1]) F(`はじめの名声が「${D.FAME_RANKS[0][1]}」でない：${R && R.fame.rank}`);
  if (here && (!R.nations.length || R.nations[0].name !== here || !R.nations[0].here)) F("今いる国が先頭に出ない");
  if (here && R.nations[0].infLabel !== "知られていない") F(`はじめの悪名が「知られていない」でない：${R.nations[0].infLabel}`);
  if (R.title) F("位の無い者に位が出る");

  // 名声の段階と進み
  S.fame = 70;
  let f = G.q7.fame(S);
  const i = D.FAME_RANKS.findIndex(([n]) => n > 70) - 1;
  if (f.rank !== D.FAME_RANKS[i][1] || f.next !== D.FAME_RANKS[i + 1][1] || f.toNext !== D.FAME_RANKS[i + 1][0] - 70) F(`名声 70 の段階・次・あと何点が違う：${JSON.stringify(f)}`);
  if (!(f.pct > 0 && f.pct < 1)) F(`名声の進みが 0〜1 の間でない：${f.pct}`);
  S.fame = 99999;
  f = G.q7.fame(S);
  if (f.next || f.pct !== 1) F("いちばん上の名声で次の段階が出る");
  if (f.rank !== G.fameRank(S.fame)) F("名声の段階の言葉が G.fameRank と違う");

  // 評判・悪名の段階（関わった国だけ並ぶ・S.repute を書き換えない）
  S = start(2);
  const other = Object.values(D.LOCS).map((l) => l.nation || l.region).find((n) => n && n !== G.nationOf() && !(D.LAWLESS || []).includes(n));
  S.repute = { [other]: { rep: 35, inf: 0, wanted: false } };
  const snap = JSON.stringify(S.repute);
  R = G.q7.repute(S);
  if (JSON.stringify(S.repute) !== snap) F("一覧を作るだけで S.repute が書き換わった");
  const o = R.nations.find((n) => n.name === other);
  if (!o || o.repLabel !== "信頼されている") F(`評判 35 の言葉が違う：${o && o.repLabel}`);
  if (G.nationOf() && R.nations[0].name !== G.nationOf()) F("関わった国より今いる国が後ろにある");
  const quiet = Object.values(D.LOCS).map((l) => l.nation || l.region).find((n) => n && n !== other && n !== G.nationOf());
  if (quiet && R.nations.some((n) => n.name === quiet)) F("関わっていない国が並ぶ");
  S.repute[other].rep = -5;
  if (G.q7.repute(S).nations.find((n) => n.name === other).repLabel !== "疎まれている") F("評判がマイナスの言葉が「疎まれている」でない");

  const lab = (inf, wanted) => { S.repute[other] = { rep: 0, inf, wanted }; return G.q7.repute(S).nations.find((n) => n.name === other); };
  if (lab(5, false).infLabel !== "噂になっている") F("悪名 5 が「噂になっている」でない");
  if (lab(20, false).infLabel !== "目を付けられている") F("悪名 20 が「目を付けられている」でない");
  const w = lab(40, true);
  if (w.infLabel !== "手配中" || w.bounty !== 400) F(`手配中の言葉か懸賞金が違う：${w.infLabel} ${w.bounty}`);
  // 懸賞金は G.bounty と同じ
  if (w.bounty !== S.repute[other].inf * 10) F("懸賞金の計算が G.bounty と違う");

  // 本物の罪で悪名が上がる → 段階が変わる
  S = start(3);
  if (G.nationOf()) {
    G.crime("theft");
    const n0 = G.q7.repute(S).nations[0];
    if (!n0.inf || n0.infLabel === "知られていない") F("罪を犯しても悪名の段階が変わらない");
  }

  // 隠れた罪・罪の匂いは見せない
  S = start(4);
  S.sin = 99;
  if (G.nationOf()) {
    G.repOf(G.nationOf()).hidden = 50; G.repOf(G.nationOf()).hid = 50;
    const n0 = G.q7.repute(S).nations[0];
    if (n0.inf !== 0 || n0.infLabel !== "知られていない") F("隠れた罪・罪の匂いが悪名に出る");
  }
  // 位
  S.title = "騎士"; S.titleAt = G.nationOf() || "";
  R = G.q7.repute(S);
  if (!R.title || R.title.name !== "騎士") F("位が出ない");

  // 古いセーブ（S.repute・S.fame が無い）
  S = start(5);
  delete S.repute; delete S.fame;
  try { R = G.q7.repute(S); if (!R || R.fame.n !== 0) F("古いセーブで名声が 0 にならない"); if (S.repute) F("古いセーブで一覧を作ると S.repute ができる"); } catch (e) { F(`古いセーブで止まる：${e.message}`); }

  // 画面：「能力」のタブに出す
  const ui = readFileSync(fileURLToPath(new URL("../../src/ui/ui.js", import.meta.url)), "utf8");
  if (!/self: sheetPane\("self", \[[^\]]*sheetRepute\(\)/.test(ui)) F("「能力」のタブに名声と評判が無い");
  if (!/sheetSection\("repute", "名声と評判"/.test(ui)) F("名声と評判の欄の見出しが無い");
};
