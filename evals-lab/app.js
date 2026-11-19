// Wires the pure pieces together: model (llm.js) -> agent loop (agent-step.js) -> scores (engine.js) -> screens (ui.js).
import { CASES, CARDS, CATEGORIES, CATEGORY_LABELS, perfectRun } from "./cases.js";
import { METRICS, BUGS, scoreRun, injectBug, summarizeGrid, perStepAccuracy, stepCorrectness, judgePrompt, parseJudge } from "./engine.js";
import { runCase, SYSTEM_PROMPT } from "./agent-step.js";
import { checkWebGpu, loadModel, MODEL_F16 } from "./llm.js";
import { stageStates, BUG_STAGE } from "./lessons.js";
import * as ui from "./ui.js";
import { cardsMatrixHtml } from "./cards-view.js";
import { chatHtml } from "./chat-ui.js";
import { runGuarded, makeReplayChat, verifyRun } from "./guarded-agent.js";
import { wiringHtml, wiringStates, bindWiring } from "./wiring-graph.js";
import { buildDetails } from "./wiring-details.js";
import { checkDetailHtml } from "./check-details.js";
import { judgeFlowHtml } from "./judge-flow.js";
import { makeCustomCase, CUSTOM_EXAMPLES } from "./custom-question.js";
import { checkInput } from "./guardrails.js";

const $ = (id) => document.getElementById(id);
const caseById = (id) => CASES.find((c) => c.id === id);
// A typed question wins over the list. Clearing the text box returns to the list.
const questionFor = (selectId, textId) => {
  const text = $(textId).value.trim();
  return text ? makeCustomCase(text) : caseById($(selectId).value);
};
const NEEDS_LIVE_NOTE = "Typed questions need the live model. Press Load model above, or pick a test question.";
const SIMPLE_NEEDS_LIVE_NOTE = "Typed questions need the live model for this agent. Load the model above.";
const NO_KEY_NOTE = "Your own question has no answer key, so nothing is marked right or wrong.";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const describeError = (err) => err?.message ?? (typeof err === "string" ? err : JSON.stringify(err));
const LOAD_NOTE = "Downloads about 880 MB once, then loads from your computer's saved copy. Needs a recent Chrome or Edge and about 1.6 GB of graphics memory.";
const CARD_NAMES = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, c.name]));
const DEFAULT_P = 0.9; // starting value for the compounding slider before any run exists

// mode: "none" until the visitor loads the model ("live") or picks the recorded runs ("replay").
// done: mission task ids the visitor has completed (see lessons.js MISSIONS).
const state = {
  mode: "none", llm: null, gpuCheck: null, gpu: null, recorded: null, last: null, bugId: null, judge: null, metricsCtx: null,
  gridRuns: [], cellRuns: {}, grid: null, cell: null, stop: false, whatIf: null,
  done: new Set(), bugsTried: new Set(),
  cmp: null, cmpLastCase: null, dspy: null, promptTab: "ours",
};

function mark(taskId) {
  if (state.done.has(taskId)) return;
  state.done.add(taskId);
  ui.renderMissions(state.done);
}

// ---------- model bar ----------
function setStatus(kind, label) {
  $("model-status").dataset.status = kind;
  document.querySelector("[data-hook=model-status-label]").textContent = label;
  syncCmpModelBar();
}
function setProgress(fraction) {
  const segs = [...$("model-progress").querySelectorAll(".seg")];
  const on = Math.floor(fraction * segs.length);
  segs.forEach((s, i) => s.classList.toggle("on", i < on));
  $("model-progress").setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
  syncCmpModelBar();
}
const setNote = (text) => { $("model-note").textContent = text; syncCmpModelBar(); };

// The Side by side screen has its own copy of the model bar. It only mirrors the Run-screen elements, so loading logic lives in one place.
function syncCmpModelBar() {
  const kind = $("model-status").dataset.status;
  const label = document.querySelector("[data-hook=model-status-label]").textContent;
  const pct = $("model-progress").getAttribute("aria-valuenow");
  const text = { ready: "Live model ready", replay: "Using recorded runs", loading: `Loading model ${pct}%` }[kind]
    ?? (label === "Load failed" ? `${label}. ${$("model-note").textContent}` : "No model loaded yet");
  $("cmp-model-status").dataset.status = kind;
  document.querySelector("[data-hook=cmp-model-label]").textContent = text;
  $("cmp-load-model").disabled = $("load-model").disabled;
  $("cmp-use-replay").disabled = $("use-replay").disabled;
  $("cmp-model-progress").hidden = kind !== "loading";
  [...$("cmp-model-progress").children].forEach((s, i) => s.classList.toggle("on", $("model-progress").children[i].classList.contains("on")));
}

function enterMode(mode) {
  state.mode = mode;
  setStatus(mode === "live" ? "ready" : "replay", mode === "live" ? "Ready (live model)" : "Replay (recorded runs)");
  setProgress(mode === "live" ? 1 : 0);
  $("temperature").disabled = mode === "replay";
  $("run-case").disabled = false;
  $("run-hint").textContent = "Runs the question from step 2.";
  $("run-set").disabled = false;
  $("cmp-ask").disabled = false;
  $("cmp-hint").textContent = mode === "replay"
    ? "Recorded runs, run number 42. Try C03 (the Flipkart phone): the simple agent gets it wrong and the careful agent gets it right. The other five questions come out right for both. For a retry, set the run number to 3 on the Run screen (Settings) and ask C01 (Amazon): the simple agent is wrong and the careful agent needs a second try."
    : "Pick a question and press Ask both. Live answers vary from run to run.";
  $("judge-run").disabled = mode !== "live";
  $("set-progress").textContent = `${CASES.length} cases. Press Run the set.`;
  if (mode === "replay") setNote("Replay: real runs of the real model, recorded earlier. Temperature is fixed; the seed picks which recorded run you see.");
  mark("engine");
}

async function onLoadModel() {
  $("load-model").disabled = true;
  setStatus("loading", "Loading");
  try {
    const gpu = await state.gpuCheck;
    state.llm = await loadModel(gpu.modelId, (fraction, text) => { setProgress(fraction); setNote(text); });
    setNote("Ready. The model runs in your browser, nothing is sent anywhere.");
    enterMode("live");
  } catch (err) {
    setStatus("not-loaded", "Load failed");
    setNote(`Could not load the model: ${describeError(err)}. You can still use the recorded runs.`);
    $("load-model").disabled = false;
    syncCmpModelBar();
  }
}

// ---------- running ----------
function pickRecorded(caseId, index) {
  const pool = state.recorded[$("constrain").checked ? "constrained" : "free"].filter((r) => r.caseId === caseId);
  return structuredClone(pool[Math.abs(index) % pool.length]);
}

// onStep(steps) is called as steps arrive. Replay fakes the pacing so the diagram visibly lights up box by box.
async function runOne(c, seed, replayIndex, { onStep } = {}) {
  if (state.mode === "replay") {
    const run = pickRecorded(c.id, replayIndex);
    if (!onStep) { await sleep(250); return run; }
    for (let i = 1; i <= run.steps.length; i++) { await sleep(700); onStep(run.steps.slice(0, i)); }
    return run;
  }
  return runCase(state.llm.chat, c, {
    model: state.llm.modelId, seed,
    temperature: Number($("temperature").value),
    constrain: $("constrain").checked,
    onStep,
  });
}

function showError(root, err) {
  const p = document.createElement("p");
  p.className = "err";
  p.textContent = `Something went wrong: ${describeError(err)}`;
  root.replaceChildren(p);
}

// accept lists every card tied for the top reward, so a tie counts as right whichever tied card the agent names.
const expectedOf = (c) => (c.expected ? { card: c.expected.card, accept: c.expected.accept, reward_inr: c.expected.reward_inr } : null);
const sumOf = (steps, key) => steps.reduce((total, s) => total + s[key], 0);

function drawRunFlow(c, run, opts = {}) {
  ui.renderFlow($("run-flow"), { states: run ? stageStates(c, run, opts) : null, metrics: METRICS, scores: opts.scores ?? null });
}

async function onRunCase() {
  const c = questionFor("case-select", "case-text");
  if (c.custom && state.mode !== "live") {
    // Recorded runs exist only for the six test questions.
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = NEEDS_LIVE_NOTE;
    $("run-view").replaceChildren(p);
    return;
  }
  const seed = Number($("seed").value);
  const info = { id: c.id, query: c.query, custom: !!c.custom };
  const model = state.mode === "live" ? state.llm.modelId : "recorded";
  const showPartial = (steps) => {
    const run = { caseId: c.id, model, steps: steps.slice(), totalMs: sumOf(steps, "ms"), totalTokens: sumOf(steps, "tokens") };
    ui.renderRun($("run-view"), { caseInfo: info, run, scores: null, expected: expectedOf(c), pending: true, cardNames: CARD_NAMES });
    drawRunFlow(c, run, { running: true });
  };
  $("run-case").disabled = true;
  showPartial([]);
  try {
    const run = await runOne(c, seed, seed, { onStep: showPartial });
    const scores = scoreRun(c, run);
    state.last = { c, run };
    state.judge = null;
    ui.renderRun($("run-view"), { caseInfo: info, run, scores, expected: expectedOf(c), cardNames: CARD_NAMES });
    drawRunFlow(c, run, { scores });
    drawMetrics();
    mark("ran");
    if ($("constrain").checked) mark("guard");
  } catch (err) {
    showError($("run-view"), err);
  } finally {
    $("run-case").disabled = false;
  }
}

// ---------- metrics ----------
function drawMetrics() {
  const useModel = $("metrics-base").value === "model" && state.last;
  // The scripted perfect run needs an answer key, so it always uses the list question, never typed text.
  const c = useModel ? state.last.c : caseById($("case-select").value);
  const base = useModel ? state.last.run : perfectRun(c);
  let run = base;
  let scores;
  let note = c.custom
    ? `Scoring your last run of your own question. ${NO_KEY_NOTE} The checks that need an answer key show NOT RUN.`
    : `Scoring ${useModel ? "your last run" : "a perfect scripted run"} of ${c.id}.`;
  try {
    if (state.bugId) run = injectBug(c, base, state.bugId);
    const judge = state.judge?.key === JSON.stringify(run.steps) ? state.judge : null;
    scores = scoreRun(c, run, judge ? { judge: { score: judge.median } } : {});
    if (judge) scores.rubric_judge.reason = `five grades: ${judge.all.join(", ")}`;
  } catch {
    // Some bugs need a final answer or a rank_cards step that a failed model run does not have.
    note = c.custom
      ? "Bugs need an answer key, so they cannot be added to your own question. Pick the perfect scripted run to use them."
      : "That bug cannot be applied to this run. Pick the perfect scripted run to use every bug.";
    run = base;
    scores = scoreRun(c, base);
    state.bugId = null;
  }
  state.metricsCtx = { c, run };
  $("metrics-note").textContent = note;
  ui.renderFlow($("metrics-flow"), {
    states: stageStates(c, run, { scores }), metrics: METRICS, scores, chips: true,
    bugStage: state.bugId ? BUG_STAGE[state.bugId] : null,
  });
  const picked = METRICS.find((m) => m.id === state.tileId);
  const judged = state.judge?.key === JSON.stringify(run.steps) ? state.judge : null;
  $("judge-flow-view").innerHTML = judgeFlowHtml({ prompt: judgePrompt(c, run), grades: judged?.all ?? null, median: judged?.median ?? null });
  const grader = picked?.id === "rubric_judge" ? { prompt: judgePrompt(c, run), grades: judged?.all ?? null, median: judged?.median ?? null } : null;
  ui.renderMetrics($("metrics-view"), {
    metrics: METRICS, bugs: BUGS, scores, activeBug: state.bugId,
    selected: picked?.id ?? null, detailHtml: checkDetailHtml(picked, scores[picked?.id], grader),
  });
}

function onBugSelected(bugId) {
  state.bugId = bugId;
  drawMetrics();
  if (!state.bugId) return;
  state.bugsTried.add(state.bugId);
  mark("bug");
  if (state.bugsTried.size >= 3) mark("bugs3");
}

async function onJudge() {
  const { c, run } = state.metricsCtx;
  const { system, user } = judgePrompt(c, run);
  $("judge-run").disabled = true;
  $("metrics-note").textContent = "Asking the AI to grade the answer five times…";
  try {
    const all = [];
    for (let i = 0; i < 5; i++) {
      const reply = await state.llm.chat({
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.7, seed: 200 + i, max_tokens: 8,
      });
      all.push(parseJudge(reply.text).score);
    }
    const valid = all.filter((s) => s !== null).sort((a, b) => a - b);
    state.judge = { key: JSON.stringify(run.steps), all: all.map((s) => s ?? "?"), median: valid.length ? valid[Math.floor((valid.length - 1) / 2)] : null };
    drawMetrics();
    mark("judge");
  } catch (err) {
    $("metrics-note").textContent = `The AI grader failed: ${describeError(err)}`;
  } finally {
    $("judge-run").disabled = state.mode !== "live";
  }
}

// ---------- golden set ----------
function drawGrid() {
  if (state.grid) ui.renderGrid($("grid-view"), { ...state.grid, selected: state.cell });
}

function drawCell() {
  const { caseId, index } = state.cell;
  const c = caseById(caseId);
  const { run, scores } = state.cellRuns[caseId][index];
  const failed = METRICS.filter((m) => scores[m.id].pass === false);
  ui.renderCellRun($("cell-view"), {
    label: `${caseId} · run ${index + 1}`,
    passed: scores.task_success.pass === true,
    why: failed.length ? failed.map((m) => `${m.label}: ${scores[m.id].reason}.`).join(" ") : "",
    caseInfo: { id: c.id, query: c.query }, run, scores, expected: expectedOf(c), cardNames: CARD_NAMES,
  });
}

async function onRunSet() {
  const runsPerCase = Math.min(10, Math.max(1, Number($("set-runs").value) || 5));
  const results = [];
  state.gridRuns = [];
  state.cellRuns = {};
  state.cell = null;
  $("cell-view").replaceChildren();
  state.stop = false;
  $("run-set").disabled = true;
  $("stop-set").hidden = false;
  try {
    // Rows are added only when complete, so every row has the same number of cells.
    for (const c of CASES) {
      const row = { caseId: c.id, runs: [] };
      const cells = [];
      for (let j = 0; j < runsPerCase && !state.stop; j++) {
        $("set-progress").textContent = `${c.id}, run ${j + 1} of ${runsPerCase} (case ${results.length + 1} of ${CASES.length})`;
        const run = await runOne(c, 1000 + j, j);
        const scores = scoreRun(c, run);
        state.gridRuns.push(run);
        cells.push({ run, scores });
        row.runs.push(scores.task_success.pass === true);
      }
      if (state.stop) break;
      results.push(row);
      state.cellRuns[c.id] = cells;
      state.grid = { cases: CASES, results, summary: summarizeGrid(results) };
      drawGrid();
      drawCurve();
    }
    $("set-progress").textContent = state.stop ? `Stopped after ${results.length} cases.` : `Done: ${results.length} cases, ${runsPerCase} runs each. Click any square to open that run.`;
    if (results.length) mark("set");
  } catch (err) {
    showError($("grid-view"), err);
  } finally {
    $("run-set").disabled = false;
    $("stop-set").hidden = true;
  }
}

function onCellSelected({ caseId, index }) {
  if (!state.cellRuns[caseId]?.[index]) return;
  state.cell = { caseId, index };
  drawGrid();
  drawCell();
  mark("cell");
  $("cell-view").scrollIntoView({ block: "start" });
}

// ---------- compounding ----------
function drawCurve() {
  const measured = state.gridRuns.length ? perStepAccuracy(state.gridRuns, CASES) : null;
  const source = state.whatIf != null ? "whatif" : measured != null ? "measured" : "default";
  const p = state.whatIf ?? measured ?? DEFAULT_P;
  $("what-if").value = String(Math.round(p * 100));
  $("what-if-out").textContent = `${Math.round(p * 100)}%`;
  $("what-if-reset").hidden = !(source === "whatif" && measured != null);
  // Observed point for n steps: share of runs whose first n steps were all right. Only shown next to the measured prediction.
  const points = source !== "measured" ? [] : [1, 2, 3].map((n) => ({
    n,
    value: state.gridRuns.filter((run) => {
      const ok = stepCorrectness(caseById(run.caseId), run);
      return ok.length >= n && ok.slice(0, n).every(Boolean);
    }).length / state.gridRuns.length,
  }));
  ui.renderCurve($("curve-view"), { p, n: 10, points, retryTries: Number($("retry-tries").value), source });
}

// ---------- side by side ----------
const PRACTICE_LABELS = ["Guardrails", "Safety net", "Low randomness", "Checker", "Retry", "Fallback"];
const SIMPLE_PRACTICES = PRACTICE_LABELS.map((label) => ({ label, on: false }));
const CAREFUL_PRACTICES = PRACTICE_LABELS.map((label) => ({ label, on: true }));
const OUTCOME_WORDS = {
  passed_first_try: "passed the checker on the first try",
  passed_after_retry: "passed the checker after retrying",
  fixed_by_fallback: "built its answer straight from the lookup result",
  refused: "refused to guess",
  blocked: "was stopped by a guardrail before the model ran",
};

function drawChats() {
  const q = state.cmp?.c ?? questionFor("cmp-case", "cmp-text");
  const side = state.cmp ?? {};
  const common = { systemPrompt: SYSTEM_PROMPT, question: q.query, cardNames: CARD_NAMES, categoryLabels: CATEGORY_LABELS, metrics: METRICS };
  $("chat-simple").innerHTML = chatHtml({
    ...common, kind: "simple", title: "Simple agent", subtitle: "The AI alone: one try, no checks",
    practices: SIMPLE_PRACTICES, attempts: [], shown: 0, events: [], ...side.simple,
  });
  $("chat-careful").innerHTML = chatHtml({
    ...common, kind: "careful", title: "Careful agent", subtitle: "The same AI with guardrails, a safety net, a checker, retries and a fallback",
    practices: CAREFUL_PRACTICES, attempts: [], shown: 0, events: [], ...side.careful,
  });
  // chat-ui draws no bubble for a note, so add it under the question.
  if (side.simple?.note) {
    const note = document.createElement("div");
    note.className = "msg msg-agent";
    note.innerHTML = `<div class="bubble"></div>`;
    note.firstChild.textContent = side.simple.note;
    $("chat-simple").querySelector(".chat-msgs")?.append(note);
  }
  drawWiring();
}

// ---------- the wiring graphs (one per agent, lit as the run goes) ----------
const KINDS = ["simple", "careful"];

function wiringShared(c) {
  return {
    c, cases: CASES, cardNames: CARD_NAMES, labels: CATEGORY_LABELS, metrics: METRICS, mode: state.mode,
    modelName: state.mode === "live" ? state.llm.modelId : state.recorded?.meta?.model,
    recordedTemp: state.recorded?.meta?.temperature, promptTab: state.promptTab, dspy: state.dspy,
  };
}

function drawWiring() {
  const on = $("show-wiring").checked;
  $("wire-hint").hidden = !on;
  for (const kind of KINDS) {
    $(`wire-${kind}`).hidden = !on;
    if (!on) continue;
    const root = $(`wiring-${kind}`);
    const s = state.cmp?.[kind] ?? {};
    const c = state.cmp?.c ?? questionFor("cmp-case", "cmp-text");
    const attempts = s.attempts ?? [];
    const last = attempts.at(-1) ?? { steps: [], verdict: null };
    // The checker reads a whole try, so while a try is still running it has no verdict yet.
    const states = wiringStates(kind, {
      steps: last.steps, verdict: last.verdict, attempts: Math.max(1, attempts.length, 1 + (s.events ?? []).filter((x) => x.t === "retry").length), outcome: s.outcome ?? null,
      pending: !!s.pending && !last.verdict, scores: kind === "careful" ? s.scores ?? null : null, events: s.events ?? [],
    });
    // A rejected try is not an answer to the user and is not saved as the final trace yet.
    if (kind === "careful" && s.pending) { states.answer = "idle"; states.trace = "idle"; }
    const side = { steps: last.steps, modelSteps: s.modelSteps, attempts: attempts.length ? attempts : [last], events: s.events ?? [], outcome: s.outcome ?? null, pending: !!s.pending, scores: s.scores ?? null };
    const focus = document.activeElement;
    const keep = root.contains(focus) ? (focus.dataset.node ? `[data-node="${focus.dataset.node}"]` : focus.dataset.ptab ? `[data-ptab="${focus.dataset.ptab}"]` : null) : null;
    root.innerHTML = wiringHtml({ kind, states, details: buildDetails(kind, side, wiringShared(c)), metrics: METRICS, scores: kind === "careful" ? s.scores ?? null : null, selected: root.dataset.sel ?? "" });
    if (keep) root.querySelector(keep)?.focus({ preventScroll: true });
  }
}

// DSPy's own prompt is a static file made with a fake model; fetch it only when someone opens the wiring.
async function loadDspy() {
  if (state.dspy) return;
  state.dspy = { status: "loading" };
  try {
    const res = await fetch("dspy-prompt.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.dspy = { status: "ok", data: await res.json() };
  } catch (err) {
    state.dspy = { status: "error", error: describeError(err) };
  }
  drawWiring();
}

function bindWiringRoots() {
  for (const kind of KINDS) {
    const root = $(`wiring-${kind}`);
    bindWiring(root);
    root.addEventListener("click", (ev) => {
      const tab = ev.target.closest?.("[data-ptab]");
      if (tab) { state.promptTab = tab.dataset.ptab; drawWiring(); return; }
      // The panel sits under the graph, so bring it into view after a node click.
      if (ev.target.closest?.("[data-node]")) requestAnimationFrame(() => root.querySelector(".wdetail:not([hidden])")?.scrollIntoView({ block: "nearest" }));
    });
  }
}

function recordedPool(kind, caseId, index) {
  const pool = state.recorded[kind].filter((r) => r.caseId === caseId);
  const at = Math.abs(index) % pool.length;
  return [...pool.slice(at), ...pool.slice(0, at)];
}

async function runSimple(c, seed, onStep) {
  if (state.mode === "replay") {
    const run = recordedPool("free", c.id, seed)[0];
    for (let i = 1; i <= run.steps.length; i++) { await sleep(700); onStep(run.steps.slice(0, i)); }
    return structuredClone(run);
  }
  return runCase(state.llm.chat, c, { model: state.llm.modelId, seed, temperature: 0.7, constrain: false, onStep });
}

function runCareful(c, seed, onEvent, onStep) {
  const live = state.mode === "live";
  let chat = state.llm?.chat;
  if (!live) {
    const replay = makeReplayChat(recordedPool("constrained", c.id, seed));
    chat = async (req) => { await sleep(700); return replay(req); };
  }
  return runGuarded(chat, c, { model: live ? state.llm.modelId : "recorded", seed, onEvent, onStep });
}

// The inputs stay locked while a run is going, so the question cannot change under it.
function setCmpBusy(busy) {
  $("cmp-ask").disabled = busy;
  $("cmp-case").disabled = busy;
  $("cmp-text").disabled = busy;
  $("cmp-examples").querySelectorAll("button").forEach((b) => { b.disabled = busy; });
}

const safeScore = (c, run) => { try { return scoreRun(c, run); } catch { return null; } };

async function onAskBoth() {
  const c = questionFor("cmp-case", "cmp-text");
  const seed = Number($("seed").value);
  const expected = expectedOf(c);
  const guard = c.custom ? checkInput(c.query) : { ok: true };
  const replay = state.mode === "replay";
  if (c.custom && replay && guard.ok) {
    // Recorded runs cover only the six test questions, so a typed question needs the live model.
    state.cmp = null;
    drawChats();
    $("cmp-summary").textContent = NEEDS_LIVE_NOTE;
    $("cmp-summary").hidden = false;
    return;
  }
  // A blocked question makes no model call, so the careful agent can still run in replay. The simple agent cannot.
  const simpleSkipped = c.custom && replay;
  const cmp = {
    caseId: c.id, c,
    simple: simpleSkipped ? { attempts: [], shown: 0, pending: false, note: SIMPLE_NEEDS_LIVE_NOTE } : { attempts: [{ steps: [], verdict: null }], shown: 0, pending: true },
    careful: { attempts: [{ steps: [], verdict: null }], shown: 0, events: [], pending: true },
  };
  state.cmp = cmp;
  setCmpBusy(true);
  $("cmp-summary").hidden = true;
  drawChats();
  const simpleTask = async () => {
    const run = await runSimple(c, seed, (steps) => { cmp.simple.attempts = [{ steps: steps.slice(), verdict: null }]; drawChats(); });
    Object.assign(cmp.simple, { attempts: [{ steps: run.steps, verdict: null }], pending: false, expected, scores: scoreRun(c, run), outcome: null });
    cmp.simple.run = run;
    drawChats();
  };
  const carefulTask = async () => {
    const result = await runCareful(c, seed,
      (ev) => {
        cmp.careful.events = [...cmp.careful.events, ev];
        const tried = cmp.careful.attempts[ev.attempt];
        // The checker has just read this try: attach its verdict, and open an empty next try so the graph resets at once.
        if (tried && (ev.t === "verify_ok" || ev.t === "verify_fail")) tried.verdict = verifyRun(c, { steps: tried.steps });
        // On retry the failed try stays on screen (graph shows the failed check) until the next try's first step arrives.
        drawChats();
      },
      (steps, k) => { cmp.careful.attempts[k] = { steps: steps.slice(), verdict: null }; cmp.careful.shown = k; drawChats(); });
    const attempts = (result.attempts ?? []).map((a) => ({ steps: a.run.steps, verdict: a.verdict }));
    // A blocked question has no tries at all: show one empty try.
    if (!attempts.length) attempts.push({ steps: result.run?.steps ?? [], verdict: null });
    const last = attempts.length - 1;
    attempts[last] = { ...attempts[last], steps: result.run?.steps ?? attempts[last].steps }; // fallback and refusal replace the final step
    const blocked = result.outcome === "blocked";
    Object.assign(cmp.careful, {
      attempts, shown: last, pending: false, expected, outcome: result.outcome,
      scores: blocked ? safeScore(c, result.run) : scoreRun(c, result.run), modelSteps: result.attempts?.[last]?.run.steps ?? [],
    });
    cmp.careful.run = result.run;
    drawChats();
  };
  try {
    if (simpleSkipped) await carefulTask();
    else if (replay) await Promise.all([simpleTask(), carefulTask()]);
    else { await simpleTask(); await carefulTask(); }
    const tries = cmp.careful.attempts.length;
    const retried = tries > 1 ? ` (${tries} tries)` : "";
    const outcome = OUTCOME_WORDS[cmp.careful.outcome] ?? "finished";
    if (c.custom) {
      const why = cmp.careful.outcome === "blocked" && !guard.ok ? ` ${guard.reason}` : "";
      $("cmp-summary").textContent = `${NO_KEY_NOTE} The careful agent ${outcome}${retried}.${why}${simpleSkipped ? ` ${SIMPLE_NEEDS_LIVE_NOTE}` : ""}`;
    } else {
      const word = (s) => (s.scores.task_success.pass ? "right" : "wrong");
      $("cmp-summary").textContent = `Simple agent: ${word(cmp.simple)}. Careful agent: ${word(cmp.careful)}${cmp.careful.outcome === "refused" ? " (no answer given)" : ""}; it ${outcome}${retried}.`;
    }
    $("cmp-summary").hidden = false;
    mark("both");
    if (c.custom) mark("typed");
    const askedKey = c.custom ? `custom:${c.query}` : c.id;
    if (state.cmpLastCase && state.cmpLastCase !== askedKey) mark("again");
    state.cmpLastCase = askedKey;
  } catch (err) {
    state.cmp = null;
    drawChats();
    showError($("cmp-summary"), err);
    $("cmp-summary").hidden = false;
  } finally {
    setCmpBusy(false);
  }
}

// ---------- start ----------
// Small buttons that put an example sentence in the text box (and tell the page the text changed).
function fillExamples(root, input) {
  root.replaceChildren(...CUSTOM_EXAMPLES.map((text) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sec ex";
    b.textContent = text;
    b.onclick = () => { input.value = text; input.dispatchEvent(new Event("input")); input.focus(); };
    return b;
  }));
}

async function init() {
  const showQuestion = () => {
    const c = questionFor("case-select", "case-text");
    $("case-question").textContent = c.query;
    if (c.custom) {
      $("case-cards").innerHTML = `<p class="muted nokey">${NO_KEY_NOTE} There is no answer table for it. The run still shows every step, and the checks that need a key show NOT RUN.</p>`;
      return;
    }
    $("case-cards").innerHTML = cardsMatrixHtml({
      cards: CARDS, categories: CATEGORIES, selectedCategory: c.expected.category, bestCard: c.expected.accept, labels: CATEGORY_LABELS,
      caption: `Answer key for ${c.id}: the agent must work out the category, then pick the best card${c.expected.accept.length > 1 ? " (two cards tie, either is right)" : ""}. Rates are percent back.`,
    });
  };
  $("case-select").replaceChildren(...CASES.map((c) => new Option(`${c.id}  ${c.query}`, c.id)));
  $("case-select").disabled = false;
  showQuestion();
  $("model-name").textContent = MODEL_F16.replace("-q4f16_1-MLC", "");

  $("load-model").onclick = onLoadModel;
  $("cmp-load-model").onclick = onLoadModel;
  $("cmp-use-replay").onclick = () => enterMode("replay");
  $("run-case").onclick = onRunCase;
  $("run-set").onclick = onRunSet;
  $("stop-set").onclick = () => { state.stop = true; };
  $("judge-run").onclick = onJudge;
  $("metrics-base").onchange = drawMetrics;
  $("case-select").onchange = () => { $("case-text").value = ""; showQuestion(); drawMetrics(); };
  $("case-text").oninput = showQuestion;
  fillExamples($("case-examples"), $("case-text"));
  fillExamples($("cmp-examples"), $("cmp-text"));
  $("retry-tries").onchange = () => { drawCurve(); mark("tries"); };
  $("what-if").oninput = () => { state.whatIf = Number($("what-if").value) / 100; drawCurve(); mark("whatif"); };
  $("what-if-reset").onclick = () => { state.whatIf = null; drawCurve(); };
  $("metrics-view").addEventListener("tile-selected", (ev) => { state.tileId = ev.detail.metricId; drawMetrics(); });
  $("metrics-view").addEventListener("bug-selected", (ev) => onBugSelected(ev.detail.bugId));
  $("grid-view").addEventListener("cell-selected", (ev) => onCellSelected(ev.detail));
  $("use-replay").onclick = () => enterMode("replay");
  $("cmp-case").replaceChildren(...CASES.map((c) => new Option(`${c.id}  ${c.query}`, c.id)));
  const cmpQuestionChanged = () => { state.cmp = null; $("cmp-summary").hidden = true; drawChats(); };
  $("cmp-case").onchange = () => { $("cmp-text").value = ""; cmpQuestionChanged(); };
  $("cmp-text").oninput = cmpQuestionChanged;
  $("cmp-ask").onclick = onAskBoth;
  $("show-wiring").onchange = () => {
    const on = $("show-wiring").checked;
    $("cmp-root").classList.toggle("show-wiring", on);
    if (on) { mark("wiring"); loadDspy(); }
    drawWiring();
  };
  bindWiringRoots();
  drawChats();

  ui.renderFlow($("run-flow"), { metrics: METRICS });
  drawMetrics(); // works with no model: it scores a perfect scripted run
  drawCurve(); // works with no runs: it draws the what-if value

  // WebGPU and crypto.randomUUID (used by WebLLM) exist only on secure pages: https or http://localhost.
  // Decide this before any await so a slow GPU check can never leave the button disabled.
  $("load-model").disabled = !window.isSecureContext;
  syncCmpModelBar();
  if (!window.isSecureContext) {
    const fixUrl = location.protocol === "file:" ? "http://localhost:8000/evals-lab/" : `http://localhost${location.port ? `:${location.port}` : ""}${location.pathname}`;
    ui.renderOriginWarning($("origin-warning"), { origin: location.origin, fixUrl });
  }
  state.gpuCheck = checkWebGpu();
  state.gpu = await state.gpuCheck;
  setNote(state.gpu.ok ? LOAD_NOTE : `Warning: ${state.gpu.reason}${window.isSecureContext ? " You can still try Load model." : ""}`);

  try {
    const res = await fetch("recorded-runs.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.recorded = await res.json();
    $("use-replay").disabled = false;
    syncCmpModelBar();
  } catch (err) {
    // Opening index.html as a file:// URL lands here: browsers block module and fetch requests there.
    if (!state.gpu.ok) setNote(`Warning: ${state.gpu.reason} Recorded runs could not load (${describeError(err)}). Serve this folder over http.`);
  }
}

init();
