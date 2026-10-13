// V17a：長編「膝を折らぬ者」の決戦の曲（すべてオリジナルの旋律）。書き方は src/data/s4_tracks.js・s6_tracks_boss.js の頭の説明と同じ。
// 場面の割り当ては apostle@saga_graw（src/ui/sound_bgm_s6.js。長編の決戦は専用曲。tests/checks/s6_bosses.mjs）。
// 黒鎧の使徒の曲（黒鉄の玉座）と同じ調の重い行進を、挑む側の歩幅で：金管が膝を折らない主題を吹き、二巡目から合唱、三巡目で歪んだ刻みが足される。
// 音の大きさの倍率（D.MIX）は、tools/loudness.mjs と同じ測り方でこの曲だけ測って書いた（s4_mix.js は書き換えない）。レーン S（音）
(function (G) {
  const D = (G.data = G.data || {});
  const B = (D.BGM = D.BGM || { TRACKS: {}, SCENES: {} });
  const mel = [
    "1 - - - - - - - 5 - - - 4 - 3 -", "2 - - - - - 1 - 7, - - - - - - -", "4 - - - - - 3 - 2 - - - 1 - - -", "6 - - - 5 - - - 7, - - - - - - -",
    "1' - - - - - - - 7 - - - 6 - - -", "b2' - - - - - - - 1' - - - 6 - - -", "5 - - - 6 - 7 - 1' - - - 7 - 5 -", "1' - - - - - - - . . . . . . . .",
  ];
  B.TRACKS.s6_ap_saga_graw = {
    name: "膝を折らぬ者", mood: "黒い鎧の玉座へ、挑む側の歩幅で進む行進。低音が一歩ずつ踏みしめ、金管が膝を折らない主題を吹く。二巡目から合唱が重なり、三巡目で歪んだ刻みが鎧を叩く", scene: "apostle",
    key: 50, scale: "harm", bpm: 126, meter: 16, bars: 24, wet: 0.33, gain: 0.6,
    prog: ["1", "1", "4m", "4m", "6M", "6M", "5D", "5D", "1", "b2M", "4m", "5D", "6M", "4m", "b2M", "5D", "1", "1", "6M", "6M", "4m", "b2M", "5D", "5D"],
    parts: [
      { inst: "bass", kind: "chord", oct: -1, vol: 0.5, pat: ["0 . . 0 0 . . . 0 . . 0 0 . 0 ."] },
      { inst: "strings", kind: "pad", oct: 0, vol: 0.3, center: 5 },
      { inst: "brass", kind: "mel", oct: 0, vol: 0.5, pan: 0.15, mel },
      { inst: "choir", kind: "mel", oct: 1, vol: 0.38, pan: -0.1, on: [[8, 24]], mel },
      { inst: "guitar", kind: "chord", oct: -1, vol: 0.34, fx: "drive", power: true, pan: -0.2, on: [[16, 24]], pat: ["x! . . . x . . . x! . . . x . x ."] },
      { kind: "drum", vol: 0.6, pat: ["K . . . S . . . K . K . S . . .", "K . . . S . . . K . K . S . c c", "K . . . S . . . K . K . S . . .", "N . . k S . k k K . k k S S S S"] },
    ],
  };
  B.ROUTES = Object.assign(B.ROUTES || {}, { "apostle@saga_graw": ["s6_ap_saga_graw"] });
  // 音の大きさ（tools/loudness.mjs と同じ測り方。狙いは BGM の TARGET）
  const M = D.MIX;
  if (M && M.BGM && M.MEASURED && M.MEASURED.bgm) {
    M.BGM.s6_ap_saga_graw = 1.23;
    M.MEASURED.bgm.s6_ap_saga_graw = -26;
  }
})(globalThis.G = globalThis.G || {});
