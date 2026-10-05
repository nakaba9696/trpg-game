// Q8：恋人・結婚の前に、その人の頼みごと（C9）をこなす（data/q8_love_quests.js の D.Q8Q）。
// 包むもの（書き換えない）：
//   - 恋人：G.q8LoveMissing（zzzzzzz_q8_love.js。恋の筋の告白の段・M10 の告白・恋仲になる所がここを見る）に「頼みごとの前半」を足す
//   - 結婚の約束：G.m10P.propose・恋の筋の求婚の段（7）・G.m10Do("vow")（と、約束を飛ばした "wed"）に「頼みごとの結末」を掛ける
// 古いセーブで、すでに約束・連れ合いの仲はそのまま（ここでは間柄を書き換えない）。名前の頭の zzzzzzz_q8_q は zzzzzzz_q8_love.js より後。レーン Q
(function (G) {
  const D = G.data;
  const QQ = () => D.Q8Q;
  const quest = (c) => (c && c.c2 && D.Q9 && D.Q9[c.c2]) || null;
  const done = (c, S) => { const s = c && c.c2 && S && S.q9 && S.q9[c.c2]; return (s && s.n) || 0; };
  const finished = (c, S) => { const s = c && c.c2 && S && S.q9 && S.q9[c.c2]; return !!(s && (s.end || s.n >= quest(c).steps.length)); };

  // 恋人の前：頼みごとの前半
  G.q8QuestLoveOk = (c, S) => {
    S = S || G.S;
    const q = quest(c);
    return !q || QQ().off || done(c, S) >= QQ().loveSteps(q.steps.length);
  };
  // 結婚の約束の前：頼みごとの結末
  G.q8QuestWedOk = (c, S) => {
    S = S || G.S;
    const q = quest(c);
    return !q || QQ().off || finished(c, S);
  };

  if (G.q8LoveMissing) {
    const miss0 = G.q8LoveMissing;
    G.q8LoveMissing = (c, S) => {
      const m = miss0(c, S);
      if (c && !G.q8QuestLoveOk(c, S || G.S)) m.push("quest:half");
      return m;
    };
  }

  const st = (c) => (G.m10St ? G.m10St(c) : (c && c.m10 && c.m10.st) || "");
  const MP = G.m10P;
  if (MP && MP.propose) {
    const propose0 = MP.propose;
    MP.propose = (c, S) => propose0(c, S) && G.q8QuestWedOk(c, S);
  }
  if (G.r2Gate) {
    const gate0 = G.r2Gate;
    G.r2Gate = (tp, c, S) => {
      if (!gate0(tp, c, S)) return false;
      const meta = tp && tp.r2;
      if (meta && meta.type === "step" && meta.n === 7 && !["vow", "wed"].includes(st(c))) return G.q8QuestWedOk(c, S || G.S);
      return true;
    };
  }
  if (G.m10Do) {
    const do0 = G.m10Do;
    G.m10Do = (kind, c, o) => {
      const S = G.S;
      const skip = (kind === "vow" && st(c) === "love") || (kind === "wed" && !["vow", "wed"].includes(st(c)));
      if (skip && c && S && !G.q8QuestWedOk(c, S)) {
        const x = G.m10Of ? G.m10Of(c) : (c.m10 = c.m10 || {});
        x.cool = Math.max(x.cool || 0, S.day + 7);
        G.note(QQ().HOLD.replace("{n}", G.m2Short ? G.m2Short(c) : c.name));
        return;
      }
      return do0(kind, c, o);
    };
  }
})(globalThis.G = globalThis.G || {});
