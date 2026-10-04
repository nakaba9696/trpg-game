// B5：仲間の HP・一行で戦う（仕組みは src/engine/zzzzzzz_b5_party.js と combat.js の companionsTurn / foesTurn）
// - 仲間に HP がある（職業で差・腕前で伸びる）・古いセーブ（HP が無い）も満タンになる
// - 敵が仲間も狙う（主人公ばかり／仲間ばかりにならない）
// - HP 0 で戦闘不能 → 動かない・深手が 1 つ・2 つで死の淵。戦闘のあとは HP 1 で起きる。全員倒れても主人公が立っていれば続く
// - 宿で全員が回復・回復の道具と癒しの奇跡を誰に使うか選べる（戦闘中・戦闘の外）・回復役はいちばん減っている味方を治す
// - ランダムに遊んで、仲間が倒れる・死ぬ回数を出す（多すぎないこと）
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const acts = () => G.actions().flatMap((g) => g.list);
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };

  // ---------------------------------------------------------------- HP がある
  let S = start(51);
  G.addCompanion({ name: "剣士のカイ", cls: "剣士", power: 50, dmg: 1, desc: "冷酷で、どこまでも合理的" });
  G.addCompanion({ name: "魔法使いのリサ", cls: "魔法使い", power: 50, dmg: 1, fire: true, desc: "よく分からない人" });
  G.addCompanion({ name: "僧侶のトマ", cls: "僧侶", power: 50, dmg: 0, heal: true, desc: "無口" });
  const [kai, lisa, toma] = S.companions;
  if (!(kai.hp > 0 && kai.hp === G.b5Max(kai))) fail(`B5: 仲間が満タンの HP で加わらない（${kai.hp}/${G.b5Max(kai)}）`);
  if (!(G.b5Max(kai) > G.b5Max(lisa))) fail(`B5: 剣士より術師の HP が多い（${G.b5Max(kai)} / ${G.b5Max(lisa)}）`);
  const m0 = G.b5Max(kai);
  kai.power += 15;
  if (!(G.b5Max(kai) > m0)) fail("B5: 腕前が上がっても最大 HP が伸びない");
  kai.b5wins = 9;
  if (!(G.b5Max(kai) > m0 + 4)) fail("B5: 勝ち残っても最大 HP が伸びない");
  kai.power -= 15; kai.b5wins = 0; G.b5Party(S);
  // 古いセーブ：HP の無い仲間
  const old = JSON.parse(JSON.stringify(S));
  old.companions.forEach((c) => { delete c.hp; delete c.b5wins; });
  G.S = old;
  G.actions();
  if (!old.companions.every((c) => c.hp === G.b5Max(c))) fail("B5: 古いセーブの仲間が満タンにならない");
  G.S = S;

  // ---------------------------------------------------------------- 敵が仲間も狙う・戦闘不能
  // 記録は 240 件で古いものから消えるので、G.log を包んで数える
  const seen = [];
  const log0 = G.log;
  G.log = (k, text, x) => { seen.push({ k, text: String(text), fx: x && x.fx, who: x && x.who }); return log0(k, text, x); };
  let atHero = 0, atAlly = 0, fell = 0, downActed = 0, keptOn = 0, woke = 0;
  for (let n = 0; n < 60; n++) {
    S = start(100 + n);
    S.maxHp = S.hp = 999;
    G.addCompanion({ name: "剣士のカイ", cls: "剣士", power: 50, dmg: 1, desc: "冷酷" });
    G.addCompanion({ name: "弓使いのミラ", cls: "弓使い", power: 40, dmg: 1, desc: "よく分からない人" });
    const measure = n < 30; // 前半は狙いの割合（仲間を毎手番満タンに）、後半は戦闘不能（仲間は HP 3 から）
    if (!measure) S.companions.forEach((c) => { c.hp = 3; });
    G.startCombat(["orc", "orc"], {});
    for (let t = 0; t < 30 && S.combat && !S.over; t++) {
      if (measure) S.companions.forEach((c) => { c.hp = G.b5Max(c); });
      const down = S.companions.filter((c) => c.hp <= 0).map((c) => c.name);
      seen.length = 0;
      G.act("cb:guard");
      seen.forEach((e) => {
        // 狙われた回数（当たり・外れとも）。主人公が避けた文は「敵の名前の攻撃をかわした」
        if (measure && (e.fx === "hurt" || /^オーク.の攻撃をかわした/.test(e.text))) atHero++;
        if (measure && (e.fx === "ally" || /^(剣士のカイ|弓使いのミラ)はオーク.の攻撃をかわした/.test(e.text))) atAlly++;
        if (e.fx === "allydown") fell++;
        if (down.some((nm) => e.text.startsWith(nm) || (e.fx === "ally" && e.who === nm))) downActed++;
      });
      if (S.combat && S.companions.every((c) => c.hp <= 0)) keptOn++;
      if (t === 25 && S.combat) G._endCombat("fled");
    }
    if (S.combat) G._endCombat("fled");
    if (S.companions.every((c) => c.hp >= 1)) woke++;
  }
  const share = atAlly / Math.max(1, atHero + atAlly);
  if (!atAlly) fail("B5: 敵が仲間を狙わない");
  else if (share < 0.35 || share > 0.75) fail(`B5: 敵の狙いが偏っている（仲間へ ${Math.round(share * 100)}%）`);
  if (!fell) fail("B5: HP 0 で戦闘不能にならない");
  if (downActed) fail(`B5: 戦闘不能の仲間が動いた・狙われた（${downActed} 回）`);
  if (!keptOn) fail("B5: 仲間がみな倒れても主人公が立っていれば戦いが続く、が確かめられない");
  if (woke < 60) fail(`B5: 戦闘のあと、倒れた仲間が HP 1 で起きない（${woke}/60）`);
  ok(`B5 敵の狙い（主人公＋剣士＋弓使い）：主人公 ${atHero}・仲間 ${atAlly}（仲間 ${Math.round(share * 100)}%）・戦闘不能 ${fell} 回`);

  // 深手：倒れると 1 つ、2 つで死の淵
  S = start(7);
  G.addCompanion({ name: "剣士のカイ", cls: "剣士", power: 50, dmg: 1, desc: "冷酷" });
  const c = S.companions[0];
  G.startCombat(["orc"], {});
  G.b5Fall(c, S.combat.foes[0]);
  if (c.wounds !== 1 || (S.m2 && S.m2.doom)) fail("B5: 倒れても深手が 1 つにならない・1 つ目で死の淵になる");
  G._endCombat("fled");
  if (c.hp !== 1) fail(`B5: 戦闘のあと HP 1 で起きない（${c.hp}）`);
  G.startCombat(["orc"], {});
  G.b5Fall(c, S.combat.foes[0]);
  if (c.wounds !== 2 || !S.m2.doom || S.m2.doom.id !== c.id) fail("B5: 深手が 2 つ重なっても死の淵にならない");
  G._endCombat("fled");
  G.endTurn();
  if (S.event !== "m2_farewell") fail(`B5: 死の淵の仲間の看取りが始まらない（${S.mode} ${S.event}）`);

  // ---------------------------------------------------------------- 回復
  S = start(9);
  G.addCompanion({ name: "剣士のカイ", cls: "剣士", power: 50, dmg: 1, desc: "冷酷" });
  G.addCompanion({ name: "僧侶のトマ", cls: "僧侶", power: 50, dmg: 0, heal: true, desc: "無口" });
  const [k2, t2] = S.companions;
  // 宿で全員が回復し、深手が 1 つ癒える
  S.loc = Object.keys(D.LOCS).find((id) => (D.LOCS[id].facs || D.LOCS[id].fac || []).includes && (D.LOCS[id].facs || D.LOCS[id].fac || []).includes("inn")) || S.loc;
  k2.hp = 1; t2.hp = 0; k2.wounds = 1; S.hp = 1; S.gold = 100;
  G.exploreAct("inn", "rest");
  if (k2.hp !== G.b5Max(k2) || t2.hp !== G.b5Max(t2)) fail(`B5: 宿で仲間が全快しない（${k2.hp} ${t2.hp}）`);
  if (k2.wounds !== 0) fail("B5: 宿で深手が癒えない");
  // 野営（眠る）で少し回復
  k2.hp = 1;
  G.sleep();
  if (!(k2.hp > 1 && k2.hp < G.b5Max(k2) + 1)) fail("B5: 眠っても仲間が回復しない");
  // 戦闘の外：薬を誰に使うか選ぶ
  S.mode = "explore"; S.fac = null; S.travel = null;
  k2.hp = 2; t2.hp = G.b5Max(t2);
  G.give("herb"); G.give("herb");
  const herbPick = acts().find((a) => a.id === "b5:pick:use:herb");
  if (!herbPick) fail("B5: 戦闘の外に「薬草を仲間に」が出ない");
  else {
    const turn = S.turn;
    G.act(herbPick.id);
    const list = acts();
    if (S.turn !== turn) fail("B5: 誰に使うか選ぶだけで手番が進む");
    const to = list.find((a) => a.id === "b5use:herb:" + k2.id);
    const toFull = list.find((a) => a.id === "b5use:herb:" + t2.id);
    if (!to || to.disabled || !toFull || !toFull.disabled) fail(`B5: 誰に使うかの選択肢が変（${list.map((a) => a.id).join(" ")}）`);
    else {
      const h0 = k2.hp, n0 = S.inv.herb;
      G.act(to.id);
      if (!(k2.hp > h0) || S.inv.herb !== n0 - 1 || S.b5pick) fail("B5: 選んだ仲間に薬草が効かない");
    }
    G.act(herbPick.id);
    G.act("b5:cancel");
    if (S.b5pick || !acts().some((a) => a.id === "b5:pick:use:herb")) fail("B5: 「やめる」で戻れない");
  }
  // 戦闘中：薬・癒しの奇跡を仲間に
  S.mp = S.maxMp;
  k2.hp = 2;
  G.startCombat(["goblin"], {});
  if (S.combat) {
    const healPick = acts().find((a) => a.id === "b5:pick:heal");
    const itemPick = acts().find((a) => a.id === "b5:pick:item:herb");
    if (!healPick || !itemPick) fail("B5: 戦闘中に「癒しの奇跡を仲間に」「薬草を仲間に」が出ない");
    else {
      const r0 = S.combat.round;
      G.act(itemPick.id);
      if (S.combat.round !== r0) fail("B5: 戦闘中、誰に使うか選ぶだけで手番が進む");
      const h0 = k2.hp;
      const hp0 = S.hp;
      G.act("cb:item:herb:" + k2.id);
      if (!(k2.hp > h0 || k2.hp === 0)) fail("B5: 戦闘中、選んだ仲間に薬草が効かない");
      if (S.hp > hp0) fail("B5: 仲間に使った薬草で主人公が回復した");
    }
    if (S.combat) G._endCombat("fled");
  }
  // 回復役は、いちばん減っている味方を治す（主人公より減っている仲間を先に）
  S.mode = "explore";
  S.hp = S.maxHp; k2.hp = 1; t2.hp = G.b5Max(t2);
  const need = G.b5Neediest();
  if (need.who !== k2) fail("B5: いちばん減っている味方を選べない");
  G.startCombat(["goblin"], {});
  if (S.combat) {
    seen.length = 0;
    G.act("cb:guard");
    if (!seen.some((e) => /トマの治療：カイ HP \+\d+/.test(e.text || ""))) fail("B5: 回復役がいちばん減っている仲間を治さない");
    if (S.combat) G._endCombat("fled");
  }

  // ---------------------------------------------------------------- ランダムに遊んで、仲間が倒れる・死ぬ回数
  let games = 0, comps = 0, falls = 0, deaths = 0, heroDeaths = 0;
  for (let g = 0; g < 40; g++) {
    S = start(9000 + g);
    S.gold = 300;
    G.addCompanion("random"); G.addCompanion("random");
    games++;
    for (let step = 0; step < 400 && !S.over; step++) {
      const list = acts().filter((a) => !a.disabled);
      if (!list.length) break;
      seen.length = 0;
      G.act(list[Math.floor(G.rand() * list.length)].id);
      seen.forEach((e) => { if (e.fx === "allydown") falls++; });
      for (const c of S.companions) if (!(c.hp >= 0 && c.hp <= G.b5Max(c))) { fail(`B5: 仲間の HP が範囲外 ${c.hp}/${G.b5Max(c)}`); break; }
    }
    comps += 2;
    deaths += S.m2 ? S.m2.counts.death : 0;
    if (S.over === "dead") heroDeaths++;
  }
  ok(`B5 ランダム ${games} 回（仲間 2 人で始める・400 手）：仲間が戦闘不能 ${falls} 回・死別 ${deaths} 回（${comps} 人中）・主人公の死 ${heroDeaths} 回`);
  if (deaths > comps * 0.5) fail(`B5: 仲間が死にすぎる（${deaths}/${comps}）`);
  G.log = log0;
};
