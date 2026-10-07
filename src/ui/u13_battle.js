// U13：戦闘の見せ方（エンジン combat.js は触らない。1 手をまとめて計算した記録を、画面の側で順に見せる）
// - 1 手の記録（あなた → 仲間 → 敵 → 結果）を、一行ずつ間をおいて出す。動いた者の札を一瞬光らせ、ダメージの数字・HP の棒（fx.js）もその行に合わせる。
//   画面を押す／キーを押すと残りをすぐ全部出す（早送り）。出している間は次の手を押せない（押すと早送りだけする）。
//   速さは「ゆっくり／ふつう／すぐ」（G.P.u13speed。記録に残る。無ければ「ふつう」。設定の窓 G.ui.addSetting に足す）。「すぐ」は今まで通り一度に出す。
// - 戦闘が終わったら、すぐ探索の画面に戻さず結果の場面を出す（勝利などの見出し・得た物・成長・一行の HP）。「先へ進む」を押すまでそのまま。
// - 能力値の点が伸びたら、レベルアップのような演出（ファンファーレ・見出し・伸びた欄が光る）。戦闘の後なら結果の場面の中に、ほかはその場で。
//   成長の計算には触らず、「表示の点（G.pt）が増えた」ことだけを見る。仲間の HP の上限・腕前が伸びたときも小さく出す。
// - 主人公が死んだら、すぐ年表・墓碑にせず死の場面を挟む（致命の一手を順に見せたあと「あなたは倒れた」・倒れたわけ・画面が暗く色が抜ける）。
//   押すまで先へ進まない。押したら墓碑・年表の窓（ui.openChronicle）。墓碑には「最後に保存した所から、やり直すこともできる」を添える。
// - F5：戦闘を終えた手番（とどめの一撃・あなたが倒れる一撃）も、ほかの手番と同じ順に見せる。エンジンはその手番で S.combat を片づけるので、
//   順に見せている間だけ、終わった戦い（ghost）を描く：背景の敵・敵の札と HP の帯・手の欄は戦闘のまま、ダイス → 当たり・ダメージ → 帯が 0 → 倒れる → 一拍 → 結果の場面（死の場面）。
//   入れ替えるのは描く間だけ（u13.inGhost。外側の包みは ui/zzzzzzz_f5_finish.js）。保存（ui.after の G.main.save）は描き終えてからなので、記録には残らない
// - F6：結果がダイスより先に漏れないように、効果音は順に出す行に合わせて鳴らし（行に結びつかない金・品の音は出し終えてから）、
//   BGM は終わった戦いを見せている間は戦闘の曲のまま（sound_bgm.js が u13.inGhost で場面を見る）。知らせは ui/zzzzzz_f6_hold.js が出し終えるまで預かる（u13.afterReveal）
// 見せ方は u13_battle.css。レーン U
(function (G) {
  const u13 = (G.u13 = G.u13 || {});
  const D = () => G.data;

  // ---------------------------------------------------------------- 速さ（DOM なしで使える。テストもこれを読む）
  // F1：速さは 4 段（ゆっくり・ふつう・速い・一気に）。k は段の重さに掛ける倍率。古い記録の "instant"（すぐ）は「一気に」として読む
  u13.SPEEDS = { slow: { name: "ゆっくり", ms: 700, k: 1.5 }, normal: { name: "ふつう", ms: 470, k: 1 }, fast: { name: "速い", ms: 260, k: 0.55 }, instant: { name: "一気に", ms: 0, k: 0 } };
  u13.SPEED_ORDER = ["slow", "normal", "fast", "instant"];
  u13.speed = (P) => (P && u13.SPEEDS[P.u13speed] ? P.u13speed : "normal");
  u13.delay = (P) => u13.SPEEDS[u13.speed(P)].ms;
  // F1：段の重さ（「ふつう」で、その行を出してから次の行までの間。ミリ秒）。サイコロは転がる間を含む。大成功・大失敗・気配・倒れる・深手は長め
  u13.beatOf = (e) => {
    if (!e) return 470;
    if (e.k === "dice") return e.crit || e.fumble ? 1050 : 820;
    if (e.k === "you") return 400;
    if (e.tell) return e.rage ? 900 : 760;
    if (e.fx === "down") return e.boss ? 1000 : 720;
    if (e.fx === "hurt") return e.heavy ? 820 : 600;
    if (e.fx === "hit" || e.fx === "ally" || e.fx === "wall") return 560;
    if (e.fx === "crit") return 420;
    if (e.k === "sys") return 330;
    return 470;
  };
  // サイコロが転がる長さ（「ふつう」で。速さの倍率を掛ける）と、戦闘が終わってから結果の場面までの一拍
  u13.ROLL_MS = 460;
  u13.END_BEAT = 650;
  // 順に出す行の段取り：n 行それぞれを何ミリ秒後に出すか。行が 1 つ以下、または「一気に」なら全部 0。
  // entries（その行の記録）を渡すと、行ごとの重さ（u13.beatOf）で間を変える
  u13.revealPlan = (n, P, entries) => {
    const sp = u13.SPEEDS[u13.speed(P)];
    if (n < 2 || !sp.k) return Array.from({ length: n }, () => 0);
    const out = [];
    let t = 0;
    for (let i = 0; i < n; i++) { out.push(Math.round(t)); t += entries ? u13.beatOf(entries[i]) * sp.k : sp.ms; }
    return out;
  };
  // サイコロの転がる途中の目（乱数は使わない。出目から決まる並び）。最後は本当の出目
  u13.rollFrames = (roll, n) => Array.from({ length: n }, (_, i) => (i === n - 1 ? roll : (roll * 7 + (i + 1) * 37) % 100));
  // 順に出す係。show(i) を段取りの時刻に呼ぶ。finish() で残りをすぐ全部出す。timer は setTimeout と同じ形（テストで差し替える）
  u13.makeReveal = (delays, show, done, timer) => {
    const set = timer || ((fn, ms) => setTimeout(fn, ms));
    const clear = timer ? () => {} : (id) => clearTimeout(id);
    let next = 0, over = false;
    const ids = [];
    const step = (i) => { while (next <= i) show(next++); if (next >= delays.length) end(); };
    const end = () => { if (over) return; over = true; ids.forEach(clear); if (done) done(); };
    delays.forEach((ms, i) => { if (!ms) step(i); else ids.push(set(() => { if (!over) step(i); }, ms)); });
    if (!delays.length) end();
    return { finish: () => { if (over) return; step(delays.length - 1); }, get done() { return over; } };
  };

  // ---------------------------------------------------------------- 結果の場面と成長の中身（DOM なし）
  u13.OUTCOME = { win: "勝利", fled: "逃げ切った", scared: "追い払った", bribed: "見逃してもらった" };
  const maxOf = (c) => (G.b5Max ? G.b5Max(c) : c.maxHp || c.hp || 0);
  u13.snap = (S) => ({
    run: S.id, gold: S.gold, inv: { ...(S.inv || {}) },
    pts: Object.fromEntries(D().STATS.map((k) => [k, G.pt(S.stats[k])])),
    comps: (S.companions || []).map((c) => ({ id: c.id, name: c.name, max: maxOf(c), power: c.power || 0 })),
  });
  // 能力値の点が増えたもの：[{ k, from, to }]
  u13.grown = (a, S) => (a ? D().STATS.filter((k) => G.pt(S.stats[k]) > a.pts[k]).map((k) => ({ k, from: a.pts[k], to: G.pt(S.stats[k]) })) : []);
  // 仲間の伸び：[{ name, what, from, to }]
  u13.compGrown = (a, S) => {
    const out = [];
    (S.companions || []).forEach((c) => {
      const b = a && a.comps.find((x) => x.id === c.id);
      if (!b) return;
      if (maxOf(c) > b.max) out.push({ name: c.name, what: "HP の上限", from: b.max, to: maxOf(c) });
      if ((c.power || 0) > b.power) out.push({ name: c.name, what: "腕前", from: b.power, to: c.power });
    });
    return out;
  };
  const itemName = (id) => { const it = G.itemInfo ? G.itemInfo(id) : D().ITEMS[id]; return (it && it.name) || id; };
  u13.result = (a, S, how) => {
    const items = Object.keys(S.inv || {}).filter((id) => (S.inv[id] || 0) > ((a && a.inv[id]) || 0)).map((id) => ({ name: itemName(id), n: S.inv[id] - ((a && a.inv[id]) || 0) }));
    return {
      how: how || "win",
      title: u13.OUTCOME[how] || "戦闘が終わった",
      gold: a ? Math.max(0, S.gold - a.gold) : 0,
      items,
      grow: u13.grown(a, S),
      comp: u13.compGrown(a, S),
      party: [{ name: "あなた", hp: S.hp, max: S.maxHp }, ...(S.companions || []).map((c) => ({ name: c.name, hp: c.hp, max: maxOf(c) }))],
    };
  };

  // 死の場面の中身：見出し・倒れたわけ（R3 の墓碑と同じ文。無ければ死因）・次に試せそうなこと
  u13.deathScene = (S) => {
    const c = (G.r3Clue && G.r3Clue(S)) || null;
    return { title: "あなたは倒れた", cause: (c && c.what) || (S.deathCause ? `${S.deathCause}。` : "力尽きた。"), hint: (c && c.hint) || "" };
  };
  u13.RETRY = "最後に保存した所から、やり直すこともできる（タイトルの「ロード」から）。";

  // F6：効果音を段に合わせる（DOM なし。テストもこれを読む）。list は [{ n: 音の名前, d: 元の遅れ, e: 元になった記録 }]、entries は順に出す行の記録。
  //   行に結びついた音は、その行が出る瞬間（行の番号 → 名前の並び）。行に結びつかない音（金・品・戦闘の始まりの合図など）は、出し終えてから（after）
  u13.QUIET_ON_DEATH = ["trophy", "coin", "item", "page", "levelup"];
  u13.soundPlan = (list, entries) => {
    const at = {}, after = [];
    (list || []).forEach((x) => {
      const i = x.e ? (entries || []).indexOf(x.e) : -1;
      if (i >= 0) (at[i] || (at[i] = [])).push(x.n); else after.push(x.n);
    });
    return { at, after };
  };

  // ---------------------------------------------------------------- 画面
  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const play = (name, delay) => { try { if (G.sound && G.sound.play) G.sound.play(name, delay); } catch {} };

  // 速さは「設定」の窓（Q7 の G.ui.addSetting）に足す。窓のファイルはこのあとに読まれる（zz_q7_topbar.js）ので、
  // 描き直しのたびに口があるか見て、一度だけ足す。口がまだ無ければ、記録の値（G.P.u13speed、既定「ふつう」）だけで動く
  let registered = false;
  function registerSetting() {
    if (registered || typeof ui.addSetting !== "function") return;
    registered = true;
    ui.addSetting({
      id: "u13speed", section: "遊び", label: "戦闘の表示の速さ", kind: "select",
      options: u13.SPEED_ORDER.map((k) => [k, u13.SPEEDS[k].name]),
      get: () => u13.speed(G.P),
      set: (v) => { if (G.P && u13.SPEEDS[v]) { G.P.u13speed = v; if (G.main && G.main.saveProfile) G.main.saveProfile(); } },
      hint: "戦闘の一手を、サイコロ → あなたの一撃 → 仲間 → 敵の順に一段ずつ出す間。「一気に」は一度に出す。出している間に画面を押すかキーを押すと、残りをすぐ出す",
    });
  }
  setTimeout(registerSetting, 0);

  // 戦闘の終わり方（勝利・逃走…）。エンジンが b5AfterCombat(how) を呼ぶので、それを包んで覚える
  let lastHow = null;
  const b5a = G.b5AfterCombat;
  G.b5AfterCombat = (how) => { lastHow = how; return b5a ? b5a(how) : undefined; };

  // fx.js の演出は、順に出す行に合わせて鳴らす。ui.js が描き直しのたびに呼ぶ G.fx.play は、ここで一度預かる
  let pendingFx = null;
  const fxPlay = G.fx && G.fx.play;
  if (G.fx && fxPlay) G.fx.play = (entries, S) => { pendingFx = { entries: entries || [], S }; };
  const flushFx = (entries, S, keep) => { if (fxPlay && entries && entries.length) fxPlay(entries, S, keep); };
  // F6：効果音（ui/sound.js の react）も一度預かり、順に出す行に合わせて鳴らす（ダイスより先に、倒した音・金の音が鳴らないように）
  let pendingSnd = null;
  const snd = G.sound;
  const react0 = snd && snd.react;
  if (react0) snd.react = (S) => {
    const calls = [];
    const play0 = snd.play;
    snd.play = (n, d) => { calls.push([n, d]); };
    try { react0(S); } finally { snd.play = play0; }
    const from = snd.cueFrom || [];
    pendingSnd = calls.map(([n, d], i) => ({ n, d, e: from[i] || null }));
    // あなたが倒れた手番：今まで通り、知らせの音（トロフィー・金・品）は鳴らさず、倒れる音だけ（見せ終えてから鳴る）
    if (ghostReal && ghostReal.over === "dead") pendingSnd = pendingSnd.filter((x) => !u13.QUIET_ON_DEATH.includes(x.n));
  };
  const playNow = (list) => { (list || []).forEach((x) => { try { snd.play(x.n, x.d); } catch (e) {} }); };
  // 出し終えたあとに呼ぶもの（F6：知らせ・効果音。終わった戦いを片づけて描き直したあと）
  let afterCalls = [];
  u13.revealing = () => !!reveal;
  u13.afterReveal = (fn) => { if (reveal) afterCalls.push(fn); else fn(); };
  const runAfter = () => {
    const list = afterCalls; afterCalls = [];
    const go = () => list.forEach((fn) => { try { fn(); } catch (e) {} });
    if (rendering) setTimeout(go, 0); else go();
  };

  // 「能力値が伸びた」の小さな通知は、この演出に置き換える
  const toast0 = ui.toast;
  ui.toast = (text, strong) => { if (text === "能力値が伸びた") return; return toast0(text, strong); };

  // ---------------------------------------------------------------- 一行ずつ出す
  let reveal = null; // { r: makeReveal, els, panel }
  // F5：終わった戦い（とどめの手番を順に見せる間だけ描く）。{ c: 戦い, run: 冒険の id }。ghostReal は入れ替えている間の本当の値
  let ghost = null, ghostReal = null, rendering = 0;
  u13.ghosting = () => !!ghost;
  u13.inGhost = (fn) => {
    const S = G.S;
    if (!ghost || !S || ghostReal || ghost.run !== S.id) return fn();
    const had = Object.prototype.hasOwnProperty.call(S, "over");
    ghostReal = { combat: S.combat, mode: S.mode, over: S.over };
    S.combat = ghost.c; S.mode = "combat"; S.over = null;
    try { return fn(); } finally {
      const R = ghostReal; ghostReal = null;
      S.combat = R.combat; S.mode = R.mode;
      if (had) S.over = R.over; else delete S.over;
    }
  };
  // 描く前（外側の包みが呼ぶ）：出している途中なら先に全部出し、戦闘を今終えたなら終わった戦いを描く
  u13.renderStart = () => {
    rendering++;
    if (reveal) reveal.r.finish(); // 出している途中で描き直すときは、先に全部出す
    const S = G.S;
    if (!ghost && S && fightRef && !S.combat && fightSnap && fightSnap.run === S.id && u13.delay(G.P) > 0) {
      // F6：手の欄は、手を選ぶ前の形のまま写しておく（とどめで敵がいなくなると手が消え、ダイスより先に結果が分かってしまうので）
      const p = $("#panel");
      ghost = { c: fightRef, run: S.id, panel: p ? p.cloneNode(true) : null, restored: false };
    }
  };
  // 手の欄を、手を選ぶ前の写しに戻す（押しても早送りだけ。u13_menu などはこの間は並べ替えない）
  u13.ghostPanel = () => !!(ghost && ghost.restored);
  function restorePanel() {
    const panel = $("#panel");
    if (!ghost || !ghost.panel || !panel) return;
    panel.replaceChildren(...Array.from(ghost.panel.childNodes));
    panel.className = ghost.panel.className;
    ghost.restored = true;
  }
  // 描いたあと：順に出すものが無ければ、終わった戦いはすぐ片づけて描き直す
  u13.renderEnd = () => {
    rendering--;
    if (ghost && !reveal && !rendering) { ghost = null; ui.render(); }
  };
  const viewOf = (S) => {
    if (!ghost) return S;
    const V = Object.create(S);
    V.combat = ghost.c; V.mode = "combat"; V.over = null;
    return V;
  };
  function flashActor(el) {
    const text = el.textContent || "";
    const cands = [
      ...Array.from(document.querySelectorAll("#panel .foe[data-foe]")).map((c) => [c.dataset.foe, c]),
      ...Array.from(document.querySelectorAll("#panel .b5mem")).map((c) => [(c.querySelector("b") || {}).textContent || "", c]),
    ].filter(([n]) => n);
    let best = null, at = Infinity;
    cands.forEach(([n, c]) => { const i = text.indexOf(n); if (i >= 0 && i < at) { at = i; best = c; } });
    if (best && at < 12) { best.classList.remove("u13act"); void best.offsetWidth; best.classList.add("u13act"); setTimeout(() => best.classList.remove("u13act"), 700); }
  }
  // F1：サイコロの行は、目が転がってから止まり、そのあと成否が出る（大成功・大失敗は目立たせる）
  function rollDice(el, e, ms) {
    const dies = el.querySelectorAll(".die");
    if (dies.length < 2 || calm() || ms < 120) { land(el, e); return; }
    el.classList.add("f1roll");
    const frames = u13.rollFrames(e.roll % 100, Math.max(3, Math.round(ms / 70)));
    let i = 0;
    const tick = () => {
      if (!el.isConnected || !el.classList.contains("f1roll")) return;
      const r = frames[i++];
      dies[0].textContent = String(Math.floor(r / 10)); dies[1].textContent = String(r % 10);
      if (i < frames.length) el.f1t = setTimeout(tick, ms / frames.length); else land(el, e);
    };
    tick();
  }
  function land(el, e) {
    clearTimeout(el.f1t);
    const dies = el.querySelectorAll(".die");
    const r = e.roll % 100;
    if (dies.length >= 2) { dies[0].textContent = String(Math.floor(r / 10)); dies[1].textContent = String(r % 10); }
    el.classList.remove("f1roll");
    el.classList.add("f1land");
    if (e.crit || e.fumble) el.classList.add(e.crit ? "f1crit" : "f1fumble");
  }
  function startReveal(S, fresh, entries, ended, sounds) {
    const sp0 = u13.soundPlan(sounds, entries);
    const panel = $("#panel"), log = $("#log");
    const sp = u13.SPEEDS[u13.speed(G.P)];
    // 戦闘が終わった手番は、最後の行のあと一拍おいて結果の場面へ（何も出さない一段を足す）
    const beat = ended ? 1 : 0;
    const delays = u13.revealPlan(fresh.length + beat, G.P, beat ? [...entries, null] : entries);
    if (beat) delays[delays.length - 1] = delays[delays.length - 2] + Math.round((u13.beatOf(entries[entries.length - 1]) + u13.END_BEAT) * sp.k);
    fresh.forEach((el) => el.classList.add("u13hide"));
    panel.classList.add("u13wait");
    // 札と HP の欄を手番の前の値に戻し、当たった行が出るたびに減らす（fx.js）。戦闘を終えた手番は、終わった戦いを見せる（F5）
    const V = viewOf(S);
    if (G.fx && G.fx.freeze) G.fx.freeze(V);
    const rolling = [];
    const show = (i) => {
      const el = fresh[i];
      if (!el) return; // 終わりの一拍
      el.classList.remove("u13hide");
      el.classList.add("u13in");
      flashActor(el);
      const e = entries[i];
      if (e && e.k === "dice") { rolling.push([el, e]); rollDice(el, e, u13.ROLL_MS * sp.k); }
      if (sp0.at[i] && snd) sp0.at[i].forEach((n, j) => { try { snd.play(n, j * 0.12); } catch (err) {} });
      if (e && e.fx) flushFx([e], V, true);
      if (log && log.scrollHeight > log.clientHeight) log.scrollTop = log.scrollHeight;
    };
    const st = {};
    const done = () => {
      rolling.forEach(([el, e]) => { if (el.classList.contains("f1roll")) land(el, e); });
      if (G.fx && G.fx.remember) { const W = viewOf(G.S); G.fx.remember(W); G.fx.sync(W); }
      panel.classList.remove("u13wait");
      if (reveal === st) reveal = null;
      // 終わった戦いを見せ終えた：片づけて描き直す（結果の場面・死の場面はその描き直しで出る）
      // 行に結びつかない音（金・品など）は、出し終えてから
      if (sp0.after.length && snd) afterCalls.unshift(() => sp0.after.forEach((n, j) => { try { snd.play(n, j * 0.17); } catch (err) {} }));
      if (ghost) { ghost = null; if (!rendering) ui.render(); runAfter(); return; }
      if (dead && !dead.shown) showDead(G.S);
      else if (hold && !hold.shown) showHold();
      runAfter();
    };
    reveal = st;
    st.r = u13.makeReveal(delays, show, done);
  }
  // 早送り：出している間に画面を押す・キーを押すと、残りをすぐ全部出す（その押した分は手としては受け付けない）
  const skip = (ev) => {
    if (!reveal) return;
    if (ev.type === "keydown" && (ev.altKey || ev.ctrlKey || ev.metaKey || ev.key === "Shift" || ev.key === "Tab")) return;
    if (ev.target && ev.target.closest && ev.target.closest("dialog, .top")) { reveal.r.finish(); return; }
    reveal.r.finish();
    ev.preventDefault();
    ev.stopPropagation();
  };
  document.addEventListener("click", skip, true);
  document.addEventListener("keydown", skip, true);

  // ---------------------------------------------------------------- 結果の場面
  let fightRef = null, fightSnap = null;
  let hold = null; // { data, shown }
  u13.holding = () => !!hold || !!dead;
  function holdEl(d) {
    const box = h("div", "u13result " + d.how + (calm() || u13.speed(G.P) === "instant" ? " fast" : ""));
    box.setAttribute("role", "status");
    box.append(h("h3", "u13rtitle", d.title));
    const rows = h("dl", "u13rrows");
    const row = (k, v, cls) => { if (!v) return; rows.append(h("dt", "", k)); const dd = h("dd", cls || ""); if (typeof v === "string") dd.textContent = v; else dd.append(v); rows.append(dd); };
    const got = [d.gold ? `${d.gold}G` : "", ...d.items.map((it) => it.n > 1 ? `${it.name}×${it.n}` : it.name)].filter(Boolean).join("・");
    row("得た物", got || (d.how === "win" ? "なし" : ""));
    if (d.grow.length) {
      const g = h("div", "u13grows");
      d.grow.forEach((x) => g.append(growLine(x)));
      row("成長", g);
    }
    if (d.comp.length) row("仲間", d.comp.map((c) => `${c.name}の${c.what}が伸びた ${c.from}→${c.to}`).join("・"), "u13comp");
    row("一行", d.party.map((p) => `${p.name} HP ${Math.max(0, p.hp)}/${p.max}`).join("・"), "num");
    box.append(rows);
    const go = h("button", "act u13go");
    go.type = "button";
    go.append(h("b", "", "先へ進む"));
    go.onclick = () => { hold = null; ui.render(); };
    box.append(go);
    return box;
  }
  function growLine(x) {
    const l = h("div", "u13grow1");
    l.append(h("b", "", `${x.k}が伸びた！`), h("span", "num", ` ${x.from} → ${x.to}`));
    return l;
  }
  function showHold() {
    const panel = $("#panel");
    if (!panel || !hold) return;
    panel.textContent = "";
    panel.append(holdEl(hold.data));
    if (!hold.shown) {
      hold.shown = true;
      if (hold.data.how === "win") play("victory");
      if (hold.data.grow.length) play("levelup", 0.5);
      if (hold.data.grow.length) glowStats(hold.data.grow);
    }
  }

  // ---------------------------------------------------------------- 死の場面
  let prevOver = { id: null, over: null };
  let dead = null; // { id, data, shown }
  function showDead(S) {
    const panel = $("#panel");
    if (!panel || !dead) return;
    const d = dead.data;
    const fast = calm() || u13.speed(G.P) === "instant";
    document.body.classList.add("u13dead");
    document.body.classList.toggle("u13deadFast", fast);
    panel.textContent = "";
    const box = h("div", "u13death" + (fast ? " fast" : ""));
    box.setAttribute("role", "status");
    box.append(h("h3", "u13dtitle", d.title), h("p", "u13dcause", d.cause));
    if (d.hint) box.append(h("p", "u13dhint", d.hint));
    const go = h("button", "act u13go");
    go.type = "button";
    go.append(h("b", "", "墓碑と年表へ"));
    go.onclick = () => {
      dead = null;
      document.body.classList.remove("u13dead", "u13deadFast");
      ui.render();
      ui.openChronicle(S, true);
    };
    box.append(go);
    panel.append(box);
    if (!dead.shown) {
      dead.shown = true;
      play("fall");
      // スマホでは死の場面を画面の真ん中に送る（記録の下に隠れないように）
      if (window.matchMedia("(max-width: 880px)").matches) requestAnimationFrame(() => box.scrollIntoView({ block: "center", behavior: fast ? "auto" : "smooth" }));
    }
  }
  // 墓碑の窓には、ロードでやり直せることを一言添える（死んだときだけ）
  const chron0 = ui.openChronicle;
  if (chron0) ui.openChronicle = (run, fromEnd) => {
    chron0(run, fromEnd);
    try {
      const ep = $("#epitaph"), old = $("#u13retry");
      if (old) old.remove();
      if (ep && fromEnd && (run.over || run.end) === "dead") { const r = h("span", "u13retry"); r.id = "u13retry"; r.textContent = u13.RETRY; ep.append(r); }
    } catch {}
  };

  // ---------------------------------------------------------------- 能力値が伸びた（戦闘の外）
  let growBase = null;
  let popT = 0;
  function glowStats(list) {
    const names = new Set(list.map((x) => x.k));
    document.querySelectorAll("#sheet .stat").forEach((r) => { const n = r.querySelector(".nm"); if (n && names.has(n.textContent)) { r.classList.remove("u13glow"); void r.offsetWidth; r.classList.add("u13glow"); } });
  }
  function popGrowth(list, comps) {
    let box = $("#u13grow");
    if (!box) { box = h("div"); box.id = "u13grow"; box.setAttribute("role", "status"); document.body.append(box); box.onclick = () => { box.hidden = true; }; }
    box.textContent = "";
    box.className = calm() ? "fast" : "";
    box.append(h("div", "u13gtitle", list.length ? "能力値が伸びた！" : "仲間が伸びた"));
    list.forEach((x) => box.append(growLine(x)));
    comps.forEach((c) => box.append(h("div", "u13gcomp", `${c.name}の${c.what}が伸びた ${c.from} → ${c.to}`)));
    box.append(h("div", "u13ghint", "押すと閉じる"));
    box.hidden = false;
    clearTimeout(popT);
    popT = setTimeout(() => { box.hidden = true; }, 3600);
    if (list.length) { play("levelup"); glowStats(list); }
  }

  // ---------------------------------------------------------------- 描き直しのたびに
  function post(S) {
    registerSetting();
    const panel = $("#panel"), log = $("#log");
    if (!panel || !log) return;
    const pend = pendingFx; pendingFx = null;
    const psnd = pendingSnd; pendingSnd = null;
    // 終わった戦いを描いている間も、戦闘の始まり・終わり・死は本当の値で数える（F5）
    const R = ghostReal || S;
    const RC = R.combat, RO = R.over;
    if (growBase && growBase.run !== S.id) growBase = null;
    if (!growBase) growBase = u13.snap(S);
    // 戦闘の始まりと終わり（始まったときの記録は一度に出す。順に出すのは、戦闘の中の手番と、戦闘を終えた手番）
    const turn = !!RC && RC === fightRef;
    // 得た物は戦闘が始まったときの所持金・持ち物から数え、成長は前に見た点から数える（始まった手番で伸びた分も結果に出す）
    if (RC && RC !== fightRef) { fightRef = RC; fightSnap = { ...u13.snap(S), pts: growBase.pts, comps: growBase.comps }; }
    const ended = !!fightRef && !RC;
    if (ended) {
      if (!RO) hold = { data: u13.result(fightSnap, S, lastHow), shown: false };
      fightRef = null; fightSnap = null; lastHow = null;
      growBase = u13.snap(S);
    } else if (!RC && !hold && !RO) {
      // 戦闘の外で伸びた：その場で演出
      const g = u13.grown(growBase, S), c = u13.compGrown(growBase, S);
      if (g.length || c.length) popGrowth(g, c);
      growBase = u13.snap(S);
    }
    // 一行ずつ出す（戦闘の中か、戦闘が今終わったとき。行が 2 つ以上で「すぐ」でないとき）
    // 結果の場面のあとに始まる次の場面の行（U14 が結果の場面の間は隠す。G.u14.later）は順に出さない。その行は記録の末尾にある
    const all = Array.from(log.querySelectorAll(":scope > .new"));
    const fresh = G.u14 && G.u14.later ? all.filter((el) => !G.u14.later(el)) : all;
    const entries = pend ? pend.entries.slice(0, pend.entries.length - (all.length - fresh.length)).slice(-fresh.length) : [];
    if (ended && ghost && fresh.length >= 2 && u13.delay(G.P) > 0) restorePanel();
    if ((turn || ended) && fresh.length >= 2 && u13.delay(G.P) > 0) startReveal(S, fresh, entries, ended, psnd);
    else { if (pend) flushFx(pend.entries, pend.S); playNow(psnd); }
    // F1：見えている HP を覚える（次の手番を順に見せるとき、ここへ戻してから減らす）
    if (!reveal && G.fx && G.fx.remember) G.fx.remember(S);
    // 死の場面：今この描き直しで死んだとき。ui.after が年表を自動で開かないよう印を付け、押されたら開く
    const justDied = prevOver.id === S.id && !prevOver.over && RO === "dead";
    prevOver = { id: S.id, over: RO };
    if (justDied) { dead = { id: S.id, data: u13.deathScene(S), shown: false }; hold = null; S.flags.chronShown = true; }
    if (dead && (dead.id !== S.id || RO !== "dead")) { dead = null; document.body.classList.remove("u13dead", "u13deadFast"); }
    // 終わった戦いを見せている間（F5）は、戦闘の欄をそのまま残す（敵の札の HP が 0 まで減るのを見せる）
    if (dead) { if (reveal) { if (!ghost) { panel.textContent = ""; panel.append(h("p", "fine u13waitmsg", "…")); } } else showDead(S); return; }
    // 結果の場面（順に出し終えてから見せる）
    if (hold) { if (reveal) { if (!ghost) { panel.textContent = ""; panel.append(h("p", "fine u13waitmsg", "…")); } } else showHold(); }
  }

  const base = ui.render;
  ui.render = (...a) => {
    if (reveal && !rendering) reveal.r.finish(); // 出している途中で描き直すときは、先に全部出す（外側の包みがあれば、そちらで済ませている）
    const r = base(...a);
    try { if (G.S) post(G.S); } catch (e) { /* 見せ方に失敗しても、画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
