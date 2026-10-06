// R4：選んだことが返ってきたとき（F4。src/engine/zzzzzzzzz_echo_f4.js）、年表に一行残す。
// F4 は出来事に echoChron があるときだけ年表に書く（今は F2b の因縁の続きだけ）。それ以外の返りの出来事は、記録には「あのときの…」の一文が出るが、
// 年表・墓碑・人生の物語には残らなかった。覚えの名（D.ECHO_KEYS の name）と町の名から、決まった形の一行を作る（文は src/data/r4_echo.js）。
// G.startEvent を包むだけ。覚えが返った（その鍵の覚えに、この出来事で done が付いた）ときだけ書く。乱数なし・セーブに足すもの無し・DOM なし。レーン C＋V（R4）
(function (G) {
  const D = G.data;
  const start0 = G.startEvent;
  if (!start0 || !G.echo) return;
  const place = (id) => (G.echo.placeName ? G.echo.placeName(id) : id && D.LOCS[id] ? D.LOCS[id].name : "");
  G.startEvent = (ev) => {
    const S = G.S;
    const e = typeof ev === "string" ? D.EVENTS.find((x) => x.id === ev) : ev;
    const key = e && e.echo && !e.echoChron && S && S.echo && Array.isArray(S.echo.marks) ? e.echo : "";
    const open = key ? S.echo.marks.filter((m) => m && m.k === key && !m.done) : [];
    const r = start0(ev);
    const T = D.R4_ECHO_CHRON, K = (D.ECHO_KEYS || {})[key];
    const m = open.find((x) => x.done);
    if (m && T && K && K.name && G.S === S) {
      const here = place(S.loc), at = place(m.loc);
      G.chron((at && at !== here ? T.far : T.here).replace("{at}", at).replace("{here}", here).replace("{name}", K.name));
    }
    return r;
  };
})(globalThis.G = globalThis.G || {});
