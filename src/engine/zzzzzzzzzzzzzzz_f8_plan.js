// F8：一巡の手を、主人公 → 仲間A → 仲間B … と順に決めてから、まとめて解決する（持ち主「戦闘は主人公の行動 ⇒ 仲間Aの行動 ⇒ 仲間Bの行動 ⇒ … と決めていき、一通り終わったらダイスなどで戦闘するようなイメージ」）。DOM には触らない
//   手を決める段：S.combat.f8 = { you: 主人公の手（"cb:" の後ろ）, step: 何人目の仲間を決めているか }
//     決めるのは、作戦が「命を待て」（一つずつ選ぶ）の仲間だけ（立っている者を並びの順に）。ほかの作戦の仲間は飛ばし、解決のときに作戦で動く
//     仲間の手は、その仲間ができる指示（F3 の D.F3_ORDERS。奥の手・手当て・薬…）を 5 つの見出し（攻撃・戦技・魔法・その他・道具。F4）に分けて出す
//     「一つ前に戻る」（f8:back）で、前の仲間・主人公の手に戻れる。決めている間は手番も記録も進まない
//   解決する段：全員が決まったら、主人公の手で一巡を解く（combat.js のまま。仲間はその手番の指示で動き、渋る・気絶は今まで通り）
//   一行の札から開いていた仲間ごとの指示（F3）は、この段に吸収した（その他の見出しに仲間ごとの指示は出さない。作戦の組は残す）
//   G.combatAct を直接呼ぶ（テスト・古い流れ）と、決める段を通らずに今まで通り一巡が解ける。古いセーブ（f8 が無い）でも動く。レーン B＋U（F8）
(function (G) {
  const D = G.data;
  const F8 = (G.f8 = G.f8 || {});
  const F3 = () => G.f3;
  const C = () => (G.S && G.S.combat) || null;
  // 指示 → 見出し
  F8.CAT = { attack: "attack", art: "tech", magic: "magic", heal: "magic", potion: "item", cover: "misc", feint: "misc", back: "guard" }; // F9：下がる → 防御

  // 一つずつ手を選ぶ仲間（立っている者・作戦が「命を待て」）
  F8.queue = (S) => {
    S = S || G.S;
    if (!S || !S.combat || S.over || !F3()) return [];
    const list = G.b5Standing ? G.b5Standing(S) : S.companions || [];
    return list.filter((c) => c && c.id && F3().tacticOf(c, S) === "wait");
  };
  F8.state = (S) => { const c = (S || G.S || {}).combat; return (c && c.f8) || null; };
  // 今、誰の手を決めているか：null（決める段でない）・"you"・仲間
  F8.turn = (S) => {
    S = S || G.S;
    const q = F8.queue(S);
    if (!S || !S.combat || !q.length) return null;
    const st = F8.state(S);
    if (!st || st.you == null) return "you";
    return q[Math.min(st.step || 0, q.length - 1)] || "you";
  };
  F8.planning = (S) => F8.queue(S).length > 0;
  const asking = (g) => /誰に使う？$/.test(g.title || "") || (g.list || []).some((a) => a.id === "b5:cancel");
  const isOrders = (g) => (g.list || []).length && g.list.every((a) => /^f3:ord:/.test(a.id));

  // 仲間の手の組（5 つの見出しに分ける）
  F8.companionGroups = (c, S) => {
    const f3 = F3();
    const name = f3.label(c, S);
    const by = {};
    f3.ordersFor(c).forEach((o) => {
      if (o === "auto") return;
      const cat = F8.CAT[o] || "misc";
      const label = o === "art" ? `奥の手「${D.F3_ART[f3.artOf(c)].name}」（${f3.ki(c)}）` : D.F3_ORDERS[o].name;
      const sub = o === "art" ? D.F3_ART[f3.artOf(c)].sub : D.F3_ORDERS[o].sub;
      (by[cat] || (by[cat] = [])).push({ id: `f3:ord:${c.id}:${o}`, label, sub, kw: ["指示", name, D.F3_ORDERS[o].name] });
    });
    (by.misc || (by.misc = [])).push({ id: "f8:back", label: "一つ前に戻る", sub: "前に決めた手を選び直す", kw: ["戻る", "やり直す"] });
    const NAME = (G.f4 && G.f4.NAME) || { attack: "攻撃", guard: "防御", tech: "戦技", magic: "魔法", misc: "その他", item: "道具" };
    const ORDER = (G.f4 && G.f4.ORDER) || ["attack", "guard", "tech", "magic", "misc", "item"];
    return ORDER.filter((k) => by[k]).map((k) => ({ title: `${NAME[k]}（${name}の手）`, list: by[k], cat: k, f8who: c.id }));
  };

  // 選択肢：決める段に合わせて、主人公の手か、その仲間の手を出す
  const baseActions = G.combatActions;
  G.combatActions = () => {
    const groups = baseActions();
    const S = G.S;
    if (!S || !S.combat || S.over || !groups || groups.some(asking)) return groups;
    // 仲間ごとの指示は、決める段に吸収した（その他の見出しの下の組は出さない）
    const mine = groups.filter((g) => !isOrders(g));
    const who = F8.turn(S);
    if (!who || who === "you") {
      // 主人公の手：手を選んだ仲間がいれば、戻る（決め直す）は無い。いつもの手
      return mine;
    }
    return F8.companionGroups(who, S);
  };

  // 手を選ぶ：決める段なら覚えて次の人へ。最後の仲間が決まったら、一巡を解く
  const baseAct = G.act;
  G.act = (id) => {
    const S = G.S;
    id = String(id);
    const c0 = C();
    if (!S || S.over || !c0 || !F8.planning(S)) return baseAct(id);
    const q = F8.queue(S);
    const st = c0.f8 || (c0.f8 = { you: null, step: 0 });
    const valid = () => G.actions().flatMap((g) => g.list).find((x) => x.id === id && !x.disabled);
    if (id === "f8:back") {
      if (st.you == null) return;
      if (st.step > 0) {
        st.step--;
        const c = q[st.step];
        if (c && c0.f3ord) delete c0.f3ord[c.id];
      } else st.you = null;
      return;
    }
    if (st.you == null) {
      // 主人公の手（cb:…）。手番を進めない手（f3:tac・b5:pick など）は、そのまま
      if (!/^cb:/.test(id)) return baseAct(id);
      if (!valid()) return;
      st.you = id.slice(3);
      st.step = 0;
      S.b5pick = null; // 「誰に使う？」で選んだ手なら、問いは閉じる（B5）
      return;
    }
    // 仲間の手
    const c = q[Math.min(st.step, q.length - 1)];
    const m = id.match(/^f3:ord:([^:]+):(.+)$/);
    if (!m || !c || m[1] !== c.id || !valid()) return;
    const o = c0.f3ord || (c0.f3ord = {});
    o[c.id] = m[2];
    st.step++;
    if (st.step < q.length) return;
    // 全員決まった：主人公の手で一巡を解く（仲間はその手番の指示で動く）
    const you = st.you;
    delete c0.f8;
    return baseAct("cb:" + you);
  };

  // 一巡を解いたら（直に G.combatAct を呼んだときも）、決める段を初めから
  const baseCombat = G.combatAct;
  G.combatAct = (arg) => {
    const c0 = C();
    const r = baseCombat(arg);
    if (c0 && c0.f8) delete c0.f8;
    return r;
  };
})(globalThis.G = globalThis.G || {});
