// V3：モンスターと人物の絵の描き直し（src/ui/art_monsters.js・art_people.js）。DOM なしで確かめられる範囲
// - すべての敵に、知っている体の形と質感（毛・鱗・甲殻・木・粘液・骨・石・金属・肌）が当たり、描くと十分な数の筆が動く。同じ敵はいつも同じ絵
// - ボスは大きく、使徒（majin）はさらに大きい。ボスには不気味な光（aura）が付く
// - 人物：表の種類・主人公の職業・キャラメモの人物すべてが描け、獣人は獣ごとに、エルフは耳で絵が変わる
// - 絵は G.rand を使わない
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok }) => {
  const D = G.data;
  const vmc = vm.createContext({ console, G });
  for (const f of ["art_monsters.js", "art_people.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  const rand0 = G.rand;
  G.rand = () => { throw new Error("絵が G.rand を使った"); };
  // 筆の動きを数え、引数をまとめた指紋を作る偽の canvas
  const rec = () => {
    let n = 0, h = 0;
    const grad = { addColorStop() {} };
    const note = (k, a) => { n++; const s = k + a.map((v) => (typeof v === "number" ? Math.round(v * 10) : typeof v === "string" ? v : "")).join(","); for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; };
    const ctx = new Proxy({}, {
      get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? (...a) => (note(k, a), Object.create(grad)) : (...a) => note(String(k), a)),
      set: (t, k, v) => { if (typeof v !== "object") note("=" + String(k), [v]); return true; },
    });
    return { ctx, get n() { return n; }, get h() { return h; } };
  };
  let bad = 0;
  const F = (m) => { bad++; fail("V3: " + m); };
  const BODY = new Set(["biped", "quad", "blob", "chest", "bug", "wyrm", "swarm"]);
  const MAT = new Set(["fur", "scale", "chitin", "wood", "slime", "bone", "stone", "metal", "skin"]);
  const ids = Object.keys(D.ENEMIES);
  let strokes = 0;
  for (const id of ids) {
    const e = D.ENEMIES[id];
    const L = G.monsterLook(id, e);
    if (!BODY.has(L.body)) F(`敵 ${id}: 体の形 ${L.body} の描き方が無い`);
    if (!MAT.has(L.mat)) F(`敵 ${id}: 質感 ${L.mat} の描き方が無い`);
    if (e.boss && !L.aura) F(`ボス ${id} に光（aura）が無い`);
    if (e.boss && !(e.look && e.look.size) && !(L.size >= 1.12)) F(`ボス ${id} が大きくない（${L.size}）`);
    if (e.majin && !(L.size >= 1.2)) F(`使徒 ${id} が十分に大きくない（${L.size}）`);
    const a = rec(), b = rec();
    try { G.paintMonster(a.ctx, 320, 340, 200, { id, shape: e.shape, eye: e.eye, boss: !!e.boss }); G.paintMonster(b.ctx, 320, 340, 200, { id, shape: e.shape, eye: e.eye, boss: !!e.boss }); }
    catch (err) { F(`敵 ${id}: 描くと例外 ${err.message}`); continue; }
    if (a.n < 300) F(`敵 ${id}: 筆の数が少ない（${a.n}）。描き込みが足りない`);
    if (a.h !== b.h) F(`敵 ${id}: 描くたびに絵が変わる`);
    strokes += a.n;
  }
  // 人物
  const portrait = (who) => { const r = rec(); G.paintPerson(r.ctx, 0, 0, 192, 240, who); return r; };
  const whos = [];
  for (const k of Object.keys(G.PEOPLE)) for (const sex of ["男", "女"]) whos.push([`種類 ${k}（${sex}）`, { kind: k, sex, seed: "v3:" + k }]);
  for (const cls of Object.keys(D.CLASSES)) whos.push([`主人公 ${cls}`, G.heroWho({ name: "テスト", sex: "女", age: 24, look: "銀髪、鋭い目つき" }, cls)]);
  for (const [id, p] of Object.entries(D.C2_PEOPLE || {})) whos.push([`キャラメモ ${p.name}`, p.who]);
  let pn = 0;
  for (const [where, who] of whos) {
    try { const r = portrait(who); if (r.n < 300) F(`${where}: 筆の数が少ない（${r.n}）`); pn++; } catch (err) { F(`${where}: 描くと例外 ${err.message}`); }
  }
  const human = portrait({ kind: "adventurer", sex: "女", age: 22, seed: "v3:race" }).h;
  const elf = portrait({ kind: "adventurer", sex: "女", age: 22, seed: "v3:race", look: { ears: "pointy" } }).h;
  if (elf === human) F("エルフの耳を描いても絵が変わらない");
  const seen = new Map();
  for (const beast of Object.keys(D.BEASTS || {})) {
    let h;
    try { h = portrait({ kind: "adventurer", sex: "女", age: 22, seed: "v3:race", look: { ears: "none", beast } }).h; } catch (err) { F(`獣人（${beast}）: 描くと例外 ${err.message}`); continue; }
    if (h === human) F(`獣人（${beast}）が人と同じ絵になる`);
    if (seen.has(h)) F(`獣人（${beast}）と（${seen.get(h)}）が同じ絵になる`);
    seen.set(h, beast);
  }
  G.rand = rand0;
  if (!bad) ok(`V3 絵：敵 ${ids.length}（ボス ${ids.filter((i) => D.ENEMIES[i].boss).length}・使徒 ${ids.filter((i) => D.ENEMIES[i].majin).length}）に体と質感の描き方があり、平均 ${Math.round(strokes / ids.length)} 筆。人物 ${pn} 人・獣人 ${seen.size} 種を描き分けた`);
};
