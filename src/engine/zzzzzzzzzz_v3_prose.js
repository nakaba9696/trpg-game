// V3：物語が進む場面を、数段落の文で書けるようにする（持ち主「つねに語り口調ではなく、物語が進むところはしっかりテキストを書いて大丈夫です」）。レーン V
//   ・語りの文（G.log の "nar"）に改行があれば、段落ごとに別の行として記録する（画面では一段落が一つの <p>。台詞の話し手の印〔U11〕も段落ごとに付く）
//   ・既存の出来事の文を、元のファイルを書き換えずに差し替える表 D.V3_PROSE（src/data/zv3_prose_*.js）を、読み込んだときに当てはめる
//       D.V3_PROSE[出来事の id] = { text（出来事の頭の文）, choices: { [選択肢の label]: { ok, ng, win, "ok.win", "ng.win" } } }
//       D.V3_PROSE_AT[D から辿る道（"E3.LIST.levian.win.text"・配列の中は "M6.MILESTONES.[id=majin].text"）] = 文　出来事でない表の文
//       値は文字列（段落は空行で区切る）。当てはまらなかったもの（id・label・結果が無い）は G.v3prose.missing に残し、テストが落とす
//   ・山場（盛り上げる場面・重要な場面）の印：D.V3_PROSE の peak: true の場面と、D.V3_PROSE_AT の文は山場。
//       その段落の記録に peak: true を付け、山場の出来事の見出しにも付ける。画面（src/ui/zv3_peak.js）がそれを読んで、大きめの見出しと、間を置いて一段ずつ出す
// 名前の頭の zzzzzzzzzz は、G.log を包むほかのファイル（u11 の話し手の印など）より後に読ませ、段落に分けてから渡すため。
(function (G) {
  const D = G.data;
  const V3 = (G.v3prose = G.v3prose || {});

  // ---------------------------------------------------------------- 段落に分ける
  V3.paras = (t) => String(t == null ? "" : t).split(/\n+/).map((s) => s.trim()).filter(Boolean);
  // 段落の頭が台詞のとき、前の段落の終わりの地の文（「ロデリクは振り向いた。」）を添えて話し手を決め直す（U11 の印。一続きの文だったときと同じ見方）
  V3.carry = (S, prev, e) => {
    const SP = G.u11sp;
    if (!SP || !SP.speakersOf || !/[「『]/.test(String(e.text || ""))) return;
    const pt = String(prev.text || "");
    const tail = pt.slice(Math.max(pt.lastIndexOf("」"), pt.lastIndexOf("』")) + 1);
    const sents = tail.split("。").filter((s) => s.trim());
    if (!sents.length) return;
    try {
      const list = SP.speakersOf(sents[sents.length - 1] + "。" + e.text, SP.candidates(S), SP.eventWho(S));
      if (!list.length) return;
      e.speaker = list[list.length - 1];
      const uniq = [...new Set(list)];
      if (uniq.length > 1) e.speakers = uniq; else delete e.speakers;
    } catch (x) { /* 印が付けられなくても、記録は止めない */ }
  };
  // 山場の段落（差し込みを埋める前の形）と、今が山場の出来事の中か
  V3.peakSet = V3.peakSet || new Set();
  V3.peakNow = () => {
    const S = G.S;
    if (!S || S.mode !== "event" || !S.event) return false;
    const e = (D.EVENTS || []).find((x) => x.id === S.event);
    return !!(e && e.v3peak);
  };
  const log0 = G.log;
  if (log0 && !log0.v3) {
    G.log = (k, text, extra) => {
      if (k === "title" && V3.peakNow()) extra = Object.assign({}, extra, { peak: true });
      if (k === "nar" && typeof text === "string" && !text.includes("\n") && V3.peakSet.has(text.trim())) extra = Object.assign({}, extra, { peak: true });
      if (k === "nar" && typeof text === "string" && text.includes("\n")) {
        const ps = V3.paras(text);
        const S = G.S;
        let r, prev = null;
        ps.forEach((p) => {
          const before = S && S.log ? S.log[S.log.length - 1] : null;
          r = log0(k, p, V3.peakSet.has(p) ? Object.assign({}, extra, { peak: true }) : extra);
          const e = S && S.log ? S.log[S.log.length - 1] : null;
          if (!e || e === before) return;
          if (prev) V3.carry(S, prev, e);
          prev = e;
        });
        return r;
      }
      return log0(k, text, extra);
    };
    G.log.v3 = true;
  }

  // ---------------------------------------------------------------- 文の差し替え
  // 結果の道（"ok"・"ng.win" など）をたどって、文を置き換える。たどれなければ false
  const setAt = (c, path, text) => {
    const keys = path.split(".");
    let o = c;
    for (const k of keys) { if (!o || typeof o !== "object") return false; o = o[k]; }
    if (!o || typeof o !== "object" || typeof o.text !== "string") return false;
    o.text = text;
    return true;
  };
  // 道の一歩：ふつうは鍵。「[id=majin]」なら、配列の中で id が majin のもの（並びが変わっても外れない）
  V3.step = (o, k) => {
    if (!o || typeof o !== "object") return undefined;
    const m = /^\[(\w+)=([^\]]+)\]$/.exec(k);
    if (m) return Array.isArray(o) ? o.find((x) => x && String(x[m[1]]) === m[2]) : undefined;
    return o[k];
  };
  V3.apply = () => {
    const missing = [];
    const byId = new Map((D.EVENTS || []).map((e) => [e.id, e]));
    Object.entries(D.V3_PROSE || {}).forEach(([id, p]) => {
      const e = byId.get(id);
      if (!e) { missing.push(`${id}：出来事が無い`); return; }
      if (p.text) e.text = p.text;
      if (p.peak) { e.v3peak = true; if (p.text) V3.paras(p.text).forEach((x) => V3.peakSet.add(x)); }
      Object.entries(p.choices || {}).forEach(([label, outs]) => {
        const c = (e.choices || []).find((x) => x.label === label);
        if (!c) { missing.push(`${id}「${label}」：選択肢が無い`); return; }
        Object.entries(outs).forEach(([path, text]) => {
          // 選択肢の頭の win（c.win）は、ok の中の win と同じ扱い
          const ok = setAt(c, path, text) || (path === "win" && setAt(c, "ok.win", text));
          if (!ok) missing.push(`${id}「${label}」${path}：結果が無い`);
          else if (p.peak) V3.paras(text).forEach((x) => V3.peakSet.add(x));
        });
      });
    });
    // 出来事でない表の文（使徒を討ったときの文など）：D.V3_PROSE_AT["E3.LIST.levian.win.text"] = 文。D から辿る
    Object.entries(D.V3_PROSE_AT || {}).forEach(([path, text]) => {
      const keys = path.split(".");
      let o = D;
      for (const k of keys.slice(0, -1)) o = V3.step(o, k);
      const last = keys[keys.length - 1];
      if (!o || typeof o !== "object" || !(typeof o[last] === "string" || Array.isArray(o[last]))) { missing.push(`${path}：文が無い`); return; }
      o[last] = Array.isArray(o[last]) ? [text] : text;
      V3.paras(text).forEach((x) => V3.peakSet.add(x));
    });
    V3.missing = missing;
    return missing;
  };
  V3.apply();
})(globalThis.G = globalThis.G || {});
