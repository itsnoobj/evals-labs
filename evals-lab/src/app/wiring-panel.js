// The wiring graphs under each chat on the Side by side screen (one per agent, lit as the run goes).
// Clicking a node opens the explain dialog (ui/explain-dialog.js). The dialog shows the data of the last redraw
// before it was opened; it does not follow a run live (only the DSPy prompt, once it has loaded).
// Exports: drawWiring, loadDspy, bindWiringRoots.
import { CASES, CATEGORY_LABELS } from "../task/cases.js";
import { METRICS } from "../evals/engine.js";
import { wiringHtml, wiringStates, bindWiring, setWiringSelected } from "../ui/wiring-graph.js";
import { buildExplain } from "../ui/wiring-details.js";
import { openExplain, explainIsOpen } from "../ui/explain-dialog.js";
import { $, state, questionFor, CARD_NAMES, describeError } from "./state.js";

const KINDS = ["simple", "careful"];
// What each graph showed at the last redraw: { states, side, shared }. The dialog is built from this.
const latest = {};
let openNode = null; // { kind, id } while the dialog shows a wiring node

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
      judging: kind === "careful" && !!s.judging,
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
      judge: s.judge ?? null,
      judging: !!s.judging,
    };
    const focus = document.activeElement;
    const keep = root.contains(focus) && focus.dataset.node ? `[data-node="${focus.dataset.node}"]` : null;
    latest[kind] = { states, side, shared: wiringShared(c) };
    root.innerHTML = wiringHtml({
      kind,
      states,
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
  if (openNode?.id === "prompt" && explainIsOpen()) showNode(openNode.kind, "prompt");
}

function showNode(kind, id) {
  const l = latest[kind];
  if (!l) return;
  openNode = { kind, id };
  const root = $(`wiring-${kind}`);
  openExplain(buildExplain(kind, id, l.side, l.shared, l.states[id]), {
    returnFocus: () => root.querySelector(`[data-node="${id}"]`),
    onClose: () => {
      openNode = null;
      setWiringSelected(root, "");
    },
    // The tabs "Our prompt" / "DSPy prompt" sit inside the Prompt section.
    onAction: (ev) => {
      const tab = ev.target.closest?.("[data-ptab]");
      if (!tab) return;
      state.promptTab = tab.dataset.ptab;
      drawWiring();
      showNode(kind, id);
    },
  });
}

export function bindWiringRoots() {
  for (const kind of KINDS) bindWiring($(`wiring-${kind}`), (id) => showNode(kind, id));
}
