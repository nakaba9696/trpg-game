// Q7：ログのダメージの数値（赤）・回復の数値（緑）（engine/q7_lognums.js の G.q7.logNums。色は ui/q7_lognums.*）
// - 敵に与えたダメージ（fx: hit）・受けたダメージ（fx: hurt・「HP -N」）・回復（「HP +N」「MP +N」・全快・宿の回復）を拾い、数値の部分だけを返す
// - 品の説明の「HP+30」や、ダメージでない数（残り 5/12・所持金）は拾わない
// - 本物の戦闘で出たログで、与えた・受けたダメージに印が付く
export default ({ G, fail, seeded }) => {
  const D = G.data;
  const F = (m) => fail("Q7 ログの数値: " + m);
  const N = G.q7.logNums;
  const one = (e) => N(e).map((x) => `${x.t}:${x.num}`).join(",");
  const want = (e, s, what) => { const got = one(e); if (got !== s) F(`${what}：${got || "（なし）"}／${s}`); };

  want({ k: "sys", text: "ゴブリンに 7 のダメージ（残り 5/12）", fx: "hit", n: 7 }, "dmg:7", "敵に与えたダメージ");
  want({ k: "nar", text: "ゴブリンの攻撃！ 12 のダメージ。", fx: "hurt", n: 12 }, "hurt:12", "受けたダメージ");
  want({ k: "sys", text: "HP +6" }, "heal:+6", "HP の回復");
  want({ k: "sys", text: "MP +3" }, "heal:+3", "MP の回復");
  want({ k: "sys", text: "セラの治療 HP +4" }, "heal:+4", "仲間の治療");
  want({ k: "sys", text: "HP が全快した。" }, "heal:全快", "全快");
  want({ k: "sys", text: "HP が回復し、MP が全快した。" }, "heal:全快,heal:回復", "宿の回復");
  want({ k: "sys", text: "HP -3" }, "hurt:-3", "出来事で減った HP");
  want({ k: "sys", text: "薬草（HP+30）を買った" }, "", "品の説明の HP+30");
  want({ k: "sys", text: "所持金 -20G" }, "", "所持金");
  want({ k: "dice", text: "HP +3" }, "", "判定の行");
  want({ k: "sys", text: "ゴブリンに 7 のダメージ", fx: "hit" }, "", "n の無い fx");
  if (N(null).length || N({}).length || N({ text: 5 }).length) F("壊れた一件で空でない");
  // 同じ数が二度出ても、ダメージの所だけを返す（「7 のダメージ」の 7）
  const e = { k: "sys", text: "7人目のゴブリンに 7 のダメージ（残り 7/14）", fx: "hit", n: 7 };
  const x = N(e)[0];
  if (!x || x.s !== "7 のダメージ" || x.num !== "7") F(`同じ数が並ぶ文で、ダメージの所を指さない：${JSON.stringify(x)}`);

  // 本物の戦闘
  G.rand = seeded(31);
  G.P = { trophies: {}, graves: [] };
  const stats = {};
  D.STATS.forEach((k) => { stats[k] = 50; });
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ログ試し", sex: "男", age: 30, history: "テスト用", personality: "無口" } });
  const kinds = new Set();
  for (let round = 0; round < 6 && !G.S.over; round++) {
    G.S.hp = G.S.maxHp;
    const from = G.S.log.length;
    G.startCombat(["goblin", "goblin"], {});
    for (let t = 0; t < 40 && G.S.mode === "combat" && !G.S.over; t++) {
      const a = G.actions().flatMap((g) => g.list).filter((y) => !y.disabled && /^cb:(attack|atk|fight|slash)|^cb:a/.test(y.id));
      const list = a.length ? a : G.actions().flatMap((g) => g.list).filter((y) => !y.disabled);
      G.act(list[0].id);
      G.S.hp = Math.max(G.S.hp, 5);
    }
    G.S.log.slice(from).forEach((le) => N(le).forEach((y) => { kinds.add(y.t); if (!le.text.includes(y.s)) F(`拾った所が文に無い：${le.text}`); }));
  }
  if (!kinds.has("dmg")) F("本物の戦闘で、与えたダメージに印が付かない");
  if (!kinds.has("hurt")) F("本物の戦闘で、受けたダメージに印が付かない");
};
