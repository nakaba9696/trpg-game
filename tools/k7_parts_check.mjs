// K7 の型の掛け合いの部品を確かめる（書いている途中の確認用）。node tools/k7_parts_check.mjs [id ...]
import { loadEngine } from "../tests/lib.mjs";
const G = loadEngine();
const D = G.data;
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(D.C2_PEOPLE).filter((k) => D.C2_PEOPLE[k].join);
let bad = 0;
const BANNED = /見世物|観客|客席|舞台|台本|言霊|神々|魔王|魔人|正体|もういない|胸|体つき/;
const OK_TAGS = ["{o}", "{you}", "{foe}", "{dead}", "{place}"];
for (const id of ids) {
  const p = (D.TALK_PARTS || {})[id];
  if (!p) { console.log(`NG ${id}: 部品が無い`); bad++; continue; }
  if (!["kid", "young", "mid", "old"].includes(p.gen)) { console.log(`NG ${id}: gen が無い`); bad++; }
  if (typeof p.drink !== "boolean") { console.log(`NG ${id}: drink が無い`); bad++; }
  for (const k of G.tk.PART_KEYS) {
    const l = [].concat(p[k] || []);
    if (!l.length) { console.log(`NG ${id}.${k}: 無い`); bad++; }
    for (const s of l) {
      if (typeof s !== "string" || !s.trim()) { console.log(`NG ${id}.${k}: 空`); bad++; continue; }
      for (const t of s.match(/\{[^}]*\}/g) || []) if (!OK_TAGS.includes(t)) { console.log(`NG ${id}.${k}: 知らない置き換え ${t}`); bad++; }
      if (BANNED.test(s)) { console.log(`NG ${id}.${k}: 書かない言葉「${s.match(BANNED)[0]}」：${s}`); bad++; }
      if (/[「」]/.test(s)) { console.log(`NG ${id}.${k}: 「」は書かない（仕組みが付ける）：${s}`); bad++; }
    }
  }
}
console.log(bad ? `NG ${bad}` : `OK ${ids.length} 人`);
