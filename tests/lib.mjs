// テストの共通部品：エンジンを DOM なしで読み込む・決まった乱数
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));

export function loadEngine() {
  const ctx = vm.createContext({ console });
  for (const f of manifest.engine) vm.runInContext(readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  return ctx.G;
}

// 決まった乱数（再現できるように）
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
