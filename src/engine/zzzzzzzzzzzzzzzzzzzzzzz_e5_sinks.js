// E5：余る消耗品の使い道と売り先・終盤に貯まる金の大きな出口（T5 の報告 docs/review/economy_2026-10-12.md）。数値と語りは src/data/e5_sinks.js（D.E5・D.E5_TEXT）。
//   入口：敵が落とす確率（D.ENEMIES の loot）と、出来事・場所の結果で手に入る数（G.apply の item）を D.E5.trim だけ減らす。店・施設・依頼の報酬は減らさない
//   野営：食べ物を一つ食べる・安酒を一杯（G.exploreAct の camp を包む）。二日以上の旅：晩ごとに食べ物を一つ（非常用は残す）・安酒を一杯
//   施設（「頼む・納める」の欄）：店（調合・仲間の武具）・教会（施療院〔薬草・回復薬〕・孤児院・聖水・普請への寄進）・酒場（宴・賽子）・宿（空き家・家を直す）・学院（魔力の水）
//   町：家を持っていれば「家に帰って休む」（ただで宿と同じに休める）
//   出来事の結果に書けるもの：e5feed: n（食べ物を n 個まで手放す）
// 名前の頭の z は、施設の行動を包むほかのファイル（C10・F4・U38 など）より後に読ませるため。ギルドの依頼の表には触らない（W9 と並行）。レーン E
(function (G) {
  const D = G.data;
  const E = D.E5;
  const T = D.E5_TEXT;
  const X = (G.e5 = G.e5 || {});

  // ---------------------------------------------------------------- セーブの中（古いセーブで無くても動く）
  X.state = (S) => {
    S = S || G.S;
    if (!S.e5 || typeof S.e5 !== "object") S.e5 = {};
    const x = S.e5;
    x.build = x.build || {};
    x.feast = x.feast || {};
    if (x.day !== S.day || !x.used) { x.day = S.day; x.used = {}; }
    return x;
  };
  const used = (S, k) => !!X.state(S).used[k];
  const mark = (S, k, n) => { const u = X.state(S).used; u[k] = (u[k] || 0) + (n || 1); };
  const pick = (v) => (Array.isArray(v) ? G.pick(v) : v);
  const short = (c) => (G.m2Short ? G.m2Short(c) : String(c.name).replace(/^.*の/, ""));
  const capital = (L) => !!(L && L.capital);
  const nation = () => (G.nationOf ? G.nationOf() : null);
  const addRep = (n) => { const k = nation(); if (k && n) G.repOf(k).rep += n; };

  // 食べ物（多く持っているものから）
  X.foods = (S) => {
    S = S || G.S;
    return E.camp.food.filter((id) => D.ITEMS[id] && (S.inv[id] || 0) > 0).sort((a, b) => (S.inv[b] || 0) - (S.inv[a] || 0));
  };
  X.foodCount = (S) => X.foods(S).reduce((a, id) => a + (S || G.S).inv[id], 0);
  // 食べ物を n 個まで手放す。手放した数を返す
  X.giveFood = (n) => {
    const S = G.S;
    let k = 0;
    const lost = {};
    while (k < n) {
      const id = X.foods(S)[0];
      if (!id || !G.take(id)) break;
      lost[id] = (lost[id] || 0) + 1;
      k++;
    }
    const s = Object.entries(lost).map(([id, m]) => `${D.ITEMS[id].name}${m > 1 ? " ×" + m : ""}`).join("・");
    if (s) G.note(`${s}を手放した。`);
    return k;
  };

  // ---------------------------------------------------------------- 入口を細くする
  // 敵の落とし物：確率を掛ける（乱数を引く回数は今までと同じ）
  X.trimLoot = () => {
    Object.values(D.ENEMIES || {}).forEach((e) => {
      if (!e || !Array.isArray(e.loot) || e._e5) return;
      e._e5 = true;
      e.loot = e.loot.map((x) => (Array.isArray(x) && E.trim[x[0]] ? [x[0], x[1] * (1 - E.trim[x[0]]), ...x.slice(2)] : x));
    });
  };
  X.trimLoot();

  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (!o || !S || S.over) return apply0(o);
    // 出来事・場所の結果の品：一つずつ間引く（施設の中は間引かない）
    if (o.item && S.mode !== "fac") {
      const items = typeof o.item === "string" ? { [o.item]: 1 } : o.item;
      if (Object.keys(items).some((id) => E.trim[id])) {
        const out = {};
        Object.entries(items).forEach(([id, n]) => {
          let k = n;
          if (E.trim[id]) { k = 0; for (let i = 0; i < n; i++) if (G.rand() >= E.trim[id]) k++; }
          if (k > 0) out[id] = k;
        });
        o = { ...o };
        if (Object.keys(out).length) o.item = out;
        else delete o.item;
      }
    }
    const r = apply0(o);
    if (o.e5feed && !G.S.over) X.giveFood(o.e5feed);
    return r;
  };

  // ---------------------------------------------------------------- 野営で食べる
  X.campMeal = () => {
    const S = G.S;
    const id = X.foods(S)[0];
    if (id && G.take(id)) {
      const hp = D.ITEMS[id].hp || 0;
      G.note(`${T.camp.replace("{f}", D.ITEMS[id].name)}（${D.ITEMS[id].name} -1${hp ? "・HP+" + hp : ""}）`);
      if (hp) G.heal(hp);
      if (D.ITEMS[id].mp) S.mp = G.clamp(S.mp + D.ITEMS[id].mp, 0, S.maxMp);
    }
    const sane = G.sanityOf ? G.sanityOf(S) : 100;
    if ((S.inv.ale || 0) > 0 && G.addSanity && sane < E.camp.aleBelow && G.take("ale")) {
      G.note(`${T.campAle}（安酒 -1）`);
      G.addSanity(E.camp.ale, true);
    }
  };

  // 旅の道中で食べる（二日以上の旅。晩ごとに一つ。非常用に D.E5.road.keep 個は残す）
  X.roadMeals = (days) => {
    const S = G.S;
    const lost = {};
    let hp = 0;
    for (let i = 1; i < days && X.foodCount(S) > E.road.keep; i++) {
      const id = X.foods(S)[0];
      if (!G.take(id)) break;
      lost[id] = (lost[id] || 0) + 1;
      hp += D.ITEMS[id].hp || 0;
    }
    const s = Object.entries(lost).map(([id, m]) => `${D.ITEMS[id].name}${m > 1 ? " ×" + m : ""}`).join("・");
    if (s) { G.note(`${T.road.replace("{f}", s)}（HP+${hp}）`); G.heal(hp); }
    const sane = G.sanityOf ? G.sanityOf(S) : 100;
    if (days >= 2 && (S.inv.ale || 0) > 0 && G.addSanity && sane < E.camp.aleBelow && G.take("ale")) { G.note(`${T.roadAle}（安酒 -1）`); G.addSanity(E.camp.ale, true); }
  };

  // ---------------------------------------------------------------- 家
  X.home = (S) => { S = S || G.S; return S.e5 && S.e5.home && D.LOCS[S.e5.home.loc] ? S.e5.home : null; };
  X.homeHere = (S) => { S = S || G.S; const h = X.home(S); return h && h.loc === S.loc ? h : null; };
  X.homeOk = (S) => { S = S || G.S; const L = D.LOCS[S.loc]; return !!(L && L.type === "town" && (L.fac || []).includes("inn") && nation()); };
  X.homeCost = (S) => (capital(D.LOCS[(S || G.S).loc]) ? E.home.capital : E.home.cost);

  function homeRest() {
    const S = G.S;
    const h = X.homeHere(S);
    if (!h) return;
    G.log("you", "家に帰って休む");
    G.sleep();
    S.hp = S.maxHp; S.mp = S.maxMp; S.clungUsed = false;
    S.conds = S.conds.filter((c) => c !== "毒");
    G.say(pick(T.houseRest));
    G.note("HP と MP が全快した。");
    const lv = Math.min(h.lv || 0, E.home.sanity.length - 1);
    if (G.addSanity && E.home.sanity[lv]) G.addSanity(E.home.sanity[lv], true);
    if (E.home.bond[lv] && G.m2Bond) (S.companions || []).forEach((c) => G.m2Bond(c, E.home.bond[lv], true));
  }

  const exActs0 = G.exploreActions;
  G.exploreActions = () => {
    const g = exActs0();
    const S = G.S;
    if (S.mode === "explore" && X.homeHere(S) && g[0] && g[0].list) {
      g[0].list.push({ id: "e5home:rest", label: "家に帰って休む", sub: "HP/MP 全快・毒が抜ける", kw: ["家", "休", "寝", "帰"] });
    }
    return g;
  };
  const exAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head === "e5home") { homeRest(); return; }
    const S = G.S;
    if (head === "camp" && S.mode === "explore") X.campMeal();
    if (head !== "travel" && head !== "sail") return exAct0(head, arg, a);
    const d0 = S.day;
    const r = exAct0(head, arg, a);
    if (!S.over && S.day - d0 >= 2) X.roadMeals(S.day - d0);
    return r;
  };

  // ---------------------------------------------------------------- 施設の「頼む・納める」
  const TITLES = { shop: "頼む", church: "施療院・孤児院・寄進", tavern: "振る舞う・売る", inn: "住まい", academy: "買い取り" };
  X.facList = (S) => {
    S = S || G.S;
    const f = S.fac;
    const L = D.LOCS[S.loc];
    const out = [];
    const herb = S.inv.herb || 0;
    if (f === "shop") {
      if (herb >= E.brew.herb) out.push({ id: "e5:brew", label: "薬草を回復薬に調合してもらう", sub: `薬草 ${E.brew.herb}・${E.brew.fee}G → 回復薬`, disabled: S.gold < E.brew.fee, kw: ["調合", "薬"] });
      (S.companions || []).forEach((c, i) => {
        const n = c.e5gear || 0;
        if (n >= E.gear.cost.length || (c.power || 30) >= E.gear.max) return;
        const cost = E.gear.cost[n];
        out.push({ id: "e5:gear:" + i, label: `${short(c)}の武具を誂える`, sub: `${cost}G・腕前 ${G.allyPt(c)}${n ? `・${n}度目` : ""}`, disabled: S.gold < cost, kw: ["誂", "武具", "仲間", short(c)] });
      });
    } else if (f === "church") {
      const left = E.infirm.max - (X.state(S).used.infirm || 0);
      if (herb > 0 && left > 0) out.push({ id: "e5:infsell", label: "施療院に薬草を買い取ってもらう", sub: `一つ ${E.infirm.price}G・${Math.min(herb, left, E.infirm.sell)} 個`, kw: ["施療院", "薬草", "売"] });
      const pLeft = E.infirmPotion.max - (X.state(S).used.infpot || 0);
      if ((S.inv.potion || 0) > 0 && pLeft > 0) out.push({ id: "e5:infpot", label: "施療院に回復薬を買い取ってもらう", sub: `一つ ${E.infirmPotion.price}G`, kw: ["施療院", "回復薬", "売"] });
      if (herb >= E.infirm.give && left >= E.infirm.give) out.push({ id: "e5:infgive", label: "施療院に薬草を納める", sub: `薬草 ${E.infirm.give}`, kw: ["施療院", "薬草", "納"] });
      if (X.foodCount(S) >= E.orphan.need) out.push({ id: "e5:orphan", label: "孤児院に食べ物を届ける", sub: `食べ物 ${Math.min(E.orphan.max, X.foodCount(S))}${used(S, "orphan") ? "・今日はもうした" : ""}`, disabled: used(S, "orphan"), kw: ["孤児院", "食べ物", "届"] });
      if ((S.inv.manawater || 0) >= E.holy.mana && D.ITEMS.holywater) out.push({ id: "e5:holy", label: "魔力の水を聖水にしてもらう", sub: `魔力の水 ${E.holy.mana} → 聖水`, kw: ["聖水", "魔力の水"] });
      const stage = X.state(S).build[S.loc] || 0;
      if (stage < E.build.cost.length && S.gold >= E.build.cost[stage] / 2) {
        const cost = E.build.cost[stage];
        out.push({ id: "e5:build", label: "教会の普請に寄進する", sub: `${cost}G・名声とこの国の評判${used(S, "build") ? "・今日はもうした" : ""}`, disabled: S.gold < cost || used(S, "build"), kw: ["寄進", "普請", "寄付"] });
      }
    } else if (f === "tavern") {
      const cost = capital(L) ? E.feast.capital : E.feast.cost;
      const last = X.state(S).feast[S.loc];
      if (S.gold >= cost / 2 && !(last !== undefined && S.day - last < E.feast.every)) out.push({ id: "e5:feast", label: "店じゅうに酒を振る舞う", sub: `${cost}G・名声・仲間の好感度`, disabled: S.gold < cost, kw: ["宴", "振る舞", "おごる"] });
      if ((S.inv.m7_chipdie || 0) > 0) out.push({ id: "e5:dice", label: "欠けた賽子を博打打ちに売る", sub: `${E.dice.price}G`, kw: ["賽子", "売"] });
    } else if (f === "inn") {
      const h = X.home(S);
      if (h && h.loc === S.loc) {
        const lv = h.lv || 0;
        if (lv < E.home.fix.length && S.gold >= E.home.fix[lv] / 2) out.push({ id: "e5:fix", label: lv ? "家を広げる" : "大工を頼んで家を直す", sub: `${E.home.fix[lv]}G`, disabled: S.gold < E.home.fix[lv], kw: ["家", "直", "広げ"] });
      } else if (X.homeOk(S) && S.gold >= X.homeCost(S) * E.home.showAt) {
        out.push({ id: "e5:house", label: "宿の主人に空き家を世話してもらう", sub: `${X.homeCost(S)}G・この町で、ただで休める${h ? "・前の家は譲る" : ""}`, disabled: S.gold < X.homeCost(S), kw: ["家", "空き家", "買"] });
      }
    } else if (f === "academy") {
      const left = E.academy.max - (X.state(S).used.mana || 0);
      if ((S.inv.manawater || 0) > 0 && left > 0) out.push({ id: "e5:mana", label: "講師に魔力の水を買い取ってもらう", sub: `一つ ${E.academy.mana}G・${Math.min(S.inv.manawater, left)} 個`, kw: ["魔力の水", "売"] });
    }
    return out;
  };

  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    const list = X.facList(S);
    if (!list.length) return g;
    g.splice(Math.max(0, g.length - 1), 0, { title: TITLES[S.fac] || "頼む", list });
    return g;
  };

  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    if (head !== "e5") return facAct0(head, arg, a);
    const S = G.S;
    const L = D.LOCS[S.loc];
    const [k, n] = String(arg).split(":");
    if (k === "brew") {
      if ((S.inv.herb || 0) < E.brew.herb || S.gold < E.brew.fee) return;
      G.take("herb", E.brew.herb); S.gold -= E.brew.fee; G.give("potion");
      G.log("you", "薬草を回復薬に調合してもらう");
      G.say(pick(T.brew));
      G.note(`薬草 -${E.brew.herb}・所持金 -${E.brew.fee}G・回復薬を手に入れた。`);
    } else if (k === "gear") {
      const c = (S.companions || [])[+n];
      const m = c ? c.e5gear || 0 : 99;
      if (!c || m >= E.gear.cost.length || S.gold < E.gear.cost[m]) return;
      const a0 = G.allyPt(c);
      S.gold -= E.gear.cost[m];
      c.e5gear = m + 1;
      c.power = Math.min(E.gear.max, (c.power || 30) + E.gear.power);
      G.log("you", `${short(c)}の武具を誂える`);
      G.say(pick(T.gear).replace(/\{n\}/g, short(c)));
      G.note(`所持金 -${E.gear.cost[m]}G・${short(c)}の腕前 ${a0}→${G.allyPt(c)}`);
      if (G.m2Bond) G.m2Bond(c, 1);
    } else if (k === "infsell") {
      const x = X.state(S);
      const q = Math.min(S.inv.herb || 0, E.infirm.sell, E.infirm.max - (x.used.infirm || 0));
      if (q <= 0) return;
      G.take("herb", q); S.gold += q * E.infirm.price; mark(S, "infirm", q);
      G.log("you", "施療院に薬草を買い取ってもらう");
      G.say(T.infirmSell);
      G.note(`薬草 -${q}・所持金 +${q * E.infirm.price}G`);
    } else if (k === "infpot") {
      if (!(S.inv.potion > 0) || (X.state(S).used.infpot || 0) >= E.infirmPotion.max) return;
      G.take("potion"); S.gold += E.infirmPotion.price; mark(S, "infpot");
      G.log("you", "施療院に回復薬を買い取ってもらう");
      G.say(T.infirmPotion);
      G.note(`回復薬 -1・所持金 +${E.infirmPotion.price}G`);
    } else if (k === "infgive") {
      const x = X.state(S);
      if ((S.inv.herb || 0) < E.infirm.give || E.infirm.max - (x.used.infirm || 0) < E.infirm.give) return;
      G.take("herb", E.infirm.give); mark(S, "infirm", E.infirm.give);
      G.log("you", "施療院に薬草を納める");
      G.note(`薬草 -${E.infirm.give}`);
      G.apply({ text: pick(T.infirmGive), virtue: 1 });
      addRep(1);
    } else if (k === "orphan") {
      if (used(S, "orphan") || X.foodCount(S) < E.orphan.need) return;
      mark(S, "orphan");
      G.log("you", "孤児院に食べ物を届ける");
      G.say(pick(T.orphan));
      X.giveFood(E.orphan.max);
      G.apply({ virtue: 1 });
      addRep(E.orphan.rep);
    } else if (k === "holy") {
      if ((S.inv.manawater || 0) < E.holy.mana) return;
      G.take("manawater", E.holy.mana); G.give("holywater");
      G.log("you", "魔力の水を聖水にしてもらう");
      G.say(T.holy);
      G.note(`魔力の水 -${E.holy.mana}・聖水を手に入れた。`);
    } else if (k === "build") {
      const x = X.state(S);
      const stage = x.build[S.loc] || 0;
      if (stage >= E.build.cost.length || used(S, "build") || S.gold < E.build.cost[stage]) return;
      S.gold -= E.build.cost[stage];
      x.build[S.loc] = stage + 1;
      mark(S, "build");
      G.log("you", "教会の普請に寄進する");
      G.note(`所持金 -${E.build.cost[stage]}G`);
      G.say(T.build[Math.min(stage, T.build.length - 1)]);
      G.apply({ fame: E.build.fame[stage], virtue: 1 });
      addRep(E.build.rep[stage]);
      if (stage + 1 >= E.build.cost.length) G.chron(`${L.name}の教会の礎石に、寄進者として名が刻まれる`, "event");
    } else if (k === "feast") {
      const cost = capital(L) ? E.feast.capital : E.feast.cost;
      const x = X.state(S);
      const last = x.feast[S.loc];
      if (S.gold < cost || (last !== undefined && S.day - last < E.feast.every)) return;
      const ale = Math.min(S.inv.ale || 0, Math.floor(cost / 2 / E.feast.ale));
      if (ale > 0) G.take("ale", ale);
      const pay = cost - ale * E.feast.ale;
      S.gold -= pay;
      x.feast[S.loc] = S.day;
      G.log("you", "店じゅうに酒を振る舞う");
      if (ale > 0) G.say(T.feastAle);
      G.note(`所持金 -${pay}G${ale > 0 ? `・安酒 -${ale}` : ""}`);
      G.say(pick(T.feast));
      G.addFame(E.feast.fame); G.note(`名声 +${E.feast.fame}`);
      if (G.addSanity) G.addSanity(E.feast.sanity);
      if (G.m2Bond) (S.companions || []).forEach((c) => G.m2Bond(c, E.feast.bond));
      if ((D.RUMORS || []).length) { const r = G.pick(D.RUMORS); G.say(`酔いの回った客が、あなたの肩を叩いて言った。「${r}」`); G.memo("噂：" + r); if (G.heard) G.heard("噂：" + r); }
      G.pass(1);
    } else if (k === "dice") {
      if (!G.take("m7_chipdie")) return;
      S.gold += E.dice.price;
      G.log("you", "欠けた賽子を博打打ちに売る");
      G.say(T.dice);
      G.note(`欠けた賽子 -1・所持金 +${E.dice.price}G`);
    } else if (k === "mana") {
      const x = X.state(S);
      const q = Math.min(S.inv.manawater || 0, E.academy.max - (x.used.mana || 0));
      if (q <= 0) return;
      G.take("manawater", q); S.gold += q * E.academy.mana; mark(S, "mana", q);
      G.log("you", "講師に魔力の水を買い取ってもらう");
      G.say(T.academy);
      G.note(`魔力の水 -${q}・所持金 +${q * E.academy.mana}G`);
    } else if (k === "house") {
      const cost = X.homeCost(S);
      if (!X.homeOk(S) || X.homeHere(S) || S.gold < cost) return;
      const moved = !!X.home(S);
      S.gold -= cost;
      X.state(S).home = { loc: S.loc, lv: 0, day: S.day };
      G.log("you", "空き家を買う");
      G.note(`所持金 -${cost}G`);
      if (moved) G.say(T.houseMoved);
      G.say(T.houseBuy);
      G.chron(`${L.name}に家を持つ`, "event");
    } else if (k === "fix") {
      const h = X.homeHere(S);
      const lv = h ? h.lv || 0 : 99;
      if (!h || lv >= E.home.fix.length || S.gold < E.home.fix[lv]) return;
      S.gold -= E.home.fix[lv];
      h.lv = lv + 1;
      G.log("you", lv ? "家を広げる" : "家を直す");
      G.note(`所持金 -${E.home.fix[lv]}G`);
      G.say(T.houseFix[Math.min(lv, T.houseFix.length - 1)]);
      G.pass(1);
    }
  };
})(globalThis.G = globalThis.G || {});
