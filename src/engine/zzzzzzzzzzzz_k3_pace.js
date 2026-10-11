// K3：戦技とスキルの覚え方の釣り合い。持ち主「野営の稽古でめっちゃスキルを覚えるけど、そんな簡単に覚えないで。
//   誰かに稽古をつけてもらったり、街のイベントだったりで覚えて。もしくはクリティカルダイスを出すとか、強敵を倒すとか」
// 野営の稽古で覚えない・訓練場は教官の条件と「一度に一つ」は K1（zzzzzzzzzzz_k1_skills.js）の中。ここで足すのは二つ：
//   1. 強敵を倒したとき：ボス・使徒（絶界の主）・迷宮の主を倒すと、その戦いで手にしていた武器の型に合う戦技（無ければ強敵向きのスキル）を、
//      低くない見込み（D.K3.BOSS。段の高い強敵は D.K3.ELITE）で一つ身につける。倒した相手の名を入れた一文と、目立つ一行（K1 の learn。how "foe"）
//   2. ギルドの依頼の礼：依頼を報告したとき、ときどき依頼主が礼に巻物を添える（D.K3.QUEST）
// 判定の大成功で覚える（K2）・巻物・師・町の出来事（K1）はそのまま。セーブに足す項目は無い。DOM には触らない。乱数は G.rand / G.pick。レーン C（K3）
(function (G) {
  const D = G.data;
  const K = G.k1;
  if (!K || !D.SKILLS) return;
  const SK = D.SKILLS;
  const X = (G.k3 = G.k3 || {});
  D.K3 = D.K3 || { BOSS: 0.5, ELITE: 0.2, ELITE_TIER: 5, QUEST: 0.2 };
  // 強敵を倒して身につくスキル（武器の型に合う戦技が無いとき）
  X.FOE_SKILLS = ["k2_steadymind", "k2_coldhead", "k2_vitaleye", "k2_badluck", "k2_heavyarmor", "k2_deepbreath", "k2_glare"];

  const raw = (f) => D.ENEMIES[f.id] || {};
  X.strength = (c) => {
    if (!c) return 0;
    if (c.boss || c.foes.some((f) => raw(f).boss || f.e3 || raw(f).majin)) return 2;
    if (c.foes.some((f) => (raw(f).tier || 1) >= D.K3.ELITE_TIER)) return 1;
    return 0;
  };
  // 身につける候補：手にしている武器の型に合う、まだ覚えていない戦技（この戦いで使った型を先に）。無ければ強敵向きのスキル
  X.candidates = (S) => {
    S = S || G.S;
    const arts = Object.keys(SK).filter((id) => K.isArt(id) && !K.knows(id, S) && SK[id].style && K.styleOk(id, S));
    if (arts.length) return arts.sort();
    return X.FOE_SKILLS.filter((id) => SK[id] && !K.knows(id, S));
  };
  const act0 = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const c = S && S.combat;
    const r = act0(arg);
    if (!c || !S || S.over || G.S !== S || S.combat === c || c.foes.some((f) => f.hp > 0)) return r;
    const lv = X.strength(c);
    if (!lv) return r;
    const p = lv === 2 ? D.K3.BOSS : D.K3.ELITE;
    const list = X.candidates(S);
    if (!list.length || G.rand() >= p) return r;
    const id = G.pick(list);
    const big = c.foes.find((f) => raw(f).boss || f.e3 || raw(f).majin) || c.foes[0];
    G.say(`${big.name}の最後の一撃は、まだ腕に残っている。あの間合いは、もう盗んだ。`);
    K.learn(id, "foe");
    return r;
  };

  // 学院の講義（術）も「一度に一つ」：術を一つ覚えたら、しばらくは次の講義を受けても身につかないので受けさせない（K3 の追加。持ち主「魔法・スキル・戦技、どれも一緒」）
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    if (!S || S.fac !== "academy" || !K.lessonWait(S)) return g;
    g.forEach((grp) => (grp.list || []).forEach((a) => { if (/^academy:/.test(a.id) && !a.disabled) { a.disabled = true; a.sub = K.LESSON_WAIT; } }));
    return g;
  };
  const academyAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (head !== "academy" || !S) return academyAct0(head, arg, a);
    if (K.lessonWait(S)) return;
    const n0 = (S.spells || []).length;
    const r = academyAct0(head, arg, a);
    if ((S.spells || []).length > n0) K.lessonDone();
    return r;
  };

  // ギルドの依頼の礼
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    const q0 = S && S.counters ? S.counters.quests : 0;
    const r = facAct0(head, arg, a);
    if (!S || S.over || G.S !== S || head !== "guild" || !String(arg || "").startsWith("report") || !(S.counters.quests > q0)) return r;
    if (G.rand() < D.K3.QUEST) {
      const id = K.randomScroll && K.randomScroll("any");
      if (id && G.give(id)) { G.say("依頼主は報酬の袋に、紐で縛った古い巻物を一本添えた。「使い道が分かる人に渡したかったんです」"); G.note(`${D.ITEMS[id].name}を手に入れた。`); }
    }
    return r;
  };
})(globalThis.G = globalThis.G || {});
