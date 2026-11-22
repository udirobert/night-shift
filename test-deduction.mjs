/* test-deduction.mjs — the tell system is a deduction, not a lookup.
 * Plain node, no jsdom. Loads riddles.js + logic.js exactly the way
 * test-logic.mjs does, then hammers LOGIC.dealPostmarks over 2000 seeds
 * x 5 nights with the machine's file accumulating night to night.
 *
 * Asserts:
 *  (i)   exactly one filing per night has non-empty grounds(); it is the
 *        bot, and grounds() equals its tel.tells as a set
 *  (ii)  the night's class holds: d0 two tells, d1–d4 one; excused-human
 *        counts 0/1/1/1/2; d3's tell is a latency already in the file
 *  (iii) READER (SUS iff grounds, flag grounds[0]) catches 5/5, 0 strikes
 *  (iv)  SCANNER (SUS iff a field matches the old impossible strings,
 *        flag first odd field) reaches 3 strikes on 100% of seeds
 *  (v)   ALWAYS-HUMAN reaches 3 strikes by the end of night 3, always
 *  (vi)  no human latency collides with the file or with another filing
 *        that night
 * Run: node test-deduction.mjs */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
globalThis.window = {};
const run = (f) => new Function("window", "module", readFileSync(join(dir, f), "utf8"));
run("riddles.js")(globalThis.window, { exports: {} });
const mod = { exports: {} };
new Function("window", "module", readFileSync(join(dir, "logic.js"), "utf8"))
  (globalThis.window, mod);
const LOGIC = mod.exports;
const { CARDS, DAYS } = globalThis.window.NIGHT_SHIFT_DATA;

const N = 2000;
const KEYS = ["latency", "origin", "hops", "receipt"];
const EXCUSES = new Set(Object.values(LOGIC.EXCUSE_NOTES));
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; if (failures < 15) console.error("FAIL:", msg); } };
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// SCANNER: the old game — flag anything that matches the impossible strings
const scannerOdd = (k, tel) =>
  k === "latency" ? /^(\d+(?:\.\d+)?)ms$/.test(tel.latency) && parseFloat(tel.latency) < 40
  : k === "origin" ? tel.origin === "GATE 0"
  : k === "hops" ? tel.hops === "0"
  : /no delay/.test(tel.receipt);

let readerPerfect = 0, scannerCut = 0, alwaysHumanCut = 0;
const excusedCounts = [0, 0, 0, 0, 0];
const tellCounts = [0, 0, 0, 0, 0];
const repeatInFile = { n: 0, ok: 0 };
const contraKind = { origin: 0, receipt: 0 };
const seats = [0, 0, 0, 0, 0]; // the machine's seat must be a dice roll, not a habit

for (let seed = 0; seed < N; seed++) {
  const machineFile = [];
  let readerCaught = 0, readerStrikes = 0;
  let scannerStrikes = 0, ahStrikes = 0, ahCutNight = -1;

  for (let d = 0; d < 5; d++) {
    const day = DAYS[d].amend ? { ...DAYS[d], amend: null } : DAYS[d];
    const { cases } = LOGIC.auditSet(CARDS, day, d, null, LOGIC.makeRng(`t${seed}|${d}|audit`));
    const marks = LOGIC.dealPostmarks(cases, d, machineFile, LOGIC.makeRng(`t${seed}|${d}|times`));
    assert(marks.length === cases.length, `s${seed} d${d}: marks/cases length`);

    const fileLat = new Set(machineFile.map((e) => e.tel.latency));
    const tonightLat = new Set();
    const botI = cases.findIndex((c) => c.bot);
    seats[botI]++;
    let groundSubs = 0, excused = 0;

    marks.forEach((m, i) => {
      const c = cases[i];
      const g = LOGIC.grounds(c.card, m.filedMin, m.tel, m.note, machineFile);
      if (g.length) {
        groundSubs++;
        assert(c.bot, `s${seed} d${d}: a HUMAN filing has grounds ${g}`);
        assert(sameSet(g, m.tel.tells), `s${seed} d${d}: grounds ${g} != tells ${m.tel.tells}`);
      }
      // TYPICAL is the player-facing mirror of oddField: a field is odd
      // iff it breaks the "usually" line the tour and handbook print
      const typOdd = {
        latency: (t) => { const x = /^([\d.]+)ms$/.exec(t.latency); return !!x && +x[1] < 110; },
        origin: (t) => t.origin === "GATE 0",
        hops: (t) => parseInt(t.hops, 10) < 2,
        receipt: (t, f) => { const x = /\+(\d+)h(\d+)m/.exec(t.receipt); return !!x && (+x[1]) * 60 + (+x[2]) <= f; },
      };
      for (const k of KEYS)
        assert(typOdd[k](m.tel, m.filedMin) === LOGIC.oddField(k, m.tel, m.filedMin),
          `s${seed} d${d}: TYPICAL/oddField disagree on ${k}=${m.tel[k]}`);
      // a person's postmark never carries grounds — the hard invariant
      if (!c.bot) assert(m.tel.tells.length === 0, `s${seed} d${d}: human tells non-empty`);
      else assert(m.tel.tells.length > 0, `s${seed} d${d}: machine has no tell`);
      // (vi) human latency uniqueness: never the file, never another filing
      if (!c.bot) {
        assert(!fileLat.has(m.tel.latency), `s${seed} d${d}: human latency ${m.tel.latency} in the file`);
        assert(!tonightLat.has(m.tel.latency), `s${seed} d${d}: human latency ${m.tel.latency} repeated tonight`);
      }
      tonightLat.add(m.tel.latency);
      if (!c.bot && EXCUSES.has(m.note)) {
        excused++;
        // the excuse must sit on a genuinely odd field
        const k = KEYS.find((kk) => m.note === LOGIC.EXCUSE_NOTES[kk]);
        assert(k && LOGIC.oddField(k, m.tel, m.filedMin),
          `s${seed} d${d}: excuse note '${m.note}' on a normal ${k} field`);
      }
    });
    assert(groundSubs === 1, `s${seed} d${d}: ${groundSubs} filings with grounds, want 1`);

    // (ii) class shape
    const bot = marks[botI];
    tellCounts[d] += bot.tel.tells.length;
    excusedCounts[d] += excused;
    assert(excused === [0, 1, 1, 1, 2][d], `s${seed} d${d}: ${excused} excused humans, want ${[0, 1, 1, 1, 2][d]}`);
    assert(bot.tel.tells.length === (d === 0 ? 2 : 1), `s${seed} d${d}: ${bot.tel.tells.length} tells`);
    if (d === 3) {
      repeatInFile.n++;
      if (bot.tel.tells[0] === "latency" && fileLat.has(bot.tel.latency)) repeatInFile.ok++;
      assert(bot.tel.tells[0] === "latency" && fileLat.has(bot.tel.latency),
        `s${seed} d3: repeat tell ${bot.tel.tells[0]}/${bot.tel.latency} not in file`);
    }
    if (d === 2) contraKind[bot.tel.tells[0]]++;

    // --- the three bots, under the game's real strike rules ---
    marks.forEach((m, i) => {
      const isBot = !!cases[i].bot;
      const g = LOGIC.grounds(cases[i].card, m.filedMin, m.tel, m.note, machineFile);
      // READER: SUS iff grounds, flag grounds[0]
      if (g.length) { if (isBot && m.tel.tells.includes(g[0])) readerCaught++; else readerStrikes++; }
      // SCANNER: SUS iff a field matches the impossible strings
      const oddK = KEYS.find((k) => scannerOdd(k, m.tel));
      if (oddK) { // stamped SUS on it, flags the first odd field
        if (!(isBot && m.tel.tells.includes(oddK))) scannerStrikes++; // wrong SUS on a person
      } else if (isBot) scannerStrikes++;                            // waved the machine through
      // ALWAYS-HUMAN
      if (isBot) ahStrikes++;
    });
    if (ahCutNight < 0 && ahStrikes >= 3) ahCutNight = d;
    machineFile.push({ night: d + 1, face: "X", tel: bot.tel });
  }

  // (iii)–(v)
  if (readerCaught === 5 && readerStrikes === 0) readerPerfect++;
  else assert(false, `s${seed}: READER ${readerCaught}/5 caught, ${readerStrikes} strikes`);
  if (scannerStrikes >= 3) scannerCut++;
  else assert(false, `s${seed}: SCANNER never reached 3 strikes (${scannerStrikes})`);
  if (ahCutNight >= 0 && ahCutNight <= 2) alwaysHumanCut++;
  else assert(false, `s${seed}: ALWAYS-HUMAN cut on night ${ahCutNight + 1}`);
}

console.log(`${N} seeds x 5 nights:`);
console.log(`  grounds: exactly one per night, always the bot, grounds === tells`);
console.log(`  class: tells/night ${tellCounts.map((t, i) => `d${i}:${(t / N).toFixed(2)}`).join(" ")}`);
console.log(`  excused humans/night ${excusedCounts.map((t, i) => `d${i}:${(t / N).toFixed(2)}`).join(" ")}`);
console.log(`  d2 contradiction split: origin ${contraKind.origin} · receipt ${contraKind.receipt}`);
console.log(`  d3 repeat in file: ${repeatInFile.ok}/${repeatInFile.n}`);
console.log(`  READER perfect weeks: ${readerPerfect}/${N}`);
console.log(`  SCANNER reaches 3 strikes: ${scannerCut}/${N}`);
console.log(`  ALWAYS-HUMAN cut by night 3: ${alwaysHumanCut}/${N}`);
console.log(`  bot seat distribution: ${seats.map((n) => (n / (N * 5) * 100).toFixed(1) + "%").join(" ")}`);
assert(seats.every((n) => n > N * 0.8 && n < N * 1.2),
  `bot seat distribution far from uniform: ${seats}`);
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures ? 1 : 0);
