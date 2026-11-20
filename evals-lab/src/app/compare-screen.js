// The Side by side screen: Ask both, the two chats, and the two agent runs.
// Exports: drawChats, onAskBoth, onTryThis, onScoreBoth, onStopScore, drawScore.
import { CASES, CATEGORY_LABELS } from "../task/cases.js";
import { METRICS, scoreRun } from "../evals/engine.js";
import { runCase, SYSTEM_PROMPT } from "../agent/agent-step.js";
import { chatHtml } from "../ui/chat-ui.js";
import { gradeFiveTimes } from "../agent/ai-grader.js";
import { runGuarded, makeReplayChat, verifyRun } from "../agent/guarded-agent.js";
import { checkInput } from "../agent/guardrails.js";
import { scoreBoth, replayRunAgent } from "../agent/score-both.js";
import { scoreResultHtml } from "../ui/score-result.js";
import { TRY_THESE } from "../ui/try-these.js";
import { syncCmpModelBar, enterMode, setNote } from "./model-bar.js";
import {
  $,
  state,
  questionFor,
  CARD_NAMES,
  sleep,
  expectedOf,
  NEEDS_LIVE_NOTE,
  SIMPLE_NEEDS_LIVE_NOTE,
  NO_KEY_NOTE,
  showError,
  describeError,
  mark,
} from "./state.js";
import { drawWiring } from "./wiring-panel.js";

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

export function drawChats() {
  const q = state.cmp?.c ?? questionFor("cmp-case", "cmp-text");
  const side = state.cmp ?? {};
  const common = {
    systemPrompt: SYSTEM_PROMPT,
    question: q.query,
    cardNames: CARD_NAMES,
    categoryLabels: CATEGORY_LABELS,
    metrics: METRICS,
  };
  $("chat-simple").innerHTML = chatHtml({
    ...common,
    kind: "simple",
    title: "Agent without evals",
    subtitle: "The AI alone, one try",
    practices: SIMPLE_PRACTICES,
    attempts: [],
    shown: 0,
    events: [],
    ...side.simple,
  });
  $("chat-careful").innerHTML = chatHtml({
    ...common,
    kind: "careful",
    title: "Agent with evals",
    subtitle: "The same AI, with evals around it",
    practices: CAREFUL_PRACTICES,
    attempts: [],
    shown: 0,
    events: [],
    ...side.careful,
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
  drawScore();
}

function recordedPool(kind, caseId, index) {
  const pool = state.recorded[kind].filter((r) => r.caseId === caseId);
  const at = Math.abs(index) % pool.length;
  return [...pool.slice(at), ...pool.slice(0, at)];
}

async function runSimple(c, seed, onStep) {
  if (state.mode === "replay") {
    const run = recordedPool("free", c.id, seed)[0];
    for (let i = 1; i <= run.steps.length; i++) {
      await sleep(700);
      onStep(run.steps.slice(0, i));
    }
    return structuredClone(run);
  }
  return liveSimple(state.llm, c, seed, onStep);
}

// The two live single runs, shared by Ask both and by Score both (which passes no callbacks).
const liveSimple = (llm, c, seed, onStep) =>
  runCase(llm.chat, c, { model: llm.modelId, seed, temperature: 0.7, constrain: false, onStep });
const liveCareful = (llm, c, seed, hooks) => runGuarded(llm.chat, c, { model: llm.modelId, seed, ...hooks });

function runCareful(c, seed, onEvent, onStep) {
  if (state.mode === "live") return liveCareful(state.llm, c, seed, { onEvent, onStep });
  const replay = makeReplayChat(recordedPool("constrained", c.id, seed));
  const chat = async (req) => {
    await sleep(700);
    return replay(req);
  };
  return runGuarded(chat, c, { model: "recorded", seed, onEvent, onStep });
}

// The inputs stay locked while a run is going, so the question cannot change under it.
let cmpBusy = false;
function setCmpBusy(busy) {
  cmpBusy = busy;
  $("cmp-ask").disabled = busy;
  $("cmp-score-start").disabled = busy;
  $("cmp-case").disabled = busy;
  $("cmp-text").disabled = busy;
  // Try these is redrawn by the model bar sync, which also decides whether recorded runs are available.
  if (busy)
    $("cmp-try")
      .querySelectorAll("button")
      .forEach((b) => {
        b.disabled = true;
      });
  else syncCmpModelBar();
  $("cmp-examples")
    .querySelectorAll("button")
    .forEach((b) => {
      b.disabled = busy;
    });
}

// Score both agents over the whole test set. Result is kept in state.score and redrawn by drawScore().
const RUNS_PER_CASE = 5;
const REPLAY_PAUSE_MS = 25; // lets the progress text paint and the Stop button work; real replays are instant

export function drawScore() {
  const s = state.score;
  $("cmp-score").innerHTML = s ? scoreResultHtml(s.result, s.mode) : "";
}

function scoreRunAgent(mode) {
  if (mode === "replay") {
    const inner = replayRunAgent(state.recorded, { seedBase: 0 });
    return async (kind, c, runIndex) => {
      await sleep(REPLAY_PAUSE_MS);
      return inner(kind, c, runIndex);
    };
  }
  const llm = state.llm; // captured: the run keeps this model even if the bar changes
  return async (kind, c, runIndex) =>
    kind === "simple" ? liveSimple(llm, c, runIndex) : (await liveCareful(llm, c, runIndex)).run;
}

let scoreAbort = null;

export function onStopScore() {
  scoreAbort?.abort();
  $("cmp-score-progress").textContent = "Stopping after this run…";
}

export async function onScoreBoth() {
  if (scoreAbort) return;
  const mode = state.mode;
  if (mode !== "live" && mode !== "replay") {
    $("cmp-score-progress").textContent = "Choose how to run first.";
    return;
  }
  const ctl = new AbortController();
  scoreAbort = ctl;
  const planned = CASES.length * RUNS_PER_CASE * 2;
  setCmpBusy(true);
  $("cmp-load-model").disabled = true;
  $("cmp-use-replay").disabled = true;
  state.score = null;
  drawScore();
  $("cmp-summary").hidden = true;
  $("cmp-score-start").hidden = true;
  $("cmp-score-stop").hidden = false;
  $("cmp-score-progress").textContent = `0 of ${planned} runs`;
  const t0 = Date.now();
  try {
    const result = await scoreBoth({
      cases: CASES,
      runsPerCase: RUNS_PER_CASE,
      runAgent: scoreRunAgent(mode),
      signal: ctl.signal,
      onProgress: ({ done, total }) => {
        // The estimate is shown only for the live model, and only from the time the runs so far really took.
        const left =
          mode === "live" && done >= 2 ? Math.ceil((((Date.now() - t0) / done) * (total - done)) / 60000) : 0;
        $("cmp-score-progress").textContent =
          `${done} of ${total} runs${left > 0 ? `, about ${left} min left` : ""}${ctl.signal.aborted ? ". Stopping…" : ""}`;
      },
    });
    state.score = { result: { ...result, planned }, mode };
    drawScore();
    $("cmp-score-progress").textContent = "";
  } catch (err) {
    $("cmp-score-progress").textContent = "";
    showError($("cmp-summary"), err);
    $("cmp-summary").hidden = false;
  } finally {
    scoreAbort = null;
    $("cmp-score-start").hidden = false;
    $("cmp-score-stop").hidden = true;
    setCmpBusy(false);
    syncCmpModelBar();
  }
}

// A Try these button: pick the question and run number whose recorded runs show the result named on the button, then Ask both.
// It needs recorded runs, so it switches to them when no mode is chosen and does nothing in live mode.
export async function onTryThis(id) {
  const item = TRY_THESE.find((t) => t.id === id);
  if (!item || cmpBusy || state.mode === "live" || !state.recorded) return;
  if (state.mode !== "replay") {
    enterMode("replay");
    setNote("");
  }
  $("cmp-text").value = "";
  $("cmp-case").value = item.caseId;
  $("seed").value = String(item.seed);
  $("cmp-hint").textContent = "Pick a question and press Ask both.";
  state.cmp = null;
  $("cmp-summary").hidden = true;
  drawChats();
  await onAskBoth();
}

const safeScore = (c, run) => {
  try {
    return scoreRun(c, run);
  } catch {
    return null;
  }
};

export async function onAskBoth() {
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
  // A blocked question makes no model call, so the agent with evals can still run in replay. The agent without evals cannot.
  const simpleSkipped = c.custom && replay;
  const cmp = {
    caseId: c.id,
    c,
    simple: simpleSkipped
      ? { attempts: [], shown: 0, pending: false, note: SIMPLE_NEEDS_LIVE_NOTE }
      : { attempts: [{ steps: [], verdict: null }], shown: 0, pending: true },
    careful: { attempts: [{ steps: [], verdict: null }], shown: 0, events: [], pending: true },
  };
  state.cmp = cmp;
  setCmpBusy(true);
  $("cmp-summary").hidden = true;
  drawChats();
  const simpleTask = async () => {
    const run = await runSimple(c, seed, (steps) => {
      cmp.simple.attempts = [{ steps: steps.slice(), verdict: null }];
      drawChats();
    });
    Object.assign(cmp.simple, {
      attempts: [{ steps: run.steps, verdict: null }],
      pending: false,
      expected,
      scores: scoreRun(c, run),
      outcome: null,
    });
    cmp.simple.run = run;
    drawChats();
  };
  const carefulTask = async () => {
    const result = await runCareful(
      c,
      seed,
      (ev) => {
        cmp.careful.events = [...cmp.careful.events, ev];
        const tried = cmp.careful.attempts[ev.attempt];
        // The checker has just read this try: attach its verdict, and open an empty next try so the graph resets at once.
        if (tried && (ev.t === "verify_ok" || ev.t === "verify_fail"))
          tried.verdict = verifyRun(c, { steps: tried.steps });
        // On retry the failed try stays on screen (graph shows the failed check) until the next try's first step arrives.
        drawChats();
      },
      (steps, k) => {
        cmp.careful.attempts[k] = { steps: steps.slice(), verdict: null };
        cmp.careful.shown = k;
        drawChats();
      },
    );
    const attempts = (result.attempts ?? []).map((a) => ({ steps: a.run.steps, verdict: a.verdict }));
    // A blocked question has no tries at all: show one empty try.
    if (!attempts.length) attempts.push({ steps: result.run?.steps ?? [], verdict: null });
    const last = attempts.length - 1;
    attempts[last] = { ...attempts[last], steps: result.run?.steps ?? attempts[last].steps }; // fallback and refusal replace the final step
    const blocked = result.outcome === "blocked";
    Object.assign(cmp.careful, {
      attempts,
      shown: last,
      pending: false,
      expected,
      outcome: result.outcome,
      scores: blocked ? safeScore(c, result.run) : scoreRun(c, result.run),
      modelSteps: result.attempts?.[last]?.run.steps ?? [],
    });
    cmp.careful.run = result.run;
    drawChats();
  };
  // The LLM judge is a second opinion on the final answer of the agent with evals. It needs a model, so only live runs ask it.
  // It never changes right or wrong, and the ship gate ignores it.
  const graderTask = async () => {
    const run = cmp.careful.run;
    if (state.mode !== "live" || !run?.steps.some((s) => s.kind === "final") || cmp.careful.outcome === "blocked")
      return;
    cmp.careful.judging = true;
    $("cmp-summary").textContent = "Asking the LLM judge 5 times…";
    $("cmp-summary").hidden = false;
    drawChats();
    try {
      const judge = await gradeFiveTimes(state.llm.chat, c, run);
      cmp.careful.judge = judge;
      cmp.careful.scores = scoreRun(c, run, { judge: { score: judge.median } });
      cmp.careful.scores.rubric_judge.reason = `five grades: ${judge.all.join(", ")}`;
      return null;
    } catch (err) {
      return err;
    } finally {
      cmp.careful.judging = false;
      drawChats();
    }
  };
  try {
    if (simpleSkipped) await carefulTask();
    else if (replay) await Promise.all([simpleTask(), carefulTask()]);
    else {
      await simpleTask();
      await carefulTask();
    }
    const graderError = await graderTask();
    const tries = cmp.careful.attempts.length;
    const retried = tries > 1 ? ` (${tries} tries)` : "";
    const outcome = OUTCOME_WORDS[cmp.careful.outcome] ?? "finished";
    if (c.custom) {
      const why = cmp.careful.outcome === "blocked" && !guard.ok ? ` ${guard.reason}` : "";
      $("cmp-summary").textContent =
        `${NO_KEY_NOTE} The agent with evals ${outcome}${retried}.${why}${simpleSkipped ? ` ${SIMPLE_NEEDS_LIVE_NOTE}` : ""}`;
    } else {
      const word = (s) => (s.scores.task_success.pass ? "right" : "wrong");
      $("cmp-summary").textContent =
        `Without evals: ${word(cmp.simple)}. With evals: ${word(cmp.careful)}${cmp.careful.outcome === "refused" ? " (no answer given)" : ""}; it ${outcome}${retried}.`;
    }
    $("cmp-summary").hidden = false;
    if (graderError) {
      const p = document.createElement("p");
      p.className = "err";
      p.textContent = `The LLM judge failed and stays NOT RUN: ${describeError(graderError)}`;
      $("cmp-summary").append(p);
    }
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
