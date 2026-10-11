// E6：町の人も、人の手に負えない化け物を「使徒」と呼ぶ（ギルドと教会だけではない）。「あれ」と呼ぶ決まりはやめた
// - 誰もがそう呼ぶので、「ギルドも教会も町の人も」と呼び手を並べない（E7 の続き）
// - 手引き・導入・用語・GM 向けの基調が、町の人は「使徒」と呼ぶと書いている
// - 出来事・噂・注意書きで、使徒を「あれ」という名前で呼んでいない（「あれ」と呼ぶ・「あれ」が空を渡る・あれの通った跡 など）。
//   人が目の前のものを指す「あれ」はふつうの言葉なのでよい
import { readFileSync, readdirSync } from "node:fs";

const ROOT = new URL("../../src/", import.meta.url);
const OLD = /「あれ」と呼|「あれ」が|「あれ」の|「あれ」とは|あれの(通|縄張)|あれ、通過|住人の言う「あれ」/;

export default ({ fail, ok, loadEngine }) => {
  let failures = 0;
  const bad = (m) => { failures++; fail(m); };
  let files = 0;
  for (const dir of ["data", "engine"]) {
    for (const f of readdirSync(new URL(dir + "/", ROOT))) {
      if (!f.endsWith(".js") || f === "changelog.js") continue; // 更新履歴は前の決まりを説明してよい
      files++;
      readFileSync(new URL(`${dir}/${f}`, ROOT), "utf8").split("\n").forEach((line, i) => {
        const code = line.replace(/^\s*\/\/.*$/, "");
        const m = code.match(OLD);
        if (m) bad(`使徒の呼び方: ${dir}/${f}:${i + 1} に「${m[0]}」（町の人も「使徒」と呼ぶ）`);
      });
    }
  }
  const G = loadEngine();
  const D = G.data;
  const all = JSON.stringify([D.WORLD || null, D.LORE_GM || null]);
  // 誰もが使徒と呼ぶのが当たり前なので、呼び手を「ギルドと教会は」と限ったり、「ギルドも教会も町の人も」と並べたりしない（持ち主「みんな呼んでるんだからおかしくない？」）
  const LIMIT = /ギルド(と|や)教会(は|が)(それを)?「?使徒|(ギルド|教会|町の人|住人|庶民)も[^。]{0,12}(も)?[^。]{0,6}「?使徒」?と呼/;
  const intro = JSON.stringify([D.WORLD || null, D.LORE_GM || null, D.PROLOGUE || null, D.LORE || null]);
  if (LIMIT.test(intro)) bad(`使徒の呼び方: 呼び手を限る・並べる書き方が残っている（${intro.match(LIMIT)[0]}）`);
  if (!/使徒/.test(all)) bad("使徒の呼び方: 手引きか GM 向けの説明に「使徒」が無い");
  if (failures === 0) ok(`使徒の呼び方（町の人も「使徒」と呼ぶ。${files} ファイル）`);
};
