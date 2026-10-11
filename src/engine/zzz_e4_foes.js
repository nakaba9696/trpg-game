// E4：地域の魔物・強い個体・群れ・眷属・戦いの手ざわり（data/enemies_e4_regions.js・data/enemies_e4_kin.js）。
// combat.js・explore.js は書き換えず、包む：
//   1. 出現表：rg（地域）・also・where を、読み込みのあとで場所の e4pool に入れる（W3・W4 の新しい場所も地域名で当たる）
//   2. 出会い（G.startCombat）：出現表から引いた敵を、ある割合で e4pool の敵に替える。when（昼夜・季節・天候）に合う敵だけ。眷属は半分見送る。
//      強い個体（elder）にまれに入れ替わる。群れ（pack）は数をそろえる
//   3. 手番（G.combatAct）：眠り・武器を落とした・仲間が押さえ込まれた分を先に済ませ、庇う（guard）を当て、
//      手番のあとに弱点（weak）の上乗せと、敵ごとの行動（acts）を出す。倒した眷属は手がかりと縄張りの数に、強い個体はトロフィーに
//   4. 図鑑：性能の表に行動・弱点・印・出る時を足し、強い個体の出現場所を元の種から引く
// 古いセーブ（S.e4kin・C.e4* が無い）でも動く。乱数は G.rand だけ。レーン E＋B
(function (G) {
  const D = G.data;
  const E4 = (D.E4 = D.E4 || {});
  const E = () => D.ENEMIES;
  const isE4 = (id) => /^e4k?_/.test(id);
  const kinOf = (id) => (E()[id] || {}).kinOf;

  // ---------------------------------------------------------------- 1. 出現表
  // E4 の敵は場所の pool には入れず、場所ごとの別の表 L.e4pool に置く。出会いのときに pool から引いた敵と、ある割合で入れ替える。
  // （pool を数える仕組み〔依頼の的・ボットの見積もり・ほかの子の出来事〕を変えないため。図鑑の出現場所は e4pool からも引く）
  const RG = Object.fromEntries(Object.entries(E4.RG || {}).map(([k, v]) => [k, new RegExp(v)]));
  E4.fitTier = (tier, danger) => danger >= 1 && tier <= danger && tier >= Math.max(1, danger - 1);
  E4.placeOf = (id, lid) => {
    const e = E()[id], L = D.LOCS[lid];
    if (!e || !L || !(L.pool || []).length || e.boss || e.elderOf) return false;
    if ((e.where || []).includes(lid) || (e.also || []).includes(lid)) return true;
    return !e.kinOf && !!e.rg && !!RG[e.rg] && RG[e.rg].test(L.area || L.region || "") && E4.fitTier(e.tier, L.danger || 0);
  };
  E4.spread = () => {
    const ids = Object.keys(E()).filter(isE4);
    Object.keys(D.LOCS).forEach((lid) => {
      const L = D.LOCS[lid];
      ids.forEach((id) => { if (E4.placeOf(id, lid)) { L.e4pool = L.e4pool || []; if (!L.e4pool.includes(id)) L.e4pool.push(id); } });
    });
  };
  E4.spread();
  E4.where = (id) => Object.keys(D.LOCS).filter((lid) => (D.LOCS[lid].e4pool || []).includes(id));

  // ---------------------------------------------------------------- 2. 出会い
  // mix：pool から引いた一体が E4 の敵に替わる割合の上限（e4pool の数 ÷ 両方の数。多くても 35%）
  const P = { elder: 0.05, elderNight: 0.08, kinSkip: 0.5, mix: 0.35 };
  E4.P = P;
  const dangerNow = (S) => Math.max((D.LOCS[S.loc] || {}).danger || 1, S.travel ? (D.LOCS[S.travel] || {}).danger || 1 : 1);
  E4.whenOk = (e, S) => {
    const w = e && e.when;
    if (!w || !S) return true;
    const L = D.LOCS[S.loc] || {};
    if (L.type === "dungeon") return true; // 迷宮の中は昼夜も空も見えない
    if (w.night && S.phase !== 3) return false;
    if (w.day && S.phase === 3) return false;
    const sky = (w.season || w.weather) && G.skyAt ? G.skyAt(S.loc, S.day) : null;
    if (w.season && sky && !w.season.includes(sky.season)) return false;
    if (w.weather && sky && !w.weather.includes(sky.weather)) return false;
    return true;
  };
  // 出現表（pool か e4pool）から引いた出会いか（出来事の「その場の敵」も含む）。勝ったときの結果つきの戦い（ボス・中ボス・出来事の名指し）は触らない
  E4.shape = (ids) => {
    const S = G.S;
    if (!S || !ids.length) return ids;
    const locs = [S.loc, S.travel].filter(Boolean).map((l) => D.LOCS[l]).filter((L) => L && (L.pool || []).length);
    const from = (id) => locs.find((L) => L.pool.includes(id) || (L.e4pool || []).includes(id));
    if (!ids.every((id) => E()[id] && !E()[id].boss && from(id))) return ids;
    const okFor = (id) => E4.whenOk(E()[id], S);
    let out = ids.map((id) => {
      const L = from(id);
      const plain = L.pool.filter((x) => E()[x] && !E()[x].boss && !isE4(x));
      if (isE4(id)) { // 名指しの E4 の敵：時と空が合わなければ、眷属は半分、その場の並の敵に替える
        if (!okFor(id) || (E()[id].kinOf && G.rand() < P.kinSkip)) return plain.length ? G.pick(plain) : id;
        return id;
      }
      const extra = (L.e4pool || []).filter(okFor);
      if (!extra.length || G.rand() >= Math.min(P.mix, extra.length / (plain.length + extra.length))) return id;
      const x = G.pick(extra);
      return E()[x].kinOf && G.rand() < P.kinSkip ? id : x;
    });
    // 強い個体（まれ。夜は少し多い。危険度 1 の場所には出ない）
    if (dangerNow(S) >= 2) out = out.map((id) => {
      const x = (E4.ELDER_OF || {})[id];
      return x && E()[x] && G.rand() < (S.phase === 3 ? P.elderNight : P.elder) ? x : id;
    });
    // 群れ：数をそろえる（全体の数は場所の危険度まで：危険度 1 は 2 体・2〜3 は 3 体・4 から 4 体）
    const head = out.find((id) => E()[id].pack);
    if (head) {
      const [lo, hi] = E()[head].pack;
      const n = lo + Math.floor(G.rand() * (hi - lo + 1));
      const cap = E4.packCap(S);
      if (out.length > cap) out = out.slice(0, cap);
      while (out.filter((x) => x === head).length < n && out.length < cap) out.push(head);
    }
    return out;
  };
  E4.packCap = (S) => { const d = dangerNow(S); return d <= 1 ? 2 : d <= 3 ? 3 : 4; };
  const baseStart = G.startCombat;
  G.startCombat = (ids, opt) => {
    const o = opt || {};
    const list = !o.win && !o.e4raw && Array.isArray(ids) ? E4.shape(ids.slice()) : ids;
    baseStart(list, opt);
    const C = G.S && G.S.combat;
    if (!C) return;
    C.e4start = C.foes.map((f) => f.id);
    C.foes.forEach((f) => { const a = G.e3Of && G.e3Of(f.id); if (a && E4.CORE && E4.CORE[a.id] && E4.coreMet(a.id)) G.say(E4.CORE[a.id]); });
  };

  // 縄張りの眷属を退けた使徒は弱る：まだ満たしていない条件の 1/4 ぶん、満たしたことにする（すべて満たせば同じ）
  E4.coreMet = (ap, S) => ((((S || G.S || {}).e4kin) || {})[ap] || 0) >= (E4.CORE_NEED || 2);
  if (G.e3Mods && D.E3) {
    const baseMods = G.e3Mods;
    G.e3Mods = (id, S) => {
      const m = baseMods(id, S);
      const a = D.E3.LIST[id];
      if (!a || !E4.CORE || !E4.CORE[id] || !E4.coreMet(id, S) || m.frac >= 1) return m;
      const frac = m.frac + (1 - m.frac) * 0.25;
      const W = D.E3.WEAK[a.rank];
      const mul = (x) => 1 - frac * (1 - x);
      return Object.assign({}, m, { frac, e4core: true, hp: mul(W.hp), dmg: mul(W.dmg), hit: Math.round(frac * W.hit), def: Math.round(frac * W.def), agi: Math.round(frac * W.agi) });
    };
  }

  // ---------------------------------------------------------------- 3. 手番
  const ELEM = { blade: "刃", fire: "炎", ice: "冷気", bolt: "雷", holy: "聖水" };
  const kindElem = (kind, itemId) => ({ attack: "blade", vital: "blade", fire: "fire", ice: "ice", bolt: "bolt", item: itemId === "holywater" ? "holy" : null })[kind] || null;
  const acts = (f) => (E()[f.id] || {}).acts || [];
  const has = (f, a) => acts(f).includes(a);

  // 倒れた敵の後始末（combat.js の onFoeDown と同じこと。弱点の上乗せで倒したとき）
  function downed(f) {
    const S = G.S;
    G.log("nar", `${f.name}を倒した！`, { fx: "down", foe: f.name, boss: !!E()[f.id].boss });
    S.counters.kills++;
    S.quests.forEach((q) => {
      if (q.type === "hunt" && !q.done && q.target === f.id && q.loc === S.loc) {
        q.progress++;
        if (q.progress >= q.need) { q.done = true; G.note(`依頼「${q.title}」を達成した。ギルドに報告しよう。`); }
      }
    });
    if (G.codexKill) G.codexKill(f.id);
  }
  // 敵を増やす（呼ばれた仲間）。名前に記号を付けて区別する
  function addFoe(id, how) {
    const C = G.S.combat;
    const e = E()[id];
    if (!C || !e || G.alive().length >= 4) return null;
    const same = C.foes.filter((f) => f.id === id).length;
    const f = { id, name: e.name + (same ? "ABCDEFGH"[same] || "" : ""), hp: e.hp, max: e.hp };
    C.foes.push(f);
    G.say(how.replace("{n}", f.name));
    if (G.codexMeet) G.codexMeet(id);
    return f;
  }
  const callMax = () => (dangerNow(G.S) <= 3 ? 1 : 2); // 呼べる数（危険度 3 までの場所では一度だけ）
  // 行動ひとつずつ（手番のあと、凍っていない敵が、決まった見込みで）
  const ACT = {
    poison: (f, e) => {
      const S = G.S;
      if (S.conds.includes("毒") || G.rand() >= 0.2) return;
      if (G.d(100) > Math.min(90, G.foeHitChance(e))) { G.note(`${f.name}の毒をかわした。`); return; }
      S.conds.push("毒");
      G.say(`${f.name}の毒が傷口から回った。体が重い。`);
      G.note("状態：毒（筋力・体力が落ちる。宿屋か教会で治る）");
    },
    sleep: (f) => {
      const C = G.S.combat;
      if (C.e4sleep || G.rand() >= 0.2) return;
      const r = G.check("知力", 10, "眠気をこらえる");
      if (G.S.over) return;
      if (r.ok) { G.note(`${f.name}の眠りの誘いを、頭を振って払った。`); return; }
      C.e4sleep = 1;
      G.say(`${f.name}に誘われて、まぶたが落ちた。`);
    },
    disarm: (f) => {
      const C = G.S.combat;
      if (C.e4disarm || G.S.weapon === "fists" || !G.S.weapon || G.rand() >= 0.18) return;
      const r = G.check("筋力", 0, "武器を握りしめる");
      if (G.S.over) return;
      if (r.ok) { G.note(`${f.name}が武器を払おうとしたが、握りしめて離さなかった。`); return; }
      C.e4disarm = 1;
      G.say(`${f.name}に${G.weapon().name}を払い落とされた。拾わなければ。`);
    },
    steal: (f, e) => {
      const S = G.S;
      const C = S.combat;
      if (G.rand() >= 0.16) return;
      const r = G.check("敏捷", 0, "懐を守る");
      if (S.over) return;
      if (r.ok) { G.note(`${f.name}の手が懐に伸びたが、払いのけた。`); return; }
      const goods = Object.keys(S.inv).filter((id) => { const it = D.ITEMS[id]; return it && it.type === "use"; });
      if (goods.length && G.rand() < 0.5) {
        const id = G.pick(goods);
        G.take(id);
        G.say(`${f.name}が${D.ITEMS[id].name}をひったくって逃げた。`);
      } else {
        const n = Math.min(S.gold, G.d(10) + 4 * e.tier);
        if (!n) return;
        S.gold -= n;
        G.say(`${f.name}が財布から ${n}G をすり取って逃げた。`);
      }
      C.foes.splice(C.foes.indexOf(f), 1);
    },
    pin: (f) => {
      const S = G.S;
      if (!S.companions.length || S.combat.e4pin || G.rand() >= 0.3) return;
      const c = G.pick(S.companions);
      S.combat.e4pin = c.name;
      G.say(`${f.name}が${c.name}に飛びかかり、押さえ込んだ。`);
    },
    call: (f, e) => {
      const C = G.S.combat;
      if ((C.e4calls || 0) >= callMax() || G.alive().length >= E4.packCap(G.S) || G.rand() >= 0.15) return;
      C.e4calls = (C.e4calls || 0) + 1;
      if (!addFoe(e.call || f.id, `${f.name}の呼び声に応えて、{n}が駆けつけた。`)) C.e4calls--;
    },
    fleecall: (f, e) => {
      const C = G.S.combat;
      if (f.hp > f.max * 0.4 || f.e4fled || G.rand() >= 0.5) return;
      C.foes.splice(C.foes.indexOf(f), 1);
      G.say(`${f.name}は身をひるがえして逃げていった。……遠くで、何かを呼ぶ声がする。`);
      if ((C.e4calls || 0) < callMax()) { C.e4calls = (C.e4calls || 0) + 1; addFoe(e.call || f.id, "{n}が、逃げた者に連れられて現れた。"); }
    },
    regen: (f) => {
      if (f.hp >= f.max) return;
      const n = Math.max(1, Math.floor(f.max / 10));
      f.hp = Math.min(f.max, f.hp + n);
      G.note(`${f.name}の傷が、みるみるふさがっていく（+${n}）。`);
    },
    enrage: (f) => {
      if (f.e4rage || f.hp > f.max / 3) return;
      f.e4rage = true;
      G.say(`深手を負った${f.name}が、猛り狂った。`);
    },
    drain: (f, e) => {
      if (G.rand() >= 0.22) return;
      if (G.d(100) > Math.min(90, G.foeHitChance(e))) return;
      const n = G.d(3) + Math.ceil(e.tier / 2);
      G.log("nar", `${f.name}が生気を吸った。${n} のダメージ。`, { fx: "hurt", n, heavy: false });
      G.hurt(n, `${f.name}に生気を吸い尽くされた`);
      f.hp = Math.min(f.max, f.hp + n);
    },
    corrode: (f) => {
      const C = G.S.combat;
      if (!G.armor() || G.rand() >= 0.25) return;
      C.exposed = true;
      G.note(`${f.name}の一撃で、鎧の継ぎ目が緩んだ。次は当たりやすい。`);
    },
    rout: () => {}, // 群れの崩れは下でまとめて見る
    guard: () => {}, // 庇うのは、こちらの手番の前に見る
  };
  E4.ACT_NAME = { poison: "毒", sleep: "眠り", disarm: "武器を払い落とす", steal: "盗んで逃げる", pin: "仲間を押さえ込む", call: "仲間を呼ぶ", fleecall: "逃げて仲間を呼ぶ", guard: "仲間を庇う", regen: "傷がふさがる", enrage: "深手で猛る", drain: "生気を吸う", corrode: "鎧を緩める", rout: "群れが崩れると逃げる" };

  // 猛った敵は強く当たる（G.foeData を包む。E3 の使徒と同じやり方）
  const baseFoeData = G.foeData;
  G.foeData = (f) => {
    const e = baseFoeData(f);
    if (!f || !f.e4rage || !e) return e;
    return Object.assign({}, e, { hit: e.hit + 10, dmg: [e.dmg[0], e.dmg[1], e.dmg[2] + 2] });
  };

  // 倒した敵：眷属の手がかりと縄張りの数・強い個体のトロフィー
  function onKilled(f) {
    const S = G.S;
    const e = E()[f.id];
    if (!e) return;
    if (e.kinOf) {
      const k = (S.e4kin = S.e4kin || {});
      k[e.kinOf] = (k[e.kinOf] || 0) + 1;
      if (e.clue && !S.flags["e4clue:" + f.id]) {
        S.flags["e4clue:" + f.id] = 1;
        G.say(e.clue.text);
        G.memo("手がかり：" + e.clue.memo);
        if (G.heard) G.heard("手がかり：" + e.clue.memo, (D.LORE || {})[e.kinOf] ? { lore: e.kinOf } : { foe: "e3_" + e.kinOf }); // 主の用語（人ならざる者）に
      }
      if (k[e.kinOf] === (E4.CORE_NEED || 2)) {
        G.note("この縄張りの主は、手下を失って少し弱ったはずだ。");
        G.award("e4_core");
      }
    }
    if (e.elderOf) {
      G.award("e4_elder");
      const P0 = G.P || (G.P = { trophies: {}, graves: [] });
      const seen = (P0.e4elders = P0.e4elders || {});
      seen[f.id] = (seen[f.id] || 0) + 1;
      if (Object.keys(seen).length >= 5) G.award("e4_elder5");
    }
  }

  const baseAct = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const C = S && S.combat;
    if (!C || S.over) return baseAct(arg);
    arg = String(arg);
    // 眠っている・武器を落とした：その手番は動けない
    if (C.e4sleep > 0) { C.e4sleep--; G.log("you", "まどろみの中で、体が動かない"); arg = "e4idle"; }
    else if (C.e4disarm && /^(attack|vital)$/.test(arg)) { C.e4disarm = 0; G.log("you", `落とした${G.weapon().name}を拾い直す`); arg = "e4idle"; }
    // 押さえ込まれた仲間は、この手番は動けない
    let held = null;
    if (C.e4pin) {
      const i = S.companions.findIndex((c) => c.name === C.e4pin);
      if (i >= 0) { held = [i, S.companions[i]]; S.companions.splice(i, 1); G.note(`${held[1].name}は押さえ込まれて動けない。`); }
      C.e4pin = null;
    }
    const [kind, itemId] = arg.split(":");
    // 庇う：狙った敵の前に、仲間を庇う敵が飛び込む
    let aimBack = null;
    const t0 = G.target();
    if (t0 && ["attack", "vital", "fire", "ice", "curse"].includes(kind)) {
      const g = G.alive().find((f) => f !== t0 && has(f, "guard") && !(f.frozen > 0));
      if (g && G.rand() < 0.4) {
        aimBack = t0;
        C.aim = C.foes.indexOf(g);
        G.say(`${g.name}が${t0.name}の前に飛び込んで、庇った。`);
      }
    }
    const before = new Map(C.foes.map((f) => [f, f.hp]));
    const mark = S.log[S.log.length - 1];
    try { baseAct(arg); } finally { if (held) S.companions.splice(Math.min(held[0], S.companions.length), 0, held[1]); }
    if (aimBack && S.combat === C) { const i = C.foes.indexOf(aimBack); if (i >= 0) C.aim = i; }
    // 弱点の上乗せ：こちらの一撃（その手番の最初のダメージ）だけ。E12 の耐性と弱点（aff）があればそちらが掛けるので、ここでは足さない
    const elem = kindElem(kind, itemId);
    if (elem && !S.over && !E4.weakByE12) {
      const from = S.log.lastIndexOf(mark) + 1;
      const fresh = S.log.slice(from);
      const hitOnce = new Set();
      fresh.forEach((l) => {
        if (l.fx !== "hit" || hitOnce.has(l.foe)) return;
        hitOnce.add(l.foe);
        const f = C.foes.find((x) => x.name === l.foe);
        if (!f || !String(l.text).startsWith(f.name + "に ")) return;
        const e = E()[f.id];
        if (!e || e.weak !== elem || before.get(f) <= 0) return;
        const add = Math.max(1, Math.ceil(l.n / 2));
        const wasUp = f.hp > 0;
        f.hp = Math.max(0, f.hp - add);
        if (wasUp) {
          G.log("sys", `${f.name}は${ELEM[elem]}に弱い。さらに ${add} のダメージ（残り ${f.hp}/${f.max}）`, { fx: "hit", foe: f.name, n: add });
          if (f.hp <= 0) downed(f);
        }
      });
    }
    // 倒した敵（この手番で HP が 0 になった）
    C.foes.forEach((f) => { if ((before.get(f) || 0) > 0 && f.hp <= 0) onKilled(f); });
    if (S.over) return;
    if (S.combat === C && S.mode === "combat" && !G.alive().length) { G._endCombat("win"); return; }
    if (S.combat !== C || S.mode !== "combat") return;
    // 敵ごとの行動
    G.alive().slice().forEach((f) => {
      if (S.over || S.combat !== C || f.hp <= 0 || f.frozen > 0 || !C.foes.includes(f)) return;
      const e = E()[f.id];
      acts(f).forEach((a) => { if (!S.over && S.combat === C && C.foes.includes(f) && ACT[a]) ACT[a](f, e); });
    });
    if (S.over || S.combat !== C) return;
    // 群れが崩れる：同じ種が並んで始まり、ひとりだけ残ったら逃げ出すことがある
    const start = C.e4start || [];
    G.alive().filter((f) => has(f, "rout")).forEach((f) => {
      const was = start.filter((id) => id === f.id).length;
      const now = G.alive().filter((x) => x.id === f.id).length;
      if (was >= 2 && now === 1 && !f.e4stay) {
        f.e4stay = true;
        if (G.rand() < 0.5) { G.say(`仲間を失った${f.name}は、背を向けて逃げ出した。`); C.foes.splice(C.foes.indexOf(f), 1); }
      }
    });
    if (S.mode === "combat" && S.combat === C && !G.alive().length) G._endCombat("win");
  };

  // ---------------------------------------------------------------- 3b. 知っていれば有利なこと（覚え書きの元）
  // 持ち主の方針：何度も死んで、有利なことを覚えていく。敵ごとに e.know = [{ id, text }]（L1 の冒険をまたぐ覚え書きが拾う。形は L1 に合わせて直す）。
  // データに know を書いた敵はそれを先に置き、データから分かること（弱点・行動とその受け方・出る時・逃げる条件など）を足す。
  const KNOW_ACT = {
    poison: "毒を持つ。毒は宿屋か教会で抜ける。薬を多めに持っていけ。",
    sleep: "眠りに誘ってくる。知力が高ければ払いのけやすい。",
    disarm: "武器を払い落としにくる。筋力があれば握りしめて離さない。",
    steal: "懐を狙い、盗むと逃げる。敏捷が高ければ守れる。",
    pin: "連れを押さえ込んでくる。連れに頼りすぎるな。",
    call: "放っておくと仲間を呼ぶ。早く片づけるほど楽になる。",
    fleecall: "深手を負うと逃げて、仲間を連れて戻る。逃げる前に一気に倒し切れ。",
    guard: "仲間を庇う。庇う者から先に倒すと早い。",
    regen: "傷がひとりでにふさがる。手数で押し切れ。",
    enrage: "深手を負うと猛って強く当たる。最後の一押しは守りを固めてから。",
    drain: "生気を吸って自分の傷を癒す。長引かせるな。",
    corrode: "鎧の継ぎ目を緩めてくる。緩んだ次の手番は身を守れ。",
    rout: "群れの片割れが倒れると、残りは逃げ出しやすい。",
  };
  const WHEN_TEXT = (w) => [w.night ? "夜" : "", w.day ? "昼" : "", (w.season || []).join("・"), (w.weather || []).join("・") ? `${(w.weather || []).join("・")}の日` : ""].filter(Boolean).join("の、");
  E4.know = (id) => {
    const e = E()[id];
    if (!e) return [];
    const out = [];
    const add = (k, text) => { if (!out.some((x) => x.id === k)) out.push({ id: k, text }); };
    (Array.isArray(e.know) ? e.know : []).forEach((x) => x && x.id && x.text && add(x.id, x.text));
    if (e.weak) add("weak:" + e.weak, `${ELEM[e.weak]}に弱い。当たれば深く効く。`);
    (e.acts || []).forEach((a) => KNOW_ACT[a] && add("act:" + a, KNOW_ACT[a]));
    if (e.when) add("when", `${WHEN_TEXT(e.when)}にしか出ない。避けたければ時を選べ。`);
    if (e.undead) add("undead", "不死のもの。聖水がよく効く。");
    if ((e.majin && (!G.hasWall || !G.e3Of || !G.e3Of(id) || G.hasWall(G.e3Of(id).id)))) add("majin", "見えない守り（絶界）がある。破る手立てを持たずに挑むな。"); // E11：絶界は黒鎧だけ
    if (e.mres >= 25 && e.def >= 20) add("hard", "刃も魔法も通りにくい。戦技の強い一撃か、弱みを探せ。");
    else {
      if (e.mres < 0) add("mres", "魔法に弱い。");
      else if (e.mres >= 25) add("mres", "魔法が効きにくい。刃で攻めよ。");
      if (e.def >= 20) add("def", "刃が通りにくい。魔法か、戦技の強い一撃を。");
    }
    if (e.magic) add("magic", "攻撃は鎧を素通りする。鎧より体力を頼れ。");
    if (e.bribe) add("bribe", `${e.bribe}G 払えば見逃してくれる。`);
    if (e.will <= 30) add("will", "脅しに弱い。威圧すれば逃げ出すことが多い。");
    if (e.fleeAt && !e.boss) add("flee", "深手を負うと逃げ出す。逃げられると何も残さない。");
    if (e.pack) add("pack", `群れで出る（${e.pack[0]}〜${e.pack[1]}体）。雷のように皆を打つ手が役に立つ。`);
    if (e.elderOf) add("elder", `まれに出る強い個体。必ず${((D.ITEMS[(e.loot[0] || [])[0]]) || {}).name || "珍しい素材"}を落とす。`);
    if (e.kinOf) add("kin", "使徒の眷属。縄張りで二体退けると、主が弱る。初めて倒すと主の弱みの手がかりが得られる。");
    if (!out.length || out.every((x) => /^(pack|kin|elder)$/.test(x.id))) {
      if (e.agi <= 25) add("agi", "足が遅い。勝てないと思ったら逃げやすい。");
      else if (e.agi >= 65) add("agi", "素早い。逃げるのは難しい。戦うと決めてから近づけ。");
      else if (e.will >= 999) add("will", "話が通じない。威圧も賄賂も効かない。");
      else add("hit", `${e.hit >= 75 ? "攻撃は、まず外れない" : e.hit >= 65 ? "攻撃は、よく当たる" : e.hit >= 50 ? "攻撃は、二度に一度より少し多く当たる" : "攻撃は、外れることも多い"}。身を守れば受ける傷は半分になる。`);
    }
    return out;
  };
  Object.keys(E()).forEach((id) => { E()[id].know = E4.know(id); });

  // ---------------------------------------------------------------- 4. 図鑑
  if (G.codexFoeStats) {
    const baseStats = G.codexFoeStats;
    G.codexFoeStats = (id) => {
      const rows = baseStats(id);
      const e = E()[id];
      if (!e || !rows.length || !(isE4(id) || e.elderOf)) return rows;
      const killed = G.f2 && G.f2.killed ? G.f2.killed(id) : false;
      if (!killed) return rows;
      const set = (k, add) => { const r = rows.find((x) => x[0] === k); if (!r || !add.length) return; r[1] = [r[1] === "なし" ? "" : r[1], ...add].filter(Boolean).join("・"); };
      set("特技", (e.acts || []).map((a) => E4.ACT_NAME[a]).filter(Boolean));
      if (e.weak) set("弱点", [ELEM[e.weak]]);
      const mark = [];
      if (e.elderOf) mark.push(`強い個体（${(E()[e.elderOf] || {}).name || ""}の中にまれに）`);
      if (e.pack) mark.push(`群れ（${e.pack[0]}〜${e.pack[1]}体）`);
      if (e.kinOf) mark.push("使徒の眷属");
      if (mark.length) rows.push(["印", mark.join("・")]);
      const w = e.when;
      if (w) rows.push(["出る時", [w.night ? "夜" : "", w.day ? "昼" : "", (w.season || []).join("・"), (w.weather || []).join("・")].filter(Boolean).join("の、") + "だけ"]);
      return rows;
    };
  }
  // 出現場所：e4pool の場所と、強い個体は元の種の出現場所を「まれに」で
  if (G.f2 && G.f2.index) {
    const F2 = G.f2;
    const baseIndex = F2.index;
    let done = null;
    F2.index = () => {
      const ix = baseIndex();
      if (done === ix) return ix;
      done = ix;
      Object.entries(D.LOCS).forEach(([lid, L]) => (L.e4pool || []).forEach((id) => {
        const a = (ix.foe[id] = ix.foe[id] || []);
        if (!a.some((r) => r.text === L.name)) a.push({ rank: 0, text: L.name, region: L.region, n: a.length });
      }));
      // 出来事で出会う場所（W8 の名のある強敵など）が先に入っていても、「まれに」の場所を足す
      Object.entries(E4.ELDER_OF || {}).forEach(([base, x]) => {
        const a = (ix.foe[x] = ix.foe[x] || []);
        (ix.foe[base] || []).forEach((r) => { const text = `${r.text}（まれに）`; if (!a.some((y) => y.text === text)) a.push({ rank: r.rank, text, region: r.region, n: a.length }); });
      });
      return ix;
    };
  }
})(globalThis.G = globalThis.G || {});
