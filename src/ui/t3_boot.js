// T3：読み込み中の知らせ（src/index.html の #boot）を、コードが動き出したら消す。レーン T
(function () {
  if (typeof document === "undefined") return;
  const b = document.getElementById("boot");
  if (b) b.remove();
})();
