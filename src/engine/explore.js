// 探索・旅・迷宮・町の施設・ギルドの依頼・王城。レーン W（ワールド）と F（施設）が管理
(function (G) {
  const D = G.data;

  const FAC_NAMES = { inn: "宿屋", tavern: "酒場", shop: "商店", guild: "冒険者ギルド", church: "教会", train: "訓練場", alley: "裏路地", castle: "王城" };
  const FAC_KW = {
    inn: ["宿", "泊", "寝", "休"], tavern: ["酒場", "酒", "噂", "飲"], shop: ["店", "買", "売"], guild: ["ギルド", "依頼", "仕事"],
    church: ["教会", "治療", "祈"], train: ["訓練", "鍛", "修行"], alley: ["裏", "路地", "闇"], castle: ["城", "謁見", "国王", "皇帝", "王"],
  };
  G.FAC_NAMES = FAC_NAMES;

  // ---------------------------------------------------------------- その場所でできること
  G.exploreActions = () => {
    const S = G.S;
    const L = G.loc();
    const groups = [];
    if (L.type === "town") {
      groups.push({ title: L.name, list: [
        ...L.fac.map((f) => ({ id: "fac:" + f, label: FAC_NAMES[f], sub: facSub(f), kw: FAC_KW[f] })),
        { id: "walk", label: "町をぶらつく", sub: "何か起きるかも", kw: ["歩", "ぶらつ", "散歩", "町を", "見て回"] },
      ] });
    } else if (L.type === "wild") {
      groups.push({ title: L.name, list: [
        { id: "explore", label: "あたりを探索する", sub: `危険度 ${L.danger}`, kw: ["探索", "探", "調べ", "歩き回", "狩"] },
        { id: "camp", label: "野営して休む", sub: "HP と MP が回復・襲われることも", kw: ["野営", "休", "寝", "キャンプ", "焚き火"] },
      ] });
    } else {
      const maxed = S.depth >= L.floors && S.flags[bossFlag(L)];
      groups.push({ title: `${L.name}（${S.depth ? `地下${S.depth}階／全${L.floors}階` : "入口"}）`, list: [
        { id: "deeper", label: S.depth ? "奥へ進む" : "迷宮に入る", sub: S.depth + 1 >= L.floors && !S.flags[bossFlag(L)] ? "最奥に主がいる" : `危険度 ${L.danger}`, disabled: !!maxed, kw: ["奥", "進", "入", "潜", "下"] },
        ...(S.depth ? [{ id: "leave", label: "入口まで引き返す", sub: "", kw: ["戻", "引き返", "出る", "脱出"] }] : [
          { id: "camp", label: "入口で野営する", sub: "HP と MP が回復・襲われることも", kw: ["野営", "休", "寝", "キャンプ"] }]),
      ] });
    }
    if (!(L.type === "dungeon" && S.depth > 0)) {
      const travel = Object.entries(L.links).map(([id, days]) => {
        const T = D.LOCS[id];
        return { id: "travel:" + id, label: `${T.name}へ`, sub: `${days}日・${T.type === "town" ? "町" : "危険度 " + T.danger}`, kw: [T.name, T.name.replace(/^.*[・]/, "")] };
      });
      Object.entries(L.sea || {}).forEach(([id, s]) => {
        const T = D.LOCS[id];
        travel.push({ id: "sail:" + id, label: `船で${T.name}へ`, sub: `${s.days}日・${s.cost}G`, disabled: S.gold < s.cost, kw: [T.name, "船"] });
      });
      groups.push({ title: "旅立つ", list: travel });
    }
    return groups;
  };

  function facSub(f) {
    const S = G.S;
    const done = S.quests.filter((q) => q.done).length;
    if (f === "guild" && done) return `報告できる依頼 ${done}`;
    if (f === "inn") return `${innCost()}G で一晩`;
    return "";
  }
  const innCost = () => (G.loc().capital ? 10 : 5);
  const bossFlag = (L) => (L.reward && L.reward.flag) || "boss:" + G.S.loc;

  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const L = G.loc();
    switch (head) {
      case "fac": enterFac(arg); break;
      case "walk": walk(); break;
      case "explore": explore(); break;
      case "camp": camp(); break;
      case "deeper": deeper(); break;
      case "leave": S.depth = 0; G.pass(1); G.log("you", "入口まで引き返す"); G.say(`${L.name}の入口まで戻ってきた。外の空気がうまい。`); break;
      case "travel": travel(arg, L.links[arg], 0); break;
      case "sail": travel(arg, L.sea[arg].days, L.sea[arg].cost); break;
      case "back": S.mode = "explore"; S.fac = null; G.log("you", "外に出る"); break;
      default: G.facAct(head, arg, a);
    }
  };

  function walk() {
    G.log("you", "町をぶらつく");
    G.pass(1);
    if (G.rand() < 0.55) { const e = G.randomEvent(); if (e) { G.startEvent(e); return; } }
    G.say(G.pick([
      "露店の呼び込みと、酔っ払いの歌と、どこかの喧嘩の音。いつもの町だ。",
      "路地の奥で、衛兵が浮浪者を蹴り飛ばしている。誰も足を止めない。",
      "広場で吟遊詩人が、使徒に滅ぼされた街の歌を歌っている。客は少ない。帽子の中には、銅貨が二枚。",
      "焼き栗の匂いにつられて、つい一袋買ってしまった。半分は焦げていた。",
      "壁に貼られた手配書の中に、見覚えのある顔があった気がする。近づいてみると、雨に滲んで、誰でもなかった。",
      "洗濯物の下をくぐる。二階の窓から、赤ん坊の泣き声と、それをあやす下手な歌が降ってくる。",
      "井戸端で女たちが笑っている。あなたが通りかかると、声が少しだけ低くなった。",
    ]));
  }

  function explore() {
    const S = G.S;
    const L = G.loc();
    G.log("you", "あたりを探索する");
    G.pass(1);
    const r = G.rand();
    if (r < 0.4) { const e = G.randomEvent(); if (e) { G.startEvent(e); return; } }
    if (r < 0.8) { G.startCombat(encounter(L), {}); return; }
    const gold = G.d(10 * Math.max(1, L.danger)) + 3;
    S.gold += gold;
    G.say(G.pick(["草むらの中で、つま先が何かを蹴った。誰かが落とした財布だ。持ち主の姿は、どこにもない。", "倒木の下に、旅人の荷が埋もれていた。革は腐り、中身だけが乾いている。", "崖の割れ目で、何かが日の光を照り返した。手を差し入れると、冷たい金属に触れた。"]));
    G.note(`${gold}G を手に入れた。`);
    if (G.rand() < 0.3) { G.give("herb"); G.note("薬草を手に入れた。"); }
  }

  function encounter(L) {
    const pool = (L.pool || ["goblin", "wolf", "bandit"]).filter((id) => !D.ENEMIES[id].boss);
    const n = G.rand() < 0.35 + 0.05 * (L.danger || 1) ? 2 : 1;
    const out = [];
    for (let i = 0; i < n; i++) out.push(G.pick(pool));
    return out;
  }

  function camp() {
    const S = G.S;
    const L = G.loc();
    G.log("you", "野営して休む");
    G.sleep();
    S.clungUsed = false;
    G.heal(Math.ceil(S.maxHp * 0.6));
    S.mp = S.maxMp;
    G.say("焚き火のはぜる音を聞きながら、浅い眠りについた。");
    G.note("HP が回復し、MP が全快した。");
    if (G.rand() < 0.12 + 0.05 * L.danger) { G.say("物音で目が覚めた。火の向こうの暗がりに、目がいくつも光っている。"); G.startCombat(encounter(L), {}); }
  }

  function deeper() {
    const S = G.S;
    const L = G.loc();
    G.log("you", S.depth ? "奥へ進む" : "迷宮に入る");
    G.pass(1);
    S.depth++;
    S.quests.forEach((q) => { if (q.type === "delve" && !q.done && q.loc === S.loc && S.depth >= q.need) { q.done = true; G.note(`依頼「${q.title}」を達成した。ギルドに報告しよう。`); } });
    G.log("title", `${L.name} 地下${S.depth}階`);
    if (G.voiceLine && S.depth < L.floors) { const t = G.voiceLine("descend", null, ""); if (t) G.say(t); } // 語り（D7）
    const bf = bossFlag(L);
    if (S.depth >= L.floors) {
      if (!S.flags[bf]) {
        const boss = D.ENEMIES[L.boss];
        G.say(`最奥の広間。空気が重い。${boss.name}が、待っていた。`);
        const rw = L.reward || {};
        G.startCombat([L.boss], { win: { text: rw.text, flag: bf, item: rw.item, fame: rw.fame, trophy: rw.trophy, chron: rw.chron } });
        return;
      }
      G.say("最奥の広間は静まり返っている。主はもういない。天井から、埃がゆっくり降りてくる。");
      return;
    }
    const mid = L.midboss && L.midboss[S.depth];
    const mf = `mid:${S.loc}:${S.depth}`;
    if (mid && !S.flags[mf]) {
      G.say(`行く手を${D.ENEMIES[mid].name}が塞いでいる。`);
      G.startCombat([mid], { win: { flag: mf, chron: `${L.name}で${D.ENEMIES[mid].name}を倒す` } });
      return;
    }
    const r = G.rand();
    if (r < 0.45) { G.startCombat(encounter(L), {}); return; }
    if (r < 0.8) { const e = G.randomEvent(); if (e) { G.startEvent(e); return; } }
    const gold = G.d(20 * L.danger) + 10;
    S.gold += gold;
    G.say("崩れた壁の奥で、明かりを何かが照り返した。古い金貨だ。持ち主の骨は、見当たらない。");
    G.note(`${gold}G を手に入れた。`);
    if (G.rand() < 0.25) { const it = G.pick(["potion", "gem", "manawater"]); G.give(it); G.note(`${D.ITEMS[it].name}を手に入れた。`); }
  }

  // ---------------------------------------------------------------- 旅
  function travel(dest, days, cost) {
    const S = G.S;
    const from = G.loc();
    const T = D.LOCS[dest];
    if (cost) { S.gold -= cost; G.note(`船賃 -${cost}G`); }
    G.log("you", `${T.name}へ向かう`);
    G.passDays(days);
    S.counters.travels++;
    const danger = Math.max(from.danger || 0, T.danger || 0);
    const p = Math.min(0.7, 0.12 + 0.08 * danger + 0.03 * days);
    if (!cost && G.rand() < p) {
      S.travel = dest;
      const src = (T.pool ? T : from.pool ? from : { pool: ["bandit", "wolf", "goblin"], danger: 1 });
      G.say(`${days}日の旅の途中、何者かに襲われた。`);
      G.startCombat(encounter(src), { after: "arrive" });
      return;
    }
    if (cost && G.rand() < 0.25) G.say("船旅は荒れた。甲板で吐いている間に、財布の紐がゆるくなった気がする。");
    G.arrive(dest);
  }

  G.arrive = (dest) => {
    const S = G.S;
    S.travel = null;
    S.loc = dest;
    S.depth = 0;
    S.mode = "explore";
    S.fac = null;
    const L = G.loc();
    G.log("title", L.name);
    if (!S.visited[dest]) {
      S.visited[dest] = true;
      G.chron(`初めて${L.name}に足を踏み入れる`, "travel");
    }
    G.say(L.desc);
    S.quests.forEach((q) => {
      if (q.type === "deliver" && !q.done && q.loc === dest && G.take("package")) { q.done = true; G.note(`荷物を届けた。依頼「${q.title}」を達成した。ギルドに報告しよう。`); }
    });
  };

  // ---------------------------------------------------------------- 施設
  function enterFac(f) {
    const S = G.S;
    S.mode = "fac";
    S.fac = f;
    G.log("you", `${FAC_NAMES[f]}に入る`);
    const L = G.loc();
    const lines = {
      inn: "宿の主人が帳場から顔を上げた。「一晩いくらかは分かってるな？」",
      tavern: "安酒と汗と焼いた肉の匂い。傭兵たちが卓を囲み、噂話と賭け事に興じている。",
      shop: "所狭しと武具と雑貨が並ぶ。店主は客の懐具合を一瞬で見抜く目をしている。",
      guild: "依頼の紙が壁一面に貼られている。受付嬢が退屈そうに爪を磨いている。",
      church: "光天教会の礼拝堂。三柱の神の像が、無表情にこちらを見下ろしている。",
      train: "木剣を打ち合う音と怒声。教官が腕を組んでこちらを値踏みしている。",
      alley: "表通りの喧騒が遠のく。ここでは金と刃物だけが通じる。",
      castle: L.id === "garmund" || G.S.loc === "garmund" ? "黒い石の城。病床の皇帝に代わり、宰相が謁見を取り仕切っている。" : "白い大理石の謁見の間。玉座は、たいてい空いている。灰銀の髪の国王ヴァレオンは、化け物の足跡を追って城を空けがちだと、侍従が言った。",
    };
    G.say(lines[f]);
    if (f === "guild") refreshBoard();
    if (f === "tavern") refreshRecruits();
  }

  G.facActions = () => {
    const S = G.S;
    const f = S.fac;
    const L = G.loc();
    const back = { title: "", list: [{ id: "back", label: `${FAC_NAMES[f]}を出る`, sub: "", kw: ["出る", "戻", "外"] }] };
    const g = [];
    if (f === "inn") {
      g.push({ title: "宿屋", list: [
        { id: "inn:rest", label: "泊まる", sub: `${innCost()}G・HP/MP 全快・毒が抜ける`, disabled: S.gold < innCost(), kw: ["泊", "寝", "休"] },
        { id: "inn:meal", label: "温かい食事", sub: "3G・HP+5", disabled: S.gold < 3, kw: ["食", "飯"] },
      ] });
    } else if (f === "tavern") {
      const list = [
        { id: "tavern:rumor", label: "噂を聞く", sub: "2G", disabled: S.gold < 2, kw: ["噂", "話を聞", "情報"] },
        { id: "tavern:drink", label: "客と飲み交わす", sub: `魅力 ${G.chance("魅力", 0, G.gearBonus("talk"))}%・5G`, disabled: S.gold < 5, kw: ["飲", "酒"] },
        { id: "tavern:gamble", label: "骰子博打", sub: `知力 ${G.chance("知力", -10)}%・10G賭ける`, disabled: S.gold < 10, kw: ["博打", "賭", "骰子"] },
      ];
      (S.recruits ? S.recruits.list : []).forEach((c, i) => {
        if (c.hired) return;
        list.push({ id: "tavern:hire:" + i, label: `${c.name}を雇う`, sub: `${c.fee}G・腕前 ${c.power}`, disabled: S.gold < c.fee || S.companions.length >= 3, kw: ["雇", "仲間", c.name] });
      });
      g.push({ title: "酒場", list });
    } else if (f === "shop") {
      const stock = [...new Set([...(L.shop || []), ...D.SHOP_BASE])];
      g.push({ title: "買う", list: stock.map((id) => { const it = D.ITEMS[id]; return { id: "shop:buy:" + id, label: it.name, sub: `${it.price}G${itemBrief(it)}`, disabled: S.gold < it.price, kw: ["買", it.name] }; }) });
      const sellable = Object.keys(S.inv).filter((id) => { const it = G.itemInfo(id); return it && it.type !== "key" && !it.key; });
      if (sellable.length) g.push({ title: "売る", list: sellable.map((id) => { const it = G.itemInfo(id); return { id: "shop:sell:" + id, label: `${it.name}（${S.inv[id]}）`, sub: `${sellPrice(id)}G`, kw: ["売", it.name] }; }) });
    } else if (f === "guild") {
      const list = [];
      S.quests.forEach((q) => { if (q.done) list.push({ id: "guild:report:" + q.id, label: `報告：${q.title}`, sub: `${q.reward}G・名声+${q.fame}`, kw: ["報告", q.title] }); });
      (S.board ? S.board.list : []).forEach((q) => {
        if (q.taken) return;
        list.push({ id: "guild:take:" + q.id, label: `受ける：${q.title}`, sub: `${q.reward}G・${q.desc}`, disabled: S.quests.length >= 3, kw: ["受", q.title] });
      });
      if (!list.length) list.push({ id: "guild:none", label: "今は依頼がない", sub: "", disabled: true });
      g.push({ title: `冒険者ギルド（受けている依頼 ${S.quests.length}/3）`, list });
    } else if (f === "church") {
      g.push({ title: "教会", list: [
        { id: "church:heal", label: "治療を受ける", sub: "15G・HP 全快・毒と呪いを祓う", disabled: S.gold < 15, kw: ["治療", "治", "祓"] },
        { id: "church:pray", label: "祈る", sub: `魔力 ${G.chance("魔力", 0)}%・1日1回`, disabled: S.flags.prayed === S.day, kw: ["祈"] },
        { id: "church:donate", label: "50G 寄付する", sub: "名声+3", disabled: S.gold < 50, kw: ["寄付"] },
      ] });
    } else if (f === "train") {
      g.push({ title: `訓練場（30G・2日。今の値が低いほど伸びやすい）`, list: D.STATS.map((k) => ({
        id: "train:" + k, label: `${k}を鍛える`, sub: S.stats[k] >= S.caps[k] ? "才能の限界" : `今 ${S.stats[k]}・伸びる見込み ${Math.max(20, 100 - S.stats[k])}%`,
        disabled: S.gold < 30 || S.stats[k] >= S.caps[k], kw: [k, "鍛", "訓練"],
      })) });
    } else if (f === "alley") {
      g.push({ title: "裏路地", list: [
        { id: "alley:steal", label: "スリを働く", sub: `敏捷 ${G.chance("敏捷", 0, G.gearBonus("steal"))}%`, kw: ["盗", "スリ", "掏"] },
        { id: "alley:gamble", label: "裏賭場でイカサマ", sub: `敏捷 ${G.chance("敏捷", "難しい", G.gearBonus("steal"))}%・30G賭ける`, disabled: S.gold < 30, kw: ["賭", "イカサマ"] },
        { id: "alley:info", label: "情報屋から話を買う", sub: "20G", disabled: S.gold < 20, kw: ["情報屋", "情報"] },
      ] });
    } else if (f === "castle") {
      const list = [];
      if (!S.title) list.push({ id: "castle:knight", label: "騎士の位を願い出る", sub: `名声150・500G（今 ${S.fame}）`, disabled: S.fame < 150 || S.gold < 500, kw: ["騎士", "叙任"] });
      if (S.title === "騎士") list.push({ id: "castle:lord", label: "領地を賜る", sub: `名声300・3000G（今 ${S.fame}）`, disabled: S.fame < 300 || S.gold < 3000, kw: ["領地", "領主"] });
      if (S.title === "領主") list.push({ id: "castle:throne", label: "王位を奪う", sub: `名声600（今 ${S.fame}）・近衛騎士団長と一騎打ち`, disabled: S.fame < 600, kw: ["王位", "玉座", "王"] });
      list.push({ id: "castle:audience", label: "謁見を願い出る", sub: "", kw: ["謁見"] });
      g.push({ title: "王城", list });
    }
    g.push(back);
    return g;
  };

  function itemBrief(it) {
    if (it.type === "weapon") return `・${it.dmg[0]}D${it.dmg[1]}+${it.dmg[2]}${it.hit ? "・命中" + G.sign(it.hit) : ""}${it.pierce ? "・絶界を破る" : ""}`;
    if (it.type === "armor") return `・防御${it.def}${it.agi ? "・敏捷" + G.sign(it.agi) : ""}`;
    if (it.hp) return `・HP+${it.hp > 100 ? "全快" : it.hp}`;
    if (it.mp) return `・MP+${it.mp}`;
    return it.desc ? "・" + it.desc.slice(0, 16) : "";
  }
  const sellPrice = (id) => { const it = G.itemInfo(id); return it.type === "loot" ? it.price : Math.floor(it.price / 2); };

  G.facAct = (head, arg) => {
    const S = G.S;
    const L = G.loc();
    if (head === "inn") {
      if (arg === "rest") {
        S.gold -= innCost(); G.log("you", "宿に泊まる"); G.sleep(); S.hp = S.maxHp; S.mp = S.maxMp; S.clungUsed = false;
        S.conds = S.conds.filter((c) => c !== "毒");
        G.say("久しぶりのまともな寝床。朝までぐっすり眠った。"); G.note("HP と MP が全快した。");
      } else if (arg === "meal") { S.gold -= 3; G.log("you", "食事をとる"); G.heal(5); G.say("煮込みと黒パン。腹が満ちると、少し生き返った気がする。"); G.pass(1); }
    } else if (head === "tavern") tavern(arg);
    else if (head === "shop") {
      const [kind, id] = arg.split(":");
      if (kind === "buy") { const it = D.ITEMS[id]; S.gold -= it.price; G.give(id); G.log("you", `${it.name}を買う`); G.note(`${it.name}を買った。（-${it.price}G）`); }
      else { const p = sellPrice(id); const it = G.itemInfo(id); G.take(id); S.gold += p; G.log("you", `${it.name}を売る`); G.note(`${it.name}を売った。（+${p}G）`); }
    } else if (head === "guild") guild(arg);
    else if (head === "church") church(arg);
    else if (head === "train") train(arg);
    else if (head === "alley") alley(arg);
    else if (head === "castle") castle(arg);
  };

  function tavern(arg) {
    const S = G.S;
    if (arg === "rumor") { S.gold -= 2; G.log("you", "噂を聞く"); const r = G.pick(D.RUMORS); G.say(`酔った傭兵が声をひそめた。「${r}」`); G.memo("噂：" + r); G.pass(1); }
    else if (arg === "drink") {
      S.gold -= 5; G.log("you", "客と飲み交わす"); G.pass(1);
      const r = G.check("魅力", 0, "飲み交わす", G.gearBonus("talk"));
      if (r.ok) { G.say("すっかり打ち解けた。帰りがけに、とっておきの話を聞かせてくれた。"); const rr = G.pick(D.RUMORS); G.say(`「${rr}」`); G.memo("噂：" + rr); G.addFame(1); }
      else { G.say("酒癖の悪い男に絡まれ、殴り合いになった。"); G.hurt(3, "酒場の喧嘩で打ちどころが悪かった"); }
    } else if (arg === "gamble") {
      G.log("you", "骰子博打に10G賭ける"); G.pass(1);
      const r = G.check("知力", -10, "博打");
      if (r.crit) { S.gold += 60; G.say("大勝ちだ！ 卓の全員があなたを睨んでいる。"); G.note("+60G"); }
      else if (r.ok) { S.gold += 10; G.say("勝った。"); G.note("+10G"); }
      else { S.gold -= 10; G.say("負けた。"); G.note("-10G"); }
    } else if (arg.startsWith("hire:")) {
      const c = S.recruits.list[Number(arg.slice(5))];
      if (!c || c.hired) return;
      S.gold -= c.fee; c.hired = true; G.log("you", `${c.name}を雇う`);
      G.say(`「${G.pick(["金の分は働く", "よろしく頼むぜ、雇い主さん", "死ぬときは一緒だ。……冗談だよ", "足手まといにはならない"])}」`);
      G.addCompanion({ name: c.name, cls: c.cls, power: c.power, dmg: c.dmg, desc: c.desc, heal: c.heal, fire: c.fire });
    }
  }
  function refreshRecruits() {
    const S = G.S;
    if (S.recruits && S.recruits.loc === S.loc && S.day - S.recruits.day < 5) return;
    const list = [0, 1].map(() => { const c = G.genCompanion(); c.fee = 40 + c.power * 2; return c; });
    S.recruits = { loc: S.loc, day: S.day, list };
  }

  // ---------------------------------------------------------------- ギルド
  function refreshBoard() {
    const S = G.S;
    if (S.board && S.board.loc === S.loc && S.day - S.board.day < 7) return;
    const maxDanger = G.clamp(1 + Math.floor(S.fame / 40), 1, 5);
    const places = Object.entries(D.LOCS).filter(([, L]) => L.type !== "town" && L.danger <= maxDanger);
    const towns = Object.keys(D.LOCS).filter((k) => D.LOCS[k].type === "town" && k !== S.loc);
    const list = [];
    for (let i = 0; i < 3; i++) {
      const kind = G.pick(["hunt", "hunt", "delve", "deliver"]);
      const qid = "q" + S.day + "_" + i + "_" + Math.floor(G.rand() * 1e5);
      if (kind === "deliver" || !places.length) {
        const to = G.pick(towns);
        list.push({ id: qid, type: "deliver", loc: to, title: `${D.LOCS[to].name}への荷運び`, desc: `${D.LOCS[to].name}へ荷物を届ける`, reward: 60 + G.d(40), fame: 3 });
        continue;
      }
      const [lid, L] = G.pick(places);
      if (kind === "delve" && L.type === "dungeon") {
        const need = Math.min(L.floors - 1, 1 + G.d(2));
        list.push({ id: qid, type: "delve", loc: lid, need, title: `${L.name}の地下${need}階の調査`, desc: `地下${need}階まで潜る`, reward: 50 * L.danger + G.d(30), fame: 3 * L.danger + 2 });
      } else {
        const pool = (L.pool || []).filter((id) => !D.ENEMIES[id].boss);
        const target = G.pick(pool);
        const need = G.d(2);
        list.push({ id: qid, type: "hunt", loc: lid, target, need, progress: 0, title: `${L.name}の${D.ENEMIES[target].name}退治`, desc: `${D.ENEMIES[target].name}を${need}体`, reward: (25 * L.danger + G.d(20)) * need, fame: 3 * L.danger + 1 });
      }
    }
    S.board = { loc: S.loc, day: S.day, list };
  }
  function guild(arg) {
    const S = G.S;
    const [kind, qid] = arg.split(":");
    if (kind === "take") {
      const q = S.board.list.find((x) => x.id === qid);
      if (!q || q.taken || S.quests.length >= 3) return;
      q.taken = true;
      S.quests.push({ ...q, progress: q.progress || 0, done: false });
      G.log("you", `依頼「${q.title}」を受ける`);
      G.say("受付嬢が判を押した。「死んでも補償はありませんので」");
      if (q.type === "deliver") { G.give("package"); G.note("ギルドの荷物を預かった。"); }
    } else if (kind === "report") {
      const i = S.quests.findIndex((x) => x.id === qid && x.done);
      if (i < 0) return;
      const q = S.quests[i];
      S.quests.splice(i, 1);
      S.gold += q.reward;
      S.counters.quests++;
      G.log("you", `依頼「${q.title}」を報告する`);
      G.say("受付嬢は報酬の袋を投げてよこした。「お疲れさまでした。次もよろしく」");
      G.note(`+${q.reward}G・名声+${q.fame}`);
      G.addFame(q.fame);
      if (S.counters.quests % 5 === 0) G.chron(`ギルドの依頼を${S.counters.quests}件こなす`, "event");
    }
  }

  // ---------------------------------------------------------------- 教会・訓練・裏路地・王城
  function church(arg) {
    const S = G.S;
    if (arg === "heal") { S.gold -= 15; G.log("you", "治療を受ける"); S.hp = S.maxHp; S.conds = S.conds.filter((c) => c !== "毒" && c !== "呪い"); G.say("司祭が聖句を唱え、傷がふさがっていく。料金は前払いだった。"); }
    else if (arg === "pray") {
      S.flags.prayed = S.day; G.log("you", "祈る");
      const r = G.check("魔力", 0, "祈り");
      if (r.crit) { G.say("像の目が、一瞬だけこちらを向いた。"); G.apply({ grow: { 魔力: 1, 魅力: 1 }, heal: "full" }); }
      else if (r.ok) { S.mp = S.maxMp; G.say("静かな力が満ちてくる。"); G.note("MP が全快した。"); }
      else G.say("祈りは天井に吸い込まれて消えた。");
    } else if (arg === "donate") { S.gold -= 50; G.log("you", "50G 寄付する"); G.say("司祭は満面の笑みで金貨を数えた。"); G.addFame(3); }
  }
  function train(stat) {
    const S = G.S;
    S.gold -= 30;
    G.log("you", `${stat}を鍛える`);
    G.passDays(2);
    const cur = S.stats[stat];
    let g = 0;
    if (G.d(100) > cur) g = G.d(3); else if (G.rand() < 0.3) g = 1;
    const [a, b] = G.grow(stat, g);
    G.say(G.pick(["教官にしごかれ、泥と汗にまみれた二日間だった。", "血豆がつぶれるまで繰り返した。", "教官が「筋は悪くない」とだけ言った。"]));
    if (b > a) G.log("grow", `${stat}が伸びた ${a}→${b}`); else G.note("手応えはなかった。");
  }
  function alley(arg) {
    const S = G.S;
    G.pass(1);
    if (arg === "steal") {
      G.log("you", "スリを働く");
      const r = G.check("敏捷", 0, "スリ", G.gearBonus("steal"));
      if (r.ok) { const n = G.d(20) + 5 + (r.crit ? 40 : 0); S.gold += n; G.say("身なりのいい商人の財布が、あなたの懐に移った。"); G.note(`+${n}G`); G.addFame(-1); }
      else if (r.fumble) { G.say("「泥棒だ！」衛兵が駆けつけてきた。"); G.startCombat(["guard"], {}); }
      else G.say("相手が振り向いた。何食わぬ顔でその場を離れた。");
    } else if (arg === "gamble") {
      G.log("you", "裏賭場でイカサマを仕掛ける");
      const r = G.check("敏捷", "難しい", "イカサマ", G.gearBonus("steal"));
      if (r.ok) { S.gold += 90; G.say("すり替えた骰子は完璧だった。胴元の顔が引きつっている。"); G.note("+90G"); }
      else if (r.fumble) { S.gold -= 30; G.say("袖から骰子が落ちた。用心棒が指を鳴らす。"); G.startCombat(["banditboss"], {}); }
      else { S.gold -= 30; G.say("運にも見放された。"); G.note("-30G"); }
    } else if (arg === "info") {
      S.gold -= 20;
      G.log("you", "情報屋から話を買う");
      const hints = [
        ["竜の墓場の最奥、屍竜ネクロザの腹に魔剣ヴォルグリムが刺さっている。断界山脈の先だ", "魔剣ヴォルグリムは竜の墓場の最奥、屍竜の腹の中"],
        ["鬼ヶ島の酒呑が聖刀白夜を持っている。ヴァレンツァから八雲へ船で渡れ", "聖刀白夜は鬼ヶ島の酒呑が持っている（ヴァレンツァから船）"],
        ["王になりたきゃ、まず王か皇帝に取り入って騎士になれ。名声150と金500だ", "王への道：騎士（名声150・500G）→領主（名声300・3000G）→王位（名声600）"],
        ["使徒グラウの城は灰の荒野の先。絶界を破る剣がなきゃ、行くだけ無駄だ", "使徒グラウの居城は灰の荒野の先。絶界を破る剣が必要"],
      ];
      const [say, memo] = G.pick(hints);
      G.say(`情報屋は金貨を噛んで確かめてから囁いた。「${say}」`);
      G.memo(memo);
    }
  }
  function castle(arg) {
    const S = G.S;
    const L = G.loc();
    const ruler = S.loc === "garmund" ? "宰相" : "国王ヴァレオン";
    if (arg === "audience") {
      G.log("you", "謁見を願い出る");
      if (S.fame < 150) G.say(`門番に鼻で笑われた。「${G.fameRank(S.fame)}ごときが${ruler}に会えると思うな」`);
      else G.say(`${ruler}はあなたの名を知っていた。「噂は聞いている。望むものがあれば、言うがよい」`);
    } else if (arg === "knight") {
      S.gold -= 500; S.title = "騎士"; G.give("royalwrit");
      G.log("you", "騎士の位を願い出る");
      G.say(`${ruler}の剣が、あなたの肩に触れた。「汝を騎士に叙する」寄進の500Gは、儀式の前に回収されていた。`);
      G.chron(`${L.name}で騎士に叙任される`, "trophy");
    } else if (arg === "lord") {
      S.gold -= 3000; S.title = "領主";
      G.log("you", "領地を賜る");
      G.say("辺境の小さな領地と、税を払わない領民と、崩れかけた館を手に入れた。それでも、あなたは領主だ。");
      G.chron(`${L.name}から領地を賜り、領主となる`, "trophy");
    } else if (arg === "throne") {
      G.log("you", "王位を奪う");
      G.say(`あなたは玉座の前で剣を抜いた。広間がどよめく。${ruler}の前に、近衛騎士団長が進み出た。「痴れ者が。この首、取れるものなら取ってみよ」`);
      G.startCombat(["royalguard"], { win: { text: "近衛騎士団長が倒れると、貴族たちは一斉にあなたの前にひれ伏した。昨日までの主のことなど、誰も覚えていないかのように。", flag: "throne", chron: `${L.name}の玉座を奪い、国王となる`, fame: 100, title: "国王" } });
    }
  }

  // G.apply は title を知らないので、ここで補う
  const baseApply = G.apply;
  G.apply = (o) => {
    if (o && o.title) G.S.title = o.title;
    baseApply(o);
  };
})(globalThis.G = globalThis.G || {});
