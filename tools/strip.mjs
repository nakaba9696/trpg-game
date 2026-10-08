// ビルドで、行まるごとのコメント（空白のあと // で始まる行）を落とす（game.js が Artifact の 1 ファイルの上限 15MB に届いたため。T3）。
// - 文字列・テンプレート文字列・正規表現・ブロックコメントの中の行は落とさない（小さな字句解析で、行の頭がコードの中かを見る）
// - 解析が最後にコードの状態へ戻らないファイルは、そのまま返す（読み違えたかもしれないので触らない）
// - 「// ==== ファイル名」の区切りは残す（build.mjs が付ける）
// tests/checks/t3_strip.mjs が、落とす前と後でゲームのデータ（G.data）が同じになることを確かめる
const KW = new Set(["return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "instanceof", "yield", "await"]);

// 各行の頭がコードの中なら true の配列と、最後にコードの状態へ戻ったか
export function lineStates(src) {
  const atCode = [true];
  let i = 0, mode = "code", prev = "";   // prev：直前の意味のある字（正規表現か割り算かを見分ける）
  const tpl = [];                         // テンプレートの ${ の深さ
  let word = "";
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "\n") { atCode.push(mode === "code"); if (mode === "line") mode = "code"; i++; continue; }
    if (mode === "line") { i++; continue; }
    if (mode === "block") { if (c === "*" && d === "/") { mode = "code"; i += 2; } else i++; continue; }
    if (mode === "sq" || mode === "dq") {
      if (c === "\\") { i += 2; continue; }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) { mode = "code"; prev = "x"; }
      i++; continue;
    }
    if (mode === "tpl") {
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { mode = "code"; prev = "x"; i++; continue; }
      if (c === "$" && d === "{") { tpl.push(0); mode = "code"; prev = "{"; i += 2; continue; }
      i++; continue;
    }
    if (mode === "re") {
      if (c === "\\") { i += 2; continue; }
      if (c === "[") { mode = "recls"; i++; continue; }
      if (c === "/") { mode = "code"; prev = "x"; i++; while (/[a-z]/i.test(src[i] || "")) i++; continue; }
      i++; continue;
    }
    if (mode === "recls") { if (c === "\\") { i += 2; continue; } if (c === "]") mode = "re"; i++; continue; }
    // コードの中
    if (/[A-Za-z0-9_$]/.test(c)) { word += c; i++; continue; }
    if (word) { prev = KW.has(word) ? "(" : "x"; word = ""; }
    if (c === " " || c === "\t" || c === "\r") { i++; continue; }
    if (c === "/" && d === "/") { mode = "line"; i += 2; continue; }
    if (c === "/" && d === "*") { mode = "block"; i += 2; continue; }
    if (c === "'") { mode = "sq"; i++; continue; }
    if (c === '"') { mode = "dq"; i++; continue; }
    if (c === "`") { mode = "tpl"; i++; continue; }
    if (c === "/") {
      if (prev === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev)) { mode = "re"; i++; continue; }
      prev = "/"; i++; continue;
    }
    if (c === "{" && tpl.length) { tpl[tpl.length - 1]++; }
    if (c === "}" && tpl.length) { if (tpl[tpl.length - 1] === 0) { tpl.pop(); mode = "tpl"; i++; continue; } tpl[tpl.length - 1]--; }
    prev = c === ")" || c === "]" ? "x" : c;
    i++;
  }
  return { atCode, ok: mode === "code" || mode === "line" ? tpl.length === 0 : false };
}

// 行まるごとのコメントを落とした文字列（読み違えたら元のまま）
export function stripLineComments(src) {
  const { atCode, ok } = lineStates(src);
  if (!ok) return src;
  const lines = src.split("\n");
  if (lines.length !== atCode.length) return src;
  return lines.filter((l, k) => !(atCode[k] && /^\s*\/\//.test(l) && !/^\/\/ ==== /.test(l))).join("\n");
}
