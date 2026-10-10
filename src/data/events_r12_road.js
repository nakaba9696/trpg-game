// R12：道中の会話（焚き火・野営・歩きながら・船べり）。仕組みは src/engine/zzzzzzzzzzzzzzzzzzzz_r12_road.js の頭
// 出来事の文は場面だけ。仲間の言葉（出だし）は、その仲間の会話の表（D.TALK）か性格（D.M2_TRAITS）から仕組みが足す。
// 選択肢の結果の tone（返し方）に、仲間の好みで好感度が動き、仲間の様子が一行出る。地の文に仲間の台詞は書かない（口調は出だしに任せる）
// レーン W＋V（R12）
(function (G) {
  const D = (G.data = G.data || {});
  const pick = (c) => (c.bond || 0) > 15;

  D.EVENTS.push(
    {
      id: "r12c_fire", where: ["r12"], w: 0, r12: "talk", open: "camp", m2: { pick }, title: "焚き火を挟んで",
      text: "日が落ちて、街道から少し外れた窪地で火を起こした。湯が沸くのを待つあいだ、{n}が向かいに腰を下ろす。",
      choices: [
        { label: "身の上を聞いてみる", ok: { text: "あなたは、これまでどこで何をしてきたのかと尋ねた。", tone: "earnest" } },
        { label: "昼間の失敗を笑い話にする", ok: { text: "あなたは昼に水たまりへ片足を突っこんだ話を、少し盛って話した。", tone: "joke" } },
        { label: "いびきがうるさいとからかう", ok: { text: "あなたは昨夜の{n}のいびきを、なるべく似せて真似てみせた。", tone: "tease" } },
        { label: "黙って火に枝をくべる", ok: { text: "あなたは何も言わずに、乾いた枝を一本ずつ火にくべた。", tone: "quiet" } },
      ],
    },
    {
      id: "r12c_watch", where: ["r12"], w: 0, r12: "talk", open: "camp", m2: { pick }, title: "夜番の交代",
      text: "夜半、肩を揺すられて目を覚ます。夜番の交代の時刻だった。{n}はすぐには横にならず、毛布を肩にかけたまま火のそばに座っている。",
      choices: [
        { label: "「寒くないか」と毛布を足してやる", ok: { text: "あなたは自分の外套を{n}の膝にかけた。", tone: "sweet" } },
        { label: "眠れないわけを尋ねる", ok: { text: "あなたは、眠れないのかと小さな声で聞いた。", tone: "earnest" } },
        { label: "「寝ぼけ顔だな」とからかう", ok: { text: "あなたは{n}の寝癖を指さした。", tone: "tease" } },
        { label: "並んで星を見上げる", ok: { text: "あなたは何も言わずに隣へ座り、空を見上げた。", tone: "quiet" } },
      ],
    },
    {
      id: "r12c_walk", where: ["r12"], w: 0, r12: "talk", open: "greet", m2: { pick }, title: "歩きながら",
      text: "まっすぐな道が、丘の向こうまで続いている。荷を背負い直すと、{n}が歩調を合わせて隣に並んだ。",
      choices: [
        { label: "この前の戦いぶりを褒める", ok: { text: "あなたは、この前の戦いで{n}が見せた動きを褒めた。", tone: "praise" } },
        { label: "次の町で何を食べるか話す", ok: { text: "あなたは次の町の名物を三つ挙げ、どれから食べるかで真剣に悩んでみせた。", tone: "joke" } },
        { label: "旅のわけを聞く", ok: { text: "あなたは、どうしてこの旅についてきたのかと聞いた。", tone: "earnest" } },
        { label: "黙って歩く", ok: { text: "あなたは何も言わず、自分の足音を数えながら歩いた。", tone: "quiet" } },
      ],
    },
    {
      id: "r12c_rest", where: ["r12"], w: 0, r12: "talk", open: "greet", m2: { pick }, title: "昼の木陰",
      text: "日が高くなり、道ばたの大きな木の下で荷を下ろした。干し肉を分けると、{n}は木の根に背をもたせて足を投げ出した。",
      choices: [
        { label: "荷を担ぐ腕を褒める", ok: { text: "あなたは、{n}がいちばん重い荷を黙って担いでいることに触れた。", tone: "praise" } },
        { label: "「もうへばったのか」とからかう", ok: { text: "あなたは投げ出された足を、靴の先で軽く蹴った。", tone: "tease" } },
        { label: "干し肉の味にけちをつけて笑う", ok: { text: "あなたは、この干し肉は靴底の親戚に違いないと言った。", tone: "joke" } },
        { label: "目を閉じて休む", ok: { text: "あなたは目を閉じ、葉擦れの音を聞いていた。", tone: "quiet", hp: 2 } },
      ],
    },
    {
      id: "r12c_deck", where: ["r12"], w: 0, r12: "talk", open: "greet", on: "sea", m2: { pick }, title: "船べりで",
      text: "風が帆を鳴らしている。甲板の端で波を眺めていると、{n}が手すりにもたれて隣に来た。",
      choices: [
        { label: "船酔いを気づかう", ok: { text: "あなたは、気分は悪くないかと尋ね、水筒を差し出した。", tone: "sweet" } },
        { label: "陸に上がったら何をするか聞く", ok: { text: "あなたは、着いたら最初に何をしたいかと聞いた。", tone: "earnest" } },
        { label: "カモメに帽子を取られそうだと笑う", ok: { text: "あなたは、さっきから{n}の頭の上を回っているカモメを指さした。", tone: "joke" } },
        { label: "黙って波を見る", ok: { text: "あなたは何も言わず、白い波が後ろへ流れていくのを見ていた。", tone: "quiet" } },
      ],
    },
  );
  // 絵は主役の仲間の顔
  D.EVENTS.filter((e) => e.r12 === "talk").forEach((e) => Object.defineProperty(e, "who", { get: () => G.m2Who(), enumerable: true, configurable: true }));
})(globalThis.G = globalThis.G || {});
