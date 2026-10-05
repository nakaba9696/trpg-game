// U18：版の番号と更新履歴
// - 版の番号は一か所（G.data.VERSION）。公開した版のいちばん上と同じ
// - 更新履歴は新しい順で、版の番号がそろい、文に開発の言葉（PR 番号・レーン名・ファイル名）が無い
// - いちばん上に「次の版」（next: true）の欄がある（PR はここに一行足す）
// - 見た版はプロフィールに覚え、古いプロフィール（項目なし）では「！」が付く
// - CHANGELOG.md が changelog.js から作ったものと同じ（node tools/changelog.mjs）
// - タイトル画面の隅と右上の「システム」・設定の窓から開ける
import { readFileSync } from "node:fs";
import { renderChangelog, changelogPath } from "../../tools/changelog.mjs";

export default ({ G, fail }) => {
  const D = G.data, CL = G.changelog;
  if (!/^\d+\.\d+\.\d+$/.test(D.VERSION || "")) fail(`版の番号の形が違う：${D.VERSION}`);
  if (!CL) return fail("G.changelog が無い");
  const all = D.CHANGELOG || [];
  if (!all.length || !all[0].next || !Array.isArray(all[0].items)) fail("更新履歴のいちばん上に「次の版」（next: true, items: []）の欄が無い");
  if (all.filter((e) => e.next).length !== 1) fail("「次の版」の欄は一つだけ");
  const pub = CL.published();
  if (!pub.length) return fail("公開した版が無い");
  if (pub[0].ver !== D.VERSION) fail(`VERSION（${D.VERSION}）と更新履歴の最新（${pub[0].ver}）がずれている`);
  const num = (v) => v.split(".").map(Number);
  const cmp = (a, b) => { const x = num(a), y = num(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
  pub.forEach((e, i) => {
    if (!/^\d+\.\d+\.\d+$/.test(e.ver)) fail(`版の番号の形が違う：${e.ver}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) fail(`v${e.ver} の日付が無い・形が違う`);
    if (!(e.items || []).length) fail(`v${e.ver} に項目が無い`);
    if (i && cmp(pub[i - 1].ver, e.ver) <= 0) fail(`更新履歴が新しい順になっていない：${pub[i - 1].ver} → ${e.ver}`);
  });
  if (new Set(pub.map((e) => e.ver)).size !== pub.length) fail("同じ版が二度ある");
  const DEV = [/#\d+/, /\.(js|mjs|css|md|json)\b/, /\b[A-Z]\d{1,2}[a-z]?\b/, /レーン|PR|プルリク|manifest|G\.[A-Za-z]/];
  for (const e of all) for (const t of e.items || []) {
    if (typeof t !== "string" || !t.trim()) { fail(`v${e.ver} に空の項目`); continue; }
    const bad = DEV.find((re) => re.test(t));
    if (bad) fail(`更新履歴に開発の言葉：${t.slice(0, 40)}…（${bad.source}）`);
  }

  // 見た版
  if (!CL.unseen({ trophies: {}, graves: [] })) fail("古いプロフィール（changelogSeen なし）で新しい版の「！」が付かない");
  if (!CL.unseen(null)) fail("プロフィールが無いときに落ちる・「！」が付かない");
  const P = { trophies: {}, graves: [] };
  if (!CL.markSeen(P) || P.changelogSeen !== D.VERSION || CL.unseen(P)) fail("見たあとも「！」が残る");
  if (CL.markSeen(P)) fail("二度目の markSeen が変わったことにしている");
  if (!CL.unseen({ changelogSeen: "0.0.1" })) fail("前の版を見ただけで新しい版の「！」が付かない");

  // CHANGELOG.md
  let md = "";
  try { md = readFileSync(changelogPath, "utf8"); } catch { return fail("CHANGELOG.md が無い"); }
  if (md !== renderChangelog()) fail("CHANGELOG.md が changelog.js とずれている（node tools/changelog.mjs で作り直す）");

  // 画面の入口（DOM なしのテストなので、作りを読む）
  const ui = readFileSync(new URL("../../src/ui/zzz_u18_changelog.js", import.meta.url), "utf8");
  for (const [re, what] of [[/u18TitleVer/, "タイトル画面の隅"], [/q7SystemBox/, "右上のシステム"], [/addSetting/, "設定の窓"], [/changelogSeen|markSeen/, "見た版を覚える"], [/saveProfile/, "プロフィールに保存"]])
    if (!re.test(ui)) fail(`更新履歴の入口が無い：${what}`);
};
