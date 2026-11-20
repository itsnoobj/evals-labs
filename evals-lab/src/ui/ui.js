// Pure render functions: plain data in, HTML out. This module never imports the engine.
import { STAGES, METRIC_STAGE, MISSIONS, BUG_LESSON } from "./lessons.js";
import { rankBarsHtml, timelineHtml, cardArtsHtml } from "./run-visuals.js";
import { toolsListHtml } from "./stage-tools.js";
import { disclose } from "./disclose.js";
import { stepperHtml, taskSquares } from "./mission-stepper.js";
import { openExplain, runLinesHtml } from "./explain-dialog.js";
import { nodeVisualHtml, flowStripHtml } from "./node-visuals.js";
import { MORE_EXPLAIN, stageExplainId } from "./explainers-more.js";

export function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}
const e = escapeHtml;

const SCREENS = ["start", "run", "metrics", "golden", "compounding", "compare"];
const KEY_METRICS = [
  ["task_success", "Correct final answer"],
  ["trajectory", "Right tools, right order"],
  ["grounded", "Numbers come from tools"],
];
const pct = (v) => `${Math.round(v * 100)}%`;

// [word, css class]. pass null or a missing score means the check did not run.
function status(s) {
  if (!s || s.pass == null) return ["NOT RUN", "off"];
  return s.pass ? ["PASS", "ok"] : ["FAIL", "bad"];
}
// filled square = pass, hollow = fail, half = not run
const shape = (cls) => `<i class="sq ${cls === "off" ? "half" : cls}" aria-hidden="true"></i>`;

// ---------- hash routing ----------
let current = null;
let bound = false;

export function showScreenFromHash() {
  const id = location.hash.slice(1);
  // Unknown hashes (for example the skip link) keep the screen we are on.
  current = SCREENS.includes(id) ? id : current || "start";
  for (const s of SCREENS) document.getElementById(s).hidden = s !== current;
  document.querySelectorAll("[data-screen]").forEach((a) => {
    if (a.dataset.screen === current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (!bound) {
    bound = true;
    addEventListener("hashchange", () => {
      showScreenFromHash();
      scrollTo(0, 0);
    });
  }
  return current;
}

// ---------- banner for an insecure page ----------
export function renderOriginWarning(root, { origin, fixUrl }) {
  root.hidden = false;
  root.innerHTML = `<p><b>Live model is off on this page.</b> You opened <span class="mono">${e(origin)}</span>.
    Browsers only let a page use your graphics chip when it is opened as localhost or https. Open <a class="mono" href="${e(fixUrl)}">${e(fixUrl)}</a> instead.
    Recorded runs work here.</p>`;
}

// ---------- the task diagram ----------
const STATE_WORD = {
  ok: "OK",
  bad: "WRONG",
  missing: "MISSING",
  active: "RUNNING",
  idle: "WAITING",
  done: "DONE",
  skipped: "NOT USED",
};

// What each box state means, in plain words (the state word itself is STATE_WORD).
const STATE_TEXT = {
  ok: "Matches the answer key.",
  bad: "Does not match the answer key.",
  missing: "The run ended without this step.",
  active: "The model is working on this step now.",
  idle: "Waiting for an earlier step.",
  done: "This step happened.",
  skipped: "The model did not call this tool.",
};

const money = (n) => `₹${n ?? "none"}`;

// Explain dialog input for one box of the task diagram (explain-dialog.js shows it).
// ctx: { state, run, scores, metrics, bugStage, cardNames, query }. state null means there is no run yet.
// Pure: no DOM. The old click panel is not lost: its text sits in "More about this box", the tools list in its own section.
export function stageExplain(
  st,
  { state = null, run = null, scores = null, metrics = [], bugStage = null, cardNames = {}, query = "" } = {},
) {
  const name = (id) => cardNames[id] ?? id;
  const lines = [];
  if (!run || !state || state === "plain") {
    lines.push({ state: "NO RUN YET", text: "Run a question on the Run screen to see this box with real data." });
  } else {
    if (st.id === "checks" && scores) {
      const words = metrics.map((m) => status(scores[m.id])[0]);
      const count = (w) => words.filter((x) => x === w).length;
      lines.push({
        state: "RESULT",
        text: `${count("PASS")} PASS, ${count("FAIL")} FAIL, ${count("NOT RUN")} NOT RUN`,
      });
    } else {
      lines.push({ state: STATE_WORD[state] ?? "", text: STATE_TEXT[state] ?? "" });
    }
    const step = st.tool ? run.steps.find((s) => s.kind === "tool" && s.tool === st.tool) : null;
    if (st.id === "question" && query) lines.push({ text: `Question: ${query}` });
    if (st.id === "classify" && step)
      lines.push({ html: flowStripHtml(JSON.stringify(step.args), JSON.stringify(step.output)) });
    if (st.id === "rank" && step) {
      const ranked = step.output?.ranked ?? [];
      const top = ranked[0];
      const out = top
        ? `${name(top.card)} first, ${money(top.reward_inr)} (${ranked.length} cards ranked)`
        : JSON.stringify(step.output);
      lines.push({ html: flowStripHtml(JSON.stringify(step.args), out) });
    }
    const final = run.steps.findLast((s) => s.kind === "final");
    if (st.id === "answer" && final) {
      lines.push({
        text: `Card and reward: ${final.card == null ? "none" : name(final.card)}, ${money(final.reward_inr)}`,
      });
      lines.push({ text: `Reply: ${final.reply ?? "none"}` });
    }
  }
  if (bugStage === st.id) lines.push({ state: "BUG HERE", text: "An injected bug lands in this box." });

  const watchers = metrics.filter((m) => METRIC_STAGE[m.id]?.includes(st.id)).map((m) => m.label);
  const more = [
    {
      summary: "More about this box",
      html:
        `<p>${e(st.what)}</p><p class="muted">The model chooses every step. Our code runs the tools.</p><p><b>Concept.</b> ${e(st.learn)}</p>` +
        (watchers.length ? `<p class="muted">Checks that read this box: ${e(watchers.join(", "))}.</p>` : ""),
      id: `explain-stage-${st.id}-more`,
    },
  ];
  const tools = toolsListHtml(st.id);
  if (tools)
    more.push({
      summary: "Open-source tools",
      html: `<div class="stage-tools xp-tools">${tools}</div>`,
      id: `explain-stage-${st.id}-tools`,
    });
  const words = MORE_EXPLAIN[stageExplainId(st.id)];
  return {
    title: `Box ${st.num}: ${st.title}`,
    what: words.what,
    why: words.why,
    visualHtml: nodeVisualHtml(stageExplainId(st.id)),
    thisRunHtml: runLinesHtml(lines),
    moreSections: more,
  };
}

// states: output of stageStates(), or null for the plain explainer. metrics + scores add check chips to each box.
// bugStage marks the box where an injected bug lands. Clicking a box opens the explain dialog.
// run, query and cardNames are only read when a box is opened (the "in this run" lines).
export function renderFlow(
  root,
  {
    states = null,
    metrics = [],
    scores = null,
    chips = false,
    bugStage = null,
    run = null,
    query = "",
    cardNames = {},
  } = {},
) {
  const fails = metrics.filter((m) => scores?.[m.id]?.pass === false).length;
  const passes = metrics.filter((m) => scores?.[m.id]?.pass === true).length;
  const labelFor = (st, state) => {
    if (st.id === "checks" && scores) return `${fails} FAIL · ${passes} PASS`;
    return STATE_WORD[state] ?? "";
  };
  const nodes = STAGES.map((st) => {
    const state = states?.[st.id] ?? "plain";
    const label = labelFor(st, state);
    const chipHtml = chips
      ? metrics
          .filter((m) => METRIC_STAGE[m.id]?.includes(st.id))
          .map((m) => {
            const [word, cls] = status(scores?.[m.id]);
            return `<li class="chip ${cls}">${shape(cls)}${e(m.label)} <b>${word}</b></li>`;
          })
          .join("")
      : "";
    return `<li class="fnode s-${state}${bugStage === st.id ? " buggy" : ""}">
      <button type="button" data-stage="${st.id}" aria-haspopup="dialog">
        <span class="fnum" aria-hidden="true">${st.num}</span><b>${e(st.title)}</b><small>${e(st.sub)}</small>
        ${label ? `<span class="fstate">${e(label)}</span>` : ""}
        ${bugStage === st.id ? '<span class="fbug">BUG HERE</span>' : ""}
      </button>${chipHtml ? `<ul class="chips" aria-label="Checks that read this box">${chipHtml}</ul>` : ""}</li>`;
  }).join('<li class="farrow" aria-hidden="true"></li>');
  const extras = states?.extras?.length
    ? `<p class="fextra"><b>Extra steps the route did not expect:</b> <span class="mono">${e(states.extras.join(", "))}</span></p>`
    : "";
  root.innerHTML = `<div class="flow"><ol class="frow">${nodes}</ol>${extras}
    <p class="muted fnote">Click a box for details.</p></div>`;

  // The Run screen redraws this diagram after every step, so look the button up again when the dialog closes.
  root.querySelectorAll("[data-stage]").forEach((b) => {
    b.onclick = () => {
      const st = STAGES.find((s) => s.id === b.dataset.stage);
      openExplain(
        stageExplain(st, { state: states?.[st.id] ?? null, run, scores, metrics, bugStage, cardNames, query }),
        {
          returnFocus: () => root.querySelector(`[data-stage="${st.id}"]`),
        },
      );
    };
  });
}

// ---------- missions ----------
const missionDone = (m, done) => m.tasks.filter((t) => !t.bonus).every((t) => done.has(t.id));

function missionHtml(m, done) {
  const complete = missionDone(m, done);
  const next = MISSIONS.find((x) => x.id === m.next);
  const tasks = m.tasks
    .map((t) => {
      const ok = done.has(t.id);
      return `<li class="task${ok ? " done" : ""}">${shape(ok ? "ok" : "bad")}<span>${e(t.text)}</span>
      <b class="w ${ok ? "w-ok" : "w-off"}">${ok ? "DONE" : t.bonus ? "BONUS" : "TO DO"}</b></li>`;
    })
    .join("");
  const finish = complete
    ? `<div class="mdone"><p><b>You learned.</b> ${e(m.learned)}</p>${
        next
          ? `<a class="btn" href="#${next.id}">Next: ${next.num} ${e(next.title)} &rarr;</a>`
          : "<p>That is the whole tour. Try another case, bug or temperature.</p>"
      }</div>`
    : "";
  const required = m.tasks.filter((t) => !t.bonus);
  const doneCount = required.filter((t) => done.has(t.id)).length;
  // Strip of the five missions, then one line for the goal; the task list, time and concept sit behind one section.
  const doneIds = MISSIONS.filter((x) => missionDone(x, done)).map((x) => x.id);
  return `<div class="mission${complete ? " complete" : ""}"><div class="mmain">
      ${stepperHtml(m.id, doneIds)}
      <p class="goal"><b class="mono">Mission ${m.num} of ${MISSIONS.length}</b> · ${e(m.goal)}</p>${disclose(
        `Mission tasks · ${taskSquares(doneCount, required.length)} ${doneCount} of ${required.length} done`,
        `<span class="k">About ${e(m.time)}</span><ul class="tasks">${tasks}</ul><div class="mconcept"><span class="k">Concept: ${e(m.concept)}</span><p>${e(m.conceptText)}</p></div>`,
        { id: `mission-${m.id}` },
      )}</div>${finish}</div>`;
}

// Fills every [data-mission] panel, the Start cards and the done ticks in the nav.
export function renderMissions(done = new Set()) {
  document.querySelectorAll("[data-mission]").forEach((root) => {
    const m = MISSIONS.find((x) => x.id === root.dataset.mission);
    if (m) root.innerHTML = missionHtml(m, done);
  });
  const cards = document.getElementById("start-missions");
  if (cards) {
    cards.innerHTML = MISSIONS.map((m) => {
      const complete = missionDone(m, done);
      return `<li><a class="mcard" href="#${m.id}"><b class="mnum" aria-hidden="true">${m.num}</b>
        <span class="mtitle">${e(m.title)}</span><span class="mgoal">${e(m.goal)}</span>
        <span class="k">Concept: ${e(m.concept)} · ${e(m.time)}</span>
        <span class="w ${complete ? "w-ok" : "w-off"}">${complete ? "DONE" : "START"}</span></a></li>`;
    }).join("");
  }
  for (const m of MISSIONS) {
    const nav = document.querySelector(`[data-screen="${m.id}"]`);
    if (nav) nav.dataset.done = String(missionDone(m, done));
  }
}

// ---------- 1 Run ----------
const CAPTION = {
  tool: ["Tool", "The model asked for a tool. Our code ran it and passed the result back."],
  final: ["Final", "The model stopped calling tools and gave its answer."],
  invalid: [
    "Unreadable reply",
    "The reply was not in a format our code can read, so no tool ran and this step was wasted.",
  ],
};

// What each kind of step in this run means. One section for the whole step list, not one line per step.
function captionsHtml(steps) {
  const kinds = [...new Set(steps.map((s) => s.kind))].filter((k) => CAPTION[k]);
  if (!kinds.length) return "";
  const items = kinds.map((k) => `<li><b>${CAPTION[k][0]}.</b> ${e(CAPTION[k][1])}</li>`).join("");
  return disclose("What the steps mean", `<ul>${items}</ul>`, { id: "run-captions" });
}

function stepHtml(s, i, cardNames) {
  const bad = s.kind === "invalid" || s.validJson === false;
  let tag;
  let body;
  if (s.kind === "tool") {
    tag = `<span class="tag">Tool</span><b class="mono">${e(s.tool)}</b>`;
    const bars = s.tool === "rank_cards" ? rankBarsHtml(s.output, cardNames) : "";
    const result = bars
      ? `${bars}<details class="rawjson"><summary>Raw data</summary><code>${e(JSON.stringify(s.output))}</code></details>`
      : e(JSON.stringify(s.output));
    body = `<dt>asked</dt><dd>${e(JSON.stringify(s.args))}</dd><dt>got back</dt><dd>${result}</dd>`;
  } else if (s.kind === "final") {
    tag = '<span class="tag final">Final</span><b class="mono">answer</b>';
    body = `<dt>answer</dt><dd>${e(JSON.stringify({ card: s.card, reward_inr: s.reward_inr }))}</dd>`;
  } else {
    tag = '<span class="tag bad">Unreadable reply</span><b class="mono">not understood</b>';
    body = `<dt>raw reply</dt><dd>${e(s.raw)}</dd>`;
  }
  const reply = s.kind === "final" ? `<p class="reply">${e(s.reply)}</p>` : "";
  return `<li class="step${bad ? " invalid" : ""}"><b class="stepno" aria-hidden="true">${i + 1}</b><div>
    <div class="step-head"><span>${tag}</span><span class="meta">${e(s.ms)} ms · ${e(s.tokens)} text pieces</span></div>
    <dl class="io">${body}</dl>${reply}</div></li>`;
}

// expected: { card, accept?, reward_inr } from the answer key. `accept` lists every card tied for the top reward.
// pending=true while the run is still going.
export function renderRun(root, { caseInfo, run, scores, expected = null, pending = false, cardNames = {} }) {
  const score = KEY_METRICS.map(([id, label]) => {
    const [word, cls] = status(scores?.[id]);
    return `<li class="score">${shape(cls)}<span><b>${label}</b> <span class="w w-${cls}">${word}</span></span>
      <small>${e(scores?.[id]?.reason ?? "not run")}</small></li>`;
  }).join("");
  const final = run.steps.findLast((s) => s.kind === "final");
  let key = "";
  if (!expected && caseInfo.custom) {
    key = `<div class="nokey"><b>Your own question has no answer key.</b>${disclose(
      "Why?",
      "<p>The page cannot tell right from wrong here, so the checks that need a key show NOT RUN. The steps below are still real.</p>",
      { id: "run-nokey" },
    )}</div>`;
  }
  if (expected) {
    const name = (id) => cardNames[id] ?? id;
    const accept = Array.isArray(expected.accept) && expected.accept.length ? expected.accept : [expected.card];
    const got = final
      ? `${final.card == null ? "none" : name(final.card)} · ₹${final.reward_inr ?? "none"}`
      : pending
        ? "still working…"
        : "no final answer";
    const [word, cls] = scores ? status(scores.task_success) : ["WAITING", "off"];
    key = `<div class="key">
      <div><span class="k">Answer key${accept.length > 1 ? " (a tie: either card is right)" : ""}</span><p class="mono cline">${cardArtsHtml(accept.map(name))}<span>${e(accept.map(name).join(" or "))} · ₹${e(expected.reward_inr)}</span></p></div>
      <div><span class="k">Agent answered</span><p class="mono cline">${final?.card == null ? "" : cardArtsHtml([name(final.card)])}<span>${e(got)}</span></p></div>
      <div><span class="k">Verdict</span><p class="verdict w-${cls}">${word === "PASS" ? "MATCH" : word === "FAIL" ? "NO MATCH" : word}</p></div></div>`;
  }
  const thinking = pending
    ? '<li class="step thinking"><b class="stepno" aria-hidden="true">…</b><div><p class="cap">The model is thinking about the next step.</p></div></li>'
    : "";
  root.innerHTML = `
    <div class="query"><span class="k">User query · <span class="mono">${e(caseInfo.id)}</span></span><p>${e(caseInfo.query)}</p></div>${key}
    <div class="runcols">
      <section aria-labelledby="steps-h">
        <h2 id="steps-h" class="k">Steps the agent took</h2>
        <ol class="steps">${run.steps.map((s, i) => stepHtml(s, i, cardNames)).join("")}${thinking}</ol>
        ${captionsHtml(run.steps)}
        ${pending ? "" : disclose("Time per step", timelineHtml(run.steps), { id: "run-time" })}
        <p class="meta totals">${e(run.totalMs)} ms · ${e(run.totalTokens)} text pieces · ${e(run.model)}</p>
      </section>
      <aside class="panel" aria-labelledby="scores-h">
        <h2 id="scores-h" class="k">Scores for this run</h2>
        ${pending ? '<p class="muted">Scores appear when the run ends.</p>' : `<ul class="scores">${score}</ul><a href="#metrics">See all 8 checks</a>`}
      </aside>
    </div>`;
}

// One grid cell opened: why it passed or failed, then the full run.
export function renderCellRun(root, { label, passed, why, caseInfo, run, scores, expected, cardNames }) {
  root.innerHTML = `<div class="cellhead${passed ? " ok" : ""}"><span class="k">${e(label)}</span>
    <p>${passed ? "<b>This run passed.</b>" : `<b>This run failed.</b> ${e(why)}`}</p></div><div data-inner></div>`;
  renderRun(root.querySelector("[data-inner]"), { caseInfo, run, scores, expected, cardNames });
}

// ---------- 2 Metrics ----------
export function renderMetrics(root, { metrics, scores, bugs, activeBug = null }) {
  const caughtBy = metrics.filter((m) => scores?.[m.id]?.pass === false);
  const green = metrics.filter((m) => scores?.[m.id]?.pass === true);
  const active = bugs.find((b) => b.id === activeBug);
  const tiles = metrics
    .map((m) => {
      const s = scores?.[m.id];
      const [word, cls] = status(s);
      return `<li class="tile ${cls}"><button type="button" class="tile-open" data-tile="${e(m.id)}" aria-haspopup="dialog" aria-label="${e(m.label)}: show details"></button><div class="tilehead"><span class="k">${e(m.group)}</span>${shape(cls)}</div>
      <h3>${e(m.label)}</h3><p class="word">${word}</p></li>`;
    })
    .join("");
  const buttons = bugs
    .map(
      (b) =>
        `<button type="button" class="bug" data-bug="${e(b.id)}" aria-pressed="${b.id === activeBug}">${e(b.label)}</button>`,
    )
    .join("");
  const reasons = metrics
    .map((m) => `<li><b>${e(m.label)}</b> <span class="muted">${e(scores?.[m.id]?.reason ?? "not run")}</span></li>`)
    .join("");
  const names = (list) => (list.length ? list.map((m) => e(m.label)).join(", ") : "none");
  root.innerHTML = `
    <div class="bugbar"><span class="k">Break the run on purpose</span><div class="bugs">${buttons}
      <button type="button" class="sec" data-bug="">Reset</button></div>
      </div>
    <div class="summary" aria-live="polite">${
      active
        ? `<p><b class="mono">${caughtBy.length} of ${metrics.length}</b> checks caught it.</p>
       <p class="sumrow"><span class="k">Caught by</span>${names(caughtBy)}</p>
       <p class="sumrow"><span class="k">Still PASS: blind to this bug</span>${names(green)}</p>
       ${disclose("Why?", `<p>${e(active.blurb)}</p><p class="lesson"><span class="k">Lesson</span>${e(BUG_LESSON[activeBug] ?? "")}</p>`, { id: "metrics-why" })}`
        : "<p>Clean run. Pick a bug to see which checks catch it.</p>"
    }</div>
    <p class="muted">Click a check to open it${metrics.some((m) => m.id === "rubric_judge") ? '. "LLM judge" shows its prompt' : ""}.</p>
    <ul class="tiles">${tiles}</ul>
    ${disclose("Why each result", `<ul class="reasons">${reasons}</ul>`, { id: "metrics-reasons" })}`;
  root.querySelectorAll("[data-tile]").forEach((b) => {
    b.onclick = () =>
      root.dispatchEvent(
        new CustomEvent("tile-selected", {
          bubbles: true,
          detail: { metricId: b.dataset.tile },
        }),
      );
  });
  root.querySelectorAll("[data-bug]").forEach((b) => {
    b.onclick = () =>
      root.dispatchEvent(
        new CustomEvent("bug-selected", {
          bubbles: true,
          detail: { bugId: b.dataset.bug || null },
        }),
      );
  });
}

// ---------- 3 Golden set ----------
export function renderGrid(root, { cases, results, summary, selected = null }) {
  const byId = Object.fromEntries(cases.map((c) => [c.id, c]));
  const rows = results
    .map((r) => {
      const wins = r.runs.filter(Boolean).length;
      const kind = wins === r.runs.length ? "solid" : wins === 0 ? "failing" : "mixed";
      const q = byId[r.caseId]?.query ?? "";
      const cells = r.runs
        .map(
          (ok, i) =>
            `<button type="button" class="gcell ${ok ? "ok" : "bad"}" data-case="${e(r.caseId)}" data-run="${i}"
        aria-pressed="${selected?.caseId === r.caseId && selected?.index === i}"
        aria-label="${e(r.caseId)} run ${i + 1} ${ok ? "pass" : "fail"}. Open this run."></button>`,
        )
        .join("");
      return `<div class="grow"><div class="case"><b>${e(r.caseId)}</b><span>${e(q.length > 40 ? `${q.slice(0, 39)}…` : q)}</span></div>
      ${cells}<span class="tally"><b>${wins}/${r.runs.length}</b> ${kind}</span></div>`;
    })
    .join("");
  // summarizeGrid().nRuns counts runs over all cases, so read the per-case count from the rows.
  const perCase = results[0]?.runs.length ?? 0;
  const head = Array.from({ length: perCase }, (_, i) => `<span class="runno">${i + 1}</span>`).join("");
  root.innerHTML = `
    <div class="big">
      <div><strong>${pct(summary.avg)}</strong><span class="k">Average pass rate</span></div>
      <div><strong>${e(summary.allPass)}<small> of ${e(summary.nCases)}</small></strong><span class="k">Passes all ${e(perCase)} runs</span></div>
      <div><strong>${e(summary.anyPass)}<small> of ${e(summary.nCases)}</small></strong><span class="k">Passes at least once</span></div>
    </div>
    <p class="gkey"><span class="gcell ok mini" aria-hidden="true"></span> pass
      <span class="gcell bad mini" aria-hidden="true"></span> fail ·
      <b>Click a square to open that run.</b></p>
    ${disclose("Row labels", "<p><b>solid</b> every run passes · <b>mixed</b> some runs pass · <b>failing</b> no run passes.</p>", { id: "grid-labels" })}
    <div class="grid"><div class="grow head"><span class="k">Case</span>${head}<span class="k tally">Passed</span></div>${rows}</div>`;
  root.querySelectorAll("button.gcell").forEach((b) => {
    b.onclick = () =>
      root.dispatchEvent(
        new CustomEvent("cell-selected", {
          bubbles: true,
          detail: { caseId: b.dataset.case, index: Number(b.dataset.run) },
        }),
      );
  });
}

// ---------- 4 Compounding ----------
// source: 'measured' (from your runs), 'whatif' (slider) or 'default' (nothing run yet).
export function renderCurve(root, { p, n = 10, points = [], retryTries = 0, source = "measured" }) {
  const W = 560;
  const H = 360;
  const L = 72; // room for the rotated y label (x 18) and the tick labels (end at L - 8)
  const R = 24;
  const T = 24;
  const B = 64;
  const pw = W - L - R;
  const ph = H - T - B;
  const x = (i) => L + ((i - 1) / (n - 1)) * pw;
  const y = (v) => T + (1 - v) * ph;
  const path = (f) => Array.from({ length: n }, (_, i) => `${x(i + 1).toFixed(1)},${y(f(i + 1)).toFixed(1)}`).join(" ");
  const pRetry = retryTries > 1 ? 1 - (1 - p) ** retryTries : null; // each step gets several tries
  const endLabel = (v, cls) => `<text class="${cls}" x="${x(n)}" y="${y(v) - 10}" text-anchor="end">${pct(v)}</text>`;
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (v) => `<line class="gridline" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>
    <text class="axis-t" x="${L - 8}" y="${y(v) + 5}" text-anchor="end">${v * 100}%</text>`,
    )
    .join("");
  const ticks = Array.from(
    { length: n },
    (_, i) => `<text class="axis-t" x="${x(i + 1)}" y="${H - B + 22}" text-anchor="middle">${i + 1}</text>`,
  ).join("");
  const marks = points
    .map(
      (q) =>
        `<rect class="obs" x="${x(q.n) - 6}" y="${y(q.value) - 6}" width="12" height="12"><title>${e(`${q.n} steps: ${pct(q.value)} observed`)}</title></rect>`,
    )
    .join("");
  const chain = p ** n;
  const predicted = {
    measured: "measured from your runs",
    whatif: "what-if value from the slider",
    default: "starting value (run the set to measure)",
  }[source];
  root.innerHTML = `
    <div class="curve">
      <div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chance of a fully correct run for 1 to ${n} steps, falling from ${pct(p)} to ${pct(chain)}">
        ${grid}${ticks}
        <line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${T + ph}"/><line class="axis" x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}"/>
        <polyline class="l-chain" points="${path((i) => p ** i)}"/>
        ${pRetry ? `<polyline class="l-retry" points="${path((i) => pRetry ** i)}"/>${endLabel(pRetry ** n, "end-retry")}` : ""}
        ${marks}${endLabel(chain, "end-chain")}
        <text class="axis-t" x="${L + pw / 2}" y="${H - 12}" text-anchor="middle">Steps in a row</text>
        <text class="axis-t axis-y" transform="rotate(-90)" x="${-(T + ph / 2)}" y="18" text-anchor="middle">Chance every step is right</text>
      </svg>
      <ul class="legend"><li><i class="sw"></i>Predicted: each step right ${pct(p)} of the time</li>
        ${points.length ? '<li><i class="sw obs"></i>Observed in your runs</li>' : ""}
        ${pRetry ? `<li><i class="sw retry"></i>With ${e(retryTries)} tries per step</li>` : ""}</ul></div>
      <div class="figures">
        <p class="figure"><strong>${pct(chain)}</strong> at ${n} steps</p>
        ${pRetry ? `<p class="figure"><strong>${pct(pRetry ** n)}</strong> at ${n} steps with ${e(retryTries)} tries per step, best case</p>` : ""}
        ${disclose("About this chart", `<p>Predicted line: ${e(predicted)}.</p>${pRetry ? "<p>The retry line assumes a checker catches every wrong step.</p>" : ""}`, { id: "curve-notes" })}
      </div>
    </div>`;
}
