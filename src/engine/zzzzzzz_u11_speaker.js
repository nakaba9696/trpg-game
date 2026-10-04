// U11：ログの台詞に話し手の印（e.speaker）を付ける。立ち絵は、この印のある台詞のときだけ出す（ui/zu11_cast.js）。レーン U
// （名前の頭の zzzzzzz は、G.log を包むほかのファイル（companions_m2 の名前の差し込み・sanity_m5 など）より後に読ませ、
//   できあがった文を見るため）
//
// 印の値（迷うなら付けない＝立ち絵を出さない）：
//   "comp:<仲間の id>"  仲間（S.companions）
//   "ev:<出来事の id>"  今の出来事の人（出来事の who。依頼の場面でその場にいない依頼人は除く）
//   "fac:<施設>"        王城の主（国王・宰相）
//   "p:<人物の id>"     そのほかの名のある人（D.C2_PEOPLE・D.F2_PEOPLE）
// 一つの行に話し手の違う台詞が二つ以上あれば、e.speakers に順に並べ、e.speaker は最後の話し手。
//
// 台詞（「」『』）ごとに、話し手を次の順で決める：
//   1. 台詞の直前の文（「の前の、句点から「まで。句点で終わっていれば、その一つ前の文）に、名前が主語（〜は・〜が・〜も）で出るか、
//      名前のすぐあとに「が続く（「ナタリア「……」」の掛け合いの形）→ その人
//   2. 台詞の直後が名前で始まる（「……なに」ナタリアは杯から目を上げなかった）→ その人。ただし直前の文に別の主語（相手は・男が・あなたは）があれば決めない
//   3. 出来事の人（その場にいる人）がいて、直前の文に主語が無いか、名前でない主語（娘は・老人が）で、行の地の文にほかの名のある人も「あなた」も出ないとき → 出来事の人
//   どれにも当たらなければ印を付けない
(function (G) {
  const D = G.data;
  const SP = (G.u11sp = G.u11sp || {});

  // 名前の候補：「パン屋のグスタフ」→「グスタフ」・「国王ヴァレオン」→「ヴァレオン」・「ガルム・ハイド」→「ガルム」
  SP.namesOf = (name) => {
    const out = new Set();
    const add = (n) => { n = String(n || "").trim(); if (n.length >= 2) out.add(n); };
    const nm = String(name || "");
    add(nm);
    // 「パン屋のグスタフ」の「グスタフ」（の のあとが片仮名の名前のときだけ。「片翼の大男」の「大男」は呼び名ではない）
    const tail = nm.split("の").pop();
    if (tail !== nm && /^[\u30A0-\u30FF・ー]+$/.test(tail)) add(tail);
    add(nm.split(/[・ 　（(]/)[0]);
    add(nm.replace(/^(国王|皇帝|宰相|女王|王女|王子|騎士|司祭|助祭|将軍|隊長)/, ""));
    return [...out];
  };
  // 王城の主（ui/art_people.js の FAC_WHO と同じ人。画面の側に置いてあるので、呼び名だけここに写す）
  SP.FAC = { castle: { leavel: ["国王ヴァレオン", "ヴァレオン", "国王"], garmund: ["宰相"] } };

  // 名のある人の表（作り直しは一度だけ）
  let people = null;
  SP.people = () => {
    if (people) return people;
    people = [];
    const seen = new Set();
    // 片仮名を含まない短い名（「旅人」「庭師」「大男」）は、ふつうの言葉と見分けられないので当てない
    const add = (id, n) => SP.namesOf(n).filter((x) => /[\u30A0-\u30FF]/.test(x) || x.length >= 3).forEach((x) => { if (!seen.has(id + "|" + x)) { seen.add(id + "|" + x); people.push({ key: "p:" + id, name: x }); } });
    Object.entries(D.C2_PEOPLE || {}).forEach(([id, p]) => { add(id, p.name); if (p.full) add(id, String(p.full).split(/[・ 　]/)[0]); });
    Object.entries(D.F2_PEOPLE || {}).forEach(([id, p]) => add(id, p.name));
    return people;
  };
  let evMap = null;
  const eventOf = (id) => {
    if (!evMap || evMap.size !== D.EVENTS.length) { evMap = new Map(); D.EVENTS.forEach((e) => evMap.set(e.id, e)); }
    return evMap.get(id) || null;
  };
  // 今の出来事の人（その場にいる人だけ）。{ key, names, present }
  SP.eventWho = (S) => {
    if (!S || S.mode !== "event" || !S.event) return null;
    const e = eventOf(S.event);
    if (!e) return null;
    let who = null;
    try { who = e.who || (D.EVENT_WHO && D.EVENT_WHO[e.id]) || null; } catch (x) { who = null; }
    if (!who) return null;
    if (typeof who === "string") who = { kind: who };
    // 依頼の場面（Q5）の山場で、場面の人が決まっていないと依頼人が入る。依頼人はその場にいない
    if (e.id === "q5_scene" && S.q5 && S.q5.cur && S.q5.cur.sc === "climax") {
      const q = (S.quests || []).find((x) => x.id === S.q5.cur.qid);
      if (q && q.client && who.name && who.name === q.client.name) return null;
    }
    const names = new Set(SP.namesOf(who.name));
    try { const tag = G.whoTag && G.whoTag(who, S, e.id); if (tag && tag.name) SP.namesOf(tag.name).forEach((n) => names.add(n)); } catch (x) { /* 札が引けなくても印は付ける */ }
    const m = /^c2:(.+)$/.exec(String(who.seed || ""));
    if (m && D.C2_PEOPLE && D.C2_PEOPLE[m[1]]) SP.namesOf(D.C2_PEOPLE[m[1]].name).forEach((n) => names.add(n));
    return { key: "ev:" + e.id, names: [...names] };
  };
  // この行の話し手の候補：[{ key, name }]（長い名前から当てる）。仲間・出来事の人・王城の主を先に、ほかの名のある人をあとに
  SP.candidates = (S) => {
    const out = [];
    // 仲間を先に（会話の出来事は who が仲間自身なので、仲間の印 "comp:" にする）
    ((S && S.companions) || []).forEach((c) => {
      const tag = G.compTag ? (() => { try { return G.compTag(c); } catch (x) { return null; } })() : null;
      [...SP.namesOf(c.name), ...(tag ? SP.namesOf(tag.name) : [])].forEach((n) => out.push({ key: "comp:" + c.id, name: n }));
    });
    const ev = SP.eventWho(S);
    if (ev) ev.names.forEach((n) => out.push({ key: ev.key, name: n }));
    if (S && S.mode === "fac" && SP.FAC[S.fac] && SP.FAC[S.fac][S.loc] && !(S.fac === "castle" && S.flags && S.flags.throne)) SP.FAC[S.fac][S.loc].forEach((n) => out.push({ key: "fac:" + S.fac, name: n }));
    SP.people().forEach((p) => out.push(p));
    // 同じ名前は先に入れた方（出来事の人・仲間）を使う。長い名前から当てる
    const seen = new Set();
    return out.filter((x) => (seen.has(x.name) ? false : seen.add(x.name))).sort((a, b) => b.name.length - a.name.length);
  };

  const SUBJ = /(は|が|も)/;
  const subjectIn = (sent, name) => {
    let i = sent.indexOf(name);
    while (i >= 0) {
      const after = sent.slice(i + name.length, i + name.length + 1);
      if (SUBJ.test(after)) return true;
      i = sent.indexOf(name, i + 1);
    }
    return false;
  };
  // 文の中の主語（〜は・〜が）があるか（名前でなくても。「相手は」「男が」「あなたは」）
  const hasSubject = (sent) => /[^\s　、。]+(は|が)/.test(sent);
  const OPEN = /[「『]/g;
  const CLOSE = { "「": "」", "『": "』" };

  // 一つの行の話し手（台詞ごとに）。cands は SP.candidates の形、ev は今の出来事の人
  SP.speakersOf = (text, cands, ev) => {
    const t = String(text || "");
    const out = [];
    const quotes = [];
    let m;
    OPEN.lastIndex = 0;
    while ((m = OPEN.exec(t))) {
      const end = t.indexOf(CLOSE[m[0]], m.index + 1);
      quotes.push([m.index, end < 0 ? t.length : end]);
      OPEN.lastIndex = end < 0 ? t.length : end + 1;
    }
    if (!quotes.length) return out;
    // 地の文（台詞の外）
    let outside = "";
    let at = 0;
    quotes.forEach(([a, b]) => { outside += t.slice(at, a) + "　"; at = b + 1; });
    outside += t.slice(at);
    quotes.forEach(([a, b], qi) => {
      const prevEnd = qi ? quotes[qi - 1][1] + 1 : 0;
      const pre = t.slice(prevEnd, a);
      const parts = pre.split(/[。！？]/);
      let last = parts[parts.length - 1];
      if (!last.trim() && parts.length > 1) last = parts[parts.length - 2];
      last = last || "";
      const post = t.slice(b + 1, qi + 1 < quotes.length ? quotes[qi + 1][0] : t.length).split(/[。！？]/)[0] || "";
      let who = null;
      // 1. 直前の文の主語・「名前「」の形
      for (const c of cands) if (subjectIn(last, c.name) || last.trimEnd().endsWith(c.name)) { who = c.key; break; }
      // 2. 直後が名前で始まる（直前の文に別の主語が無いとき）
      if (!who && !hasSubject(last)) for (const c of cands) if (post.trimStart().startsWith(c.name)) { who = c.key; break; }
      // 3. 出来事の人
      if (!who && ev && !/あなた(は|が|も)/.test(last) && !cands.some((c) => c.key !== ev.key && (last.includes(c.name) || post.includes(c.name)))) {
        const others = cands.some((c) => c.key !== ev.key && outside.includes(c.name));
        if (!others && !/あなた(は|が|も)/.test(outside)) who = ev.key;
      }
      if (who) out.push(who);
    });
    return out;
  };

  // ---------------------------------------------------------------- G.log を包む：台詞の行に印を付ける
  const log0 = G.log;
  if (log0 && !log0.u11sp) {
    G.log = (k, text, extra) => {
      const S = G.S;
      // 記録は長さに上限があり、足すと古い行が落ちる（長さが変わらない）。最後の行が新しくなったかで見る
      const before = S && S.log ? S.log[S.log.length - 1] : null;
      const r = log0(k, text, extra);
      try {
        const e = S && S.log ? S.log[S.log.length - 1] : null;
        if (e && e !== before && k === "nar") {
          if (/[「『]/.test(String(e.text || ""))) {
            const ev = SP.eventWho(S);
            const list = SP.speakersOf(e.text, SP.candidates(S), ev);
            if (list.length) {
              e.speaker = list[list.length - 1];
              const uniq = [...new Set(list)];
              if (uniq.length > 1) e.speakers = uniq;
            }
          }
        }
      } catch (x) { /* 印が付けられなくても、記録は止めない */ }
      return r;
    };
    G.log.u11sp = true;
  }
  // 台詞の行の話し手の一覧（印の無い古い記録は空）
  SP.of = (e) => (e && (e.speakers || (e.speaker ? [e.speaker] : []))) || [];
})(globalThis.G = globalThis.G || {});
