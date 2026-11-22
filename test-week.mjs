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
/* work one night: stamp HUMAN on humans, SUS + the seeded tell on the
 * machine; returns true if the machine was caught */
async function workNight() {
  let caught = false;
  for (let i = 0; i < G().auditSubs.length; i++) {
    window.eval(`clearLater(); G.auditIdx = ${i}; G.auditLocked = false;`);
    window.renderCase();
    await sleep(120);
    const sub = G().auditSubs[i];
    if (sub.bot) {
      window.stamp("SUS");
      await sleep(150);
      const tell = sub.tel.tells[0];
      window.flagField(tell);
      if (sub.correct) caught = true;
      await sleep(2800); // the catch auto-advances
    } else {
      window.stamp("HUMAN");
      await sleep(1700);
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

/* — night zero: three beats, then the catch — */
ok("cold open opens the week", G().coldOpen === true && G().phase === "audit");
await sleep(1200);
click($("#shiftBrief")); // beat 1 (the desk) → beat 2 (the postmark)
await sleep(400);
click($("#shiftBrief")); // beat 2 → beat 3 (the case, live verbs)
await sleep(400);
ok("the tray's one filing is the machine's", G().auditSubs.length === 1 && G().auditSubs[0].filer === G().culprit);
const bot0 = G().auditSubs[0];
window.eval("clearLater()");
window.stamp("SUS");
await sleep(200);
window.flagField(bot0.tel.tells[0]);
ok("tray caught via the postmark", bot0.pick === "SUS" && bot0.correct === true);
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
  const caught = await workNight();
  caughtAny = caughtAny || caught;
  ok(`night ${n + 1} machine caught via the postmark`, caught);
  const btn = d.querySelector("#auditActions button");
  const isLast = n === 4;
  ok(`night ${n + 1} summary offers ${isLast ? "last call" : "next night"}`,
    isLast ? /last call/i.test(btn.textContent) : /next night/i.test(btn.textContent));
  click(btn);
  await sleep(500);
}
ok("the machine was caught at least once this week", caughtAny);

/* — the finale replaces the day-rule decree as the week's end — */
ok("week ends at the finale", G().phase === "finale");
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
