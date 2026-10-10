// R11：R10 のプレイレビュー（docs/review/playreview_2026-10-10.md）のルールの直し。DOM には触らない。
// 名前の頭の z は、k1（戦技）・b5（仲間の手当て）・m2（仲間）より後に読ませて、その結果を包むため。元のファイルはほとんど書き換えない。
//   中 7：訓練場の稽古・酒場などで教わる技に、使える武器の型（「拳で使う」）を出す。今の武器で使えない技は a.off（画面が薄くする）
//   中 10：仲間の好感度が下がったとき、理由を一行（G.m2Why。companions_m2.js の日ごと・戦いのあとから呼ぶ）
//   低 29：探索・施設で、仲間の手当ての組に「薬草を使う（自分に）」を並べる（b5self:<品>。手番は進まない。持ち物欄から使うのと同じ）
//   低 30：訓練場の「今は選べない」稽古を、理由ごとに一行にまとめる（能力値が足りないものは技ごとのまま）
// セーブ（G.S）に足すもの：S.r11why = { "仲間の id:理由": { day, sum } }（理由の行を出した日と、まだ出していない減り）。無くても動く
(function (G) {
  const D = G.data;

  // ---------------------------------------------------------------- 中 10：好感度が下がった理由
  // v は M2 の bond の目盛り（好感度の目盛りでは 2 倍）。同じ理由は 5 日に一度だけ、たまった分をまとめて出す
  const WHY = {
    talk: "{n}は、このところ口をきいてもらえず、不満をためている",
    poor: "{n}は、懐の寂しさにぼやいている",
    near: "{n}は、死にかけた戦いに肝を冷やした",
    boss: "{n}は、主との戦いに震えが止まらない",
    lose: "{n}は、戦いの運びに眉をひそめた",
  };
  G.R11_WHY = WHY;
  G.m2Why = (c, why, v) => {
    const S = G.S;
    if (!S || S.over || !c || !(v < 0)) return;
    const st = (S.r11why = S.r11why || {});
    const key = `${c.id}:${why}`;
    const r = (st[key] = st[key] || { day: -99, sum: 0 });
    r.sum += v * 2;
    if (why === "talk" || why === "poor") { if (S.day - r.day < 5) return; }
    const n = G.m2Short ? G.m2Short(c) : c.name;
    G.note(`${(WHY[why] || WHY.lose).replace("{n}", n)}。（好感度 ${Math.round(r.sum)}）`);
    r.day = S.day;
    r.sum = 0;
  };

  // ---------------------------------------------------------------- 中 7・低 30：稽古と教わる技
  const K = G.k1;
  const SK = D.SKILLS || {};
  const skillOf = (a) => {
    const m = /^k1(?:train|teach):(?:[^:]+:)?([^:]+)$/.exec(String((a && a.id) || ""));
    return m && SK[m[1]] ? m[1] : null;
  };
  // 武器の型の札（「拳で使う」「剣か刀で使う」）。型の無い技は空
  G.r11Style = (id) => { const st = SK[id] && SK[id].style; return st && st.length ? `${st.join("か")}で使う` : ""; };
  if (K && G.facActions) {
    const fac0 = G.facActions;
    G.facActions = () => {
      const g = fac0();
      const S = G.S;
      if (!S || S.over || S.mode !== "fac") return g;
      g.forEach((grp) => {
        (grp.list || []).forEach((a) => {
          const id = skillOf(a);
          if (!id || !SK[id].style) return;
          const off = !K.styleOk(id, S);
          a.sub = [G.r11Style(id) + (off ? "（今の武器では使えない）" : ""), a.sub].filter(Boolean).join("・");
          if (off) a.off = true;
        });
        // 訓練場：押せない稽古を理由ごとに一行（理由が同じものが二つ以上なら）
        if (!/^教官に稽古/.test(grp.title || "")) return;
        //   能力値が足りない稽古は、技ごとに足りない能力が違うので一行ずつのまま（どの技に何が要るか分かるように）
        const whyOf = (a) => (a.disabled && skillOf(a) && !K.needMiss(skillOf(a), S).length ? K.trainWhy(skillOf(a), S) || "今は選べない" : null);
        const by = new Map();
        grp.list.forEach((a) => { const w = whyOf(a); if (w != null) { if (!by.has(w)) by.set(w, []); by.get(w).push(a); } });
        const out = [];
        let n = 0;
        grp.list.forEach((a) => {
          const w = whyOf(a);
          if (w == null) { if (a.disabled && skillOf(a)) a.locked = true; out.push(a); return; }
          const same = by.get(w);
          if (same.length < 2) { a.locked = true; out.push(a); return; }
          if (same[0] !== a) return;
          out.push({ id: `k1trainlock:${n++}`, label: `${same.map((x) => `「${SK[skillOf(x)].name}」`).join("")}の稽古`, sub: w, disabled: true, locked: true, kw: ["技", "稽古", ...same.map((x) => SK[skillOf(x)].name)] });
        });
        grp.list = out;
      });
      return g;
    };
  }

  // ---------------------------------------------------------------- 低 29：自分に薬草を使う
  const selfItems = (S) => Object.keys(S.inv || {}).filter((id) => { const it = D.ITEMS[id]; return it && it.type === "use" && it.hp && S.inv[id] > 0; });
  const acts0 = G.actions;
  G.actions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S || S.over || S.combat || S.travel || S.b5pick || !(S.mode === "explore" || S.mode === "fac") || S.hp >= S.maxHp) return groups;
    const ids = selfItems(S);
    if (!ids.length) return groups;
    const list = ids.map((id) => ({ id: "b5self:" + id, label: `${D.ITEMS[id].name}を使う（自分に）`, sub: `${S.inv[id]}個・HP ${S.hp}/${S.maxHp}・${D.ITEMS[id].hp > 100 ? "全快" : "HP +" + D.ITEMS[id].hp}`, kw: [D.ITEMS[id].name, "手当", "使う"] }));
    const grp = groups.find((x) => x.title === "仲間の手当て");
    if (grp) grp.list.unshift(...list);
    else groups.push({ title: "手当て", list });
    return groups;
  };
  const act0 = G.act;
  G.act = (id) => {
    if (typeof id === "string" && id.startsWith("b5self:")) {
      const S = G.S;
      if (!S || S.over || S.combat) return;
      const a = G.actions().flatMap((x) => x.list || []).find((x) => x.id === id);
      if (!a || a.disabled) return;
      G.useItem(id.slice(7));
      return;
    }
    return act0(id);
  };
})(globalThis.G = globalThis.G || {});
