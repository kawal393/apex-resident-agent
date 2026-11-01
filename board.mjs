/**
 * board.mjs — renders the last tick into README.md, so the guardian's report is a page
 * anyone can open without a login, a server, or a build step.
 *
 *   node board.mjs
 *
 * Every figure comes from state.json, written by the tick itself. The prose between the
 * markers is regenerated; anything outside them is the owner's and is left alone.
 */

import { readFileSync, writeFileSync } from "node:fs";

const START = "<!-- guardian:begin -->";
const END = "<!-- guardian:end -->";

const s = JSON.parse(readFileSync("state.json", "utf8"));
const ok = s.findings.length === 0;
const last = s.history.slice(-40);
const bar = last.map((h) => (h.ok ? "□" : "■")).join("");
const cleanStreak = (() => {
  let n = 0;
  for (const h of [...last].reverse()) {
    if (!h.ok) break;
    n++;
  }
  return n;
})();

const body = [
  `## ${ok ? "CLEAN" : "FINDINGS"} — tick ${s.ticks} at ${s.lastTick}`,
  "",
  ok
    ? `Every public file answered, nothing changed since the previous tick, and no credential appeared in a file the world can read. **${cleanStreak} clean ticks in a row.**`
    : `The guardian found ${s.findings.length} thing(s) on the live rail. It reports; it does not fix by itself.`,
  "",
  `| measured | value |`,
  `| --- | --- |`,
  `| public files checked | ${s.filesChecked} |`,
  `| slowest response | ${s.slowestMs} ms |`,
  `| tick wall clock | ${s.wallClockSeconds} s |`,
  `| live build | \`${String(s.build).slice(0, 16)}\` |`,
  `| registry rows it can see | ${s.measured?.rows ?? "—"} |`,
  `| licences read by a human | ${s.measured?.cleared ?? "—"} |`,
  `| stages wired | ${s.measured?.stagesWired ?? "—"} |`,
  "",
  "### Findings",
  ok ? "_none_" : s.findings.map((f) => `- ${f}`).join("\n"),
  "",
  "### Waiting, and who can move it",
  s.backlog.length ? s.backlog.map((b) => `- **${b.owner}** — ${b.id}: ${b.why}`).join("\n") : "_empty_",
  "",
  "### Last 40 ticks",
  "",
  "```",
  bar || "(no history yet)",
  "```",
  "",
  `Append-only memory: [ledger/ticks.jsonl](ledger/ticks.jsonl) · live figures: [state.json](state.json)`,
].join("\n");

const full = `# APEX Guardian

${START}

${body}

${END}

See the README below the board for what this is, what it may not do, and how to run it by hand.
`;

const existing = (() => {
  try {
    return readFileSync("README.md", "utf8");
  } catch {
    return "";
  }
})();

const tail = existing.includes(END) ? existing.slice(existing.indexOf(END) + END.length) : `\n${legacyTail()}`;
writeFileSync("README.md", `${full}${tail}`);
console.log(`README rendered: ${ok ? "CLEAN" : `${s.findings.length} finding(s)`}, tick ${s.ticks}, streak ${cleanStreak}`);

function legacyTail() {
  return `## What it does on every tick

1. **Liveness** — asks the public rail for its pages and assets. A 404 is a finding.
2. **Which build shipped** — reads the \`VERSE_BUILD\` token out of the live data file, so a claim about the site traces to code.
3. **Integrity** — fingerprints every public file and compares it with the previous tick. A page changing, vanishing, or appearing unannounced is a finding.
4. **Leaks** — scans the public responses for credential shapes. It reports the rule and the filename; it never reads or prints the value.
5. **The queue** — derives what is left from the numbers the rail publishes, and marks the only person who can close each item.

## What it cannot do

No login, no key, no budget. It cannot publish, deploy, spend, email or post. The most it can do is
write its own files and fail its run so the owner gets a notice.

## Running it by hand

\`\`\`sh
node gate.mjs                    # refuse to ship a tree carrying a credential
node apex-guardian.mjs           # one tick; exit 1 when it found something
node board.mjs                   # render the last tick into README.md
APEX_RAIL_URL=https://other-site node apex-guardian.mjs
\`\`\`

Requires Node 22+ and outbound HTTPS. No dependencies.

## Why git is the database

A free runner forgets everything between runs; commits do not. The ledger is one JSON line per tick,
so the guardian's history outlives the machine it ran on.

## What this is not yet

The open-weights model that *thinks* about the queue does not live here: a runner has no GPU and
forgets its disk, so a nine-gigabyte model would be re-downloaded every fifteen minutes. This is the
always-on body. The brain needs a server.
`;
}
