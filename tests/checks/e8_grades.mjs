// E8：化け物の格（S・A・B・C・D 級。src/data/e8_grades.js・src/engine/e8_grade.js）
// - すべての敵に格がある。使徒は S・A・B、S は使徒だけ。ボス・迷宮の主・名のある強敵は B 以上
// - 使徒の表の rank は S・A・B（古い呼び名「天災・国難・討伐」が来ても、読み込みで直り、倍率も引ける）
// - 戦闘の始まりと図鑑に「B 級」の形で出る。トロフィー・用語説明に古い格の呼び名が残っていない
// - 使徒はみな「人の言葉を理解する化け物」。ただし言葉を解する化け物がみな使徒とは限らない（VISION・用語説明・GM 向けの設定）
// - 格と強さの決まり（ボット）：A 級・S 級の使徒は、条件なし（剣だけ）の鍛えた冒険者にはまず負けない／魔物の B 級は備えた冒険者に倒せる
import { readFileSync } from "node:fs";

const PROFILE = { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" };

export default ({ fail, ok, loadEngine, seeded }) => {
  const G0 = loadEngine();
  const D0 = G0.data;
  if (!D0.E8 || !G0.gradeOf) return fail("E8 の格（D.E8・G.gradeOf）が無い");
  const ORDER = D0.E8.ORDER;
  const all = Object.assign({}, D0.E3.FOES, D0.ENEMIES);
  const above = (g, b) => ORDER.indexOf(g) <= ORDER.indexOf(b);

  // ---------------------------------------------------------------- すべての敵に格
  const count = {};
  for (const [id, e] of Object.entries(all)) {
    const g = G0.gradeOf(id);
    count[g] = (count[g] || 0) + 1;
    if (!ORDER.includes(g)) { fail(`敵 ${id}（${e.name}）に格が無い`); continue; }
    const ap = G0.e3Of(id);
    if (ap && !["S", "A", "B"].includes(g)) fail(`使徒 ${id} の格が ${g}（S・A・B のどれか）`);
    if (!ap && g === "S") fail(`使徒でない ${id}（${e.name}）が S 級`);
    if ((e.boss || (D0.W8_FOES || {})[id]) && !above(g, "B")) fail(`ボス・強敵 ${id}（${e.name}）が ${g} 級（B 以上に）`);
    if (e.majin && !ap) fail(`絶界を持つ ${id} が使徒の表に無い`);
  }
  for (const a of Object.values(D0.E3.LIST)) if (!["S", "A", "B"].includes(a.rank)) fail(`使徒 ${a.id} の表の格が ${a.rank}`);
  for (const id of ["goblin", "e2_cookgob"]) if (all[id] && !["C", "D"].includes(G0.gradeOf(id))) fail(`ふつうの魔物 ${id} が ${G0.gradeOf(id)} 級`);
  if (!count.S || !count.A || !count.B || !count.C || !count.D) fail(`格のどれかが一体もいない：${JSON.stringify(count)}`);
  console.log("NOTE E8 格の数: " + ORDER.map((g) => `${g} ${count[g] || 0}`).join("・"));

  // 古い呼び名の使徒が来ても動く
  {
    const G = loadEngine();
    const E3 = G.data.E3;
    E3.LIST.e8_old = Object.assign({}, E3.LIST.levian, { id: "e8_old", rank: "国難" });
    if (!E3.WEAK["国難"] || E3.WEAK["国難"] !== E3.WEAK.A) fail("古い呼び名「国難」で倍率が引けない");
    if (!E3.DREAD["天災"]) fail("古い呼び名「天災」で格の言い方が引けない");
    G.gradeFix();
    if (E3.LIST.e8_old.rank !== "A") fail("古い呼び名の rank が A に直らない");
    if (Object.keys(E3.WEAK).some((k) => !["S", "A", "B"].includes(k))) fail("倍率の表の数えあげに古い呼び名が出る");
  }

  // ---------------------------------------------------------------- 見える所
  {
    const G = loadEngine();
    G.rand = seeded(8);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    G.data.STATS.forEach((k) => { stats[k] = 30; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { ...PROFILE } });
    G.S.mode = "event";
    G.startCombat(["goblin", "goblin"]);
    const lines = G.S.log.map((l) => l.text || "").filter((t) => /^格：/.test(t));
    if (lines.length !== 1 || !/ゴブリン D 級$/.test(lines[0])) fail(`戦闘の始まりに格が一行出ない：${lines.join(" / ")}`);
    if (G.s4enc && G.s4enc.cardOf) { const c = G.s4enc.cardOf(G.S); if (c && !/D 級/.test(c.names)) fail("戦闘の見出しに格が無い"); }
    const row = (G.codexFoeStats("goblin") || []).find(([k]) => k === "格");
    if (G.codexFoe("goblin") && (!row || !/^[SABCD] 級$/.test(row[1]))) fail(`図鑑の魔物の格が「D 級」の形でない：${row && row[1]}`);
  }
  // 古い格の呼び名が、プレイヤーに見える文に残っていない
  const OLD = /(天災|国難|討伐)の格|天災・国難・討伐|天を落とす|国の代わりに/;
  const seen = [];
  Object.values(D0.LORE || {}).forEach((e) => e.lines.forEach((l) => seen.push(l[1])));
  (D0.TROPHIES || []).forEach((t) => seen.push(t.name, t.desc));
  D0.E3.TROPHIES.forEach((t) => seen.push(t.name, t.desc));
  Object.values(D0.E3.DREAD).forEach((x) => seen.push(...x));
  ((D0.WORLD || {}).sections || []).forEach((s) => (s[1] || []).forEach((r) => seen.push(r[1])));
  (D0.RUMORS || []).forEach((r) => seen.push(typeof r === "string" ? r : r && r.text));
  for (const t of seen) if (typeof t === "string" && OLD.test(t)) fail(`古い格の呼び名が残っている：${t.slice(0, 40)}…`);
  // 使徒の定義
  const vision = readFileSync(new URL("../../docs/VISION.md", import.meta.url), "utf8");
  if (!/人の言葉を理解する化け物/.test(vision)) fail("docs/VISION.md の用語集に使徒の定義（人の言葉を理解する化け物）が無い");
  if (!(D0.LORE_GM || []).some((t) => /人の言葉を理解する化け物/.test(t))) fail("GM 向けの設定に使徒の定義が無い");
  if (!((D0.LORE.majin || {}).lines || []).some((l) => /人の言葉が分かる/.test(l[1]))) fail("用語説明「使徒」に、人の言葉が分かる化け物という行が無い");
  // 言葉が分かる＝使徒、と読めないように（「みな使徒とは限らない」を添える）
  const notAll = /みな使徒とは限らない/;
  if (!notAll.test(vision)) fail("docs/VISION.md の用語集に「言葉を解する化け物がみな使徒とは限らない」が無い");
  if (!(D0.LORE_GM || []).some((t) => notAll.test(t))) fail("GM 向けの設定に「みな使徒とは限らない」が無い");
  if (!((D0.LORE.majin || {}).lines || []).some((l) => notAll.test(l[1]))) fail("用語説明「使徒」に「みな使徒とは限らない」が無い");
  // S 級は物理法則にすら影響を与える格。その言葉（意思）を人は理解できないことがある
  if (!/物理法則/.test(vision) || !(D0.LORE_GM || []).some((t) => /物理法則/.test(t))) fail("S 級の説明（物理法則にすら影響を与える格）が VISION か GM 向けの設定に無い");
  if (!/理解できないことがある|理解できるとは限らない/.test(vision)) fail("VISION に、S 級の言葉を人は理解できないことがある、が無い");
  if (!/物の理/.test(D0.E8.WORD.S)) fail("格の言い方（D.E8.WORD.S）に S 級の性質が無い");

  // ---------------------------------------------------------------- 格と強さ（ボット）
  const STRONG = { 筋力: 67, 体力: 67, 敏捷: 57, 知力: 42, 魔力: 30, 魅力: 42 };
  const party = (G, seed, st, sword) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    G.data.STATS.forEach((k) => { stats[k] = 50; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { ...PROFILE } });
    const S = G.S;
    Object.assign(S.stats, st);
    S.maxHp = S.hp = G.maxHpOf(S.stats);
    S.weapon = sword ? "volgrim" : "mithril"; S.armor = "dragonmail";
    S.inv = { potion: 6, elixir: 2 };
    S.companions = [0, 1, 2].map((i) => ({ name: `傭兵の${"アベル,ブラン,カイ".split(",")[i]}`, cls: "傭兵", power: 70, dmg: 2, desc: "無口" }));
  };
  const fight = (G, start) => {
    const S = G.S;
    S.mode = "event";
    start();
    let n = 0;
    while (S.mode === "combat" && !S.over && n++ < 200) {
      const potion = ["elixir", "potion"].find((p) => S.inv[p]);
      G.act(S.hp < S.maxHp * 0.45 && potion ? "cb:item:" + potion : "cb:attack");
    }
    return !S.over && S.mode !== "combat";
  };
  const N = 8;
  const rows = [];
  // A・S 級の使徒（討伐できるもの）：絶界を破る剣だけ持ち、条件・仲間の使徒・弱点なしで挑む鍛えた冒険者は、まず勝てない
  // 持ち主の決定「A 級は基本的に国を挙げないと倒せない」（黒鎧・苔衣も含めて。engine/zz_e8_arank.js）。条件をそろえれば勝てる道は残る
  const keysAll = (G, on) => Object.values(G.data.E3.LIST).forEach((x) => x.keys.forEach((k) => { k.test = () => on; }));
  for (const a of Object.values(D0.E3.LIST).filter((x) => x.rank !== "B" && !x.noslay)) { // 倒せない使徒は戦いにならない（e8_unslay）
    let w = 0, k = 0;
    for (let i = 0; i < N; i++) {
      const G = loadEngine();
      party(G, 4000 + i, STRONG, true);
      keysAll(G, false);
      if (fight(G, () => G.apply({ e3fight: a.id })) && G.S.flags[a.flag]) w++;
    }
    for (let i = 0; i < 4; i++) {
      const G = loadEngine();
      party(G, 6000 + i, STRONG, false);
      keysAll(G, true);
      if (G.e10Fill) G.e10Fill(G.S); // 弱らせる出来事（E10）も
      if (fight(G, () => G.apply({ e3fight: a.id })) && G.S.flags[a.flag]) k++;
    }
    rows.push(`${a.id}(${a.rank}) 剣だけ ${w}/${N}・条件そろえて ${k}/4`);
    const max = a.rank === "S" ? 0 : 1;
    if (w > max) fail(`${a.rank} 級の使徒 ${a.id}: 条件なし・剣だけの冒険者に ${w}/${N} 勝てる（${a.rank} 級は基本は勝てない）`);
    if (k < 1) fail(`${a.rank} 級の使徒 ${a.id}: 条件をそろえても勝てない（勝てる道が無い）`);
  }
  // 魔物の B 級（ボス・迷宮の主・強敵）：その相手の点より 15 高い、備えた冒険者（良い装備・仲間三人・薬）なら倒せる
  for (const id of Object.keys(D0.ENEMIES).filter((x) => !G0.e3Of(x) && G0.gradeOf(x) === "B")) {
    const lv = G0.foeLv(D0.ENEMIES[id]) + 15;
    let w = 0;
    for (let i = 0; i < 4; i++) {
      const G = loadEngine();
      party(G, 5000 + i, { 筋力: lv, 体力: lv, 敏捷: lv - 5, 知力: 30, 魔力: 20, 魅力: 30 }, false);
      if (fight(G, () => G.startCombat([id]))) w++;
    }
    if (w < 2) fail(`B 級の魔物 ${id}（${D0.ENEMIES[id].name}）: 備えた冒険者でも ${w}/4 しか勝てない`);
  }
  console.log("NOTE E8 A・S 級の使徒の勝ち数: " + rows.join(" ／ "));
};
