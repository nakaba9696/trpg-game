// 戦闘。1手番ずつ：あなた → 仲間 → 敵。成功率はすべて能力値から決まる。レーン B（戦闘）が管理
// 演出（B1）：画面が描けるよう、記録に fx を添える。DOM には触らない。
//   { fx: "hit", foe: 名前, n } 敵にダメージ / { fx: "down", foe, boss } 敵が倒れた / { fx: "wall", foe } 絶界に弾かれた
//   { fx: "hurt", n, heavy } あなたがダメージ / { fx: "ally", who: 仲間の名前, n } 仲間がダメージ / { fx: "allydown", who } 仲間が戦闘不能（B5）/ { fx: "crit" } 会心・急所 / { fx: "boss", foe: id, name } ボスの前口上（D.BOSS_LINES）
// 読み合いのためのつなぎ目（F1。中身は engine/zzzzzzzzzz_f1_duel.js）。無ければ今まで通り：
//   G.cbActs[kind](t, a, b)   こちらの手を足す（"cb:<kind>"。この手番の中で行うので、図鑑・依頼・弱点の上乗せがそのまま数える）
//   G.cbDmgMod(f, n, how)     こちらの一撃のダメージを変える（構え・隙・とどめ・E12 の耐性と弱点）。返した数を与える
//   G.cbAllyDmg(c, f, n)      仲間の一撃のダメージを変える（E12 の耐性と弱点）。返した数を与える
//   G.cbHurtMod(f, e, n, mv)  あなたが受ける一撃のダメージを変える（E12b：敵の攻め手と、こちらの防具の効き目）。返した数を受ける
//   G.cbMove(f, e)            敵がこの手番にすること { skip, times, mul, hit, through（身を守っても避けにくくならない）, guardDiv, pierce, you, name, text, f1 }。null ならふつうに一撃
//   G.cbStruck(f, e, mv, who, dmg)  敵の一撃が当たった・外れた（who は仲間か null＝あなた、dmg は与えた数か 0）のあと
//   C.f1dodge                 「躱す」が決まった：あなたへの最初の一撃を丸ごと外す
//   G.cbAllyAssist(c, f, e)   仲間がこの手番に斬りかからずに援護した（true なら攻撃しない。F2）
//   G.cbCover(f, e, dmg, mv)  あなたへの一撃のうち、仲間が庇って受けた分を引いた数を返す（F2）
//   G.cbAllyOrder(c, foes)    あなたの指示・作戦で仲間が動いた（true なら、この仲間のふだんの手番は行わない。F3）
//   G.cbAllyHurt(c, dmg)      仲間が受ける傷を変える（下がっている仲間。F3）／G.cbAllyHeal・G.cbAllyStrike 仲間の手当てと一撃
//   G.cbAfterAct(kind, t)     こちらの手のあと、仲間と敵の手番の前（I2：二刀の左手の一撃）
(function (G) {
  const D = G.data;
  G.cbActs = G.cbActs || {};

  const VOLGRIM_LINES = [
    "ヴォルグリムの鉤が、ひとりでに、いちばん強い相手の方へ向く。",
    "槍が手の中で重くなる。弱い相手には、振るのを渋るように。",
    "鉤が相手の肉に掛かって外れない。槍は黙ったまま、引き寄せる。",
    "骨の柄が、手のひらに吸い付くように馴染む。槍は何も言わない。次の獲物を探している。",
  ];
  // 明けの鎖もしゃべらない。鳴るだけ
  const BYAKUYA_LINES = [
    "鎖の輪が触れ合って、澄んだ音が一つ鳴る。相手が、ほんの一瞬たじろぐ。",
    "投げた鎖が、相手の腕に巻きついて離れない。",
    "鎖が、手首の上で静かに締まり直す。まだ終わっていない、というふうに。",
  ];

  G.alive = () => (G.S.combat ? G.S.combat.foes.filter((f) => f.hp > 0) : []);
  G.target = () => G.alive()[0];
  G.foeData = (f) => D.ENEMIES[f.id];

  // ---------------------------------------------------------------- 敵の強さ（S5。点）
  // 敵の点 lv（データに無ければ段 tier から。D.S5.TIER_LV、ボスは +BOSS）。こちらの判定の相手の点は、lv に今までの欄（％）を 3 で割って足す。
  // ゴブリン（段 1・防御 0）は 13 点：筋力 12 の攻撃が 50％（今までの 48％とほぼ同じ）。段が上がるほど、同じ点でも当たりにくく、当てられやすくなる
  G.foeLv = (e) => {
    if (e.lv != null) return e.lv;
    const T = (D.S5 && D.S5.TIER_LV) || {};
    const t = e.tier || 1;
    return (T[t] != null ? T[t] : 12 + (t - 1) * 8) + (e.boss ? (D.S5 && D.S5.BOSS) || 0 : 0);
  };
  G.foeVs = {
    // こちらの攻撃（武器の能力値と比べる）。S6：素早い敵（agi が 40 より上）には筋力の武器が、硬い敵（def が 10 より上）には敏捷の武器が当たりにくい
    eva: (e, k) => G.foeLv(e) + 1 + G.s5Mod(e.def || 0) + (k === "筋力" ? ((e.agi || 0) - 40) / 10 : k === "敏捷" ? ((e.def || 0) - 10) / 10 : 0),
    // 急所（敏捷）。S6：同じ戦いで急所ばかり狙うと、相手が見切ってくる（1 回ごとに +4 点、+16 まで）
    vital: (e) => G.foeVs.eva(e, "敏捷") + 5 + Math.min(16, 4 * ((G.S && G.S.combat && G.S.combat.vitalN) || 0)),
    mres: (e) => G.foeLv(e) + 1 + G.s5Mod(e.mres || 0),             // 魔法（魔力）
    will: (e) => G.foeLv(e) + 1 + G.s5Mod((e.will || 0) - 30),      // 威圧（魅力）
    flee: (e) => G.foeLv(e) + 1 + G.s5Mod((e.agi || 0) - 10),       // 逃げる（敏捷）
    acc: (e) => G.foeLv(e) - 4 + G.s5Mod((e.hit || 0) - 50),        // 敵の命中（あなたの敏捷と比べる）
  };
  // 敵の攻撃があなたに当たる見込み（％）。extra は今までの命中に足す％（身を守る −20 など）
  G.foeHitChance = (e, extra) => G.clamp(Math.round(G.s5p(G.foeVs.acc(e) + G.s5Mod(extra) - G.statEff("敏捷"))), 5, 95);
  // 仲間の腕前（power。今までの％）を点に。一緒に勝った戦い（b5wins）4 回ごとに 1 点伸びる（30 点まで）
  G.allyLv = (c) => (c.power || 30) / 3 - 4 + Math.min(30, Math.floor((c.b5wins || 0) / 4));
  G.allyPt = (c) => Math.max(1, Math.round(G.allyLv(c)));   // 画面に出す腕前（点）
  G.allyHitChance = (c, e) => G.clamp(Math.round(G.s5p(G.allyLv(c) - (c.fire ? G.foeVs.mres(e) : G.foeVs.eva(e)))), 5, 95);
  G.foeHitAlly = (e, c, extra) => G.clamp(Math.round(G.s5p(G.foeVs.acc(e) + G.s5Mod(extra) - G.allyLv(c))), 5, 95);
  // 体の目盛りで割った能力値（ダメージ・威力の上乗せ。20 点までは今までと同じ）
  const pow = (k, n) => Math.floor(G.s5Pow(G.S.stats[k]) / n);
  G.s5PowOf = pow;

  G.startCombat = (ids, opt) => {
    const S = G.S;
    opt = opt || {};
    if (!ids.length) return;
    const foes = ids.map((id) => {
      const e = D.ENEMIES[id];
      const hp = opt.firstStrike ? Math.ceil(e.hp / 2) : e.hp;
      return { id, name: e.name, hp, max: e.hp };
    });
    // 同じ敵が並ぶときは名前に記号を付ける
    const seen = {};
    foes.forEach((f) => { if (ids.filter((x) => x === f.id).length > 1) { seen[f.id] = (seen[f.id] || 0) + 1; f.name += "ABCDE"[seen[f.id] - 1]; } });
    S.combat = { foes, win: opt.win || null, after: opt.after || null, guard: false, round: 1, boss: ids.some((id) => D.ENEMIES[id].boss) };
    S.mode = "combat";
    S.fac = null;
    G.log("title", "戦闘");
    if (S.combat.boss) bossIntro(ids);
    const names = foes.map((f) => f.name).join("、");
    G.say(G.voiceLine ? G.voiceLine("meet", { foes: names }, `${names}が立ちはだかった！`) : `${names}が立ちはだかった！`); // 語り（D7）
    const first = D.ENEMIES[ids[0]];
    if (first.desc) G.note(first.desc);
    if (opt.firstStrike) G.note("不意を突いた。敵は深手を負っている。");
  };

  // ボスの前口上（data/boss_lines.js）。ボスが並ぶときは先頭のボスが名乗る
  function bossIntro(ids) {
    const id = ids.find((x) => D.ENEMIES[x].boss);
    const B = (D.BOSS_LINES || {})[id];
    if (!B || !B.lines.length) return;
    G.log("nar", G.pick(B.lines), { fx: "boss", foe: id, name: D.ENEMIES[id].name });
  }

  // ---------------------------------------------------------------- 成功率
  G.cb = {
    attack: () => { const w = G.weapon(); const t = G.target(); return G.chance(w.stat, { vs: G.foeVs.eva(G.foeData(t), w.stat) }, w.hit || 0); },
    vital: () => { const w = G.weapon(); const t = G.target(); return G.chance("敏捷", { vs: G.foeVs.vital(G.foeData(t)) }, w.vital || 0); },
    fire: () => { const t = G.target(); return G.chance("魔力", { vs: G.foeVs.mres(G.foeData(t)) }, G.gearBonus("fire") + G.magicBonus()); },
    heal: () => G.chance("魔力", "易しい", G.gearBonus("heal") + G.magicBonus()),   // 場所の上乗せは無い（S5）
    // M1 の術（D.SPELLS）。雷は敵すべてを打つので、いちばん魔法に強い敵で測る
    ice: () => spellChance("ice", G.foeVs.mres(G.foeData(G.target()))),
    bolt: () => spellChance("bolt", Math.max(...G.alive().map((f) => G.foeVs.mres(G.foeData(f))))),
    curse: () => spellChance("curse", G.foeVs.mres(G.foeData(G.target()))),
    ward: () => spellChance("ward", null),
    talk: () => G.chance("魅力", { vs: Math.max(...G.alive().map((f) => G.foeVs.will(G.foeData(f)))) }, G.gearBonus("talk")),
    flee: () => G.chance("敏捷", { vs: Math.max(...G.alive().map((f) => G.foeVs.flee(G.foeData(f)))) }),
  };

  // 術の相手の点（vs。null なら敵と比べない術で、普通の難しさ）に、術の難しさ（sp.diff。今までの％）を足す
  const spellVs = (sp, vs) => ({ vs: (vs == null ? G.s5Target(0) : vs) - G.s5Mod(sp.diff || 0) });
  function spellChance(id, vs) {
    const sp = D.SPELLS[id];
    return G.chance("魔力", spellVs(sp, vs), G.gearBonus(sp.bonus) + G.magicBonus());
  }

  G.combatActions = () => {
    const S = G.S;
    const t = G.target();
    if (!t) return [];
    const w = G.weapon();
    const talkable = G.alive().every((f) => G.foeData(f).will < 999);
    const bribe = G.alive().every((f) => G.foeData(f).bribe) ? G.alive().reduce((a, f) => a + G.foeData(f).bribe, 0) : 0;
    const groups = [
      { title: `攻撃（狙い：${t.name}）`, list: [
        { id: "cb:attack", label: `${w.name}で攻撃`, sub: `${w.stat} ${G.cb.attack()}%`, kw: ["攻撃", "斬", "切", "殴", "突", "叩", "戦"] },
        { id: "cb:vital", label: "急所を狙う", sub: `敏捷 ${G.cb.vital()}%・当たれば2倍`, kw: ["急所", "狙", "喉", "心臓"] },
      ] },
      { title: "魔法", list: [
        { id: "cb:fire", label: "炎の魔法", sub: `魔力 ${G.cb.fire()}%・MP3`, disabled: S.mp < 3, kw: ["魔法", "炎", "火", "燃"] },
        { id: "cb:heal", label: "癒しの奇跡", sub: `魔力 ${G.cb.heal()}%・MP3`, disabled: S.mp < 3, kw: ["回復", "癒", "治"] },
        ...["ice", "bolt", "curse", "ward"].filter((id) => G.knows(id)).map((id) => {
          const sp = D.SPELLS[id];
          return { id: "cb:" + id, label: sp.name, sub: `魔力 ${G.cb[id]()}%・MP${sp.mp}`, disabled: S.mp < sp.mp, kw: sp.kw };
        }),
      ] },
      { title: "口と頭", list: [
        { id: "cb:talk", label: "威圧して追い払う", sub: talkable ? `魅力 ${G.cb.talk()}%` : "話が通じない", disabled: !talkable, kw: ["威圧", "脅", "説得", "交渉", "話", "怒鳴"] },
      ] },
      { title: "その他", list: [
        { id: "cb:guard", label: "身を守る", sub: "受けるダメージ半分", kw: ["守", "防", "構え"] },
        { id: "cb:flee", label: "逃げる", sub: S.combat.boss ? "逃げられない" : `敏捷 ${G.cb.flee()}%`, disabled: S.combat.boss, kw: ["逃", "退", "走"] },
      ] },
    ];
    if (bribe) groups[2].list.push({ id: "cb:bribe", label: `${bribe}G 払って見逃してもらう`, sub: "確実", disabled: S.gold < bribe, kw: ["金", "賄賂", "払"] });
    const items = Object.keys(S.inv).filter((id) => { const it = D.ITEMS[id]; return it && it.type === "use"; });
    if (items.length) {
      groups.push({ title: "道具", list: items.map((id) => {
        const it = D.ITEMS[id];
        const sub = it.hp ? `HP+${it.hp > 100 ? "全快" : it.hp}` : it.mp ? `MP+${it.mp}` : it.escape ? "必ず逃げる" : it.holy ? "不死に大ダメージ" : "";
        return { id: "cb:item:" + id, label: `${it.name}（${S.inv[id]}）`, sub, disabled: !!(it.escape && S.combat.boss), kw: [it.name] };
      }) });
    }
    return groups;
  };

  // ---------------------------------------------------------------- あなたの行動
  function damageFoe(f, n, how) {
    const e = G.foeData(f);
    if (e.majin && !G.weapon().pierce && how !== "holy") {
      const W = (G.wallOf ? G.wallOf(f) : { what: "見えない壁", name: "絶界" }); // E11：絶界は黒鎧だけ。長編の若君は糸の守り
      G.log("nar", `${{ fire: "炎", ice: "冷気", bolt: "雷", curse: "呪い" }[how] || "刃"}は${f.name}の体の手前で、${W.what}に弾かれた。${W.name}だ。`, { fx: "wall", foe: f.name });
      return;
    }
    if (G.cbDmgMod) n = Math.max(0, Math.round(G.cbDmgMod(f, n, how)));
    f.hp = Math.max(0, f.hp - n);
    G.log("sys", `${f.name}に ${n} のダメージ（残り ${f.hp}/${f.max}）`, { fx: "hit", foe: f.name, n });
    if (f.hp <= 0) onFoeDown(f);
  }
  G.cbDamage = (f, n, how) => damageFoe(f, n, how);
  function onFoeDown(f) {
    const S = G.S;
    G.log("nar", `${f.name}を倒した！`, { fx: "down", foe: f.name, boss: !!G.foeData(f).boss });
    S.counters.kills++;
    S.quests.forEach((q) => {
      if (q.type === "hunt" && !q.done && q.target === f.id && q.loc === S.loc) {
        q.progress++;
        if (q.progress >= q.need) { q.done = true; G.note(`依頼「${q.title}」を達成した。ギルドに報告しよう。`); }
      }
    });
  }

  G.combatAct = (arg) => {
    const S = G.S;
    const C = S.combat;
    const t = G.target();
    if (!C || !t) return;
    C.guard = false;
    const w = G.weapon();
    const [kind, itemId, tgt] = arg.split(":");
    // B5：回復を仲間に使う（"heal:<仲間の id>"・"item:<品>:<仲間の id>"）
    const ally = (id) => (id && id !== "you" ? S.companions.find((c) => c.id === id) || null : null);
    if (kind === "attack") {
      G.log("you", `${w.name}で${t.name}に${G.e12 ? G.e12.verb(w) : "斬りかかる"}`);
      const r = G.check(w.stat, { vs: G.foeVs.eva(G.foeData(t), w.stat) }, "攻撃", w.hit || 0);
      if (r.ok) {
        let dmg = G.dice(w.dmg) + (w.stat === "筋力" ? pow("筋力", 15) : pow("敏捷", 20));
        if (r.crit) { dmg *= 2; G.log("nar", "会心の一撃！", { fx: "crit" }); }
        damageFoe(t, dmg, "blade");
      } else G.say(r.fumble ? "足を滑らせ、大きな隙をさらした。" : "攻撃は空を切った。");
      if (r.fumble) C.exposed = true;
    } else if (kind === "vital") {
      G.log("you", `${t.name}の急所を狙う`);
      const r = G.check("敏捷", { vs: G.foeVs.vital(G.foeData(t)) }, "急所狙い", w.vital || 0);
      C.vitalN = (C.vitalN || 0) + 1;
      if (C.vitalN === 2) G.note(`${t.name}は、急所を狙う手を見切りはじめた。`);
      if (r.ok) {
        const dmg = (G.dice(w.dmg) + pow("敏捷", 15)) * (r.crit ? 3 : 2);
        G.log("nar", "刃が急所を捉えた！", { fx: "crit" });
        damageFoe(t, dmg, "blade");
      } else G.say("急所を外した。");
      if (r.fumble) C.exposed = true;
    } else if (kind === "fire") {
      S.mp -= 3;
      G.log("you", `${t.name}に炎の魔法を放つ`);
      const r = G.check("魔力", { vs: G.foeVs.mres(G.foeData(t)) }, "炎の魔法", G.gearBonus("fire") + G.magicBonus());
      if (r.ok) {
        let dmg = G.dice([2, 6, 0]) + pow("魔力", 8);
        if (r.crit) dmg = Math.floor(dmg * 1.5);
        G.say("炎が渦を巻いて敵を包んだ。");
        damageFoe(t, dmg, "fire");
      } else G.say(r.fumble ? "魔力が暴発し、手が焼けた。" : "炎は形になる前に消えた。");
      if (r.fumble) G.hurt(3, "自分の魔法で焼け死んだ");
    } else if (kind === "heal") {
      S.mp -= 3;
      const c = ally(itemId);
      G.log("you", c ? `${G.m2Short(c)}に癒しの奇跡を祈る` : "癒しの奇跡を祈る");
      const r = G.check("魔力", "易しい", "癒しの奇跡", G.gearBonus("heal") + G.magicBonus());
      if (r.ok) { const n = G.dice([2, 6, 2]) + pow("魔力", 10); if (c) G.b5Heal(c, n); else { G.heal(n); G.note(`HP +${n}`); } }
      else G.say("祈りは届かなかった。");
    } else if (G.cbActs[kind]) {
      G.cbActs[kind](t, itemId, tgt);
    } else if (D.SPELLS && D.SPELLS[kind] && !D.SPELLS[kind].base) {
      castSpell(kind, t);
    } else if (kind === "talk") {
      G.log("you", "敵を威圧する");
      const worst = Math.max(...G.alive().map((f) => G.foeVs.will(G.foeData(f))));
      const r = G.check("魅力", { vs: worst }, "威圧", G.gearBonus("talk"));
      if (r.ok) { G.say("あなたの気迫に、敵は武器を捨てて逃げ出した。"); G.addFame(1); return endCombat("scared"); }
      G.say("敵は鼻で笑った。");
    } else if (kind === "bribe") {
      const cost = G.alive().reduce((a, f) => a + G.foeData(f).bribe, 0);
      S.gold -= cost;
      G.log("you", `${cost}G を差し出す`);
      G.say("相手は金を数えると、にやりと笑って去っていった。");
      return endCombat("bribed");
    } else if (kind === "guard") {
      G.log("you", "身を守る");
      C.guard = true;
    } else if (kind === "flee") {
      G.log("you", "逃げる");
      const fast = Math.max(...G.alive().map((f) => G.foeVs.flee(G.foeData(f))));
      const r = G.check("敏捷", { vs: fast }, "逃走");
      if (r.ok) { G.say(G.voiceLine ? G.voiceLine("fled", null, "うまく逃げ切った。") : "うまく逃げ切った。"); return endCombat("fled"); }
      G.say("回り込まれた！");
    } else if (kind === "item") {
      const it = D.ITEMS[itemId];
      const c = it && it.hp ? ally(tgt) : null;
      if (!it || !G.take(itemId)) return;
      G.log("you", c ? `${G.m2Short(c)}に${it.name}を使う` : `${it.name}を使う`);
      if (it.escape) { G.say("煙が立ちこめ、その隙に逃げ出した。"); return endCombat("fled"); }
      if (it.holy) {
        if (G.foeData(t).undead) { G.say("聖水が不浄の肉を焼いた！"); damageFoe(t, G.dice([3, 6, 2]), "holy"); }
        else G.say("聖水をかけたが、ただ濡れただけだった。");
      }
      if (it.hp && c) G.b5Heal(c, it.hp);
      else if (it.hp) { G.heal(it.hp); G.note(it.hp > 100 ? "HP が全快した。" : `HP +${it.hp}`); }
      if (it.mp) { S.mp = Math.min(S.maxMp, S.mp + it.mp); G.note(it.mp > 100 ? "MP が全快した。" : `MP +${it.mp}`); }
    }
    if (G.cbAfterAct && !S.over && S.combat === C) G.cbAfterAct(kind, t); // こちらの手のあと、仲間と敵の手番の前（I2 の二刀の左手の一撃）
    if (S.over) return;
    if (!G.alive().length) return endCombat("win");
    companionsTurn();
    if (!G.alive().length) return endCombat("win");
    foesTurn();
    if (S.over) return;
    if (!G.alive().length) return endCombat("win"); // 呪いで倒れることがある
    if (S.weapon === "volgrim" && G.rand() < 0.2) G.say(G.pick(VOLGRIM_LINES));
    else if (S.weapon === "byakuya" && G.rand() < 0.2) G.say(G.pick(BYAKUYA_LINES));
    C.round++;
  };

  // M1 の術。大失敗すると、借りた力の代償を払う（G.payDebt）
  function castSpell(id, t) {
    const S = G.S;
    const C = S.combat;
    const sp = D.SPELLS[id];
    S.mp -= sp.mp;
    const bonus = G.gearBonus(sp.bonus) + G.magicBonus();
    if (id === "ice") {
      G.log("you", `${t.name}に氷の魔法を放つ`);
      const r = G.check("魔力", spellVs(sp, G.foeVs.mres(G.foeData(t))), sp.name, bonus);
      if (r.ok) {
        const dmg = G.dice([1, 6, 0]) + pow("魔力", 10);
        G.say("白い霜が敵の足元から這い上がった。");
        damageFoe(t, dmg, "ice");
        if (t.hp > 0 && !(G.foeData(t).majin && !G.weapon().pierce)) { t.frozen = r.crit ? 2 : 1; G.note(`${t.name}は凍りついて動けない。`); }
      } else G.say(r.fumble ? "冷気が逆流し、指先が凍りついた。" : "吐く息が白くなっただけだった。");
      if (r.fumble) { G.hurt(2, "自分の氷で凍え死んだ"); G.payDebt(sp.debt); }
    } else if (id === "bolt") {
      G.log("you", "雷の魔法を呼ぶ");
      const res = Math.max(...G.alive().map((f) => G.foeVs.mres(G.foeData(f))));
      const r = G.check("魔力", spellVs(sp, res), sp.name, bonus);
      if (r.ok) {
        G.say("空が裂け、稲妻が敵の頭上に次々と落ちた。");
        G.alive().forEach((f) => { const dmg = G.dice([2, 4, 0]) + pow("魔力", 12); damageFoe(f, r.crit ? dmg * 2 : dmg, "bolt"); });
      } else G.say(r.fumble ? "稲妻は、呼んだ者の頭に落ちた。" : "遠くで雷が鳴っただけだった。");
      if (r.fumble) { G.hurt(4, "自分の雷に打たれた"); G.payDebt(sp.debt); }
    } else if (id === "curse") {
      G.log("you", `${t.name}に呪いの言葉を吐く`);
      const r = G.check("魔力", spellVs(sp, G.foeVs.mres(G.foeData(t))), sp.name, bonus);
      if (r.ok) {
        if (G.foeData(t).majin && !G.weapon().pierce) G.say(`呪いの言葉は、${t.name}の手前で霧のように散った。${(G.wallOf ? G.wallOf(t) : { name: "絶界" }).name}だ。`);
        else { t.hex = r.crit ? 5 : 3; G.say(`${t.name}の影が、ぐにゃりと歪んだ。`); G.note(`${t.name}は呪われた（${t.hex}手番・命中が落ち、少しずつ蝕まれる）`); }
      } else G.say(r.fumble ? "言葉が口の中で裏返り、自分の舌を噛んだ。" : "言葉は届かなかった。");
      if (r.fumble) { if (!S.conds.includes("呪い")) { S.conds.push("呪い"); G.note("状態：呪い"); } G.payDebt(sp.debt); }
    } else if (id === "ward") {
      G.log("you", "加護を祈る");
      const r = G.check("魔力", spellVs(sp, null), sp.name, bonus);
      if (r.ok) { C.ward = r.crit ? 5 : 3; G.say("淡い光の垣根が、あなたの周りに立ち上がった。"); G.note(`加護（${C.ward}手番・受けるダメージ -${wardCut()}）`); }
      else G.say(r.fumble ? "垣根は立ち上がりかけて、あなたの上に崩れ落ちた。" : "祈りは、どこにも届かなかった。");
      if (r.fumble) G.payDebt(sp.debt);
    }
  }
  const wardCut = () => 2 + pow("魔力", 20);

  // ---------------------------------------------------------------- 仲間と敵の番
  // B5：戦闘不能（HP 0）の仲間は動かない。回復役は、いちばん減っている味方（戦闘不能を先に）を治す
  // 仲間の手当て：いちばん減っている味方（戦闘不能を先に）が ratio を下回っていれば治す。治したら true
  function allyHeal(c, ratio) {
    const need = c.heal ? G.b5Neediest() : null;
    if (!need || !(need.ratio < ratio)) return false;
    const n = G.d(6) + 2;
    if (need.who === "you") { G.heal(n); G.note(`${c.name}の治療 HP +${n}`); }
    else G.b5Heal(need.who, n, need.who === c ? `${c.name}の手当て` : `${c.name}の治療`);
    return true;
  }
  // 仲間の一撃（絶界に弾かれる・当たる・外れる）
  function allyStrike(c, f, e) {
    if (e.majin && !G.weapon().pierce) { G.log("sys", `${c.name}の攻撃は${(G.wallOf ? G.wallOf(f) : { what: "見えない壁", name: "絶界" }).name}に弾かれた。`, { fx: "wall", foe: f.name }); return; }
    const chance = G.allyHitChance(c, e);
    if (G.d(100) <= chance) {
      let dmg = (c.fire ? G.dice([2, 6, 0]) : G.d(6)) + c.dmg;
      if (G.cbAllyDmg) dmg = G.cbAllyDmg(c, f, dmg); // E12：仲間の武器の種類と、敵の耐性・弱点
      f.hp = Math.max(0, f.hp - dmg);
      G.log("sys", `${c.name}の${c.fire ? "魔法" : "攻撃"}が${f.name}に ${dmg} のダメージ（残り ${f.hp}/${f.max}）`, { fx: "hit", foe: f.name, n: dmg });
      if (f.hp <= 0) onFoeDown(f);
    } else G.note(`${c.name}の攻撃は外れた。`);
  }
  G.cbAllyHeal = allyHeal;
  G.cbAllyStrike = allyStrike;
  function companionsTurn() {
    const S = G.S;
    S.companions.forEach((c) => {
      const foes = G.alive();
      if (!foes.length || G.b5Down(c)) return;
      // F3：あなたの指示・作戦（engine/zzzzzzzzzzzz_f3_orders.js）。true ならこの仲間の手番は済んだ
      if (G.cbAllyOrder && G.cbAllyOrder(c, foes)) return;
      if (allyHeal(c, 0.5)) return;
      const f = G.pick(foes);
      const e = G.foeData(f);
      // F2：まるで歯が立たない相手には、斬りかからずに援護する（庇う・牽制。engine/zzzzzzzzzzz_f2_party.js）
      if (G.cbAllyAssist && G.cbAllyAssist(c, f, e)) return;
      allyStrike(c, f, e);
    });
  }

  // B5：敵は主人公と立っている仲間から狙いを選ぶ（重み：主人公 3・前に立つ者 3・ほか 2・術師 1.2。G.b5）
  function aimOf() {
    const S = G.S;
    const list = G.b5Standing(S);
    if (!list.length) return null;
    const w = list.map((c) => G.b5.KIND[G.b5.kind(c)].aim);
    let r = G.rand() * (G.b5.HERO_AIM + w.reduce((a, b) => a + b, 0)) - G.b5.HERO_AIM;
    if (r < 0) return null;
    for (let i = 0; i < list.length; i++) { r -= w[i]; if (r < 0) return list[i]; }
    return list[list.length - 1];
  }
  function hitAlly(f, e, c, hexed, mv) {
    const C = G.S.combat;
    const chance = G.foeHitAlly(e, c, (hexed ? -20 : 0) + ((mv && mv.hit) || 0));
    if (G.d(100) > chance) { G.note(`${c.name}は${f.name}の攻撃をかわした。`); if (mv && G.cbStruck) G.cbStruck(f, e, mv, c, 0); return; }
    let dmg = Math.round(G.dice(e.dmg) * ((mv && mv.mul) || 1)) - (e.magic || (mv && mv.pierce) ? 0 : G.b5Def(c));
    if (C.ward > 0) dmg -= wardCut();
    if (G.cbAllyHurt) dmg = G.cbAllyHurt(c, dmg); // F3：下がっている仲間は受ける傷が減る
    dmg = Math.max(1, dmg);
    c.hp = Math.max(0, c.hp - dmg);
    G.log("nar", `${f.name}の${e.magic ? "呪い" : "攻撃"}！ ${c.name}に ${dmg} のダメージ（残り ${c.hp}/${G.b5Max(c)}）`, { fx: "ally", who: c.name, n: dmg });
    if (c.hp <= 0) G.b5Fall(c, f);
    if (mv && G.cbStruck) G.cbStruck(f, e, mv, c, dmg);
  }

  // 一行をなぎ払う（使徒の余波）：立っている仲間それぞれに、少し弱い一撃
  function sweep(f, e) {
    G.say(`${f.name}の一撃の余波が、一行をなぎ払った！`);
    G.b5Standing(G.S).forEach((c) => {
      if (G.d(100) > G.foeHitAlly(e, c)) { G.note(`${c.name}は身を伏せて、余波をかわした。`); return; }
      let dmg = Math.ceil(G.dice(e.dmg) * 0.6) - G.b5Def(c);
      if (G.cbAllyHurt) dmg = G.cbAllyHurt(c, dmg);
      dmg = Math.max(1, dmg);
      c.hp = Math.max(0, c.hp - dmg);
      G.log("nar", `${c.name}に ${dmg} のダメージ（残り ${c.hp}/${G.b5Max(c)}）`, { fx: "ally", who: c.name, n: dmg });
      if (c.hp <= 0) G.b5Fall(c, f);
    });
  }

  function foesTurn() {
    const S = G.S;
    const C = S.combat;
    const armor = G.armor();
    G.alive().forEach((f) => {
      if (S.over) return;
      const e = G.foeData(f);
      const hexed = f.hex > 0;
      if (hexed) {
        f.hex--;
        G.note(`呪いが${f.name}を蝕む。`);
        damageFoe(f, G.d(4) + pow("魔力", 20), "curse");
        if (f.hp <= 0) return;
      }
      if (f.frozen > 0) { f.frozen--; G.note(`${f.name}は凍りついたまま動けない。`); return; }
      // F1：この手番の動き（溜め・構え・連撃・大技）。skip なら殴ってこない
      const mv = G.cbMove ? G.cbMove(f, e) : null;
      if (mv && mv.text) G.say(mv.text);
      if (mv && mv.skip) return;
      // 使徒（絶界を持つ者）は、あなただけを狙う。仲間は余波でなぎ払われる（下の sweep）
      //（絶界を破る剣を持つと e.majin は消えるので、もとのデータと E3 の印で見る）
      const apostle = !!(f.e3 || (D.ENEMIES[f.id] && D.ENEMIES[f.id].majin));
      const times = (mv && mv.times) || 1;
      for (let i = 0; i < times && !S.over && f.hp > 0; i++) {
        const ally = apostle || (mv && mv.you) ? null : aimOf();
        if (ally) { hitAlly(f, e, ally, hexed, mv); continue; }
        if (apostle && G.b5Standing(S).length && G.rand() < 0.35) sweep(f, e);
        if (C.f1dodge) {
          C.f1dodge = false;
          G.say(`${f.name}の${mv && mv.mul > 1.5 ? "大技" : "一撃"}を、紙一重で躱した。`);
          if (G.cbStruck) G.cbStruck(f, e, mv, null, 0, "dodged");
          continue;
        }
        const chance = G.foeHitChance(e, -(C.guard && !(mv && mv.through) ? 20 : 0) + (C.exposed ? 20 : 0) - (hexed ? 20 : 0) + ((mv && mv.hit) || 0));
        if (G.d(100) <= chance) {
          let dmg = Math.round(G.dice(e.dmg) * ((mv && mv.mul) || 1)) - (e.magic || (mv && mv.pierce) ? 0 : (armor ? armor.def : 0));
          if (C.guard) dmg = Math.floor(dmg / ((mv && mv.guardDiv) || 2));
          if (C.ward > 0) dmg -= wardCut();
          dmg = Math.max(1, dmg);
          if (G.cbHurtMod) dmg = Math.max(1, G.cbHurtMod(f, e, dmg, mv)); // E12b：敵の攻め手の種類と、こちらの防具の効き目
          if (G.cbCover) dmg = Math.max(1, G.cbCover(f, e, dmg, mv)); // F2：仲間が庇って一部を受ける
          G.log("nar", `${f.name}の${e.magic ? "呪い" : (mv && mv.name) || "攻撃"}！ ${dmg} のダメージ。`, { fx: "hurt", n: dmg, heavy: dmg >= S.maxHp / 4 });
          G.hurt(dmg, `${f.name}に倒された`);
          if (G.cbStruck) G.cbStruck(f, e, mv, null, dmg);
        } else { G.note(`${f.name}の攻撃をかわした。`); if (G.cbStruck) G.cbStruck(f, e, mv, null, 0); }
      }
    });
    C.f1dodge = false;
    C.exposed = false;
    if (C.ward > 0 && --C.ward === 0) G.note("加護の光が消えた。");
  }

  // ---------------------------------------------------------------- 戦闘の終わり
  function endCombat(how) {
    const S = G.S;
    const C = S.combat;
    S.combat = null;
    S.mode = "explore";
    if (G.b5AfterCombat) G.b5AfterCombat(how);
    if (how === "win") {
      const after = G.voiceLine && G.voiceLine("win", null, ""); // 語り（D7）
      if (after) G.say(after);
      let gold = 0;
      let fame = 0;
      C.foes.forEach((f) => {
        const e = D.ENEMIES[f.id];
        gold += e.gold[0] + Math.floor(G.rand() * (e.gold[1] - e.gold[0] + 1));
        fame += e.tier;
        (e.loot || []).forEach(([id, p]) => { if (G.rand() < p && G.give(id)) G.note(`${G.itemInfo(id).name}を手に入れた。`); });
        if (e.boss) S.counters.bosses++;
      });
      G.addFame(fame);
      // 出来事の戦いの報酬の金（C.win.gold）は、落とした金と合わせて一行で言う（「11G を手に入れた」「所持金 +12G」と二度に分けない。R7）
      const won = C.win && C.win.gold > 0 ? C.win.gold : 0;
      if (C.win) G.apply(won ? Object.assign({}, C.win, { gold: 0 }) : C.win);
      if (gold + won && !S.over) { S.gold += gold + won; G.note(`${gold + won}G を手に入れた。`); }
    }
    if (S.over) return;
    if (C.after === "arrive" && S.travel) G.arrive(S.travel);
  }
  G._endCombat = endCombat;
})(globalThis.G = globalThis.G || {});
