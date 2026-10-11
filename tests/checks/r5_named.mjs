// R5：立ち絵が本文と合う（src/data/r5_named.js・src/engine/zzzzzzzzzzzzzzz_r5_named.js・src/ui/v4_assets.js）
// - 名のある人は、専用の絵があればそれ、無ければ絵なし（型の絵で代用しない）。シグルンの場面に「冒険者」の型の絵・札が出ない
// - 表の人の出来事・seed がある。出来事の本文に名乗る・名前で呼ばれる人がいて、who が型だけなら漏れ（本文から名前を探す）
// - who.name が名前で終わる人（「写し場の古株ヤン」）は名のある人。役目だけの呼び名（「量り売りの本屋の女主人」）は型の絵
// - 名もない人：who に年齢があれば、年頃の合う型だけ（41 歳に 20 歳の型を出さない）。型の絵の年頃の表が docs/art/portraits.json と合う
// - 仲間になる名のある人（シグルン・ロデリク・ケイル）も型の絵を使わない
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import { redrawKeys } from "../../tools/assets.mjs";

export default ({ G, fail, ok }) => {
  const D = G.data;
  const vmc = vm.createContext({ console, G, Image: class { addEventListener() {} } });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  const errs = [];
  const F = (m) => { errs.push(m); fail("R5 " + m); };
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  // 画像がすべてあるふり（型の絵も、名のある人の絵も）。名のある人の絵の鍵が型の名前にならないか、で確かめる
  // 型の絵は一覧（docs/art/portraits.json）にあるものだけ。名のある人の絵は、どの id でもあるふり
  const json = JSON.parse(readFileSync(new URL("../../docs/art/portraits.json", import.meta.url), "utf8"));
  // 「まだ描いていない」型（R5b）は一覧にあってもファイルが無いので、ファイルのあるものだけ
  const redrawn = redrawKeys(); // 描き直し待ちの絵（R5c）は描いていないのと同じ
  const kinds = new Set(json.portraits.filter((p) => p.group === "people" && existsSync(new URL("../../" + p.file, import.meta.url)) && !redrawn.has("portraits/" + p.id)).map((p) => p.id));
  const all = (only) => { G.ASSETS = new Proxy({}, { get: (t, k) => { if (typeof k !== "string" || !k.startsWith("portraits/")) return undefined; const id = k.slice(10); return (/^kind_/.test(id) ? kinds.has(id) : true) && (!only || only(id)) ? "x.webp" : undefined; } }); };

  // ---------------------------------------------------------------- 表
  const R = D.R5_NAMED || {};
  if (!R.sigrun) F("r5_named.js にシグルンがいない");
  for (const [id, p] of Object.entries(R)) {
    if (!p.name || !p.role) F(`r5_named.js の ${id} に名前か肩書きが無い`);
    if (!/^[a-z][a-z0-9_]*$/.test(id)) F(`r5_named.js の id ${id} が英小文字でない（絵のファイル名になる）`);
    for (const e of p.events || []) {
      const x = ev(e);
      if (!x) { F(`r5_named.js の ${id} の出来事 ${e} が無い`); continue; }
      const w = G.eventWho(x);
      if (!w || w.kind === "foe") F(`r5_named.js の ${id} の出来事 ${e} に人の who が無い`);
      else if (!String(x.text || "").includes(p.name) && !JSON.stringify(x.choices || []).includes(p.name)) F(`r5_named.js の ${id} の出来事 ${e} の本文に「${p.name}」が無い`);
    }
    for (const s of p.seeds || []) if (!D.EVENTS.some((x) => { const w = G.eventWho(x); return w && w.seed === s; })) F(`r5_named.js の ${id} の seed ${s} の出来事が無い`);
    if (!(p.events || []).length && !(p.seeds || []).length) F(`r5_named.js の ${id} に出来事も seed も無い`);
  }

  // ---------------------------------------------------------------- シグルン（持ち主の見つけた場面）
  all();
  const sig = G.eventWho(ev("f2_majin_2"));
  const key = G.v4PortraitKey(sig);
  if (key !== "sigrun") F(`シグルンの場面の絵の鍵が ${key}（専用の絵 sigrun があればそれ）`);
  all((k) => !/^(sigrun)$/.test(k));
  if (G.v4PortraitKey(sig) !== null) F(`シグルンの専用の絵が無いのに、型の絵 ${G.v4PortraitKey(sig)} が出る`);
  const tag = G.whoTag(sig, null, "f2_majin_2");
  if (!tag || tag.name !== "シグルン" || /冒険者/.test(tag.label)) F(`シグルンの札が「${tag && tag.label}」（名前にする）`);
  all((k) => /^kind_/.test(k)); // 型の絵だけある
  for (const id of ["sigrun", "roderick"]) {
    const m = D.F2_MATES && D.F2_MATES[id];
    if (m && G.v4PortraitKey(G.companionWho(m))) F(`仲間になった ${m.name} に型の絵 ${G.v4PortraitKey(G.companionWho(m))} が出る`);
  }
  if (G.v4PortraitKey(G.companionWho({ name: "傭兵のケイル", cls: "傭兵" }))) F("仲間になったケイルに型の絵が出る");

  // ---------------------------------------------------------------- すべての出来事：名のある人に型の絵を出さない・本文の名前の見落とし
  all((k) => /^kind_/.test(k)); // 型の絵だけある（名のある人の絵は無い）
  const PLACE = Object.values(D.LOCS).map((l) => l.name);
  // 名前でない片仮名（品物・種族・言葉）
  const WORDS = new Set("パン エルフ ギルド インク ガラス ペン ゴブリン ナイフ シャベル グラス リュート スリ モテ オーク ギョ レース カウンター ノミ ランタン スープ ポケット カモメ ブーツ ビーバー シャツ タダ ツケ フォン".split(" "));
  // 本文の片仮名の名前が who の人を指していない出来事（名前は出てくるが、話している相手は別の名の無い人）
  const OTHER = new Set(["w1_fingerbone", "u3_notice", "w3_o_k_debt2", "w3_t_whistle3", "w6g_bless", "w7b_lum_mite", "v2_notari", "f2_king_2", "f2_king_4", "f2_rich_1", "f2_rich_4"]);
  let namedN = 0, kindN = 0;
  const miss = [];
  for (const x of D.EVENTS) {
    const w = G.eventWho(x);
    if (!w || w.kind === "foe" || w.kind === "hero") continue;
    const k = G.v4PortraitKey(w);
    const isNamed = G.r5.named(w, x.id);
    const nameOnly = isNamed && G.r5.artId(w, x.id) === ""; // R5b：名前だけの人（id の無い依頼人）は汎用のモブ絵（型）を使い回す
    if (isNamed && !nameOnly) { namedN++; if (k && /^kind_/.test(k)) F(`名のある人の出来事 ${x.id} に型の絵 ${k} が出る`); }
    else if (nameOnly) { namedN++; if (k && !/^kind_/.test(k)) F(`名前だけの人の出来事 ${x.id} に、型でない絵 ${k} が出る`); if (k && Number(w.age) > 0 && !G.v4AgeFits(G.v4AgeOf(w), k)) F(`名前だけの人の出来事 ${x.id}（${w.age} 歳）に年頃の合わない型 ${k} が出る`); }
    else {
      kindN++;
      if (k && Number(w.age) > 0 && !G.v4AgeFits(G.v4AgeOf(w), k)) F(`出来事 ${x.id}（${w.age} 歳）に年頃の合わない型 ${k} が出る`);
      if (w.name && G.r5.properName(w.name)) F(`出来事 ${x.id} の who.name「${w.name}」は名前なのに名のある人にならない`);
      if (OTHER.has(x.id) || !String(w.seed || "").startsWith("ev:")) continue;
      const t = String(x.text || "");
      const names = [...new Set(t.match(/[ァ-ヶ][ァ-ヶー]+/g) || [])].filter((n) => !WORDS.has(n) && !PLACE.some((p) => p.includes(n)));
      if (names.length) miss.push(`${x.id}（${names.join("・")}）`);
    }
  }
  if (miss.length) F(`本文に名前があるのに、who が型だけの出来事（r5_named.js に足すか、tests/checks/r5_named.mjs の OTHER に足す）：${miss.join("、")}`);
  // 役目だけの呼び名・名前の呼び名
  for (const [n, want] of [["写し場の古株ヤン", true], ["狩人頭のオルガ婆", true], ["サンテール卿", true], ["山羊飼いのヘルガ婆さん", true], ["量り売りの本屋の女主人", false], ["アデルの母さん", false], ["オトセの母", false], ["谷の炭焼きの爺さん", false]])
    if (G.r5.properName(n) !== want) F(`「${n}」を${want ? "名前" : "役目だけの呼び名"}と見ない`);

  // ---------------------------------------------------------------- 型の絵の年頃
  for (const p of json.portraits.filter((p) => p.group === "people")) {
    const m = /(\d+) years old/.exec(p.identity || p.tags || "");
    if (!m) F(`portraits.json の ${p.id} に年齢（NN years old）が無い`);
    else if (G.V4_KIND_AGE[p.id] !== +m[1]) F(`v4_assets.js の型の年頃 ${p.id}=${G.V4_KIND_AGE[p.id]} が portraits.json の ${m[1]} と違う`);
  }
  for (const k of Object.keys(G.V4_KIND_AGE)) if (!json.portraits.some((p) => p.id === k)) F(`v4_assets.js の型の年頃に、一覧に無い ${k} がある`);
  const pick = (w) => G.v4PortraitKey(Object.assign({ seed: "r5:test" }, w));
  if (pick({ kind: "adventurer", sex: "女", age: 41 }) !== "kind_adventurer_f") F(`41 歳の名もない女の冒険者の型が ${pick({ kind: "adventurer", sex: "女", age: 41 })}（30 歳の型）`);
  if (/_b$/.test(pick({ kind: "adventurer", sex: "女", age: 41, seed: "x1" }) || "") || /_b$/.test(pick({ kind: "adventurer", sex: "女", age: 41, seed: "x2" }) || "")) F("41 歳の人に 20 歳の二枚目の型が出る");
  if (pick({ kind: "priest", sex: "男", age: 50 }) !== (kinds.has("kind_priest_m_c") ? "kind_priest_m_c" : null)) F("50 歳の名もない神官に、壮年の三枚目の型（まだ無ければ絵なし）が出ない");
  kinds.add("kind_priest_m_c"); // 描いたら壮年の型が出る
  if (pick({ kind: "priest", sex: "男", age: 50 }) !== "kind_priest_m_c") F("壮年の神官の三枚目の型 kind_priest_m_c があるのに使われない");
  if (pick({ kind: "priest", sex: "男", age: 22 }) === "kind_priest_m_c") F("22 歳の神官に壮年の三枚目の型が出る");
  if (pick({ kind: "mage", sex: "女", age: 140 }) !== "kind_mage_f" && pick({ kind: "mage", sex: "女", age: 140 }) !== "kind_mage_f_b") F(`140 歳（エルフ）の魔法使いが老人の型 ${pick({ kind: "mage", sex: "女", age: 140 })} になる（エルフは年齢で型を選ばない）`);
  kinds.delete("kind_priest_m_c");
  if (pick({ kind: "guard", sex: "男", age: 72 }) !== "kind_elder_m") F("72 歳の衛兵が老人の型にならない");
  if (pick({ kind: "villager", sex: "男", age: 11 }) !== (kinds.has("kind_child_m") ? "kind_child_m" : null)) F("11 歳の村人が子どもの型にならない（描き直し待ちなら絵なし）");
  G.ASSETS = undefined;
  if (!errs.length) ok(`R5 名のある人：表 ${Object.keys(R).length} 人、名のある人の出来事 ${namedN}・名もない人の出来事 ${kindN}。名のある人に型の絵は出ない・年頃の合わない型は出ない`);
};
