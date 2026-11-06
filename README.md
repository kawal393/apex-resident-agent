# APEX Guardian

<!-- guardian:begin -->

## FINDINGS — tick 25 at 2026-11-06T16:19:45.070Z

The guardian found 1 thing(s) on the live rail. It reports; it does not fix by itself.

| measured | value |
| --- | --- |
| public files checked | 14 |
| slowest response | 2108 ms |
| tick wall clock | 2.2 s |
| live build | `d66d08fcf0bcec29` |
| registry rows it can see | 1109 |
| licences read by a human | 0 |
| stages wired | 9/10 |

### Findings
- live files changed since the previous tick: index.html, shell.js

### Waiting, and who can move it
- **builder** — name-the-till: APEX_TILL_URL is unset, so no one is checking that the paid endpoint still refuses strangers
- **master** — licence-read: 1109 of 1109 rows have never been read by a human, so the platform refuses every job
- **builder** — route-stage: stages with nothing wired: dialogue

### Last 40 ticks

```
■■□□□□■□□□□□□□□□■□□□□□□□■
```

Append-only memory: [ledger/ticks.jsonl](ledger/ticks.jsonl) · live figures: [state.json](state.json)

<!-- guardian:end -->

See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.


See the README below the board for what this is, what it may not do, and how to run it by hand.

## What it does on every tick

1. **Liveness** — asks the public rail for its pages and assets. A 404 is a finding.
2. **Which build shipped** — reads the `VERSE_BUILD` token out of the live data file, so a claim about the site traces to code.
3. **Integrity** — fingerprints every public file and compares it with the previous tick. A page changing, vanishing, or appearing unannounced is a finding.
4. **Leaks** — scans the public responses for credential shapes. It reports the rule and the filename; it never reads or prints the value.
5. **The queue** — derives what is left from the numbers the rail publishes, and marks the only person who can close each item.

## What it cannot do

No login, no key, no budget. It cannot publish, deploy, spend, email or post. The most it can do is
write its own files and fail its run so the owner gets a notice.

## Running it by hand

```sh
node gate.mjs                    # refuse to ship a tree carrying a credential
node apex-guardian.mjs           # one tick; exit 1 when it found something
node board.mjs                   # render the last tick into README.md
APEX_RAIL_URL=https://other-site node apex-guardian.mjs
```

Requires Node 22+ and outbound HTTPS. No dependencies.

## Why git is the database

A free runner forgets everything between runs; commits do not. The ledger is one JSON line per tick,
so the guardian's history outlives the machine it ran on.

## What this is not yet

The open-weights model that *thinks* about the queue does not live here: a runner has no GPU and
forgets its disk, so a nine-gigabyte model would be re-downloaded every fifteen minutes. This is the
always-on body. The brain needs a server.
