// C1：遺物の銃を撃つ（持ち主の決定 #50）。品と入手先は src/data/relics_c1.js。
// 銃（D.ITEMS の gun を持つ品）を持っていれば、戦闘の行動に「遺物」の組を足し、「〜を撃つ」を出す。
// 撃つたびに弾（gun.ammo）が一つ減る。弾が無ければ撃てない。使徒の絶界には効かない。大失敗で暴発して自分が傷を負う。
// 雨と雪の日は、gun.wet だけ当たりにくい（迷宮の中は関係ない）。
// 撃ったあとの仲間と敵の手番は、元の G.combatAct に何もしない行動（"c1shot"）を渡して進める。
// combat.js は書き換えず、G.combatActions・G.combatAct を包む。レーン C（C1）
(function (G) {
  const D = G.data;

  const gunsHeld = (S) => Object.keys((S && S.inv) || {}).filter((id) => S.inv[id] > 0 && D.ITEMS[id] && D.ITEMS[id].gun);
  G.c1Guns = (S) => gunsHeld(S || G.S);

  const wetNow = () => {
    const L = G.loc();
    if (!L || L.type === "dungeon") return false;
    const w = G.S.weather || (G.skyAt ? G.skyAt(G.S.loc, G.S.day).weather : "");
    return w === "雨" || w === "雪";
  };
  // 相手の点は敵の強さ（S5。G.foeVs.eva）。銃の命中・雨の補正は％で足す
  const hitOf = (gun) => (gun.hit || 0) + (gun.wet && wetNow() ? gun.wet : 0);
  const vsOf = (t, k) => ({ vs: G.foeVs.eva(G.foeData(t), k) });
  G.c1ShotChance = (id) => { const g = D.ITEMS[id].gun; const t = G.target(); return t ? G.chance(g.stat, vsOf(t, g.stat), hitOf(g)) : 0; };

  const baseActions = G.combatActions;
  G.combatActions = () => {
    const groups = baseActions();
    const S = G.S;
    if (!groups.length || !S.combat || !G.target()) return groups;
    const list = gunsHeld(S).map((id) => {
      const it = D.ITEMS[id];
      const g = it.gun;
      const n = G.count(g.ammo);
      const ammo = D.ITEMS[g.ammo].name;
      return { id: "cb:c1shot:" + id, label: `${it.name}を撃つ`, sub: n ? `${g.stat} ${G.c1ShotChance(id)}%・${ammo} 残り${n}` : `${ammo}が無い`, disabled: !n, kw: ["撃", "銃", "筒", it.name] };
    });
    if (list.length) groups.splice(1, 0, { title: "遺物", list });
    return groups;
  };

  const SAY = {
    c1_raizutsu: { hit: ["雷が手の中で鳴った。煙の向こうで、敵がのけぞる。", "耳が鳴る。肩が痺れる。鉛の玉は、まっすぐ飛んだ。"], miss: ["轟音だけが、むなしく響いた。", "火口がくすぶり、玉は明後日の方へ飛んだ。"], burn: "筒が手の中で裂けるように鳴った。暴発だ。眉毛が焦げる匂いがする。" },
    c1_kouzutsu: { hit: ["音もなく、白い線が走った。", "指先が温かくなる。白い線が、敵を貫いた。"], miss: ["白い線は、敵の脇をかすめて消えた。"], burn: "筒が急に熱を持ち、手のひらを焼いた。" },
  };
  const say = (id, k) => { const s = SAY[id] || SAY.c1_raizutsu; return Array.isArray(s[k]) ? G.pick(s[k]) : s[k]; };

  function foeDown(f) {
    const S = G.S;
    G.log("nar", `${f.name}を倒した！`, { fx: "down", foe: f.name, boss: !!G.foeData(f).boss });
    S.counters.kills++;
    (S.quests || []).forEach((q) => {
      if (q.type === "hunt" && !q.done && q.target === f.id && q.loc === S.loc) {
        q.progress++;
        if (q.progress >= q.need) { q.done = true; G.note(`依頼「${q.title}」を達成した。ギルドに報告しよう。`); }
      }
    });
  }

  const baseAct = G.combatAct;
  G.combatAct = (arg) => {
    const [kind, id] = String(arg).split(":");
    if (kind !== "c1shot" || !id) return baseAct(arg);
    const S = G.S;
    const C = S.combat;
    const t = G.target();
    const it = D.ITEMS[id];
    if (!C || !t || !it || !it.gun || !G.count(id)) return;
    const g = it.gun;
    if (!G.take(g.ammo)) return;
    C.guard = false;
    G.log("you", `${t.name}に${it.name}を向ける`);
    if (g.wet && wetNow()) G.note("火口が湿っている。");
    const e = G.foeData(t);
    const r = G.check(g.stat, vsOf(t, g.stat), it.name, hitOf(g));
    if (r.ok) {
      if (e.majin) {
        G.log("nar", `弾は${t.name}の体の手前で、見えない壁に止まり、ぽとりと落ちた。絶界だ。`, { fx: "wall", foe: t.name });
        G.openLore && G.openLore("tsutsu:wall");
      } else {
        let dmg = G.dice(g.dmg);
        if (r.crit) { dmg *= 2; G.log("nar", "会心の一撃！", { fx: "crit" }); }
        G.say(say(id, "hit"));
        t.hp = Math.max(0, t.hp - dmg);
        G.log("sys", `${t.name}に ${dmg} のダメージ（残り ${t.hp}/${t.max}）`, { fx: "hit", foe: t.name, n: dmg });
        if (t.hp <= 0) foeDown(t);
        G.openLore && G.openLore("tsutsu:shot");
      }
    } else if (r.fumble) {
      G.say(say(id, "burn"));
      C.exposed = true;
      G.hurt(G.dice(g.burn || [1, 4, 0]), `${it.name}の暴発で死んだ`);
    } else G.say(say(id, "miss"));
    if (S.over || !S.combat) return;
    if (!G.alive().length) { G._endCombat("win"); return; }
    // 仲間と敵の手番（元の行動の表に "c1shot" は無いので、手番だけが進む）
    return baseAct("c1shot");
  };
})(globalThis.G = globalThis.G || {});
