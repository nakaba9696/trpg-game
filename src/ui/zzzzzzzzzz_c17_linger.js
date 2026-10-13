// C17（issue #157 の持ち主の決定）：出来事の結果の場面でも、次の行動まで立ち絵を残して表情を見せる（PC・スマホ）。
// 出来事のあいだに立っていた人（G.stand.whoOf が返した人）を覚えておき、出来事が結果で終わったあと、
// エンジンの G.c17Linger(S)（src/engine/zzzzzzzzzzzzzzzzzzzzzzz_c17_decisions.js）が「さっきの出来事」を返すあいだは、その人を返す。
// 表情は G.moodOf が結果の表情を返すので、V8 の差し替え（v8_moods.js）がそのまま効く。次の行動・戦闘・次の出来事・移動で下がる。
// 出来事のあいだに立たなかった人（話していない人・魔物）は残さない。V5・V9・U11 のファイルは書き換えず、G.stand.whoOf を包むだけ。レーン U
(function (G) {
  const st = G.stand;
  if (!st || !st.whoOf || st.whoOf.c17) return;
  const base = st.whoOf;
  let seen = null; // { ev, who }：出来事のあいだに立っていた人
  st.whoOf = (S) => {
    const who = base(S);
    if (S && S.mode === "event" && S.event && !S.combat) {
      if (who) seen = { ev: S.event, who };
      else if (seen && seen.ev !== S.event) seen = null;
      return who;
    }
    if (who || !S) return who;
    const L = G.c17Linger ? G.c17Linger(S) : null;
    return L && seen && seen.ev === L.ev ? seen.who : null;
  };
  st.whoOf.c17 = true;
  st.whoOf.u11 = base.u11;
})(globalThis.G = globalThis.G || {});
