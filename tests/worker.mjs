// tests/run.mjs が並べて動かす仕事（tests/core.mjs の節・tests/checks/<名前>.mjs・釣り合いの測定と q2 の遊ぶ回）。
// 仕事の一覧は共有の数え札（SharedArrayBuffer）で取り合うので、親の手が空いていなくても次の仕事に移れる。
// 出力は貯めて、失敗の数・かかった時間と一緒に返す。並べ直して出すのは run.mjs（名前順）。
import { parentPort, workerData, isMainThread } from "node:worker_threads";
import { loadEngine, seeded } from "./lib.mjs";
import { playGames } from "./balance.mjs";
import { runSection } from "./core.mjs";

// 一つの仕事を動かす。console.log を横取りして出力を貯める
export async function runTask(task) {
  const lines = [];
  const log0 = console.log;
  console.log = (...a) => { lines.push(a.map(String).join(" ")); };
  let failures = 0, data = null;
  const played = (globalThis.__played = []); // check が tests/balance.mjs の playGames で遊んだ結果（run.mjs が釣り合いの測定に使い回す）
  const t0 = performance.now();
  try {
    if (task.kind === "core") {
      // run.mjs の 1〜2c と保存の鍵（tests/core.mjs）。例外で止まったら、前は run.mjs ごと止まっていた。今は失敗として数える
      try { failures += runSection(task.name); } catch (e) { failures++; console.log(`FAIL ${task.name}: 例外 ${e.stack || e}`); }
    } else if (task.kind === "check") {
      const n = task.name;
      const fail = (msg) => { failures++; console.log("FAIL " + msg); };
      const ok = (msg) => console.log("OK   " + msg);
      try {
        const mod = await import(new URL("./checks/" + n, import.meta.url));
        await mod.default({ G: loadEngine(), fail: (m) => fail(`${n}: ${m}`), ok, loadEngine, seeded });
      } catch (e) {
        fail(`${n}: 例外 ${e.stack || e}`);
      }
      if (!failures) ok(`tests/checks/${n}`);
    } else if (task.kind === "balance") {
      // 釣り合いの測定の一部（一つの遊び方・一つの職業）。種は職業ごとに決まっているので、分けても数字は同じ
      try {
        data = playGames({ mode: task.mode, games: task.games, steps: task.steps, seed: task.seed, classes: [task.cls], start: task.start || 0 });
      } catch (e) {
        data = { error: String(e.stack || e) };
      }
    }
  } finally {
    console.log = log0;
    globalThis.__played = null;
  }
  return { lines, failures, data, played: task.kind === "check" ? played : [], ms: performance.now() - t0 };
}

// 数え札から次の仕事を取って、無くなるまで動かす
export async function drain(tasks, counter, done) {
  for (;;) {
    const i = Atomics.add(counter, 0, 1);
    if (i >= tasks.length) return;
    done(i, await runTask(tasks[i]));
  }
}

if (!isMainThread && workerData?.tasks) {
  await drain(workerData.tasks, new Int32Array(workerData.counter), (i, r) => parentPort.postMessage({ i, ...r }));
  parentPort.postMessage({ end: true }); // 確認が残したタイマーで終われなくても、親が止める
}
