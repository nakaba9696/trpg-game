// game.js を小さくする：行まるごとの「//」の注だけを落とす（tools/build.mjs が使う）。
// game.js が Artifact の 1 ファイルの上限（15MB。tools/site.mjs）に届いたため（I5 #395 の CI で、main だけで残り 2.6KB）。
// 行の途中の注・/* */・文字列の中身には触らない。複数行のテンプレート文字列の中の「//」で始まる行は落とすと中身が変わるので、
// unsafeLines が見つけて tests/checks/q_strip.mjs が落とす（その行より前の ` の数が奇数なら、文字列の中にいる）。
export const isCommentLine = (l) => /^\s*\/\/.*$/.test(l);
export const stripLineComments = (s) => s.split("\n").filter((l) => !isCommentLine(l)).join("\n");
// 落とすと文字列の中身が変わるかもしれない行（[行番号, 行]）
export function unsafeLines(s) {
  const out = [];
  let ticks = 0;
  s.split("\n").forEach((l, i) => {
    if (isCommentLine(l)) { if (ticks % 2) out.push([i + 1, l]); return; }
    ticks += (l.match(/`/g) || []).length;
  });
  return out;
}
