# APEX Guardian

The resident body of the Sovereign AI Film Verse. It runs every fifteen minutes on GitHub's
free runners — no server, no card, no GPU, nothing installed on anyone's laptop.

## What it does on every tick

1. **Liveness** — asks the public rail for its eight pages and four assets. A 404 is a finding.
2. **Which build shipped** — reads the `VERSE_BUILD` token out of the live data file. That token is
   the hash of the registry rows that produced it, so a claim about the site can be traced to code.
3. **Integrity** — fingerprints every public file and compares it with the previous tick. A page
   changing, vanishing, or appearing unannounced is a finding, not a rumour.
4. **Leaks** — scans the public responses for credential shapes. It reports the rule and the
   filename; it never reads or prints the value.
5. **The queue** — derives what is left to do from the numbers the rail itself publishes, and marks
   each item with the only person who can close it.

## What it cannot do

It has no login, no key, no budget. It cannot publish, deploy, spend, email, or post. The most it
can do is write its own `state.json`, append to `ledger/ticks.jsonl`, and fail its run so GitHub
sends the owner a notice.

## Running it by hand

```sh
node apex-guardian.mjs          # one tick; exit 1 when it found something
APEX_RAIL_URL=https://other-site node apex-guardian.mjs
```

Requires Node 22 or newer and outbound HTTPS to the rail. No dependencies, nothing to install.

## The board

The workflow publishes `status/` to GitHub Pages. It prints only what the last tick measured,
including every finding, so an honest day and a bad day look different.

## Why git is the database

A free runner forgets everything between runs. Commits do not. The ledger is append-only JSONL, one
line per tick, which means the guardian's history outlives the machine it ran on and stays readable
by anyone without a key.

## What this is not yet

The open-weights model that *thinks* about the backlog does not live here: a runner has no GPU and
forgets its disk, so a nine-gigabyte model would be re-downloaded every fifteen minutes. The
guardian is the always-on body; the brain needs the server that has not been signed up for yet.
