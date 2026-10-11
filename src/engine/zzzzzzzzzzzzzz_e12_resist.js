// E12：魔物の耐性と弱点、武器の物理の種類（表は data/e12_affinity.js）。
// 名前の頭の z は、F1（zzzzzzzzzz_f1_duel.js）・K1（zzzzzzzzzzz_k1_skills.js）が G.cbDmgMod を置き換えたあとに包むため。
//   1. 読み込み：敵に e.aff = { 種類: 倍率 }・e.atk（攻め手）、武器に it.dtype = [種類] を付ける。E4 の weak は aff に合わせる
//   2. 倍率の入口：G.dmgMod(敵, 種類) → 倍率（1 等倍・1.5/2 弱点・0.5 耐性・0 無効）。敵は戦闘中の敵・データ・id のどれでもよい
//      こちらの一撃（G.cbDamage(f, n, how)）の how を種類に読み替えて掛ける（G.e12.typeOf）：
//        "blade" → 今の武器の dtype（二つあれば効くほう）/ "fire"・"ice"・"bolt"・"wind"・"earth"・"light"・"dark"・"slash"・"blunt"・"pierce" → そのまま /
//        "holy"（聖水）→ 光 / "curse"（呪いの蝕み・毒）→ 掛けない
//      M14 の術は G.cbDamage(f, n, "<属性>") を通せばそのまま効く。仲間の一撃（G.cbAllyDmg）と銃（刺突）も掛ける
//   3. ひとこと：弱点なら「よく効いている」、耐性なら「通りが悪い」、無効なら「まるで効かない」（数は見せない）
//   4. 図鑑：その敵に一度でも当てた種類の効き目を、その場で言葉で載せる（G.e12.known。E12b：倒した数の段階はやめた）。当てていない種類は「？」
//      記録は profile（G.P.codex.foes[id].e12 = { 種類: 1 }）。冒険をまたいで残る
//   5. 画面の文：武器の説明に「斬」「打」「突」、戦闘の攻撃の札に種類と、分かっていれば効き目
//   6. こちらの防具（E12b）：防具に効き目（D.E12.ARMOR）。敵の攻め手（e.atk 物理・e.atkEl 属性）に、着ている物すべての効き目を掛ける（G.cbHurtMod。combat.js の敵の一撃）。
//      呪いの攻撃（magic）は鎧を素通りするので属性だけ。防具の説明・図鑑・店に「斬に強い・突に弱い」と言葉で出す
// 古いセーブ・古い profile（e12 が無い）でも動く。乱数は使わない。DOM には触らない。レーン E＋B
(function (G) {
  const D = G.data;
  const X = D.E12;
  if (!X) return;
  const API = (G.e12 = G.e12 || {});
  const TYPE = Object.fromEntries(X.TYPES.map((t) => [t.id, t]));
  API.TYPE = TYPE;
  API.ELEMS = X.TYPES.filter((t) => t.kind === "elem").map((t) => t.id);
  API.PHYS = X.TYPES.filter((t) => t.kind === "phys").map((t) => t.id);

  // ---------------------------------------------------------------- 1. 読み込み
  API.parse = (str) => {
    const aff = {};
    let atk = null, atkEl = null, gear = null;
    const put = (tok) => {
      if (tok[0] === "@") {
        const t = tok.slice(1);
        if (!TYPE[t]) throw new Error(`E12: 知らない攻め手 ${tok}`);
        if (TYPE[t].kind === "phys") atk = t; else atkEl = t;
        return;
      }
      if (tok[0] === "=") {
        const g = (X.GEAR || {})[tok.slice(1)];
        if (!g) throw new Error(`E12: 知らない身なり ${tok}`);
        gear = tok.slice(1);
        g.aff.split(/\s+/).filter(Boolean).forEach(put);
        return;
      }
      const m = /^([a-z]+)(\+\+|\+|-|!|=)$/.exec(tok);
      if (!m || !TYPE[m[1]]) throw new Error(`E12: 読めない印 ${tok}`);
      if (m[2] === "=") delete aff[m[1]];
      else aff[m[1]] = X.MARK[m[2]];
    };
    String(str || "").split(/\s+/).filter(Boolean).forEach(put);
    return { aff, atk, atkEl, gear };
  };
  const E4W = { fire: ["fire"], ice: ["ice"], bolt: ["bolt"], holy: ["light"], blade: ["slash", "blunt", "pierce"] };
  const ruled = (e) => {
    const R = X.RULES;
    return [R.shape[e.shape] || "", e.undead ? R.undead : "", e.magic ? R.magic : ""].join(" ");
  };
  API.setup = (id, e) => {
    if (!e || (e.aff && e.e12set)) return e;
    const src = X.FOES[id] != null ? X.FOES[id] : e.elderOf && X.FOES[e.elderOf] != null ? X.FOES[e.elderOf] : null;
    const p = API.parse(src != null ? src : ruled(e));
    (E4W[e.weak] || []).forEach((t) => { if (!(p.aff[t] >= 1.5)) p.aff[t] = 1.5; });
    e.aff = p.aff;
    e.atk = p.atk || e.atk || X.ATK_BY_SHAPE[e.shape] || "slash";
    e.atkEl = p.atkEl || (X.ATK_ELEM || []).find((t) => p.aff[t] === 0) || (e.magic ? "dark" : null);
    if (p.gear) e.gear = p.gear;
    e.e12set = true;
    return e;
  };
  API.setupAll = () => {
    Object.entries(D.ENEMIES).forEach(([id, e]) => API.setup(id, e));
    Object.entries((D.E3 && D.E3.FOES) || {}).forEach(([id, e]) => API.setup(id, e));
  };
  API.setupAll();

  API.weaponTypes = (it) => {
    if (!it) return ["blunt"];
    if (Array.isArray(it.dtype) && it.dtype.length) return it.dtype;
    if (typeof it.dtype === "string") return [it.dtype];
    const t = X.WEAPONS[it.id] || (it.base && X.WEAPONS[it.base]);
    if (t) return t;
    const r = X.WEAPON_RX.find(([rx]) => rx.test(it.name || ""));
    return r ? r[1] : ["slash"];
  };
  Object.entries(D.ITEMS).forEach(([id, it]) => {
    if (it && it.type === "weapon" && !it.dtype) it.dtype = (X.WEAPONS[id] || API.weaponTypes(Object.assign({ id }, it))).slice();
  });

  // ---------------------------------------------------------------- 2. 倍率の入口
  // 戦闘中の敵（{ id, max, ... }）・id・データのどれからでも、データ（aff つき）を引く
  const dataOf = (foe) => {
    if (!foe) return null;
    const id = typeof foe === "string" ? foe : foe.max != null || !foe.aff ? foe.id : null;
    const e = id ? D.ENEMIES[id] || ((D.E3 && D.E3.FOES) || {})[id] : null;
    if (e) return API.setup(id, e);
    return typeof foe === "object" ? foe : null;
  };
  API.affOf = (foe) => { const e = dataOf(foe); return (e && e.aff) || {}; };
  G.dmgMod = (foe, type) => {
    if (!type || !TYPE[type]) return 1;
    const m = API.affOf(foe)[type];
    return m == null ? 1 : m;
  };
  // how（cbDamage の三つ目）→ 掛ける種類。武器は効くほうの種類を選ぶ
  API.typeOf = (how, foe) => {
    if (!how) return null;
    if (how === "holy") return "light";
    if (TYPE[how]) return how;
    if (how === "blade") {
      const ts = API.weaponTypes(G.weapon());
      return foe ? ts.slice().sort((a, b) => G.dmgMod(foe, b) - G.dmgMod(foe, a))[0] : ts[0];
    }
    return null;
  };
  // 戦技の種類（物理一つ＋属性）。技が当て方を決めるので、武器の種類より先
  API.skillTypes = (id) => {
    const t = (X.SKILL_TYPES || {})[id];
    return t ? t.split(/\s+/).filter((x) => TYPE[x]) : [];
  };
  API.cur = null; // いま出している戦技（その一撃のあいだだけ）
  // how → 掛ける種類の並び。"blade" は戦技の最中なら技の種類、そうでなければ武器の効くほう。"slash+fire" のようにつないでもよい
  API.typesOf = (how, foe) => {
    if (!how) return [];
    if (how === "blade" && API.cur && API.skillTypes(API.cur).length) return API.skillTypes(API.cur);
    return String(how).split("+").map((h) => API.typeOf(h, foe)).filter(Boolean);
  };

  // ---------------------------------------------------------------- 3. ひとこと・覚える
  const rec = (id) => (G.codex ? G.codex().foes[id] : null);
  API.learn = (id, type) => {
    if (!G.codex || !type) return;
    if (G.codexMeet) G.codexMeet(id, true);
    const r = rec(id);
    if (!r) return;
    const k = (r.e12 = r.e12 || {});
    if (!k[type]) { k[type] = 1; if (G.onCodexChange) try { G.onCodexChange(); } catch {} }
  };
  API.line = (name, type, m) => {
    const w = TYPE[type].word;
    if (m === 0) return `${name}には、${w}がまるで効かない。`;
    if (m > 1) return `${name}に${w}がよく効いている。`;
    return `${name}には、${w}の通りが悪い。`;
  };
  // 二つ以上の種類を持つ一撃の倍率：掛け合わせる。片方が無効でも、もう片方の分は届く（無効を 0.5 とみなす）。大きくても 2.25 倍まで
  API.mulOf = (f, types) => {
    const ms = types.map((t) => G.dmgMod(f, t));
    if (ms.length === 1) return ms[0];
    return Math.min(2.25, ms.reduce((a, m) => a * (m === 0 ? 0.5 : m), 1));
  };
  // n に倍率を掛けて、効き目の違う種類ごとにひとことを出し、覚える。返すのは掛けたあとの数
  API.hitMany = (f, n, types) => {
    types = (types || []).filter((t) => TYPE[t]);
    if (!f || !types.length || !n) return n;
    const m = API.mulOf(f, types);
    types.forEach((t) => {
      const mt = G.dmgMod(f, t);
      API.learn(f.id, t); // 当てた種類は、効き目がふつうでも図鑑に載る
      if (mt === 1) return;
      if (G.S && G.S.log) G.note(API.line(f.name || (dataOf(f) || {}).name || "", t, mt));
      if (G.openLore && G.S) G.openLore(`e12_aff:${mt === 0 ? "immune" : mt > 1 ? "weak" : "res"}`);
    });
    if (m === 1) return n;
    return m === 0 ? 0 : Math.max(1, Math.round(n * m));
  };
  API.hit = (f, n, type) => API.hitMany(f, n, type ? [type] : []);
  const dmgMod0 = G.cbDmgMod;
  G.cbDmgMod = (f, n, how) => {
    const ts = API.typesOf(how, f);
    if (ts.length && n > 0) {
      n = API.hitMany(f, n, ts);
      if (n <= 0) return 0;
    }
    return dmgMod0 ? dmgMod0(f, n, how) : n;
  };
  // 戦技：出しているあいだ API.cur に技を置く。受け流し・構えて返すは、敵の手番の返しの一撃にも技の種類を使う
  if (G.cbActs && G.cbActs.k1) {
    const k1act = G.cbActs.k1;
    G.cbActs.k1 = (t, id, tgt) => {
      API.cur = id;
      try { return k1act(t, id, tgt); } finally {
        API.cur = null;
        const c = G.S && G.S.combat;
        if (c && c.k1parry && !c.k1parry.e12) c.k1parry.e12 = id;
        if (c && c.k1counter && !c.k1counter.e12) c.k1counter.e12 = id;
      }
    };
    const struck0 = G.cbStruck;
    G.cbStruck = (f, e, mv, who, dmg, how) => {
      const c = G.S && G.S.combat;
      const id = c && !who ? (how === "dodged" && c.k1parry ? c.k1parry.e12 : c.k1counter ? c.k1counter.e12 : null) : null;
      API.cur = id || null;
      try { return struck0 ? struck0(f, e, mv, who, dmg, how) : undefined; } finally { API.cur = null; }
    };
  }
  // 戦技の説明（hint）の頭に種類を出す（戦闘の札・技の一覧）
  Object.entries(D.SKILLS || {}).forEach(([id, sk]) => {
    const ts = API.skillTypes(id);
    if (!ts.length || sk.e12tag) return;
    sk.e12tag = ts.map((t) => TYPE[t].short).join("・");
    sk.hint = `${sk.e12tag}・${sk.hint || ""}`;
  });
  // 仲間の一撃（combat.js の companionsTurn が呼ぶ）。術を使う仲間（c.fire）は属性を持たない
  API.allyType = (c) => {
    if (!c || c.fire) return null;
    if (c.dtype && TYPE[c.dtype]) return c.dtype;
    const s = `${c.cls || ""} ${c.desc || ""}`;
    const r = X.ALLY_RX.find(([rx]) => rx.test(s));
    return r ? r[1] : "slash";
  };
  G.cbAllyDmg = (c, f, n) => API.hit(f, n, API.allyType(c));
  // 銃は刺突（relics_c1.js が呼ぶ）
  G.cbGunDmg = (f, n) => API.hit(f, n, "pierce");

  // E4 の弱点の上乗せ（zzz_e4_foes.js）は、aff に合わせたので止める（二重に掛けない）
  if (D.E4) D.E4.weakByE12 = true;

  // ---------------------------------------------------------------- 4. 図鑑
  // [{ type, m, known }]：十の種類すべて（並びは表の順）。known はその敵に一度でも当てたか
  API.known = (id) => {
    const e = dataOf(id);
    if (!e) return [];
    const learned = (rec(id) || {}).e12 || {};
    return X.TYPES.map((t) => ({ type: t.id, m: G.dmgMod(id, t.id), known: !!learned[t.id] }));
  };
  API.words = (list) => list.map((x) => TYPE[x.type].name + (x.m >= 2 ? "（ことに）" : "")).join("・");
  API.rows = (id) => {
    const e = dataOf(id);
    if (!e) return [];
    const k = API.known(id);
    const part = (f) => k.filter((x) => x.known && f(x));
    const rows = [];
    [["よく効く", (x) => x.m > 1], ["ふつう", (x) => x.m === 1], ["効きにくい", (x) => x.m > 0 && x.m < 1], ["効かない", (x) => x.m === 0]].forEach(([name, f]) => {
      const l = part(f);
      if (l.length) rows.push([name, API.words(l)]);
    });
    const rest = k.filter((x) => !x.known);
    rows.push(["？", rest.length ? `まだ当てていない（${rest.map((x) => TYPE[x.type].short).join("・")}）` : "すべて試した"]);
    return rows;
  };
  if (G.codexFoeStats) {
    const stats0 = G.codexFoeStats;
    G.codexFoeStats = (id) => {
      const rows = stats0(id);
      const e = dataOf(id);
      if (!rows.length || !e) return rows;
      const add = API.rows(id);
      const at = rows.findIndex((r) => r[0] === "弱点");
      const gear = e.gear && X.GEAR && X.GEAR[e.gear] ? [["身なり", X.GEAR[e.gear].name]] : [];
      const atk = [e.magic ? "呪い" : TYPE[e.atk] ? TYPE[e.atk].name : "", TYPE[e.atkEl] ? TYPE[e.atkEl].name : ""].filter(Boolean).join("・") || "？";
      rows.splice(at >= 0 ? at + 1 : rows.length, 0, ...add, ...gear, ["攻め手", atk]);
      return rows;
    };
  }
  // 図鑑をまとめるとき、覚えた効き目も両方から残す
  if (G.codexMerge) {
    const merge0 = G.codexMerge;
    G.codexMerge = (a, b) => {
      const out = merge0(a, b);
      [a, b].forEach((c) => Object.entries((c && c.foes) || {}).forEach(([id, r]) => {
        if (r && r.e12 && out.foes[id]) out.foes[id].e12 = Object.assign({}, out.foes[id].e12 || {}, r.e12);
      }));
      return out;
    };
  }

  // ---------------------------------------------------------------- 6. こちらの防具
  API.parseArmor = (str) => {
    const aff = {};
    String(str || "").split(/\s+/).filter(Boolean).forEach((tok) => {
      const m = /^([a-z]+)(\+\+|\+|--|-)$/.exec(tok);
      if (!m || !TYPE[m[1]]) throw new Error(`E12: 防具の読めない印 ${tok}`);
      aff[m[1]] = X.ARMOR_MARK[m[2]];
    });
    return aff;
  };
  // 防具の効き目（受けるダメージの倍率）。表 → 名前 → なし
  const armorMemo = new Map();
  API.armorAff = (it) => {
    if (!it || it.type !== "armor") return {};
    if (it.e12armor) return it.e12armor;
    const key = it.name || "";
    if (armorMemo.has(key)) return armorMemo.get(key);
    const r = (X.ARMOR_RX || []).find(([rx]) => rx.test(key));
    const aff = API.parseArmor(r ? r[1] : "");
    armorMemo.set(key, aff);
    return aff;
  };
  Object.entries(D.ITEMS).forEach(([id, it]) => {
    if (it && it.type === "armor" && X.ARMOR && X.ARMOR[id] != null && !it.e12armor) it.e12armor = API.parseArmor(X.ARMOR[id]);
  });
  // 言葉で（数は出さない）：「斬に強い・突に弱い」。ことに強い・弱いは「とても」
  API.armorWords = (it) => {
    const a = API.armorAff(it);
    const strong = Object.keys(a).filter((t) => a[t] < 1).sort((x, y) => a[x] - a[y]);
    const weak = Object.keys(a).filter((t) => a[t] > 1).sort((x, y) => a[y] - a[x]);
    const w = (t, good) => `${TYPE[t].short}に${(good ? a[t] <= 0.5 : a[t] >= 1.5) ? "とても" : ""}${good ? "強い" : "弱い"}`;
    return [...strong.map((t) => w(t, true)), ...weak.map((t) => w(t, false))].join("・");
  };
  // 着ている物（胴・頭・足・盾）
  API.worn = (S) => {
    S = S || G.S;
    if (!S) return [];
    const X2 = G.i2s;
    const list = X2 && X2.item ? ["armor", "head", "feet", "off"].map((k) => X2.item(k, S)) : [D.ITEMS[S.armor]];
    return list.filter((it) => it && it.type === "armor");
  };
  // 受ける一撃の種類への倍率（着ている物すべてを掛け合わせ、0.5〜1.5）
  API.guardMul = (types, S) => {
    const worn = API.worn(S);
    let m = 1;
    (types || []).forEach((t) => worn.forEach((it) => { const v = API.armorAff(it)[t]; if (v != null) m *= v; }));
    return Math.max(0.5, Math.min(1.5, m));
  };
  // 敵の一撃の種類：呪い（magic）は鎧を素通りするので属性だけ
  API.atkTypes = (e) => (e ? [e.magic ? null : e.atk, e.atkEl].filter((t) => TYPE[t]) : []);
  G.cbHurtMod = (f, e, dmg, mv) => {
    const ts = API.atkTypes(e);
    const m = API.guardMul(ts);
    if (m === 1 || !(dmg > 0)) return dmg;
    const w = ts.map((t) => TYPE[t].word).join("と");
    G.note(m < 1 ? `身につけた守りが、${w}を和らげた。` : `${w}が、守りの隙を抜けてくる。`);
    return Math.max(1, Math.round(dmg * m));
  };

  // ---------------------------------------------------------------- 5. 画面の文
  // 攻撃の言い方（斬りかかる・打ちかかる・突きかかる。素手は殴りかかる）
  API.verb = (w) => (w && (w === D.ITEMS.fists || w.name === D.ITEMS.fists.name) ? "殴りかかる" : { slash: "斬りかかる", blunt: "打ちかかる", pierce: "突きかかる" }[API.weaponTypes(w)[0]] || "斬りかかる");
  API.short = (it) => API.weaponTypes(it).map((t) => TYPE[t].short).join("・");
  if (G.itemEffect) {
    const eff0 = G.itemEffect;
    G.itemEffect = (it) => { const s = eff0(it); return it && it.type === "weapon" ? [API.short(it), s].filter(Boolean).join("・") : it && it.type === "armor" ? [s, API.armorWords(it)].filter(Boolean).join("・") : s; };
  }
  if (G.i3 && G.i3.effectText) {
    const eff1 = G.i3.effectText;
    G.i3.effectText = (it) => { const s = eff1(it); return it && it.type === "weapon" ? [API.short(it), s].filter(Boolean).join("・") : it && it.type === "armor" ? [s, API.armorWords(it)].filter(Boolean).join("・") : s; };
  }
  if (G.codexItemStats) {
    const st0 = G.codexItemStats;
    G.codexItemStats = (id) => {
      const rows = st0(id);
      const it = D.ITEMS[id];
      if (it && it.type === "weapon") rows.unshift(["種類", API.weaponTypes(it).map((t) => TYPE[t].name).join("・")]);
      if (it && it.type === "armor" && API.armorWords(it)) rows.push(["守り", API.armorWords(it)]);
      return rows;
    };
  }
  // 戦闘の札：攻撃・急所・術に種類と、分かっていれば今の狙いへの効き目
  API.feel = (foe, type) => {
    if (!foe || !type) return "";
    const k = API.known(foe.id).find((x) => x.type === type);
    if (!k || !k.known) return "";
    if (k.m === 1) return ""; // ふつうの効き目は札に書かない（等倍を「通りが悪い」と見せない。R6）
    return k.m === 0 ? "効かない" : k.m > 1 ? "よく効く" : "通りが悪い";
  };
  API.spellType = (id) => {
    const sp = D.SPELLS && D.SPELLS[id];
    const t = sp && (sp.elem || sp.element || sp.attr);
    return TYPE[t] ? t : TYPE[id] ? id : null;
  };
  if (G.combatActions) {
    const acts0 = G.combatActions;
    G.combatActions = () => {
      const groups = acts0();
      const t = G.target && G.target();
      if (!t) return groups;
      groups.forEach((g) => (g.list || []).forEach((a) => {
        const kind = String(a.id || "").replace(/^cb:/, "");
        let type = null, tag = "";
        if (kind === "attack" || kind === "vital") { type = API.typeOf("blade", t); tag = API.short(G.weapon()); }
        else if (/^k1:/.test(kind)) {
          const ts = API.skillTypes(kind.slice(3));
          const feel = ts.map((x) => API.feel(t, x)).find(Boolean);
          if (feel && !String(a.sub || "").includes(feel)) a.sub = [a.sub, feel].filter(Boolean).join("・");
          return;
        }
        else type = API.spellType(kind);
        if (!type) return;
        const feel = API.feel(t, type);
        const add = [tag, feel].filter(Boolean).join("・");
        if (add && !String(a.sub || "").includes(add)) a.sub = [a.sub, add].filter(Boolean).join("・");
      }));
      return groups;
    };
  }
})(globalThis.G = globalThis.G || {});
