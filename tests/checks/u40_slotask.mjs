// U40：セーブ・ロードの確かめは小さな窓（#dlgSlotAsk）で出す。枠の列の中に「q7ask」の文を置くと、
// 「タイトルへ」の窓の幅（.q7ask）が当たって右に見切れた（持ち主の声「説明文が右に見切れてる」）
import { readFileSync } from "node:fs";
export default ({ fail, ok }) => {
  const src = readFileSync(new URL("../../src/ui/q7_slots.js", import.meta.url), "utf8");
  if (/h\("span",\s*"q7ask"/.test(src)) fail("u40: 枠の列の中に q7ask の文を置いている（見切れる）");
  else if (!/dlgSlotAsk/.test(src)) fail("u40: 確かめの小さな窓（dlgSlotAsk）が無い");
  else ok("u40: セーブ・ロードの確かめは小さな窓");
};
