// The "wiring" flow graph: everything around the agent, end to end, lit up as a run passes through it.
// Pure strings in, strings out (plus bindWiring for clicks). Style rules: docs/specs/ui-style.md. Spec: docs/specs/compare-agents.md
// Clicking a node opens the explain dialog (explain-dialog.js); the caller wires that with bindWiring(root, onNode).
import { disclose } from "./disclose.js";
import { QMARK } from "./explain-dialog.js";

const e = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const BUILD = [
  ["dataset", "Collect real questions"],
  ["key", "Write the answer key (golden set)"],
  ["prompt", "Write the prompt (DSPy)"],
  ["checks", "Choose the checks"],
  ["bar", "Set the pass bar"],
];
// third item: true = only the agent with evals has this node
const LIVE = [
  ["ask", "Question"],
  ["guard", "Input guardrail"],
  ["model", "Model"],
  ["t1", "Tool: classify_merchant"],
  ["c1", "Check the tool input", true],
  ["t2", "Tool: rank_cards"],
  ["c2", "Check the tool input", true],
  ["draft", "Draft answer"],
  ["c3", "Check the answer", true],
  ["answer", "Answer to the user"],
];
const BRANCH = [
  ["retry", "Retry"],
  ["fallback", "Fallback"],
  ["refuse", "Refuse"],
];
const AFTER = [
  ["trace", "Save the trace"],
  ["eval", "8 checks"],
  ["judge", "LLM judge (second opinion)"],
  ["card", "Scorecard"],
  ["gate", "Ship or block"],
];

const ids = (list) => list.map(([id]) => id);
export const NODE_IDS = {
  careful: [...ids(BUILD), ...ids(LIVE), ...ids(BRANCH), ...ids(AFTER)],
  simple: [...ids(BUILD), ...ids(LIVE.filter((n) => !n[2])), ...ids(AFTER)],
};

// One plain sentence per node. The caller merges these into `details` (and may add run data after them).
export const NODE_HELP = {
  dataset: "Gather real questions that people ask, so the tests look like real life and not like made-up examples.",
  key: "For each question, write down the right answer ahead of time. This is the answer key every run is marked against.",
  prompt: "Write the instructions the model reads. A tool can try many versions and keep the one that scores best.",
  checks: "Pick what to measure: right tools, right answer, no made-up numbers, speed, and so on.",
  bar: "Decide how good is good enough before you ship. Writing the bar first stops you moving it later.",
  ask: "The question the user types.",
  guard:
    "Plain rules read the question before the model does: not empty or too long, no card number or password, no attempt to override the instructions, and about a card purchase. A blocked question never reaches the model.",
  model:
    "The AI model. It decides what to do next: call a tool or give the answer. The safety net forces its reply into a fixed format.",
  t1: "Our code looks up which spending category the shop belongs to.",
  c1: "A checker reads what the model sent to the tool before the result is trusted: is it the right shop from the question?",
  t2: "Our code ranks the cards for that amount and category.",
  c2: "A checker confirms the ranking used the amount from the question and the category from the first tool.",
  draft: "The model writes the answer from the tool results.",
  c3: "A checker confirms the card is the top ranked one, every number came from a tool or the question, and nothing extra was called.",
  retry:
    "If the answer check fails, run the whole attempt again, up to 3 tries. A retry sends the run back to the Model.",
  fallback: "If every try fails but the tools worked, build the answer straight from the ranking and say so.",
  refuse: 'If the tools never worked, say "I could not verify an answer" and stop, instead of guessing.',
  answer: "What the user sees.",
  trace:
    "Save every step of the run: what was sent, what came back, how long it took. You cannot fix what you cannot replay.",
  eval: "Run the 8 automatic checks on the saved run. Each one passes, fails, or was not run.",
  judge:
    "LLM judge: a second AI that reads the question, tool results and reply and gives a 0 to 5 grade, 5 times. Second opinion only.",
  card: "All check results on one page, so a person can see at a glance what is wrong.",
  gate: "A pass or fail decision. If the bar is not met, the change does not ship.",
};

export const STATE_WORD = {
  idle: "IDLE",
  active: "RUNNING",
  pass: "PASSED",
  fail: "FAILED",
  blocked: "BLOCKED",
  used: "USED",
  skipped: "SKIPPED",
  done: "DONE",
  missing: "MISSING",
  notrun: "NOT RUN",
};
const SQ = { pass: "ok", done: "ok", fail: "bad", blocked: "bad", active: "half", notrun: "half" };

function node(id, label, state, selected, { extra = "", missingText = "" } = {}) {
  const body =
    state === "missing"
      ? `<small class="wcap">${e(label)}</small><b class="wtext">${e(missingText)}</b>`
      : `<b class="wtext">${e(label)}</b>${extra}`;
  return (
    `<button type="button" class="wnode s-${state}" data-node="${id}" data-state="${state}" aria-haspopup="dialog" aria-label="What is ${e(label)}?" aria-pressed="${id === selected}">` +
    `<i class="sq ${SQ[state] ?? ""}" aria-hidden="true"></i>${body}<span class="wword">${STATE_WORD[state]}</span>${QMARK}</button>`
  );
}

// "5 of 5 done", plus failed / blocked / missing counts when there are any. Only nodes that ran count as done.
const RAN = new Set(["done", "pass", "fail", "blocked", "used"]);
export function countText(list) {
  const n = (f) => list.filter(([, , state]) => f(state)).length;
  let text = `${n((x) => RAN.has(x))} of ${list.length} done`;
  for (const [state, word] of [
    ["fail", "failed"],
    ["blocked", "blocked"],
    ["missing", "missing"],
  ]) {
    const k = n((x) => x === state);
    if (k) text += ` · ${k} ${word}`;
  }
  return text;
}

const chipOf = (m, score) => {
  const [word, cls] = score?.pass == null ? ["NOT RUN", "half"] : score.pass ? ["PASS", "ok"] : ["FAIL", "bad"];
  return `<span class="wchip"><i class="sq ${cls}" aria-hidden="true"></i>${e(m.label)} <b>${word}</b></span>`;
};

export function wiringHtml({ kind = "simple", states = {}, metrics = [], scores = null, selected = "" } = {}) {
  const careful = kind === "careful";
  const stateOf = (id, off) => (!careful && off ? "missing" : (states[id] ?? "idle"));
  const li = (inner, cls = "") => `<li class="wn ${cls}">${inner}</li>`;

  const buildList = BUILD.map(([id, label]) => [id, label, stateOf(id, true)]);
  const liveList = LIVE.filter((n) => careful || !n[2]).map(([id, label]) => [id, label, stateOf(id, id === "guard")]);
  // The LLM judge runs only with a live model: otherwise NOT RUN. It does not feed the gate.
  const afterList = AFTER.map(([id, label]) => [
    id,
    label,
    id === "judge" && careful ? (states.judge ?? "notrun") : stateOf(id, true),
  ]);

  const build = buildList
    .map(([id, label, state]) => li(node(id, label, state, selected, { missingText: "none" })))
    .join("");

  const live = liveList
    .map(([id, label, state]) => {
      const extra = careful && id === "model" ? ' <span class="tag">Safety net</span>' : "";
      // The agent without evals has no input guardrail: a dashed box says so.
      return li(node(id, label, state, selected, { extra, missingText: "nothing here" }));
    })
    .join("");
  const branch = careful
    ? `<div class="wbranch"><span class="wbl">If the answer check fails:</span><ul class="wbtns">${BRANCH.map(
        ([id, label]) => li(node(id, label, stateOf(id), selected), "wsmall"),
      ).join("")}</ul></div>`
    : "";

  const after = afterList
    .map(([id, label, state]) => {
      const chips =
        careful && id === "eval"
          ? `<span class="wchips">${metrics.map((m) => chipOf(m, scores?.[m.id])).join("")}</span>`
          : "";
      const missingText = id === "judge" ? "nothing here" : "nothing: you find out from users";
      // card sits at the end of a row of 5 columns once the grader is added, so its arrow turns down to the gate
      return li(
        node(id, label, state, selected, { extra: chips, missingText }),
        id === "eval" ? "wn-eval" : id === "card" ? "wn-wrap" : "",
      );
    })
    .join("");

  // Each phase is a click-to-open section. Its summary says how far the run got in that phase, in words.
  // Open state is remembered per agent and phase (disclose.js), so a redraw after every step does not undo a click.
  const lane = (phase, cls, name, list, inner, open) =>
    disclose(`${name} · ${countText(list)}`, inner, {
      open,
      id: `wire-${careful ? "careful" : "simple"}-${phase}`,
      cls: `wlane ${cls}`,
    });

  return (
    `<div class="wgraph" data-kind="${careful ? "careful" : "simple"}">` +
    lane("build", "wl-build", "Before the run: build", buildList, `<ol class="wnodes">${build}</ol>`, true) +
    lane("live", "wl-live", "During the run: live", liveList, `<ol class="wnodes">${live}</ol>${branch}`, true) +
    lane("after", "wl-after", "After the run: measure", afterList, `<ol class="wnodes">${after}</ol>`, true) +
    `</div>`
  );
}

// Mark one node as open (aria-pressed) and remember it on root.dataset.sel, so a redraw keeps the mark. "" clears it.
export function setWiringSelected(root, id) {
  root.dataset.sel = id;
  root.querySelectorAll("[data-node]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.node === id)));
}

// A click on a node marks it and calls onNode(id, button). The caller opens the dialog and clears the mark on close.
export function bindWiring(root, onNode) {
  if (root.dataset.wired) return;
  root.dataset.wired = "1";
  root.addEventListener("click", (ev) => {
    const btn = ev.target.closest?.("[data-node]");
    if (!btn || !root.contains(btn)) return;
    setWiringSelected(root, btn.dataset.node);
    onNode?.(btn.dataset.node, btn);
  });
}

// States for a live or finished run. Caller passes `verdict` as null while an attempt is still running.
// `judging` is true while the LLM judge is being asked (agent with evals only).
// Optional `events` (from runGuarded) tell the guard node whether the input check passed or blocked the question.
// Build-time and after-run nodes are 'missing' for the agent without evals; its checks, retry, fallback and refuse ids are omitted.
export function wiringStates(
  kind,
  {
    steps = [],
    verdict = null,
    attempts = 1,
    outcome = null,
    pending = false,
    scores = null,
    events = [],
    judging = false,
  } = {},
) {
  const careful = kind === "careful";
  const tools = steps.filter((s) => s.kind === "tool");
  const final = steps.findLast((s) => s.kind === "final");
  const started = pending || steps.length > 0;
  const finished = !pending && !!final;
  const st = {};
  for (const id of ids(BUILD)) st[id] = careful ? "done" : "missing";

  const blocked = careful && (outcome === "blocked" || events.some((ev) => ev.t === "guard_in_fail"));
  st.ask = started || blocked ? "done" : "idle";
  // The input check runs before anything else, so a started run has passed it unless it was blocked.
  st.guard = !careful
    ? "missing"
    : blocked
      ? "blocked"
      : started || outcome || events.some((ev) => ev.t === "guard_in_ok")
        ? "pass"
        : "idle";
  st.model = pending && !steps.length ? "active" : started ? "done" : "idle";

  const toolState = (i, name) => {
    const s = tools[i];
    if (s) return s.tool !== name || s.output?.error ? "fail" : "pass";
    if (finished) return "skipped";
    return pending && !final && tools.length === i && steps.length > 0 ? "active" : "idle";
  };
  st.t1 = toolState(0, "classify_merchant");
  st.t2 = toolState(1, "rank_cards");
  st.draft = final ? "pass" : pending && tools.length >= 2 ? "active" : "idle";
  st.answer = finished ? "done" : "idle";

  if (careful) {
    const ok = Object.fromEntries((verdict?.checks ?? []).map((c) => [c.id, c.ok]));
    // Judged from the checker when it has run; 'active' only right after the step it reads arrives.
    const judge = (checkIds, justArrived) => {
      const known = checkIds.map((id) => ok[id]);
      if (known.every((v) => v !== undefined)) return known.every(Boolean) ? "pass" : "fail";
      return pending && justArrived ? "active" : "idle";
    };
    st.c1 = judge(["tool1"], tools.length === 1 && !final);
    st.c2 = judge(["tool2"], tools.length === 2 && !final);
    st.c3 = judge(["answer", "numbers", "extras"], !!final);
    st.retry = attempts > 1 ? "used" : "idle";
    st.fallback = outcome === "fixed_by_fallback" ? "used" : "idle";
    st.refuse = outcome === "refused" ? "used" : "idle";
    // Blocked: the model never ran, so every later live node stays idle.
    if (blocked) for (const id of [...ids(LIVE.slice(2)), ...ids(BRANCH)]) st[id] = "idle";
  }

  const hasScores = !!scores && Object.keys(scores).length > 0;
  if (!careful) {
    for (const id of ids(AFTER)) st[id] = "missing";
  } else {
    // The LLM judge is a second opinion: it lights up while it is asked, then shows its own result. The gate ignores it.
    const graded = scores?.rubric_judge?.pass;
    st.judge = judging ? "active" : graded === true ? "pass" : graded === false ? "fail" : "notrun";
    st.trace = finished ? "done" : "idle";
    st.eval = st.card = finished && hasScores ? "done" : "idle";
    // A check that could not run (a typed question has no answer key) is not a pass, but it is not a fail either.
    const gated = Object.entries(scores ?? {})
      .filter(([id]) => id !== "rubric_judge")
      .map(([, s]) => s?.pass);
    st.gate =
      !finished || !hasScores
        ? "idle"
        : gated.includes(false)
          ? "fail"
          : gated.every((p) => p === true)
            ? "pass"
            : "notrun";
  }
  return st;
}
