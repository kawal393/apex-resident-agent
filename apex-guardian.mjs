/**
 * The resident guardian of the Sovereign AI Film Verse.
 *
 * It runs on GitHub's free runners every 15 minutes, with no server, no card and no GPU.
 * It touches nothing it does not own: it reads the public rail, measures it, appends to
 * its own ledger, and writes its own status board. It cannot publish, spend, or log in.
 *
 *   node apex-guardian.mjs            one tick, exit 0 when clean, exit 1 when it found
 *                                     something the owner must see
 *
 * Why the ledger is a file in git and not a database: git is the only storage a free
 * runner can write that survives the runner. One commit per tick, append-only, and every
 * claim the agent makes is dated and attributable.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const RAIL = (process.env.APEX_RAIL_URL || "https://filmverse-1mil8xwzv4y.qoder.website").replace(/\/$/, "");
const PAGES = ["index", "workflow", "verse", "tools", "rights", "verify", "passport", "console", "dailies"];
const ASSETS = ["styles.css", "shell.js", "data.generated.js", "tool-links.js", "assets/dailies/preview.mp4"];
const UA = "APEX-Guardian/1.0 (protective integrity check)";

const STATE_FILE = "state.json";
const LEDGER_DIR = "ledger";

/** A credential that shipped into a public file. Reported as rule + filename, value never read.
 *  Patterns are written so this file's own source cannot match them. */
export const LEAK_RULES = [
  ["replicate token", "r8_[A-Za-z0-9]{20,}"],
  ["jwt", "eyJ[A-Za-z0-9_-]{10,}\\."],
  ["private key", "-{5}BEGIN [A-Z ]*PRIVATE KEY-{5}"],
  ["aws access key", "AKIA[0-9A-Z]{16}"],
  ["github token", "(ghp|github_pat)_[A-Za-z0-9]{20,}"],
  ["service account json", '"private_key"\\s*:\\s*"'],
  ["supabase key", "sbp_[A-Za-z0-9]{20,}"],
];

async function get(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
    const body = res.ok ? await res.text() : "";
    return { url, status: res.status, ok: res.ok, body, ms: Date.now() - started };
  } catch (e) {
    return { url, status: 0, ok: false, body: "", ms: Date.now() - started, why: String(e.message ?? e) };
  }
}

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

export async function tick() {
  const started = Date.now();
  const urls = [...PAGES.map((p) => `${RAIL}/${p === "index" ? "index.html" : `${p}.html`}`), ...ASSETS.map((a) => `${RAIL}/${a}`)];
  const responses = await Promise.all(urls.map(get));

  const findings = [];
  const dead = responses.filter((r) => !r.ok);
  for (const d of dead) findings.push(`page-or-asset unreachable: ${d.url} (${d.status || d.why})`);

  // 1. Which build is actually live, and does it match the last one we recorded?
  const data = responses.find((r) => r.url.endsWith("data.generated.js"));
  const build = data?.body?.match(/VERSE_BUILD\s*=\s*"([^"]+)"/)?.[1] ?? null;
  if (data?.ok && !build) findings.push("the live data file carries no VERSE_BUILD token, so no one can prove which registry produced it");

  // 2. Integrity: every public file fingerprinted, so a change under us is visible.
  const fingerprints = Object.fromEntries(responses.filter((r) => r.ok).map((r) => [r.url.replace(`${RAIL}/`, "") || "index", sha(r.body)]));
  const before = loadState();
  const changed = before?.fingerprints ? Object.entries(fingerprints).filter(([k, v]) => before.fingerprints[k] && before.fingerprints[k] !== v).map(([k]) => k) : [];
  const vanished = before?.fingerprints ? Object.keys(before.fingerprints).filter((k) => !(k in fingerprints)) : [];
  const appeared = before?.fingerprints ? Object.keys(fingerprints).filter((k) => !(k in before.fingerprints)) : [];
  if (changed.length) findings.push(`live files changed since the previous tick: ${changed.join(", ")}`);
  if (vanished.length) findings.push(`live files disappeared since the previous tick: ${vanished.join(", ")}`);
  if (appeared.length) findings.push(`new live files appeared since the previous tick: ${appeared.join(", ")}`);

  // 3. Secrets that shipped.
  for (const r of responses) {
    if (!r.ok) continue;
    for (const [label, pattern] of LEAK_RULES) {
      if (new RegExp(pattern).test(r.body)) findings.push(`LEAK: ${label} present in ${r.url.replace(`${RAIL}/`, "")}`);
    }
  }

  const backlog = [];

  // 4. The till, not the window. A page that renders can still hide a dead endpoint, so the
  //    agent asks the door that would take money. Unauthenticated it must refuse; a 200 or a
  //    404 there means either an open door or no door at all.
  if (process.env.APEX_TILL_URL) {
    const till = await get(process.env.APEX_TILL_URL);
    if (till.status === 401 || till.status === 403 || till.status === 503) {
      console.log(`  till answers ${till.status} to an unauthenticated request — the door exists and is shut`);
    } else {
      findings.push(`till ${process.env.APEX_TILL_URL} answered ${till.status || till.why}; expected 401/403/503`);
    }
  } else {
    backlog.push({ id: "name-the-till", owner: "builder", why: "APEX_TILL_URL is unset, so no one is checking that the paid endpoint still refuses strangers" });
  }

  // 5. What the rail itself admits, read back out of the live numbers.
  let verse = null;
  try {
    verse = JSON.parse(data.body.match(/window\.APEX_VERSE\s*=\s*(\{[\s\S]*\});?\s*$/m)[1].replace(/;\s*$/, ""));
  } catch {
    if (data?.ok) findings.push("the live data file could not be parsed, so its numbers are unverifiable");
  }
  if (verse) {
    const unread = verse.rows.filter((r) => !r.v).length;
    if (unread > 0) backlog.push({ id: "licence-read", owner: "master", why: `${unread} of ${verse.rows.length} rows have never been read by a human, so the platform refuses every job` });
    const empty = (verse.coverage?.empty ?? []).length ? verse.coverage.empty : verse.stages.filter((s) => s.tools.length === 0).map((s) => s.id);
    if (empty.length) backlog.push({ id: "route-stage", owner: "builder", why: `stages with nothing wired: ${empty.join(", ")}` });
    const linksOk = responses.some((r) => r.url.endsWith("tool-links.js") && r.ok);
    if (!linksOk) backlog.push({ id: "publish-links", owner: "builder", why: "no tool-links.js on the live rail, so the catalogue cards open nothing" });
    if (verse.stats.duplicates > 0) backlog.push({ id: "dedupe", owner: "builder", why: `${verse.stats.duplicates} duplicate tool names in the registry` });
  }

  const ok = findings.length === 0;
  const stamp = new Date().toISOString();
  const state = {
    lastTick: stamp,
    ticks: (before?.ticks ?? 0) + 1,
    rail: RAIL,
    build,
    wallClockSeconds: Math.round((Date.now() - started) / 100) / 10,
    filesChecked: urls.length,
    slowestMs: Math.max(...responses.map((r) => r.ms)),
    measured: verse ? { rows: verse.stats.rows, cleared: verse.stats.clearedForClientWork, awaitingLicenceRead: verse.stats.awaitingLicenceRead, stagesWired: `${verse.stages.length - (verse.coverage?.empty?.length ?? 0)}/${verse.stages.length}` } : null,
    fingerprints,
    findings,
    backlog,
    history: [...(before?.history ?? []), { at: stamp, ok, findings: findings.length, s: Math.round((Date.now() - started) / 100) / 10 }].slice(-200),
  };

  mkdirSync(LEDGER_DIR, { recursive: true });
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
  appendFileSync(`${LEDGER_DIR}/ticks.jsonl`, `${JSON.stringify({ at: stamp, ok, findings, ticks: state.ticks, s: state.wallClockSeconds })}\n`);
  writeFileSync("status/data.json", `${JSON.stringify(state, null, 2)}\n`);

  const headline = ok ? `CLEAN ${state.filesChecked} files, build ${String(build).slice(0, 8)}, ${state.wallClockSeconds}s` : `${findings.length} FINDING(S)`;
  console.log(headline);
  for (const f of findings) console.log("  -", f);
  for (const b of backlog) console.log("  queue:", b.id, "→", b.why);
  return { ok, state };
}

// pathToFileURL, not a hand-built "file:///" string: on Linux argv[1] already starts with a
// slash, so a hand-built URL has four of them and never matches — the tick silently never ran.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync("status", { recursive: true });
  mkdirSync(LEDGER_DIR, { recursive: true });
  tick()
    .then(({ ok }) => process.exit(ok ? 0 : 1))
    .catch((e) => {
      // A guardian that throws tells the owner nothing. Report itself as broken and still commit a line.
      const at = new Date().toISOString();
      const why = String(e?.stack ?? e).split("\n")[0];
      const state = { lastTick: at, ticks: (loadState()?.ticks ?? 0) + 1, rail: RAIL, build: null, wallClockSeconds: 0, filesChecked: 0, slowestMs: 0, measured: null, fingerprints: {}, findings: [`GUARDIAN BROKE: ${why}`], backlog: [], history: [] };
      writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
      writeFileSync("status/data.json", `${JSON.stringify(state, null, 2)}\n`);
      appendFileSync(`${LEDGER_DIR}/ticks.jsonl`, `${JSON.stringify({ at, ok: false, findings: state.findings, ticks: state.ticks, s: 0 })}\n`);
      console.log("GUARDIAN BROKE:", why);
      process.exit(1);
    });
}
