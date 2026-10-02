// ブラウザに保存するときの鍵。題を Morsveld に変えたので、古い名前の鍵のセーブを新しい鍵へ移す。
// storage は localStorage と同じ形（getItem・setItem・removeItem）。DOM には触らない。レーン U（UI）が管理
(function (G) {
  G.SAVE_KEYS = { save: "morsveld-save", profile: "morsveld-profile" };
  // 冒険（年表を含む）と、冒険をまたいで残るもの（トロフィー・墓碑）
  const OLD_KEYS = { save: ["kotodama3-save"], profile: ["kotodama3-profile"] };

  // 新しい鍵が空で古い鍵にセーブがあれば、新しい鍵へ写して古い鍵を消す。移したものの名前を返す
  G.migrateSaveKeys = (storage) => {
    const moved = [];
    if (!storage) return moved;
    try {
      for (const [name, key] of Object.entries(G.SAVE_KEYS)) {
        if (storage.getItem(key) !== null) continue;
        for (const old of OLD_KEYS[name]) {
          const v = storage.getItem(old);
          if (v === null) continue;
          storage.setItem(key, v);
          storage.removeItem(old);
          moved.push(name);
          break;
        }
      }
    } catch {}
    return moved;
  };
})(globalThis.G = globalThis.G || {});
