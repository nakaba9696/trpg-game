// U21：PC の一画面の配置（src/ui/zzzzz_u21_side.js・.css）。DOM なしで確かめられる範囲
// - 配置（G.u21.layout）：1280×720・1366×768・1920×1080 などで、本文の欄（左下）と右の列が画面に収まり、重ならない。
//   本文の欄は左上の札の下まで。1 行は 28〜40 字。立ち絵の場所は右の列に掛からない。戦闘の配置は V9 のまま
// - まとめ方（G.u21.plan）：右の列では、選択肢が少し少なくても組にまとめる。組からこぼれる選択肢は無い。出来事・戦闘はまとめない
//   右の列を出していないとき（スマホ・下の帯）は、U13 のまとめ方のまま
// - 開いた組の並べ方（G.u21.afterOrder）：札の後ろの組を元の順に、開いた組かどうか
// - 見た目（.css）は body.u21pc（PC で右の列を出しているとき）の中だけに効く（スマホは今のまま）
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U21：" + m); };
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const D = G.data;
  const vmc = vm.createContext({ console, G, globalThis: { G }, Image: class { addEventListener() {} } });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v5_stand.js", "v9_pc.js", "u13_menu.js", "zf2_opening.js", "zzzzz_u21_side.js"]) vm.runInContext(src("ui/" + f), vmc, { filename: "ui/" + f });
  const u = G.u21, v9 = G.v9, u13 = G.u13;
  for (const k of ["layout", "plan", "afterOrder", "v9Layout", "placeCast", "v9Place"]) if (!u || typeof u[k] !== "function") return fail(`G.u21.${k} が無い`);

  // ---------------------------------------------------------------- 配置
  const inside = (r, vw, vh) => r && r.x >= 0 && r.y >= 0 && r.x + r.w <= vw + 0.5 && r.y + r.h <= vh + 0.5 && r.w > 0 && r.h > 0;
  for (const [vw, vh] of [[1280, 720], [1366, 768], [1920, 1080], [1440, 900], [1280, 800], [1024, 768], [1000, 560], [2560, 1440]]) {
    const L = v9.layout(vw, vh, false);
    if (!L.side21 || !L.side) { fail(`${vw}×${vh}：PC の配置が右の列の形になっていない`); continue; }
    const at = `${vw}×${vh}`;
    if (!inside(L.side, vw, vh)) fail(`${at}：右の列が画面からはみ出す`);
    if (!inside(L.tome, vw, vh)) fail(`${at}：本文の欄が画面からはみ出す`);
    if (L.tome.x + L.tome.w > L.side.x - 8) fail(`${at}：本文の欄と右の列が重なる`);
    if (L.side.y < L.head || L.tome.y < L.head + u.TOP_GAP - 1) fail(`${at}：見出しの帯・左上の札に掛かる`);
    if (L.tome.min > L.tome.h || L.tome.min < Math.min(u.TMIN_PX, L.tome.h)) fail(`${at}：本文の欄の低いときの高さがおかしい（${L.tome.min}／${L.tome.h}）`);
    if (L.side.w < 340) fail(`${at}：右の列が狭い（${L.side.w}px）`);
    const per = (L.tome.w - v9.PAD * 2 - 10) / L.fs;
    if (per < 28 || per > 40.5) fail(`${at}：本文の 1 行が ${per.toFixed(1)} 字`);
    if (L.fs < 16) fail(`${at}：本文の字が小さい`);
    if (L.cast.x + L.cast.w > L.side.x || L.cast.h <= 0) fail(`${at}：立ち絵の場所が右の列に掛かるか、無い`);
    // U23：話している人の立ち絵は、右の列を入れる前（V9 の配置）より小さくしない。ぼかさずに見える真ん中は、本文の欄と右の列のあいだに入る
    const sp = [{ role: "speaker" }], ally = [{ role: "speaker" }, { role: "ally" }];
    const was = u.v9Place(u.v9Layout(vw, vh, false), sp)[0];
    const now = v9.placeCast(L, sp)[0];
    if (!now || now.h < was.h) fail(`${at}：立ち絵が前（${was.h}px）より小さい（${now ? now.h : 0}px）`);
    else {
      const core = now.h * u.CORE / 2;
      if (vw >= 1280 && (now.x - core < L.stand.x0 - 2 || now.x + core > L.stand.x1 + 2)) fail(`${at}：立ち絵の真ん中が本文の欄か右の列に隠れる`);
      if (now.h > L.cast.h + 0.5) fail(`${at}：立ち絵が見出しの帯に掛かる`);
    }
    if (v9.placeCast(L, ally).length !== 2 || !v9.placeCast(L, ally)[0].front) fail(`${at}：話している人が前に出ない`);
    const C = v9.layout(vw, vh, true), B = u.v9Layout(vw, vh, true);
    if (JSON.stringify(C) !== JSON.stringify(B)) fail(`${at}：戦闘の配置が V9 のままでない`);
  }

  // ---------------------------------------------------------------- まとめ方
  const base = u.u13Plan;
  if (u.active) fail("テストで右の列を出していることになっている");
  let towns = 0, grouped = 0;
  for (let s = 0; s < 8; s++) {
    G.rand = seeded(2100 + s);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 60; });
    G.newGame({ cls: Object.keys(D.CLASSES)[s % Object.keys(D.CLASSES).length], stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
    G.S.gold = 2000;
    for (let i = 0; i < 300 && !G.S.over; i++) {
      const gs = G.actions();
      const where = `${G.S.mode}:${G.S.loc}${G.S.fac ? ":" + G.S.fac : ""}`;
      // 右の列を出していないときは U13 のまま
      if (JSON.stringify(u13.plan(gs, G.S)) !== JSON.stringify(base(gs, G.S))) fail(`${where}：右の列を出していないのに、まとめ方が U13 と違う`);
      const plan = u.plan(gs, G.S);
      if (G.S.mode === "event" && plan) fail(`${where}：出来事の選択肢を組に隠している`);
      if (G.S.combat && plan && plan.kind !== "combat") fail(`${where}：戦闘を町と同じ形でまとめている`);
      if (G.S.mode === "explore" && !G.S.combat) {
        const items = gs.reduce((n, g) => n + g.list.length, 0);
        if (G.loc().type === "town") towns++;
        if (plan) {
          grouped++;
          const n = gs.filter((g) => g.list.length).length;
          const idx = [...plan.tabs.flatMap((t) => t.groups), ...plan.top, ...plan.bottom];
          if (idx.length !== n || new Set(idx).size !== n) fail(`${where}：組からこぼれる・重なる選択肢がある`);
          // 開いた組の並べ方：札の後ろの組は元の順で、開いた組がすべて入る
          for (const t of plan.tabs) {
            const o = u.afterOrder(plan, t.key);
            const opened = o.filter((x) => x.open).map((x) => x.i);
            if (JSON.stringify(opened) !== JSON.stringify([...t.groups].sort((a, b) => a - b))) fail(`${where}：開いた組「${t.label}」が札の後ろに並ばない`);
            if (o.some((x, k) => k && o[k - 1].i > x.i)) fail(`${where}：札の後ろの組が元の順でない`);
          }
        } else if (items >= u.MIN_ITEMS) {
          const cats = new Set(gs.filter((g) => g.list.length && !u13.pinned(g)).map((g) => u13.catOf(g)));
          if (cats.size >= 2) fail(`${where}：選択肢 ${items} で分類が ${cats.size} あるのに、右の列で組にまとめない`);
        }
      }
      const acts = gs.flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
    }
  }
  if (!towns || !grouped) fail(`町で組にまとめる場面を通っていない（町 ${towns}・まとめた ${grouped}）`);
  if (u.afterOrder({ tabs: [{ key: "a", groups: [3] }, { key: "b", groups: [1, 4] }], bottom: [2] }, "b").map((x) => x.i + (x.open ? "*" : "")).join(",") !== "1*,2,4*")
    fail("札の後ろの組の並べ方（開いた組と下に出したままの組）が違う");

  // ---------------------------------------------------------------- U23：町の選択肢を細かい組に（PC の右の列だけ）
  {
    let towns = 0;
    for (let k = 0; k < 6; k++) {
      G.rand = seeded(2300 + k);
      G.P = { trophies: {}, graves: [] };
      const stats = {};
      D.STATS.forEach((x) => { stats[x] = 60; });
      G.newGame({ cls: Object.keys(D.CLASSES)[k % Object.keys(D.CLASSES).length], stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
      G.S.gold = 3000;
      for (let i = 0; i < 300 && !G.S.over; i++) {
        const raw = (u.actions0 || G.actions)();
        if (u.isTown(G.S)) {
          towns++;
          const where = `町 ${G.S.loc}`;
          const gs = u.splitTown(raw);
          const ids = (x) => x.flatMap((g) => g.list.map((a) => a.id));
          if (JSON.stringify(ids(gs).slice().sort()) !== JSON.stringify(ids(raw).slice().sort())) fail(`${where}：組を分けたら選択肢が増えた・減った`);
          gs.forEach((g) => { if (!g.title) fail(`${where}：分けた組に見出しが無い`); });
          const plan = u.townPlan(gs, G.S);
          const n = gs.filter((g) => g.list.length).length;
          if (plan) {
            const idx = [...plan.tabs.flatMap((t) => t.groups), ...plan.top];
            if (idx.length !== n || new Set(idx).size !== n) fail(`${where}：組からこぼれる・重なる選択肢がある`);
            plan.tabs.forEach((t) => { if (!u.TOWN_CATS.some((c) => "t:" + c.key === t.key)) fail(`${where}：知らない組 ${t.key}`); });
            const order = plan.tabs.map((t) => u.TOWN_CATS.findIndex((c) => "t:" + c.key === t.key));
            if (order.some((x, j) => j && x < order[j - 1])) fail(`${where}：組の並びが決まった順（施設が上）でない`);
            const fac = plan.tabs.find((t) => t.key === "t:fac");
            if (fac && fac.ids.some((id) => !/^fac:/.test(id))) fail(`${where}：「施設」に施設でない物が入る`);
            const trv = plan.tabs.find((t) => t.key === "t:travel");
            if (trv && trv.ids.some((id) => !/^(travel|sail):/.test(id))) fail(`${where}：「旅立つ」に旅でない物が入る`);
          } else {
            const items = gs.reduce((a, g) => a + g.list.length, 0);
            const cats = new Set(gs.filter((g) => g.list.length && !G.u13.pinned(g)).flatMap((g) => g.list.map(u.townCat)));
            if (items >= u.TOWN_MIN_ITEMS && cats.size >= 2) fail(`${where}：選択肢 ${items}・分類 ${cats.size} なのに組にまとめない`);
          }
        }
        const acts = raw.flatMap((g) => g.list).filter((a) => !a.disabled);
        if (!acts.length) break;
        G.act(acts[Math.floor(G.rand() * acts.length)].id);
      }
    }
    if (!towns) fail("町の場面を通っていない");
    if (u.townCat({ id: "fac:inn" }) !== "fac" || u.townCat({ id: "fac:w9_senate" }) !== "spot" || u.townCat({ id: "walk" }) !== "spot" || u.townCat({ id: "travel:x" }) !== "travel" || u.townCat({ id: "zzz:1" }) !== "misc") fail("町の選択肢の分類の表が違う");
  }

  // ---------------------------------------------------------------- 見た目
  const css = src("ui/zzzzz_u21_side.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const walk = (s) => {
    let depth = 0, sel = "";
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "{") { if (depth === 0) { rules.push(sel.trim()); sel = ""; } depth++; }
      else if (c === "}") depth--;
      else if (depth === 0) sel += c;
    }
  };
  walk(css);
  const inner = [...css.matchAll(/@media[^{]*\{([\s\S]*?\})\s*\}/g)].flatMap((m) => [...m[1].matchAll(/([^{}]+)\{/g)].map((x) => x[1].trim()));
  const sels = [...rules.filter((r) => !/^@/.test(r)), ...inner].flatMap((r) => r.split(",").map((x) => x.trim())).filter(Boolean);
  const loose = sels.filter((x) => !/body[.\w-]*\.u21pc/.test(x) && !/^body\.v9pc\.v9combat /.test(x) && x !== "#u21side" && x !== "body.v9pc");
  if (loose.length) fail(`右の列の見た目が PC の配置の外にも効く：${loose.join("／")}`);
  if (!/body\.u21pc #u21side\s*\{[^}]*display:\s*flex/.test(css) || !/#u21side\s*\{\s*display:\s*none/.test(css)) fail("右の列を PC でだけ出す決まりが無い");
  if (!/\.u21open\s*\{[^}]*overflow-y:\s*auto/.test(css)) fail("開いた組の中だけが流れる決まりが無い");

  if (!bad) ok(`U21：PC の一画面の配置（8 つの大きさ・本文の欄と右の列が収まり重ならない・戦闘は V9 のまま）、右の列のまとめ方（町 ${towns} 手・まとめた ${grouped} 手・出来事と戦闘はまとめない）、見た目は PC の配置の中だけ`);
};
