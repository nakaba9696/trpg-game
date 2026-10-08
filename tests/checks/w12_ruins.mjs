// W12：遺跡らしさ（src/data/w12_ruins.js・src/engine/w12_ruins.js）
// - データの整合：遺跡は迷宮の場所・断片の id・種類・階（主のいる最奥より手前）・仕掛けの階に壁画がある・能力値と難しさ・物・トロフィー・禁じた言葉・内部の数
// - どの断片も手に入る道がある：遺跡ごとに階を下りて、出た行動を押し続けると、すべての断片がそろい、鍵が出て、隠し部屋が開く（古いセーブ S.w12 なしから）
// - 古文字読みが無いと碑文は一行目だけ。あとで覚えると読み直せる
// - 手がかりが多いほど仕掛けが易しい。一日に一度
// - 仕掛けを解いた先・隠し部屋では、その階にいるあいだ特別な背景（R5 の決め方に出る。絵の名前は docs/art/scenes.json にある）。階を離れたら戻る
import { readFileSync } from "node:fs";
const SCENES = new Set(JSON.parse(readFileSync(new URL("../../docs/art/scenes.json", import.meta.url), "utf8")).scenes.map((s) => s.id));

export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const W12 = G.w12;
  if (!W12) { fail("G.w12 が無い"); return; }
  const RU = D.W12_RUINS || {};
  const BANNED = /見世物|観客|客席|舞台|台本|言霊|魔王|ガイゼリク|名簿|端役/;
  const texts = [];
  const ids = new Set();
  for (const [loc, R] of Object.entries(RU)) {
    const L = D.LOCS[loc];
    const w = `W12 ${loc}`;
    if (!L || L.type !== "dungeon") { fail(`${w}: 迷宮の場所でない`); continue; }
    if (!R.name || !R.nature || !R.group || !(R.air && R.air.length)) fail(`${w}: 名・性格・組の見出し・空気の文が無い`);
    texts.push(R.nature, ...(R.air || []));
    const kinds = new Set(R.frags.map((f) => f.kind));
    ["script", "mural", "relic"].forEach((k) => { if (!kinds.has(k)) fail(`${w}: ${k} の断片が無い`); });
    for (const f of R.frags) {
      if (!/^w12_/.test(f.id) || ids.has(f.id)) fail(`${w}: 断片の id ${f.id} が w12_ で始まらないか重なる`);
      ids.add(f.id);
      if (!W12.KIND[f.kind]) fail(`${w}:${f.id}: 種類 ${f.kind}`);
      if (!(f.floor >= 1 && f.floor < L.floors)) fail(`${w}:${f.id}: 階 ${f.floor} が 1〜${L.floors - 1} でない`);
      if (!f.name || !(f.lines && f.lines.length)) fail(`${w}:${f.id}: 名か文が無い`);
      texts.push(f.name, ...f.lines);
    }
    const g = R.gear;
    if (!g) { fail(`${w}: 仕掛けが無い`); continue; }
    if (!D.STATS.includes(g.stat) || !(g.diff in D.DIFF)) fail(`${w}: 仕掛けの能力値か難しさ`);
    if (!/^w12_\w+_in$/.test(g.scene || "") || !SCENES.has("in_" + g.scene.replace(/_in$/, ""))) fail(`${w}: 仕掛けの先の背景 ${g.scene} が scenes.json に無い`);
    if (!R.frags.some((f) => f.kind === "mural" && f.floor === g.floor)) fail(`${w}: 仕掛けの階 ${g.floor} に壁画が無い`);
    if (R.frags.some((f) => f.kind === "mural" && f.floor !== g.floor)) fail(`${w}: 仕掛けの階でない壁画（手に入らない）`);
    texts.push(g.label, g.ok.text, g.ng.text);
  }
  if (Object.keys(RU).length < 4) fail(`遺跡が ${Object.keys(RU).length}（4 つ以上）`);
  const V = D.W12_VAULT;
  if (!D.ITEMS[V.key] || !D.ITEMS[V.item] || !RU[V.loc]) fail("隠し部屋の鍵・品・場所が無い");
  if (!(V.floor >= 1 && V.floor < D.LOCS[V.loc].floors)) fail("隠し部屋の階");
  if (!SCENES.has("in_" + String(V.scene).replace(/_in$/, ""))) fail(`隠し部屋の背景 ${V.scene} が scenes.json に無い`);
  ["w12_ruvenal"].forEach((k) => { if (!D.TROPHIES.some((t) => t.key === k)) fail(`トロフィー ${k} が無い`); });
  texts.push(...D.W12_SECRET.text, ...V.text);
  for (const t of [...texts, D.ITEMS[V.key].desc, D.ITEMS[V.item].desc]) if (BANNED.test(t)) fail(`W12 の見える文に「${t.match(BANNED)[0]}」：${t.slice(0, 30)}`);
  for (const t of texts) if (/\d|HP|MP|……/.test(t)) fail(`W12 の物語の文に数か「……」：${t.slice(0, 30)}`);

  // ---------------------------------------------------------------- 遊ぶ：どの断片も手に入る
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 60]));
  const start = (seed, cls, v) => {
    G.rand = seeded(seed);
    G.newGame({ cls, stats: v ? Object.fromEntries(D.STATS.map((k) => [k, v])) : { ...stats }, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.mode = "explore"; S.event = null; S.combat = null;
    delete S.w12; // 古いセーブ
    return S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const reset = (S, loc, depth) => { S.mode = "explore"; S.event = null; S.combat = null; S.fac = null; S.loc = loc; S.depth = depth; S.hp = S.maxHp; S.over = null; };
  // 一度試す。小さな遺跡は各階の「遺跡」の組の行動、大きな迷宮（エル・ナフ遺構。W11）は階ごとのかけらの部屋の出来事から。
  // 返り値："none" もう何も無い / "busy" 今日はもう試した / 押した選択肢の id
  const LEAVE = "何もせずに部屋を出る";
  const attempt = (S, loc, depth, cls) => {
    reset(S, loc, depth);
    if (G.w11 && G.w11.large(loc)) {
      delete S.w11; // 階の部屋を作り直す（日が変われば、かけらの部屋にまた入れる）
      const f = G.w11.floorOf(S);
      const i = f ? f.rooms.findIndex((r) => r.k === "w12_ruins_lore") : -1;
      if (i < 0) { fail(`${cls} ${loc}:${depth}: かけらの部屋が無い`); return "none"; }
      if (acts().some((x) => /^w12:(script|gear|relic)$/.test(x.id))) fail(`${cls} ${loc}:${depth}: 大きな迷宮なのに各階の行動が出る`);
      G.act("w11go:" + i);
      if (S.mode !== "event") { fail(`${cls} ${loc}:${depth}: かけらの部屋で出来事が始まらない`); return "none"; }
      const ch = acts().filter((x) => !x.disabled);
      const c = ch.find((x) => x.label !== LEAVE);
      if (!c) { G.act(ch.find((x) => x.label === LEAVE).id); return W12.open(S, "script").length + W12.open(S, "relic").length + W12.open(S, "mural").length ? "busy" : "none"; }
      G.act(c.id);
      if (S.mode === "combat") { S.combat = null; S.mode = "explore"; }
      return c.label;
    }
    const mine = acts().filter((a) => /^w12:/.test(a.id) && a.id !== "w12:vault");
    if (!mine.length) return "none";
    const a = mine.find((x) => !x.disabled);
    if (!a) return "busy";
    const before = W12.count(S);
    G.act(a.id);
    if (S.mode === "combat") { S.combat = null; S.mode = "explore"; }
    if (acts().some((x) => x.id === a.id && !x.disabled) && W12.count(S) === before && S.depth === depth) fail(`${cls} ${a.id}: 同じ日にまた押せる`);
    return a.id;
  };
  for (const cls of ["mage", "merc"]) {
    const S = start(7 + cls.length, cls);
    const hasLetters = G.k1.knows("k1_letters", S);
    let pressed = 0;
    for (const [loc] of Object.entries(RU)) {
      const L = D.LOCS[loc];
      S.visited[loc] = true;
      for (let depth = 1; depth < L.floors; depth++) {
        for (let tries = 0; tries < 60; tries++) {
          let r;
          try { r = attempt(S, loc, depth, cls); } catch (e) { fail(`${cls} ${loc}:${depth}: 例外 ${e.message}`); break; }
          if (r === "none") break;
          if (r === "busy") { S.day++; continue; }
          pressed++;
        }
      }
    }
    if (!(G.w11 && G.w11.large("ruins"))) fail("エル・ナフ遺構が大きな迷宮になっていない");
    // 特別な背景：仕掛けを解いた階にいるあいだ出て、階を離れると消える
    {
      const [loc, R] = Object.entries(RU)[0];
      reset(S, loc, R.gear.floor);
      W12.st(S).view = { key: R.gear.scene, loc, depth: R.gear.floor };
      const r = G.r5 && G.r5.sceneOf(S);
      if (!r || r.key !== R.gear.scene) fail(`${cls}: 仕掛けの先の背景が出ない（${r && r.key}）`);
      G.act("leave");
      if (W12.st(S).view) fail(`${cls}: 階を離れても特別な背景が残る`);
    }
    const miss = W12.all().filter((f) => !W12.st(S).got[f.id]);
    if (miss.length) fail(`${cls}: 手に入らなかった断片 ${miss.map((f) => f.id).join("・")}`);
    if (!W12.st(S).done) fail(`${cls}: そろったのに分かったことが出ない`);
    if (!G.P.trophies.w12_ruvenal) fail(`${cls}: トロフィー w12_ruvenal が無い`);
    // 碑文の読めた行
    const sc = W12.all().filter((f) => f.kind === "script");
    if (hasLetters && sc.some((f) => W12.st(S).got[f.id] < f.lines.length)) fail(`${cls}: 古文字読みがあるのに碑文を読み切れない`);
    if (!hasLetters && sc.some((f) => W12.st(S).got[f.id] !== 1)) fail(`${cls}: 古文字読みが無いのに一行目より多く読めた`);
    // 隠し部屋
    reset(S, V.loc, V.floor);
    if (!(S.inv[V.key] > 0)) fail(`${cls}: 鍵が無い`);
    const b = acts().find((x) => x.id === "w12:vault");
    if (!b) fail(`${cls}: 隠し部屋の行動が出ない`);
    else {
      G.act("w12:vault");
      if (!(S.inv[V.item] > 0) || S.inv[V.key] > 0) fail(`${cls}: 隠し部屋で品が出ない／鍵が残る`);
      if (acts().some((x) => x.id === "w12:vault")) fail(`${cls}: 隠し部屋がまた開く`);
      const r = G.r5 && G.r5.sceneOf(S);
      if (!r || r.key !== V.scene) fail(`${cls}: 隠し部屋の背景が出ない`);
    }
    // 読み直し：古文字読みを覚えると続きが読める
    if (!hasLetters) {
      const f = sc[0];
      S.skills = [...(S.skills || []), "k1_letters"];
      if (!G.k1.knows("k1_letters", S)) { fail("k1_letters を覚えさせられない"); continue; }
      let got = false;
      for (let i = 0; i < 40 && !got; i++) {
        S.day++;
        const r = attempt(S, f.loc, f.floor, cls);
        if (r === "none") { fail(`${cls}: 古文字読みを覚えても読み直しが出ない`); break; }
        got = W12.st(S).got[f.id] === f.lines.length;
      }
      if (!got) fail(`${cls}: 読み直しで続きが読めない`);
    }
    if (Number.isNaN(S.gold) || Number.isNaN(S.hp)) fail(`${cls}: 数が壊れた`);
    if (pressed < W12.all().length) fail(`${cls}: 押した数が少ない ${pressed}`);
  }

  // ---------------------------------------------------------------- 手がかり・遺跡の外
  {
    const S = start(3, "merc", 12);
    reset(S, "w4_pass", 3);
    const sub0 = acts().find((x) => x.id === "w12:gear");
    if (!sub0) fail("仕掛けの行動が出ない");
    W12.st(S).got = Object.fromEntries(W12.all().filter((f) => f.kind !== "mural").slice(0, 5).map((f) => [f.id, 1]));
    const sub1 = acts().find((x) => x.id === "w12:gear");
    const pc = (a) => Number((a.sub.match(/(\d+)%/) || [])[1]);
    if (sub0 && sub1 && !(pc(sub1) > pc(sub0))) fail(`手がかりで仕掛けが易しくならない（${sub0.sub} → ${sub1.sub}）`);
    reset(S, "w4_pass", 0);
    if (acts().some((x) => /^w12:/.test(x.id))) fail("入口で遺跡の行動が出る");
    reset(S, Object.keys(D.LOCS).find((k) => D.LOCS[k].type === "town"), 0);
    if (acts().some((x) => /^w12:/.test(x.id))) fail("町で遺跡の行動が出る");
  }
  ok(`W12：遺跡 ${Object.keys(RU).length}・断片 ${W12.all().length}。どの断片も手に入り、隠し部屋が開く`);
};
