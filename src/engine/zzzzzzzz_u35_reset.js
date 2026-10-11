// U35：データのリセット。ブラウザ（localStorage と同じ形の storage）と claude.ai のデータに残るものを消す。DOM には触らない。画面は src/ui/zzzzzzzz_u35_reset.js。レーン U
// - "saves"：セーブだけ（つづきの冒険・倒れる前の写し・オートセーブ・手動の枠）。プロフィール（トロフィー・墓碑・図鑑・周回の知識）と設定は残す
// - "all"：morsveld- で始まる鍵（古い kotodama3- も）を全部。設定も含め、初めて遊ぶ状態に戻る
(function (G) {
  const PREFIXES = ["morsveld-", "kotodama3-"];
  // 画面に見せる一覧（何が消えて何が残るか）
  G.RESET_SCOPES = {
    saves: {
      label: "セーブだけ消す",
      erase: ["今の冒険（つづきから）", "倒れる前の写し", "オートセーブ", "手動のセーブの枠（全部）"],
      keep: ["トロフィー・墓碑・図鑑・周回の知識", "明るさ・音などの設定"],
    },
    all: {
      label: "全部消して、初めて遊ぶ状態に戻す",
      erase: ["今の冒険（つづきから）", "倒れる前の写し", "オートセーブ", "手動のセーブの枠（全部）", "トロフィー・墓碑・図鑑・周回の知識", "明るさ・音などの設定"],
      keep: [],
    },
  };
  const saveKeys = () => {
    const ks = [G.SAVE_KEYS.save, G.LAST_BREATH_KEY, G.TOWN_SAVE_KEY];
    for (let i = 1; i <= (G.SLOT_COUNT || 5); i++) ks.push(G.slotKey(i));
    return ks.filter(Boolean);
  };
  const remoteNames = (scope) => {
    const ns = ["save", "town"];
    for (let i = 1; i <= (G.SLOT_COUNT || 5); i++) ns.push("slot" + i);
    if (scope === "all") ns.push("profile");
    return ns;
  };
  const listKeys = (storage) => {
    const out = [];
    try { for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k !== null) out.push(k); } } catch {}
    return out;
  };
  // 消す鍵の一覧（storage に今あるものだけ）
  G.resetKeys = (storage, scope) => {
    if (!storage) return [];
    const have = (k) => { try { return storage.getItem(k) !== null; } catch { return false; } };
    if (scope === "saves") return saveKeys().filter(have);
    const set = new Set(saveKeys().filter(have));
    listKeys(storage).forEach((k) => { if (PREFIXES.some((p) => k.startsWith(p))) set.add(k); });
    if (!listKeys(storage).length) [G.SAVE_KEYS.profile].forEach((k) => { if (have(k)) set.add(k); });
    return [...set];
  };
  // 消す。remote(name, null) があれば claude.ai のデータからも消す。{ ok, removed }。G.S は空に、"all" なら G.P も初期に戻す
  G.resetData = (storage, scope, remote) => {
    if (scope !== "saves" && scope !== "all") return { ok: false, removed: [] };
    const removed = [];
    let ok = true;
    G.resetKeys(storage, scope).forEach((k) => { try { storage.removeItem(k); removed.push(k); } catch { ok = false; } });
    if (typeof remote === "function") remoteNames(scope).forEach((n) => { try { remote(n, null); } catch {} });
    G.S = null;
    if (scope === "all") G.P = { trophies: {}, graves: [] };
    return { ok, removed };
  };
})(globalThis.G = globalThis.G || {});
