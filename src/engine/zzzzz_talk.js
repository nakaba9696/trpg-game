// 仲間との会話（話題を選ぶ「話す」・仲間同士の掛け合い・野営と宿の夜の会話）。DOM には触らない。
// データは src/data/talk_<人の id>.js（D.TALK[id]）と src/data/talk_banter*.js（D.TALK_BANTER）。書き方は docs/talk.md。
// 名前の頭の zzzzz は、companions_m2.js・zz_c2_people.js・zzz_f3_affinity.js・zzz_love_age.js・zzzz_c4_people.js より後に読ませて包むため。
//
// 仕組み：会話は出来事の画面をそのまま使う。殻の出来事（tk_menu 話題の一覧・tk_topic 話題・tk_banter 掛け合いの問い）を D.EVENTS に置き、
// 文と選択肢は今の会話（S.tk.cur）から作る（getter。乱数は使わない。乱数は話題を並べるときと、掛け合い・夜の会話が起きるかだけ）。
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.tkState が埋める）
//   S.tk = { heard { 話題の id: { day, k 選んだ返しの key, seq 反応した出来事の番号 } }, recent [{ k, day, seq, name, with [仲間の id] }] 最近の出来事,
//            seq, cur 今の会話（無ければ null）, night 夜の会話をした日, banterDay 掛け合いのあった日, bant { 掛け合いの id: 日 },
//            fight 始まった戦いの覚え, seen { quests, visited, title, e3 } 前の手番の数（最近の出来事を拾う） }
//   cur = { cid 話している仲間, menu [話題の id], scene 出来事の id（C2 のその人だけの話）, topic, n 話した数, night, banter, back { mode, fac }, mood, greet }
// 好感度は F3 の目盛り（−100〜+100）で書く。名のある人は G.affAdd、ふつうの仲間は M2 の bond（半分の目盛り）で動く。
// レーン C（会話の仕組み）＋ V（会話の中身）＋ U（画面）
(function (G) {
  const D = G.data;
  const TK = (G.tk = G.tk || {});
  const T = () => D.TALK || {};
  const PER_TALK = 3; // 一度の「話す」で聞ける話題の数
  const FRESH = 6; // 最近の出来事として話題にする日数
  const NIGHT_AFF = 30; // 夜に話しかけてくる好感度（信頼している）
  const COLD_AT = -20; // これ以下は冷たい会話になる
  TK.KIND = { past: "身の上", place: "この土地", event: "さっきのこと", mate: "仲間のこと", chat: "世間話", ask: "相談", love: "ふたりのこと", bond: "信頼", cold: "", night: "夜" };
  // 返し方の既定の好み（その人の tones で上書き）
  TK.TONES = { earnest: 3, tease: 1, joke: 1, praise: 2, sweet: 2, scold: -2, cold: -5, quiet: 1 };
  TK.TONE_NAMES = { earnest: "真面目に聞く", tease: "からかう", joke: "冗談で返す", praise: "褒める", sweet: "優しくする", scold: "たしなめる", cold: "突き放す", quiet: "黙っている" };

  // ---------------------------------------------------------------- 状態
  G.tkState = (S) => {
    S = S || G.S;
    if (!S.tk || typeof S.tk !== "object") S.tk = {};
    const t = S.tk;
    t.heard = t.heard || {};
    t.recent = t.recent || [];
    t.seq = t.seq || 0;
    t.bant = t.bant || {};
    if (t.cur === undefined) t.cur = null;
    return t;
  };
  const comps = (S) => (S && S.companions) || [];
  const compById = (id, S) => comps(S || G.S).find((c) => c.id === id) || null;
  const short = (c) => (G.m2Short ? G.m2Short(c) : (c && c.name) || "");
  // 会話の表がある仲間か（今は名のある人。D.TALK[c.c2]）
  TK.data = (c) => (c && c.c2 && T()[c.c2]) || null;
  G.tkHas = (c) => !!TK.data(c);
  // 好感度（−100〜+100）
  TK.aff = (c) => (G.affFromBond ? G.affFromBond(c.bond) : Math.round((c.bond || 0) * 2 - 100));
  TK.addAff = (c, n) => {
    if (!c || !n) return;
    if (c.c2 && G.affAdd && G.affState) G.affAdd(c.c2, n);
    else if (G.m2Bond) G.m2Bond(c, n / 2);
  };
  // 話題の表（id → 話題）。人ごとの topics を一つにまとめる
  TK.topic = (id) => {
    for (const [who, p] of Object.entries(T())) { const t = (p.topics || []).find((x) => x.id === id); if (t) return Object.assign({ who }, t); }
    return null;
  };
  const lines = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

  // ---------------------------------------------------------------- 最近の出来事（話題の「さっきのこと」）
  TK.record = (k, name, S) => {
    S = S || G.S;
    if (!S) return null;
    const t = G.tkState(S);
    t.seq++;
    const r = { k, day: S.day, seq: t.seq, name: name || "", with: comps(S).map((c) => c.id) };
    t.recent.push(r);
    if (t.recent.length > 24) t.recent.shift();
    return r;
  };
  // その仲間が居合わせた、いちばん新しい k の出来事（FRESH 日以内）
  TK.fresh = (k, c, S) => {
    S = S || G.S;
    const t = G.tkState(S);
    for (let i = t.recent.length - 1; i >= 0; i--) {
      const r = t.recent[i];
      if (S.day - r.day > FRESH) break;
      if (r.k === k && (!c || r.with.includes(c.id))) return r;
    }
    return null;
  };

  // ---------------------------------------------------------------- 話題が出るか
  const tagsHere = () => (G.eventTags ? G.eventTags() : ["any"]);
  const heardKey = (t, id, key) => { const h = t.heard[id]; return !!h && (!key || h.k === key); };
  TK.can = (tp, c, S, opt) => {
    S = S || G.S;
    opt = opt || {};
    const st = G.tkState(S);
    const a = TK.aff(c);
    if (!tp || !c) return false;
    if (tp.kind === "night" && !opt.night) return false;
    if (tp.kind === "cold") { if (a > (tp.max !== undefined ? tp.max : COLD_AT)) return false; }
    else {
      if (a < (tp.min !== undefined ? tp.min : COLD_AT + 1)) return false;
      if (tp.max !== undefined && a > tp.max) return false;
    }
    if (tp.kind === "event") {
      const r = TK.fresh(tp.fresh, c, S);
      if (!r) return false;
      const h = st.heard[tp.id];
      if (h && h.seq >= r.seq) return false;
    } else if (!tp.again && st.heard[tp.id]) return false;
    if (tp.after) {
      const [id, key] = String(tp.after).split("#");
      if (!heardKey(st, id, key)) return false;
    }
    if (tp.at && !lines(tp.at).some((w) => tagsHere().concat(opt.where ? [opt.where] : []).includes(w))) return false;
    if (tp.mate) {
      const m = comps(S).find((x) => x.c2 === tp.mate && x !== c);
      if (!m) return false;
      if (tp.mateMin !== undefined && TK.aff(m) < tp.mateMin) return false;
    }
    if (tp.kind === "bond" && TK.loveOk(c, S)) return false; // 恋の相手になれる人には、恋の話題のほうを出す
    if (tp.love && !TK.loveOk(c, S)) return false;
    if (tp.need && !TK.needMet(tp.need, S)) return false;
    if (tp.when && !tp.when(S, c)) return false;
    return true;
  };
  // 恋の話題を出せる相手か（romance の印・18 歳未満・子どもの姿は G.m10Can と zzz_love_age.js が見る）
  TK.loveOk = (c, S) => !!(G.m10Can && G.m10Can(c) && !(G.loveHeroMinor && G.loveHeroMinor(S)) && !(G.loveMinor && G.loveMinor(c)));
  TK.needMet = (n, S) => {
    S = S || G.S;
    if (n.item && !(S.inv && S.inv[n.item] > 0)) return false;
    if (n.gold && S.gold < n.gold) return false;
    if (n.loc && !lines(n.loc).includes(S.loc)) return false;
    return true;
  };
  // 今、その仲間と話せる話題（全部）
  G.tkTopics = (c, S, opt) => {
    const p = TK.data(c);
    if (!p) return [];
    return (p.topics || []).filter((tp) => TK.can(tp, c, S, opt));
  };

  // 並べる話題を選ぶ（3〜5。出来事への反応と、頼まれごとの続きを先に）
  const ORDER = ["event", "ask", "past", "place", "mate", "love", "bond", "chat"];
  TK.pickMenu = (c, S) => {
    const all = G.tkTopics(c, S);
    if (!all.length) return [];
    const by = {};
    all.forEach((tp) => (by[tp.kind] = by[tp.kind] || []).push(tp));
    const out = [];
    const take = (k) => {
      const list = (by[k] || []).filter((x) => !out.includes(x));
      if (!list.length) return false;
      // 身の上は、いちばん浅い段から
      const pick = k === "past" ? list.reduce((a, b) => ((a.step || 0) <= (b.step || 0) ? a : b)) : k === "event" ? list[list.length - 1] : pickL(list, "k:" + k);
      out.push(pick);
      return true;
    };
    if (TK.aff(c) <= COLD_AT) {
      // 冷たいときは、刺々しい話が先に来る。並ぶ数も少ない
      take("cold");
      take("cold");
      ["event", "ask", "past", "chat"].forEach((k) => out.length < 3 && take(k));
      return out.slice(0, 3);
    }
    const askDone = (by.ask || []).filter((x) => x.need);
    if (by.event) take("event");
    if (askDone.length) out.push(askDone[0]);
    const rest = ORDER.filter((k) => k !== "event");
    // 残りの種類を、毎回少し違う順で
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(TK.roll("o" + i) * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    for (const k of rest) { if (out.length >= 5) break; take(k); }
    for (let n = 0; out.length < 3 && n < 6; n++) if (!rest.some((k) => take(k))) break;
    return out.slice(0, 5);
  };

  // ---------------------------------------------------------------- 並べ方・台詞の選び方の乱数
  // 話題の並び・声のかけ方・切り上げの一言は、状態（冒険・手番・日・仲間・何番目の話）から決まる乱数で選ぶ。
  // G.rand の並びを使わないので、会話をしても戦い・出来事の乱数の並びは変わらない（テストでは種で固定される）。
  // 起きるかどうか（夜の会話・掛け合い）も、この乱数で決める（K4：仲間や話題を足しても、戦い・出来事の乱数の並びと釣り合いの測定が揺れないように）。種は冒険の初めに G.rand で引く S.wseed（weather.js。S.id は Date.now を含むのでテストで揺れる。古いセーブは S.id に戻る）
  TK.roll = (salt) => {
    const S = G.S || {};
    const k = S.tk && S.tk.cur;
    let h = 2166136261;
    for (const ch of [S.wseed || S.id, S.turn, S.day, k && k.cid, k && k.n, salt].join("|")) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
    h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  };
  const pickL = (list, salt) => list[Math.floor(TK.roll(salt) * list.length) % list.length];

  // ---------------------------------------------------------------- 文の差し込み
  // {n} {c} {m} {kin} などは M2 の G.m2Fill。ここで足すのは {foe} {dead} {place} {you}
  TK.fill = (s, vars) => {
    if (typeof s !== "string") return "";
    const S = G.S;
    vars = vars || {};
    let t = s.replace(/\{(foe|place|you|dead|m)\}/g, (all, k) => {
      if (k === "m") return vars.m || all;
      if (k === "foe") return vars.foe || "あいつ";
      if (k === "dead") return vars.dead || all;
      if (k === "place") return (G.loc && G.loc().name) || "ここ";
      if (k === "you") return (S && S.profile && S.profile.name) || "あんた";
      return all;
    });
    return G.m2Fill ? G.m2Fill(t) : t;
  };
  // 掛け合いの行：["a", "…"] は {a} の台詞、["", "…"] は地の文
  TK.banterLine = (b, ln, S) => {
    const [who, text] = Array.isArray(ln) ? ln : ["", ln];
    const c = who === "a" || who === "b" ? comps(S).find((x) => x.c2 === b[who]) : null;
    const t = TK.bfill(b, text, S);
    return c ? `${short(c)}「${t}」` : t;
  };
  TK.bfill = (b, text, S) => TK.fill(String(text || "").replace(/\{a\}/g, nameOf(b.a, S)).replace(/\{b\}/g, nameOf(b.b, S)));
  const nameOf = (id, S) => { const c = comps(S || G.S).find((x) => x.c2 === id); return c ? short(c) : ((D.C2_PEOPLE || {})[id] || {}).name || id; };

  // ---------------------------------------------------------------- 殻の出来事（画面は出来事と同じに描く）
  const cur = () => (G.S && G.S.tk && G.S.tk.cur) || null;
  const curComp = () => { const k = cur(); return k ? compById(k.cid) : null; };
  const END = { label: "話を切り上げる", sub: "", ok: { tk: { end: 1 } } };
  const shell = (id, title, text, choices) => {
    const e = { id, where: [], w: 0, tk: true };
    Object.defineProperty(e, "title", { get: title, enumerable: true });
    Object.defineProperty(e, "text", { get: text, enumerable: true });
    Object.defineProperty(e, "choices", { get: () => { try { return choices() || [END]; } catch (err) { return [END]; } }, enumerable: true });
    Object.defineProperty(e, "who", { get: () => {
      const k = cur();
      let c = curComp();
      if (k && k.banter) { const b = (D.TALK_BANTER || []).find((x) => x.id === k.banter); if (b) c = comps(G.S).find((x) => x.c2 === b.a) || c; }
      if (!c || !G.companionWho) return null;
      return Object.assign({}, G.companionWho(c), { name: c.name });
    }, enumerable: true });
    Object.defineProperty(e, "mood", { get: () => { const k = cur(); return k && G.isMood && G.isMood(k.mood) ? k.mood : "normal"; }, enumerable: true });
    return e;
  };
  const menuChoices = () => {
    const k = cur(), c = curComp();
    if (!k || !c) return [END];
    const out = (k.menu || []).map((id) => {
      const tp = TK.topic(id);
      if (!tp) return null;
      const sub = [TK.KIND[tp.kind] || "", tp.after && tp.kind === "past" ? "続き" : "", tp.need ? "頼まれごと" : ""].filter(Boolean).join("・");
      return { label: TK.fill(tp.title, Object.assign({}, k.vars, tp.mate ? { m: nameOf(tp.mate) } : {})), sub, ok: { tk: { open: id } } };
    }).filter(Boolean);
    if (k.scene) { const e = D.EVENTS.find((x) => x.id === k.scene); if (e) out.push({ label: `（${short(c)}の様子を見る）${e.title}`, sub: "出来事", ok: { tk: { scene: k.scene } } }); }
    out.push(END);
    return out;
  };
  const topicChoices = () => {
    const k = cur();
    const tp = k && k.topic && TK.topic(k.topic);
    if (!tp) return [END];
    return (tp.replies || []).map((r, i) => ({ label: TK.fill(r.label, k.vars), sub: TK.TONE_NAMES[r.tone] && r.label !== TK.TONE_NAMES[r.tone] ? TK.TONE_NAMES[r.tone] : "", ok: { tk: { reply: i } } }));
  };
  const banterChoices = () => {
    const k = cur();
    const b = k && (D.TALK_BANTER || []).find((x) => x.id === k.banter);
    if (!b || !b.side) return [END];
    return ["a", "b", "none"].filter((s) => b.side[s]).map((s) => ({ label: TK.bfill(b, b.side[s].label), sub: s === "none" ? "" : `${nameOf(b[s])}の肩を持つ`, ok: { tk: { side: s } } }));
  };
  D.EVENTS.push(
    shell("tk_menu", () => { const c = curComp(); return c ? `${short(c)}と話す` : "話す"; }, () => (cur() && cur().greet) || "仲間が、こちらを見た。", menuChoices),
    shell("tk_topic", () => { const k = cur(), tp = k && TK.topic(k.topic); return tp ? TK.fill(tp.title, k.vars) : "話"; }, () => { const k = cur(), tp = k && TK.topic(k.topic); return tp ? lines(tp.text).map((x) => TK.fill(x, k.vars)).join("") : "……"; }, topicChoices),
    shell("tk_banter", () => { const k = cur(), b = k && (D.TALK_BANTER || []).find((x) => x.id === k.banter); return b ? b.title : "掛け合い"; }, () => { const k = cur(), b = k && (D.TALK_BANTER || []).find((x) => x.id === k.banter); return b && b.side ? TK.bfill(b, b.side.q) : "……"; }, banterChoices),
  );

  // ---------------------------------------------------------------- 会話を進める
  const enter = (id, mood) => {
    const S = G.S;
    S.mode = "event";
    S.event = id;
    const k = S.tk.cur;
    if (k) k.mood = G.isMood && G.isMood(mood) ? mood : null;
    S.mood = k ? k.mood : null;
  };
  const moodOf = (o, text) => (o && o.mood) || (G.guessMood ? G.guessMood(text) : null);
  // 話す相手の気分の一言（好感度で変わる）
  const greetOf = (p, c) => {
    const a = TK.aff(c);
    const g = p.greet || {};
    const list = a <= COLD_AT ? g.cold : a >= 45 ? g.warm : a >= 10 ? g.mid : g.low;
    return TK.fill(pickL(lines(list || g.mid || ["{n}が顔を上げた。"]), "greet"));
  };
  // 話しかける（「〇〇と話す」）
  TK.open = (c, opt) => {
    const S = G.S;
    opt = opt || {};
    const p = TK.data(c);
    if (!p) return false;
    const st = G.tkState(S);
    if (G.m2State) { const m = G.m2State(S); m.focus = c.id; m.focus2 = null; m.counts.talk++; }
    st.cur = { cid: c.id, menu: [], scene: null, topic: null, n: 0, night: !!opt.night, banter: null, back: { mode: S.mode === "fac" ? "fac" : "explore", fac: S.mode === "fac" ? S.fac : null }, vars: {}, greet: "" };
    if (opt.night) return true;
    st.cur.greet = greetOf(p, c);
    st.cur.menu = TK.pickMenu(c, S).map((t) => t.id);
    // C2 のその人だけの話（出来事）も、ときどき一覧に混ざる
    const tags = tagsHere();
    const scenes = D.EVENTS.filter((e) => e.c2talk === c.c2 && e.where.some((w) => tags.includes(w)) && !(e.once && S.flags["ev:" + e.id]) && (!e.cond || e.cond(S)));
    if (scenes.length && TK.aff(c) > COLD_AT && TK.roll("scene") < 0.4) st.cur.scene = pickL(scenes, "scenes").id;
    G.say(st.cur.greet);
    enter("tk_menu", null);
    if (!st.cur.menu.length && !st.cur.scene) { finish(TK.fill(pickL(lines(p.empty || ["{n}は、黙って肩をすくめた。"]), "empty"))); }
    return true;
  };
  const varsFor = (tp, c, S) => {
    const v = {};
    if (tp.kind === "event") { const r = TK.fresh(tp.fresh, c, S); if (r) { v.foe = r.name; v.dead = r.name; v.seq = r.seq; } }
    return v;
  };
  // 話題を開く
  TK.openTopic = (id) => {
    const S = G.S;
    const k = S.tk.cur, c = curComp();
    const tp = TK.topic(id);
    if (!k || !c || !tp) return finish();
    k.topic = id;
    k.vars = varsFor(tp, c, S);
    if (tp.mate) k.vars.m = nameOf(tp.mate, S);
    const m = G.m2State ? G.m2State(S) : null;
    if (m) {
      m.focus = c.id;
      const mate = tp.mate ? comps(S).find((x) => x.c2 === tp.mate) : null;
      m.focus2 = mate ? mate.id : null;
    }
    const text = lines(tp.text).map((x) => TK.fill(x, k.vars));
    text.forEach((x) => G.say(x));
    enter("tk_topic", tp.mood || moodOf(null, text.join("")));
    if (!(tp.replies || []).length) TK.reply(-1);
    return true;
  };
  // 返す
  TK.reply = (i) => {
    const S = G.S;
    const k = S.tk.cur, c = curComp();
    const tp = k && TK.topic(k.topic);
    if (!k || !c || !tp) return finish();
    const p = TK.data(c) || {};
    const r = (tp.replies || [])[i] || { tone: "quiet" };
    const text = lines(r.text).map((x) => TK.fill(x, k.vars));
    text.forEach((x) => G.say(x));
    const tones = Object.assign({}, TK.TONES, p.tones || {});
    const n = r.aff !== undefined ? r.aff : (tones[r.tone] || 0) + (r.plus || 0);
    TK.addAff(c, n);
    if (r.aff2 && tp.mate) { const mt = comps(S).find((x) => x.c2 === tp.mate); if (mt) TK.addAff(mt, r.aff2); }
    S.tk.heard[tp.id] = { day: S.day, k: r.key || r.tone || "", seq: k.vars.seq || 0 };
    if (r.pay && tp.need) {
      if (tp.need.item && G.take(tp.need.item)) G.note(`${G.itemInfo(tp.need.item).name}を渡した。`);
      if (tp.need.gold) { const g = Math.min(S.gold, tp.need.gold); S.gold -= g; G.note(`所持金 -${g}G`); }
    }
    // ほかの結果（覚えていること・用語・能力値・物）は出来事の結果と同じ書き方
    const rest = {};
    ["memo", "lore", "grow", "item", "gold", "hp", "flag", "fame", "chron"].forEach((x) => { if (r[x] !== undefined) rest[x] = r[x]; });
    if (Object.keys(rest).length) apply0(rest);
    if (S.over) return;
    k.n++;
    k.topic = null;
    const mood = moodOf(r, text.join(""));
    if (k.night || k.n >= PER_TALK) return finish(TK.fill(pickL(lines(p.bye || ["{n}は伸びをして、話を切り上げた。"]), "bye")), mood);
    // 一覧に戻る（聞いた話題を抜いて、足りなければ足す）
    const left = (k.menu || []).filter((id) => id !== tp.id && TK.can(TK.topic(id), c, S));
    if (left.length < 2) {
      const more = TK.pickMenu(c, S).map((t) => t.id).filter((id) => !left.includes(id));
      while (left.length < 3 && more.length) left.push(more.shift());
    }
    k.menu = left;
    if (!left.length && !k.scene) return finish(TK.fill(pickL(lines(p.bye || ["{n}は伸びをして、話を切り上げた。"]), "bye")), mood);
    enter("tk_menu", mood);
  };
  // 会話を終える（施設から始まった会話は、施設に戻る）
  function finish(line, mood) {
    const S = G.S;
    const k = S.tk && S.tk.cur;
    if (line) G.say(line);
    S.event = null;
    S.mood = null;
    S.tk.talkTurn = S.turn; // 会話の終わった手番には、掛け合いを重ねない
    if (k && k.back && k.back.mode === "fac" && k.back.fac) { S.mode = "fac"; S.fac = k.back.fac; }
    else S.mode = "explore";
    S.tk.cur = null;
    return true;
  }
  TK.finish = finish;

  // ---------------------------------------------------------------- 結果の当てはめ（会話の選択肢）
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (!o || !o.tk || !S) return apply0(o);
    G.tkState(S);
    const x = o.tk;
    if (x.end) return finish(curComp() ? TK.fill(pickL(lines((TK.data(curComp()) || {}).bye || ["{n}は、うなずいた。"]), "bye")) : null);
    if (x.open) return TK.openTopic(x.open);
    if (x.reply !== undefined) return TK.reply(x.reply);
    if (x.side) return TK.side(x.side);
    if (x.scene) {
      const c = curComp();
      const back = S.tk.cur && S.tk.cur.back;
      S.tk.cur = null;
      S.mode = back && back.mode === "fac" ? "fac" : "explore";
      if (c && G.m2State) G.m2State(S).force = c.id;
      return G.startEvent(x.scene);
    }
  };

  // 出来事の行動の下に、話題の種類を出す（core.js の G.actions は stat・cost しか書かない）
  const actions0 = G.actions;
  G.actions = () => {
    const groups = actions0();
    const S = G.S;
    if (!S || S.mode !== "event" || !/^tk_/.test(S.event || "")) return groups;
    const e = D.EVENTS.find((x) => x.id === S.event);
    const ch = e ? e.choices : [];
    groups.forEach((g) => g.list.forEach((a) => { const i = Number(String(a.id).split(":")[1]); if (ch[i] && ch[i].sub) a.sub = ch[i].sub; }));
    if (groups[0]) groups[0].title = S.event === "tk_menu" ? "何の話をする？" : S.event === "tk_banter" ? "どっちの肩を持つ？" : "どう返す？";
    return groups;
  };

  // ---------------------------------------------------------------- 「〇〇と話す」
  const talk0 = G.m2Talk;
  G.m2Talk = (id) => {
    const S = G.S;
    const c = S && compById(id, S);
    // 好感度が尽きた仲間は、今まで通り別れ話（M2）
    if (!c || !G.tkHas(c) || c.bond <= 15 || c.talkDay === S.day) return talk0(id);
    c.talkDay = S.day;
    G.log("you", `${short(c)}と話す`);
    G.pass(1);
    return TK.open(c);
  };

  // ---------------------------------------------------------------- 掛け合い
  TK.banters = (S, where) => {
    S = S || G.S;
    const st = G.tkState(S);
    const tags = tagsHere().concat(where ? [where] : []);
    const ids = comps(S).map((c) => c.c2).filter(Boolean);
    return (D.TALK_BANTER || []).filter((b) => {
      if (!ids.includes(b.a) || !ids.includes(b.b) || st.bant[b.id]) return false;
      if (b.where && !lines(b.where).some((w) => tags.includes(w))) return false;
      const ca = comps(S).find((c) => c.c2 === b.a), cb = comps(S).find((c) => c.c2 === b.b);
      if (b.min !== undefined && (TK.aff(ca) < b.min || TK.aff(cb) < b.min)) return false;
      if (b.after && !st.bant[b.after]) return false;
      if (b.when && !b.when(S)) return false;
      return true;
    });
  };
  TK.banter = (b) => {
    const S = G.S;
    const st = G.tkState(S);
    st.bant[b.id] = S.day;
    st.banterDay = S.day;
    G.log("title", b.title);
    lines(b.lines).forEach((ln) => G.say(TK.banterLine(b, ln, S)));
    if (!b.side) return true;
    const ca = comps(S).find((c) => c.c2 === b.a);
    st.cur = { cid: ca.id, menu: [], topic: null, n: 0, banter: b.id, back: { mode: S.mode === "fac" ? "fac" : "explore", fac: S.mode === "fac" ? S.fac : null }, vars: {}, greet: "" };
    if (b.side.q) G.say(TK.bfill(b, b.side.q, S));
    enter("tk_banter", b.mood || null);
    return true;
  };
  TK.side = (s) => {
    const S = G.S;
    const k = S.tk.cur;
    const b = k && (D.TALK_BANTER || []).find((x) => x.id === k.banter);
    if (!b) return finish();
    const o = b.side[s] || {};
    lines(o.text).forEach((ln) => G.say(TK.banterLine(b, ln, S)));
    const ca = comps(S).find((c) => c.c2 === b.a), cb = comps(S).find((c) => c.c2 === b.b);
    const [x, y] = o.aff || (s === "a" ? [4, -2] : s === "b" ? [-2, 4] : [0, 0]);
    TK.addAff(ca, x);
    TK.addAff(cb, y);
    st().bant[b.id + "#"] = s;
    return finish(null);
  };
  const st = () => G.tkState(G.S);

  // ---------------------------------------------------------------- 夜の会話（野営・宿。一夜に一度まで）
  TK.night = (where) => {
    const S = G.S;
    if (!S || S.over || S.combat || (S.mode !== "explore" && S.mode !== "fac")) return false;
    const t = G.tkState(S);
    if (t.night === S.day || t.cur) return false;
    const cands = comps(S).filter((c) => G.tkHas(c) && TK.aff(c) >= NIGHT_AFF && c.bond > 15);
    if (!cands.length) return false;
    // 話す人と、話す話題が決まってから乱数を使う
    const ready = cands.map((c) => [c, G.tkTopics(c, S, { night: true, where }).filter((tp) => tp.kind === "night" || tp.kind === "past" || tp.kind === "love" || tp.kind === "bond")]).filter(([, l]) => l.length);
    if (!ready.length || TK.roll("night") >= 0.45) return false;
    const best = Math.max(...ready.map(([c]) => TK.aff(c)));
    const [c, list] = pickL(ready.filter(([x]) => TK.aff(x) >= best - 15), "nightWho");
    const nights = list.filter((x) => x.kind === "night"), others = list.filter((x) => x.kind !== "night");
    const tp = nights.length ? pickL(nights, "nightTopic") : others.reduce((a, b) => ((a.step || 0) <= (b.step || 0) ? a : b));
    t.night = S.day;
    t.banterDay = S.day; // 夜の会話のあった夜は、掛け合いを重ねない
    TK.open(c, { night: true });
    const p = TK.data(c);
    G.log("title", "夜");
    G.say(TK.fill(pickL(lines((p.nightIntro || {})[where] || (where === "inn" ? "夜更け、部屋の戸が小さく叩かれた。{n}だった。" : "焚き火が小さくなったころ、{n}があなたの隣に腰を下ろした。")), "night")));
    return TK.openTopic(tp.id);
  };
  const afterSleep = (where) => {
    const S = G.S;
    if (TK.night(where)) return;
    if (!S || S.over || S.combat || S.mode === "event" || G.tkState(S).banterDay === S.day) return;
    const list = TK.banters(S, where === "inn" ? "inn" : "camp");
    if (list.length && TK.roll("bantNight") < 0.3) TK.banter(pickL(list, "bantWhich"));
  };
  const explore0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const r = explore0(head, arg, a);
    if (head === "camp") afterSleep("camp");
    return r;
  };
  const fac0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    const day = S && S.day;
    const r = fac0(head, arg, a);
    if (head === "inn" && arg === "rest" && S && S.day !== day) afterSleep("inn");
    return r;
  };

  // ---------------------------------------------------------------- 最近の出来事を拾う
  const combat0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    const r = combat0(ids, opt);
    const S = G.S;
    if (S && S.combat) {
      const t = G.tkState(S);
      t.fight = { kills: S.counters.kills, boss: !!S.combat.boss, foe: (S.combat.foes[0] && S.combat.foes[0].name) || "", e3: ((S.e3 && S.e3.done) || []).length };
    }
    return r;
  };
  const remove0 = G.m2Remove;
  if (remove0) G.m2Remove = (c, how, cause) => {
    const r = remove0(c, how, cause);
    if (r && G.S) TK.record(how === "death" ? "death" : "left", short(c));
    return r;
  };
  const crime0 = G.crime;
  if (crime0) G.crime = (...a) => { const r = crime0(...a); if (G.S && !G.S.over) TK.record("crime", ""); return r; };
  const end0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && !S.over) {
      const t = G.tkState(S);
      if (t.fight && !S.combat) {
        const f = t.fight;
        t.fight = null;
        const won = S.counters.kills > f.kills;
        const e3 = ((S.e3 && S.e3.done) || []).length;
        if (won && e3 > f.e3) TK.record("apostle", f.foe);
        else if (won && f.boss) TK.record("boss", f.foe);
        else if (won) TK.record("win", f.foe);
        else TK.record("fled", f.foe);
        if (S.hp < S.maxHp * 0.3) TK.record("near", f.foe);
      }
      const seen = t.seen || (t.seen = { quests: S.counters.quests || 0, visited: Object.keys(S.visited || {}).length, title: S.title || "" });
      if ((S.counters.quests || 0) > seen.quests) TK.record("quest", "");
      if (Object.keys(S.visited || {}).length > seen.visited) TK.record("arrive", G.loc().name);
      if ((S.title || "") !== seen.title && S.title) TK.record("title", S.title);
      t.seen = { quests: S.counters.quests || 0, visited: Object.keys(S.visited || {}).length, title: S.title || "" };
      // 旅の途中・町歩きのあいまに、仲間同士が勝手にしゃべる（一日に一度まで）
      if (S.mode === "explore" && !S.combat && !S.travel && !t.cur && t.banterDay !== S.day && t.talkTurn !== S.turn) {
        const moved = t.lastLoc !== undefined && t.lastLoc !== S.loc;
        const list = TK.banters(S, moved ? "road" : null);
        if (list.length && TK.roll("bant") < (moved ? 0.3 : 0.05)) TK.banter(pickL(list, "bantWhich"));
      }
      t.lastLoc = S.loc;
    }
    return end0();
  };
})(globalThis.G = globalThis.G || {});
