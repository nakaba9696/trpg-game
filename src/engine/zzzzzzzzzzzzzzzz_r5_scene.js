// R5：場面に合う背景の絵の名前を決める（持ち主「森への道中の戦闘が町の通りの背景のまま」「酒場の中の会話が屋外の石壁の背景だった」）。DOM には触らない。
// 画面（src/ui/zzzzzz_r5_scene.js）が #scene に描くとき、ここで決まった名前があればそれを使う（無ければ今までどおり：施設・迷宮の中・場所の絵）。
// 名前の頭の z の数で、ほかの G.startCombat・G.startEvent の包みより外から包む（包む前の S.mode・S.fac を見るため）。
//
// 場面の種類と背景の対応（上から順に見る）：
//   | 場面                                   | 背景                                                         |
//   |----------------------------------------|--------------------------------------------------------------|
//   | 迷宮の中（深さ 1 以上）                | 迷宮の絵のまま（ここでは決めない）                           |
//   | 戦闘                                   | 戦闘が始まったときの場面の絵（S.combat.r5）。旅の途中なら道中 |
//   | 出来事：書き出しが施設の中             | その施設の室内（D.R5_EVENT_SCENE。src/data/r5_scenes.js）     |
//   | 出来事：施設・特色の場所から始まった   | その施設の絵（特色の場所は in_w8s_*・in_w9s_*）               |
//   | 施設の中                               | その施設の絵                                                 |
//   | 旅の途中（出来事・戦闘・先へ進む）     | 道中：行き先が野・迷宮ならその外の絵、出発地が野ならその絵、 |
//   |                                        | 町から町なら地方の道（D.R5_ROAD）、海の旅は D.R5_SEA         |
//   | ほか                                   | 今いる場所の絵（ここでは決めない）                           |
//
//   G.r5.sceneOf(S) → { key, alt, why } か null。alt は key の絵が無いときに使う名前（特色の場所 w9 の借りる絵）。why は上の表のどれか
//   G.r5.facScene(fac) → { key, alt }：施設の絵の名前
//   G.r5.roadScene(S) → 旅の途中の絵の名前（旅の途中でなければ null）
// セーブ（G.S）に足すもの：S.r5from（出来事が始まった施設。無ければ施設からではない）・S.combat.r5（{ key, alt }。無ければ今までどおり）
// レーン A（R5）
(function (G) {
  const D = G.data;
  const R5 = (G.r5 = G.r5 || {});
  // 施設の種類 → 室内の絵（src/ui/ui.js の FAC_SCENE と同じ。名前の無い施設は施設の名前の室内）
  const FAC = { inn: "inn", tavern: "tavern", shop: "shop", guild: "guild", church: "church", train: "train", alley: "alley", castle: "throne", academy: "academy", field: "field", forge: "forge", arena: "arena", bath: "bath", hunt: "hunt" };
  R5.FAC = FAC;

  R5.facScene = (fac) => {
    if (!fac) return null;
    if (FAC[fac]) return { key: FAC[fac], alt: null };
    if ((D.W8S_SPOTS || {})[fac]) return { key: fac, alt: (D.W8S_SPOTS[fac].scene) || null };   // 特色の場所 W8（絵の名前は場所の id。画像は in_w8s_*）
    const art = (D.W9_ART || {})[fac], alt = (D.FAC_SCENE || {})[fac] || null;               // 特色の場所 W9（w9s_*。画像は in_w9s_*）
    if (art || alt) return { key: art || alt, alt };
    return null;
  };

  R5.roadScene = (S) => {
    if (!S || !S.travel) return null;
    const w = S.w6 || {};
    const dest = D.LOCS[w.dest || S.travel], from = D.LOCS[w.from || S.loc];
    if (!dest) return null;
    if (w.sea) return D.R5_SEA || "w3_isles";
    if (dest.type !== "town") return dest.scene;
    if (from && from.type !== "town") return from.scene;
    return (D.R5_ROAD || {})[dest.region] || "plains";
  };

  const pack = (r, why) => (r && r.key ? { key: r.key, alt: r.alt || null, why } : null);
  R5.sceneOf = (S) => {
    if (!S || S.over) return null;
    const L = D.LOCS[S.loc];
    if (L && L.type === "dungeon" && S.depth > 0) return null;
    if (S.combat) return S.combat.r5 && S.combat.r5.key ? { key: S.combat.r5.key, alt: S.combat.r5.alt || null, why: "combat" } : null;
    if (S.mode === "event" && S.event) {
      const f = (D.R5_EVENT_SCENE || {})[S.event];
      if (f) return pack(R5.facScene(f), "event");
      if (S.r5from) return pack(R5.facScene(S.r5from), "from");
    }
    if (S.mode === "fac" && S.fac) return pack(R5.facScene(S.fac), "fac");
    const road = R5.roadScene(S);
    if (road) return { key: road, alt: null, why: "road" };
    return null;
  };

  // 戦闘が始まったときの場面を覚える（酒場の喧嘩は酒場で、道中の待ち伏せは道中で）
  const combat0 = G.startCombat;
  if (combat0) G.startCombat = (ids, opt) => {
    const S = G.S;
    const was = S && !S.combat ? R5.sceneOf(S) : null;
    const r = combat0(ids, opt);
    if (was && S && S.combat && !S.combat.r5) S.combat.r5 = { key: was.key, alt: was.alt };
    return r;
  };
  // 出来事が施設（特色の場所も）から始まったら、その施設を覚える。出来事から続く出来事は前のを引き継ぐ
  const event0 = G.startEvent;
  if (event0) G.startEvent = (ev) => {
    const S = G.S;
    const from = S && S.mode === "fac" ? S.fac : S && S.mode === "event" ? S.r5from || null : null;
    const ok = event0(ev);
    if (S) { if (from) S.r5from = from; else delete S.r5from; }
    return ok;
  };
})(globalThis.G = globalThis.G || {});
