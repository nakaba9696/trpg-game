// W11：迷宮の部屋の出来事に出てくるもの（who）と、人の姿が出ない部屋（D.EVENT_NOBODY）。書き方は events_who.js。レーン W（W11）
(function (G) {
  const D = G.data;
  const WHO = {
    w11_mimic: { kind: "foe", foe: "mimic" },
    w11_armor_hall: { kind: "foe", foe: "blackknight" },
    w11_oni_snore: { kind: "foe", foe: "oni" },
    w11_og_lore2: { kind: "foe", foe: "oni" },
    w11_prayer: { kind: "foe", foe: "w1_husk" },
  };
  D.EVENT_WHO = Object.assign(D.EVENT_WHO || {}, WHO);
  // 罠・箱・休み場・巣（何が寝ているかは迷宮で変わる）・かけら・物の部屋には、人の姿が出ない
  D.EVENT_NOBODY = (D.EVENT_NOBODY || []).concat(D.EVENTS.filter((e) => /^w11_/.test(e.id) && !WHO[e.id]).map((e) => e.id));
})(globalThis.G = globalThis.G || {});
