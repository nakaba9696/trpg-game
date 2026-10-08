// W10：山に登る。持ち主の声「冒険といえばダンジョン、山、森、遺跡、きれいな景色」。山の場所は src/data/locations_zw10.js（L.w10 のある荒野）
// 山は荒野（type "wild"）のまま、麓の上に段を重ねる：0 麓 → 1 峠 → 2 山小屋 → 3 尾根 → 4 山頂。迷宮の depth / floors は使わない
// （迷宮の処理は W11 の担当。山の段は迷宮の「地下」「主」「迷宮の出来事」と混ざらないよう、別の状態 S.w10 に持つ）。explore.js は書き換えず、
// G.exploreActions・G.exploreAct・G.arrive を包む
//   麓（段 0）：いつもの荒野の行動（探索・野営・旅）に「山道を登る」が一つ足される
//   段 1〜4：旅には出られない。登る・下りる・麓まで一気に下りる・休む（山小屋はただで全快、ほかの段は岩陰で野営）・山頂で景色を眺める
//   登るたびに：天候（霧・雪で道に迷う）→ 落石 → 高さの寒さ → 山頂なら景色、でなければ その段の敵（L.w10.pools）・山の出来事・何もなし
//   天候は G.skyAt に高さを足す（尾根から上は雨が雪に、冬は晴れでも雪が舞う。山小屋から上は晴れでも霧が湧く日がある。日と段で決まる）
//   山頂：はじめて立ったときだけ山場の文（D.W10_PEAKS[場所] の arrive → 晴れた朝昼は vista・ほかは景色の文 → after）と小さな発見（first）・手引きの一行。景色の文は天候 → 季節 → 時間帯で選ぶ（A11 と同じ）
// 出来事：D.EVENTS に where: ["w10"]・w: 0（ふつうの抽選に出さない）と w10: { loc [場所], min, max 段, weather [天候] } を付けて置く（src/data/events_w10.js）
// セーブに足すもの：S.w10 = { loc, stage, peaks: {場所: はじめて立った日}, sight: 眺めた日, recent: [出来事] }。古いセーブに無くても動く（W10.st が作る）
// 乱数は G.rand / G.d / G.pick だけ。DOM には触らない。レーン W（W10）
(function (G) {
  const D = G.data;
  const W = (G.w10 = G.w10 || {});
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  W.TOP = 4;          // 山頂の段
  W.HUT = 2;          // 山小屋の段
  W.STAGES = ["麓", "峠", "山小屋", "尾根", "山頂"];
  W.DIFF = ["易しい", "易しい", "普通", "普通", "難しい"]; // 段ごとの判定の難しさ（場所の危険度の上乗せは G.s5EventDiff が足す）
  W.FIGHT = 0.35;     // 登ったときに戦いになる割合
  W.EVENT = 0.35;     // 登ったときに山の出来事が起きる割合（戦いでなかったとき）
  W.SANITY = 3;       // 景色を眺めると戻る正気
  W.RECENT = 5;

  W.mountOf = (id) => { const L = D.LOCS[id]; return L && L.w10 ? L : null; };
  W.st = (S) => {
    S = S || G.S;
    const w = (S.w10 = S.w10 || {});
    w.loc = w.loc || "";
    w.stage = w.stage | 0;
    w.peaks = w.peaks || {};
    w.recent = w.recent || [];
    return w;
  };
  // 今の段（山でなければ、または別の山の段が残っていれば 0）
  W.stage = (S) => {
    S = S || G.S;
    return S && S.w10 && W.mountOf(S.loc) && S.w10.loc === S.loc ? S.w10.stage | 0 : 0;
  };
  W.setStage = (S, n) => { const w = W.st(S); w.loc = S.loc; w.stage = Math.max(0, Math.min(W.TOP, n)); };
  W.name = (L, n) => ((L.w10 && L.w10.names) || [])[n] || W.STAGES[n];
  W.climbing = (S) => W.stage(S) > 0;

  // ---------------------------------------------------------------- 高さの空と寒さ
  // 日と段から決まる 0〜1（同じ日・同じ段なら何度見ても同じ。G.rand は使わない）
  W.hash = (S, k) => {
    let x = (((S.wseed || 7) | 0) ^ Math.imul(S.day | 0, 2654435761) ^ Math.imul(k | 0, 40503)) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995) >>> 0; x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  };
  W.sky = (S) => {
    S = S || G.S;
    const base = G.skyAt ? G.skyAt(S.loc, S.day) : { season: "", weather: "晴" };
    const n = W.stage(S);
    let w = base.weather || "晴";
    if (n >= 3 && w === "雨") w = "雪";
    if (n >= 3 && base.season === "冬" && w === "晴" && W.hash(S, n) < 0.3) w = "雪";
    if (n >= W.HUT && w === "晴" && W.hash(S, n + 10) < 0.2) w = "霧";
    return { season: base.season || "", weather: w };
  };
  // 寒さの強さ：段＋山の底上げ＋冬・夜・雪。3 から体にこたえる
  W.cold = (S) => {
    S = S || G.S;
    const L = W.mountOf(S.loc);
    if (!L) return 0;
    const n = W.stage(S), sky = W.sky(S);
    return n + (L.w10.cold || 0) + (sky.season === "冬" ? 1 : 0) + ((S.phase | 0) === 3 ? 1 : 0) + (sky.weather === "雪" ? 1 : 0);
  };
  const diff = (n) => (G.s5EventDiff ? G.s5EventDiff(W.DIFF[n] || "普通") : W.DIFF[n] || "普通");
  W.skyNote = (S) => {
    const sky = W.sky(S), c = W.cold(S);
    const t = [];
    if (sky.weather === "霧") t.push("霧が出ている");
    else if (sky.weather === "雪") t.push("雪が舞っている");
    else if (sky.weather === "雨") t.push("雨");
    if (c >= 5) t.push("凍えるほど寒い");
    else if (c >= 3) t.push("寒い");
    return t.join("・");
  };

  // ---------------------------------------------------------------- 山の難所
  const LOST = {
    霧: ["霧が斜面を這い上がってきた。数歩先の岩が白く溶け、道標の石積みがどこにあったか分からなくなる。"],
    雪: ["雪が横から吹きつけてきた。踏み跡が見る間に埋まり、どちらが上かも怪しくなる。"],
    晴: ["分かれ道に出た。どちらにも踏み跡があり、どちらにも山羊の糞が落ちている。"],
  };
  function lost(S, L, n, to, sky) {
    const p = sky.weather === "霧" ? 0.4 : sky.weather === "雪" ? 0.2 : 0.06;
    if (G.rand() >= p) return false;
    G.say(G.pick(LOST[sky.weather] || LOST.晴));
    const r = G.check("知力", diff(to), "道を見失わずに進む");
    if (r.ok) { G.say(G.pick(["風の向きと岩の苔の付き方で、上がどちらか分かった。踏み跡を拾い直して進む。", "足もとの小石に、誰かが刻んだ矢印を見つけた。それをたどる。"])); return false; }
    G.pass(1);
    if (n > 0 && G.rand() < 0.5) {
      W.setStage(S, n - 1);
      G.say(`歩き回るうちに、気づけば下りていた。${W.name(L, n - 1)}まで戻ってしまった。`);
    } else G.say("同じ岩の前に三度出た。日が傾くまで歩き回って、結局もとの場所に戻った。");
    G.memo(`${L.name}は、霧や雪の日に道を見失いやすい`);
    return true;
  }
  W.rockfall = (S, L, to) => {
    G.say(G.pick(["頭の上で、からん、と乾いた音がした。続けてごろごろと重い音。石が落ちてくる。", "斜面の上で何かが崩れた。拳ほどの石が跳ねながら降ってくる。"]));
    const r = G.check("敏捷", diff(to), "落石をかわす");
    if (r.ok) { G.say("岩陰に飛びこんだ。石は背中のすぐ後ろを転がり落ちていった。"); return; }
    const dmg = G.d(4) + to + (L.danger || 0);
    G.say("肩を石にしたたかに打たれた。");
    G.note(`HP -${dmg}`);
    G.hurt(dmg, `${L.name}で落石に打たれた`);
  };
  W.chill = (S, L) => {
    const c = W.cold(S);
    if (c < 3) return;
    const r = G.check("体力", c >= 5 ? diff(4) : diff(2), "寒さに耐える");
    if (r.ok) return;
    const dmg = 1 + G.d(Math.max(2, c));
    G.say(c >= 5 ? "風が外套を通り抜け、指先の感覚が無くなった。歯が勝手に鳴る。" : "汗が冷えて、体の芯まで寒さが染みた。");
    G.note(`HP -${dmg}`);
    G.hurt(dmg, `${L.name}で凍えた`);
  };

  // ---------------------------------------------------------------- 敵と出来事
  W.foes = (L, n) => {
    const pool = (((L.w10.pools || [])[n] || L.pool || []).filter((id) => D.ENEMIES[id] && !D.ENEMIES[id].boss));
    if (!pool.length) return [G.pick(L.pool || ["wolf"])];
    const two = G.rand() < 0.25 + 0.05 * n + 0.03 * (L.danger || 0);
    return two ? [G.pick(pool), G.pick(pool)] : [G.pick(pool)];
  };
  W.fits = (e, S, n, sky) => {
    const r = e.w10;
    if (!r) return false;
    if (r.loc && !as(r.loc).includes(S.loc)) return false;
    if (r.min != null && n < r.min) return false;
    if (r.max != null && n > r.max) return false;
    if (r.weather && !as(r.weather).includes(sky.weather)) return false;
    if (e.once && S.flags["ev:" + e.id]) return false;
    if (e.cond && !e.cond(S)) return false;
    return true;
  };
  W.pickEvent = (S, n) => {
    const sky = W.sky(S), st = W.st(S);
    let pool = D.EVENTS.filter((e) => e.w10 && W.fits(e, S, n, sky));
    const fresh = pool.filter((e) => !st.recent.includes(e.id));
    if (fresh.length) pool = fresh;
    if (!pool.length) return null;
    let r = G.rand() * pool.reduce((a, e) => a + (e.w10.w || 1), 0);
    let e = pool[pool.length - 1];
    for (const x of pool) { r -= x.w10.w || 1; if (r <= 0) { e = x; break; } }
    st.recent = st.recent.filter((x) => x !== e.id);
    st.recent.push(e.id);
    if (st.recent.length > W.RECENT) st.recent.shift();
    return e;
  };

  // ---------------------------------------------------------------- 登る・下りる・休む
  W.up = () => {
    const S = G.S, L = G.loc(), n = W.stage(S), to = n + 1;
    if (!L.w10 || to > W.TOP) return;
    G.log("you", n ? `${W.name(L, to)}へ登る` : "山道を登りはじめる");
    G.pass(1);
    const sky = W.sky(S);
    if (lost(S, L, n, to, sky)) return;
    W.setStage(S, to);
    G.log("title", `${L.name}・${W.name(L, to)}`);
    const say = (L.w10.say || [])[to];
    if (say && say.length && !(to === W.TOP && !W.st(S).peaks[S.loc])) G.say(G.pick(say));
    const rockP = (to === 1 || to === 3 ? 0.18 : 0.08) + (sky.weather === "雪" || sky.weather === "雨" ? 0.08 : 0);
    if (G.rand() < rockP) W.rockfall(S, L, to);
    if (S.over) return;
    W.chill(S, L);
    if (S.over) return;
    if (to >= W.TOP) { W.summit(S, L); return; }
    const r = G.rand();
    if (r < W.FIGHT) { G.startCombat(W.foes(L, to), {}); return; }
    if (r < W.FIGHT + W.EVENT) { const e = W.pickEvent(S, to); if (e) { G.startEvent(e); return; } }
    G.say(G.pick(L.w10.quiet || ["黙々と登る。"]));
  };
  W.down = (all) => {
    const S = G.S, L = G.loc(), n = W.stage(S);
    if (!n) return;
    const to = all ? 0 : n - 1;
    G.log("you", all ? "麓まで一気に下りる" : `${W.name(L, to)}へ下りる`);
    G.pass(all ? 2 : 1);
    W.setStage(S, to);
    G.log("title", `${L.name}・${W.name(L, to)}`);
    if (all) {
      // 急ぎの下りは足もとが危ない
      if (G.rand() < 0.3 + 0.05 * n) {
        G.say("急ぎすぎた。ざれた斜面で足が流れる。");
        const r = G.check("敏捷", diff(n), "滑らずに下りる");
        if (!r.ok) { const dmg = G.d(4) + n; G.say("尻から滑り落ちて、岩に腰を打ちつけた。"); G.note(`HP -${dmg}`); G.hurt(dmg, `${L.name}で足を滑らせた`); }
        else G.say("踏ん張った。小石だけが音を立てて谷へ落ちていった。");
      } else G.say("つづら折りの道を駆け下りる。登りに半日かけた道が、下りでは足が勝手に進む。");
      return;
    }
    if (G.rand() < 0.15) { G.startCombat(W.foes(L, Math.max(1, to)), {}); return; }
    G.say(G.pick(["登ってきた道を下る。登りでは気づかなかった花が、岩陰に咲いていた。", "膝が笑う。下りのほうがきつい、と山羊飼いが言っていたのを思い出した。"]));
  };
  W.rest = () => {
    const S = G.S, L = G.loc(), n = W.stage(S);
    if (!n) return;
    if (n === W.HUT) {
      G.log("you", "山小屋で休む");
      G.sleep();
      S.clungUsed = false;
      S.hp = S.maxHp;
      S.mp = S.maxMp;
      G.say(G.pick([
        "石の壁の内側で、乾いた薪に火を入れた。外で風がうなっている。毛布にくるまると、すぐに眠りに落ちた。",
        "小屋の棚に、前の誰かが置いていった乾いた薪と塩の壺があった。あなたも、使ったぶんの薪を集めて棚に戻しておいた。",
      ]));
      G.note("HP と MP が全快した。");
      if (G.rand() < 0.35) { const e = W.pickEvent(S, n); if (e && e.w10.hut) { G.startEvent(e); return; } }
      return;
    }
    G.log("you", "岩陰で野営する");
    G.sleep();
    S.clungUsed = false;
    G.heal(Math.ceil(S.maxHp * 0.4));
    S.mp = S.maxMp;
    G.say("風の当たらない岩陰を見つけて、外套にくるまった。眠りは浅い。");
    G.note("HP が少し回復し、MP が全快した。");
    W.chill(S, L);
    if (S.over) return;
    if (G.rand() < 0.15 + 0.05 * n) { G.say("岩を踏む足音で目が覚めた。"); G.startCombat(W.foes(L, n), {}); }
  };

  // ---------------------------------------------------------------- 山頂
  W.lines = (P, S) => {
    const sky = W.sky(S);
    const w = P.weather && P.weather[sky.weather];
    if (w && w.length) return w;
    const s = P.season && P.season[sky.season];
    if (s && s.length && sky.weather === "晴") return s;
    return P.phase[S.phase | 0] || P.phase[1];
  };
  W.summit = (S, L) => {
    const P = (D.W10_PEAKS || {})[S.loc];
    const st = W.st(S);
    if (!P) { G.say("山頂に着いた。"); return; }
    if (!st.peaks[S.loc]) {
      st.peaks[S.loc] = S.day;
      st.sight = S.day;
      G.log("title", `${L.name}の頂`, { peak: true });
      G.log("nar", P.arrive, { peak: true });
      const sky = W.sky(S);
      G.log("nar", P.vista && sky.weather === "晴" && (S.phase | 0) <= 1 ? P.vista : G.pick(W.lines(P, S)), { peak: true });
      if (P.after) G.log("nar", P.after, { peak: true });
      if (P.first) {
        G.say(P.first.text);
        if (P.first.lore && G.openLore) G.openLore(P.first.lore);
        if (P.first.item) { if (G.give(P.first.item)) G.note(`${G.itemInfo(P.first.item).name}を手に入れた。`); }
        if (P.first.memo) G.memo(P.first.memo);
      }
      G.chron(`${L.name}の頂に立つ`, "travel");
      if (G.addFame) { G.addFame(P.fame || 2); G.note(`名声 +${P.fame || 2}`); }
      if (G.addSanity) G.addSanity(W.SANITY * 2);
      return;
    }
    G.say(G.pick(P.again || ["山頂に着いた。風が強い。"]));
  };
  W.view = () => {
    const S = G.S, L = G.loc();
    const P = (D.W10_PEAKS || {})[S.loc];
    if (!P || W.stage(S) !== W.TOP) return;
    const st = W.st(S);
    if (st.sight === S.day) return;
    st.sight = S.day;
    G.log("you", P.label);
    G.say(G.pick(W.lines(P, S)));
    if (G.addSanity) G.addSanity(W.SANITY);
    G.pass(1);
  };

  // ---------------------------------------------------------------- 行動
  const actions0 = G.exploreActions;
  G.exploreActions = () => {
    const S = G.S;
    const groups = actions0();
    const L = G.loc && G.loc();
    if (!L || !L.w10 || S.mode !== "explore" || S.travel) return groups;
    const n = W.stage(S);
    const note = W.skyNote(S);
    const upSub = (to) => [`危険度 ${(L.danger || 0) + Math.floor(to / 2)}`, note].filter(Boolean).join("・");
    if (!n) {
      const g = groups.find((x) => (x.list || []).some((a) => a.id === "explore")) || groups[0];
      if (g && g.list) g.list.push({ id: "w10up", label: "山道を登る", sub: `${W.name(L, 1)}へ・${upSub(1)}`, kw: ["登", "山", "峠"] });
      return groups;
    }
    // 登っている間は旅に出られず、荒野の探索・野営も山の行動に置き換える
    const DROP = /^(explore|camp|travel|sail)(:|$)/;
    const rest = groups.map((g) => Object.assign({}, g, { list: (g.list || []).filter((a) => !DROP.test(a.id)) }))
      .filter((g) => g.list.length && g.title !== "旅立つ");
    const list = [];
    if (n < W.TOP) list.push({ id: "w10up", label: `${W.name(L, n + 1)}へ登る`, sub: upSub(n + 1), kw: ["登", "上", "進"] });
    if (n === W.TOP) {
      const P = (D.W10_PEAKS || {})[S.loc];
      const seen = W.st(S).sight === S.day;
      if (P) list.push({ id: "w10view", label: P.label, sub: seen ? "今日はもう眺めた" : "気が晴れる", disabled: seen, kw: ["景色", "眺め", "山頂"] });
    }
    if (n === W.HUT) list.push({ id: "w10rest", label: "山小屋で休む", sub: "HP と MP が全快", kw: ["休", "泊", "寝", "小屋"] });
    else list.push({ id: "w10rest", label: "岩陰で野営する", sub: "HP 少し・MP 全快・冷える", kw: ["野営", "休", "寝"] });
    list.push({ id: "w10down", label: `${W.name(L, n - 1)}へ下りる`, sub: "", kw: ["下", "戻", "引き返"] });
    if (n >= 2) list.push({ id: "w10foot", label: "麓まで一気に下りる", sub: "足もとに注意", kw: ["麓", "下山", "下りる"] });
    return [{ title: `${L.name}（${W.name(L, n)}）`, list }, ...rest];
  };

  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    switch (head) {
      case "w10up": return W.up();
      case "w10down": return W.down(false);
      case "w10foot": return W.down(true);
      case "w10rest": return W.rest();
      case "w10view": return W.view();
      default: return act0(head, arg, a);
    }
  };

  // 別の場所に着いたら段は消える（旅は麓からしか出られないが、出来事や依頼で飛ばされたときのため）
  const arrive0 = G.arrive;
  G.arrive = (dest) => {
    const S = G.S;
    if (S && S.w10) { S.w10.stage = 0; S.w10.loc = ""; }
    return arrive0(dest);
  };
})(globalThis.G = globalThis.G || {});
