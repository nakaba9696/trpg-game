// 冒険の画面：背景、記録、行動のボタン、キャラクターシート、地図・年表・トロフィー・手引き。
// エンジン（G.S）を読んで描くだけ。行動は G.act を呼ぶ。レーン U（UI）が管理
(function (G) {
  const D = G.data;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const ui = (G.ui = {});

  const FAC_SCENE = { inn: "inn", tavern: "tavern", shop: "shop", guild: "guild", church: "church", train: "train", alley: "alley", castle: "throne", academy: "academy" };
  let lastPaint = "";
  let busy = false;

  // ---------------------------------------------------------------- 人物の絵（art_people.js の G.drawPortrait を通す）
  // face() で canvas を作り、画面に置いてから drawFaces() で描く（大きさを測ってから描くため）
  // 主人公の絵は出さない（A10。持ち主の決定）。生成画像の無い人の canvas は noart の印が付いて隠れる（v4_assets.js）
  let faceQueue = [];
  function face(cls, who, cw, ch) {
    const cv = h("canvas", "face " + cls);
    cv.width = cw * 2; cv.height = ch * 2;
    cv.setAttribute("aria-hidden", "true");
    if (who) faceQueue.push([cv, who]);
    return cv;
  }
  function drawFaces() {
    const q = faceQueue;
    faceQueue = [];
    if (G.drawPortrait) q.forEach(([cv, who]) => G.drawPortrait(cv, who));
  }
  const heroWho = (S) => G.heroWho(S.profile, S.cls);
  ui.heroWho = heroWho;

  // ---------------------------------------------------------------- 背景
  function sceneKey() {
    const S = G.S;
    const L = G.loc();
    if (S.mode === "fac" && S.fac) return FAC_SCENE[S.fac];
    if (L.type === "dungeon" && S.depth > 0) return G.dungeonScene ? G.dungeonScene(L) : "dungeon";
    return L.scene;
  }
  function paint(force) {
    const S = G.S;
    const foes = S.combat ? G.alive().map((f) => { const e = D.ENEMIES[f.id]; return { id: f.id, shape: e.shape, eye: e.eye, boss: !!e.boss }; }) : [];
    const key = sceneKey();
    const sig = [key, S.phase, S.loc, S.depth, S.day, S.weather, JSON.stringify(foes), $("#scene").clientWidth].join("|");
    if (!force && sig === lastPaint) return;
    lastPaint = sig;
    G.paintScene($("#scene"), { key, phase: S.phase, seed: S.loc + ":" + S.depth + ":" + key, foes, redMoon: S.phase === 3 && !!S.flags.god });
  }
  // 出来事に出てくる人物（出来事のデータの who）と、施設の人（王城の主。G.facWho）。背景の右上に重ねる
  let lastWho = "";
  function paintWho() {
    const S = G.S;
    const e = S.mode === "event" && S.event && G.eventWho ? D.EVENTS.find((x) => x.id === S.event) : null;
    const who = e ? G.eventWho(e) : S.mode === "fac" && !S.combat && G.facWho ? G.facWho(S) : null;
    let box = $("#who");
    // 絵の無い人（生成画像が無い・合う型が無い）は額ごと出さない（A10）
    if (!who || (G.portraitArt && !G.portraitArt(who))) { if (box) box.hidden = true; lastWho = ""; return; }
    if (!box) {
      box = h("div"); box.id = "who";
      box.append(face("whoFace", null, 96, 120), h("span", "whoName"));
      $(".scene").append(box);
    }
    box.hidden = false;
    const kind = G.PEOPLE && G.PEOPLE[who.kind];
    const tag = G.whoTag && G.whoTag(who, S); // C3：名前＋役職の札
    if (tag && G.c3Plate) G.c3Plate(box.querySelector(".whoName"), tag);
    else box.querySelector(".whoName").textContent = who.name || (kind ? kind.name : "");
    const sig = JSON.stringify(who) + "|" + box.clientWidth;
    if (sig === lastWho) return;
    lastWho = sig;
    if (G.drawPortrait) G.drawPortrait(box.querySelector("canvas"), who);
  }
  // 背景と人の絵を描き直す（魔物の画像が読み終わったときなど。v6_monsters.js）
  ui.repaint = () => { if (G.S && !$("#play").hidden) { paint(true); paintWho(); } };
  window.addEventListener("resize", ui.repaint);

  // ---------------------------------------------------------------- 記録
  // 1件の記録を要素にする。新しい種類の記録（戦闘の演出など）は logEntryEl に足す
  function checkEl(e) {
    const box = h("div", "check");
    box.append(h("span", "what", `${e.reason}【${e.stat}${e.diff ? "・" + e.diff : ""}】`), h("span", "rate num", `成功率 ${e.chance}%`));
    const dice = h("span", "num");
    const r = e.roll % 100;
    dice.append(h("span", "die", String(Math.floor(r / 10))), h("span", "die", String(r % 10)));
    box.append(dice, h("span", "num", `→ ${e.roll}`));
    box.append(h("span", "verdict " + (e.crit ? "crit" : e.ok ? "ok" : "ng"), e.label));
    if (e.growth) box.append(h("span", "grow num", `${e.stat} 成長 ${e.growth[0]}→${e.growth[1]}`));
    if (e.rr) box.append(h("span", "fine", `（振り直し。前の出目 ${e.rr.roll}）`));
    // M7：失敗した判定の横に「振り直す（残り n）」
    if (G.rerollTarget && G.rerollTarget(e) && !busy) {
      const b = h("button", "btn small", `振り直す（残り ${G.rerolls()}）`);
      b.type = "button";
      b.onclick = () => { if (!busy) { G.act("rr:go"); after(); } };
      box.append(b);
    } else if (G.rerollBlockedTarget && G.rerollBlockedTarget(e) && !busy) {
      // 戦闘中は振り直せない：ボタンを薄くして理由を添える
      const b = h("button", "btn small", `振り直す（残り ${G.rerolls()}）`);
      b.type = "button";
      b.disabled = true;
      b.title = G.REROLL_NO_COMBAT;
      box.append(b, h("span", "fine", G.REROLL_NO_COMBAT));
    }
    return box;
  }
  const LOG_CLS = { nar: "l-nar", you: "l-you", sys: "l-sys", grow: "l-grow", trophy: "l-trophy", title: "l-title", gmtag: "l-gmtag", quest: "l-quest" };
  function logEntryEl(e) {
    if (e.k === "dice") return checkEl(e);
    return h("p", (LOG_CLS[e.k] || "l-sys") + (e.fx === "boss" ? " l-boss" : "") + (e.tell ? " l-tell" + (e.rage ? " l-rage" : e.brk ? " l-brk" : "") : ""), e.k === "you" ? "▶ " + e.text : e.text);
  }
  const LOG_KEEP = 90;
  let logLast = null; // 前回描いたときの最後の記録（記録は 240 件で古い方から消えるので、数ではなく中身で覚える）
  let logFresh = []; // 今回増えた記録（戦闘の演出 fx.js に渡す）
  // 記録の要素は使い回す（T）：手番ごとに 90 行を作り直さず、増えた行だけ足し、消えた行だけ外す。中身が変わった行（振り直しのボタンなど）は作り直す。
  // 描いたあとに行へ書き足すファイル（用語の強調 U8・数の色 Q7・品名 I2）は、書き足し済みの行には触らない。書き足しの決まりが変わったとき
  // （知った用語・持ち物が変わった）は、ui.logInvalidate() で次の描き直しを全部の作り直しにする（今までと同じ見た目になる）
  let logEls = new WeakMap(); // 記録 → { el, sig }
  let logReset = true;
  ui.logInvalidate = () => { logReset = true; };
  const entrySig = (e) => {
    if (e.k !== "dice") return e.k + "|" + (e.fx || "") + "|" + e.text;
    const rr = G.rerollTarget && G.rerollTarget(e) && !busy;
    return JSON.stringify(e) + "|" + (rr ? G.rerolls() : "-");
  };
  function renderLog() {
    const S = G.S;
    const log = $("#log");
    const shown = S.log.slice(-LOG_KEEP);
    const at = logLast ? S.log.lastIndexOf(logLast) : -1; // 見つからなければ初回か、別の冒険
    const fresh = at < 0 ? 0 : Math.min(shown.length, S.log.length - 1 - at);
    logLast = S.log[S.log.length - 1] || null;
    logFresh = fresh ? shown.slice(-fresh) : [];
    if (logReset) { logReset = false; logEls = new WeakMap(); log.textContent = ""; }
    const els = shown.map((e, i) => {
      const sig = entrySig(e);
      let c = logEls.get(e);
      if (!c || c.sig !== sig) { c = { el: logEntryEl(e), sig }; logEls.set(e, c); }
      c.el.classList.toggle("new", !!fresh && i >= shown.length - fresh);
      return c.el;
    });
    // 並びを合わせる（たいていは、頭の数行を外して末尾に足すだけ）
    const keep = new Set(els);
    Array.from(log.children).forEach((k) => { if (!keep.has(k)) k.remove(); });
    let cur = log.firstChild;
    els.forEach((el) => { if (cur === el) cur = cur.nextSibling; else log.insertBefore(el, cur); });
    // 新しく増えた記録の頭から読めるようにする（増えていなければ末尾）。位置を測るのは次のコマの頭で一度だけ
    // （描き直しの途中で測ると、そのたびに画面全体の配置の計算が走って重い。T）
    logScroll = { first: fresh ? log.children[shown.length - fresh] : null, fresh: !!fresh };
    if (!logScrollAsked) { logScrollAsked = true; requestAnimationFrame(scrollLog); }
  }
  let logScroll = null, logScrollAsked = false;
  function scrollLog() {
    logScrollAsked = false;
    const o = logScroll;
    logScroll = null;
    const log = $("#log");
    if (!o || !log) return;
    const first = o.first && o.first.isConnected ? o.first : null;
    log.scrollTop = first ? Math.max(0, first.offsetTop - log.offsetTop - 8) : log.scrollHeight;
    if (o.fresh && narrow()) {
      // スマホでは、画面が記録より下にあるときだけ記録まで戻す
      const top = log.getBoundingClientRect().top;
      if (top < mbarHeight()) log.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }
  const narrow = () => window.matchMedia("(max-width: 880px)").matches;
  const mbarHeight = () => { const m = $("#mbar"); return m ? m.getBoundingClientRect().height : 0; };
  // 記録の開閉（スマホで記録を画面いっぱいに広げる）
  ui.setLogExpanded = (on) => {
    document.body.classList.toggle("log-open", on);
    const b = $("#logToggle");
    b.setAttribute("aria-expanded", on);
    b.textContent = on ? "たたむ" : "広げる";
  };
  $("#logToggle").onclick = () => ui.setLogExpanded(!document.body.classList.contains("log-open"));

  // ---------------------------------------------------------------- 行動
  // 行動の欄 #panel は「終わりの札」「敵の札」「行動ボタン」の順に積む
  function renderEnd(panel) {
    const S = G.S;
    const f = h("div", "fin");
    f.append(h("b", "", S.over === "dead" ? `── ${S.profile.name}、ここに眠る ──` : `── ${S.profile.name}の物語、ここに終わる ──`));
    const row = h("div", "start");
    const b1 = h("button", "btn", S.story ? "人生の物語と年表" : "年表を見る"); b1.type = "button"; b1.onclick = () => ui.openChronicle(S, true);
    const b2 = h("button", "btn primary", "新しい冒険を始める"); b2.type = "button"; b2.onclick = () => G.main.toSetup();
    row.append(b1, b2); f.append(row); panel.append(f);
  }
  // 戦闘中の敵の札（B1 の演出はここに足す）
  function foeEl(f) {
    const c = h("div", "foe" + (f.hp > 0 ? "" : " down"));
    c.dataset.foe = f.name;
    c.append(h("b", "", f.name));
    const g = h("span", "g"); const i = h("i"); i.style.width = (f.hp / f.max) * 100 + "%"; g.append(i); c.append(g);
    c.append(h("span", "num fine", `HP ${f.hp}/${f.max}`));
    return c;
  }
  function renderFoes(panel) {
    const foes = h("div", "foes");
    const aim = G.target && G.target();
    // U6：生きている敵が二体以上なら、札を押すと狙いが替わる
    const pick = G.setAim && G.alive().length > 1;
    G.S.combat.foes.forEach((f, i) => {
      const el = foeEl(f);
      if (f === aim) { el.classList.add("aim"); el.prepend(h("span", "aimTag", "狙い")); }
      if (pick && f.hp > 0) {
        el.classList.add("pick");
        el.tabIndex = 0;
        el.setAttribute("role", "button");
        el.setAttribute("aria-pressed", String(f === aim));
        el.setAttribute("aria-label", f === aim ? `${f.name}（狙っている）` : `${f.name}を狙う`);
        const go = () => { if (busy || f === aim) return; if (G.setAim(i)) { G.main.save(); ui.render(); const c = $(`#panel .foe[data-foe="${CSS.escape(f.name)}"]`); if (c) c.focus(); } };
        el.onclick = go;
        el.onkeydown = (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(); } };
      }
      foes.append(el);
    });
    panel.append(foes);
    if (pick) panel.append(h("p", "fine aimHint", "敵の札を押すと、狙う相手を替えられる（手番は進まない）"));
  }
  // 行動ボタン1つ
  function actionButton(a) {
    const b = h("button", "act");
    b.type = "button";
    b.dataset.act = a.id || "";   // W7：旅の行き先の小さな地図が、行き先の選択肢を見つけるため
    b.disabled = !!a.disabled || busy;
    if (a.locked) b.classList.add("locked");   // C10：まだ選べない、状態で現れる選択肢（うっすら見せる）
    b.append(h("b", "", a.label));
    if (a.sub) b.append(h("span", "", a.sub));
    // U4：依頼への道の印・押せない理由
    const mark = actMarks[a.id] || (/^(travel|sail):/.test(a.id || "") ? travelMarks[a.id.split(":")[1]] : ""); // U17：依頼・噂の続きに関係ある選択肢すべて
    if (mark) { b.classList.add("marked"); b.append(h("em", "mark", "◆ " + mark)); }
    const why = a.disabled && !a.locked && G.lockReason ? G.lockReason(a, G.S) : "";
    if (why) { b.append(h("em", "why", why)); b.title = why; }
    b.onclick = () => { if (!busy) { G.act(a.id); after(); } };
    return b;
  }
  let travelMarks = {}, actMarks = {};
  function renderActions(panel) {
    travelMarks = G.travelMarks ? G.travelMarks(G.S) : {};
    actMarks = G.actMarks ? G.actMarks(G.S) : {};
    G.actions().forEach((grp) => {
      if (!grp.list.length) return;
      const box = h("div", "agroup");
      if (grp.title) box.append(h("h3", "", grp.title));
      const list = h("div", "alist");
      grp.list.forEach((a) => list.append(actionButton(a)));
      box.append(list);
      panel.append(box);
    });
  }
  // U4：HP が危ないときの帯と、その場面ではじめてのときだけ出す遊び方の一行
  let shownTip = null;
  function renderGuide(panel) {
    const S = G.S;
    if (G.hpDanger && G.hpDanger(S)) panel.append(h("div", "danger", `HP が残り ${S.hp}。${S.combat ? "身を守る・逃げる・道具も手だ。" : "休むか、傷を手当てしたい。"}`));
    const tip = G.playTip && G.P ? G.playTip(S, G.P) : null;
    shownTip = tip && tip.key;
    if (!tip) return;
    const box = h("div", "tip");
    box.append(h("span", "", tip.text));
    const x = h("button", "btn small", "わかった"); x.type = "button";
    x.onclick = () => { seeTip(); box.remove(); };
    box.append(x);
    panel.append(box);
  }
  function seeTip() {
    if (!shownTip || !G.P) return;
    (G.P.tips = G.P.tips || {})[shownTip] = 1;
    shownTip = null;
    G.main.saveProfile();
  }
  function renderPanel() {
    const S = G.S;
    const panel = $("#panel");
    panel.textContent = "";
    if (S.over) { renderEnd(panel); return; }
    renderGuide(panel);
    if (S.combat) renderFoes(panel);
    renderActions(panel);
  }

  // ---------------------------------------------------------------- キャラクターシート
  // シートは小さな部品の積み重ね。新しい欄（装飾品など）は該当する部品に足すか、部品を1つ足して renderSheet に並べる
  const sheetFold = { stats: true, quests: true, inv: true, memos: true }; // 開いている欄
  function sheetSection(key, title, body) {
    const d = h("details", "ssec");
    d.open = sheetFold[key] !== false;
    d.addEventListener("toggle", () => { sheetFold[key] = d.open; });
    d.append(h("summary", "lab", title), body);
    return d;
  }
  function sheetHead() {
    const S = G.S;
    const head = h("div", "shead");
    const hd = h("div");
    // 主人公の絵は出さない（A10）。人物の詳しい所は名前から開く
    const nm = h("span", "sname a10who", S.profile.name);
    nm.title = "人物を見る";
    nm.tabIndex = 0;
    nm.setAttribute("role", "button");
    nm.onclick = () => ui.openProfile();
    nm.onkeydown = (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ui.openProfile(); } };
    hd.append(nm, h("span", "sclass", `${S.clsName}${S.title ? "・" + S.title : ""}`)); // 名声・手配は「名声と評判」の欄に（Q7）
    const close = h("button", "btn closeSheet", "閉じる"); close.type = "button"; close.onclick = () => ui.setSheetOpen(false);
    head.append(hd, close);
    return head;
  }
  function sheetPools() {
    const S = G.S;
    const pools = h("div", "pools num");
    [["HP", S.hp, S.maxHp, "hp"], ["MP", S.mp, S.maxMp, "mp"]].forEach(([n, v, m, c]) => {
      const p = h("div", "pool"); const g = h("span", "g"); const i = h("i", c); i.style.width = (m ? (v / m) * 100 : 0) + "%"; g.append(i);
      p.append(h("span", "", n), g, h("span", "n", `${v} / ${m}`)); pools.append(p);
    });
    return pools;
  }
  // 名声・位・国ごとの評判と悪名（Q7。中身は engine/q7_repute.js の G.q7.repute）。段階の言葉を主に、棒（次の段階までの進み）と小さな数を添える
  // 悪名は知られた分だけ（隠れた罪は出さない）。今いる国が先頭
  function sheetRepute() {
    const R = G.q7 && G.q7.repute ? G.q7.repute(G.S) : null;
    if (!R) return null;
    const box = h("div", "q7rep");
    const meter = (pct, cls) => { const g = h("span", "q7bar " + (cls || "")); const i = h("i"); i.style.width = Math.round(pct * 100) + "%"; g.append(i); return g; };
    const row = (label, word, pct, small, cls) => {
      const r = h("div", "q7row " + (cls || ""));
      r.append(h("span", "q7k", label), h("b", "q7w", word), pct == null ? h("span") : meter(pct, cls), h("span", "q7n fine num", small || ""));
      return r;
    };
    const f = R.fame;
    box.append(row("名声", f.rank, f.pct, f.next ? `${f.n}・${f.next}まで ${f.toNext}` : String(f.n), "fame"));
    if (R.title) box.append(row("位", R.title.name + (R.title.at ? `（${R.title.at}）` : ""), null, "", "title"));
    R.nations.forEach((n) => {
      const sec = h("div", "q7nation" + (n.here ? " here" : "") + (n.wanted ? " wanted" : ""));
      sec.append(h("div", "q7nname", n.name + (n.here ? "（いまいる国）" : "")));
      sec.append(row("評判", n.repLabel, n.repPct, String(n.rep), "rep"));
      sec.append(row("悪名", n.wanted ? `手配中・懸賞金 ${n.bounty}G` : n.infLabel, n.infPct, n.inf ? String(n.inf) : "", "inf lv" + n.infLv));
      box.append(sec);
    });
    return sheetSection("repute", "名声と評判", box);
  }
  function sheetStats(ups) {
    const S = G.S;
    const list = h("div", "statlist num");
    D.STATS.forEach((k) => {
      const row = h("div", "stat" + (ups && ups[k] ? " up" : ""));
      const bar = h("span", "bar"); const i = h("i"); i.style.width = G.s5Bar(S.stats[k]) + "%"; bar.append(i);   // 99 で満点（S5）
      // S7：職業の向き不向き（伸びやすい／ふつう／伸びにくい）を名前の横に印で
      const apt = G.s5AptKind ? G.s5AptKind(k) : "ふつう";
      const nm = h("span", "nm", k);
      if (apt !== "ふつう") nm.append(h("span", "apt " + (apt === "伸びやすい" ? "aptUp" : "aptDown"), apt === "伸びやすい" ? "▲" : "▽"));
      row.append(nm, h("span", "v", String(G.pt(S.stats[k]))), bar, h("span", "cap", `${G.s5Plain(S.stats[k])}%`));
      const fr = G.s5Fresh ? G.s5Fresh(k) : 1;   // S6：使い方の偏り
      row.title = `${D.STAT_HINT[k] || k}。職業柄、${apt}。普通の判定 ${G.s5Plain(S.stats[k])}％（相手が強い・難しいほど下がる）・次の点まで ${G.s5Progress(k)}％${fr < 0.8 ? "。使い込んで、伸びが鈍っている" : fr > 1.08 ? "。しばらく使っていない。使えば少し伸びやすい" : ""}`;
      list.append(row);
    });
    return sheetSection("stats", "能力値", list);
  }
  // 「能力」のタブの表：目的と、体の状態（日付・場所は場面の絵の下、所持金は帯、仲間は「仲間」のタブにあるので出さない。Q7）
  function sheetSelfRows() {
    const S = G.S;
    return [["目的", S.goal.text + (G.goalDone(S) ? "（達成）" : "")],
      ...(G.r1Rows ? G.r1Rows(S) : []), ["状態", S.conds.length ? S.conds.join("、") : "なし"], ...(G.m5Rows ? G.m5Rows(S) : []), ...(G.m10Rows ? G.m10Rows(S) : []), ["振り直し", `残り ${S.rerolls || 0}${G.REROLL_MAX ? " / " + G.REROLL_MAX : ""}`]];
  }
  // 装備の表（装備の枠を足すときはここの行に足す）
  function sheetGearRows() {
    const S = G.S;
    const w = G.weapon(), ar = G.armor(), rg = G.ring();
    return [["武器", `${w.name}（${w.dmg[0]}D${w.dmg[1]}+${w.dmg[2]}${w.pierce ? "・絶界を破る" : ""}）`], ["防具", ar ? `${ar.name}（防御${ar.def}）` : "なし"],
      ["装飾品", rg ? `${rg.name}（${G.ringEffect(rg)}）` : "なし", rg ? S.ring : null]];
  }
  function sheetKv(rows) {
    const kv = h("dl", "kv");
    // 3つ目があれば、その装備を外すボタンを付ける
    rows.forEach(([k, v, id]) => { const dd = h("dd", "", v); if (id) itemButtons(id, G.itemInfo(id), dd, true); kv.append(h("dt", "", k), dd); });
    return kv;
  }
  // 仲間の顔
  function sheetCompanions() {
    const S = G.S;
    const box = h("div", "comps");
    if (!S.companions.length || !G.companionWho) { box.append(h("p", "fine", "仲間はいない。酒場や町で声をかけてみるとよい。")); return box; }
    S.companions.forEach((c) => {
      const el = h("div", "comp");
      el.append(face("cface", G.companionWho(c), 44, 55));
      const t = h("div");
      t.append(h("b", "", c.name), h("span", "fine", c.desc || ""));
      if (G.r1CompLabel && G.r1CompLabel(c)) t.append(h("span", "fine", G.r1CompLabel(c)));
      if (G.m10Label && G.m10Label(c)) t.append(h("span", "fine", G.m10Label(c)));
      el.append(t);
      box.append(el);
    });
    return box;
  }
  // 持ち物1行のボタン（装備できる種類を増やすときはここ）
  function itemButtons(id, it, li, worn) {
    const S = G.S;
    const free = !busy && !S.over && S.mode !== "combat";
    const mk = (label, fn) => { const b = h("button", "btn small", label); b.type = "button"; b.disabled = !free; b.onclick = () => { fn(); after(); }; li.append(b); };
    if (it.type === "use" && (it.hp || it.mp || it.reroll)) mk("使う", () => G.useItem(id));
    if (it.type === "weapon" || it.type === "armor") mk("装備", () => G.equip(id));
    if (it.type === "ring") { if (worn) mk("外す", () => G.unequip("ring")); else mk("装備", () => G.equip(id)); }
  }
  function sheetInventory() {
    const S = G.S;
    const ul = h("ul", "inv");
    const ids = Object.keys(S.inv);
    if (!ids.length) ul.append(h("li", "none", "なし"));
    ids.forEach((id) => {
      const it = G.itemInfo(id);
      const li = h("li");
      li.append(h("span", "", `${it.name}${S.inv[id] > 1 ? " ×" + S.inv[id] : ""}`));
      itemButtons(id, it, li);
      if (it.desc) li.title = it.desc;
      ul.append(li);
    });
    return sheetSection("inv", `持ち物（${ids.length}）`, ul);
  }
  function sheetButtons() {
    const S = G.S;
    const acts = h("div", "sheet-actions");
    const mk = (label, fn) => { const b = h("button", "btn", label); b.type = "button"; b.onclick = fn; acts.append(b); return b; };
    mk("人物", () => ui.openProfile());
    mk("年表", () => { ui.setSheetOpen(false); ui.openChronicle(S, false); });
    mk("ログをコピー", copyLog);
    mk("タイトルへ", () => G.main.toTitle());
    if (!S.over) {
      let armed = 0;
      // 物語を終えられるのは、節目（M6）に着いてから。基本は死ぬまで
      const can = !G.m6CanEnd || G.m6CanEnd();
      const label = can ? "物語を終える" : "物語を終える（節目はまだ）";
      const rb = mk(label, () => {
        if (Date.now() - armed > 3000) { armed = Date.now(); rb.textContent = "もう一度押すと物語を終える"; setTimeout(() => { rb.textContent = label; }, 3000); return; }
        G.retire(); after();
      });
      rb.disabled = busy || S.mode === "combat" || !can;
    }
    return acts;
  }
  // スマホの上部バー（名前・HP・MP・所持金）
  function renderMobileBar() {
    const S = G.S;
    $("#mName").textContent = `${S.profile.name}（${S.clsName}）`;
    $("#mHp").textContent = `${S.hp}/${S.maxHp}`;
    $("#mMp").textContent = `${S.mp}/${S.maxMp}`;
    $("#mHpBar").style.width = (S.maxHp ? (S.hp / S.maxHp) * 100 : 0) + "%";
    $("#mMpBar").style.width = (S.maxMp ? (S.mp / S.maxMp) * 100 : 0) + "%";
    $("#mGold").textContent = `${S.gold}G`;
    $("#mbar").classList.toggle("danger", !!(G.hpDanger && G.hpDanger(S)));
  }
  // ステータスはタブで分ける（Q7。持ち主の声「ステータスに内容が入りすぎてる」）。はじめは「能力」。前に開いていたタブは、ページを開いているあいだ覚えておく（セーブには残さない）
  // ほかに入口があるもの（受けている依頼・地図・セーブとロード・所持金）はステータスに置かない。覚え書き（S.memos）は図鑑の各項目に振り分けるので、ここには出さない（V12）。どのタブの中身も描いておき、見せないものは hidden にする
  // （ほかのファイルが描いたあとに書き足す：持ち物の .ssec・装備の dl.kv・仲間の .comps .comp。名前と形は変えない）
  const SHEET_TABS = [["self", "能力"], ["gear", "装備と持ち物"], ["party", "仲間"], ["more", "その他"]];
  let sheetTab = "self";
  ui.sheetTab = () => sheetTab;
  function sheetTabs(panes) {
    const S = G.S;
    const bar = h("div", "stabs");
    bar.setAttribute("role", "tablist");
    const btns = SHEET_TABS.map(([key, label]) => {
      const b = h("button", "btn stab", key === "party" && S.companions.length ? `${label}（${S.companions.length}）` : label);
      b.type = "button";
      b.id = "stab-" + key;
      b.dataset.tab = key;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "spane-" + key);
      return b;
    });
    const show = (key, focus) => {
      sheetTab = key;
      btns.forEach((b) => { const on = b.dataset.tab === key; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      Object.entries(panes).forEach(([k, el]) => { el.hidden = k !== key; });
    };
    btns.forEach((b, i) => {
      b.onclick = () => show(b.dataset.tab, false);
      b.onkeydown = (ev) => {
        if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
        ev.preventDefault();
        show(btns[(i + (ev.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length].dataset.tab, true);
      };
      bar.append(b);
    });
    show(panes[sheetTab] ? sheetTab : "self", false);
    return bar;
  }
  function sheetPane(key, parts) {
    const el = h("div", "spane");
    el.id = "spane-" + key;
    el.setAttribute("role", "tabpanel");
    el.setAttribute("aria-labelledby", "stab-" + key);
    parts.forEach((x) => { if (x) el.append(x); });
    return el;
  }
  function renderSheet(ups) {
    const sh = $("#sheet");
    // 閉じているシートの位置は読まない（読むと、描き直しの途中で画面全体の配置の計算が走って重い。T）
    const open = document.body.classList.contains("sheet-open");
    const keep = open ? sh.scrollTop : 0;
    sh.textContent = "";
    const panes = {
      self: sheetPane("self", [sheetPools(), sheetRepute(), sheetStats(ups), sheetKv(sheetSelfRows())]),
      gear: sheetPane("gear", [sheetKv(sheetGearRows()), sheetInventory()]),
      party: sheetPane("party", [sheetCompanions()]),
      more: sheetPane("more", [sheetButtons()]),
    };
    sh.append(sheetHead(), sheetTabs(panes), ...Object.values(panes));
    if (open) sh.scrollTop = keep;
    renderMobileBar();
    // 閉じているシートの顔（仲間）は、開いたときに描く（見えない絵を手番ごとに描き直さない。T）
    if (open) { sheetFaces = []; drawFaces(); } else { sheetFaces = faceQueue; faceQueue = []; }
  }
  let sheetFaces = [];
  // ステータスの開閉（必要なときだけ開く窓。スマホは全面、PC は右に重ねて出す。V1）
  ui.setSheetOpen = (on) => {
    const was = document.body.classList.contains("sheet-open");
    document.body.classList.toggle("sheet-open", on);
    $("#openSheet").setAttribute("aria-expanded", on);
    if (on && sheetFaces.length) { const q = sheetFaces; sheetFaces = []; if (G.drawPortrait) q.forEach(([cv, who]) => { if (cv.isConnected) G.drawPortrait(cv, who); }); }
    if (on && !was) { const c = $("#sheet .closeSheet"); if (c) c.focus({ preventScroll: true }); }
    else if (!on && was && narrow()) $("#openSheet").focus({ preventScroll: true });
  };

  async function copyLog() {
    const S = G.S;
    const lines = S.log.map((e) => e.k === "dice" ? `［判定］${e.reason}【${e.stat}】成功率${e.chance}% 出目${e.roll} ${e.label}${e.growth ? ` ${e.stat}成長${e.growth[0]}→${e.growth[1]}` : ""}` : e.k === "you" ? `▶ ${e.text}` : e.k === "title" ? `\n■ ${e.text}` : e.text);
    const txt = `${S.clsName} ${S.profile.name}の人生 ── 目的：${S.goal.text}\n` + lines.join("\n");
    try { await navigator.clipboard.writeText(txt); ui.toast("ログをコピーしました"); }
    catch { const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.append(ta); ta.select(); try { document.execCommand("copy"); ui.toast("ログをコピーしました"); } catch { ui.toast("コピーできませんでした"); } ta.remove(); }
  }

  // ---------------------------------------------------------------- 全体
  let prevStats = null;
  function after() {
    const S = G.S;
    const ups = {};
    if (prevStats && prevStats.run !== S.id) prevStats = null; // 別の冒険に替わったら比べない
    if (prevStats) D.STATS.forEach((k) => { if (G.pt(S.stats[k]) > G.pt(prevStats[k])) ups[k] = [G.pt(prevStats[k]), G.pt(S.stats[k])]; });
    seeTip();
    const grew = Object.entries(ups).map(([k, [a, b]]) => `${k} ${a}→${b}`);
    if (grew.length) ui.toast("能力値が伸びた", grew.join("・"));
    prevStats = { ...S.stats, run: S.id };
    G.main.save();
    ui.render(ups);
    if (S.over && !S.flags.chronShown) { S.flags.chronShown = true; G.main.save(); setTimeout(() => ui.openChronicle(S, true), 700); }
  }
  ui.after = after;
  ui.render = (ups) => {
    const S = G.S;
    if (!S) return;
    const L = G.loc();
    $("#sceneTitle").textContent = L.name + (S.mode === "fac" && S.fac ? `・${G.FAC_NAMES[S.fac]}` : "") + (L.type === "dungeon" && S.depth ? `・地下${S.depth}階` : "");
    $("#sceneDate").textContent = `${G.date()}・${G.PHASES[S.phase]}`;
    paint();
    paintWho();
    renderLog();
    renderPanel();
    renderSheet(ups);
    markWorld();
    if (G.sound) G.sound.react(S); // 増えた記録と状態の変化から音を選ぶ（ui/sound.js）
    if (G.fx) G.fx.play(logFresh, S); // 戦闘の演出（ui/fx.js）
    if (!prevStats) prevStats = { ...S.stats, run: S.id };
  };

  // ---------------------------------------------------------------- 通知
  let toastT = 0;
  ui.toast = (text, strong) => {
    const t = $("#toast");
    if (t.hidden) t.textContent = ""; // 出ている間に来た通知は下に重ねる（トロフィーと能力値の伸びが同時に来ても消えない）
    const line = h("div");
    if (strong) { line.append(h("span", "", text + " ")); line.append(h("b", "", strong)); } else line.textContent = text;
    t.append(line);
    while (t.children.length > 3) t.firstChild.remove();
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 3800);
  };

  // ---------------------------------------------------------------- 人物・地図
  ui.openProfile = () => {
    const S = G.S;
    const p = S.profile;
    $("#profTitle").textContent = `${p.name}（${S.clsName}）`;
    const dl = $("#profBody");
    dl.textContent = "";
    [["性別", p.sex], ["年齢", `${p.age}歳${p.ageBand && G.data.AGES[p.ageBand] ? `（${G.data.AGES[p.ageBand].name}）` : ""}`], ["生まれ", p.origin && G.data.ORIGINS[p.origin] ? G.data.ORIGINS[p.origin].name : ""], ...(G.r1Rows ? G.r1Rows(S).filter(([k]) => k === "種族" || k === "気性") : []), ["目的", S.goal.text]]
      .forEach(([k, v]) => { if (v) dl.append(h("dt", "", k), h("dd", "", v)); });
    $("#dlgProfile").showModal();
  };

  ui.openMap = () => {
    ui.setSheetOpen(false);
    const dlg = $("#dlgMap");
    dlg.showModal();
    const cv = $("#mapCanvas");
    const rect = cv.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = rect.width * dpr; cv.height = rect.height * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, hh = rect.height, pad = 40;
    const css = getComputedStyle(document.documentElement);
    const col = (n) => css.getPropertyValue(n).trim() || "#888";
    const P = (L) => [pad + (L.x / 100) * (w - pad * 2), pad + (L.y / 100) * (hh - pad * 2)];
    ctx.clearRect(0, 0, w, hh);
    ctx.lineWidth = 1.5;
    Object.entries(D.LOCS).forEach(([id, L]) => {
      Object.keys(L.links || {}).forEach((to) => { if (id < to) { const [a, b] = [P(L), P(D.LOCS[to])]; ctx.strokeStyle = col("--rule"); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } });
      Object.keys(L.sea || {}).forEach((to) => { if (id < to) { const [a, b] = [P(L), P(D.LOCS[to])]; ctx.strokeStyle = col("--accent"); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } });
    });
    ctx.setLineDash([]);
    ctx.font = `12px ${col("--f-ui")}`;
    Object.entries(D.LOCS).forEach(([id, L]) => {
      const [x, y] = P(L);
      const seen = G.S.visited[id];
      ctx.fillStyle = id === G.S.loc ? col("--ng") : seen ? col("--ink") : col("--rule");
      ctx.beginPath();
      if (L.type === "town") ctx.rect(x - 6, y - 6, 12, 12); else ctx.arc(x, y, L.type === "dungeon" ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      if (id === G.S.loc) { ctx.strokeStyle = col("--ng"); ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = seen ? col("--ink") : col("--muted");
      ctx.textAlign = x > w * 0.8 ? "right" : "left";
      ctx.fillText(L.name + (L.type !== "town" ? ` ${"★".repeat(Math.min(6, L.danger))}` : ""), x + (x > w * 0.8 ? -10 : 10), y + 4);
    });
  };

  // ---------------------------------------------------------------- 年表・トロフィー・手引き
  ui.openChronicle = (run, fromEnd) => {
    $("#chronTitle").textContent = `${run.profile ? run.profile.name : run.name}の年表`;
    const ep = $("#epitaph");
    const end = run.over || run.end;
    if (end) {
      ep.hidden = false;
      ep.textContent = "";
      const name = run.profile ? run.profile.name : run.name;
      const cls = run.clsName || run.cls;
      const race = G.r1GraveLine ? G.r1GraveLine(run) : "";
      ep.append(h("b", "", end === "dead" ? `${race ? race + "の" : ""}${cls} ${name}、ここに眠る` : `${race ? race + "の" : ""}${cls} ${name}、物語を終える`));
      ep.append(h("span", "", `目的：${run.goal && run.goal.text ? run.goal.text : run.goal}`));
      ep.append(h("span", "num", `${run.date || G.dateOf(run.day)}　${run.location || ""}　${end === "dead" ? "死因：" + (run.deathCause || run.cause || "") : ""}　${run.turn ?? run.turns} 手番　名声 ${run.fame ?? 0}${run.title ? "　" + run.title : ""}`));
      ep.append(h("span", "num", "最後の能力値：" + D.STATS.map((k) => `${k}${G.s5GraveStats(run)[k]}`).join(" ")));
      // 生きた時代の世の大事（M12）
      const m12 = Array.isArray(run.m12) ? run.m12 : run.m12 && G.m12 ? G.m12.history(run).filter((x) => x.heard || x.joined) : [];
      if (m12.length) ep.append(h("span", "", "生きた時代の大事：" + m12.map((x) => x.name + (x.joined ? "（関わった）" : "")).join("・")));
    } else ep.hidden = true;
    const list = $("#chronList");
    list.textContent = "";
    run.chronicle.forEach((c) => {
      const li = h("li", c.kind);
      li.append(h("span", "d num", c.date), h("span", "line"), h("span", "t", c.text));
      list.append(li);
    });
    $("#chronActions").hidden = !fromEnd;
    $("#dlgChron").showModal();
    drawFaces();
  };

  ui.openTrophies = (tab) => {
    const P = G.P;
    const auto = D.TROPHIES.map((t) => ({ ...t, got: P.trophies[t.key] }));
    const extra = Object.entries(P.trophies).filter(([k]) => !D.TROPHIES.some((t) => t.key === k)).map(([k, v]) => ({ key: k, ...v, got: v }));
    const all = [...auto, ...extra];
    const got = all.filter((t) => t.got).length;
    $("#troSummary").textContent = `獲得 ${got} / ${all.length}`;
    const order = { 金: 0, 銀: 1, 銅: 2 };
    all.sort((a, b) => (!!b.got - !!a.got) || order[a.tier] - order[b.tier]);
    const tl = $("#troList");
    tl.textContent = "";
    all.forEach((t) => {
      const el = h("div", "tro" + (t.got ? "" : " locked"));
      el.append(h("span", "medal " + t.tier, t.tier), h("b", "", t.got ? t.name : "？？？"), h("span", "", t.desc), h("span", "", t.got ? `${t.got.by || ""} ${t.got.date || ""}` : "未獲得"));
      tl.append(el);
    });
    const gl = $("#graveList");
    gl.textContent = "";
    if (!P.graves.length) gl.append(h("p", "fine", "まだ誰も眠っていない。"));
    P.graves.forEach((g) => {
      const b = h("button", "grave");
      b.type = "button";
      b.append(h("b", "", `${g.cls} ${g.name}${g.title ? "（" + g.title + "）" : ""}`), h("span", "", `目的：${g.goal}`), h("span", "num", `${g.date}　${g.end === "dead" ? "死因：" + g.cause : g.epitaph || "物語を終えた"}　${g.turns} 手番`));
      b.onclick = () => { $("#dlgTrophy").close(); ui.openChronicle(g, false); };
      gl.append(b);
    });
    setTab(tab || "T");
    $("#dlgTrophy").showModal();
    drawFaces();
  };
  function setTab(t) {
    $("#tabT").setAttribute("aria-selected", t === "T");
    $("#tabG").setAttribute("aria-selected", t === "G");
    $("#paneT").hidden = t !== "T";
    $("#paneG").hidden = t !== "G";
  }
  $("#tabT").onclick = () => setTab("T");
  $("#tabG").onclick = () => setTab("G");

  // 世界の手引き：図鑑の「用語」のタブ（一覧 → 詳しく。ui/f2_codex.js。U11）。新しい印は図鑑の印（G.codexFresh）で出す。
  // ui.buildWorld は #worldBody があるときだけ描く（今の画面には無い。包んでいるファイルのために入口だけ残す）
  function markWorld() { if (G.f2 && G.f2.markBtn) G.f2.markBtn(); }
  ui.buildWorld = () => {
    const body = $("#worldBody");
    if (!body) return;
    body.textContent = "";
    body.append(h("p", "", D.WORLD.intro));
    D.WORLD.sections.forEach(([t, rows]) => {
      body.append(h("h3", "", t));
      const dl = h("dl");
      rows.forEach(([k, v]) => dl.append(h("dt", "", k), h("dd", "", v)));
      body.append(dl);
    });
    body.append(h("h3", "", "判定のしくみ"), h("p", "", D.RULES_TEXT));
  };

  document.querySelectorAll("[data-close]").forEach((b) => { b.onclick = () => b.closest("dialog").close(); });
  document.querySelectorAll("dialog").forEach((dl) => dl.addEventListener("click", (ev) => { if (ev.target === dl) dl.close(); }));
  $("#openTrophy").onclick = () => ui.openTrophies();
  $("#openSheet").onclick = () => ui.setSheetOpen(true);
  $("#sheetBox").addEventListener("click", (ev) => { if (ev.target.id === "sheetBox") ui.setSheetOpen(false); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && document.body.classList.contains("sheet-open")) ui.setSheetOpen(false); });
  $("#chronNew").onclick = () => { $("#dlgChron").close(); G.main.toSetup(); };
})(globalThis.G = globalThis.G || {});
