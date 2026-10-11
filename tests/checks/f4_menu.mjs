// F4：戦闘の手を 6 つの見出し（攻撃・防御・戦技・魔法・その他・道具。防御は F9）にまとめる（engine/zzzzzzzzzzzzzz_f4_menu.js）
// - どの職業・どの手番でも、すべての手が 5 つの見出しのどれかの組（cat）に入る。見出しは決まった順で、同じ見出しは一度だけ（作戦・仲間への指示はその他の小見出し）
// - 中身の無い見出しは出ない。戦技は技を持つときだけ、魔法は術があるときだけ
// - 手の振り分け：ふつうの攻撃は攻撃、防御（古い躱すも）は防御、気力の技は戦技、術は魔法、逃げる・話すはその他、持ち物と目つぶしは道具
// - 「誰に使う？」（B5 の相手選び）の間はまとめない
// - 画面のまとめ方（u13_menu.js）：見出しの札は 5 つの順。仲間がいて組が見出しより多くても、まとめた組の数が描いた組の数と合う（合わないと見出しが出ない）
// - 「前と同じ」：前の手番の手が今も選べれば返す。作戦・指示（手番が進まない）は数えない
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { if (bad < 30) fail0("F4 戦闘の見出し：" + m); bad++; };
  const G = loadEngine();
  const D = G.data;
  const F4 = G.f4;
  if (!F4 || !F4.arrange || !F4.catOf) { fail("G.f4 が無い"); return; }
  const CATS = ["attack", "guard", "tech", "magic", "misc", "item"];

  const begin = (seed, cls, comps) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 99; });
    G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999;
    if (comps) { S.companions = comps; G.b5Party && G.b5Party(S); }
    return S;
  };
  const mk = (i, extra) => Object.assign({ id: "f4c" + i, name: `仲間${"アイ"[i]}`, cls: "傭兵", power: 60, dmg: 2, desc: "無口", trait: "loyal", bond: 70 }, extra || {});

  // 一つの手番の組を確かめる
  const look = (where) => {
    const gs = G.actions().filter((g) => g.list && g.list.length);
    if (gs.some((g) => /誰に使う？$/.test(g.title || "") || g.list.some((a) => a.id === "b5:cancel"))) return gs; // 相手選び
    let last = -1;
    const heads = new Set();
    gs.forEach((g) => {
      const at = CATS.indexOf(g.cat);
      if (at < 0) { fail(`${where}：見出しの無い組「${g.title}」（${g.list.map((a) => a.id)}）`); return; }
      if (at < last) fail(`${where}：見出しの順が崩れる（${gs.map((x) => x.cat)}）`);
      last = at;
      if (!g.sub) {
        if (heads.has(g.cat)) fail(`${where}：見出し ${g.cat} が二度出る`);
        heads.add(g.cat);
        if (g.title.indexOf(F4.NAME[g.cat]) !== 0) fail(`${where}：見出しの名前が違う（${g.cat}・${g.title}）`);
      } else if (g.cat !== "misc" || !g.list.every((a) => /^f3:/.test(a.id))) fail(`${where}：小見出しが作戦・指示でない（${g.title}）`);
      if (g.sub && !heads.has("misc") && !gs.some((x) => x.cat === "misc" && !x.sub)) { /* 守る・逃げるが無い場面でも小見出しだけは出てよい */ }
      g.list.forEach((a) => {
        const id = a.id;
        if (/^cb:attack$/.test(id) && g.cat !== "attack") fail(`${where}：${id} が攻撃に無い`);
        if (/^cb:k1:/.test(id) && g.cat !== "tech") fail(`${where}：${id} が戦技に無い`);
        if (/^cb:item:/.test(id) && g.cat !== "item") fail(`${where}：${id} が道具に無い`);
        if (/^cb:guard$/.test(id) && g.cat !== "guard") fail(`${where}：${id} が防御に無い`);
        if (/^cb:flee$/.test(id) && g.cat !== "misc") fail(`${where}：${id} がその他に無い`);
        const m = id.match(/^cb:([^:]+)/);
        if (m && D.SPELLS && D.SPELLS[m[1]] && g.cat !== "magic") fail(`${where}：術 ${id} が魔法に無い`);
      });
    });
    return gs;
  };

  // ---------------------------------------------------------------- どの職業・どの手番でも
  let turns = 0, seenCats = new Set();
  Object.keys(D.CLASSES).forEach((cls, ci) => {
    for (let r = 0; r < 2; r++) {
      const S = begin(100 + ci * 7 + r, cls, r ? [mk(0), mk(1, { heal: true, cls: "僧侶" })] : null);
      G.give("herb", 2); G.give("potion", 1);
      G.startCombat(["goblin", "orc"], {});
      for (let i = 0; i < 14 && S.combat && !S.over; i++) {
        const gs = look(`${cls}・${i} 手番目`);
        turns++;
        gs.forEach((g) => g.cat && seenCats.add(g.cat));
        const all = gs.flatMap((g) => g.list).filter((a) => !a.disabled);
        if (!all.length) break;
        const a = all[Math.floor(G.rand() * all.length)];
        G.act(a.id);
      }
    }
  });
  for (const c of ["attack", "misc", "item"]) if (!seenCats.has(c)) fail(`見出し ${F4.NAME[c]} が一度も出ない`);

  // ---------------------------------------------------------------- 中身の無い見出しは出ない
  {
    const S = begin(201, "merc");
    S.inv = {};
    S.spells = [];
    S.skills = [];
    G.startCombat(["goblin"], {});
    const gs = look("持ち物なし");
    if (gs.some((g) => g.cat === "item" && !g.list.some((a) => /^cb:item:/.test(a.id)) && !g.list.length)) fail("中身の無い道具の見出しが出る");
    if (gs.some((g) => !g.list.length)) fail("中身の無い見出しが出る");
    if (gs.some((g) => g.cat === "tech")) fail("技を持たないのに戦技の見出しが出る");
    const mag = gs.find((g) => g.cat === "magic");
    if (mag && !mag.list.length) fail("術が無いのに魔法の見出しが出る");
  }
  // 技を持てば戦技が出る
  if (G.k1 && D.SKILLS) {
    const art = Object.keys(D.SKILLS).find((id) => G.k1.isArt && G.k1.isArt(id));
    if (art) {
      const S = begin(202, "merc");
      S.skills = [art];
      S.ki = S.maxKi = 99;
      G.startCombat(["goblin"], {});
      const gs = look("技あり");
      const t = gs.find((g) => g.cat === "tech");
      if (!t || !t.list.some((a) => /^cb:k1:/.test(a.id))) fail(`技（${art}）を持つのに戦技の見出しに出ない`);
    }
  }

  // ---------------------------------------------------------------- 振り分け（id から）
  const want = { "cb:attack": "attack", "cb:k1:k1_x": "tech", "cb:item:herb": "item", "b5:pick:item:herb": "item", "cb:f1throw": "item", "cb:guard": "guard", "cb:f1dodge": "guard", "cb:flee": "misc", "cb:talk": "misc", "cb:pray": "misc" };
  const sp = Object.keys(D.SPELLS || {})[0];
  if (sp) want["cb:" + sp] = "magic";
  for (const [id, c] of Object.entries(want)) if (F4.catOf(id, "") !== c) fail(`${id} の見出しが ${F4.catOf(id, "")}（${c} のはず）`);
  if (F4.catOf("cb:zzz", "道具") !== "item" || F4.catOf("cb:zzz", "なにか") !== "misc") fail("知らない手が元の組の見出しで振り分けられない（無ければその他）");
  // 知らない組の手も、どれかの見出しに入る（こぼれない）
  {
    const out = F4.arrange([{ title: "新しい組", list: [{ id: "cb:new1", label: "a" }] }, { title: "攻撃", list: [{ id: "cb:attack", label: "b" }] }, { title: "空", list: [] }]);
    const ids = out.flatMap((g) => g.list.map((a) => a.id));
    if (ids.join() !== "cb:attack,cb:new1" || out.some((g) => !CATS.includes(g.cat))) fail(`まとめると手がこぼれる・順が違う（${ids}）`);
  }
  // 相手選びの間はまとめない
  {
    const ask = [{ title: "薬草を誰に使う？", list: [{ id: "cb:item:herb:x", label: "x" }, { id: "b5:cancel", label: "やめる" }] }];
    if (F4.arrange(ask) !== ask) fail("「誰に使う？」の間にまとめる");
  }

  // ---------------------------------------------------------------- 画面のまとめ方（DOM を使わない部分）
  {
    const ctx = vm.createContext({ console, G, globalThis: { G } });
    vm.runInContext(readFileSync(new URL("../../src/ui/u13_menu.js", import.meta.url), "utf8"), ctx, { filename: "ui/u13_menu.js" });
    const u = G.u13;
    const S = begin(204, "merc", [mk(0), mk(1, { heal: true, cls: "僧侶" })]);
    G.give("herb", 1);
    G.startCombat(["goblin", "orc"], {});
    const gs = G.actions().filter((g) => g.list.length);
    const p = u && u.plan(gs, S);
    if (!p || p.kind !== "combat" || !u.groupCount) fail("画面が戦闘の手を見出しにまとめない");
    else {
      if (u.groupCount(p) !== gs.length) fail(`仲間がいると、まとめた組の数（${u.groupCount(p)}）が描く組の数（${gs.length}）と合わない（見出しが出ない）`);
      const labels = p.drawers.map((d) => d.label);
      const order = CATS.map((c) => F4.NAME[c]).filter((l) => labels.includes(l));
      if (labels.join() !== order.join()) fail(`見出しの札の順が違う（${labels}）`);
      const misc = p.drawers.find((d) => d.cat === "misc");
      if (!misc || misc.groups.length < 2 || !misc.ids.includes("f3:tac:shield")) fail("作戦・仲間への指示が「その他」の見出しに入らない");
    }
  }

  // ---------------------------------------------------------------- 前と同じ
  {
    const S = begin(203, "merc", [mk(0)]);
    G.startCombat(["orc"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 500;
    if (F4.lastAction(S)) fail("まだ何もしていないのに「前と同じ」がある");
    G.act("cb:guard");
    const a = F4.lastAction(S);
    if (!a || a.id !== "cb:guard") fail(`防御したあと「前と同じ」が防御にならない（${a && a.id}）`);
    G.act("f3:tac:shield");
    const b = F4.lastAction(S);
    if (!b || b.id !== "cb:guard") fail("作戦を変えると「前と同じ」が変わる");
    const save = JSON.parse(JSON.stringify(S));
    delete save.combat.f4last;
    G.S = save;
    if (F4.lastAction(save) !== null) fail("古いセーブ（f4last が無い）で「前と同じ」が出る");
  }

  if (!bad) ok(`F4 戦闘の見出し（${turns} 手番。どの手も 5 つの見出しに入り、順は 攻撃・戦技・魔法・その他・道具。空の見出しは出ない・前と同じ）`);
};
