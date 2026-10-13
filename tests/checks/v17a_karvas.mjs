// V17a（t04）：明けずの町カルヴァス（src/data/v17a_karvas.js・src/engine/zz_v17a_karvas.js・src/ui/scene_v2_v17a_karvas.js）
// - 場所：町で、凍てつく街道と黒鉄の砦に陸路で両方向につながり、出発地から着ける（たどり着けるかは t5_reach も見る）
// - 出来事：住人の話と、家令の日記の三枚（宿・教会・館の番小屋）がそろうと、三枚の出来事が開く。どの出来事も選べる選択肢がある
// - 日記と住人の話だけで察せる形：地の文・覚えていること・用語説明に、〔秘〕の名と言葉（リゼット・オスリック・古言・ベルナ・覗き窓・神）が出ない
// - 町で日を越すと正気が減る。旅の途中や、ほかの町では減らない。古いセーブ（印が無い）でも動く
// - 文の癖（V3 と同じ上限）
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintFile } from "../../tools/prose_lint.mjs";

const SECRET = /リゼット|オスリック|古言|ベルナ|覗き窓|ヴェルム|神が|魔王|見世物|観客|舞台|台本/;

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0("V17a カルヴァス: " + m); };
  const G = loadEngine();
  const D = G.data;
  const K = D.LOCS.karvas;
  if (!K) { fail("場所 karvas が無い"); return; }
  if (K.type !== "town") fail("町になっていない");
  for (const [to, d] of [["frost", 2], ["fort", 2]]) {
    if (K.links[to] == null || !D.LOCS[to] || D.LOCS[to].links.karvas !== K.links[to]) fail(`${to} との道が片道か、無い`);
  }
  (K.shop || []).forEach((it) => { if (!D.ITEMS[it]) fail(`店の品 ${it} が無い`); });
  // 出発地から陸路で着ける
  {
    const seen = new Set(["karna"]);
    const q = ["karna"];
    while (q.length) { const id = q.shift(); for (const to of Object.keys(Object.assign({}, D.LOCS[id].links, D.LOCS[id].sea))) if (D.LOCS[to] && !seen.has(to)) { seen.add(to); q.push(to); } }
    if (!seen.has("karvas")) fail("商都ブランデールから着けない");
  }

  // ---------------------------------------------------------------- 出来事の形と文
  const evs = D.EVENTS.filter((e) => /^v17a_kv_/.test(e.id));
  if (evs.length < 6) fail(`町の出来事が ${evs.length}（6 以上のはず）`);
  const texts = [];
  const walk = (o, w) => { if (!o) return; if (o.text) texts.push([w, o.text]); if (o.memo) texts.push([w + "・覚え", o.memo]); if (o.chron) texts.push([w + "・年表", o.chron]); walk(o.win, w); };
  for (const e of evs) {
    if (!e.where.includes("karvas")) fail(`${e.id}：町の外で起きる`);
    texts.push([e.id, e.text]);
    e.choices.forEach((c) => { walk(c.ok, e.id); walk(c.ng, e.id); walk(c.win, e.id); if (c.fight && !G.resolveFoes(c.fight).length) fail(`${e.id}：敵 ${c.fight} が無い`); });
  }
  (D.LORE.akezu ? D.LORE.akezu.lines : []).forEach((l) => texts.push(["用語説明・" + l[0], l[1]]));
  (D.W7_ARRIVE.karvas || []).forEach((t) => texts.push(["着いたとき", t]));
  texts.push(["場所の説明", K.desc]);
  for (const [w, t] of texts) {
    if (SECRET.test(t)) fail(`${w}：見せない言葉「${t.match(SECRET)[0]}」`);
    if (/！|!/.test(t.replace(/「[^」]*」/g, ""))) fail(`${w}：地の文に「！」`);
  }

  // ---------------------------------------------------------------- 通しで：日記の三枚を集める
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats("merc", G.rand);
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { name: "試し", sex: "女", age: 30, history: "", personality: "" } });
    const S = G.S;
    S.maxHp = S.hp = 999; S.gold = 500; S.day = 20; S.loc = "karvas"; S.mode = "explore";
    return S;
  };
  const S = start(1717);
  const pickRe = (re, win) => {
    const list = G.eventChoices();
    if (!list.length) { fail(`${S.event}：選べる選択肢が無い`); return; }
    const p = list.find(({ c }) => re.test(c.label));
    if (!p) { fail(`${S.event}：「${re}」の選択肢が無い（${list.map(({ c }) => c.label).join("／")}）`); return; }
    const c0 = G.check;
    if (win != null) G.check = () => ({ ok: win, roll: win ? 1 : 100, chance: win ? 100 : 0 });
    try { G.act("ev:" + p.i); } finally { G.check = c0; }
    let n = 0;
    while (S.mode === "combat" && n++ < 20) { S.combat.foes.forEach((f) => { f.hp = 0; }); G._endCombat("win"); G.endTurn(); }
  };
  const run = (id, re, win) => { S.mode = "explore"; S.event = null; G.startEvent(id); if (S.event !== id) { fail(`${id} が始まらない`); return; } pickRe(re, win); };
  run("v17a_kv_inn", /読ませて/);
  if (!S.flags.v17a_kv_page1) fail("宿で日記の一枚目が手に入らない");
  run("v17a_kv_church", /名簿/, true);
  if (!S.flags.v17a_kv_page2) fail("教会で日記の二枚目が手に入らない");
  run("v17a_kv_manor", /番小屋/, true);
  if (!S.flags.v17a_kv_page3) fail("館の番小屋で日記の三枚目が手に入らない");
  const ev3 = D.EVENTS.find((e) => e.id === "v17a_kv_pages");
  if (!ev3 || !ev3.cond(S)) fail("三枚そろっても、三枚の出来事が開かない");
  for (const k of ["diary1", "diary2", "diary3"]) if (!((S.lore || {}).akezu || []).includes(k)) fail(`用語説明の行 ${k} が開かない`);
  run("v17a_kv_pages", /預ける/);
  if (!S.chronicle.some((x) => /日記の切れ端を三枚/.test(x.text))) fail("三枚をそろえた一行が年表に無い");
  // 番小屋を探ったあとは、番小屋の選択肢が出ない（同じ紙は二度出ない）
  S.mode = "explore"; S.event = null; G.startEvent("v17a_kv_manor");
  if (G.eventChoices().some(({ c }) => /番小屋/.test(c.label))) fail("番小屋の紙を取ったあとも、番小屋を探る選択肢が出る");
  // 館の門で戦いは起きない（館の主は出さない）
  if (D.EVENTS.find((e) => e.id === "v17a_kv_manor").choices.some((c) => c.fight || (c.ok && c.ok.fight) || (c.ng && c.ng.fight))) fail("館の門で戦いが起きる");

  // ---------------------------------------------------------------- 町で日を越すと正気が減る
  {
    const S2 = start(2727);
    S2.sanity = 80;
    G.endTurn();
    const a = G.sanityOf(S2);
    S2.day += 1; G.endTurn();
    const b = G.sanityOf(S2);
    if (!(b < a)) fail(`町で一日を越しても正気が減らない（${a}→${b}）`);
    S2.loc = "fort"; S2.day += 1; G.endTurn();
    const c = G.sanityOf(S2);
    if (c < b) fail("町の外でも正気が減る");
    S2.loc = "karvas"; G.endTurn(); S2.day += 3; delete S2.v17aKv; G.endTurn();
    if (G.sanityOf(S2) < c) fail("古いセーブ（印が無い）で、着いた日に正気が減る");
  }

  // ---------------------------------------------------------------- 文の癖
  const f = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "data", "v17a_karvas.js");
  const r = lintFile(f);
  if (r.rate > 2.5) fail(`文の癖が多い：千字あたり ${r.rate.toFixed(2)} ${JSON.stringify(r.counts)}`);
  if (r.dots > 2.0) fail(`「……」が多い：千字あたり ${r.dots.toFixed(2)}`);
  if (!bad) ok(`V17a 明けずの町カルヴァス（出来事 ${evs.length}・日記の三枚・正気・文 ${r.chars} 字）`);
};
