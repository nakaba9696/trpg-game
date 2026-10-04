// C10：自由入力をやめ、状態で選択肢が増える
// - 入力欄・「行動」ボタン・GM（parser.js・gm.js・G.parse・G.gmApply）が無い。古いセーブに GM の項目があっても動く
// - 罪が濃い／清い／名声が高い／無名／手配中／職業／仲間で、それぞれ出る選択肢が違う。条件を満たさないと出さない
// - 足した選択肢がすべて壊れていない（選べて、結果が当てはまり、文に内部の数が無い）。出来事 150 件以上に足してある
// - 町の施設の「あなたなら」の行動（一日に一度）。善い行い S.virtue が増える
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { listFiles } from "../../tools/files.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const C = G.c10;
  if (!C) { fail("G.c10 が無い"); return; }

  // ---------------------------------------------------------------- 自由入力と GM が無い
  const html = readFileSync(path.join(root, "src/index.html"), "utf8");
  if (/id="free"|id="freeBtn"|id="freeHint"|id="act"/.test(html)) fail("index.html に自由入力の欄が残っている");
  if (/自由に行動を書く/.test(html)) fail("index.html に入力の例の文が残っている");
  const ui = readFileSync(path.join(root, "src/ui/ui.js"), "utf8");
  if (/G\.parse|gmPrompt|gmApply|askGM|GM に任せる/.test(ui)) fail("ui.js に自由入力・GM の処理が残っている");
  const mainJs = readFileSync(path.join(root, "src/main.js"), "utf8");
  if (/use\("sample"\)|main\.sample/.test(mainJs)) fail("main.js が Claude（sample）を使おうとしている");
  for (const f of ["src/engine/parser.js", "src/engine/gm.js"]) if (existsSync(path.join(root, f))) fail(`${f} が残っている`);
  const files = listFiles(path.join(root, "src"));
  if ([...files.engine, ...files.ui].some((f) => /parser\.js|engine\/gm\.js/.test(f))) fail("parser.js・gm.js を読みこもうとしている");
  if (G.parse || G.gmApply || G.gmPrompt) fail("G.parse・G.gmApply・G.gmPrompt が残っている");
  const claudeMd = readFileSync(path.join(root, "CLAUDE.md"), "utf8");
  if (/GM に任せる/.test(claudeMd)) fail("CLAUDE.md に「GM に任せる」の説明が残っている");
  const dist = path.join(root, "dist/site/index.html");
  if (existsSync(dist) && /freeBtn|自由に行動を書く/.test(readFileSync(dist, "utf8"))) fail("組み立てたページに自由入力の欄が残っている（node tools/build.mjs のし直し？）");

  // ---------------------------------------------------------------- 遊びの準備
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
  const start = (cls = "merc", seed = 7) => {
    G.rand = seeded(seed);
    G.newGame({ cls, stats: { ...stats }, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.fame = 40; S.gold = 500; S.sin = 0; S.virtue = 0; S.companions = []; S.title = "";
    return S;
  };
  // 国のある町（手配・評判を試す）
  const townId = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && (D.LOCS[id].fac || []).includes("tavern") && C.nation({ loc: id }));
  if (!townId) { fail("国のある、酒場のある町が見つからない"); return; }
  const SETUP = {
    sinful: (S) => { S.sin = 30; },
    pure: (S) => { S.virtue = 10; S.sin = 0; },
    famous: (S) => { S.fame = 200; },
    hero: (S) => { S.fame = 400; },
    unknown: (S) => { S.fame = 0; },
    wanted: (S) => { S.loc = townId; const n = C.nation(S); S.repute = { [n]: { rep: 0, inf: 60, wanted: true } }; },
    trusted: (S) => { S.loc = townId; const n = C.nation(S); S.repute = { [n]: { rep: 80, inf: 0, wanted: false } }; },
    infamous: (S) => { S.loc = townId; const n = C.nation(S); S.repute = { [n]: { rep: 0, inf: 20, wanted: false } }; },
    titled: (S) => { S.title = "騎士"; },
  };
  const COMP = {
    fighter: { name: "剣士のハンス", cls: "剣士", power: 50, dmg: 1, desc: "無口" },
    heal: { name: "僧侶のアン", cls: "僧侶", power: 40, dmg: 0, heal: true, desc: "穏やか" },
    magic: { name: "魔法使いのリタ", cls: "魔法使い", power: 40, dmg: 0, fire: true, desc: "早口" },
    rogue: { name: "ならず者のベン", cls: "ならず者", power: 40, dmg: 1, desc: "口が悪い" },
    trade: { name: "商人のゼノ", cls: "商人", power: 30, dmg: 0, desc: "がめつい" },
    scout: { name: "弓使いのイオ", cls: "弓使い", power: 45, dmg: 1, desc: "目がいい" },
  };
  // 状態の種類 → その状態にする（職業は start で選ぶ）
  const prepare = (key) => {
    const m = /^cls:(.+)$/.exec(key);
    const S = start(m ? m[1] : "merc");
    if (SETUP[key]) SETUP[key](S);
    const c = /^comp:(.+)$/.exec(key);
    if (c) S.companions.push({ ...COMP[c[1]] });
    const it = /^item:(.+)$/.exec(key);
    if (it) G.give(it[1], 1);
    return S;
  };
  // 出来事で見えている C10 の選択肢（状態の種類の一覧）
  const shown = (id) => {
    const S = G.S;
    S.mode = "event"; S.event = id; S.combat = null;
    return G.actions().flatMap((g) => g.list).filter((a) => /^ev:/.test(a.id) && a.c10 && !a.locked).map((a) => ({ key: a.c10, label: a.label, sub: a.sub }));
  };

  // ---------------------------------------------------------------- 足した数
  const evs = D.EVENTS.filter((e) => (e.choices || []).some((c) => c.c10));
  const all = evs.flatMap((e) => e.choices.map((c, i) => ({ e, c, i })).filter((x) => x.c.c10));
  if (evs.length < 150) fail(`状態の選択肢を足した出来事が ${evs.length} 件（150 件以上のはず）`);
  const kinds = {};
  all.forEach(({ c }) => { const k = c.c10.split(":")[0]; kinds[k] = (kinds[k] || 0) + 1; });
  for (const k of ["sinful", "pure", "famous", "unknown", "wanted", "trusted", "titled", "cls", "comp", "item"]) if (!kinds[k]) fail(`「${k}」で現れる選択肢が一つも無い`);

  // ---------------------------------------------------------------- 条件を満たさないと出ない
  // 平らな状態：傭兵・名声は中くらい・罪も善行も無い・仲間なし・位なし・手配なし・持ち物は初めの物だけ
  start("merc");
  const flat = (key) => key === "cls:merc" || (/^item:/.test(key) && C.item(G.S, key.slice(5)));
  for (const e of evs) {
    const bad = shown(e.id).filter((x) => !flat(x.key));
    if (bad.length) { fail(`平らな状態なのに出来事 ${e.id} で「${bad[0].label}」（${bad[0].key}）が出る`); break; }
  }

  // ---------------------------------------------------------------- 状態ごとに、出る選択肢が違う
  const SAMPLE = {   // 状態 → それで現れるはずの出来事と選択肢の一部
    sinful: ["slaver", /帳面の汚れ/], pure: ["pickpocket", /名前を呼んで/], famous: ["carriage", /名を叫んで/], unknown: ["tsujigiri", /旅人の顔/],
    wanted: ["fortune", /追っ手/], trusted: ["slaver", /顔なじみの衛兵/], titled: ["duel", /位を示して/], hero: ["duel", /酒の勢い/],
    "cls:thief": ["trap", /仕掛け糸/], "cls:mage": ["spring", /術の言葉/], "cls:priest": ["heretic", /告解/], "cls:samurai": ["tsujigiri", /島の作法/], "cls:merc": ["frontline", /梯子/],
    "comp:heal": ["v1_plague", /病人を回る/], "comp:fighter": ["caravan", /二手に分かれて/], "comp:scout": ["sleeper", /寝息の間合い/], "comp:rogue": ["trap", /先を歩かせる/],
  };
  const seen = {};
  for (const [key, [id, re]] of Object.entries(SAMPLE)) {
    prepare(key);
    const list = shown(id);
    const hit = list.find((x) => re.test(x.label));
    if (!hit) fail(`「${key}」の状態で、出来事 ${id} に ${re} の選択肢が出ない（出たのは ${list.map((x) => x.label).join("・") || "なし"}）`);
    else if (!hit.sub || /\d/.test(hit.sub.split("・")[0])) fail(`「${hit.label}」に、どの状態で現れたかの添え書きが無い（${hit.sub}）`);
    seen[key] = list.map((x) => x.label).sort().join("|");
  }
  // 罪が濃い／清い／名声／手配／職業／仲間で、同じ出来事（喧嘩）の選択肢の並びが違う
  const brawl = {};
  for (const key of ["sinful", "pure", "famous", "wanted", "cls:mage", "comp:fighter"]) { prepare(key); brawl[key] = shown("toll").map((x) => x.label).sort().join("|"); }
  const vals = Object.values(brawl);
  if (new Set(vals).size < 4) fail(`状態を変えても「通行料」の選択肢がほとんど変わらない（${JSON.stringify(brawl)}）`);
  // 状態でだけ起きる出来事（src/data/events_c10.js）は、平らな状態では起きない
  for (const [id, key] of [["c10_grateful", "pure"], ["c10_underworld", "sinful"], ["c10_challenger", "hero"], ["c10_petition", "titled"], ["c10_nobody", "unknown"]]) {
    const e = D.EVENTS.find((x) => x.id === id);
    if (!e) { fail(`出来事 ${id} が無い`); continue; }
    if (e.cond(start())) fail(`平らな状態で ${id} が起きる`);
    if (!e.cond(prepare(key))) fail(`「${key}」の状態で ${id} が起きない`);
  }
  // 清いと罪が濃いは両立しない
  { const S = start(); S.virtue = 10; S.sin = 30; if (C.pure(S) || !C.sinful(S)) fail("罪が濃いのに清いと見なす"); }
  // 手配中に「評判」「悪名」の選択肢は出さない
  { const S = prepare("wanted"); if (C.trusted(S) || C.infamous(S)) fail("手配中なのに、評判・悪名の選択肢も出る"); }

  // ---------------------------------------------------------------- まだ選べない選択肢は、うっすら（押せない）見せて条件を添える
  {
    const S = start("merc");
    S.mode = "event"; S.event = "carriage";
    const list = () => G.actions().flatMap((g) => g.list);
    const locked = list().filter((a) => a.locked);
    const lk = locked.filter((a) => /^c10lock:/.test(a.id));
    if (!lk.length) fail("馬車の出来事で、まだ選べない選択肢がうっすら見えない");
    if (lk.length > C.LOCKED_MAX) fail(`うっすら見せる選択肢が多すぎる（${lk.length}）`);
    if (locked.some((a) => !a.disabled)) fail("まだ選べない選択肢が押せる");
    for (const a of lk) {
      if (!a.sub || /\d/.test(a.sub)) fail(`まだ選べない「${a.label}」に、条件の言葉が無いか数が出ている（${a.sub}）`);
      if (/\{n\}/.test(a.label)) fail(`まだ選べない「${a.label}」に差し込み記号が残っている`);
    }
    // 選べる選択肢の後ろに並ぶ
    const ids = list().map((a) => a.id);
    const lastReal = Math.max(...ids.map((id, k) => (/^ev:/.test(id) ? k : -1)));
    if (lk.some((a) => ids.indexOf(a.id) < lastReal)) fail("まだ選べない選択肢が、選べる選択肢の前に並ぶ");
    // 押しても何も起きない
    const log0 = S.log.length;
    G.act(lk[0].id);
    if (S.mode !== "event" || S.log.length !== log0) fail("まだ選べない選択肢を押すと、何かが起きる");
    // 条件を満たすと、普通の選択肢になる
    S.title = "騎士";
    if (list().some((a) => a.locked && a.c10 === "titled")) fail("位を得ても、位の選択肢がうっすらのまま");
    if (!list().some((a) => /^ev:/.test(a.id) && a.c10 === "titled" && !a.disabled)) fail("位を得ても、位の選択肢が選べない");
    // ほかの職業・手配・悪名・無名（名が知られたあと）の条件は見せない
    for (const e of evs) {
      S.event = e.id; S.mode = "event";
      const bad = list().find((a) => a.locked && /^(cls:|wanted|infamous|unknown)/.test(a.c10 || ""));
      if (bad) { fail(`出来事 ${e.id} で、届かない条件の「${bad.label}」がうっすら見える`); break; }
    }
    // 見せない設定
    C.showLocked = false;
    S.event = "carriage";
    if (list().some((a) => a.locked)) fail("見せない設定でも、うっすらの選択肢が出る");
    C.showLocked = true;
  }

  // ---------------------------------------------------------------- すべての足した選択肢が壊れていない
  const NUM = /名声|悪名|罪の匂い|成功率|善行|\d+\s*[%％]/;
  let n = 0;
  for (const { e, c, i } of all) {
    const label = c.label;
    if (!label || typeof label !== "string") { fail(`${e.id}[${i}]：名前が無い`); continue; }
    for (const o of [c.ok, c.ng]) if (o && NUM.test(o.text || "")) fail(`${e.id}「${label}」：文に内部の数・言葉がある`);
    if (!c.ok || !c.ok.text) fail(`${e.id}「${label}」：結果の文が無い`);
    if (c.stat && !c.ng) fail(`${e.id}「${label}」：判定があるのに失敗の結果が無い`);
    if (c.stat && !D.STATS.includes(c.stat)) fail(`${e.id}「${label}」：判定の能力値が変（${c.stat}）`);
    if (c.diff && D.DIFF[c.diff] === undefined) fail(`${e.id}「${label}」：難易度が変（${c.diff}）`);
    // 状態を満たして実際に選ぶ（成功と失敗の両方）
    for (const seed of [1, 99]) {
      const S = prepare(c.c10);
      const gold0 = S.gold;
      S.mode = "event"; S.event = e.id;
      const a = G.actions().flatMap((g) => g.list).find((x) => x.id === "ev:" + i);
      if (!a) { fail(`${e.id}「${label}」：状態（${c.c10}）を満たしても出ない`); break; }
      G.rand = seeded(seed * 31 + i);
      try { G.act(a.id); } catch (x) { fail(`${e.id}「${label}」：選ぶと例外 ${x.message}`); break; }
      if (!(S.gold >= 0) || !Number.isFinite(S.gold)) fail(`${e.id}「${label}」：所持金が変 ${S.gold}`);
      if (!(S.hp >= 0 && S.hp <= S.maxHp)) fail(`${e.id}「${label}」：HP が範囲外`);
      if (!["explore", "event", "combat", "over", "fac"].includes(S.mode)) fail(`${e.id}「${label}」：mode が変 ${S.mode}`);
      if (S.event === e.id && S.mode === "event" && !c.next) fail(`${e.id}「${label}」：選んでも出来事が終わらない`);
      if (c.cost && S.gold > gold0 + 200) fail(`${e.id}「${label}」：払ったのに大儲け`);
      if (/\{n\}/.test(a.label)) fail(`${e.id}「${label}」：仲間の名前が差し込まれていない`);
      n++;
    }
  }

  // ---------------------------------------------------------------- 町の施設の「あなたなら」
  {
    const S = prepare("sinful");
    S.loc = townId; S.mode = "fac"; S.fac = "tavern";
    const ids = () => G.actions().flatMap((g) => g.list).filter((a) => /^c10f:/.test(a.id));
    const mine = ids().filter((a) => !a.disabled);
    if (!mine.length) fail("罪の匂いが濃いのに、酒場に「あなたなら」の行動が無い");
    else {
      const id = mine[0].id;
      G.rand = seeded(5);
      G.act(id);
      if (G.S.mode !== "fac" && !G.S.over) fail("酒場の「あなたなら」をしたら、酒場から出てしまった");
      const again = ids().find((a) => a.id === id);
      if (!again || !again.disabled) fail("酒場の「あなたなら」が一日に何度もできる");
    }
    const T = start("merc"); T.loc = townId; T.mode = "fac"; T.fac = "tavern";
    if (ids().some((a) => a.c10 !== "cls:merc")) fail("平らな状態なのに、酒場に「あなたなら」の行動が出る");
    // 仲間の名前が差し込まれる
    const U = prepare("comp:fighter"); U.loc = townId; U.mode = "fac"; U.fac = "tavern";
    const f = ids().find((a) => a.c10 === "comp:fighter");
    if (!f || !/ハンス/.test(f.label)) fail("酒場の仲間の行動に、仲間の名前が入らない");
  }

  // ---------------------------------------------------------------- 善い行い（S.virtue）と古いセーブ
  {
    const S = start();
    delete S.virtue;
    S.mode = "event"; S.event = "donation";
    const give = G.actions().flatMap((g) => g.list).find((a) => /寄付/.test(a.label));
    if (!give) fail("募金で「寄付する」が出ない");
    else { G.act(give.id); if (!(S.virtue >= 1)) fail("寄付しても善い行いが増えない"); }
    // 悪行（D.DEEDS）では増えない
    const T = start(); T.mode = "event"; T.event = "fallen";
    const rob = G.actions().flatMap((g) => g.list).find((a) => /身ぐるみ/.test(a.label));
    if (rob) { G.rand = seeded(3); G.act(rob.id); if (T.virtue) fail("身ぐるみを剥いでも善い行いが増える"); }
    // 古いセーブ：virtue・c10・repute が無く、GM の項目（gmUses・gmtag の記録）が残っている
    const O = start();
    delete O.virtue; delete O.c10; delete O.repute; O.gmUses = 4; O.log.push({ k: "gmtag", text: "GM の裁定" });
    try {
      for (let k = 0; k < 40 && !O.over; k++) {
        const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
        if (!acts.length) { fail("古いセーブで、できる行動が無い"); break; }
        G.act(acts[Math.floor(G.rand() * acts.length)].id);
      }
    } catch (x) { fail(`古いセーブ（GM の項目つき）で例外 ${x.message}`); }
  }

  ok(`状態の選択肢（出来事 ${evs.length} 件・選択肢 ${all.length} 個：${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join("・")}。選んで確かめた ${n} 回。自由入力・GM なし）`);
};
