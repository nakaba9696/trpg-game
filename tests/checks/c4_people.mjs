// C4：持ち主の好きな型（docs/lore/taste.md）から作った人物（src/data/c4_people.js・events_c4.js・zc4_people.js・engine/zzzz_c4_people.js）
// - 12 人前後。仲間 3〜4・使徒の側 2・ほかは町と旅。男女・種族が混ざる。どの人にも、混ぜた型（mix）・ギャップ・過去・好感度の始まり（−100〜+100）
// - どの人にも、名前と役職の札（D.C3_NAMES）・人物図鑑の説明（D.F2_PEOPLE）・立ち絵のタグ（docs/art/portraits.json の identity。男は type。仲間は差分）
// - 出来事は 2〜4 個（ふつうに起きる出会いがある）。存在しない場所・人・続き・アイテムを指していない。仲間はその人だけの話が二つ以上
// - 仲間は出会いの流れで加わる。好感度の始まりが入る。黒鉄の砦の砦主は、最後にこちらを忘れる（c4forget）
// - 使徒の側：薄布の娘は E3 の形（条件・会う出来事・倒したあと）。眷属の糸を断つと、微笑の使徒の条件がそろう
// - 見せる文に、書かない言葉（見世物まわり・今の人が知らないこと・性的な言葉）が無い
// - 持ち主の表にある作品名・キャラ名が、リポジトリのどこにも無い（一覧そのものは書かず、ハッシュで持つ）
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TAGS = new Set(["any", "town", "wild", "dungeon", "capital", "port", "snow", "realm"]);
const BANNED = /見世物|観客|客席|舞台|台本|神々|魔王|魔人|正体|もういない|胸|童貞|貧乳|巨乳|ナイスバディ|ロリ|体つき|裸|下着|情欲|色気/;
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };

// 持ち主の表（他の作品の好きなキャラ 39 人）の作品名とキャラ名を、小文字にしてから [長さ, 転がしハッシュ, sha256 の頭 16 桁] にしたもの。
// 一覧そのものはリポジトリに置かない。二文字以下の名前と、ふつうの言葉に埋もれる名前（「バランス」に入る三文字など）は外した
const NG = [[9,10032135,"d55ec2f93d359bdf"],[6,3242300465,"846f6a76ffc11155"],[8,191478780,"a556fe6351cf1558"],[10,3904610592,"a84d11d677121bb2"],[3,12379168,"867b543a827af108"],[6,3812792901,"848536abe1fc6605"],[7,771601070,"3c6362a2e332a69d"],[7,602806385,"52b87b9989b10042"],[12,198449389,"d491909228792993"],[11,4273887029,"3cd7122b7172ba1d"],[8,605103964,"d3c240d89a483398"],[3,32476031,"bfd98ad1e8a4e522"],[5,3313708316,"2ba80ea34f0324d1"],[4,794801809,"22c9661fbb17301c"],[4,675123534,"acb38fbd722bd4be"],[2,694687,"d1597c51ed6c8992"],[4,992927715,"a78dd4c96d598562"],[3,30502215,"2a993f32f6a6864b"],[6,1118836939,"ff4c46fe12cab434"],[5,2527442094,"38cda3d970a51af4"],[9,247885022,"a985b6a4e21b78fe"],[8,119295410,"ab44df193e070634"],[4,383682629,"090bed75bcd2fb1f"],[4,383886454,"e6b423cb61a8c306"],[3,12382018,"c79bf51a4414893e"],[4,659995090,"613a501fdbec92e5"],[3,31551926,"1316d41953982c97"],[4,384909637,"24262c67c5129490"],[9,4193822908,"b94ce1da2e5fcbf4"],[7,88165283,"8b2ac44114e153e7"],[5,3360841642,"ccf52e98d05e9c38"],[6,732375758,"30aff713b2c0c477"],[5,2367341793,"5ad65513f390de1f"],[4,622578108,"baed0eb89307476d"],[5,3306318744,"e787ea6de1d9491b"],[4,383349696,"a5af57dab67568c1"],[3,12418322,"ea1eb928ff0f8e50"],[3,12401681,"a2ed6d8091e967b0"],[4,701828832,"5ea95198f1c93744"],[3,12410910,"8a3594c5a4946347"],[3,12423534,"cc3e086e92852f44"],[4,383956906,"46641b81640c7782"],[3,12432826,"f5a896030ec47cfb"],[3,12368977,"1ed1ac018445e509"],[3,12392650,"b3af07eaa7da41cc"],[4,824473642,"f8cc18b35242033a"],[4,648245209,"629fed9004d6030d"],[4,384501388,"f6c8ce0aae5f1d95"],[4,385539950,"afa9ff3fca87221c"],[5,3920939900,"80e721375ab14d81"],[4,383902694,"9da1c3a9aa3b4aee"],[6,686759474,"184ea288ac58e664"],[6,407898975,"4e18e0fbdb67a56c"],[3,20086816,"6cf7ee80397bc00c"],[4,1117696360,"c902b699535c8a58"],[6,790364859,"ca87bc149d63160c"],[7,3710925768,"a7211b8b72cf2d0c"]];
const SKIP_DIR = new Set([".git", "node_modules", "dist", "assets", "shots"]);
const TEXT = /\.(js|mjs|cjs|json|md|html|css|txt|ya?ml|csv)$/i;

const roll = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0; return h; };
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const pow31 = (n) => { let p = 1; for (let i = 0; i < n; i++) p = Math.imul(p, 31) >>> 0; return p; };
// 文字列の中に、NG の言葉が入っているか（長さごとに窓を転がす）。見つかったら [位置, 長さ] の一覧
function findNg(text) {
  const out = [];
  const byLen = new Map();
  for (const [len, h, s] of NG) { if (!byLen.has(len)) byLen.set(len, new Map()); byLen.get(len).set(h, s); }
  for (const [len, table] of byLen) {
    if (text.length < len) continue;
    const top = pow31(len - 1);
    let h = roll(text.slice(0, len));
    for (let i = 0; ; i++) {
      if (table.has(h) && table.get(h) === sha(text.slice(i, i + len))) out.push([i, len]);
      if (i + len >= text.length) break;
      h = (Math.imul((h - Math.imul(text.charCodeAt(i), top)) >>> 0, 31) + text.charCodeAt(i + len)) >>> 0;
    }
  }
  return out;
}
function files(dir, list = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) files(p, list);
    else if (TEXT.test(name) && !name.endsWith(".local.json")) list.push(p);
  }
  return list;
}

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C4: " + m); };
  const D = G.data;
  const C4 = D.C4_PEOPLE || {};
  const P = D.C2_PEOPLE || {};
  const ids = Object.keys(C4);

  // ---------------------------------------------------------------- 顔ぶれ
  if (ids.length < 10 || ids.length > 14) F(`人物が 12 人前後でない：${ids.length}`);
  const side = (...s) => ids.filter((id) => s.includes(C4[id].side));
  if (side("仲間").length < 3 || side("仲間").length > 4) F(`仲間になる人が 3〜4 人でない：${side("仲間").length}`);
  if (side("使徒", "眷属").length < 2) F("使徒の側の人が二人いない");
  const sexes = new Set(ids.map((id) => P[id] && P[id].sex));
  if (!sexes.has("男") || !sexes.has("女")) F("男女が混ざっていない");
  if (new Set(ids.map((id) => P[id] && (P[id].beast || P[id].race))).size < 3) F("種族がばらけていない");
  if (new Set(ids.map((id) => P[id] && P[id].nation)).size < 3) F("国がばらけていない");

  // ---------------------------------------------------------------- 一人ずつ
  const portraits = JSON.parse(readFileSync(path.join(ROOT, "docs/art/portraits.json"), "utf8")).portraits;
  const isMale = (p) => /(^|,\s*)(\d*boys?|male|male focus|old man|man|young man)(\s*,|$)/i.test([p.identity, p.tags].join(", "));
  const evs = D.EVENTS.filter((e) => e.id.startsWith("c4_") || e.id === "e3_meet_salphiel" || e.id === "e3_after_salphiel");
  const inEv = (e) => (e.c2 ? (Array.isArray(e.c2) ? e.c2 : [e.c2]) : e.c2talk ? [e.c2talk] : []);
  const outs = (e) => e.choices.flatMap((c) => [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win]).filter(Boolean);
  const flagsSet = new Set(evs.flatMap((e) => outs(e).map((o) => o.flag)).filter(Boolean));
  for (const id of ids) {
    const c = C4[id], p = P[id], w = `${id}`;
    if (!p || !p.c4) { F(`${w}: C2 の人物の表に無いか、c4 の印が無い`); continue; }
    if (!(typeof c.aff0 === "number" && c.aff0 >= -100 && c.aff0 <= 100)) F(`${w}: 好感度の始まりが −100〜+100 でない`);
    if (!(c.mix && c.mix.length >= 2)) F(`${w}: 混ぜた型が二つ未満`);
    if (!c.gap || !c.past) F(`${w}: ギャップか過去が無い`);
    if (!p.who || p.who.seed !== "c2:" + id) F(`${w}: 絵（who）の seed が c2:${id} でない`);
    if (!D.RACES[p.race] || (p.race === "beast") !== !!D.BEASTS[p.beast]) F(`${w}: 種族が変 ${p.race} ${p.beast}`);
    const t = (D.C3_NAMES || {})[id];
    if (!t || !t.name || !t.role) F(`${w}: 名前と役職の札（D.C3_NAMES）が無い`);
    else if (t.alias && !(t.reveal && flagsSet.has(t.reveal))) F(`${w}: 呼び名のある人なのに、名乗る出来事（${t.reveal}）が無い`);
    const q = (D.F2_PEOPLE || {})[id];
    if (!q || !q.title || q.face !== undefined || !q.lines || q.lines.length !== 2) F(`${w}: 人物図鑑の説明（title・二行。人柄は文に溶かす）が無い`);
    const pt = portraits.find((x) => x.id === id);
    if (!pt) F(`${w}: 立ち絵の一覧（portraits.json）に無い`);
    else {
      if (pt.group !== "c2" || !pt.identity || !pt.tags || !pt.memo) F(`${w}: 立ち絵の group・identity・tags・memo のどれかが無い`);
      if (isMale(pt) !== (p.sex === "男")) F(`${w}: 立ち絵の性別がデータと違う`);
      if (isMale(pt) && !pt.type) F(`${w}: 男なのに型（type）が無い`);
      if (p.join && !(pt.variants && pt.variants.joy && pt.variants.anger && pt.variants.sorrow && pt.variants.fun)) F(`${w}: 仲間なのに表情の差分が無い`);
    }
    const own = evs.filter((e) => !e.c2talk && inEv(e).includes(id));
    if (own.length < 2 || own.length > 4) F(`${w}: 出てくる出来事が 2〜4 個でない：${own.length}`);
    if (!own.some((e) => e.w > 0 && e.id.startsWith("c4_"))) F(`${w}: ふつうに起きる出会いの出来事が無い`);
    if (p.join) {
      if (evs.filter((e) => e.c2talk === id).length < 2) F(`${w}: その人だけの話が二つ未満`);
      if (!own.some((e) => outs(e).some((o) => o.c2join === id || (Array.isArray(o.c2join) && o.c2join.includes(id))))) F(`${w}: 仲間に加わる出来事が無い`);
      const v = D.C2_VOICE[id];
      if (!v || v.talk.length < 3 || !v.betray || !v.die) F(`${w}: ひとことが足りない`);
      if (!p.join.noLove) for (const k of ["spark", "confess", "propose", "part", "cold"]) if (!v || !v[k]) F(`${w}: 恋のひとこと ${k} が無い`);
      if (!(D.C2_INVITE[id] || []).length) F(`${w}: 誘ったときの一言が無い`);
      if (!D.M2_TRAITS[p.join.trait]) F(`${w}: 性格 ${p.join.trait} が M2 に無い`);
      for (const k of Object.keys(D.M2_LIFE)) if (!p.join.life[k]) F(`${w}: 暮らし ${k} が無い`);
      for (const l of p.join.home) if (!D.LOCS[l] || D.LOCS[l].type !== "town") F(`${w}: 誘える町 ${l} が町でない`);
    }
    for (const l of c.meet || []) if (!D.LOCS[l] && !TAGS.has(l)) F(`${w}: 会える場所 ${l} が無い`);
  }

  // ---------------------------------------------------------------- 出来事の整い
  const evIds = new Set(D.EVENTS.map((e) => e.id));
  for (const e of evs) {
    for (const x of e.where) if (!TAGS.has(x) && !D.LOCS[x]) F(`出来事 ${e.id}: 場所 ${x} が無い`);
    for (const id of inEv(e)) if (!P[id]) F(`出来事 ${e.id}: 人物 ${id} が表に無い`);
    for (const o of outs(e)) {
      if (o.next && !evIds.has(o.next)) F(`出来事 ${e.id}: 続き ${o.next} が無い`);
      for (const id of Object.keys(o.aff || {})) if (!P[id]) F(`出来事 ${e.id}: 好感度の人 ${id} が表に無い`);
      for (const id of [].concat(o.c2join || [])) if (!P[id] || !P[id].join) F(`出来事 ${e.id}: 仲間にできない ${id}`);
      if (o.c4forget && !C4[o.c4forget]) F(`出来事 ${e.id}: 忘れる人 ${o.c4forget} が無い`);
      if (o.item && !D.ITEMS[o.item]) F(`出来事 ${e.id}: アイテム ${o.item} が無い`);
    }
  }

  // ---------------------------------------------------------------- 見せる文
  const texts = [];
  const addO = (o) => { if (!o) return; for (const k of ["text", "memo", "chron"]) if (o[k]) texts.push(o[k]); addO(o.win); };
  for (const e of evs) { texts.push(e.title, e.text); for (const c of e.choices) { texts.push(c.label); addO(c.ok); addO(c.ng); addO({ win: c.win }); } }
  for (const id of ids) {
    const v = D.C2_VOICE[id];
    if (v) texts.push(...Object.values(v).flat());
    texts.push(...(D.C2_INVITE[id] || []));
    const q = (D.F2_PEOPLE || {})[id];
    if (q) texts.push(q.title, ...q.lines);
    if (P[id] && P[id].join) texts.push(P[id].join.desc, ...Object.values(P[id].join.life));
  }
  const mus = D.ENEMIES.c4_musette;
  if (!mus) F("眷属の人形（c4_musette）の戦闘データが無い");
  else texts.push(mus.name, mus.desc, ...Object.values(mus.lines).flat());
  for (const [id, e] of Object.entries(D.LORE)) if (id.startsWith("c4_")) e.lines.forEach(([, t]) => texts.push(t));
  for (const t of texts) if (typeof t !== "string" || BANNED.test(t)) F(`見せる文に書かない言葉か、文でないものがある「${String(t).slice(0, 40)}」`);
  for (const t of texts) if (typeof t === "string" && /。[^「」]*！/.test(t.replace(/「[^」]*」/g, ""))) F(`地の文が叫んでいる「${t.slice(0, 40)}」`);
  // 使徒の名は、使徒自身が名乗る出来事の中だけ
  for (const e of evs) if (e.id !== "c4_sal_name") for (const t of [e.text, ...outs(e).map((o) => o.text)]) if (t && /サルフィエル/.test(t)) F(`使徒の名が、名乗る前の文にある（${e.id}）`);

  // ---------------------------------------------------------------- 作品名・キャラ名がリポジトリに無い
  {
    // 転がしハッシュが、そのまま計算したものと合うか（探し方そのものの確かめ）
    const sample = "あいうえおかきくけこサシスセソabcXYZ漢字の並び";
    const L = 5, top = pow31(L - 1);
    let h = roll(sample.slice(0, L));
    for (let i = 0; i + L < sample.length; i++) {
      h = (Math.imul((h - Math.imul(sample.charCodeAt(i), top)) >>> 0, 31) + sample.charCodeAt(i + L)) >>> 0;
      if (h !== roll(sample.slice(i + 1, i + 1 + L))) { F("転がしハッシュの計算が合わない"); break; }
    }
    let scanned = 0;
    for (const f of files(ROOT)) {
      const text = readFileSync(f, "utf8").toLowerCase();
      scanned++;
      const hits = findNg(text);
      if (hits.length) F(`${path.relative(ROOT, f)} に、持ち主の表の作品名かキャラ名が入っている（${hits.length} か所。${hits.slice(0, 3).map(([i]) => i + " 文字目").join("・")}）`);
    }
    if (scanned < 100) F(`調べたファイルが少なすぎる：${scanned}`);
  }

  // ---------------------------------------------------------------- 使徒の側（E3）
  const E3 = D.E3 || { LIST: {} };
  const sal = E3.LIST.salphiel;
  if (!sal || sal.no !== 33 || sal.rank !== "A" || sal.calm !== "友好") F("薄布の娘が E3 の表（刻印の環の三十三・A 級・友好）に無い");
  if (!evIds.has("e3_meet_salphiel") || !evIds.has("e3_after_salphiel")) F("薄布の娘に会う出来事か、倒したあとの出来事が無い");
  if (!(E3.LIST.mirza && E3.LIST.mirza.keys.some((k) => k.id === "c4_musette"))) F("眷属の糸を断つことが、微笑の使徒の条件に無い");
  for (const it of ["c4_wrongash", "c4_cutstring", "e3_d_salphiel"]) if (!D.ITEMS[it] || !D.ITEMS[it].flavor) F(`アイテム ${it} が無いか、説明（flavor）が無い`);
  if (!(D.BOSS_LINES && D.BOSS_LINES.c4_musette)) F("眷属の人形の前口上が無い");

  // ---------------------------------------------------------------- 決まった流れ
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  let g = null;
  const start = (loc) => {
    g = loadEngine();
    g.data.C14.off = true; // C14 の段（上限・結婚の段）は tests/checks/c14_stages.mjs で確かめる。ここは仕組みだけ
    g.rand = seeded(77);
    g.P = { trophies: {}, graves: [] };
    g.newGame({ cls: "merc", stats, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
    g.S.maxHp = g.S.hp = 999;
    g.S.gold = 500;
    g.S.day = 10; // 名のある人は旅に出て何日かたってから現れる
    if (loc) { g.S.loc = loc; g.S.visited[loc] = true; }
    return g.S;
  };
  const lucky = (f) => { const r = g.rand; g.rand = () => 0.01; try { return f(); } finally { g.rand = r; } };
  const begin = (ev) => {
    const e = g.data.EVENTS.find((x) => x.id === ev);
    if (!e) { F(`出来事 ${ev} が無い`); return false; }
    if (e.cond && !e.cond(g.S)) { F(`出来事 ${ev} の条件が、流れの中で満たされない`); return false; }
    g.startEvent(ev);
    return g.S.mode === "event";
  };
  const choose = (part) => {
    const S = g.S;
    if (S.mode !== "event") { F(`「${part}」を選ぶときに出来事の中にいない（${S.mode} ${S.event}）`); return; }
    const c = g.eventChoices().find(({ c }) => g.m2Fill(c.label).includes(part));
    if (!c) { F(`出来事 ${S.event} に「${part}」が無い`); return; }
    lucky(() => g.act("ev:" + c.i));
    for (let i = 0; i < 30 && S.mode === "combat"; i++) { S.combat.foes.forEach((f) => { if (f.hp > 0) f.hp = 1; }); lucky(() => g.act("cb:attack")); }
  };
  const FLOWS = {
    bertrand: ["karna", "c4_bert_paint", ["動かずに", "様子を見る", "連れていく"]],
    ilse: ["nerva", "c4_ilse_plan", ["策の穴", "連れていく"]],
    tula: ["frost", "c4_tula_cart", ["後ろから押す", "長屋まで", "連れていく"]],
    mirlene: ["zephara", "c4_mir_bottle", ["中身を確かめる", "連れていく"]],
  };
  for (const [id, [loc, ev, steps]] of Object.entries(FLOWS)) {
    start(loc);
    if (!begin(ev)) continue;
    steps.forEach(choose);
    const c = g.c2In(id, g.S);
    if (!c) { F(`${id} が出会いの流れで仲間にならない`); continue; }
    if (c.trait !== P[id].join.trait || c.sex !== P[id].sex || c.who.seed !== "c2:" + id) F(`${id} の仲間の欄が表のままでない`);
    if (!(typeof (g.S.aff || {})[id] === "number" && g.S.aff[id] >= C4[id].aff0)) F(`${id} の好感度が始まりから入っていない：${JSON.stringify(g.S.aff)}`);
  }
  // 好感度の始まり（F3 の初対面の値）・F3 の増減と二重にならない・忘れる
  start("fort");
  if (!g.affAdd || !g.affMeet) F("F3 の好感度（G.affAdd・G.affMeet）が無い");
  g.c2Meet("gerhard");
  if (g.S.aff.gerhard !== C4.gerhard.aff0) F(`会ったときの好感度が始まりの数でない：${g.S.aff.gerhard}`);
  g.c2Meet("gerhard");
  g.affMeet("gerhard");
  if (g.S.aff.gerhard !== C4.gerhard.aff0) F(`二度目に会うと好感度が始まりに戻るか動く：${g.S.aff.gerhard}`);
  g.apply({ aff: { gerhard: 10 } });
  if (g.S.aff.gerhard !== C4.gerhard.aff0 + 10) F(`結果の aff が一度だけ足されない（二重か、足されない）：${g.S.aff.gerhard}`);
  start("fort");
  g.affAdd("bartolo", -5, true); // 初めての増減（会う前）も、始まりの数から
  if (g.S.aff.bartolo !== C4.bartolo.aff0 - 5) F(`会う前の増減が始まりの数から数えられない：${g.S.aff.bartolo}`);
  if (begin("c4_ger_chest")) choose("賭けに乗る");
  if (g.S.aff.gerhard !== C4.gerhard.aff0 + 20) F(`出来事で会って aff を受けた好感度が 始まり＋20 でない：${g.S.aff.gerhard}`);
  g.apply({ c4forget: "gerhard" });
  if (g.S.aff.gerhard !== 0) F("c4forget で好感度が 0 に戻らない");
  // 黒鉄の砦の砦主：宝箱 → 囮の村 → 夜の取引 → 知らない顔
  start("fort");
  if (begin("c4_ger_chest")) choose("賭けに乗る");
  g.S.day += 7;
  if (begin("c4_ger_bait")) choose("手を貸す");
  g.S.day += 21;
  if (begin("c4_ger_deal")) choose("見届ける");
  g.S.day += 60;
  if (begin("c4_ger_after")) choose("一緒に開ける");
  if (!g.S.flags.c4_ger_deal || g.S.aff.gerhard !== 0) F("黒鉄の砦主が、最後にこちらを忘れない");
  // 薄布の娘：出会い → 告げられた先に逆らう → 名乗る → 条件の灰
  start("w2_amyrein");
  if (begin("c4_sal_lake")) choose("先を見て");
  g.S.day += 6;
  if (begin("c4_sal_omen")) choose("わざと橋を渡る");
  if (!g.S.inv.c4_wrongash || !g.S.flags.c4_sal_defy) F("告げられた先に逆らっても、外れた先の灰が手に入らない");
  if (begin("c4_sal_name")) choose("名を聞く");
  if (!g.S.flags.c4_sal_name) F("薄布の娘が名乗らない");
  if (!g.e3Keys("salphiel").some((k) => k.id === "ash" && k.met)) F("外れた先の灰が、薄布の使徒の条件にならない");
  // 眷属：人形芝居 → ベルトランと一緒に糸を断つ → 微笑の使徒の条件
  start("karna");
  g.S.day = 20;
  if (begin("c4_mus_show")) choose("見物して");
  g.c2Join("bertrand");
  g.S.loc = "wasteland";
  if (begin("c4_mus_bert")) choose("糸だけを断つ");
  if (!g.S.inv.c4_cutstring) F("眷属の糸を断っても、切れた糸の束が手に入らない");
  if (!g.e3Keys("mirza").some((k) => k.id === "c4_musette" && k.met)) F("切れた糸の束が、微笑の使徒の条件にならない");

  if (!n) ok(`C4：作った人物 ${ids.length} 人（仲間 ${side("仲間").length}・使徒の側 ${side("使徒", "眷属").length}）・出来事 ${evs.length}・名前の札と図鑑と立ち絵・作品名とキャラ名がリポジトリに無い`);
};
