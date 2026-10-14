# 絵のセッションへの指示（配り役が書く）

絵のセッション（手元の PC）は、このファイルを定期的に読み、「未着手」の指示を上から順に行う。終えた指示は、下の「済み」に移して push する（このブランチ art-inbox に）。
配り役はクラウドから手元のセッションへ直接は送れない（Remote Control のセッションには本人かそのセッション自身しか予約を作れない決まり）ため、ここで受け渡す。

## 未着手

### 2026-10-14 方針の変更：元の表情違いを直す（持ち主「基本的に元のほうが表情がいい。ひげなくなってたり、メガネ変わってたり、髪が変わってたり、手が生えてるのを直してほしい」）
**これがいちばん上の指示。下の「試しの 10 人：持ち主の判定を反映」の「作り直す」は、この方針で置き換える（顔を描き直さない）。**
- **表情の数を絞る（持ち主「めちゃくちゃ細かい表情差分までつくってるからいらないの省いて」）。** 一人あたり、喜・怒・哀・楽と、その人らしい表情を 1 つまで（docs/art/portraits.json の variants で、喜怒哀楽の次に最初に書いてある物）。それ以外の表情違い（照れ・得意げ・眠い・呆れ・すね・うっとり・酔い・目を輝かせる など）は消し、portraits.json の variants からも外す（ゲームでは近い表情か基本の絵に落ちる）。消すのは直す前にする（直す枚数が減る）。
- **元の絵でも表情がおかしい物は省く（持ち主「元の絵も表情おかしいのはあった」）。** 目が薬をやってそうな目（瞳が小さすぎる・大きすぎる・白目・虚ろ・ぎらぎら）、口や顔が崩れている、別人に見える、その表情に見えない物は、直さずに消す。喜怒哀楽のうちでも、おかしければ消してよい。
- 表情は描き直さない。今のゲームの表情違い（main の assets/portraits/<id>_<表情>.webp）を下地にし、崩れている所だけを直す。
- 直し方：人ごとに「守る所」のマスク（ひげ・口ひげ・眼鏡と片眼鏡の縁とレンズ・目にかかる前髪と髪の房・傷・そばかす・化粧・顔の布や仮面・耳飾り・髪留め）を基本の絵から作り（docs/art/redo_moods/<id>_keep.png。試しで作った物は使ってよい）、その所だけ基本の画素を表情違いの上に戻す。目（瞳と白目）と口の中・唇は戻さない（表情が消えるので、守る所から外す）。口の周りのひげは、口の形を残してその外側だけ戻す。
- 生えた手・指・余計な物は、その所を基本の画素で消す（体の外の背景なら透明に）。
- 縁：戻した所の境目はなじませる（1〜2 画素ぼかす）。透過の縁は基本のまま。拡大・縮小はしない（ガビガビの元）。
- 直す物の一覧：ブランチ mood-audit の docs/art/redo_moods/audit_2026-10-13.md のうち「ひげ・眼鏡・髪・手・傷・マスク・仮面・化粧・髪留め・耳飾り・別人化（小物）」の型。作り直した 60 人については、元の絵（main）を同じ型で点検してから直す（前に持ち主が挙げた annelise の髪・constance の目の透け・farina の髪・greol・salphiel のマスクなど）。体・服・持ち物の崩れは顔の窓に映らないので直さない。
- 試しで持ち主が OK した新しい絵 22 枚（docs/art/redo_moods の試しの判定）はそのまま新しい物を使う。「いらない」の 12 枚は消す。
- 点検：直す前と後の顔の四角（src/data/u41_face_box.js）を並べ、計算の点検（守る所が基本と一致するか）→ 引っかかった物だけ目で見る（IMG-41）。
- push 先：ブランチ fix-moods-1（main から作る）。区切りごとに push し、「済み」に何人・何枚を書く。ゲームに入れるのは配り役がする。


### 2026-10-14 試しの 10 人：持ち主の判定を反映（確認ページ https://claude.ai/artifact/LfyN34Y83fgfVzoCNncjjK ）
ブランチ redo-moods-9 の上で行い、同じブランチに push する。
- **今のゲームの絵（main）に戻す（持ち主「元でいい」・28 枚）**：aubin_anger、aubin_drunk、aubin_smug、chezar_fun、chezar_joy、gustav_joy、iori_anger、iori_faint_smile、iori_fun、iori_serious、iori_shy、iori_sorrow、magda_anger、magda_sorrow、otmar_anger、otmar_fun、otmar_joy、otmar_serious、otmar_sorrow、yurien_anger、yurien_base、yurien_cold、yurien_faint_smile、yurien_fun、yurien_joy、yurien_pout、yurien_smug、yurien_sorrow。git checkout origin/main -- assets/portraits/<名>.webp で戻す。
- **作らない（消す。12 枚）**：aubin_joy、aubin_sleepy、aubin_sorrow、chezar_cold、chezar_sorrow、chezar_wicked、gustav_serious、hartmut_smitten、iori_sleepy、otmar_cold、otmar_tired、malvina_faint_smile。main にあっても消す。docs/art/moods_skipped.md に足す。
- **作り直す（20 枚）**：
  - constance：基本も含め全部ガビガビ（持ち主）。基本は main の絵に戻し、表情はその基本から顔だけ描き直す。縁がギザギザにならないよう、拡大・縮小や切り抜きの縁を見直す（透過の縁をマゼンタで見る）。
  - malvina：顔の布（マスク）が変わる（6 枚）。マスクを守る所のマスクに入れ、描いたあとに基本の画素を戻す。
  - hartmut の cry・fun・panic：傷が変わる。傷を守る所に入れる。
  - iori の joy：顔が別人。aubin の serious：直す（理由なし。顔の窓で見て直す）。
- **新しい絵を使う（持ち主 OK・22 枚）**：そのまま。
- 学び：顔の窓で見ると、今のゲームの絵で十分なことが多かった。作り直すのは、今の絵が顔の窓で見て崩れているときだけにする。
- 終わったら「済み」に書いて push。ゲームに入れるのは配り役がする。


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

