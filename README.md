# NIGHT SHIFT

A five-night deduction thriller. One filing on every docket isn't human.
**Game Off 2026** entry — theme: *SHIFT*.
Standalone spin-off of [Last Human Standing](https://lasthumanstanding.thisyearnofear.com) —
same ARIA, same wire, no account needed.

You work the night desk. Five filings a night, each stamped with a
**postmark** — LATENCY · ORIGIN · RELAYS · RECEIPT. One filer is a machine
wearing a human face, and the postmark is the only testimony: a human
postmark is messy, a machine postmark reads too clean to be a person.
**Spot the machine. Three strikes and you're cut.**

One docket, one machine — any of the five filers could be it, seeded per
docket, so today's face is the same face for everyone who clocks in. The
face doesn't change across the week; **the tells do**: two obvious on
night one, a single impossible field by night five, while the humans'
packets tidy up around it. When the story week closes, the desk keeps
running: **overtime** deals a fresh five-night run from a generated
docket (a new face included) — a second daily ritual next to the week.

## Run it

No build step, no dependencies:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(index.html also works straight from disk — no modules, no fetches.)

## How to play

- **Night zero — the first minute**: clocking in teaches the game one
  screen at a time, and every beat is skippable. First the desk: five
  faces and the premise — one of these filers is a machine that wants to
  be filed as human, and only the postmark says otherwise. Then the
  wrongness: a person's postmark laid beside the machine's strip, five
  aligned rows — messy latency, a real gate, a receipt that waits,
  against a filing that arrived perfect. Then your first catch: one
  filing on the desk — stamp it SUS and point at the field that gives
  it away. Night zero forgives a first miss: a wrong field re-asks, and
  waving the machine through costs no strike. The desk is teaching, not
  testing. That's every verb the week uses.
- **The nights**: five filings, one at a time. The only question is *is
  this filer the machine?* — the paper (where · when · who · in/out)
  prints plain on the card, but it's context, not a verdict. Stamp each
  **HUMAN** or **SUS** (`H` / `S` / `←` / `→` / buttons).
  - **HUMAN** on a person: upheld, +50. One filing a night is
    **contested** — call it right for double pay.
  - **HUMAN** on the machine: it walks through — and the mark is on your
    counter, not its file. The stakes are **symmetric**: a wrong stamp is
    a strike, either direction. Only reading the postmark is free.
  - **SUS** is an accusation, and an accusation needs grounds: the desk
    asks which postmark field reads wrong. Point at a **real tell** and
    the catch is yours (+100 bounty, circled in red grease pencil). Point
    at a human's field — or name no grounds — and the hunch is a wrong
    stamp, and a wrong stamp is a **strike** (the field you named is
    struck through). The grounds row looks identical on every SUS, so it
    is not itself a tell: only the postmark can hold an accusation.
- **The postmark** is four fields, printed at the foot of every card —
  the same muted strip for every filer, nothing flagged:
  - `LATENCY` — round-trip time. Machines answer before the lamp warms.
  - `ORIGIN` — where the packet was sent from. A gate named zero is not
    a person's door.
  - `RELAYS` — hops the filing crossed. Humans route; machines don't.
  - `RECEIPT` — delay between post and receipt. Lateness is human. A
    receipt stamped before its post is not.
  Everything else on the card is texture: the clerk's marginal note, the
  off-square drop, the quiet landing — every filer draws from the same
  pool, so none of it is a signature. The postmark is the only testimony.
- **Strikes**: the stakes are symmetric — a wrong stamp is a strike,
  either direction: wave the machine through (HUMAN) or accuse a person
  on grounds that fail (SUS). Three strikes cut you to jury duty at the
  close of the shift — the room goes dark, the counter takes a red
  `CUT`, and the rest of the week is yours to read from the other side.
  A flawless 5/5 night clears a strike.
- **Finale — the machine's final proof**: after night five, the last
  docket of the week arrives, postmarks and all. Sign the clause that
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
- **The Machine's Shift**: clear overtime and the title offers the
  inversion — three generated nights where *you* file the proofs, playing
  the thing the week was hunting. Filing still asks you to satisfy the
  sealed rule, but then the night audit turns inside out: your own
  postmark stub arrives fully machine-flavored, and a scarce **cover**
  budget patches each field through three tiers — machine, clean,
  lived-in. The wire judges suspicion against a tightening tolerance,
  and two tripwires catch the careless: a proof that fails the spec, and
  a stub polished *too* clean (overrehearsed reads as fake). Endings:
  **UNVERIFIED** (slipped all three — the wire filed you as human),
  **REVIEWED**, or **CAUGHT**.
- Keys: `H`/`S` or `←`/`→` stamp · `Enter` file/continue · `1`–`4`
  select or patch (overtime/machine) · `Shift` focus loupe (overtime/machine)
  · `O` oath · `M` audio · `?` the handbook.

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
