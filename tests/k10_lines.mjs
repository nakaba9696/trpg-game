// K10：仲間の台詞を集める（tests/checks/k10_voice.mjs と、直すときの洗い出しで使う）
// 台詞＝「」の中（掛け合い・部品の行は、行そのもの）。誰の台詞か・どの好感度から出るかを、データの置き場所から決める。
//   D.TALK[id]・D.R2.ARCS[id]・D.R2_PARTS[id]・D.TALK_PARTS[id]・D.C2_VOICE[id]・D.C2_INVITE[id]・D.Q9[id]・その人だけの話（c2talk）… その人
//   D.TALK_BANTER … 行の話し手（a / b / c）
//   仲間をひとり選ぶ出来事（m2.pick があり、c2 の無いもの）… だれでも（"*"）
// 同じ文字列の中に、ほかの人の台詞が混ざることがある（「…」{m}は言った・「…」とあなたが言う・あなたは「…」と言った）。
// 台詞の前後の地の文に、話し手らしい名前があれば、その人の台詞とする（無ければ、置き場所の人）。
// tests/ の直下に置く（tests/checks に置くと、確認として読まれてしまう）

const QUOTE = /「([^「」]*)」/g;
// 『』（入れ子も）を外す
export const stripInner = (s) => { let t = s, u; while ((u = t.replace(/『[^『』]*』/g, "〔…〕")) !== t) t = u; return t; };
// 地の文から話し手を推す。after は台詞のあと（「…」{n}は笑った）、before は台詞の前（{n}が言った。「…」）
function speakerNear(before, after, names, strict) {
  const nameOf = (str) => { for (const [who, list] of names) for (const nm of list) if (str.endsWith(nm)) return who; return null; };
  const a = after.replace(/^[、。…\s]*/, "");
  const head = /^と?\s*/.exec(a)[0];
  const rest = a.slice(head.length, head.length + 24);
  let A = null;
  for (const [who, list] of names) for (const nm of list) {
    if (!A && rest.startsWith(nm) && /^(は|が|も|の声|に|へ)/.test(rest.slice(nm.length))) A = who;
  }
  if (!A && head.startsWith("と")) {
    // 「…」と言う（選択肢の文）・「…」とあなたは言った
    if (/^(言|聞|返|答|頼|笑|怒鳴|叫|呼|告|誘|謝|声を|告げ|約束|ささや|つぶや)/.test(rest)) A = "you";
    else if (/^あなた/.test(rest)) A = "you";
  }
  if (!A && /^あなた(は|が)/.test(rest)) A = "?"; // 「…」あなたは〜（直前の台詞の主は分からない）
  // 台詞の前：同じ文の中（「Xが言った。」で切れていない）なら、その主。切れていれば、前の文の主
  let B = null;
  const tail = before.slice(-60);
  const inSentence = !/[。」]\s*$/.test(tail) && tail.trim() !== "";
  // 前の文に主が無ければ（「それから、手袋を畳み直した。」）、さらに前の文を見る（二つまで）
  const sents = (inSentence ? before.slice(-120) : before.slice(-120).replace(/[。」]\s*$/, "")).split(/[。」]/);
  let m = null;
  for (let i = sents.length - 1, n = 0; i >= 0 && n < 3 && !m; i--, n++) {
    m = /^\s*([^、。「」\s]{1,14}?)(は|が)/.exec(sents[i] || "");
    if (inSentence) break;
  }
  if (m) B = /あなた$/.test(m[1]) ? "you" : nameOf(m[1]) || "other";
  let who;
  if (inSentence && B) who = B;
  else if (strict) who = B || A; // 名の無い人がいる場面：前の文の主を先に見る（「老人は顔を上げた。「…」{n}は黙った」）
  else who = A || (B === "other" ? null : B);
  if (who === "?" || who === "other") return strict ? "?" : null;
  return who;
}

// 文字列 s の「」を取り出す。owner はその文字列の持ち主（話し手の既定）。
export function quotesOf(s, owner, names) {
  const out = [];
  if (typeof s !== "string") return out;
  s = stripInner(s); // 台詞の中の『』は、ほかの人の言葉の引き写し
  let m, last = 0;
  QUOTE.lastIndex = 0;
  while ((m = QUOTE.exec(s))) {
    const before = s.slice(last, m.index);
    const afterEnd = s.indexOf("「", m.index + m[0].length);
    const after = s.slice(m.index + m[0].length, afterEnd < 0 ? s.length : afterEnd);
    const sp = speakerNear(before, after, names, owner === null);
    out.push({ who: sp === null ? owner : sp === "?" ? null : sp, text: m[1] });
    last = m.index + m[0].length;
  }
  return out;
}

const LOVE = 30; // 恋の場面の目安（docs/romance.md：恋の話題は好感度 30〜）

// 好感度の段階の既定（docs/talk.md）
const GREET = { warm: 45, mid: 10, low: -19, cold: -100 };

// すべての台詞。{ who, min, src, text, love }
export function collectLines(G) {
  const D = G.data;
  const P = D.C2_PEOPLE || {};
  const ids = Object.keys(P).filter((id) => P[id].join);
  // 話し手の名前の表（{n} は持ち主・{m} {o} はほかの人）
  const namesFor = (owner, extra) => {
    const list = [];
    if (owner) list.push([owner, ["{n}", "{c}"]]);
    for (const [k, v] of Object.entries(extra || {})) list.push([v, [k]]);
    for (const id of ids) {
      const p = P[id];
      const nm = [p.name, p.short].filter(Boolean);
      list.push([id, nm]);
    }
    list.push(["mate", ["{m}", "{o}"]]);
    return list;
  };
  const out = [];
  // その文字列に出てくるほかの人（名前が書かれている人・話題の仲間 {m}）。台詞の口調がその人に合えば、その人の台詞とみなす
  let ctxMate = null;
  let ctxStr = "";
  const candsOf = (str) => {
    const c = new Set();
    for (const id of ids) if ([P[id].name, P[id].short].filter(Boolean).some((nm) => str.includes(nm))) c.add(id);
    if (ctxMate && ctxMate !== "*") c.add(ctxMate);
    else if (/\{m\}|\{o\}/.test(str)) c.add("*");
    return [...c];
  };
  const add = (who, min, src, text, love) => out.push({ who, min, src, text, love: !!love, cands: candsOf(ctxStr) });
  const SKIP = new Set(["label", "title", "q", "hint", "chron", "memo", "lore", "sub", "story", "flag", "id", "kind", "mood", "tone", "at", "fresh", "after", "key", "name", "full", "role", "cls", "desc", "who"]);
  // obj の中の文字列を全部たどる（label などは主人公・地の文の見出しなので飛ばす）
  // strict：名の無い人（依頼の相手など）が居合わせる場面。話し手を名前で推せない台詞は数えない
  const walk = (v, owner, min, src, love, names, depth = 0, strict = false) => {
    if (v == null || depth > 14) return;
    if (typeof v === "string") { ctxStr = v; for (const q of quotesOf(v, strict ? null : owner, strict ? names.concat([[owner, ["{n}", "{c}"]]]) : names)) add(q.who, min, src, q.text, love); return; }
    if (typeof v === "function") return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, owner, min, src, love, names, depth + 1, strict)); return; }
    if (typeof v !== "object") return;
    let m = min, lv = love;
    if (typeof v.min === "number") m = Math.max(min, v.min);
    if (v.love === true || v.kind === "love") { lv = true; m = Math.max(m, LOVE); }
    if (v.kind === "cold" && typeof v.min !== "number") m = -100;
    // 依頼の段（who に名の無い相手がいる）は strict。頼みごと（ask）と終わり（ends）の会話は、その人
    let st = strict;
    const mate0 = ctxMate;
    if (typeof v.mate === "string") ctxMate = v.mate;
    if (v.who && ((typeof v.who === "object" && v.who.name) || typeof v.who === "string")) st = true;
    for (const [k, x] of Object.entries(v)) {
      if (SKIP.has(k) || k === "mateText") continue;
      walk(x, owner, m, src + "." + k, lv, names, depth + 1, k === "ask" || k === "topics" || k === "replies" ? false : st);
    }
    ctxMate = mate0;
  };

  // ---- 会話の表
  for (const [id, t] of Object.entries(D.TALK || {})) {
    if (!P[id]) continue;
    const names = namesFor(id);
    for (const [tier, lines] of Object.entries(t.greet || {})) walk(lines, id, GREET[tier] ?? -19, `TALK.${id}.greet.${tier}`, false, names);
    walk(t.bye, id, -19, `TALK.${id}.bye`, false, names);
    walk(t.empty, id, -19, `TALK.${id}.empty`, false, names);
    walk(t.nightIntro, id, 30, `TALK.${id}.nightIntro`, false, names);
    for (const tp of t.topics || []) {
      const min = typeof tp.min === "number" ? tp.min : tp.kind === "cold" ? -100 : tp.kind === "night" ? 30 : -19;
      walk(tp, id, min, `TALK.${id}.${tp.id}`, false, names);
    }
  }
  // ---- 恋の筋
  for (const [id, a] of Object.entries((D.R2 && D.R2.ARCS) || {})) {
    if (!P[id]) continue;
    ctxMate = "*";
    walk(a, id, LOVE, `R2.${id}`, true, namesFor(id));
    ctxMate = null;
  }
  // 恋の部品（行そのものが台詞。「」は書かない）
  for (const [id, a] of Object.entries(D.R2_PARTS || {})) {
    if (!P[id]) continue;
    for (const [k, list] of Object.entries(a)) for (const s of [].concat(list || [])) if (typeof s === "string") { ctxStr = ""; add(id, LOVE, `R2_PARTS.${id}.${k}`, s, true); }
  }
  // ---- 型の掛け合いの部品（行そのものが台詞）
  for (const [id, a] of Object.entries(D.TALK_PARTS || {})) {
    if (!P[id]) continue;
    for (const [k, list] of Object.entries(a)) for (const s of [].concat(list || [])) if (typeof s === "string") { ctxStr = ""; add(id, -19, `TALK_PARTS.${id}.${k}`, s); }
  }
  // ---- ひとこと
  for (const [id, v] of Object.entries(D.C2_VOICE || {})) {
    if (!P[id] || !P[id].join) continue;
    for (const [k, list] of Object.entries(v)) {
      const love = ["spark", "confess", "propose"].includes(k);
      for (const s of [].concat(list || [])) if (typeof s === "string") (ctxStr = "", add)(id, love ? LOVE : -19, `C2_VOICE.${id}.${k}`, s, love);
    }
  }
  // ---- 誘ったときの一言（町で誘う）
  for (const [id, list] of Object.entries(D.C2_INVITE || {})) if (P[id]) walk(list, id, -19, `C2_INVITE.${id}`, false, namesFor(id));
  // ---- 依頼（Q9）
  for (const [id, q] of Object.entries(D.Q9 || {})) if (P[id]) walk(q, id, 10, `Q9.${id}`, false, namesFor(id));
  // ---- 掛け合い
  for (const b of D.TALK_BANTER || []) {
    const min = typeof b.min === "number" ? b.min : -19;
    const sp = { a: b.a, b: b.b, c: b.c };
    const extra = { "{a}": b.a, "{b}": b.b }; if (b.c) extra["{c}"] = b.c;
    const doLines = (lines, src) => {
      for (const ln of lines || []) {
        if (!Array.isArray(ln)) continue;
        const who = sp[ln[0]];
        const s = ln[1];
        if (typeof s !== "string") continue;
        ctxStr = "";
        if (who) {
          // 行の中の「」はほかの人の言葉のこともある。「」の外が台詞
          add(who, min, src, s.replace(QUOTE, "…"));
        } else for (const q of quotesOf(s, null, namesFor(null, extra))) if (q.who && q.who !== "you" && q.who !== "mate") add(q.who, min, src, q.text);
      }
    };
    doLines(b.lines, `BANTER.${b.id}`);
    for (const k of ["a", "b", "none"]) if (b.side && b.side[k]) doLines(b.side[k].text, `BANTER.${b.id}.side.${k}`);
  }
  // ---- 出来事
  for (const e of D.EVENTS || []) {
    if (e.c2talk && P[e.c2talk]) { walk({ text: e.text, choices: e.choices }, e.c2talk, 10, `EV.${e.id}`, !!e.love, namesFor(e.c2talk)); continue; }
    const c2 = [].concat(e.c2 || []).filter((x) => P[x]);
    if (c2.length) {
      // その人の出る出来事：名前で話し手を推す（推せない台詞は数えない）
      const names = namesFor(null, c2.length === 1 ? { "{n}": c2[0], "{c}": c2[0] } : {});
      walk({ text: e.text, choices: e.choices }, null, -100, `EV.${e.id}`, false, names);
      continue;
    }
    if (e.m2 && e.m2.pick) walk({ text: e.text, choices: e.choices }, "*", -19, `EV.${e.id}`, false, namesFor("*"));
  }
  return out.filter((l) => l.who && l.who !== "you" && l.who !== "mate");
}

// ---------------------------------------------------------------- 表（D.K10_VOICE）と台詞の食い違い
// 一人称と呼び方の言葉。字の並びが同じ別の言葉（「私物」「主君」「下僕」）は外す
export const FIRST = {
  "私": /私(?![たど室服物有立刑生財設語鉄兵])/, "わたし": /わたし(?!た|て)/, "わたくし": /わたくし/, "あたし": /あたし/, "あたい": /あたい/,
  "俺": /俺/, "おれ": /(?<![こそあど折おてでにがは])おれ(?![たてるばなまんず])/, "オレ": /(?<![ィヴ])オレ(?![ンー])/, "僕": /(?<![下公従])僕/, "ぼく": /(?<![でつ])ぼく(?![ら])/, "わし": /(?<![くふさこ習食交使遣賑煩伝惑])わし(?![づくゃゅ])/, "わらわ": /わらわ(?!れ)/,
};
export const ADDR = {
  "あなた": /あなた/, "あんた": /あんた/, "お前": /お前(?!さん)/, "おまえ": /おまえ(?!さん)/, "お前さん": /お前さん/, "君": /(?<![主姫諸父母暴細名若大貴])君(?![主臨])/,
  "きみ": /(?<![ぎ黄と])きみ(?![ょゃ]|たい)/, "貴様": /貴様/, "おぬし": /おぬし/, "そなた": /そなた/,
};
const FIRST_ALIAS = { "私": "わたし", "ぼく": "僕" }; // 書き分けだけの違い（どちらも同じ一人称）は、表の字に直す
export function voiceProblems(G) {
  const D = G.data;
  const T = D.K10_VOICE || {};
  const EXC = D.K10_VOICE_EXCEPT || [];
  const out = [];
  const exc = (l) => EXC.some((x) => (x.who === l.who || x.who === "*") && (!x.has || l.text.includes(x.has)) && (!x.src || l.src.startsWith(x.src)));
  for (const l of collectLines(G)) {
    if (exc(l)) continue;
    // 差し込み（{you} {U} {v:…}）・ほかの人の言葉の引き写し（『』）・仕草（（））は数えない
    //   {v:くだけた|丁寧} は、両方を並べて確かめる
    const V = /\{v:((?:[^{}|]|\{[^{}]*\})*)\|((?:[^{}]|\{[^{}]*\})*)\}/g;
    const both = l.text.replace(V, "$1") + "　" + l.text.replace(V, "$2");
    let t = stripInner(both).replace(/〔…〕/g, "　").replace(/（[^（）]*）/g, "　");
    for (let u; (u = t.replace(/\{[^{}]*\}/g, "　")) !== t;) t = u;
    if (l.who === "*") {
      // だれが話すか分からない台詞：一人称と呼び方は {I} {U} で書く
      for (const [w, re] of Object.entries(FIRST)) if (re.test(t)) out.push({ ...l, why: `だれでも話す台詞に一人称「${w}」（{I} を使う）` });
      for (const [w, re] of Object.entries(ADDR)) if (re.test(t)) out.push({ ...l, why: `だれでも話す台詞に呼び方「${w}」（{U} を使う）` });
      continue;
    }
    const v = T[l.who];
    if (!v) continue;
    // 口調がそのほかの人（文字列に名前のある人・話題の仲間）に合うなら、その人の台詞（地の文で話し手を書いていない掛け合い）
    const fits = (x) => x && Object.entries(FIRST).every(([w, re]) => !re.test(t) || x.i.includes(w)) && Object.entries(ADDR).every(([w, re]) => !re.test(t) || x.you.includes(w) || (x.also || []).includes(w));
    if (!fits(v) && (l.cands || []).some((c) => c !== l.who && (c === "*" ? Object.keys(T).some((k) => k !== l.who && fits(T[k])) : fits(T[c])))) continue;
    const allowI = new Set(v.i);
    const stageYou = (v.stages || []).flatMap((s) => s.you);
    const allowA = new Set([...v.you, ...(v.also || [])]);
    for (const [w, re] of Object.entries(FIRST)) if (re.test(t) && !allowI.has(w)) out.push({ ...l, why: `一人称「${w}」（表は「${v.i.join("・") || "なし"}」）` });
    for (const [w, re] of Object.entries(ADDR)) if (re.test(t) && !allowA.has(w) && !stageYou.includes(w)) out.push({ ...l, why: `呼び方「${w}」（表は「${v.you.join("・") || "なし"}」）` });
    // 段で変わる呼び方は、変わる場面（とその後の話題 free）のほかは {U} で書く。
    //   名前（{you}・{you}さん）は、呼びかけ（「{you}、」「……{you}」）だけを見る（「{you}さんの荷」のような、ほかの人への話は数えない）
    // 名前で呼ぶ形のうち、表にも段にも無いもの（「さん」付けの人が呼び捨てにする など）
    for (const w of ["{you}", "{you}さん"]) {
      if (!v.stages || v.you.includes(w) || (v.also || []).includes(w) || stageYou.includes(w)) continue;
      if (new RegExp("(^|[。…、！？\\s」])" + w.replace(/[{}]/g, "\\$&") + "(?=$|[、。…！？」])").test(l.text)) out.push({ ...l, why: `名前の呼び方「${w}」は表にも段にも無い（{U} を使う）` });
    }
    (v.stages || []).forEach((s, i) => {
      // その段の場面・あとの段の場面・free の話題では、生で書いてよい
      const okIds = v.stages.slice(i).flatMap((x) => [x.scene, ...(x.free || [])]);
      if (okIds.some((id) => l.src.split(".").includes(id))) return;
      for (const w of s.you) {
        if (v.you.includes(w) || (v.also || []).includes(w)) continue;
        const hit = w.includes("{you}")
          ? new RegExp("(^|[。…、！？\\s」])" + w.replace(/[{}]/g, "\\$&") + "(?=$|[、。…！？」])").test(l.text)
          : (ADDR[w] || new RegExp(w)).test(t);
        if (hit) out.push({ ...l, why: `段の呼び方「${w}」（${s.name}・好感度 ${s.at}・場面 ${s.scene}）を、場面の外で生で書いている。{U} を使う` });
      }
    });
  }
  return out;
}
