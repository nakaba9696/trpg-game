// 冒険の画面：背景、記録、行動のボタン、自由入力、キャラクターシート、地図・年表・トロフィー・手引き。
// エンジン（G.S）を読んで描くだけ。行動は G.act を呼ぶ。レーン U（UI）が管理
(function (G) {
  const D = G.data;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const ui = (G.ui = {});

  const FAC_SCENE = { inn: "inn", tavern: "tavern", shop: "shop", guild: "guild", church: "church", train: "train", alley: "alley", castle: "throne" };
  let lastPaint = "";
  let busy = false;

  // ---------------------------------------------------------------- 背景
  function sceneKey() {
    const S = G.S;
    const L = G.loc();
    if (S.mode === "fac" && S.fac) return FAC_SCENE[S.fac];
    if (L.type === "dungeon" && S.depth > 0) return ["bones", "cave", "majin"].includes(L.scene) ? L.scene : "dungeon";
    return L.scene;
  }
  function paint(force) {
    const S = G.S;
    const foes = S.combat ? G.alive().map((f) => { const e = D.ENEMIES[f.id]; return { id: f.id, shape: e.shape, eye: e.eye, boss: !!e.boss }; }) : [];
    const key = sceneKey();
    const sig = [key, S.phase, S.loc, S.depth, JSON.stringify(foes), $("#scene").clientWidth].join("|");
    if (!force && sig === lastPaint) return;
    lastPaint = sig;
    G.paintScene($("#scene"), { key, phase: S.phase, seed: S.loc + ":" + S.depth + ":" + key, foes, redMoon: S.phase === 3 && !!S.flags.god });
  }
  window.addEventListener("resize", () => { if (G.S && !$("#play").hidden) paint(true); });

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
    return box;
  }
  const LOG_CLS = { nar: "l-nar", you: "l-you", sys: "l-sys", grow: "l-grow", trophy: "l-trophy", title: "l-title", gmtag: "l-gmtag" };
  function logEntryEl(e) {
    if (e.k === "dice") return checkEl(e);
    return h("p", LOG_CLS[e.k] || "l-sys", e.k === "you" ? "▶ " + e.text : e.text);
  }
  const LOG_KEEP = 90;
  let logSeen = -1; // 前回描いたときの記録の数（-1 は初回）
  function renderLog() {
    const S = G.S;
    const log = $("#log");
    log.textContent = "";
    const shown = S.log.slice(-LOG_KEEP);
    const fresh = logSeen < 0 ? 0 : Math.min(shown.length, Math.max(0, S.log.length - logSeen));
    logSeen = S.log.length;
    shown.forEach((e, i) => { const el = logEntryEl(e); if (fresh && i >= shown.length - fresh) el.classList.add("new"); log.append(el); });
    // 新しく増えた記録の頭から読めるようにする（増えていなければ末尾）
    const first = fresh ? log.children[shown.length - fresh] : null;
    log.scrollTop = first ? Math.max(0, first.offsetTop - log.offsetTop - 8) : log.scrollHeight;
    if (fresh && narrow()) {
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
    const b1 = h("button", "btn", "年表を見る"); b1.type = "button"; b1.onclick = () => ui.openChronicle(S, true);
    const b2 = h("button", "btn primary", "新しい冒険を始める"); b2.type = "button"; b2.onclick = () => G.main.toSetup();
    row.append(b1, b2); f.append(row); panel.append(f);
  }
  // 戦闘中の敵の札（B1 の演出はここに足す）
  function foeEl(f) {
    const c = h("div", "foe" + (f.hp > 0 ? "" : " down"));
    c.append(h("b", "", f.name));
    const g = h("span", "g"); const i = h("i"); i.style.width = (f.hp / f.max) * 100 + "%"; g.append(i); c.append(g);
    c.append(h("span", "num fine", `HP ${f.hp}/${f.max}`));
    return c;
  }
  function renderFoes(panel) {
    const foes = h("div", "foes");
    G.S.combat.foes.forEach((f) => foes.append(foeEl(f)));
    panel.append(foes);
  }
  // 行動ボタン1つ
  function actionButton(a) {
    const b = h("button", "act");
    b.type = "button";
    b.disabled = !!a.disabled || busy;
    b.append(h("b", "", a.label));
    if (a.sub) b.append(h("span", "", a.sub));
    b.onclick = () => { if (!busy) { G.act(a.id); after(); } };
    return b;
  }
  function renderActions(panel) {
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
  function renderPanel() {
    const S = G.S;
    const panel = $("#panel");
    panel.textContent = "";
    if (S.over) { renderEnd(panel); return; }
    if (S.combat) renderFoes(panel);
    renderActions(panel);
  }

  // ---------------------------------------------------------------- 自由入力
  $("#act").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const S = G.S;
    const text = $("#free").value.trim();
    const hint = $("#freeHint");
    if (!text || !S || S.over || busy) return;
    const a = G.parse(text);
    hint.hidden = false;
    hint.textContent = "";
    if (a) {
      hint.append(h("span", "", `「${text}」→ ${a.label}`));
      $("#free").value = "";
      G.act(a.id);
      after();
      return;
    }
    hint.append(h("span", "", `「${text}」は、今できる行動に当てはまりませんでした。`));
    if (G.main.sample) {
      const b = h("button", "btn", "GM に任せる（Claude の利用量を使う）");
      b.type = "button";
      b.onclick = () => askGM(text);
      hint.append(b);
    } else hint.append(h("span", "", "（GM に任せる機能は claude.ai で開いたときだけ使えます）"));
  });

  async function askGM(text) {
    const hint = $("#freeHint");
    busy = true;
    renderPanel();
    hint.textContent = "GM が考えています…";
    try {
      const res = await G.main.sample.json(G.gmPrompt(text), { modelTier: "quick", cache: false });
      G.gmApply(text, res);
      $("#free").value = "";
      hint.hidden = true;
    } catch (e) {
      const msg = {
        not_granted: "Claude の利用が許可されなかったので、GM を呼べません。",
        rate_limited: "Claude の利用が混み合っているか、上限に達しました。少し待ってから試してください。",
        refused: "GM がこの行動には応じませんでした。言い回しを変えてください。",
        invalid_json: "GM の答えを読み取れませんでした。もう一度試してください。",
      }[e && e.code] || "GM との通信が途切れました。もう一度試してください。";
      hint.textContent = msg;
      if (e && e.code === "not_granted") G.main.sample = null;
    } finally {
      busy = false;
      after();
    }
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
    hd.append(h("span", "sname", S.profile.name), h("span", "sclass", `${S.clsName}${S.title ? "・" + S.title : ""}・${G.fameRank(S.fame)}（名声 ${S.fame}）`));
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
  function sheetStats(ups) {
    const S = G.S;
    const list = h("div", "statlist num");
    D.STATS.forEach((k) => {
      const row = h("div", "stat" + (ups && ups[k] ? " up" : ""));
      row.title = D.STAT_HINT[k];
      const bar = h("span", "bar"); const i = h("i"); i.style.width = S.stats[k] + "%"; const u = h("u"); u.style.left = `calc(${S.caps[k]}% - 1px)`; bar.append(i, u);
      row.append(h("span", "nm", k), h("span", "v", String(S.stats[k])), bar, h("span", "cap", `限界 ${S.caps[k]}`));
      list.append(row);
    });
    return sheetSection("stats", "能力値（成功率の基準％・赤線は才能限界）", list);
  }
  // 目的・日付・装備などの表（装備の枠を足すときはここの行に足す）
  function sheetGearRows() {
    const S = G.S;
    const w = G.weapon(), ar = G.armor(), rg = G.ring();
    return [["目的", S.goal.text + (G.goalDone(S) ? "（達成）" : "")], ["日付", `${G.date()}・${G.PHASES[S.phase]}`], ["場所", G.loc().name], ["所持金", `${S.gold} G`],
      ["武器", `${w.name}（${w.dmg[0]}D${w.dmg[1]}+${w.dmg[2]}${w.pierce ? "・絶界を破る" : ""}）`], ["防具", ar ? `${ar.name}（防御${ar.def}）` : "なし"],
      ["装飾品", rg ? `${rg.name}（${G.ringEffect(rg)}）` : "なし", rg ? S.ring : null],
      ["状態", S.conds.length ? S.conds.join("、") : "なし"], ["仲間", S.companions.length ? S.companions.map((c) => c.name).join("、") : "なし"]];
  }
  function sheetGear() {
    const kv = h("dl", "kv");
    // 3つ目があれば、その装備を外すボタンを付ける
    sheetGearRows().forEach(([k, v, id]) => { const dd = h("dd", "", v); if (id) itemButtons(id, G.itemInfo(id), dd, true); kv.append(h("dt", "", k), dd); });
    return kv;
  }
  function sheetQuests() {
    const S = G.S;
    if (!S.quests.length) return null;
    const ul = h("ul", "inv");
    S.quests.forEach((x) => ul.append(h("li", "", `${x.done ? "✔ " : ""}${x.title}${x.type === "hunt" ? `（${x.progress}/${x.need}）` : ""}`)));
    return sheetSection("quests", `受けている依頼（${S.quests.length}）`, ul);
  }
  // 持ち物1行のボタン（装備できる種類を増やすときはここ）
  function itemButtons(id, it, li, worn) {
    const S = G.S;
    const free = !busy && !S.over && S.mode !== "combat";
    const mk = (label, fn) => { const b = h("button", "btn small", label); b.type = "button"; b.disabled = !free; b.onclick = () => { fn(); after(); }; li.append(b); };
    if (it.type === "use" && (it.hp || it.mp)) mk("使う", () => G.useItem(id));
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
  function sheetMemos() {
    const S = G.S;
    if (!S.memos.length) return null;
    const ol = h("ol", "memos");
    S.memos.slice(-10).forEach((x) => ol.append(h("li", "", x)));
    return sheetSection("memos", "覚えていること", ol);
  }
  function sheetButtons() {
    const S = G.S;
    const acts = h("div", "sheet-actions");
    const mk = (label, fn) => { const b = h("button", "btn", label); b.type = "button"; b.onclick = fn; acts.append(b); return b; };
    mk("人物", () => ui.openProfile());
    mk("地図", () => ui.openMap());
    mk("年表", () => { ui.setSheetOpen(false); ui.openChronicle(S, false); });
    mk("ログをコピー", copyLog);
    if (!S.over) {
      let armed = 0;
      const rb = mk("引退する", () => {
        if (Date.now() - armed > 3000) { armed = Date.now(); rb.textContent = "もう一度押すと引退"; setTimeout(() => { rb.textContent = "引退する"; }, 3000); return; }
        G.retire(); after();
      });
      rb.disabled = busy || S.mode === "combat";
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
  }
  function renderSheet(ups) {
    const sh = $("#sheet");
    const keep = sh.scrollTop;
    sh.textContent = "";
    [sheetHead(), sheetPools(), sheetStats(ups), sheetGear(), sheetQuests(), sheetInventory(), sheetMemos(), sheetButtons()].forEach((el) => { if (el) sh.append(el); });
    sh.scrollTop = keep;
    renderMobileBar();
  }
  // ステータスの開閉（スマホでは全面に重ねて出す。PC では常に横にある）
  ui.setSheetOpen = (on) => {
    const was = document.body.classList.contains("sheet-open");
    document.body.classList.toggle("sheet-open", on);
    $("#openSheet").setAttribute("aria-expanded", on);
    if (on && !was) { const c = $("#sheet .closeSheet"); if (c) c.focus({ preventScroll: true }); }
    else if (!on && was && narrow()) $("#openSheet").focus({ preventScroll: true });
  };

  async function copyLog() {
    const S = G.S;
    const lines = S.log.map((e) => e.k === "dice" ? `［判定］${e.reason}【${e.stat}】成功率${e.chance}% 出目${e.roll} ${e.label}${e.growth ? ` ${e.stat}成長${e.growth[0]}→${e.growth[1]}` : ""}` : e.k === "you" ? `▶ ${e.text}` : e.k === "title" ? `\n■ ${e.text}` : e.text);
    const txt = `『言霊の卓』 ${S.clsName} ${S.profile.name} ── 目的：${S.goal.text}\n` + lines.join("\n");
    try { await navigator.clipboard.writeText(txt); ui.toast("ログをコピーしました"); }
    catch { const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.append(ta); ta.select(); try { document.execCommand("copy"); ui.toast("ログをコピーしました"); } catch { ui.toast("コピーできませんでした"); } ta.remove(); }
  }

  // ---------------------------------------------------------------- 全体
  let prevStats = null;
  function after() {
    const S = G.S;
    const ups = {};
    if (prevStats) D.STATS.forEach((k) => { if (S.stats[k] > prevStats[k]) ups[k] = true; });
    prevStats = { ...S.stats };
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
    renderLog();
    renderPanel();
    renderSheet(ups);
    if (!prevStats) prevStats = { ...S.stats };
  };

  // ---------------------------------------------------------------- 通知
  let toastT = 0;
  ui.toast = (text, strong) => {
    const t = $("#toast");
    t.textContent = "";
    if (strong) { t.append(h("span", "", text + " ")); t.append(h("b", "", strong)); } else t.textContent = text;
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
    [["性別", p.sex], ["年齢", `${p.age}歳`], ["外見", p.look], ["性格", p.personality], ["生い立ち", p.history], ["口癖", `「${p.quote}」`], ["好きなもの", p.like], ["苦手なもの", p.dislike], ["目的", S.goal.text]]
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
      ep.append(h("b", "", end === "dead" ? `${cls} ${name}、ここに眠る` : `${cls} ${name}、物語を終える`));
      ep.append(h("span", "", `目的：${run.goal && run.goal.text ? run.goal.text : run.goal}`));
      ep.append(h("span", "num", `${run.date || G.dateOf(run.day)}　${run.location || ""}　${end === "dead" ? "死因：" + (run.deathCause || run.cause || "") : ""}　${run.turn ?? run.turns} 手番　名声 ${run.fame ?? 0}${run.title ? "　" + run.title : ""}`));
      ep.append(h("span", "num", "最後の能力値：" + D.STATS.map((k) => `${k}${run.stats[k]}`).join(" ")));
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
      b.append(h("b", "", `${g.cls} ${g.name}${g.title ? "（" + g.title + "）" : ""}`), h("span", "", `目的：${g.goal}`), h("span", "num", `${g.date}　${g.end === "dead" ? "死因：" + g.cause : "物語を終えた"}　${g.turns} 手番`));
      b.onclick = () => { $("#dlgTrophy").close(); ui.openChronicle(g, false); };
      gl.append(b);
    });
    setTab(tab || "T");
    $("#dlgTrophy").showModal();
  };
  function setTab(t) {
    $("#tabT").setAttribute("aria-selected", t === "T");
    $("#tabG").setAttribute("aria-selected", t === "G");
    $("#paneT").hidden = t !== "T";
    $("#paneG").hidden = t !== "G";
  }
  $("#tabT").onclick = () => setTab("T");
  $("#tabG").onclick = () => setTab("G");

  ui.buildWorld = () => {
    const body = $("#worldBody");
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
  $("#openWorld").onclick = () => $("#dlgWorld").showModal();
  $("#openSheet").onclick = () => ui.setSheetOpen(true);
  $("#sheetBox").addEventListener("click", (ev) => { if (ev.target.id === "sheetBox") ui.setSheetOpen(false); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && document.body.classList.contains("sheet-open")) ui.setSheetOpen(false); });
  $("#chronNew").onclick = () => { $("#dlgChron").close(); G.main.toSetup(); };
})(globalThis.G = globalThis.G || {});
