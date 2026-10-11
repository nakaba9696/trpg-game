// U35：データのリセット（①セーブだけ消す・②全部消す）
export default ({ G, fail }) => {
  const F = (m) => fail("U35 リセット: " + m);
  const mem = () => { const m = {}; return { m, get length() { return Object.keys(m).length; }, key: (i) => Object.keys(m)[i] ?? null, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };
  const fill = () => {
    const st = mem();
    const saves = [G.SAVE_KEYS.save, G.LAST_BREATH_KEY, G.TOWN_SAVE_KEY, G.slotKey(1), G.slotKey(G.SLOT_COUNT)];
    const keeps = [G.SAVE_KEYS.profile, "morsveld-theme", "morsveld-sound", "morsveld-f2-view", "morsveld-u19-stack"];
    [...saves, ...keeps, "kotodama3-save", "other-app"].forEach((k) => st.setItem(k, "{}"));
    return { st, saves, keeps };
  };
  const remote = () => { const r = []; return { r, fn: (n, d) => r.push([n, d]) }; };

  let { st, saves, keeps } = fill(), rm = remote();
  G.S = { x: 1 }; G.P = { trophies: { a: 1 }, graves: [{ id: 1 }] };
  G.resetData(st, "saves", rm.fn);
  saves.forEach((k) => { if (st.getItem(k) !== null) F("①でセーブが残った：" + k); });
  keeps.forEach((k) => { if (st.getItem(k) === null) F("①でセーブ以外が消えた：" + k); });
  if (G.S !== null) F("①で G.S が残った");
  if (!G.P.trophies.a) F("①でトロフィーが消えた");
  if (rm.r.some(([n]) => n === "profile")) F("①で claude.ai のプロフィールを消そうとした");
  if (!rm.r.some(([n, d]) => n === "save" && d === null)) F("①で claude.ai のセーブを消さない");

  ({ st, saves, keeps } = fill()); rm = remote();
  G.S = { x: 1 }; G.P = { trophies: { a: 1 }, graves: [{ id: 1 }] };
  G.resetData(st, "all", rm.fn);
  [...saves, ...keeps, "kotodama3-save"].forEach((k) => { if (st.getItem(k) !== null) F("②で残った：" + k); });
  if (st.getItem("other-app") === null) F("②でこのゲームのものでない鍵まで消えた");
  if (G.S !== null || Object.keys(G.P.trophies).length || G.P.graves.length) F("②で G.S・G.P が初期に戻らない");
  if (!rm.r.some(([n, d]) => n === "profile" && d === null)) F("②で claude.ai のプロフィールを消さない");
  if (G.resetData(st, "bogus").ok) F("知らない種類を受け付けた");
};
