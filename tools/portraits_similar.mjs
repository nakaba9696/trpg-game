// 名のある人物の見た目が似すぎていないかを調べる（A：持ち主「主要人物であんまり似たような顔にしないで」）。
// docs/art/portraits.json の identity（無ければ tags）から、性別・年齢帯・体格・髪の色・髪の長さと髪型・前髪・目の色と形・肌・ひげ・印・服の色と形・男の type を取り出し、
// 二人ずつ比べる。血縁（`kin` が同じ）と、乱数で作られる人（group people・hero）の組は比べない。
// node tools/portraits_similar.mjs          … 似すぎの組と、近い組・偏り（同じ特徴の人が何人もいる）の一覧
// node tools/portraits_similar.mjs dil      … その人と近い順に並べる
// tests/checks/a7_similar.mjs が、似すぎの組と偏りが無いことを見る
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSON_PATH } from "./portraits.mjs";

// 似すぎ：この点以上。近い：NEAR 以上（一覧に出すだけ）
export const LIMIT = 10;
export const NEAR = 8.5;
// 偏り：性別・年齢帯・髪の色・髪の長さ・体格が同じ人がこの数を超えたら（「黒髪の細身の青年」が何人も、のような）
export const CLUSTER_MAX = 2;

const MOB = new Set(["people", "hero"]);
const tagsOf = (p) => String(p.identity || p.tags || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const has = (t, re) => t.some((x) => re.test(x));
const first = (t, table) => { for (const x of t) for (const [k, re] of table) if (re.test(x)) return k; return ""; };
const all = (t, table) => { const s = new Set(); for (const x of t) for (const [k, re] of table) if (re.test(x)) s.add(k); return s; };

// 髪の色（似た色はまとめる。近い色は半分）
const HAIR = [
  ["bald", /^bald$/],
  ["black", /^(black|jet black|blue-black|dark|dull black|glossy black) hair$/],
  ["brown", /^(brown|dark brown|light brown|chestnut|chestnut brown|honey brown|soft brown|dull brown|black-brown|sandy) hair$/],
  ["green", /^(green|dark green|emerald green) hair$/],
  ["blonde", /^(blonde|golden blonde|dark blonde|dirty blonde|ash blonde|honey blonde) hair$/],
  ["pale", /^(platinum blonde|pale blonde) hair$/],
  ["silver", /^(white|silver|silver-white|platinum silver|cream white|snow white|thin white|silver white) hair$/],
  ["grey", /^(grey|ash grey|steel grey|silver grey|ash silver|dark grey) hair$/],
  ["red", /^(red|crimson|dark red|wine red) hair$/],
  ["blue", /^(blue|light blue|silver blue) hair$/],
  ["orange", /^(orange|ginger) hair$/],
  ["lilac", /^(lilac|purple|violet|dark purple|pink|pale pink) hair$/],
];
const HAIR_NEAR = [["silver", "grey"], ["silver", "pale"], ["pale", "blonde"], ["black", "brown"], ["grey", "pale"]];
const EYE = [
  ["dark", /^(black|dark brown|dark) eyes$/],
  ["brown", /^(brown|hazel) eyes$/],
  ["gold", /^(amber|golden|yellow|glowing golden) eyes$/],
  ["green", /^green eyes?$/],
  ["blue", /^(blue|light blue|ice blue|cyan) eyes$/],
  ["navy", /^dark blue eyes$/],
  ["grey", /^(grey|pale grey) eyes$/],
  ["violet", /^violet eyes$/],
  ["red", /^red eyes$/],
  ["odd", /^heterochromia$/],
  ["covered", /^(mask covering eyes|blindfold|blindfolded)$/], // 目が見えない人（A9。色の代わり）
];
const EYE_NEAR = [["dark", "brown"], ["brown", "gold"], ["blue", "navy"], ["blue", "grey"], ["navy", "grey"]];
const EYE_SHAPE = [
  ["sharp", /^(sharp|narrow|narrowed|cold|piercing gaze|glaring|squinting eyes|confident) eyes$|^piercing gaze$|^glaring$/],
  ["sleepy", /^(half-closed|sleepy|closed) eyes$|^squinting$/],
  ["round", /^(round|bright) eyes$/],
  ["soft", /^(gentle|droopy|calm|serious) eyes$/],
];
const LENGTH = [["long", /^(very )?long hair$|^hair bun$|updo$/], ["medium", /^medium hair$/], ["short", /^short hair$|^bob cut$|^crew cut$/], ["bald", /^bald$/]];
const STYLE = [
  ["tied", /ponytail|low tied hair|topknot/],
  ["bun", /hair bun|updo|low bun|pulled back/],
  ["braid", /braid/],
  ["bob", /bob cut/],
  ["back", /slicked back|swept back|combed back/],
  ["messy", /messy|spiky|wild hair|choppy/],
  ["crop", /crew cut/],
  ["receding", /receding hairline/],
  ["straight", /^straight hair$|hime cut/],
  ["wavy", /wavy|curly/],
];
const BANGS = [["blunt", /^(blunt|straight) bangs$|hime cut/], ["side", /^(side|swept|side-swept|soft) bangs$/], ["long", /^long bangs$|hair between eyes/], ["messy", /^messy bangs$/]];
const SKIN = [["pale", /^(very )?pale skin$|porcelain skin/], ["fair", /^(fair|light) skin$/], ["tan", /^(tan|weathered|wrinkled|bark-like) skin$/]];
const BUILD = [
  ["big", /huge|very muscular|burly|large build|big belly|very tall/],
  ["fit", /^(muscular|athletic|broad shoulders|fit|sturdy|stocky)$/],
  ["slim", /^(slim|lean|slender|thin|petite|wiry|frail|gaunt|small)$/],
];
// 印：一人にだけある目立つ物は、見分けの助けになる（違うほど点が下がる）
const MARK = [
  ["glasses", /glasses|pince-nez/], ["monocle", /monocle|loupe/], ["eyepatch", /eyepatch|steel mask|mask covering/],
  ["scar", /\bscars?\b/], ["mole", /mole/], ["freckles", /freckles|dirt on|soot on|coal dust|ink stains|paint stains|charcoal/],
  ["beast", /(dog|wolf|cat|fox|rat|bear|rabbit) (ears|girl|boy)|bear ears/], ["elf", /pointy ears|^elf$/],
  ["beard", /beard|mustache/], ["stubble", /stubble/], ["hat", /\bhat\b|\bcap\b|\bhood up\b|headband|bandana(?! around neck)|kerchief/],
  ["crown", /crown|circlet/], ["earring", /earring/], ["streak", /streak|grey streaked/], ["flower", /flower|feather in|wheat ear|ribbon|hair clip|hair ornament/],
  ["glow", /glowing|glow\b/], ["veil", /veil|cloth mask|beak mask/], ["goggles", /goggles/], ["wings", /\bwings?\b/],
];
// 輪郭が大きく変わる印（獣の耳・顔を覆う物・眼帯・翼・眼鏡・帽子）。片方にだけあれば髪の双子にしない
const STRONG = new Set(["beast", "veil", "eyepatch", "wings", "glasses", "hat"]);
const CLOTH_COLOR = /\b(white|black|dark|grey|blue|dark blue|navy|red|burgundy|green|dark green|brown|purple|dark purple|lavender|silver|gold)\b/;
const CLOTH = [
  ["armor", /armor|cuirass|plate\b/], ["uniform", /uniform|military coat|staff officer/], ["robe", /robe|vestment|kimono|haori/],
  ["dress", /dress/], ["coat", /coat|cloak|cape/], ["work", /apron|work clothes|gi\b|shirt|vest|jacket|tunic|blouse|sweater/],
];
const CLOTHING = /armor|cuirass|uniform|coat|cloak|cape|robe|vestment|kimono|haori|dress|apron|clothes|gi\b|shirt|vest|jacket|tunic|blouse|sweater|outfit/;

function ageOf(t) {
  const m = t.map((x) => x.match(/^(\d+) years old$/)).find(Boolean);
  const n = m ? +m[1] : has(t, /^(child|small child|toddler|boy)$/) ? 9 : has(t, /teenage/) ? 15 : has(t, /^old man$|old woman/) ? 65 : has(t, /middle-aged/) ? 48 : has(t, /^young (man|woman)$/) ? 23 : has(t, /^(man|woman|adult|mature male)$/) ? 32 : -1;
  if (n < 0) return { n: -1, band: "" };
  const band = n < 13 ? "child" : n < 18 ? "teen" : n < 28 ? "young" : n < 40 ? "adult" : n < 55 ? "middle" : "old";
  return { n, band };
}

// 見た目の要素
export function looksOf(p) {
  const t = tagsOf(p);
  const sex = has(t, /^1girl$/) ? "f" : has(t, /^1boy$|male focus/) ? "m" : "x";
  const cloth = t.filter((x) => CLOTHING.test(x));
  const c0 = cloth.map((x) => x.match(CLOTH_COLOR)).find(Boolean);
  return {
    id: p.id, name: p.name, group: p.group, kin: p.kin || "", type: p.type || "",
    sex, age: ageOf(t), build: first(t, BUILD), hair: first(t, HAIR), length: first(t, LENGTH),
    style: all(t, STYLE), bangs: first(t, BANGS), eye: first(t, EYE), shape: first(t, EYE_SHAPE), skin: first(t, SKIN),
    marks: all(t, MARK), clothColor: c0 ? c0[1].replace(/^(dark blue|navy)$/, "blue") : "", cloth: all(cloth, CLOTH),
  };
}

const near = (pairs, a, b) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const both = (a, b) => a && b;
const inter = (a, b) => [...a].filter((x) => b.has(x));

// 髪の双子：同じ性別・同じ色・同じ長さの髪で、年が近く（10 以内か分からない）、髪型も食い違わない。目の色が違っても絵では似て見えるので、点に関わらず似すぎに数える
export function hairTwin(a, b) {
  if (a.sex !== b.sex || !a.hair || a.hair !== b.hair || a.hair === "bald" || !a.length || a.length !== b.length) return false;
  if (a.age.n >= 0 && b.age.n >= 0 && Math.abs(a.age.n - b.age.n) > 10) return false;
  if ((a.age.band === "child") !== (b.age.band === "child")) return false; // 子どもと大人は体つきで見分けがつく
  if (a.style.size && b.style.size && !inter(a.style, b.style).length) return false;
  if ((a.build === "big" && b.build === "slim") || (a.build === "slim" && b.build === "big")) return false;
  if ([...a.marks, ...b.marks].some((m) => STRONG.has(m) && !(a.marks.has(m) && b.marks.has(m)))) return false;
  return true;
}

// 二人の近さ（点が高いほど似ている）と、そろった要素
export function compare(a, b) {
  let s = 0;
  const why = [];
  const add = (n, w) => { s += n; if (w) why.push(w); };
  if (a.sex !== b.sex) return { score: -99, why: ["性別が違う"] };
  // 年齢
  if (a.age.n >= 0 && b.age.n >= 0) {
    const d = Math.abs(a.age.n - b.age.n);
    if (d <= 6) add(2, `年 ${a.age.n}/${b.age.n}`); else if (d <= 12) add(1, `年 ${a.age.n}/${b.age.n}`); else if (d >= 25) add(-2);
  } else add(1);
  if (both(a.build, b.build)) a.build === b.build ? add(1, `体格 ${a.build}`) : (a.build === "big" || b.build === "big") ? add(-1) : 0;
  // 髪（いちばん目に付く）
  if (both(a.hair, b.hair)) {
    if (a.hair === b.hair) add(4, `髪 ${a.hair}`); else if (near(HAIR_NEAR, a.hair, b.hair)) add(2, `髪 ${a.hair}≈${b.hair}`); else add(-2);
  }
  if (both(a.length, b.length)) a.length === b.length ? add(2, `長さ ${a.length}`) : (a.length === "medium" || b.length === "medium") ? add(1) : add(-1);
  // 同じ色・同じ長さの髪は、絵では輪郭がほとんど同じに見える
  if (both(a.hair, b.hair) && a.hair === b.hair && a.length && a.length === b.length) add(2, "髪の輪郭");
  const st = inter(a.style, b.style);
  if (st.length) add(1.5, `髪型 ${st.join("・")}`); else if (a.style.size && b.style.size) add(-0.5);
  if (both(a.bangs, b.bangs) && a.bangs === b.bangs) add(0.5, `前髪 ${a.bangs}`);
  // 目
  if (both(a.eye, b.eye)) {
    if (a.eye === b.eye) add(2, `目 ${a.eye}`); else if (near(EYE_NEAR, a.eye, b.eye)) add(1, `目 ${a.eye}≈${b.eye}`); else add(-0.5);
  }
  if (both(a.shape, b.shape) && a.shape === b.shape) add(1, `目つき ${a.shape}`);
  if (both(a.skin, b.skin)) a.skin === b.skin ? add(0.5) : (a.skin === "tan" || b.skin === "tan") ? add(-1) : 0;
  // 印：そろえば少し近く、片方にだけある印は見分けになる
  const same = inter(a.marks, b.marks);
  const only = [...a.marks].filter((x) => !b.marks.has(x)).concat([...b.marks].filter((x) => !a.marks.has(x)));
  if (same.length) add(Math.min(2, same.length * 0.5), `印 ${same.join("・")}`);
  const strong = only.filter((m) => STRONG.has(m)).length;
  if (strong) add(-Math.min(3, strong * 1.5));
  if (only.length > strong) add(-Math.min(1.5, (only.length - strong) * 0.5));
  // 服
  if (both(a.clothColor, b.clothColor) && a.clothColor === b.clothColor) add(0.5, `服の色 ${a.clothColor}`);
  const cl = inter(a.cloth, b.cloth);
  if (cl.length) add(0.5, `服 ${cl.join("・")}`);
  if (a.sex === "m" && a.type && a.type === b.type) add(1, `型 ${a.type}`);
  return { score: Math.round(s * 10) / 10, why, twin: hairTwin(a, b) };
}

// 名のある人（比べる人）
export const namedOf = (list) => list.filter((p) => !MOB.has(p.group));
export const skipPair = (a, b) => (a.kin && a.kin === b.kin);

export const tooSimilar = (r) => r.score >= LIMIT || r.twin;
export function pairs(list) {
  const L = namedOf(list).map(looksOf);
  const out = [];
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    if (skipPair(L[i], L[j])) continue;
    const r = compare(L[i], L[j]);
    out.push({ a: L[i], b: L[j], ...r });
  }
  return out.sort((x, y) => y.score - x.score);
}

// 偏り：性別・年齢帯・髪の色・髪の長さ・体格が同じ人の群れ（血縁は一人に数える）
export const clusterKey = (l) => l.sex === "x" || !l.hair ? "" : [l.sex, l.age.band, l.hair, l.length, l.build].join("/");
export function clusters(list) {
  const map = new Map();
  for (const l of namedOf(list).map(looksOf)) {
    const k = clusterKey(l);
    if (!k || k.split("/").some((x) => !x)) continue;
    if (!map.has(k)) map.set(k, []);
    const g = map.get(k);
    if (l.kin && g.some((o) => o.kin === l.kin)) continue;
    g.push(l);
  }
  return [...map.entries()].map(([key, people]) => ({ key, people })).filter((c) => c.people.length > 1).sort((x, y) => y.people.length - x.people.length);
}

export const load = () => JSON.parse(readFileSync(JSON_PATH, "utf8")).portraits || [];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = load();
  const who = (l) => `${l.id}（${l.name}）`;
  const one = process.argv[2];
  const P = pairs(list);
  if (one) {
    for (const r of P.filter((r) => r.a.id === one || r.b.id === one).slice(0, 15)) console.log(`${String(r.score).padStart(5)}  ${who(r.a.id === one ? r.b : r.a)}  ${r.why.join("、")}`);
  } else {
    const bad = P.filter(tooSimilar), close = P.filter((r) => r.score >= NEAR && !tooSimilar(r));
    console.log(`名のある人 ${namedOf(list).length} 人（血縁の組と乱数の人は除く）。似すぎ（${LIMIT} 点以上か髪の双子）${bad.length} 組・近い（${NEAR} 点以上）${close.length} 組`);
    for (const [h, rs] of [["■ 似すぎ", bad], ["□ 近い", close]]) {
      if (!rs.length) continue;
      console.log("\n" + h);
      for (const r of rs) console.log(`${String(r.score).padStart(5)}  ${who(r.a)} ／ ${who(r.b)}  ${r.why.join("、")}${r.twin ? "（髪の双子）" : ""}`);
    }
    const cs = clusters(list);
    console.log(`\n■ 偏り（性別/年齢帯/髪の色/長さ/体格 が同じ。${CLUSTER_MAX} 人を超えると失敗）`);
    for (const c of cs) console.log(`${c.people.length > CLUSTER_MAX ? "×" : " "} ${c.people.length} 人  ${c.key}：${c.people.map((l) => l.id).join("・")}`);
  }
}
