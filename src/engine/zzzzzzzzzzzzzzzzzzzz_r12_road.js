// R12（旅の中身）：持ち主の声「何日も旅してるのでイベントは欲しい。仲間との会話イベントでもいいし」
// 旅の出来事の件数（R11.TRIP_DAYS・TRIP_MAX）は変えず、中身を散らす。W6（w6_travel.js）の W6.pick・W6.pool を包む
//   1. 仲間を連れていれば、旅の出来事の何件か（一つの旅で R12.TALK_MAX まで）を「道中の会話」にする（src/data/events_r12_road.js）
//      会話の出だしは、その仲間の言葉（名のある仲間は D.TALK の焚き火・あいさつ、そうでない仲間は性格 D.M2_TRAITS の talk）
//      選択肢は返し方（tone：earnest 真面目 / joke 冗談 / tease からかう / praise 褒める / sweet 優しく / quiet 黙る）。
//      その仲間の好み（D.TALK[id].tones、性格なら R12.TRAIT_TONES）で好感度が動き（好き +3・ふつう +1・嫌い −1）、仲間の様子が一行出る
//   2. 仲間がいなければ、ときどき一人旅の小さな場面（src/data/events_r12_road_solo.js）
//   3. 同じ旅で「襲撃」と「戦いになる出来事」を重ねない。戦いになる出来事は一つの旅で一つまで
//   4. 同じ会話を続けて出さない：仲間ごと・一人旅ごとに見た場面を覚え、まだ見ていない場面、なければいちばん前に見た場面から出す
//   W6 の出来事が尽きたとき（戦いを外して空になったときなど）も、会話か一人旅の場面で埋める（件数を減らさない）
// 場面の書き方：where: ["r12"]・w: 0（ふつうの抽選にも W6 の抽選にも出ない）・r12: "talk"|"solo"・on: "land"|"sea"|"any"（既定 land）・
//   会話は open: "camp"（焚き火の言葉）|"greet"（あいさつ）・m2: { pick }・選択肢の結果に tone
// セーブに足すもの：S.r12 = { seen: { 仲間の id: [場面 id] }, solo: [場面 id] }・S.w6 の r12t（会話の数）・r12s（一人旅の数）・r12f（戦いの出来事が出た）・r12who（話した仲間）
//   どれも古いセーブで無くても動く。乱数は G.rand / G.pick だけ。DOM なし。レーン W＋V（R12）
(function (G) {
  const D = G.data;
  const W6 = G.w6;
  const R12 = (G.r12 = G.r12 || {});
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  R12.TALK = 0.45;    // 仲間がいるとき、旅の出来事の一件が会話になる見込み
  R12.TALK_MAX = 2;   // 一つの旅の会話の上限
  R12.SOLO = 0.35;    // 一人旅のとき、一件が一人旅の場面になる見込み
  R12.SOLO_MAX = 2;
  R12.LIKE = 3;       // tones がこれ以上なら「好き」
  R12.BOND = { like: 3, ok: 1, bad: -1 };
  R12.TONES = ["earnest", "joke", "tease", "praise", "sweet", "quiet"];
  // 名のある仲間でない仲間の、性格ごとの返し方の好み（無い tone は 0）
  R12.TRAIT_TONES = {
    soft: { tease: 3, earnest: 2, joke: 2, praise: -1, quiet: 2 },
    greedy: { joke: 3, praise: 2, tease: 1, sweet: -1 },
    amorous: { sweet: 4, praise: 3, joke: 2, tease: 1, quiet: -1 },
    cold: { quiet: 4, earnest: 2, joke: -2, tease: -2, sweet: -1 },
    coward: { earnest: 3, sweet: 2, praise: 3, tease: -2 },
    just: { earnest: 4, praise: 1, quiet: 1, tease: -1 },
    drunk: { joke: 4, tease: 2, quiet: 1, earnest: -1 },
    distrust: { quiet: 3, earnest: 1, praise: -2, sweet: -2 },
    braggart: { praise: 4, joke: 2, earnest: 1, tease: -2, quiet: -1 },
    loyal: { earnest: 3, quiet: 2, praise: 1, joke: 1 },
    proud: { praise: 3, earnest: 1, quiet: 1, tease: -3 },
    lazy: { quiet: 3, joke: 2, tease: 1, earnest: -1 },
  };
  // 返し方への様子（地の文だけ。仲間の口調は出だしの言葉に任せる）
  R12.REACT = {
    earnest: {
      like: ["{n}は少し黙ってから、ぽつぽつと話の続きをした。火が小さくなるまで、二人で話していた。", "{n}はあなたの顔を見て、それから小さく頷いた。歩く足が、あなたの足に揃った。"],
      ok: ["{n}は短く答えた。それで十分だったらしく、その先は黙って歩いた。"],
      bad: ["{n}は困ったように笑って、話をそらした。真面目な話は、今はしたくないらしい。"],
    },
    joke: {
      like: ["{n}は吹き出した。しばらく思い出し笑いが止まらず、道の石につまずいた。", "{n}は笑って、もっとひどい冗談を返してきた。二人で笑った。"],
      ok: ["{n}は鼻で笑った。笑ったことにはなった。"],
      bad: ["{n}は笑わなかった。冗談の続きが、宙に浮いたままになった。"],
    },
    tease: {
      like: ["{n}は言い返してきた。言い返し合ううちに、どちらが先に言い出したのか分からなくなった。", "{n}はむっとした顔をして、それから笑った。肘で小突かれた。"],
      ok: ["{n}は肩をすくめた。からかいは、半分くらい届いたらしい。"],
      bad: ["{n}の顔から笑みが消えた。そのあとしばらく、あなたの少し後ろを歩いていた。"],
    },
    praise: {
      like: ["{n}は胸を張った。それから、褒められたところをもう一度、あなたに説明した。", "{n}は照れくさそうに目をそらした。足取りが軽くなった。"],
      ok: ["{n}は「そうか」という顔をした。悪い気はしていないらしい。"],
      bad: ["{n}は眉をひそめた。何か裏があるのかと、あなたの顔を見ていた。"],
    },
    sweet: {
      like: ["{n}はしばらく何も言わなかった。それから、あなたの肩に毛布の端をかけた。", "{n}は小さく笑った。焚き火の明かりのせいか、頬が赤かった。"],
      ok: ["{n}は少し驚いた顔をして、それから頷いた。"],
      bad: ["{n}は居心地が悪そうに身じろぎして、火の向こうへ座り直した。"],
    },
    quiet: {
      like: ["二人とも黙っていた。火のはぜる音と、夜の鳥の声だけがした。{n}は、それがいいらしかった。", "黙って並んで歩いた。{n}の肩から、力が抜けていくのが分かった。"],
      ok: ["しばらく黙っていた。{n}も黙っていた。悪い沈黙ではなかった。"],
      bad: ["あなたが黙っているので、{n}も黙った。何か言ってほしかったらしい。"],
    },
  };

  // ---------------------------------------------------------------- 状態
  R12.state = (S) => {
    S = S || G.S;
    if (!S.r12 || typeof S.r12 !== "object") S.r12 = {};
    const r = S.r12;
    if (!r.seen || typeof r.seen !== "object") r.seen = {};
    if (!Array.isArray(r.solo)) r.solo = [];
    return r;
  };
  R12.scenes = (kind) => (D.EVENTS || []).filter((e) => e.r12 === kind);
  R12.onFits = (e, sea) => { const on = e.on || "land"; return on === "any" || (on === "sea") === !!sea; };

  // 戦いになる出来事か（どこかの選択肢・結果に fight がある）
  R12.fights = (e) => !!e && (e.choices || []).some((c) => c && (c.fight || [c.ok, c.ng, c.win].some((o) => o && o.fight)));

  // 仲間の返し方の好み
  R12.tones = (c) => {
    const p = G.tk && G.tk.data ? G.tk.data(c) : null;
    if (p && p.tones) return p.tones;
    return R12.TRAIT_TONES[c && c.trait] || {};
  };
  R12.mood = (c, tone) => {
    const v = R12.tones(c)[tone] || 0;
    return v >= R12.LIKE ? "like" : v >= 0 ? "ok" : "bad";
  };
  // 出だしの言葉（{n} などは G.log の差し込みが埋める）
  R12.opener = (e, c) => {
    const p = G.tk && G.tk.data ? G.tk.data(c) : null;
    if (p) {
      if (e.open === "camp" && p.nightIntro && as(p.nightIntro.camp).length) return G.pick(as(p.nightIntro.camp));
      const g = p.greet || {};
      const b = c.bond || 0;
      const lines = as(b >= 55 ? g.warm : b >= 35 ? g.mid : g.low).length ? as(b >= 55 ? g.warm : b >= 35 ? g.mid : g.low) : as(g.warm);
      if (lines.length) return G.pick(lines);
    }
    const t = G.m2Trait ? G.m2Trait(c) : null;
    const talk = as(t && t.talk);
    return talk.length ? `{n}がぽつりと言った。「${G.pick(talk)}」` : "{n}が何か言いかけて、やめた。";
  };

  // ---------------------------------------------------------------- 場面を選ぶ
  // 見た順の古いほうから（まだ見ていない場面がいちばん先）
  const freshest = (list, seen) => {
    if (!list.length) return null;
    const score = (id) => { const i = seen.indexOf(id); return i < 0 ? -1 : i; };
    const best = Math.min(...list.map((e) => score(e.id)));
    return G.pick(list.filter((e) => score(e.id) === best));
  };
  const remember = (arr, id) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); arr.push(id); };

  R12.talker = (S) => (S.companions || []).filter((c) => c && (c.bond || 0) > 15 && c.trait !== "m2_traitor");

  // 道中の会話を一つ（仲間と場面を決め、m2 の主役に据える）。無ければ null
  R12.talk = (S) => {
    const w = S.w6 || {};
    const r = R12.state(S);
    const comps = R12.talker(S);
    if (!comps.length) return null;
    const used = as(w.seen);
    const talked = as(w.r12who);
    let best = null;
    comps.forEach((c) => {
      const scenes = R12.scenes("talk").filter((e) => R12.onFits(e, w.sea) && !used.includes(e.id) && (!e.m2 || !e.m2.pick || e.m2.pick(c, S)));
      if (!scenes.length) return;
      const seen = r.seen[c.id] || [];
      const e = freshest(scenes, seen);
      const sc = (seen.indexOf(e.id) < 0 ? -1 : seen.indexOf(e.id)) + (talked.includes(c.id) ? 100 : 0);
      if (!best || sc < best.sc || (sc === best.sc && G.rand() < 0.5)) best = { c, e, sc };
    });
    if (!best) return null;
    remember((r.seen[best.c.id] = r.seen[best.c.id] || []), best.e.id);
    if (S.w6) { S.w6.r12t = (S.w6.r12t || 0) + 1; S.w6.r12who = [...talked, best.c.id]; }
    if (G.m2State) G.m2State(S).force = best.c.id;
    return best.e;
  };
  // 一人旅の場面を一つ
  R12.solo = (S) => {
    const w = S.w6 || {};
    const r = R12.state(S);
    const used = as(w.seen);
    const e = freshest(R12.scenes("solo").filter((x) => R12.onFits(x, w.sea) && !used.includes(x.id)), r.solo);
    if (!e) return null;
    remember(r.solo, e.id);
    if (r.solo.length > 40) r.solo.shift();
    if (S.w6) S.w6.r12s = (S.w6.r12s || 0) + 1;
    return e;
  };
  // 会話か一人旅（仲間がいれば会話）
  R12.scene = (S) => (R12.talker(S).length ? R12.talk(S) : null) || ((S.companions || []).length ? null : R12.solo(S));

  if (W6 && W6.pick && W6.pool) {
    // 3. 戦いを重ねない：襲撃が残っている旅・戦いの出来事が出た旅では、戦いになる出来事を引かない
    const pool0 = W6.pool;
    W6.pool = (S) => {
      const p = pool0(S);
      const w = S && S.w6;
      if (!w || !(w.raid || w.r12f)) return p;
      return p.filter((e) => !R12.fights(e));
    };
    const pick0 = W6.pick;
    W6.pick = (S) => {
      const w = S.w6 || {};
      const comps = R12.talker(S);
      if (comps.length) {
        if ((w.r12t || 0) < R12.TALK_MAX && G.rand() < R12.TALK) { const e = R12.talk(S); if (e) return e; }
      } else if (!(S.companions || []).length) {
        if ((w.r12s || 0) < R12.SOLO_MAX && G.rand() < R12.SOLO) { const e = R12.solo(S); if (e) return e; }
      }
      const e = pick0(S);
      if (e) {
        if (R12.fights(e) && S.w6) S.w6.r12f = 1;
        return e;
      }
      return R12.scene(S);
    };
  }

  // 会話の出だし：出来事の文のあとに、主役の仲間の言葉を一つ
  const start0 = G.startEvent;
  G.startEvent = (ev) => {
    const r = start0(ev);
    const e = typeof ev === "string" ? D.EVENTS.find((x) => x.id === ev) : ev;
    if (r && e && e.r12 === "talk") {
      const c = G.m2Focus && G.m2Focus();
      if (c) G.say(R12.opener(e, c));
    }
    return r;
  };

  // 返し方：好みで好感度を動かし、様子を一行
  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    const S = G.S;
    if (!o || !o.tone || !S || S.over) return;
    const c = G.m2Focus && G.m2Focus();
    if (!c || !(S.companions || []).includes(c)) return;
    const m = R12.mood(c, o.tone);
    const lines = as((R12.REACT[o.tone] || {})[m]);
    if (lines.length) G.say(G.pick(lines));
    if (G.m2Bond) G.m2Bond(c, R12.BOND[m]);
  };
})(globalThis.G = globalThis.G || {});
