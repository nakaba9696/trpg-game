// Q8：恋の相手と組み合わせ（data/q8_pairs.js の D.Q8P）。m10_love.js・zz_m11_love.js・zzzz_romance.js・zzzzzz_romance2.js は書き換えず、包む：
//   - G.m10Can（恋の相手か）：一覧（ALLOW）の人だけ・主人公との組み合わせが「男と男」でないときだけ。
//     恋の話題（G.tk の loveOk）・恋の筋（R2）の段・M10 の恋の出来事・嫉妬は、どれも G.m10Can を見るので、ここで止まる。
//     恋の相手でない人で好感度が高ければ、今まで通り情の出来事（G.bondKin・events_c_bond.js）になる
//   - G.m10P.spark・恋の筋の一段目（気になる）：加わってから日数がたち、身の上話を聞いてから（いきなり惚れない）
//   - G.m11ApAt（格の違う相手の続き物）：一覧（AP）の相手だけ・組み合わせ
// 古いセーブで、すでに恋仲・約束・連れ合いの仲は、そのまま残す（ここでは間柄を書き換えない）。レーン Q
(function (G) {
  const D = G.data;
  const P = () => D.Q8P;
  const PARTNER = ["love", "vow", "wed"];
  const st = (c) => (G.m10St ? G.m10St(c) : (c && c.m10 && c.m10.st) || "");
  const heroSex = (S) => (S && S.profile && S.profile.sex) || "";
  // 主人公と相手の性別の組み合わせ（男と男だけ不可）
  G.q8PairOk = (sex, S) => !(heroSex(S || G.S) === "男" && sex === "男");
  // 一覧の人か
  G.q8LoveAllowed = (c) => !!(c && c.c2 && P().ALLOW[c.c2]);

  const can0 = G.m10Can;
  G.m10Can = (c) => {
    if (!can0(c)) return false;
    if (P().off) return true;
    const S = G.S;
    if (PARTNER.includes(st(c))) return true; // 古いセーブの仲は残す
    return G.q8LoveAllowed(c) && G.q8PairOk(c.sex || (G.m10Sex ? G.m10Sex(c) : ""), S);
  };

  // いきなり惚れない：加わってからの日数と、聞いた身の上話の数
  const joinedOf = (c, S) => {
    const j = c.c2 && G.c2State ? G.c2State(S).joined[c.c2] : undefined;
    return j !== undefined ? j : c.joined !== undefined ? c.joined : S.day;
  };
  G.q8SparkOk = (c, S) => {
    S = S || G.S;
    if (!c || !S || P().off) return true;
    const sp = P().SPARK;
    if (S.day - joinedOf(c, S) < sp.days) return false;
    const heard = (G.tkState ? G.tkState(S).heard : {}) || {};
    const n = Object.keys(heard).filter((k) => c.c2 && new RegExp(`^${c.c2}_p\\d$`).test(k)).length;
    return n >= sp.heard;
  };
  const MP = G.m10P;
  if (MP && MP.spark) {
    const spark0 = MP.spark;
    MP.spark = (c, S) => spark0(c, S) && G.q8SparkOk(c, S);
  }
  if (G.r2Gate) {
    const gate0 = G.r2Gate;
    G.r2Gate = (tp, c, S) => {
      if (!gate0(tp, c, S)) return false;
      const meta = tp && tp.r2;
      if (meta && meta.type === "step" && meta.n === 1) return G.q8SparkOk(c, S || G.S);
      return true;
    };
  }
  if (G.m11ApAt) {
    const ap0 = G.m11ApAt;
    G.m11ApAt = (key, n, S) => {
      if (!ap0(key, n, S)) return false;
      if (P().off) return true;
      const a = P().AP[key];
      return !!a && G.q8PairOk(a.sex, S || G.S);
    };
  }
})(globalThis.G = globalThis.G || {});
