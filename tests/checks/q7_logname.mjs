// Q7：行動の流れを出す欄の名前は「ログ」（「記録」だとセーブと勘違いされる。持ち主の声）
// - 冒険の画面の見出し（index.html の .logbar）、PC のログの窓の見出しと上のボタン（ui/v9_pc.js）が「ログ」
// - 画面の文字として「記録」だけのボタン・見出しが残っていない（物語の文や、トロフィー・図鑑の説明の「記録」はそのまま）
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export default ({ fail }) => {
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
  const read = (f) => readFileSync(path.join(src, f), "utf8");
  const html = read("index.html");
  const bar = /<div class="logbar"><span>([^<]*)<\/span>/.exec(html);
  if (!bar || bar[1] !== "ログ") fail(`冒険の画面のログの欄の見出しが「ログ」でない：${bar && bar[1]}`);
  const v9 = read("ui/v9_pc.js");
  if (!/h\("h2", "", "ログ"\)/.test(v9)) fail("PC のログの窓の見出しが「ログ」でない");
  if (!/const openLog = h\("button", "btn", "ログ"\)/.test(v9)) fail("PC の上のログのボタンが「ログ」でない");
  // 「記録」だけの見出し・ボタン・欄の名前が画面に残っていない
  const files = ["index.html", ...readdirSync(path.join(src, "ui")).filter((f) => f.endsWith(".js")).map((f) => "ui/" + f)];
  files.forEach((f) => {
    const t = read(f);
    if (/>記録</.test(t) || /h\("(?:h[1-6]|button|span|summary)"[^)]*"記録"\)/.test(t) || /textContent = "記録"/.test(t)) fail(`${f} に「記録」だけの見出しかボタンが残っている`);
  });
};
