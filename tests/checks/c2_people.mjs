// C2：キャラメモの人物（src/data/c2_people.js・events_c2.js・events_c2_talk.js・engine/zz_c2_people.js）
// - シートの全員が表にいて、どの人物にも出てくる出来事がある。出来事は実在の場所（か場所の種類）を指す
// - 全員が出会える：どの人物にも、ふつうに起きる出来事（w > 0）があり、その出来事が起きる場所と状態がある
// - 仲間になる八人は、出会いの出来事の流れで仲間になる。性格・暮らし・才・性別・歳・絵・好感度がシートのまま。ひとことと恋のひとことがその人のもの
// - 三人いれば、その人の町で「誘う」で加わる。去った・死んだ者は誘えない。子どもの姿の者は恋の相手にならない
// - 見せる文に、書かない言葉（見世物まわり・今の人が知らないこと・性的な言葉）が無い
// - 古いセーブ（S.c2 が無い）で動く。ランダムに遊んで、出会えた回数と仲間になった回数を出す
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SHEET = ["ディル", "カイデル", "ノラミ", "シェイラ", "アンジェリカ", "第六騎士団の団長", "博士", "寡黙な隊長", "ヴァレオン", "ライオス", "セリオス", "ファリナ", "グレオル", "ネイラス", "ティリア",
  "アリシア", "グレイオル", "ダリオ", "エルナ", "ヴァルグ", "マルヴィナ", "カティア", "ヘル爺", "ルイ", "ゼリナ", "エルネア", "ユリナ", "フェリダ", "ナタリア", "シグ", "ライーシャ", "ゾルク", "大槌の姉さん", "「ボク」の娘"];
const JOIN = ["dil", "kaidel", "nora", "sheila", "rui", "zerina", "elnea", "natalia"];
const BANNED = /見世物|観客|客席|舞台|台本|神々|魔王|魔人|正体|もういない|胸|童貞|貧乳|巨乳|ナイスバディ|ロリコン|体つき/;
const TAGS = new Set(["any", "town", "wild", "dungeon", "capital", "port", "snow", "realm"]);

export default ({ G, fail, ok, loadEngine, seeded }) => {
  const D = G.data;
  let n = 0;
  const F = (m) => { n++; fail("C2: " + m); };
  const P = D.C2_PEOPLE;

  // ---------------------------------------------------------------- 表と出来事
  // C3 で名前を付けた人は、シートの呼び名を was に残している
  const names = Object.entries(P).flatMap(([id, p]) => [p.name, ...(((D.C3_NAMES || {})[id] || {}).was || [])]);
  for (const s of SHEET) if (!names.includes(s)) F(`シートの人物 ${s} が表に無い`);
  const evs = D.EVENTS.filter((e) => e.id.startsWith("c2_"));
  const ids = (e) => (e.c2 ? (Array.isArray(e.c2) ? e.c2 : [e.c2]) : e.c2talk ? [e.c2talk] : []);
  for (const e of evs) {
    for (const w of e.where) if (!TAGS.has(w) && !D.LOCS[w]) F(`出来事 ${e.id}: 場所 ${w} が無い`);
    for (const id of ids(e)) if (!P[id]) F(`出来事 ${e.id}: 人物 ${id} が表に無い`);
  }
  for (const [id, p] of Object.entries(P)) {
    if (!evs.some((e) => ids(e).includes(id))) F(`${p.name}が出てくる出来事が無い`);
    if (!p.who || !p.who.kind || p.who.seed !== "c2:" + id) F(`${p.name}の絵（who）が無いか、seed が c2:${id} でない`);
    if (!D.RACES[p.race] || (p.race === "beast") !== !!D.BEASTS[p.beast]) F(`${p.name}の種族が変 ${p.race} ${p.beast}`);
    if (p.join) {
      if (!JOIN.includes(id)) F(`${p.name}は仲間になる者の一覧に無い`);
      const j = p.join;
      if (!D.M2_TRAITS[j.trait]) F(`${p.name}の性格 ${j.trait} が M2 に無い`);
      for (const k of Object.keys(D.M2_LIFE)) if (!j.life[k]) F(`${p.name}の暮らし ${k} が無い`);
      for (const k of D.TALENT_KEYS) if (!(j.t[k] >= 0 && j.t[k] <= 3)) F(`${p.name}の才 ${k} が無い`);
      for (const k of Object.keys(j.f)) if (!D.FLAVORS[k]) F(`${p.name}の暮らしの才 ${k} が無い`);
      for (const l of j.home) if (!D.LOCS[l] || D.LOCS[l].type !== "town") F(`${p.name}を誘える町 ${l} が町でない`);
      const v = D.C2_VOICE[id];
      if (!v || v.talk.length < 3 || !v.betray || !v.die) F(`${p.name}のひとことが足りない`);
      if (!j.noLove) for (const k of ["spark", "confess", "propose", "part", "cold"]) if (!v[k]) F(`${p.name}の恋のひとこと ${k} が無い`);
      if (!(D.C2_INVITE[id] || []).length) F(`${p.name}を誘ったときの一言が無い`);
      if (evs.filter((e) => e.c2talk === id).length < 2) F(`${p.name}だけの話が二つ未満`);
    }
  }
  for (const id of JOIN) if (!P[id] || !P[id].join) F(`${id} が仲間になれない`);
  const sheila = D.C2_VOICE.sheila;
  for (const t of [...sheila.talk, sheila.betray, sheila.spark, sheila.confess, sheila.propose, sheila.part, sheila.cold]) if (!t.startsWith("うん")) F(`シェイラの言葉が「うん、」で始まらない「${t}」`);
  for (const t of [...D.C2_VOICE.elnea.talk, D.C2_VOICE.elnea.confess]) if (!/っす/.test(t)) F(`エルネアの言葉に「っす」が無い「${t}」`);

  // 見せる文
  const texts = [];
  const addO = (o) => { if (!o) return; for (const k of ["text", "memo", "chron"]) if (o[k]) texts.push(o[k]); addO(o.win); };
  for (const e of evs) { texts.push(e.title, e.text); for (const c of e.choices) { texts.push(c.label); addO(c.ok); addO(c.ng); addO({ win: c.win }); } }
  for (const v of Object.values(D.C2_VOICE)) texts.push(...Object.values(v).flat());
  for (const v of Object.values(D.C2_INVITE)) texts.push(...v);
  for (const [id, e] of Object.entries(D.ENEMIES)) if (id.startsWith("c2_")) texts.push(e.name, e.desc, ...Object.values(e.lines || {}).flat());
  for (const [id, e] of Object.entries(D.LORE)) if (id.startsWith("c2_")) e.lines.forEach(([, t]) => texts.push(t));
  for (const p of Object.values(P)) if (p.join) texts.push(p.join.desc, ...Object.values(p.join.life));
  for (const t of texts) if (typeof t !== "string" || BANNED.test(t)) F(`見せる文に書かない言葉か、文でないものがある「${String(t).slice(0, 40)}」`);
  if (/女王エレオノーラ/.test(JSON.stringify(D.LOCS.leavel)) || D.WORLD.all.some(([, rows]) => rows.some(([, v]) => /エレオノーラ/.test(v)))) F("王都にまだ女王エレオノーラがいる（シートでは国王ヴァレオン）");

  // 人物の絵（art_people.js を読み込んで、種類があり、例外なく見た目が決まる）
  {
    const vmc = vm.createContext({ console, G });
    for (const f of ["art_monsters.js", "art_people.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
    for (const p of Object.values(P)) {
      if (!G.PEOPLE[p.who.kind]) F(`${p.name}の絵の種類 ${p.who.kind} が無い`);
      const L = G.personLook(p.who);
      if (L.sex !== p.sex) F(`${p.name}の絵の性別が違う`);
      if (p.race === "elf" && L.ears !== "pointy") F(`${p.name}（エルフ）の耳がとがっていない`);
      if (p.race === "beast" && L.beast !== p.beast) F(`${p.name}（獣人）に元の獣の耳が無い`);
      if (p.join) { const w = G.companionWho(G.c2Make ? G.c2Make(Object.keys(P).find((k) => P[k] === p)) : {}); if (w.seed !== p.who.seed) F(`${p.name}の仲間の絵が出来事の絵と違う`); }
    }
    const w = G.facWho({ mode: "fac", fac: "castle", loc: "leavel", flags: {} });
    if (!w || !/ヴァレオン/.test(w.name)) F("王都の王城の玉座の主がヴァレオンでない");
  }

  // ---------------------------------------------------------------- 決まった流れ
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  const start = (loc) => {
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 24, history: "テスト用", personality: "無口だが義理堅い" } });
    G.S.maxHp = G.S.hp = 999;
    G.S.gold = 500;
    if (loc) { G.S.loc = loc; G.S.visited[loc] = true; }
    return G.S;
  };
  const lucky = (f) => { const r = G.rand; G.rand = () => 0.01; try { return f(); } finally { G.rand = r; } };
  // 出来事の選択肢を、ラベルの一部で選ぶ。戦闘になったら勝つ
  const choose = (part) => {
    const S = G.S;
    if (S.mode !== "event") { F(`「${part}」を選ぶときに出来事の中にいない（${S.mode} ${S.event}）`); return; }
    const c = G.eventChoices().find(({ c }) => G.m2Fill(c.label).includes(part));
    if (!c) { F(`出来事 ${S.event} に「${part}」が無い`); return; }
    lucky(() => G.act("ev:" + c.i));
    for (let i = 0; i < 30 && S.mode === "combat"; i++) { S.combat.foes.forEach((f) => { if (f.hp > 0) f.hp = 1; }); lucky(() => G.act("cb:attack")); }
    if (S.mode === "combat") F(`出来事 ${part} の戦闘が終わらない`);
  };
  const FLOWS = {
    dil: ["nerva", "c2_dil_house", ["片付けを手伝う", "ディルだけ"]],
    kaidel: ["nerva", "c2_dil_house", ["大男にわけを聞く", "カイデルだけ"]],
    nora: ["forest", "c2_nora", ["受けて立つ", "村の跡", "爪の跡"]],
    sheila: ["leavel", "c2_sheila_hire", ["座って", "待ち伏せる", "連れていく"]],
    rui: ["ruins", "c2_rui", ["銀の札", "ルイと呼ぶ"]],
    zerina: ["karna", "c2_zerina_market", ["筒を調べて"]],
    elnea: ["w2_dranherz", "c2_elnea", ["精晶って何だ", "連れていく"]],
    natalia: ["leavel", "c2_natalia", ["飲み比べ", "連れていく"]],
  };
  G.rand = seeded(41);
  for (const id of JOIN) {
    const [loc, ev, steps] = FLOWS[id];
    const S = start(loc);
    G.startEvent(ev);
    steps.forEach(choose);
    const c = S.companions.find((x) => x.c2 === id);
    const p = P[id];
    if (!c) { F(`${p.name}が出会いの流れで仲間にならない（${S.mode} ${S.event}）`); continue; }
    if (!G.c2Met(id, S) || !S.c2.joined[id]) F(`${p.name}が出会った・加わったと記録されない`);
    if (c.trait !== p.join.trait || c.sex !== p.sex || c.age !== p.age || c.race !== p.race || (c.beast || "") !== (p.beast || "") || G.r1Comp(c).race !== p.race || c.bond !== p.join.bond) F(`${p.name}の性格・性別・歳・種族・好感度がシートと違う`);
    if (c.life.food !== p.join.life.food || !c.m8 || c.m8.t.lore !== p.join.t.lore || c.m8.known) F(`${p.name}の暮らしか才が違う`);
    if (G.m2Trait(c).talk[0] !== D.C2_VOICE[id].talk[0] || G.m2Trait(c).die !== D.C2_VOICE[id].die) F(`${p.name}のひとことがその人のものでない`);
    if (!p.join.noLove && G.c2Line(c, "confess") !== D.C2_VOICE[id].confess) F(`${p.name}の恋のひとことがその人のものでない`);
    if (p.join.noLove && G.m10Can(c)) F(`${p.name}が恋の相手になる`);
    if (!p.join.noLove && !G.m10Can(c)) F(`${p.name}が恋の相手にならない`);
    if (G.m2Short(c) !== (p.short || p.name)) F(`${p.name}の短い呼び名が ${G.m2Short(c)}`);
    // その人だけの話
    c.talkDay = 0;
    const talks = D.EVENTS.filter((e) => e.c2talk === id && e.where.some((w) => G.eventTags().includes(w)) && e.cond(S));
    if (!talks.length && !["rui", "elnea"].includes(id)) F(`${p.name}だけの話が、仲間になった町で起きない`);
    for (let i = 0; i < 6; i++) {
      c.talkDay = 0; S.mode = "explore"; S.event = null;
      G.m2Talk(c.id);
      if (S.mode === "event") { const e = D.EVENTS.find((x) => x.id === S.event); if (/\{[a-z_0-9]+\}/.test(G.m2Fill(e.text))) F(`${S.event} の文に置き換えが残る`); }
    }
  }
  // ディルがいれば、ディルがルイの名前を付ける
  {
    const S = start("ruins");
    G.c2Join("dil");
    G.startEvent("c2_rui");
    choose("肩を揺する");
    choose("ディルに名前を考えさせる");
    if (!G.c2Has("rui")) F("ディルが名付けても、ルイが仲間にならない");
    if (!S.log.some((l) => /ルイン/.test(l.text || ""))) F("ディルの名付けの文が出ない");
  }
  // 三人いれば、待つ。町で誘える。去った者は誘えない
  {
    const S = start("nerva");
    G.addCompanion("random"); G.addCompanion("random"); G.addCompanion("random");
    G.startEvent("c2_dil_house");
    choose("片付けを手伝う");
    choose("二人とも");
    if (G.c2Has("dil") || !G.c2Met("dil", S)) F("三人いるのにディルが加わったか、出会ったことにならない");
    if (!S.log.some((l) => /三人まで/.test(l.text || ""))) F("三人いるときの一言が出ない");
    const acts = () => G.actions().flatMap((g) => g.list);
    if (acts().some((a) => a.id === "c2inv:dil")) F("三人いるのに、ディルを誘える");
    S.companions.pop();
    S.mode = "explore"; S.event = null;
    if (!acts().some((a) => a.id === "c2inv:dil")) F("席が空いたのに、港町でディルを誘えない");
    if (acts().some((a) => a.id === "c2inv:sheila")) F("出会っていないシェイラを誘える");
    if (!G.parse("ディルを誘う")) F("「ディルを誘う」を読み取れない");
    G.act("c2inv:dil");
    const c = G.c2In("dil", S);
    if (!c) F("誘ってもディルが加わらない");
    else {
      G.m2Remove(c, "leave");
      if (S.c2.gone.dil !== "leave") F("去ったディルが記録されない");
      if (acts().some((a) => a.id === "c2inv:dil")) F("去ったディルをまた誘える");
      if (G.c2Join("dil")) F("去ったディルがまた加わる");
    }
    if (G.c2Join("kaidel") && !G.c2Has("kaidel")) F("カイデルの加わり方が変");
  }
  // 続き物：アンジェリカ → 城の下 → 三本目の腕。ユリナの炭鉱
  {
    const S = start("plains");
    S.day = 30;
    G.startEvent("c2_ange1"); choose("人違い");
    S.loc = "leavel";
    const lab = D.EVENTS.find((e) => e.id === "c2_lab");
    if (lab.cond(S)) F("アンジェリカに一度会っただけで、城の下の部屋が開く");
    G.startEvent("c2_ange2"); choose("道を教える");
    if (!lab.cond(S)) F("アンジェリカに二度会っても、城の下の部屋が開かない");
    G.startEvent("c2_lab"); choose("檻の中"); choose("走る");
    if (!S.flags.c2_lab || !G.P.trophies.c2_lab) F("城の下の部屋から逃げても、印かトロフィーが付かない");
    S.day += 10;
    const after = D.EVENTS.find((e) => e.id === "c2_lab_after");
    if (!after.cond(S)) F("城の下のあとの出来事が起きない");
    G.startEvent("c2_lab_after"); choose("女隊長の前に出る");
    if (S.c2.gone.captain !== "dead") F("化け物にされた隊長が死んだことにならない");
    S.loc = "w2_dranherz";
    G.startEvent("c2_yurina"); choose("一緒に行く"); choose("壁の錆"); choose("並んで戦う");
    if (S.c2.gone.yurina !== "dead" || !S.chronicle.some((c) => /ユリナ/.test(c.text))) F("ユリナが炭鉱で死なないか、年表に残らない");
    if (!(S.lore && Object.keys(S.lore).some((k) => /c2_jusshi/.test(k))) && !JSON.stringify(S.lore || {}).includes("c2_jusshi")) F("ユリナのあとに、十指の用語が開かない");
  }

  // ---------------------------------------------------------------- 全員が出会える（ふつうに起きる出来事があり、起きる場所と状態がある）
  {
    const setups = [
      () => {},
      (S) => { S.day = 40; S.counters.bosses = 1; Object.assign(S.flags, { c2_ange1: true, c2_ange2: true, c2_cage: true }); },
      (S) => { S.day = 40; Object.assign(S.flags, { c2_ange1: true, c2_ange2: true, c2_lab: true }); G.c2State(S).met.doctor = 1; },
      (S) => { S.day = 40; G.c2Join("sheila"); G.c2Join("rui"); G.c2Join("dil"); S.c2.met.hermes = 1; S.c2.met.doctor = 1; },
      (S) => { S.day = 40; G.wantedIn = () => ["x"]; },
    ];
    const meetable = {};
    for (const e of evs.filter((x) => x.w > 0 && x.c2)) {
      const locs = Object.keys(D.LOCS);
      let done = false;
      for (const setup of setups) {
        for (const loc of locs) {
          const S = start(loc);
          const w0 = G.wantedIn;
          setup(S);
          S.loc = loc;
          const tags = G.eventTags();
          const can = e.where.some((w) => tags.includes(w)) && (!e.cond || e.cond(S));
          G.wantedIn = w0;
          if (!can) continue;
          G.startEvent(e.id);
          for (const id of ids(e)) if (G.c2Met(id, S)) meetable[id] = true;
          done = true;
          break;
        }
        if (done) break;
      }
      if (!done) F(`出来事 ${e.id} が、どの場所・状態でも起きない`);
    }
    for (const [id, p] of Object.entries(P)) if (!meetable[id]) F(`${p.name}に出会えない（ふつうに起きる出来事が無い）`);
  }

  // ---------------------------------------------------------------- 古いセーブ
  try {
    const S = start("nerva");
    G.c2Join("dil");
    delete S.c2;
    S.companions.forEach((c) => { delete c.c2; });
    for (let i = 0; i < 40 && !S.over; i++) { const l = G.actions().flatMap((x) => x.list).filter((x) => !x.disabled); G.act(l[Math.floor(G.rand() * l.length)].id); }
    G.c2State(S);
  } catch (e) { F("古いセーブで例外 " + (e.stack || e)); }

  // ---------------------------------------------------------------- ランダムに遊ぶ（tests/run.mjs と同じ遊ばせ方）
  const R = loadEngine();
  const RD = R.data;
  const GAMES = 150;
  const met = {}, joined = {}, talks = {};
  let leftover = 0;
  for (let g = 0; g < GAMES; g++) {
    R.rand = seeded(1000 + g);
    R.P = { trophies: {}, graves: [] };
    const cls = Object.keys(RD.CLASSES)[g % 5];
    const st = {}, cp = {};
    RD.STATS.forEach((k) => { st[k] = RD.CLASSES[cls].base[k] + 5; cp[k] = st[k] + 30; });
    R.newGame({ cls, stats: st, caps: cp, goal: Object.keys(RD.GOALS)[g % 4], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    if (g % 3 === 0) { R.S.gold = 5000; R.S.fame = 700; }
    if (g % 4 === 0) {
      RD.STATS.forEach((k) => { R.S.stats[k] = 80; R.S.caps[k] = 95; });
      R.S.maxHp = R.maxHpOf(R.S.stats); R.S.hp = R.S.maxHp; R.S.maxMp = R.maxMpOf(R.S.stats); R.S.mp = R.S.maxMp;
      R.give("volgrim"); R.equip("volgrim");
    }
    try {
      for (let step = 0; step < 500 && !R.S.over; step++) {
        const l = R.actions().flatMap((x) => x.list).filter((x) => !x.disabled);
        if (!l.length) { F(`ランダム ${g}: できる行動が無い`); break; }
        R.act(l[Math.floor(R.rand() * l.length)].id);
        if (R.S.mode === "event" && /^c2_t_/.test(R.S.event || "")) talks[R.S.event] = (talks[R.S.event] || 0) + 1;
      }
    } catch (e) { F(`ランダム ${g}: 例外 ${e.stack || e}`); }
    if (R.S.log.some((x) => /\{[a-z_0-9]+\}/.test(x.text || ""))) leftover++;
    for (const id of Object.keys(R.S.c2?.met || {})) met[id] = (met[id] || 0) + 1;
    for (const id of Object.keys(R.S.c2?.joined || {})) joined[id] = (joined[id] || 0) + 1;
  }
  if (leftover) F(`ランダムプレイで、文に置き換えが残った冒険が ${leftover}`);
  const line = (o) => Object.entries(P).filter(([id]) => o[id]).sort((a, b) => o[b[0]] - o[a[0]]).map(([id, p]) => `${p.name} ${o[id]}`).join("・") || "なし";
  const metN = Object.keys(met).length;
  console.log(`NOTE C2 ランダムに ${GAMES} 回遊んだ（tests/run.mjs と同じ遊ばせ方）: 出会えた人物 ${metN}/${Object.keys(P).length}（冒険の数）: ${line(met)}`);
  console.log(`NOTE C2 仲間になった（冒険の数）: ${line(joined)} ／ その人だけの話 ${Object.values(talks).reduce((a, b) => a + b, 0)} 回`);
  if (metN < 10) F(`ランダムプレイで出会えた人物が少ない（${metN}）`);
  if (!Object.keys(joined).length) F("ランダムプレイで、誰も仲間にならない");

  if (!n) ok(`C2 キャラメモの人物（${Object.keys(P).length} 人・仲間になる ${JOIN.length} 人・出来事 ${evs.length}・出会い→仲間・誘う・去る・続き物・全員に出会える・古いセーブ）`);
};
