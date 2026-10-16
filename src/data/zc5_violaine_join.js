// C5 の続き：仲間になったヴィオレーヌ（events_c5_violaine_join.js）の口調の表（K10）・恋の相手の一覧（Q8）・恋人の条件（Q8）。
// 名前の頭の zc5_ は、k10_voice.js・q8_pairs.js・q8_love.js（どれも「D.X = {」で作る）より後に読ませるため。レーン C
(function (G) {
  const D = (G.data = G.data || {});
  const V = (i, you, o) => Object.assign({ i: [].concat(i), you: [].concat(you), also: [] }, o || {});
  if (D.K10_VOICE) D.K10_VOICE.violaine = V("わたし", "あなた", { reg: "polite", mates: "さん付け", tail: "短く硬い貴族の言葉。「〜です」「承知しました」。用件から言う。迷子のときだけ声が小さい" });
  if (D.Q8P && D.Q8P.ALLOW) D.Q8P.ALLOW.violaine = "人間（王都の剣の家の娘）";
  // 恋人の条件：王都に一緒に戻ってから（師に拾われた剣士団の稽古場の柵の外。会話の violaine_l_leavel で察せる）
  if (D.Q8L && D.Q8L.PEOPLE) D.Q8L.PEOPLE.violaine = { with: "leavel" };
})(globalThis.G = globalThis.G || {});
