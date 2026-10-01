// C2：キャラメモの人物（src/data/c2_people.js）を、仲間（M2）・才（M8）・恋（M10）の仕組みに乗せる。DOM には触らない。
// core.js・companions_m2.js・m10_love.js は書き換えず、包んで足す。名前の頭の zz は、それらと zm8_talent.js より後に読ませるため。
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.c2State が埋める）
//   S.c2 = { met { id: 出会った日 }, joined { id: 加わった日 }, gone { id: "death" | "betray" | "leave" | "dead"（出来事で死んだ） } }
//   仲間ひとりずつ：c.c2 キャラメモの人物の id（無ければ、ふつうの仲間）・c.race・c.beast 種族と元の獣（R1 の仕組み）・c.who 人物の絵
//
// 出来事のデータ（src/data/events_c2.js）に書けるもの
//   出来事に c2: [id...] その出来事に出てくる人物（始まったら「出会った」に数える）。c2talk: id 「話す」でその人の話になる
//   結果に c2join: id か [id...] 仲間に加える（三人いれば、誘える町で待つ）・c2met: 出会ったことにする・c2dead: 死んだことにする
(function (G) {
  const D = G.data;
  const P = () => D.C2_PEOPLE || {};
  const MAX = 3; // 連れていける仲間の数（core.js の G.addCompanion と同じ）

  // ---------------------------------------------------------------- 状態
  G.c2State = (S) => {
    S = S || G.S;
    if (!S.c2) S.c2 = {};
    const m = S.c2;
    m.met = m.met || {};
    m.joined = m.joined || {};
    m.gone = m.gone || {};
    return m;
  };
  G.c2In = (id, S) => ((S || G.S).companions || []).find((c) => c.c2 === id) || null;
  G.c2Has = (id) => !!(G.S && G.c2In(id, G.S));
  const atHome = (id, S) => !!(S.m10 && S.m10.atHome && S.m10.atHome.c2 === id);
  G.c2Met = (id, S) => !!G.c2State(S || G.S).met[id];
  G.c2Gone = (id, S) => !!G.c2State(S || G.S).gone[id];
  // 仲間に加えられるか（死んでいない・去っていない・今いない・家に残っていない・席が空いている）
  G.c2CanJoin = (id, S) => {
    S = S || G.S;
    const p = P()[id];
    if (!p || !p.join) return false;
    const m = G.c2State(S);
    return !m.gone[id] && !G.c2In(id, S) && !atHome(id, S) && (S.companions || []).length < MAX;
  };
  G.c2Meet = (id) => {
    const S = G.S;
    if (!S || !P()[id]) return;
    const m = G.c2State(S);
    if (!m.met[id]) m.met[id] = S.day;
  };

  // 仲間の欄を作る。性格・暮らし・才・性別・歳・絵はシートの人物のまま（M2・M8・M10 の「無ければ埋める」は働かない）
  G.c2Make = (id) => {
    const p = P()[id], j = p.join;
    return {
      name: p.name, cls: j.cls, power: j.power, dmg: j.dmg || 0, desc: j.desc, heal: !!j.heal, fire: !!j.fire,
      c2: id, trait: j.trait, sex: p.sex, age: p.age, race: p.race, beast: p.beast || "", who: Object.assign({}, p.who, { look: Object.assign({}, p.who.look) }),
      life: Object.assign({}, j.life), m8: { t: Object.assign({}, j.t), f: Object.assign({}, j.f), known: false },
    };
  };
  G.c2Join = (id) => {
    const S = G.S;
    const p = P()[id];
    if (!S || !p || !p.join) return false;
    G.c2Meet(id);
    if (!G.c2CanJoin(id, S)) {
      if (!G.c2Gone(id, S) && !G.c2In(id, S) && (S.companions || []).length >= MAX) {
        const home = p.join.home.map((l) => (D.LOCS[l] ? D.LOCS[l].name : l)).join("か");
        G.note(`（連れていけるのは三人までだ。${p.name}は「${home}にいる」と言った。）`);
      }
      return false;
    }
    const n = S.companions.length;
    G.addCompanion(G.c2Make(id));
    if (S.companions.length <= n) return false;
    const c = S.companions[S.companions.length - 1];
    if (G.m2Comp) G.m2Comp(c, S);
    c.bond = p.join.bond; // M2 の加わり方（雇った・助けた）ではなく、その人の始まりの好感度
    G.c2State(S).joined[id] = S.day;
    return true;
  };

  // ---------------------------------------------------------------- 出来事
  const start0 = G.startEvent;
  G.startEvent = (ev) => {
    const e = typeof ev === "string" ? D.EVENTS.find((x) => x.id === ev) : ev;
    const r = start0(ev);
    if (r && e && e.c2 && G.S && G.S.event === e.id) (Array.isArray(e.c2) ? e.c2 : [e.c2]).forEach(G.c2Meet);
    return r;
  };
  const list = (v) => (v ? (Array.isArray(v) ? v : [v]) : []);
  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    const S = G.S;
    if (!o || !S || S.over) return;
    list(o.c2met).forEach(G.c2Meet);
    list(o.c2dead).forEach((id) => { G.c2Meet(id); G.c2State(S).gone[id] = "dead"; });
    list(o.c2join).forEach(G.c2Join);
  };

  // ---------------------------------------------------------------- 町で、顔なじみを誘う
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S || S.travel || G.loc().type !== "town") return groups;
    const m = G.c2State(S);
    const here = Object.keys(P()).filter((id) => m.met[id] && P()[id].join && P()[id].join.home.includes(S.loc) && G.c2CanJoin(id, S));
    if (here.length) groups.push({ title: "顔なじみ", list: here.map((id) => ({
      id: "c2inv:" + id, label: `${P()[id].name}を誘う`, sub: P()[id].join.cls, kw: ["誘", P()[id].name],
    })) });
    return groups;
  };
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "c2inv") return act0(head, arg, a);
    const p = P()[arg];
    if (!p) return;
    G.log("you", `${p.name}を誘う`);
    G.pass(1);
    G.say(G.pick((D.C2_INVITE && D.C2_INVITE[arg]) || [`${p.name}は、少し考えてから、荷物を取りに行った。`]));
    G.c2Join(arg);
  };

  // ---------------------------------------------------------------- 仲間の言葉をその人のものに（M2・M10）
  const trait0 = G.m2Trait;
  G.m2Trait = (c) => {
    const t = trait0(c);
    const v = c && c.c2 && D.C2_VOICE && D.C2_VOICE[c.c2];
    return v ? Object.assign({}, t, { talk: v.talk || t.talk, betray: v.betray || t.betray, die: v.die || t.die }) : t;
  };
  // 恋のひとこと（src/data/events_m10.js から呼ぶ）。無ければ性格のひとこと
  G.c2Line = (c, k) => {
    const v = c && c.c2 && D.C2_VOICE && D.C2_VOICE[c.c2];
    return (v && v[k]) || null;
  };
  // 仲間になってからの短い呼び名（ノラミ → ノラ）
  const short0 = G.m2Short;
  G.m2Short = (c) => (c && c.c2 && P()[c.c2] && P()[c.c2].short) || short0(c);
  // 子どもの姿の者は恋の相手にしない
  const can0 = G.m10Can;
  if (can0) G.m10Can = (c) => can0(c) && !(c && c.c2 && P()[c.c2] && P()[c.c2].join && P()[c.c2].join.noLove);

  // 別れ（M2）：キャラメモの人物は、一度去ると戻らない
  const remove0 = G.m2Remove;
  G.m2Remove = (c, how, cause) => {
    const r = remove0(c, how, cause);
    if (r && c && c.c2 && G.S) G.c2State(G.S).gone[c.c2] = how;
    return r;
  };

  // 「〇〇と話す」：キャラメモの人物は、六割ほどでその人だけの話になる
  const talk0 = G.m2Talk;
  G.m2Talk = (id) => {
    const S = G.S;
    const c = S && S.companions.find((x) => x.id === id);
    if (c && c.c2 && c.bond > 15 && c.talkDay !== S.day) {
      const tags = G.eventTags();
      const pool = D.EVENTS.filter((e) => e.c2talk === c.c2 && e.where.some((w) => tags.includes(w)) && !(e.once && S.flags["ev:" + e.id]) && (!e.cond || e.cond(S)));
      if (pool.length && G.rand() < 0.6) {
        c.talkDay = S.day;
        G.log("you", `${G.m2Short(c)}と話す`);
        G.pass(1);
        G.m2State(S).force = c.id;
        return G.startEvent(G.pick(pool));
      }
    }
    return talk0(id);
  };
})(globalThis.G = globalThis.G || {});
