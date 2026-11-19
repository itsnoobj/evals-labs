// Builds evals-lab/recorded-runs.json (replay mode) from the real spike results. Run: node evals-lab/spike/make-recorded-runs.mjs
// Replay only needs the Run records, so everything else in the spike JSON is dropped to keep the page download small.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(readFileSync(join(here, name), "utf8"));
const free = read("results-Qwen2.5-1.5B-Instruct-v2-free-t0.7.json");
const constrained = read("results-Qwen2.5-1.5B-Instruct-v2-constrained-t0.7.json");

const out = {
  meta: {
    model: free.model,
    webllm: free.meta.webllm.version,
    chrome: free.meta.chrome,
    machine: free.meta.machine,
    temperature: free.benchmark.temperature,
    recordedAt: free.benchmark.date,
    note: "Real runs of the real model, recorded so the page works without WebGPU.",
  },
  free: free.runs,
  constrained: constrained.runs,
};
writeFileSync(join(here, "..", "recorded-runs.json"), JSON.stringify(out));
console.log(`free ${out.free.length} runs, constrained ${out.constrained.length} runs`);
