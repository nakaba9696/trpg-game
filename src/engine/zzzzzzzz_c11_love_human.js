// C11：恋の相手は 18 歳以上で、人の姿の者だけ（持ち主の決定「人間っぽいやつ以外と恋愛させないで」）。表は src/data/zc11_love_human.js（D.C11L）。
// m10_love.js・zz_m11_love.js・zzz_love_age.js・zzzzzzz_q8_pairs.js などは書き換えず、いちばん外から包む：
//   - G.loveHuman(c)：その人が人の姿か（人間・エルフ・獣人は人の姿。ゴブリン・オーク・スライムなどの魔物は人の姿でない）
//   - G.m10Can（恋の相手か）：人の姿でない者は、古いセーブの仲でも恋の相手にしない（18 歳未満・子どもの姿は zzz_love_age.js のまま）。
//     恋の話題（G.tk の loveOk）・恋の筋（R2）の段・M10 の恋の出来事・嫉妬は、どれも G.m10Can を見るので、ここで止まる。
//     好感度が高ければ、今まで通り情の出来事（G.bondKin・events_c_bond.js）と信頼の話題（kind: "bond"）になる
//   - G.m10P（告白・求婚）・G.m10Do（気配・恋仲・約束・結婚）：出来事の結果から来ても、人の姿でない者とは恋の間柄にならない
//   - G.m11ApAt（格の違う相手の続き物）：人の姿で現れる相手（D.C11L.AP）だけ
//   - 恋の筋の掛け合い（G.R2.TYPES）：人の姿でない者は張り合わない・冷やかされない
// 古いセーブ（G.c11Fix。G.fixOldNames と手番の終わりで呼ぶ）：人の姿でない者と恋人・約束・連れ合いになっていたら、恋の間柄を解いて
//   「固い絆の仲間」にする（c.c11 = { was 前の間柄, day }）。仲間はそのまま。年表に一行足す（過去の行は消さない）。
//   家に残っていた連れ合い（S.m10.atHome）は、一党に空きがあれば一党に戻し、無ければ「家を守る仲間」（S.c11home）として家に残す。
// 名前の頭の zzzzzzzz は、zzzzzzz_q8_pairs.js（G.m10Can を包む）より後に読ませるため。DOM には触らない。レーン C
(function (G) {
  const D = G.data;
  const L = () => D.C11L;
  const PARTNER = ["love", "vow", "wed"];
  const people = () => D.C2_PEOPLE || {};

  // ---------------------------------------------------------------- 人の姿か
  G.loveHuman = (c) => {
    if (!c) return false;
    if (c.humanLike === false) return false;
    const p = c.c2 && people()[c.c2];
    if (p && p.humanLike === false) return false;
    if (p && p.humanLike === true) return true;
    const race = (p && p.race) || c.race;
    if (race && L().RACE[race] === false) return false;
    return !L().NOT.test(`${c.name || ""} ${c.cls || ""} ${(p && p.kin) || c.kin || ""}`);
  };
  const humanId = (id) => { const p = people()[id]; return !p || G.loveHuman({ c2: id, name: p.name }); };

  // ---------------------------------------------------------------- 恋の相手か（いちばん外の包み）
  const can0 = G.m10Can;
  G.m10Can = (c) => !!c && G.loveHuman(c) && can0(c);
  const MP = G.m10P;
  if (MP) for (const k of ["sparked", "confess", "propose"]) {
    const f = MP[k];
    if (f) MP[k] = (c, S) => G.loveHuman(c) && f(c, S);
  }
  if (G.m10Do) {
    const do0 = G.m10Do;
    G.m10Do = (kind, c, o) => {
      if (c && ["spark", "love", "vow", "wed"].includes(kind) && !G.loveHuman(c)) return;
      return do0(kind, c, o);
    };
  }
  if (G.m11ApAt) {
    const ap0 = G.m11ApAt;
    G.m11ApAt = (key, n, S) => !!L().AP[key] && ap0(key, n, S);
  }
  if (G.R2 && G.R2.TYPES) G.R2.TYPES.forEach((tp) => {
    const ok0 = tp.ok;
    tp.ok = tp.k === "r2rival" ? (a, b, S) => humanId(a) && humanId(b) && ok0(a, b, S) : (a, b, S) => humanId(b) && ok0(a, b, S);
  });

  // ---------------------------------------------------------------- 古いセーブ
  const chronOf = (S, text) => {
    if (!Array.isArray(S.chronicle)) return;
    const keep = G.S;
    G.S = S;
    try { G.chron(text, "comp"); } catch (e) { /* 年表に足せなくてもセーブは直す */ } finally { G.S = keep; }
  };
  G.c11Fix = (S) => {
    if (!S || typeof S !== "object") return 0;
    const m = S.m10;
    let n = 0;
    const fix = (c) => {
      const x = c && c.m10;
      if (!x || !PARTNER.includes(x.st) || G.loveHuman(c)) return false;
      c.c11 = { was: x.st, day: S.day || 0 };
      x.st = ""; x.miss = false; x.since = S.day || 0;
      if (m && m.lover === c.id) m.lover = null;
      if (m && m.spouse && !m.spouse.lost && (m.spouse.id === c.id || m.spouse.name === c.name)) {
        m.spouse = null;
        if (S.flags) delete S.flags.m10_sp;
      }
      chronOf(S, L().TEXT.chron.replace(/\{n\}/g, c.name));
      n++;
      return true;
    };
    (S.companions || []).forEach(fix);
    if (m && m.atHome && fix(m.atHome)) {
      const h = m.atHome;
      m.atHome = null;
      if (Array.isArray(S.companions) && S.companions.length < 3) S.companions.push(h);
      else S.c11home = h;
    }
    return n;
  };
  if (G.fixOldNames) {
    const fix0 = G.fixOldNames;
    G.fixOldNames = (S) => { const r = fix0(S); try { G.c11Fix(S); } catch (e) { /* 直せなくても読み込みは続ける */ } return r; };
  }
  const end0 = G.endTurn;
  G.endTurn = () => {
    if (G.S) G.c11Fix(G.S);
    return end0();
  };

  // ---------------------------------------------------------------- 家を守る仲間を連れ出す・シートの行
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    const h = S && S.c11home;
    if (!h || S.travel || !(S.m10 && S.m10.home && S.m10.home.loc === S.loc)) return groups;
    const full = S.companions.length >= 3;
    const a = { id: "c11bring", label: `${G.m2Short(h)}を旅に連れ出す`, sub: full ? "一党がいっぱい" : "家を守っていた仲間が、また一党に加わる", disabled: full, kw: ["連れ出", "連れて"] };
    const g = groups.find((x) => x.title === "想い");
    if (g) g.list.push(a); else groups.push({ title: "想い", list: [a] });
    return groups;
  };
  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "c11bring") {
      const h = S.c11home;
      if (!h || S.companions.length >= 3) return;
      S.c11home = null;
      S.companions.push(h);
      G.log("you", `${G.m2Short(h)}を旅に連れ出す`);
      return;
    }
    return exploreAct0(head, arg, a);
  };
  const rows0 = G.m10Rows;
  if (rows0) G.m10Rows = (S) => {
    const rows = rows0(S) || [];
    const kept = ((S && S.companions) || []).filter((c) => c.c11).map((c) => c.name);
    if (kept.length) rows.push([L().TEXT.row, kept.join("、")]);
    if (S && S.c11home) rows.push([L().TEXT.home, `${S.c11home.name}${S.m10 && S.m10.home ? `（${S.m10.home.name}の家）` : ""}`]);
    return rows;
  };
})(globalThis.G = globalThis.G || {});
