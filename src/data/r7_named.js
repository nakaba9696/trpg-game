// R7：シグルンとの最初の会話の続きの席（f2_majin_2q）を、元の場面（f2_majin_2）と同じ扱いに。
// 名のある人の表（r5_named.js）と場面の背景の表（r5_scenes.js）は書き換えずに足す。レーン A（R7）
(function (G) {
  const D = (G.data = G.data || {});
  const sig = D.R5_NAMED && D.R5_NAMED.sigrun;
  if (sig && !sig.events.includes("f2_majin_2q")) sig.events.push("f2_majin_2q");
  D.R5_EVENT_SCENE = Object.assign(D.R5_EVENT_SCENE || {}, { f2_majin_2q: "tavern" });
})(globalThis.G = globalThis.G || {});
