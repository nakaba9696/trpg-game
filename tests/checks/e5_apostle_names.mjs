// E5：呼び名だけだった使徒（鉄喰い・緑の御方・酸の溜まり・咎追い）に、ほかの使徒と同じ「異名＋の使徒＋カタカナ名」の名前がある
// - id と絵のファイル名（e3_tetsukui など）は変えない。骸の素材・図鑑の一覧（docs/art/monsters.json）も同じ名前にそろえる
import { readFileSync } from "node:fs";

const WANT = { e3_tetsukui: "ザルガドム", e3_togaoi: "ネリオス", e3_midori: "リサルナ", e3_sanno: "ゼノバス" };

export default ({ fail, ok, loadEngine }) => {
  const G = loadEngine();
  const E3 = G.data.E3;
  const art = JSON.parse(readFileSync(new URL("../../docs/art/monsters.json", import.meta.url), "utf8"));
  const arts = [].concat(...Object.values(art).filter(Array.isArray));
  let failures = 0;
  const bad = (m) => { failures++; fail(m); };
  for (const [id, kana] of Object.entries(WANT)) {
    const foe = E3.FOES[id];
    if (!foe) { bad(`使徒の名前: ${id} の戦闘データが無い`); continue; }
    const m = /^(.+)の使徒([ァ-ヴー]+)$/.exec(foe.name);
    if (!m || m[2] !== kana) bad(`使徒の名前: ${id} が「〇〇の使徒${kana}」の形でない（${foe.name}）`);
    else if (m[2].length < 4 || m[2].length > 5) bad(`使徒の名前: ${id} のカタカナ名が 4〜5 文字でない`);
    const ap = Object.values(E3.LIST).find((a) => a.foe === id);
    if (ap && ap.drop && /鉄喰い|緑の御方|酸の溜まり|咎追い/.test(ap.drop.name)) bad(`使徒の名前: ${id} の骸の素材が古い呼び名（${ap.drop.name}）`);
    const a = arts.find((x) => x && x.id === id);
    if (a && a.name !== foe.name) bad(`使徒の名前: 絵の一覧の ${id} が「${a.name}」のまま`);
  }
  const names = Object.values(E3.FOES).map((f) => f.name);
  for (const kana of Object.values(WANT)) if (names.filter((n) => n.endsWith(kana)).length !== 1) bad(`使徒の名前: ${kana} が二体以上いる`);
  if (failures === 0) ok(`使徒の名前（${Object.values(WANT).join("・")}）`);
};
