// R3：初見の遊びやすさ。
// 1. 最初の一歩：出発地の町（職業の start）に着いたとき、町ごとの三つのきっかけ（src/data/r3_hooks.js の D.R3_HOOKS）から
//    二つを冒険ごとに（主人公から）選び、着いた文の中で目に入るようにする。行動の欄の「気になること」に出る。選ばなくても損はしない。
//    出来事の結果に r3: "<id>" があると、D.R3_FOLLOW の場所に続きが出る（近場の頼みごと・噂の確かめ）。
// 2. 死んだときの手がかり：何に・どんな様子で倒れたかと、次に試せそうなことを、世界の言葉で短く墓碑に残す（G.r3Clue）。
//    弱点の名前・正解の選択肢は書かない。数も書かない。倒した敵の「聞いた話」（V12 の G.heard）に、分かったことを一つ足す。
// セーブに足すもの：S.r3 = { hooks [id], seen { id: 1 }, follow { id: 1 }, cur }・S.r3fight（戦いに入ったときの傷の具合）・S.r3ev（最後に選んだ出来事）・S.r3clue。
// 墓碑に足すもの：g.r3 = { what, hint, foe }。古いセーブで無くても動く。DOM なし（画面は src/ui/zr3_grave.js）
(function (G) {
  const D = G.data;
  const R3 = (G.r3 = G.r3 || {});
  R3.DAYS = 30;   // 出発地のきっかけが残る日数（それを過ぎると、町の人もそれぞれの用事に戻る）

  const st = (S) => (S.r3 = S.r3 || { hooks: [], seen: {}, follow: {}, cur: "" });

  // ---------------------------------------------------------------- 1. 最初の一歩
  R3.hooksOf = (loc) => (D.R3_HOOKS || {})[loc] || [];
  R3.open = (S) => {
    S = S || G.S;
    if (!S || !S.r3) return [];
    const r = S.r3;
    const out = [];
    const L = G.loc(S.loc);
    if (S.loc === r.home && (S.day || 1) <= R3.DAYS) {
      R3.hooksOf(r.home).filter((h) => r.hooks.includes(h.id) && !r.seen[h.id]).forEach((h) => out.push({ id: h.id, label: h.label, sub: h.sub, ev: h.ev }));
    }
    Object.keys(r.follow || {}).forEach((id) => {
      const f = (D.R3_FOLLOW || {})[id];
      if (!f || f.loc !== S.loc) return;
      if (L && L.type === "dungeon" && (S.depth || 0) < (f.depth || 0)) return;
      if (L && L.type === "dungeon" && !f.depth && S.depth) return;
      out.push({ id, label: f.label, sub: f.sub, ev: f.ev, follow: true });
    });
    return out;
  };

  const baseNewGame = G.newGame;
  G.newGame = (opt) => {
    const S = baseNewGame(opt);
    if (!S) return S;
    const r = st(S);
    r.home = S.loc;
    const all = R3.hooksOf(S.loc).slice();
    // どの二つかは、主人公（名前・年齢・生い立ち・能力値）から決める。G.rand を使うと、ほかの仕組みの乱数の並びがずれるため
    const key = JSON.stringify([S.cls, S.profile.name, S.profile.age, S.profile.sex, S.profile.history, S.goal.id, S.startStats]);
    let hsh = 2166136261;
    for (let i = 0; i < key.length; i++) hsh = Math.imul(hsh ^ key.charCodeAt(i), 16777619) >>> 0;
    while (all.length > 2) { all.splice(hsh % all.length, 1); hsh = Math.floor(hsh / 7); }
    r.hooks = all.map((h) => h.id);
    if (all.length) G.say(all.map((h) => h.see).join(""));
    return S;
  };

  const baseActions = G.exploreActions;
  G.exploreActions = () => {
    const groups = baseActions();
    const S = G.S;
    if (!S || S.mode !== "explore") return groups;
    const list = R3.open(S).map((x) => ({ id: "r3:" + x.id, label: x.label, sub: x.sub, kw: [] }));
    if (list.length) groups.unshift({ title: "気になること", list });
    return groups;
  };

  const baseAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "r3") return baseAct(head, arg, a);
    const S = G.S;
    const x = R3.open(S).find((o) => o.id === arg);
    if (!x) return;
    const r = st(S);
    G.log("you", x.label);
    if (x.follow) r.cur = x.id; else { r.seen[x.id] = 1; r.cur = ""; }
    G.startEvent(x.ev);
  };

  // 結果の r3: "<id>" … 今の続きを片づけて、次の続きを出す（「今はやめておく」は同じ id を書いて残す）
  let r3Set = false;
  const baseApply = G.apply;
  G.apply = (o) => {
    baseApply(o);
    const S = G.S;
    if (!o || !o.r3 || !S || S.over) return;
    const r = st(S);
    if (r.cur) delete r.follow[r.cur];
    if ((D.R3_FOLLOW || {})[o.r3]) r.follow[o.r3] = 1;
    r.cur = "";
    r3Set = true;
  };
  // 続きの出来事を選び終えたら（戦いに入ったときは、勝って次が決まるまで残す。逃げてもまた来られる）
  const baseChoose = G.chooseEvent;
  G.chooseEvent = (i) => {
    const S = G.S;
    const r = S && S.r3;
    const ev = S && S.event;
    r3Set = false;
    if (S && ev) S.r3ev = { id: ev, i, turn: S.turn };   // 死んだときの手がかり用（L1 の S.kn.ev は選んだあとに付くので、自分で残す）
    baseChoose(i);
    if (!r || !r.cur || S.over || r3Set) return;
    const f = (D.R3_FOLLOW || {})[r.cur];
    if (f && f.ev === ev && S.mode !== "combat" && S.event !== ev) { delete r.follow[r.cur]; r.cur = ""; }
  };

  // ---------------------------------------------------------------- 2. 死んだときの手がかり
  const WEAK = {
    fire: "毛皮に残る古い焦げ跡を、しきりに気にしていた。",
    ice: "吐く息が白く凍るたびに、動きがわずかに鈍った。",
    bolt: "遠くで雷が鳴ったとき、一瞬だけ身をすくめた。",
    blade: "刃の通った傷だけは、なかなかふさがらなかった。",
    holy: "聖印のきらめきから、目をそむけていた。",
  };
  const ACTS = [
    ["regen", "傷を負わせても、見ているうちにふさがっていった。"],
    ["drain", "触れられるたびに、体から力が抜けていった。"],
    ["poison", "噛まれた所から、体がしびれていった。"],
    ["call", "倒しても倒しても、仲間が呼ばれてきた。"],
    ["fleecall", "一匹が逃げたと思ったら、仲間を連れて戻ってきた。"],
    ["enrage", "深手を負わせたとたん、猛り狂って手がつけられなくなった。"],
    ["disarm", "武器を手から払い落とされた。"],
    ["sleep", "戦いの途中で、急にまぶたが重くなった。"],
    ["corrode", "鎧の留め金が、いつのまにか緩んでいた。"],
    ["steal", "持ち物をかすめ取られた。"],
    ["pin", "仲間が押さえこまれて、動けなくなった。"],
    ["guard", "一匹がもう一匹を庇って、刃が届かなかった。"],
    ["rout", "群れは、頭の一匹を中心に動いていた。"],
  ];
  // 敵の様子（いつも同じ敵なら同じ一行。周回でぶれない）
  R3.foeTrait = (id) => {
    const e = D.ENEMIES[id];
    if (!e) return "";
    if (e.weak && WEAK[e.weak]) return WEAK[e.weak];
    const a = ACTS.find(([k]) => (e.acts || []).includes(k));
    if (a) return a[1];
    if (e.magic) return "その一撃は、鎧など無いかのように肌まで届いた。";
    if (e.undead) return "斬っても突いても、痛がるそぶりがなかった。";
    if ((e.mres || 0) <= -10) return "術の火がかすめたときだけ、身をよじって嫌がった。";
    if ((e.def || 0) >= 20) return "刃が、硬い体に何度も弾かれた。";
    if ((e.mres || 0) >= 25) return "術を浴びても、平気な顔をしていた。";
    if ((e.agi || 0) >= 60) return "速かった。背を向けても、逃げきれなかっただろう。";
    if (e.bribe) return "斬り合いのあいだも、ちらちらとあなたの財布のあたりを見ていた。";
    if ((e.will || 0) <= 35) return "あなたが声を荒らげたとき、一度だけびくりと身をすくめた。";
    return "";
  };
  const STAT_WAY = { 筋力: "力ずく", 体力: "耐えしのぐこと", 敏捷: "身のこなし", 知力: "よく見て考えること", 魔力: "術", 魅力: "言葉" };
  const SPECIAL = [
    [/自分の(魔法|氷|雷)/, "借りた力が、あなた自身に返ってきた。", "術は、ときに使い手に牙をむく。使いどころを選んでいれば、あるいは。"],
    [/暴発/, "手にした品の力が、持ち主のあなたに向いた。", "その品は、持つ者を選ぶのかもしれない。"],
    [/酒場の喧嘩/, "酔っ払いの拳を、甘く見た。", "傷を抱えたまま町をうろつくより、先に宿で休んでいれば。"],
    [/正気|影法師|明けない町|笑うのを/, "見てはいけないものを、見すぎた。", "知ろうとするほど、何かがすり減っていく。どこかで目を閉じる手もあった。"],
    [/獣として/, "体の中の獣が、あなたより強くなった。", "血の病は、放っておけば進む。早く手を打てる場所があったのかもしれない。"],
  ];
  const nameOf = (id) => ((D.ENEMIES[id] || {}).name || "");

  R3.clue = (S, cause) => {
    S = S || G.S;
    cause = String(cause || "");
    const C = S.combat;
    const foes = ((C && C.foes) || []).filter((f) => D.ENEMIES[f.id]);
    const alive = foes.filter((f) => f.hp > 0);
    const sp = SPECIAL.find(([re]) => re.test(cause));
    if (sp && (!foes.length || /自分の|暴発/.test(cause))) return { what: sp[1], hint: sp[2], foe: "" };
    const L = G.loc(S.loc) || {};
    const conds = S.conds || [];
    if (foes.length) {
      const pool = alive.length ? alive : foes;
      const top = pool.slice().sort((a, b) => (D.ENEMIES[b.id].tier || 0) - (D.ENEMIES[a.id].tier || 0))[0];
      const e = D.ENEMIES[top.id];
      const names = [...new Set(pool.map((f) => nameOf(f.id)))];
      const what = `相手は${names.join("と")}だった。${R3.foeTrait(top.id)}`;
      let hint = "";
      const ratio = (f) => f.hp / Math.max(1, f.max);
      const start = S.r3fight == null ? 1 : S.r3fight;
      if (e.boss || e.majin) hint = "正面から一人で挑む相手ではなかった。剣を抜く前に、集めておくべきものがあったのかもしれない。";
      else if (alive.length && alive.every((f) => ratio(f) >= 0.75)) hint = "ほとんど傷を負わせられなかった。今のあなたには、まだ早い相手だったのだろう。";
      else if (conds.includes("毒")) hint = "毒が回ったまま戦っていた。先に毒を抜いていれば、違ったかもしれない。";
      else if (start < 0.5) hint = "傷の癒えないまま戦いに入った。一晩休んでからなら、あるいは。";
      else if (L.type === "dungeon" && (S.depth || 0) >= 2) hint = "深く潜りすぎた。引き返す頃合いを、見誤った。";
      else if (alive.length >= 2 && !(S.companions || []).length) hint = "一人で多勢を相手にした。仲間を連れていれば、違ったかもしれない。";
      else if (alive.some((f) => ratio(f) <= 0.25)) hint = "あと一太刀だった。傷薬をもう一つ持っていれば。";
      else if (e.bribe) hint = "金で話のつく相手だったのかもしれない。";
      else if ((e.will || 0) <= 35) hint = "脅せば、退いたかもしれない。";
      else if ((e.agi || 0) <= 25) hint = "足の遅い相手だった。逃げる道もあった。";
      else hint = "逃げることも、恥ではなかった。";
      return { what, hint, foe: top.id };
    }
    // 出来事の中で（三手番以内に選んだもの）
    const kev = S.r3ev || (S.kn && S.kn.ev);
    const ev = kev && S.turn - kev.turn <= 3 ? (D.EVENTS || []).find((x) => x.id === kev.id) : null;
    if (ev) {
      const c = ev.choices[kev.i] || {};
      const what = `${ev.title}で、「${String(c.label || "").replace(/\{.*?\}/g, "…")}」を選んだ。${conds.includes("毒") ? "体には毒が回っていた。" : ""}`;
      const other = ev.choices.find((x, j) => j !== kev.i && x.stat && x.stat !== c.stat && !x.cond);
      const away = ev.choices.find((x, j) => j !== kev.i && !x.stat && !x.fight && !x.cost && !x.cond);
      let hint;
      if (other && STAT_WAY[other.stat]) hint = `${c.stat && STAT_WAY[c.stat] ? STAT_WAY[c.stat] + "ではなく、" : ""}${STAT_WAY[other.stat]}で切り抜ける手もあったのかもしれない。`;
      else if (away) hint = "関わらずに通り過ぎる道も、あった。";
      else hint = "傷の浅いうちに、引き返していれば。";
      return { what, hint, foe: "" };
    }
    if (L.type === "dungeon" && S.depth) return { what: `${L.name}の深みで、力尽きた。${cause ? cause + "。" : ""}`, hint: "深く潜りすぎた。引き返す頃合いを、見誤った。", foe: "" };
    return { what: cause ? `${cause}。` : "力尽きた。", hint: conds.includes("毒") ? "毒が回ったまま歩いていた。先に毒を抜いていれば。" : "傷の浅いうちに、休んでいれば。", foe: "" };
  };
  G.r3Clue = (run) => (run ? run.r3clue || run.r3 || null : null);

  const baseStart = G.startCombat;
  G.startCombat = (ids, opt) => {
    const S = G.S;
    if (S) S.r3fight = S.maxHp ? S.hp / S.maxHp : 1;
    return baseStart(ids, opt);
  };
  const baseDie = G.die;
  G.die = (cause) => {
    const S = G.S;
    if (S && !S.over) {
      try {
        const c = R3.clue(S, cause);
        S.r3clue = c;
        const t = c.foe && R3.foeTrait(c.foe);
        if (t && G.heard) G.heard(`${nameOf(c.foe)}に倒された者の話：${t}`, { foe: c.foe });
      } catch (e) { /* 手がかりが組めなくても、死ぬことは止めない */ }
    }
    return baseDie(cause);
  };
  const baseFinish = G.finishRun;
  G.finishRun = () => {
    const r = baseFinish();
    const S = G.S;
    const g = S && S.r3clue && G.P && (G.P.graves || []).find((x) => x.id === S.id);
    if (g) g.r3 = { ...S.r3clue };
    return r;
  };
})(globalThis.G = globalThis.G || {});
