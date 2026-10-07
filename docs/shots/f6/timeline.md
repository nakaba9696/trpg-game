# F6：とどめの手番の時刻（ヘッドレスの Chromium・速さ「ふつう」）

click＝手を選んだ瞬間を 0ms。bgm＝曲の場面が替わった時刻、sfx＝効果音、dice＝ダイスが止まった、foe＝敵の札が倒れた、screen＝結果・死の場面、notice＝知らせ。

## 直す前（#362 のあとの main と同じ見せ方）：攻撃でとどめ
```
     0 click  kill （曲：battle）
    22 sfx    rollShort 
    23 sfx    crit(+200ms) 
    23 sfx    slash 
    24 sfx    pop(+240ms) 
    24 sfx    item(+710ms) 
    24 sfx    coin(+880ms) 
    41 bgm    town 
    43 notice ◆図鑑に追加：魔物の牙 
    43 notice ✎覚え書き：ゴブリン 
    43 notice ◆図鑑に追加：短剣 
    43 notice トロフィー獲得 『旅立ち』銅 
    43 notice トロフィー獲得 『初陣』銅 
```

## 直したあと：攻撃でとどめ
```
     0 click  kill （曲：battle）
   424 sfx    rollShort 
   424 sfx    crit(+120ms) 
   815 dice   止まった 
  1896 sfx    slash 
  2454 sfx    pop 
  2458 foe    倒れた 
  3643 sfx    item 
  3973 sfx    coin 
  9512 sfx    victory 
  9535 bgm    town@morning 
  9543 screen u13result 
  9543 notice ◆図鑑に追加：魔物の牙 
  9543 notice ✎覚え書き：ゴブリン 
  9543 notice ◆図鑑に追加：短剣 
```

## 直したあと：二体のうち一体を倒す（戦闘は続く）
```
     0 click  one （曲：battle）
   443 sfx    rollShort 
   443 sfx    crit(+120ms) 
   842 dice   止まった 
  1914 sfx    slash 
  2473 sfx    pop 
  2501 foe    倒れた 
  3201 sfx    hurt 
  4882 sfx    trophy 
  8365 notice ✎覚え書き：ゴブリン 
  8365 notice トロフィー獲得 『旅立ち』銅 
  8365 notice トロフィー獲得 『初陣』銅 
  8365 notice トロフィー獲得 『天運』銅 
  8365 notice トロフィー獲得 『一流』銀 
  8365 notice トロフィー獲得 『才能開花』金 
```

## 直したあと：逃げ切る
```
     0 click  flee （曲：battle）
   441 sfx    roll 
   443 sfx    crit(+120ms) 
   836 dice   止まった 
  1955 sfx    levelup 
  2895 sfx    trophy 
  6470 bgm    town@morning 
  6472 screen u13result 
  6472 notice トロフィー獲得 『旅立ち』銅 
  6472 notice トロフィー獲得 『天運』銅 
  6472 notice トロフィー獲得 『一流』銀 
  6472 notice トロフィー獲得 『才能開花』金 
  6472 notice ✦用語集に追加：南の商いの町 
  6472 notice ✦用語集に追加：賽子の目 
  6472 notice ✦用語集に追加：レオネスト王国 
```

## 直したあと：あなたが倒れる
```
     0 click  die （曲：battle）
   484 sfx    hurt 
  7609 sfx    death 
  7610 sfx    fall 
  7634 bgm    death 
  7638 screen u13death 
  7638 notice ✎覚え書き：ゴブリン 
  7638 notice トロフィー獲得 『帳面の一行』銅 
  7638 notice トロフィー獲得 『旅立ち』銅 
  7638 notice トロフィー獲得 『死は終わりではない』銅 
  7638 notice トロフィー獲得 『一流』銀 
  7638 notice トロフィー獲得 『才能開花』金 
  7638 notice トロフィー獲得 『手帳の一行目』銅 
  7638 notice ✦用語集に追加：南の商いの町 
```
