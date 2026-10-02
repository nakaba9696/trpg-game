// 恋の線（C4・持ち主の方針）：18 歳未満の人と、子どもの姿の人（年経た存在でも見た目が子どもなら）は、恋（M10・M11）の相手にしない。
// 好感度が上がっても恋の気配・告白・求婚・結婚・嫉妬にはならず、信頼や家族のような情のまま（仲間の会話・好感度の言葉は今まで通り）。
// 主人公が 18 歳未満のときも、恋の出来事は起きない（作成で選べる「若者」は 16 歳から）。
// m10_love.js・zz_c2_people.js・zz_m11_love.js は書き換えず、G.m10Can（恋の相手か）と G.m11ApAt（格の違う相手との続き物）を包む。
// 名前の頭の zzz は、zz_m11_love.js（G.m10Can を包む）より後に読ませるため。DOM には触らない。レーン C
(function (G) {
  const D = G.data;
  const ADULT = 18;
  const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };

  // その人が恋の相手にならない（18 歳未満・子どもの姿）か
  G.loveMinor = (c) => {
    if (!c) return false;
    const p = c.c2 && D.C2_PEOPLE && D.C2_PEOPLE[c.c2];
    if (p && (p.childLook || num(p.age) !== null && num(p.age) < ADULT)) return true;
    const age = num(c.age);
    if (age !== null && age < ADULT) return true;
    const w = c.who || (p && p.who);
    if (w && (w.kind === "child" || num(w.age) !== null && num(w.age) < ADULT)) return true;
    return false;
  };
  // 主人公が 18 歳未満か
  G.loveHeroMinor = (S) => {
    S = S || G.S;
    const a = num(S && S.profile && S.profile.age);
    return a !== null && a < ADULT;
  };

  const can0 = G.m10Can;
  if (can0) G.m10Can = (c) => can0(c) && !G.loveMinor(c) && !G.loveHeroMinor(G.S);
  const ap0 = G.m11ApAt;
  if (ap0) G.m11ApAt = (key, n, S) => !G.loveHeroMinor(S || G.S) && ap0(key, n, S);
})(globalThis.G = globalThis.G || {});
