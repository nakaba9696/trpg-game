// B5：仲間の HP。一行で戦う（持ち主：「仲間の体力見れないけど、どこでわかるの？」→「B で」）。DOM には触らない。レーン B（戦闘）
// （名前の頭の zzzzzzz は、G.act・G.actions・G.exploreAct を包むほかのファイルより後に読ませるため）
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.b5Party が足りない所を埋める）
//   仲間ひとりずつ（S.companions[i]）：hp 今の HP（無ければ最大で満タン）, b5wins 生き残って勝った戦いの数（最大 HP が伸びる）
//   S.b5pick { ref, mode } 回復の道具・術を「誰に使うか」選んでいる途中（選ぶ間は手番が進まない）
//
// 決まり
// - 最大 HP：10 + 腕前÷3 を、前に立つ者（剣・槍・兵など）1.25 倍・術師や年寄り 0.8 倍、ほか 1 倍。勝ち残るたびに少しずつ伸びる（3 勝で +1、+10 まで）。
//   腕前が上がれば（打ち明け話）伸び、深手で腕前が落ちれば縮む。
// - 敵の狙い：主人公 3・前に立つ者 3・ほか 2・術師 1.2 の重みで、立っている者から選ぶ（combat.js の foesTurn）。
// - HP が 0 の仲間は戦闘不能。その戦闘では動かず、狙われない。深手（wounds）を 1 つ負い（腕前 -3）、深手が 2 つ重なれば死の淵（G.m2Doom → 看取り）。
//   戦闘が終わると HP 1 で起き上がる。仲間がみな倒れても、主人公が立っていれば戦いは続く。
// - 回復：野営（眠る）で 6 割、宿・湯・家・教会の治療で全快し、深手も 1 つ癒える。回復の道具・癒しの奇跡は「仲間に」を選ぶと、誰に使うか選べる。
//   仲間の回復役（c.heal）は、いちばん減っている味方（主人公を含む・戦闘不能を先に）を治す。
(function (G) {
  const D = G.data;
  const B5 = (G.b5 = G.b5 || {});

  // ---------------------------------------------------------------- 体つき
  const FRONT = /剣|槍|騎士|兵|将軍|拳|闘|傭兵|戦士|隊長|坑夫|人足|荷|獣人|斧|鍛冶|ならず者|ゴブリン|若い衆|親分/;
  const FRAIL = /術|魔|学者|婆|爺|書記|絵描き|僧|修道|医|見習い|軍師|発明家|商人|吏|書/;
  B5.kind = (c) => (c.fire || c.heal ? "frail" : FRONT.test(c.cls || "") ? "front" : FRAIL.test(c.cls || "") ? "frail" : "mid");
  B5.KIND = {
    front: { hp: 1.25, def: 2, aim: 3, name: "前に立つ" },
    mid: { hp: 1, def: 1, aim: 2, name: "" },
    frail: { hp: 0.8, def: 0, aim: 1.2, name: "後ろに控える" },
  };
  B5.HERO_AIM = 3;
  const K = (c) => B5.KIND[B5.kind(c)];
  G.b5Max = (c) => Math.max(8, Math.round((10 + Math.floor((c.power || 30) / 3)) * K(c).hp) + Math.min(10, Math.floor((c.b5wins || 0) / 3)));
  G.b5Def = (c) => K(c).def;
  G.b5Dodge = (c) => Math.floor((c.power || 30) / 6);
  // HP の無い仲間（古いセーブ・加わったばかり）は満タンにする。最大が縮んだら今の HP も合わせる
  G.b5Fix = (c) => {
    if (!c) return c;
    const m = G.b5Max(c);
    if (typeof c.hp !== "number" || !Number.isFinite(c.hp)) c.hp = m;
    c.hp = G.clamp(Math.round(c.hp), 0, m);
    return c;
  };
  G.b5Party = (S) => { S = S || G.S; ((S && S.companions) || []).forEach(G.b5Fix); return S; };
  G.b5Down = (c) => !!c && G.b5Fix(c).hp <= 0;
  G.b5Standing = (S) => ((S || G.S).companions || []).filter((c) => !G.b5Down(c));
  // 手当てが要る仲間（減っている・倒れている）
  G.b5Needy = (S) => ((S || G.S).companions || []).filter((c) => G.b5Fix(c).hp < G.b5Max(c));
  const findC = (id) => (G.S.companions || []).find((c) => c.id === id) || null;
  const short = (c) => (G.m2Short ? G.m2Short(c) : c.name);

  // ---------------------------------------------------------------- 回復
  // who: 仲間（オブジェクト）。label を付けると「label：名前 HP +n」と記録に出す
  G.b5Heal = (c, n, label) => {
    if (!c || n <= 0) return 0;
    G.b5Fix(c);
    const m = G.b5Max(c);
    const was = c.hp;
    c.hp = Math.min(m, c.hp + n);
    const got = c.hp - was;
    const wake = was <= 0 && c.hp > 0;
    const full = n > 100 || c.hp >= m;
    if (label !== false) G.note(`${label ? label + "：" : ""}${short(c)} ${full && n > 100 ? "HP が全快した" : "HP +" + got}${wake ? "。起き上がった" : ""}`);
    return got;
  };
  G.b5RestAll = (frac, quiet) => {
    const S = G.S;
    let any = false;
    (S.companions || []).forEach((c) => {
      G.b5Fix(c);
      const m = G.b5Max(c);
      if (c.hp >= m) return;
      c.hp = frac >= 1 ? m : Math.min(m, Math.max(1, c.hp) + Math.ceil(m * frac));
      any = true;
    });
    if (any && !quiet) G.note(frac >= 1 ? "仲間の HP が全快した。" : "仲間の HP が回復した。");
  };
  // 宿・湯・家・教会：全快し、深手も 1 つ癒える
  function restFull() {
    const S = G.S;
    G.b5RestAll(1);
    (S.companions || []).forEach((c) => {
      if (!(c.wounds > 0) || (S.m2 && S.m2.doom && S.m2.doom.id === c.id)) return;
      c.wounds--;
      G.note(`${short(c)}の深手が、ひとつ癒えた。`);
    });
  }

  // いちばん減っている味方（主人公 "you" か仲間）。戦闘不能の仲間を先に。割合 ratio も返す
  G.b5Neediest = () => {
    const S = G.S;
    let best = { who: "you", ratio: S.hp / Math.max(1, S.maxHp) };
    (S.companions || []).forEach((c) => {
      G.b5Fix(c);
      const r = c.hp <= 0 ? -1 : c.hp / G.b5Max(c);
      if (r < best.ratio) best = { who: c, ratio: r };
    });
    return best;
  };

  // ---------------------------------------------------------------- 戦闘不能
  // combat.js の foesTurn から呼ぶ。深手を 1 つ足し、重なれば死の淵
  G.b5Fall = (c, f) => {
    const S = G.S;
    c.hp = 0;
    G.log("nar", `${c.name}が倒れた！（戦闘不能）`, { fx: "allydown", who: c.name });
    c.wounds = (c.wounds || 0) + 1;
    c.power = Math.max(20, (c.power || 30) - 3);
    G.b5Fix(c);
    const m = S.m2;
    if (m && m.fight) (m.fight.fell = m.fight.fell || []).push(c.id);
    if (c.wounds >= 2 && G.m2Doom) G.m2Doom(c, `${(f && f.name) || "敵"}との戦いで倒れ、古傷が開いた`);
    else G.note(`${short(c)}は深手を負った。（重なると命にかかわる）`);
  };
  // 戦闘の終わり（combat.js の endCombat から呼ぶ）：倒れた仲間は HP 1 で起き上がる。勝てば立っていた者が少し強くなる
  G.b5AfterCombat = (how) => {
    const S = G.S;
    (S.companions || []).forEach((c) => {
      G.b5Fix(c);
      if (c.hp <= 0) { c.hp = 1; G.note(`${short(c)}が、よろよろと起き上がった。`); }
      else if (how === "win") c.b5wins = (c.b5wins || 0) + 1;
    });
  };

  // ---------------------------------------------------------------- 誰に使うか選ぶ
  const healItems = (S) => Object.keys(S.inv).filter((id) => { const it = D.ITEMS[id]; return it && it.type === "use" && it.hp; });
  const refName = (ref) => (ref === "heal" || ref === "spell" ? "癒しの奇跡" : (G.itemInfo(ref.split(":").pop()) || {}).name || "それ");
  const hpSub = (c) => `${G.b5Fix(c).hp <= 0 ? "戦闘不能・" : ""}HP ${c.hp}/${G.b5Max(c)}`;

  function pickGroup(S) {
    const P = S.b5pick;
    const ref = P.ref; // 戦闘："item:herb" / "heal"、戦闘の外："use:herb" / "spell"
    const comb = S.mode === "combat";
    const idOf = (c) => (comb ? (ref === "heal" ? "cb:heal:" : "cb:" + ref + ":") : ref === "spell" ? "b5use:@heal:" : "b5use:" + ref.slice(4) + ":") + c.id;
    const list = (S.companions || []).map((c) => ({ id: idOf(c), label: `${short(c)}に使う`, sub: hpSub(c), disabled: G.b5Fix(c).hp >= G.b5Max(c), kw: [short(c)] }));
    list.push({ id: "b5:cancel", label: "やめる", sub: "選び直す（手番は進まない）", kw: ["やめ", "戻"] });
    return [{ title: `${refName(ref)}を誰に使う？`, list }];
  }
  function pickValid(S) {
    const P = S.b5pick;
    if (!P || P.mode !== S.mode || !G.b5Needy(S).length) return false;
    if (P.ref === "heal" || P.ref === "spell") return S.mp >= 3;
    return !!S.inv[P.ref.split(":").pop()];
  }

  const actions0 = G.actions;
  G.actions = () => {
    const S = G.S;
    if (!S || S.over) return actions0();
    G.b5Party(S);
    if (S.b5pick) { if (pickValid(S)) return pickGroup(S); S.b5pick = null; }
    const groups = actions0();
    const needy = G.b5Needy(S).length > 0;
    if (!needy || !(S.companions || []).length) return groups;
    if (S.mode === "combat") {
      const magic = groups.find((g) => g.title === "魔法");
      const hi = magic ? magic.list.findIndex((a) => a.id === "cb:heal") : -1;
      if (hi >= 0) magic.list.splice(hi + 1, 0, { id: "b5:pick:heal", label: "癒しの奇跡を仲間に", sub: `魔力 ${G.cb.heal()}%・MP3・誰に使うか選ぶ`, disabled: S.mp < 3, kw: ["仲間", "癒", "治"] });
      const tools = groups.find((g) => g.title === "道具");
      if (tools) {
        healItems(S).forEach((id) => {
          const i = tools.list.findIndex((a) => a.id === "cb:item:" + id);
          if (i >= 0) tools.list.splice(i + 1, 0, { id: "b5:pick:item:" + id, label: `${D.ITEMS[id].name}を仲間に`, sub: "誰に使うか選ぶ", kw: [D.ITEMS[id].name, "仲間"] });
        });
      }
    } else if ((S.mode === "explore" || S.mode === "fac") && !S.travel) {
      const list = healItems(S).map((id) => ({ id: "b5:pick:use:" + id, label: `${D.ITEMS[id].name}を仲間に`, sub: `${S.inv[id]}個・誰に使うか選ぶ`, kw: [D.ITEMS[id].name, "手当", "仲間"] }));
      list.push({ id: "b5:pick:spell", label: "癒しの奇跡を仲間に", sub: `魔力 ${G.cb.heal()}%・MP3・誰に使うか選ぶ`, disabled: S.mp < 3, kw: ["癒", "奇跡", "手当", "仲間"] });
      groups.push({ title: "仲間の手当て", list });
    }
    return groups;
  };

  const act0 = G.act;
  G.act = (id) => {
    const S = G.S;
    if (S && !S.over && typeof id === "string" && id.startsWith("b5:")) {
      const a = G.actions().flatMap((g) => g.list).find((x) => x.id === id);
      if (!a || a.disabled) return;
      S.b5pick = id === "b5:cancel" ? null : { ref: id.slice("b5:pick:".length), mode: S.mode };
      if (S.b5pick) G.log("sys", `${refName(S.b5pick.ref)}を誰に使う？`);
      return;
    }
    const r = act0(id);
    if (G.S) G.S.b5pick = null;
    return r;
  };

  // 戦闘の外で仲間に使う（道具・癒しの奇跡）
  G.b5UseOn = (ref, cid) => {
    const S = G.S;
    const c = findC(cid);
    if (!S || S.over || S.mode === "combat" || !c) return false;
    if (ref === "@heal") {
      if (S.mp < 3) return false;
      S.mp -= 3;
      G.log("you", `${short(c)}に癒しの奇跡を祈る`);
      const r = G.check("魔力", "易しい", "癒しの奇跡", G.gearBonus("heal") + G.magicBonus());
      if (r.ok) G.b5Heal(c, G.dice([2, 6, 2]) + Math.floor(G.s5Pow(S.stats.魔力) / 10));
      else G.say("祈りは届かなかった。");
      return true;
    }
    const it = D.ITEMS[ref];
    if (!it || it.type !== "use" || !it.hp || !G.take(ref)) return false;
    G.log("you", `${short(c)}に${it.name}を使う`);
    G.b5Heal(c, it.hp);
    return true;
  };

  // ---------------------------------------------------------------- 休む・宿・治療
  const sleep0 = G.sleep;
  G.sleep = () => { sleep0(); if (G.S && G.S.companions) G.b5RestAll(0.6, true); };

  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "b5use") { const [ref, cid] = String(arg).split(":"); G.b5UseOn(ref, cid); return; }
    const r = exploreAct0(head, arg, a);
    if (!S || S.over || !(S.companions || []).length) return r;
    const full = (head === "inn" && arg === "rest") || (head === "church" && arg === "heal") || (head === "bath" && (arg === "soak" || arg === "long")) || head === "m10home";
    if (full && S.hp === S.maxHp) restFull();
    return r;
  };

  const apply0 = G.apply;
  G.apply = (o) => {
    const r = apply0(o);
    if (G.S && G.S.companions) G.b5Party(G.S); // 深手・打ち明け話で腕前が変わると最大 HP も変わる
    if (o && o.heal === "full" && G.S && !G.S.over) G.b5RestAll(1, true);
    return r;
  };

  // 仲間が加わったら満タンで
  const add0 = G.addCompanion;
  G.addCompanion = (c) => { const r = add0(c); if (G.S) G.b5Party(G.S); return r; };
  const start0 = G.startCombat;
  G.startCombat = (ids, opt) => { if (G.S) { G.b5Party(G.S); G.S.b5pick = null; } return start0(ids, opt); };
})(globalThis.G = globalThis.G || {});
