// Runs every *.test.mjs in this folder plus the agent-step self-check. Exit code 1 if any fail.
// Usage: node evals-lab/run-all-tests.mjs   (or: npm test)
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const jobs = [
  ...readdirSync(here).filter((f) => f.endsWith(".test.mjs")).sort().map((f) => [f, [join(here, f)]]),
  ["agent-step.js --selfcheck", [join(here, "agent-step.js"), "--selfcheck"]],
];
let failed = 0;
for (const [name, args] of jobs) {
  const r = spawnSync(process.execPath, args, { encoding: "utf8" });
  const ok = r.status === 0;
  const last = (r.stdout || "").trim().split("\n").pop() || "";
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${ok ? last.slice(0, 60) : (r.stderr || r.stdout).trim().split("\n").slice(0, 6).join("\n")}`);
  if (!ok) failed += 1;
}
console.log(failed ? `${failed} of ${jobs.length} test files failed` : `all ${jobs.length} test files passed`);
process.exit(failed ? 1 : 0);
