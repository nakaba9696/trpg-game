// A20：tools/a20/a20_gaps.py が呼ぶ、ゲームの白抜き（G.a13.keyOut）を node で動かす働き手
// stdin: frames [u32 W][u32 H][u8 bottom][W*H*4 RGBA]; stdout: [f64 r][W*H*4 RGBA keyed]
import { readFileSync } from "node:fs";
import vm from "node:vm";
const ctx = { globalThis: {} }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../../src/ui/a13_cutout.js", import.meta.url), "utf8"), ctx);
const keyOut = ctx.G.a13.keyOut;
let buf = Buffer.alloc(0);
process.stdin.on("data", (d) => {
  buf = Buffer.concat([buf, d]);
  for (;;) {
    if (buf.length < 9) return;
    const W = buf.readUInt32LE(0), H = buf.readUInt32LE(4), bottom = buf[8];
    const need = 9 + W * H * 4;
    if (buf.length < need) return;
    const px = new Uint8ClampedArray(buf.subarray(9, need));
    buf = buf.subarray(need);
    const r = keyOut(px, W, H, { bottom: !!bottom });
    const h = Buffer.alloc(8); h.writeDoubleLE(r, 0);
    process.stdout.write(Buffer.concat([h, Buffer.from(px.buffer)]));
  }
});
