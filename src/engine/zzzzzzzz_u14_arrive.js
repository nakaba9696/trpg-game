// U14：着いたときの語り。持ち主の声「急に街に着いて、上の方に小さく語りが入ってるので分かりにくい」
// G.arrive を一番外から包み（名前の z の数で、ほかの包み W6・Q5・Q8 などより後に読まれる）、着く前の旅の様子（S.w6）を読んでから着かせる。
//   ・場所の見出しのすぐ後に、どうやって着いたか（歩いて何日・船で何日）を一行。旅をせずに着いたとき（はじめの町・古いセーブ）は書かない
//   ・はじめての町なら、もう一行
//   ・画面（ui/u14_scenes.js）のために、着いたことを S.u14arr に残す：{ loc, from, sea, days, first, town, turn, day }。古いセーブに無くても動く
// 乱数は使わない（行の選び分けは日付と場所から決める。テストの乱数の流れを変えない）。DOM には触らない。レーン U（U14）
(function (G) {
  const D = G.data;
  const U14 = (G.u14 = G.u14 || {});
  const KAN = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  // 日数を漢数字で（九十九日まで。C16：旅が 1〜3 週間になったので十日を超える）
  U14.kan = (n) => (n <= 10 ? KAN[n] : n < 20 ? "十" + KAN[n - 10] : n < 100 ? KAN[Math.floor(n / 10)] + "十" + (n % 10 ? KAN[n % 10] : "") : String(n));
  U14.days = (n) => (n > 0 && n < 100 ? U14.kan(n) + "日" : `${n}日`);
  const pickBy = (list, k) => list[Math.abs(k | 0) % list.length];
  const hash = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) | 0; return x; };

  // どうやって着いたか（一行）。sea 船、days 日数、type 着いた場所の種類（town／wild／dungeon）
  U14.howLine = (o, k) => {
    const d = U14.days(Math.max(1, o.days || 1));
    if (o.sea) return pickBy([
      `${d}の船旅を終えて、桟橋に降りる。足もとが、まだ揺れている気がする。`,
      `${d}揺られた船を降りる。潮で固くなった外套が、肩に重い。`,
      `船の渡し板がきしむ。${d}ぶりの、揺れない地面だ。`,
    ], k);
    if (o.type === "town") return pickBy([
      `${d}の道のりを歩き通して、町の門をくぐる。`,
      `${d}歩いた足で、町の石畳を踏む。靴の底が、土の道を覚えている。`,
      `門番があなたの顔と荷を一度ずつ見て、顎で通れと示す。${d}の旅の埃が、まだ肩に残っている。`,
    ], k);
    if (o.type === "dungeon") return pickBy([
      `${d}の道のりの末、入口の前に立つ。中から、冷えた空気が吐き出されてくる。`,
      `${d}歩いて、ここまで来た。足もとの石が、外の道とは違う色をしている。`,
    ], k);
    return pickBy([
      `${d}歩いて、道が細くなっていく。`,
      `${d}の道のりのあいだに、人家の煙が見えなくなった。`,
      `${d}歩いた。ここから先は、道と呼べるものが少ない。`,
    ], k);
  };
  // はじめての町の一言
  U14.firstLine = (k) => pickBy([
    "はじめて来る町だ。通りの名前も、どの店がまともかも、まだ知らない。",
    "見知らぬ町の匂いがする。ここでは、誰もあなたの顔を知らない。",
    "はじめての町。道を尋ねる相手を選ぶところから始まる。",
  ], k);

  const arrive0 = G.arrive;
  if (!arrive0) return;
  G.arrive = (dest) => {
    const S = G.S;
    if (!S) return arrive0(dest);
    const w = S.w6;
    const from = S.loc;
    const first = !(S.visited && S.visited[dest]);
    const mark = S.log.length ? S.log[S.log.length - 1] : null;
    const r = arrive0(dest);
    if (S.loc !== dest) return r; // 着かなかった（ほかの包みが行き先を変えた）
    const L = D.LOCS[dest] || {};
    const traveled = !!(w && from !== dest);
    const town = L.type === "town";
    S.u14arr = { loc: dest, from, sea: !!(traveled && w.sea), days: traveled ? w.days || 1 : 0, first, town, turn: S.turn, day: S.day };
    // 足す行は、この到着で書かれた場所の見出しのすぐ後ろ（説明の前）に入れる
    const start = mark ? S.log.lastIndexOf(mark) + 1 : 0;
    let at = -1;
    for (let i = S.log.length - 1; i >= start; i--) if (S.log[i].k === "title" && S.log[i].text === L.name) { at = i; break; }
    if (at < 0) return r;
    S.log[at].u14 = G.date ? G.date() : ""; // 場所の見出しに日付を添える（画面の区切り）
    const k = hash(dest) + (S.day || 0);
    const lines = [];
    if (traveled) lines.push({ k: "nar", text: U14.howLine({ sea: !!w.sea, days: w.days, type: L.type }, k) });
    if (first && town) lines.push({ k: "nar", text: U14.firstLine(k) });
    if (lines.length) S.log.splice(at + 1, 0, ...lines);
    if (S.log.length > 240) S.log.splice(0, S.log.length - 240);
    return r;
  };
})(globalThis.G = globalThis.G || {});
