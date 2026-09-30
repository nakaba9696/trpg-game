// GM（Claude）に任せる自由行動。プレイヤーが選んだときだけ呼ぶ。
// Claude には「判定の能力値と難易度」と「成功/失敗の結果」だけを決めてもらい、ダイスはゲームが振る。
// 結果の数値は小さな範囲に切り詰める（ゲームの釣り合いを崩さないため）。レーン C（コア）が管理
(function (G) {
  const D = G.data;

  G.gmPrompt = (text) => {
    const S = G.S;
    const L = G.loc();
    const foes = S.combat ? G.alive().map((f) => `${f.name}（HP ${f.hp}/${f.max}）`).join("、") : "";
    const recent = S.log.filter((e) => e.k === "nar").slice(-4).map((e) => e.text).join("\n");
    return `あなたは日本語のテーブルトークRPGのゲームマスター。剣と魔法のダークファンタジー「ヴェルド大陸」。強い者が好き勝手をする残酷な世界だが、冒険の楽しさとばかばかしさもある。人の世界は三大国（聖王国リーヴェル・鉄血帝国ガルムント・ゼファラ共和国）と自由都市連合・八雲で、人々は「あれ」と呼ぶ化け物の縄張りを避けて暮らしている。魔法は悪魔のもので、人の術は借り物。魔人は絶界に守られ、魔剣ヴォルグリムか聖刀白夜でしか傷つかない。性的な描写は直接書かない。
【語り方】この世界の普通の人は、魔王・魔人の本当の格も神々の本当の姿も知らず、神さまは良いものだと信じている（祈り・祭り・お守り・口癖）。描写や台詞で世界の設定を説明しない。人物は世界の説明役ではなく、それぞれの暮らしと用事がある。上位の存在は、出来すぎた偶然・見られている気配・拍手のような音・答えの出ない言葉で感じさせるだけにする。「見世物」「観客」「客席」「舞台」「台本」という言葉や、神々が世界を眺めているという説明は、描写にも台詞にも memo にも書かない。

【探索者】${S.profile.name}（${S.clsName}）${S.profile.personality}。目的：${S.goal.text}
【能力値】${D.STATS.map((k) => `${k}${S.stats[k]}`).join(" ")} ／ HP ${S.hp}/${S.maxHp} ／ 所持金 ${S.gold}G ／ 名声 ${S.fame}
【場所】${L.name}（${L.desc}）${S.fac ? `／${G.FAC_NAMES[S.fac]}の中` : ""}${foes ? `\n【戦闘中の敵】${foes}` : ""}
【直前の状況】
${recent}

【プレイヤーの行動】${text}

この行動の結果を決める。結果が不確かなら能力値と難易度を選ぶ（難易度：易しい／普通／難しい／至難）。確実な行動なら check は null。
次の JSON だけを返す：
{"check":{"stat":"筋力|体力|敏捷|知力|魔力|魅力","difficulty":"普通"},"intro":"行動を始める描写（1〜2文）","success":{"text":"成功したときの描写（2〜4文）","hp":0,"gold":0,"fame":0,"item":"","memo":""},"failure":{"text":"失敗したときの描写（2〜4文）","hp":0,"gold":0,"fame":0,"item":"","memo":""}}
- hp は −10〜＋10、gold は −50〜＋100、fame は −5〜＋5 の範囲。item は手に入れた物の名前（なければ ""）。memo は覚えておくべき事実（なければ ""）。
- 戦闘中は、行動が敵を倒したり戦闘を終わらせたりはしない（与える影響は描写と hp・gold の範囲で）。`;
  };

  G.gmApply = (text, res) => {
    const S = G.S;
    if (!res || typeof res !== "object") return false;
    G.log("you", text);
    G.log("gmtag", "GM の裁定");
    if (res.intro) G.say(String(res.intro).slice(0, 300));
    let branch = res.success;
    const c = res.check;
    if (c && D.STATS.includes(c.stat)) {
      const diff = D.DIFF[c.difficulty] !== undefined ? c.difficulty : "普通";
      const r = G.check(c.stat, diff, String(text).slice(0, 16));
      branch = r.ok ? res.success : res.failure;
    }
    if (!branch || typeof branch !== "object") branch = {};
    const o = {
      text: String(branch.text || "").slice(0, 500),
      gold: G.clamp(Math.round(Number(branch.gold) || 0), -50, 100),
      fame: G.clamp(Math.round(Number(branch.fame) || 0), -5, 5),
      hp: G.clamp(Math.round(Number(branch.hp) || 0), -10, 10),
      memo: branch.memo ? String(branch.memo).slice(0, 80) : "",
    };
    const name = branch.item ? String(branch.item).trim().slice(0, 24) : "";
    if (name) {
      const known = Object.keys(D.ITEMS).find((k) => D.ITEMS[k].name === name && !D.ITEMS[k].key);
      o.item = known || "x:" + name;
    }
    S.gmUses = (S.gmUses || 0) + 1;
    G.apply(o);
    G.endTurn();
    return true;
  };
})(globalThis.G = globalThis.G || {});
