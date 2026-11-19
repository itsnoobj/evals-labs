// The Side by side screen: Ask both, the two chats, and the simple and careful agent runs.
// Exports: drawChats, onAskBoth.
import { CATEGORY_LABELS } from "../task/cases.js";
import { METRICS, scoreRun } from "../evals/engine.js";
import { runCase, SYSTEM_PROMPT } from "../agent/agent-step.js";
import { chatHtml } from "../ui/chat-ui.js";
import { runGuarded, makeReplayChat, verifyRun } from "../agent/guarded-agent.js";
import { checkInput } from "../agent/guardrails.js";
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
    title: "Simple agent",
    subtitle: "The AI alone: one try, no checks",
    practices: SIMPLE_PRACTICES,
    attempts: [],
    shown: 0,
    events: [],
    ...side.simple,
  });
  $("chat-careful").innerHTML = chatHtml({
    ...common,
    kind: "careful",
    title: "Careful agent",
    subtitle: "The same AI with guardrails, a safety net, a checker, retries and a fallback",
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
  return runCase(state.llm.chat, c, { model: state.llm.modelId, seed, temperature: 0.7, constrain: false, onStep });
}

function runCareful(c, seed, onEvent, onStep) {
  const live = state.mode === "live";
  let chat = state.llm?.chat;
  if (!live) {
    const replay = makeReplayChat(recordedPool("constrained", c.id, seed));
    chat = async (req) => {
      await sleep(700);
      return replay(req);
    };
  }
  return runGuarded(chat, c, { model: live ? state.llm.modelId : "recorded", seed, onEvent, onStep });
}

// The inputs stay locked while a run is going, so the question cannot change under it.
function setCmpBusy(busy) {
  $("cmp-ask").disabled = busy;
  $("cmp-case").disabled = busy;
  $("cmp-text").disabled = busy;
  $("cmp-examples")
    .querySelectorAll("button")
    .forEach((b) => {
      b.disabled = busy;
    });
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
  // A blocked question makes no model call, so the careful agent can still run in replay. The simple agent cannot.
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
  try {
    if (simpleSkipped) await carefulTask();
    else if (replay) await Promise.all([simpleTask(), carefulTask()]);
    else {
      await simpleTask();
      await carefulTask();
    }
    const tries = cmp.careful.attempts.length;
    const retried = tries > 1 ? ` (${tries} tries)` : "";
    const outcome = OUTCOME_WORDS[cmp.careful.outcome] ?? "finished";
    if (c.custom) {
      const why = cmp.careful.outcome === "blocked" && !guard.ok ? ` ${guard.reason}` : "";
      $("cmp-summary").textContent =
        `${NO_KEY_NOTE} The careful agent ${outcome}${retried}.${why}${simpleSkipped ? ` ${SIMPLE_NEEDS_LIVE_NOTE}` : ""}`;
    } else {
      const word = (s) => (s.scores.task_success.pass ? "right" : "wrong");
      $("cmp-summary").textContent =
        `Simple agent: ${word(cmp.simple)}. Careful agent: ${word(cmp.careful)}${cmp.careful.outcome === "refused" ? " (no answer given)" : ""}; it ${outcome}${retried}.`;
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
