// U35：データのリセットの窓（タイトルの「データのリセット」から）。消す処理は engine/zzzzzzzz_u35_reset.js の G.resetData。
// 二段階：消すものを選ぶ →「本当に消しますか」→ もう一度押す。消したらタイトルへ。レーン U
(function (G) {
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const u35 = (G.u35 = {});
  const ls = () => { try { return window.localStorage; } catch { return null; } };

  u35.open = () => {
    const dlg = h("dialog", "u35dlg");
    const close = () => { try { dlg.close(); } catch {} dlg.remove(); };
    dlg.addEventListener("cancel", () => dlg.remove());
    const body = h("div", "u35body");
    dlg.append(body);
    const btn = (label, cls, fn) => { const b = h("button", "btn" + (cls ? " " + cls : ""), label); b.type = "button"; b.onclick = fn; return b; };
    const list = (title, items, to) => { if (!items.length) return; to = to || body; to.append(h("p", "fine u35h", title)); const u = h("ul", "u35ul"); items.forEach((t) => u.append(h("li", "", t))); to.append(u); };

    const pick = () => {
      body.textContent = "";
      body.append(h("h2", "", "データのリセット"), h("p", "fine", "消したものは元に戻せない。"));
      ["saves", "all"].forEach((id) => {
        const sc = G.RESET_SCOPES[id];
        const box = h("div", "u35opt");
        box.append(h("b", "", sc.label));
        list("消えるもの", sc.erase, box);
        list("残るもの", sc.keep, box);
        box.append(btn(sc.label + "…", id === "all" ? "danger" : "", () => confirm1(id)));
        body.append(box);
      });
      body.append(btn("やめる", "", close));
    };
    const confirm1 = (id) => {
      body.textContent = "";
      const sc = G.RESET_SCOPES[id];
      body.append(h("h2", "", "本当に消しますか"), h("p", "", sc.label));
      list("消えるもの", sc.erase);
      list("残るもの", sc.keep);
      body.append(btn("やめる", "", pick), btn("消す（取り消せない）", "danger", () => confirm2(id)));
    };
    const confirm2 = (id) => {
      body.textContent = "";
      body.append(h("h2", "", "もう一度確かめます"), h("p", "", "押すとすぐに消える。" + G.RESET_SCOPES[id].label + "。"));
      body.append(btn("やめる", "", close), btn("いま消す", "danger", () => run(id)));
    };
    const run = async (id) => {
      const st = G.main && G.main.store;
      G.resetData(ls(), id, st && st.remote ? (n, d) => st.remote(n, d) : null);
      close();
      if (id === "all") {
        // 設定も初期に戻すため、claude.ai への削除が済むのを少し待って読み込み直す（タイトルに戻る）
        try { await Promise.race([Promise.all(Object.values((st && st.chains) || {})), new Promise((r) => setTimeout(r, 1500))]); } catch {}
        try { location.reload(); return; } catch {}
      }
      if (G.main && G.main.toTitle) G.main.toTitle();
    };
    pick();
    document.body.append(dlg);
    try { dlg.showModal(); } catch { dlg.setAttribute("open", ""); }
  };
})(globalThis.G = globalThis.G || {});
