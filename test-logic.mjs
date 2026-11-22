/* test-logic.mjs — randomized deal/audit invariants for NIGHT SHIFT.
 * Loads riddles.js + logic.js the way index.html does (plain scripts on a
 * fake window) and hammers deal()/auditSet()/extraRuling() 2000 seeded
 * times per day. Run: node test-logic.mjs */
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
const { CARDS, DAYS, FINALE } = globalThis.window.NIGHT_SHIFT_DATA;

const N = 2000;
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; if (failures < 12) console.error("FAIL:", msg); } };
const J = (o) => JSON.stringify(o, (k, v) => v); // stable enough: insertion order is deterministic

function checkDay(day, di, verbose = true, n = N) {
  const rule = day.rule;
  const wantPass = di === 0 ? 2 : 1;
  const nSus = Math.max(2, rule.length);
  const liarDay = di >= 3;
  const cov = Object.fromEntries(rule.map((c) => [c.key, 0]));
  let detDeals = 0, detAudits = 0, detClues = 0, traps = 0, trapChecked = 0;

  for (let t = 0; t < n; t++) {
    const rngD = () => LOGIC.makeRng(`s${t}|${di}|deal`);
    const d1 = LOGIC.deal(CARDS, day, di, rngD());
    const d2 = LOGIC.deal(CARDS, day, di, rngD());
    if (J(d1) === J(d2)) detDeals++;
    const { docket, hand } = d1;

    const humans = docket.filter((r) => r.verdict === "HUMAN" && !r.lie).map((r) => r.card);
    const sus = docket.filter((r) => r.verdict === "SUS").map((r) => r.card);
    const lies = docket.filter((r) => r.lie);
    assert(humans.length === 2, `${day.dayLabel}: docket humans ${humans.length} != 2`);
    assert(humans.every((c) => LOGIC.passes(c, rule)), `${day.dayLabel}: true HUMAN row fails rule`);
    const expSus = nSus + (liarDay ? 1 : 0);
    assert(sus.length === expSus, `${day.dayLabel}: docket sus ${sus.length} != ${expSus}`);
    assert(sus.every((c) => !LOGIC.passes(c, rule)), `${day.dayLabel}: SUS row passes rule`);
    // every non-lie row's stamp equals truth
    assert(docket.filter((r) => !r.lie).every((r) =>
      (r.verdict === "HUMAN") === LOGIC.passes(r.card, rule)), `${day.dayLabel}: truthful stamp wrong`);
    if (liarDay) {
      assert(lies.length === 1, `${day.dayLabel}: ${lies.length} lies != 1`);
      const lx = LOGIC.failKeys(lies[0].card, rule);
      assert(lies[0].verdict === "HUMAN" && lx.length === 1, `${day.dayLabel}: liar malformed`);
      const xSus = sus.filter((c) =>
        LOGIC.failKeys(c, rule).length === 1 && LOGIC.failKeys(c, rule)[0] === lx[0]);
      assert(xSus.length >= 2, `${day.dayLabel}: only ${xSus.length} true SUS on liar criterion`);
    } else {
      assert(lies.length === 0, `${day.dayLabel}: unexpected lie row`);
    }
    const docketIds = new Set(docket.map((r) => r.card.id));
    assert(docketIds.size === docket.length, `${day.dayLabel}: dup docket card`);

    assert(hand.length === 4, `${day.dayLabel}: hand ${hand.length} != 4`);
    assert(new Set(hand.map((c) => c.id)).size === 4, `${day.dayLabel}: dup hand card`);
    assert(hand.every((c) => !docketIds.has(c.id)), `${day.dayLabel}: hand overlaps docket`);
    assert(hand.filter((c) => LOGIC.passes(c, rule)).length === wantPass,
      `${day.dayLabel}: hand passing != ${wantPass}`);

    for (const crit of rule) {
      if (sus.some((c) => LOGIC.failKeys(c, rule).length === 1 &&
                        LOGIC.failKeys(c, rule)[0] === crit.key)) cov[crit.key]++;
    }

    // clue
    const rC = () => LOGIC.makeRng(`s${t}|${di}|clue`);
    const c1 = LOGIC.extraRuling(CARDS, day, { docket, hand }, rC());
    const c2 = LOGIC.extraRuling(CARDS, day, { docket, hand }, rC());
    if (J(c1) === J(c2)) detClues++;
    if (c1) {
      assert(!docketIds.has(c1.card.id) && !hand.includes(c1.card),
        `${day.dayLabel}: clue overlaps docket/hand`);
      assert((c1.verdict === "HUMAN") === LOGIC.passes(c1.card, rule),
        `${day.dayLabel}: clue stamp untruthful`);
    }

    // audit
    const rA = () => LOGIC.makeRng(`s${t}|${di}|audit`);
    const a1 = LOGIC.auditSet(CARDS, day, di, hand[0], rA());
    const a2 = LOGIC.auditSet(CARDS, day, di, hand[0], rA());
    if (J(a1) === J(a2)) detAudits++;
    const { cases, amendAfter } = a1;
    assert(cases.length === 5, `${day.dayLabel}: audit ${cases.length} != 5`);
    assert(new Set(cases.map((c) => c.card.id)).size === 5, `${day.dayLabel}: dup audit card`);
    assert(cases.every((c) => c.card !== hand[0]), `${day.dayLabel}: audit includes excluded card`);
    const bots = cases.filter((c) => c.bot);
    assert(bots.length === 1 && LOGIC.passes(bots[0].card, bots[0].rule),
      `${day.dayLabel}: bot missing or fails its rule`);
    if (!day.amend) {
      assert(amendAfter === null, `${day.dayLabel}: unexpected amendAfter`);
      const ap = cases.filter((c) => LOGIC.passes(c.card, rule)).length;
      assert(ap >= 2 && ap <= 3, `${day.dayLabel}: audit passers ${ap} outside 2–3`);
    } else {
      assert(amendAfter === 2 || amendAfter === 3, `${day.dayLabel}: amendAfter ${amendAfter}`);
      const seg1 = cases.slice(0, amendAfter), seg2 = cases.slice(amendAfter);
      assert(seg1.every((c) => c.rule === rule && !c.amended), `${day.dayLabel}: seg1 not base rule`);
      assert(seg2.every((c) => c.rule === day.amend.rule && c.amended), `${day.dayLabel}: seg2 not amended`);
      const s1p = seg1.filter((c) => LOGIC.passes(c.card, rule)).length;
      const s1f = seg1.length - s1p;
      const s2p = seg2.filter((c) => LOGIC.passes(c.card, day.amend.rule)).length;
      const s2f = seg2.length - s2p;
      assert(s1p >= 1 && s1f >= 1, `${day.dayLabel}: seg1 lacks pass/fail mix`);
      assert(s2p >= 1 && s2f >= 1, `${day.dayLabel}: seg2 lacks pass/fail mix`);
      trapChecked++;
      if (seg2.some((c) => LOGIC.passes(c.card, rule) !== LOGIC.passes(c.card, day.amend.rule))) traps++;
    }
  }

  console.log(
    `${day.dayLabel} ${day.theme.padEnd(14)} — ${n} seeds OK` +
    ` · det ${detDeals}/${detAudits}/${detClues}` +
    ` · SUS coverage: ` + rule.map((c) => `${c.key} ${(100 * cov[c.key] / n).toFixed(0)}%`).join(" ·") +
    (day.amend ? ` · trap ${(100 * traps / trapChecked).toFixed(0)}%` : "")
  );
}
for (let di = 0; di < DAYS.length; di++) checkDay(DAYS[di], di);

// ---- overtime: generated shifts must satisfy every hand-day invariant ----
const OT_N = 300;
let otWeeks = 0, otDetFail = 0;
for (let t = 0; t < OT_N; t++) {
  const rng1 = LOGIC.makeRng(`ot${t}`);
  const days = LOGIC.genDays(rng1, CARDS);
  assert(days.length === 5, `ot${t}: ${days.length} days != 5`);
  assert(J(days) === J(LOGIC.genDays(LOGIC.makeRng(`ot${t}`), CARDS)), `ot${t}: gen not deterministic`);
  days.forEach((day, di) => {
    assert(day.rule && day.rule.length >= 1 && day.rule.length <= 3, `ot${t} d${di}: bad rule`);
    assert(day.riddle && day.ariaLine && day.theme, `ot${t} d${di}: missing flavor`);
    assert(day.dayLabel === `OT ${di + 1}`, `ot${t} d${di}: label`);
    const before = failures;
    checkDay(day, di, false, 60);
    if (failures > before) otDetFail++;
  });
  otWeeks++;
}
console.log(`overtime: ${otWeeks} generated weeks × 5 days OK` + (otDetFail ? ` · ${otDetFail} day-level failures` : ""));

// ---- finale rotation: the machine wears a seeded face, exactly one clause cuts it alone ----
const FILERS = ["MARA", "OKO", "JUN", "TESS", "VALE"];
const FN = 2000;
for (let t = 0; t < FN; t++) {
  const rngF = LOGIC.makeRng(`fin${t}`);
  const a = LOGIC.buildFinale(rngF, CARDS);
  const b = LOGIC.buildFinale(LOGIC.makeRng(`fin${t}`), CARDS);
  assert(J(a) === J(b), `fin${t}: buildFinale not deterministic`);
  const { rows, culprit, opts } = a;
  assert(FILERS.includes(culprit), `fin${t}: culprit ${culprit} not a filer`);
  assert(rows.length === 5 && new Set(rows.map((r) => r.filer)).size === 5, `fin${t}: rows/filers`);
  assert(new Set(rows.map((r) => r.name)).size === 5, `fin${t}: duplicate finale cards`);
  const crow = rows.find((r) => r.filer === culprit);
  assert(crow && /^\+0h0[1-8]m$/.test(crow.ts), `fin${t}: culprit ts wrong`);
  assert(rows.filter((r) => r !== crow).every((r) => r.ts !== crow.ts), `fin${t}: human carries machine ts`);
  assert(opts.length === 4 && new Set(opts.map((o) => o.text)).size === 4, `fin${t}: clause count`);
  const cutLists = opts.map((o) => rows.filter((row) => !LOGIC.passes(row, o.rule)).map((row) => row.filer));
  const winners = cutLists.filter((c) => c.length === 1 && c[0] === culprit).length;
  assert(winners === 1, `fin${t}: ${winners} clauses cut only ${culprit}`);
}
console.log(`finale rotation: ${FN} seeds OK · culprit assigned uniformly, one clause cuts it alone`);

// finale: exactly one option cuts only VALE; option d spares only VALE
const FOPT = [
  [{ key: "people", allow: ["pair", "group"], text: "with someone else" }],
  [{ key: "setting", allow: ["outdoor"], text: "outdoors" }],
  [{ key: "time", allow: ["dawn", "day", "dusk"], text: "not at night" }],
  [{ key: "time", allow: ["night"], text: "at night" }],
];
const cuts = FOPT.map((r) => FINALE.filter((f) => !LOGIC.passes(f, r)).map((f) => f.filer));
const onlyVale = cuts.filter((c) => c.length === 1 && c[0] === "VALE").length;
assert(onlyVale === 1, `finale: ${onlyVale} options cut only VALE`);
assert(cuts[3].length === FINALE.length - 1 && !cuts[3].includes("VALE"),
  "finale: option d doesn't spare only VALE");
console.log(`finale cuts: ${cuts.map((c) => c.join("+") || "none").join(" | ")}`);


/* ---------- the plain-language display layer ---------- */
assert(LOGIC.clock(529) === "2:49 am", "clock 529 → 2:49 am");
assert(LOGIC.clock(40) === "6:40 pm", "clock 40 → 6:40 pm");
assert(LOGIC.clock(361) === "12:01 am", "clock wraps midnight");
assert(LOGIC.clock(360) === "12:00 am", "clock midnight");
assert(LOGIC.clock(0) === "6:00 pm", "clock zero = 6 pm");
assert(LOGIC.clock(1080) === "12:00 pm", "clock noon");

assert(LOGIC.say("latency", { latency: "3ms" }) === "0.003 sec", "say latency 3ms");
assert(LOGIC.say("latency", { latency: "217ms" }) === "0.217 sec", "say latency 217ms");
assert(LOGIC.say("origin", { origin: "GATE 0" }) === "inside this office", "say GATE 0");
assert(LOGIC.say("origin", { origin: "EXT GATE 4" }) === "indoor line 4", "say EXT GATE");
assert(LOGIC.say("origin", { origin: "STREET BOX 6" }) === "street mailbox 6", "say STREET BOX");
assert(LOGIC.say("hops", { hops: "0" }) === "none", "say hops 0");
assert(LOGIC.say("hops", { hops: "3" }) === "3", "say hops 3");
assert(LOGIC.say("receipt", { receipt: "rcvd +8h57m" }) === "2:57 am", "say receipt time");
assert(LOGIC.say("receipt", { receipt: "rcvd +0h04m · queued" }) === "6:04 pm · delayed", "say receipt queued");
assert(LOGIC.say("receipt", { receipt: "rcvd +1h02m · resent ×2" }) === "7:02 pm · sent twice", "say receipt resent");
assert(LOGIC.say("receipt", { receipt: "rcvd +0h01m · no delay" }) === "6:01 pm · no delay", "say receipt other suffix passes through");

// say(latency) must stay injective — the night-4 repeat tell matches exact values
{
  const seen = new Map();
  let inj = true;
  for (let ms = 3; ms <= 999; ms++) {
    const out = LOGIC.say("latency", { latency: ms + "ms" });
    if (seen.has(out) && seen.get(out) !== ms) { inj = false; break; }
    seen.set(out, ms);
  }
  assert(inj, "say(latency) injective over 3–999ms");
}

assert(LOGIC.NEUTRAL_NOTES.length === 6, "NEUTRAL_NOTES length unchanged");

// plain-language verdicts for each tell class
{
  const indoorCard = { tags: { setting: "indoor" } };
  const outdoorCard = { tags: { setting: "outdoor" } };
  assert(LOGIC.explainGround("latency", indoorCard, 500, { latency: "3ms" }, "x", [])
    === "TRAVEL TIME 0.003 sec — nothing crosses the city that fast", "verdict: fast latency");
  assert(LOGIC.explainGround("latency", indoorCard, 500, { latency: "213ms" }, "x",
    [{ night: 2, tel: { latency: "213ms" } }])
    === "TRAVEL TIME 0.213 sec — exactly what it sent on night 2", "verdict: repeated latency");
  assert(LOGIC.explainGround("origin", indoorCard, 500, { origin: "GATE 0" }, "x", [])
    === "SENT FROM inside this office — it's locked at night", "verdict: GATE 0");
  assert(LOGIC.explainGround("origin", indoorCard, 500, { origin: "STREET BOX 3" }, "x", [])
    === "SENT FROM street mailbox 3 — but the story is indoors", "verdict: street box indoors");
  assert(LOGIC.explainGround("origin", outdoorCard, 500, { origin: "EXT GATE 3" }, "x", [])
    === "SENT FROM indoor line 3 — but the story is outdoors", "verdict: indoor line outdoors");
  assert(LOGIC.explainGround("hops", indoorCard, 500, { hops: "0" }, "x", [])
    === "STOPS none — paper doesn't get here on its own", "verdict: no stops");
  // receipt r < filedMin → "before it was sent"; r == filedMin → "the same minute"
  assert(LOGIC.explainGround("receipt", indoorCard, 518, { receipt: "rcvd +8h35m" }, "x", [])
    === "ARRIVED 2:35 am — before it was sent (2:38 am)", "verdict: arrived before sent");
  assert(LOGIC.explainGround("receipt", indoorCard, 518, { receipt: "rcvd +8h38m" }, "x", [])
    === "ARRIVED 2:38 am — the same minute it was sent", "verdict: arrived same minute");
}

// ---------- the P.S. layer: flavour only, approved build-spec selection ----------
{
  const REGULARS = ["MARA", "OKO", "JUN", "TESS", "VALE"];
  // every regular x night returns a non-empty line
  for (const r of REGULARS) for (let d = 0; d < 5; d++)
    assert(LOGIC.psLine(r, d, {}).length > 0, `ps: ${r} night ${d} empty`);
  // selection order: machine > name-used-last-night > plain
  assert(LOGIC.psLine("MARA", 2, { isMachine: true }) === LOGIC.PS_MACHINE.MARA, "ps: machine");
  assert(LOGIC.psLine("OKO", 3, { isMachine: true, usedLastNight: true }) === LOGIC.PS_MACHINE.OKO,
    "ps: machine beats used-last-night");
  assert(LOGIC.psLine("JUN", 1, { usedLastNight: true, caughtLastNight: false }) === LOGIC.PS_AFTER_COVERED.JUN,
    "ps: covered (waved through)");
  assert(LOGIC.psLine("TESS", 1, { usedLastNight: true, caughtLastNight: true }) === LOGIC.PS_AFTER_MISSED.TESS,
    "ps: missed (caught)");
  assert(LOGIC.psLine("VALE", 4, {}) === LOGIC.PS.VALE[4], "ps: plain");
  // machine + plain arrays are also distinct strings, sanity:
  assert(LOGIC.PS_MACHINE.MARA !== LOGIC.PS.MARA[0], "ps: machine differs from plain");
  // no P.S. may carry the jargon the player-facing scan forbids
  const JARGON = /\b(LATENCY|ORIGIN|RELAYS|RECEIPT|POSTMARK|GATE 0|EXT GATE|STREET BOX|rcvd|vpn)\b|\b\d+ms\b|\+\d+h\d\dm/;
  const all = [...REGULARS.flatMap((r) => LOGIC.PS[r]),
    ...REGULARS.map((r) => LOGIC.PS_MACHINE[r]),
    ...REGULARS.map((r) => LOGIC.PS_AFTER_COVERED[r]),
    ...REGULARS.map((r) => LOGIC.PS_AFTER_MISSED[r])];
  for (const s of all) assert(!JARGON.test(s), `ps jargon: ${s}`);
}

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures ? 1 : 0);
