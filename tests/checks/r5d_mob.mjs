// R5d：一度きりの町の人（src/data/r5d_mob.js の mob）は汎用のモブ絵（型の絵）を使う（持ち主「依頼人も汎用モブ絵の使い回しでよい。名ありと立ち絵が被るのはやめて」）
// - mob の人は名のある人のまま（札は名前）で、G.r5.artId が ""。絵の鍵は型（kind_）か、合う型が無ければ絵なし。専用の絵（<id>.webp）があっても使わない
// - mob でない表の人（シグルン・ロデリク・ペルゴ・ケイル・糸の使徒の筋の人）は今のまま、専用の絵だけ
// - 描き直し待ち・まだ描いていない型は portraits.md の「画像のセッションへ」に、作る命令ごと載っている
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok }) => {
  const D = G.data;
  const errs = [];
  const F = (m) => { errs.push(m); fail("R5d " + m); };
  const root = new URL("../../", import.meta.url);
  const vmc = vm.createContext({ console, G, Image: class { addEventListener() {} } });
  for (const f of ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js"]) vm.runInContext(readFileSync(new URL("src/ui/" + f, root), "utf8"), vmc, { filename: "ui/" + f });
  const R = D.R5_NAMED || {};
  const mob = Object.keys(R).filter((id) => R[id].mob);
  if (mob.length < 20) F(`一度きりの町の人の mob が ${mob.length} 人しかいない`);
  for (const id of ["sigrun", "roderick", "pergo", "keil", "cornelius", "hilde"]) if (R[id] && R[id].mob) F(`筋の人 ${id} が mob（モブ絵）になっている`);
  // 絵はすべてあるふり（専用の絵も型も）
  G.ASSETS = new Proxy({}, { get: (t, k) => (typeof k === "string" && k.startsWith("portraits/") ? "x.webp" : undefined) });
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  let n = 0;
  for (const [id, p] of Object.entries(R)) {
    for (const e of p.events || []) {
      const x = ev(e);
      if (!x) continue;
      const w = G.eventWho(x);
      if (!w) continue;
      const k = G.v4PortraitKey(w);
      const tag = G.whoTag(w, null, e);
      if (!tag || tag.name !== p.name) F(`${e} の札が「${tag && tag.label}」（${p.name} にする）`);
      if (p.mob) { n++; if (G.r5.artId(w, e) !== "") F(`一度きりの町の人 ${id}（${e}）の artId が「${G.r5.artId(w, e)}」（"" にしてモブ絵）`); if (k && !/^kind_/.test(k)) F(`一度きりの町の人 ${id}（${e}）に型でない絵 ${k} が出る`); if (!k) F(`一度きりの町の人 ${id}（${e}）に、絵がすべてあっても型の絵が出ない`); }
      else if (k && k !== id) F(`筋の人 ${id}（${e}）に、その人のでない絵 ${k} が出る`);
    }
  }
  G.ASSETS = undefined;
  const md = readFileSync(new URL("docs/art/portraits.md", root), "utf8");
  const sec = (md.split("## 画像のセッションへ")[1] || "").split("\n## 名のある人物")[0];
  if (!sec) F("portraits.md に「画像のセッションへ」が無い（node tools/portraits.mjs）");
  else {
    const json = JSON.parse(readFileSync(new URL("docs/art/portraits.json", root), "utf8"));
    for (const p of json.portraits.filter((p) => p.redraw)) if (!sec.includes(p.id + ",") && !sec.includes(p.id + " ")) F(`「画像のセッションへ」の命令に描き直しの ${p.id} が無い`);
    for (const p of json.portraits.filter((p) => p.redraw)) if (/\b(vest|striped shirt|t-shirt|hoodie|jacket)\b/i.test(p.tags)) F(`描き直しの ${p.id} のタグに今の服に寄る語が残っている：${p.tags}`);
  }
  if (!errs.length) ok(`R5d 一度きりの町の人 ${mob.length} 人（出来事 ${n}）はモブ絵、筋の人は専用の絵だけ。描くものの一覧は portraits.md に命令ごと`);
};
