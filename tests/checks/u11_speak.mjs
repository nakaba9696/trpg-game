// U11：町の人・依頼主・名のある人も、その人の台詞が今の手番の記録にあるときだけ立ち絵を出す（src/ui/zu11_cast.js の G.u11.whoSpeaks。
// V5 の G.stand.whoOf を包むので、V5 の大きな立ち絵・V9 の並び・ui.js の小さな額のどれにも効く）
// - 名前が地の文に出ただけ（台詞の無い行）・依頼の場面で依頼主として紐づいているだけ（パン屋のグスタフ）・店や王城にいるだけでは出さない
// - 台詞の中で名前を呼ばれただけ（門番「国王ヴァレオンに会えると思うな」）でも出さない
// - 地の文に名前がある台詞の行（「……」グスタフは笑った）では出す。名前を書いていない出来事の人は、ほかの名のある人の台詞でなければ出す
// - 同じ手番の、出来事の見出しより前の行（町の描写の子どもの歌など）は、その人の台詞に数えない
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const read = (p) => readFileSync(fileURLToPath(new URL("../../src/ui/" + p, import.meta.url)), "utf8");

export default ({ G, fail, ok, seeded }) => {
  let bad = 0;
  const no = (m) => { bad++; fail(m); };
  const D = G.data;
  vm.runInContext(["art_people.js", "v5_stand.js", "v9_pc.js", "zu11_cast.js"].map(read).join("\n"), vm.createContext({ globalThis: { G } }));
  const u = G.u11;
  if (!u || !u.whoSpeaks) { fail("G.u11.whoSpeaks が無い"); return; }
  G.portraitArt = () => ({});
  G.P = { trophies: {}, graves: [] };
  G.rand = seeded(4242);
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 60])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  const S = G.S;
  const turn = (...lines) => { G.log("you", "何かする"); lines.forEach((x) => (Array.isArray(x) ? G.log(x[0], x[1]) : G.log("nar", x))); };
  const gustav = { kind: "villager", seed: "q5:test", name: "パン屋のグスタフ" };
  const king = { kind: "noble", seed: "c2:valeon", name: "国王ヴァレオン" };
  const plain = { kind: "elder", seed: "ev:test" };
  const said = (who, m) => { if (!u.whoSpeaks(who, S)) no(`話しているのに出ない：${m}`); };
  const quiet = (who, m) => { if (u.whoSpeaks(who, S)) no(`話していないのに出る：${m}`); };

  turn("グスタフの蔵の厄介者", "グスタフの地下室の階段を降りると、暗がりの奥で、何かが粉袋を食い破る音がした。");
  quiet(gustav, "依頼の場面で名前が地の文に出ただけ");
  turn(["title", "グスタフの蔵の厄介者"], "地下室は静かだ。");
  quiet(gustav, "台詞の無い出来事");
  turn("「助かったよ」グスタフは粉だらけの手で頭をかいた。");
  said(gustav, "地の文に名前のある台詞（グスタフ）");
  turn("パン屋のグスタフが言った。「代金はこれで」");
  said(gustav, "フルネームの台詞");
  turn("門番に鼻で笑われた。「無名ごときが国王ヴァレオンに会えると思うな」");
  quiet(king, "台詞の中で名前を呼ばれただけ");
  turn(["sys", "国王ヴァレオンの謁見は済んだ。"]);
  quiet(king, "記録の行（sys）");
  turn("老人は目を細めた。「わしの祖父さまが若いころ……」");
  said(plain, "名前を書いていない出来事の人の台詞");
  turn("子どもたちが「しっぽを踏んだら七年不作」と歌っている。", ["title", "古い井戸"], "井戸の縁に、苔が生えている。");
  quiet(plain, "出来事の見出しより前の、町の描写の台詞");
  const comp = Object.keys(D.C2_PEOPLE || {}).find((id) => G.c2Join && G.c2Join(id));
  const c = comp && S.companions[0];
  if (c) {
    turn(`「行くよ」${c.name}が言った。`);
    quiet(plain, "仲間の台詞を、名前の無い出来事の人の台詞と取り違える");
    turn(`老人は言った。「${c.name}によろしく」`);
    if (u.speakingComps(S).includes(c.id)) no("台詞の中で名前を呼ばれただけの仲間が、話していることになる");
  }

  // 実際の出来事・施設：依頼の場面（Q5 の殻）・店・ギルド・王城で、台詞の無い手番には誰も立たない
  const shell = D.EVENTS.find((e) => e.id === "q5_scene");
  if (!shell) no("依頼の場面（q5_scene）が無い");
  S.mode = "fac"; S.fac = "castle"; S.loc = "leavel";
  turn("白い大理石の謁見の間。玉座は、たいてい空いている。灰銀の髪の国王ヴァレオンは、化け物の足跡を追って城を空けがちだと、侍従が言った。");
  if (G.stand.whoOf(S)) no("王城の主が、話していないのに立つ");
  for (const f of ["shop", "guild", "inn"]) {
    S.fac = f; S.loc = "karna";
    turn("店の主が帳面をめくっている。");
    if (G.stand.whoOf(S)) no(`${f} で、誰も話していないのに人が立つ`);
  }
  S.mode = "explore"; S.fac = null;

  if (!bad) ok("U11：話していない人は立たない（依頼主・名前だけ・台詞の中の名前・王城・店）・話している人は立つ");
};
