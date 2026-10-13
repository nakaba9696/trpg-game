// 背景の絵（V2）：明けずの町カルヴァス（src/data/v17a_karvas.js）。いつも夜で、空に赤い月。帝国の雪の町の絵に、坂の上の館と灯りの窓を一つ重ねる。
// 赤い月は先に描き（家並みが手前に重なる）、ふつうの月は描かない（moon: true）。時間帯は夜に固定（phase: 3）。乱数は使わない。レーン A（絵）と W（場所）
(function (G) {
  const V = G.SV2;
  if (!V || !V.OUT) return;
  const OUT = V.OUT;
  OUT.karvas = (P) => {
    const { ctx, u, w, hz } = P;
    V.moon(P, w * 0.74, hz - u * 26, u * 5, "#c8382a");
    if (OUT.snowcity) OUT.snowcity(P); else if (OUT.town) OUT.town(P);
    // 坂の上の館（黒い影）と、二階の端の灯り
    const x = w * 0.18, b = hz - u * 2;
    ctx.fillStyle = "#14101a";
    ctx.fillRect(x - u * 7, b - u * 9, u * 14, u * 9);
    ctx.beginPath(); ctx.moveTo(x - u * 8, b - u * 9); ctx.lineTo(x, b - u * 14); ctx.lineTo(x + u * 8, b - u * 9); ctx.fill();
    ctx.fillStyle = "#ffcf7a"; ctx.fillRect(x + u * 4, b - u * 7.5, u * 1.2, u * 1.6);
    V.light(P, x + u * 4.6, b - u * 6.7, u * 5, "#ffcf7a", 0.9, true);
    // 赤い月の照り返し（空の下のほう）
    const g = ctx.createLinearGradient(0, hz - u * 30, 0, hz);
    g.addColorStop(0, V.rgba("#c8382a", 0)); g.addColorStop(1, V.rgba("#c8382a", 0.14));
    ctx.fillStyle = g; ctx.fillRect(0, hz - u * 30, w, u * 30);
  };
  OUT.karvas.phase = 3;
  OUT.karvas.moon = true;
})(globalThis.G = globalThis.G || {});
