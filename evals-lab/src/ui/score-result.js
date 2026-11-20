// The result block of "Score both on the test set" on the Side by side screen.
// Pure: takes the scoreBoth() result, returns an HTML string. No DOM, no engine import.
// result = { simple, careful, aborted, planned? } where each side is { passed, total, rate, perCase: { id: { passed, total, runs: [bool] } } }.
// `planned` (runs the whole job would make, both agents) is added by the caller; scoreBoth does not know it.
// mode: "replay" or "live".

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const percent = (rate) => `${Math.round((rate ?? 0) * 100)}%`;
const counts = (t) => `${t?.passed ?? 0} of ${t?.total ?? 0}`;

function rowHtml(name, side, higher) {
  // "higher" is a word, so the better agent is not marked by colour alone.
  const flag = higher ? `<b class="setscore-flag">higher</b>` : `<span class="setscore-flag"></span>`;
  return `<div class="setscore-row"><span class="setscore-name">${esc(name)}</span><span class="setscore-n mono">${esc(counts(side))}</span><span class="setscore-pct mono">${esc(percent(side.rate))}</span>${flag}</div>`;
}

// Plain texts for the eval button and the line under it. Both are built from the same two numbers the run uses.
export const evalButtonLabel = (caseCount) => `Run the eval: all ${caseCount} questions`;
export const evalWhyLine = (caseCount, runsPerCase) =>
  `One run can be luck. Each agent answers all ${caseCount} questions ${runsPerCase} times. You get a pass rate.`;

const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const questionText = (c) => (c?.merchant != null && c?.amount != null ? `${c.merchant} \u20B9${group(c.amount)}` : "");

function cellHtml(i, ok) {
  const n = i + 1;
  if (ok === true) return `<span class="sgrid-cell is-pass" role="img" aria-label="Run ${n}: PASS">P</span>`;
  if (ok === false) return `<span class="sgrid-cell is-fail" role="img" aria-label="Run ${n}: FAIL">F</span>`;
  return `<span class="sgrid-cell" role="img" aria-label="Run ${n}: not run yet"></span>`;
}

function gridRowHtml(id, label, runsPerCase, tally) {
  const runs = tally?.runs ?? [];
  const cells = Array.from({ length: runsPerCase }, (_, i) => cellHtml(i, runs[i])).join("");
  const rate = tally
    ? `${counts(tally)} \u00B7 ${percent(tally.total ? tally.passed / tally.total : 0)}`
    : `${runsPerCase} runs`;
  const name = `${id}${label ? ` ${label}` : ""}`;
  return `<li class="sgrid-row"><span class="sgrid-q"><b class="mono">${esc(id)}</b>${label ? ` ${esc(label)}` : ""}</span><span class="sgrid-cells" role="group" aria-label="${esc(name)}, ${runsPerCase} runs">${cells}</span><span class="sgrid-rate mono">${esc(rate)}</span></li>`;
}

// Grid of questions (rows) x runs (squares) for both agents. result null = preview with empty squares.
// cases: [{ id, merchant, amount }] gives each row its plain label. Each square holds the letter P or F, so colour is not the only signal.
export function scoreGridHtml({ cases = [], runsPerCase, result = null }) {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const ids = result ? Object.keys(result.simple.perCase ?? {}) : cases.map((c) => c.id);
  const agent = (name, kind) => {
    const side = result?.[kind];
    const runs = result ? side.total : cases.length * runsPerCase;
    const rows = ids
      .map((id) => gridRowHtml(id, questionText(byId.get(id)), runsPerCase, side?.perCase?.[id]))
      .join("");
    return `<div class="sgrid-agent"><p class="sgrid-title"><b>${esc(name)}</b>: ${esc(runs)} runs</p><ol class="sgrid-rows">${rows}</ol></div>`;
  };
  return `<div class="sgrid">${agent("Agent without evals", "simple")}${agent("Agent with evals", "careful")}</div><p class="sgrid-key muted">P = pass (filled square). F = fail (hollow square). Empty = not run yet.</p>`;
}

export function scoreResultHtml(result, mode, { cases = [], runsPerCase } = {}) {
  const { simple, careful } = result;
  const modeText = mode === "live" ? "Live model" : "Recorded runs";
  const done = simple.total + careful.total;
  const perRun = runsPerCase ?? Math.max(0, ...Object.values(simple.perCase ?? {}).map((t) => t.total));
  const stopped = result.aborted
    ? `<p class="setscore-stopped">Stopped at ${done}${result.planned != null ? ` of ${esc(result.planned)}` : ""} runs</p>`
    : "";
  return (
    `<section class="setscore" aria-label="Score over the whole test set">` +
    `<p class="setscore-mode">${modeText}</p>${stopped}` +
    rowHtml("Agent without evals", simple, simple.rate > careful.rate) +
    rowHtml("Agent with evals", careful, careful.rate > simple.rate) +
    scoreGridHtml({ cases, runsPerCase: perRun, result }) +
    `</section>`
  );
}
