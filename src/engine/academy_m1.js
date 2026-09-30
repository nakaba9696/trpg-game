// M1：ゼファラの学院（施設 academy）と、魔導書を読み解く行動。
// explore.js は書き換えず、G.exploreActions・G.exploreAct・G.facActions・G.facAct を包む。レーン B＋C（M1）が管理
(function (G) {
  const D = G.data;

  G.FAC_NAMES.academy = "学院";
  const KW = ["学院", "講義", "学", "習"];

  // ---------------------------------------------------------------- 町の施設の一覧と、魔導書
  const baseExploreActions = G.exploreActions;
  G.exploreActions = () => {
    const S = G.S;
    const groups = baseExploreActions();
    groups.forEach((g) => g.list.forEach((a) => { if (a.id === "fac:academy") a.kw = KW; }));
    const tomes = Object.keys(S.inv).filter((id) => { const it = D.ITEMS[id]; return it && it.type === "tome" && !G.knows(it.teach); });
    if (tomes.length) {
      groups.splice(1, 0, { title: "魔導書", list: tomes.map((id) => ({
        id: "tome:" + id, label: `${D.ITEMS[id].name}を読み解く`, sub: `知力 ${G.tomeChance(id)}%・${D.SPELLS[D.ITEMS[id].teach].name}`, kw: ["読", "魔導書", D.ITEMS[id].name],
      })) });
    }
    return groups;
  };

  const baseExploreAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head === "tome") { G.readTome(arg); return; }
    if (head === "fac" && arg === "academy") { enter(); return; }
    baseExploreAct(head, arg, a);
  };

  // ---------------------------------------------------------------- 学院の中
  function enter() {
    const S = G.S;
    S.mode = "fac";
    S.fac = "academy";
    G.log("you", "学院に入る");
    G.say("水晶塔のふもとの学院。講堂の扉の上に「才にあらず、縁による」と彫ってある。");
    if (S.cls === "mage") G.say("門番があなたの顔を見て、眉をひそめた。追放者の名簿は、まだ門の脇に貼ってある。……聴講料さえ払えば、誰でも入れる決まりだ。");
  }

  G.lectureChance = (id) => G.chance("知力", D.SPELLS[id].school.diff);

  const baseFacActions = G.facActions;
  G.facActions = () => {
    const S = G.S;
    if (S.fac !== "academy") return baseFacActions();
    const list = Object.entries(D.SPELLS).filter(([, sp]) => sp.school).map(([id, sp]) => {
      const c = sp.school;
      return G.knows(id)
        ? { id: "academy:" + id, label: `${sp.name}の講義`, sub: "もう覚えている", disabled: true, kw: sp.kw }
        : { id: "academy:" + id, label: `${sp.name}の講義を受ける`, sub: `${c.gold}G・${c.days}日・知力 ${G.lectureChance(id)}%・${sp.hint}`, disabled: S.gold < c.gold, kw: [...sp.kw, "講義"] };
    });
    return [
      { title: "学院（講義で術を覚える）", list },
      { title: "", list: [{ id: "back", label: "学院を出る", sub: "", kw: ["出る", "戻", "外"] }] },
    ];
  };

  const baseFacAct = G.facAct;
  G.facAct = (head, arg, a) => {
    if (head !== "academy") { baseFacAct(head, arg, a); return; }
    const S = G.S;
    const sp = D.SPELLS[arg];
    if (!sp || !sp.school || G.knows(arg) || S.gold < sp.school.gold) return;
    S.gold -= sp.school.gold;
    G.log("you", `${sp.name}の講義を受ける`);
    G.note(`所持金 -${sp.school.gold}G`);
    G.passDays(sp.school.days);
    G.say(G.pick(D.ACADEMY_LINES));
    const r = G.check("知力", sp.school.diff, `${sp.name}の講義`);
    if (r.ok) G.learnSpell(arg);
    else G.say("理屈は分かった。だが、手のひらの上には何も起きない。向こうが、まだあなたを知らないのだ。");
  };
})(globalThis.G = globalThis.G || {});
