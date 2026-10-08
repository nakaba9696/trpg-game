// R7b：0.6.0 の再レビュー（docs/review/playreview_2026-10-08.md）の文と小さな仕組み
// 高4 長編を引き受けたら、受けている依頼の一覧に載る
// 中9 入口の出来事（マグダ・鬼ヶ島の洞窟の入り口）は、迷宮の奥（地下 2 階から）では起きない
// 中10・16 迷宮の中では、戦いの始まり・勝ったあと・逃げ切ったとき・死の溜めの段落に、空・鳥・風・草が出ない
// 中11 主人公から言う求婚の文は場所を問わない（草・鳥・風・坂・土手が出ない）。相手から言う求婚（焚き火）は野外だけ
// 中14 静かな節目の一行の頭に、丸括弧の題を付けない
// 低19・20 術の才の箱（ui）は画面の確認なので文だけ見る／低21 判定の案内は出目 01〜00
// 低22 比べの札に「＝今より」が出ない／低23 値の上げ下げのある買い物は一行／低24 「群れを1体」と数えない／低28 年表に同じ日の同じトロフィーを二度書かない
import { readFileSync } from "node:fs";
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("R7b: " + m); };
  const start = (G, cls, seed, goal) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [], codex: {} };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; caps[k] = stats[k] + 30; });
    G.newGame({ cls, stats, caps, goal: goal || "majin", profile: { name: "テスト", sex: "女", age: 24, history: "", personality: "無口" } });
    return G.S;
  };
  const G = loadEngine();
  const D = G.data;
  const cls0 = Object.keys(D.CLASSES)[0];

  // ---- 高4 長編の依頼
  {
    const S = start(G, cls0, 3);
    S.day = 30; S.fame = 40;
    G.startEvent("e7m_1");
    G.act("ev:0");
    if (!G.q7.list(S).some((e) => e.src === "e7" && /^微笑の糸を断つ：/.test(e.title))) F("長編を引き受けても、受けている依頼の一覧に載らない");
  }

  // ---- 中9 入口の出来事
  {
    const S = start(G, cls0, 4);
    S.loc = "ruins";
    for (const id of D.R7B_ENTRANCE || []) {
      const e = D.EVENTS.find((x) => x.id === id);
      if (!e) { F(`入口の出来事 ${id} が無い`); continue; }
      S.depth = 3;
      let r = true;
      try { r = !!e.cond(S); } catch { r = true; }
      if (r) F(`${id}：地下 3 階でも起きる`);
    }
  }

  // ---- 中10・16 迷宮の中の語り
  {
    const OUT = /空(?!気)|雲|鳥|風|草|土手|日差し|木漏れ/;
    const S = start(G, cls0, 5);
    S.loc = "ruins"; S.depth = 3; S.mode = "explore"; S.fac = null; S.event = null;
    if (!G.r7b.indoor(S)) F("迷宮の地下 3 階が屋内と判定されない");
    for (const k of ["meet", "win", "fled"]) {
      for (let t = 0; t < 12; t++) {
        S.turn = t;
        const line = G.voiceLine(k, { foes: "ゴブリン" }, "");
        if (OUT.test(line)) { F(`迷宮の中の語り（${k}）に「${line.match(OUT)[0]}」：${line}`); break; }
      }
    }
    for (const p of D.R7B_DEATH_IN || []) if (OUT.test(p)) F(`屋内の死の段落に「${p.match(OUT)[0]}」`);
    const death = (D.V3_SAY || []).find((x) => x.id === "death");
    if (death) for (let d = 0; d < 9; d++) {
      S.day = d; S.over = "dead";
      const m = death.re.exec("テストは倒れた。力尽きた。");
      const txt = m ? death.to(m, S) : "";
      if (OUT.test(txt)) { F(`迷宮の中で死んだときの段落に「${txt.match(OUT)[0]}」`); break; }
    }
    S.over = "";
    // 外ではいつもの表から選ぶ
    S.loc = "plains"; S.depth = 0;
    if (G.r7b.indoor(S)) F("平原が屋内と判定される");
  }

  // ---- 中11 求婚の文
  {
    const OUT = /草|鳥|風|坂|土手/;
    const ask = D.EVENTS.find((e) => e.id === "m10_ask");
    if (!ask) F("m10_ask が無い");
    else {
      const texts = [ask.text, ...ask.choices.flatMap((c) => [c.ok && c.ok.text, c.ng && c.ng.text])].filter(Boolean).map((t) => (Array.isArray(t) ? t.join("") : String(t)));
      texts.forEach((t) => { if (OUT.test(t)) F(`主人公から言う求婚の文に「${t.match(OUT)[0]}」：${t.slice(0, 60)}`); });
    }
    const pro = D.EVENTS.find((e) => e.id === "m10_propose");
    if (pro && pro.where.some((w) => w !== "wild")) F(`焚き火の求婚（m10_propose）が野外の外でも起きる（${pro.where.join("・")}）`);
  }

  // ---- 中14 静かな節目の一行
  if (/^（/.test(D.M6.QUIET)) F(`静かな節目の一行の頭に丸括弧：${D.M6.QUIET}`);

  // ---- 低19・20 術の才の箱の文（画面のファイル）
  {
    const src = readFileSync(new URL("../../src/ui/zm14_magic.js", import.meta.url), "utf8");
    if (/種族と職業で変わる/.test(src)) F("術の才の箱に「種族と職業で変わる」が残る");
    if (!/初級の術を一つ知って旅立つ/.test(src)) F("術の才の箱に、得意な属性の初級を一つ知って始まることが書かれていない");
  }

  // ---- 低21 判定の案内
  {
    const g = JSON.stringify((G.u4 && G.u4.GUIDE) || "") + readFileSync(new URL("../../src/engine/u4_guide.js", import.meta.url), "utf8");
    if (/00〜99/.test(g)) F("判定の案内が出目 00〜99 のまま（出目は 1〜100 で、100 を 00 と出す）");
  }

  // ---- 低22 比べの札
  for (let s = 0; s < 5; s++) {
    start(G, Object.keys(D.CLASSES)[s], 1800 + s);
    for (const id of Object.keys(D.ITEMS)) {
      if (!["weapon", "armor", "ring"].includes(D.ITEMS[id].type)) continue;
      const v = G.i3.compareLabel(id);
      if (/^＝今より/.test(v)) { F(`比べの札の印と数が食い違う：${D.ITEMS[id].name}「${v}」`); break; }
    }
  }

  // ---- 低23 値引きの買い物は一行
  {
    const S = start(G, cls0, 6);
    S.gold = 500; S.mode = "fac"; S.fac = "shop";
    const adj0 = G.echo.priceAdj;
    G.echo.priceAdj = () => -2;
    const len = S.log.length;
    G.act("shop:buy:herb");
    G.echo.priceAdj = adj0;
    const added = S.log.slice(len).filter((l) => /買った|まけて/.test(l.text));
    if (added.length !== 1) F(`値引きの買い物の記録が ${added.length} 行（${added.map((l) => l.text).join("／")}）`);
    else if (!/薬草を買った。顔なじみだからと、少しまけてくれた。（-6G）/.test(added[0].text)) F(`値引きの一行の形か額が違う：${added[0].text}`);
  }

  // ---- 低24 群れの数え方
  {
    const v = { foe: "関所ネズミの群れ" };
    const t = G.q5.herd("鐘撞きの丘で関所ネズミの群れを1体倒す", v);
    if (t !== "鐘撞きの丘で関所ネズミをひと群れ倒す") F(`群れの数え方：${t}`);
    if (G.q5.herd("狼を2体", { foe: "狼" }) !== "狼を2体") F("群れでない魔物の数え方が変わった");
  }

  // ---- 低28 年表のトロフィー
  {
    const S = start(G, cls0, 7);
    const before = S.chronicle.length;
    G.chron("トロフィー「テスト」", "trophy");
    G.chron("トロフィー「テスト」", "trophy");
    if (S.chronicle.length - before !== 1) F("年表に同じ日の同じトロフィーが二度書かれる");
  }

  if (!n) ok("R7b 再レビューの文と仕組み（長編の依頼・入口の出来事・屋内の語り・求婚の文・節目の一行・術の才・出目の案内・比べの札・値引きの一行・群れ・年表）");
};
