// I2（装備の枠）：装備の枠を 7 つに（右手・左手・頭・胴・足・装飾品 1・装飾品 2）。ここは枠の表と、品の「枠」「片手・両手」。
// 枠（セーブの欄）：weapon 右手・off 左手・head 頭・armor 胴・feet 足・ring 装飾品 1・ring2 装飾品 2
//   （weapon・armor・ring は前からある欄の名のまま。古いセーブはそのまま自然な枠に入る。足した欄は S.off || "" のように読む）
// 品の欄：slot（hand 手に持つ武器・off 左手だけ〈盾〉・head 頭・body 胴・feet 足・acc 装飾品）、hands（武器だけ。1 片手・2 両手）。
//   slot が無い品は種類から決まる（weapon → hand、armor → body、ring → acc）。engine/zzzzzzzzz_i2s_slots.js が読み込みのあとに書き足す。
//   両手の武器を右手に持つと、左手は塞がる。片手の武器は左手にも持てる（絶界を破る剣は右手だけ）。
// 動き（装備する・外す・効き目のまとめ）は engine/zzzzzzzzz_i2s_slots.js、画面は ui/zi2s_slots.js。DOM には触らない。レーン I（I2）
(function (G) {
  const D = G.data;
  const X = (G.i2s = G.i2s || {});

  // 画面の並び（人の形：頭／右手・胴・左手／装飾品・足・装飾品）
  X.SLOTS = ["head", "weapon", "armor", "off", "ring", "feet", "ring2"];
  X.NAME = { weapon: "右手", off: "左手", head: "頭", armor: "胴", feet: "足", ring: "装飾品1", ring2: "装飾品2" };
  // 品の slot → 入れられる枠
  X.FITS = { hand: ["weapon", "off"], off: ["off"], head: ["head"], body: ["armor"], feet: ["feet"], acc: ["ring", "ring2"] };
  X.KIND = { hand: "武器", off: "盾", head: "頭", body: "胴", feet: "足", acc: "装飾品" };

  // 両手で持つ武器（ここに無い武器は、I3 の型の i3.h か、片手）
  X.TWO_HANDED = ["axe", "oniclub", "i1_scythe", "f3i_rainstaff", "f3i_giantmaul", "f3i_windbow", "i3l_dawnspear", "i3l_fatheraxe", "i3l_greywing"];

  const it0 = (id) => (typeof id === "string" ? D.ITEMS[id] : id);
  X.slotOf = (id) => {
    const it = it0(id);
    if (!it) return null;
    if (it.slot) return it.slot;
    return it.type === "weapon" ? "hand" : it.type === "armor" ? "body" : it.type === "ring" ? "acc" : null;
  };
  X.hands = (id) => { const it = it0(id); return it && it.type === "weapon" ? (it.hands === 2 ? 2 : 1) : 0; };
  // その枠に入れられるか（左手に持てるのは片手の武器と盾。絶界を破る剣・素手は右手だけ）
  X.fits = (id, slot) => {
    const it = it0(id);
    const s = X.slotOf(it);
    if (!s || !(X.FITS[s] || []).includes(slot)) return false;
    if (slot === "off" && s === "hand") return X.hands(it) === 1 && !it.pierce && id !== "fists" && it !== D.ITEMS.fists;
    return true;
  };
  // 右手の武器が両手持ちで、左手が塞がっているか
  X.blocked = (S) => { S = S || G.S; const w = S && S.weapon && S.weapon !== "fists" ? D.ITEMS[S.weapon] : null; return !!(w && X.hands(w) === 2); };
  // 身に着けている品の id（素手・空の枠・塞がった左手は除く）
  X.worn = (S) => {
    S = S || G.S;
    if (!S) return [];
    const out = [];
    for (const k of X.SLOTS) {
      const id = S[k];
      if (!id || id === "fists") continue;
      if (k === "off" && X.blocked(S)) continue;
      out.push(id);
    }
    return out;
  };
  X.wears = (S, id) => !!id && X.worn(S).includes(id);
  // その品が入っている枠（無ければ null）
  X.where = (S, id) => { S = S || G.S; return (S && id && X.SLOTS.find((k) => S[k] === id && !(k === "off" && X.blocked(S)))) || null; };
})(globalThis.G = globalThis.G || {});
