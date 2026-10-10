// R11（時間の進み）：C16 で旅が 1〜3 週間・野と迷宮が一手一日になったのに、前の時間のままだった仕組みを合わせる（R10 の報告書 高 3・中 8・中 9）
//   1. ギルドの依頼（Q5）の期限：仕事の日数（D.Q5.TYPES の days）は前の時間（探索が四分の一日）のままだったので、
//      野・迷宮の依頼は R11.WORK 倍にして「現場で探索 20 回ほど」いられるようにする。町の依頼は R11.WORK_TOWN 倍
//      （町の中の時間はほとんど進まないが、いくつか受けて野へ一つ片づけに出ると、一手一日で町の依頼が切れていたため）。
//      討伐（hunt）は、二体なら一体ぶん日数を足す。期限 = 仕事の日数 + 行き帰りの本当の日数（今まで通り）
//      討伐の依頼の場所を探索・進んで戦いになったら、ときどき相手が依頼の魔物になる（R11.HUNT。跡を追っている）
//      期限が近い（あと R11.SOON 日まで）依頼は、依頼の窓で目立たせ、旅立つの札の印に「急ぎ」と添える（画面は ui/zzzzzzzzz_r11_pace.js）
//   2. 旅の出来事（W6）の数：道のり（1〜4）ではなく日数で決める（期待値 = 日数 ÷ 4。7 日で 1〜2 件、19 日で 4〜5 件）。上限 R11.TRIP_MAX。襲撃の割合は今まで通り
//   3. 世の大事（M12）の間隔：60〜90 日に一件（G.m12.GAP）。同時に進むのは 3 件まで（G.m12.MAX_ON）。古いセーブで次の大事がそれより先なら、縮める
//   4. 季節の催しの噂（V13 の season の組）：噂の欄に「続きがありそうな所：麦の都グランベール（春のうち）」と、催しの名と季節を出し、旅立つの札にも◆
//      噂の文には町の名を書かない決まり（V13）は変えず、噂の欄の手がかりと印にだけ出す。済んだ催しは印を外す
// セーブに足すもの：S.q17r.list の一件に fest（季節の催しの組の id）・r11（調べ済み）。古いセーブで無くても動く（その場で調べる）。
// 乱数は G.rand だけ（1 の討伐の相手だけで使う）。DOM なし。レーン F＋W＋V（R11）
(function (G) {
  const D = G.data;
  const R11 = (G.r11 = G.r11 || {});
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const locName = (id) => (G.placeName ? G.placeName(id) : id && D.LOCS[id] ? D.LOCS[id].name : "");

  R11.WORK = 3;       // 野・迷宮の依頼の仕事の日数の倍率
  R11.WORK_TOWN = 2;  // 町の依頼の仕事の日数の倍率
  R11.HUNT_MORE = 6;  // 討伐で倒す数が一つ増えるごとに足す日数
  R11.SOON = 3;       // 期限まであと何日で「期限が近い」にするか
  R11.HUNT = 0.4;     // 討伐の依頼の場所の戦いで、相手が依頼の魔物になる見込み
  R11.TRIP_DAYS = 4;  // 旅の出来事が一件起きる日数（陸路）
  R11.SEA_DAYS = 5;   // 船旅
  R11.TRIP_MAX = 5;   // 一つの旅の出来事の上限（襲撃を含む）
  R11.M12_GAP = [60, 90];
  R11.M12_MAX_ON = 3; // 同時に進む世の大事の上限（大事は一件が二、三か月続くので、2 のままだと間隔を縮めても始まれない日が多い）

  // ---------------------------------------------------------------- 1. 依頼の期限
  const Q5 = G.q5;
  R11.workDays = (t, q) => {
    const L = D.LOCS[q.loc] || {};
    if (!t) return 0;
    if (L.type === "town") return t.days * R11.WORK_TOWN;
    return t.days * R11.WORK + (t.mech === "hunt" ? R11.HUNT_MORE * Math.max(0, (q.need || 1) - 1) : 0);
  };
  if (Q5 && Q5.make) {
    const make0 = Q5.make;
    Q5.make = (t, S, o) => {
      const q = make0(t, S, o);
      if (!q || !t) return q;
      const real = ((o && o.realDist) || Q5.distFrom(S.loc, true))[q.loc] || 0;
      q.dur = Math.max(3, R11.workDays(t, q) + real * 2);
      return q;
    };
  }
  if (G.q7) G.q7.SOON = R11.SOON;
  R11.soon = (q, S) => {
    if (!q || q.done || q.deadline == null) return false;
    const left = q.deadline - (S || G.S).day;
    return left >= 0 && left <= R11.SOON;
  };
  // 旅立つの札の印：期限が近い依頼は「急ぎ」と添える（Q5 の「（あと n日）」のあと）
  if (G.questWays) {
    const ways0 = G.questWays;
    G.questWays = (S) => ways0(S).map((w) => (w.q && w.q.q5 && R11.soon(w.q, S) ? Object.assign({}, w, { why: `${w.why}・急ぎ` }) : w));
  }
  // 討伐の依頼の場所で戦いになったら、ときどき相手が依頼の魔物
  let walking = false;
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "explore" && head !== "deeper") return act0(head, arg, a);
    walking = true;
    try { return act0(head, arg, a); } finally { walking = false; }
  };
  const combat0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    const S = G.S;
    if (walking && S && !S.travel && Array.isArray(ids) && ids.length && !(opt && opt.after)) {
      const L = D.LOCS[S.loc] || {};
      const q = (S.quests || []).find((x) => x && x.q5 && x.type === "hunt" && !x.done && x.loc === S.loc && D.ENEMIES[x.target]);
      if (q && !ids.includes(q.target) && ids.every((id) => (L.pool || []).includes(id)) && G.rand() < R11.HUNT) {
        ids = [q.target, ...ids.slice(1)];
      }
    }
    return combat0(ids, opt);
  };

  // ---------------------------------------------------------------- 2. 旅の出来事の数
  const W6 = G.w6;
  if (W6 && W6.start && W6.count) {
    let tripDays = null;
    const start0 = W6.start, count0 = W6.count;
    W6.MAX = R11.TRIP_MAX;
    R11.tripExpect = (days, danger, sea) => (sea ? days / R11.SEA_DAYS : days / R11.TRIP_DAYS + 0.05 * (danger || 0));
    W6.start = (dest, days, cost) => {
      tripDays = days;
      try { return start0(dest, days, cost); } finally { tripDays = null; }
    };
    W6.count = (legs, danger, sea) => {
      if (tripDays == null) return count0(legs, danger, sea);
      const e = Math.min(R11.TRIP_MAX, R11.tripExpect(tripDays, danger, sea));
      const n = Math.floor(e);
      return Math.min(R11.TRIP_MAX, n + (G.rand() < e - n ? 1 : 0));
    };
  }

  // ---------------------------------------------------------------- 3. 世の大事の間隔
  if (G.m12) {
    G.m12.GAP = R11.M12_GAP.slice();
    G.m12.MAX_ON = R11.M12_MAX_ON;
    const end0 = G.endTurn;
    G.endTurn = () => {
      const S = G.S;
      const W = S && S.m12;
      if (W && W.next && typeof S.day === "number" && W.next > S.day + G.m12.GAP[1]) W.next = S.day + G.m12.GAP[1];
      return end0();
    };
  }

  // ---------------------------------------------------------------- 4. 季節の催しの噂
  const seasonSets = () => as(D.V13 && D.V13.LEADS).filter((s) => s.kind === "season");
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let res = null;
  const patterns = () => {
    if (res) return res;
    res = [];
    seasonSets().forEach((set) => as(set.leads).forEach((l) => {
      const body = String(l.text || "").replace(/^「(.*)」$/, "$1");
      res.push({ set, re: new RegExp("^" + esc(body).replace(/\\\{n\\\}/g, ".+?") + "$") });
    }));
    return res;
  };
  R11.festOf = (text) => { const p = patterns().find((x) => x.re.test(String(text || ""))); return p ? p.set : null; };
  R11.festSet = (id) => seasonSets().find((s) => s.id === id) || null;
  R11.festEvent = (set) => (D.EVENTS || []).find((e) => e.id === set.ev) || null;
  R11.festDone = (set, S) => { const e = R11.festEvent(set); return !!(e && e.once && S.flags && S.flags["ev:" + e.id]); };
  R11.festName = (set) => { const e = R11.festEvent(set); return (e && e.title) || "季節の催し"; };
  R11.festWhen = (set, S) => (G.seasonOf && G.seasonOf(S.day || 1) === set.season ? `${set.season}のうち` : `次の${set.season}`);
  // 噂の箱に、季節の催しの組を覚えさせる（一度だけ調べる）
  R11.tagRumors = (S) => {
    const st = G.q17 && G.q17.rumorStore ? G.q17.rumorStore(S) : null;
    if (!st) return null;
    st.list.forEach((x) => {
      if (x.r11) return;
      x.r11 = 1;
      const set = R11.festOf(x.t);
      if (set && D.LOCS[set.loc]) { x.fest = set.id; x.loc = set.loc; }
    });
    return st;
  };
  const U = G.q17;
  if (U && U.rumors) {
    const rum0 = U.rumors;
    U.rumors = (S) => {
      S = S || G.S;
      const st = S ? R11.tagRumors(S) : null;
      const out = rum0(S);
      if (!st) return out;
      out.forEach((x) => {
        const box = st.list[x.i];
        const set = box && box.fest ? R11.festSet(box.fest) : null;
        if (!set) return;
        x.fest = set.id;
        x.festName = R11.festName(set);
        if (R11.festDone(set, S)) { x.loc = ""; x.hint = `済んだ催し：${x.festName}`; return; }
        x.loc = set.loc;
        x.festWhen = R11.festWhen(set, S);
        x.hint = `続きがありそうな所：${locName(set.loc)}（${x.festWhen}）`;
      });
      return out;
    };
  }
  if (U && U.targets) {
    const tg0 = U.targets;
    U.targets = (S) => {
      S = S || G.S;
      const out = tg0(S);
      let fests = null;
      out.forEach((t) => {
        if (t.src !== "rumor") return;
        if (!fests) { try { fests = U.rumors(S).filter((x) => x.fest && x.loc && !x.quest); } catch { fests = []; } }
        const f = fests.find((x) => x.loc === t.to);
        if (!f) return;
        t.at = `季節の催し：${f.festName}（${f.festWhen}）`;
        t.way = `季節の催し：${f.festName}（${locName(t.to)}・${f.festWhen}）`;
      });
      return out;
    };
  }
})(globalThis.G = globalThis.G || {});
