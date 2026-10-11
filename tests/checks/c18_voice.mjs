// C18：仲間の深い話（C15）を、会話（talk_<id>.js）・頼みごと（C9）・人物の表の声と事実に揃えた（人物レビュー docs/review/characters_2026-10-09.md）
// - 食い違い・口調・二重の再発を止める：tests/c18_c15_ban.json の、その人の段の文（題・本文・返しの題と文）に出てはいけない言い回し
// - 書き手の癖：台詞の頭の「……」は、その人の深い話の台詞の三割まで（ルイは除く）。締めの余韻（〜気がした）は深い話に書かない
import { readFileSync } from "node:fs";

const BAN = JSON.parse(readFileSync(new URL("../c18_c15_ban.json", import.meta.url), "utf8"));

export default ({ G, fail }) => {
  const D = G.data;
  const T = D.C15_TALK || {};
  const P = D.C2_PEOPLE || {};
  const comps = Object.keys(P).filter((id) => P[id].join);
  for (const id of comps) if (!BAN[id] || !BAN[id].length) fail(`C18: ${id} の禁止の言い回しが無い（一人に一つ以上）`);
  const stageText = (t) => [t.title, ...(t.text || []), ...(t.replies || []).flatMap((r) => [r.label, r.text])].join("\n");
  for (const [id, rules] of Object.entries(BAN)) {
    if (!T[id]) { fail(`C18: ${id} の深い話が無い`); continue; }
    for (let k = 0; k <= 4; k++) {
      const s = stageText(T[id][k] || {});
      for (const r of rules) if (new RegExp(r.re).test(s)) fail(`C18: ${id} 段 ${k} に「${r.re}」（${r.why}）`);
    }
  }
  // ルイは言葉を探して話す子（眠る前を覚えていない）。「……」がその子の声なので除く
  for (const id of Object.keys(T)) {
    const all = [0, 1, 2, 3, 4].map((k) => stageText(T[id][k] || {})).join("\n");
    const quotes = all.match(/「[^」]*」/g) || [];
    const dots = quotes.filter((q) => q.startsWith("「……")).length;
    if (id !== "rui" && quotes.length && dots / quotes.length > 0.3) fail(`C18: ${id} の深い話の台詞の頭の「……」が ${dots}/${quotes.length}（三割まで）`);
    if (/気がした/.test(all)) fail(`C18: ${id} の深い話に締めの「〜気がした」`);
  }
};
