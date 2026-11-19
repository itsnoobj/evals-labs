// Re-records the real-model benchmark WITHOUT a web server: puppeteer request interception serves the repo from disk
// as http://localhost:PORT/ (a secure context, which WebLLM needs); every other request (CDN, weights) goes to the network.
// Same settings as the live page: Qwen2.5-1.5B, prompt v2, T 0.7, seeds 1000+i, maxTokens 160, maxSteps 4 (agent-step.js defaults).
// puppeteer-core lives OUTSIDE the repo: npm i --prefix /tmp/spike-tools puppeteer-core
// Usage: node scripts/record-runs.mjs --constrain 0|1 [--runs 5] [--temp 0.7] [--prompt v2] [--profile DIR] [--headed] [--probe]
// Output: results-Qwen2.5-1.5B-Instruct-<prompt>-<free|constrained>-t<temp>.json; written to benchmarks/; an existing file of that name is first moved to benchmarks/superseded/ with a timestamp prefix (never overwrites).
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { execSync } from "node:child_process";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const OUT = join(ROOT, "benchmarks");
const PORT = opt("port", "8765");
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};
const puppeteer = createRequire((process.env.SPIKE_TOOLS ?? "/tmp/spike-tools") + "/")("puppeteer-core");
const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const constrain = opt("constrain", "0") === "1";
const prompt = opt("prompt", "v2");
const temp = opt("temp", "0.7");
const runs = opt("runs", "5");
const sh = (c) => {
  try {
    return execSync(c, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
};
const machine = `${sh("sysctl -n machdep.cpu.brand_string")}, ${Math.round(Number(sh("sysctl -n hw.memsize")) / 2 ** 30)} GB, macOS ${sh("sw_vers -productVersion")}`;

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: !flag("headed"),
  userDataDir: opt("profile", "/tmp/evals-lab-profile"),
  protocolTimeout: 60 * 60 * 1000,
  args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan,UseSkiaRenderer"],
});
try {
  const version = await browser.version();
  const page = await browser.newPage();
  await page.setCacheEnabled(false); // never run stale ES modules; model weights live in the Cache API, untouched
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const u = new URL(req.url());
    if (u.hostname !== "localhost") return req.continue();
    const file = join(ROOT, decodeURIComponent(u.pathname), u.pathname.endsWith("/") ? "index.html" : "");
    if (!existsSync(file)) return req.respond({ status: 404, body: "not found" });
    req.respond({ status: 200, contentType: MIME[extname(file)] ?? "text/plain", body: readFileSync(file) });
  });
  if (flag("verbose")) page.on("console", (m) => console.log("[page]", m.text()));
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  // cases=6 matches the current cases.js; pin WebLLM 0.2.79 like llm.js does.
  await page.goto(
    `http://localhost:${PORT}/scripts/model-benchmark.html?engine=worker&runs=${runs}&cases=6&webllm=0.2.79&prompt=${prompt}&temp=${temp}&constrain=${constrain ? 1 : 0}`,
  );

  const snap = () =>
    page.evaluate(() => ({
      status: __bench.status,
      error: __bench.error,
      progress: document.getElementById("progress").textContent,
    }));
  const waitFor = async (ok, ms) => {
    const t0 = Date.now();
    for (;;) {
      const s = await snap();
      if (ok(s)) return s;
      if (s.status === "error") throw new Error(s.error);
      if (Date.now() - t0 > ms) throw new Error("timeout, last: " + JSON.stringify(s));
      await new Promise((r) => setTimeout(r, 3000));
    }
  };

  await waitFor((s) => s.status === "idle", 180000);
  const env = await page.evaluate(() => ({ env: __bench.env, webllm: __bench.webllm, models: __bench.models }));
  console.log(JSON.stringify({ chrome: version, machine, ...env }, null, 2));
  if (flag("probe")) process.exit(0);

  const model = env.models.find((id) => id.includes("Qwen2.5-1.5B-Instruct"));
  if (!model) throw new Error("Qwen2.5-1.5B-Instruct not offered; have " + env.models.join(", "));
  console.log("model:", model);
  await page.evaluate((id) => {
    __bench.runModel(id);
  }, model); // not awaited: poll below

  let last = "";
  const done = await waitFor(
    (s) => {
      if (s.progress !== last) {
        last = s.progress;
        console.log(new Date().toISOString().slice(11, 19), s.progress.slice(0, 200));
      }
      return s.status === "done";
    },
    3 * 60 * 60 * 1000,
  );
  console.log("final:", done.progress);

  const result = await page.evaluate((id) => __bench.results[id], model);
  const name = `results-${model.replace(/-q4f\d+_1-MLC$/, "")}-${prompt}-${constrain ? "constrained" : "free"}-t${temp}.json`;
  const file = join(OUT, name);
  if (existsSync(file)) {
    mkdirSync(join(OUT, "superseded"), { recursive: true });
    renameSync(file, join(OUT, "superseded", `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}-${name}`));
  }
  writeFileSync(
    file,
    JSON.stringify(
      {
        meta: {
          chrome: version,
          machine,
          mode: flag("headed") ? "headed" : "headless",
          webllm: env.webllm,
          userAgent: env.env.userAgent,
        },
        ...result,
      },
      null,
      2,
    ),
  );
  console.log("saved", file);
} finally {
  await browser.close();
}
