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

## 2026-10-13 の目視（418 枚中 226 枚に疑い）のあと、作り直しても直らなかったので作らない表情（IMG-38）
守る所（前髪・ひげ・傷・化粧・眼鏡・仮面・手や物）を基本の画素に戻して 2 回作り直し、どちらの版も崩れが残ったもの。ゲームでは近い表情か基本の絵に落ちる。

| 絵 | 残った崩れ |
|---|---|
| annelise_shy・annelise_surprise | 額に髪の落書きのような筋 |
| azlag_joy・azlag_sorrow | 光る黄色の目が淡い茶色になる |
| barnabe_panic | 片目が白目をむく |
| barnabe_shy | 頬に × の印が出る |
| bartolo_sorrow | 口の両端に牙だけが浮く |
| constance_sorrow | 頬の細い傷が × の縫い傷になる |
| doctor_anger | 片眼鏡なのに右目にもレンズの縁としわ |
| dorothea_joy | 白目をむいた半目 |
| gerhard_sparkle | 瞳が十字の照準のような形 |
| leopold_sorrow | 片目だけ緑になる |
| lisette_wicked | 目が赤く光り、目の下に濃い影 |
| lumia_pout | 基本の絵で手が口元にある（作らない） |
| shione_panic | 口のまわりが白くにじむ |
| yurina_anger | 怒りにならず笑った顔のまま（糸目で笑う人物） |
| zerina_joy | 白目をむく |
| zork_wicked | 眼帯の形と色が変わる |

## 2026-10-14 試しの 10 人と、取りこぼした 48 枚の作り直しのあと（量より質・IMG-40）
基本の絵と見分けがつかない、または守る所が動いたので作らない：aubin の joy・sleepy・sorrow（基本とほぼ同じ）／chezar の sorrow・wicked（ほぼ同じ）／constance の anger・joy・serious・tired（無表情の人物で差が出ず、tired は頬に × の傷が出た）／gensai の wicked・greiol の serious（ほぼ同じ）／malvina の joy（ほぼ同じ）・sorrow（布の上の縁に線）。
