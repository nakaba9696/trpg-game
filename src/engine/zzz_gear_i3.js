// I3：武具の組み合わせの品（型＋材質＋銘）・稀さ・呪いと鑑定・町ごとに日替わりの品ぞろえ・宝と落とし物・鍛冶（強化・銘入れ・修理）・
// 荷の重さと宿の預かり・装備の比べ方・図鑑（型・材質・銘）。部品のデータは data/items_i3_*.js。
//
// 組み合わせの品は、品の id にすべてを書く：「i3~型~材質~前の銘~後ろの銘~印」（印：u 正体不明・r 錆び・+N 強化）。
//   例 "i3~i3w_spear~steel~sharp~hunter~+1"。D.ITEMS を包んで（Proxy）、この形の id を引くとその場で品を組み立てて返す。
//   だから持ち物（S.inv）・装備（S.weapon など）・保存と読み込みは今までどおり id だけで済み、品の中身を保存しない。
//   Object.keys(D.ITEMS) には出てこない（図鑑・データの整合は今までどおり）。
// セーブに足す項目（古いセーブで無くても動く）：S.i3 = { stash { id: 数 } 宿の預かり, bought { key, ids } 今日買った品, legends { id: 1 } 手に入れた伝説の品 }
// 図鑑（G.P.codex.i3 = { mats { 種類:材質 }, pre { 銘 }, suf { 銘 } }）。冒険をまたいで残る。
// 宝の口：出来事の結果に i3gear: 深さ（0〜6）か { lv, kind } を書くと、組み合わせの品が一つ出る（W3・W4 の宝の表から使える）。
//   エンジンからは G.i3Loot(lv, opt) でも。
// core.js・combat.js・explore.js は書き換えず、包む。DOM には触らない。レーン I＋B（I3）
(function (G) {
  const D = G.data;
  const I3 = D.I3;
  const RAW = D.ITEMS;
  const HEAD = "i3~";
  const SLOT = { weapon: "w_", armor: "a", ring: "r" };
  const KIND_NAME = { weapon: "武器", armor: "防具", ring: "装飾品" };
  const RING_BONUS = ["fire", "heal", "steal", "trap", "talk"];
  const API = (G.i3 = G.i3 || {});

  // ---------------------------------------------------------------- 既存の品を土台に加える（材質を付けられる型）
  const EXTRA = {
    dagger: { k: "短剣", noun: "短剣", mat: "metal", lv: 0 },
    longsword: { k: "剣", noun: "長剣", mat: "metal", lv: 0, line: "どこの町でも売っている長剣。傭兵の半分は、これを提げている。" },
    mace: { k: "槌", noun: "錫杖", mat: "metal", lv: 0 }, axe: { k: "斧", noun: "大斧", mat: "metal", lv: 1 },
    katana: { k: "刀", noun: "打刀", mat: "metal", lv: 1, from: ["yakumo"] }, staff: { k: "杖", noun: "杖", mat: "wood", lv: 0 },
    rapier: { k: "剣", noun: "細剣", mat: "metal", lv: 1 },
    leather: { k: "革", noun: "革鎧", mat: "leather", lv: 0, line: "なめし革を重ねた鎧。駆け出しの冒険者は、たいていこれから始める。" },
    chain: { k: "鎖", noun: "鎖帷子", mat: "metal", lv: 1, line: "鉄の輪を一つずつ編んだ帷子。編んだ者の指は、たいてい曲がっている。" },
    plate: { k: "板金", noun: "板金鎧", mat: "metal", lv: 2 }, robe: { k: "ローブ", noun: "魔導衣", mat: "cloth", lv: 2 },
    domaru: { k: "革", noun: "胴丸", mat: "leather", lv: 1, from: ["yakumo"], line: "胴をぐるりと巻く島の鎧。右の脇で引き合わせる。" },
  };
  Object.entries(EXTRA).forEach(([id, m]) => { if (RAW[id] && !RAW[id].i3) RAW[id].i3 = Object.assign({ gen: true, h: 1 }, m); });

  // ---------------------------------------------------------------- 乱数（宝は G.rand。店の品ぞろえは、日と町と人物から決まる別の乱数で、G.rand を減らさない）
  const hash = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const mulberry = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const wpick = (rnd, list, wf) => { const tot = list.reduce((a, x) => a + Math.max(0, wf(x)), 0); if (tot <= 0) return null; let r = rnd() * tot; for (const x of list) { r -= Math.max(0, wf(x)); if (r <= 0) return x; } return list[list.length - 1]; };
  const rpick = (rnd, a) => a[Math.floor(rnd() * a.length)];

  // ---------------------------------------------------------------- 品の id と組み立て
  const isGen = (id) => typeof id === "string" && id.startsWith(HEAD);
  API.isGen = isGen;
  API.id = (p) => [HEAD.slice(0, -1), p.base, p.mat || "", p.pre || "", p.suf || "", (p.unk ? "u" : "") + (p.rust ? "r" : "") + (p.plus ? "+" + p.plus : "")].join("~");
  API.parse = (id) => {
    if (!isGen(id)) return null;
    const a = id.split("~");
    if (a.length !== 6) return null;
    const f = a[5];
    if (!/^u?r?(\+[1-5])?$/.test(f)) return null;
    return { base: a[1], mat: a[2], pre: a[3], suf: a[4], unk: f.includes("u"), rust: f.includes("r"), plus: Number((f.match(/\+(\d)/) || [])[1] || 0) };
  };
  // 土台にしてよい品（大事な物・絶界に届く伝説の武具・伝説・代償つき・銃は鍛冶に出さない）
  API.smithable = (id) => { const b = RAW[id]; return !!(b && SLOT[b.type] && id !== "fists" && !b.key && !b.pierce && !b.legend && !b.toll && !b.gun); };
  const matOf = (b, m) => (m && b.i3 && I3.MATS[b.i3.mat] ? I3.MATS[b.i3.mat][m] : null);
  const fxOf = (part, type) => (part ? part[SLOT[type]] : null);

  const addFx = (it, fx) => {
    if (!fx) return;
    if (fx.dmg && it.dmg) it.dmg[2] += fx.dmg;
    ["hit", "vital", "magic", "first", "def", "agi"].forEach((k) => { if (fx[k]) it[k] = (it[k] || 0) + fx[k]; });
    if (fx.drain) it.drain = Math.round(((it.drain || 0) + fx.drain) * 100) / 100;
    Object.entries(fx.stats || {}).forEach(([k, n]) => { it.stats = it.stats || {}; it.stats[k] = (it.stats[k] || 0) + n; if (!it.stats[k]) delete it.stats[k]; });
    Object.entries(fx.bonus || {}).forEach(([k, n]) => { it.bonus = it.bonus || {}; it.bonus[k] = (it.bonus[k] || 0) + n; });
  };
  const fill = (t, noun) => String(t || "").replace(/\{noun\}/g, noun);
  // 稀さ：0 並・1 上・2 逸品（銘の重みと材質の格）・3 伝説
  API.rarityOf = (it) => (it && it.legend ? 3 : it && it.i3g ? it.i3g.rarity : 0);
  API.rarityName = (it) => I3.RARITY[API.rarityOf(it)];

  const cache = new Map();
  function build(id) {
    if (cache.has(id)) return cache.get(id);
    const p = API.parse(id);
    const b = p && API.smithable(p.base) ? RAW[p.base] : null;
    let it = null;
    if (b) {
      const M = p.mat ? matOf(b, p.mat) : null;
      const P = p.pre ? I3.PRE[p.pre] : null;
      const X = p.suf ? I3.SUF[p.suf] : null;
      const ok = (!p.mat || M) && (!p.pre || (P && fxOf(P, b.type))) && (!p.suf || (X && fxOf(X, b.type))) && !(p.rust && b.type === "ring");
      if (ok) it = assemble(id, p, b, M, P, X);
    }
    cache.set(id, it);
    return it;
  }
  function assemble(id, p, b, M, P, X) {
    const it = JSON.parse(JSON.stringify(b));
    delete it.i3;
    const noun = (b.i3 && b.i3.noun) || b.name;
    const lines = [];
    const metal = !b.i3 || !b.i3.mat || b.i3.mat === "metal";
    const RUST = metal ? "錆びた" : "傷んだ";
    const rank = (P ? P.rank : 0) + (X ? X.rank : 0) + (M && M.lv >= 4 ? 1 : 0);
    if (p.unk) {
      // 正体が分からないうちは、型の素の力だけが見える
      it.name = `${p.rust ? RUST : ""}見慣れない${noun}`;
      it.price = Math.max(1, Math.round(b.price * 0.5));
      lines.push(stripEffect(b), I3.UNKNOWN_LINE);
    } else {
      addFx(it, M && (b.type === "weapon" ? M.w_ : b.type === "armor" ? M.a : M.r));
      addFx(it, fxOf(P, b.type));
      addFx(it, fxOf(X, b.type));
      if (p.plus) {
        if (b.type === "weapon") { it.dmg[2] += p.plus; it.hit = (it.hit || 0) + (p.plus >= 3 ? 5 : 0); }
        else if (b.type === "armor") it.def = (it.def || 0) + Math.floor((p.plus + 1) / 2);
        else { const ks = Object.keys(it.stats || {}).filter((k) => it.stats[k] > 0); if (ks.length) it.stats[ks[0]] += p.plus * 2; else it.magic = (it.magic || 0) + p.plus * 3; }
      }
      if (P && P.curse) { it.cursed = true; it.toll = { day: { sanity: 1 } }; }
      const core = M ? `${M.name}の${noun}` : b.name;
      it.name = `${p.rust ? RUST : ""}${X ? X.name : ""}${P ? P.name : ""}${core}${p.plus ? "+" + p.plus : ""}`;
      it.price = Math.max(1, Math.round(b.price * (M ? M.p : 1) * (P ? P.p : 1) * (X ? X.p : 1) * (1 + 0.5 * p.plus)));
      lines.push(stripEffect(b));
      if (M) lines.push(M.line);
      if (P) lines.push(P.line);
      if (X) lines.push(X.line);
    }
    if (p.rust) {
      if (b.type === "weapon") { it.dmg[2] -= 2; it.hit = (it.hit || 0) - 5; }
      else { it.def = (it.def || 0) - 1; it.agi = (it.agi || 0) - 5; }
      it.price = Math.max(1, Math.round(it.price * 0.4));
      lines.push(metal ? I3.RUST_LINE : I3.WORN_LINE);
    }
    if (it.dmg) it.dmg[2] = Math.max(0, it.dmg[2]);
    if (it.def !== undefined) it.def = Math.max(0, it.def);
    if (it.drain) it.drain = Math.min(0.3, it.drain);
    it.i3g = { base: p.base, mat: p.mat, pre: p.pre, suf: p.suf, plus: p.plus, rust: p.rust, unk: p.unk, rarity: p.unk ? 0 : Math.min(2, rank) };
    const head = b.type === "ring" && !p.unk ? (API.effectText(it) ? API.effectText(it) + "。" : "") : "";
    it.desc = head + lines.filter(Boolean).map((t) => fill(t, noun)).join("");
    return it;
  }
  // 装飾品の説明の頭にある効き目（「体力+2。」）は組み立て直すので外す
  const stripEffect = (b) => { const d = b.desc || (b.i3 && b.i3.line) || ""; return b.type === "ring" ? d.replace(/^[^。]*[+-]\d+[^。]*。/, "") : d; };

  // 空の枠（S.ring・S.armor が ""）は引かない（D.ITEMS に無い鍵を引くと、下の組み立て役まで降りていって遅い）
  G.ring = () => (G.S.ring ? RAW[G.S.ring] || null : null);
  const baseArmor = G.armor;
  G.armor = () => (G.S.armor ? baseArmor() : null);

  // D.ITEMS の後ろ（プロトタイプ）に組み立て役を置く。ふつうの品は今までどおり D.ITEMS 自身から速く引け、
  // 無い id を引いたときだけここに来る。組み合わせの品なら組み立てて、数えない欄（enumerable: false）として D.ITEMS に置く
  // （二度目からはふつうの品と同じ速さ。Object.keys(D.ITEMS) には出ない）
  const OP = Object.prototype;
  Object.setPrototypeOf(RAW, new Proxy(Object.create(null), {
    get(t, k, recv) {
      if (typeof k === "string" && isGen(k)) {
        const it = build(k);
        if (it) Object.defineProperty(RAW, k, { value: it, enumerable: false, configurable: true, writable: true });
        return it || undefined;
      }
      return Reflect.get(OP, k, recv);
    },
    has(t, k) { return k in OP || (typeof k === "string" && isGen(k) && !!build(k)); },
  }));

  // ---------------------------------------------------------------- 効き目の文（画面と店の説明・図鑑）
  const KIND = { fire: "炎の魔法", ice: "氷の魔法", bolt: "雷の魔法", curse: "呪い", ward: "加護", heal: "癒し", steal: "盗み", trap: "罠", talk: "話術" };
  const effMemo = new WeakMap();
  API.effectText = (it) => {
    if (!it) return "";
    if (effMemo.has(it)) return effMemo.get(it);
    const v = effectText0(it);
    effMemo.set(it, v);
    return v;
  };
  const effectText0 = (it) => {
    const out = [];
    if (it.type === "weapon") { out.push(`${it.dmg[0]}D${it.dmg[1]}${it.dmg[2] ? "+" + it.dmg[2] : ""}`); if (it.hit) out.push("命中" + G.sign(it.hit)); }
    if (it.type === "armor") { out.push("防御" + (it.def || 0)); if (it.agi) out.push("敏捷" + G.sign(it.agi)); }
    if (it.vital) out.push("急所" + G.sign(it.vital));
    if (it.first) out.push("先手" + G.sign(it.first));
    if (it.drain) out.push(`吸う${Math.round(it.drain * 100)}%`);
    Object.entries(it.stats || {}).forEach(([k, n]) => out.push(G.statModText(k, n)));
    Object.entries(it.bonus || {}).forEach(([k, n]) => out.push((KIND[k] || k) + G.sign(n)));
    if (it.magic) out.push("魔法" + G.sign(it.magic));
    if (it.cursed && !(it.i3g && it.i3g.unk)) out.push("呪い");
    return out.join("・");
  };
  // 装飾品の効き目の文（core.js の G.ringEffect）に先手と吸うを足す
  const baseRingEffect = G.ringEffect;
  G.ringEffect = (it) => {
    const s = baseRingEffect(it);
    const more = [];
    if (it.first) more.push("先手" + G.sign(it.first));
    if (it.drain && it.i3g) more.push(`吸う${Math.round(it.drain * 100)}%`);
    return [s, ...more].filter(Boolean).join("・");
  };

  // I2 の札（名前の下の効果・説明の文）：組み合わせの品は組み立てた説明を、効果には先手・吸う・急所と稀さを
  const baseFlavor = G.itemFlavor;
  if (baseFlavor) G.itemFlavor = (id) => (isGen(id) ? ((D.ITEMS[id] || {}).desc || "") : baseFlavor(id));
  const baseItemEffect = G.itemEffect;
  if (baseItemEffect) {
    G.itemEffect = (it) => {
      let s = baseItemEffect(it);
      if (!it || !SLOT[it.type]) return s;
      const more = [];
      if (it.vital && !/急所/.test(s)) more.push("急所" + G.sign(it.vital));
      if (it.first) more.push("先手" + G.sign(it.first));
      if (it.drain && !(it.type === "ring" && !it.i3g)) more.push(`吸う${Math.round(it.drain * 100)}%`);
      s = [s, ...more].filter(Boolean).join("・");
      const r = API.rarityOf(it);
      return r ? `【${I3.RARITY[r]}】${s}` : s;
    };
  }

  // ---------------------------------------------------------------- 比べる（今の装備より上か下か）
  const sumv = (o) => Object.values(o || {}).reduce((a, n) => a + n, 0);
  API.score = (it) => {
    if (!it) return 0;
    const extra = sumv(it.stats) / 4 + sumv(it.bonus) / 8 + (it.magic || 0) / 8 + (it.first || 0) / 15 + (it.drain || 0) * 12 - (it.cursed ? 1 : 0);
    if (it.type === "weapon") { const d = it.dmg[0] * (it.dmg[1] + 1) / 2 + it.dmg[2]; return d * (1 + (it.hit || 0) / 100) + (it.vital || 0) / 10 + extra; }
    if (it.type === "armor") return (it.def || 0) * 2.2 + (it.agi || 0) / 8 + extra;
    if (it.type === "ring") return extra * 1.5;
    return 0;
  };
  // 比べる相手は、その品が入る枠の今の品（I2 の枠。頭・足・盾・装飾品 2 も）
  const worn = (type, it) => (G.i2s && G.i2s.against ? G.i2s.against(it) : type === "weapon" ? G.weapon() : type === "armor" ? G.armor() : type === "ring" ? G.ring() : null);
  // { dir: 1 上・0 同じくらい・-1 下, mark, text（変わる数字） }
  API.compare = (id) => {
    const it = D.ITEMS[id];
    if (!it || !SLOT[it.type] || !G.S) return null;
    const cur = worn(it.type, it);
    const a = API.score(it), b = API.score(cur);
    const dir = a > b + 0.25 ? 1 : a < b - 0.25 ? -1 : 0;
    const diff = [];
    if (it.type === "weapon" && cur) {
      const avg = (w) => w.dmg[0] * (w.dmg[1] + 1) / 2 + w.dmg[2];
      const d = Math.round(avg(it) - avg(cur)); // 小数は出さない（「攻撃-0.5」は読みにくい。R7）
      if (d) diff.push("攻撃" + G.sign(d));
      // 今の武器に命中の増減が無ければ、差は品の性能欄の「命中±n」と同じ数になるので、二度は出さない（R7）
      if ((it.hit || 0) !== (cur.hit || 0) && (cur.hit || 0)) diff.push("命中" + G.sign((it.hit || 0) - (cur.hit || 0)));
    }
    if (it.type === "armor") { const d = (it.def || 0) - ((cur && cur.def) || 0); if (d) diff.push("防御" + G.sign(d)); const g = (it.agi || 0) - ((cur && cur.agi) || 0); if (g) diff.push("敏捷" + G.sign(g)); }
    if ((it.magic || 0) !== ((cur && cur.magic) || 0)) diff.push("魔法" + G.sign((it.magic || 0) - ((cur && cur.magic) || 0)));
    const unk = it.i3g && it.i3g.unk;
    return { dir, mark: unk ? "？" : dir > 0 ? "▲" : dir < 0 ? "▼" : "＝", text: unk ? "鑑定前" : diff.join("・") };
  };
  // 比べの文は、品と今の装備の組で決まるので覚えておく（店の一覧は行動のたびに描き直される）
  const cmpMemo = new Map();
  API.compareLabel = (id) => {
    const S = G.S;
    const key = S ? `${id}|${G.i2s ? G.i2s.key(S) : `${S.weapon}|${S.armor}|${S.ring}`}` : "";
    if (key && cmpMemo.has(key)) return cmpMemo.get(key);
    const c = API.compare(id);
    // 差は「今より」を付けて、品そのものの性能（同じ札の前の欄）と見分けられるように（R7）
    // 総合で同じくらい（＝）のときは「＝今より攻撃-1」と読めないよう、差を括弧に（R7b）
    const v = c ? `${c.mark}${c.text ? (c.text === "鑑定前" ? c.text : c.dir === 0 ? `今と同じくらい（${c.text}）` : "今より" + c.text) : c.dir > 0 ? "今より上" : c.dir < 0 ? "今より下" : "今と同じくらい"}` : "";
    if (key) { if (cmpMemo.size > 2000) cmpMemo.clear(); cmpMemo.set(key, v); }
    return v;
  };

  // ---------------------------------------------------------------- 状態
  const st = (S) => {
    S = S || G.S;
    const x = (S.i3 = S.i3 || {});
    x.stash = x.stash || {};
    x.legends = x.legends || {};
    return x;
  };
  API.state = st;
  // 荷の重さ：持ち物の武具（装備中は数えない）。上限を越えると身のこなしが落ちる
  const CAP = 10;
  API.CAP = CAP;
  // 持ち物は G.give・G.take（とここの預ける・まとめ売り）でしか変わらないので、変わった回数で覚えておく（能力値の判定のたびに数え直さない）
  let invVer = 0;
  const loadMemo = { inv: null, ver: -1, v: 0 };
  API.load = (S) => {
    S = S || G.S;
    const inv = S.inv || {};
    if (loadMemo.inv === inv && loadMemo.ver === invVer) return loadMemo.v;
    let v = 0;
    for (const id in inv) { const it = D.ITEMS[id]; if (it && SLOT[it.type] && !it.key) v += inv[id]; }
    loadMemo.inv = inv; loadMemo.ver = invVer; loadMemo.v = v;
    return v;
  };
  API.overPenalty = (S) => Math.min(25, Math.max(0, API.load(S) - API.CAP) * 5);

  // ---------------------------------------------------------------- 能力値・補正（武器と防具の stats・bonus。装飾品は core.js が見る）
  // 判定のたびに呼ばれるので、今の武器と防具の id が同じあいだは足し合わせた表を使い回す
  const gearMemo = { w: null, a: null, stats: null, bonus: null };
  const gearSum = (S) => {
    if (gearMemo.w === S.weapon && gearMemo.a === S.armor && gearMemo.stats) return gearMemo;
    const stats = {}, bonus = {};
    [G.weapon(), G.armor()].forEach((it) => {
      if (!it) return;
      Object.entries(it.stats || {}).forEach(([k, n]) => { stats[k] = (stats[k] || 0) + n; });
      Object.entries(it.bonus || {}).forEach(([k, n]) => { bonus[k] = (bonus[k] || 0) + n; });
    });
    gearMemo.w = S.weapon; gearMemo.a = S.armor; gearMemo.stats = stats; gearMemo.bonus = bonus;
    return gearMemo;
  };
  const baseStatEff = G.statEff;
  G.statEff = (k) => {
    let v = baseStatEff(k);
    const S = G.S;
    if (!S) return v;
    v += G.s5Mod(gearSum(S).stats[k] || 0);   // 補正は％で書いてある。点にする（S5）
    if (k === "敏捷") { const l = API.load(S); if (l > CAP) v -= G.s5Mod(Math.min(25, (l - CAP) * 5)); }
    return v;
  };
  const baseGearBonus = G.gearBonus;
  G.gearBonus = (kind) => {
    const b = baseGearBonus(kind);
    const S = G.S;
    return S ? b + (gearSum(S).bonus[kind] || 0) : b;
  };

  // ---------------------------------------------------------------- 手に入れる（伝説の品の印・正体不明の品の知らせ）
  const baseGive0 = G.give;
  const baseGive = (id, n) => { invVer++; return baseGive0(id, n); };
  const baseTake = G.take;
  G.take = (id, n) => { invVer++; return baseTake(id, n); };
  G.give = (id, n) => {
    const r = baseGive(id, n);
    if (r && G.S) { const it = D.ITEMS[id]; if (it && it.legend) st().legends[id] = 1; }
    return r;
  };

  // ---------------------------------------------------------------- 装備する（正体が分かる・呪われた武具は外すと傷を負う）
  API.identify = (id) => { const p = API.parse(id); if (!p || !p.unk) return id; p.unk = false; return API.id(p); };
  const baseEquip = G.equip;
  G.equip = (id) => {
    const S = G.S;
    let it = D.ITEMS[id];
    if (!S || !it || !S.inv[id]) return false;
    if (it.i3g && it.i3g.unk) {
      const real = API.identify(id);
      G.take(id);
      baseGive(real);
      id = real;
      it = D.ITEMS[id];
      G.note(`何の品か分かった：${it.name}（${API.effectText(it)}）`);
      if (it.cursed) G.say(G.pick(I3.CURSE_FOUND).replace("{name}", it.name));
    }
    if (it.type === "weapon" || it.type === "armor") {
      const cur = it.type === "weapon" ? G.weapon() : G.armor();
      if (cur && cur.cursed && cur !== it) {
        const n = Math.min(3, S.hp - 1);
        if (n > 0) S.hp -= n;
        G.say(`${cur.name}は、手から剥がすようにしか離れなかった。`);
        if (n > 0) G.note(`HP -${n}`);
      }
    }
    return baseEquip(id);
  };

  // ---------------------------------------------------------------- 作る（宝・落とし物・店）
  // 型の一覧（データは読み込みのあと変わらないので、初めて要るときに一度だけ作る）
  let genBases = null, namedBases = null;
  const GEN_BASES = () => (genBases || (genBases = Object.keys(RAW).filter((id) => RAW[id].i3 && RAW[id].i3.gen && API.smithable(id)))).slice();
  const NAMED_BASES = () => (namedBases || (namedBases = Object.keys(RAW).filter((id) => RAW[id].i3 && !RAW[id].i3.gen && SLOT[RAW[id].type] && !RAW[id].legend))).slice();
  const KIND_W = { weapon: 45, armor: 35, ring: 20 };
  // 稀さの出やすさ（lv 0〜6）。店は少し控えめ、呪われた品は店に並ばない
  API.rarityWeights = (lv, shop) => [Math.max(10, 70 - lv * 9), 25 + lv * 3, (shop ? 2 : 4) + lv * (shop ? 3 : 5)];
  // 一つ作る。opt：kind（weapon / armor / ring）・shop（店に並べる）・rnd（乱数。省くと G.rand）・find（宝として見つける：正体不明と錆が混じる）
  API.roll = (lv, opt) => {
    opt = opt || {};
    const rnd = opt.rnd || G.rand;
    lv = Math.max(0, Math.min(6, Math.floor(lv || 0)));
    const kind = opt.kind || wpick(rnd, Object.keys(KIND_W), (k) => KIND_W[k]);
    const bases = GEN_BASES().filter((id) => RAW[id].type === kind && (RAW[id].i3.lv || 0) <= lv + 1);
    const base = wpick(rnd, bases, (id) => 3 + Math.min(lv, RAW[id].i3.lv || 0));
    if (!base) return null;
    const b = RAW[base];
    const mats = Object.entries(I3.MATS[b.i3.mat] || {}).filter(([, m]) => m.lv <= lv);
    const mat = mats.length ? wpick(rnd, mats, ([, m]) => m.w + Math.max(0, lv - m.lv) * m.lv)[0] : "";
    const rar = wpick(rnd, [0, 1, 2], (r) => API.rarityWeights(lv, opt.shop)[r]);
    const okFx = (a) => a.filter(([, x]) => x.lv <= lv && fxOf(x, b.type) && !(opt.shop && x.curse));
    const goodPre = okFx(Object.entries(I3.PRE)).filter(([, x]) => x.rank > 0);
    const goodSuf = okFx(Object.entries(I3.SUF)).filter(([, x]) => x.rank > 0);
    let pre = "", suf = "";
    const pickPre = () => { const x = wpick(rnd, goodPre, ([, a]) => a.w); return x ? x[0] : ""; };
    const pickSuf = () => { const x = wpick(rnd, goodSuf, ([, a]) => a.w); return x ? x[0] : ""; };
    if (rar === 2) { pre = pickPre(); suf = pickSuf(); }
    else if (rar === 1) { if (rnd() < 0.5) pre = pickPre(); else suf = pickSuf(); }
    else if (rnd() < 0.15 && fxOf(I3.PRE.crude, b.type)) pre = "crude";
    const p = { base, mat, pre, suf };
    if (opt.find) {
      if (pre === "cursed" || (rar >= 1 && rnd() < 0.45)) p.unk = true;
      if (b.type !== "ring" && rnd() < 0.18) p.rust = true;
    }
    const id = API.id(p);
    return D.ITEMS[id] ? id : null;
  };

  // 伝説の品：この冒険でまだ手に入れていないものから
  API.freeLegend = (pool, rnd) => {
    const S = G.S;
    const own = st(S).legends;
    const free = pool.filter((id) => RAW[id] && !own[id] && !G.has(id));
    return free.length ? rpick(rnd || G.rand, free) : null;
  };

  // 宝・落とし物として一つ手に入れる（記録に名前を出す）。返り値は品の id（出なければ null）
  API.loot = (lv, opt) => {
    opt = opt || {};
    let id = null;
    if (opt.legend !== false && (lv || 0) >= 5 && G.rand() < 0.03 * ((lv || 0) - 4)) id = API.freeLegend(I3.LEGEND_DEEP);
    if (!id) id = API.roll(lv, Object.assign({ find: true }, opt));
    if (!id || !G.give(id)) return null;
    const it = D.ITEMS[id];
    G.note(`${it.name}を手に入れた。${it.legend ? "（伝説の品）" : it.i3g && !it.i3g.unk && it.i3g.rarity ? `（${API.rarityName(it)}）` : ""}`);
    if (G.S && API.load() > API.CAP) G.note(`武具の荷が重い（${API.load()}/${API.CAP}）。身のこなしが鈍る。売るか、宿に預けよう。`);
    return id;
  };
  G.i3Loot = API.loot;

  // 場所の深さ：危険度と階（迷宮）
  API.depthLv = (S) => { S = S || G.S; const L = G.loc(); return Math.min(6, (L.danger || 0) + (L.type === "dungeon" ? Math.floor((S.depth || 0) / 2) : 0)); };

  // ---------------------------------------------------------------- 町の品ぞろえ（日替わり）
  API.TOWN_LV = { karna: 1, nerva: 1, leavel: 2, garmund: 2, fort: 3, zephara: 2, yakumo: 2, w1_holy: 2, w1_oboro: 2, w2_granbel: 0, w2_dranherz: 3, w2_zalgros: 2, w2_amyrein: 1, w2_nagris: 1 };
  API.SMITH_TOWN = "w2_dranherz";
  const townLv = (loc) => { const S = G.S; return Math.min(5, (API.TOWN_LV[loc] !== undefined ? API.TOWN_LV[loc] : 1) + (S.fame >= 300 ? 2 : S.fame >= 100 ? 1 : 0)); };
  const seeds = new WeakMap();
  const seedOf = (S) => { let v = seeds.get(S); if (v === undefined) { v = hash([S.profile && S.profile.name, S.cls, JSON.stringify(S.startStats || {}), S.goal && S.goal.id].join("|")); seeds.set(S, v); } return v; };
  API.stockKey = (loc, day) => `${loc}:${day}`;
  // その町のその日の品（基本の品ぞろえ L.shop と D.SHOP_BASE の他に並ぶもの）
  API.stock = (loc, day) => {
    const S = G.S;
    loc = loc || S.loc;
    day = day || S.day;
    const L = D.LOCS[loc];
    if (!L || L.type !== "town" || !(L.fac || []).includes("shop")) return [];
    const lv = townLv(loc);
    const b = st(S).bought;
    const gone = b && b.key === API.stockKey(loc, day) ? b.ids : [];
    const mk = `${seedOf(S)}|${loc}|${day}|${lv}`;
    if (!stockMemo.has(mk)) { if (stockMemo.size > 64) stockMemo.clear(); stockMemo.set(mk, makeStock(S, L, loc, day, lv)); }
    return stockMemo.get(mk).filter((id) => !gone.includes(id));
  };
  const stockMemo = new Map();
  // 品ぞろえは人物・町・日・町の深さだけで決まるので、一度作ったら覚えておく
  function makeStock(S, L, loc, day, lv) {
    const rnd = mulberry(seedOf(S) ^ hash(API.stockKey(loc, day)));
    const out = [];
    const take = (id) => { if (id && !out.includes(id) && D.ITEMS[id]) out.push(id); };
    // この町の名物（i3.from）から三つまで、各地の型から二つ
    const local = NAMED_BASES().concat(GEN_BASES()).filter((id) => (RAW[id].i3.from || []).includes(loc) && (RAW[id].i3.lv || 0) <= lv + 1);
    for (let i = 0; i < 3 && local.length; i++) take(local.splice(Math.floor(rnd() * local.length), 1)[0]);
    const common = GEN_BASES().filter((id) => !(RAW[id].i3.from || []).length && (RAW[id].i3.lv || 0) <= lv && !(L.shop || []).includes(id) && !D.SHOP_BASE.includes(id));
    for (let i = 0; i < 2 && common.length; i++) take(common.splice(Math.floor(rnd() * common.length), 1)[0]);
    // 組み合わせの品（鍛冶の都は多く、よい物が出る）
    const n = loc === API.SMITH_TOWN ? 5 : 3;
    for (let i = 0; i < n; i++) take(API.roll(lv + (loc === API.SMITH_TOWN ? 1 : 0), { shop: true, rnd }));
    return out;
  }

  // ---------------------------------------------------------------- 鍛冶（強化・銘入れ・修理・鑑定）
  API.MAX_PLUS = (loc) => (loc === API.SMITH_TOWN ? 5 : 2);
  const smithHere = (S) => S.loc === API.SMITH_TOWN;
  API.upCost = (id) => { const it = D.ITEMS[id]; const p = API.parse(id); const n = (p ? p.plus : 0) + 1; const c = 40 * n * n + Math.round((it ? it.price : 0) * 0.15); return smithHere(G.S) ? Math.round(c * 0.8) : c; };
  API.upChance = (id) => { const p = API.parse(id); const n = (p ? p.plus : 0) + 1; return smithHere(G.S) ? (n <= 3 ? 100 : n === 4 ? 80 : 60) : n === 1 ? 80 : 55; };
  API.nameCost = (id) => { const it = D.ITEMS[id]; return Math.round((80 + (it ? it.price : 0) * 0.3) * (smithHere(G.S) ? 1 : 1.5)); };
  API.fixCost = (id) => { const it = D.ITEMS[id]; const p = API.parse(id); return p && p.pre === "cursed" ? 120 : Math.round(20 + (it ? it.price : 0) * 0.3); };
  API.apprCost = (id) => { const it = D.ITEMS[API.identify(id)]; return Math.round(10 + (it ? it.price : 0) * 0.05); };
  // 鍛冶に出せる品の、今の部品（素の品は、土台そのもの）
  const partsOf = (id) => API.parse(id) || (API.smithable(id) ? { base: id, mat: "", pre: "", suf: "", plus: 0 } : null);

  // 品のある所：装備の枠（I2 の 7 つ）か、持ち物か
  const where = (id) => { const S = G.S; const k = G.i2s ? G.i2s.where(S, id) : S.weapon === id ? "weapon" : S.armor === id ? "armor" : S.ring === id ? "ring" : null; return k || (S.inv[id] ? "inv" : null); };
  const wornIds = (S) => (G.i2s ? G.i2s.worn(S) : [S.weapon, S.armor, S.ring]);
  // 品を作り替える（装備中なら装備の枠、持ち物なら持ち物で入れ替える）
  function swap(oldId, newId) {
    const S = G.S;
    const w = where(oldId);
    if (!w || !D.ITEMS[newId]) return false;
    if (w === "inv") { G.take(oldId); baseGive(newId); }
    else S[w] = newId;
    if (G.codexItem) G.codexItem(newId, true);
    return true;
  }
  API.swap = swap;

  // head：店なら "shop"、鍛冶場なら "forge"（行いの id の頭）
  function smithList(head) {
    const S = G.S;
    const list = [];
    const max = API.MAX_PLUS(S.loc);
    [...new Set(wornIds(S))].filter((id) => id && partsOf(id)).forEach((id) => {
      const p = partsOf(id);
      const it = D.ITEMS[id];
      if (p.rust || p.pre === "cursed") return;
      if (p.plus < max) { const c = API.upCost(id); list.push({ id: head + ":i3up:" + id, label: `${it.name}を鍛え直す（+${p.plus + 1}）`, sub: `${c}G・うまくいく見込み ${API.upChance(id)}%`, disabled: S.gold < c, kw: ["鍛", "強化", it.name] }); }
      if (!p.pre || !p.suf) { const c = API.nameCost(id); list.push({ id: head + ":i3name:" + id, label: `${it.name}に銘を入れる`, sub: `${c}G・${p.pre ? "後ろ" : "前"}の銘が一つ付く`, disabled: S.gold < c, kw: ["銘", it.name] }); }
    });
    const mine = [...new Set([...wornIds(S), ...Object.keys(S.inv)])].filter((id) => id && isGen(id));
    mine.forEach((id) => {
      const p = API.parse(id);
      const it = D.ITEMS[id];
      if (!p || !it) return;
      if (p.unk) { const c = API.apprCost(id); list.push({ id: head + ":i3appr:" + id, label: `${it.name}を鑑定してもらう`, sub: `${c}G`, disabled: S.gold < c, kw: ["鑑定", it.name] }); }
      else if (p.rust || p.pre === "cursed") { const c = API.fixCost(id); list.push({ id: head + ":i3fix:" + id, label: p.rust ? `${it.name}を直してもらう` : `${it.name}を打ち直して呪いを抜く`, sub: `${c}G${p.pre === "cursed" ? "・呪いの銘が消える" : ""}`, disabled: S.gold < c, kw: ["修理", "直", "呪い", it.name] }); }
    });
    return list;
  }

  function smithAct(kind, id) {
    const S = G.S;
    const it = D.ITEMS[id];
    if (!it || !where(id)) return;
    if (kind === "i3appr") {
      const c = API.apprCost(id); if (S.gold < c) return;
      S.gold -= c;
      const real = API.identify(id);
      swap(id, real);
      const r = D.ITEMS[real];
      G.log("you", `${it.name}を鑑定してもらう`);
      G.say(r.cursed ? "鍛冶屋は品を一目見るなり、火箸でつまんで台に置いた。「呪われてる。着けるなら、覚悟しな」" : G.pick(["鍛冶屋は品を光にかざし、爪で弾いて、音を聞いた。", "主人は眼鏡を額に上げ、刻印をなぞった。「ほう」とだけ言った。"]));
      G.note(`${r.name}（${API.effectText(r)}）（-${c}G）`);
      return;
    }
    if (kind === "i3fix") {
      const c = API.fixCost(id); if (S.gold < c) return;
      const p = API.parse(id);
      S.gold -= c;
      if (p.rust) p.rust = false; else if (p.pre === "cursed") p.pre = "";
      const nid = API.id(p);
      swap(id, nid);
      G.log("you", `${it.name}を直してもらう`);
      G.say(it.cursed ? "炉の火が一瞬、青くなった。鍛冶屋は何も言わずに槌を振り続け、終わると井戸で長いこと手を洗っていた。" : "傷みを繕い、磨き直してもらった。見違えるようだ。");
      G.note(`${D.ITEMS[nid].name}になった。（-${c}G）`);
      return;
    }
    const p = partsOf(id);
    if (kind === "i3up") {
      const c = API.upCost(id); if (S.gold < c || p.plus >= API.MAX_PLUS(S.loc)) return;
      S.gold -= c;
      G.log("you", `${it.name}を鍛え直してもらう`);
      G.pass(1);
      if (G.d(100) <= API.upChance(id)) {
        p.plus++;
        const nid = API.id(p);
        swap(id, nid);
        G.say(smithHere(S) ? "親方は一度も手を止めず、槌の音だけで鉄と話をしていた。冷めた品は、前より少しだけ重く、少しだけ軽い。" : "店の奥の小さな炉で、主人が汗だくになって槌を振るった。");
        G.note(`${D.ITEMS[nid].name}になった。（-${c}G）`);
      } else {
        G.say(G.pick(["焼きを入れた途端、嫌な音がした。主人は首を振った。「今日は鉄の機嫌が悪い」", "主人は打ち上がった品を見て舌打ちし、もう一度炉に戻した。結局、元のままだ。"]));
        G.note(`うまくいかなかった。（-${c}G）`);
      }
      return;
    }
    if (kind === "i3name") {
      const c = API.nameCost(id); if (S.gold < c || (p.pre && p.suf)) return;
      S.gold -= c;
      const lv = Math.min(6, townLv(S.loc) + (smithHere(S) ? 2 : 0));
      const b = RAW[p.base];
      const pool = Object.entries(p.pre ? I3.SUF : I3.PRE).filter(([, x]) => x.rank > 0 && !x.curse && x.lv <= lv && fxOf(x, b.type));
      const x = wpick(G.rand, pool, ([, a]) => a.w + (smithHere(S) ? a.lv : 0));
      if (!x) return;
      if (p.pre) p.suf = x[0]; else p.pre = x[0];
      const nid = API.id(p);
      G.log("you", `${it.name}に銘を入れてもらう`);
      G.pass(1);
      if (!D.ITEMS[nid]) { G.note("銘が乗らなかった。"); return; }
      swap(id, nid);
      G.say("鏨の音が、ゆっくり三度。主人は削り屑を吹き払って、品を返してよこした。");
      G.note(`${D.ITEMS[nid].name}になった。（-${c}G）`);
    }
  }

  // ---------------------------------------------------------------- 施設の行い（店・鍛冶場・宿）
  const baseFacActions = G.facActions;
  G.facActions = () => {
    const S = G.S;
    const g = baseFacActions();
    if (S.fac === "shop") {
      const buy = g.find((x) => x.title === "買う");
      if (buy) {
        buy.list.forEach((a) => { const id = a.id.slice(9); const it = D.ITEMS[id]; if (it && SLOT[it.type]) a.sub += "・" + API.compareLabel(id); });
        const today = API.stock();
        if (today.length) {
          g.splice(g.indexOf(buy) + 1, 0, { title: "今日の品（日ごとに入れ替わる）", list: today.map((id) => {
            const it = D.ITEMS[id];
            const r = API.rarityOf(it);
            return { id: "shop:buy:" + id, label: it.name, sub: `${it.price}G${r ? "・" + I3.RARITY[r] : ""}・${API.effectText(it)}・${API.compareLabel(id)}`, disabled: S.gold < it.price, kw: ["買", it.name] };
          }) });
        }
      }
      const sell = g.find((x) => x.title === "売る");
      const junk = junkList();
      if (sell && junk.length) sell.list.unshift({ id: "shop:i3junk", label: "要らない武具をまとめて売る", sub: `${junk.length}点・+${junk.reduce((a, id) => a + Math.floor(D.ITEMS[id].price / 2) * S.inv[id], 0)}G（今の装備より下の物）`, kw: ["まとめて", "売", "整理"] });
      const sm = smithList("shop");
      if (sm.length) g.splice(g.length - 1, 0, { title: smithHere(S) ? "鍛冶（鍛冶の都の腕）" : "鍛冶と鑑定（店の奥の小さな炉）", list: sm });
    } else if (S.fac === "forge") {
      const sm = smithList("forge");
      if (sm.length) g.splice(g.length - 1, 0, { title: "鍛冶（親方に頼む）", list: sm });
    } else if (S.fac === "inn") {
      const x = st(S);
      const spare = spareGear();
      const list = [{ id: "inn:i3put", label: "装備していない武具を預ける", sub: spare.length ? `${spare.length}点・どの町の宿でも受け取れる` : "預ける物がない", disabled: !spare.length, kw: ["預け", "倉庫"] }];
      Object.keys(x.stash).slice(0, 12).forEach((id) => { const it = D.ITEMS[id]; if (it) list.push({ id: "inn:i3get:" + id, label: `${it.name}を受け取る`, sub: `${x.stash[id] > 1 ? "×" + x.stash[id] + "・" : ""}${API.compareLabel(id)}`, kw: ["受け取", "引き出", it.name] }); });
      const more = Object.keys(x.stash).length - 12;
      if (more > 0) list.push({ id: "inn:i3none", label: `ほかに ${more} 点を預けている`, sub: "", disabled: true });
      g.splice(g.length - 1, 0, { title: `宿の物置（武具の荷 ${API.load(S)}/${API.CAP}）`, list });
    }
    return g;
  };
  // 預けられる物・まとめて売る物（装備中・大事な物・伝説の品は除く）
  const spareGear = () => { const S = G.S; return Object.keys(S.inv).filter((id) => { const it = D.ITEMS[id]; return it && SLOT[it.type] && !it.key && !it.pierce; }); };
  const junkList = () => spareGear().filter((id) => { const it = D.ITEMS[id]; const c = API.compare(id); return !it.legend && !it.toll && it.price > 0 && c && c.dir < 0 && !(it.i3g && it.i3g.unk); });

  const baseFacAct = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (head === "shop") {
      const i = arg.indexOf(":");
      const kind = i < 0 ? arg : arg.slice(0, i), id = i < 0 ? "" : arg.slice(i + 1);
      if (kind === "buy" && API.stock().includes(id)) {
        const x = st(S);
        const key = API.stockKey(S.loc, S.day);
        if (!x.bought || x.bought.key !== key) x.bought = { key, ids: [] };
        x.bought.ids.push(id);
      }
      if (kind === "i3junk") {
        let sum = 0, n = 0;
        junkList().forEach((jid) => { const k = S.inv[jid]; const p = Math.floor(D.ITEMS[jid].price / 2) * k; sum += p; n += k; delete S.inv[jid]; invVer++; });
        S.gold += sum;
        G.log("you", "要らない武具をまとめて売る");
        G.note(`${n}点を売った。（+${sum}G）`);
        return;
      }
      if (kind.startsWith("i3")) return smithAct(kind, id);
      // 買う・売るのときは、元の行いに id をそのまま渡す（id に「:」が無いので arg のままでよい）
      return baseFacAct(head, arg, a);
    }
    if (head === "forge" && /^i3/.test(arg)) { const i = arg.indexOf(":"); return smithAct(arg.slice(0, i), arg.slice(i + 1)); }
    if (head === "inn" && arg === "i3put") {
      const x = st(S);
      const ids = spareGear();
      ids.forEach((id) => { x.stash[id] = (x.stash[id] || 0) + S.inv[id]; delete S.inv[id]; invVer++; });
      G.log("you", "武具を宿に預ける");
      G.note(`${ids.length}種を預けた。`);
      return;
    }
    if (head === "inn" && arg.startsWith("i3get:")) {
      const x = st(S);
      const id = arg.slice(6);
      if (!x.stash[id]) return;
      if (--x.stash[id] <= 0) delete x.stash[id];
      baseGive(id);
      G.log("you", `${D.ITEMS[id].name}を受け取る`);
      return;
    }
    return baseFacAct(head, arg, a);
  };

  // ---------------------------------------------------------------- 宝（野外の探索・迷宮の奥で見つけた金の横に）
  const baseExploreAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const g0 = S.gold;
    const r = baseExploreAct(head, arg, a);
    if ((head === "explore" || head === "deeper") && !S.over && S.mode === "explore" && !S.combat && S.gold > g0) {
      const L = G.loc();
      if (G.rand() < (L.type === "dungeon" ? 0.25 : 0.1)) {
        G.say(G.pick(["金貨の下に、布に包まれた何かがあった。", "骨の手が、最後まで何かを握っていた。", "崩れた棚の奥に、誰かの忘れ物が残っていた。"]));
        API.loot(API.depthLv(S));
      }
    }
    return r;
  };

  // 出来事の結果 i3gear（宝の表の口）
  const baseApply = G.apply;
  G.apply = (o) => {
    baseApply(o);
    if (!o || !o.i3gear || !G.S || G.S.over) return;
    const v = o.i3gear;
    const lv = typeof v === "object" ? v.lv : v === true ? API.depthLv() : v;
    API.loot(lv, typeof v === "object" ? { kind: v.kind } : {});
  };

  // ---------------------------------------------------------------- 戦い（先手・吸う・落とし物・使徒の骸）
  const baseStartCombat = G.startCombat;
  G.startCombat = (ids, opt) => {
    baseStartCombat(ids, opt);
    const S = G.S;
    const C = S && S.combat;
    if (!C) return;
    const w = G.weapon(), a = G.armor(), rg = G.ring();
    const first = (w.first || 0) + ((a && a.first) || 0) + ((rg && rg.first) || 0);
    const t = G.target();
    if (!first || !t || G.rand() * 100 >= Math.min(60, first)) return;
    const e = G.foeData(t);
    if (e.majin && !w.pierce) return;
    const dmg = Math.min(t.hp - 1, G.dice(w.dmg) + Math.floor(G.s5Pow(S.stats[w.stat === "敏捷" ? "敏捷" : "筋力"]) / 20));
    if (dmg <= 0) return;
    t.hp -= dmg;
    G.log("nar", `相手が構えるより先に、${w.name}が届いた。`);
    G.log("sys", `先手：${t.name}に ${dmg} のダメージ（残り ${t.hp}/${t.max}）`, { fx: "hit", foe: t.name, n: dmg });
  };

  const baseCombatAct = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const C = S && S.combat;
    if (!C) return baseCombatAct(arg);
    const kind = arg.split(":")[0];
    const w = G.weapon();
    const foes = C.foes.map((f) => ({ f, e: D.ENEMIES[f.id] || {} }));
    const before = C.foes.reduce((a, f) => a + Math.max(0, f.hp), 0);
    const r = baseCombatAct(arg);
    if (S.over) return r;
    const dealt = before - C.foes.reduce((a, f) => a + Math.max(0, f.hp), 0);
    if ((kind === "attack" || kind === "vital") && w.drain && dealt > 0 && S.hp < S.maxHp) {
      const n = Math.max(1, Math.floor(dealt * w.drain));
      G.heal(n);
      G.note(`${w.name}が血を吸った。HP +${n}`);
    }
    // 勝った（敵がみな倒れて戦いが終わった）
    if (!S.combat && foes.every(({ f }) => f.hp <= 0)) {
      const apostle = foes.find(({ e }) => e.majin);
      if (apostle) {
        const id = API.freeLegend(I3.LEGEND_APOSTLE);
        if (id) { G.say(`${apostle.f.name}の骸が崩れていく。灰の中に、何かが残っていた。`); G.give(id); G.note(`${D.ITEMS[id].name}を手に入れた。（伝説の品）`); G.chron(`${apostle.f.name}の骸から、${D.ITEMS[id].name}を拾う`); }
      }
      const tier = Math.max(...foes.map(({ e }) => e.tier || 1));
      const boss = foes.some(({ e }) => e.boss);
      const p = boss ? 0.5 : 0.02 + 0.01 * tier + (G.loc().type === "dungeon" ? 0.02 : 0);
      if (G.rand() < p) API.loot(Math.max(API.depthLv(S), tier - 1 + (boss ? 1 : 0)));
    }
    return r;
  };

  // ---------------------------------------------------------------- シートの行（武具の荷）
  const baseM5Rows = G.m5Rows;
  G.m5Rows = (S) => {
    const rows = baseM5Rows ? baseM5Rows(S) : [];
    const n = API.load(S);
    const x = S.i3 && S.i3.stash ? Object.values(S.i3.stash).reduce((a, k) => a + k, 0) : 0;
    if (n < API.CAP - 2 && !x) return rows; // 荷が軽く、預けた物もなければ出さない
    rows.push(["武具の荷", `${n}/${API.CAP}${n > API.CAP ? `（重い・敏捷-${API.overPenalty(S)}）` : ""}${x ? `・宿に ${x}` : ""}`]);
    return rows;
  };

  // ---------------------------------------------------------------- 図鑑（型・材質・銘）
  API.codex = () => { const c = G.codex ? G.codex() : {}; const x = (c.i3 = c.i3 || {}); x.mats = x.mats || {}; x.pre = x.pre || {}; x.suf = x.suf || {}; return x; };
  const baseCodexItem = G.codexItem;
  if (baseCodexItem) {
    G.codexItem = (id, quiet) => {
      if (!isGen(id)) return baseCodexItem(id, quiet);
      const p = API.parse(id);
      if (!p) return false;
      const fresh = baseCodexItem(p.base, quiet);
      if (p.unk) return fresh;
      const x = API.codex();
      const b = RAW[p.base];
      let added = false;
      const mark = (o, k) => { if (k && !o[k]) { o[k] = 1; added = true; } };
      if (p.mat && b.i3) mark(x.mats, b.i3.mat + ":" + p.mat);
      mark(x.pre, p.pre);
      mark(x.suf, p.suf);
      if (added && G.onCodexChange) try { G.onCodexChange(); } catch {}
      return fresh || added;
    };
  }
  // 図鑑の「主な入手場所」と性能の行に、I3 の入手先（日替わりの品・宝・使徒の骸）と効き目（先手・吸う・能力値・補正）を足す
  const baseWhere = G.codexItemWhere;
  if (baseWhere) {
    G.codexItemWhere = (id, max) => {
      const out = baseWhere(id, max);
      const it = RAW[id];
      if (!it || out.length >= (max || 3)) return out;
      const add = (t) => { if (t && !out.includes(t) && out.length < (max || 3)) out.push(t); };
      if (it.legend) add(I3.LEGEND_APOSTLE.includes(id) ? "使徒の骸" : I3.LEGEND_DEEP.includes(id) ? "深い迷宮の宝" : "");
      ((it.i3 && it.i3.from) || []).forEach((t) => add(D.LOCS[t] && `${D.LOCS[t].name}の商店（日替わり）`));
      if (it.i3 && it.i3.gen) add("各地の商店と宝（材質と銘が付くことも）");
      return out;
    };
  }
  const baseStats = G.codexItemStats;
  if (baseStats) {
    G.codexItemStats = (id) => {
      const rows = baseStats(id);
      const it = D.ITEMS[id];
      if (!it || (it.type !== "weapon" && it.type !== "armor")) return rows;
      const e = [];
      if (it.first) e.push("先手" + G.sign(it.first));
      if (it.drain) e.push(`吸う${Math.round(it.drain * 100)}%`);
      Object.entries(it.stats || {}).forEach(([k, n]) => e.push(G.statModText(k, n)));
      Object.entries(it.bonus || {}).forEach(([k, n]) => e.push((KIND[k] || k) + G.sign(n)));
      if (e.length) rows.splice(Math.max(0, rows.length - 2), 0, ["効果", e.join("・")]);
      if (it.i3 && it.i3.k) rows.unshift(["型", `${it.i3.k}${it.type === "weapon" ? (it.i3.h === 2 ? "・両手" : "・片手") : ""}`]);
      if (it.legend) rows.unshift(["稀さ", "伝説（一つの冒険で一度だけ）"]);
      return rows;
    };
  }
  const baseMerge = G.codexMerge;
  if (baseMerge) {
    G.codexMerge = (a, b) => {
      const out = baseMerge(a, b);
      const x = { mats: {}, pre: {}, suf: {} };
      [a, b].forEach((c) => { const y = (c && c.i3) || {}; ["mats", "pre", "suf"].forEach((k) => Object.assign(x[k], y[k] || {})); });
      out.i3 = x;
      return out;
    };
  }
  // 図鑑の表：{ mats: [[種類の名, [[鍵, 名, 知っているか]]]], pre: [...], suf: [...] }
  const MAT_KIND = { metal: "金属", wood: "木", cloth: "布", leather: "革", hide: "毛皮", gem: "石と貴金属" };
  API.codexTable = () => {
    const x = API.codex();
    return {
      mats: Object.entries(I3.MATS).map(([k, ms]) => [MAT_KIND[k] || k, Object.entries(ms).map(([m, v]) => [k + ":" + m, v.name, !!x.mats[k + ":" + m], v.line])]),
      pre: Object.entries(I3.PRE).map(([k, v]) => [k, v.name, !!x.pre[k], v.line]),
      suf: Object.entries(I3.SUF).map(([k, v]) => [k, v.name, !!x.suf[k], v.line]),
    };
  };

  // ---------------------------------------------------------------- 入手先（落とし物）を足す
  const DROPS = {
    kin: [["i3w_kinfang", 0.06], ["i3r_kineye", 0.04], ["i3a_kinhide", 0.03]],
    bonedragon: [["i3w_bonegreat", 0.5], ["i3a_bonemail", 0.3], ["i3r_dragontooth", 0.3]],
    wyvern: [["i3a_wyvernleather", 0.05]],
    general: [["i3w_ashblade", 0.08], ["i3a_ashmantle", 0.05], ["i3r_ashbead", 0.05]],
    blackknight: [["i3w_ashblade", 0.05], ["i3a_ashmantle", 0.04]],
    warlock: [["i3w_bonestaff", 0.1]],
  };
  Object.entries(DROPS).forEach(([id, loot]) => { const e = D.ENEMIES[id]; if (e) e.loot = [...(e.loot || []), ...loot.filter(([it]) => RAW[it])]; });
  API.KIND_NAME = KIND_NAME;
  API.RING_BONUS = RING_BONUS;
})(globalThis.G = globalThis.G || {});
