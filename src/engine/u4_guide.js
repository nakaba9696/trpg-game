// 画面の案内（U4）。次に何をすればよいかを画面が示すための、読むだけの関数。
// - G.routeTo(from, to)：陸路と船で、日数の少ない道順（場所 id の列）
// - G.questWays(S)：受けている依頼の行き先（果たす場所・報告できるギルドの町）と、そこへの次の一歩
// - G.lockReason(a, S)：押せない行動ボタンの理由（MP・所持金が足りない など）
// - G.playTip(S, P)：その場面ではじめてのときだけ出す、遊び方の一行（世界観は説明しない）
// - G.hpDanger(S)：HP が危ないか
// 状態（G.S・G.P）は書き換えない。開いた案内は画面が G.P.tips に記す。レーン U（U4）が管理
(function (G) {
  const D = G.data;

  // 行ける先（陸路 links と船 sea）。{ 行き先: 日数 }
  const edges = (id) => {
    const L = D.LOCS[id] || {};
    const out = { ...(L.links || {}) };
    Object.entries(L.sea || {}).forEach(([to, s]) => { if (out[to] == null || s.days < out[to]) out[to] = s.days; });
    return out;
  };

  // 日数の少ない道順（見つからなければ null）。[from, ..., to]
  G.routeTo = (from, to) => {
    if (!D.LOCS[from] || !D.LOCS[to]) return null;
    if (from === to) return [from];
    const dist = { [from]: 0 }, prev = {}, done = {};
    for (;;) {
      let cur = null;
      Object.keys(dist).forEach((k) => { if (!done[k] && (cur === null || dist[k] < dist[cur] || (dist[k] === dist[cur] && k < cur))) cur = k; });
      if (cur === null) return null;
      if (cur === to) break;
      done[cur] = true;
      Object.entries(edges(cur)).forEach(([nx, d]) => {
        if (!D.LOCS[nx] || done[nx]) return;
        const nd = dist[cur] + d;
        if (dist[nx] == null || nd < dist[nx]) { dist[nx] = nd; prev[nx] = cur; }
      });
    }
    const path = [to];
    while (path[0] !== from) path.unshift(prev[path[0]]);
    return path;
  };
  const days = (path) => path.slice(1).reduce((a, id, i) => a + (edges(path[i])[id] || 0), 0);

  // 依頼の行き先。{ q, to, why, path, next, days }（to が今いる場所なら next は null）
  G.questWays = (S) => {
    if (!S || !S.quests) return [];
    const guilds = Object.keys(D.LOCS).filter((k) => ((D.LOCS[k].fac) || []).includes("guild"));
    return S.quests.map((q) => {
      let to = q.loc, why = q.type === "deliver" ? "届け先" : "依頼の場所";
      if (q.done) {
        // 報告はどのギルドでもできる。いちばん近い町へ
        let best = null;
        guilds.forEach((g) => { const p = G.routeTo(S.loc, g); if (p && (!best || days(p) < days(best))) best = p; });
        if (!best) return null;
        to = best[best.length - 1]; why = "報告できるギルド";
        return { q, to, why, path: best, next: best[1] || null, days: days(best) };
      }
      const path = G.routeTo(S.loc, to);
      if (!path) return null;
      return { q, to, why, path, next: path[1] || null, days: days(path) };
    }).filter(Boolean);
  };

  // 旅立つボタンに付ける印。{ 行き先 id: "依頼の場所" | "依頼への道（迷いの森）" }
  G.travelMarks = (S) => {
    const out = {};
    G.questWays(S).forEach((w) => {
      if (!w.next || out[w.next]) return;
      out[w.next] = w.next === w.to ? w.why : `${w.why}への道（${D.LOCS[w.to].name}）`;
    });
    return out;
  };

  // 押せないボタンの理由（分かるものだけ。分からなければ ""）
  G.lockReason = (a, S) => {
    if (!a || !a.disabled || !S) return "";
    const txt = `${a.label || ""} ${a.sub || ""}`;
    const mp = txt.match(/MP\s*(\d+)/); // 「MP+6」（回復）は数字が続かないので当たらない
    if (mp && S.mp < +mp[1]) return "MP が足りない";
    const gold = txt.match(/(\d+)\s*G(?![a-zA-Z])/g);
    if (gold && gold.some((g) => S.gold < parseInt(g, 10))) return "所持金が足りない";
    if (/逃げられない|話が通じない/.test(txt)) return ""; // 理由がもう書いてある
    return "今は選べない";
  };

  G.hpDanger = (S) => !!(S && !S.over && S.maxHp && S.hp > 0 && S.hp <= Math.max(1, Math.floor(S.maxHp * 0.3)));

  // 遊び方の一行（その場面ではじめてのときだけ）。遊び方だけを書き、世界のことは書かない
  const TIPS = {
    town: "遊び方：下の選択肢を押して進める（数字キーでも選べる）。名声や善悪、仲間や持ち物によって、選べることが増えていく。はじめは冒険者ギルドで依頼を受けるか、町をぶらついてみるとよい。冒険は行動のたびに自動で保存される。",
    guild: "依頼は 3 件まで受けられる。行き先へ向かうボタンには印が付く。果たしたら、どこかのギルドで報告すると報酬がもらえる。",
    wild: "探索すると、出来事・敵・拾い物のどれかに出会う。傷が深いときは野営するか、町の宿で休む。",
    dungeon: "迷宮は「奥へ進む」ほど深くなり、最奥には主がいる。「入口まで引き返す」で外へ戻れる。",
    combat: "戦闘：手を 1 つ選ぶと、敵も動く。％は成功率。狙うのは赤い枠の敵。危ないときは「防御」「逃げる」や道具を。",
    event: "選ぶ手の下に、使う能力値と成功率が出る。",
    check: "判定の見方：出目（01〜00。00 は 100 と読む）が成功率以下なら成功。使った能力値は、判定のあとで伸びることがある。",
    hp: "HP が 0 になると死ぬ。宿・野営・薬草などで回復できる。",
  };
  G.PLAY_TIPS = TIPS;
  G.playTip = (S, P) => {
    if (!S || S.over) return null;
    const seen = (P && P.tips) || {};
    const L = D.LOCS[S.loc] || {};
    const want = [];
    if (G.hpDanger(S)) want.push("hp");
    if (S.log && S.log.some((e) => e.k === "dice")) want.push("check");
    if (S.mode === "combat") want.push("combat");
    else if (S.mode === "event") want.push("event");
    else if (S.mode === "fac" && S.fac === "guild") want.push("guild");
    else if (S.mode === "explore" || !S.mode) want.push(L.type === "town" ? "town" : L.type === "wild" ? "wild" : "dungeon");
    const key = want.find((k) => !seen[k]);
    return key ? { key, text: TIPS[key] } : null;
  };
})(globalThis.G = globalThis.G || {});
