// アイテム。type: weapon / armor / use（消耗品）/ gear（持っているだけで効く）/ loot（売り物）/ key（大事な物）
// weapon: dmg [個数, 面, 加算], stat = 命中に使う能力値, hit = 命中補正, pierce = 使徒の絶界を破る
// armor: def = 受けるダメージを減らす, agi = 敏捷の補正
// use: hp / mp の回復、escape = 戦闘から必ず逃げる、holy = 不死の敵に 3D6 の聖なるダメージ
// gear: bonus = { 行動の種類: 成功率の補正 }（fire / heal / steal / trap / talk）
// レーン I（アイテム）が管理
(function (G) {
  const D = (G.data = G.data || {});

  D.ITEMS = {
    // 武器
    fists: { name: "素手", type: "weapon", dmg: [1, 3, 0], stat: "筋力", hit: 0, price: 0 },
    dagger: { name: "短剣", type: "weapon", dmg: [1, 4, 1], stat: "敏捷", hit: 5, vital: 10, price: 20, desc: "急所を狙いやすい。" },
    longsword: { name: "鉄の長剣", type: "weapon", dmg: [1, 6, 2], stat: "筋力", hit: 0, price: 50 },
    mace: { name: "錫杖", type: "weapon", dmg: [1, 6, 1], stat: "筋力", hit: 0, magic: 5, price: 40, desc: "神官の杖。癒しの奇跡がわずかに通りやすい。" },
    axe: { name: "大斧", type: "weapon", dmg: [1, 10, 3], stat: "筋力", hit: -10, price: 90, desc: "重いが当たれば骨まで砕く。" },
    katana: { name: "打刀", type: "weapon", dmg: [1, 6, 3], stat: "筋力", hit: 5, price: 140, desc: "シェルアーク諸島の島の片刃の刀。潮に強く、よく斬れる。" },
    staff: { name: "樫の杖", type: "weapon", dmg: [1, 4, 0], stat: "筋力", hit: -5, magic: 10, price: 15, desc: "魔法の成功率が上がる。" },
    rapier: { name: "細剣", type: "weapon", dmg: [1, 6, 1], stat: "敏捷", hit: 10, vital: 5, price: 110, desc: "素早い突き。敏捷で戦う。" },
    mithril: { name: "ミスリルの剣", type: "weapon", dmg: [1, 8, 5], stat: "筋力", hit: 10, price: 700, desc: "軽く、鋼より硬い。" },
    oniclub: { name: "鬼の金棒", type: "weapon", dmg: [2, 8, 2], stat: "筋力", hit: -15, price: 400, desc: "鬼が振るっていた鉄の棒。" },
    volgrim: { name: "魔剣ヴォルグリム", type: "weapon", dmg: [2, 6, 6], stat: "筋力", hit: 10, pierce: true, key: true, price: 0, desc: "意思を持つ呪われた魔剣。口が悪い。使徒の絶界を斬り裂く。" },
    byakuya: { name: "聖刀白夜", type: "weapon", dmg: [2, 6, 5], stat: "筋力", hit: 15, pierce: true, key: true, price: 0, desc: "白く光る刀。使徒の絶界を斬り裂く。" },

    // 防具
    leather: { name: "革の鎧", type: "armor", def: 1, agi: 0, price: 30 },
    domaru: { name: "胴丸", type: "armor", def: 2, agi: 0, price: 100 },
    chain: { name: "鎖帷子", type: "armor", def: 2, agi: -5, price: 120 },
    plate: { name: "板金鎧", type: "armor", def: 4, agi: -15, price: 500, desc: "重いが並の刃は通さない。" },
    robe: { name: "魔導衣", type: "armor", def: 1, agi: 0, magic: 10, price: 250, desc: "魔法の成功率が上がる。" },
    dragonmail: { name: "竜鱗の鎧", type: "armor", def: 5, agi: -5, price: 1500, desc: "竜の鱗を綴った鎧。" },

    // 消耗品
    jerky: { name: "干し肉", type: "use", hp: 4, price: 3 },
    riceball: { name: "握り飯", type: "use", hp: 5, price: 3 },
    ale: { name: "安酒", type: "use", hp: 2, price: 3, desc: "気休め。" },
    herb: { name: "薬草", type: "use", hp: 8, price: 8 },
    potion: { name: "回復薬", type: "use", hp: 20, price: 30 },
    manawater: { name: "魔力の水", type: "use", mp: 6, price: 25 },
    elixir: { name: "霊薬", type: "use", hp: 999, mp: 999, price: 300, desc: "傷も魔力も完全に戻る。" },
    smoke: { name: "煙玉", type: "use", escape: true, price: 15, desc: "戦闘から必ず逃げられる（強敵には効かない）。" },
    holywater: { name: "聖水", type: "use", holy: true, price: 40, desc: "不死の敵に大きな傷を与える。" },

    // 持っているだけで効く
    grimoire: { name: "魔導書『火炎の章』", type: "gear", bonus: { fire: 10 }, price: 60 },
    holysymbol: { name: "光天の聖印", type: "gear", bonus: { heal: 15 }, price: 60 },
    tools: { name: "盗賊道具", type: "gear", bonus: { steal: 15, trap: 10 }, price: 40 },
    lute: { name: "リュート", type: "gear", bonus: { talk: 10 }, price: 50 },

    // 売り物
    fang: { name: "魔物の牙", type: "loot", price: 12 },
    pelt: { name: "上等な毛皮", type: "loot", price: 25 },
    silk: { name: "大蜘蛛の糸", type: "loot", price: 30 },
    gem: { name: "宝石", type: "loot", price: 150 },
    relic: { name: "古代の遺物", type: "loot", price: 300 },
    onihorn: { name: "鬼の角", type: "loot", price: 120 },
    wyvernscale: { name: "翼竜の鱗", type: "loot", price: 90 },
    apostleheart: { name: "眷属の心臓", type: "loot", price: 800, desc: "まだ脈打っている。" },

    // 大事な物
    package: { name: "ギルドの荷物", type: "key", price: 0, desc: "依頼の届け物。中身は聞かないのが決まり。" },
    royalwrit: { name: "叙任状", type: "key", price: 0, desc: "騎士の身分を示す書状。" },
  };

  // 町の店の品ぞろえ（場所ごとに足す）
  D.SHOP_BASE = ["herb", "potion", "manawater", "smoke", "jerky"];
})(globalThis.G = globalThis.G || {});
