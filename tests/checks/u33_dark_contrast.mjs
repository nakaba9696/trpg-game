// U33：暗い画面・明るい画面で、字の色と窓の地の色が食い違わない（DOM なし。CSS の文字列から確かめる）
// - 窓だけ羊皮紙の地（color-scheme: light の窓）が増えたら、字に使う色の組をその窓にも持たせる（zzzzzzzzz_u33_dark.css）
// - 字に使う色の組（--gold-t など）は、明るい・暗い・羊皮紙の窓のそれぞれの地に対して 4.5:1 以上
// - 金・銀・銅の色を字（color:）にそのまま使わない（暗い画面の淡い色が明るい窓に残る）。字には --gold-t・--silver-t・--bronze-t
// 実際に描いた画面での測り方は tools/audit_u33_contrast.mjs
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const uiDir = path.join(root, "src/ui");
const read = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const u33File = path.join(uiDir, "zzzzzzzzz_u33_dark.css");

// CSS を { セレクタ, 本体 } の並びにする（@media は中を展開する）
const rules = (css) => {
  const out = []; let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i); if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    if (head.startsWith("@media") || head.startsWith("@supports")) out.push(...rules(body));
    else if (!head.startsWith("@")) out.push({ sel: head.replace(/\s+/g, " "), body });
    i = j;
  }
  return out;
};
const decls = (body) => Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)].map((m) => [m[1], m[2].trim()]));

const hex = (h) => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map((c) => c + c).join(""); return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)); };
const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const isHex = (v) => /^#[0-9a-f]{3,6}$/i.test(v || "");

export default ({ fail, ok }) => {
  const files = readdirSync(uiDir).filter((f) => f.endsWith(".css")).map((f) => path.join(uiDir, f)).concat(path.join(root, "src/style.css"));
  const u33 = rules(read(u33File));
  const u33Sels = u33.map((r) => r.sel);

  // 1) 羊皮紙のまま残る窓（color-scheme: light の窓）には、字の色の組を持たせてある
  const storyScope = 'body[data-u14="story"] .tome, body.u21pc[data-u14="story"] #u21side';
  const lightWindows = [];
  for (const f of files) {
    if (f === u33File) continue;
    for (const r of rules(read(f))) if (/color-scheme:\s*light/.test(r.body) && r.sel !== ":root" && !/data-theme/.test(r.sel)) lightWindows.push(`${path.basename(f)}：${r.sel}`);
  }
  const hasStory = u33Sels.includes(storyScope) && u33.some((r) => r.sel === storyScope && /--gold-t:/.test(r.body));
  if (!hasStory) fail(`地が羊皮紙のままの窓（${storyScope}）に --gold-t などの字の色の組が無い`);
  for (const w of lightWindows) {
    const sel = w.split("：")[1];
    const covered = sel.split(",").every((s) => storyScope.includes(s.trim().replace(/^body(\.u21pc)?\[data-u14="story"\] /, "").trim()) || storyScope.includes(s.trim()));
    if (!covered) fail(`羊皮紙の地のままの窓が増えている：${w}（zzzzzzzzz_u33_dark.css に字の色の組を足す）`);
  }

  // 2) 字に使う色の組が、各画面の地に対して 4.5:1 以上
  const merge = (...ds) => Object.assign({}, ...ds);
  const collect = (sels) => merge(...u33.filter((r) => sels.includes(r.sel)).map((r) => decls(r.body)));
  const baseStyle = merge(...rules(read(path.join(root, "src/style.css"))).filter((r) => r.sel === ":root").map((r) => decls(r.body)));
  const light = merge(baseStyle, collect([":root"]));
  const dark = merge(light, ...rules(read(path.join(root, "src/style.css"))).filter((r) => r.sel === ':root[data-theme="dark"]').map((r) => decls(r.body)), collect([':root[data-theme="dark"]']));
  const story = merge(light, collect([storyScope]));
  const TEXT = ["--gold-t", "--silver-t", "--bronze-t", "--platinum-t", "--plus-t", "--accent", "--muted", "--head", "--ok", "--ng", "--crit", "--u27-good", "--u27-bad", "--q7-heal", "--u14-combat-t", "--ink"];
  const scopes = [["明るい画面", light, ["#efe4c8", "#d9ccae"]], ["暗い画面", dark, ["#0d1717", "#0a0d0d"]], ["羊皮紙の窓", story, ["#ece0c2", "#e6d5b0", "#f5ecd6"]]];
  let checked = 0;
  for (const [name, d, grounds] of scopes) for (const t of TEXT) {
    const v = d[t]; if (!isHex(v)) continue;
    for (const g of grounds) { checked++; const r = ratio(hex(v), hex(g)); if (r < 4.5) fail(`${name}：${t} ${v} が地 ${g} に対して ${r.toFixed(2)}:1（4.5 未満）`); }
  }
  if (checked < 40) fail(`字の色の組を読み取れていない（${checked} 組しか測れなかった）`);

  // 3) 金・銀・銅の色を字にそのまま使わない（--gold-t・--silver-t・--bronze-t を使う）
  for (const f of files) {
    if (f === u33File) continue;
    for (const r of rules(read(f))) {
      if (/(^|[;\s])color:\s*var\(--(gold|silver|bronze)\)/.test(r.body)) {
        // 上書きしてあれば（zzzzzzzzz_u33_dark.css に同じセレクタがある）よい
        if (!u33Sels.some((s) => s.split(",").some((x) => r.sel.split(",").some((y) => x.trim() === y.trim())))) fail(`字に --gold/--silver/--bronze をそのまま使っている：${path.basename(f)}「${r.sel}」（--gold-t などを使う）`);
      }
    }
  }
  ok(`字の色と地の色：羊皮紙の窓 ${lightWindows.length} 種に字の色の組あり・${checked} 組が 4.5:1 以上`);
};
