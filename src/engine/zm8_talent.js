// M8：人の才（技能ごとの才能 Lv0〜3）と伸びしろ。表は src/data/m8_talents.js。DOM には触らない。
// 名前の頭の z は、src/engine/u5_creation.js（G.cre）より後に読ませるため（manifest を書き換えずに G.cre を包む）。
//
// 状態：S.m8 = { t: { 技能: Lv }, f: { 暮らしの才: Lv }, src: "roll"（作成で振った）/ "guess"（古いセーブで推した） }。古いセーブでは無くても動く（G.m8Of が職業と能力値から推して付ける）
//   暮らしの才（D.FLAVORS）は判定に効かない。シート・見立て・出来事の文の端（D.FLAVOR_ASIDE）・人生の物語・墓碑に顔を出す
//   仲間（M2）ひとりずつ：c.m8 = { t: { 技能: Lv }, f: { 暮らしの才: Lv }, known: 見立て済みか }。無ければ名前から決まる（乱数を使わない）
//   墓碑：g.talents・g.talentLine
// 効き目：
//   判定（G.check / G.chance）… 技能の段階で成功率 ±0 / ±0 / +6 / +12（才なしは伸びにくいだけ）（D.TALENT_LV）。どの技能かは判定の理由（攻撃・術の名前など）か能力値で決まる
//   成長 … 判定で伸びるとき、Lv0 は半分を捨てる・Lv2 は +1・Lv3 は +2
//   伸びしろ … Lv2・Lv3 の技能は、その能力値の限界を +3 / +6（作成のとき。限界は 99 まで）
//   仲間 … 酒場で雇える者の腕前に、才の分を足す（−3 / ±0 / +5 / +10）
// 見える所：自分は作成の能力値の画面とシート（src/ui/m8_talent.js）。仲間は見立て屋・教会・長い旅で分かる。
// core.js・combat.js・explore.js・u5_creation.js・companions_m2.js・ending_m6.js は書き換えず、ここで包む。レーン C（M8）
(function (G) {
  const D = G.data;
  const T = () => D.TALENTS;
  const KEYS = () => D.TALENT_KEYS;
  const LV = (n) => D.TALENT_LV[n] || D.TALENT_LV[1];
  const hash = (s) => { let h = 0; for (const ch of String(s)) h = (Math.imul(31, h) + ch.codePointAt(0)) | 0; return Math.abs(h); };

  // ---------------------------------------------------------------- 生まれつきの才
  // 職業の得意の技能
  G.m8Main = (cls) => {
    if (D.TALENT_MAIN[cls]) return D.TALENT_MAIN[cls].slice();
    const c = D.CLASSES[cls];
    if (!c) return [];
    const top = [...D.STATS].sort((a, b) => c.base[b] - c.base[a]).slice(0, 2);
    return KEYS().filter((k) => top.includes(T()[k].stat)).slice(0, 2);
  };
  const lvFrom = (r, odds) => (r < odds[0] ? 3 : r < odds[1] ? 2 : r < odds[2] ? 1 : 0);
  // 才を振る。rnd は作成画面なら Math.random、冒険の中なら G.rand。keep は変えない技能
  G.m8Roll = (cls, rnd, keep) => {
    const main = G.m8Main(cls);
    const t = {};
    KEYS().forEach((k) => {
      if (keep && keep[k] !== undefined) { t[k] = keep[k]; return; }
      t[k] = lvFrom(rnd(), main.includes(k) ? D.TALENT_ODDS.main : D.TALENT_ODDS.other);
    });
    return t;
  };
  // 暮らしの才を振る（0〜3 個）
  G.m8RollFlavors = (rnd) => {
    const c = D.FLAVOR_COUNT;
    const r = rnd();
    const n = r < c[0] ? 0 : r < c[1] ? 1 : r < c[2] ? 2 : 3;
    const pool = D.FLAVOR_KEYS.slice();
    const f = {};
    for (let i = 0; i < n && pool.length; i++) {
      const k = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      const q = rnd();
      f[k] = q < D.FLAVOR_ODDS[0] ? 3 : q < D.FLAVOR_ODDS[1] ? 2 : 1;
    }
    return f;
  };
  // 名前から決まった乱数（古いセーブ・出来事で加わった仲間。G.rand を進めない）
  const fixedRand = (key) => { let s = hash(key) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
  G.m8FlavorsOf = (S) => {
    S = S || G.S;
    if (!S) return {};
    G.m8Of(S);
    if (!S.m8.f) S.m8.f = G.m8RollFlavors(fixedRand(`${(S.profile && S.profile.name) || ""}:${S.id || ""}:m8f`));
    return S.m8.f;
  };
  // 暮らしの才を高い順に
  G.m8FlavorList = (f) => Object.keys(f || {}).filter((k) => D.FLAVORS[k]).sort((a, b) => f[b] - f[a]);
  G.m8FlavorText = (f) => G.m8FlavorList(f).map((k) => D.FLAVORS[k].name + (f[k] >= 2 ? `（${LV(f[k]).name}）` : "")).join("・");

  // 古いセーブ：職業と能力値から推す（乱数を使わない）
  G.m8Guess = (S) => {
    const main = G.m8Main(S.cls);
    const st = S.stats || {};
    const t = {};
    KEYS().forEach((k) => {
      const v = st[T()[k].stat] || 0;
      t[k] = main.includes(k) ? (v >= 60 ? 2 : 1) : v >= 55 ? 1 : 0;
    });
    return t;
  };
  G.m8Of = (S) => {
    S = S || G.S;
    if (!S) return null;
    if (!S.m8 || !S.m8.t) S.m8 = { t: G.m8Guess(S), src: "guess" };
    KEYS().forEach((k) => { if (typeof S.m8.t[k] !== "number") S.m8.t[k] = 0; });
    return S.m8.t;
  };
  G.m8Lv = (k, S) => (k ? G.m8Of(S)[k] || 0 : 1);
  // その能力値の限界に足す分
  G.m8CapBonus = (t, stat) => KEYS().reduce((a, k) => (T()[k].stat === stat ? a + LV(t[k]).cap : a), 0);
  // 伸びしろ（限界までの残りの合計）と、その見立て
  G.m8Room = (S) => {
    S = S || G.S;
    const n = D.STATS.reduce((a, k) => a + Math.max(0, (S.caps[k] || 0) - (S.stats[k] || 0)), 0);
    const r = D.TALENT_ROOM.find(([m]) => n >= m) || D.TALENT_ROOM[D.TALENT_ROOM.length - 1];
    return { n, name: r[1] };
  };
  // 目立つ才（Lv2 以上、高い順）
  G.m8Best = (t) => KEYS().filter((k) => (t[k] || 0) >= 2).sort((a, b) => t[b] - t[a]);

  // ---------------------------------------------------------------- どの判定がどの技能か
  // 武器の技能（素手は才を問わない）
  G.m8WeaponSkill = (w) => {
    w = w || G.weapon();
    if (!w || w === D.ITEMS.fists) return null;
    if (w.m8 !== undefined) return w.m8;
    const n = w.name || "";
    if (/弓|弩|投げ/.test(n)) return "bow";
    if (/剣|刀|匙|傘|鉤|刃/.test(n) || w.stat === "敏捷") return "sword";
    return "spear";
  };
  // 戦闘の行動（G.cb の鍵）
  const KIND = { fire: "magic", ice: "magic", bolt: "magic", curse: "magic", heal: "pray", ward: "pray", talk: "talk", flee: "stealth" };
  const kindSkill = (k) => (k === "attack" || k === "vital" ? G.m8WeaponSkill() : KIND[k] !== undefined ? KIND[k] : undefined);
  // 判定の理由（決まった言葉だけ）
  const REASON = { 攻撃: "@w", 急所狙い: "@w", 炎の魔法: "magic", 癒しの奇跡: "pray", 威圧: "talk", 逃走: "stealth" };
  // 理由で決まらないときは能力値で
  const BY_STAT = { 敏捷: "stealth", 知力: "lore", 魅力: "talk", 魔力: "magic", 体力: "wild", 筋力: null };
  G.m8SkillFor = (stat, reason) => {
    let k = REASON[reason];
    if (k === undefined && D.SPELLS) {
      const id = Object.keys(D.SPELLS).find((s) => D.SPELLS[s].name === reason);
      if (id) k = KIND[id] !== undefined ? KIND[id] : "magic";
    }
    if (k === "@w") return G.m8WeaponSkill();
    return k !== undefined ? k : BY_STAT[stat] !== undefined ? BY_STAT[stat] : null;
  };
  G.m8Mod = (k) => (k && G.S ? LV(G.m8Lv(k)).mod : 0);

  let ctx;        // 今の判定の技能（undefined なら能力値で決める）
  let growing;    // 判定の中の成長（技能の段階）
  const chance0 = G.chance;
  G.chance = (stat, diff, extra) => {
    const k = ctx !== undefined ? ctx : BY_STAT[stat] !== undefined ? BY_STAT[stat] : null;
    return chance0(stat, diff, (extra || 0) + G.m8Mod(k));
  };
  const check0 = G.check;
  G.check = (stat, diff, reason, extra) => {
    const k = G.m8SkillFor(stat, reason);
    const pc = ctx, pg = growing;
    ctx = k;
    growing = k && G.S ? G.m8Lv(k) : 1;
    try {
      const r = check0(stat, diff, reason, extra);
      if (r && k) {
        r.talent = { k, lv: G.m8Lv(k) };
        // 記録（G.log が写した判定）にも残す
        const L = G.S && G.S.log;
        for (let i = L ? L.length - 1 : -1; i >= 0; i--) if (L[i].k === "dice") { if (L[i].roll === r.roll && L[i].reason === r.reason) L[i].talent = r.talent; break; }
      }
      return r;
    } finally { ctx = pc; growing = pg; }
  };
  const grow0 = G.grow;
  G.grow = (k, n) => {
    if (growing !== undefined && n > 0) {
      const g = LV(growing).grow;
      if (g === null) { if (G.rand() < 0.5) n = 0; }
      else n += g;
    }
    const pg = growing;
    growing = undefined;   // 判定の外の成長（出来事など）はそのまま
    try { return grow0(k, n); } finally { growing = pg; }
  };
  // 戦闘の成功率の見込み（画面の％）も、同じ技能で
  if (G.cb) Object.keys(G.cb).forEach((key) => {
    const f = G.cb[key];
    G.cb[key] = (...a) => { const pc = ctx; ctx = kindSkill(key); try { return f(...a); } finally { ctx = pc; } };
  });

  // ---------------------------------------------------------------- 新しい冒険
  // 作成画面を通らないときの暮らしの才は、人物と能力値から決める（G.rand を進めない）
  const seedOf = (opt) => fixedRand(`${opt.cls}:${JSON.stringify(opt.stats || {})}:${(opt.profile && opt.profile.name) || ""}:m8f`);
  const newGame0 = G.newGame;
  G.newGame = (opt) => {
    const S = newGame0(opt);
    if (opt.talents) S.m8 = { t: { ...opt.talents }, f: { ...(opt.flavors || G.m8RollFlavors(seedOf(opt))) }, src: "roll" };
    else {
      // 作成画面を通らない始まり（テストなど）：作成と同じ分布で振り、伸びしろも同じように足す
      const t = G.m8Roll(opt.cls, G.rand);
      S.m8 = { t, f: G.m8RollFlavors(seedOf(opt)), src: "roll" };
      D.STATS.forEach((k) => { S.caps[k] = Math.min(99, S.caps[k] + G.m8CapBonus(t, k)); });
    }
    G.m8Of(S);
    const best = G.m8Best(S.m8.t)[0];
    if (best) {
      const C = D.M8_TEXT.chron;
      const line = (S.m8.t[best] >= 3 ? C[1] : C[0]).replace("{s}", T()[best].name);
      S.chronicle.unshift({ date: G.date(), kind: "event", text: line });
    }
    return S;
  };

  // ---------------------------------------------------------------- 作成（U5）：振り直しで才も揺れる。鍵をかけた能力値の技能は残る
  const cre = G.cre;
  if (cre) {
    const roll0 = cre.roll;
    cre.roll = (dr, rnd) => {
      const keep = {};
      if (dr.talents) KEYS().forEach((k) => { if (dr.locks && dr.locks[T()[k].stat] && dr.talents[k] !== undefined) keep[k] = dr.talents[k]; });
      dr.talents = G.m8Roll(dr.cls, rnd, keep);
      dr.flavors = G.m8RollFlavors(rnd);
      return roll0(dr, rnd);   // 最後に fit（限界を超えたボーナスを戻す）が走る
    };
    const cap0 = cre.cap;
    cre.cap = (dr, k) => Math.min(cre.MAX_PT || 99, cap0(dr, k) + (dr.talents ? (cre.ptOfPct || ((n) => n))(G.m8CapBonus(dr.talents, k)) : 0));   // 作成は点（S2）
    cre.talents = (dr) => { if (!dr.talents) dr.talents = G.m8Roll(dr.cls, Math.random); return dr.talents; };
    cre.flavors = (dr) => { if (!dr.flavors) dr.flavors = G.m8RollFlavors(Math.random); return dr.flavors; };
    const opts0 = cre.options;
    cre.options = (dr, rnd) => Object.assign(opts0(dr, rnd), { talents: { ...cre.talents(dr) }, flavors: { ...cre.flavors(dr) } });
  }

  // ---------------------------------------------------------------- 仲間（M2）
  // 肩書きから得意を推す
  const compMain = (c) => { const s = `${c.cls || ""} ${c.name || ""}`; const hit = D.TALENT_COMP.find(([re]) => re.test(s)); return hit ? hit[1] : c.heal ? "pray" : c.fire ? "magic" : "sword"; };
  const compTalents = (c, r) => {
    const main = compMain(c);
    const t = {};
    KEYS().forEach((k) => { t[k] = lvFrom(r(), k === main ? D.TALENT_ODDS.main : D.TALENT_ODDS.other); });
    return t;
  };
  // 仲間の才。無ければ名前から決まった数で付ける（乱数を進めない。古いセーブの仲間・出来事で加わった仲間）
  G.m8Comp = (c) => {
    if (!c) return null;
    if (!c.m8 || !c.m8.t) c.m8 = { t: compTalents(c, fixedRand(`${c.name}:${c.id || ""}:m8`)), known: false };
    if (!c.m8.f) c.m8.f = G.m8RollFlavors(fixedRand(`${c.name}:${c.id || ""}:m8f`));
    return c.m8;
  };
  G.m8CompMain = (c) => { const t = G.m8Comp(c).t; return KEYS().reduce((b, k) => (t[k] > t[b] ? k : b), compMain(c)); };
  // 酒場で雇える者：才を振り、腕前に足す
  const POWER = [-3, 0, 5, 10];
  const gen0 = G.genCompanion;
  G.genCompanion = () => {
    const c = gen0();
    c.m8 = { t: compTalents(c, G.rand), f: G.m8RollFlavors(fixedRand(`${c.name}:${c.power}:${G.S ? G.S.day + ":" + G.S.turn : ""}:m8f`)), known: false };
    c.power = G.clamp(c.power + POWER[c.m8.t[compMain(c)]], 25, 95);
    return c;
  };
  // 雇うとき、才（と見立てたかどうか）を連れていく
  const add0 = G.addCompanion;
  G.addCompanion = (c) => {
    const S = G.S;
    const n = S ? S.companions.length : 0;
    let src = c;
    if (c && c !== "random" && !c.m8 && S && S.recruits) src = (S.recruits.list || []).find((x) => x.name === c.name && x.m8) || c;
    const ok = add0(c);
    if (ok && S && S.companions.length > n) {
      const nc = S.companions[S.companions.length - 1];
      if (src && src.m8) nc.m8 = { t: { ...src.m8.t }, f: { ...(src.m8.f || {}) }, known: !!src.m8.known };
      G.m8Comp(nc);
    }
    return ok;
  };
  G.m8CompLabel = (c) => {
    const m = G.m8Comp(c);
    if (!m.known) return "才は、まだ見えない";
    const best = G.m8Best(m.t);
    const k = G.m8CompMain(c);
    const fl = G.m8FlavorText(m.f);
    const main = !best.length ? (m.t[k] ? `${T()[k].name}は人並み` : fl ? "" : "取り立てた才は無い") : best.map((x) => `${T()[x].name}の才（${LV(m.t[x]).name}）`).join("・");
    return [main, fl && `暮らしの才：${fl}`].filter(Boolean).join("・");
  };
  // 見立てる。言葉を一人ずつ記録に出す
  const tell = (c) => {
    const m = G.m8Comp(c);
    m.known = true;
    const k = G.m8CompMain(c);
    const lv = m.t[k] || 0;
    G.say(D.M8_TEXT.told[lv].replace(/\{n\}/g, G.m2Short ? G.m2Short(c) : c.name).replace(/\{s\}/g, T()[k].name));
    G.note(`${c.name}：${G.m8CompLabel(c)}`);
  };
  const unknownOnes = () => {
    const S = G.S;
    const list = S.companions.filter((c) => !G.m8Comp(c).known);
    if (S.fac === "tavern" && S.recruits) (S.recruits.list || []).forEach((c) => { if (!c.hired && !G.m8Comp(c).known) list.push(c); });
    return list;
  };
  G.m8Appraise = (where) => {
    const S = G.S;
    const X = D.M8_TEXT[where];
    const list = unknownOnes();
    G.log("you", X.label);
    if (!list.length) { G.say(D.M8_TEXT.seer.none); return false; }
    if (S.gold < X.price) { G.note("金が足りない。"); return false; }
    S.gold -= X.price;
    G.note(`所持金 -${X.price}G`);
    G.say(G.pick(X.enter));
    list.forEach(tell);
    S.counters.m8seen = (S.counters.m8seen || 0) + list.length;
    return true;
  };
  const fac0 = G.facActions;
  G.facActions = () => {
    const groups = fac0();
    const S = G.S;
    if (S.fac !== "tavern" && S.fac !== "church") return groups;
    const where = S.fac === "tavern" ? "seer" : "church";
    const X = D.M8_TEXT[where];
    const n = unknownOnes().length;
    if (S.fac === "tavern") groups.forEach((g) => g.list.forEach((a) => {
      const m = /^tavern:hire:(\d+)$/.exec(a.id);
      const c = m && S.recruits && S.recruits.list[Number(m[1])];
      if (c && c.m8 && c.m8.known) a.sub += `・${G.m8CompLabel(c)}`;
    }));
    if (!n) return groups;
    const act = { id: `m8:${where}`, label: X.label, sub: `${X.price}G・${n}人`, disabled: S.gold < X.price, kw: ["見立", "才", "占"] };
    const i = groups.findIndex((g) => g.list.some((a) => a.id === "back"));
    groups.splice(i < 0 ? groups.length : i, 0, { title: "才を見る", list: [act] });
    return groups;
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    if (head === "m8") { G.m8Appraise(arg); return; }
    return facAct0(head, arg, a);
  };
  // 長く旅をすると分かる（二十日）
  const TOGETHER = 20;
  const end0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && !S.over && S.mode === "explore" && S.companions && S.companions.length) {
      const c = S.companions.find((x) => !G.m8Comp(x).known && x.joined && S.day - x.joined >= TOGETHER);
      if (c) {
        c.m8.known = true;
        const k = G.m8CompMain(c);
        const n = G.m2Short ? G.m2Short(c) : c.name;
        const t = c.m8.t[k] >= 2 ? G.pick(D.M8_TEXT.together) : D.M8_TEXT.togetherNone;
        G.say(t.replace(/\{n\}/g, n).replace(/\{s\}/g, T()[k].name));
        G.note(`${c.name}：${G.m8CompLabel(c)}`);
      }
    }
    return end0();
  };

  // ---------------------------------------------------------------- 才が変わる（ごく稀。代償つき）
  // 出来事の結果に m8: { up: 技能 か "best"/"random", down: 技能 か "random" } と書ける
  G.m8Shift = (spec) => {
    const S = G.S;
    const t = G.m8Of(S);
    const pickK = (v, not) => {
      if (v === "best") return KEYS().filter((k) => k !== not && t[k] < 3).sort((a, b) => t[b] - t[a])[0];
      if (v === "random") { const l = KEYS().filter((k) => k !== not); return G.pick(l); }
      return v;
    };
    const up = spec.up && pickK(spec.up);
    if (up && t[up] < 3) { t[up]++; G.note(`${T()[up].name}の才が ${LV(t[up]).name} になった。`); G.chron(`${T()[up].name}の才が変わる`); }
    const down = spec.down && pickK(spec.down, up);
    if (down && t[down] > 0) { t[down]--; G.note(`${T()[down].name}の才が ${LV(t[down]).name} になった。`); }
  };
  const apply0 = G.apply;
  G.apply = (o) => {
    const r = apply0(o);
    if (o && o.m8 && G.S && !G.S.over) G.m8Shift(o.m8);
    return r;
  };

  // ---------------------------------------------------------------- 暮らしの才が、出来事の文の端に顔を出す
  // 仲間の出来事（m2）・一度きりの出来事には添えない
  const start0 = G.startEvent;
  G.startEvent = (ev) => {
    const ok = start0(ev);
    const S = G.S;
    const e = ok && S && D.EVENTS.find((x) => x.id === S.event);
    if (e && !e.m2 && !e.once && S.mode === "event") {
      const f = G.m8FlavorsOf(S);
      const keys = G.m8FlavorList(f);
      // 添えるかどうかは日・手番・出来事で決める（G.rand を進めず、ほかの乱数の並びを変えない。同じ遊び方なら同じに出る）
      const r = fixedRand(`${S.day}:${S.turn}:${e.id}:${(S.profile && S.profile.name) || ""}`);
      if (keys.length && r() < D.FLAVOR_ASIDE) {
        const tags = G.eventTags();
        const hit = keys.filter((k) => D.FLAVORS[k].aside && D.FLAVORS[k].aside.where.some((w) => tags.includes(w)));
        if (hit.length) G.say(D.FLAVORS[hit[Math.floor(r() * hit.length)]].aside.text);
      }
    }
    return ok;
  };

  // ---------------------------------------------------------------- 人生の物語（M6）と墓碑
  const lineFor = (t, table) => {
    const best = G.m8Best(t);
    const name = (k) => T()[k].name;
    if (best.length >= 2 && t[best[0]] === 2 && t[best[1]] === 2) return { t: table.two, v: { a: name(best[0]), b: name(best[1]) } };
    if (best.length) return { t: table[t[best[0]]], v: { s: name(best[0]) } };
    return { t: table.none, v: {} };
  };
  const fillV = (s, v) => String(s).replace(/\{(\w)\}/g, (a, k) => (v[k] !== undefined ? v[k] : a));
  // 墓碑の一行。技能の才が目立たず暮らしの才があれば、そちらを
  G.m8GraveLine = (t, f) => {
    const fk = G.m8FlavorList(f)[0];
    const fl = fk ? D.FLAVORS[fk].grave : "";
    if (!G.m8Best(t).length && fl) return fl;
    const r = lineFor(t, D.M8_TEXT.grave);
    return [fillV(r.t, r.v), fl].filter(Boolean).join("。");
  };
  if (G.m6Compose) {
    const compose0 = G.m6Compose;
    G.m6Compose = (S) => {
      const story = compose0(S);
      const t = S && (S.m8 ? S.m8.t : S.talents);
      const f = S && (S.m8 ? S.m8.f : S.flavors);
      if (story && t && story.life && story.life.length) {
        const r = lineFor(t, D.M8_TEXT.story);
        const fk = G.m8FlavorList(f)[0];
        if (r.t !== D.M8_TEXT.story.none || (!fk && G.rand() < 0.5)) story.life[0] += fillV(G.pick(r.t), r.v);
        if (fk) story.life[0] += D.FLAVORS[fk].story;
      }
      return story;
    };
  }
  const finish0 = G.finishRun;
  G.finishRun = () => {
    const S = G.S;
    const t = S && G.m8Of(S);
    const f = S && G.m8FlavorsOf(S);
    const cb = G.onFinish;
    G.onFinish = () => {
      G.onFinish = cb;
      const g = G.P.graves[0];
      if (g && S && g.id === S.id && t) Object.assign(g, { talents: { ...t }, flavors: { ...f }, talentLine: G.m8GraveLine(t, f) });
      if (cb) cb();
    };
    try { finish0(); } finally { G.onFinish = cb; }
  };
})(globalThis.G = globalThis.G || {});
