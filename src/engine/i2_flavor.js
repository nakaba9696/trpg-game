// I2：アイテムのフレーバーの説明（src/data/i2_flavor.js の D.I2_FLAVOR）を、読み込みのあとで it.flavor に足す。
// データのファイルは名前順に読まれ、あとから足されるアイテム（items_*.js・q4_paths.js・relics_c1.js）もあるので、ここ（エンジン）で足す。
// 手に入れたときに開く用語（D.I2_LORE）は D.LORE_ON.item に足す（すでにある物は、そのまま残して足す）。
// G.itemFlavor(id)：説明の文。G.itemEffect(it)：効果の短い説明（画面の札で、名前の下に出す）。DOM には触らない
(function (G) {
  const D = G.data;
  const FL = D.I2_FLAVOR || {};
  Object.entries(FL).forEach(([id, t]) => { if (D.ITEMS[id]) D.ITEMS[id].flavor = t; });

  const list = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  if (D.LORE_ON && D.I2_LORE) {
    const on = (D.LORE_ON.item = D.LORE_ON.item || {});
    Object.entries(D.I2_LORE).forEach(([id, t]) => {
      const all = [...list(on[id])];
      list(t).forEach((x) => { if (!all.includes(x)) all.push(x); });
      on[id] = all.length === 1 ? all[0] : all;
    });
  }

  G.itemFlavor = (id) => {
    const it = D.ITEMS[id];
    return (it && (it.flavor || FL[id])) || "";
  };

  // 効果：数字はデータから。説明（desc）のうち効果を書いた文（「逃げられる」「傷を与える」など）も拾う
  const BONUS = { fire: "炎の魔法", heal: "癒し", steal: "盗み", trap: "罠", talk: "話術" };
  const sign = (n) => (n > 0 ? "+" + n : String(n));
  const EFFECT = /成功率|逃げられ|傷を与え|戻る|絶界|よく通る|通りやすい|急所|斬り裂く|積める/;
  G.itemEffect = (it) => {
    if (!it) return "";
    const p = [];
    if (it.type === "weapon" && it.dmg) p.push(`${it.dmg[0]}D${it.dmg[1]}${it.dmg[2] ? "+" + it.dmg[2] : ""}`, `${it.stat || "筋力"}で戦う`);
    if (it.hit) p.push("命中" + sign(it.hit));
    if (it.def) p.push("防御" + it.def);
    if (it.agi) p.push(G.statModText ? G.statModText("敏捷", it.agi) : "敏捷" + sign(it.agi));   // 能力値の補正は点で（S5）
    if (it.magic) p.push("魔法" + sign(it.magic));
    Object.entries(it.stats || {}).forEach(([k, v]) => p.push(G.statModText ? G.statModText(k, v) : k + sign(v)));
    Object.entries(it.bonus || {}).forEach(([k, v]) => p.push((BONUS[k] || k) + sign(v)));
    if (it.hp) p.push(it.hp > 100 ? "HP全快" : "HP+" + it.hp);
    if (it.mp) p.push(it.mp > 100 ? "MP全快" : "MP+" + it.mp);
    if (it.reroll) p.push("判定を振り直せる");
    if (it.teach && D.SPELLS && D.SPELLS[it.teach]) p.push(`読み解くと術「${D.SPELLS[it.teach].name}」`);
    if (it.gun) p.push(`撃てる（弾：${(D.ITEMS[it.gun.ammo] || {}).name || it.gun.ammo}）`);
    if (it.cursed) p.push("外せない");
    String(it.desc || "").split("。").filter((s) => s && EFFECT.test(s) && !/[+\-]\d/.test(s)).forEach((s) => p.push(s));
    if (!p.length && it.type === "loot") p.push("売り物");
    if (!p.length && it.type === "trade") p.push("交易の品");
    if (!p.length && it.type === "key") p.push("大事な物");
    return [...new Set(p)].join("・");
  };
})(globalThis.G = globalThis.G || {});
