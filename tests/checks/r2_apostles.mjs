// R2（グループ F）：格の違う相手（朧島の煙をまとった女 yoi・ブランデールの両替商 zalve）の恋の筋を、出来事で 8 段以上にした。
// データは src/data/romance_yoi.js・romance_zalve.js（M11 の出来事 m11_<key>_* の cond を包んで、気になる・すれ違い・暮らし・この先を足す）。
// - D.R2.AP の順に「その段の出来事の cond が通り、前の段が済む前は通らない」
// - 最後の一歩の重い条件が無いと m11_<key>_last が出ない。こじれたら仲直りまで次に進めない
// - 古いセーブ（新しい flag が無いのに st がすでに 1 以上）でも先に進める
// - D.R2.ARCS に入れない（仲間の会話の筋ではない）。見せる文に書かない言葉・名前が無い
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  G.data.Q8P.off = true; // Q8 の恋の相手の一覧（人間の見た目の名のある人だけ）と組み合わせは tests/checks/q8_pairs.mjs で確かめる。ここは仕組みだけ
  const D = G.data;
  let n = 0;
  const F = (m) => { n++; fail("R2 格の違う相手: " + m); };
  const R2 = D.R2 || {};
  const AP = R2.AP || {};
  const KEYS = { yoi: { loc: "w1_oboro", entry: "w1_yoifav", mendLoc: "yakumo", sourIdx: 1, plainIdx: 2, needEv: "r2_yoi_toll", needIdx: 0 },
    zalve: { loc: "karna", entry: "ev:v1_zalve", mendLoc: null, sourIdx: 2, plainIdx: 0, needEv: "r2_zalve_clause", needIdx: 0 } };
  const ev = (id) => D.EVENTS.find((e) => e.id === id);

  // ---------------------------------------------------------------- 形
  for (const k of Object.keys(KEYS)) {
    const L = AP[k] || [];
    if (L.length < 8) F(`${k}: 段が ${L.length}（8 以上）`);
    for (const id of L) if (!ev(id)) F(`${k}: 出来事 ${id} が無い`);
    if (!(R2.AP_HINT || {})[k]) F(`${k}: 難しい道の説明（D.R2.AP_HINT）が無い`);
    if ((R2.ARCS || {})[k]) F(`${k}: 仲間の会話の筋（D.R2.ARCS）に入っている`);
  }
  // 見せる文
  const texts = [];
  const addO = (o) => { if (o) for (const k of ["text", "memo", "chron"]) if (o[k]) texts.push(o[k]); };
  D.EVENTS.filter((e) => /^r2_(yoi|zalve)_/.test(e.id)).forEach((e) => { texts.push(e.title, e.text); e.choices.forEach((c) => { texts.push(c.label); addO(c.ok); addO(c.ng); }); });
  const rum = (D.RUMORS || []).filter((r) => /朧島|吊り灯り|提灯|両替商|金融商会/.test(r));
  if (rum.filter((r) => /朧島|吊り灯り|提灯/.test(r)).length < 2) F("yoi: 手がかりの噂が 2 つ無い");
  if (rum.filter((r) => /両替商|金融商会/.test(r)).length < 2) F("zalve: 手がかりの噂が 2 つ無い");
  texts.push(...rum);
  for (const t of texts) {
    if (/見世物|観客|客席|舞台|台本|言霊|神々|魔王|魔人|使徒|眷属|正体|もういない|胸|裸/.test(t)) F(`書かない言葉「${t}」`);
    if (/ベリエラ|ドレイゼ|宵姫|ザルヴェ|カルマトス/.test(t)) F(`名前が地の文に出る「${t}」`);
    if (/\{[a-z]+\}/.test(t)) F(`置き換えの残る文「${t}」`);
  }
  for (const e of D.EVENTS.filter((x) => /^r2_(yoi|zalve)_/.test(x.id))) if (/！/.test(e.text)) F(`${e.id}: 地の文に「！」`);

  // ---------------------------------------------------------------- 準備
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  const start = (entry) => {
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 30, history: "テスト用", personality: "無口だが義理堅い" } });
    G.S.maxHp = G.S.hp = 9999;
    G.S.gold = 5000;
    G.S.flags[entry] = true;
    G.S.day = 50;
    return G.S;
  };
  const always = (fn, v) => { const r = G.rand; G.rand = () => (v === undefined ? 0.01 : v); try { return fn(); } finally { G.rand = r; } };
  const townOther = (not) => Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && !not.includes(id));
  // 出来事の起きる場所に立つ
  const stand = (S, e, k) => {
    S.mode = "explore"; S.event = null;
    const w = (e.where || [])[0];
    if (!w) return;
    S.loc = D.LOCS[w] ? w : townOther([KEYS[k].loc, "w1_oboro", "karna"]);
  };
  const play = (S, id, i, k, v) => {
    const e = ev(id);
    stand(S, e, k);
    G.startEvent(id);
    always(() => G.act("ev:" + (i || 0)), v);
    if (S.mode === "event" && S.event && S.event !== id && /_(won|no)$/.test(S.event)) return; // 最後の一歩のあと
    S.mode = "explore"; S.event = null;
  };
  const condAt = (S, id, k) => { const e = ev(id); if (!e) return false; const L0 = S.loc; stand(S, e, k); const r = !e.cond || e.cond(S); S.loc = L0; return r; };
  G.rand = seeded(4242);

  // ---------------------------------------------------------------- 1. 筋の順にたどる
  for (const k of Object.keys(KEYS)) {
    const C = KEYS[k];
    const L = AP[k] || [];
    const S = start(C.entry);
    let broke = false;
    for (let i = 0; i < L.length && !broke; i++) {
      const id = L[i];
      const e = ev(id);
      if (!e) { broke = true; break; }
      if (/_won$/.test(id)) {
        // 最後の一歩のあとに、成就の出来事が来ている
        if (S.event !== id) { F(`${k}: 最後の一歩が通っても ${id} にならない（${S.event}）`); broke = true; break; }
        always(() => G.act("ev:0"));
        S.mode = "explore"; S.event = null;
        if (!G.m11ApWon(k, S)) { F(`${k}: 成就しない`); broke = true; }
        S.day += 40;
        continue;
      }
      if (/_last$/.test(id) && !condAt(S, id, k) && condAt(S, C.needEv, k)) { play(S, C.needEv, C.needIdx, k); S.day += 7; } // 重い条件をそろえる（筋の外の出来事）
      if (!condAt(S, id, k)) { F(`${k}: 段 ${i}（${id}）の条件が通らない（st ${G.m11Ap(k, S).st}・日 ${S.day}）`); broke = true; break; }
      // 次の段（成就の出来事は除く）は、この段が済む前には通らない
      const nx = L.slice(i + 1).find((x) => !/_won$/.test(x));
      if (nx && condAt(S, nx, k)) F(`${k}: ${id} が済む前に、次の段 ${nx} が通る`);
      if (/_last$/.test(id)) {
        play(S, id, 0, k, 0.01);
      } else {
        play(S, id, 0, k);
      }
      S.day += 7;
      if (/_after$/.test(id)) S.day += 40;
    }
    if (!broke) {
      if (!G.m11ApWon(k, S)) F(`${k}: 最後まで歩いても成就していない`);
      if (!S.flags["ev:" + L[L.length - 1]]) F(`${k}: 最後の段 ${L[L.length - 1]} が済んでいない`);
      if (ev(L[1]).cond(S)) F(`${k}: 成就のあとに、続き物の最初に戻る`);
      const bad = S.log.filter((l) => /\{[a-z_0-9]+\}|undefined/.test(l.text || ""));
      if (bad.length) F(`${k}: 文に置き換えが残る「${bad[0].text}」`);
    }
  }

  // ---------------------------------------------------------------- 2. 難しい道：条件が無いと最後の一歩が出ない
  for (const k of Object.keys(KEYS)) {
    const C = KEYS[k];
    const S = start(C.entry);
    play(S, `r2_${k}_0`, 0, k); S.day += 7;
    play(S, `m11_${k}_1`, 0, k); S.day += 7;
    play(S, `m11_${k}_2`, 0, k); S.day += 7;
    play(S, `r2_${k}_rift`, C.plainIdx, k); S.day += 7; // 重い条件を満たさない返し
    if (k === "yoi" && S.flags.r2_yoi_year) F("yoi: 一年を渡さない返しで、条件が満ちる");
    play(S, `m11_${k}_3`, 0, k); S.day += 7;
    play(S, `m11_${k}_4`, 0, k); S.day += 7;
    if (G.m11Ap(k, S).st !== 4) { F(`${k}: 四度目まで進まない（${G.m11Ap(k, S).st}）`); continue; }
    if (condAt(S, `m11_${k}_last`, k)) F(`${k}: 難しい道の条件が無いのに、最後の一歩が出る`);
    if (!condAt(S, C.needEv, k)) { F(`${k}: 条件をそろえる出来事 ${C.needEv} が出ない`); continue; }
    play(S, C.needEv, C.needIdx, k); S.day += 7;
    if (!condAt(S, `m11_${k}_last`, k)) F(`${k}: ${C.needEv} のあとも、最後の一歩が出ない`);
    if (condAt(S, C.needEv, k)) F(`${k}: 条件がそろったあとも ${C.needEv} が出る`);
  }
  // zalve：はじめの商会で抜け穴を見つけていれば、規約の出来事なしで通る
  {
    const S = start("ev:v1_zalve");
    S.flags.v1_zalve_fav = true;
    const a = G.m11Ap("zalve", S); a.st = 4; a.day = 0;
    if (!condAt(S, "m11_zalve_last", "zalve")) F("zalve: はじめに抜け穴を見つけていても、最後の一歩が出ない");
    if (condAt(S, "r2_zalve_clause", "zalve")) F("zalve: はじめに抜け穴を見つけていても、規約の出来事が出る");
  }

  // ---------------------------------------------------------------- 3. こじれる：仲直りまで次に進めない
  for (const k of Object.keys(KEYS)) {
    const C = KEYS[k];
    const S = start(C.entry);
    S.flags[`r2_${k}_0`] = true;
    const a = G.m11Ap(k, S); a.st = 2; a.day = 0;
    play(S, `r2_${k}_rift`, C.sourIdx, k); S.day += 7;
    if (!S.flags[`r2_${k}_sour`]) { F(`${k}: すれ違いでこじれない`); continue; }
    if (condAt(S, `m11_${k}_3`, k)) F(`${k}: こじれたのに、すぐ次の段に進める`);
    if (condAt(S, `r2_${k}_rift`, k)) F(`${k}: こじれたあと、すれ違いの出来事がまた出る`);
    const mend = ev(`r2_${k}_mend`);
    S.mode = "explore"; S.loc = C.mendLoc || townOther([C.loc]);
    if (!mend || !mend.cond(S)) { F(`${k}: 仲直りの出来事が出ない`); continue; }
    if (k === "zalve") { S.loc = "karna"; if (mend.cond(S)) F("zalve: 詫び状がブランデールの中で届く"); S.loc = townOther([C.loc]); }
    G.startEvent(mend); always(() => G.act("ev:0"));
    S.mode = "explore"; S.event = null; S.day += 7;
    if (!condAt(S, `m11_${k}_3`, k)) F(`${k}: 仲直りのあとも、次の段に進めない`);
  }

  // ---------------------------------------------------------------- 4. 古いセーブ：新しい flag が無いのに st がすでに 1 以上
  for (const k of Object.keys(KEYS)) {
    const C = KEYS[k];
    for (const st of [1, 2, 3, 4]) {
      const S = start(C.entry);
      const a = G.m11Ap(k, S); a.st = st; a.day = 0;
      // その st で出られる出来事が一つはある（続き物か、新しく足した段）
      const nextOf = (s2) => (s2 < 4 ? `m11_${k}_${s2 + 1}` : `m11_${k}_last`);
      const cand = [nextOf(st), `r2_${k}_rift`, C.needEv].filter((id) => ev(id) && condAt(S, id, k));
      if (!cand.length) { F(`${k}: 古いセーブ（st ${st}）で先に進めない`); continue; }
      // 最後まで歩ける（成就まで）
      let guard = 0;
      while (!G.m11ApWon(k, S) && guard++ < 12) {
        const st2 = G.m11Ap(k, S).st;
        const ids = [nextOf(st2), `r2_${k}_rift`, C.needEv].filter((id) => ev(id) && condAt(S, id, k));
        if (!ids.length) { F(`${k}: 古いセーブ（st ${st}）が st ${st2} で詰まる`); break; }
        const id = ids[0];
        play(S, id, 0, k, 0.01);
        if (S.event && /_won$/.test(S.event)) { always(() => G.act("ev:0")); S.mode = "explore"; S.event = null; }
        S.day += 7;
      }
      if (!G.m11ApWon(k, S)) F(`${k}: 古いセーブ（st ${st}）から成就まで歩けない`);
    }
    // st 0 の古いセーブ：気になるの出来事が出る
    const S0 = start(C.entry);
    delete S0.m11;
    if (!condAt(S0, `r2_${k}_0`, k)) F(`${k}: S.m11 の無いセーブで、気になるの出来事が出ない`);
    if (condAt(S0, `m11_${k}_1`, k)) F(`${k}: 気になるの前に、続き物の一段目が出る`);
  }

  // ---------------------------------------------------------------- 5. 討たれていたら、新しい段は出ない
  {
    const S = start("w1_yoifav");
    S.flags["e3:yoihime"] = true;
    if (condAt(S, "r2_yoi_0", "yoi")) F("yoi: 討たれたあとも、気になるの出来事が出る");
  }

  if (!n) ok(`R2 格の違う相手の恋の筋（yoi ${(AP.yoi || []).length} 段・zalve ${(AP.zalve || []).length} 段・難しい道・こじれと仲直り・古いセーブ）`);
};
