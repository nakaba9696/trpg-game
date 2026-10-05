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
    BGM_OFFSET: { inn: -2, death: -1, dungeon2: -1, abyss: -1, title: -1 },
    AMB_OFFSET: { dread: 1, town: -1 },
    SFX_OFFSET: { click: -13, page: -8, roll: -5, rollShort: -6, clap: -10, step: -4, depart: -3, door: -2, coin: -3, item: -3, swing: -3, sleep: -3, crit: 2, death: 3, majin: 3, trophy: 1, victory: 1, battle: 1, battleBig: 2, roarDragon: 1 },
    DUCK: { depth: 0.6, attack: 0.03, hold: 0.25, release: 0.7, skip: ["click", "page", "roll", "rollShort", "step"] },
    // ---- ここから下は tools/loudness.mjs が書く
    BGM: { title: 1.585, town: 0.944, town_night: 1.035, tavern: 1.334, inn: 1.174, road: 0.933, dungeon: 1.429, dungeon2: 1.429, abyss: 1.531, battle: 0.955, battle2: 0.902, boss: 0.966, apostle: 1.122, death: 1.778, epilogue: 1.585 },
    AMB: { town: 1.059, wind: 1.622, cave: 0.617, rain: 0.437, fire: 0.724, sea: 0.724, dread: 0.427 },
    SFX: { click: 5.957, page: 2.163, roll: 2.238, rollShort: 1.996, clap: 8, ok: 1.758, ng: 4.624, crit: 0.795, levelup: 1.585, victory: 0.851, fumble: 1.779, swing: 4.571, slash: 1.531, blunt: 1.566, clang: 1.531, hurt: 2.09, kill: 0.902, pop: 2.317, battle: 1.258, majin: 0.431, fire: 0.683, ice: 1.259, thunder: 1.109, curse: 1.245, bless: 0.852, heal: 1.244, coin: 1.567, item: 3.272, trophy: 0.871, door: 0.814, step: 1.318, depart: 1.64, sleep: 1.567, death: 0.617, fall: 0.891, battleBig: 0.519, roarBeast: 0.741, roarDragon: 0.61, roarGiant: 0.452, roarUndead: 1.996, roarWing: 1.549, roarBlob: 2.661, roarSwarm: 2.399, roarHuman: 1.413 },
    // 書いたときに測った大きさ（LUFS。tests/checks/s4_mix.mjs が場面ごとのつり合いを確かめるのに使う）
    MEASURED: { bgm: { title: -27, town: -26, town_night: -26.1, tavern: -26, inn: -28, road: -26, dungeon: -26, dungeon2: -27, abyss: -27.1, battle: -26, battle2: -26, boss: -26, apostle: -26, death: -27, epilogue: -26 }, amb: { town: -36.2, wind: -34.9, cave: -35.2, rain: -35.1, fire: -35.3, sea: -34.9, dread: -33.9 }, sfx: { click: -32, page: -26.3, roll: -24.1, rollShort: -25.3, clap: -29, ok: -19, ng: -18.9, crit: -17.1, levelup: -19, victory: -18.1, fumble: -18.9, swing: -21.8, slash: -19.4, blunt: -19, clang: -18.9, hurt: -19, kill: -19.1, pop: -18.9, battle: -18, battleBig: -17.1, roarBeast: -19, roarDragon: -17.9, roarGiant: -18.9, roarUndead: -19.2, roarWing: -19, roarBlob: -18.3, roarSwarm: -18.9, roarHuman: -19, majin: -15.9, fire: -19.1, ice: -19.1, thunder: -18.9, curse: -19, bless: -18.9, heal: -18.9, coin: -21.8, item: -21.9, trophy: -18, door: -21, step: -23.2, depart: -22.3, sleep: -22, death: -16.1, fall: -18.8 } },
  };
})(globalThis.G = globalThis.G || {});
