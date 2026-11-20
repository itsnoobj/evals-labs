// Click-panels for the wiring graph: one HTML string per node, built from one agent's current state.
// Pure strings in, strings out, so node can test it. Everything from a run or a prompt is escaped here.
// wiringHtml() (wiring-graph.js) expects each detail to be escaped HTML already.
import { NODE_HELP, STATE_WORD } from "./wiring-graph.js";
import { NODE_EXPLAIN } from "./node-explainers.js";
import { nodeVisualHtml, flowStripHtml } from "./node-visuals.js";
import { runLinesHtml } from "./explain-dialog.js";
import { SCREEN_TERMS } from "./glossary.js";
import { SYSTEM_PROMPT } from "../agent/agent-step.js";
import { CARDS, CATEGORIES } from "../task/cases.js";
import { judgePrompt } from "../evals/engine.js";
import { cardsMatrixHtml } from "./cards-view.js";
import { judgeFlowHtml } from "./judge-flow.js";
import { toolsHtml } from "./stage-tools.js";
import { cardArtsHtml } from "./run-visuals.js";
import { INPUT_RULES, OUTPUT_RULES } from "../agent/guardrails.js";

const e = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const json = (v, pretty = false) => JSON.stringify(v, null, pretty ? 2 : 0) ?? "none";
const pre = (text) => `<pre class="wpre">${e(text)}</pre>`;
const list = (items) => `<ul class="wlist">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const word = (ok) => (ok === true ? "PASS" : ok === false ? "FAIL" : "NOT RUN");
const mark = (ok) => `<b class="wd-${ok === true ? "ok" : ok === false ? "bad" : "off"}">${word(ok)}</b>`;
const rows = (pairs) => `<dl class="io">${pairs.map(([k, v]) => `<dt>${e(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;

// A card shown as its image plus its name as text, so the meaning never rests on the image alone.
const cardCell = (names) => `<span class="cline">${cardArtsHtml(names)}<span>${e(names.join(" or "))}</span></span>`;

const TITLES = {
  dataset: "Collect real questions",
  key: "The answer key",
  prompt: "The prompt",
  checks: "The checks",
  bar: "The pass bar",
  ask: "Question",
  guard: "Input guardrail",
  model: "Model",
  t1: "Tool: classify_merchant",
  c1: "Check the tool input",
  t2: "Tool: rank_cards",
  c2: "Check the ranking call",
  draft: "Draft answer",
  c3: "Check the answer",
  retry: "Retry",
  fallback: "Fallback",
  refuse: "Refuse",
  answer: "Answer to the user",
  trace: "Saved trace",
  eval: "The 8 checks",
  judge: "LLM judge (second opinion)",
  card: "Scorecard",
  gate: "Ship or block",
};

// The checker that runs inside the agent with evals, in plain words (docs/specs/compare-agents.md).
export const CHECKER_RULES = [
  "The merchant was looked up, the lookup did not fail, and the merchant is one the question names.",
  "The cards were ranked, the ranking did not fail, the amount is the one in the question, and the category is the one the lookup returned.",
  "The final card is a top ranked card and the reward is that card's reward.",
  "Every number in the reply appears in a tool result or in the question.",
  "No tool that does not exist, no tool called twice, and every reply was readable.",
];

// Every real panel ends with example open-source tools for the step. A MISSING box has no step, so no tools.
// panel() only records the parts. renderPanel() joins them into the old one-string panel (buildDetails);
// buildExplain() uses the parts one by one, for the explain dialog.
const panel = (id, body, { missing = false } = {}) => ({ id, body, missing });
const renderPanel = ({ id, body, missing }) =>
  `<h5 class="wd-title">${e(TITLES[id])}</h5><p class="wd-help">${e(NODE_HELP[id])}</p>` +
  (missing ? '<p class="wd-missing"><b>MISSING</b> This agent has no such step.</p>' : "") +
  body +
  (missing ? "" : toolsHtml(id));

const ruleList = (rules) => list(rules.map((r) => `<b>${e(r.label)}</b> <span class="muted">${e(r.plain)}</span>`));

// PASS / BLOCKED per input rule, read from the run's guard events. Rules run in order and stop at the first block,
// so rules after the blocking one were never run.
function guardPanel(side) {
  const fail = side.events.find((x) => x.t === "guard_in_fail");
  const ok = side.events.some((x) => x.t === "guard_in_ok");
  const at = fail ? INPUT_RULES.findIndex((r) => r.id === fail.rule) : -1;
  const state = (i) =>
    ok
      ? ["PASS", "ok"]
      : fail && at >= 0
        ? i < at
          ? ["PASS", "ok"]
          : i === at
            ? ["BLOCKED", "bad"]
            : ["NOT RUN", "off"]
        : ["NOT RUN", "off"];
  const rules = list(
    INPUT_RULES.map((r, i) => {
      const [w, cls] = state(i);
      return `<b class="wd-${cls}">${w}</b> <b>${e(r.label)}</b> <span class="muted">${e(r.plain)}</span>`;
    }),
  );
  const verdict = fail
    ? `<p><b class="wd-bad">BLOCKED</b> ${e(fail.text)} The model never ran.</p>`
    : ok
      ? `<p><b class="wd-ok">PASS</b> ${e(side.events.find((x) => x.t === "guard_in_ok").text)}.</p>`
      : `<p>${side.pending ? "The rules run before the model starts." : "The rules have not run yet."}</p>`;
  return panel(
    "guard",
    `${verdict}<p class="wd-sub">Before the model (input guardrails)</p>${rules}` +
      `<p class="wd-sub">After the answer (output guardrails)</p>${ruleList(OUTPUT_RULES)}`,
  );
}

// ---- the prompt node ----
export function dspyHtml(dspy) {
  if (!dspy || dspy.status === "loading") return "<p>Loading the DSPy prompt…</p>";
  if (dspy.status !== "ok")
    return `<p>The DSPy prompt could not be loaded (${e(dspy.error ?? "unknown error")}). Our own prompt is in the first tab.</p>`;
  const d = dspy.data;
  const find = (id) => (d.variants ?? []).find((v) => v.id === id);
  const text = (m) => (typeof m.content === "string" ? m.content : json(m.content, true));
  const size = (msgs) => msgs.reduce((n, m) => n + text(m).length, 0);
  const zero = find("zero-shot-react");
  const few = find("few-shot");
  const block = (m) => `<p class="wd-role">${e(m.role)}</p>${pre(text(m))}`;
  const sizes = [
    `Our prompt: ${SYSTEM_PROMPT.length} characters`,
    zero
      ? `DSPy zero-shot, first turn: ${size(zero.messages)} characters (${zero.messages.map((m) => `${m.role} ${text(m).length}`).join(", ")})`
      : "",
    few ? `DSPy few-shot: ${size(few.messages)} characters in ${few.messages.length} messages` : "",
  ].filter(Boolean);
  return (
    `<p class="wd-note"><b>Generated by real DSPy ${e(d.dspyVersion)} with a recording fake model. This is DSPy's own format, shown for illustration. ` +
    `The live agent uses the shorter prompt in the other tab.</b></p>` +
    list(sizes.map(e)) +
    (zero ? `<h6 class="wd-sub">${e(zero.label)}</h6>${zero.messages.map(block).join("")}` : "") +
    (few ? `<h6 class="wd-sub">${e(few.label)}</h6>${few.messages.map(block).join("")}` : "") +
    (d.note ? `<p class="wd-note">${e(d.note)}</p>` : "")
  );
}

function promptPanel(kind, { promptTab, dspy }) {
  if (kind !== "careful") {
    return panel(
      "prompt",
      "<p>There is no prompt design step. The agent sends this hand-written prompt, exactly as written:</p>" +
        pre(SYSTEM_PROMPT),
      { missing: true },
    );
  }
  const tab = promptTab === "dspy" ? "dspy" : "ours";
  const btn = (id, label) =>
    `<button type="button" role="tab" class="wtab" data-ptab="${id}" aria-selected="${tab === id}">${label}</button>`;
  const body =
    tab === "ours"
      ? `<p>This is the prompt the live agent sends, exactly as written:</p>${pre(SYSTEM_PROMPT)}` +
        "<p>The agent with evals also forces the reply format with a JSON schema (the safety net). The model can only write a reply that fits the schema: a tool call with the right argument names, or a final answer.</p>"
      : dspyHtml(dspy);
  return panel(
    "prompt",
    `<div class="wtabs" role="tablist">${btn("ours", "Our prompt")}${btn("dspy", "DSPy prompt")}</div>${body}`,
  );
}

// ---- per node ----
const toolPanel = (id, tool, steps, pending) => {
  const s = steps.filter((x) => x.kind === "tool")[id === "t1" ? 0 : 1];
  if (!s) return panel(id, `<p>${pending ? "Not reached yet." : "The agent never made this call."}</p>`);
  const wrong =
    s.tool !== tool
      ? `<p class="wd-missing"><b>WRONG TOOL</b> The agent called ${e(s.tool)} here, not ${e(tool)}.</p>`
      : "";
  return panel(
    id,
    wrong +
      rows([
        ["asked", `<code>${e(json(s.args))}</code>`],
        ["got back", `<code>${e(json(s.output))}</code>`],
        ["time", `${e(Number(s.ms) || 0)} ms`],
        ["text pieces", e(Number(s.tokens) || 0)],
      ]),
  );
};

function checkPanel(id, checkIds, side, extra = "") {
  const v = side.attempts.at(-1)?.verdict;
  if (!v)
    return panel(
      id,
      `<p>${side.pending ? "The checker reads the run when this try ends." : "No verdict yet."}</p>${extra}`,
    );
  const mine = v.checks.filter((c) => checkIds.includes(c.id));
  const bad = mine.some((c) => !c.ok);
  return panel(
    id,
    list(mine.map((c) => `${mark(c.ok)} ${e(c.label)}`)) +
      (bad && v.problems.length
        ? `<p class="wd-sub">What the checker reported for this try (all rules):</p>${list(v.problems.map(e))}`
        : "") +
      (side.attempts.length > 1
        ? `<p class="meta">This is try ${side.attempts.length}. Earlier tries were rejected.</p>`
        : "") +
      extra,
  );
}

function branchPanel(id, type, side, unused) {
  const evs = side.events.filter((x) => x.t === type);
  if (!evs.length) return panel(id, `<p>Not used in this run. ${e(unused)}</p>`);
  const fails = id === "retry" ? side.events.filter((x) => x.t === "verify_fail") : [];
  return panel(id, list([...fails, ...evs].map((x) => `<b>Try ${e((Number(x.attempt) || 0) + 1)}</b> ${e(x.text)}`)));
}

const scoreRows = (metrics, scores) =>
  list(
    metrics.map(
      (m) =>
        `${mark(scores?.[m.id]?.pass ?? null)} <b>${e(m.label)}</b> <span class="muted">${e(scores?.[m.id]?.reason ?? "not run")}</span>`,
    ),
  );
const autoFails = (metrics, scores) => metrics.filter((m) => m.id !== "rubric_judge" && scores?.[m.id]?.pass !== true);

// The LLM judge has its own node. In the 8 checks panels it gets one sentence and a pointer.
const graderNote = (judged) =>
  `<p class="muted">LLM judge: ${judged ? "asked after the answer" : "not run here"}, and not part of the ship bar. Click the LLM judge box to see how it works.</p>`;

const NO_MODEL_SENTENCE =
  "Recorded runs have no model to ask. Press Use the live AI under the question box, then Ask both again, and the grader runs for real.";

// The visual for the grader node: what it reads, the prompt it gets (built from this run), 5 asks, result.
// Grades come from side.judge (live runs only). Without a model nothing is asked and no grade is shown.
function graderPanel(c, side, scores, mode) {
  const grade = scores?.rubric_judge;
  return panel(
    "judge",
    (mode === "live" ? "" : `<p><b>${e(NO_MODEL_SENTENCE)}</b></p>`) +
      (side.judging ? "<p><b>Asking the LLM judge 5 times…</b></p>" : "") +
      judgeFlowHtml({
        prompt: judgePrompt(c, { steps: side.steps }),
        grades: side.judge?.all ?? null,
        median: side.judge?.median ?? null,
      }) +
      (grade && grade.pass !== null && grade.pass !== undefined
        ? `<p>${mark(grade.pass)} ${e(grade.reason ?? "")}</p>`
        : ""),
  );
}

// side: one agent's state. shared: things both agents see. Returns { nodeId: { id, body, missing } }.
// side = { steps, modelSteps, attempts:[{steps,verdict}], events, outcome, pending, scores, judge: {all, median} | null }
export function buildParts(kind, side, shared) {
  const { c, cases, cardNames, labels, metrics, modelName, mode, recordedTemp } = shared;
  const careful = kind === "careful";
  const key = c.expected; // null for a typed question
  const nameList = key ? (key.accept ?? [key.card]).map((id) => cardNames[id] ?? id) : [];
  const names = nameList.join(" or ");
  const finalStep = side.steps.findLast((s) => s.kind === "final");
  const draftStep = (side.modelSteps ?? side.steps).findLast((s) => s.kind === "final");
  const notMine = (id) =>
    panel(id, "<p>Nothing here. A real agent without evals has no such step.</p>", { missing: true });
  const d = {};

  d.dataset = !careful
    ? notMine("dataset")
    : panel(
        "dataset",
        `<p>The ${cases.length} golden questions:</p>${list(cases.map((x) => `<b class="mono">${e(x.id)}</b> ${e(x.query)}`))}`,
      );
  d.key = !careful
    ? notMine("key")
    : !key
      ? panel("key", "<p>No answer key for your own question. The checks that need a key were not run.</p>")
      : panel(
          "key",
          `<p class="cline">${cardArtsHtml(nameList)}<span>For <b class="mono">${e(c.id)}</b>: accepted ${key.accept?.length > 1 ? "cards (a tie)" : "card"} <b>${e(names)}</b>, reward <b>₹${e(key.reward_inr)}</b>, category <b>${e(labels[key.category] ?? key.category)}</b>.</span></p>` +
            cardsMatrixHtml({
              cards: CARDS,
              categories: CATEGORIES,
              selectedCategory: key.category,
              bestCard: key.accept,
              labels,
              caption: "The rate table the key is built from (percent back).",
            }),
        );
  d.prompt = promptPanel(kind, shared);
  d.checks = !careful
    ? notMine("checks")
    : panel(
        "checks",
        `<p class="wd-sub">The 8 automatic checks, run on the saved trace:</p>${list(metrics.map((m) => `<b>${e(m.label)}</b> <span class="muted">${e(m.blurb ?? "")}</span>`))}` +
          `<p class="wd-sub">The 5 rules the checker applies while the agent runs:</p><ol class="wlist">${CHECKER_RULES.map((r) => `<li>${e(r)}</li>`).join("")}</ol>` +
          graderNote(!!side.judge),
      );
  d.bar = !careful
    ? notMine("bar")
    : panel(
        "bar",
        `<p><b>Ship only if all ${metrics.filter((m) => m.id !== "rubric_judge").length} automatic checks pass.</b></p><p>The LLM judge is a second opinion. It is not part of the bar.</p>`,
      );

  d.ask = panel("ask", `<p>${e(c.query)}</p>`);
  d.guard = careful ? guardPanel(side) : notMine("guard");
  const tempText = careful
    ? mode === "replay"
      ? `0.2 live. This replay uses runs recorded at ${e(recordedTemp ?? "0.7")}.`
      : "0.2 (low randomness)"
    : mode === "replay"
      ? `0.7 (recorded at ${e(recordedTemp ?? "0.7")})`
      : "0.7";
  d.model = panel(
    "model",
    rows([
      ["model", e(mode === "replay" ? `${modelName ?? "recorded"} (recorded runs)` : (modelName ?? "live model"))],
      ["temperature", tempText],
      ["safety net", careful ? "ON: the reply must fit a JSON schema" : "OFF: free-form text"],
      ["tries", careful ? `up to 3 (used ${side.attempts.length})` : "1"],
    ]),
  );
  d.t1 = toolPanel("t1", "classify_merchant", side.steps, side.pending);
  d.t2 = toolPanel("t2", "rank_cards", side.steps, side.pending);
  const draftText = draftStep
    ? rows([
        ["card", draftStep.card == null ? "none" : cardCell([cardNames[draftStep.card] ?? draftStep.card])],
        ["reward", `₹${e(draftStep.reward_inr ?? "none")}`],
        ["reply", e(draftStep.reply)],
      ])
    : `<p>${side.pending ? "Not written yet." : "The model never wrote a readable final answer."}</p>`;
  d.draft = panel("draft", draftText);
  d.answer = panel(
    "answer",
    finalStep
      ? rows([
          ["card", finalStep.card == null ? "none" : cardCell([cardNames[finalStep.card] ?? finalStep.card])],
          ["reward", finalStep.reward_inr == null ? "none" : `₹${e(finalStep.reward_inr)}`],
          ["reply", e(finalStep.reply)],
          ...(finalStep.source
            ? [["source", e(finalStep.source === "fallback" ? "built from the rank_cards result" : "refusal")]]
            : []),
        ])
      : `<p>${side.pending ? "Not given yet." : "No answer was given."}</p>`,
  );

  if (careful) {
    d.c1 = checkPanel("c1", ["tool1"], side);
    d.c2 = checkPanel("c2", ["tool2"], side);
    d.c3 = checkPanel(
      "c3",
      ["answer", "numbers", "extras", "output"],
      side,
      `<p class="wd-sub">Output guardrails (part of this check)</p>${list(OUTPUT_RULES.map((r) => e(r.label)))}`,
    );
    d.retry = branchPanel("retry", "retry", side, "The first try passed the checker.");
    d.fallback = branchPanel("fallback", "fallback", side, "A try passed, or the tools never ran correctly.");
    d.refuse = branchPanel("refuse", "refused", side, "The agent answered, so it did not need to refuse.");
  }

  const traceData = careful
    ? side.attempts.map((a, i) => ({ try: i + 1, verdict: a.verdict, steps: a.steps }))
    : side.steps;
  const done = !!side.scores;
  d.trace = !careful
    ? notMine("trace")
    : panel("trace", side.steps.length ? pre(json(traceData, true)) : "<p>Nothing saved yet.</p>");
  d.eval = !careful
    ? notMine("eval")
    : panel(
        "eval",
        (done ? scoreRows(metrics, side.scores) : "<p>The 8 checks run when the answer is final.</p>") +
          graderNote(!!side.judge),
      );
  d.judge = careful ? graderPanel(c, side, side.scores, mode) : notMine("judge");
  if (!careful) {
    d.card = notMine("card");
    d.gate = notMine("gate");
    return d;
  }
  const pass = done ? metrics.filter((m) => side.scores[m.id]?.pass === true).length : 0;
  const fail = done ? metrics.filter((m) => side.scores[m.id]?.pass === false).length : 0;
  d.card = panel(
    "card",
    done
      ? `<p><b>${pass} PASS · ${fail} FAIL · ${metrics.length - pass - fail} NOT RUN</b></p>` +
          (fail ? list(metrics.filter((m) => side.scores[m.id]?.pass === false).map((m) => e(m.label))) : "")
      : "<p>The scorecard is filled when the 8 checks have run.</p>",
  );
  const bad = autoFails(metrics, side.scores);
  const failed = bad.filter((m) => side.scores?.[m.id]?.pass === false);
  d.gate = panel(
    "gate",
    !done
      ? "<p>Not decided yet.</p>"
      : !failed.length && bad.length
        ? `<p>${mark(null)} <b>Cannot decide.</b> Your own question has no answer key, so these checks did not run:</p>${list(bad.map((m) => e(m.label)))}<p class="muted">Pick one of the test questions to get a ship or block decision.</p>`
        : bad.length
          ? `<p>${mark(false)} <b>Blocked.</b> These checks did not pass:</p>${list(bad.map((m) => e(m.label)))}`
          : `<p>${mark(true)} <b>Ship.</b> All automatic checks passed. One run proves little, so a real team gates on the whole test set.</p>`,
  );
  return d;
}

// The whole panel of every node as one escaped HTML string: { nodeId: html }.
export function buildDetails(kind, side, shared) {
  return Object.fromEntries(Object.entries(buildParts(kind, side, shared)).map(([id, p]) => [id, renderPanel(p)]));
}

// ---- the explain dialog (explain-dialog.js) ----

// Compact one-line text of a tool result, for the IN -> OUT strip. A ranking lists every card with its reward.
const outText = (output, cardNames) =>
  Array.isArray(output?.ranked)
    ? output.ranked.map((r) => `${cardNames[r.card] ?? r.card} ₹${r.reward_inr}`).join(", ")
    : json(output);

const counts = (metrics, scores) => {
  const pass = metrics.filter((m) => scores?.[m.id]?.pass === true).length;
  const fail = metrics.filter((m) => scores?.[m.id]?.pass === false).length;
  return `${pass} PASS · ${fail} FAIL · ${metrics.length - pass - fail} NOT RUN`;
};

// 1-3 short lines about this node in this run: the state as a word, then the key value. Plain text, escaped by
// runLinesHtml. A line with `html` is trusted markup built here from escaped parts.
function runLines(id, kind, side, shared, state) {
  const { c, cases, cardNames, labels, metrics, modelName, mode } = shared;
  const word = STATE_WORD[state] ?? "IDLE";
  const careful = kind === "careful";
  const name = (card) => cardNames[card] ?? card;
  const tools = side.steps.filter((s) => s.kind === "tool");
  const finalStep = side.steps.findLast((s) => s.kind === "final");
  const draftStep = (side.modelSteps ?? side.steps).findLast((s) => s.kind === "final");
  const verdict = side.attempts.at(-1)?.verdict;
  const key = c.expected;
  const L = (text, st = word) => ({ state: st, text });
  const checkLine = (ids) => {
    const mine = (verdict?.checks ?? []).filter((x) => ids.includes(x.id));
    if (!mine.length) return [L(side.pending ? "The checker reads the run when this try ends." : "No verdict yet.")];
    return [L(`${mine.filter((x) => x.ok).length} of ${mine.length} rules passed.`)].concat(
      mine.filter((x) => !x.ok).map((x) => L(x.label, "FAILED")),
    );
  };
  const toolLines = (i) => {
    const s = tools[i];
    if (!s) return [L(side.pending ? "Not reached yet." : "The agent never made this call.")];
    const result =
      i === 0
        ? `Category: ${s.output?.category ?? "none"}.`
        : `Top card: ${s.output?.ranked?.[0] ? `${name(s.output.ranked[0].card)}, ₹${s.output.ranked[0].reward_inr}` : "none"}.`;
    return [
      L(s.output?.error ? `Tool error: ${s.output.error}` : result),
      { html: flowStripHtml(json(s.args), outText(s.output, cardNames)) },
    ];
  };
  const branch = (type, unused) => {
    const evs = side.events.filter((x) => x.t === type);
    return [L(evs.length ? evs.map((x) => x.text).join(" ") : unused)];
  };
  switch (id) {
    case "dataset":
      return [
        L(
          `${cases.length} golden questions. ${c.custom ? "This run uses your own question." : `This run uses ${c.id}.`}`,
        ),
      ];
    case "key":
      return key
        ? [
            L(
              `${labels[key.category] ?? key.category}: ${(key.accept ?? [key.card]).map(name).join(" or ")}, ₹${key.reward_inr}.`,
            ),
          ]
        : [L("No answer key for your own question.")];
    case "prompt":
      return [
        L(
          `${SYSTEM_PROMPT.length} characters, ${careful ? "plus a JSON schema for the reply format" : "hand-written, sent as it is"}.`,
        ),
      ];
    case "checks":
      return [L(`${metrics.length} checks chosen, plus the checker rules that run inside the agent.`)];
    case "bar":
      return [L(`Ship only if all ${metrics.filter((m) => m.id !== "rubric_judge").length} automatic checks pass.`)];
    case "ask":
      return [L(c.query)];
    case "guard": {
      const fail = side.events.find((x) => x.t === "guard_in_fail");
      const ok = side.events.find((x) => x.t === "guard_in_ok");
      return [L(fail ? `${fail.text} The model never ran.` : ok ? ok.text : "The rules have not run yet.")];
    }
    case "model":
      return [
        L(`${mode === "replay" ? `${modelName ?? "recorded"} (recorded runs)` : (modelName ?? "live model")}.`),
        L(`Tries used: ${side.attempts.length}${careful ? " of up to 3" : ""}.`, "DONE"),
      ];
    case "t1":
      return toolLines(0);
    case "t2":
      return toolLines(1);
    case "c1":
    case "c2": {
      const s = tools[id === "c1" ? 0 : 1];
      return [
        ...checkLine([id === "c1" ? "tool1" : "tool2"]),
        ...(s ? [{ html: flowStripHtml(json(s.args), verdict ? word : "not checked yet") }] : []),
      ];
    }
    case "c3":
      return checkLine(["answer", "numbers", "extras", "output"]);
    case "draft":
      return [
        draftStep
          ? L(`${draftStep.card == null ? "No card" : name(draftStep.card)}, ₹${draftStep.reward_inr ?? "none"}.`)
          : L(side.pending ? "Not written yet." : "No readable final answer."),
      ];
    case "answer":
      return [
        finalStep
          ? L(`${finalStep.card == null ? "No card" : name(finalStep.card)}, ₹${finalStep.reward_inr ?? "none"}.`)
          : L(side.pending ? "Not given yet." : "No answer was given."),
      ];
    case "retry":
      return [L(side.attempts.length > 1 ? `${side.attempts.length} tries were used.` : "Not used in this run.")];
    case "fallback":
      return branch("fallback", "Not used in this run.");
    case "refuse":
      return branch("refused", "Not used in this run.");
    case "trace":
      return [
        L(
          side.steps.length
            ? `${side.steps.length} steps saved in ${side.attempts.length} ${side.attempts.length === 1 ? "try" : "tries"}.`
            : "Nothing saved yet.",
        ),
      ];
    case "eval":
      return [L(side.scores ? counts(metrics, side.scores) : "The checks run when the answer is final.")];
    case "judge": {
      const g = side.judge;
      return [
        side.judging
          ? L("Asking the LLM judge 5 times.")
          : g
            ? L(`Grades: ${g.all.join(", ")}. Middle grade: ${g.median}.`)
            : L(mode === "live" ? "Not asked yet." : "Recorded runs have no model to ask.", "NOT RUN"),
      ];
    }
    case "card":
      return [L(side.scores ? counts(metrics, side.scores) : "Filled when the checks have run.")];
    case "gate": {
      if (!side.scores) return [L("Not decided yet.")];
      const bad = autoFails(metrics, side.scores);
      const failed = bad.filter((m) => side.scores[m.id]?.pass === false);
      return [
        L(
          !bad.length
            ? "Ship."
            : failed.length
              ? `Blocked: ${failed.map((m) => m.label).join(", ")}.`
              : "Cannot decide: your own question has no answer key.",
        ),
      ];
    }
    default:
      return [L("")];
  }
}

// "Open-source tools" body: the list inside toolsHtml(), without its own <details>.
const toolsBody = (id) =>
  toolsHtml(id)
    .replace(/^<details class="stage-tools"><summary>[^<]*<\/summary>/, "")
    .replace(/<\/details>$/, "");

// Everything the explain dialog needs for one node of one agent. `state` is the node's state key from wiringStates().
// The old click panel is not lost: its text goes into "Real data" (or "Prompt"), and the tools list into "Open-source tools".
export function buildExplain(kind, id, side, shared, state) {
  const part = buildParts(kind, side, shared)[id];
  const missing = part.missing;
  const data = (html) => `<div class="wgraph xp-data">${html}</div>`;
  const sid = (n) => `explain-${kind}-${id}-${n}`;
  const lines = missing
    ? [{ state: "MISSING", text: "This agent has no such step." }]
    : runLines(id, kind, side, shared, state);
  const more = [];
  if (id === "prompt") more.push({ summary: "Prompt", html: data(part.body), id: sid("prompt") });
  else if (!missing)
    more.push({
      summary: "Real data",
      html: data(`<p class="muted">${e(NODE_HELP[id])}</p>${part.body}`),
      id: sid("data"),
    });
  if (!missing && toolsBody(id))
    more.push({ summary: "Open-source tools", html: data(toolsBody(id)), id: sid("tools") });
  return {
    title: TITLES[id],
    what: NODE_EXPLAIN[id].what,
    why: NODE_EXPLAIN[id].why,
    visualHtml: nodeVisualHtml(id, { missing }),
    thisRunHtml: runLinesHtml(lines),
    moreSections: more,
    askTerms: SCREEN_TERMS.compare,
  };
}
