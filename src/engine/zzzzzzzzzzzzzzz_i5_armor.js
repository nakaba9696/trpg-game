// I5：防具の性格（盾の受け・反撃・庇い、兜の大技と恐れと視界、靴の逃げと地形と長旅、着慣れ）。欄の決まりは data/items_i5_armor.js の頭。
// 名前の頭の z の数は、E12（zzzzzzzzzzzzzz_e12_resist.js）が G.cbHurtMod を置いたあと、I2 が G.armor・G.weapon を包んだあとに包むため。
//   受ける一撃（G.cbHurtMod を包む）：耐性（E12b）のあと、兜が大技を和らげ、盾が受け止める（受けたら反撃することも）
//   仲間への一撃（G.cbAllyHurt を包む）：盾で庇う
//   正気（G.addSanity を包む）：恐れに強い品は、減りを和らげる
//   命中（G.weapon を包む）：兜の視界
//   逃げる（G.cb.flee・G.check の「逃走」）：靴
//   旅（G.w6.raidChance を包む）：襲われにくい
//   地形（G.statEff を包む）：その地形にいるあいだの敏捷
//   着慣れ（G.armor を包む）：職業に合う品は、敏捷と術の妨げが半分
//   店と落とし物：新しい品を町の店（L.shop）と敵の落とし物に混ぜる（データの読み込みのあと）
//   文：効き目の文（G.itemEffect・G.i3.effectText）・図鑑の行（G.codexItemStats）に、性格と耐性の印を足す
// 乱数は G.rand / G.d だけ。DOM には触らない。セーブに足す項目は無い（古いセーブでもそのまま）。レーン I（I5）
(function (G) {
  const D = G.data;
  const X = D.I5;
  if (!X) return;
  const API = (G.i5 = G.i5 || {});
  const RAW = D.ITEMS;
  const TYPE = G.e12 ? G.e12.TYPE : {};

  // ---------------------------------------------------------------- 店と落とし物
  const SHOP = {
    w2_granbel: ["i5s_wicker"], w7_orbe: ["i5f_pilgrim"], w7_frostgate: ["i5f_snowshoe", "i5h_bellhood"], w4_tulier: ["i5f_bogboots"],
    w7_lastvillage: ["i5f_climbers"], w7_durm: ["i5f_digboots", "i5h_minerhat"], w4_kaesverg: ["i5h_minerhat"],
    garmund: ["i5h_impcap", "i5s_imperial"], fort: ["i5h_impcap", "i5f_ironshod"], w7_glatz: ["i5s_target"], karna: ["i5f_courier"],
    w7_widows: ["i5h_bellhood"], w1_holy: ["i5h_mitre"], w2_nagris: ["i5s_hide", "i5h_earmuff"], w7_salyues: ["i5h_featherhat"],
    w3_frosleia: ["i5f_ashwraps", "i5s_ashguard"], w7_eisenvan: ["i5s_whalebone"], w7_revandel: ["i5s_spiritwood"],
  };
  const DROPS = {
    deserter: [["i5h_impcap", 0.06], ["i5f_ironshod", 0.05]], e4_pressgang: [["i5h_impcap", 0.08], ["i5s_imperial", 0.05]],
    e4_runawaywatch: [["i5h_bellhood", 0.08]], e4_minerghost: [["i5h_minerhat", 0.08]], e4_hillorc: [["i5h_horned", 0.04], ["i5f_climbers", 0.05]],
    general: [["i5h_horned", 0.06]], e4_hollowknight: [["i5h_visor", 0.05], ["i5s_warden", 0.03]], e4_deadsentry: [["i5f_ironshod", 0.05]],
    e4k_squire: [["i5h_kinmask", 0.04], ["i5s_kinshell", 0.04]], kin: [["i5h_kinmask", 0.03]], blackknight: [["i5s_kinshell", 0.03]],
    ninja: [["i5f_tabi", 0.05]], e4_relicthief: [["i5f_digboots", 0.06]], m3_hunter: [["i5f_courier", 0.04]],
    e4_ashogre: [["i5f_ashwalker", 0.04]], e4_redscorpion: [["i5f_ashwalker", 0.04]], banditboss: [["i5s_target", 0.06]],
    e4k_bouncer: [["i5s_spiked", 0.04]], e4_islepirate: [["i5s_shell", 0.05]], e4_tidecrab: [["i5s_shell", 0.05]], e4_snowwolf: [["i5f_snowshoe", 0.03]],
    e4_bogwitch: [["i5f_bogboots", 0.05]],
  };
  API.SHOP = SHOP;
  API.DROPS = DROPS;
  Object.entries(SHOP).forEach(([loc, ids]) => { const L = D.LOCS[loc]; if (L && L.shop) ids.forEach((id) => { if (RAW[id] && !L.shop.includes(id)) L.shop.push(id); }); });
  Object.entries(DROPS).forEach(([id, loot]) => { const e = D.ENEMIES[id]; if (e) e.loot = [...(e.loot || []), ...loot.filter(([it]) => RAW[it] && !(e.loot || []).some(([x]) => x === it))]; });

  // ---------------------------------------------------------------- 身に着けた物の性格のまとめ
  const SLOTS = ["armor", "head", "feet", "off"];
  API.wornItems = (S) => {
    S = S || G.S;
    if (!S) return [];
    const blocked = G.i2s && G.i2s.blocked ? G.i2s.blocked(S) : false;
    return SLOTS.map((k) => (k === "off" && blocked ? null : S[k] ? RAW[S[k]] : null)).filter((it) => it && it.type === "armor");
  };
  const memo = { key: null, v: null };
  const EMPTY = { block: 0, counter: 0, cover: 0, heavy: 1, nerve: 0, sight: 0, flee: 0, march: 0, land: {}, shield: null };
  API.sum = (S) => {
    S = S || G.S;
    if (!S) return EMPTY;
    const key = SLOTS.map((k) => S[k] || "").join("|") + "|" + (S.weapon || "") + "|" + (S.cls || "");
    if (S === G.S && memo.key === key) return memo.v;
    const v = { block: 0, counter: 0, cover: 0, heavy: 1, nerve: 0, sight: 0, flee: 0, march: 0, land: {}, shield: null };
    API.wornItems(S).forEach((it) => {
      const t = it.i5;
      if (!t) return;
      ["block", "counter", "cover", "nerve", "sight", "flee", "march"].forEach((k) => { if (t[k]) v[k] += t[k]; });
      if (t.heavy) v.heavy *= t.heavy;
      Object.entries(t.land || {}).forEach(([k, n]) => { v.land[k] = (v.land[k] || 0) + n; });
      if (it.slot === "off" && (t.block || t.cover)) v.shield = it;
    });
    v.block = Math.min(X.BLOCK_MAX, v.block);
    v.nerve = Math.min(60, v.nerve);
    v.march = Math.min(X.MARCH_MAX, v.march);
    v.heavy = Math.max(0.5, v.heavy);
    if (S === G.S) { memo.key = key; memo.v = v; }
    return v;
  };

  // ---------------------------------------------------------------- 地形
  const terrMemo = new Map();
  API.terrainOf = (loc) => {
    const L = typeof loc === "string" ? D.LOCS[loc] : loc;
    if (!L) return [];
    if (terrMemo.has(L)) return terrMemo.get(L);
    let out;
    if (L.terrain) out = (Array.isArray(L.terrain) ? L.terrain : [L.terrain]).filter((t) => X.TERRAIN.some((x) => x.id === t));
    else if (L.type === "town") out = [];
    else out = X.TERRAIN.filter((t) => (t.dungeon && L.type === "dungeon") || (t.scene || []).includes(L.scene) || (t.rx && t.rx.test(L.name || ""))).map((t) => t.id);
    terrMemo.set(L, out);
    return out;
  };
  API.terrainName = (id) => (X.TERRAIN.find((t) => t.id === id) || {}).name || id;
  // 今いる所の地形での敏捷の補正（％）。旅の途中は行き先の地形
  API.landNow = (S) => {
    S = S || G.S;
    if (!S || !G.loc) return 0;
    const t = API.sum(S).land;
    if (!Object.keys(t).length) return 0;
    const L = S.travel && D.LOCS[S.travel] ? D.LOCS[S.travel] : G.loc();
    return API.terrainOf(L).reduce((a, k) => a + (t[k] || 0), 0);
  };
  const statEff0 = G.statEff;
  G.statEff = (k) => {
    const v = statEff0(k);
    if (k !== "敏捷" || !G.S) return v;
    const n = API.landNow();
    return n ? v + G.s5Mod(n) : v;
  };

  // ---------------------------------------------------------------- 着慣れ（敏捷と術の妨げが半分）
  API.fitOf = (it, S) => { S = S || G.S; return !!(it && it.i5 && it.i5.fit && S && it.i5.fit.includes(S.cls)); };
  const fitAdj = (S) => {
    const a = { agi: 0, magic: 0 };
    API.wornItems(S).forEach((it) => {
      if (!API.fitOf(it, S)) return;
      if (it.agi < 0) a.agi += Math.floor(-it.agi / 2);
      if (it.magic < 0) a.magic += Math.floor(-it.magic / 2);
    });
    return a;
  };
  const fitMemo = new WeakMap();
  const armor0 = G.armor;
  G.armor = () => {
    const a = armor0();
    const S = G.S;
    if (!a || !S) return a;
    const adj = fitAdj(S);
    if (!adj.agi && !adj.magic) return a;
    const k = adj.agi + ":" + adj.magic;
    let m = fitMemo.get(a);
    if (m && m.k === k) return m.v;
    const v = Object.assign({}, a, { agi: (a.agi || 0) + adj.agi, magic: (a.magic || 0) + adj.magic, i5fit: true });
    fitMemo.set(a, { k, v });
    return v;
  };

  // ---------------------------------------------------------------- 視界（兜）
  const sightMemo = new WeakMap();
  const weapon0 = G.weapon;
  G.weapon = () => {
    const w = weapon0();
    const S = G.S;
    if (!S || !w) return w;
    const s = API.sum(S).sight;
    if (!s) return w;
    let m = sightMemo.get(w);
    if (m && m.s === s) return m.v;
    const v = Object.assign({}, w, { hit: (w.hit || 0) + s });
    sightMemo.set(w, { s, v });
    return v;
  };

  // ---------------------------------------------------------------- 受ける一撃：大技を和らげる・盾で受ける・反撃
  API.isBig = (mv) => !!(mv && (mv.mul || 1) >= 1.5 && !mv.pierce);
  API.blockChance = (mv, S) => {
    S = S || G.S;
    const t = API.sum(S);
    if (!t.block) return 0;
    let p = t.block + (S && S.combat && S.combat.guard ? X.GUARD_BLOCK : 0);
    if (API.isBig(mv)) p = Math.floor(p / 2);
    return Math.min(X.BLOCK_MAX, p);
  };
  const hurt0 = G.cbHurtMod;
  G.cbHurtMod = (f, e, dmg, mv) => {
    let n = hurt0 ? hurt0(f, e, dmg, mv) : dmg;
    const S = G.S;
    if (!S || !(n > 1)) return n;
    const t = API.sum(S);
    const big = API.isBig(mv);
    if (big && t.heavy < 1) {
      const m = Math.max(1, Math.round(n * t.heavy));
      if (m < n) { n = m; G.note("兜が、頭への重い一撃を逸らした。"); }
    }
    if (!t.block || (e && e.magic) || (mv && mv.pierce) || n <= 1) return n;
    if (G.rand() * 100 >= API.blockChance(mv, S)) return n;
    const sh = t.shield || {};
    n = Math.max(1, Math.round(n * X.BLOCK_MUL));
    G.note(`${sh.name || "盾"}で、${f ? f.name : "相手"}の${big ? "大技" : "一撃"}を受け止めた。`);
    if (t.counter && f && f.hp > 1 && G.rand() * 100 < t.counter) {
      let c = G.d(4) + Math.floor(G.s5Pow(S.stats.筋力) / 20);
      if (G.e12 && G.e12.hit) c = G.e12.hit(f, c, "blunt");
      c = Math.min(f.hp - 1, c); // 盾の殴り返しで、とどめは刺さない
      if (c > 0) {
        f.hp -= c;
        G.log("nar", `受けた勢いのまま、${sh.name || "盾"}で${f.name}を殴り返す。`);
        G.log("sys", `反撃：${f.name}に ${c} のダメージ（残り ${f.hp}/${f.max}）`, { fx: "hit", foe: f.name, n: c });
      }
    }
    return n;
  };
  // 仲間を庇う（盾）
  const allyHurt0 = G.cbAllyHurt;
  G.cbAllyHurt = (c, dmg) => {
    let n = allyHurt0 ? allyHurt0(c, dmg) : dmg;
    const S = G.S;
    if (!S || !(n > 1)) return n;
    const t = API.sum(S);
    if (!t.cover || G.rand() * 100 >= t.cover) return n;
    n = Math.max(1, Math.ceil(n / 2));
    G.note(`${t.shield ? t.shield.name : "盾"}を差し出して、${c.name}への一撃を半ば受けた。`);
    return n;
  };

  // ---------------------------------------------------------------- 恐れ（正気の減り）
  const sanity0 = G.addSanity;
  if (sanity0) {
    G.addSanity = (n, quiet, cap) => {
      const S = G.S;
      if (S && n < 0) {
        const nv = API.sum(S).nerve;
        if (nv > 0) {
          const x = (-n * (100 - nv)) / 100;
          n = -(Math.floor(x) + (G.rand() < x - Math.floor(x) ? 1 : 0));
          if (!n) return;
        }
      }
      return sanity0(n, quiet, cap);
    };
  }

  // ---------------------------------------------------------------- 逃げる（靴）
  if (G.cb && G.cb.flee) {
    G.cb.flee = () => G.chance("敏捷", { vs: Math.max(...G.alive().map((f) => G.foeVs.flee(G.foeData(f)))) }, API.sum().flee);
  }
  const check0 = G.check;
  G.check = (stat, diff, reason, extra) => (reason === "逃走" && G.S && API.sum().flee ? check0(stat, diff, reason, (extra || 0) + API.sum().flee) : check0(stat, diff, reason, extra));

  // ---------------------------------------------------------------- 旅（襲われにくい）
  if (G.w6 && G.w6.raidChance) {
    const raid0 = G.w6.raidChance;
    G.w6.raidChance = (days, danger) => {
      const p = raid0(days, danger);
      const m = G.S ? API.sum().march : 0;
      return m ? p * (1 - m / 100) : p;
    };
  }

  // ---------------------------------------------------------------- 図鑑の分類：防具を 鎧・兜・靴・盾 に分ける（f2_codex.js の F2.ITEM_KINDS・F2.kindOf）
  const F2 = G.f2;
  if (F2 && F2.ITEM_KINDS && F2.kindOf && !F2.ITEM_KINDS.some(([k]) => k === "head")) {
    const at = F2.ITEM_KINDS.findIndex(([k]) => k === "armor");
    F2.ITEM_KINDS.splice(at, 1, ["armor", "鎧"], ["head", "兜"], ["feet", "靴"], ["shield", "盾"]);
    const kind0 = F2.kindOf;
    const PART = { head: "head", feet: "feet", off: "shield" };
    F2.kindOf = (it) => { const k = kind0(it); return k === "armor" && PART[it.slot] ? PART[it.slot] : k; };
  }

  // ---------------------------------------------------------------- 文
  // 耐性の印（数は出さない）：◎ とても強い・○ 強い・△ 弱い・× とても弱い
  API.mark = (m) => (m <= 0.5 ? "◎" : m < 1 ? "○" : m >= 1.5 ? "×" : m > 1 ? "△" : "・");
  // [{ type, short, m, mark }]：十の種類（表の順）。it を省くと身に着けた物すべてを掛け合わせた倍率（0.5〜1.5。受ける一撃と同じ）
  API.resistRow = (it) => {
    const types = (D.E12 && D.E12.TYPES) || [];
    const one = (t) => {
      if (it) { const a = G.e12.armorAff(it); return a[t] == null ? 1 : a[t]; }
      return G.e12.guardMul([t]);
    };
    return types.map((t) => { const m = one(t.id); return { type: t.id, short: t.short, m, mark: API.mark(m) }; });
  };
  // 「斬○・突○／打△・雷△」（効き目のある種類だけ）
  API.resistText = (it) => {
    const r = API.resistRow(it).filter((x) => x.m !== 1);
    const g = r.filter((x) => x.m < 1).sort((a, b) => a.m - b.m).map((x) => x.short + x.mark);
    const b = r.filter((x) => x.m > 1).sort((a, b) => b.m - a.m).map((x) => x.short + x.mark);
    return [g.join("・"), b.join("・")].filter(Boolean).join("／");
  };
  // 性格の言葉
  API.traitWords = (it) => {
    const t = (it && it.i5) || {};
    const out = [];
    if (t.block) out.push(`受け${t.block}%`);
    if (t.counter) out.push(`反撃${t.counter}%`);
    if (t.cover) out.push(`庇う${t.cover}%`);
    if (t.heavy && t.heavy < 1) out.push(t.heavy <= 0.75 ? "大技にとても強い" : "大技に強い");
    if (t.nerve) out.push(t.nerve >= 25 ? "恐れにとても強い" : "恐れに強い");
    if (t.sight) out.push(t.sight < 0 ? `視界が狭い（命中${t.sight}）` : `視界が広い（命中+${t.sight}）`);
    if (t.flee) out.push("逃げ" + G.sign(t.flee));
    if (t.march) out.push(`旅で襲われにくい`);
    Object.entries(t.land || {}).forEach(([k, n]) => out.push(`${API.terrainName(k)}${n > 0 ? "で身軽" : "で重い"}（敏捷${G.sign(n)}）`));
    if (t.fit && t.fit.length) out.push(`${X.FIT_WORD}：${t.fit.map((c) => (D.CLASSES[c] || {}).name || c).join("・")}`);
    return out;
  };
  const addWords = (it, s) => {
    if (!it || it.type !== "armor") return s;
    const w = API.traitWords(it);
    return w.length ? [s, ...w].filter(Boolean).join("・") : s;
  };
  if (G.itemEffect) { const e0 = G.itemEffect; G.itemEffect = (it) => addWords(it, e0(it)); }
  if (G.i3 && G.i3.effectText) { const e1 = G.i3.effectText; G.i3.effectText = (it) => addWords(it, e1(it)); }
  if (G.codexItemStats) {
    const st0 = G.codexItemStats;
    G.codexItemStats = (id) => {
      const rows = st0(id);
      const it = RAW[id];
      if (!it || it.type !== "armor" || !Array.isArray(rows)) return rows;
      const r = API.resistText(it);
      if (r) rows.push(["耐性", r]);
      const w = API.traitWords(it);
      if (w.length) rows.push(["特長", w.join("・")]);
      return rows;
    };
  }
})(globalThis.G = globalThis.G || {});
