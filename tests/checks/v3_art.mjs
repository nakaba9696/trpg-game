// V3：モンスターと人物の絵の描き直し（src/ui/art_monsters.js・art_people.js）。A10 で canvas の絵はやめたので、残るのは「誰か」を決める所だけ
// - 人物：表の種類・キャラメモの人物すべての見た目（性別・年齢・種族の耳）が決まる。獣人は獣ごと、エルフは耳が付く（生成画像の型を選ぶのに使う）
// - canvas に描く入口は何も描かない（G.drawPortrait は枠を空けるだけ・G.paintMonster は何もしない）。見た目は G.rand を使わない
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok }) => {
  const D = G.data;
  const vmc = vm.createContext({ console, G });
  for (const f of ["art_monsters.js", "art_people.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  const rand0 = G.rand;
  G.rand = () => { throw new Error("絵が G.rand を使った"); };
  let bad = 0;
  const F = (m) => { bad++; fail("V3: " + m); };
  const whos = [];
  for (const k of Object.keys(G.PEOPLE)) for (const sex of ["男", "女"]) whos.push([`種類 ${k}（${sex}）`, { kind: k, sex, seed: "v3:" + k }]);
  for (const [, p] of Object.entries(D.C2_PEOPLE || {})) whos.push([`キャラメモ ${p.name}`, p.who]);
  for (const [where, who] of whos) {
    try {
      const L = G.personLook(who);
      if (!(L.sex === "男" || L.sex === "女") || !(L.age > 0)) F(`${where}: 性別か年齢が決まらない`);
      if (who.sex && L.sex !== who.sex) F(`${where}: 性別が指定と違う`);
    } catch (err) { F(`${where}: 見た目を決めると例外 ${err.message}`); }
  }
  if (G.personLook({ kind: "adventurer", sex: "女", seed: "v3", look: { ears: "pointy" } }).ears !== "pointy") F("エルフの耳が見た目に残らない");
  for (const beast of Object.keys(D.BEASTS || {})) if (G.personLook({ kind: "adventurer", sex: "女", seed: "v3", look: { beast } }).beast !== beast) F(`獣人（${beast}）の獣が見た目に残らない`);
  // 描く入口は何も描かない
  const calls = [];
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => calls.push(String(k))), set: (t, k, v) => ((t[k] = v), true) });
  const cls = new Set();
  const cv = { width: 96, height: 120, getContext: () => ctx, classList: { add: (c) => cls.add(c) } };
  G.drawPortrait(cv, { kind: "villager", seed: "v3" });
  G.paintMonster(ctx, 100, 100, 80, { id: "goblin" });
  if (calls.some((k) => k !== "clearRect" && k !== "setTransform")) F(`canvas に絵を描いた（${[...new Set(calls)].join(",")}）`);
  if (!cls.has("noart")) F("絵を出さない canvas に noart の印が無い");
  G.rand = rand0;
  if (!bad) ok(`V3 絵：人物 ${whos.length} 人の見た目（性別・年齢・獣人 ${Object.keys(D.BEASTS || {}).length} 種・エルフ）が決まる。canvas の入口は何も描かない（A10）`);
};
