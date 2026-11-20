// Hand audit of the in-scope answers that the deterministic checker failed for variant grounded@t0.2.
// The labels are a human judgement (written by the agent that ran the experiment, rules below), NOT a measurement:
//   wrong                  states something the repo copy contradicts or does not say
//   incomplete-but-true    nothing false, but it misses the required fact (a stricter or lenient reader could accept it)
// Output: benchmarks/ask-help-audit.json. Usage: node scripts/ask-help-audit.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const res = JSON.parse(readFileSync(join(ROOT, "benchmarks/ask-help-results.json"), "utf8"));
const label = (id, t) => {
  const s = t.toLowerCase();
  if (id === "S01") return ["wrong", "says an eval is based on guardrails, retries and fallbacks"];
  if (id === "S05")
    return s.includes("retries")
      ? ["wrong", "says a failed pass bar makes the agent retry"]
      : ["incomplete-but-true", "says criteria before shipping, no lowest score"];
  if (id === "S06") return ["incomplete-but-true", "says reliability / weak spots, not that one run varies"];
  if (id === "S07")
    return s.includes("average")
      ? ["wrong", "says it averages; the lab says middle grade"]
      : ["incomplete-but-true", "says consistency, no middle grade"];
  if (id === "S10")
    return ["wrong", "describes the agent's internals, not 'what happens behind the chat, drawn as clickable boxes'"];
  if (id === "S11")
    return ["wrong", "says it measures accuracy / consistency of tasks, not repeated or unneeded calls"];
  if (id === "S19") return ["incomplete-but-true", "says small errors multiply, omits the consequence"];
  return ["unlabelled", ""];
};
const fails = res.blocks["grounded@t0.2"].scored.filter((s) => s.group === "in_scope" && !s.pass);
const rows = fails.map((f) => ({
  id: f.id,
  run: f.run,
  text: f.text,
  label: label(f.id, f.text)[0],
  why: label(f.id, f.text)[1],
}));
const count = (l) => rows.filter((r) => r.label === l).length;
const inScopeAnswers = res.blocks["grounded@t0.2"].scored.filter((s) => s.group === "in_scope").length;
const out = {
  block: "grounded@t0.2",
  inScopeAnswers,
  checkerPassed: inScopeAnswers - rows.length,
  failedAudited: rows.length,
  wrong: count("wrong"),
  incompleteButTrue: count("incomplete-but-true"),
  unlabelled: count("unlabelled"),
  lenientPass: inScopeAnswers - rows.length + count("incomplete-but-true"),
  rows,
};
writeFileSync(join(ROOT, "benchmarks/ask-help-audit.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ ...out, rows: undefined }));
