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
    SFX_OFFSET: { click: -13, page: -8, roll: -5, rollShort: -6, clap: -10, step: -4, depart: -3, door: -2, coin: -3, item: -3, swing: -3, sleep: -3, crit: 2, death: 3, majin: 3, trophy: 1, victory: 1, battle: 1 },
    DUCK: { depth: 0.6, attack: 0.03, hold: 0.25, release: 0.7, skip: ["click", "page", "roll", "rollShort", "step"] },
    // ---- ここから下は tools/loudness.mjs が書く
    BGM: { title: 1.585, town: 0.944, town_night: 1.035, tavern: 1.334, inn: 1.174, road: 0.933, dungeon: 1.429, dungeon2: 1.429, abyss: 1.531, battle: 0.955, battle2: 0.902, boss: 0.966, apostle: 1.122, death: 1.778, epilogue: 1.585 },
    AMB: { town: 1.047, wind: 1.585, cave: 0.646, rain: 0.437, fire: 0.725, sea: 0.692, dread: 0.417 },
    SFX: { click: 5.957, page: 2.291, roll: 2.426, rollShort: 2.114, clap: 8, ok: 1.738, ng: 4.519, crit: 0.786, levelup: 1.585, victory: 0.861, fumble: 1.779, swing: 4.677, slash: 1.549, blunt: 1.548, clang: 1.496, hurt: 2.019, kill: 0.902, pop: 2.29, battle: 0.484, majin: 0.436, fire: 0.668, ice: 1.274, thunder: 1.096, curse: 1.245, bless: 0.822, heal: 1.259, coin: 1.567, item: 3.273, trophy: 0.871, door: 0.813, step: 1.348, depart: 1.758, sleep: 1.567, death: 0.603 },
    // 書いたときに測った大きさ（LUFS。tests/checks/s4_mix.mjs が場面ごとのつり合いを確かめるのに使う）
    MEASURED: { bgm: { title: -27, town: -26, town_night: -26.1, tavern: -26, inn: -28, road: -26, dungeon: -26, dungeon2: -27, abyss: -27.1, battle: -26, battle2: -26, boss: -26, apostle: -26, death: -27, epilogue: -26 }, amb: { town: -36.2, wind: -35, cave: -34.8, rain: -35, fire: -35, sea: -35.3, dread: -34.2 }, sfx: { click: -32, page: -26.4, roll: -24.5, rollShort: -25.1, clap: -29.4, ok: -19, ng: -19.1, crit: -17.1, levelup: -19, victory: -18.1, fumble: -19, swing: -21.7, slash: -19.1, blunt: -19, clang: -19.2, hurt: -19.1, kill: -19, pop: -18.8, battle: -17.9, majin: -15.9, fire: -19.4, ice: -19, thunder: -18.9, curse: -19.1, bless: -19.4, heal: -18.8, coin: -21.9, item: -21.9, trophy: -18.1, door: -20.8, step: -22.7, depart: -21.9, sleep: -22, death: -16.1 } },
  };
})(globalThis.G = globalThis.G || {});
