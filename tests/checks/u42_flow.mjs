// U42：選択肢の出口と本文の出し方（src/ui/zzzzzz_zz_u42_flow.js の DOM を使わない部分、G.u42。と .css・U21・U28 の直し）
// - どの町のどの施設でも、出口（id "back"・「〜を出る」）が G.actions() の最後の組にあり、G.u42.exitGroup が見つける。
//   組にまとめる形（U13・右の列の U21）でも、出口の組は札の中に隠れず、下に出したまま
// - 出口の組は窓の下に貼り付ける（.css の sticky）。U21 の組の札の印（.u21acc）は描き直しのたびに外す（王城で「王城を出る」が切れた不具合）
// - 町に着いた見出しの間は、本文を一行ずつ出す流れ（U28）が待つ口（G.u28.wait）を見る
// - 道中の出来事：道中の一行のあとに出た出来事の名前から、本文の窓を見せる（G.u42.eventStart）
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, loadEngine, seeded }) => {
  const fail = (m) => failTo("U42：" + m);
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const D = G.data;
  const vmc = vm.createContext({ console, G, globalThis: { G }, Image: class { addEventListener() {} } });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v5_stand.js", "v9_pc.js", "u13_menu.js", "zf2_opening.js", "zzzzz_u21_side.js", "zzzzzz_zz_u42_flow.js"])
    vm.runInContext(src("ui/" + f), vmc, { filename: "ui/" + f });
  const u42 = G.u42, u13 = G.u13, u21 = G.u21;
  for (const k of ["exitGroup", "eventStart"]) if (!u42 || typeof u42[k] !== "function") return fail(`G.u42.${k} が無い`);

  // ---------------------------------------------------------------- 1. 施設の出口
  G.rand = seeded(4200);
  G.P = { trophies: {}, graves: [] };
  const stats = {};
  D.STATS.forEach((k) => { stats[k] = 60; });
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
  let seen = 0;
  const towns = Object.entries(D.LOCS).filter(([, L]) => L.type === "town" && (L.fac || []).length);
  if (!towns.some(([id, L]) => id === "leavel" && L.fac.includes("castle"))) fail("王都レオネストの王城が見つからない");
  for (const [loc, L] of towns) {
    for (const f of L.fac) {
      for (const shape of ["plain", "rich"]) {
        const S = G.S;
        S.loc = loc; S.mode = "fac"; S.fac = f; S.combat = null; S.travel = null;
        // 「rich」：名声・お金・位が多いとき（王城の選択肢・王宮の奥・教わる、などが増えて窓が混む形）
        if (shape === "rich") { S.fame = 650; S.gold = 99999; } else { S.fame = 0; S.gold = 0; }
        const where = `${loc}:${f}（${shape}）`;
        let gs;
        try { gs = G.actions(); } catch (e) { fail(`${where}：G.actions() が落ちる ${e.message}`); continue; }
        const full = gs.filter((g) => g && g.list && g.list.length);
        const at = u42.exitGroup(gs);
        if (at < 0) { fail(`${where}：「${G.FAC_NAMES[f]}を出る」が無い`); continue; }
        seen++;
        if (at !== full.length - 1) fail(`${where}：出口の組が最後でない（${at + 1}/${full.length}）`);
        const exit = full[at].list.find((a) => a.id === "back");
        if (!/を出る$/.test(exit.label)) fail(`${where}：出口の名前が「〜を出る」でない（${exit.label}）`);
        if (exit.disabled) fail(`${where}：出口が押せない`);
        // 組にまとめる形でも、出口の組は札の中に隠れない（スマホ・下の帯の U13 と、PC の右の列の U21）
        for (const active of [false, true]) {
          u21.active = active;
          const plan = active ? u21.plan(gs, S) : u13.plan(gs, S);
          if (!plan) continue;
          if ((plan.tabs || []).some((t) => t.groups.includes(at))) fail(`${where}：出口の組が${active ? "右の列" : ""}の札の中に隠れる`);
          if (!(plan.bottom || []).includes(at) && !(plan.top || []).includes(at)) fail(`${where}：出口の組が${active ? "右の列" : ""}のまとめ方からこぼれる`);
        }
        u21.active = false;
      }
    }
  }
  if (seen < 20) fail(`確かめた施設が少ない（${seen}）`);

  // 見た目：出口の組を窓の下に貼る。U21 は描き直しのたびに組の札の印を外す。U28 は待つ口を見る
  const css = src("ui/zzzzzz_zz_u42_flow.css");
  if (!/#panel\s*>\s*\.agroup\.u42exit\s*\{[^}]*position:\s*sticky[^}]*bottom:\s*0/.test(css)) fail("出口の組を窓の下に貼る（sticky）決まりが無い");
  const side = src("ui/zzzzz_u21_side.js");
  const acc = side.slice(side.indexOf("function accordion"), side.indexOf("function accordion") + 600);
  const rm = acc.indexOf('classList.remove("u21acc")'), first = acc.indexOf("return;");
  if (rm < 0 || (first >= 0 && rm > first)) fail("U21 の組の札の印（u21acc）を、描き直しの最初に外していない（札の無い施設で窓が流れなくなる）");
  if (!/U\.wait\s*&&\s*U\.wait\(\)/.test(src("ui/zzzzzz_u28_beats.js"))) fail("U28 の一行ずつ出す流れが、待つ口（G.u28.wait）を見ていない");
  if (!/U28\.wait\s*=/.test(src("ui/zzzzzz_zz_u42_flow.js"))) fail("町に着いた見出しの間、本文を待たせていない");

  // ---------------------------------------------------------------- 3. 道中の出来事は、出来事の名前から
  const R = (kind, text, shown) => ({ kind, text: text || "", shown: shown !== false });
  const cases = [
    // 旅立ち：▶ 向かう → 道中の一行 → 出来事の名前 → 本文
    [[R("you", "▶ 聖都へ向かう"), R("road", "三日目の昼。街道を進む……"), R("title", "独り言"), R("line", "半日、誰とも……")], 2],
    // 先へ進む（あなたの行は頭の札）：道中の一行 → 出来事の名前
    [[R("road", "五日目の朝。"), R("title", "道端の祠"), R("line", "膝の高さほどの……")], 1],
    // 一行ずつ出す途中：出来事の名前はまだ出ていない → まだ頁を改めない
    [[R("you", "▶ 先へ進む"), R("road", "五日目の朝。"), R("title", "道端の祠", false), R("line", "…", false)], -1],
    // 襲撃（戦闘の見出し）は改めない（幕が出る）
    [[R("road", "九日目の朝。"), R("line", "旅を続けるうちに"), R("title", "戦闘")], -1],
    // 着いたとき（着く前の印と町の見出し）は改めない
    [[R("you", "▶ 先へ進む"), R("arrive", "道の先に、聖都が見えてきた……"), R("place", "聖都エルヴィナ"), R("line", "十五日歩いた足で……")], -1],
    // 道中でない出来事（町の中など）は今のまま
    [[R("you", "▶ 町を歩く"), R("title", "迷子"), R("line", "…")], -1],
    // 道中の一行より前の見出し（前の出来事）は数えない。いちばん新しい出来事から
    [[R("title", "前の出来事"), R("line", "…"), R("road", "七日目の朝。"), R("title", "分かれ道"), R("line", "道が二つに……")], 3],
  ];
  cases.forEach(([rows, want], i) => {
    const got = u42.eventStart(rows);
    if (got !== want) fail(`道中の出来事の頁の頭が違う（例 ${i + 1}：${got}。正しくは ${want}）`);
  });
  if (u42.eventStart([]) !== -1 || u42.eventStart(null) !== -1) fail("本文が空のときに頁を改める");
  // 隠すだけ（記録・ログの窓は消さない）：U19 と同じ印で隠す
  const flow = src("ui/zzzzzz_zz_u42_flow.js");
  if (!/classList\.add\("u19gone"\)/.test(flow) || /\.remove\(\)|S\.log\s*=|S\.log\.splice/.test(flow)) fail("道中の出来事の頁替えで、行を隠さず消している・記録を書き換えている");
};
