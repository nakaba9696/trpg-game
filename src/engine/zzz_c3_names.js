// C3：話す人の札（名前＋役職）と、名乗る人の名前（表は src/data/zc3_names.js）。DOM には触らない（画面の札は src/ui/c3_nameplate.js）。
// 名前の頭の zzz は、d6_walker.js・zz_f2_codex.js・zz_c2_people.js より後に読ませて包むため。
//
//   G.personTag(id, S, codex) → { id, name, role, label }：名のある人の札。名乗るまでの人は呼び名（alias）。codex なら冒険をまたいで知った名も使う
//   G.whoPerson(who, eventId) → 名のある人の id か null（who.seed の "c2:<id>"・"v4:<id>"・施設の seed、出来事の id から）
//   G.whoTag(who, S, eventId) → { id, name, role, label }：話す人の札。名の無い人は型の札（村人・商人・衛兵…）だけで name は ""
//   G.compTag(c) → 仲間の札（名前＋肩書き）
//   F2.personName・F2.personRole：人物図鑑の見出し（名前）と、その下の役職
// セーブ（G.S）に足すもの：S.flags.c3_walker_name・S.flags.c3_boku_name（名乗った印。無ければ名乗っていない）
// 冒険をまたいで残すもの：G.P.c3named { id: 1 }（図鑑に名前を出す。無くても動く）
// 古いセーブ：仲間の欄（c.c2 のある人）の名前が前の呼び名（was）なら、G.fixOldNames で今の名前に読み替える。レーン C（C3）
(function (G) {
  const D = G.data;
  const N = () => D.C3_NAMES || {};
  const F2P = () => D.F2_PEOPLE || {};
  const C2P = () => D.C2_PEOPLE || {};

  // ---------------------------------------------------------------- 名乗ったか
  G.c3Knows = (id, S, codex) => {
    const t = N()[id];
    if (!t || !t.name) return false;
    if (!t.reveal) return true;
    S = S === undefined ? G.S : S;
    if (S && S.flags && S.flags[t.reveal]) return true;
    return !!(codex && G.P && G.P.c3named && G.P.c3named[id]);
  };
  const remember = (S) => {
    if (!S || !S.flags || !G.P) return;
    Object.entries(N()).forEach(([id, t]) => {
      if (!t.reveal || !S.flags[t.reveal]) return;
      const m = G.P.c3named || (G.P.c3named = {});
      if (!m[id]) { m[id] = 1; if (G.onCodexChange) try { G.onCodexChange(); } catch {} }
    });
  };

  const label = (name, role) => (name && role ? `${name}（${role}）` : name || role || "");
  G.c3Label = label;

  // ---------------------------------------------------------------- 名のある人
  G.personTag = (id, S, codex) => {
    const t = N()[id] || {}, q = F2P()[id] || {}, p = C2P()[id];
    const name = G.c3Knows(id, S, codex) ? t.name : t.alias || q.name || (p && p.name) || id;
    const role = t.role || q.title || (p && p.join && p.join.cls) || "";
    return { id, name, role, label: label(name, role) };
  };

  // 施設の人・名のある人の seed（v4_assets.js の NAMED と同じ当て方。エンジンだけでも引けるように）
  const SEEDS = { "fac:garmund:chancellor": "chancellor", "d6:walker": "walker" };
  G.whoPerson = (who, evId) => {
    const seed = String((who && who.seed) || "");
    if (seed.startsWith("c2:") && N()[seed.slice(3)]) return seed.slice(3);
    if (seed.startsWith("v4:") && N()[seed.slice(3)]) return seed.slice(3);
    if (SEEDS[seed]) return SEEDS[seed];
    if (who && who.kind === "hero") return null;
    if (evId) {
      for (const [id, q] of Object.entries(F2P())) {
        if ((q.events || []).includes(evId) || (q.eventRe && new RegExp(q.eventRe).test(evId))) return id;
      }
      const m = /^e3_meet_(.+)$/.exec(evId);
      if (m && N()[m[1]]) return m[1];
    }
    return null;
  };

  // 型の札（村人・商人・衛兵…）
  G.kindRole = (who, S, evId) => {
    const er = evId && (D.C3_EVENT_ROLE || {})[evId];
    if (er) return er;
    const kind = (who && who.kind) || "villager";
    const r = (D.C3_KIND_ROLE || {})[kind] || ["町の人"];
    if (kind === "villager" && S && S.loc && D.LOCS[S.loc] && D.LOCS[S.loc].type !== "town" && !S.fac) return D.C3_VILLAGE_ROLE || "村人";
    return who && who.sex === "女" && r[1] ? r[1] : r[0];
  };

  const foeName = (id) => {
    const e = D.ENEMIES[id] || ((D.E3 && D.E3.FOES) || {})[id];
    return (e && e.name) || "";
  };
  G.whoTag = (who, S, evId) => {
    if (!who) return null;
    S = S === undefined ? G.S : S;
    if (evId === undefined) evId = S && S.mode === "event" ? S.event : null;
    const pid = G.whoPerson(who, evId);
    if (pid) return G.personTag(pid, S);
    const role = G.kindRole(who, S, evId);
    const name = who.name || (who.kind === "foe" ? foeName(who.foe) : "");
    return { id: null, name, role: name === role ? "" : role, label: label(name, name === role ? "" : role) };
  };
  G.compTag = (c) => {
    if (!c) return null;
    const role = (c.c2 && N()[c.c2] && N()[c.c2].role) || c.cls || "仲間";
    return { id: c.c2 || null, name: c.name || "", role, label: label(c.name, role) };
  };

  // ---------------------------------------------------------------- 図鑑
  const F2 = (G.f2 = G.f2 || {});
  F2.personName = (id) => G.personTag(id, G.S, true).name;
  F2.personRole = (id) => G.personTag(id, G.S, true).role;

  // ---------------------------------------------------------------- 名乗る
  // 灰色の外套の旅人：三度目に会ったとき
  const WALKER_LINE = "別れぎわ、旅人は振り返った。「そういえば、名を聞かれたことがなかったな。……ノエ。昔、そう呼ぶ人がいた」外套の色だけが、また目に残った。";
  const start0 = G.startEvent;
  G.startEvent = (ev) => {
    const ok = start0(ev);
    const S = G.S;
    if (ok && S && G.isWalkerEvent && G.isWalkerEvent(S.event) && ((S.counters && S.counters.d6_walker) || 0) >= 3 && !S.flags.c3_walker_name) {
      G.say(WALKER_LINE);
      S.flags.c3_walker_name = true;
      remember(S);
    }
    return ok;
  };
  const apply0 = G.apply;
  G.apply = (o) => { apply0(o); if (o && o.flag) remember(G.S); };

  // ---------------------------------------------------------------- 古いセーブ
  const rename = (c) => {
    if (!c || !c.c2) return;
    const t = N()[c.c2];
    if (t && t.name && !t.reveal && (t.was || []).includes(c.name)) c.name = t.name;
  };
  const fix0 = G.fixOldNames;
  G.fixOldNames = (S) => {
    if (fix0) fix0(S);
    if (!S) return S;
    (S.companions || []).forEach(rename);
    if (S.m10) { rename(S.m10.atHome); rename(S.m10.spouse); }
    return S;
  };
})(globalThis.G = globalThis.G || {});
