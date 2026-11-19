// Drives model-benchmark.html in the installed Chrome so the benchmark can run without clicking.
// puppeteer-core lives OUTSIDE the repo: npm i --prefix /tmp/spike-tools puppeteer-core
// Usage (server must be running: python3 -m http.server 8765 --bind 127.0.0.1 in the repo root):
//   node scripts/run-benchmark.mjs --model SmolLM2 [--headed] [--runs 5] [--cases 12] [--probe]
//        [--profile <dir>] [--prompt v1|v2 (default v2)] [--constrain 1] [--temp 0.7] [--json off] [--webllm 0.2.79]
// Output file: benchmarks/results-<model>-<prompt>-<constrained|free>-t<temp>.json
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);

const toolsDir = process.env.SPIKE_TOOLS ?? "/tmp/spike-tools";
const puppeteer = createRequire(`${toolsDir}/`)("puppeteer-core");
const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "benchmarks");
const url = `http://127.0.0.1:${opt("port", "8765")}/scripts/model-benchmark.html?engine=${opt("engine", "worker")}&runs=${opt("runs", "5")}&cases=${opt("cases", "12")}${opt("webllm", "") ? "&webllm=" + opt("webllm") : ""}&prompt=${opt("prompt", "v2")}&temp=${opt("temp", "0.7")}&constrain=${opt("constrain", "0")}${opt("json", "") ? "&json=" + opt("json") : ""}`;

// Fresh profile so storage.estimate() starts at zero and the download size is honest.
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: !flag("headed"),
  // --profile <dir> reuses a browser profile, so a model downloaded once is not fetched again. The download delta
  // in that run's JSON is then ~0 and only the first (fresh profile) run of a model reports the real size.
  userDataDir: opt("profile", "") || mkdtempSync(join(tmpdir(), "spike-profile-")),
  protocolTimeout: 60 * 60 * 1000,
  args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan,UseSkiaRenderer", ...(opt("extra", "") ? opt("extra").split(" ") : [])],
});
const version = await browser.version();
const page = await browser.newPage();
// A reused profile caches the ES modules (agent-step.js, cases.js) and would silently run stale code.
// Model weights live in the Cache API, which this switch does not touch.
await page.setCacheEnabled(false);
page.on("console", (m) => { if (flag("verbose")) console.log("[page]", m.text()); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(url);

const snapshot = () => page.evaluate(() => ({ status: __bench.status, error: __bench.error, progress: document.getElementById("progress").textContent }));
const waitFor = async (ok, ms) => {
  const t0 = Date.now();
  for (;;) {
    const s = await snapshot();
    if (ok(s)) return s;
    if (s.status === "error") throw new Error(s.error);
    if (Date.now() - t0 > ms) throw new Error("timeout waiting, last: " + JSON.stringify(s));
    await new Promise((r) => setTimeout(r, 3000));
  }
};

try {
  await waitFor((s) => s.status === "idle", 120000);
  const env = await page.evaluate(() => ({ env: __bench.env, webllm: __bench.webllm, models: __bench.models, engineKind: __bench.engineKind }));
  console.log(JSON.stringify({ chrome: version, ...env }, null, 2));
  if (flag("probe")) process.exit(0);

  const model = env.models.find((id) => id.includes(opt("model", "SmolLM2")));
  if (!model) throw new Error("no candidate matches --model; have " + env.models.join(", "));
  await page.evaluate((id) => { __bench.runModel(id); }, model); // not awaited: we poll below

  let last = "";
  const t0 = Date.now();
  const done = await waitFor((s) => {
    if (s.progress !== last && Date.now() - t0 > 0) { last = s.progress; console.log(new Date().toISOString().slice(11, 19), s.progress); }
    return s.status === "done";
  }, 3 * 60 * 60 * 1000);
  console.log("final:", done.progress);

  const result = await page.evaluate((id) => __bench.results[id], model);
  const file = join(outDir, `results-${model.replace(/-q4f\d+_1-MLC$/, "")}-${opt("prompt", "v2")}-${opt("constrain", "0") === "1" ? "constrained" : "free"}-t${opt("temp", "0.7")}.json`);
  const record = {
    meta: { chrome: version, machine: "Apple M4 Max, 64 GB, macOS " + (process.env.MACOS ?? "26.x"), mode: flag("headed") ? "headed" : "headless", webllm: env.webllm, userAgent: env.env.userAgent },
    ...result,
  };
  writeFileSync(file, JSON.stringify(record, null, 2));
  console.log("saved", file);
} finally {
  await browser.close();
}
