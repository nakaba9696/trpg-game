// Q8：序盤の死にやすさ（持ち主の声「ゴブリンとちょっと旅しただけで END になった」）
// - 決まった乱数で、新しい人物が出発地の近く（危険度 1 までの野）で戦い続ける遊び方（tests/early.mjs の careful）を回し、
//   最初の 10 戦で死ぬ割合が目安より低い（ふつうに遊んで最初の数戦はまず死なない）
// - 同じく「とにかく戦う」遊び方（reckless：いちばん近い野へ。魔法使いは危険度 2 の沼しか近くに無い）も、最初の 5 戦で死ぬ割合が目安より低い
// - 筋のよい遊び方（tests/bot.mjs）は、最初の 10 戦でほとんど死なない
// - 見積もり：探索・旅・出来事の戦いの選択肢の横に手ごたえの言葉が出る。戦いの始めに言葉が出る。数は出さない
// - 駆け出しのうちは、危険度 1 の場所で場所より強い段の敵が出ない
// 全部の表は node tests/early.mjs（前後の比べは docs/q8_early.md）
import { playEarly, sum } from "../early.mjs";

const LIMIT = { careful: { k: "dead10", max: 0.08 }, reckless: { k: "dead5", max: 0.3 }, smart: { k: "dead10", max: 0.03 } };
const GAMES = { careful: 30, reckless: 20, smart: 10 };

export default ({ G, fail, ok, loadEngine, seeded }) => {
  for (const [mode, { k, max }] of Object.entries(LIMIT)) {
    const rows = playEarly({ mode, games: GAMES[mode], steps: mode === "smart" ? 200 : 250, seed: 0 });
    const n = sum(rows, "games");
    const rate = sum(rows, k) / n;
    const by = rows.map((r) => `${r.cls} ${Math.round((100 * r[k]) / r.games)}%`).join("・");
    if (!(rate <= max)) fail(`q8 ${mode}: 最初の ${k === "dead5" ? 5 : 10} 戦で死ぬ割合 ${(100 * rate).toFixed(1)}%（${Math.round(100 * max)}% 以下にする）：${by}`);
    else ok(`q8 ${mode}: 最初の ${k === "dead5" ? 5 : 10} 戦で死ぬ割合 ${(100 * rate).toFixed(1)}%（${n} 回。${by}）`);
  }

  // 見積もりの言葉
  const E = loadEngine();
  const D = E.data;
  E.rand = seeded(8);
  E.P = { trophies: {}, graves: [] };
  const q = E.cre.quickStats("merc", E.rand);
  E.newGame({ cls: "merc", stats: q.stats, caps: q.caps, goal: "king", profile: { name: "測定", sex: "男", age: 20 } });
  const words = D.Q8.threat.map((t) => t.word);
  const subs = E.actions().flatMap((g) => g.list).filter((a) => a.id.startsWith("travel:") && D.LOCS[a.id.slice(7)].type !== "town").map((a) => a.sub);
  if (!subs.length || !subs.every((s) => words.some((w) => s.endsWith(w)))) fail(`q8: 野への旅の選択肢に手ごたえの言葉が無い：${subs.join(" / ")}`);
  if (D.Q8.threat.some((t) => /[0-9０-９%％]/.test(t.say + t.word)) || /[0-9０-９%％]/.test(D.Q8.lowHpSay)) fail("q8: 見積もりの言葉に数が入っている");
  E.startCombat(["goblin"], {});
  if (!E.S.log.some((l) => D.Q8.threat.some((t) => l.text === t.say))) fail("q8: 戦いの始めに見積もりの言葉が出ない");
  const huge = E.q8Threat(["blackknight", "blackknight"]);
  if (!huge || huge.word !== words[words.length - 1]) fail(`q8: 黒騎士二体が駆け出しに「${huge && huge.word}」と見積もられた（命がけのはず）`);
  E._endCombat("fled");

  // 駆け出しのうちは、危険度 1 の場所の行きずりの出会いに場所より強い段の敵が出ない。HP が少なくなると知らせる
  E.S.loc = "plains";
  let strong = 0, pairs = 0;
  for (let i = 0; i < 300; i++) {
    E.S.counters.kills = 0;
    E.S.hp = E.S.maxHp;
    E.q8Encounter(["banditboss", "bandit"], { e4raw: true });
    const C = E.S.combat;
    if (C.foes.some((f) => (D.ENEMIES[f.id].tier || 1) > 1)) strong++;
    if (C.foes.length > 1) pairs++;
    E._endCombat("fled");
  }
  if (strong) fail(`q8: 駆け出しが危険度 1 の場所で強い段の敵に出会った（${strong}/300）`);
  if (!(pairs > 0 && pairs < 150)) fail(`q8: 駆け出しの二体組みの割合が目安から外れた（${pairs}/300）`);
  E.S.counters.kills = 99;
  E.q8Encounter(["banditboss", "bandit"], { e4raw: true });
  if (E.S.combat.foes.length !== 1 || E.S.combat.foes[0].id !== "banditboss") fail("q8: 駆け出しを過ぎたら、強い段の敵は一体で出るはず");
  E.S.hp = E.S.maxHp;
  E.hurt(Math.ceil(E.S.maxHp * 0.7), "測定");
  if (!E.S.log.some((l) => l.text === D.Q8.lowHpSay)) fail("q8: HP が少なくなったときの知らせが出ない");
  E._endCombat("fled");
  // 出来事の戦いは書かれたとおり（通行料の盗賊二人）
  E.S.counters.kills = 0;
  E.startEvent("toll");
  const fightIdx = D.EVENTS.find((e) => e.id === "toll").choices.findIndex((c) => c.fight);
  const a = E.actions().flatMap((g) => g.list).find((x) => x.id === "ev:" + fightIdx);
  if (!a || !words.some((w) => a.sub.endsWith(w))) fail(`q8: 出来事の「戦う」に手ごたえの言葉が無い：${a && a.sub}`);
  E.chooseEvent(fightIdx);
  if (!E.S.combat || E.S.combat.foes.length !== 2) fail("q8: 出来事の戦いの敵の数が変わった");
  ok("q8: 見積もりの言葉・駆け出しの出会い・HP の知らせ・出来事の戦い");
};
