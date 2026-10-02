// F3：人物図鑑の人柄と好感度（src/data/f2_people.js・src/engine/zzz_f3_affinity.js・src/data/zz_f3_affinity_events.js・src/ui/f2_codex.js）
// - 人物図鑑に「人柄」の欄が無い。前の人柄の一言（口癖・話し方・しぐさ）は、全員の紹介文に溶けている
// - 名のある人物は全員、−100〜+100 の好感度を持つ。今の冒険で会っていなければ null（図鑑は「—」）。マイナスに入る出来事がある
// - 仲間の bond と同じ一つの数（bond = (aff + 100) / 2）。加わったときの数・裏切りの閾値は今まで通り
// - 古いセーブ（S.aff が無い）で動く。通知は M2 の形
import { readFileSync } from "node:fs";

// 前の face（人柄の一言）から、紹介文に残っているはずの言葉（口癖そのものではなく、ぼかした言い方）
// 口癖・台詞をそのまま書き写さない（持ち主：「独特な喋り方をする少女」のように）
const QUIRKS = /「うん|〜っす|っす」|おばさん|タスク|今のは見ていなかった|ボクと呼ぶ/;
const FACE = {
  dil: "悪知恵", kaidel: "殴る", nora: "勘が鋭", sheila: "独特な喋り方", rui: "無口", zerina: "何でも売る", elnea: "物言い", natalia: "酒癖",
  valeon: "好戦家", raios: "高笑い", serios: "天才肌", farina: "笑", greol: "口下手", neilas: "話すのが苦手", tiria: "愛され", sixth: "寡黙",
  angelica: "歳のこと", captain: "任務に忠実", doctor: "知りたいことしか見て", hermes: "変わり者", yurina: "飄々", ferida: "雷突の乙女", sig: "戦場の鉄塊",
  raisha: "気だるげ", zork: "首狩りゾルク", bride: "めちゃくちゃ強い", boku: "ボーイッシュ", greiol: "現実主義者", dario: "氷壁の父", erna: "命令",
  valg: "荒々しい", malvina: "仄かに光る", katia: "努力家", alicia: "女王のような圧", chancellor: "表情を", gaston: "情けない顔", joachim: "もう人を殺したくない",
  mirza: "微笑", zalve: "全部は言わない", borg: "熊のような大男", aurelia: "慈悲深", yoihime: "祭りと賽遊び", konoha: "いかさまの名人", mordu: "穏やか",
  berna: "嘴の仮面", azlag: "無かったことに", chezar: "駒", yura: "いつも眠って", walker: "何でも珍しそうに喜ぶ", captain_east: "帰らなかった",
  hans: "宿帳の年齢の欄", greta: "世話焼き", gert: "粉だらけ", albert: "眼鏡", dominik: "怒る", neumann: "じっと見せる",
};

export default ({ G, fail }) => {
  const D = G.data;
  let n = 0;
  const F = (m) => { n++; fail("F3: " + m); };
  const P = D.F2_PEOPLE;

  // ---------------------------------------------------------------- 人柄の欄が無い・紹介に溶けている
  const ui = readFileSync(new URL("../../src/ui/f2_codex.js", import.meta.url), "utf8");
  if (/"人柄"/.test(ui) || /q\.face/.test(ui)) F("人物図鑑に「人柄」の欄が残っている");
  for (const [id, q] of Object.entries(P)) {
    if (q.face !== undefined) F(`${id} に face が残っている（紹介文に溶かす）`);
    if (!FACE[id]) F(`${id} の前の人柄の言葉が、確認の表に無い`);
    else if (!(q.lines || []).join("").includes(FACE[id])) F(`${id} の紹介に、前の人柄（${FACE[id]}）が入っていない`);
    if ((q.lines || []).some((l) => /^「/.test(l))) F(`${id} の紹介が人柄の一言を貼っただけに見える`);
    const qk = (q.lines || []).join("").match(QUIRKS);
    if (qk) F(`${id} の紹介に口癖をそのまま書いている（${qk[0]}）`);
  }
  for (const id of Object.keys(FACE)) if (!P[id]) F(`表の ${id} が人物図鑑に無い`);
  for (const id of Object.keys(D.C2_PEOPLE)) if (!P[id]) F(`C2 の ${id} が人物図鑑に無い`);

  // ---------------------------------------------------------------- 出来事に足した好感度
  if (D.F3_AFF_MISS.length) F(`好感度を足す出来事が見つからない：${D.F3_AFF_MISS.join("、")}`);
  const negs = D.EVENTS.filter((e) => e.choices.some((c) => [c.ok, c.ng].some((o) => o && o.aff && Object.values(o.aff).some((v) => v < 0))));
  if (negs.length < 4) F(`好感度がマイナスに入る出来事が ${negs.length} 件しかない`);
  for (const e of D.EVENTS) for (const c of e.choices) for (const o of [c.ok, c.ng]) if (o && o.aff) for (const id of Object.keys(o.aff)) if (!G.f3.has(id)) F(`${e.id} の好感度の相手 ${id} が名のある人物でない`);

  // ---------------------------------------------------------------- 遊ぶ
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  const start = (loc) => {
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 24, history: "テスト用", personality: "無口" } });
    G.S.maxHp = G.S.hp = 999;
    G.S.gold = 500;
    if (loc) { G.S.loc = loc; G.S.visited[loc] = true; }
    return G.S;
  };
  const choose = (part) => {
    const c = G.eventChoices().find(({ c }) => G.m2Fill(c.label).includes(part));
    if (!c) { F(`出来事 ${G.S.event} に「${part}」が無い`); return; }
    G.act("ev:" + c.i);
  };
  const lastNotes = (S, k) => S.log.slice(-k).map((l) => l.text).join("\n");

  // 会っていない人は null、会うと 0
  let S = start("leavel");
  if (G.affOf("angelica") !== null) F("会っていない人の好感度が null でない");
  G.startEvent("c2_ange1");
  if (G.affOf("angelica") !== 0 || G.affOf("captain") !== 0) F(`会った人の好感度が 0 でない（${G.affOf("angelica")}）`);
  choose("おばさん");
  if (G.affOf("angelica") !== -35) F(`「おばさん」で好感度がマイナスに入らない（${G.affOf("angelica")}）`);
  if (G.affWord(-35) !== "警戒") F(`−35 の言葉が ${G.affWord(-35)}`);
  if (!/アンジェリカの好感度 -35（-35・警戒）/.test(lastNotes(S, 12))) F("好感度の通知が M2 の形でない");
  G.affAdd("angelica", -500);
  if (G.affOf("angelica") !== -100 || G.affWord(-100) !== "憎んでいる") F("好感度が −100 で止まらないか、言葉が違う");
  G.affAdd("angelica", 900, true);
  if (G.affOf("angelica") !== 100 || G.affWord(100) !== "慕っている") F("好感度が +100 で止まらないか、言葉が違う");
  const words = new Set([-100, -60, -30, 0, 20, 45, 80].map(G.affWord));
  if (words.size !== 7) F(`好感度の言葉の段階が足りない（${[...words].join("・")}）`);

  // 冒険ごとにやり直す
  S = start("leavel");
  if (G.affOf("angelica") !== null || Object.keys(S.aff || {}).length) F("新しい冒険に前の好感度が残る");

  // 仲間の bond と同じ数
  S = start("leavel");
  G.c2Meet("sheila");
  if (!G.c2Join("sheila")) F("シェイラが仲間にならない");
  const c = S.companions.find((x) => x.c2 === "sheila");
  if (c) {
    const jb = D.C2_PEOPLE.sheila.join.bond;
    if (c.bond !== jb) F(`初対面で加わったシェイラの bond が ${c.bond}（シートは ${jb}）`);
    if (G.affOf("sheila") !== jb * 2 - 100) F(`シェイラの好感度 ${G.affOf("sheila")} が bond ${c.bond} と揃わない`);
    G.m2Bond(c, -10);
    if (G.affOf("sheila") !== (jb - 10) * 2 - 100) F("M2 の bond を動かしても好感度が動かない");
    if (!/シェイラの好感度 -20（/.test(lastNotes(S, 3))) F("仲間の好感度の通知が好感度の目盛りでない");
    G.affAdd("sheila", 10, true);
    if (c.bond !== jb - 5) F(`好感度を動かしても bond が動かない（${c.bond}）`);
    G.affAdd("sheila", -200, true);
    if (!(c.bond <= 15) || G.affWord(G.affOf("sheila")) !== "憎んでいる") F("好感度 −100 の仲間が、裏切りの閾値（bond 15 以下）に入らない");
    G.affAdd("sheila", 140, true);
    const saved = JSON.parse(JSON.stringify(S));
    if (saved.companions.find((x) => x.c2 === "sheila").bond !== 70 || saved.aff.sheila !== 40) F("セーブの bond と好感度が揃わない");
    const talk = G.exploreActions().flatMap((g) => g.list).find((a) => a.id === "m2talk:" + c.id);
    if (!talk || !/（40）/.test(talk.sub)) F(`「話す」の好感度が目盛りにそろわない（${talk && talk.sub}）`);
  }
  // 前の冒険の会った人の好感度を持って加わる
  S = start("leavel");
  G.affAdd("sheila", -30, true);
  G.c2Join("sheila");
  if (G.affOf("sheila") !== D.C2_PEOPLE.sheila.join.bond * 2 - 100 - 30) F("加わる前の好感度が、加わったあとの数に残らない");

  // F2 の named の人（ふつうの仲間の加わり方）
  S = start("w2_dranherz");
  G.startEvent("deserter_help");
  choose("火を焚いて助ける");
  const jo = S.companions.find((x) => x.name === "脱走兵ヨアヒム");
  if (!jo || jo.aff !== "joachim" || G.affOf("joachim") !== jo.bond * 2 - 100) F("ヨアヒムが仲間になっても、好感度と bond が揃わない");

  // 古いセーブ（S.aff が無い・仲間の bond だけある）
  S = start("leavel");
  G.c2Join("dil");
  const old = JSON.parse(JSON.stringify(S));
  delete old.aff;
  old.companions[0].bond = 80;
  G.S = old;
  if (G.affOf("dil") !== 60) F(`古いセーブの仲間の bond 80 が好感度 60 にならない（${G.affOf("dil")}）`);
  G.m2State(old);
  G.m2Bond(old.companions[0], 5, true);
  if (old.aff.dil !== 70) F("古いセーブの仲間で、bond と好感度が揃わない");
  delete old.aff;
  old.c2 = { met: { valeon: 1 } };
  if (G.affOf("valeon") !== 0 || G.affOf("raios") !== null) F("古いセーブで、会った人の好感度が 0・会っていない人が null にならない");
  G.affAdd("valeon", 7, true);
  if (old.aff.valeon !== 7) F("古いセーブで好感度を動かせない");

  if (!n) console.log(`  F3: 人物 ${Object.keys(P).length} 人・マイナスに入る出来事 ${negs.length} 件`);
};
