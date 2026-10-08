// W11：迷宮の階と部屋。データは src/data/dungeon_w11.js（部屋の種類・出来事）と src/data/dungeon_w11_places.js（迷宮ごとの性格）
// 持ち主「迷宮の中身を厚くする。階ごとに部屋・通路が現れ、分かれ道を選んで、罠・宝・休める所・隠し扉・魔物の巣・下への階段に出会う」
//
// 階（地下1階〜最奥の一つ手前）に着くと、部屋がいくつか（3〜5）ある。部屋の一つは必ず下への階段。
//   「分かれ道」の組：まだ入っていない部屋へ続く道（左の通路・棺の並ぶ回廊…）。入ると、その部屋の出来事が始まる。
//     灯りの術（M14）がともっている・追跡（K1）を覚えている・盗賊は罠の部屋だけ、入る前に部屋の気配が添え書きに出る
//   「壁と床を調べて回る」：一つの階で一度。知力の判定（罠の補正・盗賊・罠読み）。隠し扉があれば、近道（階段が分かる）か隠し部屋
//   潮の満ち引き（tide の迷宮）：昼と夜は潮が満ちて、水の道が通れない。「潮が引くまで待つ」
//   「階段を下りる」（deeper）：階段を見つけていれば、静かに下りられる（着いた階で出会うものが少ない）。
//     見つけていなければ「階段を探さずに奥へ進む」（今までの「奥へ進む」と同じ。何が出るか分からない）。どちらでも詰まない
// 地図は最小限：今いる階・入った部屋の数・階段を見つけたか（G.w11.mapLine。迷宮の組の見出しに出る）。
//
// 部屋の表は D.W11_ROOMS（外から push して足せる。W12 の遺跡の部屋など。書き方は dungeon_w11.js の頭）。
// 出来事の結果に w11: { … } を書くと、ここが受け持つ：
//   hurt: n（罠の傷。迷宮の危険度で重くなる）・spot（罠を見抜いた）・disarm（罠を外して部品を売れる）・
//   open: "plain" | "pick" | "key" | "spell" | "smash"（箱を開ける。ミミックなら戦う。smash は中身が減る）・jam（錠が壊れた）・
//   probe: true | "sure" | "fail"（箱を調べる。ミミックなら見破る。どちらでも箱の前に戻る）・
//   loot: "small" | "chest" | "vault" | "lair" | "sneak" | "mimic" | "bones"（迷宮の危険度と深さで金と品）・extra（品をもう一つ）・
//   rest: "fire" | "dark" | "spring" | "camp"（回復。時が経ち、魔物が寄ってくることも）・short（近道：階段が分かる）・lost（迷って時が経つ）
// セーブに足す項目：S.w11 = { floor, n }（古いセーブには無い。無ければ、その階の部屋をそのとき作る）
// 部屋の並びは、セーブの id・場所・階・日と時刻から決める（画面を描くたびに乱数を使わない。同じセーブなら同じ並び）。部屋の中の判定と戦利品は G.rand
// 名前の頭の zw は、W8（w8_explore.js）と E2（e2_lair.js）より後・L1（zzz_know_l1.js）・K1・M14 より前に読むため。
//   「奥へ進む」を包む順：L1 の罠 → ここ → W8 の脇道の出来事 → E2 の主の巣 → explore.js。DOM に触らない。レーン W（W11）
(function (G) {
  const D = G.data;
  const W = (G.w11 = G.w11 || {});
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const st = (S) => { S = S || G.S; S.w11 = S.w11 || {}; return S.w11; };   // 古いセーブには無い
  const PL = (loc) => (D.W11_DUNGEONS || {})[loc] || {};
  const pickOf = (arr, key) => (Array.isArray(arr) ? arr[hash(key) % arr.length] : arr);
  const knowsSk = (id, S) => !!(G.k1 && G.k1.knows && G.k1.knows(id, S));

  // 技（K1）の選択肢を D.K1_ADD に足す（K1 の出来事の口が読む。K1 はここより後に読む）
  Object.entries(D.W11_K1 || {}).forEach(([id, list]) => { D.K1_ADD = D.K1_ADD || {}; D.K1_ADD[id] = [...(D.K1_ADD[id] || []), ...list]; });
  // 術（M14）の選択肢の MP を、術の表に合わせる（データは術の表より先に読むので、仮の値で書いてある）
  (D.EVENTS || []).filter((e) => /^w11_/.test(e.id)).forEach((e) => e.choices.forEach((c) => {
    const sp = c.m14g && D.SPELLS && D.SPELLS[c.m14g];
    if (!sp) return;
    if (c.ok) c.ok.mp = -sp.mp;
    if (c.ng) c.ng.mp = -sp.mp;
  }));

  const GENERIC_WAYS = ["左の通路", "右の扉", "まっすぐ続く廊下", "下り坂の横穴", "上へ続く梯子", "崩れた壁の穴", "低い天井の抜け道", "錆びた鉄格子の扉"];
  const STAIRS_HINT = "空気が、下へ向かって流れている";
  const STAIRS_SAY = ["下へ続く階段があった。段の縁が、人の足ですり減っている。", "床に四角い穴が開いて、下へ石段が続いている。下から冷たい風が上がってくる。", "行き止まりの床に、下へ降りる梯子が掛かっている。梯子の横木は、まだ腐っていない。"];

  // ---------------------------------------------------------------- 階と部屋
  W.inDungeon = (S) => { S = S || G.S; const L = S && D.LOCS[S.loc]; return !!(L && L.type === "dungeon"); };
  // 部屋のある階か（地下1階〜最奥の一つ手前）
  W.hasRooms = (S) => { S = S || G.S; const L = D.LOCS[S.loc]; return !!(L && L.type === "dungeon" && S.depth > 0 && S.depth < (L.floors || 1)); };
  W.highTide = (S) => { S = S || G.S; return !!(PL(S.loc).tide && W.inDungeon(S) && (S.phase || 0) % 2 === 1); };
  W.floorOf = (S) => {
    S = S || G.S;
    if (!W.hasRooms(S)) return null;
    const w = st(S);
    const key = `${S.loc}:${S.depth}`;
    if (!w.floor || w.floor.key !== key) { w.n = (w.n || 0) + 1; w.floor = W.makeFloor(S, key); }
    return w.floor;
  };
  W.room = (S) => { const f = W.floorOf(S); return f && f.cur >= 0 ? f.rooms[f.cur] || null : null; };
  // 部屋の種類の表（その迷宮・その深さで出るもの）
  W.kinds = (loc, depth) => (D.W11_ROOMS || []).filter((r) => r && r.id !== "stairs" && (!r.where || r.where.includes(loc)) && !(r.minDepth && depth < r.minDepth));
  W.makeFloor = (S, key) => {
    const L = D.LOCS[S.loc];
    const P = PL(S.loc);
    const R = rng(hash(`${S.id || ""}|${key}|${S.day}|${S.phase}|${st(S).n || 0}`));
    const n = 3 + ((L.danger || 1) >= 4 ? 1 : 0) + (R() < 0.5 ? 1 : 0);
    const pool = W.kinds(S.loc, S.depth);
    const used = {};
    const rooms = [];
    for (let i = 0; i < n - 1; i++) {
      const cand = pool.map((r) => [r, Math.max(0, (typeof r.w === "function" ? r.w(L, S, S.depth) : r.w || 0) * ((P.weights || {})[r.id] ?? 1))])
        .filter(([r, w]) => w > 0 && (used[r.id] || 0) < (r.max ?? 2));
      if (!cand.length) break;
      let x = R() * cand.reduce((a, c) => a + c[1], 0);
      let pick = cand[cand.length - 1][0];
      for (const [r, w] of cand) { x -= w; if (x <= 0) { pick = r; break; } }
      used[pick.id] = (used[pick.id] || 0) + 1;
      const ev = Array.isArray(pick.ev) ? pick.ev[Math.floor(R() * pick.ev.length)] : pick.ev;
      const room = { k: pick.id, ev, done: false };
      if (pick.id === "chest") { room.locked = R() < 0.6; room.mimic = !!D.ENEMIES.mimic && R() < (P.mimic ?? 0.2); }
      rooms.push(room);
    }
    rooms.splice(Math.floor(R() * (rooms.length + 1)), 0, { k: "stairs", done: false });
    // 道の呼び名（重ならないように。潮の迷宮では、階段でない部屋の半分ほどが水の道）
    const dry = [...(P.ways || []), ...GENERIC_WAYS], wet = [...(P.wet || [])];
    const take = (list) => list.splice(Math.floor(R() * list.length), 1)[0];
    rooms.forEach((r) => {
      const def = (D.W11_ROOMS || []).find((x) => x.id === r.k);
      if (P.tide && r.k !== "stairs" && wet.length && R() < 0.5) { r.wet = true; r.way = take(wet); return; }
      r.way = (def && Array.isArray(def.way) && def.way.length ? def.way[Math.floor(R() * def.way.length)] : null) || take(dry) || "奥の通路";
    });
    const sr = R();
    return { key, rooms, cur: -1, stairs: false, searched: false, secret: sr < 0.25 ? "short" : sr < 0.5 ? "vault" : null, tick: 0 };
  };
  W.counts = (f) => ({ seen: f.rooms.filter((r) => r.done).length, all: f.rooms.length });
  W.mapLine = (S, L) => {
    S = S || G.S;
    L = L || D.LOCS[S.loc];
    if (!S.depth) return "入口";
    const head = `地下${S.depth}階／全${L.floors}階`;
    const f = W.floorOf(S);
    if (!f) return `${head}・最奥`;
    const c = W.counts(f);
    return `${head}：部屋 ${c.seen}/${c.all}・階段 ${f.stairs ? "発見" : "まだ"}`;
  };
  // 入る前に部屋の気配が分かるか（灯りの術・追跡・盗賊は罠だけ）
  const senses = (S, r) => !!((G.m14 && G.m14.lit && G.m14.lit(S)) || knowsSk("k1_track", S) || (S.cls === "thief" && /^trap/.test(r.k)));
  const hintOf = (r) => (r.k === "stairs" ? STAIRS_HINT : r.k === "vault" ? "隠し扉の向こう" : ((D.W11_ROOMS || []).find((x) => x.id === r.k) || {}).hint || "");

  // ---------------------------------------------------------------- 選択肢
  const actions0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = actions0();
    const S = G.S;
    if (!S || S.mode !== "explore" || S.travel || !W.hasRooms(S)) return groups;
    const f = W.floorOf(S);
    const high = W.highTide(S);
    const list = f.rooms.map((r, i) => {
      if (r.done) return null;
      const flooded = r.wet && high;
      const sub = flooded ? "潮が満ちていて通れない" : senses(S, r) ? hintOf(r) : "まだ見ていない";
      return { id: `w11go:${i}`, label: `${r.way}へ`, sub, disabled: flooded, kw: ["道", "通路", "扉", "部屋", "分かれ", r.way] };
    }).filter(Boolean);
    if (!f.searched) list.push({ id: "w11search", label: "壁と床を調べて回る", sub: `知力 ${G.chance("知力", "普通", searchBonus(S))}%・隠し扉を探す`, kw: ["調べ", "隠し", "探"] });
    if (high && f.rooms.some((r) => r.wet && !r.done)) list.push({ id: "w11wait", label: "潮が引くまで待つ", sub: "時が経つ", kw: ["待", "潮"] });
    if (list.length) groups.splice(Math.min(1, groups.length), 0, { title: "分かれ道", list });
    return groups;
  };
  const searchBonus = (S) => (G.gearBonus ? G.gearBonus("trap") : 0) + (S.cls === "thief" ? 10 : 0) + (knowsSk("k1_trapsense", S) ? 10 : 0);

  // ---------------------------------------------------------------- 手番
  // 部屋に入るのは、二部屋で時刻が一つ進む
  const tick = (f) => { f.tick = (f.tick || 0) + 1; if (f.tick % 2 === 0) G.pass(1); };
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "w11go") return enter(S, Number(arg));
    if (head === "w11search") return search(S);
    if (head === "w11wait") { G.log("you", "潮が引くまで待つ"); G.pass(1); G.say("岩棚に腰を下ろして、水の音を聞いていた。足もとの水が、少しずつ遠のいていく。"); return; }
    if (head === "deeper" && W.hasRooms(S)) {
      const f = W.floorOf(S);
      const loc = S.loc, d0 = S.depth;
      W.calm = !!f.stairs;
      let r;
      try { r = act0(head, arg, a); } finally { W.calm = false; }
      if (G.S === S && !S.over && S.loc === loc && S.depth > d0) arriveSay(S);
      return r;
    }
    if (head === "deeper" && W.inDungeon(S) && !S.depth) {
      const r = act0(head, arg, a);
      if (G.S === S && !S.over && S.depth > 0) arriveSay(S);
      return r;
    }
    const r = act0(head, arg, a);
    if (head === "leave" && G.S === S) st(S).floor = null;
    return r;
  };
  // 着いた階の一行（戦いや出来事が始まっていないときだけ）
  function arriveSay(S) {
    if (S.mode !== "explore" || !W.hasRooms(S)) return;
    const f = W.floorOf(S);
    const P = PL(S.loc);
    const line = pickOf(P.intro, `${S.loc}:${S.depth}:${S.day}`);
    const n = f.rooms.length;
    G.say(`${line ? line + "\n" : ""}道は${"一二三四五六七八"[n - 1] || "いくつ"}つに分かれている。`);
  }

  function enter(S, i) {
    if (!W.hasRooms(S) || S.mode !== "explore") return;
    const f = W.floorOf(S);
    const r = f.rooms[i];
    if (!r || r.done || (r.wet && W.highTide(S))) return;
    r.done = true;
    f.cur = i;
    G.log("you", `${r.way}へ進む`);
    tick(f);
    const P = PL(S.loc);
    if (r.k === "stairs") {
      f.stairs = true;
      G.say((P.say && P.say.stairs) || pickOf(STAIRS_SAY, `${S.loc}:${S.depth}:${i}`));
      G.note(`地下${S.depth + 1}階への階段を見つけた。`);
      return;
    }
    const pre = P.say && P.say[r.k];
    if (pre) G.say(pre);
    if (!G.startEvent(r.ev)) G.say("がらんとした部屋だった。");
  }

  function search(S) {
    if (!W.hasRooms(S) || S.mode !== "explore") return;
    const f = W.floorOf(S);
    if (f.searched) return;
    f.searched = true;
    G.log("you", "壁と床を調べて回る");
    G.pass(1);
    const rr = G.check("知力", "普通", "隠し扉を探す", searchBonus(S));
    if (!rr.ok) { G.say("壁を叩き、床の継ぎ目に指を這わせて回った。何も見つからなかった。見落としたのかもしれない。"); return; }
    if (f.secret === "short") {
      f.stairs = true;
      G.say("壁の一角だけ、叩くと音が軽い。押すと、石の扉が奥へ回った。扉の向こうに、下へ降りる細い段があった。");
      G.note(`隠し扉を見つけた。地下${S.depth + 1}階への近道だ。`);
    } else if (f.secret === "vault") {
      f.rooms.push({ k: "vault", ev: "w11_vault", way: "隠し扉の奥", done: false });
      G.say("床の継ぎ目の一つが、ほかより広い。指を差しこんで持ち上げると、床板ごと隠し扉が開いた。奥に、小部屋がある。");
      G.note("隠し扉を見つけた。");
    } else {
      G.say("隅々まで調べた。隠し扉は無い。少なくとも、この階には。");
    }
    f.secret = null;
  }

  // ---------------------------------------------------------------- 部屋の中のこと（出来事の結果の w11）
  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    const S = G.S;
    if (!o || !o.w11 || !S || S.over) return;
    const w = o.w11;
    const L = D.LOCS[S.loc] || {};
    const dg = Math.max(1, L.danger || 1);
    const f = W.floorOf(S);
    const r = W.room(S);
    if (w.hurt) { const n = Math.max(1, Math.round(w.hurt * (1 + 0.25 * (dg - 1)))); G.note(`HP -${n}`); G.hurt(n, "迷宮の罠にかかって力尽きた"); if (S.over) return; }
    if (w.disarm) { const g = G.d(5 * dg) + 5; S.gold += g; G.note(`罠の部品 +${g}G`); }
    if (w.short && f) { f.stairs = true; G.note(`地下${S.depth + 1}階への近道を見つけた。`); }
    if (w.lost) { G.pass(1); G.note("時が経った。"); }
    if (w.jam && r) r.jammed = true;
    if (w.rest) rest(S, w.rest, L);
    if (S.over || S.mode === "combat") return;
    if (w.probe) {
      if (r) r.probed = true;
      if (r && r.mimic && w.probe !== "fail") { r.mimicKnown = true; G.startEvent("w11_mimic"); return; }
      if (w.probe !== "fail") G.say(r && r.locked && !r.opened ? "ただの箱だ。錠がかかっている。" : "ただの箱だ。罠も無い。");
      reopen(S, (r && r.ev) || "w11_chest");
      return;
    }
    if (w.open) {
      if (r) r.opened = true;
      if (r && r.mimic) {
        G.say("蓋が開いた瞬間、箱の縁に歯が並んだ。箱が、箱であることをやめた。");
        G.startCombat(["mimic"], { win: { text: "動かなくなった箱の腹の中に、先に来た誰かの持ち物が溜まっていた。", w11: { loot: "mimic" } } });
        return;
      }
      loot(S, w.open === "smash" ? "smash" : "chest", dg, false);
    }
    if (w.loot) loot(S, w.loot, dg, !!w.extra);
  };
  // 同じ出来事の選択肢に戻る（見出しと地の文は繰り返さない）
  function reopen(S, id) { S.mode = "event"; S.event = id; }

  const ITEMS = ["potion", "manawater", "gem", "herb"].filter((id) => D.ITEMS[id]);
  const LOOT = {
    small: { g: 8, add: 5, item: 0.15 },
    chest: { g: 14, add: 10, item: 0.35, key: 0.05 },
    smash: { g: 8, add: 5, item: 0.1 },
    vault: { g: 20, add: 20, item: 1 },
    lair: { g: 10, add: 10, item: 0.25, key: 0.3 },
    sneak: { g: 8, add: 8, item: 0.2, key: 0.25 },
    mimic: { g: 12, add: 15, item: 0.4 },
    bones: { g: 16, add: 15, item: 0.5, gem: true },
  };
  function loot(S, k, dg, extra) {
    const t = LOOT[k] || LOOT.small;
    const g = G.d(t.g * dg) + t.add + (S.depth || 0) * 3;
    S.gold += g;
    G.note(`${g}G を手に入れた。`);
    const give = (id) => { if (id && D.ITEMS[id] && G.give(id)) G.note(`${G.itemInfo ? G.itemInfo(id).name : D.ITEMS[id].name}を手に入れた。`); };
    if (G.rand() < t.item) give(t.gem && D.ITEMS.gem ? "gem" : G.pick(ITEMS));
    if (extra) give(G.pick(ITEMS));
    if (t.key && G.rand() < t.key) give("w11_oldkey");
  }

  const REST = { fire: { hp: 0.4, mp: 0.4, time: 1, foe: 0.15 }, dark: { hp: 0.15, mp: 0.15, time: 0, foe: 0.08 }, spring: { hp: 0.3, mp: 1, time: 1, foe: 0.12 }, camp: { hp: 0.6, mp: 1, time: 1, foe: 0.04 } };
  function rest(S, k, L) {
    const t = REST[k] || REST.dark;
    if (t.time) G.pass(t.time);
    const hp = Math.ceil(S.maxHp * t.hp), mp = Math.ceil(S.maxMp * t.mp);
    G.heal(hp);
    S.mp = Math.min(S.maxMp, S.mp + mp);
    G.note(t.mp >= 1 ? `HP +${hp}・MP が全快した。` : `HP +${hp}・MP +${mp}`);
    if (G.rand() < t.foe + 0.02 * ((L.danger || 1) - 1)) {
      const pool = (L.pool || ["goblin"]).filter((id) => D.ENEMIES[id] && !D.ENEMIES[id].boss);
      if (!pool.length) return;
      G.say("物音で目が開いた。暗がりの向こうから、何かがこちらへ来る。");
      G.startCombat([G.pick(pool)], {});
    }
  }
})(globalThis.G = globalThis.G || {});
