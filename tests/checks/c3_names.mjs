// C3：名のある人物の名前と役職（src/data/zc3_names.js・engine/zzz_c3_names.js・ui/c3_nameplate.js）
// - 名のある人物（D.F2_PEOPLE・D.C2_PEOPLE・docs/art/portraits.json の c2 と named）すべてに、名前（か名乗るまでの呼び名）と役職の札がある
// - 役職だけ・あだ名だけの名前が残っていない（使徒の人の姿は〔進〕なので呼び名のまま）。同じ名前の人がいない
// - 話す人の札（G.whoTag）は「名前＋役職」。名の無い町の人・旅の人にも型の札（村人・商人・衛兵…）が付く
// - 名乗る人（灰色の外套の旅人・「ボク」の娘）は、名乗るまで呼び名。名乗ると名前になり、図鑑にも残る
// - 古いセーブ：仲間の名前が前の呼び名なら今の名前に読み替える。S.flags に印が無くても動く
import { readFileSync } from "node:fs";

const ROLE_ONLY = /^(第.騎士団の団長|寡黙な隊長|博士|ヘル爺|大槌の姉さん|帝国の宰相|宰相|東へ出る船の船長|.*の(主人|女将|老人|船長|団長|隊長))$/;

export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  let n = 0;
  const F = (m) => { n++; fail("C3: " + m); };
  const N = D.C3_NAMES;
  if (!N) return F("D.C3_NAMES が無い");
  const APOSTLE = new Set(["mirza", "aurelia", "yoihime", "mordu", "azlag", "chezar", "yura"]);

  // ---- 全員に名前と役職
  const portraits = JSON.parse(readFileSync(new URL("../../docs/art/portraits.json", import.meta.url), "utf8")).portraits;
  const ids = new Set([...Object.keys(D.F2_PEOPLE), ...Object.keys(D.C2_PEOPLE), ...portraits.filter((p) => p.group === "c2" || p.group === "named").map((p) => p.id)]);
  const seen = {};
  for (const id of ids) {
    const t = N[id];
    if (!t) { F(`${id} の名前と役職が無い`); continue; }
    if (!t.role) F(`${id} に役職の札が無い`);
    if (APOSTLE.has(id)) { if (!t.alias) F(`${id}（人の姿の使徒）に呼び名が無い`); continue; }
    if (!t.name) { F(`${id} に名前が無い`); continue; }
    if (ROLE_ONLY.test(t.name) || /[のな]/.test(t.name) && t.name.length > 5) F(`${id} の名前が役職かあだ名のまま：${t.name}`);
    if (t.name.includes(t.role)) F(`${id} の名前に役職が入っている：${t.name}`);
    if (seen[t.name]) F(`${id} と ${seen[t.name]} が同じ名前 ${t.name}`);
    seen[t.name] = id;
    if (t.reveal && !t.alias) F(`${id} は名乗るまでの呼び名が無い`);
  }
  // 前の呼び名が、データに役職だけのまま残っていない
  for (const [id, t] of Object.entries(N)) {
    if (!t.name || t.reveal) continue;
    const p = D.C2_PEOPLE[id], q = D.F2_PEOPLE[id];
    if (p && p.name !== t.name) F(`${id}：キャラメモの呼び名が ${p.name} のまま`);
    if (q && q.name && q.name !== t.name) F(`${id}：図鑑の呼び名が ${q.name} のまま`);
    if (p && /名はシートに無い/.test(p.full || "")) F(`${id}：full が「名はシートに無い」のまま`);
  }

  // ---- 話す人の札
  G.rand = seeded(7);
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  G.P = { trophies: {}, graves: [] };
  G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 24, history: "テスト用", personality: "無口" } });
  const S = G.S;
  const two = (tag, name, role, what) => {
    if (!tag) return F(`${what}：札が無い`);
    if (tag.name !== name || tag.role !== role) F(`${what}：札が ${tag.name}／${tag.role}（${name}／${role} のはず）`);
    if (name && role && tag.label !== `${name}（${role}）`) F(`${what}：一行の札が ${tag.label}`);
  };
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  two(G.whoTag(ev("c2_sixth").who, S, "c2_sixth"), "オルヴェイン", "第六騎士団の団長", "第六騎士団の団長の出来事");
  two(G.whoTag(ev("c2_lab_door").who, S, "c2_lab_door"), "ロウェル", "王国軍の隊長", "寡黙な隊長の出来事");
  two(G.whoTag(ev("c2_lab").who, S, "c2_lab"), "モルヴァン", "王国に雇われた博士", "博士の出来事");
  two(G.whoTag({ kind: "noble", seed: "fac:garmund:chancellor", name: "宰相" }, S, null), "オスヴィン", "帝国の宰相", "帝都の王城の宰相");
  two(G.whoTag(D.EVENT_WHO.r1_elf_ledger || { kind: "host" }, S, "r1_elf_ledger"), "ハンス", "宿の主人", "宿の主人ハンスの出来事");
  two(G.whoTag({ kind: "sailor", seed: "ev:m6_wall_captain" }, S, "m6_wall_captain"), "コルサーノ", "東へ出る船の船長", "東へ出る船の船長");
  two(G.whoTag({ kind: "majin" }, S, "mirza"), "日傘の銀髪の男", "灰の荒野の貴人", "人の姿の使徒（呼び名のまま）");
  // 名の無い人：型の札
  const kinds = { merchant: "商人", guard: "衛兵", sailor: "船乗り", soldier: "兵士", knight: "騎士", adventurer: "冒険者", rogue: "ならず者" };
  for (const [k, r] of Object.entries(kinds)) two(G.whoTag({ kind: k }, S, "x_none"), "", r, `名の無い ${k}`);
  two(G.whoTag({ kind: "host", sex: "女" }, S, "x_none"), "", "宿の女将", "名の無い宿の女将");
  two(G.whoTag({ kind: "priest", sex: "女" }, S, "x_none"), "", "修道女", "名の無い修道女");
  const wildLoc = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "wild");
  const town = S.loc;
  S.loc = wildLoc;
  two(G.whoTag({ kind: "villager" }, S, "x_none"), "", "村人", "町の外の名の無い人");
  S.loc = town;
  two(G.whoTag({ kind: "villager" }, S, "x_none"), "", "町の人", "町の名の無い人");
  two(G.whoTag({ kind: "villager" }, S, "brawl"), "", "酔っぱらい", "出来事ごとの札");
  const foe = G.whoTag({ kind: "foe", foe: "goblin" }, S, "x_none");
  if (!foe || !foe.name || foe.role !== "魔物") F(`魔物の札が ${foe && foe.label}`);
  // 絵の付いた出来事は、どれも札が空でない
  for (const e of D.EVENTS) {
    const w = e.who || (D.EVENT_WHO || {})[e.id];
    if (!w) continue;
    const t = G.whoTag(typeof w === "string" ? { kind: w } : w, S, e.id);
    if (!t || !t.label || !t.role) F(`出来事 ${e.id} の話す人の札が空 ${t && t.label}`);
  }
  // 仲間の札
  const c = { name: "ディル", cls: "港町の若者", c2: "dil" };
  two(G.compTag(c), "ディル", "港町の若者", "仲間の札");
  two(G.compTag({ name: "傭兵のラグナ", cls: "傭兵" }), "傭兵のラグナ", "傭兵", "ふつうの仲間の札");

  // ---- 名乗る人
  const F2 = G.f2;
  if (F2.personName("walker") !== "灰色の外套の旅人") F(`名乗る前の旅人の図鑑の名前が ${F2.personName("walker")}`);
  two(G.whoTag({ kind: "adventurer", seed: "d6:walker" }, S, "d6_w_inn"), "灰色の外套の旅人", "旅人", "名乗る前の旅人");
  const walkers = D.EVENTS.filter((e) => /^d6_w_/.test(e.id));
  for (let i = 0; i < 3; i++) { S.mode = "explore"; S.event = null; G.startEvent(walkers[i]); }
  if (!S.flags.c3_walker_name) F("三度目に会っても旅人が名乗らない");
  two(G.whoTag({ kind: "adventurer", seed: "d6:walker" }, S, walkers[2].id), "ノエ", "旅人", "名乗った旅人");
  if (F2.personName("walker") !== "ノエ") F("名乗った旅人の名前が図鑑に出ない");
  if (!(G.P.c3named || {}).walker) F("名乗った旅人の名前が冒険をまたいで残らない");
  const boku = ev("c3_boku_name");
  if (!boku) F("「ボク」の娘が名乗る出来事が無い");
  else {
    if (boku.cond(S)) F("最初に会う前に「ボク」の娘が名乗る");
    S.flags["ev:c2_boku"] = true;
    if (!boku.cond(S)) F("二度目に会っても「ボク」の娘が名乗る出来事が起きない");
    two(G.whoTag(D.C2_PEOPLE.boku.who, S, "c3_boku_name"), "「ボク」の娘", "からくり好きの娘", "名乗る前の「ボク」の娘");
    S.mode = "explore"; S.event = null;
    G.startEvent(boku);
    G.chooseEvent(0);
    if (!S.flags.c3_boku_name) F("「ボク」の娘が名乗らない");
    two(G.whoTag(D.C2_PEOPLE.boku.who, S, "c3_boku_name"), "テオ", "からくり好きの娘", "名乗った「ボク」の娘");
  }

  // ---- 古いセーブ
  const O = JSON.parse(JSON.stringify(S));
  delete O.flags.c3_walker_name;
  O.companions = [{ name: "第六騎士団の団長", cls: "騎士", c2: "sixth", power: 50 }, { name: "ディル", cls: "港町の若者", c2: "dil" }, { name: "傭兵のラグナ", cls: "傭兵" }];
  G.fixOldNames(O);
  if (O.companions[0].name !== "オルヴェイン") F(`古いセーブの仲間の名前が読み替わらない：${O.companions[0].name}`);
  if (O.companions[1].name !== "ディル" || O.companions[2].name !== "傭兵のラグナ") F("古いセーブのほかの仲間の名前が変わった");
  const t = G.whoTag({ kind: "adventurer", seed: "d6:walker" }, O, "d6_w_inn");
  if (!t || t.name !== "灰色の外套の旅人") F("印の無い古いセーブで、旅人が名乗ったことになっている");

  if (!n) ok("C3: 名のある人物の名前と役職・話す人の札・名乗る人・古いセーブ");
};
