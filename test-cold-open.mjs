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
    const store = {};
    Object.defineProperty(window, "localStorage", { configurable: true, value: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    } });
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
const LOGIC = () => window.eval("LOGIC");
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

await sleep(700);
await sleep(300);

ok("title phase", d.body.dataset.phase === "title");

// — the credits trailer is an inline slate on the title, never an overlay
ok("no full-screen credits overlay", !d.getElementById("creditsIntro"));
const slate = d.getElementById("creditsIntroVid");
ok("credits video is an inline slate inside the title",
  !!slate && !!slate.closest("#title") && window.getComputedStyle(slate).position !== "fixed");
ok("slate is muted inline, no loop", slate && slate.hasAttribute("muted") && slate.hasAttribute("playsinline") && !slate.hasAttribute("loop"));

// — title: the job and the verb, one big card, links beneath
ok("title tooltips wired (data-tip on the verb card)", $("#startBtn").dataset.tip.length > 10);
ok("title hook: the night job, the machine nobody mentioned",
  /night job/i.test($(".sub").textContent) && /machine/i.test($(".sub").textContent));
ok("title sub2: five papers a night, stamp the machine's",
  /five papers a night/i.test($(".sub2").textContent) && /machine/i.test($(".sub2").textContent));
ok("kicker names the genre", /five-night deduction thriller/i.test($(".kicker").textContent));
ok("alternates demoted to text links in one row",
  ["#randomBtn", "#otTitleBtn", "#machineTitleBtn"].every((s) => $(s).classList.contains("tlink"))
  && $$(".title-links button").length === 3);
ok("primary not demoted", !$("#startBtn").classList.contains("tlink") && !$("#startBtn").classList.contains("read-3"));
ok("legend keeps the stakes + the handbook key", /three wrong stamps/i.test($(".legend").textContent) && /handbook/i.test($(".legend").textContent));
ok("the music credit survives the trim (license)", /WeLoveIndies/.test($(".music-credit").textContent));
ok("handbook has a Replay the tour affordance", /replay the tour/i.test($("#hbReplay").textContent));

$("#startBtn").click();
await sleep(900);

// — the story: five panels, then the coached filing
const story = $("#story");
await sleep(600);
ok("story opens on first clock-in", !story.classList.contains("hidden"));
ok("panel 1 caption: the office closes at six", /office closes at six/.test($("#storyCap").textContent));
ok("panel 1 uses the night room painting", !!$("#storyPanel .sp-art"));
ok("five progress dots, first lit", $$(".story-dot").length === 5 && $$(".story-dot.on").length === 1);
ok("Skip always visible", !!$("#storySkip"));
for (let i = 0; i < 3; i++) { click(story); await sleep(150); }
ok("panels advance on tap", $$(".story-dot.on").length === 1
  && /senders isn't a person/.test($("#storyCap").textContent));
ok("panel 4 shows all five senders with names",
  $$(".sp-face").length === 5 && $$(".sp-face span").every((s) => s.textContent.length > 1));
await sleep(700);
ok("panel 4 glitch touches every portrait — no culprit hint",
  $$(".sp-face img.g").length === 5);
click(story); await sleep(150);
ok("panel 5: desk and the shift button",
  /last one who reads them by hand/.test($("#storyCap").textContent) && !$("#storyNext").classList.contains("hidden"));
// — Skip leaves the story only: lands on coach step 1
// (walk the whole thing once so panel 5's button proves itself, then
//  re-check Skip on a fresh panel via the replay path below)
$("#storySkip").click();
await sleep(400);
ok("story Skip lands on the coached case", story.classList.contains("hidden") && !!$("#coach"));
ok("case card arrives", !!$(".case-card"));
ok("coach bubble shows step 1",
  !!$("#coach") && /how the paper got here/i.test($("#coach").textContent));
ok("instruction banner hidden while the coach teaches", $("#instr").classList.contains("hidden"));
ok("coach docks in-flow at this width (no card overlay)",
  $("#coach").classList.contains("docked") && $("#coach").previousElementSibling === $("#instr"));
ok("step 1 highlights the stub", !!$(".case-stub.coach-hi"));
ok("stamps disabled before the live step", $("#susBtn").disabled && $("#humanBtn").disabled);
ok("usually baseline prints on night zero",
  $$(".tel-us").length === 4 && /0.1 sec or more/.test($$(".tel-us")[0].textContent));
ok("postmark stub present", !!$(".case-stub.read-2"));

// — step 2: the note slip
click($("#coach .coach-next"));
await sleep(300);
ok("step 2 highlights the note slip", !!$(".note-slip.coach-hi") && !$(".case-stub.coach-hi"));
ok("step 2 copy names the clerk's note", /clerk's note/i.test($("#coach").textContent));
ok("stamps still asleep on step 2", $("#susBtn").disabled);

// — step 3: the two odd rows pulse, input goes live
click($("#coach .coach-next"));
await sleep(300);
ok("step 3 says tap one, stamp SUS", /stamp SUS/i.test($("#coach").textContent));
ok("instruction banner still hidden at the live step", $("#instr").classList.contains("hidden"));
const coldBot = G().auditSubs[0];
ok("the two tell rows pulse", $$(".tel-row.coach-pulse").length === coldBot.tel.tells.length && coldBot.tel.tells.length === 2);
ok("stamps awake at the live step", !$("#susBtn").disabled && !$("#humanBtn").disabled);

ok("cold machine tells are latency+origin",
  JSON.stringify(coldBot.tel.tells) === JSON.stringify(["latency", "origin"]));
ok("cold machine grounds == tells",
  JSON.stringify(LOGIC().grounds(coldBot.card, coldBot.filedMin, coldBot.tel, coldBot.note, G().machineFile)) === JSON.stringify(coldBot.tel.tells));
ok("cold machine relays normal (2-5, not odd)",
  parseInt(coldBot.tel.hops, 10) >= 2 && !LOGIC().oddField("hops", coldBot.tel.hops));
ok("cold machine receipt not odd", !LOGIC().oddField("receipt", coldBot.tel.receipt));

// — arm the real tell, stamp SUS: the catch (coach dismissed by the stamp)
window.eval("clearLater()");
click($(".tel-row[data-tel='latency']"));
await sleep(200);
$("#susBtn").click();
await sleep(800);
ok("arm+SUS catches the tour machine", coldBot.pick === "SUS" && coldBot.correct === true);
ok("coach dismissed by the stamp", !$("#coach"));

// — filing 2: the guided person, odd but explained
await sleep(2200);
click($("#caseCard"));
await sleep(600);
const guided = G().auditSubs[1];
ok("second filing arrives", G().auditIdx === 1 && !!$(".case-card"));
ok("guided filing is a real person", guided.bot === false);
ok("guided filing's one odd field is explained (empty tells)",
  guided.tel.tells.length === 0 && guided.tel.hops === "0" && guided.note === LOGIC().EXCUSE_NOTES.hops);
ok("guided coach step points at the note", !!$("#coach") && /Stamp HUMAN/i.test($("#coach").textContent));
ok("instruction banner hidden on the guided filing", $("#instr").classList.contains("hidden"));
ok("slip reaches for the relays row", !!$(".slip-link"));

// — misclick mercy: SUS on the person costs nothing on night zero
$("#susBtn").click();
await sleep(300);
click($(`.flag-f[data-k="hops"]`));
await sleep(400);
ok("SUS on the guided person costs no strike", G().strikes === 0 && guided.correct === false);

// — tray cleared, tour marked done, night one lands
click($("#caseCard"));
await sleep(1200);
ok("summary after tray", !$("#auditSummary").classList.contains("hidden"));
ok("instruction banner hidden on the tray plate", $("#instr").classList.contains("hidden"));
ok("tour flag written on completion",
  window.eval("localStorage.getItem('night-shift-tour-done')") === "1");
const trayBtn = d.querySelector("#auditActions button");
ok("tray offers the first night", /night one/i.test(trayBtn.textContent));
click(trayBtn);
await sleep(500);
ok("night 1 begins (cold open closed, five filings)", G().phase === "audit" && G().coldOpen === false && G().auditSubs.length === 5);
ok("usually baseline prints on night one", $$(".tel-us").length === 4);
ok("instruction restored to its night-one state (memo only, no tour residue)",
  $("#instr").classList.contains("hidden") && G().coldOpen === false);
const nightOneDocket = G().auditSubs.map((s) => [s.filer, s.bot]).flat().join(",");

// — the night-one nudge: fires on the first real night only
window.eval("NUDGE_MS = 60; armNudge()");
await sleep(300);
ok("nudge prints on night one when idle", /usually/.test(($("#auditHint") || {}).textContent || ""));
window.eval("NUDGE_MS = 60; G.auditSubs[0].nudged = false; G.day = 1; renderCase();");
await sleep(300);
ok("nudge does not fire on night two", !/usually.*Tap the one/.test(($("#auditHint") || {}).textContent || ""));
window.eval("G.day = 0; renderCase();");
ok("usually baseline absent on night two", (function () {
  window.eval("G.day = 1; renderCase()");
  return $$(".tel-us").length === 0;
})());
window.eval("G.day = 0; renderCase();");

// — second boot: Skip tour and the done flag both land on night one,
//   and the week's docket is identical either way (named rng streams)
async function boot() {
  const d2 = await JSDOM.fromFile(new URL("index.html", import.meta.url).pathname, {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
    beforeParse(w2) {
      const store = {};
      Object.defineProperty(w2, "localStorage", { configurable: true, value: {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
      } });
      w2.matchMedia = window.matchMedia;
      w2.HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };
      w2.HTMLMediaElement.prototype.pause = function() {};
      w2.AudioContext = FakeAC; w2.webkitAudioContext = FakeAC;
      w2.OfflineAudioContext = class extends FakeAC {
        constructor(ch, len, sr) { super(); this.length = len; }
        startRendering() { return Promise.resolve(this.createBuffer(1, this.length, this.sampleRate)); }
      };
    },
  });
  await sleep(900);
  return d2;
}

{
  const d2 = await boot(), w2 = d2.window, q = (s) => w2.document.querySelector(s);
  q("#startBtn").click();
  await sleep(900);
  ok("story opens in the second boot too", !q("#story").classList.contains("hidden"));
  q("#storySkip").click();
  await sleep(400);
  ok("story Skip lands on coach step 1 (not night one)",
    q("#story").classList.contains("hidden") && !!q("#coach") && w2.eval("G.coldOpen === true"));
  q("#coach .coach-skip").click();
  await sleep(800);
  ok("coach's Skip tour lands on night one", w2.eval("G.phase === 'audit' && G.coldOpen === false && G.auditSubs.length === 5"));
  ok("Skip tour writes the done flag", w2.eval("localStorage.getItem('night-shift-tour-done')") === "1");
  ok("docket identical after skipping", w2.eval("G.auditSubs.map(s=>[s.filer,s.bot]).flat().join(',')") === nightOneDocket);
  d2.window.close();
}

{
  const d3 = await boot(), w3 = d3.window, q = (s) => w3.document.querySelector(s);
  w3.eval("localStorage.setItem('night-shift-tour-done','1')");
  q("#startBtn").click();
  // the punch-card animation defers startGame; poll rather than race it
  for (let i = 0; i < 40 && !w3.eval("G.phase === 'audit' && G.auditSubs.length === 5"); i++) await sleep(100);
  ok("done flag: Clock in skips night zero", w3.eval("G.phase === 'audit' && G.coldOpen === false && G.auditSubs.length === 5"));
  d3.window.close();
}

{
  const d4 = await boot(), w4 = d4.window, q = (s) => w4.document.querySelector(s);
  w4.eval("localStorage.setItem('night-shift-tour-done','1')");
  q("#hbReplay").click();
  await sleep(900);
  ok("Replay clears the flag and starts the tour",
    w4.eval("localStorage.getItem('night-shift-tour-done')") === null
    && w4.eval("G.coldOpen === true") && !q("#story").classList.contains("hidden"));
  d4.window.close();
}

console.log(fail ? `SMOKE FAIL — ${fail} broken, ${pass} ok` : `SMOKE PASS — ${pass} checks`);
console.log("JS errors:", errors.length ? errors : "none");
process.exit(fail ? 1 : 0);
