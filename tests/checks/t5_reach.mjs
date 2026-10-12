// T5：場所・迷宮にたどり着けるか（tests/t5_reach.mjs）。一覧は docs/review/reach_2026-10-12.md
// - すべての場所に出発地から陸路・船で着ける・戻れる・行き先の無い道が無い・どの深さでも進むか戻れる・関所と居城が解ける
// - 自動で作る迷宮の階（W11）を決まった乱数で多数作り、階段がちょうど一つ・部屋の出来事がある
// - 見張りが効いていること：わざと壊したデータを見つけられるか
// KNOWN：見つけたときにすでに壊れていて、まだ直していないもの（失敗にせず、OK の行に出す）。直したら消す
import { reach } from "../t5_reach.mjs";

const KNOWN = new Set([]);

export default ({ G, fail, ok, loadEngine }) => {
  const r = reach(G, { seeds: 150 });
  for (const x of r.issues) {
    if (KNOWN.has(x.key)) ok(`t5_reach（既知）: ${x.text}`);
    else fail(x.text);
  }
  for (const k of KNOWN) if (!r.issues.some((x) => x.key === k)) fail(`KNOWN の ${k} はもう起きない。KNOWN から消す`);

  // わざと壊して、見つけられるか
  const probe = (label, breakIt, want) => {
    const H = loadEngine();
    breakIt(H.data, H);
    const got = reach(H, { seeds: 8 }).issues.map((x) => x.key);
    if (!got.some((k) => k.startsWith(want))) fail(`見張りが効かない：${label}（${want} が出ない。出たもの ${got.slice(0, 5).join(" ") || "なし"}）`);
  };
  probe("戻れない一方通行", (D) => { D.LOCS.forest.links = {}; delete D.LOCS.forest.legs; }, "noreturn:forest");
  probe("たどり着けない場所", (D) => { for (const L of Object.values(D.LOCS)) { if (L.links) delete L.links.forest; if (L.legs) delete L.legs.forest; } }, "unreached:forest");
  probe("行き先の無い道", (D) => { D.LOCS.karna.links.t5_nowhere = 3; }, "link:karna>t5_nowhere");
  probe("中ボスが迷宮の外", (D) => { D.LOCS.ruins.midboss = { 9: "goblin" }; }, "midd:ruins");
  probe("階段の無い階", (D, H) => { const mk = H.w11.makeFloor; H.w11.makeFloor = (S, key) => { const f = mk(S, key); f.rooms = f.rooms.filter((x) => x.k !== "stairs"); return f; }; }, "w11stairs:");
  probe("手に入らない鍵", (D) => { D.ITEMS.t5_lostkey = { name: "どこにも無い鍵", type: "key", price: 0 }; }, "key:t5_lostkey");
  ok(`t5_reach: 壊れ ${r.issues.length}・${r.info.length} 件の覚え書き`);
};
