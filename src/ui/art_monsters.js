// モンスターの絵の入口。A10 で canvas の魔物の絵はやめた（持ち主の決定：生成画像の中に古い絵柄が混ざらないように）。
// 魔物は生成画像（assets/monsters/<id>.webp）だけで描く（v6_monsters.js が包む）。ここは「何も描かない」入口だけ
// G.paintMonster(ctx, x, base, s, foe) … foe = { id, shape, eye, boss } を足元 (x, base)・背丈 s で描く。レーン A（絵）
(function (G) {
  G.paintMonster = () => {};
})(globalThis.G = globalThis.G || {});
