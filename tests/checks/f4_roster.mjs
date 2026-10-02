// F4：冒険ごとの顔ぶれ・図鑑の「仲間にする方法」・狙う印（src/data/f4_roster.js・engine/zz_f4_roster.js・ui/f4_roster.js）
// - seed ごとに顔ぶれが変わり、同じ seed なら同じ。always の人は必ず居る。居ない人の出会いの出来事は起きず、居場所が移った人は移った先で起きる
// - 偏りすぎない（50 人規模の作り物のデータで、地域・性別がすべて片寄る回が無い）。50 人規模でも速い
// - 狙った人は居る確率が上がる（必ずではない）
// - 仲間にすると、方法が図鑑（profile）に残り、新しい冒険でも見える。会っただけだとぼかした一行だけ。joinHint で上書きできる
// - 古いセーブ（S.f4 が無い）・古い profile（G.P.f4 が無い）で動く
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("F4: " + m); };
  const start = (G, seed) => {
    const D = G.data;
    G.rand = seeded(seed);
    const cls = Object.keys(D.CLASSES)[0];
    return G.newGame({ cls, stats: Object.fromEntries(D.STATS.map((k) => [k, 50])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), profile: { name: "試し", age: 20, sex: "男", history: "旅の者" }, goal: Object.keys(D.GOALS)[0] });
  };

  // ---------------------------------------------------------------- 顔ぶれ
  {
    const G = loadEngine();
    const D = G.data;
    const F4 = G.f4;
    const cands = F4.candidates();
    const always = Object.keys(D.C2_PEOPLE).filter((id) => F4.joinable(id) && F4.always(id));
    if (!always.length) F("always の人がいない");
    for (const id of D.F4_ALWAYS) if (!F4.joinable(id)) F(`D.F4_ALWAYS の ${id} が仲間になる人でない`);
    for (const [id, ls] of Object.entries(D.F4_PLACES)) for (const l of ls) if (!D.LOCS[l]) F(`${id} の居場所の候補 ${l} が無い`);
    const sets = new Set();
    for (let s = 1; s <= 40; s++) {
      const S = start(G, s);
      if (!S.f4 || !S.f4.cast) { F("新しい冒険に S.f4 が無い"); break; }
      for (const id of always) if (!F4.present(id, S)) F(`seed ${s}: always の ${id} が居ない`);
      const inCast = cands.filter((id) => F4.present(id, S));
      if (cands.length >= 3 && (inCast.length === 0 || inCast.length === cands.length)) F(`seed ${s}: 候補が全員居るか、誰も居ない（${inCast.length}／${cands.length}）`);
      sets.add(inCast.join(","));
      // 居ない人の出会いの出来事は起きない。居場所が移った人の出来事は移った先
      const evs = F4.eventsNow(S);
      for (const id of cands) {
        const has = evs.some((e) => [].concat(e.c2 || [])[0] === id && e.w > 0);
        if (!F4.present(id, S) && has) F(`seed ${s}: 居ない ${id} の出来事が起きうる`);
        const at = F4.at(id, S);
        if (at && F4.present(id, S)) {
          const mine = evs.filter((e) => [].concat(e.c2 || [])[0] === id && e.w > 0 && !e.c2talk);
          if (!mine.some((e) => e.where.every((w) => at.includes(w)))) F(`seed ${s}: ${id} の出会いの出来事が居場所 ${at} に移っていない`);
          if (!F4.home(id, S).every((l) => at.includes(l) || !D.LOCS[l] || D.LOCS[l].type !== "town")) F(`seed ${s}: ${id} を誘う町が居場所に合っていない`);
        }
      }
    }
    if (sets.size < 5) F(`seed を変えても顔ぶれがあまり変わらない（40 回で ${sets.size} 通り）`);
    const a = start(G, 7), b = start(G, 7);
    if (JSON.stringify(a.f4.cast) !== JSON.stringify(b.f4.cast)) F("同じ seed で顔ぶれが違う");
    if (!n) ok(`F4 顔ぶれ（候補 ${cands.length}・毎回居る ${always.length}・40 回で ${sets.size} 通り）`);
  }

  // ---------------------------------------------------------------- 狙う印
  {
    const G = loadEngine();
    const F4 = G.f4;
    const cands = F4.candidates();
    const id = cands[0];
    let base = 0, want = 0;
    const N = 300;
    for (let s = 1; s <= N; s++) { G.P = { trophies: {}, graves: [] }; if (F4.present(id, start(G, s))) base++; }
    G.P = { trophies: {}, graves: [], codex: { items: {}, foes: {}, people: { [id]: { at: 1, ev: 1, rels: {} } } } };
    if (!F4.setWant(id, true)) F("会った人に狙う印を付けられない");
    for (let s = 1; s <= N; s++) { if (F4.present(id, start(G, s))) want++; }
    if (!(want > base * 1.25)) F(`狙っても居る確率が上がらない（${base}/${N} → ${want}/${N}）`);
    if (want >= N) F("狙った人が必ず居る（必ずではないはず）");
    // 印は三人まで。会ったことも噂も無い人には付けられない
    G.P = { trophies: {}, graves: [] };
    if (F4.setWant(id, true)) F("会っていない人に狙う印が付いた");
    // 噂：狙った人は噂に出やすい
    let hit = 0, tries = 0;
    G.P = { trophies: {}, graves: [], codex: { items: {}, foes: {}, people: { [id]: { at: 1, ev: 1, rels: {} } } } };
    F4.setWant(id, true);
    for (let s = 1; s <= 200; s++) {
      const S = start(G, 1000 + s);
      if (!F4.present(id, S)) continue;
      tries++;
      const r = F4.rumor(S);
      if (r && r.id === id) hit++;
    }
    const fair = 1 / Math.max(1, F4.cast(start(G, 1)).length - 2);
    if (tries && hit / tries < Math.max(0.3, fair * 1.5)) F(`狙った人の噂が出やすくない（${hit}/${tries}）`);
    if (!n) ok(`F4 狙う（居る回 ${base}/${N} → ${want}/${N}・狙った人の噂 ${hit}/${tries}）`);
  }

  // ---------------------------------------------------------------- 仲間にする方法（図鑑）
  {
    const G = loadEngine();
    const D = G.data;
    const F4 = G.f4;
    const before = n;
    for (const id of Object.keys(D.C2_PEOPLE).filter(F4.joinable)) {
      const how = G.f4How(id);
      if (!how || !how.ways.length || !how.ways[0].length) { F(`${id}: 仲間にする方法が組み立てられない`); continue; }
      if (!F4.routes(id).length) F(`${id}: 加わる出来事の流れが見つからない`);
      if (!how.vague || /undefined|null|\{/.test(how.vague + how.ways.flat().join(""))) F(`${id}: 方法の文が変 ${how.vague}`);
      // ぼかした一行に、仲間になる選択肢の言葉（全部見せる方の中身）が入っていない
      const last = how.ways[0][how.ways[0].length - 1];
      if (how.vague.includes(last)) F(`${id}: ぼかした一行に方法がそのまま出ている`);
    }
    // ルイは「ディルを連れていると」が見える（条件を試しに呼んで分かる）
    if (D.C2_PEOPLE.rui && !G.f4How("rui").ways.flat().join("").includes("ディル")) F("ルイの方法に、連れている人の条件が出ていない");
    // joinHint で上書き
    const any = Object.keys(D.C2_PEOPLE).find(F4.joinable);
    D.C2_PEOPLE[any].joinHint = { full: "試しの方法", vague: "試しのぼかし" };
    const hh = G.f4How(any);
    if (hh.ways[0][0] !== "試しの方法" || hh.vague !== "試しのぼかし") F("joinHint で上書きできない");
    delete D.C2_PEOPLE[any].joinHint;
    if (n === before) ok("F4 仲間にする方法をデータから組み立てる（全員・joinHint で上書き）");
  }

  // ---------------------------------------------------------------- 仲間にすると profile に残り、新しい冒険でも見える。会っただけだとぼかし
  {
    const G = loadEngine();
    const D = G.data;
    const F4 = G.f4;
    const before = n;
    G.P = { trophies: {}, graves: [] };
    // 毎回居る人を、出会いの流れのとおりに仲間にする
    const id = "nora" in D.C2_PEOPLE ? "nora" : D.F4_ALWAYS[0];
    const S = start(G, 3);
    const route = F4.routes(id)[0];
    S.loc = Object.keys(D.LOCS).find((l) => route[0].e.where.includes(l)) || S.loc;
    G.startEvent(route[0].e.id);
    if (!G.codexPerson(id)) F("出会っても図鑑に載らない");
    if (!Object.keys(G.codexPerson(id).places || {}).includes(S.loc)) F("会った場所が図鑑に残らない");
    if (G.codexPerson(id).joined) F("会っただけで仲間になった扱い");
    G.c2Join(id);
    if (!G.c2Has(id)) F(`${id} を仲間にできない`);
    if (!G.codexPerson(id).joined) F("仲間にしても図鑑に残らない");
    // profile を保存して読み直し（JSON）、新しい冒険
    const saved = JSON.parse(JSON.stringify(G.P));
    const G2 = loadEngine();
    G2.P = saved;
    start(G2, 99);
    const rec = G2.codexPerson(id);
    if (!rec || !rec.joined || !Object.keys(rec.places || {}).length) F("新しい冒険で、仲間にした記録と会った場所が見えない");
    if (!G2.f4.metPlaces(id).length) F("会ったことのある場所の名前が出ない");
    // まとめ（claude.ai とブラウザの両方に残っていたとき）でも残る
    const m = G2.codexMerge({ people: {} }, saved.codex);
    if (!m.people[id] || !m.people[id].places || !m.people[id].joined) F("図鑑をまとめると会った場所が消える");
    // 古い profile と古いセーブ
    const G3 = loadEngine();
    G3.P = { trophies: {}, graves: [] };
    const S3 = start(G3, 5);
    delete S3.f4;
    for (const c of F4.candidates()) if (!G3.f4.present(c, S3)) F("古いセーブ（S.f4 が無い）で居ない人がいる");
    G3.randomEvent();
    if (!G3.f4How(id) || G3.f4Count().joined !== 0) F("古い profile で数が変");
    if (n === before) ok("F4 仲間にした方法と会った場所が profile に残り、新しい冒険で見える・古いセーブで動く");
  }

  // ---------------------------------------------------------------- 50 人規模：偏らない・速い
  {
    const G = loadEngine();
    const D = G.data;
    const F4 = G.f4;
    const before = n;
    const towns = Object.keys(D.LOCS).filter((l) => D.LOCS[l].type === "town");
    const base = D.C2_PEOPLE[F4.candidates()[0]];
    const kinds = ["adventurer", "noble", "mage", "knight", "villager", "merchant"];
    for (let i = 0; i < 40; i++) {
      const id = "f4t" + i;
      const home = towns[i % towns.length];
      D.C2_PEOPLE[id] = Object.assign({}, base, { name: "試し" + i, sex: i % 3 ? "女" : "男", race: ["human", "elf", "beast"][i % 3], who: Object.assign({}, base.who, { kind: kinds[i % kinds.length] }), join: Object.assign({}, base.join, { home: [home] }) });
      D.EVENTS.push({ id: "f4t_ev" + i, where: [home], w: 2, once: true, c2: id, title: "試し", choices: [{ label: "誘う", ok: { text: "来た。", c2join: id } }] });
    }
    const cands = F4.candidates();
    const t0 = Date.now();
    const regionsAll = new Set(cands.map(F4.region));
    let worst = 0;
    for (let s = 1; s <= 60; s++) {
      const S = start(G, 500 + s);
      const inCast = cands.filter((id) => F4.present(id, S));
      if (inCast.length < cands.length * 0.3 || inCast.length > cands.length * 0.55) F(`50 人規模で、居る人数が変（${inCast.length}／${cands.length}）`);
      const men = inCast.filter((id) => D.C2_PEOPLE[id].sex === "男").length / inCast.length;
      const menAll = cands.filter((id) => D.C2_PEOPLE[id].sex === "男").length / cands.length;
      worst = Math.max(worst, Math.abs(men - menAll));
      const regs = new Set(inCast.map(F4.region));
      if (regs.size < Math.min(regionsAll.size, 3)) F(`seed ${s}: 地域が片寄った（${[...regs]}）`);
      for (let k = 0; k < 20; k++) G.randomEvent();
    }
    if (worst > 0.25) F(`性別の割合が片寄る回がある（最大のずれ ${worst.toFixed(2)}）`);
    G.f4How("f4t0");
    const ms = Date.now() - t0;
    if (ms > 4000) F(`50 人規模で遅い（60 回の冒険の始まり＋出来事 1200 回で ${ms}ms）`);
    if (n === before) ok(`F4 50 人規模（候補 ${cands.length}・地域 ${regionsAll.size}・性別のずれ最大 ${worst.toFixed(2)}・${ms}ms）`);
  }
};
