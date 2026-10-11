// M15：魔導書は読めば必ず覚える（知力の判定・成功率の表示・大失敗の借りを無くした。持ち主の決定）。
// 才が無い・その段に届かない属性の書は読めない：「読み解く」の行動を出さず、持ち物から開いたときに一度だけわけを言う。
// 中級の書（src/data/m15_tomes.js）の落とし物と、出来事の結果 m15tome（"mid"：中級の書を一冊。得意な属性から）。
// M14（src/engine/m14_magic.js）の G.readTome・魔導書の行動を包み直す。DOM に触らない。乱数は G.rand。レーン I＋B（M15）
(function (G) {
  const D = G.data;
  const M = G.m14;
  if (!M) return;
  const SP = D.SPELLS;
  const told = (S) => { S = S || G.S; S.m15told = S.m15told || {}; return S.m15told; };   // 古いセーブには無い

  // ---------------------------------------------------------------- 読む（必ず覚える）
  G.tomeChance = () => 100;
  G.readTome = (id) => {
    const S = G.S;
    const it = D.ITEMS[id];
    if (!S || S.over || S.mode === "combat" || !it || it.type !== "tome" || !S.inv[id] || G.knows(it.teach)) return false;
    const why = M.canLearn(it.teach);
    if (why) {
      if (!told(S)[id]) {
        told(S)[id] = true;
        G.log("you", `${it.name}を開く`);
        G.say(M.has() ? `頁の文字は読める。だが、何も起きない。（${why}）` : "頁の文字は読める。だが、読んでも何も起きない。あなたには術の才が無く、この本を読み解けない。");
      }
      return false;
    }
    G.log("you", `${it.name}を読み解く`);
    G.pass(1);
    G.say(it.m14lore ? "最後の頁を閉じたとき、指先の向こうで重い扉が一枚、内側から開いた。"
      : it.m15mid ? "読み終えるころには、同じ一行を何十回も口の中でなぞっていた。気がつくと、その一行は本の外にあった。"
        : "文字の並びが、ふいに意味を持った。誰かが耳元で、読み方を教えてくれたような気がした。");
    G.learnSpell(it.teach);
    return true;
  };
  // 魔導書の行動：読めない書は出さない。成功率は出さない（必ず覚える）
  const exploreActions0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = exploreActions0();
    groups.forEach((g) => {
      g.list = (g.list || []).filter((a) => {
        const m = /^tome:(.+)$/.exec(a.id || "");
        if (!m || !D.ITEMS[m[1]]) return true;
        const sp = SP[D.ITEMS[m[1]].teach];
        if (M.canLearn(D.ITEMS[m[1]].teach)) return false;
        a.disabled = false;
        a.sub = sp ? `${sp.name}（${(D.M14_ELEMS[sp.el] || {}).name || ""}の${D.M14_TIERS[sp.tier || 1] || ""}）を覚える・半日` : "";
        return true;
      });
    });
    return groups.filter((g) => g.list.length || !/魔導書/.test(g.title || ""));
  };

  // ---------------------------------------------------------------- 出来事の結果 m15tome
  M.midTomeFor = (S) => {
    S = S || G.S;
    const ids = Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].m15mid && !(S.inv || {})[id] && !G.knows(D.ITEMS[id].teach, S));
    const ok = ids.filter((id) => !M.canLearn(D.ITEMS[id].teach, S));
    const good = ok.filter((id) => M.talent(S).good.includes(SP[D.ITEMS[id].teach].el));
    const pool = good.length ? good : ok.length ? ok : ids;
    return pool.length ? pool[Math.floor(G.rand() * pool.length)] : null;
  };
  const apply0 = G.apply;
  G.apply = (o) => {
    const r = apply0(o);
    const S = G.S;
    if (o && o.m15tome && S && !S.over) {
      const id = M.midTomeFor();
      if (id && G.give(id)) G.note(`${D.ITEMS[id].name}を手に入れた。`);
    }
    return r;
  };

  // ---------------------------------------------------------------- 中級の書：段 4 以上の術者の落とし物（まれ。属性ごとに順に割り当てる）
  const mids = Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].m15mid);
  Object.keys(D.ENEMIES).filter((id) => { const e = D.ENEMIES[id]; return !e.boss && !e.majin && (e.tier || 1) >= 4 && e.magic; }).forEach((id, i) => {
    const e = D.ENEMIES[id];
    for (let k = i; k < mids.length; k += 4) if (!(e.loot || []).some(([x]) => x === mids[k])) e.loot = [...(e.loot || []), [mids[k], 0.03]];
  });
})(globalThis.G = globalThis.G || {});
