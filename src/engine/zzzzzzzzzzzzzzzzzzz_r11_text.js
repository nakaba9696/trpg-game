// R11（文章の直し）の仕組み側。データ側は src/data/r11_text.js。
(function (G) {
  const D = G.data;
  const Q5 = G.q5;
  // 中 11：依頼人からの言伝は、町の外では「宿の前で待っていた子ども」の文を使わない（二つ目の早馬の伝言だけ）
  if (Q5 && Q5.scene) {
    const orig = Q5.scene;
    Q5.scene = (q, cur) => {
      const S = G.S, L = S && D.LOCS[S.loc];
      if (cur && cur.sc === "mid" && cur.key === "extend" && L && L.type !== "town") return orig(q, Object.assign({}, cur, { t: 1 }));
      return orig(q, cur);
    };
  }

  // 低 18：語りの一行（戦いの終わりなど）は、前に出したのと同じ文を続けて出さない（乱数は使わない）
  if (G.voiceLine) {
    const line1 = G.voiceLine;
    G.voiceLine = (kind, vars, fallback) => {
      const S = G.S;
      const first = line1(kind, vars, fallback);
      if (!S || !first || first === fallback) return first;
      const last = (S.r11vl = S.r11vl || {});
      let out = first;
      if (last[kind] === first) {
        const t0 = S.turn || 0;
        for (let i = 1; i <= 6 && out === last[kind]; i++) { S.turn = t0 + i; out = line1(kind, vars, fallback); }
        S.turn = t0;
      }
      last[kind] = out;
      return out;
    };
  }

  // 低 23：戦闘中の敵の気配の文は、同じ敵が続けて同じ文にならないようにする
  const F1 = G.f1;
  if (F1 && F1.tellText) {
    const tell1 = F1.tellText;
    F1.tellText = (f, k) => {
      let out = tell1(f, k);
      if (f.r11tell === out) {
        // 選び直しは本物の乱数を使わない（テストの乱数の並びを変えない）
        const r0 = G.rand;
        let c = 0.13;
        G.rand = () => (c = (c + 0.382) % 1);
        try { for (let i = 0; i < 6 && f.r11tell === out; i++) out = tell1(f, k); } finally { G.rand = r0; }
      }
      f.r11tell = out;
      return out;
    };
  }
})(globalThis.G = globalThis.G || {});
