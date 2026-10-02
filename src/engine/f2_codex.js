// F2：アイテム図鑑と魔物図鑑。冒険をまたいで残る（profile＝G.P に保存。死んでも・引退しても残る）。
//   G.P.codex = { items: { id: { by, date, at } }, foes: { id: { by, date, at, kills, kby, kdate } } }
//   アイテム：手に入れた（拾う・買う・報酬・宝箱・出来事・ドロップ。すべて G.give を通る）とき。持ち始めの品も新しい冒険で載る
//   魔物：初めて戦った（G.startCombat）ときと、倒した（G.combatAct のあいだに HP が 0 になった）ときを分けて記録。倒した数も
// 古い profile（codex が無い）でも動く。今の冒険のセーブ（S.f2codex が無い）は、持ち物・装備・記録の「〜を倒した！」「〜が立ちはだかった！」・
// 狩りの依頼から一度だけ図鑑を埋め直す。主な入手場所・出現場所・性能はデータから引く（DOM なし。画面は ui/f2_codex.js）。
// core.js・combat.js は書き換えず、包む。レーン F（F2）
(function (G) {
  const D = G.data;
  const F2 = (G.f2 = G.f2 || {});

  G.onCodex = G.onCodex || null;           // 画面への通知（新しく埋まった項目）：(kind "item" | "foe", id)
  G.onCodexChange = G.onCodexChange || null; // 図鑑が変わった（倒した数を含む）。画面が profile を保存する

  // 図鑑に載せない物：素手と、データに無い物（"x:" の拾い物）
  F2.SKIP_ITEMS = new Set(["fists"]);
  F2.itemIds = () => Object.keys(D.ITEMS).filter((id) => !F2.SKIP_ITEMS.has(id));
  F2.foeIds = () => Object.keys(D.ENEMIES);
  F2.isApostle = (e) => !!(e && e.majin);

  // ---------------------------------------------------------------- 記録
  G.codex = () => {
    if (!G.P) G.P = { trophies: {}, graves: [] };
    const c = G.P.codex || (G.P.codex = {});
    if (!c.items) c.items = {};
    if (!c.foes) c.foes = {};
    return c;
  };
  const stamp = () => {
    const S = G.S;
    return { by: S && S.profile ? `${S.clsName || ""} ${S.profile.name || ""}`.trim() : "", date: S && G.dateOf ? G.dateOf(S.day) : "", at: Date.now() };
  };
  const changed = () => { if (G.onCodexChange) try { G.onCodexChange(); } catch {} };
  // 新しく埋まった項目には印（c.fresh。画面で詳しい説明を開くと消える）
  const notify = (kind, id) => {
    const c = G.codex();
    (c.fresh || (c.fresh = {}))[kind + ":" + id] = 1;
    if (G.onCodex) try { G.onCodex(kind, id); } catch {}
  };
  G.codexIsFresh = (kind, id) => !!(G.codex().fresh || {})[kind + ":" + id];
  G.codexSeen = (kind, id) => { const f = G.codex().fresh; if (!f || !f[kind + ":" + id]) return false; delete f[kind + ":" + id]; changed(); return true; };

  G.codexItem = (id, quiet) => {
    if (!D.ITEMS[id] || F2.SKIP_ITEMS.has(id)) return false;
    const c = G.codex();
    if (c.items[id]) return false;
    c.items[id] = stamp();
    if (!quiet) notify("item", id);
    changed();
    return true;
  };
  G.codexMeet = (id, quiet) => {
    if (!D.ENEMIES[id]) return false;
    const c = G.codex();
    if (c.foes[id]) return false;
    c.foes[id] = Object.assign(stamp(), { kills: 0 });
    if (!quiet) notify("foe", id);
    changed();
    return true;
  };
  G.codexKill = (id, quiet, n) => {
    if (!D.ENEMIES[id]) return false;
    G.codexMeet(id, true);
    const f = G.codex().foes[id];
    const first = !f.kills;
    f.kills = (f.kills || 0) + (n || 1);
    if (first) { const s = stamp(); f.kby = s.by; f.kdate = s.date; }
    if (first && !quiet && F2.isApostle(D.ENEMIES[id])) notify("foe", id);
    changed();
    return first;
  };
  G.codexHasItem = (id) => !!G.codex().items[id];
  G.codexFoe = (id) => G.codex().foes[id] || null;

  // 冒険をまたいだ図鑑を一つにまとめる（claude.ai のデータとこのブラウザの両方に残っていたとき。main.js が呼ぶ）
  G.codexMerge = (a, b) => {
    const out = { items: {}, foes: {}, fresh: Object.assign({}, (a && a.fresh) || {}, (b && b.fresh) || {}) };
    [a, b].forEach((c) => {
      if (!c) return;
      Object.entries(c.items || {}).forEach(([id, e]) => { const o = out.items[id]; if (!o || (e.at || 0) < (o.at || 0)) out.items[id] = { ...e }; });
      Object.entries(c.foes || {}).forEach(([id, e]) => {
        const o = out.foes[id];
        if (!o) { out.foes[id] = { ...e }; return; }
        const early = (e.at || 0) < (o.at || 0) ? e : o;
        out.foes[id] = { ...o, by: early.by, date: early.date, at: early.at, kills: Math.max(o.kills || 0, e.kills || 0), kby: o.kby || e.kby, kdate: o.kdate || e.kdate };
      });
    });
    return out;
  };

  // ---------------------------------------------------------------- 今の冒険から埋め直す（一度だけ）
  const foeByName = (name) => {
    const n = String(name || "").replace(/[A-E]$/, "");
    return F2.foeIds().find((id) => D.ENEMIES[id].name === n) || null;
  };
  G.codexSeed = (S) => {
    if (!S || S.f2codex) return false;
    S.f2codex = 1;
    const items = new Set([...Object.keys(S.inv || {}), S.weapon, S.armor, S.ring].filter(Boolean));
    items.forEach((id) => G.codexItem(id, true));
    (S.log || []).forEach((l) => {
      if (l.fx === "down" && l.foe) { const id = foeByName(l.foe); if (id) G.codexKill(id, true); }
      const m = /^(.+)が立ちはだかった！$/.exec(String(l.text || ""));
      if (m) m[1].split("、").forEach((nm) => { const id = foeByName(nm); if (id) G.codexMeet(id, true); });
    });
    (S.quests || []).forEach((q) => { if (q.type === "hunt" && q.progress > 0 && D.ENEMIES[q.target]) G.codexMeet(q.target, true); });
    if (S.combat) (S.combat.foes || []).forEach((f) => G.codexMeet(f.id, true));
    changed();
    return true;
  };

  // ---------------------------------------------------------------- 包む
  const baseGive = G.give;
  G.give = (id, n) => {
    const r = baseGive(id, n);
    if (r && G.S) G.codexItem(id);
    return r;
  };

  const baseStartCombat = G.startCombat;
  G.startCombat = (ids, opt) => {
    baseStartCombat(ids, opt);
    if (!G.S || !G.S.combat) return;
    G.S.combat.foes.forEach((f) => G.codexMeet(f.id));
  };

  const baseCombatAct = G.combatAct;
  G.combatAct = (arg) => {
    const C = G.S && G.S.combat;
    const alive = C ? C.foes.filter((f) => f.hp > 0) : [];
    const r = baseCombatAct(arg);
    alive.forEach((f) => { if (f.hp <= 0) G.codexKill(f.id); });
    return r;
  };

  const baseNewGame = G.newGame;
  G.newGame = (opt) => {
    const S = baseNewGame(opt);
    S.f2codex = 1;
    [...Object.keys(S.inv || {}), S.weapon, S.armor, S.ring].filter(Boolean).forEach((id) => G.codexItem(id, true));
    return S;
  };

  const baseEndTurn = G.endTurn;
  G.endTurn = () => {
    if (G.S && !G.S.f2codex) G.codexSeed(G.S);
    baseEndTurn();
  };

  // ---------------------------------------------------------------- データから引く：入手場所・出現場所
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  // 出来事などのデータを辿って、item（アイテム）と fight（敵）を拾う
  const walk = (o, fn, seen) => {
    if (!o || typeof o !== "object" || seen.has(o)) return;
    seen.add(o);
    if (Array.isArray(o)) { o.forEach((x) => walk(x, fn, seen)); return; }
    Object.entries(o).forEach(([k, v]) => { if (typeof v !== "function") { fn(k, v); walk(v, fn, seen); } });
  };
  const evName = (e) => `出来事「${e.title || e.id}」`;
  const locWhere = (e) => as(e.where).map((w) => D.LOCS[w]).filter(Boolean);
  const WHERE_WORD = { town: "町", wild: "野", dungeon: "迷宮", any: "各地", capital: "都", port: "港町", snow: "雪の土地", realm: "使徒の土地" };

  let index = null;
  F2.index = () => {
    if (index) return index;
    const item = {}, foe = {};
    const addI = (id, rank, text) => { if (!D.ITEMS[id]) return; const a = (item[id] = item[id] || []); if (!a.some((x) => x.text === text)) a.push({ rank, text, n: a.length }); };
    const addF = (id, rank, text, region) => { if (!D.ENEMIES[id]) return; const a = (foe[id] = foe[id] || []); if (!a.some((x) => x.text === text)) a.push({ rank, text, region, n: a.length }); };

    // 商店
    const shops = {};
    Object.entries(D.LOCS).forEach(([lid, L]) => { if ((L.fac || []).includes("shop")) as(L.shop).forEach((id) => (shops[id] = shops[id] || []).push(L.name)); });
    Object.entries(shops).forEach(([id, names]) => addI(id, 0, names.length > 2 ? `${names.slice(0, 2).join("・")}ほかの商店` : `${names.join("・")}の商店`));
    as(D.SHOP_BASE).forEach((id) => addI(id, 0, "どの町の商店でも"));
    // 交易の品（Q4）
    const Q4 = D.Q4 || G.Q4 || {};
    Object.entries(Q4.GOODS || {}).forEach(([id, g]) => { const L = D.LOCS[g.from]; addI(id, 0, L ? `${L.name}で仕入れる` : "交易で仕入れる"); });
    if (Q4.CART) addI(Q4.CART.id, 0, `${as(Q4.CART.sold).map((l) => (D.LOCS[l] || {}).name).filter(Boolean).slice(0, 2).join("・")}で買う`);
    // 敵の落とし物（確率の高い順）
    const drops = [];
    Object.entries(D.ENEMIES).forEach(([eid, e]) => as(e.loot).forEach(([id, p]) => drops.push([id, p, e.name, e.boss ? 1 : 0])));
    // 並の敵を先に（主の落とし物は最後）、確率の高い順
    drops.sort((a, b) => a[3] - b[3] || b[1] - a[1]).forEach(([id, , nm, boss]) => addI(id, boss ? 2 : 1, `${nm}が落とす`));
    // 迷宮の主・中ボス・出現表
    Object.entries(D.LOCS).forEach(([lid, L]) => {
      as(L.pool).forEach((id) => addF(id, 0, L.name, L.region));
      Object.entries(L.midboss || {}).forEach(([fl, id]) => addF(id, 0, `${L.name}の${fl}階`, L.region));
      if (L.boss) addF(L.boss, 0, `${L.name}の最奥`, L.region);
      if (L.reward) walk(L.reward, (k, v) => { if (k === "item") (typeof v === "string" ? [v] : Object.keys(v || {})).forEach((id) => addI(id, 1, `${L.name}の最奥`)); }, new Set());
    });
    // 出来事
    as(D.EVENTS).forEach((e) => {
      const locs = locWhere(e);
      walk(e, (k, v) => {
        if (k === "item") (typeof v === "string" ? [v] : Object.keys(v || {})).forEach((id) => addI(id, 2, evName(e)));
        if (k === "fight") as(v).forEach((id) => {
          if (id === "@pool") return;
          const place = locs.length ? locs[0].name : as(e.where).map((w) => WHERE_WORD[w]).filter(Boolean)[0];
          addF(id, 2, place ? `${place}（${evName(e)}）` : evName(e), locs.length ? locs[0].region : "");
        });
      }, new Set());
    });
    // 鍛冶場（W2）
    as(D.W2_FORGE).forEach((r) => addI(r.give, 2, "鍛冶場で打たせる"));
    // 職業の持ち始め
    Object.values(D.CLASSES || {}).forEach((c) => [c.weapon, c.armor, ...Object.keys(c.items || {})].filter(Boolean).forEach((id) => addI(id, 3, `${c.name}の持ち始め`)));
    // コードの中で渡している物（データに書いていない入手先）
    Object.entries(D.F2_ITEM_WHERE || {}).forEach(([id, list]) => as(list).forEach((t) => addI(id, 1, t)));
    Object.entries(D.F2_FOE_WHERE || {}).forEach(([id, list]) => as(list).forEach((t) => addF(id, 1, t, "")));

    const sort = (a) => a.sort((x, y) => x.rank - y.rank || x.n - y.n);
    Object.values(item).forEach(sort);
    Object.values(foe).forEach(sort);
    return (index = { item, foe });
  };
  F2.resetIndex = () => { index = null; };

  // 主な入手場所（3つまで）
  G.codexItemWhere = (id, max) => (F2.index().item[id] || []).slice(0, max || 3).map((x) => x.text);
  // 主な出現場所（3つまで）
  G.codexFoeWhere = (id, max) => (F2.index().foe[id] || []).slice(0, max || 3).map((x) => x.text);
  // 地域（出現場所の一つ目の地方。無ければ「各地」）
  G.codexFoeRegion = (id) => { const a = (F2.index().foe[id] || []).find((x) => x.region); return a ? a.region : "各地"; };
  F2.regions = () => {
    const out = [];
    Object.values(D.LOCS).forEach((L) => { if (L.region && !out.includes(L.region)) out.push(L.region); });
    out.push("各地");
    return out;
  };

  // ---------------------------------------------------------------- 種類
  F2.ITEM_KINDS = [
    ["weapon", "武器"], ["armor", "防具"], ["ring", "装飾品"], ["use", "消耗品"], ["loot", "素材"], ["relic", "遺物"], ["other", "その他"],
  ];
  F2.kindOf = (it) => {
    if (!it) return "other";
    if (it.relic) return "relic";
    if (["weapon", "armor", "ring", "use", "loot"].includes(it.type)) return it.type;
    if (it.type === "trade") return "loot";
    return "other";
  };

  // ---------------------------------------------------------------- 性能（データから）
  const dice = (d) => (d ? `${d[0]}D${d[1]}${d[2] ? G.sign(d[2]) : ""}` : "");
  const KIND = { fire: "炎の魔法", heal: "癒し", steal: "盗み", trap: "罠", talk: "話術" };
  G.codexItemStats = (id) => {
    const it = D.ITEMS[id];
    if (!it) return [];
    const rows = [];
    const t = it.type;
    if (t === "weapon") {
      rows.push(["攻撃", dice(it.dmg)], ["命中", `${it.stat || "筋力"}${it.hit ? "・" + G.sign(it.hit) : ""}`]);
      if (it.vital) rows.push(["急所", G.sign(it.vital)]);
      if (it.pierce) rows.push(["特性", "使徒の絶界を斬り裂く"]);
    }
    if (t === "armor") { rows.push(["防御", String(it.def || 0)]); if (it.agi) rows.push(["敏捷", G.sign(it.agi)]); }
    if (it.magic && t !== "ring") rows.push(["魔法", G.sign(it.magic)]);
    if (t === "ring") rows.push(["効果", G.ringEffect ? G.ringEffect(it) : ""]);
    if (t === "use") {
      const e = [];
      if (it.hp) e.push(it.hp >= 999 ? "HP 全快" : `HP +${it.hp}`);
      if (it.mp) e.push(it.mp >= 999 ? "MP 全快" : `MP +${it.mp}`);
      if (it.escape) e.push("戦闘から逃げる");
      if (it.holy) e.push("不死の敵に聖なる傷");
      if (it.sanity) e.push("正気が戻る");
      if (e.length) rows.push(["効果", e.join("・")]);
    }
    if (t === "gear") {
      const e = Object.entries(it.bonus || {}).map(([k, n]) => (KIND[k] || k) + G.sign(n));
      if (it.gun) e.push(`撃つ ${dice(it.gun.dmg)}`);
      if (e.length) rows.push(["効果", e.join("・") + "（持っているだけで）"]);
    }
    if (t === "tome") { const sp = (D.SPELLS || {})[it.teach]; rows.push(["覚える術", sp ? sp.name || it.teach : it.teach || ""], ["読み解く", `知力・${it.learn || "普通"}`]); }
    if (it.toll) rows.push(["代償", "あり"]);
    if (it.cursed) rows.push(["呪い", "外すと傷を負う"]);
    if (["weapon", "armor", "ring"].includes(t)) rows.push(["装備", "どの職業でも"]);
    rows.push(["値段", it.key || t === "key" ? "値が付かない" : it.price ? `${it.price}G` : "—"]);
    return rows.filter(([, v]) => v);
  };

  // 魔物の性能。level：まだ倒していなければ一部を「？」に。使徒は倒すまで性能を伏せる（名前と伝承の一行だけ）
  G.codexFoeStats = (id) => {
    const e = D.ENEMIES[id];
    const rec = G.codexFoe(id);
    if (!e || !rec) return [];
    const killed = (rec.kills || 0) > 0;
    const q = "？";
    if (F2.isApostle(e) && !killed) return [];
    const traits = [];
    if (e.boss) traits.push("主");
    if (e.majin) traits.push("絶界");
    if (e.undead) traits.push("不死");
    if (e.magic) traits.push("鎧を素通りする攻撃");
    if (e.will >= 999) traits.push("話が通じない");
    if (e.bribe) traits.push(`金で見逃す（${e.bribe}G）`);
    if (e.fleeAt) traits.push("深手で逃げる");
    const weak = [];
    if (e.mres < 0) weak.push("魔法");
    if (e.undead) weak.push("聖水・癒しの奇跡");
    if (e.will <= 30) weak.push("脅し");
    if (e.def >= 20) weak.push("刃が通りにくい");
    if (e.mres >= 25) weak.push("魔法が効きにくい");
    const loot = as(e.loot).map(([lid]) => (G.codexHasItem(lid) ? (D.ITEMS[lid] || {}).name : "？？？")).filter(Boolean);
    return [
      ["格", String(e.tier)],
      ["HP", killed ? String(e.hp) : q],
      ["攻撃", `${dice(e.dmg)}${killed ? `（命中 ${e.hit}%）` : ""}`],
      ["防御", killed ? String(e.def) : q],
      ["素早さ", killed ? String(e.agi) : q],
      ["特技", killed ? traits.join("・") || "なし" : q],
      ["弱点", killed ? weak.join("・") || "なし" : q],
      ["落とす物", killed ? loot.join("・") || "なし" : q],
      ["金", killed ? (e.gold && e.gold[1] ? `${e.gold[0]}〜${e.gold[1]}G` : "なし") : q],
    ];
  };

  // ---------------------------------------------------------------- 説明（フレーバー）
  // アイテム：I2 の説明（G.itemFlavor・it.flavor）。まだ無ければ既存の desc
  G.codexItemText = (id) => {
    const it = D.ITEMS[id];
    if (!it) return "";
    if (G.itemFlavor) { const t = G.itemFlavor(id); if (t) return t; }
    return it.flavor || it.desc || "";
  };
  // 魔物：data/f2_bestiary.js の説明。無ければ desc。使徒は倒すまで伝承の一行だけ
  G.codexFoeText = (id) => {
    const e = D.ENEMIES[id];
    if (!e) return "";
    const rec = G.codexFoe(id);
    if (F2.isApostle(e) && !(rec && rec.kills)) return (D.F2_APOSTLE || {})[id] || "その名を口にする者は少ない。";
    return (D.F2_BESTIARY || {})[id] || e.desc || "";
  };

  // 埋まった数
  G.codexCount = () => {
    const c = G.codex();
    const items = F2.itemIds(), foes = F2.foeIds();
    return {
      items: items.filter((id) => c.items[id]).length, itemsAll: items.length,
      foes: foes.filter((id) => c.foes[id]).length, foesAll: foes.length,
      kills: foes.filter((id) => c.foes[id] && c.foes[id].kills).length,
    };
  };
})(globalThis.G = globalThis.G || {});
