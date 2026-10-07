// S6：BGM を一覧で聴き比べるページを作る（持ち主が確かめる用。ゲームには入らない）。
// node tools/bgm_page.mjs [出力先]   … 既定は dist/bgm_preview.html（一枚の HTML。外から何も読み込まない）
// 曲の表（src/data/s4_tracks.js・s6_tracks*.js）・つり合いの表（s4_mix.js）・鳴らす係（src/ui/sound_bgm.js）をそのまま埋め込み、
// ゲームと同じ合成・同じ大きさで鳴らす。どの場面で鳴るか（町の夕方・北の旅・使徒ごと など）も添える。
// 音はページの中の Web Audio だけ（パソコンの音量・ほかのアプリには触れない）。
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadEngine } from "../tests/lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const src = (f) => readFileSync(path.join(root, "src", f), "utf8");
const out = process.argv[2] || path.join(root, "dist", "bgm_preview.html");
const trackFiles = ["data/s4_tracks.js", ...readdirSync(path.join(root, "src", "data")).filter((f) => /^s6_tracks.*\.js$/.test(f)).sort().map((f) => "data/" + f)];

const G = loadEngine();
const D = G.data;
const B = D.BGM;
const SCENE = { title: "タイトル", depart: "旅立ち", town: "町", town_night: "町の夜・裏路地", tavern: "酒場", inn: "宿", road: "街道・野", dungeon: "迷宮", abyss: "使徒領・深淵", battle: "戦闘", boss: "強敵", apostle: "使徒", death: "死", epilogue: "その後" };
const VAR = { dusk: "夕方", morning: "朝", harbor: "港・島の町（昼）", village: "村・小さな町（昼）", holy: "聖地の町（昼）", north: "北の町（昼）", quiet: "村・聖地・島（夜）", east: "共和国", isles: "島々", border: "人と魔の境", cool: "かっこいい", eerie: "不気味", beast: "獣" };
const foeName = (id) => { const a = (D.E3 && D.E3.LIST && D.E3.LIST[id]) || null; const f = a && ((D.E3.FOES || {})[a.foe] || D.ENEMIES[a.foe]); return f ? f.name : null; };
const sagaName = (id) => { const s = D.E7 && D.E7.SAGAS && D.E7.SAGAS[id]; return s ? `長編「${s.title}」の決戦` : null; };
const label = (key) => {
  const [base, v] = key.split("@");
  if (!v) return SCENE[base] || base;
  if (base === "apostle") return v.startsWith("saga_") ? sagaName(v.slice(5)) || v : foeName(v) || v;
  if (base === "boss" && !VAR[v]) return `強敵：${D.ENEMIES[v] ? D.ENEMIES[v].name : v}`;
  return `${SCENE[base] || base}：${VAR[v] || v}`;
};
const GROUPS = [["町・宿・酒場", ["town", "town_night", "tavern", "inn"]], ["旅", ["road", "depart"]], ["迷宮・深淵", ["dungeon", "abyss"]], ["戦い", ["battle", "boss"]], ["使徒", ["apostle"]], ["そのほか", ["title", "death", "epilogue"]]];
const where = {};
for (const [s, list] of Object.entries(B.SCENES)) for (const id of list) (where[id] = where[id] || []).push(s);
for (const [k, list] of Object.entries(B.ROUTES || {})) for (const id of list) (where[id] = where[id] || []).push(k);
const SC = { major: "長調", minor: "短調", harm: "和声的短音階", dorian: "ドリア", phryg: "フリギア", mixo: "ミクソリディア", gypsy: "ジプシー音階", locrian: "ロクリア" };
const NOTE = ["ハ", "嬰ハ", "ニ", "変ホ", "ホ", "ヘ", "嬰ヘ", "ト", "変イ", "イ", "変ロ", "ロ"];
const METER = { 12: "三拍子・六拍子", 14: "八分の七", 16: "四拍子", 20: "四分の五" };
const rows = Object.entries(B.TRACKS).map(([id, t]) => {
  const ks = where[id] || [];
  const base = (ks[0] || "").split("@")[0];
  const group = (GROUPS.find(([, l]) => l.includes(base)) || GROUPS[GROUPS.length - 1])[0];
  const len = (t.meter * t.bars * 60) / t.bpm / 4;
  return { id, name: t.name, mood: t.mood, where: ks.map(label), group, isNew: id.startsWith("s6_"), info: `${NOTE[t.key % 12]}・${SC[t.scale] || t.scale}・${METER[t.meter] || t.meter + "刻み"}・${t.bpm}・一巡り ${Math.round(len)} 秒` };
});
const order = GROUPS.map(([g]) => g);
rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));

const css = `
:root{--bg:#f6f2ea;--fg:#2a241c;--sub:#6b6052;--line:#ddd2c0;--card:#fffdf8;--acc:#9a4a1e;--new:#2f6b4a}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#17140f;--fg:#ece4d6;--sub:#a99c88;--line:#3a3328;--card:#201c16;--acc:#e09a5e;--new:#7cc39a}}
:root[data-theme="dark"]{--bg:#17140f;--fg:#ece4d6;--sub:#a99c88;--line:#3a3328;--card:#201c16;--acc:#e09a5e;--new:#7cc39a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 "BIZ UDPGothic",system-ui,sans-serif}
header{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
h1{font-size:18px;margin:0;font-family:"Zen Old Mincho",serif}#now{flex:1 1 220px;color:var(--sub);font-size:13px;min-width:0}
main{max-width:860px;margin:0 auto;padding:8px 16px 48px}h2{font-size:15px;margin:22px 0 8px;color:var(--sub);font-weight:700}
.t{display:grid;grid-template-columns:44px 1fr;gap:4px 12px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:8px 0}
.t.on{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc)}
.t button{grid-row:span 3;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--bg);color:var(--fg);font-size:16px;cursor:pointer}
.t.on button{background:var(--acc);color:var(--card);border-color:var(--acc)}
.n{font-weight:700}.n small{font-weight:400;color:var(--new);margin-left:6px}.w{font-size:13px;color:var(--acc)}.m{font-size:13px;color:var(--sub)}.i{font-size:12px;color:var(--sub)}
label{font-size:13px;color:var(--sub);display:flex;gap:6px;align-items:center}input[type=range]{width:120px}
#stop{border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:8px;padding:6px 12px;cursor:pointer}
.f{display:flex;gap:6px;flex-wrap:wrap}.f button{border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:999px;padding:3px 10px;font-size:13px;cursor:pointer}.f button.sel{background:var(--fg);color:var(--bg)}
`;
const js = `
const snd = G.sound;
snd.bgmUpdate = () => {};
snd.mixGain = (kind, name) => { const t = (G.data.MIX || {})[kind.toUpperCase()] || {}; const v = Number(t[name]); return Number.isFinite(v) && v > 0 ? v : 1; };
snd.settings = { bgm: 0.35, bgmOn: true, mute: false };
const ROWS = ${JSON.stringify(rows)};
let playing = null, n = 0, only = "all";
const list = document.getElementById("list"), now = document.getElementById("now");
function draw() {
  list.textContent = "";
  let g = null;
  for (const r of ROWS) {
    if (only === "new" && !r.isNew) continue;
    if (r.group !== g) { g = r.group; const h = document.createElement("h2"); h.textContent = g; list.append(h); }
    const d = document.createElement("div"); d.className = "t" + (playing === r.id ? " on" : "");
    const b = document.createElement("button"); b.textContent = playing === r.id ? "■" : "▶"; b.setAttribute("aria-label", (playing === r.id ? "止める：" : "鳴らす：") + r.name);
    b.onclick = () => play(playing === r.id ? null : r.id);
    const nm = document.createElement("div"); nm.className = "n"; nm.textContent = r.name; if (r.isNew) { const s = document.createElement("small"); s.textContent = "新しい曲"; nm.append(s); }
    const w = document.createElement("div"); w.className = "w"; w.textContent = r.where.join("・") || "（どこでも鳴らない）";
    const m = document.createElement("div"); m.className = "m"; m.textContent = r.mood + "（" + r.info + "）";
    d.append(b, nm, w, m); list.append(d);
  }
}
function play(id) {
  playing = id;
  if (id) { const k = "__preview" + (++n); G.data.BGM.SCENES[k] = [id]; snd.bgm(k); const r = ROWS.find((x) => x.id === id); now.textContent = "鳴っている曲：" + r.name + "（" + r.where.join("・") + "）"; }
  else { const k = "__stop" + (++n); G.data.BGM.SCENES[k] = []; snd.bgm(k); now.textContent = "止まっています"; }
  draw();
}
document.getElementById("stop").onclick = () => play(null);
const vol = document.getElementById("vol");
vol.oninput = () => { snd.settings = { ...snd.settings, bgm: vol.value / 100 }; snd.bgmVol(); };
document.querySelectorAll(".f button").forEach((b) => b.onclick = () => { only = b.dataset.f; document.querySelectorAll(".f button").forEach((x) => x.classList.toggle("sel", x === b)); draw(); });
draw();
`;
const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BGM の聴き比べ</title>
<style>${css}</style></head>
<body>
<header><h1>BGM の聴き比べ</h1><div id="now">▶ を押すと鳴ります（ゲームと同じ合成・同じ大きさ）</div>
<div class="f"><button data-f="all" class="sel">すべて</button><button data-f="new">新しい曲だけ</button></div>
<label>音量 <input id="vol" type="range" min="0" max="100" step="5" value="35"></label><button id="stop">止める</button></header>
<main id="list"></main>
<script>globalThis.G = { data: { LOCS: {}, ENEMIES: {} } };
${trackFiles.map(src).join("\n")}
${src("data/s4_mix.js")}
</script>
<script>${src("ui/sound_bgm.js")}</script>
<script>${js}</script>
</body></html>
`;
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${path.relative(root, out)}：${rows.length} 曲（新しい曲 ${rows.filter((r) => r.isNew).length}）・${Math.round(html.length / 1024)} KB`);
