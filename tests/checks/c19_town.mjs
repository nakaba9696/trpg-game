// C19（組 2）：周りの名のある人の直し（src/data/zv3_c19_town.js・zv3_c19_town_ev.js）
// - 当て布（memo・用語・図鑑・設定の表）と文の差し替え（D.V3_PROSE）が全部当たった
// - c12 の町の顔役が、初対面で癖の理由と過去を説明しない（説明の文が残っていない）。ヒルデガルトの同文が一つ
// - 二度目の場面が全部あり、図鑑に記録される（c2）・会う場所が正しい・名前が本文に出る。マルグリット・ヒルデガルトは特色の場所の行いから入れる
// - レオポルトから平手と自分語りが外れ、伯爵さまの問答の中身が本文にある
// - 図鑑の直書き（口癖・〔秘〕・「なぜか」）が消えた。触った c12 の文で「わし」はヤエだけ、眼鏡を拭くのは無い
// - 新しい出来事をどの選択肢でも DOM なしで最後まで動かせる（判定の成功と失敗の両方）
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };
const NEW = {
  c19_pie_flood: ["pietro", "w4_tulier"], c19_aga_due: ["agathe", "w7_lumie"], c19_ser_night: ["seraphina", "w7_serena"],
  c19_tom_card: ["tomas", "w7_orbe"], c19_gan_weigh: ["ganzou", "w7_saltisle"], c19_yae_hair: ["yae", "w7_netisle"],
  c19_yae_back: ["yae", "w7_netisle"], c19_fil_pipe: ["filie", "w2_amyrein"], c19_clar_song: ["clarisse", "w1_holy"],
  c19_mar_rope: ["marguerite", "w7_salyues"], c19_hil_ladder: ["hildegard", "w7_melvi"], c19_doro_ink: ["dorothea", "karna"],
};
const SPOT_ACTS = { w9_theater: ["c19_rope", "c19_mar_rope"], w9_scriptorium: ["c19_ladder", "c19_hil_ladder"] };

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C19 組 2: " + m); };
  const D = G.data;
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  const outs = (e) => e.choices.flatMap((c) => [c.ok, c.ng, c.win, c.ok && c.ok.win].filter(Boolean));
  const allText = (e) => [e.text, ...outs(e).map((o) => o.text || "")].join("\n");

  // ---------------------------------------------------------------- 当て布と差し替え
  const T = G.c19town;
  if (!T) F("当て布の記録（G.c19town）が無い");
  else for (const m of T.miss) F(`当て布が当たらない：${m}`);
  const mine = /^(c12_|c19_|c4_bart|c4_iori|c5_fil|c5_leo|c5_yuz|c5_vit|c5_vio|c5_ruf|c5_tsu|c6_ode|c6_ber|c6_vio|c7_matt|c7_liesel|c8_gig|c8_rio|c8_izra)/;
  for (const m of (G.v3prose && G.v3prose.missing) || []) if (mine.test(m)) F(`文の差し替えが当たらない：${m}`);

  // ---------------------------------------------------------------- 初対面で説明しない
  const GONE = [
    ["c12_pie_ledger", /書かなければ、数えずに済む|眼鏡を外して拭/],
    ["c12_aga_bees", /亭主/],
    ["c12_ser_pulse", /治りはしません|盗みではありません/],
    ["c12_tom_staff", /わしの杖|家内の字/],
    ["c12_gan_salt", /重い分銅を使う|それが島の秤だ/],
    ["c12_yae_knot", /網目の数だけ名前を覚え/],
    ["c12_hil_hands", /知らないことを、知らないまま守る/],
    ["c5_leo_poison", /道楽者でいたい|僕が真面目だ|平手/],
    ["c5_leo_coat", /平手|なぜか/],
    ["c8_gig_jonas", /小さいころ、さらわれて/],
    ["c6_ode_job", /夫が上がってこぉへんかった|海で上がらへん人もおるのに/],
    ["c6_ber_debt", /許せないだけ/],
    ["c4_bart_ship", /毎回そう言っているらしい/],
    ["c5_gau_extra", /わたし|炭鉱へ行かせた/],
    ["c5_gau_rolling", /なぜか/],
    ["c5_con_ledger", /顔を上げずに/],
    ["c5_amb_sister", /一度も信じたことがねえ/],
    ["c7_diet_paper", /来たときより少し遅かった/],
  ];
  // 足したもの（続き）：怒りの歌・汚い手・表向きの嘘・壁の字
  const HAVE = [["c5_sev_fight", /歌い出した/], ["c5_amb_sister", /噂を流したのは俺だ/], ["c7_diet_paper", /署名しただけ/], ["c5_mag_eighth", /三層目/]];
  for (const [id, re] of HAVE) { const e = ev(id); if (!e || !re.test(allText(e))) F(`${id} に足したはずの文が無い：${re}`); }
  // ヴィットリオの「相棒」は一つの流れ（書き出し＋一つの結果）で二度まで
  for (const id of ["c5_vit_chest", "c5_vit_funeral", "c5_vit_trap"]) {
    const e = ev(id);
    if (!e) { F(`${id} が無い`); continue; }
    const k = (t) => ((t || "").match(/相棒/g) || []).length;
    for (const c of e.choices) for (const o of [c.ok, c.ng, c.win, c.ok && c.ok.win].filter(Boolean)) if (k(e.text) + k(o.text) > 2) F(`${id}「${c.label}」で「相棒」が三度以上`);
  }
  // 「顔を上げずに」は自分側の名のある人の出来事でグラモン一人だけ
  const MINE43 = new Set("salphiel musette gerhard bartolo clarisse titta iori dorothea vittorio violaine yuzuel severin rufina constance ambroise shione filie leopold gauthier magda baudouin gramont berangere marion sylvestre odette otmar oren dietrich matthias liesel jonas rudger rionetta graul pietro marguerite hildegard agathe seraphina tomas ganzou yae".split(" "));
  const faceUp = D.EVENTS.filter((e) => /^c(\d+|19)_/.test(e.id) && [].concat(e.c2 || []).some((x) => MINE43.has(x)) && /顔を上げずに/.test(allText(e))).map((e) => e.id);
  if (faceUp.join() !== "c6_gra_audit") F(`「顔を上げずに」がグラモン一人でない：${faceUp.join("・")}`);
  for (const [id, re] of GONE) { const e = ev(id); if (!e) F(`${id} が無い`); else if (re.test(allText(e))) F(`${id} に説明の文が残っている：${allText(e).match(re)[0]}`); }
  for (const id of ["c12_pie_ledger", "c12_tom_staff", "c19_pie_flood", "c19_tom_card"]) { const e = ev(id); if (e && /わし/.test(allText(e))) F(`${id} に「わし」（年寄りの「わし」はヤエだけに）`); }
  const des = ev("w6g_deserter");
  if (des && /ヨナス/.test(allText(des))) F("脱走兵がまだヨナス（砦の見張り兵ヨナスと別人）");
  const yuz = ev("c5_yuz_manor");
  if (!yuz || !/腹が減っていない/.test(allText(yuz))) F("伯爵さまの問答の中身が本文に無い");
  const fil = ev("c5_fil_tree");
  if (!fil || !/髪飾りを質に/.test(allText(fil))) F("フィリエが夫の嫌だったことを言わない");
  const leo = ev("c5_leo_poison");
  if (!leo || !/癖でね/.test(leo.text)) F("レオポルトが杯を取り替える手つきが無い");
  if (!/丸の無い試合/.test(allText(ev("c5_leo_coat") || { text: "", choices: [] }))) F("レオポルトの番組表に、丸の無い試合が無い");

  // ---------------------------------------------------------------- 図鑑の直書き
  const lines = (id) => (((D.F2_PEOPLE || {})[id] || {}).lines || []).join("");
  const CODEX = [["tomas", /寝かせ/], ["leopold", /なぜか|平手/], ["bartolo", /なぜか|騙すつもり/], ["graul", /付けていない/], ["berangere", /よく知っている/], ["matthias", /一番近くで見/]];
  for (const [id, re] of CODEX) if (!lines(id) || re.test(lines(id))) F(`図鑑の ${id} に直書きが残る：${lines(id).slice(0, 30)}`);
  if (/平手/.test((D.C5_PEOPLE.leopold || {}).gap || "")) F("レオポルトの設定にまだ平手がある（ドロテアと同文）");

  // ---------------------------------------------------------------- 二度目の場面
  for (const [id, [who, loc]] of Object.entries(NEW)) {
    const e = ev(id);
    if (!e) { F(`${id} が無い`); continue; }
    if (![].concat(e.c2 || []).includes(who)) F(`${id}: 図鑑の記録（c2）に ${who} が無い`);
    if (!(e.where || []).includes(loc) || !D.LOCS[loc]) F(`${id}: 会う場所が ${loc} でない`);
    if (!e.once) F(`${id}: 一度きりでない`);
    const name = D.C2_PEOPLE[who].name;
    if (!allText(e).includes(name)) F(`${id}: 本文に ${name} の名が出ない`);
    for (const o of outs(e)) {
      if (o.lore) { const [k, key] = o.lore.split(":"); if (!(D.LORE[k] && D.LORE[k].lines.some((l) => l[0] === key))) F(`${id}: 用語 ${o.lore} が無い`); }
      if (/\d/.test(o.text || "")) F(`${id}: 文に数字`);
    }
    if (/\d/.test(e.text)) F(`${id}: 文に数字`);
  }
  for (const [f, [act, to]] of Object.entries(SPOT_ACTS)) {
    const a = ((D.W9_SPOTS[f] || {}).acts || []).find((x) => x.id === act);
    if (!a || !a.ok || a.ok.next !== to) F(`${f} の行い ${act} が ${to} に続かない`);
  }

  // ---------------------------------------------------------------- 動かす
  const st = {};
  D.STATS.forEach((k) => { st[k] = 60; });
  let runs = 0;
  for (const [id, [who, loc]] of Object.entries(NEW)) {
    const e0 = ev(id);
    if (!e0) continue;
    for (let i = 0; i < e0.choices.length; i++) {
      for (const roll of [0.01, 0.99]) {
        const g = loadEngine();
        g.rand = seeded(19 + i);
        g.P = { trophies: {}, graves: [] };
        g.newGame({ cls: "merc", stats: { ...st }, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
        const S = g.S;
        S.maxHp = S.hp = 999; S.gold = 500; S.day = 40; S.loc = loc; S.visited[loc] = true;
        ["ismene", "severin"].forEach((x) => g.c2Meet(x));
        const e = g.data.EVENTS.find((x) => x.id === id);
        try {
          g.startEvent(id);
          if (!g.c2Met(who, S)) F(`${id}: 始めても ${who} に会ったことにならない`);
          const c = e.choices[i];
          const r = g.rand;
          g.rand = () => roll;
          try { g.act("ev:" + i); } finally { g.rand = r; }
          for (let k = 0; k < 30 && S.mode === "combat"; k++) { S.combat.foes.forEach((f) => { if (f.hp > 0) f.hp = 1; }); g.act("cb:attack"); }
          if (Number.isNaN(S.gold) || Number.isNaN(S.hp)) F(`${id}「${c.label}」: 数が壊れた`);
          runs++;
        } catch (x) { F(`${id}「${e.choices[i].label}」: 例外 ${x.message}`); }
      }
    }
  }
  // 特色の場所の行いから入る
  for (const [f, [act, to]] of Object.entries(SPOT_ACTS)) {
    const g = loadEngine();
    g.rand = seeded(7);
    g.P = { trophies: {}, graves: [] };
    g.newGame({ cls: "merc", stats: { ...st }, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
    const S = g.S;
    const sp = g.data.W9_SPOTS[f];
    S.loc = sp.town; S.visited[sp.town] = true; S.day = 30;
    g.act("fac:" + f);
    const a = sp.acts.find((x) => x.id === act);
    S.phase = a.phase[0];
    try { g.act(`w9:${f}:${act}`); } catch (x) { F(`${f}:${act}: 例外 ${x.message}`); continue; }
    if (S.mode !== "event" || S.event !== to) F(`${f}:${act}: ${to} が始まらない（${S.mode} ${S.event}）`);
  }

  if (!n) ok(`C19 組 2：二度目の場面 ${Object.keys(NEW).length}・当て布と差し替えは全部当たった・${runs} 通り動かした`);
};
