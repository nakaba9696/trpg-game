// U36：右上の「システム」に「データのリセット」を足す（今まではタイトルだけ。持ち主の声「システムを見ても更新履歴しか表示されない」の直しと一緒に）。
// 押すと U35 の窓（ui/zzzzzzzz_u35_reset.js の G.u35.open）を開く。消す前に二度確かめるのは U35 のまま。並べる順は zz_q7_topbar.js の SYSTEM。
// 一覧が更新履歴しか見えなかったわけ：PC の右上の窓（.top .tools）に backdrop-filter があり、その中の position: fixed の一覧が窓に対して置かれ、窓（overflow: auto）で切れていた。
// 直しは ui/zzzzzzzzz_u36_system.css（ぼかしを窓の ::before に移す）。名前の zzzzzzzzz_ で u35 の画面より後に読む。レーン U
(function (G) {
  if (typeof document === "undefined") return;
  const box = document.querySelector("#q7SystemBox");
  if (!box || document.querySelector("#u36SysReset")) return;
  const b = document.createElement("button");
  b.className = "btn u36reset";
  b.id = "u36SysReset";
  b.type = "button";
  b.textContent = "データのリセット";
  b.title = "セーブだけ、または全部を消す（二度確かめる）";
  b.onclick = () => { if (G.u35 && G.u35.open) G.u35.open(); };
  box.append(b);
})(globalThis.G = globalThis.G || {});
