# 人物と魔物に当てる絵（A10）

このファイルは `node tools/a10_map.mjs` で、今の `assets/` から作る（絵を足したら作り直す）。決め方は `src/ui/v4_assets.js`（人物）・`src/ui/v6_monsters.js`（魔物）。

- **canvas の人物・魔物の絵は使わない**（持ち主の決定）。生成画像が無い人・読めない画像は「絵なし」（枠を出さない）。

- **主人公**は立ち絵を出さない（話す場面・シート・戦闘・作成の画面・墓碑・左上の札）。`hero_*` の型も作らない。

- **名のある人**（キャラメモの人・出来事と施設の名のある人）はその人の絵だけ。無ければ絵なし（型の絵は使わない）。

- **名もない人**（乱数の仲間・出来事の町の人）は、人の種類 × 性別の型 `kind_<種類>_<m|f>`。13 歳未満は `child`、60 歳以上は `elder`。種族の型（`_elf`・`_beast[_<獣>]`）が無ければ人間の型（耳は合わない）。人の姿の使徒（`majin`）は型が無いので絵なし。

- **魔物**は `assets/monsters/<id>.webp`（色違いは `same_as`）。人の姿の敵は人物の絵（`docs/art/monsters.json` の `people`）。仲間の魔物・出来事の魔物は魔物の絵を胸から上に切り取る。

## 名もない人の型（人間）

| 種類 | 性別 | 子ども（9） | 若者（25） | 中年（45） | 老人（70） |
|---|---|---|---|---|---|
| villager（町の人） | 男 | `kind_child_m` | `kind_villager_m` | `kind_villager_m` | `kind_elder_m` |
| villager（町の人） | 女 | `kind_child_f` | `kind_villager_f` | `kind_villager_f` | `kind_elder_f` |
| merchant（商人） | 男 | `kind_child_m` | `kind_merchant_m` | `kind_merchant_m` | `kind_elder_m` |
| merchant（商人） | 女 | `kind_child_f` | `kind_merchant_f` | `kind_merchant_f` | `kind_elder_f` |
| guard（衛兵） | 男 | `kind_child_m` | `kind_guard_m` | `kind_guard_m` | `kind_elder_m` |
| guard（衛兵） | 女 | `kind_child_f` | `kind_guard_f` | `kind_guard_f` | `kind_elder_f` |
| priest（神官） | 男 | `kind_child_m` | `kind_priest_m` | `kind_priest_m` | `kind_elder_m` |
| priest（神官） | 女 | `kind_child_f` | `kind_priest_f` | `kind_priest_f` | `kind_elder_f` |
| noble（貴族） | 男 | `kind_child_m` | `kind_noble_m` | `kind_noble_m` | `kind_elder_m` |
| noble（貴族） | 女 | `kind_child_f` | `kind_noble_f` | `kind_noble_f` | `kind_elder_f` |
| rogue（ならず者） | 男 | `kind_child_m` | `kind_rogue_m` | `kind_rogue_m` | `kind_elder_m` |
| rogue（ならず者） | 女 | `kind_child_f` | `kind_rogue_f` | `kind_rogue_f` | `kind_elder_f` |
| child（子ども） | 男 | `kind_child_m` | `kind_child_m` | `kind_child_m` | `kind_elder_m` |
| child（子ども） | 女 | `kind_child_f` | `kind_child_f` | `kind_child_f` | `kind_elder_f` |
| elder（老人） | 男 | `kind_child_m` | `kind_elder_m` | `kind_elder_m` | `kind_elder_m` |
| elder（老人） | 女 | `kind_child_f` | `kind_elder_f` | `kind_elder_f` | `kind_elder_f` |
| soldier（兵士） | 男 | `kind_child_m` | `kind_soldier_m` | `kind_soldier_m` | `kind_elder_m` |
| soldier（兵士） | 女 | `kind_child_f` | `kind_soldier_f` | `kind_soldier_f` | `kind_elder_f` |
| knight（騎士） | 男 | `kind_child_m` | `kind_knight_m` | `kind_knight_m` | `kind_elder_m` |
| knight（騎士） | 女 | `kind_child_f` | `kind_knight_f` | `kind_knight_f` | `kind_elder_f` |
| sailor（船乗り） | 男 | `kind_child_m` | `kind_sailor_m` | `kind_sailor_m` | `kind_elder_m` |
| sailor（船乗り） | 女 | `kind_child_f` | `kind_sailor_f` | `kind_sailor_f` | `kind_elder_f` |
| mage（魔法使い） | 男 | `kind_child_m` | `kind_mage_m` | `kind_mage_m` | `kind_elder_m` |
| mage（魔法使い） | 女 | `kind_child_f` | `kind_mage_f` | `kind_mage_f` | `kind_elder_f` |
| ronin（シェルアークの人） | 男 | `kind_child_m` | `kind_ronin_m` | `kind_ronin_m` | `kind_elder_m` |
| ronin（シェルアークの人） | 女 | `kind_child_f` | `kind_ronin_f` | `kind_ronin_f` | `kind_elder_f` |
| host（宿や酒場の主） | 男 | `kind_child_m` | `kind_host_m` | `kind_host_m` | `kind_elder_m` |
| host（宿や酒場の主） | 女 | `kind_child_f` | `kind_host_f` | `kind_host_f` | `kind_elder_f` |
| beggar（物乞い・奴隷） | 男 | `kind_child_m` | `kind_beggar_m` | `kind_beggar_m` | `kind_elder_m` |
| beggar（物乞い・奴隷） | 女 | `kind_child_f` | `kind_beggar_f` | `kind_beggar_f` | `kind_elder_f` |
| archer（弓使い） | 男 | `kind_child_m` | `kind_archer_m` | `kind_archer_m` | `kind_elder_m` |
| archer（弓使い） | 女 | `kind_child_f` | `kind_archer_f` | `kind_archer_f` | `kind_elder_f` |
| adventurer（冒険者） | 男 | `kind_child_m` | `kind_adventurer_m` | `kind_adventurer_m` | `kind_elder_m` |
| adventurer（冒険者） | 女 | `kind_child_f` | `kind_adventurer_f` | `kind_adventurer_f` | `kind_elder_f` |
| majin（使徒（人の姿）） | 男 | 絵なし | 絵なし | 絵なし | 絵なし |
| majin（使徒（人の姿）） | 女 | 絵なし | 絵なし | 絵なし | 絵なし |

上の表は一人の例。二枚目の型（`_b`）がある種類・性別は、人ごと（seed）に半分ほどが二枚目になる：`kind_adventurer_f_b`・`kind_adventurer_m_b`・`kind_mage_f_b`・`kind_mage_m_b`・`kind_priest_f_b`・`kind_priest_m_b`・`kind_rogue_f_b`・`kind_rogue_m_b`・`kind_ronin_f_b`・`kind_ronin_m_b`

### 二枚目の型（もとは主人公の型。主人公の立ち絵をやめたので回した）

| もとの絵 | 今の id | 当てる人 |
|---|---|---|
| `hero_merc_f` | `kind_adventurer_f_b` | 冒険者（女）の名もない人の半分ほど |
| `hero_merc_m` | `kind_adventurer_m_b` | 冒険者（男）の名もない人の半分ほど |
| `hero_mage_f` | `kind_mage_f_b` | 魔法使い（女）の名もない人の半分ほど |
| `hero_mage_m` | `kind_mage_m_b` | 魔法使い（男）の名もない人の半分ほど |
| `hero_priest_f` | `kind_priest_f_b` | 神官（女）の名もない人の半分ほど |
| `hero_priest_m` | `kind_priest_m_b` | 神官（男）の名もない人の半分ほど |
| `hero_thief_f` | `kind_rogue_f_b` | ならず者（女）の名もない人の半分ほど |
| `hero_thief_m` | `kind_rogue_m_b` | ならず者（男）の名もない人の半分ほど |
| `hero_samurai_f` | `kind_ronin_f_b` | シェルアークの人（女）の名もない人の半分ほど |
| `hero_samurai_m` | `kind_ronin_m_b` | シェルアークの人（男）の名もない人の半分ほど |

## 種族（例：25 歳の女の神官）

| 種族 | 当てる絵 |
|---|---|
| エルフ | `kind_priest_f` |
| 獣人（狼） | `kind_priest_f` |
| 獣人（熊） | `kind_priest_f` |
| 獣人（猫） | `kind_priest_f` |
| 獣人（兎） | `kind_priest_f` |
| 獣人（鳥） | `kind_priest_f` |
| 獣人（鼠） | `kind_priest_f` |
| 獣人（狐） | `kind_priest_f` |
| 獣人（犬） | `kind_priest_f` |

## 名のある人（131 人。絵あり 131）

全員に絵がある。

## 出来事の人・仲間・魔物

- 出来事の人：絵あり 645（うち魔物 65）・絵なし 11：e3_meet_levian（foe:e3_levian）・e3_meet_lugu（foe:e3_lugu）・e3_meet_notari（foe:e3_notari）・e3_meet_kurobane（foe:e3_kurobane）・e3_meet_tojizuki（foe:e3_tojizuki）・e3_meet_tetsukui（foe:e3_tetsukui）・e3_meet_togaoi（foe:e3_togaoi）・e3_meet_midori（foe:e3_midori）・e3_meet_sanno（foe:e3_sanno）・e3_meet_sekaiju（foe:e3_sekaiju）・m3_togaoi（foe:e3_togaoi）
- 仲間（乱数の仲間 240 人と出来事の仲間）：絵あり 244／244
- 魔物（敵と使徒 217）：絵あり 207・絵なし（絵ができるまで何も描かない）：e3_levian・e3_lugu・e3_notari・e3_kurobane・e3_tojizuki・e3_tetsukui・e3_togaoi・e3_midori・e3_sanno・e3_sekaiju
- 人の姿の絵で描く敵：w1_konoha → `konoha`・c2_nora → `nora`・c2_angelica → `angelica`・c2_zork → `zork`・c4_musette → `musette`・c5_violaine → `violaine`・c5_severin → `severin`・c8_graul → `graul`・e2_berna → `berna`・e3_mirza → `mirza`・e3_zalve → `zalve`・e3_aurelia → `aurelia`・e3_yoihime → `yoihime`・e3_chezar → `chezar`・e3_yura → `yura`・e3_azlag → `azlag`・e3_salphiel → `salphiel`・e3_yuzuel → `yuzuel`
