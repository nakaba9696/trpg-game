// R5d：一度きりの町の人は、汎用のモブ絵（型の絵）を使い回す（持ち主の決定「依頼人も汎用モブ絵の使い回しでよい。名ありと立ち絵が被るのはやめて」）。
// src/data/r5_named.js の表のうち、一つの場所の出来事にだけ出てくる町と野の人（W3・W6・W7・R3）に mob: true を付ける。
// mob の人は名のある人のまま（札は「名前（肩書き）」）だが、専用の絵は描かず、年頃・性別・職業の合う型の絵を出す（G.r5.artId が ""。名前だけの人と同じ）。
// 筋に何度も出る人（シグルン・ロデリク・ペルゴ・ケイル・糸の使徒の筋の人）は今のまま（専用の絵が無ければ絵なし）。
// 型の絵は名のある人の絵と被らない（型は kind_ の絵だけ。tests/checks/r5b_mob.mjs）。
// レーン A（R5d）
(function (G) {
  const D = (G.data = G.data || {});
  const R = D.R5_NAMED || {};
  for (const id of [
    // 町と野の人（W3・W6・W7）
    "benno_changer", "marek", "oswin_tailor", "hannes", "isolde", "marco", "jork", "hanna", "benno_bridge", "hugo_priest",
    "seebeck", "rita_ash", "balt", "anselm_relic", "rosa", "hein", "hald",
    // 最初の町の人（R3）
    "helga_herb", "oswald_honey", "mina", "basso", "gasparo", "emil", "arnaud", "loch", "rita_bread", "konrad",
  ]) if (R[id]) R[id].mob = true;
})(globalThis.G = globalThis.G || {});
