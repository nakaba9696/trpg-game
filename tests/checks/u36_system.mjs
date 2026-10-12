// U36：右上の「システム」の一覧が窓の中で切れない（持ち主の声「システムを見ても更新履歴しか表示されない」）・データのリセットもシステムから開ける。
// 画面は DOM なしでは動かないので作りを読む。実際に押して全部見えるかは tools/shots_u36.mjs が Chromium で確かめる
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export default ({ fail }) => {
  const F = (m) => fail("U36 システム: " + m);
  const ui = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "ui");
  const read = (f) => readFileSync(path.join(ui, f), "utf8");
  const js = read("zzzzzzzzz_u36_system.js"), css = read("zzzzzzzzz_u36_system.css");
  if (!/id = "u36SysReset"/.test(js) || !/G\.u35\.open\(\)/.test(js)) F("システムからデータのリセットが開けない");
  // 右上の窓（.tools）にぼかし（backdrop-filter）があると、position: fixed の一覧が窓に対して置かれて切れる。窓そのものからは外す
  if (!/body\.u21pc \.top \.tools \{[^}]*backdrop-filter: none/.test(css)) F("右上の窓のぼかしが一覧を切る");
  // 後から足した CSS が .tools にぼかしを戻していないか（u36 より後のファイル）
  const later = readdirSync(ui).filter((f) => f.endsWith(".css") && f > "zzzzzzzzz_u36_system.css");
  for (const f of later) if (/\.top \.tools\s*\{[^}]*backdrop-filter:\s*(?!none)/.test(read(f)) && !/u31menuopen/.test(read(f))) F(`${f} が右上の窓にぼかしを戻している`);
  // 一覧の並びは DOM の順（u18 の order で更新履歴が後ろへ回らない）
  if (!/#u18SysLog, \.q7sysbox > #q7ToTitle \{ order: 0; \}/.test(css)) F("システムの一覧の順が CSS の order で崩れる");
};
