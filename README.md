# NIGHT SHIFT

A five-night deduction thriller. One filing on every docket isn't human.
**Game Off 2026** entry — theme: *SHIFT*.
Standalone spin-off of [Last Human Standing](https://lasthumanstanding.thisyearnofear.com) —
same ARIA, same wire, no account needed.

You work the night desk. Five papers come in a night, each carrying a
strip that shows **how it got here** — TRAVEL TIME · SENT FROM · STOPS ·
ARRIVED. One sender is a machine using a regular's name, and the trip is
the only testimony: a human oddity has a reason written on the paper —
the machine's doesn't.
**Spot the machine. Three strikes and you're cut.**

One docket, one machine — it wears a **different face every night** (a
seeded permutation of the five senders, so today's faces are the same for
everyone who clocks in), and the face's real owner never files. Learning
a face buys you nothing — **the tell changes class each night**: odd
fields, then oddities that only count because the paper doesn't excuse
them, then trips that read clean but contradict the story, then a
travel time repeated from its own file (**F** opens it). When the story week
closes, the desk keeps running: **overtime** deals a fresh five-night
run from a generated docket (new faces included) — a second daily
ritual next to the week.

## Run it

No build step, no dependencies:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(index.html also works straight from disk — no modules, no fetches.)

## How to play

- **Night zero — story, then the guided tour**: the first clock-in
  opens with a five-panel story (the office, the senders, the stamps,
  the thing that learned to write like a person) — skippable with
  **Skip**, which lands on the coached first paper. Then a coach bubble
  walks the real filing: how the paper got here and what a person's
  *usually* looks like, then the clerk's note and what it explains,
  then the off lines pulse — tap one, stamp SUS. A second paper teaches
  the other half: a real person whose one strange line the note
  explains — stamp HUMAN. Night zero forgives every miss: no strikes, a
  wrong field re-asks, and waving the machine through costs nothing.
  **Skip tour** sits inside the coach and skips the rest straight to
  night one; once the tour is done or skipped, future clock-ins go
  straight to night one — no story — and the handbook's **Replay the
  tour** brings the whole thing back. That's every verb the week uses.
- **The nights**: five papers, one at a time, each a paper card with a
  taped clerk's note and a tear-off trip stub. The only question is
  *did a person send this?*
  - **Circle, then stamp.** Click a line on the strip (or press `1`–`4`)
    and the grease pencil rings it; the button reads `SUS · SENT FROM`. Stamp
    **SUS** and that field is your accusation. Circle the real tell and
    the catch is yours (+100) — the ID photo unmasks: *IT WORE TESS*.
    Stamp SUS with nothing circled and the desk asks which field.
  - **HUMAN** on a person: upheld, +50. One filing a night is tagged
    **DOUBLE PAY**.
  - **A wrong stamp is a strike, either direction**: accuse a person, or
    wave the machine through (the desk circles what you missed in red).
    Accuse a person whose note explains the oddity and the card draws
    the line from the note to the field.
- **How it got here** — four lines printed at the foot of every paper,
  the same muted strip for every sender, nothing flagged. Night zero
  and night one print the baseline beside each line — *usually* — and
  the handbook keeps it permanently:
  - `TRAVEL TIME` — how long it took to arrive. Usually **0.1 sec or
    more**: a person waits on the wire.
  - `SENT FROM` — usually **somewhere outside the office**: an indoor
    line is indoors, a street mailbox is outdoors; inside this office
    is locked at night.
  - `STOPS` — how many stops it made on the way. Usually **2 or more**.
  - `ARRIVED` — when the desk logged it. Usually **after it was
    sent**.
  The rule of the desk: **every human oddity has an excuse written on
  the paper** — the clerk's marginal note. A strange line *with* its
  excuse is a person being human; a strange line *without* one is the
  machine. Later nights ask more: a street mailbox on an indoor story,
  an arrival logged before the paper was sent, a travel time the
  machine has already sent — check its file (`F`). Everything else is
  texture: the off-square drop, the quiet landing — every sender draws
  from the same pool, so none of it is a signature.
- **Strikes**: the stakes are symmetric — a wrong stamp is a strike,
  either direction: wave the machine through (HUMAN) or accuse a person
  on grounds that fail (SUS). Three strikes cut you to jury duty at the
  close of the shift — the room goes dark, the counter takes a red
  `CUT`, and the rest of the week is yours to read from the other side.
  A flawless 5/5 night clears a strike.
- **Finale — the machine's final proof**: after night five, the last
  docket of the week arrives, trips and all. Sign the clause that
  cuts the machine — and only the machine — or sign the one that cuts
  only humans and lets it belong. On some dockets the winning clause is
  *stayed up late*: lateness is the one thing the machine can't fake.
  Endings: **LAST HUMAN STANDING** (clean cut), **COLLATERAL** (the clause
  cut the machine and people), or **THE DAY SHIFT IS AUTOMATED** (it
  belongs — tomorrow the desk is its, and you'll sign what it files).
- **Overtime**: close a week (any ending) and the dawn screen offers
  **Overtime** — a fresh five-night run generated from the day's seed
  (`ot-<date>`), same spine, new docket, a new face on the machine. The
  desk also keeps a **day docket** there: read ARIA's rulings, deduce the
  sealed rule, file the one card she'd pass — the deduction half of the
  game, kept off the week's spine. A passing card survives; a failing one
  is a strike.
- **The Machine's Shift**: finish a week — any ending — and the title offers the
  inversion — three generated nights where *you* file the proofs, playing
  the thing the week was hunting. Filing still asks you to satisfy the
  sealed rule, but then the night audit turns inside out: your own
  trip stub arrives fully machine-flavored, and a scarce **cover**
  budget patches each field through three tiers — machine, clean,
  lived-in. The wire judges suspicion against a tightening tolerance,
  and two tripwires catch the careless: a proof that fails the spec, and
  a stub polished *too* clean (overrehearsed reads as fake). Endings:
  **UNVERIFIED** (slipped all three — the wire filed you as human),
  **REVIEWED**, or **CAUGHT**.
- Keys: `1`–`4` circle a line on the trip · `H`/`S` or `←`/`→` stamp ·
  `Enter` continue · `1`–`4` also select or patch (overtime/machine) · `Shift` focus loupe (overtime/machine)
  · `O` oath · `F` the machine's file · `M` audio · `?` the handbook.

## Seeds & sharing

Every run is seeded, so a docket deals identically every time. **Clock in —
today's docket** uses the date as the seed (DOCKET #N, Wordle-style);
**Random docket** rolls a fresh one. `?seed=abc` in the URL plays that
docket. The ending screen prints a share card — copy it with **Copy
result**, and the whole shift exports as a printable case file.

## Tech

Vanilla JS + DOM + WebAudio, works from `file://`. Four plain scripts:
`riddles.js` (the card deck, the week's nights, the machine's faces),
`logic.js` (pure rule-checking and deal/audit/finale generation — no DOM),
`score.js` (the composed score — owns the AudioContext), `game.js`
(screens, input, mute policy).

Verification — the tripwire, run it after touching the spine:
- `node test-logic.mjs` hammers `logic.js` with 2,000 seeded deals, audits
  and clues per day plus 300 generated overtime weeks and 2,000 finale
  seeds, asserting invariants (determinism included).
- `node audit-deduction.mjs` is the Golden Idol loop as code: for 300
  seeded dockets per day it checks what a perfect logician could conclude
  — pinning rate, single-word harmful theories (0% on all five nights),
  and liar-day fog cover.
- `node test-cold-open.mjs` drives the title → the three night-zero beats
  → the first catch in a headless DOM, including the title trim, the
  teaching grace, and the machine staying silent until it's caught
  (36 checks).
- `node test-night.mjs` proves the spine: HUMAN on a human pays, HUMAN on
  the machine escapes, SUS always asks for grounds, a real tell is the
  catch, a failed accusation on a human is a strike (18 checks).
- `node test-week.mjs` plays the rebuilt week end to end — night zero,
  five night-only shifts, the finale (33 checks).
- `node test-finale.mjs` proves the belong finale: across 12 seeds,
  exactly one clause ever cuts only the machine, and all three endings
  (clean / collateral / belong) are reachable (88 checks).
- `node test-overtime.mjs` proves overtime kept its deduction days: the
  day docket deals, a passing card survives, and each night still audits
  five filings with one machine (21 checks).

The day/night shift is `body[data-shift]` + CSS variables; the UI layer
is inline SVG + CSS, and the room behind it is painted key art
(generated with MiniMax H3 via fal.ai — three angles of one office,
crossfaded per shift, with the SVG scene as the fallback). State changes
are physical on purpose — cards deal, filings fly to the tray, the night
stamp swings and throws ink, a catch is circled in red grease pencil, the
finale is a decree you fill in and sign — and `prefers-reduced-motion`
skips every flight, leaving the state change visible and instant.
The score is two layers. The **music** is licensed: "Manhattan Lounge"
(WeLoveIndies) loops under the whole shift — title, night zero, every
audit; "Blue In Green" (WeLoveIndies) plays once when the week closes at
dawn. The composed WebAudio layer (`score.js`) carries the punctuation,
not the chart: the horn sting and chord on a catch, the resolve chord at
dawn, and the room — a whisper-quiet sub-bass bed, vinyl crackle, and
procedural rain on the office window that gets wetter each night of the
week, with the odd far-off thunder roll while the audit desk is lit.
`M` toggles audio. A skippable WeLoveIndies intro tag plays once on
first load (their license's credit condition).

## Credits

Painted key art generated with MiniMax H3 (fal.ai); the brass seal render
is Hyper3D Rodin; music licensed from WeLoveIndies ("Manhattan Lounge",
"Blue In Green" — F/demo license, credited in-game); stings, foley and
sound design are composed WebAudio (`score.js`); the paper UI is inline
SVG. All proceedings fictional. Full license text:
`LICENSE-CREDITS.txt`.

## Status

Game Off 2026 jam build. Deadline: December 1, 2026, 13:37 PST.
