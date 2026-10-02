// A7：異形の絵の設定（style_eldritch.json・dreamshaperXL_lightningDPMSDE）は使わない（持ち主の決定）
// - docs/art/monsters.json に style: "eldritch" の魔物が無い
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export default ({ fail, ok }) => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const M = JSON.parse(readFileSync(root + "docs/art/monsters.json", "utf8"));
  const list = Array.isArray(M) ? M : M.monsters || Object.values(M);
  const bad = list.filter((m) => m && m.style === "eldritch").map((m) => m.id);
  if (bad.length) fail(`A7：異形の設定（style: "eldritch"）を使っている魔物がある：${bad.join("・")}（一般の魔物の設定で作る）`);
  else ok("A7：異形の設定（dreamshaper）を使う魔物は無い");
};
