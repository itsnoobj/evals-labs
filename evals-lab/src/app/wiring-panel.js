// The wiring graphs under each chat on the Side by side screen (one per agent, lit as the run goes).
// Exports: drawWiring, loadDspy, bindWiringRoots.
import { CASES, CATEGORY_LABELS } from "../task/cases.js";
import { METRICS } from "../evals/engine.js";
import { wiringHtml, wiringStates, bindWiring } from "../ui/wiring-graph.js";
import { buildDetails } from "../ui/wiring-details.js";
import { $, state, questionFor, CARD_NAMES, describeError } from "./state.js";

const KINDS = ["simple", "careful"];

function wiringShared(c) {
  return {
    c,
    cases: CASES,
    cardNames: CARD_NAMES,
    labels: CATEGORY_LABELS,
    metrics: METRICS,
    mode: state.mode,
    modelName: state.mode === "live" ? state.llm.modelId : state.recorded?.meta?.model,
    recordedTemp: state.recorded?.meta?.temperature,
    promptTab: state.promptTab,
    dspy: state.dspy,
  };
}

export function drawWiring() {
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
      steps: last.steps,
      verdict: last.verdict,
      attempts: Math.max(1, attempts.length, 1 + (s.events ?? []).filter((x) => x.t === "retry").length),
      outcome: s.outcome ?? null,
      pending: !!s.pending && !last.verdict,
      scores: kind === "careful" ? (s.scores ?? null) : null,
      events: s.events ?? [],
    });
    // A rejected try is not an answer to the user and is not saved as the final trace yet.
    if (kind === "careful" && s.pending) {
      states.answer = "idle";
      states.trace = "idle";
    }
    const side = {
      steps: last.steps,
      modelSteps: s.modelSteps,
      attempts: attempts.length ? attempts : [last],
      events: s.events ?? [],
      outcome: s.outcome ?? null,
      pending: !!s.pending,
      scores: s.scores ?? null,
    };
    const focus = document.activeElement;
    const keep = root.contains(focus)
      ? focus.dataset.node
        ? `[data-node="${focus.dataset.node}"]`
        : focus.dataset.ptab
          ? `[data-ptab="${focus.dataset.ptab}"]`
          : null
      : null;
    root.innerHTML = wiringHtml({
      kind,
      states,
      details: buildDetails(kind, side, wiringShared(c)),
      metrics: METRICS,
      scores: kind === "careful" ? (s.scores ?? null) : null,
      selected: root.dataset.sel ?? "",
    });
    if (keep) root.querySelector(keep)?.focus({ preventScroll: true });
  }
}

// DSPy's own prompt is a static file made with a fake model; fetch it only when someone opens the wiring.
export async function loadDspy() {
  if (state.dspy) return;
  state.dspy = { status: "loading" };
  try {
    const res = await fetch("data/dspy-prompt.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.dspy = { status: "ok", data: await res.json() };
  } catch (err) {
    state.dspy = { status: "error", error: describeError(err) };
  }
  drawWiring();
}

export function bindWiringRoots() {
  for (const kind of KINDS) {
    const root = $(`wiring-${kind}`);
    bindWiring(root);
    root.addEventListener("click", (ev) => {
      const tab = ev.target.closest?.("[data-ptab]");
      if (tab) {
        state.promptTab = tab.dataset.ptab;
        drawWiring();
        return;
      }
      // The panel sits under the graph, so bring it into view after a node click.
      if (ev.target.closest?.("[data-node]"))
        requestAnimationFrame(() => root.querySelector(".wdetail:not([hidden])")?.scrollIntoView({ block: "nearest" }));
    });
  }
}
