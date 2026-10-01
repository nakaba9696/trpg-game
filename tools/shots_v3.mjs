// V3：モンスターと人物の絵の一覧を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_v3.mjs <前につける名前（before / after）>
// docs/shots/v3/<名前>_monsters.png と <名前>_people.png を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const tag = process.argv[2] || "after";
const K = Number(process.argv[3]) || 1; // 拡大（細部を見るとき）
const ONLY = process.argv[4] ? process.argv[4].split(",") : null; // 一部だけ
const FOES = ["goblin", "barrelgob", "wolf", "slime", "orc", "spider", "wyvern", "mimic", "blackknight", "chimera", "bonedragon", "graw"];
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(new URL("../dist/morsveld.html", import.meta.url).pathname).href);
await page.waitForFunction(() => window.G && G.paintMonster && G.drawPortrait);
const sheet = async (kind) => {
  const data = await page.evaluate(({ kind, FOES, K, ONLY }) => {
    const P = G.data.C2_PEOPLE || {};
    const who = (id) => Object.assign({ name: P[id].name }, P[id].who);
    const PEOPLE = [who("nora"), who("sheila"), who("rui"), who("zerina"), who("elnea"), who("natalia"), who("dil"), who("kaidel"), who("valeon"), who("valg"), who("malvina"), who("doctor"),
      { kind: "majin", seed: "v3:majin", name: "使徒（人の姿）" },
      { kind: "rogue", sex: "女", age: 22, seed: "v3:cat", name: "猫の獣人（盗賊）", look: { beast: "cat", ears: "none", hair: "#2a2420", outfit: "cloak", gear: "daggers" } },
      { kind: "soldier", sex: "男", age: 40, seed: "v3:bear", name: "熊の獣人（兵士）", look: { beast: "bear", ears: "none", hair: "#5a3a22", build: "broad", marks: ["beard"] } },
      // ここから下は確かめ用（既定の一覧には出さない。ONLY に番号を書く）
      { kind: "child", seed: "v3:c1", name: "子ども" }, { kind: "elder", seed: "v3:e1", name: "老人" }, { kind: "priest", seed: "v3:p1", name: "神官" }, { kind: "knight", seed: "v3:k1", sex: "女", name: "騎士" },
      { kind: "ronin", seed: "v3:r1", name: "八雲の人" }, { kind: "host", seed: "v3:h1", name: "宿の主" }, { kind: "mage", seed: "v3:m1", name: "魔法使い" }, { kind: "beggar", seed: "v3:b1", name: "物乞い" },
      { kind: "hero", cls: "samurai", seed: "v3:hs", sex: "男", age: 30, name: "主人公（侍）" }, { kind: "adventurer", seed: "v3:fox", sex: "女", name: "狐の獣人", look: { beast: "fox", ears: "none", hair: "#c86a2a" } },
      { kind: "villager", seed: "v3:rab", sex: "女", name: "兎の獣人", look: { beast: "rabbit", ears: "none", hair: "#e8e0d8" } }, { kind: "sailor", seed: "v3:bird", name: "鳥の獣人", look: { beast: "bird", ears: "none", hair: "#3a5a8a" } }];
    let list0 = kind === "monsters" ? FOES.map((id) => ({ id, name: G.data.ENEMIES[id].name })) : PEOPLE;
    let list = kind === "monsters" ? list0 : list0.slice(0, 12);
    if (ONLY) list = kind === "monsters" ? ONLY.filter((id) => G.data.ENEMIES[id]).map((id) => ({ id, name: G.data.ENEMIES[id].name })) : list0.filter((p, i) => ONLY.includes(String(i)));
    const cols = Math.min(list.length, kind === "monsters" ? 4 : 6), cw = (kind === "monsters" ? 280 : 180) * K, ch = 250 * K, lab = 24;
    const rows = Math.ceil(list.length / cols);
    const cv = document.createElement("canvas");
    cv.width = cols * cw; cv.height = rows * (ch + lab);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#15121a"; ctx.fillRect(0, 0, cv.width, cv.height);
    list.forEach((it, i) => {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + lab);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.clip();
      if (kind === "monsters") {
        const g = ctx.createLinearGradient(0, y, 0, y + ch); g.addColorStop(0, "#4a4a5a"); g.addColorStop(0.75, "#3a3430"); g.addColorStop(1, "#2a2420");
        ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
        ctx.translate(x, y);
        const e = G.data.ENEMIES[it.id];
        G.paintMonster(ctx, cw / 2, ch * 0.97, ch * (e.boss ? 0.78 : 0.58), { id: it.id, shape: e.shape, eye: e.eye, boss: !!e.boss });
      } else {
        const c = document.createElement("canvas"); c.width = cw - 8; c.height = ch - 8;
        c.getBoundingClientRect = () => ({ width: 0, height: 0 });
        G.drawPortrait(c, it);
        ctx.drawImage(c, x + 4, y + 4);
      }
      ctx.restore();
      ctx.fillStyle = "#e8e0d0"; ctx.font = "14px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(it.name || it.id, x + cw / 2, y + ch + 17);
    });
    return cv.toDataURL("image/png");
  }, { kind, FOES, K, ONLY });
  const fs = await import("node:fs");
  const out = new URL(`../docs/shots/v3/${tag}_${kind}.png`, import.meta.url);
  fs.writeFileSync(out, Buffer.from(data.split(",")[1], "base64"));
  console.log("wrote", out.pathname);
};
const which = process.argv[5] || "both";
if (which !== "people") await sheet("monsters");
if (which !== "monsters") await sheet("people");
await browser.close();
