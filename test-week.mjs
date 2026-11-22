/* test-week.mjs — the rebuilt week, end to end: the cold-open tray, then
 * five night-only shifts (postmark judgment), then the finale. The day
 * docket must NOT appear in week mode — every screen asks the one
 * question: which filing is the machine?
 * Run: node test-week.mjs */
import { JSDOM } from "jsdom";

const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
const node = () => new Proxy({ connect() {}, disconnect() {}, start() {}, stop() {} }, {
  get(t, p) { if (p in t) return t[p]; if (typeof p === "string") return param(); return undefined; },
});
class FakeAC {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = "running"; this.destination = node(); }
  resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createGain() { return node(); } createOscillator() { return node(); }
  createBufferSource() { return node(); } createBiquadFilter() { return node(); }
  createDynamicsCompressor() { return node(); } createDelay() { return node(); }
  createWaveShaper() { return node(); } createAnalyser() { return node(); }
  createBuffer(ch, len, sr) { return { getChannelData: () => new Float32Array(len), duration: len / sr }; }
  createPeriodicWave() { return {}; }
}

const dom = await JSDOM.fromFile(new URL("index.html", import.meta.url).pathname, {
  runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = (q) => ({ matches: false, media: q, onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    window.HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };
    window.HTMLMediaElement.prototype.pause = function() {};
    window.AudioContext = FakeAC; window.webkitAudioContext = FakeAC;
    window.OfflineAudioContext = class extends FakeAC {
      constructor(ch, len, sr) { super(); this.length = len; }
      startRendering() { return Promise.resolve(this.createBuffer(1, this.length, this.sampleRate)); }
    };
  },
});
const { window } = dom;
const d = window.document;
const $ = (s) => d.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
window.addEventListener("error", (e) => errors.push(String(e.message)));
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("  ✓", name); } else { fail++; console.log("  ✗ FAIL:", name); } };
const G = () => window.eval("G");
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const JARGON = /\b(LATENCY|ORIGIN|RELAYS|RECEIPT|POSTMARK|GATE 0|EXT GATE|STREET BOX|rcvd|vpn)\b|\b\d+ms\b|\+\d+h\d\dm/;
const jargon = (where) => {
  const m = d.body.textContent.match(JARGON);
  ok(`no machine-speak visible — ${where}${m ? ` (found "${m[0]}")` : ""}`, !m);
};
/* work one night: stamp HUMAN on humans, SUS + the seeded tell on the
 * machine; returns true if the machine was caught.
 * mode "wave": wave the machine through and wrongly SUS the first human
 * (feeds the between-night panel's other two captions). */
async function workNight(mode) {
  let caught = false, psChecked = 0;
  for (let i = 0; i < G().auditSubs.length; i++) {
    window.eval(`clearLater(); G.auditIdx = ${i}; G.auditLocked = false;`);
    window.renderCase();
    await sleep(120);
    jargon(`case ${i + 1} render`);
    ok(`case ${i + 1}: no P.S. before the stamp`, !$("#caseCard .ps-slip"));
    const mf = $("#mfileBtn");
    if (mf && !mf.classList.contains("hidden")) {
      click(mf); await sleep(80); jargon("machine file open"); click(mf); await sleep(60);
    }
    const sub = G().auditSubs[i];
    if (sub.bot && mode !== "wave") {
      window.stamp("SUS");
      await sleep(150);
      const tell = sub.tel.tells[0];
      window.flagField(tell);
      if (sub.correct) caught = true;
      jargon(`case ${i + 1} verdict`);
      const ps = $("#caseCard .ps-slip");
      ok("machine's paper answers with its own P.S. once stamped",
        !!ps && ps.textContent.startsWith("P.S.") &&
        ps.textContent.includes(window.eval(`LOGIC.PS_MACHINE["${sub.filer}"]`)));
      await sleep(2800); // the catch auto-advances
    } else if (sub.bot && mode === "wave") {
      window.stamp("HUMAN");
      jargon(`case ${i + 1} verdict`);
      await sleep(1700);
    } else if (mode === "wave" && psChecked === 0 && !sub.bot) {
      // a wrong SUS on a person: strike and "under review"
      window.stamp("SUS");
      await sleep(150);
      window.flagField(""); // no grounds → wrong stamp
      jargon(`case ${i + 1} verdict`);
      ok("a wrongly-struck person reads under review",
        /under review/.test($("#caseCard .case-reason")?.textContent || "") &&
        (G().wire || []).some((l) => /strike · under review/.test(l)));
      ok("P.S. still answers on a wrong stamp", !!$("#caseCard .ps-slip"));
      psChecked++;
      click($("#caseCard")); await sleep(300); // wrong stamps wait for a tap
    } else {
      window.stamp("HUMAN");
      jargon(`case ${i + 1} verdict`);
      const ps = $("#caseCard .ps-slip");
      if (ps && !psChecked) {
        psChecked++;
        const prev = G().nightOutcome[G().day - 1] || {};
        const want = window.eval(
          `LOGIC.psLine("${sub.filer}", ${G().day}, {isMachine:false,usedLastNight:${prev.face === sub.filer},caughtLastNight:${prev.result === "caught"}})`);
        ok("stamped person's P.S. shows the build-spec line",
          ps.textContent.startsWith("P.S.") && ps.textContent.includes(want));
        if (!ps.textContent.includes(want)) console.log("   dbg ps:", sub.filer, "|", ps.textContent, "| want:", want,
          "| day:", G().day, "| prev:", JSON.stringify(G().nightOutcome[G().day - 1]));
      }
      await sleep(2700); // the P.S. dwell is ≥2.6s before auto-advance
    }
  }
  return caught;
}

await sleep(700);
const credits = d.getElementById("creditsIntro");
if (credits) credits.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, cancelable: true }));
await sleep(300);

window.startGame("spine-week-1");
await sleep(400);

/* — night zero: the desk card, then two coached filings — */
ok("cold open opens the week", G().coldOpen === true && G().phase === "audit");
await sleep(1200);
ok("the story opens the week", !$("#story").classList.contains("hidden"));
for (let i = 0; i < 8 && !$("#story").classList.contains("hidden"); i++) { click($("#story")); await sleep(120); }
ok("six panels then the coached case", $("#story").classList.contains("hidden") && !!$("#coach"));
for (let s = 0; s < 2; s++) { click($("#coach .coach-next")); await sleep(200); } // coach to the live step
ok("the tray leads with the machine's filing", G().auditSubs.length === 2 && G().auditSubs[0].filer === G().culprit);
const bot0 = G().auditSubs[0];
window.eval("clearLater()");
window.stamp("SUS");
await sleep(200);
window.flagField(bot0.tel.tells[0]);
ok("tray caught via the postmark", bot0.pick === "SUS" && bot0.correct === true);
ok("night zero shows no P.S.", !$("#caseCard .ps-slip"));
await sleep(2600);
click($("#caseCard")); // dismiss → the guided person
await sleep(400);
window.stamp("HUMAN");
ok("the guided person stamps clean", G().auditSubs[1] && G().auditSubs[1].correct === true);
await sleep(2800);
ok("tray summary shows", !$("#auditSummary").classList.contains("hidden"));
const trayBtn = d.querySelector("#auditActions button");
ok("tray offers the first night", /night one/i.test(trayBtn.textContent));
click(trayBtn);
await sleep(400);

/* — nights 1..5: night-only, postmark judgment — */
let caughtAny = false;
for (let n = 0; n < 5; n++) {
  ok(`night ${n + 1} is an audit (no day docket)`, G().phase === "audit" && G().coldOpen === false);
  const label = d.querySelector("#dayDots .day-label").textContent;
  ok(`night ${n + 1} label reads NIGHT`, /NIGHT/.test(label));
  const caught = await workNight(n === 1 ? "wave" : "catch");
  caughtAny = caughtAny || caught;
  // the last stamp's P.S. dwell (2.6s) ends in the summary — poll for it
  for (let i = 0; i < 30 && !d.querySelector("#auditActions button"); i++) await sleep(300);
  jargon(`night ${n + 1} summary`);
  ok(`night ${n + 1} machine ${n === 1 ? "waved" : "caught"} via the postmark`,
    n === 1 ? !caught : caught);
  const btn = d.querySelector("#auditActions button");
  const isLast = n === 4;
  ok(`night ${n + 1} summary offers ${isLast ? "last call" : "next night"}`,
    isLast ? /last call/i.test(btn.textContent) : /next night/i.test(btn.textContent));
  click(btn);
  await sleep(500);
  // the between-night panel answers with what the stamps did (week mode only)
  ok(`night ${n + 1} between-night panel shows`, !$("#story").classList.contains("hidden"));
  const cap = $("#storyCap").textContent, o = G().nightOutcome[n];
  if (n === 1) {
    ok("panel: waved-through caption + under-review appendix",
      new RegExp(`It passed as ${o.face}\\. ${o.face} kept the door`).test(cap) &&
      new RegExp(`And ${o.struck[0]} is under review\\. Nobody told them why\\.`).test(cap));
  } else {
    ok("panel: caught caption",
      new RegExp(`You caught it\\. It was sending for ${o.face}\\.`).test(cap));
  }
  // a save on the panel is still the summary's save — resume lands there
  let savePhase = "unreadable";
  try { savePhase = JSON.parse(window.localStorage.getItem("night-shift-save-v3") || "null")?.phase; } catch { /* jsdom file:// has no storage */ }
  ok("save on the panel stays resumable (phase audit)",
    savePhase === "audit" || savePhase === "unreadable");
  click($("#story")); // Continue →
  await sleep(600);
}
ok("the machine was caught at least once this week", caughtAny);

/* — the finale replaces the day-rule decree as the week's end — */
ok("week ends at the finale", G().phase === "finale");
jargon("finale ledger");
ok("five nights were worked", G().nightResults.length === 5);

/* — through the choice and onto the dawn screen (the last screen a judge sees) — */
const rows = G().finaleRows, culprit = G().culprit, opts = G().finaleOpts;
const LOGIC = () => window.eval("LOGIC");
const good = opts.find((o) => rows.filter((r) => !LOGIC().passes(r, o.rule)).map((r) => r.filer).filter((f) => f === culprit).length === 1
  && rows.filter((r) => !LOGIC().passes(r, o.rule)).length === 1);
ok("a clause that cuts only the machine exists", !!good);
G().finaleChoice = good;
window.signRule();
await sleep(1400); // the seal lands, then dawn
ok("the week ends at dawn (endGame ran clean)", d.body.dataset.phase === "dawn");
const endTitle = d.querySelector("#endTitle").textContent;
ok("the ending title is set (" + endTitle + ")", typeof endTitle === "string" && endTitle.length > 2);
const stats = d.querySelector("#endStats").textContent;
ok("the end stats read night-only (" + stats + ")", /nights worked/.test(stats));
const share = d.querySelector("#shareBlock").textContent;
ok("the share card reads one night axis", /🌙/.test(share) && !/☀️/.test(share));

console.log(fail ? `WEEK FAIL — ${fail} broken, ${pass} ok` : `WEEK PASS — ${pass} checks`);
console.log("JS errors:", errors.length ? errors : "none");
process.exit(fail ? 1 : 0);
