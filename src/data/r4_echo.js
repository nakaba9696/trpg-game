// R4：選んだことが返ってきたとき（F4 の返りの出来事）、年表に一行。出来事に echoChron が書いてあればそちらを使う（F2b の因縁の続き）。
// {name} は覚えの名（D.ECHO_KEYS の name。「スリの子を見逃した」のような、したことの形）、{at} 覚えた町、{here} 返ってきた町。仕組みは src/engine/zzzzzzzzzzzz_r4_echo.js。レーン C＋V（R4）
(function (G) {
  const D = (G.data = G.data || {});
  D.R4_ECHO_CHRON = {
    far: "{at}で{name}ことが、{here}で返ってくる",
    here: "{here}で{name}ことが、返ってくる",
  };
})(globalThis.G = globalThis.G || {});
