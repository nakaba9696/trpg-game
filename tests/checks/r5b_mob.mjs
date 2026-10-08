// R5b：名のある人の絵を、別の人にも汎用のモブ絵（型）にも使わない（持ち主「依頼人も汎用モブ絵とかで使いまわしていいです。名ありと立ち絵が被るのはやめてください」）
// - 出来事・キャラメモ・施設の主・仲間（出来事の仲間・乱数の仲間）のどの人も、名のある人の絵（kind_ でない絵）が出るなら、その絵の id はその人の札の id と同じ
//   （札は C3 の G.whoTag・R5 の表から引くので、v4_assets.js の当て方とは別の道で確かめる）
// - 名前だけの人（id の無い依頼人。「写し場の古株ヤン」）は型の絵（汎用のモブ絵）か絵なし。名のある人の絵は出ない
// - 型の一覧（docs/art/portraits.json の people）は kind_ の id だけ。名のある人の画像ファイルと中身が同じ型・別の id の画像ファイルが無い
// - 人の姿の敵（docs/art/monsters.json の people）の絵は、その敵と同じ人（敵の id に人物の id が入っている）
// - まだ描いていない型（ファイルの無い型）は、年頃の合う型が無くて絵の出ていない人がいる型だけ
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";

export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const errs = [];
  const F = (m) => { errs.push(m); fail("R5b " + m); };
  const root = new URL("../../", import.meta.url);
  const vmc = vm.createContext({ console, G, Image: class { addEventListener() {} } });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js"]) vm.runInContext(readFileSync(new URL("src/ui/" + f, root), "utf8"), vmc, { filename: "ui/" + f });
  const json = JSON.parse(readFileSync(new URL("docs/art/portraits.json", root), "utf8"));
  const drawn = json.portraits.filter((p) => existsSync(new URL(p.file, root)));
  G.ASSETS = Object.fromEntries(drawn.map((p) => ["portraits/" + p.id, p.file]));
  const isKind = (k) => /^kind_/.test(k);

  // ---------------------------------------------------------------- 人を集める
  const whos = [];
  for (const e of D.EVENTS) { const w = G.eventWho(e); if (w) whos.push({ src: `出来事 ${e.id}`, w, ev: e.id }); }
  for (const [id, p] of Object.entries(D.C2_PEOPLE || {})) if (p.who) whos.push({ src: `キャラメモ ${id}`, w: p.who, ev: null });
  for (const id of Object.keys(D.LOCS)) { const w = G.facWho && G.facWho({ mode: "fac", fac: "castle", loc: id, flags: {} }); if (w) whos.push({ src: `王城の主 ${id}`, w, ev: null }); }
  const comps = [];
  const scan = (o) => { if (!o || typeof o !== "object") return; if (o.companion && typeof o.companion === "object") comps.push(o.companion); for (const k of ["ok", "ng", "win"]) scan(o[k]); };
  for (const e of D.EVENTS) for (const c of e.choices || []) scan(c);
  Object.values(D.F2_MATES || {}).forEach((c) => comps.push(c));
  G.rand = seeded(77);
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 40])), caps: Object.fromEntries(D.STATS.map((k) => [k, 70])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  for (let i = 0; i < 150; i++) comps.push(G.genCompanion());
  for (const c of comps) whos.push({ src: `仲間 ${c.name}`, w: G.companionWho(c), ev: null, comp: c });

  // ---------------------------------------------------------------- 名のある人の絵は、その人だけ
  const idOf = ({ w, ev, comp }) => {
    if (comp && comp.c2) return comp.c2;
    const t = G.whoTag(w, null, ev);
    const p = G.r5.person(w, ev);
    return (t && t.id) || (p && p.id) || null;
  };
  let namedArt = 0, mob = 0, nameOnly = 0;
  const used = new Map(); // 名のある人の絵 → 使った人の id
  for (const x of whos) {
    const { w, src } = x;
    if (!w || w.kind === "foe" || w.kind === "hero") continue;
    const k = G.v4PortraitKey(w);
    const only = G.r5.artId(w, x.ev) === "";
    if (only) { nameOnly++; if (k && !isKind(k)) F(`${src}：名前だけの人「${w.name}」に名のある人の絵 ${k} が出る`); }
    if (!k) continue;
    if (isKind(k)) { mob++; continue; }
    namedArt++;
    const who = idOf(x);
    if (who !== k) F(`${src}：名のある人の絵 ${k} が、別の人（札の id ${who || "なし"}${w.name ? "・" + w.name : ""}）に出る`);
    if (!used.has(k)) used.set(k, new Set());
    used.get(k).add(who);
  }
  for (const [k, s] of used) if (s.size > 1) F(`名のある人の絵 ${k} を ${[...s].join("・")} が使っている`);

  // ---------------------------------------------------------------- 型の一覧と画像ファイル
  for (const p of json.portraits) {
    if (p.group === "people" && !isKind(p.id)) F(`型の一覧に kind_ でない id ${p.id} がある`);
    if (p.group !== "people" && isKind(p.id)) F(`名のある人の一覧に型の id ${p.id} がある`);
  }
  const dir = new URL("assets/portraits/", root);
  const hash = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".webp"))) {
    const h = createHash("sha1").update(readFileSync(new URL(f, dir))).digest("hex");
    (hash[h] = hash[h] || []).push(f.replace(/\.webp$/, ""));
  }
  // 同じ人の表情の差分（<id>_<表情>）どうしは同じでもよい。別の人・型と同じ画像はだめ
  const person = (f) => (isKind(f) ? f : json.portraits.map((p) => p.id).filter((id) => f === id || f.startsWith(id + "_")).sort((a, b) => b.length - a.length)[0] || f);
  for (const fs of Object.values(hash)) {
    const ps = [...new Set(fs.map(person))];
    if (ps.length > 1 && !ps.every(isKind)) F(`同じ画像が、名のある人と別の人・型に使われている：${fs.join("・")}`);
  }

  // ---------------------------------------------------------------- 人の姿の敵
  const mons = JSON.parse(readFileSync(new URL("docs/art/monsters.json", root), "utf8"));
  for (const [foe, pid] of Object.entries(mons.people || {})) if (!foe.endsWith("_" + pid)) F(`人の姿の敵 ${foe} に、別の人 ${pid} の絵を使っている`);

  // ---------------------------------------------------------------- まだ描いていない型は、要る型だけ
  const drawnIds = new Set(drawn.map((p) => p.id));
  const wanted = json.portraits.filter((p) => p.group === "people" && !drawnIds.has(p.id));
  const want = new Set();
  const save = G.ASSETS;
  for (const p of wanted) {
    G.ASSETS = Object.assign({}, save, { ["portraits/" + p.id]: p.file });
    if (whos.some((x) => x.w && x.w.kind !== "foe" && !save["portraits/" + (G.v4PortraitKey(x.w) || "")] && G.v4PortraitKey(x.w) === p.id)) want.add(p.id);
    else F(`まだ描いていない型 ${p.id} を使う人がいない（年頃の合う型が無くて絵の出ていない人のための型だけを足す）`);
  }
  G.ASSETS = save;

  if (!errs.length) ok(`R5b モブ絵：名のある人の絵 ${namedArt} 人ぶんはみなその人だけ、型 ${mob} 人ぶん（名前だけの人 ${nameOnly} 人を含む）に名のある人の絵は無い。画像 ${Object.keys(hash).length} 枚に重なり無し。まだ描いていない型 ${wanted.length}`);
};
