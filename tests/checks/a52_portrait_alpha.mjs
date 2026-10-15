// IMG-52：人物の立ち絵（assets/portraits/*.webp）は、どれも透明つき（VP8X の透明の印と ALPH の塊がある）
// 背景が抜けていない白い地の絵が混ざると、顔の窓や地の色を変えたときに白い四角が出る（持ち主「背景透過できてる？色変えても白のまま」）
import { readFileSync, readdirSync } from "node:fs";

function webpInfo(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunks = [];
  let alphaFlag = false;
  for (let i = 12; i + 8 <= buf.length;) {
    const t = buf.toString("ascii", i, i + 4), len = buf.readUInt32LE(i + 4);
    chunks.push(t);
    if (t === "VP8X") alphaFlag = !!(buf[i + 8] & 0x10);
    i += 8 + len + (len & 1);
  }
  return { chunks, alphaFlag };
}

export default ({ fail, ok }) => {
  const dir = "assets/portraits/";
  const files = readdirSync(dir).filter((f) => f.endsWith(".webp"));
  const bad = [];
  for (const f of files) {
    const w = webpInfo(readFileSync(dir + f));
    // 透明つきの webp は、VP8X の透明の印があり、ALPH の塊（有損）か VP8L（無損）を持つ
    if (!w || !w.alphaFlag || !(w.chunks.includes("ALPH") || w.chunks.includes("VP8L"))) bad.push(f);
  }
  if (bad.length) fail(`A52 透明の無い立ち絵が ${bad.length} 枚：${bad.slice(0, 12).join("・")}${bad.length > 12 ? " ほか" : ""}（背景を抜く。tools は docs/art/orig_fix/basecut.py）`);
  else ok(`A52 立ち絵 ${files.length} 枚が、どれも透明つき`);
};
