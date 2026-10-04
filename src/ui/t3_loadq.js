// T3：画像を読む順番（プレイヤーが待たされないように）。
// 立ち絵・魔物の絵・背景の写真は、先読み（暇なときに全部の魔物・人物のスプライトを読む・隣の町の背景など）と同じ回線を取り合う。
// 遅い回線では、いま要る絵が先読みの後ろに並んで何秒も待たされていた（初めて会った人の立ち絵が 10Mbps で 5.6 秒）。
// そこで、読む物に重さを付ける：0＝いま描く物（すぐ読む）、1＝もうすぐ要る物（今いる場所の魔物・仲間の差分）、2＝そのうち要るかもしれない物。
// 1・2 は一つずつ、いま描く物を読んでいないときだけ読む。並んでいる物がいま要るようになったら、すぐ読む（G.loadq.need）。
// スプライトにまとめること・先読みすること自体は変えない（順番だけ）。G.loadq が無ければ（テストなど）、今まで通りすぐ読む。
// 使う所：v4_assets.js（人物）・v6_monsters.js（魔物）・scene_v3_photo.js（背景）。レーン T
(function (G) {
  const Q = (G.loadq = G.loadq || {});
  const LOW_MAX = 1; // 先読みは一つずつ
  const STUCK = 8000; // いま描く物がこれより長く終わらなければ（回線の不調など）、先読みも進める
  const queue = []; // { img, src, pri }
  const urgent = new Set(); // 読んでいる「いま描く物」の img
  let lowIn = 0;
  let urgentSince = 0;
  const setPri = (img, p) => { try { img.fetchPriority = p; } catch (e) { /* 古いブラウザ */ } };

  function begin(img) {
    const s = img.__lq;
    s.state = "loading";
    if (s.pri === 0) { urgent.add(img); urgentSince = Date.now(); s.slot = "now"; } else { lowIn++; s.slot = "low"; }
    setPri(img, s.pri === 0 ? "high" : "low");
    const end = () => {
      if (s.state !== "loading") return;
      s.state = "done";
      if (s.slot === "now") urgent.delete(img); else lowIn--;
      pump();
    };
    img.addEventListener("load", end, { once: true });
    img.addEventListener("error", end, { once: true });
    img.src = s.src;
  }
  function pump() {
    const busy = urgent.size > 0 && Date.now() - urgentSince < STUCK;
    while (!busy && lowIn < LOW_MAX && queue.length) {
      queue.sort((a, b) => a.__lq.pri - b.__lq.pri);
      begin(queue.shift());
    }
    if (busy && queue.length) setTimeout(pump, STUCK);
  }
  // img に src を読ませる（pri：0 すぐ／1 もうすぐ／2 そのうち）
  Q.load = (img, src, pri) => {
    pri = pri | 0;
    img.__lq = { src, pri, state: "queued" };
    if (pri === 0) begin(img);
    else { queue.push(img); pump(); }
    return img;
  };
  // 並んでいる・読んでいる img を、もっと急ぐ物にする（0 ならすぐ読む）
  Q.need = (img, pri) => {
    const s = img && img.__lq;
    pri = pri | 0;
    if (!s || s.state === "done" || pri >= s.pri) return;
    s.pri = pri;
    if (s.state === "queued" && pri === 0) {
      const i = queue.indexOf(img);
      if (i >= 0) queue.splice(i, 1);
      begin(img);
    } else if (s.state === "loading" && pri === 0 && s.slot === "low") {
      // もう読み始めている先読み：急ぐ物として数え直す（読み直しはしない）
      lowIn--; s.slot = "now"; urgent.add(img); urgentSince = Date.now();
      pump();
    }
  };
  Q.state = () => ({ queued: queue.length, urgent: urgent.size, low: lowIn });
  // 画像を作って読む（三つのファイルの共通の入口）。G.loadq が無ければすぐ読む
  G.loadImage = (img, src, pri) => { if (G.loadq && G.loadq.load) G.loadq.load(img, src, pri); else img.src = src; return img; };
  G.needImage = (img, pri) => { if (img && G.loadq && G.loadq.need) G.loadq.need(img, pri); return img; };
})(globalThis.G = globalThis.G || {});
