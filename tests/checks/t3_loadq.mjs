// T3：画像を読む順番（src/ui/t3_loadq.js）。プレイヤーが待たされないように、いま描く物を先に、先読みは一つずつ・いま描く物を読んでいないときだけ
// - いま描く物（0）はすぐ読む。先読み（1・2）は一つずつ、急ぐ物を読んでいないときだけ。1 が 2 より先
// - 並んでいる先読みがいま要るようになったら（need）、すぐ読む。読み終わったら次へ
// - 人物・魔物・背景の三つの入口が G.loadImage を通す。先読みは 1・2 で頼む。読み込み中の知らせ（#boot）は動き出したら消す
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail, ok }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("T3 読む順番: " + m); };
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const timers = [];
  const c = vm.createContext({ console, setTimeout: (f) => timers.push(f), Date });
  vm.runInContext(src("ui/t3_loadq.js"), c, { filename: "ui/t3_loadq.js" });
  const G = c.G;
  if (!G.loadq || !G.loadImage) return F("G.loadq・G.loadImage が無い");
  class Img { constructor(n) { this.n = n; this.ls = {}; this.src = ""; } addEventListener(k, f) { (this.ls[k] = this.ls[k] || []).push(f); } fire(k) { const fs = this.ls[k] || []; this.ls[k] = []; fs.forEach((f) => f()); } }
  const loading = (...xs) => xs.filter((x) => x.src).map((x) => x.n).join(",");
  const now = new Img("now"), later1 = new Img("later1"), later2 = new Img("later2"), soon = new Img("soon");
  G.loadImage(later1, "a.svg", 2);
  if (loading(later1) !== "later1") F("急ぐ物が無いのに、先読みを始めない");
  G.loadImage(now, "b.svg", 0);
  G.loadImage(later2, "c.svg", 2);
  G.loadImage(soon, "d.svg", 1);
  if (loading(now) !== "now") F("いま描く物をすぐ読まない");
  if (loading(later2, soon)) F(`いま描く物を読んでいるのに、次の先読みを始めた（${loading(later2, soon)}）`);
  later1.fire("load");
  if (loading(later2, soon)) F("いま描く物を読み終える前に、次の先読みを始めた");
  now.fire("load");
  if (loading(later2, soon) !== "soon") F(`急ぐ物が済んだら、もうすぐ要る物（1）から読むはず（${loading(later2, soon) || "なし"}）`);
  // 並んでいる先読みが、いま要るようになった
  G.needImage(later2, 0);
  if (loading(later2) !== "later2") F("並んでいた先読みがいま要るようになっても、すぐ読まない");
  soon.fire("load"); later2.fire("error");
  const st = G.loadq.state();
  if (st.queued || st.urgent || st.low) F(`読み終わっても数が残る（${JSON.stringify(st)}）`);
  // 入口
  const v4 = src("ui/v4_assets.js"), v6 = src("ui/v6_monsters.js"), sc = src("ui/scene_v3_photo.js");
  if (!/G\.loadImage\(img, where\(key\)\.src, pri\)/.test(v4) || !/image\(k, 2\)/.test(v4) || !/image\(key, 1\)/.test(v4)) F("人物の絵が読む順番を通していない（先読みは 2、仲間・話している人は 1）");
  if (!/G\.loadImage\(img, src, pri\)/.test(v6) || !/image\(k, 2\)/.test(v6)) F("魔物の絵が読む順番を通していない（起動のあとの先読みは 2）");
  if (!/G\.loadImage\(img, src, pri\)/.test(sc) || !/image\(w\.src, 2\)/.test(sc)) F("背景の写真が読む順番を通していない（隣の町・施設の先読みは 2）");
  if (!/id="boot"/.test(src("index.html")) || !/getElementById\("boot"\)/.test(src("ui/t3_boot.js"))) F("読み込み中の知らせ（#boot）が無いか、動き出しても消えない");
  if (!bad) ok("T3 読む順番（いま描く物を先に・先読みは一つずつ・並んでいる物がいま要れば先に・三つの入口が通す・読み込み中の知らせ）");
};
