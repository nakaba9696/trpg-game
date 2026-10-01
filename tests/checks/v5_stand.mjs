// V5：話している人物を大きく立たせる（src/ui/v5_stand.js・style.css の #stand）
// - 出来事の人を正しく拾う（戦闘中・出来事でないときは出さない）
// - 大きく立たせるのは持ち主の画像がある人だけ。canvas の絵の人・敵は今のまま
// - 大きさ：PC は画面の高さの 6〜7 割で、はみ出した分は文章の窓の後ろへ。スマホは絵の帯の中に収まる
// - style.css：縁のぼかし・下のフェード・出入りのフェード・明暗の調子・動きを減らす設定
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail, ok, loadEngine }) => {
  const G = loadEngine();
  const D = G.data;
  const vmc = vm.createContext({ console, G, Image: class { addEventListener() {} } });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v5_stand.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  const st = G.stand;
  if (!st || !st.whoOf || !st.big || !st.fit || !st.sig || !st.nameOf) return fail("V5：G.stand の入口が足りない");
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  if (!ev("c2_nora") || !ev("c2_sheila_hire")) return fail("V5：確かめに使う出来事（c2_nora・c2_sheila_hire）が無い");

  // 出来事の人
  G.ASSETS = { "portraits/nora": "data:image/webp;base64,AA==", "portraits/sheila": "data:image/webp;base64,AA==" };
  const nora = st.whoOf({ mode: "event", event: "c2_nora", flags: {} });
  if (!nora) fail("V5：出来事 c2_nora の人が拾えない");
  if (st.whoOf({ mode: "event", event: "c2_nora", combat: { foes: [] }, flags: {} })) fail("V5：戦闘中に立ち絵を出している");
  if (st.whoOf({ mode: "explore", event: null, flags: {} })) fail("V5：出来事でないのに立ち絵を出している");
  if (st.whoOf(null)) fail("V5：状態が無いのに立ち絵を出している");
  if (!st.big(nora)) fail("V5：画像のある人（ノラミ）が大きく立たない");
  const sheila = st.whoOf({ mode: "event", event: "c2_sheila_hire", flags: {} });
  if (!st.big(sheila)) fail("V5：画像のある人（シェイラ）が大きく立たない");
  if (st.sig(nora) === st.sig(sheila)) fail("V5：違う人が同じ印になる（入れ替わりのフェードが起きない）");
  if (st.sig(nora) !== st.sig(st.whoOf({ mode: "event", event: "c2_nora_sniff", flags: {} }))) fail("V5：同じ人（ノラミ）が出来事ごとに違う印になる（描き直してちらつく）");
  if (!st.nameOf(nora)) fail("V5：立ち絵の名前が空");
  // 画像の無い人・敵は大きく立たせない（今の小さな額のまま）
  const other = D.EVENTS.find((e) => e.who && /^c2_/.test(e.id) && !G.v4PortraitKey(G.eventWho(e)));
  if (other && st.big(G.eventWho(other))) fail(`V5：画像の無い人（${other.id}）を大きく立たせている`);
  if (st.big({ kind: "foe", seed: "x" })) fail("V5：敵を立ち絵にしている");
  G.ASSETS = {};
  if (st.big(nora)) fail("V5：画像が無いのに大きく立たせている");

  // 大きさ
  const pc = st.fit(1280, 800, 346);
  if (pc.narrow || pc.h < 800 * 0.6 || pc.h > 800 * 0.7) fail(`V5：PC の立ち絵の高さが画面の 6〜7 割でない（${pc.h}px）`);
  if (pc.under <= 0 || pc.h - pc.under !== 346) fail("V5：PC の立ち絵が絵の窓から文章の窓の後ろへ伸びていない");
  if (Math.abs(pc.w / pc.h - 0.8) > 0.01) fail("V5：立ち絵が 4:5 でない");
  const sp = st.fit(390, 844, 339);
  if (!sp.narrow || sp.under !== 0 || sp.h > 339) fail("V5：スマホの立ち絵が絵の帯からはみ出す（文章に掛かる）");
  if (sp.h < 339 * 0.8 || sp.w > 390 * 0.72) fail(`V5：スマホの立ち絵の大きさがおかしい（${sp.w}×${sp.h}）`);
  const wide = st.fit(2560, 700, 300);
  if (wide.w > 2560 * 0.42 || wide.h < 300) fail("V5：横長の画面で立ち絵の大きさがおかしい");

  // style.css
  const css = readFileSync(new URL("../../src/style.css", import.meta.url), "utf8");
  const need = [
    [/#stand \.standFace \{[^}]*mask-image:[^}]*90deg[^}]*transparent 94%/s, "縁のぼかしと下のフェード"],
    [/#stand \.standFig \{[^}]*transition: opacity \.45s/s, "出入りのフェード（.45s。v5_stand.js の FADE と合わせる）"],
    [/#stand \.standFig\.on \{[^}]*opacity: 1/, "出たときの不透明"],
    [/prefers-reduced-motion: reduce\) \{ #stand \.standFig \{ transition: none/, "動きを減らす設定"],
    [/:root\[data-theme="dark"\] \{ --stand-filter/, "暗い版の調子"],
    [/\.scene\.standing #who \{ display: none/, "立ち絵のときは小さな額を隠す"],
  ];
  for (const [re, what] of need) if (!re.test(css)) fail(`V5：style.css に ${what} が無い`);
  if (st.FADE !== 450) fail("V5：v5_stand.js の FADE が style.css の .45s と合っていない");
  ok("V5 立ち絵：拾い方・画像のある人だけ・大きさ（PC・スマホ）・フェードと明暗の CSS");
};
