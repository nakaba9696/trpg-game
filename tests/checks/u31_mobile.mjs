// U31：スマホの画面の配置（ui/zzzzz_u31_mobile.js の u31.layout。DOM なし）
// - PC の大きさ（v9.isPC）はスマホの形にしない（PC の配置は変えない）。それより小さい画面はスマホの形
// - 縦長：上の帯 → 舞台（背景と立ち絵・魔物だけ。画面の上の 4 割以上）→ ログ（短く）→ コマンド（いちばん下まで）。重ならず、画面からはみ出さない
// - 横長：左に舞台、右にログ（上）とコマンド（下）
// - 立ち絵はログの窓の上に足元まで収まる。戦闘の魔物の場所はログ・コマンドの窓に掛からない。全文を開いたログは上の帯の下からコマンドの上まで
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail, ok, loadEngine }) => {
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const vmc = vm.createContext({ console, G, globalThis: { G }, Image: class { addEventListener() {} } });
  for (const n of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v5_stand.js", "v9_pc.js", "u13_menu.js", "zf2_opening.js", "zzzzz_u21_side.js", "zzzzz_u31_mobile.js"]) vm.runInContext(src("ui/" + n), vmc, { filename: "ui/" + n });
  const u31 = G.u31, u21 = G.u21;
  if (!u31 || !u31.layout || !u31.placeCast || !u31.isMobile) return fail("U31: G.u31.layout・placeCast・isMobile が無い");
  let bad = 0;
  const f = (m) => { bad++; fail("U31: " + m); };
  for (const [w, h] of [[1280, 720], [1366, 768], [1920, 1080], [1000, 560]]) if (u31.isMobile(w, h) || u21.layout(w, h, false).mobile) f(`${w}×${h}（PC）をスマホの形にしている`);
  const SIZES = [[390, 844], [360, 780], [430, 932], [375, 667], [320, 568], [844, 390], [932, 430], [667, 375], [800, 600]];
  for (const [w, h] of SIZES) {
    if (!u31.isMobile(w, h)) { f(`${w}×${h} がスマホの形にならない`); continue; }
    for (const combat of [false, true]) {
      const L = u21.layout(w, h, combat);
      const at = `${w}×${h}${combat ? "・戦闘" : ""}`;
      if (!L.mobile) { f(`${at}：u21.layout がスマホの配置を返さない`); continue; }
      const inside = (r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= w + 0.5 && r.y + r.h <= h + 0.5 && r.w > 0 && r.h > 0;
      for (const k of ["tome", "side", "cast", "open"]) if (!inside(L[k])) f(`${at}：${k} が画面からはみ出す ${JSON.stringify(L[k])}`);
      if (combat && !(L.stage && inside(L.stage))) f(`${at}：魔物の場所が無い・はみ出す`);
      const over = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      if (over(L.tome, L.side)) f(`${at}：ログとコマンドの窓が重なる`);
      if (L.tome.y < L.head || L.side.y < L.head) f(`${at}：窓が上の帯に潜る`);
      if (combat && (over(L.stage, L.tome) || over(L.stage, L.side))) f(`${at}：魔物の場所がログ・コマンドの窓に掛かる`);
      if (!L.land) {
        if (!(L.tome.y >= L.cast.y + L.cast.h - 0.5)) f(`${at}：舞台の上にログの窓が重なる`);
        if (L.cast.h < h * 0.3) f(`${at}：舞台が低い（${L.cast.h}）`);
        if (!(L.side.y > L.tome.y && L.side.y + L.side.h >= h - 12)) f(`${at}：コマンドの窓がいちばん下にない`);
        if (L.side.h < Math.min(200, h * 0.34)) f(`${at}：コマンドの窓が低い（${L.side.h}）`);
      } else {
        if (over(L.cast, L.tome) || over(L.cast, L.side)) f(`${at}：横長で舞台に窓が重なる`);
        if (!(L.tome.x >= L.cast.x + L.cast.w)) f(`${at}：横長でログが舞台の右にない`);
      }
      if (L.open.y + L.open.h > (L.land ? h : L.side.y) + 0.5 || L.open.h < L.tome.h) f(`${at}：全文を開いたログの窓がコマンドに掛かる・短い`);
      // 立ち絵：話している人は真ん中に、足元まで舞台の中（ログに隠れない）。戦闘では出さない
      const list = [{ role: "speaker" }, { role: "ally" }];
      const spots = u31.placeCast(L, list);
      if (combat) { if (spots.length) f(`${at}：戦闘で立ち絵を出す`); continue; }
      const s = spots[0];
      if (!s || !s.front) { f(`${at}：話している人が前に出ない`); continue; }
      if (s.h > L.cast.h + 0.5) f(`${at}：立ち絵が舞台より高い（ログに隠れる）`);
      if (Math.abs(s.x - L.cast.w / 2) > L.cast.w * 0.05) f(`${at}：話している人が真ん中にいない`);
      if (s.h * 0.8 > L.cast.w * 0.95) f(`${at}：立ち絵が舞台の幅に収まらない`);
    }
  }
  if (!bad) ok("U31: スマホの配置（縦長・横長・戦闘）");
};
