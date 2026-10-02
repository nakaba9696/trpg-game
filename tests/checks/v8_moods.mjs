// V8：立ち絵の喜怒哀楽（src/engine/v8_moods.js・src/ui/v8_moods.js・v5_stand.js・docs/art/portraits.json の face と variants・tools/gen_portraits.mjs --variants）
// - variants の id が人物（キャラメモの人か、出来事の名のある人）に当たり、喜怒哀楽の 4 つがそろっている。表情のタグに性的・構図の言葉が無い
// - 出来事・結果の mood の値が 4 種（と "normal"）のどれか
// - 出来事が始まると表情が決まり（データの mood ＞ 文から推す ＞ 続いた結果の mood）、終わると通常に戻る。古いセーブ（S.mood 無し）でも動く
// - 差分の絵が無ければ通常の絵、あれば差分。立ち絵の印は表情で変わらない（人は出入りせず、顔だけ入れ替わる）
import { readFileSync, readdirSync, existsSync } from "node:fs";
import vm from "node:vm";
import { JSON_PATH, MOODS as MD_MOODS } from "../../tools/portraits.mjs";

export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const F = (m) => fail("V8：" + m);
  const MOODS = G.MOODS;
  if (!Array.isArray(MOODS) || MOODS.join() !== "joy,anger,sorrow,fun") return F(`G.MOODS が joy・anger・sorrow・fun でない：${MOODS}`);
  if (MD_MOODS.join() !== MOODS.join()) F("tools/portraits.mjs の MOODS がエンジンの G.MOODS と違う");
  if (!G.guessMood || !G.moodOf || !G.eventMood) return F("G.guessMood・G.moodOf・G.eventMood が無い");

  // ---------------------------------------------------------------- 一覧の face と variants
  const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const list = data.portraits || [];
  const BAD = /masterpiece|best quality|anime|illustration|realistic|portrait|upper body|looking at viewer|nsfw|nude|naked|breast|cleavage|navel|thigh|sexy|lingerie|underwear|panties|loli|seductive|lewd/i;
  const vids = [];
  for (const p of list) {
    if (p.face !== undefined && (typeof p.face !== "string" || !p.face.trim())) F(`一覧の ${p.id} の face が空`);
    if (p.face && BAD.test(p.face)) F(`一覧の ${p.id} の表情に、構図・性的な言葉がある：${p.face.match(BAD)[0]}`);
    if (!p.variants) continue;
    vids.push(p.id);
    if (p.group !== "c2" && p.group !== "named") F(`差分（variants）があるのは名のある人物だけ：${p.id}（${p.group}）`);
    else if (p.group === "c2" ? !D.C2_PEOPLE[p.id] : !(G.V4_NAMED || {})[p.id] && !D.C2_PEOPLE[p.id]) F(`差分の ${p.id} が人物に当たらない`);
    if (!p.face) F(`差分のある ${p.id} に基本の表情（face）が無い（差分は face を差し替えて作る）`);
    const keys = Object.keys(p.variants);
    const extra = keys.filter((k) => !MOODS.includes(k));
    if (extra.length) F(`${p.id} の variants に喜怒哀楽でない鍵：${extra.join("、")}`);
    for (const m of MOODS) {
      const t = p.variants[m];
      if (typeof t !== "string" || !t.trim()) F(`${p.id} の variants.${m} が無い`);
      else if (BAD.test(t)) F(`${p.id} の variants.${m} に、構図・性的な言葉がある：${t.match(BAD)[0]}`);
    }
  }
  if (vids.length < 8 || vids.length > 20) F(`差分のある人が ${vids.length} 人（仲間（キャラメモ 8 人と C4 の 4 人）＋主要な数人、20 人まで）`);
  for (const id of Object.keys(D.C2_PEOPLE)) if (D.C2_PEOPLE[id].join && !vids.includes(id)) F(`仲間になる ${id} に差分（variants）が無い`);

  // assets/ に置いた差分の絵は、variants のある人のもの
  const dir = new URL("../../assets/portraits/", import.meta.url);
  if (existsSync(dir)) {
    const re = new RegExp(`^(.+)_(${MOODS.join("|")})\\.(webp|png|jpe?g)$`);
    for (const f of readdirSync(dir)) {
      const m = re.exec(f);
      if (m && !vids.includes(m[1])) F(`assets/portraits/${f} は差分の絵だが、一覧の ${m[1]} に variants が無い`);
    }
  }
  // 大きさ：既定は画像を外のファイルにする形（tools/build.mjs）なので、差分の数は埋め込みの上限に縛られない。
  // 予備の埋め込み（--embed）は上限を超えると差分を省く（tools/assets.mjs の shrink）。外のファイルの大きさは a6_site.mjs が見る

  // ---------------------------------------------------------------- 出来事の mood
  const okMood = (m) => m === undefined || MOODS.includes(m);
  let marked = 0;
  for (const e of D.EVENTS) {
    if (e.mood !== undefined && e.mood !== "normal" && !MOODS.includes(e.mood)) F(`出来事 ${e.id} の mood が 4 種のどれでもない：${e.mood}`);
    if (MOODS.includes(e.mood)) marked++;
    (e.choices || []).forEach((c, i) => ["ok", "ng", "win"].forEach((k) => {
      const o = c[k];
      if (o && !okMood(o.mood)) F(`出来事 ${e.id} の選択肢 ${i} の ${k} の mood が 4 種のどれでもない：${o.mood}`);
      if (o && o.win && !okMood(o.win.mood)) F(`出来事 ${e.id} の選択肢 ${i} の ${k}.win の mood が 4 種のどれでもない：${o.win.mood}`);
    }));
  }
  if (marked < 10) F(`mood を付けた出来事が ${marked} しかない（主要な場面から付ける）`);

  // 文から推す
  const g = G.guessMood;
  if (g("娘は声を上げて泣いた") !== "sorrow") F("「泣いた」を哀と推せない");
  if (g("涙を拭いて、笑った") !== "sorrow") F("泣いていれば、笑っていても哀にする");
  if (g("「何してんねん！」と怒鳴った") !== "anger") F("「怒鳴った」を怒と推せない");
  if (g("男は腹を抱えて笑った") !== "fun") F("「腹を抱えて」を楽と推せない");
  if (g("娘はにっこり笑った") !== "joy") F("「にっこり」を喜と推せない");
  if (g("風が吹いている") !== null || g("") !== null || g(undefined) !== null) F("何も無い文を通常にしない");
  if (g("泣かないで、と言った") === "sorrow") F("「泣かない」を哀と推している");
  if (G.eventMood({ mood: "normal", text: "泣いた" }) !== null) F("mood: \"normal\" なのに推している");
  if (G.eventMood({ mood: "fun", text: "泣いた" }) !== "fun") F("データの mood より推しを先にしている");
  if (G.eventMood({ text: "道が続く" }, "joy") !== "joy") F("続いた結果の mood を持ち越さない");
  if (G.eventMood({ text: "泣いた" }, "joy") !== "sorrow") F("文から推せるのに、結果の mood を先にしている");

  // ---------------------------------------------------------------- 流れ（始まる・続く・終わる・古いセーブ）
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  G.rand = seeded(8);
  G.P = { trophies: {}, graves: [] };
  G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口" } });
  const S = G.S;
  S.maxHp = S.hp = 999; S.gold = 500;
  if (G.moodOf(S) !== null) F("冒険の始めから表情がある");
  delete S.mood; // 古いセーブ
  if (G.moodOf(S) !== null) F("古いセーブ（S.mood 無し）で表情が通常にならない");
  if (G.moodOf({ mode: "event", event: "x", mood: "angry" }) !== null) F("4 種でない表情を出している");
  if (G.moodOf({ mode: "event", event: "x", mood: "joy", combat: {} }) !== null) F("戦闘中に表情を出している");
  if (G.moodOf({ mode: "explore", event: null, mood: "joy" }) !== null) F("出来事でないのに表情を出している");

  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  if (!ev("c2_nora_sniff") || ev("c2_nora_sniff").mood !== "sorrow") F("確かめに使う出来事 c2_nora_sniff（哀）が無い");
  else {
    G.startEvent("c2_nora_sniff");
    if (S.mood !== "sorrow" || G.moodOf(S) !== "sorrow") F(`出来事のデータの mood が場面の表情にならない（${S.mood}）`);
    const i = ev("c2_nora_sniff").choices.findIndex((c) => !c.stat && !c.fight && !c.next && c.ok && !c.ok.next);
    if (i >= 0) {
      G.chooseEvent(i);
      if (S.mode === "event") F("結果で終わる選択肢なのに出来事が続いている");
      else if (S.mood !== null || G.moodOf(S) !== null) F("出来事が終わっても表情が残っている");
    }
  }
  // 結果の mood を、続く出来事に持ち越す（続く出来事に mood が無く、文からも推せないとき）
  const plain = D.EVENTS.find((e) => e.mood === undefined && !G.guessMood(e.text) && !e.m2 && !e.cond && e.choices && e.choices.length);
  if (plain) {
    S.mode = "explore"; S.event = null;
    G.apply({ text: "続く。", mood: "fun", next: plain.id });
    if (S.event === plain.id && S.mood !== "fun") F(`結果の mood が続く出来事（${plain.id}）に持ち越されない（${S.mood}）`);
    S.mode = "explore"; S.event = null;
    G.startEvent(plain.id);
    if (S.mood !== null) F(`結果から続いていない出来事（${plain.id}）に、前の結果の表情が残る`);
  }

  // 金が足りずに選べないときは、その場の表情のまま
  const costly = D.EVENTS.find((e) => MOODS.includes(e.mood) && e.choices.some((c) => c.cost));
  if (costly) {
    S.mode = "explore"; S.event = null; S.gold = 0;
    G.startEvent(costly.id);
    G.chooseEvent(costly.choices.findIndex((c) => c.cost));
    if (S.event === costly.id && S.mood !== costly.mood) F("金が足りずに選べなかったのに、表情が通常に戻った");
  }

  // ---------------------------------------------------------------- 画面：差分の絵を選ぶ
  const vmc = vm.createContext({ console, G, Image: class { addEventListener() {} } });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v5_stand.js", "v8_moods.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  const st = G.stand;
  if (!G.v8MoodKey || !G.v8WithMood || !st) return F("G.v8MoodKey・G.v8WithMood が無い");
  G.ASSETS = { "portraits/nora": "data:image/webp;base64,AA==", "portraits/nora_sorrow": "data:image/webp;base64,AA==" };
  const nora = st.whoOf({ mode: "event", event: "c2_nora_sniff", flags: {} });
  if (!nora) return F("出来事 c2_nora_sniff の人が拾えない");
  if (G.v4PortraitKey(nora) !== "nora") F("表情の無いときに通常の絵にならない");
  const sadS = { mode: "event", event: "c2_nora_sniff", mood: "sorrow", flags: {} };
  const sad = G.v8WithMood(nora, sadS);
  if (G.v4PortraitKey(sad) !== "nora_sorrow") F("差分の絵があるのに、その表情の絵にならない");
  const glad = G.v8WithMood(nora, { mode: "event", event: "c2_nora_sniff", mood: "joy", flags: {} });
  if (G.v4PortraitKey(glad) !== "nora") F("差分の絵が無い表情で、通常の絵に戻らない");
  if (G.v8WithMood(nora, { mode: "event", event: "c2_nora_sniff", flags: {} }) !== nora) F("古いセーブ（S.mood 無し）で who を変えている");
  if (st.sig(nora) !== st.sig(st.whoOf({ mode: "event", event: "c2_nora", flags: {} }))) F("同じ人の印が変わる");
  if (!st.big(sad)) F("表情のある人を大きく立たせない");
  if (G.v8MoodKey("nora", "angry") !== "nora" || G.v8MoodKey(null, "joy") !== null) F("4 種でない表情・鍵の無い人を差分にしている");
  // 立ち絵の顔（canvas.standFace）だけ、その場の表情で描く。小さな額などは今のまま
  const saveS = G.S;
  G.S = sadS;
  const cvOf = (cls) => ({ classList: { contains: (c) => c === cls }, dataset: {}, width: 0, height: 0, getBoundingClientRect: () => ({ width: 0, height: 0 }), getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) });
  const standCv = cvOf("standFace"), smallCv = cvOf("whoFace");
  try { G.drawPortrait(standCv, nora); G.drawPortrait(smallCv, nora); } catch (e) { F("立ち絵の顔を描くところで止まる：" + e.message); }
  if (standCv.dataset.v8key !== "nora_sorrow") F(`立ち絵の顔が、その場の表情の絵にならない（${standCv.dataset.v8key}）`);
  if (smallCv.dataset.v8key !== undefined) F("立ち絵でない額にまで表情を付けている");
  G.S = saveS;
  G.ASSETS = {};
  if (G.v4PortraitKey(sad) !== null) F("画像が無いのに差分の鍵を返す");
  // 画面の配置（V9）とぶつからないよう、V5 のファイルと style.css には手を入れず、包むだけ
  const v5 = readFileSync(new URL("../../src/ui/v5_stand.js", import.meta.url), "utf8");
  if (/v8|mood/i.test(v5)) F("v5_stand.js に V8 の表情が書かれている（src/ui/v8_moods.js で包む）");

  // 生成：--variants の説明
  const gen = readFileSync(new URL("../../tools/gen_portraits.mjs", import.meta.url), "utf8");
  if (!/--variants/.test(gen) || !/sdapi\/v1\/img2img/.test(gen)) F("tools/gen_portraits.mjs に --variants（img2img）が無い");
  const readme = readFileSync(new URL("../../docs/art/README.md", import.meta.url), "utf8");
  if (!/--variants/.test(readme)) F("docs/art/README.md に差分の作り方が無い");

  ok(`V8：喜怒哀楽の差分（${vids.length} 人・mood を付けた出来事 ${marked}）`);
};
