// #123：ノラミは犬の獣人
// - 犬（dog）の獣が R1 の表にあり、作成画面で選べる（D.BEAST_KEYS）
// - ノラミの人物データと絵の look が dog
// - 古いセーブ（仲間の欄に beast: "wolf" が残っている）でも、犬の獣人として読む
export default ({ fail, loadEngine }) => {
  const G = loadEngine();
  const D = G.data;
  const B = D.BEASTS.dog;
  if (!B) return fail("犬（dog）の獣が D.BEASTS に無い");
  if (!B.name || !B.blurb || !B.temper) fail("犬の獣に名前・説明・気性が無い");
  if (!D.BEAST_KEYS.includes("dog")) fail("犬が D.BEAST_KEYS に無い（作成画面で選べない）");
  if (!(B.traits || []).includes("nose")) fail("犬の鼻が利かない");
  if (G.r1Name({ race: "beast", beast: "dog" }) !== "犬の獣人") fail(`犬の呼び名がおかしい：${G.r1Name({ race: "beast", beast: "dog" })}`);

  const p = D.C2_PEOPLE.nora;
  if (!p) return fail("ノラミ（nora）が C2_PEOPLE に無い");
  if (p.race !== "beast" || p.beast !== "dog") fail(`ノラミが犬の獣人でない：${p.race}/${p.beast}`);
  if (p.who.look.beast !== "dog") fail(`ノラミの絵の耳が犬でない：${p.who.look.beast}`);

  const c = G.c2Make("nora");
  if (G.r1CompLabel(c) !== "犬の獣人") fail(`仲間のノラが犬の獣人と出ない：${G.r1CompLabel(c)}`);
  // 古いセーブ：仲間の欄に狼が残っている
  const old = Object.assign({}, c, { beast: "wolf", who: Object.assign({}, c.who, { look: Object.assign({}, c.who.look, { beast: "wolf" }) }) });
  const r = G.r1Comp(old);
  if (r.race !== "beast" || r.beast !== "dog") fail(`古いセーブのノラが犬として読まれない：${r.race}/${r.beast}`);
  // ほかの名のある狼（ヴァルグ）はそのまま
  if (D.C2_PEOPLE.valg && G.r1Comp(G.c2Make ? { c2: "valg", race: "beast", beast: "wolf" } : {}).beast !== "wolf") fail("ヴァルグまで犬になった");
  // 名の無い仲間は欄のまま
  if (G.r1Comp({ name: "ガルド", race: "beast", beast: "wolf" }).beast !== "wolf") fail("名の無い狼の仲間が狼でなくなった");
};
