# 作らない表情（人物に合わない表情）

持ち主の言葉（2026-10-13）：「かっこいいキャラや威厳あるキャラがあまりにも変な顔してるとイメージと崩れる。あまりしない表情なら無理して作らなくても大丈夫」。
作らなかった表情は、ゲームでは近い表情（src/data/v11_moods.js の fallback）か、基本の絵に落ちる。

| 人 | 作らない表情 | 落ちる先 | 理由 |
|---|---|---|---|
| farina | fun・panic | fun→基本の絵、panic→troubled→surprise→fear（どれも無いので基本の絵） | 笑わない冷静な完璧主義者 |
| greiol | fun | 基本の絵 | 寡黙で冷徹な皇帝 |
| rionetta | troubled | sorrow | 何度描いても顔の前に手や箱が出た（人物には合う表情なので、直せれば作る） |
| sixth | fun | 基本の絵 | 寡黙で冷たい最強の剣 |

落とし先の表を直す必要は今のところ無い（無ければ基本の絵になり、どちらも落ち着いた顔のため）。

## 控えめに描いた人物
gerhard・hermes・otmar・aurelia・captain・chezar・constance・farina・greol・salphiel・celestin・gensai・gramont・graul・greiol・katia・malvina・raisha・serios・sixth・valeon・yurina・zork。
表情の語の重みを 1.2 にし、目の描き直しの強さを 0.7 に下げ、大げさな顔（大口・崩れた顔・きらきらの目・汗）をネガティブに入れた。
