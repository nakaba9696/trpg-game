// V16：伏線の帳簿（docs/lore/threads.md）の形
// - 「## 表」の表は 5 列（糸・張った所・回収した所・状態・備考）で、状態は決まった言葉のどれか
// - 「張った所」「回収した所」に書いた参照（ファイル.js:id）は、そのファイルが src/ にあり、id がその中に出てくる
// - 「## 持ち主の決定が要るもの」の表は 3 列（糸・張った所・推し案）で、推し案が空でない。糸（か張った所の参照）は上の表の未回収の行にある
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = path.join(root, "docs", "lore", "threads.md");
const STATES = ["回収済み", "未回収", "取り下げてよい", "余白"];
const REF = /([a-z0-9_]+\.m?js):([A-Za-z0-9_][A-Za-z0-9_.:\-]*(?:\[\d+\])?)/g;

// 「## 見出し」から次の「## 」までの表の行（| で始まる行）を、見出し行と区切り行を除いて返す
function tableOf(md, heading) {
  const i = md.indexOf("\n## " + heading);
  if (i < 0) return null;
  const body = md.slice(i + 1).split("\n## ")[0].split("\n");
  const rows = body.filter((l) => /^\|/.test(l)).map((l) => l.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim()));
  return rows.filter((r) => !r.every((c) => /^:?-+:?$/.test(c))).slice(1);
}

const fileCache = new Map();
const readSrc = (f) => {
  if (fileCache.has(f)) return fileCache.get(f);
  let p = null;
  for (const d of ["data", "engine", "ui"]) { const q = path.join(root, "src", d, f); if (existsSync(q)) { p = q; break; } }
  const t = p ? readFileSync(p, "utf8") : null;
  fileCache.set(f, t);
  return t;
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// id がそのファイルに出てくるか：id: "x"・"x"（文字列）・x:（キー）・.x（プロパティ）。[n] と .ends.x のような続きは頭だけ見る
const idIn = (text, id) => {
  const head = id.split(/[.[]/)[0].split(":")[0];
  const e = esc(head);
  return new RegExp(`["'\`]${e}["'\`:]`).test(text) || new RegExp(`(^|[\\s{,(])${e}\\s*:`, "m").test(text) || new RegExp(`\\.${e}\\b`).test(text) || new RegExp(`\\b${e}\\s*=`).test(text);
};

// 読み込んだエンジンの表に出てくる名前（出来事の id・表のキー）。文字どおりに書かれていない id（組み立てた id）はこれで確かめる
function runtimeNames(G) {
  const names = new Set();
  const seen = new Set();
  const walk = (o, depth) => {
    if (!o || typeof o !== "object" || seen.has(o) || depth > 7) return;
    seen.add(o);
    if (typeof o.id === "string") names.add(o.id);
    if (Array.isArray(o)) { for (const v of o) walk(v, depth + 1); return; }
    for (const k of Object.keys(o)) { names.add(k); try { walk(o[k], depth + 1); } catch {} }
  };
  walk(G.data, 0);
  return names;
}

export default ({ fail, ok, loadEngine }) => {
  let n = 0;
  const known = runtimeNames(loadEngine());
  const F = (m) => { n++; fail("V16: " + m); };
  if (!existsSync(DOC)) return F("docs/lore/threads.md が無い");
  const md = readFileSync(DOC, "utf8");

  const main = tableOf(md, "表");
  if (!main || !main.length) return F("「## 表」の表が無い");
  const threads = new Map();
  const refState = new Map(); // 張った所の参照 -> 状態（決定の表の行を、糸の名でなく参照で照らすため）
  main.forEach((r, i) => {
    const at = `表の ${i + 1} 行目（${(r[0] || "").slice(0, 20)}）`;
    if (r.length !== 5) return F(`${at}: 列が ${r.length}（5 のはず）`);
    const [thread, planted, paid, state] = r;
    if (!thread) F(`${at}: 糸が空`);
    if (threads.has(thread)) F(`${at}: 糸「${thread}」が二度ある`);
    threads.set(thread, state);
    for (const [ref] of planted.matchAll(REF)) if (!refState.has(ref) || state.startsWith("未回収")) refState.set(ref, state);
    if (!STATES.some((s) => state.startsWith(s))) F(`${at}: 状態「${state}」が決まった言葉（${STATES.join("・")}）でない`);
    if (!planted) F(`${at}: 張った所が空`);
    for (const [cell, name] of [[planted, "張った所"], [paid, "回収した所"]]) {
      const refs = [...cell.matchAll(REF)];
      if (name === "張った所" && !refs.length) F(`${at}: 張った所に ファイル.js:id の参照が無い`);
      for (const [, f, id] of refs) {
        const t = readSrc(f);
        if (t === null) { F(`${at}: ${name} の ${f} が src/ に無い`); continue; }
        if (!idIn(t, id) && !known.has(id.split(/[.[]/)[0])) F(`${at}: ${name} の ${f} に ${id} が無い`);
      }
    }
  });

  const need = tableOf(md, "持ち主の決定が要るもの");
  if (!need) return F("「## 持ち主の決定が要るもの」の表が無い");
  need.forEach((r, i) => {
    const at = `決定の表の ${i + 1} 行目（${(r[0] || "").slice(0, 20)}）`;
    if (r.length !== 3) return F(`${at}: 列が ${r.length}（3 のはず）`);
    const [thread, planted, idea] = r;
    // 糸の名が上の表にあるか、張った所の参照のどれかが上の表の行にある（まとめた行は名が違ってよい）
    const refs = [...planted.matchAll(REF)].map((m) => m[0]);
    const st = threads.get(thread) ?? refs.map((r) => refState.get(r)).find(Boolean);
    if (!st) F(`${at}: 糸「${thread}」も張った所の参照も上の表に無い`);
    else if (!st.startsWith("未回収")) F(`${at}: 糸「${thread}」は上の表で「${st}」（未回収のはず）`);
    if (!idea || idea === "―") F(`${at}: 推し案が空`);
    for (const [, f, id] of planted.matchAll(REF)) { const t = readSrc(f); if (t === null) F(`${at}: ${f} が無い`); else if (!idIn(t, id) && !known.has(id.split(/[.[]/)[0])) F(`${at}: ${f} に ${id} が無い`); }
  });
  if (n === 0) ok(`V16：伏線の帳簿 ${main.length} 行（持ち主の決定が要るもの ${need.length}）。参照のファイルと id がそろっている`);
};
