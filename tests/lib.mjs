// テストの共通部品：エンジンを DOM なしで読み込む・決まった乱数
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import path from "node:path";
import { listFiles } from "../tools/files.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const { engine } = listFiles(root); // build.mjs と同じ順番

// 読んで組み立てた（コンパイルした）スクリプトは使い回す。中身は毎回新しい文脈で動かすので、エンジンは毎回まっさら
let scripts = null;
export function loadEngine() {
  scripts ||= engine.map((f) => new vm.Script(readFileSync(path.join(root, f), "utf8"), { filename: f }));
  const ctx = vm.createContext({ console });
  for (const s of scripts) s.runInContext(ctx);
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
