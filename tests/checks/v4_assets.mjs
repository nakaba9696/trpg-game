// V4：持ち主が作った人物の絵の差し込み（tools/assets.mjs・src/ui/v4_assets.js・docs/art/portraits.json）
// - 一覧の id がすべてゲームの人物に当たる（キャラメモの人・名のある人の出来事・人の種類の型）。主人公の型は無い（A10）。md が json と合っている
// - 名のある人は、どの出来事・仲間でも同じ顔（canvas の絵の who が一つに固定されている）
// - タグに画風・品質・性的な言葉が無い
// - 画像が無ければ絵を出さない（A10：canvas の絵はやめた）。画像があれば、名のある人・型（名もない人）に正しい画像を選んで描く。主人公は絵なし
// - 埋め込み（予備の --embed）：差分を省いても assets/ の合計が 12MB を超えたら落とす。webp を優先し、拡張子で種類を付ける
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import vm from "node:vm";
import path from "node:path";
import { collectAssets, assetsScript, LIMIT } from "../../tools/assets.mjs";
import { JSON_PATH, MD_PATH, renderPortraitsMd } from "../../tools/portraits.mjs";

export default ({ G, fail, ok }) => {
  const D = G.data;
  // ---------------------------------------------------------------- 画面の部品を DOM なしで読む
  const loaded = [];
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.ls = {}; loaded.push(this); }
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    set src(v) { this._src = v; }
    get src() { return this._src; }
    fire() { this.complete = true; this.naturalWidth = 512; this.naturalHeight = 640; (this.ls.load || []).forEach((f) => f()); }
  }
  const vmc = vm.createContext({ console, G, Image: FakeImage });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  const calls = [];
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? () => grad : (...a) => calls.push([k, a])), set: (t, k, v) => ((t[k] = v), true) });
  const face = () => ({ width: 0, height: 0, getBoundingClientRect: () => ({ width: 96, height: 120 }), getContext: () => ctx });

  // ---------------------------------------------------------------- 一覧
  const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const list = data.portraits || [];
  const seen = new Set();
  const BAD = /masterpiece|best quality|high quality|anime|illustration|realistic|portrait|upper body|looking at viewer|nsfw|nude|naked|breast|cleavage|navel|thigh|sexy|lingerie|underwear|panties|loli/i;
  for (const p of list) {
    if (seen.has(p.id)) fail(`一覧に同じ id が二つ：${p.id}`);
    seen.add(p.id);
    if (p.file !== `assets/portraits/${p.id}.webp`) fail(`一覧の ${p.id} のファイル名が違う：${p.file}`);
    if (!p.tags || !p.name || !p.memo) fail(`一覧の ${p.id} にタグ・名前・メモのどれかが無い`);
    if (p.seed !== undefined && !(Number.isInteger(p.seed) && p.seed >= 0)) fail(`一覧の ${p.id} の seed が 0 以上の整数でない：${p.seed}`);
    if (BAD.test(p.tags)) fail(`一覧の ${p.id} のタグに、画風・構図・性的な言葉がある：${p.tags.match(BAD)[0]}`);
    let m;
    if (p.group === "c2") { if (!D.C2_PEOPLE[p.id]) fail(`一覧の ${p.id} がキャラメモの人にいない`); }
    else if (p.group === "named") {
      const n = G.V4_NAMED[p.id];
      if (!n) fail(`一覧の ${p.id} が v4_assets.js の NAMED にいない`);
      else for (const e of n.events || []) if (!D.EVENTS.some((x) => x.id === e)) fail(`NAMED の ${p.id} の出来事 ${e} が無い`);
    } else if (p.group === "people") {
      m = /^kind_([a-z]+)_([mf])(_[bc])?$/.exec(p.id); // _b 二枚目・_c 三枚目（R5b：年頃を埋める型）
      if (!m || !G.PEOPLE[m[1]]) fail(`一覧の ${p.id} が人物の種類（G.PEOPLE）に当たらない`);
    } else fail(`一覧の ${p.id} の group が分からない：${p.group}`);
  }
  for (const id of Object.keys(G.V4_NAMED)) if (!seen.has(id)) fail(`NAMED の ${id} が一覧（docs/art/portraits.json）に無い`);
  for (const k of Object.keys(data.beasts || {})) if (!D.BEASTS[k]) fail(`一覧の獣 ${k} がゲームの獣にいない`);
  if (list.some((p) => /^hero_/.test(p.id))) fail("一覧に主人公の型（hero_*）が残っている（A10：主人公は絵なし）");
  const order = list.map((p) => (p.group === "c2" || p.group === "named" ? 0 : 1));
  if (order.some((v, i) => i && v < order[i - 1])) fail("一覧で、名のある人物が型より先に並んでいない");
  const missC2 = Object.keys(D.C2_PEOPLE).filter((id) => !seen.has(id));
  if (missC2.length) fail(`キャラメモの人が一覧に無い：${missC2.join("、")}`);
  // 持ち主の絵柄の設定（tools/gen_portraits.mjs が読む）：読めて、縦横の比が一覧の大きさと同じ（縮めても歪まない）
  let style = null;
  try { style = JSON.parse(readFileSync(new URL("../../docs/art/style.json", import.meta.url), "utf8")); } catch (e) { fail("docs/art/style.json が読めない：" + e.message); }
  if (style) {
    if (!style.url || typeof style.prefix !== "string" || typeof style.negative !== "string") fail("docs/art/style.json に url・prefix・negative が無い");
    if (style.width && style.height && Math.abs(style.width / style.height - data.size.width / data.size.height) > 0.01) fail(`style.json の大きさ ${style.width}×${style.height} が一覧の ${data.size.width}×${data.size.height} と縦横の比が違う`);
  }
  if (readFileSync(MD_PATH, "utf8") !== renderPortraitsMd(data)) fail("docs/art/portraits.md が json と合っていない（node tools/portraits.mjs で作り直す）");

  // ---------------------------------------------------------------- 名のある人は、どこで会っても同じ顔
  const look = (w) => JSON.stringify(G.personLook(w));
  for (const [id, n] of Object.entries(G.V4_NAMED)) {
    const ws = (n.events || []).map((e) => G.eventWho(D.EVENTS.find((x) => x.id === e))).filter(Boolean);
    for (const name of n.names || []) ws.push(G.companionWho({ name }));
    if (n.c2 && D.C2_PEOPLE[id]) ws.push(D.C2_PEOPLE[id].who);
    if (ws.some((w) => look(w) !== look(ws[0]))) fail(`名のある人 ${id} の顔が、出来事や仲間ごとに違う`);
  }

  // ---------------------------------------------------------------- 画像が無いとき：絵を出さない
  G.ASSETS = undefined;
  const hero = G.heroWho({ name: "テスト", sex: "女", age: 24, race: "elf" }, "merc");
  if (G.v4PortraitKey(hero) !== null) fail("画像が無いのに画像の鍵を返す");
  calls.length = 0;
  try { G.drawPortrait(face(), hero); } catch (e) { fail("画像が無いとき描けない：" + e.message); }
  if (calls.some(([k]) => k !== "clearRect" && k !== "setTransform")) fail("画像が無いとき、canvas に絵を描いた（A10：絵を出さない）");

  // ---------------------------------------------------------------- 画像があるとき：選ぶ
  const A = (G.ASSETS = {});
  const put = (...ids) => ids.forEach((id) => (A["portraits/" + id] = "data:image/webp;base64,AAAA"));
  const want = (who, key, what) => { const got = G.v4PortraitKey(who); if (got !== key) fail(`${what}：${key} のはずが ${got}`); };
  put("hero_merc_f_elf", "hero_merc_f", "hero_merc_m");
  want(hero, null, "主人公（エルフの女の傭兵。画像があっても絵なし。A10）");
  want(G.heroWho({ sex: "男", age: 45 }, "merc"), null, "主人公（男の傭兵）");

  put("dil", "aurelia", "chancellor", "gaston", "erna", "kind_archer_f", "kind_archer_m", "kind_priest_f", "kind_child_f", "kind_elder_f", "kind_villager_m", "kind_villager_f", "kind_villager_f_elf");
  const ev = (id) => G.eventWho(D.EVENTS.find((e) => e.id === id));
  want(ev("c2_dil_house"), "dil", "キャラメモの人の出来事");
  want(ev("w1_miracle"), "aurelia", "名のある人の出来事");
  want(ev("m3_castle_g"), "erna", "seed の無い出来事のエルナ");
  want(G.facWho({ mode: "fac", fac: "castle", loc: "garmund", flags: {} }), "chancellor", "王城の宰相");
  want(G.companionWho({ name: "茹で騎士ガストン" }), "gaston", "名前の決まった仲間");
  if (D.C2_PEOPLE.dil) want(G.companionWho({ name: "ディル", who: D.C2_PEOPLE.dil.who }), "dil", "キャラメモの仲間");
  want(G.companionWho({ name: "リーナ", cls: "弓使い" }), "kind_archer_f", "弓使いの女の仲間");
  want(G.companionWho({ name: "ラグナ", cls: "弓使い" }), "kind_archer_m", "弓使いの男の仲間");
  want(ev("donation"), "kind_priest_f", "名の無い出来事の人（修道女の型）");
  want(ev("m4_ruin_looter"), "kind_child_f", "9 歳の子は子どもの型");
  want(ev("fortune"), "kind_elder_f", "老婆は老人の型");
  const elf = ev("r1_elf_kin");
  want(elf, elf.sex === "男" ? "kind_villager_m" : "kind_villager_f_elf", "エルフの町の人（エルフの型があればそれ）");
  want(Object.assign({}, elf, { look: { ears: "pointy" }, kind: "archer" }), elf.sex === "男" ? "kind_archer_m" : "kind_archer_f", "エルフの弓使い（エルフの型が無ければ人間の型。A10）");
  want({ kind: "priest", sex: "女", age: 30, seed: "a10:cat", look: { beast: "cat" } }, "kind_priest_f", "猫の獣人の神官（獣人の型が無ければ人間の型。A10）");
  want({ kind: "majin", sex: "女", age: 30, seed: "a10:majin" }, null, "人の姿の使徒（合う型が無い）");

  // 描く：読み込みの前は枠を空け、読み込んだら画像
  loaded.length = 0; calls.length = 0;
  const cv = face();
  G.drawPortrait(cv, ev("w1_miracle"));
  if (loaded.length !== 1 || !String(loaded[0].src).startsWith("data:image/webp")) fail("画像を data URI から読んでいない");
  if (calls.some(([k]) => k === "drawImage")) fail("読み込みの前に画像を描いた");
  calls.length = 0;
  loaded[0].fire();
  const di = calls.find(([k]) => k === "drawImage");
  if (!di) fail("読み込んだあと画像を描いていない");
  else if (di[1].slice(5).join() !== "0,0,96,120") fail(`画像を枠いっぱいに描いていない：${di[1].slice(1).join(",")}`);
  // 読み込みのあいだに別の人を描くことになったら、古い画像で上書きしない
  loaded.length = 0; calls.length = 0;
  const cv2 = face();
  G.drawPortrait(cv2, ev("c2_dil_house"));
  G.drawPortrait(cv2, ev("donation"));
  loaded[0].fire();
  if (calls.some(([k]) => k === "drawImage")) fail("別の人に替わったあと、古い画像で上書きした");
  // 2度目からはすぐ画像
  calls.length = 0;
  G.drawPortrait(face(), ev("w1_miracle"));
  if (!calls.some(([k]) => k === "drawImage")) fail("読み込み済みの画像をすぐ描かない");
  G.ASSETS = undefined;

  // ---------------------------------------------------------------- 埋め込み
  // 埋め込みは予備（--embed）。上限を超えるなら差分を省いて収める（外のファイルの形の大きさは a6_site.mjs）
  let real = null;
  try { real = collectAssets(new URL("../../assets", import.meta.url).pathname, { shrink: true }); } catch (e) { fail("予備の埋め込み（--embed）が差分を省いても上限に収まらない：" + e.message); }
  if (real && real.total > LIMIT) fail(`assets/ の埋め込みが ${(real.total / 1048576).toFixed(1)}MB で 12MB を超える`);
  const dir = mkdtempSync(path.join(tmpdir(), "v4-"));
  try {
    mkdirSync(path.join(dir, "portraits"));
    writeFileSync(path.join(dir, "portraits", "a.webp"), Buffer.alloc(300, 1));
    writeFileSync(path.join(dir, "portraits", "a.png"), Buffer.alloc(10, 2));
    writeFileSync(path.join(dir, "portraits", "b.jpg"), Buffer.alloc(10, 3));
    writeFileSync(path.join(dir, "portraits", "notes.txt"), "画像ではない");
    const a = collectAssets(dir);
    if (Object.keys(a.map).join() !== "portraits/a,portraits/b") fail(`埋め込みの鍵が違う：${Object.keys(a.map).join()}`);
    if (!a.map["portraits/a"].startsWith("data:image/webp;base64,") || !a.map["portraits/b"].startsWith("data:image/jpeg;base64,")) fail("埋め込みの種類か、webp の優先が違う");
    const s = assetsScript(a);
    const c = vm.createContext({});
    vm.runInContext(s, c);
    if (!c.G || !c.G.ASSETS || c.G.ASSETS["portraits/a"] !== a.map["portraits/a"]) fail("埋め込みの JS から G.ASSETS を引けない");
    if (/<\/script/i.test(s)) fail("埋め込みの JS に </script が入る");
    if (assetsScript(collectAssets(path.join(dir, "none")))) fail("画像が無いのに埋め込みの JS を出す");
    let threw = false;
    try { collectAssets(dir, { limit: 200 }); } catch { threw = true; }
    if (!threw) fail("埋め込みの合計が上限を超えても止まらない");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  ok(`V4 人物の絵：一覧 ${list.length} 人、assets/ に ${real.files.length} 枚（${(real.total / 1024).toFixed(0)}KB）`);
};
