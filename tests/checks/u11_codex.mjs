// U11：図鑑の新しい印（赤い「！」）・世界の手引きを図鑑の「用語」のタブへ・図鑑と地図のボタン・キーの近道
// - 載る → 印が付く（G.codexFresh）→ 見る（G.codexSeen）→ 消える。用語も、かつての冒険でも知らなかった項目なら印が付く
// - 古い記録（freshV が無い）の印は「見た」扱いになり、いきなり大量に付かない。記録をまとめても新しい印は消えない
// - 手引きの別の窓・入口（#openWorld・#dlgWorld）は無く、#worldBody は図鑑の窓の中。本文の強調（U8）からは G.ui.openWorld で用語のタブへ
// - 世界地図は図鑑の窓から外し、図鑑の隣の「地図」ボタン（上の列・冒険中の帯）。Z で図鑑・M で地図
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import path from "node:path";

const src = fileURLToPath(new URL("../../src/", import.meta.url));
const read = (p) => readFileSync(path.join(src, p), "utf8");

export default ({ G, fail, ok, seeded, loadEngine }) => {
  let bad = 0;
  const no = (m) => { bad++; fail(m); };
  const D = G.data;
  const begin = (G2) => {
    G2.rand = seeded(1111);
    G2.newGame({ cls: Object.keys(G2.data.CLASSES)[0], stats: Object.fromEntries(G2.data.STATS.map((k) => [k, 60])), caps: Object.fromEntries(G2.data.STATS.map((k) => [k, 80])), goal: Object.keys(G2.data.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G2.S;
  };

  // ---------------------------------------------------------------- 載る → 印 → 見る → 消える
  G.P = { trophies: {}, graves: [] };
  begin(G);
  if (typeof G.codexFresh !== "function") { fail("G.codexFresh が無い"); return; }
  const start = G.codexFresh().length;
  if (start) no(`始めたばかりで新しい印が ${start} 個ある（持ち始めの品は印を付けない）`);
  const item = Object.keys(D.ITEMS).find((id) => id !== "fists" && !G.codexHasItem(id));
  G.give(item);
  if (!G.codexFresh("item").includes(item)) no("新しく手に入れた物に印が付かない");
  if (!G.codexIsFresh("item", item)) no("G.codexIsFresh が新しい物を新しいと言わない");
  const foe = Object.keys(D.ENEMIES).find((id) => !G.codexFoe(id));
  G.codexMeet(foe);
  if (!G.codexFresh().includes("foe:" + foe)) no("新しく出会った魔物に印が付かない");
  G.codexSeen("item", item);
  if (G.codexFresh("item").includes(item)) no("見たのに物の印が消えない");
  if (!G.codexFresh().includes("foe:" + foe)) no("物を見ただけで魔物の印まで消えた");
  G.codexSeen("foe", foe);
  if (G.codexFresh().length) no(`全部見たのに印が残る：${G.codexFresh().join("、")}`);

  // 用語：初めて知った項目に印。黙って開いた（古いセーブの開き直し）・かつての冒険で知っていた項目には付けない
  const loreIds = Object.keys(D.LORE).filter((id) => !(G.loreOf(G.S)[id] || []).length);
  const [l1, l2, l3] = loreIds;
  G.openLore(l1);
  if (!G.codexFresh("lore").includes(l1)) no("初めて知った用語に印が付かない");
  G.openLore(l2, true);
  if (G.codexFresh("lore").includes(l2)) no("黙って開いた用語に印が付く");
  G.P.loreSeen[l3] = [D.LORE[l3].lines[0][0]];
  G.openLore(l3);
  if (G.codexFresh("lore").includes(l3)) no("かつての冒険で知っていた用語に印が付く");
  G.codexSeen("lore", l1);
  if (G.codexFresh("lore").length) no("見た用語の印が消えない");

  // ---------------------------------------------------------------- 古い記録で大量に付かない・まとめても消えない
  {
    const G2 = loadEngine();
    const old = {};
    Object.keys(G2.data.ITEMS).slice(0, 40).forEach((id) => { old["item:" + id] = 1; });
    G2.P = { trophies: {}, graves: [], codex: { items: {}, foes: {}, people: {}, fresh: old } };
    if (G2.codexFresh().length) no(`古い記録の印が ${G2.codexFresh().length} 個そのまま出る（見た扱いのはず）`);
    begin(G2);
    const it = Object.keys(G2.data.ITEMS).find((id) => id !== "fists" && !G2.codexHasItem(id));
    G2.give(it);
    if (G2.codexFresh().length !== 1) no(`古い記録のあとに 1 つ載ったのに印が ${G2.codexFresh().length} 個`);
    const other = Object.keys(G2.data.ITEMS).find((id) => id !== it && id !== "fists");
    const merged = G2.codexMerge(G2.P.codex, { items: {}, foes: {}, people: {}, fresh: { ["item:" + other]: 1 } });
    G2.P.codex = merged;
    if (!G2.codexFresh().includes("item:" + it)) no("記録をまとめたら新しい印が消えた");
    if (G2.codexFresh().includes("item:" + other)) no("記録をまとめたら、古い記録の印が戻ってきた");
  }

  // ---------------------------------------------------------------- キーの近道（DOM なし）
  {
    const c = { u11: null };
    vm.runInContext(read("ui/zu11_quick.js"), vm.createContext({ globalThis: { G: c } }));
    const k = c.u11 && c.u11.keyAction;
    if (!k) no("u11.keyAction が無い");
    else {
      const cases = [
        [{ key: "z" }, false, null, "codex"], [{ key: "Z" }, false, null, "codex"], [{ key: "m" }, false, null, "map"],
        [{ key: "z" }, true, null, null], [{ key: "z", ctrlKey: true }, false, null, null], [{ key: "z", isComposing: true }, false, null, null],
        [{ key: "z" }, false, "dlgCodex", "close"], [{ key: "m" }, false, "dlgW5Map", "close"], [{ key: "z" }, false, "dlgTrophy", null], [{ key: "x" }, false, null, null],
      ];
      cases.forEach(([ev, typing, dlg, want]) => { const got = k(ev, typing, dlg); if (got !== want) no(`キー ${JSON.stringify(ev)}（打っている ${typing}・窓 ${dlg}）が ${got}（${want} のはず）`); });
    }
  }

  // ---------------------------------------------------------------- 手引きは図鑑の用語のタブ・地図は別のボタン
  const html = read("index.html");
  if (/id="openWorld"|id="dlgWorld"/.test(html)) no("世界の手引きの別の入口・窓が index.html に残っている");
  const uiFiles = readdirSync(path.join(src, "ui")).filter((f) => f.endsWith(".js"));
  uiFiles.forEach((f) => { if (/["#]openWorld"|#dlgWorld|"dlgWorld"/.test(read("ui/" + f).replace(/G\.ui\.openWorld|ui\.openWorld/g, ""))) no(`ui/${f} がまだ手引きの窓（#openWorld・#dlgWorld）を見ている`); });
  const f2 = read("ui/f2_codex.js");
  if (!/\.id = "worldBody"/.test(f2)) no("図鑑の窓の中に #worldBody（用語のタブ）が無い");
  if (!/G\.ui\.openWorld = /.test(f2)) no("G.ui.openWorld（用語のタブを開く）が無い");
  if (!/tab\("lore", "用語"\)/.test(f2)) no("図鑑に「用語」のタブが無い");
  if (!/G\.ui\.openWorld\(\)/.test(read("ui/u8_glossary.js"))) no("本文の強調（U8）から用語のタブへ飛ばない");
  if (/dlgCodex/.test(read("ui/w5_map.js"))) no("世界地図が図鑑の窓の中に残っている（w5_map.js）");
  const q = read("ui/zu11_quick.js");
  ["\"openMap\"", "\"u11Codex\"", "\"u11Map\"", "codexOpen", "#openSheet", "showSaved"].forEach((x) => { if (!q.includes(x)) no(`図鑑・地図のボタンか保存の印が無い：${x}`); });
  const css = read("ui/zu11_quick.css");
  if (!/content: "！"/.test(css)) no("新しい印に「！」の字が無い（色だけに頼っている）");
  if (!/prefers-reduced-motion/.test(css)) no("保存の印が prefers-reduced-motion で止まらない");

  if (!bad) ok("U11：図鑑の新しい印（載る→付く→見る→消える・古い記録）・用語のタブ・図鑑と地図のボタン・キーの近道");
};
