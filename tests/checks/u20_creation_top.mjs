// U20：作成の「人物」の画面は「名前と生まれ」からすぐ始まる（見出し「あなたは何者か」と人物の札を外した）
// - 「全部おまかせ」は残し、段の並び（人物／能力値／確認）の右端に小さなボタンで置く
// - 人物の画面で、段の並びの次（初めての人への一言を除けば）に来るのが「名前と生まれ」の欄
// - 「全部おまかせ」は今までどおり下書きを作り直す（cre.fresh）。札の中身（名前・職業・年齢）は確認のシートに出る
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ G, fail, ok }) => {
  const F = (m) => fail("U20: " + m);
  const src = readFileSync(fileURLToPath(new URL("../../src/ui/setup.js", import.meta.url)), "utf8");
  const p = src.slice(src.indexOf("function person("), src.indexOf("const modText"));
  if (/あなたは何者か/.test(p)) F("人物の画面に見出し「あなたは何者か」が残っている");
  if (/whoCard|whoName|whoLine/.test(p)) F("人物の画面に人物の札が残っている");
  if (!/btn\("全部おまかせ", "small"/.test(p)) F("「全部おまかせ」が小さなボタンでない");
  if (!/steps\(root, 0, all\)/.test(p)) F("「全部おまかせ」が段の並びに置かれていない");
  if (!/cre\.fresh\(R\)/.test(p)) F("「全部おまかせ」で下書きを作り直していない");
  // 段の並びの次は、初めての人への一言（ある人だけ）と「名前と生まれ」
  const at = (k) => p.indexOf(k);
  if (!(at("steps(root, 0, all)") < at("form.append(now)") && at("steps(root, 0, all)") < at("form.append(job)"))) F("段の並びのあとに「名前と生まれ」が来ない");
  if (!/\.creStepsRow/.test(readFileSync(fileURLToPath(new URL("../../src/ui/u20_creation.css", import.meta.url)), "utf8"))) F("段の並びとボタンを一行に置く CSS が無い");
  // 確認のシートには名前・職業・年齢・生まれが出る（外した札の代わり）
  const sh = src.slice(src.indexOf("function sheet("));
  if (!/csName/.test(sh) || !/D\.AGES\[p\.ageBand\]\.name/.test(sh)) F("確認のシートに名前・年齢が出ない");   // 生まれは U25 で無くした
  if (!G.cre || typeof G.cre.fresh !== "function") F("おまかせの下書き（cre.fresh）が無い");
  ok("U20: 人物の画面は「名前と生まれ」から。「全部おまかせ」は段の並びの右端");
};
