// 外のファイルの形（dist/site/）を claude.ai の Artifact に載せるときの大きさの決まりと、何回に分けて載せるかの案（tools/build.mjs と tests/checks/a6_site.mjs が使う）。
// Artifact の決まり：1 ページ 16MB まで、別ファイルは 1 つ 15MB まで、1 つの版で 511 ファイル・256MB まで、1 回の公開で 255 ファイル・64MB まで。
// 余裕を見て MB は 1000×1000 バイトで数え、1 回の公開は 250 ファイル・60MB までで分ける。載せ方は docs/publish.md
export const MB = 1000 * 1000;
export const SITE_LIMITS = {
  page: 16 * MB, // index.html
  file: 15 * MB, // 画像 1 枚
  total: 256 * MB, // ページと画像の合計
  versionFiles: 511, // ページを含めたファイルの数
  batchBytes: 60 * MB, // 1 回の公開（本当は 64MB）
  batchFiles: 250, // 1 回の公開（本当は 255。ページも 1 つと数える）
};

// files：[{ pub（公開パス）, local（ローカルパス）, bytes }]。pageBytes：index.html のバイト数
// → { errors: [止める理由], batches: [{ files: { 公開パス: ローカルパス }, bytes, count }], total, count }
// 最初の回はページ（index.html）も一緒に載せるので、その分を数に入れる
export function planSite({ pageBytes, files }, L = SITE_LIMITS) {
  const errors = [];
  if (pageBytes >= L.page) errors.push(`index.html が ${(pageBytes / MB).toFixed(1)}MB で、1 ページの上限 ${L.page / MB}MB を超える`);
  for (const f of files) if (f.bytes >= L.file) errors.push(`${f.pub} が ${(f.bytes / MB).toFixed(1)}MB で、1 ファイルの上限 ${L.file / MB}MB を超える`);
  const total = pageBytes + files.reduce((n, f) => n + f.bytes, 0);
  if (total >= L.total) errors.push(`ページと画像の合計が ${(total / MB).toFixed(1)}MB で、上限 ${L.total / MB}MB を超える`);
  if (files.length + 1 > L.versionFiles) errors.push(`ページと画像で ${files.length + 1} ファイルあり、1 つの版の上限 ${L.versionFiles} を超える`);
  const batches = [];
  let cur = { files: {}, bytes: pageBytes, count: 1 };
  for (const f of files) {
    if (cur.count > (batches.length ? 0 : 1) && (cur.count + 1 > L.batchFiles || cur.bytes + f.bytes > L.batchBytes)) {
      batches.push(cur);
      cur = { files: {}, bytes: 0, count: 0 };
    }
    cur.files[f.pub] = f.local;
    cur.bytes += f.bytes;
    cur.count++;
  }
  batches.push(cur);
  return { errors, batches, total, count: files.length + 1 };
}
