// D7 #121：ゲームブック風の語り（docs/lore/voice.md「語りの調子」）
// - 戦いの始まり・勝ったあと・逃げ切ったとき・迷宮の階を降りたときの地の文の表（D.VOICE）がある
// - 地の文は叫ばない（「！」を使わない）。禁じた言葉・今の人の「魔王」が無い
// - 語りの一行を選ぶのに乱数を使わない（テストの乱数の並びを変えない）
// - 戦いを始めると、表の一行が敵の名前入りで出る
const BANNED = /見世物|観客|客席|舞台|台本|言霊|魔王|！|!/;

export default ({ fail, ok, loadEngine, seeded }) => {
  let failures = 0;
  const F = (m) => { failures++; fail(m); };
  const G = loadEngine();
  const D = G.data;
  const V = D.VOICE || {};
  for (const k of ["meet", "win", "fled", "descend"]) {
    if (!Array.isArray(V[k]) || !V[k].length) { F(`D.VOICE.${k} が無い`); continue; }
    V[k].forEach((t, i) => { if (BANNED.test(t)) F(`D.VOICE.${k}[${i}] に「${t.match(BANNED)[0]}」：${t}`); });
  }
  (V.meet || []).forEach((t, i) => { if (!t.includes("{foes}")) F(`D.VOICE.meet[${i}] に {foes} が無い`); });
  if (typeof G.voiceLine !== "function") F("G.voiceLine が無い");
  else {
    if (G.voiceLine("nothing", null, "既定") !== "既定") F("表の無いときに fallback を返さない");
    G.rand = seeded(7);
    const S = { turn: 0, counters: { kills: 0 } };
    G.S = S;
    const a = G.rand();
    G.rand = seeded(7);
    const line = G.voiceLine("meet", { foes: "テストの敵" }, "");
    if (G.rand() !== a) F("G.voiceLine が乱数を使っている");
    if (!line.includes("テストの敵") || line.includes("{foes}")) F(`敵の名前が入らない：${line}`);
  }

  // 戦いを始めると、表の一行が出る
  {
    const G2 = loadEngine();
    const D2 = G2.data;
    G2.rand = seeded(3);
    const stats = Object.fromEntries(D2.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D2.STATS.map((k) => [k, 80]));
    G2.newGame({ cls: Object.keys(D2.CLASSES)[0], stats, caps, goal: Object.keys(D2.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G2.P = G2.P || { trophies: {}, graves: [] };
    const before = G2.S.log.length;
    G2.startCombat(["goblin"], {});
    const name = D2.ENEMIES.goblin.name;
    const said = G2.S.log.slice(before).map((e) => e.text);
    const pool = D2.VOICE.meet.map((t) => t.replace("{foes}", name));
    if (!said.some((t) => pool.includes(t))) F(`戦いの始まりに語りの一行が出ない：${JSON.stringify(said)}`);
  }

  if (!failures) ok("D7 の語り（戦いの始まりと終わり・迷宮の階の一行。叫ばない・乱数を使わない）");
};
