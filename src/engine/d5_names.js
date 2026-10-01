// D5 #105：国名・都市名を持ち主のスプレッドシートにそろえた（docs/lore/world.md 18.）。場所・敵・アイテムの id は変えていない。
// 国の名前を鍵にしてセーブに残る項目（M3 の国ごとの評判 S.repute・騎士の位を授けた国 S.titleAt）だけ、古い名前を新しい名前へ移す。
// 年表・墓碑・日誌に残った古い名前の文は、そのときの記録なのでそのままにする。DOM には触らない
(function (G) {
  G.OLD_NATION_NAMES = {
    聖王国リーヴェル: "レオネスト王国",
    鉄血帝国ガルムント: "ノルディア帝国",
    ゼファラ共和国: "エルメシア共和国",
    魔法国ゼファラ: "エルメシア共和国", // 腐れ庭園だけの別の名だった。共和国にまとめる
  };

  // 古いセーブを読み込んだときに一度呼ぶ（src/main.js）。何度呼んでもよい
  G.fixOldNames = (S) => {
    if (!S) return S;
    const map = G.OLD_NATION_NAMES;
    if (S.repute) {
      for (const [old, now] of Object.entries(map)) {
        const o = S.repute[old];
        if (!o) continue;
        const n = S.repute[now];
        S.repute[now] = n
          ? { ...n, rep: (n.rep || 0) + (o.rep || 0), inf: (n.inf || 0) + (o.inf || 0), wanted: !!(n.wanted || o.wanted) }
          : o;
        delete S.repute[old];
      }
    }
    if (S.titleAt && map[S.titleAt]) S.titleAt = map[S.titleAt];
    return S;
  };
})(globalThis.G = globalThis.G || {});
