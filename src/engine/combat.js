// 戦闘。1手番ずつ：あなた → 仲間 → 敵。成功率はすべて能力値から決まる。レーン B（戦闘）が管理
// 演出（B1）：画面が描けるよう、記録に fx を添える。DOM には触らない。
//   { fx: "hit", foe: 名前, n } 敵にダメージ / { fx: "down", foe, boss } 敵が倒れた / { fx: "wall", foe } 絶界に弾かれた
//   { fx: "hurt", n, heavy } あなたがダメージ / { fx: "crit" } 会心・急所 / { fx: "boss", foe: id, name } ボスの前口上（D.BOSS_LINES）
(function (G) {
  const D = G.data;

  const VOLGRIM_LINES = [
    "ヴォルグリム「おい、腰が引けてるぞ。もっと深く踏み込め」",
    "ヴォルグリム「雑魚に手こずってんじゃねえ。俺が泣くぞ」",
    "ヴォルグリム「……血の味が薄いな。もっとマシな獲物はいねえのか」",
    "ヴォルグリム「死ぬなよ。お前が死んだら、次の持ち主を探すのが面倒だ」",
  ];

  G.alive = () => (G.S.combat ? G.S.combat.foes.filter((f) => f.hp > 0) : []);
  G.target = () => G.alive()[0];
  G.foeData = (f) => D.ENEMIES[f.id];

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
    G.say(`${foes.map((f) => f.name).join("、")}が立ちはだかった！`);
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
    attack: () => { const w = G.weapon(); const t = G.target(); return G.chance(w.stat, 0, (w.hit || 0) - G.foeData(t).def); },
    vital: () => { const w = G.weapon(); const t = G.target(); return G.chance("敏捷", -15, (w.vital || 0) - G.foeData(t).def); },
    fire: () => { const t = G.target(); return G.chance("魔力", 0, G.gearBonus("fire") + G.magicBonus() - G.foeData(t).mres); },
    heal: () => G.chance("魔力", "易しい", G.gearBonus("heal") + G.magicBonus()),
    // M1 の術（D.SPELLS）。雷は敵すべてを打つので、いちばん魔法に強い敵で測る
    ice: () => spellChance("ice", G.foeData(G.target()).mres),
    bolt: () => spellChance("bolt", Math.max(...G.alive().map((f) => G.foeData(f).mres))),
    curse: () => spellChance("curse", G.foeData(G.target()).mres),
    ward: () => spellChance("ward", 0),
    talk: () => { const worst = Math.max(...G.alive().map((f) => G.foeData(f).will)); return G.chance("魅力", 30 - worst, G.gearBonus("talk")); },
    flee: () => { const fast = Math.max(...G.alive().map((f) => G.foeData(f).agi)); return G.chance("敏捷", 10 - fast); },
  };

  function spellChance(id, res) {
    const sp = D.SPELLS[id];
    return G.chance("魔力", sp.diff || 0, G.gearBonus(sp.bonus) + G.magicBonus() - res);
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
      G.log("nar", `${{ fire: "炎", ice: "冷気", bolt: "雷", curse: "呪い" }[how] || "刃"}は${f.name}の体の手前で、見えない壁に弾かれた。絶界だ。`, { fx: "wall", foe: f.name });
      return;
    }
    f.hp = Math.max(0, f.hp - n);
    G.log("sys", `${f.name}に ${n} のダメージ（残り ${f.hp}/${f.max}）`, { fx: "hit", foe: f.name, n });
    if (f.hp <= 0) onFoeDown(f);
  }
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
    const [kind, itemId] = arg.split(":");
    if (kind === "attack") {
      G.log("you", `${w.name}で${t.name}に斬りかかる`);
      const r = G.check(w.stat, 0, "攻撃", (w.hit || 0) - G.foeData(t).def);
      if (r.ok) {
        let dmg = G.dice(w.dmg) + (w.stat === "筋力" ? Math.floor(S.stats.筋力 / 15) : Math.floor(S.stats.敏捷 / 20));
        if (r.crit) { dmg *= 2; G.log("nar", "会心の一撃！", { fx: "crit" }); }
        damageFoe(t, dmg, "blade");
      } else G.say(r.fumble ? "足を滑らせ、大きな隙をさらした。" : "攻撃は空を切った。");
      if (r.fumble) C.exposed = true;
    } else if (kind === "vital") {
      G.log("you", `${t.name}の急所を狙う`);
      const r = G.check("敏捷", -15, "急所狙い", (w.vital || 0) - G.foeData(t).def);
      if (r.ok) {
        const dmg = (G.dice(w.dmg) + Math.floor(S.stats.敏捷 / 15)) * (r.crit ? 3 : 2);
        G.log("nar", "刃が急所を捉えた！", { fx: "crit" });
        damageFoe(t, dmg, "blade");
      } else G.say("急所を外した。");
      if (r.fumble) C.exposed = true;
    } else if (kind === "fire") {
      S.mp -= 3;
      G.log("you", `${t.name}に炎の魔法を放つ`);
      const r = G.check("魔力", 0, "炎の魔法", G.gearBonus("fire") + G.magicBonus() - G.foeData(t).mres);
      if (r.ok) {
        let dmg = G.dice([2, 6, 0]) + Math.floor(S.stats.魔力 / 8);
        if (r.crit) dmg = Math.floor(dmg * 1.5);
        G.say("炎が渦を巻いて敵を包んだ。");
        damageFoe(t, dmg, "fire");
      } else G.say(r.fumble ? "魔力が暴発し、手が焼けた。" : "炎は形になる前に消えた。");
      if (r.fumble) G.hurt(3, "自分の魔法で焼け死んだ");
    } else if (kind === "heal") {
      S.mp -= 3;
      G.log("you", "癒しの奇跡を祈る");
      const r = G.check("魔力", "易しい", "癒しの奇跡", G.gearBonus("heal") + G.magicBonus());
      if (r.ok) { const n = G.dice([2, 6, 2]) + Math.floor(S.stats.魔力 / 10); G.heal(n); G.note(`HP +${n}`); }
      else G.say("祈りは届かなかった。");
    } else if (D.SPELLS && D.SPELLS[kind] && !D.SPELLS[kind].base) {
      castSpell(kind, t);
    } else if (kind === "talk") {
      G.log("you", "敵を威圧する");
      const worst = Math.max(...G.alive().map((f) => G.foeData(f).will));
      const r = G.check("魅力", 30 - worst, "威圧", G.gearBonus("talk"));
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
      const fast = Math.max(...G.alive().map((f) => G.foeData(f).agi));
      const r = G.check("敏捷", 10 - fast, "逃走");
      if (r.ok) { G.say("うまく逃げ切った。"); return endCombat("fled"); }
      G.say("回り込まれた！");
    } else if (kind === "item") {
      const it = D.ITEMS[itemId];
      if (!it || !G.take(itemId)) return;
      G.log("you", `${it.name}を使う`);
      if (it.escape) { G.say("煙が立ちこめ、その隙に逃げ出した。"); return endCombat("fled"); }
      if (it.holy) {
        if (G.foeData(t).undead) { G.say("聖水が不浄の肉を焼いた！"); damageFoe(t, G.dice([3, 6, 2]), "holy"); }
        else G.say("聖水をかけたが、ただ濡れただけだった。");
      }
      if (it.hp) { G.heal(it.hp); G.note(it.hp > 100 ? "HP が全快した。" : `HP +${it.hp}`); }
      if (it.mp) { S.mp = Math.min(S.maxMp, S.mp + it.mp); G.note(it.mp > 100 ? "MP が全快した。" : `MP +${it.mp}`); }
    }
    if (S.over) return;
    if (!G.alive().length) return endCombat("win");
    companionsTurn();
    if (!G.alive().length) return endCombat("win");
    foesTurn();
    if (S.over) return;
    if (!G.alive().length) return endCombat("win"); // 呪いで倒れることがある
    if (S.weapon === "volgrim" && G.rand() < 0.2) G.say(G.pick(VOLGRIM_LINES));
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
      const r = G.check("魔力", sp.diff, sp.name, bonus - G.foeData(t).mres);
      if (r.ok) {
        const dmg = G.dice([1, 6, 0]) + Math.floor(S.stats.魔力 / 10);
        G.say("白い霜が敵の足元から這い上がった。");
        damageFoe(t, dmg, "ice");
        if (t.hp > 0 && !(G.foeData(t).majin && !G.weapon().pierce)) { t.frozen = r.crit ? 2 : 1; G.note(`${t.name}は凍りついて動けない。`); }
      } else G.say(r.fumble ? "冷気が逆流し、指先が凍りついた。" : "吐く息が白くなっただけだった。");
      if (r.fumble) { G.hurt(2, "自分の氷で凍え死んだ"); G.payDebt(sp.debt); }
    } else if (id === "bolt") {
      G.log("you", "雷の魔法を呼ぶ");
      const res = Math.max(...G.alive().map((f) => G.foeData(f).mres));
      const r = G.check("魔力", sp.diff, sp.name, bonus - res);
      if (r.ok) {
        G.say("空が裂け、稲妻が敵の頭上に次々と落ちた。");
        G.alive().forEach((f) => { const dmg = G.dice([2, 4, 0]) + Math.floor(S.stats.魔力 / 12); damageFoe(f, r.crit ? dmg * 2 : dmg, "bolt"); });
      } else G.say(r.fumble ? "稲妻は、呼んだ者の頭に落ちた。" : "遠くで雷が鳴っただけだった。");
      if (r.fumble) { G.hurt(4, "自分の雷に打たれた"); G.payDebt(sp.debt); }
    } else if (id === "curse") {
      G.log("you", `${t.name}に呪いの言葉を吐く`);
      const r = G.check("魔力", sp.diff, sp.name, bonus - G.foeData(t).mres);
      if (r.ok) {
        if (G.foeData(t).majin && !G.weapon().pierce) G.say(`呪いの言葉は、${t.name}の手前で霧のように散った。絶界だ。`);
        else { t.hex = r.crit ? 5 : 3; G.say(`${t.name}の影が、ぐにゃりと歪んだ。`); G.note(`${t.name}は呪われた（${t.hex}手番・命中が落ち、少しずつ蝕まれる）`); }
      } else G.say(r.fumble ? "言葉が口の中で裏返り、自分の舌を噛んだ。" : "言葉は届かなかった。");
      if (r.fumble) { if (!S.conds.includes("呪い")) { S.conds.push("呪い"); G.note("状態：呪い"); } G.payDebt(sp.debt); }
    } else if (id === "ward") {
      G.log("you", "加護を祈る");
      const r = G.check("魔力", sp.diff, sp.name, bonus);
      if (r.ok) { C.ward = r.crit ? 5 : 3; G.say("淡い光の垣根が、あなたの周りに立ち上がった。"); G.note(`加護（${C.ward}手番・受けるダメージ -${wardCut()}）`); }
      else G.say(r.fumble ? "垣根は立ち上がりかけて、あなたの上に崩れ落ちた。" : "祈りは、どこにも届かなかった。");
      if (r.fumble) G.payDebt(sp.debt);
    }
  }
  const wardCut = () => 2 + Math.floor(G.S.stats.魔力 / 20);

  // ---------------------------------------------------------------- 仲間と敵の番
  function companionsTurn() {
    const S = G.S;
    S.companions.forEach((c) => {
      const foes = G.alive();
      if (!foes.length) return;
      if (c.heal && S.hp < S.maxHp / 2) {
        const n = G.d(6) + 2;
        G.heal(n);
        G.note(`${c.name}の治療 HP +${n}`);
        return;
      }
      const f = G.pick(foes);
      const e = G.foeData(f);
      if (e.majin && !G.weapon().pierce) { G.log("sys", `${c.name}の攻撃は絶界に弾かれた。`, { fx: "wall", foe: f.name }); return; }
      const chance = G.clamp(c.power - (c.fire ? e.mres : e.def), 5, 95);
      if (G.d(100) <= chance) {
        const dmg = (c.fire ? G.dice([2, 6, 0]) : G.d(6)) + c.dmg;
        f.hp = Math.max(0, f.hp - dmg);
        G.log("sys", `${c.name}の${c.fire ? "魔法" : "攻撃"}が${f.name}に ${dmg}`, { fx: "hit", foe: f.name, n: dmg });
        if (f.hp <= 0) onFoeDown(f);
      } else G.note(`${c.name}の攻撃は外れた。`);
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
        damageFoe(f, G.d(4) + Math.floor(S.stats.魔力 / 20), "curse");
        if (f.hp <= 0) return;
      }
      if (f.frozen > 0) { f.frozen--; G.note(`${f.name}は凍りついたまま動けない。`); return; }
      let chance = e.hit - Math.floor(G.statEff("敏捷") / 5) - (C.guard ? 20 : 0) + (C.exposed ? 20 : 0) - (hexed ? 20 : 0);
      chance = G.clamp(chance, 5, 95);
      if (G.d(100) <= chance) {
        let dmg = G.dice(e.dmg) - (e.magic ? 0 : (armor ? armor.def : 0));
        if (C.guard) dmg = Math.floor(dmg / 2);
        if (C.ward > 0) dmg -= wardCut();
        dmg = Math.max(1, dmg);
        G.log("nar", `${f.name}の${e.magic ? "呪い" : "攻撃"}！ ${dmg} のダメージ。`, { fx: "hurt", n: dmg, heavy: dmg >= S.maxHp / 4 });
        G.hurt(dmg, `${f.name}に倒された`);
      } else G.note(`${f.name}の攻撃をかわした。`);
    });
    C.exposed = false;
    if (C.ward > 0 && --C.ward === 0) G.note("加護の光が消えた。");
  }

  // ---------------------------------------------------------------- 戦闘の終わり
  function endCombat(how) {
    const S = G.S;
    const C = S.combat;
    S.combat = null;
    S.mode = "explore";
    if (how === "win") {
      let gold = 0;
      let fame = 0;
      C.foes.forEach((f) => {
        const e = D.ENEMIES[f.id];
        gold += e.gold[0] + Math.floor(G.rand() * (e.gold[1] - e.gold[0] + 1));
        fame += e.tier;
        (e.loot || []).forEach(([id, p]) => { if (G.rand() < p && G.give(id)) G.note(`${G.itemInfo(id).name}を手に入れた。`); });
        if (e.boss) S.counters.bosses++;
      });
      if (gold) { S.gold += gold; G.note(`${gold}G を手に入れた。`); }
      G.addFame(fame);
      if (C.win) G.apply(C.win);
    }
    if (S.over) return;
    if (C.after === "arrive" && S.travel) G.arrive(S.travel);
  }
  G._endCombat = endCombat;
})(globalThis.G = globalThis.G || {});
