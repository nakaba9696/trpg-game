// W12：遺跡の特別な一枚の背景。仕掛けを解いた先・祭壇の下の部屋にいるあいだ（S.w12.view の場所と階にいて、戦闘でないとき）、
// R5 の背景の決め方（G.r5.sceneOf。engine/zzzzzzzzzzzzzzzz_r5_scene.js）より先にその絵の名前を返す。絵は ui/scene_v2_w12.js。
// 名前の頭の z の数で R5 より後に読ませ、R5 を外から包む。DOM には触らない。レーン W（W12）
(function (G) {
  const R5 = G.r5;
  if (!R5 || !R5.sceneOf) return;
  const sceneOf0 = R5.sceneOf;
  R5.sceneOf = (S) => {
    const v = S && !S.over && !S.combat && S.mode === "explore" && S.w12 && S.w12.view;
    if (v && v.key && v.loc === S.loc && v.depth === S.depth) return { key: v.key, alt: null, why: "w12" };
    return sceneOf0(S);
  };
})(globalThis.G = globalThis.G || {});
