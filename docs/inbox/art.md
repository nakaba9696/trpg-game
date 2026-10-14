# 絵のセッションへの指示（配り役が書く）

絵のセッション（手元の PC）は、このファイルを定期的に読み、「未着手」の指示を上から順に行う。終えた指示は、下の「済み」に移して push する（このブランチ art-inbox に）。
配り役はクラウドから手元のセッションへ直接は送れない（Remote Control のセッションには本人かそのセッション自身しか予約を作れない決まり）ため、ここで受け渡す。

## 未着手

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

