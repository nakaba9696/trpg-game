// K10：仲間の口調（一人称・主人公の呼び方）を表（src/data/k10_voice.js の D.K10_VOICE）に合わせる。
// - 文の差し込み：{I} 一人称・{U} 主人公の今の呼び方・{U:id} その人の今の呼び方（掛け合いの部品など、話し手が決まっている文）・
//   {v:くだけた|丁寧} 話し手の口ぶりで選ぶ（丁寧な人＝表の reg が "polite"）。話し手は今の主役の仲間（G.m2Focus。会話の相手もこれ）
// - 段で呼び方が変わる人（stages）：変わる場面（src/data/k10_scenes.js の話題）を聞き、好感度がその段にあるときだけ、段の呼び方になる。
//   場面の話題は、聞ける好感度になったら、話題の一覧のいちばん上に出す（仲良くなる過程が見えるように）
// 名前の zzzzzzzzz は、M2・M10・M11 の G.m2Fill の包みと、会話・恋の筋の TK.pickMenu の包みより後に読ませるため（manifest は触らない）。
// レーン C
(function (G) {
  const D = (G.data = G.data || {});
  const T = () => D.K10_VOICE || {};
  const aff = (c) => (G.tk && G.tk.aff ? G.tk.aff(c) : Math.round(((c && c.bond) || 0) * 2 - 100));
  const heard = (S, id) => !!(S && S.tk && S.tk.heard && S.tk.heard[id]);

  // 今の段（無ければ表のまま）。c は一党の仲間、id はその C2 の鍵
  G.k10Voice = (c, S) => {
    S = S || G.S;
    const id = c && c.c2;
    const v = id && T()[id];
    if (!v) {
      const t = (D.K10_TRAIT || {})[c && c.trait] || (D.K10_TRAIT || {})._ || { i: "自分", you: "あんた" };
      return { i: t.i, you: t.you, reg: t.reg || "", stage: null };
    }
    let you = v.you[0] || "", stage = null;
    for (const s of v.stages || []) {
      if (aff(c) >= s.at && heard(S, s.scene)) { you = s.you[s.you.length - 1]; stage = s; }
    }
    const name = (S && S.profile && S.profile.name) || "あなた";
    return { i: v.i[0] || "", you: you.replace(/\{you\}/g, name), reg: v.reg || "", stage };
  };
  // 段の場面が今聞けるか（聞ける場面の話題）
  G.k10SceneFor = (c, S) => {
    S = S || G.S;
    const v = c && c.c2 && T()[c.c2];
    if (!v || !v.stages || !G.tk || !G.tk.data) return null;
    const p = G.tk.data(c);
    if (!p) return null;
    for (const s of v.stages) {
      if (heard(S, s.scene)) continue;
      const tp = (p.topics || []).find((x) => x.id === s.scene);
      return tp && G.tk.can(tp, c, S) ? tp : null; // 前の段の場面を聞くまでは、次の段は出さない
    }
    return null;
  };

  // {v:くだけた|丁寧}。中に {kin} などの差し込みがあってもよい（入れ子は一段まで）
  const V_RE = /\{v:((?:[^{}|]|\{[^{}]*\})*)\|((?:[^{}]|\{[^{}]*\})*)\}/g;
  G.k10V = V_RE;
  const fillV = (t) => {
    if (typeof t !== "string" || !/\{(I|U|v:)/.test(t) || !G.S) return t;
    const S = G.S;
    const comps = (S.companions || []);
    const c = G.m2Focus ? G.m2Focus() : null;
    const me = c ? G.k10Voice(c, S) : { i: "自分", you: "あんた", reg: "" };
    return t
      .replace(/\{U:([a-z0-9_]+)\}/g, (all, id) => {
        const x = comps.find((y) => y.c2 === id);
        if (x) return G.k10Voice(x, S).you;
        const v = T()[id];
        return v ? (v.you[0] || "") : "あんた";
      })
      .replace(/\{I\}/g, me.i || "自分")
      .replace(/\{U\}/g, me.you || "あんた")
      .replace(V_RE, (all, a, b) => (me.reg === "polite" ? b : a));
  };
  G.k10Fill = fillV;
  const fill0 = G.m2Fill;
  if (fill0) G.m2Fill = (t) => fill0(fillV(t));

  // 段の場面は、話題の一覧のいちばん上に
  const TK = G.tk;
  if (TK && TK.pickMenu) {
    const pick0 = TK.pickMenu;
    TK.pickMenu = (c, S) => {
      const out = pick0(c, S);
      const sc = G.k10SceneFor(c, S);
      if (!sc) return out;
      return [sc].concat(out.filter((x) => x !== sc)).slice(0, 5);
    };
  }
})(globalThis.G = globalThis.G || {});
