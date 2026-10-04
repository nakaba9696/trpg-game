// Q7：手動のセーブ枠とロード。自動の枠（G.SAVE_KEYS.save）とは別に、決まった数の枠へ冒険を写して残す。
// storage は localStorage と同じ形（getItem・setItem・removeItem）。DOM には触らない。画面は src/ui/q7_slots.js。レーン C＋U
// - 枠に入れるのは冒険（G.S）だけ。プロフィール（トロフィー・図鑑・墓碑・地図の記録）は枠と別で、ロードしても減らない
// - 戦闘中・出来事の選択の途中・冒険が終わったあとは保存できない（G.canSave が理由を返す）
// - 自動の枠は、倒れた冒険で上書きされる前の「倒れる前」の写しも残す（G.keepLastBreath）。手動の枠は死んでも消さない
(function (G) {
  const D = G.data;
  G.SLOT_COUNT = 5;
  G.slotKey = (i) => "morsveld-slot-" + i;
  G.LAST_BREATH_KEY = "morsveld-save-last"; // 自動の枠の、倒れる前の写し
  G.TOWN_SAVE_KEY = "morsveld-save-town"; // オートセーブ（町に着いたとき）。手動では上書きできない

  // 冒険として読める形か（main.js が自動の枠を読むときと同じ見かた）
  G.validSave = (sv) => !!(sv && typeof sv === "object" && sv.v === 1 && sv.stats && Array.isArray(sv.log) && sv.profile && D.LOCS[sv.loc]);

  // 今、保存できるか。{ ok, why }
  G.canSave = (S) => {
    S = S === undefined ? G.S : S;
    if (!S || !S.profile) return { ok: false, why: "冒険が始まっていない。" };
    if (S.over) return { ok: false, why: "この冒険は終わった。" };
    if (S.mode === "combat" || S.combat) return { ok: false, why: "戦闘中は保存できない。" };
    if (S.mode === "event" || S.event) return { ok: false, why: "出来事の選択の途中は保存できない。" };
    return { ok: true, why: "" };
  };

  // 枠の一覧に出す見出し（名前・職業・日付・場所・保存した時刻）
  G.slotMeta = (S, at) => {
    const loc = D.LOCS[S.loc];
    return {
      name: (S.profile && S.profile.name) || "名無し", cls: S.clsName || "", run: S.id || "",
      date: G.dateOf ? G.dateOf(S.day || 1) : `${S.day || 1}日目`,
      loc: (loc && loc.name) || "", depth: S.depth || 0, turn: S.turn || 0, over: S.over || "",
      at: at || S.savedAt || 0,
    };
  };

  const parse = (raw) => { try { return JSON.parse(raw); } catch { return undefined; } };
  const read = (storage, key) => { try { return storage ? storage.getItem(key) : null; } catch { return null; } };
  const full = (e) => e && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014 || /quota|full|exceed/i.test(String(e.message || e)));

  // 枠へ書く。{ ok, why }。localStorage が使えない・満杯でも投げない
  G.writeSlot = (storage, i, S) => {
    S = S || G.S;
    const can = G.canSave(S);
    if (!can.ok) return can;
    if (!(i >= 1 && i <= G.SLOT_COUNT)) return { ok: false, why: "その枠は無い。" };
    if (!storage) return { ok: false, why: "このブラウザでは保存できない（保存の場所が使えない）。" };
    const at = Date.now();
    let body;
    try { body = JSON.stringify({ v: 1, meta: G.slotMeta(S, at), S: { ...S, savedAt: at } }); } catch { return { ok: false, why: "冒険を書き出せなかった。" }; }
    try { storage.setItem(G.slotKey(i), body); } catch (e) {
      return { ok: false, why: full(e) ? "保存の場所がいっぱいで書けなかった。ほかの枠を消すか、上書きしてほしい。" : "このブラウザでは保存できない（保存の場所が使えない）。" };
    }
    return { ok: true, why: "", at };
  };

  // 枠を消す
  G.clearSlot = (storage, i) => { try { storage.removeItem(G.slotKey(i)); return true; } catch { return false; } };

  // 枠を読む。null：空き／{ broken: true }：読めない／{ meta, S }
  G.readSlot = (storage, i) => readBox(storage, G.slotKey(i));
  // 枠の形（{ v, meta, S }）の鍵を読む。手動の枠とオートセーブの枠
  const readBox = (storage, key) => {
    const raw = read(storage, key);
    if (raw === null || raw === undefined) return null;
    const j = parse(raw);
    if (!j || !G.validSave(j.S)) return { broken: true };
    let meta;
    try { meta = { ...G.slotMeta(j.S), ...(j.meta && typeof j.meta === "object" ? j.meta : {}) }; } catch { return { broken: true }; }
    return { meta, S: j.S };
  };

  // 自動の枠（今の「つづきから」）と、倒れる前の写し
  const readAuto = (storage, key) => {
    const raw = read(storage, key);
    if (raw === null || raw === undefined) return null;
    const S = parse(raw);
    if (!G.validSave(S)) return { broken: true };
    try { return { meta: G.slotMeta(S), S }; } catch { return { broken: true }; }
  };

  // ロードの一覧：オートセーブ（町に着いたとき）→ 中断（最後の行動）→ 中断（倒れる前）→ 手動の枠 1〜N。
  // { id, kind: "town"|"auto"|"last"|"slot", i?, empty, broken, meta }（S は載せない。読むのは G.loadEntry）。オートセーブの枠は空でも並べる
  G.listSlots = (storage) => {
    const out = [];
    const put = (id, kind, i, r) => out.push({ id, kind, i, empty: !r, broken: !!(r && r.broken), meta: r && !r.broken ? r.meta : null });
    put("town", "town", 0, readBox(storage, G.TOWN_SAVE_KEY));
    const auto = readAuto(storage, G.SAVE_KEYS.save);
    if (auto) put("auto", "auto", 0, auto);
    const last = readAuto(storage, G.LAST_BREATH_KEY);
    if (last) put("last", "last", 0, last);
    for (let i = 1; i <= G.SLOT_COUNT; i++) put("slot" + i, "slot", i, G.readSlot(storage, i));
    return out;
  };

  // 一覧の 1 つを読んで、遊べる冒険（写し）を返す。読めない・終わった冒険なら null
  G.loadEntry = (storage, id) => {
    let r = null;
    if (id === "town") r = readBox(storage, G.TOWN_SAVE_KEY);
    else if (id === "auto") r = readAuto(storage, G.SAVE_KEYS.save);
    else if (id === "last") r = readAuto(storage, G.LAST_BREATH_KEY);
    else { const m = /^slot(\d+)$/.exec(String(id)); if (m) r = G.readSlot(storage, +m[1]); }
    if (!r || r.broken || !r.S || r.S.over) return null;
    let S;
    try { S = JSON.parse(JSON.stringify(r.S)); } catch { return null; }
    if (G.fixOldNames) { try { G.fixOldNames(S); } catch {} } // D5：古いセーブの国の名前
    return S;
  };

  // 冒険を今の冒険にする（プロフィールには触らない）
  G.adoptLoaded = (S) => {
    if (!G.validSave(S)) return false;
    G.S = S;
    return true;
  };

  // キーの近道（S＝セーブ、L＝ロード。同じキーで閉じる）。typing＝文字を打っている所、openDlg＝開いている窓の id、playing＝冒険の画面か
  // 返すもの："save" | "load" | "close" | null（DOM なしでも呼べる。画面は ui/q7_slots.js）
  G.slotKeyAction = (ev, typing, openDlg, playing, mode) => {
    if (!ev || ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing || typing) return null;
    const k = String(ev.key || "").toLowerCase();
    const want = k === "s" ? "save" : k === "l" ? "load" : null;
    if (!want) return null;
    if (openDlg) return openDlg === "dlgSlots" && mode === want ? "close" : null;
    return playing ? want : null;
  };

  // ---------------------------------------------------------------- オートセーブ（町に着いたとき）
  // 自動で保存するたび（G.main.save）に呼ぶ。前に見た場所（S.q7seen）と違う町にいれば「着いた」として印（S.q7tp）を付け、
  // 保存できる場面（戦闘・出来事の途中でない）になったら、オートセーブの枠へ書く。冒険の始め（はじめの町）も着いたうちに数える。
  // 倒れた冒険・終えた冒険は書かない（枠は消さないので、ロードでやり直せる）。書いたら true
  const isTown = (loc) => !!(D.LOCS[loc] && D.LOCS[loc].type === "town");
  G.townAutoSave = (storage, S) => {
    S = S === undefined ? G.S : S;
    if (!S || !S.profile || S.over) return false;
    if (S.q7seen !== S.loc) { S.q7seen = S.loc; if (isTown(S.loc)) S.q7tp = S.loc; }
    if (!S.q7tp) return false;
    if (S.q7tp !== S.loc) { delete S.q7tp; return false; } // 保存できる場面になる前に町を出た
    if (!G.canSave(S).ok || !storage) return false;
    delete S.q7tp;
    const at = Date.now();
    let body;
    try { body = JSON.stringify({ v: 1, meta: Object.assign(G.slotMeta(S, at), { town: 1 }), S: { ...S, savedAt: at } }); } catch { return false; }
    try { storage.setItem(G.TOWN_SAVE_KEY, body); } catch { return false; }
    return true;
  };

  // 自動の枠へ書く直前に呼ぶ。倒れた冒険を書こうとしていて、自動の枠にまだ同じ冒険の生きている姿があれば、それを「倒れる前」として残す
  G.keepLastBreath = (storage, S) => {
    if (!storage || !S || S.over !== "dead") return false;
    const raw = read(storage, G.SAVE_KEYS.save);
    if (!raw) return false;
    const prev = parse(raw);
    if (!G.validSave(prev) || prev.over || prev.id !== S.id) return false;
    try { storage.setItem(G.LAST_BREATH_KEY, raw); return true; } catch { return false; }
  };
})(globalThis.G = globalThis.G || {});
