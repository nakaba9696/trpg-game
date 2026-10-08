// W10：序盤〜中盤の山（src/data/locations_zw10.js・engine/zzzzzzzzzz_w10_climb.js・data/w10_peaks.js・data/events_w10.js・data/enemies_w10.js・ui/scene_v2_zw10_mount.js）
// - 設定（docs/lore/mountains.md）が山ごとにある
// - 山が二つ：一つは危険度 1〜2 でレオネスト王国、もう一つは危険度 2〜3。段（麓・峠・山小屋・尾根・山頂）の名・敵・一文、気候・用語・着いたときの一文・背景の一覧・噂
// - 麓では荒野の行動に「山道を登る」が足され、登っている間は旅に出られない。段を登りきると山頂、下りられる、麓まで一気に下りられる
// - 「景色を眺める」行動は無い。はじめて峠を越えた瞬間に下の世界の一文、山頂に着くたびに景色の文（天候で変わる）。
//   はじめて頂に立ったときだけ山場の文（晴れた朝昼は遠くを見渡す文、ほかは天候・時間帯の文）・小さな発見・手引きの一行
// - 山小屋で休むと全快。高さで雨が雪になる。古いセーブ（S.w10 が無い）でも動く。別の場所に着くと段は消える
// - 山の出来事は形がそろい（能力値の違う解き方 2 つ以上・判定なしの選択肢）、どの選択肢を選んでも壊れない。新しい敵に耐性と弱点がある
import { readFileSync } from "node:fs";

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("W10：" + m); };
  const G = loadEngine();
  const D = G.data;
  const W = G.w10;
  if (!W) { F("G.w10 が無い"); return; }
  const mounts = Object.keys(D.LOCS).filter((id) => D.LOCS[id].w10);

  // ---------------------------------------------------------------- データ
  if (mounts.length < 2) F(`山が ${mounts.length} つ（2 つ以上のはず）`);
  if (!mounts.some((id) => D.LOCS[id].danger >= 1 && D.LOCS[id].danger <= 2 && D.LOCS[id].region === "レオネスト王国")) F("危険度 1〜2 のレオネスト王国の山が無い");
  if (!mounts.some((id) => D.LOCS[id].danger >= 2 && D.LOCS[id].danger <= 3 && D.LOCS[id].danger > Math.min(...mounts.map((m) => D.LOCS[m].danger)))) F("危険度 2〜3 の、もう一つの山が無い");
  const scenes = JSON.parse(readFileSync(new URL("../../docs/art/scenes.json", import.meta.url), "utf8")).scenes;
  const rumors = (D.RUMORS || []).map(String);
  const short = (n) => (n.match(/[ァ-ヶー]+$/) || [n])[0];
  for (const id of mounts) {
    const L = D.LOCS[id], m = L.w10;
    if (L.type !== "wild") F(`${id}: 荒野でない（${L.type}）`);
    if ((m.names || []).length !== W.TOP + 1) F(`${id}: 段の名が ${W.TOP + 1} つでない`);
    for (let n = 0; n <= W.TOP; n++) {
      const pool = (m.pools || [])[n] || [];
      if (!pool.length) F(`${id}: 段 ${n} の敵が無い`);
      pool.forEach((e) => { if (!D.ENEMIES[e]) F(`${id}: 段 ${n} の敵 ${e} が無い`); else if (D.ENEMIES[e].boss) F(`${id}: 段 ${n} の敵 ${e} が主`); });
      if (n && !((m.say || [])[n] || []).length) F(`${id}: 段 ${n} に着いたときの一文が無い`);
    }
    if (!(m.quiet || []).length) F(`${id}: 何も起きないときの一文が無い`);
    if (!Object.keys(L.links || {}).length) F(`${id}: 道が無い`);
    if (!D.CLIMATE[id]) F(`${id}: 気候が無い`);
    if (!D.LORE_ON.loc[id] || !D.LORE[D.LORE_ON.loc[id]]) F(`${id}: 着いたときに開く用語説明が無い`);
    if (!((D.W7_ARRIVE || {})[id] || []).length) F(`${id}: 着いたときの一文が無い`);
    if (!scenes.some((s) => s.kind === "place" && s.id === id && s.scene === L.scene)) F(`${id}: 背景の一覧（docs/art/scenes.json）に無い`);
    if (!rumors.some((r) => r.includes(short(L.name)))) F(`${id}: 噂が無い`);
    const P = (D.W10_PEAKS || {})[id];
    if (!P) { F(`${id}: 山頂の景色（D.W10_PEAKS）が無い`); continue; }
    if (!P.pass || !P.pass.clear || !P.pass.cloud || !P.arrive || !P.vista || !P.after || (P.phase || []).length !== 4 || P.phase.some((x) => !x || !x.length)) F(`${id}: 峠の景色・山場の文（arrive・vista・after）・時間帯の文がそろっていない`);
    if (!P.weather || !(P.weather.霧 || []).length || !(P.weather.雪 || []).length) F(`${id}: 霧と雪の日の景色が無い`);
    if (!P.first || !P.first.text || !P.first.lore) F(`${id}: はじめて立ったときの発見と手引きの一行が無い`);
    else { const [lid, key] = P.first.lore.split(":"); if (!((D.LORE[lid] || {}).lines || []).some((l) => l[0] === key)) F(`${id}: 発見の用語 ${P.first.lore} が無い`); }
    if (/！/.test([P.arrive, P.vista, P.after, ...P.phase.flat()].join(""))) F(`${id}: 山頂の地の文に「！」がある`);
  }
  // 新しい敵：耐性と弱点（E12）・説明
  for (const id of Object.keys(D.ENEMIES).filter((k) => /^w10_/.test(k))) {
    const e = D.ENEMIES[id];
    if (!e.desc) F(`敵 ${id}: 説明が無い`);
    if (!(D.E12 && D.E12.FOES && D.E12.FOES[id])) F(`敵 ${id}: 耐性と弱点（E12）が無い`);
    else if (!/[+]/.test(D.E12.FOES[id]) || !/[-!]/.test(D.E12.FOES[id])) F(`敵 ${id}: 弱点と耐性の両方が無い（${D.E12.FOES[id]}）`);
  }

  const lore = readFileSync(new URL("../../docs/lore/mountains.md", import.meta.url), "utf8");
  for (const id of mounts) if (!lore.includes("`" + id + "`")) F(`${id}: 設定（docs/lore/mountains.md）が無い`);

  // ---------------------------------------------------------------- 出来事の形
  const evs = D.EVENTS.filter((e) => /^w10_/.test(e.id));
  if (evs.length < 8) F(`山の出来事が ${evs.length}（8 以上のはず）`);
  for (const id of mounts) {
    if (!evs.some((e) => e.w10 && (!e.w10.loc || [].concat(e.w10.loc).includes(id)))) F(`${id}: 登っているときの出来事が無い`);
    if (!evs.some((e) => (e.where || []).includes(id) && e.w > 0)) F(`${id}: 麓の出来事が無い`);
  }
  if (!evs.some((e) => e.w10 && e.w10.hut)) F("山小屋の夜の出来事が無い");
  if (!evs.some((e) => e.w10 && [].concat(e.w10.weather || []).includes("霧"))) F("霧の日の出来事が無い");
  const loreOk = (t) => { const [lid, key] = String(t).split(":"); return !!D.LORE[lid] && (!key || D.LORE[lid].lines.some((l) => l[0] === key)); };
  for (const e of evs) {
    if (e.w10 && !(e.where || []).includes("w10")) F(`${e.id}: 登っているときの出来事なのに where に w10 が無い`);
    if (e.w10 && e.w > 0) F(`${e.id}: 登っているときの出来事がふつうの抽選に出る（w が 0 でない）`);
    const stats = new Set(e.choices.filter((c) => c.stat).map((c) => c.stat));
    if (stats.size < 2) F(`${e.id}: 能力値の違う解き方が 2 つ未満`);
    if (!e.choices.some((c) => !c.stat && !c.fight && !c.cond)) F(`${e.id}: 判定なしの選択肢が無い`);
    if (/！/.test(e.text)) F(`${e.id}: 地の文に「！」がある`);
    for (const c of e.choices) for (const o of [c.ok, c.ng]) {
      if (!o) continue;
      [].concat(o.lore || []).forEach((t) => { if (!loreOk(t)) F(`${e.id}「${c.label}」: 用語 ${t} が無い`); });
      [].concat(o.fight || []).forEach((f) => { if (!D.ENEMIES[f]) F(`${e.id}「${c.label}」: 敵 ${f} が無い`); });
      if (o.item && !D.ITEMS[o.item]) F(`${e.id}「${c.label}」: 物 ${o.item} が無い`);
    }
  }

  // ---------------------------------------------------------------- 遊んでみる
  const start = (seed, loc, reuse) => {
    const g = reuse || loadEngine();
    g.rand = seeded(seed);
    const stats = Object.fromEntries(g.data.STATS.map((k) => [k, 60]));
    g.newGame({ cls: Object.keys(g.data.CLASSES)[0], stats, goal: Object.keys(g.data.GOALS)[0], profile: { name: "テスト", sex: "女", age: 22 } });
    g.S.loc = loc; g.S.visited[loc] = true; g.S.gold = 500;
    return g;
  };
  const ids = (g) => g.actions().flatMap((x) => x.list).filter((a) => !a.disabled).map((a) => a.id);
  // 戦いと出来事を片づける（攻撃・最初の選択肢）。山の行動の画面に戻るまで
  const settle = (g) => {
    for (let i = 0; i < 200 && !g.S.over && g.S.mode !== "explore"; i++) {
      const a = ids(g);
      const pick = a.find((x) => x === "cb:attack") || a.find((x) => /^ev:/.test(x)) || a.find((x) => /^cb:/.test(x)) || a.find((x) => x === "back") || a[0];
      if (!pick) break;
      g.S.hp = g.S.maxHp;
      g.act(pick);
    }
  };
  for (const id of mounts) {
    const g = start(11, id);
    const S = g.S, W = g.w10;
    let a = ids(g);
    if (!a.includes("w10up")) F(`${id}: 麓に「山道を登る」が無い`);
    if (!a.some((x) => /^travel:/.test(x))) F(`${id}: 麓から旅に出られない`);
    // 山頂まで
    for (let i = 0; i < 80 && W.stage(S) < W.TOP && !S.over; i++) { S.hp = S.maxHp; g.act("w10up"); settle(g); if (W.stage(S) > 0 && ids(g).some((x) => /^(travel|sail):/.test(x))) { F(`${id}: 登っている間に旅に出られる`); break; } }
    if (S.over) { F(`${id}: 体力を戻しながら登っても死んだ（${S.deathCause}）`); continue; }
    if (W.stage(S) !== W.TOP) { F(`${id}: 80 回登っても山頂に着かない（段 ${W.stage(S)}）`); continue; }
    const P = D.W10_PEAKS[id];
    const logs = S.log.map((x) => x.text);
    if (!S.w10.peaks[id]) F(`${id}: 頂に立った日が残らない`);
    if (!logs.includes(P.first.text)) F(`${id}: はじめて頂に立ったときの発見の文が出ない`);
    if (!S.log.some((x) => x.peak)) F(`${id}: はじめての頂に山場の印が無い`);
    const [lid, key] = P.first.lore.split(":");
    if (!((g.loreOf ? g.loreOf(S) : S.lore || {})[lid] || []).includes(key)) F(`${id}: 発見の手引きの一行が開かない`);
    if (!S.chronicle.some((c) => c.text.includes(D.LOCS[id].name) && c.text.includes("頂"))) F(`${id}: 年表に頂が残らない`);
    // 「景色を眺める」行動は無い（着いた瞬間に見せる）。はじめて峠を越えたときの一文
    if (g.actions().flatMap((x) => x.list).some((x) => /景色|眺め/.test(x.label))) F(`${id}: 「景色を眺める」行動がある（着いた瞬間に見せるはず）`);
    if (!S.w10.passes || !S.w10.passes[id]) F(`${id}: はじめて峠を越えた日が残らない`);
    if (!logs.includes(P.pass.clear) && !logs.includes(P.pass.cloud)) F(`${id}: はじめて峠を越えたときの景色の文が出ない`);
    // 二度目の頂では発見の文が出ない
    const firstN = () => S.log.filter((x) => x.text === P.first.text).length;
    const f0 = firstN();
    g.act("w10down"); settle(g);
    for (let i = 0; i < 40 && W.stage(S) < W.TOP && !S.over; i++) { S.hp = S.maxHp; g.act("w10up"); settle(g); }
    if (W.stage(S) === W.TOP && firstN() !== f0) F(`${id}: 二度目の頂でも発見の文が出る`);
    if (W.stage(S) === W.TOP) { const tail = S.log.slice(-40).map((x) => x.text); if (!tail.some((t) => (P.again || []).includes(t))) F(`${id}: 二度目の頂で着いたときの一文が出ない`); if (!tail.some((t) => [...P.phase.flat(), ...Object.values(P.weather || {}).flat(), ...Object.values(P.season || {}).flat()].includes(t))) F(`${id}: 二度目の頂で景色の文が出ない`); }
    // 山小屋で休む → 全快
    W.setStage(S, W.HUT); S.mode = "explore";
    S.hp = 1; S.mp = 0;
    if (!ids(g).includes("w10rest")) F(`${id}: 山小屋に「休む」が無い`);
    g.act("w10rest");
    if (S.hp !== S.maxHp || S.mp !== S.maxMp) F(`${id}: 山小屋で休んでも全快しない（${S.hp}/${S.maxHp}）`);
    settle(g);
    // 麓まで一気に下りる → 旅に出られる
    S.mode = "explore"; S.hp = S.maxHp;
    g.act("w10foot"); settle(g);
    if (!S.over) {
      if (W.stage(S) !== 0) F(`${id}: 麓まで一気に下りても麓に着かない`);
      if (!ids(g).some((x) => /^travel:/.test(x))) F(`${id}: 下りたあと旅に出られない`);
    }
  }

  // 高さの空：尾根から上は雨が雪に
  {
    const g = start(5, mounts[0]);
    const S = g.S, W = g.w10;
    const sky0 = g.skyAt;
    g.skyAt = () => ({ season: "夏", weather: "雨", still: false });
    W.setStage(S, 1);
    if (W.sky(S).weather !== "雨") F("峠で雨が雨のままでない");
    W.setStage(S, 3);
    if (W.sky(S).weather !== "雪") F("尾根で雨が雪にならない");
    // 景色の文は天候で選ぶ
    g.skyAt = () => ({ season: "夏", weather: "霧", still: false });
    W.setStage(S, W.TOP);
    const P = D.W10_PEAKS[mounts[0]];
    if (W.lines(P, S) !== P.weather.霧) F("霧の日の山頂の景色が霧の文でない");
    g.skyAt = sky0;
    // 別の場所に着くと段は消える
    const dest = Object.keys(D.LOCS[mounts[0]].links)[0];
    g.arrive(dest);
    if (W.stage(S) !== 0 || (S.w10 && S.w10.stage)) F("別の場所に着いても段が残る");
  }
  // 古いセーブ（S.w10 が無い）
  {
    const g = start(7, mounts[1] || mounts[0]);
    delete g.S.w10;
    let thrown = null;
    try { if (!ids(g).includes("w10up")) F("古いセーブで「山道を登る」が無い"); g.act("w10up"); settle(g); } catch (e) { thrown = e; }
    if (thrown) F("古いセーブで登ると例外：" + thrown.message);
  }
  // 出来事のどの選択肢を選んでも壊れない（山の上で）
  const one = loadEngine();
  for (const e of evs) {
    for (let i = 0; i < e.choices.length; i++) {
      const loc = e.w10 && e.w10.loc ? [].concat(e.w10.loc)[0] : (e.where || []).find((w) => D.LOCS[w]) || mounts[0];
      const g = start(100 + i, loc, one);
      g.give("jerky", 2);
      if (e.w10) g.w10.setStage(g.S, e.w10.min || 1);
      try {
        g.startEvent(e.id);
        const c = e.choices[i];
        if (c.cond && !c.cond(g.S)) continue;
        g.chooseEvent(i);
        settle(g);
      } catch (err) { F(`${e.id} の「${e.choices[i].label}」で例外：${err.message}`); }
    }
  }
  // 背景：段の絵が描ける名前で用意されている
  const ui = readFileSync(new URL("../../src/ui/scene_v2_zw10_mount.js", import.meta.url), "utf8");
  for (const k of ["w10_pass", "w10_hut", "w10_ridge", ...mounts.map((id) => "w10_peak_" + id.replace(/^w10_/, "")), ...mounts.map((id) => D.LOCS[id].scene)]) if (!new RegExp(`OUT\\.${k}\\s*=`).test(ui)) F(`背景の絵 ${k} が無い`);

  if (!bad) ok(`W10：山 ${mounts.length}（${mounts.map((id) => D.LOCS[id].name).join("・")}）・出来事 ${evs.length}`);
};
