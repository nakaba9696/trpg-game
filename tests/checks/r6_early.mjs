// R6：序盤の難しさ（src/engine/zzzzzzzzzzzzzz_r6_early.js）と商店の並び（src/engine/zzzzzzzzzzzzzz_r6_shop.js）
// - 駆け出しのうちは、出発地の近く（危険度 R6.DMAX まで）の探索・野営・旅の襲撃・その場の敵に、C 級以上が出ない
// - 守りは日がたつか名声が上がれば外れ、出現表そのもの（C 級が出る土地）は変わっていない。古いセーブ（S.r6 無し）は守らない
// - 旅の出来事は、駆け出しのうちは C 級以上と戦うものを引かない
// - 駆け出しが出会う D 級は弱め（f.r6）。C 級・ボスには付かない。作りたての 5 職業が D 級二匹（ゴブリン）に、素直な手で HP を半分以上残す
// - 商店の「買う」の先頭は薬草・回復薬。買えない物はすべて買える物の後ろ。武具より前にすぐ使う物、巻物は武具より後ろ
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("R6: " + m); };
  const G = loadEngine();
  const D = G.data;
  const R6 = G.r6;
  if (!R6 || !R6.guard || !R6.sortShop) { F("G.r6 が無い"); return; }
  const start = (cls, seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats(cls, G.rand);
    G.newGame({ cls, stats, caps, goal: "majin", profile: { name: "テスト", sex: "男", age: 20, history: "テスト", personality: "無口" } });
    return G.S;
  };
  const hard = (ids) => ids.filter((id) => R6.hard(id));
  const foesNow = (S) => (S.combat ? S.combat.foes.map((f) => f.id) : []);
  // 出発地から陸路で道のり 2 までの、危険度 R6.DMAX までの野の場所（C16：links は日数に直してあるので、元の道のり legs で測る）
  const nearWild = (home) => Object.entries(D.LOCS[home].legs || D.LOCS[home].links || {})
    .filter(([to, d]) => d <= 2 && D.LOCS[to].type !== "town" && (D.LOCS[to].danger || 0) <= R6.DMAX && (D.LOCS[to].pool || []).length).map(([to]) => to);

  // ---- 1. 出発地の近くの出会い
  const homes = [...new Set(Object.values(D.CLASSES).map((c) => c.start))];
  let tried = 0, hadHard = 0;
  for (const cls of Object.keys(D.CLASSES)) {
    const home = D.CLASSES[cls].start;
    for (const to of nearWild(home)) {
      if ((D.LOCS[to].pool || []).some((id) => R6.hard(id))) hadHard++;
      for (let s = 1; s <= 25; s++) {
        // 探索の出会い（その場所にいて）
        let S = start(cls, 6000 + s * 7 + to.length);
        S.loc = to; S.mode = "explore"; S.phase = s % 4;
        R6.wild(() => G.startCombat(G.w6.encounter(D.LOCS[to]), {}));
        tried++;
        if (hard(foesNow(S)).length) F(`${D.CLASSES[cls].name}：駆け出しのうちに ${D.LOCS[to].name} で ${hard(foesNow(S)).join("・")} に出会った`);
        // 旅の襲撃（出発地から）
        S = start(cls, 7000 + s * 7 + to.length);
        S.mode = "explore"; S.travel = to;
        S.w6 = { dest: to, from: home, sea: false, days: 2, danger: D.LOCS[to].danger, left: 0, raid: true, seen: [], tod: "昼" };
        G.w6.next();
        tried++;
        if (S.mode !== "combat") F(`${D.LOCS[to].name}への旅の襲撃が始まらない`);
        else if (hard(foesNow(S)).length) F(`${D.CLASSES[cls].name}：旅立ってすぐ、${D.LOCS[to].name}への道で ${hard(foesNow(S)).join("・")} に襲われた`);
        // 出来事の「その場の敵」
        S = start(cls, 8000 + s * 7 + to.length);
        S.loc = to;
        const ids = G.resolveFoes(["@pool", "@pool"]);
        if (hard(ids).length) F(`${D.LOCS[to].name}：駆け出しのうちの「その場の敵」に ${hard(ids).join("・")}`);
      }
    }
  }
  if (!tried) F("出発地の近くに野の場所が無い（確かめられない）");
  // 本物の行動（「あたりを探索する」・「野営して休む」）で出会う敵
  {
    let fights = 0;
    for (const cls of Object.keys(D.CLASSES)) {
      for (const to of nearWild(D.CLASSES[cls].start)) {
        const S = start(cls, 5000 + to.length);
        S.loc = to; S.mode = "explore";
        for (let k = 0; k < 40 && !S.over; k++) {
          S.hp = S.maxHp; S.day = S.r6.day; S.fame = 0;
          if (S.mode === "combat") { if (hard(foesNow(S)).length) F(`${D.LOCS[to].name}を探索して ${hard(foesNow(S)).join("・")} に出会った`); fights++; S.combat = null; }
          S.mode = "explore"; S.event = null; S.fac = null; S.loc = to; S.travel = null;
          G.act(k % 5 === 4 ? "camp" : "explore");
        }
      }
    }
    if (!fights) F("探索で一度も戦いにならない（確かめられない）");
  }
  // テストや出来事が直に呼ぶ戦い（野の行動の外）は替えない
  {
    const S = start("merc", 21);
    G.startCombat(["zombie", "zombie"], {});
    if (foesNow(S).join() !== "zombie,zombie") F("野の行動の外で直に始めた戦いの敵まで替えた");
  }
  if (!hadHard) F("出発地の近くの出現表に C 級が一つも無い（守りを確かめられない）");

  // ---- 2. 守りが外れる・出現表は変わっていない・古いセーブ
  {
    const home = homes.find((h) => nearWild(h).some((to) => D.LOCS[to].pool.some((id) => R6.hard(id))));
    const to = nearWild(home).find((x) => D.LOCS[x].pool.some((id) => R6.hard(id)));
    const cls = Object.keys(D.CLASSES).find((c) => D.CLASSES[c].start === home);
    const meet = (setup) => {
      let n = 0;
      for (let s = 1; s <= 60; s++) {
        const S = start(cls, 9000 + s);
        S.loc = to; S.mode = "explore";
        setup(S);
        R6.wild(() => G.startCombat(G.w6.encounter(D.LOCS[to]), {}));
        if (hard(foesNow(S)).length) n++;
      }
      return n;
    };
    if (!meet((S) => { S.day += R6.DAYS; })) F(`${R6.DAYS} 日たっても ${D.LOCS[to].name} に C 級が出ない（守りが外れない）`);
    if (!meet((S) => { S.fame = R6.FAME; })) F(`名声 ${R6.FAME} でも C 級が出ない（守りが外れない）`);
    if (!meet((S) => { delete S.r6; })) F("古いセーブ（S.r6 無し）でも守っている");
    try { const S = start(cls, 1); delete S.r6; R6.level(S); G.actions(); } catch (e) { F("古いセーブで止まる：" + e.message); }
    // 出来事の名指しの戦い（勝ったときの結果つき）は替えない
    const S = start(cls, 2);
    S.loc = to;
    const c = D.LOCS[to].pool.find((id) => R6.hard(id));
    G.startCombat([c], { win: { text: "テスト" } });
    if (foesNow(S)[0] !== c) F("結果つきの戦い（出来事・依頼）の敵まで替えた");
  }

  // ---- 3. 旅の出来事
  {
    const S = start("merc", 3);
    const home = S.loc;
    const to = nearWild(home)[0];
    S.travel = to;
    S.w6 = { dest: to, from: home, sea: false, days: 2, danger: 3, left: 1, raid: false, seen: [], tod: "昼" };
    const all = (G.w6.pool && D.EVENTS.filter((e) => e.w6)) || [];
    if (!all.some((e) => R6.hardEvent(e))) F("C 級以上と戦う旅の出来事が見当たらない（確かめられない）");
    ["朝", "昼", "夕", "夜"].forEach((tod) => {
      S.w6.tod = tod;
      const p = G.w6.pool(S).filter((e) => R6.hardEvent(e));
      if (p.length) F(`駆け出しのうちに、C 級以上と戦う旅の出来事を引ける：${p.map((e) => e.id).join("・")}`);
    });
  }

  // ---- 4. D 級の強さ
  {
    let S = start("merc", 4);
    S.loc = nearWild(S.loc)[0];
    R6.wild(() => G.startCombat(["goblin", "goblin"], {}));
    const f = S.combat.foes[0];
    if (!(f.r6 > 0)) F("駆け出しが出会ったゴブリンに弱め方（f.r6）が付いていない");
    else if (!(G.foeData(f).hit < D.ENEMIES.goblin.hit)) F("駆け出しが出会ったゴブリンの命中が下がっていない");
    S = start("merc", 5);
    G.startCombat(["zombie"], { win: { text: "テスト" } });
    if (S.combat.foes.some((x) => x.r6)) F("C 級に弱め方が付いた");
    S = start("merc", 6);
    S.day += R6.DAYS;
    R6.wild(() => G.startCombat(["goblin"], {}));
    if (S.combat.foes.some((x) => x.r6)) F(`${R6.DAYS} 日たっても弱め方が付く`);
    // 作りたての 5 職業：ゴブリン二匹に素直な手（攻撃。魔法使いは炎、破戒神官は深手なら癒し。薬も逃げるも使わない）
    for (const cls of Object.keys(D.CLASSES)) {
      const left = []; let dead = 0;
      for (let i = 0; i < 20; i++) {
        const S = start(cls, 610000 + i * 17 + cls.length * 1000);
        R6.wild(() => G.startCombat(["goblin", "goblin"], {}));
        for (let k = 0; k < 80 && S.mode === "combat" && !S.over; k++) {
          const can = (id) => G.actions().flatMap((x) => x.list).some((a) => a.id === id && !a.disabled);
          G.act(cls === "mage" && can("cb:fire") ? "cb:fire" : cls === "priest" && S.hp < S.maxHp * 0.4 && can("cb:heal") ? "cb:heal" : "cb:attack");
        }
        if (S.over === "dead") dead++;
        left.push(S.over ? 0 : S.hp / S.maxHp);
      }
      left.sort((a, b) => a - b);
      const med = left[Math.floor(left.length / 2)];
      if (med < 0.5 || dead > 1) F(`${D.CLASSES[cls].name}：ゴブリン二匹で HP の残りが ${Math.round(med * 100)}%（中央）・倒れたのが ${dead}/20`);
    }
  }

  // ---- 5. 商店の並び
  for (const home of homes) {
    for (const gold of [0, 40, 100000]) {
      const cls = Object.keys(D.CLASSES).find((c) => D.CLASSES[c].start === home);
      const S = start(cls, 11);
      S.gold = gold;
      G.act("fac:shop");
      if (S.mode !== "fac" || S.fac !== "shop") { F(`${D.LOCS[home].name}の商店に入れない`); break; }
      const g = G.actions().find((x) => x.title === "買う");
      if (!g) { F(`${D.LOCS[home].name}の商店に「買う」が無い`); break; }
      const ids = g.list.map((a) => a.id.replace("shop:buy:", ""));
      const where = `${D.LOCS[home].name}（${gold}G）`;
      if (ids[0] !== "herb") F(`${where}：「買う」の先頭が薬草でない（${ids.slice(0, 3).join("・")}）`);
      const firstOff = g.list.findIndex((a) => a.disabled);
      if (firstOff >= 0 && g.list.slice(firstOff).some((a) => !a.disabled)) F(`${where}：買えない物の後ろに買える物がある`);
      [true, false].forEach((off) => {
        const part = g.list.filter((a) => !!a.disabled === off).map((a) => a.id.replace("shop:buy:", ""));
        const r = part.map((id) => R6.shopRank(id));
        if (r.some((x, i) => i && x < r[i - 1])) F(`${where}：すぐ使う物・武具・巻物の順になっていない（${part.join("・")}）`);
        const scroll = part.findIndex((id) => D.ITEMS[id] && D.ITEMS[id].type === "k1scroll");
        const arms = part.map((id, i) => (D.ITEMS[id] && ["weapon", "armor"].includes(D.ITEMS[id].type) ? i : -1)).filter((i) => i >= 0);
        if (scroll >= 0 && arms.some((i) => i > scroll)) F(`${where}：巻物が武具より前にある`);
      });
      if (gold >= 30 && !g.list.slice(0, 2).every((a) => !a.disabled)) F(`${where}：薬草・回復薬が買えるのに、先頭で買えるようになっていない`);
    }
  }

  // ---- 6. 最初に会う敵に、初期装備の物理の種類で相性負けしない（出発地から 1 日の危険度 1 の野の、昼に出る D 級）
  for (const [cls, C] of Object.entries(D.CLASSES)) {
    const w = D.ITEMS[C.weapon] || {};
    const types = [].concat(w.dtype || []);
    for (const [to, d] of Object.entries(D.LOCS[C.start].legs || D.LOCS[C.start].links || {})) {
      const L = D.LOCS[to];
      if (d > 2 || L.type === "town" || (L.danger || 0) > 1) continue;
      [...(L.pool || []), ...(L.e4pool || [])].forEach((id) => {
        const e = D.ENEMIES[id];
        if (!e || !R6.isD(id) || (e.when && e.when.night) || !e.aff || !types.length) return;
        if (types.every((t) => (e.aff[t] == null ? 1 : e.aff[t]) < 1)) F(`${C.name}の${w.name}が、${L.name}の${e.name}に通りにくい（${types.join("・")}）`);
      });
    }
  }

  // ---- 7. 危険度 1 の野で昼に出る D 級は、斬撃が通りにくくない（学びとしての相性は危険度 2 から。夜だけ出る者は除く）
  for (const L of Object.values(D.LOCS)) {
    if ((L.danger || 0) !== 1 || L.type === "town") continue;
    [...(L.pool || []), ...(L.e4pool || [])].forEach((id) => {
      const e = D.ENEMIES[id];
      if (!e || e.boss || !R6.isD(id) || (e.when && e.when.night)) return;
      if (G.dmgMod(id, "slash") < 1) F(`${L.name}の${e.name}（昼・D 級）に斬撃が通りにくい`);
    });
  }
  // ---- 8. 戦闘の札：効き目がふつう（等倍）の種類に「通りが悪い」を付けない
  {
    const S = start("merc", 31);
    S.maxHp = S.hp = 999;
    const foe = "e4_thornboar";
    if (G.e12 && G.e12.learn) G.e12.learn(foe, "slash");
    G.startCombat([foe], {});
    const a = G.actions().flatMap((g) => g.list).find((x) => x.id === "cb:attack");
    if (G.dmgMod(foe, "slash") === 1 && a && /通りが悪い/.test(a.sub || "")) F(`等倍の斬撃の札に「通りが悪い」が付く（${a.sub}）`);
    if (G.e12 && G.e12.feel && G.e12.feel(S.combat.foes[0], "slash") !== "") F("等倍の効き目に一言が付く");
  }

  if (!bad) ok(`R6 序盤：出発地の近くの出会い ${tried} 回に C 級なし・守りは日と名声で外れる・旅の出来事・D 級の強さ・商店の先頭は薬草`);
};
