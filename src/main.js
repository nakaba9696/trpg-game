// 起動と保存。冒険とトロフィーは、このブラウザと claude.ai のデータ（使えるとき）の両方に保存する。
// GM（Claude）は、claude.ai で開いたときだけ使える。レーン U（UI）が管理
(function (G) {
  const $ = (s) => document.querySelector(s);
  const LKEY = G.SAVE_KEYS;
  const lget = (k) => { try { const j = localStorage.getItem(k); return j ? JSON.parse(j) : null; } catch { return null; } };
  const lset = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const store = {
    db: null, uid: null, chains: {},
    write(name, data) {
      lset(LKEY[name], data);
      this.remote(name, data);
    },
    // claude.ai のデータにだけ書く（Q7 の手動の枠は、ブラウザ側を engine/q7_slots.js が書く）
    remote(name, data) {
      if (!this.db || !this.uid) return;
      const ref = this.db.doc(`data/users/${this.uid}/${name}`);
      const body = data ? JSON.parse(JSON.stringify(data)) : null;
      this.chains[name] = (this.chains[name] || Promise.resolve()).then(() => (body ? ref.set(body) : ref.delete())).catch(() => {});
    },
    async read(name) {
      if (!this.db || !this.uid) return null;
      try { const s = await this.db.doc(`data/users/${this.uid}/${name}`).get(); return s.exists ? s.data() : null; } catch { return null; }
    },
  };

  const main = (G.main = { sample: null });
  main.store = store;
  main.save = () => {
    if (G.S) G.S.savedAt = Date.now();
    try { if (G.keepLastBreath) G.keepLastBreath(localStorage, G.S); } catch {} // Q7：倒れる前の自動の枠を残す
    store.write("save", G.S || null);
  };
  main.saveProfile = () => { G.P.updatedAt = Date.now(); store.write("profile", G.P); };

  function showPlay() {
    $("#setup").hidden = true;
    $("#play").hidden = false;
    G.ui.render();
  }
  function showSetup(o) {
    G.ui.setSheetOpen(false);
    G.ui.setLogExpanded(false);
    $("#play").hidden = true;
    $("#setup").hidden = false;
    G.setup.show(o);
    window.scrollTo({ top: 0 });
  }
  const valid = (sv) => !!(sv && sv.v === 1 && sv.stats && sv.log && G.data.LOCS[sv.loc]);
  // タイトル（今の冒険は消さない。「つづきから」で戻れる）
  main.toTitle = () => showSetup({ step: "title" });
  main.resume = () => { if (valid(G.S)) showPlay(); };
  // 今の冒険を捨てて、人物づくりから
  main.toSetup = () => {
    G.S = null;
    main.save();
    showSetup({ step: "person", fresh: true });
  };
  main.start = (opts) => {
    G.newGame(opts);
    G.checkTrophies();
    main.save();
    showPlay();
    window.scrollTo({ top: 0 });
  };

  G.onTrophy = (t) => { G.ui.toast("トロフィー獲得", `『${t.name}』${t.tier}`); main.saveProfile(); };
  G.onFinish = () => main.saveProfile();
  G.onProfile = () => main.saveProfile(); // 冒険の途中で G.P が変わったとき（E3：倒した使徒・挑んだ回数）

  // 新しい冒険は、タイトル画面（と終わった冒険の画面の「新しい冒険を始める」）からだけ始める（持ち主の決定。冒険中の右上のボタンは外した）

  // 読み込んだ冒険を今の冒険にする。冒険の画面を開いていれば描き直す（タイトルや作成の途中なら、そのまま）
  function adopt(sv) {
    G.S = valid(sv) ? sv : null;
    if (G.S && G.fixOldNames) G.fixOldNames(G.S); // D5：古いセーブの国の名前
    if (!$("#play").hidden) { if (G.S) showPlay(); else main.toTitle(); }
  }

  // ---------------------------------------------------------------- 起動
  try { G.migrateSaveKeys(localStorage); } catch {}
  G.P = lget(LKEY.profile) || { trophies: {}, graves: [] };
  G.ui.buildWorld();
  adopt(lget(LKEY.save));
  main.toTitle();

  (async () => {
    const c = window.claude;
    if (!c || !c.use) return;
    const [smp, db, user] = await Promise.all([c.use("sample"), c.use("db"), c.use("user")]);
    main.sample = smp;
    const uid = user ? await user.id().catch(() => null) : null;
    if (!db || !uid) return;
    store.db = db;
    store.uid = uid;
    const [rs, rp] = await Promise.all([store.read("save"), store.read("profile")]);
    if (rp) {
      const merged = { ...rp, ...G.P, trophies: { ...(rp.trophies || {}), ...G.P.trophies }, graves: [...G.P.graves] };
      // E3：倒した使徒と挑んだ回数は、多いほうを残す
      ["slain", "e3tries"].forEach((k) => {
        const m = { ...(rp[k] || {}) };
        Object.entries(G.P[k] || {}).forEach(([id, v]) => { const n = (x) => (typeof x === "number" ? x : (x && x.n) || 0); if (n(v) >= n(m[id])) m[id] = v; });
        merged[k] = m;
      });
      if (G.codexMerge) { merged.codex = G.codexMerge(rp.codex, G.P.codex); merged.loreSeen = G.codexMergeLore(rp.loreSeen, G.P.loreSeen); } // F2：図鑑と知った用語も両方をまとめる
      (rp.graves || []).forEach((g) => { if (!merged.graves.some((x) => x.id === g.id)) merged.graves.push(g); });
      merged.graves.sort((a, b) => b.at - a.at);
      merged.graves = merged.graves.slice(0, 40);
      G.P = merged;
    }
    main.saveProfile();
    const local = G.S;
    if (rs && (!local || (rs.savedAt || 0) > (local.savedAt || 0))) adopt(rs);
    else if (local) main.save();
    if (main.onRemote) await Promise.resolve().then(() => main.onRemote(store)).catch(() => {}); // Q7：手動の枠を claude.ai のデータとそろえる
    if (!$("#setup").hidden) G.setup.show();
  })();
})(globalThis.G = globalThis.G || {});
