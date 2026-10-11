// F4：戦闘の手を見出しにまとめる（F9 で 6 つ：防御を足した）（持ち主「戦闘コマンド 攻撃　戦技　魔法　その他　道具 にまとめて」）。DOM には触らない
//   攻撃 … ふつうの攻撃だけ（F9。急所・割り込み・捨て身・身を削るは外した。強い一撃は戦技で）
//   防御 … 守りを固める（F9。前の身を守る・躱すを一つに）
//   戦技 … 気力を使う技（K1 の cb:k1:…）
//   魔法 … 覚えた術（D.SPELLS の手。術の才が無く一つも無ければ見出しごと出ない）
//   その他 … 逃げる・威圧・賄賂・背を向けて逃げる、作戦と仲間への指示（F3。見出しの下の小見出しとして続く）など、上の 5 つと道具に入らないもの
//   道具 … 持ち物を使う（目つぶしは道具を投げ捨てるのでここ）
// G.combatActions を一番外から包み、組を見出しの順（攻撃・防御・戦技・魔法・その他・道具）に並べ直し、どの組にも cat（attack / guard / tech / magic / misc / item）を付ける。
// 同じ見出しの組が二つ以上あるとき（その他の下の作戦・仲間ごとの指示）は、先頭が見出しの組、あとは小見出しの組。中身の無い見出しは出さない。
// 「〇〇を誰に使う？」（B5 の相手選び）の間は、まとめずにそのまま返す。
// 前の手番の手（S.combat.f4last）を覚え、画面が「前と同じ」を出せるようにする（G.f4.lastAction）。名前の z の数で、ほかの包みより後に読ませる。レーン B＋U（F4）
(function (G) {
  const D = G.data;
  const F4 = (G.f4 = G.f4 || {});
  // F9：見出しは 攻撃・防御・戦技・魔法・その他・道具。攻撃は「〇〇で攻撃」、防御は「防御」の一つずつ（画面では見出しを開かずに選べる）
  F4.ORDER = ["attack", "guard", "tech", "magic", "misc", "item"];
  F4.NAME = { attack: "攻撃", guard: "防御", tech: "戦技", magic: "魔法", misc: "その他", item: "道具" };
  F4.MISC_FIRST = ["cb:flee", "cb:e3flee", "cb:talk", "cb:bribe"];
  const ATTACK = /^cb:(attack|vital|f1cut|f1all|f1blood)$/; // vital などは古い流れの名残（今は出さない）
  const BY_TITLE = [[/^攻撃/, "attack"], [/^防御/, "guard"], [/^戦技/, "tech"], [/^魔法/, "magic"], [/^道具/, "item"]];

  // 一つの手の見出し（id で決め、決まらなければ元の組の見出しで）
  F4.catOf = (id, title) => {
    id = String(id || "");
    if (ATTACK.test(id)) return "attack";
    if (id === "cb:guard" || id === "cb:f1dodge") return "guard";
    if (/^cb:k1:/.test(id)) return "tech";
    if (/^(cb|b5:pick):item:/.test(id) || id === "cb:f1throw") return "item";
    const m = id.match(/^(?:cb|b5:pick):([^:]+)/);
    if (m && D.SPELLS && D.SPELLS[m[1]]) return "magic";
    for (const [re, c] of BY_TITLE) if (re.test(title || "")) return c;
    return "misc";
  };
  const asking = (g) => /誰に使う？$/.test(g.title || "") || (g.list || []).some((a) => a.id === "b5:cancel");

  // 組を 5 つの見出しに並べ直す。groups は G.combatActions の返り値
  F4.arrange = (groups) => {
    if (!groups || groups.some(asking)) return groups;
    const heads = {}; // cat → 見出しの組
    const subs = { attack: [], guard: [], tech: [], magic: [], misc: [], item: [] }; // cat → 小見出しの組（作戦・仲間への指示）
    groups.forEach((g) => {
      if (!g || !g.list || !g.list.length) return;
      // 仲間への指示・作戦（F3）は、その他の下の小見出しとして、組のまま残す
      if (g.list.every((a) => /^f3:/.test(a.id))) { subs.misc.push(Object.assign({}, g, { cat: "misc", sub: true })); return; }
      g.list.forEach((a) => {
        const c = F4.catOf(a.id, g.title);
        const h = heads[c] || (heads[c] = { title: F4.NAME[c], list: [], cat: c });
        // 元の見出しの添え書き（「攻撃（狙い：…）」「戦技（気力 n/m）」）は、見出しに引き継ぐ
        if (c === "attack" && /^攻撃（/.test(g.title || "")) h.title = g.title;
        if (c === "tech" && /^戦技（/.test(g.title || "")) h.title = g.title;
        h.list.push(a);
      });
    });
    // その他の並び：守る・躱す・逃げるを先に（よく使う順）。表に無い手はそのあと、元の順
    if (heads.misc) {
      const rank = (id) => { const i = F4.MISC_FIRST.indexOf(id); return i < 0 ? F4.MISC_FIRST.length : i; };
      heads.misc.list = heads.misc.list.map((a, i) => [a, i]).sort((x, y) => rank(x[0].id) - rank(y[0].id) || x[1] - y[1]).map(([a]) => a);
    }
    const out = [];
    F4.ORDER.forEach((c) => {
      if (heads[c]) out.push(heads[c]);
      subs[c].forEach((g) => out.push(g));
    });
    return out;
  };

  const base = G.combatActions;
  G.combatActions = () => F4.arrange(base());

  // 前の手番の手（画面の「前と同じ」）。f3: の指示・作戦は手番を進めないので数えない
  const baseAct = G.combatAct;
  G.combatAct = (arg) => {
    const c = G.S && G.S.combat;
    const r = baseAct(arg);
    const k = String(arg || "").split(":")[0];
    if (c && G.S && G.S.combat === c && !/^(e4idle|e3miss)$/.test(k)) c.f4last = "cb:" + arg;
    return r;
  };
  // 前と同じ手（今も選べるもの）。無ければ null
  F4.lastAction = (S) => {
    S = S || G.S;
    const id = S && S.combat && S.combat.f4last;
    if (!id) return null;
    const a = G.actions().flatMap((g) => g.list).find((x) => x.id === id);
    return a && !a.disabled ? a : null;
  };
})(globalThis.G = globalThis.G || {});
