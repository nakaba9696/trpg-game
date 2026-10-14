# 絵のセッションへの指示（配り役が書く）

絵のセッション（手元の PC）は、このファイルを定期的に読み、「未着手」の指示を上から順に行う。終えた指示は、下の「済み」に移して push する（このブランチ art-inbox に）。
配り役はクラウドから手元のセッションへ直接は送れない（Remote Control のセッションには本人かそのセッション自身しか予約を作れない決まり）ため、ここで受け渡す。

## 未着手

### 2026-10-14 持ち主の追加の指摘（round2 を見て）：いちばん先に読む
持ち主「目と眉毛が重なってるし、もとから笑顔のキャラは楽しい表情変わってない」。
- **目は 2 つ（前髪で隠れる人は見える数だけ）。顔の崩れは残さない（持ち主「ノラミの怒りと楽しい表情、顔崩壊してるけど。目 3 つあるし」）。** 前髪で片目が隠れる人は、前髪の画素を必ず基本から戻し、隠れた側に目を描かせない（前髪の所はマスクから外す・ネガティブに extra eyes, third eye, multiple eyes を入れる）。点検で目の数を数え、2 つより多い・顔の形が崩れている物は残さない。nora の怒・楽は作り直す（見える側の目と口だけで表す）。
- **強い人物・使徒は格を落とさない（持ち主「mirza は強キャラ臭するのに表情で一気にヘボくなってる」）。** 使徒（mirza・zalve・aurelia・yoihime・mordu・azlag・chezar・yura）と、強者・威厳のある人物は、表情を変えても余裕・威圧・不気味さを残す。怒りの印・歯をむく・涙・大きく口を開ける・赤面・慌てなどの崩した表情は使わない。たとえば mirza（笑みを絶やさない日傘の若君・人を見下す使徒）は、怒＝笑みのまま目だけ冷たく細める／見下ろす、哀＝伏し目がちの憂い（涙なし）、喜＝穏やかに目を細めた微笑、楽＝口の端を上げた愉快そうな笑み、悪い笑み＝今のまま、のように「格を保ったまま何の表情か分かる」形にする。その人がまずしない表情は作らない。
- **眉と目を重ねない。** 眉は目の上に間をあけて描き、まぶた・瞳に眉の線がかからないこと。前髪の上に眉や怒りの印が浮いて乗るのも不可（前髪の下に隠れる眉は描かない）。眉を吊り上げる・八の字にするのは、眉の位置の中で形を変えて表す。点検では目と眉のあいだを拡大して見る。
- **元から笑顔の人（基本の顔が笑っている人：nora・adele・barnabe など）は、喜・楽を基本と同じ顔にしない。** 楽は「にやり・いたずらっぽい」「片目つむり」「舌を出す」など、基本の笑顔と形がはっきり違う表情にする。違いが出せないなら、その表情は作らない（作らない表情に回す）。喜も同じ。
- round2 の 5 人も、この 2 点で作り直す（nora の怒・楽、adele の怒・楽・得意げ、barnabe の楽、mirza の怒など、眉と目が重なる物と、楽が基本と同じ物）。今進めている残り 50 人も、この 2 点を守る。すでに作った分は見直す。


### 2026-10-14 持ち主の返事：round2 の 5 人 OK、残り 50 人へ進む
持ち主「進めていいが、透過やキャラの性格にあった表情になっていることは注意して」。
- round2 の 5 人（nora・otmar・adele・barnabe・mirza）はこのまま使う。adele の喜は作らない表情に回す（基本と差が小さい）。
- 残り 50 人を同じやり方で作る（上の「主要な仲間と使徒を…全員作り直す」の指示のとおり）。
- **透過**：髪の縁・顔の縁に白やマゼンタのふち、半透明のにじみ、穴が無いこと。マゼンタと暗い背景の両方で、顔の四角を拡大して見る。透過の縁は基本の絵のまま戻す。
- **性格に合った表情**：その人の性格（docs/art/portraits.json の memo・tags、src/data の人物の説明）を読み、表情の出し方を合わせる。威厳のある人・冷たい人・寡黙な人は、ひと目で分かる範囲で抑えた顔に（怒りの印や大泣きは使わない）。子どもっぽい人・明るい人は大きく。その人がまずしない表情は作らない（作らない表情に回し、理由を書く）。怒りの印（青筋の記号）は、コミカルな人だけに使う。
- 10 人ごとに区切って push し、「済み」に途中の数を書く。全部終わったら、表情の名前つきの一覧表（基本の顔と並べる）を docs/art/faces_trial/all.webp に置く。


### 2026-10-14 主要な仲間と使徒を、顔だけを大きく作るやり方で全員作り直す（持ち主の決定。これが上の「5 人」の指示を含み、置き換える）
持ち主「主要な仲間と使徒は、確認を待たずに、全員を顔だけを大きく作るやり方で作り直す」。ただし、試しの顔（nora・otmar）は持ち主に「なんの表情かわからない」と言われた。**表情がひと目で分かることを最優先にする。**
対象（55 人。顔の四角 src/data/u41_face_box.js がある人）：dil kaidel nora sheila rui zerina elnea natalia bertrand ilse tula mirlene bruno trude souhaku adele celestin felix lucien barnabe selevan aubin lazare rodolphe margot solenne pipinelle lisette wolfram hartmut gustav timo noeris ingrid lumia sieglinde annelise radmila gigra valdun gensai tsuyuha takimaru yurien roswitha izra anselmo mirza zalve aurelia yoihime mordu azlag chezar yura
やり方：
- **持ち主の試しの顔への返事（2026-10-14）**：nora の試しの顔は「怒りがわかりにくい。楽しいも目が隠れてて（前髪で）ウィンクなのかどうかわからない。それ以外は大丈夫」。→ 喜・哀・目を輝かせるは今のままでよい。**otmar の試しの顔は全部 OK（持ち主）なので、そのまま使い、5 人の合わせからは外す（代わりに表情の強さの手本にする）。**怒はもっとはっきり（眉を強く吊り上げて寄せる・歯をむく・目つきを鋭く）。楽は、前髪で隠れない側の目で表す（片目つむりは見える側の目にする。どちらも隠れるなら、口と頬で分かる笑い方にする）。前髪で片目が隠れる人は、見える側の目と口で表情を作るのを決まりにする。
1. **まず 5 人で合わせる**：nora・otmar・adele・barnabe・mirza。表情ごとに、ひと目で分かる形にする（喜＝口を開けて笑う・目を細める、怒＝眉を吊り上げて寄せ・歯を食いしばるか怒鳴る、哀＝眉を八の字・口を結ぶか泣く、楽＝いたずらっぽい笑み・片目つむり など）。表情のタグの重みを上げ、目・眉・口の所は canny から消し、denoise を上げる。人物に合う幅（IMG-32）は守るが、「控えめ」で何の表情か分からなくなるのは不可。目は焦点の合った普通の目（IMG-39）。
2. 5 人の表（基本の顔と 5 つの表情に、表情の名前を付けて並べた物）を docs/art/faces_trial/round2.webp に置き、「済み」に書いて push し、**ここで一度止まる**（配り役が持ち主に見せる。持ち主の返事が art-inbox に来たら残りへ進む）。
3. 守る所：髪・前髪・ひげ・眼鏡・傷・絆創膏・そばかす・化粧・仮面・耳飾り・髪留めは基本の画素を戻す。透過の縁は基本のまま（マゼンタの背景で拡大して見る）。
4. 置き場所は assets/portraits/faces/<id>_<表情>.webp（512×512）、表情は喜・怒・哀・楽と、その人らしい表情 1 つ。生成の値は docs/art/gen/<id>_face.json。push 先は face-trial-1。
5. 点検：作った全部を、基本の顔と並べて自分の目で見る。「この顔を見て、名前を隠しても何の表情か言えるか」で判定し、言えない物は作り直す。


## 済み

### 2026-10-13 表情違いの作り直し：試しの 10 人 → 2026-10-14 済み（redo-moods-9・6bc25b59）
- 10 人・30 枚を作り、残したのは 23 枚。aubin・constance・chezar・malvina は見分けのつかない表情を消した。
- あわせて、前の回で取りこぼしていた 48 枚（一人ごとの最後の表情）も描き直した。
- 作らなかった表情（13 枚）：aubin の joy・sleepy・sorrow／chezar の sorrow・wicked／constance の anger・joy・serious・tired／gensai の wicked／greiol の serious／malvina の joy・sorrow。理由は docs/art/moods_skipped.md。
- 点検：計算の点検 → Clef-flash → どちらかで引っかかった 56 枚と抜き取り 5 枚だけを目で見た。

### 2026-10-13 Clef-flash の試し → 2026-10-14 済み
- Ollama 0.40.3 を入れ、clef-flash を pull した（約 11GB）。
- 疑いあり 20 組・疑いなし 20 組（前の版の表情違い）で、5 問（手・輪郭・ひげと口・顔以外・目）を noul で聞いた。1 組あたり約 5.3 秒。
- 5 問のいちばん低い確率で分けた結果：
  - 0.4 未満を疑いにする：疑いを 11/20 拾い、疑いなしを 2/20 誤って拾った。
  - 0.5 未満を疑いにする：疑いを 18/20 拾い、疑いなしを 10/20 誤って拾った。
  - 問いごとの差が出たのは「目」（疑い 0.52・疑いなし 0.68）と「ひげと口」（0.74・0.86）だけ。手・輪郭・顔以外はほぼ差がなかった。
- 見立て：単独の判定には使えない。計算の点検と組み合わせ、0.5 未満を「目で見る候補」にするふるいとして使うのがよい（見る枚数をおよそ半分に減らせる）。

### 2026-10-14 方針の変更：元の表情違いを直す → 済み（fix-moods-1）
- 117 人・732 枚を直した。表情は描き直していない。main の表情違いの上に、守る所だけ基本の画素を戻した。守る所は、ひげ・眼鏡と片眼鏡の縁・目にかかる前髪・傷・化粧・布・耳飾り・髪留め・顔の線で、目と口の中は除いた。位置のずれはどの絵も 0 で、拡大・縮小はしていない。
- 顔の中の透け（レンズや目の穴）を埋めた。constance・nora・rui・sixth・tiria など。constance は元の目に色が無いので、灰色の目になった。
- 片眼鏡の人で、表情違いにもう片方のレンズが出ていた絵は、もう片方の縁も消した（hermes の fun・zalve・dietrich）。目の色が変わっていた 8 枚は、瞳の色相を基本に合わせた。
- 消した 13 枚：試しの「いらない」12 枚と、葉っぱをくわえて直らなかった ambroise の sorrow。
- 試しで OK の新しい絵（redo-moods-9）は、そのまま使った。
- 守る所のマスクは docs/art/redo_moods/<id>_keep.png、やり方は fix_notes.md、絵ごとの記録は docs/art/gen/<id>.json。
- 点検：手を付けたのは目を自動で見つけられなかった 12 人だけで、目の位置を手で書いた。目視は、眼鏡・ひげの人を中心に、直す前と後を並べた表で見た（全部ではない）。
- 直していない物：体・服・持ち物の描き直し、表情の差が無い絵、lazare の手の形。

### 2026-10-14 試しの 10 人：持ち主の判定を反映 → 済み（redo-moods-9 は 2bea601c）
- 28 枚を main の絵に戻し、12 枚を作らない表情にした。docs/art/moods_skipped.md に書いた。
- 「作り直す」の 20 枚は、上の方針で fix-moods-1 で直した。constance・malvina・hartmut の cry・fun・panic・iori の joy・aubin の serious。
- ゲームに入れるのは fix-moods-1 の方がよい。redo-moods-9 の顔の描き直しは、試しの OK の分だけが fix-moods-1 に入っている。

### 2026-10-14 fix-moods-1 の仕上げ：数を絞り、全部を目視する → 済み（fix-moods-1・788616b2）
- 残したのは 99 人・269 枚。全部を顔の窓の四角で基本と並べ、1 枚ずつ目で見た。
- 1. 数を絞って消した：323 枚。喜怒哀楽と、その人らしい表情 1 つの外にあった物。portraits.json の variants から外し、md を作り直した。a20_gaps.json からも外した。
- 2・3. 目視で消した：252 枚。
  - 差が無い：173 枚
  - 別人化：55 枚（目の色・片眼鏡が二重・頬の傷や汚れや絵の具・マスクや布の柄・眼鏡・絵柄・隈取り）
  - その表情に見えない：16 枚
  - 目（光る目・小さな瞳・星形の瞳）：4 枚
  - 顔の崩れ（口ひげのにじみ）：3 枚
  - 手（指を口元に）：1 枚
  - 一覧は docs/art/redo_moods/trim_2026-10-14.md。
- 残した中で手を入れた物：rionetta の喜怒哀楽 4 枚は、瞳を基本の茶色に塗り直した（元は灰色）。mirza は wicked だけ残した（使徒で、差分を一つは持つ決まりのため）。
- 直した絵は、どれも元の絵のファイルの大きさ以下に詰め直した（307 枚）。
- テストの結果：node tools/build.mjs は通った。node tests/run.mjs の全部は、持ち主の PC でメモリが足りなくなるので回していない（OPS-11）。関係する v11_moods・a20_gaps・v10_identity・a4_art・u41 を ONLY で回した。
  - 通らない所が 1 つある：v11_moods の「表情 fear・tired・pout・exasperated・smitten を持つ人がいない」。喜怒哀楽と、その人らしい表情 1 つに絞ったので、この 5 つを持つ人がいなくなった。チェックの決まりを変える（持つ人がいない表情があってよい）か、表情の一覧から外すかの判断が要る。チェックは触っていない。
  - a8_sprites は手元で「H:\H:\…scenes.json」とパスが二重になる例外が出た。絵とは関係のない、手元の環境の問題に見える。
- 人数の内訳：表情違いが 1 枚も残らなかった人は、variants を空 {} にした（14 人。テストが variants のある形を求めるため）。

### 2026-10-14 顔だけを大きく作るやり方の試し → 済み（face-trial-1・6bb1bced）
- 道具：
  - ControlNet のモデルは 3 つある。controlnet-canny-sdxl-1.0-xinsir-v2・controlnet-openpose-sdxl-1.0-xinsir・controlnet-union-sdxl-1.0-promax。前は VRAM が足りずに落ちたが、今回は canny が動いた。
  - reference（reference_adain+attn、モデル不要）も動く。
  - IP-Adapter：前処理（ip-adapter_clip_sdxl・face_id など）は入っているが、モデルが無い。入れるなら、ip-adapter-plus-face_sdxl_vit-h（約 0.85GB）と、画像の読み取り用の CLIP-ViT-H（約 2.5GB）を models/ControlNet に置く。入れるのは持ち主に聞いてから。今回は使っていない。
- 試した人：nora（喜・怒・哀・楽・目を輝かせる）、otmar（喜・怒・哀・楽・冷たい目）。置き場所は assets/portraits/faces/<id>_<表情>.webp（512×512）。
  - 見比べ表は docs/art/faces_trial/compare.webp、やり方は README.md、値は docs/art/gen/<id>_face.json。
- やり方：顔の窓の四角を 1024 に拡大し、img2img（denoise 0.7）で描いた。
  - canny（重み 0.6）には、基本の線から目・眉・口の所を消した線画を渡した。
  - reference（重み 0.7）で、同じ人に見えるよう押さえた。
  - 目・眉・口の外と、守る所（前髪・絆創膏・汚れ・鼻・ひげ）は、描いたあとに基本の画素を戻した。
- 所感（自分の目で見た）：
  - 輪郭・髪・服・絆創膏・ひげは基本と同じで、二重の線もつぎはぎも無い。
  - 同じ人に見える。canny を線画のまま渡すと口まで固まって表情が変わらなかったが、目と口の所を消すと表情が出た。
  - 表情の強さ：nora は喜・怒・哀（涙）・楽（片目つむり）・目を輝かせる（星の瞳）がはっきり分かれた。nora の哀は口が怒りに近いので、「口を結ぶ」のタグを足すとよい。
  - otmar は控えめで、人物に合っている。怒（しかめ）・哀（涙）・楽（にやり）・冷たい目（半目）が分かる。喜は差が小さい。
  - 人ごとに、守る所（前髪の色・絆創膏や鼻の位置）と、目・口の四角を少し合わせる手間がある。1 人に数分。
- WebUI は試しのあいだ動かした。今は動いたまま（閉じてよい）。

### 2026-10-14 主要な仲間と使徒を顔だけを大きく作る：5 人の合わせ（round2）→ 一度止まる（face-trial-1・2cccf477）
- 表は docs/art/faces_trial/round2.webp。5 人それぞれ、基本の顔と 5 表情を並べ、表情の名前を付けた。
- 表情の強さ：表情ごとに、ひと目で分かる形をタグに決め、重みを 1.5〜1.6 に上げた。逆の表情をネガティブに入れ、denoise は 0.8〜0.85 にした。
  - 喜：口を開けて笑う
  - 怒：眉を吊り上げて寄せ、歯を食いしばってにらむ・怒りの印
  - 哀：眉を八の字にして口を結ぶ・涙
  - 楽：いたずらっぽい笑み・片目つむり
- nora：怒を、歯を食いしばってにらむ・怒りの印にした。楽は、前髪で隠れない側の目でつむる形にした。喜・哀・目を輝かせるは 1 回目のまま。
- otmar：1 回目のまま（持ち主 OK）。
- adele：基本の絵にそばかすが無いので、出ないようにした（一覧の identity にはそばかすがある）。基本がすでに笑顔なので、喜は基本と差が小さい。喜を作らない表情に回すか、持ち主の判断がほしい。
- barnabe：基本が歯を見せた笑いでも、怒（怒りの印・食いしばり）・哀（涙・八の字）・楽（片目つむり）・驚き（汗・見開き）は、基本と差が出た。粉の白い点が表情ごとに散るので、出ないようにした。
- mirza：片目が前髪で隠れるので、見える側の目と口で表した。顔の窓の四角（u41_face_box.js）が顔より上にずれているため、切り出しを顔の高さの 14% 下げた。顔の窓の四角も直すかは、画面側と合わせてほしい。
- 点検：自分の目で全部見た。名前を隠しても何の表情か言えるかで見た。
  - 言えないもの：adele の喜が基本に近い。
  - 迷うもの：nora の哀は口を食いしばっていて、怒に少し寄る（1 回目で持ち主 OK だったので、そのまま）。
- 持ち主の返事が来るまで、残りの 50 人には進まない。WebUI は止めた。

### 2026-10-14 持ち主の確認（最初の 10 人）の反映と、顔だけを大きく作るやり方で 5 人 → 上の指示に置き換え。計算で探した結果だけ書く
- 5 人の顔は、上の round2 で作った（adele・barnabe）。angelica・annelise・anselmo は、残り 50 人のほうで作る。
- 前の 5 人の作業は、PC のメモリ不足で途中で止まった（WebUI が約 15GB を使っていた）。
- 見落とした型を、fix-moods-1 の残す絵（269 枚）で計算で探した。引っかかったのは 91 枚。外れも多く、消すかは持ち主の確認のあと。
  - 透過の縁（外とつながる背景の縁で、半透明・白・赤紫が基本より増えた）：16 枚。zerina_sorrow・elnea_joy・elnea_anger・elnea_sorrow・elnea_fun・elnea_shy・valeon_anger・zalve_anger・zalve_fun・dorothea_anger・dorothea_sorrow・dorothea_smug・rionetta_joy・rionetta_anger・rionetta_sorrow・rionetta_fun
  - 白い塊（絆創膏・貼り物など、白っぽい塊の数や面積が基本と違う。歯や白目も数に入る）：75 枚。sheila_sorrow・zerina_anger・valeon_sorrow・valeon_fun・raios_fun・neilas_sorrow・sixth_anger・angelica_sorrow・hermes_fun・ferida_sorrow・ferida_fun・bride_sorrow・bride_cry・boku_anger・boku_sorrow・boku_fun・boku_sparkle・dario_sorrow・valg_anger・aurelia_joy・aurelia_sorrow・mordu_joy・mordu_fun・clarisse_panic・titta_fun・iori_sorrow・dorothea_fun・selevan_anger・solenne_joy・solenne_anger・solenne_sorrow・solenne_fun・lisette_joy・lisette_sorrow・sylvestre_anger・sylvestre_sorrow・sylvestre_fun・odette_anger・odette_fun・wolfram_joy・wolfram_sorrow・gustav_joy・gustav_anger・gustav_sorrow・sieglinde_fun・annelise_sorrow・annelise_shy・radmila_joy・radmila_fun・oren_joy・oren_anger・oren_fun・oren_sparkle・dietrich_anger・gigra_anger・gigra_sorrow・tsuyuha_sorrow・tsuyuha_fun・tsuyuha_sleepy・jonas_anger・jonas_sorrow・jonas_fun・jonas_panic・trude_sorrow・violaine_sorrow・severin_anger・severin_sorrow・severin_wicked・rufina_joy・rufina_fun・shione_sorrow・shione_fun・baudouin_joy・baudouin_anger・baudouin_sorrow

