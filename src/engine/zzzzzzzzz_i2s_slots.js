// I2（装備の枠）：装備の枠を 7 つに（右手・左手・頭・胴・足・装飾品 1・装飾品 2）。枠の表と品の枠は data/items_i2s.js。
//   ・装備する G.equip(id, 枠) と外す G.unequip(枠)。枠を省くと今までどおり（武器は右手、防具はその品の枠、装飾品は装飾品 1 と入れ替え）。
//     両手の武器を右手に持つと、左手の物は荷物へ。左手に何か持つと、両手の武器は荷物へ（右手は素手）。
//     呪われた品は、外すと傷を負う（I3・I1 と同じ）。正体不明の品は、着けると正体が分かる（I3 と同じ）。
//   ・効き目のまとめ：戦闘・判定は今までどおり G.weapon()・G.armor()・G.ring() を読むだけなので、それを包んで足した写しを返す
//     （combat.js は、二刀の左手の一撃を差し込むつなぎ目 G.cbAfterAct を一行足しただけ。F1 の読み合いは書き換えない）。
//       G.armor() … 胴の鎧に、頭・足・盾の防御・身のこなし・魔法・先手を足したもの
//       G.weapon() … 右手の武器。左手にも武器を持つと二刀（左手の武器の魔法も足す）。ふつうの攻撃では左手でも一撃（下の「二刀」）
//       G.ring() … 装飾品 1 に、装飾品 2 の能力値・補正・魔法・先手・吸う・代償を足したもの
//     能力値と行動の補正（stats・bonus）は、頭・足・左手の品の分を G.statEff・G.gearBonus に足す（胴と右手は I3、装飾品は core.js が見る）。
//     F3 の癖（条件で化ける品）は、どの枠でも効く（F3 の G.f3i.fx を使う。能力値の分は F3 が身に着けた品すべてから足す）。
//   ・古いセーブ：足した枠（S.off・S.head・S.feet・S.ring2）が無くても動く。読み込んだとき（G.fixOldNames）と手番の終わりに、
//     枠に合わない品（両手の武器と左手の品が重なっている など）を荷物へ戻す（G.i2s.fix）。
// セーブに足す項目（古いセーブで無くても動く）：S.off・S.head・S.feet・S.ring2（品の id か ""）
// 名前の頭の zzzzzzzzz は、I3（zzz_gear_i3.js）と F3（zzzzzzzz_f3i_finds.js）が装備の引き方を包んだあとに包むため。DOM には触らない。レーン I（I2）
(function (G) {
  const D = G.data;
  const X = G.i2s;
  if (!X) return;
  const RAW = D.ITEMS;

  // ---------------------------------------------------------------- 品に枠と片手・両手を書き足す（データの読み込みのあと）
  const twoH = new Set(X.TWO_HANDED);
  Object.keys(RAW).forEach((id) => {
    const it = RAW[id];
    if (!["weapon", "armor", "ring"].includes(it.type)) return;
    if (!it.slot) it.slot = X.slotOf(it);
    if (it.type === "weapon" && !it.hands) it.hands = twoH.has(id) || (it.i3 && it.i3.h === 2) ? 2 : 1;
    if (it.type === "weapon" && it.i3) it.i3.h = it.hands;   // 図鑑の「片手・両手」と揃える
  });

  // ---------------------------------------------------------------- 店と落とし物に混ぜる
  const SHOP = {
    karna: ["i2s_buckler", "i2s_shoes"], nerva: ["i2s_hood"], leavel: ["i2s_ironhelm", "i2s_kiteshield"], garmund: ["i2s_ironhelm", "i2s_greaves"],
    fort: ["i2s_ironhelm", "i2s_roundshield"], zephara: ["i2s_circlet"], yakumo: ["i2s_hachigane", "i2s_sandals"], w1_holy: ["i2s_buckler"],
    w2_granbel: ["i2s_woodshield", "i2s_shoes"], w2_dranherz: ["i2s_ironhelm", "i2s_roundshield", "i2s_greaves"], w2_nagris: ["i2s_furcap", "i2s_leatherboots"],
    w4_valmiria: ["i2s_hood", "i2s_shoes", "i2s_buckler"], w7_glatz: ["i2s_roundshield", "i2s_leathercap"], w7_frostgate: ["i2s_furcap"], w7_orbe: ["i2s_shoes"],
  };
  Object.entries(SHOP).forEach(([loc, ids]) => { const L = D.LOCS[loc]; if (L && L.shop) ids.forEach((id) => { if (RAW[id] && !L.shop.includes(id)) L.shop.push(id); }); });
  const DROPS = {
    bandit: [["i2s_leathercap", 0.06]], orc: [["i2s_woodshield", 0.06]], skeleton: [["i2s_buckler", 0.05]], knight: [["i2s_kiteshield", 0.08], ["i2s_greathelm", 0.05]],
    blackknight: [["i2s_greathelm", 0.06], ["i2s_sabaton", 0.04]], ninja: [["i2s_softboots", 0.06]], ronin: [["i2s_hachigane", 0.08]], general: [["i2s_towershield", 0.05]],
  };
  Object.entries(DROPS).forEach(([id, loot]) => { const e = D.ENEMIES[id]; if (e) e.loot = [...(e.loot || []), ...loot.filter(([it]) => RAW[it])]; });

  // ---------------------------------------------------------------- 枠の中身
  const slotId = (S, k) => { const v = S[k]; return v && v !== "fists" ? v : ""; };
  // 品に F3 の癖の効き目（命中・防御など。能力値と補正は F3 が足す）を足した写し。癖が無ければそのまま
  const fxMemo = new Map();
  const withFx = (it) => {
    if (!it || !it.quirk || !G.f3i || !G.f3i.fx) return it;
    const fx = G.f3i.fx(it, G.S) || {};
    const key = JSON.stringify(fx);
    const m = fxMemo.get(it);
    if (m && m.key === key) return m.it;
    const c = Object.assign({}, it);
    if (c.dmg && fx.dmg) c.dmg = [c.dmg[0], c.dmg[1], c.dmg[2] + fx.dmg];
    ["hit", "vital", "first", "magic", "def", "agi"].forEach((k) => { if (fx[k]) c[k] = (c[k] || 0) + fx[k]; });
    if (fx.drain) c.drain = Math.round(((c.drain || 0) + fx.drain) * 100) / 100;
    fxMemo.set(it, { key, it: c });
    return c;
  };
  const W0 = G.weapon, A0 = G.armor, R0 = G.ring;
  // 枠ごとの品（まとめる前。癖は効いた分）。左手が塞がっているときは null
  X.item = (k, S) => {
    S = S || G.S;
    if (!S) return null;
    if (k === "weapon") return S === G.S ? W0() : RAW[S.weapon] || RAW.fists;
    if (k === "armor") return S === G.S ? A0() : (S.armor && RAW[S.armor]) || null;
    if (k === "ring") return S === G.S ? R0() : (S.ring && RAW[S.ring]) || null;
    if (k === "off" && X.blocked(S)) return null;
    const id = slotId(S, k);
    return id ? withFx(RAW[id] || null) : null;
  };

  // ---------------------------------------------------------------- まとめた引き方（戦闘・判定が読む）
  const pairMemo = new Map();
  const memo2 = (tag, a, b, mk) => {
    let m = pairMemo.get(a);
    if (!m) { m = new Map(); pairMemo.set(a, m); }
    const k = tag + "|" + (b ? "" : "-");
    const hit = m.get(b || k);
    if (hit) return hit;
    const v = mk();
    m.set(b || k, v);
    if (pairMemo.size > 300) pairMemo.clear();
    return v;
  };
  G.weapon = () => {
    const r = W0();
    const S = G.S;
    if (!S) return r;
    const off = X.item("off");
    if (!off || off.type !== "weapon") return r;
    if (!slotId(S, "weapon")) return off;   // 右手が空なら、左手の武器で戦う
    const c = memo2("w", r, off, () => {
      const c = Object.assign({}, r);
      if (off.magic) c.magic = (r.magic || 0) + off.magic;
      c.dual = off.name;
      return c;
    });
    if (!X.swing) return c;
    // 二刀で振っているあいだ（ふつうの攻撃の一手）は、右手も少し当たりにくい
    let sw = swingMemo.get(c);
    if (!sw) { sw = Object.assign({}, c, { hit: (c.hit || 0) + X.DUAL_HIT }); swingMemo.set(c, sw); }
    return sw;
  };
  const swingMemo = new WeakMap();
  X.dual = (S) => { S = S || G.S; const off = S && X.item("off", S); return !!(off && off.type === "weapon" && slotId(S, "weapon")); };

  // ---------------------------------------------------------------- 二刀：ふつうの攻撃（cb:attack）のときだけ、右手のあとに左手でも一撃
  //   右手も左手も当たりにくくなり（DUAL_HIT。左手はさらに OFF_HIT）、左手の一撃は浅い（OFF_MUL）。
  //   読み合いの技（割り込む・捨て身・身を削る）と急所狙い（F9 で手の欄からは外した）は右手だけで出す（当たりにくさも付かない）。防御・目つぶしは手を選ばない。
  //   左手の一撃も G.cbDamage を通るので、F1 の構え・隙・とどめ、絶界はそのまま効く。
  X.DUAL_HIT = -15;
  X.OFF_HIT = -10;
  X.OFF_MUL = 0.8;
  X.offChance = (t) => {
    const off = X.item("off");
    t = t || G.target();
    if (!off || !t || off.type !== "weapon") return 0;
    return G.chance(off.stat, { vs: G.foeVs.eva(G.foeData(t), off.stat) }, (off.hit || 0) + X.DUAL_HIT + X.OFF_HIT);
  };
  const baseCombatAct = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const kind = String(arg).split(":")[0];
    if (!S || !S.combat || kind !== "attack" || !X.dual(S)) return baseCombatAct(arg);
    X.swing = true;
    try { return baseCombatAct(arg); } finally { X.swing = false; }
  };
  // 攻撃の見込み（画面とボットが読む）は、二刀なら右手の当たりにくさ込み。選択肢の札に左手の見込みを添える
  if (G.cb && G.cb.attack) {
    const baseAtk = G.cb.attack;
    G.cb.attack = () => { if (X.swing || !X.dual()) return baseAtk(); X.swing = true; try { return baseAtk(); } finally { X.swing = false; } };
  }
  const baseActions = G.combatActions;
  G.combatActions = () => {
    const groups = baseActions();
    if (!X.dual()) return groups;
    const off = X.item("off");
    groups.forEach((g) => (g.list || []).forEach((a) => {
      if (a.id !== "cb:attack") return;
      a.label = `${G.weapon().name}と${off.name}で攻撃（二刀）`;
      a.sub = `${a.sub}・左手 ${off.stat} ${X.offChance()}%（浅い）`;
    }));
    return groups;
  };
  const baseAfterAct = G.cbAfterAct;
  G.cbAfterAct = (kind, t0) => {
    if (baseAfterAct) baseAfterAct(kind, t0);
    const S = G.S;
    const C = S && S.combat;
    if (!C || S.over || kind !== "attack" || !X.swing || C.e4disarm) return;
    const off = X.item("off");
    const t = t0 && t0.hp > 0 ? t0 : G.target();
    if (!off || !t || t.hp <= 0) return;
    const r = G.check(off.stat, { vs: G.foeVs.eva(G.foeData(t), off.stat) }, "左手の一撃", (off.hit || 0) + X.DUAL_HIT + X.OFF_HIT);
    if (r.ok) {
      // 左手は力を乗せきれない：武器の目だけ（能力値の上乗せは無し）を OFF_MUL 倍
      let dmg = Math.max(1, Math.round(G.dice(off.dmg) * X.OFF_MUL));
      if (r.crit) dmg *= 2;
      G.say(`返す左手の${off.name}が、${t.name}を捉えた。`);
      G.cbDamage(t, dmg, "blade");
    } else G.say(`左手の${off.name}は、届かなかった。`);
  };
  const ARMOR_PARTS = ["head", "feet", "off"];
  G.armor = () => {
    const body = A0();
    const S = G.S;
    if (!S) return body;
    const parts = ARMOR_PARTS.map((k) => X.item(k)).filter((it) => it && it.type === "armor");
    if (!parts.length) return body;
    const key = body || RAW.fists;
    let m = pairMemo.get(key);
    if (!m) { m = new Map(); pairMemo.set(key, m); }
    const sig = parts;
    for (const [k, v] of m) if (k.length === sig.length && k.every((x, i) => x === sig[i])) return v;
    const c = Object.assign({}, body || { name: parts[0].name, type: "armor", def: 0, agi: 0 });
    parts.forEach((p) => {
      c.def = (c.def || 0) + (p.def || 0);
      ["agi", "magic", "first"].forEach((f) => { if (p[f]) c[f] = (c[f] || 0) + p[f]; });
    });
    c.parts = parts.map((p) => p.name);
    m.set(sig, c);
    return c;
  };
  G.ring = () => {
    const r1 = R0();
    const S = G.S;
    if (!S) return r1;
    const r2 = X.item("ring2");
    if (!r2) return r1;
    if (!r1) return r2;
    return memo2("r", r1, r2, () => {
      const c = Object.assign({}, r1);
      ["stats", "bonus"].forEach((g) => {
        if (!r2[g]) return;
        c[g] = Object.assign({}, r1[g] || {});
        Object.entries(r2[g]).forEach(([k, n]) => { c[g][k] = (c[g][k] || 0) + n; });
      });
      ["magic", "first"].forEach((f) => { if (r2[f]) c[f] = (r1[f] || 0) + r2[f]; });
      if (r2.drain) c.drain = Math.min(0.3, Math.round(((r1.drain || 0) + r2.drain) * 100) / 100);
      if (r2.toll) c.toll = Object.assign({}, r2.toll, r1.toll || {});
      c.cursed = !!(r1.cursed || r2.cursed);
      c.pair = r2.name;
      return c;
    });
  };

  // 頭・足・左手の品の能力値と補正（胴と右手は I3、装飾品は core.js が足す。癖の分は F3 が足す）
  const partMemo = { key: null, stats: null, bonus: null };
  const partSum = (S) => {
    const key = `${slotId(S, "head")}|${slotId(S, "feet")}|${X.blocked(S) ? "" : slotId(S, "off")}`;
    if (partMemo.key === key) return partMemo;
    const stats = {}, bonus = {};
    ARMOR_PARTS.forEach((k) => {
      const id = k === "off" && X.blocked(S) ? "" : slotId(S, k);
      const it = id && RAW[id];
      if (!it) return;
      Object.entries(it.stats || {}).forEach(([s, n]) => { stats[s] = (stats[s] || 0) + n; });
      Object.entries(it.bonus || {}).forEach(([s, n]) => { bonus[s] = (bonus[s] || 0) + n; });
    });
    Object.assign(partMemo, { key, stats, bonus });
    return partMemo;
  };
  const baseStatEff = G.statEff;
  G.statEff = (k) => {
    const v = baseStatEff(k);
    const S = G.S;
    if (!S) return v;
    const n = partSum(S).stats[k] || 0;
    return n ? v + G.s5Mod(n) : v;
  };
  const baseGearBonus = G.gearBonus;
  G.gearBonus = (kind) => {
    const b = baseGearBonus(kind);
    const S = G.S;
    return S ? b + (partSum(S).bonus[kind] || 0) : b;
  };
  const baseHas = G.has;
  G.has = (id) => baseHas(id) || X.wears(G.S, id);

  // ---------------------------------------------------------------- 装備する・外す
  // 品を入れる枠（省いたときの決まり）
  X.defaultSlot = (id) => {
    const s = X.slotOf(id);
    return s ? X.FITS[s][0] : null;
  };
  // 外すと何が起きるか（画面の説明用）：{ cursed, moves: [押し出される品の id] }
  X.plan = (id, slot, S) => {
    S = S || G.S;
    slot = slot || X.defaultSlot(id);
    const out = [];
    const push = (k) => { const v = slotId(S, k); if (v && !(k === "off" && X.blocked(S))) out.push(v); };
    push(slot);
    if (slot === "weapon" && X.hands(id) === 2) push("off");
    if (slot === "off" && X.blocked(S)) push("weapon");
    return out;
  };
  const LINE = {
    weapon: "{name}は、手から剥がすようにしか離れなかった。", off: "{name}は、手から剥がすようにしか離れなかった。",
    head: "{name}は、髪ごと引き剥がすようにしか外れなかった。", armor: "{name}は、皮膚ごと剥がすようにしか脱げなかった。",
    feet: "{name}は、踵の皮ごとしか脱げなかった。", ring: "{name}は、はがすようにしか外れなかった。指の皮がめくれた。", ring2: "{name}は、はがすようにしか外れなかった。指の皮がめくれた。",
  };
  // 枠を空けて、品を荷物に戻す（呪われた品は傷を負う。死にはしない）
  const vacate = (S, k) => {
    const id = slotId(S, k);
    if (!id) return false;
    const it = RAW[id];
    if (it && it.cursed) {
      const n = Math.min(3, S.hp - 1);
      if (n > 0) S.hp -= n;
      G.say(LINE[k].replace("{name}", it.name));
      if (n > 0) G.note(`HP -${n}`);
    }
    G.give(id);
    S[k] = k === "weapon" ? "fists" : "";
    return true;
  };
  X.vacate = vacate;
  G.equip = (id, slot) => {
    const S = G.S;
    let it = RAW[id];
    if (!S || !it || !S.inv[id]) return false;
    slot = slot || X.defaultSlot(id);
    if (!slot || !X.fits(id, slot)) return false;
    // 正体不明の品は、着けると正体が分かる（I3）
    if (it.i3g && it.i3g.unk && G.i3 && G.i3.identify) {
      const real = G.i3.identify(id);
      G.take(id);
      G.give(real);
      id = real;
      it = RAW[id];
      G.note(`何の品か分かった：${it.name}（${G.i3.effectText(it)}）`);
      if (it.cursed && D.I3 && D.I3.CURSE_FOUND) G.say(G.pick(D.I3.CURSE_FOUND).replace("{name}", it.name));
    }
    vacate(S, slot);
    const moved = [];
    if (slot === "weapon" && X.hands(it) === 2 && !X.blocked(S)) { const o = slotId(S, "off"); if (vacate(S, "off")) moved.push(RAW[o].name); }
    if (slot === "off" && X.blocked(S)) { const w = slotId(S, "weapon"); if (vacate(S, "weapon")) moved.push(RAW[w].name); }
    G.take(id);
    S[slot] = id;
    G.note(`${it.name}を${X.NAME[slot]}に装備した。`);
    if (moved.length) G.note(slot === "off" ? `左手を使うので、${moved.join("と")}を荷物に収めた。` : `両手で構えるので、${moved.join("と")}を荷物に収めた。`);
    return true;
  };
  G.unequip = (slot) => {
    const S = G.S;
    if (!S || !X.NAME[slot]) return false;
    if (slot === "off" && X.blocked(S)) return false;
    return vacate(S, slot);
  };

  // ---------------------------------------------------------------- 古いセーブと、枠に合わない品の片付け
  X.fix = (S) => {
    S = S || G.S;
    if (!S || !S.inv) return 0;
    let n = 0;
    ["off", "head", "feet", "ring2"].forEach((k) => { if (typeof S[k] !== "string") S[k] = S[k] ? String(S[k]) : ""; });
    if (S.weapon === undefined || S.weapon === null) S.weapon = "fists";
    if (typeof S.ring !== "string") S.ring = S.ring ? String(S.ring) : "";
    if (typeof S.armor !== "string") S.armor = S.armor ? String(S.armor) : "";
    const back = (k) => { const id = slotId(S, k); if (!id) return; S.inv[id] = (S.inv[id] || 0) + 1; S[k] = k === "weapon" ? "fists" : ""; n++; };
    X.SLOTS.forEach((k) => {
      const id = slotId(S, k);
      if (!id) return;
      if (!RAW[id]) return;   // 知らない品（消えたデータ）はそのまま（今までどおり）
      if (!X.fits(id, k)) {
        // 合う枠が空いていれば移す。無ければ荷物へ
        const to = (X.FITS[X.slotOf(id)] || []).find((t) => t !== k && !slotId(S, t) && X.fits(id, t));
        if (to) { S[to] = id; S[k] = k === "weapon" ? "fists" : ""; n++; } else back(k);
      }
    });
    if (X.blocked(S) && slotId(S, "off")) back("off");
    return n;
  };
  const baseFix = G.fixOldNames;
  G.fixOldNames = (S) => { const r = baseFix ? baseFix(S) : undefined; try { X.fix(S); } catch {} return r; };
  const baseAdopt = G.adoptLoaded;
  if (baseAdopt) G.adoptLoaded = (S) => { if (S && typeof S === "object") { try { X.fix(S); } catch {} } return baseAdopt(S); };
  const baseEndTurn = G.endTurn;
  G.endTurn = (...a) => { const r = baseEndTurn(...a); if (G.S && !G.S.over) X.fix(G.S); return r; };
  const baseNew = G.newGame;
  G.newGame = (...a) => { const r = baseNew(...a); if (G.S) { const S = G.S; ["off", "head", "feet", "ring2"].forEach((k) => { if (S[k] === undefined) S[k] = ""; }); } return r; };

  // ---------------------------------------------------------------- 比べる相手（I3 の比べの印）：その品が入る枠の今の品
  X.against = (it) => {
    const S = G.S;
    if (!S || !it) return null;
    const s = X.slotOf(it);
    if (s === "acc") {
      const a = X.item("ring"), b = X.item("ring2");
      if (!a || !b) return null;
      return G.i3 && G.i3.score && G.i3.score(a) > G.i3.score(b) ? b : a;
    }
    if (s === "hand") return X.item("weapon");
    const k = { off: "off", head: "head", body: "armor", feet: "feet" }[s];
    const cur = k ? X.item(k) : null;
    return cur && cur.type === it.type ? cur : null;
  };
  X.key = (S) => { S = S || G.S; return S ? X.SLOTS.map((k) => S[k] || "").join("|") : ""; };

  // 枠ごとの表（画面と図鑑用）：[{ k, name, id, it, blocked }]
  X.rows = (S) => {
    S = S || G.S;
    return X.SLOTS.map((k) => {
      const blocked = k === "off" && X.blocked(S);
      const id = blocked ? "" : slotId(S, k);
      return { k, name: X.NAME[k], id, it: id ? RAW[id] || null : null, blocked };
    });
  };
  // 図鑑の性能の行に「枠」（武器は片手・両手）
  const baseStats = G.codexItemStats;
  if (baseStats) {
    G.codexItemStats = (id) => {
      const rows = baseStats(id);
      const s = X.slotOf(id);
      if (!s || !Array.isArray(rows)) return rows;
      rows.push(["枠", s === "hand" ? (X.hands(id) === 2 ? "両手持ち（右手と左手）" : "片手（右手か左手）") : s === "acc" ? "装飾品（二つまで）" : s === "off" ? "左手（盾）" : X.KIND[s]]);
      return rows;
    };
  }
  // 持ち物の品を入れられる枠（画面のボタン用）
  X.slotsFor = (id) => { const s = X.slotOf(id); return s ? X.FITS[s].filter((k) => X.fits(id, k)) : []; };
})(globalThis.G = globalThis.G || {});
