// W2：新しい町の施設（畑・鍛冶場・闘技場・湯治場・狩り場）と、王城の手触り（聖王国の先王と兄姉、帝国の四騎士と皇子）。
// explore.js は書き換えず、G.exploreAct・G.facActions・G.facAct・G.eventTags を包む（academy_m1.js と同じやり方）。
// 騎士の位は、聖王国では「どの兄姉の都で名を上げたか」、帝国では「どの皇子に仕えるか」を選ぶ（docs/lore/strata.md 10.）。
// セーブに足す項目（どれも古いセーブで無くても動く）：
//   S.w2_patron  { realm: "leavel" | "garmund", id, name, day } 騎士に取り立てた後ろ盾
//   S.w2_arenaDay 闘技場で最後に戦った日 / S.w2_soak 湯守に傷を見せた日
// 使う印（S.flags）：w2_arena1〜3 闘技場の部で初めて勝った / w2_oldfield 去年の畑を見た / w2_yield 闘技場で負けを認めさせられた回
// レーン W（ワールド）と F（施設）が管理
(function (G) {
  const D = G.data;

  Object.assign(G.FAC_NAMES, { field: "畑", forge: "鍛冶場", arena: "闘技場", bath: "湯治場", hunt: "狩り場" });
  const KW = {
    field: ["畑", "麦", "農", "手伝"], forge: ["鍛冶", "打", "作", "鍛え"], arena: ["闘技", "試合", "賭"],
    bath: ["湯", "温泉", "湯治", "浸か"], hunt: ["狩", "弓", "獲物"],
  };
  const MINE = Object.keys(KW);

  // ---------------------------------------------------------------- 鍛冶場で打たせるもの（素材は魔物の落とし物）
  D.W2_FORGE = [
    { give: "i1_fangring", need: { fang: 3 }, gold: 30, days: 1, line: "親方は牙を一本ずつ光にかざし、三本とも「悪くない」と言った。一日で、牙を嵌めた指輪が出来上がった。" },
    { give: "robe", need: { silk: 2 }, gold: 80, days: 2, line: "蜘蛛の糸は、仕立ての得意な親方の娘に回された。娘は二日で、糸の艶を殺さない衣を縫い上げた。" },
    { give: "oniclub", need: { onihorn: 1 }, gold: 150, days: 3, line: "鬼の角を炉に入れると、炉が一度だけ、低く唸った。親方は構わず打ち続けた。三日目の朝、角を芯にした金棒が冷めていた。" },
    { give: "dragonmail", need: { wyvernscale: 3 }, gold: 400, days: 5, line: "翼竜の鱗は、打つたびに火花の色が変わった。五日のあいだ、親方は一度も家に帰らなかった。出来上がった鎧は、光の加減で緑にも黒にも見えた。" },
  ];

  // 闘技場の部。fame：出られる名声、fee：出場料
  D.W2_ARENA = [
    { id: 1, name: "見習いの部", fee: 10, fame: 0, foes: [["bandit"], ["deserter"], ["wolf", "wolf"]], gold: 50, win: 3 },
    { id: 2, name: "兵の部", fee: 30, fame: 30, foes: [["ogre"], ["deserter", "deserter"], ["werewolf"]], gold: 150, win: 8 },
    { id: 3, name: "騎士の部", fee: 80, fame: 80, foes: [["blackknight"], ["oni"]], gold: 450, win: 20 },
  ];

  // 騎士の後ろ盾。聖王国は兄姉の都（ゲームにある都だけ。訪れたことが要る。女王の御前で願い出る元の道も残す）、帝国は皇子（元の道の代わり）
  D.W2_PATRONS = {
    leavel: [
      { id: "dran", name: "鍛冶の都の兄君の推挙で", sub: "名声150・350G・魅力の判定", gold: 350, town: "w2_dranherz", stat: "魅力", diff: "難しい",
        ok: "兄君は、あなたを上から下まで三度眺めて言った。「その顎の線は、像にしたら映える。推そう」",
        ng: "兄君は、あなたの横顔を眺めて首を振った。「その顎では、像にならない」推挙はもらえなかった。" },
      { id: "gran", name: "麦の都の姉君の推挙で", sub: "名声150・350G・体力の判定", gold: 350, town: "w2_granbel", stat: "体力", diff: "難しい",
        ok: "姉君は、あなたを一日畑で働かせ、夕方、泥だらけの手を握った。「よし。妹を頼んだよ」",
        ng: "姉君は一日の畑仕事の終わりに、あなたの腰を叩いた。「まだ青いね。来年また来な」" },
    ],
    garmund: [
      { id: "first", name: "第一皇子に仕える", sub: "名声150・500G", gold: 500, line: "第一皇子の後ろには、古い貴族たちが並んでいた。誰もあなたの顔を見なかった。" },
      { id: "third", name: "第三皇子に仕える", sub: "名声150・300G", gold: 300, line: "第三皇子の軍師は、盤の駒を一つ動かしてから、あなたに頭を下げた。駒にも、同じように頭を下げていた。", lore: "chezar:rumor" },
      { id: "fifth", name: "第五皇子に仕える", sub: "名声150・400G・闘技場の兵の部で勝った者", gold: 400, flag: "w2_arena2", line: "第五皇子は闘技場の上の席から降りてきて、あなたの肩を叩いた。「兵の部の、あの試合を見た。おれの剣になれ」" },
    ],
  };

  const realmOf = (loc) => (loc === "garmund" ? "garmund" : "leavel");

  // ---------------------------------------------------------------- 町の施設の一覧
  const baseExploreActions = G.exploreActions;
  G.exploreActions = () => {
    const groups = baseExploreActions();
    groups.forEach((g) => g.list.forEach((a) => { const f = a.id.startsWith("fac:") && a.id.slice(4); if (f && KW[f]) { a.kw = KW[f]; a.sub = facSub(f); } }));
    return groups;
  };
  function facSub(f) {
    const S = G.S;
    if (f === "arena") return S.w2_arenaDay === S.day ? "今日はもう戦った" : "";
    if (f === "bath") return "12G で湯に浸かる";
    return "";
  }

  // ---------------------------------------------------------------- 入る
  const ENTER = {
    field: ["畑の畦で、麦わら帽子の農夫たちが休んでいる。一人が顎で鍬の山をしゃくった。「手が空いてるなら、一日いくらで雇うよ」", "風車が軋んで回っている。畑の端には、抜いたばかりの杭が束ねてある。来年は、もう少し東に畑を移すらしい。"],
    forge: ["炉の熱で、戸口に立っただけで眉が焦げそうだ。親方が槌を止めずに怒鳴った。「素材を持ってきたなら見せな。持ってないなら帰りな」", "壁一面に、打ちかけの剣が吊るしてある。どれも、柄に土が付いている。"],
    arena: ["すり鉢の底の砂が、まだ湿って赤い。上の席で賭け屋が札を振り回している。「次の試合！ 次の試合に出る奴はいないか！」", "闘技場の係の男が、帳面を開いた。「名前と、死んだときに知らせる先を書け。知らせる先がないなら、空けとけ」"],
    bath: ["湯守の老人が、湯気の向こうからこちらを見た。「脱いだら、傷を見せな。どこの何にやられたか、当ててやる」", "湯船の縁で、獣人の老人がしっぽを湯に浸けたまま眠っている。湯守が「起こすなよ。去年、起こした客が湖まで投げられた」と言った。"],
    hunt: ["大木の根元に、獣人の狩人たちが集まって弓の弦を張っている。一人があなたの鼻先で匂いを嗅いで、「足手まといの匂いはしない」と言った。", "狩り場の入口の札。「根の上で嘘をつくな。獲物の数も」"],
  };
  function enter(f) {
    const S = G.S;
    S.mode = "fac";
    S.fac = f;
    G.log("you", `${G.FAC_NAMES[f]}に入る`);
    G.say(G.pick(ENTER[f])); // 施設で開く用語説明は lore.js が G.exploreAct を包んで開く
  }

  const baseExploreAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head === "fac" && MINE.includes(arg)) { enter(arg); return; }
    baseExploreAct(head, arg, a);
    if (head === "fac" && arg === "castle" && G.S.mode === "fac") castleColor();
  };

  // ---------------------------------------------------------------- 王城の手触り
  const LEAVEL_LINES = [
    "玉座の脇の小さな椅子が空いている。侍従が小声で言った。「先王陛下の席です。また北の森で、何かを狩っておられます」",
    "控えの間で、揃いの紋の違う使者が三人、互いを睨んでいる。どれも女王の兄君か姉君の使いで、どれも女王への贈り物を抱えている。",
    "女王の手元の分厚い本の下から、帳簿の写しの端がのぞいている。女王は頬杖のまま頁をめくった。帳簿のほうの頁だった。",
    "侍従長が、女王の縁談の申し込みの束を暖炉にくべている。「兄君さま方が、全員そろって、お断りなさいましたので」",
  ];
  const GARMUND_LINES = [
    "謁見の間の奥、皇帝の病室へ続く扉の前に、白い毛皮の老騎士が立っている。一歩も動かない。息をしているのかも分からない。",
    "廊下で、鉄の義足の女将とすれ違った。義足が石の床を鳴らすたび、衛兵たちが背筋を伸ばす。",
    "宰相の後ろの柱にもたれて、狼の耳の大男があくびをしている。誰も咎めない。咎めた者がどうなったかは、張り紙に書いてある。",
    "宰相の机の端に、張り紙の束がある。「第三皇子を讃えよ」の上に「第五皇子を讃えよ」が、その上にまた「第三皇子を讃えよ」が貼ってある。",
  ];
  function castleColor() {
    const S = G.S;
    const lines = S.loc === "garmund" ? GARMUND_LINES : LEAVEL_LINES;
    const i = Math.floor(G.rand() * lines.length);
    G.say(lines[i]);
    if (!G.openLores) return;
    if (S.loc === "garmund") G.openLores(i === 3 ? "kouji" : "yonkishi");
    else G.openLores(i === 0 ? "senou" : i === 3 ? ["kyodai", "kyodai:suitor"] : "kyodai");
  }

  // ---------------------------------------------------------------- 施設の中の行い
  const baseFacActions = G.facActions;
  G.facActions = () => {
    const S = G.S;
    const f = S.fac;
    if (f === "castle") return castleActions(baseFacActions());
    if (!MINE.includes(f)) return baseFacActions();
    const back = { title: "", list: [{ id: "back", label: `${G.FAC_NAMES[f]}を出る`, sub: "", kw: ["出る", "戻", "外"] }] };
    let g;
    if (f === "field") {
      g = { title: "畑", list: [
        { id: "field:work", label: "畑仕事を手伝う", sub: `体力 ${G.chance("体力", 0)}%・半日`, kw: ["手伝", "働", "畑仕事"] },
        { id: "field:old", label: "去年の畑を見に行く", sub: S.flags.w2_oldfield ? "もう見た" : "", disabled: !!S.flags.w2_oldfield, kw: ["去年", "森"] },
      ] };
    } else if (f === "forge") {
      g = { title: "鍛冶場（素材を渡して打たせる）", list: D.W2_FORGE.map((r, i) => {
        const it = D.ITEMS[r.give];
        const need = Object.entries(r.need).map(([id, n]) => `${D.ITEMS[id].name}${G.count(id)}/${n}`).join("・");
        const can = Object.entries(r.need).every(([id, n]) => G.count(id) >= n) && S.gold >= r.gold;
        return { id: "forge:" + i, label: `${it.name}を打たせる`, sub: `${need}・${r.gold}G・${r.days}日`, disabled: !can, kw: [it.name, "打"] };
      }) };
    } else if (f === "arena") {
      const done = S.w2_arenaDay === S.day;
      g = { title: "闘技場（一日一試合。負けても審判が止める。たいていは）", list: [
        ...D.W2_ARENA.map((t) => ({ id: "arena:" + t.id, label: `${t.name}に出る`, sub: done ? "今日はもう戦った" : `出場料 ${t.fee}G・勝てば ${t.gold}G${t.fame ? `・名声${t.fame}から` : ""}`, disabled: done || S.gold < t.fee || S.fame < t.fame, kw: [t.name, "出る", "試合"] })),
        { id: "arena:bet", label: "次の試合に賭ける", sub: `20G・知力 ${G.chance("知力", 0)}%`, disabled: S.gold < 20, kw: ["賭"] },
      ] };
    } else if (f === "bath") {
      g = { title: "湯治場", list: [
        { id: "bath:soak", label: "湯に浸かる", sub: "12G・半日・HP/MP 全快・毒が抜ける", disabled: S.gold < 12, kw: ["浸か", "湯"] },
        { id: "bath:long", label: "三日の湯治", sub: "40G・3日・全快・毒と呪いが抜ける", disabled: S.gold < 40, kw: ["湯治", "三日"] },
        { id: "bath:show", label: "湯守に傷を見せる", sub: S.w2_soak === S.day ? "今日はもう見せた" : "", disabled: S.w2_soak === S.day, kw: ["傷", "湯守"] },
      ] };
    } else if (f === "hunt") {
      g = { title: "狩り場", list: [
        { id: "hunt:join", label: "狩りに加わる", sub: `敏捷 ${G.chance("敏捷", 0)}%・1日`, kw: ["狩", "加わ"] },
      ] };
    }
    return [g, back];
  };

  function castleActions(groups) {
    const S = G.S;
    const g = groups.find((x) => x.list.some((a) => a.id === "castle:knight"));
    if (!g) return groups;
    const realm = realmOf(S.loc);
    // 手配中・悪名の高い者は願い出られない（M3 の m3_repute.js が castle:knight に掛けるのと同じ決まり）
    const inf = G.infamyHere ? G.infamyHere() : 0;
    const block = G.wanted && G.wanted() ? "手配中" : inf >= 15 ? `悪名 ${inf}。城の者が目を合わせない` : "";
    const list = (D.W2_PATRONS[realm] || []).filter((p) => !p.town || S.visited[p.town]).map((p) => ({
      id: `castle:w2knight:${p.id}`, label: p.name, sub: block || `${p.sub}（今 名声${S.fame}）`,
      disabled: !!block || S.fame < 150 || S.gold < p.gold || !!(p.flag && !S.flags[p.flag]), kw: ["騎士", "叙任", p.name],
    }));
    const i = g.list.findIndex((a) => a.id === "castle:knight");
    g.list.splice(realm === "garmund" ? i : i + 1, realm === "garmund" ? 1 : 0, ...list);
    return groups;
  }

  const baseFacAct = G.facAct;
  G.facAct = (head, arg, a) => {
    if (head === "castle") return castleAct(arg, a);
    if (head === "field") field(arg);
    else if (head === "forge") forge(Number(arg));
    else if (head === "arena") arena(arg);
    else if (head === "bath") bath(arg);
    else if (head === "hunt") hunt(arg);
    else baseFacAct(head, arg, a);
  };

  // ---------------------------------------------------------------- 王城：騎士の後ろ盾
  function castleAct(arg, a) {
    const S = G.S;
    if (!arg.startsWith("w2knight:")) {
      if (arg === "throne" && S.loc === "garmund") G.say("玉座の間の扉が閉じられた。病室の扉の前の老騎士は、こちらを見もしなかった。あれは、皇帝のそばを離れない。");
      baseFacAct("castle", arg, a);
      if (arg === "lord" && S.w2_patron) G.say(`後ろ盾の${S.w2_patron.short}から、祝いの品の代わりに、次の頼みごとを書いた手紙が届いた。`);
      return;
    }
    const realm = realmOf(S.loc);
    const p = (D.W2_PATRONS[realm] || []).find((x) => `w2knight:${x.id}` === arg);
    if (!p || S.title || S.fame < 150 || S.gold < p.gold || (p.flag && !S.flags[p.flag]) || (p.town && !S.visited[p.town])) return;
    if (p.stat) {
      G.log("you", p.name + "騎士の位を願い出る");
      G.passDays(1);
      const r = G.check(p.stat, p.diff, "兄姉の見定め");
      if (!r.ok) { G.say(p.ng); return; }
      G.say(p.ok);
      if (G.openLores) G.openLores("kyodai:" + p.id);
    } else if (p.line) G.say(p.line);
    // 騎士の叙任（explore.js の castle("knight") と同じ。払う金だけ後ろ盾で変わる）
    const L = G.loc();
    const ruler = realm === "garmund" ? "宰相" : "女王エレオノーラ";
    S.gold -= p.gold; S.title = "騎士"; G.give("royalwrit");
    if (G.nationOf) S.titleAt = G.nationOf(); // M3：位を授けた国（手配されると取り上げられる）
    G.log("you", "騎士の位を賜る");
    G.say(`${ruler}の剣が、あなたの肩に触れた。「汝を騎士に叙する」寄進の${p.gold}Gは、儀式の前に回収されていた。`);
    G.chron(`${L.name}で騎士に叙任される`, "trophy");
    {
      const short = p.name.replace(/の推挙で$|に仕える$/, "");
      S.w2_patron = { realm, id: p.id, name: p.name, short, day: S.day };
      G.memo(realm === "garmund" ? `帝国で${short}に仕える騎士になった` : `${short}の推挙で騎士になった`);
      if (p.lore && G.openLores) G.openLores(p.lore);
    }
    if (realm === "garmund" && G.openLores) G.openLores("kouji");
  }

  // ---------------------------------------------------------------- 畑
  function field(arg) {
    const S = G.S;
    if (arg === "work") {
      G.log("you", "畑仕事を手伝う");
      G.pass(2);
      const r = G.check("体力", 0, "畑仕事");
      if (r.ok) {
        const g = 6 + G.d(6);
        S.gold += g;
        G.say(G.pick([
          "日が傾くまで麦を刈った。昼には、農夫の女房が黒パンと豆の煮込みを畦まで運んできた。",
          "杭を抜いて、東へ十歩ずらして打ち直した。理由を聞くと、農夫は「毎年そうするんだ」とだけ言った。",
          "風車の粉袋を担いで往復した。粉屋の親父は、袋を数えるたびに数を一つ間違える。",
        ]));
        G.note(`日当 +${g}G`);
        G.heal(4);
        if (r.crit) { G.give("w2_whitebread"); G.say("働きぶりを見ていた農夫の女房が、白パンを一つ持たせてくれた。「誓いの日の残りだよ。内緒だからね」"); }
      } else {
        S.gold += 2;
        G.say("鍬の柄で自分の足を打った。農夫たちは笑って、半日分の日当から、手当の分を差し引いた。");
        G.note("日当 +2G");
        G.hurt(2, "畑で鍬を踏んだ");
      }
    } else if (arg === "old") {
      if (S.flags.w2_oldfield) return;
      S.flags.w2_oldfield = true;
      G.log("you", "去年の畑を見に行く");
      G.pass(1);
      G.say("畦の杭を西へたどると、胸の高さの若木の森に行き当たった。去年の秋までは麦畑だった、と案内の男の子が言う。若木の根元に、刈り残しの麦の穂が、まだ黄色く揺れていた。森の奥のほうが、少しだけ、踏みしだかれたように開けている。");
      G.give("herb");
      G.note("薬草を手に入れた。");
      if (G.openLores) G.openLores("midori:forest");
    }
  }

  // ---------------------------------------------------------------- 鍛冶場
  function forge(i) {
    const S = G.S;
    const r = D.W2_FORGE[i];
    if (!r || S.gold < r.gold || !Object.entries(r.need).every(([id, n]) => G.count(id) >= n)) return;
    const it = D.ITEMS[r.give];
    Object.entries(r.need).forEach(([id, n]) => G.take(id, n));
    S.gold -= r.gold;
    G.log("you", `${it.name}を打たせる`);
    G.note(`所持金 -${r.gold}G`);
    G.passDays(r.days);
    G.say(r.line);
    G.give(r.give);
    G.note(`${it.name}を手に入れた。`);
    S.counters.w2_forged = (S.counters.w2_forged || 0) + 1;
  }

  // ---------------------------------------------------------------- 闘技場
  function arena(arg) {
    const S = G.S;
    if (arg === "bet") {
      S.gold -= 20;
      G.log("you", "次の試合に賭ける");
      G.pass(1);
      const r = G.check("知力", 0, "賭け");
      if (r.ok) { S.gold += 45; G.say("あなたが賭けたほうの男が、相手の兜を砂に叩き落とした。賭け屋は舌打ちしながら札を払った。"); G.note("+45G"); }
      else G.say(G.pick(["あなたが賭けたほうの男は、入場の階段で転んで棄権になった。賭け屋が笑っている。", "試合は引き分けになった。引き分けは胴元の総取りだと、札の裏に小さく書いてあった。"]));
      return;
    }
    const t = D.W2_ARENA.find((x) => String(x.id) === arg);
    if (!t || S.w2_arenaDay === S.day || S.gold < t.fee || S.fame < t.fame) return;
    S.gold -= t.fee;
    S.w2_arenaDay = S.day;
    G.log("you", `闘技場の${t.name}に出る`);
    G.pass(1);
    G.say(`出場料 ${t.fee}G を払った。鉄の格子が上がり、すり鉢の底へ出る。上の席から、雪と一緒に野次が降ってくる。`);
    const first = !S.flags["w2_arena" + t.id];
    const win = { text: G.pick(["審判が旗を上げた。上の席から、硬貨と、食べかけの石窯包みが降ってきた。", "相手が砂に膝をついた。賭け屋の悲鳴と、兵たちの足踏みで、すり鉢が揺れた。"]), gold: t.gold, fame: t.win, flag: "w2_arena" + t.id };
    if (first) {
      win.chron = `闘技の都ザルグロスの${t.name}で勝つ`;
      if (t.id === 3) { win.text += " 上の席の端で、鉄の義足が一度だけ床を鳴らした。拍手の代わりらしい。"; win.lore = "yonkishi:leg"; }
    }
    G.startCombat(G.pick(t.foes), { win });
    if (S.combat) S.combat.w2_arena = true;
  }

  // 闘技場では、倒れる前に審判が止める（大失敗の日は、止めるのが遅れる）
  const baseHurt = G.hurt;
  G.hurt = (n, cause) => {
    const S = G.S;
    const C = S && S.combat;
    if (C && C.w2_arena && !S.over && S.hp - n <= 0 && !C.w2_late) {
      S.hp = 1;
      C.w2_yield = true;
      if (G.rand() < 0.1) C.w2_late = true; // 次に倒れたら、止めが間に合わない
      return;
    }
    baseHurt(n, cause);
  };
  const baseCombatAct = G.combatAct;
  G.combatAct = (arg) => {
    const r = baseCombatAct(arg);
    const S = G.S;
    const C = S && S.combat;
    if (C && C.w2_yield && !S.over) {
      S.flags.w2_yield = (S.flags.w2_yield || 0) + 1;
      G.say("審判の棒が、あなたと相手のあいだに差し込まれた。「そこまで！」砂の上で、あなたは自分の負けを聞いた。上の席から、腐った玉葱が一つ飛んできた。");
      G._endCombat("fled");
    }
    return r;
  };

  // ---------------------------------------------------------------- 湯治場
  const WOUNDS = [
    "湯守はあなたの肩の傷を指でなぞった。「こりゃ獣の歯だ。犬じゃない。犬はもっと雑に噛む」",
    "湯守はあなたの脛を見て鼻を鳴らした。「転んだ傷だな。化け物のせいにするなよ」",
    "湯守はあなたの背中を見て、しばらく黙った。「……背中から斬られたことがあるな。誰にかは聞かない」",
    "湯守はあなたの腕の火傷の痕を見た。「術の火だ。自分の火で焼けたのか。借りた火は、ときどき持ち主を間違える」",
    "湯守はあなたの首筋を見て、何もないのを確かめてから、ほっとした顔をした。何を探したのかは言わなかった。",
    "湯守は傷を一つ一つ数えて、指が足りなくなった。「あんた、あと三年だな」冒険者はみんなそう言われる、と隣の客が笑った。",
  ];
  function bath(arg) {
    const S = G.S;
    if (arg === "soak") {
      S.gold -= 12;
      G.log("you", "湯に浸かる");
      G.pass(2);
      S.hp = S.maxHp; S.mp = S.maxMp;
      S.conds = S.conds.filter((c) => c !== "毒");
      G.say(G.pick(["熱い湯に肩まで沈むと、体じゅうの古傷が一度にしみて、それから、何も痛くなくなった。", "湯気の向こうで、エルフの常連が「三百年前のほうが熱かった」と言った。誰も返事をしない。", "湯の底の石が温かい。獣人の子どもが、あなたの足の指を魚だと思って突ついてくる。"]));
      G.note("HP と MP が全快した。");
    } else if (arg === "long") {
      S.gold -= 40;
      G.log("you", "三日の湯治をする");
      G.passDays(3);
      S.hp = S.maxHp; S.mp = S.maxMp; S.clungUsed = false;
      const had = S.conds.includes("呪い");
      S.conds = S.conds.filter((c) => c !== "毒" && c !== "呪い");
      G.say("三日、湯に浸かって、食べて、眠った。湯守は毎朝、あなたの傷を数え直した。");
      if (had) G.say("三日目の朝、湯の色が一度だけ黒く濁って、すぐに澄んだ。湯守は黙って湯を入れ替えた。体が軽い。");
      G.note("HP と MP が全快した。");
    } else if (arg === "show") {
      if (S.w2_soak === S.day) return;
      S.w2_soak = S.day;
      G.log("you", "湯守に傷を見せる");
      G.say(G.pick(WOUNDS));
    }
  }

  // ---------------------------------------------------------------- 狩り場
  function hunt() {
    const S = G.S;
    G.log("you", "狩りに加わる");
    G.passDays(1);
    const r = G.check("敏捷", 0, "狩り");
    if (r.ok) {
      G.give("pelt"); G.give("jerky", 2);
      G.say(G.pick([
        "風下から回り込み、藪から飛び出した鹿を追い込んだ。とどめは狩人頭が刺した。分け前に毛皮と干し肉をもらった。",
        "獣人の若者が三本続けて矢を外し、四本目で木の上の鳥の巣を落とした。鹿はあなたが仕留めた。若者は、なぜか一番喜んでいた。",
      ]));
      G.note("上等な毛皮と干し肉×2 を手に入れた。");
      if (r.crit) { G.give("pelt"); G.addFame(2); G.say("狩人頭が、あなたの額に獲物の血で線を一本引いた。一人前の狩人の印らしい。"); }
    } else if (r.fumble || G.rand() < 0.3) {
      G.say("獲物を追ううちに、狩り場の外れまで出てしまった。茂みが揺れる。獲物ではない。");
      G.startCombat(G.pick([["wolf", "wolf"], ["werewolf"], ["spider"]]), {});
    } else {
      G.say("一日じゅう藪に伏せていたが、あなたの匂いで獲物はみんな逃げた。狩人たちは鼻をつまんで笑った。");
    }
  }

  // ---------------------------------------------------------------- 出来事の場所のタグ（雪の地方）
  const SNOW = ["w2_zalgros", "w2_echo", "w2_shadow", "w2_acid"];
  const baseTags = G.eventTags;
  G.eventTags = () => {
    const t = baseTags();
    if (SNOW.includes(G.S.loc) && !t.includes("snow")) t.push("snow");
    return t;
  };
})(globalThis.G = globalThis.G || {});
