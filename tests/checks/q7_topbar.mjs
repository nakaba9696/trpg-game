// Q7：右上の道具の列を一か所に・設定を一つの窓に（ui/zz_q7_topbar.js・ui/zz_q7_topbar.css。画面は DOM なしでは動かないので、作りを読んで確かめる。
// 実際の並び・はみ出し・ボタンの数は tools/shots_q7_topbar.mjs が Chromium で確かめる）
// - 並べる順：図鑑・地図・依頼・ステータス・セーブ／ロード、狭い画面で「…」に畳むもの：トロフィーと墓碑・ログ・タイトルへ、最後に設定
// - タイトルへ：確かめてから、中断の枠に保存して戻る
// - 帯の下の段（U11 の図鑑・地図・依頼の並び）を外す。図鑑の赤い「！」は data-codex-open の付いた右上の図鑑に
// - 「明暗」「音」のボタンは隠し、設定の窓にまとめる。音の行は sound.js が窓の外でも探せる（document.getElementById）
// - 設定の窓に項目を足す口 G.ui.addSetting と、開く口 G.ui.openSettings
// - キーの近道（Z・M・Q・S・L）は今まで通り（それぞれのファイルに残っている）
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export default ({ fail }) => {
  const F = (m) => fail("Q7 右上の並び: " + m);
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
  const read = (f) => readFileSync(path.join(src, f), "utf8");
  const js = read("ui/zz_q7_topbar.js"), css = read("ui/zz_q7_topbar.css");
  const list = (name) => { const m = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(js); return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : null; };
  const main = list("MAIN"), more = list("MORE"), hide = list("HIDE");
  if (!main || main.join(",") !== "#openCodex,#openMap,#q7Quests,#openSheet,.q7top") F(`右上の並びが違う：${main}`);
  if (!more || more.join(",") !== "#openTrophy,#openLog,#q7ToTitle") F(`「…」に畳むものが違う：${more}`);
  // タイトルへ：確かめてから、中断の枠に残して戻る
  if (!/タイトルに戻りますか？/.test(js) || !/最後の行動までは「中断」として残ります/.test(js)) F("タイトルへの確かめの文が無い");
  if (!/G\.main\.save\(\);[^\n]*\n[^\n]*\n\s*G\.main\.toTitle\(\)/.test(js)) F("タイトルへ戻る前に中断の枠へ保存していない");
  if (!hide || !hide.includes("#themeBtn") || !hide.includes("#openSound")) F("「明暗」「音」のボタンを設定の窓にまとめていない");
  if (!/\$\("#mbar \.u11quick"\)/.test(js) || !/row\.remove\(\)/.test(js)) F("帯の下の段（U11）を外していない");
  if (!/ui\.addSetting = /.test(js) || !/ui\.openSettings = /.test(js)) F("設定の窓の口（G.ui.addSetting・G.ui.openSettings）が無い");
  for (const k of ["toggle", "range", "select", "custom"]) if (!js.includes(`"${k}"`)) F(`addSetting の種類 ${k} を扱っていない`);
  if (!/const SECTIONS = \["画面", "音", "遊び"\]/.test(js)) F("設定の窓の節（画面・音・遊び）が無い");
  if (!/G\.theme|T\.set\(/.test(js)) F("設定の窓で明るさを選べない");
  if (!/\$ = \(id\) => document\.getElementById\(id\)/.test(read("ui/sound.js"))) F("音の行を設定の窓へ移すと、sound.js が行を見失う");
  // 狭い画面で「…」に畳む・はみ出さない
  if (!/@media \(max-width: 1360px\)/.test(css) || !/\.q7more\.open \{ display: flex; \}/.test(css)) F("幅が足りない画面で「…」に畳んでいない");
  if (!/#openCodex\.fresh::after/.test(css)) F("右上の図鑑に赤い「！」の位置が無い");
  if (!/body:not\(\.q7play\) \.top \.tools #openSheet/.test(css)) F("冒険の外でステータスのボタンが出る");
  // キーの近道は今まで通り
  if (!/KEYS = \{ z: "codex", m: "map" \}/.test(read("ui/zu11_quick.js"))) F("Z・M の近道が無くなった");
  if (!/"q"/.test(read("engine/q7_quests.js")) || !/k === "s" \? "save" : k === "l" \? "load"/.test(read("engine/q7_slots.js"))) F("Q・S・L の近道が無くなった");
  // 依頼のボタンは、帯の段が無ければ右上に入る
  if (!/\.top \.tools"\); if \(t\) t\.append\(qbtn\)/.test(read("ui/q7_quests.js"))) F("帯の段が無いと依頼のボタンがどこにも入らない");
};
