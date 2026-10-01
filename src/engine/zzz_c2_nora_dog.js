// #123：ノラミは犬の獣人（持ち主の決定）。前は狼だったので、古いセーブの仲間の欄には c.beast・c.who.look.beast に "wolf" が残っている。
// 名のある仲間（c.c2）の種族は、セーブの欄よりキャラメモ（D.C2_PEOPLE）の今の値を優先して読む。セーブは書き換えない。
// 絵（src/ui/r1_race.js の G.companionWho）も G.r1Comp から look を上書きするので、これで犬の耳になる。
// 名前の頭の zzz は、zr1_race.js（G.r1Comp）・zz_c2_people.jsより後に読ませるため。レーン C
(function (G) {
  const comp0 = G.r1Comp;
  if (!comp0) return;
  G.r1Comp = (c) => {
    const p = c && c.c2 ? (G.data.C2_PEOPLE || {})[c.c2] : null;
    if (p && p.race && (p.race !== c.race || (p.beast || "") !== (c.beast || ""))) return comp0({ race: p.race, beast: p.beast });
    return comp0(c);
  };
})(globalThis.G = globalThis.G || {});
