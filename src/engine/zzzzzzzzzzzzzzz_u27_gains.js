// U27：行動ごとに「得たもの・失ったもの」をまとめた記録を一つ残す。持ち主の声「行動した結果得たもの、もっとわかりやすく表示して。
// 名声やアイテムなど、いま最後にうっすら表示されててわかりにくい」
//   ・行動（G.act）の前と後の状態を比べ、変わったもの（持ち物・所持金・名声・位・国ごとの評判と悪名・HP/MP・能力値・覚えた術と技・仲間・正気・振り直し）を
//     G.log("gain", 一行の文, { gains: [{ kind, label, delta, text, tone }] }) で一つにまとめる。tone は good（得た）・bad（失った）・info
//   ・戦闘の手番と、戦闘を終える手番は数えない（戦闘の結果は F1 の結果の場面が出す）
//   ・画面（ui/zu27_gains.js）は、この記録を「得たもの」の枠に描く。古いセーブの記録（gain が無い）はそのまま
// 名前の z の数で、G.act を包むほかのファイル（b5・k2・f3・u17・m5・m7）より後に読まれる（いちばん外側で前後を比べる）。
// 乱数は使わない。DOM には触らない。レーン U＋C（U27）
(function (G) {
  const D = G.data;
  const U = (G.u27 = G.u27 || {});

  // ---------------------------------------------------------------- 前後の比べ方（DOM なし。テストからも呼べる）
  const EQ = ["weapon", "armor", "ring"];
  // 持っている数（袋の中＋身につけている物）
  const owned = (S) => {
    const out = Object.assign({}, S.inv || {});
    EQ.forEach((k) => { const id = S[k]; if (id && id !== "fists") out[id] = (out[id] || 0) + 1; });
    return out;
  };
  U.snap = (S) => {
    if (!S) return null;
    const rep = {};
    Object.entries(S.repute || {}).forEach(([n, r]) => { rep[n] = { rep: r.rep || 0, inf: r.inf || 0 }; });
    return {
      gold: S.gold || 0, hp: S.hp || 0, mp: S.mp || 0, maxHp: S.maxHp || 0, maxMp: S.maxMp || 0,
      fame: S.fame || 0, title: S.title || "", sanity: typeof S.sanity === "number" ? S.sanity : null, rerolls: S.rerolls || 0,
      stats: Object.assign({}, S.stats || {}), own: owned(S),
      spells: [...(S.spells || [])], skills: [...(S.skills || [])],
      comps: (S.companions || []).map((c) => ({ id: c.id || c.c2 || c.name, name: c.name })),
      rep, combat: !!S.combat,
    };
  };
  const sign = (n) => (n > 0 ? "+" : "−") + Math.abs(n);
  const itemName = (id) => ((D.ITEMS || {})[id] || {}).name || id;
  const nationName = (n) => (G.regionName ? G.regionName(n) : n) || n;
  const spellName = (id) => ((D.SPELLS || {})[id] || {}).name || id;
  const skillName = (id) => ((D.SKILLS || {})[id] || {}).name || id;
  // 比べて、変わったものの一覧。並びは「物と金 → 名声と評判 → 体 → 能力と覚えたこと → 仲間」
  U.diff = (a, b) => {
    if (!a || !b) return [];
    const out = [];
    const add = (kind, label, delta, tone, text) => out.push({ kind, label, delta, tone, text: text || `${label} ${sign(delta)}` });
    // 持ち物
    const ids = [...new Set([...Object.keys(a.own), ...Object.keys(b.own)])];
    ids.forEach((id) => {
      const d = (b.own[id] || 0) - (a.own[id] || 0);
      if (!d || !(D.ITEMS || {})[id]) return;
      add("item", itemName(id), d, d > 0 ? "good" : "bad", `${itemName(id)}${Math.abs(d) > 1 ? ` ×${Math.abs(d)}` : ""}`);
    });
    if (b.gold !== a.gold) add("gold", "所持金", b.gold - a.gold, b.gold > a.gold ? "good" : "bad", `${sign(b.gold - a.gold)}G`);
    if (b.fame !== a.fame) add("fame", "名声", b.fame - a.fame, b.fame > a.fame ? "good" : "bad");
    if (b.title && b.title !== a.title) add("title", "位", 0, "good", `位：${b.title}`);
    Object.keys(Object.assign({}, a.rep, b.rep)).forEach((n) => {
      const x = a.rep[n] || { rep: 0, inf: 0 }, y = b.rep[n] || { rep: 0, inf: 0 };
      if (y.rep !== x.rep) add("rep", `評判（${nationName(n)}）`, y.rep - x.rep, y.rep > x.rep ? "good" : "bad");
      if (y.inf !== x.inf) add("inf", `悪名（${nationName(n)}）`, y.inf - x.inf, y.inf > x.inf ? "bad" : "good");
    });
    if (b.hp !== a.hp) add("hp", "HP", b.hp - a.hp, b.hp > a.hp ? "good" : "bad");
    if (b.mp !== a.mp) add("mp", "MP", b.mp - a.mp, b.mp > a.mp ? "good" : "bad");
    if (b.maxHp > a.maxHp) add("hp", "最大 HP", b.maxHp - a.maxHp, "good");
    if (b.maxMp > a.maxMp) add("mp", "最大 MP", b.maxMp - a.maxMp, "good");
    if (a.sanity != null && b.sanity != null && b.sanity !== a.sanity) add("sanity", "正気", b.sanity - a.sanity, b.sanity > a.sanity ? "good" : "bad", b.sanity > a.sanity ? "正気が戻った" : "正気が削れた");
    Object.keys(b.stats).forEach((k) => {
      const d = (b.stats[k] || 0) - (a.stats[k] || 0);
      if (d) add("stat", k, d, d > 0 ? "good" : "bad");
    });
    b.spells.filter((x) => !a.spells.includes(x)).forEach((x) => add("learn", spellName(x), 1, "good", `術を覚えた：${spellName(x)}`));
    b.skills.filter((x) => !a.skills.includes(x)).forEach((x) => add("learn", skillName(x), 1, "good", `覚えた：${skillName(x)}`));
    if (b.rerolls > a.rerolls) add("reroll", "振り直し", b.rerolls - a.rerolls, "good");
    const ida = a.comps.map((c) => c.id), idb = b.comps.map((c) => c.id);
    b.comps.filter((c) => !ida.includes(c.id)).forEach((c) => add("comp", c.name, 1, "good", `仲間になった：${c.name}`));
    a.comps.filter((c) => !idb.includes(c.id)).forEach((c) => add("comp", c.name, -1, "bad", `仲間が去った：${c.name}`));
    return out;
  };
  U.line = (gains) => (gains || []).map((g) => g.text).join("・");

  // ---------------------------------------------------------------- 行動を包む
  const act0 = G.act;
  if (typeof act0 !== "function") return;
  let lastBefore = null; // 直前の行動の前の状態（振り直し「rr:go」は行動の前に戻ってやり直すので、そこから比べる）
  G.act = (id) => {
    const S = G.S;
    const before = id === "rr:go" && lastBefore && lastBefore.S === S ? lastBefore.snap : U.snap(S);
    if (id !== "rr:go") lastBefore = { S, snap: before };
    const r = act0(id);
    try {
      const S2 = G.S;
      // 戦闘の手番・戦闘を終える手番・別の冒険になったときは数えない
      if (!S2 || S2 !== S || !before || before.combat || S2.combat) return r;
      const gains = U.diff(before, U.snap(S2));
      if (gains.length) G.log("gain", "得たもの：" + U.line(gains), { gains });
    } catch (e) { /* 数え損ねても遊びは止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
