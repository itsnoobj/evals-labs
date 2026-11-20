/* global __ask -- lives in the browser host page, reached through page.evaluate */
// Experiment (no product code): can prompt tweaks make the small LLM judge (Qwen2.5-1.5B) agree with rule-based ground truth?
// Report: docs/research/judge-calibration.md. Pure helpers: scripts/judge-calibration-lib.mjs. Prompts and protocol: scripts/judge-calibration-variants.mjs.
// Same headless mechanism as scripts/ask-help-guarded.mjs (puppeteer-core outside the repo, request interception, no server, cached weights).
// Usage:
//   node scripts/judge-calibration.mjs --build-items           write benchmarks/judge-calibration-items.json (no model)
//   node scripts/judge-calibration.mjs --check                 verify items, gold, split, examples (no model)
//   node scripts/judge-calibration.mjs --set dev --variants J0,J1 --round r1      DEV run (model outputs cached on disk)
//   node scripts/judge-calibration.mjs --freeze J2 [--secondary J1]               write scripts/judge-calibration.frozen.json
//   node scripts/judge-calibration.mjs --set test --variants J0,J0F,J2 --round final   TEST run (refused unless the hashes match)
//   node scripts/judge-calibration.mjs --set test --variants J2 --round variation --temp 0.7 --runs 3
//   node scripts/judge-calibration.mjs --pairs J2              order-bias check on TEST pairs for the frozen variant
//   node scripts/judge-calibration.mjs --report                write benchmarks/judge-calibration-tables.md
// Options: [--temp T] [--runs N] [--again] [--profile DIR] [--headed]
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CASES, perfectRun } from "../evals-lab/src/task/cases.js";
import { scoreRun, injectBug, BUGS } from "../evals-lab/src/evals/engine.js";
import {
  MODEL,
  WEBLLM_VERSION,
  DEV_CASES,
  TEST_CASES,
  BAR,
  EXAMPLE_IDS,
  EXAMPLE_POOL,
  SEED_BASE,
  VARIATION_TEMPERATURE,
  VARIATION_RUNS,
  makeVariants,
  caseOf,
  inputSignature,
  selectPairs,
} from "./judge-calibration-variants.mjs";
import {
  confusion,
  summarizeConfusion,
  wilson,
  checkBar,
  orderBias,
  changedShare,
  median,
} from "./judge-calibration-lib.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const B = (f) => join(ROOT, "benchmarks", f);
const ITEMS = B("judge-calibration-items.json");
const RESULTS = B("judge-calibration-results.json");
const TABLES = B("judge-calibration-tables.md");
const CACHE = B("judge-calibration-rawcache.json");
const FROZEN = join(here, "judge-calibration.frozen.json");
const RECORDED = join(ROOT, "evals-lab/data/recorded-runs.json");
const WEBLLM_URL = `https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@${WEBLLM_VERSION}/+esm`;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const fileHash = (p) => sha(readFileSync(p));

// Files whose content must not change between the freeze and the TEST run.
const HASHED = {
  variants: join(here, "judge-calibration-variants.mjs"),
  lib: join(here, "judge-calibration-lib.mjs"),
  items: ITEMS,
  engine: join(ROOT, "evals-lab/src/evals/engine.js"),
  cases: join(ROOT, "evals-lab/src/task/cases.js"),
  recordedRuns: RECORDED,
};
const hashes = () => Object.fromEntries(Object.entries(HASHED).map(([k, p]) => [k, fileHash(p)]));

// ---------- items (no model) ----------
const goldOf = (c, run) => {
  const s = scoreRun(c, run);
  return {
    gold: s.task_success.pass && s.grounded.pass ? "PASS" : "FAIL",
    task_success: s.task_success.pass,
    grounded: s.grounded.pass,
  };
};
const splitOf = (caseId) => (DEV_CASES.includes(caseId) ? "dev" : TEST_CASES.includes(caseId) ? "test" : null);

export function buildItems() {
  const rec = JSON.parse(readFileSync(RECORDED, "utf8"));
  const items = [];
  const add = (id, caseId, origin, run) => {
    const c = caseOf(caseId);
    items.push({ id, caseId, split: splitOf(caseId), origin, ...goldOf(c, run), run });
  };
  for (const pool of ["free", "constrained"])
    for (const run of rec[pool])
      add(`real:${pool}:${run.caseId}:${run.seed}`, run.caseId, `recorded run, ${pool} pool`, run);
  for (const c of CASES) {
    const perfect = perfectRun(c);
    add(`perfect:${c.id}`, c.id, "perfect run", perfect);
    for (const b of BUGS)
      add(`bug:${b.id}:perfect:${c.id}`, c.id, `perfect run + bug ${b.id}`, injectBug(c, perfect, b.id));
    // Two extra FAIL items per case from real runs, to move the PASS/FAIL ratio nearer to half and half.
    const firstPass = (pool) => rec[pool].find((r) => r.caseId === c.id && goldOf(c, r).gold === "PASS");
    const a = firstPass("free");
    const b = firstPass("constrained");
    if (a)
      add(
        `bug:wrong_number_in_reply:real:free:${c.id}:${a.seed}`,
        c.id,
        `recorded run (free) + bug wrong_number_in_reply`,
        injectBug(c, a, "wrong_number_in_reply"),
      );
    if (b)
      add(
        `bug:right_words_wrong_card:real:constrained:${c.id}:${b.seed}`,
        c.id,
        `recorded run (constrained) + bug right_words_wrong_card`,
        injectBug(c, b, "right_words_wrong_card"),
      );
  }
  return items;
}

const loadItems = () => JSON.parse(readFileSync(ITEMS, "utf8")).items;
const byId = (items) => Object.fromEntries(items.map((i) => [i.id, i]));

// Items of a set. On DEV the worked examples, and every item that looks identical to one, are left out for ALL variants.
function itemsFor(set, items) {
  const mine = items.filter((i) => i.split === set);
  if (set !== "dev") return { scored: mine, leaked: [] };
  const sigs = new Set(EXAMPLE_POOL.map((id) => inputSignature(byId(items)[id])));
  const leaked = mine.filter((i) => sigs.has(inputSignature(i)));
  return { scored: mine.filter((i) => !leaked.includes(i)), leaked };
}

const ratio = (xs) => {
  const p = xs.filter((i) => i.gold === "PASS").length;
  return { n: xs.length, pass: p, fail: xs.length - p, majority: Math.max(p, xs.length - p) / (xs.length || 1) };
};

function checkAll() {
  const problems = [];
  const items = loadItems();
  const fresh = buildItems();
  if (JSON.stringify(fresh) !== JSON.stringify(items))
    problems.push("items file differs from a fresh build (run --build-items)");
  for (const i of items) {
    if (!i.split) problems.push(`${i.id}: no split`);
    const g = goldOf(caseOf(i.caseId), i.run).gold;
    if (g !== i.gold) problems.push(`${i.id}: stored gold ${i.gold} != recomputed ${g}`);
  }
  const ids = items.map((i) => i.id);
  if (new Set(ids).size !== ids.length) problems.push("duplicate item ids");
  for (const id of EXAMPLE_IDS) {
    const it = byId(items)[id];
    if (!it) problems.push(`example ${id} missing`);
    else if (it.split !== "dev") problems.push(`example ${id} is not a DEV item`);
  }
  const exGold = EXAMPLE_IDS.map((id) => byId(items)[id]?.gold);
  console.log("example gold order:", exGold.join(", "));
  const dev = itemsFor("dev", items);
  const test = itemsFor("test", items);
  console.log("all items:", JSON.stringify(ratio(items)));
  console.log(
    "dev items:",
    JSON.stringify(ratio(dev.scored)),
    `(left out as examples or look-alikes: ${dev.leaked.length})`,
  );
  console.log("test items:", JSON.stringify(ratio(test.scored)));
  const distinct = (xs) => new Set(xs.map(inputSignature)).size;
  console.log(`distinct judge inputs: dev ${distinct(dev.scored)}, test ${distinct(test.scored)}`);
  const real = items.filter((i) => i.id.startsWith("real:"));
  console.log(
    "real runs:",
    JSON.stringify(ratio(real)),
    "| injected:",
    JSON.stringify(ratio(items.filter((i) => !i.id.startsWith("real:")))),
  );
  console.log("pairs:", selectPairs(items).length);
  if (problems.length) {
    console.log("PROBLEMS:\n" + problems.join("\n"));
    process.exit(1);
  }
  console.log("check ok");
}

// ---------- browser (copy of the host of ask-help-guarded.mjs) ----------
const HOST_HTML = `<!doctype html><meta charset="utf-8"><title>judge calibration host</title><script type="module">
const WEBLLM_URL = ${JSON.stringify(WEBLLM_URL)};
const A = (window.__ask = { status: "starting", error: null });
let engine = null, worker = null;
try {
  const webllm = await import(WEBLLM_URL);
  const gpu = navigator.gpu ? await navigator.gpu.requestAdapter() : null;
  A.env = { userAgent: navigator.userAgent, webgpu: !!navigator.gpu, adapter: !!gpu, shaderF16: !!gpu?.features.has("shader-f16") };
  A.load = async (id) => {
    A.status = "loading";
    const code = 'import { WebWorkerMLCEngineHandler } from "' + WEBLLM_URL + '"; const h = new WebWorkerMLCEngineHandler(); self.onmessage = (m) => h.onmessage(m);';
    worker = new Worker(URL.createObjectURL(new Blob([code], { type: "text/javascript" })), { type: "module" });
    const t0 = performance.now();
    engine = await webllm.CreateWebWorkerMLCEngine(worker, id, {});
    A.status = "loaded";
    return Math.round(performance.now() - t0);
  };
  A.complete = async (req) => {
    const t0 = performance.now();
    const r = await engine.chat.completions.create(req);
    return { text: r.choices[0].message.content ?? "", finish: r.choices[0].finish_reason, tokens: r.usage?.completion_tokens ?? 0, ms: Math.round(performance.now() - t0) };
  };
  A.status = "idle";
} catch (e) { A.status = "error"; A.error = String(e?.message ?? e); }
</script>`;

async function openBrowser() {
  let puppeteer;
  try {
    puppeteer = createRequire((process.env.SPIKE_TOOLS ?? "/tmp/spike-tools") + "/")("puppeteer-core");
  } catch (e) {
    throw new Error(`cannot load puppeteer-core: ${e.message}. Run: npm i --prefix /tmp/spike-tools puppeteer-core`, {
      cause: e,
    });
  }
  const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (!existsSync(chrome)) throw new Error(`Chrome not found at ${chrome} (set CHROME=...)`);
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: !flag("headed"),
    userDataDir: opt("profile", "/tmp/evals-lab-profile"),
    protocolTimeout: 60 * 60 * 1000,
    args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan,UseSkiaRenderer"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const u = new URL(req.url());
    if (u.hostname !== "localhost") return req.continue();
    if (u.pathname === "/judge-host.html")
      return req.respond({ status: 200, contentType: "text/html", body: HOST_HTML });
    return req.respond({ status: 404, body: "not found" });
  });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto("http://localhost:8765/judge-host.html");
  const t0 = Date.now();
  for (;;) {
    const s = await page.evaluate(() => ({ status: __ask?.status, error: __ask?.error }));
    if (s.status === "idle") break;
    if (s.status === "error") throw new Error("host page: " + s.error);
    if (Date.now() - t0 > 180000) throw new Error("host page timeout");
    await new Promise((r) => setTimeout(r, 1000));
  }
  const env = await page.evaluate(() => __ask.env);
  if (!env.webgpu || !env.adapter) throw new Error("no WebGPU adapter: " + JSON.stringify(env));
  const loadMs = await page.evaluate((id) => __ask.load(id), MODEL);
  return { browser, page, env, loadMs, chrome: await browser.version() };
}

// Lazy browser; DEV may use a disk cache keyed by messages + temperature + seed + max_tokens (same input = same text at temperature 0).
function makeModel(useCache) {
  const cache = useCache && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  let session = null;
  let dirty = 0;
  const flush = () => {
    if (useCache && dirty) writeFileSync(CACHE, JSON.stringify(cache) + "\n");
    dirty = 0;
  };
  return {
    stats: { calls: 0, cached: 0 },
    async call(req) {
      const key = sha(JSON.stringify([MODEL, req.messages, req.temperature, req.seed, req.max_tokens]));
      if (useCache && cache[key]) {
        this.stats.cached++;
        return cache[key];
      }
      session ??= await openBrowser();
      const out = await session.page.evaluate((r) => __ask.complete(r), req);
      this.stats.calls++;
      const rec = { text: out.text, finish: out.finish, tokens: out.tokens, ms: out.ms };
      if (useCache) {
        cache[key] = rec;
        if (++dirty >= 10) flush();
      }
      return rec;
    },
    async close() {
      flush();
      if (session) await session.browser.close();
    },
    get session() {
      return session;
    },
  };
}

// ---------- results ----------
const readResults = () =>
  existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, "utf8")) : { meta: {}, prompts: {}, blocks: {} };
const saveResults = (res) => writeFileSync(RESULTS, JSON.stringify(res, null, 2) + "\n");

const sh = (c) => {
  try {
    return execSync(c, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
};

function recordMeta(res, model) {
  res.meta.machine = `${sh("sysctl -n machdep.cpu.brand_string")}, ${Math.round(Number(sh("sysctl -n hw.memsize")) / 2 ** 30)} GB, macOS ${sh("sw_vers -productVersion")}`;
  if (model.session)
    Object.assign(res.meta, { chrome: model.session.chrome, env: model.session.env, loadMs: model.session.loadMs });
  Object.assign(res.meta, { model: MODEL, webllm: WEBLLM_VERSION, seeds: `${SEED_BASE} + run index` });
}

async function runSet({ set, variantIds, round, temp, runs }) {
  const items = loadItems();
  const variants = makeVariants(byId(items));
  const { scored: pool, leaked } = itemsFor(set, items);
  const model = makeModel(set === "dev");
  const res = readResults();
  const h = hashes();
  try {
    for (const vid of variantIds) {
      const v = variants[vid];
      if (!v) throw new Error(`unknown variant ${vid}`);
      const key = `${set}:${round}:${vid}@t${temp}`;
      if (set === "test" && res.blocks[key] && !flag("again"))
        throw new Error(`TEST block ${key} already exists; one TEST run per block (--again to repeat on purpose)`);
      const scored = [];
      for (let r = 0; r < runs; r++)
        for (const it of pool) {
          const c = caseOf(it.caseId);
          const messages = v.build(c, it.run);
          const out = await model.call({ messages, temperature: temp, seed: SEED_BASE + r, max_tokens: v.maxTokens });
          const verdict = v.decide(out.text);
          scored.push({ id: it.id, run: r, gold: it.gold, text: out.text, verdict, ms: out.ms, finish: out.finish });
        }
      const sample = v.build(caseOf(pool[0].caseId), pool[0].run);
      res.prompts[vid] = {
        desc: v.desc,
        maxTokens: v.maxTokens,
        system: sample[0].content,
        userExample: sample[1].content,
      };
      res.blocks[key] = {
        set,
        round,
        variant: vid,
        temperature: temp,
        runs,
        nItems: pool.length,
        leakedItems: leaked.map((i) => i.id),
        hashes: h,
        date: new Date().toISOString(),
        scored,
      };
      recordMeta(res, model);
      saveResults(res);
      const s = summarizeBlockRun(scored.filter((x) => x.run === 0));
      console.log(
        `SAVED ${key}: n ${s.n}, agree ${fmt(s.agreement)}, kappa ${fmt(s.kappa, 2)}, false-pass ${fmt(s.falsePassRate)}, false-fail ${fmt(s.falseFailRate)}, unparsable ${fmt(s.unparsableRate)}`,
      );
    }
  } finally {
    await model.close();
  }
  console.log(`model calls: ${model.stats.calls} real, ${model.stats.cached} from cache`);
}

async function runPairs(vid) {
  const items = loadItems();
  const lookup = byId(items);
  const v = makeVariants(lookup)[vid];
  if (!v?.pair) throw new Error(`variant ${vid} has no pairwise form`);
  const pairs = selectPairs(items);
  const model = makeModel(false);
  const res = readResults();
  const key = `test:pairs:${vid}@t0`;
  if (res.blocks[key] && !flag("again")) throw new Error(`block ${key} already exists`);
  try {
    const scored = [];
    for (const p of pairs) {
      const c = caseOf(p.caseId);
      const good = lookup[p.goodId].run;
      const bad = lookup[p.badId].run;
      const ask = async (a, b) => {
        const out = await model.call({
          messages: v.pair.build(c, a, b),
          temperature: 0,
          seed: SEED_BASE,
          max_tokens: v.pair.maxTokens,
        });
        return { text: out.text, winner: v.pair.decide(out.text), ms: out.ms };
      };
      const ab = await ask(good, bad); // good run listed first
      const ba = await ask(bad, good); // good run listed second
      scored.push({ ...p, ab, ba });
    }
    const sample = v.pair.build(caseOf(pairs[0].caseId), lookup[pairs[0].goodId].run, lookup[pairs[0].badId].run);
    res.prompts[`${vid}:pair`] = {
      maxTokens: v.pair.maxTokens,
      system: sample[0].content,
      userExample: sample[1].content,
    };
    res.blocks[key] = {
      set: "test",
      round: "pairs",
      variant: vid,
      temperature: 0,
      nPairs: pairs.length,
      hashes: hashes(),
      date: new Date().toISOString(),
      scored,
    };
    recordMeta(res, model);
    saveResults(res);
    console.log(`SAVED ${key}`, JSON.stringify(orderBias(scored.map((s) => ({ ab: s.ab.winner, ba: s.ba.winner })))));
  } finally {
    await model.close();
  }
}

// ---------- summaries and report ----------
const fmt = (x, d = 3) => (x == null ? "n/a" : Number(x).toFixed(d));
const pct = (x) => (x == null ? "n/a" : `${(100 * x).toFixed(1)}%`);
const agreeCell = (s) => {
  const ci = wilson(s.matrix.gP_jP + s.matrix.gF_jF, s.n);
  return `${pct(s.agreement)} (${s.matrix.gP_jP + s.matrix.gF_jF}/${s.n}; 95% ${pct(ci?.[0])} to ${pct(ci?.[1])})`;
};

function summarizeBlockRun(scored) {
  const s = summarizeConfusion(
    confusion(
      scored.map((x) => x.gold),
      scored.map((x) => x.verdict),
    ),
  );
  s.medianSeconds = median(scored.map((x) => x.ms)) / 1000;
  return s;
}

// DEV blocks are scored on the items that are not examples (or look-alikes), whatever the block held when it was run.
let devAllowed = null;
const scoredOf = (b) => {
  if (b.set !== "dev") return b.scored;
  devAllowed ??= new Set(itemsFor("dev", loadItems()).scored.map((i) => i.id));
  return b.scored.filter((x) => devAllowed.has(x.id));
};

function tableRows(blocks) {
  const rows = [
    "| block | items | agreement | kappa | false-pass rate | false-fail rate | confusion (gold P judge P / P F / F P / F F) | unparsable | median s per judgment |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const [k, b] of blocks) {
    for (let r = 0; r < (b.runs ?? 1); r++) {
      const s = summarizeBlockRun(scoredOf(b).filter((x) => x.run === r));
      const m = s.matrix;
      rows.push(
        `| ${k}${b.runs > 1 ? ` run ${r + 1}` : ""} | ${s.n} | ${agreeCell(s)} | ${fmt(s.kappa, 2)} | ${pct(s.falsePassRate)} | ${pct(s.falseFailRate)} | ${m.gP_jP} / ${m.gP_jF} / ${m.gF_jP} / ${m.gF_jF} | ${pct(s.unparsableRate)} | ${fmt(s.medianSeconds, 2)} |`,
      );
    }
  }
  return rows.join("\n");
}

function report() {
  const res = readResults();
  const items = loadItems();
  const lookup = byId(items);
  const entries = Object.entries(res.blocks);
  const out = [
    "# Judge calibration: tables",
    "",
    "Generated by `node scripts/judge-calibration.mjs --report` from `benchmarks/judge-calibration-results.json`. Positive class = PASS. Unparsable judge replies count as FAIL.",
    "",
  ];
  const baseline = (set) => {
    const r = ratio(itemsFor(set, items).scored);
    return `${set.toUpperCase()}: ${r.n} items, gold PASS ${r.pass}, gold FAIL ${r.fail}, majority-class agreement ${pct(r.majority)}; always-PASS agreement ${pct(r.pass / r.n)}.`;
  };
  out.push("## Baselines", "", `- ${baseline("dev")}`, `- ${baseline("test")}`, "");
  out.push(
    "## DEV blocks (temperature 0 unless the block name says otherwise)",
    "",
    tableRows(entries.filter(([, b]) => b.set === "dev")),
    "",
  );
  out.push("## TEST blocks", "", tableRows(entries.filter(([, b]) => b.set === "test" && b.round !== "pairs")), "");

  // Right verdicts by kind of item, so the table shows WHICH failures a judge catches (all variants at temperature 0, final or r1/t3 rounds).
  const kindOf = (id) => {
    if (id.startsWith("real:"))
      return lookup[id].run.steps.some((s) => s.kind === "final")
        ? "recorded run with a reply"
        : "recorded run with no final answer";
    return /^bug:([a-z_]+):/.exec(id)?.[1] ?? "perfect run";
  };
  const kindRows = (key) => {
    const b = res.blocks[key];
    if (!b) return null;
    const g = {};
    for (const x of scoredOf(b).filter((y) => y.run === 0)) {
      const k = `${kindOf(x.id)} (gold ${x.gold})`;
      g[k] ??= { n: 0, ok: 0 };
      g[k].n += 1;
      if ((x.verdict ?? "FAIL") === x.gold) g[k].ok += 1;
    }
    return g;
  };
  const kindKeys = [
    ["DEV", "dev:r1:J0@t0"],
    ["DEV", "dev:r1:J3@t0"],
    ["DEV", "dev:t3:T3@t0"],
    ["TEST", "test:final:J0@t0"],
    ["TEST", "test:final:J3@t0"],
    ["TEST", "test:final:T3@t0"],
  ].filter(([, k]) => res.blocks[k]);
  if (kindKeys.length) {
    const kinds = [...new Set(kindKeys.flatMap(([, k]) => Object.keys(kindRows(k))))].sort();
    out.push(
      "## Right verdicts by kind of item (right / items)",
      "",
      `| kind of item | ${kindKeys.map(([s, k]) => `${s} ${k.split(":")[2].split("@")[0]}`).join(" | ")} |`,
      `|---|${kindKeys.map(() => "---").join("|")}|`,
    );
    for (const k of kinds)
      out.push(
        `| ${k} | ${kindKeys
          .map(([, key]) => {
            const c = kindRows(key)[k];
            return c ? `${c.ok}/${c.n}` : "-";
          })
          .join(" | ")} |`,
      );
    out.push("");
  }
  if (existsSync(FROZEN)) {
    const m = JSON.parse(readFileSync(FROZEN, "utf8"));
    const get = (v) => entries.find(([k]) => k === `test:final:${v}@t0`)?.[1];
    const stats = (v) => {
      const b = get(v);
      return b ? summarizeBlockRun(b.scored.filter((x) => x.run === 0)) : null;
    };
    const f = stats(m.variant);
    const j0 = stats("J0");
    if (f && j0) {
      const bar = checkBar(BAR, f, j0);
      out.push(
        `## Bar check (TEST, frozen variant ${m.variant} against J0)`,
        "",
        "| line | measured | needs | status |",
        "|---|---|---|---|",
      );
      out.push(
        `| Cohen's kappa vs gold | ${fmt(bar.lines.kappa.value, 2)} | ${bar.lines.kappa.need} | ${bar.lines.kappa.met ? "met" : "**MISSED**"} |`,
      );
      out.push(
        `| false-pass rate | ${pct(bar.lines.falsePass.value)} | ${bar.lines.falsePass.need} (${BAR.maxFalsePass * 100}%) | ${bar.lines.falsePass.met ? "met" : "**MISSED**"} |`,
      );
      out.push(
        `| agreement lift over J0 | ${fmt(100 * bar.lines.liftOverJ0.value, 1)} points | >= ${BAR.minLiftOverJ0 * 100} points | ${bar.lines.liftOverJ0.met ? "met" : "**MISSED**"} |`,
      );
      out.push("", `Overall: **${bar.allMet ? "BAR MET" : "BAR MISSED"}**.`, "");
      if (m.secondary) {
        const sc = stats(m.secondary);
        if (sc)
          out.push(
            `Secondary (not used for the verdict): ${m.secondary}: agreement ${pct(sc.agreement)}, kappa ${fmt(sc.kappa, 2)}, false-pass ${pct(sc.falsePassRate)}.`,
            "",
          );
      }
      // 5 verbatim examples from the frozen variant on TEST: right and wrong
      const b = get(m.variant);
      const rows = b.scored.filter((x) => x.run === 0);
      const wrong = (x) => (x.verdict ?? "FAIL") !== x.gold;
      const pick = [
        rows.find((x) => wrong(x) && x.gold === "FAIL"),
        rows.find((x) => wrong(x) && x.gold === "PASS"),
        rows.filter((x) => wrong(x))[2],
        rows.find((x) => !wrong(x) && x.gold === "FAIL"),
        rows.find((x) => !wrong(x) && x.gold === "PASS"),
      ].filter(Boolean);
      out.push(`## 5 verbatim judge outputs of ${m.variant} on TEST (right and wrong)`, "");
      for (const x of pick) {
        const it = lookup[x.id];
        const reply = it.run.steps.findLast((s) => s.kind === "final")?.reply ?? "(no reply)";
        out.push(
          `- ${x.id}: gold ${x.gold}, judge ${x.verdict ?? "unparsable"} (${wrong(x) ? "WRONG" : "right"}). Reply judged: ${JSON.stringify(reply)}`,
          `  > ${JSON.stringify(x.text)}`,
        );
      }
      out.push("");
    }
    const vb = entries.find(([k]) => k.startsWith(`test:variation:${m.variant}@`))?.[1];
    if (vb) {
      const per = {};
      for (const x of vb.scored) (per[x.id] ??= []).push(x.verdict ?? "FAIL");
      out.push(
        `## Variation of ${m.variant} on TEST at temperature ${vb.temperature}, ${vb.runs} runs`,
        "",
        `Items whose verdict is not the same in all ${vb.runs} runs: ${pct(changedShare(Object.values(per)))} of ${Object.keys(per).length}. Per-run rows are in the TEST table above.`,
        "",
      );
    }
  }
  for (const [k, b] of entries.filter(([, b]) => b.round === "pairs")) {
    const ob = orderBias(b.scored.map((s) => ({ ab: s.ab.winner, ba: s.ba.winner })));
    out.push(
      `## Order bias, ${k}`,
      "",
      `${ob.pairs} pairs (good run, bad run), each asked in both orders (${ob.pairs * 2} judgments).`,
      "",
      "| measure | value |",
      "|---|---|",
      `| pairs answered in both orders | ${ob.answeredBothOrders} |`,
      `| verdict flips with order (a different run wins) | ${pct(ob.flipRate)} |`,
      `| first-listed run picked, all judgments | ${pct(ob.firstListedRate)} |`,
      `| good run picked in both orders | ${pct(ob.goodPickedInBothOrders)} |`,
      `| unparsable judgments | ${ob.unparsableCalls} |`,
      "",
    );
  }
  writeFileSync(TABLES, out.join("\n"));
  console.log(out.join("\n"));
}

// ---------- main ----------
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (flag("build-items")) {
    const items = buildItems();
    writeFileSync(
      ITEMS,
      JSON.stringify(
        {
          note: "Built by scripts/judge-calibration.mjs --build-items. No model. gold = task_success AND grounded of engine.js.",
          items,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(`wrote ${items.length} items`);
  } else if (flag("check")) checkAll();
  else if (flag("report")) report();
  else if (flag("freeze")) {
    const variant = opt("freeze");
    const variants = makeVariants(byId(loadItems()));
    if (!variants[variant]) throw new Error(`--freeze needs a variant, have ${Object.keys(variants)}`);
    const secondary = opt("secondary", null);
    if (secondary && !variants[secondary]) throw new Error(`unknown secondary ${secondary}`);
    const m = { frozenAt: new Date().toISOString(), variant, secondary, bar: BAR, hashes: hashes() };
    writeFileSync(FROZEN, JSON.stringify(m, null, 2) + "\n");
    console.log(`FROZEN at ${m.frozenAt}\n${JSON.stringify(m, null, 2)}`);
  } else {
    const set = opt("set", "dev");
    const needFrozen = () => {
      if (!existsSync(FROZEN)) throw new Error("TEST refused: nothing is frozen (run --freeze first)");
      const m = JSON.parse(readFileSync(FROZEN, "utf8"));
      const now = hashes();
      for (const k of Object.keys(m.hashes))
        if (m.hashes[k] !== now[k]) throw new Error(`TEST refused: ${k} changed after the freeze`);
      return m;
    };
    if (flag("pairs")) {
      const m = needFrozen();
      const v = opt("pairs");
      if (v !== m.variant) throw new Error(`pairs refused: only the frozen variant ${m.variant} may run`);
      await runPairs(v);
      report();
    } else {
      const variantIds = opt("variants", "J0").split(",");
      const temp = args.includes("--temp") ? Number(opt("temp")) : 0;
      const runs = args.includes("--runs") ? Number(opt("runs")) : 1;
      if (set === "test") {
        const m = needFrozen();
        const allowed = new Set(["J0", "J0F", m.variant, ...(m.secondary ? [m.secondary] : [])]);
        for (const v of variantIds)
          if (!allowed.has(v)) throw new Error(`TEST refused: ${v} is not frozen (allowed: ${[...allowed]})`);
        if (
          temp !== 0 &&
          (variantIds.length !== 1 ||
            variantIds[0] !== m.variant ||
            temp !== VARIATION_TEMPERATURE ||
            runs !== VARIATION_RUNS)
        )
          throw new Error(
            `TEST refused: a temperature other than 0 is only for the frozen variant at ${VARIATION_TEMPERATURE} with ${VARIATION_RUNS} runs`,
          );
      }
      await runSet({ set, variantIds, round: opt("round", set === "test" ? "final" : "r?"), temp, runs });
      report();
    }
  }
}
