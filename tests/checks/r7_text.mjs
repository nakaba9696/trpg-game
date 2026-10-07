// R7：文と表示のほころび
// 1. 断られた・失敗した結果（ng）に、成功の報酬の文（「報酬が出た」）が混ざらない。シグルンの出来事（f2_majin_4）の結果は報酬に触れない
// 2. 依頼・噂が済んだら黙って消えない：「鐘の噂」を終えると記録に「済んだ」の一行が出て、「済んだ依頼」の欄に残り、右上の「！」が付く
// 3. 人生の振り返りは、していないことを語らない：宿にも店にも行っていない人生に「宿代」「薬草を買った」「泊まった宿」が出ない。行けば出うる
// 4. まだ取っていないトロフィーは、名前も説明も伏せる（説明の文がそのまま出ない）
// 5. 画面の文に内部の札が出ない：仲間が加わったときの「（誰も信じない）」「（疑り深い。警戒）」・英字の id・undefined・埋まっていない {n}
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("R7: " + m); };
  const start = (G, cls, seed) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [], codex: {} };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; caps[k] = stats[k] + 30; });
    G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[seed % 4], profile: { name: "テスト", sex: "女", age: 24, history: "", personality: "無口" } });
    return G.S;
  };

  // ---- 1. 断られた・失敗した結果に、報酬の文が混ざらない
  {
    const G = loadEngine();
    const REWARD = /報酬が出た|ギルドから[^。]{0,12}報酬/;
    for (const ev of G.data.EVENTS) for (const c of ev.choices || []) {
      const r = c.ng;
      const t = r && (typeof r === "string" ? r : r.text);
      if (t && REWARD.test(t)) F(`${ev.id}「${c.label}」：失敗の結果に報酬の文がある（${t.match(REWARD)[0]}）`);
    }
    const sig = G.data.EVENTS.find((e) => e.id === "f2_majin_4");
    if (!sig) F("f2_majin_4 が無い");
    else for (const c of sig.choices) for (const k of ["ok", "ng"]) {
      const t = c[k] && c[k].text;
      if (t && /報酬/.test(t)) F(`f2_majin_4「${c.label}」${k}：シグルンとのやりとりに報酬の文が混ざる`);
    }
  }

  // ---- 2. 済んだ依頼・噂を黙って消さない（鐘の噂）
  {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, "mercenary" in D.CLASSES ? "mercenary" : Object.keys(D.CLASSES)[0], 11);
    S.r3.follow.k_bell = 1;
    S.loc = "w3_bells"; S.mode = "explore"; S.depth = 0;
    G.q17.baseline(S);
    G.act("r3:k_bell");
    if (S.event !== "r3_k_bell2") F(`鐘の噂の続きが始まらない（${S.event}）`);
    else {
      const ev = D.EVENTS.find((x) => x.id === "r3_k_bell2");
      const i = ev.choices.findIndex((c) => !c.fight && !(c.ok && c.ok.r3));
      const len = S.log.length;
      G.act("ev:" + i);
      while (S.mode === "event" && S.event) G.act("ev:0");
      const added = S.log.slice(len);
      if (S.r3.follow.k_bell) F("鐘の噂の続きを終えたのに残っている");
      if (!added.some((l) => l.k === "quest" && /依頼『鐘の噂』は済んだ/.test(l.text))) F(`鐘の噂が済んでも一行が出ない（${added.map((l) => l.text).join("／").slice(0, 200)}）`);
      if (!G.q7.finished(S).some((x) => x.title === "鐘の噂")) F("鐘の噂が「済んだ依頼」の欄に残らない");
      if (!G.q17.bang(S)) F("鐘の噂が済んでも、右上の「依頼」に印が付かない");
      if (G.q7.list(S).some((e) => e.title === "鐘の噂")) F("鐘の噂が済んだのに、受けている依頼に残る");
    }
    // 次の段へ移るだけ（同じ名前）なら「済んだ」と言わない・二度「引き受けた」と言わない
    const S2 = start(G, Object.keys(D.CLASSES)[1], 12);
    S2.r3.follow.k_basket = 1;
    G.q17.baseline(S2);
    const len2 = S2.log.length;
    S2.r3.follow = { k_basket3: "karna" };
    G.act(G.actions().flatMap((x) => x.list).find((a) => !a.disabled && /^fac:/.test(a.id))?.id || "walk");
    const add2 = S2.log.slice(len2).filter((l) => l.k === "quest");
    if (add2.some((l) => /婆さんの籠/.test(l.text) && /済んだ|引き受けた/.test(l.text))) F(`続きが次の段へ移っただけで「済んだ／引き受けた」と出る（${add2.map((l) => l.text).join("／")}）`);
  }

  // ---- 3. 人生の振り返りは、したことだけ
  {
    const G = loadEngine();
    const D = G.data;
    const NOT_DONE = /宿代|薬草を買った|泊まった宿|宿のまずい飯|飯のうまい宿|ツケ/;
    let quietSeen = 0;
    for (let s = 1; s <= 40; s++) {
      const S = start(G, Object.keys(D.CLASSES)[s % 5], 300 + s);
      S.day = 3; S.over = "dead"; S.deathCause = "力尽きた";
      const st = G.m6Compose(S);
      const text = [...st.life, ...(st.after || [])].join("\n");
      if (NOT_DONE.test(text)) F(`宿にも店にも行っていない人生に「${text.match(NOT_DONE)[0]}」と出る`);
      if (/帳面に残っているのは|帳面には|取り立てて/.test(text)) quietSeen++;
    }
    if (!quietSeen) F("何も無い人生の段落が一度も出ない（確かめられていない）");
    // 宿に泊まり薬草を買った人生なら、その行が出うる
    let innSeen = 0;
    for (let s = 1; s <= 60 && !innSeen; s++) {
      const S = start(G, Object.keys(D.CLASSES)[s % 5], 500 + s);
      S.day = 3; S.over = "dead";
      S.r7life = { inn: 2, meal: 1, tavern: 1, buy: 3, herb: 2 };
      if (/宿代の払い/.test(G.m6Compose(S).life.join(""))) innSeen++;
    }
    if (!innSeen) F("宿に泊まった人生でも、宿代の行が一度も出ない");
    // 宿に泊まると数える（施設の行動から）
    const S = start(G, Object.keys(D.CLASSES)[0], 77);
    S.gold = 500; S.mode = "fac"; S.fac = "inn";
    G.act("inn:rest");
    if (!(S.r7life && S.r7life.inn === 1)) F(`宿に泊まっても数えない（${JSON.stringify(S.r7life)}）`);
  }

  // ---- 4. まだ取っていないトロフィーは説明も伏せる
  {
    const G = loadEngine();
    for (const t of G.data.TROPHIES) {
      const v = G.r7.trophyView(t, null);
      if (v.name !== "？？？") F(`トロフィー ${t.key}：まだなのに名前が見える（${v.name}）`);
      if (!v.desc) F(`トロフィー ${t.key}：まだのときの一行が空`);
      if (t.desc && (v.desc === t.desc || v.desc.includes(t.desc))) F(`トロフィー ${t.key}：まだなのに説明「${t.desc}」が見える`);
      // 手がかりに、説明にある固有の名（カタカナ三字以上）を書かない
      for (const m of String(t.desc || "").matchAll(/[ァ-ヴー]{3,}/g)) if (v.desc.includes(m[0])) F(`トロフィー ${t.key}：手がかりに「${m[0]}」が出る`);
      const got = G.r7.trophyView(t, { by: "テスト", date: "1日目" });
      if (got.name !== t.name || got.desc !== (t.desc || "")) F(`トロフィー ${t.key}：取ったのに名前か説明が出ない`);
    }
    for (const k of Object.keys(G.data.R7_TROPHY_HINTS || {})) if (!G.data.TROPHIES.some((t) => t.key === k)) F(`手がかりの ${k} に当たるトロフィーが無い`);
  }

  // ---- 5. 画面の文に内部の札が出ない
  {
    const G = loadEngine();
    const D = G.data;
    const traits = Object.values(D.M2_TRAITS || {}).map((t) => t.name);
    const pers = (D.PROFILE && D.PROFILE.personality) || [];
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const TAG = new RegExp(`（(${[...traits, ...pers].map(esc).join("|")})(。[^）]*)?）`);
    const BAD = /undefined|NaN|\[object|\{[a-zA-Z_][a-zA-Z0-9_:]*\}/;
    const ASCII = /[A-Za-z_][A-Za-z0-9_]{2,}/g;
    const OKWORD = /^(HP|MP)\d*$/;
    const seen = new Set();
    const check = (t, where) => {
      t = String(t || "");
      if (!t) return;
      const key = where + t;
      if (seen.has(key)) return;
      seen.add(key);
      if (TAG.test(t)) F(`${where}に性格・好感度の札：「${t.slice(0, 80)}」`);
      if (BAD.test(t)) F(`${where}に「${t.match(BAD)[0]}」：「${t.slice(0, 80)}」`);
      for (const m of t.matchAll(ASCII)) if (!OKWORD.test(m[0])) { F(`${where}に英字の札「${m[0]}」：「${t.slice(0, 80)}」`); break; }
    };
    // 仲間が加わるとき（酒場で雇う・助けて加わる）
    for (let s = 1; s <= 24; s++) {
      const S = start(G, Object.keys(D.CLASSES)[s % 5], 900 + s);
      S.mode = s % 2 ? "fac" : "explore"; S.fac = s % 2 ? "tavern" : null;
      const len = S.log.length;
      G.addCompanion("random");
      const add = S.log.slice(len);
      if (!add.some((l) => /仲間になった/.test(l.text))) F("仲間が加わっても一行が出ない");
      if (add.length < 2) F("仲間が加わったときの、人となりの一言が出ない");
      add.forEach((l) => check(l.text, "仲間が加わったときの文"));
    }
    // ランダムに遊んで、記録の文と選択肢の名前・横の案内を洗う
    for (let g = 0; g < 12; g++) {
      const S = start(G, Object.keys(D.CLASSES)[g % 5], 1300 + g);
      if (g % 3 === 0) { S.gold = 5000; S.fame = 700; }
      let last = 0;
      for (let step = 0; step < 300 && !G.S.over; step++) {
        const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
        if (!acts.length) break;
        acts.forEach((a) => { check(a.label, "選択肢の名前"); });
        G.act(acts[Math.floor(G.rand() * acts.length)].id);
        const L = G.S.log;
        if (L.length < last) last = 0;
        for (let i = Math.max(last, L.length - 40); i < L.length; i++) check(L[i].text, "記録");
        last = L.length;
      }
    }
  }

  if (!n) ok("R7 文と表示のほころび（失敗に報酬の文が混ざらない・済んだ依頼の一行・したことだけの振り返り・伏せたトロフィー・内部の札が出ない）");
};
