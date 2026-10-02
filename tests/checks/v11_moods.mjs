// V11：表情の種類を喜怒哀楽の外へ（docs/art/moods.json・src/data/v11_moods.js・src/engine/v8_moods_v11.js・src/ui/v8_moods_v11.js・tools/gen_portraits.mjs --mood）
// - 表情の一覧が、docs/art/moods.json・エンジン（G.MOODS・D.MOOD_TABLE）・tools/portraits.mjs で同じ並び・同じ落とし先。落とし先は一覧にあり、自分を指さない
// - 人ごとの variants の鍵がすべて一覧にある。主要な人（仲間になる人・キャラメモの人・使徒の人の姿）に、喜怒哀楽＋その人らしい表情 3〜5 個
// - タグは特徴だけ（作家名・画風・構図・性的な語なし）。md が json と合っている
// - 出来事の表（D.EVENT_MOODS）・会話の表（D.TALK_MOODS）の id と表情が実在する。文から推す（泣き崩れ→泣き、頬を染め→照れ）。古い表情・古いセーブでも動く
// - 画面：絵の無い表情は落とし先、それも無ければ基本の絵
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { JSON_PATH, MOODS as MD_MOODS, MOOD_DATA, MOODS_MD_PATH, renderMoodsMd } from "../../tools/portraits.mjs";

export default ({ fail, ok, loadEngine }) => {
  const F = (m) => fail("V11：" + m);
  const G = loadEngine();
  const D = G.data;
  const T = D.MOOD_TABLE || {};
  const BASE = ["joy", "anger", "sorrow", "fun"];

  // ---------------------------------------------------------------- 一覧がそろっている
  const keys = Object.keys(MOOD_DATA.moods);
  if (keys.join() !== Object.keys(T).join()) F(`docs/art/moods.json と src/data/v11_moods.js の表情の並びが違う：${keys.join()} / ${Object.keys(T).join()}`);
  if (G.MOODS.join() !== keys.join()) F(`G.MOODS が表情の一覧と違う：${G.MOODS.join()}`);
  if (MD_MOODS.join() !== keys.join()) F("tools/portraits.mjs の MOODS が moods.json と違う");
  if (MOOD_DATA.base.join() !== BASE.join() || keys.slice(0, 4).join() !== BASE.join()) F("喜怒哀楽が一覧の先頭に無い");
  if (keys.length < 12) F(`表情の種類が少ない：${keys.length}`);
  for (const need of ["surprise", "shy", "troubled", "serious", "smug", "fear", "tired", "cry"]) if (!keys.includes(need)) F(`表情 ${need} が一覧に無い`);
  for (const m of keys) {
    const j = MOOD_DATA.moods[m], t = T[m] || {};
    if (!j.name || j.name !== t.name) F(`${m} の名前が moods.json とエンジンで違う`);
    if (!j.tags || !String(j.tags).trim()) F(`${m} に既定のタグが無い`);
    if ((j.fallback || []).join() !== (t.fallback || []).join()) F(`${m} の落とし先が moods.json とエンジンで違う`);
    for (const f of t.fallback || []) if (!keys.includes(f) || f === m) F(`${m} の落とし先 ${f} が一覧に無いか、自分を指している`);
    if (BASE.includes(m) && (t.fallback || []).length) F(`喜怒哀楽（${m}）に落とし先がある（基本の絵に戻る）`);
    if (G.moodChain(m)[0] !== m) F(`G.moodChain(${m}) が自分から始まらない`);
  }
  if (G.moodChain("angry").length || G.moodChain(undefined).length) F("一覧に無い表情に落とし先がある");
  if (G.MOOD_NAMES.shy !== "照れ") F("G.MOOD_NAMES に V11 の表情の名前が無い");

  // ---------------------------------------------------------------- タグは特徴だけ
  const style = (f) => JSON.parse(readFileSync(new URL("../../docs/art/" + f, import.meta.url), "utf8"));
  const ART = new Set([style("style.json").prefix, style("style_male.json").prefix].join(",").split(",").map((t) => t.replace(/[()]/g, "").replace(/:[\d.]+$/, "").trim().toLowerCase()).filter(Boolean));
  const BAD = /masterpiece|best quality|anime|illustration|realistic|portrait|upper body|looking at viewer|nsfw|nude|naked|breast|cleavage|navel|thigh|sexy|lingerie|underwear|panties|loli|seductive|lewd|artist:|\bby\b|style of|in the style/i;
  const checkTags = (where, s) => {
    if (BAD.test(s)) F(`${where} に、画風・構図・作家名・性的な語がある：${s.match(BAD)[0]}`);
    for (const t of String(s).split(",").map((x) => x.trim().toLowerCase())) if (ART.has(t)) F(`${where} に、絵柄の設定（作家名・品質）の語がある：${t}`);
  };
  for (const m of keys) checkTags(`moods.json の ${m}`, MOOD_DATA.moods[m].tags);

  // ---------------------------------------------------------------- 主要な人の割り当て
  const list = JSON.parse(readFileSync(JSON_PATH, "utf8")).portraits || [];
  const byId = Object.fromEntries(list.map((p) => [p.id, p]));
  const APOSTLES = ["mirza", "zalve", "aurelia", "yoihime", "mordu", "azlag", "chezar", "yura"];
  const main = [...new Set([...Object.keys(D.C2_PEOPLE), ...APOSTLES])];
  let extras = 0;
  for (const id of main) {
    const p = byId[id];
    if (!p) { F(`主要な人 ${id} が絵の一覧に無い`); continue; }
    if (!p.variants) { F(`主要な人 ${id}（${p.name}）に差分（variants）が無い`); continue; }
    const vk = Object.keys(p.variants);
    for (const m of BASE) if (!p.variants[m]) F(`${id} に喜怒哀楽の ${m} が無い`);
    const ex = vk.filter((m) => !BASE.includes(m));
    if (ex.length < 3 || ex.length > 5) F(`${id}（${p.name}）のその人らしい表情が ${ex.length} 個（3〜5 個）`);
    extras += ex.length;
    if (!p.face) F(`${id} に基本の表情（face）が無い`);
    if (APOSTLES.includes(id) && !p.identity) F(`使徒 ${id} に見た目（identity）が無い（差分で別人にならないよう分ける）`);
  }
  for (const p of list) for (const [m, t] of Object.entries(p.variants || {})) {
    if (!keys.includes(m)) F(`${p.id} の variants の ${m} が表情の一覧に無い`);
    checkTags(`${p.id} の variants.${m}`, t);
  }
  // 全員に一つずつは無くてよいが、一覧の V11 の表情は誰かが持つ（持つ人のいない表情は作られない）
  for (const m of keys.slice(4)) if (!list.some((p) => p.variants && p.variants[m])) F(`表情 ${m} を持つ人がいない`);

  // md が json と合っている
  const md = readFileSync(MOODS_MD_PATH, "utf8");
  if (md !== renderMoodsMd(MOOD_DATA, { portraits: list })) F("docs/art/moods.md が json と合っていない（node tools/portraits.mjs で作り直す）");

  // ---------------------------------------------------------------- 出来事
  const evs = Object.fromEntries(D.EVENTS.map((e) => [e.id, e]));
  const table = D.EVENT_MOODS || {};
  for (const [id, m] of Object.entries(table)) {
    if (!evs[id]) F(`D.EVENT_MOODS の出来事 ${id} が無い`);
    if (!G.isMood(m)) F(`D.EVENT_MOODS の ${id} の表情 ${m} が一覧に無い`);
    else if (evs[id] && evs[id].mood === undefined && G.eventMood(evs[id]) !== m) F(`D.EVENT_MOODS の ${id} が出来事の表情にならない`);
  }
  const used = new Set(Object.values(table));
  for (const e of D.EVENTS) { if (G.isMood(e.mood)) used.add(e.mood); }
  // 会話（K1）の話題・掛け合いの表
  const talk = {};
  for (const t of Object.values(D.TALK || {})) for (const x of t.topics || []) talk[x.id] = x;
  for (const b of D.TALK_BANTER || []) talk[b.id] = b;
  const TM = D.TALK_MOODS || {};
  for (const [id, m] of Object.entries(TM)) {
    if (!talk[id]) F(`D.TALK_MOODS の話題・掛け合い ${id} が無い`);
    else if (!G.isMood(m)) F(`D.TALK_MOODS の ${id} の表情 ${m} が一覧に無い`);
    else if (talk[id].mood !== m) F(`D.TALK_MOODS の ${id} が話題の表情にならない（${talk[id].mood}）`);
    if (G.isMood(m)) used.add(m);
  }
  for (const [id, x] of Object.entries(talk)) if (x.mood !== undefined && !G.isMood(x.mood)) F(`会話 ${id} の mood が表情の一覧に無い：${x.mood}`);
  if (D.TALK && Object.keys(TM).length < 15) F(`会話に付けた V11 の表情が少ない：${Object.keys(TM).length}`);
  const v11used = [...used].filter((m) => !BASE.includes(m));
  if (v11used.length < 8) F(`V11 の表情を付けた出来事・会話が少ない：${v11used.join("・")}`);
  if (G.eventMood({ id: "c2_natalia", mood: "joy" }) !== "joy") F("出来事のデータの mood より表を先にしている");
  const g = G.guessMood;
  if (g("娘は泣き崩れた") !== "cry") F("「泣き崩れた」を泣きと推せない");
  if (g("娘は声を上げて泣いた") !== "sorrow") F("ふつうに泣くのを哀にしない");
  if (g("頬を染めて笑った") !== "shy") F("「頬を染め」を照れと推せない（笑っていても照れ）");
  if (g("男は目を丸くした") !== "surprise") F("「目を丸く」を驚きと推せない");
  if (g("驚いて、にっこり笑った") !== "joy") F("笑っていれば、驚きより喜にする");
  if (g("顔が青ざめ、怯えた") !== "fear") F("「怯え」を怯えと推せない");
  if (g("胸を張った") !== "smug") F("「胸を張った」を得意げと推せない");

  // 古いセーブ・知らない表情
  if (G.moodOf({ mode: "event", event: "x", mood: "shy" }) !== "shy") F("V11 の表情を場面の表情にしない");
  if (G.moodOf({ mode: "event", event: "x", mood: "blush" }) !== null) F("一覧に無い表情を出している");
  if (G.moodOf({ mode: "event", event: "x" }) !== null) F("古いセーブ（S.mood 無し）で通常にならない");

  // ---------------------------------------------------------------- 画面：落とし先
  const vmc = vm.createContext({ console, G, Image: class { addEventListener() {} } });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v5_stand.js", "v8_moods.js", "v8_moods_v11.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  const has = (...k) => { G.ASSETS = {}; for (const x of k) G.ASSETS["portraits/" + x] = "data:image/webp;base64,AA=="; };
  has("nora", "nora_joy", "nora_surprise");
  if (G.v8MoodKey("nora", "surprise") !== "nora_surprise") F("絵のある表情を出さない");
  if (G.v8MoodKey("nora", "shy") !== "nora_joy") F("照れの絵が無いとき、落とし先の喜にならない");
  if (G.v8MoodKey("nora", "panic") !== "nora_surprise") F("慌ての絵が無いとき、落とし先（困り→驚き）を順に探さない");
  if (G.v8MoodKey("nora", "serious") !== "nora") F("落とし先の無い表情で、基本の絵に戻らない");
  if (G.v8MoodKey("nora", "cry") !== "nora") F("泣き・哀の絵が無いとき、基本の絵に戻らない");
  if (G.v8MoodKey("nora", "blush") !== "nora") F("一覧に無い表情で基本の絵に戻らない");
  has("nora");
  if (G.v4PortraitKey({ kind: "archer", sex: "女", seed: "c2:nora", mood: "shy" }) !== "nora") F("差分が一枚も無い人で、基本の絵に戻らない");
  G.ASSETS = {};

  // ---------------------------------------------------------------- 生成
  const gen = readFileSync(new URL("../../tools/gen_portraits.mjs", import.meta.url), "utf8");
  if (!/"--mood"/.test(gen) || !/Object\.keys\(p\.variants\)/.test(gen)) F("tools/gen_portraits.mjs が任意の表情（variants の鍵・--mood）を作れない");
  const readme = readFileSync(new URL("../../docs/art/README.md", import.meta.url), "utf8");
  if (!/moods\.md/.test(readme) || !/--mood/.test(readme)) F("docs/art/README.md に表情の種類（moods.md・--mood）の説明が無い");

  ok(`V11：表情 ${keys.length} 種、主要な ${main.length} 人に喜怒哀楽＋その人らしい表情 ${extras} 個、出来事の表 ${Object.keys(table).length}・会話の表 ${Object.keys(TM).length}`);
};
