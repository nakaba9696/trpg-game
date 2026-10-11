// F5：仲間の作戦を 6 つに作り直した（engine/zzzzzzzzzzzz_f3_orders.js・data/f3_orders.js。持ち主「仲間への作戦は……を参考にして」）
// - 6 つの作戦がそろい、名前は独自（参考にした作品の作戦名をそのまま書かない）
// - 古いセーブの作戦（任せる・全力・守り重視・回復優先）は近いものに読み替わる。仲間ごとの作戦（宿で決める）が一行の作戦より先に効く
// - 動き：押し切れは奥の手を使う／力を残せは使わない／機を見ては強敵にだけ一つ残して使う／生き延びろは深手の味方に薬・自分が深手なら下がる
//         盾となれは受ける傷が減る／命を待ては手を決める段で一人ずつ選ぶ（F8）。選ばずに解けば構えて待つ（受ける傷が半分）
// - 渋る：好感度の低い臆病者は「押し切れ」を渋って、その戦いは機を見てで動く（一言は一度）。好感度が高ければ渋らない
// - 奥の手は休むと戻る。宿で一行と仲間ごとの作戦を決められ、決めても時間は進まない
import { readFileSync, readdirSync } from "node:fs";

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail0("F5 仲間の作戦：" + m); };
  const G = loadEngine();
  const D = G.data;
  const F3 = G.f3;
  if (!F3 || !D.F3_TACTIC_KEYS) { F("作戦の表（D.F3_TACTIC_KEYS）が無い"); return; }

  // ---------------------------------------------------------------- 表と名前
  const KEYS = ["press", "adapt", "shield", "live", "spare", "wait"];
  if (D.F3_TACTIC_KEYS.join() !== KEYS.join()) F(`作戦が 6 つそろわない（${D.F3_TACTIC_KEYS}）`);
  for (const k of KEYS) if (!D.F3_TACTICS[k] || !D.F3_TACTICS[k].name || !D.F3_TACTICS[k].sub) F(`作戦 ${k} の名前か説明が無い`);
  // 参考にした作品の名前・作戦名は書かない（src と docs のどこにも）
  const BANNED = /ガンガンいこうぜ|バッチリがんばれ|いのちだいじに|じゅもんつかうな|めいれいさせろ|みんながんばれ|いろいろやろうぜ|ドラゴンクエスト|ドラクエ/;
  const walk = (dir) => readdirSync(new URL(dir, import.meta.url), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(dir + d.name + "/") : /\.(js|md|json)$/.test(d.name) ? [dir + d.name] : []));
  for (const f of [...walk("../../src/"), ...walk("../../docs/")]) if (BANNED.test(readFileSync(new URL(f, import.meta.url), "utf8"))) F(`参考にした作品の名前が書かれている：${f.replace("../../", "")}`);
  // 古いセーブの読み替え
  const old = { free: "adapt", all: "press", guard: "shield", heal: "live" };
  for (const [o, n] of Object.entries(old)) if (F3.tactic({ f3tactic: o }) !== n) F(`古いセーブの作戦 ${o} が ${n} に読み替わらない`);
  if (F3.tactic({}) !== "adapt") F("作戦の無いセーブが「機を見て」にならない");

  // ---------------------------------------------------------------- 場の用意
  const mk = (i, extra) => Object.assign({ id: "f5c" + i, name: `仲間${"アイウ"[i]}`, cls: "傭兵", power: 70, dmg: 3, desc: "無口", trait: "loyal", bond: 70 }, extra || {});
  const begin = (seed, comps, tac) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999;
    S.companions = comps;
    G.b5Party(S);
    if (tac) S.f3tactic = tac;
    return S;
  };
  // 強敵：ボスのうち、仲間の刃がいちばん届きやすいもの（歯が立たない相手には奥の手も牽制に回るので）
  const bosses = Object.keys(D.ENEMIES).filter((id) => D.ENEMIES[id].boss && !D.ENEMIES[id].majin && !D.ENEMIES[id].apostle);
  const boss = bosses.map((id) => [id, G.allyHitChance(mk(0), D.ENEMIES[id])]).sort((a, b) => b[1] - a[1])[0][0];
  const fight = (S, foes) => { G.startCombat(foes, {}); S.combat.foes.forEach((f) => { f.hp = f.max = 900; }); };
  const turns = (S, n, id) => { for (let i = 0; i < n && S.combat; i++) G.act(id || "cb:guard"); };
  const text = (S, from) => S.log.slice(from).map((l) => l.text || "").join("\n");

  // 押し切れ：奥の手を使う。力を残せ：使わない。機を見て：雑魚には使わず、強敵には一つ残して使う
  {
    const S = begin(1, [mk(0)], "press");
    fight(S, ["goblin"]);
    const from = S.log.length;
    turns(S, 3);
    if (F3.ki(S.companions[0]) !== 0 || !/奥の手「渾身の一撃」/.test(text(S, from))) F("押し切れで、奥の手を使い切らない");
  }
  {
    const S = begin(2, [mk(0, { fire: true, cls: "魔法使い" })], "spare");
    fight(S, [boss]);
    turns(S, 4);
    if (F3.ki(S.companions[0]) !== F3.KI_MAX) F("力を残せで、奥の手を使った");
  }
  {
    const S = begin(3, [mk(0)], "adapt");
    fight(S, ["goblin"]);
    turns(S, 3);
    if (F3.ki(S.companions[0]) !== F3.KI_MAX) F("機を見てで、雑魚に奥の手を使った");
    const S2 = begin(4, [mk(0)], "adapt");
    fight(S2, [boss]);
    turns(S2, 4);
    if (F3.ki(S2.companions[0]) !== 1) F(`機を見てで、強敵に奥の手を一つ残して使わない（残り ${F3.ki(S2.companions[0])}）`);
  }
  // 生き延びろ：深手の味方に薬を使う・自分が深手なら下がる
  {
    const S = begin(5, [mk(0), mk(1)], "live");
    fight(S, ["goblin"]);
    G.give("potion", 2);
    S.companions[1].hp = 1; // 仲間イが深手
    const meds = () => Object.keys(S.inv).filter((id) => (D.ITEMS[id] || {}).hp).reduce((a, id) => a + S.inv[id], 0);
    const n0 = meds();
    const r0 = G.rand; G.rand = () => 0.99;
    try { G.act("cb:guard"); } finally { G.rand = r0; }
    if (!(meds() < n0)) F("生き延びろで、深手の味方に薬を使わない");
  }
  {
    const S = begin(15, [mk(0)], "live");
    fight(S, ["goblin"]);
    S.inv = {};
    S.companions[0].hp = 2;
    const from = S.log.length;
    const r0 = G.rand; G.rand = () => 0.99;
    try { G.act("cb:guard"); } finally { G.rand = r0; }
    if (!/仲間アは傷をかばって防御を固めた/.test(text(S, from))) F("生き延びろで、深手の仲間が下がらない");
  }
  // 盾となれ：構えて受ける傷が減る。命を待て：指示が無ければ攻めずに構え（傷が半分）、指示があればする
  {
    begin(6, [mk(0)], "shield");
    G.startCombat(["goblin"], {});
    const c = G.S.companions[0];
    if (!(G.cbAllyHurt(c, 20) < 20)) F("盾となれで、受ける傷が減らない");
    G.S.f3tactic = "adapt";
    if (G.cbAllyHurt(c, 20) !== 20) F("機を見てで、受ける傷が変わる");
  }
  {
    const S = begin(7, [mk(0, { power: 99 })], "wait");
    fight(S, ["goblin"]);
    const f = S.combat.foes[0];
    // 指示の無いまま一巡を解く（G.combatAct を直に。手を決める段を通らない古い流れ）と、構えて待つ
    const from = S.log.length;
    G.combatAct("guard");
    if (f.hp < f.max || /仲間アの攻撃/.test(text(S, from))) F("命を待てで、指示の無い仲間が攻めた");
    // F8：手を決める段では、主人公の手のあとに仲間アの番が来て、選んだ手（攻める）で解ける
    G.act("cb:guard");
    if (!(G.f8 && G.f8.turn(S) === S.companions[0])) F("命を待てで、主人公の手のあとに仲間の番が来ない");
    const r0 = G.rand; G.rand = () => 0.01;
    try { G.act("f3:ord:f5c0:attack"); } finally { G.rand = r0; }
    if (!(f.hp < f.max)) F("命を待てで、選んだ手（攻める）をしない");
  }
  // 渋る：好感度の低い臆病者は押し切れを渋る（その戦いは機を見て。一言は一度）。高ければ渋らない
  {
    const run = (bond) => {
      const S = begin(8, [mk(0, { trait: "coward", bond })], "press");
      fight(S, ["goblin"]);
      const from = S.log.length;
      const r0 = G.rand; G.rand = () => 0.01;
      try { turns(S, 3); } finally { G.rand = r0; }
      return { ki: F3.ki(S.companions[0]), lines: (text(S, from).match(/いつもの手しか出さなかった/g) || []).length };
    };
    const lo = run(10), hi = run(90);
    if (lo.lines !== 1 || lo.ki !== F3.KI_MAX) F(`好感度の低い臆病者が押し切れを渋らない（一言 ${lo.lines}・奥の手の残り ${lo.ki}）`);
    if (hi.lines || hi.ki === F3.KI_MAX) F("好感度の高い臆病者が押し切れを渋った");
  }
  // 仲間ごとの作戦が一行の作戦より先に効く。奥の手は休むと戻る
  {
    const S = begin(9, [mk(0, { f5tac: "spare" }), mk(1)], "press");
    if (F3.tacticOf(S.companions[0], S) !== "spare" || F3.tacticOf(S.companions[1], S) !== "press") F("仲間ごとの作戦が効かない");
    S.companions[1].f5ki = 0;
    G.sleep();
    if (F3.ki(S.companions[1]) !== F3.KI_MAX) F("休んでも奥の手が戻らない");
  }
  // 宿で前もって決める（時間は進まない）
  {
    const S = begin(10, [mk(0), mk(1)]);
    S.mode = "fac"; S.fac = "inn";
    const ids = () => G.actions().flatMap((g) => g.list).map((a) => a.id);
    if (!ids().includes("f3:pick:all") || !ids().includes("f3:pick:f5c1")) F("宿に一行の作戦・仲間ごとの作戦を決める選択肢が無い");
    const day = S.day, phase = S.phase, turn = S.turn;
    G.act("f3:pick:all");
    if (!ids().includes("f3:set:all:shield")) F("宿で一行の作戦を選ぶ一覧が出ない");
    G.act("f3:set:all:shield");
    G.act("f3:pick:f5c1");
    G.act("f3:set:f5c1:live");
    if (S.f3tactic !== "shield" || S.companions[1].f5tac !== "live" || S.f3pick) F("宿で決めた作戦が覚えられない");
    G.act("f3:pick:f5c1");
    G.act("f3:set:f5c1:same");
    if (S.companions[1].f5tac) F("「一行と同じ」に戻せない");
    if (S.day !== day || S.phase !== phase || S.turn !== turn) F("宿で作戦を決めると時間が進む");
    S.mode = "explore"; S.fac = null;
    if (ids().some((id) => /^f3:/.test(id))) F("宿の外にも作戦を決める選択肢が出る");
  }

  if (!bad) ok("F5 仲間の作戦（6 つ・古いセーブの読み替え・押し切れ／力を残せ／機を見ての奥の手・生き延びろ・盾となれ・命を待て・渋る・仲間ごと・宿）");
};
