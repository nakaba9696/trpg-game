// Q4：目的 5 つそれぞれの道筋を、筋のよいボット（tests/bots.mjs）で通しで遊んで確かめる（CI 用の軽い版。重い集計は tests/goals.mjs）
// - 丈夫な体（HP 999）で、行動の一覧から選ぶだけで、目的の節目まで届く（道筋が切れていない）
// - 節目で尋ねられ、終えられ、人生の物語とその後が出る
// - 節目の前も、節目で尋ねられている最中も、「旅を続ける」を選んだあとも、保存して読み込んで（JSON に通して）続きが遊べる
// - 使徒を討つ：グラウでない使徒でも目的と節目になる／交易：仕入れて遠くで売ると儲かる・荷車・町が満腹になる・古いセーブ
// - 獣の病がはじめてうつった手番に、教会のことを口にする人がいる
import { makeBot, startRun } from "../bots.mjs";

const BANNED = /見世物|観客|客席|舞台|台本|言霊|神々が.{0,6}眺め/;

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let failures = 0;
  const fail = (m) => { failures++; fail0(m); };
  const G = loadEngine();
  const D = G.data;
  const roundTrip = () => { G.S = JSON.parse(JSON.stringify(G.S)); return G.S; };
  const checkStory = (where, st, dead) => {
    if (!st) { fail(`${where}: 人生の物語が無い`); return; }
    if (!(st.life.length >= 4 && st.life.length <= 8)) fail(`${where}: 人生の物語が ${st.life.length} 段落`);
    if (!dead && !(st.after && st.after.length >= 4 && st.after.length <= 6)) fail(`${where}: その後が ${st.after ? st.after.length : 0} 段落`);
    for (const t of [...st.life, ...(st.after || []), st.epitaph]) {
      if (!t || /[{}]|undefined|NaN|null/.test(t)) fail(`${where}: 置き換え忘れ「${String(t).slice(0, 40)}」`);
      else if (BANNED.test(t)) fail(`${where}: 見せない言葉「${t.match(BANNED)[0]}」`);
    }
  };

  // ---------------------------------------------------------------- 目的ごとに通しで
  // 種は 3 つまで試す（ほかの子が乱数の使い方を変えても、道筋が通っていればどれかは届く）
  const CASES = [
    ["custom", "merc"], ["sword", "samurai"], ["majin", "thief"], ["rich", "samurai"], ["king", "merc"],
  ];
  const rows = [];
  for (const [goal, cls] of CASES) {
    const want = D.M6.MILESTONES.filter((m) => m.goal === goal).map((m) => m.id);
    let done = null;
    const why = [];
    for (let k = 0; k < 3 && !done; k++) {
      const seed = 4000 + k * 97 + goal.length;
      let res = null;
      try {
        startRun(G, { goal, cls, seed, seeded, strong: true });
        let at = null;
        const bot = makeBot(G, goal, { endAtGoal: false, onMilestone: (m) => { at = m; return "stop"; } });
        let n = 0;
        for (; n < 8000 && !at; n++) {
          if (n % 40 === 39) roundTrip(); // 節目の前：ときどき保存して読み込む
          if (!bot.step()) break;
        }
        if (!at) { why.push(`種 ${seed}：節目に届かない（${G.S.over || "打ち切り"}・${G.S.day}日・${G.S.deathCause || ""}）`); continue; }
        // 節目で尋ねられている最中に保存して読み込む
        let S = roundTrip();
        if (!want.includes(S.m6 && S.m6.pending)) { fail(`${goal}: 読み込んだら節目の問いが消えた（${S.m6 && S.m6.pending}）`); }
        if (!G.m6CanEnd()) fail(`${goal}: 節目に着いて読み込んだら、終えられない`);
        // 旅を続ける → しばらく遊ぶ → 保存して読み込む → 終える
        G.m6GoOn();
        const bot2 = makeBot(G, goal, { endAtGoal: false, onMilestone: () => undefined });
        for (let i = 0; i < 30 && !G.S.over; i++) { bot2.step(); if (i === 14) roundTrip(); }
        S = roundTrip();
        if (S.over === "dead") { why.push(`種 ${seed}：節目のあと、続けているうちに死んだ（${S.deathCause}）`); continue; }
        if (!S.over) {
          if (!G.m6CanEnd() && S.mode !== "combat") fail(`${goal}: 続けたあと読み込むと、終えられない`);
          while (S.mode === "combat" && !S.over) G.act(G.actions().flatMap((g) => g.list).find((a) => !a.disabled).id);
          if (!S.over) G.retire();
        }
        if (S.over === "end" && !want.includes(S.ending && S.ending.id)) fail(`${goal}: 目的の節目で終わらない（${S.ending && S.ending.id}）`);
        if (S.over === "end") checkStory(`${goal} で終える`, S.story, false);
        res = { seed, turn: at ? bot.info.reachedTurn : 0, day: bot.info.reachedDay, m: at.id };
      } catch (e) {
        fail(`${goal}（種 ${seed}）: 例外 ${e.stack.split("\n").slice(0, 3).join(" ")}`);
      }
      done = res;
    }
    if (!done) fail(`${goal}: 丈夫な体でも、目的の節目に届かない（${why.join("／")}）`);
    else rows.push(`${goal} ${done.turn}手番・${done.day}日`);
  }

  // ---------------------------------------------------------------- 使徒を討つ：グラウでない使徒
  {
    const S = startRun(G, { goal: "majin", cls: "samurai", seed: 11, seeded });
    const flags = G.majinFlags();
    for (const f of ["graw", "e2_mordu", "e2_gormoa"]) if (!flags.includes(f)) fail(`使徒の旗 ${f} を数えない（${flags.join(",")}）`);
    S.flags.e2_mordu = true;
    if (!G.goalDone(S)) fail("モルドゥを討っても、目的を果たしたことにならない");
    G.endTurn();
    if (S.m6.pending !== "majin_other") fail(`モルドゥを討っても、使徒の節目で尋ねられない（${S.m6.pending}）`);
    if (!S.log.some((e) => e.k === "title" && e.text === "宿願成就")) fail("モルドゥを討っても、宿願成就が出ない");
    G.endStory(S.m6.pending);
    checkStory("モルドゥを討って終える", S.story, false);
    const L = G.m6LifeOf(S);
    const h = D.M6.HIGHLIGHTS.find((x) => x.key === "majin_other");
    if (!h || !h.test(L)) fail("モルドゥを討った人生の出来事が拾われない");
    // グラウなら、元の節目（majin）
    const S2 = startRun(G, { goal: "majin", cls: "samurai", seed: 12, seeded });
    S2.flags.graw = true;
    G.endTurn();
    if (S2.m6.pending !== "majin") fail(`グラウを討ったのに、節目が ${S2.m6.pending}`);
  }

  // ---------------------------------------------------------------- 交易
  {
    const Q4 = D.Q4;
    const S = startRun(G, { goal: "rich", cls: "merc", seed: 21, seeded });
    const acts = () => G.actions().flatMap((g) => g.list);
    const doAct = (id) => { const a = acts().find((x) => x.id === id); if (!a || a.disabled) { fail(`交易：「${id}」が選べない（${acts().map((x) => x.id).join(" ")}）`); return false; } G.act(id); return true; };
    S.loc = "w2_granbel"; S.gold = 1000; S.mode = "explore";
    doAct("fac:shop");
    const buy = G.q4BuyPrice("q4_flour", "w2_granbel");
    for (let i = 0; i < Q4.LOAD; i++) doAct("q4:buy:q4_flour");
    if (S.inv.q4_flour !== Q4.LOAD) fail(`交易：${Q4.LOAD} 箱積めない（${S.inv.q4_flour}）`);
    const full = acts().find((a) => a.id === "q4:buy:q4_flour");
    if (!full || !full.disabled) fail("交易：荷車なしで積める箱を越えても仕入れられる");
    if (acts().some((a) => a.id === "shop:sell:q4_flour")) fail("交易：荷が「売る」の一覧に出る");
    if (!(S.lore && S.lore.koueki)) fail("交易：仕入れても用語（荷と相場）が開かない");
    if (!acts().some((a) => a.id === "q4:cart")) fail("交易：麦の都で荷車が買えない");
    doAct("q4:cart");
    if (acts().find((a) => a.id === "q4:buy:q4_flour").disabled) fail("交易：荷車を買っても積める箱が増えない");
    doAct("back");
    // 砦で売る（粉を欲しがる）
    G.arrive("fort");
    if (S.inv.q4_flour) {
      doAct("fac:shop");
      const p1 = G.q4SellPrice("q4_flour", "fort");
      if (!(p1 > buy * 1.3)) fail(`交易：砦で粉が高く売れない（仕入れ ${buy}G・売り ${p1}G）`);
      const g0 = S.gold;
      doAct("q4:sell:q4_flour");
      if (S.gold !== g0 + p1) fail("交易：売った値が所持金に入らない");
      const p2 = G.q4SellPrice("q4_flour", "fort");
      if (!(p2 < p1)) fail("交易：同じ町で続けて売っても値が下がらない");
      if (!(S.q4.profit > 0)) fail("交易：利ざやが記録されない");
    }
    // 古いセーブ（S.q4 が無い）でも店が開ける・売れる
    delete S.q4;
    S.loc = "fort"; S.mode = "explore"; S.fac = null;
    try { doAct("fac:shop"); if (S.inv.q4_flour) doAct("q4:sell:q4_flour"); roundTrip(); G.actions(); }
    catch (e) { fail(`交易：古いセーブで例外 ${e.message}`); }
    // 表：品の仕入れ先が店のある町か、欲しがる町があるか
    for (const [id, g] of Object.entries(Q4.GOODS)) {
      const L = D.LOCS[g.from];
      if (!L || L.type !== "town" || !(L.fac || []).includes("shop")) fail(`交易：${id} の仕入れ先 ${g.from} に店が無い`);
      for (const t of Object.keys(g.want || {})) if (!D.LOCS[t] || !(D.LOCS[t].fac || []).includes("shop")) fail(`交易：${id} を欲しがる ${t} に店が無い`);
      if (BANNED.test(g.desc)) fail(`交易：${id} の説明に見せない言葉`);
    }
    for (const t of Q4.CART.sold) if (!(D.LOCS[t] && (D.LOCS[t].fac || []).includes("shop"))) fail(`交易：荷車を売る ${t} に店が無い`);
  }

  // ---------------------------------------------------------------- 獣の病の手がかり
  {
    const S = startRun(G, { goal: "king", cls: "merc", seed: 31, seeded });
    const n0 = S.log.length;
    G.infect();
    G.endTurn();
    const said = S.log.slice(n0).map((e) => e.text).join("");
    if (!/教会|坊さん|祓/.test(said)) fail("獣の病がうつっても、教会のことを口にする人がいない");
    const n1 = S.log.length;
    G.endTurn();
    if (S.log.slice(n1).some((e) => D.Q4.BEAST_HINT.town.includes(e.text))) fail("獣の病の手がかりが、手番ごとに繰り返される");
    for (const t of [...D.Q4.BEAST_HINT.town, ...D.Q4.BEAST_HINT.wild, D.Q4.BEAST_HINT.alone]) if (BANNED.test(t)) fail("獣の病の手がかりに見せない言葉");
  }

  if (!failures) ok(`目的の道筋（丈夫な体のボットで節目まで：${rows.join("・")}。保存と読み込み・続けて終える・交易・グラウでない使徒・獣の病の手がかり）`);
};
