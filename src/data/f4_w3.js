// W3：名のある人の予定（D.F4_SCHEDULE。書き方は docs/f4_schedule.md）に、新しい場所を足す
// ゼリナ（市の立つ町を渡る商人）は、夏の終わりに港の商都カルメラントの両替市へ回る
// レーン W（W3）。f4_roster.js のあとに読まれる
(function (G) {
  const D = (G.data = G.data || {});
  const S = D.F4_SCHEDULE;
  if (!S || !D.LOCS || !D.LOCS.w3_carmeland) return;
  if (S.zerina) S.zerina = [
    ...S.zerina.filter((p) => p.from !== "夏"),
    { from: 91, to: 135, loc: "nerva", note: "夏のはじめは港町で、船の荷を買い叩いている" },
    { from: 136, to: 180, loc: "w3_carmeland", note: "夏の終わりは港の商都の両替市で、異国の銀貨を量っている" },
  ];
})(globalThis.G = globalThis.G || {});
