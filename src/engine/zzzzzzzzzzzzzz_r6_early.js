// R6：序盤の難しさ。持ち主の声「作りたての傭兵がゴブリン二匹で HP 26 から 6 まで削られた」「旅立ち直後の 2 日先の道中で C 級の屍の群れに襲われて死んだ」
// 遭遇の表（場所の pool・E4 の e4pool）と戦闘の式は書き換えず、包む：
//   1. 駆け出しのうち（旅立ちから R6.DAYS 日・名声 R6.FAME 未満・危険度 R6.DMAX までの土地）は、出現表から引いた出会い
//      （探索・野営・迷宮・旅の襲撃。勝ったときの結果の付かない戦い）に C 級以上が混じったら、その土地の D 級に替える。
//      E4 の群れ・強い個体・地域の魔物に入れ替えたあとにも同じ篩をかける（D.E4.shape を包む）。出来事の「その場の敵」（@pool）も同じ。
//      旅の出来事（W6）は、C 級以上と戦う出来事を引かない
//   2. 駆け出しのうちに出会った D 級の敵は、まだ人に慣れていない（f.r6）：命中 R6.HIT・傷 R6.DMG 倍。
//      日がたつと（R6.DAYS の間に少しずつ）ふつうの強さに戻る。使徒・ボス・名のある強敵・C 級以上には効かない
// 野の行動の最中かは R6.wild（G.exploreAct・G.w6.next を包む）で覚える。テストが直に呼ぶ G.startCombat は替えない。
// 「判定・戦闘はデータとルールで」の決まりどおり、乱数は G.rand / G.pick だけ。DOM なし。
// セーブに足すもの：S.r6 = { day 旅立った日 }（古いセーブに無ければ、駆け出しの守りは無い）・敵の f.r6（その戦いのあいだの弱め方 0〜1）
(function (G) {
  const D = G.data;
  const R6 = (G.r6 = G.r6 || {});
  R6.DAYS = 30;   // 旅立ちから何日のあいだ守るか（C16：町と町の旅が 1〜3 週間になったので、はじめの旅ひとつ・ふたつのあいだ）
  R6.FAME = 20;   // 名声がこれ以上になったら守らない（名が売れれば、相手も手加減しない）
  R6.DMAX = 3;    // この危険度までの土地だけ（遠くの危ない土地まで行けば、そこの魔物が出る）
  R6.HIT = -15;   // 駆け出しが出会う D 級の命中（％。いちばん早いころ）
  R6.DMG = 0.7;  // 駆け出しが出会う D 級の傷（倍。いちばん早いころ）
  R6.FALLBACK = ["goblin", "wolf", "bandit"];

  const rankOf = (id) => (G.gradeRank && G.gradeOf ? G.gradeRank(G.gradeOf(id)) : 99);
  R6.hard = (id) => !!D.ENEMIES[id] && rankOf(id) <= (G.gradeRank ? G.gradeRank("C") : -1);
  R6.isD = (id) => !!D.ENEMIES[id] && G.gradeOf && G.gradeOf(id) === "D";

  // ---------------------------------------------------------------- 駆け出しか
  // 0（守りなし）〜1（旅立った日）。名声が R6.FAME に届くか、R6.DAYS 日たてば 0
  R6.level = (S) => {
    S = S || G.S;
    if (!S || !S.r6 || S.over) return 0;
    if ((S.fame || 0) >= R6.FAME) return 0;
    const t = (S.day || 1) - (S.r6.day || 1);
    if (t >= R6.DAYS) return 0;
    return Math.max(0, 1 - t / R6.DAYS);
  };
  R6.early = (S) => R6.level(S) > 0;
  // 今いる土地（と旅の行き先）が、駆け出しの守りの届く危険度か
  R6.mild = (S) => {
    S = S || G.S;
    return [S.loc, S.travel].filter(Boolean).every((l) => ((D.LOCS[l] || {}).danger || 0) <= R6.DMAX);
  };
  R6.guard = (S) => { S = S || G.S; return !!S && R6.early(S) && R6.mild(S); };

  // その土地の D 級（今いる場所・旅の行き先・出発地の出現表から。無ければ街道の三種）
  R6.easyPool = (S) => {
    S = S || G.S;
    const ids = [];
    [S.travel, S.loc, S.w6 && S.w6.from].filter(Boolean).forEach((l) => {
      const L = D.LOCS[l] || {};
      [...(L.pool || []), ...(L.e4pool || [])].forEach((id) => { const e = D.ENEMIES[id]; if (e && !e.boss && !e.elderOf && R6.isD(id) && !ids.includes(id)) ids.push(id); });
    });
    return ids.length ? ids : R6.FALLBACK.filter((id) => D.ENEMIES[id]);
  };
  // C 級以上を D 級に替える（同じ敵が並んでいたら、同じ D 級に替えて群れの形を残す）
  R6.tame = (ids, S) => {
    S = S || G.S;
    if (!Array.isArray(ids) || !ids.some(R6.hard)) return ids;
    const pool = R6.easyPool(S);
    const swap = {};
    return ids.map((id) => (R6.hard(id) ? (swap[id] = swap[id] || G.pick(pool)) : id));
  };

  // ---------------------------------------------------------------- 1. 出会い
  // 野の行動（町の外での探索・野営・迷宮・稽古、旅立ち・旅の道中）の最中に始まった戦いだけを、出現表から引いた出会いとして扱う。
  // 町の中の騒ぎ（衛兵・用心棒）、出来事・会話・依頼の名指しの戦いは替えない
  let inWild = 0;
  R6.wild = (fn) => { inWild++; try { return fn(); } finally { inWild--; } };
  const TRAVEL = ["travel", "sail", "w6go"];
  let wild = false;
  const isWild = (S, ids, opt) => {
    const o = opt || {};
    if (!inWild || !S || o.win || o.e4raw || !Array.isArray(ids) || !ids.length) return false;
    if (ids.some((id) => !D.ENEMIES[id] || D.ENEMIES[id].boss || D.ENEMIES[id].majin || (D.W8_FOES && D.W8_FOES[id]))) return false;
    if (S.mode !== "explore") return false;
    if (S.tk && S.tk.cur) return false;
    return true;
  };
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const L = S && D.LOCS[S.loc];
    const out = S && S.mode === "explore" && !S.fac && ((L && L.type !== "town") || TRAVEL.includes(head));
    return out ? R6.wild(() => act0(head, arg, a)) : act0(head, arg, a);
  };
  if (G.w6 && G.w6.next) { const next0 = G.w6.next; G.w6.next = () => R6.wild(next0); }

  if (D.E4 && D.E4.shape) {
    const shape0 = D.E4.shape;
    D.E4.shape = (ids) => { const out = shape0(ids); return wild && R6.guard(G.S) ? R6.tame(out) : out; };
  }

  const start0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    const S = G.S;
    const w = isWild(S, ids, opt) && R6.guard(S);
    const weak = !!S && (isWild(S, ids, opt) || S.mode === "event");
    const prev = wild;
    wild = w;
    let r;
    try { r = start0(w ? R6.tame(ids.slice()) : ids, opt); } finally { wild = prev; }
    // 2. 駆け出しが野や出来事で出会った D 級には、弱め方を覚えておく（その戦いのあいだ）
    const lv = R6.level(S);
    const C = S && S.combat;
    if (weak && lv > 0 && C && !C.boss) C.foes.forEach((f) => { if (R6.isD(f.id) && !f.e3 && !f.e7) f.r6 = Math.round(lv * 100) / 100; });
    return r;
  };

  // 出来事の「その場の敵」
  const resolve0 = G.resolveFoes;
  if (resolve0) G.resolveFoes = (spec) => {
    const out = resolve0(spec);
    const list = Array.isArray(spec) ? spec : [spec];
    if (!list.includes("@pool") || !R6.guard(G.S)) return out;
    return out.map((id, i) => (list[i] === "@pool" && R6.hard(id) ? G.pick(R6.easyPool(G.S)) : id));
  };

  // 旅の出来事：駆け出しのうちは、C 級以上と戦う出来事を引かない
  const fightsOf = (e) => {
    const out = [];
    const add = (f) => { if (f) out.push(...(Array.isArray(f) ? f : [f])); };
    (e.choices || []).forEach((c) => { add(c.fight); add(c.ok && c.ok.fight); add(c.ng && c.ng.fight); });
    return out;
  };
  R6.hardEvent = (e) => fightsOf(e).some((id) => id !== "@pool" && R6.hard(id));
  if (G.w6 && G.w6.pool) {
    const pool0 = G.w6.pool;
    G.w6.pool = (S) => { const p = pool0(S); return R6.guard(S) ? p.filter((e) => !R6.hardEvent(e)) : p; };
  }

  // ---------------------------------------------------------------- 2. D 級の強さ
  const fd0 = G.foeData;
  G.foeData = (f) => {
    const e = fd0(f);
    if (!f || !f.r6 || !e) return e;
    const k = f.r6;
    const mul = 1 - (1 - R6.DMG) * k;
    return Object.assign({}, e, { hit: Math.round(e.hit + R6.HIT * k), r6mul: mul });
  };
  // 傷は G.cbHurtMod（E12b）の後ろで倍にする（端数は切り上げ・最低 1）
  const hurt0 = G.cbHurtMod;
  G.cbHurtMod = (f, e, dmg, mv) => {
    const d = hurt0 ? hurt0(f, e, dmg, mv) : dmg;
    if (!f || !f.r6 || !e || !e.r6mul) return d;
    return Math.max(1, Math.ceil(d * e.r6mul));
  };

  // ---------------------------------------------------------------- 新しい冒険
  const newGame0 = G.newGame;
  G.newGame = (opt) => {
    const S = newGame0(opt);
    const s = S || G.S;
    if (s) s.r6 = { day: s.day || 1 };
    return S;
  };
})(globalThis.G = globalThis.G || {});
