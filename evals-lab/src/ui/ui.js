// Pure render functions: plain data in, HTML out. This module never imports the engine.
import { STAGES, METRIC_STAGE, MISSIONS, BUG_LESSON } from "./lessons.js";
import { rankBarsHtml, timelineHtml } from "./run-visuals.js";
import { toolsHtml } from "./stage-tools.js";

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

// states: output of stageStates(), or null for the plain explainer. metrics + scores add check chips to each box.
// bugStage marks the box where an injected bug lands. Clicking a box opens its explanation.
export function renderFlow(root, { states = null, metrics = [], scores = null, chips = false, bugStage = null } = {}) {
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
      <button type="button" data-stage="${st.id}" aria-pressed="false">
        <span class="fnum" aria-hidden="true">${st.num}</span><b>${e(st.title)}</b><small>${e(st.sub)}</small>
        ${label ? `<span class="fstate">${e(label)}</span>` : ""}
        ${bugStage === st.id ? '<span class="fbug">BUG HERE</span>' : ""}
      </button>${chipHtml ? `<ul class="chips" aria-label="Checks that read this box">${chipHtml}</ul>` : ""}</li>`;
  }).join('<li class="farrow" aria-hidden="true"></li>');
  const extras = states?.extras?.length
    ? `<p class="fextra"><b>Extra steps the route did not expect:</b> <span class="mono">${e(states.extras.join(", "))}</span></p>`
    : "";
  root.innerHTML = `<div class="flow"><ol class="frow">${nodes}</ol>${extras}
    <p class="muted fnote">The model chooses every step. Our code runs the tools. Click a box to see what it does.</p>
    <div class="fdetail" aria-live="polite"></div></div>`;

  const detail = root.querySelector(".fdetail");
  const paint = () => {
    const sel = root.dataset.sel || "";
    root
      .querySelectorAll("[data-stage]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stage === sel)));
    const st = STAGES.find((s) => s.id === sel);
    detail.hidden = !st;
    if (!st) {
      detail.innerHTML = "";
      return;
    }
    const watchers = metrics.filter((m) => METRIC_STAGE[m.id]?.includes(st.id)).map((m) => m.label);
    detail.innerHTML = `<span class="k">Box ${st.num} · ${e(st.title)}</span><p>${e(st.what)}</p>
      <p><b>Concept.</b> ${e(st.learn)}</p>
      ${watchers.length ? `<p class="muted">Checks that read this box: ${e(watchers.join(", "))}.</p>` : ""}${toolsHtml(st.id)}`;
    // The Run screen redraws this diagram after every step: keep the tool list open if the visitor opened it.
    const tools = detail.querySelector(".stage-tools");
    if (tools) {
      tools.open = root.dataset.tools === "1";
      tools.addEventListener("toggle", () => {
        root.dataset.tools = tools.open ? "1" : "";
      });
    }
  };
  root.querySelectorAll("[data-stage]").forEach((b) => {
    b.onclick = () => {
      root.dataset.sel = root.dataset.sel === b.dataset.stage ? "" : b.dataset.stage;
      root.dataset.tools = "";
      paint();
    };
  });
  paint();
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
  return `<div class="mission${complete ? " complete" : ""}"><div class="mmain">
      <span class="k">Mission ${m.num} of ${MISSIONS.length} · about ${e(m.time)}</span>
      <p class="goal">${e(m.goal)}</p><ul class="tasks">${tasks}</ul></div>
    <div class="mconcept"><span class="k">Concept: ${e(m.concept)}</span><p>${e(m.conceptText)}</p></div>${finish}</div>`;
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
  tool: "The model asked for a tool. Our code ran it and passed the result back.",
  final: "The model stopped calling tools and gave its answer.",
  invalid: "The reply was not in a format our code can read, so no tool ran and this step was wasted.",
};

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
    <p class="cap">${CAPTION[s.kind] ?? ""}</p>
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
    key =
      '<p class="nokey"><b>Your own question has no answer key.</b> The page cannot tell right from wrong here, so the checks that need a key show NOT RUN. The steps below are still real.</p>';
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
      <div><span class="k">Answer key${accept.length > 1 ? " (a tie: either card is right)" : ""}</span><p class="mono">${e(accept.map(name).join(" or "))} · ₹${e(expected.reward_inr)}</p></div>
      <div><span class="k">Agent answered</span><p class="mono">${e(got)}</p></div>
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
        ${pending ? "" : `<div class="tlwrap"><span class="k">Where the time went</span>${timelineHtml(run.steps)}</div>`}
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
export function renderMetrics(root, { metrics, scores, bugs, activeBug = null, selected = null, detailHtml = "" }) {
  const caughtBy = metrics.filter((m) => scores?.[m.id]?.pass === false);
  const green = metrics.filter((m) => scores?.[m.id]?.pass === true);
  const active = bugs.find((b) => b.id === activeBug);
  const tiles = metrics
    .map((m) => {
      const s = scores?.[m.id];
      const [word, cls] = status(s);
      return `<li class="tile ${cls}${m.id === selected ? " picked" : ""}"><button type="button" class="tile-open" data-tile="${e(m.id)}" aria-pressed="${m.id === selected}" aria-label="${e(m.label)}: show details"></button><div class="tilehead"><span class="k">${e(m.group)}</span>${shape(cls)}</div>
      <h3>${e(m.label)}</h3><p class="word">${word}</p><p class="reason">${e(s?.reason ?? "not run")}</p></li>`;
    })
    .join("");
  const buttons = bugs
    .map(
      (b) =>
        `<button type="button" class="bug" data-bug="${e(b.id)}" aria-pressed="${b.id === activeBug}">${e(b.label)}</button>`,
    )
    .join("");
  const names = (list) => (list.length ? list.map((m) => e(m.label)).join(", ") : "none");
  root.innerHTML = `
    <div class="bugbar"><span class="k">Break the run on purpose</span><div class="bugs">${buttons}
      <button type="button" class="sec" data-bug="">Reset</button></div>
      <p class="muted">${active ? e(active.blurb) : "No bug injected. This is the clean run. Pick a bug above."}</p></div>
    <div class="summary" aria-live="polite">${
      active
        ? `<p><b class="mono">${caughtBy.length} of ${metrics.length}</b> checks caught it.</p>
       <p class="sumrow"><span class="k">Caught by</span>${names(caughtBy)}</p>
       <p class="sumrow"><span class="k">Still PASS: blind to this bug</span>${names(green)}</p>
       <p class="lesson"><span class="k">Lesson</span>${e(BUG_LESSON[activeBug] ?? "")}</p>`
        : "<p>Pick a bug to see which checks catch it.</p>"
    }</div>
    <p class="muted">Click any check to see how it works${metrics.some((m) => m.id === "rubric_judge") ? '. Click "LLM judge" to read its prompt' : ""}.</p>
    <ul class="tiles">${tiles}</ul>${detailHtml}`;
  root.querySelectorAll("[data-tile]").forEach((b) => {
    b.onclick = () =>
      root.dispatchEvent(
        new CustomEvent("tile-selected", {
          bubbles: true,
          detail: { metricId: b.dataset.tile === selected ? null : b.dataset.tile },
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
      <b>solid</b> every run passes · <b>mixed</b> some runs pass · <b>failing</b> no run passes ·
      <b>Click a square to open that run.</b></p>
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
      <ul class="legend"><li><i class="sw"></i>Predicted: each step right ${pct(p)} of the time (${e(predicted)})</li>
        ${points.length ? '<li><i class="sw obs"></i>Observed in your runs</li>' : ""}
        ${pRetry ? `<li><i class="sw retry"></i>With ${e(retryTries)} tries per step, if a checker catches every wrong step</li>` : ""}</ul></div>
      <div class="figures">
        <p class="figure"><strong>${pct(chain)}</strong> at ${n} steps</p>
        ${pRetry ? `<p class="figure"><strong>${pct(pRetry ** n)}</strong> at ${n} steps with ${e(retryTries)} tries per step, best case</p>` : ""}
        <p class="muted">One weak step is small. Ten in a row add up.</p>
      </div>
    </div>`;
}
