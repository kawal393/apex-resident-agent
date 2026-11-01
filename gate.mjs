/**
 * gate.mjs — refuse to publish this tree if it carries a credential.
 *
 *   node gate.mjs            run before every push, and as a CI step
 *
 * The rules are imported from the guardian itself, never re-typed here, so the gate and the
 * watcher can drift apart only by editing one file. A file whose own source contains a rule
 * literally is not a leak; the guardian builds those patterns in pieces for that reason.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { LEAK_RULES } from "./apex-guardian.mjs";

const SKIP = /(?:^|[\\/])\.git(?:[\\/]|$)|(?:^|[\\/])node_modules(?:[\\/]|$)/;
const TEXT = /\.(js|mjs|cjs|html|css|json|txt|md|ya?ml|qoder\.site)$/i;

let bad = 0;
let files = 0;
for (const f of readdirSync(".", { recursive: true })) {
  const rel = String(f);
  if (SKIP.test(rel) || !TEXT.test(rel)) continue;
  let text;
  try {
    if (statSync(rel).isDirectory()) continue;
    text = readFileSync(rel, "utf8");
  } catch {
    continue;
  }
  files++;
  for (const [label, pattern] of LEAK_RULES) {
    let re;
    try {
      re = new RegExp(pattern);
    } catch (e) {
      console.log(`BAD RULE  ${label} — ${e.message}`);
      bad++;
      continue;
    }
    if (re.test(text)) {
      console.log(`LEAK  ${rel} carries ${label}`);
      bad++;
    }
  }
}

console.log(`${files} files scanned against ${LEAK_RULES.length} rules`);
if (bad > 0) {
  console.log("PUSH BLOCKED");
  process.exit(1);
}
console.log("GATE OPEN — nothing in this tree looks like a credential");
