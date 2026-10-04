// S3：本のページをめくる音（src/ui/sound.js の pagePlan・clickCue・fileKeys、tools/assets.mjs の assets/sounds/）
// - 合成の表：指の擦れ → 「さらっ」→ 「ぱさっ」の順で、長さ 0.15〜0.42 秒（消え際の余白込み）・強さはほかの効果音と並ぶ程度、毎回少しずつ違う
// - 本を開く・頁を移るボタンはページの音、導入の本のめくりはボタンの音と二重にならない
// - 録音した音のファイル：assets/sounds/page_*.ogg（webm・mp3）を別ファイルで載せ、あればそれを使い、無ければ合成
// 波形（無音・クリップ）は tools/sound_check.mjs で確かめる（Chromium が要るので CI では動かさない）
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import vm from "node:vm";
import path from "node:path";
import { siteAssets, collectAssets, assetsScript } from "../../tools/assets.mjs";

export default ({ G, fail, ok }) => {
  const F = (m) => fail("S3 " + m);
  const c = vm.createContext({ console, G: { data: G.data } });
  vm.runInContext(readFileSync(new URL("../../src/ui/sound.js", import.meta.url), "utf8"), c, { filename: "ui/sound.js" });
  const snd = c.G.sound;

  // ---------------------------------------------------------------- 合成の表
  const ends = new Set();
  for (let i = 0; i < 40; i++) {
    const p = snd.pagePlan();
    ends.add(p.end.toFixed(3));
    if (!(p.end > 0.15 && p.end < 0.42)) F(`ページの音の長さが ${p.end.toFixed(3)} 秒（消え際の余白を入れて 0.15〜0.42 のはず）`);
    if (!p.pinch.length || p.pinch.some((x) => x.at >= p.sweep.at)) F("指の擦れが「さらっ」より前に無い");
    if (!(p.flop.at > p.sweep.at + p.sweep.dur * 0.5 && p.flop.at < p.sweep.at + p.sweep.dur)) F("「ぱさっ」が「さらっ」の消え際に重ならない");
    if (!(p.sweep.f1 > p.sweep.f0 && p.sweep.f1 > p.sweep.f2)) F("「さらっ」の帯域が上がって下がらない");
    if (!(p.sweep.dur >= 0.1 && p.sweep.dur <= 0.25)) F(`「さらっ」の長さが ${p.sweep.dur.toFixed(3)} 秒`);
    if (p.grains.length < 4) F("紙のざらつき（細かな粒）が少ない");
    const all = [...p.pinch, ...p.grains, p.flop, p.sweep];
    if (all.some((x) => !(x.g > 0) || x.g > 0.3)) F("強さが 0 か、大きすぎる部品がある");
    if (p.flop.f > 1000) F("「ぱさっ」が高すぎる（中低域の当たりのはず）");
  }
  if (ends.size < 20) F(`ページの音が毎回ほとんど同じ（40 回で ${ends.size} 通り）`);

  // ---------------------------------------------------------------- ボタン → 音
  const btn = (o) => ({ id: o.id || "", dataset: o.fid ? { fid: o.fid } : {}, getAttribute: (k) => (k === "role" ? o.role || null : null), closest: (sel) => (o.dlg && sel.split(",").map((x) => x.trim()).includes("#" + o.dlg) ? {} : null) });
  const want = [
    [{ id: "openCodex" }, "page"], [{ id: "u11Codex" }, "page"], // 世界の手引きは図鑑の「用語」のタブ（U11）
    [{ role: "tab", dlg: "dlgCodex" }, "page"], [{ role: "tab", dlg: "dlgTrophy" }, "page"],
    [{ fid: "b-next" }, null], [{ fid: "b-prev" }, null], [{ fid: "b-go" }, "click"], [{ id: "openSound" }, "click"], [{ role: "tab", dlg: "dlgOther" }, "click"],
  ];
  for (const [o, w] of want) { const got = snd.clickCue(btn(o)); if (got !== w) F(`ボタン ${JSON.stringify(o)} の音が ${got}（${w} のはず）`); }
  const setup = readFileSync(new URL("../../src/ui/setup.js", import.meta.url), "utf8");
  if (!/"b-next"/.test(setup) || !/sfx\("page"\)/.test(setup)) F("導入の本の「ページをめくる」が page を鳴らしていない（setup.js）");

  // ---------------------------------------------------------------- 録音した音のファイル
  const A = { "sounds/page_1": "sounds/page_1.ogg", "sounds/page_2": "sounds/page_2.ogg", "sounds/pager": "sounds/pager.ogg", "sounds/click": "sounds/click.mp3", "portraits/page_1": "portraits/page_1.webp" };
  if (JSON.stringify(snd.fileKeys("page", A)) !== JSON.stringify(["sounds/page_1", "sounds/page_2"])) F(`page のファイルの選び方が違う：${snd.fileKeys("page", A)}`);
  if (JSON.stringify(snd.fileKeys("click", A)) !== JSON.stringify(["sounds/click"])) F("名前そのままのファイル（sounds/click）を拾わない");
  if (snd.fileKeys("page", {}).length) F("ファイルが無いのに page のファイルがある");
  if (snd.source("page") !== "synth") F("読めたファイルが無いのに合成に戻らない");
  snd.buffers.page = [{}];
  if (snd.source("page") !== "file") F("読めたファイルがあるのに使わない");
  snd.buffers.page = [];
  if (snd.source("page") !== "synth") F("ファイルが空なら合成に戻らない");
  if (!(snd.FILE_GAIN.page > 0 && snd.FILE_GAIN.page <= 1)) F("ファイルの音量（FILE_GAIN.page）がおかしい");

  // ビルドの側：assets/sounds/ の音を別ファイルで載せる。同じ名前なら mp3。場所と種類が合わないものは使わない
  const dir = mkdtempSync(path.join(tmpdir(), "s3-"));
  try {
    mkdirSync(path.join(dir, "sounds")); mkdirSync(path.join(dir, "portraits"));
    writeFileSync(path.join(dir, "sounds", "page_1.ogg"), Buffer.alloc(2000, 1));
    writeFileSync(path.join(dir, "sounds", "page_1.mp3"), Buffer.alloc(1500, 2));
    writeFileSync(path.join(dir, "sounds", "page_2.webm"), Buffer.alloc(1000, 3));
    writeFileSync(path.join(dir, "sounds", "oops.png"), Buffer.alloc(10, 4));
    writeFileSync(path.join(dir, "portraits", "nora.ogg"), Buffer.alloc(10, 5));
    const s = siteAssets(dir);
    if (s.map["sounds/page_1"] !== "sounds/page_1.mp3" || s.map["sounds/page_2"] !== "sounds/page_2.webm") F(`音のファイルの公開パスが違う：${JSON.stringify(s.map)}`);
    if (s.map["sounds/oops"] || s.map["portraits/nora"]) F("場所と種類が合わないファイルを載せた");
    if (s.files.length !== 2 || s.total !== 2500) F(`載せる音のファイルが違う（${s.files.map((f) => f.pub).join("・")}）`);
    const cx = vm.createContext({});
    vm.runInContext(assetsScript(s), cx);
    if (JSON.stringify(snd.fileKeys("page", cx.G.ASSETS)) !== JSON.stringify(["sounds/page_1", "sounds/page_2"])) F("ビルドの一覧から page のファイルを引けない");
    const e = collectAssets(dir);
    if (!String(e.map["sounds/page_1"]).startsWith("data:audio/mpeg;base64,")) F("埋め込み（--embed）で音のファイルが data URI にならない");
  } finally { rmSync(dir, { recursive: true, force: true }); }

  ok(`S3 ページをめくる音（合成 40 回で ${ends.size} 通り・本のボタン ${want.length} 件・音のファイルの口）`);
};
