// R11：R10 のプレイレビュー（docs/review/playreview_2026-10-10.md）のルールの直し
// - 中 5：名のある強敵（D.W8_FOES）は段 1〜4 なら C 級、段 5 以上なら B 級（HP 21 の年経た棘猪が B 級に見えない）
// - 中 7：酒場で教わる技・訓練場の稽古に、使える武器の型が出て、今の武器で使えない技に印（a.off）が付く
// - 中 10：酒場で雇った仲間は日ごとに好感度が下がらない。雇っていない仲間が下がるときは理由が一行出る
// - 低 20：戦闘中の押せない「振り直す」を画面が出さない（エンジンの印は残る）
// - 低 21：好感度の通知の括弧は段の名前だけ（負の数を出さない）
// - 低 29：探索中、傷を負っていれば「薬草を使う（自分に）」が出て、使える
// - 低 30：訓練場の押せない稽古は、理由ごとに一行
// - 低 32：正気 0 から懺悔などで戻っても例外にならない
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("R11 ルール：" + m); };
  const start = (G, cls, seed) => {
    const D = G.data;
    G.rand = seeded(seed || 1);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 14; caps[k] = 60; });
    G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const acts = (G) => G.actions().flatMap((g) => g.list || []);

  // ---------------------------------------------------------------- 中 5：格
  {
    const G = loadEngine();
    const D = G.data;
    if (G.gradeOf("e4_thornboar_x") !== "C") F(`年経た棘猪（段 2・HP 21）が ${G.gradeOf("e4_thornboar_x")} 級（C に）`);
    for (const id of Object.keys(D.W8_FOES || {})) {
      const e = D.ENEMIES[id];
      if (!e) continue;
      const g = G.gradeOf(id);
      if ((e.tier || 1) <= 4 && (e.hp || 0) < 100 && g !== "C") F(`強敵 ${id}（段 ${e.tier}・HP ${e.hp}）が ${g} 級（C に）`);
      if ((e.tier || 1) >= 5 && g !== "B") F(`強敵 ${id}（段 ${e.tier}）が ${g} 級（B に）`);
    }
  }

  // ---------------------------------------------------------------- 中 7・低 30：教わる技・稽古
  {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, "merc", 2);
    const town = (fac) => Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && (D.LOCS[id].fac || []).includes(fac));
    S.weapon = "longsword";
    S.gold = 5000;
    S.loc = town("tavern"); S.mode = "fac"; S.fac = "tavern";
    const a = acts(G).find((x) => x.id === "k1teach:veteran:k1_bodyblow");
    if (!a) F("酒場の老傭兵に「当て身」を教わる選択肢が無い（傭兵）");
    else {
      if (!/拳で使う/.test(a.sub || "")) F(`「当て身」を教わる選択肢に武器の型が無い：${a.sub}`);
      if (!a.off || !/今の武器では使えない/.test(a.sub)) F("長剣を持っているのに「当て身」に使えない印が無い");
    }
    const b = acts(G).find((x) => x.id === "k1teach:veteran:k1_twinslash" || x.id === "k1teach:veteran:" + Object.keys(D.SKILLS).find((k) => (D.SKILLS[k].style || []).includes("剣") && ((D.SKILLS[k].learn || {}).teach || []).includes("veteran")));
    if (b && b.off) F(`剣で使える技（${b.label}）に、長剣を持っていて使えない印が付く`);
    // 訓練場：押せない稽古が同じ理由で二行以上並ばない
    const tr = town("train");
    if (tr) {
      S.loc = tr; S.fac = "train"; S.fame = 0;
      const grp = G.actions().find((g) => /^教官に稽古/.test(g.title || ""));
      if (!grp) F("訓練場に稽古の組が無い");
      else {
        const seen = {};
        grp.list.filter((x) => x.disabled && !/が足りない/.test(x.sub || "")).forEach((x) => { seen[x.sub] = (seen[x.sub] || 0) + 1; });
        const dup = Object.entries(seen).filter(([, n]) => n > 1);
        if (dup.length) F(`訓練場の押せない稽古が同じ理由で並ぶ：${dup.map(([w, n]) => `${w}×${n}`).join("・")}`);
        if (!grp.list.some((x) => /^k1trainlock:/.test(x.id))) console.log("NOTE R11 訓練場：まとめる行が無かった（理由が一つずつ）");
      }
    }
  }

  // ---------------------------------------------------------------- 中 10・低 21：仲間の好感度
  {
    const G = loadEngine();
    const S = start(G, "merc", 3);
    const town = Object.keys(G.data.LOCS).find((id) => G.data.LOCS[id].type === "town");
    S.loc = town; S.mode = "fac"; S.fac = "tavern"; S.gold = 100;
    G.addCompanion({ name: "剣士のテスト", cls: "fighter", power: 30, dmg: [1, 6, 0], desc: "無口な剣士" });
    const hired = S.companions[S.companions.length - 1];
    if (!hired || !hired.hired) F("酒場で雇った仲間に雇った印（c.hired）が無い");
    S.mode = "explore"; S.fac = null;
    G.addCompanion({ name: "旅の連れのテスト", cls: "fighter", power: 30, dmg: [1, 6, 0], desc: "無口な剣士" });
    const free = S.companions[S.companions.length - 1];
    if (free && free.hired) F("酒場の外で加わった仲間に雇った印が付く");
    if (hired && free) {
      const b0 = hired.bond, f0 = free.bond;
      G.m2State(S);
      S.m2.day = S.day;
      S.gold = 100;
      for (let i = 0; i < 6; i++) { S.day += 5; G.endTurn(); }
      if (hired.bond < b0) F(`雇った仲間の好感度が日ごとに下がる（${b0} → ${hired.bond}）`);
      if (!(free.bond < f0)) F(`話しかけない仲間の好感度が下がらない（${f0} → ${free.bond}）`);
      const txt = S.log.map((l) => l.text).join("\n");
      if (!/口をきいてもらえず/.test(txt)) F("好感度が下がった理由が記録に出ない");
      G.m2Bond(free, 3);
      const last = S.log.map((l) => l.text).filter((t) => /の好感度 /.test(t || "")).pop() || "";
      if (/（-?\d/.test(last)) F(`好感度の通知の括弧に数が出る：${last}`);
    }
  }

  // ---------------------------------------------------------------- 低 29：自分に薬草
  {
    const G = loadEngine();
    const S = start(G, "merc", 4);
    S.mode = "explore"; S.fac = null; S.travel = null; S.companions = [];
    S.hp = Math.max(1, Math.floor(S.maxHp / 3));
    S.inv.herb = 1;
    const a = acts(G).find((x) => x.id === "b5self:herb");
    if (!a) F("探索中に「薬草を使う（自分に）」が無い");
    else {
      const hp = S.hp, t = S.turn;
      G.act(a.id);
      if (!(S.hp > hp) || S.inv.herb) F(`「薬草を使う（自分に）」で HP が戻らない・薬草が減らない（HP ${hp} → ${S.hp}）`);
      if (S.turn !== t) F("自分に薬草を使っただけで手番が進む");
    }
    S.hp = S.maxHp; S.inv.herb = 1;
    if (acts(G).some((x) => x.id === "b5self:herb")) F("傷が無いのに「薬草を使う（自分に）」が出る");
  }

  // ---------------------------------------------------------------- 低 20：戦闘中の押せない振り直し
  {
    const G = loadEngine();
    if (!G.rerollBlockedTarget) F("エンジンの振り直せない印（G.rerollBlockedTarget）が無い");
    const ctx = vm.createContext({ G: Object.assign(G, {}), console });
    ctx.globalThis = ctx;
    vm.runInContext(readFileSync(new URL("../../src/ui/zzzzzzzzz_r11_rules.js", import.meta.url), "utf8"), ctx);
    if (ctx.G.rerollBlockedTarget({}) !== false) F("画面に戦闘中の押せない「振り直す」が出る");
  }

  // ---------------------------------------------------------------- 低 32：正気 0 から戻る
  {
    const G = loadEngine();
    const S = start(G, "priest", 5);
    S.sanity = 0;
    try { G.addSanity(20); } catch (e) { F(`正気 0 から戻るときに例外：${e.message}`); }
    if (G.sanityOf(S) <= 0) F("正気 0 から戻らない");
  }

  if (!bad) ok("R11 ルール：格・教わる技の武器・好感度の理由・振り直し・自分に薬草・稽古の一行・正気 0");
};
