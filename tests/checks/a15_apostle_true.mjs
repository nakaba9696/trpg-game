// A15：人に化ける使徒（ベルファス・ディエラン・ヴァルグレア・ユズエル）の「本性」の絵
// - 戦いでは本性の絵（monsters/<id>）、町や会話では人前の姿（portraits/<id>）を出す
// - 本性の絵が assets/monsters/ と docs/art/monsters.json にある
// - 会話（出来事の who）がこの 4 体を魔物（kind "foe"）として呼んでいない（呼ぶと会話でも本性が出てしまう）
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const TRUE = { e3_yura: "yura", e3_chezar: "chezar", e3_azlag: "azlag", e3_yuzuel: "yuzuel" };
const file = (p) => fileURLToPath(new URL("../../" + p, import.meta.url));

export default ({ G, fail, ok }) => {
  const list = JSON.parse(readFileSync(file("docs/art/monsters.json"), "utf8")).monsters || [];
  for (const id of Object.keys(TRUE)) {
    if (!existsSync(file(`assets/monsters/${id}.webp`))) fail(`A15 ${id} の本性の絵（assets/monsters/${id}.webp）が無い`);
    if (!list.some((m) => m.id === id)) fail(`A15 ${id} が docs/art/monsters.json に無い`);
  }

  // 表示側：両方の絵があるとき、戦いの鍵は本性（monsters/）、人前の姿の鍵は portraits/ のまま
  const assets = {};
  for (const [e, p] of Object.entries(TRUE)) { assets["monsters/" + e] = "x.svg#xywh=0,0,1,1"; assets["portraits/" + p] = "y.svg#xywh=0,0,1,1"; }
  const g = { ASSETS: assets };
  const ctx = vm.createContext({ G: g, console });
  vm.runInContext(readFileSync(file("src/ui/v6_monsters.js"), "utf8"), ctx, { filename: "ui/v6_monsters.js" });
  for (const [e, p] of Object.entries(TRUE)) {
    if (g.V6_APOSTLE[e] !== p) fail(`A15 ${e} の人前の姿（V6_APOSTLE）が ${p} でない`);
    const k = g.v6ArtKey(e);
    if (k !== "monsters/" + e) fail(`A15 戦いの ${e} が本性の絵を引かない（${k}）`);
  }
  // 本性の絵が無いときは、これまでどおり人前の姿で戦う
  delete assets["monsters/e3_yura"];
  if (g.v6ArtKey("e3_yura") !== "portraits/yura") fail("A15 本性の絵が無いとき、ベルファスが人前の姿に戻らない");

  // 会話：出来事の who が 4 体を kind "foe" で呼んでいない
  const D = G.data;
  const bad = (D.EVENTS || []).filter((e) => e && e.who && e.who.kind === "foe" && TRUE[e.who.foe]).map((e) => e.id);
  if (bad.length) fail(`A15 会話で本性が出てしまう出来事：${bad.join("、")}（人前の姿は who.kind "majin" などで）`);

  ok("A15 人に化ける使徒 4 体：戦いは本性の絵、会話は人前の姿");
};
