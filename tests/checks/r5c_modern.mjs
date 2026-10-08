// R5c：この世界に合わない絵（現代の服に見える絵）を外す・港の敵を丘に出さない（0.6.0 の再レビュー 中 5〜7）
// - 一覧（docs/art/portraits.json・monsters.json）の redraw は、何が合わないか（modern）とどう直すか（fix）を書き、今の画像ファイルがある
// - redraw の絵は公開する画像にも埋め込みにも入らない（その人・敵は絵なし。canvas には戻さない）。表情の差分も入らない
// - portraits.md・monsters.md の「描き直し待ち」にどの id も載っている
// - 鐘撞きの丘の出会いの表に港の用心棒がいない（丘と塔には鐘楼の蝙蝠）。港の用心棒はどこかの表に残る
import { readFileSync, existsSync } from "node:fs";
import { redrawKeys, siteAssets, scanAssets, variantOf } from "../../tools/assets.mjs";

export default ({ G, fail, ok }) => {
  const D = G.data;
  const errs = [];
  const F = (m) => { errs.push(m); fail("R5c " + m); };
  const root = new URL("../../", import.meta.url);
  const lists = [["portraits", "portraits.json", "portraits.md"], ["monsters", "monsters.json", "monsters.md"]];
  const redrawn = redrawKeys();
  let n = 0;
  for (const [dir, json, md] of lists) {
    const data = JSON.parse(readFileSync(new URL("docs/art/" + json, root), "utf8"));
    const items = Array.isArray(data[dir]) ? data[dir] : Object.values(data[dir]);
    const text = readFileSync(new URL("docs/art/" + md, root), "utf8");
    const sec = text.split("## 描き直し待ち")[1] || "";
    for (const x of items.filter((x) => x.redraw)) {
      n++;
      if (!x.redraw.modern || !x.redraw.fix) F(`${json} の ${x.id} の redraw に modern（何が合わないか）と fix（どう直すか）が無い`);
      if (!existsSync(new URL(x.file, root))) F(`${json} の ${x.id} は redraw なのに画像ファイルが無い（描き直したら redraw を外す）`);
      if (!redrawn.has(`${dir}/${x.id}`)) F(`${dir}/${x.id} が redrawKeys に入らない`);
      if (!sec.split("\n## ")[0].includes(`${x.id}.webp`)) F(`${md} の「描き直し待ち」に ${x.id} が無い（node tools/${dir === "portraits" ? "portraits" : "monsters"}.mjs で作り直す）`);
    }
  }
  if (!redrawn.has("monsters/w3_smuggler")) F("港の用心棒の絵（現代の警備員）が描き直し待ちになっていない");
  if (!redrawn.has("portraits/kind_merchant_m")) F("商人の型の絵（現代のベスト）が描き直し待ちになっていない");
  // 載せない
  const dir = new URL("assets/", root).pathname;
  const site = siteAssets(dir);
  const out = (k) => redrawn.has(k) || (variantOf(k) && redrawn.has(variantOf(k).base));
  for (const k of Object.keys(site.map)) if (out(k)) F(`描き直し待ちの ${k} が公開する画像に入っている`);
  for (const f of scanAssets(dir).files) if (out(f.key)) F(`描き直し待ちの ${f.key} が埋め込み（--embed）に入る`);
  // 港の敵を丘に出さない
  const bells = D.LOCS.w3_bells;
  if ((bells.pool || []).includes("w3_smuggler") || (bells.e4pool || []).includes("w3_smuggler")) F("鐘撞きの丘の出会いの表に港の用心棒がいる");
  if (!(bells.e4pool || []).includes("e4_bellbat")) F("鐘撞きの丘に鐘楼の蝙蝠が出ない");
  if (!Object.values(D.LOCS).some((L) => (L.pool || []).includes("w3_smuggler"))) F("港の用心棒がどの表にもいない");
  if (!errs.length) ok(`R5c 現代に見える絵 ${n} 枚を描き直し待ちにして載せない・鐘撞きの丘に港の用心棒は出ない（鐘楼の蝙蝠）`);
};
