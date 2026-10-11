// R5c：港の敵が丘に出る（0.6.0 の再レビュー 中 6）。鐘撞きの丘の出会いの表に「港の用心棒」（密輸の荷の見張り。前口上は「樽の陰から…荷を見たな」）が
// 入っていて、丘と崩れた物見の塔（W8S の塔は場所の表から引く）で港の前口上のまま出ていた。
//   ・鐘撞きの丘の表から外し、代わりに鐘楼の蝙蝠（E4。鐘楼に棲む群れ。段 2）を出す（E4 の敵は pool でなく also で場所に置く。src/engine/zzz_e4_foes.js）
//   ・港の用心棒は、密輸屋の隠れ場に似合う潮鳴りの洞（シェルアーク・危険度 2）の表へ移す（港・密輸の出来事〔船旅・特色の場所・C10〕はそのまま）
// 場所のデータ（locations_w3.js）は書き換えず、読み込みのあとで表を直す。レーン W＋E（R5c）
(function (G) {
  const D = (G.data = G.data || {});
  const L = D.LOCS || {};
  if (L.w3_bells && L.w3_bells.pool) L.w3_bells.pool = L.w3_bells.pool.filter((id) => id !== "w3_smuggler");
  if (L.w3_seacave && L.w3_seacave.pool && !L.w3_seacave.pool.includes("w3_smuggler")) L.w3_seacave.pool.push("w3_smuggler");
  const bat = (D.ENEMIES || {}).e4_bellbat;
  if (bat) bat.also = [...new Set([...(bat.also || []), "w3_bells"])];
})(globalThis.G = globalThis.G || {});
