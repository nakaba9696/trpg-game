// V6：持ち主が作った魔物の絵（docs/art/monsters.json・style_monsters.json・tools/gen_portraits.mjs --monsters・src/ui/v6_monsters.js）
// - 一覧の id がすべて敵に当たり、敵はすべて一覧か「人物の側」に載っている。md が json と合っている。タグに画風・性的な言葉が無い
// - 画像が無くても今の canvas の絵で描ける。画像があれば（読み込んだら）画像を描く。出来事の胸から上の絵は今の絵のまま
// - 埋め込みの上限（12MB）は人物と魔物を合わせて数える
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import vm from "node:vm";
import path from "node:path";
import { collectAssets } from "../../tools/assets.mjs";
import { JSON_PATH, MD_PATH, renderMonstersMd } from "../../tools/monsters.mjs";

export default ({ G, fail, ok }) => {
  const E = G.data.ENEMIES;
  // ---------------------------------------------------------------- 一覧
  const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const list = data.monsters || [];
  const people = data.people || {};
  const portraits = new Set(JSON.parse(readFileSync(new URL("../../docs/art/portraits.json", import.meta.url), "utf8")).portraits.map((p) => p.id));
  const seen = new Set();
  const BAD = /masterpiece|best quality|high quality|anime|illustration|realistic|white background|simple background|nsfw|nude|naked|breast|cleavage|navel|thigh|sexy|lingerie|underwear|panties|loli/i;
  if (!data.size || data.size.width !== data.size.height) fail("魔物の一覧の大きさが正方形でない");
  for (const m of list) {
    if (seen.has(m.id)) fail(`魔物の一覧に同じ id が二つ：${m.id}`);
    seen.add(m.id);
    if (!E[m.id]) fail(`魔物の一覧の ${m.id} が敵にいない`);
    if (people[m.id]) fail(`${m.id} が魔物の一覧と人物の側の両方にある`);
    if (m.file !== `assets/monsters/${m.id}.webp`) fail(`魔物の一覧の ${m.id} のファイル名が違う：${m.file}`);
    if (!m.name || !m.memo || (!m.tags && !m.same_as)) fail(`魔物の一覧の ${m.id} に名前・タグ・メモのどれかが無い`);
    if (m.seed !== undefined && !(Number.isInteger(m.seed) && m.seed >= 0)) fail(`魔物の一覧の ${m.id} の seed が 0 以上の整数でない：${m.seed}`);
    if (m.tags && BAD.test(m.tags)) fail(`魔物の一覧の ${m.id} のタグに、画風・背景・性的な言葉がある：${m.tags.match(BAD)[0]}`);
    if (m.same_as && !list.some((x) => x.id === m.same_as && !x.same_as)) fail(`魔物の一覧の ${m.id} の same_as（${m.same_as}）が一覧の絵に当たらない`);
  }
  for (const [e, p] of Object.entries(people)) {
    if (!E[e]) fail(`人物の側の ${e} が敵にいない`);
    if (!portraits.has(p)) fail(`人物の側の ${e} → ${p} が人物の一覧（portraits.json）にいない`);
  }
  const miss = Object.keys(E).filter((id) => !seen.has(id) && !people[id]);
  if (miss.length) fail(`魔物の一覧に無い敵：${miss.join("、")}（docs/art/monsters.json に足して node tools/monsters.mjs）`);
  if (readFileSync(MD_PATH, "utf8") !== renderMonstersMd(data)) fail("docs/art/monsters.md が json と合っていない（node tools/monsters.mjs で作り直す）");
  // 魔物の設定（人物の style.json と別）：読めて、正方形、魔物向けの後置きとネガティブ
  let style = null;
  try { style = JSON.parse(readFileSync(new URL("../../docs/art/style_monsters.json", import.meta.url), "utf8")); } catch (e) { fail("docs/art/style_monsters.json が読めない：" + e.message); }
  if (style) {
    if (!style.url || typeof style.prefix !== "string" || typeof style.negative !== "string") fail("style_monsters.json に url・prefix・negative が無い");
    if (style.width !== style.height) fail(`style_monsters.json の大きさ ${style.width}×${style.height} が正方形でない`);
    if (!/no humans/.test(style.suffix || "") || !/white background/.test(style.suffix || "")) fail("style_monsters.json の suffix に no humans・white background が無い");
    if (!/multiple monsters/.test(style.negative)) fail("style_monsters.json の negative に multiple monsters が無い");
    if (list.some((m) => m.human) && !(style.human && style.human.suffix && !/no humans/.test(style.human.suffix))) fail("人の姿の敵があるのに style_monsters.json の human.suffix が無い（か no humans が入っている）");
  }

  // ---------------------------------------------------------------- 画面の部品を DOM なしで読む
  const loaded = [];
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.ls = {}; loaded.push(this); }
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    set src(v) { this._src = v; }
    get src() { return this._src; }
    fire() { this.complete = true; this.naturalWidth = 512; this.naturalHeight = 512; (this.ls.load || []).forEach((f) => f()); }
  }
  const calls = [];
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? () => grad : (...a) => calls.push([k, a])), set: (t, k, v) => ((t[k] = v), true) });
  const load = (assets) => {
    const g = { data: G.data, ASSETS: assets };
    const c = vm.createContext({ console, G: g, Image: FakeImage });
    for (const f of ["art_monsters.js", "v6_monsters.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), c, { filename: "ui/" + f });
    return g;
  };
  const drew = () => calls.filter(([k]) => k === "drawImage");

  // 画像が無いとき：今の絵
  let g = load(undefined);
  for (const m of list) if ((g.V6_SAME[m.id] || undefined) !== m.same_as) fail(`v6_monsters.js の SAME の ${m.id} が一覧の same_as と違う`);
  for (const id of Object.keys(g.V6_SAME)) if (!list.some((m) => m.id === id && m.same_as)) fail(`v6_monsters.js の SAME の ${id} が一覧に無い`);
  calls.length = 0;
  try { for (const id of Object.keys(E)) g.paintMonster(ctx, 200, 300, 160, { id, shape: E[id].shape, eye: E[id].eye, boss: !!E[id].boss }); } catch (e) { fail("画像が無いとき敵を描けない：" + e.message); }
  if (!calls.length || drew().length) fail("画像が無いとき、今の canvas の絵で描いていない");
  if (g.v6MonsterKey({ id: "goblin" }) !== null) fail("画像が無いのに画像の鍵を返す");

  // 画像があるとき：先に読み始め、読み込むまでは今の絵、読み込んだら画像
  loaded.length = 0;
  g = load({ "monsters/goblin": "data:image/webp;base64,AAAA", "portraits/dil": "data:image/webp;base64,BBBB" });
  if (loaded.length !== 1 || loaded[0].src !== "data:image/webp;base64,AAAA") fail("埋め込まれた魔物の絵を先に読み始めていない");
  if (g.v6MonsterKey({ id: "goblin" }) !== "goblin" || g.v6MonsterKey({ id: "slime" }) !== null) fail("魔物の絵の鍵の選び方が違う");
  calls.length = 0;
  g.paintMonster(ctx, 200, 300, 160, { id: "goblin", shape: "small" });
  if (drew().length) fail("読み込みの前に画像を描いた");
  loaded[0].fire();
  calls.length = 0;
  g.paintMonster(ctx, 200, 300, 160, { id: "goblin", shape: "small" });
  const di = drew();
  if (di.length !== 1 || di[0][1][0] !== loaded[0]) fail("読み込んだあと画像を描いていない");
  else {
    const [, dx, dy, dw, dh] = di[0][1];
    if (dw !== dh || Math.abs(dx + dw / 2 - 200) > 0.01 || dy + dh < 300 || dy + dh > 300 + dh * 0.05) fail(`画像の置き方が違う（真ん中・下の余白の分だけ足元より少し下まで）：${[dx, dy, dw, dh].join(",")}`);
  }
  // 大きなボスでも上にはみ出さない
  calls.length = 0;
  g.paintMonster(ctx, 200, 300, 400, { id: "goblin", boss: true });
  const big = drew()[0];
  if (!big || big[1][2] < -0.1 * big[1][4]) fail("大きな敵の画像が上にはみ出す");
  // 出来事・仲間の胸から上の絵（look を付けて呼ぶ）は今の絵
  calls.length = 0;
  g.paintMonster(ctx, 200, 300, 160, { id: "goblin", look: undefined });
  if (drew().length) fail("出来事の胸から上の絵に、魔物の画像を使った");
  // 読めない画像は今の絵
  g = load({ "monsters/slime": "data:image/webp;base64,CCCC" });
  const bad = loaded[loaded.length - 1];
  (bad.ls.error || []).forEach((f) => f());
  calls.length = 0;
  g.paintMonster(ctx, 200, 300, 160, { id: "slime", shape: "blob" });
  if (drew().length || !calls.length) fail("読めない画像のとき、今の絵に戻していない");

  // ---------------------------------------------------------------- 埋め込み：人物と魔物を合わせて数える
  const dir = mkdtempSync(path.join(tmpdir(), "v6-"));
  try {
    mkdirSync(path.join(dir, "portraits")); mkdirSync(path.join(dir, "monsters"));
    writeFileSync(path.join(dir, "portraits", "dil.webp"), Buffer.alloc(300, 1));
    writeFileSync(path.join(dir, "monsters", "goblin.webp"), Buffer.alloc(300, 2));
    const a = collectAssets(dir);
    if (Object.keys(a.map).join() !== "monsters/goblin,portraits/dil") fail(`魔物の絵の鍵が違う：${Object.keys(a.map).join()}`);
    let threw = false;
    try { collectAssets(dir, { limit: Math.ceil(a.total * 0.75) }); } catch { threw = true; }
    if (!threw) fail("人物と魔物を合わせて上限を超えても止まらない");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const real = collectAssets(new URL("../../assets", import.meta.url).pathname);
  const mons = real.files.filter((f) => f.key.startsWith("monsters/"));
  for (const f of mons) if (!seen.has(f.key.slice(9))) fail(`assets/${f.file} が魔物の一覧に無い`);
  ok(`V6 魔物の絵：一覧 ${list.length} 体（人物の側 ${Object.keys(people).length}）、assets/monsters に ${mons.length} 枚`);
};
