// ブラウザに保存するときの鍵。題を Nochtara に変えたので、古い名前の鍵のセーブを新しい鍵へ移す。
// 古い名前は kotodama3（はじめ）→ morsveld（U2 #58）→ nochtara（今）。どの古い鍵からでも移る。
// storage は localStorage と同じ形（getItem・setItem・removeItem）。DOM には触らない。レーン U（UI）が管理
(function (G) {
  G.SAVE_KEYS = { save: "nochtara-save", profile: "nochtara-profile" };
  // 画面の好み（明暗・音）。画面のスクリプトが読む前に移せるよう、ここで鍵を決める
  G.PREF_KEYS = { theme: "nochtara-theme", sound: "nochtara-sound" };
  // 冒険（年表を含む）と、冒険をまたいで残るもの（トロフィー・墓碑・図鑑）。新しい名前ほど先に見る
  const OLD_KEYS = {
    save: ["morsveld-save", "kotodama3-save"],
    profile: ["morsveld-profile", "kotodama3-profile"],
    theme: ["morsveld-theme"],
    sound: ["morsveld-sound"],
  };

  // 新しい鍵が空で古い鍵にセーブがあれば、新しい鍵へ写して古い鍵を消す。移したものの名前を返す
  // 何度呼んでもよい（二度目からは何もしない）
  G.migrateSaveKeys = (storage) => {
    const moved = [];
    if (!storage) return moved;
    try {
      for (const [name, key] of Object.entries({ ...G.SAVE_KEYS, ...G.PREF_KEYS })) {
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
