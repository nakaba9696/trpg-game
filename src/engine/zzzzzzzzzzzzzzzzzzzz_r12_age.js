// R12：主人公が年を取る（R11 のプレイレビュー 中 19）。DOM には触らない。レーン C
// 年の変わり目（暦の年が進んだ最初の手番）に S.profile.age を一つ進め、ログに一行。人物の表（ui.openProfile）は S.profile.age をそのまま出す。
// 冒険は 1 日目（年のはじめ）から始まるので、歳は「始めたときの歳＋暦の年が何回変わったか」。仲間の歳はそのまま。
// セーブ（G.S）に足すもの：S.r12age = { age0 始めたときの歳 }。古いセーブで無ければ、R11 の S.r11.age0（無ければ今の S.profile.age）から作り、
// 過ぎた年のぶんを一度に足す（そのときはログに出さない）。歳が数でなければ何もしない
(function (G) {
  G.r12Age = (S, quiet) => {
    S = S || G.S;
    if (!S || !S.profile || S.over) return;
    if (G.r11 && G.r11.state) G.r11.state(S); // R11 の始めたときの歳を、歳を進める前に覚えさせる
    let r = S.r12age;
    if (!r || typeof r.age0 !== "number") {
      const a = S.r11 && typeof S.r11.age0 === "number" ? S.r11.age0 : parseInt(S.profile.age, 10);
      if (!Number.isFinite(a)) return;
      r = S.r12age = { age0: a };
      quiet = true;
    }
    const age = r.age0 + Math.max(0, G.calYi(S.day));
    if (S.profile.age === age) return;
    S.profile.age = age;
    if (!quiet) G.note(`年が改まった。${S.profile.name}は${age}歳になった。`);
  };

  const endTurn0 = G.endTurn;
  G.endTurn = () => {
    endTurn0();
    G.r12Age(G.S);
  };
})(globalThis.G = globalThis.G || {});
