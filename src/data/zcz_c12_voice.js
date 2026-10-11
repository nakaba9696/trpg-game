// C12：仲間の口調の表（K10。docs/voice_table.md）・恋の相手の一覧（Q8 の D.Q8P.ALLOW）・恋人になる条件（Q8 の D.Q8L.PEOPLE）に、C12 の人を足す。
// 元の表は k10_voice.js・q8_pairs.js・q8_love.js が「D.X = {」で作るので、名前の頭の zcz で、それより後に読ませて足す。
// レーン C（C12）
(function (G) {
  const D = (G.data = G.data || {});
  const V = (i, you, o) => Object.assign({ i: [].concat(i), you: [].concat(you), also: [] }, o || {});
  if (D.K10_VOICE) Object.assign(D.K10_VOICE, {
    ortensia: V("わたし", "あなた", { mates: "呼び捨て", tail: "ゆったりした大人の女。「〜かしら」「〜でしょう？」「ふうん」。問いを一つ投げて黙る" }),
    ismene: V("わたし", "あなた", { reg: "polite", mates: "呼び捨て", tail: "淡々とした丁寧語。「〜です」「記録します」「知りません。まだ」" }),
  });
  if (D.Q8P && D.Q8P.ALLOW) Object.assign(D.Q8P.ALLOW, {
    ortensia: "人間（沼の魔女。背の高い大人の女）",
    ismene: "エルフ（人の姿。耳が尖っているだけ）",
  });
  if (D.Q8L && D.Q8L.PEOPLE) Object.assign(D.Q8L.PEOPLE, {
    ortensia: { with: "swamp", clean: ["fraud"] },    // 沼の離れへ一緒に帰ってから。人の名を騙って売る者（偽の薬）は嫌い
    ismene: { arc: true, clean: ["forgery"] },        // 地下の写本の前に一緒に立つ。記録を偽る者には、余白を貸さない
  });
})(globalThis.G = globalThis.G || {});
