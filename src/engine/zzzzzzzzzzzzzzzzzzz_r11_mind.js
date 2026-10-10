// R11：正気を「面白くなる形」にして残す（持ち主の決定。中 18）。仕組みは sanity_m5.js・m13_edge.js のまま、いちばん外から包む。
// - 減るたびに、理由をログに一行（「正気が削れた──使徒「…」を見た（今の心：揺らいでいる）」）。理由は、正気を減らす入口
//   （判定の大失敗・術の借り・術を覚える・出来事・戦いで恐ろしいものを見る・代償つきの品・瀕死・迷宮の深み）を包んで積む
// - 段が深くなったら、戻す手段を一行で案内する（宿で眠る・酒場・教会の懺悔・仲間と話す・家に帰る・旅立った町・景色）
// - 戻す手段を足す：仲間と話す（一日一度）・家に帰る（M10）・旅立った町の宿で眠る（宿より深く戻る）
// - 減り方をそろえる（ボットで十年回して決めた。tests/decade.mjs）：判定の大失敗は -1 に。迷宮の一階ごとの減りは、その迷宮でまだ降りたことの無い深さに着いたときだけ（同じ迷宮を何度も潜って
//   減り続けない。見たことの無いものを見たときだけ減る、という M5 の考えにそろえる）。禁じられた知識（術・魔導書・借り）と
//   呪われた品・使徒はそのまま減る（手を出す人は危うい）
// - 人物の表（G.m5Rows）に、戻す手段の行
// 状態：S.r11m = { deep: { 迷宮 id: いちばん深く降りた階 }, talk: 仲間と話して戻った日, guide: { 段: 日 } }。古いセーブに無くても動く。
// 正気 0 の終わり・崩れかけの入れ替わり・懺悔の決まりは触らない（r11-rules が m13_edge.js を直す）。レーン C（M5）
(function (G) {
  const D = G.data;
  const M5 = D.M5;
  if (!M5 || !G.addSanity || !G.sanityStage) return;
  const T = M5.TOLL;
  const X = (G.r11m = G.r11m || {});
  X.tally = {};                                    // 測定用（セーブには残さない）：理由の種類ごとに減った量
  X.DEEP = T.deeper;                               // 迷宮で、まだ降りたことの無い深さに着いたとき
  T.deeper = 0;                                    // 元の「一階ごと」は止める（sanity_m5.js・w8_explore.js が読む）
  T.fumble = -1;                                   // 判定の大失敗（-2 から。十年で最も多く削っていた。R11 の測定）
  X.TALK = 3;                                      // 仲間と話す（一日一度）
  X.HOME = 15;                                     // 家に帰る（M10）
  X.HOMETOWN = 5;                                  // 旅立った町の宿で眠ると、上乗せ
  X.HOMETOWN_CAP = 95;                             // 旅立った町では、ここまで戻る（ほかの宿は M5.REST_CAP まで）
  X.GUIDE = "心を休めるには：宿で眠る・酒場で飲む・教会で懺悔する・仲間と話す・家に帰る・旅立った町で眠る。見たものは眠っても消えないので、宿と酒場で戻るのは八分ほどまで。";
  X.ROW = ["心を休める", "宿・酒場・教会の懺悔・仲間と話す・家に帰る・旅立った町"];

  const st = (S) => { const r = (S.r11m = S.r11m || {}); r.deep = r.deep || {}; r.guide = r.guide || {}; return r; };
  const word = (S) => (G.m13 && G.m13.word ? G.m13.word(S) : M5.SANITY_WORD[G.sanityStage(G.sanityOf(S))]) || "";

  // ---------------------------------------------------------------- 理由を積む
  // 入口を包んで、その間に起きた減りの理由を積む（入れ子なら内側が勝つ）。理由は { k 種類, t 文 } か、それを返す関数か、その列（順に使う）
  const stack = [];
  const withWhy = (why, fn) => { stack.push(why); try { return fn(); } finally { stack.pop(); } };
  const takeWhy = () => {
    let w = stack[stack.length - 1];
    if (Array.isArray(w)) w = w.length > 1 ? w.shift() : w[0];
    if (typeof w === "function") { try { w = w(); } catch (e) { w = null; } }
    return w || { k: "other", t: "何か良くないものを見た" };
  };
  X.withWhy = withWhy;
  const evTitle = (id) => { const e = id && D.EVENTS.find((x) => x.id === id); return (e && e.title) || "出来事"; };

  let depth = 0;
  const add0 = G.addSanity;
  G.addSanity = (n, quiet, cap) => {
    const S = G.S;
    if (!S || S.over || !n || depth) return add0(n, quiet, cap);
    const why = n < 0 ? takeWhy() : null;
    const a = G.sanityOf(S), sa = G.sanityStage(a);
    depth++;
    let r;
    try { r = add0(n, quiet, cap); } finally { depth--; }
    if (G.S !== S || S.over) return r;
    const b = G.sanityOf(S);
    if (b < a && why) {
      X.tally[why.k] = (X.tally[why.k] || 0) + (b - a);
      G.note(`正気が削れた──${why.t}（今の心：${word(S)}）`);
      const sb = G.sanityStage(b);
      if (sb > sa && sb >= 1) { const g = st(S).guide; if (g[sb] !== S.day) { g[sb] = S.day; G.note(X.GUIDE); } }
    }
    return r;
  };

  // ---------------------------------------------------------------- 入口
  const wrap = (name, whyOf) => {
    const f0 = G[name];
    if (typeof f0 !== "function") return;
    G[name] = (...a) => withWhy(whyOf(...a), () => f0(...a));
  };
  wrap("check", () => ({ k: "fumble", t: "大失敗して、手の震えが止まらない" }));
  wrap("payDebt", () => ({ k: "debt", t: "術の借りを払った" }));
  wrap("learnSpell", (id) => () => ({ k: "learn", t: `術（${(D.SPELLS && D.SPELLS[id] && D.SPELLS[id].name) || "名も知れぬ術"}）を覚えた──知りすぎた` }));
  wrap("startEvent", (ev) => () => ({ k: "event", t: `「${typeof ev === "string" ? evTitle(ev) : (ev && ev.title) || "出来事"}」で見たもの` }));
  wrap("chooseEvent", () => { const id = G.S && G.S.event; return () => ({ k: "event", t: `「${evTitle(id)}」で見たもの` }); });
  wrap("hurt", () => ({ k: "clung", t: "瀕死で踏みとどまり、向こう側をのぞいた" }));
  wrap("combatAct", () => () => { const w = G.weapon && G.weapon(); return { k: "weapon", t: `${(w && w.name) || "武器"}の代償` }; });
  // 戦いで恐ろしいものをはじめて見る（sanity_m5.js と同じ順で、使徒・主・動く死者、そのあと囁く品）
  wrap("startCombat", (ids) => {
    const S = G.S;
    const seen = (S && S.m5 && S.m5.seen) || {};
    const q = [];
    (Array.isArray(ids) ? ids : [ids]).forEach((id) => {
      const e = D.ENEMIES[id];
      if (!e || seen[id]) return;
      if (e.majin) q.push({ k: "majin", t: `使徒「${e.name}」を見た` });
      else if (e.boss) q.push({ k: "boss", t: `「${e.name}」を見た` });
      else if (e.undead) q.push({ k: "undead", t: `動く死者（${e.name}）を見た` });
    });
    const r = G.ring && G.ring();
    if (r && r.toll && r.toll.fight) q.push({ k: "item", t: `${r.name}の囁き` });
    return q.length ? q : { k: "combat", t: "恐ろしいものを見た" };
  });
  // 日ごとの代償（持っているだけで進む品）
  const endTurn0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    const why = () => {
      const ids = new Set([...Object.keys((S && S.inv) || {}), ...(G.i2s ? G.i2s.worn(S) : [S.weapon, S.armor, S.ring])].filter(Boolean));
      const it = [...ids].map((id) => D.ITEMS[id]).find((it) => it && it.toll && it.toll.day && it.toll.day.sanity);
      return { k: "item", t: `呪われた品（${it ? it.name : "持ち物のどれか"}）を持ち歩いている` };
    };
    return S ? withWhy(why, endTurn0) : endTurn0();
  };

  // ---------------------------------------------------------------- 迷宮の深み・戻す手段（町と仲間と家）
  const ex0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (!S) return ex0(head, arg, a);
    const d0 = S.depth || 0, loc = S.loc, day0 = S.day;
    const r = ex0(head, arg, a);
    if (G.S !== S || S.over) return r;
    if (head === "deeper" && S.loc === loc && (S.depth || 0) > d0) {
      const x = st(S);
      if ((S.depth || 0) > (x.deep[loc] || 0)) {
        x.deep[loc] = S.depth;
        const L = D.LOCS[loc] || {};
        withWhy({ k: "deeper", t: `${L.name || "迷宮"}の地下${S.depth}階へ、はじめて降りた` }, () => G.addSanity(X.DEEP, true));
      }
    }
    // 仲間と話す：一日一度、少し戻る
    if (head === "m2talk" && (S.companions || []).length) {
      const x = st(S);
      if (x.talk !== S.day && G.sanityOf(S) < M5.REST_CAP) { x.talk = S.day; G.addSanity(X.TALK, true, M5.REST_CAP); }
    }
    // 旅立った町の宿で眠る：ほかの宿より深く戻る
    if (head === "inn" && arg === "rest" && S.day > day0) {
      const c = D.CLASSES[S.cls];
      if (c && c.start === S.loc && G.sanityOf(S) < X.HOMETOWN_CAP) {
        G.addSanity(X.HOMETOWN, true, X.HOMETOWN_CAP);
        G.note("旅立った町の宿の天井は、見覚えのある染みがあった。少し深く眠れた。");
      }
    }
    return r;
  };
  // 家に帰る（M10）：連れ合いと家のある者だけの、深い休み
  if (G.m10GoHome) {
    const home0 = G.m10GoHome;
    G.m10GoHome = (...a) => {
      const S = G.S;
      const r = home0(...a);
      if (S && G.S === S && !S.over && G.sanityOf(S) < 100) G.addSanity(X.HOME, false, 100);
      return r;
    };
  }

  // ---------------------------------------------------------------- 人物の表：戻す手段の行（心が揺らいでいるときだけ）
  const rows0 = G.m5Rows;
  G.m5Rows = (S) => {
    const rows = rows0 ? rows0(S) : [];
    if (!S || S.over || G.sanityStage(G.sanityOf(S)) < 1) return rows;
    const at = rows.findIndex(([k]) => k === "心の傷" || k === "正気");
    const i = rows.findIndex(([k]) => k === "心の傷");
    rows.splice((i >= 0 ? i : at) + 1, 0, X.ROW.slice());
    return rows;
  };
})(globalThis.G = globalThis.G || {});
