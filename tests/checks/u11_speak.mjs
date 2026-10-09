// U11：台詞の話し手の印（engine/zzzzzzz_u11_speaker.js が記録の e.speaker に付ける）と、それを見て立ち絵を出す決まり（ui/zu11_cast.js）
// - 話し手の決め方（台詞の直前の文の主語・「名前「」の形・台詞の直後の名前・その場にいる出来事の人）。迷うなら印を付けない
// - 話し手でない名前（台詞の中で呼ばれた・地の文に出ただけ・別の主語の文のあと）では印が付かない＝立ち絵は出ない
// - 依頼の場面でその場にいない依頼人・王城にいるだけの主・店では出ない。印のある台詞では出る
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const read = (p) => readFileSync(fileURLToPath(new URL("../../src/ui/" + p, import.meta.url)), "utf8");

export default ({ G, fail, ok, seeded }) => {
  let bad = 0;
  const no = (m) => { bad++; fail(m); };
  const D = G.data;
  const SP = G.u11sp;
  if (!SP || !SP.speakersOf) { fail("G.u11sp（話し手の印）が無い"); return; }

  // ---------------------------------------------------------------- 決め方（文だけで）
  const cands = [{ key: "ev:x", name: "グスタフ" }, { key: "comp:a", name: "ナタリア" }, { key: "p:mina", name: "ミーナ" }].sort((a, b) => b.name.length - a.name.length);
  const ev = { key: "ev:x", names: ["グスタフ"] };
  const cases = [
    ["「助かったよ」グスタフは粉だらけの手で頭をかいた。", null, ["ev:x"]],
    ["パン屋のグスタフが言った。「代金はこれで」", null, ["ev:x"]],
    ["ナタリア「やるじゃない」", null, ["comp:a"]],
    ["ナタリアは杯の縁を指で弾いた。「空き樽の匂いを嗅いで育ったの」", null, ["comp:a"]],
    ["門番に鼻で笑われた。「無名ごときがグスタフに会えると思うな」", null, []],
    ["相手は言伝を聞くなり青ざめた。「それは、果たし状の決まり文句だ」ミーナは、言葉の意味を言わずにあなたを使った。", null, []],
    ["あなたは言った。「行こう」", ev, []],
    ["老人は目を細めた。「わしの祖父さまが若いころ……」", ev, ["ev:x"]],
    ["老人は目を細めた。「わしの祖父さまが若いころ……」", null, []],
    ["子どもたちが「しっぽを踏んだら七年不作」と歌っている。ナタリアは笑った。", null, []],
    ["グスタフの地下室の階段を降りると、暗がりの奥で、何かが粉袋を食い破る音がした。", ev, []],
    ["「行くよ」ナタリアが言った。グスタフは肩をすくめた。「はいはい」", null, ["comp:a", "ev:x"]],
  ];
  cases.forEach(([t, e, want]) => {
    const got = SP.speakersOf(t, cands, e);
    if (JSON.stringify(got) !== JSON.stringify(want)) no(`話し手が違う：「${t.slice(0, 30)}…」→ ${JSON.stringify(got)}（${JSON.stringify(want)} のはず）`);
  });

  // ---------------------------------------------------------------- 実際の記録に付く印と、立ち絵
  vm.runInContext(["art_people.js", "v5_stand.js", "v9_pc.js", "zu11_cast.js"].map(read).join("\n"), vm.createContext({ globalThis: { G } }));
  const u = G.u11;
  G.portraitArt = () => ({});
  G.P = { trophies: {}, graves: [] };
  G.rand = seeded(4242);
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 60])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  const S = G.S;
  const turn = (...lines) => { G.log("you", "何かする"); lines.forEach((x) => (Array.isArray(x) ? G.log(x[0], x[1]) : G.say(x))); };
  const evAt = (id, who) => { if (!D.EVENTS.some((e) => e.id === id)) D.EVENTS.push({ id, where: [], w: 0, title: id, text: "", choices: [], who }); S.mode = "event"; S.event = id; };
  const shown = () => !!G.stand.whoOf(S);

  // 持ち主の再現例：依頼の実行の場面に、その場にいない依頼主（村の長老のフリーダ）が立っていた
  evAt("u11t_rescue", { kind: "elder", sex: "女", seed: "q5:t", name: "村の長老のフリーダ" });
  turn(["title", "白銀の丘陵から娘のドーレを"], "白銀の丘陵の奥の窪地に、見張りのゴブリンが二体。その向こうの檻に、娘のドーレが座り込んでいる。まだ、生きている。");
  if (shown()) no("台詞の無い依頼の場面に、依頼主が立つ");
  turn("檻の戸を開けると、ドーレは泣きながら笑った。「フリーダばあちゃんに、怒られちゃう」");
  if (shown()) no("台詞の中で名前を呼ばれただけの依頼主が立つ");
  turn("フリーダは杖を置いて、深く頭を下げた。「孫を、ありがとう」");
  if (!shown()) no("依頼主の台詞（地の文に名前）なのに立たない");
  const last = S.log[S.log.length - 1];
  if (last.speaker !== "ev:u11t_rescue") no(`依頼主の台詞の印が違う：${last.speaker}`);

  // 名前を書いていない出来事の人（その場にいる）
  evAt("u11t_elder", "elder");
  turn("粉だらけの老人が、あなたの顔をじっと見た。「わしの祖父さまが若いころ……」");
  if (!shown()) no("名前を書いていない出来事の人の台詞なのに立たない");
  turn("老人は黙って、店の奥へ戻っていった。");
  if (shown()) no("台詞の無い手番でも、出来事の人が立ったまま");

  // 王城：主の話が出るだけでは立たない
  S.mode = "fac"; S.fac = "castle"; S.loc = "leavel"; S.event = null;
  turn("白い大理石の謁見の間。灰銀の髪の国王ヴァレオンは、化け物の足跡を追って城を空けがちだと、侍従が言った。");
  if (shown()) no("王城の主が、話していないのに立つ");
  turn("門番に鼻で笑われた。「無名ごときが国王ヴァレオンに会えると思うな」");
  if (shown()) no("門番の台詞の中で呼ばれただけの王城の主が立つ");
  for (const f of ["shop", "guild", "inn"]) {
    S.fac = f; S.loc = "karna";
    turn("店の主が帳面をめくっている。「いらっしゃい」");
    if (shown()) no(`${f} で、名のある人が話していないのに人が立つ`);
  }
  S.mode = "explore"; S.fac = null;

  // 仲間：台詞の中で呼ばれただけでは話していない
  const id = Object.keys(D.C2_PEOPLE || {}).find((x) => G.c2Join && G.c2Join(x));
  const c = id && S.companions[0];
  if (c) {
    turn(`老人は言った。「${c.name}によろしく」`);
    if (u.speakingComps(S).includes(c.id)) no("台詞の中で名前を呼ばれただけの仲間が、話していることになる");
    turn(`「行くよ」${c.name}が言った。`);
    if (!u.speakingComps(S).includes(c.id)) no("仲間の台詞に印が付かない");
  }
  // 古い記録（印の無い台詞）では出さない
  evAt("u11t_old", { kind: "villager", name: "パン屋のグスタフ" });
  S.log.push({ k: "you", text: "古い記録" }, { k: "nar", text: "「助かったよ」グスタフは頭をかいた。" });
  if (shown()) no("印の無い古い記録の台詞で立つ");
  S.mode = "explore"; S.event = null;

  if (!bad) ok(`U11：台詞の話し手の印（決め方 ${cases.length} 通り・依頼の場面・王城・店・仲間・古い記録）`);
};
