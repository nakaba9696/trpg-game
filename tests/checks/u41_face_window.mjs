// U41：ADV の顔の窓（src/ui/zzzzzzzzzz_u41_face.js・src/data/u41_face_box.js）
// - FACE_BOX の値が 0〜1 で、四角が絵の内側。人の絵（assets/portraits/<id>.webp）がある人だけ
// - 全身の立ち絵は、表情の付いた場面でも基本の絵（設定 G.P.u41full を選べば表情の絵）
// - 顔の窓に出すもの：表情があり FACE_BOX のある人だけ。表情の絵が無ければ基本の絵の同じ四角。主人公・魔物・型の絵の人・表情の無い場面・戦闘では出さない
// - 切り出しの計算：顔の四角が窓いっぱいに、真ん中に入る
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

export default ({ fail, ok, loadEngine }) => {
  const G = loadEngine();
  const D = G.data;
  const F = (m) => fail("U41：" + m);
  const FB = D.FACE_BOX;
  if (!FB || !Object.keys(FB).length) return F("G.data.FACE_BOX が無い");
  for (const [id, b] of Object.entries(FB)) {
    if (!Array.isArray(b) || b.length !== 4 || !b.every((v) => typeof v === "number" && v >= 0 && v <= 1)) { F(`${id} の顔の四角が 0〜1 の数 4 つでない：${JSON.stringify(b)}`); continue; }
    if (!(b[2] > 0.05 && b[3] > 0.05)) F(`${id} の顔の四角が小さすぎる`);
    if (b[0] + b[2] > 1.0001 || b[1] + b[3] > 1.0001) F(`${id} の顔の四角が絵の外にはみ出す`);
    // 絵は 512×640。顔の窓は正方形なので、四角も（px で）ほぼ正方形
    const r = (b[2] * 512) / (b[3] * 640);
    if (r < 0.8 || r > 1.25) F(`${id} の顔の四角が正方形から遠い（${r.toFixed(2)}）`);
    if (!existsSync(new URL(`../../assets/portraits/${id}.webp`, import.meta.url))) F(`${id} の人の絵（assets/portraits/${id}.webp）が無い`);
  }

  // ---------------------------------------------------------------- 画面の決まり（DOM なし）
  const vmc = vm.createContext({ console, G, Image: class { addEventListener() {} } });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v5_stand.js", "v8_moods.js", "v8_moods_v11.js", "zzzzzzzzzz_u41_face.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  const u41 = G.u41, st = G.stand;
  if (!u41 || !u41.faceOf || !u41.crop || !u41.full || !st) return F("G.u41（faceOf・crop・full）が無い");
  const A = "data:image/webp;base64,AA==";
  G.ASSETS = { "portraits/nora": A, "portraits/nora_sorrow": A, "portraits/nora_joy": A };
  const nora = st.whoOf({ mode: "event", event: "c2_nora_sniff", flags: {} });
  if (!nora) return F("出来事 c2_nora_sniff の人が拾えない");
  if (!FB.nora) return F("FACE_BOX に nora が無い");
  const sad = { mode: "event", event: "c2_nora_sniff", mood: "sorrow", flags: {} };
  const P0 = G.P;
  G.P = { trophies: {}, graves: [] };

  // 全身の立ち絵は基本の絵
  if (G.v8WithMood(nora, sad).mood) F("顔の窓だけのとき、全身の立ち絵に表情を付けている");
  if (G.v4PortraitKey(G.v8WithMood(nora, sad)) !== "nora") F("表情の付いた場面で、全身の立ち絵の鍵が基本の絵にならない");
  const cvOf = (cls) => ({ classList: { contains: (c) => c === cls }, dataset: {}, width: 0, height: 0, getBoundingClientRect: () => ({ width: 0, height: 0 }), getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) });
  const S0 = G.S;
  G.S = sad;
  const cv = cvOf("standFace");
  try { G.drawPortrait(cv, nora); } catch (e) { F("立ち絵を描くところで止まる：" + e.message); }
  if (cv.dataset.v8key !== "nora") F(`全身の立ち絵が表情の絵で描かれる（${cv.dataset.v8key}）`);
  // 設定で全身も変える
  G.P.u41full = true;
  const cv2 = cvOf("standFace");
  try { G.drawPortrait(cv2, nora); } catch (e) { F("立ち絵を描くところで止まる：" + e.message); }
  if (cv2.dataset.v8key !== "nora_sorrow") F(`「全身の立ち絵でも表情を変える」で、表情の絵にならない（${cv2.dataset.v8key}）`);
  G.P.u41full = false;
  if (u41.full(undefined) || u41.full({})) F("古い記録（u41full 無し）で全身の立ち絵も変える形になる");
  G.S = S0;

  // 顔の窓に出すもの
  const f1 = u41.faceOf(nora, sad);
  if (!f1 || f1.key !== "nora_sorrow" || f1.id !== "nora" || f1.box !== FB.nora) F(`表情の顔の窓が、その表情の絵と nora の四角にならない（${JSON.stringify(f1)}）`);
  const f2 = u41.faceOf(nora, Object.assign({}, sad, { mood: "anger" }));
  if (!f2 || f2.key !== "nora") F(`表情の絵が無いとき、基本の絵の同じ四角にならない（${f2 && f2.key}）`);
  const f3 = u41.faceOf(nora, Object.assign({}, sad, { mood: "shy" }));
  if (!f3 || f3.key !== "nora_joy") F(`表情の絵が無いとき、落とし先（照れ→喜）の絵にならない（${f3 && f3.key}）`);
  if (u41.faceOf(nora, { mode: "event", event: "c2_nora_sniff", flags: {} })) F("表情の無い場面で顔の窓を出す");
  if (u41.faceOf(nora, Object.assign({}, sad, { combat: { foes: [] } }))) F("戦闘中に顔の窓を出す");
  if (u41.faceOf({ kind: "hero", name: "あなた" }, sad)) F("主人公に顔の窓を出す");
  if (u41.faceOf({ kind: "foe", foe: "goblin" }, sad)) F("魔物に顔の窓を出す");
  if (u41.faceOf(null, sad)) F("人のいない場面で顔の窓を出す");
  G.ASSETS = { "portraits/kind_villager_m": A };
  if (u41.faceOf({ kind: "villager", sex: "男", age: 45, seed: "x" }, sad)) F("FACE_BOX の無い人（型の絵）に顔の窓を出す");
  G.ASSETS = {};
  if (u41.faceOf(nora, sad)) F("絵の無い人に顔の窓を出す");
  if (u41.box("nora") !== FB.nora || u41.box("no_such") !== null) F("u41.box が四角を正しく返さない");

  // 切り出しの計算：スプライトの升目の中の顔の四角が、窓（120px）の真ん中にいっぱいに入る
  const box = [0.25, 0.1, 0.5, 0.4];
  const c = u41.crop(120, [1536, 1920], [512, 640, 512, 640], box);
  const k = c.w / 1536;
  const bx = (512 + box[0] * 512) * k + c.x, by = (640 + box[1] * 640) * k + c.y;
  const bw = box[2] * 512 * k, bh = box[3] * 640 * k;
  if (Math.abs(bx + bw / 2 - 60) > 0.01 || Math.abs(by + bh / 2 - 60) > 0.01) F("切り出した顔の四角が窓の真ん中に来ない");
  if (Math.abs(Math.max(bw, bh) - 120) > 0.01 || Math.min(bw, bh) < 119.99) F("切り出した顔の四角が窓いっぱいにならない");
  if (Math.abs(c.h / c.w - 1920 / 1536) > 1e-6) F("切り出しで絵の縦横の比が変わる");
  const c0 = u41.crop(100, [512, 640], null, box);
  if (Math.abs((box[0] * 512) * (c0.w / 512) + c0.x - (100 - box[2] * 512 * (c0.w / 512)) / 2) > 0.01) F("スプライトでない絵の切り出しがずれる");

  G.P = P0;
  ok(`U41：顔の窓（FACE_BOX ${Object.keys(FB).length} 人・全身は基本の絵・表情の絵と落とし先・出さない場面・切り出し）`);
};
