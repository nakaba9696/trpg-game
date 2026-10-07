// S4：音のつり合い（BGM・環境音・効果音の聞こえる大きさ）。鳴らすのは src/ui/sound.js・src/ui/sound_bgm.js。
// 既定の音量（効果音 70・環境音 40・BGM 35）のときの聞こえる大きさ（ラウドネス。LUFS に近い K 特性の重み付け）を TARGET に揃える：
//   BGM を基準に、環境音はその下（かき消さず、埋もれすぎない）、効果音は一瞬だけ前に出る（400 ミリ秒の最大で測る）
// BGM・AMB・SFX は曲・環境音・効果音ごとの補正の倍率で、tools/loudness.mjs が測って書く（手で直さない。OFFSET を変えたら測り直す）。
// OFFSET は狙いからのずらし（dB）：ボタンやページの音は小さく、強敵・死の音は大きく、など。
// DUCK：効果音が鳴る瞬間に BGM を少し下げる（depth は倍率、release は戻る秒）。skip の音では下げない。レーン S（音）が管理
(function (G) {
  const D = (G.data = G.data || {});
  D.MIX = {
    TARGET: { bgm: -26, amb: -35, sfx: -19 },
    BGM_OFFSET: { inn: -2, death: -1, dungeon2: -1, abyss: -1, title: -1, s6_inn2: -2, s6_night_quiet: -1 },
    AMB_OFFSET: { dread: 1, town: -1 },
    SFX_OFFSET: { click: -13, page: -8, roll: -5, rollShort: -6, clap: -10, step: -4, depart: -3, door: -2, coin: -3, item: -3, swing: -3, sleep: -3, crit: 2, death: 3, majin: 3, trophy: 1, victory: 1, battle: 1, battleBig: 2, roarDragon: 1 },
    DUCK: { depth: 0.6, attack: 0.03, hold: 0.25, release: 0.7, skip: ["click", "page", "roll", "rollShort", "step"] },
    // ---- ここから下は tools/loudness.mjs が書く
    BGM: { title: 1.585, town: 0.944, town_night: 1.035, tavern: 1.334, inn: 1.174, road: 0.933, dungeon: 1.429, dungeon2: 1.429, abyss: 1.531, battle: 0.955, battle2: 0.902, boss: 0.955, apostle: 1.122, death: 1.778, epilogue: 1.585, depart: 0.851, s6_dusk_a: 1.396, s6_dusk_b: 1.82, s6_morning: 2.018, s6_town_calm: 1.479, s6_harbor: 1.799, s6_village: 1.531, s6_holy: 1.365, s6_north: 2.018, s6_night_quiet: 1.585, s6_tavern2: 1.567, s6_inn2: 1.479, s6_road_north: 1.641, s6_road_east: 1.446, s6_road_isles: 1.567, s6_road_holy: 2.066, s6_road_border: 1.95 },
    AMB: { town: 1.084, wind: 1.622, cave: 0.639, rain: 0.437, fire: 0.7, sea: 0.724, dread: 0.422 },
    SFX: { click: 5.957, page: 2.215, roll: 2.317, rollShort: 2.189, clap: 7.908, ok: 1.758, ng: 4.571, crit: 0.804, levelup: 1.585, victory: 0.861, fumble: 1.885, swing: 4.571, slash: 1.567, blunt: 1.548, clang: 1.496, hurt: 2.09, kill: 0.891, pop: 2.289, battle: 1.258, majin: 0.431, fire: 0.66, ice: 1.259, thunder: 1.083, curse: 1.245, bless: 0.842, heal: 1.244, coin: 1.585, item: 3.054, trophy: 0.892, door: 0.834, step: 1.318, depart: 1.757, sleep: 1.566, death: 0.596, fall: 0.861, battleBig: 0.531, roarBeast: 0.741, roarDragon: 0.603, roarGiant: 0.443, roarUndead: 2.019, roarWing: 1.549, roarBlob: 2.512, roarSwarm: 2.372, roarHuman: 1.413 },
    // 書いたときに測った大きさ（LUFS。tests/checks/s4_mix.mjs が場面ごとのつり合いを確かめるのに使う）
    MEASURED: { bgm: { title: -27, town: -26, town_night: -26, tavern: -26, inn: -28, road: -26, dungeon: -26, dungeon2: -27, abyss: -27.1, battle: -26, battle2: -26, boss: -26, apostle: -26, death: -27, epilogue: -26, depart: -26, s6_dusk_a: -26, s6_dusk_b: -26, s6_morning: -26, s6_town_calm: -26, s6_harbor: -26, s6_village: -26, s6_holy: -26, s6_north: -26, s6_night_quiet: -27, s6_tavern2: -26, s6_inn2: -28, s6_road_north: -25.9, s6_road_east: -26, s6_road_isles: -25.9, s6_road_holy: -25.8, s6_road_border: -25.8 }, amb: { town: -35.9, wind: -34.9, cave: -34.8, rain: -35, fire: -35.1, sea: -34.7, dread: -34.1 }, sfx: { click: -32, page: -27.1, roll: -24.5, rollShort: -24.9, clap: -29.2, ok: -18.9, ng: -19, crit: -17, levelup: -19, fall: -19, victory: -18, fumble: -18.8, swing: -22.1, slash: -19, blunt: -19, clang: -19.1, hurt: -19, kill: -19.1, pop: -18.7, battle: -18, battleBig: -17.2, roarBeast: -19, roarDragon: -18.1, roarGiant: -19, roarUndead: -19, roarWing: -19, roarBlob: -19.7, roarSwarm: -19.1, roarHuman: -19, majin: -15.8, fire: -19.2, ice: -19.2, thunder: -18.6, curse: -19, bless: -18.6, heal: -18.8, coin: -21.9, item: -22.5, trophy: -17.8, door: -21, step: -22.8, depart: -21.8, sleep: -21.9, death: -16 } },
  };
})(globalThis.G = globalThis.G || {});
