// R5：名のある人かどうか（立ち絵と札。持ち主「41 歳・片目・爪痕のシグルンの場面で、桃色の髪の若い娘が『冒険者』の札付きで出た」）。DOM には触らない。
// 名前の頭の z の数で、zzz_c3_names.js（G.whoTag）より後に読ませて包む。
//   G.r5.person(who, evId) → { id, name, role } か null：src/data/r5_named.js の名のある人（出来事の id・who.seed・仲間の名前で当てる）
//   G.r5.properName(name)  → who.name が名前で終わるか（「写し場の古株ヤン」「狩人頭のオルガ婆」「サンテール卿」。「量り売りの本屋の女主人」は違う）
//   G.r5.named(who, evId)  → 名のある人か（キャラメモの人・v4 の名のある人・C3 の名のある人・上の二つ）。名のある人に型の絵は使わない（src/ui/v4_assets.js）
//   G.r5.artId(who, evId)  → 名のある人の専用の絵の id（assets/portraits/<id>.webp。名前だけの人と、表で mob の人は ""＝型の絵。R5b・R5d）。名の無い人は null
//   G.whoTag を包み、r5_named.js の人の札を「名前（肩書き）」にする（型の札「冒険者」を出さない）
// レーン A（R5）
(function (G) {
  const D = G.data;
  const R5 = (G.r5 = G.r5 || {});
  const T = () => D.R5_NAMED || {};
  const evOf = (who, evId) => evId || (/^ev:(.+)$/.exec(String((who && who.seed) || "")) || [])[1] || null;

  R5.person = (who, evId) => {
    if (!who || who.kind === "foe" || who.kind === "hero") return null;
    const ev = evOf(who, evId), seed = String(who.seed || ""), nm = String(who.name || "");
    for (const [id, p] of Object.entries(T())) {
      if ((ev && (p.events || []).includes(ev)) || (p.seeds || []).includes(seed) || (p.names || []).some((n) => seed.includes(n) || nm.includes(n))) return { id, name: p.name, role: p.role || "" };
    }
    return null;
  };
  // 名前で終わる呼び名（カタカナの名前、またはそのあとに婆・爺・卿・さん・さま）。「アデルの母さん」「オトセの母」は名の無い人
  R5.properName = (name) => /[ァ-ヶ][ァ-ヶー]+(卿|婆さん|婆さま|爺さん|婆|爺|さん|さま)?$/.test(String(name || ""));

  R5.artId = (who, evId) => {
    if (!who || who.kind === "foe" || who.kind === "hero") return null;
    const seed = String(who.seed || "");
    const m = /^(c2|v4):(.+)$/.exec(seed);
    if (m) return m[2];
    const p = R5.person(who, evId);
    if (p) return (T()[p.id] || {}).mob ? "" : p.id;
    const pid = G.whoPerson ? G.whoPerson(who, evOf(who, evId)) : null;
    if (pid) return pid;
    if (R5.properName(who.name)) return "";
    return null;
  };
  R5.named = (who, evId) => R5.artId(who, evId) !== null;

  const tag0 = G.whoTag;
  if (tag0) G.whoTag = (who, S, evId) => {
    const t = tag0(who, S, evId);
    if (!t || t.id || !who) return t;
    if (S === undefined) S = G.S;
    if (evId === undefined) evId = S && S.mode === "event" ? S.event : null;
    const p = R5.person(who, evId);
    if (!p) return t;
    const label = G.c3Label ? G.c3Label(p.name, p.role) : p.role ? `${p.name}（${p.role}）` : p.name;
    return { id: null, name: p.name, role: p.role, label };
  };
})(globalThis.G = globalThis.G || {});
