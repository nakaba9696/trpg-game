// M14：あとから読まれる仕組みが置き換える関数を、いちばん外側で包む（中身は src/engine/m14_magic.js）。
// 名前の z の数は、zzzzzzzzzzzzz_e7_saga.js のあとに読むため。DOM に触らない。レーン B＋C（M14）
//   石の肌（C.m14stone）… 戦闘の中だけ、鎧の守りに足す（G.armor は I3・I2S・K1・K2 が置き換える）
//   追い風（C.m14wind）… 敵の攻撃があなたに当たりにくい（G.foeHitChance は K1 が包む）
//   足止め（f.m14snare）… 狙っている敵に当てやすい（G.foeVs.eva。急所も eva から測る）
//   癒しの奇跡を仲間に（B5）… 癒しを覚えていなければ出さない
(function (G) {
  const M = G.m14;
  if (!M) return;
  const pow = (k, n) => (G.s5PowOf ? G.s5PowOf(k, n) : 0);
  const C = () => (G.S && G.S.mode === "combat" ? G.S.combat : null);

  M.stoneCut = () => 2 + pow("魔力", 25);
  const armor0 = G.armor;
  G.armor = (...a) => {
    const r = armor0(...a);
    const c = C();
    if (!c || !(c.m14stone > 0)) return r;
    return Object.assign({}, r || { name: "石の肌", def: 0 }, { def: ((r && r.def) || 0) + M.stoneCut() });
  };

  const hit0 = G.foeHitChance;
  G.foeHitChance = (e, extra) => { const c = C(); return hit0(e, (extra || 0) - (c && c.m14wind > 0 ? 20 : 0)); };

  const eva0 = G.foeVs.eva;
  G.foeVs.eva = (e, k) => {
    const n = eva0(e, k);
    const t = C() && G.target();
    if (!t || !(t.m14snare > 0)) return n;
    const d = G.data.ENEMIES[t.id];
    return e === G.foeData(t) || (e && d && e.name === d.name) ? n - 4 : n;
  };

  // 作成画面（G.cre は engine/u5_creation.js・zu21_classinfo.js が作るので、ここで包む）
  const cre = G.cre;
  const T = G.data.M14_TALENT;
  if (cre) {
    const roll0 = cre.roll;
    cre.roll = (dr, rnd) => { const r = roll0(dr, rnd); M.rollDraft(dr, rnd); return r; };
    const options0 = cre.options;
    cre.options = (dr, rnd) => { const o = options0(dr, rnd); if (!dr.m14) M.rollDraft(dr, rnd); o.magic = M.ofDraft(dr); return o; };
    // 確認のシートの一行
    cre.sheetRows = (dr) => { if (!dr.m14) return []; const w = M.words(M.ofDraft(dr)); return [["術の才", w.line]]; };
    // 職業の札：術の才が要る職業
    const lines0 = cre.classLines;
    if (lines0) cre.classLines = (cls) => { const r = lines0(cls); if (T.need[cls]) r.push(["術の才", "要る（才の無い者はこの道に入れない）"]); return r; };
  }

  const actions0 = G.actions;
  G.actions = () => {
    const g = actions0();
    if (!G.S || G.knows("heal")) return g;
    g.forEach((grp) => { grp.list = (grp.list || []).filter((a) => a.id !== "b5:pick:spell" && a.id !== "b5:pick:heal"); });
    return g.filter((grp) => grp.list.length || !/仲間の手当て/.test(grp.title || ""));
  };
  if (G.b5UseOn) {
    const use0 = G.b5UseOn;
    G.b5UseOn = (ref, cid) => (ref === "@heal" && !G.knows("heal") ? false : use0(ref, cid));
  }
})(globalThis.G = globalThis.G || {});
