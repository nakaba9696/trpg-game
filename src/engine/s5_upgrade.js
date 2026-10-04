// S5：古いセーブ（能力値が成功率の尺度 0〜99）を読み込むとき、点に読み替える（G.s5Upgrade。core.js）。
// 読み込みの入口（q7_slots.js の G.loadEntry・main.js の adopt）はどちらも G.fixOldNames を呼ぶので、それを包む。レーン C（S5）
(function (G) {
  const fix0 = G.fixOldNames;
  G.fixOldNames = (S) => {
    G.s5Upgrade(S);
    return fix0 ? fix0(S) : S;
  };
})(globalThis.G = globalThis.G || {});
