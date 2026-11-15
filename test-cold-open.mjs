/* test-cold-open.mjs — night zero, the 3-beat intro: the desk (five
 * faces), the postmark baseline (a person vs the impossible), then the
 * first catch with teaching grace. One thing per screen, no strikes.
 * Run: node test-cold-open.mjs */
import { JSDOM } from "jsdom";

const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
  setTargetAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
const node = () => new Proxy({ connect() {}, disconnect() {}, start() {}, stop() {} }, {
  get(t, p) { if (p in t) return t[p]; if (typeof p === "string") return param(); return undefined; },
});
class FakeAC {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = "running"; this.destination = node(); }
  resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createGain() { return node(); } createOscillator() { return node(); } createBufferSource() { return node(); }
  createBiquadFilter() { return node(); } createDynamicsCompressor() { return node(); } createDelay() { return node(); }
  createWaveShaper() { return node(); } createAnalyser() { return node(); }
  createBuffer(ch, len, sr) { return { getChannelData: () => new Float32Array(len), duration: len / sr }; }
  createPeriodicWave() { return {}; }
}

const dom = await JSDOM.fromFile(new URL("index.html", import.meta.url).pathname, {
  runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
  beforeParse(window) {
    // reduced motion: the beats print instantly, so the test never races
    // the typewriter — the game reads the same, only faster
    window.matchMedia = (q) => ({ matches: /prefers-reduced-motion/.test(q), media: q, onchange: null,
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
const $$ = (s) => [...d.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
window.addEventListener("error", (e) => errors.push(String(e.message)));
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("  ✓", name); } else { fail++; console.log("  ✗ FAIL:", name); } };
const G = () => window.eval("G");
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

await sleep(700);
const credits = d.getElementById("creditsIntro");
if (credits) credits.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, cancelable: true }));
await sleep(500);

ok("title phase", d.body.dataset.phase === "title");

// — title: one line, one verb — the how-to moved into night zero
ok("title tooltips wired (data-tip on the verb card)", $("#startBtn").dataset.tip.length > 10);
ok("title tooltips reachable (uiTip outside hidden #game)", !$("#game #uiTip") && !!$("#uiTip"));
ok("title says one thing (no steps pills, no ticker)", !$(".steps") && !$("#shiftLedger"));
ok("title hook names machine + postmark", /machine/i.test($(".sub").textContent) && /postmark/.test($(".sub").textContent));
ok("alternates demoted to read-3", ["#randomBtn", "#machineTitleBtn"].every((s) => $(s).classList.contains("read-3")));
ok("primary not demoted", !$("#startBtn").classList.contains("read-3"));
ok("legend keeps the stakes + the handbook key", /three wrong stamps/i.test($(".legend").textContent) && /handbook/i.test($(".legend").textContent));
ok("the music credit survives the trim (license)", /WeLoveIndies/.test($(".music-credit").textContent));

$("#startBtn").click();
await sleep(900);

// — beat 1: the desk, five faces
const brief = $("#shiftBrief");
await sleep(600);
ok("beat 1 shows", !brief.classList.contains("hidden"));
ok("beat 1 theme = NIGHT 0 — THE DESK", /THE DESK/.test($("#briefTheme").textContent));
ok("beat 1 shows five faces with names", $$("#briefFaces .brief-face").length === 5
  && $$("#briefFaces .brief-face span").every((s) => s.textContent.length > 1));
ok("beat 1 premise: a machine wants in, the postmark says otherwise",
  /machine/i.test($("#briefRiddle").textContent) && /postmark/.test($("#briefRiddle").textContent));
ok("beat 1 aria is the detective hook", /read what the wire can/.test($("#briefAria").textContent));

// — beat 2: the postmark baseline
click(brief);
await sleep(400);
ok("beat 2 shows", !brief.classList.contains("hidden"));
ok("beat 2 theme = NIGHT 0 — THE POSTMARK", /THE POSTMARK/.test($("#briefTheme").textContent));
ok("beat 2 compare strip: 5 aligned rows", $$("#briefCompare .rcc-row").length === 5);
ok("beat 2 compare labels a person vs the desk",
  /a person/.test($("#briefCompare .rcc-head").textContent) && /on your desk/.test($("#briefCompare .rcc-head").textContent));
ok("beat 2 faces hidden (one thing per screen)", $("#briefFaces").classList.contains("hidden"));
ok("beat 2 aria names the baseline", /messy/.test($("#briefAria").textContent));

// — beat 3: the case arrives, live verbs
click(brief);
await sleep(500);
ok("brief dismissed for beat 3", brief.classList.contains("hidden"));
ok("case card arrives", !!$(".case-card"));
ok("instr = the catch instruction", d.getElementById("instr").textContent.startsWith("This filing is on your desk"));
ok("standing order, not ARIA's rule", /THE DESK — the postmark is the only testimony/.test($("#ruleChips").textContent)
  && !/ARIA's rule/.test($("#ruleChips").textContent));
ok("verb row up (the decision is live)", !$("#caseBtns").classList.contains("hidden"));
ok("postmark stub present", !!$(".case-stub.read-2"));
ok("filer portrait present", !!$(".case-photo .case-id"));
ok("machine prose wears a human voice (no 'measured' tell)", !/measured/i.test($(".arg").textContent));

// — SUS asks grounds; a wrong field re-asks (teaching grace)
window.eval("clearLater()");
$("#susBtn").click();
await sleep(400);
ok("grounds asked after SUS", !!$(".flag-row"));
const tells = G().auditSubs[0].tel.tells;
const tell = tells[0];
// night zero leaks exactly two fields — pick a clean one for the grace path
const wrong = ["latency", "origin", "hops", "receipt"].find((k) => !tells.includes(k));
click($(`.flag-f[data-k="${wrong}"]`));
await sleep(300);
ok("wrong field re-asks (night-zero grace)", !!$(".flag-row") && G().auditSubs[0].pendingFlag === true);
ok("grace costs no strike", G().strikes === 0);

// — the real tell catches it; the verdict stays up before the slide-away
click($(`.flag-f[data-k="${tell}"]`));
await sleep(700);
const reason = ($(".case-reason") || {}).textContent || "";
ok("catch verdict names the field", /ANOMALY QUARANTINED/.test(reason) && G().auditSubs[0].correct === true);
ok("the machine speaks after the catch, not before", /It said: “/.test(reason));

// — summary, then the first real night
await sleep(1500);
ok("summary after tray", !$("#auditSummary").classList.contains("hidden"));
const trayBtn = d.querySelector("#auditActions button");
ok("tray offers the first night", /night one/i.test(trayBtn.textContent));
click(trayBtn);
await sleep(500);
ok("night 1 begins (cold open closed, five filings)", G().phase === "audit" && G().coldOpen === false && G().auditSubs.length === 5);

console.log(fail ? `SMOKE FAIL — ${fail} broken, ${pass} ok` : `SMOKE PASS — ${pass} checks`);
console.log("JS errors:", errors.length ? errors : "none");
process.exit(fail ? 1 : 0);
