// 戦闘。1手番ずつ：あなた → 仲間 → 敵。成功率はすべて能力値から決まる。レーン B（戦闘）が管理
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
    G.say(`${foes.map((f) => f.name).join("、")}が立ちはだかった！`);
    const first = D.ENEMIES[ids[0]];
    if (first.desc) G.note(first.desc);
    if (opt.firstStrike) G.note("不意を突いた。敵は深手を負っている。");
  };

  // ---------------------------------------------------------------- 成功率
  G.cb = {
    attack: () => { const w = G.weapon(); const t = G.target(); return G.chance(w.stat, 0, (w.hit || 0) - G.foeData(t).def); },
    vital: () => { const w = G.weapon(); const t = G.target(); return G.chance("敏捷", -15, (w.vital || 0) - G.foeData(t).def); },
    fire: () => { const t = G.target(); return G.chance("魔力", 0, G.gearBonus("fire") + G.magicBonus() - G.foeData(t).mres); },
    heal: () => G.chance("魔力", "易しい", G.gearBonus("heal") + G.magicBonus()),
    talk: () => { const worst = Math.max(...G.alive().map((f) => G.foeData(f).will)); return G.chance("魅力", 30 - worst, G.gearBonus("talk")); },
    flee: () => { const fast = Math.max(...G.alive().map((f) => G.foeData(f).agi)); return G.chance("敏捷", 10 - fast); },
  };

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
      G.say(`${how === "fire" ? "炎" : "刃"}は${f.name}の体の手前で、見えない壁に弾かれた。絶界だ。`);
      return;
    }
    f.hp = Math.max(0, f.hp - n);
    G.note(`${f.name}に ${n} のダメージ（残り ${f.hp}/${f.max}）`);
    if (f.hp <= 0) onFoeDown(f);
  }
  function onFoeDown(f) {
    const S = G.S;
    G.say(`${f.name}を倒した！`);
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
        if (r.crit) { dmg *= 2; G.say("会心の一撃！"); }
        damageFoe(t, dmg, "blade");
      } else G.say(r.fumble ? "足を滑らせ、大きな隙をさらした。" : "攻撃は空を切った。");
      if (r.fumble) C.exposed = true;
    } else if (kind === "vital") {
      G.log("you", `${t.name}の急所を狙う`);
      const r = G.check("敏捷", -15, "急所狙い", (w.vital || 0) - G.foeData(t).def);
      if (r.ok) {
        const dmg = (G.dice(w.dmg) + Math.floor(S.stats.敏捷 / 15)) * (r.crit ? 3 : 2);
        G.say("刃が急所を捉えた！");
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
    if (S.weapon === "volgrim" && G.rand() < 0.2) G.say(G.pick(VOLGRIM_LINES));
    C.round++;
  };

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
      if (e.majin && !G.weapon().pierce) { G.note(`${c.name}の攻撃は絶界に弾かれた。`); return; }
      const chance = G.clamp(c.power - (c.fire ? e.mres : e.def), 5, 95);
      if (G.d(100) <= chance) {
        const dmg = (c.fire ? G.dice([2, 6, 0]) : G.d(6)) + c.dmg;
        f.hp = Math.max(0, f.hp - dmg);
        G.note(`${c.name}の${c.fire ? "魔法" : "攻撃"}が${f.name}に ${dmg}`);
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
      let chance = e.hit - Math.floor(G.statEff("敏捷") / 5) - (C.guard ? 20 : 0) + (C.exposed ? 20 : 0);
      chance = G.clamp(chance, 5, 95);
      if (G.d(100) <= chance) {
        let dmg = G.dice(e.dmg) - (e.magic ? 0 : (armor ? armor.def : 0));
        if (C.guard) dmg = Math.floor(dmg / 2);
        dmg = Math.max(1, dmg);
        G.say(`${f.name}の${e.magic ? "呪い" : "攻撃"}！ ${dmg} のダメージ。`);
        G.hurt(dmg, `${f.name}に倒された`);
      } else G.note(`${f.name}の攻撃をかわした。`);
    });
    C.exposed = false;
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
