// W7：旅の行き先を選ぶ場面の小さな世界地図（engine/zzzzzzzzz_w7_travel.js・ui/w7_travelmap.js・.css）
// 持ち主の声「冒険で行き先を選ぶときに世界地図を出してほしい」
// - G.w7.travelChoices(S)：旅の選択肢（travel: / sail:）と同じ行き先を、道の線（曲がり角を含む）と砦の印つきで返す。旅の途中・出来事・戦闘・迷宮の中では空
// - 旅の選択肢の小さな文に、行き先の地方（今いる地方と違うとき）
// - 画面：行動ボタンに data-act、旅の組の上に地図、選択肢に触れると光る（pointerenter・focus）、地図の印を押すと同じボタンを押す、スマホで低く
import { readFileSync } from "node:fs";

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("W7 地図：" + m); };
  const G = loadEngine();
  const D = G.data;
  if (!G.w7 || typeof G.w7.travelChoices !== "function") return F("G.w7.travelChoices が無い");
  G.rand = seeded(5);
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 22 } });
  const S = G.S;
  S.gold = 9999;
  let n = 0;
  for (const [id, L] of Object.entries(D.LOCS)) {
    S.loc = id; S.depth = 0; S.mode = "explore"; S.fac = null; S.travel = null; S.event = null; S.combat = null;
    const acts = G.actions().flatMap((g) => g.list).filter((a) => /^(travel|sail):/.test(a.id));
    const ch = G.w7.travelChoices(S);
    const a1 = acts.map((a) => a.id).sort().join(","), a2 = ch.map((c) => c.id).sort().join(",");
    if (a1 !== a2) F(`${id}: 地図の行き先（${a2}）と旅の選択肢（${a1}）が違う`);
    for (const c of ch) {
      n++;
      const T = D.LOCS[c.to];
      if (!Array.isArray(c.pts) || c.pts.length < 2) F(`${id}→${c.to}: 道の線が無い`);
      else if (c.pts[0][0] !== L.x || c.pts[0][1] !== L.y || c.pts[c.pts.length - 1][0] !== T.x) F(`${id}→${c.to}: 道の線が今いる所から行き先へ向いていない`);
      if (c.gate !== !!(G.w7g && G.w7g.gated(id, c.to))) F(`${id}→${c.to}: 砦の印が関所と違う`);
      const a = acts.find((x) => x.id === c.id);
      if (a && T.region !== L.region && !String(a.sub).includes(T.region)) F(`${id}→${c.to}: 選択肢の文に行き先の地方（${T.region}）が無い（${a.sub}）`);
      if (a && T.region === L.region && String(a.sub).includes(T.region)) F(`${id}→${c.to}: 同じ地方なのに地方を書いている`);
    }
  }
  // 地図を出さない場面
  S.loc = "karna"; S.mode = "explore";
  S.travel = "forest";
  if (G.w7.travelChoices(S).length) F("旅の途中でも行き先の地図を出す");
  S.travel = null; S.mode = "event";
  if (G.w7.travelChoices(S).length) F("出来事の途中でも行き先の地図を出す");
  S.mode = "explore";
  const dun = Object.keys(D.LOCS).find((k) => D.LOCS[k].type === "dungeon");
  S.loc = dun; S.depth = 2;
  if (G.w7.travelChoices(S).length) F("迷宮の中でも行き先の地図を出す");
  S.depth = 0;

  // 画面
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const tm = src("ui/w7_travelmap.js"), css = src("ui/w7_travelmap.css");
  if (!/dataset\.act\s*=/.test(src("ui/ui.js"))) F("行動ボタンに data-act が無い（地図が選択肢を見つけられない）");
  if (!/data-act\^="travel:"/.test(tm) || !/data-act\^="sail:"/.test(tm)) F("地図が旅と船の選択肢を探していない");
  if (!/pointerenter/.test(tm) || !/"focus"/.test(tm)) F("選択肢に触れても行き先が光らない");
  if (!/\.click\(\)/.test(tm)) F("地図の行き先を押しても選択肢と同じ動きにならない");
  if (!/G\.w7\.travelChoices/.test(tm)) F("地図がエンジンの行き先の一覧を使っていない");
  if (/G\.(rand|d|dice|pick)\(/.test(tm)) F("地図がゲームの乱数を使っている");
  if (!/max-width:\s*640px/.test(css) || !/width:\s*100%/.test(css)) F("スマホで横にはみ出さない作りになっていない");
  const eng = src("engine/zzzzzzzzz_w7_travel.js");
  if (/document|window\./.test(eng.replace(/^\s*\/\/.*$/gm, ""))) F("エンジンが DOM に触っている");
  if (!bad) ok(`W7 地図（行き先 ${n} 本＝旅の選択肢・地方の目安・画面）`);
};
