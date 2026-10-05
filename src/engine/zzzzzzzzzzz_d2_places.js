// D2：地名の呼び方（決まりは data/d2_places.js）。名前の頭の z の数で、ほかのエンジンのファイルより後に読ませる。DOM には触らない。
//   G.placeName(id)   … 種類つきの呼び名（D.LOCS の name。例：港町ヴァレンツァ）
//   G.placeShort(id)  … 短い名前（例：ヴァレンツァ）。name の終わりのカタカナ。無ければ name
//   G.placeKind(id)   … 種類（例：港町）。無ければ ""
//   G.placeText(文)   … {place:id}・{placeShort:id} を置き換える
//   G.regionName(地方) … 地方を画面に出すときの呼び名（例：シェルアーク → シェルアーク諸島）
// 読み込みの最後に、G.data の中の文の {place:id}・{placeShort:id} を一度だけ置き換える（データのファイルにそのまま書ける）
(function (G) {
  const D = (G.data = G.data || {});
  const split = (L) => {
    const name = (L && L.name) || "";
    const m = L && L.type === "town" ? name.match(/^(.+?)([ァ-ヶー]+)$/) : null;
    return m ? { kind: m[1], short: m[2] } : { kind: "", short: name };
  };
  G.placeName = (id) => { const L = (D.LOCS || {})[id]; return L ? L.name : String(id || ""); };
  G.placeShort = (id) => { const L = (D.LOCS || {})[id]; return L ? (L.short || split(L).short) : String(id || ""); };
  G.placeKind = (id) => { const L = (D.LOCS || {})[id]; return L ? split(L).kind : ""; };
  G.regionName = (r) => (D.PLACE_REGION || {})[r] || r || "";
  const RE = /\{(place|placeShort):([\w-]+)\}/g;
  G.placeText = (t) => (typeof t === "string" && t.indexOf("{place") >= 0
    ? t.replace(RE, (all, k, id) => ((D.LOCS || {})[id] ? (k === "place" ? G.placeName(id) : G.placeShort(id)) : all))
    : t);

  // 読み込みのときの置き換え（同じものを二度辿らない）
  const seen = new Set();
  const walk = (v) => {
    if (!v || typeof v !== "object" || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { if (typeof v[i] === "string") v[i] = G.placeText(v[i]); else walk(v[i]); } return; }
    for (const k of Object.keys(v)) {
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (!d || !("value" in d)) continue;
      if (typeof d.value === "string") { if (d.writable) v[k] = G.placeText(d.value); } else walk(d.value);
    }
  };
  walk(D);
})(globalThis.G = globalThis.G || {});
